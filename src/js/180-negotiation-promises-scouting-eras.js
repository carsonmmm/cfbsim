/* ===================== IDEA-14: the decision journal ===================== */
// Key decisions get a stable id and a snapshot of where things stood, so the History hall can show what followed.
// AD, Coach, GM and Commissioner write to X().dj; Player Career writes to CX().dj. Old saves simply start an empty journal.
// (v9.31–v9.34 kept it under 'jr', which Player Career also uses for retired jersey numbers: djOf moves it over.)
function djOf(H) { if (!H) return []; const j = H.jr; if (Array.isArray(j) && j.length && j[0] && j[0].t != null && j[0].k != null && j[0].num == null) { H.dj = (H.dj || []).concat(j); if (H.jrSeq) H.djSeq = Math.max(H.djSeq || 0, H.jrSeq); delete H.jr; delete H.jrSeq; } return H.dj || (H.dj = []); }
const JR_MAX = 300;
function jrAdd(k, t) {
  try {
    if (typeof appMode !== 'undefined' && appMode === 'career') { if (typeof cs === 'undefined' || !cs || !cs.p) return; const C = CX(); const J = djOf(C); C.djSeq = (C.djSeq || 0) + 1; J.push({ id: 'c' + C.djSeq, y: cs.year, lvl: cs.lvl, k, t: String(t).slice(0, 200), ovr: cOvr(cs.p), trust: cs.p.trust }); if (J.length > JR_MAX) J.splice(0, J.length - JR_MAX); return; }
    if (typeof state === 'undefined' || !state || !state.season) return; const X_ = X(); const J = djOf(X_); X_.djSeq = (X_.djSeq || 0) + 1; const me = T(ME);
    J.push({ id: 'j' + X_.djSeq, s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, k, t: String(t).slice(0, 200), r: me ? Math.round(me.rating) : null, w: me ? me.w : null, l: me ? me.l : null }); if (J.length > JR_MAX) J.splice(0, J.length - JR_MAX);
  } catch (e) { }
}
{
  const _re = resolveEvent; resolveEvent = function (i) { const ev = state && state.event; const lbl = ev && ev.opts ? (ev.opts[i] || ev.opts[0] || {}).label : null; const r = _re.apply(this, arguments); if (ev && lbl) jrAdd('event', `${ev.title}: ${lbl}`); return r; };
  const _hc = hireCoach; hireCoach = function (role, cid) { const c = (state.cands && state.cands[role] || []).find(x => x.id === cid); const r = _hc.apply(this, arguments); if (r === 'hired' && c) jrAdd('hire', `Hired ${c.name} as ${typeof roleTitle === 'function' ? roleTitle(role).toLowerCase() : role}`); return r; };
  const _te = tradeExec; tradeExec = function () { const r = _te.apply(this, arguments); try { if (r && r.ok) { const last = (PS().tx || [])[0]; /* newest first */ jrAdd('trade', last && last.txt ? last.txt : 'A trade'); } } catch (e) { } return r; };
  const _cr = cmResolve; cmResolve = function (id, k, auto) { const it = cm2().items.find(x => x.id === id); const r = _cr.apply(this, arguments); if (!auto && it && r != null) { const o = (it.opts || []).find(x => x[0] === k); jrAdd('comm', `${it.title}: ${o ? o[1] : k}`); } return r; };
  if (typeof cResolveEvent === 'function') { const _ce = cResolveEvent; cResolveEvent = function (i) { const ev = cs && cs.event; const e = ev && typeof CEVENTS !== 'undefined' ? CEVENTS.find(x => x.id === ev.id) : null; const r = _ce.apply(this, arguments); if (e) { const o = e.opts[i] || e.opts[0]; jrAdd('event', `${ev.txt || e.txt || 'A decision'}: ${o[0]}`); } return r; }; }
  if (typeof signWith === 'function') { const _sw = signWith; signWith = function (tid) { const r = _sw.apply(this, arguments); try { if (r !== false && cs && cs.col && cs.col.tid === tid) jrAdd('sign', `Signed with ${cTeamName(tid)}`); } catch (e) { } return r; }; }
  if (typeof nflSign === 'function') { const _ns = nflSign; nflSign = function (i) { const o = cs && cs.nfl && cs.nfl.fa && cs.nfl.fa.offers ? cs.nfl.fa.offers[i] : null; const r = _ns.apply(this, arguments); if (r && o) jrAdd('sign', `Signed with the ${nflName(o.tm)}${o.apy ? ': ' + money(o.apy) + ' a year' : ''}`); return r; }; }
  if (typeof setAgent === 'function') { const _sa = setAgent; setAgent = function (k) { const r = _sa.apply(this, arguments); if (r && typeof AGENTS !== 'undefined' && AGENTS[k]) jrAdd('agent', `Signed with agent ${AGENTS[k].n}`); return r; }; }
  if (typeof portalCommit === 'function') { const _pc = portalCommit; portalCommit = function (tid) { const r = _pc.apply(this, arguments); try { if (r !== false && cs && cs.col && cs.col.tid === tid) jrAdd('transfer', `Transferred to ${cTeamName(tid)}`); } catch (e) { } return r; }; }
}

