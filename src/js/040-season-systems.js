/* ===================== SEASON SYSTEMS ===================== */
function oppOf(g) { return g.h === ME ? g.a : g.h; }
// Money scale of the program: Michigan is 1. Real schools get a fixed scale from their conference and
// standing when the career starts (state.econ); custom programs made before v8 keep the old rule.
function econ() { if (state.econ != null) return state.econ; if (!state.me) return 1; const c = CONFS[T(ME).conf]; return c.p4 ? 0.85 : T(ME).conf === 'IND' ? 0.6 : 0.3; }
function progEcon(id, rating) { if (id === 'MICH') return 1; const t = CTEAMS0_AD[id]; const p4 = (t && CONFS[t.conf] && CONFS[t.conf].p4) || id === 'ND'; return p4 ? r2(clamp(0.62 + (rating - 60) * 0.016, 0.62, 1.05)) : r2(clamp(0.22 + (rating - 40) * 0.006, 0.22, 0.42)); }
const CTEAMS0_AD = {}; CONF_DEFS.forEach(([cid, , , , list]) => list.split(';').forEach(s => { const [nm, id, r] = s.split('|'); CTEAMS0_AD[id] = { name: nm, conf: cid, base: +r }; }));
const isRealMich = () => ME === 'MICH' && !state.me;
const myName = () => teamName(ME);
const myAb = () => (state.me && state.me.ab) || ME;
const myCity = () => state.me ? 'campus' : (TEAM_INFO[ME] || {}).city || 'campus';
const capacity = () => ((state.me && state.me.cap) || (TEAM_INFO[ME] && TEAM_INFO[ME].cap) || STADIUM_CAP) + (typeof bizSeats === 'function' ? bizSeats() : 0);
const rosterLimit = () => ((state.settings && state.settings.rules && +state.settings.rules.roster) || ROSTER_LIMIT) - (state.schRed && state.schRed.s === state.season + 1 ? state.schRed.n : 0) - (state.schRed && state.schRed.s === state.season && state.phase !== 'offseason' ? state.schRed.n : 0);
const CUSTOM_FAC = { stadium: null, building: 'Football operations building', indoor: 'Indoor practice facility', weight: 'Strength & conditioning', med: 'Sports medicine & recovery', academic: 'Player development center' };
function facName(id) { if (state.me) return id === 'stadium' ? state.me.stadium : CUSTOM_FAC[id]; if (!isRealMich()) return id === 'stadium' ? ((TEAM_INFO[ME] || {}).stadium || 'Home stadium') : CUSTOM_FAC[id]; return FAC_DEFS.find(f => f.id === id).name; }
// The school's rivals. Michigan keeps its real all-time series records; everyone else counts from day one.
function setupRivals() {
  const out = {}; const list = rivalsFor(ME, state.teams, x => T(x).conf);
  // a custom program inherits the local rivals of the school it replaces, but not their trophy names
  list.forEach(([id, nm], i) => { out[id] = isRealMich() && RIVAL_DATA[id] ? Object.assign({}, RIVAL_DATA[id]) : { name: state.me ? `${state.me.name}–${teamName(id)}` : nm, trophy: null, w: 0, l: 0, t: 0, note: 'Record during your tenure', arch: i === 0 }; });
  if (isRealMich()) out.OSU.arch = true;
  state.rivals = out; state.arch = list.length ? list[0][0] : null;
}
// How far below a power-conference level the program sits. Transfers and walk-ons scale down by it,
// so a Group of Six roster isn't flooded with players better than its starters.
const progShift = () => Math.max(0, Math.round((75 - (T(ME) ? T(ME).rating : 80)) * 0.6));
const archRival = () => state.arch || (state.rivals && state.rivals.OSU ? 'OSU' : null);
function clsLabel(p) { if (p.cls === 'Pro') return p.exp ? 'Year ' + (p.exp + 1) : 'Rookie'; return (p.rsUsed ? 'RS ' : '') + p.cls; }

/* ---------- personalities & captains ---------- */
// the same odds from a hash, for players made during play (no draw from the random stream)
function persOf(real, key) { const r = hash('pers:' + key); if (real) return r < 0.1 ? 'leader' : r < 0.28 ? 'worker' : r < 0.38 ? 'clutch' : 'steady'; return r < 0.08 ? 'leader' : r < 0.22 ? 'worker' : r < 0.3 ? 'clutch' : r < 0.36 ? 'diva' : r < 0.42 ? 'fragile' : 'steady'; }
function rollPers(real) {
  const r = R();
  if (real) return r < 0.1 ? 'leader' : r < 0.28 ? 'worker' : r < 0.38 ? 'clutch' : 'steady';
  return r < 0.08 ? 'leader' : r < 0.22 ? 'worker' : r < 0.3 ? 'clutch' : r < 0.36 ? 'diva' : r < 0.42 ? 'fragile' : 'steady';
}
function clutchCount() { let n = 0; ['QB', 'RB', 'WR'].forEach(pos => starters(pos).forEach(p => { if (p.pers === 'clutch') n++; })); return n; }
function captainsList() { return (state.captains || []).map(P).filter(Boolean); }
function autoCaptains() {
  const pool = state.roster.filter(p => ['Sr', 'Gr', 'Jr'].includes(p.cls) && state.depth[p.pos].indexOf(p.id) < START[p.pos]);
  pool.sort((a, b) => ((b.pers === 'leader') * 20 + b.ovr + CLASSES.indexOf(b.cls) * 2) - ((a.pers === 'leader') * 20 + a.ovr + CLASSES.indexOf(a.cls) * 2));
  const off = pool.filter(p => ['QB', 'RB', 'WR', 'TE', 'OL'].includes(p.pos)).slice(0, 2), def = pool.filter(p => ['DE', 'DT', 'LB', 'CB', 'S'].includes(p.pos)).slice(0, 2);
  state.captains = off.concat(def).map(p => p.id);
}
function leadership() { return captainsList().reduce((s, p) => s + (p.pers === 'leader' ? 3 : 1) + (['Sr', 'Gr'].includes(p.cls) ? 0.5 : 0), 0); }
function weeklyTeam(mg) {
  if (state.phase === 'offseason') return;
  let d = (leadership() - 5) * 0.25;
  let divas = 0, leaders = 0;
  state.roster.forEach(p => { const idx = state.depth[p.pos].indexOf(p.id); if (p.pers === 'diva' && p.ovr >= 74 && idx >= START[p.pos]) divas++; if (p.pers === 'leader' && idx < START[p.pos] && avail(p)) leaders++; });
  d += Math.min(1.5, leaders * 0.3) - Math.min(2, divas * 0.5);
  if (mg && mg.mResult === 'L') { const sulk = state.roster.filter(p => p.pers === 'diva' && state.depth[p.pos] && state.depth[p.pos].indexOf(p.id) >= 0 && state.depth[p.pos].indexOf(p.id) < START[p.pos]).length; d -= Math.min(1.5, sulk * 0.5); } /* a diva who starts sulks after a loss */
  state.meters.morale = clamp(Math.round((state.meters.morale + d) * 10) / 10, 0, 100);
  state.meters.morale = Math.round(state.meters.morale);
  if (state.practice === 'youth') state.roster.forEach(p => { if (['Fr', 'So'].includes(p.cls) && state.depth[p.pos].indexOf(p.id) >= START[p.pos]) p.xp = (p.xp || 0) + 1; });
  // compliance drift
  const b = annualBudget(); let risk = 0;
  if (b.niltop > 5) risk += 0.8; if (state.fin.recruit > 7) risk += 0.5; risk -= ((state.fin.compliance == null ? 1 : state.fin.compliance) - 1) * 0.5;
  state.meters.risk = clamp(Math.round((state.meters.risk + risk) * 10) / 10, 0, 100);
}

