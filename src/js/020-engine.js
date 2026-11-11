/* ===================== CORE ENGINE ===================== */
let state = null;
let PMAP = {};
function rebuildPMap() { PMAP = {}; state.roster.forEach(p => PMAP[p.id] = p); }
const P = id => PMAP[id];
const T = id => state.teams[id];
const facLvl = id => (state.facilities.find(f => f.id === id) || {}).lvl || 3;
// difficulty, with the league rule for job security folded in (patient boards and owners forgive more)
const DIFF_R = {};
const diff = () => { const k = (state.settings && state.settings.diff) || 'normal'; const d = DIFF[k]; const sec = state.settings && state.settings.rules && state.settings.rules.security; if (!sec || sec === 'normal') return d; const key = k + ':' + sec; return DIFF_R[key] || (DIFF_R[key] = Object.assign({}, d, sec === 'patient' ? { fire: d.fire - 4, neg: Math.round(d.neg * 80) / 100 } : { fire: d.fire + 6, neg: Math.round(d.neg * 120) / 100 })); };
/* ---------- league rules ----------
 * Rules live in state.settings.rules (job security also uses settings.noFire, the College Football Playoff size uses
 * settings.playoff.size, which Admin edits too). New careers start on Realistic; saves from before v9.4 get Classic,
 * which is exactly how they played before. Presets are just named sets of values. */
const RULE_DEFS = {
  cfp: { label: 'College Football Playoff', hint: 'How many teams make the college playoff.', opts: [[12, '12 teams'], [14, '14 teams'], [16, '16 teams']] },
  otCol: { label: 'College overtime', hint: 'College: each team gets a possession from the 25 until one leads. Sudden death: the first score wins.', opts: [['college', 'College'], ['sudden', 'Sudden death']] },
  otNfl: { label: 'NFL overtime', hint: 'NFL: both teams get the ball once, then the next score wins. College: possessions from the 25. Sudden death: the first score wins.', opts: [['nfl', 'NFL'], ['college', 'College'], ['sudden', 'Sudden death']] },
  nflSeeds: { label: 'NFL playoff teams', hint: '7 per conference (the No. 1 seed gets a bye) or 6 (the top two get byes).', opts: [[7, '7 per conference'], [6, '6 per conference']] },
  capGrow: { label: 'NFL salary cap growth', hint: 'How much the cap rises each year from next season on.', opts: [[0, 'None'], [3, '3% a year'], [5.5, '5.5% a year'], [8, '8% a year']] },
  security: { label: 'Job security', hint: 'How quickly a board, owner or head coach runs out of patience. Never turns firing off.', opts: [['patient', 'Patient'], ['normal', 'Normal'], ['strict', 'Strict'], ['never', 'Never fired']] },
  roster: { label: 'College roster limit', hint: '105 players (today\'s rule) or 85 (the old scholarship limit). A lower limit takes effect at the end of this offseason; extra players are released then.', opts: [[105, '105 players'], [85, '85 players']] },
  proRoster: { label: 'NFL roster limit', hint: 'Players on an NFL roster in season: 53 (today\'s rule), 48 or 46. It applies at the final cut.', opts: [[53, '53 players'], [48, '48 players'], [46, '46 players']] },
  injuries: { label: 'Injuries', hint: 'How often players get hurt in games.', opts: [['low', 'Fewer'], ['normal', 'Normal'], ['high', 'More']] },
  bal: { label: 'Game balance', hint: 'Updated (v9.26): big programs start within their budget and debt costs money, college offenses score more, the NFL has real contenders and a cap that matters, promotions take time, and the commissioner\'s staff plays it safer. Classic: how the game played before v9.26.', opts: [['v926', 'Updated'], ['classic', 'Classic']] },
};
const RULE_PRESETS = {
  realistic: { label: 'Realistic', desc: 'Modern college and NFL rules.', v: { cfp: 12, otCol: 'college', otNfl: 'nfl', nflSeeds: 7, capGrow: 5.5, security: 'normal', proRoster: 53, injuries: 'normal', roster: 105, bal: 'v926' } },
  relaxed: { label: 'Relaxed', desc: 'Bigger playoffs, a faster-growing cap, patient bosses and fewer injuries.', v: { cfp: 16, otCol: 'college', otNfl: 'nfl', nflSeeds: 7, capGrow: 8, security: 'patient', proRoster: 53, injuries: 'low', roster: 105, bal: 'v926' } },
  hardcore: { label: 'Hardcore', desc: 'Fewer playoff spots, a tight cap, impatient bosses and more injuries.', v: { cfp: 12, otCol: 'college', otNfl: 'sudden', nflSeeds: 6, capGrow: 3, security: 'strict', proRoster: 53, injuries: 'high', roster: 85, bal: 'v926' } },
  classic: { label: 'Classic', desc: 'How Football Empire played before league rules (v9.3 and earlier), with the balance from before v9.26.', v: { cfp: 12, otCol: 'college', otNfl: 'college', nflSeeds: 7, capGrow: 5.5, security: 'normal', proRoster: 53, injuries: 'normal', roster: 105, bal: 'classic' } },
};
// IDEA-01 (Step 13): the Sandbox preset plays the Updated balance with your own dials. Each dial multiplies one Step 9–11
// tuning value (1.0 = the Updated default). Only the Sandbox preset stores dials; every other preset ignores them.
const SBX_DEFS = {
  score: { label: 'Scoring', hint: 'How often drives end in a touchdown.', min: 0.6, max: 1.4 },
  home: { label: 'Home-field edge', hint: 'How much the crowd helps the home team.', min: 0, max: 2 },
  spread: { label: 'NFL talent gap', hint: 'How much better rosters win in the NFL. Lower means more parity.', min: 0.4, max: 1.6 },
  interest: { label: 'Interest on debt', hint: 'What money your athletic department owes costs each week.', min: 0, max: 3 },
  ladder: { label: 'Coaching ladder', hint: 'How many seasons schools want before promoting a coach. 0 turns it off.', min: 0, max: 2 },
  deleg: { label: 'Cost of letting staff decide', hint: 'How often the owners mind when your staff decides a commissioner item.', min: 0, max: 2 },
};
const SBX_DEF = () => Object.fromEntries(Object.keys(SBX_DEFS).map(k => [k, 1]));
function sbx(k) { const r = typeof state !== 'undefined' && state && state.settings && state.settings.rules; const v = r && r.sbx ? +r.sbx[k] : NaN; const d = SBX_DEFS[k]; return Number.isFinite(v) && d ? clamp(v, d.min, d.max) : 1; }
function setSbx(k, raw) { const d = SBX_DEFS[k]; const r = state && state.settings && state.settings.rules; if (!d || !r || !r.sbx) return false; const v = Math.round(+raw * 10) / 10; if (!Number.isFinite(v)) return false; r.sbx[k] = clamp(v, d.min, d.max); return true; }
function classicRules(st) { const v = Object.assign({}, RULE_PRESETS.classic.v); return v; }
// the rules in effect (never null): settings.rules plus the two values stored elsewhere
function rules() {
  const st = (state && state.settings) || {}; if (!st.rules) st.rules = classicRules(st);
  const r = Object.assign({}, RULE_PRESETS.classic.v, st.rules); r.cfp = (st.playoff && st.playoff.size) || 12; if (st.noFire) r.security = 'never'; return r;
}
// the updated balance (v9.26) is on for careers playing the Updated rule; older saves stay Classic until switched
const balOn = () => typeof state !== 'undefined' && !!state && !!state.settings && rules().bal === 'v926';
function rulePreset() { const r = rules(); if (r.sbx && r.bal === 'v926') return 'sandbox'; const hit = Object.keys(RULE_PRESETS).find(k => Object.keys(RULE_DEFS).every(x => String(RULE_PRESETS[k].v[x]) === String(r[x]))); return hit || 'custom'; }
// change one rule (values come from the UI as strings)
function setRule(key, raw) {
  const d = RULE_DEFS[key]; if (!d) return false; const o = d.opts.find(x => String(x[0]) === String(raw)); if (!o) return false; const v = o[0];
  const st = state.settings; rules(); const R0 = st.rules;
  if (key === 'cfp') { st.playoff = st.playoff || { size: 12, auto: 'p4g6' }; st.playoff.size = v; return true; }
  if (key === 'security') { st.noFire = v === 'never'; if (v !== 'never') R0.security = v; return true; }
  if (key === 'capGrow' && typeof proCap === 'function' && state.lvl === 'nfl') { const y = capYear(); R0.capA = { yr: y, cap: proCap(y) }; }
  R0[key] = v; if (key === 'bal' && v !== 'v926') delete R0.sbx; return true;
}
function setRulePreset(k) {
  if (k === 'sandbox') { const R0 = (rules(), state.settings.rules); setRule('bal', 'v926'); if (!R0.sbx) R0.sbx = SBX_DEF(); return true; }
  const P = RULE_PRESETS[k]; if (!P) return false; Object.entries(P.v).forEach(([key, v]) => setRule(key, v)); if (state.settings.rules) delete state.settings.rules.sbx; return true;
}
const injRuleF = () => ({ low: 0.6, normal: 1, high: 1.45 })[rules().injuries] || 1;
const otRuleNow = () => (typeof isPro === 'function' && isPro() ? rules().otNfl : rules().otCol);
function teamName(id) { if (!id) return 'TBD'; if (id.startsWith('FCS:')) return id.slice(4); return state.teams[id] ? state.teams[id].name : typeof NFL_BY !== 'undefined' && NFL_BY[id] ? NFL_BY[id].name : id; }
function isFCS(id) { return !!id && id.startsWith('FCS:'); }
function avail(p) { return p && !p.inj && !p.susp && !p.sitNow; }

function genTraits(pos, ovr, name) {
  const keys = TRAITS[pos]; const vals = keys.map(() => gauss() * 5); const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const t = {}; keys.forEach((k, i) => t[k] = clamp(Math.round(ovr + vals[i] - mean), 35, 99));
  const o = name && TRAIT_OVERRIDE[name]; if (o) Object.keys(t).forEach(k => { if (o[k]) t[k] = o[k]; });
  return t;
}
function makePlayer(o) {
  const p = Object.assign({ id: 'p' + (state.nextId++), inj: 0, susp: 0, st: {}, cs: {}, gp: 0, seasons: 0 }, o);
  if (!p.tr) p.tr = genTraits(p.pos, p.ovr, p.n);
  if (p.pay == null) p.pay = r2(marketValue(p) * rnd(0.85, 1.05));
  if (!p.pers) p.pers = persOf(p.real, (state.seed || 0) + ':' + p.id + ':' + p.n); /* every player has a personality from day one (v9.7) */
  return p;
}
function genStar(t, pos, cls) { return { id: 's' + Math.floor(R() * 1e9), n: genName(), pos, cls: cls || pick(['So', 'Jr', 'Jr', 'Sr', 'Sr']), ovr: clamp(Math.round(t.rating + 5 + gauss() * 4), 50, 97), st: {}, gp: 0, tm: t.id }; }
function genStars(t) { t.stars = [genStar(t, 'QB'), genStar(t, R() < 0.5 ? 'RB' : 'WR'), genStar(t, pick(['DE', 'LB', 'CB', 'S', 'DE']))]; }
function genStyle() { const a = gauss() * 3, b = gauss() * 3; return { run: r1(a), pass: r1(-a), runD: r1(b), passD: r1(-b) }; }

