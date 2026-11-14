/* ===================== TWO-WAY PLAYERS, rebuilt (v10.04) =====================
 * Player Career. Playing a second position is now something you manage: a weekly snap plan, fatigue,
 * skill points you split yourself, a coach who has to trust you over there, schools and NFL clubs with
 * their own view of it, and awards for doing both well. Everything is kept in cs.x.tw and is optional,
 * so careers from before this update keep loading. */
const TW_PLANS = { main: ['Mostly main', 0.5], bal: ['Balanced', 1], second: ['Lean on the second', 1.35], iron: ['Every snap', 1.9] };
const TW_ROLES = ['Situational', 'In the rotation', 'Starter'], TW_CAP = [0.15, 0.35, 0.6];
const TW_STANCE = { both: ['Both ways', 'The coaches promise you a real chance on both sides of the ball.'], open: ['Open to it', 'They will try you in a few packages and see.'], one: ['One position', 'They want you at one spot. You would have to change their minds.'] };
function twS() {
  const X_ = CX(); if (!X_.tw || typeof X_.tw !== 'object') X_.tw = {}; const t = X_.tw;
  if (!TW_PLANS[t.plan]) t.plan = 'bal'; if (typeof t.fat !== 'number') t.fat = 0; if (typeof t.trust !== 'number') t.trust = cs.lvl === 'hs' ? 60 : 55;
  if (![0, 25, 50, 75].includes(t.split)) t.split = 25; if (typeof t.xp2 !== 'number') t.xp2 = 0;
  if (!t.c) t.c = { g: 0, iron: 0, sig: 0 }; if (!t.s || t.s.y !== cs.year) t.s = { y: cs.year, g: 0, iron: 0, sig: 0, sh: 0 };
  return t;
}
function twNfl() { const t = CX().tw; return !!(t && t.nfl && t.nfl.pkg); }
// two-way is live in high school and college, and in the NFL only with a package from your club
twoWayOn = function () { return !!(cs && cs.p && cs.p.two && cs.p.a2 && (cs.lvl !== 'nfl' || twNfl())); };
function twNeed() { return cs.lvl === 'hs' ? 58 : cs.lvl === 'nfl' ? 76 : Math.round(56 + (teamLevel(cs.col.tid) - 45) * 0.4); }
function twRole() { if (cs.lvl === 'nfl') return 0; const t = twS(); return t.trust >= 65 ? 2 : t.trust >= 35 ? 1 : 0; }
// the share of snaps at the second position this week
function twShare2(plan) {
  if (!twoWayOn()) return 0; const t = twS(); const pl = TW_PLANS[plan || t.plan] || TW_PLANS.bal; const role = twRole();
  const cap = cs.lvl === 'nfl' ? 0.2 : TW_CAP[role]; const base = Math.min(cap, clamp(0.12 + role * 0.15 + (cOvr2(cs.p) - 60) * 0.012, 0.06, 0.6));
  return r2(clamp(base * pl[1], 0.04, (plan || t.plan) === 'iron' ? Math.min(0.9, cap + 0.25) : cap));
}
function twFatGain(share, share2) { return Math.max(0, Math.round((share + share2 * 1.2 - 0.9) * 40)); }
function twFatDrop() { return clamp(Math.floor((twS().fat - 30) / 10), 0, 6); } // rating points lost to tired legs
function twTired(a) { const d = twFatDrop(); if (!d) return a; const o = {}; for (const k in a) o[k] = Math.max(25, a[k] - d); return o; }
// used by the game: the second position's ratings, and the main position's when you are worn down
function twAlt2(g) { return { pos: cs.p.two, a: twTired(cs.p.a2), share: g.share2, rank: 1 }; }
function twAlt1(g) { return g.share2 && twFatDrop() ? { pos: cs.p.pos, a: twTired(cs.p.a), share: g.share, rank: g.rank, main: true } : undefined; }

