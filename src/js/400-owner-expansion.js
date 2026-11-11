/* ===================== v9.49: Owner mode trims what doesn't belong =====================
 * Owners don't call plays, run camp battles, play pick'em or join friends leagues, and the rival front offices
 * give way to the other owners. Other modes keep all of these. */
const OWN_HIDE = ['pickem', 'friends', 'camp', 'rivals'];
{ const _tv = xTabVis; xTabVis = function (k) { if (isOwner() && OWN_HIDE.includes(k)) return false; return _tv(k); }; }
// live games are watch-only from the owner's suite
{ const _ps = proSettings; proSettings = function () { const h = _ps(); return isOwner() ? h.replace(/<div class="setrow"><div class="sl"><b>Tutorial<\/b>[\s\S]*?<\/button><\/div><\/div>/, '').replace(/<details[^>]*><summary[^>]*>College rules[\s\S]*?<\/details>/g, '').replace(/<div class="setrow"><div class="sl"><b>(Big calls in live games|Play clock|Rules preset|NFL overtime|NFL playoff teams|NFL salary cap growth|Job security|Injuries|NFL roster limit)<\/b>[\s\S]*?<\/div><div class="sctl">[\s\S]*?<\/div><\/div><\/div>/g, '') : h; }; }


/* ===================== v9.49: the business side =====================
 * A president of business operations (optional), sponsorship deals by category, local TV and radio rights (or the
 * club's own channel), ticket tiers and a fan survey. State lives in own.bizP, own.spons, own.sOff, own.media, own.biz. */
function ownB() { const o = OWN(); o.spons = o.spons || {}; o.media = o.media || { k: 'net', amt: r1((6 + o.mkt * 1.8) * ownG()), end: 2028, yr0: null }; o.biz.stDisc = o.biz.stDisc != null ? o.biz.stDisc : 0; o.biz.prem = o.biz.prem || 1; o.biz.family = !!o.biz.family; o.biz.students = !!o.biz.students; o.bizMode = o.bizMode || 'me'; if (o.ins == null) o.ins = true; return o; }

/* ---------- the president of business operations ---------- */
const OWN_PRES_STYLE = { growth: ['Revenue first', 'Pushes prices and premium seats hard.'], fan: ['Fans first', 'Keeps prices friendly and the stadium full.'], prem: ['Premium experience', 'Suites, clubs and big-ticket sponsors.'], frugal: ['Cost cutter', 'Keeps the books tight; fans notice the little things.'] };
function ownGenPres(n) {
  const o = OWN(); return Array.from({ length: n }, () => { const k = 'pres:' + state.season + ':' + (o.presN = (o.presN || 0) + 1); const ovr = clamp(Math.round(60 + ownH(k + 'o') * 30), 55, 92);
    return { id: 'b' + Math.floor(ownH(k + 'i') * 1e9), name: ownName(k), ovr, style: ownPick(Object.keys(OWN_PRES_STYLE), k + 's'), sal: r1(1.2 + (ovr - 55) * 0.09), yrs: 4 + Math.floor(ownH(k + 'y') * 3), bg: ownPick(['Ran the business side of an NBA club', 'Chief marketing officer at a beverage company', 'Ran a racetrack and two arenas', 'Head of ticketing for a rival club', 'Sports-media executive', 'Ran a major college athletic department\'s business office'], k + 'b') }; });
}
function ownPresCands() { const o = OWN(); if (!o.presC || o.presC.s !== state.season) o.presC = { s: state.season, list: ownGenPres(4) }; return o.presC.list; }
function ownHirePres(id) { const o = ownB(); const c = ownPresCands().find(x => x.id === id); if (!c) return { err: 'No such candidate.' }; if (o.bizP) return { err: 'Let your president go first.' }; o.bizP = Object.assign({}, c, { hired: state.season }); o.presC.list = o.presC.list.filter(x => x.id !== id); o.bizMode = 'pres'; ownLog(`The ${myName()} hire ${c.name} as president of business operations.`); ownPresRun(); return { ok: true }; }
function ownFirePres() { const o = ownB(); const p = o.bizP; if (!p) return { err: 'No president to let go.' }; const owed = r1(p.sal * Math.max(1, p.yrs) * 0.5); ownCost(owed, `Buyout: president ${p.name}`); ownLog(`${p.name} is out as president of business operations.`); o.bizP = null; o.bizMode = 'me'; return { ok: true }; }
function ownSetBizMode(k) { const o = ownB(); if (k === 'pres' && !o.bizP) return { err: 'Hire a president first.' }; o.bizMode = k === 'pres' ? 'pres' : 'me'; if (o.bizMode === 'pres') ownPresRun(); return { ok: true }; }
const ownPresOn = () => { const o = OWN(); return !!(o && o.bizMode === 'pres' && o.bizP); };
const ownPresSkill = () => { const o = OWN(); return o && o.bizP && o.bizMode === 'pres' ? o.bizP.ovr : 70; };
// what the president decides: prices aimed at a full house, his style on the rest, and every good offer taken
function ownPresRun() {
  const o = ownB(); const p = o.bizP; if (!ownPresOn()) return; const st = p.style; const err = (ownH('pe:' + state.season + ':' + p.id) - 0.5) * (95 - p.ovr) / 100;
  const tgt = { growth: 0.9, fan: 0.99, prem: 0.94, frugal: 0.95 }[st] + err * 0.4; const def = ownDefPrice(o.mkt) * ownG(); let lo = def * 0.5, hi = def * 2;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (ownFill(mid) >= tgt) lo = mid; else hi = mid; } o.biz.price = Math.round(lo);
  o.biz.conc = { growth: 1.2, fan: 0.8, prem: 1.2, frugal: 1.2 }[st]; o.biz.prem = { growth: 1.15, fan: 1, prem: 1.3, frugal: 1 }[st]; o.biz.stDisc = { growth: 0, fan: 0.1, prem: 0.05, frugal: 0 }[st];
  o.biz.family = st === 'fan'; o.biz.students = st !== 'growth';
  (o.sOff || []).slice().forEach(f => { if (!f.done && !(f.slot === 'book' && st === 'fan')) ownSponTake(f.id, true); });
  if (o.nameOffers && o.nameOffers.length && !(st === 'fan' && o.stad.age >= 40)) { const i = o.nameOffers.reduce((b, x, j, a) => (x.amt > a[b].amt ? j : b), 0); ownNamingTake(i); }
}
// a good president earns more from sponsors and premium seats; a bad one less
const ownPresF = () => (ownPresOn() ? 1 + (ownPresSkill() - 72) / 220 : 1);

/* ---------- sponsors ---------- */
const OWN_SPON = {
  patch: { t: 'Jersey patch', base: m => 8 + m * 1.6, need: 'patch', d: 'A company logo on the jersey. The league has to allow it first.' },
  lounge: { t: 'Stadium club', base: m => 3 + m * 0.5, d: 'A sponsor\'s name on the premium club.' },
  beer: { t: 'Official beer', base: m => 3 + m * 0.6, d: 'Pouring rights and signs at every concession stand.' },
  bank: { t: 'Official bank', base: m => 3 + m * 0.6, d: 'A bank\'s name on the ticket gates and the club\'s credit card.' },
  air: { t: 'Official airline', base: m => 2 + m * 0.5, d: 'Team charters and a travel partner.' },
  tech: { t: 'Technology partner', base: m => 3 + m * 0.7, d: 'The stadium app, Wi-Fi and replay screens.' },
  book: { t: 'Sportsbook', base: m => 6 + m * 0.8, d: 'A betting lounge and in-stadium ads. The league office frowns on it.', fx: { comm: -4, brand: -1 } },
};
const OWN_SPON_CO = { patch: ['Northline Bank', 'Apex Mobile', 'Summit Energy', 'Bluewater Cloud'], lounge: ['Keystone Club', 'Granite Mutual', 'Harborview Credit Union'], beer: ['Ridgeway Brewing', 'Lakeshore Lager', 'Copper Kettle Beer'], bank: ['Granite Mutual', 'Northline Bank', 'Harborview Credit Union'], air: ['Keystone Air', 'SkyBridge Airlines', 'Cardinal Air'], tech: ['Bluewater Cloud', 'Apex Mobile', 'Pixelwave'], book: ['LineMaker', 'TopBet', 'Fieldgoal Sports'] };
function ownSponRev() { const o = ownB(); return r1(Object.values(o.spons).reduce((s, d) => s + (d && d.end >= state.season ? d.amt : 0), 0)); }
function ownSponOffers() {
  const o = ownB(); const g = ownG(); o.sOff = [];
  Object.entries(OWN_SPON).forEach(([k, d], i) => {
    const cur = o.spons[k]; if (cur && cur.end > state.season) return; if (cur) { ownLog(`The ${d.t.toLowerCase()} deal with ${cur.co} runs out.`); delete o.spons[k]; }
    if (d.need === 'patch' && !o.lg.patch) return; if (k === 'lounge' && o.stad.temp) return;
    const key = 'sp:' + state.season + ':' + k; const t = T(ME); const win = t ? (t.w - t.l) * 0.012 : 0;
    o.sOff.push({ id: k + state.season, slot: k, co: ownPick(OWN_SPON_CO[k], key + 'c'), amt: r1(d.base(o.mkt) * (0.75 + o.brand / 200 + win + ownH(key + 'a') * 0.25) * g), yrs: 3 + Math.floor(ownH(key + 'y') * 4), done: false, asked: false });
  });
}
function ownSponTake(id, auto) {
  const o = ownB(); const f = (o.sOff || []).find(x => x.id === id && !x.done); if (!f) return { err: 'That offer is gone.' }; const d = OWN_SPON[f.slot];
  o.spons[f.slot] = { co: f.co, amt: f.amt, end: state.season + f.yrs }; f.done = true;
  if (d.fx) { if (d.fx.comm) o.comm = clamp(o.comm + d.fx.comm, 0, 100); if (d.fx.brand) o.brand = clamp(o.brand + d.fx.brand, 0, 99); }
  if (!auto) ownLog(`${f.co} signs on as the ${myName()}' ${d.t.toLowerCase()}: ${fmMs(f.amt)} a year for ${f.yrs} years.`); return { ok: true };
}
// ask for more: sometimes they pay it, sometimes they walk
function ownSponCounter(id) {
  const o = ownB(); const f = (o.sOff || []).find(x => x.id === id && !x.done); if (!f || f.asked) return { err: 'You already countered.' }; f.asked = true;
  const t = T(ME); const p = clamp(0.45 + (o.brand - 60) / 150 + (t ? (t.w - t.l) * 0.015 : 0), 0.15, 0.8);
  if (ownH('spc:' + f.id) < p) { f.amt = r1(f.amt * 1.15); return { ok: true, txt: `${f.co} agrees: ${fmMs(f.amt)} a year.` }; }
  f.done = true; return { ok: false, txt: `${f.co} walks away.` };
}
function ownSponDecline(id) { const o = ownB(); const f = (o.sOff || []).find(x => x.id === id && !x.done); if (f) f.done = true; return { ok: true }; }

