// 收款/会员接口测试:内存 SQLite 冒充 D1,假 PayPal 冒充 api-m.paypal.com。
// 先 npm run build(生成 functions/_lib/paid-store.mjs),再 node --test tests/
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import store from '../functions/_lib/paid-store.mjs';
import { onRequest as pp } from '../functions/api/pp/[[route]].js';
import { onRequestGet as content } from '../functions/api/content.js';
import { accessFromSub } from '../functions/_lib/members.mjs';
import { sign } from '../functions/_lib/sign.mjs';

// ---- D1 外壳 ----
function d1() {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    run: async () => db.prepare(sql).run(...args),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.run())), raw: db };
}

// ---- 假 PayPal ----
const DAY = 86400;
const iso = (s) => new Date(s * 1000).toISOString();
const nowS = () => Math.floor(Date.now() / 1000);
let pp$;
function fakePayPal() {
  pp$ = { products: 0, plans: [], orders: {}, subs: {}, wecom: [] };
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || 'GET';
    const body = init.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : null;
    const res = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
    const path = u.pathname;
    if (u.hostname === 'qyapi.weixin.qq.com') { pp$.wecom.push(body); return res({ errcode: 0 }); }
    if (path === '/v1/oauth2/token') return res({ access_token: 'tok', expires_in: 3600 });
    if (path === '/v1/catalogs/products') { pp$.products++; return res({ id: 'PROD-' + pp$.products }, 201); }
    if (path === '/v1/billing/plans') {
      const id = 'P-' + (pp$.plans.length + 1);
      pp$.plans.push({ id, price: body.billing_cycles[0].pricing_scheme.fixed_price.value });
      return res({ id }, 201);
    }
    let m;
    if ((m = path.match(/^\/v1\/billing\/subscriptions\/(.+)$/))) {
      const s = pp$.subs[decodeURIComponent(m[1])];
      return s ? res(s) : res({ name: 'RESOURCE_NOT_FOUND' }, 404);
    }
    if (path === '/v2/checkout/orders' && method === 'POST') {
      const id = 'ORDER' + (Object.keys(pp$.orders).length + 1).toString().padStart(6, '0');
      pp$.orders[id] = { id, status: 'CREATED', purchase_units: [{ custom_id: body.purchase_units[0].custom_id, amount: body.purchase_units[0].amount }] };
      return res({ id }, 201);
    }
    if ((m = path.match(/^\/v2\/checkout\/orders\/([A-Z0-9]+)\/capture$/))) {
      const o = pp$.orders[m[1]];
      if (!o) return res({}, 404);
      if (o.status === 'COMPLETED') return res({ details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] }, 422);
      const paid = o.payValue ?? o.purchase_units[0].amount.value;
      o.status = 'COMPLETED';
      o.payer = { email_address: 'buyer@example.com' };
      o.purchase_units[0].payments = { captures: [{ id: 'CAP' + m[1], status: 'COMPLETED', amount: { currency_code: 'USD', value: paid }, create_time: iso(nowS()) }] };
      return res(o, 201);
    }
    if ((m = path.match(/^\/v2\/checkout\/orders\/([A-Z0-9]+)$/))) {
      return pp$.orders[m[1]] ? res(pp$.orders[m[1]]) : res({}, 404);
    }
    if ((m = path.match(/^\/v2\/payments\/captures\/([A-Z0-9]+)$/))) {
      const o = Object.values(pp$.orders).find((x) => x.purchase_units[0].payments?.captures[0].id === m[1]);
      return o ? res({ supplementary_data: { related_ids: { order_id: o.id } } }) : res({}, 404);
    }
    throw new Error('unexpected fetch ' + method + ' ' + url);
  };
}

let env;
beforeEach(() => {
  fakePayPal();
  env = {
    DB: d1(), PAYPAL_CLIENT_ID: 'cid-' + Math.random(), PAYPAL_SECRET: 's', PAYPAL_ENV: 'live', UNLOCK_SECRET: 'unlock-secret',
    ADMIN_KEY: 'admin-key-0123456789', WECOM_WEBHOOK: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test',
  };
});

