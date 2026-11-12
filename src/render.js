// Usage: node src/render.js <daily|etf|deriv|weekly|all> [--mock] [--slot УТРО]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const data = require('./data');
const T = require('./templates');

const OUT = path.join(__dirname, '..', 'out');
const args = process.argv.slice(2);
const mock = args.includes('--mock');
const slotIdx = args.indexOf('--slot');
const slot = slotIdx >= 0 ? args[slotIdx + 1] : undefined;
const which = args[0] === 'all' || !args[0] ? ['daily', 'etf', 'deriv', 'weekly'] : [args[0]];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 1600 }, deviceScaleFactor: 1 });
  let failed = 0;
  for (const kind of which) {
    try {
      const d = mock ? require('./mock')[kind] : await data[kind]();
      const html = T[kind](d, slot);
      const tmp = path.join(OUT, `.${kind}.html`);
      fs.writeFileSync(tmp, html);
      await page.goto('file://' + tmp);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('#card').screenshot({ path: path.join(OUT, `${kind}.png`) });
      fs.unlinkSync(tmp);
      fs.writeFileSync(path.join(OUT, `${kind}.json`), JSON.stringify({ kind, generatedAt: new Date().toISOString(), data: d }, null, 1));
      console.log('ok', kind);
    } catch (e) { failed++; console.error('FAIL', kind, e.message); }
  }
  await browser.close();
  process.exit(failed === which.length ? 1 : 0);
})();
