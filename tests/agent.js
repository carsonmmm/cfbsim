// Agent mode. Run with: node tests/run.js tests/agent.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); }; const wait = ms => new Promise(r => setTimeout(r, ms)); const V = () => document.getElementById('view');
['feagent-slot-1', 'feagent-slot-2', 'feagent-slot-3', 'feagent-meta', 'feagent-active'].forEach(k => localStorage.removeItem(k));
render(); need([...document.querySelectorAll('#view .mode h2')].some(h => h.textContent === 'Agent'), 'the Home screen has no Agent card');
actions.mgo({ k: 'agent', v: 'new' }); await wait(200); need(appMode === 'mini' && !!document.getElementById('ag-name'), 'starting Agent mode did not open the new-career form');
document.getElementById('ag-agency').value = 'Test <b>Sports</b>'; await actions.mcreate(); await wait(200);
need(mm && mm.kind === 'agent' && mm.you.agency === 'Test Sports' && mm.clients.length === 2 && mm.pros.length > 20, 'a new agency did not start correctly');
const bad = () => /could not be shown/.test(V().textContent); const tabs = MINI.agent.tabs.map(t => t[0]).concat(['saves', 'settings']);
const drawAll = tag => tabs.forEach(t => { mui.tab = t; render(); if (bad()) out.fail.push(tag + ': the ' + t + ' page failed'); }); drawAll('start');
need(document.getElementById('hdr').textContent.includes('Test Sports') && !!document.querySelector('#hdr [data-act=agnext]'), 'the header is missing the agency or the next button');
// a pitch that lands, and one that does not
const p0 = mm.pros[10]; const i0 = p0.int; need(agPitch(mm, p0.id, p0.want) === 'hit' && p0.int >= i0 + 20, 'the right pitch should move a prospect a lot'); const wrong = Object.keys(AG_WANT).find(k => k !== p0.want); const i1 = p0.int; need(agPitch(mm, p0.id, wrong) === 'miss' && p0.int > i1 && p0.int < i1 + 15, 'the wrong pitch should move him a little');
need(agPitch(mm, p0.id, p0.want) === 'no', 'the same pitch should not work twice');
// play twelve years with a simple plan: pitch what the reachable prospects want, push each offer once, take the best fit
const seen = new Set(); let years = 0;
for (let guard = 0; guard < 120 && years < 12 && !mm.over; guard++) {
  const k = agStepKey(mm); seen.add(k);
  if (k === 'sign') { mm.pros.filter(p => p.heat - p.int < 30).sort((a, b) => (a.heat - a.int) - (b.heat - b.int)).forEach(p => { if (mm.pitches > 0) agPitch(mm, p.id, p.want); }); }
  if (k === 'prep') mm.clients.filter(c => c.lvl === 'draft').forEach(c => { if (mm.cash > 0.3) agPrep(mm, c.id, 'elite'); });
  if (k === 'fa') mm.fa.forEach(f => { const c = mm.clients.find(x => x.id === f.cid); f.offers.forEach(o => { if (!o.gone) agPush(mm, c.id, o.tm); }); const best = f.offers.filter(o => !o.gone).sort((a, b) => agFit(mm, c, b) + b.apy / f.val - agFit(mm, c, a) - a.apy / f.val)[0]; if (best) agAccept(mm, c.id, best.tm); });
  if (k === 'season') mm.events.forEach((e, i) => agEvent(mm, i, 0));
  if (['sign', 'fa', 'season', 'review'].includes(k) && guard % 3 === 0) drawAll(mm.year + ' ' + k);
  if (k === 'review') { years++; ['scout', 'negot', 'brand'].forEach(s => { if (mm.cash > agUpgradeCost(mm, s) + 0.4) agUpgrade(mm, s); }); }
  mui.tab = 'office'; render(); if (bad()) out.fail.push(mm.year + ' ' + k + ': the Office failed');
  need(mm.clients.every(c => c.trust >= 0 && c.trust <= 100 && c.ovr >= 40 && c.ovr <= 99 && (c.lvl !== 'nfl' || (c.k && c.k.apy >= AG_MIN))), mm.year + ' ' + k + ': a client is in a bad state'); need(mm.clients.length <= agMaxClients(mm), 'too many clients'); need(isFinite(mm.cash) && mm.rep >= 0 && mm.rep <= 100, 'money or reputation went bad');
  actions.agnext();
}
need(AG_STEPS.every(s => seen.has(s[0])), 'not every step of the year was reached: ' + [...seen]); need(years >= 8 || mm.over, 'the career did not run for years');
out.end = { year: mm.year, rep: mm.rep, cash: mm.cash, clients: mm.clients.length, fees: mm.stats.fees, deals: mm.stats.deals, firsts: mm.stats.firsts, ach: Object.keys(mm.ach).length, over: !!mm.over, legacy: agLegacy(mm), hist: mm.hist.map(h => h.rep + '/' + h.cash).join(' ') };
// saving, leaving and coming back
await miniSave(); const yr = mm.year, cl = mm.clients.length; await actions.gohome(); await wait(200); need(appMode === 'home', 'leaving Agent mode did not go Home');
need([...document.querySelectorAll('#view .mode')].some(c => /Agent/.test(c.querySelector('h2').textContent) && /Test Sports/.test(c.textContent)), 'the Home card does not show the saved agency');
mm = null; actions.mgo({ k: 'agent' }); await wait(300); need(mm && mm.year === yr && mm.clients.length === cl, 'the agency did not load back the same');
// keys that mean something in other modes do nothing harmful here
['n', 'u', 'l', '1', 'g', 'Escape'].forEach(key => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))); await wait(100); need(appMode === 'mini' && mm, 'a keyboard shortcut broke the mode'); if (!document.getElementById('modal').hidden) hideModal();
// a second career in another slot, then delete it
mui.tab = 'saves'; render(); actions.mnew({ i: '2' }); await actions.mcreate(); await wait(200); need(mslot === 2 && mm.year === 2026 && miniSlotsUsed('agent').length === 2, 'a second career did not start in slot 2'); await miniSave();
actions.mdel({ i: '2' }); need(!lsGet('feagent-slot-2') && !mm, 'deleting the slot did not clear it'); await actions.mload({ i: '1' }); need(mm && mm.year === yr, 'slot 1 did not load after the delete');
// other modes still open after it
await actions.gohome(); await wait(150); await enterAD(); await wait(200); newGame('normal', null, 7, 'OSU'); appMode = 'ad'; ui.tab = 'office'; render(); need(!!document.querySelector('#view .card') && !/could not be shown/.test(V().textContent), 'athletic director mode did not open after Agent mode');
out.wide = document.documentElement.scrollWidth; return out;