/* ---------- play calling ---------- */
function startPlayDrive(sim, s, qtr, clock, ot) {
  const start = ot && sim.otRule !== 'nfl' && sim.otRule !== 'sudden' ? 75 : clamp(25 + Math.round((sim.shortField[s] || 0) * 60), 20, 60); sim.shortField[s] = 0;
  sim.pending = { type: 'drive', s, qtr, clock, ot, ds: { yl: start, start, down: 1, togo: 10, plays: [], log: [], calls: [] } };
}
function playModel(sim) {
  const mu = michUnits(); const o = isFCS(sim.oppId) ? { runD: strength(sim.oppId).def, passD: strength(sim.oppId).def } : oppUnits(sim.oppId);
  const W = WX[sim.wx.k] || {};
  const qb = starters('QB')[0]; const rb = starters('RB')[0];
  return { runA: (mu.run - o.runD) / 10 + (W.run || 0) * 0.3, passA: (mu.pass - o.passD) / 10 + (W.pass || 0) * 0.35, acc: (qb && qb.tr && qb.tr.acc) || 60, arm: (qb && qb.tr && qb.tr.arm) || 60, spd: (rb && rb.tr && rb.tr.spd) || 70 };
}
function playHints(sim) {
  const m = playModel(sim);
  return { inside: `~${(3.4 + m.runA * 1.4).toFixed(1)} yds`, outside: `~${(3.8 + m.runA * 1.3 + (m.spd - 75) * 0.05).toFixed(1)} yds, boom or bust`, short: `${Math.round(clamp(0.67 + (m.acc - 75) * 0.006 + m.passA * 0.04, 0.4, 0.85) * 100)}% catch, ~6 yds`, deep: `${Math.round(clamp(0.36 + (m.arm - 75) * 0.006 + m.passA * 0.05, 0.15, 0.6) * 100)}% catch, 18+ yds, risky`, screen: 'Safe, sometimes breaks big' };
}
// QOL-16: the chance each call is a "successful" play here (40% of the distance on 1st down, 60% on 2nd, all of it on
// 3rd and 4th), from your units against their defense, the weather and how predictable you have been. It uses its own
// random numbers, so looking never changes what happens.
function callOdds(sim) {
  const p = sim && sim.pending; if (!p || p.type !== 'drive') return null; const ds = p.ds; const m = playModel(sim);
  const need = Math.max(1, Math.ceil(ds.togo * (ds.down === 1 ? 0.4 : ds.down === 2 ? 0.6 : 1))); let s = 0x9e3779b9 ^ (ds.yl * 131 + ds.down * 17 + ds.togo);
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; }; const g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const out = {}; const N = 240;
  Object.keys(CALLS).forEach(call => { const pred = ds.calls.slice(-2).filter(c => c === call).length * 1.2; let ok = 0;
    for (let i = 0; i < N; i++) { let y = 0;
      if (call === 'inside' || call === 'outside') { y = call === 'inside' ? 3.4 + m.runA * 1.4 + g() * 2.6 - pred + (ds.togo <= 2 ? 1 : 0) : 3.8 + m.runA * 1.3 + (m.spd - 75) * 0.05 + g() * 4.2 - pred; if (r() < (call === 'inside' ? 0.035 : 0.06) + m.runA * 0.01) y += 12 + r() * 33; if (r() < 0.012) y = -99; }
      else { const sackP = call === 'deep' ? 0.08 : call === 'short' ? 0.045 - m.passA * 0.01 : 0.02; const cp = call === 'deep' ? clamp(0.36 + (m.arm - 75) * 0.006 + m.passA * 0.05, 0.15, 0.6) : call === 'short' ? clamp(0.67 + (m.acc - 75) * 0.006 + m.passA * 0.04, 0.4, 0.85) : 0.82; const intP = call === 'deep' ? 0.055 : call === 'short' ? 0.015 : 0.01;
        if (r() < Math.max(0.01, sackP)) y = -6; else if (r() < intP) y = -99; else if (r() < cp) { y = call === 'deep' ? 16 + r() * 26 : call === 'short' ? 5.5 + m.passA + g() * 3.2 - pred : 3 + m.runA * 0.8 + g() * 5 - pred; if (call !== 'deep' && r() < (call === 'screen' ? 0.05 : 0.04)) y += 10 + r() * 25; } else y = 0; }
      if (Math.round(y) >= need) ok++; }
    out[call] = Math.round(ok / N * 100); });
  return out;
}
function runPlay(sim, call) {
  const p = sim.pending; if (!p || p.type !== 'drive') return;
  const ds = p.ds; const m = playModel(sim); const ctx = sim.ctx;
  const rep = ds.calls.slice(-2).filter(c => c === call).length; const pred = rep * 1.2;
  const clutch = (p.qtr >= 4 || p.ot) ? sim.clutch * 0.5 : 0;
  const rbs = starters('RB', 2), wrs = starters('WR', 3);
  let pl = { pass: false, comp: false, y: 0 }; let txt = '';
  const nm = x => x ? x.n : 'The runner';
  if (call === 'inside' || call === 'outside') {
    // the lead back tires: past 12 carries his share drops toward 45% and RB2 spells him (CL-B10)
    sim.rbLoad = sim.rbLoad || {}; const n1 = rbs[0] ? sim.rbLoad[rbs[0].id] || 0 : 0; const share1 = clamp(0.85 - Math.max(0, n1 - 12) * 0.02, 0.45, 0.85);
    const who = call === 'outside' && R() < 0.15 && ctx.qb ? ctx.qb : R() < share1 ? rbs[0] : (rbs[1] || rbs[0]);
    if (who && who !== ctx.qb) sim.rbLoad[who.id] = (sim.rbLoad[who.id] || 0) + 1;
    let y = call === 'inside' ? Math.round(3.4 + m.runA * 1.4 + gauss() * 2.6 - pred + clutch + (ds.togo <= 2 ? 1 : 0)) : Math.round(3.8 + m.runA * 1.3 + (m.spd - 75) * 0.05 + gauss() * 4.2 - pred + clutch);
    if (R() < (call === 'inside' ? 0.035 : 0.06) + m.runA * 0.01) y += ri(12, 45);
    pl = { pass: false, comp: true, y, who };
    if (R() < 0.012) { pl.fum = true; pl.comp = false; txt = `${CALLS[call]}: ${nm(who)} fumbles! ${teamName(sim.oppId)} recovers.`; }
    else txt = `${CALLS[call]}: ${nm(who)} ${y > 0 ? 'for ' + y + ' yard' + (y === 1 ? '' : 's') : y === 0 ? 'for no gain' : 'loses ' + -y + ' yard' + (y === -1 ? '' : 's')}.`;
  } else {
    const sackP = call === 'deep' ? 0.08 : call === 'short' ? 0.045 - m.passA * 0.01 : 0.02;
    const cp = call === 'deep' ? clamp(0.36 + (m.arm - 75) * 0.006 + m.passA * 0.05, 0.15, 0.6) : call === 'short' ? clamp(0.67 + (m.acc - 75) * 0.006 + m.passA * 0.04, 0.4, 0.85) : 0.82;
    const intP = call === 'deep' ? 0.055 : call === 'short' ? 0.015 : 0.01;
    const who = call === 'screen' ? (R() < 0.7 ? rbs[0] : wrs[2] || wrs[0]) : call === 'deep' ? (R() < 0.55 ? wrs[0] : wrs[1] || wrs[0]) : wpick(ctx.tg);
    if (R() < Math.max(0.01, sackP)) { const y = -ri(4, 9); pl = { pass: true, comp: false, sack: true, y: 0, ly: y }; txt = `${CALLS[call]}: ${ctx.qb ? ctx.qb.n : 'QB'} is sacked for a loss of ${-y}.`; pl.yl = y; }
    else if (R() < intP) { pl = { pass: true, comp: false, int: true, y: 0 }; txt = `${CALLS[call]}: intercepted! ${teamName(sim.oppId)} takes over.`; }
    else if (R() < cp + clutch * 0.02) {
      let y = call === 'deep' ? ri(16, 42) : call === 'short' ? Math.round(5.5 + m.passA + gauss() * 3.2 - pred + clutch) : Math.round(3 + m.runA * 0.8 + gauss() * 5 - pred);
      if (call !== 'deep' && R() < (call === 'screen' ? 0.05 : 0.04)) y += ri(10, 35);
      pl = { pass: true, comp: true, y, who }; txt = `${CALLS[call]}: ${ctx.qb ? ctx.qb.n : 'QB'} to ${nm(who)} for ${y} yard${Math.abs(y) === 1 ? '' : 's'}.`;
    } else { pl = { pass: true, comp: false, y: 0 }; txt = `${CALLS[call]}: incomplete${who ? ', intended for ' + who.n : ''}.`; }
  }
  ds.calls.push(call);
  const gain = pl.sack ? pl.yl : pl.y;
  ds.plays.push(pl);
  if (pl.int || pl.fum) { ds.log.push(txt); endPlayDrive(sim, 'to'); return; }
  ds.yl = Math.min(100, ds.yl + gain); ds.togo -= gain;
  if (ds.yl >= 100) { ds.log.push(txt + ' Touchdown!'); pl.y += 0; endPlayDrive(sim, 'td'); return; }
  if (ds.yl <= 0) { ds.yl = 1; }
  if (ds.togo <= 0) { ds.down = 1; ds.togo = Math.min(10, 100 - ds.yl); txt += ' First down.'; }
  else { ds.down++; if (ds.down > 4) { ds.log.push(txt + ' Turnover on downs.'); sim.shortField[1 - p.s] = clamp((ds.yl - 25) / 60, 0, 0.6); endPlayDrive(sim, 'downs'); return; } }
  ds.log.push(txt);
}
function fgRange(ds) { return 117 - ds.yl <= 60; }
function kickFromDrive(sim, kind) {
  const p = sim.pending; if (!p || p.type !== 'drive') return; const ds = p.ds;
  if (kind === 'fg') { p.fgDist = 117 - ds.yl; ds.log.push(`Field goal try from ${p.fgDist} yards.`); endPlayDrive(sim, 'fg'); }
  else { ds.log.push('Punt.'); endPlayDrive(sim, 'punt'); }
}
function endPlayDrive(sim, out) {
  const p = sim.pending; sim.pending = null; const ds = p.ds;
  if (!ds.plays.length) ds.plays.push({ pass: false, comp: true, y: 0, who: starters('RB')[0] });
  const drv = { s: p.s, qtr: p.qtr, clock: p.clock, ot: p.ot, out, yards: Math.max(0, ds.yl - ds.start), plays: ds.plays, fgDist: p.fgDist, pr: { d: 0 }, called: ds.log.slice(), endYl: ds.yl };
  sim.lastCalled = ds.log.slice();
  execDrive(sim, drv);
}

