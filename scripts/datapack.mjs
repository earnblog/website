// 月度数据包:从一手源取数、算好、画图,给研究档会员的月度数据包文章用。
// 用法: node scripts/datapack.mjs [YYYY-MM]   (不写月份 = 上个月)
// 产出: src/data/datapack/<月>.json(全部数字 + 出处)
//       public/datapack/<月>/inflation.svg  yields.svg  etf.svg  capex.svg
// 各块独立容错:哪个源取不到,JSON 里记 errors,对应的图不出,文章里照实说明。
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const UA = 'TheCriticalPoint research (fncuthdert.com) contact@fncuthdert.com';

const month = process.argv[2] || (() => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
})();
if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('月份格式 YYYY-MM');
const monthEnd = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().slice(0, 10);

const out = { month, monthEnd, generatedAt: new Date().toISOString(), errors: [], sources: {} };

async function get(url, { curlFirst = false } = {}) {
  const viaFetch = async () => {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  };
  // curl 走系统代理,也更容易过 Cloudflare 的浏览器检查
  const viaCurl = async () => execFileSync('curl', ['-s', '-m', '30', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', url], { maxBuffer: 50 * 1024 * 1024 }).toString();
  let last;
  for (const f of curlFirst ? [viaCurl, viaFetch] : [viaFetch, viaCurl]) {
    try { const t = await f(); if (t) return t; } catch (e) { last = e; }
  }
  throw last ?? new Error('empty');
}
const attempt = async (key, fn) => {
  try { out[key] = await fn(); } catch (e) { out[key] = null; out.errors.push(`${key}: ${String(e.message).slice(0, 160)}`); }
};

// FRED 序列 -> [{date, value}](旧→新),去掉缺值
async function fred(id) {
  const csv = await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
  return csv.trim().split('\n').slice(1).map((l) => l.split(','))
    .filter(([, v]) => v && v !== '.' && !isNaN(+v)).map(([d, v]) => ({ date: d, value: +v }));
}
const r2 = (x) => Math.round(x * 100) / 100;

const shiftMonths = (iso, n) => { const d = new Date(iso.slice(0, 10) + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 10); };

// ---------------- 1. 通胀分项(BLS CPI,经 FRED) ----------------
// 口径和 BLS 公告一致:同比用未季调序列(nsa),环比用季调序列(sa)。
// 用季调序列算同比会和官方数差 0.3 个点以上(2026-09 实测 4.02% vs 官方 3.7%)
const CPI = [
  { sa: 'CPIAUCSL', nsa: 'CPIAUCNS', zh: '整体 CPI', en: 'Headline CPI', color: '#1c2330' },
  { sa: 'CPILFESL', nsa: 'CPILFENS', zh: '核心 CPI', en: 'Core CPI', color: '#a8453a' },
  { sa: 'CUSR0000SAH1', nsa: 'CUUR0000SAH1', zh: '住房', en: 'Shelter', color: '#4f6b8a' },
  { sa: 'CUSR0000SASLE', nsa: 'CUUR0000SASLE', zh: '核心服务(除能源)', en: 'Services ex-energy', color: '#c8a96a' },
  { sa: 'CUSR0000SACL1E', nsa: 'CUUR0000SACL1E', zh: '核心商品', en: 'Core goods', color: '#6f9a6a' },
  { sa: 'CPIENGSL', nsa: 'CPIENGNS', zh: '能源', en: 'Energy', color: '#8a7f6a', chart: false },
];
await attempt('inflation', async () => {
  const series = [];
  for (const s of CPI) {
    const nsa = (await fred(s.nsa)).filter((o) => o.date <= monthEnd);
    const sa = (await fred(s.sa)).filter((o) => o.date <= monthEnd);
    // 按日期找"去年同月/上个月",不按行数倒推:2025 年 10 月 CPI 因政府停摆没有发布,
    // 按行数倒推 12 行会变成 13 个月前,同比整体虚高约 0.3 个点
    const change = (obs, months) => {
      const byDate = new Map(obs.map((o) => [o.date.slice(0, 7), o.value]));
      return obs.map((o) => {
        const prev = byDate.get(shiftMonths(o.date, months).slice(0, 7));
        return prev ? { date: o.date.slice(0, 7), value: r2((o.value / prev - 1) * 100) } : null;
      }).filter(Boolean);
    };
    const yoy = change(nsa, 12);
    const mom = change(sa, 1);
    series.push({ ...s, yoy: yoy.slice(-24), mom: mom.slice(-6), latest: yoy.at(-1), latestMoM: mom.at(-1) });
  }
  out.sources.inflation = 'BLS CPI-U,经 FRED 下载;同比按未季调序列、环比按季调序列计算(与 BLS 公告口径一致)';
  return { latestMonth: series[0].latest.date, series };
});

// ---------------- 2. 美债收益率曲线(美国财政部,经 FRED) ----------------
const TENORS = [['DGS1MO', '1M'], ['DGS3MO', '3M'], ['DGS6MO', '6M'], ['DGS1', '1Y'], ['DGS2', '2Y'], ['DGS5', '5Y'], ['DGS7', '7Y'], ['DGS10', '10Y'], ['DGS20', '20Y'], ['DGS30', '30Y']];
await attempt('yields', async () => {
  const asOf = { now: monthEnd, m3: shiftMonths(monthEnd, 3), m12: shiftMonths(monthEnd, 12) };
  const curve = [];
  for (const [id, label] of TENORS) {
    const obs = await fred(id);
    const at = (d) => { const o = obs.filter((x) => x.date <= d).at(-1); return o ? { date: o.date, value: o.value } : null; };
    curve.push({ tenor: label, now: at(asOf.now), m3: at(asOf.m3), m12: at(asOf.m12) });
  }
  const v = (t, k) => curve.find((c) => c.tenor === t)?.[k]?.value;
  out.sources.yields = '美国财政部每日收益率曲线,经 FRED 下载(各期限最后一个可得交易日)';
  return {
    asOf, curve,
    spread2s10s: { now: r2(v('10Y', 'now') - v('2Y', 'now')), m3: r2(v('10Y', 'm3') - v('2Y', 'm3')), m12: r2(v('10Y', 'm12') - v('2Y', 'm12')) },
    spread3m10y: { now: r2(v('10Y', 'now') - v('3M', 'now')), m3: r2(v('10Y', 'm3') - v('3M', 'm3')), m12: r2(v('10Y', 'm12') - v('3M', 'm12')) },
  };
});

// ---------------- 3. 比特币现货 ETF 月度净流入(Farside) ----------------
const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const toNum = (s) => { const n = +String(s).replace(/,/g, '').replace(/^\((.*)\)$/, '-$1'); return isNaN(n) ? null : n; };
const cellsOf = (row) => [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim());
await attempt('etf', async () => {
  const html = await get('https://farside.co.uk/bitcoin-etf-flow-all-data/', { curlFirst: true });
  if (!html.includes('<table class="etf"')) throw new Error('Farside 页面被挡或改版');
  const rows = html.split('<table class="etf"')[1].split('</table>')[0].split('<tr').slice(1);
  const byMonth = {};
  let days = 0;
  for (const r of rows) {
    const c = cellsOf(r);
    const m = /^(\d{2}) (\w{3}) (\d{4})$/.exec(c[0] || '');
    if (!m || !MON[m[2]]) continue;
    const key = `${m[3]}-${MON[m[2]]}`;
    const v = toNum(c.at(-1));
    if (v === null || key > month) continue;
    byMonth[key] = (byMonth[key] || 0) + v;
    days++;
  }
  const months = Object.keys(byMonth).sort().slice(-12).map((k) => ({ month: k, netM: Math.round(byMonth[k]) }));
  if (!days || !months.length) throw new Error('Farside 表格解析为空');
  out.sources.etf = 'Farside Investors 美国现货比特币 ETF 每日净流入(百万美元),本脚本按月加总';
  return { months, cumulativeM: Math.round(Object.values(byMonth).reduce((a, b) => a + b, 0)) };
});

// ---------------- 4. 四大云厂商资本开支(SEC 10-Q/10-K XBRL) ----------------
const CO = [
  { name: 'Microsoft', cik: '0000789019', color: '#4f6b8a' },
  { name: 'Alphabet', cik: '0001652044', color: '#6f9a6a' },
  { name: 'Amazon', cik: '0001018724', color: '#c8a96a' },
  { name: 'Meta', cik: '0001326801', color: '#a8453a' },
];
const CONCEPTS = ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'];
const qLabel = (end) => { const d = new Date(end + 'T00:00:00Z'); return `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`; };
// 现金流量表报的是年初累计数:同一个起点的累计数相邻相减,得到单季
function quarterly(facts) {
  const seen = new Map();
  for (const f of facts) if (/10-[QK]/.test(f.form) && f.start && f.end) seen.set(f.start + '|' + f.end, f.val);
  const byStart = {};
  for (const [k, val] of seen) { const [s, e] = k.split('|'); (byStart[s] ||= []).push({ end: e, val }); }
  const q = {};
  for (const [s, list] of Object.entries(byStart)) {
    list.sort((a, b) => a.end.localeCompare(b.end));
    let prev = 0, prevEnd = s;
    for (const x of list) {
      const days = (Date.parse(x.end) - Date.parse(prevEnd)) / 864e5;
      if (days > 70 && days < 110) q[qLabel(x.end)] = { end: x.end, val: x.val - prev };
      prev = x.val; prevEnd = x.end;
    }
  }
  return q;
}
await attempt('capex', async () => {
  const companies = [];
  for (const c of CO) {
    let best = null;
    for (const concept of CONCEPTS) {
      try {
        const j = JSON.parse(await get(`https://data.sec.gov/api/xbrl/companyconcept/CIK${c.cik}/us-gaap/${concept}.json`));
        const q = quarterly(j.units?.USD || []);
        const lastEnd = Object.values(q).map((x) => x.end).sort().at(-1) || '';
        if (!best || lastEnd > best.lastEnd) best = { concept, q, lastEnd };
      } catch { /* 这家没有这个科目 */ }
    }
    if (!best) { out.errors.push(`capex: ${c.name} 两个科目都取不到`); continue; }
    const keys = Object.keys(best.q).filter((k) => best.q[k].end <= monthEnd).sort().slice(-9);
    companies.push({ ...c, concept: best.concept, quarters: keys.map((k) => ({ q: k, end: best.q[k].end, usdB: r2(best.q[k].val / 1e9) })) });
    await new Promise((r) => setTimeout(r, 150)); // SEC 限速 10 次/秒
  }
  if (!companies.length) throw new Error('四家都没取到');
  const allQ = [...new Set(companies.flatMap((c) => c.quarters.map((x) => x.q)))].sort().slice(-8);
  const total = allQ.map((q) => ({ q, usdB: r2(companies.reduce((a, c) => a + (c.quarters.find((x) => x.q === q)?.usdB || 0), 0)), complete: companies.every((c) => c.quarters.some((x) => x.q === q)) }));
  out.sources.capex = 'SEC EDGAR XBRL(各公司 10-Q/10-K 现金流量表"购置物业与设备"那一行),年初累计数相减得单季;季度按财季截止日归入自然季度。注意:不含融资租赁本金,所以会比公司自己口径的"资本开支"略低(如 Meta 2026Q3 本口径 339 亿美元,公司口径含融资租赁为 349 亿)';
  return { companies, total };
});

// ---------------- 画图(暖纸底,和站内示意图一致) ----------------
const W = 680, H = 360, M = { l: 56, r: 20, t: 46, b: 52 };
const PAPER = '#fbf9f4', INK = '#1c2330', SOFT = '#8a8577', GRID = '#e6e0d3';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svgWrap = (title, body, legend = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Georgia, 'Noto Serif SC', serif">
<rect width="${W}" height="${H}" fill="${PAPER}"/>
<text x="${M.l}" y="26" font-size="15" fill="${INK}" font-weight="700">${esc(title)}</text>
${body}${legend}
<text x="${W - M.r}" y="${H - 8}" font-size="10" fill="${SOFT}" text-anchor="end">fncuthdert.com · ${month}</text>
</svg>`;
function scale(min, max) {
  const pad = (max - min) * 0.08 || 1;
  const lo = min - pad, hi = max + pad;
  const y = (v) => M.t + (H - M.t - M.b) * (1 - (v - lo) / (hi - lo));
  const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4)));
  const nice = [1, 2, 5, 10].map((k) => k * step).find((s) => (hi - lo) / s <= 6) || step * 10;
  const ticks = [];
  for (let v = Math.ceil(lo / nice) * nice; v <= hi; v += nice) ticks.push(+v.toFixed(6));
  return { y, ticks };
}
const yAxis = (sc, fmt) => sc.ticks.map((v) => `<line x1="${M.l}" x2="${W - M.r}" y1="${sc.y(v)}" y2="${sc.y(v)}" stroke="${v === 0 ? SOFT : GRID}"/><text x="${M.l - 8}" y="${sc.y(v) + 4}" font-size="11" fill="${SOFT}" text-anchor="end">${fmt(v)}</text>`).join('');
// 图例按可用宽度平分,条目多时不会溢出右边
const legendRow = (items) => {
  const w = (W - M.l - M.r) / Math.max(items.length, 1);
  return items.map((it, i) => `<rect x="${(M.l + i * w).toFixed(1)}" y="${H - 26}" width="12" height="3" fill="${it.color}"/><text x="${(M.l + i * w + 18).toFixed(1)}" y="${H - 22}" font-size="11" fill="${INK}">${esc(it.label)}</text>`).join('');
};

function lineChart(title, labels, series, fmt) {
  const vals = series.flatMap((s) => s.values.filter((v) => v !== null));
  const sc = scale(Math.min(...vals), Math.max(...vals));
  const x = (i) => M.l + (W - M.l - M.r) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
  const every = Math.ceil(labels.length / 8);
  const xl = labels.map((l, i) => (i % every === 0 || i === labels.length - 1) ? `<text x="${x(i)}" y="${H - M.b + 18}" font-size="10.5" fill="${SOFT}" text-anchor="middle">${esc(l)}</text>` : '').join('');
  const lines = series.map((s) => {
    const pts = s.values.map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${sc.y(v).toFixed(1)}`)).filter(Boolean).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`;
  }).join('');
  return svgWrap(title, yAxis(sc, fmt) + xl + lines, legendRow(series.map((s) => ({ label: s.label, color: s.color }))));
}
function barChart(title, labels, groups, fmt) {
  // groups: [{label,color,values}],堆叠
  const totals = labels.map((_, i) => groups.reduce((a, g) => a + Math.max(0, g.values[i] || 0), 0));
  const negs = labels.map((_, i) => groups.reduce((a, g) => a + Math.min(0, g.values[i] || 0), 0));
  const sc = scale(Math.min(0, ...negs), Math.max(0, ...totals));
  const bw = (W - M.l - M.r) / labels.length;
  let bars = '';
  labels.forEach((l, i) => {
    let up = 0, down = 0;
    for (const g of groups) {
      const v = g.values[i] || 0;
      const from = v >= 0 ? up : down, to = from + v;
      if (v >= 0) up = to; else down = to;
      const y1 = sc.y(Math.max(from, to)), y2 = sc.y(Math.min(from, to));
      bars += `<rect x="${(M.l + i * bw + bw * 0.18).toFixed(1)}" y="${y1.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(0.5, y2 - y1).toFixed(1)}" fill="${g.color}"/>`;
    }
    bars += `<text x="${(M.l + i * bw + bw / 2).toFixed(1)}" y="${H - M.b + 18}" font-size="10.5" fill="${SOFT}" text-anchor="middle">${esc(l)}</text>`;
  });
  return svgWrap(title, yAxis(sc, fmt) + bars, groups.length > 1 ? legendRow(groups.map((g) => ({ label: g.label, color: g.color }))) : '');
}

const charts = {};
if (out.inflation) {
  const shown = out.inflation.series.filter((s) => s.chart !== false);
  const labels = shown[0].yoy.map((p) => p.date);
  charts.inflation = lineChart('CPI 分项同比 · CPI components, YoY %', labels,
    shown.map((s, i) => ({ label: s.en, color: s.color, width: i < 2 ? 2.6 : 1.8, values: labels.map((d) => s.yoy.find((p) => p.date === d)?.value ?? null) })),
    (v) => v.toFixed(1) + '%');
}
if (out.yields) {
  const labels = out.yields.curve.map((c) => c.tenor);
  charts.yields = lineChart('美债收益率曲线 · Treasury yield curve, %', labels, [
    { label: `${out.yields.asOf.now} 当月末`, color: '#a8453a', width: 2.8, values: out.yields.curve.map((c) => c.now?.value ?? null) },
    { label: `${out.yields.asOf.m3} 3个月前`, color: '#4f6b8a', values: out.yields.curve.map((c) => c.m3?.value ?? null) },
    { label: `${out.yields.asOf.m12} 1年前`, color: '#8a8577', dash: '5 4', values: out.yields.curve.map((c) => c.m12?.value ?? null) },
  ], (v) => v.toFixed(2));
}
if (out.etf) {
  charts.etf = barChart('比特币现货 ETF 月度净流入 · Spot BTC ETF net flows, $B', out.etf.months.map((m) => m.month.slice(2)),
    [{ label: 'net', color: '#c8a96a', values: out.etf.months.map((m) => m.netM) }], (v) => (v / 1000).toFixed(0) + 'B');
}
if (out.capex) {
  const labels = out.capex.total.map((t) => t.q);
  charts.capex = barChart('四大云厂商单季资本开支 · Hyperscaler capex per quarter, $B', labels,
    out.capex.companies.map((c) => ({ label: c.name, color: c.color, values: labels.map((q) => c.quarters.find((x) => x.q === q)?.usdB ?? 0) })),
    (v) => '$' + v.toFixed(0) + 'B');
}

const chartDir = path.join(ROOT, 'public', 'datapack', month);
mkdirSync(chartDir, { recursive: true });
out.charts = {};
for (const [k, svg] of Object.entries(charts)) {
  writeFileSync(path.join(chartDir, `${k}.svg`), svg);
  out.charts[k] = `/datapack/${month}/${k}.svg`;
}
const jsonDir = path.join(ROOT, 'src', 'data', 'datapack');
mkdirSync(jsonDir, { recursive: true });
writeFileSync(path.join(jsonDir, `${month}.json`), JSON.stringify(out, null, 2));
console.log(`datapack ${month}: 图 ${Object.keys(charts).join(', ') || '无'};错误 ${out.errors.length ? out.errors.join(' | ') : '无'}`);
console.log(`-> src/data/datapack/${month}.json`);
