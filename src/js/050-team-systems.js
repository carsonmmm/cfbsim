/* ===================== TEAM IDENTITY (schemes) =====================
 * Every team runs an offense and a defense. A scheme decides which player traits count most (scheme fit),
 * and some schemes match up better against others. The effects are kept small: about ±1.5 points of unit
 * rating from fit, ±0.6 from the matchup and -1 for each of the first two games after a switch.
 * Your scheme comes from your coordinators unless the person in charge picked one (state.schSet).
 * No DOM here. */
const OFF_SCH = {
  pro: { n: 'Pro style', d: 'Balanced: under center or in the shotgun, run and pass.', key: { QB: ['acc'], TE: ['blk'], RB: ['pow'] } },
  spread: { n: 'Spread option', d: 'Speed in space and a quarterback who runs.', key: { QB: ['mob'], RB: ['spd'], WR: ['spd'], OL: ['rbk'] } },
  air: { n: 'Air raid', d: 'Four and five receivers, throwing all over the field.', key: { QB: ['arm', 'acc'], WR: ['rte', 'hnd'], OL: ['pbk'] } },
  power: { n: 'Power run', d: 'Downhill running behind big linemen and a blocking tight end.', key: { RB: ['pow'], OL: ['rbk'], TE: ['blk'] } },
  wc: { n: 'West Coast', d: 'Short, quick timing throws that work like runs.', key: { QB: ['acc'], WR: ['rte'], TE: ['hnd'], RB: ['hnd'] } },
};
const DEF_SCH = {
  d43: { n: '4-3', d: 'Four linemen who rush; linebackers who tackle.', key: { DE: ['rsh'], DT: ['rnd'], LB: ['tkl'] } },
  d34: { n: '3-4', d: 'Big men up front eat blocks; linebackers make the plays.', key: { DT: ['rnd'], DE: ['rnd'], LB: ['rsh', 'tkl'] } },
  blitz: { n: 'Blitz-heavy', d: 'Pressure from everywhere, tight coverage behind it.', key: { LB: ['rsh'], DE: ['rsh'], S: ['cov'] } },
  zone: { n: 'Zone coverage', d: 'Keep everything in front and make them drive the field.', key: { CB: ['cov'], S: ['cov'], LB: ['cov'] } },
};
// how much better each offense does against each defense (points of drive rating for the offense)
const SCH_MU = {
  pro: { d43: 0, d34: 0, blitz: 0, zone: 0 },
  spread: { d43: 0.3, d34: 0.2, blitz: -0.6, zone: 0 },
  air: { d43: 0.3, d34: 0, blitz: 0.6, zone: -0.6 },
  power: { d43: 0, d34: -0.5, blitz: -0.2, zone: 0.6 },
  wc: { d43: 0, d34: 0.2, blitz: 0.4, zone: -0.4 },
};
const OFF_KEYS = Object.keys(OFF_SCH), DEF_KEYS = Object.keys(DEF_SCH);
// a team's own identity, from how it plays (team style) and a fixed per-team draw
function defaultScheme(id, st) {
  st = st || { run: 0, pass: 0, runD: 0, passD: 0 }; const h1 = hash(id + ':so'), h2 = hash(id + ':sd');
  const off = st.pass - st.run > 2 ? (h1 < 0.6 ? 'air' : 'wc') : st.run - st.pass > 2 ? (h1 < 0.55 ? 'power' : 'spread') : OFF_KEYS[Math.floor(h1 * OFF_KEYS.length)];
  const def = st.passD - st.runD > 2 ? (h2 < 0.5 ? 'zone' : 'd34') : st.runD - st.passD > 2 ? (h2 < 0.5 ? 'd43' : 'blitz') : DEF_KEYS[Math.floor(h2 * DEF_KEYS.length)];
  return { off, def };
}
// what a coach likes to run (fixed per coach)
function coachSch(c) { if (!c || c.me) return null; if (!c.sch) c.sch = { off: OFF_KEYS[Math.floor(hash(c.name + ':o') * OFF_KEYS.length)], def: DEF_KEYS[Math.floor(hash(c.name + ':d') * DEF_KEYS.length)] }; return c.sch; }
// who may pick your scheme: a head coach both sides, a coordinator his side, a GM through his head coach
function canSetScheme(side) { if (isCoach()) { const r = state.co.role; return r === 'HC' || (side === 'off' && r === 'OC') || (side === 'def' && r === 'DC'); } return typeof isGM === 'function' && isGM(); }
function myScheme() {
  const t = T(ME); if (!t) return { off: 'pro', def: 'd43' }; if (!t.scheme) t.scheme = defaultScheme(ME, t.style);
  let off = t.scheme.off, def = t.scheme.def; const s = state.staff || {};
  const oc = coachSch(s.OC), dc = coachSch(s.DC); if (oc) off = oc.off; if (dc) def = dc.def;
  const set = state.schSet; if (set && set.tid === ME && (!isCoach() || set.role === state.co.role)) { if (set.off) off = set.off; if (set.def) def = set.def; }
  return { off, def };
}
function teamScheme(id) { if (id === ME) return myScheme(); const t = T(id); if (!t) return null; if (!t.scheme) t.scheme = defaultScheme(id, t.style); return t.scheme; }
function setScheme(side, k) {
  if (!canSetScheme(side) || !(side === 'off' ? OFF_SCH : DEF_SCH)[k]) return false;
  const cur = state.schSet && state.schSet.tid === ME && (!isCoach() || state.schSet.role === state.co.role) ? state.schSet : { tid: ME, role: isCoach() ? state.co.role : 'GM' };
  cur[side] = k; state.schSet = cur; return true;
}
// a player's fit: how his scheme-key traits compare with his overall (null when the scheme doesn't key on his position)
function playerFit(p, sch) {
  sch = sch || myScheme(); if (!p || !sch) return null; const keys = (OFF_SCH[sch.off].key[p.pos] || DEF_SCH[sch.def].key[p.pos]); const tr = p.tr || (typeof hashTraits === 'function' ? hashTraits(p) : null);
  if (!keys || !tr) return null; return Math.round(keys.reduce((s, k) => s + (tr[k] != null ? tr[k] : p.ovr), 0) / keys.length - p.ovr);
}
const fitLabel = f => (f == null ? '' : f >= 3 ? 'Great fit' : f >= -2 ? 'Fits' : 'Poor fit');
const schemeKeyPos = (pos, sch) => { sch = sch || myScheme(); return !!(OFF_SCH[sch.off].key[pos] || DEF_SCH[sch.def].key[pos]); };
// fit of your starters: unit bonus for offense and defense
function schemeFitBonus() {
  const sch = myScheme(); const side = (S, list) => { const f = []; list.forEach(pos => { if (!S.key[pos]) return; starters(pos).forEach(p => { const x = playerFit(p, sch); if (x != null) f.push(x); }); }); return f.length ? clamp(f.reduce((a, b) => a + b, 0) / f.length * 0.35, -1.5, 1.5) : 0; };
  return { off: r1(side(OFF_SCH[sch.off], ['QB', 'RB', 'WR', 'TE', 'OL'])), def: r1(side(DEF_SCH[sch.def], ['DE', 'DT', 'LB', 'CB', 'S'])) };
}
// the matchup with an opponent, for your offense and your defense (positive is good for you)
function schemeEdge(opp) { const a = myScheme(), b = teamScheme(opp); if (!b) return { off: 0, def: 0 }; return { off: SCH_MU[a.off][b.def] || 0, def: -(SCH_MU[b.off][a.def] || 0) }; }
// a new scheme takes two games to install; called when one of your games starts
function schemeGameStart() {
  const cur = myScheme(); const last = state.schLast; const inst = state.schInst || (state.schInst = { off: 0, def: 0 });
  if (last && last.tid === ME) { if (last.off !== cur.off) inst.off = 2; if (last.def !== cur.def) inst.def = 2; }
  state.schLast = { tid: ME, off: cur.off, def: cur.def };
  const pen = { off: inst.off > 0 ? -1 : 0, def: inst.def > 0 ? -1 : 0 }; if (inst.off > 0) inst.off--; if (inst.def > 0) inst.def--; return pen;
}
const schemeInstalling = () => { const i = state.schInst; return i ? { off: i.off > 0, def: i.def > 0 } : { off: false, def: false }; };