/* ---------- training: you decide where the points go ---------- */
twoWayGrow = function (amount) { const p = cs.p; if (!p.two || !p.a2) return; CATTR[p.two].forEach(([k]) => { p.a2[k] = clamp(p.a2[k] + Math.round(amount * 0.6 + (hash((cs.seed || 0) + ':tg:' + cs.year + ':' + cs.week + ':' + k) - 0.5) * 1.2), 20, CATTR_MAX); }); };
function twUp(k) { const p = cs.p; const t = twS(); if (!p.two || !p.a2 || p.a2[k] == null || p.a2[k] >= CATTR_MAX) return false; const c = cCost(p.a2[k]); if (t.xp2 < c) return false; t.xp2 = r2(t.xp2 - c); p.a2[k]++; return true; }
function twAuto2() { const p = cs.p; if (!p.two || !p.a2) return; const w = CWT[p.two]; let guard = 0; while (guard++ < 300) { let best = null; for (const [k] of CATTR[p.two]) { const v = p.a2[k]; if (v >= CATTR_MAX) continue; const c = cCost(v); if (c > twS().xp2) continue; const val = (w[k] || 0.01) / c - (v - 60) * 0.0006; if (!best || val > best.val) best = { k, val }; } if (!best || !twUp(best.k)) break; } }
{ const _f = grantXP; grantXP = function (n, why) {
  if (!cs || !cs.p || !cs.p.two || !cs.p.a2 || !twoWayOn()) return _f.apply(this, arguments);
  const p = cs.p; const t = twS(); const auto = p.auto; p.auto = false; let g; try { g = _f.apply(this, arguments); } finally { p.auto = auto; }
  const mv2 = r2(g * t.split / 100); if (mv2 > 0) { p.xp = r2(p.xp - mv2); t.xp2 = r2(t.xp2 + mv2); }
  if (auto) { autoAssign(); twAuto2(); }
  return g;
}; }

/* ---------- game day ---------- */
{ const _f = cInjChance; cInjChance = function () { const b = _f.apply(this, arguments); return twoWayOn() ? b * (1 + twS().fat / 80) : b; }; }
{ const _f = cFinishGame; cFinishGame = function (g) {
  const sh = g.share || 0, sh2 = g.share2 || 0, made = g.tw2 || 0, line = Object.assign({}, g.line), won = g.pts[g.mi] > g.pts[1 - g.mi], lvl = cs.lvl;
  const rec = _f.apply(this, arguments);
  try { if (cs.p.two && sh > 0 && sh2 > 0) {
    const t = twS(); const plan = t.plan; const fat0 = t.fat;
    t.fat = clamp(t.fat + twFatGain(sh, sh2), 0, 100); t.s.g++; t.c.g++; t.s.sh = r2(t.s.sh + sh2); t.played = cs.week;
    if (sh >= 0.9 && sh2 >= 0.55) { t.s.iron++; t.c.iron++; }
    // a touchdown on offense and a takeaway or sack on defense in the same game
    const offTd = (line.ptd || 0) + (line.rtd || 0) + (line.rectd || 0), defBig = (line.dint || 0) + (line.sack || 0) + (line.ff || 0) + (line.dtd || 0);
    if (offTd > 0 && defBig > 0 && sh2 >= 0.1) { t.s.sig++; t.c.sig++; rec.tw = 'sig'; folGain(lvl === 'hs' ? 4000 : 12000); cNews(`${cName(cs.p)} does it on both sides: a touchdown on offense and ${line.dint ? 'an interception' : line.sack ? 'a sack' : 'a takeaway'} on defense in the same game.`, 'win'); }
    if (lvl !== 'nfl') { const role0 = twRole(); const d = 0.8 + clamp((cOvr2(cs.p) - twNeed()) / 6, -2, 3) + Math.min(2, made * 0.5) + ({ iron: 1, second: 0.5, bal: 0, main: -0.5 }[plan] || 0) - (fat0 >= 70 ? 2 : 0) + (won ? 0.5 : 0);
      t.trust = clamp(r1(t.trust + clamp(d, -4, 5)), 0, 100); const role1 = twRole();
      if (role1 > role0) cNews(`The coaches give ${cName(cs.p)} a bigger job at ${CPOS_NAME[cs.p.two].toLowerCase()}: ${TW_ROLES[role1].toLowerCase()}.`, 'win'); else if (role1 < role0) cNews(`${cName(cs.p)} loses snaps at ${CPOS_NAME[cs.p.two].toLowerCase()}.`, 'bad'); }
    if (fat0 >= 70) cNews(`${cName(cs.p)} looked worn down late, playing both ways on tired legs.`, 'bad');
    rec.sh2 = sh2;
  } } catch (e) { if (typeof console !== 'undefined') console.error('two-way', e); }
  return rec;
}; }
{ const _f = cEndWeek; cEndWeek = function () {
  try { if (cs.p && cs.p.two) { const t = twS(); const played = t.played === cs.week; t.fat = clamp(t.fat - (played ? 16 : 30) - (cs.p.ready === 'fresh' ? 10 : 0) - (cs.recovery === cs.year ? 4 : 0), 0, 100); } twAskTick(); } catch (e) { }
  return _f.apply(this, arguments);
}; }

