
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
