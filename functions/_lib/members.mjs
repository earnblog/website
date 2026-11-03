// 会员订阅:PayPal 按月自动扣款,会员状态存 D1(binding DB)。
// 浏览器只带一个签名 cookie m=<订阅号>.<签名>;到期与否每 6 小时回 PayPal 核一次,
// 所以退订、扣款失败不需要 webhook 也会自动失效。
import { paypal } from './paypal.mjs';
import { sign } from './sign.mjs';
import { tiers } from './paid-store.mjs';

const DAY = 86400;
const RECHECK = 6 * 3600;          // 状态缓存多久后回 PayPal 复核
export const COOKIE_AGE = 400 * DAY;

const schemaReady = new WeakSet();
export async function ensureSchema(env) {
  if (schemaReady.has(env.DB)) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS members (
      sub_id TEXT PRIMARY KEY, email TEXT, tier TEXT NOT NULL, plan_id TEXT, status TEXT,
      until INTEGER NOT NULL DEFAULT 0, checked INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS members_email ON members (email)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS purchases (
      order_id TEXT PRIMARY KEY, kind TEXT NOT NULL, slug TEXT, email TEXT, amount TEXT, created INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sub_id TEXT NOT NULL, email TEXT, body TEXT NOT NULL,
      created INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sub_id TEXT NOT NULL, email TEXT, body TEXT NOT NULL,
      created INTEGER NOT NULL, answer TEXT, answered INTEGER)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS questions_sub ON questions (sub_id)'),
  ]);
  // topics 表先上线、后加的列:写完的点题记下文章 slug,会员面板好给链接
  try { await env.DB.prepare('ALTER TABLE topics ADD COLUMN slug TEXT').run(); } catch { /* 已有这一列 */ }
  schemaReady.add(env.DB);
}

export const tierById = (id) => tiers.find((t) => t.id === id) || null;
export const levelOf = (id) => tierById(id)?.level || 0;

async function getSetting(env, k) {
  const r = await env.DB.prepare('SELECT v FROM settings WHERE k = ?').bind(k).first();
  return r ? JSON.parse(r.v) : null;
}
const putSetting = (env, k, v) =>
  env.DB.prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')
    .bind(k, JSON.stringify(v)).run();

// PayPal 的订阅计划挂在具体账户下:按 Client ID 分开记,换账户或改价后第一次访问自动重建。
export async function ensurePlans(env) {
  const cid = env.PAYPAL_CLIENT_ID;
  const plans = (await getSetting(env, 'plans:' + cid)) || {};
  if (tiers.every((t) => plans[t.id]?.price === t.price)) return plans;

  let product = await getSetting(env, 'product:' + cid);
  if (!product) {
    const r = await paypal(env, 'POST', '/v1/catalogs/products', {
      name: 'The Critical Point membership',
      description: 'Monthly membership for fncuthdert.com research articles',
      type: 'DIGITAL',
    });
    if (r.status >= 300 || !r.data.id) throw new Error('paypal product ' + (r.data?.details?.[0]?.issue || r.status));
    product = r.data.id;
    await putSetting(env, 'product:' + cid, product);
  }
  for (const t of tiers) {
    if (plans[t.id]?.price === t.price) continue;
    const r = await paypal(env, 'POST', '/v1/billing/plans', {
      product_id: product,
      name: `The Critical Point — ${t.en.name} (monthly)`,
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR', sequence: 1, total_cycles: 0,
        pricing_scheme: { fixed_price: { value: t.price.toFixed(2), currency_code: 'USD' } },
      }],
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 1 },
    });
    if (r.status >= 300 || !r.data.id) throw new Error('paypal plan ' + (r.data?.details?.[0]?.issue || r.status));
    // 改价后老会员还挂在旧计划上(PayPal 照旧价扣款):旧计划号留着,照样认这一档
    const prev = plans[t.id];
    plans[t.id] = { id: r.data.id, price: t.price, old: prev ? [...(prev.old || []), prev.id] : [] };
  }
  await putSetting(env, 'plans:' + cid, plans);
  return plans;
}

// 订阅详情 -> 档位和可读到哪天。ACTIVE 读到下次扣款日;已退订/暂停的读到最后一次扣款后一个月
export function accessFromSub(sub, plans, now = Math.floor(Date.now() / 1000)) {
  const tier = Object.keys(plans).find((k) => plans[k].id === sub.plan_id || plans[k].old?.includes(sub.plan_id)) || null;
  const secs = (s) => (s ? Math.floor(Date.parse(s) / 1000) || 0 : 0);
  const lastPay = secs(sub.billing_info?.last_payment?.time);
  const next = secs(sub.billing_info?.next_billing_time);
  let until = lastPay ? lastPay + 31 * DAY : 0;
  if (sub.status === 'ACTIVE') until = Math.max(until, next, now + DAY);
  return { tier, until, status: sub.status, email: sub.subscriber?.email_address || '' };
}

async function fetchSub(env, subId) {
  const r = await paypal(env, 'GET', `/v1/billing/subscriptions/${encodeURIComponent(subId)}`);
  if (r.status === 404) return null;
  if (r.status >= 300) throw new Error('paypal sub ' + r.status);
  return r.data;
}

// 从 PayPal 拉一次订阅并写库;返回会员行(不是本站计划的订阅返回 null)
export async function syncMember(env, subId) {
  const sub = await fetchSub(env, subId);
  if (!sub) return null;
  const a = accessFromSub(sub, await ensurePlans(env));
  if (!a.tier) return null;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`INSERT INTO members (sub_id, email, tier, plan_id, status, until, checked, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sub_id) DO UPDATE SET email = excluded.email, tier = excluded.tier, plan_id = excluded.plan_id,
        status = excluded.status, until = excluded.until, checked = excluded.checked`)
    .bind(subId, a.email.toLowerCase(), a.tier, sub.plan_id, a.status, a.until, now, now).run();
  return { sub_id: subId, ...a, email: a.email.toLowerCase() };
}

// 当前访客的会员身份(读 cookie;状态过旧则回 PayPal 复核)。不是会员返回 null
export async function currentMember(env, request) {
  if (!env.DB || !env.UNLOCK_SECRET) return null;
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)m=(I-[A-Z0-9]{6,30})\.([0-9a-f]{64})/);
  if (!m || m[2] !== (await sign(env.UNLOCK_SECRET, 'm.' + m[1]))) return null;
  await ensureSchema(env);
  let row = await env.DB.prepare('SELECT * FROM members WHERE sub_id = ?').bind(m[1]).first();
  const now = Math.floor(Date.now() / 1000);
  if (!row || now - row.checked > RECHECK || row.until < now) {
    try {
      const fresh = await syncMember(env, m[1]);
      if (fresh) row = fresh;
    } catch {
      // PayPal 暂时连不上:沿用库里的旧状态,不因为对方故障把付费会员挡在外面
    }
  }
  if (!row || row.until < now) return row ? { ...row, active: false } : null;
  return { ...row, active: true, level: levelOf(row.tier) };
}

export async function memberCookie(env, subId) {
  const sig = await sign(env.UNLOCK_SECRET, 'm.' + subId);
  return `m=${subId}.${sig}; Path=/; Max-Age=${COOKIE_AGE}; SameSite=Lax; Secure; HttpOnly`;
}
