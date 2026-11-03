// 临界 收款接口(PayPal,与 tinyfilelab 同一个收款账户)
//   GET  /api/pp/config          前端要用的 Client ID、会员计划号、价格
//   GET  /api/pp/me              当前浏览器的会员状态
//   POST /api/pp/order           建单:{ kind: 'single', slug } 单篇解锁 / { kind: 'tip', amount } 打赏
//   POST /api/pp/capture         付款完成后扣款,单篇种解锁 cookie
//   POST /api/pp/recover-order   换设备找回单篇:{ id: 订单号或交易号 }
//   POST /api/pp/sub/activate    订阅批准后开通会员:{ id: 订阅号 I-… }
//   POST /api/pp/sub/recover     换设备找回会员:{ id: 订阅号, email: PayPal 邮箱 }
//   POST /api/pp/topic           内圈会员点题:{ text }(每 30 天 1 次)
//   POST /api/pp/question        内圈会员提问:{ text }(每 30 天 10 条)
//   GET  /api/pp/qa              当前会员自己的点题和提问(含回复)
//   GET  /api/pp/track           观点追踪表:人人可见汇总,研究档以上看逐条明细
//   GET  /api/pp/admin/pending   答疑任务取待办(请求头 x-admin-key)
//   POST /api/pp/admin/answer    答疑任务写回复:{ id, answer }
//   POST /api/pp/admin/topic     点题写完后登记:{ id, slug }
//   POST /api/pp/logout          清掉本浏览器的会员 cookie
import store, { tiers, track } from '../../_lib/paid-store.mjs';
import { json, paypal, paypalReady } from '../../_lib/paypal.mjs';
import { sign } from '../../_lib/sign.mjs';
import { ensureSchema, ensurePlans, syncMember, currentMember, memberCookie, levelOf } from '../../_lib/members.mjs';
import { notifyOwner } from '../../_lib/notify.mjs';

const QUESTIONS_PER_MONTH = 10;

// 观点追踪表汇总:已判定的对/错/部分对,以及待验证条数
function trackSummary() {
  const s = { total: track.length, right: 0, wrong: 0, mixed: 0, pending: 0 };
  for (const t of track) s[t.verdict in s ? t.verdict : 'pending']++;
  return s;
}

const isAdmin = (env, request) => {
  const k = request.headers.get('x-admin-key') || '';
  return !!env.ADMIN_KEY && k.length === env.ADMIN_KEY.length && k === env.ADMIN_KEY;
};

const ready = (env) => paypalReady(env) && !!env.DB && !!env.UNLOCK_SECRET;
const now = () => Math.floor(Date.now() / 1000);

async function singleCookie(env, slug) {
  return `u_${slug}=${await sign(env.UNLOCK_SECRET, slug)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`;
}

