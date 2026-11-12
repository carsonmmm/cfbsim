/* ===================== COACH MODE (engine) =====================
 * A coaching career runs on the same season engine as AD mode, with `state.kind = 'coach'` and
 * the coach's own record in `state.co`. The athletic director is computer-run: money, player pay,
 * facilities and partner deals happen without you, and the coach can only ask for things.
 * The coach sits in the program's staff as the entry marked `me`, so every rating the game sim
 * already reads (head coach, coordinators, position coaches) picks up your skills.
 * No DOM here. */
const isCoach = () => !!(typeof state !== 'undefined' && state && state.kind === 'coach');
const ROLE_TIER = { HC: 3, OC: 2, DC: 2, ST: 1, QB: 1, RB: 1, WR: 1, TE: 1, OL: 1, DE: 1, DT: 1, LB: 1, CB: 1, S: 1 };
const OFF_POS = ['QB', 'RB', 'WR', 'TE', 'OL'], DEF_POS = ['DE', 'DT', 'LB', 'CB', 'S'], ST_POS = ['K', 'P', 'LS'];
// the positions each role recruits and develops
function rolePositions(role) { return role === 'HC' ? POS_ORDER.slice() : role === 'OC' ? OFF_POS : role === 'DC' ? DEF_POS : role === 'ST' ? ST_POS : [role]; }
const roleSide = role => (role === 'HC' ? 'both' : role === 'OC' || OFF_POS.includes(role) ? 'off' : role === 'DC' || DEF_POS.includes(role) ? 'def' : 'st');
// who calls plays on game day: head coach both sides, coordinators their own side
const callsOff = () => isCoach() && (state.co.role === 'HC' || state.co.role === 'OC');
const callsDef = () => isCoach() && (state.co.role === 'HC' || state.co.role === 'DC');
const roleTitle = r => ROLE_TITLE[r] + (ROLE_TIER[r] === 1 && r !== 'ST' ? ' coach' : '');
const CO_GAMEDAY = { plan: ['Game plan only', 'Set the plan before kickoff and make halftime adjustments. The staff calls the plays.'], key: ['Key play calls', 'Call the plays on third and fourth down, in the red zone and in the last minutes. The staff calls the rest.'], all: ['Every play', 'Call every play for your side of the ball.'] };

/* ---------- your skills and your place on the staff ---------- */
function coachRoleOvr(role, sk) {
  if (role === 'OC') return Math.round(sk.off * 0.75 + sk.gm * 0.25);
  if (role === 'DC') return Math.round(sk.def * 0.75 + sk.gm * 0.25);
  if (role === 'ST') return Math.round((sk.off + sk.def) * 0.25 + sk.gm * 0.5);
  return Math.round((OFF_POS.includes(role) ? sk.off : sk.def) * 0.5 + sk.dev * 0.5);
}
function meStaff() {
  const c = state.co; const r = c.role; const sk = c.sk;
  const o = { id: 'me', me: true, real: false, name: c.name, role: r, title: roleTitle(r), bg: 'You', age: c.age, salary: c.contract.sal, years: Math.max(1, c.contract.left) };
  if (r === 'HC') Object.assign(o, { off: sk.off, def: sk.def, rec: sk.rec, dev: sk.dev, gm: sk.gm });
  else Object.assign(o, { ovr: coachRoleOvr(r, sk), rec: sk.rec, dev: sk.dev });
  return o;
}
// Writes your current skills and contract into your staff entry (and clears you out of any other role).
function syncMe() {
  if (!isCoach()) return;
  STAFF_ROLES.forEach(r => { const c = state.staff[r]; if (c && c.me && r !== state.co.role) state.staff[r] = null; });
  state.staff[state.co.role] = meStaff();
}

/* ---------- jobs and money ---------- */
function jobPrestige(tid, lvl) { lvl = lvl || (typeof isPro === 'function' && isPro() ? 'nfl' : 'col'); if (lvl === 'nfl') return nflPrestige(tid); const t = typeof colTeams === 'function' ? colTeams()[tid] : T(tid); if (!t) return 50; return t.rating + (CONFS[t.conf] && CONFS[t.conf].p4 || tid === 'ND' ? 6 : -4); }
const jobLvl = o => o.lvl || 'col';
const jobP = o => jobPrestige(o.tid, jobLvl(o));
const jobNm = o => (jobLvl(o) === 'nfl' ? nflName(o.tid) : colTeamName(o.tid));
// what a school pays for a role, in $M a year
function coachSalary(tid, role, rep, lvl) {
  lvl = lvl || (isPro() ? 'nfl' : 'col'); const p = jobPrestige(tid, lvl);
  if (lvl === 'nfl') { const q = clamp((p - 85) / 12, 0, 1.2); const b = role === 'HC' ? 6.5 + q * 7 : ['OC', 'DC'].includes(role) ? 1.6 + q * 2.4 : role === 'ST' ? 0.9 + q * 0.8 : 0.45 + q * 0.8; return r2(b * (0.85 + (rep || 50) / 330)); }
  const ct = colTeams()[tid]; const e = Math.max(0.25, progEcon(tid, ct ? ct.rating : 60));
  const base = role === 'HC' ? 1.2 + Math.pow(Math.max(0, p - 50) / 45, 2) * 10 : ['OC', 'DC'].includes(role) ? 0.3 + Math.pow(Math.max(0, p - 50) / 45, 2) * 2.4 : role === 'ST' ? 0.18 + Math.pow(Math.max(0, p - 50) / 45, 2) * 0.8 : 0.15 + Math.pow(Math.max(0, p - 50) / 45, 2) * 0.9;
  return r2(base * (0.75 + e * 0.25) * (0.85 + (rep || 50) / 330));
}
function defaultContract(tid, role, rep, r, lvl) {
  r = r || R; const sal = r2(coachSalary(tid, role, rep, lvl) * (0.92 + r() * 0.12));
  const yrs = role === 'HC' ? 5 : ['OC', 'DC'].includes(role) ? 3 : 2;
  return { sal, yrs, left: yrs, buy: role === 'HC' ? 60 : 40, exit: r2(sal * (role === 'HC' ? 1.5 : ['OC', 'DC'].includes(role) ? 0.4 : 0.15)), inc: { wins: 0, conf: false, cfp: false, title: false }, pool: role === 'HC' ? r1(Math.max(1.5, sal * 0.9 + jobPrestige(tid, lvl) * 0.04)) : 0 };
}
// How much a contract is worth to the coach per year, used by schools to judge your asks.
function contractValue(k, role) {
  const incV = (k.inc.wins ? 0.06 * (12 - k.inc.wins) : 0) + (k.inc.conf ? 0.04 : 0) + (k.inc.cfp ? 0.05 : 0) + (k.inc.title ? 0.02 : 0);
  return k.sal * (1 + incV) + k.sal * (k.yrs - (role === 'HC' ? 5 : 3)) * 0.05 + k.sal * (k.buy - 50) / 100 * 0.35 - k.exit * 0.04 + (k.pool || 0) * 0.35;
}
const incPay = k => ({ wins: r2(k.sal * 0.1), conf: r2(k.sal * 0.12), cfp: r2(k.sal * 0.15), title: r2(k.sal * 0.25) });

