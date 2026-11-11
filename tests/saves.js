// Loads every saved-career fixture in tests/fixtures/saves-*.json into the current build: each career must open,
// draw every page and play on. Run with: node tests/saves.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const dir = path.join(__dirname, 'fixtures'); const out = { fail: [], loaded: {} }; const b = await chromium.launch();
  for (const f of fs.readdirSync(dir).filter(x => /^saves-.*\.json$/.test(x)).sort()) {
    const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const p = await (await b.newContext()).newPage(); p.setDefaultTimeout(0); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
    const url = 'file://' + (process.env.GAME || path.join(__dirname, '..', 'index.html'));
    await p.goto(url); await p.evaluate(keys => { localStorage.clear(); Object.entries(keys).forEach(([k, v]) => localStorage.setItem(k, v)); }, fx.keys); await p.reload(); await p.waitForTimeout(600);
    const r = await p.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms)); const bad = []; const seen = [];
      const draw = (tag, tabs, vis, set) => { for (const k of tabs) { if (vis && !vis(k)) continue; set(k); try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(tag + ':' + k); } catch (e) { bad.push(tag + ':' + k + ':' + e.message); } } };
      for (const i of [1, 2, 3, 4, 5]) {
        if (!localStorage.getItem('mfad-slot-' + i)) continue; await actions.gohome(); await wait(150); await actions.homeopen({ slot: String(i) }); await wait(300);
        if (!state || slot !== i) { bad.push('AD slot ' + i + ' did not open'); continue; }
        const kind = isComm() ? 'commissioner' : isOwner() ? 'owner' : isPro() ? 'gm' : 'ad'; seen.push(kind);
        draw(kind, (isComm() ? commTabList() : isPro() ? PRO_TABS : TABS).map(t => t[0]), tabVisible, k => { ui.tab = k; });
        try { if (state.phase !== 'offseason') advance(); } catch (e) { bad.push(kind + ': advancing failed: ' + e.message); }
      }
      if (localStorage.getItem('fecoach-slot-1')) { await actions.gohome(); await wait(150); await enterCoach(); await wait(300); if (!state || !isCoach()) bad.push('the coach career did not open'); else { seen.push('coach'); draw('coach', TABS.map(t => t[0]), tabVisible, k => { ui.tab = k; }); try { if (state.phase !== 'offseason') advance(); } catch (e) { bad.push('coach: advancing failed: ' + e.message); } } }
      if (localStorage.getItem('mfpc-slot-1')) { await actions.gohome(); await wait(150); await enterCareer(); await wait(300); if (!cs) bad.push('the player career did not open'); else { seen.push('player'); draw('player', CTABS.map(t => t[0]), null, k => { cui.tab = k; }); try { cSimWeek(); } catch (e) { bad.push('player: a week failed: ' + e.message); } } }
      return { bad, seen };
    });
    out.loaded[fx.version] = r.seen.join(','); r.bad.forEach(x => out.fail.push(fx.version + ' ' + x)); errs.slice(0, 3).forEach(x => out.fail.push(fx.version + ' page error: ' + x));
    if (r.seen.length < 6) out.fail.push(fx.version + ' only opened: ' + r.seen.join(','));
  }
  await b.close(); console.log(JSON.stringify(out));
})();
