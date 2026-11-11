/* ===================== OWNER MODE (v9.48): the engine core =====================
 * Owner mode runs an NFL club from the owner's suite. It is an NFL save (state.lvl = 'nfl') with
 * state.kind = 'owner' and the owner's data in state.own. The football side runs on the GM engine:
 * either you also act as your own GM (own.gm = 'self', every GM tool works), or a GM you hire makes
 * the football calls (own.gm = 'hire') and the computer-GM paths that Coach mode uses run the club.
 * Money is in $M. Everything random goes through ownH() so the season's random stream is untouched.
 * Saves live in the AD save slots, marked own: true in the slot summary. */
// your club's detailed NFL game sim ran ahead of its own pregame odds; this lines them up (Updated balance)
var NFL_ME_CAL = 1.3;
function isOwner() { return !!(typeof state !== 'undefined' && state && state.kind === 'owner' && state.own); }
function ownSelfGM() { return isOwner() && state.own.gm === 'self'; }
function ownHands() { return isOwner() && state.own.gm !== 'self'; }
// the computer GM runs your club: Coach mode, or an owner who hired a GM
function aiGM() { return isCoach() || ownHands(); }
const OWN = () => state.own;
const ownH = k => hmix(String(state.seed) + ':own:' + k);
const ownPick = (arr, k) => arr[Math.min(arr.length - 1, Math.floor(ownH(k) * arr.length))];
const ownName = k => genNameR(lrng(String(state.seed) + ':nm:' + k));
const fmO = v => { const a = Math.abs(v); const s = v < 0 ? '−' : ''; return a >= 1000 ? `${s}$${(a / 1000).toFixed(a >= 10000 ? 1 : 2)}B` : `${s}$${Math.round(a)}M`; };
const fmMs = v => (v < 0 ? '−' : '') + (Math.abs(v) >= 100 ? '$' + Math.round(Math.abs(v)) + 'M' : Math.abs(v) < 0.005 ? '$0' : fmM(Math.abs(v)));
const pct0 = v => Math.round(v * 100) + '%';

// difficulty: your fortune, what lenders charge, the league's debt limit and how forgiving fans are
const OWN_DIFF = {
  easy: { cash: 5200, rate: 0.05, lim: 1.25, fan: 1.25, vote: 0.06, label: 'Easy' },
  normal: { cash: 3300, rate: 0.06, lim: 1, fan: 1, vote: 0, label: 'Normal' },
  hard: { cash: 2300, rate: 0.075, lim: 0.85, fan: 0.8, vote: -0.05, label: 'Hard' },
};
const ownDiff = () => OWN_DIFF[(state.settings && state.settings.diff) || 'normal'] || OWN_DIFF.normal;

// every club: market size (1-10), stadium age, capacity (thousands), roof (o open, d dome, r retractable), brand
const OWN_PROF = Object.fromEntries(('ARI:6:20:63:r:62 ATL:7:9:71:r:64 BAL:5:28:71:o:72 BUF:3:0:62:o:70 CAR:5:30:74:o:58 CHI:9:22:61:o:80 CIN:4:26:65:o:62 CLE:4:27:67:o:70 DAL:9:17:80:r:92 DEN:6:25:76:o:76 DET:6:24:65:d:66 GB:2:69:81:o:88 HOU:8:24:72:r:62 IND:5:18:67:r:66 JAX:3:31:67:o:52 KC:4:54:76:o:80 LV:5:6:65:d:72 LAC:10:6:70:d:58 LAR:10:6:70:d:70 MIA:7:39:65:o:68 MIN:6:10:66:d:66 NE:8:24:65:o:82 NO:4:51:73:d:66 NYG:10:16:82:o:80 NYJ:10:16:82:o:68 PHI:8:23:69:o:80 PIT:5:25:68:o:86 SF:8:12:68:o:82 SEA:7:24:68:o:72 TB:6:28:65:o:64 TEN:5:27:69:o:56 WAS:8:29:67:o:72')
  .split(' ').map(s => { const [id, mkt, age, cap, roof, brand] = s.split(':'); return [id, { mkt: +mkt, age: +age, cap: +cap * 1000, roof, brand: +brand }]; }));
// warm-weather or covered: what a Super Bowl host needs
const OWN_WARM = new Set(['ARI', 'ATL', 'DAL', 'HOU', 'JAX', 'LV', 'LAC', 'LAR', 'MIA', 'NO', 'TB', 'SF', 'CAR']);

// cities that could take an NFL club: market, local wealth, football passion, an NFL-ready stadium?, warm?, had a club before?
const OWN_CITIES = [
  ['San Antonio', 7, 5, 8, 'none', 1, 0], ['Portland', 6, 6, 5, 'none', 0, 0], ['St. Louis', 6, 5, 7, 'old', 0, 1], ['San Diego', 7, 8, 7, 'none', 1, 1],
  ['Oakland', 7, 7, 7, 'none', 1, 1], ['Salt Lake City', 5, 6, 7, 'college', 0, 0], ['Austin', 6, 8, 8, 'college', 1, 0], ['Columbus', 5, 6, 9, 'college', 0, 0],
  ['Orlando', 6, 6, 7, 'college', 1, 0], ['Sacramento', 5, 6, 5, 'none', 1, 0], ['Oklahoma City', 4, 5, 9, 'none', 0, 0], ['Birmingham', 3, 4, 9, 'college', 1, 0],
  ['Omaha', 3, 5, 8, 'none', 0, 0], ['Virginia Beach', 4, 6, 6, 'none', 0, 0], ['Raleigh', 5, 7, 7, 'college', 0, 0], ['Nashville', 6, 7, 7, 'none', 0, 0],
].map(([city, mkt, wealth, passion, stad, warm, had]) => ({ city, mkt, wealth, passion, stad, warm: !!warm, had: !!had }));
const ownCity = c => OWN_CITIES.find(x => x.city === c) || null;
const OWN_STAD_TXT = { none: 'No NFL-ready stadium', old: 'An empty NFL stadium that needs work', college: 'A big college stadium to rent' };

// growth of league money: the cap's own index, so revenue and payroll move together unless the labor deal changes that
const ownG = yr => { const L = OWN().lg; const base = Math.pow(1.055, Math.max(0, (yr || state.season) - 2026)); return base * (L && L.tvF ? L.tvF : 1); };
const ownProf = id => OWN_PROF[id] || { mkt: 5, age: 20, cap: 65000, roof: 'o', brand: 60 };
const OWN_BUD = { coach: ['Coaching staff', 'Assistants and analysts: a slightly better team on game day.'], med: ['Travel and recovery', 'Charter flights, sleep and recovery staff: fewer injuries.'], fac: ['Training facility', 'Equipment and practice space: young players develop faster.'], scout: ['Scouting', 'More scouts on the road: more looks at draft prospects.'], anal: ['Analytics', 'A data department: your GM makes fewer bad calls on contracts.'] };
const OWN_BUD_COST = [0, 5, 9, 14, 21, 30]; // a season, per level 1-5
const OWN_BUD_LBL = ['', 'Bare bones', 'Below average', 'League average', 'Above average', 'Best in the league'];
const OWN_DIRS = { win: ['Win now', 'Veterans, free agents, and draft picks traded for help.'], bal: ['Balanced', 'Build through the draft, add free agents where it counts.'], build: ['Rebuild', 'Young players and draft picks. Veterans may be traded.'] };
const OWN_STEPS = ['Season review', 'Front office', 'Re-sign players', 'Free agency', 'NFL Draft', 'Training camp'];

// a new owner record. o: { name, gm, path, tid, pct, debt, cash, scen }
function ownNew(o) {
  const tid = o.tid; const pf = ownProf(tid); const D = ownDiff();
  return {
    v: 1, name: o.name || 'You', gen: 1, path: o.path || 'buy', gm: o.gm === 'self' ? 'self' : 'hire', since: state.season + 1, scen: o.scen || null,
    cash: r1(o.cash != null ? o.cash : D.cash), pct: o.pct || 1, debt: r1(o.debt || 0), bank: r1(o.bank != null ? o.bank : 120), rate: D.rate, paid: 0,
    val: r1(o.val || 0), valHist: [], pnl: [], ytd: ownYtd(),
    mkt: pf.mkt, brand: pf.brand, cityRel: 60, rep: 50, comm: 55, favors: 0, meddle: 0, legacy: 0, sb: 0, hof: null,
    biz: { price: ownDefPrice(pf.mkt), conc: 1, pay: 0.5, wait: Math.round(pf.brand * 120), stb: 0.8, pricedAt: null },
    stad: { name: '', cap: pf.cap, suites: Math.round(70 + pf.mkt * 9), club: Math.round(pf.cap * 0.1), roof: pf.roof, age: pf.age, qual: clamp(Math.round(96 - pf.age * 0.9), 45, 96), temp: false, naming: null, proj: [], build: null, rent: 0 },
    bud: { coach: 3, med: 3, fac: 3, scout: 3, anal: 3 }, dir: 'bal', gmP: null, gmLog: [],
    lg: { share: 40, cba: 2030, tv: 2030, tvF: 1, meet: null, hist: [], sbHost: null, draftHost: null, lockout: null, prime: 0 },
    comty: { youth: false, nbhd: false, found: false }, uni: { yr: null, thr: null, alt: false }, logo: null,
    ev: null, evLog: [], log: [], hist: [], goals: [], partner: null, out: null, done: false, relo: null, newShare: 0, ord: [],
  };
}
function ownYtd() { return { gate: 0, conc: 0, park: 0, att: 0, games: 0, pay: 0, poGate: 0, fines: 0, other: 0, otherTxt: [] }; }
const ownDefPrice = mkt => Math.round(95 + mkt * 7);
function ownLog(txt, kind) { const o = OWN(); o.log.unshift({ s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, txt, tm: ME, big: kind === 'big' }); if (o.log.length > 60) o.log.length = 60; addNews(txt, kind); }
function ownCost(amt, why) { const o = OWN(); o.bank = r1(o.bank - amt); o.ytd.other = r1(o.ytd.other + amt); o.ytd.otherTxt.push([why, r1(amt)]); }

