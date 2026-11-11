/* ===================== PERSISTENCE: save slots, import/export ===================== */
const SAVE_KEY = 'mfad-save-v1';
// AD mode and Coach mode share this storage code but keep separate save slots: NS picks which
// set the functions below read and write ('mfad-…' for AD, 'fecoach-…' for Coach).
let NS = 'ad';
const NS_PREFIX = { ad: 'mfad-', coach: 'fecoach-' };
const SLOT_KEY = i => NS_PREFIX[NS] + 'slot-' + i;
let META_KEY = 'mfad-slots-meta', ACTIVE_KEY = 'mfad-active';
let slot = 1;
// True only when every slot held an unreadable save at startup: the fresh career then waits for
// the player to free a slot instead of overwriting one of them.
let saveBlocked = false;

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
// per-browser view preferences: list filters and sort orders survive a reload (never part of a save)
const FILTER_KEYS = ['rpos', 'rsort', 'recF', 'paySort', 'sfilter', 'dpos', 'fpos', 'dfpos', 'dsort', 'mkF', 'authOpen'], FILTER_LS = 'fe-filters-v1'; let filterSig = '';
function loadFilters() { try { const o = JSON.parse(lsGet(FILTER_LS) || '{}') || {}; FILTER_KEYS.forEach(k => { if (o[k] != null && typeof o[k] !== 'object') ui[k] = o[k]; }); filterSig = JSON.stringify(o); } catch (e) { } }
function rememberFilters() { if (typeof ui === 'undefined') return; const o = {}; FILTER_KEYS.forEach(k => { if (ui[k] != null) o[k] = ui[k]; }); const s = JSON.stringify(o); if (s !== filterSig) { filterSig = s; lsSet(FILTER_LS, s); } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
function slotsMeta() { try { return JSON.parse(lsGet(META_KEY) || '{}') || {}; } catch (e) { return {}; } }
function setActiveSlot(i) { slot = i; saveBlocked = false; lsSet(ACTIVE_KEY, String(i)); }
function firstFreeSlot() { return [1, 2, 3, 4, 5].find(i => !lsGet(SLOT_KEY(i))) || null; }
async function gz(str) { try { if (!window.CompressionStream) return 'RAW:' + str; const cs = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); const buf = new Uint8Array(await new Response(cs).arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return 'GZ:' + btoa(bin); } catch (e) { return 'RAW:' + str; } }
async function gunz(s) { if (s.startsWith('RAW:')) return s.slice(4); if (s.startsWith('GZ:')) { const bin = atob(s.slice(3)); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')); return await new Response(ds).text(); } return s; }
function slotSummary() { if (isPro()) return proSlotSummary(); if (isComm()) return commSlotSummary(); return { comm: undefined, coach: isCoach() ? { name: state.co.name, role: state.co.role } : null, name: teamName(ME), season: state.season, phase: state.phase, rec: T(ME).w + '-' + T(ME).l, legacy: legacyScore(), diff: state.settings.diff, custom: !!state.me, seasons: state.history.length, fired: !!state.gameOver, chal: state.chal ? state.chal.id : undefined, saved: Date.now() }; }

/* ---------- save queues (shared by AD Mode and Player Career) ----------
 * A queue snapshots a game right away and remembers it as the newest pending save for its
 * slot. A short debounce batches rapid clicks. Writes run one at a time through a promise
 * chain, and each carries a sequence number, so an older snapshot can never land on top of
 * a newer one, whether it was written asynchronously (compressed) or synchronously when the
 * page was hidden. flush() writes everything pending and resolves when storage is up to date.
 * If the page is hidden or closed before an async write finishes, flushSync() writes the
 * newest snapshot uncompressed, synchronously. A failed write keeps its snapshot so the next
 * flush tries again, and failed[slot] stays set until a later write for that slot succeeds. */
function makeSaveQueue(cfg) {
  const q = { pending: {}, queued: {}, inflight: {}, timer: null, chain: Promise.resolve(), seq: 0, written: {}, failed: {}, retry: {}, metaBad: {} };
  // the slot list's summary is part of the save: a failed summary write is reported and tried again, never called a success (FE-05)
  const commit = job => { let m; try { m = JSON.parse(lsGet(cfg.metaKey) || '{}') || {}; } catch (e) { m = {}; } m[job.slot] = job.sum; return lsSet(cfg.metaKey, JSON.stringify(m)) || (dropGood() > 0 && lsSet(cfg.metaKey, JSON.stringify(m))); };
  const ok = job => { q.written[job.slot] = job.seq; delete q.failed[job.slot]; delete q.retry[job.slot]; const mOk = commit(job); if (mOk) delete q.metaBad[job.slot]; else q.metaBad[job.slot] = job; cfg.status(job.slot, true, mOk); };
  const metaRetry = () => Object.values(q.metaBad).forEach(j => { if ((q.written[j.slot] || 0) > j.seq) { delete q.metaBad[j.slot]; return; } if (commit(j)) { delete q.metaBad[j.slot]; cfg.status(j.slot, true, true); } });
  // storage ran short: the spare "last good" copies are given up before a real save fails
  const put = (k, v) => lsSet(k, v) || (dropGood() > 0 && lsSet(k, v));
  const bad = job => { q.failed[job.slot] = job.seq; if (!q.retry[job.slot] || q.retry[job.slot].seq < job.seq) q.retry[job.slot] = job; cfg.status(job.slot, false); };
  q.push = (slotI, json, sum) => { q.pending[slotI] = { slot: slotI, seq: ++q.seq, json, sum }; clearTimeout(q.timer); q.timer = setTimeout(q.flush, 150); };
  q.write = async job => {
    if (q.queued[job.slot] === job) delete q.queued[job.slot];
    if ((q.written[job.slot] || 0) > job.seq) return;
    q.inflight[job.slot] = job;
    try {
      const data = await gz(job.json);
      if ((q.written[job.slot] || 0) > job.seq) return; // a newer snapshot already landed
      if (put(cfg.key(job.slot), data)) ok(job); else bad(job);
    } finally { if (q.inflight[job.slot] === job) delete q.inflight[job.slot]; }
  };
  q.flush = () => {
    clearTimeout(q.timer); q.timer = null; metaRetry();
    // a snapshot that failed earlier is written again unless something newer is waiting
    Object.values(q.retry).forEach(j => { if (!q.pending[j.slot] || q.pending[j.slot].seq < j.seq) q.pending[j.slot] = j; });
    const jobs = Object.values(q.pending); q.pending = {};
    // jobs waiting behind another write stay visible to flushSync until they start (B01)
    jobs.forEach(job => { if (!q.queued[job.slot] || q.queued[job.slot].seq < job.seq) q.queued[job.slot] = job; q.chain = q.chain.then(() => q.write(job)).catch(e => console.error('save failed', e)); });
    return q.chain;
  };
  q.flushSync = () => {
    const latest = {};
    [...Object.values(q.inflight), ...Object.values(q.queued), ...Object.values(q.pending), ...Object.values(q.retry)].forEach(j => { if (!latest[j.slot] || j.seq > latest[j.slot].seq) latest[j.slot] = j; });
    Object.values(latest).forEach(j => {
      if ((q.written[j.slot] || 0) >= j.seq) { delete q.pending[j.slot]; return; }
      if (put(cfg.key(j.slot), 'RAW:' + j.json)) { ok(j); delete q.pending[j.slot]; }
      else { q.pending[j.slot] = j; bad(j); } // kept, so the next flush tries again if the page stays open
    });
  };
  // A deleted slot retires everything queued for it, so a late write can't bring it back.
  q.retire = i => { delete q.pending[i]; delete q.queued[i]; delete q.retry[i]; delete q.failed[i]; delete q.metaBad[i]; q.written[i] = ++q.seq; };
  return q;
}
/* ---------- slot summaries that tell the truth, and a last good copy (v9.20) ---------- */
const SAVE_SETS = [['mfad-', 'ad'], ['fecoach-', 'coach'], ['mfpc-', 'pc']]; // AD and commissioner, Coach, Player Career
// a basic summary read from a saved game itself, for a slot whose summary was lost (FE-05)
function metaFromRaw(kind, s) {
  if (!s || typeof s !== 'object') return null;
  if (kind === 'pc') { const p = s.p; if (!p || !p.pos) return null; return { rebuilt: true, name: [p.first, p.last].filter(Boolean).join(' ') || 'Player', pos: p.pos, year: s.year, lvl: s.lvl, phase: s.phase, team: '', stars: p.stars, ovr: p.a && typeof cOvr === 'function' ? cOvr(p) : null, done: s.phase === 'retired', saved: Date.now() }; }
  if (!s.teams) return null; const nfl = s.lvl === 'nfl'; const comm = s.kind === 'comm'; const t = s.teams[s.my] || {};
  return { rebuilt: true, lvl: nfl ? 'nfl' : undefined, comm: comm ? (nfl ? 'nfl' : 'col') : undefined, own: s.kind === 'owner' ? true : undefined, coach: s.kind === 'coach' && s.co ? { name: s.co.name, role: s.co.role } : null, gm: nfl && !comm && s.kind !== 'coach' && s.kind !== 'owner' ? true : undefined,
    name: comm ? 'Commissioner · ' + (nfl ? 'NFL' : 'College football') : (t.name || s.my || 'Career'), season: s.season, phase: s.phase, rec: comm ? '' : (t.w | 0) + '-' + (t.l | 0), diff: s.settings && s.settings.diff, seasons: Array.isArray(s.history) ? s.history.length : 0, fired: !!s.gameOver, chal: s.chal ? s.chal.id : undefined, saved: Date.now() };
}
// every slot with a career in it gets a summary back, read from the save itself
async function repairSlotMeta() {
  let n = 0;
  for (const [pre, kind] of SAVE_SETS) {
    let m; try { m = JSON.parse(lsGet(pre + 'slots-meta') || '{}') || {}; } catch (e) { m = {}; } let ch = false;
    for (let i = 1; i <= 5; i++) { const raw = lsGet(pre + 'slot-' + i); if (!raw || m[i]) continue; try { const sum = metaFromRaw(kind, JSON.parse(await gunz(raw))); if (sum) { m[i] = sum; ch = true; n++; } } catch (e) { /* damaged: the slot list says so */ } }
    if (ch) lsSet(pre + 'slots-meta', JSON.stringify(m));
  }
  return n;
}
// The last save of each kind that loaded cleanly is kept as a spare, so a slot that later fails to load can be
// restored (QOL-12). It is the first thing given up when storage runs short.
const goodKey = pre => pre + 'good';
function keepGood(pre, i, raw) { if (raw) lsSet(goodKey(pre), JSON.stringify({ i, t: Date.now(), raw })); }
function goodCopy(pre) { try { const g = JSON.parse(lsGet(goodKey(pre)) || 'null'); return g && g.raw && g.i ? g : null; } catch (e) { return null; } }
function dropGood() { let n = 0; SAVE_SETS.forEach(([pre]) => { if (lsGet(goodKey(pre)) != null) { lsDel(goodKey(pre)); n++; } }); return n; }
const goodWhen = g => new Date(g.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
function saveStatus(msg) { ui.saveMsg = msg; const el = document.getElementById('savemsg'); if (el) el.textContent = msg; }
const saveStatusCb = (i, good, metaOk) => {
    const part = good && metaOk === false; // the career was written but the slot list could not be updated
    if (i === slot) setSaveSt(part ? 'meta' : good ? 'saved' : 'failed');
    saveStatus(part ? `Saved to slot ${i}, but the slot list could not be updated. It will try again with your next save.` : good ? `Saved to slot ${i} · ` + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Could not save. Browser storage is full or blocked. Create a save code below to keep your progress.');
    // show or clear AD's save-failure banner when the outcome changes
    if (typeof appMode !== 'undefined' && appMode === 'ad' && typeof render === 'function' && document.getElementById('view') && !document.querySelector('#view [data-act=adretry]') !== good) setTimeout(() => { if (ui.lastFlash && Date.now() - ui.lastFlashT < 1500 && !ui.flash) ui.flash = ui.lastFlash; const fsel = document.activeElement && document.activeElement !== document.body && typeof selectorFor === 'function' ? selectorFor(document.activeElement) : null; render(); if (fsel && typeof keepFocus === 'function') keepFocus(fsel); }, 0); // keep a notice that was just shown, and keep focus where it was
};
const saveQs = { ad: makeSaveQueue({ key: i => 'mfad-slot-' + i, metaKey: 'mfad-slots-meta', status: saveStatusCb }), coach: makeSaveQueue({ key: i => 'fecoach-slot-' + i, metaKey: 'fecoach-slots-meta', status: saveStatusCb }) };
let saveQ = saveQs.ad;
// Switches between the AD and Coach save sets. The game in memory for the set being left is kept
// so going back is instant; its saves are already queued.
const nsStash = { ad: null, coach: null };
function switchNS(ns) {
  if (NS === ns || !NS_PREFIX[ns]) return;
  nsStash[NS] = state ? { state, slot, blocked: saveBlocked } : null;
  NS = ns; META_KEY = NS_PREFIX[ns] + 'slots-meta'; ACTIVE_KEY = NS_PREFIX[ns] + 'active'; saveQ = saveQs[ns];
  const s = nsStash[ns];
  if (s && s.state) { state = s.state; slot = s.slot; saveBlocked = s.blocked; ME = state.my || 'MICH'; rebuildPMap(); rebuildConfs(); RNG.s = (state.rng >>> 0) || RNG.s; }
  else { state = null; slot = +lsGet(ACTIVE_KEY) || 1; saveBlocked = false; }
}
// The five AD save slots hold athletic director (and NFL GM) careers and commissioner careers. These keep them apart,
// so "Continue as AD" never opens a commissioner career.
function adCareerSlots() { const m = slotsMetaOf('ad'); return [1, 2, 3, 4, 5].filter(i => lsGet(NS_PREFIX.ad + 'slot-' + i) && !(m[i] && (m[i].comm || m[i].own))); }
function lastADSlot() { const L = adCareerSlots(); const k = +lsGet(NS_PREFIX.ad + 'last-ad'); if (L.includes(k)) return k; const a = +lsGet(NS_PREFIX.ad + 'active'); return L.includes(a) ? a : L[0] || null; }
function slotsMetaOf(ns) { try { return JSON.parse(lsGet(NS_PREFIX[ns] + 'slots-meta') || '{}') || {}; } catch (e) { return {}; } }
function save() {
  if (!state || saveBlocked) return;
  if (typeof appMode === 'undefined' || appMode === 'ad') state.rng = RNG.s; // only AD may capture the shared random stream
  saveQ.push(slot, JSON.stringify(state), slotSummary());
  if (NS === 'ad') lsSet(isComm() ? 'mfad-last-comm' : isOwner() ? 'mfad-last-own' : 'mfad-last-ad', String(slot)); // AD and commissioner careers share the AD slots: remember the last of each
  if (!ui.saveSt || ui.saveSt.k !== 'failed') setSaveSt('saving');
}
// The save state shown in the header: Saving…, Saved with the time, or a failure (QoL).
function setSaveSt(k) { ui.saveSt = { k, t: Date.now() }; if (typeof document !== 'undefined' && document.querySelectorAll) document.querySelectorAll('.savest').forEach(el => el.textContent = saveStateTxt()); }
function saveStateTxt() { const s = ui.saveSt; if (!s) return 'Saved'; if (s.k === 'saving') return 'Saving…'; if (s.k === 'failed') return 'Not saved: storage full or blocked'; if (s.k === 'meta') return 'Saved (slot list not updated)'; return 'Saved ' + new Date(s.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function flushSave() { return saveQ.flush(); }
function flushSync() { saveQ.flushSync(); }
// Saves the current career and waits for storage. Resolves false if the write failed, so a
// career switch can stop instead of leaving unsaved progress behind.
async function saveNow() { if (saveBlocked) return true; save(); await flushSave(); return !saveQ.failed[slot]; }
// Deleting a slot first lets queued writes finish, then retires them, so a late write can't
// bring the deleted career back.
async function deleteSlot(i) {
  await flushSave();
  saveQ.retire(i);
  lsDel(SLOT_KEY(i)); const m = slotsMeta(); delete m[i]; lsSet(META_KEY, JSON.stringify(m));
}
window.addEventListener('pagehide', flushSync);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSync(); });

/* ---------- adopting a loaded or imported game ----------
 * A candidate is validated and migrated while the current game is kept aside. Only if
 * every check passes does it become the active game; otherwise the previous game, its
 * player index, conference lists and random position are restored untouched. */
function checkShape(s) {
  if (!s || typeof s !== 'object') throw new Error('The data is empty.');
  if (s.lvl === 'nfl') return checkProShape(s);
  if (!s.teams || typeof s.teams !== 'object' || !s.teams[s.my || 'MICH']) throw new Error('No program data was found.');
  if (Object.keys(s.teams).length < 100) throw new Error('The league data is incomplete.');
  if (!Array.isArray(s.roster) || !s.roster.length) throw new Error('The roster is missing.');
  if (!Array.isArray(s.games) || !s.fin || typeof s.fin !== 'object' || !s.meters || !s.depth || !s.staff || !Number.isFinite(+s.season)) throw new Error('Required game data is missing.');
}
function checkIntegrity(s) {
  if (s.lvl === 'nfl') { checkPro(s); checkCoach(s); michStrength(); slotSummary(); if (typeof validateRender === 'function') { try { validateRender(); } catch (e) { console.error(e); throw new Error('The game could not display this save (' + e.message + ').'); } } return; }
  if (!s.settings || !POS_ORDER.every(p => Array.isArray(s.depth[p]))) throw new Error('The depth chart is damaged.');
  s.roster.forEach(p => { if (!p || !p.id || !POS_ORDER.includes(p.pos) || !Number.isFinite(p.ovr)) throw new Error('A player record is damaged.'); });
  Object.values(s.teams).forEach(t => { if (!CONFS[t.conf] || !Number.isFinite(t.rating)) throw new Error('A team record is damaged.'); });
  checkCoach(s); michStrength(); mGames(); legacyScore(); slotSummary();
  if (typeof validateRender === 'function') { try { validateRender(); } catch (e) { console.error(e); throw new Error('The game could not display this save (' + e.message + ').'); } }
}
function adoptState(cand) {
  const prev = { state, PMAP, rng: RNG.s, me: ME };
  try {
    checkShape(cand);
    if ((cand.kind === 'coach') !== (NS === 'coach')) throw new Error(cand.kind === 'coach' ? 'This is a Coach mode save. Load it from Coach mode on the Home screen.' : 'This is an AD mode save. Load it from AD mode on the Home screen.');
    if (typeof nflLeagueSync === 'function') nflLeagueSync(cand);
    state = cand; rebuildPMap(); migrate(cand); state = cand; rebuildPMap();
    if (typeof coachNormAll === 'function') coachNormAll(state); // staff saved with a missing age or contract length are repaired (FE-08)
    if (typeof xSanitize === 'function') { const fx = xSanitize(state, X_SHAPE); ui.xFixed = fx.length ? fx : null; } // damaged extras are reset before the display check (FE-06)
    if (state.pendingArrive) goCollegeNow(); // a move back to college was interrupted: finish it
    if (!isPro() && state.roster.length < MIN_ROSTER) fillRoster(); // repair a roster cut below what a team needs
    checkIntegrity(state);
    RNG.s = (cand.rng >>> 0) || freshSeed();
    settleLiveGame();
    return true;
  } catch (e) {
    state = prev.state; PMAP = prev.PMAP; RNG.s = prev.rng; ME = prev.me; if (state) rebuildConfs(); ui.xFixed = null;
    throw e;
  }
}
function settleLiveGame() {
  const wk = state.liveWk, rng = state.liveRng; state.liveWk = null; state.liveRng = null; if (wk == null) return;
  const mg = michGameThisWeek(wk); if (!mg || state.week !== wk || state.gameOver) return;
  // Played from the random position at kickoff, so the result is the same however often the page is reloaded.
  if (rng) RNG.s = rng >>> 0;
  advance();
  const opp = oppOf(mg), us = mg.h === ME ? mg.hs : mg.as, them = mg.h === ME ? mg.as : mg.hs;
  ui.flash = `The live game against ${teamName(opp)} was still going when you left, so it was played to the final: ${us > them ? 'won' : 'lost'} ${us}–${them}.`;
}
async function loadSlot(i) {
  const raw = lsGet(SLOT_KEY(i)); if (!raw) return { ok: false, err: 'That slot is empty.' };
  let cand; try { cand = JSON.parse(await gunz(raw)); } catch (e) { console.error(e); return { ok: false, err: 'The saved data is damaged or incomplete.' }; }
  try { adoptState(cand); setActiveSlot(i); applyTheme(); keepGood(NS_PREFIX[NS], i, raw); return { ok: true }; }
  catch (e) { console.error(e); return { ok: false, err: e && e.message ? e.message : 'The save could not be read.' }; }
}
async function boot(opts) {
  opts = opts || {};
  const legacy = lsGet(SAVE_KEY); if (legacy && !lsGet(SLOT_KEY(1)) && lsSet(SLOT_KEY(1), 'RAW:' + legacy)) lsDel(SAVE_KEY);
  const a = +lsGet(ACTIVE_KEY) || 1; let res = await loadSlot(a); const bad = [];
  if (!res.ok && lsGet(SLOT_KEY(a))) bad.push(a);
  for (let i = 1; i <= 5 && !res.ok; i++) { if (i === a) continue; res = await loadSlot(i); if (!res.ok && lsGet(SLOT_KEY(i))) bad.push(i); }
  if (!res.ok && NS === 'coach') { state = null; return false; } // a new coach is created from the setup form
  if (!res.ok) {
    const free = firstFreeSlot(); newGame(opts.diff || 'normal', null, opts.seed != null ? opts.seed : null, opts.gm ? 'MICH' : opts.tid); if (opts.gm) { goPro(opts.gm, { role: 'gm' }); state.tline = []; } setActiveSlot(free || 1);
    if (free) save(); else saveBlocked = true;
  }
  if (bad.length) { ui.badSlots = bad; const g = goodCopy(NS_PREFIX[NS]); const gh = g && bad.includes(g.i) ? ` A copy of slot ${g.i} that loaded cleanly earlier can be restored there.` : '';
    ui.flash = (saveBlocked
    ? 'None of the five save slots could be loaded, so they were left untouched and this new career is not being saved yet. Delete a slot on the Save file tab and this career will be saved there.'
    : `Slot ${bad.join(', ')} could not be loaded and was left untouched. You can still delete or reset it on the Save file tab.`) + gh; }
  if (res.ok) save();
  applyTheme(); render();
  return true;
}

/* ---------- save codes ---------- */
// A code is the save as text: PREFIX1: gzip + base64, or PREFIX0: plain base64 as a fallback.
async function encodeCode(json, prefix) {
  try { if (window.CompressionStream) { const st = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')); const buf = new Uint8Array(await new Response(st).arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return prefix + '1:' + btoa(bin); } } catch (e) { }
  return prefix + '0:' + btoa(unescape(encodeURIComponent(json)));
}
async function decodeCode(code, prefix) {
  code = (code || '').trim(); const n = prefix.length + 2;
  try {
    if (code.startsWith(prefix + '1:')) { const bin = atob(code.slice(n)); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')); return JSON.parse(await new Response(ds).text()); }
    if (code.startsWith(prefix + '0:')) return JSON.parse(decodeURIComponent(escape(atob(code.slice(n)))));
  } catch (e) { throw new Error('The code is incomplete or damaged.'); }
  throw new Error(`Save codes for this mode start with ${prefix}.`);
}
async function makeCode() { state.rng = RNG.s; return encodeCode(JSON.stringify(state), NS === 'coach' ? 'FECO' : 'MFAD'); }
async function readCode(code) { return decodeCode(code, NS === 'coach' ? 'FECO' : 'MFAD'); }

