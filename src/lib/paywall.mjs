// 付费墙共享逻辑:构建脚本(scripts/build-paywall.mjs)和文章页(src/pages/posts)都用它,
// 保证"预览切割"和"付费正文渲染"两边完全一致。
import MarkdownIt from 'markdown-it';

// 免费预览的段落块数
export const PREVIEW_BLOCKS = 2;

const md = new MarkdownIt({ html: true });

export function renderMd(src) {
  return md.render(src);
}

// 正文按空行切块,前 PREVIEW_BLOCKS 块免费,其余进付费区
export function splitBody(body) {
  const blocks = body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return {
    previewMd: blocks.slice(0, PREVIEW_BLOCKS).join('\n\n'),
    paidMd: blocks.slice(PREVIEW_BLOCKS).join('\n\n'),
  };
}