/* ---------- press conferences ---------- */
function maybePresser(g) {
  if (state.event || (isCoach() && ROLE_TIER[state.co.role] < 2)) return; // head coaches and coordinators face reporters
  const opp = g.h === ME ? g.a : g.h; const win = g.mResult === 'W'; const ms = g.h === ME ? g.hs : g.as, os = g.h === ME ? g.as : g.hs;
  const big = g.oppRk || rivalOf(opp) || g.type !== 'reg' || !win || ms - os >= 28;
  // rarer and spaced out: a marquee game draws reporters more often than a routine one (CL-B11)
  const marquee = rivalOf(opp) || g.type !== 'reg' || (g.oppRk && g.oppRk <= 10);
  if (!big || (state.lastPresser != null && state.lastPresser.s === state.season && state.week - state.lastPresser.wk < 3) || R() > (marquee ? 0.5 : 0.22)) return;
  state.lastPresser = { s: state.season, wk: state.week };
  const o = teamName(opp);
  const q = win ? pick([`Reporter: "That was a statement against ${o}. Is this team a real contender?"`, `Reporter: "${ms}-${os}. What did you see out there today?"`, `Reporter: "Fans are fired up after beating ${o}. What's your message to them?"`, `Reporter: "Recruits were in the stands today. What does a win like this do on the trail?"`, `Reporter: "Who stood out to you in the ${o} game?"`])
    : pick([`Reporter: "Tough loss to ${o}. Is the program headed in the right direction?"`, `Reporter: "${os}-${ms}. Does the head coach still have your full support?"`, `Reporter: "Fans are frustrated after the ${o} game. What do you tell them?"`, `Reporter: "Boosters are asking questions after ${o}. Are they right to worry?"`, `Reporter: "What has to change before next week?"`]);
  const next = mGames().find(x => !x.done && x !== g); const nextOpp = next ? oppOf(next) : null;
  let opts = win ? [
    { label: 'Stay humble', hint: 'Board +1, fans +1', fx: { board: 1, fan: 1 } },
    { label: 'Talk big', hint: 'Fans +3, locker room +2, board −1', fx: { fan: 3, morale: 2, board: -1 } },
    { label: 'Credit the players', hint: 'Locker room +3', fx: { morale: 3 } },
    ...(nextOpp && !isFCS(nextOpp) ? [{ label: `Send a message to ${teamName(nextOpp)}`, hint: 'Fans +2, but they will be fired up next week', fx: { fan: 2 }, bulletin: nextOpp }] : []),
  ] : [
    { label: 'Own it', hint: 'Board +1, locker room +1, fans −1', fx: { board: 1, morale: 1, fan: -1 } },
    { label: 'Blame the officials', hint: 'Fans +2, board −3, possible conference fine', fx: { fan: 2, board: -3 }, fine: true },
    { label: 'Back the head coach', hint: 'Hot seat −8; fans −2 if he is already on it', fx: { hot: -8, fan: state.meters.hot > 60 ? -2 : 0, morale: 1 } },
    { label: 'Call out the players', hint: 'Locker room −5, fans +1, hot seat −3', fx: { morale: -5, fan: 1, hot: -3 } },
  ];
  // a coach's answers land with his players, the fans and his boss (relationships)
  if (isCoach()) opts = win ? [
    { label: 'Credit the players', hint: 'Your starters like it (+3 rapport), fans +1', fx: { rap: 3, fan: 1 } },
    { label: 'Credit the staff and the administration', hint: `${bossName()} likes it (+3 rapport), locker room +1`, fx: { boss: 3, morale: 1 } },
    { label: 'Talk big', hint: `Fans +3, starters +1, ${bossName().toLowerCase()} −2`, fx: { fan: 3, rap: 1, boss: -2 } },
    { label: 'Stay humble', hint: `${bossName()} +1, fans +1`, fx: { boss: 1, fan: 1 } },
  ] : [
    { label: 'Own it', hint: `Starters +2, ${bossName().toLowerCase()} +2, fans −1`, fx: { rap: 2, boss: 2, fan: -1 } },
    { label: 'Back your players', hint: `Starters +4, ${bossName().toLowerCase()} −1`, fx: { rap: 4, boss: -1 } },
    { label: 'Call out the effort', hint: `Starters −4, ${bossName().toLowerCase()} +2, fans +1`, fx: { rap: -4, boss: 2, fan: 1 } },
    { label: 'Point to injuries and bad breaks', hint: `Fans −1, ${bossName().toLowerCase()} −2`, fx: { fan: -1, boss: -2 } },
  ];
  state.event = { key: 'presser', wk: state.week, title: 'Press conference', text: isPro() ? q.replace(/the program/g, 'the team').replace(/program/g, 'team') : q, opts, data: {}, def: 0 };
}
function resolvePresser(i) {
  const ev = state.event; const o = ev.opts[i]; const fx = o.fx || {};
  Object.entries(fx).forEach(([k, v]) => { if (k === 'hot') state.meters.hot = clamp(state.meters.hot + v, 0, 100); else if (k === 'rap') POS_ORDER.flatMap(pos => starters(pos)).forEach(p => rapAdj(p, v, v > 0 ? 'What you said at the press conference' : 'Called out at the press conference')); else if (k === 'boss') rapAdj(bossRel(), v, v > 0 ? 'Your press conference' : 'Your press conference'); else if (k === 'board' && isCoach()) state.co.sec = clamp(state.co.sec + v, 0, 100); else mv(k, v); });
  let msg = `You chose to ${o.label[0].toLowerCase() + o.label.slice(1)}.`; // keep team names capitalized
  if (o.bulletin) { state.bulletin = o.bulletin; msg += ` ${teamName(o.bulletin)} put your quote on their bulletin board.`; }
  if (o.fine && R() < 0.4) { state.fin.balance -= 0.05; state.fin.ytd.eventx += 0.05; msg += ' The conference fined the department $50,000.'; }
  return msg;
}

