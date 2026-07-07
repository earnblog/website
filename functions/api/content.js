// GET /api/content?slug=… — 校验解锁 cookie,通过则返回付费正文 HTML
import store from '../_lib/paid-store.mjs';
import { sign } from '../_lib/sign.mjs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';
  const entry = store[slug];
  if (!entry) return json({ error: 'not found' }, 404);
  if (!env.UNLOCK_SECRET) return json({ error: 'locked' }, 401);

  const cookie = request.headers.get('cookie') || '';

  // 单篇解锁 cookie
  const m = cookie.match(new RegExp(`(?:^|;\\s*)u_${slug}=([0-9a-f]{64})`));
  if (m && m[1] === (await sign(env.UNLOCK_SECRET, slug))) return json({ html: entry.html });

  // 年度通行证 cookie:u_all=<过期时间戳>.<签名>,签名覆盖过期时间,防篡改续期
  const p = cookie.match(/(?:^|;\s*)u_all=(\d+)\.([0-9a-f]{64})/);
  if (p) {
    const exp = Number(p[1]);
    const valid = exp > Math.floor(Date.now() / 1000) && p[2] === (await sign(env.UNLOCK_SECRET, `pass.${exp}`));
    if (valid) return json({ html: entry.html });
  }

  return json({ error: 'locked' }, 401);
}