/* ===================== RELATIONSHIPS =====================
 * Rapport (0-100, 60 to start) between you and your players (p.rap), your assistant coaches (c.rap) and,
 * for a coach or a GM, your boss (state.rel: the AD, head coach or owner). In AD mode the Board of Regents
 * and the boosters are the existing meters. Every change keeps a short reason. No DOM here. */
const REL0 = 60;
const rapOf = x => (x && x.rap != null ? x.rap : REL0);
const rapLabel = v => (v >= 80 ? 'Close' : v >= 63 ? 'Good' : v >= 45 ? 'Neutral' : v >= 30 ? 'Strained' : 'Broken');
function rapAdj(x, d, why) { if (!x || !d) return; const v = clamp(Math.round((rapOf(x) + d) * 10) / 10, 0, 100); if (v === rapOf(x) && x.rap != null) return; x.rap = v; if (why) x.rapW = [{ d: Math.round(d), why, s: state.season }].concat((x.rapW || []).filter(w => w.why !== why)).slice(0, 4); }
// a new boss starts fresh: the record is tied to your team and role
function bossRel() { const role = isCoach() ? state.co.role : 'GM'; if (!state.rel || (state.rel.tid && (state.rel.tid !== ME || state.rel.role !== role))) state.rel = { rap: 55, tid: ME, role }; else if (!state.rel.tid) Object.assign(state.rel, { tid: ME, role }); return state.rel; }
const hasBoss = () => isCoach() || (typeof isGM === 'function' && isGM() && !isOwner());
const bossName = () => (isCoach() ? (state.co.role === 'HC' ? (typeof isPro === 'function' && isPro() ? 'Ownership' : 'Your athletic director') : 'Your head coach') : 'The owner');
// after each of your games: playing time, the result and how it compares with expectations
function relAfterGame(g, win) {
  const pre = g.preWP != null ? g.preWP : 0.5;
  POS_ORDER.forEach(pos => {
    if (['K', 'P', 'LS'].includes(pos)) return; const dep = (state.depth[pos] || []).map(P).filter(Boolean); const n = START[pos];
    const top = dep.filter(avail).slice().sort((a, b) => b.ovr - a.ovr).slice(0, n).map(p => p.id);
    dep.forEach((p, i) => {
      if (!avail(p)) return;
      if (p.rap != null && p.rap !== REL0) p.rap = Math.round((p.rap + (REL0 - p.rap) * 0.04) * 10) / 10; // feelings fade a little every week
      if (i < n) { if (win) rapAdj(p, 0.5, 'Starting and winning'); }
      else if (top.includes(p.id) && p.ovr >= 60) rapAdj(p, p.pers === 'diva' ? -6 : -3, 'Benched behind lower-rated players');
    });
  });
  const st = state.staff || {}; STAFF_ROLES.forEach(r => { const c = st[r]; if (c && !c.me) rapAdj(c, win ? 0.5 : -0.3, win ? 'Winning' : null); });
  if (hasBoss()) { if (win && pre < 0.4) rapAdj(bossRel(), 3, 'Upset win'); else if (!win && pre > 0.7) rapAdj(bossRel(), -3, 'Loss as a favorite'); else rapAdj(bossRel(), win ? 0.5 : -0.5, null); }
  // the locker room's mood follows the starters' rapport
  rateLogPush();
  const st22 = POS_ORDER.flatMap(pos => starters(pos)); if (st22.length && state.meters) { const avg = st22.reduce((s, p) => s + rapOf(p), 0) / st22.length; if (Math.abs(avg - REL0) >= 8) state.meters.morale = clamp(state.meters.morale + (avg > REL0 ? 1 : -1), 0, 100); }
}
// players who are unhappy with you, worst first
const unhappy = () => state.roster.filter(p => rapOf(p) < 35).sort((a, b) => rapOf(a) - rapOf(b));

/* ===================== LEGACY: timeline, ratings by week, highlights, Hall of Fame, long-term goals =====================
 * No DOM here. */
