// Data fetchers. All sources are free public APIs (no keys).
const UA = { 'User-Agent': 'crypto-filin-cards/1.0 (+https://t.me/Filin1Radar)', Accept: 'application/json' };

let cgChain = Promise.resolve();
const sleep = ms => new Promise(s => setTimeout(s, ms));
// CoinGecko free tier: serialize calls with a gap to stay under the rate limit
function cgQueue(fn) { const p = cgChain.then(fn); cgChain = p.catch(() => {}).then(() => sleep(2500)); return p; }
function getJSON(url, tries = 4) {
  return url.includes('coingecko.com') ? cgQueue(() => rawJSON(url, tries)) : rawJSON(url, tries);
}
async function rawJSON(url, tries) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 429) { last = new Error('429 rate limit ' + url); await sleep(20000 * (i + 1)); continue; }
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) { last = e; await new Promise(s => setTimeout(s, 3000)); }
  }
  throw last;
}

const CG = 'https://api.coingecko.com/api/v3';
const TOP = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple'];

// ---------- DAILY ----------
async function daily() {
  const [glob, coins, top100, fng, cal] = await Promise.all([
    getJSON(`${CG}/global`),
    getJSON(`${CG}/coins/markets?vs_currency=usd&ids=${TOP.join(',')}&sparkline=true&price_change_percentage=24h`),
    getJSON(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true`),
    getJSON('https://api.alternative.me/fng/?limit=31'),
    getJSON('https://nfs.faireconomy.media/ff_calendar_thisweek.json').catch(() => []),
  ]);
  const g = glob.data;
  // 7d market-cap & dominance curves approximated from top-100 sparklines (price * circulating supply)
  // use only coins with a complete 7d sparkline so new listings don't create fake jumps
  const full = top100.slice(0, 30).filter(c => (c.sparkline_in_7d?.price?.length || 0) >= 150 && c.sparkline_in_7d.price.every(v => v > 0) && c.circulating_supply && !/usd|dai/i.test(c.symbol));
  const n = Math.min(...full.map(c => c.sparkline_in_7d.price.length));
  const capCurve = Array.from({ length: n }, (_, i) =>
    full.reduce((s, c) => s + c.sparkline_in_7d.price[c.sparkline_in_7d.price.length - n + i] * c.circulating_supply, 0));
  const btc = top100.find(c => c.id === 'bitcoin');
  const bp = btc.sparkline_in_7d.price.slice(-n);
  const domCurve = capCurve.map((v, i) => bp[i] * btc.circulating_supply / v * 100);
  const domNow = g.market_cap_percentage.btc;
  const domChg24 = domCurve[n - 1] - domCurve[Math.max(0, n - 25)];
  const order = Object.fromEntries(TOP.map((id, i) => [id, i]));
  coins.sort((a, b) => order[a.id] - order[b.id]);
  const f = fng.data.map(d => +d.value);
  return {
    cap: g.total_market_cap.usd, capChg: g.market_cap_change_percentage_24h_usd, capCurve: thin(capCurve, 42),
    dom: domNow, domChg: domChg24, domCurve: thin(domCurve, 42),
    vol: g.total_volume.usd,
    coins: coins.map(c => ({ sym: c.symbol.toUpperCase(), id: c.id, price: c.current_price, chg: c.price_change_percentage_24h, spark: thin(c.sparkline_in_7d.price.slice(-48), 24) })),
    fng: { now: f[0], label: fngLabel(f[0]), yesterday: f[1], week: f[7], month: f[30] },
    events: todaysEvents(cal),
  };
}

const TITLE_RU = [
  [/^CPI m\/m/i, 'Инфляция CPI м/м'], [/^CPI y\/y/i, 'Инфляция CPI г/г'], [/^Core CPI/i, 'Базовая инфляция CPI'],
  [/^PPI/i, 'Цены производителей PPI'], [/^Core PPI/i, 'Базовый PPI'], [/Core PCE/i, 'Базовый PCE'],
  [/Non-Farm Employment Change/i, 'Занятость вне с/х (NFP)'], [/Unemployment Rate/i, 'Уровень безработицы'],
  [/Unemployment Claims/i, 'Заявки на пособие по безработице'], [/Federal Funds Rate/i, 'Решение ФРС по ставке'],
  [/FOMC Statement/i, 'Заявление FOMC'], [/FOMC Press Conference/i, 'Пресс-конференция ФРС'], [/FOMC Meeting Minutes/i, 'Протокол FOMC'],
  [/Advance GDP|GDP q\/q/i, 'ВВП США'], [/Retail Sales/i, 'Розничные продажи'], [/ISM Manufacturing PMI/i, 'ISM в промышленности'],
  [/ISM Services PMI/i, 'ISM в услугах'], [/JOLTS/i, 'Вакансии JOLTS'], [/Prelim UoM Consumer Sentiment/i, 'Потребдоверие Мичигана'],
  [/Fed Chair .* Speaks/i, 'Выступление главы ФРС'], [/ADP Non-Farm/i, 'Занятость ADP'], [/Treasury Currency Report/i, 'Отчёт Минфина по валютам'],
];
function todaysEvents(cal) {
  const today = kyivDate(new Date());
  return (cal || [])
    .filter(e => e.country === 'USD' && (e.impact === 'High' || e.impact === 'Medium'))
    .filter(e => kyivDate(new Date(e.date)) === today)
    .map(e => {
      const ru = TITLE_RU.find(([re]) => re.test(e.title));
      const t = new Date(e.date).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' });
      const fc = e.forecast ? ` — прогноз ${e.forecast}` : '';
      return { time: t, title: (ru ? ru[1] : e.title) + fc, high: e.impact === 'High' };
    })
    .sort((a, b) => b.high - a.high || a.time.localeCompare(b.time))
    .slice(0, 4)
    .sort((a, b) => a.time.localeCompare(b.time));
}

// ---------- ETF ----------
async function etf() {
  const d = await getJSON('https://www.tftc.io/bitcoin-etf-flows/latest.json');
  const sessions = [...d.recentSessions].sort((a, b) => a.date.localeCompare(b.date));
  const per = Object.entries(d.latestSession.perEtfUsd || {}).filter(([, v]) => Math.abs(v) >= 1e6)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6);
  return {
    date: d.latestSession.date,
    sessions: sessions.map(s => ({ date: s.date, m: s.netFlowUsd / 1e6 })),
    last: d.latestSession.netFlowUsd / 1e6,
    week: sessions.reduce((s, x) => s + x.netFlowUsd, 0) / 1e6,
    perFund: per.map(([k, v]) => ({ fund: k, m: v / 1e6 })),
    aum: d.latestSession.totalNetAssetsUsd, btc: d.latestSession.btcCloseUsd,
    cumulative: d.cumulativeNetFlowUsd,
  };
}

// ---------- DERIVATIVES (funding, OI, liquidation-proxy) ----------
async function deriv() {
  const [tickers, coins] = await Promise.all([
    getJSON(`${CG}/derivatives`),
    getJSON(`${CG}/coins/markets?vs_currency=usd&ids=${TOP.join(',')}&price_change_percentage=24h`),
  ]);
  const syms = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];
  const major = /binance|bybit|okx|bitget|hyperliquid|gate|deribit|coinbase/i;
  const rows = syms.map(s => {
    const t = tickers.filter(x => x.contract_type === 'perpetual' && major.test(x.market) &&
      (x.index_id === s || x.symbol?.toUpperCase().startsWith(s)) && /USDT|USD|USDC/i.test(x.symbol || '') && x.open_interest > 1e6);
    const oi = t.reduce((a, x) => a + x.open_interest, 0);
    const fr = oi ? t.reduce((a, x) => a + (x.funding_rate || 0) * x.open_interest, 0) / oi : 0;
    const c = coins.find(c => c.symbol.toUpperCase() === s);
    return { sym: s, oi, funding: fr, chg: c?.price_change_percentage_24h ?? 0, price: c?.current_price };
  });
  return { rows, totalOI: rows.reduce((a, r) => a + r.oi, 0) };
}

// ---------- WEEKLY ----------
async function weekly() {
  const [mk, stable, btcChart] = await Promise.all([
    getJSON(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=7d`),
    getJSON('https://stablecoins.llama.fi/stablecoincharts/all').catch(() => null),
    getJSON(`${CG}/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily`),
  ]);
  const stables = /usd|dai|tusd|fdusd|pyusd|usde|eurc|xaut|paxg|_|^w?steth$|^weth$|^wbtc$|^cbbtc$|bsc-usd|buidl|ousg|usyc/i;
  const pool = mk.filter(c => !stables.test(c.symbol) && c.price_change_percentage_7d_in_currency != null);
  const by = [...pool].sort((a, b) => b.price_change_percentage_7d_in_currency - a.price_change_percentage_7d_in_currency);
  let st = null;
  if (stable?.length) {
    const v = stable.map(x => +x.totalCirculatingUSD.peggedUSD);
    st = { now: v.at(-1), d7: v.at(-1) - v.at(-8), d30: v.at(-1) - v.at(-31) };
  }
  const p = btcChart.prices.map(x => x[1]);
  const pick = c => ({ sym: c.symbol.toUpperCase(), name: c.name, price: c.current_price, chg: c.price_change_percentage_7d_in_currency });
  return {
    gainers: by.slice(0, 5).map(pick), losers: by.slice(-5).reverse().map(pick),
    btc: { open: p[0], close: p.at(-1), hi: Math.max(...p), lo: Math.min(...p), chg: (p.at(-1) / p[0] - 1) * 100, curve: p },
    eth: pick(mk.find(c => c.id === 'ethereum')),
    stable: st,
  };
}

function thin(a, n) { if (a.length <= n) return a; const s = (a.length - 1) / (n - 1); return Array.from({ length: n }, (_, i) => a[Math.round(i * s)]); }
function fngLabel(v) { return v < 25 ? 'ЭКСТРЕМАЛЬНЫЙ СТРАХ' : v < 45 ? 'СТРАХ' : v <= 55 ? 'НЕЙТРАЛЬНО' : v <= 75 ? 'ЖАДНОСТЬ' : 'ЭКСТРЕМАЛЬНАЯ ЖАДНОСТЬ'; }
function kyivDate(d) { return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' }); }

module.exports = { daily, etf, deriv, weekly, fngLabel };
