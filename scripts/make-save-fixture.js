// Makes tests/fixtures/saves-<version>.json: one career of every kind, a season or so in, exactly as the browser
// stores them. Run it once when a version ships (node scripts/make-save-fixture.js) and commit the file.
// tests/saves.js then loads every fixture on every build, so a future change can't break old saves unnoticed.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); p.setDefaultTimeout(0);
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(600);
  const res = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    await enterAD(); appMode = 'ad';
    newGame('normal', null, 31, 'WISC'); setActiveSlot(1); autoSeason(); autoSeason(); save(); await flushSave();
    newGame('normal', null, 32, 'MICH'); goPro('SEA', { role: 'gm' }); setActiveSlot(2); let g = 0; while (state.phase === 'offseason' && g++ < 40) proAutoOffseason(); for (let i = 0; i < 6; i++) advance(); save(); await flushSave();
    newComm2({ lvl: 'col' }); setActiveSlot(3); for (let i = 0; i < 5; i++) advance(); save(); await flushSave();
    await actions.owsnew(); document.getElementById('ows-name').value = 'Fixture Owner'; actions.owspath({ v: 'exp' }); document.getElementById('ows-name').value = 'Fixture Owner'; actions.owsgo(); actions.owsexp1(); document.getElementById('ows-nick').value = 'Comets'; actions.owslogo(); actions.owsexp2(); document.getElementById('ow-mine').value = 2000; actions.owsexp3(); actions.owsfinish(); actions.owsxdauto(); actions.owsfinish(); await wait(300); const own = { owner: isOwner(), slot }; save(); await flushSave();
    switchNS('coach'); newCoachCareer({ name: 'Fixture Coach', start: 'any', tid: 'IOWA', role: 'HC', diff: 'normal', gameDay: 'plan', lvl: 'col' }); setActiveSlot(1); appMode = 'ad'; autoSeason(); save(); await flushSave();
    await enterCareer('new'); newCareer({ pos: 'QB', first: 'Fix', last: 'Ture', num: 7, home: 'OH', path: 'college', stars: 4, seed: 9, diff: 'normal' }); cslot = 1; signWith(offersList()[0].id); cs.p.auto = true; for (let i = 0; i < 3; i++) { const r = cSimUntil(null, { events: true, spend: true }); if (r === 'choice' && offStep() !== 'draft') offNext(); } cSave(); await cFlush();
    const out = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/slot-\d|slots-meta/.test(k)) out[k] = localStorage.getItem(k); }
    return { v: PATCH_NOTES[0].v, own, keys: out };
  });
  await b.close(); console.log(res.v, res.own, Object.keys(res.keys).map(k => k + ':' + Math.round(res.keys[k].length / 1024) + 'K').join(' '));
  fs.writeFileSync(path.join(__dirname, '..', 'tests', 'fixtures', 'saves-' + res.v + '.json'), JSON.stringify({ version: res.v, keys: res.keys }));
})();
