/* ===================== PLAYER CAREER: engine ===================== */
// Player Career mode: one player from high school (or straight into college) to the NFL Draft.
// Everything here works on `cs`, the active player career, and never touches the page.
// League data (teams, conferences, bowls, name lists) comes from data.js; drive odds reuse
// driveProbs()/rollOut() from core.js. AD mode's `state` is never read or written here.

let cs = null;

/* ---------- positions, attributes, play styles ---------- */
const CPOS = ['QB', 'RB', 'WR', 'TE', 'OL', 'CB', 'DE', 'DT', 'LB', 'S', 'K', 'P'];
const CPOS_NAME = { QB: 'Quarterback', RB: 'Running back', WR: 'Wide receiver', TE: 'Tight end', CB: 'Cornerback', DE: 'Defensive end', LB: 'Linebacker', S: 'Safety', OL: 'Offensive lineman', DT: 'Defensive tackle', K: 'Kicker', P: 'Punter' };
const cSide = pos => (['QB', 'RB', 'WR', 'TE', 'OL', 'K', 'P'].includes(pos) ? 'off' : 'def');
const cSpec = pos => pos === 'K' || pos === 'P'; /* kickers and punters: their decisions are the kicks */
const CATTR = {
  QB: [['acc', 'Accuracy'], ['dec', 'Decision-making'], ['arm', 'Arm strength'], ['pres', 'Poise under pressure'], ['mob', 'Mobility']],
  RB: [['spd', 'Speed'], ['vis', 'Vision'], ['elu', 'Elusiveness'], ['pow', 'Power'], ['bsec', 'Ball security'], ['hnd', 'Hands']],
  WR: [['rte', 'Route running'], ['hnd', 'Hands'], ['spd', 'Speed'], ['rel', 'Release'], ['ctc', 'Contested catch']],
  TE: [['hnd', 'Hands'], ['blk', 'Blocking'], ['rte', 'Route running'], ['pow', 'Strength'], ['spd', 'Speed']],
  CB: [['man', 'Man coverage'], ['spd', 'Speed'], ['zon', 'Zone coverage'], ['bsk', 'Ball skills'], ['prs', 'Press']],
  S: [['zon', 'Zone coverage'], ['tkl', 'Tackling'], ['iq', 'Play recognition'], ['spd', 'Speed'], ['bsk', 'Ball skills']],
  DE: [['rsh', 'Pass-rush moves'], ['bst', 'Burst'], ['pow', 'Strength'], ['rnd', 'Run defense'], ['tkl', 'Tackling']],
  LB: [['tkl', 'Tackling'], ['iq', 'Play recognition'], ['cov', 'Coverage'], ['spd', 'Speed'], ['blz', 'Blitzing']],
  OL: [['pbk', 'Pass blocking'], ['rbk', 'Run blocking'], ['pow', 'Strength'], ['ftw', 'Footwork'], ['awr', 'Awareness']],
  DT: [['pow', 'Strength'], ['rsh', 'Pass-rush moves'], ['rnd', 'Run defense'], ['bst', 'Burst'], ['tkl', 'Tackling']],
  K: [['kpw', 'Leg strength'], ['kac', 'Accuracy'], ['tec', 'Technique'], ['clu', 'Composure'], ['kof', 'Kickoffs']],
  P: [['ppw', 'Leg strength'], ['hng', 'Hang time'], ['pac', 'Directional punting'], ['tec', 'Technique'], ['clu', 'Composure']],
};
const CWT = {
  QB: { acc: 0.27, dec: 0.23, arm: 0.2, pres: 0.16, mob: 0.14 }, RB: { spd: 0.22, vis: 0.2, elu: 0.18, pow: 0.16, bsec: 0.12, hnd: 0.12 },
  WR: { rte: 0.24, hnd: 0.22, spd: 0.22, rel: 0.16, ctc: 0.16 }, TE: { hnd: 0.24, blk: 0.22, rte: 0.2, pow: 0.18, spd: 0.16 },
  CB: { man: 0.26, spd: 0.22, zon: 0.2, bsk: 0.16, prs: 0.16 }, S: { zon: 0.24, tkl: 0.2, iq: 0.2, spd: 0.18, bsk: 0.18 },
  DE: { rsh: 0.28, bst: 0.22, pow: 0.2, rnd: 0.18, tkl: 0.12 }, LB: { tkl: 0.24, iq: 0.24, cov: 0.18, spd: 0.18, blz: 0.16 },
  OL: { pbk: 0.26, rbk: 0.24, pow: 0.2, ftw: 0.16, awr: 0.14 }, DT: { pow: 0.26, rsh: 0.22, rnd: 0.22, bst: 0.18, tkl: 0.12 },
  K: { kac: 0.3, kpw: 0.28, tec: 0.18, clu: 0.16, kof: 0.08 }, P: { ppw: 0.3, hng: 0.24, pac: 0.22, tec: 0.14, clu: 0.1 },
};
// the attribute that helps a player read the play before the snap
const CREAD = { QB: 'dec', RB: 'vis', WR: 'rte', TE: 'rte', CB: 'bsk', S: 'iq', DE: 'rsh', LB: 'iq', OL: 'awr', DT: 'rsh', K: 'clu', P: 'clu' };
const CSTYLES = {
  QB: [['pocket', 'Pocket passer', 'Big arm, reads the field from the pocket.', { arm: 6, acc: 4, mob: -7 }], ['dual', 'Dual-threat', 'Beats you with his legs as well as his arm.', { mob: 11, arm: 1, acc: -4, pres: -2 }], ['general', 'Field general', 'Smart and unflappable. Rarely makes the costly mistake.', { dec: 7, pres: 5, arm: -5 }]],
  RB: [['power', 'Power back', 'Runs through contact and protects the ball.', { pow: 8, bsec: 5, spd: -5, elu: -3 }], ['speed', 'Speed back', 'One cut and gone.', { spd: 8, elu: 5, pow: -6 }], ['receiving', 'Receiving back', 'A weapon out of the backfield.', { hnd: 9, elu: 3, pow: -5 }]],
  WR: [['deep', 'Deep threat', 'Stretches the field vertically.', { spd: 9, rel: 3, ctc: -5 }], ['possession', 'Possession receiver', 'Sure hands and wins the 50-50 balls.', { hnd: 6, ctc: 6, spd: -6 }], ['technician', 'Route technician', 'Creates separation with precise routes.', { rte: 8, rel: 4, spd: -4 }]],
  TE: [['blocking', 'Blocking tight end', 'An extra lineman who can catch.', { blk: 9, pow: 5, spd: -6, rte: -3 }], ['receiving', 'Receiving tight end', 'A big target who creates mismatches.', { hnd: 6, rte: 5, spd: 4, blk: -7 }]],
  CB: [['lockdown', 'Lockdown corner', 'Sticks to receivers in man coverage.', { man: 8, prs: 5, zon: -4, bsk: -3 }], ['ballhawk', 'Ball hawk', 'Reads the quarterback and takes the ball away.', { bsk: 8, zon: 5, prs: -6 }], ['speed', 'Speed corner', 'Nobody runs past him.', { spd: 9, man: 2, prs: -5 }]],
  S: [['center', 'Centerfielder', 'Covers the deep middle and hunts interceptions.', { zon: 6, spd: 4, bsk: 5, tkl: -7 }], ['box', 'Box safety', 'A hard hitter who plays like a linebacker.', { tkl: 8, iq: 4, bsk: -5, zon: -3 }]],
  DE: [['speed', 'Speed rusher', 'Explodes off the edge.', { bst: 9, rsh: 4, pow: -6, rnd: -3 }], ['power', 'Power rusher', 'Walks tackles back into the quarterback.', { pow: 9, rsh: 3, bst: -6 }], ['run', 'Run stopper', 'Sets the edge and makes tackles.', { rnd: 8, tkl: 5, rsh: -5, bst: -3 }]],
  OL: [['pass', 'Pass protector', 'Keeps the quarterback clean.', { pbk: 8, ftw: 4, rbk: -5, pow: -3 }], ['mauler', 'Mauler', 'Moves people in the run game.', { rbk: 8, pow: 5, pbk: -5, ftw: -3 }], ['smart', 'Technician', 'Never misses an assignment.', { awr: 9, ftw: 3, pow: -6 }]],
  DT: [['nose', 'Nose tackle', 'Eats double teams and clogs the middle.', { pow: 9, rnd: 5, bst: -6, rsh: -3 }], ['three', 'Penetrator', 'Lives in the backfield.', { bst: 8, rsh: 5, pow: -5, rnd: -3 }]],
  K: [['big', 'Big leg', 'Fifty-plus is never out of range.', { kpw: 9, kof: 4, kac: -6 }], ['auto', 'Mr. Automatic', 'Inside 45 yards, he does not miss.', { kac: 8, clu: 4, kpw: -6 }]],
  P: [['boom', 'Boomer', 'Flips the field with distance.', { ppw: 9, hng: 2, pac: -6 }], ['pin', 'Pin-it-deep specialist', 'Drops it inside the 10.', { pac: 9, tec: 3, ppw: -6 }]],
  LB: [['run', 'Run stopper', 'Fills gaps and finishes tackles.', { tkl: 8, iq: 3, cov: -6 }], ['coverage', 'Coverage linebacker', 'Runs with backs and tight ends.', { cov: 8, spd: 4, blz: -5, tkl: -3 }], ['blitz', 'Blitzer', 'Gets after the quarterback.', { blz: 9, spd: 3, cov: -6 }]],
};
const cStyle = p => (CSTYLES[p.pos].find(s => s[0] === p.style) || CSTYLES[p.pos][0]);
function cOvr(p) { const w = CWT[p.pos]; let s = 0; for (const k in w) s += w[k] * (p.a[k] || 40); return Math.round(s); }
// skill points: each +1 costs more as the attribute climbs
function cCost(v) { return v < 50 ? 1 : v < 58 ? 2 : v < 66 ? 3 : v < 74 ? 4 : v < 82 ? 5 : v < 88 ? 6 : v < 94 ? 8 : 10; }
const CATTR_MAX = 99;

/* ---------- geography ---------- */
const CSTATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'Washington, D.C.', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
// CREGION, REGION_OF and TEAM_STATE live in data.js (shared with AD mode)

/* ---------- league reference data ---------- */
// Career mode keeps its own copy of the 2026 alignment, so an AD custom program can't change it.
const CTEAMS0 = {}; const CCONF = {};
CONF_DEFS.forEach(([cid, name, p4, cg, list]) => { CCONF[cid] = { id: cid, name, p4: !!p4, confGames: cg, teams: [] }; list.split(';').forEach(s => { const [nm, id, r] = s.split('|'); CTEAMS0[id] = { name: nm, conf: cid, base: +r }; CCONF[cid].teams.push(id); }); });
const CONF_HONOR = { B1G: 'All-Big Ten', SEC: 'All-SEC', B12: 'All-Big 12', ACC: 'All-ACC', P12: 'All-Pac-12', AAC: 'All-AAC', MW: 'All-Mountain West', SBC: 'All-Sun Belt', MAC: 'All-MAC', CUSA: 'All-Conference USA' };
const CONF_NIL = { B1G: 1.3, SEC: 1.3, B12: 0.95, ACC: 0.9, IND: 0.5, P12: 0.55, AAC: 0.5, MW: 0.45, SBC: 0.4, MAC: 0.35, CUSA: 0.35 };
// NFL_TEAMS (the 32 club names) lives in data.js with the rest of the NFL data.
const HS_PLACES = ['Lincoln', 'Jefferson', 'Westfield', 'Ridgeview', 'Cedar Creek', 'North Valley', 'Lakeside', 'Riverside', 'Oak Ridge', 'Pine Bluff', 'Stonebridge', 'Hillcrest', 'Eastbrook', 'Clearwater', 'Fairview', 'Summit', 'Bayside', 'Prairie View', 'Heritage', 'Maple Grove', 'Granite Falls', 'Willow Park', 'Brookhaven', 'Red Hill', 'Silver Lake', 'Kingsway', 'Harbor City', 'Fox Run', 'Eagle Point', 'Mill Creek'];
const HS_MASCOTS = ['Eagles', 'Tigers', 'Wildcats', 'Panthers', 'Mustangs', 'Rams', 'Titans', 'Knights', 'Hawks', 'Bulldogs', 'Warriors', 'Falcons', 'Cougars', 'Chargers', 'Raiders', 'Spartans', 'Vikings', 'Bears', 'Lions', 'Hornets', 'Trojans', 'Pirates', 'Wolves', 'Rebels'];
const HS_CLS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
const CDIFF = {
  easy: { label: 'Easy', desc: 'Faster development, friendlier recruiters and more of your snap decisions work.', xp: 1.3, dec: 0.06, star: 1.5 },
  normal: { label: 'Normal', desc: 'The intended experience.', xp: 1, dec: 0, star: 0 },
  hard: { label: 'Hard', desc: 'Slower development, tougher reads and pickier recruiters.', xp: 0.8, dec: -0.06, star: -1.5 },
};
const cdiff = () => CDIFF[(cs && cs.diff) || 'normal'];
// Updated growth (v9.47): how much stricter the NFL is on this difficulty, in rating points (Easy -2, Normal 0, Hard +2)
const cNflBar = () => (cs && cs.balV >= 2 ? 5 + ({ easy: -2, hard: 2 }[cs.diff] || 0) : 0);
const cHonorBar = () => (cs && cs.balV >= 2 ? ({ easy: -1, hard: 3 }[cs.diff] != null ? { easy: -1, hard: 3 }[cs.diff] : 1) * 0.03 : 0); /* v9.47: honors ask more, most on Hard */

