const path = require('path');
const A = p => 'file://' + path.join(__dirname, '..', 'assets', p);

// ---------- formatting ----------
const nb = ' ';
const grp = (n, d = 0) => n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ | /g, ' ');
function price(v) { return '$' + (v >= 100 ? grp(Math.round(v)) : v >= 10 ? grp(v, 1) : grp(v, 2)); }
function big(v) { return v >= 1e12 ? `$${grp(v / 1e12, 2)} трлн` : v >= 1e9 ? `$${grp(v / 1e9, 1)} млрд` : `$${grp(v / 1e6, 0)} млн`; }
function pct(v, d = 1) { return grp(Math.abs(v), d) + '%'; }
function chg(v, suffix = '%', d = 1) { if (suffix === '%' && Math.abs(v) < 0.1 && v !== 0) d = 2; const up = v >= 0; return `<span class="chg ${up ? 'up' : 'dn'}">${up ? '▲' : '▼'} ${grp(Math.abs(v), d)}${suffix}</span>`; }
function signedM(v) { return (v >= 0 ? '+' : '−') + grp(Math.abs(v), Math.abs(v) < 10 ? 1 : 0); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const DOW = ['ВОСКРЕСЕНЬЕ', 'ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА'];
const MON = ['ЯНВАРЯ', 'ФЕВРАЛЯ', 'МАРТА', 'АПРЕЛЯ', 'МАЯ', 'ИЮНЯ', 'ИЮЛЯ', 'АВГУСТА', 'СЕНТЯБРЯ', 'ОКТЯБРЯ', 'НОЯБРЯ', 'ДЕКАБРЯ'];
function kyivParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { day: +p.day, mon: +p.month - 1, year: +p.year, wd, hour: +p.hour };
}
function dateRu(iso) { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MON[m - 1].toLowerCase()}`; }
function dShort(iso) { const [, m, d] = iso.split('-'); const wd = new Date(iso + 'T12:00:00Z').getUTCDay(); return `${['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][wd]} ${d}.${m}`; }

// ---------- svg helpers ----------
function spark(vals, w, h, up, id) {
  if (!vals || vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals), k = mx - mn || 1;
  const xy = vals.map((v, i) => [3 + i * (w - 6) / (vals.length - 1), h - 4 - (v - mn) / k * (h - 10)]);
  const c = up ? '#2FD27A' : '#FF4D4F';
  const d = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const L = xy.at(-1);
  return `<svg width="${w}" height="${h}"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><path d="${d} L${w - 3} ${h} L3 ${h} Z" fill="url(#g${id})"/><path d="${d}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${L[0]}" cy="${L[1]}" r="3.5" fill="${c}"/></svg>`;
}
function gauge(val) {
  const cx = 165, cy = 172, R = 140;
  const seg = [['#FF4D4F', 0, 25], ['#FF8A3D', 25, 45], ['#9A958C', 45, 55], ['#9BD35A', 55, 75], ['#2FD27A', 75, 100]];
  const pt = (v, r) => { const a = Math.PI * (1 - v / 100); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  let s = '';
  seg.forEach(([c, a, b]) => { const p1 = pt(a + .8, R), p2 = pt(b - .8, R); s += `<path d="M${p1} A${R} ${R} 0 0 1 ${p2}" stroke="${c}" stroke-width="22" fill="none" stroke-linecap="round" opacity="${val >= a && (val < b || b === 100) ? 1 : .35}"/>`; });
  const n = pt(val, R);
  return `<svg width="330" height="190" viewBox="0 0 330 190" style="margin-top:18px">${s}<circle cx="${n[0]}" cy="${n[1]}" r="15" fill="#0A0A0D" stroke="#F3F1EC" stroke-width="5"/></svg>`;
}
function niceStep(range, ticks = 5) { const raw = range / ticks, p = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw); }
// vertical diverging bars (ETF)
function vbars(items, W, H) {
  const pad = { l: 90, r: 20, t: 46, b: 56 };
  const vals = items.map(i => i.v), mx = Math.max(0, ...vals), mn = Math.min(0, ...vals);
  const step = niceStep((mx - mn) || 1);
  const top = Math.ceil(mx / step) * step + step * .5, bot = Math.floor(mn / step) * step - (mn < 0 ? step * .5 : 0);
  const y = v => pad.t + (top - v) / (top - bot) * (H - pad.t - pad.b);
  const bw = Math.min(150, (W - pad.l - pad.r) / items.length * .56), slot = (W - pad.l - pad.r) / items.length;
  let s = '';
  for (let t = Math.ceil(bot / step) * step; t <= top; t += step) s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="${t === 0 ? '#5A544A' : '#2A2620'}" stroke-width="${t === 0 ? 1.5 : 1}"/><text x="${pad.l - 14}" y="${y(t) + 6}" text-anchor="end" class="ax">${t === 0 ? '0' : (t > 0 ? '+' : '−') + grp(Math.abs(t))}</text>`;
  items.forEach((it, i) => {
    const cx = pad.l + slot * (i + .5), y0 = y(0), y1 = y(it.v), up = it.v >= 0;
    const h = Math.max(3, Math.abs(y1 - y0));
    s += `<rect x="${cx - bw / 2}" y="${up ? y0 - h : y0}" width="${bw}" height="${h}" rx="6" fill="${up ? '#2FD27A' : '#FF4D4F'}"/>`;
    s += `<text x="${cx}" y="${up ? y0 - h - 14 : y0 + h + 32}" text-anchor="middle" class="val">${it.label}</text>`;
    s += `<text x="${cx}" y="${H - 14}" text-anchor="middle" class="cat">${it.cat}</text>`;
  });
  return `<svg width="${W}" height="${H}">${s}</svg>`;
}
// horizontal bars with signed values (weekly movers, funding)
function hbars(items, W, rowH, color) {
  const lab = 150, valW = 140, mx = Math.max(...items.map(i => Math.abs(i.v))) || 1;
  let s = '';
  items.forEach((it, i) => {
    const y = i * rowH, w = Math.max(4, Math.abs(it.v) / mx * (W - lab - valW));
    s += `<text x="0" y="${y + rowH / 2 + 7}" class="cat2">${esc(it.cat)}</text><rect x="${lab}" y="${y + rowH * .2}" width="${w}" height="${rowH * .6}" rx="6" fill="${color || (it.v >= 0 ? '#2FD27A' : '#FF4D4F')}"/><text x="${lab + w + 14}" y="${y + rowH / 2 + 8}" class="val">${it.label}</text>`;
  });
  return `<svg width="${W}" height="${items.length * rowH}">${s}</svg>`;
}

// ---------- shared shell ----------
const CSS = `
@font-face{font-family:F;src:url(${A('fonts/Inter-Regular.otf')});font-weight:400}
@font-face{font-family:F;src:url(${A('fonts/Inter-SemiBold.otf')});font-weight:600}
@font-face{font-family:F;src:url(${A('fonts/Inter-Bold.otf')});font-weight:700}
@font-face{font-family:F;src:url(${A('fonts/Inter-ExtraBold.otf')});font-weight:800}
@font-face{font-family:F;src:url(${A('fonts/Inter-Black.otf')});font-weight:900}
:root{--bg:#0A0A0D;--line:#2A2620;--ink:#F3F1EC;--muted:#9A958C;--or:#F7A600;--or2:#FFCF5C;--gr:#2FD27A;--rd:#FF4D4F}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);font-family:F,sans-serif;color:var(--ink)}
.page{position:relative;overflow:hidden;background:radial-gradient(900px 500px at 85% -10%,rgba(247,166,0,.22),transparent 60%),radial-gradient(700px 500px at -10% 110%,rgba(247,120,0,.16),transparent 60%),var(--bg)}
.hdr{display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:16px}
.brand img{width:74px;height:62px;border-radius:14px;object-fit:cover;box-shadow:0 0 24px rgba(247,166,0,.35)}
.brand b{font-size:38px;font-weight:800;letter-spacing:-.5px}.brand b span{color:var(--or)}
.brand small{display:block;font-size:14px;letter-spacing:4px;color:var(--muted);font-weight:600;margin-top:2px}
.pill{border:1.5px solid rgba(247,166,0,.55);border-radius:16px;padding:12px 20px;text-align:right;background:rgba(20,19,24,.8)}
.pill b{display:block;font-size:24px;font-weight:800}.pill span{font-size:16px;color:var(--or);font-weight:700;letter-spacing:1px}
.card{background:linear-gradient(180deg,#17161B,#111014);border:1.5px solid var(--line);border-radius:22px}
.lbl{font-size:15px;letter-spacing:1.5px;color:var(--muted);font-weight:700;text-transform:uppercase}
.up{color:var(--gr)}.dn{color:var(--rd)}
.chg{display:inline-flex;align-items:center;gap:6px;font-weight:800;border-radius:10px;padding:5px 10px;font-size:18px;white-space:nowrap}
.chg.up{background:rgba(47,210,122,.13)}.chg.dn{background:rgba(255,77,79,.13)}
.foot{display:flex;justify-content:space-between;color:var(--muted);font-size:15px;font-weight:600}.foot b{color:var(--or)}
.wide{width:1280px;height:720px;padding:40px 48px}
.ttl{margin-top:26px;display:flex;align-items:flex-end;justify-content:space-between;gap:20px}
.ttl h1{font-size:42px;font-weight:900;letter-spacing:-.5px;line-height:1.05}.ttl p{font-size:19px;color:var(--muted);margin-top:8px;font-weight:600}
.sum{display:flex;gap:14px}.sum .card{padding:12px 18px;text-align:right}.sum b{font-size:30px;font-weight:900;display:block;white-space:nowrap}
.leg{display:flex;gap:22px;font-size:17px;font-weight:700;color:var(--muted)}.leg i{display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:8px;vertical-align:-1px}
.wfoot{position:absolute;left:48px;right:48px;bottom:26px}
svg text{font-family:F}.ax{fill:#9A958C;font-size:16px;font-weight:600}.val{fill:#F3F1EC;font-size:22px;font-weight:800}.cat{fill:#F3F1EC;font-size:18px;font-weight:600}.cat2{fill:#F3F1EC;font-size:21px;font-weight:700}
`;
const brand = `<div class="brand"><img src="${A('icon.png')}"><div><b>Crypto <span>Filin</span></b><small>РЫНОК · АНАЛИЗ · ПРОФИТ</small></div></div>`;
const doc = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${extra}</style></head><body>${body}</body></html>`;

// ---------- DAILY ----------
const COIN = { BTC: ['#F7931A', '₿', 'Bitcoin'], ETH: ['#8EA2FF', 'Ξ', 'Ethereum'], SOL: ['linear-gradient(135deg,#9945FF,#14F195)', 'S', 'Solana'], BNB: ['#F3BA2F', 'B', 'BNB'], XRP: ['#E6E6E6', 'X', 'XRP'] };
const ICON = {
  globe: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#F3F1EC" stroke-width="1.6"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c3 3.2 3 15.8 0 19M12 2.5c-3 3.2-3 15.8 0 19M4.5 7h15M4.5 17h15"/></svg>',
  bars: '<svg viewBox="0 0 24 24" width="30" height="30" fill="#F3F1EC"><rect x="3" y="13" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>',
  cal: '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#F3F1EC" stroke-width="1.7"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><g fill="#F3F1EC" stroke="none"><rect x="6.5" y="12" width="3" height="2.4" rx=".5"/><rect x="10.5" y="12" width="3" height="2.4" rx=".5"/><rect x="14.5" y="12" width="3" height="2.4" rx=".5"/><rect x="6.5" y="16" width="3" height="2.4" rx=".5"/><rect x="10.5" y="16" width="3" height="2.4" rx=".5"/></g></svg>',
  news: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#F3F1EC" stroke-width="1.7"><rect x="5" y="4" width="16" height="16" rx="1.5"/><path d="M5 8H3v10a2 2 0 0 0 2 2M8 8h10M8 12h4M8 16h4M14 12h4v4h-4z"/></svg>',
};
const CC = { BTC: ['#F7931A', '₿'], ETH: ['#627EEA', 'Ξ'], SOL: ['#14F1C5', '≡'], BNB: ['#F3BA2F', '◆'], XRP: ['#E9E9E9', '✕'] };
function dailyOwl(d, slot = 'УТРО') {
  const k = kyivParts();
  const dd = String(k.day).padStart(2, '0');
  const sgn = (v, dec = 2) => `${v >= 0 ? '+' : '−'}${grp(Math.abs(v), dec)}%`;
  const T = [[20, 260], [270, 508], [520, 744], [755, 992], [1003, 1236]];
  const PL = [[40, 240], [290, 490], [538, 725], [775, 973], [1022, 1217]];
  const GL = ['247,147,26', '47,128,237', '20,200,190', '243,186,47', '210,210,215'];
  const coins = d.coins.slice(0, 5).map((c, i) => { const up = c.chg >= 0;
    return `<div class="gl" style="left:${T[i][0] + 5}px;width:${T[i][1] - T[i][0] - 10}px;--g:${GL[i]}"></div><div class="cp" style="left:${T[i][0]}px;width:${T[i][1] - T[i][0]}px">${price(c.price)}</div>
<div class="pl ${up ? 'u' : 'd'}" style="left:${PL[i][0]}px;width:${PL[i][1] - PL[i][0]}px">${up ? '▲' : '▼'} ${sgn(c.chg)}</div>`; }).join('');
  const fl = v => v < 25 ? 'СИЛЬНЫЙ СТРАХ' : v < 45 ? 'СТРАХ' : v <= 55 ? 'НЕЙТРАЛЬНО' : v <= 75 ? 'ЖАДНОСТЬ' : 'СИЛЬНАЯ ЖАДНОСТЬ';
  const fcol = d.fng.now < 45 ? '#FF4D4F' : d.fng.now > 55 ? '#2FE07A' : '#F3F1EC';
  const cx = 879, cy = 675, R = 121, ang = Math.PI * (1 - Math.max(2, Math.min(98, d.fng.now)) / 100);
  const kx = cx + R * Math.cos(ang), ky = cy - R * Math.sin(ang);
  const ev = (d.events || []).slice(0, 3).map(e => `${d.eventsTomorrow ? 'Завтра' : 'Сегодня'} ${e.time} Киев — ${e.title}`);
  const news = d.news || [];
  const rows = [...news.slice(0, 2), ...ev, ...news.slice(2)].slice(0, 5);
  if (!ev.length && rows.length < 5) rows.push(`Важной статистики США ${d.eventsTomorrow ? 'завтра' : 'сегодня'} нет`);
  const BY = [815, 888, 958, 1025, 1092];
  const list = BY.map((y, i) => rows[i] ? `<div class="nr" style="top:${y - 36}px">${esc(rows[i])}</div>` : `<div class="hide" style="top:${y - 14}px"></div>`).join('');
  const capUp = d.capChg >= 0;
  return doc(`<div id="card" class="ow">
 <div class="dt"><b>${dd} ${MON[k.mon]} ${k.year}</b><span>${DOW[k.wd]} · ${slot}</span></div>
 <div class="kv" style="left:46px">${big(d.cap).replace(' трлн', 'T').replace(' млрд', 'B')}</div>
 <div class="kv" style="left:466px">${grp(d.dom, 1)}%</div>
 <div class="kv ${capUp ? 'up' : 'dn'}" style="left:866px">${sgn(d.capChg)}</div>
 ${coins}
 <svg class="kn" width="1254" height="1254"><circle cx="${kx}" cy="${ky}" r="14" fill="#2b2b2b" stroke="#F3F1EC" stroke-width="4"/></svg>
 <div class="gv"><b>${d.fng.now}</b><small>/100</small><i style="color:${fcol}">${fl(d.fng.now)}</i></div>
 ${list}
 <div class="src">Данные: CoinGecko · ${dd}.${String(k.mon + 1).padStart(2, '0')}.${k.year}, ${String(k.hour).padStart(2, '0')}:00 Киев <i>•</i> @Filin1Radar</div>
</div>`, `
@font-face{font-family:MS;src:url(${A('fonts/MS-cyr-800.woff2')});font-weight:800;unicode-range:U+0400-04FF}
@font-face{font-family:MS;src:url(${A('fonts/MS-lat-800.woff2')});font-weight:800}
@font-face{font-family:MS;src:url(${A('fonts/MS-cyr-700.woff2')});font-weight:700;unicode-range:U+0400-04FF}
@font-face{font-family:MS;src:url(${A('fonts/MS-lat-700.woff2')});font-weight:700}
@font-face{font-family:RC;src:url(${A('fonts/RC-cyr-500.woff2')});font-weight:500;unicode-range:U+0400-04FF}
@font-face{font-family:RC;src:url(${A('fonts/RC-lat-500.woff2')});font-weight:500}
@font-face{font-family:RC;src:url(${A('fonts/RC-cyr-700.woff2')});font-weight:700;unicode-range:U+0400-04FF}
@font-face{font-family:RC;src:url(${A('fonts/RC-lat-700.woff2')});font-weight:700}
@font-face{font-family:RC;src:url(${A('fonts/RC-cyr-800.woff2')});font-weight:800;unicode-range:U+0400-04FF}
@font-face{font-family:RC;src:url(${A('fonts/RC-lat-800.woff2')});font-weight:800}
@font-face{font-family:RC;src:url(${A('fonts/RC-cyr-900.woff2')});font-weight:900;unicode-range:U+0400-04FF}
@font-face{font-family:RC;src:url(${A('fonts/RC-lat-900.woff2')});font-weight:900}
.ow{position:relative;width:1254px;height:1254px;background:url(${A('daily-owl-base.jpg')}) 0 0/1254px 1254px;font-family:RC,sans-serif;color:#fff}
.ow>*{position:absolute}
.dt{left:768px;top:50px}.dt b{display:block;font-size:40px;font-weight:800;line-height:1.05}.dt span{display:block;font-size:37px;font-weight:900;color:#F7A600;line-height:1.08}
.kv{top:226px;font-family:MS;font-size:76px;font-weight:800;letter-spacing:-2px;line-height:1;text-shadow:0 3px 10px rgba(0,0,0,.65);white-space:nowrap}.kv.dn{color:#FF3B30}.kv.up{color:#2FE07A}
.cp{top:398px;text-align:center;font-family:MS;font-size:40px;font-weight:800;letter-spacing:-1.5px;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.pl{top:458px;height:47px;line-height:43px;text-align:center;font-family:MS;font-size:27px;font-weight:800;letter-spacing:-.5px;border-radius:9px;border:2.5px solid;box-sizing:border-box}
.pl.d{color:#FF5A5A;border-color:#E53935;background:linear-gradient(180deg,rgba(150,18,22,.95),rgba(70,6,8,.95));box-shadow:0 0 14px rgba(255,50,50,.45),inset 0 0 12px rgba(255,80,80,.35)}.pl.u{color:#45F590;border-color:#25B864;background:linear-gradient(180deg,rgba(18,120,58,.95),rgba(6,58,26,.95));box-shadow:0 0 14px rgba(50,230,120,.4),inset 0 0 12px rgba(80,255,150,.3)}
.kn{left:0;top:0}
.gl{top:350px;height:163px;border-radius:0 0 15px 15px;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 38%);background:radial-gradient(ellipse 75% 70% at 50% 50%,rgba(var(--g),.42),rgba(var(--g),.16) 55%,rgba(var(--g),0) 85%),linear-gradient(180deg,rgba(var(--g),0),rgba(var(--g),.22) 70%,rgba(var(--g),.32));mix-blend-mode:screen}
.gv{left:${cx - 100}px;width:200px;top:${cy - 92}px;text-align:center}.gv b{font-family:MS;font-size:54px;font-weight:800;letter-spacing:-1px;line-height:1}.gv small{font-size:26px;font-weight:800;color:#ddd}
.gv i{display:block;font-style:normal;font-size:23px;font-weight:900;margin-top:4px}
.nr{left:797px;width:420px;height:72px;display:flex;align-items:center;font-size:25px;font-weight:500;line-height:1.14;color:#F3F1EC}
.hide{left:757px;width:30px;height:30px;border-radius:50%;background:#0c0c0e}
.src{right:24px;top:1216px;font-size:20px;font-weight:700;color:#E8E2D6;text-shadow:0 1px 4px #000,0 0 8px #000}.src i{color:#F7A600;font-style:normal;margin:0 6px}`);
}

// morning: illustrated owl card; evening: classic dark card (alternating looks)
function daily(d, slot = 'УТРО') { return /ВЕЧЕР/i.test(slot) ? dailyClassic(d, slot) : dailyOwl(d, slot); }

function dailyClassic(d, slot = 'УТРО') {
  const k = kyivParts();
  const ev = d.events.length ? d.events.map(e => `<div class="e"><div class="t">${e.time}</div><div>${esc(e.title)}</div><div class="imp ${e.high ? 'h' : ''}">● ${e.high ? 'ВАЖНО' : 'СРЕДНЕ'}</div></div>`).join('')
    : `<div class="e"><div class="t">—</div><div style="color:var(--muted)">Важной макростатистики США ${d.eventsTomorrow ? 'завтра' : 'сегодня'} нет</div><div></div></div>`;
  const rows = d.coins.map((c, i) => { const [bg, g, name] = COIN[c.sym] || ['#888', c.sym[0], c.sym]; return `<div class="row"><div class="coin" style="background:${bg}">${g}</div><div class="n"><b>${name}</b><small>${c.sym}</small></div><div class="p">${price(c.price)}</div><div>${chg(c.chg)}</div>${spark(c.spark, 96, 40, c.chg >= 0, 'c' + i)}</div>`; }).join('');
  const fc = v => v < 45 ? 'dn' : v > 55 ? 'up' : '';
  return doc(`<div id="card" class="page" style="width:1080px;padding:48px">
 <div class="hdr">${brand}<div class="pill"><b>${k.day} ${MON[k.mon]} ${k.year}</b><span>${DOW[k.wd]} · ${slot}</span></div></div>
 <div class="kpis">
  <div class="card kpi"><div class="lbl">Капитализация</div><div class="v">${big(d.cap)}</div>${chg(d.capChg)}${spark(d.capCurve, 270, 46, d.capChg >= 0, 'k1')}</div>
  <div class="card kpi"><div class="lbl">Доминация BTC</div><div class="v">${grp(d.dom, 1)}%</div>${chg(d.domChg, ' п.п.', 2)}${spark(d.domCurve, 270, 46, d.domChg >= 0, 'k2')}</div>
  <div class="card kpi"><div class="lbl">Объём за 24 ч</div><div class="v">${big(d.vol)}</div><span class="chg" style="background:rgba(247,166,0,.12);color:var(--or2)">${grp(d.vol / d.cap * 100, 1)}% от капитализации</span><div class="vnote">оборот спота и деривативов по данным CoinGecko</div></div>
 </div>
 <div class="mid">
  <div class="card coins">${rows}</div>
  <div class="card fg"><div class="lbl" style="align-self:flex-start">Страх и жадность</div>${gauge(d.fng.now)}<div class="big">${d.fng.now}</div><div class="st ${fc(d.fng.now)}">${d.fng.label}</div>
   <div class="hist"><div><b class="${fc(d.fng.yesterday)}">${d.fng.yesterday}</b><small>вчера</small></div><div><b class="${fc(d.fng.week)}">${d.fng.week}</b><small>неделя</small></div><div><b class="${fc(d.fng.month)}">${d.fng.month}</b><small>месяц</small></div></div></div>
 </div>
 <div class="card ev"><h3><i></i>${d.eventsTomorrow ? 'Завтра на радаре' : 'Сегодня на радаре'}</h3>${ev}</div>
 <div class="foot" style="margin-top:22px"><span>Данные: CoinGecko · alternative.me · ForexFactory</span><span><b>@Filin1Radar</b></span></div>
</div>`, `
.kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:34px}.kpi{padding:22px 24px}
.kpi .v{font-size:42px;font-weight:800;margin:10px 0 8px;letter-spacing:-1px;white-space:nowrap}.kpi svg{display:block;margin-top:10px}.vnote{font-size:15px;color:var(--muted);font-weight:600;margin-top:14px;line-height:1.35}
.mid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:18px;margin-top:18px}.coins{padding:10px 24px}
.row{display:grid;grid-template-columns:52px minmax(0,1fr) 128px 104px 96px;align-items:center;gap:12px;height:76px;border-bottom:1px solid var(--line)}.row:last-child{border:0}
.coin{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:20px;color:#111}
.row .n b{font-size:22px;font-weight:800;display:block}.row .n small{color:var(--muted);font-size:14px}.row .p{font-size:23px;font-weight:800;text-align:right;white-space:nowrap}
.fg{padding:24px;display:flex;flex-direction:column;align-items:center}.fg .big{font-size:76px;font-weight:900;margin-top:-62px;line-height:1}
.fg .st{font-size:19px;font-weight:800;margin-top:6px;letter-spacing:1px;text-align:center}
.fg .hist{display:flex;gap:10px;margin-top:18px;width:100%}.fg .hist div{flex:1;text-align:center;background:#0E0D11;border:1px solid var(--line);border-radius:12px;padding:10px 4px}
.fg .hist b{display:block;font-size:22px}.fg .hist small{font-size:13px;color:var(--muted)}
.ev{margin-top:18px;padding:22px 26px}.ev h3{font-size:22px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:10px}
.ev h3 i{width:10px;height:22px;background:var(--or);border-radius:3px;display:inline-block}
.e{display:grid;grid-template-columns:96px 1fr auto;gap:16px;align-items:center;padding:13px 0;border-top:1px solid var(--line);font-size:20px;font-weight:600}
.t{background:rgba(247,166,0,.14);color:var(--or2);border-radius:10px;text-align:center;padding:7px 0;font-weight:800;font-size:17px}
.imp{font-size:14px;color:var(--muted);font-weight:700;letter-spacing:1px}.imp.h{color:var(--rd)}`);
}

// ---------- ETF ----------
function etf(d) {
  const items = d.sessions.map(s => ({ v: s.m, label: signedM(s.m), cat: dShort(s.date) }));
  const lead = [...d.perFund].sort((a, b) => b.m - a.m)[0];
  const funds = d.perFund.map(f => `<span class="${f.m >= 0 ? 'up' : 'dn'}">${f.fund} ${signedM(f.m)}</span>`).join('<i>·</i>');
  return doc(`<div id="card" class="page wide">
 <div class="hdr">${brand}<div class="leg"><span><i style="background:var(--gr)"></i>Приток</span><span><i style="background:var(--rd)"></i>Отток</span></div></div>
 <div class="ttl"><div><h1>ПОТОКИ В BITCOIN-ETF</h1><p>Чистый приток и отток за 5 торговых дней, млн $</p></div>
  <div class="sum"><div class="card"><div class="lbl">За ${dateRu(d.date)}</div><b class="${d.last >= 0 ? 'up' : 'dn'}">${signedM(d.last)} млн $</b></div><div class="card"><div class="lbl">За 5 дней</div><b class="${d.week >= 0 ? 'up' : 'dn'}">${signedM(d.week)} млн $</b></div></div></div>
 ${vbars(items, 1184, 420)}
 <div class="funds">${funds ? 'По фондам за ' + dateRu(d.date) + ': ' + funds : ''}</div>
 <div class="foot wfoot"><span>Данные: TFTC / SoSoValue · активы ETF ${big(d.aum)}</span><span><b>@Filin1Radar</b></span></div>
</div>`, `.funds{font-size:18px;font-weight:700;color:var(--muted);margin-top:4px}.funds span{margin:0 4px}.funds i{color:#5A544A;font-style:normal}`);
}

// ---------- DERIVATIVES ----------
function deriv(d) {
  const rows = d.rows.map(r => {
    const f8 = r.funding; // CoinGecko funding_rate is in % per funding interval
    const fc = f8 > 0.03 ? 'dn' : f8 < 0 ? 'up' : '';
    const bar = Math.min(100, Math.abs(f8) / 0.02 * 100);
    return `<div class="dr"><div class="s">${r.sym}</div><div class="p">${r.price ? price(r.price) : ''}</div><div>${chg(r.chg)}</div><div class="oi">${big(r.oi)}</div>
    <div class="fb"><div class="track"><div class="mid"></div><div class="fill ${f8 >= 0 ? 'pos' : 'neg'}" style="${f8 >= 0 ? 'left:50%' : 'right:50%'};width:${bar / 2}%"></div></div><b class="${fc}">${f8 >= 0 ? '+' : '−'}${grp(Math.abs(f8), 4)}%</b></div></div>`;
  }).join('');
  const avg = d.rows[0].funding;
  const mood = avg > 0.03 ? 'Перегрев лонгов: фандинг высокий' : avg > 0 ? 'Фандинг умеренно положительный: лонги платят шортам' : 'Фандинг отрицательный: рынок перекошен в шорты';
  return doc(`<div id="card" class="page wide">
 <div class="hdr">${brand}<div class="leg"><span><i style="background:var(--gr)"></i>Шорты платят</span><span><i style="background:var(--or)"></i>Лонги платят</span></div></div>
 <div class="ttl"><div><h1>ОТКРЫТЫЙ ИНТЕРЕС И ФАНДИНГ</h1><p>${mood}</p></div>
  <div class="sum"><div class="card"><div class="lbl">Открытый интерес</div><b>${big(d.totalOI)}</b></div></div></div>
 <div class="tbl card"><div class="dr hd"><div>Монета</div><div style="text-align:right">Цена</div><div>24 ч</div><div style="text-align:right">Откр. интерес</div><div>Фандинг (средний, взвешенный по OI)</div></div>${rows}</div>
 <div class="foot wfoot"><span>Данные: CoinGecko Derivatives · Binance, Bybit, OKX, Bitget, Hyperliquid и др.</span><span><b>@Filin1Radar</b></span></div>
</div>`, `.tbl{margin-top:22px;padding:2px 28px}.dr{display:grid;grid-template-columns:110px 170px 130px 190px 1fr;align-items:center;gap:20px;height:70px;border-bottom:1px solid var(--line);font-size:24px;font-weight:800}
.dr:last-child{border:0}.dr.hd{height:52px;font-size:14px;color:var(--muted);letter-spacing:1.2px;text-transform:uppercase;font-weight:700}.dr .p,.dr .oi{text-align:right}.dr .s{font-weight:900}
.fb{display:flex;align-items:center;gap:16px}.fb b{width:120px;text-align:right;font-size:22px}.track{position:relative;flex:1;height:14px;background:#1C1A20;border-radius:8px}
.track .mid{position:absolute;left:50%;top:-6px;bottom:-6px;width:2px;background:#5A544A}.fill{position:absolute;top:0;bottom:0;border-radius:8px}.fill.pos{background:var(--or)}.fill.neg{background:var(--gr)}`);
}

// ---------- WEEKLY ----------
function weekly(d) {
  const k = kyivParts();
  const g = d.gainers.map(c => ({ v: c.chg, label: '+' + pct(c.chg), cat: c.sym }));
  const l = d.losers.map(c => ({ v: c.chg, label: '−' + pct(c.chg), cat: c.sym }));
  const st = d.stable ? `<div class="card k"><div class="lbl">Стейблкоины</div><div class="v">${big(d.stable.now)}</div><div class="${d.stable.d7 >= 0 ? 'up' : 'dn'} s">${d.stable.d7 >= 0 ? '+' : '−'}${big(Math.abs(d.stable.d7)).replace('$', '$')} за неделю</div></div>` : '';
  return doc(`<div id="card" class="page" style="width:1080px;padding:48px">
 <div class="hdr">${brand}<div class="pill"><b>ИТОГИ НЕДЕЛИ</b><span>${k.day} ${MON[k.mon]} ${k.year}</span></div></div>
 <div class="kp">
  <div class="card k"><div class="lbl">Bitcoin за неделю</div><div class="v">${price(d.btc.close)}</div>${chg(d.btc.chg)}<div class="rng">диапазон ${price(d.btc.lo)} — ${price(d.btc.hi)}</div></div>
  <div class="card k"><div class="lbl">Ethereum за неделю</div><div class="v">${d.eth.price ? price(d.eth.price) : ''}</div>${chg(d.eth.chg)}</div>
  ${st}
 </div>
 <div class="card blk"><h3><i style="background:var(--gr)"></i>Лидеры роста · топ-100</h3>${hbars(g, 920, 54)}</div>
 <div class="card blk"><h3><i style="background:var(--rd)"></i>Лидеры падения · топ-100</h3>${hbars(l, 920, 54)}</div>
 <div class="foot" style="margin-top:22px"><span>Данные: CoinGecko · DefiLlama</span><span><b>@Filin1Radar</b></span></div>
</div>`, `.kp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:34px}.k{padding:22px 24px}.k .v{font-size:40px;font-weight:900;margin:10px 0 8px;white-space:nowrap}
.k .rng,.k .s{font-size:16px;color:var(--muted);font-weight:600;margin-top:10px}.k .s{font-size:18px;font-weight:800}
.blk{margin-top:18px;padding:22px 28px}.blk h3{font-size:22px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:10px}.blk h3 i{width:10px;height:22px;border-radius:3px;display:inline-block}`);
}

// ---------- LIQUIDATIONS ----------
function liqChart(hours, W, H) {
  const pad = { l: 80, r: 16, t: 20, b: 40 };
  const mx = Math.max(1, ...hours.map(h => Math.max(h.long, h.short))) / 1e6;
  const step = niceStep(mx, 3), top = Math.ceil(mx / step) * step;
  const mid = pad.t + (H - pad.t - pad.b) / 2, half = (H - pad.t - pad.b) / 2;
  const slot = (W - pad.l - pad.r) / hours.length, bw = slot * .62;
  let s = '';
  for (let t = step; t <= top + 1e-9; t += step) {
    const dy = t / top * half;
    s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${mid - dy}" y2="${mid - dy}" stroke="#2A2620"/><line x1="${pad.l}" x2="${W - pad.r}" y1="${mid + dy}" y2="${mid + dy}" stroke="#2A2620"/>`;
    s += `<text x="${pad.l - 12}" y="${mid - dy + 6}" text-anchor="end" class="ax">${grp(t, t < 1 ? 1 : 0)}</text><text x="${pad.l - 12}" y="${mid + dy + 6}" text-anchor="end" class="ax">${grp(t, t < 1 ? 1 : 0)}</text>`;
  }
  s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${mid}" y2="${mid}" stroke="#5A544A" stroke-width="1.5"/>`;
  const now = new Date();
  hours.forEach((h, i) => {
    const x = pad.l + slot * i + (slot - bw) / 2;
    const hs = h.short / 1e6 / top * half, hl = h.long / 1e6 / top * half;
    if (hs > 0) s += `<rect x="${x}" y="${mid - Math.max(2, hs) - 1}" width="${bw}" height="${Math.max(2, hs)}" rx="3" fill="#2FD27A"/>`;
    if (hl > 0) s += `<rect x="${x}" y="${mid + 1}" width="${bw}" height="${Math.max(2, hl)}" rx="3" fill="#FF4D4F"/>`;
    if (i % 4 === 3) {
      const t = new Date(now.getTime() - (23 - i) * 3600e3).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' }).replace(/:\d\d$/, ':00');
      s += `<text x="${x + bw / 2}" y="${H - 10}" text-anchor="middle" class="ax">${t}</text>`;
    }
  });
  return `<svg width="${W}" height="${H}">${s}</svg>`;
}
function mln(v) { return v >= 1e9 ? big(v) : `$${grp(v / 1e6, v < 1e7 ? 1 : 0)} млн`; }
function liq(d) {
  const share = d.total ? d.long / d.total * 100 : 0;
  const mood = share >= 65 ? 'Выносило в основном лонги' : share <= 35 ? 'Выносило в основном шорты' : 'Ликвидации примерно поровну в обе стороны';
  const mx = Math.max(...d.rows.map(r => r.long + r.short)) || 1;
  const rows = d.rows.map(r => `<div class="lr"><div class="s">${r.sym}</div><div class="bar"><div class="l" style="width:${r.long / mx * 100}%"></div><div class="sh" style="width:${r.short / mx * 100}%"></div></div><div class="nums"><span class="dn">${mln(r.long)}</span><span class="up">${mln(r.short)}</span></div></div>`).join('');
  const ph = d.peakHour ? new Date(Date.now() - (23 - d.peakHour.i) * 3600e3).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Kyiv', hour: '2-digit' }) + ':00' : '';
  const b = d.biggest ? `Крупнейшая: ${d.biggest.sym} ${d.biggest.side === 'long' ? 'лонг' : 'шорт'} на ${mln(d.biggest.usd)}` : (d.peakHour ? `Пик — около ${ph} (${mln(d.peakHour.v)} за час)` : '');
  return doc(`<div id="card" class="page wide">
 <div class="hdr">${brand}<div class="leg"><span><i style="background:var(--rd)"></i>Лонги</span><span><i style="background:var(--gr)"></i>Шорты</span></div></div>
 <div class="ttl"><div><h1>ЛИКВИДАЦИИ ЗА 24 ЧАСА</h1><p>${mood} · ${b}</p></div>
  <div class="sum"><div class="card"><div class="lbl">${d.source === 'all' ? 'Всего по рынку' : 'Всего на OKX'}</div><b>${mln(d.total)}</b></div><div class="card"><div class="lbl">Лонги</div><b class="dn">${grp(share, 0)}%</b></div></div></div>
 <div class="lq"><div class="card ch"><div class="lbl">По часам, млн $ (шорты вверх, лонги вниз)</div>${liqChart(d.hours, 640, 380)}</div>
  <div class="card co"><div class="lbl">По монетам</div>${rows}</div></div>
 <div class="foot wfoot"><span>${d.source === 'all' ? `Данные: Coinalyze · ${esc((d.exchanges || []).slice(0, 6).join(', ') || 'Binance, Bybit, OKX и др.')} — бессрочные фьючерсы` : 'Данные: OKX (USDT-фьючерсы) · только одна биржа, по рынку в целом суммы в разы больше'}</span><span><b>@Filin1Radar</b></span></div>
</div>`, `.lq{display:grid;grid-template-columns:680px 1fr;gap:18px;margin-top:22px}.ch,.co{padding:18px 20px}.ch svg{display:block;margin-top:8px}
.lr{display:grid;grid-template-columns:70px 1fr;grid-template-rows:auto auto;column-gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}.lr:last-child{border:0}
.lr .s{grid-row:span 2;font-size:22px;font-weight:900;align-self:center}.bar{display:flex;gap:3px;height:14px}.bar div{border-radius:6px;min-width:3px}.bar .l{background:var(--rd)}.bar .sh{background:var(--gr)}
.nums{display:flex;justify-content:space-between;font-size:17px;font-weight:800;margin-top:6px}`);
}

// ---------- FUTURES WEEKLY GAP ----------
function gapChart(es, W, H) {
  const pad = { l: 96, r: 30, t: 30, b: 40 };
  const all = [...es.before, es.fri, es.open, ...es.after];
  let mn = Math.min(...all), mx = Math.max(...all); const m = (mx - mn) * .15 || 5; mn -= m; mx += m;
  const n = es.before.length + es.after.length + 3; // 3 empty slots mark the weekend
  const x = i => pad.l + i / (n - 1) * (W - pad.l - pad.r), y = v => pad.t + (mx - v) / (mx - mn) * (H - pad.t - pad.b);
  const step = niceStep(mx - mn, 4);
  let s = '';
  for (let t = Math.ceil(mn / step) * step; t <= mx; t += step) s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="#2A2620"/><text x="${pad.l - 14}" y="${y(t) + 6}" text-anchor="end" class="ax">${grp(t)}</text>`;
  const up = es.open >= es.fri, col = up ? '#2FD27A' : '#FF4D4F';
  const bx = es.before.length - 1, ax = es.before.length + 3;
  s += `<rect x="${x(bx)}" y="${Math.min(y(es.fri), y(es.open))}" width="${x(ax) - x(bx)}" height="${Math.max(3, Math.abs(y(es.fri) - y(es.open)))}" fill="${col}" opacity=".22"/>`;
  s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(es.fri)}" y2="${y(es.fri)}" stroke="#F7A600" stroke-width="2" stroke-dasharray="8 7"/>`;
  s += `<text x="${W - pad.r}" y="${y(es.fri) + (up ? 26 : -12)}" text-anchor="end" style="fill:#F7A600;font-size:17px;font-weight:700">закрытие пятницы ${grp(es.fri)}</text>`;
  const line = (arr, off) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(off + i)},${y(v)}`).join('');
  s += `<path d="${line(es.before, 0)}" fill="none" stroke="#9A958C" stroke-width="3"/>`;
  s += `<path d="${line(es.after, ax)}" fill="none" stroke="${col}" stroke-width="3.5"/>`;
  s += `<circle cx="${x(ax)}" cy="${y(es.open)}" r="7" fill="${col}"/>`;
  s += `<text x="${(x(bx) + x(ax)) / 2}" y="${(y(es.fri) + y(es.open)) / 2 + 6}" text-anchor="middle" style="fill:${col};font-size:17px;font-weight:800">ГЭП</text><text x="${(x(bx) + x(ax)) / 2}" y="${H - 12}" text-anchor="middle" class="ax">выходные</text><text x="${x(0)}" y="${H - 12}" class="ax">пятница</text><text x="${W - pad.r}" y="${H - 12}" text-anchor="end" class="ax">открытие недели</text>`;
  return `<svg width="${W}" height="${H}">${s}</svg>`;
}
function gap(d) {
  const sg = v => `${v >= 0 ? '+' : '−'}${grp(Math.abs(v), 2)}%`;
  const es = d.es, nq = d.nq, up = es.gap >= 0;
  const k = kyivParts();
  return doc(`<div id="card" class="page wide">
 <div class="hdr">${brand}<div class="pill"><b>ОТКРЫТИЕ НЕДЕЛИ</b><span>${k.day} ${MON[k.mon]} ${k.year}</span></div></div>
 <div class="ttl"><div><h1 style="font-size:36px;white-space:nowrap">S&amp;P 500 ОТКРЫЛСЯ ${up ? 'ВЫШЕ' : 'НИЖЕ'} ПЯТНИЦЫ: ${sg(es.gap)}</h1><p>Гэп ${up ? 'снизу' : 'сверху'}: ${grp(Math.min(es.fri, es.open))}–${grp(Math.max(es.fri, es.open))} · ${es.filled ? 'уже закрыт' : 'пока не закрыт'}</p></div>
  <div class="sum"><div class="card"><div class="lbl">S&amp;P 500 сейчас</div><b class="${es.now >= 0 ? 'up' : 'dn'}">${sg(es.now)}</b></div><div class="card"><div class="lbl">Nasdaq 100 открытие</div><b class="${nq.gap >= 0 ? 'up' : 'dn'}">${sg(nq.gap)}</b></div></div></div>
 <div class="card" style="margin-top:20px;padding:14px 18px">${gapChart(es, 1144, 350)}</div>
 <div class="foot wfoot"><span>Данные: Yahoo Finance · ES=F, NQ=F · пятница ${grp(es.fri)} → открытие ${grp(es.open)}</span><span><b>@Filin1Radar</b></span></div>
</div>`);
}

module.exports = { daily, etf, deriv, weekly, liq, gap };