/* ===================== CONTRACT TALKS (v9.16): the engine ===================== */
// Player Career: negotiate your own NFL contract (a free-agent offer or an extension). Three ways in: negotiate
// yourself (no agent fee on this deal), let your agent do it, or get your agent's advice and then negotiate. Deals
// have a structure: player friendly (more guaranteed money and a bigger signing bonus, fewer years), neutral, or team
// friendly (less guaranteed, more years, a bit less a year; easy to get, and the team appreciates it). Guaranteed
// money is paid out if you're released. No DOM here: the panel is extui4.js. Everything random comes from hmix().
const cx4h = k => hmix(String(typeof cs !== 'undefined' && cs && cs.seed || 0) + ':cx4:' + k);
const CT_PRESET = {
  player: ['Player friendly', 'More guaranteed money and a bigger signing bonus, one fewer year. Harder to get.', { gtd: 0.7, bonus: 0.25, yrsD: -1, apyF: 1.02 }],
  neutral: ['Neutral', 'A standard deal: some guarantees, a normal signing bonus.', { gtd: 0.45, bonus: 0.15, yrsD: 0, apyF: 1 }],
  team: ['Team friendly', 'Less guaranteed money, one more year, a little less a year. Easy to get, and the team appreciates it.', { gtd: 0.25, bonus: 0.08, yrsD: 1, apyF: 0.95 }],
};
const CT_MODE = { self: ['Negotiate it yourself', 'You make the offers. No agent fee on this deal, but you go in blind.'], agent: ['Let your agent handle it', 'He gets the deal done his way and takes his cut.'], advice: ['Get advice from your agent', 'He tells you what he thinks they\'ll pay; then you make the offers. He takes his cut.'] };
const ctOn = () => xCareer() && cs.nfl && cs.phase === 'nfloff';
function ctStore() { const X_ = CX(); return X_.ct && X_.ct.y === cs.year ? X_.ct : null; }
// what a deal costs the team: guarantees and bonus money cost more than salary; years matter a little
function ctCost(d, age) { const want = age < 27 ? 4 : age < 30 ? 3 : age < 33 ? 2 : 1; return d.apy * (1 + 0.35 * (d.gtd - 0.45) + 0.3 * (d.bonus - 0.15)) * (1 + (d.yrs - want) * (age < 29 ? -0.015 : 0.06)); }
const ctApyFor = (cost, d, age) => Math.round(cost / ctCost(Object.assign({}, d, { apy: 1 }), age) / 10000) * 10000;
const ctAge = () => cs.nfl.age + 1;
// where the talks' team sits in the offer list right now (offers come and go while you wait); -1 when it is gone
function ctIdx(T_) { const F = cs.nfl && cs.nfl.fa; if (!T_ || T_.k !== 'fa' || !F || F.done) return -1; return F.offers.findIndex(o => o.tm === T_.tm); }
// free-agent talks still going: the rest of free agency waits until they end (FE-02, FE-04)
const ctBusyFA = () => { if (!xCareer() || !cs.nfl) return false; const T_ = ctStore(); return !!(T_ && T_.k === 'fa' && !T_.done && cs.nfl.fa && !cs.nfl.fa.done); };
// an offer must be complete and in range before it goes to the team
function ctValid(d) { const a = +d.apy, y = +d.yrs, b = +d.bonus, g = +d.gtd; return [a, y, b, g].every(Number.isFinite) && a >= NFL_MIN && a <= 99e6 && y >= 1 && y <= 6 && Math.round(y) === y && b >= 0 && b <= 0.5 && g >= 0 && g <= 1; }
let ctSigning = false;
// open talks on a free-agent offer (kind 'fa', index i) or an extension with your team (kind 'ext')
function ctOpen(kind, i) {
  if (!ctOn()) return 'when'; const n = cs.nfl; const X_ = CX(); const cur = ctStore();
  const want = kind === 'fa' ? (n.fa && !n.fa.done && n.fa.offers[+i] ? n.fa.offers[+i].tm : null) : n.tm; // talks belong to a team, not a list position (FE-02)
  if (cur && !cur.done && (cur.k !== kind || cur.tm !== want)) return 'busy';
  if (cur && cur.k === kind && cur.tm === want && !cur.done) return 'ok';
  let o;
  if (kind === 'fa') { const F = n.fa; if (!F || F.done) return 'gone'; o = F.offers[+i]; if (!o) return 'gone'; if (o.ctNo) return 'closed'; }
  else {
    const c = n.contract; if (c.left !== 1 || n.asked === 'ext' || (n.fa && !n.fa.done)) return 'no'; const fit = nflFit(n.tm); const mkt = nflMarket();
    if (!(fit.share >= 0.9 && mkt > c.apy * 1.1 && cx4h('ext:' + cs.year) < 0.85)) { n.asked = 'ext'; cNews(`The ${nflName(n.tm)} want to see one more season before talking about an extension.`); return 'later'; }
    o = nflOffer(n.tm, mkt, hrng(cs.seed + ':ctext:' + cs.year), 'ext');
  }
  const age = ctAge(); const open = { apy: o.apy, yrs: o.yrs, bonus: o.apy * o.yrs > 0 ? r2((o.bonus || 0) / (o.apy * o.yrs)) : 0, gtd: 0.4 };
  const fit = nflFit(o.tm); const others = kind === 'fa' ? n.fa.offers.length - 1 : 0;
  const lev = clamp(0.05 + (fit.share >= 0.9 ? 0.06 : 0) + (cOvr(cs.p) - 80) * 0.006 + others * 0.025 + (kind === 'ext' ? (cs.p.trust - 50) / 400 : 0) + cx4h('lev:' + cs.year + ':' + kind + ':' + i) * 0.05, 0.02, 0.24);
  X_.ct = { y: cs.year, k: kind, i: kind === 'fa' ? +i : null, tm: o.tm, open, last: Object.assign({}, open), max: r2(ctCost(open, age) * (1 + lev)), lev: r2(lev), pat: 3, round: 0, log: [], mode: null, done: null, deal: null, adv: null };
  return 'ok';
}
function ctMode(m) {
  const T_ = ctStore(); if (!T_ || T_.done || !CT_MODE[m]) return null; if (m !== 'self' && !agentOf()) return 'agent'; T_.mode = m;
  if (m === 'advice' && !T_.adv) { const A = agentOf(); const err = cs.agent === 'shark' ? 0.03 : cs.agent === 'steady' ? 0.02 : 0.05; const age = ctAge(); const base = Object.assign({}, T_.open, CT_PRESET.neutral[2], { yrs: T_.open.yrs }); delete base.yrsD; delete base.apyF;
    const est = ctApyFor(T_.max * (1 + (cx4h('adv:' + cs.year) - 0.5) * 2 * err), base, age);
    T_.adv = { n: A.n, apy: est, lo: Math.round(est * (1 - err) / 10000) * 10000, hi: Math.round(est * (1 + err) / 10000) * 10000, yrsTip: age < 29 ? 'They\'d like more years: a young player on a long deal is good value for them.' : 'They want a short deal at your age. Ask for more years and it costs you per year.', gtdTip: T_.lev >= 0.12 ? 'You have leverage. Push for guaranteed money.' : 'You don\'t have much leverage. A team-friendly structure gets it done.' }; }
  if (m === 'agent' && !T_.deal) { const k = cs.agent; const age = ctAge(); const st = k === 'shark' ? 'player' : 'neutral'; const pr = CT_PRESET[st][2]; const d = { yrs: clamp(T_.open.yrs + pr.yrsD, 1, 6), bonus: pr.bonus, gtd: pr.gtd };
    const eff = k === 'shark' ? 1 : k === 'steady' ? 0.97 : 0.93; d.apy = Math.max(NFL_MIN, ctApyFor(T_.max * eff, d, age));
    if (k === 'shark' && cx4h('shark:' + cs.year + ':' + T_.k + ':' + T_.i) < 0.12) { T_.log.push({ who: 'agent', txt: `${agentOf().n} pushed too hard. The ${nflName(T_.tm)} walked away.` }); return ctPulled(T_); }
    T_.deal = d; T_.log.push({ who: 'agent', txt: `${agentOf().n}: "Best I could do: ${money(d.apy)} a year for ${d.yrs} year${d.yrs > 1 ? 's' : ''}, ${Math.round(d.gtd * 100)}% guaranteed."` }); }
  return 'ok';
}
// your offer; the team accepts, counters, or (pushed too far) walks away
function ctOffer(d) {
  const T_ = ctStore(); if (!T_ || T_.done || !T_.mode || T_.mode === 'agent') return null; const age = ctAge();
  if (!ctValid(d)) return 'bad'; // a blank or broken field is refused, never turned into a minimum deal (FE-03)
  d = { apy: Math.round(+d.apy / 10000) * 10000, yrs: Math.round(+d.yrs), bonus: +d.bonus, gtd: +d.gtd, st: d.st || null }; T_.round++; const c = ctCost(d, age);
  T_.log.push({ who: 'you', txt: `You: ${money(d.apy)} a year, ${d.yrs} year${d.yrs > 1 ? 's' : ''}, ${Math.round(d.gtd * 100)}% guaranteed, ${Math.round(d.bonus * 100)}% as a signing bonus.` });
  if (c <= T_.max) { T_.deal = d; T_.log.push({ who: 'team', txt: `${nflName(T_.tm)}: "Deal."` }); return ctSign(T_); }
  const gap = c / T_.max - 1; T_.pat--;
  if ((gap > 0.25 && cx4h('walk:' + cs.year + ':' + T_.round) < 0.5) || T_.pat < 0) { T_.log.push({ who: 'team', txt: `${nflName(T_.tm)}: "We're too far apart. We're moving on."` }); return ctPulled(T_); }
  const lastC = ctCost(T_.last, age); const target = T_.pat <= 0 ? T_.max : Math.min(T_.max, lastC + (T_.max - lastC) * (T_.round >= 2 ? 0.8 : 0.5) + (c - T_.max) * 0.05);
  const cnt = Object.assign({}, d, { apy: Math.max(NFL_MIN, ctApyFor(target, d, age)) }); T_.last = cnt;
  T_.log.push({ who: 'team', txt: `${nflName(T_.tm)}: "We can do ${money(cnt.apy)} a year with that structure${T_.pat <= 0 ? '. That\'s our final offer' : ''}."` }); return 'counter';
}
function ctPulled(T_) { T_.done = 'pulled'; if (T_.k === 'fa') { const F = cs.nfl.fa; const i = ctIdx(T_); if (i >= 0) { F.offers.splice(i, 1); F.none = !F.offers.length; } } else cs.nfl.asked = 'ext'; return 'pulled'; }
function ctWalk() { const T_ = ctStore(); if (!T_ || T_.done) return null; T_.done = 'walked'; if (T_.k === 'ext') cs.nfl.asked = 'ext'; else { const i = ctIdx(T_); if (i >= 0) cs.nfl.fa.offers[i].ctNo = true; } return 'walked'; }
// take their latest offer (or your agent's deal)
function ctAccept() { const T_ = ctStore(); if (!T_ || T_.done) return null; if (!T_.deal) T_.deal = Object.assign({}, T_.last); return ctSign(T_); }
function ctSign(T_) {
  const n = cs.nfl; const d = T_.deal; const total = d.apy * d.yrs; const bonus = Math.round(total * d.bonus / 10000) * 10000; const noFee = T_.mode === 'self'; const st = d.st || (d.gtd >= 0.6 ? 'player' : d.gtd <= 0.3 ? 'team' : 'neutral');
  if (T_.k === 'fa') {
    const i = ctIdx(T_); if (i < 0) { T_.done = 'pulled'; T_.log.push({ who: 'team', txt: `The ${nflName(T_.tm)} pulled their offer before the deal was signed.` }); return 'gone'; } // never sign with a different team (FE-02)
    const F = n.fa; const o = F.offers[i]; Object.assign(o, { apy: d.apy, yrs: d.yrs, bonus });
    const fee0 = agentFee(); ctSigning = true; let ok; try { ok = nflSign(i); } finally { ctSigning = false; } if (!ok) return null; if (noFee && bonus) cs.p.bank += Math.round(bonus * fee0);
  } else {
    const c = n.contract; c.apy = d.apy; c.yrs = c.yrs + d.yrs; c.left = 1 + d.yrs; c.kind = 'ext'; c.bonus = (c.bonus || 0) + bonus; n.asked = 'ext';
    if (bonus) { cs.p.bank += Math.round(bonus * (1 - (noFee ? 0 : agentFee()))); cs.p.earned += bonus; n.earn = (n.earn || 0) + bonus; cs.nilLog.unshift({ y: cs.year, txt: `Extension bonus, ${nflName(n.tm)}`, amt: bonus }); }
    cNews(`${cName(cs.p)} signs an extension with the ${nflName(n.tm)}: ${d.yrs} more year${d.yrs > 1 ? 's' : ''} at ${money(d.apy)} a year.`, 'big');
  }
  const c = n.contract; c.gtd = r2(d.gtd); c.st = st; c.noFee = noFee; c.gtdPaid = 0; if (st === 'team') cs.p.trust = clamp(cs.p.trust + 4, 0, 100); if (st === 'player' && T_.round >= 3) cs.p.trust = clamp(cs.p.trust - 2, 0, 100);
  T_.done = 'signed'; return 'signed';
}
// your weekly pay skips the agent's cut on a deal you negotiated yourself
{
  const _pw = nflPayWeek; nflPayWeek = function () { const r = _pw.apply(this, arguments); try { const c = cs.nfl && cs.nfl.contract; if (c && c.noFee && agentFee()) { const pay = Math.round((c.apy * c.yrs - (c.bonus || 0)) / c.yrs / 18); if (pay > 0) cs.p.bank += Math.round(pay * agentFee()); } } catch (e) { } return r; };
  // released with guaranteed money left: the team still pays it
  const _ms = nflMoneyStep; nflMoneyStep = function () {
    const n = cs.nfl; const c = n && n.contract; const left = c ? c.left : 0; const r = _ms.apply(this, arguments);
    try { if (c && c.gtd && left > 0 && n.fa && n.fa.why === 'cut') ctGtdPayout(c, left); } catch (e) { }
    return r;
  };
}
// signing any other offer ends open talks (FE-04); waiting for more offers waits until the talks end (FE-02)
{
  const _ns = nflSign; nflSign = function () { const r = _ns.apply(this, arguments); try { if (r && !ctSigning && xCareer()) { const T_ = ctStore(); if (T_ && T_.k === 'fa' && !T_.done) { T_.done = 'other'; T_.closed = true; } } } catch (e) { } return r; };
  const _fw = nflFAWait; nflFAWait = function () { if (ctBusyFA()) return null; return _fw.apply(this, arguments); };
}
// the deal a preset makes from the team's latest offer
function ctPresetDeal(k) { const T_ = ctStore(); if (!T_ || !CT_PRESET[k]) return null; const p = CT_PRESET[k][2]; const base = T_.last || T_.open; return { apy: Math.round(base.apy * p.apyF / 10000) * 10000, yrs: clamp(T_.open.yrs + p.yrsD, 1, 6), bonus: p.bonus, gtd: p.gtd, st: k }; }
function ctGtdPayout(c, left) { const n = cs.nfl; const owed = Math.round(c.apy * left * c.gtd * (c.noFee ? 1 : 1 - agentFee()) / 10000) * 10000; if (owed <= 0) return 0; cs.p.bank += owed; cs.p.earned += owed; n.earn = (n.earn || 0) + owed; cs.nilLog.unshift({ y: cs.year, txt: `Guaranteed money, ${nflName(c.tm)}`, amt: owed }); cNews(`${cName(cs.p)} collects ${money(owed)} in guaranteed money from the ${nflName(c.tm)}.`); return owed; }

