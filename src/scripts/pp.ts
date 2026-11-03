// 前端共用:读收款配置、按需加载 PayPal SDK、调 /api/pp、弹提示
export type PPConfig = {
  open: boolean;
  clientId?: string;
  tiers?: { id: string; level: number; price: number; planId?: string }[];
};

let configPromise: Promise<PPConfig> | null = null;
export function ppConfig(): Promise<PPConfig> {
  configPromise ??= fetch('/api/pp/config')
    .then((r) => (r.ok ? r.json() : { open: false }))
    .catch(() => ({ open: false }));
  return configPromise;
}

// 单篇/打赏用 capture 模式,订阅页用 subscription 模式;一个页面只加载一种
export function loadPayPal(clientId: string, mode: 'capture' | 'subscription'): Promise<any> {
  const w = window as any;
  if (w.paypal) return Promise.resolve(w.paypal);
  const q = mode === 'subscription'
    ? `client-id=${clientId}&vault=true&intent=subscription`
    : `client-id=${clientId}&currency=USD&intent=capture`;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?${q}&components=buttons&disable-funding=paylater`;
    s.onload = () => resolve(w.paypal);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function api(route: string, body?: object): Promise<{ ok: boolean; status: number; data: any }> {
  const r = await fetch(`/api/pp/${route}`, body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

export function toast(msg: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); }, 4200);
}