/* ---------- the money model ---------- */
// how much people want tickets right now (1 = a sellout at the default price)
function ownDemand() {
  const o = OWN(); const s = o.stad; const t = T(ME) || { w: 0, l: 0 }; const gp = t.w + t.l; const wp = gp ? t.w / gp : 0.5;
  const fresh = s.build && s.build.open === state.season ? 0.06 : 0; const newClub = o.path === 'exp' && state.season <= o.since + 1 ? 0.08 : 0;
  return 0.6 + (state.meters.fan - 50) / 170 + (o.brand - 60) / 280 + (s.qual - 70) / 400 + o.mkt * 0.009 + (wp - 0.5) * 0.25 + fresh + newClub + (s.temp ? -0.04 : 0);
}
function ownFill(price) { const o = OWN(); const d = ownDemand(); const def = ownDefPrice(o.mkt) * ownG(); return clamp(d * Math.pow(def / Math.max(20, price || o.biz.price), 1.2), 0.38, 1); }
// one home game: tickets, concessions, parking ($M)
function ownGate(po) {
  const o = OWN(); const s = o.stad; const fill = ownFill(); const att = Math.round(s.cap * fill); const pr = o.biz.price * (po ? 1.6 : 1);
  return { att, fill, gate: att * pr / 1e6, conc: att * 21 * Math.pow(o.biz.conc, 0.75) * (o.biz.concB || 1) * ownG() / 1e6, park: att * 0.28 * 30 * Math.pow(o.biz.conc, 0.6) * ownG() / 1e6 };
}
// a full season's other revenue lines, from where the club stands now
function ownRevLines(yr) {
  const o = OWN(); const s = o.stad; const g = ownG(yr); const t = T(ME) || { w: 8, l: 9 }; const stars = (state.roster || []).filter(p => p.ovr >= 85).length;
  const po = state.phase === 'offseason' ? proPoResult(ME) : 0; const prem = clamp(ownDemand() + 0.1, 0.45, 1.05);
  const nat = 405 * g * (o.newShare && state.season < o.newShare ? 0.75 : 1);
  return {
    nat, prem: (s.suites * (0.16 + o.mkt * 0.024) + s.club * 0.0032) * prem * g,
    spons: (22 + o.mkt * 6.5 + o.brand * 0.42 + (t.w - 8.5) * 1.2 + (s.build && s.build.open && state.season - s.build.open < 4 ? 8 : 0)) * g * (ownSelfGM() ? 0.94 : 1) * (s.temp ? 0.85 : 1),
    naming: s.naming ? s.naming.amt : 0,
    merch: (4 + o.brand * 0.17 + stars * 1.6 + [0, 1, 2, 4, 6, 12][po] + (o.uni.yr === state.season ? 6 : 0) + (o.uni.thr === state.season ? 2 : 0) + (o.uni.alt ? 1.5 : 0)) * g,
    events: (s.temp ? 1 : 2 + s.qual * 0.1 * (s.roof === 'o' ? 1 : 1.6)) * g + (o.lg.sbHost === state.season ? 35 * g : 0) + (o.lg.draftHost === state.season ? 9 * g : 0) + (o.lg.prime || 0) * 2.5,
  };
}
// revenue sharing: part of every club's gate goes into a pool split evenly. Small markets gain, big ones give.
function ownShareAdj(gate) { const o = OWN(); const avg = 95 * ownG(); return (avg - gate) * (o.lg.share / 100) * 0.5; }
function ownExpLines() {
  const o = OWN(); const g = ownG(); const st = state.staff || {}; const sal = ['HC', 'OC', 'DC', 'ST'].reduce((s_, r) => s_ + (st[r] && st[r].salary ? +st[r].salary : r === 'HC' ? 8 : 2), 0);
  const bud = Object.keys(OWN_BUD).reduce((s_, k) => s_ + OWN_BUD_COST[o.bud[k] || 3], 0) * g;
  return {
    staff: (sal + 18) * g + (o.gmP ? o.gmP.sal : 0), bud, ops: (24 + o.stad.cap / 2400 + Math.max(0, o.stad.age - 15) * 0.6) * g + (o.stad.rent || 0),
    admin: (26 + o.mkt * 1.5) * g, interest: o.debt * o.rate, comty: (o.comty.youth ? 2 : 0) + (o.comty.nbhd ? 10 : 0) + (o.comty.found ? 5 : 0),
  };
}
// the franchise's worth: revenue times a multiple that rewards big markets, brands and good stadiums
function ownValTarget(rev) {
  const o = OWN(); const s = o.stad; const m = 6.5 + o.mkt * 0.2 + o.brand / 60 + (s.temp ? 30 : s.qual) / 80 + (o.lg.share - 40) * 0.01;
  return rev * m;
}
// a rough value for any club (for sales and comparisons)
function ownClubVal(tid) {
  const pf = ownProf(tid); const t = T(tid); const g = ownG(); const rat = t ? t.rating : 76;
  const rev = 405 * g + (60 + pf.mkt * 12 + pf.brand * 0.9 + (rat - 76) * 1.2) * g + (pf.mkt * 9 + 70) * 0.3 * g;
  const m = 6.5 + pf.mkt * 0.2 + pf.brand / 60 + clamp(96 - pf.age * 0.9, 45, 96) / 80;
  return r1(rev * m);
}
const ownDebtLimit = () => r1((1250 + (OWN().stad.build && !OWN().stad.build.open ? 1000 : 0)) * ownDiff().lim * Math.pow(1.03, Math.max(0, state.season - 2026)));
const ownEquity = () => r1(OWN().val - OWN().debt);
const ownStakeVal = () => r1(ownEquity() * OWN().pct);
const ownWorth = () => r1(OWN().cash + ownStakeVal());
// borrow from lenders up to the league limit; returns what was borrowed
function ownBorrow(amt) { const o = OWN(); const room = Math.max(0, ownDebtLimit() - o.debt); const b = r1(Math.min(room, Math.max(0, amt))); o.debt = r1(o.debt + b); o.bank = r1(o.bank + b); return b; }
function ownRepay(amt) { const o = OWN(); const a = r1(clamp(amt, 0, Math.min(o.debt, Math.max(0, o.bank - 25)))); o.debt = r1(o.debt - a); o.bank = r1(o.bank - a); return a; }
// you put your own money in (partners match their share)
function ownCapCall(amt) { const o = OWN(); const mine = r1(amt * o.pct); if (mine > o.cash) return false; o.cash = r1(o.cash - mine); o.bank = r1(o.bank + amt); o.paid = r1((o.paid || 0) + mine); return true; }
// pay for something: the club's bank first, then debt, then a capital call. false if it can't be covered.
function ownSpend(amt, why, noDebt) {
  const o = OWN(); amt = r1(amt); if (o.bank >= amt + 10) { o.bank = r1(o.bank - amt); return true; }
  const short = amt + 10 - o.bank; if (!noDebt && ownDebtLimit() - o.debt >= short) { ownBorrow(short); o.bank = r1(o.bank - amt); return true; }
  const room = noDebt ? 0 : Math.max(0, ownDebtLimit() - o.debt); const rest = short - room;
  if (o.cash < rest * o.pct) return false; if (room) ownBorrow(room); ownCapCall(rest); o.bank = r1(o.bank - amt); return true;
}
// can it be paid for (same order as ownSpend)?
function ownCanSpend(amt) { const o = OWN(); const short = amt + 10 - o.bank; if (short <= 0) return true; const room = Math.max(0, ownDebtLimit() - o.debt); return o.cash >= Math.max(0, short - room) * o.pct; }


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


/* ---------- the business through the season ---------- */
function ownWeek(wk, mg) {
  const o = OWN(); if (!o || o.pending) return; const Y = o.ytd;
  if (wk <= 18) Y.pay = r1(Y.pay + payrollOf(ME) / 18);
  if (mg && mg.mResult === 'L' && o.path === 'exp' && state.season <= o.since + 2) mv('fan', 1.5); // a new club's fans are patient at first
  if (mg && !mg.neutral && mg.h === ME) {
    const po = mg.type === 'po'; const g = ownGate(po);
    Y.games++; Y.att += g.att; Y.conc = r1(Y.conc + g.conc); Y.park = r1(Y.park + g.park);
    if (po) Y.poGate = r1(Y.poGate + g.gate); else Y.gate = r1(Y.gate + g.gate);
    (Y.fills || (Y.fills = [])).push(Math.round(g.fill * 100));
  }
  // a PR moment now and then; an unanswered one gets the quiet answer after two weeks
  if (o.ev && o.ev.wk != null && state.phase !== 'offseason' && wk - o.ev.wk >= 2) ownEvAnswer(o.ev.opts[o.ev.opts.length - 1][0], true);
  if (!o.ev && wk <= 17 && ownH('evw:' + state.season + ':' + wk) < 0.13) ownEvNew(wk);
  if (typeof ownOpsWeek === 'function') ownOpsWeek(wk, mg);
}
// the new season: prices are announced, projects open, the move happens
function ownSeasonStart() {
  const o = OWN(); if (!o) return; o.ytd = ownYtd(); const s = o.stad;
  if (o.pending) return;
  if (o.relo && o.relo.k === 'approved') ownMove();
  (s.proj || []).filter(p => !p.done && p.s <= state.season).forEach(p => { p.done = true; ownProjApply(p); });
  if (s.build && !s.build.open && state.season >= s.build.yr) ownStadOpen();
  if (s.naming && s.naming.end < state.season) { ownLog(`The naming-rights deal for ${s.name} runs out. It goes back to ${s.naming.old}.`); s.name = s.naming.old; s.naming = null; }
  state.meters.fan = clamp(Math.round(state.meters.fan + (55 - state.meters.fan) * 0.25), 0, 100); // a new season brings hope back
  // prices: fans compare them with last year and with what the club is worth watching
  const def = ownDefPrice(o.mkt) * ownG(); const rel = o.biz.price / def; const last = o.biz.lastRel != null ? o.biz.lastRel : 1;
  const d = -(rel - 1) * 10 - Math.max(0, rel - last) * 18 - (o.biz.conc - 1) * 7; if (Math.abs(d) >= 0.5) mv('fan', d * (d > 0 ? ownDiff().fan : 1 / ownDiff().fan));
  o.biz.lastRel = rel;
  const dm = ownDemand() * Math.pow(def / o.biz.price, 1.2); o.biz.stb = r2(clamp(dm * 0.86, 0.3, 0.97));
  o.biz.wait = Math.max(0, Math.round(o.biz.wait * 0.8 + (dm > 1.02 ? (dm - 1) * s.cap * 0.6 : -s.cap * 0.05)));
  if (o.lg.lockout === state.season) { mv('fan', -6); ownCost(18 * ownG(), 'The lockout wiped out the preseason'); }
  if (o.comty.youth) mv('fan', 1);
  o.lg.prime = o.comm >= 72 ? 2 : o.comm >= 60 ? 1 : 0; if (o.lg.prime) ownLog(`The league gives the ${myName()} ${o.lg.prime === 2 ? 'three' : 'two'} prime-time games this season.`);
  if (typeof ownOpsSeasonStart === 'function') ownOpsSeasonStart();
}
// the season is over: the books close
function ownSeasonEnd() {
  const o = OWN(); if (!o || o.pending) return; const Y = o.ytd; const L = PS(); const rv = L.off.review; const yr = state.season;
  const R_ = ownRevLines(yr); const share = ownShareAdj(Y.gate);
  const rev = Object.assign({ nat: R_.nat, gate: Y.gate + Y.poGate }, R_, { conc: Y.conc, park: Y.park, share, extra: Y.extra || 0 });
  const E_ = ownExpLines(); const floor = r1(Math.max(0, proCap(yr) * 0.89 - Y.pay)); const exp = Object.assign({ players: Y.pay, floor }, E_, { other: Y.other });
  Object.keys(rev).forEach(k => rev[k] = r1(rev[k])); Object.keys(exp).forEach(k => exp[k] = r1(exp[k]));
  const tr = r1(Object.values(rev).reduce((a, b) => a + b, 0)), te = r1(Object.values(exp).reduce((a, b) => a + b, 0)); const net = r1(tr - te);
  o.bank = r1(o.bank + tr - (te - Y.other));
  // the owners' cut
  const dist = net > 0 && o.bank > 40 ? r1(Math.min(net * o.biz.pay, o.bank - 40)) : 0; o.bank = r1(o.bank - dist); const mine = r1(dist * o.pct);
  const inv = r1(o.cash * ({ easy: 0.05, normal: 0.04, hard: 0.03 }[state.settings.diff] || 0.04)); o.cash = r1(o.cash + mine + inv);
  // shortfalls: lenders first, then the owners
  let call = 0, forced = null;
  if (o.bank < 0) { ownBorrow(-o.bank + 10); if (o.bank < 0) { const need = -o.bank + 10; const mineNeed = r1(need * o.pct); if (o.cash >= mineNeed) { ownCapCall(need); call = mineNeed; } else forced = `The ${myName()} can't pay their bills, the lenders won't lend more, and you can't cover your share. The league forces a sale.`; } }
  // the franchise's worth
  const before = o.val; const tgt = ownValTarget(tr - rev.extra - (o.lg.sbHost === yr ? 35 * ownG() : 0)); o.val = r1(o.val * 0.55 + tgt * 0.45); o.valHist.push({ s: yr, v: o.val });
  if (o.valHist.length > 40) o.valHist.shift();
  // the brand, the fans and the city
  const t = T(ME); const po = rv.po; const stars = state.roster.filter(p => p.ovr >= 85).length; const base = o.brand0 != null ? o.brand0 : ownProf(ME).brand;
  o.brand = clamp(r1(o.brand + (t.w - 8.5) * 0.3 + [0, 0.4, 0.8, 1.3, 2.2, 4.5][po] + stars * 0.15 + (base - o.brand) * (o.brand > base ? 0.1 : 0.05) - Math.max(0, o.brand - 90) * 0.15 + (o.comty.found ? 0.6 : 0) - (o.meddle > 60 ? 0.8 : 0)), 15, 99);
  if (o.comty.nbhd) o.cityRel = clamp(o.cityRel + 4, 0, 100); o.cityRel = clamp(Math.round(o.cityRel + (60 - o.cityRel) * 0.08), 0, 100);
  if (o.comty.found) o.comm = clamp(o.comm + 2, 0, 100);
  if (po === 5) o.sb = (o.sb || 0) + 1;
  const row = { s: yr, tm: ME, w: t.w, l: t.l, po, rev, exp, tr, te, net, dist, mine, call, val: o.val, dv: r1(o.val - before), debt: o.debt, bank: o.bank, cash: o.cash, hg: Y.games, att: Y.games ? Math.round(Y.att / Y.games) : 0, fill: Y.fills && Y.fills.length ? Math.round(Y.fills.reduce((a, b) => a + b, 0) / Y.fills.length) : 0, fan: state.meters.fan, brand: Math.round(o.brand), gm: o.gm };
  o.pnl.push(row); if (o.pnl.length > 40) o.pnl.shift();
  ownLegacySeason(row);
  ownLog(`The books close on ${yr}: revenue ${fmO(tr)}, ${net >= 0 ? 'profit' : 'loss'} ${fmMs(Math.abs(net))}. The ${myName()} are worth about ${fmO(o.val)}.`, net >= 0 ? '' : 'bad');
  if (forced) { o.out = { k: 'forced', s: yr, txt: forced }; ownForcedSale(); return; }
  if (o.partner) ownPartnerSeasonEnd();
  if (typeof ownOpsSeasonEnd === 'function') ownOpsSeasonEnd(rv);
  if (typeof ownLeagueOffseason === 'function') ownLeagueOffseason();
  ownGoalsCheck(); ownHofCheck();
  o.meddle = Math.max(0, Math.round(o.meddle * 0.85 - 2)); s_ownAging();
  if (!o.ev) ownEvNew(null);
  ownNamingOffers();
}
function s_ownAging() { const s = OWN().stad; s.age++; if (s.age > 12 && !s.temp) s.qual = clamp(s.qual - (s.age > 30 ? 1.5 : 1), 30, 99); }