/* ===================== IDEA-03: one negotiation layer for every mode ===================== */
// Every contract talk now works the same way, whoever sits across the table: an NFL player and his agent (NFL GM),
// a coaching candidate you want to hire or extend (AD), or the school or club hiring you (Coach). Each counterpart
// bargains in one of the four styles (shark, by the book, friend of the club, grinder), every deal can be built from
// the same three presets (player friendly, neutral, team friendly), and every round goes into one talk log. The
// styles come from hmix(), so they never use the game's random numbers.
const NEG_PRE = { player: ['Player friendly', 'More money up front and protection for him; one fewer year. Easier to get.'], neutral: ['Neutral', 'The standard deal.'], team: ['Team friendly', 'A little less a year, one more year, less protection. Harder to get.'] };
const negStyleOf = key => { const L = ['shark', 'fair', 'friend', 'long']; return L[Math.floor(hmix('negst:' + key) * L.length) % L.length]; };
// the counterpart's style: a player's agent (GM), a coach you hire or extend (AD), the AD or owner hiring you (Coach)
function negStyle(mode, id) { if (mode === 'gm') { const p = P(id); return p && typeof gmAgentOf === 'function' ? gmAgentOf(p).st : 'fair'; } return negStyleOf(mode + ':' + id); }
// the talk log: one list per person, newest last, kept for the season (X().neg)
function negLog(key, who, txt) { try { const X_ = X(); const N = X_.neg && X_.neg.s === state.season ? X_.neg : (X_.neg = { s: state.season, t: {} }); const L = N.t[key] || (N.t[key] = []); L.push({ who, txt: String(txt).slice(0, 160), wk: state.phase === 'offseason' ? 0 : state.week }); if (L.length > 12) L.splice(0, L.length - 12); } catch (e) { } }
function negLogOf(key) { const N = state && state.x && state.x.neg; return N && N.s === state.season && N.t[key] ? N.t[key] : []; }
// a preset turned into each mode's terms, from the current ask or offer
function negPreset(mode, k, base) {
  if (!NEG_PRE[k]) return null;
  if (mode === 'gm') return { apy: r2(base.apy * (k === 'player' ? 1.03 : k === 'team' ? 0.95 : 1)), yrs: clamp(base.yrs + (k === 'player' ? -1 : k === 'team' ? 1 : 0), 1, 6), sh: k === 'player' ? 'front' : k === 'team' ? 'back' : 'flat' };
  if (mode === 'ad') return { sal: r1(base.sal * (k === 'player' ? 1.03 : k === 'team' ? 0.95 : 1)), yrs: clamp(base.yrs + (k === 'player' ? -1 : k === 'team' ? 1 : 0), 1, 8), buy: k === 'player' ? 1 : k === 'team' ? 0.25 : base.role === 'HC' ? 0.75 : 0.5 };
  if (mode === 'coach') return { sal: r2(base.sal * (k === 'player' ? 1.05 : k === 'team' ? 0.97 : 1)), yrs: clamp(base.yrs + (k === 'player' ? -1 : k === 'team' ? 1 : 0), 1, 7), buy: clamp(Math.round(base.buy + (k === 'player' ? 25 : k === 'team' ? -20 : 0)), 0, 100), exit: r1(Math.max(0, base.exit * (k === 'player' ? 0.5 : k === 'team' ? 1.5 : 1))) };
  return null;
}
// which preset a set of terms is closest to (for what happens after the deal)
function negKindOf(mode, d, base) { if (mode === 'gm') return d.sh === 'front' && d.yrs < base.yrs ? 'player' : d.sh === 'back' && d.yrs > base.yrs ? 'team' : 'neutral'; if (mode === 'ad') return d.buy >= 0.95 ? 'player' : d.buy <= 0.3 ? 'team' : 'neutral'; return d.buy >= base.buy + 20 ? 'player' : d.buy <= base.buy - 15 ? 'team' : 'neutral'; }
{
  // NFL GM: the style already shapes the ask (v9.15); log each round, and a player-friendly deal earns a little rapport
  const _oo = offerOwn; offerOwn = function (pid, apy, yrs, sh) {
    const p = P(pid); const a0 = p && p.ask ? Object.assign({}, p.ask) : null; const r = _oo.apply(this, arguments);
    try { if (p && r) { const key = 'gm:' + pid; negLog(key, 'you', `You: ${fmM(apy)} a year for ${yrs} year${yrs > 1 ? 's' : ''}${sh && sh !== 'flat' ? ' (' + (SHAPES[sh] || sh).toLowerCase() + ')' : ''}.`);
      const ag = typeof gmAgentOf === 'function' ? gmAgentOf(p).n : 'His agent';
      negLog(key, 'them', r === 'signed' ? `${ag}: "Deal."` : r === 'counter' ? `${ag}: "We'd need ${fmM(p.ask.apy)} a year."` : r === 'walk' ? `${ag}: "He's going to test the market."` : r === 'cap' ? 'The deal does not fit under your cap.' : String(r));
      if (r === 'signed' && a0) { const k = negKindOf('gm', { sh, yrs }, a0); if (k === 'player') rapAdj(p, 3, 'Got a player-friendly deal'); } } } catch (e) { }
    return r;
  };
  // AD: the coach's style moves his odds, and each offer is logged
  const _no = negOdds; negOdds = function (c, o, ext) {
    let p = _no.apply(this, arguments); if (!balOn()) return p; /* Classic keeps the old odds */ try { const st = negStyle('ad', c.id || c.name); const ask = ext ? c.salary * 1.12 : c.salary; const wantYrs = ext ? 3 : c.years;
      if (st === 'shark') p -= o.sal >= ask * 1.05 ? 0 : 0.06; else if (st === 'friend') p += (c.tree || state.meters.board >= 65) ? 0.06 : 0.02; else if (st === 'long') p += o.yrs > wantYrs ? 0.05 : o.yrs < wantYrs ? -0.04 : 0; } catch (e) { }
    return clamp(p, 0.02, 0.98);
  };
  const _hc = hireCoach; hireCoach = function (role, cid, bump, offer) { const c = (state.cands[role] || []).find(x => x.id === cid); const r = _hc.apply(this, arguments);
    try { if (offer && c) { const key = 'ad:' + (c.id || c.name); negLog(key, 'you', `You: ${fm(offer.sal)} a year for ${offer.yrs} year${offer.yrs > 1 ? 's' : ''}, ${Math.round(offer.buy * 100)}% buyout.`); negLog(key, 'them', r === 'hired' ? `${c.name}: "You have a deal."` : r === 'counter' ? `${c.name}: "Not quite. Keep talking."` : r === 'declined' ? `${c.name} ended the talks.` : String(r));
      if (r === 'hired' && negKindOf('ad', offer) === 'player') mv('morale', 1); } } catch (e) { } return r; };
  const _ne = negotiateExt; negotiateExt = function (role, o) { const c = state.staff[role]; const r = _ne.apply(this, arguments);
    try { if (c) { const key = 'ad:' + (c.id || c.name); negLog(key, 'you', `Extension: ${fm(o.sal)} a year for ${o.yrs} more year${o.yrs > 1 ? 's' : ''}.`); negLog(key, 'them', r === 'signed' ? `${c.name}: "Let's keep this going."` : r === 'counter' ? `${c.name}: "Not yet."` : r === 'broke' ? 'Extension talks broke down.' : String(r)); } } catch (e) { } return r; };
  // Coach: the school's or club's style moves how far it will go, and each round is logged
  const _cn = coNegotiate; coNegotiate = function (id, ask) {
    const o = marketJob(id); if (!o || !o.offer) return _cn.apply(this, arguments); const of = o.offer; const st = negStyle('coach', o.tid + ':' + o.role); const max0 = of.max;
    if (!of.sty) { of.sty = st; of.k0 = of.k.buy; if (!balOn()) { /* Classic: the style is shown but changes nothing */ } else if (st === 'shark') of.max = r2(of.max * 0.97); else if (st === 'friend' && state.co && state.co.rep >= 60) of.max = r2(of.max * 1.03); }
    const longB = balOn() && st === 'long' && +ask.yrs > of.k.yrs; if (longB) of.max = r2(of.max * 1.03);
    let r; try { r = _cn.apply(this, arguments); } finally { if (longB) of.max = r2(of.max / 1.03); }
    try { if (r) { const key = 'coach:' + id; negLog(key, 'you', `You asked: ${fmM(+ask.sal)} a year for ${+ask.yrs} year${+ask.yrs > 1 ? 's' : ''}, ${+ask.buy}% buyout.`); negLog(key, 'them', r.res === 'accept' ? 'They agreed.' : r.res === 'counter' ? `They came back at ${fmM(r.k.sal)} a year.` : r.res === 'final' ? 'That is as far as they go.' : 'They walked away.');
      if (r.res === 'accept' && state.co) { const k = negKindOf('coach', { buy: +ask.buy }, { buy: of.k0 != null ? of.k0 : of.k.buy }); if (k === 'team') state.co.sec = clamp(state.co.sec + 3, 0, 100); } } } catch (e) { }
    void max0; return r;
  };
}