/* ---------- local TV and radio ---------- */
function ownMediaRev() {
  const o = ownB(); const M = o.media; const g = ownG();
  if (M.k === 'own') { const yrs = state.season - M.yr0; const full = (10 + o.mkt * 2.6 + o.brand * 0.05) * g; return r1(full * clamp(0.3 + yrs * 0.22, 0.3, 1)); }
  return M.amt;
}
function ownMediaChoose(k) {
  const o = ownB(); const M = o.media; if (M.end > state.season && M.k !== 'own') return { err: `The current deal runs through ${M.end}.` }; if (state.phase !== 'offseason') return { err: 'Media deals are signed in the offseason.' };
  if (k === 'own') { if (M.k === 'own') return { err: 'You already run your own channel.' }; if (!ownSpend(30 * ownG(), 'Starting the club channel')) return { err: 'You can\'t pay for the startup.' }; o.media = { k: 'own', yr0: state.season + 1, end: 9999, amt: 0 }; ownLog(`The ${myName()} launch their own TV and streaming channel.`, 'big'); return { ok: true }; }
  const amt = r1((6 + o.mkt * 1.8) * ownG() * (1 + (o.brand - 60) / 200)); o.media = { k: 'net', amt, end: state.season + 5, yr0: null }; ownLog(`The ${myName()} sign a local TV and radio deal: ${fmMs(amt)} a year for five years.`); return { ok: true };
}

function ownMediaAuto() { const o = ownB(); if (o.media.k === 'net' && o.media.end < state.season) { const amt = r1((6 + o.mkt * 1.8) * ownG() * (1 + (o.brand - 60) / 200)); o.media = { k: 'net', amt, end: state.season + 4, yr0: null }; ownLog(`The ${myName()} renew their local TV and radio deal: ${fmMs(amt)} a year.`); } }
/* ---------- tickets: tiers, sections and the fan survey ---------- */
function ownSetTix(k, v) { const o = ownB(); if (k === 'stDisc') o.biz.stDisc = clamp(+v, 0, 0.2); if (k === 'prem') o.biz.prem = clamp(+v, 0.85, 1.3); if (k === 'family') o.biz.family = v === 'on' || v === true; if (k === 'students') o.biz.students = v === 'on' || v === true; return true; }
{ const _g = ownGate; ownGate = function (po) { const o = ownB(); const r = _g(po); const b = o.biz; const f = (1 - (b.stb || 0.8) * b.stDisc) * (b.family ? 0.96 : 1) * (b.students ? 0.985 : 1); r.gate *= f; return r; }; }
{ const _f = ownFill; ownFill = function (price) { const o = ownB(); const b = o.biz; return clamp(_f(price) * (1 + b.stDisc * 0.35) + (b.family ? 0.015 : 0) + (b.students ? 0.01 : 0), 0.38, 1); }; }
function ownSurvey() {
  const o = ownB(); const r = o.pnl[o.pnl.length - 1]; if (!r) return null; const def = ownDefPrice(o.mkt) * ownG(); const rel = o.biz.price / def;
  const value = clamp(Math.round(78 - (rel - 1) * 90 - (o.biz.conc - 1) * 40 + o.biz.stDisc * 60 + (o.biz.family ? 6 : 0)), 5, 99);
  const exp = clamp(Math.round(o.stad.qual * 0.75 + (o.stad.feat && o.stad.feat.plaza ? 8 : 0) + (o.stad.feat && o.stad.feat.board ? 5 : 0) - (o.stad.temp ? 12 : 0) + 10), 5, 99);
  const team = clamp(Math.round(30 + (r.w / Math.max(1, r.w + r.l)) * 60 + r.po * 4), 5, 99); const all = Math.round((value + exp + team) / 3);
  const low = [['value', value], ['exp', exp], ['team', team]].sort((a, b) => a[1] - b[1])[0][0];
  const quote = { value: '"I love this team, but I can\'t afford to bring my kids anymore."', exp: '"The lines are long and the seats are falling apart."', team: '"Fix the team and we\'ll keep coming."' }[low];
  o.survey = { s: r.s, value, exp, team, all, quote }; return o.survey;
}


/* ===================== v9.49: the stadium, the district and the world =====================
 * A district of shops, a hotel and offices around the stadium; stadium features (grass or turf, a fan plaza, a
 * sportsbook lounge, a giant video board); international games; storms and power failures, with insurance. */
const OWN_DIST = [
  { t: 'Plaza and restaurants', c: 250, yrs: 2, rev: 12, city: 3, d: 'Bars, restaurants and a plaza that fills up on game days and stays busy the rest of the week.' },
  { t: 'Hotel and concert hall', c: 400, yrs: 2, rev: 18, city: 2, ev: 4, d: 'A 400-room hotel and a 5,000-seat hall: visitors stay overnight and the district hosts events all year.' },
  { t: 'Offices and apartments', c: 600, yrs: 3, rev: 30, city: 5, d: 'Office towers and apartments. Years of work, and then steady rent.' },
];
function ownDistOk() { const o = OWN(); const D = o.dist || {}; if (o.stad.temp) return 'You need a permanent stadium first.'; if (D.build) return `${OWN_DIST[D.build.i].t} opens in ${D.build.done}.`; if ((D.n || 0) >= OWN_DIST.length) return 'The district is finished.'; if (state.phase !== 'offseason') return 'Construction starts in the offseason.'; return ''; }
function ownDistStart() {
  const o = OWN(); const D = o.dist || (o.dist = { n: 0, build: null, rev: 0 }); const why = ownDistOk(); if (why) return { err: why }; const ph = OWN_DIST[D.n]; const c = r1(ph.c * ownG());
  if (!ownSpend(c, ph.t)) return { err: `You can't pay for it: ${fmO(c)}.` }; D.build = { i: D.n, done: state.season + ph.yrs, c }; ownLog(`Work begins on the stadium district: ${ph.t.toLowerCase()} (${fmO(c)}). It opens in ${D.build.done}.`, 'big'); return { ok: true };
}
function ownDistTick() {
  const o = OWN(); const D = o.dist; if (!D || !D.build || state.season < D.build.done) return; const ph = OWN_DIST[D.build.i];
  D.rev = r1((D.rev || 0) + ph.rev); D.n = D.build.i + 1; D.build = null; o.cityRel = clamp(o.cityRel + ph.city * 2, 0, 100); if (ph.ev) D.ev = (D.ev || 0) + ph.ev;
  ownLog(`The stadium district's ${ph.t.toLowerCase()} open.`, 'big'); if (D.n >= OWN_DIST.length) { o.legacy += 5; ownAch('district'); }
}
const ownDistRev = () => { const D = OWN().dist; return D ? r1((D.rev || 0) * ownG() + (D.ev || 0) * ownG()) : 0; };

/* ---------- stadium features ---------- */
const OWN_FEAT = {
  turf: { t: 'Switch to artificial turf', c: 6, d: 'Cheaper to keep up and never muddy. A few more injuries.', fx: 'Saves $3M a year in field care; injuries up a little' },
  grass: { t: 'Switch to natural grass', c: 8, d: 'Players prefer it. Costs more to look after.', fx: 'Injuries down a little; field care $3M a year' },
  plaza: { t: 'Fan plaza', c: 40, d: 'A pregame party outside the gates: bands, food trucks, kids\' games.', fx: 'Fans +3, game-day experience up, events +$2M a year' },
  lounge: { t: 'Sportsbook lounge', c: 30, d: 'A betting lounge inside the stadium.', fx: '+$6M a year; the league office frowns (commissioner −5)' },
  board: { t: 'Giant video board', c: 70, d: 'The biggest screen in the league, end zone to end zone.', fx: 'Stadium quality +5, fans +2' },
};
function ownFeat() { const s = OWN().stad; s.feat = s.feat || { field: ['DAL', 'HOU', 'IND', 'ATL', 'DET', 'MIN', 'NO', 'LV', 'LAC', 'LAR', 'NYG', 'NYJ', 'NE', 'BUF', 'CIN', 'SEA'].includes(ME) ? 'turf' : 'grass' }; return s.feat; }
function ownFeatOk(k) { const o = OWN(); const F = ownFeat(); if (o.stad.temp) return 'Not in a temporary home.'; if (state.phase !== 'offseason') return 'Done in the offseason.'; if (k === 'turf' && F.field === 'turf') return 'Already turf.'; if (k === 'grass' && F.field === 'grass') return 'Already grass.'; if (['plaza', 'lounge', 'board'].includes(k) && F[k]) return 'Already built.'; if (k === 'board' && o.stad.proj.some(p => p.k === 'board' && !p.done)) return 'Already under way.'; return ''; }
function ownFeatBuild(k) {
  const o = OWN(); const why = ownFeatOk(k); if (why) return { err: why }; const f = OWN_FEAT[k]; const c = r1(f.c * ownG()); if (!ownSpend(c, f.t)) return { err: 'You can\'t pay for it.' }; const F = ownFeat();
  if (k === 'turf' || k === 'grass') F.field = k; else F[k] = true;
  if (k === 'plaza') mv('fan', 3); if (k === 'lounge') o.comm = clamp(o.comm - 5, 0, 100); if (k === 'board') { o.stad.qual = clamp(o.stad.qual + 5, 0, 99); mv('fan', 2); }
  ownLog(`${f.t}: done at ${o.stad.name}.`); return { ok: true };
}
const ownFeatRev = () => { const s = OWN().stad; const F = s.feat || {}; if (s.temp) return 0; return r1(((F.plaza ? 2 : 0) + (F.lounge ? 6 : 0)) * ownG()); };
const ownFeatCost = () => { const s = OWN().stad; const F = s.feat || {}; return s.temp ? 0 : r1((F.field === 'grass' ? 3 : 0) * ownG()); };
// grass is a little kinder to players than turf
{ const _inj = bizInjF; bizInjF = function () { let f = _inj(); if (typeof isOwner === 'function' && isOwner() && OWN().stad && OWN().stad.feat && !OWN().stad.temp) f *= OWN().stad.feat.field === 'turf' ? 1.06 : 0.96; return f; }; }

/* ---------- international games ---------- */
const OWN_INTL = ['London', 'Mexico City', 'Munich', 'São Paulo', 'Madrid', 'Dublin', 'Toronto'];
function ownIntlAsk(city) {
  const o = OWN(); if (state.phase !== 'offseason') return { err: 'International games are set in the offseason.' }; if (o.intl && o.intl.s >= state.season - 1 && !(o.lg.intlMore && o.intl.s < state.season)) return { err: o.lg.intlMore ? 'One international game a season.' : 'One international game every two seasons (the owners can vote to allow more).' };
  if (!OWN_INTL.includes(city)) return { err: 'Pick a city.' }; o.intl = { s: state.season + 1, city, done: false }; ownLog(`The ${myName()} will play a home game in ${city} next season.`); return { ok: true };
}
// at the start of the season: the chosen home game moves abroad
function ownIntlApply() {
  const o = OWN(); const I = o.intl; if (!I || I.s !== state.season || I.done) return; const g = state.games.find(x => x.h === ME && x.wk >= 4 && x.wk <= 12 && !x.neutral && x.type !== 'po');
  if (!g) return; g.neutral = true; g.name = `${I.city} Game`; I.done = true; I.gid = g.id; o.brand = clamp(o.brand + 3, 0, 99); o.comm = clamp(o.comm + 3, 0, 100); mv('fan', -2);
  o.ytd.extra = r1((o.ytd.extra || 0) + 9 * ownG()); ownLog(`Week ${g.wk} against the ${teamName(g.a)} is in ${I.city}. Local fans lose a home game; the brand goes global.`);
}

