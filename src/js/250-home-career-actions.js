/* ===================== HOME SCREEN and PLAYER CAREER: actions and startup ===================== */
function cAfter(msg) { if (msg) cui.flash = msg; cSave(); render(); }
function defaultForm(i) { return { slot: i, first: pick(FIRST), last: pick(LAST), num: String(ri(1, 99)), home: 'MI', pos: 'QB', style: 'pocket', path: 'hs', stars: 3, hsName: '', diff: 'normal', pace: 'every', err: '' }; }
function cSnapshot() { return { nSeasons: cs.p.seasons.length, stars: cs.p.stars, ovr: cOvr(cs.p), offers: cs.rec ? Object.values(cs.rec.schools).filter(s => s.off).length : 0, phase: cs.phase, year: cs.year, committed: cs.rec && cs.rec.committed }; }
function recapRow(r) { return `<tr><td class="nowrap">${esc(cWeekLabel(r.wk))}</td><td>${r.home || r.neutral ? 'vs' : 'at'} ${cs.lvl === 'hs' || String(r.opp).indexOf(' ') > 0 && !cs.league.teams[r.opp] ? esc(r.opp) : cChip(r.opp, { rec: false })}</td><td class="nowrap"><b>${r.w ? 'W' : 'L'}</b> ${r.us}–${r.them}</td><td class="small">${r.role === 'Not playing' ? '<span class="muted">Did not play</span>' : esc(lineText(r.line, cs.p.pos) || '—')}</td><td>${gradeHTML(r.grade, true)}</td></tr>`; }
function cAfterSim(recs, before, stopped) {
  const now = cSnapshot(); const games = recs.filter(Boolean);
  const notes = [];
  if (now.ovr !== before.ovr) notes.push(`OVR ${before.ovr} → ${now.ovr}`);
  if (now.stars && now.stars !== before.stars && before.stars) notes.push(`Stars ${before.stars} → ${now.stars}`);
  if (now.offers > before.offers) notes.push(`${now.offers - before.offers} new offer${now.offers - before.offers > 1 ? 's' : ''}`);
  if (cs.p.xp > 0 && !cs.p.auto) notes.push(`${cs.p.xp} skill points to spend`);
  cSave(); render();
  if (games.length === 1 && !notes.length) { const r = games[0]; openModal(`<div class="eyebrow">${esc(cWeekLabel(r.wk))} · Final</div><h2 class="h2">${r.w ? 'Win' : 'Loss'}, ${r.us}–${r.them}</h2><div class="gsrow">${gradeHTML(r.grade)}<div>${r.role === 'Not playing' ? '<p class="muted">You didn\'t play.</p>' : `<div class="sline">${statLineHTML(r.line, cs.p.pos)}</div>`}<p class="small">+${r.xp} skill points${r.trust != null ? ` · Coach trust ${r.trust >= 0 ? '+' : ''}${r.trust}` : ''}${r.inj ? ` · Injured: ${esc(r.inj)}` : ''}</p></div></div>${r.plays && r.plays.length ? `<ul class="plays small">${r.plays.map(t => `<li><span class="when">Key play</span><span>${esc(t)}</span></li>`).join('')}</ul>` : ''}<div class="row gap mt"><button class="btn primary" data-act="close">Done</button></div>`, 'Game result'); return; }
  if (!games.length && !notes.length) { if (stopped) { cui.flash = stopped; render(); } return; }
  const seasons = cs.p.seasons.slice(before.nSeasons);
  const sTable = seasons.length >= 2 ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Team</th><th>Record</th><th>Your season</th><th>Grade</th><th>Stars</th></tr></thead><tbody>${seasons.map(x => `<tr><td>${x.year}</td><td>${seasonTeamHTML(x)}</td><td>${esc(x.rec)}</td><td class="small">${x.gp} games · ${esc(lineText(x.st, cs.p.pos) || '—')}</td><td>${x.ratio != null && x.gp ? gradeOf(x.ratio)[1] : '—'}</td><td>${x.stars ? starsHTML(x.stars) : ''}</td></tr>`).join('')}</tbody></table></div>` : '';
  openModal(`<div class="eyebrow">Sim results</div><h2 class="h2">${seasons.length >= 2 ? seasons.length + ' seasons' : games.length + ' game' + (games.length === 1 ? '' : 's')} simulated</h2>${stopped ? `<p class="flash">${esc(stopped)}</p>` : ''}${notes.length ? `<p><b>${notes.map(esc).join(' · ')}</b></p>` : ''}${sTable}${!sTable && games.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Opponent</th><th>Result</th><th>Your game</th><th>Grade</th></tr></thead><tbody>${games.slice(-24).map(recapRow).join('')}</tbody></table></div>` : ''}<div class="row gap mt"><button class="btn primary" data-act="close">Done</button></div>`, 'Sim results');
}
function cgFinishUp() {
  clearTimeout(cui.gTimer); pfClear(); const wasDone = cg && cg.done; cg = null; cui.lastRec = null; cui.gRes = null; hideModal();
  if (wasDone && (cs.phase === 'hsoff' || cs.phase === 'coloff' || cs.phase === 'nfloff')) cui.flash = 'The season is over. The offseason starts on the Home tab.';
  cSave(); render();
}
async function cSimTo(kind) {
  const before = cSnapshot(); const log = []; let first = true; let n = 0;
  const startLvl = cs.lvl;
  const stops = {
    spot: () => { if (first) { first = false; return false; } return !cInSeason() || isSpotlight(); },
    dec: () => { if (first) { first = false; return false; } return !cInSeason() || !!cs.event || cRehabAsk() || isSpotlight(); },
    season: () => !cInSeason(),
    n5: () => n++ >= 5 || !cInSeason(),
    senior: () => cs.lvl !== 'hs' || (cs.phase === 'hs' && cs.hs.cls >= 3),
    signing: () => cs.lvl !== 'hs' || offStep() === 'signing',
  };
  const long = kind === 'senior' || kind === 'signing';
  // GPT-I5: one week at a time, handing the page back to the browser, with a Stop button for long runs
  const run = cui.simming = { cancel: false }; let res, last = performance.now(), shown = false;
  try {
    for (let guard = 0; guard < 2000; guard++) {
      res = cSimUntil(stops[kind], { events: long, spend: long || cs.p.auto, log, max: 1 });
      if (res !== 'max') break;
      if (cs.year !== run.year) { run.year = cs.year; cSave(); } // a long run is saved as each year turns over
      if (run.cancel) { res = 'cancel'; break; }
      if (performance.now() - last > 35) {
        if (!shown) { shown = true; openModal(`<div class="eyebrow">Simulating</div><h2 class="h2" id="csimprog">Simulating…</h2><p class="small muted" id="csimwhere" aria-live="polite"></p><div class="row gap mt"><button class="btn ghost" data-act="csimstop" id="csimcancel">Stop</button></div>`, 'Simulating'); }
        const w = document.getElementById('csimwhere'); if (w) w.textContent = `${cs.year} · ${cInSeason() ? cWeekLabel(cs.week) : 'Offseason'} · ${cName(cs.p)}, ${cOvr(cs.p)} OVR`;
        await new Promise(r => setTimeout(r, 0)); last = performance.now();
      }
    }
  } finally { cui.simming = null; }
  if (shown) hideModal();
  let msg = '';
  if (res === 'cancel') msg = 'Sim stopped. Everything up to this week is kept.';
  else if (res === 'event') msg = 'Stopped for a decision. It\'s on the Home tab.';
  else if (res === 'choice') msg = offStep() === 'signing' ? 'Signing day is here. Choose your school.' : offStep() === 'draft' ? 'Time to decide about the NFL Draft.' : offStep() === 'nmoney' ? 'Free agency: pick your next team on the Home tab.' : 'A decision needs you.';
  else if (kind === 'spot' && cInSeason() && isSpotlight()) msg = 'Next up is a big game. Play it from the top of the page.';
  if (!cInSeason() && startLvl === cs.lvl && (cs.phase === 'hsoff' || cs.phase === 'coloff' || cs.phase === 'nfloff') && !msg) msg = 'The season is over. The offseason starts on the Home tab.';
  if (kind === 'senior' && cs.lvl === 'hs' && cs.hs.cls >= 3) msg = 'Your senior season is here. Skill points were spent for you along the way.';
  cui.tab = 'home';
  cAfterSim(log, before, msg);
}
const C_SAVE_FAIL = 'Your player career could not be saved (browser storage is full or blocked), so nothing was switched. Create a save code on the Save slots tab to keep a copy, or delete a slot you no longer need, then try again.';
const AD_SAVE_FAIL = 'Your AD career could not be saved (browser storage is full or blocked), so nothing was switched. Create a save code on the Save file tab, or delete a slot you no longer need, then try again.';
// Leaving a mode saves it first. If storage refuses, the switch doesn't happen.
async function leaveMode() {
  if (appMode === 'ad' && state && !saveBlocked) { if (!(await saveNow())) { notify(AD_SAVE_FAIL); return false; } }
  if (appMode === 'career' && cs) { if (!(await cSaveNow())) { cui.flash = C_SAVE_FAIL; render(); return false; } }
  return true;
}
async function enterAD() {
  if (appMode === 'career' && !(await leaveMode())) return;
  if (appMode === 'ad' && NS === 'coach' && state && !saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL);
  switchNS('ad');
  // a commissioner career in memory is not an AD career: save it and open the last AD career instead
  if (state && (isComm() || isOwner())) { if (!saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL); state = null; }
  if (!state) { const t = lastADSlot(); if (!t) { appMode = 'home'; rngOwner = null; cui.adPick = true; ui.newDiff = ui.newDiff || 'normal'; render(); window.scrollTo(0, 0); return; } const a = +lsGet(ACTIVE_KEY); const m = slotsMetaOf('ad'); if (!(a && lsGet(SLOT_KEY(a)) && !(m[a] && (m[a].comm || m[a].own)))) setActiveSlot(t); } /* the active slot stays when it is an AD career (boot reports it if it is damaged) */
  appMode = 'ad'; rngOwner = 'ad'; hideModal();
  if (!state) { await boot(); if (state && (isComm() || isOwner())) { const t = lastADSlot(); if (t) { setActiveSlot(t); state = null; await boot(); } } return; }
  RNG.s = (state.rng >>> 0) || RNG.s; applyTheme(); render();
}
// Opens the active career, or the first career in any slot that loads. Damaged slots are
// reported and left untouched.
async function openFirstCareer() {
  const a = +lsGet(CACTIVE_KEY) || 1; const order = [a, 1, 2, 3, 4, 5].filter((x, k, arr) => arr.indexOf(x) === k); const bad = [];
  for (const i of order) { if (!lsGet(CSLOT_KEY(i))) continue; const r = await cLoadSlot(i); if (r.ok) break; bad.push(i); }
  return bad;
}
async function enterCareer(v) {
  if (appMode === 'ad' && !(await leaveMode())) return;
  appMode = 'career'; rngOwner = 'career'; hideModal();
  if (!cs) {
    const bad = await openFirstCareer();
    if (bad.length) cui.flash = `Career slot${bad.length > 1 ? 's' : ''} ${bad.join(', ')} could not be loaded and ${bad.length > 1 ? 'were' : 'was'} left untouched. You can still delete ${bad.length > 1 ? 'them' : 'it'} on the Save slots tab.`;
    if (cs && cs.settled) { const st = cs.settled; cui.flash = (cui.flash ? cui.flash + ' ' : '') + `Your game in ${cWeekLabel(st.wk)} was still going when you left, so it was played to the final: ${st.w ? 'won' : 'lost'} ${st.us}–${st.them}.`; cs.settled = null; cSave(); }
  }
  else RNG.s = (cs.rng >>> 0) || RNG.s;
  if (v === 'new' || !cs) { const free = [1, 2, 3, 4, 5].find(i => !lsGet(CSLOT_KEY(i))) || 1; cui.form = defaultForm(free); cui.tab = 'saves'; }
  else if (v === 'saves') cui.tab = 'saves';
  else cui.tab = cui.tab && cui.tab !== 'saves' ? cui.tab : 'home';
  render(); window.scrollTo(0, 0);
  if (cui.form) { const el = document.getElementById('cf-first'); if (el) el.focus(); }
}
async function goHome() {
  if (appMode === 'ad' && (ui.simming || liveBusy())) return notify(LIVE_LOCK_MSG);
  if (appMode === 'career' && gameLocked()) return notify('Finish the game first, or close it and come back: it waits for you.');
  if (!(await leaveMode())) return;
  appMode = 'home'; rngOwner = null; hideModal(); cui.confirm = null; cui.adPick = false; cui.coSetup = false; cui.flash = ''; ui.flash = ''; render(); window.scrollTo(0, 0);
  const b = document.querySelector('#view [data-act="goad"]'); if (b) b.focus({ preventScroll: true });
}
Object.assign(actions, {
  gohome() { goHome(); },
  goad() { enterAD(); },
  // first AD career: pick the school on the home screen, then create it
  adpick() { cui.adPick = true; ui.newDiff = ui.newDiff || 'normal'; render(); window.scrollTo(0, 0); const el = document.getElementById('nc-tid'); if (el) el.focus(); },
  adpickdiff(d) { ui.newDiff = d.v; render(); refocus({ act: 'adpickdiff', v: d.v }); },
  adpickcancel() { cui.adPick = false; render(); },
  async adpickstart() { const sel = document.getElementById('nc-tid'); if (sel) ui.nc.tid = sel.value; const sn = document.getElementById('nc-nfl'); if (sn) ui.nc.nfl = sn.value; cui.adPick = false; if (appMode === 'career' && !(await leaveMode())) return; switchNS('ad'); appMode = 'ad'; rngOwner = 'ad'; hideModal(); const gm = ui.nc.lvl === 'nfl' ? (NFL_BY[ui.nc.nfl] ? ui.nc.nfl : 'DET') : null;
    // with other careers in the AD slots (a commissioner, say), the new one goes in a free slot instead of loading theirs
    if ([1, 2, 3, 4, 5].some(i => lsGet(SLOT_KEY(i)))) { if (state && !saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL); const free = firstFreeSlot(); if (!free) { state = null; await boot(); ui.tab = 'file'; ui.flash = 'All five AD save slots are in use. Delete one here, then pick your school again from the Home screen.'; render(); return; }
      newGame(ui.newDiff || 'normal', null, null, gm ? 'MICH' : ui.nc.tid); if (gm) { goPro(gm, { role: 'gm' }); state.tline = []; } setActiveSlot(free); resetUi(); applyTheme(); save(); }
    else { state = null; await boot({ tid: ui.nc.tid, diff: ui.newDiff || 'normal', gm }); } ui.tab = isPro() ? 'off' : 'office'; render(); window.scrollTo(0, 0); },
  chlwatch(d) { hlCareer(+d.i); },
  patchall() { openModal(patchAllHTML(), 'Patch notes'); },
  gocareer(d) { enterCareer(d.v); },
  homeset() { cui.homeSet = true; openModal(displaySettingsHTML('home'), 'Display settings'); },
  ctab(d) { if (!$('#modal').hidden) { if (cg && cg.done) { cgFinishUp(); } else { clearTimeout(cui.gTimer); hideModal(); } } const back = tabScrollLeave(cui, d.tab); cui.tab = d.tab; cui.confirm = null; render(); window.scrollTo(0, back); },
  cmore() { openModal(cMoreView(), 'All sections'); },
  cplay() { if (cs.event) return cAfter('Answer the decision on the Home tab first.'); if (!cInSeason() || !myGameSpec()) return; openGame(); cSave(); },
  cresume() { openGame(); },
  csim() { if (cs.event) return cAfter('Answer the decision on the Home tab first.'); if (!cInSeason()) return; const before = cSnapshot(); const rec = cSimWeek(); cAfterSim([rec], before); },
  csimstop() { if (cui.simming) { cui.simming.cancel = true; const b = document.getElementById('csimcancel'); if (b) { b.disabled = true; b.textContent = 'Stopping after this week…'; } } },
  csimto(d) { if (!cInSeason() && !(d.v === 'senior' || d.v === 'signing')) return; if (cs.event) return cAfter('Answer the decision on the Home tab first.'); cSimTo(d.v); },
  cpick(d) {
    if (!cg || !cg.pending) return; const r = cgChoose(cg, d.k); if (!r) return;
    cui.gRes = r; cui.gResI = cg.i; if (r.follow) { cgView(); return; }
    sfxFor(r); cgRun();
  },
  cgauto() { if (!cg || cg.done) return; clearTimeout(cui.gTimer); cgAutoplay(cg); cgRun(); },
  cgdone() { cgFinishUp(); },
  cevent(d) { const r = cResolveEvent(+d.i); cAfter(r ? `You chose: ${r}.` : ''); },
  coffnext() { const e = offNext(); if (e) return cAfter(e); cui.confirm = null; if (cInSeason()) { cui.tab = 'home'; cAfter(cs.lvl === 'hs' ? `Your ${HS_CLS[cs.hs.cls].toLowerCase()} season starts now.` : cs.lvl === 'nfl' ? `The ${cs.year} season with the ${nflName(cs.nfl.tm)} starts now.` : `The ${cs.year} season at ${cTeamName(cs.col.tid)} starts now.`); } else cAfter(); },
  ccamp(d) { const r = doCamp(d.v); if (r) cs.off.campTxt = r.txt; cAfter(); },
  cvisit(d) { const rep = doVisit(d.id); cAfter(rep ? `${rep.kind === 'official' ? 'Official' : 'Unofficial'} visit to ${cTeamName(d.id)}. Depth chart: ${rep.depth.toLowerCase()}.${rep.offer ? ' They offered you a scholarship!' : ''}` : 'You can\'t visit there right now.'); },
  ccommit(d) { if (commitTo(d.id)) cAfter(`You committed to ${cTeamName(d.id)}. You can still back out until you sign.`); },
  cdecommit() { if (decommit()) cAfter('You reopened your recruitment.'); },
  cask(d) { const r = negotiate(d.id); if (!r) return; cAfter(r.ok ? `${cTeamName(d.id)} raised its NIL offer by ${money(r.raise)}.` : `${cTeamName(d.id)} said no, and it's a little less interested now.`); },
  cask2(d) { readCForm(); const ib = document.getElementById('cimportbox'); if (ib) cui.importCode = ib.value; cui.confirm = cui.confirm === d.k ? null : d.k; render(); const k = d.k.split('-'); const sel = k[0] === 'sign' ? `[data-act="csign"][data-id="${k[1]}"]` : k[0] === 'port' ? `[data-act="cpcommit"][data-id="${k[1]}"]` : k[0] === 'over' ? '[data-act="cstart"]' : k[0] === 'fa' ? `[data-act="cfa"][data-i="${k[1]}"]` : k[0] === 'nflskip' ? '[data-act="cnflskip"]' : k[0] === 'retire' ? '[data-act="cretire"]' : k[0] === 'trade' ? '[data-act="ctrade"]' : `[data-act="cdel"][data-i="${k[1]}"]`; const b = document.querySelector(sel) || document.querySelector(`[data-k="${d.k}"]`); if (b) b.focus(); },
  csign(d) { const nm = cTeamName(d.id); if (signWith(d.id)) { cui.confirm = null; cui.tab = 'home'; cAfter(`You signed with ${nm}. Welcome to college football.`); } },
  cportal() { if (enterPortal()) { cui.tab = 'recruit'; cAfter(`You entered the transfer portal. ${Object.keys(cs.portal.offers).length} schools made offers in the first round.`); } },
  cstay() { const nm = cTeamName(cs.col.tid); offNext(); cAfter(`You're staying at ${nm}.`); },
  cpwait() { const out = portalWait(); if (!out) return; const nOff = out.filter(x => x[0] === 'offer').length, nPull = out.filter(x => x[0] === 'pulled').length; cAfter(`Round ${cs.portal.round}: ${nOff} new offer${nOff === 1 ? '' : 's'}${nPull ? `, ${nPull} withdrawn` : ''}.`); },
  cpcommit(d) { if (portalCommit(d.id)) { cui.confirm = null; cAfter(d.id === cs.portal.from ? `You're going back to ${cTeamName(d.id)}.` : `You're transferring to ${cTeamName(d.id)}.`); } },
  ccomb(d) { if (runDrill(d.k, d.pro === '1')) { cSave(); cAfter(); } },
  cendorse(d) { if (endorseAnswer(d.id, d.v === '1')) { cSave(); cAfter(); } },
  async cafter(d) {
    if (d.v !== 'coach2' && !careerAfter(d.v)) return; cSave();
    if (d.v === 'booth') return cAfter();
    // start a Coach mode career for him: position coach at his college, with a reputation boost
    const tid = cs.col && CTEAMS0_AD[cs.col.tid] ? cs.col.tid : 'MICH'; const role = STAFF_ROLES.includes(cs.p.pos) ? cs.p.pos : 'QB';
    ui.coForm = Object.assign(coForm(), { name: cName(cs.p), start: 'any', lvl: 'col', tid, role, repBonus: careerRepBonus(), fromPlayer: cName(cs.p) });
    if (!(await leaveMode())) return; appMode = 'home'; rngOwner = null; cui.coSetup = true; render(); window.scrollTo(0, 0);
  },
  cdraft(d) {
    if (d.v === 'yes' && !cs.agent) { if (!cui.agentPick || !setAgent(cui.agentPick)) return render(); }
    declareDraft(d.v === 'yes');
    if (cs.phase === 'done') { const r = cs.done.draft; cui.tab = 'home'; cSave(); render(); dnPlay('Draft night', r.year + ' NFL Draft', cDraftNightScript(r)); }
    else cAfter();
  },
  cnfl() { if (nflStart()) { cui.tab = 'home'; cui.confirm = null; cAfter(`Welcome to the NFL. Your rookie season with the ${nflName(cs.nfl.tm)} starts now.`); } },
  cnflskip() { if (nflSkip()) { cui.confirm = null; cAfter('Your career ends at the draft.'); } },
  cretire() { if (nflRetire('choice')) { cui.confirm = null; cui.tab = 'home'; cAfter('You retired.'); window.scrollTo(0, 0); } },
  cfa(d) { const o = cs.nfl.fa && cs.nfl.fa.offers[+d.i]; if (o && nflSign(+d.i)) { cui.confirm = null; cAfter(`You signed with the ${nflName(o.tm)}.`); } },
  cfawait() { const out = nflFAWait(); if (!out) { if (typeof ctBusyFA === 'function' && ctBusyFA()) cAfter('Finish or end your contract talks first.'); return; } const nOff = out.filter(x => x[0] === 'offer').length, nPull = out.filter(x => x[0] === 'pulled').length; cAfter(`A week of free agency: ${nOff} new offer${nOff === 1 ? '' : 's'}${nPull ? `, ${nPull} pulled` : ''}.`); },
  ctrade() { cui.confirm = null; const r = nflRequestTrade(); if (!r) return; cAfter(r.ok ? `You've been traded to the ${nflName(r.to)}.` : 'Your team turned down the trade request. Your coach isn\'t happy.'); },
  chold() { cui.confirm = null; const r = nflHoldout(); if (!r) return; cAfter(r.ok ? `The holdout worked: a new deal at ${money(r.apy)} a year.` : `The holdout failed: ${money(r.fine)} in fines, and your coach isn't happy.`); },
  cmajor(d) { if (setMajor(d.v)) cAfter('Major set.'); },
  cstudy(d) { if (setStudy(d.v)) cAfter(''); },
  cext() { const r = nflAskExtension(); if (!r) return; cAfter(r.ok ? `Extension signed: ${r.yrs} more year${r.yrs > 1 ? 's' : ''} at ${money(r.apy)} a year.` : 'No extension for now. The team wants to see another season.'); },
  cnlg(d) { cui.nlgV = d.v; render(); refocus({ act: 'cnlg', v: d.v }); },
  cup(d) { const k = d.k; const n = upgrade(k, +(d.n || 1)); cSave(); render(); refocus({ act: 'cup', k, ...(d.n ? { n: d.n } : {}) }); if (n) announce(`${CATTR[cs.p.pos].find(a => a[0] === k)[1]} is now ${cs.p.a[k]}.`); },
  cauto() { autoAssign(); cAfter('Skill points spent.'); },
  ctrain(d) { const t = TRAIN.find(x => x.id === d.id); if (buyTraining(d.id)) cAfter(`Done: ${t.name}.`); },
  crs(d) { if (!cs.col) return; cs.col.rs = d.v === 'on'; cAfter(cs.col.rs ? 'Redshirt plan on. You\'ll play four games at most this season.' : 'Redshirt plan off.'); refocus({ act: 'crs', v: d.v }); },
  cinj(d) { if (['low', 'normal', 'high'].includes(d.v)) { if (d.v === 'normal') delete cs.injRule; else cs.injRule = d.v; } cAfter(); refocus({ act: 'cinj', v: d.v }); },
  cpace(d) { if (PACES[d.v]) cs.pace = d.v; cAfter(); refocus({ act: 'cpace', v: d.v }); },
  cgrowth(d) { if (cSetGrowth(d.v)) { cAfter(); refocus({ act: 'cgrowth', v: d.v }); } },
  cdiff(d) { if (CDIFF[d.v]) cs.diff = d.v; cAfter(); refocus({ act: 'cdiff', v: d.v }); },
  csound(d) { cs.sound = d.v === 'on'; if (cs.sound) sfx('crowd'); cAfter(cs.sound ? 'Sound on.' : 'Sound off.'); refocus({ act: 'csound', v: d.v }); },
  cautoset(d) { cs.p.auto = d.v === 'on'; if (cs.p.auto) autoAssign(); cAfter(); refocus({ act: 'cautoset', v: d.v }); },
  crecf(d) { cui.recF = d.v; render(); refocus({ act: 'crecf', v: d.v }); },
  clg(d) { cui.lgV = d.v; render(); refocus({ act: 'clg', v: d.v }); },
  cnew(d) { cui.form = defaultForm(+d.i); cui.confirm = null; render(); const el = document.getElementById('cnewform'); if (el) { el.scrollIntoView({ block: 'start' }); const f = document.getElementById('cf-first'); if (f) f.focus({ preventScroll: true }); } },
  cform(d) { readCForm(); const f = cui.form; if (!f) return; f[d.k] = d.k === 'stars' ? +d.v : d.v; if (d.k === 'pos') f.style = CSTYLES[d.v][0][0]; render(); refocus({ act: 'cform', k: d.k, v: d.v }); },
  ccancel() { cui.form = null; cui.confirm = null; render(); },
  async cstart() {
    readCForm(); const f = cui.form; if (!f) return; cui.confirm = null;
    f.first = String(f.first || '').trim(); f.last = String(f.last || '').trim(); const num = Math.round(+f.num);
    if (!f.first || !f.last) { f.err = 'Give your player a first and last name.'; render(); return; }
    if (!Number.isFinite(num) || num < 0 || num > 99) { f.err = 'Jersey numbers go from 0 to 99.'; render(); return; }
    if (cs && !(await cSaveNow())) { f.err = C_SAVE_FAIL; render(); return; }
    newCareer({ pos: f.pos, style: f.style, first: f.first, last: f.last, num, home: f.home, path: f.path, stars: f.stars, hsName: f.hsName ? String(f.hsName).trim().slice(0, 28) + (/high|academy|prep|school/i.test(f.hsName) ? '' : ' High') : '', diff: f.diff, pace: f.pace, two: f.two === 'on' && !!TWO_WAY[f.pos], world: f.world || null });
    cslot = f.slot; lsSet(CACTIVE_KEY, String(cslot)); cui.form = null; cui.tab = 'home'; cg = null; rosterCache.clear();
    cui.flash = f.path === 'college' ? 'Your offers are in. Compare them on the Recruiting tab, then sign.' : 'Welcome to high school football. Play your first game from the top of the page.';
    cSave(); await cFlush(); render(); window.scrollTo(0, 0);
  },
  async crestoregood(d) { const i = +d.i; const g = goodCopy('mfpc-'); cui.confirm = null; if (!g || g.i !== i) return render(); if (!lsSet(CSLOT_KEY(i), g.raw)) { cui.flash = 'There is not enough room in browser storage to restore it. Delete another slot first.'; return render(); } cui.badSlots = (cui.badSlots || []).filter(x => x !== i); await repairSlotMeta(); return actions.cload({ i: String(i) }); },
  async cload(d) { const i = +d.i; if (cs && !(await cSaveNow())) { cui.flash = C_SAVE_FAIL; render(); return; } const r = await cLoadSlot(i); if (!r.ok) { cui.flash = r.err; render(); return; } cui.tab = 'home'; cui.form = null; if (cs.settled) { const s = cs.settled; cui.flash = `Your game in ${cWeekLabel(s.wk)} was still going when you left, so it was played to the final.`; cs.settled = null; } else cui.flash = `Loaded ${cName(cs.p)}.`; cSave(); render(); },
  async cretry() { const ok = await cSaveNow(); cui.flash = ok ? 'Saved.' : C_SAVE_FAIL; render(); },
  async ccode() { cui.code = await cMakeCode(); cui.codeMsg = ''; render(); const t = document.getElementById('ccodeout'); if (t) { t.focus(); t.select(); } },
  async ccopy() { const t = document.getElementById('ccodeout'); if (!t) return; let ok = false; try { await navigator.clipboard.writeText(t.value); ok = true; } catch (e) { t.focus(); t.select(); try { ok = document.execCommand('copy'); } catch (e2) { } } announce(ok ? 'Save code copied.' : 'Select the code and copy it.'); cui.codeMsg = ok ? 'Copied.' : 'Select the code above and copy it.'; const m = document.getElementById('ccodemsg'); if (m) m.textContent = cui.codeMsg; },
  async cimport() {
    const box = document.getElementById('cimportbox'); const code = box ? box.value : ''; cui.importCode = code; cui.confirm = null;
    let c; try { c = await cReadCode(code); } catch (e) { cui.importMsg = e.message + ' Your current career was not changed.'; render(); return; }
    if (cs && !(await cSaveNow())) { cui.importMsg = C_SAVE_FAIL; render(); return; }
    const target = cs ? cslot : ([1, 2, 3, 4, 5].find(i => !lsGet(CSLOT_KEY(i))) || 1);
    try { cAdopt(c); } catch (e) { cui.importMsg = 'That save could not be loaded: ' + e.message + ' Your current career was not changed.'; render(); return; }
    cslot = target; lsSet(CACTIVE_KEY, String(target)); cui.importCode = ''; cui.importMsg = ''; cui.code = '';
    cui.flash = `Save code loaded into slot ${target}: ${cName(cs.p)}.`; cui.tab = 'home'; cSave(); render();
  },
  async cdel(d) { const i = +d.i; await cDeleteSlot(i); cui.confirm = null; if (cs && cslot === i) { cs = null; cg = null; } cui.flash = `Slot ${i} deleted.`; render(); },
});
// Career sounds: a crowd roar when the player's snap scores or forces a turnover.
function sfxFor(r) { try { if (cs && cs.sound && r && (r.imm === 'td' && cg && cg.side === 'off' || r.imm === 'to' && cg && cg.side === 'def' || r.pick6)) sfx('crowd'); } catch (e) { console.error(e); } }
// career form fields, sort menus and admin inputs
// the school picker on the home screen
document.addEventListener('change', e => { if (appMode !== 'home' || !cui.adPick) return; if (e.target.id === 'nc-tid') { ui.nc.tid = e.target.value; render(); const el = document.getElementById('nc-tid'); if (el) el.focus(); } });
document.addEventListener('change', e => {
  if (appMode !== 'career') return; const t = e.target;
  if (t.id === 'cfield') { setPref('field', t.checked ? 'on' : 'off'); if (!t.checked) pfClear(); else pf.cg = null; cgView(); return; }
  if (t.id === 'cautochk') { cs.p.auto = t.checked; if (t.checked) autoAssign(); cSave(); render(); refocus({}); const c = document.getElementById('cautochk'); if (c) c.focus(); return; }
  if (t.id === 'crecsort') { cui.recSort = t.value; render(); const s = document.getElementById('crecsort'); if (s) s.focus(); return; }
  if (t.id === 'cconfsel') { cui.lgConf = t.value; render(); const s = document.getElementById('cconfsel'); if (s) s.focus(); return; }
  if (t.id === 'cadmteam') { cui.admT = t.value; render(); const s = document.getElementById('cadmteam'); if (s) s.focus(); return; }
  if (t.dataset && t.dataset.cadm) { cAdmSet(t.dataset.cadm, t); return; }
  if (t.id && t.id.startsWith('cf-')) { readCForm(); return; }
});
// Hiding the page saves the career only if it's the mode being played; anything already queued
// is written either way. An inactive career is never re-snapshotted (its random position
// belongs to it, not to AD).
function cPageHidden() { if (cs && appMode === 'career') cSave(); if (cq) cFlushSync(); }
window.addEventListener('pagehide', cPageHidden);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') cPageHidden(); });
// Start on the home screen.
function bootHome() { appMode = 'home'; rngOwner = null; render(); const b = document.querySelector('#view [data-act="goad"]'); if (b && !prefs.seen) { } }
bootHome();
repairSlotMeta().then(n => { if (n && appMode === 'home') render(); }).catch(() => { });
// Player Career slot operations run one at a time, in the order they were asked for, so a slow load
// can't finish after a later one and switch careers behind the player's back (B10).
['cstart', 'cload', 'cimport', 'cdel'].forEach(k => { const fn = actions[k]; actions[k] = function (d) { const run = () => fn.call(this, d); cui.slotQ = (cui.slotQ || Promise.resolve()).then(run, run).catch(e => console.error(e)); return cui.slotQ; }; });