/* ---------- starting a career ---------- */
// Entry-level jobs for a coach who starts at the bottom: position coach at smaller programs.
function entryJobs(seed) {
  const r = lrng('entry:' + seed); const ids = Object.keys(CTEAMS0_AD).filter(id => { const t = CTEAMS0_AD[id]; return !CONFS[t.conf].p4 || t.rating <= 66; });
  const out = []; const used = new Set();
  const roles = ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'ST'];
  while (out.length < 5) { const id = ids[Math.floor(r() * ids.length)]; if (used.has(id)) continue; used.add(id); out.push({ tid: id, role: roles[Math.floor(r() * roles.length)] }); }
  return out;
}
function startSkills(start, role, tid) {
  const p = jobPrestige(tid); const b = start === 'climb' ? 63 : clamp(Math.round(58 + (p - 50) * 0.28 + ROLE_TIER[role] * 3), 62, 84);
  const sk = { off: b, def: b, rec: b, dev: b, gm: b };
  if (roleSide(role) === 'off') { sk.off += 6; sk.def -= 6; } else if (roleSide(role) === 'def') { sk.def += 6; sk.off -= 6; }
  if (ROLE_TIER[role] === 1) { sk.dev += 4; sk.rec += 3; sk.gm -= 4; }
  Object.keys(sk).forEach(k => sk[k] = clamp(sk[k], 50, 92));
  return sk;
}
// o: { name, start: 'any'|'climb', tid, role, diff, gameDay, seed }
function newCoachCareer(o) {
  newGame(o.diff || 'normal', null, o.seed, o.tid);
  const role = STAFF_ROLES.includes(o.role) ? o.role : 'HC'; const climb = o.start === 'climb';
  const rep = climb ? 25 : clamp(Math.round(30 + ROLE_TIER[role] * 10 + (jobPrestige(ME) - 60) * 0.5), 25, 80);
  state.kind = 'coach'; state.v = 5; const repB = clamp(+o.repBonus || 0, 0, 20);
  state.co = {
    name: String(o.name || 'Coach').slice(0, 30), age: climb ? 29 : 32 + ROLE_TIER[role] * 5, role, start: climb ? 'climb' : 'any', rep: clamp(rep + repB, 0, 100), sk: startSkills(o.start, role, ME),
    contract: defaultContract(ME, role, rep), sec: 62, gameDay: CO_GAMEDAY[o.gameDay] ? o.gameDay : 'key', hist: [], earn: 0, w: 0, l: 0, titles: 0, confT: 0, cfp: 0,
    req: { s: state.season, used: {} }, reqLog: [], travel: null, hired: state.season, schools: [ME], market: null, fired: null, neg: null, events: {},
  };
  // the coach you replace leaves the program
  syncMe(); coachSeasonStart(); setGoals(); autoCaptains();
  // the head coach's assistants fit his pool
  if (role === 'HC') state.co.contract.pool = r1(Math.max(state.co.contract.pool, assistantSpend() + 0.3));
  state.news = [];
  addNews(`${state.co.name} is the new ${roleTitle(role).toLowerCase()} at ${myName()}: ${state.co.contract.yrs} years at ${fmM(state.co.contract.sal)} a year.${role === 'HC' ? '' : ` Head coach: ${state.staff.HC.name}.`}`, 'big');
  // starting in the NFL: the college world waits, and you join an NFL staff this offseason
  if (o.lvl === 'nfl' && NFL_BY[o.nfl]) {
    const co = state.co; goPro(o.nfl, { role: 'coach' }); state.news = []; state.tline = [];
    co.rep = clamp(Math.round(40 + ROLE_TIER[role] * 10 + (nflPrestige(o.nfl) - 90) * 0.5), 30, 85); co.sk = startSkills('any', role, o.nfl); Object.keys(co.sk).forEach(k => co.sk[k] = clamp(co.sk[k] + 3, 50, 92));
    co.contract = defaultContract(o.nfl, role, co.rep); co.schools = ['nfl:' + o.nfl]; co.hired = state.season + 1; co.age += 3; syncMe();
    addNews(`${co.name} is the new ${roleTitle(role).toLowerCase()} for the ${myName()}: ${co.contract.yrs} years at ${fmM(co.contract.sal)} a year.`, 'big');
  }
}
const fmM = v => v <= 0 ? '$0' : '$' + (v >= 1 ? r2(v).toFixed(2).replace(/0$/, '') + 'M' : Math.round(v * 1000) + 'K');

/* ---------- asking the AD ---------- */
const REQS = {
  fac: { label: 'Facility upgrade', hint: 'Ask the AD to pay for an upgrade' },
  budget: { label: 'Bigger recruiting budget', hint: '+$1.5M a year for travel, visits and staff' },
  staff: { label: 'More money for assistants', hint: '+$0.5M a year in your assistant pool', hc: true },
  nil: { label: 'NIL help', hint: 'The AD asks the collective for more money for players' },
};
function reqUsed(k) { const q = state.co.req; if (q.s !== state.season) { q.s = state.season; q.used = {}; } return q.used[k]; }
function reqOdds(k) {
  const m = state.meters; const last = state.history[state.history.length - 1]; const pct = last ? last.w / Math.max(1, last.w + last.l) : 0.55;
  const cash = state.fin.balance > 20 * econ() ? 0.08 : state.fin.balance < 0 ? -0.25 : -0.05;
  const p = 0.32 + (m.board - 60) / 120 + (pct - 0.5) * 0.7 + cash + (state.co.rep - 55) / 220 + (state.co.role === 'HC' ? 0.08 : ['OC', 'DC'].includes(state.co.role) ? -0.05 : -0.15) - (k === 'fac' ? 0.08 : 0);
  return clamp(p, 0.05, 0.9);
}
function makeRequest(k, arg) {
  if (!isCoach() || !REQS[k] || reqUsed(k)) return null; if (REQS[k].hc && state.co.role !== 'HC') return null;
  const yes = R() < reqOdds(k); state.co.req.used[k] = yes ? 'yes' : 'no'; let txt = '';
  if (k === 'fac') { const f = state.facilities.find(x => x.id === arg && !x.building && x.lvl < 5); if (!f) { delete state.co.req.used[k]; return null; } if (yes) { const c = facCost(f.lvl); state.fin.balance -= c; state.fin.ytd.facilities = (state.fin.ytd.facilities || 0) + c; f.building = true; txt = `Approved: the AD starts work on ${facName(f.id)} (${fm(c)}). It opens before next season.`; } else txt = `Turned down: the AD won't fund ${facName(f.id)} right now.`; }
  else if (k === 'budget') { if (yes) { state.fin.recruit = r1(clamp(state.fin.recruit + 1.5, 1, 10)); txt = `Approved: the recruiting budget is now ${fm(state.fin.recruit)} a year.`; } else txt = 'Turned down: the recruiting budget stays where it is.'; }
  else if (k === 'staff') { if (yes) { state.co.contract.pool = r1(state.co.contract.pool + 0.5); txt = `Approved: your assistant pool is now ${fm(state.co.contract.pool)}.`; } else txt = 'Turned down: no more money for assistants this year.'; }
  else if (k === 'nil') { if (yes) { state.fin.collective = r1((state.fin.collective || 0) + 1.5 * Math.max(0.4, econ())); txt = 'Approved: the collective adds money for player pay.'; } else txt = 'Turned down: the collective is tapped out.'; }
  state.co.reqLog.unshift({ s: state.season, k, ok: yes, txt }); if (state.co.reqLog.length > 30) state.co.reqLog.length = 30;
  addNews('Request to the AD · ' + txt, yes ? 'win' : 'bad'); return { ok: yes, txt };
}

/* ---------- recruiting on the road ---------- */
// Travel days: a few a week in season (fewer for the head coach), more in the winter contact period.
function travelKey() { return state.phase === 'offseason' ? 'o' + state.season + '-' + state.off.step : 'w' + state.season + '-' + state.week; }
function travelBudget() {
  if (state.phase === 'offseason') return [3, 4, 5].includes(state.off.step) ? 4 : 0;
  if (!['regular', 'ccg'].includes(state.phase)) return 2;
  return state.co.role === 'HC' ? 1 : ['OC', 'DC'].includes(state.co.role) ? 2 : 3;
}
function travelLeft() { const t = state.co.travel; if (!t || t.key !== travelKey()) state.co.travel = { key: travelKey(), used: 0 }; return Math.max(0, travelBudget() - state.co.travel.used); }
// what your job lets you do, for the office card (plain text, no DOM)
function roleAuthority(role, nfl) {
  const pos = rolePositions(role); const all = role === 'HC'; const side = roleSide(role); const out = [];
  out.push(role === 'HC' ? 'Game day: you can call plays on both sides of the ball.' : role === 'OC' ? 'Game day: you call the offense. The head coach and the staff handle the rest.' : role === 'DC' ? 'Game day: you call the defense. The head coach and the staff handle the rest.' : 'Game day: the head coach and coordinators call the game. You can watch it live.');
  if (['HC', 'OC', 'DC'].includes(role)) out.push('You set the game plan before kickoff and make halftime adjustments.');
  out.push(nfl ? (all ? 'Players: you develop the whole roster and can send the GM up to 6 roster requests.' : `Players: you develop ${pos.join(', ')} and can send the GM up to ${['OC', 'DC'].includes(role) ? 4 : 2} roster requests.`) : (all ? 'Recruiting: you recruit every position.' : `Recruiting: you recruit ${pos.join(', ')}. The rest of the staff recruits everyone else.`));
  if (!nfl) out.push(`In-season recruiting trips: ${role === 'HC' ? 1 : ['OC', 'DC'].includes(role) ? 2 : 3} a week.`);
  out.push(nfl ? (role === 'HC' ? 'Staff: the club fills your assistant jobs. The GM runs the roster, trades and the cap.' : 'Staff: the head coach runs the staff. The GM runs the roster, trades and the cap.') : role === 'HC' ? 'Staff: you hire your assistants out of your staff budget. The AD runs money and facilities.' : 'Staff: the head coach hires and fires the assistants.');
  out.push(role === 'HC' ? 'You are judged on wins against expectations and the goals you were set.' : ROLE_TIER[role] === 2 ? `You are judged on where your ${side === 'off' ? 'offense' : 'defense'} ranks against expectations, and on wins.` : role === 'ST' ? 'You are judged mostly on wins.' : 'You are judged mostly on how your position group develops, then on your side of the ball and wins.');
  return out;
}
function canRecruit(pos) { return !isCoach() || rolePositions(state.co.role).includes(pos); }
function tripHome(id) {
  const r = state.rec && state.rec.list.find(x => x.id === id); if (!r || r.status !== 'open' || !canRecruit(r.pos) || travelLeft() < 1 || r.hv === state.season) return null;
  state.co.travel.used++; r.hv = state.season; const before = r.interest;
  r.interest = clamp(Math.round(r.interest + 4 + (state.co.sk.rec - 70) * 0.15 + (r.inState ? 2 : 0) + R() * 3), 1, 98); r.trend = r.interest - before;
  return r.interest - before;
}
function tripWatch(id) {
  const r = state.rec && state.rec.list.find(x => x.id === id); if (!r || r.status !== 'open' || !canRecruit(r.pos) || travelLeft() < 1 || r.seen === state.season) return null;
  state.co.travel.used++; r.seen = state.season; r.scouted = true; const before = r.interest;
  r.interest = clamp(Math.round(r.interest + 2 + R() * 2), 1, 98); r.trend = r.interest - before;
  return r.interest - before;
}
// Auto-recruiting: the staff spends the travel days on the best targets that still need convincing.
function autoTrips() {
  if (!isCoach() || !state.rec) return; let guard = 0;
  while (travelLeft() > 0 && guard++ < 8) {
    const t = state.rec.list.filter(r => r.status === 'open' && canRecruit(r.pos) && r.offered && r.interest < 86 && r.hv !== state.season).sort((a, b) => b.star - a.star || b.interest - a.interest)[0];
    if (t) { tripHome(t.id); continue; }
    const w = state.rec.list.filter(r => r.status === 'open' && canRecruit(r.pos) && r.seen !== state.season).sort((a, b) => b.star - a.star || b.pot - a.pot)[0];
    if (w) { tripWatch(w.id); continue; } break;
  }
}

