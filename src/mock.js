// Sample data for local preview (node src/render.js all --mock)
const walk = (n, start, drift, vol, seed = 1) => { let s = seed, v = start; return Array.from({ length: n }, () => { s = (s * 9301 + 49297) % 233280; v += (s / 233280 - .5) * vol + drift; return v; }); };
module.exports = {
  daily: {
    cap: 2.64e12, capChg: 1.2, capCurve: walk(42, 2.55e12, 2e9, 2e10, 3),
    dom: 59.7, domChg: -0.18, domCurve: walk(42, 60.2, -0.015, 0.12, 5), vol: 61.3e9,
    coins: [
      { sym: 'BTC', price: 73696, chg: 1.8, spark: walk(24, 72000, 70, 500, 11) },
      { sym: 'ETH', price: 2984, chg: 2.4, spark: walk(24, 2900, 4, 25, 13) },
      { sym: 'SOL', price: 138.6, chg: -0.9, spark: walk(24, 140, -0.1, 1.2, 17) },
      { sym: 'BNB', price: 712, chg: 0.7, spark: walk(24, 705, 0.3, 4, 19) },
      { sym: 'XRP', price: 1.25, chg: -0.2, spark: walk(24, 1.26, 0, 0.01, 23) },
    ],
    fng: { now: 24, label: 'ЭКСТРЕМАЛЬНЫЙ СТРАХ', yesterday: 19, week: 38, month: 61 },
    events: [{ time: '15:30', title: 'Инфляция CPI г/г — прогноз 2,9%', high: true }, { time: '15:30', title: 'Заявки на пособие по безработице', high: false }, { time: '17:00', title: 'Выступление главы ФРС', high: true }],
  },
  etf: {
    date: '2026-11-10', last: -95.0, week: -304.2, aum: 92.8e9, btc: 73696, cumulative: 55.4e9,
    sessions: [{ date: '2026-11-04', m: 312.4 }, { date: '2026-11-05', m: -148.1 }, { date: '2026-11-06', m: -171.4 }, { date: '2026-11-09', m: -201.1 }, { date: '2026-11-10', m: -95.0 }],
    perFund: [{ fund: 'IBIT', m: -78.2 }, { fund: 'FBTC', m: -36.8 }, { fund: 'MSBT', m: 20.0 }],
  },
  deriv: {
    totalOI: 71.4e9,
    rows: [
      { sym: 'BTC', price: 73696, chg: 1.8, oi: 41.2e9, funding: 0.0071 },
      { sym: 'ETH', price: 2984, chg: 2.4, oi: 18.9e9, funding: 0.0102 },
      { sym: 'SOL', price: 138.6, chg: -0.9, oi: 5.6e9, funding: -0.0064 },
      { sym: 'XRP', price: 1.25, chg: -0.2, oi: 3.4e9, funding: 0.0038 },
      { sym: 'BNB', price: 712, chg: 0.7, oi: 2.3e9, funding: 0.0015 },
    ],
  },
  weekly: {
    gainers: [{ sym: 'HYPE', chg: 24.6 }, { sym: 'ZEC', chg: 18.2 }, { sym: 'TAO', chg: 12.9 }, { sym: 'SUI', chg: 9.4 }, { sym: 'AAVE', chg: 7.1 }],
    losers: [{ sym: 'PEPE', chg: -21.3 }, { sym: 'WIF', chg: -17.8 }, { sym: 'ENA', chg: -14.2 }, { sym: 'APT', chg: -12.6 }, { sym: 'ARB', chg: -10.9 }],
    btc: { open: 78100, close: 73696, hi: 79420, lo: 71850, chg: -5.6 }, eth: { price: 2984, chg: -3.1 },
    stable: { now: 312.4e9, d7: 1.8e9, d30: 6.2e9 },
  },
};
