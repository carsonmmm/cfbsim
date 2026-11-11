/* ===================== EXTRAS 3 (v9.15): the engine ===================== */
// Weekly game prep, the daily challenge, the "story so far" timeline; the AD's coaching search, stadium renovation,
// boosters and academics; the coach's defensive playbook, practice week, recruiting home visits and the two-minute
// drill; the GM's agents, trade deadline day and the new stadium vote; Player Career's Senior Bowl, Pro Bowl,
// position change, captaincy and Hall of Fame speech; the commissioner's prime-time picks, international games and
// championship site bids. No DOM here: the pages are extui3.js. Everything random comes from hmix() (or a borrowed,
// restored random stream), so the season's random numbers and old saves are untouched.
const x3h = k => hmix(String(typeof state !== 'undefined' && state && state.seed || 0) + ':x3:' + k);
const cx3h = k => hmix(String(typeof cs !== 'undefined' && cs && cs.seed || 0) + ':cx3:' + k);
const x3pick = (arr, v) => arr[Math.min(arr.length - 1, Math.floor(v * arr.length))];
// run a generator that uses R() on its own stream, then put the season's stream back
function x3Seeded(key, fn) { const s0 = RNG.s; RNG.s = (Math.floor(hmix(String(key)) * 4294967296) >>> 0) || 1; try { return fn(); } finally { RNG.s = s0; } }
const x3MyGame = wk => (state.games || []).find(g => g.wk === wk && (g.h === ME || g.a === ME));

/* ===================== 1. WEEKLY GAME PREP ===================== */
// Scouting on the next opponent (how often they run, and a weakness), and two keys to the game. A key aimed at the
// weakness is worth more. After the game, each key is checked against the box score.
const PREP_K = {
  run: ['Run the ball', 'off', 'runD', 'Rush for 150 yards'], pass: ['Throw it around', 'off', 'passD', 'Pass for 250 yards'], protect: ['Protect the quarterback', 'off', 'rush', 'Allow one sack or none'],
  stoprun: ['Stop the run', 'def', 'run', 'Hold them under 120 rushing yards'], pressure: ['Pressure the quarterback', 'def', 'passO', 'Three sacks or more'],
  ball: ['Win the turnover battle', 'both', 'ball', 'Fewer turnovers than them'], third: ['Get off the field', 'def', 'third', 'Hold them to 17 first downs or fewer'],
};
const PREP_W = { runD: 'their run defense is the weak spot', passD: 'their pass defense is the weak spot' }; const PREP_S = { run: 'a run-first offense', passO: 'a pass-first offense' };
function prepNext() { if (typeof state === 'undefined' || !state || isComm() || state.phase === 'offseason' || state.gameOver) return null; return x3MyGame(state.week) || null; }
function prepScout(g) {
  // the same unit ratings the office's scouting report uses
  if (!g) return null; const opp = g.h === ME ? g.a : g.h; const u = typeof oppUnits === 'function' && !isFCS(opp) ? oppUnits(opp) : { run: 0, pass: 0, runD: 0, passD: 0, lean: 0 };
  return { opp, run: Math.round(clamp(50 + (u.lean || 0) * 4 + (u.run - u.pass) * 2, 35, 68)), weak: u.runD <= u.passD ? 'runD' : 'passD', style: (u.lean || 0) + (u.run - u.pass) / 2 >= 0 ? 'run' : 'passO', rank: isPro() || isFCS(opp) ? 0 : rankOf(opp) };
}
function prepStore() { const x = X(); if (!x.prep || x.prep.s !== state.season) x.prep = { s: state.season, wk: {}, hist: (x.prep && x.prep.hist) || [] }; return x.prep; }
function prepSet(k) { const g = prepNext(); if (!g || !PREP_K[k]) return false; const S = prepStore(); const cur = S.wk[g.wk] || (S.wk[g.wk] = { gid: g.id, keys: [] }); const i = cur.keys.indexOf(k); if (i >= 0) cur.keys.splice(i, 1); else { if (cur.keys.length >= 2) cur.keys.shift(); cur.keys.push(k); } return true; }
function prepBonus(g) {
  const S = X().prep; const cur = S && S.s === state.season && S.wk[g.wk]; if (!cur || cur.gid !== g.id || !cur.keys.length) return { off: 0, def: 0 }; const sc = prepScout(g); const out = { off: 0, def: 0 };
  cur.keys.forEach(k => { const [, side, w] = PREP_K[k]; const v = w === sc.weak || w === sc.style ? 0.4 : 0.12; if (side === 'both') { out.off += v / 2; out.def += v / 2; } else out[side] += v; }); return out;
}
function prepGrade(g) {
  const S = X().prep; const cur = S && S.s === state.season && S.wk[g.wk]; if (!cur || cur.gid !== g.id || cur.res || !g.box) return null; const mi = g.h === ME ? 0 : 1; const me = g.box.t[mi], op = g.box.t[1 - mi];
  const ok = { run: me.ry >= 150, pass: me.py >= 250, protect: op.sk <= 1, stoprun: op.ry < 120, pressure: me.sk >= 3, ball: me.to < op.to, third: op.fd <= 17 };
  cur.res = cur.keys.map(k => [k, !!ok[k]]); S.hist.unshift({ s: state.season, wk: g.wk, opp: g.h === ME ? g.a : g.h, res: cur.res }); if (S.hist.length > 30) S.hist.length = 30; return cur.res;
}

/* ===================== 4. THE DAILY CHALLENGE ===================== */
// One school and one seed for everyone each day: play one season and post the score.
const x3Day = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function dailyToday() { const k = x3Day(); const ids = Object.keys(CTEAMS0_AD).filter(id => id !== 'MICH').sort(); return { k, id: 'daily-' + k, tid: ids[Math.floor(hmix('daily:' + k) * ids.length)], seed: 1 + Math.floor(hmix('dailyseed:' + k) * 2e9) }; }
const dailyOn = () => typeof state !== 'undefined' && state && state.chal && /^daily-/.test(String(state.chal.id || ''));

/* ===================== 5. THE STORY SO FAR ===================== */
function stLog(L, e) { L.push(e); if (L.length > 400) L.splice(0, L.length - 400); }
{
  const _an = addNews; addNews = function (txt, kind) { const r = _an.apply(this, arguments); try { if (kind === 'big' && typeof state !== 'undefined' && state && state.season) stLog(X().story || (X().story = []), { s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, t: String(txt) }); } catch (e) { } return r; };
}
function x3WrapCNews() { if (typeof cNews !== 'function' || cNews.x3) return; const _cn = cNews; cNews = function (txt, kind) { const r = _cn.apply(this, arguments); try { if (kind === 'big' && typeof cs !== 'undefined' && cs) stLog(CX().story || (CX().story = []), { y: cs.year, t: String(txt) }); } catch (e) { } return r; }; cNews.x3 = true; }
x3WrapCNews();
// the seasons and the big moments, newest first
function storyAD() {
  const items = (X().story || []).slice(); const seasons = isPro() ? (PS().hist || []).map(h => ({ s: h.s, line: `${h.w}-${h.l}${h.po ? ' · ' + ['', 'Wild card', 'Divisional round', 'Conference title game', 'Super Bowl loss', 'Super Bowl champions'][h.po] : ''}`, title: h.po === 5 }))
    : isComm() ? [] : (state.history || []).map(h => ({ s: h.season, line: `${h.w}-${h.l}${h.rank ? ' · No. ' + h.rank : ''}${h.bowl ? ' · ' + h.bowl : ''}`, title: h.champ === ME }));
  const by = {}; items.forEach(e => { (by[e.s] = by[e.s] || []).push(e); }); seasons.forEach(x => { by[x.s] = by[x.s] || []; });
  return Object.keys(by).map(Number).sort((a, b) => b - a).map(s => ({ s, season: seasons.find(x => x.s === s) || null, items: by[s].slice().reverse() }));
}
function storyC() {
  const items = (CX().story || []).slice(); const by = {}; items.forEach(e => { (by[e.y] = by[e.y] || []).push(e); }); (cs.p.seasons || []).forEach(e => { by[e.year] = by[e.year] || []; });
  return Object.keys(by).map(Number).sort((a, b) => b - a).map(y => ({ s: y, season: (cs.p.seasons || []).filter(e => e.year === y), items: by[y].slice().reverse() }));
}