// Starts an AD career. `tid` is the school (any of the 138); `custom` replaces a school with your own.
function newGame(diffKey, custom, seed, tid) {
  if (typeof nflLeagueSync === 'function') nflLeagueSync({});
  const sd = seed != null && seed !== '' && Number.isFinite(+seed) ? (+seed >>> 0) || 1 : freshSeed(); setSeed(sd);
  ME = custom ? (custom.replace && CTEAMS0_AD[custom.replace] ? custom.replace : 'MICH') : (tid && CTEAMS0_AD[tid] ? tid : 'MICH');
  state = {
    v: 4, my: ME, season: 2026, phase: 'regular', week: 1, nextId: 1, teams: {}, games: [], polls: [], cfp: [], roster: [], depth: {}, staff: null, cands: {}, news: [], history: [],
    facilities: FAC_DEFS.map(f => ({ id: f.id, lvl: f.lvl, building: false })), meters: { fan: 68, boost: 64, board: 62, morale: 66, hot: 15, risk: 10 }, fin: null, goals: [], off: null, champ: null, gameOver: null,
    settings: { diff: diffKey || 'normal', ask: true, noFire: false, forceM: 'none', sound: false, playoff: { size: 12, auto: 'p4g6' }, rules: Object.assign({}, RULE_PRESETS.realistic.v), scoutMode: 'ranges', eras: 'on', world: 'on' }, plan: { off: 'balanced', def: 'balanced' }, practice: 'balanced',
    rivals: {}, rivalLog: [], book: { game: {}, season: {} }, alumni: [], trophies: [], draft: [], awards: [], ncBook: {}, ncOffers: {}, event: null, eventLog: [], rec: null,
    captains: [], ach: {}, deals: DEAL_DEFS.map(d => Object.assign({}, d)), walkons: null, tryouts: 0, me: null, investigations: [], mediaBonus: 0, created: Date.now(), seed: sd, hashV: 2,
  };
  CONF_DEFS.forEach(([cid, , , , list]) => list.split(';').forEach(s => {
    const [name, id, rating] = s.split('|'); const r = +rating; const off = r1(r + gauss() * 2.5);
    const t = state.teams[id] = { id, name, conf: cid, rating: r, off, def: r1(2 * r - off), st: r1(r + gauss() * 3), elo: 1500 + (r - 70) * 12, w: 0, l: 0, cw: 0, cl: 0, pf: 0, pa: 0, hist: [], style: genStyle(), coach: genName() };
    if (id !== ME) genStars(t);
  }));
  const real = !custom && ME === 'MICH'; // Michigan keeps its real 2026 roster, staff and schedule
  const r0 = T(ME).rating;
  if (custom) applyCustom(custom);
  else if (!real) { state.econ = progEcon(ME, r0); state.deals = DEAL_DEFS.map(d => Object.assign({}, d, { amt: r1(d.amt * econ()) })); const fl = r0 >= 84 ? 4 : r0 >= 72 ? 3 : 2; state.facilities.forEach(f => f.lvl = clamp(fl + (f.id === 'stadium' && r0 >= 88 ? 1 : 0) - (['med', 'academic'].includes(f.id) && fl >= 3 ? 1 : 0), 1, 5)); }
  rebuildConfs();
  if (!custom) PRESEASON_AP.forEach((id, i) => { state.teams[id].elo = 1860 - i * 9; });
  Object.values(state.teams).forEach(t => { if (!custom && !PRESEASON_AP.includes(t.id)) t.elo = Math.min(t.elo, 1612 - (80 - t.rating)); t.elo0 = t.elo; });
  // a generated roster built so the team plays at about its listed strength
  const base = custom ? state.me.base : Math.round(r0 - 1.5);
  if (!real) genCustomRoster(base);
  else ROSTER_SRC.split('\n').forEach(line => {
    const [num, name, pos, cls, ht, wt, home] = line.split('|');
    const k = KNOWN[name]; const base = { Fr: 57, So: 61, Jr: 64, Sr: 65, Gr: 66 }[cls] + (pos === 'LS' ? 4 : 0); const h = hash(name);
    const ovr = k ? k[0] : Math.round(base + (h - 0.5) * 8);
    const pot = k ? k[1] : Math.min(95, ovr + { Fr: 14, So: 10, Jr: 6, Sr: 3, Gr: 1 }[cls] + Math.round(hash(name + 'p') * 8));
    state.roster.push(makePlayer({ num: +num, n: name, pos, cls, ht, wt: +wt, home, ovr, pot, real: true }));
  });
  rebuildPMap();
  POS_ORDER.forEach(pos => { state.depth[pos] = state.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id); });
  state.staff = real ? initialStaff() : genCustomStaff(base);
  if (!real && !custom) calibrateRoster(r0);
  STAFF_ROLES.forEach(r => state.cands[r] = genCandidates(r, r === 'HC' ? 6 : 4));
  setupRivals();
  state.fin = newFinance(real ? 40 : r1(10 + 30 * econ())); if (!real) { state.fin.ticket = econ() >= 0.95 ? 85 : econ() >= 0.8 ? 75 : econ() >= 0.6 ? 60 : 35; state.fin.recruit = r1(Math.max(1, 4 * econ())); }
  // Updated balance: the roster you inherit is paid within the program's pay pool (BAL-01). Those players signed the
  // deals they have, so they aren't unhappy about them; new players are paid at the market.
  if (balOn() && !real) { const pool = payPool() * 1.05, pr = payroll(); if (pr > pool && pr > 0) { const f = pool / pr; state.roster.forEach(p => { p.pay = r2((p.pay || 0) * f); p.payOk = 1; }); } }
  if (!real) { if (custom) { T(ME).rating = Math.round(michStrength().ovr); T(ME).elo = T(ME).elo0 = 1500 + (T(ME).rating - 70) * 12; } buildSchedule(ownSchedule()); }
  else buildSchedule([[1, 'WMU', 1], [2, 'OU', 1], [3, 'UTEP', 1], [4, 'IOWA', 1], [5, 'MINN', 0], [7, 'PSU', 1], [8, 'IU', 1], [9, 'RUTG', 0], [10, 'MSU', 1], [11, 'ORE', 0], [12, 'UCLA', 1], [13, 'OSU', 0]]);
  Object.values(state.teams).forEach(t => { if (t.pres == null) t.pres = t.rating; }); // each program's standing, which the Updated balance keeps pulling it back to
  computePoll('Preseason', !custom);
  setGoals(); autoCaptains();
  genNcOffers(state.season + 1); genNcOffers(state.season + 2);
  genRecruitClass();
  const ap = rankOf(ME);
  addNews(custom ? `Welcome to ${custom.name}. You are the athletic director of a ${TIERS[custom.tier].label.toLowerCase()} program in the ${CONFS[T(ME).conf].name}. Build something.`
    : real ? 'Welcome to Ann Arbor. You are the athletic director. Kyle Whittingham begins his first season as head coach, and the Wolverines open at No. 16 in the preseason poll.'
    : `Welcome to ${myCity()}. You are the athletic director at ${myName()}. Head coach ${state.staff.HC.name} leads ${T(ME).conf === 'IND' ? 'an independent' : aAn(CONFS[T(ME).conf].name)} program that opens ${ap ? 'at No. ' + ap + ' in the preseason poll' : 'outside the preseason Top 25'}.`, 'big');
}
// Shifts a generated roster so the team starts at about its listed 2026 strength.
function calibrateRoster(target) {
  for (let k = 0; k < 4; k++) {
    const d = Math.round(target - michStrength().ovr); if (!d) break;
    state.roster.forEach(p => { p.ovr = clamp(p.ovr + d, 40, 97); p.pot = clamp(Math.max(p.pot + d, p.ovr), p.ovr, 99); Object.keys(p.tr || {}).forEach(t => p.tr[t] = clamp(p.tr[t] + d, 35, 99)); p.pay = r2(marketValue(p) * rnd(0.85, 1.05)); });
    POS_ORDER.forEach(pos => { state.depth[pos] = state.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id); });
  }
}
function rebuildConfs() { if (typeof commSyncTeams === 'function' && state && state.teams) commSyncTeams(); Object.values(CONFS).forEach(c => c.teams = []); const src = typeof isPro === 'function' && isPro() ? (state.colW ? state.colW.teams : {}) : state.teams; Object.values(src).forEach(t => { if (!CONFS[t.conf]) t.conf = 'IND'; CONFS[t.conf].teams.push(t.id); }); }
function newFinance(balance) {
  return { ticket: 85, revPct: 75, recruit: 4.0, compliance: 1.0, collective: 0, drive: false, balance, attend: [], extraRev: 0,
    ytd: { tickets: 0, media: 0, donations: 0, sponsor: 0, post: 0, games: 0, events: 0, salaries: 0, revshare: 0, niltop: 0, ops: 0, recruiting: 0, facilities: 0, other: 0, buyouts: 0, guar: 0, eventx: 0, compliance: 0, incent: 0 } };
}
/* ---------- Schedule ---------- */
function weekDate(season, wk) { const d = new Date(season, 8, 1); while (d.getDay() !== 6) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + (wk - 1) * 7); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function firstSaturday(y, m) { const d = new Date(y, m, 1); while (d.getDay() !== 6) d.setDate(d.getDate() + 1); return d; }
function weekLabel(wk, season) {
  if (isPro()) return proWeekLabel(wk, season);
  season = season || state.season;
  if (wk <= 13) return 'Week ' + wk + ' · ' + weekDate(season, wk);
  // Conference title games are played the first Saturday in December every year.
  if (wk === 14) return 'Conference Championships · ' + firstSaturday(season, 11).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // The 2026-27 playoff dates are published; later seasons show the round only.
  if (season === 2026) return { 15: 'CFP First Round · Dec 18–19', 16: 'Bowls & CFP Quarterfinals · Dec 30–Jan 1', 17: 'CFP Semifinals · Jan 14–15', 18: 'National Championship · Jan 25' }[wk] || 'Postseason';
  return { 15: 'CFP First Round', 16: 'Bowls & CFP Quarterfinals', 17: 'CFP Semifinals', 18: 'National Championship' }[wk] || 'Postseason';
}
let gid = 0;
function mkGame(wk, h, a, o) { return Object.assign({ id: state.season + '-' + (++gid) + '-' + Math.floor(R() * 1e6), wk, h, a, neutral: false, done: false, type: 'reg' }, o || {}); }
function buildSchedule(mSched) {
  const ids = Object.keys(state.teams);
  const busy = {}; ids.forEach(id => busy[id] = new Set());
  const games = []; const played = new Set(); const key = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  const homeCt = {}, cnt = {}, confCnt = {}; ids.forEach(id => { homeCt[id] = 0; cnt[id] = 0; confCnt[id] = 0; });
  // an FCS opponent a team hasn't already drawn this season
  const fcsFor = t => { const used = new Set(games.filter(g => g.h === t || g.a === t).map(g => g.h === t ? g.a : g.h)); const left = FCS_NAMES.filter(n => !used.has('FCS:' + n)); return 'FCS:' + pick(left.length ? left : FCS_NAMES); };
  const add = (wk, h, a, conf, extra) => { games.push(mkGame(wk, h, a, Object.assign({ conf }, extra || {}))); if (!isFCS(h)) busy[h].add(wk); if (!isFCS(a)) busy[a].add(wk); played.add(key(h, a)); if (!isFCS(h)) { homeCt[h]++; cnt[h]++; } if (!isFCS(a)) cnt[a]++; };
  mSched.forEach(([wk, opp, home, extra]) => {
    const conf = T(opp) && T(opp).conf === T(ME).conf && T(opp).conf !== 'IND';
    if (extra && extra.neutral) add(wk, ME, opp, false, extra);
    else add(wk, home ? ME : opp, home ? opp : ME, conf, extra);
    if (conf) { confCnt[ME]++; confCnt[opp]++; }
  });
  for (const c of Object.values(CONFS)) {
    if (!c.confGames) continue;
    const need = Math.min(c.confGames, c.teams.length - 1); let best = null;
    for (let attempt = 0; attempt < 600; attempt++) {
      const lc = {}; c.teams.forEach(t => lc[t] = confCnt[t]);
      const lbusy = {}; c.teams.forEach(t => lbusy[t] = new Set(busy[t]));
      const lplayed = new Set(played); const tg = [];
      for (let wk = 4; wk <= 13; wk++) {
        const av = c.teams.filter(t => !lbusy[t].has(wk) && lc[t] < need);
        const urg = t => { let free = 0; for (let w = wk; w <= 13; w++) if (!lbusy[t].has(w)) free++; return (need - lc[t]) - free; };
        const sorted = av.map(t => [t, urg(t) + R() * 0.9]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
        const used = new Set();
        for (const t of sorted) {
          if (used.has(t)) continue;
          const u = sorted.find(x => x !== t && !used.has(x) && !lplayed.has(key(t, x)));
          if (!u) continue;
          used.add(t); used.add(u); lc[t]++; lc[u]++; lbusy[t].add(wk); lbusy[u].add(wk); lplayed.add(key(t, u)); tg.push([wk, t, u]);
        }
      }
      const short = c.teams.reduce((s, t) => s + (need - lc[t]), 0);
      if (!best || short < best.short) best = { short, tg };
      if (short === 0) break;
    }
    best.tg.forEach(([wk, a, b]) => { const h = homeCt[a] <= homeCt[b] ? a : b; add(wk, h, h === a ? b : a, true); confCnt[a]++; confCnt[b]++; });
  }
  for (let wk = 1; wk <= 13; wk++) {
    const free = t => { let f = 0; for (let w = wk; w <= 13; w++) if (!busy[t].has(w)) f++; return f; };
    const cands = ids.filter(t => !busy[t].has(wk) && cnt[t] < 12);
    const must = [], opt = [];
    cands.forEach(t => { if (wk <= 3 || free(t) <= 12 - cnt[t]) must.push(t); else opt.push(t); });
    shuffle(must); shuffle(opt);
    const used = new Set();
    for (const t of must) {
      if (used.has(t)) continue; used.add(t);
      const p4 = CONFS[T(t).conf].p4;
      if (p4 && wk <= 3 && R() < 0.22 && !games.some(g => g.h === t && isFCS(g.a))) { add(wk, t, fcsFor(t), false); continue; }
      const ok = x => !used.has(x) && T(x).conf !== T(t).conf && !played.has(key(t, x));
      const u = must.find(ok) || opt.find(ok);
      if (!u) { add(wk, t, fcsFor(t), false); continue; }
      used.add(u);
      const tr = T(t).rating, ur = T(u).rating;
      const h = Math.abs(tr - ur) > 8 ? (tr > ur ? t : u) : (homeCt[t] <= homeCt[u] ? t : u);
      add(wk, h, h === t ? u : t, false);
    }
  }
  state.games = state.games.filter(g => g.type !== 'reg' || g.done).concat(games);
}

/* ---------- Strength ---------- */
function starters(pos, n) { n = n || START[pos]; return (state.depth[pos] || []).map(P).filter(avail).slice(0, n); }
function avgOvr(list, n) { let s = 0; for (let i = 0; i < n; i++) s += list[i] ? list[i].ovr : 45; return s / n; }
function michStrength() {
  const g = pos => avgOvr(starters(pos), START[pos]);
  const s = state.staff; const hc = s.HC || { off: 70, def: 70, gm: 70, rec: 70, dev: 70 };
  const oc = s.OC ? s.OC.ovr : 62, dc = s.DC ? s.DC.ovr : 62, stc = s.ST ? s.ST.ovr : 62;
  const mor = (state.meters.morale - 60) * (typeof isPro === 'function' && isPro() && balOn() ? 0.02 : 0.04); /* v9.48: morale matters less in the NFL (Updated balance) */
  const pp = pplan(); const pb = pp ? [pplanBonus().off, pplanBonus().def, 0] : { offense: [1, -0.5, 0], defense: [-0.5, 1, 0], special: [0, 0, 2], youth: [-0.5, -0.5, 0] }[state.practice] || [0, 0, 0]; // a head coach's weekly practice plan replaces the single focus
  const off = 0.32 * g('QB') + 0.10 * g('RB') + 0.20 * g('WR') + 0.06 * g('TE') + 0.32 * g('OL') + (oc - 75) * 0.12 + (hc.off - 75) * 0.05 + (hc.gm - 75) * 0.03 + mor + pb[0];
  const def = 0.20 * g('DE') + 0.17 * g('DT') + 0.21 * g('LB') + 0.23 * g('CB') + 0.19 * g('S') + (dc - 75) * 0.12 + (hc.def - 75) * 0.05 + (hc.gm - 75) * 0.03 + mor + pb[1];
  const st = 0.5 * g('K') + 0.4 * g('P') + 0.1 * g('LS') + (stc - 75) * 0.15 + pb[2];
  const fb = schemeFitBonus(); const off2 = off + fb.off, def2 = def + fb.def; // scheme fit (team identity)
  return { off: r1(off2), def: r1(def2), st: r1(st), k: g('K'), ovr: r1((off2 + def2) / 2 * 0.94 + st * 0.06) };
}
function strength(id) {
  if (id === ME) return michStrength();
  if (isFCS(id)) { const r = 40 + hash(id) * 14 + diff().opp; return { off: r, def: r, st: r, k: r, ovr: r }; }
  const t = T(id); const d = diff().opp; return { off: t.off + d, def: t.def + d, st: t.st, k: t.st, ovr: t.rating + d };
}
function teamOvr(id) { const s = strength(id); return id === ME ? s.ovr : s.ovr; }
function trAvg(pos, n, k) { const l = starters(pos, n); if (!l.length) return 50; return l.reduce((s, p) => s + ((p.tr && p.tr[k]) || p.ovr), 0) / l.length; }
function michUnits() {
  return {
    run: 0.3 * (trAvg('RB', 1, 'spd') + trAvg('RB', 1, 'pow')) / 2 + 0.45 * trAvg('OL', 5, 'rbk') + 0.1 * trAvg('TE', 1, 'blk') + 0.15 * trAvg('QB', 1, 'mob'),
    pass: 0.4 * (trAvg('QB', 1, 'arm') + trAvg('QB', 1, 'acc')) / 2 + 0.3 * (trAvg('WR', 3, 'spd') + trAvg('WR', 3, 'hnd') + trAvg('WR', 3, 'rte')) / 3 + 0.1 * trAvg('TE', 1, 'hnd') + 0.2 * trAvg('OL', 5, 'pbk'),
    runD: 0.4 * trAvg('DT', 2, 'rnd') + 0.25 * trAvg('DE', 2, 'rnd') + 0.35 * trAvg('LB', 3, 'tkl'),
    passD: 0.3 * trAvg('DE', 2, 'rsh') + 0.1 * trAvg('DT', 2, 'rsh') + 0.4 * trAvg('CB', 2, 'cov') + 0.2 * trAvg('S', 2, 'cov'),
    rush: 0.7 * trAvg('DE', 2, 'rsh') + 0.3 * trAvg('DT', 2, 'rsh'),
  };
}
function oppUnits(id) {
  const s = strength(id); const st = (T(id) && T(id).style) || { run: 0, pass: 0, runD: 0, passD: 0 };
  return { run: s.off + st.run, pass: s.off + st.pass, runD: s.def + st.runD, passD: s.def + st.passD, lean: st.run - st.pass };
}
function planEffects(oppId, plan) {
  plan = plan || state.plan;
  const m = michUnits(), o = oppUnits(oppId), ms = michStrength();
  // express michigan units relative to its own average so edges are about matchups, not raw level
  const mRun = m.run - ms.off, mPass = m.pass - ms.off, oRunD = o.runD - strength(oppId).def, oPassD = o.passD - strength(oppId).def;
  const runEdge = mRun - oRunD, passEdge = mPass - oPassD;
  let off = 0, def = 0, passRate = 0.47, varO = 1, varD = 1, toO = 0, toD = 0, sackX = 1, tdAllowX = 1, fgAllowX = 1;
  if (plan.off === 'run') { off = 0.45 * (runEdge - passEdge); passRate = 0.34; varO = 0.8; }
  if (plan.off === 'air') { off = 0.45 * (passEdge - runEdge) + 0.3; passRate = 0.62; varO = 1.4; toO = 0.02; }
  if (plan.def === 'box') { def = 0.35 * o.lean - 0.3; }
  if (plan.def === 'blitz') { def = -0.35 * o.lean + (m.rush - 80) * 0.08; varD = 1.35; toD = 0.025; sackX = 2; }
  if (plan.def === 'soft') { def = -0.15; tdAllowX = 0.88; fgAllowX = 1.35; varD = 0.8; }
  const pf = typeof isPro === 'function' && isPro() && balOn() ? 0.4 : 1; /* v9.48: the other club game-plans too (NFL, Updated balance) */
  return { off: r1(off * pf), def: r1(def * pf), passRate, varO, varD, toO, toD, sackX, tdAllowX, fgAllowX, runEdge: r1(runEdge), passEdge: r1(passEdge), lean: r1(o.lean) };
}
function bestPlan(oppId) {
  let best = null;
  for (const o of Object.keys(OFF_PLANS)) for (const d of Object.keys(DEF_PLANS)) { const e = planEffects(oppId, { off: o, def: d }); const v = e.off + e.def - (o === 'air' ? 0.2 : 0); if (!best || v > best.v) best = { off: o, def: d, v }; }
  return best;
}
// the home team's edge. Updated balance: a smaller base edge plus crowd noise that grows with the home program's
// standing, and a little more against a freshman or sophomore quarterback on the road (BAL-09)
function homeEdge(g) {
  const base = 0.22 * crowdFactor(g.h, g.a) * (g.h === ME && typeof bizCrowd === 'function' ? bizCrowd(g) : 1); if (!balOn()) return base; if (isPro()) return base * 0.45 * sbx('home'); // NFL: scaled with the larger talent effect (BAL-11)
  const H = T(g.h); const loud = H ? clamp(((H.pres != null ? H.pres : H.rating) - 62) / 28, 0, 1) : 0.3; let e = base * 0.88 + 0.04 * loud;
  if (g.a === ME) { const qb = (state.depth.QB || []).map(P).filter(Boolean)[0]; if (qb && ['Fr', 'So'].includes(qb.cls)) e += 0.04; }
  return e * sbx('home'); /* Sandbox dial (1 otherwise) */
}
function crowdFactor(h, a) { if (h !== ME) return 1; if (isPro()) return 0.9 + (state.meters.fan - 60) / 250; return 0.8 + 0.4 * ticketDemand(a) + (state.meters.fan - 60) / 250; }
function wxEdge(id, wx, isM) {
  if (!wx) return 0; const w = WX[wx.k] || {}; let e = w.both || 0;
  if (isM) { const po = state.plan.off; e += po === 'air' ? (w.pass || 0) : po === 'run' ? (w.run || 0) + (w.pass || 0) * 0.2 : (w.pass || 0) * 0.5 + (w.run || 0) * 0.3; }
  else if (!isFCS(id) && T(id)) { const st = T(id).style; e += st.pass > st.run ? (w.pass || 0) * 0.8 : (w.run || 0) * 0.6 + (w.pass || 0) * 0.3; }
  return e;
}
function gameDiff(h, a, neutral, wx) {
  const H = strength(h), A = strength(a);
  let diff = ((H.off - A.def) - (A.off - H.def)) / 2 + (H.st - A.st) * 0.05 + (neutral ? 0 : 2.6 * crowdFactor(h, a));
  if (h === ME || a === ME) { const opp = h === ME ? a : h; const e = isFCS(opp) ? { off: 0, def: 0 } : planEffects(opp); diff += (h === ME ? 1 : -1) * (e.off + e.def) / 2; if (!isFCS(opp)) { const se = schemeEdge(opp); diff += (h === ME ? 1 : -1) * (se.off + se.def) / 2; } if (state.bulletin && state.bulletin === opp) diff += (h === ME ? -1 : 1) * 1.2; }
  if (wx) diff += (wxEdge(h, wx, h === ME) - wxEdge(a, wx, a === ME)) * 0.5;
  return diff;
}
function winProb(h, a, neutral, wx) {
  const bal = balOn(), pro = isPro(); const s = bal ? (pro ? 3.2 : 8.6) : 6.2; // Updated: college games have more upsets (flatter odds); NFL talent shows more (steeper)
  let d = gameDiff(h, a, neutral, wx); if (bal && pro && !neutral) d -= 1.7 * crowdFactor(h, a); // and the NFL home edge is smaller than college's
  return clamp(1 / (1 + Math.exp(-d / s)), 0.03, 0.97);
}
function forecast(g) {
  if (g.wx) return g.wx;
  const loc = g.neutral ? null : g.h; const wk = g.wk;
  const cold = !!loc && COLD.has(loc), rainy = !!loc && RAINY.has(loc), hot = !!loc && HOT.has(loc);
  // Weather is a fixed draw per game (not the game's random sequence), so showing a forecast
  // on screen never changes what happens next.
  // keyed by season, week and teams, not g.id (ids carry a page-wide counter)
  const hk = k => hash((state.seed || 0) + ':' + state.season + ':' + g.wk + ':' + g.h + ':' + g.a + ':' + k); const hg = () => { const u = Math.max(1e-9, hk('u')), v = hk('v'); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const gz0 = hg();
  let temp = Math.round(cold ? 80 - wk * 3.7 + gz0 * 6 : hot ? 90 - Math.max(0, wk - 4) * 1.9 + gz0 * 5 : rainy ? 70 - wk * 2 + gz0 * 5 : 74 - wk * 1.6 + gz0 * 6);
  let k = 'clear'; const r = hk('r');
  if (!loc) { temp = 70; }
  else if (cold && temp <= 33 && r < 0.4) k = 'snow';
  else if (temp <= 26) k = 'cold';
  else if (r < (rainy ? 0.32 : 0.1)) k = 'rain';
  else if (r < (rainy ? 0.4 : 0.19)) k = 'wind';
  else if (hot && temp >= 88) k = 'heat';
  g.wx = { k, temp }; return g.wx;
}
function mWinProb(g) { const wx = forecast(g); return g.h === ME ? winProb(ME, g.a, g.neutral, wx) : 1 - winProb(g.h, ME, g.neutral, wx); }

/* ---------- Game simulation (stepwise, supports live play) ---------- */
function driveProbs(off, def, adv, ot, mods) {
  let d = (off - def) / 10 + adv;
  const cv = mods && mods.col; // Updated balance, college games (BAL-08)
  if (mods && mods.nfl) d *= 2.4 * (mods.sx ? mods.sx.spread : 1); // Updated balance, NFL games: talent shows more (BAL-11); Sandbox dial
  let pTD = cv ? clamp(0.258 + 0.062 * d, 0.07, 0.58) : mods && mods.nfl ? clamp(0.198 + 0.08 * d, 0.04, 0.6) : clamp(0.225 + 0.08 * d, 0.04, 0.6), pFG = clamp(0.13 + 0.01 * d, 0.06, 0.2), pTO = clamp(0.115 - 0.022 * d, 0.03, 0.22);
  if (mods && mods.sx && mods.sx.score !== 1) pTD = clamp(pTD * mods.sx.score, 0.03, 0.7); // Sandbox scoring dial
  if (mods) { pTD *= mods.td || 1; pFG *= mods.fg || 1; pTO += mods.to || 0; }
  if (ot) { pTD += 0.18; pFG += 0.25; pTO *= 0.6; }
  return { pTD, pFG, pTO, d };
}
function rollOut(pr, ot) { const r = R(); if (r < pr.pTD) return 'td'; if (r < pr.pTD + pr.pFG) return 'fg'; if (r < pr.pTD + pr.pFG + pr.pTO) return 'to'; return ot ? 'downs' : 'punt'; }
function addSt(box, p, k, v) { if (!p) return; const o = box.p[p.id] || (box.p[p.id] = {}); o[k] = (o[k] || 0) + v; }
function addOp(box, s, k, v) { if (!s) return; const o = box.op[s.id] || (box.op[s.id] = {}); o[k] = (o[k] || 0) + v; }
function wpick(items) { if (!items || !items.length) return null; const tot = items.reduce((s, x) => s + x[1], 0); let r = R() * tot; for (const x of items) { if ((r -= x[1]) <= 0) return x[0]; } return items[items.length - 1][0]; }
function normcdf(x) { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp(-x * x / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
function emergencyPlayer(prefer) {
  const pool = state.roster.filter(avail); const byPos = pos => pool.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr)[0];
  for (const pos of prefer) { const p = byPos(pos); if (p) return p; }
  return pool.sort((a, b) => b.ovr - a.ovr)[0] || null;
}
function michCtx(plan) {
  const qb = starters('QB')[0] || emergencyPlayer(['WR', 'RB', 'S', 'CB', 'TE', 'LB']), rbs = starters('RB', 2), wrs = starters('WR', 4), tes = starters('TE', 2);
  if (!rbs.length) { const e = emergencyPlayer(['WR', 'LB', 'S', 'TE', 'CB']); if (e) rbs.push(e); }
  const tg = [];
  [[wrs[0], 25], [wrs[1], 19], [wrs[2], 14], [wrs[3], 5], [tes[0], 16], [tes[1], 5], [rbs[0], 9], [rbs[1], 3]].forEach(x => { if (x[0]) tg.push([x[0], x[1] * (0.6 + ((x[0].tr && (x[0].tr.hnd || x[0].tr.rte)) || x[0].ovr) / 200)]); });
  if (!tg.length && qb) tg.push([qb, 10]);
  const run = []; [[rbs[0], 70], [rbs[1], 14], [qb, qb && qb.tr && qb.tr.mob ? qb.tr.mob / 5 : 12]].forEach(x => { if (x[0]) run.push(x); });
  const dl = starters('DE', 3).concat(starters('DT', 3)), lb = starters('LB', 4), db = starters('CB', 3).concat(starters('S', 3));
  const tk = []; lb.forEach((p, i) => tk.push([p, i < 3 ? 16 : 4])); db.forEach(p => tk.push([p, 7])); dl.forEach(p => tk.push([p, 5]));
  const sk = []; starters('DE', 3).forEach((p, i) => sk.push([p, (i < 2 ? 22 : 6) * ((p.tr && p.tr.rsh) || p.ovr) / 80])); starters('DT', 2).forEach(p => sk.push([p, 9])); starters('LB', 3).forEach(p => sk.push([p, 6]));
  const ints = []; db.forEach(p => ints.push([p, 10 * ((p.tr && p.tr.cov) || p.ovr) / 80])); lb.forEach(p => ints.push([p, 3]));
  const acc = (qb && qb.tr && qb.tr.acc) || 60;
  return { qb, tg, run, tk, sk, ints, k: starters('K')[0], p: starters('P')[0], cmp: clamp(0.6 + (acc - 75) * 0.008, 0.45, 0.77), passRate: plan ? plan.passRate : 0.47, rush: avgOvr(dl, 4) };
}
function oppCtx(id) { const t = T(id); if (!t || !t.stars) return null; const qb = t.stars.find(s => s.pos === 'QB'), sk = t.stars.find(s => s.pos === 'RB' || s.pos === 'WR'), df = t.stars.find(s => !['QB', 'RB', 'WR'].includes(s.pos)); return { qb, sk, df, rb: sk && sk.pos === 'RB' ? sk : null, wr: sk && sk.pos === 'WR' ? sk : null }; }

function createSim(g, opts) {
  opts = opts || {};
  const ids = [g.h, g.a];
  const mSide = ids.indexOf(ME);
  const detail = mSide >= 0;
  // a player benched for the first half (Team rules event) sits until halftime (B12)
  const halfOut = detail ? state.roster.filter(p => { p.sitNow = p.halfOut === g.id; return p.sitNow; }).map(p => p.id) : [];
  const pads = detail && state.padsWk && state.padsWk.gid === g.id ? state.padsWk.mode : null;
  const oppId = detail ? ids[1 - mSide] : null;
  const eff = detail && !isFCS(oppId) ? planEffects(oppId) : null;
  const S = ids.map(strength);
  const F = S.map(s => ({ off: s.off + gauss() * 2.4, def: s.def + gauss() * 2.4, st: s.st, k: s.k || s.st }));
  if (eff) { F[mSide].off += eff.off; F[mSide].def += eff.def; }
  if (detail) { g.preWP = Math.round(mWinProb(g) * 100) / 100; const pen = schemeGameStart(); const se = isFCS(oppId) ? { off: 0, def: 0 } : schemeEdge(oppId); const film = pplanBonus().film; F[mSide].off += se.off + pen.off + film; F[mSide].def += se.def + pen.def + film; } // team identity and film study
  // forced results (admin)
  let force = g.force ? g.force.w : null;
  if (!force && detail && state.settings.forceM !== 'none') force = (state.settings.forceM === 'win') === (mSide === 0) ? 'h' : 'a';
  if (force) { const fs = force === 'h' ? 0 : 1; F[fs].off += 16; F[fs].def += 16; }
  const wx = forecast(g); const W = WX[wx.k] || {};
  ids.forEach((id, i) => { F[i].off += wxEdge(id, wx, id === ME); F[i].k += (W.kick || 0); });
  { const tv = typeof travelEdge === 'function' ? travelEdge(g.h, g.a, g.neutral) : 0; if (tv) { F[1].off -= tv / 2; F[1].def -= tv / 2; } } // a long trip or thin air wears on the visitors (v9.56)
  if (detail && state.bulletin === oppId) { F[1 - mSide].off += 1.2; F[1 - mSide].def += 1.2; }
  const sim = {
    otRule: otRuleNow(), el: detail ? 0 : null, ckKey: detail ? (state.seed || 0) + ':' + state.season + ':' + g.wk + ':' + (g.type || '') + ':' + g.h + g.a : '', /* the drive-by-drive clock is kept for your games */
    g, ids, mSide, oppId, eff, F, force, live: !!opts.live, ask: !!opts.live && (isCoach() ? state.co.role === 'HC' && state.co.gameDay !== 'plan' : state.settings.ask),
    askHalf: !!opts.live && (isCoach() ? ['HC', 'OC', 'DC'].includes(state.co.role) : state.settings.ask),
    callDef: !!opts.live && callsDef() && state.co.gameDay !== 'plan', keyOnly: !!opts.live && isCoach() && state.co.gameDay === 'key',
    adv: [g.neutral ? 0 : homeEdge(g), 0], bal: balOn(), pro: isPro(), sx: balOn() && rules().sbx ? { spread: sbx('spread'), score: sbx('score') } : null, wx, wxTO: W.to || 0, wxTD: W.tdx || 1, mom: 0, minM: 0, callPlays: false, clutch: detail ? clutchCount() : 0, big: detail && !isPro() ? !!(g.type !== 'reg' || rankOf(oppId) || rivalOf(oppId)) : detail && g.type !== 'reg', pts: [0, 0], q: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], i: 0, N: ri(11, 13), first: R() < 0.5 ? 0 : 1, ot: 0, done: false,
    box: detail ? { p: {}, op: {}, t: [0, 1].map(() => ({ py: 0, ry: 0, pa: 0, pc: 0, ra: 0, fd: 0, to: 0, sk: 0, pen: ri(3, 9) })), plays: [], wp: [] } : null,
    ctx: detail ? michCtx(eff) : null, octx: detail ? oppCtx(oppId) : null,
    log: [], pending: null, halfDone: false, fourth: 0, shortField: [0, 0], m0: detail ? (mSide === 0 ? 1 : -1) * gameDiff(g.h, g.a, g.neutral) : 0,
  };
  sim.total = sim.N * 2;
  if (detail) { sim.baseOff = S[mSide].off; sim.baseDef = S[mSide].def; }
  if (halfOut.length) sim.halfOut = halfOut;
  if (pads) { const d = pads === 'off' ? -0.8 : 0.5; F[mSide].off += d; F[mSide].def += d; sim.pads = pads; }
  if (detail && isPro() && balOn() && !force) { const c = typeof NFL_ME_CAL === 'number' ? NFL_ME_CAL : 0; F[mSide].off -= c; F[mSide].def -= c; } /* v9.48: your NFL games play to their pregame odds */
  if (sim.box) sim.box.wp.push({ i: 0, v: Math.round(normcdf(sim.m0 / 14) * 100), lbl: 'Kickoff' });
  return sim;
}
// The game clock. Every drive takes time in line with its length (plays and yards), with a little variety, and the
// drives of each half fill exactly 30 minutes, so the number of drives (and the scoring balance) is unchanged.
// sim.el is the time used so far, in seconds.
const fmtClock = sec => Math.floor(sec / 60) + ':' + String(Math.round(sec % 60)).padStart(2, '0');
function clockAt(el, end) { const qtr = Math.min(4, Math.max(1, end ? Math.ceil(el / 900) : Math.floor(el / 900) + 1)); return { qtr, clock: fmtClock(Math.max(0, qtr * 900 - el)) }; }
function driveClock(sim, out, plays) {
  const second = sim.i >= sim.total / 2; const endIdx = second ? sim.total : sim.total / 2; const halfEnd = second ? 3600 : 1800;
  const left = Math.max(1, endIdx - sim.i); const room = Math.max(0, halfEnd - sim.el); let dur = room;
  if (left === 2) dur = clamp(room - (60 + Math.round(hash(sim.ckKey + ':e' + sim.i) * 90)), 15, Math.max(15, room - 15)); // the last drive of a half starts inside the final 2:30
  else if (left > 1) { const v = 0.8 + hash(sim.ckKey + ':' + sim.i) * 0.4; const raw = (plays * 26 + (out === 'to' ? -20 : out === 'td' || out === 'fg' ? 15 : 0)) * v; dur = clamp(Math.round(raw * room / (raw + (left - 1) * 135)), 15, Math.max(15, room - 15 * (left - 1))); }
  sim.el = Math.min(halfEnd, sim.el + dur); return clockAt(sim.el, true);
}
function simClock(sim, i) { if (sim.el != null) return clockAt(sim.el, false); const t = i / sim.total * 60; const qtr = Math.min(4, Math.floor(t / 15) + 1); const rem = 15 - (t % 15); return { qtr, clock: Math.floor(rem) + ':' + String(Math.floor((rem % 1) * 60)).padStart(2, '0') }; }
function simMargin(sim) { return sim.mSide < 0 ? 0 : sim.pts[sim.mSide] - sim.pts[1 - sim.mSide]; }
// advance one drive; returns false when finished or waiting on a decision
function simStep(sim) {
  if (sim.done || sim.pending) return false;
  const inReg = sim.i < sim.total;
  if (inReg && sim.i === sim.total / 2 && sim.halfOut && !sim.halfBack) { sim.halfBack = true; const before = strength(ME); sim.halfOut.forEach(id => { const p = P(id); if (p) p.sitNow = false; }); const after = strength(ME); sim.F[sim.mSide].off += after.off - before.off; sim.F[sim.mSide].def += after.def - before.def; if (sim.ctx) sim.ctx = michCtx(sim.eff); }
  if (inReg && sim.i === sim.total / 2 && (sim.askHalf != null ? sim.askHalf : sim.ask) && !sim.halfDone) { sim.pending = { type: 'half' }; return false; }
  let s, qtr, clock, ot = false;
  if (inReg) { s = (sim.i + sim.first) % 2; ({ qtr, clock } = simClock(sim, sim.i)); }
  else {
    if (sim.pts[0] !== sim.pts[1] && (sim.otRule === 'sudden' ? true : sim.otRule === 'nfl' ? sim.otTurn >= 2 || sim.otTurn % 2 === 0 : sim.otTurn % 2 === 0)) { finishSim(sim); return false; } // overtime rule (league rules)
    if (sim.ot >= 8 && sim.otTurn % 2 === 0) { const w = R() < 0.5 ? 0 : 1; sim.pts[w] += 2; sim.q[w][4] += 2; finishSim(sim); return false; }
    if (sim.otTurn == null) sim.otTurn = 0;
    if (sim.otTurn % 2 === 0) sim.ot++;
    s = sim.otTurn % 2; qtr = 5; clock = ''; ot = true;
  }
  const o = 1 - s; const isM = s === sim.mSide, isMDef = o === sim.mSide;
  if (isM && sim.callPlays && sim.live) { startPlayDrive(sim, s, qtr, clock, ot); return false; }
  if (isMDef && sim.callDef && sim.live) { startDefDrive(sim, s, qtr, clock, ot); return false; }
  const mods = { to: sim.wxTO, td: sim.wxTD, col: sim.bal && !sim.pro, nfl: sim.bal && sim.pro, sx: sim.sx || null };
  if (isM && sim.eff) { mods.to += sim.eff.toO; }
  if (isMDef && sim.eff) { mods.td *= sim.eff.tdAllowX; mods.fg = sim.eff.fgAllowX; mods.to += sim.eff.toD; }
  let adv = sim.adv[s] - sim.adv[o] + sim.shortField[s]; sim.shortField[s] = 0;
  const vs = isM && sim.eff ? sim.eff.varO : isMDef && sim.eff ? sim.eff.varD : 1;
  adv += gauss() * 0.12 * vs + (s === 0 ? sim.mom : -sim.mom);
  if (isM && (qtr >= 4 || ot) && sim.clutch) adv += 0.04 * sim.clutch;
  else if (isM && sim.big && sim.clutch) adv += 0.015 * sim.clutch; /* big-game players: clutch starters lift you all game on the big stage */
  const otF = ot && sim.otRule !== 'nfl' && sim.otRule !== 'sudden'; // college overtime starts at the 25
  const pr = driveProbs(sim.F[s].off, sim.F[o].def, adv, otF, mods);
  let out = rollOut(pr, otF);
  let yards = out === 'td' ? ri(otF ? 12 : 30, otF ? 25 : 82) : out === 'fg' ? ri(8, 50) : out === 'punt' ? ri(-4, 38) : out === 'downs' ? ri(0, 20) : ri(-2, 45);
  const margin = simMargin(sim);
  const drv = { s, qtr, clock, ot, out, yards, pr };
  // decisions for your team's offense
  if (isM && !ot) {
    const lastDrive = sim.i >= sim.total - 2;
    if (lastDrive && margin <= 0 && margin >= -8) { drv.dec = { type: '2min', margin }; }
    else if (qtr >= 2 && (out === 'punt' || out === 'fg') && yards >= 35 && Math.abs(margin) <= 17 && sim.fourth < 2 && R() < 0.75) { drv.dec = { type: '4th', margin, dist: ri(1, 6) }; sim.fourth++; }
  }
  if (drv.dec) {
    if (sim.ask) { sim.pending = Object.assign({ drv }, drv.dec); return false; }
    resolveDecision(sim, drv, autoChoice(sim, drv));
    return true;
  }
  execDrive(sim, drv);
  return true;
}
function autoChoice(sim, drv) {
  const hc = state.staff.HC || { gm: 70 }; const d = drv.dec;
  if (d.type === '2min') return d.margin >= -3 ? 'fg' : 'td';
  if (d.type === '4th') { const fgD = fgDistance(drv.yards); if (drv.qtr === 4 && d.margin < 0) return 'go'; if (d.dist <= 2 && (hc.gm > 80 || R() < 0.35)) return 'go'; return fgD <= 52 ? 'kick' : 'punt'; }
  return 'keep';
}
function fgDistance(yards) { return clamp(Math.round(72 - yards * 0.75 + ri(-3, 3)), 19, 62); }
function fourthOdds(sim, drv) { return clamp(0.62 - drv.dec.dist * 0.05 + drv.pr.d * 0.06 + (state.plan.off === 'run' && drv.dec.dist <= 2 ? 0.05 : 0), 0.25, 0.85); }
function resolveDecision(sim, drv, choice) {
  const d = drv.dec; drv.choice = choice;
  if (d.type === '4th') {
    if (choice === 'go') { if (R() < fourthOdds(sim, drv)) { drv.conv = true; drv.yards += ri(4, 18); drv.out = R() < 0.55 + drv.pr.d * 0.05 ? 'td' : 'fg'; if (drv.out === 'fg') drv.fgDist = fgDistance(drv.yards); } else { drv.conv = false; drv.out = 'downs'; sim.shortField[1 - drv.s] = 0.2; } }
    else if (choice === 'kick') { drv.out = 'fg'; drv.fgDist = fgDistance(drv.yards); }
    else { drv.out = 'punt'; }
  } else if (d.type === '2min') {
    const b = drv.pr.d * 0.04;
    const pr = choice === 'fg' ? { pTD: 0.14 + b, pFG: 0.58, pTO: 0.06 } : { pTD: 0.38 + b, pFG: d.margin >= -3 ? 0.1 : 0, pTO: 0.19 };
    drv.out = rollOut(pr, true); if (drv.out === 'fg') drv.fgDist = clamp(ri(28, 50), 19, 57); if (drv.out === 'td') drv.yards = ri(40, 80);
  }
  execDrive(sim, drv);
}
function simResolve(sim, choice) {
  const p = sim.pending; if (!p) return; sim.pending = null;
  if (p.type === 'half') {
    sim.halfDone = true;
    if (choice && choice.off) state.plan.off = choice.off;
    if (choice && choice.def) state.plan.def = choice.def;
    if (choice && choice.benchQB) { const a = state.depth.QB; const cur = a.findIndex(id => avail(P(id))); const nxt = a.findIndex((id, i) => i > cur && avail(P(id))); if (cur >= 0 && nxt >= 0) { [a[cur], a[nxt]] = [a[nxt], a[cur]]; } }
    if (sim.mSide >= 0) {
      const ms = sim.mSide; const nb = michStrength();
      sim.F[ms].off += nb.off - sim.baseOff; sim.F[ms].def += nb.def - sim.baseDef; sim.baseOff = nb.off; sim.baseDef = nb.def;
      if (!isFCS(sim.oppId)) { const ne = planEffects(sim.oppId); sim.F[ms].off += ne.off - (sim.eff ? sim.eff.off : 0); sim.F[ms].def += ne.def - (sim.eff ? sim.eff.def : 0); sim.eff = ne; }
      sim.ctx = michCtx(sim.eff);
    }
    let sp = ''; if (choice && choice.speech && SPEECHES[choice.speech] && sim.mSide >= 0) { const fx = speechFx(sim, choice.speech); sim.F[sim.mSide].off += fx.off; sim.F[sim.mSide].def += fx.def; if (choice.speech === 'calm') sim.mom = 0; sim.speech = { k: choice.speech, fx }; sp = ` Halftime speech: ${SPEECHES[choice.speech][0].toLowerCase()} (offense ${fx.off >= 0 ? '+' : ''}${fx.off}, defense ${fx.def >= 0 ? '+' : ''}${fx.def}).`; }
    sim.log.push({ half: true, txt: (choice && (choice.off || choice.def || choice.benchQB) ? 'Halftime adjustments made.' : 'Halftime: no changes.') + sp });
    return;
  }
  resolveDecision(sim, p.drv, choice);
}
function execDrive(sim, drv) {
  const { s, ot } = drv; let { out, yards, qtr, clock } = drv;
  const o = 1 - s; const isM = s === sim.mSide, isMDef = o === sim.mSide; const box = sim.box, ctx = sim.ctx, octx = sim.octx;
  const manual = !!drv.plays;
  const nPlays = manual ? Math.max(1, drv.plays.length) : Math.max(3, Math.round(Math.max(yards, 0) / 8.5) + ri(0, 2));
  if (!ot && sim.el != null && sim.i < sim.total) { const ck = driveClock(sim, out, nPlays); qtr = ck.qtr; clock = ck.clock; drv.qtr = qtr; drv.clock = clock; } // the clock when the drive ended
  const qi = Math.min(4, qtr - 1);
  let fgDist = drv.fgDist || 0, fgGood = false, pick6 = false;
  if (out === 'fg') { if (!fgDist) fgDist = clamp(ri(22, 55) - Math.floor(yards / 6), 19, 57); const kacc = isM && ctx.k && ctx.k.tr ? ctx.k.tr.kac : sim.F[s].k; fgGood = R() < clamp(0.97 - (fgDist - 20) * 0.014 + (kacc - 75) * 0.01, 0.25, 0.99); }
  if (out === 'to' && R() < 0.06) pick6 = true;
  const tag = isFCS(sim.ids[s]) ? teamName(sim.ids[s]) : sim.ids[s];
  let txt = '';
  if (box) {
    const bt = box.t[s]; let playsArr = [];
    if (manual) playsArr = drv.plays;
    else {
      const pRate = isM ? ctx.passRate : 0.52;
      for (let k = 0; k < nPlays; k++) { const pass = R() < pRate; const comp = pass ? R() < (isM ? ctx.cmp : 0.61) : true; playsArr.push({ pass, comp, w: pass ? rnd(1.0, 2.4) : rnd(0.35, 1.0), y: 0 }); }
      if (out === 'td') playsArr[playsArr.length - 1].comp = true;
      const gain = playsArr.filter(p => p.comp);
      if (!gain.length) { playsArr[0].pass = false; playsArr[0].comp = true; gain.push(playsArr[0]); }
      if (sim.bal && gain.length > 1) { // Updated balance: yards per play are spread the way real drives go (BAL-10)
        const stuffed = gain.slice(0, -1).filter(p => !p.pass && R() < 0.22); stuffed.forEach(p => { p.y = -ri(0, 3); p.w = 0; }); const live = gain.filter(p => p.w > 0);
        live.forEach(p => { p.w = Math.exp(gauss() * 1.05) * (p.pass ? 1.5 : 1); }); const lost = stuffed.reduce((a, p) => a + p.y, 0); const tot = yards - lost; const W2 = live.reduce((a, p) => a + p.w, 0); let acc2 = 0;
        live.forEach((p, k) => { p.y = k === live.length - 1 ? tot - acc2 : Math.round(tot * p.w / W2); acc2 += p.y; });
      } else { const W = gain.reduce((a, p) => a + p.w, 0); let acc = 0;
      gain.forEach((p, k) => { p.y = k === gain.length - 1 ? yards - acc : Math.round(yards * p.w / W); acc += p.y; }); }
      if (out === 'to') { const tp = R() < 0.62; playsArr.push({ pass: tp, comp: false, int: tp, fum: !tp, y: 0 }); }
    }
    const lastPlay = out === 'td' ? playsArr.filter(p => p.comp).pop() : null;
    drv.pfl = playsArr; /* the field view draws the drive's last plays */
    const sackX = sim.eff ? sim.eff.sackX : 1;
    for (const p of playsArr) {
      if (p.pass) { if (!p.sack) bt.pa++; if (p.comp) { bt.pc++; bt.py += p.y; } } else { bt.ra++; bt.ry += p.y; }
      if (isM && p.pass && !p.comp && !p.int && (manual ? p.sack : R() < 0.12)) { box.t[o].sk++; if (octx && octx.df && ['DE', 'LB'].includes(octx.df.pos) && R() < 0.4) addOp(box, octx.df, 'sk', 1); }
      if (isMDef && p.pass && !p.comp && !p.int && (manual ? p.sack : R() < 0.2 * sackX * (1 + (ctx.rush - 78) / 40))) { const sp = wpick(ctx.sk); addSt(box, sp, 'sk', 1); addSt(box, sp, 'tk', 1); box.t[o].sk++; }
      if (isM) {
        if (p.pass) { if (!p.sack) addSt(box, ctx.qb, 'pa', 1); if (p.comp) { const r = p.who || wpick(ctx.tg); p.who = r; addSt(box, ctx.qb, 'pc', 1); addSt(box, ctx.qb, 'py', p.y); addSt(box, r, 'rc', 1); addSt(box, r, 'rcy', p.y); } if (p.int) { addSt(box, ctx.qb, 'pint', 1); if (octx && octx.df && ['CB', 'S', 'LB'].includes(octx.df.pos) && R() < 0.3) { addOp(box, octx.df, 'int', 1); p.who = octx.df; } } }
        else { const r = p.who || wpick(ctx.run); p.who = r; addSt(box, r, 'ra', 1); addSt(box, r, 'ry', p.y); }
        if (octx && octx.df && (p.comp || !p.pass) && R() < 0.12) addOp(box, octx.df, 'tk', 1);
      }
      if (isMDef) {
        if (p.comp || !p.pass) addSt(box, wpick(ctx.tk), 'tk', 1);
        if (p.int) { const ip = wpick(ctx.ints); p.who = ip; addSt(box, ip, 'int', 1); }
        if (octx) {
          if (p.pass) { addOp(box, octx.qb, 'pa', 1); if (p.comp) { addOp(box, octx.qb, 'pc', 1); addOp(box, octx.qb, 'py', p.y); if (octx.wr && R() < 0.35) { p.who = octx.wr; addOp(box, octx.wr, 'rc', 1); addOp(box, octx.wr, 'rcy', p.y); } } if (p.int) addOp(box, octx.qb, 'pint', 1); }
          else if (octx.rb && R() < 0.62) { p.who = octx.rb; addOp(box, octx.rb, 'ra', 1); addOp(box, octx.rb, 'ry', p.y); }
        }
      }
    }
    if (typeof avsDrive === 'function') avsDrive(sim, drv, playsArr, fgDist, fgGood, pick6); /* advanced stats (v9.14) */
    bt.fd += Math.max(0, Math.floor(yards / 10)) + (out === 'td' ? 1 : 0);
    if (out === 'to') bt.to++;
    if (isM && out === 'punt' && ctx.p) { addSt(box, ctx.p, 'pn', 1); addSt(box, ctx.p, 'pny', ri(36, 52)); }
    if (isM && out === 'fg' && ctx.k) { addSt(box, ctx.k, 'fga', 1); if (fgGood) addSt(box, ctx.k, 'fgm', 1); }
    const qlbl = qtr > 4 ? 'OT' : 'Q' + qtr;
    if (out === 'td') {
      const y = Math.max(1, lastPlay ? lastPlay.y : ri(1, 30));
      if (isM && lastPlay) { txt = lastPlay.pass ? `${ctx.qb.n} ${y}-yd TD pass to ${lastPlay.who.n}` : `${lastPlay.who.n} ${y}-yd TD run`; if (lastPlay.pass) { addSt(box, ctx.qb, 'ptd', 1); addSt(box, lastPlay.who, 'rctd', 1); } else addSt(box, lastPlay.who, 'rtd', 1); }
      else if (octx && lastPlay) { if (lastPlay.pass) { txt = `${octx.qb.n} ${y}-yd TD pass${lastPlay.who ? ' to ' + lastPlay.who.n : ''}`; addOp(box, octx.qb, 'ptd', 1); if (lastPlay.who) addOp(box, lastPlay.who, 'rctd', 1); } else { txt = `${lastPlay.who ? lastPlay.who.n + ' ' : ''}${y}-yd TD run`; if (lastPlay.who) addOp(box, lastPlay.who, 'rtd', 1); } }
      else txt = `${y}-yd TD ${lastPlay && lastPlay.pass ? 'pass' : 'run'}`;
      box.plays.push({ q: qlbl, c: clock, s, txt, y: yards, np: nPlays });
    } else if (out === 'fg') {
      txt = fgGood ? `${isM && ctx.k ? ctx.k.n + ' ' : ''}${fgDist}-yd field goal` : `${isM && ctx.k ? ctx.k.n + ' misses' : 'Missed'} ${fgDist}-yd field goal`;
      if (fgGood || isM) box.plays.push({ q: qlbl, c: clock, s, miss: !fgGood, txt, y: yards, np: nPlays });
    } else if (out === 'to') {
      const tp = playsArr[playsArr.length - 1];
      if (isMDef) txt = tp.int && tp.who ? `${tp.who.n} intercepts ${tag}${pick6 ? ' and returns it for a TD' : ''}` : `${myName()} recovers ${aAn(tag)} fumble${pick6 ? ' and returns it for a TD' : ''}`;
      else txt = tp.int ? `${ctx.qb.n} intercepted${tp.who && tp.who.tm ? ' by ' + tp.who.n : ''}${pick6 ? ', returned for a TD' : ''}` : `${myName()} fumble lost${pick6 ? ', returned for a TD' : ''}`;
      box.plays.push({ q: qlbl, c: clock, s: o, to: true, txt });
    } else if (out === 'downs') txt = drv.dec && drv.choice === 'go' ? 'Stopped on fourth down' : 'Turnover on downs';
    else txt = 'Punt';
  }
  if (out === 'td') { sim.pts[s] += 6; sim.q[s][qi] += 6; const xp = R() < 0.97; const two = isM && sim.live && typeof xTwoPt === 'function' ? xTwoPt(sim) : null; if (two) { drv.two = two; if (two.good) { sim.pts[s] += 2; sim.q[s][qi] += 2; } } else { if (xp) { sim.pts[s]++; sim.q[s][qi]++; } if (box && isM && ctx.k) { addSt(box, ctx.k, 'xpa', 1); if (xp) addSt(box, ctx.k, 'xpm', 1); } } }
  else if (out === 'fg' && fgGood) { sim.pts[s] += 3; sim.q[s][qi] += 3; }
  if (pick6) { sim.pts[o] += 7; sim.q[o][qi] += 7; if (box && o === sim.mSide && ctx.k) { addSt(box, ctx.k, 'xpa', 1); addSt(box, ctx.k, 'xpm', 1); } }
  // momentum, comeback tracking
  if (out === 'td') sim.mom = (s === 0 ? 1 : -1) * 0.1; else if (out === 'to' || out === 'downs') sim.mom = (o === 0 ? 1 : -1) * (pick6 ? 0.14 : 0.1); else sim.mom *= 0.5;
  if (sim.mSide >= 0) sim.minM = Math.min(sim.minM, simMargin(sim));
  sim.ev = { s, out, good: out === 'td' || (out === 'fg' && fgGood), pick6, m: s === sim.mSide };
  // live log & win probability
  if (box) {
    const dtxt = drv.dec ? (drv.dec.type === '4th' ? (drv.choice === 'go' ? (drv.conv ? `Converts 4th-and-${drv.dec.dist}! ` : `Goes for it on 4th-and-${drv.dec.dist}. `) : drv.choice === 'kick' ? 'Sends out the kicker on 4th down. ' : 'Punts on 4th down. ') : (drv.choice === 'fg' ? 'Plays for the field goal. ' : 'Goes for the end zone. ')) : '';
    if (isM && sim.live && (out === 'td' || (out === 'fg' && fgGood)) && typeof xOnside === 'function') xOnside(sim, drv);
    sim.log.push({ two: drv.two, onside: drv.onside, s, qtr, clock, ot, out, yards, np: nPlays, txt: dtxt + txt, pts: sim.pts.slice(), score: out === 'td' || (out === 'fg' && fgGood) || pick6, man: manual, endYl: drv.endYl, fg: fgDist, good: fgGood, p6: pick6, pl: (drv.pfl || []).slice(-2).map(p => ({ k: p.sack ? 's' : p.int ? 'i' : p.fum ? 'f' : p.pass ? (p.comp ? 'p' : 'x') : 'r', y: p.sack ? (p.ly || p.yl || -6) : p.y || 0, n: p.who && p.who.num != null ? p.who.num : null })) });
    const done = sim.i + 1; const rem = ot ? 0.02 : Math.max(0.01, 1 - done / sim.total);
    const m = simMargin(sim); const v = normcdf((m + sim.m0 * rem) / (13.5 * Math.sqrt(rem) + 0.6));
    box.wp.push({ i: box.wp.length, v: Math.round(v * 100), lbl: (ot ? 'OT' : 'Q' + qtr + ' ' + clock) + ' · ' + (sim.ids[s] === ME ? myAb() : tag) + ' ' + (out === 'td' ? 'TD' : out === 'fg' ? (fgGood ? 'FG' : 'missed FG') : out === 'to' ? 'turnover' : out === 'downs' ? 'downs' : 'punt') });
  }
  if (ot) sim.otTurn++; else sim.i++;
  if (!ot && sim.i >= sim.total && sim.pts[0] !== sim.pts[1]) finishSim(sim);
  return true;
}
function simRun(sim) {
  let guard = 0;
  while (!sim.done && guard++ < 200) {
    if (sim.pending) { const p = sim.pending; if (p.type === 'half') simResolve(sim, null); else if (p.type === 'drive') { sim.callPlays = false; autoFinishDrive(sim); } else if (p.type === 'ddrive') { sim.callDef = false; autoFinishDefDrive(sim); } else simResolve(sim, autoChoice(sim, p.drv)); continue; }
    simStep(sim);
  }
  if (!sim.done) finishSim(sim);
  return sim;
}
function finishSim(sim) {
  if (sim.done) return;
  const g = sim.g;
  if (sim.pts[0] === sim.pts[1]) { const w = R() < 0.5 ? 0 : 1; sim.pts[w] += 3; sim.q[w][4] += 3; }
  if (sim.force) {
    const fs = sim.force === 'h' ? 0 : 1;
    if (sim.pts[fs] <= sim.pts[1 - fs]) { const add = sim.pts[1 - fs] - sim.pts[fs] + 3; sim.pts[fs] += add; sim.q[fs][3] += add; if (sim.box) sim.box.plays.push({ q: 'Q4', c: '0:00', s: fs, txt: 'Walk-off score as time expires' }); }
    if (g.force && g.force.hs != null && g.force.as != null && (g.force.hs > g.force.as) === (fs === 0)) { const dh = g.force.hs - sim.pts[0], da = g.force.as - sim.pts[1]; sim.pts = [g.force.hs, g.force.as]; sim.q[0][3] = Math.max(0, sim.q[0][3] + dh); sim.q[1][3] = Math.max(0, sim.q[1][3] + da); }
  }
  g.hs = sim.pts[0]; g.as = sim.pts[1]; g.q = sim.q; g.ot = sim.ot; g.done = true; g.minM = sim.minM;
  if (sim.mSide >= 0 && state.bulletin === sim.oppId) state.bulletin = null;
  if (sim.box) { if (sim.box.wp.length) sim.box.wp[sim.box.wp.length - 1].v = (g.hs > g.as) === (sim.mSide === 0) ? 100 : 0; g.box = sim.box; g.log = sim.log.filter(x => !x.half).map(x => ({ s: x.s, q: x.ot ? 'OT' : 'Q' + x.qtr, c: x.clock, txt: x.txt, out: x.out, y: x.yards, np: x.np, p: x.pts }));
    /* the highlight reel: scoring drives and turnovers, with the plays the field view needs */
    g.hl = { k: sim.ckKey || '', first: sim.first, d: sim.log.filter(x => !x.half && (x.score || x.out === 'to')).slice(-16).map(x => ({ s: x.s, qtr: x.qtr, ot: !!x.ot, out: x.out, yards: x.yards, fg: x.fg, good: x.good, p6: x.p6, pl: x.pl, txt: x.txt, pts: x.pts })) }; }
  delete g.force;
  if (sim.halfOut) sim.halfOut.forEach(id => { const p = P(id); if (p) { p.sitNow = false; delete p.halfOut; } });
  sim.done = true;
}
function quickSim(g) { return simRun(createSim(g, {})); }

/* ---------- Results & records ---------- */
function applyResult(g) {
  const hw = g.hs > g.as; const H = T(g.h), A = T(g.a);
  const conf = g.type === 'reg' && H && A && H.conf === A.conf && H.conf !== 'IND';
  [[H, g.hs, g.as, hw], [A, g.as, g.hs, !hw]].forEach(([t, f, a, w]) => { if (!t) return; t.pf += f; t.pa += a; if (w) t.w++; else t.l++; if (conf) { if (w) t.cw++; else t.cl++; } });
  const eh = H ? H.elo : 1180, ea = A ? A.elo : 1180; const hfa = g.neutral ? 0 : 55;
  const exp = 1 / (1 + Math.pow(10, (ea - eh - hfa) / 400)); const margin = Math.abs(g.hs - g.as);
  const mult = Math.log(margin + 1) * 2.2 / (((hw ? eh - ea : ea - eh) * 0.001) + 2.2);
  const dlt = 30 * mult * ((hw ? 1 : 0) - exp);
  if (H) H.elo += dlt; if (A) A.elo -= dlt;
  // star stats
  if (g.box) { Object.entries(g.box.op || {}).forEach(([sid, st]) => { const t = T(g.h === ME ? g.a : g.h); const s = t && t.stars && t.stars.find(x => x.id === sid); if (s) { Object.entries(st).forEach(([k, v]) => s.st[k] = (s.st[k] || 0) + v); s.gp++; } }); }
  else { starGame(g.h, g.hs, g.a); starGame(g.a, g.as, g.h); }
}
function starGame(tid, pts, oppId) {
  const t = T(tid); if (!t || !t.stars) return;
  const od = strength(oppId).def; const f = (t.off - od) / 10;
  for (const s of t.stars) {
    const add = (k, v) => s.st[k] = (s.st[k] || 0) + v; s.gp++;
    if (s.pos === 'QB') { const pa = ri(25, 40), pc = Math.round(pa * clamp(0.6 + (s.ovr - 78) * 0.006 + gauss() * 0.05, 0.4, 0.8)); add('pa', pa); add('pc', pc); add('py', Math.max(60, Math.round(pc * rnd(10, 13.5) + f * 15))); add('ptd', Math.max(0, Math.round(pts / 7 * rnd(0.4, 0.8)))); add('pint', (R() < 0.35 ? 1 : 0) + (R() < 0.08 ? 1 : 0)); add('ra', ri(2, 8)); add('ry', ri(-5, 35)); if (R() < 0.12) add('rtd', 1); }
    else if (s.pos === 'RB') { const ra = ri(14, 26); add('ra', ra); add('ry', Math.max(10, Math.round(ra * (4.3 + (s.ovr - 78) * 0.06 + f * 0.4 + gauss() * 0.9)))); add('rtd', Math.max(0, Math.round(pts / 7 * rnd(0.15, 0.5)))); const rc = ri(0, 4); add('rc', rc); add('rcy', rc * ri(5, 10)); }
    else if (s.pos === 'WR') { const rc = ri(3, 10); add('rc', rc); add('rcy', Math.round(rc * rnd(10, 17) + (s.ovr - 78))); add('rctd', (R() < pts / 60 ? 1 : 0) + (R() < pts / 140 ? 1 : 0)); }
    else { add('tk', ri(3, 11)); if (['DE', 'LB'].includes(s.pos)) add('sk', (R() < 0.3 ? 1 : 0) + (R() < 0.08 ? 1 : 0)); if (R() < (['CB', 'S'].includes(s.pos) ? 0.15 : 0.05)) add('int', 1); }
  }
}
function record(id) { const t = T(id); return t.w + '-' + t.l; }

/* ---------- Polls ---------- */
function resumeScore(t, voter) { const p4 = CONFS[t.conf].p4 || t.id === 'ND'; return t.elo + (p4 ? 0 : -45) - t.l * 30 + (voter ? gauss() * 22 : 0); }
function computePoll(label, preseason) {
  const teams = Object.values(state.teams);
  if (preseason && state.season === 2026) {
    const rows = PRESEASON_AP.map((id, i) => ({ id, pts: Math.round(1550 - i * 58 - (i > 12 ? 20 : 0)), fpv: 0 }));
    rows[0].fpv = 40; rows[1].fpv = 14; rows[3].fpv = 6; rows[5].fpv = 8; rows[6].fpv = 1; rows[13].tie = rows[14].tie = true; rows[14].pts = rows[13].pts;
    state.polls.push({ label, wk: 0, rows, others: [], real: true });
    teams.forEach(t => t.apRank = 0); rows.forEach((r, i) => T(r.id).apRank = i + 1); return;
  }
  const base = teams.map(t => ({ t, s: resumeScore(t, false) })).sort((a, b) => b.s - a.s).slice(0, 50).map(x => x.t);
  const pts = {}, fpv = {}; base.forEach(t => { pts[t.id] = 0; fpv[t.id] = 0; });
  for (let v = 0; v < 62; v++) { base.map(t => ({ id: t.id, s: resumeScore(t, true) })).sort((a, b) => b.s - a.s).slice(0, 25).forEach((x, i) => { pts[x.id] += 25 - i; if (i === 0) fpv[x.id]++; }); }
  const sorted = base.map(t => ({ id: t.id, pts: pts[t.id], fpv: fpv[t.id] })).filter(x => x.pts > 0).sort((a, b) => b.pts - a.pts);
  const rows = sorted.slice(0, 25), others = sorted.slice(25, 40);
  const prev = state.polls[state.polls.length - 1];
  rows.forEach(r => { const pi = prev ? prev.rows.findIndex(x => x.id === r.id) : -1; r.prev = pi >= 0 ? pi + 1 : 0; });
  state.polls.push({ label, wk: state.week, rows, others });
  teams.forEach(t => t.apRank = 0); rows.forEach((r, i) => T(r.id).apRank = i + 1);
}
function cfpScore(t) {
  const opps = state.games.filter(g => g.done && (g.h === t.id || g.a === t.id) && g.type !== 'bowl').map(g => g.h === t.id ? g.a : g.h);
  const sos = opps.length ? opps.reduce((s, o) => s + (T(o) ? T(o).elo : 1150), 0) / opps.length : 1500;
  const p4 = CONFS[t.conf].p4 || t.id === 'ND';
  return t.elo + (sos - 1500) * 0.35 - t.l * 60 + (p4 ? 0 : -60); // losses weigh more, so 11-1 power teams make a 12-team field (CL-B12)
}
function computeCFP(label) {
  const rows = Object.values(state.teams).map(t => ({ id: t.id, s: cfpScore(t) })).sort((a, b) => b.s - a.s).slice(0, 25);
  state.cfp.push({ label, wk: state.week, rows });
  Object.values(state.teams).forEach(t => t.cfpRank = 0); rows.forEach((r, i) => T(r.id).cfpRank = i + 1);
}
function rankOf(id) { const t = T(id); return t ? t.apRank || 0 : 0; }
function standings(cid) {
  return CONFS[cid].teams.map(T).slice().sort((a, b) => {
    const pa = a.cw / Math.max(1, a.cw + a.cl), pb = b.cw / Math.max(1, b.cw + b.cl);
    if (pb !== pa) return pb - pa; if (b.cw !== a.cw) return b.cw - a.cw;
    const oa = a.w / Math.max(1, a.w + a.l), ob = b.w / Math.max(1, b.w + b.l);
    if (ob !== oa) return ob - oa; return cfpScore(b) - cfpScore(a);
  });
}
function addNews(txt, kind) { state.news.unshift({ s: state.season, wk: state.week, txt, kind: kind || '' }); if (state.news.length > 100) state.news.length = 100; tlPush(txt, kind); }
function mv(k, d) { if (d < 0) d *= diff().neg; else if (d > 0) d *= clamp((100 - state.meters[k]) / 25, 0.25, 1); state.meters[k] = clamp(Math.round(state.meters[k] + d), 0, 100); }

/* ---------- Finance ---------- */
function staffPayroll() { return STAFF_ROLES.reduce((s, r) => s + (state.staff[r] ? state.staff[r].salary : 0), 0); }
function marketValue(p) { const base = Math.pow(Math.max(0, p.ovr - 58) / 30, 2.2) * 1.25; return r2(Math.max(0.01, base * PAY_MULT[p.pos] * (state && state.teams && state.teams[ME] ? econ() : 1))); }
function satisfaction(p) { const m = marketValue(p); if (p.payOk && balOn()) return Math.max(1, m <= 0.03 ? 1.1 : p.pay / m); return m <= 0.03 ? 1.1 : p.pay / m; }
function payroll() { return r2(state.roster.reduce((s, p) => s + (p.pay || 0), 0)); }
function capAlloc() { return r1(REV_SHARE_CAP * econ() * state.fin.revPct / 100); }
function collectiveFunds() { return r1((5 + state.meters.boost / 100 * 8) * econ() + (state.fin.collective || 0)); }
function payPool() { return r1(capAlloc() + collectiveFunds()); }
function payRoom() { return r2(payPool() - payroll()); }
function dealsAmt() { return (state.deals || []).reduce((a, d) => a + (d.thru >= state.season ? d.amt : 0), 0); }
function annualBudget() {
  const f = state.fin, m = state.meters, mon = diff().money; const pr = payroll(); const e = econ();
  return {
    media: r1((72 * e + (state.mediaBonus || 0) + mediaAmt()) * mon), donations: r1(38 * e * (0.55 + m.boost / 140) * mon), sponsor: r1((7 * e * (0.6 + m.fan / 170) + dealsAmt() + (f.extraRev || 0)) * mon),
    salaries: r1(staffPayroll() + 9.5 * e), revshare: r1(Math.min(pr, capAlloc())), niltop: r1(Math.max(0, pr - capAlloc() - collectiveFunds())), ops: r1(14 * (0.3 + 0.7 * e)), recruiting: f.recruit, compliance: f.compliance == null ? 1 : f.compliance, facilities: r1((8 + state.facilities.reduce((s, x) => s + x.lvl, 0) * 0.6) * (0.3 + 0.7 * e)), other: r1(128 * Math.pow(e, 1.5)),
  };
}
function ticketDemand(opp) {
  const f = state.fin, m = state.meters;
  let d = 1.03 - (f.ticket - 75) / 140 + (m.fan - 60) / 280 + (facLvl('stadium') - 3) * 0.02;
  if (opp) { if (rivalOf(opp)) d += 0.1; if (rankOf(opp)) d += 0.06; if (T(opp) && CONFS[T(opp).conf].p4) d += 0.03; else d -= 0.03; }
  const mr = rankOf(ME); if (mr) d += 0.04; if (mr && mr <= 10) d += 0.03;
  return clamp(d, 0.35, 1.0);
}
function weeklyFinance(g) {
  const b = annualBudget(), y = state.fin.ytd, k = 1 / 13;
  ['media', 'donations', 'sponsor', 'salaries', 'revshare', 'niltop', 'ops', 'recruiting', 'compliance', 'facilities', 'other'].forEach(x => y[x] = (y[x] || 0) + b[x] * k);
  const inc = (b.media + b.donations + b.sponsor) * k, exp = (b.salaries + b.revshare + b.niltop + b.ops + b.recruiting + b.compliance + b.facilities + b.other) * k;
  let gate = 0;
  if (g && g.h === ME && !g.neutral && state.fin.ticket > 110) mv('fan', -Math.round((state.fin.ticket - 110) / 30));
  if (g && g.h === ME && !g.neutral) { const att = Math.round(capacity() * ticketDemand(g.a) * rnd(0.985, 1.0)); gate = (att * state.fin.ticket / 1e6 + 1.2 * facLvl('stadium') / 4) * diff().money; y.tickets += gate; g.att = att; state.fin.attend.push(att); }
  if (g && typeof bizGameMoney === 'function') { const xm = bizGameMoney(g); if (xm > 0) { y.events = (y.events || 0) + xm; gate += xm; } else if (xm < 0) { y.eventx = (y.eventx || 0) - xm; gate += xm; } } /* suites, promotions, naming rights (v9.12) */
  if (g && g.payout) { y.games += g.payout; gate += g.payout; }
  if (g && g.fee) { y.guar += g.fee; gate -= g.fee; }
  state.fin.balance += inc - exp + gate;
  // Updated balance: money owed costs about 8% a season in interest, and a large debt wears on the board (BAL-02)
  if (balOn() && state.fin.balance < 0) { const owe = -state.fin.balance; const i = r2(owe * 0.006 * sbx('interest')); y.debt = (y.debt || 0) + i; state.fin.balance -= i; const big = 25 * econ(); if (owe > big) mv('board', owe > big * 2 ? -2 : -1); }
}
function finTotals() {
  const y = state.fin.ytd;
  const rev = y.tickets + y.media + y.donations + y.sponsor + y.post + y.games + y.events;
  const exp = y.salaries + y.revshare + y.niltop + y.ops + y.recruiting + (y.compliance || 0) + y.facilities + y.other + y.buyouts + y.guar + y.eventx + (y.incent || 0) + (y.debt || 0);
  return { rev, exp, net: rev - exp };
}

/* ---------- Goals ---------- */
function mGames() { return state.games.filter(g => g.h === ME || g.a === ME).sort((a, b) => a.wk - b.wk); }
function setGoals() {
  const reg = mGames().filter(g => g.type === 'reg');
  const ew = reg.reduce((s, g) => s + mWinProb(g), 0);
  const exp = clamp(Math.round(ew + 0.3), 3, 12);
  const mich = isRealMich() && T(ME).conf === 'B1G'; const arch = archRival(); const archOn = arch && reg.some(g => oppOf(g) === arch);
  const cn = CONFS[T(ME).conf].name;
  state.goals = [{ id: 'wins', txt: `Win at least ${exp} regular-season games`, n: exp }];
  if (mich) state.goals.push({ id: 'osu', txt: 'Beat Ohio State' }, { id: 'msu', txt: 'Keep the Paul Bunyan Trophy (beat Michigan State)' });
  else { const gA = T(ME).rating < 74 ? { id: 'upset', txt: 'Beat a team rated higher than you' } : { id: 'ranked', txt: 'Beat a ranked opponent' }; const ind = T(ME).conf === 'IND'; const cg = Math.max(1, exp - 2); // a rebuilding program is judged on progress, not a winning record
    const gB = exp >= 10 && !ind ? { id: 'conf', txt: `Play in the ${cn} Championship` } : exp >= 7 || ind ? { id: 'conf', txt: 'Finish with a winning record' } : { id: 'confw', n: cg, txt: `Win at least ${cg} ${cn} game${cg > 1 ? 's' : ''}` }; if (archOn) state.goals.push({ id: 'riv', opp: arch, txt: `Beat ${teamName(arch)}` }, gB.txt.startsWith('Play in') ? gB : gA); else state.goals.push(gA, gB); }
  state.goals.push(exp >= 5 || mich ? { id: 'post', txt: exp >= 10 ? 'Reach the College Football Playoff' : 'Reach a bowl game' } : { id: 'home', txt: 'Win at least half your home games' }, { id: 'money', txt: 'Finish the fiscal year with a surplus' });
  state.expWins = exp;
}
function goalStatus(gl) {
  const games = mGames(); const regDone = games.filter(g => g.type === 'reg' && g.done);
  const mw = g => (g.h === ME ? g.hs > g.as : g.as > g.hs);
  if (gl.id === 'wins') { const w = regDone.filter(mw).length; const remaining = games.filter(g => g.type === 'reg').length - regDone.length; if (w >= gl.n) return 'met'; if (w + remaining < gl.n) return 'failed'; return 'open'; }
  if (gl.id === 'osu' || gl.id === 'msu' || gl.id === 'riv') { const opp = gl.id === 'riv' ? gl.opp : gl.id.toUpperCase(); const g = games.find(x => x.type === 'reg' && (x.h === opp || x.a === opp)); if (!g) return 'met'; if (!g.done) return 'open'; return mw(g) ? 'met' : 'failed'; }
  if (gl.id === 'post') { const cfp = games.some(g => g.type === 'cfp'); const bowl = games.some(g => g.type === 'bowl'); const open = state.phase === 'regular' || state.phase === 'ccg'; if (gl.txt.includes('Playoff')) return cfp ? 'met' : open ? 'open' : 'failed'; return (cfp || bowl) ? 'met' : open ? 'open' : 'failed'; }
  if (gl.id === 'upset') { if (games.some(g => g.done && mw(g) && g.oppRt > g.myRt)) return 'met'; return games.some(g => !g.done) ? 'open' : 'failed'; }
  if (gl.id === 'ranked') { if (games.some(g => g.done && mw(g) && g.oppRk)) return 'met'; return games.some(g => !g.done) ? 'open' : 'failed'; }
  if (gl.id === 'conf') { if (gl.txt.startsWith('Finish')) { const w = games.filter(g => g.done && mw(g)).length, l = games.filter(g => g.done && !mw(g)).length; if (state.phase === 'offseason' || state.phase.startsWith('cfp')) return w > l ? 'met' : 'failed'; return 'open'; } if (games.some(g => g.type === 'ccg')) return 'met'; return state.phase === 'regular' ? 'open' : 'failed'; }
  if (gl.id === 'confw') { if (T(ME).cw >= gl.n) return 'met'; return state.phase === 'regular' ? 'open' : 'failed'; }
  if (gl.id === 'home') { const hg = games.filter(g => g.type === 'reg' && g.h === ME && !g.neutral); const w = hg.filter(g => g.done && mw(g)).length, l = hg.filter(g => g.done && !mw(g)).length; if (w * 2 >= hg.length) return 'met'; if (l * 2 > hg.length) return 'failed'; return 'open'; }
  if (gl.id === 'money') { const n = finTotals().net; if (state.phase === 'offseason') return n >= 0 ? 'met' : 'failed'; return 'open'; }
  return 'open';
}

/* ---------- Week flow ---------- */
function michGameThisWeek(wk) { return state.games.find(g => g.wk === wk && (g.h === ME || g.a === ME) && !g.done); }
function simOthers(wk) { state.games.filter(g => g.wk === wk && !g.done && g.h !== ME && g.a !== ME).forEach(g => { quickSim(g); applyResult(g); }); }
function advance() {
  if (typeof nflLeagueSync === 'function') nflLeagueSync();
  if (isPro()) return proAdvance();
  if (state.gameOver || state.phase === 'offseason') return;
  if (state.event) { autoResolveEvent(); }
  predEnsure(); commWeek();
  weekAutomation();
  const wk = state.week; const mg = michGameThisWeek(wk);
  simOthers(wk);
  if (mg) { quickSim(mg); }
  endWeek(wk, mg);
}
function endWeek(wk, mg) {
  if (isPro()) return proEndWeek(wk, mg);
  if (mg) { applyResult(mg); }
  if (state.phase === 'regular') weeklyFinance(mg);
  if (mg) afterMichGame(mg);
  weeklyTeam(mg);
  if (mg && (state.phase === 'regular' || state.phase === 'ccg' || state.phase.startsWith('cfp'))) maybePresser(mg);
  rehabWeek(!!mg);
  state.roster.forEach(p => { if (p.injFresh) { p.injFresh = false; } else if (p.inj > 0) { p.inj--; if (p.inj === 0 && p._injNews) { addNews(`${p.n} (${p.pos}) is cleared to return.`); p._injNews = false; } } if (mg && p.susp > 0) { p.susp--; if (!p.susp) addNews(`${p.n} returns from suspension.`); } });
  if (!mg && state.phase === 'regular') addNews(`Open week for ${myName()}. ${state.staff.HC ? state.staff.HC.name : 'The staff'} uses the bye to get healthy.`);
  recruitWeek(mg);
  hotSeatWeek(mg);
  checkAch('week', mg);
  const ph = state.phase;
  if (ph === 'regular') {
    computePoll('Week ' + (wk + 1), false); if (wk >= 9) computeCFP('CFP Rankings · Week ' + (wk + 1));
    weeklyAwards(wk);
    state.week++;
    if (state.week > 13) { state.phase = 'ccg'; setupCCG(); }
    else maybeEvent();
  } else if (ph === 'ccg') { computePoll('After championships', false); computeCFP('Final CFP Rankings'); state.week = 15; setupPostseason(); state.phase = 'cfp1'; earlySigning(); }
  else if (ph === 'cfp1') { setupRound(2); state.week = 16; state.phase = 'cfp2'; }
  else if (ph === 'cfp2') { setupRound(3); state.week = 17; state.phase = 'cfp3'; }
  else if (ph === 'cfp3') { setupRound(4); state.week = 18; state.phase = 'cfp4'; }
  else if (ph === 'cfp4') {
    const g = state.games.find(x => x.wk === 18 && x.type === 'cfp'); const champ = g.hs > g.as ? g.h : g.a; state.champ = champ; T(champ).elo += 40;
    addNews(`${teamName(champ)} wins the national championship, ${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)} over ${teamName(champ === g.h ? g.a : g.h)}.`, champ === ME ? 'big' : '');
    computePoll('Final poll', false); checkAch('final'); startOffseason(); if (typeof xOffseason === 'function') xOffseason();
  }
  if (typeof xWeek === 'function') xWeek(wk, mg);
}
function afterMichGame(g) {
  const home = g.h === ME, ms = home ? g.hs : g.as, os = home ? g.as : g.hs, opp = home ? g.a : g.h;
  const win = ms > os; relAfterGame(g, win); const oppRank = rankOf(opp); g.oppRk = oppRank; g.oppRt = T(opp) ? T(opp).rating : 40; g.myRt = T(ME).rating;
  // how likely a win was going in: fans and the hot seat judge results against it, so an underdog
  // program isn't punished like a favorite for the same loss
  if (g.pw == null) { const ph = winProb(g.h, g.a, g.neutral); g.pw = r2(g.h === ME ? ph : 1 - ph); } const pw = g.pw;
  g.mResult = win ? 'W' : 'L';
  if (g.box) Object.entries(g.box.p).forEach(([pid, s]) => { const p = P(pid); if (!p) return; Object.entries(s).forEach(([k, v]) => p.st[k] = (p.st[k] || 0) + v); });
  const playedIds = new Set();
  POS_ORDER.forEach(pos => { const list = (state.depth[pos] || []).map(P).filter(avail); list.slice(0, START[pos]).forEach(p => playedIds.add(p.id)); const bk = list.slice(START[pos]).find(p => !p.rsPlan); if (bk) playedIds.add(bk.id); });
  playedIds.forEach(id => P(id).gp++);
  updateBook(g, ms, opp); teamRecGame(ms, os);
  const big = oppRank || rivalOf(opp) || g.type !== 'reg';
  if (win) { mv('fan', big ? 5 : Math.round(1 + 5 * (1 - pw))); mv('boost', big ? 4 : 1); mv('morale', 3); mv('board', big ? 2 : 0.5); }
  else { const bad = isFCS(opp) || (!oppRank && T(opp) && !CONFS[T(opp).conf].p4 && T(opp).rating < T(ME).rating - 6); mv('fan', bad ? -9 : big ? -4 : -Math.round(1 + 6 * pw)); mv('boost', bad ? -8 : -3); mv('morale', -4); mv('board', bad ? -4 : -1); }
  if (rivalOf(opp) && g.type === 'reg') {
    const r = state.rivals[opp]; if (win) r.w++; else r.l++; state.rivalLog.push({ s: state.season, opp, ms, os, win });
    if (opp === archRival()) { if (win) { mv('fan', 8); mv('boost', 8); mv('board', 5); } else { mv('fan', -8); mv('boost', -6); mv('board', -4); } }
    else { if (win) { mv('fan', 3); mv('boost', 2); } else { mv('fan', -6); mv('boost', -5); mv('board', -2); } }
  }
  rollInjuries(g); if (state.padsWk && state.padsWk.gid === g.id) state.padsWk = null;
  const rt = rivalOf(opp);
  let txt = `${win ? 'W' : 'L'} ${ms}-${os} ${g.neutral ? 'vs.' : home ? 'vs.' : 'at'} ${oppRank ? '#' + oppRank + ' ' : ''}${teamName(opp)}${g.ot ? ' (' + (g.ot > 1 ? g.ot : '') + 'OT)' : ''}.`;
  const rtThe = rt && /^The /.test(rt) ? rt : 'the ' + rt;
  if (rt) txt += win ? ` ${myName()} wins ${rtThe}.` : ` ${teamName(opp)} wins ${rtThe}.`;
  if (g.name) txt = g.name + ': ' + txt;
  if (g.wx && g.wx.k !== 'clear') txt += ` Conditions: ${WX[g.wx.k].label.toLowerCase()}, ${g.wx.temp}°.`;
  if (g.att) txt += ` Attendance: ${g.att.toLocaleString()}.`;
  addNews(txt, win ? 'win' : 'loss');
}
function rivalOf(opp) { return state.rivals && state.rivals[opp] ? state.rivals[opp].name || 'Rivalry game' : null; }
function rollInjuries(g) {
  const pads = g && state.padsWk && state.padsWk.gid === g.id ? (state.padsWk.mode === 'off' ? 0.55 : 1.35) : 1; // the week's practice plan (B12)
  const medF = (1 - (facLvl('med') - 3) * 0.12 - (facLvl('weight') - 3) * 0.05) * (state.practice === 'conditioning' && !pplan() ? 0.6 : 1) * pplanBonus().inj * pads * (typeof bizInjF === 'function' ? bizInjF() : 1);
  POS_ORDER.forEach(pos => starters(pos).forEach(p => {
    if (['K', 'P', 'LS'].includes(pos)) return;
    if (R() < 0.013 * medF * injRuleF() * (p.pers === 'fragile' ? 1.9 : 1) * rehabInjF(p)) {
      const t = wpick(INJ_TYPES.map(x => [x, x[3]])); const season = t[1] === 99;
      const w = season ? 99 : Math.max(1, Math.round(ri(t[1], t[2]) * (1 - (facLvl('med') - 3) * 0.12)));
      p.inj = w; p.injType = t[0]; p.injSE = season; p._injNews = true; p.injFresh = true;
      addNews(season ? `Injury: ${p.n} (${p.pos}) suffered ${aAn(t[0].toLowerCase())} and is out for the season.${p.gp <= 4 ? ' He should qualify for a medical redshirt.' : ''}` : `Injury: ${p.n} (${p.pos}) has ${aAn(t[0].toLowerCase())} and will miss about ${w} week${w > 1 ? 's' : ''}.`, 'bad');
    }
  }));
}
/* ---------- Postseason ---------- */
function setupCCG() {
  for (const c of Object.values(CONFS)) {
    if (!c.confGames || c.teams.length < 4) continue;
    const st = standings(c.id).filter(t => !(t.id === ME && state.ban === state.season));
    state.games.push(mkGame(14, st[0].id, st[1].id, { type: 'ccg', neutral: true, name: c.name + ' Championship' }));
  }
  const bg = state.games.find(g => g.type === 'ccg' && (g.h === ME || g.a === ME));
  if (bg) addNews(`${myName()} is headed to the ${bg.name} Game against ${teamName(bg.h === ME ? bg.a : bg.h)}.`, 'big');
  else addNews(`${myName()} misses the conference championship game. Title games are this week.`);
}
function setupPostseason() {
  const champs = {};
  state.games.filter(g => g.type === 'ccg' && g.done).forEach(g => { const w = g.hs > g.as ? g.h : g.a; champs[T(w).conf] = w; });
  const banned = id => (id === ME && state.ban === state.season && !isComm()) || (typeof cmBanned === 'function' && cmBanned(id));
  const order = [...new Set(state.cfp[state.cfp.length - 1].rows.map(r => r.id).concat(Object.values(state.teams).map(t => ({ id: t.id, s: cfpScore(t) })).sort((a, b) => b.s - a.s).map(x => x.id)))].filter(id => !banned(id));
  const ps = state.settings.playoff || { size: 12, auto: 'p4g6' }; const size = ps.size;
  const field = new Set();
  if (ps.auto === 'p4g6') {
    ['SEC', 'B1G', 'B12', 'ACC'].forEach(c => champs[c] && !banned(champs[c]) && field.add(champs[c]));
    const g6c = new Set(Object.entries(champs).filter(([cf]) => !CONFS[cf].p4 && cf !== 'IND').map(x => x[1]));
    const g6 = order.find(id => g6c.has(id)) || order.find(id => !CONFS[T(id).conf].p4 && T(id).conf !== 'IND'); if (g6) field.add(g6);
    if (order.indexOf('ND') > -1 && order.indexOf('ND') < size) field.add('ND');
  } else if (ps.auto === 'champs5') {
    Object.values(champs).filter(id => !banned(id)).sort((a, b) => order.indexOf(a) - order.indexOf(b)).slice(0, 5).forEach(id => field.add(id));
  }
  // the committee never leaves out a power-conference team (or Notre Dame) with one loss or fewer (CL-B12)
  const lossesOf = id => state.games.filter(g => g.done && (g.type === 'reg' || g.type === 'ccg') && (g.h === id || g.a === id) && (g.h === id ? g.hs < g.as : g.as < g.hs)).length;
  order.filter(id => (CONFS[T(id).conf].p4 || id === 'ND') && lossesOf(id) <= 1 && state.games.some(g => g.done && (g.h === id || g.a === id))).forEach(id => { if (field.size < size) field.add(id); });
  for (const id of order) { if (field.size >= size) break; field.add(id); }
  const seeds = [...field].sort((a, b) => order.indexOf(a) - order.indexOf(b)).slice(0, size);
  state.bracket = { seeds, champs, size, adv: { 1: [], 2: [], 3: [], 4: [] } };
  for (let m = 0; m < 8; m++) {
    const a = seeds[ORDER16[2 * m] - 1], b = seeds[ORDER16[2 * m + 1] - 1];
    if (a && b) state.games.push(mkGame(15, a, b, { type: 'cfp', round: 1, m, name: 'CFP First Round' }));
    else state.bracket.adv[1][m] = a || b || null;
  }
  // incentives for staff
  const mConf = champs[T(ME).conf] === ME, mIn = seeds.indexOf(ME);
  STAFF_ROLES.forEach(r => { const c = state.staff[r]; if (!c || !c.inc) return; let pay = 0; if (mConf && c.inc.conf) pay += c.inc.conf; if (mIn >= 0 && c.inc.cfp) pay += c.inc.cfp; if (pay) { state.fin.ytd.incent = (state.fin.ytd.incent || 0) + pay; state.fin.balance -= pay; } });
  // bowls by conference tie-ins
  const eligible = order.filter(id => !field.has(id) && T(id).w >= 6);
  const used = new Set();
  const bestOf = conf => eligible.find(id => !used.has(id) && T(id).conf === conf);
  const anyOf = notConf => eligible.find(id => !used.has(id) && T(id).conf !== notConf) || eligible.find(id => !used.has(id));
  for (const [name, ca, cb] of (state.comm && state.comm.ties) || BOWL_TIES) {
    let a = bestOf(ca); if (a) used.add(a); let b = bestOf(cb); if (b) used.add(b);
    if (!a) { a = anyOf(b ? T(b).conf : null); if (a) used.add(a); }
    if (!b) { b = anyOf(a ? T(a).conf : null); if (b) used.add(b); }
    if (!a || !b) { if (a) used.delete(a); if (b) used.delete(b); break; }
    state.games.push(mkGame(16, a, b, { type: 'bowl', neutral: true, name }));
  }
  if (mConf) state.trophies.push({ s: state.season, t: CONFS[T(ME).conf].name + ' Champions', k: 'conf' });
  if (mIn >= 0) { addNews(`${myName()} is in the College Football Playoff as the No. ${mIn + 1} seed.`, 'big'); mv('fan', 6); mv('boost', 5); state.fin.ytd.post += 4; state.fin.balance += 4; state.trophies.push({ s: state.season, t: `College Football Playoff (No. ${mIn + 1} seed)`, k: 'cfp' }); }
  else if (state.ban === state.season) addNews(`${myName()} is serving an NCAA postseason ban this year.`, 'bad');
  else { const bg = state.games.find(g => g.type === 'bowl' && (g.h === ME || g.a === ME)); if (bg) { addNews(`${myName()} accepts a bid to the ${bg.name} against ${teamName(bg.h === ME ? bg.a : bg.h)}.`); state.fin.ytd.post += 1.5; state.fin.balance += 1.5; } else addNews(`${myName()} is not bowl-eligible this year. The board has noticed.`, 'bad'); }
}
function winnerOf(g) { return g.hs > g.as ? g.h : g.a; }
function setupRound(r) {
  const br = state.bracket; const prev = r - 1; const wk = 14 + prev;
  state.games.filter(g => g.wk === wk && g.type === 'cfp').forEach(g => br.adv[prev][g.m] = winnerOf(g));
  const bowlM = state.games.find(g => g.wk === 16 && g.type === 'bowl' && g.done && (g.h === ME || g.a === ME));
  if (r === 3 && bowlM && winnerOf(bowlM) === ME) state.trophies.push({ s: state.season, t: bowlM.name + ' champions', k: 'bowl' });
  const n = 16 >> r; const seedOf = id => br.seeds.indexOf(id);
  for (let j = 0; j < n; j++) {
    const a = br.adv[prev][2 * j], b = br.adv[prev][2 * j + 1];
    if (a && b) { const hi = seedOf(a) <= seedOf(b) ? a : b; const lo = hi === a ? b : a; state.games.push(mkGame(14 + r, hi, lo, { type: 'cfp', round: r, m: j, neutral: true, name: r === 2 ? QF_NAMES[j] : r === 3 ? SF_NAMES[j] : 'CFP National Championship' })); }
    else br.adv[r][j] = a || b || null;
  }
  if (state.games.find(g => g.wk === 14 + r && g.type === 'cfp' && (g.h === ME || g.a === ME))) { state.fin.ytd.post += 2; state.fin.balance += 2; }
}
/* ---------- Coaching moves ---------- */
function buyout(c) { return r1(c.salary * c.years * (c.buyPct != null ? c.buyPct : (c.role === 'HC' ? 0.75 : 0.5))); }
function fireCoach(role) {
  const c = state.staff[role]; if (!c || c.me) return;
  STAFF_ROLES.forEach(r => { const x = state.staff[r]; if (x && x !== c && !x.me) rapAdj(x, -4, `You fired ${c.name}`); });
  const b = buyout(c); state.fin.ytd.buyouts += b; state.fin.balance -= b;
  const recentW = mGames().filter(g => g.done); const wins = recentW.filter(g => g.mResult === 'W').length, pct = recentW.length ? wins / recentW.length : 0.5;
  if (role === 'HC') {
    if (state.meters.hot >= 60) { mv('fan', 8); mv('boost', 5); mv('board', 3); }
    else if (pct >= 0.7) { mv('fan', -10); mv('boost', -12); mv('board', -6); }
    mv('morale', -8); state.meters.hot = 15;
    addNews(`You fired head coach ${c.name}. Buyout: $${b.toFixed(1)}M.`, 'big'); stringsCheck('fire', c.name);
    if (state.phase !== 'offseason') {
      const oc = state.staff.OL || state.staff.DC || state.staff.OC; const base = oc ? oc.ovr : 70;
      state.staff.HC = mkCoach({ name: oc ? oc.name : 'Interim coach', role: 'HC', title: 'Interim Head Coach', interim: true, off: base - 6, def: base - 6, rec: base - 10, dev: base - 4, gm: base - 8, salary: 0, years: 0, real: oc ? oc.real : false });
      addNews(`${state.staff.HC.name} is the interim head coach for the rest of the season. You can hire a permanent coach in the offseason.`);
    } else state.staff.HC = null;
  } else { state.staff[role] = null; mv('morale', -2); addNews(`You fired ${c.title.toLowerCase()} ${c.name}. Buyout: $${b.toFixed(1)}M.`); }
}
function hireAccept(c, bump) {
  const m = state.meters;
  const prestige = 70 + (rankOf(ME) ? 12 - rankOf(ME) * 0.3 : 0) + (m.board - 60) * 0.1 + (facLvl('building') - 3) * 3;
  return clamp(0.5 + (prestige - coachOvr(c)) / 40 + (bump ? 0.28 : 0) + (c.tree ? 0.2 : 0), 0.05, 0.97); // a former assistant listens when you call
}
function hireCoach(role, cid, bump, offer) {
  const list = state.cands[role]; const c = list.find(x => x.id === cid); if (!c || c.declined) return 'gone'; coachNorm(c, role);
  if (role === 'HC' && state.phase !== 'offseason' && state.staff.HC && state.staff.HC.interim) return 'wait';
  if (state.staff[role] && !state.staff[role].interim) return 'filled';
  // your assistant pool only limits the assistants you hire as head coach; the AD pays the head coach (B03)
  if (isCoach() && (role === state.co.role || (state.co.role === 'HC' && role !== 'HC' && assistantSpend() + (offer ? offer.sal : c.salary) > state.co.contract.pool))) return 'pool';
  if (!c.rxb && typeof rxBid === 'function' && !isComm()) { c.rxb = 1; const b = rxBid(role, cid); if (b) { c.salary = r1(c.salary + b.extra); addNews(`${b.name} of ${teamName(b.by)} bid for ${c.name || 'the same coach'} too. The price went up by $${b.extra}M.`); } }
  const p = offer ? negOdds(c, offer, false) : hireAccept(c, bump);
  if (R() < p) {
    if (offer) { c.salary = r1(offer.sal); c.years = offer.yrs; c.buyPct = offer.buy; c.inc = { conf: offer.incConf ? r1(c.salary * 0.1) : 0, cfp: offer.incCFP ? r1(c.salary * 0.15) : 0 }; }
    else if (bump) c.salary = r1(c.salary * 1.2);
    state.staff[role] = c; state.cands[role] = list.filter(x => x !== c); if (c.tree) treeHired(c);
    mv('boost', coachOvr(c) >= 82 ? 5 : 1); if (role === 'HC') state.meters.hot = 10;
    addNews(`${c.name} (${c.bg}) is hired as ${ROLE_TITLE[role].toLowerCase()}: ${c.years} years, $${c.salary.toFixed(1)}M per year.`, role === 'HC' ? 'big' : '');
    return 'hired';
  }
  if (offer) { c.fails = (c.fails || 0) + 1; if (c.fails >= 2) { c.declined = true; addNews(`${c.name} ended talks about the ${ROLE_TITLE[role].toLowerCase()} job.`, 'bad'); return 'declined'; } return 'counter'; }
  c.declined = true; addNews(`${c.name} turned down the ${ROLE_TITLE[role].toLowerCase()} job.`, 'bad'); return 'declined';
}
function hotSeatWeek(mg) {
  if (!mg || !mg.done || !state.staff.HC || state.staff.HC.interim) return;
  const opp = mg.h === ME ? mg.a : mg.h; const win = mg.mResult === 'W'; const h = state.meters;
  const pw = mg.pw != null ? mg.pw : 0.6;
  if (win) h.hot = clamp(h.hot - (rankOf(opp) ? 7 : Math.round(2 + 10 * (1 - pw))), 0, 100);
  else h.hot = clamp(h.hot + Math.round(2 + 12 * pw) + ((!rankOf(opp) && !isFCS(opp) && T(opp).rating < T(ME).rating - 3) ? 5 : 0) + (rivalOf(opp) ? 8 : 0) + (isFCS(opp) ? 15 : 0), 0, 100);
  if (h.hot >= 70 && !win) { addNews(`The heat is on ${state.staff.HC.name}. Fans are calling for a change and boosters want a meeting.`, 'bad'); mv('fan', -2); mv('boost', -2); }
}

/* ---------- finance levers (UI calls these; each returns true only if the value changed) ---------- */
const LEVERS = { ticket: { min: 40, max: 200, step: 5 }, revPct: { min: 40, max: 100, step: 5 }, recruit: { min: 1, max: 10, step: 0.5 }, compliance: { min: 0.5, max: 4, step: 0.5 } };
function leverValue(k) { const v = state.fin[k]; return v == null ? (k === 'compliance' ? 1 : 0) : v; }
function leverAt(k, dir) { const L = LEVERS[k]; const v = leverValue(k); return dir < 0 ? v <= L.min : v >= L.max; }
function adjustLever(k, dir) {
  const L = LEVERS[k]; const old = leverValue(k); const nv = r1(clamp(old + L.step * Math.sign(dir), L.min, L.max));
  if (nv === old) return false;
  state.fin[k] = nv; const steps = Math.round((nv - old) / L.step);
  if (k === 'ticket') state.meters.fan = clamp(state.meters.fan - steps, 0, 100);
  if (k === 'revPct') state.meters.morale = clamp(state.meters.morale + steps, 0, 100);
  return true;
}

