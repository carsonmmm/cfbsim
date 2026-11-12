/* ===================== v9.60: the shell for the newer, self-contained modes =====================
 * Agent mode and High school coach do not run on the big college and NFL engine. Each is a small game of its
 * own, and they share this shell: appMode is 'mini', the game in memory is `mm`, and mm.kind says which one.
 * A mode registers itself in MINI with its tabs, its pages and a few hooks. The shell gives it a header, tabs,
 * the phone tab bar, three save slots, a Home screen card and settings.
 *   MINI.<kind> = { name, eyebrow, blurb, icon, tabs: [[key, label, icon]], create(form) -> game,
 *                   formHTML(), header(g) -> { title, sub, cells: [[k, v, s]], primary: [label, act] | null },
 *                   view(tab, g) -> html, summary(g) -> { name, line }, check(g) -> g | null }
 * Saves: 'fe<kind>-slot-<n>' (compressed like every other save) and 'fe<kind>-meta'. */
const MINI = {};
// The Home screen is first drawn before this file has run, so anything it calls has to cope with that.
function miniCount() { try { return Object.keys(MINI).length; } catch (e) { return 0; } }
let mm = null, mslot = 1; const mui = { tab: 'office', flash: '', confirm: null, form: null, seq: 0 };
const MINI_SLOTS = [1, 2, 3];
const miniKey = (kind, i) => 'fe' + kind + '-slot-' + i, miniMetaKey = kind => 'fe' + kind + '-meta';
function miniMeta(kind) { try { return JSON.parse(lsGet(miniMetaKey(kind)) || '{}') || {}; } catch (e) { return {}; } }
function miniSummary() { const M = MINI[mm.kind]; const s = M.summary(mm); return Object.assign({ saved: Date.now() }, s); }
// Saves are small. Each one is compressed and written in order; a newer save always wins.
function miniSave() {
  if (!mm) return Promise.resolve(true); const kind = mm.kind, i = mslot, json = JSON.stringify(mm), sum = miniSummary(), seq = ++mui.seq; mui.pending = { kind, i, json, sum };
  return gz(json).then(data => { if (seq !== mui.seq) return true; const ok = lsSet(miniKey(kind, i), data); if (ok) { const m = miniMeta(kind); m[i] = sum; lsSet(miniMetaKey(kind), JSON.stringify(m)); mui.pending = null; } mui.saveBad = !ok; return ok; }).catch(() => { mui.saveBad = true; return false; });
}
function miniFlushSync() { const p = mui.pending; if (!p) return; if (lsSet(miniKey(p.kind, p.i), 'RAW:' + p.json)) { const m = miniMeta(p.kind); m[p.i] = p.sum; lsSet(miniMetaKey(p.kind), JSON.stringify(m)); mui.pending = null; } }
window.addEventListener('pagehide', miniFlushSync); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') miniFlushSync(); });
async function miniLoad(kind, i) {
  const raw = lsGet(miniKey(kind, i)); if (!raw) return { ok: false, err: 'That slot is empty.' };
  try { let g = JSON.parse(await gunz(raw)); if (!g || g.kind !== kind) throw new Error('wrong kind'); g = MINI[kind].check ? MINI[kind].check(g) : g; if (!g) throw new Error('bad save'); mm = g; mslot = i; lsSet('fe' + kind + '-active', String(i)); return { ok: true }; }
  catch (e) { console.error(e); return { ok: false, err: 'That save is damaged and could not be opened.' }; }
}
const miniSlotsUsed = kind => MINI_SLOTS.filter(i => lsGet(miniKey(kind, i)));
const miniFree = kind => MINI_SLOTS.find(i => !lsGet(miniKey(kind, i))) || null;
const miniLast = kind => { const a = +lsGet('fe' + kind + '-active'); const used = miniSlotsUsed(kind); return used.includes(a) ? a : used[0] || null; };
function miniAfter(msg) { if (msg) mui.flash = msg; miniSave(); render(); }