/* ---------- coach events (in season) ---------- */
const CO_EVENTS = [
  { id: 'qbcontrol', roles: ['HC', 'OC', 'QB'], cond: () => { const q = state.depth.QB.map(P).filter(avail); return q.length >= 2 && q[1].ovr >= q[0].ovr - 3; }, make: () => { const q = state.depth.QB.map(P).filter(avail); return { title: 'Quarterback controversy', text: `${q[1].n} has outplayed ${q[0].n} in practice all week, and reporters are asking who starts.`, opts: [{ label: `Stick with ${q[0].n}`, hint: 'Locker room +2', fx: { morale: 2 } }, { label: `Start ${q[1].n}`, hint: 'Swaps the depth chart. Locker room −2', fx: { morale: -2 }, swap: true }], data: { a: q[0].id, b: q[1].id } }; } },
  { id: 'discipline', roles: ['HC'], cond: () => state.roster.some(x => !x.real && avail(x) && state.depth[x.pos].indexOf(x.id) < START[x.pos]), make: () => { const p = pick(state.roster.filter(x => !x.real && avail(x) && state.depth[x.pos].indexOf(x.id) < START[x.pos])); /* off-field storylines only ever involve fictional players (B13) */ return { title: 'Team rules', text: `${p.n} (${p.pos}) missed curfew the night before practice.`, opts: [{ label: 'Sit him for a half', hint: 'He misses the first half of the next game. Locker room +2', fx: { morale: 2 }, sit: true }, { label: 'Handle it quietly', hint: 'Locker room −2', fx: { morale: -2 } }], data: { pid: p.id } }; } },
  { id: 'practice', roles: ['HC', 'OC', 'DC'], cond: () => true, make: () => ({ title: 'Practice plan', text: 'The trainers say the team is worn down after a physical stretch.', opts: [{ label: 'Pads off this week', hint: 'Fewer injuries in the next game, a little less sharp. Locker room +1', fx: { morale: 1 }, pads: 'off' }, { label: 'Keep the pads on', hint: 'A little sharper in the next game, but more injury risk. Locker room −1', fx: { morale: -1 }, pads: 'on' }], data: {} }) },
  { id: 'media', roles: ['HC', 'OC', 'DC'], cond: () => true, make: () => ({ title: 'Radio show', text: 'The local radio show wants you on the air before a big week.', opts: [{ label: 'Go on and sell the program', hint: 'Fans +2, recruiting buzz', fx: { fan: 2 }, buzz: true }, { label: 'Stay focused on the game plan', hint: 'Locker room +1', fx: { morale: 1 } }], data: {} }) },
  { id: 'poach', roles: ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'ST', 'OC', 'DC'], cond: () => state.co.rep >= 40, make: () => ({ title: 'A call from a rival staff', text: 'A coach at a rival school asks if you would listen to a job offer after the season.', opts: [{ label: 'Say you are happy here', hint: 'Job security +3', fx: {}, sec: 3 }, { label: 'Say you will listen', hint: 'Reputation +2, job security −3', fx: {}, sec: -3, rep: 2 }], data: {} }) },
];
function coachEvent() {
  if (state.event || state.phase !== 'regular' || R() > 0.16) return;
  const ev = state.co.events = state.co.events || {}; const now = state.season * 20 + state.week;
  const opts = CO_EVENTS.filter(e => e.roles.includes(state.co.role) && e.cond() && !(ev[e.id] && now - ev[e.id] < 12)); if (!opts.length) return;
  const e = pick(opts); ev[e.id] = now; const m = e.make(); if (!m) return;
  state.event = { key: 'coach:' + e.id, wk: state.week, title: m.title, text: m.text, opts: m.opts, data: m.data, def: 0 };
}
function resolveCoachEvent(i) {
  const ev = state.event; const o = ev.opts[i] || ev.opts[0]; state.event = null;
  Object.entries(o.fx || {}).forEach(([k, v]) => mv(k, v));
  if (o.swap) { const a = state.depth.QB; const x = a.indexOf(ev.data.a), y = a.indexOf(ev.data.b); if (x >= 0 && y >= 0) [a[x], a[y]] = [a[y], a[x]]; }
  // who the choice lands on (relationships)
  if (ev.key === 'coach:qbcontrol' && ev.data) { const a = P(ev.data.a), b = P(ev.data.b); if (o.swap) { rapAdj(b, 8, 'Named the starter'); rapAdj(a, -10, 'Lost the starting job'); } else { rapAdj(a, 5, 'You stood by him'); rapAdj(b, -5, 'Kept on the bench'); } }
  if (ev.key === 'coach:discipline' && ev.data) { const p = P(ev.data.pid); if (o.sit) rapAdj(p, -6, 'Sat for a half'); else rapAdj(p, 3, 'You handled it quietly'); }
  if (o.sec) state.co.sec = clamp(state.co.sec + o.sec, 0, 100); if (o.rep) state.co.rep = clamp(state.co.rep + o.rep, 0, 100);
  // next-game effects, cleared when that game is played (B12)
  const next = state.games.filter(g => (g.h === ME || g.a === ME) && !g.done).sort((a, b) => a.wk - b.wk)[0];
  if (o.sit && next) { const p = P(ev.data.pid); if (p) p.halfOut = next.id; }
  if (o.pads && next) state.padsWk = { gid: next.id, mode: o.pads };
  if (o.buzz && state.rec) state.rec.list.forEach(r => { if (r.status === 'open' && r.offered) r.interest = clamp(r.interest + 1, 1, 99); });
  return `You chose: ${o.label[0].toLowerCase() + o.label.slice(1)}.`;
}

/* ---------- the computer-run AD ---------- */
// Offseason business the AD handles in Coach mode: the board meeting, partner deals, paying
// starters what they're worth and building a facility when the reserve can carry it.
function aiADOffseason() {
  if (!state.off.boardRes) presentBoard({ stance: finTotals().net >= 0 ? 'balanced' : 'lean', fac: 'none', tix: 'hold', vote: 'yes' });
  autoDeals();
  POS_ORDER.forEach(pos => starters(pos).forEach(p => { if (p.pay < marketValue(p) && payRoom() > 0.3) p.pay = marketValue(p); }));
  const f = state.facilities.filter(x => !x.building && x.lvl < 5).sort((a, b) => a.lvl - b.lvl)[0];
  if (f && state.fin.balance > facCost(f.lvl) * 1.8 && R() < 0.5) { state.fin.balance -= facCost(f.lvl); f.building = true; addNews(`The athletic department starts work on ${facName(f.id)}.`); }
}