// the big moments of every season (the newswire only keeps the latest 100 items)
function tlPush(txt, kind) {
  if (typeof state === 'undefined' || !state || !['big', 'win', 'bad'].includes(kind)) return;
  const t = state.tline || (state.tline = []); t.push({ s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, lv: typeof isPro === 'function' && isPro() ? 'nfl' : 'col', txt, k: kind });
  if (t.length > 700) t.splice(0, t.length - 700);
}
// your team's game-day rating after each of your games (for the season highlights chart)
function rateLogPush() { const rl = state.rateLog || (state.rateLog = []); rl.push({ s: state.season, wk: state.week, v: Math.round(michStrength().ovr * 10) / 10 }); if (rl.length > 80) rl.splice(0, rl.length - 80); }
// End of season: the plays, wins and players worth remembering. Works in college and the NFL.
function buildHighlights(extra) {
  const games = mGames().filter(g => g.done); if (!games.length) return null;
  const sc = g => { const a = g.h === ME ? g.hs : g.as, b = g.h === ME ? g.as : g.hs; return a + '-' + b; };
  const plays = [];
  games.forEach(g => { const b = g.box; if (!b || !b.plays) return; const ids = [g.h, g.a]; b.plays.forEach(pl => { if (ids[pl.s] !== ME || pl.to || pl.miss || !(pl.y >= 20)) return; plays.push({ txt: pl.txt, y: pl.y, np: pl.np || 0, opp: teamName(oppOf(g)), wk: g.wk, q: pl.q, c: pl.c, gid: g.id }); }); });
  plays.sort((a, b) => b.y - a.y);
  const elo = id => (T(id) ? T(id).elo || T(id).rating * 20 : 1200);
  const wins = games.filter(g => g.mResult === 'W').sort((a, b) => elo(oppOf(b)) - elo(oppOf(a))).slice(0, 3).map(g => ({ opp: teamName(oppOf(g)), score: sc(g), wk: g.wk, gid: g.id, name: g.name || '' }));
  const close = games.filter(g => g.mResult === 'W' && Math.abs(g.hs - g.as) <= 3).map(g => ({ opp: teamName(oppOf(g)), score: sc(g), wk: g.wk, gid: g.id, ot: !!g.ot }));
  const rating = (state.rateLog || []).filter(x => x.s === state.season).map(x => ({ wk: x.wk, v: x.v }));
  const top = state.roster.filter(p => p.st && Object.keys(p.st).length).map(p => ({ n: p.n, pos: p.pos, sc: typeof heisScore === 'function' ? heisScore(p.st, p.pos, ME) : 0, line: statLineRaw(p.pos, p.st) })).sort((a, b) => b.sc - a.sc).slice(0, 3);
  const w = games.filter(g => g.mResult === 'W').length, l = games.length - w;
  const hl = Object.assign({ s: state.season, rec: w + '-' + l, plays: plays.slice(0, 5), wins, close: close.slice(0, 3), rating, top }, extra || {});
  const all = state.hl || (state.hl = {}); all[state.season] = hl; const keys = Object.keys(all).sort(); while (keys.length > 30) delete all[keys.shift()];
  return hl;
}
// Hall of Fame (college): players who leave with a great career go in automatically. Real people are left out.
function hofScore(p) {
  const aw = (p.awards || []).map(String); let sc = 0; const why = [];
  aw.forEach(a => { if (/Heisman/i.test(a)) { sc += 60; why.push(a); } else if (/First-team All-America/i.test(a)) { sc += 30; why.push(a); } else if (/All-America/i.test(a)) { sc += 18; why.push(a); } else { sc += 6; } });
  const big = (p.hist || []).filter(h => h.ovr >= 86).length; if (big) { sc += big * 8; why.push(`${big} season${big > 1 ? 's' : ''} rated 86 or better`); }
  if ((p.ovr || 0) >= 92) { sc += 15; why.push('One of the best players in the country'); }
  return { sc, why };
}
function hofConsider(p, left) {
  if (!p || p.real) return null; const h = hofScore(p); if (h.sc < 45) return null;
  const list = state.hof || (state.hof = []); if (list.some(x => x.pid === p.id)) return null;
  const yrs = (p.hist || []).map(x => x.s); const e = { pid: p.id, n: p.n, pos: p.pos, num: p.num, from: yrs.length ? Math.min(...yrs) : left, to: left, why: h.why.slice(0, 3), s: state.season };
  list.push(e); addNews(`${p.n} (${p.pos}) goes into the ${myName()} Hall of Fame.`, 'big'); return e;
}
// retired numbers stay off the roster
const retiredNums = () => new Set((state.retNums || []).map(x => x.num));
function retireNumber(pid) { const e = (state.hof || []).find(x => x.pid === pid); if (!e || e.num == null || retiredNums().has(e.num)) return false; (state.retNums || (state.retNums = [])).push({ num: e.num, n: e.n, pos: e.pos, s: state.season }); addNews(`${myName()} retires No. ${e.num} in honor of ${e.n}.`, 'big'); return true; }
// Long-term goals: tracked across every job and level (state.mile travels with you between college and the NFL)
const MILES = [
  { id: 'm_100w', n: 'Century mark', d: 'Win 100 games in your career.', p: m => [m.wins, 100] },
  { id: 'm_20s', n: 'Lifer', d: 'Complete 20 seasons.', p: m => [m.seasons, 20] },
  { id: 'm_3natl', n: 'Dynasty', d: 'Win three national championships.', p: m => [m.natl, 3] },
  { id: 'm_3teams', n: 'Wherever you go', d: 'Win a title (conference, national or Super Bowl) with three different teams.', p: m => [(m.titleTeams || []).length, 3] },
  { id: 'm_10po', n: 'Postseason regular', d: 'Make the playoffs 10 times (College Football Playoff or NFL).', p: m => [m.po, 10] },
  { id: 'm_sb', n: 'Lombardi', d: 'Win a Super Bowl.', p: m => [m.sb, 1] },
  { id: 'm_double', n: 'Both summits', d: 'Win a national championship and a Super Bowl.', p: m => [Math.min(1, m.natl) + Math.min(1, m.sb), 2] },
  { id: 'm_5conf', n: 'Conference kings', d: 'Win five conference titles.', p: m => [m.conf, 5] },
];
function mileRec() { if (!state.mile) state.mile = { seasons: 0, wins: 0, natl: 0, sb: 0, conf: 0, po: 0, titleTeams: [], done: {} }; return state.mile; }
function recordMile(o) {
  const m = mileRec(); m.seasons++; m.wins += o.w || 0; if (o.natl) m.natl++; if (o.sb) m.sb++; if (o.conf) m.conf++; if (o.po) m.po++;
  if ((o.natl || o.sb || o.conf) && !m.titleTeams.includes(o.tm)) m.titleTeams.push(o.tm);
  const got = [];
  MILES.forEach(x => { if (m.done[x.id]) return; const [a, b] = x.p(m); if (a >= b) { m.done[x.id] = state.season; got.push(x.n); addNews(`Long-term goal reached: ${x.n}. ${x.d}`, 'big'); } });
  return got;
}

/* ===================== AD MODE: media rights and moving conferences ===================== */
// The conference's TV deal comes up every few years. The AD pushes the conference one way at the board meeting.
const MEDIA_PLANS = {
  linear: { n: 'Traditional TV', d: 'Network and cable games. Steady money, the usual exposure.', amt: 0, rec: 0, fan: 0 },
  stream: { n: 'Streaming-first', d: 'More money (+$4M a year), but fewer people see your games: recruiting and fans dip a little.', amt: 4, rec: -2, fan: -2 },
  exposure: { n: 'Exposure-first', d: 'Less money (−$2M a year) for more national windows: recruiting and fans get a boost.', amt: -2, rec: 2, fan: 2 },
};
function mediaRec() { if (!state.media) { const h = hash((state.seed || 0) + ':media:' + ME); state.media = { plan: 'linear', thru: state.season + 1 + Math.floor(h * 3) }; } return state.media; }
const mediaDue = () => !isCoach() && state.phase === 'offseason' && mediaRec().thru <= state.season + 1;
const mediaAmt = () => (state.media && MEDIA_PLANS[state.media.plan] ? MEDIA_PLANS[state.media.plan].amt : 0);
const mediaRec2 = () => (state.media && MEDIA_PLANS[state.media.plan] ? MEDIA_PLANS[state.media.plan].rec : 0);
// odds the conference goes your way: your program's pull inside the league
function mediaOdds() { const t = T(ME); const peers = Object.values(state.teams).filter(x => x.conf === t.conf); const rank = peers.filter(x => x.rating > t.rating).length; return clamp(0.75 - rank * 0.06 + (state.meters.board - 60) / 200, 0.15, 0.9); }
function settleMedia(want) {
  const M = mediaRec(); const ok = want === 'linear' || R() < mediaOdds(); const plan = ok ? want : M.plan; const was = M.plan;
  M.plan = plan; M.thru = state.season + 7; M.signed = state.season + 1;
  if (MEDIA_PLANS[plan].fan) state.meters.fan = clamp(state.meters.fan + MEDIA_PLANS[plan].fan, 0, 100);
  const txt = `${CONFS[T(ME).conf].name} media rights: ${ok ? '' : 'the conference went another way. '}${MEDIA_PLANS[plan].n} deal through ${M.thru}.`;
  addNews(txt, ok && plan !== was ? 'big' : ''); return txt;
}
// Applying to another conference: the league decides on your program's pull, the market and how it's run.
function moveOdds(to) {
  const t = T(ME); const C = CONFS[to]; if (!C || to === t.conf || to === 'IND') return 0;
  const avg = Object.values(state.teams).filter(x => x.conf === to); const bar = avg.length ? avg.reduce((s, x) => s + x.rating, 0) / avg.length : 70;
  return clamp(0.35 + (t.rating - bar) * 0.04 + (state.meters.fan - 60) / 150 + (facLvl('building') - 3) * 0.05 + (rankOf(ME) ? 0.1 : 0), 0.03, 0.9);
}
const moveFee = to => r1(CONFS[T(ME).conf].p4 ? 18 : 6);
function tryMove(to) {
  const odds = moveOdds(to); if (!odds) return null; const ok = R() < odds; const fee = moveFee(to);
  if (ok) { state.myMove = { s: state.season, to, fee }; state.fin.balance -= fee; if (state.fin.ytd) state.fin.ytd.eventx = (state.fin.ytd.eventx || 0) + fee; addNews(`${myName()} accepts an invitation to join the ${CONFS[to].name} next season. Exit fee: $${fee}M.`, 'big'); }
  else addNews(`The ${CONFS[to].name} turns down ${myName()}'s application.`, 'bad');
  return ok;
}

