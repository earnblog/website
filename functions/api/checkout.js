// POST /api/checkout — 创建 Stripe Checkout 会话
// body: { type: 'tip', amount, slug?, title? } 或 { type: 'unlock', slug }
import store, { passPrice } from '../_lib/paid-store.mjs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: '支付功能即将开通,请稍后再试' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const origin = new URL(request.url).origin;
  const slug = typeof body.slug === 'string' && /^[\w-]+$/.test(body.slug) ? body.slug : '';
  // 客户端带上当前页面路径(中/英文版路由不同),校验格式后用于支付完成的回跳
  const path = typeof body.path === 'string' && /^\/(en\/)?(posts\/[\w-]+|subscribe)\/?$/.test(body.path) ? body.path : '';
  const backUrl = path ? `${origin}${path.replace(/\/$/, '')}` : origin;

  let name, cents, successUrl;
  if (body.type === 'tip') {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return json({ error: '金额需在 $1 – $10,000 之间' }, 400);
    }
    cents = Math.round(amount * 100);
    name = `${path.startsWith('/en/') ? 'Tip' : '打赏'} · ${String(body.title || '临界').slice(0, 60)}`;
    successUrl = `${backUrl}?thanks=1`;
  } else if (body.type === 'unlock') {
    const entry = store[slug];
    if (!entry) return json({ error: 'not found' }, 404);
    cents = Math.round(entry.price * 100);
    const label = entry.path.startsWith('/en/') ? 'Unlock article' : '解锁全文';
    name = `${label} · ${entry.title.slice(0, 60)}`;
    successUrl = `${origin}/api/unlock?slug=${slug}&session_id={CHECKOUT_SESSION_ID}`;
  } else if (body.type === 'pass') {
    // 年度通行证:一次性付款,解锁全站付费文章一年(有效期从支付时刻起算)
    cents = Math.round(passPrice * 100);
    name = path.startsWith('/en/')
      ? `Annual Pass · The Critical Point (1 year, all paid articles)`
      : `年度通行证 · 临界(一年内全站付费文章)`;
    successUrl = `${origin}/api/unlock?pass=1&session_id={CHECKOUT_SESSION_ID}`;
  } else {
    return json({ error: 'bad type' }, 400);
  }

  const params = new URLSearchParams({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: backUrl,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][price_data][product_data][name]': name,
    'metadata[kind]': body.type,
    'metadata[slug]': slug,
    'metadata[path]': path,
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const session = await res.json();
  if (!res.ok || !session.url) {
    return json({ error: session.error?.message || '支付通道暂时不可用' }, 502);
  }
  return json({ url: session.url });
}