/* ---------- prices and payouts ---------- */
function ownSetPrice(v) { const o = OWN(); const def = ownDefPrice(o.mkt) * ownG(); o.biz.price = Math.round(clamp(+v || def, def * 0.5, def * 2)); return o.biz.price; }
function ownSetConc(v) { const o = OWN(); o.biz.conc = clamp(+v, 0.8, 1.4); return o.biz.conc; }
function ownSetPay(v) { const o = OWN(); o.biz.pay = clamp(+v, 0, 1); return o.biz.pay; }

/* ---------- the stadium ---------- */
const OWN_PROJ = {
  board: { t: 'Video boards and sound', c: 70, d: 'Bigger screens and a better sound system.', fx: 'Stadium quality +5, fans +2' },
  conc: { t: 'Concourses and food', c: 95, d: 'Wider concourses and more places to eat.', fx: 'Stadium quality +4, concessions +12%' },
  club: { t: 'Club seats and lounges', c: 130, d: 'Four thousand club seats with their own lounges.', fx: '+4,000 club seats' },
  suites: { t: 'More luxury suites', c: 190, d: 'Two dozen new suites on the sideline.', fx: '+24 suites' },
  seats: { t: 'More seats', c: 260, d: 'Six thousand more seats in the end zones.', fx: '+6,000 seats' },
  train: { t: 'Training complex', c: 160, d: 'A new practice facility next to the stadium.', fx: 'Training facility budget works a level higher' },
  fix: { t: 'Major renovation', c: 650, d: 'New seats, new roofline, new everything. Ten years younger.', fx: 'Stadium quality +18, age −12' },
};
function ownProjCost(k) { return r1(OWN_PROJ[k].c * ownG()); }
function ownProjOk(k) {
  const o = OWN(); const s = o.stad; if (!OWN_PROJ[k]) return 'No such project.'; if (s.temp) return 'Your club plays in a temporary home. Build a stadium first.';
  if (s.build && !s.build.open) return 'A new stadium is being built.'; if (s.proj.some(p => p.k === k && !p.done)) return 'Already under way.';
  if (['board', 'conc', 'club', 'suites', 'train'].includes(k) && s.proj.some(p => p.k === k && p.done && state.season - p.s < 12)) return 'Done recently.';
  if (k === 'seats' && s.cap >= 80000) return 'The stadium is as big as it can get.'; if (k === 'fix' && s.proj.some(p => p.k === 'fix' && state.season - p.s < 15)) return 'Renovated recently.';
  if (state.phase !== 'offseason') return 'Projects start in the offseason.'; return '';
}
function ownProjStart(k) {
  const o = OWN(); const why = ownProjOk(k); if (why) return { err: why }; const c = ownProjCost(k);
  if (!ownSpend(c, OWN_PROJ[k].t)) return { err: `You can't pay for it: ${fmO(c)}, and the club's bank, the league's debt limit and your share of a capital call don't cover it.` };
  o.stad.proj.push({ k, s: state.season + 1, c, done: false }); ownLog(`Work begins at ${o.stad.name}: ${OWN_PROJ[k].t.toLowerCase()} (${fmO(c)}). It's ready for the ${state.season + 1} season.`);
  return { ok: true };
}
function ownProjApply(p) {
  const s = OWN().stad;
  if (p.k === 'board') { s.qual = clamp(s.qual + 5, 0, 99); mv('fan', 2); } if (p.k === 'conc') { s.qual = clamp(s.qual + 4, 0, 99); OWN().biz.concB = 1.12; }
  if (p.k === 'club') s.club += 4000; if (p.k === 'suites') s.suites += 24; if (p.k === 'seats') s.cap = Math.min(82000, s.cap + 6000);
  if (p.k === 'train') s.train = true; if (p.k === 'fix') { s.qual = clamp(s.qual + 18, 0, 99); s.age = Math.max(0, s.age - 12); }
  ownLog(`Open for the season at ${s.name}: ${OWN_PROJ[p.k].t.toLowerCase()}.`);
}
// a new stadium. plan: { cap, roof, ask (public share %), psl ('none' | 'some' | 'lots'), loan (league loan, $M) }
const OWN_ROOF = { o: ['Open air', 2100], d: ['Dome', 2650], r: ['Retractable roof', 3300] };
function ownStadCost(plan) { return r1((OWN_ROOF[plan.roof] || OWN_ROOF.o)[1] * ownG() + (plan.cap - 60000) / 1000 * 18 * ownG()); }
function ownStadQuote(plan) {
  const o = OWN(); const cost = ownStadCost(plan); const psl = { none: 0, some: plan.cap * 0.35 * 9000 / 1e6, lots: plan.cap * 0.6 * 14000 / 1e6 }[plan.psl] || 0;
  const pub = r1(cost * clamp(+plan.ask || 0, 0, 50) / 100); const loan = r1(clamp(+plan.loan || 0, 0, 300 * ownG()));
  return { cost, psl: r1(psl * ownG()), pub, loan, rest: r1(Math.max(0, cost - pub - psl * ownG() - loan)) };
}
// the city's answer to a request for public money
function ownCityAsk(plan) {
  const o = OWN(); if (state.phase !== 'offseason') return { err: 'Stadium talks happen in the offseason.' }; if (o.stad.build && !o.stad.build.open) return { err: 'A stadium is already being built.' };
  if (o.cityAsk === state.season) return { err: 'You already went to the city this offseason.' }; o.cityAsk = state.season;
  const ask = clamp(+plan.ask || 0, 0, 50); const threat = o.threat && state.season - o.threat <= 2 ? 0.18 : 0;
  const p = clamp(0.32 + (o.cityRel - 55) / 120 + (state.meters.fan - 55) / 220 + threat - ask / 100 * 0.75 + (o.stad.temp ? 0.15 : 0), 0.05, 0.92);
  const h = ownH('city:' + state.season); const res = ownCityAsk2(ask, p, h); o.cityOk = { s: state.season, ask: res.ask }; return res;
}
function ownCityAsk2(ask, p, h) {
  const o = OWN(); if (ask === 0) return { res: 'yes', ask: 0, txt: 'You\'re paying for it yourselves. The city is delighted.' };
  if (h < p) return { res: 'yes', ask, txt: `The city council approves ${ask}% public money.` };
  if (h < p + 0.25) { const ok = ownH('ref:' + state.season) < clamp(0.35 + (state.meters.fan - 55) / 100 + (o.cityRel - 55) / 150, 0.1, 0.85); o.cityRel = clamp(o.cityRel + (ok ? 3 : -6), 0, 100); return ok ? { res: 'yes', ask, txt: `The council sends it to the voters, and they say yes: ${ask}% public money.` } : { res: 'no', ask: Math.round(ask / 3), txt: `The voters say no. The city can still offer ${Math.round(ask / 3)}% through tax breaks.` }; }
  o.cityRel = clamp(o.cityRel - 4, 0, 100); return { res: 'no', ask: Math.floor(ask / 2), txt: `The council turns you down. Their counter: ${Math.floor(ask / 2)}%.` };
}
function ownStadBuild(plan) {
  const o = OWN(); const s = o.stad; if (state.phase !== 'offseason') return { err: 'Stadium plans are made in the offseason.' }; if (s.build && !s.build.open) return { err: 'A stadium is already being built.' };
  const ok = o.cityOk && o.cityOk.s === state.season ? o.cityOk.ask : 0; plan.ask = Math.min(plan.ask || 0, ok); const q = ownStadQuote(plan);
  s.build = { yr: state.season + 3, cap: plan.cap, roof: plan.roof, suites: Math.round(plan.cap / 520), club: Math.round(plan.cap * 0.13), cost: q.cost, pub: q.pub, psl: q.psl, loan: q.loan, open: null };
  if (!ownSpend(q.rest, 'New stadium')) { s.build = null; return { err: `The club can't cover its part: ${fmO(q.rest)} after public money, seat licenses and the league loan.` }; }
  o.debt = r1(o.debt + q.loan); // the league loan pays the builders directly; seat licenses and public money go straight to the build
  if (plan.psl === 'some') { mv('fan', -4); o.biz.wait = Math.round(o.biz.wait * 0.7); } if (plan.psl === 'lots') { mv('fan', -9); o.biz.wait = Math.round(o.biz.wait * 0.4); }
  if (q.pub > 0) o.cityRel = clamp(o.cityRel - 3, 0, 100);
  ownLog(`The ${myName()} will build a new stadium: ${OWN_ROOF[plan.roof][0].toLowerCase()}, ${plan.cap.toLocaleString()} seats, ${fmO(q.cost)}${q.pub ? `, ${fmO(q.pub)} from the public` : ''}${q.psl ? `, ${fmO(q.psl)} in seat licenses` : ''}. It opens in ${s.build.yr}.`, 'big');
  return { ok: true };
}
function ownStadOpen() {
  const o = OWN(); const s = o.stad; const b = s.build; b.open = state.season;
  Object.assign(s, { cap: b.cap, roof: b.roof, suites: b.suites, club: b.club, age: 0, qual: 98, temp: false, rent: 0, proj: [], train: s.train });
  s.naming = null; s.name = `${T(ME).city || 'City'} Stadium`; mv('fan', 8); o.brand = clamp(o.brand + 4, 0, 99); o.legacy += 10; o.cityRel = clamp(o.cityRel + 5, 0, 100);
  o.biz.wait += Math.round(b.cap * 0.25); ownLog(`The ${myName()} open ${s.name}: ${b.cap.toLocaleString()} seats.`, 'big');
}
// naming rights: two or three offers when the name is free
const OWN_COS = ['Northline Bank', 'Apex Mobile', 'Crestwood Insurance', 'Summit Energy', 'BrightPath Health', 'Ironclad Trucks', 'Harborview Credit Union', 'Keystone Air', 'Bluewater Cloud', 'Granite Mutual', 'Redline Motors', 'Evergreen Grocers'];
function ownNamingOffers() {
  const o = OWN(); const s = o.stad; if (s.naming || s.temp || (s.build && !s.build.open && s.build.yr - state.season <= 1)) { o.nameOffers = null; return; }
  const base = (5 + o.mkt * 1.5 + s.qual / 18 + (s.age <= 3 ? 7 : 0)) * ownG();
  o.nameOffers = [0, 1, 2].slice(0, ownH('nc:' + state.season) < 0.5 ? 2 : 3).map(i => ({ co: ownPick(OWN_COS, 'co:' + state.season + ':' + i), amt: r1(base * (0.8 + ownH('na:' + state.season + ':' + i) * 0.45)), yrs: 8 + Math.floor(ownH('ny:' + state.season + ':' + i) * 13) }));
}
function ownNamingTake(i) {
  const o = OWN(); const f = (o.nameOffers || [])[i]; if (!f) return { err: 'That offer is gone.' }; const s = o.stad;
  const word = ownH('nw:' + f.co) < 0.5 ? 'Stadium' : 'Field'; s.naming = { co: f.co, amt: f.amt, end: state.season + f.yrs, old: s.name }; s.name = `${f.co} ${word}`; o.nameOffers = null;
  mv('fan', s.age >= 40 ? -6 : -2); ownLog(`${f.co} buys the naming rights: ${s.name}, ${fmMs(f.amt)} a year for ${f.yrs} years.`);
  return { ok: true };
}

