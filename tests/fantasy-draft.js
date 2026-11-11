// The fantasy draft start for NFL general managers. Run with: node tests/run.js tests/fantasy-draft.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); };
await enterAD(); newGame('normal', null, 11, 'MICH'); goPro('DET', { role: 'gm' }); state.tline = []; setActiveSlot(1); appMode = 'ad';
const pool = Object.values(PS().rost).reduce((a, l) => a + l.length, 0) + state.roster.length;
fdStart(); ui.tab = 'off'; render();
need(fdOn(), 'the draft did not start'); need(/on the clock/.test(document.querySelector('#view h2').textContent), 'the draft page is not showing');
need(PRO_TABS.map(t => t[0]).filter(tabVisible).join() === 'off,file,settings', 'other pages are reachable during the draft');
for (let k = 0; k < 3; k++) { const b = document.querySelector('[data-act=fdpick]'); need(b && fdPick(b.dataset.id) === 'ok', 'manual pick ' + (k + 1) + ' failed'); render(); }
need(PS().fd.got[ME].length === 3, 'three picks were not recorded'); actions.tab({ tab: 'roster' }); need(ui.tab === 'off', 'the roster page opened during the draft'); need(proOffNext() === false, 'the offseason can move on during the draft');
// a save made in the middle of the draft loads and carries on
save(); await flushSave(); state = null; const r = await loadSlot(1); need(r.ok && fdOn() && PS().fd.got[ME].length === 3, 'a mid-draft save did not load');
actions.fdauto(); need(!fdOn(), 'the draft did not finish');
const tids = Object.keys(state.teams); const sizes = tids.map(t => proRoster(t).length); out.sizes = [Math.min(...sizes), Math.max(...sizes)];
need(out.sizes[0] >= 48 && out.sizes[1] <= 53, 'roster sizes are off: ' + out.sizes);
const ids = new Set(); let dup = 0; tids.forEach(t => proRoster(t).forEach(p => { if (ids.has(p.id)) dup++; ids.add(p.id); })); need(!dup, dup + ' players are on two clubs'); need(ids.size <= pool, 'players appeared from nowhere');
const rooms = tids.map(t => capRoom(t)); out.capRoom = Math.round(Math.min(...rooms)); need(out.capRoom >= 0, 'a club finished the draft over the cap');
const rat = tids.map(t => T(t).rating); out.ratings = [Math.min(...rat), Math.max(...rat)]; need(out.ratings[1] - out.ratings[0] <= 10, 'the draft left the league lopsided: ' + out.ratings);
const bad = []; for (const [k] of PRO_TABS) { if (!tabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } need(!bad.length, 'pages failed after the draft: ' + bad);
let g = 0; while (state.phase === 'offseason' && g++ < 40) proAutoOffseason(); g = 0; while (state.phase !== 'offseason' && g++ < 40) advance();
out.season = T(ME).w + '-' + T(ME).l; need(T(ME).w + T(ME).l >= 16, 'the season after the draft did not play out');
return out;
