/* ===================== v9.62: Coach mode: your staff, promotions from within, and the job market =====================
 * 1. YOUR STAFF. A head coach's hires could fail without a word. The causes, all fixed here or in the functions
 *    named: candidates asked for power-conference money at every school (genCandidates read the wrong field);
 *    every failure but "declined" showed nothing (hireMsg); a search that ran dry stayed dry until the offseason
 *    (candMore); and an NFL head coach had no way to change his staff at all (proCo...).
 * 2. PROMOTIONS. During the season a struggling head coach or coordinator above you can be fired, and you can
 *    be asked to take over as interim (state.co.interim). After the season the school either removes the interim
 *    tag or sends you back to your old job. Taking a different job at your own school now really changes your job.
 * 3. THE JOB MARKET. Openings on your own staff, the reason each job is open, a second wave of openings when
 *    the first hires are made, a counter-offer from your school, and no more dead end for a coach out of work.
 * New save data is optional: state.co.interim, state.x.coInt (an offer waiting), flags on the market object. */
var AUTO_HIRE = false;
{ const _a = autoHire; autoHire = function () { AUTO_HIRE = true; try { return _a.apply(this, arguments); } finally { AUTO_HIRE = false; } }; }
// a head coach in Coach mode runs his staff, unless he is only the interim
const coRunsStaff = () => isCoach() && state.co.role === 'HC' && !state.co.interim;
function hireMsg(r, role) {
  const job = (ROLE_TITLE[role] || 'this').toLowerCase();
  return r === 'hired' ? 'Hired.' : r === 'declined' ? 'He turned the job down.' : r === 'counter' ? 'He said no, but he is still listening.'
    : r === 'pool' ? `You cannot afford him: your assistant pool has ${fm(Math.max(0, r1(state.co.contract.pool - assistantSpend())))} left. Negotiate a lower salary, let someone go, or ask the AD for a bigger pool.`
    : r === 'filled' ? `The ${job} job is not open. Let the current coach go first.` : r === 'wait' ? 'Head coaches are hired in the offseason. The interim coach runs the team until then.'
    : r === 'notyours' ? (isCoach() && state.co.interim ? 'An interim head coach cannot change the staff.' : 'That job is not yours to fill.') : r === 'gone' ? 'He is no longer available.' : '';
}
const candOverPool = c => (coRunsStaff() && !isPro() ? Math.max(0, r1(assistantSpend() + c.salary - state.co.contract.pool)) : 0);
// a search with nobody left in it can be widened, once a week for each job
const candKey = () => state.season + ':' + (state.phase === 'offseason' ? 'o' + (state.off ? state.off.step : 0) : state.week);
function candMoreHTML(role) {
  const list = state.cands[role] || []; const dry = !list.some(c => !c.declined && !candOverPool(c)); if (!dry) return ''; const used = (X().search || {})[role] === candKey();
  return `<div class="row gap"><button class="btn sm" data-act="candmore" data-role="${role}"${used ? ' disabled' : ''}>Widen the search</button><span class="small muted">${used ? 'More names next week.' : 'Nobody left who will take it at your price. Bring in three more candidates.'}</span></div>`;
}
function candMore(role) {
  if (!STAFF_ROLES.includes(role) || (isCoach() && (!coRunsStaff() || role === 'HC'))) return false; const S = X().search || (X().search = {}); if (S[role] === candKey()) return false; S[role] = candKey();
  const room = isCoach() ? Math.max(0.15, r1(state.co.contract.pool - assistantSpend())) : null; const fresh = genCandidates(role, 3);
  // a wider search turns up people you can actually pay: at least one fits what is left in the pool
  // a wider search always turns up one young coach who wants the job and fits what you can pay
  { const c = fresh[fresh.length - 1]; c.eager = true; c.age = ri(27, 34); c.bg = 'Young coach who wants the chance'; if (c.ovr) c.ovr = clamp(Math.min(c.ovr, 68) - ri(0, 4), 56, 68); if (room != null && c.salary > room) c.salary = r1(Math.max(0.1, room * 0.9)); }
  state.cands[role] = (state.cands[role] || []).filter(c => !c.declined).concat(fresh).slice(-7); return true;
}
Object.assign(actions, { candmore(d) { after(candMore(d.role) ? 'Three more candidates are in.' : 'You have already widened that search this week.'); } });

