/* ===================== NFL FRONT OFFICE (engine) =====================
 * The NFL lives in the same save as the college world, and one world is "in front" at a time.
 * While you work in the NFL, state.teams / games / roster / depth / staff hold the 32 clubs and
 * your club, so the game sim, depth chart and live games run unchanged. The college world waits
 * in state.colW until you go back. Anything that crosses worlds (jobs, career history) carries
 * its level: 'col' or 'nfl'. The NFL-only data (other rosters, contracts, cap, draft, free
 * agency) lives in state.pro. No DOM here. */
const isPro = () => !!(typeof state !== 'undefined' && state && state.lvl === 'nfl');
const isGM = () => isPro() && !isCoach() && !(typeof ownHands === 'function' && ownHands());
// keys that belong to the save, not to a world
const WORLD_SHARED = new Set(['v', 'seed', 'hashV', 'settings', 'created', 'nextId', 'ach', 'kind', 'co', 'lvl', 'pro', 'colW', 'news', 'jobs', 'exec', 'gameOver', 'achToast', 'rng', 'liveWk', 'liveRng', 'pendingArrive', 'tline', 'mile', 'nem', 'iron']); /* nem: your nemesis (v9.57); iron: Ironman (v9.57; before that it lived in x and was lost on a move) */
const PRO_ROSTER = { QB: 3, RB: 4, WR: 6, TE: 3, OL: 9, DE: 5, DT: 4, LB: 6, CB: 6, S: 4, K: 1, P: 1, LS: 1 }; // 53
const PRO_OFF_MAX = 75;
// the in-season roster limit comes from the league rules (53 unless you change it)
function proMax() { const v = +rules().proRoster; return [53, 48, 46].includes(v) ? v : 53; }
// $M a year for a 99-rated player at each position
const PRO_TOP = { QB: 70, WR: 47, DE: 50, DT: 40, OL: 35, CB: 37, LB: 27, S: 26, RB: 20, TE: 22, K: 7, P: 5, LS: 1.8 };
const PRO_PEAK = { QB: 30, RB: 26, WR: 28, TE: 28, OL: 29, DE: 28, DT: 28, LB: 27, CB: 27, S: 28, K: 32, P: 32, LS: 32 };
const PRO_POS_W = { QB: 1.5, DE: 1.15, OL: 1, CB: 1, WR: 1, DT: 0.95, LB: 0.85, S: 0.85, TE: 0.8, RB: 0.7, K: 0.25, P: 0.2, LS: 0.1 };
const PRO_MINSAL = 0.9;
// the cap: 5.5% a year from 2026 until the growth rule changes, then the chosen rate from that league year on (league rules)
const proCap = yr => { const st = state && state.settings && state.settings.rules; const A = st && st.capA; const g = st && st.capGrow != null ? st.capGrow / 100 : 0.055; if (!A) return r1(295 * Math.pow(yr <= 2026 ? 1.055 : 1 + g, yr - 2026)); return r1(yr >= A.yr ? A.cap * Math.pow(1 + g, yr - A.yr) : A.cap / Math.pow(1.055, A.yr - yr)); };
const PRO_STEPS = ['Season review', 'Head coach', 'Re-sign players', 'Free agency', 'NFL Draft', 'Training camp'];
const PRO_COACH_STEPS = ['Season review', 'Job market', 'Front office', 'Free agency', 'NFL Draft', 'Training camp'];
const PRO_ROUNDS = 7;
const PRO_POS_MIX = [['QB', 7], ['RB', 7], ['WR', 13], ['TE', 6], ['OL', 16], ['DE', 10], ['DT', 8], ['LB', 10], ['CB', 11], ['S', 7], ['K', 2], ['P', 2], ['LS', 1]];
const PICK_CHART = [[1, 3000], [2, 2600], [3, 2200], [5, 1700], [8, 1400], [10, 1300], [16, 1000], [24, 740], [32, 590], [40, 500], [48, 420], [64, 270], [80, 190], [96, 116], [128, 52], [160, 30], [192, 16], [224, 6]];
const pickValue = no => Math.round(interp(PICK_CHART, no));
const PS = () => state.pro;
// The cap year in force: the season being played, or the next one once the offseason starts.
const capYear = () => (state.phase === 'offseason' ? state.season + 1 : state.season);
const proRoster = tid => (tid === ME ? state.roster : (PS().rost[tid] || []));
const nflNick = id => (NFL_BY[id] ? NFL_BY[id].nick : id);

/* ---------- contracts and value ---------- */
// k: { sal: [salary for each season left], pr: [signing-bonus proration charged in each season left],
//      yrs (seasons left, = sal.length), base/bpy (this season's salary and proration, kept in step with the arrays),
//      tot, rk (rookie deal), apy, shape ('back' or 'front' when the salaries rise or fall) }
// Saves from before v9.4 kept one base salary (plus k.later after a restructure) and one flat proration: kFix converts them,
// and also repairs the arrays when other code shortens a deal by changing k.yrs.
function kFix(k) {
  if (!k) return k; const n = Math.max(0, k.yrs | 0);
  if (!Array.isArray(k.sal)) { const sal = [], pr = []; for (let i = 0; i < n; i++) { sal.push(i === 0 || !k.later || k.later[i - 1] == null ? k.base : k.later[i - 1]); pr.push(k.bpy || 0); } k.sal = sal; k.pr = pr; }
  delete k.later; if (!Array.isArray(k.pr)) k.pr = k.sal.map(() => k.bpy || 0);
  while (k.sal.length > n) { k.sal.pop(); } while (k.pr.length > k.sal.length) k.pr.pop();
  while (k.sal.length < n) k.sal.push(k.sal.length ? k.sal[k.sal.length - 1] : k.base || PRO_MINSAL); while (k.pr.length < k.sal.length) k.pr.push(0);
  if (k.sal.length) { k.base = k.sal[0]; k.bpy = k.pr[0]; }
  return k;
}
const kOk = k => !!(k && Array.isArray(k.sal) && Array.isArray(k.pr) && k.sal.length === k.yrs && k.pr.length === k.yrs);
const capHit = p => (p.k ? r2(p.k.base + p.k.bpy + (p.k.incDue || 0)) : 0); /* earned incentives count against the next season's cap (v9.12) */
// the cap hit in season i of the deal (0 = this league year)
const yearHit = (p, i) => { const k = p.k; if (!k || k.yrs <= i) return 0; if (kOk(k)) return r2(k.sal[i] + k.pr[i]); return r2((i === 0 ? k.base : k.later && k.later[i - 1] != null ? k.later[i - 1] : k.base) + k.bpy); };
// what's left on a contract, every year (the tests use it)
const owedLeft = p => { let s = 0; for (let i = 0; p.k && i < p.k.yrs; i++) s += yearHit(p, i); return r2(s); };
// how a deal's salaries move over its years; the player values money up front
const SHAPES = { flat: 'Flat', back: 'Back-loaded', front: 'Front-loaded' };
const SHAPE_V = { flat: 1, back: 0.96, front: 1.03 };
const shapeV = sh => SHAPE_V[sh] || 1;
function shapeF(sh, n, i) { if (n < 2 || !sh || sh === 'flat') return 1; const t = i / (n - 1) - 0.5; return 1 + (sh === 'back' ? 0.3 : -0.3) * t; }
// A restructure turns this season's salary above the minimum into bonus spread over up to five seasons:
// less cap now, more later, the same total (B07). Returns this season's savings.
function restructureK(k) { kFix(k); const n = k.sal.length; const m = Math.min(n, 5); const conv = r2(k.sal[0] - PRO_MINSAL); k.sal[0] = PRO_MINSAL; for (let j = 0; j < m; j++) k.pr[j] = r2(k.pr[j] + conv / m); k.rs = state.season; kFix(k); return r2(conv - conv / m); }
// dead money if he is released now: every bonus dollar not yet charged to a cap
const deadIfCut = p => { const k = p.k; if (!k || k.yrs <= 0) return 0; if (kOk(k)) return r2(k.pr.reduce((s, x) => s + x, 0)); return r2(k.bpy * k.yrs); };
const cutSaves = p => r2(capHit(p) - deadIfCut(p));
// previews for the player card: what a restructure or an extension would do, without changing anything
function restructurePreview(p) { const n = p.k.yrs; const k = JSON.parse(JSON.stringify(p.k)); const saved = restructureK(k); const q = { k }; const yrs = []; for (let i = 0; i < n; i++) yrs.push({ before: yearHit(p, i), after: yearHit(q, i) }); return { saved, yrs, later: r2(yrs.length > 1 ? yrs[1].after - yrs[1].before : 0) }; }
// an extension tears up what is left and writes one deal through the new last season: cap hits follow apy (and the shape),
// with the old bonus still charged in the years it was already spread over
function extendK(old, apy, yrs, sh) {
  const o = kFix(JSON.parse(JSON.stringify(old))); const N = clamp(o.yrs + Math.round(yrs), 1, 6); apy = r2(Math.max(PRO_MINSAL, apy));
  const bonus = apy * N * 0.3, m = Math.min(N, 5); const sal = [], pr = [];
  for (let i = 0; i < N; i++) { const b = r2((o.pr[i] || 0) + (i < m ? bonus / m : 0)); pr.push(b); sal.push(r2(Math.max(0.5, apy * shapeF(sh, N, i) - b))); }
  const k = { sal, pr, yrs: N, tot: N, rk: false, apy, ext: state.season }; if (sh && sh !== 'flat') k.shape = sh; return kFix(k);
}
// a fair yearly salary for a player, in $M
// Updated balance: what players are worth rises with the salary cap, so cap room doesn't pile up over a long save (BAL-12)
const capIdx = () => { if (typeof state === 'undefined' || !state || state.lvl !== 'nfl' || !balOn()) return 1; let c = NaN; try { c = proCap(capYear()); } catch (e) { /* the league is still being set up */ } return Number.isFinite(c) && c > 0 ? r2(1.45 * c / 295) : 1.45; }; // and set so a full roster costs about what the cap allows, as in the real league
function proValue(pos, ovr, age) {
  const q = Math.max(0, (ovr - 60) / 38); let v = PRO_TOP[pos] * Math.pow(q, 1.6) * capIdx();
  if (age >= 30) v *= clamp(1 - 0.09 * (age - 29), 0.35, 1);
  return r2(Math.max(PRO_MINSAL, v));
}
const pValue = p => proValue(p.pos, p.ovr, p.age);
function mkContract(apy, yrs, bonusShare, rk, sh) {
  apy = r2(Math.max(PRO_MINSAL, apy)); yrs = clamp(Math.round(yrs), 1, 6); const bonus = apy * yrs * (bonusShare || 0); const m = Math.min(yrs, 5);
  const sal = [], pr = []; for (let i = 0; i < yrs; i++) { const b = i < m ? r2(bonus / m) : 0; pr.push(b); sal.push(r2(Math.max(0.5, apy * shapeF(sh, yrs, i) - b))); }
  const k = { sal, pr, yrs, tot: yrs, rk: !!rk, apy }; if (sh && sh !== 'flat') k.shape = sh; return kFix(k);
}
// how many years a player wants, by age
const wantYears = age => (age <= 25 ? 4 : age <= 28 ? 3 : age <= 31 ? 2 : 1);
function rookieContract(no) {
  const rd = rookieDeal(no || 0); const ci = capIdx(); const apy = r2(rd.apy / 1e6 * ci), bonus = r2(rd.bonus / 1e6 * ci); const yrs = rd.yrs;
  const bpy = r2(bonus / yrs); return kFix({ base: r2(Math.max(0.5, apy - bpy)), bpy, yrs, tot: yrs, rk: true, apy, pick: no || 0 });
}
// trade value in draft-chart points
function tradeValue(p) {
  const pw = PRO_POS_W[p.pos] || 0.8; const q = Math.max(0, (p.ovr - 58) / 40);
  let v = 3000 * Math.pow(q, 2.4) * pw;
  const a = p.age; v *= a <= 25 ? 1.15 : a <= 28 ? 1 : a === 29 ? 0.85 : a === 30 ? 0.7 : a === 31 ? 0.55 : a === 32 ? 0.42 : 0.3;
  if (a <= 24) v += 3000 * Math.pow(Math.max(0, (p.pot - 60) / 40), 2.4) * pw * 0.3;
  if (p.k) { const sur = pValue(p) - capHit(p); v += sur * Math.min(p.k.yrs, 3) * 18; }
  return Math.max(0, Math.round(v));
}
const pickPts = (pk) => {
  const no = proPickNo(pk); const v = pickValue(no);
  return Math.round(v * (pk.yr > capDraftYear() ? 0.85 : 1));
};
// the draft year of the next draft (April after the season)
const capDraftYear = () => state.season + 1;
// a pick's projected number: this year's draft uses the order once it is set; future picks use the middle of the round
function proPickNo(pk) {
  const L = PS(); const rd = pk.rd; const NT = NFL.length; if (pk.c) return rd * NT + 2; // compensatory picks come after the round's regular picks
  if (pk.yr === capDraftYear() && L.order && L.order.length === NT) return (rd - 1) * NT + L.order.indexOf(pk.orig) + 1;
  if (pk.yr === capDraftYear() && state.phase !== 'offseason') { const ord = proStandingOrder(); return (rd - 1) * NT + ord.indexOf(pk.orig) + 1; }
  return (rd - 1) * NT + Math.round(NT / 2);
}
const pickLabel = pk => `${pk.yr} round ${pk.rd}${pk.c ? ' compensatory' : ''}${pk.orig !== pk.own ? ' (from ' + nflNick(pk.orig) + ')' : ''}`;

/* ---------- payroll ---------- */
function payrollOf(tid) { const L = PS(); const cy = capYear(); return r2(proRoster(tid).reduce((s, p) => s + (p.k && p.k.yrs > 0 ? capHit(p) : 0), 0) + ((L.dead[tid] && L.dead[tid].yr === cy) ? L.dead[tid].amt : 0)); }
const capRoom = tid => r2(proCap(capYear()) - payrollOf(tid));
const deadNow = tid => { const d = PS().dead[tid]; return d && d.yr === capYear() ? d.amt : 0; };
function addDead(tid, amt) { const L = PS(); const cy = capYear(); if (!L.dead[tid] || L.dead[tid].yr !== cy) L.dead[tid] = { yr: cy, amt: 0 }; L.dead[tid].amt = r2(L.dead[tid].amt + amt); }

/* ---------- players ---------- */
function proName() { return genName(); }
const COL_NAMES = () => { const w = state.colW && state.colW.teams ? state.colW.teams : null; return w ? Object.values(w).map(t => [t.name, t.rating]) : Object.values(CTEAMS0_AD).map(t => [t.name, t.base]); };
function pickCollege(r) { const all = COL_NAMES(); const tot = all.reduce((s, x) => s + Math.pow(Math.max(1, x[1] - 50), 1.6), 0); let v = r() * tot; for (const x of all) { v -= Math.pow(Math.max(1, x[1] - 50), 1.6); if (v <= 0) return x[0]; } return all[0][0]; }
function mkPro(o) { return Object.assign({ id: 'p' + (state.nextId++), inj: 0 }, o); }
// gives a player everything the depth chart, game sim and player card need (only your own roster carries this)
function enrichPro(p) {
  if (!p.tr) p.tr = hashTraits(p) || genTraits(p.pos, p.ovr, p.n); // the same traits scouts saw before he joined
  if (!p.st) p.st = {}; if (!p.cs) p.cs = {}; if (p.gp == null) p.gp = 0; p.inj = p.inj || 0; p.susp = p.susp || 0;
  if (!p.ht) { const b = genBody(p.pos); p.ht = b.ht; p.wt = b.wt; }
  if (!p.home) p.home = p.col || 'Free agent'; if (!p.pers) p.pers = rollPers(false); if (p.num == null) p.num = freeNumberPro(p.pos);
  p.cls = 'Pro'; p.pay = 0; p.seasons = p.seasons || 0;
  return p;
}
const NUMS = { QB: [1, 19], RB: [20, 49], WR: [10, 19], TE: [80, 89], OL: [60, 79], DE: [90, 99], DT: [90, 99], LB: [40, 59], CB: [20, 39], S: [20, 49], K: [1, 19], P: [1, 19], LS: [40, 69] };
function freeNumberPro(pos) { const used = new Set(state.roster.map(p => p.num)); const [a, b] = NUMS[pos] || [1, 99]; for (let i = 0; i < 40; i++) { const n = ri(a, b); if (!used.has(n)) return n; } for (let n = 1; n < 100; n++) if (!used.has(n)) return n; return 0; }
// strips the extra fields when a player leaves your roster
function leanPro(p) { const o = { id: p.id, n: p.n, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, exp: p.exp, col: p.col, k: p.k, inj: p.inj && !p.injSE ? p.inj : 0 }; if (p.tag) o.tag = p.tag; return o; }
function genProPlayer(pos, ovr, age, r) {
  r = r || R; ovr = Math.round(ovr); const young = age <= 25; const pot = clamp(Math.round(ovr + (young ? (27 - age) * 2 + r() * 8 : r() * 3)), ovr, 99);
  return mkPro({ n: proName(), pos, age, ovr: clamp(Math.round(ovr), 40, 99), pot, exp: Math.max(0, age - 22 - (r() < 0.3 ? 1 : 0)), col: pickCollege(r) });
}
// a 53-man roster for a club of strength p (about 60-90)
function genProRoster(p, r) {
  const out = []; const base = 73 + (p - 76) * 0.25;
  POS_ORDER.forEach(pos => {
    const n = PRO_ROSTER[pos], st = START[pos];
    for (let i = 0; i < n; i++) {
      let o; if (['K', 'P', 'LS'].includes(pos)) o = 74 + (p - 76) * 0.2 + gauss() * 6;
      else o = base + (i < st ? 5 - i * 0.7 : -5 - (i - st) * 3) + gauss() * 4.2;
      const age = i < st ? ri(23, 32) : ri(22, 29); const pl = genProPlayer(pos, o, ['K', 'P', 'LS'].includes(pos) ? ri(24, 36) : age, r); out.push(pl);
    }
  });
  return out;
}
// contracts for a whole roster, scaled so the payroll lands near the cap
function contractRoster(list, capY) {
  list.forEach(p => {
    const v = pValue(p);
    if (p.exp <= 3 && p.age <= 25) { const no = clamp(Math.round(260 - (p.ovr - 55) * 9 + gauss() * 40), 1, 224); p.k = rookieContract(no); p.k.yrs = clamp(p.k.tot - p.exp, 1, 4); kFix(p.k); }
    else { const yrs = clamp(wantYears(p.age) + ri(-1, 1), 1, 5); p.k = mkContract(v * rnd(0.8, 1.15), yrs, v > 5 ? rnd(0.15, 0.35) : 0); p.k.yrs = p.k.tot === 1 || R() < 0.2 ? 1 : ri(2, p.k.tot); kFix(p.k); }
  });
  // scaled so next year's commitments (deals that run past this season) land at 72-85% of next year's cap
  const target = proCap(capY + 1) * rnd(0.72, 0.85); const surv = list.filter(p => p.k.yrs >= 2);
  const fixed = surv.filter(p => p.k.rk || capHit(p) <= 1.2).reduce((s, p) => s + capHit(p), 0); const vets = surv.filter(p => !p.k.rk && capHit(p) > 1.2); const vsum = vets.reduce((s, p) => s + capHit(p), 0);
  if (vsum > 0) { const f = clamp((target - fixed) / vsum, 0.7, 1.5); list.filter(p => !p.k.rk && capHit(p) > 1.2).forEach(p => { kFix(p.k); p.k.apy = r2((p.k.apy || capHit(p)) * f); p.k.sal = p.k.sal.map(x => r2(x * f)); p.k.pr = p.k.pr.map(x => r2(x * f)); kFix(p.k); }); }
}

