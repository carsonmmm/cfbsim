/* ===================== v9.56: travel, injuries with a human cost, and the alumni network =====================
 * Travel: visitors who cross time zones, or play at altitude, give up a little. It applies in every mode that uses
 *   the main game engine, on the Updated balance only, so Classic saves play exactly as before.
 * Injuries: two decisions for a college athletic director (fictional players only): a player the doctors advise
 *   to stop playing, and a hurt starter who wants to play in a big game.
 * Alumni: former players give back each offseason: gifts, a word with recruits, and a place on your staff.
 * New save data: X().alum (totals) and optional fields on players (medBack, gut). Old saves need none of it. */

/* ---------- travel ---------- */
const TZ_STATE = {}; // hours behind Eastern time
[['', 0], ['AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI', 1], ['AZ CO ID MT NM UT WY', 2], ['CA NV OR WA', 3], ['AK', 4], ['HI', 5]].forEach(([s, z]) => s.split(' ').forEach(st => { if (st) TZ_STATE[st] = z; }));
const TZ_NFL = { ARI: 2, DEN: 2, LV: 3, LAC: 3, LAR: 3, SF: 3, SEA: 3, CHI: 1, DAL: 1, GB: 1, HOU: 1, KC: 1, MIN: 1, NO: 1, TEN: 1 };
const HIGH_HOME = new Set(['AF', 'WYO', 'COLO', 'CSU', 'UTAH', 'BYU', 'USU', 'UNM', 'DEN']); // a mile up, or close to it
const tzOf = id => (isPro() ? TZ_NFL[id] || 0 : TZ_STATE[TEAM_STATE[id]] || 0);
function travelInfo(h, a, neutral) {
  if (neutral || !h || !a || !T(h) || !T(a) || (typeof isFCS === 'function' && (isFCS(h) || isFCS(a)))) return { z: 0, alt: false, pts: 0 };
  const z = Math.abs(tzOf(h) - tzOf(a)); const alt = HIGH_HOME.has(h) && !HIGH_HOME.has(a);
  return { z, alt, pts: Math.min(1.5, [0, 0.3, 0.7, 1.1, 1.3, 1.5][Math.min(5, z)] + (alt ? 0.6 : 0)) };
}
// points for the home side; zero on the Classic balance
function travelEdge(h, a, neutral) { if (typeof balOn !== 'function' || !balOn()) return 0; try { return travelInfo(h, a, neutral).pts; } catch (e) { return 0; } }
{ const _g = gameDiff; gameDiff = function (h, a, neutral) { return _g.apply(this, arguments) + travelEdge(h, a, neutral); }; }
function travelLine(g) {
  if (!balOn() || g.neutral) return ''; const t = travelInfo(g.h, g.a, g.neutral); if (!t.pts) return ''; const away = g.a === ME;
  const why = [t.z ? `${t.z} time zone${t.z > 1 ? 's' : ''} from home` : '', t.alt ? 'thin air at altitude' : ''].filter(Boolean).join(' and ');
  return `<div class="small muted mt">Travel: ${away ? `your team is ${why}` : `${esc(teamName(g.a))} ${t.z ? 'is ' : 'faces '}${why}`}. A small edge for ${away ? 'the home team' : 'you'}.</div>`;
}
{ const _f = forecastLine; forecastLine = function (g) { let x = ''; try { x = travelLine(g); } catch (e) { } return _f.apply(this, arguments) + x; }; }