/* ===================== COACHING TREE ===================== */
// Assistants who leave for bigger jobs become your coaching tree: you may face them, and you can hire them back.
function treeOf() { if (isCoach()) { const co = state.co; return co.tree || (co.tree = []); } return state.tree || (state.tree = []); }
function treeAdd(c, role, tid, newRole) { if (!c || c.me) return; const t = treeOf(); const e = t.find(x => x.name === c.name) || {}; Object.assign(e, { name: c.name, role, under: myName(), s: state.season, now: tid || null, nowRole: newRole || null, r: { off: c.off, def: c.def, rec: c.rec, dev: c.dev, gm: c.gm, ovr: c.ovr }, sal: c.salary, age: Number.isFinite(c.age) ? c.age : null }); if (!t.includes(e)) t.push(e); if (t.length > 40) t.shift(); }
const treeAt = tid => (T(tid) ? treeOf().find(x => x.now === tid && T(tid).coach === x.name) : null);
// a former assistant willing to come back, offered as a candidate for an opening
function treeCandidate(role) {
  const t = treeOf().filter(x => !state.cands[role] || !state.cands[role].some(c => c.name === x.name)); if (!t.length) return null;
  const fits = t.filter(x => (role === 'HC' ? ['OC', 'DC', 'HC'].includes(x.role) || x.nowRole === 'HC' : x.role === role || (['OC', 'DC'].includes(role) && ROLE_TIER[x.role] === 1))); const x = fits[0]; if (!x) return null;
  const b = x.r || {}; const base = { name: x.name, role, title: ROLE_TITLE[role], real: false, bg: `Former ${ROLE_TITLE[x.role]} on your staff${x.now && T(x.now) ? ', now with ' + teamName(x.now) : ''}`, tree: true };
  const c = role === 'HC' ? mkCoach(Object.assign(base, { off: b.off || b.ovr || 76, def: b.def || b.ovr || 74, rec: b.rec || 74, dev: b.dev || 74, gm: b.gm || 72 })) : mkCoach(Object.assign(base, { ovr: Math.min(95, (b.ovr || 74) + 2), rec: b.rec || 72, dev: b.dev || 72 }));
  c.salary = r1(Math.max(0.3, (x.sal || 1) * 1.15)); c.rap = 72; c.years = COACH_YRS[role] || 2; // a returning coach gets a normal contract (FE-08)
  if (Number.isFinite(x.age)) c.age = x.age + Math.max(0, state.season - (x.s || state.season)); return coachNorm(c, role);
}
// Every coach on a staff or a candidate list has a finite age, salary and contract length. Missing values get
// role-appropriate defaults (the age from the coach's name, so it never changes the random stream) (FE-08).
const COACH_YRS = { HC: 5, OC: 3, DC: 3, ST: 2 };
function coachNorm(c, role) {
  if (!c || typeof c !== 'object' || c.me) return c; const r = role || c.role; const fin = v => typeof v === 'number' && Number.isFinite(v);
  if (!fin(c.years) || c.years < 0) c.years = COACH_YRS[r] || 2;
  if (!fin(c.age)) c.age = 34 + Math.floor(hash(String(c.name || '') + ':cage') * 22) + (r === 'HC' ? 6 : 0);
  if (!fin(c.salary) || c.salary < 0) c.salary = r === 'HC' ? 3 : ['OC', 'DC'].includes(r) ? 1 : 0.4;
  return c;
}
// a save's staff and candidate lists, checked when it loads
function coachNormAll(s) { if (!s) return; Object.entries(s.staff || {}).forEach(([r, c]) => coachNorm(c, r)); Object.entries(s.cands || {}).forEach(([r, l]) => { if (Array.isArray(l)) l.forEach(c => coachNorm(c, r)); }); }
// another program hires one of your former assistants as its head coach (the AI carousel)
function treePromote(tid) { const c = treeOf().filter(x => x.now !== ME && x.nowRole !== 'HC' && (ROLE_TIER[x.role] >= 2 || ((x.r || {}).ovr || 0) >= 76)); if (!c.length || hash((state.seed || 0) + ':tp:' + state.season + ':' + tid) > 0.35) return null; const x = c[0]; x.now = tid; x.nowRole = 'HC'; addNews(`${teamName(tid)} hires ${x.name}, a former ${(ROLE_TITLE[x.role] || '').toLowerCase()} on your staff, as head coach.`, 'big'); return x.name; }
// when he's hired away from another program, that program needs a new head coach
function treeHired(c) { const x = treeOf().find(e => e.name === c.name); if (!x) return; if (x.now && T(x.now) && T(x.now).coach === c.name) T(x.now).coach = genName(); x.now = ME; x.nowRole = c.role; addNews(`${c.name} returns to ${myName()}.`, 'big'); }

/* ===================== COACH MODE: weekly practice plan ===================== */
// Eight practice periods a week: offense, defense, conditioning and film. Default is two each.
const PPLAN_KEYS = [['off', 'Offense', 'Sharper offense on game day'], ['def', 'Defense', 'Sharper defense on game day'], ['cond', 'Conditioning', 'Fewer injuries'], ['film', 'Film study', 'A better read on this week\'s opponent']];
const pplan = () => (isCoach() && state.co.role === 'HC' && state.pplan ? state.pplan : null);
function setPplan(k, d) { if (!isCoach() || state.co.role !== 'HC') return false; const p = state.pplan || (state.pplan = { off: 2, def: 2, cond: 2, film: 2 }); const tot = Object.values(p).reduce((a, b) => a + b, 0); if (!(k in p)) return false; if (d > 0 && tot >= 8) return false; p[k] = clamp(p[k] + d, 0, 6); return true; }
const pplanBonus = () => { const p = pplan(); return p ? { off: (p.off - 2) * 0.45, def: (p.def - 2) * 0.45, inj: 1 - (p.cond - 2) * 0.12, film: (p.film - 2) * 0.2 } : { off: 0, def: 0, inj: 1, film: 0 }; };