/* ---------- end of the season: your review ---------- */
function unitRanks() {
  const ts = Object.values(state.teams).filter(t => t.w + t.l > 0); const g = t => Math.max(1, t.w + t.l);
  const off = ts.slice().sort((a, b) => b.pf / g(b) - a.pf / g(a)).findIndex(t => t.id === ME) + 1;
  const def = ts.slice().sort((a, b) => a.pa / g(a) - b.pa / g(b)).findIndex(t => t.id === ME) + 1;
  const me = T(ME); return { off, def, ppg: r1(me.pf / g(me)), papg: r1(me.pa / g(me)), n: ts.length };
}
function expUnitRank(side) { const ts = Object.values(state.teams); const v = id => (id === ME ? (side === 'off' ? state.co.preOff : state.co.preDef) : (side === 'off' ? T(id).off : T(id).def)) || 0; const mine = v(ME); return ts.filter(t => v(t.id) > mine).length + 1; }
// Called from startOffseason after the AD-side season review is built.
// where a coach's job security gets him fired. Updated balance: bosses lose patience much sooner (v9.47)
const coFireAt = () => diff().fire + (balOn() ? 20 : 0);
function coachSeasonEnd() {
  const co = state.co; const rv = state.off.review; const ur = unitRanks();
  const met = rv.goals.filter(x => x.st === 'met').length, failed = rv.goals.filter(x => x.st === 'failed').length;
  const role = co.role; const first = co.hired === state.season; const confChamp = state.games.some(g => g.type === 'ccg' && (g.h === ME || g.a === ME) && g.done && winnerOf(g) === ME);
  const inCFP = state.games.some(g => g.type === 'cfp' && (g.h === ME || g.a === ME)); const champ = state.champ === ME;
  const eOff = expUnitRank('off'), eDef = expUnitRank('def');
  let d;
  if (role === 'HC') d = (rv.regW - rv.exp) * 4 + met * 3 - failed * 4 + (champ ? 25 : 0) + (state.meters.hot >= 85 ? -6 : 0);
  else if (role === 'OC' || OFF_POS.includes(role)) d = (eOff - ur.off) / (role === 'OC' ? 5 : 9) + (rv.regW - rv.exp) * (role === 'OC' ? 1.5 : 0.8) + (champ ? (role === 'OC' ? 10 : 6) : 0);
  else if (role === 'DC' || DEF_POS.includes(role)) d = (eDef - ur.def) / (role === 'DC' ? 5 : 9) + (rv.regW - rv.exp) * (role === 'DC' ? 1.5 : 0.8) + (champ ? (role === 'DC' ? 10 : 6) : 0);
  else d = (rv.regW - rv.exp) * 2 + (champ ? 10 : 0);
  if (ROLE_TIER[role] === 1 && role !== 'ST') d += (co.lastDev || 0) * 4;
  d += (bossRel().rap - 55) * 0.12; // how you get along with your boss (relationships) // a position coach is judged mostly on how his group developed last offseason
  d = clamp(d, -30, 30); if (d < 0) d *= diff().neg; if (d < 0 && first) d *= 0.6;
  const secBefore = co.sec; co.sec = clamp(Math.round(60 + (co.sec - 60) * 0.8 + d), 0, 100);
  const repD = clamp((rv.regW - rv.exp) * 0.9 + (champ ? 12 : 0) + (confChamp ? 4 : 0) + (inCFP ? 3 : 0) + (ROLE_TIER[role] === 2 && (role === 'OC' ? ur.off : ur.def) <= 10 ? 3 : 0) + d / 5 + (ROLE_TIER[role] < 3 && co.age < 50 ? 2 : 0), -8, 18); // assistants also build a name with every season
  co.rep = clamp(Math.round(co.rep + (repD > 0 ? repD * (1 - co.rep / 125) : repD) + 0.5), 0, 100); // harder to climb near the top
  // skills grow with experience; past 62 they start to slip
  const grow = co.age < 62 ? 1 : -1; const k = role === 'HC' ? ['gm', 'off', 'def', 'rec', 'dev'] : roleSide(role) === 'off' ? ['off', 'gm', 'dev', 'rec'] : roleSide(role) === 'def' ? ['def', 'gm', 'dev', 'rec'] : ['gm', 'dev', 'rec'];
  k.forEach((x, i) => { co.sk[x] = clamp(co.sk[x] + (i < 2 ? grow : R() < 0.5 ? grow : 0) + (d > 8 && i === 0 ? 1 : 0), 45, 97); });
  const rc = state.rec && state.rec.classRank; if (rc && rc <= 25) co.sk.rec = clamp(co.sk.rec + 1, 45, 97);
  // pay and incentives
  const k2 = co.contract; const ip = incPay(k2); let bonus = 0; const why = [];
  if (k2.inc.wins && rv.w >= k2.inc.wins) { bonus += ip.wins; why.push(`${k2.inc.wins}+ wins`); }
  if (k2.inc.conf && confChamp) { bonus += ip.conf; why.push('conference title'); }
  if (k2.inc.cfp && inCFP) { bonus += ip.cfp; why.push('playoff'); }
  if (k2.inc.title && champ) { bonus += ip.title; why.push('national title'); }
  co.earn = r2(co.earn + k2.sal + bonus); if (bonus) addNews(`Incentives paid to ${co.name}: ${fmM(bonus)} (${why.join(', ')}).`, 'win');
  k2.left = Math.max(0, k2.left - 1); co.age++;
  co.w += rv.w; co.l += rv.l; if (champ) co.titles++; if (confChamp) co.confT++; if (inCFP) co.cfp++;
  co.hist.push({ s: state.season, tm: ME, role, w: rv.w, l: rv.l, rank: rv.finalRank || 0, post: champ ? 'National champions' : inCFP ? 'College Football Playoff' : (state.games.filter(g => (g.h === ME || g.a === ME) && g.type === 'bowl').map(g => g.name)[0] || ''), off: ur.off, def: ur.def, sec: co.sec, bonus });
  co.review = { secBefore, sec: co.sec, d: Math.round(d), repD: Math.round(repD), ur, eOff, eDef, bonus, why };
  // decisions about you
  co.fired = null; const fireAt = coFireAt();
  if (!state.settings.noFire) {
    if (role === 'HC' && co.sec <= fireAt && !first) co.fired = { why: `The athletic director fired you after ${aAn(rv.w + '-' + rv.l)} season. The school owes you ${fmM(k2.sal * k2.left * k2.buy / 100)} on your buyout.`, pay: r2(k2.sal * k2.left * k2.buy / 100) };
    else if (role !== 'HC' && co.sec <= fireAt + 6 && !first) co.fired = { why: `The head coach let you go after the season. You're owed ${fmM(k2.sal * k2.left * k2.buy / 100)}.`, pay: r2(k2.sal * k2.left * k2.buy / 100) };
  }
  // the head coach above you can be fired too, and a new boss may clean house
  co.newBoss = null;
  if (!co.fired && role !== 'HC') {
    const hc = state.staff.HC; const shaky = state.meters.hot >= 80 || rv.regW < rv.exp - 3;
    if (hc && !hc.me && shaky && R() < 0.6) {
      co.newBoss = { old: hc.name, open: true }; addNews(`${myName()} fires head coach ${hc.name}.`, 'bad');
      if (R() > 0.45 + (co.sec - 50) / 100) co.fired = { why: `The new head coach is bringing his own staff, so you're out.`, pay: r2(k2.sal * k2.left * k2.buy / 100) };
    }
  }
  if (co.fired) { co.earn = r2(co.earn + co.fired.pay); addNews(`${co.name} is out at ${myName()}. ${co.fired.why}`, 'bad'); }
  else if (k2.left <= 0) addNews(`${co.name}'s contract with ${myName()} is up.`);
  co.market = buildMarket();
}