/* ===================== 8. THE COACHING SEARCH (AD) ===================== */
// Hire a search firm for two more head coaching candidates, and interview candidates: their answers show what the
// ratings don't (integrity, loyalty, fit and how they handle the media), and those show up once he's hired.
const CSQ = { why: 'Why this job?', trouble: 'How do you handle trouble off the field?', stay: 'Where do you see yourself in five years?', media: 'How do you deal with the media?' };
const CS_TR = { why: 'fit', trouble: 'integ', stay: 'loyal', media: 'media' };
const csOn = () => typeof state !== 'undefined' && state && !isCoach() && !isComm() && !isPro();
function csTraits(c) { const h = k => x3h('cs:' + c.id + ':' + k); return { integ: Math.round(30 + h('i') * 70), loyal: Math.round(25 + h('l') * 75), fit: Math.round((h('f') - 0.5) * 8), media: Math.round(30 + h('m') * 70) }; }
function csStore() { const x = X(); if (!x.csr || x.csr.s !== state.season) x.csr = { s: state.season, left: 3, seen: {}, firm: false }; return x.csr; }
const CS_ANS = {
  fit: [[-2, 'He talks about the next job more than this one.'], [1, 'He knows the program and the recruiting map.'], [99, 'He has a plan for this exact roster, position by position.']],
  integ: [[45, 'He shrugs: "Kids will be kids."'], [70, 'Clear rules, and he enforces them.'], [101, 'He walks you through his compliance staff and how he hires them.']],
  loyal: [[45, '"Wherever the best opportunity is."'], [75, '"Here, if we\'re winning."'], [101, '"I want to retire here."']],
  media: [[45, 'He gets prickly with the question.'], [75, 'Polished, if a little guarded.'], [101, 'Warm and quotable. Reporters will love him.']],
};
function csAsk(cid, q) {
  if (!csOn() || !CSQ[q]) return null; const S = csStore(); const c = (state.cands.HC || []).find(x => x.id === cid); if (!c) return null; const seen = S.seen[cid] || (S.seen[cid] = {}); if (seen[q]) return seen[q];
  if (!seen.met) { if (S.left <= 0) return 'none'; S.left--; seen.met = 1; } const tr = csTraits(c); const k = CS_TR[q]; const v = tr[k]; const ans = CS_ANS[k].find(a => v < a[0]) || CS_ANS[k][CS_ANS[k].length - 1]; seen[q] = ans[1]; return ans[1];
}
function csFirmCost() { return r1(0.8 * econ() + 0.2); }
function csFirm() {
  if (!csOn()) return 'no'; const S = csStore(); if (S.firm) return 'done'; if (state.fin.balance < csFirmCost()) return 'money'; S.firm = true; state.fin.balance = r1(state.fin.balance - csFirmCost());
  const add = x3Seeded('firm:' + state.seed + ':' + state.season, () => genCandidates('HC', 2)); add.forEach(c => { ['off', 'def', 'rec', 'dev', 'gm'].forEach(k => { c[k] = clamp(c[k] + 4, 55, 96); }); c.bg = 'Found by the search firm: ' + c.bg; c.firm = true; });
  state.cands.HC = (state.cands.HC || []).concat(add); addNews(`${myName()} hires a search firm. Two more candidates are on the list.`); return 'ok';
}
{
  const _hc = hireCoach; hireCoach = function (role, cid) {
    const c = role === 'HC' && csOn() ? (state.cands.HC || []).find(x => x.id === cid) : null; const r = _hc.apply(this, arguments);
    try { if (c && r === 'hired') { const t = csTraits(c); c.rec = clamp(c.rec + t.fit, 40, 97); c.loyal = t.loyal; if (t.integ < 45) state.meters.risk = clamp((state.meters.risk || 0) + 6, 0, 100); if (t.media >= 75) mv('fan', 2); if (t.media < 45) mv('fan', -1); } } catch (e) { }
    return r;
  };
}

/* ===================== 9-11. RENOVATION, BOOSTERS, ACADEMICS (AD) ===================== */
const renoCost = () => r1(40 * econ() + 10);
function renoStore() { return X().reno || null; }
function renoStart() { if (!bizOn() || state.phase !== 'offseason') return 'when'; const R_ = X().reno; if (R_ && R_.st === 'build') return 'busy'; const c = renoCost(); if (state.fin.balance < c / 2) return 'money'; state.fin.balance = r1(state.fin.balance - c / 2); X().reno = { st: 'build', s: state.season + 1, cost: c, paid: c / 2, n: (R_ && R_.n || 0) + 1 }; addNews(`${myName()} announces a stadium renovation. Part of the stadium closes for the ${state.season + 1} season.`, 'big'); return 'ok'; }
// during the build year the gate is smaller; after it, bigger
function renoGateF() { const R_ = X().reno; if (!R_) return 1; if (R_.st === 'build' && state.season === R_.s) return 0.85; if (R_.st === 'done') return 1 + Math.min(2, R_.n) * 0.06; return 1; }
function renoOffseason() { const R_ = X().reno; if (!R_ || R_.st !== 'build' || state.season < R_.s) return; const rest = r1(R_.cost - R_.paid); state.fin.balance = r1(state.fin.balance - rest); R_.paid = R_.cost; R_.st = 'done'; R_.at = state.season; const f = (state.facilities || []).find(x => x.id === 'stadium'); if (f && f.lvl < 5) f.lvl++; mv('fan', 4); mv('boost', 3); addNews(`The renovated stadium is finished: better seats, more suites and a bigger gate.`, 'big'); }
const BST_N = ['Harlan Price', 'Delores Whitcomb', 'Rex Calloway', 'Marguerite Sato', 'Bud Kessler', 'Vivian Ashby', 'Clint Beaumont', 'Odessa Grant'];
const BST_K = { coach: 'Wants a say in coaching hires', suite: 'Wants his name on things', win: 'Pays for wins', facility: 'Loves buildings' };
function bstStore() { const x = X(); if (!x.bst) { const used = new Set(); x.bst = { list: ['coach', 'suite', 'win', 'facility'].slice(0, 3 + (x3h('bst3') < 0.5 ? 1 : 0)).map((k, i) => { let n = x3pick(BST_N, x3h('bn' + i)); while (used.has(n)) n = BST_N[(BST_N.indexOf(n) + 1) % BST_N.length]; used.add(n); return { n, k, mood: 60 }; }), ask: null, hist: [], pledge: null }; } return x.bst; }
function bstOffseason() {
  if (!bizOn()) return; const B = bstStore();
  if (B.pledge && B.pledge.s === state.season) { const h = (state.history || []).find(x => x.season === state.season); if (h && h.w >= 9) { state.fin.balance = r1(state.fin.balance + B.pledge.amt); addNews(`${B.pledge.n} pays up: ${fmM(B.pledge.amt)} for a nine-win season.`, 'win'); } B.pledge = null; }
  if (B.ask && !B.ask.done) { const d = B.list.find(x => x.n === B.ask.n); if (d) d.mood = clamp(d.mood - 8, 0, 100); }
  const d = B.list[Math.floor(x3h('bstask:' + state.season) * B.list.length)]; const amt = r1((2 + x3h('bsta:' + state.season) * 4) * econ());
  B.ask = { s: state.season, n: d.n, k: d.k, amt, done: false };
}
function bstAnswer(yes) {
  const B = bstStore(); const a = B.ask; if (!a || a.done) return null; a.done = true; a.yes = !!yes; const d = B.list.find(x => x.n === a.n); let txt = '';
  if (yes) {
    if (a.k === 'coach') { state.fin.balance = r1(state.fin.balance + a.amt); mv('board', -2); txt = `${a.n} gives ${fmM(a.amt)} and gets a seat in your next coaching search.`; }
    if (a.k === 'suite') { state.fin.balance = r1(state.fin.balance + a.amt); mv('fan', -1); txt = `The ${a.n.split(' ').pop()} Club opens on the suite level. ${fmM(a.amt)} in the bank.`; }
    if (a.k === 'win') { B.pledge = { s: state.season + 1, n: a.n, amt: r1(a.amt * 2) }; txt = `${a.n} pledges ${fmM(a.amt * 2)} if you win nine games next season.`; }
    if (a.k === 'facility') { const f = (state.facilities || []).find(x => x.id === 'weight') || (state.facilities || [])[0]; if (f && f.lvl < 5) f.lvl++; txt = `${a.n} pays for a new weight room.`; }
    if (d) d.mood = clamp(d.mood + 12, 0, 100); mv('boost', 2);
  } else { if (d) d.mood = clamp(d.mood - 18, 0, 100); mv('boost', -3); txt = `${a.n} is not happy, and the other boosters heard about it.`; }
  B.hist.unshift({ s: state.season, n: a.n, k: a.k, yes: !!yes }); if (B.hist.length > 12) B.hist.length = 12; addNews(txt, yes ? 'win' : 'bad'); return txt;
}
const ACAD_LV = [['Basic', 0], ['Tutors', 0.35], ['Full support', 0.8]];
function acadStore() { const x = X(); return x.acad || (x.acad = { lv: 1, hist: [], pen: null }); }
function acadSeason() {
  if (isComm() || isPro()) return null; const A = acadStore(); if (A.hist.some(x => x.s === state.season)) return null; const h = k => x3h('acad:' + state.season + ':' + k);
  const gpa = r2(clamp(2.55 + (facLvl('academic') - 3) * 0.08 + A.lv * 0.12 + (h('g') - 0.5) * 0.3 - (state.meters.risk || 0) / 400, 2.1, 3.6)); const apr = Math.round(clamp(905 + (gpa - 2.5) * 95 + (h('a') - 0.5) * 20, 880, 1000));
  const r = { s: state.season, gpa, apr }; A.hist.unshift(r); if (A.hist.length > 10) A.hist.length = 10;
  if (apr < 930) { A.pen = state.season + 1; addNews(`${myName()} posts an academic score of ${apr}, below the 930 line. The penalty: practice time and recruiting visits are cut next season.`, 'bad'); } else if (apr >= 980) mv('board', 2);
  return r;
}
const acadPen = () => { const A = typeof state !== 'undefined' && state && state.x && state.x.acad; return !!(A && A.pen === state.season); };

