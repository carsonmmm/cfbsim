/* ===================== v9.52: recruiting fixes (Player Career) =====================
 * 1. A recruit far better than every school used to fall outside every school's offer range (score more than 22 over
 *    what the best program looks for), so the No. 1 player in the nation could end up with no offers at all. Schools
 *    now judge fit on a score capped just above what the very best program looks for: the best players are a perfect
 *    fit for the best programs, and smaller schools still see them as long shots.
 * 2. The same cap applies to the transfer portal.
 * 3. A school that pulled an offer can come back the next season if you've played your way back into its range.
 * 4. Saves that are sitting with no offers get them right away when they load. */
function recTopTarget() { let m = 0; const T = cs && cs.league && cs.league.teams; if (T) for (const t in T) m = Math.max(m, teamTarget(t)); return m || 82; }
function recFit(score) { return Math.min(score, recTopTarget() + 5); }
{ const _si = schoolInterest; schoolInterest = function (tid, score) { return _si(tid, recFit(score)); }; }
{ const _co = canOffer; canOffer = function (tid, score) { return _co(tid, recFit(score)); }; }
{ const _fw = fitWeight; fitWeight = function (tid, score) { return _fw(tid, recFit(score)); }; }
{ const _hn = hsNewSeason; hsNewSeason = function () { const r = _hn.apply(this, arguments); if (cs && cs.rec && Array.isArray(cs.rec.pulled)) cs.rec.pulled = []; return r; }; }
function recRepair() {
  if (!cs || !cs.rec || cs.rec.signed || cs.portal || !cs.rec.schools) return;
  const live = cs.phase === 'sign' || (cs.lvl === 'hs' && cs.hs && cs.hs.cls >= 1);
  if (!live || offersList().length) return;
  recruitTick(cs.phase === 'sign' && cs.lvl !== 'hs' ? 'quick' : 'off');
}
{ const _cs = cSettle; cSettle = function () { const r = _cs.apply(this, arguments); try { recRepair(); } catch (e) { console.error(e); } return r; }; }