/* ===================== IDEA-11: promises and relationship continuity ===================== */
// One ledger of the promises you make, each with an id, who it was made to, a deadline and a result: a recruit
// promised early playing time (AD, Coach), a player promised a bigger role in a meeting (Coach), and a promise to
// your AD that you're staying (Coach). Kept or broken, the result stays on the record, and your record changes how
// much the next promise is worth.
const PRM_K = { pt: 'Playing time', role: 'Bigger role', stay: 'Staying put' };
// a coach's promises travel with him from job to job (they live on his record, which every move keeps)
const prmHolder = () => (typeof isCoach === 'function' && isCoach() && state.co ? state.co : X());
function prmList() { const X_ = prmHolder(); return X_.prm || (X_.prm = []); }
function prmAdd(o) { const L = prmList(); const X_ = prmHolder(); X_.prmSeq = (X_.prmSeq || 0) + 1; const e = Object.assign({ id: 'pr' + X_.prmSeq, s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, st: 'open', res: '' }, o); L.push(e); if (L.length > 200) L.splice(0, L.length - 200); return e; }
function prmSettle(e, st, res) { if (!e || e.st !== 'open') return; e.st = st; e.res = res || ''; e.at = { s: state.season, wk: state.phase === 'offseason' ? 0 : state.week }; }
const prmOpen = (k, who) => prmList().find(e => e.st === 'open' && e.k === k && e.who === who) || null;
function prmRecord() { const L = prmList(); return { kept: L.filter(e => e.st === 'kept').length, broken: L.filter(e => e.st === 'broken').length, open: L.filter(e => e.st === 'open').length, recent: L.filter(e => e.st === 'broken' && e.at && e.at.s >= state.season - 1).length }; }
// how much a new promise is worth: every recent broken one makes the next one count less
const prmCred = () => clamp(1 - 0.15 * prmRecord().recent, 0.4, 1);
// recruiting: promise a recruit early playing time (three a class); he expects to be in the two-deep by week 6
const PRM_PT_MAX = 3;
function prmPromisePT(rid) {
  const r = state.rec && state.rec.list.find(x => x.id === rid); if (!r || r.status !== 'open' || r.pt || isPro() || isComm()) return null;
  if (isCoach() && typeof canRecruit === 'function' && !canRecruit(r.pos)) return 'staff'; if (state.rec.list.filter(x => x.pt).length >= PRM_PT_MAX) return 'max';
  const d = Math.round(8 * prmCred()); r.pt = true; const before = r.interest; r.interest = clamp(r.interest + d, 1, 99); r.trend = r.interest - before;
  prmAdd({ k: 'pt', who: rid, n: r.n, pos: r.pos, txt: `Early playing time for ${r.star}-star ${r.pos} ${r.n}`, due: { s: state.rec.cls, wk: 6 } }); return d;
}
function prmWeekly() {
  try {
    if (!state || isComm()) return; const L = prmList(); if (!L.some(e => e.st === 'open')) return; const wk = state.phase === 'offseason' ? 0 : state.week;
    L.filter(e => e.st === 'open' && e.k === 'pt').forEach(e => {
      const r = state.rec && state.rec.list.find(x => x.id === e.who); if (r && r.status === 'lost') { prmSettle(e, 'void', `${e.n} went elsewhere, so the promise never came due.`); return; }
      const p = state.roster.find(x => x.rid === e.who); if (!p) { if (state.season > e.due.s) prmSettle(e, 'void', `${e.n} never joined the team.`); return; }
      const di = (state.depth[p.pos] || []).indexOf(p.id); const two = di >= 0 && di < (START[p.pos] || 1) * 2;
      if (two && state.season === e.due.s && state.phase !== 'offseason') { prmSettle(e, 'kept', `${p.n} is on the two-deep as a freshman.`); rapAdj(p, 6, 'You kept your recruiting promise'); return; }
      if ((state.season === e.due.s && wk > e.due.wk) || state.season > e.due.s) { prmSettle(e, 'broken', `${p.n} isn't on the two-deep. He feels misled.`); rapAdj(p, -15, 'You broke your recruiting promise'); p.portalRisk = (p.portalRisk || 0) + 0.2; mv('morale', -1); addNews(`${p.n} says the playing time he was promised on his recruiting visit never came.`, 'bad'); }
    });
    L.filter(e => e.st === 'open' && e.k === 'stay' && state.season > e.s && state.phase !== 'offseason').forEach(e => { prmSettle(e, 'kept', 'You stayed, as you said you would.'); if (state.co) state.co.rep = clamp(state.co.rep + 1, 0, 100); });
  } catch (e) { }
}
{
  // Coach meetings: the "bigger role" promise goes on the ledger, and its result comes back from the weekly check
  if (typeof mtgMeet === 'function') { const _mm = mtgMeet; mtgMeet = function (pid, k) { const r = _mm.apply(this, arguments); try { if (r && r.ok && k === 'role') { const p = P(pid); const M = X().mtg; const pr = M && M.prom && M.prom.find(x => x.pid === pid); const old = prmOpen('role', pid); if (old) prmSettle(old, 'void', 'Replaced by a new promise.'); prmAdd({ k: 'role', who: pid, n: p ? p.n : '', pos: p ? p.pos : '', txt: `A bigger role for ${p ? p.pos + ' ' + p.n : 'a player'}`, due: { s: state.season, wk: pr ? pr.by : state.week + 3 } }); } } catch (e) { } return r; }; }
  if (typeof mtgWeek === 'function') { const _mw = mtgWeek; mtgWeek = function () {
    const M = state && state.x && state.x.mtg; const before = M && M.prom ? M.prom.map(x => Object.assign({}, x)) : [];
    const plan = before.map(pr => { const p = P(pr.pid); if (!p) return [pr, 'void']; const di = (state.depth[p.pos] || []).indexOf(p.id); const starter = di >= 0 && di < (START[p.pos] || 1); return [pr, starter ? 'kept' : (pr.s !== state.season || state.week > pr.by) ? 'broken' : null]; });
    const r = _mw.apply(this, arguments);
    try { plan.forEach(([pr, st]) => { if (!st) return; const e = prmOpen('role', pr.pid); if (e) prmSettle(e, st, st === 'kept' ? 'He got the bigger role.' : st === 'broken' ? 'The bigger role never came.' : 'He left the team.'); }); } catch (e) { }
    return r; }; }
  // Coach: a promise to the AD that you're staying; taking another job breaks it
  if (typeof finishMarket === 'function') { const _fm = finishMarket; finishMarket = function () { try { const m = state.co && state.co.market; const e = prmOpen('stay', 'ad'); if (e && m && !m.done && m.take && !m.take.home) { prmSettle(e, 'broken', `You said you were staying, then took the ${jobNm(m.take)} job.`); state.co.rep = clamp(state.co.rep - 4, 0, 100); addNews(`${state.co.name} leaves weeks after promising to stay. People around the sport noticed.`, 'bad'); } } catch (e) { } return _fm.apply(this, arguments); }; }
  const _xw = x2Week; x2Week = function () { const r = _xw.apply(this, arguments); prmWeekly(); return r; };
}
function prmStay() { if (!isCoach() || !state.co || state.phase !== 'offseason' || prmOpen('stay', 'ad')) return false; const m = state.co.market; if (m && (m.done || m.take)) return false; state.co.sec = clamp(state.co.sec + Math.round(4 * prmCred()), 0, 100); prmAdd({ k: 'stay', who: 'ad', n: isPro() ? 'Your owner' : 'Your AD', txt: `Told ${isPro() ? 'the owner' : 'the AD'} you're staying with ${myName()}`, due: { s: state.season + 1, wk: 1 } }); return true; }