/* ---------- the job market ---------- */
// Your pull for a job, 0-100: reputation and current level against the job's prestige and level.
function jobInterest(tid, role, lvl) {
  lvl = lvl || (isPro() ? 'nfl' : 'col');
  const co = state.co; const curTier = co.fired ? Math.max(1, ROLE_TIER[co.role] - 1) : ROLE_TIER[co.role];
  const recent = co.hist.slice(-2).reduce((s, h) => s + (h.w - h.l), 0) * 0.5; const last = co.hist[co.hist.length - 1];
  const unit = last && (last.role === 'OC' || last.role === 'DC') ? clamp((60 - (last.role === 'OC' ? last.off : last.def)) / 10, -3, 6) : 0;
  const nflNew = lvl === 'nfl' && !co.hist.some(h => h.lvl === 'nfl') && !isPro() ? 6 : 0; // first NFL job is a harder sell
  const V = co.rep + curTier * 8 + recent + unit; const D = 0.6 * jobPrestige(tid, lvl) + 16 * ROLE_TIER[role] - 18 + nflNew + coLadder(tid, role, lvl, curTier, recent);
  return clamp(Math.round(50 + (V - D) * 2.5), 0, 98);
}
// Updated balance: each rung of the ladder takes time. Moving up a level wants a couple of seasons at the current
// one; a much bigger program, or an NFL head job straight from college, asks for more. A breakout year softens it (BAL-14).
function coLadder(tid, role, lvl, curTier, recent) {
  if (!balOn()) return 0; const co = state.co; const here = isPro() ? 'nfl' : 'col';
  let ten = 0; for (let i = co.hist.length - 1; i >= 0 && ROLE_TIER[co.hist[i].role] >= curTier; i--) ten++; // seasons at this level or higher
  let tenJob = 0; for (let i = co.hist.length - 1; i >= 0 && co.hist[i].tm === ME && co.hist[i].role === co.role; i--) tenJob++; // seasons in this job
  const step = ROLE_TIER[role] - curTier; let pen = 0;
  if (step > 0) pen += Math.max(0, step * 2 + 1 - ten) * 14; /* each rung wants about three seasons on the one below (v9.47: missing seasons count for more) */
  if (lvl === 'nfl' && role === 'HC') { const nc = co.hist.filter(h => (h.lvl === 'nfl' || (h.tm && typeof NFL_BY !== 'undefined' && NFL_BY[h.tm])) && ['OC', 'DC', 'HC'].includes(h.role)).length; if (nc < 2) pen += (2 - nc) * 12; } /* NFL owners want two seasons running an NFL unit */
  // a much bigger program at the same rung wants a track record where you are: one good year is not enough (v9.47)
  const pj = jobPrestige(tid, lvl) - jobPrestige(ME, here); if (step >= 0 && pj > 4) { pen += (pj - 4) * (tenJob < 2 ? 1.6 : tenJob < 3 ? 1.4 : tenJob < 4 ? 0.6 : 0.3); if (recent < 3) pen += (3 - recent) * 3; } /* and a winning record to show for it */
  if (lvl === 'nfl' && role === 'HC' && !co.hist.some(h => h.lvl === 'nfl' || (h.tm && typeof NFL_BY !== 'undefined' && NFL_BY[h.tm]))) pen += here === 'col' ? 26 : 18;
  const brk = recent >= 6 ? 0.7 : recent >= 4 ? 0.85 : 1; // a breakout softens it, never erases it
  const dk = (state.settings && state.settings.diff) || 'normal'; const dm = dk === 'easy' ? 0.7 : dk === 'hard' ? 1.6 : 1;
  return pen * brk * dm * sbx('ladder');
}
function buildMarket() {
  const co = state.co; const r = lrng(state.seed + ':mkt:' + state.season); const open = []; const here = isPro() ? 'nfl' : 'col';
  const add = (lvl, tid, role) => { if (!open.some(o => o.lvl === lvl && o.tid === tid && o.role === role) && !(lvl === here && tid === ME && role === co.role)) open.push({ lvl, tid, role }); };
  // college head coaching jobs: programs that fire their coach after a bad year, plus a few surprise openings
  Object.values(colTeams()).forEach(t => {
    if (here === 'col' && t.id === ME) return; const p4 = CONFS[t.conf] && CONFS[t.conf].p4; const last = t.hist && t.hist.length ? t.hist[t.hist.length - 1] : null; const w = here === 'col' ? t.w : last ? last.w : null;
    if (w == null ? r() < 0.1 : (p4 && w <= 4 && r() < 0.55) || (!p4 && w <= 3 && r() < 0.4) || r() < 0.03) add('col', t.id, 'HC'); // no record yet (the college world is waiting): about one program in ten changes coaches
  });
  if (co.newBoss && co.role !== 'HC') open.push({ lvl: here, tid: ME, role: 'HC', home: true });
  // assistant jobs around the country
  const ids = Object.keys(colTeams()).filter(id => here !== 'col' || id !== ME);
  for (let i = 0; i < (here === 'col' ? 26 : 16); i++) add('col', ids[Math.floor(r() * ids.length)], STAFF_ROLES[1 + Math.floor(r() * (STAFF_ROLES.length - 1))]);
  // the NFL: clubs that fired their head coach, and assistant openings
  const nflIds = NFL.map(t => t.id).filter(id => here !== 'nfl' || id !== ME);
  const hcOpen = here === 'nfl' && PS().off && PS().off.review ? (PS().off.review.openings || []) : nflIds.filter(() => r() < 0.18);
  hcOpen.forEach(tid => add('nfl', tid, 'HC'));
  for (let i = 0; i < 12; i++) add('nfl', nflIds[Math.floor(r() * nflIds.length)], STAFF_ROLES[1 + Math.floor(r() * (STAFF_ROLES.length - 1))]);
  open.forEach(o => { o.int = jobInterest(o.tid, o.role, o.lvl); o.id = (o.lvl === 'nfl' ? 'nfl:' : '') + o.tid + ':' + o.role; });
  // the hottest fits call you first
  const calls = open.filter(o => o.int >= 72 && ROLE_TIER[o.role] >= ROLE_TIER[co.role] - (co.fired ? 1 : 0)).sort((a, b) => jobP(b) + ROLE_TIER[b.role] * 15 - jobP(a) - ROLE_TIER[a.role] * 15).slice(0, 3);
  calls.forEach(o => { o.offer = makeOffer(o.tid, o.role, r, false, o.lvl); o.called = true; });
  // a coach who is out of work always hears from someone
  if (co.fired && !open.some(o => o.offer)) { const fall = open.filter(o => ROLE_TIER[o.role] <= Math.max(1, ROLE_TIER[co.role] - 1)).sort((a, b) => b.int - a.int).slice(0, 2); fall.forEach(o => { o.offer = makeOffer(o.tid, o.role, r, false, o.lvl); o.called = true; }); }
  // your own job: a new deal if the contract is up and they still want you, or an extension talk
  const k = co.contract; const home = co.fired ? null : { lvl: here, tid: ME, role: co.role, home: true, id: (here === 'nfl' ? 'nfl:' : '') + ME + ':' + co.role + ':home' };
  if (home) { home.int = clamp(co.sec + 15, 0, 98); if (k.left <= 0) { if (co.sec >= 45) home.offer = makeOffer(ME, co.role, r, true, here); else home.notRetained = true; } }
  return { open: open.sort((a, b) => ROLE_TIER[b.role] - ROLE_TIER[a.role] || jobP(b) - jobP(a)), home, interviews: 3, done: false, take: null, log: [] };
}
function makeOffer(tid, role, r, renew, lvl) {
  lvl = lvl || (isPro() ? 'nfl' : 'col');
  const k = defaultContract(tid, role, state.co.rep, r || R, lvl); if (renew) k.sal = r2(Math.max(k.sal, state.co.contract.sal * (1 + (state.co.sec - 55) / 200)));
  // what the school would go up to
  const eager = (jobInterest(tid, role, lvl) - 50) / 100;
  return { k, max: r2(contractValue(k, role) * (1.05 + Math.max(0, eager) * 0.2)), rounds: 0, status: 'open' };
}
const PITCHES = { recruit: 'Recruiting plan', scheme: 'Scheme and game plan', culture: 'Culture and development' };
// An interview: matching what the school cares about most helps.
function interviewJob(id, pitch) {
  const m = state.co.market; const o = m && m.open.find(x => x.id === id); if (!o || o.offer || o.tried || m.interviews <= 0 || !PITCHES[pitch]) return null;
  m.interviews--; o.tried = true; const wants = ['recruit', 'scheme', 'culture'][Math.floor(hash(state.seed + o.id + state.season) * 3)];
  const p = clamp(o.int / 100 + (pitch === wants ? 0.15 : -0.05), 0.03, 0.95); o.wants = wants;
  if (R() < p) { o.offer = makeOffer(o.tid, o.role, null, false, jobLvl(o)); m.log.unshift(`${jobNm(o)} offered you the ${roleTitle(o.role).toLowerCase()} job.`); return { ok: true, wants }; }
  m.log.unshift(`${jobNm(o)} went with another candidate${pitch !== wants ? ` (they cared most about ${PITCHES[wants].toLowerCase()})` : ''}.`); return { ok: false, wants };
}
function marketJob(id) { const m = state.co.market; if (!m) return null; if (m.home && m.home.id === id) return m.home; return m.open.find(x => x.id === id) || null; }
// Back-and-forth: your terms against what the school will pay. Three rounds, then they walk.
function coNegotiate(id, ask) {
  const o = marketJob(id); if (!o || !o.offer || o.offer.status !== 'open') return null; const of = o.offer;
  const k = { sal: r2(clamp(+ask.sal || of.k.sal, 0.05, 30)), yrs: clamp(Math.round(+ask.yrs || of.k.yrs), 1, 7), buy: clamp(Math.round(+ask.buy || of.k.buy), 0, 100), exit: r1(clamp(+ask.exit, 0, 50)), inc: { wins: [0, 8, 9, 10, 11].includes(+ask.wins) ? +ask.wins : 0, conf: !!ask.conf, cfp: !!ask.cfp, title: !!ask.title }, pool: o.role === 'HC' ? r1(clamp(+ask.pool || of.k.pool, 0.5, 15)) : 0 };
  k.left = k.yrs; of.rounds++; const v = contractValue(k, o.role);
  if (v <= of.max) { of.k = k; of.status = 'agreed'; return { res: 'accept' }; }
  if (v > of.max * 1.3 || of.rounds >= 3) {
    if (o.home) { of.status = 'final'; return { res: 'final' }; }
    of.status = 'walked'; return { res: 'walk' };
  }
  // the school meets you partway: salary first, then the extras
  const c = Object.assign({}, k, { inc: Object.assign({}, k.inc) }); const over = v / of.max;
  c.sal = r2(of.k.sal + (k.sal - of.k.sal) * clamp(0.9 / over - 0.3, 0.15, 0.85)); c.buy = Math.round((k.buy + of.k.buy) / 2); if (over > 1.12) { c.inc.title = false; c.inc.cfp = false; }
  c.pool = o.role === 'HC' ? r1((k.pool + of.k.pool) / 2) : 0; c.left = c.yrs;
  while (contractValue(c, o.role) > of.max && c.sal > of.k.sal * 0.8) c.sal = r2(c.sal * 0.97);
  of.k = c; return { res: 'counter', k: c };
}
// Takes the school's terms as they stand.
function acceptOffer(id) {
  const o = marketJob(id); const m = state.co.market; if (!o || !o.offer || !['open', 'agreed', 'final'].includes(o.offer.status) || m.done) return false;
  m.take = { id: o.id, lvl: jobLvl(o), tid: o.tid, role: o.role, k: Object.assign({}, o.offer.k, { left: o.offer.k.yrs }), home: !!o.home }; o.offer.status = 'agreed'; return true;
}
// Auto contract talks: one counter for about 8% more, then sign what they settle on.
function autoNegotiate(id) { const o = marketJob(id); if (!o || !o.offer) return false; if (o.offer.status === 'open') { const a = o.offer.k; coNegotiate(id, Object.assign({}, a, { sal: r2(a.sal * 1.08), wins: a.inc.wins, conf: a.inc.conf, cfp: a.inc.cfp, title: a.inc.title })); } return acceptOffer(id); }
function marketBlocked() { const co = state.co; const m = co.market; if (!m || m.done) return ''; if (m.take) return ''; if (co.fired) return 'You need a job. Take an offer, or interview for one.'; if (m.home && m.home.notRetained) return 'Your school did not keep you. Find a new job.'; if (m.home && m.home.offer && co.contract.left <= 0) return 'Your contract is up: re-sign or take another job.'; return ''; }
// Leaves the market: takes the chosen job, or stays put.
function finishMarket() {
  const co = state.co; const m = co.market; if (!m || m.done) return true;
  if (!m.take) { if (marketBlocked()) return false; m.done = true; addNews(`${co.name} stays at ${myName()} as ${roleTitle(co.role).toLowerCase()}.`); return true; }
  const t = m.take; m.done = true;
  if (t.home && t.role === co.role) { co.contract = t.k; co.sec = Math.max(co.sec, 55); syncMe(); addNews(`${co.name} signs a new deal with ${myName()}: ${t.k.yrs} years at ${fmM(t.k.sal)} a year.`, 'big'); return true; }
  // leaving early costs the exit fee; the new school covers half
  if (!co.fired && co.contract.left > 0 && co.contract.exit) { const fee = r1(co.contract.exit / 2); co.earn = r2(co.earn - fee); addNews(`${co.name} pays ${fmM(fee)} of his ${fmM(co.contract.exit)} exit fee; ${jobNm(t)} covers the rest.`); }
  STAFF_ROLES.forEach(r => { const c = state.staff[r]; if (c && !c.me && !c.interim && (ROLE_TIER[r] >= 2 || (c.ovr || 0) >= 72)) treeAdd(c, r, ME, r); }); /* your coordinators and best assistants join your coaching tree */
  const mv2 = coachMoveTo(t.tid, t.role, t.k, t.lvl || 'col'); return mv2 === 'catchup' ? 'catchup' : true;
}
function autoMarket() {
  const co = state.co; const m = co.market; if (!m || m.done) return;
  if (!m.take) {
    const cands = [m.home].concat(m.open).filter(o => o && o.offer && o.offer.status !== 'walked');
    const better = cands.filter(o => !o.home && (ROLE_TIER[o.role] > ROLE_TIER[co.role] || (ROLE_TIER[o.role] === ROLE_TIER[co.role] && jobP(o) > jobPrestige(ME) + 6)));
    const pickJob = co.fired || (m.home && m.home.notRetained) ? cands.sort((a, b) => ROLE_TIER[b.role] - ROLE_TIER[a.role] || jobP(b) - jobP(a))[0] : better[0] || (m.home && m.home.offer && co.contract.left <= 0 ? m.home : null);
    if (!pickJob && (co.fired || (m.home && m.home.notRetained))) {
      // still nothing: interview until someone says yes
      const tryJobs = m.open.filter(o => !o.offer && !o.tried).sort((a, b) => b.int - a.int); for (const o of tryJobs) { if (m.interviews <= 0) break; interviewJob(o.id, ['recruit', 'scheme', 'culture'][Math.floor(hash(state.seed + o.id + state.season) * 3)]); if (o.offer) { autoNegotiate(o.id); break; } }
      if (!m.take) { const any = m.open.filter(o => ROLE_TIER[o.role] === 1).sort((a, b) => b.int - a.int)[0]; if (any) { any.offer = makeOffer(any.tid, any.role, null, false, jobLvl(any)); autoNegotiate(any.id); } }
    } else if (pickJob) autoNegotiate(pickJob.id);
  }
  finishMarket();
}