/* ---------- team strength (computer-run clubs) ---------- */
function rosterStrength(list, sf) {
  const by = {}; POS_ORDER.forEach(pos => by[pos] = list.filter(p => p.pos === pos && !p.inj).sort((a, b) => b.ovr - a.ovr));
  const g = pos => avgOvr(by[pos].slice(0, START[pos]), START[pos]);
  const hc = sf.hc || { off: 72, def: 72, gm: 72 };
  const off = 0.32 * g('QB') + 0.10 * g('RB') + 0.20 * g('WR') + 0.06 * g('TE') + 0.32 * g('OL') + ((sf.oc || 70) - 75) * 0.12 + (hc.off - 75) * 0.05 + (hc.gm - 75) * 0.03;
  const def = 0.20 * g('DE') + 0.17 * g('DT') + 0.21 * g('LB') + 0.23 * g('CB') + 0.19 * g('S') + ((sf.dc || 70) - 75) * 0.12 + (hc.def - 75) * 0.05 + (hc.gm - 75) * 0.03;
  const st = 0.5 * g('K') + 0.4 * g('P') + 0.1 * g('LS') + ((sf.st || 70) - 75) * 0.15;
  return { off: r1(off), def: r1(def), st: r1(st), ovr: r1((off + def) / 2 * 0.94 + st * 0.06) };
}
// IDEA-04: the planning forecast for the next three league years. What is already committed, what the draft picks you
// own will cost, what re-signing the starters whose deals run out would cost at fair value, dead money, and the room
// left after all of it. A win-now move (salary for some years) is laid over the top to show its future cost.
function proPlan(move) {
  const L = PS(); const cy = capYear(); const starters = new Set(POS_ORDER.flatMap(pos => (state.depth[pos] || []).slice(0, START[pos] || 1)));
  return [0, 1, 2].map(i => { const y = cy + i; const cap = proCap(y);
    const committed = r2(state.roster.reduce((s, p) => s + yearHit(p, i), 0) + (i === 0 ? deadNow(ME) : 0));
    const picks = L.picks.filter(pk => pk.own === ME && !pk.forf && pk.yr <= y); /* picks still to be used; a used pick is a signed rookie */
    // a pick's rookie deal counts from its draft year on (a typical slot in its round)
    const rook = r2(picks.reduce((s, pk) => { const k = rookieContract((pk.rd - 1) * 32 + 16); const off = y - pk.yr; return s + (off >= 0 && off < k.yrs ? r2(k.base + k.bpy) : 0); }, 0));
    const expiring = state.roster.filter(p => starters.has(p.id) && p.k && p.k.yrs > 0 && p.k.yrs <= i);
    const resign = r2(expiring.reduce((s, p) => s + pValue({ pos: p.pos, ovr: p.ovr, age: p.age + i }), 0));
    const mv = move && +move.sal > 0 && i < (+move.yrs || 1) ? r2(+move.sal) : 0;
    return { y, cap, committed, rook, resign, n: expiring.length, mv, room: r2(cap - committed - rook - resign - mv) }; });
}
function proChanges() {
  const L = PS(); const c = L && L.chg; if (!c || !Array.isArray(c.ros)) return null; const was = new Map(c.ros.map(r => [r[0], r])); const now = new Map(state.roster.map(p => [p.id, p]));
  const added = state.roster.filter(p => !was.has(p.id)).sort((a, b) => b.ovr - a.ovr); const gone = c.ros.filter(r => !now.has(r[0])).sort((a, b) => b[3] - a[3]);
  const moved = state.roster.filter(p => was.has(p.id)).map(p => [p, p.ovr - was.get(p.id)[3]]).filter(x => x[1]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return { s: c.s, ovr: [c.ovr, Math.round(michStrength().ovr)], added, gone, moved };
}
function proRate(tid) {
  const t = T(tid); if (!t) return;
  if (tid === ME) { const s = michStrength(); t.off = s.off; t.def = s.def; t.st = s.st; t.rating = Math.round(s.ovr); return; }
  const s = rosterStrength(proRoster(tid), PS().aistaff[tid] || {}); t.off = s.off; t.def = s.def; t.st = s.st; t.rating = Math.round(s.ovr);
}
function proRateAll() { NFL.forEach(t => proRate(t.id)); }
// the three players the play-by-play names for a computer-run club
function proStars(tid) {
  const t = T(tid); const list = proRoster(tid).filter(p => !p.inj); const best = pos => list.filter(p => pos.includes(p.pos)).sort((a, b) => b.ovr - a.ovr)[0];
  const keep = id => (t.stars || []).find(s => s.pid === id);
  t.stars = [best(['QB']), best(['RB', 'WR']), best(['DE', 'LB', 'CB', 'S', 'DT'])].filter(Boolean).map(p => keep(p.id) || { id: 's' + p.id, pid: p.id, n: p.n, pos: p.pos, ovr: p.ovr, cls: 'Pro', st: {}, gp: 0, tm: tid });
}
function genAiStaff(tid, p, r) {
  r = r || R; const b = 70 + (p - 76) * 0.3; const v = () => clamp(Math.round(b + (r() - 0.5) * 16), 58, 95);
  return { hc: { name: genName(), off: v(), def: v(), gm: v(), age: ri(38, 66), yrs: ri(1, 5) }, oc: v(), dc: v(), st: v(), gm: genName() };
}
// a full NFL staff for your club, in the same shape as a college staff
function genProStaff(p) {
  const st = {}; const b = Math.round(72 + (p - 76) * 0.3);
  STAFF_ROLES.forEach(rl => {
    const c = genCandidates(rl, 3)[1]; c.bg = 'Current staff'; c.real = false;
    if (rl === 'HC') { ['off', 'def', 'rec', 'dev', 'gm'].forEach(k => c[k] = clamp(Math.round(b + gauss() * 5), 58, 94)); c.salary = r1(clamp(5 + (coachOvr(c) - 70) * 0.55, 4, 20)); c.years = ri(2, 5); }
    else { c.ovr = clamp(Math.round(b - 1 + gauss() * 5), 58, 92); c.salary = r1(['OC', 'DC'].includes(rl) ? clamp(1.2 + (c.ovr - 70) * 0.12, 0.9, 5) : clamp(0.4 + (c.ovr - 70) * 0.04, 0.3, 1.6)); }
    st[rl] = c;
  });
  return st;
}
const NFL_BG_HC = ['NFL offensive coordinator', 'NFL defensive coordinator', 'Former NFL head coach', 'College head coach, power program', 'NFL assistant head coach', 'NFL quarterbacks coach'];
function genProCandidates(n) { const out = genCandidates('HC', n); out.forEach(c => { c.bg = pick(NFL_BG_HC); c.salary = r1(clamp(5 + (coachOvr(c) - 70) * 0.55, 4, 20)); c.years = ri(4, 6); }); return out; }

/* ---------- moving between worlds ---------- */
function stashWorld() { const w = {}; Object.keys(state).forEach(k => { if (!WORLD_SHARED.has(k)) { w[k] = state[k]; delete state[k]; } }); return w; }
function restoreWorld(w) { Object.keys(state).forEach(k => { if (!WORLD_SHARED.has(k)) delete state[k]; }); Object.assign(state, w); }
// Runs `fn` with the college world on autopilot: no firing, no coach-mode logic, nobody to ask.
let AUTOPILOT = false;
function colAutopilot(fn) {
  const kind = state.kind, nf = state.settings.noFire, go = state.gameOver; state.kind = 'ad'; state.settings.noFire = true; state.gameOver = null; AUTOPILOT = true;
  try { return fn(); } finally { state.kind = kind; state.settings.noFire = nf; state.gameOver = go; AUTOPILOT = false; }
}
// Brings the college world to a clean stopping point (the first week of a season) before it waits.
function collegeFreeze() {
  if (isCoach() && state.co) { const r = state.co.role; const c = genCandidates(r, 3)[0]; c.bg = 'Promoted from the staff'; state.staff[r] = c; }
  if (state.phase === 'offseason') colAutopilot(() => autoOffseason());
}
// One college season played without you (used to catch the college world up after time in the NFL).
function collegeSimSeason() {
  colAutopilot(() => { autoSeasonRecruiting(); let n = 0; while (state.phase !== 'offseason' && n++ < 40) advance(); autoOffseason(); });
}

/* ---------- a new NFL league ---------- */
// The NFL formula (D01): 6 division games (home and away), 4 against a division in the same conference,
// 4 against a division in the other conference, 2 against same-place teams in the other two same-conference
// divisions, and a 17th game against a same-place team from the other conference. Every club gets 8 or 9 home games.
function proMatchups(year) {
  const r = lrng(state.seed + ':nmu:' + year); const out = [];
  const divTeams = (cf, d) => NFL.filter(t => t.conf === cf && t.div === NFL_DIVS[d]).map(t => t.id);
  // last season's division finish (a club's "place"), or preseason strength for a brand-new league
  const last = id => { const t = state.teams[id]; const h = t && t.hist && t.hist.length ? t.hist[t.hist.length - 1] : null; return h ? h.w * 100 + (t.elo || 1500) / 100 : (NFL_BY[id].p + r() * 4); };
  const score = {}; NFL.forEach(t => score[t.id] = last(t.id)); const cache = {};
  const placed = (cf, d) => cache[cf + d] || (cache[cf + d] = divTeams(cf, d).sort((x, y) => score[y] - score[x]));
  const add = (h, a) => out.push([h, a]);
  ['AFC', 'NFC'].forEach(cf => {
    for (let d = 0; d < 4; d++) { const ts = divTeams(cf, d); for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { add(ts[i], ts[j]); add(ts[j], ts[i]); } }
    // same-conference division rotation (three-year cycle)
    const pairs = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]][((year % 3) + 3) % 3];
    pairs.forEach(([x, y]) => { const A = placed(cf, x), B = placed(cf, y); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if ((i + j + year) % 2 === 0) add(A[i], B[j]); else add(B[j], A[i]); } });
    // same-place games against the two divisions not in the rotation
    const [[a1, b1], [c1, d1]] = pairs; const P = d => placed(cf, d);
    for (let k = 0; k < 4; k++) { add(P(a1)[k], P(c1)[k]); add(P(d1)[k], P(a1)[k]); add(P(c1)[k], P(b1)[k]); add(P(b1)[k], P(d1)[k]); }
  });
  for (let d = 0; d < 4; d++) {
    // cross-conference division rotation (four-year cycle), then the 17th game against a same-place team
    const A = placed('AFC', d), N = placed('NFC', (d + year) % 4), N17 = placed('NFC', (d + year + 2) % 4);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if ((i + j + year) % 2 === 0) add(A[i], N[j]); else add(N[j], A[i]); }
    for (let k = 0; k < 4; k++) { if (year % 2) add(A[k], N17[k]); else add(N17[k], A[k]); }
  }
  return out;
}
// Puts the 272 games into 18 weeks: each club plays once a week except for one bye (weeks 6-13),
// and division games fill the final week.
function proSchedule(year) {
  if (typeof NFL_STD === 'function' && !NFL_STD()) return proScheduleAny(year); /* an expanded (or smaller) league */
  const r = lrng(state.seed + ':nsch:' + year); const ids = NFL.map(t => t.id); const mu = proMatchups(year);
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  for (let attempt = 0; attempt < 400; attempt++) {
    const bye = {}; shuf(ids.slice()).forEach((id, i) => bye[id] = 6 + Math.floor(i / 4));
    const left = shuf(mu.map((g, i) => ({ h: g[0], a: g[1], i, div: nflSameDiv(g[0], g[1]) })));
    const weeks = {}; let ok = true;
    for (const wk of [18].concat(Array.from({ length: 17 }, (_, i) => i + 1))) {
      const need = ids.filter(id => bye[id] !== wk); const used = new Set(); const pick = []; let steps = 0;
      const opts = id => left.filter(g => (g.h === id || g.a === id) && !g.taken && !used.has(g.h) && !used.has(g.a) && bye[g.h] !== wk && bye[g.a] !== wk);
      // an exact search for a full week of games (most-constrained club first), with a step limit
      const solve = () => {
        if (pick.length * 2 === need.length) return true; if (steps++ > 4000) return false;
        let bo = null; for (const id of need) { if (used.has(id)) continue; const o = opts(id); if (!o.length) return false; if (!bo || o.length < bo.length) bo = o; }
        let list = shuf(bo.slice()); if (wk === 18) list.sort((p, q) => (q.div ? 1 : 0) - (p.div ? 1 : 0));
        for (const g of list) { used.add(g.h); used.add(g.a); g.taken = true; pick.push(g); if (solve()) return true; pick.pop(); g.taken = false; used.delete(g.h); used.delete(g.a); }
        return false;
      };
      if (!solve()) { ok = false; break; }
      weeks[wk] = pick; const gone = new Set(pick.map(g => g.i)); for (let i = left.length - 1; i >= 0; i--) if (gone.has(left[i].i)) left.splice(i, 1);
    }
    if (!ok || left.length) continue;
    let gid = 0; const games = [];
    for (let wk = 1; wk <= 18; wk++) weeks[wk].forEach(g => games.push(proGame(year, ++gid, wk, g.h, g.a, { div: g.div })));
    PS().lg.gid = gid; return games;
  }
  throw new Error('Could not build the NFL schedule.');
}
function proGame(year, n, wk, h, a, o) { return Object.assign({ id: year + 'n' + n, wk, h, a, done: false, neutral: false, type: 'reg' }, o || {}); }
// power by club for a given season, drifting from the 2026 numbers
function proPowers(year) { const pw = {}; NFL.forEach(t => pw[t.id] = t.p); for (let y = 2027; y <= year; y++) { const r = lrng(state.seed + ':npow:' + y); NFL.forEach(t => { const d = (r() + r() + r() - 1.5) * 9; pw[t.id] = Math.round(clamp(pw[t.id] * 0.62 + 76 * 0.38 + d, 55, 95)); }); } return pw; }
// Builds the 32 clubs as they stand after season S (records from a quick season run in the background).
function createProLeague(S) {
  if (typeof nflLeagueSync === 'function') nflLeagueSync({}); /* a brand-new league starts with the 32 */
  const pw = proPowers(S); const r = lrng(state.seed + ':nlg:' + S);
  state.pro = { lg: { gid: 0, seeds: null, champ: null, runner: null }, rost: {}, dead: {}, picks: [], order: null, dc: null, fa: [], draft: null, off: null, tx: [], hist: [], champs: [], scout: 0, aistaff: {}, expW: 8.5, hcRel: 60, hcIn: null, cin: { draft: [], fa: [], cut: [], trade: [], keep: [] }, gm: null, aigm: null, tag: 0, offers: [], faOffers: {}, faWave: 0, deadline: false };
  state.teams = {};
  NFL.forEach(t => {
    const p = pw[t.id];
    state.teams[t.id] = { id: t.id, name: t.name, nick: t.nick, city: t.city, conf: t.conf, div: t.div, rating: p, off: p, def: p, st: p, elo: 1500 + (p - 76) * 12, w: 0, l: 0, pf: 0, pa: 0, dw: 0, dl: 0, cw: 0, cl: 0, style: genStyle(), coach: '', hist: [], pow: p };
    const list = genProRoster(p, r); contractRoster(list, S); PS().rost[t.id] = list; PS().aistaff[t.id] = genAiStaff(t.id, p, r); state.teams[t.id].coach = PS().aistaff[t.id].hc.name;
  });
  [S + 1, S + 2].forEach(yr => NFL.forEach(t => { for (let rd = 1; rd <= PRO_ROUNDS; rd++) PS().picks.push({ yr, rd, orig: t.id, own: t.id }); }));
  // a few picks already traded around the league
  for (let i = 0; i < 14; i++) { const pk = PS().picks[Math.floor(r() * PS().picks.length)]; pk.own = NFL[Math.floor(r() * 32)].id; }
  // last season, played out quickly for the standings and the draft order
  state.season = S; state.week = 1; state.phase = 'regular'; state.games = proSchedule(S);
  NFL.forEach(t => { const s = rosterStrength(PS().rost[t.id], PS().aistaff[t.id]); Object.assign(state.teams[t.id], { off: s.off, def: s.def, st: s.st, rating: Math.round(s.ovr) }); });
  const L = { teams: state.teams };
  for (let wk = 1; wk <= 22 && !PS().lg.champ; wk++) { state.games.filter(g => g.wk === wk && !g.done).forEach(g => { fastGame(L, g); proApply(g); }); proAfterWeek(wk, true); }
  PS().champs.push({ s: S, tm: PS().lg.champ, ru: PS().lg.runner });
  PS().dc = genDraftClass(S + 1);
}
// your club inside the league: roster, staff and depth chart come out of the computer-run data
function takeClub(tid, staffFrom) {
  const L = PS(); ME = tid; state.my = tid;
  state.roster = []; (L.rost[tid] || []).forEach(p => { enrichPro(p); state.roster.push(p); }); delete L.rost[tid]; rebuildPMap();
  const ai = L.aistaff[tid]; state.staff = staffFrom || genProStaff(T(tid).pow);
  if (ai && !staffFrom) { const hc = state.staff.HC; hc.name = ai.hc.name; hc.off = ai.hc.off; hc.def = ai.hc.def; hc.gm = ai.hc.gm; hc.age = ai.hc.age; hc.years = ai.hc.yrs || 3; if (state.staff.OC) state.staff.OC.ovr = ai.oc; if (state.staff.DC) state.staff.DC.ovr = ai.dc; if (state.staff.ST) state.staff.ST.ovr = ai.st; }
  L.gmName = ai ? ai.gm : genName(); delete L.aistaff[tid];
  state.depth = {}; POS_ORDER.forEach(pos => { state.depth[pos] = state.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id); });
  STAFF_ROLES.forEach(r => state.cands[r] = []); state.cands.HC = genProCandidates(5);
  T(tid).coach = state.staff.HC ? state.staff.HC.name : '';
}
// your old club goes back to the computer
function releaseClub() {
  const L = PS(); const old = ME; if (!old || !T(old)) return;
  L.rost[old] = state.roster.map(leanPro);
  const s = state.staff; const hc = s.HC && !s.HC.me ? s.HC : genCandidates('HC', 1)[0];
  L.aistaff[old] = { hc: { name: hc.name, off: hc.off, def: hc.def, gm: hc.gm, age: hc.age || 50, yrs: hc.years || 3 }, oc: s.OC && !s.OC.me ? s.OC.ovr : 72, dc: s.DC && !s.DC.me ? s.DC.ovr : 72, st: s.ST && !s.ST.me ? s.ST.ovr : 72, gm: L.gmName || genName() };
  T(old).coach = hc.name; proRate(old); proStars(old);
}
// Enters the NFL at the offseason after the college season just finished (or before the 2026 season for a new career).
// how: { role: 'gm' } or { role: 'coach', crole, k }
function goPro(tid, how) {
  if (state.lvl !== 'nfl') {
    collegeFreeze(); const S = state.season - 1; state.colW = stashWorld(); state.lvl = 'nfl';
    Object.assign(state, { news: state.news || [], cands: {}, meters: { fan: 66, boost: 60, board: 62, morale: 66, hot: 15, risk: 0 }, plan: { off: 'balanced', def: 'balanced' }, practice: 'balanced', polls: [], cfp: [], rivals: {}, rivalLog: [], history: [], facilities: [], captains: [], book: { game: {}, season: {} }, event: null, eventLog: [], trophies: [], draft: [], awards: [], alumni: [], goals: [], off: null, bulletin: null });
    createProLeague(S); takeClub(tid);
  } else if (tid !== ME) { releaseClub(); takeClub(tid); }
  const L = PS(); L.role = how.role === 'coach' ? 'coach' : 'gm'; L.scout = Math.max(L.scout || 0, 20);
  if (L.role === 'gm') { if (!state.exec) state.exec = { rep: 60 }; L.gm = { sec: 62, yrs: 4, sal: r1(3 + T(tid).pow / 40), hired: state.season + 1 }; L.hcRel = 60; }
  else { L.aigm = { name: L.gmName, rel: 55 }; }
  proRateAll(); NFL.forEach(t => proStars(t.id));
  if (state.phase !== 'offseason') proStartOffseason(true);
  else if (!L.order) L.order = proDraftOrder();
  L.off.fresh = true; L.off.review = Object.assign(L.off.review || {}, { fresh: true });
  if (L.role === 'coach') { L.off.step = 2; proStepEnter(2); } else proHcWish('resign');
  state.gameOver = null; applyThemeSafe();
}