/* ---------- talks with the coach ---------- */
function twCanAsk() { const p = cs.p; return !!(p && !p.two && TWO_WAY[p.pos] && (cs.lvl === 'hs' || cs.lvl === 'col') && (cs.phase === 'hs' || cs.phase === 'col')); }
function twStart(trust) { const p = cs.p; const pos2 = TWO_WAY[p.pos]; if (!pos2) return false; const lvl = cOvr(p) - 10; p.two = pos2; p.twoWas = null; if (!p.a2 || Object.keys(p.a2).some(k => !CATTR[pos2].some(([x]) => x === k))) { p.a2 = {}; CATTR[pos2].forEach(([k]) => { p.a2[k] = clamp(Math.round(lvl + (hash((cs.seed || 0) + ':two:' + k) - 0.5) * 6), 30, 92); }); } const t = twS(); t.trust = trust; t.plan = 'main'; t.fat = 0; return true; }
// once a season you can ask to be tried on the other side
function twAskCoach() {
  if (!twCanAsk()) return 'no'; const t = twS(); if (t.asked === cs.year) return 'asked'; t.asked = cs.year;
  const odds = cs.lvl === 'hs' ? 0.85 : clamp(0.25 + ((cs.p.trust || 50) - 45) / 60 + (twStanceOf(cs.col.tid) === 'both' ? 0.3 : twStanceOf(cs.col.tid) === 'one' ? -0.2 : 0), 0.05, 0.92);
  if (hash((cs.seed || 0) + ':twask:' + cs.year) < odds) { twStart(cs.lvl === 'hs' ? 45 : 28); cNews(`The coaches agree to try ${cName(cs.p)} at ${CPOS_NAME[cs.p.two].toLowerCase()} in a few packages.`, 'win'); return 'yes'; }
  cs.p.trust = clamp((cs.p.trust || 50) - 1, 0, 100); return 'declined';
}
function twAskTick() {
  const p = cs.p; const t = twS(); if (t.ask) { if (cs.week - t.ask.wk >= 2 || t.ask.y !== cs.year) twAnswer(t.ask.k === 'rest' ? 0 : 1); return; } // an unanswered question settles itself
  if (!(cs.phase === 'hs' || cs.phase === 'col') || cs.week < 3 || cs.week > 11) return;
  if (twoWayOn()) {
    if (t.fat >= 75 && t.restWk !== cs.week - 1) { t.ask = { k: 'rest', wk: cs.week, y: cs.year }; t.restWk = cs.week; return; }
    const last = (cs.ss.games || []).slice(-3).map(g => g.ratio).filter(x => x != null);
    if (cs.lvl === 'col' && last.length === 3 && (last[0] + last[1] + last[2]) / 3 < 0.78 && t.dropY !== cs.year) { t.ask = { k: 'drop', wk: cs.week, y: cs.year }; t.dropY = cs.year; }
  } else if (twCanAsk() && t.pickY !== cs.year && (cs.lvl === 'hs' || (cs.p.trust || 50) >= 55) && hash((cs.seed || 0) + ':twpick:' + cs.year + ':' + cs.week) < 0.05) { t.ask = { k: 'pickup', wk: cs.week, y: cs.year }; t.pickY = cs.year; }
}
function twAnswer(i) {
  const t = twS(); const a = t.ask; if (!a) return false; t.ask = null; const p = cs.p;
  if (a.k === 'rest') { if (i === 0) { t.plan = 'main'; t.fat = clamp(t.fat - 15, 0, 100); p.trust = clamp((p.trust || 50) + 1, 0, 100); } else p.ready = 'tired'; }
  else if (a.k === 'drop') { if (i === 0) { dropTwoWay(); p.trust = clamp((p.trust || 50) + 6, 0, 100); } else { p.trust = clamp((p.trust || 50) - 4, 0, 100); t.trust = clamp(t.trust - 5, 0, 100); } }
  else if (a.k === 'pickup') { if (i === 0) { twStart(cs.lvl === 'hs' ? 50 : 38); p.trust = clamp((p.trust || 50) + 3, 0, 100); cNews(`${cName(p)} agrees to help out at ${CPOS_NAME[p.two].toLowerCase()}.`, 'win'); } }
  else if (a.k === 'switch') { if (i === 0) twSwap(); else { p.trust = clamp((p.trust || 50) - 3, 0, 100); } }
  return true;
}
// trade places: the second position becomes the main one
function twSwap() {
  const p = cs.p; if (!p.two || !p.a2) return false; const from = p.pos, to = p.two;
  (p.seasons || []).forEach(e => { if (!e.pos) e.pos = from; }); const a = p.a; p.a = p.a2; p.a2 = a; p.pos = to; p.two = from; p.style = CSTYLES[to][0][0]; p.trust = clamp((p.trust || 50) + 6, 0, 100);
  cNews(`${cName(p)} moves to ${CPOS_NAME[to].toLowerCase()} full time. ${CPOS_NAME[from]} is now his second position.`, 'big'); return true;
}

