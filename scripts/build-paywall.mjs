// 构建前置脚本:扫描付费文章(frontmatter 带 price),把预览段之后的正文渲染成 HTML,
// 写入 functions/_lib/paid-store.mjs —— 只进服务端 Function 包,不进公开静态页。
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitBody, renderMd } from '../src/lib/paywall.mjs';

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
    const price = Number(fm.price);
    if (!Number.isFinite(price) || price <= 0 || fm.draft === 'true') continue;
    const slug = file.replace(/\.md$/, '');
    if (store[slug]) console.warn(`paywall: slug 冲突 "${slug}",${pathPrefix} 覆盖了先前条目——中英文付费文章文件名不能相同`);
    const { paidMd } = splitBody(body);
    store[slug] = { title: fm.title || slug, price, path: pathPrefix + slug, html: renderMd(paidMd) };
  }
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, `export default ${JSON.stringify(store, null, 2)};\n`, 'utf8');
console.log(`paywall: ${Object.keys(store).length} 篇付费文章 -> functions/_lib/paid-store.mjs`);
