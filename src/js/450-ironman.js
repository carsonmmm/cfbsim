/* ===================== v9.53: Ironman careers (athletic director and NFL general manager) =====================
 * Chosen when the career starts and never turned off. An Ironman career has no undo, no admin tools, a fixed
 * difficulty, and can't be rolled back to an earlier copy or replaced by a save code. The flag is X().iron. */
const ironOn = () => !!(state && state.x && state.x.iron);
const IRON_NO = 'This is an Ironman career: ';
{ const _u = undoSnap; undoSnap = function () { return ironOn() ? null : _u.apply(this, arguments); }; }
{ const _s = slotSummary; slotSummary = function () { const o = _s.apply(this, arguments); if (o && ironOn()) o.iron = true; return o; }; }
{ const _q = qolAfterRender; qolAfterRender = function () { const r = _q.apply(this, arguments); try { if (appMode === 'ad' && ironOn()) { const el = document.querySelector('#hdr .sub'); if (el && !el.querySelector('.ironpill')) el.insertAdjacentHTML('beforeend', ' <span class="pill maize ironpill">Ironman</span>'); } } catch (e) { } return r; }; }
{
  const guard = (name, test, msg) => { const f = actions[name]; if (typeof f !== 'function') return; actions[name] = function (d) { if (ironOn() && test(d || {})) { ui.confirm = null; return after(IRON_NO + msg); } return f.apply(this, arguments); }; };
  guard('setgame', d => d.k === 'diff', 'the difficulty is locked.');
  guard('restoregood', d => +d.i === slot, 'it can\'t be rolled back to an earlier copy.');
  guard('import', () => true, 'a save code can\'t replace it. Load the code into another slot.');
  Object.assign(actions, { nciron(d) { const sel = document.getElementById('nc-tid'); if (sel) ui.nc.tid = sel.value; const sn = document.getElementById('nc-nfl'); if (sn) ui.nc.nfl = sn.value; ui.nc.iron = d.v === '1'; render(); refocus({ act: 'nciron', v: d.v }); } });
}

/* ---------- v9.54: Ironman in every mode ----------
 * Any career can be switched to Ironman from Settings. It can be turned on, never off. Coach, commissioner and
 * owner careers live in `state`, so the rules above already apply to them. Player Career keeps its flag in CX().iron. */
const cIronOn = () => !!(typeof cs !== 'undefined' && cs && cs.x && cs.x.iron);
const anyIron = () => (appMode === 'career' ? cIronOn() : ironOn());
function ironRowHTML() {
  const on = anyIron(); const ask = (appMode === 'career' ? cui.confirm : ui.confirm) === 'iron';
  return setRow('Ironman', on ? 'On for this career, for good: no undo, no admin tools, a locked difficulty, and no rolling back or replacing the save.' : 'No undo, no admin tools, a locked difficulty, and no rolling back or replacing the save. Once it is on it stays on.',
    on ? '<span class="pill maize">On</span>' : ask ? '<button class="btn danger sm" data-act="ironon">Confirm: turn on Ironman for good</button>' : '<button class="btn sm" data-act="ironask">Turn on Ironman</button>');
}
{ const _c = coachSettingsHTML; coachSettingsHTML = function () { return _c.apply(this, arguments) + `<section class="card"><div class="eyebrow">Ironman · slot ${slot}</div>${ironRowHTML()}</section>`; }; }
{ const _s = cSummary; cSummary = function () { const o = _s.apply(this, arguments); if (o && cIronOn()) o.iron = true; return o; }; }
{ const _v = cViewFor; cViewFor = function (k) { if (k === 'admin' && cIronOn()) return () => '<section class="card"><div class="eyebrow">Admin tools</div><p class="muted">This is an Ironman career. The admin tools are locked.</p></section>'; return _v.apply(this, arguments); }; }
{ const _q = qolAfterRender; qolAfterRender = function () { const r = _q.apply(this, arguments); try { if (appMode === 'career' && cIronOn()) { const el = document.querySelector('#hdr .sub'); if (el && !el.querySelector('.ironpill')) el.insertAdjacentHTML('beforeend', ' <span class="pill maize ironpill">Ironman</span>'); } } catch (e) { } return r; }; }
{
  const cguard = (name, test, msg) => { const f = actions[name]; if (typeof f !== 'function') return; actions[name] = function (d) { if (appMode === 'career' && cIronOn() && test(d || {})) { cui.confirm = null; cui.flash = IRON_NO + msg; return render(); } return f.apply(this, arguments); }; };
  cguard('cdiff', () => true, 'the difficulty is locked.'); cguard('cgrowth', () => true, 'the growth setting is locked.');
  cguard('crestoregood', d => +d.i === cslot, 'it can\'t be rolled back to an earlier copy.'); cguard('cimport', () => true, 'a save code can\'t replace it. Load the code into another slot.');
  Object.assign(actions, {
    ironask() { if (appMode === 'career') cui.confirm = 'iron'; else ui.confirm = 'iron'; render(); refocus({ act: 'ironon' }); },
    ironon() {
      if (appMode === 'career') { if (!cs) return; cui.confirm = null; CX().iron = true; CX().ironAt = cs.year; cui.flash = 'Ironman is on for this career.'; cSave(); return render(); }
      if (!state) return; ui.confirm = null; ui.undo = null; X().iron = true; X().ironAt = state.season; if (ui.tab === 'admin') ui.tab = 'settings'; after('Ironman is on for this career.');
    },
  });
}