/* ===================== GAME DAY: halftime speech, replay review ===================== */
// The halftime speech lands differently with the score: firing them up works when you trail, staying the course
// when you lead, and a calm talk steadies a rattled team. Leaders among your captains make any speech land harder.
const SPEECHES = { fire: ['Fire them up', 'Best when you are behind. Does little with a big lead.'], steady: ['Stay the course', 'Best when you are ahead.'], calm: ['Calm and focused', 'Stops their momentum and steadies the defense.'] };
function speechFx(sim, k) {
  const m = simMargin(sim); const lf = 1 + 0.12 * captainsList().filter(p => p.pers === 'leader').length;
  const fx = k === 'fire' ? (m < 0 ? [1, 0.6] : m > 14 ? [0, 0] : [0.3, 0.3]) : k === 'steady' ? (m >= 0 ? [0.5, 0.5] : [0.2, 0.2]) : k === 'calm' ? (m < -14 ? [0.1, 0.2] : [0.2, 0.5]) : [0, 0];
  return { off: r1(fx[0] * lf), def: r1(fx[1] * lf) };
}
// Two challenges a game: an opponent's touchdown (ruled down at the 1, they kick a field goal) or your own
// turnover (ruled down by contact, so you keep it and punt instead). Only the drive that just ended can be
// reviewed. The ruling comes from hash(), not R(), so asking never changes the rest of the game's random stream.
const chalLeft = sim => (sim.chal == null ? 2 : sim.chal);
function reviewable(sim) {
  if (!sim || sim.done || sim.mSide < 0 || sim.pending || chalLeft(sim) <= 0) return null;
  const i = sim.log.length - 1; const x = sim.log[i]; if (!x || x.half || x.rev || x.ot) return null;
  const mine = x.s === sim.mSide;
  if (!mine && x.out === 'td' && !x.p6) return { i, kind: 'td' };
  if (mine && x.out === 'to' && !x.p6) return { i, kind: 'to' };
  return null;
}
function challengePlay(sim) {
  const r = reviewable(sim); if (!r) return null; const x = sim.log[r.i]; sim.chal = chalLeft(sim) - 1; x.rev = true;
  const ok = hash((sim.ckKey || sim.g.id || '') + ':rev:' + r.i) < (r.kind === 'td' ? 0.3 : 0.38);
  if (!ok) { x.txt += ' (the call stands after review)'; return { ok: false, kind: r.kind }; }
  if (r.kind === 'td') {
    const s = x.s; const prev = sim.log.slice(0, r.i).filter(y => !y.half).pop(); const before = prev ? prev.pts[s] : 0; const d = Math.max(0, x.pts[s] - before - 3); const qi = Math.min(4, x.qtr - 1);
    sim.pts[s] -= d; sim.q[s][qi] -= d; x.pts = sim.pts.slice(); x.out = 'fg'; x.score = true; x.txt += '. Overturned on review: down at the 1, and they settle for a field goal';
  } else { const o = 1 - sim.mSide; sim.shortField[o] = Math.min(sim.shortField[o] || 0, -0.2); if (sim.box) sim.box.t[sim.mSide].to = Math.max(0, sim.box.t[sim.mSide].to - 1); x.out = 'punt'; x.txt += '. Overturned on review: down by contact. You keep it and punt it away'; }
  if (sim.box && sim.box.wp.length) { const m = simMargin(sim); const rem = Math.max(0.01, 1 - sim.i / sim.total); sim.box.wp[sim.box.wp.length - 1].v = Math.round(normcdf((m + sim.m0 * rem) / (13.5 * Math.sqrt(rem) + 0.6)) * 100); }
  return { ok: true, kind: r.kind };
}
// clutch players on the field right now (shown in close fourth quarters and in big games)
function clutchNames() { return ['QB', 'RB', 'WR'].flatMap(pos => starters(pos)).filter(p => p.pers === 'clutch').map(p => p.n); }

/* ===================== PERSONALITIES THAT CHANGE ===================== */
// Each offseason a few players grow or sour: captains become leaders, divas who start on a winner settle down,
// injury-prone players who stay healthy shed the label, starters on playoff teams learn to close, and a talented
// backup can turn into a diva. Real players only ever change for the better. Uses hash(), not R().
function evolvePers() {
  const games = mGames(); const w = games.filter(g => g.mResult === 'W').length, l = games.filter(g => g.mResult === 'L').length; const post = games.some(g => g.type !== 'reg' && g.mResult);
  const caps = new Set(captainsList().map(p => p.id)); const out = [];
  state.roster.forEach(p => {
    if (!p.pers || !state.depth[p.pos]) return; const idx = state.depth[p.pos].indexOf(p.id); const starter = idx >= 0 && idx < (START[p.pos] || 1);
    const h = hash((state.seed || 0) + ':pers:' + state.season + ':' + p.id); const old = p.pers; let nw = null;
    if (caps.has(p.id) && ['steady', 'worker', 'clutch'].includes(old) && h < 0.35) nw = 'leader';
    else if (old === 'diva' && starter && w > l && h < 0.4) nw = 'steady';
    else if (old === 'fragile' && !p.inj && (p.gp || 0) >= 9 && h < 0.3) nw = 'steady';
    else if (old === 'steady' && starter && post && ['QB', 'RB', 'WR', 'TE', 'K'].includes(p.pos) && h < 0.15) nw = 'clutch';
    else if (old === 'steady' && !p.real && !starter && p.ovr >= 80 && h < 0.12) nw = 'diva';
    else if (old === 'steady' && ['Fr', 'So'].includes(p.cls) && h > 0.93) nw = 'worker';
    if (!nw || nw === old) return; p.pers = nw; (p.persLog || (p.persLog = [])).push({ s: state.season, from: old, to: nw });
    out.push(`${p.n} (${p.pos}) ${nw === 'leader' ? 'has grown into a team leader' : nw === 'steady' ? (old === 'diva' ? 'has stopped sulking and bought in' : 'has stayed healthy and shed the injury-prone label') : nw === 'clutch' ? 'learned to deliver in big moments' : nw === 'diva' ? 'is unhappy with his role and has become a distraction' : 'has become one of the hardest workers on the team'}.`);
  });
  out.slice(0, 6).forEach(t => addNews('Locker room: ' + t, /distraction/.test(t) ? 'bad' : 'win'));
  return out;
}
// who sets the tone this week: leaders who start, and troublemakers (divas who sit, or who start and just lost)
function lockerRoom() {
  const lead = [], trouble = [];
  state.roster.forEach(p => { const d = state.depth[p.pos]; if (!d) return; const idx = d.indexOf(p.id); const st = idx >= 0 && idx < (START[p.pos] || 1); if (p.pers === 'leader' && st && avail(p)) lead.push(p); if (p.pers === 'diva' && p.ovr >= 74 && !st) trouble.push(p); });
  return { lead, trouble };
}

/* ===================== INJURY REHAB ===================== */
// For an injury of two weeks or more you can rush him back (out about half as long, but four times as likely to
// get hurt again for a month), follow the standard plan, or play it safe (a week longer, half the usual risk after).
const REHAB = { rush: ['Rush him back', 'Back in about half the time. For four games after, he is about four times as likely to get hurt again.'], std: ['Standard plan', 'The doctors\' timeline.'], safe: ['Play it safe', 'One more week out. For five games after, he is half as likely to get hurt.'] };
function rehabOpen(p) { return p && p.inj >= 2 && p.inj < 99 && !p.injSE && !p.rehab; }
function setRehab(id, k) {
  const p = P(id); if (!rehabOpen(p) || !REHAB[k]) return false; p.rehab = k;
  if (k === 'rush') { p.inj = Math.max(1, Math.ceil(p.inj * 0.5)); p.reinj = 4; }
  else if (k === 'safe') { p.inj += 1; p.prot = 5; }
  return true;
}
function doctorNote(p) { const t = String(p.injType || 'injury').toLowerCase(); const fast = Math.max(1, Math.ceil(p.inj * 0.5)); return `Team doctor: "With ${aAn(t)}, the standard plan is ${p.inj} more week${p.inj > 1 ? 's' : ''}. We could have him back in ${fast}, but I would not do it before a game that doesn't matter much."`; }
const rehabInjF = p => (p.reinj > 0 ? 4 : 1) * (p.prot > 0 ? 0.5 : 1);
function rehabWeek(played) { state.roster.forEach(p => { if (p.inj > 0) return; if (p.reinj > 0 && played) p.reinj--; if (p.prot > 0 && played) p.prot--; if (p.rehab && !p.reinj && !p.prot) p.rehab = null; }); }

