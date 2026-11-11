// ARGS: path gm diff seasons
const out = { steps: [] }; const path = ARGS[0] || 'buy', gm = ARGS[1] || 'hire', diffk = ARGS[2] || 'normal', N = +(ARGS[3] || 3);
const step = (k) => out.steps.push(k + ':' + (cui.own ? cui.own.step : '-') + (cui.own && cui.own.msg ? ' msg=' + cui.own.msg : ''));
await actions.owsnew(); step('new');
const nm = document.getElementById('ows-name'); if (nm) nm.value = 'Test Owner';
actions.owspath({ v: path }); actions.owsgm({ v: gm }); actions.owsdiff({ v: diffk });
document.getElementById('ows-name').value = 'Test Owner';
actions.owsgo(); step('go');
if (cui.own && cui.own.step === 'buy') {
  if (path === 'partner') { actions.owspartner({ v: OWN().mkt0 ? OWN().mkt0[0].tid : ownMarket()[0].tid }); }
  else {
    for (let tries = 0; tries < 12 && cui.own && cui.own.step === 'buy'; tries++) {
      const mk = ownMarket(); const t = mk[0]; actions.owpick({ v: t.tid });
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('ow-bid', Math.round(t.ask * (1.0 + tries * 0.06))); set('ow-debt', 900); set('ow-mine', Math.round(Math.min(OWN().cash, (t.ask * 1.2 - 900) * 0.5)));
      actions.owsbid(); out.steps.push('bid' + tries + ':' + (ui.ownBuy && ui.ownBuy.msg) + ' step=' + cui.own.step);
    }
    if (cui.own.step === 'vote') { out.vote = cui.own.vote; actions.owsfinish(); }
  }
}
if (cui.own && cui.own.step === 'exp1') {
  actions.owsexp1(); document.getElementById('ows-nick').value = 'Comets'; actions.owsexp2(); step('exp2');
  document.getElementById('ow-debt').value = 1000; document.getElementById('ow-mine').value = Math.round(OWN().cash * 0.6); actions.owsexp3(); step('exp3'); out.vote = cui.own.vote;
  if (cui.own.vote && cui.own.vote.ok) { actions.owsfinish(); actions.owsxd({ id: OWN().xd.pool[0].id }); actions.owsxdauto(); step('xd'); actions.owsfinish(); }
}
step('end');
if (!isOwner() || appMode !== 'ad') { out.fail = 'not in game'; return out; }
out.club = myName(); out.val = OWN().val; out.pct = OWN().pct; out.debt = OWN().debt; out.cash = OWN().cash; out.roster = state.roster.length; out.N = NFL.length;
// draw every tab
const bad = []; for (const [k] of PRO_TABS) { if (!tabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } out.tabs0 = bad;
// seasons
const rows = []; let guard = 0;
while (state.season < 2025 + N + 1 && guard++ < 400 && !OWN().out && !OWN().done) {
  try { if (state.phase === 'offseason') { if (OWN().ev) ownEvAnswer(OWN().ev.opts[0][0]); proAutoOffseason(); if (state.phase === 'offseason') { out.stuck = { step: PS().off.step, b: proOffBlockers() }; break; } } else { if (overCap()) capFix(ME); advance(); } }
  catch (e) { out.err = e.message + ' | ' + (e.stack || '').split('\n').slice(1, 4).join(' / '); break; }
}
out.pnl = OWN().pnl.map(r => ({ s: r.s, wl: r.w + '-' + r.l, po: r.po, tr: Math.round(r.tr), te: Math.round(r.te), net: Math.round(r.net), val: Math.round(r.val), fill: r.fill, fan: r.fan, br: r.brand, mine: Math.round(r.mine), pay: Math.round(r.exp.players), nat: Math.round(r.rev.nat), gate: Math.round(r.rev.gate), hg: r.hg, floor: Math.round(r.exp.floor || 0) }));
out.end = { val: OWN().val, cash: OWN().cash, debt: OWN().debt, bank: OWN().bank, legacy: OWN().legacy, meddle: OWN().meddle, gm: OWN().gmP && OWN().gmP.name, rep: OWN().rep, comm: OWN().comm, meet: (OWN().lg.hist || []).slice(0, 2), out: OWN().out };
const bad2 = []; for (const [k] of PRO_TABS) { if (!tabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad2.push(k); } catch (e) { bad2.push(k + ':' + e.message); } } out.tabs1 = bad2;
save(); out.meta = slotsMetaOf('ad');
return out;
