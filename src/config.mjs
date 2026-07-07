// ===== 改这里就行:全站配置 =====
export const SITE = {
  name: '临界',                      // 站名
  nameEn: 'The Critical Point',      // 英文站名
  tagline: '市场 · 机制 · 秩序',     // 副标题/口号
  author: '重新开始',                // 笔名
  url: 'https://fncuthdert.com',     // GoDaddy 域名(带 https://,结尾不要斜杠)
  disclaimer: '本站文章仅代表作者个人观点,是探索世界、追寻真相的过程,不构成任何投资建议。',
  contactEmail: 'contact@fncuthdert.com', // 对外联系邮箱(条款/隐私/退款/联系页共用)
  operator: 'Guo Qing',              // 运营者(与 Stripe 账户注册名一致)
  legalUpdated: '2026年7月7日',       // 法务页面最近更新日期
  legalUpdatedEn: 'July 7, 2026',
};

// ===== 界面双语文案(zh 中文站 / en 英文站) =====
export const I18N = {
  zh: {
    utilbar: '独立财经分析 · INDEPENDENT RESEARCH',
    navHome: '首页', navAbout: '关于', navContact: '联系',
    langSwitch: 'EN', langSwitchHref: '/en/',
    tagline: '市场 · 机制 · 秩序',
    latest: '最新', readMore: '阅读全文 →',
    recent: '近期 · RECENT', archive: '归档 · ARCHIVE',
    back: '← 返回目录',
    paidTag: (p) => `付费 $${p}`,
    paywallNote: '—— 以下为付费内容 ——',
    unlockBtn: (p) => `解锁全文 · $${p}`,
    paywallHint: '支付后在本浏览器长期有效;支付成功页的链接可收藏,换设备时打开即恢复解锁。',
    tipHead: '觉得这篇有价值?请作者喝杯咖啡',
    tipCustom: '自定金额', tipGo: '打赏',
    tipNote: 'STRIPE 安全支付 · 支持银行卡',
    disclaimer: '本站文章仅代表作者个人观点,是探索世界、追寻真相的过程,不构成任何投资建议。',
    fAbout: '关于', fTerms: '服务条款', fPrivacy: '隐私政策', fRefunds: '退款政策', fContact: '联系我们',
    fOp: (op) => `运营者 ${op}`,
    fPay: '支付由 Stripe 安全处理',
    dateFmt: (d) => d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    dateShort: (d) => d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.'),
  },
  en: {
    utilbar: 'INDEPENDENT FINANCIAL ANALYSIS',
    navHome: 'Home', navAbout: 'About', navContact: 'Contact',
    langSwitch: '中文', langSwitchHref: '/',
    tagline: 'Markets · Mechanisms · Order',
    latest: 'Latest', readMore: 'Read article →',
    recent: 'RECENT', archive: 'ARCHIVE',
    back: '← Back to index',
    paidTag: (p) => `Paid · $${p}`,
    paywallNote: '— PAID CONTENT BELOW —',
    unlockBtn: (p) => `Unlock full article · $${p}`,
    paywallHint: 'Access stays active in this browser after payment. Bookmark the payment success link to restore access on another device.',
    tipHead: 'Found this valuable? Buy the author a coffee',
    tipCustom: 'Custom', tipGo: 'Tip',
    tipNote: 'SECURE PAYMENT VIA STRIPE',
    disclaimer: "Articles on this site represent the author's personal views only — a process of exploring the world in pursuit of truth. Nothing here constitutes investment advice.",
    fAbout: 'About', fTerms: 'Terms of Service', fPrivacy: 'Privacy Policy', fRefunds: 'Refund Policy', fContact: 'Contact',
    fOp: (op) => `Operated by ${op}`,
    fPay: 'Payments securely processed by Stripe',
    dateFmt: (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dateShort: (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
  },
};
