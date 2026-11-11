/* ===================== COMMISSIONER MODE ===================== */
// A way to play where you run the league instead of a team. It is an AD-mode career (same saves, same engine)
// with kind 'comm': the team you follow runs itself, nobody can fire you, and the office holds the league's levers:
// realignment, expansion, the rules, the bowl tie-ins, and the requests that land on the commissioner's desk.
const isComm = () => !!(typeof state !== 'undefined' && state && state.kind === 'comm');
function commOf() { const c = state.comm || (state.comm = {}); c.moves = c.moves || []; c.exp = c.exp || []; c.desk = c.desk || []; c.log = c.log || []; return c; }
function newCommCareer(o) {
  newGame(o.diff || 'normal', null, o.seed != null ? o.seed : null, o.tid || 'MICH'); state.kind = 'comm'; state.settings.noFire = true;
  const A = autoSet(); Object.keys(AUTO_DEFS).forEach(k => { A[k] = true; }); commOf().since = state.season; state.tline = [];
  addNews(`You are the commissioner. ${teamName(ME)} is the team you follow; it runs itself. The league is yours to shape.`, 'big');
}
// every week before the games: the team you follow handles its own business
function commWeek() { if (!isComm()) return; const c = commOf(); const A = autoSet(); Object.keys(AUTO_DEFS).forEach(k => { A[k] = true; }); state.settings.noFire = true; if (!isPro() && c.recS !== state.season && state.phase === 'regular') { c.recS = state.season; try { autoSeasonRecruiting(); } catch (e) { } }  cmWeek(); }
const COMM_LOG = (txt) => { const c = commOf(); c.log.unshift({ s: state.season, txt }); if (c.log.length > 60) c.log.length = 60; addNews('Commissioner: ' + txt, 'big'); };
// realignment: in the offseason a move happens now; during the season it waits for the season to end
function commMove(tid, conf) {
  const t = T(tid); if (!isComm() || !t || !CONFS[conf] || t.conf === conf) return false; const c = commOf();
  c.moves = c.moves.filter(m => m.tid !== tid);
  if (state.phase === 'offseason') { const from = t.conf; t.conf = conf; rebuildConfs(); COMM_LOG(`${t.name} moves from the ${CONFS[from].name} to the ${CONFS[conf].name}.`); }
  else { c.moves.push({ tid, to: conf, s: state.season }); COMM_LOG(`${t.name} will move to the ${CONFS[conf].name} after the season.`); }
  return true;
}
function commApply() { if (!isComm() || isPro()) return; const c = commOf(); c.moves.forEach(m => { const t = T(m.tid); if (t && CONFS[m.to]) { const from = t.conf; t.conf = m.to; COMM_LOG(`${t.name} completes its move from the ${CONFS[from] ? CONFS[from].name : from} to the ${CONFS[m.to].name}.`); } }); c.moves = []; (c.expQ || []).forEach(x => { if (state.teams[x.id]) { COMM_LOG(`${x.name} could not join: the abbreviation ${x.id} is already in use. Approve it again with another abbreviation.`); c.exp = c.exp.filter(e => !(e.id === x.id && e.name === x.name)); } else commAddTeam(x); }); c.expQ = []; rebuildConfs(); commDesk(); }
// expansion: a new FBS program, fictional, with its own colors; it starts playing next season
const COMM_TIERS = { power: ['Ready to win now', 79], mid: ['Middle of the pack', 70], rebuild: ['Starting from scratch', 61] };
function commExpand(o) {
  if (!isComm()) return 'no'; const id = String(o.ab || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5); const name = String(o.name || '').replace(/[<>]/g, '').trim().slice(0, 40);
  if (!name || id.length < 2) return 'name'; if (state.teams[id] || id.startsWith('FCS') || (commOf().expQ || []).some(x => x.id === id)) return 'taken'; /* a pending school holds its abbreviation (FE-11) */ if (!CONFS[o.conf]) return 'conf'; if (commOf().exp.length >= 8) return 'max';
  const x = { id, name, conf: o.conf, tier: COMM_TIERS[o.tier] ? o.tier : 'mid', c1: /^#[0-9a-f]{6}$/i.test(o.c1) ? o.c1 : '#2a4d8f', c2: /^#[0-9a-f]{6}$/i.test(o.c2) ? o.c2 : '#f2c14e', city: String(o.city || name).replace(/[<>]/g, '').slice(0, 30) };
  commOf().exp.push({ id, name, conf: x.conf, s: state.season });
  if (state.phase === 'offseason') commAddTeam(x); else { const c = commOf(); (c.expQ || (c.expQ = [])).push(x); COMM_LOG(`${name} is approved to join the ${CONFS[x.conf].name}. It starts playing next season.`); }
  return 'ok';
}
function commAddTeam(x) {
  if (state.teams[x.id]) return; const r = COMM_TIERS[x.tier][1]; const off = r1(r + gauss() * 2.5);
  const t = state.teams[x.id] = { id: x.id, name: x.name, conf: x.conf, rating: r, off, def: r1(2 * r - off), st: r, elo: 1500 + (r - 70) * 12, w: 0, l: 0, cw: 0, cl: 0, pf: 0, pa: 0, hist: [], style: genStyle(), coach: genName(), exp: true, c1: x.c1, c2: x.c2, city: x.city };
  t.elo0 = t.elo; genStars(t); TEAM_INFO[x.id] = { c1: x.c1, c2: x.c2, stadium: x.name + ' Stadium', cap: 40000, city: x.city }; rebuildConfs();
  COMM_LOG(`Expansion: ${x.name} joins the ${CONFS[x.conf].name}.`);
}
// expansion teams' colors come back after a reload
function commSyncTeams() { Object.values(state.teams || {}).forEach(t => { if (t.exp && !TEAM_INFO[t.id]) TEAM_INFO[t.id] = { c1: t.c1, c2: t.c2, stadium: t.name + ' Stadium', cap: 40000, city: t.city || t.name }; }); }
// bowl tie-ins: which two conferences each bowl takes
function commTies() { const c = commOf(); if (!c.ties) c.ties = BOWL_TIES.map(x => x.slice()); return c.ties; }
function commSetTie(i, k, conf) { const T_ = commTies(); if (!T_[i] || !(k === 1 || k === 2) || !(CONFS[conf] || conf === 'ANY')) return false; T_[i][k] = conf; return true; }
// the commissioner's desk: requests that arrive each offseason
function commDesk() {
  const c = commOf(); if (c.deskS === state.season) return; c.deskS = state.season; c.desk = [];
  const teams = Object.values(state.teams).filter(t => !t.exp && t.id !== ME); const h = k => hash((state.seed || 0) + ':desk:' + state.season + ':' + k);
  const big = Object.values(CONFS).filter(x => x.p4 && x.id !== 'IND').map(x => x.id);
  const riser = teams.filter(t => !CONFS[t.conf].p4).sort((a, b) => b.rating - a.rating)[Math.floor(h('r') * 4)];
  if (riser && big.length) { const to = big[Math.floor(h('c') * big.length)]; c.desk.push({ id: 'd1', kind: 'move', tid: riser.id, to, txt: `${riser.name} (${riser.rating.toFixed(0)} rating) asks to move up to the ${CONFS[to].name}.` }); }
  const cur = rules().cfp; if (h('p') < 0.5 && cur < 16) c.desk.push({ id: 'd2', kind: 'cfp', v: cur === 12 ? 14 : 16, txt: `The conference commissioners propose growing the playoff from ${cur} to ${cur === 12 ? 14 : 16} teams.` });
  const leaver = teams.filter(t => CONFS[t.conf].p4).sort((a, b) => a.rating - b.rating)[Math.floor(h('l') * 3)]; const down = Object.values(CONFS).filter(x => !x.p4 && x.id !== 'IND').map(x => x.id);
  if (leaver && down.length && h('d') < 0.4) { const to = down[Math.floor(h('e') * down.length)]; c.desk.push({ id: 'd3', kind: 'move', tid: leaver.id, to, txt: `${leaver.name} has struggled and wants a fresh start in the ${CONFS[to].name}.` }); }
}
function commAnswer(id, yes) {
  const c = commOf(); const d = c.desk.find(x => x.id === id); if (!d) return null; c.desk = c.desk.filter(x => x !== d);
  if (!yes) { COMM_LOG(`Request turned down: ${d.txt}`); return 'Turned down.'; }
  if (d.kind === 'move') { commMove(d.tid, d.to); return 'Approved.'; }
  if (d.kind === 'cfp') { setRule('cfp', d.v); COMM_LOG(`The playoff grows to ${d.v} teams.`); return 'Approved.'; }
  return null;
}

/* ===================== v9.9: LEAGUE HISTORY, WEEKLY AWARDS, PREDICTIONS ===================== */
// League history: every season's champion, runner-up, top award winners and the preseason pick, for college and the NFL.
function lgHistOf() {
  if (!state.lghist) { const H = state.lghist = { col: [], nfl: [] }; /* older saves: rebuilt from the awards and the history already kept */
    (state.awards || []).forEach(aw => { const h = (state.history || []).find(x => x.season === aw.s); H.col.push({ s: aw.s, champ: h ? h.champ : null, heis: aw.heis && aw.heis[0] ? { n: aw.heis[0].n, pos: aw.heis[0].pos, tm: aw.heis[0].tm } : null, coy: aw.coy ? { tm: aw.coy.tm, n: aw.coy.name } : null, old: true }); }); }
  const H = state.lghist; H.col = H.col || []; H.nfl = H.nfl || [];
  const pc = state.pro && state.pro.champs; if (pc && pc.length) { let add = false; pc.forEach(c => { if (!H.nfl.some(x => x.s === c.s)) { H.nfl.push({ s: c.s, champ: c.tm, runner: c.ru, old: true }); add = true; } }); if (add) H.nfl.sort((a, b) => a.s - b.s); }
  return H;
}
function coachNameOf(tid) { if (tid === ME && state.staff && state.staff.HC) return state.staff.HC.name; const t = T(tid); return t && t.coach ? t.coach : 'Head coach, ' + teamName(tid); }
function lgHistCollege() {
  const H = lgHistOf(); H.col = H.col.filter(x => !(x.s === state.season && x.old)); if (H.col.some(x => x.s === state.season)) return; const aw = (state.awards || []).find(x => x.s === state.season) || {};
  const fin = state.games.find(x => x.wk === 18 && x.type === 'cfp' && x.done); const champ = state.champ || (fin ? (fin.hs > fin.as ? fin.h : fin.a) : null);
  const poll = state.polls[state.polls.length - 1]; const top = poll ? poll.rows.slice(0, 5).map(r => r.id) : [];
  const ccg = state.games.filter(g => g.type === 'ccg' && g.done).map(g => [T(g.h) ? T(g.h).conf : '', g.hs > g.as ? g.h : g.a]);
  const e = { s: state.season, champ, runner: fin ? (fin.h === champ ? fin.a : fin.h) : null, score: fin ? Math.max(fin.hs, fin.as) + '-' + Math.min(fin.hs, fin.as) : '', heis: aw.heis && aw.heis[0] ? { n: aw.heis[0].n, pos: aw.heis[0].pos, tm: aw.heis[0].tm } : null, coy: aw.coy ? { tm: aw.coy.tm, n: /^Head coach, /.test(aw.coy.name || '') ? coachNameOf(aw.coy.tm) : aw.coy.name } : null, top, ccg, me: ME, myRank: rankOf(ME) };
  const pr = predEnsure(true); if (pr && pr.s === state.season) e.pred = { pick: pr.top[0], hit: pr.top[0] === champ, heis: pr.heis, heisHit: !!(pr.heis && e.heis && pr.heis.n === e.heis.n), top: pr.top.map(id => [id, poll ? poll.rows.findIndex(r => r.id === id) + 1 : 0]) };
  H.col.push(e); if (H.col.length > 80) H.col.shift();
}
function nflMvp() { const c = awardCands().filter(x => ['QB', 'RB', 'WR', 'TE'].includes(x.pos) || x.sc > 70); return c[0] ? { n: c[0].n, pos: c[0].pos, tm: c[0].tm } : null; }
function lgHistPro() {
  const H = lgHistOf(); const L = PS().lg; H.nfl = H.nfl.filter(x => !(x.s === state.season && x.old)); if (!L.champ || H.nfl.some(x => x.s === state.season)) return; const sb = state.games.find(g => g.wk === 22 && g.done);
  const ts = NFL.map(t => T(t.id)).filter(Boolean); const coy = ts.map(t => ({ t, d: t.w - ((t.hist || []).slice(-1)[0] || { w: t.w }).w })).sort((a, b) => b.d - a.d)[0];
  const e = { s: state.season, champ: L.champ, runner: L.runner, score: sb ? Math.max(sb.hs, sb.as) + '-' + Math.min(sb.hs, sb.as) : '', mvp: nflMvp(), coy: coy ? { tm: coy.t.id, n: coachNameOf(coy.t.id), d: coy.d } : null, top: ts.slice().sort((a, b) => b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa)).slice(0, 5).map(t => t.id), me: ME };
  const pr = state.pred; if (pr && pr.s === state.season && pr.nfl) e.pred = { pick: pr.top[0], hit: pr.top[0] === L.champ, heis: pr.heis, heisHit: !!(pr.heis && e.mvp && pr.heis.n === e.mvp.n), top: pr.top.map(id => [id, T(id).w + '-' + T(id).l]) };
  H.nfl.push(e); if (H.nfl.length > 80) H.nfl.shift(); addNews(`${e.mvp ? e.mvp.n + ' (' + e.mvp.pos + ', ' + teamName(e.mvp.tm) + ') is named league MVP. ' : ''}${e.coy ? e.coy.n + ' is coach of the year.' : ''}`);
}
// Preseason predictions: the poll's top ten (or the NFL's best rosters), the title pick and the award favorite, set before week 1.
function predEnsure(force) {
  if (state.pred && state.pred.s === state.season) return state.pred; if (state.phase === 'offseason' && !force) return null;
  if (isPro()) { const ts = NFL.map(t => T(t.id)).filter(Boolean).sort((a, b) => (b.rating || 0) - (a.rating || 0)); const top = ts.slice(0, 8).map(t => t.id);
    const st = []; ts.slice(0, 8).forEach(t => (t.stars || []).forEach(s => { if (s.pos === 'QB') st.push({ n: s.n, pos: s.pos, tm: t.id, ovr: s.ovr || 0 }); }));
    st.sort((a, b) => b.ovr - a.ovr); state.pred = { s: state.season, nfl: true, top, heis: st[0] ? { n: st[0].n, pos: st[0].pos, tm: st[0].tm } : null, myExp: PS().expW, late: state.week > 1 }; return state.pred; }
  const p0 = state.polls[0]; if (!p0) return null; const top = p0.rows.slice(0, 10).map(r => r.id); const st = [];
  top.forEach(id => { const t = T(id); (t.stars || []).forEach(s => { if (['QB', 'RB', 'WR'].includes(s.pos)) st.push({ n: s.n, pos: s.pos, tm: id, ovr: (s.ovr || 0) + (s.pos === 'QB' ? 3 : 0) }); }); if (id === ME) state.roster.filter(p => p.pos === 'QB' && (state.depth.QB || [])[0] === p.id).forEach(p => st.push({ n: p.n, pos: 'QB', tm: ME, ovr: p.ovr + 3 })); });
  st.sort((a, b) => b.ovr - a.ovr); state.pred = { s: state.season, top, heis: st[0] ? { n: st[0].n, pos: st[0].pos, tm: st[0].tm } : null, myExp: state.expWins, late: state.week > 1 }; return state.pred;
}
// Weekly awards: offensive and defensive players of the week (from this week's stat lines) and coach of the week (the biggest upset).
const WK_KEYS = ['py', 'ptd', 'pint', 'ry', 'rtd', 'rcy', 'rctd', 'tk', 'sk', 'int'];
function wkLine(d, pos) {
  const g = k => d[k] || 0; const out = [];
  if (g('py')) out.push(g('py') + ' passing yards'); if (g('ptd')) out.push(g('ptd') + ' TD pass' + (g('ptd') > 1 ? 'es' : '')); if (g('ry') >= 20) out.push(g('ry') + ' rushing yards'); if (g('rtd')) out.push(g('rtd') + ' rushing TD');
  if (g('rcy')) out.push(g('rcy') + ' receiving yards'); if (g('rctd')) out.push(g('rctd') + ' TD catch' + (g('rctd') > 1 ? 'es' : '')); if (g('tk')) out.push(g('tk') + ' tackles'); if (g('sk')) out.push(g('sk') + ' sack' + (g('sk') > 1 ? 's' : '')); if (g('int') && DEFP.includes(pos)) out.push(g('int') + ' interception' + (g('int') > 1 ? 's' : ''));
  return out.slice(0, 3).join(', ');
}
function weeklyAwards(wk) {
  const S = state.wkSnap && state.wkSnap.s === state.season ? state.wkSnap : null; const c = awardCands(); const m = {};
  c.forEach(x => { const o = {}; WK_KEYS.forEach(k => { if (x.st[k]) o[k] = x.st[k]; }); m[x.tm + ':' + x.n] = o; });
  const first = !S && (isPro() ? wk === 1 : wk <= 1); state.wkSnap = { s: state.season, wk, m };
  if (!S && !first) return null; /* an older save mid-season: start counting from next week */
  let bo = null, bd = null;
  c.forEach(x => { const p = S ? S.m[x.tm + ':' + x.n] || {} : {}; const d = {}; WK_KEYS.forEach(k => { const v = (x.st[k] || 0) - (p[k] || 0); if (v > 0) d[k] = v; }); const g = k => d[k] || 0;
    const so = g('py') * 0.04 + g('ptd') * 4 - g('pint') * 3 + g('ry') * 0.1 + g('rtd') * 6 + g('rcy') * 0.1 + g('rctd') * 6, sd = g('tk') * 0.6 + g('sk') * 4 + g('int') * 6;
    if (!DEFP.includes(x.pos) && so > 0 && (!bo || so > bo.v)) bo = { v: so, n: x.n, pos: x.pos, tm: x.tm, line: wkLine(d, x.pos) };
    if (DEFP.includes(x.pos) && sd > 0 && (!bd || sd > bd.v)) bd = { v: sd, n: x.n, pos: x.pos, tm: x.tm, line: wkLine(d, x.pos) }; });
  let bc = null; state.games.filter(g => g.wk === wk && g.done && T(g.h) && T(g.a)).forEach(g => { const w = g.hs > g.as ? g.h : g.a, l = w === g.h ? g.a : g.h; const v = (T(l).rating || 0) - (T(w).rating || 0) + (rankOf(l) ? (26 - rankOf(l)) * 0.3 : 0) + Math.abs(g.hs - g.as) / 14;
    if (!bc || v > bc.v) bc = { v, tm: w, n: coachNameOf(w), opp: l, sc: Math.max(g.hs, g.as) + '-' + Math.min(g.hs, g.as) }; });
  const strip = o => o && { n: o.n, pos: o.pos, tm: o.tm, line: o.line }; const e = { s: state.season, wk, off: strip(bo), def: strip(bd), coach: bc && { tm: bc.tm, n: bc.n, opp: bc.opp, sc: bc.sc } };
  const W = state.weekly || (state.weekly = []); W.push(e); if (W.length > 40) W.splice(0, W.length - 40);
  const mine = [e.off, e.def].filter(x => x && x.tm === ME); if (mine.length) { addNews(`${mine.map(x => x.n).join(' and ')} ${mine.length > 1 ? 'are' : 'is'} named ${mine.length > 1 ? 'players' : (mine[0] === e.off ? 'offensive' : 'defensive') + ' player'} of the week.`, 'win'); state.wkMine = (state.wkMine || 0) + mine.length; }
  if (e.coach && e.coach.tm === ME) { addNews(`${e.coach.n} is coach of the week after the ${e.coach.sc} win over ${teamName(e.coach.opp)}.`, 'win'); state.wkCoach = (state.wkCoach || 0) + 1; }
  return e;
}