/* ===================== IDEA-10: scouting uncertainty ===================== */
// New careers see recruits as ranges, not exact numbers: a scout who covers his region, a home visit, a coach's trip
// or an official visit narrows them. Each recruit also carries a personality your staff learns about, and two plain
// tags: "High ceiling" (a wide range that reaches high) and "Reliable" (a tight, well-scouted read). NFL clubs run by
// the computer read prospects more sharply on harder difficulty. Saves from before v9.37 keep exact numbers.
const scoutRanges = () => !!(state && state.settings && state.settings.scoutMode === 'ranges');
function recSeen(r) {
  let e = 4; const sc = typeof recScout === 'function' ? recScout(r) : null; if (sc) e = Math.min(e, 3 - sc.lvl);
  const hv = state.x && state.x.hv && state.x.hv.done && state.x.hv.done[r.id]; if (r.scouted || hv) e = Math.min(e, 2); if (r.visit === 'done') e = Math.min(e, 1); return Math.max(0, e);
}
function recView(r) {
  if (!scoutRanges()) return { lo: r.ovr, hi: r.ovr, plo: r.pot, phi: r.pot, mid: r.ovr, pmid: r.pot, e: 0 };
  const e = recSeen(r); const pe = e === 0 ? 0 : e + 3; const b = Math.round((hmix('rb:' + state.seed + ':' + r.id) - 0.5) * 2 * e), pb = Math.round((hmix('rpb:' + state.seed + ':' + r.id) - 0.5) * 2 * pe);
  const mid = clamp(r.ovr + b, 30, 99), pmid = clamp(r.pot + pb, 30, 99); return { lo: clamp(mid - e, 30, 99), hi: clamp(mid + e, 30, 99), plo: clamp(pmid - pe, 30, 99), phi: clamp(pmid + pe, 30, 99), mid, pmid, e };
}
function scoutTag(v, e) { if (v.phi >= 84 && v.phi - v.mid >= 14) return ['High ceiling', 'His best case is a star, but the read is wide: he could also stall.']; if (e <= 1 && v.pmid - v.mid <= 8 && v.mid >= 62) return ['Reliable', 'A tight, well-scouted read: what you see is about what you get.']; return null; }
const recPers = r => r.pers || (r.pers = persOf(false, (state.seed || 0) + ':rec:' + r.id));
// he arrives with the personality your staff saw
{ const _sd = signingDay; signingDay = function () { const r = _sd.apply(this, arguments); try { (state.roster || []).forEach(p => { if (p.rid && p.cls === 'Fr' && !p.persFix) { const rec = state.rec && state.rec.list.find(x => x.id === p.rid); if (rec && rec.pers) p.pers = rec.pers; p.persFix = 1; } }); } catch (e) { } return r; }; }
// computer-run NFL clubs: how sharply they read a prospect depends on difficulty (new careers)
{ const _ad = aiDraftScore; aiDraftScore = function (tid, p) { const v = _ad.apply(this, arguments); if (!scoutRanges()) return v; const d = (state.settings && state.settings.diff) || 'normal'; const k = d === 'easy' ? 7 : d === 'hard' || d === 'legend' ? 0.5 : 3; return v + (hmix('aisc:' + tid + ':' + p.id) - 0.5) * k; }; }

/* ===================== IDEA-12: role-specific Player stories ===================== */
// Every position has its own milestones (a lineman's pancakes and starts, a kicker's field goals, a corner's picks),
// a veteran at your position can take you under his wing in your first college and first NFL season, and a career
// can be remembered for more than its OVR: campus legend, transfer who made it, specialist, journeyman, iron man,
// late bloomer, mentor, Hall of Famer.
const CMS = {
  QB: [['pyd', [5000, 15000, 30000]], ['ptd', [50, 150, 300]]], RB: [['ryd', [3000, 8000, 12000]], ['rtd', [30, 75]]], WR: [['recyd', [3000, 8000, 12000]], ['rec', [200, 600]]], TE: [['recyd', [2500, 6000]], ['rec', [150, 450]], ['pan', [40]]],
  OL: [['pan', [100, 300, 500]], ['snp', [3000, 8000]]], DE: [['sack', [20, 60, 100]], ['tfl', [50, 120]]], DT: [['sack', [15, 45]], ['tfl', [50, 120]]], LB: [['tkl', [300, 800, 1200]], ['sack', [20, 50]]],
  CB: [['dint', [10, 30, 50]], ['pbu', [50, 120]]], S: [['dint', [10, 30]], ['tkl', [300, 700]]], K: [['fgm', [50, 200, 350]], ['fg50', [10, 40]]], P: [['puyd', [20000, 60000]], ['in20', [100, 300]]],
};
const CMS_GS = [25, 100, 150];
function cTotalsNow() { const t = {}; (cs.p.seasons || []).filter(s => s.lvl !== 'hs').forEach(s => Object.entries(s.st || {}).forEach(([k, v]) => { t[k] = (t[k] || 0) + v; })); if (cs.lvl !== 'hs' && cs.ss && cs.ss.st && !cs.off) Object.entries(cs.ss.st).forEach(([k, v]) => { t[k] = (t[k] || 0) + v; });
  t.gs = (cs.p.seasons || []).filter(s => s.lvl !== 'hs').reduce((a, s) => a + (s.gs || 0), 0) + (cs.lvl !== 'hs' && cs.ss && !cs.off ? cs.ss.gs || 0 : 0); return t; }
const cmsLbl = k => (k === 'gs' ? 'Starts' : (typeof CREC_KEYS !== 'undefined' && CREC_KEYS[k]) || (typeof STAT_LBL !== 'undefined' && STAT_LBL[k]) || k);
function cMsCheck() {
  if (!cs || !cs.p || cs.lvl === 'hs') return []; const X_ = CX(); const M = X_.ms || (X_.ms = {}); const t = cTotalsNow(); const got = [];
  (CMS[cs.p.pos] || []).concat([['gs', CMS_GS]]).forEach(([k, L]) => L.forEach(n => { const id = k + ':' + n; if (!M[id] && (t[k] || 0) >= n) { M[id] = cs.year; got.push(id); cNews(`Milestone: ${cName(cs.p)} reaches ${n.toLocaleString()} career ${cmsLbl(k).toLowerCase()} (college and pro).`, 'big'); } }));
  return got;
}
function cMsNext() { const t = cTotalsNow(); const M = (cs.x && cs.x.ms) || {}; const out = []; (CMS[cs.p.pos] || []).concat([['gs', CMS_GS]]).forEach(([k, L]) => { const n = L.find(v => !M[k + ':' + v]); if (n) out.push({ k, n, v: t[k] || 0 }); }); return out; }
// what a career is remembered for
function cIdentity() {
  const p = cs.p; const S = p.seasons || []; const col = S.filter(s => s.lvl === 'col'), nfl = S.filter(s => s.lvl === 'nfl'); const aw = (p.awards || []).map(a => a.a); const out = [];
  const colAw = (p.awards || []).filter(a => a.lvl === 'col' && /All-America|Heisman|Award|of the Year/.test(a.a)).length; const colRec = Object.keys((cs.x && cs.x.ms) || {}).length; void colRec;
  if (colAw >= 2 || (col.filter(s => (s.gs || 0) >= 8).length >= 3 && colAw >= 1)) out.push(['Campus legend', 'A college career people still talk about.']);
  if (cs.col && cs.col.transfers && col.some(s => s.team !== cs.col.teams[0] && (s.gs || 0) >= 6)) out.push(['Transfer who made it', 'Moved schools and won the job.']);
  if (['K', 'P'].includes(p.pos) && (aw.some(a => /Pro Bowl|All-Pro|All-America/.test(a)) || (cTotalsNow().fgm || 0) >= 150 || (cTotalsNow().puyd || 0) >= 40000)) out.push(['Specialist', 'One of the best at a job most fans never think about.']);
  const tms = new Set(nfl.map(s => s.team)); if (tms.size >= 4 && nfl.length >= 8) out.push(['Journeyman', `${tms.size} NFL teams, ${nfl.length} seasons: always someone's answer.`]);
  if (cTotalsNow().gs >= 150) out.push(['Iron man', `${cTotalsNow().gs} college and pro starts.`]);
  const d = cs.done && cs.done.draft; if (d && (d.udfa || d.round >= 4) && nfl.filter(s => (s.gs || 0) >= 10).length >= 4) out.push(['Late bloomer', d.udfa ? 'Undrafted, then a starter for years.' : `A round ${d.round} pick who became a starter for years.`]);
  if (((cs.x && cs.x.mentored) || 0) >= 3) out.push(['Mentor', 'Younger teammates grew because of you.']);
  if (cs.nfl && cs.nfl.retired && cs.nfl.retired.hof) out.push(['Hall of Famer', 'Enshrined.']);
  return out;
}
// a veteran mentor in your first college season and your first NFL season
function cMentorOffer() {
  if (!cs || !cs.p || !['col', 'nfl'].includes(cs.phase)) return null; const first = cs.lvl === 'col' ? cs.col && cs.col.years === 1 : cs.lvl === 'nfl' ? cs.nfl && cs.nfl.yrs === 0 : false; if (!first) return null;
  const X_ = CX(); const key = cs.lvl + ':' + cs.year; if (X_.mnt && X_.mnt.key === key) return X_.mnt; if (X_.mnt && X_.mnt.lvl === cs.lvl) return null;
  const d = myDepth(); const old = x => (cs.lvl === 'nfl' ? (x.exp || 0) >= 3 : ['Jr', 'Sr', 'Gr'].includes(String(x.cls || '').replace('RS-', ''))); const vet = d.all.filter(x => !x.me && old(x)).sort((a, b) => b.ovr - a.ovr)[0] || d.all.filter(x => !x.me).sort((a, b) => b.ovr - a.ovr)[0]; if (!vet) return null;
  X_.mnt = { key, lvl: cs.lvl, y: cs.year, n: vet.n, pos: cs.p.pos, st: 'offer', wk: 0, xp: 0 }; return X_.mnt;
}
function cMentorAnswer(yes) { const M = CX().mnt; if (!M || M.st !== 'offer') return null; M.st = yes ? 'yes' : 'no'; if (yes) { cs.p.trust = clamp(cs.p.trust + 2, 0, 100); cNews(`${M.n} takes ${cName(cs.p)} under his wing.`); } return M.st; }
{
  const _w = cx2Week; cx2Week = function (wk) { const r = _w.apply(this, arguments); try { cMsCheck(); const M = CX().mnt; if (M && M.st === 'yes' && M.y === cs.year && M.lvl === cs.lvl) { M.wk++; if (M.wk % 2 === 0 && M.xp < 6) { cs.p.xp += 1; M.xp++; } } } catch (e) { } return r; };
  const _ce = cResolveEvent; cResolveEvent = function (i) { const ev = cs && cs.event; const r = _ce.apply(this, arguments); try { if (ev && ev.id === 'mentor' && +i === 0) { const X_ = CX(); X_.mentored = (X_.mentored || 0) + 1; } } catch (e) { } return r; };
}
// the stores added in v9.31–v9.38 get shape checks too (a damaged one is reset on its own, IDEA-02)
Object.assign(X_SHAPE, { dj: 'a', prm: 'a', neg: 'o:t=o' }); Object.assign(CX_SHAPE, { dj: 'a', ms: 'o', mnt: 'o', mentored: 'n' });
Object.assign(X_NAME, { dj: 'decision journal', prm: 'promises', neg: 'contract talks', ms: 'milestones', mnt: 'mentor', mentored: 'mentoring' });

