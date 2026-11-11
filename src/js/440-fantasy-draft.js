/* ===================== v9.53: fantasy draft start (NFL general manager) =====================
 * A new GM career can begin with every player in the league in one pool. The 32 clubs draft in a random snake
 * order until each has a full roster by position (PRO_ROSTER). Players keep their contracts. The league's real
 * rosters stay in place while the draft runs and are swapped for the drafted ones in one step at the end, so a
 * save made in the middle of the draft is always a valid league. The draft lives in PS().fd. */
const fdOn = () => !!(state && state.lvl === 'nfl' && state.pro && state.pro.fd && !state.pro.fd.done);
const FD_TABS = ['off', 'file', 'settings']; // every other page waits until the rosters exist
const fdSize = () => POS_ORDER.reduce((a, pos) => a + PRO_ROSTER[pos], 0);
function fdPlayers() { const m = {}; Object.values(PS().rost).forEach(list => list.forEach(p => { m[p.id] = p; })); state.roster.forEach(p => { m[p.id] = p; }); return m; }
function fdTeamAt(i) { const o = PS().fd.order; const n = o.length; const rd = Math.floor(i / n), k = i % n; return o[rd % 2 ? n - 1 - k : k]; }
function fdCount(tid, M) { const c = {}; PS().fd.got[tid].forEach(id => { const p = M[id]; if (p) c[p.pos] = (c[p.pos] || 0) + 1; }); return c; }
// how much a club wants a player: rating, how much the position matters, age, and how full the position already is
const fdScore = (p, have) => p.ovr + (PRO_POS_W[p.pos] - 1) * 14 + (p.age <= 25 ? 1.5 : p.age >= 31 ? -(p.age - 30) * 1.2 : 0) - 7 * ((have || 0) / PRO_ROSTER[p.pos]);
function fdAvail(M) { const tk = PS().fd.taken; return Object.values(M).filter(p => !tk[p.id]); }
function fdBest(tid, M, avail) {
  const c = fdCount(tid, M); let best = null, bs = -1e9, cheap = null;
  // a pick has to leave room under the cap to fill the rest of the roster at the minimum salary
  const got = PS().fd.got[tid]; const pay = got.reduce((a, id) => a + (M[id] ? capHit(M[id]) : 0), 0); const room = proCap(capYear()) - pay - (fdSize() - got.length - 1) * PRO_MINSAL;
  for (const p of avail) {
    if ((c[p.pos] || 0) >= PRO_ROSTER[p.pos]) continue; const hit = capHit(p);
    if (!cheap || hit < capHit(cheap)) cheap = p;
    if (hit > room) continue; const s = fdScore(p, c[p.pos]); if (s > bs) { bs = s; best = p; }
  }
  return best || cheap;
}
function fdTake(tid, p) { const fd = PS().fd; fd.got[tid].push(p.id); fd.taken[p.id] = 1; fd.log.unshift([fd.i, tid, p.id]); if (fd.log.length > 40) fd.log.length = 40; fd.i++; }
function fdStart() {
  const L = PS(); const r = lrng(state.seed + ':fantasy'); const order = Object.keys(state.teams).map(t => [r(), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  L.fd = { order, i: 0, got: {}, taken: {}, log: [], auto: false, total: order.length * fdSize() }; order.forEach(t => { L.fd.got[t] = []; });
  fdRun();
}
// Computer-run clubs pick until it is your turn (or to the end once your picks are on autopilot).
function fdRun() {
  const fd = PS().fd; if (!fd || fd.done) return; const M = fdPlayers(); let avail = fdAvail(M);
  while (fd.i < fd.total) {
    const tid = fdTeamAt(fd.i); if (tid === ME && !fd.auto && fdBest(ME, M, avail)) return;
    const p = fdBest(tid, M, avail); if (!p) { fd.i++; continue; } // nobody left at a position this club still needs
    fdTake(tid, p); avail = avail.filter(x => x !== p);
  }
  fdFinish(M);
}
function fdFinish(M) {
  const L = PS(); const fd = L.fd; const lean = p => (p.st ? leanPro(p) : p);
  let mine = [];
  fd.order.forEach(t => { const list = fd.got[t].map(id => M[id]).filter(Boolean); if (t === ME) mine = list; else L.rost[t] = list.map(lean); });
  mine.forEach(p => { enrichPro(p); p.yw = 0; }); state.roster = mine; rebuildPMap();
  state.depth = {}; POS_ORDER.forEach(pos => { state.depth[pos] = state.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id); });
  state.captains = []; L.cin = { draft: [], fa: [], cut: [], trade: [], keep: [] }; L.dead = {};
  proRateAll(); Object.keys(state.teams).forEach(t => { delete T(t).stars; proStars(t); });
  L.fd = { done: true, at: state.season }; proHcWish('resign');
  addNews(`The fantasy draft is over. ${myName()} drafted ${mine.length} players; the best is ${mine.slice().sort((a, b) => b.ovr - a.ovr)[0].n}.`);
}
function fdPick(id) {
  const fd = PS().fd; if (!fdOn() || fdTeamAt(fd.i) !== ME) return 'wait'; const M = fdPlayers(); const p = M[id]; if (!p || fd.taken[id]) return 'gone';
  const c = fdCount(ME, M); if ((c[p.pos] || 0) >= PRO_ROSTER[p.pos]) return 'full';
  fdTake(ME, p); fdRun(); return 'ok';
}
function fdView() {
  const fd = PS().fd; const M = fdPlayers(); const n = fd.order.length; const rd = Math.floor(fd.i / n) + 1, pk = fd.i % n + 1; const c = fdCount(ME, M); const f = ui.fdPos || 'ALL';
  const avail = fdAvail(M).filter(p => (c[p.pos] || 0) < PRO_ROSTER[p.pos] && (f === 'ALL' || p.pos === f)).sort((a, b) => b.ovr - a.ovr || a.age - b.age).slice(0, 40);
  const mine = fd.got[ME].map(id => M[id]).filter(Boolean); const pay = r1(mine.reduce((a, p) => a + capHit(p), 0)); const myPos = fd.order.indexOf(ME) + 1;
  const tm = id => esc(T(id) ? T(id).name : id);
  return `<section class="card decision"><div class="head"><div><div class="eyebrow">Fantasy draft · round ${rd} of ${fdSize()} · pick ${pk} of ${n}</div><h2 class="h2">${esc(myName())} are on the clock</h2></div><p class="hint">Every player in the league is in one pool. Clubs draft in a snake order (you pick ${myPos}${myPos === 1 ? 'st' : myPos === 2 ? 'nd' : myPos === 3 ? 'rd' : 'th'} in odd rounds) until every roster is full at each position. Players keep the contracts they have.</p></div>
   <div class="row gap"><button class="btn" data-act="fdbest">Take the best fit</button>${cui.confirm === 'fdauto' ? '<button class="btn danger" data-act="fdauto">Confirm: finish the draft for me</button>' : '<button class="btn ghost" data-act="cask2" data-k="fdauto">Auto-draft the rest</button>'}</div>
   <div class="mt">${seg('fdpos', f, [['ALL', 'All']].concat(POS_ORDER.filter(pos => (c[pos] || 0) < PRO_ROSTER[pos]).map(pos => [pos, `${pos} ${c[pos] || 0}/${PRO_ROSTER[pos]}`])))}</div>
   <div class="tw mt"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th class="num">Age</th><th>Overall</th><th class="num">Potential</th><th class="num">Cap hit</th><th class="num">Years left</th><th></th></tr></thead><tbody>${avail.map(p => `<tr><td><b>${esc(p.n)}</b></td><td>${p.pos}</td><td class="num">${p.age}</td><td>${ovrTag(p.ovr)}</td><td class="num">${p.pot || p.ovr}</td><td class="num">${fmM(capHit(p))}</td><td class="num">${p.k ? p.k.yrs : 0}</td><td><button class="btn primary sm" data-act="fdpick" data-id="${p.id}">Draft</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">Nobody left at this position.</td></tr>'}</tbody></table></div></section>
  <section class="card"><div class="head"><div><div class="eyebrow">Your picks · ${mine.length} of ${fdSize()}</div><h2 class="h3">Payroll so far ${fmM(pay)} of a ${fmM(proCap(capYear()))} cap</h2></div></div>
   ${mine.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th class="num">Age</th><th>Overall</th><th class="num">Cap hit</th></tr></thead><tbody>${mine.map(p => `<tr><td>${esc(p.n)}</td><td>${p.pos}</td><td class="num">${p.age}</td><td>${ovrTag(p.ovr)}</td><td class="num">${fmM(capHit(p))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No picks yet.</p>'}</section>
  <section class="card"><div class="eyebrow">Latest picks around the league</div><ul class="plainlist small">${fd.log.slice(0, 12).map(([i, t, id]) => `<li>${Math.floor(i / n) + 1}.${i % n + 1} · <b>${tm(t)}</b>: ${M[id] ? esc(M[id].n) + ' (' + M[id].pos + ', ' + M[id].ovr + ')' : ''}</li>`).join('') || '<li class="muted">You have the first pick.</li>'}</ul></section>`;
}
{ const _v = vProOff; vProOff = function () { return fdOn() ? fdView() : _v.apply(this, arguments); }; }
{ const _n = proOffNext; proOffNext = function () { if (fdOn()) { ui.tab = 'off'; ui.flash = 'Finish the fantasy draft first.'; return false; } return _n.apply(this, arguments); }; }
Object.assign(actions, {
  fdpick(d) { const r = fdPick(d.id); cui.confirm = null; after(r === 'ok' ? (fdOn() ? '' : 'The draft is done. Your roster is set.') : r === 'full' ? 'You are full at that position.' : r === 'gone' ? 'He was just drafted.' : ''); },
  fdbest() { if (!fdOn()) return; const M = fdPlayers(); const p = fdBest(ME, M, fdAvail(M)); if (p) actions.fdpick({ id: p.id }); },
  fdauto() { if (!fdOn()) return; cui.confirm = null; PS().fd.auto = true; fdRun(); after('The draft is done. Your roster is set.'); window.scrollTo(0, 0); },
  fdpos(d) { ui.fdPos = d.v; render(); refocus({ act: 'fdpos', v: d.v }); },
  ncfd(d) { const sn = document.getElementById('nc-nfl'); if (sn) ui.nc.nfl = sn.value; ui.nc.fd = d.v === '1'; render(); refocus({ act: 'ncfd', v: d.v }); },
});
// Any other page asked for during the draft (the phone tab bar, a shortcut, a link) lands on the draft.
{ const _r = renderAD; renderAD = function () { if (fdOn() && !FD_TABS.includes(ui.tab)) ui.tab = 'off'; return _r.apply(this, arguments); }; }
