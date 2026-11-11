const out = {}; const log = (k, v) => { out[k] = v; };
appMode = 'ad'; saveBlocked = true; ownWorld({ name: 'G', diff: 'hard', gm: 'self', seed: 91 }); const t0 = ownMarket()[2].tid; const v = ownClubVal(t0);
log('buy', ownCloseBuy(t0, v, 500, Math.min(OWN().cash, (v - 500) * 0.35))); OWN().pending = false; const A = autoSet(); Object.keys(AUTO_DEFS).forEach(x => { A[x] = true; });
const sim1 = () => { let g = 0; const s0 = OWN().pnl.length; while (OWN().pnl.length === s0 && g++ < 400) { if (state.phase === 'offseason') { if (OWN().ev) ownEvAnswer('quiet'); proAutoOffseason(); if (state.phase === 'offseason') return 'stuck ' + PS().off.step + ' ' + JSON.stringify(proOffBlockers()); } else { if (overCap()) capFix(ME); advance(); } } return 'ok ' + state.season; };
const o = OWN(); log('club', myName()); o.relo = { k: 'approved', city: 'Portland', nick: 'Rivermen', fee: 300, s: state.season };
o.stad.build = { yr: state.season + 1, cap: 70000, roof: 'd', suites: 130, club: 9000, cost: 2800, pub: 0, psl: 0, loan: 0, open: null };
o.lg.lockout = state.season + 1; o.lg.sbHost = state.season + 1; o.lg.draftHost = state.season + 1; o.comm = 80;
log('sim', sim1()); log('name', [myName(), T(ME).name, NFL_BY[ME].name, NFL_BY[ME].city]); log('stad', o.stad); log('row', o.pnl[0] && { rev: o.pnl[0].rev, exp: o.pnl[0].exp, net: o.pnl[0].net });
// the name survives a reload of names
cmSyncNames(); log('afterSync', [myName(), NFL_BY[ME].name]);
// CBA item
o.lg.cba = state.season + 1; ownLeagueOffseason(); const cba = o.lg.meet.items.find(i => i.cba); if (cba) ownVoteOn(cba.id, 'hard'); ownMeetResolve(); log('cba', [rules().capGrow, o.lg.lockout, o.lg.hist[0]]);
log('sim2', sim1()); log('forced?', o.out);
// a forced sale: drain everything
o.cash = 0; o.debt = ownDebtLimit(); o.bank = -2000; log('sim3', sim1()); log('out', OWN().out); log('blockers', proOffBlockers());
const bad = []; for (const [k] of PRO_TABS) { if (!tabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } log('tabs', bad);
ui.tab = 'career'; render(); log('careerHas', document.getElementById('view').textContent.slice(0, 300));
return out;