/* ---------- drawing ---------- */
function miniRender() {
  document.documentElement.dataset.app = 'career'; document.documentElement.dataset.comm = ''; const el = document.getElementById('customTheme'); if (el) el.textContent = '';
  const M = mm ? MINI[mm.kind] : MINI[mui.kind]; const tabs = M.tabs.concat([['saves', 'Saves', 'grid'], ['settings', 'Settings', 'gear']]);
  if (!mm) mui.tab = 'saves'; if (!tabs.some(t => t[0] === mui.tab)) mui.tab = tabs[0][0];
  const H = mm ? M.header(mm) : { title: M.name, sub: 'Start a career to begin', cells: [], primary: null }; const dark = resolvedMode() === 'dark';
  const tools = `<div class="tools"><button class="tbtn" data-act="gohome" aria-label="Home screen">${IC.home}<span>Home</span></button><button class="tbtn" data-act="togglemode" aria-label="Switch to ${dark ? 'light' : 'dark'} mode">${dark ? IC.sun || IC.moon : IC.moon}<span>${dark ? 'Light' : 'Dark'}</span></button><button class="tbtn${mui.tab === 'settings' ? ' on' : ''}" data-act="mtab" data-tab="settings">${IC.gear}<span>Settings</span></button></div>`;
  $('#hdr').innerHTML = `<div class="brand"><div class="wm${H.title.length > 15 ? ' long' : ''}" data-badge="${esc(M.badge || 'FE')}"><span class="wmu">${esc(H.title.toUpperCase())}</span><span class="wmn">${esc(H.title)}</span><span class="wmt">${esc(H.title)}</span></div><div class="sub">${esc(H.sub)}${mm ? ' · Slot ' + mslot : ''}${mui.saveBad ? ' · <b>not saved</b>' : ''}</div></div>
   ${H.cells.length ? `<div class="board">${H.cells.map(([k, v, s]) => `<div class="cell"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>${s ? `<span class="s">${esc(s)}</span>` : ''}</div>`).join('')}</div>` : ''}
   <div class="acts">${tools}${H.primary ? `<div class="next"><button class="btn primary" data-act="${H.primary[1]}">${esc(H.primary[0])}</button></div>` : ''}</div>`;
  const btn = ([k, l]) => `<button class="tab${mui.tab === k ? ' on' : ''}" data-act="mtab" data-tab="${k}"${mui.tab === k ? ' aria-current="page"' : ''}>${esc(l)}</button>`;
  const t = $('#tabs'); t.innerHTML = (prefs.nav === 'side' ? `<div class="sbhead"><span class="sbw">${esc(M.name)}</span><button class="tbtn" data-act="toggleside" aria-label="Hide the sidebar">${IC.collapse}</button></div>` : '') + tabs.map(btn).join(''); t.setAttribute('aria-label', 'Sections');
  const m = $('#mnav'); if (m) m.innerHTML = tabs.slice(0, 5).map(([k, l, ic]) => `<button class="${mui.tab === k ? 'on' : ''}" data-act="mtab" data-tab="${k}"${mui.tab === k ? ' aria-current="page"' : ''}>${IC[ic] || IC.grid}<span>${esc(l)}</span></button>`).join('');
  const tk = $('#ticker'); if (tk) tk.innerHTML = '';
  let body; try { body = mui.tab === 'saves' ? miniSavesHTML(M) : mui.tab === 'settings' ? displaySettingsHTML('home') + (typeof feedbackHTML === 'function' ? '' : '') : M.view(mui.tab, mm); } catch (e) { console.error(e); body = '<section class="card"><p class="flash bad">This page could not be shown. Your career is safe.</p></section>'; }
  $('#view').innerHTML = (mui.flash ? `<div class="flash toast" role="status">${esc(mui.flash)}</div>` : '') + body; mui.flash = '';
  document.title = (mm ? H.title + ' · ' : '') + M.name + ' · Football Empire'; setInert(!$('#modal').hidden);
  try { if (typeof siteTrack === 'function' && mm) siteTrack('play-' + mm.kind); } catch (e) { }
}
function miniSavesHTML(M) {
  const kind = mm ? mm.kind : mui.kind; const meta = miniMeta(kind);
  const rows = MINI_SLOTS.map(i => { const has = !!lsGet(miniKey(kind, i)); const s = meta[i]; const on = mm && mslot === i; const ck = mui.confirm === 'mdel-' + i;
    return `<tr class="${on ? 'me' : ''}"><td>Slot ${i}</td><td>${has ? `<b>${esc(s ? s.name : 'Career')}</b><div class="small muted">${esc(s ? s.line : '')}</div>` : '<span class="muted">Empty</span>'}</td><td class="nowrap">${has ? (on ? '<span class="pill maize">Playing now</span> ' : `<button class="btn sm" data-act="mload" data-i="${i}">Load</button> `) + (ck ? `<button class="btn danger sm" data-act="mdel" data-i="${i}">Confirm: delete</button>` : `<button class="btn ghost sm" data-act="mask" data-k="mdel-${i}">Delete</button>`) : `<button class="btn sm" data-act="mnew" data-i="${i}">New career here</button>`}</td></tr>`; }).join('');
  return `${mui.form ? `<section class="card newcareer"><div class="head"><div><div class="eyebrow">${esc(M.name)} · new career · slot ${mui.form.slot}</div><h1 class="h2">${esc(M.formTitle || 'Start a career')}</h1></div><p class="hint">${esc(M.blurb)}</p></div>${M.formHTML(mui.form)}<div class="row gap mt"><button class="btn primary" data-act="mcreate">Start</button><button class="btn ghost" data-act="mformno">Back</button></div></section>` : ''}
  <section class="card"><div class="head"><div><div class="eyebrow">${esc(M.name)}</div><h2 class="h2">Three careers at once</h2></div><p class="hint">The game saves by itself after everything you do. Saves live in this browser, so clearing site data erases them.</p></div><div class="tw"><table class="tbl"><tbody>${rows}</tbody></table></div>${typeof storageNoteHTML === 'function' ? storageNoteHTML() : ''}</section>`;
}
// render(): the shell draws its own modes and leaves everything else to the game
{ const _r = render; render = function () { if (appMode === 'mini') { try { return miniRender(); } catch (e) { console.error(e); } return; } return _r.apply(this, arguments); }; }
{ const _l = leaveMode; leaveMode = async function () { if (appMode === 'mini') { if (mm && !(await miniSave())) { mui.flash = 'Could not save. Browser storage is full or blocked.'; render(); return false; } return true; } return _l.apply(this, arguments); }; }
async function miniEnter(kind, how) {
  if (appMode !== 'home' && appMode !== 'mini' && !(await leaveMode())) return; if (appMode === 'mini' && mm) await miniSave();
  hideModal(); mui.kind = kind; mui.confirm = null; mui.form = null; const last = miniLast(kind);
  if (how !== 'new' && last) { if (!(mm && mm.kind === kind && mslot === last)) { mm = null; const r = await miniLoad(kind, last); if (!r.ok) mui.flash = r.err; } mui.tab = mm ? MINI[kind].tabs[0][0] : 'saves'; }
  else { mm = null; const free = miniFree(kind); mui.tab = 'saves'; if (free) mui.form = { slot: free }; else mui.flash = 'All three slots are in use. Delete one to start a new career.'; }
  appMode = 'mini'; rngOwner = null; render(); window.scrollTo(0, 0);
}
function miniHomeCards() {
  return Object.entries(MINI).map(([kind, M]) => { const last = miniLast(kind); const s = last ? miniMeta(kind)[last] : null; const n = miniSlotsUsed(kind).length;
    return `<article class="mode"><div class="mglyph" aria-hidden="true">${IC[M.icon] || IC.star}</div><div class="eyebrow">${esc(M.eyebrow)}</div><h2 class="h2">${esc(M.name)}</h2><p>${esc(M.blurb)}</p>
    <div class="msave">${s ? `<b>${esc(s.name)}</b> · ${esc(s.line)} <span class="muted">· slot ${last}</span>` : `<span class="muted">No ${esc(M.name.toLowerCase())} career yet.</span>`}<div class="small muted">${n} of 3 save slots used</div></div>
    <div class="row gap">${last ? `<button class="btn primary" data-act="mgo" data-k="${kind}">Continue</button><button class="btn ghost" data-act="mgo" data-k="${kind}" data-v="new">New career</button>` : `<button class="btn primary" data-act="mgo" data-k="${kind}" data-v="new">${esc(M.startLabel || 'Start')}</button>`}</div></article>`; }).join('');
}
{ const _o = ownHomeCardHTML; ownHomeCardHTML = function () { let x = ''; try { x = miniHomeCards(); } catch (e) { console.error(e); } return _o.apply(this, arguments) + x; }; }
{ const _f = feedbackMode; feedbackMode = function () { return appMode === 'mini' ? 'Other' : _f.apply(this, arguments); }; }
Object.assign(actions, {
  mgo(d) { if (MINI[d.k]) miniEnter(d.k, d.v); },
  mtab(d) { mui.tab = d.tab; mui.confirm = null; render(); window.scrollTo(0, 0); },
  mask(d) { mui.confirm = mui.confirm === d.k ? null : d.k; render(); },
  mnew(d) { const i = +d.i; if (!MINI_SLOTS.includes(i) || lsGet(miniKey(mui.kind || (mm && mm.kind), i))) return; if (mm) miniSave(); mui.kind = mm ? mm.kind : mui.kind; mui.form = { slot: i }; render(); window.scrollTo(0, 0); },
  mformno() { mui.form = null; render(); },
  async mcreate() { const kind = mm ? mm.kind : mui.kind; const M = MINI[kind]; const f = mui.form; if (!f || lsGet(miniKey(kind, f.slot))) return; if (mm) await miniSave(); const g = M.create(M.readForm ? M.readForm() : {}); g.kind = kind; mm = g; mslot = f.slot; mui.form = null; mui.tab = M.tabs[0][0]; lsSet('fe' + kind + '-active', String(mslot)); miniAfter(M.welcome || ''); window.scrollTo(0, 0); },
  async mload(d) { const kind = mm ? mm.kind : mui.kind; if (mm) await miniSave(); const r = await miniLoad(kind, +d.i); mui.tab = r.ok ? MINI[kind].tabs[0][0] : 'saves'; mui.flash = r.ok ? '' : r.err; render(); },
  mdel(d) { const kind = mm ? mm.kind : mui.kind; const i = +d.i; mui.confirm = null; mui.seq++; mui.pending = null; lsDel(miniKey(kind, i)); const m = miniMeta(kind); delete m[i]; lsSet(miniMetaKey(kind), JSON.stringify(m)); if (mm && mslot === i) { mm = null; mui.tab = 'saves'; } mui.flash = 'Slot ' + i + ' deleted.'; render(); },
});