/* ---------- the season ---------- */
function proWeekDate(season, wk) { const d = new Date(season, 8, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 6 + (wk - 1) * 7 + (wk >= 22 ? 7 : 0)); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
const proWeekLabel = (wk, season) => nflWeekLabel(wk) + ' · ' + proWeekDate(season || state.season, wk);
function proApply(g) {
  g.done = true; const hw = g.hs > g.as; const H = T(g.h), A = T(g.a);
  if (g.type === 'reg') [[H, g.hs, g.as, hw], [A, g.as, g.hs, !hw]].forEach(([t, us, them, win]) => { t.pf += us; t.pa += them; if (win) t.w++; else t.l++; if (g.div) { if (win) t.dw++; else t.dl++; } if (NFL_BY[g.h].conf === NFL_BY[g.a].conf) { if (win) t.cw++; else t.cl++; } });
  const exp = 1 / (1 + Math.pow(10, (A.elo - H.elo - (g.neutral ? 0 : 40)) / 400)); const dl = 24 * Math.log(Math.abs(g.hs - g.as) + 1) * ((hw ? 1 : 0) - exp) / 2; H.elo += dl; A.elo -= dl;
  if (g.box) Object.entries(g.box.op || {}).forEach(([sid, st]) => { const t = T(g.h === ME ? g.a : g.h); const s = t && t.stars && t.stars.find(x => x.id === sid); if (s) { Object.entries(st).forEach(([k, v]) => s.st[k] = (s.st[k] || 0) + v); s.gp++; } });
}
const proRank = (a, b) => (b.w - a.w) || ((b.dw - b.dl) - (a.dw - a.dl)) || ((b.pf - b.pa) - (a.pf - a.pa)) || (b.elo - a.elo);
function proDivStand(conf, div) { return Object.values(state.teams).filter(t => t.conf === conf && t.div === div).sort(proRank); }
// playoff teams per conference (league rules); a postseason in progress keeps the format it started with
const proSeedN = () => { const L = PS().lg; if (L && L.seeds && state.week > 18 && L.seedN) return L.seedN; return +rules().nflSeeds === 6 ? 6 : 7; };
const proByes = () => (proSeedN() === 6 ? 2 : 1);
function proSeeds() {
  const out = {};
  ['AFC', 'NFC'].forEach(cf => { const ts = Object.values(state.teams).filter(t => t.conf === cf); const divW = NFL_DIVS.map(dv => ts.filter(t => t.div === dv).sort(proRank)[0]).sort(proRank); const wc = ts.filter(t => !divW.includes(t)).sort(proRank).slice(0, proSeedN() - 4); out[cf] = divW.concat(wc).map(t => t.id); });
  return out;
}
const proSeedOf = id => { const s = PS().lg.seeds; if (!s) return 0; for (const cf of ['AFC', 'NFC']) { const i = (s[cf] || []).indexOf(id); if (i >= 0) return i + 1; } return 0; };
const proWinner = g => (g.hs > g.as ? g.h : g.a);
function proPo(wk, a, b, name, neutral) { const L = PS().lg; const sa = proSeedOf(a), sb = proSeedOf(b); const h = neutral ? (state.season % 2 ? a : b) : sa <= sb ? a : b; const g = proGame(state.season, ++L.gid, wk, h, h === a ? b : a, { type: 'po', name, neutral: !!neutral }); state.games.push(g); return g; }
// After a week: the playoff field, the next round, or the champion.
function proAfterWeek(wk, quiet) {
  const L = PS().lg;
  if (wk === 18) {
    L.seedN = proSeedN(); L.seeds = proSeeds();
    ['AFC', 'NFC'].forEach(cf => { const S = L.seeds[cf]; (L.seedN === 6 ? [[3, 6], [4, 5]] : [[2, 7], [3, 6], [4, 5]]).forEach(([x, y]) => proPo(19, S[x - 1], S[y - 1], cf + ' Wild Card')); });
    if (!quiet) { const sd = proSeedOf(ME); addNews(sd ? `${myName()} is in the playoffs as the No. ${sd} seed in the ${T(ME).conf}.${sd <= proByes() ? ' A top seed gets a week off.' : ''}` : `${myName()} finishes ${T(ME).w}-${T(ME).l} and misses the playoffs.`, sd ? 'big' : 'bad'); }
  } else if (wk === 19 || wk === 20) {
    ['AFC', 'NFC'].forEach(cf => {
      const S = L.seeds[cf]; const alive = wk === 19 ? S.slice(0, L.seedN === 6 ? 2 : 1).concat(state.games.filter(g => g.wk === 19 && T(g.h).conf === cf).map(proWinner)) : state.games.filter(g => g.wk === 20 && T(g.h).conf === cf).map(proWinner);
      const by = alive.slice().sort((a, b) => proSeedOf(a) - proSeedOf(b));
      if (wk === 19) { proPo(20, by[0], by[3], cf + ' Divisional'); proPo(20, by[1], by[2], cf + ' Divisional'); } else proPo(21, by[0], by[1], cf + ' Championship');
    });
  } else if (wk === 21) {
    const w = state.games.filter(g => g.wk === 21).map(proWinner); proPo(22, w.find(id => T(id).conf === 'AFC'), w.find(id => T(id).conf === 'NFC'), 'Super Bowl', true);
  } else if (wk === 22) {
    const sb = state.games.find(g => g.wk === 22); if (sb && sb.done) { L.champ = proWinner(sb); L.runner = sb.h === L.champ ? sb.a : sb.h; if (!quiet) addNews(`${teamName(L.champ)} win the Super Bowl, ${Math.max(sb.hs, sb.as)}-${Math.min(sb.hs, sb.as)} over the ${teamName(L.runner)}.`, L.champ === ME ? 'big' : ''); }
  }
  state.week = wk + 1; state.phase = wk >= 18 ? 'post' : 'regular';
}
function proAlive(id) { const L = PS().lg; if (L.champ) return false; if (state.week <= 18) return true; if (!proSeedOf(id)) return false; return !state.games.some(g => g.type === 'po' && g.done && (g.h === id || g.a === id) && proWinner(g) !== id); }
// how far a club got: 0 missed, 1 lost wild card (or bye then lost), 2 divisional, 3 conference final, 4 lost Super Bowl, 5 won it
function proPoResult(id) {
  const L = PS().lg; if (L.champ === id) return 5; if (L.runner === id) return 4;
  const lost = state.games.find(g => g.type === 'po' && g.done && (g.h === id || g.a === id) && proWinner(g) !== id); if (!lost) return proSeedOf(id) ? 1 : 0;
  return lost.wk === 19 ? 1 : lost.wk === 20 ? 2 : 3;
}
const PO_LABEL = ['Missed the playoffs', 'Wild Card round', 'Divisional round', 'Conference championship', 'Lost the Super Bowl', 'Won the Super Bowl'];
// draft order: non-playoff clubs worst first, then playoff clubs by how far they went
function proDraftOrder() { return Object.values(state.teams).slice().sort((a, b) => (proPoResult(a.id) - proPoResult(b.id)) || (a.w - b.w) || ((a.pf - a.pa) - (b.pf - b.pa)) || (a.elo - b.elo)).map(t => t.id); }
function proStandingOrder() { return Object.values(state.teams).slice().sort((a, b) => (a.w - b.w) || ((a.pf - a.pa) - (b.pf - b.pa))).map(t => t.id); }
function proExpWins() { const ts = Object.values(state.teams); const avg = ts.reduce((s, t) => s + t.rating, 0) / ts.length; const me = michStrength().ovr; return clamp(Math.round((8.5 + (me - avg) * 0.55) * 2) / 2, 3, 13.5); }

/* ---------- week by week ---------- */
function proMyGame(wk) { return state.games.find(g => g.wk === wk && (g.h === ME || g.a === ME) && !g.done); }
function proSimOthers(wk) { const L = { teams: state.teams }; const ot = rules().otNfl; state.games.filter(g => g.wk === wk && !g.done && g.h !== ME && g.a !== ME).forEach(g => { fastGame(L, g, ot, balOn()); proApply(g); }); }
// A GM can't play a game over the cap (B05). Returns false when the week was not played.
const overCap = () => isGM() && capRoom(ME) < -0.01;
function proAdvance() {
  if (state.gameOver || state.phase === 'offseason') return;
  if (state.event) autoResolveEvent();
  if (overCap() && (autoOn('cuts') || PRO_AUTO)) capFix(ME);
  if (overCap()) return false;
  proWeekAuto(); predEnsure(); commWeek();
  const wk = state.week; const mg = proMyGame(wk);
  proSimOthers(wk); if (mg) quickSim(mg);
  proEndWeek(wk, mg);
}
function proWeekAuto() { weekAutomation(); }
function proEndWeek(wk, mg) {
  if (mg) { proApply(mg); proAfterMyGame(mg); }
  if (mg && isCoach() && ROLE_TIER[state.co.role] >= 2 && state.phase !== 'offseason') maybePresser(mg); /* NFL head coaches and coordinators face reporters too */
  rehabWeek(!!mg);
  state.roster.forEach(p => { if (p.injFresh) p.injFresh = false; else if (p.inj > 0 && p.inj < 99) { p.inj--; if (p.inj === 0) addNews(`${p.n} (${p.pos}) is back from injury.`); } });
  NFL.forEach(t => { if (t.id !== ME) proRoster(t.id).forEach(p => { if (p.inj > 0) p.inj--; }); });
  if (!mg && wk <= 18) addNews(`Bye week for the ${myName()}.`);
  PS().scout = Math.min(60, (PS().scout || 0) + (isCoach() ? 1 : 2) + scoutList().length);
  if (wk <= 18) { proAiInjuries(); if (isGM()) proTradeTalk(wk); weeklyAwards(wk); }
  if (wk === 9) { PS().deadline = true; addNews('The trade deadline has passed.'); }
  if (wk === 6 && isGM()) proHcWish('deadline');
  proAfterWeek(wk);
  NFL.forEach(t => { if (t.id !== ME) proRate(t.id); });
  if (isOwner()) ownWeek(wk, mg);
  if (PS().lg.champ) { lgHistPro(); proStartOffseason(); if (isComm()) cmOffseason(); if (typeof xOffseason === 'function') xOffseason(); }
  else if (state.phase === 'post' && !proAlive(ME) && !proMyGame(state.week) && wk >= 18 && !PS().lg.outNews) { PS().lg.outNews = true; }
  if (typeof xWeek === 'function') xWeek(wk, mg);
}
function proAfterMyGame(g) {
  const home = g.h === ME, ms = home ? g.hs : g.as, os = home ? g.as : g.hs, opp = home ? g.a : g.h; const win = ms > os;
  g.mResult = win ? 'W' : 'L'; relAfterGame(g, win);
  { const L = PS(); (L.h2h || (L.h2h = [])).push({ s: state.season, opp, ms, os, win, po: g.type === 'po' }); if (L.h2h.length > 400) L.h2h.splice(0, L.h2h.length - 400); }
  if (g.box) Object.entries(g.box.p).forEach(([pid, s]) => { const p = P(pid); if (!p) return; Object.entries(s).forEach(([k, v]) => p.st[k] = (p.st[k] || 0) + v); });
  updateBook(g, ms, opp); teamRecGame(ms, os); /* the NFL record book */
  POS_ORDER.forEach(pos => { (state.depth[pos] || []).map(P).filter(avail).slice(0, START[pos] + 1).forEach(p => p.gp++); });
  mv('fan', win ? 3 : -3); mv('morale', win ? 3 : -4);
  proInjuries();
  addNews(`${g.name ? g.name + ': ' : ''}${win ? 'W' : 'L'} ${ms}-${os} ${home ? 'vs.' : 'at'} ${teamName(opp)}${g.ot ? ' (OT)' : ''}.`, win ? 'win' : 'loss');
}
function proInjuries() {
  POS_ORDER.forEach(pos => starters(pos).forEach(p => {
    if (['K', 'P', 'LS'].includes(pos)) return;
    if (R() < 0.016 * injRuleF() * (p.pers === 'fragile' ? 1.8 : 1) * (state.practice === 'conditioning' ? 0.6 : 1) * (typeof bizInjF === 'function' ? bizInjF() : 1)) {
      const t = wpick(INJ_TYPES.map(x => [x, x[3]])); const season = t[1] === 99; const w = season ? 99 : ri(t[1], t[2] + 1);
      p.inj = w; p.injType = t[0]; p.injSE = season; p.injFresh = true;
      addNews(season ? `Injury: ${p.n} (${p.pos}) has ${aAn(t[0].toLowerCase())} and is out for the season.` : `Injury: ${p.n} (${p.pos}) has ${aAn(t[0].toLowerCase())} and will miss about ${w} week${w > 1 ? 's' : ''}.`, 'bad');
    }
  }));
}
// other clubs lose players too, which moves their strength a little
function proAiInjuries() { NFL.forEach(t => { if (t.id === ME) return; proRoster(t.id).forEach(p => { if (!p.inj && R() < 0.006 * (typeof cmInjF === 'function' ? cmInjF() : 1)) p.inj = ri(1, 5); }); }); }

/* ---------- the offseason ---------- */
// fresh: you just arrived, so the season that ended was not yours to judge
function proStartOffseason(fresh) {
  const L = PS(); state.phase = 'offseason'; state.event = null; evolvePers();
  const me = T(ME); const po = proPoResult(ME);
  L.order = proDraftOrder();
  if (!fresh) {
    L.hist.push({ s: state.season, tm: ME, w: me.w, l: me.l, pf: me.pf, pa: me.pa, po, seed: proSeedOf(ME), role: isCoach() ? state.co.role : isOwner() ? 'Owner' : 'GM', exp: L.expW });
    buildHighlights({ po: PO_LABEL[po], seed: proSeedOf(ME) }); recordMile({ tm: ME, w: me.w, l: me.l, sb: po === 5, conf: po >= 4, po: po >= 1 });
    if (L.lg.champ) L.champs.push({ s: state.season, tm: L.lg.champ, ru: L.lg.runner });
  }
  // contracts roll over: a season is used up on every deal
  const all = [state.roster].concat(NFL.filter(t => t.id !== ME).map(t => proRoster(t.id)));
  all.forEach(list => list.forEach(p => { if (p.k) { kFix(p.k); p.k.yrs = Math.max(0, p.k.yrs - 1); p.k.sal.shift(); p.k.pr.shift(); kFix(p.k); } p.age++; if (p.tag) delete p.tag; }));
  L.dead = {}; L.deadline = false; L.faOffers = {}; L.faWave = 0; L.tradeOffers = []; L.fa = (L.fa || []).filter(p => p.age < 34 && p.ovr >= 55).slice(0, 80);
  // retirements around the league
  state.roster.forEach(p => p.yw = (p.yw || 0) + 1); // seasons with your club
  all.forEach(list => { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; if (proRetires(p)) { list.splice(i, 1); if (list === state.roster) { ringConsider(p); POS_ORDER.forEach(pos => state.depth[pos] = state.depth[pos].filter(id => id !== p.id)); addNews(`${p.n} (${p.pos}) retires after ${p.exp + 1} NFL seasons.`); } } } });
  rebuildPMap();
  // picks two drafts out
  NFL.forEach(t => { for (let rd = 1; rd <= PRO_ROUNDS; rd++) if (!L.picks.some(pk => pk.yr === state.season + 2 && pk.rd === rd && pk.orig === t.id && !pk.c)) L.picks.push({ yr: state.season + 2, rd, orig: t.id, own: t.id }); });
  L.picks = L.picks.filter(pk => pk.yr >= state.season + 1);
  if (!L.dc || L.dc.yr !== state.season + 1) L.dc = genDraftClass(state.season + 1);
  const coachFired = proAiFirings();
  L.off = { step: 0, review: { w: me.w, l: me.l, po, seed: proSeedOf(ME), exp: L.expW, fresh: !!fresh, openings: coachFired } };
  try { L.chg = { s: state.season, ovr: Math.round(michStrength().ovr), ros: state.roster.map(p => [p.id, p.n, p.pos, p.ovr]) }; } catch (e) { L.chg = null; } /* QOL-10: what the offseason changes */
  if (!fresh) { if (isCoach()) proCoachSeasonEnd(); else if (isOwner()) ownSeasonEnd(); else proOwnerReview(); }
  else if (isCoach()) { state.co.market = null; }
  if (isGM()) proHcWish('resign');
}
function proRetires(p) {
  if (p.k && p.k.yrs > 0 && p.age < 35) return false;
  if (p.age >= 38) return true; if (p.age >= 35) return R() < 0.55; if (p.age >= 32 && p.ovr < 70) return R() < 0.5; if (p.ovr < 56 && p.age >= 28) return R() < 0.35; return false;
}
// computer-run clubs fire coaches and GMs after bad years; returns the coaching openings
function proAiFirings() {
  const out = [];
  NFL.forEach(t => {
    if (t.id === ME) return; const tm = T(t.id); const ai = PS().aistaff[t.id]; if (!ai) return;
    const hcGo = (tm.w <= 4 && R() < 0.75) || (tm.w <= 6 && R() < 0.4) || (tm.w <= 8 && R() < 0.1);
    if (hcGo) { addNews(`The ${teamName(t.id)} fire head coach ${ai.hc.name} after a ${tm.w}-${tm.l} season.`); ai.hc.open = true; out.push(t.id); }
    ai.gmOpen = (tm.w <= 4 && R() < 0.45) || (tm.w <= 6 && R() < 0.12);
    if (ai.gmOpen) addNews(`The ${teamName(t.id)} part ways with general manager ${ai.gm}.`);
  });
  return out;
}
// computer-run clubs fill their openings when the offseason moves on
function proAiHires() {
  NFL.forEach(t => { const ai = PS().aistaff[t.id]; if (!ai) return; if (ai.hc.open) { const c = genProCandidates(3).sort((a, b) => coachOvr(b) - coachOvr(a))[0]; ai.hc = { name: c.name, off: c.off, def: c.def, gm: c.gm, age: c.age, yrs: 5 }; T(t.id).coach = c.name; addNews(`The ${teamName(t.id)} hire ${c.name} as head coach.`); } if (ai.gmOpen) { ai.gm = genName(); ai.gmOpen = false; } });
}
// The owner's verdict on your season as GM.
function proOwnerReview() {
  const L = PS(); const g = L.gm; const rv = L.off.review; const first = g.hired === state.season;
  const poB = [0, 4, 7, 10, 13, 20][rv.po]; const capOk = capRoom(ME) >= -1;
  let d = (rv.w - rv.exp) * 3 + poB + (L.hcRel >= 70 ? 1 : L.hcRel < 30 ? -3 : 0) + (capOk ? 0 : -5) + (bossRel().rap - 55) * 0.12; // your rapport with the owner (relationships)
  d = clamp(d, -30, 30); if (d < 0) d *= diff().neg; if (d < 0 && first) d *= 0.6;
  const before = g.sec; g.sec = clamp(Math.round(60 + (g.sec - 60) * 0.8 + d), 0, 100); g.yrs = Math.max(0, g.yrs - 1);
  rv.secBefore = before; rv.sec = g.sec; rv.d = Math.round(d);
  execRepAdd(d / 4 + (rv.po >= 5 ? 6 : 0));
  jobsLog().push({ s: state.season, lvl: 'nfl', tid: ME, role: 'GM', w: rv.w, l: rv.l, po: rv.po });
  if (!state.settings.noFire && !first && (g.sec <= diff().fire + 14 || (g.yrs <= 0 && g.sec < 50))) {
    state.gameOver = { reason: g.yrs <= 0 && g.sec > diff().fire + 14 ? `Your contract is up and the owner of the ${myName()} has decided not to bring you back.` : `The owner of the ${myName()} has fired you after ${aAn(rv.w + '-' + rv.l)} season.`, jobs: execJobs(true), lvl: 'nfl' };
    addNews(state.gameOver.reason, 'bad'); return;
  }
  if (g.yrs <= 0) { g.yrs = 3; g.sal = r1(g.sal * 1.1); addNews(`The ${myName()} sign their GM to a three-year extension.`, 'big'); }
  L.offers = execJobs(false);
}

