const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  const out = {};
  await p.goto('file://' + require('path').join(__dirname, '..', 'source', 'base_v947.html')); await p.waitForTimeout(500);
  out.old = await p.evaluate(async () => { newGame('normal', null, 5, 'MICH'); setActiveSlot(1); save(); await flushSave(); newGame('normal', null, 6, 'MICH'); goPro('DET', { role: 'gm' }); setActiveSlot(2); save(); await flushSave(); return Object.keys(slotsMetaOf('ad')); });
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(600);
  out.load = await p.evaluate(async () => { await enterAD(); await new Promise(r => setTimeout(r, 300)); const a = { name: myName(), lvl: state.lvl }; render(); return a; });
  out.own = await p.evaluate(async () => {
    await actions.owsnew(); document.getElementById('ows-name').value = 'Pat Owner'; actions.owsgo();
    for (let i = 0; i < 10 && cui.own && cui.own.step === 'buy'; i++) { const t = ownMarket()[0]; actions.owpick({ v: t.tid }); document.getElementById('ow-bid').value = Math.round(t.ask * (1 + i * 0.06)); document.getElementById('ow-debt').value = 700; document.getElementById('ow-mine').value = 2500; actions.owsbid(); }
    if (cui.own && cui.own.step === 'vote') { if (!cui.own.vote.ok) return { vote: cui.own.vote }; actions.owsfinish(); }
    await flushSave(); return { club: myName(), slot, meta: slotsMetaOf('ad')[slot] };
  });
  await p.reload(); await p.waitForTimeout(600);
  out.home = await p.evaluate(() => document.querySelector('#view').textContent.includes('Continue as owner'));
  out.cont = await p.evaluate(async () => { await actions.goowner(); const bad = []; for (const [k] of PRO_TABS) { if (!tabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } if (isOwner()) actions.pnext(); return { owner: isOwner(), club: myName(), bad, step: isPro() && PS().off && PS().off.step, flash: ui.flash, kind: state.kind, appMode, meta: slotsMetaOf('ad') }; });
  out.ad = await p.evaluate(async () => { await enterAD(); await new Promise(r => setTimeout(r, 300)); return { name: myName(), kind: state.kind || 'ad', lvl: state.lvl }; });
  out.errs = errs; console.log(JSON.stringify(out)); await b.close();
})();