/* ---------- moving the club ---------- */
function ownThreaten() {
  const o = OWN(); if (o.threat && state.season - o.threat < 2) return { err: 'You threatened recently. Do it again and nobody will believe you.' };
  o.threat = state.season; o.cityRel = clamp(o.cityRel - 18, 0, 100); mv('fan', -7); o.comm = clamp(o.comm - 3, 0, 100);
  ownLog(`${o.name} says the ${myName()} could leave town without a new stadium deal. The fans are furious; the city is listening.`, 'bad'); return { ok: true };
}
function ownRelocApply(city) {
  const o = OWN(); const c = ownCity(city); if (!c || NFL.some(t => t.city === city)) return { err: 'Pick a city without a club.' };
  if (state.phase !== 'offseason' || PS().off.step > 3) return { err: 'Relocation requests go to the owners before the draft.' };
  if (o.relo && o.relo.k !== 'denied') return { err: 'A move is already in the works.' };
  o.relo = { k: 'applied', city, s: state.season, fee: r1(o.val * 0.06) }; ownLog(`The ${myName()} ask the league for permission to move to ${city}. The owners vote at the league meeting.`, 'big'); mv('fan', -10); o.cityRel = clamp(o.cityRel - 25, 0, 100);
  return { ok: true };
}
// the move itself: a new city, a new name if you want one, a temporary home and a new stadium plan
function ownMove() {
  const o = OWN(); const R_ = o.relo; const c = ownCity(R_.city); const t = T(ME); const old = t.name; const nick = R_.nick || t.nick || NFL_BY[ME].nick;
  if (!ownSpend(R_.fee, 'Relocation fee')) { o.debt = r1(o.debt + R_.fee); }
  const nm = `${c.city} ${nick}`; t.name = nm; t.city = c.city; t.nick = nick; if (NFL_BY[ME]) { NFL_BY[ME].name = nm; NFL_BY[ME].city = c.city; NFL_BY[ME].nick = nick; }
  const K = tpkStore(); (K.t[ME] = K.t[ME] || {}).n = nm; o.reloName = { id: ME, city: c.city, nick };
  o.mkt = c.mkt; o.brand = clamp(o.brand * 0.6 + c.passion * 2, 25, 90); o.brand0 = clamp(40 + c.passion * 3 + c.wealth, 40, 75); state.meters.fan = 62; o.cityRel = 72; o.moves = (o.moves || 0) + 1;
  Object.assign(o.stad, { temp: c.stad !== 'old', cap: c.stad === 'college' ? 60000 : c.stad === 'old' ? 64000 : 47000, suites: c.stad === 'old' ? 80 : 30, club: 3000, roof: c.stad === 'old' ? 'd' : 'o', age: c.stad === 'old' ? 30 : 40, qual: c.stad === 'old' ? 62 : 54, rent: c.stad === 'old' ? 0 : 15, naming: null, name: '', proj: [] });
  o.stad.name = c.stad === 'old' ? `${c.city} Dome` : `${c.city} Memorial Stadium`; o.cityOk = { s: state.season - 1, ask: 40 }; o.legacy -= 12; o.comm = clamp(o.comm - 5, 0, 100); R_.k = 'done';
  o.biz.price = ownDefPrice(c.mkt) * ownG(); o.biz.wait = 6000;
  ownLog(`The ${old} are now the ${nm}. The new city has promised 40% public money toward a stadium.`, 'big');
  if (typeof feedBiz === 'function') feedBiz(`The ${old} are gone. Heartbreaking.`, true);
}

/* ---------- fans, brand and the city ---------- */
function ownComty(k, on) { const o = OWN(); if (!(k in o.comty)) return null; o.comty[k] = !!on; return o.comty[k]; }
function ownUniform(k, cols) {
  const o = OWN(); if (state.phase !== 'offseason' && k === 'redesign') return { err: 'New uniforms are introduced in the offseason.' };
  if (k === 'redesign') {
    if (o.uni.yr && state.season + 1 - o.uni.yr < 5) return { err: 'You changed the uniforms recently.' }; if (!ownSpend(4 * ownG(), 'Uniform redesign')) return { err: 'You can\'t pay for it.' };
    o.uni.yr = state.season + 1; const love = ownH('uni:' + state.season) > 0.3; mv('fan', love ? 3 : -6); o.brand = clamp(o.brand + (love ? 1 : -2), 0, 99);
    if (cols && tpkColor(cols.c1) && tpkColor(cols.c2)) { const K = tpkStore(); const e = K.t[ME] || (K.t[ME] = {}); e.c1 = tpkColor(cols.c1); e.c2 = tpkColor(cols.c2); tpkSync(); if (o.logo) { o.logo.c1 = e.c1; o.logo.c2 = e.c2; } }
    ownLog(love ? `The ${myName()} unveil new uniforms, and the fans love them.` : `The ${myName()} unveil new uniforms. The fans hate them, loudly.`, love ? '' : 'bad'); return { ok: true, love };
  }
  if (k === 'throwback') { if (o.uni.thr === state.season) return { err: 'One throwback game a season.' }; if (state.phase === 'offseason') return { err: 'Throwback games happen during the season.' }; o.uni.thr = state.season; mv('fan', 1); ownCost(0.5, 'Throwback uniforms'); ownLog(`The ${myName()} wear throwbacks this week. Merchandise flies off the shelves.`); return { ok: true }; }
  if (k === 'alt') { if (o.uni.alt) return { err: 'You already have an alternate uniform.' }; if (!ownSpend(2 * ownG(), 'Alternate uniform')) return { err: 'You can\'t pay for it.' }; o.uni.alt = true; ownLog(`The ${myName()} add an alternate uniform.`); return { ok: true }; }
  return null;
}
// PR moments: a situation, two or three answers, and what each one does
const OWN_EV = {
  tix: { t: 'A letter about ticket prices goes viral', x: 'A season-ticket holder of 30 years writes that she can\'t afford to come anymore. Local TV picks it up.', o: [['freeze', 'Freeze prices for next season', { fan: 4 }], ['cut', 'Cut prices 5% for long-time holders', { fan: 6, price: 0.95 }], ['quiet', 'Say nothing', { fan: -4 }]] },
  ref: { t: 'You yell at the officials on camera', x: 'The broadcast catches you screaming at a referee from the owner\'s box after a bad call.', o: [['sorry', 'Apologize', { comm: 2, brand: -1 }], ['double', 'Stand by it', { fan: 3, comm: -8, cost: 0.5 }], ['quiet', 'No comment', { fan: -1, comm: -2 }]] },
  leak: { t: 'Your comments about the coach leak', x: 'A reporter has your private complaints about the head coach\'s play-calling.', o: [['back', 'Back him in public', { morale: 3, meddle: -2 }], ['confirm', 'Confirm you\'re frustrated', { meddle: 8, morale: -5, fan: 2 }], ['quiet', 'No comment', { meddle: 3 }]] },
  statue: { t: 'Fans want a statue of a club legend', x: 'A petition with 40,000 names asks for a statue outside the stadium.', o: [['build', 'Build it', { fan: 5, brand: 1, cost: 3 }], ['quiet', 'Maybe someday', { fan: -1 }]] },
  charity: { t: 'A children\'s hospital asks for help', x: 'They want you to headline a telethon and kick it off with a donation.', o: [['gift', 'A big gift', { brand: 2, city: 5, comm: 2, cost: 5 }], ['show', 'Show up and host', { city: 2 }], ['quiet', 'Decline', { city: -3 }]] },
  traffic: { t: 'Neighbors complain about game-day traffic', x: 'People who live near the stadium say they can\'t get home on Sundays.', o: [['shuttle', 'Pay for shuttles', { city: 6, cost: 2 }], ['fight', 'It\'s part of living by a stadium', { city: -6 }], ['quiet', 'Promise a study', { city: 1 }]] },
  rival: { t: 'A rival owner mocks your club', x: 'In a radio interview he calls your club "a nice little hobby."', o: [['fire', 'Fire back', { fan: 4, comm: -4, rep: -2 }], ['laugh', 'Laugh it off', { rep: 2 }], ['quiet', 'Let the commissioner handle it', { comm: 1, fan: -1 }]] },
  doc: { t: 'A streaming service wants a behind-the-scenes series', x: 'Cameras in the building all season, from the owner\'s suite to the locker room.', o: [['yes', 'Let them in', { brand: 4, fan: 2, morale: -2, rev: 4 }], ['quiet', 'No, thanks', {}]] },
  tour: { t: 'A huge concert tour wants your stadium', x: 'Two summer nights. The field will need some work afterward.', o: [['yes', 'Host it', { rev: 6, qual: -1 }], ['quiet', 'Decline', {}]] },
  field: { t: 'A school district needs a new youth field', x: 'Their only field is unplayable. They ask if the club can help.', o: [['pay', 'Pay for it', { city: 4, fan: 2, cost: 1.5 }], ['quiet', 'Decline', { city: -1 }]] },
  star: { t: 'Your best player wants a new deal, publicly', x: 'He says on a podcast he feels "disrespected" by his contract.', o: [['pay', 'Tell the GM to get it done', { meddle: 5, starRap: 6 }], ['biz', 'Say contracts are business', { starRap: -6, fan: -1 }], ['quiet', 'Stay out of it', {}]] },
};
function ownEvNew(wk) {
  const o = OWN(); const keys = Object.keys(OWN_EV).filter(k => !(k === 'tour' && o.stad.temp) && !(k === 'star' && (ownSelfGM() || !state.roster.some(p => p.ovr >= 84))) && !(k === 'leak' && ownSelfGM()) && !(o.evLog || []).slice(0, 4).some(e => e.k === k));
  if (!keys.length) return; const k = ownPick(keys, 'evk:' + state.season + ':' + wk); const E = OWN_EV[k];
  o.ev = { k, t: E.t, x: E.x, opts: E.o.map(x => [x[0], x[1]]), wk, s: state.season };
}
function ownEvAnswer(key, auto) {
  const o = OWN(); const ev = o.ev; if (!ev) return null; const E = OWN_EV[ev.k]; const opt = E.o.find(x => x[0] === key) || E.o[E.o.length - 1]; const f = opt[2];
  if (f.fan) mv('fan', f.fan); if (f.brand) o.brand = clamp(o.brand + f.brand, 0, 99); if (f.comm) o.comm = clamp(o.comm + f.comm, 0, 100); if (f.rep) o.rep = clamp(o.rep + f.rep, 0, 100);
  if (f.city) o.cityRel = clamp(o.cityRel + f.city, 0, 100); if (f.meddle) o.meddle = clamp(o.meddle + f.meddle, 0, 100); if (f.morale) mv('morale', f.morale);
  if (f.cost) ownCost(f.cost, E.t); if (f.rev) { o.ytd.extra = r1((o.ytd.extra || 0) + f.rev); } if (f.qual) o.stad.qual = clamp(o.stad.qual + f.qual, 0, 99);
  if (f.price) o.biz.price = Math.round(o.biz.price * f.price); if (f.price === undefined && opt[0] === 'freeze') o.biz.lastRel = o.biz.price / (ownDefPrice(o.mkt) * ownG());
  if (f.starRap) { const st = state.roster.slice().sort((a, b) => b.ovr - a.ovr)[0]; if (st) { rapAdj(st, f.starRap, f.starRap > 0 ? 'The owner backed him' : 'The owner brushed him off'); if (f.starRap > 0 && st.k && st.k.yrs <= 2) (PS().cin.keep || (PS().cin.keep = [])).push(st.id); } }
  o.evLog.unshift({ s: state.season, k: ev.k, t: ev.t, a: opt[1], auto: !!auto }); if (o.evLog.length > 20) o.evLog.length = 20; o.ev = null;
  return opt[1];
}


