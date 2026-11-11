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