/* ---------- storms, outages and insurance ---------- */
function ownInsure(on) { const o = OWN(); o.ins = !!on; return o.ins; }
const ownInsCost = () => { const o = OWN(); return o.ins ? r1((2 + o.stad.cap / 30000) * ownG()) : 0; };
// a rare disaster: the next home games move to a neutral site and repairs cost money
function ownDisasterCheck(wk) {
  const o = OWN(); if (o.stad.temp || o.dis && o.dis.s === state.season || wk < 2 || wk > 15) return; const warm = OWN_WARM.has(ME); const p = (warm ? 0.0035 : 0.0025) * (o.stad.age > 30 ? 1.5 : 1);
  if (ownH('dis:' + state.season + ':' + wk) >= p) return;
  const kind = warm && ownH('disk:' + state.season) < 0.6 ? 'hurricane' : ownH('disk:' + state.season) < 0.5 ? 'storm' : 'power';
  const n = kind === 'power' ? 1 : kind === 'storm' ? 2 : 3; const cost = r1((kind === 'power' ? 30 : kind === 'storm' ? 90 : 180) * ownG()); const covered = o.ins ? r1(cost * 0.8) : 0;
  const home = state.games.filter(g => g.h === ME && g.wk > wk && !g.done && !g.neutral && g.type !== 'po').slice(0, n); home.forEach(g => { g.neutral = true; g.name = 'Neutral site'; });
  ownCost(r1(cost - covered), `Repairs after the ${kind === 'power' ? 'power failure' : kind}`);
  o.dis = { s: state.season, wk, kind, n: home.length, cost, covered };
  ownLog(`${kind === 'hurricane' ? 'A hurricane' : kind === 'storm' ? 'A severe storm' : 'A power-grid failure'} damages ${o.stad.name}. The next ${home.length === 1 ? 'home game moves' : home.length + ' home games move'} to a neutral site. Repairs: ${fmMs(cost)}${o.ins ? `, insurance covers ${fmMs(covered)}` : ', and you had no insurance'}.`, 'bad');
}


/* ===================== v9.49: the other owners =====================
 * Every other club has an owner with a name and a style. Styles lean on issues; relationships remember how you
 * voted and what you said. Votes are counted owner by owner. own.owners[tid] = { name, style, rel, since, fav, grudge }. */
const OWN_OSTYLE = {
  spend: ['Big spender', 'Wants to win at any price. Loves expansion fees and big TV money.'],
  pinch: ['Penny-pincher', 'Watches every dollar. Likes anything that cuts costs or adds a revenue stream.'],
  old: ['Old guard', 'Has owned the club for decades. Distrusts change of any kind.'],
  fresh: ['Newcomer', 'Just bought in. Open to new ideas, eager to make friends.'],
  mav: ['Maverick', 'Votes however he likes and says so loudly.'],
};
function ownOwners() {
  const o = OWN(); o.owners = o.owners || {};
  NFL.forEach(t => { if (t.id === ME || o.owners[t.id]) return; const k = 'ow:' + t.id + ':' + (o.ownGen = (o.ownGen || 0)); const pf = ownProf(t.id);
    const st = pf.mkt >= 8 && ownH(k + 'a') < 0.5 ? 'spend' : pf.age >= 30 && ownH(k + 'b') < 0.5 ? 'old' : ownPick(['spend', 'pinch', 'old', 'fresh', 'mav', 'pinch', 'old'], k + 's');
    const used = new Set(Object.values(o.owners).map(w => w.name)); let nm = ownName(k), q = 0; while (used.has(nm) && q < 20) nm = ownName(k + ':' + ++q);
    o.owners[t.id] = { name: nm, style: st, rel: Math.round(42 + ownH(k + 'r') * 20), since: state.season - Math.floor(ownH(k + 'y') * (st === 'old' ? 40 : 12)), fav: 0, grudge: false, agree: 0, votes: 0 };
  });
  Object.keys(o.owners).forEach(id => { if (!NFL.some(t => t.id === id) || id === ME) delete o.owners[id]; });
  return o.owners;
}
// a club changes hands: a new owner, a fresh start
function ownNewOwner(tid) { const o = OWN(); const O = ownOwners(); o.ownGen = (o.ownGen || 0) + 1; delete O[tid]; ownOwners(); O[tid].style = 'fresh'; O[tid].since = state.season; return O[tid]; }
// how one owner leans on an item
function ownLean(tid, it) {
  const O = ownOwners()[tid]; if (!O) return 0; const st = O.style; const big = ownProf(tid).mkt >= 8, small = ownProf(tid).mkt <= 5; let b = 0;
  if (it.k === 'share') { const up = it.to > OWN().lg.share; b += (up ? 1 : -1) * ((small ? 0.22 : 0) - (big ? 0.22 : 0)) + (st === 'pinch' && up ? 0.04 : 0); }
  if (it.k === 'rule') b += st === 'old' ? -0.1 : st === 'fresh' ? 0.05 : 0;
  if (it.k === 'xexp') b += st === 'spend' ? 0.08 : st === 'old' ? -0.05 : 0.03;
  if (it.k === 'pe') b += st === 'old' ? -0.22 : st === 'fresh' || st === 'spend' ? 0.14 : 0;
  if (it.k === 'patch') b += st === 'pinch' ? 0.16 : st === 'old' ? -0.18 : 0.04;
  if (it.k === 'intl') b += st === 'spend' ? 0.1 : st === 'old' ? -0.12 : 0;
  if (it.k === 'sale' || it.k === 'airelo') b += st === 'old' ? 0.04 : 0;
  if (st === 'mav') b += (ownH('mav:' + it.id + ':' + tid) - 0.5) * 0.5;
  if (it.mine) b += (O.rel - 50) / 110 - (O.grudge ? 0.25 : 0); else b += (O.rel - 50) / 400;
  if (it.ask && it.ask.tid === tid) b += 1;
  return b;
}
// court an owner over dinner (twice an offseason)
function ownCourt(tid) {
  const o = OWN(); const O = ownOwners()[tid]; if (!O) return { err: 'No such owner.' }; if (state.phase !== 'offseason') return { err: 'Owners have time for dinner in the offseason.' };
  o.court = o.court && o.court.s === state.season ? o.court : { s: state.season, n: 0 }; if (o.court.n >= 2) return { err: 'You\'ve had your two dinners this offseason.' }; o.court.n++;
  const d = O.grudge ? 4 : O.style === 'fresh' ? 10 : O.style === 'old' ? 5 : 8; O.rel = clamp(O.rel + d, 0, 100); if (O.grudge && O.rel >= 55) O.grudge = false;
  return { ok: true, txt: `Dinner with ${O.name} of the ${teamName(tid)}: relationship +${d}.` };
}
// after the meeting: owners remember
function ownOwnersAfterVote(it, votes) {
  const o = OWN(); const O = ownOwners(); if (!votes) return;
  Object.entries(votes).forEach(([tid, y]) => { const w = O[tid]; if (!w || !it.my || it.my === 'abstain') return; w.votes++; if ((y ? 'yes' : 'no') === it.my) { w.agree++; w.rel = clamp(w.rel + 1, 0, 100); } else w.rel = clamp(w.rel - 0.5, 0, 100); });
  const sponsor = it.ask ? it.ask.tid : it.tid; if (sponsor && O[sponsor] && it.my) { O[sponsor].rel = clamp(O[sponsor].rel + (it.my === 'yes' ? 6 : -6), 0, 100); if (it.my === 'yes' && it.ask) O[sponsor].fav = (O[sponsor].fav || 0) + it.ask.fav; }
}
// the computer owners' legacies, for the all-time ranking
function ownAiLegacy(tid) { const O = ownOwners()[tid]; if (!O) return 0; const L = PS(); const titles = (L.champs || []).filter(c => c.tm === tid && c.s >= O.since).length; const yrs = Math.max(0, state.season - O.since); return Math.round(titles * 25 + yrs * 1.2 + (T(tid) ? (T(tid).rating - 76) * 0.6 : 0)); }

/* ---------- more for the owners to vote on ---------- */
function ownMoreItems(push) {
  const o = OWN(); const h = k => ownH('lg2:' + state.season + ':' + k);
  if (!o.lg.patch && h('p') < 0.35) push({ k: 'patch', t: 'Allow sponsor patches on jerseys', txt: 'One company logo on every club\'s jersey. Big money; traditionalists hate it.', sup: 62, office: 'yes' });
  if (!o.lg.pe && h('pe') < 0.3) push({ k: 'pe', t: 'Let private-equity funds buy into clubs', txt: 'Funds could own up to 10% of a club. Cash for owners; some worry about outsiders.', sup: 60, office: 'yes' });
  if (!o.lg.intlMore && h('i') < 0.25) push({ k: 'intl', t: 'More international games', txt: 'Clubs could play a home game abroad every season instead of every other.', sup: 58, office: 'yes' });
  if (NFL.length < 36 && state.season - (o.lg.lastExp || 0) >= 6 && h('x') < 0.12) push({ k: 'xexp', t: `Expand the league to ${NFL.length + 2} clubs`, txt: `Two new clubs pay ${fmO(OWN_EXP_FEE())} each, split among the current owners: about ${fmMs(OWN_EXP_FEE() * 2 / NFL.length)} for every club.`, sup: 72, office: 'yes' });
}
function ownApplyMore(it) {
  const o = OWN();
  if (it.k === 'patch') { o.lg.patch = true; ownLog('Jersey sponsor patches are coming. Expect offers next offseason.'); }
  if (it.k === 'pe') { o.lg.pe = true; ownLog('Private-equity funds can now buy up to 10% of a club.'); }
  if (it.k === 'intl') { o.lg.intlMore = true; ownLog('Clubs may now play a home game abroad every season.'); }
  if (it.k === 'xexp') ownAiExpansion();
}
// the league grows by two computer-run clubs; every current owner gets a share of the fees
function ownAiExpansion() {
  const o = OWN(); const fee = OWN_EXP_FEE(); const share = r1(fee * 2 / NFL.length); const used = new Set(NFL.map(t => t.city)); const cities = OWN_CITIES.filter(c => !used.has(c.city) && !(o.relo && o.relo.city === c.city));
  if (cities.length < 2) return; const NICKS = ['Generals', 'Marauders', 'Sentinels', 'Bandits', 'Kings', 'Voyagers', 'Wranglers', 'Cyclones']; const COLS = [['#2a3f6b', '#d9b24c'], ['#6b1f2a', '#e0c9a6'], ['#1f5c4a', '#f0e6d2'], ['#30303a', '#e86a2c']];
  const smallest = conf => NFL_DIVS.slice().sort((a, b) => NFL.filter(t => t.conf === conf && t.div === a).length - NFL.filter(t => t.conf === conf && t.div === b).length)[0];
  const ids = ['AFC', 'NFC'].map((cf, i) => { const c = cities[Math.floor(ownH('aix:' + state.season + i) * cities.length)] || cities[i]; const cc = ownPick(COLS, 'aic' + state.season + i); const id = ownAddClub({ city: c.city, nick: ownPick(NICKS, 'ain' + state.season + i), conf: cf, div: smallest(cf), c1: cc[0], c2: cc[1] }); used.add(c.city); cities.splice(cities.indexOf(c), 1); return id; });
  ids.forEach(id => { const picks = nflExpansionDraft(id); fillRosterPro(id); proRate(id); const L = PS(); if (L.order && !(L.draft && L.draft.done)) { L.order = L.order.filter(x => x !== id); L.order.unshift(id); } });
  o.bank = r1(o.bank + share); o.lg.lastExp = state.season; ownOwners();
  ownLog(`The NFL grows to ${NFL.length} clubs: the ${ids.map(teamName).join(' and the ')}. Your club's share of the expansion fees: ${fmMs(share)}.`, 'big');
}