/* ===================== IDEA-09: tendencies, game plans with an install budget, and halftime Coach AI ===================== */
// The scouting report now reads like a coordinator's: how often they run on first down, throw on third and long,
// blitz, take deep shots, and how mobile their quarterback is. Each week you have a few install points to spend on
// packages; a package pays off most when it answers one of their tendencies. Over the budget is not allowed, and the
// tempo package wears the team down. At halftime, computer-run coaches adjust: behind by 10 or more they open it up,
// ahead by 14 or more they sit on the ball (Updated balance only, so Classic games play as before).
function oppTend(opp) {
  const u = typeof oppUnits === 'function' && !isFCS(opp) ? oppUnits(opp) : { run: 60, pass: 60, runD: 60, passD: 60, lean: 0 }; const h = k => hmix('tend:' + state.season + ':' + opp + ':' + k); const lean = (u.lean || 0) + (u.run - u.pass) / 2;
  const sch = typeof teamScheme === 'function' && T(opp) ? teamScheme(opp) : null; const off = sch && sch.off;
  return { run1: Math.round(clamp(55 + lean * 3 + (off === 'power' ? 10 : off === 'air' ? -14 : 0) + (h('r1') - 0.5) * 10, 30, 80)), pass3: Math.round(clamp(72 - lean * 2 + (off === 'air' ? 10 : 0) + (h('p3') - 0.5) * 10, 50, 92)),
    blitz: Math.round(clamp(28 + (h('bl') - 0.5) * 30, 12, 50)), deep: Math.round(clamp(18 + (off === 'air' ? 12 : 0) + (h('dp') - 0.5) * 14, 8, 40)), mobile: off === 'spread' || h('mq') < 0.25 };
}
const GP_ITEMS = {
  blitz: ['Blitz package', 2, 'def', 'Pays off against teams that throw on third and long.'], cover: ['Two-high coverage', 1, 'def', 'Takes away the deep shot.'], spy: ['Quarterback spy', 1, 'def', 'Contains a quarterback who runs.'],
  screen: ['Screen game', 1, 'off', 'Punishes a defense that blitzes.'], pa: ['Play-action shots', 2, 'off', 'Works when their pass defense is the weak spot.'], goal: ['Goal-line package', 1, 'off', 'Finishes drives in the red zone.'], tempo: ['No-huddle tempo', 2, 'off', 'More snaps and a tired defense, but your own team tires too.'],
};
function gpBudget() { let b = 3; try { const P_ = pracStore(); if (P_.inst >= 1) b++; if (P_.fat >= 70) b--; } catch (e) { } return b; }
function gpStore() { const x = X(); if (!x.gp || x.gp.s !== state.season) x.gp = { s: state.season, wk: {} }; return x.gp; }
function gpCur(g) { if (!g) return []; const c = gpStore().wk[g.wk]; return c && c.gid === g.id ? c.items : []; }
function gpSet(k) { const g = prepNext(); if (!g || !GP_ITEMS[k]) return false; const S = gpStore(); const cur = S.wk[g.wk] && S.wk[g.wk].gid === g.id ? S.wk[g.wk] : (S.wk[g.wk] = { gid: g.id, items: [] }); const i = cur.items.indexOf(k);
  if (i >= 0) { cur.items.splice(i, 1); return true; } const used = cur.items.reduce((s, x) => s + GP_ITEMS[x][1], 0); if (used + GP_ITEMS[k][1] > gpBudget()) return 'budget'; cur.items.push(k); return true; }
function gpFit(k, t, sc) { if (k === 'blitz') return t.pass3 >= 78; if (k === 'cover') return t.deep >= 24; if (k === 'spy') return t.mobile; if (k === 'screen') return t.blitz >= 34; if (k === 'pa') return sc && sc.weak === 'passD'; if (k === 'goal') return true; if (k === 'tempo') return true; return false; }
function gpBonus(g) {
  const items = gpCur(g); if (!items.length) return { off: 0, def: 0 }; const opp = g.h === ME ? g.a : g.h; const t = oppTend(opp); const sc = prepScout(g); const out = { off: 0, def: 0 };
  items.forEach(k => { const side = GP_ITEMS[k][2]; const v = k === 'goal' ? 0.12 : k === 'tempo' ? 0.2 : gpFit(k, t, sc) ? 0.32 : 0.06; out[side] += v; }); return out;
}
{
  const _cs = createSim; createSim = function (g, opts) { const sim = _cs(g, opts); try { if (sim.mSide >= 0) { const b = gpBonus(g); sim.F[sim.mSide].off += b.off; sim.F[sim.mSide].def += b.def; if (gpCur(g).includes('tempo')) { const P_ = pracStore(); P_.fat = clamp(P_.fat + 6, 0, 100); } sim.gp = gpCur(g).slice(); } } catch (e) { } return sim; };
  // Coach AI at halftime (Updated balance): the computer's side adjusts to the score
  const _st = simStep; simStep = function (sim) {
    try { if (sim && !sim.done && !sim.pending && !sim.aiHalf && sim.i === sim.total / 2 && sim.bal && sim.mSide >= 0) { sim.aiHalf = true; const o = 1 - sim.mSide; const m = sim.pts[o] - sim.pts[sim.mSide];
      if (m <= -10) { sim.F[o].off += 0.25; sim.F[o].def -= 0.1; sim.aiAdj = 'aggressive'; } else if (m >= 14) { sim.F[o].off -= 0.12; sim.F[o].def += 0.05; sim.aiAdj = 'conservative'; } } } catch (e) { }
    return _st.apply(this, arguments);
  };
}

/* ===================== IDEA-13: the league as a system (Commissioner) ===================== */
// Five readings of league health, measured every season and kept as a history: competitive balance (how spread out
// the teams are, and how many different champions), discipline consistency (how close your rulings stay to your own
// precedents), labor climate (union mood, years left on the deal, strike risk), market strain (how revenue sharing
// sits with big- and small-market owners, or power and non-power schools), and player safety. On the Updated balance
// they feed back into the meters each year, slowly, so a policy shows its effect over seasons rather than at once.
// how spread out the ratings are, on each level's own scale (NFL rosters sit much closer together than college ones)
const cmParityOf = sd => (cmLvl() === 'nfl' ? 100 - (sd - 1) * 20 : 100 - (sd - 6) * 8);
function cmHealthNow() {
  const c = cm2(); const nfl = cmLvl() === 'nfl'; const ts = cmTeams(); const mean = ts.reduce((s, t) => s + t.rating, 0) / Math.max(1, ts.length); const sd = Math.sqrt(ts.reduce((s, t) => s + (t.rating - mean) ** 2, 0) / Math.max(1, ts.length));
  const H = lgHistOf(); const L5 = (nfl ? H.nfl : H.col).slice(-5); const champs = new Set(L5.map(e => e.champ).filter(Boolean)).size;
  const parity = Math.round(clamp(cmParityOf(sd) + (L5.length >= 3 ? (champs - 3) * 4 : 0), 0, 100));
  const recent = (c.disc || []).filter(d => d.s >= state.season - 1 && !d.fine && c.prec[d.k] != null); const mad = recent.length ? recent.reduce((s, d) => s + Math.abs(d.g - c.prec[d.k]), 0) / recent.length : 0; const cons = Math.round(clamp(100 - mad * 18, 0, 100));
  const left = c.cba ? c.cba.until - state.season : 9; const strike = Math.round(clamp((c.cba ? 0 : 0.4) + (left <= 1 ? 0.25 : 0) + (50 - c.m.union) / 60, 0, 0.95) * 100);
  const sh = nfl ? (c.share || 50) : (c.cfpSplit === 'even' ? 60 : 40); const strain = Math.round(clamp(Math.abs(sh - 52) * 2.5, 0, 100)); const strainWho = sh < 52 ? (nfl ? 'small-market owners' : 'non-power schools') : (nfl ? 'big-market owners' : 'power-conference schools');
  const safety = c.safety || 50; return { s: state.season, parity, sd: r1(sd), champs, cons, n: recent.length, strike, left, strain, strainWho, safety };
}
// where things head in three seasons if nothing changes (balance from revenue sharing; labor from the calendar)
function cmHealthProj() { const c = cm2(); const now = cmHealthNow(); const f = cmLvl() === 'nfl' ? clamp(1 - ((c.share || 50) - 50) / 300, 0.8, 1.1) : (c.cfpSplit === 'even' ? 0.97 : 1.02); const sd3 = now.sd * Math.pow(f, 3); return { parity: Math.round(clamp(cmParityOf(sd3), 0, 100)), strike: now.left - 3 <= 1 ? Math.min(95, now.strike + 20) : now.strike }; }
{
  const _rv = cmReview; cmReview = function () {
    try { const c = cm2(); const h = cmHealthNow(); c.health = (c.health || []).concat([h]).slice(-40);
      if (balOn()) { const fx = {}; if (h.parity >= 65) fx.fan = 1; else if (h.parity <= 35) fx.fan = -1; if (h.n >= 3) { if (h.cons >= 75) fx.integ = 1; else if (h.cons <= 40) fx.integ = -1; } if (h.strain >= 40) fx.own = -1; if (h.safety <= 35) fx.union = -1; if (Object.keys(fx).length) { cmFx(fx); cmLog(`League health: ${cmFxTxt(fx)} from how the league looks after ${state.season}.`); } }
      if (h.strike >= 50 && h.left <= 1) addNews(`Labor warning: the union is restless and the deal is almost up. Strike risk about ${h.strike}%.`, 'bad'); } catch (e) { }
    return _rv.apply(this, arguments);
  };
}