/* ---------- football operations: the people who run the team ---------- */
const OWN_GM_STYLE = { trad: ['Old school', 'Trusts his scouts and the tape.'], data: ['Analytics', 'Lives in the numbers. Rarely overpays.'], cap: ['Cap expert', 'Keeps the books clean and the cap healthy.'], deal: ['Dealmaker', 'Loves a trade, especially at the deadline.'] };
function ownGenGM(n) {
  const o = OWN(); const out = [];
  for (let i = 0; i < n; i++) {
    const k = 'gm:' + state.season + ':' + (o.gmGenN = (o.gmGenN || 0) + 1); const ovr = clamp(Math.round(62 + ownH(k + 'o') * 26), 55, 90);
    const st = ownPick(Object.keys(OWN_GM_STYLE), k + 's'); const bg = ownPick(['Assistant GM in a winning front office', 'Director of player personnel', 'College scouting director', 'Former GM, fired two years ago', 'Vice president of football operations', 'Pro scouting director'], k + 'b');
    out.push({ id: 'g' + Math.floor(ownH(k + 'i') * 1e9), name: ownName(k), ovr, style: st, bg, age: 36 + Math.floor(ownH(k + 'a') * 22), sal: r1(1.5 + (ovr - 55) * 0.12), yrs: 4 + Math.floor(ownH(k + 'y') * 2), rel: 60 });
  }
  return out;
}
// will a candidate take the job? Good people avoid owners who meddle, clubs that lose and owners who run the football side
function ownDeclineP(ovr) { const o = OWN(); return clamp((o.meddle - 22) / 70 + (ovr - 74) / 32 + (ownSelfGM() ? 0.15 : 0) + (state.meters.fan < 35 ? 0.08 : 0) + (o.gmP && o.gmP.fired ? 0.05 : 0), 0, 0.85); }
function ownWilling(c, kind) { const ovr = kind === 'gm' ? c.ovr : coachOvr(c); if (c.no == null) c.no = ownH('dec:' + kind + ':' + c.id + ':' + state.season) < ownDeclineP(ovr); return !c.no; }
function ownGmCands() { const o = OWN(); if (!o.gmC || o.gmC.s !== state.season) o.gmC = { s: state.season, list: ownGenGM(5) }; return o.gmC.list; }
function ownHireGM(id) {
  const o = OWN(); const c = ownGmCands().find(x => x.id === id); if (!c) return { err: 'No such candidate.' }; if (!ownWilling(c, 'gm')) return { err: `${c.name} turned the job down.` };
  if (o.gmP) return { err: 'Fire your GM first.' }; o.gmP = Object.assign({}, c, { hired: state.season + 1, rel: 64 }); o.gmC.list = o.gmC.list.filter(x => x.id !== id);
  PS().aigm = { name: c.name, rel: 64 }; PS().gmName = c.name; o.gmLog.unshift({ s: state.season, txt: `Hired ${c.name} as GM` }); ownLog(`The ${myName()} hire ${c.name} as general manager: ${c.yrs} years at ${fmMs(c.sal)} a year.`, 'big'); return { ok: true };
}
function ownFireGM() {
  const o = OWN(); const g = o.gmP; if (!g) return { err: 'You don\'t have a GM.' }; const owed = r1(g.sal * Math.max(1, g.yrs) * 0.6); ownCost(owed, `Buyout: GM ${g.name}`);
  o.gmLog.unshift({ s: state.season, txt: `Fired GM ${g.name}` }); ownLog(`The ${myName()} fire general manager ${g.name}. The club owes him ${fmMs(owed)}.`, 'bad'); o.gmP = null; o.gmFired = state.season; PS().aigm = { name: '', rel: 50 };
  return { ok: true };
}
function ownHireHC(cid) {
  const c = (state.cands.HC || []).find(x => x.id === cid); if (!c) return { err: 'No such candidate.' }; if (!ownWilling(c, 'hc')) return { err: `${c.name} turned the job down.` };
  if (state.staff.HC && !state.staff.HC.interim) return { err: 'Fire your head coach first.' }; if (state.staff.HC && state.staff.HC.interim) state.staff.HC = null;
  return proHireHC(cid) ? { ok: true } : { err: 'The hire didn\'t go through.' };
}
// the offseason moves on: anyone missing gets hired (the best who will come)
function ownEnsureStaff() {
  const o = OWN(); if (o.pending) return;
  if (ownHands() && !o.gmP) { const c = ownGmCands().filter(x => ownWilling(x, 'gm')).sort((a, b) => b.ovr - a.ovr)[0] || ownGenGM(1)[0]; o.gmC.list = o.gmC.list.concat([c]).filter((x, i, a) => a.indexOf(x) === i); c.no = false; ownHireGM(c.id); }
  if (!state.staff.HC || state.staff.HC.interim) { if (!(state.cands.HC || []).length) state.cands.HC = genProCandidates(5); const c = state.cands.HC.filter(x => ownWilling(x, 'hc')).sort((a, b) => coachOvr(b) - coachOvr(a))[0] || state.cands.HC.slice().sort((a, b) => coachOvr(a) - coachOvr(b))[0]; c.no = false; ownHireHC(c.id); }
}
// switching between running the football side yourself and hiring a GM (offseason, before free agency)
function ownSetGM(k) {
  const o = OWN(); if (o.partner) return { err: 'As a minority partner, you don\'t make that call.' }; if (state.phase !== 'offseason' || PS().off.step > 1) return { err: 'You can change this early in the offseason, before players are re-signed.' };
  if (k === o.gm) return { ok: true };
  if (k === 'self') { if (o.gmP) ownFireGM(); o.gm = 'self'; o.rep = clamp(o.rep - 4, 0, 100); state.settings.ask = true; ownLog(`${o.name} will run the football side personally, as general manager.`, 'big'); }
  else { o.gm = 'hire'; const A = autoSet(); ['plan', 'depth', 'staff', 'resign', 'fa', 'draft', 'cuts', 'scout'].forEach(x => { A[x] = true; }); state.settings.ask = false; ownLog(`${o.name} steps back from the football side. The club will hire a general manager.`); }
  return { ok: true };
}
function ownSetDir(k) { const o = OWN(); if (!OWN_DIRS[k]) return null; if (o.dir !== k) { o.dir = k; ownLog(`The ${myName()} set a new direction: ${OWN_DIRS[k][0].toLowerCase()}.`); } return k; }
function ownSetBud(k, v) { const o = OWN(); if (!OWN_BUD[k]) return null; o.bud[k] = clamp(Math.round(+v), 1, 5); return o.bud[k]; }
// the budget lines feed the effects the GM's budget meetings use (-1 to +1)
function ownBudGot(k) {
  const o = OWN(); if (!o || o.pending) return 0; const b = o.bud;
  if (k === 'staff') return r2((b.coach - 3) / 2 + (b.anal - 3) / 8); if (k === 'travel') return b.med >= 4 ? 1 : b.med <= 2 ? -1 : 0;
  if (k === 'fac') { const v = b.fac + (o.stad.train ? 1 : 0); return v >= 5 ? 1 : v >= 4 ? (ownH('facl:' + state.season) < 0.5 ? 1 : 0) : v <= 2 ? -1 : 0; } return 0;
}
// how much your GM listens: almost always, unless the relationship is gone
function ownWeight() { const o = OWN(); const g = o.gmP; return g ? clamp(0.82 + (g.rel - 50) / 260, 0.55, 0.97) : 0.9; }
// every order to the GM costs a little: he notices, and so does everyone else
function ownOrder(kind, pid) { const o = OWN(); o.meddle = clamp(o.meddle + (kind === 'trade' || kind === 'cut' ? 4 : 3), 0, 100); if (o.gmP) o.gmP.rel = clamp(o.gmP.rel - 1.5, 0, 100); (o.ord || (o.ord = [])).push({ s: state.season, kind, pid }); }

