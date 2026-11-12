// The nemesis and the scandals. Run with: node tests/run.js tests/rivals.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); };
await enterAD(); newGame('normal', null, 7, 'OSU'); appMode = 'ad';
// one person, seated among the rivals
let N = nemSync(); need(N && N.name && N.id && rxStore().list[0].name === N.name, 'no nemesis was created'); const name = N.name, style = N.style, firstTeam = N.id;
ui.tab = 'rivals'; render(); need(!!document.getElementById('nemcard') && document.getElementById('nemcard').textContent.includes(name), 'the Rivals page has no nemesis card');
// he goes after the coordinator: all three answers
const poach = () => { N.pend = null; const c = state.staff.OC; N.pend = { k: 'poach', role: 'OC', name: c.name, ovr: c.ovr, s: state.season, raise: 0.4 }; return c; };
let c = poach(); ui.tab = 'office'; render(); need(!!document.getElementById('nempend'), 'the Office does not show his move'); const sal = c.salary; actions.nemdo({ k: 'poach', v: 'match' });
need(state.staff.OC.name === c.name && state.staff.OC.salary > sal && N.kept === 1 && !N.pend, 'matching the offer should keep the coordinator at a higher salary');
c = poach(); actions.nemdo({ k: 'poach', v: 'pass' }); need(state.staff.OC && state.staff.OC.name !== c.name && N.poached === 1, 'letting him go should replace the coordinator at once');
need(state.staff.OC.ovr < c.ovr, 'the replacement should be weaker');
// he goes after a recruit
const r = state.rec.list.find(x => x.star >= 4); r.offered = true; r.status = 'open'; r.interest = 70;
N.pend = { k: 'flip', rid: r.id, n: r.n, pos: r.pos, star: r.star, s: state.season, wk: state.week, cost: 0.4 }; const bal = state.fin.balance; actions.nemdo({ k: 'flip', v: 'nil' }); need(r.interest === 76 && state.fin.balance < bal && N.held === 1, 'answering with money should hold the recruit');
N.pend = { k: 'flip', rid: r.id, n: r.n, pos: r.pos, star: r.star, s: state.season, wk: state.week, cost: 0.4 }; actions.nemdo({ k: 'flip', v: 'pass' }); need(r.interest === 61 && r.lead[0] === N.id && N.flipped === 1, 'letting it go should put his school in front');
// playing each other is remembered, and he talks about it
const g = { done: true, h: ME, a: N.id, hs: 31, as: 17 }; const news0 = state.news.length; nemWeek(state.week, g); need(N.w === 1 && N.res[0] === 'W' && N.mem[0].t.includes('You beat'), 'a win over him was not remembered');
need(N.mem.length >= 5, 'his memory is not filling in');
// he is part of the save
setActiveSlot(1); save(); await flushSave(); state = null; const lr = await loadSlot(1); N = state && state.nem; need(lr.ok && N && N.name === name && N.mem.length >= 5, 'the nemesis did not survive saving and loading');
// seasons on autopilot do not break with a nemesis in the world, and pending moves resolve
for (let y = 0; y < 3; y++) autoSeason(); N = state.nem; need(N.name === name && N.style === style, 'he changed identity'); need(N.mem.some(m => /finished/.test(m.t)), 'the season verdict was not remembered'); out.nem = { rec: N.w + '-' + N.l, mem: N.mem.length, poached: N.poached, flipped: N.flipped };
// he follows you to the NFL
goPro('DET', { role: 'gm' }); N = nemSync(); need(N.name === name && N.lvl === 'nfl' && NFL_BY[N.id] && N.id !== firstTeam, 'he did not follow you to the NFL'); need(N.mem.some(m => /^He left for/.test(m.t)), 'his move is not in the history'); out.follows = teamName(N.id);
ui.tab = 'rivals'; render(); need(document.getElementById('nemcard').textContent.includes(name), 'the NFL Rivals page lost him');
// scandals (a fresh college career)
newGame('normal', null, 9, 'OSU'); need(!X().dirt, 'a new career should have no secrets');
const rr = state.rec.list.find(x => x.star >= 4); rr.offered = true; rr.status = 'open'; rr.interest = 50; need(EVENT_DEFS.bagman.cond(), 'the envelope should be on offer'); let ev = EVENT_DEFS.bagman.make(); ev.data.rid = rr.id; const risk0 = state.meters.risk;
EVENT_DEFS.bagman.res(0, ev.data); need(rr.interest === 80 && state.meters.risk > risk0 + 10 && X().dirt.acts.length === 1, 'taking the envelope should land the recruit and leave a secret');
const star = dirtStar()[0]; if (star) { const g2 = mGames().find(x => !x.done); state.rivals[oppOf(g2)] = state.rivals[oppOf(g2)] || { name: 'Test rivalry', w: 0, l: 0, note: '' }; need(EVENT_DEFS.buriedtest.cond(), 'the failed test should come up before a big game'); ev = EVENT_DEFS.buriedtest.make(); EVENT_DEFS.buriedtest.res(1, ev.data); need(X().dirt.acts.length === 2, 'burying the test should leave a secret'); EVENT_DEFS.buriedtest.res(0, ev.data); need(P(ev.data.pid).susp === 1, 'suspending him should sit him'); }
// the investigation finds it
state.meters.risk = 100; state.fin.compliance = 1; let found = null; for (let i = 0; i < 40 && !found; i++) { state.meters.risk = 100; found = investigate(); }
need(found && X().dirt.pend && !X().dirt.acts.length && X().dirt.hist.length === 1, 'a found secret should become a decision'); ui.tab = 'office'; render(); need(!!document.getElementById('dirtpend'), 'the Office does not show the investigation');
const oc = state.staff.OC.name; actions.dirtdo({ v: 'blame' }); need(!X().dirt.pend && (state.staff.OC.name !== oc || state.staff.DC), 'blaming a coordinator should settle it'); ui.tab = 'history'; render(); need(!!document.getElementById('dirtcard'), 'the History page does not list what came out');
// a secret goes cold after three seasons
dirtAdd('bagman', 'test secret', 0); X().dirt.acts[0].s = state.season - 3; state.meters.risk = 0; investigate(); need(!X().dirt.acts.length, 'an old secret should go cold');
out.wide = document.documentElement.scrollWidth; return out;