/* ---------- injuries with a human cost (college athletic director) ---------- */
const medSeen = () => (X().med || (X().med = {}));
function medRetire(p, why) {
  state.roster = state.roster.filter(x => x.id !== p.id); rebuildPMap(); POS_ORDER.forEach(pos => { state.depth[pos] = (state.depth[pos] || []).filter(id => id !== p.id); }); state.captains = (state.captains || []).filter(id => id !== p.id);
  state.alumni.push({ pid: p.id, n: p.n, pos: p.pos, cs: p.cs || {}, hist: [], awards: p.awards || [], last: state.season, why: 'Medical retirement', where: why });
}
EVENT_DEFS.medretire = { w: 6,
  cond: () => !isPro() && state.roster.some(p => p.injSE && !p.real && p.ovr >= 68 && !medSeen()[p.id]),
  make: () => { const p = pick(state.roster.filter(x => x.injSE && !x.real && x.ovr >= 68 && !medSeen()[x.id])); medSeen()[p.id] = state.season;
    return { title: 'The doctors advise him to stop', text: `The medical staff says ${p.n} (${p.pos}, ${p.ovr} OVR) risks lasting damage if he plays again after his ${String(p.injType || 'injury').toLowerCase()}. He wants to come back. His family is asking what the school thinks.`, data: { pid: p.id },
      opts: [{ label: 'Support a medical retirement', hint: 'He keeps his scholarship and stays with the team as a student coach. Locker room +, fans +. You lose the player.' }, { label: 'Leave it to him and his family', hint: 'He may retire, or come back a step slower and more likely to be hurt again.' }, { label: 'Tell him the team needs him back', hint: 'He returns next season, slower and at real risk. If it gets out, the board and the fans will not like it.' }], def: 1 }; },
  res: (i, d) => { const p = P(d.pid); if (!p) return 'He had already left the program.';
    const back = (drop, msg) => { p.medBack = true; p.ovr = Math.max(40, p.ovr - drop); p.pot = Math.max(p.ovr, (p.pot || p.ovr) - drop - 1); return msg; };
    if (i === 0) { medRetire(p, 'Retired from football on medical advice; stayed on scholarship'); mv('morale', 4); mv('fan', 2); mv('board', 1); return `${p.n} retires from football and joins the staff as a student coach. The locker room notices how the school treated him.`; }
    if (i === 1) { if (R() < 0.5) { medRetire(p, 'Retired from football on medical advice'); mv('morale', 2); return `${p.n} and his family decide he has played his last game. He thanks the program.`; } return back(3, `${p.n} decides to come back. The doctors clear him with a warning.`); }
    mv('morale', -3); if (R() < 0.35) { mv('board', -5); mv('fan', -4); addNews(`A report says ${myName()} pushed ${p.n} to play against medical advice. The board wants answers.`, 'bad'); }
    return back(2, `${p.n} says he will be back. Not everyone in the building is comfortable with it.`); } };
const bigGame = () => { const g = mGames().find(x => !x.done); if (!g || g.type === 'bye') return null; const o = oppOf(g); return rivalOf(o) || (rankOf(o) && rankOf(o) <= 10) || g.type !== 'reg' ? g : null; };
const gutPick = () => POS_ORDER.flatMap(pos => (state.depth[pos] || []).slice(0, START[pos]).map(P)).filter(p => p && !p.real && !p.injSE && p.inj >= 1 && p.inj <= 3 && p.ovr >= 72 && !['K', 'P', 'LS'].includes(p.pos));
EVENT_DEFS.gutitout = { w: 6,
  cond: () => !isPro() && !X().gut && !!bigGame() && gutPick().length > 0,
  make: () => { const p = pick(gutPick()); const g = bigGame(); const o = oppOf(g);
    return { title: 'He wants to play hurt', text: `${p.n} (${p.pos}, ${p.ovr} OVR) is supposed to miss ${p.inj} more week${p.inj > 1 ? 's' : ''} with his ${String(p.injType || 'injury').toLowerCase()}. With ${teamName(o)} next, he is telling everyone he can go.`, data: { pid: p.id, opp: o },
      opts: [{ label: 'Let him play', hint: 'He is in the lineup this week. About two times in five he makes it worse and misses much longer.' }, { label: 'Hold him out', hint: 'He heals on schedule. He will not be happy about it.' }, { label: 'Leave it to the doctors', hint: 'They hold him out. No hard feelings.' }], def: 2 }; },
  res: (i, d) => { const p = P(d.pid); if (!p) return 'He was no longer on the roster.';
    if (i === 0) { X().gut = { pid: p.id, wk: state.week, s: state.season, inj: p.inj, type: p.injType, opp: d.opp }; p.inj = 0; return `${p.n} will play against ${teamName(d.opp)}.`; }
    if (i === 1) { mv('morale', -1); return `${p.n} sits. He says he understands, and does not look like he means it.`; }
    return `The doctors keep ${p.n} out. He takes it from them.`; } };
