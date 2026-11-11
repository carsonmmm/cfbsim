const out = {}; appMode = 'ad'; saveBlocked = true; ownWorld({ name: 'S', diff: 'normal', gm: 'hire', seed: 55 }); const t0 = ownMarket()[1].tid; const v = ownClubVal(t0);
out.buy = ownCloseBuy(t0, v, 800, Math.min(OWN().cash, (v - 800) * 0.4)); OWN().pending = false; render();
await simYears(2); hideModal(); out.after = { season: state.season, phase: state.phase, pnl: OWN().pnl.length, out: OWN().out };
// one more offseason by hand through the UI actions
let g = 0; while (state.phase === 'offseason' && g++ < 12) { actions.pnext(); } out.season = [state.season, state.phase, ui.flash];
actions.primary(); actions.primary(); out.week = state.week;
try { actions.live(); out.live = !!live.sim; } catch (e) { out.liveErr = e.message; }
return out;
