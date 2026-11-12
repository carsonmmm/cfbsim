// High school coach. Run with: node tests/run.js tests/hscoach.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); }; const wait = ms => new Promise(r => setTimeout(r, ms)); const V = () => document.getElementById('view');
['fehs-slot-1', 'fehs-slot-2', 'fehs-slot-3', 'fehs-meta', 'fehs-active', 'fe-world'].forEach(k => localStorage.removeItem(k)); [1, 2, 3, 4, 5].forEach(i => localStorage.removeItem('fecoach-slot-' + i)); localStorage.removeItem('fecoach-slots-meta');
render(); need([...document.querySelectorAll('#view .mode h2')].some(h => h.textContent === 'High School Coach'), 'the Home screen has no High School Coach card');
actions.mgo({ k: 'hs', v: 'new' }); await wait(200); need(appMode === 'mini' && !!document.getElementById('hs-town'), 'the new-career form did not open'); await actions.mcreate(); await wait(200);
need(mm && mm.kind === 'hs' && mm.school.tier === 1 && mm.roster.length >= 40 && mm.sched.length === 10 && mm.wk === 0, 'a new coach did not start correctly');
const bad = () => /could not be shown/.test(V().textContent); const tabs = MINI.hs.tabs.map(t => t[0]).concat(['saves', 'settings']); const drawAll = tag => tabs.forEach(t => { mui.tab = t; render(); if (bad()) out.fail.push(tag + ': the ' + t + ' page failed'); }); drawAll('start');
// preseason choices
actions.hsplan({ v: 'off' }); actions.hsstyle({ v: 'spread' }); need(mm.plan === 'off' && mm.style === 'spread', 'the preseason choices did not stick'); const kid = mm.roster.find(p => p.cls === 9); need(hsDev(mm, kid.id) && kid.dev === 1 && mm.dev === 2, 'working with a player did not register');
// fifteen seasons: answer every decision the first way, build what the fund allows, take every bigger job
let seasons = 0, moves = 0, evs = 0; const o0 = Math.round(kid.ovr);
for (let guard = 0; guard < 400 && seasons < 15; guard++) {
  mm.events.forEach((e, i) => { if (!e.done) { hsEvent(mm, i, 0); evs++; } });
  if (mm.wk === 0) { ['weight', 'youth', 'film'].forEach(k => hsUpgrade(mm, k)); mm.roster.filter(p => p.cls >= 10).sort((a, b) => (b.pot - b.ovr) - (a.pot - a.ovr)).slice(0, 3).forEach(p => hsDev(mm, p.id)); }
  if (mm.wk === 15) { seasons++; if (seasons % 4 === 0) drawAll('year ' + mm.year); const j = mm.offers.findIndex(o => o.k === 'hs'); if (j >= 0) { hsTakeJob(mm, j); moves++; continue; } }
  if (guard % 7 === 0) { mui.tab = 'office'; render(); if (bad()) out.fail.push(mm.year + ' week ' + mm.wk + ': the Office failed'); }
  need(mm.roster.length >= 30 && mm.roster.length <= 60, mm.year + ': the roster has ' + mm.roster.length + ' players'); need(mm.roster.every(p => p.ovr >= 26 && p.ovr <= 99 && p.cls >= 9 && p.cls <= 12), mm.year + ': a player is in a bad state'); need(mm.rep >= 0 && mm.rep <= 100 && isFinite(mm.fund) && mm.fund >= 0, 'reputation or the fund went bad');
  actions.hsnext();
}
need(seasons === 15, 'fifteen seasons did not finish: ' + seasons); need(Math.round(kid.ovr) > o0 || !mm.roster.includes(kid), 'a player you worked with did not improve');
const H = mm.hist; out.end = { year: mm.year, school: mm.school.name, tier: mm.school.tier, rep: mm.rep, fund: mm.fund, titles: mm.titles, moves, decisions: evs, wins: H.map(h => h.w).join(' '), po: H.map(h => h.po).join(''), signed: mm.alumni.filter(a => a.to).length, stars: [2, 3, 4, 5].map(s => mm.alumni.filter(a => a.stars === s).length).join('/'), ach: Object.keys(mm.ach).length };
need(H.every(h => h.w + h.l === 10), 'a season did not have ten games'); need(mm.alumni.some(a => a.to), 'nobody ever signed with a college'); need(evs >= 8, 'decisions almost never came up: ' + evs);
// the register, and an athletic director's recruiting board
const reg = (worldGet().hs || []); need(reg.length > 0 && reg.every(p => p.n && p.cls && p.stars >= 2 && POS_ORDER.includes(p.pos)), 'signed seniors were not written to the shared register');
await miniSave(); const yr = mm.year; await actions.gohome(); await wait(200);
await enterAD(); await wait(200); newGame('normal', null, 7, 'OSU'); appMode = 'ad'; state.settings.world = 'on'; const cls = reg[0].cls; state.season = cls - 1; genRecruitClass(); const mine = state.rec.list.filter(r => String(r.world || '').startsWith('hs:'));
need(mine.length > 0 && mine.every(r => r.hs && r.interest > 0 && r.status === 'open'), 'the high school players are not on the athletic director\'s board'); out.onBoard = mine.length;
state.settings.world = 'off'; genRecruitClass(); need(!state.rec.list.some(r => String(r.world || '').startsWith('hs:')), 'Shared world off should keep them out');
// the college job starts a Coach career
await actions.gohome(); await wait(200); actions.mgo({ k: 'hs' }); await wait(300); need(mm && mm.year === yr, 'the career did not load back'); while (mm.wk !== 15) hsWeek(mm);
mm.offers = [{ k: 'col', tid: 'TOL', role: 'LB' }]; mm.rep = 85; mui.tab = 'office'; render(); need(/A college is calling/.test(V().textContent), 'the college offer is not shown'); const cname = mm.coach.name;
await actions.hscol({ i: '0' }); await wait(400); need(appMode === 'ad' && state && isCoach() && state.co.name === cname && ME === 'TOL' && state.co.role === 'LB', 'taking the college job did not start a Coach career'); need(!!lsGet('fecoach-slot-' + slot), 'the new Coach career was not saved');
ui.tab = 'office'; render(); need(!/could not be shown/.test(V().textContent), 'the new Coach career does not draw'); need(!!lsGet('fehs-slot-1'), 'the high school career was not kept');
[1, 2, 3, 4, 5].forEach(i => localStorage.removeItem('fecoach-slot-' + i)); localStorage.removeItem('fecoach-slots-meta'); localStorage.removeItem('fe-world');
out.wide = document.documentElement.scrollWidth; return out;