/* ---------- the draft class ---------- */
function genDraftClass(yr) {
  const r = lrng(state.seed + ':dc:' + yr); const out = []; const tot = PRO_POS_MIX.reduce((s, x) => s + x[1], 0);
  const posOf = () => { let v = r() * tot; for (const [pos, w] of PRO_POS_MIX) { v -= w; if (v <= 0) return pos; } return 'WR'; };
  const g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  for (let i = 0; i < Math.max(270, NFL.length * 7 + 46); i++) {
    const pos = posOf(); const grade = 100 - i * 0.36 + g() * 4.5;
    const sp = ['K', 'P', 'LS'].includes(pos); const ovr = clamp(Math.round(47 + grade * 0.28 + g() * 2.5 + (sp ? 4 : 0)), 42, 82); const pot = sp ? clamp(ovr + 4 + Math.round(r() * 6), ovr, 92) : clamp(Math.round(ovr + 6 + grade * 0.12 + g() * 4), ovr + 2, 97);
    const age = 21 + Math.floor(r() * 3);
    out.push({ id: 'd' + yr + '_' + i, n: genNameR(r), pos, age, ovr, pot, col: pickCollege(r), sc: 0, bias: Math.round((r() - 0.5) * 8), pbias: Math.round((r() - 0.5) * 10), hype: Math.round(g() * 3) });
  }
  // the media's consensus board: talent plus hype, not perfect
  const cv = p => p.ovr * 0.55 + p.pot * 0.45 + p.hype + (PRO_POS_W[p.pos] - 1) * 8; out.sort((a, b) => cv(b) - cv(a)); out.forEach((p, i) => p.cr = i + 1);
  return { yr, list: out };
}
function genNameR(r) { return FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)]; }
// what your scouts think: a range that narrows with each look
const SC_ERR = [7, 4, 2, 0];
function scoutView(p) { const e = SC_ERR[effSc(p)]; const b = Math.round((p.bias || 0) * e / 7), pb = Math.round((p.pbias || 0) * e / 7); return { lo: clamp(p.ovr + b - e, 35, 99), hi: clamp(p.ovr + b + e, 35, 99), plo: clamp(p.pot + pb - e - 2, 35, 99), phi: clamp(p.pot + pb + e + 2, 35, 99), mid: clamp(p.ovr + b, 35, 99), pmid: clamp(p.pot + pb, 35, 99) }; }
const myBoardVal = p => { const v = scoutView(p); return v.mid * 0.5 + v.pmid * 0.5 + (PRO_POS_W[p.pos] - 1) * 6; };
function scoutProspect(id) { const L = PS(); const p = L.dc && L.dc.list.find(x => x.id === id); if (!p || p.sc >= 3 || L.scout < 1) return false; L.scout--; p.sc++; return true; }
function autoScout() { const L = PS(); if (!L.dc) return; const list = L.dc.list.filter(p => !p.taken && p.sc < 2).sort((a, b) => a.cr - b.cr); for (const p of list) { if (L.scout < 1) break; L.scout--; p.sc++; } }

/* ---------- player development (training camp) ---------- */
function proDevelop(p, mine) {
  const pk = PRO_PEAK[p.pos] || 28; let d;
  if (p.age <= pk - 3) d = Math.round(Math.max(0, p.pot - p.ovr) * rnd(0.06, 0.26) + rnd(-1.5, 1.5));
  else if (p.age <= pk + 1) d = ri(-2, 1);
  else d = -ri(1, 2 + Math.min(5, p.age - pk - 1));
  if (mine) { const c = state.staff[POS_COACH[p.pos]]; const dv = c ? (c.dev || 70) : 65; d += Math.round((dv - 72) / 12 + (state.staff.HC ? (state.staff.HC.dev - 75) / 20 : 0)); if (isCoach() && rolePositions(state.co.role).includes(p.pos) && state.co.role !== 'HC') { const f = state.co.focus || 'balanced'; const starter = (state.depth[p.pos] || []).indexOf(p.id) < START[p.pos]; d += Math.round((state.co.sk.dev - 70) / 12 + (f === 'starters' && starter ? 1 : f === 'young' && p.age <= 24 ? 1 : 0)); } }
  const before = p.ovr; p.ovr = clamp(p.ovr + d, 40, 99); p.pot = Math.max(p.ovr, p.pot - (p.age > pk ? 2 : ri(0, 2))); if (p.tr) Object.keys(p.tr).forEach(k => p.tr[k] = clamp(p.tr[k] + (p.ovr - before), 30, 99));
  return p.ovr - before;
}

/* ---------- roster needs ---------- */
const underContract = p => !!(p.k && p.k.yrs > 0);
function posNeed(tid, pos, list) {
  list = (list || proRoster(tid)).filter(p => p.pos === pos && (underContract(p) || state.phase !== 'offseason')).sort((a, b) => b.ovr - a.ovr);
  const st = START[pos]; const avg = avgOvr(list.slice(0, st), st);
  return r2(clamp((76 - avg) / 10, 0, 2) + Math.max(0, PRO_ROSTER[pos] - list.length) / PRO_ROSTER[pos]);
}
const worstStarter = (tid, pos) => { const l = proRoster(tid).filter(p => p.pos === pos && underContract(p)).sort((a, b) => b.ovr - a.ovr); return l.length >= START[pos] ? l[START[pos] - 1].ovr : 45; };
function needList(tid) { return POS_ORDER.map(pos => ({ pos, n: posNeed(tid, pos) })).sort((a, b) => b.n - a.n); }

/* ---------- your roster moves ---------- */
const txLog = txt => { const L = PS(); L.tx.unshift({ s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, txt }); if (L.tx.length > 120) L.tx.length = 120; };
function removeMine(pid) { const i = state.roster.findIndex(p => p.id === pid); if (i < 0) return null; const p = state.roster.splice(i, 1)[0]; POS_ORDER.forEach(pos => state.depth[pos] = (state.depth[pos] || []).filter(id => id !== pid)); rebuildPMap(); return p; }
function addMine(p) { enrichPro(p); state.roster.push(p); state.depth[p.pos] = (state.depth[p.pos] || []).concat(p.id); rebuildPMap(); return p; }
const toFA = (p, f, from) => { const L = PS(); const lp = leanPro(p); lp.k = null; if (from) lp.cfa = { tid: from, s: state.season }; /* his contract ran out: a loss that can earn a compensatory pick */ lp.ask = { apy: r2(Math.max(PRO_MINSAL, pValue(lp) * (f || 1))), yrs: wantYears(lp.age) }; if (lp.age < 36 && lp.ovr >= 52) L.fa.push(lp); return lp; };
// roster moves never happen in the middle of a live game (B06)
const liveLock = () => state.liveWk != null;
function cutPlayer(pid) {
  if (liveLock()) return null;
  const p = P(pid); if (!p) return null; const dead = p.k && p.k.yrs > 0 ? deadIfCut(p) : 0; const saves = p.k && p.k.yrs > 0 ? cutSaves(p) : 0;
  removeMine(pid); if (dead) addDead(ME, dead); toFA(p, 0.9);
  txLog(`Released ${p.pos} ${p.n}${dead ? ` (${fmM(dead)} dead money)` : ''}.`); addNews(`The ${myName()} release ${p.pos} ${p.n}.`);
  return { dead, saves };
}
function restructure(pid) {
  const p = P(pid); if (!p || !p.k || p.k.yrs < 2 || p.k.rk || p.k.rs === state.season || p.k.base <= PRO_MINSAL * 2) return null;
  const saved = restructureK(p.k); rapAdj(p, 2, 'Restructured (more guaranteed money)'); txLog(`Restructured ${p.n}'s contract (saves ${fmM(saved)} this year).`); return saved;
}
const tagValue = pos => r2(PRO_TOP[pos] * 0.68);
// what a player asks for to re-sign or extend
// rapport moves the price: a player close to you gives a discount, an unhappy one wants more, a broken one won't extend
const rapPriceF = p => { const v = rapOf(p); return v >= 80 ? 0.94 : v >= 63 ? 0.98 : v < 30 ? 1.1 : v < 45 ? 1.04 : 1; };
function askFor(p, ext) { if (!p.ask || p.ask.s !== state.season || p.ask.ext !== !!ext) { p.ask = { s: state.season, ext: !!ext, apy: r2(pValue(p) * rnd(1.0, 1.12) * (ext ? 1.04 : 1) * rapPriceF(p)), yrs: wantYears(p.age), round: 0 }; if (ext && rapOf(p) < 25) p.ask.walk = true; } return p.ask; }
// a contract offer to one of your own players: 'signed', 'counter' or 'walk'
function offerOwn(pid, apy, yrs, sh) {
  const p = P(pid); if (!p) return null; const ext = underContract(p); const a = askFor(p, ext); apy = r2(apy); yrs = clamp(Math.round(yrs), 1, 6); const ev = r2(apy * shapeV(sh)); // what the deal is worth to him
  if (a.walk) return 'walk';
  // the new deal has to fit under the cap before anything changes (B05)
  const nk = ext ? extendK(p.k, apy, yrs, sh) : mkContract(apy, yrs, 0.3, false, sh); const delta = r2(nk.base + nk.bpy - (ext ? capHit(p) : 0)); if (delta > 0 && delta > capRoom(ME) + 0.01) return 'cap';
  if (ev >= a.apy * 0.95 && Math.abs(yrs - a.yrs) <= 1) { signOwn(p, apy, yrs, ext, sh); return 'signed'; }
  if (ev < a.apy * 0.85) rapAdj(p, -4, 'Lowball contract offer');
  a.round++; if (a.round >= 3 || ev < a.apy * 0.75) { a.walk = true; return 'walk'; }
  a.apy = r2((a.apy + Math.max(ev, a.apy * 0.85)) / 2 + a.apy * 0.02); return 'counter';
}
function signOwn(p, apy, yrs, ext, sh) {
  const old = p.k; if (ext && old) p.k = extendK(old, apy, yrs, sh);
  else p.k = mkContract(apy, yrs, 0.3, false, sh);
  delete p.ask; rapAdj(p, 8, ext ? 'Got an extension' : 'Re-signed'); txLog(`${ext ? 'Extended' : 'Re-signed'} ${p.pos} ${p.n}: ${p.k.yrs} years, ${fmM(apy)} a year.`); addNews(`The ${myName()} ${ext ? 'extend' : 're-sign'} ${p.pos} ${p.n}: ${yrs} year${yrs > 1 ? 's' : ''}, ${fmM(apy * yrs)}.`, 'win');
}
function tagPlayer(pid) { const L = PS(); const p = P(pid); if (!p || underContract(p) || L.tag === state.season) return false; L.tag = state.season; rapAdj(p, -6, 'Franchise-tagged'); p.k = kFix({ base: tagValue(p.pos), bpy: 0, yrs: 1, tot: 1, tag: true, apy: tagValue(p.pos) }); p.tag = true; delete p.ask; txLog(`Franchise tag on ${p.n} (${fmM(tagValue(p.pos))}).`); addNews(`The ${myName()} use the franchise tag on ${p.pos} ${p.n}.`, 'big'); return true; }
// unsigned players of yours leave when free agency opens
function letWalk(pid) { const p = removeMine(pid); if (!p) return; toFA(p, 1.05, ME); txLog(`Let ${p.pos} ${p.n} go to free agency.`); }

/* ---------- free agency ---------- */
const FA_FLOOR = [0.92, 0.82, 0.7];
function faFind(pid) { return PS().fa.find(p => p.id === pid); }
// this season's cap hit of a free-agent deal
const faHit0 = (apy, yrs, sh) => { const k = mkContract(apy, yrs, apy > 4 ? 0.3 : 0, false, sh); return r2(k.base + k.bpy); };
function faOffer(pid, apy, yrs, sh) { const p = faFind(pid); if (!p) return 'gone'; apy = r2(Math.max(PRO_MINSAL, apy)); if (faHit0(apy, yrs, sh) > capRoom(ME) + 0.01) return 'cap'; if (state.roster.length >= (state.phase === 'offseason' ? PRO_OFF_MAX : proMax())) return 'full'; PS().faOffers[pid] = { apy, yrs: clamp(Math.round(yrs), 1, 5) }; if (sh && sh !== 'flat') PS().faOffers[pid].sh = sh; return 'ok'; }
// signs a free agent right away (outside the bidding waves): he takes it at or near his asking price
function faSignNow(pid, apy, yrs, sh) {
  const L = PS(); const p = faFind(pid); if (!p) return 'gone'; if (liveLock()) return 'live'; apy = r2(apy);
  if (L.off && L.off.step === 3 && L.faWave < 3) return faOffer(pid, apy, yrs, sh);
  if (faHit0(apy, yrs, sh) > capRoom(ME) + 0.01) return 'cap'; if (state.roster.length >= (state.phase === 'offseason' ? PRO_OFF_MAX : proMax())) return 'full';
  if (apy * shapeV(sh) < p.ask.apy * 0.95) return 'low';
  faSign(p, ME, apy, yrs, sh); return 'signed';
}
function faSign(p, tid, apy, yrs, sh) {
  const L = PS(); L.fa = L.fa.filter(x => x.id !== p.id); delete L.faOffers[p.id]; const ask = p.ask; delete p.ask;
  if (p.cfa && p.cfa.s === state.season && p.cfa.tid !== tid) (L.cfa || (L.cfa = [])).push({ s: state.season, from: p.cfa.tid, to: tid, apy: r2(apy), n: p.n }); delete p.cfa;
  p.k = mkContract(apy, yrs || (ask ? ask.yrs : 1), apy > 4 ? 0.3 : 0, false, sh);
  if (tid === ME) { addMine(p); txLog(`Signed free agent ${p.pos} ${p.n}: ${p.k.yrs} years, ${fmM(apy)} a year.`); addNews(`The ${myName()} sign free agent ${p.pos} ${p.n} (${p.ovr} OVR): ${p.k.yrs} year${p.k.yrs > 1 ? 's' : ''}, ${fmM(apy * p.k.yrs)}.`, 'win'); }
  else { L.rost[tid].push(p); if (p.ovr >= 80) addNews(`Free agency: ${p.pos} ${p.n} (${p.ovr}) signs with the ${teamName(tid)}, ${fmM(apy)} a year.`); }
}
// how well a player suits a club's systems, as a value multiplier (team identity)
const fitF = (tid, p) => { const f = playerFit(p, teamScheme(tid)); return f == null ? 1 : 1 + clamp(f, -6, 6) * 0.02; };
function aiWants(tid, p) { if (tid === ME) return 0; const room = capRoom(tid); if (room < p.ask.apy * 0.9 || proRoster(tid).length >= PRO_OFF_MAX) return 0; const need = posNeed(tid, p.pos); const up = p.ovr - worstStarter(tid, p.pos); const rich = clamp(room / proCap(capYear()), 0, 0.5); return need > 0.25 || up > 0 ? Math.min(0.9, (0.12 + need * 0.45 + Math.max(0, up) * 0.03 + rich * 0.8) * fitF(tid, p)) : 0; }
// one round of bidding: every free agent with offers picks the best one
function proFaWave() {
  const L = PS(); const w = clamp(L.faWave, 0, 2); const myBids = aiGM() ? myGmFaBids() : {};
  const list = L.fa.slice().sort((a, b) => pValue(b) - pValue(a));
  for (const p of list) {
    const bids = []; const mine = L.faOffers[p.id] || myBids[p.id];
    if (mine && faHit0(mine.apy, mine.yrs, mine.sh) <= capRoom(ME) + 0.01 && state.roster.length < PRO_OFF_MAX) bids.push({ tid: ME, apy: mine.apy, yrs: mine.yrs, sh: mine.sh });
    const cands = NFL.map(t => t.id).filter(id => id !== ME).map(id => ({ id, w: aiWants(id, p) })).filter(x => x.w > 0).sort((a, b) => b.w - a.w).slice(0, 4);
    cands.forEach(c => { if (R() < c.w) bids.push({ tid: c.id, apy: r2(p.ask.apy * rnd(0.9, 1.08)), yrs: p.ask.yrs }); });
    if (!bids.length) continue;
    // each bid gets one score per wave, so sorting is stable (S01)
    bids.forEach(b => { b.sc = b.apy * shapeV(b.sh) * (1 + 0.04 * Math.min(b.yrs, p.ask.yrs)) * (1 + (T(b.tid).rating - 74) / 90) * rnd(0.96, 1.04); });
    const best = bids.sort((a, b) => b.sc - a.sc)[0];
    if (best.apy * shapeV(best.sh) >= p.ask.apy * FA_FLOOR[w]) { faSign(p, best.tid, best.apy, best.yrs, best.sh); if (mine && best.tid !== ME && isGM()) addNews(`${p.pos} ${p.n} signs with the ${teamName(best.tid)} instead (${fmM(best.apy)} a year).`, 'bad'); }
    else if (best.tid === ME) addNews(`${p.n} turns down your offer and keeps looking.`);
  }
  L.fa.forEach(p => { if (p.ask) p.ask.apy = r2(Math.max(PRO_MINSAL, p.ask.apy * 0.88)); });
  Object.keys(L.faOffers).forEach(id => { if (!faFind(id)) delete L.faOffers[id]; });
  L.faWave++;
}

