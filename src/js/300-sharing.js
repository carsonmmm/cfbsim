/* ===================== SHARING: leaderboards and league challenges ===================== */
// These work when the game is opened from its claude.ai link (the db and user capabilities); anywhere else the
// cards simply don't appear. Each player keeps one document, scores/<their id>, holding their best posted careers,
// and everyone reads all of them. A challenge is a shared document: a school, a seed and a number of seasons, so
// everyone who takes it starts from the same league. Only ids are stored about people; names come from the
// platform when the board is drawn.
var share = { db: null, user: null, uid: null, tried: false, ok: false, board: null, chals: null, names: {}, err: '', busy: false, filter: 'all', loadedAt: 0 };
const SHARE_MAX = 25; // careers kept per player
async function shareInit() {
  if (share.tried) return share.ok; share.tried = true;
  try {
    const c = window.claude; if (!c || typeof c.use !== 'function') return false;
    share.db = await c.use('db').catch(() => null); share.user = await c.use('user').catch(() => null);
    share.uid = share.user ? await share.user.id() : null; share.ok = !!(share.db && share.uid);
  } catch (e) { share.ok = false; } finally { share.ready = true; }
  return share.ok;
}
// start the capability check once; redraw when it is ready
function shareKick() { if (!share || share.tried) return; shareInit().then(ok => { if (ok) { shareLoad(); if (typeof cloudIndex === 'function') cloudIndex(); render(); } }); }