/* ===================== 12. THE DEFENSIVE PLAYBOOK (Coach) ===================== */
// Like the offense's: pick five to eight calls (each plays like one of the five defensive calls), and draw your own.
// Spots are yards from the line of scrimmage: [depth past the line (negative is into their backfield), across].
const DPB_FORM = { DE1: [1, -6], DT1: [1, -2], DT2: [1, 2], DE2: [1, 6], LB1: [5, -5], LB2: [5.5, 0], LB3: [5, 5], CB1: [7, -19], CB2: [7, 19], S1: [13, -9], S2: [13, 9] };
const DPB_ROLES = ['LB1', 'LB2', 'LB3', 'CB1', 'CB2', 'S1', 'S2'];
const DPB_PLAYS = {
  c3: { n: 'Cover 3', b: 'base', fit: ['d43', 'zone'], d: 'Three deep, four underneath. Safe against everything.', r: { CB1: [[16, -18]], CB2: [[16, 18]], S1: [[18, 0]], S2: [[7, 10]], LB1: [[8, -9]], LB2: [[9, 0]], LB3: [[6, 6]] } },
  q4: { n: 'Quarters', b: 'base', fit: ['d34', 'zone'], d: 'Four deep zones; the safeties fill hard against the run.', r: { CB1: [[15, -17]], CB2: [[15, 17]], S1: [[14, -7]], S2: [[14, 7]], LB1: [[6, -8]], LB2: [[7, 0]], LB3: [[6, 8]] } },
  bear: { n: 'Bear front', b: 'box', fit: ['d43', 'd34'], d: 'Everyone covered up front; a safety walks down.', r: { S2: [[3, 4], [0, 3]], LB2: [[2, 0]], LB1: [[3, -4]], LB3: [[3, 4]], CB1: [[8, -18]], CB2: [[8, 18]], S1: [[16, 0]] } },
  goal: { n: 'Goal line', b: 'box', fit: ['d43', 'd34', 'blitz', 'zone'], d: 'Eight in the box. Nothing gets through the middle.', r: { LB1: [[0.5, -4]], LB2: [[0.5, 0]], LB3: [[0.5, 4]], S1: [[2, -6]], S2: [[2, 6]], CB1: [[4, -16]], CB2: [[4, 16]] } },
  fire: { n: 'Fire zone', b: 'blitz', fit: ['blitz', 'd34'], d: 'Five rush, three deep, three under.', r: { LB1: [[-2, -3], [-6, -1]], LB3: [[-2, 3], [-6, 1]], CB1: [[16, -17]], CB2: [[16, 17]], S1: [[17, 0]], S2: [[7, 6]], LB2: [[8, 0]] } },
  agap: { n: 'Double A-gap', b: 'blitz', fit: ['blitz'], d: 'Both linebackers shoot the middle gaps.', r: { LB1: [[0, -1], [-6, -0.5]], LB2: [[0, 1], [-6, 0.5]], LB3: [[6, 7]], CB1: [[10, -19]], CB2: [[10, 19]], S1: [[15, -6]], S2: [[15, 6]] } },
  cblz: { n: 'Corner blitz', b: 'blitz', fit: ['blitz', 'd43'], d: 'A corner comes off the edge; the safety rotates over.', r: { CB1: [[1, -14], [-6, -4]], S1: [[12, -16]], S2: [[17, 2]], CB2: [[10, 19]], LB1: [[7, -7]], LB2: [[8, 0]], LB3: [[7, 7]] } },
  c2: { n: 'Cover 2', b: 'zone', fit: ['zone', 'd43'], d: 'Two deep halves; the corners squat in the flats.', r: { S1: [[18, -10]], S2: [[18, 10]], CB1: [[5, -16]], CB2: [[5, 16]], LB1: [[9, -7]], LB2: [[10, 0]], LB3: [[9, 7]] } },
  tampa: { n: 'Tampa 2', b: 'zone', fit: ['zone'], d: 'Cover 2, and the middle linebacker runs to the deep middle.', r: { S1: [[19, -11]], S2: [[19, 11]], LB2: [[16, 0]], CB1: [[5, -16]], CB2: [[5, 16]], LB1: [[8, -7]], LB3: [[8, 7]] } },
  c1: { n: 'Cover 1 robber', b: 'man', fit: ['d43', 'blitz'], d: 'Man coverage with a robber in the middle.', r: { CB1: [[12, -18]], CB2: [[12, 18]], S1: [[18, 0]], S2: [[9, 0]], LB1: [[5, -6]], LB3: [[5, 6]], LB2: [[4, 0]] } },
  c0: { n: 'Cover 0', b: 'man', fit: ['blitz'], d: 'Everyone in man, everyone else comes. All or nothing.', r: { LB2: [[0, 0], [-6, 0]], S2: [[2, 5], [-6, 2]], CB1: [[12, -18]], CB2: [[12, 18]], S1: [[10, -6]], LB1: [[5, -7]], LB3: [[5, 7]] } },
  press: { n: 'Press man', b: 'man', fit: ['d34', 'zone'], d: 'Corners in their faces at the line.', r: { CB1: [[1, -19], [14, -18]], CB2: [[1, 19], [14, 18]], S1: [[17, -8]], S2: [[17, 8]], LB1: [[6, -6]], LB2: [[6, 0]], LB3: [[6, 6]] } },
};
const DPB_MIN = 5, DPB_MAX = 8, DPB_CUSTOM = 3;
const dpbOn = () => isCoach() && ['HC', 'DC'].includes(state.co.role);
function dpbStore() { const x = X(); if (!x.dpb) { const sch = typeof myScheme === 'function' ? myScheme().def : 'd43'; const ks = Object.keys(DPB_PLAYS); const by = b => ks.filter(k => DPB_PLAYS[k].b === b).sort((a, c) => (DPB_PLAYS[c].fit.includes(sch) ? 1 : 0) - (DPB_PLAYS[a].fit.includes(sch) ? 1 : 0)); x.dpb = { on: ['base', 'box', 'blitz', 'zone', 'man'].map(b => by(b)[0]).concat([by('blitz')[1], by('zone')[1]]), custom: [], set: false, seq: 0 }; } return x.dpb; }
function dpbDef(id) { if (DPB_PLAYS[id]) return Object.assign({ id }, DPB_PLAYS[id]); const B = X().dpb; const c = B && B.custom.find(x => x.id === id); return c ? Object.assign({ fit: [], d: 'Your own call.' }, c) : null; }
function dpbToggle(id) { if (!dpbOn()) return 'role'; const B = dpbStore(); if (!dpbDef(id)) return 'none'; const i = B.on.indexOf(id); if (i >= 0) { if (B.on.length <= DPB_MIN) return 'min'; B.on.splice(i, 1); } else { if (B.on.length >= DPB_MAX) return 'max'; B.on.push(id); } B.set = true; return 'ok'; }
function dpbFit() { const B = X().dpb; if (!B) return { n: 0, fit: 0, kinds: 0 }; const sch = myScheme().def; const L = B.on.map(dpbDef).filter(Boolean); return { n: L.length, fit: L.filter(d => (d.fit || []).includes(sch)).length, kinds: new Set(L.map(d => d.b)).size, custom: L.filter(d => d.cr).length }; }
function dpbBonus() { if (!dpbOn()) return 0; const B = X().dpb; if (!B || !B.set) return 0; const f = dpbFit(); if (!f.n) return 0; return r2(clamp((f.fit + f.custom * 0.5) / f.n - 0.5, -0.4, 0.4) + (f.kinds >= 4 ? 0.05 : -0.25)); }
function dpbSave(o) {
  if (!dpbOn()) return 'role'; const B = dpbStore(); const name = String(o.n || '').replace(/[<>]/g, '').trim().slice(0, 28); if (!name) return 'name'; if (!DCALLS[o.b]) return 'kind';
  const r = {}; DPB_ROLES.forEach(k => { const L = (o.r && o.r[k]) || []; const pts = L.slice(0, 3).map(p => [clamp(Math.round(+p[0] * 2) / 2, -8, 30), clamp(Math.round(+p[1] * 2) / 2, -24.5, 24.5)]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])); if (pts.length) r[k] = pts; });
  if (!Object.keys(r).length) return 'routes'; const was = o.id ? B.custom.find(c => c.id === o.id) : null; if (!was && B.custom.length >= DPB_CUSTOM) return 'max';
  const play = { id: was ? was.id : 'dc' + (++B.seq), n: name, b: o.b, r, cr: true, fit: [] }; if (was) Object.assign(was, play); else { B.custom.push(play); if (B.on.length < DPB_MAX) B.on.push(play.id); } B.set = true; return 'ok';
}
function dpbDelete(id) { const B = dpbStore(); const c = B.custom.find(x => x.id === id); if (!c) return false; B.custom = B.custom.filter(x => x !== c); B.on = B.on.filter(x => x !== id); while (B.on.length < DPB_MIN) { const add = Object.keys(DPB_PLAYS).find(k => !B.on.includes(k)); if (!add) break; B.on.push(add); } return true; }
function dpbCalls() { if (!dpbOn()) return null; return dpbStore().on.map(dpbDef).filter(Boolean); }
// what the field view needs: defenders' paths (rushers go into the backfield), and whether it's a blitz
function dpbCr(d) { if (!d || !d.r) return null; const blitz = d.b === 'blitz' || Object.values(d.r).some(pts => pts.some(p => p[0] < 0)); return { r: d.r, blitz }; }