/* ===================== IDEA-16: prospect camps ===================== */
// College (AD and Coach head coach or recruiter): once a season, host a camp for up to eight recruits. Campers run
// drills in front of your staff: their ratings are read exactly from then on, each gets a camp grade, and coming to
// campus lifts their interest. The camp costs money. NFL GM: once a draft season, a camp for up to six prospects from
// outside the top 64; they get a full read, so late-round sleepers are easier to find.
const CAMP_MAX = 8, PCAMP_MAX = 6;
function campOk() { return !!(state && state.rec && !state.rec.done && !isPro() && !isComm() && (!isCoach() || ['HC'].includes(state.co.role) || typeof rolePositions === 'function')); }
function campStore() { const X_ = X(); if (!X_.rcamp || X_.rcamp.s !== state.season) X_.rcamp = { s: state.season, inv: [], done: false, res: {} }; return X_.rcamp; } /* X().camp belongs to the training camp battles */
const campCost = () => r2(0.3 * (typeof econ === 'function' ? econ() : 1));
function campInvite(rid) { if (!campOk()) return null; const C = campStore(); if (C.done) return 'done'; const r = state.rec.list.find(x => x.id === rid); if (!r || r.status !== 'open') return null; if (isCoach() && typeof canRecruit === 'function' && !canRecruit(r.pos)) return 'staff'; const i = C.inv.indexOf(rid); if (i >= 0) { C.inv.splice(i, 1); return 'out'; } if (C.inv.length >= CAMP_MAX) return 'full'; C.inv.push(rid); return 'in'; }
const forty = (pos, g, k) => r2(clamp(({ QB: 4.75, RB: 4.5, WR: 4.45, TE: 4.7, OL: 5.2, DE: 4.75, DT: 5.0, LB: 4.65, CB: 4.42, S: 4.5, K: 4.9, P: 4.9 }[pos] || 4.7) - (g - 70) * 0.012 + (hmix(k) - 0.5) * 0.12, 4.25, 5.6));
function campRun() {
  if (!campOk()) return null; const C = campStore(); if (C.done || !C.inv.length) return null; const cost = campCost(); state.fin.balance = r2(state.fin.balance - cost); if (state.fin.ytd) state.fin.ytd.eventx = r1((state.fin.ytd.eventx || 0) + cost);
  C.inv.forEach(rid => { const r = state.rec.list.find(x => x.id === rid); if (!r) return; const k = 'camp:' + state.seed + ':' + rid; const grade = Math.round(clamp(r.ovr * 0.45 + r.pot * 0.55 + (hmix(k) - 0.5) * 6, 40, 99));
    C.res[rid] = { n: r.n, pos: r.pos, grade, f: forty(r.pos, grade, k + ':40') }; r.camp = state.season; const before = r.interest; r.interest = clamp(r.interest + (grade >= 80 ? 6 : 4), 1, 99); r.trend = r.interest - before; });
  C.done = true; const best = Object.values(C.res).sort((a, b) => b.grade - a.grade)[0]; if (best) addNews(`${myName()} camp: ${best.pos} ${best.n} stands out (camp grade ${best.grade}, ${best.f.toFixed(2)} in the 40).`, 'big'); return C;
}
// campers are read exactly (the scouting ranges from v9.37)
{ const _rs = recSeen; recSeen = function (r) { return r && r.camp ? 0 : _rs.apply(this, arguments); }; }
// NFL GM: a camp for prospects outside the top 64
function pcampStore() { const L = PS(); if (!L.pcamp || L.pcamp.yr !== (L.dc && L.dc.yr)) L.pcamp = { yr: L.dc ? L.dc.yr : 0, inv: [], done: false, res: {} }; return L.pcamp; }
function pcampOk() { const L = PS(); return !!(isGM() && L.dc && !(L.draft && L.draft.done)); }
function pcampInvite(pid) { if (!pcampOk()) return null; const C = pcampStore(); if (C.done) return 'done'; const p = PS().dc.list.find(x => x.id === pid); if (!p || p.taken || p.cr <= 64) return null; const i = C.inv.indexOf(pid); if (i >= 0) { C.inv.splice(i, 1); return 'out'; } if (C.inv.length >= PCAMP_MAX) return 'full'; C.inv.push(pid); return 'in'; }
function pcampRun() { if (!pcampOk()) return null; const C = pcampStore(); if (C.done || !C.inv.length) return null; C.inv.forEach(pid => { const p = PS().dc.list.find(x => x.id === pid); if (!p) return; p.sc = 3; p.camp = true; const k = 'pcamp:' + state.seed + ':' + pid; C.res[pid] = { n: p.n, pos: p.pos, ovr: p.ovr, pot: p.pot, f: forty(p.pos, (p.ovr + p.pot) / 2, k) }; }); C.done = true; return C; }

/* ===================== IDEA-07: eras and league evolution ===================== */
// Over a long save the sport changes around you. Every six to eight seasons a new era begins: a TV-money boom, a
// bigger playoff, a realignment wave or a rules change. In Commissioner mode you make those calls yourself, and
// your biggest ones are recorded as the eras of your league. New saves have eras on; older saves keep their rules
// fixed until you turn eras on in League rules. Every era is kept in a list (League history and the History hall).
const erasOn = () => !!(state && state.settings && state.settings.eras === 'on');
function erasList() { return state.eras || (state.eras = []); }
function eraAdd(k, txt) { erasList().push({ s: state.season + (state.phase === 'offseason' ? 1 : 0), k, txt }); addNews(`A new era: ${txt}`, 'big'); }
const ERA_N = { tv: 'TV money', playoff: 'Playoff expansion', realign: 'Realignment', rules: 'Rules change', comm: 'Your league' };
function eraTick() {
  if (!erasOn() || isComm()) return null; if (state.eraNext == null) state.eraNext = state.season + 6 + Math.floor(hmix('era0:' + state.seed) * 3); if (state.season + 1 < state.eraNext) return null;
  const nfl = isPro(); const r = rules(); const opts = nfl ? ['tv', r.nflSeeds < 7 ? 'playoff' : null, r.otNfl !== 'nfl' ? 'rules' : 'tv'].filter(Boolean) : ['tv', r.cfp < 16 ? 'playoff' : null, 'realign', r.injuries !== 'low' ? 'rules' : null].filter(Boolean);
  const lastK = (erasList().filter(e => e.k !== 'comm').slice(-1)[0] || {}).k; const pool = opts.length > 1 ? opts.filter(x => x !== lastK) : opts; /* never the same kind of era twice in a row */
  const k = pool[Math.floor(hmix('era:' + state.seed + ':' + state.season) * pool.length)]; const ny = state.season + 1;
  if (k === 'tv') { if (nfl) { const st = state.settings.rules; const c = proCap(ny); st.capA = { yr: ny, cap: r1(c * 1.08) }; eraAdd('tv', `a new TV deal lifts the ${ny} salary cap to ${fmM(st.capA.cap)} (+8%).`); } else { const add = r1(3 * (typeof econ === 'function' ? econ() : 1)); state.mediaBonus = r1((state.mediaBonus || 0) + add); eraAdd('tv', `a new media-rights era: conference TV money rises by $${add}M a year.`); } }
  else if (k === 'playoff') { if (nfl) { setRule('nflSeeds', 7); eraAdd('playoff', 'the NFL playoffs grow to seven teams a conference.'); } else { const to = r.cfp < 14 ? 14 : 16; setRule('cfp', to); eraAdd('playoff', `the College Football Playoff grows to ${to} teams.`); } }
  else if (k === 'rules') { if (nfl) { setRule('otNfl', 'nfl'); eraAdd('rules', 'the league adopts overtime where both teams get the ball.'); } else { setRule('injuries', 'low'); eraAdd('rules', 'new player-safety rules: fewer injuries across college football.'); } }
  else if (k === 'realign') { const g6 = Object.values(state.teams).filter(t => CONFS[t.conf] && !CONFS[t.conf].p4 && t.id !== 'ND' && t.id !== ME && t.rating >= 60).sort((a, b) => b.rating - a.rating).slice(0, 3); const P4 = Object.keys(CONFS).filter(c => CONFS[c].p4);
    if (g6.length && P4.length) { g6.forEach((t, i) => { const to = P4[Math.floor(hmix('erar:' + state.seed + ':' + state.season + ':' + i) * P4.length)]; const from = t.conf; t.conf = to; state.confMoves = (state.confMoves || []).concat([{ s: ny, id: t.id, from, to }]); }); rebuildConfs(); eraAdd('realign', `a realignment wave: ${g6.map(t => t.name).join(', ')} join power conferences.`); } else return null; }
  state.eraNext = ny + 6 + Math.floor(hmix('eran:' + state.seed + ':' + ny) * 3); return k;
}
{
  const _xo = xOffseason; xOffseason = function () { _xo.apply(this, arguments); try { eraTick(); } catch (e) { if (typeof console !== 'undefined') console.error('eras', e); } };
  // Commissioner: your biggest decisions become the eras of your league
  const _cr = cmResolve; cmResolve = function (id, k, auto) { const it = cm2().items.find(x => x.id === id); const r = _cr.apply(this, arguments);
    try { if (it && r != null && ['tvdeal', 'cba', 'cba2', 'req'].includes(it.kind) || (it && it.kind === 'prop' && /passes|adopted|approved/i.test(String(r)))) { const o = (it.opts || []).find(x => x[0] === k); erasList().push({ s: state.season + 1, k: 'comm', txt: `${it.title}: ${o ? o[1] : k}` }); } } catch (e) { }
    return r; };
}

