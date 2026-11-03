// 会员提问/点题时推一条到运营者的企业微信群(secret WECOM_WEBHOOK)。推送失败不影响会员提交
export async function notifyOwner(env, text) {
  if (!env.WECOM_WEBHOOK) return;
  try {
    await fetch(env.WECOM_WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ msgtype: 'text', text: { content: text.slice(0, 600) } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* 企业微信偶尔超时,不重试 */ }
}