/* ===================== 13. THE PRACTICE WEEK (Coach) ===================== */
// On top of the head coach's practice plan: walkthroughs to install the playbooks, rest days, and team fatigue.
// Hard weeks build fatigue (more injuries, slower legs); rest takes it off but costs sharpness.
function pracStore() { const x = X(); return x.prac || (x.prac = { inst: 0, rest: 0, fat: 20 }); }
const pracOn = () => isCoach() && state.co.role === 'HC';
function pracSet(k, v) { if (!pracOn() || !['inst', 'rest'].includes(k)) return false; pracStore()[k] = clamp(Math.round(+v), 0, 2); return true; }
function pracWeek() { if (!pracOn()) return; const P_ = pracStore(); const pl = state.pplan || { off: 2, def: 2, cond: 2, film: 2 }; const hard = (pl.off + pl.def + pl.film) - 6; P_.fat = clamp(Math.round(P_.fat + 6 + hard * 2 + P_.inst * 3 - P_.rest * 9 - (pl.cond - 2) * 2), 0, 100); }
function pracFx() { if (!pracOn()) return { off: 0, def: 0, inj: 1 }; const P_ = pracStore(); const f = P_.fat / 100; const inst = (pbkBonus() !== 0 || dpbBonus() !== 0) ? P_.inst * 0.12 : P_.inst * 0.04; return { off: r2(inst - P_.rest * 0.08 - f * 0.5), def: r2(inst - P_.rest * 0.08 - f * 0.5), inj: r2((1 + f * 0.6) * (1 - P_.rest * 0.08)) }; }

/* ===================== 14. RECRUITING HOME VISITS ===================== */
// Sit down with a recruit and his family: three questions. Answers that match what he cares about move his interest.
const HV_PRI = { play: 'Playing time', nil: 'Money', school: 'Academics', home: 'Close to home', win: 'Winning' };
const HV_Q = [
  ['His mother asks what kind of program you run.', [['win', 'We win, and we\'re building something bigger.'], ['school', 'Degrees first. Our graduation rate speaks for itself.'], ['home', 'We\'re family, and he\'ll be close to home.']]],
  ['He asks how soon he\'d play.', [['play', 'If you\'re the best, you start on day one.'], ['win', 'Nobody\'s promised anything. Winners compete.'], ['nil', 'Our collective takes care of the guys who play.']]],
  ['His father asks why your school, of all of them.', [['nil', 'We\'ll make sure he\'s taken care of.'], ['school', 'The degree lasts longer than football.'], ['play', 'Look at our depth chart. There\'s a spot open.']]],
];
function hvPri(r) { const ks = Object.keys(HV_PRI); const a = Math.floor(x3h('hv1:' + r.id) * 5); let b = Math.floor(x3h('hv2:' + r.id) * 4); if (b >= a) b++; const pri = [ks[a], ks[b]]; if (r.inState && !pri.includes('home') && x3h('hv3:' + r.id) < 0.5) pri[1] = 'home'; return pri; }
function hvStore() { const x = X(); const key = state.phase === 'offseason' ? state.season + ':off' : state.season + ':' + state.week; if (!x.hv || x.hv.key !== key) x.hv = { key, used: 0, done: (x.hv && x.hv.done) || {} }; return x.hv; }
const hvMax = () => (state.phase === 'offseason' ? 3 : 2);
function hvList() { if (!state.rec || isPro() || isComm()) return []; const done = hvStore().done; return state.rec.list.filter(r => r.status === 'open' && r.offered && r.star >= 3 && !done[r.id]).sort((a, b) => b.star - a.star || b.interest - a.interest).slice(0, 8); }
function hvVisit(rid, ans) {
  const r0 = state.rec && state.rec.list.find(x => x.id === rid); if (r0 && isCoach() && state.co.role !== 'HC' && typeof rolePositions === 'function' && !rolePositions(state.co.role).includes(r0.pos)) return { ok: false, txt: 'That recruit belongs to another coach on the staff.' };
  const H = hvStore(); if (H.used >= hvMax()) return { ok: false, txt: 'No more home visits this week.' }; const r = state.rec && state.rec.list.find(x => x.id === rid); if (!r || H.done[rid]) return { ok: false, txt: '' };
  const pri = hvPri(r); let d = 0; (ans || []).forEach(k => { d += pri.includes(k) ? 6 : -1; }); d = clamp(d, -3, 18); H.used++; H.done[rid] = { s: state.season, d };
  const before = r.interest; r.interest = clamp(Math.round(r.interest + d), 1, 99); r.trend = r.interest - before;
  return { ok: true, d, pri, txt: d >= 12 ? `${r.n} and his family loved it. He's much more interested.` : d >= 5 ? `A good visit. ${r.n} is warming up to you.` : d >= 0 ? `It went fine. Not much changed.` : `The family wasn't impressed.` };
}

