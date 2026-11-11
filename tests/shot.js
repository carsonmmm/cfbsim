// screenshots of owner pages. node shot.js <outdir> <width> [theme]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/claude-0/shots'; const W = +(process.argv[3] || 1280); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const shot = async (n) => { await p.waitForTimeout(150); await p.screenshot({ path: `${out}/${W}_${n}.png`, fullPage: true }); };
  await shot('home');
  await p.evaluate(async () => { await actions.owsnew(); }); await shot('intro');
  await p.evaluate(() => { document.getElementById('ows-name').value = 'Dana Price'; actions.owspath({ v: 'exp' }); document.getElementById('ows-name').value = 'Dana Price'; actions.owsgo(); }); await shot('exp1');
  await p.evaluate(() => { actions.owsexp1(); document.getElementById('ows-nick').value = 'Comets'; actions.owslogo(); }); await shot('exp2');
  await p.evaluate(() => { actions.owsexp2(); }); await shot('exp3');
  await p.evaluate(() => { document.getElementById('ow-mine').value = 2000; actions.owsexp3(); }); await shot('vote');
  await p.evaluate(() => { actions.owsfinish(); }); await shot('xd');
  await p.evaluate(() => { actions.owsxdauto(); actions.owsfinish(); }); await shot('office');
  for (const t of ['obiz', 'ostad', 'ofans', 'front', 'oleague', 'career', 'off']) { await p.evaluate(t => { ui.tab = t; render(); }, t); await shot(t); }
  await p.evaluate(() => { let g = 0; while (OWN().pnl.length < 1 && g++ < 300) { if (state.phase === 'offseason') { proAutoOffseason(); if (state.phase === 'offseason') break; } else advance(); } ui.tab = 'off'; render(); }); await shot('review');
  await p.evaluate(() => { ui.tab = 'oleague'; render(); }); await shot('league2');
  await p.evaluate(() => { ui.tab = 'obiz'; render(); }); await shot('biz2');
  console.log(JSON.stringify({ errs })); await b.close();
})();
