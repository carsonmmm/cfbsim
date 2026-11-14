/* ===================== STAFF MOVES: promote from within, interims at every job, an assistant head coach (v10.02) =====================
 * College only, for an athletic director and for a head coach in Coach mode (who never fills his own job).
 * An interim is a stand-in copy of the coach: he keeps his own job and covers the open one until you
 * give him the job, hire someone, or send him back. A promotion moves the coach up and leaves his old job open. */
const SP_OFF = ['QB', 'RB', 'WR', 'TE', 'OL'], SP_DEF = ['DE', 'DT', 'LB', 'CB', 'S'];
function spCan(role) { return !!state && !isPro() && !isComm() && !!state.staff && (isCoach() ? coRunsStaff() && role !== 'HC' : true); }
function spAhc() { const r = STAFF_ROLES.find(r => r !== 'HC' && state.staff[r] && state.staff[r].ahc && !state.staff[r].interim); return r || null; }
// the jobs one level down that can move up into this one
function spFeed(role) {
  const from = role === 'HC' ? ['OC', 'DC', 'ST'] : role === 'OC' ? SP_OFF : role === 'DC' ? SP_DEF : role === 'ST' ? SP_OFF.concat(SP_DEF) : [];
  const a = spAhc(); if (role === 'HC' && a && !from.includes(a)) from.unshift(a);
  return from.filter(r => { const c = state.staff[r]; return c && !c.me && !c.interim; });
}
function spOpen(role) { const c = state.staff[role]; return !c || !!c.interim; }
function spPay(role, ovr) {
  const e = Math.max(0.3, econ());
  if (role === 'HC') return r1(clamp(2.5 + (ovr - 70) * 0.4, 2.0, 11) * e);
  const base = ['OC', 'DC'].includes(role) ? 1.0 : role === 'ST' ? 0.5 : 0.35;
  return r1(clamp(base + (ovr - 70) * (['OC', 'DC'].includes(role) ? 0.09 : 0.04), 0.25, 3.5) * e);
}
// what a coach would look like in the bigger job. A new job has a learning curve; an assistant head coach has less of one.
function spProject(src, to, from) {
  const o = src.ovr || 70, rec = src.rec || o, dev = src.dev || o, k = src.ahc ? 3 : 0;
  const c = mkCoach({ name: src.name, role: to, title: ROLE_TITLE[to], real: !!src.real, age: src.age, bg: 'Promoted from ' + (ROLE_TITLE[from] || 'the staff').toLowerCase(), rap: src.rap, from, fromId: src.id });
  if (to === 'HC') Object.assign(c, { off: clamp(o - (from === 'OC' ? 2 : 8) + k, 50, 95), def: clamp(o - (from === 'DC' ? 2 : 8) + k, 50, 95), rec: clamp(rec - 4 + k, 50, 95), dev: clamp(dev - 2 + k, 50, 95), gm: clamp(o - 7 + k, 50, 95) });
  else Object.assign(c, { ovr: clamp(o - 3, 50, 94), rec: clamp(rec, 50, 96), dev: clamp(dev, 50, 94) });
  return c;
}
function spGA(role) { const c = genCandidates(role, 1)[0]; return Object.assign(c, { ovr: 64, rec: 62, dev: 65, bg: 'Graduate assistant', real: false, salary: 0, years: 0, from: null, fromId: null }); }
function spAsInterim(c, role) { return Object.assign(c, { interim: true, title: 'Interim ' + ROLE_TITLE[role], salary: 0, years: 0 }); }
// put an interim in a job. from is a staff job, or 'GA' for a graduate assistant
function spInterim(role, from) {
  if (!spCan(role) || !spOpen(role)) return 'no';
  if (from === 'GA') { if (role === 'HC') return 'no'; state.staff[role] = spAsInterim(spGA(role), role); }
  else { if (!spFeed(role).includes(from)) return 'no'; state.staff[role] = spAsInterim(spProject(state.staff[from], role, from), role); }
  addNews(`${state.staff[role].name} is the interim ${ROLE_TITLE[role].toLowerCase()}.`, role === 'HC' ? 'big' : '');
  return 'ok';
}
function spSendBack(role) { const c = state.staff[role]; if (!spCan(role) || !c || !c.interim) return 'no'; if (role === 'HC' && state.phase !== 'offseason') return 'no'; state.staff[role] = null; return 'ok'; }
// the coach an interim was copied from, if he is still on the staff
function spSource(c) { if (!c) return null; let r = c.from && state.staff[c.from] && state.staff[c.from].id === c.fromId ? c.from : null; if (!r && !c.fromId) r = STAFF_ROLES.find(x => x !== c.role && state.staff[x] && !state.staff[x].interim && !state.staff[x].me && state.staff[x].name === c.name) || null; return r; }
function spFinish(role, c, src) {
  const ovr = coachOvr(c); const pay = Math.max(spPay(role, ovr), r1(((src && src.salary) || 0) * 1.15));
  if (isCoach() && role !== 'HC') { const spend = assistantSpend() - ((src && src.salary) || 0) - ((state.staff[role] && state.staff[role].salary) || 0); if (spend + pay > (state.co.contract.pool || 0) + 0.001) return 'pool'; }
  delete c.interim; c.title = ROLE_TITLE[role]; c.salary = pay; c.years = role === 'HC' ? 4 : COACH_YRS[role] || 2; delete c.ahc; delete c.ahcPay;
  if (role === 'HC') { ['off', 'def', 'rec', 'dev', 'gm'].forEach(k => c[k] = clamp(c[k] + 2, 50, 96)); state.meters.hot = 15; }
  state.staff[role] = c; mv('morale', role === 'HC' ? 4 : 2);
  addNews(`${c.name} is promoted to ${ROLE_TITLE[role].toLowerCase()}: ${c.years} years, $${c.salary.toFixed(1)}M per year.`, role === 'HC' ? 'big' : '');
  return 'ok';
}
// the interim gets the job for good. His old job opens up.
function spKeep(role) {
  const c = state.staff[role]; if (!spCan(role) || !c || !c.interim) return 'no';
  if (role === 'HC' && state.phase !== 'offseason') return 'wait';
  const sr = spSource(c); const src = sr ? state.staff[sr] : null;
  const r = spFinish(role, c, src); if (r !== 'ok') return r;
  if (sr) state.staff[sr] = null;
  return 'ok';
}
// move a coach straight up into an open job
function spPromote(role, from) {
  if (!spCan(role) || !spOpen(role) || !spFeed(role).includes(from)) return 'no';
  if (role === 'HC' && state.phase !== 'offseason') return 'wait';
  const src = state.staff[from]; const r = spFinish(role, spProject(src, role, from), src); if (r !== 'ok') return r;
  state.staff[from] = null; return 'ok';
}
// assistant head coach: an extra title for one assistant. Never required.
function spSetAhc(role) {
  const c = state.staff[role]; if (!spCan(role) || role === 'HC' || !c || c.me || c.interim) return 'no';
  const raise = r1(Math.max(0.1, c.salary * 0.15));
  const old = spAhc(); const back = old && old !== role ? state.staff[old].ahcPay || 0 : 0;
  if (isCoach() && assistantSpend() - back + raise > (state.co.contract.pool || 0) + 0.001) return 'pool';
  if (old) spDropAhc(old, true);
  c.ahc = true; c.ahcPay = raise; c.salary = r1(c.salary + raise); c.title = 'Assistant Head Coach / ' + ROLE_TITLE[role]; if (c.rap != null) c.rap = clamp(c.rap + 8, 0, 100);
  addNews(`${c.name} is named assistant head coach.`); return 'ok';
}
function spDropAhc(role, quiet) {
  const c = state.staff[role]; if (!c || !c.ahc) return 'no'; if (!quiet && !spCan(role)) return 'no';
  c.salary = r1(Math.max(0.1, c.salary - (c.ahcPay || 0))); delete c.ahc; delete c.ahcPay; c.title = ROLE_TITLE[role]; if (c.rap != null) c.rap = clamp(c.rap - 8, 0, 100);
  return 'ok';
}
function spMsg(r) { return r === 'ok' ? 'Done.' : r === 'wait' ? 'A head coach is named for good in the offseason. Until then he is the interim.' : r === 'pool' ? `Your assistant pool cannot cover the raise: ${fm(Math.max(0, r1(state.co.contract.pool - assistantSpend())))} left.` : 'That move is not open right now.'; }