/* ---------- what gets posted ---------- */
function shareMode() { return isPro() ? (isCoach() ? 'nflcoach' : 'gm') : isCoach() ? 'coach' : 'ad'; }
const SHARE_MODE_L = { ad: 'Athletic director', coach: 'College coach', gm: 'NFL general manager', nflcoach: 'NFL coach' };
// seasons of this career as { s, w, l, title, post } (post: made the playoff or won a bowl)
function shareSeasons() {
  if (isPro()) return (PS().hist || []).map(h => ({ s: h.s, w: h.w, l: h.l, title: h.po === 5, post: h.po >= 1 }));
  return state.history.map(h => ({ s: h.season, w: h.w, l: h.l, title: h.champ === ME, post: /CFP|Playoff|Bowl/.test(h.bowl || '') }));
}
const shareScore = ss => ss.reduce((v, h) => v + h.w * 2 - h.l + (h.title ? 40 : 0) + (h.post ? 6 : 0), 0);
function shareEntry() {
  if (!state) return null; let ss = shareSeasons(); const ch = state.chal || null;
  if (ch) ss = ss.filter(h => h.s >= ch.s0).slice(0, ch.n);
  if (!ss.length) return null;
  const who = isCoach() ? state.co.name : SHARE_MODE_L[shareMode()];
  return { k: `${shareMode()}:${state.seed}:${ss[0].s}:${ME}`, mode: shareMode(), team: myName(), who: String(who || '').slice(0, 40), seasons: ss.length, w: ss.reduce((a, h) => a + h.w, 0), l: ss.reduce((a, h) => a + h.l, 0), titles: ss.filter(h => h.title).length, posts: ss.filter(h => h.post).length, score: shareScore(ss), chal: ch ? ch.id : null, done: ch ? ss.length >= ch.n : false, s0: ss[0].s, t: Date.now() };
}
async function sharePost() {
  if (!(await shareInit()) || share.busy) return 'unavailable'; const e = shareEntry(); if (!e) return 'empty';
  share.busy = true;
  try {
    const ref = share.db.doc('scores/' + share.uid); const snap = await ref.get(); const cur = snap.exists ? (snap.data().entries || []) : [];
    const list = cur.filter(x => x.k !== e.k).concat([e]).sort((a, b) => b.score - a.score).slice(0, SHARE_MAX);
    await ref.set({ entries: list, t: Date.now() }); await shareLoad(true); return 'ok';
  } catch (err) { share.err = err && err.code === 'invalid_argument' ? 'You can view the boards, but this link doesn\'t let you post.' : 'The leaderboard is not reachable right now.'; return 'error'; }
  finally { share.busy = false; }
}
// read every player's board and the newest challenges (at most every 20 seconds unless forced)
async function shareLoad(force) {
  if (!share.ok || (!force && Date.now() - share.loadedAt < 20000)) return; share.loadedAt = Date.now();
  try {
    const [sc, ch] = await Promise.all([share.db.collection('scores').limit(300).get(), share.db.collection('challenges').orderBy('t', 'desc').limit(12).get()]);
    share.board = []; sc.docs.forEach(d => { const b = d.data() || {}; (b.entries || []).forEach(x => share.board.push(Object.assign({ uid: d.id }, x))); });
    share.chals = ch.docs.map(d => Object.assign({ id: d.id }, d.data()));
    const ids = [...new Set(share.board.map(x => x.uid).concat(share.chals.map(c => c.by)).filter(Boolean))];
    if (ids.length && share.user) share.names = await share.user.profiles(ids);
    share.err = '';
  } catch (e) { share.err = 'The leaderboard is not reachable right now.'; }
  const box = document.getElementById('sharebox'); if (box) box.outerHTML = shareHomeHTML(); const pc = document.getElementById('sharepost'); if (pc) pc.outerHTML = sharePostCard();
}
const shareWho = uid => (uid === share.uid ? 'You' : (share.names[uid] && share.names[uid].name) || 'Someone');
async function shareNewChallenge(tid, n) {
  if (!(await shareInit()) || !CTEAMS0_AD[tid]) return null; n = [3, 5, 10].includes(+n) ? +n : 5;
  try { const seed = freshSeed(); const ref = await share.db.collection('challenges').add({ tid, seed, n, diff: 'normal', by: share.uid, t: Date.now() }); await shareLoad(true); return ref.id; }
  catch (e) { share.err = 'Could not create the challenge right now.'; return null; }
}
// take a challenge: a new AD career at that school with that seed
async function shareTakeChallenge(id) {
  const c = (share.chals || []).find(x => x.id === id); if (!c) return;
  cui.adPick = false; if (appMode === 'career' && !(await leaveMode())) return; switchNS('ad'); appMode = 'ad'; hideModal();
  const any = [1, 2, 3, 4, 5].some(i => lsGet(SLOT_KEY(i)));
  if (!any) { state = null; await boot({ tid: c.tid, diff: c.diff || 'normal', seed: c.seed }); state.chal = { id: c.id, s0: state.season, n: c.n, tid: c.tid }; save(); ui.tab = 'office'; ui.flash = `Challenge on: ${c.n} seasons at ${teamName(c.tid)}. Post your result from the History tab when you're done.`; render(); window.scrollTo(0, 0); return; }
  state = null; { const t = lastADSlot(); if (t) setActiveSlot(t); } await boot({}); Object.assign(ui.nc, { mode: 'school', tid: c.tid, seed: String(c.seed) }); ui.newDiff = c.diff || 'normal'; ui.newSlot = firstFreeSlot() || (slot % 5) + 1; ui.chalPending = { id: c.id, n: c.n, tid: c.tid, seed: c.seed };
  ui.tab = 'file'; ui.flash = `Challenge: ${CTEAMS0_AD[c.tid].name}, ${c.n} seasons. The school and seed are filled in below. Pick a slot and start the career.`; render();
  const el = document.querySelector('.newcareer'); if (el) el.scrollIntoView({ block: 'start' });
}
// called after a new AD career starts: was it the challenge we set up?
function shareChallengeStarted(seed) { const p = ui.chalPending; ui.chalPending = null; if (p && ME === p.tid && String(seed) === String(p.seed)) state.chal = { id: p.id, s0: state.season, n: p.n, tid: p.tid }; }