/* ---------- contract negotiation ---------- */
function negOdds(c, o, ext) {
  const m = state.meters; const ask = ext ? c.salary * 1.12 : c.salary; const wantYrs = ext ? 3 : c.years;
  const prestige = 70 + (rankOf(ME) ? 12 - rankOf(ME) * 0.3 : 0) + (m.board - 60) * 0.1 + (facLvl('building') - 3) * 3;
  let p = ext ? 0.55 + (state.meters.morale - 60) / 200 : 0.5 + (prestige - coachOvr(c)) / 40;
  p += (o.sal / ask - 1) * 1.6 + (o.yrs - wantYrs) * 0.04 + (o.buy - 0.5) * 0.3 + (o.incConf ? 0.03 : 0) + (o.incCFP ? 0.04 : 0) - (c.fails || 0) * 0.15;
  return clamp(p, 0.02, 0.98);
}
function canExtend(c) { return !!c && !c.interim && c.extS !== state.season; }
function negotiateExt(role, o) {
  const c = state.staff[role]; if (!c || c.interim) return 'gone'; if (!canExtend(c)) return 'done';
  if (R() < negOdds(c, o, true)) { c.salary = r1(o.sal); c.years = o.yrs; c.buyPct = o.buy; c.inc = { conf: o.incConf ? r1(c.salary * 0.1) : 0, cfp: o.incCFP ? r1(c.salary * 0.15) : 0 }; c.fails = 0; c.extS = state.season; mv('morale', 2); if (role === 'HC') { if (state.meters.hot > 50) { mv('fan', -5); mv('boost', -4); } state.meters.hot = Math.max(5, state.meters.hot - 15); } addNews(`${c.name} signs a new deal: ${o.yrs} years at $${c.salary.toFixed(1)}M per year.`); return 'signed'; }
  c.fails = (c.fails || 0) + 1; if (c.fails >= 3) { c.fails = 0; state.hcUnhappy = role === 'HC' ? true : state.hcUnhappy; addNews(`Extension talks with ${c.name} broke down.`, 'bad'); return 'broke'; }
  return 'counter';
}

/* ---------- media & partner deals ---------- */
function dealOffers(d) {
  const mr = rankOf(ME); const base = DEAL_DEFS.find(x => x.id === d.id).amt * econ() * (0.85 + state.meters.fan / 250 + (mr ? (26 - mr) * 0.008 : -0.05));
  return [
    { k: 'short', label: 'Short deal', yrs: 3, amt: r1(base * 1.05), bonus: 0, perf: false, desc: 'Three years at a strong rate. Renegotiate soon.' },
    { k: 'long', label: 'Long deal', yrs: 8, amt: r1(base * 0.93), bonus: r1(base * 1.5), perf: false, desc: `Eight years, slightly less per year, plus a $${r1(base * 1.5)}M signing bonus now.` },
    { k: 'perf', label: 'Performance deal', yrs: 5, amt: r1(base * 0.8), bonus: 0, perf: true, desc: 'Five years at a lower base. +$1.5M for each playoff trip and +$0.5M for each 10-win season.' },
  ];
}
function signDeal(id, k) {
  const d = state.deals.find(x => x.id === id); if (!d || !dealOpen(d)) return; const o = dealOffers(d).find(x => x.k === k); if (!o) return;
  d.amt = o.amt; d.thru = state.season + o.yrs; d.perf = o.perf; d.kind = o.label;
  if (o.bonus) { state.fin.balance += o.bonus; state.fin.ytd.events += o.bonus; }
  addNews(`New ${d.name.toLowerCase()}: $${o.amt}M per year through ${d.thru}${o.bonus ? ` with a $${o.bonus}M signing bonus` : ''}.`);
}
const dealOpen = d => d.thru - state.season <= 1;

/* ---------- board meeting ---------- */
function boardApprove(base) { return clamp(base + (state.meters.board - 60) / 100 + (state.off && state.off.review && state.off.review.fin.net > 0 ? 0.12 : -0.12), 0.05, 0.95); }
function presentBoard(ch) {
  if (state.off && state.off.boardRes) return; // one meeting per offseason
  const res = [];
  if (ch.stance === 'invest') { if (R() < boardApprove(0.5)) { const before = state.fin.recruit; state.fin.recruit = r1(clamp(before + 1.5, 1, 10)); state.mediaBonus = state.mediaBonus || 0; res.push(state.fin.recruit > before ? `Approved: more money for recruiting (+$${r1(state.fin.recruit - before)}M).` : 'Approved, but the recruiting budget is already at the $10M maximum.'); } else { mv('board', -2); res.push('Rejected: the board would not raise football spending.'); } }
  else if (ch.stance === 'lean') { if (state.fin.recruit > 1) { state.fin.recruit = r1(clamp(state.fin.recruit - 1, 1, 10)); mv('board', 3); res.push('Approved: a leaner budget. The board appreciates the discipline.'); } else res.push('No change: the recruiting budget is already at the $1M minimum.'); }
  else res.push('Approved: a balanced budget.');
  if (ch.fac && ch.fac !== 'none') { const f = state.facilities.find(x => x.id === ch.fac); if (f && !f.building && f.lvl < 5) { if (R() < boardApprove(0.45)) { const c = facCost(f.lvl) * 0.5; state.fin.balance -= c; f.building = true; res.push(`Approved: the university pays half of the ${facName(f.id)} upgrade. You pay $${c.toFixed(1)}M.`); } else res.push(`Rejected: no university money for ${facName(f.id)} this year.`); } }
  if (ch.tix === 'raise') { if (state.fin.ticket >= LEVERS.ticket.max) res.push(`No change: tickets are already at the $${LEVERS.ticket.max} maximum.`); else if (R() < (state.meters.fan >= 55 ? 0.85 : 0.4)) { const d = Math.min(10, LEVERS.ticket.max - state.fin.ticket); state.fin.ticket += d; mv('fan', -Math.round(3 * d / 10)); res.push(`Approved: ticket prices go up $${d}.`); } else res.push('Rejected: no ticket increase.'); }
  else if (ch.tix === 'cut') { if (state.fin.ticket <= LEVERS.ticket.min) res.push(`No change: tickets are already at the $${LEVERS.ticket.min} minimum.`); else { const d = Math.min(10, state.fin.ticket - LEVERS.ticket.min); state.fin.ticket -= d; mv('fan', Math.round(3 * d / 10)); res.push(`Approved: ticket prices drop $${d}.`); } }
  if (mediaDue()) res.push(settleMedia(ch.media || 'linear'));
  if (ch.move && ch.move !== 'none') { const ok = tryMove(ch.move); res.push(ok ? `Approved: ${myName()} joins the ${CONFS[ch.move].name} next season (exit fee $${moveFee(ch.move)}M).` : `The ${CONFS[ch.move].name} said no to your application.`); if (ok) mv('board', CONFS[ch.move].p4 && !CONFS[T(ME).conf].p4 ? 4 : 0); }
  const v = state.off.vote;
  if (v) { v.yes = ch.vote === 'yes'; v.passed = R() < (v.yes ? 0.85 : 0.25); res.push(v.passed ? `The conference approved adding ${v.teams.map(teamName).join(' and ')}. They join next season.` : `Expansion failed. ${v.teams.map(teamName).join(' and ')} stay put.`); }
  state.off.boardRes = res; res.forEach(r => addNews('Board meeting: ' + r));
}

/* ---------- compliance ---------- */
function extraContact(id) { const r = state.rec.list.find(x => x.id === id); if (!r || r.contact || r.status !== 'open') return; r.contact = true; r.interest = clamp(r.interest + 8, 1, 99); state.meters.risk = clamp(state.meters.risk + 3, 0, 100); }
function investigate() {
  const risk = state.meters.risk; const chance = risk / 200 * (1 - ((state.fin.compliance == null ? 1 : state.fin.compliance) - 1) * 0.15);
  let out = null;
  if (R() < chance) {
    if (risk < 40) { state.fin.balance -= 1; mv('board', -5); out = 'Minor violation: $1M fine.'; }
    else if (risk < 70) { state.fin.balance -= 2; state.schRed = { s: state.season + 1, n: 5 }; mv('board', -10); out = 'Level II violation: $2M fine and five fewer roster spots next season.'; }
    else { state.ban = state.season + 1; mv('board', -18); mv('fan', -8); const h = state.history[state.history.length - 1]; if (h) h.vacated = true; out = `Level I violation: a postseason ban for ${state.season + 1} and this season's wins are vacated.`; }
    state.investigations.push({ s: state.season, out }); addNews('NCAA investigation: ' + out, 'bad');
  }
  state.meters.risk = Math.round(risk * 0.6);
  return out;
}

