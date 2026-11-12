/* ===================== APP: actions, input handling, boot ===================== */
// Everything a click or key press can do lives here. Views (ui.js, admin.js) only render;
// storage.js owns saving and loading; the engine files never touch the page.
// After a re-render, put keyboard focus back on the control that was used.
function refocus(d) { const sel = Object.keys(d).map(k => `[data-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${CSS.escape(String(d[k]))}"]`).join(''); const el = document.querySelector('#view ' + sel) || document.querySelector(sel); if (el) el.focus({ preventScroll: true }); }
function resetUi() { ui.overHide = false; ui.sconf = null; ui.seedErr = ''; if (!$('#modal').hidden) { live.sim = live.finished ? null : live.sim; ui.neg = null; hideModal(); } Object.assign(ui, { confirm: null, exportCode: '', importMsg: '', newSlot: null, neg: null, negMsg: '', admP: null, admR: null, swk: null, pollIdx: -1 }); if (live.sim && live.finished) live.sim = null; }
// Slot operations await storage. Only one runs at a time, so two quick clicks can't interleave.
const SAVE_FAIL_MSG = 'This career could not be saved (browser storage is full or blocked), so nothing was switched. Create a save code below to keep a copy, or delete a slot you no longer need.';
// Messages for blocked actions appear where the player is looking: in the open dialog if there is one.
function notify(msg) {
  const m = $('#modal');
  if (!m.hidden) { let el = m.querySelector('.mbody .mflash'); if (!el) { el = document.createElement('p'); el.className = 'flash mflash'; m.querySelector('.mbody').prepend(el); } el.textContent = msg; announce(msg); return; }
  if (typeof appMode !== 'undefined' && appMode === 'career') cui.flash = msg; else ui.flash = msg; render(); // the career screen shows its own notices
}
async function slotOp(fn) { if (ui.slotBusy) return; ui.slotBusy = true; try { await fn(); } catch (e) { console.error(e); ui.flash = 'Something went wrong with that save operation. Your current career was not changed.'; render(); } finally { ui.slotBusy = false; } }
function simUntil(cond) { let n = 0; while (!cond() && n++ < 40 && !state.gameOver && state.phase !== 'offseason') advance(); }
// QOL-20: long lists (rosters, the recruiting board, free agents, the cap page, stats, the story) keep your place
// when you come back to them in the same sitting; every other tab opens at the top. Filters already stay as you set them.
const SCROLL_KEEP = new Set(['roster', 'recruit', 'fa', 'cap', 'stats', 'story', 'cstory', 'schedule', 'depth', 'records', 'league']);
function tabScrollLeave(u, next) { try { u.scrollAt = u.scrollAt || {}; if (u.tab) u.scrollAt[u.tab] = window.scrollY || 0; return next !== u.tab && SCROLL_KEEP.has(next) ? u.scrollAt[next] || 0 : 0; } catch (e) { return 0; } }
const actions = {
  primary() {
    if (isComm()) return commPrimary();
    if (state.phase === 'offseason') { ui.tab = 'off'; return after(); }
    if (state.event) { ui.tab = 'office'; return after('Answer the decision first.'); }
    if (isPro() && overCap()) { ui.tab = 'cap'; return after(`You are ${fmM(-capRoom(ME))} over the salary cap. Release or restructure players, or turn on automatic cap fixes in Settings, before the next game.`); }
    const mg = michGameThisWeek(state.week); const before = state.phase;
    advance();
    if (state.phase === 'offseason' && before !== 'offseason') ui.tab = 'off';
    after();
    if (mg && mg.done) { openModal(boxScore(mg), boxTitle(mg)); if (mg.mResult === 'W') sfx('jingle'); }
  },
  // display preferences (this device) and gameplay settings (this career)
  setpref(d) { if (!setPref(d.k, d.v)) return; if (d.k === 'liveSpeed') live.speed = prefs.liveSpeed; if (d.k === 'callPlays') live.callPlays = prefs.callPlays; render(); if (appMode === 'home' && cui.homeSet && !$('#modal').hidden) openModal(displaySettingsHTML('home'), 'Display settings'); refocus(d); if (d.k === 'skin') announce(`Theme: ${SKINS[prefs.skin].label}.`); },
  cmpset(d) { ui.cmpA = d.id; const p = cmpPlayer(d.id); openModal(playerModal(d.id)); announce(`${p ? p.n : 'Player'} picked. Open another player and choose Compare.`); },
  cmpgo(d) { const a = cmpPlayer(ui.cmpA), b = cmpPlayer(d.id); if (!a || !b) return; openModal(compareHTML(a, b), 'Compare players'); },
  cmpclear() { ui.cmpA = null; hideModal(); },
  retnum(d) { if (retireNumber(d.id)) after('Number retired.'); },
  exportcareer() { const x = careerSummary(); openModal(`${summaryHTML(x)}<div class="row gap mt"><button class="btn primary" data-act="exportdl">Download as a web page</button><button class="btn ghost" data-act="exportcopy">Copy as text</button></div><p class="hint" id="exmsg"></p>`, 'Career summary'); },
  // In claude.ai the page offers the file through the viewer's downloads capability; opened as a file, a plain download works
  async exportdl() { const x = careerSummary(); const html = summaryHTML(x, true); const msg = t => { const m = document.getElementById('exmsg'); if (m) m.textContent = t; };
    const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads').catch(() => null) : null;
    if (dl) { try { await dl.save({ filename: 'football-empire-career.html', data: html }); msg('Saved football-empire-career.html.'); } catch (e) { msg(e && e.code === 'declined' ? 'Not saved.' : 'Saving is not available here. Use Copy as text.'); } return; }
    try { const url = URL.createObjectURL(new Blob([html], { type: 'text/html' })); const a = document.createElement('a'); a.href = url; a.download = 'football-empire-career.html'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); msg('Downloading football-empire-career.html. If nothing happens, use Copy as text.'); } catch (e) { msg('Downloads are blocked here. Use Copy as text.'); } },
  async exportcopy() { const msg = document.getElementById('exmsg'); try { await navigator.clipboard.writeText(summaryText(careerSummary())); if (msg) msg.textContent = 'Copied.'; } catch (e) { if (msg) msg.textContent = 'Copying is blocked here.'; } },
  pplan(d) { if (setPplan(d.k, +d.d)) { save(); render(); refocus({ act: 'pplan', k: d.k, d: d.d }); } },
  popt(d) { const p = P(d.id); if (exerciseOption(d.id, d.v === '1')) after(p ? `${d.v === '1' ? 'Picked up' : 'Declined'} ${p.n}'s fifth-year option.` : ''); },
  dwork(d) { if (workout(d.id)) after('Workout done: you have a full read on him.'); },
  setsch(d) { if (!setScheme(d.side, d.v)) return; save(); render(); refocus(d); announce(`${schN(d.side, d.v)} it is. It takes two games to install.`); },
  setrule(d) { if (!setRule(d.k, d.v)) return; save(); render(); refocus(d); announce('Rule saved.'); },
  rulepreset(d) { if (d.v === 'custom' || !setRulePreset(d.v)) return; save(); render(); refocus(d); announce(`${d.v === 'sandbox' ? 'Sandbox' : RULE_PRESETS[d.v].label} rules saved.`); },
  planclear() { ui.planMove = null; render(); },
  worldmode(d) { if (d.v !== 'on' && d.v !== 'off') return; state.settings.world = d.v; save(); render(); refocus(d); announce('Shared world setting saved.'); },
  worldrules() { if (worldRulesAdopt()) { save(); render(); announce('Your Commissioner league\'s rules are in place.'); } },
  erasmode(d) { if (d.v !== 'on' && d.v !== 'off') return; state.settings.eras = d.v; save(); render(); refocus(d); announce('Eras setting saved.'); },
  scoutmode(d) { if (d.v !== 'ranges' && d.v !== 'exact') return; state.settings.scoutMode = d.v; save(); render(); refocus(d); announce('Scouting setting saved.'); },
  sbxreset() { const r = state.settings.rules; if (!r || !r.sbx) return; r.sbx = SBX_DEF(); save(); render(); announce('Dials reset.'); },
  setgame(d) { const s = state.settings; if (d.k === 'diff' && DIFF[d.v]) s.diff = d.v; else if (d.k === 'ask' || d.k === 'sound') { s[d.k] = d.v === 'true'; if (d.k === 'sound' && s.sound) sfx('whistle'); } else return; save(); render(); refocus(d); announce('Saved.'); },
  togglemode() { setPref('mode', resolvedMode() === 'dark' ? 'light' : 'dark'); render(); refocus({ act: 'togglemode' }); announce(`${resolvedMode() === 'dark' ? 'Dark' : 'Light'} mode.`); },
  toggleside() { setPref('side', prefs.side === 'hidden' ? 'shown' : 'hidden'); render(); const b = prefs.side === 'hidden' ? document.querySelector('#hdr [data-act="toggleside"]') : document.querySelector('#tabs [data-act="toggleside"]'); if (b) b.focus(); announce(prefs.side === 'hidden' ? 'Sidebar hidden.' : 'Sidebar shown.'); },
  resetprefs() { const seen = prefs.seen; prefs = Object.assign({}, PREF_DEFAULTS, { seen }); savePrefs(); applyPrefs(); live.speed = prefs.liveSpeed; live.callPlays = prefs.callPlays; (appMode === 'ad' ? ui : cui).flash = 'Look and layout reset to the defaults.'; render(); if (appMode === 'home' && cui.homeSet && !$('#modal').hidden) openModal(displaySettingsHTML('home'), 'Display settings'); },
  moremenu() { openModal(moreView(), 'All sections'); },
  live() { if (state.event) { ui.tab = 'office'; return after('Answer the decision first.'); } startLive(); },
  live2() { if (isOwner()) return actions.live(); if (state.event) { ui.tab = 'office'; return after('Answer the decision first.'); } startLive2min(); },
  liveresume() { resumeLive(); },
  simcancel() { closeModal(); },
  async adretry() { const ok = await saveNow(); ui.flash = ok ? 'Saved.' : 'Still not saving: browser storage is full or blocked. Create a save code on the Save file tab to keep a copy.'; render(); },
  simreg() { simUntil(() => state.phase !== 'regular'); ui.tab = 'schedule'; after('Regular season complete.'); },
  simloss() { const n0 = mGames().filter(g => g.mResult === 'L').length; simUntil(() => state.phase !== 'regular' || mGames().filter(g => g.mResult === 'L').length > n0); ui.tab = 'schedule'; after(mGames().filter(g => g.mResult === 'L').length > n0 ? `Stopped after a ${myName()} loss.` : 'No losses. The regular season is over.'); },
  simpost() { simUntil(() => false); ui.tab = state.phase === 'offseason' ? 'off' : 'post'; after('On to the offseason.'); },
  autoad() { simYears(1); },
  simyears(d) { simYears(+d.n); },
  practice(d) { state.practice = d.v; after(); },
  autocaps() { autoCaptains(); after('Captains picked.'); },
  tryouts() { const again = state.tryouts === state.season; holdTryouts(); after(again ? '' : `Open tryouts held. ${(state.walkons || []).length} walk-ons are listed below; add the ones you want.`); },
  walkon(d) { const r = addWalkon(d.id); after(r === 'full' ? 'The roster is full.' : r === 'live' ? LIVE_ROSTER_MSG : ''); },
  rsplan(d) { const p = P(d.id); p.rsPlan = !p.rsPlan; openModal(playerModal(d.id)); after(p.rsPlan ? `${p.n} will only play if he starts, to protect his redshirt.` : ''); },
  scholar(d) { awardScholarship(d.id); openModal(playerModal(d.id)); after(); },
  negopen(d) { const c = (state.cands[d.role] || []).find(x => x.id === d.id); if (!c) return; ui.neg = { role: d.role, cid: d.id, ext: false, sal: c.salary, yrs: c.years, buy: d.role === 'HC' ? 0.75 : 0.5, incConf: false, incCFP: false }; ui.negMsg = ''; openModal(negView()); },
  negext(d) { const c = state.staff[d.role]; if (!c) return; if (!canExtend(c)) return after(`${c.name} already signed an extension this season.`); ui.neg = { role: d.role, ext: true, sal: r1(c.salary * 1.12), yrs: 3, buy: c.buyPct != null ? c.buyPct : (d.role === 'HC' ? 0.75 : 0.5), incConf: !!(c.inc && c.inc.conf), incCFP: !!(c.inc && c.inc.cfp) }; ui.negMsg = ''; openModal(negView()); },
  negadj(d) { const n = ui.neg; const k = +d.d; if (d.f === 'sal') n.sal = r1(Math.max(0.1, n.sal + k * (n.sal >= 3 ? 0.25 : 0.1))); if (d.f === 'yrs') n.yrs = clamp(n.yrs + k, 1, 8); if (d.f === 'buy') n.buy = clamp(Math.round((n.buy + k * 0.25) * 100) / 100, 0.25, 1); openModal(negView()); },
  negsubmit() {
    const n = ui.neg; const o = { sal: n.sal, yrs: n.yrs, buy: n.buy, incConf: n.incConf, incCFP: n.incCFP };
    const r = n.ext ? negotiateExt(n.role, o) : hireCoach(n.role, n.cid, false, o);
    if (r === 'counter') { ui.negMsg = 'He said no, but he is still listening. Improve the offer.'; openModal(negView()); return; }
    if (r === 'pool') { ui.negMsg = hireMsg(r, n.role) + ' Lower the salary and try again.'; openModal(negView()); return; }
    ui.neg = null; hideModal(); after(r === 'hired' || r === 'signed' ? 'Deal done.' : r === 'done' ? 'He already signed an extension this season.' : r === 'declined' ? 'Talks are over.' : hireMsg(r, n.role));
  },
  rcontact(d) { extraContact(d.id); after('Extra contact made. NCAA risk went up.'); },
  deal(d) { signDeal(d.id, d.k); after('Deal signed.'); },
  comp(d) { if (adjustLever('compliance', +d.d)) after(); },
  recap(d) { const h = state.history.find(x => x.season === +d.s); if (h) openModal(recapView(h.recap, h.season, h)); },
  bstance(d) { ui.board.stance = d.v; render(); }, btix(d) { ui.board.tix = d.v; render(); }, bvote(d) { ui.board.vote = d.v; render(); }, bmedia(d) { ui.board.media = d.v; render(); refocus({ act: 'bmedia', v: d.v }); },
  presentboard() { presentBoard(ui.board); ui.board = { stance: 'balanced', fac: 'none', tix: 'hold', vote: 'yes' }; after(); },
  lcall(d) { if (!liveBusy() || !live.sim.pending) return; runPlay(live.sim, d.v); autoAdvance(live.sim); liveEvents(); if (!live.sim.pending) liveTick(); else renderLive(); },
  ldcall(d) { if (!liveBusy() || !live.sim.pending || live.sim.pending.type !== 'ddrive') return; runDefPlay(live.sim, d.v); autoAdvance(live.sim); liveEvents(); if (!live.sim.pending) liveTick(); else renderLive(); },
  lkick(d) { if (!liveBusy() || !live.sim.pending) return; kickFromDrive(live.sim, d.v); liveEvents(); liveTick(); },
  slotload(d) {
    return slotOp(async () => {
      const i = +d.i; if (i === slot && !saveBlocked) return;
      if (!(await saveNow())) return notify(SAVE_FAIL_MSG);
      const res = await loadSlot(i);
      if (res.ok) { resetUi(); ui.tab = 'office'; after(`Loaded slot ${i}.`); }
      else { ui.confirm = null; ui.flash = `Slot ${i} could not be loaded: ${res.err} Your current career is still open and slot ${i} was left untouched.`; render(); }
    });
  },
  restoregood(d) { const i = +d.i; const g = goodCopy(NS_PREFIX[NS]); ui.confirm = null; if (!g || g.i !== i) return render(); if (!lsSet(SLOT_KEY(i), g.raw)) { ui.flash = 'There is not enough room in browser storage to restore it. Delete another slot first.'; return render(); } ui.badSlots = (ui.badSlots || []).filter(x => x !== i); return repairSlotMeta().then(() => actions.slotload({ i: String(i) })); },
  slotnew(d) { ui.newSlot = +d.i; ui.confirm = null; render(); const el = document.querySelector('.newcareer'); if (el) el.scrollIntoView({ behavior: 'smooth' }); },
  cancelnew() { ui.newSlot = null; ui.seedErr = ''; render(); },
  ncmode(d) { readNcForm(); ui.nc.mode = d.v; render(); },
  startcareer() {
    readNcForm(); const f = ui.nc; const target = ui.newSlot; if (!target) return;
    const seed = String(f.seed || '').trim();
    if (seed && !/^\d{1,10}$/.test(seed)) { ui.seedErr = 'A seed is a whole number, like 2026. Leave it blank for a random career.'; render(); const el = $('#nc-seed'); if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); } announce(ui.seedErr); return; }
    ui.seedErr = '';
    // markup typed into a name is dropped rather than shown as literal text (CL-20)
    const clean = v => String(v || '').replace(/<\/?[a-z][^>]*>/gi, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    const cfg = f.mode === 'custom' ? { name: clean(f.name).slice(0, 28) || 'State Tech', ab: clean(f.ab || f.name).slice(0, 5), conf: f.conf, tier: f.tier, stadium: clean(f.stadium).slice(0, 40) || 'Memorial Stadium', cap: +f.cap || 40000, c1: f.c1, c2: f.c2, replace: f.rep } : null;
    return slotOp(async () => {
      if (!(await saveNow())) return notify(SAVE_FAIL_MSG);
      newGame(ui.newDiff || 'normal', cfg, seed || null, f.mode === 'custom' ? null : f.mode === 'nfl' ? 'MICH' : f.tid); if (f.mode === 'nfl') { goPro(NFL_BY[f.nfl] ? f.nfl : 'DET', { role: 'gm' }); state.tline = []; } setActiveSlot(target); shareChallengeStarted(seed); ui.nc.seed = '';
      resetUi(); ui.tab = isPro() ? 'off' : 'office'; applyTheme(); after(`New career started in slot ${slot}.${seed ? ' Seed ' + state.seed + '.' : ''}`); window.scrollTo(0, 0); // CL-21
    });
  },
  slotreset(d) {
    return slotOp(async () => {
      const i = +d.i; let diffK = 'normal', cfg = null, tidK = 'MICH';
      if (i !== slot && !(await saveNow())) return notify(SAVE_FAIL_MSG);
      if (i === slot) { diffK = state.settings.diff; cfg = state.me ? state.me.cfg : null; tidK = ME; }
      else { try { const st = JSON.parse(await gunz(lsGet(SLOT_KEY(i)))); diffK = st.settings.diff; cfg = st.me ? st.me.cfg : null; tidK = st.my || 'MICH'; } catch (e) { } }
      if (i !== slot) {
        const keep = { st: state, pm: PMAP, rng: RNG.s, me: ME };
        newGame(diffK, cfg, null, tidK); state.rng = RNG.s; const json = JSON.stringify(state); const sum = slotSummary();
        state = keep.st; PMAP = keep.pm; RNG.s = keep.rng; ME = keep.me; rebuildConfs();
        saveQ.retire(i);
        if (!lsSet(SLOT_KEY(i), await gz(json))) return notify(`Slot ${i} could not be written (browser storage is full or blocked).`);
        const m = slotsMeta(); m[i] = sum; lsSet(META_KEY, JSON.stringify(m)); ui.confirm = null; applyTheme();
        return after(`Slot ${i} reset to Week 1. You are still playing slot ${slot}.`);
      }
      newGame(diffK, cfg, null, tidK); setActiveSlot(i); resetUi(); ui.tab = 'office'; applyTheme(); after(`Slot ${i} reset to Week 1.`);
    });
  },
  slotdel(d) {
    return slotOp(async () => {
      const i = +d.i; const unsaved = saveBlocked; const wasActive = i === slot && !unsaved; save(); await deleteSlot(i); ui.confirm = null; let note = '';
      if (unsaved) { setActiveSlot(i); note = ` Your current career now saves to slot ${i}.`; }
      else if (wasActive) {
        saveBlocked = true; // nothing may be written to the deleted slot while the next career loads
        let res = { ok: false };
        for (let j = 1; j <= 5 && !res.ok; j++) if (j !== i && lsGet(SLOT_KEY(j))) { res = await loadSlot(j); if (res.ok) note = ` Now playing slot ${j}.`; }
        if (!res.ok) { newGame('normal'); setActiveSlot(firstFreeSlot() || i); note = ` A new career started in slot ${slot}.`; }
        resetUi(); ui.tab = 'file';
      }
      applyTheme(); after(`Slot ${i} deleted.${note}`);
    });
  },
  admach() { checkAch('season'); checkAch('final'); checkAch('draft'); after('Achievements rechecked.'); },
  admclean() { state.ban = null; state.schRed = null; state.meters.risk = 0; after('NCAA penalties cleared.'); },
  tab(d) { if (!$('#modal').hidden) closeModal(); if (d.tab === 'settings' && !prefs.seen) { prefs.seen = 1; savePrefs(); } if (d.tab !== ui.tab) ui.importMsg = ''; const back = tabScrollLeave(ui, d.tab); ui.tab = d.tab; ui.confirm = null; render(); window.scrollTo(0, back); },
  team(d) { if (liveBusy() && live.open) return; openModal(teamModal(d.id)); },
  player(d) { if (liveBusy() && live.open) return; openModal(playerModal(d.id)); },
  box(d) { if (liveBusy() && live.open) return; const g = state.games.find(x => x.id === d.id); if (g) openModal(boxScore(g), boxTitle(g)); },
  event(d) { const ev = state.event; const msg = resolveEvent(+d.i); after(ev && msg ? `${ev.title}: ${msg}` : ''); },
  planoff(d) { state.plan.off = d.v; after(); }, plandef(d) { state.plan.def = d.v; after(); },
  rpos(d) { ui.rpos = d.pos; render(); }, rsort(d) { ui.rsort = d.k; render(); }, dpos(d) { ui.dpos = d.pos; render(); },
  dmove(d) { const a = state.depth[ui.dpos]; const i = +d.i, j = i + (+d.d); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; if (depthLocked(ui.dpos).length) depthLockSet(ui.dpos, true); /* moving players by hand updates the lock */ after(); },
  dtop(d) { const a = state.depth[ui.dpos]; const [x] = a.splice(+d.i, 1); a.unshift(x); if (depthLocked(ui.dpos).length) depthLockSet(ui.dpos, true); /* moving players by hand updates the lock */ after(); },
  dlock() { const on = !depthLocked(ui.dpos).length; if (depthLockSet(ui.dpos, on)) after(on ? `${ui.dpos} starters locked: automatic sorting keeps them on top. Hurt starters sit until they're healthy.` : `${ui.dpos} starters unlocked.`); },
  dauto() { autoDepth(ui.dpos); after(`${ui.dpos} depth sorted by rating.`); }, dautoall() { POS_ORDER.forEach(autoDepth); after('Every position sorted by rating.'); },
  mkstarter(d) { const p = P(d.id); const a = state.depth[p.pos]; a.splice(a.indexOf(p.id), 1); a.unshift(p.id); if (depthLocked(p.pos).length) depthLockSet(p.pos, true); hideModal(); after(`${p.n} is now first on the ${p.pos} depth chart.`); },
  switchpos(d) { switchPos(d.id, d.pos); openModal(playerModal(d.id)); after(); },
  askrel(d) { ui.confirm = 'rel-' + d.id; openModal(playerModal(d.id)); },
  release(d) { const p = P(d.id); if (!p) return; const no = canRelease(d.id); if (no) return notify(no); releasePlayer(d.id); ui.confirm = null; hideModal(); after(`${p.n} was released. Roster: ${state.roster.length}.`); },
  askfire(d) { ui.confirm = 'fire-' + d.role; render(); }, ask(d) { ui.confirm = d.k; render(); }, unconfirm() { ui.confirm = null; render(); },
  fire(d) { const c = state.staff[d.role]; const b = c ? buyout(c) : 0; fireCoach(d.role); ui.confirm = null; after(c ? `${c.name} fired as ${ROLE_TITLE[d.role]}. Buyout: ${fm(b)}.` : ''); },
  hire(d) { const r = hireCoach(d.role, d.id, false); after(hireMsg(r, d.role)); },
  pollv(d) { ui.poll = d.v; ui.pollIdx = -1; render(); }, sconf(d) { ui.sconf = d.c; render(); }, sfilter(d) { ui.sfilter = d.v; render(); }, bookv(d) { ui.book = d.v; render(); },
  tix(d) { if (adjustLever('ticket', +d.d)) after(); },
  rev(d) { if (adjustLever('revPct', +d.d)) after(); },
  rbud(d) { if (adjustLever('recruit', +d.d)) after(); },
  drive() { if (state.fin.drive) return; const amt = r1(3 + state.meters.boost / 100 * 4); state.fin.collective = (state.fin.collective || 0) + amt; state.fin.drive = true; mv('boost', -6); addNews(`The NIL collective drive raises ${fm(amt)} for the player pay pool.`); after(`The collective drive raised ${fm(amt)} for the player pay pool.`); },
  build(d) { const f = state.facilities.find(x => x.id === d.id); const c = facCost(f.lvl); if (state.fin.balance < c || f.building || f.lvl >= 5) return; state.fin.balance -= c; f.building = true; mv('boost', 3); addNews(`Construction starts on ${facName(f.id)} (${fm(c)}).`); after(); },
  pay(d) { const p = P(d.id); if (!p) return; const nv = r2(Math.max(0, p.pay + 0.05 * d.d)); if (nv === p.pay) return; p.pay = nv; after(); },
  paymkt(d) { const p = P(d.id); p.pay = marketValue(p); if (!$('#modal').hidden) openModal(playerModal(d.id)); after(`${p.n} now makes ${fm2(p.pay)}.`); },
  paystarters() { POS_ORDER.forEach(pos => starters(pos).forEach(p => { if (p.pay < marketValue(p)) p.pay = marketValue(p); })); after('Every starter is paid at least market value.'); },
  paysort(d) { ui.paySort = d.v; render(); },
  ncbook(d) { const r = bookNc(+d.s, d.id); after({ ok: 'Booked.', full: 'Weeks 1–3 are full that year.', full2: 'No open week for the return game the following year.', dup: 'You already play them that year.' }[r] || ''); },
  ncdrop(d) { cancelNc(+d.s, +d.wk); ui.confirm = null; after('Game canceled.'); },
  recf(d) { ui.recF = d.v; render(); },
  rsl(d) { const r = state.rec && state.rec.list.find(x => x.id === d.id); if (!r) return; r.sl = !r.sl; after(); },
  rbulk(d) { if (isCoach() && d.v === 'sl') return; const n = recBulk(d.v); if (n == null) return; after(d.v === 'sl' ? (n ? `Offered ${n} shortlisted prospect${n === 1 ? '' : 's'}.` : 'No offers left to make (30 at once).') : `Pulled ${n} offer${n === 1 ? '' : 's'}.`); },
  roffer(d) { const r = toggleOffer(d.id); after(r === 'max' ? 'You can have 30 offers out at once.' : ''); },
  rvisit(d) { setVisit(d.id, null); after(); },
  rnil(d) { const r = state.rec.list.find(x => x.id === d.id); r.nil = r.nil ? 0 : r.ask; after(); },
  signday() { const B = autoOn('rec') ? [] : signBattles(); if (B.length) return openModal(signHTML(B), 'Signing Day'); signingDay(); after(); },
  rundraft() { if (state.phase !== 'offseason' || state.off.step !== 6) return; runADDraft(); ui.drd = 1; after(); window.scrollTo(0, 0); if (state.off && state.off.nfl) actions.dnwatch(); },
  drd(d) { ui.drd = +d.v; render(); refocus(d); },
  offnext() { const ok = offStepNext(); if (state.pendingArrive) return runCatchUp(); if (state.phase !== 'offseason') ui.tab = 'office'; if (isPro() && !PRO_TABS.some(t => t[0] === ui.tab)) ui.tab = 'off'; after(ok ? '' : !state.staff.HC ? 'Hire a head coach first. The candidates are on the Staff tab.' : 'Finish this step first.'); window.scrollTo(0, 0); },
  poach(d) { resolvePoach(+d.i, d.m === '1'); after(); },
  retain(d) { const x = state.off.departures.find(y => y.id === d.id); x.tried = true; const ok = R() < (x.why === 'Graduating' ? 0.45 : 0.5) + (state.meters.morale - 60) / 200 + (rapOf(P(x.id)) - 60) / 250; if (ok) { x.kept = true; const p = P(x.id); if (x.why === 'Graduating') p.cls = 'Sr'; } after(ok ? 'He is staying.' : 'He is leaving anyway.'); },
  retainpay(d) { const x = state.off.departures.find(y => y.id === d.id); const p = P(x.id); x.tried = true; p.pay = r2(marketValue(p) * 1.05); if (R() < 0.85) { x.kept = true; after(`${p.n} stays for ${fm2(p.pay)}.`); } else after(`${p.n} is leaving anyway.`); },
  portal(d) { const r = signPortal(d.id); after({ signed: 'Signed.', declined: 'He chose another school.', money: 'Not enough room in the pay pool.', full: 'Roster is full.' }[r] || ''); },
  lhoff(d) { live.halfOff = d.v; renderLive(); }, lhdef(d) { live.halfDef = d.v; renderLive(); },
  rehab(d) { if (!setRehab(d.id, d.v)) return; after(`${P(d.id).n}: ${REHAB[d.v][0].toLowerCase()}.`); },
  schire(d) { if (!hireScout(d.id)) return after('You can have three scouts at most.'); after('Scout hired.'); },
  scfire(d) { if (fireScout(d.id)) after('Scout let go.'); },
  bond(d) { if (!issueBond(+d.v)) return after('The board won\'t approve more debt right now.'); after(`Bonds issued: $${d.v}M.`); },
  booster(d) { const m = answerBooster(d.v === '1'); if (m) after(m); },
  trip(d) { const cb = $('#trippromo'); const m = setTrip(d.v, cb && cb.checked); if (m) after(m); },
  hlwatch(d) { hlGame(d.id); },
  hlagain() { if (pf.hlStart) { pfClear(); pf.hlStart(); const slot = $('#modal .pfslot'); if (slot && pf.el && pf.el.parentNode !== slot) slot.appendChild(pf.el); } },
  lhspeech(d) { live.halfSpeech = d.v === 'none' ? null : d.v; renderLive(); },
  lchal() { if (!liveBusy()) return; const r = challengePlay(live.sim); if (!r) return; live.flash = r.ok ? 'OVERTURNED' : 'CALL STANDS'; live.prevPts = live.sim.pts.slice(); announce(r.ok ? 'Overturned on review.' : 'The call stands.'); renderLive(); },
  useplan(d) { if (OFF_PLANS[d.off]) state.plan.off = d.off; if (DEF_PLANS[d.def]) state.plan.def = d.def; after('Game plan set to the staff\'s recommendation.'); },
  lhgo() { if (!liveBusy() || !live.sim.pending) return; const cb = $('#benchqb'); const ch = { off: live.halfOff, def: live.halfDef, benchQB: cb && cb.checked, speech: live.halfSpeech }; simResolve(live.sim, ch); renderLive(); liveTick(); },
  ldec(d) { if (!liveBusy() || !live.sim.pending) return; simResolve(live.sim, d.v); renderLive(); liveTick(); },
  lspeed(d) { live.speed = +d.v; renderLive(); liveTick(); },
  lpause() { if (!liveBusy()) return; live.paused = !live.paused; renderLive(); if (!live.paused) liveTick(); },
  lskip() { if (liveBusy()) liveSkip(); },
  livebox() { const g = live.mg; live.sim = null; openModal(boxScore(g), boxTitle(g)); },
  overhide() { ui.overHide = true; ui.tab = 'file'; render(); const h = $('#view .flash button'); if (h) h.focus(); },
  overshow() { ui.overHide = false; render(); },
  export: async () => { ui.exportCode = await makeCode(); render(); },
  copycode: async () => { let msg; try { await navigator.clipboard.writeText(ui.exportCode); msg = 'Copied.'; } catch (e) { $('#exportbox').select(); msg = 'Selected. Press Ctrl+C or Cmd+C to copy.'; } const h = $('#copyhint'); if (h) h.textContent = (ui.exportCode.length / 1024).toFixed(0) + ' KB of text. ' + msg; },
  // loading a code replaces this slot's career, so it asks first, like deleting a slot (CL-26)
  askimport() {
    const box = $('#importbox'); const v = box ? box.value.trim() : '';
    if (!v) { ui.importMsg = 'Paste a save code first.'; return render(); }
    ui.importCode = v; ui.importMsg = ''; ui.confirm = 'import'; render(); const b = $('[data-act=import]'); if (b) b.focus();
  },
  import() {
    const v = ui.importCode || ''; ui.importCode = ''; ui.confirm = null;
    return slotOp(async () => {
      let cand;
      try { cand = await readCode(v); } catch (e) { ui.importMsg = `${e.message} Paste the whole code, starting with MFAD. Your current game was not changed.`; return render(); }
      try { adoptState(cand); } catch (e) { console.error(e); ui.importMsg = `That save could not be loaded: ${e.message} Your current game was not changed.`; return render(); }
      resetUi(); applyTheme(); ui.importMsg = 'Save loaded.'; ui.tab = 'office'; after('Save loaded into slot ' + slot + '.');
    });
  },
  newdiff(d) { readNcForm(); ui.newDiff = d.v; render(); }, asknew() { ui.newSlot = slot; render(); },
  newgame() { const cfg = state.me ? state.me.cfg : null; newGame(ui.newDiff || state.settings.diff || 'normal', cfg, null, ME); resetUi(); ui.tab = 'office'; applyTheme(); after('New career started.'); },
  close() { closeModal(); },
  // admin
  admtab(d) { ui.admTab = d.v; ui.confirm = null; render(); }, admpos(d) { ui.admPos = d.v; ui.admP = null; render(); }, admc(d) { ui.admC = d.v; render(); },
  admadd() { const pos = ui.admPos; const b = genBody(pos); const p = makePlayer({ num: freeNumber(pos), n: genName(), pos, cls: 'Fr', ht: b.ht, wt: b.wt, home: pick(TOWNS)[0], ovr: 70, pot: 85, real: false }); state.roster.push(p); rebuildPMap(); state.depth[pos].push(p.id); ui.admP = p.id; after(`Added ${p.n}. Edit him below.`); },
  admdel(d) { const p = P(d.id); if (!p) return; const no = canRelease(d.id); if (no) return notify(no); releasePlayer(d.id); ui.confirm = null; ui.admP = null; after(`${p.n} removed.`); },
  admheal() { state.roster.forEach(p => { p.inj = 0; p.susp = 0; }); after('Everyone is healthy and eligible.'); },
  admboost(d) { state.roster.forEach(p => { p.ovr = clamp(p.ovr + (+d.d), 1, 99); if (p.pot < p.ovr) p.pot = p.ovr; Object.keys(p.tr || {}).forEach(k => p.tr[k] = clamp(p.tr[k] + (+d.d), 1, 99)); }); after(`Everyone ${+d.d > 0 ? '+' : ''}${d.d} OVR.`); },
  admpayall() { state.roster.forEach(p => p.pay = marketValue(p)); after('Everyone is paid market value.'); },
  admfill() { const r = ui.admC; const c = genCandidates(r, 1)[0]; if (r === 'HC') { c.off = c.def = c.rec = c.dev = c.gm = 85; } else { c.ovr = 85; } state.staff[r] = c; after(`${c.name} hired.`); },
  admvacate() { const c = state.staff[ui.admC]; if (c && c.me && isCoach()) return after('That is you. Change jobs from the job market.'); state.staff[ui.admC] = null; after('Job vacated.'); },
  admcands() { STAFF_ROLES.forEach(r => state.cands[r] = genCandidates(r, r === 'HC' ? 7 : 4)); after('New candidates generated.'); },
  admcash(d) { state.fin.balance += +d.d; after(); },
  admmax() { Object.assign(state.meters, { fan: 100, boost: 100, board: 100, morale: 100, hot: 0 }); after(); },
  admrepoll() { state.polls.pop(); computePoll(state.polls.length ? 'Week ' + state.week : 'Preseason', false); after('Poll recalculated.'); },
  admrecall() { state.rec.list.forEach(r => { if (r.offered && r.status === 'open') r.status = 'mc'; }); after('Every offered prospect has committed.'); },
  admvisits() { state.rec.visits += 10; after('Added 10 official visits.'); }, admnewclass() { genRecruitClass(); after('New recruiting class generated.'); },
  admevent() { state.event = null; const opts = Object.entries(EVENT_DEFS).filter(([k, e]) => e.cond()); const [key, def] = pick(opts); const ev = def.make(); ev.key = key; ev.wk = state.week; state.event = ev; ui.tab = 'office'; after(); },
  admclearevent() { state.event = null; after('Decision dismissed.'); },
  admhist() { state.rivals = JSON.parse(JSON.stringify(RIVAL_DATA)); after('Rivalry records reset.'); },
  admunfire() { state.gameOver = null; state.meters.board = Math.max(state.meters.board, 40); after('You have your job back.'); },
};
// Actions that would change the week, the roster or the active career can't run while a live
// game is waiting to be finished, or while a multi-season sim is running.
const LIVE_LOCKED = new Set(['rehab', 'primary', 'live', 'simreg', 'simdec', 'simloss', 'simpost', 'autoad', 'simyears', 'slotload', 'startcareer', 'slotreset', 'slotdel', 'import', 'askimport', 'newgame', 'release', 'admdel', 'switchpos', 'admevent',
  // NFL roster moves wait until the live game is final (B06)
  'pcut', 'trgo', 'toacc', 'ximport', 'ximportask', 'xwv', 'xpsq', 'xpsqup', 'xpsqcut', 'admadd', 'walkon', 'fasub', 'rsyes', 'rssub', 'rsno', 'rstag', 'pautocut', 'pcapfix', 'jobtake', 'cin', 'pnext', 'offnext', 'fawave', 'dpick', 'drun', 'dauto1', 'dall', 'ddown', 'dup', 'prohcfire', 'prohchire', 'catchretry', 'prs', 'pxsub', 'setsch', 'live2', 'popt']);