/* ---------- an NFL head coach runs his staff too ---------- */
const proCoRuns = () => isCoach() && isPro() && state.co.role === 'HC' && !state.co.interim;
const PRO_CO_ROLES = STAFF_ROLES.filter(r => r !== 'HC');
function proCoFire(role) {
  if (!proCoRuns() || !PRO_CO_ROLES.includes(role)) return ''; const c = state.staff[role]; if (!c || c.me || c.interim) return '';
  const fill = genCandidates(role, 1)[0]; fill.ovr = 62; fill.interim = true; fill.title = 'Interim ' + ROLE_TITLE[role]; fill.bg = 'Filling in'; state.staff[role] = fill;
  state.cands[role] = genCandidates(role, 4); if (state.meters) mv('morale', -2); addNews(`${state.co.name} lets ${ROLE_TITLE[role].toLowerCase()}${ROLE_TIER[role] === 1 && role !== 'ST' ? ' coach' : ''} ${c.name} go.`); return `${c.name} is out. Candidates are below.`;
}
const proCoOdds = c => clamp(0.5 + (state.co.rep - (c.ovr || 70)) / 60 + (T(ME) ? (T(ME).rating - 76) / 40 : 0), 0.1, 0.95);
function proCoHire(role, id) {
  if (!proCoRuns()) return 'notyours'; const cur = state.staff[role]; if (cur && !cur.interim) return 'filled'; const list = state.cands[role] || []; const c = list.find(x => x.id === id); if (!c || c.declined) return 'gone';
  if (R() < proCoOdds(c)) { c.title = c.title || ROLE_TITLE[role]; state.staff[role] = c; state.cands[role] = list.filter(x => x !== c); addNews(`${c.name} joins the ${myName()} as ${ROLE_TITLE[role].toLowerCase()}${ROLE_TIER[role] === 1 && role !== 'ST' ? ' coach' : ''}.`); return 'hired'; }
  c.declined = true; return 'declined';
}
function proCoStaffHTML() {
  if (!proCoRuns()) return ''; const ask = ui.confirm || '';
  const rows = PRO_CO_ROLES.map(r => { const c = state.staff[r]; if (!c) return ''; const open = !!c.interim; const cands = open ? (state.cands[r] || []) : [];
    return `<tr><td>${esc(ROLE_TITLE[r])}</td><td><b>${esc(c.name)}</b>${open ? ' <span class="pill warn">Interim</span>' : ''}</td><td class="num">${c.ovr || ''}</td><td>${open ? '' : ask === 'pcf-' + r ? `<button class="btn danger sm" data-act="procofire" data-role="${r}">Confirm: let him go</button>` : `<button class="btn ghost sm" data-act="ask" data-k="pcf-${r}">Let go</button>`}</td></tr>${open ? `<tr><td></td><td colspan="3">${cands.length ? cands.map(x => `<div class="cand${x.declined ? ' out' : ''}"><div><b>${esc(x.name)}</b> <span class="muted">· ${esc(x.bg || '')}</span><div class="small muted">OVR ${x.ovr} · DEV ${x.dev}</div></div>${x.declined ? '<span class="pill bad">Declined</span>' : `<button class="btn sm" data-act="procohire" data-role="${r}" data-id="${x.id}">Offer the job (${Math.round(proCoOdds(x) * 100)}%)</button>`}</div>`).join('') : ''}${cands.some(x => !x.declined) ? '' : `<div class="row gap"><button class="btn sm" data-act="procomore" data-role="${r}">Widen the search</button></div>`}</td></tr>` : ''}`; }).join('');
  return `<section class="card" id="procostaff"><div class="head"><div><div class="eyebrow">Your staff</div><h2 class="h3">You are the head coach: the assistants are yours to choose</h2></div><p class="hint">The owner pays the staff. Better coaches say yes to a head coach with a strong reputation and a good roster. Until you hire someone, an interim fills the job.</p></div><div class="tw"><table class="tbl"><thead><tr><th>Job</th><th>Coach</th><th class="num">Overall</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
{ const _v = vProStaff; vProStaff = function () { let x = ''; try { x = proCoStaffHTML(); } catch (e) { console.error(e); } return _v.apply(this, arguments) + x; }; }
Object.assign(actions, {
  procofire(d) { ui.confirm = null; after(proCoFire(d.role)); },
  procohire(d) { const r = proCoHire(d.role, d.id); after(r === 'hired' ? 'Hired.' : r === 'declined' ? 'He turned the job down.' : hireMsg(r, d.role)); },
  procomore(d) { if (!proCoRuns()) return; state.cands[d.role] = genCandidates(d.role, 4); after('Four more candidates are in.'); },
});

/* ---------- promotions from within (college) ---------- */
const coIntOn = () => isCoach() && !isPro() && state.co && !state.co.fired;
function coStandIn(role, like) { const c = genCandidates(role, 1)[0]; if (role === 'HC') { const b = like ? (like.ovr || 70) : 70; Object.assign(c, { name: like ? like.name : c.name, title: 'Interim Head Coach', interim: true, off: b - 6, def: b - 6, rec: b - 10, dev: b - 4, gm: b - 8, salary: 0, years: 0, real: false, bg: 'Interim' }); } else { c.ovr = clamp((like ? like.ovr || 70 : 70) - 6, 55, 90); c.bg = 'Promoted from within'; c.salary = r1(Math.max(0.1, c.salary * 0.6)); } return c; }
// you take the bigger job; someone on the staff takes yours
function coPromote(role, interim) {
  const co = state.co; const from = co.role; if (role === from) return false;
  state.staff[from] = coStandIn(from, { ovr: coachRoleOvr(from, co.sk) }); co.role = role;
  if (interim) { co.interim = { from, role, s: state.season, wk: state.week, w0: T(ME).w, l0: T(ME).l, sec0: co.sec }; if (role === 'HC') { co.contract.pool = r1(assistantSpend()); state.meters.hot = Math.min(state.meters.hot, 40); } }
  syncMe(); return true;
}
function coBossOut(role, why) { // the head coach or a coordinator above you is fired during the season
  const co = state.co; const boss = state.staff[role]; if (!boss || boss.me || boss.interim) return false; const X_ = X(); const mySide = roleSide(co.role);
  addNews(`${myName()} fires ${ROLE_TITLE[role].toLowerCase()} ${boss.name}${why ? ' ' + why : ''}.`, 'big'); co.bossOut = state.season; mv('morale', -4);
  const askMe = (p, job, who) => { if (R() < p) { X_.coInt = { role: job, s: state.season, wk: state.week, boss: who }; return true; } return false; }; // job: the one you are offered, which is not always the one that was vacated
  if (role === 'HC') {
    if (ROLE_TIER[co.role] === 2 && askMe(clamp(0.65 + (co.sec - 55) / 100 + (co.rep - 50) / 200, 0.3, 0.95), 'HC', boss.name)) { state.staff.HC = coStandIn('HC', state.staff.OC && !state.staff.OC.me ? state.staff.OC : state.staff.DC); return true; } // a stand-in holds the title until you answer
    // a coordinator takes over; if he is the one above you, his job may come to you
    const mine = mySide === 'off' ? 'OC' : mySide === 'def' ? 'DC' : null; const cands = ['OC', 'DC'].filter(r => state.staff[r] && !state.staff[r].me).sort((a, b) => (state.staff[b].ovr || 0) - (state.staff[a].ovr || 0)); const up = (mine && cands.includes(mine) && R() < 0.65 ? mine : cands[0]) || 'OC'; const c = state.staff[up];
    state.staff.HC = coStandIn('HC', c); addNews(`${state.staff.HC.name} is the interim head coach for the rest of the season.`);
    if (c && ROLE_TIER[co.role] === 1 && roleSide(up) === mySide) { state.staff[up] = coStandIn(up, c); if (!askMe(clamp(0.6 + (co.sec - 55) / 80, 0.25, 0.9), up, c.name)) addNews(`${state.staff[up].name} moves up to run the ${mySide === 'off' ? 'offense' : 'defense'} for now.`); }
    return true;
  }
  state.staff[role] = coStandIn(role, boss); if (!askMe(clamp(0.65 + (co.sec - 55) / 80 + (co.rep - 45) / 200, 0.25, 0.95), role, boss.name)) addNews(`${state.staff[role].name} takes over as interim ${ROLE_TITLE[role].toLowerCase()}.`);
  return true;
}
function coIntAnswer(yes) {
  const v = state.x && state.x.coInt; if (!v) return ''; delete state.x.coInt;
  if (ROLE_TIER[v.role] - ROLE_TIER[state.co.role] !== 1) return ''; // an offer is only ever one rung up
  const co = state.co; const title = ROLE_TITLE[v.role].toLowerCase();
  if (!yes) { co.sec = clamp(co.sec - 2, 0, 100); const m = `You pass on the interim ${title} job. ${state.staff[v.role] ? state.staff[v.role].name : 'Someone else'} takes it.`; addNews(m); return m; }
  coPromote(v.role, true); const m = `${co.name} is the interim ${title} at ${myName()} for the rest of the season.`; addNews(m, 'big'); try { jrAdd('career', m); } catch (e) { } return m;
}
function coMidseason(mg) {
  if (!coIntOn() || state.phase !== 'regular') return; const co = state.co; const X_ = X();
  if (X_.coInt && (X_.coInt.s !== state.season || state.week - X_.coInt.wk >= 1)) coIntAnswer(true); // an offer you leave on the desk for a week is taken
  if (!co.hist.some(h => h.tm === ME)) return; // not in your first season at a school
  if (co.role === 'HC' || co.interim || co.bossOut === state.season || X_.coInt || state.week < 6 || state.week > 11 || !mg || !mg.done || mg.mResult !== 'L') return;
  const t = T(ME); const hc = state.staff.HC; const hot = state.meters.hot;
  if (hc && !hc.me && !hc.interim) { const p = (hot >= 90 ? 0.5 : hot >= 80 ? 0.35 : hot >= 68 ? 0.16 : 0) + (t.l >= 5 && t.w <= 2 ? 0.25 : 0); if (p && R() < p) return void coBossOut('HC', `after a ${t.w}-${t.l} start`); }
  if (ROLE_TIER[co.role] === 1) { const side = roleSide(co.role); const cr = side === 'off' ? 'OC' : side === 'def' ? 'DC' : null; if (!cr) return; let rank = 60; try { rank = unitRanks()[side]; } catch (e) { } const n = Object.keys(state.teams).length;
    if (rank >= n * 0.7 && R() < 0.15) coBossOut(cr, `with the ${side === 'off' ? 'offense' : 'defense'} ranked No. ${rank}`); }
}
{ const _w = weeklyTeam; weeklyTeam = function (mg) { const r = _w.apply(this, arguments); try { coMidseason(mg); } catch (e) { console.error(e); } return r; }; }
// after the season: keep the job, or go back to the old one
{ const _e = coachSeasonEnd; coachSeasonEnd = function () {
  const co = state.co; const I = co && co.interim && co.interim.s === state.season && !isPro() ? co.interim : null; if (co && co.interim && !I) co.interim = null;
  const r = _e.apply(this, arguments); if (!I) return r;
  try {
    const rv = state.off.review; const wI = rv.w - I.w0, lI = rv.l - I.l0; const h = co.hist[co.hist.length - 1]; if (h) h.interim = true;
    const keep = R() < clamp(0.25 + (wI - lI) * 0.12 + (co.rep - 45) / 150, 0.06, 0.85); co.interim = null; co.fired = null; co.newBoss = null; const title = ROLE_TITLE[I.role].toLowerCase();
    if (keep) { co.sec = Math.max(co.sec, 60); co.contract.left = 0; co.market = buildMarket(); const m = co.market; if (m.home) { m.home.offer = makeOffer(ME, co.role, null, true, 'col'); m.home.notRetained = false; m.home.promo = true; } addNews(`${myName()} removes the interim tag: ${co.name} is offered the ${title} job after going ${wI}-${lI}.`, 'big'); co.intRes = { kept: true, role: I.role, w: wI, l: lI }; }
    else { const was = co.role; co.role = I.from; if (h) h.role = I.from; state.staff[was] = null; syncMe(); co.sec = Math.max(co.sec, I.sec0 - 4);
      if (was === 'HC') co.newBoss = { old: co.name, open: false }; else state.staff[was] = genCandidates(was, 3)[0];
      addNews(`${myName()} goes outside for its next ${title}. ${co.name} went ${wI}-${lI} as the interim and returns as ${roleTitle(co.role).toLowerCase()}.`, 'bad'); co.intRes = { kept: false, role: I.role, w: wI, l: lI }; co.market = buildMarket(); }
  } catch (e) { console.error(e); }
  return r;
}; }
function coIntCardHTML() {
  const v = state.x && state.x.coInt; if (!v || !coIntOn()) return '';
  return `<section class="card decision" id="cointcard" data-block="1"><div class="eyebrow">Decision needed · a promotion</div><h2 class="h2">${esc(myName())} wants you as interim ${esc(ROLE_TITLE[v.role].toLowerCase())}</h2><p>${esc(v.boss)} ${v.role === 'HC' || ROLE_TIER[state.co.role] === 1 && state.staff.HC && state.staff.HC.interim && state.staff.HC.name === v.boss ? (v.role === 'HC' ? 'is out' : 'has moved up to run the team') : 'is out'}. The job is yours for the rest of the season if you want it. ${v.role === 'HC' ? 'You would run the team and call the plays, but an interim cannot change the staff.' : `You would run the ${roleSide(v.role) === 'off' ? 'offense' : 'defense'} and call its plays.`} After the season the school decides whether to keep you in the job or send you back to your old one. How the team plays from here will count for the most.</p>
   <div class="evopts"><button class="evopt" data-act="cointdo" data-v="yes"><b>Take the job</b><span>You are in charge starting this week.</span></button><button class="evopt" data-act="cointdo" data-v="no"><b>Stay where you are</b><span>Someone else takes it. It costs you a little with the people upstairs.</span></button></div></section>`;
}
{ const _v = vCoachOffice; vCoachOffice = function () { let x = ''; try { x = coIntCardHTML(); } catch (e) { console.error(e); } return x + _v.apply(this, arguments); }; }
{ const _a = attnItems; attnItems = function () { const out = _a.apply(this, arguments); try { if (appMode === 'ad' && state && state.x && state.x.coInt && coIntOn()) out.unshift({ txt: `Decision: ${myName()} wants you as interim ${ROLE_TITLE[state.x.coInt.role].toLowerCase()}.`, tab: 'office', sel: '#cointcard' }); } catch (e) { } return out; }; }
Object.assign(actions, { cointdo(d) { after(coIntAnswer(d.v === 'yes')); } });

/* ---------- the job market ---------- */
// why a job is open, in a few words
function coWhy(o) {
  const lvl = jobLvl(o); if (o.inside) return o.role === 'HC' ? 'The head coach here is out. You know the building.' : 'The coordinator above you has moved on.';
  if (lvl === 'col') { const t = colTeams()[o.tid]; if (!t) return ''; const rec = t.w + t.l > 0 ? `${t.w}-${t.l} last season` : ''; if (o.role === 'HC') return rec ? `${rec}${t.w <= 4 ? ', and the coach was fired' : t.w >= 9 ? '; the coach left for a bigger job' : '; the coach stepped down'}.` : 'The job is open.'; return rec ? `${rec}. ${o.wave ? 'Their last coach just took another job.' : 'A staff opening.'}` : ''; }
  return o.role === 'HC' ? 'The club is changing head coaches.' : o.wave ? 'Their last coach just took another job.' : 'A staff opening.';
}
{ const _b = buildMarket; buildMarket = function () {
  const m = _b.apply(this, arguments);
  try { const co = state.co; const here = isPro() ? 'nfl' : 'col'; const hx = k => hash(state.seed + ':mk2:' + state.season + ':' + k);
    // a different job at your own school is a promotion (it used to be filed as a re-signing, and changed only your pay)
    m.open.forEach(o => { if (o.home) { delete o.home; o.inside = true; } });
    // the coordinator above a position coach sometimes moves on, and the school looks inside first
    if (here === 'col' && !co.fired && ROLE_TIER[co.role] === 1 && !co.newBoss) { const side = roleSide(co.role); const cr = side === 'off' ? 'OC' : side === 'def' ? 'DC' : null;
      if (cr && hx('in') < 0.25 && !m.open.some(o => o.tid === ME && o.role === cr)) { const o = { lvl: here, tid: ME, role: cr, inside: true, id: ME + ':' + cr }; o.int = jobInterest(ME, cr, here); m.open.unshift(o); if (o.int >= 72) { o.offer = makeOffer(ME, cr, null, false, here); o.called = true; } } }
    m.open.forEach(o => { o.why = coWhy(o); }); m.wave = 0;
  } catch (e) { console.error(e); }
  return m;
}; }
// A coach who needs a job always has one more door to knock on: a smaller job somewhere calls.
function coSafetyNet() {
  const co = state.co; const m = co && co.market; if (!m || m.done || m.take || !marketBlocked()) return false;
  const live = [m.home].concat(m.open).some(o => o && o.offer && o.offer.status !== 'walked' && !(o === m.home && m.home.notRetained)); if (live || m.interviews > 0) return false;
  const pool = m.open.filter(o => !o.offer || o.offer.status === 'walked').sort((a, b) => ROLE_TIER[a.role] - ROLE_TIER[b.role] || b.int - a.int); const o = pool.find(x => ROLE_TIER[x.role] <= Math.max(1, ROLE_TIER[co.role] - 1)) || pool[0]; if (!o) return false;
  o.offer = makeOffer(o.tid, o.role, null, false, jobLvl(o)); o.called = true; o.tried = false; m.log.unshift(`${jobNm(o)} called: they have a ${roleTitle(o.role).toLowerCase()} job for you.`); return true;
}
// When the first hires are made, their old jobs open up. Once an offseason you can look again.
function coSecondWave() {
  const co = state.co; const m = co && co.market; if (!m || m.done || m.wave) return 0; m.wave = 1; const here = isPro() ? 'nfl' : 'col'; const r = lrng(state.seed + ':mkw:' + state.season); let n = 0;
  const colIds = Object.keys(colTeams()).filter(id => here !== 'col' || id !== ME), nflIds = NFL.map(t => t.id).filter(id => here !== 'nfl' || id !== ME);
  for (let i = 0; i < 40 && n < 9; i++) { const nfl = r() < 0.25; const tid = nfl ? nflIds[Math.floor(r() * nflIds.length)] : colIds[Math.floor(r() * colIds.length)]; const role = r() < 0.4 ? (r() < 0.5 ? 'OC' : 'DC') : STAFF_ROLES[3 + Math.floor(r() * (STAFF_ROLES.length - 3))]; const lvl = nfl ? 'nfl' : 'col'; const id = (nfl ? 'nfl:' : '') + tid + ':' + role;
    if (m.open.some(o => o.id === id)) continue; const o = { lvl, tid, role, id, wave: true }; o.int = jobInterest(tid, role, lvl); o.why = coWhy(o); m.open.push(o); n++; }
  m.interviews += 2; m.open.sort((a, b) => ROLE_TIER[b.role] - ROLE_TIER[a.role] || jobP(b) - jobP(a)); m.log.unshift(`The first hires are made and ${n} more jobs open up. You have two more interviews.`); return n;
}
// Your school does not want to lose you: once an offseason it answers a better offer from somewhere else.
function coRetention() {
  const co = state.co; const m = co && co.market; if (!m || m.done || m.ret || co.fired || !m.home || m.home.notRetained || m.home.offer || co.sec < 60 || co.contract.left <= 0) return false;
  const out = m.open.filter(o => !o.inside && o.offer && o.offer.status !== 'walked' && (ROLE_TIER[o.role] > ROLE_TIER[co.role] || o.offer.k.sal > co.contract.sal * 1.1)); if (!out.length) return false; m.ret = 1;
  const best = Math.max(...out.map(o => o.offer.k.sal)); const of = makeOffer(ME, co.role, null, true, isPro() ? 'nfl' : 'col'); of.k.sal = r2(Math.max(of.k.sal, co.contract.sal * 1.12, Math.min(best, co.contract.sal * 1.3))); of.max = r2(Math.max(of.max, contractValue(of.k, co.role) * 1.05)); m.home.offer = of; m.home.counter = true;
  m.log.unshift(`${myName()} heard about the interest in you and put a new deal on the table: ${fmM(of.k.sal)} a year.`); return true;
}
function coMarketExtrasHTML() {
  const co = state.co; const m = co && co.market; if (!m || m.done) return ''; const res = co.intRes && co.hist.length && co.hist[co.hist.length - 1].s === state.season ? co.intRes : null;
  return `${res ? `<section class="card ${res.kept ? 'next' : ''}"><div class="eyebrow">Your time as interim ${esc(ROLE_TITLE[res.role].toLowerCase())}</div><h2 class="h3">${res.kept ? 'The job is yours if you want it' : 'They went another way'}</h2><p>${res.kept ? `You went ${res.w}-${res.l} after taking over. ${esc(myName())} has offered you the job for good: the terms are under "Your job" below.` : `You went ${res.w}-${res.l} after taking over. ${esc(myName())} hired someone else, and you are back in your old job${co.newBoss ? ' with a new head coach on the way' : ''}. The season still counts on your record when other schools look at you.`}</p></section>` : ''}
  <section class="card"><div class="head"><div><div class="eyebrow">The carousel</div><h2 class="h3">${m.wave ? 'The second wave of openings is in' : 'More jobs will open as the first ones are filled'}</h2></div><p class="hint">When a coach takes a job, the one he left opens up. Once each offseason you can wait for that second wave: about nine more openings, and two more interviews.</p></div><div class="row gap"><button class="btn sm" data-act="mkwave"${m.wave ? ' disabled' : ''}>${m.wave ? 'Already looked' : 'See who else is hiring'}</button></div></section>`;
}
{ const _j = jobMarketHTML; jobMarketHTML = function () { let x = ''; try { coSafetyNet(); coRetention(); x = coMarketExtrasHTML(); } catch (e) { console.error(e); } return x + _j.apply(this, arguments); }; }
{ const _i = interviewJob; interviewJob = function () { const r = _i.apply(this, arguments); try { coSafetyNet(); } catch (e) { } return r; }; }
{ const _n = coNegotiate; coNegotiate = function () { const r = _n.apply(this, arguments); try { coSafetyNet(); } catch (e) { } return r; }; }
Object.assign(actions, { mkwave() { const n = coSecondWave(); ui.mkF = 'all'; after(n ? `${n} more jobs are open, and you have two more interviews.` : ''); } });
