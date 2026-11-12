// Coach mode: running your staff, promotions from within, and the job market. Run with: node tests/run.js tests/coachjobs.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); }; const V = () => document.getElementById('view');
await enterAD(); switchNS('coach'); const mk = (tid, role, seed) => { newCoachCareer({ name: 'Test Coach', start: 'any', tid, role, diff: 'normal', gameDay: 'plan', lvl: 'col', seed }); appMode = 'ad'; };
const toOff = () => { let g = 0; while (state.phase !== 'offseason' && g++ < 60) advance(); };

// 1. a head coach at a small school can replace an assistant, and is told why when he cannot
mk('TOL', 'HC', 2); need(coRunsStaff(), 'a head coach should run his staff');
const tally = {}; ['OC', 'DC', 'ST', 'QB', 'LB'].forEach(role => { fireCoach(role); need(!state.staff[role], 'firing the ' + role + ' did not open the job'); const room = r1(state.co.contract.pool - assistantSpend());
  need((state.cands[role] || []).some(c => c.salary <= room), `nobody on the ${role} list fits a ${room}M pool: ${(state.cands[role] || []).map(c => c.salary).join(', ')}`);
  for (let i = 0; i < 4 && !state.staff[role]; i++) { (state.cands[role] || []).filter(c => !c.declined && !candOverPool(c)).some(c => { const r = hireCoach(role, c.id, false); tally[r] = (tally[r] || 0) + 1; need(!!hireMsg(r, role), 'no message for the result "' + r + '"'); return r === 'hired'; }); if (!state.staff[role]) need(candMore(role) || true, ''), (X().search = {}); }
  need(!!state.staff[role], 'the ' + role + ' job could not be filled, even after widening the search'); }); out.hires = tally;
// the page: an unaffordable candidate is marked, and a quick offer that fails says so
fireCoach('WR'); const rich = state.cands.WR[0]; rich.salary = 9; rich.declined = false; ui.tab = 'staff'; render(); need(/Over your pool by/.test(V().textContent), 'an unaffordable candidate is not marked on the page');
need(hireCoach('WR', rich.id, false) === 'pool' && /cannot afford him/.test(hireMsg('pool', 'WR')), 'an offer over the pool should be refused with a reason'); actions.hire({ role: 'WR', id: rich.id }); need(/cannot afford/.test((document.querySelector('.flash') || {}).textContent || ''), 'the page showed nothing when the offer failed');
state.cands.WR.forEach(c => { c.declined = true; }); render(); need(!!document.querySelector('[data-act=candmore][data-role=WR]'), 'a search with nobody left has no way to widen it'); actions.candmore({ role: 'WR' }); need(state.cands.WR.some(c => !c.declined && !candOverPool(c)), 'widening the search did not bring an affordable candidate');
// an assistant coach cannot hire, and the school still fills its own jobs
mk('IOWA', 'OC', 3); need(!coRunsStaff() && hireCoach('QB', (state.cands.QB[0] || {}).id, false) !== 'hired', 'an assistant should not be able to hire'); state.staff.LB = null; state.cands.LB = genCandidates('LB', 4); autoHire(); need(!!state.staff.LB, 'the school stopped filling its own vacancies');

// 2. an NFL head coach can change his staff
mk('IOWA', 'HC', 4); goPro('DET', { role: 'coach' }); state.co.role = 'HC'; syncMe(); need(proCoRuns(), 'an NFL head coach should run his staff'); ui.tab = 'staff'; render(); need(!!document.getElementById('procostaff') && !!document.querySelector('[data-k="pcf-OC"]'), 'the NFL staff page has no controls for the head coach');
const oldOC = state.staff.OC.name; proCoFire('OC'); need(state.staff.OC && state.staff.OC.interim && state.staff.OC.name !== oldOC && state.cands.OC.length === 4, 'letting an NFL coordinator go did not open the job'); let got = ''; for (let i = 0; i < 12 && got !== 'hired'; i++) { const c = state.cands.OC.find(x => !x.declined); if (!c) { state.cands.OC = genCandidates('OC', 4); continue; } got = proCoHire('OC', c.id); } need(got === 'hired' && !state.staff.OC.interim, 'an NFL head coach could not hire a coordinator');
render(); need(!/could not be shown/.test(V().textContent), 'the NFL staff page broke');