/* ===================== SCOUTING STAFF ===================== */
// Up to three scouts. In college each covers a region: recruits from there count as fully scouted and sleepers
// get flagged. In the NFL each covers a position group: those prospects start better scouted, and every scout
// adds scouting points each week.
const SC_REG = { NE: ['Northeast', 'ME NH VT MA RI CT NY NJ PA DE MD DC'], SE: ['Southeast', 'VA WV NC SC GA FL AL MS TN KY LA AR'], MW: ['Midwest', 'OH MI IN IL WI MN IA MO ND SD NE KS'], SW: ['Southwest', 'TX OK NM AZ'], W: ['West', 'CA OR WA NV UT CO ID MT WY AK HI'] };
const SC_GRP = { skill: ['QB and skill players', ['QB', 'RB', 'WR', 'TE']], trench: ['Linemen', ['OL', 'DE', 'DT']], back7: ['Linebackers and DBs', ['LB', 'CB', 'S']] };
const TOWN_ST = Object.fromEntries(TOWNS.map(t => [t[0], t[1]]));
function scoutList() { if (isPro()) { const L = PS(); return L.scouts || (L.scouts = []); } return state.scouts || (state.scouts = []); }
function scoutCands() {
  const pro = isPro(); const keys = Object.keys(pro ? SC_GRP : SC_REG); const have = scoutList();
  return [0, 1, 2, 3].map(i => { const h = hash((state.seed || 0) + ':sc:' + state.season + ':' + i + (pro ? 'n' : 'c')); const lvl = 1 + Math.floor(hash(h + ':l') * 3); const spec = keys[Math.floor(h * keys.length)]; return { id: 'sc' + state.season + i, name: genNameH(h), spec, lvl, sal: pro ? 150000 * lvl : 60000 * lvl }; }).filter(c => !have.some(x => x.id === c.id));
}
function genNameH(h) { const F = ['Ray', 'Dale', 'Curtis', 'Lonnie', 'Marcus', 'Glen', 'Terry', 'Walt', 'Andre', 'Hank', 'Reggie', 'Phil', 'Darnell', 'Stan', 'Cliff', 'Eddie']; const L = ['Hollis', 'Pruitt', 'Garner', 'Whitlock', 'Mabry', 'Coleman', 'Rowe', 'Fenwick', 'Odom', 'Tillery', 'Burkett', 'Vance', 'Spurlock', 'Kimbrough', 'Ashby', 'Delaney']; return F[Math.floor(hash(h + 'f') * F.length)] + ' ' + L[Math.floor(hash(h + 'g') * L.length)]; }
const scoutCan = () => !isCoach() || state.co.role === 'HC';
function hireScout(id) { const c = scoutCands().find(x => x.id === id); const L = scoutList(); if (!c || L.length >= 3 || !scoutCan()) return false; L.push(c); addNews(`${myName()} hires ${c.name} as a scout (${isPro() ? SC_GRP[c.spec][0] : SC_REG[c.spec][0]}).`); return true; }
function fireScout(id) { const L = scoutList(); const i = L.findIndex(x => x.id === id); if (i < 0 || !scoutCan()) return false; L.splice(i, 1); return true; }
// a recruit's region, and whether one of your scouts covers it
function recRegion(r) { const st = TOWN_ST[r.home]; return st ? Object.keys(SC_REG).find(k => SC_REG[k][1].split(' ').includes(st)) : null; }
function recScout(r) { if (isPro()) return null; const reg = recRegion(r); return reg ? scoutList().filter(s => s.spec === reg).sort((a, b) => b.lvl - a.lvl)[0] || null : null; }
const recSleeper = r => r.star <= 3 && r.pot >= r.ovr + 12;
// NFL prospects: a scout who covers his position group raises the starting scouting level
function proScoutBoost(pos) { if (!isPro()) return 0; const s = scoutList().filter(x => SC_GRP[x.spec] && SC_GRP[x.spec][1].includes(pos)).sort((a, b) => b.lvl - a.lvl)[0]; return s ? (s.lvl >= 3 ? 2 : 1) : 0; }
const effSc = p => Math.max(p.sc || 0, proScoutBoost(p.pos));

/* ===================== DEBT AND BOOSTERS (AD) ===================== */
// Bonds: money now for facilities or anything else, paid back in equal yearly payments over ten years at 5%.
// The board doesn't love debt. Boosters sometimes give with strings attached: keep the head coach, or hold
// ticket prices. Break the promise and they want half the money back.
const BOND_SIZES = [10, 25, 50], BOND_RATE = 0.05, BOND_YRS = 10, DEBT_MAX = 75;
const bondPay = amt => r1(amt * BOND_RATE / (1 - Math.pow(1 + BOND_RATE, -BOND_YRS)));
function debtLeft() { return r1((state.bonds || []).reduce((s, b) => s + b.pay * b.left, 0)); }
function issueBond(amt) {
  if (isPro() || isCoach() || !BOND_SIZES.includes(amt) || debtLeft() + bondPay(amt) * BOND_YRS > DEBT_MAX * 1.35) return false;
  (state.bonds || (state.bonds = [])).push({ s: state.season, amt, pay: bondPay(amt), left: BOND_YRS }); state.fin.balance += amt; mv('board', amt >= 50 ? -4 : amt >= 25 ? -2 : -1);
  addNews(`${myName()} issues $${amt}M in bonds: $${bondPay(amt)}M a year for ${BOND_YRS} years.`); return true;
}
// yearly payments post with the year-end money
function bondsYearEnd() { let t = 0; (state.bonds || []).forEach(b => { if (b.left > 0 && b.paidS !== state.season) { b.left--; b.paidS = state.season; t += b.pay; } }); if (t) { state.fin.balance -= t; state.fin.ytd.debt = r1((state.fin.ytd.debt || 0) + t); } state.bonds = (state.bonds || []).filter(b => b.left > 0); return t; }
function boosterOffer() {
  if (isPro() || isCoach() || state.phase !== 'offseason') return null; const h = hash((state.seed || 0) + ':bo:' + state.season); if (h > 0.7) return null;
  const done = (state.boDone || []).includes(state.season); if (done) return null; const hc = state.staff && state.staff.HC;
  const amt = Math.round((4 + h * 10) * 2) / 2; const k = hc && !hc.me && h < 0.38 ? 'coach' : 'tix';
  return { k, amt, thru: state.season + 2, coach: k === 'coach' ? hc.name : null, tix: state.fin.ticket, who: genNameH(h + 'b') };
}
function answerBooster(yes) {
  const o = boosterOffer(); if (!o) return null; (state.boDone || (state.boDone = [])).push(state.season);
  if (!yes) { mv('boost', -1); return `You turned down ${o.who}.`; }
  state.fin.balance += o.amt; state.fin.ytd.donations = r1((state.fin.ytd.donations || 0) + o.amt); (state.strings || (state.strings = [])).push(Object.assign({}, o, { s: state.season }));
  return `${o.who} gives $${o.amt}M. The condition: ${o.k === 'coach' ? `keep ${o.coach} as head coach through ${o.thru}` : `keep the average ticket at $${o.tix} or less through ${o.thru}`}.`;
}
// a broken promise: the booster wants half back and the others notice
function breakString(x, why) { x.broken = true; const back = r1(x.amt / 2); state.fin.balance -= back; state.fin.ytd.eventx = r1((state.fin.ytd.eventx || 0) + back); mv('boost', -10); addNews(`${x.who} says you broke your word (${why}) and wants $${back}M back. Other boosters are wary now.`, 'bad'); }
function stringsCheck(ev, data) {
  (state.strings || []).forEach(x => { if (x.broken || x.kept) return;
    if (ev === 'fire' && x.k === 'coach' && data === x.coach && state.season <= x.thru) breakString(x, `you fired ${x.coach}`);
    if (ev === 'year' && x.k === 'tix' && state.season <= x.thru && state.fin.ticket > x.tix) breakString(x, 'ticket prices went up');
    if (ev === 'year' && !x.broken && state.season >= x.thru) { x.kept = true; mv('boost', 3); addNews(`${x.who} is happy: you kept your promise through ${x.thru}.`, 'win'); }
  });
}

