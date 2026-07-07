// GET /api/unlock?slug=…&session_id=… — Stripe 支付成功后的回跳:
// 向 Stripe 核实该会话已付款且对应本文,通过则种签名 cookie 并跳回文章。
// 这个链接可反复访问(换设备/清缓存后用它恢复解锁)。
import store from '../_lib/paid-store.mjs';
import { sign } from '../_lib/sign.mjs';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';
  const sessionId = url.searchParams.get('session_id') || '';
  const back = /^[\w-]+$/.test(slug) && store[slug] ? store[slug].path : '/';
  const fail = () => Response.redirect(`${url.origin}${back}?unlockfail=1`, 302);

  if (!store[slug] || !sessionId || !env.STRIPE_SECRET_KEY || !env.UNLOCK_SECRET) return fail();

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
  );
  const session = await res.json();
  if (
    !res.ok ||
    session.payment_status !== 'paid' ||
    session.metadata?.slug !== slug ||
    session.metadata?.kind !== 'unlock'
  ) {
    return fail();
  }

  const token = await sign(env.UNLOCK_SECRET, slug);
  return new Response(null, {
    status: 302,
    headers: {
      location: `${url.origin}${back}?unlocked=1`,
      'set-cookie': `u_${slug}=${token}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`,
    },
  });
}