/* ===================== 15. THE TWO-MINUTE DRILL (live games) ===================== */
// Run the last drive yourself: the clock runs between plays unless you get out of bounds, spike it or call a
// timeout. Results come from your offense against their defense, and from hmix(), not the game's random numbers.
const TMD = { side: ['Sideline pass', 'Stops the clock if he gets out of bounds.'], mid: ['Pass over the middle', 'More yards; the clock keeps running.'], deep: ['Deep shot', 'A big play or nothing. Risky.'], run: ['Run', 'Safe, but the clock runs.'], spike: ['Spike it', 'Stops the clock. Costs a down.'] };
function tmdStart(sim) { const p = sim.pending; if (!p || p.type !== '2min') return null; const m = String(p.drv && p.drv.clock || '2:00').split(':'); const clk = clamp((+m[0] || 2) * 60 + (+m[1] || 0), 40, 150); return (sim.tmd = { yl: 25, clk, to: 2, down: 1, togo: 10, n: 0, log: [], done: null, edge: clamp((sim.F[sim.mSide].off - sim.F[1 - sim.mSide].def) / 10, -0.6, 0.6) }); }
function tmdPlay(sim, k) {
  const D = sim.tmd; if (!D || D.done || (!TMD[k] && k !== 'to')) return D; const h = q => hmix((sim.ckKey || '') + ':tmd:' + D.n + ':' + k + ':' + q); D.n++; const e = D.edge * 0.08;
  if (k === 'to') { if (D.to <= 0) return D; D.to--; D.stop = true; D.log.push(`Timeout. ${D.to} left.`); return D; }
  if (k === 'spike') { D.clk -= 3; D.down++; D.log.push('Spiked to stop the clock.'); }
  else {
    let y = 0, run = 0, txt = '', oob = false; const v = h('v');
    if (k === 'side') { if (v < 0.66 + e) { y = Math.round(6 + h('y') * 8); oob = h('o') < 0.7; txt = `Complete on the sideline for ${y}${oob ? ', out of bounds' : ''}.`; } else txt = 'Incomplete.'; run = oob || !y ? 6 : 22; }
    if (k === 'mid') { if (v < 0.6 + e) { y = Math.round(10 + h('y') * 10); txt = `Complete over the middle for ${y}.`; run = 28; } else if (v > 0.97 - e / 2) { D.done = 'to'; D.log.push('Intercepted over the middle!'); return D; } else { txt = 'Incomplete.'; run = 6; } }
    if (k === 'deep') { if (v < 0.32 + e) { y = Math.round(22 + h('y') * 26); txt = `Deep ball, caught for ${y}!`; run = 10; } else if (v > 0.93 - e / 2) { D.done = 'to'; D.log.push('The deep shot is intercepted!'); return D; } else { txt = 'The deep shot falls incomplete.'; run = 8; } }
    if (k === 'run') { y = Math.round(2 + h('y') * 7 + (h('b') < 0.08 ? 15 : 0)); txt = `Run for ${y}.`; run = 34; }
    if (h('sk') < (k === 'deep' ? 0.08 : k === 'run' ? 0 : 0.04) - e / 3) { y = -Math.round(5 + h('sy') * 5); txt = `Sacked for a loss of ${-y}.`; run = 32; }
    if (D.stop) { run = Math.min(run, 6); D.stop = false; } D.clk -= run; D.yl = clamp(D.yl + y, 1, 100); D.togo -= y; D.log.push(txt);
    if (D.yl >= 100) { D.done = 'td'; D.log.push('Touchdown!'); return D; }
    if (D.togo <= 0) { D.down = 1; D.togo = Math.min(10, 100 - D.yl); } else D.down++;
  }
  if (D.down > 4) { D.done = 'downs'; D.log.push('Turnover on downs.'); } else if (D.clk <= 0) { D.clk = 0; D.done = 'downs'; D.log.push('Time runs out.'); }
  return D;
}
function tmdKick(sim) { const D = sim.tmd; if (!D || D.done || 117 - D.yl > 58) return D; D.done = 'fg'; D.fg = 117 - D.yl; D.log.push(`Field goal try from ${D.fg} yards.`); return D; }
{
  const _rd = resolveDecision; resolveDecision = function (sim, drv, choice) {
    if (typeof choice === 'string' && choice.startsWith('xd:') && drv.dec && drv.dec.type === '2min') { const D = sim.tmd || {}; const out = choice.slice(3); drv.choice = 'drill'; drv.out = ['td', 'fg', 'to', 'downs'].includes(out) ? out : 'downs'; drv.yards = Math.max(0, (D.yl || 25) - 25); if (drv.out === 'td') drv.yards = 75; if (drv.out === 'fg') drv.fgDist = clamp(D.fg || 45, 19, 60); drv.drill = true; sim.tmd = null; return execDrive(sim, drv); }
    return _rd.apply(this, arguments);
  };
}

/* ===================== 16. GM_AGENTS (NFL GM) ===================== */
// Every player has an agent, and agents bargain differently: a shark asks for more and walks sooner, a friend of the
// club gives a discount to a player who likes you, a grinder wants more years.
const GM_AGENTS = [['Rick Delacroix', 'shark'], ['Sondra Vale', 'fair'], ['Tommy Okafor', 'friend'], ['Gil Pressman', 'long'], ['Nadia Brandt', 'shark'], ['Calvin Reyes', 'fair'], ['Beth Lockhart', 'friend'], ['Marty Shoals', 'long']];
const AGENT_ST = { shark: ['Shark', 'Asks for more and walks fast.'], fair: ['By the book', 'A fair ask, a fair process.'], friend: ['Friend of the club', 'A discount if his client likes it here.'], long: ['Grinder', 'Wants an extra year on every deal.'] };
const gmAgentOf = p => { const a = GM_AGENTS[Math.floor(hmix('agent:' + p.id) * GM_AGENTS.length)]; return { n: a[0], st: a[1] }; };
{
  const _af = askFor; askFor = function (p, ext) { const before = p.ask; const a = _af.apply(this, arguments); if (a && a !== before && !a.ag) { a.ag = 1; const g = gmAgentOf(p); if (g.st === 'shark') a.apy = r2(a.apy * 1.07); else if (g.st === 'friend' && rapOf(p) >= 55) a.apy = r2(a.apy * 0.94); else if (g.st === 'long') { a.yrs = Math.min(6, a.yrs + 1); a.apy = r2(a.apy * 0.98); } } return a; };
  const _oo = offerOwn; offerOwn = function (pid, apy, yrs, sh) {
    const p = P(pid); const g = p ? gmAgentOf(p) : null; const a = p && p.ask;
    if (p && g && g.st === 'friend' && a && !a.walk && rapOf(p) >= 55 && r2(apy * shapeV(sh)) >= a.apy * 0.9 && Math.abs(Math.round(yrs) - a.yrs) <= 1) a.apy = r2(Math.min(a.apy, apy * shapeV(sh) / 0.95));
    const r = _oo.apply(this, arguments); if (r === 'counter' && g && g.st === 'shark' && p.ask && p.ask.round >= 2) { p.ask.walk = true; return 'walk'; } return r;
  };
}

/* ===================== 18. TRADE DEADLINE DAY (NFL GM) ===================== */
function x3Offer(pid, tid, key, exp) {
  const L = PS(); const p = P(pid); if (!p || !T(tid)) return null; const h = q => x3h(key + ':' + q); const val = tradeValue(p); const want = val * (0.85 + h('v') * 0.3);
  let give = [], sum = 0; const their = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === tid).sort((a, b) => pickPts(b.pk) - pickPts(a.pk)); for (const x of their) { if (sum >= want * 0.95) break; if (sum + pickPts(x.pk) <= want * 1.2) { give.push(x.i); sum += pickPts(x.pk); } }
  if (sum < want * 0.75) return null; const o = { id: 'dd' + state.season + '_' + pid + '_' + tid, s: state.season, tid, exp, dd: true, get: { pl: [pid], pk: [] }, give: { pl: [], pk: give } }; L.tradeOffers = (L.tradeOffers || []).filter(x => x.id !== o.id).concat([o]); return o;
}
function tddRun() {
  if (!isGM() || state.phase === 'offseason' || state.week !== 9) return null; const x = X(); if (x.tdd && x.tdd.s === state.season) return x.tdd;
  const D = x.tdd = { s: state.season, rum: [], n: 0 }; const mine = state.roster.filter(p => underContract(p) && !p.hold).sort((a, b) => tradeValue(b) - tradeValue(a)).slice(0, 6);
  const clubs = NFL.map(t => t.id).filter(id => id !== ME && T(id)); const h = q => x3h('tdd:' + state.season + ':' + q);
  mine.slice(0, 4).forEach((p, i) => { const tid = clubs.filter(id => capRoom(id) >= capHit(p) - 0.5).sort((a, b) => posNeed(b, p.pos) - posNeed(a, p.pos))[Math.floor(h('c' + i) * 3)]; if (tid && h('go' + i) < 0.75 && x3Offer(p.id, tid, 'tdd:' + state.season + ':' + i, state.week)) { D.n++; D.rum.push(`${teamName(tid)} call about ${p.pos} ${p.n}.`); } });
  const pairs = [0, 1, 2].map(i => [clubs[Math.floor(h('a' + i) * clubs.length)], clubs[Math.floor(h('b' + i) * clubs.length)]]).filter(([a, b]) => a !== b);
  const POS = ['QB', 'WR', 'CB', 'DE', 'LB', 'RB', 'S', 'TE']; pairs.forEach(([a, b], i) => D.rum.push(x3pick([`Rumor: ${teamName(a)} and ${teamName(b)} are talking about a ${x3pick(POS, h('p' + i))}.`, `${teamName(a)} trade a day-three pick to ${teamName(b)} for depth at ${x3pick(POS, h('q' + i))}.`, `Sources: ${teamName(a)} are shopping their veteran ${x3pick(POS, h('r' + i))}.`], h('t' + i))));
  addNews(`Trade deadline day: ${D.n ? D.n + ' club' + (D.n === 1 ? '' : 's') + ' called about your players. The offers expire tonight.' : 'the phones are ringing around the league.'}`); return D;
}