/* ---------- league: realignment, carousel, national recruiting ---------- */
function expansionCandidates() { const me = T(ME).conf; return Object.values(state.teams).filter(t => t.conf !== me && ['ACC', 'B12'].includes(t.conf) && t.id !== 'ND').sort((a, b) => b.rating - a.rating).slice(0, 2).map(t => t.id); }
function realign() {
  const moves = [];
  if (state.off && state.off.vote && state.off.vote.passed) { state.off.vote.teams.forEach(id => { moves.push([id, T(id).conf, T(ME).conf]); T(id).conf = T(ME).conf; }); state.mediaBonus = (state.mediaBonus || 0) + 3; }
  if (R() < 0.15) {
    const g6 = Object.values(state.teams).filter(t => !CONFS[t.conf].p4 && t.id !== 'ND' && t.id !== ME && t.rating >= 64).sort((a, b) => b.rating - a.rating)[0];
    if (g6) { const to = pick(['B12', 'ACC', 'P12'].filter(c => c !== g6.conf)); moves.push([g6.id, g6.conf, to]); g6.conf = to; }
  }
  if (state.myMove && state.myMove.s === state.season - 0 && state.myMove.done !== true) { const mm = state.myMove; moves.push([ME, T(ME).conf, mm.to]); T(ME).conf = mm.to; mm.done = true; } // your program's own move
  if (moves.length) { rebuildConfs(); moves.forEach(([id, from, to]) => addNews(`Realignment: ${teamName(id)} moves from the ${CONFS[from].name} to the ${CONFS[to].name}.`, 'big')); state.confMoves = (state.confMoves || []).concat(moves.map(m => ({ s: state.season + 1, id: m[0], from: m[1], to: m[2] }))); }
}
function otherCarousel() {
  const changes = [];
  const mk = isCoach() && state.co.market ? new Set(state.co.market.open.filter(o => o.role === 'HC' && o.tid !== ME).map(o => o.tid)) : null;
  Object.values(state.teams).forEach(t => {
    if (t.id === ME) return; const last = { w: t.w, l: t.l };
    const p4 = CONFS[t.conf].p4;
    if (mk ? mk.has(t.id) : (p4 && last.w <= 4 && R() < 0.55) || (!p4 && last.w <= 3 && R() < 0.4)) {
      const old = t.coach; t.coach = treePromote(t.id) || genName(); const bump = gauss() * 2.5; t.rating = r1(clamp(t.rating + bump, 38, 96)); t.off = r1(t.rating + gauss() * 2); t.def = r1(2 * t.rating - t.off);
      changes.push(`${t.name} fires ${old} and hires ${t.coach}.`);
    }
  });
  if (changes.length) { changes.slice(0, 5).forEach(c => addNews('Coaching carousel: ' + c)); if (changes.length > 5) addNews(`Coaching carousel: ${changes.length} programs changed head coaches this offseason.`); }
}
function nationalClasses(mine) {
  const rc = state.rec; const stolen = {};
  rc.list.forEach(r => { if (r.status === 'lost' && r.to && T(r.to)) stolen[r.to] = (stolen[r.to] || 0) + (r.star === 5 ? 100 : r.star === 4 ? 60 : 28) + r.pot * 0.2; });
  const rows = Object.values(state.teams).filter(t => t.id !== ME).map(t => ({ id: t.id, sc: Math.round((t.rating - 40) * 26 + (CONFS[t.conf].p4 ? 260 : 0) + (t.elo - 1500) * 0.3 + gauss() * 110 + (stolen[t.id] || 0)) }));
  rows.push({ id: ME, sc: Math.round(classScore(mine)) });
  rows.sort((a, b) => b.sc - a.sc);
  rows.forEach((r, i) => { T(r.id).classRank = i + 1; });
  rc.nat = rows.slice(0, 25);
  const mine2 = rows.findIndex(r => r.id === ME) + 1; state.natClasses = { s: state.season, rows: rows.slice(0, 25), mine: mine2 };
  return mine2;
}

/* ---------- walk-ons ---------- */
function holdTryouts() {
  if (state.tryouts === state.season) return; state.tryouts = state.season; state.fin.balance -= 0.1;
  state.walkons = [];
  for (let i = 0; i < 6; i++) { const pos = pick(POS_ORDER); const gem = R() < 0.12; const b = genBody(pos); state.walkons.push({ id: 'w' + i + Math.floor(R() * 1e6), n: genName(), pos, ovr: ri(48, 64) - Math.round(progShift() / 2), pot: (gem ? ri(84, 93) : ri(56, 78)) - Math.round(progShift() / 3), gem, home: pick(TOWNS)[0], ht: b.ht, wt: b.wt }); }
}
function addWalkon(id) {
  if (typeof liveRosterLock === 'function' && liveRosterLock()) return 'live'; const w = (state.walkons || []).find(x => x.id === id); if (!w || w.added) return 'gone'; if (state.roster.length >= rosterLimit()) return 'full';
  const p = makePlayer({ num: freeNumber(w.pos), n: w.n, pos: w.pos, cls: 'Fr', ht: w.ht, wt: w.wt, home: w.home, ovr: w.ovr, pot: w.pot, real: false, walkon: true, pay: 0 });
  state.roster.push(p); rebuildPMap(); state.depth[w.pos].push(p.id); w.added = true; addNews(`Walk-on ${w.n} (${w.pos}) joins the program after tryouts.`); return 'ok';
}
function awardScholarship(pid) { const p = P(pid); if (!p || !p.walkon) return; p.walkon = false; p.exWalkon = true; p.pay = Math.max(p.pay, 0.02); mv('morale', 1); addNews(`${p.n} is put on scholarship. The locker room erupts.`, 'win'); }

/* ---------- careers ---------- */
function recordCareers() {
  state.roster.forEach(p => { (p.hist = p.hist || []).push({ s: state.season, cls: clsLabel(p), pos: p.pos, ovr: p.ovr, gp: p.gp, st: Object.assign({}, p.st) }); });
}
function applyRedshirts() {
  state.roster.forEach(p => { if (!p.rsUsed && p.gp <= 4 && p.cls !== 'Gr') { p.rsUsed = true; p.rsThisYear = true; if (p.injSE) p.medRS = true; } });
}

/* ---------- season recap ---------- */
function buildRecap(delta) {
  const games = mGames().filter(g => g.done);
  const val = g => { const opp = oppOf(g); const e = T(opp) ? T(opp).elo : 1200; const mm = (g.h === ME ? g.hs - g.as : g.as - g.hs); return e + mm * 5; };
  const wins = games.filter(g => g.mResult === 'W'), losses = games.filter(g => g.mResult === 'L');
  const best = wins.sort((a, b) => val(b) - val(a))[0], worst = losses.sort((a, b) => val(a) - val(b))[0];
  const comeback = wins.filter(g => (g.minM || 0) <= -10).sort((a, b) => a.minM - b.minM)[0];
  const top = state.roster.filter(p => Object.keys(p.st).length).map(p => ({ n: p.n, pos: p.pos, sc: heisScore(p.st, p.pos, ME), line: statLineRaw(p.pos, p.st) })).sort((a, b) => b.sc - a.sc).slice(0, 3);
  const sc = g => { const a = g.h === ME ? g.hs : g.as, b = g.h === ME ? g.as : g.hs; return `${a}-${b}`; };
  return {
    best: best ? { opp: teamName(oppOf(best)), score: sc(best), id: best.id } : null, worst: worst ? { opp: teamName(oppOf(worst)), score: sc(worst), id: worst.id } : null,
    comeback: comeback ? { opp: teamName(oppOf(comeback)), score: sc(comeback), down: -comeback.minM } : null,
    top, grade: delta >= 12 ? 'A' : delta >= 5 ? 'B' : delta >= -2 ? 'C' : delta >= -8 ? 'D' : 'F',
  };
}
function statLineRaw(pos, st) { const g = k => st[k] || 0; if (pos === 'QB') return `${g('py')} pass yds, ${g('ptd')} TD`; if (pos === 'RB') return `${g('ry')} rush yds, ${g('rtd')} TD`; if (['WR', 'TE'].includes(pos)) return `${g('rcy')} rec yds, ${g('rctd')} TD`; return `${g('tk')} tkl, ${g('sk')} sk, ${g('int')} INT`; }