/* ---------- computer-run clubs ---------- */
// expiring deals: keep the good ones, release the rest into free agency
function proAiResign() {
  NFL.forEach(t => {
    if (t.id === ME) return; const list = PS().rost[t.id];
    list.filter(p => !underContract(p)).sort((a, b) => b.ovr - a.ovr).forEach(p => {
      const keep = (p.age <= 30 && p.ovr >= worstStarter(t.id, p.pos) - 1 ? 0.7 : p.age <= 31 && p.ovr >= 70 ? 0.4 : 0.15);
      const apy = r2(pValue(p) * rnd(0.95, 1.12));
      if (R() < keep && capRoom(t.id) > apy) p.k = mkContract(apy, wantYears(p.age), 0.25);
      else { list.splice(list.indexOf(p), 1); toFA(p, 1.05, t.id); }
    });
  });
}
// your own club when the GM is computer-run (Coach mode): the same choices, with your input
function myGmResign() {
  const w = gmWeight(); const cin = PS().cin;
  state.roster.filter(p => !underContract(p)).sort((a, b) => b.ovr - a.ovr).forEach(p => {
    const asked = cin.cut.includes(p.id); const wantKeep = (cin.keep || []).includes(p.id);
    let keep = (p.age <= 30 && p.ovr >= worstStarter(ME, p.pos) - 1 ? 0.75 : p.age <= 31 && p.ovr >= 70 ? 0.4 : 0.15);
    if (asked && R() < w) keep = 0; if (wantKeep && R() < w) keep = 1;
    const apy = r2(pValue(p) * rnd(0.95, 1.1));
    if (R() < keep && capRoom(ME) > apy) { p.k = mkContract(apy, wantYears(p.age), 0.25); txLog(`Re-signed ${p.pos} ${p.n}.`); if (wantKeep) cinNote(`The GM re-signed ${p.n}, as you asked.`); }
    else { letWalk(p.id); if (wantKeep) cinNote(`The GM let ${p.n} walk despite your push to keep him.`); else if (asked) cinNote(`The GM let ${p.n} go, as you suggested.`); }
  });
}
// trims to 53 (lowest value first, avoiding big dead money) and fills any empty spots with street free agents
function trimRoster(tid, max) {
  const list = proRoster(tid); if (list.length <= max) return [];
  const keepScore = p => p.ovr + (p.age <= 24 ? (p.pot - p.ovr) * 0.4 : 0) + Math.min(8, deadIfCut(p) * 1.5) + (list.filter(x => x.pos === p.pos).length <= PRO_ROSTER[p.pos] - 1 ? 30 : 0);
  const out = [];
  while (list.length > max) {
    const counts = {}; list.forEach(p => counts[p.pos] = (counts[p.pos] || 0) + 1);
    const cand = list.filter(p => counts[p.pos] > Math.max(1, PRO_ROSTER[p.pos] - 1)).sort((a, b) => keepScore(a) - keepScore(b))[0] || list.slice().sort((a, b) => keepScore(a) - keepScore(b))[0];
    if (tid === ME) { out.push(cand.n); cutPlayer(cand.id); }
    else { list.splice(list.indexOf(cand), 1); const d = deadIfCut(cand); if (d) addDead(tid, d); toFA(cand, 0.8); }
  }
  return out;
}
// gets a club under the cap: restructures first, then releases the players whose cuts save the most without hurting much
function capFix(tid) {
  const out = []; let guard = 0;
  while (capRoom(tid) < 0 && guard++ < 40) {
    const list = proRoster(tid); const rs = list.filter(p => p.k && p.k.yrs >= 2 && !p.k.rk && p.k.rs !== state.season && p.k.base > PRO_MINSAL * 2).sort((a, b) => b.k.base - a.k.base)[0];
    if (rs) { if (tid === ME) { const sv = restructure(rs.id); out.push(`restructured ${rs.n} (${fmM(sv)})`); } else restructureK(rs.k); continue; }
    const counts = {}; list.forEach(p => counts[p.pos] = (counts[p.pos] || 0) + 1);
    const cut = list.filter(p => p.k && cutSaves(p) > 0.3 && counts[p.pos] > START[p.pos]).sort((a, b) => (cutSaves(b) / Math.max(1, b.ovr - 50)) - (cutSaves(a) / Math.max(1, a.ovr - 50)))[0];
    if (!cut) break;
    if (tid === ME) { cutPlayer(cut.id); out.push(`released ${cut.n}`); } else { list.splice(list.indexOf(cut), 1); addDead(tid, deadIfCut(cut)); toFA(cut, 0.9); }
  }
  return out;
}
function fillRosterPro(tid) {
  const L = PS(); let n = 0;
  const topUp = () => { if (tid !== ME) { while (proRoster(tid).length < proMax() - 2) { const pos = needList(tid)[0].pos; const fa = L.fa.filter(p => p.pos === pos && p.ask && p.ask.apy <= 1.5).sort((a, b) => b.ovr - a.ovr)[0]; const p = fa || mkPro({ n: genName(), pos, age: ri(23, 28), ovr: ri(54, 61), pot: ri(58, 66), exp: ri(0, 3), col: pickCollege(R) }); if (fa) L.fa = L.fa.filter(x => x.id !== fa.id); delete p.ask; p.k = mkContract(PRO_MINSAL, 1, 0); L.rost[tid].push(p); } return; } while (state.roster.length < proMax() - 2 && capRoom(ME) > 3) { const pos = needList(ME)[0].pos; const fa = L.fa.filter(p => p.pos === pos && p.ask && p.ask.apy <= 1.5).sort((a, b) => b.ovr - a.ovr)[0]; const p = fa || mkPro({ n: genName(), pos, age: ri(23, 28), ovr: ri(54, 61), pot: ri(58, 66), exp: ri(0, 3), col: pickCollege(R) }); if (fa) L.fa = L.fa.filter(x => x.id !== fa.id); delete p.ask; p.k = mkContract(PRO_MINSAL, 1, 0); addMine(p); txLog(`Signed ${pos} ${p.n} to fill out the roster.`); n++; } };
  POS_ORDER.forEach(pos => {
    const need = tid === ME ? Math.max(START[pos] + (['K', 'P', 'LS'].includes(pos) ? 0 : 1), Math.min(PRO_ROSTER[pos], START[pos] + 2)) : PRO_ROSTER[pos] - (['K', 'P', 'LS'].includes(pos) ? 0 : 1);
    let have = proRoster(tid).filter(p => p.pos === pos).length;
    while (have < need) {
      const fa = L.fa.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr)[0];
      const p = fa || mkPro({ n: genName(), pos, age: ri(23, 28), ovr: ri(52, 60), pot: ri(58, 66), exp: ri(0, 3), col: pickCollege(R) });
      if (fa) L.fa = L.fa.filter(x => x.id !== fa.id);
      delete p.ask; p.k = mkContract(PRO_MINSAL, 1, 0);
      if (tid === ME) { addMine(p); txLog(`Signed ${pos} ${p.n} off the street.`); } else L.rost[tid].push(p);
      have++; n++;
    }
  });
  topUp();
  return n;
}

/* ---------- trades ---------- */
// give: what you send, get: what you receive; each { pl: [player ids], pk: [pick indexes in pro.picks] }
function tradeValues(tid, give, get) {
  const L = PS(); const rebuild = T(tid).rating < 72 || (state.phase !== 'offseason' && T(tid).w < T(tid).l - 2);
  const pkF = rebuild ? 1.15 : 0.92;
  const mineP = give.pl.map(P).filter(Boolean), theirP = get.pl.map(id => proRoster(tid).find(p => p.id === id)).filter(Boolean);
  const pv = (p, side) => { let v = tradeValue(p); if (side === 'in') { if (posNeed(tid, p.pos) > 0.5) v *= 1.12; if (rebuild && p.age >= 29) v *= 0.8; } return v; };
  const inV = Math.round(mineP.reduce((s, p) => s + pv(p, 'in'), 0) + give.pk.map(i => L.picks[i]).filter(Boolean).reduce((s, pk) => s + pickPts(pk) * pkF, 0));
  const outV = Math.round(theirP.reduce((s, p) => s + pv(p, 'out'), 0) + get.pk.map(i => L.picks[i]).filter(Boolean).reduce((s, pk) => s + pickPts(pk) * pkF, 0));
  return { inV, outV, mineP, theirP, rebuild };
}
function tradeCheck(tid, give, get, force) {
  const L = PS(); if (!T(tid) || tid === ME) return { ok: false, why: 'Pick a trade partner.' };
  if (liveLock()) return { ok: false, why: 'Finish the live game first.' };
  if (state.phase !== 'offseason' && state.week > 9) return { ok: false, why: 'The trade deadline has passed. Trades open again in the offseason.' };
  if (!give.pl.length && !give.pk.length) return { ok: false, why: 'Add something you would give up.' };
  if (!get.pl.length && !get.pk.length) return { ok: false, why: 'Add something you want back.' };
  if (give.pk.some(i => !L.picks[i] || L.picks[i].own !== ME) || get.pk.some(i => !L.picks[i] || L.picks[i].own !== tid)) return { ok: false, why: 'One of those picks has changed hands.' };
  const v = tradeValues(tid, give, get);
  const hitIn = v.theirP.reduce((s, p) => s + (underContract(p) ? capHit(p) : 0), 0), hitOut = v.mineP.reduce((s, p) => s + (underContract(p) ? capHit(p) : 0), 0);
  // only a trade that adds salary needs cap room: a picks-only deal with a club at the cap is fine
  if (hitIn - hitOut > 0.01 && hitIn - hitOut > capRoom(ME) + 0.01) return { ok: false, why: `That puts you over the cap by ${fmM(hitIn - hitOut - capRoom(ME))}. Clear room first.`, v };
  if (hitOut - hitIn > 0.01 && hitOut - hitIn > capRoom(tid) + 0.01) return { ok: false, why: `The ${teamName(tid)} can't fit the salary under their cap.`, v };
  const maxR = state.phase === 'offseason' ? PRO_OFF_MAX : proMax();
  if (state.roster.length - v.mineP.length + v.theirP.length > maxR) return { ok: false, why: `That would put you over ${maxR} players. Release someone first.`, v };
  const need = Math.round(v.outV * 1.05 + 15 - v.inV);
  if (need <= 0 || force) return { ok: true, v };
  const why = tradeReasons(tid, v, give.pk.length + get.pk.length); return { ok: false, why: `The ${teamName(tid)} say no. They want about ${need} more points of value.${why.length ? ' ' + why.join(' ') : ''}`, v, need, reasons: why };
}
// why a club values the package the way it does: the same factors tradeValues uses
function tradeReasons(tid, v, nPk) {
  const r = []; const nm = l => l.map(p => p.n).join(' and ');
  const old = v.mineP.filter(p => p.age >= 29); const fills = v.mineP.filter(p => posNeed(tid, p.pos) > 0.5);
  if (v.rebuild && (old.length || nPk)) r.push(old.length ? `They're rebuilding, so ${nm(old)} count${old.length > 1 ? '' : 's'} for less at ${old.length > 1 ? '29 or older' : old[0].age}, and draft picks count for more.` : "They're rebuilding, so draft picks count for more with them than usual.");
  else if (!v.rebuild && nPk) r.push("They're trying to win now, so draft picks count for a little less with them.");
  if (fills.length) r.push(`${nm(fills)} fill${fills.length > 1 ? '' : 's'} a need for them, which helps.`);
  else if (v.mineP.length) r.push(`Nothing you're sending fills a need. Their biggest needs: ${needList(tid).slice(0, 3).map(n => n.pos).join(', ')}.`);
  const costly = v.mineP.filter(p => underContract(p) && capHit(p) > pValue(p) * 1.25); if (costly.length) r.push(`${nm(costly)} cost${costly.length > 1 ? '' : 's'} more than ${costly.length > 1 ? 'they play' : 'he plays'}, which lowers ${costly.length > 1 ? 'their' : 'his'} value.`);
  const stars = v.theirP.filter(p => tradeValue(p) >= 900); if (stars.length) r.push(`${nm(stars)} ${stars.length > 1 ? 'are' : 'is'} among their most valuable players, so they want a lot back.`);
  return r.slice(0, 3);
}
function tradeExec(tid, give, get, force) {
  const c = tradeCheck(tid, give, get, force); if (!c.ok) return c; const L = PS(); const v = c.v;
  v.mineP.forEach(p => { removeMine(p.id); L.rost[tid].push(leanPro(p)); });
  v.theirP.forEach(p => { L.rost[tid].splice(L.rost[tid].indexOf(p), 1); addMine(p); });
  give.pk.forEach(i => L.picks[i].own = tid); get.pk.forEach(i => L.picks[i].own = ME);
  const desc = (ps, pks) => ps.map(p => `${p.pos} ${p.n}`).concat(pks.map(i => pickLabel(L.picks[i]))).join(', ');
  const txt = `Trade with the ${teamName(tid)}: sent ${desc(v.mineP, give.pk)}; received ${desc(v.theirP, get.pk)}.`;
  txLog(txt); addNews(txt, 'big'); proRate(tid); proStars(tid); proRate(ME); syncDraftSlots();
  L.tradeOffers = (L.tradeOffers || []).filter(o => !o.get.pl.some(id => v.mineP.some(p => p.id === id)) && !o.give.pl.some(id => v.theirP.some(p => p.id === id)));
  return { ok: true };
}
// the cheapest of your picks that closes a value gap
function sweetener(tid, need) { const L = PS(); const mine = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === ME); const pkF = tradeValues(tid, { pl: [], pk: [] }, { pl: [], pk: [] }).rebuild ? 1.15 : 0.92; const fit = mine.filter(x => pickPts(x.pk) * pkF >= need).sort((a, b) => pickPts(a.pk) - pickPts(b.pk))[0]; return fit ? fit.i : null; }
// Computer-run clubs call about your players during the season.
function proTradeTalk(wk) {
  const L = PS(); L.tradeOffers = (L.tradeOffers || []).filter(o => o.exp >= wk && o.s === state.season);
  // deadline season: in the last weeks before the deadline, clubs call more often, and sellers offer you players
  const near = wk >= 6 && wk <= 9; if (near && isGM() && L.tradeOffers.length < 3 && R() < 0.3) proSellerOffer(wk);
  if (wk > 8 || R() > (near ? 0.35 : 0.22) || L.tradeOffers.length >= 3) return;
  const targets = state.roster.filter(p => underContract(p) && p.ovr >= 70 && tradeValue(p) >= 120).sort(() => R() - 0.5); const p = targets[0]; if (!p) return;
  const teams = NFL.map(t => t.id).filter(id => id !== ME && posNeed(id, p.pos) > 0.35 && capRoom(id) >= capHit(p)); if (!teams.length) return;
  const tid = pick(teams); const val = tradeValue(p) * rnd(0.95, 1.12);
  const their = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === tid).sort((a, b) => pickPts(b.pk) - pickPts(a.pk));
  const give = []; let sum = 0; for (const x of their) { if (sum >= val) break; if (sum + pickPts(x.pk) <= val * 1.15) { give.push(x.i); sum += pickPts(x.pk); } }
  if (!give.length || sum < val * 0.9) return;
  L.tradeOffers.push({ id: 'to' + wk + '_' + p.id, s: state.season, tid, exp: wk + 1, get: { pl: [p.id], pk: [] }, give: { pl: [], pk: give } });
  addNews(`The ${teamName(tid)} call about ${p.pos} ${p.n}. See the offer on the Trades tab.`);
}
// a club out of the race offers you a veteran for picks (you're the buyer)
function proSellerOffer(wk) {
  const L = PS(); const me = T(ME); if (me.w < me.l) return; const need = needList(ME)[0]; if (!need) return;
  const sellers = NFL.map(t => t.id).filter(id => id !== ME && T(id).w + 1 < T(id).l);
  const cands = sellers.flatMap(id => proRoster(id).filter(p => p.pos === need.pos && p.age >= 27 && p.ovr >= worstStarter(ME, p.pos) + 3 && underContract(p) && capHit(p) <= capRoom(ME)).map(p => ({ id, p }))).sort((a, b) => b.p.ovr - a.p.ovr);
  const x = cands[0]; if (!x) return; const val = tradeValue(x.p) * rnd(0.9, 1.05);
  const mine = L.picks.map((pk, i) => ({ pk, i })).filter(y => y.pk.own === ME).sort((a, b) => pickPts(a.pk) - pickPts(b.pk));
  const give = []; let sum = 0; for (const y of mine.slice().reverse()) { if (sum >= val) break; if (sum + pickPts(y.pk) <= val * 1.2) { give.push(y.i); sum += pickPts(y.pk); } }
  if (!give.length || sum < val * 0.85) return;
  L.tradeOffers.push({ id: 'tb' + wk + '_' + x.p.id, s: state.season, tid: x.id, exp: wk + 1, buy: true, get: { pl: [], pk: give }, give: { pl: [x.p.id], pk: [] } });
  addNews(`Deadline call: the ${teamName(x.id)} will move ${x.p.pos} ${x.p.n} (${x.p.ovr}) for picks. See the Trades tab.`);
}
function acceptOffer2(id) { const L = PS(); const o = (L.tradeOffers || []).find(x => x.id === id); if (!o) return { ok: false, why: 'That offer is gone.' };
  // a deadline deal on a full roster: the least valuable backup makes room
  let cutTxt = ''; const maxR = state.phase === 'offseason' ? PRO_OFF_MAX : proMax(); if (o.buy && state.roster.length + o.give.pl.length - o.get.pl.length > maxR) { const starters0 = new Set(POS_ORDER.flatMap(pos => (state.depth[pos] || []).slice(0, START[pos]))); const c = state.roster.filter(p => !starters0.has(p.id)).sort((a, b) => (a.ovr - deadIfCut(a)) - (b.ovr - deadIfCut(b)))[0]; if (c && capRoom(ME) + cutSaves(c) >= 0) { cutPlayer(c.id); cutTxt = `Released ${c.pos} ${c.n} to make room. `; } } const r = tradeExec(o.tid, o.get, o.give, true); L.tradeOffers = (L.tradeOffers || []).filter(x => x.id !== id); if (cutTxt) r.why = cutTxt; return r; }

