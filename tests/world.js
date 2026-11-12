// Travel, injury decisions and the alumni network. Run with: node tests/run.js tests/world.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); };
await enterAD(); newGame('normal', null, 7, 'OSU'); appMode = 'ad';
// travel: a coast-to-coast trip and altitude favor the home side; a short trip does not; Classic balance is untouched
need(balOn(), 'a new career should be on the Updated balance');
need(travelInfo('OSU', 'USC', false).z === 3 && travelEdge('OSU', 'USC', false) > 1, 'a three time zone trip should matter');
need(travelEdge('OSU', 'MICH', false) === 0, 'a trip inside one time zone should not matter'); need(travelEdge('OSU', 'USC', true) === 0, 'a neutral site should not matter');
need(travelInfo('WYO', 'OSU', false).alt && travelInfo('AF', 'WYO', false).alt === false, 'altitude should only count against a low-land visitor');
const d1 = gameDiff('OSU', 'USC', false), d0 = gameDiff('OSU', 'USC', true); need(d1 > d0, 'the home side should be favored more at home than on a neutral field');
const bv = state.settings.balV; state.settings.balV = 1; if (!balOn()) need(travelEdge('OSU', 'USC', false) === 0, 'travel should be off on the Classic balance'); state.settings.balV = bv;
const ag = mGames().find(g => g.a === ME || g.h === ME); out.line = travelLine({ h: 'USC', a: ME, neutral: false }).replace(/<[^>]+>/g, '');
need(/time zones from home/.test(out.line), 'the game preview does not explain the trip');
// medical retirement: all three answers
const fict = () => state.roster.filter(p => !p.real && p.ovr >= 68 && !['K', 'P', 'LS'].includes(p.pos));
const hurt = () => { const p = fict()[0]; p.inj = 99; p.injSE = true; p.injType = 'Torn ACL'; return p; };
let p = hurt(); need(EVENT_DEFS.medretire.cond(), 'the medical decision should be available'); let ev = EVENT_DEFS.medretire.make(); need(ev.opts.length === 3 && ev.data.pid, 'the medical decision is malformed');
let n0 = state.roster.length, a0 = state.alumni.length; EVENT_DEFS.medretire.res(0, ev.data); need(state.roster.length === n0 - 1 && state.alumni.length === a0 + 1 && !P(ev.data.pid), 'supporting retirement should move him to the alumni');
need(POS_ORDER.every(pos => !state.depth[pos].includes(ev.data.pid)), 'a retired player is still on the depth chart');
p = hurt(); ev = EVENT_DEFS.medretire.make(); const o0 = P(ev.data.pid).ovr; EVENT_DEFS.medretire.res(2, ev.data); const pb = P(ev.data.pid); need(pb && pb.medBack && pb.ovr < o0, 'pushing him to return should bring him back slower and at risk'); need(rehabInjF(pb) > rehabInjF({}), 'a player back against advice should be hurt more often');
// playing hurt in a big game
const st = POS_ORDER.flatMap(pos => state.depth[pos].slice(0, START[pos]).map(P)).find(x => x && !x.real && x.ovr >= 72 && !['K', 'P', 'LS'].includes(x.pos) && !x.inj);
if (st) { st.inj = 2; st.injType = 'Ankle sprain'; const g = mGames().find(x => !x.done); const o = oppOf(g); state.rivals[o] = state.rivals[o] || { name: 'Test rivalry', w: 0, l: 0, note: '' };
  need(EVENT_DEFS.gutitout.cond(), 'the play-hurt decision should be available before a rivalry game'); ev = EVENT_DEFS.gutitout.make(); ev.data.pid = st.id; EVENT_DEFS.gutitout.res(0, ev.data);
  need(st.inj === 0 && X().gut && X().gut.pid === st.id, 'letting him play should put him in the lineup'); rehabWeek(true); need(!X().gut, 'the week after should settle what playing hurt cost'); } else out.fail.push('no starter to test with');
// alumni: four seasons on autopilot, then the network
for (let y = 0; y < 5; y++) autoSeason();
need(state.alumni.length > 20, 'no alumni after five seasons'); ui.tab = 'history'; render(); need(!!document.getElementById('alumnicard'), 'the History page has no alumni card');
out.alum = { n: state.alumni.length, drafted: state.alumni.filter(alumDrafted).length, book: X().alum || null };
need(out.alum.drafted > 0, 'nobody was drafted in five seasons'); need(out.alum.book && out.alum.book.gifts > 0, 'drafted alumni gave nothing back'); need(out.alum.book && out.alum.book.refs > 0, 'no recruit heard from an alum');
out.wide = document.documentElement.scrollWidth; return out;
