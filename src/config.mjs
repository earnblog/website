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
  passPrice: 50,                     // 年度通行证价格(美元):一次付款解锁全站付费文章一年
};

// ===== 栏目(固定四个,每篇文章 frontmatter 的 category 必须是其中之一) =====
export const CATEGORIES = {
  liquidity: {
    zh: '流动性与信用', en: 'Liquidity & Credit',
    descZh: '钱从哪来,到哪去。央行、美元、黄金与信用的扩张收缩——资产价格的水位,由这里决定。',
    descEn: 'Where the money comes from and where it goes: central banks, the dollar, gold, and the expansion and contraction of credit — the water level beneath every asset price.',
  },
  'ai-compute': {
    zh: 'AI 与算力', en: 'AI & Compute',
    descZh: 'AI 资本开支、算力经济与循环融资。这一轮周期最大的叙事,和叙事底下的现金流。',
    descEn: 'AI capex, the economics of compute, and circular financing — the biggest narrative of this cycle, and the cash flows underneath it.',
  },
  mechanics: {
    zh: '市场机制与心理', en: 'Market Mechanics & Psychology',
    descZh: '价格如何形成,故事如何定价,人心如何拥挤。看懂市场这台机器,而不是预测它。',
    descEn: 'How prices form, how narratives get priced, how crowds crowd. Understanding the machine of the market rather than predicting it.',
  },
  cycles: {
    zh: '估值与周期', en: 'Valuation & Cycles',
    descZh: '泡沫、估值、超级周期与轮回。贵不贵是一个问题,什么时候跌是另一个问题。',
    descEn: 'Bubbles, valuations, supercycles and their recurrence. Whether it is expensive is one question; when it falls is another.',
  },
};

// ===== 界面双语文案(zh 中文站 / en 英文站) =====
export const I18N = {
  zh: {
    utilbar: '独立财经分析 · INDEPENDENT RESEARCH',
    navHome: '首页', navAbout: '关于', navContact: '联系', navSubscribe: '订阅',
    langSwitch: 'EN', langSwitchHref: '/en/',
    tagline: '市场 · 机制 · 秩序',
    latest: '最新', readMore: '阅读全文 →',
    recent: '近期 · RECENT', archive: '归档 · ARCHIVE',
    topics: '栏目 · TOPICS', related: '延伸阅读 · RELATED',
    back: '← 返回目录',
    paidTag: (p) => `付费 $${p}`,
    paywallNote: '—— 以下为付费内容 ——',
    unlockBtn: (p) => `解锁全文 · $${p}`,
    paywallHint: '支付后在本浏览器长期有效;支付成功页的链接可收藏,换设备时打开即恢复解锁。',
    tipHead: '觉得这篇有价值?请作者喝杯咖啡',
    tipCustom: '自定金额', tipGo: '打赏',
    tipNote: 'STRIPE 安全支付 · 支持银行卡',
    passOr: '或',
    passBtn: (p) => `$${p} 订阅全站 · 一年内所有付费文章`,
    passLine: (p) => `订阅全文:$${p} 年度通行证,一年内解锁全站所有付费文章`,
    passGo: '开通 →',
    bannerTitle: '年度通行证',
    bannerDesc: (p) => `$${p} 一年,解锁全站所有付费文章(含订阅期内新发布)。一次付款,不自动续费。`,
    bannerCta: '订阅全文 →',
    disclaimer: '本站文章仅代表作者个人观点,是探索世界、追寻真相的过程,不构成任何投资建议。',
    fAbout: '关于', fTerms: '服务条款', fPrivacy: '隐私政策', fRefunds: '退款政策', fContact: '联系我们',
    fOp: (op) => `运营者 ${op}`,
    fPay: '支付由 Stripe 安全处理',
    dateFmt: (d) => d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    dateShort: (d) => d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.'),
  },
  en: {
    utilbar: 'INDEPENDENT FINANCIAL ANALYSIS',
    navHome: 'Home', navAbout: 'About', navContact: 'Contact', navSubscribe: 'Subscribe',
    langSwitch: '中文', langSwitchHref: '/',
    tagline: 'Markets · Mechanisms · Order',
    latest: 'Latest', readMore: 'Read article →',
    recent: 'RECENT', archive: 'ARCHIVE',
    topics: 'TOPICS', related: 'RELATED',
    back: '← Back to index',
    paidTag: (p) => `Paid · $${p}`,
    paywallNote: '— PAID CONTENT BELOW —',
    unlockBtn: (p) => `Unlock full article · $${p}`,
    paywallHint: 'Access stays active in this browser after payment. Bookmark the payment success link to restore access on another device.',
    tipHead: 'Found this valuable? Buy the author a coffee',
    tipCustom: 'Custom', tipGo: 'Tip',
    tipNote: 'SECURE PAYMENT VIA STRIPE',
    passOr: 'or',
    passBtn: (p) => `Annual pass $${p} · every paid article for one year`,
    passLine: (p) => `Subscribe: $${p} annual pass unlocks every paid article on this site for one year`,
    passGo: 'Get the pass →',
    bannerTitle: 'Annual Pass',
    bannerDesc: (p) => `$${p} for one year of every paid article on this site, including those published during your term. One payment, no auto-renewal.`,
    bannerCta: 'Subscribe →',
    disclaimer: "Articles on this site represent the author's personal views only — a process of exploring the world in pursuit of truth. Nothing here constitutes investment advice.",
    fAbout: 'About', fTerms: 'Terms of Service', fPrivacy: 'Privacy Policy', fRefunds: 'Refund Policy', fContact: 'Contact',
    fOp: (op) => `Operated by ${op}`,
    fPay: 'Payments securely processed by Stripe',
    dateFmt: (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dateShort: (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
  },
};
