
/* ---------- wiring Owner mode into the NFL engine ---------- */
const OWN_TABS = [['obiz', 'Business'], ['ostad', 'Stadium'], ['ofans', 'Fans & brand'], ['oleague', 'League office']];
const OWN_MNAV = [['office', 'Office', 'home'], ['schedule', 'Schedule', 'cal'], ['obiz', 'Business', 'grid'], ['front', 'Front office', 'users']];
(function ownTabsInit() {
  const i = PRO_TABS.findIndex(t => t[0] === 'office') + 1; PRO_TABS.splice(i, 0, ...OWN_TABS);
  if (!PRO_GROUPS.some(g => g[0] === 'Ownership')) PRO_GROUPS.splice(1, 0, ['Ownership', OWN_TABS.map(t => t[0])]);
})();
// which tabs an owner sees: the owner's pages; the GM's desk only when you are your own GM
{ const _tv = xTabVis; xTabVis = function (k) {
  if (OWN_TABS.some(t => t[0] === k)) return isOwner() && !OWN().pending;
  if (isOwner()) { if (k === 'front') return true; if (ownHands() && ['cap', 'trades', 'depth'].includes(k)) return false; if (k === 'nflx' && ownHands()) return false; }
  return _tv(k);
}; }
{ const _xv = xView; xView = function (tab) { if (isOwner() && !OWN().pending) { const v = ownViewFor(tab); if (v) return v; } return _xv(tab); }; }
{ const _ob = proOffBlockers; proOffBlockers = function () {
  if (!isOwner()) return _ob(); const o = OWN(); const L = PS();
  if (o.done) return [{ txt: 'You have retired. Start a new owner career from the Home screen.', tab: 'career' }];
  if (o.out) return [{ txt: 'You don\'t own a club. Buy one, or retire.', tab: 'career' }];
  if (ownHands()) { const b = []; if (L.off && L.off.step === 1 && (!o.gmP || !state.staff.HC || state.staff.HC.interim) && !autoOn('staff')) b.push({ txt: !o.gmP ? 'Hire a general manager.' : 'Hire a head coach.', tab: 'front' }); return b; }
  return _ob().map(x => (/head coach/i.test(x.txt) ? Object.assign({}, x, { tab: 'front' }) : x));
}; }
{ const _mgf = myGmFaBids; myGmFaBids = function () { return isOwner() ? ownGmFaBids() : _mgf(); }; }
// the lockout costs young players their spring; a training complex helps them
{ const _pd = proDevelop; proDevelop = function (p, mine) {
  let d = _pd(p, mine); if (mine && isOwner() && OWN().lg.lockout === state.season + 1 && p.age <= 24 && ownH('lk:' + p.id) < 0.5 && p.ovr > 45) { p.ovr -= 1; d -= 1; }
  return d;
}; }
// club names that moved (yours and the computer's) survive the name reset
{ const _cs = cmSyncNames; cmSyncNames = function () { _cs(); ownSyncNames(); }; }
function ownSyncNames() {
  if (!isOwner() || typeof NFL_BY === 'undefined') return; const o = OWN();
  const put = (id, city, nick) => { if (!NFL_BY[id]) return; const nm = city + ' ' + nick; NFL_BY[id].name = nm; NFL_BY[id].city = city; NFL_BY[id].nick = nick; if (state.teams[id]) { state.teams[id].name = nm; state.teams[id].city = city; } };
  (o.aiRelo || []).forEach(x => put(x.id, x.city, x.nick)); if (o.reloName && o.reloName.id === ME) put(ME, o.reloName.city, o.reloName.nick);
}
function ownSlotSummary() {
  const o = OWN(); const t = T(ME); return { lvl: 'nfl', own: true, gm: false, name: o.pending ? 'New owner' : teamName(ME), owner: o.name, season: state.season, phase: state.phase, rec: t ? t.w + '-' + t.l : '0-0', legacy: Math.round(o.legacy + (o.legacyOld || 0)), diff: state.settings.diff, custom: false, seasons: (o.pnl || []).length, fired: !!o.out, saved: Date.now(), val: o.val };
}
// a page for each owner tab
function ownViewFor(tab) {
  if (tab === 'office') return vOwnOffice; if (tab === 'career') return vOwnLegacy; if (tab === 'front') return vOwnFront;
  if (tab === 'obiz') return vOwnBiz; if (tab === 'ostad') return vOwnStad; if (tab === 'ofans') return vOwnFans; if (tab === 'oleague') return vOwnLeague;
  if (tab === 'off') { const o = PS().off; if (o && o.step === 0) return () => proOffTop(0) + ownReviewHTML(); if (o && o.step === 1) return () => proOffTop(1) + ownFrontStepHTML(); }
  return null;
}