/* ===================== v9.9 Player Career UI: two-way, agent, rehab, rival, the turn-pro decision ===================== */
function cRehabCardHTML() {
  if (!cRehabAsk()) return ''; const p = cs.p;
  return `<section class="card decision"><div class="eyebrow">Injury · ${esc(p.injName)}</div><h2 class="h3">You are out ${p.inj} weeks. How do you want to come back?</h2><p class="small muted">The team doctor's advice: ${p.inj >= 6 ? 'this one needs time. Rushing it is a real risk.' : 'you can push it a little, but listen to your body.'}</p>
   <div class="evopts">${Object.entries(CREHAB).map(([k, r]) => `<button class="evopt" data-act="crehab" data-v="${k}"><b>${esc(r.t)}${k === 'std' ? '' : ` (${Math.max(1, Math.round(p.inj * r.f))} weeks)`}</b><span>${esc(r.d)}</span></button>`).join('')}</div></section>`;
}
function twoWayCardHTML() {
  const p = cs.p; if (!p.two && !p.twoWas) return '';
  if (!p.two) return `<section class="card"><div class="eyebrow">Two-way</div><p class="muted small">You played ${esc(CPOS_NAME[p.twoWas].toLowerCase())} too, before focusing on ${esc(CPOS_NAME[p.pos].toLowerCase())}.</p></section>`;
  const rows = CATTR[p.two].map(([k, l]) => `<li><span class="an">${esc(l)}</span><span class="av">${p.a2[k]}</span><span class="bar"><i class="${p.a2[k] >= 85 ? 'good' : p.a2[k] >= 70 ? 'warn' : 'bad'}" style="width:${p.a2[k]}%"></i></span></li>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Two-way player</div><h2 class="h3">${cOvr2(p)} OVR ${esc(p.two)}</h2></div></div><p class="hint">You also play ${esc(CPOS_NAME[p.two].toLowerCase())}${cs.lvl === 'nfl' ? ' in college. NFL teams want you at one position.' : `, about ${Math.round((cs.lvl === 'col' || cs.lvl === 'hs' ? clamp(0.2 + (cOvr2(p) - 65) * 0.012, 0.08, 0.5) : 0) * 100)}% of the snaps there when you start. These ratings grow on their own each season.`}</p>
   <ul class="attrs">${rows}</ul>${cs.lvl !== 'nfl' ? `<div class="row gap mt">${cui.confirm === 'twoend' ? '<button class="btn danger sm" data-act="ctwoend">Confirm: play one position from now on</button>' : '<button class="btn ghost sm" data-act="cask2" data-k="twoend">Give up the second position</button>'}</div>` : ''}</section>`;
}
function agentCardHTML(pick) {
  const a = agentOf();
  if (a) return `<section class="card"><div class="eyebrow">Your agent</div><h2 class="h3">${esc(a.n)}</h2><p class="small"><b>${esc(a.t)}.</b> ${esc(a.d)}</p></section>`;
  if (!pick) return '';
  return `<div class="eyebrow mt">Pick an agent</div><div class="evopts">${Object.entries(AGENTS).map(([k, x]) => `<button class="evopt${cui.agentPick === k ? ' on' : ''}" data-act="cagentpick" data-v="${k}" aria-pressed="${cui.agentPick === k}"><b>${esc(x.n)} · ${esc(x.t)}</b><span>${esc(x.d)}</span></button>`).join('')}</div>`;
}
function rivalCardHTML() {
  const r = cs.rival; if (!r) return ''; const K = RIVAL_KEY[r.pos] || ['tkl', 60, 'tackles'];
  const rows = r.seasons.slice().reverse().map(s => `<tr><td>${s.y}</td><td class="num">${s.mine}</td><td class="num">${s.v}</td><td>${rivalBeat(s) ? '<span class="pill good">You</span>' : `<span class="pill ghost">${esc(r.n.split(' ')[1] || r.n)}</span>`}${s.aw ? ` <span class="small muted">${esc(r.n.split(' ')[1] || '')}: ${esc(s.aw)}</span>` : ''}</td></tr>`).join('');
  const won = r.seasons.filter(rivalBeat).length;
  return `<section class="card"><div class="eyebrow">Your rival</div><h2 class="h3">${esc(r.n)}</h2><p class="small muted">${esc(CPOS_NAME[r.pos])} · ${esc(cTeamName(r.tid))}${r.h2h[0] + r.h2h[1] ? ` · head to head ${r.h2h[0]}-${r.h2h[1]}` : ''}${r.seasons.length ? ` · better season ${won} of ${r.seasons.length}` : ''}</p>
   ${rows ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>You</th><th>${esc(r.n.split(' ')[1] || 'Him')}</th><th>Better year</th></tr></thead><tbody>${rows}</tbody></table></div><p class="hint">${esc(K[2][0].toUpperCase() + K[2].slice(1))} each season.</p>` : '<p class="muted small">The comparisons start after your first college season.</p>'}
   ${r.draft ? `<p class="small mt">${r.draft.udfa ? `${esc(r.n)} went undrafted in ${r.draft.y}.` : `${esc(r.n)} went in round ${r.draft.round}, pick ${r.draft.pick} of the ${r.draft.y} draft, to the ${esc(r.draft.team)}.`}</p>` : ''}</section>`;
}
// the turn-pro decision, with every voice in your life and the agent you would sign with
function turnProHTML() {
  const V = turnProVoices(); const forced = outOfEligibility(); const pick = cui.agentPick && AGENTS[cui.agentPick] ? cui.agentPick : null;
  const voice = (who, txt) => txt ? `<li><b>${esc(who)}:</b> ${esc(txt)}</li>` : '';
  return `${combineHTML()}<h2 class="h3">The biggest decision of your career</h2><p>Scouts project you: <b>${esc(projText(V.sc))}</b>. <span class="muted small">(Draft grade ${V.sc.toFixed(1)})</span></p>
   <ul class="plainlist voices">${voice('Scouts', V.scoutV)}${voice('Your coach', V.coachV)}${voice('Your family', V.famV)}${V.backV ? voice('If you come back', V.backV) : ''}${V.rival ? voice('Your rival', `${V.rival.n} ${V.rival.draft ? 'is already gone.' : 'is weighing the same choice. If you both go, you will be compared on draft night.'}`) : ''}</ul>
   <p class="small">${forced ? 'You are out of college eligibility. It is time.' : `You have ${eligibilityLeft()} season${eligibilityLeft() === 1 ? '' : 's'} of eligibility left.`}</p>
   ${agentCardHTML(true)}
   <div class="evopts mt"><button class="evopt" data-act="cdraft" data-v="yes" ${pick || agentOf() ? '' : 'disabled'}><b>Declare for the NFL Draft</b><span>${pick || agentOf() ? `With ${esc((agentOf() || AGENTS[pick]).n)} as your agent. Draft night comes right away.` : 'Pick an agent first.'}</span></button>${forced ? '' : '<button class="evopt" data-act="cdraft" data-v="no"><b>Return to school</b><span>Play another college season.</span></button>'}</div>`;
}
Object.assign(actions, {
  crehab(d) { if (setCRehab(d.v)) { cSave(); cAfter(); } },
  ctwoend() { cui.confirm = null; if (dropTwoWay()) { cSave(); cAfter(); } },
  cagentpick(d) { if (!AGENTS[d.v]) return; if (cs.lvl === 'nfl') { if (setAgent(d.v)) { cSave(); return cAfter(); } return; } cui.agentPick = d.v; render(); refocus({ act: 'cagentpick', v: d.v }); },
});