/* ---------- awards ---------- */
function ownAwards() {
  const o = OWN(); const ts = Object.values(state.teams); const avg = ts.reduce((s, t) => s + t.rating, 0) / ts.length; const exp = t => 8.5 + (t.rating - avg) * 0.55;
  const hist = id => { const h = (T(id).hist || []); return h.length ? h[h.length - 1].w : 8; };
  const coy = ts.slice().sort((a, b) => (b.w - exp(b)) - (a.w - exp(a)))[0]; const eoy = ts.slice().sort((a, b) => ((b.w - hist(b.id)) * 2 + b.w) - ((a.w - hist(a.id)) * 2 + a.w))[0];
  const lastV = o.valHist.length > 1 ? o.valHist[o.valHist.length - 2].v : o.val; const myScore = T(ME).w + proPoResult(ME) * 3 + (o.val - lastV) / Math.max(1, lastV) * 60 + (o.comty.found ? 2 : 0) + (o.comty.nbhd ? 2 : 0) + (o.comty.youth ? 1 : 0);
  const oyCand = ts.filter(t => t.id !== ME).map(t => ({ id: t.id, s: t.w + proPoResult(t.id) * 3 + ownH('ooy:' + state.season + t.id) * 4 })).sort((a, b) => b.s - a.s)[0];
  const ooy = myScore > oyCand.s ? ME : oyCand.id; const O = ownOwners();
  const who = { coy: coy.id === ME ? (state.staff.HC ? state.staff.HC.name : 'Your coach') : T(coy.id).coach || 'their coach', eoy: eoy.id === ME ? (o.gm === 'self' ? o.name : o.gmP ? o.gmP.name : 'your GM') : (PS().aistaff[eoy.id] || {}).gm || 'their GM', ooy: ooy === ME ? o.name : (O[ooy] || {}).name || 'their owner' };
  const row = { s: state.season, coy: [coy.id, who.coy], eoy: [eoy.id, who.eoy], ooy: [ooy, who.ooy] }; (o.awards || (o.awards = [])).unshift(row); if (o.awards.length > 30) o.awards.length = 30;
  if (ooy === ME) { o.legacy += 5; o.rep = clamp(o.rep + 4, 0, 100); ownAch('ooy'); }
  if (eoy.id === ME) o.legacy += 2; if (coy.id === ME) o.legacy += 1;
  ownLog(`Awards: Coach of the Year ${who.coy} (${nflNick(coy.id)}), Executive of the Year ${who.eoy} (${nflNick(eoy.id)}), Owner of the Year ${who.ooy} (${nflNick(ooy)}).`, ooy === ME ? 'big' : '');
}


/* ===================== v9.49: ownership extras =====================
 * Selling and buying back pieces of the club, private equity, contract talks with the people you hire, owner moments
 * with players, the Ring of Honor, owner achievements and a guided first season. */

/* ---------- pieces of the club ---------- */
function ownSellPiece() {
  const o = OWN(); if (o.partner || o.out) return { err: 'Not now.' }; if (o.pct - 0.05 < 0.3 - 1e-9) return { err: 'The league requires the controlling owner to keep at least 30%.' };
  const amt = r1(ownEquity() * 0.05 * 0.95); o.pct = r2(o.pct - 0.05); o.cash = r1(o.cash + amt); o.partners = (o.partners || 0) + (ownH('pp:' + state.season + o.pct) < 0.5 ? 1 : 0);
  ownLog(`${o.name} sells 5% of the ${myName()} to minority partners for ${fmO(amt)}.`); return { ok: true, amt };
}
function ownBuyPiece() {
  const o = OWN(); if (o.partner || o.out) return { err: 'Not now.' }; if (o.pct >= 0.995) return { err: 'You own the whole club.' }; const pe = o.pe ? 0.1 : 0; if (o.pct + 0.05 > 1 - pe + 1e-9) return { err: 'Your partners have nothing left to sell.' };
  const amt = r1(ownEquity() * 0.05 * 1.04); if (o.cash < amt) return { err: `It costs ${fmO(amt)}; you have ${fmO(o.cash)}.` }; o.cash = r1(o.cash - amt); o.pct = r2(Math.min(1, o.pct + 0.05)); o.paid = r1((o.paid || 0) + amt);
  if (o.pct >= 0.995 - pe) o.partners = 0; ownLog(`${o.name} buys back 5% of the ${myName()} for ${fmO(amt)}.`); return { ok: true, amt };
}
// a private-equity fund buys 10% of the club: cash for the club, a smaller share for everyone, and a payout floor
function ownPeIn() {
  const o = OWN(); if (!o.lg.pe) return { err: 'The league doesn\'t allow private equity (yet).' }; if (o.pe) return { err: 'A fund already owns 10%.' }; if (o.partner || o.out) return { err: 'Not now.' };
  const amt = r1(ownEquity() * 0.1); o.bank = r1(o.bank + amt); o.pct = r2(o.pct * 0.9); o.pe = { s: state.season, fund: ownPick(['Harbor Peak Capital', 'Granite Arch Partners', 'Lakeview Equity', 'Summit Bridge Capital'], 'pe' + state.season), amt };
  o.biz.pay = Math.max(o.biz.pay, 0.5); ownLog(`${o.pe.fund} buys 10% of the ${myName()}: ${fmO(amt)} into the club's bank. The fund wants at least half the profits paid out every year.`, 'big'); return { ok: true };
}
function ownPeOut() { const o = OWN(); if (!o.pe) return { err: 'No fund to buy out.' }; const amt = r1(ownEquity() * 0.1 * 1.12); if (!ownSpend(amt, 'Buying out the fund', true)) return { err: `It costs ${fmO(amt)} from the club's bank.` }; o.pct = r2(Math.min(1, o.pct / 0.9)); ownLog(`The ${myName()} buy out ${o.pe.fund} for ${fmO(amt)}.`); o.pe = null; return { ok: true }; }
{ const _sp = ownSetPay; ownSetPay = function (v) { const o = OWN(); return _sp(o.pe ? Math.max(0.5, +v) : v); }; }

/* ---------- contract talks with the people you hire ---------- */
// kind: 'gm' | 'hc' | 'pres'. A fair offer is accepted; a low one gets a counter, then a walkout.
function ownNegCand(kind, id) { const o = OWN(); if (kind === 'gm') return ownGmCands().find(x => x.id === id); if (kind === 'pres') return ownPresCands().find(x => x.id === id); return (state.cands.HC || []).find(x => x.id === id); }
function ownNeg(kind, id, sal, yrs) {
  const c = ownNegCand(kind, id); if (!c) return { err: 'That candidate is gone.' }; const ask = kind === 'hc' ? { s: c.salary, y: c.years } : { s: c.sal, y: c.yrs }; c.ask0 = c.ask0 || { s: ask.s, y: ask.y };
  sal = r2(+sal); yrs = clamp(Math.round(+yrs), 1, 7); if (!(sal > 0)) return { err: 'Enter a salary.' };
  const yrOk = Math.abs(yrs - ask.y) <= 1; if (sal >= ask.s * 0.97 && yrOk) { if (kind === 'hc') { c.salary = sal; c.years = yrs; } else { c.sal = sal; c.yrs = yrs; } c.agreed = true; return { res: 'yes', txt: `${c.name} agrees: ${fmM(sal)} a year for ${yrs} years.` }; }
  c.rounds = (c.rounds || 0) + 1; if (c.rounds >= 3 || sal < ask.s * 0.75) { c.no = true; return { res: 'walk', txt: `${c.name} takes another job.` }; }
  const ns = r2((ask.s + Math.max(sal, ask.s * 0.85)) / 2); if (kind === 'hc') c.salary = ns; else c.sal = ns; return { res: 'counter', txt: `${c.name} counters at ${fmM(ns)} a year for ${ask.y} years.` };
}
// contracts run out: the owner decides whether to extend (with a raise) or open the job
function ownContractsTick() {
  const o = OWN(); const hc = state.staff.HC; o.ext = o.ext || [];
  if (hc && !hc.interim) { hc.years = Math.max(0, (hc.years || 3) - 1); if (hc.years <= 0 && !o.ext.some(x => x.k === 'hc')) o.ext.push({ k: 'hc', name: hc.name, sal: r2((hc.salary || 6) * 1.12), yrs: 3 }); }
  const g = o.gmP; if (g && g.yrs <= 0 && !o.ext.some(x => x.k === 'gm')) { o.ext.push({ k: 'gm', name: g.name, sal: r2(g.sal * 1.1), yrs: 3 }); g.yrs = 0; }
  const p = o.bizP; if (p) { p.yrs = Math.max(0, p.yrs - 1); if (p.yrs <= 0 && !o.ext.some(x => x.k === 'pres')) o.ext.push({ k: 'pres', name: p.name, sal: r2(p.sal * 1.08), yrs: 3 }); }
}
function ownExtend(k, yes) {
  const o = OWN(); const e = (o.ext || []).find(x => x.k === k); if (!e) return { err: 'Nothing to decide.' }; o.ext = o.ext.filter(x => x !== e);
  if (k === 'hc') { const hc = state.staff.HC; if (!hc) return { ok: true }; if (yes) { hc.salary = e.sal; hc.years = e.yrs; ownLog(`The ${myName()} extend head coach ${hc.name}: ${e.yrs} years at ${fmM(e.sal)} a year.`); } else { ownLog(`Head coach ${hc.name}'s contract runs out. The ${myName()} let him go.`); state.staff.HC = null; state.cands.HC = genProCandidates(5); T(ME).coach = ''; } }
  if (k === 'gm') { const g = o.gmP; if (!g) return { ok: true }; if (yes) { g.sal = e.sal; g.yrs = e.yrs; ownLog(`The ${myName()} extend GM ${g.name} for ${e.yrs} years.`); } else { ownLog(`GM ${g.name}'s contract runs out. The ${myName()} let him go.`); o.gmP = null; } }
  if (k === 'pres') { const p = o.bizP; if (!p) return { ok: true }; if (yes) { p.sal = e.sal; p.yrs = e.yrs; } else { o.bizP = null; o.bizMode = 'me'; ownLog(`President ${p.name}'s contract runs out.`); } }
  return { ok: true };
}
// moving on without deciding: keep good people, let go of the rest
function ownExtAuto() { const o = OWN(); (o.ext || []).slice().forEach(e => { const t = T(ME); const good = t && t.hist && t.hist.length ? t.hist[t.hist.length - 1].w >= 8 : true; ownExtend(e.k, e.k === 'pres' ? true : good || (e.k === 'gm' && o.gmP && o.gmP.ovr >= 75)); }); }