/* ---------- what the GM you hired does ---------- */
// skill shows up as fewer overpays and better re-sign calls
const ownGmSkill = () => { const o = OWN(); const g = o.gmP; return (g ? g.ovr : 65) + (o.bud.anal - 3) * 2.5 + (g && g.style === 'data' ? 3 : 0); };
function ownGmResign() {
  const o = OWN(); const w = ownWeight(); const cin = PS().cin; const sk = ownGmSkill(); const dir = o.dir;
  const ageCut = dir === 'win' ? 32 : dir === 'build' ? 28 : 30;
  state.roster.filter(p => !underContract(p)).sort((a, b) => b.ovr - a.ovr).forEach(p => {
    const asked = cin.cut.includes(p.id); const wantKeep = (cin.keep || []).includes(p.id);
    const seen = p.ovr + Math.round((ownH('rsn:' + p.id + ':' + state.season) - 0.5) * (90 - sk) / 4);
    let keep = p.age <= ageCut && seen >= worstStarter(ME, p.pos) - 1 ? 0.8 : p.age <= ageCut + 1 && seen >= 70 ? 0.4 : 0.12;
    if (asked && R() < w) keep = 0; if (wantKeep && R() < w) keep = 1;
    const apy = r2(pValue(p) * (1.02 + Math.max(0, 80 - sk) / 400) * rnd(0.97, 1.08));
    if (R() < keep && capRoom(ME) > apy) { p.k = mkContract(apy, wantYears(p.age), 0.25); txLog(`Re-signed ${p.pos} ${p.n}.`); if (wantKeep) cinNote(`The GM re-signed ${p.n}, as you ordered.`); }
    else { letWalk(p.id); if (wantKeep) cinNote(`The GM let ${p.n} walk despite your order to keep him.`); else if (asked) cinNote(`The GM let ${p.n} go, as you ordered.`); }
  });
}
function ownGmFaBids() {
  const o = OWN(); const L = PS(); const out = {}; const w = ownWeight(); const sk = ownGmSkill(); const over = 1 + Math.max(0, 82 - sk) / 160; let room = capRoom(ME) - (o.dir === 'win' ? 2 : 6);
  L.cin.fa.forEach(id => { const p = faFind(id); if (p && room > p.ask.apy && R() < w) { out[id] = { apy: r2(p.ask.apy * 1.04), yrs: p.ask.yrs }; room -= p.ask.apy; } });
  const n = clamp(Math.round(capRoom(ME) / 22), 2, 8) + (o.dir === 'win' ? 2 : o.dir === 'build' ? -1 : 0); const maxAge = o.dir === 'win' ? 33 : o.dir === 'build' ? 27 : 30;
  needList(ME).slice(0, n).forEach(nd => { const p = L.fa.filter(x => x.pos === nd.pos && !out[x.id] && x.age <= maxAge && x.ovr > worstStarter(ME, nd.pos) + 1).sort((a, b) => b.ovr - a.ovr)[0]; if (p && room > p.ask.apy * over && R() < 0.7) { out[p.id] = { apy: r2(p.ask.apy * over), yrs: p.ask.yrs }; room -= p.ask.apy * over; } });
  return out;
}
// the deadline: a GM who wants to win buys, a GM who's rebuilding sells. You can block either.
function ownGmDeadline() {
  const o = OWN(); const L = PS(); if (!o.gmP || o.dir === 'bal' && o.gmP.style !== 'deal') return null; const t = T(ME);
  const good = t.w >= t.l + 1; if (o.dir === 'win' && !good && t.w + t.l >= 5) return null;
  if (o.dir === 'build' || (o.dir === 'bal' && !good)) {
    const p = state.roster.filter(x => underContract(x) && x.age >= 29 && x.ovr >= 77).sort((a, b) => tradeValue(b) - tradeValue(a))[0]; if (!p) return null;
    const tid = NFL.map(x => x.id).filter(id => id !== ME && capRoom(id) >= capHit(p) && T(id).w >= T(id).l).sort((a, b) => posNeed(b, p.pos) - posNeed(a, p.pos))[0]; if (!tid) return null;
    const v = tradeValue(p); const their = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === tid && pickPts(x.pk) <= v * 1.15).sort((a, b) => pickPts(b.pk) - pickPts(a.pk))[0]; if (!their || pickPts(their.pk) < v * 0.6) return null;
    return { k: 'sell', tid, pid: p.id, pk: [their.i], txt: `Trade ${p.pos} ${p.n} (${p.age}, ${p.ovr}) to the ${teamName(tid)} for ${pickLabel(L.picks[their.i])}.` };
  }
  const nd = needList(ME)[0]; if (!nd || nd.n < 0.25) return null;
  const cands = []; NFL.forEach(x => { if (x.id === ME || T(x.id).w > T(x.id).l) return; proRoster(x.id).forEach(p => { if (p.pos === nd.pos && underContract(p) && p.age <= 31 && p.ovr >= worstStarter(ME, nd.pos) + 3 && capRoom(ME) >= capHit(p)) cands.push({ p, tid: x.id }); }); });
  const c = cands.sort((a, b) => b.p.ovr - a.p.ovr)[0]; if (!c) return null; const v = tradeValue(c.p);
  const mine = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === ME).sort((a, b) => pickPts(a.pk) - pickPts(b.pk)); const give = []; let sum = 0;
  for (const x of mine) { if (sum >= v * 0.95) break; give.push(x.i); sum += pickPts(x.pk); } if (sum < v * 0.9 || give.length > 3) return null;
  return { k: 'buy', tid: c.tid, pid: c.p.id, pk: give, txt: `Get ${c.p.pos} ${c.p.n} (${c.p.age}, ${c.p.ovr}) from the ${teamName(c.tid)} for ${give.map(i => pickLabel(L.picks[i])).join(' and ')}.` };
}
function ownGmDealRun() {
  const o = OWN(); const d = o.gmDeal; if (!d || d.done) return; d.done = true; if (d.blocked) return;
  const r = d.k === 'sell' ? tradeExec(d.tid, { pl: [d.pid], pk: [] }, { pl: [], pk: d.pk }, true) : tradeExec(d.tid, { pl: [], pk: d.pk }, { pl: [d.pid], pk: [] }, true);
  if (r && r.ok) ownLog(`Your GM makes his deadline deal with the ${teamName(d.tid)}.`); else ownLog('Your GM\'s deadline deal fell through.');
}
function ownGmDealBlock() { const o = OWN(); const d = o.gmDeal; if (!d || d.done || d.blocked) return false; d.blocked = true; o.meddle = clamp(o.meddle + 6, 0, 100); if (o.gmP) o.gmP.rel = clamp(o.gmP.rel - 6, 0, 100); ownLog('You block your GM\'s deadline trade.'); return true; }
// an extension the owner orders (hands-off): the GM pays a bit extra to get it done now
function ownForceExt(pid) {
  const o = OWN(); const p = P(pid); if (!p || !ownHands()) return { err: 'Not possible.' }; if (!p.k || p.k.yrs > 1) return { err: 'He has more than a year left on his deal.' };
  if (p.ovr < 72) return { err: 'Your GM won\'t extend him: he isn\'t good enough.' }; const a = askFor(p, true); if (a.walk) return { err: `${p.n} won't talk about an extension.` };
  const apy = r2(a.apy * 1.08); const nk = extendK(p.k, apy, a.yrs); const delta = r2(nk.base + nk.bpy - capHit(p)); if (delta > 0 && delta > capRoom(ME)) return { err: 'It doesn\'t fit under the cap.' };
  signOwn(p, apy, a.yrs, true); ownOrder('ext', pid); o.meddle = clamp(o.meddle + 2, 0, 100); cinNote(`On your orders, the GM extends ${p.n} (${fmM(apy)} a year).`); return { ok: true, apy };
}

/* ---------- hooks ---------- */
function ownOpsWeek(wk, mg) {
  const o = OWN(); const L = PS();
  L.scout = clamp(r1((L.scout || 0) + (o.bud.scout - 3) * 0.6 + (ownHands() && o.gmP ? (o.gmP.ovr - 70) / 15 : 0)), 0, 60);
  if (ownHands() && wk === 7 && !o.partner) { const d = ownGmDeadline(); o.gmDeal = d ? Object.assign(d, { s: state.season, done: false }) : null; if (d) ownLog(`Your GM has a deadline deal ready: ${d.txt} It goes through next week unless you block it.`); }
  if (ownHands() && wk === 8 && o.gmDeal && o.gmDeal.s === state.season) ownGmDealRun();
}
function ownOpsSeasonStart() { const o = OWN(); if (o.gmP && o.gmP.hired == null) o.gmP.hired = state.season; o.gmDeal = null; }
function ownOpsSeasonEnd(rv) {
  const o = OWN(); const g = o.gmP; if (!g || !ownHands()) return;
  const d = (rv.w - rv.exp) * 1.5 + [0, 2, 3, 4, 6, 10][rv.po]; g.rel = clamp(Math.round(g.rel + (60 - g.rel) * 0.15 - o.meddle / 25 + (d > 0 ? 2 : -1)), 0, 100); g.yrs = Math.max(0, g.yrs - 1);
  g.score = Math.round(clamp(55 + d * 3, 0, 100)); PS().aigm = { name: g.name, rel: g.rel };
  if (g.rel < 22) { o.gmLog.unshift({ s: state.season, txt: `${g.name} resigned` }); ownLog(`General manager ${g.name} resigns. He's had enough of being overruled.`, 'bad'); o.gmP = null; o.meddle = clamp(o.meddle + 5, 0, 100); return; }
}


