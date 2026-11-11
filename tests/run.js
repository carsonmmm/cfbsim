// Loads the game in Chromium and runs a probe file (an async function body) inside the page; prints its JSON result.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const file = process.argv[2]; const args = process.argv.slice(3); const game = process.env.GAME || require('path').join(__dirname, '..', 'index.html');
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await p.goto('file://' + game); await p.waitForTimeout(600);
  const body = fs.readFileSync(file, 'utf8'); p.setDefaultTimeout(0);
  const res = await p.evaluate(new Function('return (async (ARGS) => {' + body + '})')(), args).catch(e => ({ ERR: String(e) }));
  console.log(JSON.stringify(res)); if (errs.length) console.error('PAGE ERRORS', errs.slice(0, 3)); await b.close();
})();