/* ---------- cards ---------- */
function shareRows(list) {
  return list.length ? `<div class="tw"><table class="tbl"><thead><tr><th>#</th><th>Player</th><th>Career</th><th>Seasons</th><th>Record</th><th>Titles</th><th>Score</th></tr></thead><tbody>${list.map((x, i) => `<tr class="${x.uid === share.uid ? 'me' : ''}"><td class="num">${i + 1}</td><td>${esc(shareWho(x.uid))}</td><td><b>${esc(x.team)}</b> <span class="small muted">${esc(SHARE_MODE_L[x.mode] || '')}${x.mode === 'coach' || x.mode === 'nflcoach' ? ' · ' + esc(x.who) : ''}</span></td><td class="num">${x.seasons}</td><td class="num">${x.w}-${x.l}</td><td class="num">${x.titles}</td><td class="num"><b>${x.score}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No careers posted yet. Be the first.</p>';
}
function shareHomeHTML() {
  if (!share || !share.ok) return '<div id="sharebox" hidden></div>';
  const f = share.filter; const all = (share.board || []).filter(x => !x.chal && (f === 'all' || x.mode === f)).sort((a, b) => b.score - a.score).slice(0, 15);
  const chals = (share.chals || []).map(c => { const res = (share.board || []).filter(x => x.chal === c.id).sort((a, b) => (b.w - b.l) - (a.w - a.l) || b.score - a.score); const lead = res[0]; return `<div class="cand"><div><b>${esc(CTEAMS0_AD[c.tid] ? CTEAMS0_AD[c.tid].name : c.tid)}</b> · ${c.n} seasons <span class="small muted">· set by ${esc(shareWho(c.by))} · ${res.length} result${res.length === 1 ? '' : 's'}${lead ? ` · leader: ${esc(shareWho(lead.uid))} ${lead.w}-${lead.l}` : ''}</span></div><div class="row gap"><button class="btn sm" data-act="chaltake" data-id="${esc(c.id)}">Take it</button>${res.length ? `<button class="btn ghost sm" data-act="chalview" data-id="${esc(c.id)}">Standings</button>` : ''}</div></div>`; }).join('');
  const teams = Object.entries(CTEAMS0_AD).sort((a, b) => a[1].name.localeCompare(b[1].name));
  return `<section class="card" id="sharebox"><div class="head"><div><div class="eyebrow">Leaderboards</div><h2 class="h2">Best careers</h2></div><p class="hint">Post a career from its History tab. Score: 2 per win, −1 per loss, +6 for each playoff or bowl season, +40 for each title.</p></div>
   ${share.err ? `<p class="flash bad">${esc(share.err)}</p>` : ''}
   <div class="chips">${[['all', 'All'], ['ad', 'AD'], ['coach', 'College coach'], ['gm', 'NFL GM'], ['nflcoach', 'NFL coach']].map(([k, l]) => `<button class="chip${f === k ? ' on' : ''}" data-act="sharef" data-v="${k}">${l}</button>`).join('')}<button class="chip" data-act="sharerefresh">Refresh</button></div>
   ${share.board ? shareRows(all) : '<p class="small muted">Loading…</p>'}
   <div class="eyebrow mt">League challenges</div><p class="hint">Same school, same seed, same league for everyone. Best record after the set number of seasons wins.</p>
   ${chals || '<p class="small muted">No challenges yet.</p>'}
   <div class="row gap mt"><label class="fld inl"><span>School</span><select id="chaltid">${teams.map(([id, t]) => `<option value="${id}" ${id === 'MICH' ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label><label class="fld inl"><span>Seasons</span><select id="chaln"><option value="3">3</option><option value="5" selected>5</option><option value="10">10</option></select></label><button class="btn sm" data-act="chalnew">Create a challenge</button></div></section>`;
}
function sharePostCard() {
  if (!share || !share.ok || !state) return '<div id="sharepost" hidden></div>'; const e = shareEntry(); const ch = state.chal;
  const mine = (share.board || []).find(x => x.uid === share.uid && e && x.k === e.k);
  return `<section class="card" id="sharepost"><div class="head"><div><div class="eyebrow">${ch ? 'League challenge' : 'Leaderboard'}</div><h2 class="h3">${ch ? `${ch.n}-season challenge at ${esc(teamName(ch.tid))}` : 'Post this career'}</h2></div><p class="hint">${ch ? `Your first ${ch.n} seasons count. ${e && e.done ? 'All of them are in.' : `${e ? e.seasons : 0} of ${ch.n} done so far; you can post now and again later.`}` : 'Your best careers show on the Home screen for everyone who opens this game.'}</p></div>
   ${e ? `<p class="small">${e.seasons} season${e.seasons === 1 ? '' : 's'} · ${e.w}-${e.l} · ${e.titles} title${e.titles === 1 ? '' : 's'} · score <b>${e.score}</b>${mine ? ` · posted score ${mine.score}` : ''}</p><button class="btn sm" data-act="sharepost" ${share.busy ? 'disabled' : ''}>${mine ? 'Update my post' : 'Post it'}</button>` : '<p class="small muted">Finish a season first.</p>'}
   ${share.err ? `<p class="flash bad">${esc(share.err)}</p>` : ''}</section>`;
}
function shareChalModal(id) {
  const c = (share.chals || []).find(x => x.id === id); if (!c) return; const res = (share.board || []).filter(x => x.chal === id).sort((a, b) => (b.w - b.l) - (a.w - a.l) || b.score - a.score);
  openModal(`<div class="eyebrow">League challenge</div><h2 class="h2">${esc(CTEAMS0_AD[c.tid] ? CTEAMS0_AD[c.tid].name : c.tid)} · ${c.n} seasons</h2><p class="small muted">Seed ${c.seed}. Ranked by record, then score. Results still in progress are marked.</p>
   <div class="tw"><table class="tbl"><thead><tr><th>#</th><th>Player</th><th>Seasons</th><th>Record</th><th>Titles</th><th>Score</th></tr></thead><tbody>${res.map((x, i) => `<tr class="${x.uid === share.uid ? 'me' : ''}"><td class="num">${i + 1}</td><td>${esc(shareWho(x.uid))}${x.done ? '' : ' <span class="pill ghost">In progress</span>'}</td><td class="num">${x.seasons}</td><td class="num">${x.w}-${x.l}</td><td class="num">${x.titles}</td><td class="num">${x.score}</td></tr>`).join('')}</tbody></table></div>`, 'Challenge standings');
}
Object.assign(actions, {
  async sharepost() { const r = await sharePost(); if (appMode === 'ad') after(r === 'ok' ? 'Posted to the leaderboard.' : r === 'empty' ? 'Finish a season first.' : share.err || ''); },
  sharef(d) { share.filter = d.v; const box = document.getElementById('sharebox'); if (box) box.outerHTML = shareHomeHTML(); },
  sharerefresh() { shareLoad(true); },
  async chalnew() { const t = $('#chaltid'), n = $('#chaln'); const id = await shareNewChallenge(t ? t.value : 'MICH', n ? n.value : 5); if (!id) { const box = document.getElementById('sharebox'); if (box) box.outerHTML = shareHomeHTML(); } },
  chaltake(d) { shareTakeChallenge(d.id); },
  chalview(d) { shareChalModal(d.id); },
});

/* ---------- cloud saves ---------- */
// Your careers, saved to your own account (db: data/users/<your id>/, which only you can read), so you can pick
// one up on another device. A save is stored as its save code, split into pieces small enough for the store, with
// an index document listing what's there. Loading goes through the normal save-code import.
const CLOUD_CHUNK = 180000;
var cloud = { list: null, busy: false, msg: '', loadedAt: 0 };
const cloudCol = () => 'data/users/' + share.uid;
function cloudMode() { return appMode === 'career' ? 'pc' : NS === 'coach' ? 'coach' : 'ad'; }
function cloudKey() { return cloudMode() + '-' + (appMode === 'career' ? cslot : slot); }
async function cloudIndex(force) {
  if (!(await shareInit())) return null; if (cloud.list && !force && Date.now() - cloud.loadedAt < 15000) return cloud.list;
  try { const s = await share.db.collection(cloudCol()).doc('cloudidx').get(); cloud.list = s.exists ? (s.data().list || []) : []; cloud.loadedAt = Date.now(); } catch (e) { cloud.msg = 'Cloud saves are not reachable right now.'; cloud.list = cloud.list || []; }
  return cloud.list;
}
function cloudSummary() {
  if (appMode === 'career') { const s = cSummary(); return { name: s.name, sub: `${s.pos} · ${s.team} · ${s.year}` }; }
  return { name: isCoach() ? state.co.name : myName(), sub: `${isCoach() ? roleTitle(state.co.role) + ', ' + myName() : isPro() ? 'NFL GM' : 'Athletic director'} · ${state.season}` };
}
// Each cloud save is a new revision: its pieces go under their own id, every piece is read back and checked, and
// only then does the index switch to it. The previous revision stays in the index as a fallback, so a save that
// fails part-way (or two devices saving at once) can never damage the copy you already had (FE-01).
const cloudSum = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16) + ':' + str.length; };
const cloudDoc = (key, rev, i) => 'cs-' + key + '-' + (rev ? rev + '-' : '') + i; // saves from before v9.19 have no revision id
const cloudRev = ent => ent ? { rev: ent.rev || null, n: ent.n, ck: ent.ck || null, t: ent.t, size: ent.size } : null;
async function cloudDrop(col, r) { if (!r) return; for (let i = 0; i < r.n; i++) { try { await col.doc(cloudDoc(r.key, r.rev, i)).delete(); } catch (e) { /* cleared on a later save */ } } }
async function cloudSave() {
  if (!(await shareInit()) || cloud.busy) return; cloud.busy = true; cloudRefreshCard('Saving to the cloud…');
  const key = cloudKey(); const col = share.db.collection(cloudCol()); let wrote = null;
  try {
    const code = appMode === 'career' ? await cMakeCode() : await makeCode(); const n = Math.ceil(code.length / CLOUD_CHUNK); const ck = cloudSum(code);
    const rev = Date.now().toString(36) + (cloud.seq = (cloud.seq || 0) + 1).toString(36); wrote = { key, rev, n };
    const before = ((await cloudIndex(true)) || []).find(x => x.key === key) || null;
    for (let i = 0; i < n; i++) await col.doc(cloudDoc(key, rev, i)).set({ part: code.slice(i * CLOUD_CHUNK, (i + 1) * CLOUD_CHUNK), i, n, rev });
    // read every piece back before the index points at it
    let back = ''; for (let i = 0; i < n; i++) { const d = await col.doc(cloudDoc(key, rev, i)).get(); if (!d.exists) throw new Error('incomplete'); back += d.data().part; }
    if (cloudSum(back) !== ck) throw new Error('incomplete');
    const list = (await cloudIndex(true)) || []; const cur = list.find(x => x.key === key) || null; const sm = cloudSummary();
    const prev = cloudRev(cur); const ent = { key, mode: cloudMode(), rev, n, ck, size: code.length, t: Date.now(), name: String(sm.name).slice(0, 60), sub: String(sm.sub).slice(0, 80), prev };
    const next = [ent].concat(list.filter(x => x.key !== key)).slice(0, 30);
    await col.doc('cloudidx').set({ list: next }); cloud.list = next; wrote = null;
    const raced = before && cur && cur.t !== before.t; // another device saved this career while we were saving
    cloud.msg = raced ? 'Saved to your account. Another device also saved this career; its copy is kept as the previous version.' : 'Saved to your account.';
    // the revision before the previous one is no longer listed anywhere: clear its pieces, and any left by failed saves
    if (cur && cur.prev) await cloudDrop(col, Object.assign({ key }, cur.prev));
    const orphans = cloud.orphans || []; cloud.orphans = []; for (const o of orphans) await cloudDrop(col, o);
  } catch (e) {
    if (wrote) (cloud.orphans = cloud.orphans || []).push(wrote); // pieces of a failed save; the index never pointed at them
    cloud.msg = e && e.code === 'invalid_argument' ? 'This link doesn\'t let you save to your account.' : e && e.code === 'quota_exceeded' ? 'Your cloud space is full. Delete an old cloud save first.' : 'Could not save to the cloud right now. Your earlier cloud copy is unchanged.';
  }
  cloud.busy = false; cloudRefreshCard();
}
// one revision's code, checked against its checksum when it has one
async function cloudRead(col, key, r) {
  let code = ''; for (let i = 0; i < r.n; i++) { const s = await col.doc(cloudDoc(key, r.rev, i)).get(); if (!s.exists) throw new Error('missing'); code += s.data().part; }
  if (r.ck && cloudSum(code) !== r.ck) throw new Error('damaged'); return code;
}
async function cloudLoad(key) {
  if (!(await shareInit())) return; const ent = (cloud.list || []).find(x => x.key === key); if (!ent) return;
  cloud.busy = true; cloudRefreshCard('Downloading…');
  try {
    const col = share.db.collection(cloudCol()); let code = null, older = false;
    try { code = await cloudRead(col, key, cloudRev(ent)); } catch (e) { if (!ent.prev) throw e; code = await cloudRead(col, key, ent.prev); older = true; }
    cloud.busy = false; cloud.msg = older ? 'The latest cloud copy was incomplete, so the previous one was loaded.' : '';
    if (appMode === 'career') { const box = document.getElementById('cimportbox'); if (box) box.value = code; await actions.cimport(); return; }
    ui.importCode = code; ui.importMsg = `Cloud save "${ent.name}"${older ? ' (previous version)' : ''} is ready. Confirm below to load it into slot ${slot}.`; ui.confirm = 'import'; render(); const b = $('[data-act=import]'); if (b) { b.scrollIntoView({ block: 'center' }); b.focus(); }
  } catch (e) { cloud.busy = false; cloud.msg = 'That cloud save could not be downloaded.'; cloudRefreshCard(); }
}
async function cloudDelete(key) {
  if (!(await shareInit())) return; const ent = (cloud.list || []).find(x => x.key === key); if (!ent) return; const col = share.db.collection(cloudCol());
  try { const list = cloud.list.filter(x => x.key !== key); await col.doc('cloudidx').set({ list }); cloud.list = list; cloud.msg = 'Deleted from your account.'; await cloudDrop(col, Object.assign({ key }, cloudRev(ent))); if (ent.prev) await cloudDrop(col, Object.assign({ key }, ent.prev)); } catch (e) { cloud.msg = 'Could not delete that cloud save.'; }
  cloudRefreshCard();
}
function cloudCardHTML(busyMsg) {
  if (!share || !share.ok) return '<div id="cloudcard" hidden></div>';
  const mode = cloudMode(); const mine = (cloud.list || []).filter(x => x.mode === mode); const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(t).toLocaleDateString(); };
  const hasCareer = appMode === 'career' ? !!cs : !!state;
  return `<section class="card" id="cloudcard"><div class="head"><div><div class="eyebrow">Cloud saves</div><h2 class="h3">Play on any device</h2></div><p class="hint">Save this career to your account, then load it anywhere you open this game while signed in. Only you can see your cloud saves.</p></div>
   ${busyMsg || cloud.msg ? `<p class="flash">${esc(busyMsg || cloud.msg)}</p>` : ''}
   <div class="row gap">${hasCareer ? `<button class="btn sm" data-act="cloudsave" ${cloud.busy ? 'disabled' : ''}>Save this career to the cloud</button>` : ''}<button class="btn ghost sm" data-act="cloudrefresh">Refresh</button></div>
   ${cloud.list == null ? '<p class="small muted mt">Loading…</p>' : mine.length ? `<table class="mini wide mt">${mine.map(x => `<tr><td><b>${esc(x.name)}</b><div class="small muted">${esc(x.sub || '')} · saved ${ago(x.t)} · ${Math.round(x.size / 1024)} KB</div></td><td class="nowrap"><button class="btn sm" data-act="cloudload" data-k="${esc(x.key)}" ${cloud.busy ? 'disabled' : ''}>Load</button> <button class="btn ghost sm" data-act="clouddel" data-k="${esc(x.key)}">Delete</button></td></tr>`).join('')}</table>` : '<p class="small muted mt">No cloud saves for this mode yet.</p>'}</section>`;
}
function cloudRefreshCard(busyMsg) { const el = document.getElementById('cloudcard'); if (el) el.outerHTML = cloudCardHTML(busyMsg); }
function cloudKick() { shareKick(); if (share && share.ok && cloud.list == null) cloudIndex().then(() => cloudRefreshCard()); }
Object.assign(actions, {
  cloudsave() { cloudSave(); }, cloudload(d) { cloudLoad(d.k); }, clouddel(d) { cloudDelete(d.k); }, cloudrefresh() { cloudIndex(true).then(() => cloudRefreshCard()); },
});