/* ===================== IDEA-05: a shared world across modes ===================== */
// The modes now share one small register on this device ("fe-world"): your Player Career player, your Coach-mode
// coach and your Commissioner league's rules. Saves with "Shared world" on (new saves) draw on it going forward:
//  - AD, Coach and GM hiring pools can include your Coach-mode coach;
//  - an AD recruiting class can include your Player Career player in his senior year of high school;
//  - an NFL draft class can include him when his college years are up;
//  - any save can adopt the rules of your Commissioner league.
// Nothing already in a save is changed, the register holds only names, positions, ratings and teams, and a save
// with "Shared world" off never reads it.
const WORLD_KEY = 'fe-world';
function worldGet() { try { const w = JSON.parse(lsGet(WORLD_KEY) || '{}') || {}; w.players = w.players || {}; w.coaches = w.coaches || {}; return w; } catch (e) { return { players: {}, coaches: {} }; } }
function worldPut(w) { const trim = o => { const e = Object.entries(o).sort((a, b) => (b[1].t || 0) - (a[1].t || 0)).slice(0, 8); return Object.fromEntries(e); }; w.players = trim(w.players); w.coaches = trim(w.coaches); lsSet(WORLD_KEY, JSON.stringify(w)); }
const worldOn = () => !!(state && state.settings && state.settings.world === 'on');
function worldNoteCareer() { try { if (!cs || !cs.p || !cs.p.pos) return; const p = cs.p; const w = worldGet(); const colYrs = cs.col ? cs.col.years || 1 : 0;
  w.players['pc:' + cs.seed] = { n: cName(p), pos: p.pos, lvl: cs.lvl, y: cs.year, hsCls: cs.hs ? cs.hs.cls : null, stars: p.stars || 3, ovr: cOvr(p), pot: Math.max(cOvr(p), p.ceil || cOvr(p) + 6), col: cs.col ? cTeamName(cs.col.tid) : '', draftY: cs.lvl === 'col' ? cs.year + Math.max(1, 4 - colYrs) : null, done: ['retired', 'done'].includes(cs.phase) || !!cs.nfl, t: Date.now() }; worldPut(w); } catch (e) { } }
function worldNoteAD() { try { if (!state || !state.season) return; const w = worldGet(); let ch = false;
  if (isCoach() && state.co && state.co.name) { w.coaches['co:' + state.seed] = { n: state.co.name, role: state.co.role, rep: state.co.rep, lvl: isPro() ? 'nfl' : 'col', tm: ME, y: state.season, t: Date.now() }; ch = true; }
  if (isComm()) { const r = rules(); w.rules = { cfp: r.cfp, otCol: r.otCol, otNfl: r.otNfl, nflSeeds: r.nflSeeds, roster: r.roster, proRoster: r.proRoster, injuries: r.injuries, capGrow: r.capGrow, lvl: isPro() ? 'nfl' : 'col', y: state.season, t: Date.now() }; ch = true; }
  if (ch) worldPut(w); } catch (e) { } }
{
  const _cs = cSave; cSave = function () { const r = _cs.apply(this, arguments); worldNoteCareer(); return r; };
  const _sv = save; save = function () { const r = _sv.apply(this, arguments); if (typeof appMode === 'undefined' || appMode !== 'career') worldNoteAD(); return r; };
  // hiring pools: your Coach-mode coach can be a candidate (never the coach you are playing right now)
  const _gc = genCandidates; genCandidates = function (role, n) {
    const out = _gc.apply(this, arguments); try { if (!worldOn() || isComm() || !out.length) return out; const me = isCoach() && state.co ? 'co:' + state.seed : null; const W = Object.entries(worldGet().coaches).filter(([id, c]) => id !== me && (role === 'HC' ? ['HC', 'OC', 'DC'].includes(c.role) : role === c.role || ['OC', 'DC'].includes(role) && ['OC', 'DC', 'HC'].includes(c.role)));
      const taken = new Set(Object.values(state.staff || {}).filter(Boolean).map(c => c.name).concat(Object.values(state.cands || {}).flat().map(c => c.name))); const pick = W.find(([, c]) => !taken.has(c.n)); if (!pick) return out;
      const [wid, c] = pick; const x = out[out.length - 1]; const b = clamp(Math.round(62 + (c.rep || 50) * 0.32), 66, 92); x.name = c.n; x.bg = `Your Coach-mode coach (${ROLE_TITLE[c.role] || c.role}${c.tm ? ', ' + (c.lvl === 'nfl' ? nflName(c.tm) : (CTEAMS0_AD[c.tm] || {}).name || c.tm) : ''})`; x.world = wid;
      ['off', 'def', 'rec', 'dev', 'gm', 'ovr'].forEach(k => { if (x[k] != null) x[k] = clamp(b + Math.round((hmix(wid + k) - 0.5) * 8), 55, 95); }); } catch (e) { } return out; };
  // recruiting: your Player Career player, in his senior year, shows up on the board
  const _gr = genRecruitClass; genRecruitClass = function () { const r = _gr.apply(this, arguments); try { if (!worldOn() || !state.rec) return r; Object.entries(worldGet().players).forEach(([wid, p]) => { if (p.lvl !== 'hs' || p.hsCls == null || p.done) return; const cls = p.y + (3 - p.hsCls) + 1; if (cls !== state.rec.cls || state.rec.list.some(x => x.world === wid)) return; const town = recruitTown(TEAM_STATE[ME]); const b = genBody(p.pos);
    const rec = { id: 'rw' + Math.floor(hmix(wid) * 1e6), n: p.n, pos: p.pos, star: clamp(p.stars, 2, 5), ovr: p.ovr, pot: p.pot, home: town[0], inState: false, ht: b.ht, wt: b.wt, status: 'open', offered: false, visit: null, nil: 0, ask: 0, lead: [], trend: 0, to: null, world: wid }; rec.interest = baseInterest(rec); state.rec.list.push(rec); }); } catch (e) { } return r; };
  // the draft: when his college years are up, he is in the class
  const _gd = genDraftClass; genDraftClass = function (yr) { const D = _gd.apply(this, arguments); try { if (!worldOn() || !D || !D.list) return D; Object.entries(worldGet().players).forEach(([wid, p]) => { if (p.lvl !== 'col' || p.draftY !== yr || p.done || D.list.some(x => x.world === wid)) return;
    D.list.push({ id: 'dw' + yr + '_' + Math.floor(hmix(wid) * 1e6), n: p.n, pos: p.pos, age: 22, ovr: p.ovr, pot: p.pot, col: p.col || 'College', sc: 0, bias: 0, pbias: 0, hype: 1, world: wid }); });
    const cv = p => p.ovr * 0.55 + p.pot * 0.45 + p.hype + (PRO_POS_W[p.pos] - 1) * 8; D.list.sort((a, b) => cv(b) - cv(a)); D.list.forEach((p, i) => { p.cr = i + 1; }); } catch (e) { } return D; };
}
function worldRulesAdopt() { const R_ = worldGet().rules; if (!R_ || !state || isComm()) return false; ['cfp', 'otCol', 'otNfl', 'nflSeeds', 'roster', 'proRoster', 'injuries', 'capGrow'].forEach(k => { if (R_[k] != null) setRule(k, R_[k]); }); return true; }

/* ===================== BAL-14 (rest): a coach's week has limited hours ===================== */
// Updated balance, Coach mode: road trips, player meetings, home visits, install walkthroughs and game-plan
// packages all come out of one week of about 30 working hours. What you don't get to, your staff handles the usual
// way. Each part keeps its own limit too.
const CO_HOURS = 30;
const CO_COST = { trip: 6, meet: 2, hv: 3, inst: 3, gp: 1 };
const coHoursOn = () => typeof isCoach === 'function' && isCoach() && balOn() && state.phase !== 'offseason';
function coHoursUsed() {
  let h = 0; try { const t = state.co && state.co.travel; if (t && typeof travelKey === 'function' && t.key === travelKey()) h += t.used * CO_COST.trip; } catch (e) { }
  try { const x = state.x || {}; const key = state.season + ':' + state.week; if (x.mtg && x.mtg.key === key) h += x.mtg.used * CO_COST.meet; if (x.hv && x.hv.key === key) h += x.hv.used * CO_COST.hv; if (x.prac) h += (x.prac.inst || 0) * CO_COST.inst; const g = typeof prepNext === 'function' ? prepNext() : null; if (g && typeof gpCur === 'function') h += gpCur(g).reduce((s, k) => s + GP_ITEMS[k][1], 0) * CO_COST.gp; } catch (e) { }
  return h;
}
const coHoursLeft = () => CO_HOURS - coHoursUsed();
const coNoTime = c => coHoursOn() && coHoursLeft() < c;
const CO_NOTIME = 'No hours left this week. Your staff handles the rest.';
{
  const _th = tripHome; tripHome = function () { if (coNoTime(CO_COST.trip)) return null; return _th.apply(this, arguments); };
  const _tw = tripWatch; tripWatch = function () { if (coNoTime(CO_COST.trip)) return null; return _tw.apply(this, arguments); };
  const _mm = mtgMeet; mtgMeet = function () { if (coNoTime(CO_COST.meet)) return { ok: false, txt: CO_NOTIME }; return _mm.apply(this, arguments); };
  const _hv = hvVisit; hvVisit = function () { if (coNoTime(CO_COST.hv)) return { ok: false, txt: CO_NOTIME }; return _hv.apply(this, arguments); };
  const _ps = pracSet; pracSet = function (k, v) { if (k === 'inst' && coHoursOn()) { const cur = pracStore().inst || 0; if (+v > cur && coHoursLeft() < (+v - cur) * CO_COST.inst) return false; } return _ps.apply(this, arguments); };
  const _gs = gpSet; gpSet = function (k) { if (coHoursOn() && GP_ITEMS[k] && !gpCur(prepNext()).includes(k) && coHoursLeft() < GP_ITEMS[k][1] * CO_COST.gp) return 'hours'; return _gs.apply(this, arguments); };
}