/* ---------- schools: who would let you play both ways ---------- */
function twStanceOf(tid) { const h = hash((cs.seed || 0) + ':twst:' + tid); return h < 0.3 ? 'both' : h < 0.7 ? 'open' : 'one'; }
function twArrive(tid) { if (!cs.p.two) return; const t = twS(); const s = twStanceOf(tid); t.trust = s === 'both' ? 62 : s === 'open' ? 40 : 15; t.fat = 0; t.plan = 'bal'; cNews(s === 'both' ? `${cTeamName(tid)} plans to use ${cName(cs.p)} on both sides of the ball.` : s === 'open' ? `${cTeamName(tid)} will try ${cName(cs.p)} at ${CPOS_NAME[cs.p.two].toLowerCase()} in a few packages.` : `${cTeamName(tid)} sees ${cName(cs.p)} as ${aAn(CPOS_NAME[cs.p.pos].toLowerCase())} only, for now.`); }
{ const _f = enrollCollege; enrollCollege = function (tid) { const r = _f.apply(this, arguments); try { twArrive(tid); } catch (e) { } return r; }; }
{ const _f = portalCommit; portalCommit = function (tid) { const from = cs.portal && cs.portal.from; const r = _f.apply(this, arguments); try { if (r && tid !== from) twArrive(tid); } catch (e) { } return r; }; }
// a two-way star is rare, and worth more
{ const _f = nilOffer; nilOffer = function () { const v = _f.apply(this, arguments); try { if (cs.p.two && cs.lvl !== 'nfl') { const m = [1.03, 1.08, 1.15][cs.lvl === 'hs' ? Math.min(2, twRole()) : twRole()]; const x = v * m; return x < 2000 ? Math.round(x / 250) * 250 : x < 100000 ? Math.round(x / 1000) * 1000 : Math.round(x / 5000) * 5000; } } catch (e) { } return v; }; }

/* ---------- awards ---------- */
{ const _f = heismanVote; heismanVote = function () { const imp = cs.ss.imp; try { if (cs.p.two) { const t = twS(); if (t.s.g >= 6) cs.ss.imp = (imp || 0) * (1 + Math.min(0.15, (t.s.sh / t.s.g) * 0.3)); } } catch (e) { } try { return _f.apply(this, arguments); } finally { cs.ss.imp = imp; } }; }
function twSeasonEnd(lvl, s, y) {
  const p = cs.p; if (!p.two || !s || s.y !== y) return; const t = twS(); const e = p.seasons.filter(x => x.year === y && x.lvl === lvl).slice(-1)[0]; if (!e) return;
  e.tw = { pos: p.two, g: s.g, iron: s.iron, sig: s.sig, sh: s.g ? r2(s.sh / s.g) : 0 };
  const avg = e.tw.sh;
  if (lvl === 'col' && s.g >= 8 && avg >= 0.3 && (e.ratio || 0) >= 1.1) { giveAward(e, 'Two-Way Player of the Year', 40000); cNews(`${cName(p)} is named the national Two-Way Player of the Year.`, 'big'); }
  else if (lvl === 'hs' && s.g >= 6 && avg >= 0.3 && (e.ratio || 0) >= 1.05) { giveAward(e, 'All-State Two-Way Player'); cNews(`${cName(p)} is named an All-State two-way player.`, 'win'); }
  t.fat = 0;
}
{ const _f = colEndSeason; colEndSeason = function () { const s = cs.x && cs.x.tw && cs.x.tw.s, y = cs.year; const r = _f.apply(this, arguments); try { twSeasonEnd('col', s, y); } catch (e) { } return r; }; }
{ const _f = hsEndSeason; hsEndSeason = function () { const s = cs.x && cs.x.tw && cs.x.tw.s, y = cs.year; const r = _f.apply(this, arguments); try { twSeasonEnd('hs', s, y); } catch (e) { } return r; }; }

