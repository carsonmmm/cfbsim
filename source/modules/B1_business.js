
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