/* ===================== BOWL WEEK ===================== */
// Before a bowl or playoff game the AD sets the travel party and pushes tickets. Schools pay for the tickets
// they don't sell from their allotment.
const BOWL_CITY = { 'Duke\'s Mayo Bowl': 'Charlotte', 'Pinstripe Bowl': 'New York', 'Military Bowl': 'Annapolis', 'Birmingham Bowl': 'Birmingham', 'Fenway Bowl': 'Boston', 'Armed Forces Bowl': 'Fort Worth', 'First Responder Bowl': 'Dallas', 'Independence Bowl': 'Shreveport', 'Cactus Bowl': 'Phoenix', 'Arizona Bowl': 'Tucson', 'Hawaii Bowl': 'Honolulu', 'New Mexico Bowl': 'Albuquerque', 'Poinsettia Bowl': 'San Diego', 'New Orleans Bowl': 'New Orleans', 'Frisco Bowl': 'Frisco', 'Cure Bowl': 'Orlando', 'Puerto Rico Bowl': 'San Juan', 'Famous Idaho Potato Bowl': 'Boise', 'Myrtle Beach Bowl': 'Conway', 'Gasparilla Bowl': 'Tampa', 'Boca Raton Bowl': 'Boca Raton', 'Frisco Football Classic': 'Frisco', 'Salute to Veterans Bowl': 'Montgomery', '68 Ventures Bowl': 'Mobile', 'Citrus Bowl': 'Orlando', 'ReliaQuest Bowl': 'Tampa', 'Alamo Bowl': 'San Antonio', 'Pop-Tarts Bowl': 'Orlando', 'Gator Bowl': 'Jacksonville', 'Music City Bowl': 'Nashville', 'Holiday Bowl': 'San Diego', 'Sun Bowl': 'El Paso', 'Las Vegas Bowl': 'Las Vegas', 'Texas Bowl': 'Houston', 'Liberty Bowl': 'Memphis', 'Rose Bowl': 'Pasadena', 'Sugar Bowl': 'New Orleans', 'Orange Bowl': 'Miami', 'Cotton Bowl': 'Arlington', 'Fiesta Bowl': 'Glendale', 'Peach Bowl': 'Atlanta' };
const TRIP = { lean: ['Lean', 0.5, 0, 0], std: ['Standard', 0.9, 1, 1], full: ['Full band and boosters', 1.5, 3, 3] };
function bowlGame() { if (isPro() || isCoach()) return null; return state.games.find(g => !g.done && (g.type === 'bowl' || g.type === 'cfp') && (g.h === ME || g.a === ME)) || null; }
function bowlCity(g) { const k = Object.keys(BOWL_CITY).find(b => (g.name || '').includes(b)); return k ? BOWL_CITY[k] : 'a neutral site'; }
function bowlTix(g, promo) { const allot = g.type === 'cfp' ? 16000 : 12000; const f = clamp(0.45 + (state.meters.fan - 50) / 100 + (g.type === 'cfp' ? 0.15 : 0) + (promo ? 0.15 : 0), 0.3, 1); return { allot, sold: Math.round(allot * f / 100) * 100 }; }
function setTrip(k, promo) {
  const g = bowlGame(); if (!g || !TRIP[k]) return null; const T_ = state.trip || {}; if (T_.gid === g.id) return null;
  const t = bowlTix(g, promo); const price = g.type === 'cfp' ? 175 : 110; const unsold = r1((t.allot - t.sold) * price / 1e6); const cost = r1(TRIP[k][1] + (promo ? 0.2 : 0) + unsold);
  state.trip = { gid: g.id, k, promo: !!promo, cost, sold: t.sold, allot: t.allot }; state.fin.balance -= cost; state.fin.ytd.eventx = r1((state.fin.ytd.eventx || 0) + cost); mv('fan', TRIP[k][2]); mv('boost', TRIP[k][3]);
  return `Travel set: ${TRIP[k][0].toLowerCase()} party. ${t.sold.toLocaleString()} of ${t.allot.toLocaleString()} tickets sold. Cost $${cost}M${unsold ? ` (including $${unsold}M for unsold tickets)` : ''}.`;
}
const isTitleGame = g => !!g && /National Championship|Super Bowl/.test(g.name || '');