/* ---------- the draft and the NFL ---------- */
// how each club sees you: at your main position, at the other one, or as both
function twClubView(tm) { const p = cs.p; if (!p.two || !p.a2) return 'main'; const diff = cOvr2(p) - cOvr(p); const h = hash((cs.seed || 0) + ':twd:' + tm); const pBoth = cOvr2(p) >= 78 ? 0.22 : cOvr2(p) >= 72 ? 0.12 : 0.03; const pSec = clamp(0.12 + diff * 0.05, 0.02, 0.6); return h < pBoth ? 'both' : h < pBoth + pSec ? 'second' : 'main'; }
function twDraftSplit() { const n = { main: 0, second: 0, both: 0 }; NFL.forEach(x => n[twClubView(x.id)]++); return n; }
{ const _f = draftProjection; draftProjection = function () { const sc = _f.apply(this, arguments); try { const p = cs.p; if (p.two && p.a2 && cs.lvl !== 'nfl') return r1(sc + (cOvr2(p) >= 82 ? 1 : cOvr2(p) >= 75 ? 0.5 : 0)); } catch (e) { } return sc; }; }
function twJoinClub(tm, rookie) {
  const p = cs.p; if (!p.two || !p.a2) return; const t = twS(); const v = twClubView(tm); t.nfl = { tm, view: v, pkg: v === 'both', y: cs.year }; t.fat = 0; t.plan = 'bal'; t.ask = null;
  if (v === 'both') cNews(`The ${nflName(tm)} plan a package of snaps for ${cName(p)} at ${CPOS_NAME[p.two].toLowerCase()} too.`, 'win');
  else if (v === 'second' && rookie) { t.ask = { k: 'switch', wk: cs.week, y: cs.year }; }
}
{ const _f = nflStart; nflStart = function () { const r = _f.apply(this, arguments); try { if (r) twJoinClub(cs.nfl.tm, true); } catch (e) { } return r; }; }
{ const _f = nflSign; nflSign = function (i) { const from = cs.nfl && cs.nfl.tm; const r = _f.apply(this, arguments); try { if (r && cs.nfl.tm !== from) twJoinClub(cs.nfl.tm, false); } catch (e) { } return r; }; }
// once a season in the NFL you can ask for a package on the other side
function twAskPkg() {
  const p = cs.p; if (cs.lvl !== 'nfl' || !p.two || !p.a2 || twNfl()) return 'no'; const t = twS(); if (t.asked === cs.year) return 'asked'; t.asked = cs.year;
  const odds = clamp(0.1 + (cOvr2(p) - 72) * 0.04 + ((p.trust || 50) - 50) / 80, 0.02, 0.8);
  if (hash((cs.seed || 0) + ':twpkg:' + cs.year) < odds) { t.nfl = Object.assign(t.nfl || {}, { pkg: true, tm: cs.nfl.tm }); cNews(`The ${nflName(cs.nfl.tm)} agree to a package of snaps for ${cName(p)} at ${CPOS_NAME[p.two].toLowerCase()}.`, 'win'); return 'yes'; }
  return 'declined';
}
{ const _f = nflEndSeason; nflEndSeason = function () {
  const s = cs.x && cs.x.tw && cs.x.tw.s, y = cs.year; const r = _f.apply(this, arguments);
  try { const p = cs.p; if (twNfl()) { const t = twS(); const e = p.seasons.filter(x => x.year === y && x.lvl === 'nfl').slice(-1)[0]; if (e && s && s.y === y) e.tw = { pos: p.two, g: s.g, iron: s.iron, sig: s.sig, sh: s.g ? r2(s.sh / s.g) : 0 }; t.fat = 0;
    if ((p.trust || 50) < 45 || cOvr2(p) < 70) { t.nfl.pkg = false; cNews(`The ${nflName(cs.nfl.tm)} end ${cName(p)}'s snaps at ${CPOS_NAME[p.two].toLowerCase()}. They want him at one position.`, 'bad'); } } } catch (e) { }
  return r;
}; }