/* ===================== 19. THE NEW STADIUM (NFL GM) ===================== */
const STAD_CITIES = ['San Antonio', 'Portland', 'Oklahoma City', 'Salt Lake City', 'Columbus', 'Austin', 'Sacramento', 'Birmingham'];
function stadStore() { return X().stad || null; }
function stadOffseason() { if (!isGM() || isOwner()) return; const x = X(); const S = x.stad; if (S && S.st === 'build' && state.season >= S.done) { S.st = 'open'; mv('fan', 6); addNews(`The ${myName()} open their new stadium.`, 'big'); return; } if (S && S.st !== 'idle') return; const yrs = (PS().hist || []).length; if (yrs >= 2 && x3h('stad:' + state.season) < 0.3) x.stad = { st: 'ask', s: state.season }; }
function stadChoose(k) {
  const S = stadStore(); if (!S) return null; const L = PS(); const sec = d => { if (L.gm) L.gm.sec = clamp(L.gm.sec + d, 0, 100); };
  if (S.st === 'ask') {
    if (k === 'stay') { S.st = 'idle'; S.s = state.season; sec(-2); addNews('The owner shelves his stadium plans, for now.'); return 'The owner is disappointed, but the plan is shelved.'; }
    if (k === 'private') { S.st = 'build'; S.done = state.season + 3; sec(-3); addNews(`The ${myName()} will build a new stadium with the owner's money. It opens in ${S.done}.`, 'big'); return `The owner pays for it himself. It opens in ${S.done}.`; }
    if (k === 'public') { const w = (PS().hist || []).slice(-2).reduce((s, h) => s + h.w, 0); const p = clamp(0.3 + (state.meters.fan - 50) / 150 + (w - 16) / 40, 0.12, 0.8); const yes = x3h('stadv:' + state.season) < p; if (yes) { S.st = 'build'; S.done = state.season + 3; sec(4); addNews(`Voters approve public money for a new ${myName()} stadium. It opens in ${S.done}.`, 'big'); return 'The vote passes!'; } S.st = 'move'; sec(-2); addNews('Voters reject the stadium plan. The owner starts talking to other cities.', 'bad'); return 'The vote fails. The owner is looking at other cities.'; }
  }
  if (S.st === 'move') {
    if (k === 'stay') { S.st = 'idle'; S.s = state.season; sec(-5); mv('fan', 3); addNews(`The ${myName()} stay put. The owner isn't happy about it.`); return 'You talked him into staying.'; }
    if (STAD_CITIES.includes(k)) { const t = T(ME); const nick = String(t.name).split(' ').pop(); const nm = `${k} ${nick}`; t.name = nm; t.city = k; const K = tpkStore(); (K.t[ME] = K.t[ME] || {}).n = nm; if (NFL_BY[ME]) NFL_BY[ME].name = nm; S.st = 'build'; S.done = state.season + 2; S.city = k; mv('fan', -15); sec(6); addNews(`The franchise relocates: say hello to the ${nm}. A new stadium opens in ${S.done}.`, 'big'); return `The team moves to ${k}.`; }
  }
  return null;
}
const stadHome = () => { const S = typeof state !== 'undefined' && state && state.x && state.x.stad; return S && S.st === 'open' ? 0.3 : 0; };

/* ===================== 20-23. PLAYER CAREER ===================== */
// 20. The Senior Bowl (before the draft) and the Pro Bowl (after a big NFL season)
function sbOn() { if (!xCareer() || cs.phase !== 'coloff' || !cs.off || !cs.off.steps.includes('draft') || cs.done) return false; return typeof draftEligible === 'function' && (draftEligible() || (typeof outOfEligibility === 'function' && outOfEligibility())); }
function sbStore() { const X_ = CX(); if (!X_.sb || X_.sb.y !== cs.year) X_.sb = { y: cs.year, inv: null, done: {}, bonus: 0, game: null }; const S = X_.sb; if (S.inv == null) S.inv = cOvr(cs.p) >= 66 || (cs.p.stars0 || 0) >= 4 || (cs.p.awards || []).some(a => a.lvl === 'col'); return S; }
const SB_DRILLS = { pos: 'One-on-ones', talk: 'Team interviews' };
function sbFinish(k, perf) { const S = sbStore(); if (!S.inv || S.done[k] != null || !SB_DRILLS[k]) return null; S.done[k] = r2(clamp(perf, 0, 1)); const v = Object.values(S.done); S.bonus = r2(v.reduce((a, b) => a + b, 0) / Object.keys(SB_DRILLS).length * 1.6 - 0.3);
  if (Object.keys(S.done).length === Object.keys(SB_DRILLS).length && !S.game) { const h = q => cx3h('sbg:' + cs.year + ':' + q); S.game = { mvp: S.bonus >= 1.1 && h('m') < 0.6, line: typeof lineText === 'function' ? '' : '' }; if (S.game.mvp) { S.bonus = r2(S.bonus + 0.4); cNews(`${cName(cs.p)} is named MVP of the Senior Bowl.`, 'big'); } else cNews(`${cName(cs.p)} plays well at the Senior Bowl.`); }
  return S.done[k];
}
{ const _dp = draftProjection; draftProjection = function () { let v = _dp.apply(this, arguments); try { const S = cs.x && cs.x.sb; if (S && S.y === cs.year && S.inv) v = r1(v + S.bonus); } catch (e) { } return v; }; }
function pbOn() { const X_ = CX(); return !!(X_.pb && !X_.pb.played && cs.phase === 'nfloff'); }
function pbSelect() { const e = (cs.p.seasons || []).filter(s => s.lvl === 'nfl').slice(-1)[0]; if (!e || e.year !== cs.year && e.year !== cs.year - 1) return; const big = (e.ratio || 0) >= (cs.balV >= 2 ? 1.4 + cHonorBar() : 1.22) || /* Updated balance: the same bar as the season honors (BAL-16) */ (e.awards || []).some(a => /All-Pro|MVP|Player of the Year/.test(a)); if (!big || (e.awards || []).includes('Pro Bowl')) return; giveAward(e, 'Pro Bowl'); CX().pb = { y: cs.year, played: false, e: e.year }; cNews(`${cName(cs.p)} is named to the Pro Bowl.`, 'big'); }
function pbPlay(perf) { const X_ = CX(); const B = X_.pb; if (!B || B.played) return null; B.played = true; B.perf = r2(perf); const e = (cs.p.seasons || []).find(s => s.lvl === 'nfl' && s.year === B.e); if (perf >= 0.85 && e) { giveAward(e, 'Pro Bowl MVP'); cNews(`${cName(cs.p)} wins Pro Bowl MVP.`, 'big'); B.mvp = true; } return B; }
// 21. A position change: the coaches ask you to move. Only between positions that share a kind of stat line.
const PC_MAP = { WR: 'TE', TE: 'WR', CB: 'S', S: 'LB', LB: 'DE', DE: 'DT', DT: 'DE' };
function pcSync() {
  if (!xCareer() || !['coloff', 'nfloff'].includes(cs.phase) || cs.p.two) return null; const X_ = CX(); if (X_.pc) return X_.pc.y === cs.year && X_.pc.st === 'offer' ? X_.pc : null; const to = PC_MAP[cs.p.pos]; if (!to) return null;
  if (cx3h('pc:' + cs.year) < 0.3 || (cs.p.trust || 50) < 48) { X_.pc = { y: cs.year, from: cs.p.pos, to, st: 'offer' }; return X_.pc; } return null;
}
function pcAnswer(yes) {
  const X_ = CX(); const C = X_.pc; if (!C || C.st !== 'offer') return null; C.st = yes ? 'yes' : 'no';
  if (!yes) { cs.p.trust = clamp(cs.p.trust - 3, 0, 100); cNews(`${cName(cs.p)} turns down a move to ${C.to}.`); return C; }
  const p = cs.p; const ovr = cOvr(p); const old = p.a; const a = {}; CATTR[C.to].forEach(([k], i) => { a[k] = old[k] != null ? old[k] : clamp(Math.round(ovr - 4 + (cx3h('pca:' + k) - 0.5) * 8), 35, 95); });
  (p.seasons || []).forEach(e => { if (!e.pos) e.pos = C.from; }); p.a = a; p.pos = C.to; p.style = CSTYLES[C.to][0][0]; p.trust = clamp(p.trust + 6, 0, 100); cNews(`${cName(p)} moves from ${C.from} to ${C.to}. The coaches love the attitude.`, 'big'); return C;
}
// 22. Captain: the team votes before each season; as captain you settle locker-room trouble, and chemistry helps.
function capStore() { const X_ = CX(); if (!X_.cap || X_.cap.y !== cs.year) { const p = cs.p; const lvlOk = cs.lvl === 'col' ? (cs.col && cs.col.years >= 2) : cs.lvl === 'nfl' ? (cs.nfl && cs.nfl.yrs >= 2) : (cs.hs && cs.hs.cls >= 2); const is = !!(lvlOk && (p.trust || 0) >= 58 && cx3h('cap:' + cs.year) < 0.35 + ((p.trust || 0) - 58) / 60); X_.cap = { y: cs.year, is, chem: X_.cap ? Math.round(X_.cap.chem / 2) : 0, ev: null, hist: (X_.cap && X_.cap.hist) || [] }; if (is) cNews(`${cName(p)} is voted a team captain.`, 'big'); } return X_.cap; }
const CAP_EV = [['Two starters got into it at practice, and the locker room picked sides.'], ['A senior is skipping film sessions, and the young guys are noticing.'], ['The offense and the defense are sniping at each other after a loss.'], ['A teammate is posting about his playing time online.']];
const CAP_CH = { private: ['Talk to them one on one', 'Quiet and steady.'], meeting: ['Call a players-only meeting', 'Big swing: it can bring the team together, or not.'], coaches: ['Let the coaches handle it', 'Safe. The coaches like it; nothing changes much.'] };
function capWeek() { if (!xCareer() || !['hs', 'col', 'nfl'].includes(cs.phase)) return; const C = capStore(); if (!C.is || C.ev) return; if (cx3h('capev:' + cs.year + ':' + cs.week) < 0.22) C.ev = { wk: cs.week, i: Math.floor(cx3h('capi:' + cs.year + ':' + cs.week) * CAP_EV.length) }; }
function capChoose(k) { const C = capStore(); if (!C.ev || !CAP_CH[k]) return null; const ok = k !== 'meeting' || cx3h('capm:' + cs.year + ':' + C.ev.wk) < 0.6; const d = k === 'private' ? 3 : k === 'meeting' ? (ok ? 6 : -3) : 0; C.chem = clamp(C.chem + d, -10, 15); if (k === 'coaches') cs.p.trust = clamp(cs.p.trust + 2, 0, 100); if (k === 'private') cs.p.trust = clamp(cs.p.trust + 1, 0, 100); C.hist.unshift({ y: cs.year, wk: C.ev.wk, k, d }); if (C.hist.length > 12) C.hist.length = 12; C.ev = null; return { d, ok }; }
{
  const _mg = myGameSpec; myGameSpec = function () { const sp = _mg.apply(this, arguments); try { const C = cs.x && cs.x.cap; if (sp && C && C.y === cs.year && C.chem) { const mi = sp.lvl === 'hs' ? (sp.home ? 0 : 1) : sp.ids.indexOf(cs.nfl ? cs.nfl.tm : cs.col ? cs.col.tid : ''); if (mi >= 0 && sp.base && sp.base[mi]) { const b = sp.base[mi]; sp.base = sp.base.slice(); sp.base[mi] = Object.assign({}, b, { off: b.off + C.chem * 0.03, def: b.def + C.chem * 0.03 }); } } } catch (e) { } return sp; };
}
// 23. The Hall of Fame speech: pick the moments and the people to thank
function hofOn() { return xCareer() && cs.phase === 'retired' && cs.nfl && cs.nfl.retired && cs.nfl.retired.hof >= 75; }
function hofMoments() { const p = cs.p; const out = (p.awards || []).filter(a => /Heisman|MVP|Super Bowl|All-Pro|Pro Bowl|National|Player of the Year|All-American/.test(a.a)).map(a => ({ k: 'a' + a.y + a.a, t: `${a.a}, ${a.y}` })); (p.seasons || []).filter(e => (e.ratio || 0) >= 1.4).forEach(e => out.push({ k: 's' + e.year, t: `The ${e.year} season with ${e.lvl === 'nfl' ? nflName(e.team) : e.lvl === 'col' ? cTeamName(e.team) : e.team}` })); const seen = new Set(); return out.filter(x => (seen.has(x.k) ? false : seen.add(x.k))).slice(0, 10); }
function hofPeople() { const out = [{ k: 'family', t: 'My family' }, { k: 'hs', t: 'My high school coach' }, { k: 'col', t: 'My college coaches' }, { k: 'mates', t: 'My teammates' }, { k: 'fans', t: 'The fans' }]; if (cs.agent) out.push({ k: 'agent', t: 'My agent' }); if (cs.rival) out.push({ k: 'rival', t: `${cs.rival.n}, my rival` }); return out; }
function hofScript(mom, ppl) {
  const nm = cName(cs.p); const h = q => cx3h('hof:' + q); const M = hofMoments().filter(x => mom.includes(x.k)); const PP = hofPeople().filter(x => ppl.includes(x.k));
  const L = [{ k: 'open', txt: `Canton, Ohio. ${nm} steps to the podium in the gold jacket.` }];
  M.forEach((m, i) => L.push({ k: 'pick', txt: m.t + '.', say: `${nm}: "${x3pick(['I still think about that one.', 'People ask me about it every day.', 'That was the best of us.', 'We earned that one together.'], h('m' + i))}"` }));
  PP.forEach((p, i) => L.push({ k: 'break', txt: `${nm} thanks ${p.t.charAt(0).toLowerCase() + p.t.slice(1)}.`, say: x3pick(['"I wouldn\'t be here without you."', '"You believed in me before anyone did."', '"This jacket is half yours."'], h('p' + i)) }));
  L.push({ k: 'sign', txt: `${nm} is enshrined in the Hall of Fame.`, say: `"${x3pick(['Football gave me everything. I tried to give it back.', 'To every kid watching: it\'s possible.', 'Thank you. I love this game.'], h('end'))}"` }); return L;
}