/* ---------- compensatory picks ---------- */
// After free agency, a club that lost more of its own free agents than it signed gets extra picks (rounds 3-7, up to four)
// in next year's draft, by the size of the contracts it lost.
function proCompPicks() {
  const L = PS(); const yr = state.season + 2; const log = (L.cfa || []).filter(x => x.s === state.season); if (!log.length || L.compDone === state.season) return [];
  L.compDone = state.season; const got = [];
  NFL.forEach(t => {
    const lost = log.filter(x => x.from === t.id && x.apy >= 1.5).sort((a, b) => b.apy - a.apy); const gained = log.filter(x => x.to === t.id).length;
    lost.slice(gained, gained + 4).forEach(x => { const rd = x.apy >= 18 ? 3 : x.apy >= 10 ? 4 : x.apy >= 5 ? 5 : x.apy >= 2.5 ? 6 : 7; L.picks.push({ yr, rd, orig: t.id, own: t.id, c: true, cv: x.apy }); if (t.id === ME) got.push(`round ${rd} (for ${x.n})`); });
  });
  if (got.length) addNews(`Compensatory picks: the ${myName()} get ${got.join(', ')} in the ${yr} draft.`, 'win');
  return got;
}
/* ---------- fifth-year options ---------- */
// A first-round rookie entering the last year of his deal can be kept a fifth year at a set salary.
const optionDue = p => !!(p && p.k && p.k.rk && p.k.pick && p.k.pick <= NFL.length && p.k.yrs === 1 && !p.k.opt);
const optionSalary = p => r2(Math.max(capHit(p) * 1.5, (PRO_TOP[p.pos] || 10) * (p.ovr >= 80 ? 0.55 : 0.4)));
function exerciseOption(pid, yes, tid) {
  const p = tid && tid !== ME ? proRoster(tid).find(x => x.id === pid) : P(pid); if (!optionDue(p)) return false; kFix(p.k);
  if (!yes) { p.k.opt = 'no'; if (!tid || tid === ME) txLog(`Declined the fifth-year option on ${p.n}.`); return true; }
  const sal = optionSalary(p); p.k.sal.push(sal); p.k.pr.push(0); p.k.yrs++; p.k.tot++; p.k.opt = 'yes'; kFix(p.k);
  if (!tid || tid === ME) { txLog(`Picked up ${p.n}'s fifth-year option (${fmM(sal)} in ${capYear() + 1}).`); rapAdj(p, 3, 'Fifth-year option picked up'); }
  return true;
}
function proAiOptions() { NFL.forEach(t => { if (t.id === ME) return; proRoster(t.id).filter(optionDue).forEach(p => exerciseOption(p.id, p.ovr >= 74, t.id)); }); }
/* ---------- mock drafts and workouts ---------- */
// What the experts expect in round one: the current draft order (worst record first) and each club's needs,
// using what everyone can see (the consensus board), not the true ratings.
function mockDraft() {
  const L = PS(); if (!L.dc || !L.dc.list) return []; const order = L.order && L.order.length === NFL.length && state.phase === 'offseason' ? L.order : proStandingOrder();
  const key = state.season + ':' + state.week + ':' + state.phase + ':' + order.join(''); if (L.mock && L.mock.key === key) return L.mock.rows;
  const left = L.dc.list.filter(p => !p.taken).slice().sort((a, b) => a.cr - b.cr).slice(0, 80); const rows = [];
  order.forEach((tid, i) => { let best = null, bv = -1e9; left.forEach(p => { const v = -p.cr * 0.9 + posNeed(tid, p.pos) * 9 + (p.pos === 'QB' && worstStarter(tid, 'QB') < 74 ? 6 : 0) - (['K', 'P', 'LS'].includes(p.pos) ? 30 : 0); if (v > bv) { bv = v; best = p; } }); if (!best) return; left.splice(left.indexOf(best), 1); rows.push({ no: i + 1, tid, pid: best.id, n: best.n, pos: best.pos, col: best.col, cr: best.cr }); });
  L.mock = { key, rows, wk: state.phase === 'offseason' ? 'offseason' : state.week }; return rows;
}
// up to five private workouts a year before the draft: each gives a full read on a prospect
const WORKOUTS = 5;
const workoutsLeft = () => { const L = PS(); return L.wo && L.wo.s === state.season ? Math.max(0, WORKOUTS - L.wo.n) : WORKOUTS; };
function workout(id) {
  const L = PS(); const p = L.dc && L.dc.list.find(x => x.id === id); if (!p || p.taken || p.wo || !isGM() || workoutsLeft() < 1 || (L.draft && L.draft.done)) return false;
  if (!L.wo || L.wo.s !== state.season) L.wo = { s: state.season, n: 0 }; L.wo.n++; p.sc = 3; p.wo = true;
  const hi = p.pot >= p.ovr + 8; p.woNote = p.ovr >= 78 ? 'Ready to start right away.' : hi ? 'Raw, but the upside showed.' : 'About what the tape said.'; return true;
}
/* ---------- the Ring of Honor ---------- */
function ringConsider(p) { if (!p || !((p.yw >= 4 && p.ovr >= 74) || p.yw >= 7)) return; const L = PS(); (L.ring || (L.ring = [])).push({ n: p.n, pos: p.pos, yrs: p.yw, s: state.season }); addNews(`${p.n} (${p.pos}) goes into the ${myName()} Ring of Honor after ${p.yw} seasons with the club.`, 'big'); }

/* ---------- the draft ---------- */
// The ledger (pro.picks) is the one owner record; open draft slots follow it (B04).
function syncDraftSlots() { const L = PS(); const D = L && L.draft; if (!D || D.done) return; D.slots.forEach(s => { if (s.pid) return; const pk = L.picks.find(x => x.yr === D.yr && x.rd === s.rd && x.orig === s.orig && !x.c === !s.c); if (pk) s.own = pk.own; }); }
function proDraftStart() {
  const L = PS(); const yr = state.season + 1; const slots = [];
  for (let rd = 1; rd <= PRO_ROUNDS; rd++) {
    L.order.forEach((orig, i) => { const pk = L.picks.find(x => x.yr === yr && x.rd === rd && x.orig === orig && !x.c); if (pk && pk.forf) return; /* a pick the commissioner took away */ slots.push({ no: 0, rd, orig, own: pk ? pk.own : orig, pid: null }); });
    // compensatory picks come at the end of their round, biggest loss first
    L.picks.filter(x => x.yr === yr && x.rd === rd && x.c).sort((a, b) => (b.cv || 0) - (a.cv || 0)).forEach(pk => slots.push({ no: 0, rd, orig: pk.orig, own: pk.own, pid: null, c: true }));
  }
  slots.forEach((s, i) => s.no = i + 1);
  L.draft = { yr, slots, cur: 0, done: false, mine: [] };
}
const draftAvail = () => PS().dc.list.filter(p => !p.taken);
function aiDraftScore(tid, p) { const need = posNeed(tid, p.pos); const qb = p.pos === 'QB' && worstStarter(tid, 'QB') < 74 ? 4 : 0; return p.ovr * 0.5 + p.pot * 0.5 + (PRO_POS_W[p.pos] - 1) * 6 + need * 3.5 + qb + clamp(playerFit(p, teamScheme(tid)) || 0, -6, 6) * 0.25 + (hash(tid + p.id) - 0.5) * 6 - p.cr * 0.02 - (['K', 'P', 'LS'].includes(p.pos) && p.cr > 120 ? 0 : ['K', 'P', 'LS'].includes(p.pos) ? 8 : 0); }
// your board: what your scouts see, your needs, and (as GM) the head coach's wish or (as coach) your requests
function myDraftScore(p) { const L = PS(); let v = myBoardVal(p) + posNeed(ME, p.pos) * 2.5 + (p.sc >= 1 ? clamp(playerFit(p) || 0, -6, 6) * 0.25 : 0) - (['K', 'P', 'LS'].includes(p.pos) && p.cr > 100 ? 0 : ['K', 'P', 'LS'].includes(p.pos) ? 8 : 0); if (isGM() && L.hcIn && L.hcIn.k === 'draft' && L.hcIn.pos === p.pos) v += 2; return v; }
function draftChoose(tid) {
  const av = draftAvail(); if (!av.length) return null;
  if (tid !== ME) return av.reduce((b, p) => (aiDraftScore(tid, p) > aiDraftScore(tid, b) ? p : b), av[0]);
  const best = av.reduce((b, p) => (myDraftScore(p) > myDraftScore(b) ? p : b), av[0]);
  if (aiGM()) { const w = gmWeight(); const want = PS().cin.draft.map(id => av.find(p => p.id === id)).filter(Boolean).sort((a, b) => myDraftScore(b) - myDraftScore(a))[0]; if (want && myDraftScore(want) >= myDraftScore(best) - 6 && R() < w) { cinNote(`The GM drafted ${want.n}, one of the players you asked for.`); return want; } }
  return best;
}
function draftMake(slot, p) {
  const L = PS(); p.taken = slot.own; slot.pid = p.id; slot.n = p.n; slot.pos = p.pos;
  const pl = mkPro({ n: p.n, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, exp: 0, col: p.col, dr: { yr: L.draft.yr, rd: slot.rd, no: slot.no } }); pl.k = rookieContract(slot.no);
  if (slot.own === ME) { addMine(pl); L.draft.mine.push(pl.id); txLog(`Drafted ${p.pos} ${p.n} (${p.col}) with pick ${slot.no}.`); addNews(`With pick No. ${slot.no}, the ${myName()} select ${p.pos} ${p.n} from ${p.col}.`, 'big'); }
  else { L.rost[slot.own].push(pl); if (slot.no <= 10) addNews(`Pick No. ${slot.no}: the ${teamName(slot.own)} take ${p.pos} ${p.n} from ${p.col}.`); }
  L.picks = L.picks.filter(x => !(x.yr === L.draft.yr && x.rd === slot.rd && x.orig === slot.orig && !x.c === !slot.c));
}
// runs picks until it is your turn (as GM) or the draft ends
function draftRun(stopAtMine) {
  const D = PS().draft; if (!D || D.done) return 'done'; syncDraftSlots();
  while (D.cur < D.slots.length) {
    const s = D.slots[D.cur];
    if (s.own === ME && stopAtMine && isGM()) return 'mine';
    const p = draftChoose(s.own); if (!p) { D.cur = D.slots.length; break; } draftMake(s, p); D.cur++;
  }
  D.done = true; draftAfter(); return 'done';
}
function draftPick(pid) { const D = PS().draft; if (!D || D.done) return false; syncDraftSlots(); const s = D.slots[D.cur]; if (!s || s.own !== ME) return false; const p = draftAvail().find(x => x.id === pid); if (!p) return false; draftMake(s, p); D.cur++; return true; }
// after the draft: computer-run clubs sign undrafted rookies; the best of the rest wait in free agency
function draftAfter() {
  const L = PS(); const left = draftAvail().sort((a, b) => (b.ovr + b.pot) - (a.ovr + a.pot));
  NFL.forEach(t => { if (t.id === ME) return; const room = Math.max(0, 68 - proRoster(t.id).length); for (let i = 0; i < Math.min(room, 1) && left.length; i++) { const p = left.shift(); p.taken = t.id; const pl = mkPro({ n: p.n, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, exp: 0, col: p.col }); pl.k = rookieContract(0); L.rost[t.id].push(pl); } });
  left.slice(0, 40).forEach(p => { p.taken = 'fa'; const pl = mkPro({ n: p.n, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, exp: 0, col: p.col, udfa: true }); pl.ask = { apy: PRO_MINSAL, yrs: 3 }; L.fa.push(pl); });
}
// Draft-day trades. Moving down: clubs behind you offer their pick plus more.
function draftDownOffers() {
  const L = PS(); const D = L.draft; if (!D || D.done) return []; const s = D.slots[D.cur]; if (!s || s.own !== ME) return [];
  const myV = pickValue(s.no); const out = []; const later = D.slots.slice(D.cur + 1, D.cur + 24).filter(x => x.own !== ME);
  const seen = new Set();
  for (const x of later) {
    if (seen.has(x.own) || out.length >= 3) continue; seen.add(x.own);
    const extra = L.picks.map((pk, i) => ({ pk, i })).filter(y => y.pk.own === x.own && !(y.pk.yr === D.yr && y.pk.rd === x.rd && y.pk.orig === x.orig && !y.pk.c === !x.c)).map(y => ({ i: y.i, v: pickPts(y.pk) })).filter(y => y.v + pickValue(x.no) >= myV * 1.0).sort((a, b) => a.v - b.v)[0];
    if (extra && extra.v + pickValue(x.no) <= myV * 1.35) out.push({ tid: x.own, slot: x.no, extra: extra.i, val: extra.v + pickValue(x.no) });
  }
  return out;
}
function draftTradeDown(tid) {
  const L = PS(); const D = L.draft; const o = draftDownOffers().find(x => x.tid === tid); if (!o) return false; const s = D.slots[D.cur]; const t = D.slots.find(x => x.no === o.slot);
  s.own = tid; t.own = ME; const ep = L.picks[o.extra]; ep.own = ME;
  L.picks.forEach(pk => { if (pk.yr === D.yr && pk.rd === s.rd && pk.orig === s.orig && !pk.c === !s.c) pk.own = tid; if (pk.yr === D.yr && pk.rd === t.rd && pk.orig === t.orig && !pk.c === !t.c) pk.own = ME; });
  const txt = `Draft-day trade: the ${myName()} move down from No. ${s.no} to No. ${t.no} with the ${teamName(tid)}, adding ${pickLabel(ep)}.`; txLog(txt); addNews(txt, 'big'); return true;
}
// Moving up: what it would cost to get a pick ahead of yours.
function draftUpCost(no) {
  const L = PS(); const D = L.draft; if (!D || D.done) return null; const t = D.slots.find(x => x.no === no); if (!t || t.own === ME || t.pid || D.slots.indexOf(t) < D.cur) return null;
  const need = pickValue(no) * 1.1; const mine = D.slots.filter(x => x.own === ME && !x.pid && x.no > no).map(x => ({ slot: x.no, v: pickValue(x.no) }));
  const fut = L.picks.map((pk, i) => ({ pk, i })).filter(y => y.pk.own === ME && y.pk.yr > D.yr).map(y => ({ fut: y.i, v: pickPts(y.pk) }));
  const pool = mine.concat(fut).sort((a, b) => b.v - a.v); const pkg = []; let sum = 0;
  if (!pool.length) return null; pkg.push(pool[0]); sum = pool[0].v;
  const rest = pool.slice(1).sort((a, b) => a.v - b.v);
  while (sum < need && rest.length) { const fit = rest.find(x => sum + x.v >= need) || rest[rest.length - 1]; pkg.push(fit); sum += fit.v; rest.splice(rest.indexOf(fit), 1); }
  return sum >= need ? { no, tid: t.own, pkg, sum: Math.round(sum), need: Math.round(need) } : null;
}
function draftTradeUp(no) {
  const L = PS(); const D = L.draft; const c = draftUpCost(no); if (!c) return false; const t = D.slots.find(x => x.no === no);
  const lab = [];
  c.pkg.forEach(x => { if (x.slot) { const s = D.slots.find(y => y.no === x.slot); s.own = c.tid; L.picks.forEach(pk => { if (pk.yr === D.yr && pk.rd === s.rd && pk.orig === s.orig && !pk.c === !s.c) pk.own = c.tid; }); lab.push('No. ' + x.slot); } else { L.picks[x.fut].own = c.tid; lab.push(pickLabel(L.picks[x.fut])); } });
  t.own = ME; L.picks.forEach(pk => { if (pk.yr === D.yr && pk.rd === t.rd && pk.orig === t.orig && !pk.c === !t.c) pk.own = ME; });
  const txt = `Draft-day trade: the ${myName()} move up to No. ${no} with the ${teamName(c.tid)}, sending ${lab.join(', ')}.`; txLog(txt); addNews(txt, 'big'); return true;
}