/* ---------- the engine: who steps in, and what happens when the season ends ---------- */
// fire the head coach in season: the assistant head coach steps in, or your best coordinator
{ const _f = fireCoach; fireCoach = function (role) {
  const r = _f.apply(this, arguments);
  try { const c = state.staff.HC; if (role === 'HC' && c && c.interim && !c.fromId && spCan('HC')) { const f = spFeed('HC'); const a = spAhc(); const best = a && f.includes(a) ? a : f.filter(x => x !== 'ST').sort((x, y) => state.staff[y].ovr - state.staff[x].ovr)[0] || f[0]; if (best) { state.staff.HC = spAsInterim(spProject(state.staff[best], 'HC', best), 'HC'); addNews(`${state.staff.HC.name} takes over as interim head coach. You can choose a different coordinator on the Staff page.`); } } } catch (e) { }
  return r;
}; }
// the offseason no longer sends an interim head coach away before you can give him the job
{ const _f = offCoaching; offCoaching = function () {
  const keep = !isCoach() && state.staff.HC && state.staff.HC.interim ? state.staff.HC : null; if (keep) state.staff.HC = null;
  const r = _f.apply(this, arguments);
  if (keep && !state.staff.HC) { state.staff.HC = keep; const t = `Interim head coach ${keep.name} finished the season. Give him the job on the Staff page, or hire someone else.`; addNews(t); if (state.off && Array.isArray(state.off.coachNews)) state.off.coachNews.push(t); }
  if (state.off && Array.isArray(state.off.poach)) state.off.poach = state.off.poach.filter(x => !(state.staff[x.role] && state.staff[x.role].interim)); // nobody poaches a stand-in
  return r;
}; }
// you cannot leave the hiring step with an interim head coach
function spHcUnsettled() { return !!state && !isPro() && !isCoach() && !isComm() && state.phase === 'offseason' && state.off && state.off.step >= 2 && !!state.staff.HC && !!state.staff.HC.interim; }
{ const _f = offStepNext; offStepNext = function () { if (spHcUnsettled() && state.off.step === 2) { try { runOffAutomation(); } catch (e) { } if (spHcUnsettled()) return false; } return _f.apply(this, arguments); }; }
// autopilot settles the other interims: they get the job, and the job they left is filled
{ const _f = autoHire; autoHire = function () {
  try { if (state.phase === 'offseason' && !isCoach() && !isPro()) STAFF_ROLES.forEach(r => { if (r !== 'HC' && state.staff[r] && state.staff[r].interim) { if (spKeep(r) !== 'ok') state.staff[r] = null; } }); } catch (e) { }
  return _f.apply(this, arguments);
}; }