/* ===================== 24-26. THE COMMISSIONER ===================== */
// 24. Prime-time picks: choose the games for the big TV windows. Close games between good teams pay; blowouts and
// snubbing the best game cost you with the fans.
function tvSlate() { if (!isComm() || state.phase === 'offseason') return []; const wk = state.week; const gs = state.games.filter(g => g.wk === wk && !g.done && T(g.h) && T(g.a)); const sc = g => isPro() ? (T(g.h).w || 0) + (T(g.a).w || 0) + ((T(g.h).elo || 1500) + (T(g.a).elo || 1500)) / 200 : (rankOf(g.h) ? 30 - rankOf(g.h) : 0) + (rankOf(g.a) ? 30 - rankOf(g.a) : 0); return gs.sort((a, b) => sc(b) - sc(a)).slice(0, 6); }
function tvStore() { const c = cm2(); if (!c.tvp || c.tvp.s !== state.season) c.tvp = { s: state.season, wk: {}, hist: [] }; return c.tvp; }
function tvPick(gid) { const S = tvStore(); const wk = state.week; const L = S.wk[wk] || (S.wk[wk] = []); const i = L.indexOf(gid); if (i >= 0) L.splice(i, 1); else { if (L.length >= 2) L.shift(); L.push(gid); } return true; }
function tvScore(wk) {
  if (!isComm()) return null; const S = tvStore(); const L = S.wk[wk]; if (!L || !L.length || S.hist.some(x => x.wk === wk)) return null; const gs = L.map(id => state.games.find(g => g.id === id)).filter(g => g && g.done); if (!gs.length) return null;
  const val = g => { const m = Math.abs(g.hs - g.as); let v = 0; if (m <= 8) v += 1; if (m >= 28) v -= 1; if (g.hs + g.as >= 60) v += 0.5; if (!isPro() && rankOf(g.h) && rankOf(g.a)) v += 1; return v; };
  let score = gs.reduce((s, g) => s + val(g), 0); const all = state.games.filter(g => g.wk === wk && g.done && T(g.h) && T(g.a)); const best = all.slice().sort((a, b) => val(b) - val(a))[0]; const snub = best && !L.includes(best.id) && val(best) >= 2 ? best : null; if (snub) score -= 1;
  cmFx({ rev: r2(Math.max(0, score) * 0.02), fan: Math.round(score) }); S.hist.unshift({ wk, score, snub: snub ? snub.id : null }); if (S.hist.length > 20) S.hist.length = 20;
  try { if (snub) feedPost('tvSnub', { X: teamName(snub.h), Y: teamName(snub.a) }, { s: state.season, wk, mood: 40, cat: 'news' }); else if (score >= 2) feedPost('tvGood', { X: teamName(gs[0].h), Y: teamName(gs[0].a) }, { s: state.season, wk, mood: 60, cat: 'news' }); } catch (e) { }
  return { score, snub };
}
// 25. International games, and 26. bids to host the title game: agenda items each offseason
const INTL_CITIES = ['London', 'Mexico City', 'Munich', 'Dublin', 'Toronto', 'São Paulo', 'Madrid'];
const SITE_CITIES = [['Atlanta', 71000, true], ['New Orleans', 73000, true], ['Miami', 65000, false], ['Las Vegas', 65000, true], ['Houston', 72000, true], ['Arlington', 80000, true], ['Phoenix', 63000, true], ['Indianapolis', 67000, true], ['Minneapolis', 66000, true], ['Pasadena', 89000, false], ['Tampa', 65000, false], ['Santa Clara', 68000, false]];
function cmAgenda3() {
  if (!isComm()) return; const c = cm2(); const nx = state.season + 1;
  if (c.intlAsk !== nx) { c.intlAsk = nx; const cities = [0, 1, 2].map(i => INTL_CITIES[(Math.floor(hmix(state.seed + ':intl:' + nx) * INTL_CITIES.length) + i) % INTL_CITIES.length]); cmPost({ kind: 'intl', agenda: true, title: `Games abroad in ${nx}?`, txt: `Promoters in ${cities.join(', ')} want regular-season games. They pay well; ${isPro() ? 'the players\' union' : 'the athletes'} hate the travel.`, opts: [['n0', 'No games abroad', 'Keep every game at home.'], ['n1', 'One game', cities[0]], ['n2', 'Two games', cities.slice(0, 2).join(' and ')], ['n3', 'Three games', cities.join(', ')]], def: 1, data: { cities, s: nx } }); }
  if (c.siteAsk !== nx) { c.siteAsk = nx; const k = Math.floor(hmix(state.seed + ':site:' + nx) * SITE_CITIES.length); const bids = [0, 1, 2].map(i => { const C = SITE_CITIES[(k + i * 3) % SITE_CITIES.length]; return { city: C[0], seats: C[1], dome: C[2], bid: Math.round(18 + hmix(state.seed + ':bid:' + nx + C[0]) * 22) }; }); const nm = isPro() ? 'the Super Bowl' : 'the national championship game'; cmPost({ kind: 'site', agenda: true, title: `Who hosts ${nm} in ${nx}?`, txt: `Three cities bid to host ${nm}.`, opts: bids.map((b, i) => ['b' + i, `${b.city}: $${b.bid}M`, `${b.seats.toLocaleString()} seats${b.dome ? ', indoors' : ', outdoors'}`]), def: 0, data: { bids, s: nx } }); }
}
function intlResolve(it, k) { const n = +String(k).slice(1) || 0; const c = cm2(); c.intl = { s: it.data.s, n, cities: it.data.cities.slice(0, n), done: false }; if (n) cmFx({ rev: r2(n * 0.06), union: -2 * n, fan: n >= 3 ? -1 : 1 }); cmLog(n ? `${it.data.s}: ${n} game${n > 1 ? 's' : ''} abroad (${it.data.cities.slice(0, n).join(', ')}).` : `No games abroad in ${it.data.s}.`, !!n); return n ? `${n} game${n > 1 ? 's' : ''} abroad next season.` : 'Every game stays at home.'; }
function siteResolve(it, k) { const b = it.data.bids[+String(k).slice(1)] || it.data.bids[0]; const c = cm2(); c.site = { s: it.data.s, city: b.city, done: false }; cmFx({ rev: r2(b.bid / 1000), fan: b.dome ? 1 : 0, own: b.bid >= 32 ? 1 : 0 }); cmLog(`${b.city} will host the ${it.data.s} title game.`, true); return `${b.city} it is.`; }
// put the season's international games and the title game's city on the schedule
function cmApply3() {
  if (!isComm() || state.phase === 'offseason') return; const c = cm2();
  if (c.intl && c.intl.s === state.season && !c.intl.done && c.intl.n) { c.intl.done = true; const gs = state.games.filter(g => !g.done && g.wk >= Math.max(state.week, 3) && g.wk <= 10 && T(g.h) && T(g.a) && !g.neutral && (!g.type || g.type === 'reg')); const used = new Set(); c.intl.cities.forEach((city, i) => { const pool = gs.filter(x => !used.has(x.wk)); const ix = Math.floor(hmix(state.seed + ':intlg:' + i) * Math.max(1, gs.length - 1)); const g = pool.length ? pool[ix < pool.length ? ix : ix % pool.length] : null; /* index within what is left (SUS-05) */ if (g) { used.add(g.wk); g.neutral = true; g.name = `${isPro() ? 'International Series' : 'Global Kickoff'}: ${city}`; g.intl = city; } }); }
  if (c.site && c.site.s === state.season) state.games.filter(g => !g.done && g.name && /National Championship|Super Bowl/.test(g.name) && !g.site).forEach(g => { g.site = c.site.city; g.name += ` · ${c.site.city}`; });
}
{
  const _cmr = cmResolve; cmResolve = function (id, k, auto) {
    const c = cm2(); const it = c.items.find(x => x.id === id);
    if (it && (it.kind === 'intl' || it.kind === 'site')) { if (!it.opts.some(o => o[0] === k)) return null; c.items = c.items.filter(x => x !== it); return it.kind === 'intl' ? intlResolve(it, k) : siteResolve(it, k); }
    return _cmr(id, k, auto);
  };
}
Object.assign(FEED_T, {
  tvSnub: { diehard: ['{X} vs. {Y} was the game of the week and it was on a streaming app nobody has.', 'Who picked the TV games this week? {X}-{Y} deserved prime time.'], troll: ['Great job burying {X} vs. {Y}, commish.'], analyst: ['The league missed on its prime-time pick: {X} vs. {Y} was the best game of the week.'] },
  tvGood: { casual: ['what a prime time game', 'that night game was so good'], stats: ['Prime time delivered: {X} vs. {Y} went down to the wire.'], diehard: ['THAT is why you put {X}-{Y} in prime time.'] },
});

