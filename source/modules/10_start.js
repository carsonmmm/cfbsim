
/* ---------- getting a club: buy one, start one, inherit one ---------- */
// Building the world happens before the club is chosen, so prices and records are real. The owner's club starts
// as a placeholder (the first club in the list) until the sale or the expansion goes through.
function ownWorld(o) {
  newGame(o.diff || 'normal', null, o.seed != null ? o.seed : null, 'MICH');
  const ph = NFL[Math.floor(hash(String(state.seed) + ':ownph') * NFL.length)].id;
  goPro(ph, { role: 'gm' }); state.kind = 'owner'; state.tline = []; state.news = [];
  PS().gm = null; state.settings.noFire = true;
  state.own = ownNew({ name: o.name, gm: o.gm, path: 'buy', tid: ph, cash: o.cash, scen: o.scen });
  state.own.pending = true; // not an owner yet
  if (o.fame) { state.own.rep = clamp(50 + o.fame.rep, 30, 75); state.own.fame = o.fame; }
  return ph;
}
// clubs on the market: a struggling small-market club, a contender, a club with an old stadium and one more
function ownMarket() {
  const o = OWN(); if (o.mkt0) return o.mkt0; const ids = NFL.map(t => t.id); const h = k => ownH('mk:' + k);
  const by = f => ids.slice().sort((a, b) => f(a) - f(b));
  const small = o.scen === 'worst' ? by(id => T(id).rating + ownProf(id).mkt * 1.5)[0] : by(id => ownProf(id).mkt * 4 + T(id).rating)[Math.floor(h('s') * 3)];
  const contender = by(id => -T(id).rating).filter(id => id !== small)[Math.floor(h('c') * 4)];
  const oldSt = by(id => -ownProf(id).age).filter(id => ![small, contender].includes(id))[Math.floor(h('o') * 4)];
  const rest = ids.filter(id => ![small, contender, oldSt].includes(id)); const other = rest[Math.floor(h('r') * rest.length)];
  const story = { [small]: 'The family that has owned the club for decades wants out. A smaller market and a cheaper price.', [contender]: 'A contender, sold to settle an estate. The roster is ready to win now, and so are the other bidders.', [oldSt]: 'The stadium is one of the oldest in the league and the lease runs out soon. Whoever buys this club inherits a stadium fight.', [other]: 'The owner is cashing out. A middle-of-the-road club in a solid market.' };
  o.mkt0 = [small, contender, oldSt, other].map((id, i) => { const v = ownClubVal(id); return { tid: id, ask: r1(v * (0.97 + h('a' + i) * 0.08) * (i === 0 ? 0.92 : 1)), val: v, story: story[id], bidders: 1 + Math.floor(h('b' + i) * (i === 1 ? 3 : 2.4)), hot: i === 1 }; });
  return o.mkt0;
}
// is this financing allowed? (the controlling owner holds at least 30% of the equity)
function ownFinCheck(price, debt, mine) {
  const o = OWN(); const lim = ownDebtLimit(); price = +price; debt = +debt; mine = +mine;
  if (!(price > 0)) return { err: 'Enter a price.' }; if (debt < 0 || debt > lim) return { err: `Debt has to be between $0 and the league limit of ${fmO(lim)}.` };
  const eq = price - debt; if (eq <= 0) return { err: 'The club can\'t be paid for entirely with debt.' };
  if (mine > o.cash) return { err: `You only have ${fmO(o.cash)}.` }; if (mine < eq * 0.3) return { err: `The league requires the controlling owner to put in at least 30% of the equity: ${fmO(eq * 0.3)}.` };
  const pct = Math.min(1, mine / eq); const partners = pct >= 0.995 ? 0 : Math.max(1, Math.ceil((1 - pct) / 0.12));
  return { ok: true, eq: r1(eq), pct, partners, left: r1(o.cash - mine) };
}
// the sale: rival groups bid what the club is worth to them; a second round lets you raise once
function ownBid(tid, bid, round) {
  const o = OWN(); const m = ownMarket().find(x => x.tid === tid); if (!m) return { err: 'That club is not for sale.' };
  if (bid < m.ask * 0.9) return { res: 'low', txt: `The seller won't consider less than about ${fmO(m.ask * 0.9)}.` };
  const rivals = Array.from({ length: m.bidders }, (_, i) => r1(m.ask * (0.94 + ownH('rb:' + tid + ':' + i) * (m.hot ? 0.17 : 0.12))));
  const top = Math.max(...rivals);
  if (bid >= top) return { res: 'won', top, price: r1(Math.max(bid * 0.985, Math.min(bid, top + 25))) };
  if (!round) return { res: 'outbid', top, txt: `Another group bid more. The seller asks everyone for a best and final offer.` };
  return { res: 'lost', top, txt: `The club goes to another group at about ${fmO(top)}.` };
}
// the owners vote: 24 yes votes needed. Each owner weighs your stake, your debt and your reputation.
function ownVote(kind, data) {
  const o = OWN(); const n = NFL.length - 1; const need = Math.ceil(NFL.length * 0.75); const D = ownDiff();
  let p = 0.86 + D.vote + (o.rep - 50) / 220 + (o.comm - 55) / 400 + (o.favors || 0) * 0.012;
  if (kind === 'buy' || kind === 'exp') { p += (data.pct - 0.3) * 0.12 - (data.debt / ownDebtLimit()) * 0.1 - (data.partners > 6 ? 0.05 : 0); }
  if (kind === 'exp') p += 0.03;
  if (kind === 'reloc') p = 0.58 + D.vote + (o.rep - 50) / 160 + (o.comm - 55) / 250 + (o.favors || 0) * 0.025 + (data.up || 0) - (o.relocTries || 0) * 0.06;
  if (kind === 'heir' || kind === 'control') p += 0.08;
  p = clamp(p, 0.05, 0.97); let yes = 0; const key = kind + ':' + state.season + ':' + (data.key || '') + ':' + (o.voteN = (o.voteN || 0) + 1);
  const ids = Object.keys(ownOwners()); ids.forEach(tid => { const w = OWN().owners[tid]; if (ownH('v:' + key + ':' + tid) < clamp(p + (w.rel - 50) / 220 - (w.grudge ? 0.2 : 0) + (kind === 'reloc' && w.style === 'old' ? -0.1 : 0), 0.03, 0.98)) yes++; });
  const n2 = ids.length; return { yes, no: n2 - yes, need, ok: yes >= need, p };
  return { yes, no: n - yes, need, ok: yes >= need, p };
}
// the sale closes: you become the owner
function ownCloseBuy(tid, price, debt, mine) {
  const o = OWN(); const f = ownFinCheck(price, debt, mine); if (!f.ok) return f;
  if (tid !== ME) goPro(tid, { role: 'gm' }); PS().gm = null;
  const keep = { name: o.name, gm: o.gm, scen: o.scen, fame: o.fame, rep: o.rep };
  const n = ownNew({ name: keep.name, gm: keep.gm, path: 'buy', tid, pct: f.pct, debt, cash: o.cash - mine, val: ownClubVal(tid), bank: r1(60 + ownProf(tid).mkt * 8), scen: keep.scen });
  n.rep = keep.rep; n.fame = keep.fame; n.paid = r1(mine); n.price = r1(price); n.partners = f.partners; state.own = n; ownStadName(); ownInitClub();
  ownLog(`${o.name} buys the ${myName()} for ${fmO(price)}${f.partners ? ` with ${f.partners} minority partner${f.partners > 1 ? 's' : ''}` : ''}. The owners approved the sale.`, 'big');
  return { ok: true };
}
function ownStadName() { const o = OWN(); const t = T(ME); if (!o.stad.name) o.stad.name = (o.stad.temp ? (t.city || 'City') + ' Memorial Stadium' : (t.city || 'City') + ' Stadium'); }
// first-season setup: the football side follows your choice of GM
function ownInitClub() {
  const o = OWN(); const A = autoSet();
  if (o.gm === 'hire') { ['plan', 'depth', 'staff', 'resign', 'fa', 'draft', 'cuts', 'scout'].forEach(k => { A[k] = true; }); o.gmP = ownGenGM(1)[0]; o.gmP.rel = 62; o.gmP.hired = state.season + 1; PS().aigm = { name: o.gmP.name, rel: o.gmP.rel }; PS().gmName = o.gmP.name; }
  else { o.gmP = null; }
  state.settings.ask = o.gm === 'self' ? state.settings.ask : false;
  o.ytd = ownYtd(); o.valHist = [{ s: state.season, v: o.val }]; PS().chg = null; proRate(ME); PS().expW = proExpWins();
  ownGoalsInit();
}