// 已完成的订单 -> 单篇解锁(金额不够或不是本站单篇订单就拒绝)
async function grantFromOrder(env, order) {
  const unit = order.purchase_units?.[0];
  const [kind, slug] = String(unit?.custom_id || '').split('|');
  const cap = unit?.payments?.captures?.[0];
  if (!cap) return { error: 'not_found' };
  if (cap.status === 'PENDING') return { error: 'pending' };
  if (order.status !== 'COMPLETED' || cap.status !== 'COMPLETED') return { error: 'not_paid' };
  if (kind === 'tip') return { kind: 'tip' };
  const entry = store[slug];
  if (kind !== 'single' || !entry) return { error: 'not_found' };
  if (cap.amount?.currency_code !== 'USD' || Number(cap.amount.value) + 0.001 < entry.price) return { error: 'amount' };
  await env.DB.prepare('INSERT OR IGNORE INTO purchases (order_id, kind, slug, email, amount, created) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(order.id, 'single', slug, (order.payer?.email_address || '').toLowerCase(), cap.amount.value, now()).run();
  return { kind: 'single', slug, path: entry.path, cookie: await singleCookie(env, slug) };
}

async function getOrder(env, id, allowCaptureId) {
  let r = await paypal(env, 'GET', `/v2/checkout/orders/${id}`);
  if (r.status === 404 && allowCaptureId) {
    // 买家收据上是交易号(capture id),顺着交易找回订单
    const c = await paypal(env, 'GET', `/v2/payments/captures/${id}`);
    const oid = c.data?.supplementary_data?.related_ids?.order_id;
    if (c.status < 300 && oid) r = await paypal(env, 'GET', `/v2/checkout/orders/${oid}`);
  }
  if (r.status === 404) return null;
  if (r.status >= 300) throw new Error('paypal order ' + r.status);
  return r.data;
}

function grantResponse(g) {
  if (g.error) return json({ error: g.error }, g.error === 'not_found' ? 404 : 409);
  const { cookie, ...rest } = g;
  return json({ ok: true, ...rest }, 200, cookie ? { 'set-cookie': cookie } : {});
}

export async function onRequest({ request, env, params }) {
  const route = (params.route || []).join('/');
  try {
    if (request.method === 'GET' && route === 'config') {
      if (!ready(env)) return json({ open: false });
      await ensureSchema(env);
      const plans = await ensurePlans(env);
      return json({
        open: true,
        clientId: env.PAYPAL_CLIENT_ID,
        env: env.PAYPAL_ENV === 'sandbox' ? 'sandbox' : 'live',
        tiers: tiers.map((t) => ({ id: t.id, level: t.level, price: t.price, planId: plans[t.id]?.id })),
      });
    }
    if (request.method === 'GET' && route === 'me') {
      const m = await currentMember(env, request);
      if (!m) return json({ member: null });
      return json({ member: { tier: m.tier, level: m.level || 0, active: m.active, until: m.until, status: m.status, email: m.email } });
    }
    if (request.method === 'GET' && route === 'track') {
      const m = await currentMember(env, request);
      const full = !!m?.active && (m.level || 0) >= 2;
      return json({ summary: trackSummary(), rows: full ? track : null, need: 2 });
    }
    if (request.method === 'GET' && route === 'qa') {
      const m = await currentMember(env, request);
      if (!m?.active) return json({ error: 'member' }, 403);
      await ensureSchema(env);
      const q = await env.DB.prepare('SELECT id, body, created, answer, answered FROM questions WHERE sub_id = ? ORDER BY created DESC LIMIT 50').bind(m.sub_id).all();
      const t = await env.DB.prepare('SELECT id, body, created, done, slug FROM topics WHERE sub_id = ? ORDER BY created DESC LIMIT 24').bind(m.sub_id).all();
      return json({ questions: q.results || [], topics: (t.results || []).map((x) => ({ ...x, path: x.slug && store[x.slug]?.path })) });
    }
    if (route.startsWith('admin/')) {
      if (!isAdmin(env, request)) return json({ error: 'forbidden' }, 403);
      if (!env.DB) return json({ error: 'closed' }, 503);
      await ensureSchema(env);
      // 不返回会员邮箱:答疑任务只需要问题本身
      if (request.method === 'GET' && route === 'admin/pending') {
        const q = await env.DB.prepare('SELECT id, body, created FROM questions WHERE answer IS NULL ORDER BY created LIMIT 50').all();
        const t = await env.DB.prepare('SELECT id, body, created FROM topics WHERE done = 0 ORDER BY created LIMIT 20').all();
        return json({ questions: q.results || [], topics: t.results || [] });
      }
      if (request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const id = Number(b.id);
        if (!Number.isInteger(id) || id < 1) return json({ error: 'id' }, 400);
        if (route === 'admin/answer') {
          const answer = String(b.answer || '').trim();
          if (answer.length < 10 || answer.length > 20000) return json({ error: 'answer' }, 400);
          const r = await env.DB.prepare('UPDATE questions SET answer = ?, answered = ? WHERE id = ?').bind(answer, now(), id).run();
          return json({ ok: (r.meta?.changes ?? r.changes ?? 1) > 0 });
        }
        if (route === 'admin/topic') {
          const slug = String(b.slug || '');
          if (!store[slug]) return json({ error: 'slug' }, 400);
          await env.DB.prepare('UPDATE topics SET done = 1, slug = ? WHERE id = ?').bind(slug, id).run();
          return json({ ok: true });
        }
      }
      return json({ error: 'route' }, 404);
    }
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    const body = await request.json().catch(() => ({}));

    if (route === 'logout') {
      return json({ ok: true }, 200, { 'set-cookie': 'm=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly' });
    }
    if (!ready(env)) return json({ error: 'closed' }, 503);
    await ensureSchema(env);

    if (route === 'order') {
      let custom, value, label;
      if (body.kind === 'single') {
        const slug = String(body.slug || '');
        const entry = store[slug];
        if (!entry) return json({ error: 'not_found' }, 404);
        custom = `single|${slug}`;
        value = entry.price.toFixed(2);
        label = (entry.path.startsWith('/en/') ? 'Unlock: ' : '解锁全文:') + entry.title;
      } else if (body.kind === 'tip') {
        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount < 1 || amount > 10000) return json({ error: 'amount' }, 400);
        custom = 'tip';
        value = amount.toFixed(2);
        label = 'Tip — The Critical Point';
      } else return json({ error: 'kind' }, 400);
      const r = await paypal(env, 'POST', '/v2/checkout/orders', {
        intent: 'CAPTURE',
        purchase_units: [{ custom_id: custom, description: label.slice(0, 127), amount: { currency_code: 'USD', value } }],
        payment_source: {
          paypal: { experience_context: { brand_name: 'The Critical Point', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } },
        },
      });
      // 不用 502:Cloudflare 会把 Functions 返回的 502 换成它自己的纯文本错误页,前端就读不到原因了
      if (r.status >= 300 || !r.data.id) return json({ error: 'paypal', detail: r.data?.details?.[0]?.issue || r.status }, 409);
      return json({ id: r.data.id });
    }

    if (route === 'capture' || route === 'recover-order') {
      const id = String(body.id || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{10,24}$/.test(id)) return json({ error: 'id' }, 400);
      let order = null;
      if (route === 'capture') {
        const r = await paypal(env, 'POST', `/v2/checkout/orders/${id}/capture`, {});
        const issue = r.data?.details?.[0]?.issue;
        if (r.status < 300) order = r.data;
        else if (issue === 'INSTRUMENT_DECLINED') return json({ error: 'declined' }, 402);
        else if (issue !== 'ORDER_ALREADY_CAPTURED') return json({ error: 'paypal', detail: issue || r.status }, 409);
      }
      if (!order) order = await getOrder(env, id, route === 'recover-order');
      if (!order) return json({ error: 'not_found' }, 404);
      return grantResponse(await grantFromOrder(env, order));
    }

    if (route === 'sub/activate' || route === 'sub/recover') {
      const id = String(body.id || '').trim().toUpperCase();
      if (!/^I-[A-Z0-9]{6,30}$/.test(id)) return json({ error: 'id' }, 400);
      const m = await syncMember(env, id);
      if (!m) return json({ error: 'not_found' }, 404);
      if (route === 'sub/recover') {
        const email = String(body.email || '').trim().toLowerCase();
        if (!email || email !== m.email) return json({ error: 'email' }, 403);
      }
      if (m.until < now()) return json({ error: 'inactive', status: m.status }, 409);
      return json({ ok: true, tier: m.tier, level: levelOf(m.tier), until: m.until }, 200,
        { 'set-cookie': await memberCookie(env, id) });
    }

    if (route === 'topic') {
      const m = await currentMember(env, request);
      if (!m?.active || (m.level || 0) < 3) return json({ error: 'tier' }, 403);
      const text = String(body.text || '').trim();
      if (text.length < 4 || text.length > 2000) return json({ error: 'text' }, 400);
      const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM topics WHERE sub_id = ? AND created > ?')
        .bind(m.sub_id, now() - 30 * 86400).first();
      if (Number(recent?.n || 0) >= 1) return json({ error: 'quota' }, 409);
      await env.DB.prepare('INSERT INTO topics (sub_id, email, body, created) VALUES (?, ?, ?, ?)')
        .bind(m.sub_id, m.email, text, now()).run();
      await notifyOwner(env, `【临界·内圈点题】${m.email}\n${text}`);
      return json({ ok: true });
    }

    if (route === 'question') {
      const m = await currentMember(env, request);
      if (!m?.active || (m.level || 0) < 3) return json({ error: 'tier' }, 403);
      const text = String(body.text || '').trim();
      if (text.length < 4 || text.length > 2000) return json({ error: 'text' }, 400);
      const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM questions WHERE sub_id = ? AND created > ?')
        .bind(m.sub_id, now() - 30 * 86400).first();
      if (Number(recent?.n || 0) >= QUESTIONS_PER_MONTH) return json({ error: 'quota' }, 409);
      await env.DB.prepare('INSERT INTO questions (sub_id, email, body, created) VALUES (?, ?, ?, ?)')
        .bind(m.sub_id, m.email, text, now()).run();
      await notifyOwner(env, `【临界·内圈提问】${m.email}\n${text}`);
      return json({ ok: true });
    }

    return json({ error: 'route' }, 404);
  } catch (e) {
    return json({ error: 'server', detail: String(e.message || e) }, 500);
  }
}
