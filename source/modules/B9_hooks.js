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