/* ===================== HISTORICAL SEASONS: import a ranking ===================== */
// Paste a poll (one team per line: "1. Georgia", "Georgia 95", "OSU: 91") and the league takes its shape:
// ranked teams get a rating and a poll position from their rank (or the rating you gave), and teams you left
// out can't start ahead of the last one listed. Best used in the preseason.
function rankTeamMatch(s) {
  const q = String(s || '').toLowerCase().replace(/[^a-z0-9& .'-]/g, '').replace(/\s+/g, ' ').trim(); if (!q) return null;
  const ids = Object.keys(state.teams); const nm = id => [id, T(id).name, CTEAMS0_AD[id] ? CTEAMS0_AD[id].name : '', teamName(id)].map(x => String(x || '').toLowerCase());
  return ids.find(id => nm(id).includes(q)) || ids.find(id => nm(id).some(n => n && (n.startsWith(q + ' ') || q.startsWith(n + ' ')))) || null;
}
function parseRankings(text) {
  const out = []; const seen = new Set();
  String(text || '').split(/\r?\n/).forEach(line => {
    let L = line.trim(); if (!L) return; let rank = null, rating = null;
    let m = L.match(/^#?\s*(\d{1,3})[.)\s:-]+(.+)$/); if (m && +m[1] <= 130) { rank = +m[1]; L = m[2].trim(); }
    m = L.match(/^(.+?)[\s,:(-]+(\d{2}(?:\.\d)?)\)?\s*$/); if (m && +m[2] >= 40 && +m[2] <= 99) { rating = +m[2]; L = m[1].trim(); }
    L = L.replace(/\s*\(\d+-\d+\)\s*$/, '').trim(); const id = rankTeamMatch(L); if (!id || seen.has(id)) return; seen.add(id);
    out.push({ id, rank, rating });
  });
  out.forEach((x, i) => { if (x.rank == null) x.rank = i + 1; }); out.sort((a, b) => a.rank - b.rank);
  return out;
}
function importRankings(text) {
  if (isPro()) return { n: 0 }; const list = parseRankings(text); if (!list.length) return { n: 0 };
  list.forEach((x, i) => { const t = T(x.id); const rk = i + 1; const r = x.rating != null ? x.rating : r1(clamp(96 - (rk - 1) * 0.6, 60, 97)); if (x.id !== ME) { const d = r - t.rating; t.rating = r; t.off = r1(clamp(t.off + d, 35, 99)); t.def = r1(clamp(t.def + d, 35, 99)); } t.elo = t.elo0 = 1860 - (rk - 1) * 9; });
  const floor = 1860 - list.length * 9 - 1; const listed = new Set(list.map(x => x.id)); Object.values(state.teams).forEach(t => { if (!listed.has(t.id) && t.elo > floor) t.elo = floor - (t.id === ME ? 0 : 1); });
  addNews(`League reset from an imported poll: ${list.slice(0, 3).map(x => teamName(x.id)).join(', ')}${list.length > 3 ? ` and ${list.length - 3} more` : ''}.`);
  return { n: list.length, top: list.slice(0, 5).map(x => teamName(x.id)) };
}

/* ===================== RECORD BOOK: team records, records broken, and achievements for them ===================== */
// The game and season books (players) live in state.book.game / .season; team marks in .team. Each world (college,
// NFL) keeps its own book. Breaking a mark that someone else set (or that you set in an earlier season) is news,
// goes in the log of broken records, and can unlock an achievement.
const TEAM_REC = { wins: ['Wins in a season', 'hi'], pf: ['Points in a season', 'hi'], pa: ['Fewest points allowed in a season', 'lo'], margin: ['Biggest win', 'hi'], streak: ['Longest winning streak', 'hi'] };
function bookOf() {
  const b = state.book || (state.book = { game: {}, season: {} }); b.game = b.game || {}; b.season = b.season || {}; b.team = b.team || {};
  if (!b.v98) { b.v98 = true; b.since = state.season; if (!Object.keys(b.game).length && !Object.keys(b.season).length && !(typeof isRealMich === 'function' && isRealMich() && !isPro())) seedBook(b); }
  return b;
}
// A new program starts with records already on the books ("before your time"), set around what a very good season
// looks like here, so breaking one means something. Michigan's real program starts with an empty book instead.
const BOOK_BASE = {
  col: { game: { py: 360, ptd: 5, ry: 240, rtd: 5, rc: 12, rcy: 150, rctd: 3, tk: 16, sk: 3, int: 2, fgm: 4, pts: 63 }, season: { py: 3300, ptd: 30, ry: 1900, rtd: 24, rc: 88, rcy: 950, rctd: 11, tk: 102, sk: 10, int: 6, fgm: 25 }, career: { py: 9000, ptd: 80, ry: 4000, rtd: 48, rc: 205, rcy: 2200, rctd: 21, tk: 290, sk: 20, int: 10, fgm: 55 }, team: { wins: 12, pf: 500, pa: 175, margin: 52, streak: 12 } },
  nfl: { game: { py: 360, ptd: 5, ry: 210, rtd: 4, rc: 11, rcy: 140, rctd: 3, tk: 16, sk: 4, int: 2, fgm: 5, pts: 52 }, season: { py: 3400, ptd: 30, ry: 1850, rtd: 20, rc: 95, rcy: 1000, rctd: 9, tk: 150, sk: 16, int: 6, fgm: 30 }, career: { py: 20000, ptd: 150, ry: 8000, rtd: 70, rc: 450, rcy: 5000, rctd: 35, tk: 700, sk: 60, int: 25, fgm: 200 }, team: { wins: 13, pf: 480, pa: 260, margin: 42, streak: 9 } },
};
function seedBook(b) {
  const lv = isPro() ? 'nfl' : 'col'; const t = T(ME); const rt = t ? t.rating : 70; const f = lv === 'nfl' ? 1 : clamp(0.88 + (rt - 70) * 0.006, 0.84, 1.05); const base = BOOK_BASE[lv];
  const v = (k, x, tb) => { const h = hash((state.seed || 0) + ':book:' + ME + ':' + tb + ':' + k); const y = x * (tb === 'team' && k === 'pa' ? 1 / f : f) * (0.94 + h * 0.12); return x < 30 ? Math.max(1, Math.round(y)) : Math.round(y); };
  const mk = (tb, k, x) => ({ v: v(k, x, tb), n: 'Before your time', s: null, base: true });
  Object.entries(base.game).forEach(([k, x]) => { b.game[k] = mk('game', k, x); }); Object.entries(base.season).forEach(([k, x]) => { b.season[k] = mk('season', k, x); });
  Object.entries(base.team).forEach(([k, x]) => { b.team[k] = mk('team', k, k === 'wins' && lv === 'col' ? Math.round(clamp(9 + (rt - 60) * 0.15, 9, 14)) : x); });
  b.careerTop = {}; Object.entries(base.career).forEach(([k, x]) => { b.careerTop[k] = mk('career', k, x); });
}
function recLabel(tbl, k) { if (tbl === 'team') return (TEAM_REC[k] || [k])[0]; if (k === 'pts') return 'Points in a game'; return (BOOK_KEYS[k] || [k])[0]; }
function recordBroken(tbl, k, v, n, prev) {
  const B = state.book || {}; if (!prev.base && B.since != null && state.season < B.since + 2) return; /* a brand-new book settles in for two seasons before marks count as broken */
  const log = state.recLog || (state.recLog = []); log.push({ s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, tbl, k, v, n, pv: prev.v, pn: prev.n, ps: prev.s }); if (log.length > 80) log.splice(0, log.length - 80);
  const what = tbl === 'game' ? 'single-game' : tbl === 'season' ? 'single-season' : tbl === 'career' ? 'career' : 'team';
  addNews(`Record broken: ${n} sets the ${myName()} ${what} record for ${recLabel(tbl, k).toLowerCase()} (${v}). ${prev.base ? `The old program record was ${prev.v}.` : `The old mark: ${prev.v}, ${prev.n}${prev.s ? ', ' + prev.s : ''}.`}`, 'big');
  unlock({ game: 'rec_game', season: 'rec_season', career: 'rec_career', team: 'rec_team' }[tbl]);
  if (log.filter(x => x.s === state.season).length >= 5) unlock('rec_five');
}
function teamRecSet(k, v, extra) {
  if (v == null || !isFinite(v)) return; const B = bookOf(); const cur = B.team[k]; const lo = TEAM_REC[k][1] === 'lo';
  if (!cur || (lo ? v < cur.v : v > cur.v)) { B.team[k] = Object.assign({ v, n: myName(), s: state.season }, extra || {}); if (cur && cur.s !== state.season) recordBroken('team', k, v, myName(), cur); }
}
// after each of your games: biggest win and the winning streak
function teamRecGame(ms, os) {
  const B = bookOf(); if (ms > os) { B.streakCur = (B.streakCur || 0) + 1; teamRecSet('margin', ms - os); teamRecSet('streak', B.streakCur); } else B.streakCur = 0;
}
// at the end of a season: wins, points for, fewest points against (full seasons only)
function teamRecSeason() {
  const g = mGames().filter(x => x.done && x.hs != null); if (g.length < 8) return; const mine = x => (x.h === ME ? [x.hs, x.as] : [x.as, x.hs]);
  teamRecSet('wins', g.filter(x => mine(x)[0] > mine(x)[1]).length); teamRecSet('pf', g.reduce((a, x) => a + mine(x)[0], 0)); teamRecSet('pa', g.reduce((a, x) => a + mine(x)[1], 0));
}
// career leaders: a new leader who passes someone else's mark breaks the record
function careerRecCheck() {
  let ct = {}; try { ct = careerTable(); } catch (e) { return; } const B = bookOf();
  const first = !B.careerTop; const top = B.careerTop || (B.careerTop = {});
  Object.keys(ct).forEach(k => { const a = ct[k], b = top[k]; if (b && a.v <= b.v) return; if (b && !first && a.n !== b.n) recordBroken('career', k, a.v, a.n, b); top[k] = { v: a.v, n: a.n, s: state.season }; });
}