/* ---------- pages ---------- */
function twAskCardHTML() {
  const t = cs.x && cs.x.tw; const a = t && t.ask; if (!a) return ''; const p = cs.p; const two = p.two ? CPOS_NAME[p.two].toLowerCase() : TWO_WAY[p.pos] ? CPOS_NAME[TWO_WAY[p.pos]].toLowerCase() : '';
  const Q = { rest: ['The trainer', 'You are worn down from playing both ways. The trainer wants you off the field at ' + two + ' this week.', [['Sit out the second position', 'Your plan changes to "Mostly main" and you get some of your legs back.'], ['Keep playing both', 'You stay out there. More injury risk this week.']]],
    drop: ['Your coach', 'Your play at ' + CPOS_NAME[p.pos].toLowerCase() + ' has slipped. Your coach asks you to give up ' + two + ' and focus.', [['Agree: one position from now on', 'Your coach trusts you more. The second position ends.'], ['Keep both', 'He is not happy. You lose some of his trust on both sides.']]],
    pickup: ['Your coach', 'A starter at ' + two + ' is hurt. Your coach asks if you will help out there too.', [['Yes, I will play both', 'You start as a situational player on the other side, with lower ratings there.'], ['No, I will stay at one position', 'Nothing changes.']]],
    switch: ['The ' + (cs.nfl ? nflName(cs.nfl.tm) : 'club'), 'The club drafted you to play ' + two + ', not ' + CPOS_NAME[p.pos].toLowerCase() + '. They ask you to switch.', [['Switch to ' + two, 'It becomes your main position. The coaches like the attitude.'], ['Stay at ' + CPOS_NAME[p.pos].toLowerCase(), 'You stay put. The coaches are a little let down.']]] }[a.k];
  if (!Q) return '';
  return `<section class="card decision" data-block="1"><div class="eyebrow">Two-way · ${esc(Q[0])}</div><h2 class="h3">${esc(Q[1])}</h2><div class="evopts">${Q[2].map((o, i) => `<button class="evopt" data-act="ctwans" data-i="${i}"><b>${esc(o[0])}</b><span>${esc(o[1])}</span></button>`).join('')}</div></section>`;
}
function twFatWord(f) { return f >= 75 ? 'Worn down' : f >= 50 ? 'Tired' : f >= 30 ? 'Heavy legs' : 'Fresh'; }
function twPlanCardHTML() {
  if (!twoWayOn() || !(cs.phase === 'hs' || cs.phase === 'col' || cs.phase === 'nfl') || cs.p.inj > 0) return ''; const t = twS(); const p = cs.p; const sh = myShare(); if (sh <= 0) return '';
  const opts = Object.keys(TW_PLANS).map(k => { const s2 = twShare2(k); const f = twFatGain(sh, s2) - 16; return `<button class="evopt${t.plan === k ? ' on' : ''}" data-act="ctwplan" data-v="${k}" aria-pressed="${t.plan === k}"><b>${t.plan === k ? '✓ ' : ''}${esc(k === 'main' ? 'Mostly ' + CPOS_NAME[p.pos].toLowerCase() : k === 'second' ? 'More ' + CPOS_NAME[p.two].toLowerCase() : TW_PLANS[k][0])}</b><span>${Math.round(s2 * 100)}% of the snaps at ${esc(p.two)} · fatigue ${f > 0 ? '+' + f : f}</span></button>`; }).join('');
  const d = twFatDrop();
  return `<section class="card" id="twplan"><div class="head"><div><div class="eyebrow">Two-way plan this week</div><h2 class="h3">${esc(p.pos)} and ${esc(p.two)}${cs.lvl === 'nfl' ? '' : ' · ' + esc(TW_ROLES[twRole()].toLowerCase()) + ' at ' + esc(p.two)}</h2></div></div>
   ${meter('Fatigue: ' + twFatWord(t.fat), Math.round(t.fat), '', true)}<p class="hint">${d ? `Tired legs cost you ${d} rating point${d === 1 ? '' : 's'} on both sides this week, and you are more likely to get hurt.` : 'More snaps mean more stats and more attention, but they wear you down. A week off the field brings it back.'}</p>
   <div class="evopts">${opts}</div></section>`;
}
function twRecordHTML() { const t = cs.x && cs.x.tw; const c = t && t.c; if (!c || !c.g) return ''; return `<p class="small muted">Two-way record: ${c.g} game${c.g === 1 ? '' : 's'} played on both sides · ${c.iron} iron-man game${c.iron === 1 ? '' : 's'} (nearly every snap) · ${c.sig} game${c.sig === 1 ? '' : 's'} with a touchdown and a takeaway or sack.</p>`; }
twoWayCardHTML = function () {
  const p = cs.p; const live = cs.phase === 'hs' || cs.phase === 'col';
  if (!p.two) {
    const was = p.twoWas ? `<p class="muted small">You played ${esc(CPOS_NAME[p.twoWas].toLowerCase())} too, before focusing on ${esc(CPOS_NAME[p.pos].toLowerCase())}.</p>` : '';
    if (!twCanAsk()) return was ? `<section class="card"><div class="eyebrow">Two-way</div>${was}${twRecordHTML()}</section>` : '';
    const asked = twS().asked === cs.year;
    return `<section class="card"><div class="eyebrow">Two-way</div><h2 class="h3">Play ${esc(CPOS_NAME[TWO_WAY[p.pos]].toLowerCase())} too?</h2>${was}<p class="hint">Once a season you can ask your coach to try you on the other side of the ball. You would start in a few packages, with lower ratings there, and earn more.</p><button class="btn sm" data-act="ctwask" ${asked ? 'disabled' : ''}>${asked ? 'You asked this season' : 'Ask your coach'}</button>${twRecordHTML()}</section>`;
  }
  const t = twS(); const nfl = cs.lvl === 'nfl'; const on = twoWayOn();
  const rows = CATTR[p.two].map(([k, l]) => { const v = p.a2[k]; const c = cCost(v); const can = t.xp2 >= c && v < CATTR_MAX; return `<li><span class="an">${esc(l)}</span><span class="av">${v}</span><span class="bar"><i class="${v >= 85 ? 'good' : v >= 70 ? 'warn' : 'bad'}" style="width:${v}%"></i></span>${on ? `<span class="row gap"><button class="btn sm" data-act="ctwup" data-k="${k}" ${can ? '' : 'disabled'} aria-label="Raise ${esc(l)} for ${c} points">+1 <span class="muted">(${c})</span></button></span>` : ''}</li>`; }).join('');
  const status = nfl ? (on ? `The ${esc(nflName(cs.nfl.tm))} give you a package of snaps at ${esc(CPOS_NAME[p.two].toLowerCase())}: about ${Math.round(twShare2() * 100)}% of the snaps there. They take it away if your main job slips or this rating falls under 70.` : `The ${esc(nflName(cs.nfl.tm))} want you at one position. Once a season you can ask for a package of snaps at ${esc(CPOS_NAME[p.two].toLowerCase())}.`)
    : `Your role at ${esc(CPOS_NAME[p.two].toLowerCase())}: <b>${esc(TW_ROLES[twRole()])}</b>, about ${Math.round(twShare2() * 100)}% of the snaps there on this week's plan.${cs.lvl === 'col' && cs.col ? ' ' + esc(TW_STANCE[twStanceOf(cs.col.tid)][1]) : ''}`;
  return `<section class="card" id="twcard"><div class="head"><div><div class="eyebrow">Two-way player</div><h2 class="h3">${cOvr2(p)} OVR ${esc(p.two)}</h2></div><div class="right"><div class="eyebrow">Points for ${esc(p.two)}</div><div class="h3">${Math.floor(t.xp2)}</div></div></div>
   <p class="small">${status}</p>
   ${nfl ? '' : meter('Coach\'s trust at ' + p.two, Math.round(t.trust), 'Situational under 35, in the rotation from 35, a starter from 65. Good games on that side raise it.')}
   ${on ? `<div class="setrow"><div class="sl"><b>Skill points for ${esc(p.two)}</b><span class="hint">This share of every point you earn goes to your second position. It no longer grows much on its own.</span></div><div class="sctl">${seg('ctwsplit', String(t.split), [['0', 'None'], ['25', '25%'], ['50', '50%'], ['75', '75%']])}</div></div>` : ''}
   <ul class="attrs">${rows}</ul>${twRecordHTML()}
   <div class="row gap mt">${nfl && !on ? `<button class="btn sm" data-act="ctwpkg" ${t.asked === cs.year ? 'disabled' : ''}>${t.asked === cs.year ? 'You asked this season' : 'Ask for a two-way package'}</button>` : ''}${live || nfl ? (cui.confirm === 'twoend' ? '<button class="btn danger sm" data-act="ctwoend">Confirm: play one position from now on</button>' : '<button class="btn ghost sm" data-act="cask2" data-k="twoend">Give up the second position</button>') : ''}${(live || cs.phase === 'coloff' || cs.phase === 'hsoff') && cOvr2(p) >= cOvr(p) - 3 ? (cui.confirm === 'twswap' ? `<button class="btn danger sm" data-act="ctwswap">Confirm: ${esc(p.two)} becomes your main position</button>` : `<button class="btn ghost sm" data-act="cask2" data-k="twswap">Make ${esc(p.two)} your main position</button>`) : ''}</div></section>`;
};
// who would let you play both ways, on the recruiting and portal pages
function twSchoolsHTML(ids) {
  const p = cs.p; if (!p.two || !ids.length) return '';
  return `<section class="card"><div class="eyebrow">Two-way</div><h2 class="h3">Who would let you play both ways</h2><p class="hint">Where you sign decides how much the coaches trust you at ${esc(CPOS_NAME[p.two].toLowerCase())} on day one. A two-way player also gets a little more NIL money.</p><table class="mini wide">${ids.slice(0, 14).map(id => { const s = twStanceOf(id); return `<tr><td><b>${esc(cTeamName(id))}</b></td><td><span class="pill ${s === 'both' ? 'good' : s === 'open' ? 'warn' : 'ghost'}">${TW_STANCE[s][0]}</span></td><td class="small muted">${TW_STANCE[s][1]}</td></tr>`; }).join('')}</table></section>`;
}
function twDraftHTML() {
  const p = cs.p; if (!p.two || !p.a2 || cs.lvl === 'nfl') return ''; const n = twDraftSplit();
  return `<section class="card"><div class="eyebrow">Two-way · the scouts are split</div><p class="small"><b>${n.main}</b> clubs grade you as ${esc(aAn(CPOS_NAME[p.pos].toLowerCase()))}, <b>${n.second}</b> as ${esc(aAn(CPOS_NAME[p.two].toLowerCase()))}, and <b>${n.both}</b> would give you snaps at both. You find out which club you get on draft night. A club that wants you at ${esc(p.two)} will ask you to switch.${cOvr2(p) >= 75 ? ' Being able to do both lifts your grade a little.' : ''}</p></section>`;
}
{ const _f = cRehabCardHTML; cRehabCardHTML = function () { let a = ''; try { a = twAskCardHTML(); } catch (e) { } return a + _f.apply(this, arguments); }; }
{ const _f = nextGameCard; nextGameCard = function () { let a = ''; const h = _f.apply(this, arguments); try { a = twPlanCardHTML(); } catch (e) { } return h + a; }; }
{ const _f = vCRecruit; vCRecruit = function () { const h = _f.apply(this, arguments); try { return h + twSchoolsHTML(offersList().map(o => o.id)); } catch (e) { return h; } }; }
{ const _f = vCPortal; vCPortal = function () { const h = _f.apply(this, arguments); try { return h + twSchoolsHTML(cs.portal && cs.portal.offers ? Object.keys(cs.portal.offers) : []); } catch (e) { return h; } }; }
{ const _f = vCOff; vCOff = function () { const h = _f.apply(this, arguments); try { if (offStep() === 'draft') return h + twDraftHTML(); } catch (e) { } return h; }; }
Object.assign(actions, {
  ctwplan(d) { if (!TW_PLANS[d.v]) return; twS().plan = d.v; cAfter(); },
  ctwsplit(d) { twS().split = +d.v; if (cs.p.auto) twAuto2(); cAfter(); },
  ctwup(d) { if (twUp(d.k)) cAfter(); },
  ctwans(d) { if (twAnswer(+d.i)) cAfter(); },
  ctwask() { const r = twAskCoach(); cAfter(r === 'yes' ? 'Your coach will try you on the other side.' : r === 'declined' ? 'Your coach said no for now. Ask again next season.' : ''); },
  ctwpkg() { const r = twAskPkg(); cAfter(r === 'yes' ? 'The club agreed to a package.' : r === 'declined' ? 'The club said no. Ask again next season.' : ''); },
  ctwswap() { cui.confirm = null; if (twSwap()) cAfter(); },
});
{ const _f = autoAssign; autoAssign = function () { const r = _f.apply(this, arguments); try { if (cs.p.auto && cs.p.two && twoWayOn()) twAuto2(); } catch (e) { } return r; }; }
