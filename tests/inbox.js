const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(400); const out = {};
  const first = () => p.evaluate(() => { const v = document.getElementById('view'); const c = v.firstElementChild; return c ? (c.className + ' | ' + c.textContent.trim().slice(0, 70)) : null; });
  // AD with a decision
  await p.evaluate(async () => { await enterAD(); newGame('normal', null, 7, 'MICH'); appMode = 'ad'; state.event = { key: 'test', wk: 1, title: 'A booster wants a word', text: 'Test decision.', opts: [{ label: 'Meet him', hint: 'x', fx: {} }, { label: 'Decline', hint: 'y', fx: {} }], data: {}, def: 0 }; ui.tab = 'office'; render(); });
  out.adOffice = await first(); await p.waitForTimeout(1200); await p.screenshot({ path: '/tmp/claude-0/ib_ad.png', fullPage: true });
  await p.evaluate(() => { ui.tab = 'roster'; render(); }); out.adRoster = await first();
  out.adInbox = await p.evaluate(() => { const it = inboxItems(); actions.inbox(); return { n: it.length, first: it[0] && it[0].txt, tab: ui.tab, modal: !document.getElementById('modal').hidden }; });
  await p.waitForTimeout(400); out.adHL = await p.evaluate(() => !!document.querySelector('#view .inhl'));
  // career sign phase
  await p.evaluate(async () => { await enterCareer('new'); newCareer({ pos: 'WR', first: 'S', last: 'M', num: 1, home: 'TX', path: 'college', stars: 3, seed: 5, diff: 'normal' }); cslot = 1; cui.tab = 'home'; render(); });
  out.pcHome = await first(); await p.waitForTimeout(1200); await p.screenshot({ path: '/tmp/claude-0/ib_pc.png', fullPage: true });
  await p.evaluate(() => { cui.tab = 'stats'; render(); }); out.pcStats = await first();
  // commissioner with desk items
  await p.evaluate(async () => { await enterAD(); newComm2({ lvl: 'col' }); appMode = 'ad'; for (let i = 0; i < 2; i++) advance(); ui.tab = 'office'; render(); });
  out.comm = await first(); out.commItems = await p.evaluate(() => cm2().items.length); await p.screenshot({ path: '/tmp/claude-0/ib_comm.png' });
  // owner with a PR moment
  await p.evaluate(() => { ownWorld({ name: 'O', diff: 'normal', gm: 'hire', seed: 5 }); ownInherit(); OWN().pending = false; appMode = 'ad'; ownEvNew(null); ui.tab = 'office'; render(); });
  out.own = await first(); await p.screenshot({ path: '/tmp/claude-0/ib_own.png' });
  out.ownInbox = await p.evaluate(() => { const it = inboxItems(); actions.inbox(); return { n: it.length, items: it.map(x => x.txt + ' → ' + (x.tab || x.ctab) + ' ' + x.sel), modal: !document.getElementById('modal').hidden }; });
  out.ownGo = await p.evaluate(async () => { const it = ui.inboxList; const i = it.findIndex(x => /sponsor|meeting|naming/.test(x.txt)); if (i < 0) return 'none'; actions.inboxgo2({ i }); await new Promise(r => setTimeout(r, 400)); const h = document.querySelector('#view .inhl'); return { tab: ui.tab, hl: h ? h.textContent.slice(0, 60) : null }; });
  console.log(JSON.stringify({ out, errs }, null, 1)); await b.close();
})();