/* ===================== HOOKS ===================== */
function x3Week(wk, mg) {
  if (typeof state === 'undefined' || !state) return;
  if (mg && mg.done && !isComm()) prepGrade(mg);
  if (pracOn()) pracWeek(); if (isComm()) tvScore(wk); if (isGM()) tddRun(); /* the deadline is next week: the phones ring now */
}
function x3Offseason() {
  if (typeof state === 'undefined' || !state) return;
  if (bizOn()) { renoOffseason(); bstOffseason(); } if (!isComm() && !isPro()) acadSeason(); if (isGM()) stadOffseason(); if (isComm()) cmAgenda3();
}
function cx3Week(wk) { capWeek(); }
// before each week's games: deadline day, games abroad, the title game's city
function x3PreWeek() { try { if (isGM()) tddRun(); if (isComm()) cmApply3(); } catch (e) { if (typeof console !== 'undefined') console.error('extras 3', e); } }
{
  const _xw = xWeek; xWeek = function (wk, mg) { _xw(wk, mg); try { x3Week(wk, mg); } catch (e) { if (typeof console !== 'undefined') console.error('extras 3', e); } };
  const _xo = xOffseason; xOffseason = function () { _xo(); try { x3Offseason(); } catch (e) { if (typeof console !== 'undefined') console.error('extras 3', e); } };
  const _cw = cxWeek; cxWeek = function (wk) { _cw(wk); try { cx3Week(wk); } catch (e) { if (typeof console !== 'undefined') console.error('career extras 3', e); } };
  const _adv = advance; advance = function () { x3PreWeek(); return _adv.apply(this, arguments); };
  // your games: game prep, the defensive playbook, the practice week, academics, the new stadium
  const _cs = createSim; createSim = function (g, opts) {
    const sim = _cs(g, opts);
    try { if (sim.mSide >= 0) { const F = sim.F[sim.mSide]; const pb = prepBonus(g); F.off += pb.off; F.def += pb.def; const db = dpbBonus(); if (db) F.def += db; const pf = pracFx(); F.off += pf.off; F.def += pf.def; if (acadPen()) { F.off -= 0.2; F.def -= 0.2; } if (g.h === ME && !g.neutral) { const s = stadHome(); F.off += s / 2; F.def += s / 2; } } } catch (e) { }
    return sim;
  };
  const _inj = bizInjF; bizInjF = function () { let f = _inj(); try { f *= pracFx().inj; } catch (e) { } return f; };
  const _bm = bizGameMoney; bizGameMoney = function (g) { let v = _bm(g); try { if (bizOn() && g && g.h === ME && !g.neutral) v *= renoGateF(); } catch (e) { } return v; };
  const _ab = annualBudget; annualBudget = function () { const b = _ab(); try { if (bizOn() && !isPro()) { const A = X().acad; if (A) b.salaries = r1(b.salaries + ACAD_LV[A.lv][1] * econ()); } } catch (e) { } return b; };
  const _grc = genRecruitClass; genRecruitClass = function () { const r = _grc.apply(this, arguments); try { if (acadPen() && state.rec) state.rec.visits = Math.max(5, state.rec.visits - 3); } catch (e) { } return r; };
  const _nes = nflEndSeason; nflEndSeason = function () { _nes.apply(this, arguments); try { pbSelect(); } catch (e) { } };
}