/* ---------- achievements & legacy ---------- */
function unlock(id) { if (state.ach[id]) return; state.ach[id] = { s: state.season }; const a = ACH.find(x => x[0] === id); addNews(`Achievement unlocked: ${a[1]}. ${a[2]}`, 'big'); state.achToast = a[1]; }
function checkAch(when, g) {
  const games = mGames(); const wins = games.filter(x => x.mResult === 'W');
  if (wins.length) unlock('first_win');
  if (g && g.done && g.mResult === 'W') {
    const opp = oppOf(g); const m = g.h === ME ? g.hs - g.as : g.as - g.hs;
    if (opp === archRival()) unlock('beat_osu');
    if (g.oppRk && g.oppRk <= 10 && m >= 21) unlock('blowout');
    if ((g.minM || 0) <= -17) unlock('comeback');
  }
  if (rankOf(ME) === 1) unlock('no1');
  if (wins.length >= 10) unlock('ten');
  { const nR = Object.keys(state.rivals || {}).length; const yrs = {}; state.rivalLog.filter(x => x.win).forEach(x => (yrs[x.s] = yrs[x.s] || new Set()).add(x.opp)); if (nR >= 2 && Object.values(yrs).some(s => s.size >= nR)) unlock('triple'); const ar = state.rivalLog.filter(x => x.opp === archRival()); if (ar.length >= 5 && ar.slice(-5).every(x => x.win)) unlock('osu5'); }
  if (state.roster.some(p => (p.walkon || p.exWalkon) && state.depth[p.pos].indexOf(p.id) < START[p.pos])) unlock('walkon');
  if (state.facilities.some(f => f.lvl >= 5)) unlock('maxfac');
  if (when === 'final') {
    if (games.some(x => x.type === 'cfp')) unlock('cfp');
    if (state.champ === ME) unlock('natl');
    if (games.some(x => x.type === 'ccg' && x.mResult === 'W')) unlock('b1g');
    if (games.length >= 12 && games.every(x => x.mResult === 'W')) unlock('undefeated');
    const home = games.filter(x => x.att); if (home.length >= 5 && home.every(x => x.att >= capacity() * 0.995)) unlock('fullhouse');
  }
  if (when === 'season') {
    const h = state.history; const aw = state.awards[state.awards.length - 1];
    if (aw && aw.heis[0] && aw.heis[0].tm === ME) unlock('heisman');
    if (h.length >= 3 && h.slice(-3).every(x => x.net >= 0)) unlock('profit3');
    if (h.length >= 5 && h.slice(0, 5).every(x => x.net >= 0)) unlock('profit_all');
    if (state.settings.diff === 'hard' && !state.gameOver) unlock('hard');
    if (h.length >= 10) unlock('decade');
    if (h.length >= 5 && !state.investigations.some(x => x.s > state.season - 5)) unlock('clean');
  }
  if (when === 'draft') { const byYr = {}; state.draft.filter(d => d.rd === 1).forEach(d => byYr[d.s] = (byYr[d.s] || 0) + 1); if (Object.values(byYr).some(n => n >= 3)) unlock('picks3'); }
  if (when === 'class' && state.rec && state.rec.classRank && state.rec.classRank <= 5) unlock('class5');
}
function legacyScore() {
  const h = state.history; const tr = state.trophies;
  const natl = tr.filter(t => t.k === 'natl').length, conf = tr.filter(t => t.k === 'conf').length, cfp = tr.filter(t => t.k === 'cfp').length;
  const wins = h.reduce((s, x) => s + (x.vacated ? 0 : x.w), 0); const osu = state.rivalLog.filter(x => x.opp === archRival() && x.win).length;
  const profit = h.filter(x => x.net >= 0).length; const r1c = state.draft.filter(d => d.rd === 1).length, picks = state.draft.length - r1c;
  const heis = state.awards.filter(a => a.heis[0] && a.heis[0].tm === ME).length;
  const ach = Object.keys(state.ach || {}).reduce((s, id) => s + (ACH.find(a => a[0] === id) || [0, 0, 0, 0])[3], 0);
  const raw = natl * 100 + conf * 40 + cfp * 20 + wins * 2 + osu * 10 + profit * 5 + r1c * 8 + picks * 2 + heis * 30 + ach;
  return Math.round(raw * (LEGACY_MULT[state.settings.diff] || 1));
}

/* ---------- custom program ---------- */
function applyCustom(c) {
  const t = state.teams[ME]; t.name = c.name; t.conf = c.conf; t.style = genStyle();
  state.me = { name: c.name, ab: (c.ab || c.name.slice(0, 4)).toUpperCase().slice(0, 5), stadium: c.stadium || c.name + ' Stadium', cap: clamp(+c.cap || 60000, 15000, 115000), c1: c.c1 || '#F5C518', c2: c.c2 || '#00274C', tier: c.tier, cfg: c };
  const mates = Object.values(state.teams).filter(x => x.conf === c.conf && x.id !== ME); const avg = mates.length ? mates.reduce((a, x) => a + x.rating, 0) / mates.length : 70;
  state.me.base = Math.round(clamp(avg + { power: 10, mid: 1, rebuild: -6 }[c.tier], 50, 88));
  t.rating = state.me.base; t.elo = 1500 + (t.rating - 70) * 12;
  state.deals = DEAL_DEFS.map(d => Object.assign({}, d, { amt: r1(d.amt * econ()) }));
  state.facilities.forEach(f => f.lvl = c.tier === 'power' ? 4 : c.tier === 'mid' ? 3 : 2);
}
function genCustomRoster(base) {
  const counts = { QB: 4, RB: 5, WR: 10, TE: 5, OL: 16, DE: 9, DT: 8, LB: 9, CB: 9, S: 8, K: 2, P: 2, LS: 1 };
  Object.entries(counts).forEach(([pos, n]) => {
    for (let i = 0; i < n; i++) {
      const cls = pick(['Fr', 'Fr', 'So', 'So', 'Jr', 'Jr', 'Sr', 'Sr', 'Gr']); const b = genBody(pos);
      const starterish = i < START[pos] + 1; const ovr = clamp(Math.round(base + (starterish ? 2 : -7) + gauss() * 4 + CLASSES.indexOf(cls) * 1.2), 45, 92);
      const pot = clamp(ovr + { Fr: 14, So: 10, Jr: 6, Sr: 3, Gr: 1 }[cls] + ri(0, 8), ovr, 97);
      state.roster.push(makePlayer({ num: 0, n: genName(), pos, cls, ht: b.ht, wt: b.wt, home: recruitTown(TEAM_STATE[ME])[0], ovr, pot, real: false }));
    }
  });
  rebuildPMap(); state.roster.forEach(p => { p.num = freeNumber(p.pos); });
}
function genCustomStaff(base) {
  const st = {}; STAFF_ROLES.forEach(r => { const c = genCandidates(r, 3)[1]; c.salary = r1(Math.max(0.1, c.salary * Math.max(0.3, econ()))); if (r === 'HC') { ['off', 'def', 'rec', 'dev', 'gm'].forEach(k => c[k] = clamp(Math.round(base + gauss() * 4), 55, 92)); } else c.ovr = clamp(Math.round(base - 2 + gauss() * 4), 55, 90); c.bg = 'Current staff'; st[r] = c; });
  if (st.HC && T(ME) && T(ME).coach && !state.me) st.HC.name = T(ME).coach;
  return st;
}
function ownSchedule() {
  const me = T(ME); const c = CONFS[me.conf]; const cg = c.confGames ? Math.min(c.confGames, c.teams.length - 1) : 0;
  const sched = []; const used = new Set([ME]); const book = ncBooked(state.season);
  const nonConf = Object.values(state.teams).filter(t => t.conf !== me.conf && t.id !== ME);
  const g5 = nonConf.filter(t => !CONFS[t.conf].p4 && t.id !== 'ND');
  const addBook = wk => { const b = book.find(x => x.wk === wk); if (b && !used.has(b.opp) && (isFCS(b.opp) || T(b.opp).conf !== me.conf)) { used.add(b.opp); sched.push([wk, b.opp, b.site !== 'A' ? 1 : 0, b.site === 'N' ? { neutral: true, payout: b.payout, loc: b.loc, name: 'Neutral site: ' + b.loc } : b.fee ? { fee: b.fee } : null]); return true; } return false; };
  if (cg) {
    // rivals from other conferences fill the early non-conference weeks before a buy game does
    const ncRv = Object.keys(state.rivals || {}).filter(id => T(id) && T(id).conf !== me.conf);
    [1, 2, 3].forEach(wk => { if (!addBook(wk)) { const rvO = ncRv.find(id => !used.has(id)); if (rvO) { used.add(rvO); sched.push([wk, rvO, (state.season + rvO.length + wk) % 2]); return; } const o = pick(g5.filter(t => !used.has(t.id))).id; used.add(o); sched.push([wk, o, 1, { fee: r1(rnd(1.2, 1.8)) }]); } });
    // Conference rivals are always on the schedule; the archrival closes the regular season.
    const rv = Object.keys(state.rivals || {}).filter(id => T(id) && T(id).conf === me.conf);
    const arch = archRival(); const lastWk = rv.includes(arch) ? arch : null;
    const pool = shuffle(c.teams.filter(t => t !== ME && !rv.includes(t)));
    const opps = rv.filter(x => x !== lastWk).concat(pool).slice(0, cg - (lastWk ? 1 : 0));
    const bye = ri(5, 9); const weeks = []; for (let w = 4; w <= 13; w++) if (w !== bye && !(lastWk && w === 13)) weeks.push(w);
    const wsel = shuffle(weeks).slice(0, opps.length).sort((a, b) => a - b);
    shuffle(opps).forEach((o, i) => { used.add(o); sched.push([wsel[i], o, i % 2 === 0 ? 1 : 0]); });
    if (lastWk) { used.add(lastWk); sched.push([13, lastWk, state.season % 2 === 1 ? 1 : 0]); }
    // non-conference rivals take an open week (the archrival gets week 13 when it's free)
    Object.keys(state.rivals || {}).filter(id => T(id) && T(id).conf !== me.conf && !used.has(id)).forEach(id => {
      const free = []; for (let w = 4; w <= 13; w++) if (!sched.some(x => x[0] === w) && w !== bye) free.push(w);
      if (!free.length || sched.length >= 12) return; const w = id === arch && free.includes(13) ? 13 : free[free.length - 1];
      used.add(id); sched.push([w, id, (state.season + id.length) % 2]);
    });
    const open = []; for (let w = 4; w <= 13; w++) if (!sched.some(x => x[0] === w)) open.push(w);
    while (sched.length < 12 && open.length > 1) { const w = open.splice(ri(0, open.length - 1), 1)[0]; const o = pick(nonConf.filter(t => !used.has(t.id))).id; used.add(o); sched.push([w, o, R() < 0.5 ? 1 : 0]); }
  } else {
    const pool = shuffle(nonConf.slice()); const bye = ri(5, 9); let k = 0;
    // independents keep their rivals; the archrival closes the season
    const rvI = Object.keys(state.rivals || {}).filter(id => T(id)); const arch = archRival();
    for (let w = 1; w <= 13; w++) { if (w === bye) continue; if (w <= 3 && addBook(w)) continue; let o = w === 13 && arch && rvI.includes(arch) && !used.has(arch) ? arch : w >= 9 ? rvI.find(id => !used.has(id) && id !== arch) : null; if (!o) o = pool.find(t => !used.has(t.id) && !rvI.includes(t.id)).id; used.add(o); sched.push([w, o, k++ % 2 === 0 ? 1 : 0]); }
  }
  return sched;
}

