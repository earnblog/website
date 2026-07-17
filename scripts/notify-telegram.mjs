// 把当日新发布的文章推送到 Telegram 频道 @linjieblog
// 用法: node scripts/notify-telegram.mjs [YYYY-MM-DD]  (不带参数 = 今天)
// 凭据在仓库根目录 .telegram.env(已 gitignore,勿提交);已推送过的 slug 记录在 .telegram-sent.json 防重复。
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE } from '../src/config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- 凭据 ----
const envFile = join(root, '.telegram.env');
if (!existsSync(envFile)) { console.error('缺少 .telegram.env'); process.exit(1); }
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHANNEL = env.TELEGRAM_CHANNEL;
if (!TOKEN || !CHANNEL) { console.error('.telegram.env 缺 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHANNEL'); process.exit(1); }

// ---- 选出目标日期的文章 ----
const target = process.argv[2] || new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD,本机时区
const postsDir = join(root, 'src', 'content', 'posts');
const posts = [];
for (const f of readdirSync(postsDir).filter((f) => f.endsWith('.md'))) {
  const raw = readFileSync(join(postsDir, f), 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) continue;
  const get = (k) => {
    let v = (fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1]?.trim();
    if (v && ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"')))) {
      v = v.slice(1, -1).replace(/''/g, "'");
    }
    return v;
  };
  if (get('draft') === 'true') continue;
  if (get('date') !== target) continue;
  posts.push({ slug: f.replace(/\.md$/, ''), title: get('title') || f, description: get('description') || '', price: get('price') });
}
if (posts.length === 0) { console.log(`没有 ${target} 的文章,跳过。`); process.exit(0); }

// ---- 去重 ----
const sentFile = join(root, '.telegram-sent.json');
const sent = existsSync(sentFile) ? JSON.parse(readFileSync(sentFile, 'utf8')) : [];
const fresh = posts.filter((p) => !sent.includes(p.slug));
if (fresh.length === 0) { console.log('都推送过了,跳过。'); process.exit(0); }

// ---- 逐条发送 ----
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let failed = 0;
for (let i = 0; i < fresh.length; i++) {
  const p = fresh[i];
  const url = `${SITE.url}/posts/${p.slug}/`;
  const lines = [
    `<b>${esc(p.title)}</b>`,
    '',
    esc(p.description),
    '',
    `全文 → ${url}`,
  ];
  if (p.price) lines.push(`(付费文章 $${p.price},开头免费试读)`);
  lines.push(`☕ 打赏/会员 → ${SITE.kofi}`);
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHANNEL,
      text: lines.join('\n'),
      parse_mode: 'HTML',
      disable_notification: i > 0, // 一天多篇只响一次铃
    }),
  });
  const d = await r.json();
  if (d.ok) {
    sent.push(p.slug);
    console.log(`✓ 已推送: ${p.title}`);
  } else {
    failed++;
    console.error(`✗ 推送失败: ${p.title} — ${d.description}`);
  }
  if (i < fresh.length - 1) await new Promise((res) => setTimeout(res, 1500));
}
writeFileSync(sentFile, JSON.stringify(sent, null, 2));
process.exit(failed ? 1 : 0);