/* ---------- moving to a new job ---------- */
// Rebuilds everything that belongs to one program (roster, staff, rivals, money, recruiting)
// for a new school, keeping the league, the calendar and the coach. Used by Coach mode moves
// and by an AD who takes a job at another school.
function switchProgram(tid) {
  const old = ME; const ms = michStrength();
  const ot = T(old); ot.rating = Math.round(ms.ovr); ot.off = r1(ms.off); ot.def = r1(ms.def); ot.st = r1(ms.st); ot.style = ot.style || genStyle(); genStars(ot);
  ot.coach = state.staff.HC && !state.staff.HC.me ? state.staff.HC.name : genName();
  ME = tid; state.my = tid; state.me = null; const t = T(tid); const r0 = Math.round(t.rating);
  state.econ = progEcon(tid, r0); state.deals = DEAL_DEFS.map(d => Object.assign({}, d, { amt: r1(d.amt * econ()) }));
  const fl = r0 >= 84 ? 4 : r0 >= 72 ? 3 : 2; state.facilities = FAC_DEFS.map(f => ({ id: f.id, lvl: clamp(fl + (f.id === 'stadium' && r0 >= 88 ? 1 : 0) - (['med', 'academic'].includes(f.id) && fl >= 3 ? 1 : 0), 1, 5), building: false }));
  state.roster = []; state.depth = {}; genCustomRoster(Math.round(r0 - 1.5)); rebuildPMap();
  POS_ORDER.forEach(pos => { state.depth[pos] = state.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id); });
  state.staff = genCustomStaff(Math.round(r0 - 1.5)); state.staff.HC.name = t.coach || state.staff.HC.name;
  calibrateRoster(r0); state.roster.forEach(p => p.ovr0 = p.ovr);
  STAFF_ROLES.forEach(r => state.cands[r] = genCandidates(r, r === 'HC' ? 6 : 4));
  delete t.stars;
  setupRivals(); state.rivalLog = []; state.book = { game: {}, season: {} }; state.alumni = []; state.trophies = []; state.draft = []; state.history = []; state.captains = [];
  const bal = r1(10 + 30 * econ()); const keepYtd = state.fin.ytd; state.fin = newFinance(bal); state.fin.ytd = keepYtd; state.fin.ticket = econ() >= 0.95 ? 85 : econ() >= 0.8 ? 75 : econ() >= 0.6 ? 60 : 35; state.fin.recruit = r1(Math.max(1, 4 * econ()));
  state.meters = { fan: 64, boost: 60, board: 62, morale: 60, hot: 15, risk: 10 }; state.ncBook = {}; state.ncOffers = {}; state.walkons = null; state.lastDraft = null;
  // the class in progress at the new school: some recruits already committed before you arrived
  genRecruitClass(); const room = projRoom(); state.rec.list.filter(r => r.star <= 3).slice(0, Math.round(room * 0.4)).forEach(r => { r.status = 'mc'; r.offered = true; r.interest = Math.max(r.interest, 80); });
  if (state.off) { state.off.review = state.off.review || null; state.off.departures = null; state.off.declared = []; }
  autoCaptains(); applyThemeSafe();
}
function applyThemeSafe() { if (typeof applyTheme === 'function') try { applyTheme(); } catch (e) { } }
function coachMoveTo(tid, role, k, lvl) {
  const co = state.co; const here = isPro() ? 'nfl' : 'col'; lvl = lvl || here;
  const fromName = here === 'nfl' ? nflName(ME) : myName(); const moved = tid !== ME || lvl !== here;
  if (lvl !== here) {
    co.hist.forEach(h => { if (!h.lvl) h.lvl = here; });
    if (lvl === 'nfl') { goPro(tid, { role: 'coach' }); }
    else { state.pendingArrive = { tid, role: 'coach', crole: role, k, target: state.season + 1 }; goCollegeBegin(); return 'catchup'; }
  } else if (moved) { if (here === 'nfl') { releaseClub(); takeClub(tid); } else switchProgram(tid); }
  else if (role !== co.role) { const c = genCandidates(co.role, 1)[0]; state.staff[co.role] = c; }
  co.role = role; co.contract = Object.assign({}, k, { left: k.yrs }); co.sec = 62; co.hired = state.season + 1; co.fired = null; co.newBoss = null;
  const key = (lvl === 'nfl' ? 'nfl:' : '') + tid; if (!co.schools.includes(key)) co.schools.push(key);
  syncMe(); state.meters.hot = 15;
  addNews(`${co.name} is the new ${roleTitle(role).toLowerCase()} ${lvl === 'nfl' ? 'for the' : 'at'} ${lvl === 'nfl' ? nflName(tid) : teamName(tid)}: ${k.yrs} years at ${fmM(k.sal)} a year${moved ? `, coming over from ${fromName}` : ''}.`, 'big');
  return true;
}
// When the head coach above you was fired, a new one arrives with the new season.
function coachNewBoss() { const co = state.co; if (!co.newBoss || co.role === 'HC') return; const c = genCandidates('HC', 3)[0]; state.staff.HC = c; addNews(`${myName()} hires ${c.name} as head coach.`); co.newBoss = null; }

/* ---------- saves ---------- */
function migrateCoach(s) {
  if (s.kind !== 'coach') return;
  const co = s.co; if (!co) throw new Error('The coach record is missing.');
  co.req = co.req || { s: s.season, used: {} }; co.reqLog = co.reqLog || []; co.hist = co.hist || []; co.schools = co.schools || [s.my]; co.events = co.events || {};
}
function checkCoach(s) {
  if (s.kind !== 'coach') return; const co = s.co; const num = v => typeof v === 'number' && Number.isFinite(v);
  if (!co || typeof co.name !== 'string' || !STAFF_ROLES.includes(co.role) || !co.sk || !['off', 'def', 'rec', 'dev', 'gm'].every(k => num(co.sk[k]))) throw new Error('The coach record is damaged.');
  if (!co.contract || !num(co.contract.sal) || !num(co.contract.left) || !co.contract.inc) throw new Error('The coach contract is damaged.');
  if (!s.staff[co.role] || !s.staff[co.role].me) throw new Error('The coach is missing from the staff.');
}