/* ---------- automation for multi-year sims ---------- */
function autoBoard() { if (!state.off.boardRes) presentBoard({ stance: finTotals().net >= 0 ? 'balanced' : 'lean', fac: 'none', tix: 'hold', vote: 'yes' }); }
function autoDeals() { (state.deals || []).forEach(d => { if (d.thru < state.season + 1) signDeal(d.id, 'short'); }); }
// a whole season on autopilot (the engine tests use it)
function autoSeason() {
  autoSeasonRecruiting(); let n = 0;
  while (state.phase !== 'offseason' && !state.gameOver && n++ < 40) advance();
  if (!state.gameOver) autoOffseason();
}

function autoFinishDrive(sim) {
  let g = 0; while (sim.pending && sim.pending.type === 'drive' && g++ < 60) { const ds = sim.pending.ds; if (ds.down === 4) { if (fgRange(ds) && 117 - ds.yl <= 52) kickFromDrive(sim, 'fg'); else if (ds.togo <= 2 && ds.yl >= 45) runPlay(sim, 'inside'); else kickFromDrive(sim, 'punt'); } else runPlay(sim, pick(['inside', 'outside', 'short', 'short', 'screen', 'deep'])); }
}

/* ---------- NFL Draft (AD mode) ----------
 * Each season's draft class is everyone draft-eligible across the country: your seniors and
 * likely early entrants, every other school's star players, and depth prospects generated from
 * each program's strength. Boards, the NFL standings that set the order, and teams' picks all come
 * from seeded generators keyed to the save and the year, so looking at the Draft tab never moves the
 * game's random sequence, and the same save always produces the same draft. */
const DPOS_ADJ = { QB: 2.5, DE: 1.5, CB: 1, OL: 0.8, WR: 0.5, DT: 0.3, LB: 0, S: -0.5, TE: -1, RB: -1.2, K: -9, P: -9, LS: -14 };
const draftYear = () => state.season + 1; // the class built from this season plays in next April's draft
function draftVal(ovr, pos, cls, key, bonus) { return r1(ovr + (DPOS_ADJ[pos] || 0) + (cls === 'Jr' || cls === 'So' ? 0.8 : 0) + (bonus || 0) + (hash(key + ':combine') - 0.5) * 3); }
function honorBonus(p) { const a = p.awards || []; const yr = a.filter(x => typeof x === 'string' && x.startsWith(String(state.season))); return (yr.some(x => /Heisman/.test(x)) ? 1.5 : 0) + (yr.some(x => /All-America/.test(x)) ? 1 : 0); }
// my players who would be in this class: seniors and graduates, plus juniors good enough to leave early
function myDraftables() {
  if (state.phase === 'offseason' && state.off && state.off.declared) return state.off.declared.map(d => Object.assign({}, d, { mine: true, tm: ME }));
  // the same bar the departures step uses: graduates 80+, seniors 79+, juniors 87+ may leave early
  return state.roster.filter(p => (p.cls === 'Gr' && p.ovr >= 80) || (p.cls === 'Sr' && p.ovr >= 79) || (p.cls === 'Jr' && p.ovr >= 87)).map(p => ({ id: p.id, n: p.n, pos: p.pos, cls: p.cls, ovr: p.ovr, tm: ME, mine: true, early: p.cls === 'Jr', v: draftVal(p.ovr, p.pos, p.cls, state.seed + ':' + p.id, honorBonus(p)) }));
}
let DP_CACHE = null;
function depthProspects() {
  const key = state.seed + ':dp:' + state.season + ':' + Object.keys(state.teams).length;
  if (DP_CACHE && DP_CACHE.key === key) return DP_CACHE.list;
  const r = lrng(key); const pk = a => a[Math.floor(r() * a.length)]; const g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const POSW = [['QB', 3], ['RB', 5], ['WR', 9], ['TE', 4], ['OL', 12], ['DE', 7], ['DT', 6], ['LB', 7], ['CB', 8], ['S', 6], ['K', 1], ['P', 1], ['LS', 0.4]]; const tot = POSW.reduce((s, x) => s + x[1], 0);
  const wp = () => { let x = r() * tot; for (const [p, w] of POSW) { x -= w; if (x <= 0) return p; } return 'OL'; };
  const list = [];
  Object.values(state.teams).forEach(t => {
    if (t.id === ME) return; const base = CONFS[t.conf].p4 || t.id === 'ND' ? 2.2 : 0.5; const n = Math.max(0, Math.round(base + (t.rating - 60) / 7 + g() * 0.8));
    for (let i = 0; i < n; i++) { const pos = wp(); const cls = r() < 0.18 ? 'Jr' : r() < 0.3 ? 'Gr' : 'Sr'; const ovr = clamp(Math.round(t.rating - 3 + g() * 4.5), 50, 96); const id = 'dp' + t.id + i;
      list.push({ id, n: pk(FIRST) + ' ' + pk(LAST), pos, cls, ovr, tm: t.id, v: draftVal(ovr, pos, cls, key + id) }); }
  });
  DP_CACHE = { key, list }; return list;
}
// the whole class, best first
function draftClass() {
  const out = myDraftables();
  Object.values(state.teams).forEach(t => { if (t.id === ME || !t.stars) return; t.stars.forEach(x => { if (x.cls === 'Sr' || x.cls === 'Gr' || (x.cls === 'Jr' && x.ovr >= 88)) out.push({ id: x.id, n: x.n, pos: x.pos, cls: x.cls, ovr: x.ovr, tm: t.id, star: true, v: draftVal(x.ovr, x.pos, x.cls, state.seed + ':' + x.id, x.ovr >= 95 ? 1 : 0) }); }); });
  return out.concat(depthProspects()).sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
}
// projected slot for a board position (1-based); 0 means likely undrafted
const projPick = rank => (rank <= DRAFT_PICKS ? rank : 0);
function projLabel(rank) { const pk = projPick(rank); if (!pk) return 'Undrafted'; const rd = pickRound(pk); return pk <= 10 ? 'Top 10' : rd === 1 ? 'Round 1' : 'Round ' + rd; }

