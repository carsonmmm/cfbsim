
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