const call = async (route, body, cookie = '', headers = {}) => {
  const r = await pp({
    request: new Request('https://x.test/api/pp/' + route, body
      ? { method: 'POST', headers: { 'content-type': 'application/json', cookie, ...headers }, body: JSON.stringify(body) }
      : { headers: { cookie, ...headers } }),
    env, params: { route: route.split('/') },
  });
  return { status: r.status, data: await r.json(), cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
};
const read = async (slug, cookie = '') => {
  const r = await content({ request: new Request('https://x.test/api/content?slug=' + slug, { headers: { cookie } }), env });
  return { status: r.status, data: await r.json() };
};

const tier1Slug = Object.keys(store).find((k) => store[k].tier === 1);
store['t2-test-only'] = { title: 'T2', price: 9, tier: 2, path: '/posts/t2-test-only', html: '<p>tier2</p>' };

async function planIds() {
  const c = await call('config');
  return Object.fromEntries(c.data.tiers.map((t) => [t.id, t.planId]));
}
function addSub(id, planId, extra = {}) {
  pp$.subs[id] = {
    id, plan_id: planId, status: 'ACTIVE', subscriber: { email_address: 'Member@Example.com' },
    billing_info: { last_payment: { time: iso(nowS() - 60) }, next_billing_time: iso(nowS() + 30 * DAY) },
    ...extra,
  };
}

test('config 第一次建产品和三档计划,第二次直接复用', async () => {
  const a = await call('config');
  assert.equal(a.data.open, true);
  assert.deepEqual(a.data.tiers.map((t) => t.price), [60, 100, 150]);
  assert.deepEqual(pp$.plans.map((p) => p.price), ['60.00', '100.00', '150.00']);
  await call('config');
  assert.equal(pp$.products, 1);
  assert.equal(pp$.plans.length, 3);
});

test('没配 PayPal 时 config 返回 open:false,下单 503', async () => {
  delete env.PAYPAL_SECRET;
  assert.equal((await call('config')).data.open, false);
  assert.equal((await call('order', { kind: 'single', slug: tier1Slug })).status, 503);
});

test('单篇:下单->扣款->种 cookie->能读全文', async () => {
  assert.equal((await read(tier1Slug)).status, 401);
  const o = await call('order', { kind: 'single', slug: tier1Slug });
  assert.equal(o.status, 200);
  assert.equal(pp$.orders[o.data.id].purchase_units[0].amount.value, store[tier1Slug].price.toFixed(2));
  const c = await call('capture', { id: o.data.id });
  assert.equal(c.status, 200);
  assert.match(c.cookie, new RegExp(`^u_${tier1Slug}=`));
  assert.equal((await read(tier1Slug, c.cookie)).data.html, store[tier1Slug].html);
  // 重复点击扣款:走查询,照样给 cookie
  assert.equal((await call('capture', { id: o.data.id })).status, 200);
});

test('单篇:实付金额不够不解锁', async () => {
  const o = await call('order', { kind: 'single', slug: tier1Slug });
  pp$.orders[o.data.id].payValue = '0.50';
  const c = await call('capture', { id: o.data.id });
  assert.equal(c.status, 409);
  assert.equal(c.data.error, 'amount');
  assert.equal(c.cookie, '');
});

test('单篇:换设备用交易号找回', async () => {
  const o = await call('order', { kind: 'single', slug: tier1Slug });
  await call('capture', { id: o.data.id });
  const r = await call('recover-order', { id: 'CAP' + o.data.id });
  assert.equal(r.status, 200);
  assert.equal(r.data.path, store[tier1Slug].path);
  assert.match(r.cookie, /^u_/);
});

test('打赏:金额校验,扣款不种 cookie', async () => {
  assert.equal((await call('order', { kind: 'tip', amount: 0.5 })).status, 400);
  const o = await call('order', { kind: 'tip', amount: 5 });
  const c = await call('capture', { id: o.data.id });
  assert.equal(c.status, 200);
  assert.equal(c.data.kind, 'tip');
  assert.equal(c.cookie, '');
});

test('会员:读者档开通后能读 1 档文章,2 档文章提示升级', async () => {
  const plans = await planIds();
  addSub('I-READER0001', plans.reader);
  const a = await call('sub/activate', { id: 'I-READER0001' });
  assert.equal(a.status, 200);
  assert.equal(a.data.tier, 'reader');
  assert.match(a.cookie, /^m=I-READER0001\./);
  assert.equal((await read(tier1Slug, a.cookie)).status, 200);
  const t2 = await read('t2-test-only', a.cookie);
  assert.equal(t2.status, 403);
  assert.equal(t2.data.need, 2);
  const me = await call('me', null, a.cookie);
  assert.equal(me.data.member.tier, 'reader');
  assert.equal(me.data.member.active, true);
});

test('会员:研究档能读 2 档文章', async () => {
  const plans = await planIds();
  addSub('I-RESEARCH01', plans.research);
  const a = await call('sub/activate', { id: 'I-RESEARCH01' });
  assert.equal((await read('t2-test-only', a.cookie)).data.html, '<p>tier2</p>');
});

test('会员:不是本站计划的订阅号不认', async () => {
  await planIds();
  addSub('I-OTHERPLAN1', 'P-SOMEONE-ELSE');
  assert.equal((await call('sub/activate', { id: 'I-OTHERPLAN1' })).status, 404);
});

test('会员:伪造 cookie 不认', async () => {
  const plans = await planIds();
  addSub('I-READER0002', plans.reader);
  await call('sub/activate', { id: 'I-READER0002' });
  assert.equal((await read(tier1Slug, 'm=I-READER0002.' + '0'.repeat(64))).status, 401);
});

test('会员找回:邮箱要对得上(不分大小写)', async () => {
  const plans = await planIds();
  addSub('I-READER0003', plans.reader);
  assert.equal((await call('sub/recover', { id: 'I-READER0003', email: 'x@example.com' })).status, 403);
  const ok = await call('sub/recover', { id: 'I-READER0003', email: 'member@example.com' });
  assert.equal(ok.status, 200);
  assert.match(ok.cookie, /^m=/);
});

test('会员:退订后读到最后一次扣款满一个月,过期就锁', async () => {
  const plans = await planIds();
  addSub('I-CANCEL0001', plans.reader, { status: 'CANCELLED', billing_info: { last_payment: { time: iso(nowS() - 10 * DAY) } } });
  const a = await call('sub/activate', { id: 'I-CANCEL0001' });
  assert.equal(a.status, 200);
  assert.ok(a.data.until > nowS() + 20 * DAY);
  addSub('I-CANCEL0002', plans.reader, { status: 'CANCELLED', billing_info: { last_payment: { time: iso(nowS() - 40 * DAY) } } });
  const b = await call('sub/activate', { id: 'I-CANCEL0002' });
  assert.equal(b.status, 409);
  assert.equal(b.data.error, 'inactive');
});

test('会员:6 小时后复核,PayPal 那边暂停了就锁', async () => {
  const plans = await planIds();
  addSub('I-SUSPEND001', plans.reader);
  const a = await call('sub/activate', { id: 'I-SUSPEND001' });
  assert.equal((await read(tier1Slug, a.cookie)).status, 200);
  pp$.subs['I-SUSPEND001'].status = 'SUSPENDED';
  pp$.subs['I-SUSPEND001'].billing_info = { last_payment: { time: iso(nowS() - 35 * DAY) } };
  // 还在 6 小时缓存内:不打扰 PayPal,照常放行
  assert.equal((await read(tier1Slug, a.cookie)).status, 200);
  env.DB.raw.prepare('UPDATE members SET checked = checked - 7 * 3600').run();
  assert.equal((await read(tier1Slug, a.cookie)).status, 401);
});

test('会员:复核时 PayPal 连不上,沿用旧状态不挡人', async () => {
  const plans = await planIds();
  addSub('I-OUTAGE0001', plans.reader);
  const a = await call('sub/activate', { id: 'I-OUTAGE0001' });
  env.DB.raw.prepare('UPDATE members SET checked = checked - 7 * 3600').run();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network down'); };
  try {
    assert.equal((await read(tier1Slug, a.cookie)).status, 200);
  } finally { globalThis.fetch = realFetch; }
});

test('点题:只有内圈,每 30 天 1 次', async () => {
  const plans = await planIds();
  addSub('I-READER0004', plans.reader);
  const r = await call('sub/activate', { id: 'I-READER0004' });
  assert.equal((await call('topic', { text: '写写美债曲线' }, r.cookie)).status, 403);
  addSub('I-INNER00001', plans.inner);
  const i = await call('sub/activate', { id: 'I-INNER00001' });
  assert.equal((await call('topic', { text: '写写美债曲线' }, i.cookie)).status, 200);
  assert.equal((await call('topic', { text: '再来一个' }, i.cookie)).status, 409);
});

test('改价后自动建新计划,旧计划的会员仍按档位识别', async () => {
  const before = await planIds();
  addSub('I-OLDPRICE01', before.reader);
  const { tiers } = await import('../functions/_lib/paid-store.mjs');
  const orig = tiers[0].price;
  tiers[0].price = 65;
  try {
    const after = await planIds();
    assert.notEqual(after.reader, before.reader);
    assert.equal(after.research, before.research);
    // 老价格订阅的会员挂在旧计划上,照样认成读者档
    const a = await call('sub/activate', { id: 'I-OLDPRICE01' });
    assert.equal(a.status, 200);
    assert.equal(a.data.tier, 'reader');
  } finally { tiers[0].price = orig; }
});

test('旧年度通行证 cookie 仍然有效', async () => {
  const exp = nowS() + 100 * DAY;
  const c = `u_all=${exp}.${await sign(env.UNLOCK_SECRET, 'pass.' + exp)}`;
  assert.equal((await read(tier1Slug, c)).status, 200);
});

async function member(id, tier) {
  const plans = await planIds();
  addSub(id, plans[tier]);
  return (await call('sub/activate', { id })).cookie;
}
const ADMIN = { 'x-admin-key': 'admin-key-0123456789' };

test('追踪表:人人看汇总,研究档以上看明细', async () => {
  const anon = await call('track');
  assert.ok(anon.data.summary.total > 0);
  assert.equal(anon.data.rows, null);
  const reader = await call('track', null, await member('I-TRKREADER1', 'reader'));
  assert.equal(reader.data.rows, null);
  const research = await call('track', null, await member('I-TRKRESRCH1', 'research'));
  assert.equal(research.data.rows.length, anon.data.summary.total);
  assert.ok(research.data.rows[0].claim.zh);
});

test('提问:只有内圈;推送企业微信;每 30 天 10 条', async () => {
  const r = await member('I-QAREADER01', 'reader');
  assert.equal((await call('question', { text: '美债怎么看' }, r)).status, 403);
  const i = await member('I-QAINNER001', 'inner');
  assert.equal((await call('question', { text: '第一个问题:期限溢价怎么测?' }, i)).status, 200);
  assert.equal(pp$.wecom.length, 1);
  assert.match(pp$.wecom[0].text.content, /内圈提问/);
  for (let n = 2; n <= 10; n++) assert.equal((await call('question', { text: '问题 ' + n }, i)).status, 200);
  assert.equal((await call('question', { text: '第 11 个' }, i)).status, 409);
});

test('答疑任务:钥匙不对 403;待办不含邮箱;写回复后会员看得到', async () => {
  const i = await member('I-QAINNER002', 'inner');
  await call('question', { text: '黄金和实际利率还相关吗?' }, i);
  assert.equal((await call('admin/pending', null, '', { 'x-admin-key': 'wrong' })).status, 403);
  assert.equal((await call('admin/pending')).status, 403);
  const p = await call('admin/pending', null, '', ADMIN);
  assert.equal(p.status, 200);
  assert.equal(p.data.questions.length, 1);
  assert.equal(p.data.questions[0].email, undefined);
  assert.equal(JSON.stringify(p.data).includes('example.com'), false);
  const id = p.data.questions[0].id;
  assert.equal((await call('admin/answer', { id, answer: '短' }, '', ADMIN)).status, 400);
  assert.equal((await call('admin/answer', { id, answer: '相关性在 2022 年后明显变弱,原因是央行购金……' }, '', ADMIN)).status, 200);
  const qa = await call('qa', null, i);
  assert.match(qa.data.questions[0].answer, /央行购金/);
  assert.equal((await call('admin/pending', null, '', ADMIN)).data.questions.length, 0);
});

test('点题:写完登记 slug,会员面板给出文章链接;别人的点题看不到', async () => {
  const i = await member('I-TOPINNER01', 'inner');
  await call('topic', { text: '写写稳定币和短债' }, i);
  const other = await member('I-TOPINNER02', 'inner');
  assert.equal((await call('qa', null, other)).data.topics.length, 0);
  const p = await call('admin/pending', null, '', ADMIN);
  const id = p.data.topics[0].id;
  assert.equal((await call('admin/topic', { id, slug: 'no-such-post' }, '', ADMIN)).status, 400);
  assert.equal((await call('admin/topic', { id, slug: tier1Slug }, '', ADMIN)).status, 200);
  const t = (await call('qa', null, i)).data.topics[0];
  assert.equal(t.done, 1);
  assert.equal(t.path, store[tier1Slug].path);
});

test('没设 ADMIN_KEY 时管理接口一律 403', async () => {
  delete env.ADMIN_KEY;
  assert.equal((await call('admin/pending', null, '', { 'x-admin-key': '' })).status, 403);
});

test('accessFromSub:各状态的有效期', () => {
  const plans = { reader: { id: 'P-1', price: 60 } };
  const n = 1_800_000_000;
  const a = accessFromSub({ plan_id: 'P-1', status: 'ACTIVE', billing_info: { next_billing_time: iso(n + 20 * DAY) } }, plans, n);
  assert.equal(a.tier, 'reader');
  assert.equal(a.until, n + 20 * DAY);
  const pend = accessFromSub({ plan_id: 'P-1', status: 'APPROVAL_PENDING', billing_info: {} }, plans, n);
  assert.equal(pend.until, 0);
  const none = accessFromSub({ plan_id: 'P-9', status: 'ACTIVE', billing_info: {} }, plans, n);
  assert.equal(none.tier, null);
});