// 3. taking the head coaching job at your own school makes you the head coach
mk('IOWA', 'OC', 2); toOff(); let co = state.co; co.fired = null; co.newBoss = { old: 'X', open: true }; co.market = buildMarket(); let o = co.market.open.find(x => x.inside && x.role === 'HC'); need(!!o && !!o.why, 'the open job at your own school is not offered as a promotion');
if (o) { o.offer = makeOffer(o.tid, o.role, null, false, 'col'); acceptOffer(o.id); finishMarket(); need(co.role === 'HC' && state.staff.HC && state.staff.HC.me && state.staff.OC && !state.staff.OC.me, 'accepting the promotion did not make you head coach: ' + co.role); }

// 4. interim head coach, both endings
let kept = 0, sent = 0;
for (let seed = 1; seed <= 8 && !(kept && sent); seed++) {
  mk('MINN', 'OC', seed); for (let i = 0; i < 6; i++) advance(); co = state.co; co.hist.push({ s: state.season - 1, tm: ME, role: 'OC', w: 7, l: 5 }); const boss = state.staff.HC.name; coBossOut('HC', 'in a test'); if (!X().coInt) X().coInt = { role: 'HC', s: state.season, wk: state.week, boss };
  if (seed === 1) { ui.tab = 'office'; render(); need(!!document.getElementById('cointcard'), 'the interim offer is not on the Office'); need(inboxItems().some(x => /interim/.test(x.txt)), 'the interim offer is not in the Inbox'); }
  actions.cointdo({ v: 'yes' }); need(co.role === 'HC' && co.interim && state.staff.HC.me && state.staff.OC && !state.staff.OC.me, 'accepting did not make you interim head coach');
  { const dc = state.staff.DC; fireCoach('DC'); need(!coRunsStaff() && state.staff.DC === dc, 'an interim head coach could fire a coordinator'); const q = state.staff.QB; state.staff.QB = null; state.cands.QB = genCandidates('QB', 4); need(hireCoach('QB', state.cands.QB[0].id, false) === 'notyours', 'an interim head coach could hire'); state.staff.QB = q; } if (seed === 1) { ui.tab = 'staff'; render(); need(!document.querySelector('[data-act=askfire]'), 'an interim head coach can fire the staff'); }
  toOff(); const res = co.intRes; need(res && res.role === 'HC' && !co.interim, 'the season ended with no decision on the interim');
  if (res && res.kept) { kept++; need(co.role === 'HC' && co.market.home && co.market.home.offer && co.market.home.role === 'HC', 'kept as head coach, but no offer to sign'); ui.tab = 'off'; render(); need(!/could not be shown/.test(V().textContent), 'the offseason page broke after being kept'); }
  else if (res) { sent++; need(co.role === 'OC' && state.staff.OC && state.staff.OC.me && !co.fired, 'sent back, but not to the old job'); }
  autoOffseason(); need(state.phase !== 'offseason' && !!state.staff.HC, 'the next season did not start with a head coach'); need(!co.interim && state.staff[co.role] && state.staff[co.role].me, 'after the offseason your job and the staff list disagree');
}
need(kept > 0 && sent > 0, `both endings should happen across eight tries (kept ${kept}, sent back ${sent})`); out.interim = { kept, sent };
// 5. a position coach moves up when his coordinator is fired, and turning it down is allowed
mk('MINN', 'QB', 9); for (let i = 0; i < 6; i++) advance(); co = state.co; const oc = state.staff.OC.name; X().coInt = null; coBossOut('OC', 'in a test'); X().coInt = { role: 'OC', s: state.season, wk: state.week, boss: oc }; actions.cointdo({ v: 'yes' });
need(co.role === 'OC' && co.interim && co.interim.from === 'QB' && state.staff.OC.me && state.staff.QB && !state.staff.QB.me && callsOff(), 'a position coach did not become interim coordinator');
mk('MINN', 'QB', 10); for (let i = 0; i < 6; i++) advance(); X().coInt = { role: 'OC', s: state.season, wk: state.week, boss: 'X' }; actions.cointdo({ v: 'no' }); need(state.co.role === 'QB' && !state.co.interim && !X().coInt, 'turning the promotion down should leave you where you were');
// a position coach is never offered the head job: when the head coach goes, the most he is offered is his coordinator's job
for (let seed = 30; seed < 50; seed++) { mk('HAW', 'QB', seed); for (let i = 0; i < 6; i++) advance(); state.co.hist.push({ s: state.season - 1, tm: ME, role: 'QB', w: 6, l: 6 }); X().coInt = null; coBossOut('HC', 'in a test'); const v = X().coInt; need(!v || v.role === 'OC', 'a quarterbacks coach was offered the ' + (v && v.role) + ' job'); if (v) { coIntAnswer(true); need(state.co.role === 'OC' && state.staff.HC && state.staff.HC.interim && !state.staff.HC.me, 'the chain of promotions went wrong'); } }
// it happens by itself: a head coach on a very hot seat is fired after a loss, and seasons keep running
mk('KENT', 'DC', 13); for (let i = 0; i < 6; i++) advance(); coMidseason({ done: true, mResult: 'L' }); need(!state.co.bossOut, 'nobody above you should be fired in your first season at a school'); state.co.hist.push({ s: state.season - 1, tm: ME, role: 'DC', w: 5, l: 7 }); state.meters.hot = 95; X().coInt = null; state.co.bossOut = 0; const hc0 = state.staff.HC.name; for (let i = 0; i < 40 && state.staff.HC.name === hc0; i++) coMidseason({ done: true, mResult: 'L' });
need(state.staff.HC.name !== hc0 || state.staff.HC.interim, 'a head coach on the hottest seat was never fired during the season'); need(state.co.bossOut === state.season, 'the firing was not recorded');
let seasons = 0; for (const [tid, role, seed] of [['RICE', 'LB', 11], ['UMASS', 'OC', 12], ['AKR', 'QB', 14]]) { mk(tid, role, seed); for (let y = 0; y < 5; y++) { let g = 0; while (state.phase !== 'offseason' && g++ < 60) { advance(); if (X().coInt) coIntAnswer(true); } seasons++; autoOffseason(); need(state.phase !== 'offseason', tid + ': the offseason did not finish'); need(state.staff[state.co.role] && state.staff[state.co.role].me, tid + ' ' + state.season + ': you are not on your own staff'); } }
out.seasons = seasons;