/* ---------- owner moments ---------- */
const OWN_MOM = {
  star: { t: 'Sit down with an unhappy player', d: 'He feels heard. Rapport +8, and a trade demand may go away.' },
  practice: { t: 'Watch practice', d: 'The locker room notices the owner is there. Morale +2.', season: true },
  visit: { t: 'Hospital visit with players', d: 'Players and the owner visit a children\'s hospital. City relations +3.' },
  party: { t: 'Throw a draft party at the stadium', d: 'Thousands of fans watch the draft together. Fans +2, costs $1M.', off: true },
  ring: { t: 'Ring of Honor induction', d: 'Honor a retired great at halftime. Fans +3, brand +1, legacy +1.' },
};
function ownTime() { const o = OWN(); if (!o.time || o.time.s !== state.season) o.time = { s: state.season, n: 4, used: {} }; return o.time; }
function ownMomentOk(k, pid) {
  const o = OWN(); const T_ = ownTime(); const m = OWN_MOM[k]; if (!m) return 'Unknown.'; if (o.out || o.partner) return 'Not now.'; if (T_.n <= 0) return 'You\'re out of time this season (four moments a season).';
  if (m.season && state.phase === 'offseason') return 'During the season.'; if (m.off && (state.phase !== 'offseason' || !PS().off || PS().off.step > 4)) return 'In the offseason, before the draft.'; if ((k === 'party' || k === 'visit') && T_.used[k]) return 'Once a season.';
  if (k === 'star' && !ownUnhappy().length) return 'Nobody is unhappy right now.'; if (k === 'ring' && !ownRingCands().length) return 'No retired great is waiting for the Ring of Honor.'; return '';
}
const ownUnhappy = () => state.roster.filter(p => p.hold || p.tdem || (p.ovr >= 72 && rapOf(p) < 48)).sort((a, b) => b.ovr - a.ovr);
const ownRingCands = () => { const o = OWN(); const done = new Set((o.roh || []).map(x => x.n)); return (PS().ring || []).filter(x => !done.has(x.n)); };
function ownMoment(k, pid) {
  const o = OWN(); const why = ownMomentOk(k, pid); if (why) return { err: why }; const T_ = ownTime(); T_.n--; T_.used[k] = true;
  if (k === 'star') { const p = (pid && P(pid)) || ownUnhappy()[0]; rapAdj(p, 8, 'Met with the owner'); if (p.tdem && ownH('tdm:' + p.id + state.season) < 0.45) { delete p.tdem; ownLog(`After a sit-down with ${o.name}, ${p.n} withdraws his trade request.`); return { ok: true, txt: `${p.n} withdraws his trade request.` }; } if (ownHands()) o.meddle = clamp(o.meddle + 1, 0, 100); return { ok: true, txt: `${p.n} appreciates the talk.` }; }
  if (k === 'practice') { mv('morale', 2); return { ok: true, txt: 'Practice has a little extra energy today.' }; }
  if (k === 'visit') { o.cityRel = clamp(o.cityRel + 3, 0, 100); o.brand = clamp(o.brand + 0.5, 0, 99); return { ok: true, txt: 'The visit makes the local news.' }; }
  if (k === 'party') { mv('fan', 2); ownCost(1, 'Draft party'); return { ok: true, txt: 'The draft party fills the stadium.' }; }
  if (k === 'ring') { const x = ownRingCands()[0]; (o.roh || (o.roh = [])).push({ n: x.n, pos: x.pos, yrs: x.yrs, s: state.season }); mv('fan', 3); o.brand = clamp(o.brand + 1, 0, 99); o.legacy += 1; ownLog(`${x.pos} ${x.n} goes into the ${myName()} Ring of Honor.`, 'big'); return { ok: true, txt: `${x.n} goes into the Ring of Honor.` }; }
  return { err: 'Unknown.' };
}

/* ---------- owner achievements ---------- */
const OWN_ACH = [
  ['expProfit', 'Profitable from day one', 'Turn a profit in an expansion club\'s first season.'], ['sbBuilt', 'The house that you built', 'Win a Super Bowl in a stadium you built.'],
  ['sellout', 'Sold out', 'Fill every seat at every home game in a season.'], ['billion', 'Billion-dollar club', 'Bring in $1 billion of revenue in a season.'],
  ['doubler', 'Double up', 'Double the club\'s value from what you paid.'], ['debtFree', 'Debt free', 'Pay off all of the club\'s debt.'],
  ['host', 'Host city', 'Host a Super Bowl.'], ['hof', 'Canton', 'Go into the Hall of Fame.'], ['dynasty', 'Dynasty', 'Win three Super Bowls as an owner.'],
  ['moved', 'New city, new team', 'Make the playoffs in your first season after a move.'], ['unanimous', 'Unanimous', 'Pass your own proposal without a single no vote.'],
  ['hands', 'Hands off', 'Five straight winning seasons with a hired GM and no meddling.'], ['district', 'A whole neighborhood', 'Finish the stadium district.'], ['ooy', 'Owner of the Year', 'Win Owner of the Year.'],
];
function ownAch(k) { const o = OWN(); o.ach = o.ach || {}; if (o.ach[k]) return; const a = OWN_ACH.find(x => x[0] === k); if (!a) return; o.ach[k] = state.season; addNews(`Owner achievement: ${a[1]}. ${a[2]}`, 'big'); state.achToast = a[1]; }
function ownAchSeason(row) {
  const o = OWN(); if (o.path === 'exp' && o.pnl.filter(r => r.tm === ME).length === 1 && row.net > 0) ownAch('expProfit');
  if (row.po === 5 && o.stad.build && o.stad.build.open && o.stad.build.open <= row.s) ownAch('sbBuilt'); if (row.fill >= 100 && row.hg >= 8) ownAch('sellout'); if (row.tr >= 1000) ownAch('billion');
  if (o.price && o.val >= o.price * 2) ownAch('doubler'); if (o.debt <= 0.5) ownAch('debtFree'); if (o.lg.sbHost === row.s) ownAch('host'); if (o.hof) ownAch('hof'); if ((o.sb || 0) >= 3) ownAch('dynasty');
  if (o.relo && o.relo.k === 'done' && o.relo.first == null) { o.relo.first = row.s; if (row.po >= 1) ownAch('moved'); }
  const last5 = o.pnl.slice(-5); if (last5.length === 5 && last5.every(r => r.w > r.l && r.gm !== 'self') && ownHands() && (o.ord || []).filter(x => x.s >= row.s - 4).length === 0) ownAch('hands');
}

/* ---------- a guided first season ---------- */
function ownGuide() {
  const o = OWN(); if (o.guideOff || o.pnl.length >= 1) return null; const L = PS();
  const steps = [
    ['price', 'Set your ticket prices', 'Business', 'obiz', !!o.biz.pricedAt || o.biz.price !== ownDefPrice(o.mkt) || ownPresOn()],
    ['front', 'Meet your GM and head coach', 'Front office', 'front', !!o.seen && !!o.seen.front],
    ['stad', 'Walk through your stadium', 'Stadium', 'ostad', !!o.seen && !!o.seen.ostad],
    ['vote', 'Vote at the owners\' meeting', 'League office', 'oleague', !!(o.lg.meet && (o.lg.meet.done || o.lg.meet.items.some(i => i.my))) || (o.lg.hist || []).length > 0],
    ['game', 'Watch your first game', 'Schedule', 'schedule', state.phase !== 'offseason' && state.week > 1],
  ];
  return steps;
}


