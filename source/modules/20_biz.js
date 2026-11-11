
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