/* ---------- league politics: the owners' meeting, the labor deal, the commissioner ---------- */
// rule proposals the owners can vote on; each changes a real league rule
const OWN_RULES = [
  { k: 'otNfl', to: 'sudden', t: 'Sudden-death overtime', d: 'The first score in overtime wins.', sup: 45 },
  { k: 'otNfl', to: 'nfl', t: 'Both teams get the ball in overtime', d: 'Each team gets a possession, then the next score wins.', sup: 70 },
  { k: 'nflSeeds', to: 6, t: 'Six playoff teams per conference', d: 'Fewer playoff spots; the top two seeds get byes.', sup: 30 },
  { k: 'nflSeeds', to: 7, t: 'Seven playoff teams per conference', d: 'More playoff games to sell.', sup: 78 },
  { k: 'proRoster', to: 48, t: 'Smaller rosters (48)', d: 'Lower payrolls; the union hates it.', sup: 46 },
  { k: 'proRoster', to: 53, t: 'Back to 53-man rosters', d: 'The standard roster size.', sup: 60 },
  { k: 'injuries', to: 'low', t: 'New player-safety rules', d: 'Fewer injuries; some say the game gets softer.', sup: 62 },
  { k: 'injuries', to: 'normal', t: 'Roll back the safety rules', d: 'The old rules return.', sup: 40 },
];
function ownRuleOpts() { const st = rules(); return OWN_RULES.filter(r => st[r.k] !== r.to); }
function ownNewItem(o_) { const o = OWN(); return Object.assign({ id: 'm' + state.season + '_' + (o.lg.itemN = (o.lg.itemN || 0) + 1), my: null, whip: 0 }, o_); }
// at the end of the season: the agenda for the spring meeting
function ownLeagueOffseason() {
  const o = OWN(); const h = k => ownH('lg:' + state.season + ':' + k); const items = [];
  const ro = ownRuleOpts(); if (ro.length) { const r = ro[Math.floor(h('r') * ro.length)]; items.push(ownNewItem({ k: 'rule', rule: r, t: `Rules: ${r.t}`, txt: r.d, sup: r.sup, office: r.sup >= 60 ? 'yes' : r.sup <= 40 ? 'no' : null })); }
  if (h('sh') < 0.45) { const up = h('shd') < 0.5; const to = clamp(o.lg.share + (up ? 5 : -5), 20, 60); if (to !== o.lg.share) items.push(ownNewItem({ k: 'share', to, t: `Revenue sharing: ${up ? 'more' : 'less'} (${o.lg.share}% → ${to}%)`, txt: up ? 'Small-market owners want more of the gate money shared. Big markets would pay for it.' : 'Big-market owners want to keep more of their own gate money.', sup: up ? 52 : 44, office: null })); }
  const others = NFL.map(t => t.id).filter(id => id !== ME);
  if (h('sale') < 0.4) { const tid = others[Math.floor(h('st') * others.length)]; const ask = h('ask') < 0.6; items.push(ownNewItem({ k: 'sale', tid, t: `Approve the sale of the ${teamName(tid)}`, txt: `A ${ownPick(['tech', 'private-equity', 'real-estate', 'shipping', 'hotel'], 'sb' + state.season)} billionaire is buying the club.`, sup: 82, office: 'yes', ask: ask ? { tid, fav: 1 } : null })); }
  const cityLeft = OWN_CITIES.filter(c => !NFL.some(t => t.city === c.city) && !(o.aiRelo || []).some(x => x.city === c.city) && !(o.relo && o.relo.city === c.city));
  if (h('rel') < 0.08 && cityLeft.length) { const tid = others.filter(id => ownProf(id).age >= 25 && ownProf(id).mkt <= 6)[Math.floor(h('rt') * 5)]; const c = cityLeft[Math.floor(h('rc') * cityLeft.length)]; if (tid) items.push(ownNewItem({ k: 'airelo', tid, city: c.city, t: `The ${teamName(tid)} want to move to ${c.city}`, txt: 'Their stadium talks failed. The owner promises a new stadium in the new city.', sup: 64, office: 'yes', ask: { tid, fav: 2 } })); }
  if (o.lg.cba <= state.season + 1) items.push(ownNewItem({ k: 'cba', t: 'The labor deal expires', txt: 'The owners have to agree on how hard to push the players\' union. A hard line saves money but risks a lockout that wipes out the preseason.', cba: true, sup: 0, office: 'mid' }));
  // your own business with the league
  if (o.relo && o.relo.k === 'applied') items.push(ownNewItem({ k: 'reloc', city: o.relo.city, t: `Your request to move to ${o.relo.city}`, txt: `The relocation fee is ${fmO(o.relo.fee)}. Owners don't like moves, but a better market helps everyone.`, sup: 0, mine: true }));
  if (o.sbBid === state.season) items.push(ownNewItem({ k: 'sb', t: `Your bid to host the ${state.season + 3} Super Bowl`, txt: `${o.stad.name} against two other cities.`, sup: 0, mine: true }));
  if (o.dBid === state.season) items.push(ownNewItem({ k: 'dhost', t: `Your bid to host the ${state.season + 2} NFL Draft`, txt: 'A week-long fan festival downtown.', sup: 0, mine: true }));
  if (o.prop && o.prop.s === state.season) items.push(ownNewItem(Object.assign({ mine: true }, o.prop.item)));
  ownMoreItems(x => items.push(ownNewItem(x)));
  o.lg.meet = { s: state.season, items, done: false };
  if (o.lg.tv <= state.season + 1) { const jump = r2(0.14 + ownH('tv:' + state.season) * 0.18 + (o.comm - 55) / 600); o.lg.tvF = r2(o.lg.tvF * (1 + jump)); o.lg.tv = state.season + 9; ownLog(`The league signs new TV deals: national money goes up ${Math.round(jump * 100)}%.`, 'big'); }
  if (o.comm < 25 && ownH('fine:' + state.season) < 0.6) { const f = r1(1 + ownH('fa:' + state.season) * 4); ownCost(f, 'League fine'); o.rep = clamp(o.rep - 2, 0, 100); ownLog(`The league office fines the ${myName()} ${fmMs(f)} for "conduct detrimental to the league."`, 'bad'); }
}
// one more item of your own each year (offseason, before the meeting)
function ownPropose(k) {
  const o = OWN(); if (o.prop && o.prop.s === state.season) return { err: 'One proposal a year.' }; const m = o.lg.meet; if (!m || m.done) return { err: 'The meeting has already happened.' };
  let item = null;
  if (k === 'shareUp' || k === 'shareDown') { const to = clamp(o.lg.share + (k === 'shareUp' ? 5 : -5), 20, 60); item = { k: 'share', to, t: `Your proposal: revenue sharing ${o.lg.share}% → ${to}%`, txt: 'Your proposal.', sup: k === 'shareUp' ? 45 : 40 }; }
  else { const r = ownRuleOpts().find(x => x.k + ':' + x.to === k); if (r) item = { k: 'rule', rule: r, t: `Your proposal: ${r.t}`, txt: r.d, sup: r.sup - 6 }; }
  if (!item) return { err: 'Pick a proposal.' }; o.prop = { s: state.season, item }; m.items.push(ownNewItem(Object.assign({ mine: true, my: 'yes' }, item))); return { ok: true };
}
function ownVoteOn(id, v) { const m = OWN().lg.meet; const it = m && !m.done ? m.items.find(x => x.id === id) : null; if (!it) return null; it.my = v; return v; }
// spend a favor to bring two or three owners along
function ownWhip(id) { const o = OWN(); const m = o.lg.meet; const it = m && !m.done ? m.items.find(x => x.id === id) : null; if (!it || (o.favors || 0) < 1) return null; o.favors--; it.whip = (it.whip || 0) + 1; return it.whip; }
function ownBidSB() { const o = OWN(); const s = o.stad; if (s.temp || s.qual < 78 || (s.roof === 'o' && !OWN_WARM.has(ME) && !(o.reloName && ownCity(o.reloName.city) && ownCity(o.reloName.city).warm))) return { err: 'A Super Bowl host needs a modern stadium (quality 78+) with a roof or in a warm-weather city.' }; if (o.sbBid === state.season) return { err: 'Your bid is in.' }; if (o.lg.meet && o.lg.meet.done) return { err: 'Bids go to the next meeting.' }; o.sbBid = state.season; o.lg.meet.items.push(ownNewItem({ k: 'sb', t: `Your bid to host the ${state.season + 3} Super Bowl`, txt: `${s.name} against two other cities.`, sup: 0, mine: true, my: 'yes' })); return { ok: true }; }
function ownBidDraft() { const o = OWN(); if (o.dBid === state.season) return { err: 'Your bid is in.' }; if (o.lg.meet && o.lg.meet.done) return { err: 'Bids go to the next meeting.' }; if (o.lg.draftHost && o.lg.draftHost >= state.season) return { err: 'You are already hosting a draft.' }; o.dBid = state.season; o.lg.meet.items.push(ownNewItem({ k: 'dhost', t: `Your bid to host the ${state.season + 2} NFL Draft`, txt: 'A week-long fan festival downtown.', sup: 0, mine: true, my: 'yes' })); return { ok: true }; }
// the meeting: before the draft, every item gets its vote
function ownMeetResolve() {
  const o = OWN(); const m = o.lg.meet; if (!m || m.done) return; m.done = true; const n = NFL.length - 1; const need = Math.ceil(NFL.length * 0.75); const out = [];
  m.items.forEach(it => {
    if (it.cba) { ownCbaResolve(it); out.push(it); return; }
    let p;
    if (it.k === 'reloc') { const c = ownCity(it.city); p = ownVote('reloc', { up: (c.mkt - o.mkt) * 0.025, key: it.id }).p; }
    else if (it.k === 'sb') p = clamp(0.25 + (o.stad.qual - 78) / 60 + (o.comm - 55) / 150 + (o.rep - 50) / 200, 0.05, 0.85);
    else if (it.k === 'dhost') p = clamp(0.4 + (o.comm - 55) / 150 + o.mkt * 0.02, 0.1, 0.9);
    else p = (it.sup / 100) + (it.mine ? (o.rep - 50) / 250 : 0);
    p = clamp(p + (it.whip || 0) * 0.07, 0.02, 0.98); let yes = 0;
    if (it.k === 'sb' || it.k === 'dhost') { it.pass = ownH('host:' + it.id) < p; }
    else { const votes = {}; Object.keys(ownOwners()).forEach(tid => { const y = ownH('mv:' + it.id + ':' + tid) < clamp(p + ownLean(tid, it), 0.02, 0.98); votes[tid] = y; if (y) yes++; }); if (it.my === 'yes') yes++; it.yes = yes; it.pass = yes >= need; it.votes = votes; ownOwnersAfterVote(it, votes); if (it.mine && yes === NFL.length) ownAch('unanimous'); }
    out.push(it); ownApplyItem(it); if (it.pass && ['patch', 'pe', 'intl', 'xexp'].includes(it.k)) ownApplyMore(it);
    if (it.ask) { if (it.my === 'yes') { o.favors = (o.favors || 0) + it.ask.fav; } else if (it.my === 'no') o.rep = clamp(o.rep - 2, 0, 100); }
    if (it.office && (it.my === 'yes' || it.my === 'no')) o.comm = clamp(o.comm + (it.my === it.office ? 2 : -2), 0, 100);
  });
  o.lg.hist.unshift({ s: m.s, items: out.map(it => ({ t: it.t, pass: it.pass, yes: it.yes, my: it.my, k: it.k, cba: it.cbaRes || null })) }); if (o.lg.hist.length > 12) o.lg.hist.length = 12;
  ownLog(`The league meeting wraps up: ${out.filter(x => x.pass).length} of ${out.filter(x => !x.cba).length} items pass.`);
}
function ownApplyItem(it) {
  const o = OWN(); if (!it.pass) { if (it.k === 'reloc') { o.relo.k = 'denied'; o.relocTries = (o.relocTries || 0) + 1; ownLog(`The owners vote down your move to ${it.city}.`, 'bad'); } return; }
  if (it.k === 'rule') { setRule(it.rule.k, it.rule.to); ownLog(`New league rule: ${it.rule.t.toLowerCase()}.`); }
  if (it.k === 'share') { o.lg.share = it.to; ownLog(`Revenue sharing is now ${it.to}% of the gate.`); }
  if (it.k === 'sale') { const w = ownNewOwner(it.tid); ownLog(`The owners approve the sale of the ${teamName(it.tid)}. ${w.name} is the new owner.`); }
  if (it.k === 'airelo') ownAiReloc(it.tid, it.city);
  if (it.k === 'reloc') { o.relo.k = 'approved'; ownLog(`The owners approve your move to ${it.city}. The club plays there next season.`, 'big'); }
  if (it.k === 'sb') { o.lg.sbHost = state.season + 3; o.legacy += 5; ownLog(`${o.stad.name} will host the ${state.season + 3} Super Bowl.`, 'big'); }
  if (it.k === 'dhost') { o.lg.draftHost = state.season + 2; ownLog(`Your city will host the ${state.season + 2} NFL Draft.`); }
}
// a computer-run club moves: new city, same nickname
function ownAiReloc(tid, city) {
  const o = OWN(); const t = T(tid); if (!t) return; const old = t.name; const nm = `${city} ${t.nick || NFL_BY[tid].nick}`; t.name = nm; t.city = city; if (NFL_BY[tid]) { NFL_BY[tid].name = nm; NFL_BY[tid].city = city; }
  (o.aiRelo || (o.aiRelo = [])).push({ id: tid, city, nick: t.nick || NFL_BY[tid].nick }); ownLog(`The ${old} move to ${city}.`, 'big');
}
// the labor deal: your stance counts for one owner in 32, but owners follow a strong voice
function ownCbaResolve(it) {
  const o = OWN(); const my = it.my || 'mid'; const lean = { hard: -1, mid: 0, give: 1 }[my]; const h = ownH('cba:' + state.season);
  const res = h + lean * 0.18 < 0.33 ? 'hard' : h + lean * 0.18 < 0.8 ? 'mid' : 'give'; 
  setRule('capGrow', { hard: 3, mid: 5.5, give: 8 }[res]); const lock = ownH('lock:' + state.season) < { hard: 0.55, mid: 0.12, give: 0 }[res];
  o.lg.cba = state.season + 1 + (res === 'hard' ? 10 : 7); if (lock) o.lg.lockout = state.season + 1; it.cbaRes = res + (lock ? '+lockout' : ''); it.pass = true;
  if (my === it.office) o.comm = clamp(o.comm + 2, 0, 100);
  ownLog(`A new labor deal through ${o.lg.cba - 1}: ${res === 'hard' ? 'the owners win big; the cap grows 3% a year' : res === 'give' ? 'the players win big; the cap grows 8% a year' : 'a compromise; the cap grows 5.5% a year'}.${lock ? ' It took a lockout that wipes out the preseason.' : ''}`, lock ? 'bad' : 'big');
}


