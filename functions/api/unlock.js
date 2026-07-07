// GET /api/unlock?slug=…&session_id=… — 单篇解锁回跳
// GET /api/unlock?pass=1&session_id=… — 年度通行证回跳(有效期=支付时刻起一年)
// 向 Stripe 核实会话已付款,通过则种签名 cookie 并跳回。链接可反复访问(换设备恢复解锁)。
import store from '../_lib/paid-store.mjs';
import { sign } from '../_lib/sign.mjs';

const YEAR = 365 * 24 * 3600;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';
  const isPass = url.searchParams.get('pass') === '1';
  const sessionId = url.searchParams.get('session_id') || '';

  const fallback = isPass ? '/' : (/^[\w-]+$/.test(slug) && store[slug] ? store[slug].path : '/');
  const fail = (back) => Response.redirect(`${url.origin}${back || fallback}?unlockfail=1`, 302);

  if ((!isPass && !store[slug]) || !sessionId || !env.STRIPE_SECRET_KEY || !env.UNLOCK_SECRET) return fail();

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
  );
  const session = await res.json();
  if (!res.ok || session.payment_status !== 'paid') return fail();

  // 回跳到购买时所在页面(通行证从任意文章页都能买)
  const metaPath = typeof session.metadata?.path === 'string' && /^\/(en\/)?(posts\/[\w-]+|subscribe)\/?$/.test(session.metadata.path)
    ? session.metadata.path
    : '';

  if (isPass) {
    if (session.metadata?.kind !== 'pass') return fail(metaPath);
    // 有效期从支付时刻(session.created)起一年;过期后这条链接自然失效
    const exp = (Number(session.created) || 0) + YEAR;
    const now = Math.floor(Date.now() / 1000);
    if (exp <= now) return fail(metaPath);
    const token = await sign(env.UNLOCK_SECRET, `pass.${exp}`);
    return new Response(null, {
      status: 302,
      headers: {
        location: `${url.origin}${metaPath || '/'}?unlocked=1`,
        'set-cookie': `u_all=${exp}.${token}; Path=/; Max-Age=${exp - now}; SameSite=Lax; Secure; HttpOnly`,
      },
    });
  }

  if (session.metadata?.slug !== slug || session.metadata?.kind !== 'unlock') return fail();
  const token = await sign(env.UNLOCK_SECRET, slug);
  return new Response(null, {
    status: 302,
    headers: {
      location: `${url.origin}${fallback}?unlocked=1`,
      'set-cookie': `u_${slug}=${token}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`,
    },
  });
}