/* ===================== v9.49: the owner pages, expanded ===================== */
Object.assign(OWN_LINE, { spons: 'General sponsors', deals: 'Sponsor deals', media: 'Local TV and radio', district: 'Stadium district', feat: 'Plaza and lounge' });
// horizontal bars: one color, sorted, value labels in text ink, hover tips (the game's chart styles)
function ownHBars(items, o) {
  o = o || {}; const n = items.length; if (!n) return `<p class="hint">${o.empty || 'No data yet.'}</p>`; const W = 440, rowH = 24, L = 168, Rr = 64, H = n * rowH + 8; const max = Math.max(...items.map(x => Math.abs(x.v)), 1e-9);
  const rows = items.map((x, i) => { const y = 4 + i * rowH; const w = Math.max(2, (W - L - Rr) * Math.abs(x.v) / max); return `<text x="${L - 8}" y="${y + 16}" text-anchor="end" class="ct">${esc(x.lbl.length > 27 ? x.lbl.slice(0, 26) + '…' : x.lbl)}</text><rect x="${L}" y="${y + 5}" width="${w.toFixed(1)}" height="${rowH - 10}" rx="4" class="cbar${x.v < 0 ? ' neg' : ''}"/><text x="${L + w + 6}" y="${y + 16}" class="ct">${esc(o.fmt ? o.fmt(x.v) : x.v)}</text><rect x="0" y="${y}" width="${W}" height="${rowH}" class="chit" data-tip="${esc(x.lbl + ': ' + (o.fmt ? o.fmt(x.v) : x.v))}"/>`; }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Chart')}">${rows}</svg></div>`;
}
function ownValueChart() {
  const o = OWN(); const vh = o.valHist.filter(v => v && Number.isFinite(v.v)); if (vh.length < 2) return '<p class="hint">The chart fills in after your first season.</p>';
  const lo = Math.min(...vh.map(v => v.v)), hi = Math.max(...vh.map(v => v.v)); const pad = Math.max(200, (hi - lo) * 0.15); const min = Math.max(0, Math.floor((lo - pad) / 500) * 500), max = Math.ceil((hi + pad) / 500) * 500; const step = Math.max(500, Math.round((max - min) / 4 / 500) * 500);
  const ticks = []; for (let v = min; v <= max; v += step) ticks.push(v);
  return lineChart(vh.map(v => ({ y: v.v, lbl: String(v.s), tip: `${v.s}: ${fmO(v.v)}` })), { min, max, yTicks: ticks, fmt: v => fmO(v), xLabels: vh.map((v, i) => [i, String(v.s)]).filter((x, i, a) => a.length <= 10 || i % 2 === 0 || i === a.length - 1), title: 'Club value by season', h: 190 });
}
const ownSel = (id, cur, opts) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${esc(String(v))}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
function ownPresCardHTML() {
  const o = ownB(); const p = o.bizP; const can = ownCan(); const ck = ui.confirm; const ng = ui.ownNeg && ui.ownNeg.kind === 'pres' ? ui.ownNeg : null;
  const cands = !p && can ? `<div class="coachgrid mt">${ownPresCands().filter(c => !c.no).map(c => `<div class="coach"><div class="cname">${esc(c.name)}</div><div class="hint">${esc(c.bg)}</div><div class="rt"><span><em>OVR</em>${c.ovr}</span></div><div class="small muted">${esc(OWN_PRES_STYLE[c.style][0])} · ${fmM(c.sal)} × ${c.yrs}</div><div class="row gap mt"><button class="btn sm" data-act="owhirepres" data-id="${c.id}">Hire</button><button class="btn ghost sm" data-act="ownegopen" data-k="pres" data-id="${c.id}">Offer less</button></div>${ng && ng.id === c.id ? ownNegForm('pres', c) : ''}</div>`).join('')}</div>` : '';
  return `<section class="card"><div class="eyebrow">Who runs the business</div>${can ? seg('owbizmode', o.bizMode, [['me', 'I do'], ['pres', 'A president I hire']]) : ''}
   ${p ? `<h3 class="h3 mt">${esc(p.name)} <span class="small muted">· ${p.ovr} · ${esc(OWN_PRES_STYLE[p.style][0])}</span></h3><p class="small muted">${esc(OWN_PRES_STYLE[p.style][1])} ${p.yrs} year${p.yrs === 1 ? '' : 's'} left at ${fmM(p.sal)} a year.</p>${o.bizMode === 'pres' ? '<p class="small">He sets prices before each season, takes the best sponsor and naming-rights offers, and runs ticketing. A good president earns more from sponsors and premium seats.</p>' : '<p class="small">He\'s on staff, but you\'re making the business calls yourself right now.</p>'}${can ? (ck === 'firepres' ? '<div class="row gap"><button class="btn danger sm" data-act="owfirepres">Confirm: let him go</button><button class="btn ghost sm" data-act="ask" data-k="">Keep him</button></div>' : '<button class="btn ghost sm" data-act="ask" data-k="firepres">Let him go</button>') : ''}`
    : `<p class="small">You run the business yourself. A president would set prices, sign sponsors and run ticketing for you.</p>${cands}`}</section>`;
}
function ownNegForm(kind, c) { const s = kind === 'hc' ? c.salary : c.sal, y = kind === 'hc' ? c.years : c.yrs; return `<div class="decision mt"><div class="fgrid"><label class="fld"><span>$M a year</span><input id="ow-ns" type="number" step="0.1" value="${r2(s * 0.88)}"></label><label class="fld"><span>Years</span><input id="ow-ny" type="number" min="1" max="7" value="${y}"></label></div><button class="btn sm" data-act="owneg" data-k="${kind}" data-id="${c.id}">Make the offer</button>${ui.ownNeg && ui.ownNeg.msg ? `<p class="small">${esc(ui.ownNeg.msg)}</p>` : ''}</div>`; }
function ownTixCardHTML() {
  const o = ownB(); const b = o.biz; const def = ownDefPrice(o.mkt) * ownG(); const man = ownCan() && !ownPresOn();
  const ro = (l, v) => `<div class="setrow"><div class="sl"><b>${l}</b></div><div class="sctl">${v}</div></div>`;
  return `<section class="card"><div class="eyebrow">Tickets and prices${ownPresOn() ? ' · set by your president' : ''}</div><h2 class="h3">$${b.price} average ticket</h2>
   <p class="small">The going rate in your market is about $${Math.round(def)}. Expect the stadium about <b>${Math.round(ownFill() * 100)}%</b> full (${Math.round(ownFill() * o.stad.cap).toLocaleString()} of ${o.stad.cap.toLocaleString()}). Season-ticket waiting list: <b>${b.wait.toLocaleString()}</b>.</p>
   ${man ? `<div class="fgrid"><label class="fld"><span>Average ticket ($)</span><input id="ow-price" type="number" min="20" step="5" value="${b.price}"></label></div><button class="btn sm" data-act="owprice">Set the price</button>
   ${setRow('Concessions and parking', 'Higher prices bring in more and annoy fans.', seg('owconc', String(b.conc), [['0.8', 'Fan friendly'], ['1', 'Normal'], ['1.2', 'Premium'], ['1.4', 'Gouging']]))}
   ${setRow('Season-ticket discount', 'Cheaper for the loyal base: more of them renew.', seg('owtix', String(b.stDisc), [['0', 'None'], ['0.05', '5%'], ['0.1', '10%'], ['0.15', '15%']], 'data-k="stDisc"'))}
   ${setRow('Premium seat prices', 'Suites and club seats. Higher prices, fewer buyers.', seg('owtix', String(b.prem), [['0.85', 'Low'], ['1', 'Normal'], ['1.15', 'High'], ['1.3', 'Top dollar']], 'data-k="prem"'))}
   ${setRow('Family section', 'Half-price seats for families: a little less money, happier fans.', seg('owtix', b.family ? 'on' : 'off', [['on', 'On'], ['off', 'Off']], 'data-k="family"'))}
   ${setRow('Student section', 'Cheap seats behind the end zone: young fans grow into season-ticket holders.', seg('owtix', b.students ? 'on' : 'off', [['on', 'On'], ['off', 'Off']], 'data-k="students"'))}`
    : `<p class="small muted">Concessions ${({ 0.8: 'fan friendly', 1: 'normal', 1.2: 'premium', 1.4: 'gouging' })[b.conc] || 'normal'} · season-ticket discount ${Math.round(b.stDisc * 100)}% · premium prices ×${b.prem} · family section ${b.family ? 'on' : 'off'} · student section ${b.students ? 'on' : 'off'}.</p>`}
   <p class="hint">Fans react to prices when the season starts: a big jump costs goodwill.</p></section>`;
}
function ownSurveyHTML() { const s = OWN().survey; if (!s) return ''; const m = (l, v) => meter(l, v, ''); return `<section class="card"><div class="eyebrow">Fan survey · ${s.s}</div>${m('Value for money', s.value)}${m('Game-day experience', s.exp)}${m('The team', s.team)}<p class="small"><b>Overall ${s.all}.</b> What fans said most: ${esc(s.quote)}</p></section>`; }
function ownSponHTML() {
  const o = ownB(); const can = ownCan() && !ownPresOn(); const act = Object.entries(o.spons).filter(([, d]) => d && d.end >= state.season);
  const offers = (o.sOff || []).filter(f => !f.done);
  return `<section class="card"><div class="eyebrow">Sponsors · ${fmMs(ownSponRev())} a year in deals</div>
   ${act.length ? `<ul class="plainlist small">${act.map(([k, d]) => `<li><b>${esc(OWN_SPON[k].t)}:</b> ${esc(d.co)}, ${fmMs(d.amt)} a year through ${d.end}</li>`).join('')}</ul>` : '<p class="small muted">No sponsor deals yet.</p>'}
   ${offers.length ? `<div class="eyebrow mt">Offers${ownPresOn() ? ' (your president will take the good ones)' : ''}</div>${offers.map(f => `<div class="decision mt"><b>${esc(OWN_SPON[f.slot].t)}: ${esc(f.co)}</b> · ${fmMs(f.amt)} a year for ${f.yrs} years<div class="small muted">${esc(OWN_SPON[f.slot].d)}</div>${can ? `<div class="row gap mt"><button class="btn sm" data-act="owspon" data-id="${f.id}" data-v="yes">Sign</button>${f.asked ? '' : `<button class="btn ghost sm" data-act="owspon" data-id="${f.id}" data-v="more">Ask for 15% more</button>`}<button class="btn ghost sm" data-act="owspon" data-id="${f.id}" data-v="no">Pass</button></div>` : ''}</div>`).join('')}<p class="hint">Offers you don't sign go away when the season starts.</p>` : ''}
   ${!o.lg.patch ? '<p class="hint">Jersey patches need the owners\' approval first.</p>' : ''}</section>`;
}
function ownMediaHTML() {
  const o = ownB(); const M = o.media; const off = state.phase === 'offseason'; const due = M.k === 'net' && M.end <= state.season;
  return `<section class="card"><div class="eyebrow">Local TV and radio · ${fmMs(ownMediaRev())} a year</div>
   <p class="small">${M.k === 'own' ? `The club's own channel, since ${M.yr0}. It grows for about four seasons, then pays more than a network would.` : `A deal with a local network through ${M.end}.`}</p>
   ${ownCan() && off && (due || M.k !== 'own') ? `<div class="row gap wrap">${due ? '<button class="btn sm" data-act="owmedia" data-v="net">Sign a new network deal</button>' : ''}${M.k !== 'own' && due ? `<button class="btn ghost sm" data-act="owmedia" data-v="own">Start your own channel (${fmMs(30 * ownG())})</button>` : ''}</div>${due ? '' : `<p class="hint">You can decide when the deal runs out after ${M.end}.</p>`}` : ''}</section>`;
}
function ownStakeHTML() {
  const o = OWN(); if (!ownCan()) return '';
  return `<section class="card"><div class="eyebrow">Your share of the club · ${Math.round(o.pct * 100)}%</div><p class="small">Sell 5% to your partners for about ${fmO(ownEquity() * 0.05 * 0.95)}, or buy 5% back for about ${fmO(ownEquity() * 0.05 * 1.04)}. You must keep at least 30%.</p>
   <div class="row gap wrap"><button class="btn ghost sm" data-act="owpiece" data-v="sell">Sell 5%</button><button class="btn ghost sm" data-act="owpiece" data-v="buy">Buy 5% back</button>${o.lg.pe ? (o.pe ? `<button class="btn ghost sm" data-act="owpe" data-v="out">Buy out ${esc(o.pe.fund)}</button>` : '<button class="btn ghost sm" data-act="owpe" data-v="in">Sell 10% to a private-equity fund</button>') : ''}</div>
   ${o.pe ? `<p class="hint">${esc(o.pe.fund)} owns 10% and requires at least half the profits paid out.</p>` : o.lg.pe ? '<p class="hint">A fund\'s 10% goes into the club\'s bank, and everyone\'s share shrinks a little.</p>' : ''}</section>`;
}
vOwnBiz = function () {
  const o = ownB(); const Y = o.ytd; const R_ = ownRevLines(state.season); const E_ = ownExpLines(); const g1 = ownGate(false); const homeN = 8.5;
  const projRev = Object.assign({ nat: R_.nat, gate: g1.gate * homeN, prem: R_.prem, conc: (g1.conc + g1.park) * homeN }, R_, { share: ownShareAdj(g1.gate * 8.5) }); delete projRev.park;
  const projExp = Object.assign({ players: payrollOf(ME) }, E_); const tr = Object.values(projRev).reduce((a, b) => a + b, 0), te = Object.values(projExp).reduce((a, b) => a + b, 0);
  const lbl = k => (k === 'conc' ? 'Concessions and parking' : OWN_LINE[k] || k); const last = o.pnl[o.pnl.length - 1];
  const hist = o.pnl.slice().reverse().slice(0, 15).map(r => `<tr><td>${r.s}</td><td class="small">${esc(nflNick(r.tm))}</td><td class="num">${r.w}-${r.l}</td><td class="num">${fmO(r.tr)}</td><td class="num">${fmO(r.te)}</td><td class="num ${r.net >= 0 ? 'pos' : 'neg'}">${fmMs(r.net)}</td><td class="num">${fmMs(r.mine)}</td><td class="num">${fmO(r.val)}</td><td class="num">${r.fill}%</td></tr>`).join('');
  const mix = Object.entries(last ? last.rev : projRev).filter(([, v]) => Math.abs(v) >= 0.5).map(([k, v]) => ({ lbl: lbl(k), v: r1(v) })).sort((a, b) => b.v - a.v);
  const emix = Object.entries(last ? last.exp : projExp).filter(([, v]) => v >= 0.5).map(([k, v]) => ({ lbl: lbl(k), v: r1(v) })).sort((a, b) => b.v - a.v);
  const can = ownCan();
  return `${ownLocked()}<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">Club value</div><h2 class="h3">${fmO(o.val)}</h2>${ownValueChart()}</section>
   <section class="card"><div class="eyebrow">${last ? `${last.s} · where the money came from` : 'Where the money comes from (projected)'}</div>${ownHBars(mix, { fmt: v => fmMs(v), title: 'Revenue by source' })}
    <div class="eyebrow mt">${last ? 'Where it went' : 'Where it goes'}</div>${ownHBars(emix, { fmt: v => fmMs(v), title: 'Expenses by line' })}</section>
   <section class="card"><div class="eyebrow">${state.phase === 'offseason' ? state.season + 1 + ' · next season, projected' : state.season + ' · a full season, projected'}</div><h2 class="h3">${tr - te >= 0 ? 'Profit' : 'Loss'} of about ${fmMs(Math.abs(tr - te))}</h2>
    <details><summary>Every line</summary><div class="tw"><table class="tbl small"><tbody>${Object.entries(projRev).map(([k, v]) => `<tr><td>${esc(lbl(k))}</td><td class="num">${fmMs(v)}</td></tr>`).join('')}<tr><td><b>Revenue</b></td><td class="num"><b>${fmO(tr)}</b></td></tr>${Object.entries(projExp).map(([k, v]) => `<tr><td>− ${esc(lbl(k))}</td><td class="num">${fmMs(v)}</td></tr>`).join('')}<tr><td><b>Expenses</b></td><td class="num"><b>${fmO(te)}</b></td></tr></tbody></table></div></details>
    ${state.phase !== 'offseason' ? `<div class="tiles mt">${ownTile('Home games', Y.games)}${ownTile('Average crowd', Y.games ? Math.round(Y.att / Y.games).toLocaleString() : '—')}${ownTile('Tickets so far', fmMs(Y.gate + Y.poGate))}</div>` : ''}</section>
   ${ownSurveyHTML()}
  </div><div class="col">${ownPresCardHTML()}${ownTixCardHTML()}${ownSponHTML()}${ownMediaHTML()}
   <section class="card"><div class="eyebrow">The club's money</div><div class="tiles">${ownTile('Bank', fmMs(o.bank), '', o.bank < 0 ? 'neg' : '')}${ownTile('Debt', fmO(o.debt), `limit ${fmO(ownDebtLimit())}`)}${ownTile('Interest', fmMs(o.debt * o.rate) + '/yr')}</div>
    ${can ? `<div class="row gap wrap mt"><button class="btn ghost sm" data-act="owborrow" data-v="100">Borrow $100M</button><button class="btn ghost sm" data-act="owrepay" data-v="100">Pay down $100M</button><button class="btn ghost sm" data-act="owrepay" data-v="99999">Pay down all you can</button><button class="btn ghost sm" data-act="owinvest" data-v="100">Put in $100M of your own</button></div>
    ${setRow('Profits paid out', `What isn't paid out stays in the bank. You get ${Math.round(o.pct * 100)}% of every payout.`, seg('owpay', String(o.biz.pay), [['0', 'None'], ['0.25', '25%'], ['0.5', '50%'], ['0.75', '75%'], ['1', 'All']]))}` : ''}</section>
   ${ownStakeHTML()}
  </div></div>
  <section class="card"><div class="eyebrow">Season by season</div>${hist ? `<div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>Club</th><th>W-L</th><th class="num">Revenue</th><th class="num">Expenses</th><th class="num">Net</th><th class="num">To you</th><th class="num">Value</th><th class="num">Full</th></tr></thead><tbody>${hist}</tbody></table></div>` : '<p class="muted">The first season\'s books close after the Super Bowl.</p>'}</section>`;
};

/* ---------- the stadium: features, district, insurance, the world ---------- */
{ const _st = vOwnStad; vOwnStad = function () {
  const o = OWN(); const s = o.stad; const can = ownCan(); const F = ownFeat(); const D = o.dist || { n: 0 };
  const feats = Object.entries(OWN_FEAT).map(([k, f]) => { const why = ownFeatOk(k); const have = k === 'turf' ? F.field === 'turf' : k === 'grass' ? F.field === 'grass' : F[k]; return `<tr><td><b>${esc(f.t)}</b><div class="small muted">${esc(f.d)} ${esc(f.fx)}.</div></td><td class="num">${fmMs(f.c * ownG())}</td><td>${have ? `<span class="pill good">${k === 'turf' || k === 'grass' ? 'Current field' : 'Done'}</span>` : can && !why ? `<button class="btn sm" data-act="owfeat" data-k="${k}">Build</button>` : `<span class="small muted">${esc(why)}</span>`}</td></tr>`; }).join('');
  const dist = OWN_DIST.map((ph, i) => `<li>${i < D.n ? '<span class="pill good">Open</span>' : D.build && D.build.i === i ? `<span class="pill">Opens ${D.build.done}</span>` : '<span class="pill ghost">Planned</span>'} <b>${esc(ph.t)}</b> · ${fmO(ph.c * ownG())} · about ${fmMs(ph.rev * ownG())} a year<div class="small muted">${esc(ph.d)}</div></li>`).join('');
  const dwhy = ownDistOk(); const off = state.phase === 'offseason'; const I = o.intl;
  const extra = `<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">Stadium features · field: ${F.field === 'turf' ? 'artificial turf' : 'natural grass'}</div><div class="tw"><table class="tbl"><tbody>${feats}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Insurance</div><p class="small">Storms and power failures are rare, but they move home games and cost millions. Insurance covers 80% of repairs for ${fmMs((2 + s.cap / 30000) * ownG())} a year.</p>${can ? seg('owins', o.ins ? 'on' : 'off', [['on', 'Insured'], ['off', 'Not insured']]) : ''}${o.dis ? `<p class="small">Last damage: ${o.dis.s}, week ${o.dis.wk}, ${fmMs(o.dis.cost)}${o.dis.covered ? `, insurance paid ${fmMs(o.dis.covered)}` : ''}.</p>` : ''}</section>
  </div><div class="col">
   <section class="card"><div class="eyebrow">The stadium district · ${fmMs(ownDistRev())} a year</div><ul class="plainlist">${dist}</ul>${can && !dwhy ? `<button class="btn sm" data-act="owdist">Start the next phase</button>` : `<p class="hint">${esc(dwhy)}</p>`}</section>
   <section class="card"><div class="eyebrow">International games</div><p class="small">Give up one home game to play abroad: the brand and merchandise grow, the league office is pleased, local fans lose a game.${o.lg.intlMore ? '' : ' Once every two seasons, unless the owners vote for more.'}</p>
    ${I && I.s >= state.season ? `<p class="flash">${esc(I.city)}, ${I.s}${I.done ? '' : ' (scheduled)'}.</p>` : can && off ? `<div class="fgrid"><label class="fld"><span>City</span>${ownSel('ow-intl', 'London', OWN_INTL.map(c => [c, c]))}</label></div><button class="btn ghost sm" data-act="owintl">Play a home game there next season</button>` : '<p class="hint">Set in the offseason.</p>'}</section>
  </div></div>`;
  return _st() + extra;
}; }

/* ---------- the league office: the owners and the awards ---------- */
{ const _lg = vOwnLeague; vOwnLeague = function () {
  const o = OWN(); const O = ownOwners(); const off = state.phase === 'offseason' && ownCan(); const court = o.court && o.court.s === state.season ? 2 - o.court.n : 2;
  const rows = Object.entries(O).sort((a, b) => b[1].rel - a[1].rel).map(([tid, w]) => `<tr><td>${tchip(tid)}</td><td><b>${esc(w.name)}</b>${w.grudge ? ' <span class="pill bad">Grudge</span>' : ''}<div class="small muted">${esc(OWN_OSTYLE[w.style][0])} · owner since ${w.since}</div></td><td class="num">${Math.round(w.rel)}</td><td class="num small">${w.votes ? `${w.agree} of ${w.votes}` : '—'}</td><td>${off && court > 0 ? `<button class="btn ghost sm" data-act="owcourt" data-id="${tid}">Dinner</button>` : ''}</td></tr>`).join('');
  const aw = (o.awards || [])[0];
  const styles = Object.entries(OWN_OSTYLE).map(([k, v]) => { const g = Object.values(O).filter(w => w.style === k); return g.length ? `<li><b>${v[0]}s (${g.length}):</b> ${esc(v[1])} Average relationship ${Math.round(g.reduce((s, w) => s + w.rel, 0) / g.length)}.</li>` : ''; }).join('');
  return _lg() + `<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">The other owners</div><p class="small">They remember how you vote, what you say about them, and who did them a favor. Votes are counted owner by owner.${off ? ` Dinners left this offseason: <b>${court}</b>.` : ''}</p>
    <div class="tw"><table class="tbl"><thead><tr><th>Club</th><th>Owner</th><th class="num">With you</th><th class="num">Agreed</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>
  </div><div class="col">
   <section class="card"><div class="eyebrow">Voting blocs</div><ul class="plainlist small">${styles}</ul></section>
   <section class="card"><div class="eyebrow">League awards${aw ? ' · ' + aw.s : ''}</div>${aw ? `<ul class="plainlist"><li><b>Coach of the Year:</b> ${esc(aw.coy[1])} (${esc(teamName(aw.coy[0]))})</li><li><b>Executive of the Year:</b> ${esc(aw.eoy[1])} (${esc(teamName(aw.eoy[0]))})</li><li><b>Owner of the Year:</b> ${esc(aw.ooy[1])} (${esc(teamName(aw.ooy[0]))})</li></ul>` : '<p class="muted">Handed out after the Super Bowl.</p>'}
    ${(o.awards || []).filter(a => [a.coy[0], a.eoy[0], a.ooy[0]].includes(ME)).length ? `<p class="small">Your club's awards: ${(o.awards || []).filter(a => a.ooy[0] === ME).length} Owner of the Year, ${(o.awards || []).filter(a => a.eoy[0] === ME).length} Executive of the Year, ${(o.awards || []).filter(a => a.coy[0] === ME).length} Coach of the Year.</p>` : ''}</section>
  </div></div>`;
}; }

/* ---------- the front office: contracts ---------- */
function ownExtHTML() {
  const o = OWN(); const E = (o.ext || []); if (!E.length || !ownCan()) return '';
  return `<section class="card decision"><div class="eyebrow">Contracts running out</div>${E.map(e => `<div class="row gap wrap mt"><span><b>${esc(e.name)}</b> (${e.k === 'hc' ? 'head coach' : e.k === 'gm' ? 'GM' : 'president'}) wants ${fmM(e.sal)} a year for ${e.yrs} more years.</span><button class="btn sm" data-act="owext2" data-k="${e.k}" data-v="yes">Extend</button><button class="btn ghost sm" data-act="owext2" data-k="${e.k}" data-v="no">Let him go</button></div>`).join('')}<p class="hint">Undecided when you move past the front-office step: winners stay, the rest go.</p></section>`;
}
{ const _f = vOwnFront; vOwnFront = function () {
  let h = _f(); const ng = ui.ownNeg;
  // a "make an offer" button on every candidate card, and the offer form under the one you picked
  h = h.replace(/<button class="btn sm mt" data-act="owhiregm" data-id="([^"]+)">Hire<\/button>/g, (m, id) => `<div class="row gap mt"><button class="btn sm" data-act="owhiregm" data-id="${id}">Hire at his price</button><button class="btn ghost sm" data-act="ownegopen" data-k="gm" data-id="${id}">Offer less</button></div>${ng && ng.kind === 'gm' && ng.id === id ? ownNegForm('gm', ownNegCand('gm', id)) : ''}`);
  h = h.replace(/<button class="btn sm mt" data-act="owhirehc" data-id="([^"]+)">Hire<\/button>/g, (m, id) => `<div class="row gap mt"><button class="btn sm" data-act="owhirehc" data-id="${id}">Hire at his price</button><button class="btn ghost sm" data-act="ownegopen" data-k="hc" data-id="${id}">Offer less</button></div>${ng && ng.kind === 'hc' && ng.id === id && ownNegCand('hc', id) ? ownNegForm('hc', ownNegCand('hc', id)) : ''}`);
  return ownExtHTML() + h;
}; }

/* ---------- the office: the guide, owner moments, contracts ---------- */
function ownGuideHTML() {
  const st = ownGuide(); if (!st) return ''; const done = st.filter(x => x[4]).length;
  return `<section class="card next"><div class="head"><div><div class="eyebrow">Your first season · ${done} of ${st.length}</div><h2 class="h3">Getting started as an owner</h2></div><button class="btn ghost sm" data-act="owguideoff">Hide</button></div><ol class="plainlist">${st.map(([k, t, tab, key, ok]) => `<li>${ok ? '<span class="pill good">Done</span>' : '<span class="pill">To do</span>'} ${esc(t)} <button class="lnk small" data-act="tab" data-tab="${key}">${esc(tab)}</button></li>`).join('')}</ol><p class="hint">Everything else can wait: your GM and head coach run the team, and the Business tab shows where the money comes from.</p></section>`;
}
function ownMomentsHTML() {
  const o = OWN(); if (!ownCan()) return ''; const T_ = ownTime();
  const btns = Object.entries(OWN_MOM).map(([k, m]) => { const why = ownMomentOk(k); return `<div class="setrow"><div class="sl"><b>${esc(m.t)}</b><span class="hint">${esc(why || m.d)}</span></div><div class="sctl"><button class="btn ghost sm" data-act="owmom" data-k="${k}" ${why ? 'disabled' : ''}>Do it</button></div></div>`; }).join('');
  return `<section class="card"><div class="eyebrow">Owner moments · ${T_.n} left this season</div>${btns}${(o.roh || []).length ? `<p class="small">Ring of Honor: ${o.roh.map(x => esc(x.n)).join(', ')}.</p>` : ''}</section>`;
}
{ const _o = vOwnOffice; vOwnOffice = function () { const h = _o(); const pre = ownGuideHTML() + ownExtHTML(); const i = h.indexOf('<div class="col">', h.indexOf('<div class="grid2">')); const j = h.lastIndexOf('<div class="col">'); return h.slice(0, i + 17) + pre + h.slice(i + 17, j + 17) + ownMomentsHTML() + h.slice(j + 17); }; }

/* ---------- legacy: achievements and the all-time owners ---------- */
{ const _l = vOwnLegacy; vOwnLegacy = function () {
  const o = OWN(); const A = o.ach || {}; const O = ownOwners(); const mine = Math.round(o.legacy + (o.legacyOld || 0));
  const rank = Object.entries(O).map(([tid, w]) => ({ n: w.name, tm: tid, v: ownAiLegacy(tid) })).concat([{ n: o.name, tm: ME, v: mine, me: true }]).sort((a, b) => b.v - a.v); const r = rank.findIndex(x => x.me) + 1;
  return _l() + `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">Owner achievements · ${Object.keys(A).length} of ${OWN_ACH.length}</div><ul class="plainlist small">${OWN_ACH.map(([k, t, d]) => `<li>${A[k] ? `<span class="pill good">${A[k]}</span>` : '<span class="pill ghost">Locked</span>'} <b>${esc(t)}</b>: ${esc(d)}</li>`).join('')}</ul></section></div>
   <div class="col"><section class="card"><div class="eyebrow">The owners, by legacy</div><p class="small">You rank <b>${r}</b> of ${rank.length}.</p><div class="tw"><table class="tbl small"><tbody>${rank.slice(0, 10).map((x, i) => `<tr class="${x.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(x.n)}</td><td>${esc(nflNick(x.tm))}</td><td class="num">${x.v}</td></tr>`).join('')}${r > 10 ? `<tr class="me"><td>${r}</td><td>${esc(o.name)}</td><td>${esc(nflNick(ME))}</td><td class="num">${mine}</td></tr>` : ''}</tbody></table></div></section></div></div>`;
}; }

/* ---------- the franchise's history ---------- */
function vOwnHistory() {
  const o = OWN(); const L = PS(); const t = T(ME); const champs = (L.champs || []).filter(c => c.tm === ME).map(c => c.s); const confs = (L.champs || []).filter(c => c.ru === ME).map(c => c.s).concat(champs).sort();
  const hs = (t.hist || []).slice(); if (state.phase === 'offseason' && t.w + t.l > 0 && !hs.some(h => h.s === state.season)) hs.push({ s: state.season, w: t.w, l: t.l });
  const seasons = hs.reverse().map(h => { const p = (L.hist || []).find(x => x.s === h.s && x.tm === ME); const r = o.pnl.find(x => x.s === h.s && x.tm === ME); return `<tr><td>${h.s}</td><td class="num">${h.w}-${h.l}</td><td>${p ? esc(PO_LABEL[p.po]) : ''}</td><td class="small">${r ? esc(o.name) : ''}</td><td class="num">${r ? fmO(r.val) : ''}</td></tr>`; }).join('');
  const owners = (o.prev || []).filter(x => x.tm === ME).map(x => `<li><b>${x.from}–${x.to}</b>: ${x.w}-${x.l}${x.sb ? `, ${x.sb} Super Bowl${x.sb > 1 ? 's' : ''}` : ''}</li>`).join('') + `<li><b>${o.since}–</b>: ${esc(o.name)}${o.gen > 1 ? ` (generation ${o.gen})` : ''}</li>`;
  const ring = (o.roh || []).map(x => `<li>${x.pos} <b>${esc(x.n)}</b> · ${x.yrs} seasons · inducted ${x.s}</li>`).join(''); const greats = (L.ring || []).filter(x => !(o.roh || []).some(y => y.n === x.n)).map(x => `<li>${x.pos} ${esc(x.n)} · ${x.yrs} seasons with the club</li>`).join('');
  const museum = (o.log || []).filter(x => x.big && x.tm === ME).slice().reverse().slice(-20).reverse().map(x => `<li><span class="when">${x.s}</span>${esc(x.txt)}</li>`).join('');
  return `<section class="card"><div class="eyebrow">Franchise history</div><h2 class="h2">${esc(myName())}</h2><div class="row gap wrap">${ownLogoSVG(o.logo, 64)}<div class="tiles">${ownTile('Super Bowls', champs.length, champs.join(', '))}${ownTile('Conference titles', confs.length)}${ownTile('Ring of Honor', (o.roh || []).length)}</div></div>${champs.length ? `<p class="small">Banners: ${champs.map(s => `<span class="pill maize">${s} champions</span>`).join(' ')}</p>` : ''}</section>
  <div class="grid2"><div class="col"><section class="card"><div class="eyebrow">Season by season</div><div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>W-L</th><th>Result</th><th>Owner</th><th class="num">Value</th></tr></thead><tbody>${seasons || '<tr><td colspan="5" class="muted">No seasons yet.</td></tr>'}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Owners</div><ul class="plainlist small">${owners}</ul></section></div>
  <div class="col"><section class="card"><div class="eyebrow">Ring of Honor</div>${ring ? `<ul class="plainlist small">${ring}</ul>` : '<p class="muted small">Empty so far.</p>'}${greats ? `<div class="eyebrow mt">Waiting for their moment</div><ul class="plainlist small">${greats}</ul><p class="hint">Induct them from Owner moments on the Owner's suite.</p>` : ''}</section>
   <section class="card"><div class="eyebrow">The club museum</div>${museum ? `<ul class="news">${museum}</ul>` : '<p class="muted small">The big moments collect here.</p>'}</section></div></div>`;
}
{ const _v = ownViewFor; ownViewFor = function (tab) { if (tab === 'history') return vOwnHistory; const v = _v(tab); if (v && ['front', 'ostad'].includes(tab)) { const o = OWN(); o.seen = o.seen || {}; o.seen[tab] = true; } return v; }; }


/* ===================== v9.49: actions for the new owner features ===================== */
Object.assign(actions, {
  owhirepres(d) { const r = ownHirePres(d.id); after(r.err || ''); },
  owfirepres() { ui.confirm = null; const r = ownFirePres(); after(r.err || ''); },
  owbizmode(d) { const r = ownSetBizMode(d.v); after(r.err || ''); },
  ownegopen(d) { ui.ownNeg = ui.ownNeg && ui.ownNeg.id === d.id ? null : { kind: d.k, id: d.id }; render(); },
  owneg(d) { const r = ownNeg(d.k, d.id, owNum('ow-ns', 0), owNum('ow-ny', 3)); if (r.err) return after(r.err); ui.ownNeg = r.res === 'counter' ? { kind: d.k, id: d.id, msg: r.txt } : null;
    if (r.res === 'yes') { const h = d.k === 'gm' ? ownHireGM(d.id) : d.k === 'hc' ? ownHireHC(d.id) : ownHirePres(d.id); return after(h && h.err ? h.err : r.txt); } after(r.txt); },
  owtix(d) { ownSetTix(d.k, d.v); after(); },
  owspon(d) { if (d.v === 'yes') { const r = ownSponTake(d.id); return after(r.err || ''); } if (d.v === 'no') { ownSponDecline(d.id); return after(); } const r = ownSponCounter(d.id); after(r.txt || r.err); },
  owmedia(d) { const r = ownMediaChoose(d.v); after(r.err || ''); },
  owpiece(d) { const r = d.v === 'sell' ? ownSellPiece() : ownBuyPiece(); after(r.err || ''); },
  owpe(d) { const r = d.v === 'in' ? ownPeIn() : ownPeOut(); after(r.err || ''); },
  owfeat(d) { const r = ownFeatBuild(d.k); after(r.err || ''); },
  owdist() { const r = ownDistStart(); after(r.err || ''); },
  owins(d) { ownInsure(d.v === 'on'); after(); },
  owintl() { const r = ownIntlAsk(owVal('ow-intl')); after(r.err || ''); },
  owcourt(d) { const r = ownCourt(d.id); after(r.err || r.txt); },
  owext2(d) { const r = ownExtend(d.k, d.v === 'yes'); after(r.err || ''); },
  owguideoff() { OWN().guideOff = true; after(); },
  owmom(d) { const r = ownMoment(d.k); after(r.err || r.txt); },
});
{ const f = actions.owprice; actions.owprice = function (d) { OWN().biz.pricedAt = state.season; return f.call(this, d); }; }

/* ===================== v9.49: wiring the new owner features into the season ===================== */
delete OWN_PROJ.board;
// a club you buy comes with some sponsor deals already signed
{ const _i = ownInitClub; ownInitClub = function () { _i(); const o = ownB(); if (o.path === 'exp') return; Object.entries(OWN_SPON).forEach(([k, d]) => { if (d.need || ownH('seed:' + k + ':' + ME) > 0.7) return; const key = 'sd:' + ME + ':' + k; o.spons[k] = { co: ownPick(OWN_SPON_CO[k], key), amt: r1(d.base(o.mkt) * (0.8 + o.brand / 220) * ownG()), end: state.season + 1 + Math.floor(ownH(key + 'y') * 4) }; }); }; } // the video board is a stadium feature now
{ const _r = ownRevLines; ownRevLines = function (yr) {
  const o = ownB(); const R_ = _r(yr); const pf = ownPresF();
  R_.spons = r1(R_.spons * 0.5 * pf); R_.deals = ownSponRev(); R_.media = ownMediaRev(); R_.prem = r1(R_.prem * Math.pow(o.biz.prem, 0.55) * pf);
  R_.district = ownDistRev(); R_.feat = ownFeatRev(); return R_;
}; }
{ const _e = ownExpLines; ownExpLines = function () { const o = ownB(); const E_ = _e(); E_.staff = r1(E_.staff + (o.bizP ? o.bizP.sal : 0)); E_.ops = r1(E_.ops + ownFeatCost() + ownInsCost()); return E_; }; }
{ const _s = ownSeasonStart; ownSeasonStart = function () {
  const o = OWN(); if (!o || o.pending) return _s(); ownB(); ownOwners(); ownFeat();
  ownMediaAuto();
  ownDistTick(); ownPresRun(); _s(); ownIntlApply(); ownTime();
  if (o.biz.students) o.brand = clamp(o.brand + 0.3, 0, 99); if (o.biz.family) mv('fan', 1);
}; }
{ const _w = ownWeek; ownWeek = function (wk, mg) { _w(wk, mg); const o = OWN(); if (o && !o.pending && state.phase !== 'offseason') ownDisasterCheck(wk); }; }
{ const _e = ownSeasonEnd; ownSeasonEnd = function () {
  const o = OWN(); _e(); if (!o || o.pending || o.out) return; const row = o.pnl[o.pnl.length - 1];
  ownContractsTick(); ownSurvey(); ownSponOffers(); ownAwards(); if (row) ownAchSeason(row); ownPresRun();
}; }
{ const _es = ownEnsureStaff; ownEnsureStaff = function () { if (OWN() && !OWN().pending) ownExtAuto(); return _es(); }; }
// the owner who mocks your club has a name now, and remembers your answer
{ const _n = ownEvNew; ownEvNew = function (wk) { _n(wk); const o = OWN(); if (o.ev && o.ev.k === 'rival') { const O = ownOwners(); const ids = Object.keys(O).sort((a, b) => (O[a].style === 'mav' ? -1 : 0) - (O[b].style === 'mav' ? -1 : 0)); const tid = ids[Math.floor(ownH('rvl:' + state.season + ':' + wk) * Math.min(6, ids.length))]; o.ev.tid = tid; o.ev.x = `${O[tid].name}, owner of the ${teamName(tid)}, calls your club "a nice little hobby" on the radio.`; } }; }
{ const _a = ownEvAnswer; ownEvAnswer = function (key, auto) { const o = OWN(); const ev = o.ev; const r = _a(key, auto); if (ev && ev.tid && o.owners && o.owners[ev.tid]) { const w = o.owners[ev.tid]; if (key === 'fire') { w.rel = clamp(w.rel - 15, 0, 100); w.grudge = true; } else if (key === 'laugh') w.rel = clamp(w.rel + 4, 0, 100); else w.rel = clamp(w.rel - 2, 0, 100); } return r; }; }