/* ---------- legacy, goals, the Hall of Fame, selling up and handing over ---------- */
function ownLegacySeason(row) {
  const o = OWN(); const v0 = o.valHist.length > 1 ? o.valHist[o.valHist.length - 2].v : row.val;
  const d = [0, 2, 4, 7, 11, 25][row.po] + Math.max(0, row.w - 8.5) * 0.5 + clamp((row.val - v0) / Math.max(1, v0) * 30, -4, 6) + (o.comty.found ? 0.5 : 0) + (o.comty.youth ? 0.5 : 0) - (o.meddle > 60 ? 2 : 0) - (row.net < 0 ? 1 : 0);
  o.legacy = r1(o.legacy + d); o.seasons = (o.seasons || 0) + 1; row.leg = r1(d);
}
// scenario goals: what the start promised
function ownGoalsInit() {
  const o = OWN(); const s = o.since; const g = [];
  if (o.scen === 'worst') g.push({ k: 'po', t: 'Make the playoffs within four seasons', by: s + 3 }, { k: 'val', t: 'Grow the club\'s value by a third', by: s + 6, v: r1(o.val * 1.33) });
  else if (o.scen === 'frontier' || o.path === 'exp') g.push({ k: 'stad', t: 'Open a permanent stadium', by: s + 6 }, { k: 'po', t: 'Make the playoffs within six seasons', by: s + 5 });
  else if (o.scen === 'family') g.push({ k: 'debt', t: 'Get the debt under $800M', by: s + 5, v: 800 }, { k: 'win', t: 'A winning season within three years', by: s + 2 });
  else if (o.path === 'partner') g.push({ k: 'ctrl', t: 'Take control of the club', by: s + 2 }, { k: 'po', t: 'Make the playoffs within five seasons', by: s + 4 });
  else g.push({ k: 'po', t: 'Make the playoffs within five seasons', by: s + 4 }, { k: 'sb', t: 'Win a Super Bowl', by: s + 14 });
  o.goals = g.map(x => Object.assign({ done: null, fail: false }, x));
}
function ownGoalsCheck() {
  const o = OWN(); const last = o.pnl[o.pnl.length - 1]; if (!last) return;
  o.goals.forEach(g => {
    if (g.done || g.fail) return; let hit = false;
    if (g.k === 'po') hit = last.po >= 1; if (g.k === 'sb') hit = last.po === 5; if (g.k === 'val') hit = o.val >= g.v; if (g.k === 'stad') hit = !o.stad.temp; if (g.k === 'debt') hit = o.debt < g.v * ownG() / ownG(last.s);
    if (g.k === 'win') hit = last.w > last.l; if (g.k === 'ctrl') hit = !o.partner;
    if (hit) { g.done = state.season; o.legacy += 4; ownLog(`Goal reached: ${g.t.toLowerCase()}.`, 'big'); } else if (state.season >= g.by) { g.fail = true; o.rep = clamp(o.rep - 2, 0, 100); ownLog(`Goal missed: ${g.t.toLowerCase()}.`, 'bad'); }
  });
}
// owners go into the Hall of Fame as contributors
function ownHofCheck(leaving) {
  const o = OWN(); if (o.hof) return; const yrs = o.seasons || 0; const L = o.legacy + (o.legacyOld || 0);
  if ((yrs < 8 && !leaving) || yrs < 5) return; const p = L >= 170 ? 0.55 : L >= 120 ? 0.25 : L >= 90 ? 0.08 : 0;
  if (p && ownH('hof:' + state.season + ':' + (leaving ? 'x' : '')) < p) { o.hof = state.season; ownLog(`${o.name} is elected to the Pro Football Hall of Fame as a contributor.`, 'big'); }
}
// selling: two or three groups make offers around what the club is worth
function ownSaleOffers() {
  const o = OWN(); if (o.saleOffers && o.saleOffers.s === state.season) return o.saleOffers.list;
  const list = [0, 1, 2].map(i => ({ who: ownPick(['A tech founder', 'A private-equity group', 'A real-estate family', 'A sovereign wealth fund partner', 'A shipping magnate', 'A hedge-fund manager'], 'sw:' + state.season + ':' + i), price: r1(o.val * (0.97 + ownH('sp:' + state.season + ':' + i) * 0.13)) }));
  o.saleOffers = { s: state.season, list }; return list;
}
function ownSell(i) {
  const o = OWN(); if (state.phase !== 'offseason') return { err: 'Clubs are sold in the offseason.' }; if (o.partner) return { err: 'As a minority partner, you can only sell your 10%.' };
  const f = ownSaleOffers()[i]; if (!f) return { err: 'That offer is gone.' }; const gross = r1((f.price - o.debt) * o.pct); const gain = Math.max(0, gross - (o.paid || 0)); const tax = r1(gain * 0.2); const net = r1(gross - tax);
  o.cash = r1(o.cash + net + Math.max(0, o.bank) * o.pct * 0.5); ownHofCheck(true);
  ownArchive({ how: 'sold', price: f.price, net }); o.pct = 0;
  o.out = { k: 'sold', s: state.season, txt: `You sold the ${myName()} to ${f.who.toLowerCase()} for ${fmO(f.price)}. Your share after taxes: ${fmO(net)}.` };
  ownLog(o.out.txt, 'big'); return { ok: true, net };
}
// the league steps in: the club is sold for what it fetches quickly
function ownForcedSale() { const o = OWN(); const price = r1(o.val * 0.88); const gross = Math.max(0, r1((price - o.debt) * o.pct)); o.cash = r1(Math.max(0, o.cash) + gross); ownArchive({ how: 'forced', price, net: gross }); o.pct = 0; ownLog(`${o.out.txt} The club goes for ${fmO(price)}; your share is ${fmO(gross)}.`, 'bad'); }
// a record of each club you owned
function ownArchive(x) { const o = OWN(); const W = o.pnl.filter(r => r.tm === ME); const w = W.reduce((s, r) => s + r.w, 0), l = W.reduce((s, r) => s + r.l, 0); (o.prev || (o.prev = [])).push({ tm: ME, name: myName(), from: o.since, to: state.season, w, l, sb: W.filter(r => r.po === 5).length, po: W.filter(r => r.po >= 1).length, how: x.how, price: x.price, net: x.net, gen: o.gen }); }
// after a sale: buy another club, or call it a career
function ownRetire() { const o = OWN(); if (!o.out && state.phase !== 'offseason') return { err: 'You can retire in the offseason.' }; if (!o.out) ownArchive({ how: 'retired', price: o.val, net: 0 }); ownHofCheck(true); o.done = true; o.out = o.out || { k: 'retired', s: state.season, txt: `${o.name} retires.` }; ownLog(`${o.name} retires from football.`, 'big'); return { ok: true }; }
function ownHeir(name) {
  const o = OWN(); if (state.phase !== 'offseason' || o.out) return { err: 'The club can be handed down in the offseason.' }; if (o.partner) return { err: 'You don\'t control the club yet.' }; name = String(name || '').trim().slice(0, 30); if (!name) return { err: 'Name your heir.' };
  const v = ownVote('heir', { key: 'heir' }); if (!v.ok) return { err: `The owners don't approve the transfer (${v.yes} of ${v.need} votes). Try again next year.` };
  ownHofCheck(true); ownArchive({ how: 'heir', price: o.val, net: 0 }); const prevName = o.name;
  o.legacyOld = r1((o.legacyOld || 0) + o.legacy * 0.5); o.legacy = 0; o.name = name; o.gen = (o.gen || 1) + 1; o.cash = r1(o.cash * 0.6); o.rep = 48; o.meddle = 0; o.seasons = 0; o.since = state.season + 1; o.hof = null;
  ownLog(`${prevName} hands the ${myName()} to ${name}. The family's second chapter begins.`, 'big'); return { ok: true };
}
// buy another club (after a sale): same rules as the first time
function ownMarketAgain() { const o = OWN(); o.mkt0 = null; o.saleOffers = null; const m = ownMarket().filter(x => x.tid !== ME); o.mkt0 = m; return m; }
function ownBuyAgain(tid, price, debt, mine) {
  const o = OWN(); if (!o.out || o.done) return { err: 'You own a club already.' }; const keep = { prev: o.prev, legacyOld: r1((o.legacyOld || 0) + o.legacy), sb: o.sb, hof: o.hof, gen: o.gen, ord: [], seasons: 0 };
  const v = ownVote('buy', { pct: Math.min(1, mine / (price - debt)), debt, partners: 1, key: tid }); if (!v.ok) return { err: `The owners vote you down (${v.yes} of ${v.need}).` };
  const r = ownCloseBuy(tid, price, debt, mine); if (!r.ok) return r; Object.assign(state.own, keep, { legacy: 0 }); return { ok: true };
}
// the partner years: at the end of each, the controlling owner offers control if your group can pay
function ownPartnerSeasonEnd() {
  const o = OWN(); const P_ = o.partner; P_.yrs--; P_.price = r1(Math.max(P_.price, o.val * 1.03)); const eq = P_.price - o.debt; const need = r1(eq * 0.2);
  P_.need = need; P_.offer = o.cash >= need; if (P_.offer) ownLog(`${P_.seller} is ready to sell you control of the ${myName()} at a ${fmO(P_.price)} valuation. Your part: at least ${fmO(need)}.`, 'big');
  else if (P_.yrs <= -2) { o.out = { k: 'partner', s: state.season, txt: `${P_.seller} sells control to another group. You keep your 10%, but the club isn't yours to run.` }; ownLog(o.out.txt, 'bad'); }
  else ownLog(`${P_.seller} will wait another year: your group needs ${fmO(need)} to take control.`);
}
function ownPartnerTake(mine) {
  const o = OWN(); const P_ = o.partner; if (!P_ || !P_.offer) return { err: 'No offer on the table.' }; const eq = P_.price - o.debt; mine = r1(clamp(+mine || P_.need, P_.need, o.cash));
  const v = ownVote('control', { key: 'ctrl' }); if (!v.ok) return { err: `The owners don't approve the transfer yet (${v.yes} of ${v.need}).` };
  o.cash = r1(o.cash - mine); o.paid = r1((o.paid || 0) + mine); o.pct = r2(clamp(0.1 + mine / eq, 0.3, 1)); o.partners = Math.max(1, Math.ceil((1 - o.pct) / 0.12)); o.partner = null; o.since = state.season + 1;
  ownLog(`${o.name} takes control of the ${myName()} with ${Math.round(o.pct * 100)}% of the club.`, 'big'); return { ok: true };
}


/* ---------- wiring Owner mode into the NFL engine ---------- */
const OWN_TABS = [['obiz', 'Business'], ['ostad', 'Stadium'], ['ofans', 'Fans & brand'], ['oleague', 'League office']];
const OWN_MNAV = [['office', 'Office', 'home'], ['schedule', 'Schedule', 'cal'], ['obiz', 'Business', 'grid'], ['front', 'Front office', 'users']];
(function ownTabsInit() {
  const i = PRO_TABS.findIndex(t => t[0] === 'office') + 1; PRO_TABS.splice(i, 0, ...OWN_TABS);
  if (!PRO_GROUPS.some(g => g[0] === 'Ownership')) PRO_GROUPS.splice(1, 0, ['Ownership', OWN_TABS.map(t => t[0])]);
})();
// which tabs an owner sees: the owner's pages; the GM's desk only when you are your own GM
{ const _tv = xTabVis; xTabVis = function (k) {
  if (OWN_TABS.some(t => t[0] === k)) return isOwner() && !OWN().pending;
  if (isOwner()) { if (k === 'front') return true; if (ownHands() && ['cap', 'trades', 'depth'].includes(k)) return false; if (k === 'nflx' && ownHands()) return false; }
  return _tv(k);
}; }
{ const _xv = xView; xView = function (tab) { if (isOwner() && !OWN().pending) { const v = ownViewFor(tab); if (v) return v; } return _xv(tab); }; }
{ const _ob = proOffBlockers; proOffBlockers = function () {
  if (!isOwner()) return _ob(); const o = OWN(); const L = PS();
  if (o.done) return [{ txt: 'You have retired. Start a new owner career from the Home screen.', tab: 'career' }];
  if (o.out) return [{ txt: 'You don\'t own a club. Buy one, or retire.', tab: 'career' }];
  if (ownHands()) { const b = []; if (L.off && L.off.step === 1 && (!o.gmP || !state.staff.HC || state.staff.HC.interim) && !autoOn('staff')) b.push({ txt: !o.gmP ? 'Hire a general manager.' : 'Hire a head coach.', tab: 'front' }); return b; }
  return _ob().map(x => (/head coach/i.test(x.txt) ? Object.assign({}, x, { tab: 'front' }) : x));
}; }
{ const _mgf = myGmFaBids; myGmFaBids = function () { return isOwner() ? ownGmFaBids() : _mgf(); }; }
// the lockout costs young players their spring; a training complex helps them
{ const _pd = proDevelop; proDevelop = function (p, mine) {
  let d = _pd(p, mine); if (mine && isOwner() && OWN().lg.lockout === state.season + 1 && p.age <= 24 && ownH('lk:' + p.id) < 0.5 && p.ovr > 45) { p.ovr -= 1; d -= 1; }
  return d;
}; }
// club names that moved (yours and the computer's) survive the name reset
{ const _cs = cmSyncNames; cmSyncNames = function () { _cs(); ownSyncNames(); }; }
function ownSyncNames() {
  if (!isOwner() || typeof NFL_BY === 'undefined') return; const o = OWN();
  const put = (id, city, nick) => { if (!NFL_BY[id]) return; const nm = city + ' ' + nick; NFL_BY[id].name = nm; NFL_BY[id].city = city; NFL_BY[id].nick = nick; if (state.teams[id]) { state.teams[id].name = nm; state.teams[id].city = city; } };
  (o.aiRelo || []).forEach(x => put(x.id, x.city, x.nick)); if (o.reloName && o.reloName.id === ME) put(ME, o.reloName.city, o.reloName.nick);
}
function ownSlotSummary() {
  const o = OWN(); const t = T(ME); return { lvl: 'nfl', own: true, gm: false, name: o.pending ? 'New owner' : teamName(ME), owner: o.name, season: state.season, phase: state.phase, rec: t ? t.w + '-' + t.l : '0-0', legacy: Math.round(o.legacy + (o.legacyOld || 0)), diff: state.settings.diff, custom: false, seasons: (o.pnl || []).length, fired: !!o.out, saved: Date.now(), val: o.val };
}
// a page for each owner tab
function ownViewFor(tab) {
  if (tab === 'office') return vOwnOffice; if (tab === 'career') return vOwnLegacy; if (tab === 'front') return vOwnFront;
  if (tab === 'obiz') return vOwnBiz; if (tab === 'ostad') return vOwnStad; if (tab === 'ofans') return vOwnFans; if (tab === 'oleague') return vOwnLeague;
  if (tab === 'off') { const o = PS().off; if (o && o.step === 0) return () => proOffTop(0) + ownReviewHTML(); if (o && o.step === 1) return () => proOffTop(1) + ownFrontStepHTML(); }
  return null;
}