// the week after: did playing hurt cost him?
{ const _r = rehabWeek; rehabWeek = function (played) {
  try { const G = state.x && state.x.gut; if (G && played && !isPro()) { const p = P(G.pid); delete state.x.gut;
    if (p && !(p.inj > 0)) { if (R() < 0.4) { p.inj = Math.min(10, G.inj * 2 + 2); p.injType = G.type || p.injType; p.injFresh = true; p.ovr = Math.max(40, p.ovr - 1); mv('morale', -2); addNews(`${p.n} played hurt against ${teamName(G.opp)} and made it worse. He is out about ${p.inj} weeks, and he is not the same player.`, 'bad'); } else { mv('morale', 2); addNews(`${p.n} played through it against ${teamName(G.opp)} and came out fine. The locker room loved it.`, 'good'); } } } } catch (e) { console.error(e); }
  return _r.apply(this, arguments);
}; }

/* ---------- the alumni network (college) ---------- */
const alumBook = () => (X().alum || (X().alum = { gifts: 0, last: null, hires: 0, refs: 0 }));
const alumDrafted = a => /^Drafted by/.test(a.where || ''); const alumRound = a => +(((a.where || '').match(/round (\d)/) || [])[1] || 0);
const alumNotable = a => (alumDrafted(a) && alumRound(a) <= 2) || (a.awards || []).length > 0;
// once each offseason: gifts from players who made it in the NFL
function alumniOffseason() {
  if (isPro() || !state.alumni || !state.alumni.length) return; const B = alumBook(); if (B.last === state.season) return; B.last = state.season;
  const pros = state.alumni.filter(a => alumDrafted(a) && state.season - a.last <= 10); if (!pros.length || isCoach()) return;
  const mood = clamp((state.meters.boost + state.meters.fan) / 130, 0.5, 1.3);
  // a first-round pick gives the most; the total is capped so gifts help without replacing the budget
  const gift = r1(Math.min(3, pros.reduce((s, a) => s + (alumRound(a) === 1 ? 0.15 : alumRound(a) <= 3 ? 0.05 : 0.02), 0)) * mood * Math.max(0.3, econ()));
  if (gift >= 0.1) { state.fin.balance += gift; B.gifts = r1((B.gifts || 0) + gift); const top = pros.slice().sort((x, y) => (alumRound(x) || 9) - (alumRound(y) || 9))[0]; addNews(`Former players in the NFL gave $${gift}M back to the program this year, led by ${top.n}.`, 'good'); }
}
{ const _s = startOffseason; startOffseason = function () { const r = _s.apply(this, arguments); try { alumniOffseason(); } catch (e) { console.error(e); } return r; }; }
// recruits listen to the stars who played their position here
{ const _g = genRecruitClass; genRecruitClass = function () { const r = _g.apply(this, arguments);
  try { if (!isPro() && state.rec && state.alumni) { const stars = state.alumni.filter(a => ((alumDrafted(a) && alumRound(a) === 1) || (a.awards || []).length > 0) && state.season - a.last <= 6); let n = 0, who = null;
    // the best of your board at a star's position, eight recruits a class at most
    state.rec.list.forEach(x => { if (n >= 8 || x.star < 3) return; const a = stars.find(s => s.pos === x.pos); if (!a) return; const d = alumDrafted(a) && alumRound(a) === 1 ? 7 : 4; x.interest = clamp(Math.round(x.interest + d), 0, 100); x.alum = a.n; n++; who = who || a.n; });
    if (n) { alumBook().refs = (alumBook().refs || 0) + n; addNews(`${n} recruit${n > 1 ? 's' : ''} on your board grew up watching your former players. ${who} and others have been making calls.`, 'good'); } } } catch (e) { console.error(e); }
  return r; }; }