// NFL standings for a season: each club's strength drifts year to year from its 2026 level
function nflPowers(season) {
  const pw = {}; NFL.forEach(t => pw[t.id] = t.p);
  for (let y = 2026; y <= season; y++) { const r = lrng(state.seed + ':nflpow:' + y); NFL.forEach(t => { const drift = (r() + r() + r() - 1.5) * 9; pw[t.id] = clamp(Math.round(pw[t.id] * 0.62 + 76 * 0.38 + drift), 52, 97); }); }
  return pw;
}
function nflSeason(season) {
  const pw = nflPowers(season); const r = lrng(state.seed + ':nflsea:' + season);
  const rows = NFL.map(t => { let w = 0; for (let g = 0; g < 17; g++) { const opp = NFL[Math.floor(r() * 32)]; const oppP = opp.id === t.id ? 76 : pw[opp.id]; if (r() < 1 / (1 + Math.exp(-(pw[t.id] - oppP) / 9))) w++; } return { id: t.id, w, l: 17 - w, p: pw[t.id] }; });
  // seven playoff teams a conference: four division winners and three wild cards
  const seeds = {}; ['AFC', 'NFC'].forEach(cf => { const c = rows.filter(x => NFL_BY[x.id].conf === cf).sort((a, b) => b.w - a.w || b.p - a.p);
    const divW = ['East', 'North', 'South', 'West'].map(dv => c.find(x => NFL_BY[x.id].div === dv)); const wc = c.filter(x => !divW.includes(x)).slice(0, 3); seeds[cf] = divW.sort((a, b) => b.w - a.w || b.p - a.p).concat(wc); });
  const pf = x => 1 / (1 + Math.exp(-(x.p - 76) / 6)) + x.w / 17; const champOf = list => { let best = null, bs = -1; list.forEach(x => { const s = pf(x) * (0.6 + r()); if (s > bs) { bs = s; best = x; } }); return best; };
  const afc = champOf(seeds.AFC), nfc = champOf(seeds.NFC); const champ = r() < pf(afc) / (pf(afc) + pf(nfc)) ? afc : nfc; const runner = champ === afc ? nfc : afc;
  const inPO = new Set(seeds.AFC.concat(seeds.NFC).map(x => x.id));
  return { season, rows, playoff: inPO, champ: champ.id, runner: runner.id };
}
// first-round order: non-playoff teams worst first, then playoff teams, Super Bowl loser and winner last
function draftOrder(season) {
  const ns = nflSeason(season); const key = x => (x.id === ns.champ ? 3 : x.id === ns.runner ? 2 : ns.playoff.has(x.id) ? 1 : 0);
  return ns.rows.slice().sort((a, b) => key(a) - key(b) || a.w - b.w || a.p - b.p).map(x => x.id);
}
// every pick: team for each slot, compensatory picks spread by a seeded draw
function draftSlots(season) {
  const order = draftOrder(season); const r = lrng(state.seed + ':comp:' + season); const slots = [];
  DRAFT_ROUNDS.forEach((n, ri0) => { for (let i = 0; i < n; i++) slots.push({ rd: ri0 + 1, tm: i < 32 ? order[i] : order[Math.floor(r() * 32)] }); });
  return slots.map((s, i) => Object.assign(s, { no: i + 1, inRd: i + 1 - DRAFT_ROUNDS.slice(0, s.rd - 1).reduce((a, b) => a + b, 0) }));
}
// mock or real: teams take the best player left, with a little team-by-team preference
function simDraft(season, pool) {
  const slots = draftSlots(season); const left = pool.slice(); const picks = [];
  slots.forEach(s => {
    let bi = 0, bv = -1e9; for (let i = 0; i < Math.min(14, left.length); i++) { const x = left[i]; const v = x.v + (hash(state.seed + ':' + s.tm + ':' + x.id) - 0.5) * 3.2 - i * 0.05; if (v > bv) { bv = v; bi = i; } }
    if (!left.length) return; const x = left.splice(bi, 1)[0]; picks.push(Object.assign({}, s, { id: x.id, n: x.n, pos: x.pos, cls: x.cls, ovr: x.ovr, school: x.tm, mine: !!x.mine }));
  });
  return { picks, undrafted: left };
}
// The real draft, run at the offseason's NFL Draft step.
function runADDraft() {
  const o = state.off; if (o.nfl) return o.nfl; const yr = draftYear();
  const pool = draftClass(); const res = simDraft(state.season, pool);
  const mine = res.picks.filter(p => p.mine); const udfa = res.undrafted.filter(x => x.mine);
  const rFA = lrng(state.seed + ':udfa:' + yr);
  mine.forEach(p => { state.draft.push({ s: yr, n: p.n, pos: p.pos, rd: p.rd, no: p.no, inRd: p.inRd, tm: p.tm });
    const al = state.alumni.find(a => (a.pid && a.pid === p.id) || (!a.pid && a.n === p.n && a.last === state.season)); if (al) al.where = `Drafted by the ${nflName(p.tm)}: round ${p.rd}, pick ${p.no} overall, ${yr} NFL Draft`; });
  udfa.forEach(x => { const tm = NFL[Math.floor(rFA() * 32)].id; const al = state.alumni.find(a => (a.pid && a.pid === x.id) || (!a.pid && a.n === x.n && a.last === state.season)); if (al) al.where = `Undrafted; signed with the ${nflName(tm)} as a free agent`; });
  const top = res.picks[0];
  o.nfl = { year: yr, picks: res.picks.map(p => ({ no: p.no, rd: p.rd, inRd: p.inRd, tm: p.tm, n: p.n, pos: p.pos, cls: p.cls, school: p.school, mine: p.mine })), udfa: udfa.map(x => ({ n: x.n, pos: x.pos })) };
  state.lastDraft = { year: yr, r1: o.nfl.picks.filter(p => p.rd === 1), mine: o.nfl.picks.filter(p => p.mine), udfa: o.nfl.udfa };
  addNews(`${yr} NFL Draft: the ${nflName(top.tm)} take ${top.pos} ${top.n} (${teamName(top.school)}) first overall.`);
  if (mine.length) { const r1n = mine.filter(p => p.rd === 1).length; addNews(`${mine.length} ${myName()} player${mine.length > 1 ? 's are' : ' is'} drafted${r1n ? `, ${r1n} in the first round` : ''}. ${mine.slice(0, 3).map(p => `${p.n} (round ${p.rd}, pick ${p.no}, ${NFL_BY[p.tm].nick})`).join('; ')}${mine.length > 3 ? '; and more' : ''}.`, 'win'); }
  else if (o.declared && o.declared.length) addNews(`No ${myName()} players are drafted this year.`, 'bad');
  checkAch('draft');
  return o.nfl;
}

// traits drawn from a player's name and position instead of the game's random sequence, so a free agent or
// draft prospect shows the same strengths before and after he joins you
function hashTraits(p) {
  const keys = TRAITS[p.pos]; if (!keys) return null; const g = k => { const u = Math.max(1e-9, hash(p.n + ':' + p.pos + ':' + k + ':u')), v = hash(p.n + ':' + p.pos + ':' + k + ':v'); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * 5; };
  const vals = keys.map(g); const mean = vals.reduce((a, b) => a + b, 0) / vals.length; const t = {}; keys.forEach((k, i) => t[k] = clamp(Math.round(p.ovr + vals[i] - mean), 35, 99));
  const o = TRAIT_OVERRIDE[p.n]; if (o) Object.keys(t).forEach(k => { if (o[k]) t[k] = o[k]; }); return t;
}