/* ---------- expansion ---------- */
const OWN_EXP_FEE = () => r1(5200 * ownG());
function ownExpCities() { const used = new Set((state.lgx && state.lgx.add || []).map(t => t.city)); return OWN_CITIES.filter(c => !used.has(c.city)); }
// adds a club to the league without stocking it (the expansion draft does that)
function ownAddClub(o) {
  const city = String(o.city).slice(0, 24), nick = String(o.nick).slice(0, 20); const id = nflAbbr(city);
  const t = { id, name: city + ' ' + nick, city, nick, conf: o.conf, div: o.div, c1: o.c1 || '#334455', c2: o.c2 || '#dddddd', p: 66, exp: state.season + 1 };
  const E = state.lgx || (state.lgx = { add: [], gone: [], log: [] }); E.add.push(t); nflLeagueSync();
  const r = lrng(state.seed + ':xexp:' + id); const p = 66;
  state.teams[id] = { id, name: t.name, nick, city, conf: t.conf, div: t.div, rating: p, off: p, def: p, st: p, elo: 1360, w: 0, l: 0, pf: 0, pa: 0, dw: 0, dl: 0, cw: 0, cl: 0, style: genStyle(), coach: '', hist: [], pow: p };
  PS().rost[id] = []; PS().aistaff[id] = genAiStaff(id, p, r); state.teams[id].coach = PS().aistaff[id].hc.name; if (PS().dead) PS().dead[id] = PS().dead[id] || [];
  const yrs = [...new Set(PS().picks.map(k => k.yr))]; yrs.forEach(yr => { for (let rd = 1; rd <= PRO_ROUNDS; rd++) PS().picks.push({ yr, rd, orig: id, own: id }); });
  E.log.unshift({ s: state.season, k: 'add', id, name: t.name, picks: [] });
  return id;
}
// the other new club joins the other conference, in its smallest division
function ownPartnerClub(myConf) {
  const conf = myConf === 'AFC' ? 'NFC' : 'AFC'; const div = NFL_DIVS.slice().sort((a, b) => NFL.filter(t => t.conf === conf && t.div === a).length - NFL.filter(t => t.conf === conf && t.div === b).length)[0];
  const c = ownExpCities().filter(x => x.city !== OWN().expCity)[Math.floor(ownH('pc') * 6)] || ownExpCities()[0];
  const NICKS = ['Stallions', 'Pioneers', 'Express', 'Mariners', 'Thunder', 'Outlaws', 'Hawks', 'Guardians', 'Rangers', 'Admirals'];
  const COLS = [['#123b6d', '#f2b134'], ['#5a1e2a', '#c9a76b'], ['#0f5a46', '#e9e3d0'], ['#2c2c34', '#e45d2b'], ['#3a2a6b', '#9ad0ec']];
  const cc = ownPick(COLS, 'pcc'); return ownAddClub({ city: c.city, nick: ownPick(NICKS, 'pcn'), conf, div, c1: cc[0], c2: cc[1] });
}
// the expansion draft: every club protects its best 42; new clubs take at most two from any club, 26 in all, taking turns
function ownXdInit(me, partner) {
  const val = p => p.ovr + Math.max(0, 28 - (p.age || 28)) * 1.2 - (p.k && p.k.yrs > 0 ? capHit(p) : 0) * 0.18; const pool = [];
  NFL.forEach(t => { if (t.id === me || t.id === partner || t.id === ME) return; const ros = proRoster(t.id).slice().sort((a, b) => val(b) - val(a)); ros.slice(37).filter(p => p.k && p.k.yrs > 0).forEach(p => pool.push({ id: p.id, from: t.id, v: r1(p.ovr + Math.max(0, 27 - (p.age || 28))) })); });
  pool.sort((a, b) => b.v - a.v);
  OWN().xd = { me, partner, pool: pool.slice(0, 260), mine: [], theirs: [], taken: {}, done: false, n: 30 };
}
function ownXdPlayer(e) { if (e.from === ME) return P(e.id); return (PS().rost[e.from] || []).find(p => p.id === e.id) || null; }
function ownXdOk(club, e) { const X_ = OWN().xd; const k = club + ':' + e.from; return !e.gone && (X_.taken[k] || 0) < 2; }
function ownXdTake(club, e) {
  const X_ = OWN().xd; const p = ownXdPlayer(e); if (!p) { e.gone = true; return false; }
  PS().rost[e.from] = PS().rost[e.from].filter(x => x !== p); p.tm = club; PS().rost[club].push(p); e.gone = true;
  X_.taken[club + ':' + e.from] = (X_.taken[club + ':' + e.from] || 0) + 1; (club === X_.me ? X_.mine : X_.theirs).push({ n: p.n, pos: p.pos, ovr: p.ovr, age: p.age, from: e.from, id: p.id });
  return true;
}
// your pick, then the other new club's pick
function ownXdPick(pid) {
  const X_ = OWN().xd; if (!X_ || X_.done) return { err: 'The expansion draft is over.' }; const e = X_.pool.find(x => x.id === pid);
  if (!e || !ownXdOk(X_.me, e)) return { err: 'You can\'t take that player (each club loses at most two).' };
  ownXdTake(X_.me, e); ownXdAi(); if (X_.mine.length >= X_.n) ownXdFinish(); return { ok: true };
}
function ownXdAi() { const X_ = OWN().xd; if (X_.theirs.length >= X_.n) return; const e = X_.pool.find(x => ownXdOk(X_.partner, x)); if (e) ownXdTake(X_.partner, e); }
function ownXdAuto() {
  const X_ = OWN().xd; let guard = 0;
  while (X_ && !X_.done && X_.mine.length < X_.n && guard++ < 80) {
    const need = POS_ORDER.map(pos => [pos, X_.mine.filter(m => m.pos === pos).length / (PRO_ROSTER[pos] || 1)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    const e = X_.pool.find(x => ownXdOk(X_.me, x) && need.slice(0, 6).includes((ownXdPlayer(x) || {}).pos)) || X_.pool.find(x => ownXdOk(X_.me, x));
    if (!e) break; ownXdTake(X_.me, e); ownXdAi();
  }
  ownXdFinish();
}
function ownXdFinish() {
  const X_ = OWN().xd; if (!X_ || X_.done) return; while (X_.theirs.length < X_.n) { const b = X_.theirs.length; ownXdAi(); if (X_.theirs.length === b) break; } X_.done = true;
  [X_.me, X_.partner].forEach(id => { fillRosterPro(id); proRate(id); }); const L = PS();
  if (L.order && !(L.draft && L.draft.done)) { L.order = L.order.filter(x => x !== X_.me && x !== X_.partner); L.order.unshift(X_.me, X_.partner); }
  const E = state.lgx; E.log.forEach(l => { if (l.id === X_.me) l.picks = X_.mine.slice(0, 25); if (l.id === X_.partner) l.picks = X_.theirs.slice(0, 25); });
}
// the expansion club is yours: you take it over once its roster is stocked
function ownCloseExp(f) {
  const o = OWN(); const X_ = o.xd; const id = X_.me; const keep = { name: o.name, gm: o.gm, scen: o.scen, fame: o.fame, rep: o.rep, city: o.expCity, logo: o.logo };
  goPro(id, { role: 'gm' }); PS().gm = null; const c = ownCity(keep.city) || { mkt: 5, wealth: 5, passion: 6, stad: 'none' };
  const n = ownNew({ name: keep.name, gm: keep.gm, path: 'exp', tid: id, pct: f.pct, debt: f.debt, cash: f.cash, val: r1(f.fee * 0.98), bank: 150, scen: keep.scen });
  n.rep = keep.rep; n.fame = keep.fame; n.paid = r1(f.mine); n.price = f.fee; n.partners = f.partners; n.logo = keep.logo; n.xd = X_; n.expCity = keep.city;
  n.mkt = c.mkt; n.brand = clamp(40 + c.passion * 3 + c.wealth, 40, 75); n.cityRel = 70; n.newShare = state.season + 4; state.meters.fan = 72;
  n.biz.price = ownDefPrice(c.mkt); n.biz.wait = Math.round(4000 + c.passion * 1500);
  if (c.stad === 'none') Object.assign(n.stad, { temp: true, cap: 46000, suites: 24, club: 2500, roof: 'o', age: 40, qual: 52, rent: 14, name: '' });
  else if (c.stad === 'college') Object.assign(n.stad, { temp: true, cap: 62000, suites: 40, club: 4000, roof: 'o', age: 35, qual: 60, rent: 18, name: '' });
  else Object.assign(n.stad, { temp: false, cap: 64000, suites: 90, club: 5500, roof: 'd', age: 30, qual: 62, rent: 0, name: '' });
  state.own = n; ownStadName(); ownInitClub();
  ownLog(`The ${myName()} are born. ${keep.name} paid an expansion fee of ${fmO(f.fee)}, and the club's first 30 players came in the expansion draft.`, 'big');
  if (typeof feedBiz === 'function') feedBiz(`The ${myName()} are coming. Expansion!`);
  return { ok: true };
}
// a club passed down in the family, with the debt that came with it
function ownInherit() {
  const o = OWN(); const ids = NFL.map(t => t.id).filter(id => ownProf(id).mkt >= 4 && ownProf(id).mkt <= 7 && ownProf(id).age >= 20); const tid = ids[Math.floor(ownH('inh') * ids.length)] || NFL[0].id;
  if (tid !== ME) goPro(tid, { role: 'gm' }); PS().gm = null; const keep = { name: o.name, gm: o.gm, fame: o.fame, rep: o.rep };
  const v = ownClubVal(tid); const n = ownNew({ name: keep.name, gm: keep.gm, path: 'family', tid, pct: 0.51, debt: r1(ownDebtLimit() * 0.94), cash: r1(ownDiff().cash * 0.22), val: v, bank: 15, scen: 'family' });
  n.rep = keep.rep - 4; n.partners = 3; n.price = 0; n.paid = 0; n.stad.qual = clamp(n.stad.qual - 8, 40, 90); state.own = n; ownStadName(); ownInitClub();
  ownLog(`${keep.name} takes over the ${myName()} from the family estate: 51% of the club, a stadium that needs work, and ${fmO(n.debt)} of debt.`, 'big');
  return { ok: true };
}
// a former player or executive starts as a minority partner, with a deal to take control after one season
function ownPartnerStart(tid) {
  const o = OWN(); if (tid !== ME) goPro(tid, { role: 'gm' }); PS().gm = null; const keep = { name: o.name, fame: o.fame, rep: o.rep, cash: o.cash };
  const v = ownClubVal(tid); const n = ownNew({ name: keep.name, gm: 'hire', path: 'partner', tid, pct: 0.1, debt: r1(500 + ownH('pd') * 400), cash: r1(keep.cash), val: v, bank: 90 });
  n.rep = keep.rep; n.fame = keep.fame; n.price = 0; n.paid = r1((v - n.debt) * 0.1); n.cash = r1(n.cash - n.paid);
  n.partner = { seller: ownName('sell'), price: r1(v * 1.04), yrs: 1 }; state.own = n; ownStadName(); ownInitClub();
  ownLog(`${keep.name} buys 10% of the ${myName()}. The controlling owner, ${n.partner.seller}, has agreed to sell you control after the season if your group can pay ${fmO(n.partner.price)}.`, 'big');
  return { ok: true };
}
// what a past career brings: savings, an investor group that wants your name on the club, and standing
function ownFameFrom(src) {
  if (!src) return null;
  if (src.k === 'pc') { const ovr = +src.ovr || 70; return { k: 'pc', name: src.name, txt: `former ${src.pos || 'player'} ${src.name}`, cash: r1(1400 + Math.max(0, ovr - 70) * 45), rep: Math.round(Math.max(0, ovr - 75) / 2) }; }
  if (src.k === 'gm') { const lg = +src.legacy || 50; return { k: 'gm', name: src.name, txt: `the former executive of the ${src.team}`, cash: r1(1300 + Math.max(0, lg - 50) * 25), rep: Math.round((lg - 50) / 4) }; }
  return null;
}
function ownPastCareers() {
  const out = []; try { const cm = cMeta(); Object.keys(cm).forEach(i => { const m = cm[i]; if (m && m.name && lsGet(CSLOT_KEY(i))) out.push({ k: 'pc', i, name: m.name, pos: m.pos, ovr: m.ovr, done: m.done, txt: `${m.name} · ${m.pos} · ${m.done ? 'retired' : m.team || ''}` }); }); } catch (e) { }
  try { const am = slotsMetaOf('ad'); Object.keys(am).forEach(i => { const m = am[i]; if (m && m.lvl === 'nfl' && m.gm && !m.comm && !m.own && lsGet(SLOT_KEY(+i))) out.push({ k: 'gm', i, name: 'GM', team: m.name, legacy: m.legacy, txt: `GM of the ${m.name} · ${m.seasons} season${m.seasons === 1 ? '' : 's'} · reputation ${m.legacy}` }); }); } catch (e) { }
  return out;
}