/* ---------- practice and development ---------- */
// Position coaches and coordinators pick where practice time goes for their own group.
const CO_FOCUS = { balanced: ['Balanced', 'Everyone gets reps.'], starters: ['Sharpen the starters', 'Starters develop a little faster.'], young: ['Develop the young players', 'Freshmen and sophomores develop faster.'] };
function coachFocusDev(p) {
  const co = state.co; if (!rolePositions(co.role).includes(p.pos) || co.role === 'HC') return 0;
  const f = co.focus || 'balanced'; const starter = state.depth[p.pos].indexOf(p.id) < START[p.pos];
  return (co.sk.dev - 70) / 600 + (f === 'starters' && starter ? 0.06 : f === 'young' && ['Fr', 'So'].includes(p.cls) ? 0.07 : 0);
}
function coachDevReport(log) {
  const co = state.co; const mine = rolePositions(co.role); const by = id => P(id);
  const gain = l => (l.length ? l.reduce((s, x) => s + x.after - x.before, 0) / l.length : 0);
  const g1 = gain(log.filter(x => by(x.id) && mine.includes(by(x.id).pos))), g0 = gain(log.filter(x => by(x.id) && !mine.includes(by(x.id).pos)));
  co.lastDev = r1(g1 - g0); co.devGain = r1(g1);
}
function coachSeasonStart() {
  const co = state.co; const ms = michStrength(); co.preOff = ms.off; co.preDef = ms.def; co.travel = null; co.market = null; co.review = null; syncMe();
}

// what the head coach is spending on assistants ($M a year), the user excepted
function assistantSpend() { return r1(STAFF_ROLES.filter(r => r !== 'HC').reduce((s, r) => { const c = state.staff[r]; return s + (c && !c.me ? c.salary || 0 : 0); }, 0)); }

/* ---------- game day: calling the defense, and "key plays only" ----------
 * Your defense calls a front or coverage against the play the opponent runs. The offense picks
 * its play from down, distance and its own tendencies; your call shifts the result. With
 * "Key play calls" the staff calls the routine downs and hands you third and fourth down, the
 * red zone and the last drives of each half. */
const DCALLS = { base: 'Base defense', box: 'Stack the box', blitz: 'Blitz', zone: 'Cover 2 zone', man: 'Man press' };
const DCALL_HINT = { base: 'Sound against everything', box: 'Stops the run, soft against passes', blitz: 'Sacks and stops, but big plays if they beat it', zone: 'Takes away deep shots, gives up underneath', man: 'Tight on short throws, can get beaten deep' };
// [yards, completion, sack, big-play multiplier] for your call (rows) against their play (columns)
const DMATRIX = {
  base: { inside: [0, 0, 0, 1], outside: [0, 0, 0, 1], short: [0, 0, 0, 1], deep: [0, 0, 0, 1], screen: [0, 0, 0, 1] },
  box: { inside: [-2.2, 0, 0, 0.6], outside: [-1.2, 0, 0, 0.8], short: [0.5, 0.05, 0, 1.2], deep: [0, 0.06, 0, 1.4], screen: [1.5, 0.03, 0, 1.3] },
  blitz: { inside: [-1, 0, 0, 1.3], outside: [0.6, 0, 0, 1.5], short: [0, -0.05, 0.07, 1.3], deep: [0, -0.1, 0.1, 1.6], screen: [3, 0.04, 0, 1.8] },
  zone: { inside: [1, 0, 0, 1], outside: [-0.3, 0, 0, 0.9], short: [-1, 0.03, 0, 0.8], deep: [0, -0.15, 0, 0.5], screen: [0.6, 0, 0, 1] },
  man: { inside: [0.6, 0, 0, 1.1], outside: [0.3, 0, 0, 1.1], short: [0, -0.08, 0.01, 1], deep: [0, 0.02, 0, 1.25], screen: [-0.6, -0.04, 0, 0.9] },
};
function startDefDrive(sim, s, qtr, clock, ot) {
  const start = ot && sim.otRule !== 'nfl' && sim.otRule !== 'sudden' ? 75 : clamp(25 + Math.round((sim.shortField[s] || 0) * 60), 20, 60); sim.shortField[s] = 0;
  sim.pending = { type: 'ddrive', s, qtr, clock, ot, ds: { yl: start, start, down: 1, togo: 10, plays: [], log: [], calls: [], dcalls: [] } };
}
function oppTendency(sim, ds) {
  const o = isFCS(sim.oppId) ? { lean: 0 } : oppUnits(sim.oppId); const lean = o.lean || 0;
  let run = clamp(0.48 + lean * 0.03, 0.25, 0.7);
  if (ds.togo <= 2) run = Math.max(run, 0.65); else if (ds.togo >= 7) run = Math.min(run, 0.2); else if (ds.down >= 3) run *= 0.7;
  return run;
}
function oppCall(sim, ds) {
  const run = oppTendency(sim, ds);
  if (R() < run) return R() < 0.62 ? 'inside' : 'outside';
  const r = R(); return ds.togo >= 12 ? (r < 0.45 ? 'deep' : r < 0.85 ? 'short' : 'screen') : r < 0.62 ? 'short' : r < 0.82 ? 'deep' : 'screen';
}
// Fourth down for the opponent: kick, punt or go. Returns true when the drive ended.
function defPreSnap(sim) {
  const p = sim.pending; if (!p || p.type !== 'ddrive') return false; const ds = p.ds; if (ds.down < 4) return false;
  const margin = sim.pts[1 - sim.mSide] - sim.pts[sim.mSide]; const late = p.qtr === 4 && sim.i >= sim.total - 3;
  if (ds.togo <= 2 && ds.yl >= 40 && (R() < 0.45 || (late && margin < 0))) return false; // they go for it
  if (late && margin < 0 && margin >= -8) return false;
  if (fgRange(ds) && 117 - ds.yl <= 52) { p.fgDist = 117 - ds.yl; ds.log.push(`${teamName(sim.oppId)} tries a ${p.fgDist}-yard field goal.`); endDefDrive(sim, 'fg'); return true; }
  ds.log.push(`${teamName(sim.oppId)} punts.`); endDefDrive(sim, 'punt'); return true;
}
function runDefPlay(sim, dcall) {
  const p = sim.pending; if (!p || p.type !== 'ddrive' || !DCALLS[dcall]) return; const ds = p.ds;
  const ou = isFCS(sim.oppId) ? { run: strength(sim.oppId).off, pass: strength(sim.oppId).off } : oppUnits(sim.oppId); const mu = michUnits();
  const runA = (ou.run - mu.runD) / 10, passA = (ou.pass - mu.passD) / 10; const call = oppCall(sim, ds); const m = DMATRIX[dcall][call];
  const adapt = ds.dcalls.slice(-2).filter(c => c === dcall).length * 0.7; // an offense adjusts to the same call over and over
  const octx = sim.octx || {}; const nm = x => (x ? x.n : null); const opp = teamName(sim.oppId);
  let pl, txt;
  if (call === 'inside' || call === 'outside') {
    let y = Math.round((call === 'inside' ? 3.6 + runA * 1.3 : 4 + runA * 1.3) + gauss() * (call === 'inside' ? 2.6 : 4.2) + m[0] + adapt);
    if (R() < (0.04 + runA * 0.01) * m[3]) y += ri(12, 45);
    pl = { pass: false, comp: true, y };
    if (R() < 0.013) { pl.fum = true; pl.comp = false; txt = `${DCALLS[dcall]} vs. ${CALLS[call].toLowerCase()}: fumble! Your defense recovers.`; }
    else txt = `${DCALLS[dcall]} vs. ${CALLS[call].toLowerCase()}: ${nm(octx.rb) || opp} ${y > 0 ? 'gains ' + y : y === 0 ? 'is stopped for no gain' : 'loses ' + -y}${Math.abs(y) === 1 || y === 0 ? '' : ' yards'}${y === 1 ? ' yard' : ''}.`;
  } else {
    const sack = Math.max(0.01, (call === 'deep' ? 0.07 : call === 'short' ? 0.04 : 0.02) - passA * 0.01 + m[2] + ((mu.rush || 75) - 75) * 0.002);
    const cp = clamp((call === 'deep' ? 0.38 : call === 'short' ? 0.66 : 0.8) + passA * 0.045 + m[1] + adapt * 0.03, 0.12, 0.9);
    const intP = (call === 'deep' ? 0.05 : call === 'short' ? 0.016 : 0.008) * (m[1] < 0 ? 1.4 : 1);
    const qb = nm(octx.qb) || 'The quarterback';
    if (R() < sack) { const y = -ri(4, 9); pl = { pass: true, comp: false, sack: true, y: 0, ly: y }; txt = `${DCALLS[dcall]}: ${qb} is sacked for a loss of ${-y}!`; }
    else if (R() < intP) { pl = { pass: true, comp: false, int: true, y: 0 }; txt = `${DCALLS[dcall]} vs. ${CALLS[call].toLowerCase()}: intercepted! Your ball.`; }
    else if (R() < cp) {
      let y = call === 'deep' ? ri(16, 42) : call === 'short' ? Math.round(5.5 + passA + gauss() * 3.2 + m[0] + adapt) : Math.round(3 + runA * 0.8 + gauss() * 5 + m[0] + adapt);
      if (call !== 'deep' && R() < 0.04 * m[3]) y += ri(10, 35);
      pl = { pass: true, comp: true, y }; txt = `${DCALLS[dcall]} vs. ${CALLS[call].toLowerCase()}: ${qb} completes it${nm(octx.wr) && R() < 0.4 ? ' to ' + nm(octx.wr) : ''} for ${y} yard${Math.abs(y) === 1 ? '' : 's'}.`;
    } else { pl = { pass: true, comp: false, y: 0 }; txt = `${DCALLS[dcall]} vs. ${CALLS[call].toLowerCase()}: incomplete.`; }
  }
  ds.dcalls.push(dcall); ds.calls.push(call); ds.plays.push(pl);
  const gain = pl.sack ? pl.ly : pl.y;
  if (pl.int || pl.fum) { ds.log.push(txt); endDefDrive(sim, 'to'); return; }
  ds.yl = Math.min(100, ds.yl + gain); ds.togo -= gain;
  if (ds.yl >= 100) { ds.log.push(txt + ' Touchdown.'); endDefDrive(sim, 'td'); return; }
  if (ds.yl <= 0) ds.yl = 1;
  if (ds.togo <= 0) { ds.down = 1; ds.togo = Math.min(10, 100 - ds.yl); txt += ' First down.'; }
  else { ds.down++; if (ds.down > 4) { ds.log.push(txt + ' Stopped on fourth down!'); sim.shortField[sim.mSide] = clamp((ds.yl - 25) / 60, 0, 0.6); endDefDrive(sim, 'downs'); return; } }
  ds.log.push(txt);
}
function endDefDrive(sim, out) {
  const p = sim.pending; sim.pending = null; const ds = p.ds;
  if (!ds.plays.length) ds.plays.push({ pass: false, comp: true, y: 0 });
  const drv = { s: p.s, qtr: p.qtr, clock: p.clock, ot: p.ot, out, yards: Math.max(0, ds.yl - ds.start), plays: ds.plays, fgDist: p.fgDist, pr: { d: 0 }, called: ds.log.slice(), endYl: ds.yl };
  sim.lastCalled = ds.log.slice(); execDrive(sim, drv);
}
// what the staff calls when you don't
function autoDefCall(sim, ds) { const run = oppTendency(sim, ds); const r = R(); if (run >= 0.6) return r < 0.7 ? 'box' : 'base'; if (run <= 0.25) return r < 0.45 ? 'zone' : r < 0.75 ? 'man' : 'blitz'; return r < 0.45 ? 'base' : r < 0.65 ? 'man' : r < 0.82 ? 'zone' : 'blitz'; }
function autoOffCall(sim, ds) { const m = playModel(sim); const r = R(); if (ds.togo <= 2) return r < 0.6 ? 'inside' : r < 0.8 ? 'short' : 'outside'; if (ds.togo >= 8) return r < 0.5 ? 'short' : r < 0.72 ? 'deep' : r < 0.88 ? 'screen' : 'outside'; return m.runA >= m.passA ? (r < 0.4 ? 'inside' : r < 0.6 ? 'outside' : r < 0.85 ? 'short' : 'deep') : (r < 0.25 ? 'inside' : r < 0.35 ? 'outside' : r < 0.75 ? 'short' : r < 0.9 ? 'screen' : 'deep'); }
function autoFinishDefDrive(sim) { let g = 0; while (sim.pending && sim.pending.type === 'ddrive' && g++ < 60) { if (defPreSnap(sim)) break; runDefPlay(sim, autoDefCall(sim, sim.pending.ds)); } }
function isKeySit(sim) {
  const p = sim.pending; if (!p || !p.ds) return true; const ds = p.ds;
  return ds.down >= 3 || 100 - ds.yl <= 20 || p.ot || sim.i >= sim.total - 3 || sim.i === sim.total / 2 - 1;
}
// With key-play calling on, the staff runs the drive until the next key moment for you.
function autoAdvance(sim) {
  let g = 0;
  while (sim.pending && g++ < 80) {
    const p = sim.pending;
    if (p.type === 'ddrive') { if (defPreSnap(sim)) continue; if (sim.keyOnly && !isKeySit(sim)) { runDefPlay(sim, autoDefCall(sim, p.ds)); continue; } return; }
    if (p.type === 'drive') { if (sim.keyOnly && !isKeySit(sim)) { runPlay(sim, autoOffCall(sim, p.ds)); continue; } return; }
    return;
  }
}

