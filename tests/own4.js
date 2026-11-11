// every owner feature path, engine-level. ARGS: seed
const seed = +(ARGS[0] || 77); const out = {}; const log = (k, v) => { out[k] = v; };
appMode = 'ad'; saveBlocked = true; ownWorld({ name: 'F', diff: 'normal', gm: 'hire', seed }); const t0 = ownMarket()[3].tid; const v = ownClubVal(t0);
log('buy', ownCloseBuy(t0, v, 800, Math.min(OWN().cash, (v - 800) * 0.6))); OWN().pending = false; const o = OWN();
const sim1 = () => { let g = 0; const s0 = OWN().pnl.length; while (OWN().pnl.length === s0 && g++ < 400) { if (state.phase === 'offseason') { proAutoOffseason(); if (state.phase === 'offseason') return 'stuck ' + PS().off.step + ' ' + JSON.stringify(proOffBlockers()); } else { if (overCap()) capFix(ME); advance(); } } return 'ok'; };
// offseason actions before the first season
log('price', ownSetPrice(o.biz.price * 1.15)); ownSetConc(1.2); ownSetPay(0.25);
log('proj', ownProjStart('conc')); log('proj2', ownProjStart('suites'));
log('comty', [ownComty('youth', true), ownComty('found', true)]);
log('uni', ownUniform('redesign', { c1: '#123456', c2: '#abcdef' }));
log('bud', [ownSetBud('scout', 5), ownSetBud('fac', 4)]); log('dir', ownSetDir('win'));
log('gmswitch', ownSetGM('self')); log('gmback', ownSetGM('hire')); ownEnsureStaff(); log('gm', o.gmP && o.gmP.name);
const pl = state.roster.find(p => p.k && p.k.yrs === 1 && p.ovr >= 74); if (pl) log('ext', ownForceExt(pl.id));
log('sim1', sim1()); log('y1', o.pnl[0] && { net: o.pnl[0].net, tr: o.pnl[0].tr, val: o.pnl[0].val });
log('meet', o.lg.meet && o.lg.meet.items.map(i => i.t));
if (o.lg.meet) { o.lg.meet.items.forEach(it => ownVoteOn(it.id, 'yes')); log('prop', ownPropose('shareUp')); log('sb', ownBidSB()); log('draftbid', ownBidDraft()); }
log('naming', o.nameOffers && ownNamingTake(0)); log('stadname', o.stad.name);
o.cityAsk = null; log('city', ownCityAsk({ ask: 30 })); log('build', ownStadBuild({ cap: 68000, roof: 'r', ask: 30, psl: 'some', loan: 300 }));
log('threat', ownThreaten()); log('reloc', ownRelocApply('Portland')); if (o.relo) o.relo.nick = 'Rivermen';
log('ev', (ownEvNew(null), o.ev && ownEvAnswer(o.ev.opts[0][0])));
log('sim2', sim1()); log('afterMeet', o.lg.hist[0]); log('relo', o.relo); log('name', myName()); log('stad', { temp: o.stad.temp, build: o.stad.build, name: o.stad.name });
for (let i = 0; i < 3; i++) log('sim' + (3 + i), sim1());
log('stadOpen', { qual: o.stad.qual, cap: o.stad.cap, temp: o.stad.temp, build: o.stad.build && o.stad.build.open }); log('hosts', [o.lg.sbHost, o.lg.draftHost]);
log('vals', o.pnl.map(r => [r.s, r.tm, r.w + '-' + r.l, Math.round(r.tr), Math.round(r.net), Math.round(r.val), r.fill]));
// heir, sell, buy again, retire
log('heir', ownHeir('F Junior')); log('gen', o.gen);
log('sell', ownSell(0)); log('out', o.out); const mk = ownMarketAgain(); const m = mk[0];
log('buyagain', ownBuyAgain(m.tid, m.ask, 700, Math.min(OWN().cash, (m.ask - 700) * 0.4))); log('club2', myName()); log('prev', OWN().prev);
log('sim7', sim1()); log('retire', ownRetire()); log('done', OWN().done);
const bad = []; for (const [k] of PRO_TABS) { if (!tabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } log('tabs', bad);
log('legacy', [OWN().legacy, OWN().legacyOld, OWN().hof]);
return out;