const LIVE_LOCK_MSG = 'Finish the live game first. Resume it from the top of the page, then play it out or choose "Simulate the rest of the game".';
function keepFocus(sel, el) {
  queueMicrotask(() => {
    // A field that is still on the page was not redrawn, so the browser is moving the cursor itself (to the next field
    // on Tab, or to whatever was clicked). Putting it back here sent the next thing typed into the field just left.
    if (el && el.isConnected) return;
    const cur = document.activeElement; if ((cur && cur !== document.body) || !sel) return;
    const t = document.querySelector(sel); if (t && !t.disabled && t.getClientRects().length && !t.closest('[inert]')) t.focus({ preventScroll: true });
  });
}
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el) keepFocus(selectorFor(el)); }, true);
document.addEventListener('change', e => keepFocus(selectorFor(e.target), e.target), true);
document.addEventListener('scroll', e => { if (e.target && e.target.id === 'tabs') tabFade(false); }, true);
window.addEventListener('resize', () => tabFade(false));
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.tagName === 'SELECT') return;
  const act = el.dataset.act; const fn = actions[act];
  if (el.closest('.simmenu')) { const dm = el.closest('details'); if (dm) dm.open = false; }
  if (!fn) return; e.preventDefault();
  if (el.disabled) return;
  if (ui.simming && act !== 'simcancel' && act !== 'close') return;
  if (appMode === 'career' && cui.simming && act !== 'csimstop') return;
  if (ui.slotBusy) return;
  if (appMode === 'ad' && liveBusy() && LIVE_LOCKED.has(act)) return notify(LIVE_LOCK_MSG);
  if (appMode === 'career' && gameLocked() && CLOCKED.has(act)) return notify('Finish the game first. Resume it from the top of the page.');
  // a notice is about the last action; the next action outside a dialog clears it (CL-11)
  if (!el.closest('#modal')) document.querySelectorAll('#view > .flash:not(.bad)').forEach(x => x.remove());
  const usnap = typeof undoSnap === 'function' ? undoSnap(act) : null; const ures = fn(el.dataset); if (typeof undoAfter === 'function' && appMode === 'ad') { if (ures && typeof ures.then === 'function') ures.then(() => undoAfter(act, usnap)); else { undoAfter(act, usnap); if (usnap) render(); } }
});
document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.sbx) { const b = document.querySelector(`[data-sbxv="${t.dataset.sbx}"]`); if (b) b.textContent = '×' + (+t.value).toFixed(1); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (appMode !== 'ad') return;
  if (ui.simming || ui.slotBusy) return;
  if (t.dataset.adm && t.dataset.k === 'pos' && liveBusy()) return notify(LIVE_LOCK_MSG);
  if (t.dataset && t.dataset.plan) { const m = ui.planMove || { sal: 0, yrs: 1 }; if (t.dataset.plan === 'sal') m.sal = clamp(+t.value || 0, 0, 80); else m.yrs = clamp(+t.value || 1, 1, 3); ui.planMove = m.sal > 0 ? m : null; render(); refocus({ plan: t.dataset.plan }); return; }
  if (t.dataset && t.dataset.sbx) { if (setSbx(t.dataset.sbx, t.value)) { save(); render(); refocus({ sbx: t.dataset.sbx }); announce('Dial saved.'); } return; }
  if (t.id === 'pollsel') { ui.pollIdx = +t.value; render(); return; }
  if (t.id === 'swk') { ui.swk = +t.value; render(); return; }
  if (t.id === 'dpos') { ui.dpos = t.value; render(); return; }
  if (t.id === 'admpsel') { ui.admP = t.value; render(); return; }
  if (t.id === 'admtsel') { ui.admT = t.value; render(); return; }
  if (t.id === 'admrsel') { ui.admR = t.value; render(); return; }
  if (t.dataset.act === 'rvisitsel' && t.value) { const r = setVisit(t.dataset.id, t.value); after(r === 'full' ? 'That game already has four visitors.' : 'Official visit set.'); return; }
  if (t.dataset.adm) { admSet(t.dataset.adm, t.dataset.k, t); return; }
  if (t.dataset.act === 'capsel') { const i = +t.dataset.i; const caps = (state.captains || []).slice(); caps[i] = t.value || null; state.captains = [...new Set(caps.filter(Boolean))].slice(0, 4); after(); return; }
  if (t.id === 'bfac') { ui.board.fac = t.value; render(); return; }
  if (t.id === 'bmove') { ui.board.move = t.value; render(); const el = document.getElementById('bmove'); if (el) el.focus({ preventScroll: true }); return; }
  if (t.id === 'neg-conf' || t.id === 'neg-cfp') { ui.neg[t.id === 'neg-conf' ? 'incConf' : 'incCFP'] = t.checked; openModal(negView()); return; }
  if (t.id === 'benchqb') { live.benchQB = t.checked; return; }
  if (t.id === 'lfield') { setPref('field', t.checked ? 'on' : 'off'); if (!t.checked) pfClear(); else if (live.sim) { pf.sim = null; } renderLive(); return; }
  if (t.id === 'callplays') { live.callPlays = t.checked; if (live.sim) { live.sim.callPlays = t.checked; if (!t.checked && live.sim.pending && live.sim.pending.type === 'drive') { autoFinishDrive(live.sim); liveEvents(); liveTick(); } } return; }
  if (t.id === 'livesnd') { state.settings.sound = t.checked; save(); if (t.checked) sfx('whistle'); return; }
  if (t.id === 'nc-tid' || t.id === 'nc-conf') { readNcForm(); render(); const el = document.getElementById(t.id); if (el) el.focus(); return; }
  if (t.id && t.id.startsWith('nc-')) { readNcForm(); return; }
});
function readNcForm() { const g = id => { const e = document.getElementById(id); return e ? e.value : null; }; const f = ui.nc; [['nc-seed', 'seed'], ['nc-tid', 'tid'], ['nc-nfl', 'nfl'], ['nc-rep', 'rep'], ['nc-name', 'name'], ['nc-ab', 'ab'], ['nc-conf', 'conf'], ['nc-tier', 'tier'], ['nc-stadium', 'stadium'], ['nc-cap', 'cap'], ['nc-c1', 'c1'], ['nc-c2', 'c2']].forEach(([id, k]) => { const v = g(id); if (v != null) f[k] = v; }); }
async function simYears(n) {
  if (state.gameOver || ui.simming || liveBusy()) return;
  const run = ui.simming = { cancel: false };
  const chg0 = changeSnap(); const target = state.season + n; const startH = state.history.length; const coach = isCoach(); const startC = coach ? state.co.hist.length : 0; const startJ = jobsLog().length; const modeL = coach ? 'Auto-coach' : isPro() ? 'Auto-GM' : 'Auto-AD'; const startSeason = state.season;
  openModal(`<div class="eyebrow">${modeL}</div><h2 class="h2" id="simprog">Simulating…</h2><div class="bar" role="progressbar" id="simpb" aria-labelledby="simprog" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="good" id="simbar" style="width:2%"></i></div><p class="small muted" id="simwhere" aria-live="polite"></p><p class="hint">${coach ? 'Every call is made for you: game plans, play calls, recruiting, events and the job market. Your staff and the AD handle the rest.' : 'Every call is made for you: game plans, events, press conferences, recruiting, hiring, the board meeting and the offseason.'}</p><div class="row gap mt"><button class="btn ghost" id="simcancel" data-act="simcancel">Stop after this week</button></div>`, `Simulating ${n} season${n === 1 ? '' : 's'}`);
  const progress = () => {
    const within = state.phase === 'offseason' ? 0.95 : Math.min(0.9, (state.week - 1) / 18);
    const pct = Math.max(2, Math.min(100, Math.round((state.season - startSeason + within) / n * 100)));
    const b = $('#simbar'); if (b) b.style.width = pct + '%'; const pb = $('#simpb'); if (pb) pb.setAttribute('aria-valuenow', pct);
    const h = $('#simprog'); if (h) h.textContent = `Simulating… ${Math.min(n, state.season - startSeason)} of ${n} season${n === 1 ? '' : 's'} done`;
    const w = $('#simwhere'); if (w) w.textContent = `${state.season} · ${state.phase === 'offseason' ? 'Offseason' : weekLabel(state.week)}`;
  };
  const recruited = new Set(); let guard = 0, last = performance.now(), err = null, savedSeason = state.season;
  try {
    await flushSave();
    while (!state.gameOver && !(typeof isOwner === 'function' && isOwner() && (OWN().out || OWN().done)) && state.season < target && !run.cancel && guard++ < 40 * n + 40) {
      if (state.pendingArrive) goCollegeNow();
      if (isPro() && overCap()) capFix(ME);
      if (state.phase === 'offseason') autoOffseason();
      else { if (!isPro() && !recruited.has(state.season)) { autoSeasonRecruiting(); recruited.add(state.season); } advance(); }
      if (state.season !== savedSeason) { savedSeason = state.season; save(); }
      // Hand the page back to the browser every few weeks so it stays responsive.
      if (performance.now() - last > 35) { progress(); await new Promise(r => setTimeout(r, 0)); last = performance.now(); }
    }
  } catch (e) { console.error(e); err = e; }
  finally { ui.simming = null; }
  save(); ui.tab = 'office'; render();
  if (isComm()) { openModal(commSimSummary(startSeason), 'Commissioner sim'); return; }
  const hs = state.history.slice(startH);
  const stopped = run.cancel && !state.gameOver && state.season < target;
  if (!coach && (isPro() || jobsLog().slice(startJ).some(j => j.lvl === 'nfl'))) {
    const js = jobsLog().slice(startJ);
    openModal(`<div class="eyebrow">Auto-sim summary</div><h2 class="h2">${js.length} season${js.length === 1 ? '' : 's'} simulated${state.gameOver ? ' · you were let go' : ''}${stopped ? ' · stopped early' : ''}</h2>${err ? '<p class="flash bad">The sim hit an error and stopped. Everything up to that point is saved.</p>' : ''}
     ${js.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Team</th><th>Job</th><th>Record</th><th>Postseason</th></tr></thead><tbody>${js.map(j => `<tr><td>${j.s}</td><td>${esc(jobName(j))}</td><td>${j.role}</td><td>${j.w}-${j.l}</td><td>${j.po != null ? esc(PO_LABEL[j.po]) : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
     ${changesHTML(chg0)}<p>Reputation: <b>${execState().rep}</b></p><div class="row gap"><button class="btn primary" data-act="close">Back to the office</button></div>`, 'Auto-sim summary');
    return;
  }
  if (coach) {
    const ch = state.co.hist.slice(startC);
    openModal(`<div class="eyebrow">Auto-coach summary</div><h2 class="h2">${ch.length} season${ch.length === 1 ? '' : 's'} simulated${stopped ? ' · stopped early' : ''}</h2>
     ${stopped ? `<p>Stopped at ${esc(state.phase === 'offseason' ? 'the offseason' : weekLabel(state.week))} of ${state.season}. Everything up to that point is saved.</p>` : ''}${err ? '<p class="flash bad">The sim hit an error and stopped. Everything up to that point is saved.</p>' : ''}
     ${ch.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>School</th><th>Job</th><th>Record</th><th>Final rank</th><th>Postseason</th></tr></thead><tbody>${ch.map(h => `<tr><td>${h.s}</td><td>${esc((h.lvl || 'col') === 'nfl' ? nflName(h.tm) : colTeamName(h.tm))}</td><td>${esc(roleTitle(h.role))}</td><td>${h.w}-${h.l}</td><td>${h.rank ? '#' + h.rank : 'NR'}</td><td>${esc(h.post || '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}
     ${changesHTML(chg0)}<p>Now: <b>${esc(roleTitle(state.co.role))}</b> at ${esc(myName())} · reputation ${Math.round(state.co.rep)} · career earnings ${fmM(state.co.earn)}</p><div class="row gap"><button class="btn primary" data-act="close">Back to the office</button><button class="btn ghost" data-act="tab" data-tab="career">See my career</button></div>`, 'Auto-coach summary');
    return;
  }
  openModal(`<div class="eyebrow">Auto-AD summary</div><h2 class="h2">${hs.length} season${hs.length === 1 ? '' : 's'} simulated${state.gameOver ? ' · you were fired' : ''}${stopped ? ' · stopped early' : ''}</h2>
   ${stopped ? `<p>Stopped at ${esc(state.phase === 'offseason' ? 'the offseason' : weekLabel(state.week))} of ${state.season}. Everything up to that point is saved.</p>` : ''}${err ? '<p class="flash bad">The sim hit an error and stopped. Everything up to that point is saved.</p>' : ''}
   ${hs.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Record</th><th>Final rank</th><th>Postseason</th><th>Class</th><th>Football net</th></tr></thead><tbody>${hs.map(h => `<tr><td>${h.season}</td><td>${h.w}-${h.l}</td><td>${h.rank ? '#' + h.rank : 'NR'}</td><td>${esc(h.bowl || '—')}${h.champ === ME ? ' · <b>Champions</b>' : ''}</td><td>${h.classRank ? '#' + h.classRank : '—'}</td><td class="num">${fm(h.net)}</td></tr>`).join('')}</tbody></table></div>` : ''}
   ${changesHTML(chg0)}<p>Legacy score: <b>${legacyScore()}</b> · Achievements: ${Object.keys(state.ach).length} of ${ACH.length}</p><div class="row gap"><button class="btn primary" data-act="close">Back to the office</button><button class="btn ghost" data-act="tab" data-tab="history">See history</button></div>`, 'Auto-AD summary');
}
document.addEventListener('keydown', e => {
  const ov = $('#over'), m = $('#modal');
  const box = !ov.hidden ? ov.querySelector('.obox') : !m.hidden ? m.querySelector('.mbox') : null;
  if (!box) return;
  if (e.key === 'Escape' && box.closest('#modal')) { e.preventDefault(); closeModal(); return; }
  if (e.key !== 'Tab') return;
  const f = focusables(box); if (!f.length) { e.preventDefault(); return; }
  const first = f[0], lastEl = f[f.length - 1], cur = document.activeElement;
  if (!box.contains(cur)) { e.preventDefault(); (e.shiftKey ? lastEl : first).focus(); }
  else if (e.shiftKey && cur === first) { e.preventDefault(); lastEl.focus(); }
  else if (!e.shiftKey && cur === lastEl) { e.preventDefault(); first.focus(); }
});
// Clicking the dimmed area behaves like Close. It never stops a running multi-season sim.
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !ui.simming) closeModal(); });
// tooltips for charts
const tip = $('#tip');
document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (!el) { tip.hidden = true; return; } let t = el.getAttribute('data-tip'); tip.textContent = t; tip.hidden = false; });
document.addEventListener('mousemove', e => { if (tip.hidden) return; const x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14); tip.style.left = x + 'px'; tip.style.top = (e.clientY + 16) + 'px'; });

applyPrefs(); live.speed = prefs.liveSpeed; live.callPlays = prefs.callPlays;
if (!prefs.seen) ui.firstTip = 'New: pick a theme, light or dark mode, and a sidebar or top tabs in Settings (top right).';

