// 构建前置脚本:扫描付费文章(frontmatter 带 price),把预览段之后的正文渲染成 HTML,
// 写入 functions/_lib/paid-store.mjs —— 只进服务端 Function 包,不进公开静态页。
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitBody, renderMd } from '../src/lib/paywall.mjs';
import { SITE, TIERS } from '../src/config.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// 中英两个文章目录;pathPrefix 决定解锁后跳回哪个语言版面
const SOURCES = [
  { dir: path.join(ROOT, 'src', 'content', 'posts'), pathPrefix: '/posts/' },
  { dir: path.join(ROOT, 'src', 'content', 'posts-en'), pathPrefix: '/en/posts/' },
];
const OUT = path.join(ROOT, 'functions', '_lib', 'paid-store.mjs');

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return { fm, body: raw.slice(m[0].length) };
}

const store = {};
const enByDate = {};       // 英文版按日期找 slug,给观点追踪表配英文链接(同一天多篇则不配)
for (const { dir, pathPrefix } of SOURCES) {
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  } catch {
    continue; // 目录还不存在(如 posts-en 尚无文章)
  }
  for (const file of files) {
    const raw = await readFile(path.join(dir, file), 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    if (pathPrefix.startsWith('/en/') && fm.date) {
      const d = String(fm.date).slice(0, 10);
      enByDate[d] = d in enByDate ? null : { slug: file.replace(/\.md$/, ''), title: fm.title || '' };
    }
    const price = Number(fm.price);
    if (!Number.isFinite(price) || price <= 0 || fm.draft === 'true') continue;
    const slug = file.replace(/\.md$/, '');
    if (store[slug]) console.warn(`paywall: slug 冲突 "${slug}",${pathPrefix} 覆盖了先前条目——中英文付费文章文件名不能相同`);
    const { paidMd } = splitBody(body);
    const tier = [1, 2, 3].includes(Number(fm.tier)) ? Number(fm.tier) : 1;
    store[slug] = { title: fm.title || slug, price, tier, path: pathPrefix + slug, html: renderMd(paidMd) };
  }
}

// 观点追踪表(src/data/track.json):研究档会员专享,和付费正文一样只进服务端
let track = [];
try {
  const zhTitle = async (slug) => {
    try { return parseFrontmatter(await readFile(path.join(ROOT, 'src', 'content', 'posts', slug + '.md'), 'utf8')).fm.title || slug; } catch { return slug; }
  };
  for (const t of JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'track.json'), 'utf8'))) {
    const en = t.slugEn ? { slug: t.slugEn } : enByDate[t.date] || null;
    track.push({ ...t, title: await zhTitle(t.slug), slugEn: en?.slug || null, titleEn: en?.title || null });
  }
  track.sort((a, b) => b.date.localeCompare(a.date));
} catch (e) {
  console.warn('paywall: 读不到 src/data/track.json,观点追踪表为空 —', e.message);
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  `export default ${JSON.stringify(store, null, 2)};\n` +
    `export const passPrice = ${Number(SITE.passPrice) || 50};\n` +
    `export const singlePrice = ${Number(SITE.singlePrice) || 9};\n` +
    `export const tiers = ${JSON.stringify(TIERS.map(({ id, level, price, en }) => ({ id, level, price, en: { name: en.name } })))};\n` +
    `export const track = ${JSON.stringify(track, null, 1)};\n`,
  'utf8',
);
console.log(`paywall: ${Object.keys(store).length} 篇付费文章,追踪表 ${track.length} 条,会员 ${TIERS.map((t) => `${t.id} $${t.price}`).join(' / ')} -> functions/_lib/paid-store.mjs`);