// 6. the job market: no dead end, a second wave, a counter-offer, inside openings
mk('TOL', 'QB', 1); toOff(); co = state.co; let m = co.market; co.fired = co.fired || { why: 'test', pay: 0 }; m.take = null; m.open.forEach(x => { if (x.offer) x.offer.status = 'walked'; }); m.interviews = 0;
need(!!marketBlocked(), 'a fired coach should have to find a job'); state.off.step = 1; ui.tab = 'off'; render(); need(/carousel/i.test(V().textContent), 'the job market page is missing its new section'); need(m.open.some(x => x.offer && x.offer.status !== 'walked'), 'a coach with no job, no offers and no interviews is stuck');
const safe = m.open.find(x => x.offer && x.offer.status !== 'walked'); if (safe) { need(acceptOffer(safe.id), 'the safety-net offer cannot be accepted'); const fm_ = finishMarket(); need(fm_ === true || fm_ === 'catchup', 'the safety-net job could not be taken'); }
mk('IOWA', 'DC', 5); toOff(); co = state.co; m = co.market; const n0 = m.open.length, i0 = m.interviews; const added = coSecondWave(); need(added >= 5 && m.open.length === n0 + added && m.interviews === i0 + 2 && m.open.filter(x => x.wave).every(x => x.why), 'the second wave did not add openings and interviews'); need(coSecondWave() === 0, 'the second wave should come once an offseason');
co.fired = null; co.sec = 75; co.contract.left = 2; m.home = m.home || { lvl: 'col', tid: ME, role: co.role, home: true, id: ME + ':' + co.role + ':home' }; m.home.offer = null; m.home.notRetained = false; m.ret = 0; const big = m.open.find(x => x.role === 'HC') || m.open[0]; big.offer = makeOffer(big.tid, big.role, null, false, jobLvl(big)); big.offer.k.sal = r2(co.contract.sal * 2);
need(coRetention() && m.home.offer && m.home.offer.k.sal > co.contract.sal, 'your school did not answer a better offer'); state.off.step = 1; ui.tab = 'off'; render(); need(!/could not be shown/.test(V().textContent) && /put a new deal on the table/.test(V().textContent), 'the job market page broke or does not show the counter-offer');
let inside = 0, mkts = 0; for (let seed = 20; seed < 60; seed++) { mk('IOWA', 'WR', seed); state.phase = 'regular'; const mm_ = buildMarket(); mkts++; if (mm_.open.some(x => x.inside && x.role === 'OC')) inside++; } out.inside = inside + ' of ' + mkts; need(inside >= 2, 'a position coach almost never sees his coordinator\'s job open: ' + inside + ' of ' + mkts);
out.wide = document.documentElement.scrollWidth; return out;
