
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
