// PayPal REST 调用(Pages Functions 共用)。做法同 tinyfilelab 的 functions/api/pp。
// 环境变量:PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_ENV ("live" | "sandbox")

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const paypalReady = (env) => !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET);

const apiBase = (env) => (env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com');

let tokenCache = null;
async function paypalToken(env, fresh = false) {
  if (!fresh && tokenCache && tokenCache.exp > Date.now() && tokenCache.id === env.PAYPAL_CLIENT_ID) return tokenCache.token;
  const r = await fetch(apiBase(env) + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + btoa(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_SECRET),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error('paypal auth ' + r.status);
  const d = await r.json();
  tokenCache = { token: d.access_token, exp: Date.now() + (d.expires_in - 120) * 1000, id: env.PAYPAL_CLIENT_ID };
  return d.access_token;
}

// 换过 PayPal 凭据后 isolate 里可能还缓存着旧 token:401 时清缓存重试一次
export async function paypal(env, method, path, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await paypalToken(env, attempt > 0);
    const r = await fetch(apiBase(env) + path, {
      method,
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', prefer: 'return=representation' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401 && attempt === 0) continue;
    const d = await r.json().catch(() => ({}));
    return { status: r.status, data: d };
  }
}