/* ---------- the head coach's input (you as GM) ---------- */
function proHcWish(kind) {
  const L = PS(); const hc = state.staff.HC; if (!hc) { L.hcIn = null; return; }
  const weak = needList(ME).filter(x => !['K', 'P', 'LS'].includes(x.pos))[0];
  if (kind === 'resign') { const p = state.roster.filter(x => !underContract(x)).sort((a, b) => b.ovr - a.ovr)[0]; L.hcIn = p && p.ovr >= 70 ? { k: 'keep', pid: p.id, n: p.n, pos: p.pos, txt: `Keep ${p.n}. He's one of our best ${POS_NAME[p.pos].toLowerCase()} players.` } : null; }
  else if (kind === 'fa') L.hcIn = weak ? { k: 'need', pos: weak.pos, base: worstStarter(ME, weak.pos), txt: `We need help at ${POS_NAME[weak.pos].toLowerCase()}. Get me a starter in free agency.` } : null;
  else if (kind === 'draft') L.hcIn = weak ? { k: 'draft', pos: weak.pos, txt: `Take ${aAn(weak.pos)} early in the draft if the board allows it.` } : null;
  else if (kind === 'deadline') L.hcIn = weak && state.week <= 9 ? { k: 'need', pos: weak.pos, base: worstStarter(ME, weak.pos), dl: true, txt: `Before the trade deadline, find us a better ${weak.pos}.` } : null;
  if (L.hcIn) L.hcIn.s = state.season;
}
// at the end of each step: did you give the head coach what he asked for?
function proHcJudge() {
  const L = PS(); const w = L.hcIn; const hc = state.staff.HC; if (!w || !hc || w.judged) return; w.judged = true; let ok = null;
  if (w.k === 'keep') ok = state.roster.some(p => p.id === w.pid && underContract(p));
  else if (w.k === 'need') ok = worstStarter(ME, w.pos) >= w.base + 2 || state.roster.some(p => p.pos === w.pos && underContract(p) && p.ovr >= w.base + 3 && (p.dr ? p.dr.yr === state.season + 1 : false));
  else if (w.k === 'draft') { const mine = (L.draft && L.draft.mine || []).map(P).filter(Boolean); ok = mine.some(p => p.pos === w.pos && p.dr && p.dr.rd <= 2); }
  if (ok == null) return;
  L.hcRel = clamp(L.hcRel + (ok ? 6 : -5), 0, 100); mv('morale', ok ? 2 : -2);
  addNews(ok ? `${hc.name} is pleased: you delivered on his request.` : `${hc.name} is frustrated that his request (${w.txt.toLowerCase().replace(/\.$/, '')}) went unanswered.`, ok ? '' : 'bad');
}
function proFireHC() {
  const L = PS(); const hc = state.staff.HC; if (!hc || hc.me) return false; const owed = r1(hc.salary * Math.max(1, hc.years || 1) * 0.6);
  addNews(`The ${myName()} fire head coach ${hc.name}. The club owes him ${fmM(owed)}.`, 'bad'); txLog(`Fired head coach ${hc.name}.`);
  if (state.phase !== 'offseason') { const oc = state.staff.OC; state.staff.HC = Object.assign(genCandidates('HC', 1)[0], { name: oc ? oc.name : genName(), interim: true, bg: 'Interim head coach' }); }
  else state.staff.HC = null;
  state.cands.HC = genProCandidates(5); L.hcRel = 55; if (L.gm) L.gm.sec = clamp(L.gm.sec - (owed > 20 ? 3 : 0), 0, 100); T(ME).coach = state.staff.HC ? state.staff.HC.name : ''; return true;
}
function proHireHC(cid) {
  const L = PS(); const c = (state.cands.HC || []).find(x => x.id === cid); if (!c) return false;
  if (state.staff.HC && !state.staff.HC.interim) return false;
  c.title = ROLE_TITLE.HC; c.years = c.years || 5; state.staff.HC = c; state.cands.HC = state.cands.HC.filter(x => x.id !== cid);
  ['OC', 'DC'].forEach(r => { if (R() < 0.6) { const n = genCandidates(r, 3)[0]; n.salary = r1(clamp(1.2 + (n.ovr - 70) * 0.12, 0.9, 5)); state.staff[r] = n; } });
  L.hcRel = 65; T(ME).coach = c.name; addNews(`The ${myName()} hire ${c.name} as head coach: ${c.years} years at ${fmM(c.salary)} a year.`, 'big'); txLog(`Hired head coach ${c.name}.`); return true;
}
function proAutoHireHC() { if (state.staff.HC && !state.staff.HC.interim) return; if (!(state.cands.HC || []).length) state.cands.HC = genProCandidates(5); const c = state.cands.HC.slice().sort((a, b) => coachOvr(b) - coachOvr(a))[0]; if (state.staff.HC && state.staff.HC.interim) state.staff.HC = null; proHireHC(c.id); }

/* ---------- your input (you as an NFL coach) ---------- */
// how much the GM listens: your role, plus how well you get along
function gmWeight() { if (isOwner()) return ownWeight(); if (!isCoach()) return 0; const r = state.co.role; const b = r === 'HC' ? 0.75 : ['OC', 'DC'].includes(r) ? 0.5 : r === 'ST' ? 0.35 : 0.3; const ag = PS().aigm || { rel: 55 }; return clamp(b + (ag.rel - 50) / 200, 0.1, 0.95); }
const CIN_MAX = () => (isOwner() ? 8 : state.co.role === 'HC' ? 6 : ['OC', 'DC'].includes(state.co.role) ? 4 : 2);
function cinCanAbout(pos) { if (!isCoach() || !state.co) return true; return state.co.role === 'HC' || rolePositions(state.co.role).includes(pos); }
function cinNote(txt) { const L = PS(); L.cinLog = L.cinLog || []; L.cinLog.unshift({ s: state.season, txt }); if (L.cinLog.length > 30) L.cinLog.length = 30; addNews(txt); }
function cinToggle(kind, pid, pos) {
  const L = PS(); const list = L.cin[kind]; if (!list) return 'bad'; const i = list.indexOf(pid);
  if (i >= 0) { list.splice(i, 1); return 'off'; }
  if (!cinCanAbout(pos)) return 'role'; if (list.length >= CIN_MAX()) return 'max'; list.push(pid); return 'on';
}
// what the computer GM bids for your club in free agency
function myGmFaBids() {
  const L = PS(); const out = {}; const w = gmWeight(); let room = capRoom(ME) - 4;
  L.cin.fa.forEach(id => { const p = faFind(id); if (p && room > p.ask.apy && R() < w) { out[id] = { apy: r2(p.ask.apy * 1.02), yrs: p.ask.yrs }; room -= p.ask.apy; } });
  needList(ME).slice(0, 3).forEach(n => { const p = L.fa.filter(x => x.pos === n.pos && !out[x.id] && x.ovr > worstStarter(ME, n.pos) + 1).sort((a, b) => b.ovr - a.ovr)[0]; if (p && room > p.ask.apy && R() < 0.6) { out[p.id] = { apy: p.ask.apy, yrs: p.ask.yrs }; room -= p.ask.apy; } });
  return out;
}
// the GM acts on your cut and trade requests (once each)
function myGmActOnInput() {
  const L = PS(); const w = gmWeight(); L.cinDone = L.cinDone || {};
  L.cin.cut.slice().forEach(id => { if (L.cinDone['cut' + id]) return; const p = P(id); if (!p) { L.cin.cut = L.cin.cut.filter(x => x !== id); return; } L.cinDone['cut' + id] = true; if (deadIfCut(p) <= 4 && R() < w) { cutPlayer(id); cinNote(`The GM released ${p.n}, as you asked.`); L.cin.cut = L.cin.cut.filter(x => x !== id); } else cinNote(`The GM is keeping ${p.n} for now${deadIfCut(p) > 4 ? ' (cutting him would leave too much dead money)' : ''}.`); });
  if (state.phase === 'offseason' || state.week <= 9) L.cin.trade.slice().forEach(id => {
    if (L.cinDone['tr' + id]) return; const p = P(id); if (!p) { L.cin.trade = L.cin.trade.filter(x => x !== id); return; } L.cinDone['tr' + id] = true;
    if (R() > w) { cinNote(`The GM decided not to shop ${p.n}.`); return; }
    const teams = NFL.map(t => t.id).filter(t => t !== ME && capRoom(t) >= capHit(p)).sort((a, b) => posNeed(b, p.pos) - posNeed(a, p.pos)); const tid = teams[0];
    const v = tradeValue(p); const their = tid ? L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === tid && pickPts(x.pk) <= v * 1.1).sort((a, b) => pickPts(b.pk) - pickPts(a.pk))[0] : null;
    if (their && pickPts(their.pk) >= v * 0.55) { const r = tradeExec(tid, { pl: [id], pk: [] }, { pl: [], pk: [their.i] }, true); if (r.ok) { cinNote(`The GM traded ${p.n} to the ${teamName(tid)}, as you suggested.`); L.cin.trade = L.cin.trade.filter(x => x !== id); } }
    else cinNote(`The GM shopped ${p.n} but found no deal worth taking.`);
  });
}

/* ---------- offseason steps ---------- */
const proStepLabels = () => (isCoach() ? PRO_COACH_STEPS : isOwner() ? OWN_STEPS : PRO_STEPS);
function proStepEnter(step) {
  const L = PS();
  if (step === 2) { state.roster.filter(p => !underContract(p)).forEach(p => askFor(p, false)); }
  if (step === 3) { if (isGM()) proHcWish('fa'); L.faWave = 0; L.faOffers = {}; L.fa.forEach(p => { if (!p.ask) p.ask = { apy: r2(pValue(p)), yrs: wantYears(p.age) }; }); }
  if (step === 4) { if (isGM()) proHcWish('draft'); proDraftStart(); }
  if (step === 5) proCamp();
}
// development, then the roster gets trimmed toward 53
function proCamp() {
  const L = PS(); const log = [];
  state.roster.forEach(p => { const d = proDevelop(p, true); log.push({ id: p.id, d }); });
  NFL.forEach(t => { if (t.id !== ME) proRoster(t.id).forEach(p => proDevelop(p, false)); });
  L.campLog = log.filter(x => Math.abs(x.d) >= 2).sort((a, b) => b.d - a.d).slice(0, 12);
  if (isCoach()) { const mine = rolePositions(state.co.role); const g = log.filter(x => { const p = P(x.id); return p && mine.includes(p.pos); }); const rest = log.filter(x => { const p = P(x.id); return p && !mine.includes(p.pos); }); const avg = l => (l.length ? l.reduce((s, x) => s + x.d, 0) / l.length : 0); state.co.devGain = r1(avg(g)); state.co.lastDev = r1(avg(g) - (mine.length < POS_ORDER.length ? avg(rest) : 0)); } // measured against the rest of the roster, as in college
  POS_ORDER.forEach(autoDepth); proRate(ME);
}
function proOffBlockers() {
  const L = PS(), o = L.off, b = []; if (!o || state.phase !== 'offseason') return b;
  if (state.pendingArrive) return [{ txt: 'Your move to a new job still has to finish.', act: 'catchretry' }];
  if (state.gameOver) return [{ txt: 'You need a new job.', act: 'jobsopen' }];
  if (isCoach()) { if (o.step === 1 && typeof marketBlocked === 'function' && marketBlocked()) b.push({ txt: marketBlocked(), tab: 'off' }); return b; }
  if (o.step === 1 && (!state.staff.HC || state.staff.HC.interim) && !autoOn('staff')) b.push({ txt: 'Hire a head coach.', tab: 'off' });
  const D = L.draft; if (o.step === 4 && D && !D.done && !autoOn('draft') && D.slots.slice(D.cur).some(s => s.own === ME)) b.push({ txt: D.slots[D.cur] && D.slots[D.cur].own === ME ? "You're on the clock in the draft." : 'The draft stops each time you are on the clock.', tab: 'draft' });
  if (o.step === 5 && !autoOn('cuts')) {
    if (state.roster.length > proMax()) b.push({ txt: `Cut down to ${proMax()} players (you have ${state.roster.length}).`, tab: 'roster' });
    if (capRoom(ME) < 0) b.push({ txt: `Get under the cap: you are ${fmM(-capRoom(ME))} over.`, tab: 'cap' });
  }
  return b;
}
function proOffNext() {
  if (!isPro()) return false;
  const L = PS(); const o = L.off; if (!o || state.phase !== 'offseason') return false;
  proRunOffAuto(); if (!isPro()) return true; // a job change can move you to college (B02)
  if (o.step === 0) { if (state.gameOver) return false; o.step = 1; }
  else if (o.step === 1) {
    if (isCoach()) { if (!finishMarket()) return false; if (!isPro()) return true; proCoachNewBoss(); }
    else if (isOwner()) { if (OWN().out || OWN().done) return false; ownEnsureStaff(); }
    else { if (!state.staff.HC || state.staff.HC.interim) { if (autoOn('staff')) proAutoHireHC(); else return false; } }
    proAiHires(); o.step = 2; proStepEnter(2);
  } else if (o.step === 2) {
    if (isCoach()) myGmResign(); else if (ownHands()) ownGmResign(); else { proHcJudge(); state.roster.filter(p => !underContract(p)).forEach(p => letWalk(p.id)); }
    state.roster.filter(optionDue).forEach(p => exerciseOption(p.id, p.ovr >= 74)); proAiOptions(); // options nobody decided on: the club's usual call
    proAiResign(); o.step = 3; proStepEnter(3);
  } else if (o.step === 3) {
    if (typeof nflOdd === 'function' && nflOdd()) return false; // the draft waits for an even league, while clubs can still be added or folded (FE-09)
    while (L.faWave < 3) proFaWave(); proCompPicks(); if (isGM()) proHcJudge(); if (aiGM()) myGmActOnInput(); if (isOwner()) ownMeetResolve(); o.step = 4; proStepEnter(4);
  } else if (o.step === 4) {
    if (!L.draft || !L.draft.done) { if (isGM() && !autoOn('draft') && L.draft && draftRun(true) === 'mine') return false; draftRun(false); }
    if (isGM()) proHcJudge(); o.step = 5; proStepEnter(5); if (isGM() && typeof nflxPreseason === 'function') nflxPreseason();
  } else if (o.step === 5) {
    if (typeof nflOdd === 'function' && nflOdd()) return false; // an odd-sized league can't start a season (FE-09)
    if (aiGM()) myGmActOnInput();
    fillRosterPro(ME);
    const auto = autoOn('cuts') || aiGM() || PRO_AUTO;
    if (state.roster.length > proMax()) { if (auto) trimRoster(ME, proMax()); else return false; }
    if (capRoom(ME) < 0) { if (auto) capFix(ME); else return false; }
    const before = {}; NFL.forEach(t => { if (t.id !== ME) before[t.id] = proRoster(t.id).slice(); });
    NFL.forEach(t => { if (t.id !== ME) { fillRosterPro(t.id); trimRoster(t.id, proMax()); capFix(t.id); fillRosterPro(t.id); } });
    if (typeof nflxCutdown === 'function') nflxCutdown(before);
    proNewSeason(); return true;
  }
  proRunOffAuto(); return true;
}
// whatever is automatic at the current step
function proRunOffAuto() {
  if (!isPro()) return;
  const L = PS(); const o = L.off; if (!o || state.phase !== 'offseason') return; const A = autoSet();
  if (A.scout || aiGM()) autoScout();
  if (ownHands()) return;
  if (isCoach()) { if (o.step === 1 && A.market && state.co.market && !state.co.market.done) autoMarket(); return; }
  if (o.step === 1 && A.staff && (!state.staff.HC || state.staff.HC.interim)) proAutoHireHC();
  if (o.step === 2 && A.resign && !o.autoRs) { o.autoRs = true; autoResign(); }
  if (o.step === 3 && A.fa && !o.autoFa) { o.autoFa = true; autoFaOffers(); }
  if (o.step === 5 && A.cuts && state.roster.length > proMax()) trimRoster(ME, proMax());
}
// re-sign the players worth keeping, at their price, and let the rest go
function autoResign() {
  state.roster.filter(p => !underContract(p)).sort((a, b) => b.ovr - a.ovr).forEach(p => {
    const a = askFor(p, false); const keep = p.age <= 30 && p.ovr >= worstStarter(ME, p.pos) - 2;
    if (keep && capRoom(ME) > a.apy + 2) { signOwn(p, a.apy, a.yrs, false); }
  });
}
function autoFaOffers() {
  const L = PS(); let room = capRoom(ME) - 3;
  needList(ME).slice(0, 7).forEach(n => { const p = L.fa.filter(x => x.pos === n.pos && !L.faOffers[x.id] && x.ovr > worstStarter(ME, n.pos) + 1 && x.age <= 31).sort((a, b) => b.ovr - a.ovr)[0]; if (p && room > p.ask.apy * 1.05 + 8) { L.faOffers[p.id] = { apy: r2(p.ask.apy * 1.05), yrs: p.ask.yrs }; room -= p.ask.apy * 1.05; } });
}
// The whole offseason on autopilot (Auto sim, and Coach mode).
let PRO_AUTO = false;
function proAutoOffseason() {
  PRO_AUTO = true; try { proAutoOffseason2(); } finally { PRO_AUTO = false; }
}
function proAutoOffseason2() {
  let guard = 0;
  while (isPro() && state.phase === 'offseason' && !state.gameOver && guard++ < 20) {
    const L = PS(); const o = L.off;
    if (o.step === 1) { if (isCoach()) { autoMarket(); if (!isPro() || state.pendingArrive) break; } else if (isOwner()) { if (OWN().out || OWN().done) break; ownEnsureStaff(); } else if (!state.staff.HC || state.staff.HC.interim) proAutoHireHC(); }
    if (o.step === 2 && isGM()) autoResign();
    if (o.step === 3 && isGM()) autoFaOffers();
    if (o.step === 4 && L.draft && !L.draft.done) draftRun(false);
    if (o.step === 5) { fillRosterPro(ME); if (state.roster.length > proMax()) trimRoster(ME, proMax()); if (capRoom(ME) < 0) capFix(ME); }
    if (!proOffNext()) break;
  }
  // a move back to college finishes here, so callers continue in the right world
  if (state.pendingArrive && !isPro()) goCollegeNow();
}
function proNewSeason() {
  const L = PS();
  Object.values(state.teams).forEach(t => { t.hist.push({ s: state.season, w: t.w, l: t.l }); Object.assign(t, { w: 0, l: 0, pf: 0, pa: 0, dw: 0, dl: 0, cw: 0, cl: 0 }); t.elo = 1500 + (t.elo - 1500) * 0.6; });
  state.roster.forEach(p => Object.keys(BOOK_KEYS).forEach(k => bookSet('season', k, (p.st || {})[k], p.n))); teamRecSeason();
  state.roster.forEach(p => { Object.entries(p.st || {}).forEach(([k, v]) => p.cs[k] = (p.cs[k] || 0) + v); (p.hist = p.hist || []).push({ s: state.season, ovr: p.ovr, gp: p.gp, st: p.st }); if (p.hist.length > 12) p.hist.shift(); p.st = {}; p.gp = 0; if (p.injSE) { p.inj = 0; p.injSE = false; } p.exp = (p.exp || 0) + (p.dr && p.dr.yr === state.season + 1 ? 0 : 1); });
  careerRecCheck();
  NFL.forEach(t => { if (t.id !== ME) proRoster(t.id).forEach(p => { p.inj = 0; p.exp = (p.exp || 0) + 1; }); });
  state.season++; state.week = 1; state.phase = 'regular'; L.lg = { gid: 0, seeds: null, champ: null, runner: null }; state.games = proSchedule(state.season); L.off = null; L.draft = null; L.tradeOffers = []; L.cinDone = {};
  state.meters.morale = clamp(Math.round((state.meters.morale + 66) / 2), 0, 100);
  proRateAll(); NFL.forEach(t => proStars(t.id)); L.expW = proExpWins(); L.scout = Math.min(60, (L.scout || 0) + 20);
  if (!L.dc || L.dc.yr !== state.season + 1) L.dc = genDraftClass(state.season + 1);
  if (isCoach()) coachSeasonStart();
  if (isOwner()) ownSeasonStart();
  addNews(`The ${state.season} season begins. The ${myName()} are expected to win about ${L.expW} games.${isGM() ? ` Cap space: ${fmM(capRoom(ME))}.` : ''}`, 'big');
}