/* ===================== v9.9: SIGNING DAY BATTLES AND DRAFT NIGHT ===================== */
// On National Signing Day the closest races get one last pitch each before the hats come out.
const SIGN_PITCH = { none: 'No last pitch', nil: 'Sweeten the NIL deal', pt: 'Promise early playing time', hc: 'Head coach in the living room', fac: 'One more facilities tour', win: 'Sell the winning' };
function signBattles() {
  const rc = state.rec; if (!rc || rc.done || state.phase !== 'offseason') return [];
  return rc.list.filter(r => r.status === 'open' && r.offered && r.star >= 3 && (!isCoach() || typeof canRecruit !== 'function' || canRecruit(r.pos))).sort((a, b) => b.star - a.star || b.pot - a.pot).slice(0, 6);
}
function pitchFx(r, k) {
  if (k === 'nil') { const cost = r2(0.12 * r.star); return { b: 9, cost, why: `Adds $${cost.toFixed(2)}M to his NIL deal.` }; }
  if (k === 'pt') { const ahead = state.roster.filter(p => p.pos === r.pos && p.ovr >= r.ovr - 2 && p.cls !== 'Sr').length; return { b: ahead === 0 ? 12 : ahead <= 1 ? 7 : ahead <= 3 ? 2 : -3, why: ahead === 0 ? 'Nobody is ahead of him at ' + r.pos + '.' : ahead + ' player' + (ahead > 1 ? 's' : '') + ' ahead of him at ' + r.pos + '.' }; }
  if (k === 'hc') { const hc = state.staff.HC; const v = hc ? clamp(Math.round((hc.rec - 70) * 0.5) + 4, -3, 12) : 0; return { b: v, why: hc ? `${hc.name} recruits at ${hc.rec}.` : 'You have no head coach.' }; }
  if (k === 'fac') { const f = facLvl('building'); return { b: clamp((f - 3) * 3 + 3, -3, 10), why: `Your football building is level ${f}.` }; }
  if (k === 'win') { const mr = rankOf(ME); return { b: mr ? clamp(Math.round((26 - mr) / 2.5), 1, 10) : -2, why: mr ? `You finished No. ${mr}.` : 'You finished unranked.' }; }
  return { b: 0, why: '' };
}
function setPitch(id, k) {
  const r = state.rec.list.find(x => x.id === id); if (!r || r.status !== 'open' || !SIGN_PITCH[k] || r.pitch) return null;
  const f = pitchFx(r, k); r.pitch = k; r.pitchB = f.b; if (k === 'nil') r.nil = r2((r.nil || 0) + f.cost); return f;
}
// The draft as it happened, as a list of moments to play back: AD and Coach mode use the real draft results.
const DN_POS = { QB: 'a quarterback to build around', RB: 'a running back with home-run speed', WR: 'a receiver who stretches the field', TE: 'a tight end who can do it all', OL: 'a tackle to protect the quarterback for years', DE: 'an edge rusher', DT: 'a disruptive interior lineman', LB: 'a sideline-to-sideline linebacker', CB: 'a lockdown corner', S: 'a rangy safety', K: 'a kicker', P: 'a punter' };
function draftNightScript(nf) {
  if (!nf || !nf.picks) return []; const out = []; const hc = state.staff && state.staff.HC ? state.staff.HC.name : 'your head coach';
  const mine = nf.picks.filter(p => p.mine); const r1 = nf.picks.filter(p => p.rd === 1); const h = k => hash((state.seed || 0) + ':dn:' + nf.year + ':' + k);
  out.push({ k: 'open', txt: `The ${nf.year} NFL Draft is underway. ${mine.length ? mine.length + ' of your former players are expected to hear their names.' : 'None of your players are projected to go early, but the night is long.'}` });
  r1.forEach(p => { const q = h(p.no); out.push({ k: p.mine ? 'mine' : 'pick', p, txt: `With pick ${p.no}, the ${nflName(p.tm)} select ${p.pos} ${p.n}, ${p.mine ? myName() : teamName(p.school)}.${q < 0.35 ? ' They get ' + (DN_POS[p.pos] || 'a starter') + '.' : q > 0.9 ? ' A surprise this early.' : ''}`, say: p.mine ? `${hc}: "${['He earned every bit of this.', 'I told every scout who came through: this kid is a pro.', 'Proud day for our whole program.'][Math.floor(h('q' + p.no) * 3)]}"` : '' }); });
  const r1m = r1.filter(p => p.mine).length; out.push({ k: 'break', txt: `Round 1 is over. ${r1m ? r1m + ' of your players went in the first round.' : 'None of your players went in the first round.'}` });
  mine.filter(p => p.rd > 1).forEach(p => out.push({ k: 'mine', p, txt: `Round ${p.rd}, pick ${p.no}: the ${nflName(p.tm)} take ${p.pos} ${p.n} from ${myName()}.`, say: `${p.n}: "${['I just want to get to work.', 'My whole family is here. This is for them.', 'I am going to make them glad they called.'][Math.floor(h('s' + p.no) * 3)]}"` }));
  out.push({ k: 'end', txt: `The draft is over. ${mine.length ? `${mine.length} ${myName()} player${mine.length > 1 ? 's' : ''} drafted.` : 'No one from your program was drafted.'}${nf.udfa && nf.udfa.length ? ' ' + nf.udfa.length + ' more sign as free agents.' : ''}` });
  return out;
}