/* ---------- the Staff page ---------- */
function spCardHTML() {
  if (!state || !state.staff || !STAFF_ROLES.some(spCan)) return '';
  const off = state.phase === 'offseason'; const rt = c => c.role === 'HC' ? coachOvr(c) : c.ovr;
  const jobs = STAFF_ROLES.filter(r => spCan(r) && spOpen(r));
  const rows = jobs.map(role => {
    const cur = state.staff[role]; const feed = spFeed(role); const hcSeason = role === 'HC' && !off;
    const who = feed.map(f => { const s = state.staff[f]; const p = spProject(s, role, f); const isCur = cur && cur.fromId === s.id;
      return `<div class="cand"><div><b>${esc(s.name)}</b>${s.ahc ? ' <span class="pill maize">Asst. head coach</span>' : ''} <span class="muted">· ${esc(ROLE_TITLE[f])}</span><div class="small muted">Would rate ${rt(p)} as ${esc(ROLE_TITLE[role].toLowerCase())}${hcSeason ? '' : ` · ${fm(Math.max(spPay(role, rt(p) + (role === 'HC' ? 2 : 0)), r1(s.salary * 1.15)))}/yr if promoted`}</div></div><div class="row gap">${isCur ? '<span class="pill warn">Interim now</span>' : `<button class="btn ghost sm" data-act="spinterim" data-role="${role}" data-from="${f}">Make interim</button>`}${hcSeason ? '' : `<button class="btn sm" data-act="sppromote" data-role="${role}" data-from="${f}">Promote</button>`}</div></div>`; }).join('');
    const ga = role !== 'HC' && !(cur && cur.interim && !cur.fromId) ? `<div class="cand"><div><b>A graduate assistant</b><div class="small muted">Rates 64. Costs nothing. Holds the job until you fill it.</div></div><div class="row gap"><button class="btn ghost sm" data-act="spinterim" data-role="${role}" data-from="GA">Make interim</button></div></div>` : '';
    const curLine = cur ? `<p class="small"><span class="pill warn">Interim</span> <b>${esc(cur.name)}</b> has the job for now. ${hcSeason ? 'You can give him the job for good when the season ends.' : `<button class="btn sm" data-act="spkeep" data-role="${role}">Give him the job</button> <button class="btn ghost sm" data-act="spback" data-role="${role}">End the interim</button>`}</p>` : '';
    return `<div class="cands"><div class="eyebrow">${esc(ROLE_TITLE[role])}${cur ? '' : ' · open'}</div>${curLine}${who}${ga}${role === 'HC' && !feed.length ? '<p class="hint">You have no coordinator to move up.</p>' : ''}</div>`;
  }).join('');
  const a = spAhc(); const can = STAFF_ROLES.filter(r => r !== 'HC' && spCan(r) && state.staff[r] && !state.staff[r].me && !state.staff[r].interim);
  const ahc = can.length || a ? `<div class="cands"><div class="eyebrow">Assistant head coach · optional</div>${a ? `<p class="small"><b>${esc(state.staff[a].name)}</b> (${esc(ROLE_TITLE[a])}) is your assistant head coach. <button class="btn ghost sm" data-act="spahcoff" data-role="${a}">Take the title away</button></p>` : '<p class="hint">Nobody has the title. You never have to give it out.</p>'}
    <p class="hint">The title comes with a 15% raise. He is first in line if the head coach job opens, and he loses less in the bigger job.</p>
    <details><summary class="small">${a ? 'Give it to someone else' : 'Choose an assistant head coach'}</summary>${can.filter(r => r !== a).map(r => { const c = state.staff[r]; return `<div class="cand"><div><b>${esc(c.name)}</b> <span class="muted">· ${esc(ROLE_TITLE[r])} · OVR ${c.ovr}</span></div><button class="btn ghost sm" data-act="spahc" data-role="${r}">Name him (+${fm(r1(Math.max(0.1, c.salary * 0.15)))}/yr)</button></div>`; }).join('')}</details></div>` : '';
  if (!rows && !ahc) return '';
  return `<section class="card" id="spcard"><div class="head"><div><div class="eyebrow">Promote from within</div><h2 class="h2">Promotions and interims</h2></div><p class="hint">When a job is open you can move one of your own coaches up into it, or name an interim who keeps his own job and covers both. ${isCoach() ? 'The head coach job is yours, so it is never on this list.' : 'A head coach is named for good in the offseason; during the season you choose the interim.'}</p></div>${rows || '<p class="hint">No job is open right now. Fire a coach, or wait for one to leave, and his job shows up here.</p>'}${ahc}</section>`;
}
{ const _f = vStaff; vStaff = function () {
  let h = _f.apply(this, arguments);
  try { const card = spCardHTML(); if (card) { const i = h.indexOf('</section>'); h = i < 0 ? h + card : h.slice(0, i + 10) + card + h.slice(i + 10); } } catch (e) { }
  return h;
}; }
Object.assign(actions, {
  spinterim(d) { after(spMsg(spInterim(d.role, d.from))); },
  sppromote(d) { after(spMsg(spPromote(d.role, d.from))); },
  spkeep(d) { after(spMsg(spKeep(d.role))); },
  spback(d) { after(spMsg(spSendBack(d.role))); },
  spahc(d) { after(spMsg(spSetAhc(d.role))); },
  spahcoff(d) { after(spMsg(spDropAhc(d.role))); },
});
// v10.03: an open job's own card lists the coaches who can move up into it, so you do not have to find the card below
{ const _f = coachCard; coachCard = function (role) {
  let h = _f.apply(this, arguments);
  try { if (!state.staff[role] && spCan(role)) { const feed = spFeed(role); const hcSeason = role === 'HC' && state.phase !== 'offseason'; const act = hcSeason ? 'spinterim' : 'sppromote';
    if (feed.length) { const list = feed.map(f => { const s = state.staff[f]; const p = spProject(s, role, f); return `<button class="btn sm" data-act="${act}" data-role="${role}" data-from="${f}">${esc(s.name)} · ${f} · ${role === 'HC' ? coachOvr(p) : p.ovr}</button>`; }).join('');
      const add = `<div class="small mt"><b>${hcSeason ? 'Name an interim from your staff' : 'Promote from your staff'}</b> <span class="muted">(his rating in this job)</span></div><div class="row gap" style="flex-wrap:wrap">${list}</div>`; const i = h.lastIndexOf('</div>'); if (i >= 0) h = h.slice(0, i) + add + h.slice(i); } } } catch (e) { }
  return h;
}; }