/* ---------- an executive's career: AD and GM jobs ---------- */
function execState() { if (!state.exec) state.exec = { rep: 50 }; return state.exec; }
function jobsLog() { if (!state.jobs) state.jobs = []; return state.jobs; }
function execRepAdd(d) { const e = execState(); e.rep = clamp(Math.round(e.rep + (d > 0 ? d * (1 - e.rep / 130) : d)), 0, 100); }
const colTeams = () => (isPro() ? (state.colW ? state.colW.teams : {}) : state.teams);
const colTeamName = tid => { const t = colTeams()[tid]; return t ? t.name : (CTEAMS0_AD[tid] ? CTEAMS0_AD[tid].name : tid); };
const jobName = j => (j.lvl === 'nfl' ? nflName(j.tid) : colTeamName(j.tid));
function colPrestige(tid) { const t = colTeams()[tid]; if (!t) return 50; const c = CONFS[t.conf]; return t.rating + (c && c.p4 || tid === 'ND' ? 6 : -4); }
function nflPrestige(tid) { const t = isPro() && T(tid) ? T(tid) : null; const p = t ? t.rating : (NFL_BY[tid] ? NFL_BY[tid].p : 75); return Math.round(92 + (p - 76) * 0.3); }
// Open AD and GM jobs. fired: every opening is listed; otherwise only the ones calling you.
function execJobs(fired) {
  const e = execState(); const r = lrng(state.seed + ':exec:' + state.season + ':' + (fired ? 'f' : 'o')); const out = [];
  const myCol = isPro() ? null : ME; const myNfl = isPro() ? ME : null;
  const cols = Object.keys(colTeams()).filter(id => id !== myCol); for (let i = 0; i < 9; i++) { const tid = cols[Math.floor(r() * cols.length)]; if (!out.some(j => j.tid === tid && j.lvl === 'col')) out.push({ lvl: 'col', tid, role: 'AD' }); }
  let gms = isPro() ? NFL.map(t => t.id).filter(id => id !== myNfl && PS().aistaff[id] && PS().aistaff[id].gmOpen) : [];
  if (gms.length < 3) NFL.map(t => t.id).filter(id => id !== myNfl && !gms.includes(id)).sort(() => r() - 0.5).slice(0, 3 - gms.length + Math.floor(r() * 2)).forEach(id => gms.push(id));
  gms.forEach(tid => out.push({ lvl: 'nfl', tid, role: 'GM' }));
  out.forEach(j => { const P0 = j.lvl === 'nfl' ? nflPrestige(j.tid) - 26 : colPrestige(j.tid) * 0.75; j.int = clamp(Math.round(50 + (e.rep - P0) * 2.4), 3, 98); j.id = j.lvl + ':' + j.tid; });
  // out of work: the best two openings at each level will take you, so there is always a real choice
  if (fired) { ['col', 'nfl'].forEach(lv => out.filter(j => j.lvl === lv).sort((a, b) => b.int - a.int).slice(0, 2).forEach(j => j.int = Math.max(j.int, 45))); return out.sort((a, b) => b.int - a.int); }
  // calls come from jobs that are a step up: bigger programs, or the other level
  const calls = out.filter(j => j.int >= 70 && (j.lvl === 'nfl' ? (isPro() ? nflPrestige(j.tid) > nflPrestige(ME) + 2 : true) : colPrestige(j.tid) >= 52 + e.rep * 0.35)).sort((a, b) => b.int - a.int);
  return ['col', 'nfl'].flatMap(lv => calls.filter(j => j.lvl === lv).slice(0, 2)).sort((a, b) => b.int - a.int).slice(0, 4);
}
// What it takes to move: college AD jobs from the NFL need the college world caught up first.
function execTake(id) {
  const src = state.gameOver ? state.gameOver.jobs : (isPro() ? PS().offers : (state.exec && state.exec.offers)) || []; const j = src.find(x => x.id === id);
  if (!j || (state.gameOver && j.int < 40)) return null;
  const atReview = isPro() ? !!(PS().off && PS().off.step === 0) : !!(state.phase === 'offseason' && state.off && state.off.step === 0);
  if (!state.gameOver && !atReview) return null; // offers are answered during the season review
  const was = isPro() ? 'nfl' : 'col'; const from = isPro() ? nflName(ME) : myName();
  if (j.lvl === 'nfl') {
    if (was === 'nfl') { releaseClub(); takeClub(j.tid); const L = PS(); L.gm = { sec: 62, yrs: 4, sal: r1(3 + T(j.tid).rating / 40), hired: state.season + 1 }; L.hcRel = 60; L.offers = []; L.off.review.fresh = true; proHcWish('resign'); state.gameOver = null; applyThemeSafe(); }
    else goPro(j.tid, { role: 'gm' });
    addNews(`The ${nflName(j.tid)} hire you as general manager, leaving ${from}.`, 'big'); return 'done';
  }
  if (was === 'col') { switchProgram(j.tid); state.meters.board = 62; state.gameOver = null; if (state.exec) state.exec.offers = []; if (state.off && state.off.step === 0) state.off.step = 1; addNews(`${colTeamName(j.tid)} hires you as athletic director.`, 'big'); return 'done'; }
  state.pendingArrive = { tid: j.tid, role: 'ad', target: state.season + 1 }; goCollegeBegin(); return 'catchup';
}
// From the NFL back to college: the college world comes back, plays the seasons it missed (collegeSimSeason), then you arrive.
function goCollegeBegin() {
  const keepNews = state.news; if (state.pendingArrive) state.pendingArrive.keepNews = keepNews.slice(0, 60); restoreWorld(state.colW); delete state.colW; delete state.pro; state.lvl = 'col'; state.news = keepNews; ME = state.my; rebuildPMap(); rebuildConfs(); state.gameOver = null;
}
const collegeNeedsSeasons = () => (state.pendingArrive ? Math.max(0, state.pendingArrive.target - state.season) : 0);
function collegeArrive() {
  const a = state.pendingArrive; if (!a) return; if (a.keepNews) state.news = a.keepNews;
  if (a.tid !== ME) switchProgram(a.tid);
  setGoals(); state.meters.board = 62; state.gameOver = null; state.event = null;
  if (a.role === 'coach') { const co = state.co; co.role = a.crole; co.contract = Object.assign({}, a.k, { left: a.k.yrs }); co.sec = 62; co.hired = state.season; co.fired = null; co.newBoss = null; co.market = null; if (!co.schools.includes(a.tid)) co.schools.push(a.tid); syncMe(); coachSeasonStart(); addNews(`${co.name} is the new ${roleTitle(co.role).toLowerCase()} at ${myName()}: ${a.k.yrs} years at ${fmM(a.k.sal)} a year.`, 'big'); }
  else addNews(`You are the new athletic director at ${myName()}. The ${state.season} season starts now.`, 'big');
  delete state.pendingArrive; // only a finished arrival clears the move (S02)
  applyThemeSafe();
}
// the whole trip in one go (tests and the autopilot)
function goCollegeNow() { while (collegeNeedsSeasons() > 0) collegeSimSeason(); collegeArrive(); }

/* ---------- an NFL coach's season review ---------- */
function proUnitRanks() { const ts = Object.values(state.teams); const off = ts.slice().sort((a, b) => b.pf - a.pf).findIndex(t => t.id === ME) + 1; const def = ts.slice().sort((a, b) => a.pa - b.pa).findIndex(t => t.id === ME) + 1; return { off, def }; }
function proExpUnitRank(side) { const co = state.co; const mine = (side === 'off' ? co.preOff : co.preDef) || 0; return Object.values(state.teams).filter(t => t.id !== ME && (side === 'off' ? t.off : t.def) > mine).length + 1; }
function proCoachSeasonEnd() {
  const co = state.co; const L = PS(); const rv = L.off.review; const ur = proUnitRanks(); const role = co.role; const first = co.hired === state.season;
  const eOff = proExpUnitRank('off'), eDef = proExpUnitRank('def'); const poB = [0, 4, 7, 10, 13, 20][rv.po];
  let d;
  if (role === 'HC') d = (rv.w - rv.exp) * 3 + poB;
  else if (role === 'OC' || OFF_POS.includes(role)) d = (eOff - ur.off) / (role === 'OC' ? 2.5 : 4) + (rv.w - rv.exp) * (role === 'OC' ? 1.2 : 0.7) + poB / (role === 'OC' ? 3 : 5);
  else if (role === 'DC' || DEF_POS.includes(role)) d = (eDef - ur.def) / (role === 'DC' ? 2.5 : 4) + (rv.w - rv.exp) * (role === 'DC' ? 1.2 : 0.7) + poB / (role === 'DC' ? 3 : 5);
  else d = (rv.w - rv.exp) * 1.5 + poB / 3;
  if (ROLE_TIER[role] === 1 && role !== 'ST') d += (co.lastDev || 0) * 3.5;
  d += (bossRel().rap - 55) * 0.12; // how you get along with your boss (relationships) // a position coach is judged mostly on how his players develop
  d = clamp(d, -30, 30); if (d < 0) d *= diff().neg; if (d < 0 && first) d *= 0.6;
  const secBefore = co.sec; co.sec = clamp(Math.round(60 + (co.sec - 60) * 0.8 + d), 0, 100);
  const repD = clamp((rv.w - rv.exp) * 0.8 + (rv.po >= 5 ? 12 : rv.po >= 3 ? 5 : rv.po >= 1 ? 2 : 0) + (ROLE_TIER[role] === 2 && (role === 'OC' ? ur.off : ur.def) <= 5 ? 3 : 0) + d / 5 + (ROLE_TIER[role] < 3 && co.age < 50 ? 2 : 0) + 1, -8, 18);
  co.rep = clamp(Math.round(co.rep + (repD > 0 ? repD * (1 - co.rep / 125) : repD) + 0.5), 0, 100);
  const grow = co.age < 62 ? 1 : -1; const ks = role === 'HC' ? ['gm', 'off', 'def', 'dev'] : roleSide(role) === 'off' ? ['off', 'gm', 'dev'] : roleSide(role) === 'def' ? ['def', 'gm', 'dev'] : ['gm', 'dev'];
  ks.forEach((x, i) => { co.sk[x] = clamp(co.sk[x] + (i < 2 ? grow : R() < 0.5 ? grow : 0) + (d > 8 && i === 0 ? 1 : 0), 45, 97); });
  const k2 = co.contract; const ip = incPay(k2); let bonus = 0; const why = []; const divW = rv.seed >= 1 && rv.seed <= 4;
  if (k2.inc.wins && rv.w >= k2.inc.wins) { bonus += ip.wins; why.push(`${k2.inc.wins}+ wins`); }
  if (k2.inc.conf && divW) { bonus += ip.conf; why.push('division title'); }
  if (k2.inc.cfp && rv.po >= 1) { bonus += ip.cfp; why.push('playoffs'); }
  if (k2.inc.title && rv.po === 5) { bonus += ip.title; why.push('Super Bowl'); }
  co.earn = r2(co.earn + k2.sal + bonus); if (bonus) addNews(`Incentives paid to ${co.name}: ${fmM(bonus)} (${why.join(', ')}).`, 'win');
  k2.left = Math.max(0, k2.left - 1); co.age++;
  co.w += rv.w; co.l += rv.l; if (rv.po === 5) co.titles++; if (divW) co.confT++; if (rv.po >= 1) co.cfp++;
  co.hist.push({ lvl: 'nfl', s: state.season, tm: ME, role, w: rv.w, l: rv.l, rank: rv.seed || 0, post: rv.po ? PO_LABEL[rv.po] : '', off: ur.off, def: ur.def, sec: co.sec, bonus });
  co.review = { secBefore, sec: co.sec, d: Math.round(d), repD: Math.round(repD), ur, eOff, eDef, bonus, why, nfl: true };
  co.fired = null; const fireAt = coFireAt();
  if (!state.settings.noFire) {
    if (role === 'HC' && co.sec <= fireAt + 6 && !first) co.fired = { why: `Ownership fired you after ${aAn(rv.w + '-' + rv.l)} season. The club owes you ${fmM(k2.sal * k2.left * k2.buy / 100)} on your buyout.`, pay: r2(k2.sal * k2.left * k2.buy / 100) };
    else if (role !== 'HC' && co.sec <= fireAt + 10 && !first) co.fired = { why: `The head coach let you go after the season. You're owed ${fmM(k2.sal * k2.left * k2.buy / 100)}.`, pay: r2(k2.sal * k2.left * k2.buy / 100) };
  }
  co.newBoss = null;
  if (!co.fired && role !== 'HC') { const hc = state.staff.HC; if (hc && !hc.me && ((rv.w <= 5 && R() < 0.65) || (rv.w <= 7 && R() < 0.2))) { co.newBoss = { old: hc.name, open: true }; addNews(`The ${myName()} fire head coach ${hc.name}.`, 'bad'); if (R() > 0.45 + (co.sec - 50) / 100) co.fired = { why: `The new head coach is bringing his own staff, so you're out.`, pay: r2(k2.sal * k2.left * k2.buy / 100) }; } }
  if (co.fired) { co.earn = r2(co.earn + co.fired.pay); addNews(`${co.name} is out with the ${myName()}. ${co.fired.why}`, 'bad'); }
  else if (k2.left <= 0) addNews(`${co.name}'s contract with the ${myName()} is up.`);
  co.market = buildMarket();
}
function proCoachNewBoss() { const co = state.co; if (!co.newBoss || co.role === 'HC') return; const c = genProCandidates(3)[0]; state.staff.HC = c; T(ME).coach = c.name; addNews(`The ${myName()} hire ${c.name} as head coach.`); co.newBoss = null; }
// An AD's season adds to (or takes from) the name you have in the business; good ones get calls.
function execSeasonEnd(regW, boardBefore, w, l) {
  if (AUTOPILOT) return;
  const m = state.meters; execRepAdd((m.board - boardBefore) / 3 + (regW - state.expWins) * 0.6 + (state.champ === ME ? 8 : 0));
  jobsLog().push({ s: state.season, lvl: 'col', tid: ME, role: 'AD', w, l });
  if (state.gameOver) state.gameOver.jobs = execJobs(true); else execState().offers = execJobs(false);
}

/* ---------- saves ---------- */
function proSlotSummary() { const L = PS(); const t = T(ME); if (isComm()) return commSlotSummary(); if (isOwner()) return ownSlotSummary(); return { lvl: 'nfl', coach: isCoach() ? { name: state.co.name, role: state.co.role } : null, gm: !isCoach(), name: teamName(ME), season: state.season, phase: state.phase, rec: t.w + '-' + t.l, legacy: execState().rep, diff: state.settings.diff, custom: false, seasons: L.hist.length, fired: !!state.gameOver, saved: Date.now() }; }
function checkProShape(s) {
  if (!s.teams || Object.keys(s.teams).length !== (typeof nflCountOf === 'function' ? nflCountOf(s) : 32) || !s.teams[s.my]) throw new Error('The NFL league data is incomplete.');
  if (!s.pro || !s.pro.rost || !Array.isArray(s.pro.picks) || !s.pro.lg) throw new Error('The NFL front-office data is missing.');
  if (!s.colW || !s.colW.teams || Object.keys(s.colW.teams).length < 100) throw new Error('The college world in this save is missing.');
  if (!Array.isArray(s.roster) || !s.roster.length || !Array.isArray(s.games) || !s.depth || !s.staff || !Number.isFinite(+s.season)) throw new Error('Required game data is missing.');
}
function checkPro(s) {
  if (!s.settings || !POS_ORDER.every(p => Array.isArray(s.depth[p]))) throw new Error('The depth chart is damaged.');
  s.roster.forEach(p => { if (!p || !p.id || !POS_ORDER.includes(p.pos) || !Number.isFinite(p.ovr)) throw new Error('A player record is damaged.'); });
  Object.values(s.teams).forEach(t => { if (!NFL_BY[t.id] || !Number.isFinite(t.rating)) throw new Error('A team record is damaged.'); });
  Object.entries(s.pro.rost).forEach(([tid, l]) => { if (!NFL_BY[tid] || !Array.isArray(l)) throw new Error('A club roster is damaged.'); });
  if (s.pro.role === 'gm' && s.kind !== 'owner' && (!s.pro.gm || !Number.isFinite(s.pro.gm.sec))) throw new Error('The GM record is damaged.');
  if (s.kind === 'owner' && (!s.own || typeof s.own !== 'object' || !Number.isFinite(s.own.val) || !s.own.stad || !s.own.biz)) throw new Error('The owner record is damaged.');
}
function migratePro(s) {
  const L = s.pro; L.cin = L.cin || { draft: [], fa: [], cut: [], trade: [], keep: [] }; L.cin.keep = L.cin.keep || []; L.tx = L.tx || []; L.fa = L.fa || []; L.dead = L.dead || {}; L.offers = L.offers || []; L.faOffers = L.faOffers || {}; L.tradeOffers = L.tradeOffers || [];
  if (L.draft && !L.draft.done) syncDraftSlots();
  // v9.4: contracts carry a salary and a bonus charge for every season left
  const fixAll = list => (list || []).forEach(p => { if (p && p.k) kFix(p.k); });
  fixAll(s.roster); Object.values(L.rost || {}).forEach(fixAll);
}

