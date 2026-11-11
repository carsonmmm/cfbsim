// partner path with a fake past career
lsSet(CSLOT_KEY(1), 'x'); lsSet(CMETA_KEY, JSON.stringify({ 1: { name: 'Joe Star', pos: 'QB', ovr: 88, done: true, team: 'Retired' } }));
const out = { steps: [] }; await actions.owsnew(); actions.owspath({ v: 'partner' }); document.getElementById('ows-name').value = 'Joe Star'; actions.owsgo(); out.steps.push(cui.own && cui.own.step);
actions.owspartner({ v: ownMarket()[1].tid }); out.inGame = isOwner() && appMode === 'ad'; out.cash = OWN().cash; out.partner = OWN().partner; out.club = myName();
const bad = []; for (const [k] of PRO_TABS) { if (!tabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } out.tabs = bad;
let g = 0; while (OWN().pnl.length < 1 && g++ < 300) { if (state.phase === 'offseason') { proAutoOffseason(); if (state.phase === 'offseason') break; } else advance(); }
out.after1 = { partner: OWN().partner, cash: OWN().cash, season: state.season, phase: state.phase };
if (OWN().partner && OWN().partner.offer) { ui.tab = 'career'; render(); const el = document.getElementById('ow-ctl'); out.ctlInput = !!el; actions.owcontrol(); out.ctrl = { pct: OWN().pct, partner: OWN().partner, flash: ui.flash }; }
return out;
