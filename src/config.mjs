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
  legalUpdated: '2026年11月3日',      // 法务页面最近更新日期
  legalUpdatedEn: 'November 3, 2026',
  passPrice: 50,                     // 旧的年度通行证(已停售;老买家的 cookie 仍然有效)
  singlePrice: 9,                    // 单篇解锁价(美元),新文章 frontmatter 的 price 写这个数
  telegram: 'https://t.me/linjieblog', // Telegram 频道(每日文章自动推送)
};

// ===== 会员档位(PayPal 按月自动续费)。改价直接改 price,下次有人打开订阅页时自动在 PayPal 建新计划 =====
// level 越高能看的越多;文章 frontmatter 的 tier 写 1/2/3(不写 = 1,读者档就能看)
export const TIERS = [
  {
    id: 'reader', level: 1, price: 60,
    zh: { name: '读者', perks: ['全站所有付费文章,含会员期内每天新发布的', '每周一篇长周报:本周主线 + 下周数据日历', '中英双语全文'] },
    en: { name: 'Reader', perks: ['Every paid article on the site, including each new daily piece', 'A long weekly report: the week\'s main thread plus next week\'s data calendar', 'Full text in both English and Chinese'] },
  },
  {
    id: 'research', level: 2, price: 100,
    zh: { name: '研究', perks: ['读者档全部内容', '月度数据包:通胀分项、ETF 资金流、美债曲线、AI 资本开支追踪图表', '观点追踪表:每篇核心判断,事后对了还是错了'] },
    en: { name: 'Research', perks: ['Everything in Reader', 'Monthly data pack: inflation components, ETF flows, the Treasury curve, AI capex tracking charts', 'Track record: every core call, scored right or wrong after the fact'] },
  },
  {
    id: 'inner', level: 3, price: 150,
    zh: { name: '内圈', perks: ['研究档全部内容', '每月点题 1 次:你出题,我写一篇深度', '会员留言,48 小时内回复'] },
    en: { name: 'Inner Circle', perks: ['Everything in Research', 'One topic request a month: you pick it, I write the deep dive', 'Member questions answered within 48 hours'] },
  },
];

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
    paywallHint: '付款后本浏览器长期有效。换设备时,在订阅页填 PayPal 订单号即可找回。',
    singleLabel: (p) => `单篇解锁 · $${p}`,
    passOr: '或',
    memberCta: (p) => `成为会员 · 每月 $${p} 起,全站畅读 →`,
    memberHave: '已是会员?恢复访问',
    tierLocked: (name) => `本篇是「${name}」档及以上会员的专享内容`,
    upgrade: '升级会员 →',
    tipHead: '觉得这篇有价值?请作者喝杯咖啡',
    tipCustom: '自定金额', tipGo: '打赏',
    tipNote: 'PAYPAL 安全支付 · 支持银行卡',
    memberLine: (p) => `会员每月 $${p} 起:全站付费文章、每周长周报、月度数据包、点题`,
    memberGo: '看会员方案 →',
    bannerTitle: '会员订阅',
    bannerDesc: (p) => `每月 $${p} 起,全站付费文章随时读,另有周报、数据包和点题。PayPal 按月扣款,随时可退订。`,
    bannerCta: '看会员方案 →',
    disclaimer: '本站文章仅代表作者个人观点,是探索世界、追寻真相的过程,不构成任何投资建议。',
    aiDisclosure: '本站文章由 AI 依照作者设定的分析方法与文风生成,并经作者审阅后发布。文中数据可能存在错误,请以一手来源为准。',
    fAbout: '关于', fTerms: '服务条款', fPrivacy: '隐私政策', fRefunds: '退款政策', fContact: '联系我们',
    fTelegram: 'TELEGRAM 频道', fMember: '会员订阅', fTools: '免费文件工具',
    fOp: (op) => `运营者 ${op}`,
    fPay: '支付由 PayPal 安全处理',
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
    paywallHint: 'Access stays active in this browser after payment. On another device, enter your PayPal order ID on the Subscribe page to restore it.',
    singleLabel: (p) => `Unlock this article · $${p}`,
    passOr: 'or',
    memberCta: (p) => `Become a member · from $${p}/month, read everything →`,
    memberHave: 'Already a member? Restore access',
    tierLocked: (name) => `This piece is for ${name} members and above`,
    upgrade: 'Upgrade →',
    tipHead: 'Found this valuable? Buy the author a coffee',
    tipCustom: 'Custom', tipGo: 'Tip',
    tipNote: 'SECURE PAYMENT VIA PAYPAL · CARDS ACCEPTED',
    memberLine: (p) => `Membership from $${p}/month: every paid article, a weekly report, a monthly data pack, topic requests`,
    memberGo: 'See plans →',
    bannerTitle: 'Membership',
    bannerDesc: (p) => `From $${p}/month: every paid article, plus a weekly report, data packs and topic requests. Billed monthly via PayPal, cancel anytime.`,
    bannerCta: 'See plans →',
    disclaimer: "Articles on this site represent the author's personal views only — a process of exploring the world in pursuit of truth. Nothing here constitutes investment advice.",
    aiDisclosure: 'Articles on this site are generated by AI following the analytical method and editorial voice set by the author, and are reviewed by the author before publication. Figures may contain errors — always verify against primary sources.',
    fAbout: 'About', fTerms: 'Terms of Service', fPrivacy: 'Privacy Policy', fRefunds: 'Refund Policy', fContact: 'Contact',
    fTelegram: 'TELEGRAM', fMember: 'MEMBERSHIP', fTools: 'FREE FILE TOOLS',
    fOp: (op) => `Operated by ${op}`,
    fPay: 'Payments securely processed by PayPal',
    dateFmt: (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dateShort: (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
  },
};