// a former player, a few years out, applies for a job on the staff
{ const _o = offCoaching; offCoaching = function () { const r = _o.apply(this, arguments);
  try { if (!isPro() && state.alumni && state.cands) { const pool = state.alumni.filter(a => state.season - a.last >= 4 && state.season - a.last <= 15 && !a.real && !a.coach && a.why !== 'Medical retirement' && !/^Transferred/.test(a.where || ''));
    if (pool.length && R() < 0.5) { const a = pick(pool); const role = ['QB', 'RB', 'WR', 'TE', 'OL'].includes(a.pos) ? 'OC' : ['K', 'P', 'LS'].includes(a.pos) ? 'ST' : 'DC'; const base = genCandidates(role, 1)[0];
      if (base && state.cands[role]) { base.name = a.n; base.bg = `Played ${a.pos} here through ${a.last}`; base.alum = true; base.rec = clamp((base.rec || 70) + 8, 50, 97); base.salary = r1(Math.max(0.25, base.salary * 0.85)); base.age = clamp(22 + (state.season - a.last) + 4, 27, 45); state.cands[role].push(base); a.coach = true; addNews(`${a.n}, who played ${a.pos} here, wants to come home as a coach. He is on the ${ROLE_TITLE[role] || role} list.`); } } } } catch (e) { console.error(e); }
  return r; }; }
function alumniCardHTML() {
  if (isPro() || isComm() || !state.alumni) return ''; const A = state.alumni; const B = state.x && state.x.alum ? state.x.alum : { gifts: 0, refs: 0 };
  const pros = A.filter(alumDrafted); const staff = Object.values(state.staff || {}).filter(c => c && c.alum).map(c => c.name);
  const top = A.filter(alumNotable).slice(-8).reverse();
  return `<section class="card" id="alumnicard"><div class="head"><div><div class="eyebrow">Alumni network</div><h2 class="h2">${A.length} former player${A.length === 1 ? '' : 's'}</h2></div><p class="hint">Players who leave stay part of the program. The ones who make it give back, recruits listen to the stars who played their position here, and now and then one comes home to coach.</p></div>
   <div class="tiles"><div class="tile"><div class="k">In the NFL Draft</div><div class="v">${pros.length}</div></div><div class="tile"><div class="k">Given back</div><div class="v">$${r1(B.gifts || 0)}M</div></div><div class="tile"><div class="k">Recruits reached</div><div class="v">${B.refs || 0}</div></div><div class="tile"><div class="k">On your staff</div><div class="v">${staff.length}</div></div></div>
   ${top.length ? `<div class="eyebrow mt">Names recruits know</div><ul class="plainlist small">${top.map(a => `<li><b>${esc(a.n)}</b>, ${a.pos} · ${esc(a.where || '')}${(a.awards || []).length ? ' · ' + esc(typeof a.awards[0] === 'string' ? a.awards[0] : String(a.awards[0].t || a.awards[0].name || a.awards[0].k || 'Award')) : ''}</li>`).join('')}</ul>` : '<p class="muted small mt">No stars yet. Send players to the NFL Draft and this fills in.</p>'}${staff.length ? `<p class="small mt">Coaching here now: ${staff.map(esc).join(', ')}.</p>` : ''}</section>`;
}
{ const _v = vHistory; vHistory = function () { let x = ''; try { x = alumniCardHTML(); } catch (e) { console.error(e); } return _v.apply(this, arguments) + x; }; }