/* ---------- offseason step names ---------- */
const COACH_OFF_STEPS = ['Season review', 'Job market', 'Coaching staff', 'Departures', 'Transfer portal', 'Signing Day', 'NFL Draft', 'Development & captains'];
const offStepLabels = () => (isCoach() ? COACH_OFF_STEPS : OFF_STEPS);

/* ---------- automation (both modes) ----------
 * Switches in Settings hand routine jobs to the staff or the athletic department. Each runs at
 * the point in the calendar where you would otherwise do it yourself. */
const AUTO_DEFS = {
  rec: { label: 'Recruiting', hint: 'Offers, visits and Signing Day are handled for you.', modes: ['ad', 'coach'] },
  plan: { label: 'Game plan', hint: 'The staff picks the best plan for each opponent.', modes: ['ad', 'coach', 'gm', 'nflcoach'] },
  depth: { label: 'Depth chart', hint: 'The best healthy players start every week.', modes: ['ad', 'coach', 'gm', 'nflcoach'] },
  events: { label: 'Weekly decisions', hint: 'Routine decisions take the sensible default.', modes: ['ad', 'coach'] },
  neg: { label: 'Your contract talks', hint: 'Take a fair deal after one counteroffer.', modes: ['coach', 'nflcoach'] },
  market: { label: 'Job market', hint: 'Stay put unless a clearly better job calls, and find a new one if you are let go.', modes: ['coach', 'nflcoach'] },
  board: { label: 'Board meeting', hint: 'A balanced budget, no facility request, ticket prices held.', modes: ['ad'] },
  deals: { label: 'Partner deals', hint: 'Expiring media and sponsor deals are renewed.', modes: ['ad'] },
  staff: { label: 'Hiring', hint: 'Open coaching jobs (the head coach, in the NFL) are filled with the best available candidate.', modes: ['ad', 'gm'] },
  resign: { label: 'Re-signing players', hint: 'Starters under 31 are re-signed at their asking price; the rest go to free agency.', modes: ['gm'] },
  fa: { label: 'Free agency', hint: 'Offers go to the best free agent at each of your biggest needs, within the cap.', modes: ['gm'] },
  draft: { label: 'Draft picks', hint: 'The best player on your board at each of your picks, with the head coach\'s wish in mind.', modes: ['gm'] },
  cuts: { label: 'Roster cuts and the cap', hint: 'Cuts to 53 before the season and gets under the cap with restructures and releases.', modes: ['gm'] },
  scout: { label: 'Scouting', hint: 'Scouting points go to the top of the draft board as they come in.', modes: ['gm'] },
  fac: { label: 'Facility upgrades', hint: 'Build the weakest facility when the reserve can carry it.', modes: ['ad'] },
  pay: { label: 'Player pay', hint: 'Every starter is paid at least market value each offseason.', modes: ['ad'] },
};
function autoSet() { const s = state.settings; if (!s.auto) s.auto = {}; if (s.autoRec != null) { s.auto.rec = s.autoRec; delete s.autoRec; } return s.auto; }
const autoOn = k => !!(state && state.settings && autoSet()[k]);
// before kickoff: the plan and the depth chart, if those are automatic
function weekAutomation() {
  if (!state || state.phase === 'offseason') return; const mg = michGameThisWeek(state.week);
  if (autoOn('depth')) POS_ORDER.forEach(autoDepth);
  if (autoOn('plan') && mg && !isFCS(oppOf(mg))) { const bp = bestPlan(oppOf(mg)); state.plan = { off: bp.off, def: bp.def }; }
}
function autoFacility() { const f = state.facilities.filter(x => !x.building && x.lvl < 5).sort((a, b) => a.lvl - b.lvl)[0]; if (f && state.fin.balance > facCost(f.lvl) * 1.5) { state.fin.balance -= facCost(f.lvl); state.fin.ytd.facilities = (state.fin.ytd.facilities || 0) + facCost(f.lvl); f.building = true; addNews(`Construction starts on ${facName(f.id)} (${fm(facCost(f.lvl))}).`); } }
function autoRecruitClose() { const room = rosterLimit() - state.roster.length; state.rec.list.filter(r => r.status === 'open' && canRecruit(r.pos)).sort((a, b) => recOdds(b) * (b.star + 1) - recOdds(a) * (a.star + 1)).slice(0, Math.max(0, Math.min(room - recCommits().length + 10, 30 - state.rec.list.filter(r => r.offered && r.status === 'open').length))).forEach(r => r.offered = true); signingDay(); }
// Runs whatever is automatic at the current offseason step.
function runOffAutomation() {
  if (!state || state.phase !== 'offseason' || !state.off) return; const o = state.off; const A = autoSet(); const coach = isCoach();
  if (o.step === 1 && !coach) { if (A.board && !o.boardRes) autoBoard(); if (A.deals) autoDeals(); }
  if (o.step === 1 && coach && A.market && state.co.market && !state.co.market.done) autoMarket();
  if (o.step === 2 && (A.staff && !coach)) { (o.poach || []).forEach((x, i) => { if (!x.done) resolvePoach(i, true); }); autoHire(); }
  if (o.step === 5 && A.rec && state.rec && !state.rec.done) autoRecruitClose();
  if (o.step === 7 && !o.autoDone && !coach) { o.autoDone = true; if (A.pay) POS_ORDER.forEach(pos => starters(pos).forEach(p => { if (p.pay < marketValue(p)) p.pay = marketValue(p); })); if (A.fac) autoFacility(); }
}