/* ---------- small helpers ---------- */
// A separate, repeatable random stream for generated rosters, so names and ratings never
// have to be saved and never disturb the main random sequence.
function hrng(str) { let s = (Math.floor(hash(str) * 4294967295) >>> 0) || 1; return () => { let t = (s = (s + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hpick = (r, a) => a[Math.floor(r() * a.length)];
const cGaussOf = k => hgauss(hrng(k)); // a normal draw keyed by a string (career.js loads without features.js in some tests)
const hgauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function binom(n, p) { let k = 0; for (let i = 0; i < n; i++) if (R() < p) k++; return k; }
const cName = p => { const s = p.first + ' ' + p.last; return s.length > 44 ? s.slice(0, 43) + '…' : s; }; // a very long name from an older save is shortened on screen only (FE-16)
const cLast = n => lastName(n);
function money(x) { x = Math.round(x || 0); if (Math.abs(x) >= 1e6) return '$' + (x / 1e6).toFixed(x >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M'; if (Math.abs(x) >= 1000) return '$' + Math.round(x / 1000) + 'K'; return '$' + x; }
function interp(pts, x) { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; }
function cNews(txt, kind) { cs.news.unshift({ y: cs.year, wk: cs.week, lvl: cs.lvl, txt, kind: kind || '' }); if (cs.news.length > 120) cs.news.length = 120; }

/* ---------- stars and recruiting rankings ---------- */
// Recruit score is on the college OVR scale: roughly what the player is projected to be at
// the end of high school, nudged by production, camps and all-star invitations.
// growth still expected before the end of high school, from this point in the calendar
function growthLeft() {
  if (cs.lvl !== 'hs') return 0; const c = cs.hs.cls;
  if (cs.phase === 'hs') return [17, 11, 5.5, 0][c] + Math.max(0, 1 - (cs.week - 1) / 10) * [4, 3.5, 3, 2][c];
  return [17, 11, 5.5, 0][c];
}
function starsOf(score) { return score >= 79 ? 5 : score >= 73 ? 4 : score >= 66 ? 3 : score >= 58 ? 2 : 1; }
function compositeOf(score) { return interp([[50, 0.75], [58, 0.8], [66, 0.84], [73, 0.8900], [79, 0.9834], [86, 1]], score); }
function natRankOf(score) { return Math.max(1, Math.round(Math.exp(interp([[58, Math.log(3200)], [66, Math.log(1400)], [73, Math.log(330)], [79, Math.log(32)], [86, 0]], score)))); }
function posRankOf(score, pos) { const share = { QB: 0.055, RB: 0.06, WR: 0.13, TE: 0.045, CB: 0.1, DE: 0.08, LB: 0.08, S: 0.07, OL: 0.2, DT: 0.08, K: 0.015, P: 0.012 }[pos] || 0.08; return Math.max(1, Math.round(natRankOf(score) * share)); }
function recruitScore() {
  const p = cs.p; const r = p.rec;
  const proj = cOvr(p) + growthLeft();
  return r1(proj + (r.prod || 0) + (r.camp || 0) + (r.aa || 0) + (r.awd || 0) + cdiff().star);
}
// Transfers are rated on what they have already shown in college.
// A backup's few snaps count for little: portal interest follows starts and production (CL-B4).
function transferScore() {
  const p = cs.p; const last = p.seasons.filter(x => x.lvl === 'col').slice(-1)[0];
  const started = !!(last && last.gs >= 5 && last.gs >= Math.ceil((last.gp || 1) * 0.7));
  const lr = cs.col ? (started ? cs.col.lastRatio : cs.col.playRatio) : null;
  const pr = lr == null ? -2 : started ? clamp((lr - 1) * 6, -3, 5) : clamp((lr - 1) * 3, -3, 0) - 2;
  return r1(cOvr(p) - 5 + pr);
}
function portalStarter() { const last = cs.p.seasons.filter(x => x.lvl === 'col').slice(-1)[0]; return !!(last && last.gs >= 5); }

/* ---------- player creation ---------- */
function newPlayer(o) {
  const pos = o.pos; const st = CSTYLES[pos].find(s => s[0] === o.style) || CSTYLES[pos][0];
  const body = POS_BODY[pos]; const hIn = ri(body[0], body[1]) + (o.style === 'power' || o.style === 'blocking' ? 1 : 0);
  const p = {
    first: String(o.first == null ? '' : o.first).slice(0, 18), last: String(o.last == null ? '' : o.last).slice(0, 24), /* the form's limits, also for names that arrive another way (FE-16) */ pos, num: o.num, home: o.home, style: st[0], a: {}, ht: Math.floor(hIn / 12) + '-' + (hIn % 12), wt: ri(body[2], body[3]),
    xp: 0, trust: 50, inj: 0, injName: '', bank: 0, earned: 0, spent: 0, awards: [], seasons: [], rec: { prod: 0, camp: 0, aa: 0 }, auto: false,
  };
  const target = o.target; // average attribute level to start from
  CATTR[pos].forEach(([k]) => { p.a[k] = clamp(Math.round(target + (st[3][k] || 0) + gauss() * 2), 30, 95); });
  return p;
}
function newCareer(o) {
  // GPT-I9: a seed makes a career repeatable (tests pass one; players get a random one)
  const sd = o.seed != null && /^\d{1,10}$/.test(String(o.seed)) ? ((+o.seed >>> 0) || 1) : freshSeed(); setSeed(sd);
  cs = {
    v: 1, kind: 'career', seed: sd, hashV: 2, created: Date.now(), diff: o.diff || 'normal', pace: o.pace || 'every', year: o.world ? o.world.year : 2026, week: 1, phase: 'hs', lvl: 'hs',
    p: null, hs: null, col: null, rec: null, portal: null, off: null, news: [], ss: null, league: null, hist: [], event: null, done: null, nilLog: [], admin: 0,
  };
  const skip = o.path === 'college';
  cs.p = newPlayer({ pos: o.pos, style: o.style, first: o.first, last: o.last, num: o.num, home: o.home, target: skip ? { 1: 58, 2: 63, 3: 68.5, 4: 74, 5: 79.5 }[o.stars] : 49 });
  if (o.two) twoWayInit(cs.p); /* no random draws: a two-way player's seed plays the same games */
  // Updated balance (BAL-16): every player has a natural ceiling. Getting near it gets slow, so not everyone becomes a
  // star; some careers peak early and some keep climbing. It comes from the seed, so it never changes the random stream.
  cs.balV = 2; cs.p.ceil = clamp(Math.round(70 + (skip ? (o.stars || 3) : 3) * 2.4 + ({ easy: 3, hard: -3 }[o.diff] || 0) + cGaussOf(String(sd) + ':ceil') * 8), 62, 98); /* v9.47: lower and wider, and set by difficulty */
  cs.league = o.world && typeof cWorldLeague === 'function' ? cWorldLeague(o.world) : lgNew(2026);
  if (o.world && typeof cWorldApply === 'function') cWorldApply(o.world);
  if (skip) {
    cs.p.rec.fixed = { 1: 55, 2: 62, 3: 69.5, 4: 76, 5: 82 }[o.stars];
    cs.lvl = 'col'; cs.phase = 'sign'; cs.hsSkipped = o.stars;
    startRecruiting(true);
    cNews(`${cName(cs.p)}, a ${o.stars}-star ${CPOS_NAME[o.pos].toLowerCase()} from ${CSTATES[o.home]}, is ready to pick a college. Offers are on the Recruiting tab.`, 'big');
  } else {
    const r = hrng(sd + 'hs');
    cs.hs = { name: o.hsName || (hpick(r, HS_PLACES) + ' High'), mascot: o.hsMascot || hpick(r, HS_MASCOTS), q: r1(56 + hgauss(r) * 3), cls: 0, titles: 0, w: 0, l: 0 };
    startRecruiting(false);
    hsNewSeason();
    cNews(`${cName(cs.p)} starts his freshman year at ${cs.hs.name}. Recruiters will be watching.`, 'big');
  }
  return cs;
}

/* ---------- league (all 138 FBS teams) ---------- */
function lgNew(year) {
  const L = { year, week: 1, teams: {}, games: [], polls: [], champ: null, cfp: null, hist: [], heis: null };
  Object.entries(CTEAMS0).forEach(([id, t]) => {
    const r = t.base; const off = r1(r + gauss() * 2.5);
    L.teams[id] = { id, name: t.name, conf: t.conf, base: r, rating: r, off, def: r1(2 * r - off), elo: 1500 + (r - 70) * 12, w: 0, l: 0, cw: 0, cl: 0, pf: 0, pa: 0, ap: 0, coach: genName(), cy: ri(1, 8), need: {} };
    teamNeeds(L.teams[id]);
  });
  PRESEASON_AP.forEach((id, i) => { if (L.teams[id]) L.teams[id].elo = 1860 - i * 9; });
  Object.values(L.teams).forEach(t => { if (!PRESEASON_AP.includes(t.id)) t.elo = Math.min(t.elo, 1612 - (80 - t.rating)); });
  lgSchedule(L); lgPoll(L, 'Preseason');
  return L;
}
const CPOS_V8 = ['QB', 'RB', 'WR', 'TE', 'CB', 'DE', 'LB', 'S'];
function teamNeeds(t) { CPOS_V8.forEach(p => t.need[p] = r1(clamp(1 + gauss() * 0.3, 0.4, 1.6))); ['OL', 'DT', 'K', 'P'].forEach(p => { t.need[p] = r1(clamp(1 + (hash(t.id + ':need:' + p + ':' + (typeof cs !== 'undefined' && cs ? cs.year : 0)) - 0.5) * 0.9, 0.4, 1.6)); }); } /* the four v9.9 positions use a hash, so older seeds play out exactly as before */
const LT = id => cs.league.teams[id];
function cTeamName(id) { if (!id) return 'TBD'; if (id.startsWith('FCS:')) return id.slice(4); if (id.startsWith('HS:')) return id.slice(3); const t = cs && cs.league && cs.league.teams[id]; return t ? t.name : (CTEAMS0[id] ? CTEAMS0[id].name : id); }
const isFcsId = id => !!id && id.startsWith('FCS:');
const p4Team = id => !!CCONF[CTEAMS0[id] ? CTEAMS0[id].conf : 'MAC'].p4 || id === 'ND';
function lgSchedule(L) {
  const ids = Object.keys(L.teams); const T_ = id => L.teams[id];
  const busy = {}; ids.forEach(id => busy[id] = new Set());
  const games = []; const played = new Set(); const key = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  const homeCt = {}, cnt = {}, confCnt = {}; ids.forEach(id => { homeCt[id] = 0; cnt[id] = 0; confCnt[id] = 0; });
  let n = 0;
  const fcsFor = t => { const used = new Set(games.filter(g => g.h === t || g.a === t).map(g => g.h === t ? g.a : g.h)); const left = FCS_NAMES.filter(n => !used.has('FCS:' + n)); return 'FCS:' + pick(left.length ? left : FCS_NAMES); };
  const add = (wk, h, a, conf) => { games.push({ id: L.year + '-' + (++n), wk, h, a, conf, neutral: false, done: false, type: 'reg' }); if (!isFcsId(h)) busy[h].add(wk); if (!isFcsId(a)) busy[a].add(wk); played.add(key(h, a)); if (!isFcsId(h)) { homeCt[h]++; cnt[h]++; } if (!isFcsId(a)) cnt[a]++; };
  for (const c of Object.values(CCONF)) {
    if (!c.confGames) continue;
    const need = Math.min(c.confGames, c.teams.length - 1); let best = null;
    for (let attempt = 0; attempt < 400; attempt++) {
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
      const p4 = CCONF[T_(t).conf].p4;
      if (p4 && wk <= 3 && R() < 0.22 && !games.some(g => g.h === t && isFcsId(g.a))) { add(wk, t, fcsFor(t), false); continue; }
      const ok = x => !used.has(x) && T_(x).conf !== T_(t).conf && !played.has(key(t, x));
      const u = must.find(ok) || opt.find(ok);
      if (!u) { add(wk, t, fcsFor(t), false); continue; }
      used.add(u);
      const tr = T_(t).rating, ur = T_(u).rating;
      const h = Math.abs(tr - ur) > 8 ? (tr > ur ? t : u) : (homeCt[t] <= homeCt[u] ? t : u);
      add(wk, h, h === t ? u : t, false);
    }
  }
  L.games = games; L.gid = n;
}
function lgStrength(L, id) {
  if (isFcsId(id)) { const r = 40 + hash(id) * 14; return { off: r, def: r }; }
  const t = L.teams[id]; return { off: t.off, def: t.def };
}
// Fast drive-by-drive score for games that don't involve the player.
function fastGame(L, g, otRule, bal) {
  // bal: the Updated NFL balance (BAL-11): a team plays closer to its real strength from game to game
  const A = lgStrength(L, g.h), B = lgStrength(L, g.a); const adv = g.neutral ? 0 : bal ? 0.1 : 0.22; const nz = bal ? 1.0 : 2.4; /* talent gaps count 2.4 times as much, so the home edge is set smaller to match */ const mods = bal ? { nfl: true } : undefined;
  const F = [{ off: A.off + gauss() * nz, def: A.def + gauss() * nz }, { off: B.off + gauss() * nz, def: B.def + gauss() * nz }];
  const pts = [0, 0]; const N = ri(11, 13);
  for (let s = 0; s < 2; s++) for (let i = 0; i < N; i++) { const o = rollOut(driveProbs(F[s].off, F[1 - s].def, s === 0 ? adv : 0, false, mods)); if (o === 'td') pts[s] += R() < 0.96 ? 7 : 6; else if (o === 'fg') pts[s] += 3; }
  let ot = 0;
  if (otRule === 'nfl' || otRule === 'sudden') { // NFL games around the league follow the league's overtime rule
    let turn = 0; const first = R() < 0.5 ? 0 : 1; while ((pts[0] === pts[1] || (otRule === 'nfl' && turn === 1)) && turn < 10) { const s = (first + turn) % 2; const o = rollOut(driveProbs(F[s].off, F[1 - s].def, 0)); if (o === 'td') pts[s] += 7; else if (o === 'fg') pts[s] += 3; turn++; } if (turn) ot = 1;
  }
  while (pts[0] === pts[1] && ot < 6) { ot++; for (let s = 0; s < 2; s++) { const o = rollOut(driveProbs(F[s].off, F[1 - s].def, 0, true), true); if (o === 'td') pts[s] += ot >= 3 ? 2 : 7; else if (o === 'fg' && ot < 3) pts[s] += 3; } }
  if (pts[0] === pts[1]) pts[R() < 0.5 ? 0 : 1] += 2;
  g.hs = pts[0]; g.as = pts[1]; g.ot = ot;
}
function lgApply(L, g) {
  g.done = true; const H = L.teams[g.h], A = L.teams[g.a]; const hw = g.hs > g.as;
  const upd = (t, us, them, win, oppElo) => {
    if (!t) return; t.pf += us; t.pa += them; if (win) t.w++; else t.l++;
    if (g.conf) { if (win) t.cw++; else t.cl++; }
    const exp = 1 / (1 + Math.pow(10, (oppElo - t.elo) / 400)); const mov = Math.log(Math.abs(us - them) + 1) * 0.9;
    t.elo += 26 * mov * ((win ? 1 : 0) - exp);
  };
  const he = H ? H.elo : 1180 + hash(g.h) * 120, ae = A ? A.elo : 1180 + hash(g.a) * 120;
  upd(H, g.hs, g.as, hw, ae); upd(A, g.as, g.hs, !hw, he);
}
function lgPoll(L, label) {
  const sc = t => t.elo + (CCONF[t.conf].p4 || t.id === 'ND' ? 0 : -45) - t.l * 30;
  const list = Object.values(L.teams).sort((a, b) => sc(b) - sc(a));
  list.forEach(t => t.ap = 0); list.slice(0, 25).forEach((t, i) => t.ap = i + 1);
  L.polls.push({ label, top: list.slice(0, 25).map(t => t.id) }); if (L.polls.length > 24) L.polls.shift();
}
function lgStandings(L, cid) {
  return CCONF[cid].teams.map(id => L.teams[id]).sort((a, b) => ((b.cw - b.cl) - (a.cw - a.cl)) || ((b.w - b.l) - (a.w - a.l)) || (b.elo - a.elo));
}
function lgNewGame(L, wk, h, a, o) { return Object.assign({ id: L.year + '-' + (++L.gid), wk, h, a, done: false, neutral: true, type: 'post' }, o || {}); }
// Sims every game this week except the player's own (handled by the game engine).
function lgSimWeek(L, wk, skipId) {
  L.games.filter(g => g.wk === wk && !g.done && g.id !== skipId).forEach(g => { fastGame(L, g); lgApply(L, g); });
}
function lgAfterWeek(L, wk) {
  if (wk <= 13) lgPoll(L, 'Week ' + (wk + 1));
  if (wk === 13) lgSetupCCG(L);
  if (wk === 14) { lgPoll(L, 'Final regular season'); lgSetupCFP(L); }
  if (wk >= 15 && wk <= 17) lgNextRound(L, wk);
  if (wk === 18) { const f = L.games.find(g => g.round === 4); if (f && f.done) L.champ = f.hs > f.as ? f.h : f.a; lgPoll(L, 'Final'); }
  L.week = wk + 1;
}
function lgSetupCCG(L) {
  Object.values(CCONF).forEach(c => { if (!c.confGames) return; const st = lgStandings(L, c.id); const [a, b] = st; if (!a || !b) return; L.games.push(lgNewGame(L, 14, a.id, b.id, { type: 'ccg', name: c.name + ' Championship', conf: false, cid: c.id })); });
}
function lgSetupCFP(L) {
  const champs = new Set(L.games.filter(g => g.type === 'ccg' && g.done).map(g => g.hs > g.as ? g.h : g.a));
  const ranked = Object.values(L.teams).filter(t => t.ap).sort((a, b) => a.ap - b.ap).map(t => t.id);
  const all = Object.values(L.teams).sort((a, b) => (a.ap || 99) - (b.ap || 99) || b.elo - a.elo).map(t => t.id);
  const auto = all.filter(id => champs.has(id)).slice(0, 5);
  const field = new Set(auto); for (const id of all) { if (field.size >= 12) break; field.add(id); }
  const seeds = [...field].sort((a, b) => all.indexOf(a) - all.indexOf(b));
  L.cfp = { seeds, champs: [...champs] };
  const pair = [[5, 12], [6, 11], [7, 10], [8, 9]];
  pair.forEach(([x, y], i) => L.games.push(lgNewGame(L, 15, seeds[x - 1], seeds[y - 1], { type: 'cfp', round: 1, slot: i, neutral: false, name: 'CFP First Round' })));
  // bowls for everyone else with six wins
  const eligible = all.filter(id => !field.has(id) && L.teams[id].w >= 6);
  const bowls = BOWLS.slice(0, Math.floor(eligible.length / 2));
  bowls.forEach((b, i) => { const h = eligible[i * 2], a = eligible[i * 2 + 1]; if (h && a) L.games.push(lgNewGame(L, 16, h, a, { type: 'bowl', name: b })); });
  void ranked;
}
function lgNextRound(L, wk) {
  const S = L.cfp.seeds; const win = g => g.hs > g.as ? g.h : g.a;
  if (wk === 15) { const r1g = L.games.filter(g => g.round === 1).sort((a, b) => a.slot - b.slot); [[0, 3], [1, 2], [2, 1], [3, 0]].forEach(([top, i], k) => L.games.push(lgNewGame(L, 16, S[top], win(r1g[i]), { type: 'cfp', round: 2, slot: k, name: QF_NAMES[k] }))); }
  if (wk === 16) { const q = L.games.filter(g => g.round === 2).sort((a, b) => a.slot - b.slot); [[0, 3], [1, 2]].forEach(([i, j], k) => L.games.push(lgNewGame(L, 17, win(q[i]), win(q[j]), { type: 'cfp', round: 3, slot: k, name: SF_NAMES[k] }))); }
  if (wk === 17) { const s = L.games.filter(g => g.round === 3); L.games.push(lgNewGame(L, 18, win(s[0]), win(s[1]), { type: 'cfp', round: 4, slot: 0, name: 'CFP National Championship' })); }
}
function lgFinishSeason(L) { for (let wk = L.week; wk <= 18; wk++) { lgSimWeek(L, wk, null); lgAfterWeek(L, wk); } }
// Next season: ratings drift, coaches come and go, a new schedule is drawn.
function lgRollover(L) {
  const top = Object.values(L.teams).filter(t => t.ap).sort((a, b) => a.ap - b.ap);
  L.hist.unshift({ year: L.year, champ: L.champ, top: top.slice(0, 10).map(t => [t.id, t.w + '-' + t.l]), heis: L.heis });
  if (L.hist.length > 40) L.hist.length = 40;
  const changes = [];
  Object.values(L.teams).forEach(t => {
    const expW = 6 + (t.rating - 68) / 4;
    t.rating = r1(clamp(t.rating + (t.base - t.rating) * 0.3 + gauss() * 2.6 + clamp(t.w - expW, -4, 4) * 0.35, 38, 96));
    const off = r1(t.rating + gauss() * 2.5); t.off = off; t.def = r1(2 * t.rating - off);
    // coaching carousel
    let fired = false, left = false;
    if (t.cy >= 2 && t.w < expW - 3 && R() < 0.55) fired = true;
    else if (!CCONF[t.conf].p4 && t.w >= 10 && R() < 0.35) left = true;
    else if (R() < 0.03) left = true;
    if (fired || left) { const old = t.coach; t.coach = genName(); t.cy = 0; changes.push({ id: t.id, old, now: t.coach, why: fired ? 'fired' : 'left' }); }
    t.cy++; teamNeeds(t);
    t.w = t.l = t.cw = t.cl = t.pf = t.pa = 0; t.ap = 0;
    t.elo = 0.45 * t.elo + 0.55 * (1500 + (t.rating - 70) * 12);
  });
  L.year++; L.week = 1; L.champ = null; L.cfp = null; L.polls = []; L.heis = null;
  lgSchedule(L); lgPoll(L, 'Preseason');
  return changes;
}

/* ---------- generated rosters ---------- */
// Every team's roster is rebuilt on demand from the career seed, so it costs nothing to save.
// A player keeps his name and development path from season to season.
const CPOS_ALL = ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P'];
const CLASS_MIX = { QB: 1.1, RB: 1.6, WR: 3, TE: 1.3, OL: 4.2, DE: 2, DT: 2, LB: 2.2, CB: 2.2, S: 2, K: 0.3, P: 0.3 };
const START_N = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DE: 2, DT: 2, LB: 3, CB: 2, S: 2, K: 1, P: 1 };
const rosterCache = new Map();
function teamLevel(tid) { const t = cs.league.teams[tid]; return t ? t.base * 0.6 + t.rating * 0.4 : 55; }
// a team rating on the player OVR scale: roughly what its starters are rated
const starterLvl = r => 60 + (r - 60) * 0.7;
function genClass(tid, cy) {
  const r = hrng(cs.seed + ':' + tid + ':' + cy); const lvl = starterLvl(CTEAMS0[tid] ? CTEAMS0[tid].base : 60); const out = [];
  CPOS_ALL.forEach(pos => {
    let n = Math.floor(CLASS_MIX[pos]) + (r() < CLASS_MIX[pos] % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const start = lvl - 9.5 + hgauss(r) * 4.2 + (r() < 0.06 ? 5 : 0); const grow = 3.4 + hgauss(r) * 0.9;
      const stay5 = r() < 0.3; const leaveAt = r() < 0.2 ? 1 + Math.floor(r() * 3) : 9;
      out.push({ id: tid + cy + pos + i, n: hpick(r, FIRST) + ' ' + hpick(r, LAST), pos, cy, start, grow, stay5, leaveAt, num: 1 + Math.floor(r() * 99) });
    }
  });
  return out;
}
function teamRoster(tid, year) {
  const key = tid + '@' + year + '@' + cs.seed; if (rosterCache.has(key)) return rosterCache.get(key);
  const adj = cs.league.teams[tid] ? (cs.league.teams[tid].rating - cs.league.teams[tid].base) * 0.35 : 0;
  const list = [];
  for (let cy = year - 4; cy <= year; cy++) {
    const k = year - cy;
    genClass(tid, cy).forEach(pl => {
      if (k >= pl.leaveAt) return; if (k === 4 && !pl.stay5) return;
      list.push({ id: pl.id, n: pl.n, pos: pl.pos, num: pl.num, cls: ['Fr', 'So', 'Jr', 'Sr', 'Gr'][k], ovr: Math.round(clamp(pl.start + pl.grow * k + adj, 38, 97)) });
    });
  }
  list.sort((a, b) => b.ovr - a.ovr);
  if (rosterCache.size > 400) rosterCache.clear();
  rosterCache.set(key, list); return list;
}
// High school teammates at the player's position (plus a few names for play-by-play).
function hsRoster(year) {
  const r = hrng(cs.seed + ':hs:' + year); const out = [];
  ['QB', 'RB', 'WR', 'WR', 'WR', 'TE', 'DE', 'DE', 'LB', 'LB', 'LB', 'CB', 'CB', 'S', 'S'].forEach((pos, i) => {
    for (let j = 0; j < 2; j++) { const c = Math.floor(r() * 4); out.push({ id: 'h' + year + i + j, n: hpick(r, FIRST) + ' ' + hpick(r, LAST), pos, cls: ['Fr', 'So', 'Jr', 'Sr'][c], ovr: Math.round(clamp(cs.hs.q - 9 + c * 3.5 + hgauss(r) * 4.5, 35, 72)) }); }
  });
  return out.sort((a, b) => b.ovr - a.ovr);
}
function mateName(pos, i) {
  const list = cs.lvl === 'hs' ? hsRoster(cs.year) : cs.lvl === 'nfl' ? nflRoster(cs.nfl.tm, cs.year) : teamRoster(cs.col.tid, cs.year);
  const m = list.filter(x => x.pos === pos && !(pos === cs.p.pos && x.me)); const x = m[Math.min(i || 0, m.length - 1)];
  return x ? x.n : genName();
}
function oppName(tid, pos) {
  if (cs.lvl === 'nfl' && NFL_BY[tid]) { const m = nflRoster(tid, cs.year).filter(x => x.pos === pos); return m.length ? m[0].n : genName(); }
  if (cs.lvl === 'hs' || !tid || isFcsId(tid) || !cs.league.teams[tid]) { const r = hrng(cs.seed + ':' + tid + ':' + pos + cs.year); return hpick(r, FIRST) + ' ' + hpick(r, LAST); }
  const m = teamRoster(tid, cs.year).filter(x => x.pos === pos); return m.length ? m[0].n : genName();
}

/* ---------- depth chart and playing time ---------- */
const ROT_SHARE = { QB: [1, 0.04], RB: [1, 0.45, 0.12], WR: [1, 1, 1, 0.35, 0.1], TE: [1, 0.35, 0.08], CB: [1, 1, 0.55, 0.1], S: [1, 1, 0.25, 0.08], DE: [1, 1, 0.4, 0.3, 0.08], LB: [1, 1, 1, 0.25, 0.08], OL: [1, 1, 1, 1, 1, 0.12, 0.06], DT: [1, 1, 0.45, 0.3, 0.08], K: [1, 0], P: [1, 0] };
function depthScore() { const p = cs.p; return cOvr(p) + (cs.lvl === 'col' || cs.lvl === 'nfl' ? (p.trust - 50) * 0.1 : 0) + (cs.lvl === 'nfl' ? nflDraftCapital() : 0) + (typeof cxBattleBonus === 'function' ? cxBattleBonus() : 0); }
function myDepth() {
  const p = cs.p; const pos = p.pos;
  const mates = (cs.lvl === 'hs' ? hsRoster(cs.year) : cs.lvl === 'nfl' ? nflRoster(cs.nfl.tm, cs.year) : teamRoster(cs.col.tid, cs.year)).filter(x => x.pos === pos);
  const me = { id: 'me', n: cName(p), pos, cls: cs.lvl === 'hs' ? ['Fr', 'So', 'Jr', 'Sr'][cs.hs.cls] : cs.lvl === 'nfl' ? nflYearLabel() : colCls(), ovr: cOvr(p), me: true, sc: depthScore() };
  const all = mates.map(m => Object.assign({ sc: m.ovr + (cs.lvl === 'nfl' ? (m.exp >= 3 ? 0.6 : 0) : ({ Sr: 0.6, Gr: 0.8, Jr: 0.3 }[m.cls] || 0)) }, m)).concat([me]).sort((a, b) => b.sc - a.sc);
  const rank = all.findIndex(x => x.me);
  return { all, rank, me };
}
function myShare() {
  const p = cs.p; if (p.inj > 0) return 0;
  if (cs.lvl === 'nfl' && cs.nfl && cs.nfl.ps) return 0; /* on the practice squad (v9.47) */
  if (cs.lvl === 'col' && cs.acad && cs.acad.susp > 0) return 0; /* academically ineligible */
  if (cs.lvl === 'col' && cs.col.rs && cs.ss.gp >= 4) return 0;
  const d = myDepth(); const s = ROT_SHARE[p.pos][d.rank];
  return s != null ? s : 0.04;
}
// BAL-16: "Updated" growth (ceilings, uneven years, rarer honors) or "Generous" (the feel from before v9.28).
// Careers made before v9.28 start as Generous; switching one to Updated gives it a ceiling at least its current OVR.
function cSetGrowth(v) {
  if (!cs || !cs.p) return false; if (v === 'gen') { cs.balV = 1; return true; } if (v !== 'upd') return false;
  cs.balV = 2; if (!cs.p.ceil) cs.p.ceil = Math.max(cOvr(cs.p), clamp(Math.round(74 + (cs.hsSkipped || 3) * 2.4 + cGaussOf(String(cs.seed) + ':ceil') * 7), 66, 98)); return true;
}
// QOL-10: what the offseason changed (marked when the offseason starts, shown until two weeks into the next season)
function cChgMark() { const p = cs.p; cs.chg = { y: cs.year, ovr: cOvr(p), a: Object.assign({}, p.a), trust: p.trust, bank: p.bank || 0, lvl: cs.lvl, tm: cs.nfl ? cs.nfl.tm : cs.col ? cs.col.tid : null }; }
function cChanges() {
  const c = cs.chg; if (!c || !cs.p) return null; const p = cs.p; const tm = cs.nfl ? cs.nfl.tm : cs.col ? cs.col.tid : null;
  const attrs = (CATTR[p.pos] || []).map(([k, l]) => [l, (p.a[k] || 0) - (c.a[k] != null ? c.a[k] : p.a[k] || 0)]).filter(x => x[1]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
  return { y: c.y, ovr: [c.ovr, cOvr(p)], attrs, trust: (p.trust || 0) - (c.trust || 0), bank: (p.bank || 0) - (c.bank || 0), moved: c.lvl !== cs.lvl || (c.tm && tm && c.tm !== tm), tm, lvl: cs.lvl };
}
// BAL-17: why you are where you are on the depth chart, part by part, and what it takes to move up
function playWhy() {
  const p = cs.p; const d = myDepth(); const n = START_N[p.pos] || 1; const lines = [];
  const trust = cs.lvl === 'col' || cs.lvl === 'nfl' ? r1((p.trust - 50) * 0.1) : 0; const cap = cs.lvl === 'nfl' ? nflDraftCapital() : 0; const bt = typeof cxBattleBonus === 'function' ? r1(cxBattleBonus()) : 0;
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
  lines.push(['Skill', `OVR ${cOvr(p)}`]);
  if (cs.lvl !== 'hs') lines.push(['Coach trust', trust ? `${sg(trust)} (trust ${p.trust})` : `even (trust ${p.trust})`]);
  if (cap) lines.push(['Draft position', `${sg(cap)} this year and next`]);
  if (bt) lines.push(['Camp battle', sg(bt)]);
  lines.push(['Experience', cs.lvl === 'nfl' ? 'veterans with 3+ seasons get +0.6' : cs.lvl === 'col' ? 'juniors +0.3, seniors +0.6, graduate students +0.8' : 'none at this level']);
  let elig = 'Eligible'; if (p.inj > 0) elig = `Injured (${p.inj} wk)`; else if (cs.lvl === 'col' && cs.acad && cs.acad.susp > 0) elig = 'Academically ineligible'; else if (cs.lvl === 'col' && cs.col && cs.col.rs) elig = 'Redshirting (4 games at most)';
  lines.push(['Eligibility', elig]);
  const meSc = d.me.sc; let next = '';
  if (d.rank >= n) { const last = d.all[n - 1]; const gap = r1(last.sc - meSc + 0.1); next = `You need about ${gap} more points to pass ${last.n} for a starting job. A point of OVR or ten points of trust each count as one.`; }
  else { const behind = d.all[n]; next = behind ? `You lead ${behind.n} for your spot by ${r1(meSc - behind.sc)} points.` : 'No one is close behind you.'; }
  if (d.rank >= n && ROT_SHARE[p.pos] && (ROT_SHARE[p.pos][d.rank] || 0) >= 0.3) next += ' You still play a real share of snaps in the rotation.';
  else if (d.rank >= n) next += ' Backups get in when a starter is hurt, and good practice weeks raise trust.';
  return { lines, next };
}
function playWhyHTML() { try { const w = playWhy(); return `<details class="mt"><summary class="small"><b>Why this spot?</b></summary><table class="tbl small"><tbody>${w.lines.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table><p class="small">${esc(w.next)}</p></details>`; } catch (e) { return ''; } }
function roleOf(share) { return share >= 0.9 ? 'Starter' : share >= 0.3 ? 'Rotation' : share > 0 ? 'Backup' : 'Not playing'; }
function colCls() { const c = cs.col; if (!c) return ''; const yrs = c.years; const lbl = ['Fr', 'So', 'Jr', 'Sr', 'Sr'][Math.min(4, c.seasons)]; return (c.rsYear && c.years > c.seasons ? 'RS-' : '') + lbl + (yrs >= 5 ? ' (5th yr)' : ''); }

/* ---------- NIL ---------- */
function nilBase(stars) { return Math.exp(interp([[1, Math.log(3000)], [2, Math.log(15000)], [3, Math.log(60000)], [4, Math.log(230000)], [5, Math.log(480000)], [5.6, Math.log(700000)]], stars)); }
const NIL_POS = { QB: 2.6, WR: 1.1, DE: 1.2, CB: 1.05, RB: 0.9, S: 0.8, LB: 0.85, TE: 0.8, OL: 0.75, DT: 0.9, K: 0.35, P: 0.3 };
function schoolMoney(tid) { const t = cs.league.teams[tid]; const r = t ? t.rating : 55; const cm = tid === 'ND' ? 1.2 : CONF_NIL[CTEAMS0[tid].conf] || 0.4; return cm * clamp(0.7 + (r - 55) / 50, 0.6, 1.5); }
function nilOffer(tid, starsF, interest) {
  const j = 0.9 + hash(cs.seed + tid + cs.year + 'nil') * 0.2;
  const v = nilBase(Math.min(5.15, starsF)) * NIL_POS[cs.p.pos] * schoolMoney(tid) * (0.8 + clamp(interest, 0, 100) * 0.003) * j;
  return v < 2000 ? Math.round(v / 250) * 250 : v < 100000 ? Math.round(v / 1000) * 1000 : Math.round(v / 5000) * 5000;
}
const starsFloat = score => clamp(interp([[50, 0.6], [58, 2], [66, 3], [73, 4], [79, 5], [86, 5.6]], score), 0.6, 5.6);

/* ---------- recruiting (high school and the skip-to-college path) ---------- */
// Each school: interest 0-100 in the player, whether it has offered, its NIL offer and visits.
function teamTarget(tid) { return 60 + (teamLevel(tid) - 45) * 0.45; }
function startRecruiting(quick) {
  cs.rec = { schools: {}, committed: null, signed: null, visits: 0, offVisits: 0, visitLog: [], quick: !!quick, pulled: [] };
  Object.keys(cs.league.teams).forEach(id => cs.rec.schools[id] = { i: 0, off: false, nil: 0, v: 0, fav: false });
  if (quick) { cs.p.rec.score = cs.p.rec.fixed; cs.p.stars = starsOf(cs.p.rec.fixed); recruitTick('quick'); }
}
function proximity(tid) { const st = TEAM_STATE[tid]; const h = cs.p.home; return st === h ? 16 : REGION_OF[st] === REGION_OF[h] ? 7 : 0; }
function schoolInterest(tid, score) {
  const s = cs.rec.schools[tid]; const t = cs.league.teams[tid]; const T = teamTarget(tid);
  const fit = score - T; let i = 50 + clamp(fit, -12, 6) * 5 - Math.max(0, fit - 10) * 2;
  i += proximity(tid) + ((t.need[cs.p.pos] || 1) - 1) * 14 + s.v * 12 + (cs.rec.committed === tid ? 15 : 0) + (s.bump || 0);
  return Math.round(clamp(i, 0, 100));
}
// A school offers players in its range. Far better players get the odd long-shot offer,
// mostly from schools close to home.
function canOffer(tid, score) { const gap = score - teamTarget(tid); return gap >= -4 - (cs.rec.schools[tid].v ? 2 : 0) && gap < 22; }
function fitWeight(tid, score) { const gap = score - teamTarget(tid); const w = gap < -4 ? 0 : gap < 0 ? 0.7 : gap <= 6 ? 1 : gap <= 10 ? 0.3 : gap <= 15 ? 0.08 : 0.02; return w * (proximity(tid) ? 2 : 1); }
// how many offers a prospect of this level ends up with, and how far along the calendar is
const offerTarget = score => interp([[52, 2], [58, 4], [66, 10], [73, 20], [79, 32], [86, 42]], score);
function offerTimeline(when) {
  if (when === 'quick') return 1; if (cs.lvl !== 'hs') return 1; const c = cs.hs.cls;
  const w = cs.phase === 'hs' ? Math.min(1, (cs.week - 1) / 10) : 1;
  return [[0, 0.06], [0.08, 0.25], [0.3, 0.7], [0.75, 1]][c].reduce((a, b, k) => k ? a + (b - a) * w : a, 0);
}
function recruitTick(when) {
  const p = cs.p; const score = cs.p.rec.fixed != null ? cs.p.rec.fixed : recruitScore(); p.rec.score = score;
  const sf = starsFloat(score); const out = []; const S = cs.rec.schools; const weekly = when === 'week';
  Object.keys(S).forEach(tid => {
    const s = S[tid]; s.i = schoolInterest(tid, score);
    if (s.off) {
      s.nil = Math.max(s.nil, nilOffer(tid, sf, s.i));
      // a school can move on if the player falls well below what it needs, or it fills the spot
      if (cs.rec.committed !== tid && !cs.rec.signed && (score < teamTarget(tid) - 8 || (weekly && s.i < 40 && R() < 0.01))) { s.off = false; s.nil = 0; cs.rec.pulled.push(tid); out.push(['pulled', tid]); }
    }
  });
  const minFr = score >= 75 ? 1 : 0;
  const want = Math.round(offerTarget(score) * (cs.lvl === 'hs' && cs.hs.cls === 0 && !minFr ? 0 : offerTimeline(when)));
  let have = Object.values(S).filter(s => s.off).length;
  const pool = Object.keys(S).filter(tid => !S[tid].off && canOffer(tid, score) && !cs.rec.pulled.includes(tid)).map(tid => [tid, fitWeight(tid, score) * (0.3 + S[tid].i / 100)]).filter(x => x[1] > 0);
  let guard = 0;
  while (have < want && pool.length && guard++ < 80) {
    const tid = wpick(pool); const k = pool.findIndex(x => x[0] === tid); pool.splice(k, 1);
    if (weekly && R() < 0.5) continue;
    S[tid].off = true; S[tid].nil = nilOffer(tid, sf, S[tid].i); have++; out.push(['offer', tid]);
  }
  // nobody reaches signing day without a place to play
  if ((when === 'quick' || (cs.lvl === 'hs' && cs.hs.cls >= 3 && (cs.phase === 'hsoff' || when === 'off'))) && have < 3) {
    Object.keys(S).filter(t => !S[t].off).sort((a, b) => Math.abs(teamTarget(a) - score - 2) - Math.abs(teamTarget(b) - score - 2) || proximity(b) - proximity(a)).slice(0, 3 - have).forEach(tid => { S[tid].off = true; S[tid].nil = nilOffer(tid, sf, Math.max(45, S[tid].i)); out.push(['offer', tid]); });
  }
  const c = cs.rec.committed;
  if (c && !S[c].off) { cs.rec.committed = null; out.push(['decommitted', c]); }
  return out;
}
function offersList() { return Object.entries(cs.rec.schools).filter(([, s]) => s.off).map(([id, s]) => Object.assign({ id }, s)).sort((a, b) => b.i - a.i || teamLevel(b.id) - teamLevel(a.id)); }
// how the depth chart at a school looks for the player's first year there
function depthOutlook(tid, year, ovrThen) {
  const r = teamRoster(tid, year).filter(x => x.pos === cs.p.pos).map(x => x.ovr + ({ Sr: 0.6, Gr: 0.8, Jr: 0.3 }[x.cls] || 0)).sort((a, b) => b - a);
  const n = START_N[cs.p.pos]; const cut = r[n - 1] || 0; const ahead = r.filter(v => v > ovrThen).length;
  // a true freshman has to clearly beat the incumbents to start (CL-B4)
  const fr = cs.lvl === 'hs' || !cs.col ? 3 : 0;
  if (ovrThen >= cut + 1 + fr && (!fr || ovrThen >= 64)) return { k: 'start', txt: 'Could start right away', ahead }; // and only a solid recruit (about 3 stars and up)
  if (ovrThen >= cut - 3 + fr) return { k: 'compete', txt: 'Competes for a starting job', ahead };
  if (ovrThen >= cut - 8) return { k: 'rotate', txt: 'Rotation or backup at first', ahead };
  return { k: 'deep', txt: 'Deep depth chart, likely redshirt', ahead };
}
function projOvrAtCollege() { return cs.lvl === 'hs' ? cOvr(cs.p) + growthLeft() * 0.9 : cOvr(cs.p); }
const MAX_UNOFFICIAL = 3, MAX_OFFICIAL = 5;
// Visits from the junior-year offseason on are official ones.
function canVisitKind() { return cs.lvl !== 'hs' || cs.hs.cls >= 3 || (cs.phase === 'hsoff' && cs.hs.cls >= 2) ? 'official' : 'unofficial'; }
function canVisit(tid) {
  const s = cs.rec.schools[tid]; if (!s) return 'unknown';
  if (cs.portal) return 'portal'; if (cs.rec.signed) return 'signed';
  if (s.v >= 2) return 'done';
  const hs = cs.lvl === 'hs';
  const official = canVisitKind() === 'official';
  if (hs && cs.phase === 'hs' && !official) return 'season';
  // one official visit per school (an unofficial one may come first)
  if (official) return s.ov ? 'done' : cs.rec.offVisits >= MAX_OFFICIAL ? 'limit' : 'official';
  return (cs.rec.uv && cs.rec.uv.y === cs.year ? cs.rec.uv.n : 0) >= MAX_UNOFFICIAL ? 'limit' : 'unofficial';
}
function doVisit(tid) {
  const k = canVisit(tid); if (k !== 'official' && k !== 'unofficial') return null;
  const s = cs.rec.schools[tid]; s.v++; if (k === 'official') { cs.rec.offVisits++; s.ov = true; } else { if (!cs.rec.uv || cs.rec.uv.y !== cs.year) cs.rec.uv = { y: cs.year, n: 0 }; cs.rec.uv.n++; }
  const t = cs.league.teams[tid]; const score = cs.p.rec.score;
  s.i = schoolInterest(tid, score); const before = s.off;
  if (!s.off && canOffer(tid, score) && s.i >= 45 && R() < 0.35 + s.i / 250) { s.off = true; }
  if (s.off) s.nil = Math.round(Math.max(s.nil, nilOffer(tid, starsFloat(score), s.i)) * 1.08 / 1000) * 1000 || s.nil;
  const d = depthOutlook(tid, cs.lvl === 'hs' ? cs.year + (4 - cs.hs.cls) : cs.year + 1, projOvrAtCollege());
  const rep = { tid, kind: k, year: cs.year, offer: s.off && !before, coach: t.coach, rec: t.w + '-' + t.l, depth: d.txt, nil: s.off ? s.nil : 0 };
  cs.rec.visitLog.unshift(rep);
  cNews(`${k === 'official' ? 'Official' : 'Unofficial'} visit to ${t.name}.${rep.offer ? ' They offered a scholarship on the spot.' : ''}`, rep.offer ? 'win' : '');
  return rep;
}
function commitTo(tid) {
  const s = cs.rec.schools[tid]; if (!s || !s.off || cs.rec.signed) return false;
  const prev = cs.rec.committed; if (prev === tid) return false;
  if (prev) { cs.rec.schools[prev].bump = (cs.rec.schools[prev].bump || 0) - 20; cNews(`${cName(cs.p)} backs out of his commitment to ${cTeamName(prev)}.`, 'bad'); }
  cs.rec.committed = tid; s.i = schoolInterest(tid, cs.p.rec.score);
  cNews(`${cName(cs.p)} commits to ${cTeamName(tid)}${s.nil ? ' (NIL: ' + money(s.nil) + ' a year)' : ''}.`, 'big');
  return true;
}
function decommit() { const c = cs.rec.committed; if (!c || cs.rec.signed) return false; cs.rec.committed = null; cs.rec.schools[c].bump = (cs.rec.schools[c].bump || 0) - 20; cNews(`${cName(cs.p)} decommits from ${cTeamName(c)} and reopens his recruitment.`, 'bad'); return true; }
// Ask a school for more NIL money. It works more often when the school is very interested,
// but pushing too hard costs interest.
function negotiate(tid) {
  const s = cs.rec.schools[tid]; if (!s || !s.off || s.asked >= 2) return null;
  s.asked = (s.asked || 0) + 1;
  const pOk = clamp(0.2 + (s.i - 50) / 80 - (s.asked - 1) * 0.15, 0.08, 0.8);
  if (R() < pOk) { const raise = Math.round(s.nil * (0.1 + R() * 0.15) / 1000) * 1000 || 500; s.nil += raise; return { ok: true, raise }; }
  s.bump = (s.bump || 0) - 6; s.i = Math.max(0, s.i - 6); return { ok: false };
}

/* ---------- high school ---------- */
function hsNewSeason() {
  const h = cs.hs; const r = hrng(cs.seed + ':hsyr:' + cs.year);
  h.teamQ = r1(h.q + hgauss(r) * 3); h.w = 0; h.l = 0; h.po = null;
  const used = new Set(); const opp = () => { let n; do n = hpick(r, HS_PLACES) + ' ' + hpick(r, HS_MASCOTS); while (used.has(n) || n.startsWith(h.name.replace(' High', ''))); used.add(n); return n; };
  h.sched = [];
  for (let wk = 1; wk <= 10; wk++) h.sched.push({ wk, opp: opp(), oq: r1(clamp(h.q - 2 + hgauss(r) * 5, 42, 72)), home: wk % 2 === 1, done: false, type: wk >= 8 ? 'district' : 'reg' });
  // spotlight: the three toughest regular-season games plus any playoff games
  h.sched.slice().sort((a, b) => b.oq - a.oq).slice(0, 3).forEach(g => g.big = true);
  cs.week = 1; cs.phase = 'hs'; cs.ss = newSS(); cs.p.inj = 0; cs.p.injName = ''; cs.p.injFresh = false;
  if (cs.league.week > 1 || cs.league.year !== cs.year) { /* league already aligned by rollover */ }
}
function newSS() { return { gp: 0, gs: 0, st: {}, games: [], ratios: [] }; }
function hsGameThisWeek() { return cs.phase === 'hs' ? cs.hs.sched.find(g => g.wk === cs.week && !g.done) : null; }
function hsAfterGame() {
  const h = cs.hs;
  if (cs.week === 10) {
    const qual = h.w >= 7 || (h.w === 6 && R() < 0.5);
    if (qual) { h.po = { round: 1 }; hsAddPlayoff(11, 1); cNews(`${h.name} (${h.w}-${h.l}) makes the state playoffs.`, 'win'); }
    else cNews(`${h.name} finishes ${h.w}-${h.l} and misses the playoffs.`);
  } else if (h.po && cs.week >= 11) {
    const g = h.sched.find(x => x.wk === cs.week); const won = g.us > g.them;
    if (won && h.po.round < 4) { h.po.round++; hsAddPlayoff(cs.week + 1, h.po.round); }
    else if (won) { h.titles++; h.po.champ = true; cs.p.awards.push({ y: cs.year, lvl: 'hs', a: 'State champion' }); cNews(`${h.name} wins the state championship!`, 'big'); }
    else h.po.out = true;
  }
}
function hsAddPlayoff(wk, round) {
  const r = hrng(cs.seed + ':po:' + cs.year + round); const nm = ['State playoffs, first round', 'State quarterfinal', 'State semifinal', 'State championship'][round - 1];
  cs.hs.sched.push({ wk, opp: hpick(r, HS_PLACES) + ' ' + hpick(r, HS_MASCOTS), oq: r1(clamp(cs.hs.q + round * 2.2 + hgauss(r) * 3, 48, 76)), home: round < 4 && R() < 0.5, neutral: round === 4, done: false, type: 'playoff', name: nm, big: true });
}
function hsSeasonOver() { const h = cs.hs; return cs.week > 10 && (!h.po || h.po.out || h.po.champ) && !hsGameThisWeek(); }

/* ---------- college ---------- */
function enrollCollege(tid) {
  const s = cs.rec.schools[tid];
  cs.col = { tid, years: 1, seasons: 0, rsYear: false, rs: false, trust0: 50, lastRatio: null, gs: 0, teams: [tid], nil: s ? s.nil : 0, coach: cs.league.teams[tid].coach, transfers: 0 };
  cs.rec.signed = tid; cs.lvl = 'col'; cs.p.trust = 50 + (cs.p.stars >= 5 ? 6 : cs.p.stars >= 4 ? 3 : 0);
  cs.p.stars0 = cs.p.stars; cs.p.score0 = cs.p.rec.score;
}
function myColGame() { return cs.league.games.find(g => g.wk === cs.week && !g.done && (g.h === cs.col.tid || g.a === cs.col.tid)); }
function myColGames() { return cs.league.games.filter(g => g.h === cs.col.tid || g.a === cs.col.tid).sort((a, b) => a.wk - b.wk); }
function colSeasonOver() { const t = cs.col.tid; return cs.week > 14 && !cs.league.games.some(g => !g.done && (g.h === t || g.a === t)) && !(cs.week <= 17 && cs.league.week <= 17 && pendingRoundFor(t)); }
// a team still alive in the playoff may get another game after this week's results
function pendingRoundFor(t) { const L = cs.league; if (!L.cfp || !L.cfp.seeds.includes(t)) return false; const games = L.games.filter(g => g.type === 'cfp' && (g.h === t || g.a === t)); const last = games[games.length - 1]; if (!last) return L.cfp.seeds.indexOf(t) < 4; if (!last.done) return true; return (last.hs > last.as ? last.h : last.a) === t && last.round < 4; }
// cs.col.years is the college year about to be (or being) played; the five-year clock and the
// three-years-out-of-high-school draft rule count completed years.
function eligibilityLeft() { const c = cs.col; return Math.max(0, Math.min(4 - c.seasons, 6 - c.years)); }
function draftEligible() { return cs.col && cs.col.years - 1 >= 3; }
function outOfEligibility() { return cs.col && (cs.col.seasons >= 4 || cs.col.years >= 6); }

/* ---------- skill points ---------- */
// near your ceiling (Updated balance), each point costs more: two and a half times at the ceiling, more above it
const ceilF = p => { if (!(cs && cs.balV >= 2 && p.ceil)) return 1; const over = cOvr(p) - p.ceil; return over <= -3 ? 1 : 1 + (over + 3) * 0.8; };
function upgrade(k, n) {
  const p = cs.p; let done = 0;
  for (let i = 0; i < (n || 1); i++) { const v = p.a[k]; if (v == null || v >= CATTR_MAX) break; const c = Math.round(cCost(v) * ceilF(p)); if (p.xp < c) break; p.xp -= c; p.a[k] = v + 1; done++; }
  return done;
}
// Spend points the way the play style would: best value per point first.
function autoAssign() {
  const p = cs.p; const w = CWT[p.pos]; const tilt = cStyle(p)[3]; let guard = 0;
  while (guard++ < 500) {
    let best = null;
    for (const [k] of CATTR[p.pos]) { const v = p.a[k]; if (v >= CATTR_MAX) continue; const c = Math.round(cCost(v) * ceilF(p)); if (c > p.xp) continue; const val = (w[k] + (tilt[k] > 0 ? 0.05 : 0)) / c - (v - 60) * 0.0006; if (!best || val > best.val) best = { k, val }; }
    if (!best) break; upgrade(best.k);
  }
}
function grantXP(n, why) { const g = Math.round(n * cdiff().xp); cs.p.xp += g; if (cs.p.auto) autoAssign(); return g; }
function naturalGrowth(amount) { const p = cs.p; if (cs.balV >= 2 && p.ceil && cOvr(p) > p.ceil) amount *= 0.15; /* past the ceiling, growth slows (BAL-16) */ CATTR[p.pos].forEach(([k]) => { p.a[k] = clamp(p.a[k] + Math.round(amount + gauss() * 0.7), 20, CATTR_MAX); }); twoWayGrow(amount); }
/* ---------- v9.9: two-way players ---------- */
const TWO_WAY = { WR: 'CB', CB: 'WR', RB: 'LB', LB: 'RB', TE: 'DE', DE: 'TE', OL: 'DT', DT: 'OL', S: 'WR', QB: 'S' };
function twoWayInit(p) { const pos2 = TWO_WAY[p.pos]; if (!pos2) return false; const lvl = cOvr(p) - 6; p.two = pos2; p.a2 = {}; CATTR[pos2].forEach(([k]) => { p.a2[k] = clamp(Math.round(lvl + (hash((cs.seed || 0) + ':two:' + k) - 0.5) * 6), 30, 92); }); return true; }
function cOvr2(p) { if (!p || !p.two || !p.a2) return 0; const w = CWT[p.two]; let s = 0; for (const k in w) s += w[k] * (p.a2[k] || 40); return Math.round(s); }
function twoWayGrow(amount) { const p = cs.p; if (!p.two || !p.a2) return; CATTR[p.two].forEach(([k]) => { p.a2[k] = clamp(p.a2[k] + Math.round(amount * 0.8 + (hash((cs.seed || 0) + ':tg:' + cs.year + ':' + cs.week + ':' + k) - 0.5) * 1.4), 20, CATTR_MAX); }); }
function twoWayOn() { return !!(cs && cs.p && cs.p.two && cs.p.a2 && cs.lvl !== 'nfl'); }
function dropTwoWay() { const p = cs.p; if (!p.two) return false; cNews(`${cName(p)} gives up playing ${CPOS_NAME[p.two].toLowerCase()} to focus on ${CPOS_NAME[p.pos].toLowerCase()}.`); p.twoWas = p.two; p.two = null; return true; }
function cStatCols(p) { const a = STAT_COLS[p.pos].slice(); const b = p.two || p.twoWas; if (b && STAT_COLS[b]) STAT_COLS[b].forEach(k => { if (!a.includes(k)) a.push(k); }); return a; }

/* ---------- training purchases (NIL money) ---------- */
// Prices scale with the player's NIL deal, so they matter whether he earns $5K or $2M a year.
const TRAIN = [
  { id: 'coach', name: 'Private position coach', desc: 'One-on-one work all offseason. +10 skill points.', xp: 10, min: 2000, pct: 0.06 },
  { id: 'speed', name: 'Speed and strength program', desc: '+2 to your two physical ratings.', phys: 2, min: 3500, pct: 0.1 },
  { id: 'film', name: 'Film study package', desc: '+3 to your read-the-play rating, and your coach notices.', read: 3, trust: 3, min: 1500, pct: 0.04 },
  { id: 'recovery', name: 'Recovery and nutrition staff', desc: 'Fewer and shorter injuries next season.', rec: true, min: 2500, pct: 0.07 },
  { id: 'guru', name: 'Elite trainer (the pros use him)', desc: 'A big jump: +26 skill points.', xp: 26, min: 9000, pct: 0.25 },
];
// Two programs per offseason year, so a big NIL deal can't buy everything at once (CL-B5).
const TRAIN_CAP = 2;
function trainLeft() { const b = cs.bought || {}; return TRAIN_CAP - Object.keys(b).filter(k => b[k] === cs.year).length; }
function trainCost(t) { const base = cs.lvl === 'nfl' && cs.nfl ? cs.nfl.contract.apy * 0.25 : cs.col ? cs.col.nil : 0; const v = Math.max(t.min, base * t.pct); return v < 10000 ? Math.round(v / 100) * 100 : Math.round(v / 1000) * 1000; }
const PHYS = { QB: ['arm', 'mob'], RB: ['spd', 'pow'], WR: ['spd', 'rel'], TE: ['pow', 'spd'], CB: ['spd', 'prs'], S: ['spd', 'tkl'], DE: ['bst', 'pow'], LB: ['spd', 'tkl'], OL: ['pow', 'ftw'], DT: ['pow', 'bst'], K: ['kpw', 'kof'], P: ['ppw', 'hng'] };
function buyTraining(id) {
  const t = TRAIN.find(x => x.id === id); const p = cs.p; cs.bought = cs.bought || {};
  const cost = t ? trainCost(t) : 0;
  if (!t || cs.bought[id] === cs.year || p.bank < cost || trainLeft() <= 0) return false;
  p.bank -= cost; p.spent += cost; cs.bought[id] = cs.year;
  if (t.xp) grantXP(t.xp); if (t.phys) PHYS[p.pos].forEach(k => p.a[k] = Math.min(CATTR_MAX, p.a[k] + t.phys));
  if (t.read) p.a[CREAD[p.pos]] = Math.min(CATTR_MAX, p.a[CREAD[p.pos]] + t.read); if (t.trust) p.trust = clamp(p.trust + t.trust, 0, 100);
  if (t.rec) cs.recovery = cs.year + 1;
  cs.nilLog.unshift({ y: cs.year, txt: t.name, amt: -cost });
  return true;
}
function payNil(amt, txt) { cs.p.bank += amt; cs.p.earned += amt; cs.nilLog.unshift({ y: cs.year, txt, amt }); if (cs.nilLog.length > 80) cs.nilLog.length = 80; }

/* ---------- this week's game ---------- */
function hsAbbr(name) { const w = String(name).replace(/ High$/, '').split(/\s+/); return (w.length > 1 ? w.map(x => x[0]).join('') : w[0].slice(0, 4)).toUpperCase().slice(0, 4); }
function myGameSpec() {
  if (cs.phase === 'hs') {
    const g = hsGameThisWeek(); if (!g) return null; const h = cs.hs;
    const me = { off: h.teamQ + 0.8, def: h.teamQ - 0.8 }, op = { off: g.oq, def: g.oq };
    const myHome = g.home || g.neutral;
    const hsName = h.name + ' ' + h.mascot;
    return { lvl: 'hs', wk: g.wk, home: myHome, neutral: !!g.neutral, name: g.name || '', type: g.type, ids: myHome ? [hsAbbr(h.name), hsAbbr(g.opp)] : [hsAbbr(g.opp), hsAbbr(h.name)], names: myHome ? [hsName, g.opp] : [g.opp, hsName], base: myHome ? [me, op] : [op, me], oppTid: 'HS:' + g.opp, hsIdx: h.sched.indexOf(g), big: !!g.big };
  }
  if (cs.phase === 'nfl') return nflGameSpec();
  if (cs.phase === 'col') {
    const g = myColGame(); if (!g) return null; const L = cs.league; const tid = cs.col.tid;
    const myHome = g.h === tid; const opp = myHome ? g.a : g.h;
    return { lvl: 'col', wk: g.wk, home: myHome, neutral: !!g.neutral, name: g.name || '', type: g.type, ids: [g.h, g.a].map(x => isFcsId(x) ? 'FCS' : x), names: [cTeamName(g.h), cTeamName(g.a)], base: [lgStrength(L, g.h), lgStrength(L, g.a)], oppTid: opp, lgId: g.id, big: g.type !== 'reg' || (L.teams[opp] && L.teams[opp].ap > 0) };
  }
  return null;
}
function cStartGame() { const sp = myGameSpec(); if (!sp) return null; cs.liveWk = cs.week; cs.liveRng = RNG.s; cg = cgNew(sp); cg.spec = sp; return cg; }
// Apply a finished game: score, record, stats, development, trust, injuries.
function cFinishGame(g) {
  const sp = g.spec; const mi = g.mi; const us = g.pts[mi], them = g.pts[1 - mi]; const won = us > them;
  cs.liveWk = null; cs.liveRng = null;
  if (sp.lvl === 'hs') { const hg = cs.hs.sched[sp.hsIdx]; hg.done = true; hg.us = us; hg.them = them; if (won) cs.hs.w++; else cs.hs.l++; }
  else if (sp.lvl === 'nfl') { const N = cs.nfl.L; const lg = N.games.find(x => x.id === sp.lgId); lg.hs = g.pts[0]; lg.as = g.pts[1]; lg.ot = g.ot; nflApply(N, lg); }
  else { const lg = cs.league.games.find(x => x.id === sp.lgId); lg.hs = g.pts[0]; lg.as = g.pts[1]; lg.ot = g.ot; lgApply(cs.league, lg); }
  const ss = cs.ss; const played = g.share > 0 && !!g.decN + Object.keys(g.line).length >= 0 && g.share > 0;
  const opp = sp.lvl === 'hs' ? sp.oppTid.slice(3) : sp.oppTid;
  const rec = { wk: sp.wk, opp, home: sp.home, neutral: sp.neutral, name: sp.name, us, them, w: won, line: g.line, grade: g.grade ? g.grade[1] : null, ratio: g.ratio, role: g.role, plays: g.plays.slice(-4) };
  rec.hl = { lvl: g.lvl, wk: g.wk, ids: g.ids, names: g.names, first: g.first, mi: g.mi, side: g.side, rank: g.rank, share: g.share, num: cs.p.num, pos: cs.p.pos, snaps: (g.snaps || []).filter(x => x.imm || Math.abs(x.y) >= 12).slice(-6), d: g.log.filter(x => x.out === 'td' && !x.dec).slice(0, 4).reverse() }; /* highlight reel */
  ss.games.push(rec); if (played) cRecGame(rec); /* records and personal bests */
  if (sp.lvl === 'col' && played) rivalGame(opp, won);
  let xp = 0; let trust = 0;
  if (played && sp.lvl === 'nfl' && sp.type === 'po') { // NFL playoff stats are kept apart from the regular season, as the league does
    ss.pgp = (ss.pgp || 0) + 1; ss.pst = ss.pst || {}; Object.entries(g.line).forEach(([k, v]) => ss.pst[k] = (ss.pst[k] || 0) + v);
  } else if (played) {
    ss.gp++; if (g.share >= 0.9) ss.gs++;
    Object.entries(g.line).forEach(([k, v]) => ss.st[k] = (ss.st[k] || 0) + v);
    ss.imp = (ss.imp || 0) + impactPts(g.line, cs.p.pos);
    if (g.ratio != null) { ss.gImp = (ss.gImp || 0) + impactPts(g.line, cs.p.pos); ss.expImp = (ss.expImp || 0) + EXP_IMP[cs.p.pos] * expectedUsage(g); }
    if (g.ratio != null) ss.ratios.push(g.ratio);
  }
  if (played) {
    xp = g.grade ? (cs.lvl === 'hs' ? { 'A+': 5, A: 4.3, B: 3.3, C: 2.6, D: 2, F: 1.5 } : { 'A+': 4, A: 3.5, B: 3, C: 2.5, D: 2, F: 1.5 })[g.grade[1]] : 1.5;
    trust = ({ 'A+': 4, A: 3, B: 1, C: 0, D: -2, F: -3 }[g.grade ? g.grade[1] : 'C'] || 0) + g.trust;
  } else xp = cs.lvl === 'col' && cs.col.rs ? 2 : 1.2;
  rec.xp = grantXP(cs.lvl === 'nfl' ? xp * 0.4 : xp); // pros improve slowly: most of the growth is done by then
  if (cs.lvl === 'col' || cs.lvl === 'nfl') { cs.p.trust = clamp(cs.p.trust + trust, 0, 100); rec.trust = trust; }
  // injuries
  if (played) {
    if (R() < cInjChance()) {
      const t = wpick(INJ_TYPES.map(x => [x, x[3]])); const wks = t[1] >= 99 ? 30 : ri(t[1], t[2]) + (cs.recovery === cs.year ? 0 : 1);
      cs.p.inj = wks; cs.p.injName = t[0]; cs.p.injFresh = true; cs.p.rehab = null; rec.inj = t[0]; // counted down from next week, not this one
      if (t[1] >= 99) { PHYS[cs.p.pos].forEach(k => cs.p.a[k] = Math.max(30, cs.p.a[k] - 2)); cNews(`${cName(cs.p)} suffers ${aAn(t[0].toLowerCase())} and is out for the season.`, 'bad'); }
      else cNews(`${cName(cs.p)} is out ${wks} week${wks > 1 ? 's' : ''} with ${aAn(t[0].toLowerCase())}.`, 'bad');
    }
  }
  matesAfterGame(played, won, g.grade ? g.grade[1] : null);
  if (played && g.grade) folGain(({ 'A+': 6000, A: 2500, B: 800, C: 200 }[g.grade[1]] || 0) * (won ? 1.3 : 0.8) * (sp.big ? 2 : 1)); /* spotlight games (rivals, ranked teams, playoffs, bowls) draw twice the eyes */
  if (played && won && sp.type && sp.type !== 'reg') folGain(/National Championship|Super Bowl/.test(sp.name || '') ? (cs.lvl === 'nfl' ? 120000 : 60000) : /Championship/.test(sp.name || '') ? 15000 : 6000); /* postseason wins and titles */
  if (played && g.grade && (g.grade[1] === 'A+' || (g.grade[1] === 'A' && R() < 0.4))) cNews(`${cName(cs.p)} stars in ${aAn(String(us))}–${them} ${won ? 'win over' : 'loss to'} ${sp.lvl === 'hs' ? opp : sp.lvl === 'nfl' ? 'the ' + nflName(opp) : cTeamName(opp)}: ${lineText(g.line, cs.p.pos)}.`, 'win');
  if (sp.lvl === 'col' && cs.col.nil && sp.wk <= 13) { }
  cg = null;
  return rec;
}
// the chance of getting hurt in this week's game: position, this week's rest or grind (D03), and a recovery year
function cInjChance() { return ({ low: 0.6, high: 1.45 }[cs.injRule] || 1) * (0.014 + (['RB', 'DE', 'LB'].includes(cs.p.pos) ? 0.008 : 0)) * (cs.p.ready === 'fresh' ? 0.6 : cs.p.ready === 'tired' ? 1.3 : 1) * (cs.recovery === cs.year ? 0.6 : 1) * cRehabF(); }
function cByeOrNoGame() { if (cs.p.inj > 0) { } grantXP(cs.lvl === 'nfl' ? 0.4 : cs.lvl === 'col' && cs.col && cs.col.rs ? 2 : 1); }
function cEndWeek() {
  delete cs.p.ready; /* a week's rest or grind lasts one week (D03) */
  endorsePay();
  const wk = cs.week; const L = cs.league; cs.wkN = (cs.wkN || 0) + 1;
  if (cs.phase === 'nfl') { const N = cs.nfl.L; if (N.week === wk) { nflSimWeek(N, wk); nflAfterWeek(N, wk); } }
  else if (L.week === wk && wk <= 18) { lgSimWeek(L, wk, null); lgAfterWeek(L, wk); }
  if (cs.p.injFresh) cs.p.injFresh = false;
  else if (cs.p.inj > 0) { cs.p.inj--; if (!cs.p.inj) { cNews(`${cName(cs.p)} is cleared to play.`); cs.p.injName = ''; } }
  { const lg = cs.ss && cs.ss.games[cs.ss.games.length - 1]; acadWeek(!!(lg && lg.wk === wk)); }
  if (cs.phase === 'hs') {
    hsAfterGame();
    if (cs.hs.cls >= 1) recruitTick('week').forEach(([k, tid]) => { if (k === 'offer' && teamLevel(tid) >= 70) cNews(`${cTeamName(tid)} offers ${cName(cs.p)} a scholarship.`, 'win'); if (k === 'pulled') cNews(`${cTeamName(tid)} pulls its scholarship offer.`, 'bad'); });
  }
  if (cs.phase === 'col' && wk <= 13 && cs.col.nil) payNil(Math.round(cs.col.nil / 13), `NIL payment, ${cTeamName(cs.col.tid)}`);
  if (cs.phase === 'nfl' && wk <= 18) nflPayWeek();
  if (typeof cxWeek === 'function') cxWeek(wk);
  cs.week++;
  cMaybeEvent();
  if (cs.phase === 'hs' && hsSeasonOver()) hsEndSeason();
  else if (cs.phase === 'col' && colSeasonOver()) colEndSeason();
  else if (cs.phase === 'nfl' && nflSeasonOver()) nflEndSeason();
}
// Play (or sim) this week. Returns the game record, or null for a bye week.
function cSimWeek() {
  if (cs.event) cResolveEvent(0);
  const g = cStartGame(); let rec = null;
  if (g) { cgAutoplay(g); rec = cFinishGame(g); } else cByeOrNoGame();
  cEndWeek();
  return rec;
}
function cInSeason() { return cs.phase === 'hs' || cs.phase === 'col' || cs.phase === 'nfl'; }

/* ---------- random events ---------- */
const CEVENTS = [
  { id: 'film', lvl: 'col', txt: 'The veterans invite you to a late film session the night before a big exam.', opts: [['Go to film', 'Coaches notice. You lose a little sleep: slightly higher injury risk this week.', () => { cs.p.trust += 3; grantXP(1); cs.p.ready = 'tired'; }], ['Study for the exam', 'Stay on top of your classes: your GPA goes up a little.', () => { grantXP(1); acadBoost(0.15); }]] },
  { id: 'sign', lvl: 'col', cond: () => cs.p.stars >= 3 || cs.p.bank > 0, txt: () => `A booster wants you at a paid autograph signing during a practice day. It pays ${money(1500 + cs.p.stars * 1500)}.`, opts: [['Take the money', 'Easy cash, but you miss practice.', () => { payNil(1500 + cs.p.stars * 1500, 'Autograph signing'); cs.p.trust -= 3; }], ['Stay at practice', 'Your coach likes the commitment.', () => { cs.p.trust += 2; }]] },
  { id: 'sore', lvl: 'any', txt: 'You\'re banged up after last week. The trainer says you can sit out practice.', opts: [['Rest', 'Heal up: lower injury risk this week. You miss some practice reps.', () => { cs.p.ready = 'fresh'; }], ['Push through', 'Earn respect. More injury risk, in practice and this week\'s game.', () => { grantXP(2); cs.p.ready = 'tired'; if (cs.lvl === 'col') cs.p.trust += 2; if (R() < 0.12) { cs.p.inj = 1; cs.p.injName = 'Hamstring strain'; cNews(`${cName(cs.p)} tweaks a hamstring in practice and will miss a week.`, 'bad'); } }]] },
  { id: 'media', lvl: 'col', txt: 'A reporter asks about the competition for playing time at your position.', opts: [['Stay humble', '"Whatever helps the team."', () => { cs.p.trust += 2; }], ['Talk yourself up', 'Fans love it. Your coach doesn\'t.', () => { cs.p.trust -= 2; payNil(1000 + cs.p.stars * 800, 'Social media deal after viral interview'); }]] },
  { id: 'extra', lvl: 'any', noNfl: true, txt: 'Your position coach offers extra drills before school, every day for a week.', opts: [['Sign up', 'More reps, less sleep: slightly higher injury risk this week.', () => { grantXP(3); if (cs.lvl === 'col') cs.p.trust += 1; cs.p.ready = 'tired'; }], ['Pass', 'Stay fresh: lower injury risk this week.', () => { cs.p.ready = 'fresh'; }]] },
  { id: 'grades', lvl: 'hs', txt: 'Midterms are coming up and your grades are slipping.', opts: [['Hit the books', 'Keep your grades up. A little less football this week.', () => { grantXP(1); }], ['Squeeze in both', 'More reps, but it\'s a grind: slightly higher injury risk this week.', () => { grantXP(2); cs.p.ready = 'tired'; }]] },
  { id: 'mentor', lvl: 'any', txt: 'A younger teammate asks you to help him learn the playbook.', opts: [['Help him', 'Leadership. The coaches notice.', () => { grantXP(1); if (cs.lvl === 'col') cs.p.trust += 2; }], ['Focus on yourself', 'More time on your own game.', () => { grantXP(2); }]] },
  { id: 'clip', lvl: 'hs', txt: 'A highlight clip of you is spreading fast on social media.', opts: [['Share it everywhere', 'Recruiting analysts see it. So do opponents.', () => { cs.p.rec.camp = r1((cs.p.rec.camp || 0) + 0.3); }], ['Keep your head down', 'Let your play do the talking.', () => { grantXP(1); }]] },
  { id: 'storm', lvl: 'any', txt: 'A storm cancels practice, but the weight room is open.', opts: [['Lift', 'Get stronger.', () => { grantXP(2); }], ['Rest', 'Fresh legs: lower injury risk this week.', () => { cs.p.ready = 'fresh'; }]] },
  { id: 'camp7', lvl: 'hs', cond: () => cs.hs.cls >= 1, txt: 'A college coach is at practice this week to watch you.', opts: [['Put on a show', 'Go all out. Could help your recruitment.', () => { const top = Object.keys(cs.rec.schools).sort((a, b) => teamLevel(b) - teamLevel(a)).find(t => canOffer(t, cs.p.rec.score || 60)); if (top) { cs.rec.schools[top].bump = (cs.rec.schools[top].bump || 0) + 8; cNews(`${cTeamName(top)} is paying close attention after watching practice.`); } grantXP(1); }], ['Practice like normal', 'Don\'t change what works.', () => { grantXP(2); }]] },
  { id: 'mate', lvl: 'any', cond: () => !!mate0(), txt: () => `${(mate0() || { n: 'A teammate' }).n} asks you to stay after practice and run extra reps together.`, opts: [['Stay', 'He appreciates it (+6 with him). A long day.', () => { const m = mate0(); if (m) mateAdj(m.n, 6); grantXP(1); cs.p.ready = 'tired'; }], ['Head home', 'Rest up. He notices (−3 with him).', () => { const m = mate0(); if (m) mateAdj(m.n, -3); cs.p.ready = 'fresh'; }]] },
  { id: 'clash', lvl: 'any', cond: () => mateList().some(m => m.rival), txt: () => `${(mateList().find(m => m.rival) || { n: 'A teammate' }).n} is unhappy about snaps and has been talking about it in the locker room.`, opts: [['Talk it out', 'Clear the air (+5 with him).', () => { const m = mateList().find(x => x.rival); if (m) mateAdj(m.n, 5); }], ['Let your play answer', 'Your coach likes the focus (+2 trust), he doesn\'t (−5).', () => { const m = mateList().find(x => x.rival); if (m) mateAdj(m.n, -5); cs.p.trust += 2; }]] },
  { id: 'tutor', lvl: 'col', cond: () => !!cs.acad && cs.acad.gpa < 2.6, txt: 'Your academic advisor wants you at study hall three nights this week.', opts: [['Go', 'Your GPA goes up. Less time for football.', () => { acadBoost(0.25); }], ['Skip it', 'More time in the film room. Your GPA slips.', () => { grantXP(1); acadBoost(-0.15); }]] },
];
function cMaybeEvent() {
  if (cs.event || !cInSeason()) return;
  if (R() > (cs.lvl === 'hs' ? 0.08 : 0.12)) return;
  // each event rests for about a season before it can come back; "banged up" needs a game played last week (CL-B6)
  // the clock is in-season weeks played, so a season break doesn't cut the rest short
  cs.evLog = cs.evLog || {}; const now = 1000 + (cs.wkN || 0); const lastG = cs.ss && cs.ss.games[cs.ss.games.length - 1];
  const opts = CEVENTS.filter(e => ((e.lvl === 'any' && !(cs.lvl === 'nfl' && e.noNfl)) || e.lvl === cs.lvl) && (!e.cond || e.cond()) && !(cs.evLog[e.id] >= 1000 && now - cs.evLog[e.id] < 12)
    && (e.id !== 'sore' || (lastG && lastG.wk === cs.week - 1 && lastG.role !== 'Not playing')));
  if (!opts.length) return; const e = pick(opts); cs.evLog[e.id] = now;
  cs.event = { id: e.id, txt: typeof e.txt === 'function' ? e.txt() : e.txt };
}
function cResolveEvent(i) { const ev = cs.event; if (!ev) return; const e = CEVENTS.find(x => x.id === ev.id); cs.event = null; if (!e) return; const o = e.opts[i] || e.opts[0]; o[2](); cs.p.trust = clamp(cs.p.trust, 0, 100); return o[0]; }

/* ---------- end of a season ---------- */
function seasonRatio(ss) { return ss.expImp ? (ss.gImp != null ? ss.gImp : ss.imp) / ss.expImp : null; }
function archiveSeason(extra) {
  const ss = cs.ss; const p = cs.p; const lvl = cs.lvl;
  const team = lvl === 'hs' ? cs.hs.name : lvl === 'nfl' ? cs.nfl.tm : cs.col.tid;
  const recStr = lvl === 'hs' ? cs.hs.w + '-' + cs.hs.l : lvl === 'nfl' ? cs.nfl.L.teams[cs.nfl.tm].w + '-' + cs.nfl.L.teams[cs.nfl.tm].l : LT(cs.col.tid).w + '-' + LT(cs.col.tid).l;
  const e = Object.assign({ year: cs.year, lvl, team, cls: lvl === 'hs' ? HS_CLS[cs.hs.cls] : lvl === 'nfl' ? nflYearLabel() : colCls(), gp: ss.gp, gs: ss.gs, st: Object.assign({}, ss.st), ovr: cOvr(p), stars: p.stars, rec: recStr, ratio: seasonRatio(ss), awards: [] }, ss.pgp ? { pgp: ss.pgp, pst: Object.assign({}, ss.pst) } : {}, extra || {});
  p.seasons.push(e); cRecSeason(e); if (lvl === 'col') rivalSeason(e); return e;
}
function giveAward(e, name, cash) { folGain(/Heisman|MVP/.test(name) ? 400000 : /All-America|All-Pro|Player of the Year/.test(name) ? 60000 : 15000); e.awards.push(name); cs.p.awards.push({ y: e.year, lvl: e.lvl, a: name }); if (cash) payNil(cash, name + ' endorsements'); }
function hsEndSeason() {
  const h = cs.hs; const ss = cs.ss; const p = cs.p;
  const sr = seasonRatio(ss); const e = archiveSeason({ po: h.po ? (h.po.champ ? 'State champions' : 'Playoffs, round ' + h.po.round) : 'No playoffs' });
  const before = p.stars;
  // production carries forward (half of last year's credit) so a multi-year star keeps climbing (CL-B1)
  const prodNow = ss.gp >= 4 && sr != null ? clamp((sr - 1.1) * 3, -2, 3.5) : ss.gp < 2 ? -1 : 0;
  p.rec.prod = r1(clamp((p.rec.prod || 0) * 0.5 + prodNow, -2, 4.5));
  p.rec.awd = r1((p.rec.awd || 0) * 0.5);
  if (ss.gp >= 5 && sr != null && ss.gs >= 5) {
    const as = sr + (recruitScore() - 72) * 0.06;
    if (as >= 2.1 && cs.hs.cls === 3 && p.stars >= 4 && R() < 0.6) { giveAward(e, `Mr. Football (${CSTATES[p.home]})`); p.rec.awd = Math.max(p.rec.awd || 0, 1.2); }
    if (as >= 1.7) { giveAward(e, 'All-State'); p.rec.awd = Math.max(p.rec.awd || 0, 0.7); } else if (as >= 1.25) { giveAward(e, 'All-Conference'); p.rec.awd = Math.max(p.rec.awd || 0, 0.3); }
  }
  if (cs.hs.cls === 2 && recruitScore() >= 77.5) { p.rec.aa = 1.5; giveAward(e, 'All-American Bowl invitation'); }
  p.rec.camp = r1((p.rec.camp || 0) * 0.5);
  p.rec.score = recruitScore(); p.stars = starsOf(p.rec.score); p.starsHist = (p.starsHist || []).concat([[cs.year, p.stars]]);
  e.stars = p.stars;
  // the rest of the college season plays out, then the calendar turns over
  lgFinishSeason(cs.league); const champ = cs.league.champ; const changes = lgRollover(cs.league);
  cs.year = cs.league.year;
  const offers = recruitTick('off');
  cs.phase = 'hsoff'; cs.week = 0;
  const steps = h.cls >= 3 ? ['review', 'signing'] : ['review', 'recruit', 'camp', 'train'];
  cs.off = { steps, i: 0, review: { year: e.year, e, before, after: p.stars, champ, newOffers: offers.filter(x => x[0] === 'offer').map(x => x[1]) }, grown: false }; cChgMark();
  cNews(`${cName(p)} finishes his ${HS_CLS[h.cls].toLowerCase()} season: ${p.stars}-star ${p.pos}${p.stars !== before && h.cls > 0 ? (p.stars > before ? ' (up from ' + before + ')' : ' (down from ' + before + ')') : ''}.`, p.stars > before ? 'win' : '');
  if (champ) cNews(`${cTeamName(champ)} wins the ${e.year} national championship.`);
  void changes;
}
// A season counts for honors and draft stock only if the player actually started and carried
// a real workload (CL-01/CL-02): a backup's efficient cameo can't win national awards.
const STARTER_VOL = { QB: ['att', 150], RB: ['car', 100], WR: ['tgt', 40], TE: ['tgt', 25], DE: ['tkl', 20], LB: ['tkl', 30], CB: ['tkl', 30], S: ['tkl', 30], OL: ['snp', 250], DT: ['tkl', 15], K: ['xpa', 10], P: ['punt', 15] };
function starterSeason(ss, pos) {
  if (!ss || !ss.gp) return false;
  const [k, min] = STARTER_VOL[pos] || ['tkl', 30];
  return ss.gs >= 8 && ((ss.st || {})[k] || 0) >= min; // at least 8 starts: a 5-game season can't make an All-American
}
function colEndSeason() {
  const ss = cs.ss; const p = cs.p; const c = cs.col; const L = cs.league;
  lgFinishSeason(L);
  const sr = seasonRatio(ss); const e = archiveSeason({ team: c.tid });
  const t = L.teams[c.tid]; e.rec = t.w + '-' + t.l; e.rank = t.ap || 0;
  const post = L.games.filter(g => (g.h === c.tid || g.a === c.tid) && g.type !== 'reg').map(g => g.name + ' (' + ((g.h === c.tid ? g.hs > g.as : g.as > g.hs) ? 'W' : 'L') + ')');
  e.post = post.join(', '); if (L.champ === c.tid) { e.awards.push('National champions'); p.awards.push({ y: e.year, lvl: 'col', a: 'National champion' }); }
  // awards
  acadTerms(e); /* fall and spring grades */
  const heis = heismanVote(e, sr); L.heis = heis.winner;
  const starter = starterSeason(ss, p.pos);
  c.gs = (c.gs || 0) + (ss.gs || 0);
  if (starter && sr != null) {
    const first = c.years === 1 && c.seasons === 0;
    // national awards weigh the level of play as well as production
    const aw = sr + (cOvr(p) - 82) * 0.03 + (p4Team(c.tid) ? 0.08 : -0.18);
    if (heis.mine === 1) giveAward(e, 'Heisman Trophy', 1500000); else if (heis.mine && heis.mine <= 4) giveAward(e, 'Heisman finalist', 250000);
    const pa = { QB: 'Davey O\'Brien Award', RB: 'Doak Walker Award', WR: 'Biletnikoff Award', TE: 'John Mackey Award', CB: 'Jim Thorpe Award', S: 'Jim Thorpe Award', DE: 'Ted Hendricks Award', LB: 'Butkus Award', OL: 'Outland Trophy', DT: 'Outland Trophy', K: 'Lou Groza Award', P: 'Ray Guy Award' }[p.pos];
    if (aw >= 1.62 || (aw >= 1.5 && R() < 0.4)) giveAward(e, pa, 100000);
    if (aw >= 1.5) giveAward(e, 'First-team All-American', 120000); else if (aw >= 1.35) giveAward(e, 'Second-team All-American', 40000);
    const cn = CONF_HONOR[t.conf];
    if (cn && sr >= 1.25) giveAward(e, 'First-team ' + cn); else if (cn && sr >= 1.1) giveAward(e, 'Second-team ' + cn);
    if (first && aw >= 1.12) giveAward(e, 'Freshman All-American');
  }
  if (starter && sr != null) { c.lastRatio = sr; c.best = Math.max(c.best || 0, sr); }
  // transfer interest still notices a backup who played well in real snaps
  if (sr != null && ss.gp >= 4) c.playRatio = sr;
  // eligibility: a redshirt year (four games or fewer) doesn't count
  if (ss.gp <= 4 && !c.rsYear) { c.rsYear = true; e.rs = true; e.cls += ' (redshirt)'; if (!c.rs) cNews(`${cName(p)} played in ${ss.gp} game${ss.gp === 1 ? '' : 's'}, so the season counts as his redshirt year.`); } else c.seasons++;
  c.years++; c.rs = false;
  const champ = L.champ; const changes = lgRollover(L); cs.year = L.year;
  const mine = changes.find(x => x.id === c.tid);
  if (mine) { p.trust = 45; c.coach = LT(c.tid).coach; cNews(`${cTeamName(c.tid)} ${mine.why === 'fired' ? 'fires' : 'loses'} head coach ${mine.old}. ${mine.now} takes over, and every job is open again.`, 'bad'); }
  p.inj = 0; p.injName = ''; p.injFresh = false; // every injury heals over the offseason (same rule as high school)
  cs.phase = 'coloff'; cs.week = 0;
  const steps = ['review']; if (draftEligible() || outOfEligibility()) steps.push('draft'); if (!outOfEligibility()) steps.push('portal', 'train');
  cs.off = { steps, i: 0, review: { year: e.year, e, heis, champ, coach: mine || null, post: e.post }, grown: false }; cChgMark();
  if (champ) cNews(`${cTeamName(champ)} wins the ${e.year} national championship.`, champ === c.tid ? 'big' : '');
}
function heismanVote(e, sr) {
  const L = cs.league; const p = cs.p; const t = L.teams[cs.col.tid];
  const mult = ({ QB: 1, RB: 0.95, WR: 0.9, TE: 0.6, CB: 0.55, S: 0.5, DE: 0.6, LB: 0.55, OL: 0.35, DT: 0.45, K: 0.2, P: 0.15 })[p.pos] || 0.5;
  let my = (cs.ss.imp || 0) * mult * (1 + (t.w - 8) * 0.05) * (t.ap && t.ap <= 6 ? 1.08 : 1) * (p4Team(cs.col.tid) ? 1 : 0.82);
  const tops = Object.values(L.teams).filter(x => x.ap && x.id !== cs.col.tid).sort((a, b) => a.ap - b.ap).slice(0, 10);
  const cands = tops.slice(0, 8).map((x, i) => { const pos = pick(['QB', 'QB', 'QB', 'RB', 'WR']); const n = oppName(x.id, pos); return { n, pos, tid: x.id, sc: 380 - i * 9 + gauss() * 36 }; });
  const eligible = starterSeason(cs.ss, p.pos);
  if (p.awards.some(a => a.a === 'Heisman Trophy')) my *= 0.7; // voters rarely give it to the same player twice
  my *= cs.col.years <= 1 ? 0.8 : cs.col.years === 2 ? 0.92 : 1; // and rarely to freshmen and sophomores
  if (eligible) cands.push({ n: cName(p), pos: p.pos, tid: cs.col.tid, sc: my, me: true });
  cands.sort((a, b) => b.sc - a.sc);
  const mine = eligible ? cands.findIndex(x => x.me) + 1 : 0;
  return { list: cands.slice(0, 5).map(x => ({ n: x.n, pos: x.pos, tid: x.tid, me: !!x.me })), mine, winner: { n: cands[0].n, tid: cands[0].tid, pos: cands[0].pos } };
}

/* ---------- offseason steps ---------- */
const OFF_LABEL = { nreview: 'Season review', nmoney: 'Contract and free agency', ntrain: 'Offseason training', review: 'Season review', recruit: 'Recruiting', camp: 'Summer camps', train: 'Offseason training', signing: 'Signing day', draft: 'NFL Draft decision', portal: 'Transfer portal' };
function offStep() { return cs.off ? cs.off.steps[cs.off.i] : null; }
// Returns an error message if the current step still needs a choice.
function offBlocked() {
  const s = offStep();
  if (s === 'signing') return 'Choose where you\'ll sign first.';
  if (s === 'draft' && !cs.off.draftChoice) return 'Decide whether to enter the draft first.';
  if (s === 'portal' && cs.portal && !cs.portal.done) return 'Pick your new school from the portal first.';
  if (s === 'camp' && !cs.off.camp) return 'Choose a camp (or skip camps) first.';
  if (s === 'nmoney' && cs.nfl && cs.nfl.fa && !cs.nfl.fa.done) return cs.nfl.fa.none ? 'No team has called. Retire, or wait for a call.' : 'Sign with a team (or retire) first.';
  return '';
}
function offNext() {
  const s = offStep(); if (!s) return;
  if (offBlocked()) return offBlocked();
  if (s === 'train' && !cs.off.grown) doOffseasonGrowth();
  cs.off.i++;
  if (cs.off.i >= cs.off.steps.length) { cs.off = null; if (cs.lvl === 'hs') { cs.hs.cls++; hsNewSeason(); } else if (cs.lvl === 'nfl') nflNewSeason(); else colNewSeason(); return ''; }
  const n = offStep();
  if (n === 'train' && !cs.off.grown) doOffseasonGrowth();
  if (n === 'nmoney') nflMoneyStep();
  if (n === 'ntrain' && !cs.off.grown) nflOffGrowth();
  return '';
}
// Updated balance (BAL-16): some offseasons you take a big step, some you don't (from the seed and the year)
function devYear() { if (!(cs && cs.balV >= 2)) return 1; const ss = cs.p.seasons || []; const ls = ss[ss.length - 1]; const snap = ls && ls.gp ? clamp((ls.gs || 0) / ls.gp, 0, 1) : 0.5; /* starters grow a little faster: game snaps count */
  return clamp((1 + cGaussOf(String(cs.seed) + ':dev:' + cs.year) * 0.4) * (0.85 + snap * 0.3), 0.3, 1.7); }
function doOffseasonGrowth() {
  cs.off.grown = true; const hs = cs.lvl === 'hs'; const dv = devYear();
  naturalGrowth((hs ? 3 : 1.4) * dv);
  const g = grantXP(Math.round((hs ? 6 : 8) * dv));
  cs.off.growXP = g;
  if (!hs && cs.col) { // NIL retention: a school keeps a productive player's deal close to his market value
    const mkt = nilOffer(cs.col.tid, starsFloat(transferScore()), 70);
    if (mkt > cs.col.nil * 1.15) { const nv = Math.round(Math.max(cs.col.nil, mkt * 0.85) / 1000) * 1000; cNews(`${cTeamName(cs.col.tid)} bumps ${cName(cs.p)}'s NIL deal to ${money(nv)} a year.`, 'win'); cs.col.nil = nv; }
  }
}
const CAMPS = [
  { id: 'regional', name: 'Regional college camp', desc: 'Work out for nearby schools. Low pressure.', risk: 0.8, gain: 1.4, region: true },
  { id: 'national', name: 'National showcase', desc: 'The best prospects in the country, and every recruiting analyst. Big stakes.', risk: 2.2, gain: 3 },
  { id: 'none', name: 'Skip camps and train', desc: 'Stay home and put in the work. Extra skill points.', xp: 6 },
];
function doCamp(id) {
  const c = CAMPS.find(x => x.id === id); if (!c || cs.off.camp) return null; cs.off.camp = id;
  if (c.xp) { const g = grantXP(c.xp); return { txt: `You spend the summer training. +${g} skill points.` }; }
  const p = cs.p; const perf = (cOvr(p) + growthLeft() - (id === 'national' ? 74 : 65)) / 6 + gauss() * 0.9 + (p.a[CREAD[p.pos]] - 60) * 0.02;
  const d = r1(clamp(perf * c.gain / 2, -c.risk, c.gain)); p.rec.camp = r1((p.rec.camp || 0) + d);
  if (c.region) Object.keys(cs.rec.schools).forEach(t => { if (REGION_OF[TEAM_STATE[t]] === REGION_OF[p.home]) cs.rec.schools[t].bump = (cs.rec.schools[t].bump || 0) + 4; });
  const before = p.stars; p.rec.score = recruitScore(); p.stars = starsOf(p.rec.score);
  const offers = recruitTick('off').filter(x => x[0] === 'offer');
  const txt = (d >= 1 ? 'You were one of the standouts of the camp.' : d > 0 ? 'A solid showing.' : d > -1 ? 'An up-and-down camp.' : 'A rough camp. The analysts noticed.') + (p.stars !== before ? ` You are now a ${p.stars}-star prospect.` : '') + (offers.length ? ` New offers: ${offers.map(x => cTeamName(x[1])).join(', ')}.` : '');
  cNews(`${c.name}: ${txt}`, d > 0 ? 'win' : '');
  return { txt, d };
}
function signWith(tid) {
  if (!(cs.phase === 'sign' || offStep() === 'signing') || cs.rec.signed) return false;
  const s = cs.rec.schools[tid]; if (!s || !s.off) return false;
  if (cs.rec.committed !== tid) cs.rec.committed = tid;
  enrollCollege(tid);
  cNews(`${cName(cs.p)} signs with ${cTeamName(tid)}${s.nil ? ', with an NIL deal worth ' + money(s.nil) + ' a year' : ''}.`, 'big');
  if (cs.off) { cs.off.i = cs.off.steps.length; cs.off = null; }
  colNewSeason();
  return true;
}
function colNewSeason() {
  cs.phase = 'col'; cs.lvl = 'col'; cs.week = 1; cs.ss = newSS(); cs.p.inj = 0; cs.p.injName = ''; cs.p.injFresh = false; cs.portal = null;
  acadSeasonStart(); cs.mates = null; rivalInit();
  if (cs.col) cs.col.coach = LT(cs.col.tid).coach;
}

/* ---------- transfer portal ---------- */
function enterPortal() {
  if (cs.portal || offStep() !== 'portal') return false;
  const from = cs.col.tid; cs.portal = { round: 1, from, offers: {}, done: false, log: [] };
  cs.col.nilPrev = cs.col.nil;
  portalRound();
  cNews(`${cName(cs.p)} enters the transfer portal.`, 'big');
  return true;
}
function portalScore() { return transferScore(); }
function portalRound() {
  const P = cs.portal; const sc = portalScore(); const sf = starsFloat(sc); const out = [];
  Object.keys(cs.league.teams).forEach(tid => {
    if (tid === P.from && P.round < 3) return;
    const cur = P.offers[tid];
    const d = depthOutlook(tid, cs.year, cOvr(cs.p));
    let i = 50 + clamp(sc - teamTarget(tid), -12, 10) * 5 + (d.k === 'start' ? 15 : d.k === 'compete' ? 6 : -10) + (cs.league.teams[tid].need[cs.p.pos] - 1) * 14 + proximity(tid) * 0.4;
    i = Math.round(clamp(i, 0, 100));
    if (cur) { if (R() < 0.12 && i < 55) { delete P.offers[tid]; out.push(['pulled', tid]); } return; }
    const room = d.k === 'start' ? -9 : d.k === 'compete' ? -7 : -5;
    if (sc - teamTarget(tid) < room || recFit(sc) - teamTarget(tid) > 16 || i < 45) return;
    if (R() < 0.18 * (i / 70) * (portalStarter() ? 1 : 0.25)) { P.offers[tid] = { i, nil: Math.round(nilOffer(tid, sf, i) * 1.1 / 1000) * 1000 || 1000, start: d.txt }; out.push(['offer', tid]); }
  });
  // nobody leaves the portal empty-handed
  if (P.round >= 2 && Object.keys(P.offers).length < 2) {
    Object.keys(cs.league.teams).filter(t => t !== P.from && !P.offers[t]).sort((a, b) => Math.abs(teamTarget(a) - sc - 3) - Math.abs(teamTarget(b) - sc - 3)).slice(0, 3).forEach(tid => { P.offers[tid] = { i: 55, nil: nilOffer(tid, sf, 55), start: depthOutlook(tid, cs.year, cOvr(cs.p)).txt }; out.push(['offer', tid]); });
  }
  P.log.push(out); return out;
}
function portalWait() { const P = cs.portal; if (!P || P.done || P.round >= 3) return null; P.round++; return portalRound(); }
function portalCommit(tid) {
  const P = cs.portal; if (!P || P.done || !P.offers[tid]) return false;
  const o = P.offers[tid]; const c = cs.col;
  P.done = true; P.to = tid;
  if (tid !== P.from) { c.transfers++; c.teams.push(tid); c.tid = tid; cs.p.trust = 45; }
  c.nil = o.nil; c.coach = LT(tid).coach;
  cNews(`${cName(cs.p)} ${tid === P.from ? 'returns to' : 'transfers to'} ${cTeamName(tid)}${o.nil ? ' (NIL: ' + money(o.nil) + ' a year)' : ''}.`, 'big');
  return true;
}

/* ---------- following and endorsements ---------- */
// Big games and awards grow your following; brands call as it grows. College deals count as NIL money.
const FOL_STEPS = [5000, 25000, 100000, 400000, 1500000];
const BRANDS = ['Northpeak Athletic', 'Bolt Hydration', 'Crestline Motors', 'Ironleaf Apparel', 'Summit Gaming', 'Blue Harbor Bank', 'Redline Energy', 'Fieldhouse Burgers', 'Lakeside Insurance', 'Vantage Headphones'];
const folLvlF = () => (cs.lvl === 'nfl' ? 2.5 : cs.lvl === 'col' ? 1 : 0.25);
function folGain(n) {
  if (!cs || !cs.p || !n) return; const p = cs.p; const before = p.fol || 0; p.fol = Math.round(before + n * folLvlF());
  if (cs.lvl === 'hs') return; const i = FOL_STEPS.findIndex(x => before < x && p.fol >= x); if (i < 0) return;
  const amt = Math.round((cs.lvl === 'nfl' ? [60000, 150000, 400000, 1000000, 3000000] : [3000, 10000, 30000, 90000, 250000])[i] * (0.85 + hash(cs.seed + ':brand:' + cs.year + ':' + i) * 0.3) / 100) * 100;
  const brand = BRANDS[Math.floor(hash(cs.seed + ':b:' + i + ':' + cs.year) * BRANDS.length)];
  (cs.endOff || (cs.endOff = [])).push({ id: 'e' + cs.year + '_' + i, brand, amt, yrs: cs.lvl === 'nfl' ? 3 : 1, y: cs.year, lvl: cs.lvl });
  cNews(`${brand} wants ${cName(p)} for an endorsement deal: ${money(amt)} a year. You now have ${folTxt(p.fol)} followers.`, 'win');
}
// Once a season (college and NFL), brands come back: you can hold up to one deal per follower level reached
// (at most 3). Unanswered offers from earlier seasons lapse. Uses hash() so it never moves the random stream.
const folTier = f => FOL_STEPS.filter(x => (f || 0) >= x).length;
function endorseSeason() {
  if (!cs || !cs.p || !['col', 'nfl'].includes(cs.lvl) || cs.endY === cs.year) return; cs.endY = cs.year;
  cs.endOff = (cs.endOff || []).filter(o => o.y === cs.year);
  const tier = folTier(cs.p.fol); const active = (cs.endorse || []).filter(d => d.left > 0); const room = Math.min(3, tier) - active.length - cs.endOff.length; if (tier < 1 || room <= 0) return;
  const used = new Set([...active.map(d => d.brand), ...cs.endOff.map(o => o.brand)]); const free = BRANDS.filter(b => !used.has(b));
  for (let j = 0; j < room && free.length; j++) {
    const h = hash(cs.seed + ':es:' + cs.year + ':' + j); const brand = free.splice(Math.floor(h * free.length), 1)[0];
    const amt = Math.round((cs.lvl === 'nfl' ? [60000, 150000, 400000, 1000000, 3000000] : [3000, 10000, 30000, 90000, 250000])[tier - 1] * (0.6 + h * 0.4) * (agentOf() ? agentOf().brand : 1) / 100) * 100;
    cs.endOff.push({ id: 'es' + cs.year + '_' + j, brand, amt, yrs: cs.lvl === 'nfl' ? 2 : 1, y: cs.year, lvl: cs.lvl });
  }
  cNews(`${room > 1 ? room + ' brands want' : 'A brand wants'} ${cName(cs.p)} this season. See Following & endorsements on the ${cs.nfl ? 'Money' : 'NIL'} tab.`, 'win');
}
const folTxt = n => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'K' : String(n || 0));
function endorseAnswer(id, yes) {
  const o = (cs.endOff || []).find(x => x.id === id); if (!o) return false; cs.endOff = cs.endOff.filter(x => x !== o);
  if (yes) { (cs.endorse || (cs.endorse = [])).push({ brand: o.brand, amt: o.amt, left: o.yrs, paid: null }); cNews(`${cName(cs.p)} signs with ${o.brand}: ${money(o.amt)} a year for ${o.yrs} year${o.yrs > 1 ? 's' : ''}.`, 'win'); endorsePay(); }
  return true;
}
// each deal pays once per season while it runs
function endorsePay() { endorseSeason(); (cs.endorse || []).forEach(d => { if (d.left > 0 && d.paid !== cs.year && ['col', 'nfl'].includes(cs.phase)) { d.paid = cs.year; d.left--; payNil(d.amt, `${d.brand} endorsement`); } }); }

/* ---------- the NFL Combine and pro day ---------- */
// Four tests before the draft. Each result is measured against your overall rating; the average moves your draft
// projection by up to 1.5 points. At your pro day you can redo one test (the better result counts).
function combineDrills() {
  const p = cs.p; const has = k => p.a[k] != null; const pick1 = ks => ks.find(has) || Object.keys(p.a)[0];
  const top = Object.entries(CWT[p.pos]).sort((a, b) => b[1] - a[1])[0][0];
  return [['forty', '40-yard dash', pick1(['spd', 'bst', 'mob'])], ['bench', 'Bench press', pick1(['pow', 'blk', 'tkl', 'arm'])], ['pos', 'Position drills', top], ['talk', 'Team interviews', pick1(['iq', 'dec', 'vis', 'rte'])]];
}
function combineRec() { if (!cs.combine || cs.combine.yr !== cs.year) cs.combine = { yr: cs.year, d: {}, pro: null }; return cs.combine; }
function runDrill(k, proDay) {
  const C = combineRec(); const dr = combineDrills().find(x => x[0] === k); if (!dr) return null; if (!proDay && C.d[k]) return C.d[k]; if (proDay && (C.pro || !C.d[k])) return null;
  const base = cs.p.a[dr[2]] || cOvr(cs.p); const v = clamp(Math.round(base + gauss() * 4.5), 30, 99);
  if (proDay) { C.pro = k; if (v > C.d[k].v) C.d[k] = { v, pro: true }; } else C.d[k] = { v };
  return C.d[k];
}
const drillShow = (k, v) => (k === 'forty' ? (4.25 + (99 - v) * 0.013).toFixed(2) + ' sec' : k === 'bench' ? Math.round(8 + v * 0.22) + ' reps' : v >= 90 ? 'A' : v >= 82 ? 'B' : v >= 72 ? 'C' : v >= 62 ? 'D' : 'F');
function combineDelta() { if (!cs.combine || cs.combine.yr !== cs.year) return 0; const o = cOvr(cs.p); const v = Object.values(cs.combine.d); if (!v.length) return 0; return r1(clamp(v.reduce((s, x) => s + clamp((x.v - o) / 8, -1.5, 1.5), 0) / 4, -1.5, 1.5)); }

/* ---------- after the playing days ---------- */
function careerAfter(k) { if (cs.phase !== 'retired' || cs.after) return false; cs.after = k; cNews(k === 'booth' ? `${cName(cs.p)} joins a national broadcast crew as a game analyst.` : `${cName(cs.p)} goes into coaching.`, 'big'); return true; }

/* ---------- NFL Draft ---------- */
const POS_DRAFT = { QB: 2, DE: 1.5, CB: 1, WR: 0.5, LB: 0, S: -0.5, RB: -1, TE: -1, OL: 0.8, DT: 0.4, K: -6, P: -7 };
function draftProjection() {
  const p = cs.p; const aw = p.awards.filter(a => a.lvl === 'col').map(a => a.a);
  const bonus = (aw.includes('Heisman Trophy') ? 3 : 0) + (aw.some(a => a === 'First-team All-American') ? 2 : aw.some(a => a === 'Second-team All-American') ? 1 : 0);
  // scouts discount production they never saw on Saturdays: fewer than 12 career starts costs stock
  const gs = cs.col.gs || 0; const thin = gs < 12 ? -(12 - gs) * 0.7 : 0;
  const sc = cOvr(p) + clamp(((cs.col.best || cs.col.lastRatio || 1) - 1) * 5, -2, 4) + bonus + POS_DRAFT[p.pos] + ((p.stars0 || 3) >= 4 ? 0.5 : 0) + thin + combineDelta(); // the combine and pro day move it a little
  return r1(sc);
}
function draftRange(sc) {
  const T = [[93, 1, 6], [91, 5, 16], [89, 12, 32], [87, 33, 64], [85, 65, 100], [83, 101, 138], [81, 139, 176], [79, 177, 216], [77, 217, 257]];
  const row = T.find(x => sc >= x[0]); return row ? [row[1], row[2]] : null;
}
function projText(sc) { const r = draftRange(sc); if (!r) return 'Undrafted free agent'; const rd = n => pickRound(n); /* one round table for every mode (B09) */ const a = rd(r[0]), b = rd(r[1]); return r[1] <= 32 ? (r[1] <= 10 ? 'Top 10 pick' : 'First round') : a === b ? `Round ${a}` : `Rounds ${a}–${b}`; }
function runDraft() {
  if (cs.phase === 'done') return cs.done.draft;
  const sc = draftProjection() + gauss() * 1.2; const r = draftRange(sc);
  let res;
  if (!r) res = { pick: 0, round: 0, team: pick(NFL_TEAMS), udfa: true };
  else { const pk = ri(r[0], r[1]); res = { pick: pk, round: pickRound(pk), team: pick(NFL_TEAMS) }; }
  res.year = cs.year; res.sc = r1(sc);
  cs.done = { draft: res, when: Date.now() }; rivalDraft(res.year);
  cs.phase = 'done'; cs.off = null;
  folGain(res.udfa ? 3000 : res.pick <= 10 ? 200000 : res.round === 1 ? 100000 : res.round <= 3 ? 40000 : 15000); /* draft night */
  cNews(res.udfa ? `${cName(cs.p)} goes undrafted and signs with the ${res.team} as a free agent.` : `The ${res.team} select ${cName(cs.p)} in round ${res.round}, pick ${res.pick} overall.`, 'big');
  return res;
}
function declareDraft(yes) {
  if (offStep() !== 'draft') return false;
  if (!yes && outOfEligibility()) return false;
  cs.off.draftChoice = yes ? 'declare' : 'return';
  if (yes) { runDraft(); return true; }
  cNews(`${cName(cs.p)} announces he's coming back for another season.`);
  return true;
}
// career totals, summed across a level's seasons
function careerTotals(lvl) { const out = {}; cs.p.seasons.filter(s => !lvl || s.lvl === lvl).forEach(s => Object.entries(s.st).forEach(([k, v]) => out[k] = (out[k] || 0) + v)); return out; }

/* ---------- automatic play (sims) ---------- */
// Makes the obvious choice at each offseason step. Stops (returns false) when the player has
// to decide something that can't be undone: where to sign, the draft.
function autoOffStep() {
  const s = offStep(); if (!s) return false;
  if (s === 'recruit') { offersList().slice(0, 2).forEach(o => { if (canVisit(o.id) === 'unofficial') doVisit(o.id); }); }
  if (s === 'camp' && !cs.off.camp) doCamp(cs.p.stars >= 4 ? 'national' : 'regional');
  if (s === 'signing' || (s === 'draft' && !cs.off.draftChoice)) return false;
  if (s === 'nmoney' && offBlocked()) return false;
  if (s === 'train') { if (!cs.off.grown) doOffseasonGrowth(); autoAssign(); }
  if (s === 'ntrain') { if (!cs.off.grown) nflOffGrowth(); autoAssign(); }
  offNext(); return true;
}
// Sim until `stop()` says so, a choice is needed, or `max` weeks pass.
function cSimUntil(stop, opt) {
  opt = opt || {}; let n = 0; const max = opt.max || 400;
  while (n++ < max && cs.phase !== 'done' && cs.phase !== 'retired') {
    if (stop && stop()) return 'stop';
    if (cs.event) { if (opt.events) cResolveEvent(0); else return 'event'; }
    if (cInSeason()) { const r = cSimWeek(); if (r && opt.log) opt.log.push(r); if (opt.spend) autoAssign(); }
    else if (cs.phase === 'hsoff' || cs.phase === 'coloff' || cs.phase === 'nfloff') { if (!autoOffStep()) return 'choice'; }
    else return 'choice';
  }
  return cs.phase === 'done' || cs.phase === 'retired' ? 'done' : n >= max ? 'max' : 'done';
}
// the spotlight games: the three toughest high school games, playoffs, ranked college opponents and the postseason
function isSpotlight() { const sp = myGameSpec(); return !!(sp && sp.big); }

/* ---------- saving ---------- */
// Player Career uses the same save queue as AD Mode (storage.js): per-slot sequence numbers,
// newest write wins, failed writes kept for retry. Created on first use so the engine still
// loads on its own (tests) without the page code.
const CSLOT_KEY = i => 'mfpc-slot-' + i, CMETA_KEY = 'mfpc-slots-meta', CACTIVE_KEY = 'mfpc-active';
let cslot = 1;
// Which mode's game the shared random stream belongs to right now. Only that mode may copy
// it into its save, so saving an inactive career never captures AD's random position.
let rngOwner = 'career';
let cSaveStatus = () => { };
let cq = null;
const CQ = () => cq || (cq = makeSaveQueue({ key: CSLOT_KEY, metaKey: CMETA_KEY, status: (i, good, metaOk) => cSaveStatus(i, good, metaOk) }));
function cSummary() { const p = cs.p; return { name: cName(p), pos: p.pos, year: cs.year, week: cs.week, lvl: cs.lvl, phase: cs.phase, cls: cs.lvl === 'nfl' ? nflYearLabel() : cs.lvl === 'hs' && cs.hs ? HS_CLS[Math.min(3, cs.hs.cls)] : cs.col ? colCls() : 'Recruit', team: cs.lvl === 'nfl' ? nflName(cs.nfl.tm) : cs.phase === 'done' ? 'Drafted: ' + cs.done.draft.team : cs.lvl === 'hs' ? (cs.hs ? cs.hs.name : '') : cs.col ? cTeamName(cs.col.tid) : 'Signing', stars: p.stars, ovr: cOvr(p), done: cs.phase === 'retired', saved: Date.now() }; }
function cMeta() { try { return JSON.parse(lsGet(CMETA_KEY) || '{}') || {}; } catch (e) { return {}; } }
function cSave() { if (!cs) return; if (rngOwner === 'career') cs.rng = RNG.s; CQ().push(cslot, JSON.stringify(cs), cSummary()); }
function cFlush() { return CQ().flush(); }
function cFlushSync() { CQ().flushSync(); }
// Saves now and waits. Resolves false when storage refused the write.
async function cSaveNow() { if (!cs) return true; cSave(); await cFlush(); return !CQ().failed[cslot]; }
function cSaveFailed() { return !!(cs && cq && cq.failed[cslot]); }
const CPHASES = ['hs', 'hsoff', 'sign', 'col', 'coloff', 'done', 'nfl', 'nfloff', 'retired'];
// Every structure the game reads, checked before a save is allowed to replace anything.
function cValidate(c) {
  const bad = m => { throw new Error(m); }; const num = v => typeof v === 'number' && Number.isFinite(v);
  if (!c || typeof c !== 'object' || c.kind !== 'career') bad('This is not a Player Career save.');
  const p = c.p; if (!p || typeof p !== 'object') bad('The player record is missing.');
  if (!CPOS.includes(p.pos)) bad('The player\'s position is damaged.');
  if (typeof p.first !== 'string' || typeof p.last !== 'string' || !CSTATES[p.home]) bad('The player\'s profile is damaged.');
  if (!p.a || typeof p.a !== 'object' || !CATTR[p.pos].every(([k]) => num(p.a[k]))) bad('The player\'s ratings are damaged.');
  if (!['xp', 'trust', 'bank', 'earned', 'spent', 'inj'].every(k => num(p[k]))) bad('The player record is damaged.');
  if (!Array.isArray(p.seasons) || !Array.isArray(p.awards) || !p.rec || typeof p.rec !== 'object') bad('The player\'s history is damaged.');
  const L = c.league; if (!L || typeof L !== 'object' || !L.teams || typeof L.teams !== 'object' || Object.keys(L.teams).length < 100) bad('The league data is incomplete.');
  Object.values(L.teams).forEach(t => { if (!t || typeof t.name !== 'string' || !CCONF[t.conf] || !num(t.rating) || !num(t.off) || !num(t.def) || !num(t.w) || !num(t.l) || !t.need) bad('A team record is damaged.'); });
  if (!Array.isArray(L.games) || !Array.isArray(L.polls) || !Array.isArray(L.hist) || !num(L.year) || !num(L.week)) bad('The league season is damaged.');
  L.games.forEach(g => { if (!g || !num(g.wk) || !g.h || !g.a || (!isFcsId(g.h) && !L.teams[g.h]) || (!isFcsId(g.a) && !L.teams[g.a])) bad('A game record is damaged.'); });
  if (!CPHASES.includes(c.phase) || !['hs', 'col', 'nfl'].includes(c.lvl) || !num(c.year) || !num(c.week) || !Array.isArray(c.news)) bad('The calendar is damaged.');
  if (!CDIFF[c.diff] || !['every', 'spotlight', 'sim'].includes(c.pace)) bad('The career settings are damaged.');
  if (c.lvl === 'hs') { const h = c.hs; if (!h || !Array.isArray(h.sched) || !(h.cls >= 0 && h.cls <= 3) || typeof h.name !== 'string') bad('The high school season is damaged.'); }
  if (c.lvl === 'hs' || c.phase === 'sign') { if (!c.rec || !c.rec.schools || typeof c.rec.schools !== 'object') bad('The recruiting data is damaged.'); }
  if (c.lvl === 'col' && c.phase !== 'sign') { const k = c.col; if (!k || !L.teams[k.tid] || !num(k.years) || !num(k.seasons) || !Array.isArray(k.teams)) bad('The college record is damaged.'); }
  if ((c.phase === 'hs' || c.phase === 'col' || c.phase === 'nfl') && (!c.ss || !Array.isArray(c.ss.games) || !c.ss.st)) bad('The season stats are damaged.');
  if (c.lvl === 'nfl') nflValidate(c, bad, num);
  // the offseason must be a real sequence of steps for its level, with the current step inside it (B08)
  if (c.phase === 'hsoff' || c.phase === 'coloff' || c.phase === 'nfloff') {
    const legal = { hsoff: ['review', 'signing', 'recruit', 'camp', 'train'], coloff: ['review', 'draft', 'portal', 'train'], nfloff: ['nreview', 'nmoney', 'ntrain'] }[c.phase];
    const o = c.off; if (!o || !Array.isArray(o.steps) || !o.steps.length || !o.steps.every(s => legal.includes(s)) || o.steps[0] !== legal[0] || !Number.isInteger(o.i) || o.i < 0 || o.i >= o.steps.length || !o.review || typeof o.review !== 'object') bad('The offseason is damaged.');
    if ((c.phase === 'hsoff') !== (c.lvl === 'hs') || (c.phase === 'nfloff') !== (c.lvl === 'nfl')) bad('The calendar is damaged.');
  }
  if ((c.phase === 'done' || c.lvl === 'nfl') && (!c.done || !c.done.draft)) bad('The career summary is damaged.');
  if (c.portal && (typeof c.portal.offers !== 'object' || !c.portal.offers)) bad('The transfer portal data is damaged.');
}
// Fills in fields added after a save was made.
function cMigrate(c) {
  c.v = 2; c.nilLog = c.nilLog || []; c.hist = c.hist || []; c.evLog = c.evLog || {}; c.bought = c.bought || {};
  const p = c.p; p.rec = Object.assign({ prod: 0, camp: 0, aa: 0 }, p.rec); if (p.stars0 == null && c.col) p.stars0 = p.stars;
  if (c.rec && c.rec.schools) (c.rec.visitLog || []).forEach(v => { if (v.kind === 'official' && c.rec.schools[v.tid]) c.rec.schools[v.tid].ov = true; });
  // draft rounds follow the shared round table (older saves used 32-pick rounds)
  if (c.done && c.done.draft && c.done.draft.pick) c.done.draft.round = pickRound(c.done.draft.pick);
  if (c.nfl && c.nfl.draft && c.nfl.draft.pick) c.nfl.draft.round = pickRound(c.nfl.draft.pick);
  if (c.col) { c.col.gs = c.col.gs != null ? c.col.gs : p.seasons.filter(x => x.lvl === 'col').reduce((a, x) => a + (x.gs || 0), 0); }
  return c;
}
// A game that was still going when the page closed is played to the final from its kickoff.
function cSettle() {
  if (cs.liveWk != null && cs.liveWk === cs.week && cInSeason()) { if (cs.liveRng) RNG.s = cs.liveRng >>> 0; const g = cStartGame(); if (g) { cgAutoplay(g); const rec = cFinishGame(g); cEndWeek(); cs.settled = rec; } }
  cs.liveWk = null;
}
let cValidateView = null; // set by the interface: renders every career screen as a final check
// Adopt a candidate career only if every check passes; otherwise put everything back.
function cAdopt(c) {
  const prev = { cs, rng: RNG.s, cg };
  try {
    cValidate(c); cMigrate(c);
    const fx = typeof xSanitize === 'function' ? xSanitize(c, CX_SHAPE) : [];
    cs = c; cg = null; rosterCache.clear(); RNG.s = (c.rng >>> 0) || freshSeed();
    cSettle();
    if (cValidateView) fx.push(...(cValidateView() || []));
    if (typeof cui !== 'undefined') cui.xFixed = fx.length ? fx : null;
    return true;
  } catch (e) { cs = prev.cs; cg = prev.cg; RNG.s = prev.rng; rosterCache.clear(); throw e; }
}
async function cLoadSlot(i) {
  const raw = lsGet(CSLOT_KEY(i)); if (!raw) return { ok: false, err: 'That slot is empty.' };
  let c; try { c = JSON.parse(await gunz(raw)); } catch (e) { cBadSlot(i); return { ok: false, err: `Slot ${i} could not be read: the saved data is damaged or incomplete.${cGoodHint(i)}` }; }
  try { cAdopt(c); cslot = i; lsSet(CACTIVE_KEY, String(i)); if (typeof keepGood === 'function') keepGood('mfpc-', i, raw); return { ok: true }; }
  catch (e) { console.error(e); cBadSlot(i); return { ok: false, err: `Slot ${i} could not be loaded: ${e && e.message ? e.message : 'the save could not be read.'}${cGoodHint(i)}` }; }
}
// a slot that would not load is remembered for this session, so the Saves page can offer its last good copy (QOL-12)
function cBadSlot(i) { if (typeof cui !== 'undefined') cui.badSlots = Array.from(new Set((cui.badSlots || []).concat(i))); }
function cGoodHint(i) { const g = typeof goodCopy === 'function' ? goodCopy('mfpc-') : null; return g && g.i === i ? ' A copy that loaded cleanly earlier can be restored on the Saves tab.' : ''; }
async function cDeleteSlot(i) { await cFlush(); CQ().retire(i); lsDel(CSLOT_KEY(i)); const m = cMeta(); delete m[i]; lsSet(CMETA_KEY, JSON.stringify(m)); }
// Save codes: the whole career as text, to back it up or move it to another browser.
async function cMakeCode() { if (rngOwner === 'career') cs.rng = RNG.s; return encodeCode(JSON.stringify(cs), 'MFPC'); }
async function cReadCode(code) { return decodeCode(code, 'MFPC'); }

/* ---------- college academics: a major, study hours, a GPA and eligibility ---------- */
// Two terms a season. Heavy study costs a little football growth, light study gives some back. A cumulative GPA
// under 2.0 at the start of a season means academic probation: you sit the first three games.
const MAJORS = { und: ['Undeclared', 0], comm: ['Communications', 0], sport: ['Sports management', 0], kin: ['Kinesiology', 0.1], edu: ['Education', 0.1], bus: ['Business', 0.2], psych: ['Psychology', 0.2], cs: ['Computer science', 0.4], eng: ['Engineering', 0.5] };
const STUDY = { light: ['Light', 2.35, 2], normal: ['Normal', 2.95, 0], heavy: ['Heavy', 3.45, -2] };
function acad() { if (!cs || !cs.col) return null; return cs.acad || (cs.acad = { major: 'und', study: 'normal', gpa: 3.0, terms: 0, pts: 0, boost: 0, susp: 0, hist: [] }); }
function setMajor(k) { const a = acad(); if (!a || !MAJORS[k] || (a.major !== 'und' && a.terms >= 6)) return false; a.major = k; return true; }
function setStudy(k) { const a = acad(); if (!a || !STUDY[k]) return false; a.study = k; return true; }
function acadBoost(v) { const a = acad(); if (a) a.boost = r1((a.boost || 0) + v); }
function acadTerms(e) {
  const a = acad(); if (!a) return; const st = STUDY[a.study] || STUDY.normal; const d = MAJORS[a.major][1]; const read = cs.p.a[CREAD[cs.p.pos]] || 70;
  [0, 1].forEach(t => { const h = hash(cs.seed + ':gpa:' + cs.year + ':' + t); const g = clamp(Math.round((st[1] - d + (read - 70) * 0.012 + (a.boost || 0) + (h - 0.5) * 0.9) * 100) / 100, 0.8, 4); a.pts += g; a.terms++; a.hist.push({ y: cs.year, t: t ? 'Spring' : 'Fall', g }); });
  a.gpa = Math.round(a.pts / a.terms * 100) / 100; a.boost = 0; if (st[2] > 0) grantXP(st[2]); else if (st[2] < 0) cs.p.xp = Math.max(0, cs.p.xp + st[2]);
  if (a.terms >= 8 && a.gpa >= 2 && !a.grad) { a.grad = cs.year; cNews(`${cName(cs.p)} graduates with a degree in ${a.major === 'und' ? 'general studies' : MAJORS[a.major][0].toLowerCase()} (GPA ${a.gpa.toFixed(2)}).`, 'win'); }
  if (e) e.gpa = a.gpa;
}
function acadSeasonStart() { const a = cs.acad; if (!a || !a.terms) return; a.susp = a.gpa < 2 ? 3 : 0; if (a.susp) cNews(`${cName(cs.p)} is on academic probation (GPA ${a.gpa.toFixed(2)}) and will sit out the first ${a.susp} games.`, 'bad'); }
function acadWeek(played) { const a = cs.acad; if (a && a.susp > 0 && cs.lvl === 'col' && played) { a.susp--; if (!a.susp) cNews(`${cName(cs.p)} is academically eligible again.`); } }

/* ---------- teammates ---------- */
// The players you compete with at your position and the team's quarterback (or top receiver, if you're the QB).
// Wins and good games bring you closer; beating a teammate out for snaps can sour him. Good chemistry builds your
// coach's trust every week; bad chemistry wears it down.
function mateList() {
  if (!cs || !cInSeason() || !cs.ss) return [];
  if (!cs.mates || cs.mates.y !== cs.year || cs.mates.lvl !== cs.lvl) {
    let all = []; try { all = myDepth().all.filter(x => !x.me); } catch (e) { all = []; }
    const keep = all.filter(x => x && x.n).slice(0, 2).map(x => ({ n: x.n, pos: x.pos, rival: true }));
    cs.mates = { y: cs.year, lvl: cs.lvl, list: keep };
  }
  const R_ = cs.rel || (cs.rel = {}); return cs.mates.list.map(m => Object.assign({ v: R_[m.n] == null ? 50 : R_[m.n] }, m));
}
const mate0 = () => mateList()[0] || null;
function mateAdj(n, d) { const R_ = cs.rel || (cs.rel = {}); R_[n] = clamp((R_[n] == null ? 50 : R_[n]) + d, 0, 100); }
function chemistry() { const m = mateList(); return m.length ? Math.round(m.reduce((s, x) => s + x.v, 0) / m.length) : 50; }
function matesAfterGame(played, won, grade) {
  const m = mateList(); if (!m.length) return; let rank = 0; try { rank = myDepth().rank; } catch (e) { rank = 0; }
  m.forEach((x, i) => { let d = won ? 1 : -0.5; if (played && (grade === 'A+' || grade === 'A')) d += 0.5; if (x.rival && rank < i + 1 && played) d -= 0.5; mateAdj(x.n, d); });
  const c = chemistry(); if (c >= 70) cs.p.trust = clamp(cs.p.trust + 0.5, 0, 100); else if (c <= 30) cs.p.trust = clamp(cs.p.trust - 0.5, 0, 100);
}

/* ---------- the record book (Player Career) ---------- */
// Every team you play for has a record book (single game, single season, career with that team), made up when you
// arrive and held by former players. Break a mark and it's yours. NFL single-season league records are the real
// ones. Breaking records unlocks Player Career achievements; your personal bests are kept alongside.
const CREC_KEYS = { pyd: 'Passing yards', ptd: 'Passing TDs', ryd: 'Rushing yards', rtd: 'Rushing TDs', rec: 'Receptions', recyd: 'Receiving yards', rectd: 'Receiving TDs', tkl: 'Tackles', sack: 'Sacks', dint: 'Interceptions', pan: 'Pancake blocks', fgm: 'Field goals made', puyd: 'Punting yards' };
const CREC_COL = { pyd: [450, 4300, 11000], ptd: [5, 40, 95], ryd: [230, 1750, 4300], rtd: [4, 21, 48], rec: [13, 100, 240], recyd: [210, 1500, 3500], rectd: [3, 15, 35], tkl: [15, 115, 320], sack: [3, 12, 28], dint: [2, 7, 15], pan: [5, 40, 120], fgm: [5, 26, 70], puyd: [420, 3300, 9000] };
const CREC_NFL = { pyd: [450, 4700, 40000], ptd: [5, 40, 290], ryd: [210, 1600, 9500], rtd: [3, 16, 80], rec: [13, 115, 800], recyd: [210, 1550, 11000], rectd: [3, 14, 80], tkl: [15, 140, 1000], sack: [3.5, 15, 80], dint: [2, 8, 40], pan: [5, 45, 300], fgm: [6, 40, 450], puyd: [450, 4500, 55000] };
const CREC_HS = [0.85, 0.8, 0.72];
const NFL_SEASON_REC = { pyd: 5477, ptd: 55, ryd: 2105, rtd: 28, rec: 149, recyd: 1964, rectd: 23, sack: 22.5, dint: 14, fgm: 44 }; // real NFL single-season records through 2025
const CACH = [
  ['c_game', 'Single-game record', 'Break your team\'s single-game record in a stat.'], ['c_season', 'Record season', 'Break your team\'s single-season record in a stat.'], ['c_career', 'All-time leader', 'Become your team\'s career leader in a stat.'],
  ['c_three', 'Rewrite the book', 'Hold three of your team\'s records at once.'], ['c_hs', 'Hometown legend', 'Break a high school record.'], ['c_col', 'Campus legend', 'Break a college program record.'],
  ['c_nfl', 'Franchise record', 'Break an NFL franchise record.'], ['c_league', 'League record', 'Break an NFL single-season record.'], ['c_ten', 'Record machine', 'Break ten records in your career.'],
];
const crecKeysFor = pos => Object.keys(CREC_KEYS).filter(k => (STAT_COLS[pos] || []).includes(k));
function cTeamNow() { return cs.lvl === 'hs' ? (cs.hs && cs.hs.name) : cs.lvl === 'nfl' ? (cs.nfl && cs.nfl.tm) : (cs.col && cs.col.tid); }
// former players who hold the marks (fictional)
function cRecName(h) { const F = ['Marcus', 'Devin', 'Tyler', 'Jamal', 'Cody', 'Andre', 'Bryce', 'Darius', 'Logan', 'Terrence', 'Shane', 'Malik', 'Grant', 'Reggie', 'Colt', 'Dante']; const L = ['Whitfield', 'Okafor', 'Brennan', 'Halsey', 'Merritt', 'Dupree', 'Kowalczyk', 'Ashford', 'Pruett', 'Lindqvist', 'Barksdale', 'Toomey', 'Escobar', 'Rourke', 'Haywood', 'Castellano']; return F[Math.floor(hash(h + 'f') * F.length)] + ' ' + L[Math.floor(hash(h + 'l') * L.length)]; }
function cTeamRec(lvl, team) {
  const T_ = cs.trec || (cs.trec = {}); const key = lvl + ':' + team; if (T_[key]) return T_[key];
  const rec = { lvl, team, game: {}, season: {}, career: {} };
  ['game', 'season', 'career'].forEach((tb, i) => Object.keys(CREC_KEYS).forEach(k => {
    const h = hash(cs.seed + ':trec:' + key + ':' + tb + ':' + k); const base = (lvl === 'nfl' ? CREC_NFL : CREC_COL)[k][i] * (lvl === 'hs' ? CREC_HS[i] : 1) * (0.82 + h * 0.3);
    rec[tb][k] = { v: k === 'sack' ? Math.round(base * 2) / 2 : Math.round(base), n: cRecName(h + ':' + key), y: (lvl === 'nfl' ? 1965 : 1975) + Math.floor(hash(h + 'y') * 50) };
  }));
  return T_[key] = rec;
}
function cUnlock(id) { const A = cs.cach || (cs.cach = {}); if (A[id]) return; A[id] = { y: cs.year }; const a = CACH.find(x => x[0] === id); if (a) cNews(`Achievement unlocked: ${a[1]}. ${a[2]}`, 'win'); }
function cRecBroke(tb, lvl, team, k, v, cur) {
  const log = cs.crLog || (cs.crLog = []); log.push({ y: cs.year, wk: cs.week, lvl, team, tb, k, v, pv: cur.v, pn: cur.n, py: cur.y }); if (log.length > 80) log.splice(0, log.length - 80);
  const where = lvl === 'nfl' && tb === 'league' ? 'NFL' : lvl === 'hs' ? team : lvl === 'nfl' ? nflName(team) : cTeamName(team);
  cNews(`Record! ${cName(cs.p)} breaks the ${where} ${tb === 'game' ? 'single-game' : tb === 'career' ? 'career' : 'single-season'} record for ${CREC_KEYS[k].toLowerCase()}: ${v} (old mark ${cur.v}${cur.n ? ', ' + cur.n : ''}${cur.y ? ', ' + cur.y : ''}).`, 'big');
  folGain(tb === 'league' ? 150000 : tb === 'career' ? 30000 : 12000);
  cUnlock(tb === 'league' ? 'c_league' : 'c_' + tb); cUnlock(lvl === 'hs' ? 'c_hs' : lvl === 'nfl' ? 'c_nfl' : 'c_col');
  if (log.length >= 10) cUnlock('c_ten');
}
// compare a set of numbers with one table of a team's book; your own marks just move up quietly
function cRecCheck(tb, vals, extra) {
  const lvl = cs.lvl, team = cTeamNow(); if (!team || !vals) return 0; const R_ = cTeamRec(lvl, team); let n = 0;
  Object.keys(CREC_KEYS).forEach(k => { const v = vals[k] || 0; const cur = R_[tb][k]; if (!v || !cur || v <= cur.v) return; R_[tb][k] = Object.assign({ v, n: cName(cs.p), y: cs.year, me: true }, extra || {}); if (!cur.me) { cRecBroke(tb, lvl, team, k, v, cur); n++; } });
  const held = ['game', 'season', 'career'].reduce((a, t) => a + Object.values(R_[t]).filter(x => x.me).length, 0); if (held >= 3) cUnlock('c_three');
  return n;
}
function cPB(tb, vals, extra) { const B = cs.pb || (cs.pb = { game: {}, season: {} }); Object.keys(CREC_KEYS).forEach(k => { const v = vals[k] || 0; if (v && (!B[tb][k] || v > B[tb][k].v)) B[tb][k] = Object.assign({ v, y: cs.year, lvl: cs.lvl }, extra || {}); }); }
// after each game you played
function cRecGame(rec) { if (!rec || !rec.line) return; const opp = String(rec.opp || ''); cPB('game', rec.line, { opp }); cRecCheck('game', rec.line, { opp }); }
// at the end of each season: season marks, career-with-this-team marks, and the NFL's single-season records
function cRecSeason(e) {
  if (!e || !e.st) return; cPB('season', e.st); cRecCheck('season', e.st);
  const tot = {}; cs.p.seasons.filter(s => s.lvl === e.lvl && s.team === e.team).forEach(s => Object.entries(s.st || {}).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; })); cRecCheck('career', tot);
  if (e.lvl === 'nfl') { const L = cs.lrec || (cs.lrec = {}); Object.keys(NFL_SEASON_REC).forEach(k => { const cur = L[k] || { v: NFL_SEASON_REC[k] }; const v = e.st[k] || 0; if (v > cur.v) { L[k] = { v, y: cs.year, me: true }; if (!cur.me) cRecBroke('league', 'nfl', 'NFL', k, v, cur); } }); }
}

/* ---------- draft night: the picks before yours, then the phone call ---------- */
function cDraftNightScript(r) {
  const out = []; const me = cName(cs.p); const h = k => hash((cs.seed || 0) + ':cdn:' + r.year + ':' + k); const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'OL', 'DE', 'DT', 'LB', 'CB', 'CB', 'S'];
  const cols = Object.keys((cs.league && cs.league.teams) || {}); const school = i => cols.length ? cTeamName(cols[Math.floor(h('c' + i) * cols.length)]) : 'a Power Four school';
  const mySchool = cs.col && cs.col.tid ? cTeamName(cs.col.tid) : '';
  out.push({ k: 'open', txt: r.udfa ? `Draft night, ${r.year}. You watch at home with your family, phone face up on the table.` : `Draft night, ${r.year}. You are in the green room${r.round === 1 ? ' in a new suit' : ''}, your family at the table with you.${r.round <= 2 ? ' Your agent thinks it will be early.' : ' Your agent says to be patient.'}` });
  if (!r.udfa) {
    const pk = r.pick, from = Math.max(1, pk - 5);
    if (from > 1) out.push({ k: 'break', txt: pk <= 32 ? `The first ${from - 1} picks go by.` : `Round 1 ends without your name.${pk > 64 ? ' Then round 2.' : ''} Day ${pk > 100 ? 3 : 2} begins.` });
    for (let i = from; i < pk; i++) { const tm = NFL_TEAMS[Math.floor(h('t' + i) * NFL_TEAMS.length)]; out.push({ k: 'pick', txt: `Pick ${i}: the ${tm} take ${POS[Math.floor(h('p' + i) * POS.length)]} ${cRecName((cs.seed || 0) + ':cdn:' + i)}, ${school(i)}.` }); }
    out.push({ k: 'break', txt: `The ${r.team} are on the clock. Your phone lights up.` });
    out.push({ k: 'mine', txt: `With pick ${pk} in round ${r.round}, the ${r.team} select ${cs.p.pos} ${me}${mySchool ? ', ' + mySchool : ''}!`, say: `Head coach, ${r.team}: "${['We have had our eye on you since the combine. Welcome to the family.', 'We were not going to let you get past us. Get on a plane.', 'You are exactly what we were looking for. Let us go win some games.'][Math.floor(h('q') * 3)]}"` });
  } else {
    out.push({ k: 'break', txt: 'Round after round goes by. The seventh round ends, and your name is never called.' });
    out.push({ k: 'mine', txt: `Ten minutes later the ${r.team} call with a free-agent contract. You are going to camp.`, say: `Your agent: "Undrafted is just a word. Now you go earn it."` });
  }
  const rv = cs.rival && cs.rival.draft; if (rv && rv.y === r.year) out.push({ k: 'break', txt: rv.udfa ? `Your rival ${cs.rival.n} goes undrafted.` : `Your rival ${cs.rival.n} went in round ${rv.round}, pick ${rv.pick}, to the ${rv.team}.${!r.udfa && r.pick < rv.pick ? ' You went first.' : ''}` });
  out.push({ k: 'end', txt: 'Your contract offer and your NFL decision are on the Home tab.' });
  return out;
}

/* ---------- v9.9: your agent, rehab for your own injuries, a rival, and the turn-pro decision ---------- */
const AGENTS = {
  shark: { n: 'Vic Marrone', t: 'The shark', fee: 0.04, pay: 1.08, hold: 0.12, brand: 1, d: 'Gets the biggest numbers and is not afraid of a holdout. Takes 4%.' },
  steady: { n: 'Dana Whitfield', t: 'The steady hand', fee: 0.03, pay: 1.03, hold: 0, brand: 1.05, d: 'Trusted by every front office. Fewer fights and steady raises. Takes 3%.' },
  brand: { n: 'Kiara Bell', t: 'The brand builder', fee: 0.03, pay: 1, hold: 0, brand: 1.3, d: 'Builds your name off the field: more and bigger endorsements. Takes 3%.' },
};
function agentOf() { return cs && cs.agent && AGENTS[cs.agent] ? AGENTS[cs.agent] : null; }
const agentFee = () => (agentOf() ? agentOf().fee : 0), agentPay = () => (agentOf() ? agentOf().pay : 1);
function setAgent(k) { if (!AGENTS[k] || !cs || cs.agent) return false; cs.agent = k; cNews(`${cName(cs.p)} signs with agent ${AGENTS[k].n} (${AGENTS[k].t.toLowerCase()}).`); return true; }
// rehab: how you come back from an injury that costs you two or more weeks
const CREHAB = {
  rush: { t: 'Rush back', f: 0.6, risk: 2.2, d: 'Back much sooner, but the injury risk is more than double for a month.' },
  std: { t: 'The normal plan', f: 1, risk: 1, d: 'Follow the trainers. Back on the usual timeline.' },
  safe: { t: 'Take it slow', f: 1.35, risk: 0.6, xp: 2, d: 'Out a little longer, safer when you return, and extra film study (+2 skill points).' },
};
function cRehabAsk() { const p = cs && cs.p; return !!(p && p.inj >= 2 && p.inj < 30 && !p.rehab && cs.phase !== 'done'); }
function setCRehab(k) {
  const p = cs.p, R_ = CREHAB[k]; if (!R_ || !cRehabAsk()) return false; p.rehab = k; p.inj = Math.max(1, Math.round(p.inj * R_.f));
  p.rehabRisk = { y: cs.year, w: cs.week + p.inj + 4, m: R_.risk }; if (R_.xp) grantXP(R_.xp);
  cNews(k === 'rush' ? `${cName(p)} pushes to get back early: ${p.inj} week${p.inj > 1 ? 's' : ''}.` : k === 'safe' ? `${cName(p)} takes the slow road back: ${p.inj} weeks.` : `${cName(p)} follows the normal rehab plan.`); return true;
}
function cRehabF() { const r = cs && cs.p && cs.p.rehabRisk; return r && r.y === cs.year && cs.week <= r.w ? r.m : 1; }
// a rival: a player at your position at another school, the one everyone compares you with
const RIVAL_KEY = { QB: ['pyd', 3000, 'passing yards'], RB: ['ryd', 1100, 'rushing yards'], WR: ['recyd', 950, 'receiving yards'], TE: ['recyd', 600, 'receiving yards'], OL: ['pan', 45, 'pancake blocks'], CB: ['dint', 3, 'interceptions'], S: ['tkl', 70, 'tackles'], DE: ['sack', 8, 'sacks'], DT: ['tkl', 45, 'tackles'], LB: ['tkl', 90, 'tackles'], K: ['fgm', 18, 'field goals'], P: ['puyd', 3300, 'punting yards'] };
function rivalInit() {
  if (!cs || cs.rival || !cs.col || !cs.league) return null; const L = cs.league; const h = k => hash((cs.seed || 0) + ':rival:' + k);
  const ids = Object.keys(L.teams).filter(id => id !== cs.col.tid && L.teams[id].rating >= 72).sort(); if (!ids.length) return null;
  const tid = ids[Math.floor(h('t') * ids.length)]; const base = cOvr(cs.p) + Math.round((h('o') - 0.4) * 6);
  cs.rival = { n: cRecName((cs.seed || 0) + ':rival'), pos: cs.p.pos, tid, ovr: base, y0: cs.year, seasons: [], h2h: [0, 0] };
  cNews(`Meet your rival: ${cs.rival.n}, a ${CPOS_NAME[cs.p.pos].toLowerCase()} at ${cTeamName(tid)}. The recruiting sites have compared you two for years.`); return cs.rival;
}
function rivalSeason(e) {
  const r = cs.rival; if (!r || r.seasons.some(s => s.y === e.year) || r.draft) return; const h = k => hash((cs.seed || 0) + ':rs:' + e.year + ':' + k);
  r.ovr = Math.min(97, r.ovr + 1 + Math.round(h('g') * 3)); const ratio = r1(clamp(1 + (r.ovr - 78) * 0.05 + (h('r') - 0.5) * 0.5, 0.45, 2.1)); const K = RIVAL_KEY[r.pos] || ['tkl', 60, 'tackles'];
  const s = { y: e.year, ratio, v: Math.round(K[1] * ratio * (0.85 + h('v') * 0.3)), mine: e.st[K[0]] || 0, myRatio: e.ratio };
  if (ratio >= 1.6 && h('a') < 0.5) s.aw = 'First-team All-American'; r.seasons.push(s);
  const beat = rivalBeat(s); cNews(beat ? `You out-played your rival ${r.n} this season: ${s.mine} ${K[2]} to his ${s.v}.` : `${r.n} had the better season: ${s.v} ${K[2]} to your ${s.mine}.`);
}
function rivalBeat(s) { return s.mine > s.v || (s.mine === s.v && (s.myRatio || 0) > s.ratio); }
function rivalGame(opp, won) { const r = cs.rival; if (!r || r.draft || opp !== r.tid) return; r.h2h[won ? 0 : 1]++; cNews(won ? `You beat ${r.n} and ${cTeamName(r.tid)} head to head.` : `${r.n} and ${cTeamName(r.tid)} get the better of you this time.`, won ? 'win' : 'bad'); }
function rivalDraft(year) { const r = cs.rival; if (!r || r.draft) return r ? r.draft : null; const h = hash((cs.seed || 0) + ':rd:' + year); const pk = clamp(Math.round((93 - r.ovr) * 11 + h * 24 + POS_DRAFT_PEN(r.pos)), 1, 300); r.draft = pk > 257 ? { y: year, udfa: true } : { y: year, pick: pk, round: pickRound(pk), team: NFL_TEAMS[Math.floor(hash((cs.seed || 0) + ':rdt:' + year) * NFL_TEAMS.length)] }; return r.draft; }
const POS_DRAFT_PEN = pos => -(POS_DRAFT[pos] || 0) * 10;
// the turn-pro decision: what each voice in your life tells you
function turnProVoices() {
  const sc = draftProjection(), rg = draftRange(sc), mid = rg ? Math.round((rg[0] + rg[1]) / 2) : 0; const rd = rookieDeal(mid); const left = eligibilityLeft(); const a = acad();
  const coachV = cs.p.trust >= 70 ? (left > 0 ? 'We would love one more year, but I will not stand in your way. You have earned this.' : 'You are ready. Go get it.') : left > 0 ? 'Another year with us and you will go a lot higher. I would come back.' : 'Your time here is done. Make the most of it.';
  const famV = a && a.terms ? `You are ${Math.min(100, Math.round(a.terms / 8 * 100))}% of the way to your degree. ${left > 0 && a.terms < 8 ? 'Your family would love to see you walk at graduation.' : 'Your family is proud either way.'}` : 'Your family wants whatever keeps you healthy and happy.';
  const scoutV = rg ? `Scouts have you between pick ${rg[0]} and pick ${rg[1]}. A rookie deal there is worth about ${money(rd.apy)} a year for ${rd.yrs} years.` : 'Scouts do not have you on a draft board yet. You would be an undrafted free agent.';
  const backV = left > 0 ? `Coming back: another season of NIL (${money(cs.col.nil || 0)} a year), about a ${Math.round(cInjChance() * 12 * 100)}% chance of an injury, and a chance to climb the board.` : '';
  return { sc, rg, rd, coachV, famV, scoutV, backV, rival: cs.rival && cs.rival.seasons.length ? cs.rival : null };
}

