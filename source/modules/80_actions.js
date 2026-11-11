
/* ---------- Owner mode: actions ---------- */
const owVal = id => { const el = document.getElementById(id); return el ? el.value : ''; };
const owNum = (id, d) => { const v = parseFloat(owVal(id)); return Number.isFinite(v) ? v : d; };
function ownSellStake() { const o = OWN(); const gross = r1(Math.max(0, (o.val - o.debt) * o.pct)); o.cash = r1(o.cash + gross); ownArchive({ how: 'sold', price: o.val, net: gross }); o.partner = null; o.pct = 0; o.out = { k: 'sold', s: state.season, txt: `You sold your ${Math.round(o.pct * 100)}% for ${fmO(gross)}.` }; ownLog(o.out.txt); return { ok: true }; }
function ownReadIntro() { const S = cui.own; if (!S) return; const n = owVal('ows-name'); if (n || document.getElementById('ows-name')) S.f.name = String(n).trim().slice(0, 30); const sr = owVal('ows-src'); if (sr) S.f.src = sr; }
function ownReadBuy() { const f = ui.ownBuy || (ui.ownBuy = {}); if (document.getElementById('ow-bid')) f.bid = Math.round(owNum('ow-bid', f.bid || 0)); if (document.getElementById('ow-debt')) f.debt = Math.round(owNum('ow-debt', f.debt || 0)); if (document.getElementById('ow-mine')) f.mine = Math.round(owNum('ow-mine', f.mine || 0)); return f; }
function ownFinishSetup(msg) {
  const S = cui.own; const o = OWN(); o.pending = false; setActiveSlot(S.slot); appMode = 'ad'; rngOwner = 'ad'; cui.ownSetup = false; cui.own = null; ui.ownBuy = null;
  resetUi(); ui.tab = 'office'; applyTheme(); save(); after(msg || `Welcome to the owner's suite (slot ${S.slot}).`); window.scrollTo(0, 0);
}
Object.assign(actions, {
  async owsnew() {
    if (appMode === 'career' && !(await leaveMode())) return; if (appMode === 'ad' && state && !saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL);
    switchNS('ad'); const free = firstFreeSlot(); if (!free) { appMode = 'home'; cui.flash = 'All five AD save slots are in use. Delete one from an AD or commissioner career\'s Save file tab first.'; render(); return; }
    appMode = 'home'; rngOwner = null; hideModal(); cui.ownSetup = true; cui.own = { step: 'intro', slot: free, f: { name: '', path: 'buy', gm: 'hire', diff: 'normal' } }; state = null; render(); window.scrollTo(0, 0);
  },
  async goowner() {
    if (appMode === 'career' && !(await leaveMode())) return; if (appMode === 'ad' && state && !saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL);
    switchNS('ad'); appMode = 'ad'; rngOwner = 'ad'; hideModal(); const meta = slotsMetaOf('ad'); const last = +lsGet('mfad-last-own'); const have = meta[last] && meta[last].own && lsGet(SLOT_KEY(last)) ? last : [1, 2, 3, 4, 5].find(i => meta[i] && meta[i].own && lsGet(SLOT_KEY(i)));
    if (state && isOwner() && slot === have) { appMode = 'ad'; ui.tab = 'office'; render(); return; }
    if (!have) { appMode = 'home'; render(); return; } setActiveSlot(have); state = null; await boot(); ui.tab = 'office'; render(); window.scrollTo(0, 0);
  },
  owscancel() { cui.ownSetup = false; cui.own = null; ui.ownBuy = null; state = null; appMode = 'home'; render(); window.scrollTo(0, 0); },
  owspath(d) { ownReadIntro(); cui.own.f.path = d.v; render(); },
  owsgm(d) { ownReadIntro(); cui.own.f.gm = d.v; render(); },
  owsdiff(d) { ownReadIntro(); cui.own.f.diff = d.v; render(); },
  owsgo() {
    ownReadIntro(); const S = cui.own; const f = S.f; if (!f.name) { S.msg = 'Give yourself a name.'; S.bad = true; return render(); } S.msg = '';
    let fame = null; if (f.path === 'partner') { const src = ownPastCareers().find(x => x.k + x.i === f.src) || ownPastCareers()[0]; fame = ownFameFrom(src); if (!fame) { S.msg = 'Pick a past career.'; S.bad = true; return render(); } }
    saveBlocked = true; const scen = ['worst', 'frontier', 'family'].includes(f.path) ? f.path : null;
    ownWorld({ name: f.name, diff: f.diff, gm: f.path === 'partner' ? 'hire' : f.gm, scen, fame, cash: fame ? fame.cash : null });
    ui.ownBuy = null;
    if (f.path === 'worst') { const o = OWN(); o.cash = r1(o.cash * 0.75); const m = ownMarket()[0]; m.ask = r1(m.ask * 0.88); o.mkt0 = [m]; S.step = 'buy'; }
    else if (f.path === 'exp' || f.path === 'frontier') { S.step = 'exp1'; f.conf = 'AFC'; f.div = 'West'; }
    else if (f.path === 'family') { ownInherit(); return ownFinishSetup(`${f.name} inherits the ${myName()}.`); }
    else S.step = 'buy';
    render(); window.scrollTo(0, 0);
  },
  owspartner(d) { const r = ownPartnerStart(d.v); if (r.ok) ownFinishSetup(); },
  owpick(d) { ui.ownBuy = { tid: d.v }; render(); },
  owfin() { ownReadBuy(); render(); },
  owsbid() {
    const f = ownReadBuy(); const S = cui.own; const chk = ownFinCheck(f.bid, f.debt, f.mine); if (!chk.ok) { f.msg = chk.err; return render(); }
    const r = ownBid(f.tid, f.bid, f.round); f.msg = r.txt || '';
    if (r.res === 'outbid') { f.round = 1; return render(); }
    if (r.res === 'lost') { OWN().mkt0 = OWN().mkt0.filter(x => x.tid !== f.tid); ui.ownBuy = { msg: r.txt }; if (!OWN().mkt0.length) { OWN().mkt0 = null; } return render(); }
    if (r.res !== 'won') return render();
    const price = r.price; const mine = Math.min(f.mine, OWN().cash); const c2 = ownFinCheck(price, f.debt, Math.max(mine, (price - f.debt) * 0.3)); const v = ownVote('buy', { pct: c2.pct || 0.3, debt: f.debt, partners: c2.partners || 1, key: f.tid });
    S.vote = v; S.from = 'buy'; S.buy = { tid: f.tid, price, debt: f.debt, mine: Math.max(mine, r1((price - f.debt) * 0.3)) }; S.what = `The ${teamName(f.tid)} are yours for ${fmO(price)}.`; S.next = null; S.step = 'vote'; render(); window.scrollTo(0, 0);
  },
  owsback(d) { const S = cui.own; S.step = d.v || 'buy'; S.vote = null; render(); },
  owsfinish() {
    const S = cui.own;
    if (S.step === 'vote' && S.vote && S.vote.ok && S.buy) { const b = S.buy; const r = ownCloseBuy(b.tid, b.price, b.debt, b.mine); if (!r.ok) { S.msg = r.err; S.bad = true; return render(); } return ownFinishSetup(S.what); }
    if (S.step === 'vote' && S.vote && S.vote.ok && S.next === 'xd') { S.step = 'xd'; return render(); }
    if (S.step === 'xd' && OWN().xd && OWN().xd.done) { ownCloseExp(S.expF); return ownFinishSetup(`The ${myName()} are born.`); }
  },
  owscity(d) { const S = cui.own; S.f.city = d.v; const c = owVal('ows-conf'), v = owVal('ows-div'); if (c) S.f.conf = c; if (v) S.f.div = v; render(); },
  owsexp1() { const S = cui.own; const c = owVal('ows-conf'), v = owVal('ows-div'); if (c) S.f.conf = c; if (v) S.f.div = v; S.step = 'exp2'; S.msg = ''; render(); window.scrollTo(0, 0); },
  owslogo() { const S = cui.own; S.f.logo = ownReadLogo('osl'); const n = owVal('ows-nick'); if (n != null) S.f.nick = plainName(n).slice(0, 20); render(); },
  owsexp2() {
    const S = cui.own; S.f.logo = ownReadLogo('osl'); S.f.nick = plainName(owVal('ows-nick') || '').slice(0, 20);
    if (!S.f.nick) { S.msg = 'Give the club a nickname.'; S.bad = true; return render(); } if (NFL.some(t => t.nick && t.nick.toLowerCase() === S.f.nick.toLowerCase())) { S.msg = 'Another club already has that nickname.'; S.bad = true; return render(); }
    S.msg = ''; S.step = 'exp3'; render(); window.scrollTo(0, 0);
  },
  owsfin3() { const S = cui.own; S.f.debt = Math.round(owNum('ow-debt', S.f.debt || 0)); S.f.mine = Math.round(owNum('ow-mine', S.f.mine || 0)); render(); },
  owsexp3() {
    const S = cui.own; const f = S.f; f.debt = Math.round(owNum('ow-debt', f.debt || 0)); f.mine = Math.round(owNum('ow-mine', f.mine || 0)); const fee = OWN_EXP_FEE(); const chk = ownFinCheck(fee, f.debt, f.mine); if (!chk.ok) { S.msg = chk.err; S.bad = true; return render(); }
    const v = ownVote('exp', { pct: chk.pct, debt: f.debt, partners: chk.partners, key: f.city }); S.vote = v; S.from = 'exp3'; S.what = `The league grows: the ${f.city} ${f.nick} will play in the ${f.conf} ${f.div}.`; S.step = 'vote'; S.buy = null;
    if (v.ok) {
      const o = OWN(); const me = ownAddClub({ city: f.city, nick: f.nick, conf: f.conf, div: f.div, c1: f.logo.c1, c2: f.logo.c2 }); o.expCity = f.city; o.logo = f.logo;
      const partner = ownPartnerClub(f.conf); ownXdInit(me, partner); S.next = 'xd';
      S.expF = { fee, debt: f.debt, mine: f.mine, pct: chk.pct, partners: chk.partners, cash: r1(o.cash - f.mine) };
    }
    render(); window.scrollTo(0, 0);
  },
  owsxd(d) { const r = ownXdPick(d.id); if (r.err) cui.own.msg = r.err; else cui.own.msg = ''; render(); },
  owsxpos(d) { cui.own.xpos = d.v; render(); },
  owsxdauto() { ownXdAuto(); render(); },
  // in the game
  owev(d) { const r = ownEvAnswer(d.v); after(r ? `You chose: ${r}.` : ''); },
  owdealblock() { after(ownGmDealBlock() ? 'Trade blocked.' : ''); },
  owprice() { const v = ownSetPrice(owNum('ow-price', OWN().biz.price)); after(`Average ticket price: $${v}.`); },
  owconc(d) { ownSetConc(d.v); after(); }, owpay(d) { ownSetPay(d.v); after(); },
  owborrow(d) { const b = ownBorrow(+d.v * ownG()); after(b ? `Borrowed ${fmMs(b)}.` : 'The club is at the league\'s debt limit.'); },
  owrepay(d) { const a = ownRepay(+d.v * (d.v === '99999' ? 1 : ownG())); after(a ? `Paid down ${fmMs(a)} of debt.` : 'Not enough in the bank (the club keeps $25M on hand).'); },
  owinvest(d) { after(ownCapCall(+d.v) ? `You and your partners put ${fmMs(+d.v)} into the club.` : 'You don\'t have enough cash.'); },
  owproj(d) { const r = ownProjStart(d.k); after(r.err || 'Work begins in the offseason.'); },
  owname(d) { const r = ownNamingTake(+d.i); after(r.err || ''); },
  owsquote() { ownReadStad(); render(); },
  owcity() { ownReadStad(); const r = ownCityAsk(ui.ownSt); after(r.err || r.txt); },
  owbuild() { ownReadStad(); const r = ownStadBuild(Object.assign({}, ui.ownSt)); after(r.err || 'Ground is broken.'); },
  owthreat() { const r = ownThreaten(); after(r.err || ''); },
  owreloc() { const city = owVal('ow-rcity'); const nick = plainName(owVal('ow-rnick') || '').slice(0, 20); const r = ownRelocApply(city); if (r.ok && nick) OWN().relo.nick = nick; after(r.err || ''); },
  owcomty(d) { ownComty(d.k, d.v === 'on'); after(); },
  owlogoprev() { const el = document.getElementById('ow-prev'); if (el) el.innerHTML = ownLogoSVG(ownReadLogo('ou'), 84); },
  owuni(d) { let cols = null; if (d.k === 'redesign') { const lg = ownReadLogo('ou'); cols = { c1: lg.c1, c2: lg.c2 }; OWN().logo = lg; } const r = ownUniform(d.k, cols); applyTheme(); after(r && r.err ? r.err : ''); },
  owcin(d) { return actions.cin(d); },
  owext(d) { const r = ownForceExt(d.id); hideModal(); after(r.err || `Extended at ${fmM(r.apy)} a year.`); },
  owgm(d) { const r = ownSetGM(d.v); after(r.err || ''); },
  owfiregm() { ui.confirm = null; const r = ownFireGM(); after(r.err || ''); },
  owhiregm(d) { const r = ownHireGM(d.id); after(r.err || ''); },
  owhirehc(d) { const r = ownHireHC(d.id); after(r.err || ''); },
  owdir(d) { ownSetDir(d.v); after(); }, owbud(d) { ownSetBud(d.k, d.v); after(); },
  owvote(d) { ownVoteOn(d.id, d.v); after(); }, owcba(d) { ownVoteOn(d.id, d.v); after(); },
  owwhip(d) { after(ownWhip(d.id) ? 'You called in a favor.' : 'No favors to call in.'); },
  owprop() { const r = ownPropose(owVal('ow-prop')); after(r.err || 'Your item is on the agenda.'); },
  owbidsb() { const r = ownBidSB(); after(r.err || 'Your Super Bowl bid is in.'); },
  owbiddraft() { const r = ownBidDraft(); after(r.err || 'Your draft bid is in.'); },
  owsell(d) { ui.confirm = null; const r = ownSell(+d.i); after(r.err || ''); },
  owheir() { const r = ownHeir(owVal('ow-heir')); after(r.err || ''); },
  owretire() { ui.confirm = null; const r = ownRetire(); after(r.err || ''); },
  owcontrol() { const r = ownPartnerTake(owNum('ow-ctl', 0)); after(r.err || ''); },
  owsellstake() { ownSellStake(); after(); },
  owbuyagain() {
    const f = ownReadBuy(); const chk = ownFinCheck(f.bid, f.debt, f.mine); if (!chk.ok) { f.msg = chk.err; return render(); }
    const r = ownBid(f.tid, f.bid, f.round); f.msg = r.txt || '';
    if (r.res === 'outbid') { f.round = 1; return render(); } if (r.res === 'lost') { OWN().mkt0 = OWN().mkt0.filter(x => x.tid !== f.tid); ui.ownBuy = { msg: r.txt }; if (!OWN().mkt0.length) ownMarketAgain(); return render(); }
    if (r.res !== 'won') return render();
    const res = ownBuyAgain(f.tid, r.price, f.debt, Math.max(f.mine, r1((r.price - f.debt) * 0.3))); ui.ownBuy = null; ui.tab = 'office'; applyTheme(); after(res.err || `The ${myName()} are yours.`);
  },
});
function ownReadStad() { const f = ui.ownSt || (ui.ownSt = {}); const g = (id, d) => { const v = owVal(id); return v === '' ? d : v; }; f.cap = +g('ow-scap', f.cap || 68000); f.roof = g('ow-sroof', f.roof || 'o'); f.ask = +g('ow-sask', f.ask || 0); f.psl = g('ow-spsl', f.psl || 'none'); f.loan = +g('ow-sloan', f.loan || 0); return f; }
// moving on in the offseason: an owner's blockers say what's missing
['pnext', 'offnext'].forEach(k => { const fn = actions[k]; actions[k] = function (d) { if (!(typeof isOwner === 'function' && isOwner() && isPro() && state.phase === 'offseason')) return fn.call(this, d); const b = proOffBlockers(); if (b.length) { if (b[0].tab) ui.tab = b[0].tab; return after(b[0].txt); } return fn.call(this, d); }; });
{ const _cin = actions.cin; if (_cin) actions.cin = function (d) { const L = typeof isOwner === 'function' && isOwner() ? PS() : null; const was = L && L.cin[d.k] ? L.cin[d.k].includes(d.id) : false; const r = _cin.call(this, d); if (L && !was && L.cin[d.k] && L.cin[d.k].includes(d.id)) { ownOrder(d.k, d.id); save(); } return r; }; }
