/* ===================== QUALITY OF LIFE: undo, shortcuts, the glossary, what changed ===================== */

/* ---------- undo the last roster move ---------- */
// Roster moves (releases, depth chart changes, position switches, cuts) keep a copy of the career from just before.
// The Undo button stays until you do something else that changes the game (a sim, a signing, another tab's move).
const UNDO_ACTS = { release: 'Release', pcut: 'Release', pautocut: 'Roster cuts', dmove: 'Depth chart change', dtop: 'Depth chart change', dauto: 'Depth chart reset', mkstarter: 'New starter', switchpos: 'Position change', scholar: 'Scholarship' };
// actions that only change what's on screen: they leave the undo in place
const UNDO_KEEP = new Set(['undo', 'tab', 'player', 'team', 'box', 'close', 'recf', 'dfpos', 'paysort', 'moremenu', 'overshow', 'overhide', 'cmpset', 'cmpgo', 'cmpclear', 'pollv', 'admtab', 'setpref', 'togglemode', 'toggleside', 'askrel', 'pask', 'dsort', 'sharef', 'sharerefresh', 'chalview', 'kbhelp', 'glossary', 'rpos']);
function undoSnap(act) { if (appMode !== 'ad' || !state || liveBusy() || !UNDO_ACTS[act]) return null; try { return { j: JSON.stringify(state), rng: RNG.s, lbl: UNDO_ACTS[act], key: state.season + ':' + state.week + ':' + state.phase, n: state.roster.length }; } catch (e) { return null; } }
function undoAfter(act, snap) { if (snap) { ui.undo = snap; return; } if (ui.undo && !UNDO_KEEP.has(act)) ui.undo = null; }
function undoBarHTML() { const u = ui.undo; if (!u || !state || u.key !== state.season + ':' + state.week + ':' + state.phase) return ''; return `<div class="undobar" role="status"><span>${esc(u.lbl)}</span><button class="btn sm" data-act="undo">Undo</button><button class="icon" data-act="undodrop" aria-label="Dismiss">×</button></div>`; }
Object.assign(actions, {
  undo() { const u = ui.undo; if (!u || liveBusy()) return; ui.undo = null; try { state = JSON.parse(u.j); RNG.s = u.rng; rebuildPMap(); save(); after(`Undone: ${u.lbl.toLowerCase()}.`); } catch (e) { after('That move could not be undone.'); } },
  undodrop() { ui.undo = null; render(); },
});

/* ---------- keyboard shortcuts ---------- */
// N: next (the main button) · L: watch live · 1-9: tabs · U: undo · ?: this list. In a live game: Space pauses,
// F changes the speed. Off in Settings (prefs.keys). Never fires while you type in a box.
const KB_HELP = [['N', 'Next: the main button (sim the week, next offseason step)'], ['L', 'Watch this week\'s game live'], ['1 – 9', 'Jump to a tab'], ['U', 'Undo the last roster move'], ['G', 'What the numbers mean'], ['?', 'Show this list'], ['Space', 'Live game: pause or resume'], ['F', 'Live game: faster or slower'], ['Esc', 'Close a window']];
function kbHelpHTML() { return `<div class="eyebrow">Keyboard shortcuts</div><h2 class="h2">Play faster</h2><table class="mini wide">${KB_HELP.map(([k, d]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</table><p class="hint mt">Turn them off in Settings if they get in your way.</p>`; }
document.addEventListener('keydown', e => {
  if (prefs.keys === 'off' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  const k = e.key; const m = $('#modal'); const open = m && !m.hidden;
  if (open) {
    if (appMode === 'ad' && liveBusy() && live.open) {
      if (k === ' ' && !live.sim.pending) { e.preventDefault(); actions.lpause(); }
      else if (k === 'f' || k === 'F') { e.preventDefault(); actions.lspeed({ v: String(live.speed % 3 + 1) }); }
    }
    return;
  }
  if (k === '?') { e.preventDefault(); openModal(kbHelpHTML(), 'Keyboard shortcuts'); return; }
  if (appMode === 'home') return;
  if (k === 'g' || k === 'G') { e.preventDefault(); openModal(glossaryHTML(), 'What the numbers mean'); return; }
  if (/^[1-9]$/.test(k)) { const tabs = [...document.querySelectorAll('#tabs [data-act="tab"], #tabs [data-act="ctab"], #mnav [data-act="tab"], #mnav [data-act="ctab"]')].filter(b => b.offsetParent !== null); const b = tabs[+k - 1]; if (b) { e.preventDefault(); b.click(); } return; }
  if (appMode !== 'ad' || !state) return;
  if (k === 'n' || k === 'N') { const b = document.querySelector('#hdr [data-act="primary"], #view [data-act="primary"], #view [data-act="offnext"], #view [data-act="pnext"]'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  else if (k === 'l' || k === 'L') { const b = document.querySelector('#view [data-act="live"]'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  else if ((k === 'u' || k === 'U') && ui.undo) { e.preventDefault(); actions.undo(); }
});

/* ---------- the glossary: every rating and number ---------- */
const GLOSS = {
  ovr: 'Overall rating, 40–99: how good a player is right now at his position.', pot: 'Potential: the overall rating he could grow into.', 'ovr / pot': 'Overall rating now / the rating he could grow into. A range means your scouts aren\'t sure yet.',
  stars: 'Recruiting stars, 1–5, from the national services. Five stars is a can\'t-miss prospect.', interest: 'How interested a recruit is in your school, 0–100. The leader when he decides usually signs him.',
  overall: 'Team strength on a 0–100 scale: offense, defense and special teams together.', offense: 'Offensive strength: your starters\' ratings, scheme fit, coaching and this week\'s plan.', defense: 'Defensive strength: your starters\' ratings, scheme fit, coaching and this week\'s plan.',
  'expected wins': 'How many regular-season games a team this strong should win against this schedule.', 'win chance': 'The chance to win this game from here, from the score, the time left and the two teams\' strength.',
  prestige: 'How big the program or job is. Recruits, coaches and offers all follow prestige.', morale: 'The locker room, 0–100. High morale helps on game day and keeps players from leaving.', 'locker room': 'The locker room, 0–100. High morale helps on game day and keeps players from leaving.',
  fans: 'Fan support, 0–100. Drives ticket sales and the home crowd.', boosters: 'Booster support, 0–100. Drives donations and NIL money.', board: 'How happy your boss is, 0–100. Too low and you can be fired.', 'hot seat': 'How close the head coach is to being fired, 0–100.', 'ncaa risk': 'How likely an NCAA investigation is. Bending recruiting rules raises it; the compliance office lowers it.',
  'cap room': 'Salary cap space left this season after every contract and dead money.', 'dead money': 'Cap charges for players no longer on the team (signing bonuses that still count).', apy: 'Average per year: a contract\'s total value divided by its years.', 'signing bonus': 'Paid up front, but charged to the cap evenly over the contract\'s years.',
  leadership: 'How strong your captains are. Leaders count triple. It lifts the locker room every week.', 'legacy score': 'Your career on one number: titles, wins, rivalry wins, profits and the program\'s growth.',
  rapport: 'How a player or coach feels about you, 0–100. It moves with playing time, wins, promises and what you say.', chemistry: 'How well you get along with the teammates you compete with, 0–100.', gpa: 'Grade point average, 0–4. Under 2.0 at the start of a season means you sit the first three games.',
  followers: 'Your social following. Big games, awards and draft night grow it; brands call as it grows.', 'skill points': 'Points to spend on ratings. You earn them from games and offseasons.', trust: 'How much your coach trusts you, 0–100. More trust means more snaps.',
  'football net': 'Football revenue minus football expenses this fiscal year.', 'department reserve': 'The athletic department\'s cash on hand.', 'experience': 'Seasons in the NFL.', class: 'Year in school: Fr, So, Jr, Sr, or Gr (graduate).',
  momentum: 'Who has the run of play. A touchdown or a takeaway swings it.', 'crowd factor': 'How much the home crowd helps. Bigger stadiums and better fans help more.', 'composite': 'The recruiting services\' combined grade, out of 1.0000.',
};
function glossOf(txt) { const k = String(txt || '').toLowerCase().replace(/[^a-z /]/g, '').replace(/\s+/g, ' ').trim(); return GLOSS[k] || null; }
// mark the labels on screen that have an explanation: dotted underline, a tooltip, and tap or Enter to read it
function applyGloss(root) {
  if (!root) return; root.querySelectorAll('.tiles .k, th, .lbl, .kv .k, .meter .k').forEach(el => { if (el.dataset.gl || el.children.length > 1) return; const d = glossOf(el.textContent); if (!d) return; el.dataset.gl = '1'; el.classList.add('glo'); el.title = d; if (el.tagName !== 'TH') el.tabIndex = 0; });
}
function glossaryHTML() { return `<div class="eyebrow">Glossary</div><h2 class="h2">What the numbers mean</h2><dl class="gloss">${Object.entries(GLOSS).filter(([k]) => k !== 'ovr / pot' && k !== 'locker room').map(([k, v]) => `<dt>${esc(k.replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/^(Ovr|Pot|Apy|Gpa|Ncaa)\b/, s => s.toUpperCase()))}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`; }
document.addEventListener('click', e => { const el = e.target.closest('.glo'); if (!el || el.closest('[data-act]')) return; notifyGloss(el); });
document.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const el = e.target.closest && e.target.closest('.glo'); if (el) { e.preventDefault(); notifyGloss(el); } });
function notifyGloss(el) { const d = el.title || glossOf(el.textContent); if (!d) return; let t = document.getElementById('gltip'); if (!t) { t = document.createElement('div'); t.id = 'gltip'; t.className = 'gltip'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = `${el.textContent.trim()}: ${d}`; t.hidden = false; clearTimeout(notifyGloss.t); notifyGloss.t = setTimeout(() => { t.hidden = true; }, 5000); }
Object.assign(actions, { glossary() { openModal(glossaryHTML(), 'What the numbers mean'); }, kbhelp() { openModal(kbHelpHTML(), 'Keyboard shortcuts'); } });
{ const mo = new MutationObserver(() => { applyGloss($('#view')); const m = $('#modal .mbody'); if (m && !$('#modal').hidden) applyGloss(m); }); mo.observe(document.getElementById('view'), { childList: true }); const md = document.getElementById('modal'); if (md) mo.observe(md, { childList: true, subtree: true }); }

/* ---------- what changed over a multi-season sim ---------- */
function changeSnap() {
  if (!state) return null; const t = T(ME); const top = state.roster.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 5).map(p => p.id);
  return { season: state.season, lvl: isPro() ? 'nfl' : 'col', me: ME, rating: t ? t.rating : null, bal: state.fin && !isPro() ? state.fin.balance : null, hc: state.staff && state.staff.HC ? state.staff.HC.name : null, top, troph: (state.trophies || []).length, hof: (state.hof || []).length, fan: state.meters ? state.meters.fan : null, board: state.meters ? state.meters.board : null, role: isCoach() ? state.co.role : null };
}
function changesHTML(b) {
  if (!b || !state) return ''; const a = changeSnap(); const rows = []; const sg = v => (v > 0 ? '+' : '') + v;
  if (a.me !== b.me || a.lvl !== b.lvl) rows.push(`New team: <b>${esc(myName())}</b>${a.lvl !== b.lvl ? (a.lvl === 'nfl' ? ' (NFL)' : ' (college)') : ''}`);
  if (isCoach() && a.role !== b.role) rows.push(`New job: <b>${esc(roleTitle(a.role))}</b>`);
  if (a.me === b.me && a.rating != null && b.rating != null && Math.abs(a.rating - b.rating) >= 0.5) rows.push(`Team rating ${Math.round(b.rating)} → <b>${Math.round(a.rating)}</b> (${sg(Math.round(a.rating - b.rating))})`);
  if (a.hc !== b.hc && a.me === b.me && !isCoach() && a.hc) rows.push(`Head coach: ${esc(b.hc || 'none')} → <b>${esc(a.hc)}</b>`);
  if (a.bal != null && b.bal != null && a.lvl === 'col' && b.lvl === 'col') rows.push(`Department reserve ${fm(b.bal)} → <b>${fm(a.bal)}</b>`);
  if (a.fan != null && b.fan != null && Math.abs(a.fan - b.fan) >= 3) rows.push(`Fans ${Math.round(b.fan)} → <b>${Math.round(a.fan)}</b>`);
  if (a.board != null && b.board != null && Math.abs(a.board - b.board) >= 3) rows.push(`Board ${Math.round(b.board)} → <b>${Math.round(a.board)}</b>`);
  const gone = b.top.filter(id => !P(id)).length; if (gone && a.me === b.me) rows.push(`${gone} of your 5 best players from ${b.season} ${gone === 1 ? 'is' : 'are'} gone; your best now: ${state.roster.slice().sort((x, y) => y.ovr - x.ovr).slice(0, 3).map(p => `${esc(p.n)} (${p.pos}, ${p.ovr})`).join(', ')}`);
  if (a.troph > b.troph) rows.push(`Trophies won: <b>${(state.trophies || []).slice(b.troph).map(t => esc(t.t)).join(' · ')}</b>`);
  if (a.hof > b.hof) rows.push(`Hall of Fame: ${(state.hof || []).slice(b.hof).map(x => esc(x.n)).join(', ')}`);
  const tl = (state.tline || []).filter(x => x.s >= b.season && x.k === 'big' && !/season begins|^Welcome to|^Achievement unlocked/.test(x.txt)).slice(-10).map(x => `<li><span class="when">${x.s}</span>${esc(x.txt)}</li>`).join('');
  if (!rows.length && !tl) return '';
  return `<div class="eyebrow mt">What changed</div><ul class="plainlist small">${rows.map(r => `<li>${r}</li>`).join('')}</ul>${tl ? `<div class="eyebrow mt">Headlines</div><ul class="news">${tl}</ul>` : ''}`;
}

/* ---------- historical rankings (Admin) ---------- */
Object.assign(actions, { admrank() { const el = $('#admrank'); const r = importRankings(el ? el.value : ''); after(r.n ? `Ranking applied to ${r.n} team${r.n === 1 ? '' : 's'}: ${r.top.join(', ')}${r.n > 5 ? '…' : ''}.` : 'No teams matched. Use one team per line, like "1. Georgia".'); } });
applyGloss(document.getElementById('view'));

/* ===================== v9.9 quality of life: inbox, search, rating charts, spreadsheets, sortable tables ===================== */
Object.assign(IC, {
  search: svgI('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  inbox: svgI('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13l2.5 8v6H3v-6z"/>'),
});
function lsJSON(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
function lsPut(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

/* ---------- inbox: everything waiting on you ---------- */
function inboxItems() {
  const out = [];
  if (appMode === 'career') {
    if (!cs || !cs.p) return out;
    if (cs.event) out.push({ txt: 'A decision is waiting for you.', ctab: 'home' });
    if (cRehabAsk()) out.push({ txt: `Choose your rehab plan: ${cs.p.injName}.`, ctab: 'home' });
    if (['hsoff', 'coloff', 'nfloff'].includes(cs.phase) && offStep()) out.push({ txt: 'The offseason is waiting on your next step.', ctab: 'home' });
    if (cs.phase === 'sign') out.push({ txt: 'Pick your college.', ctab: 'home' });
    const eo = (cs.endOff || []).length; if (eo) out.push({ txt: `${eo} endorsement offer${eo > 1 ? 's' : ''} waiting.`, ctab: 'nil' });
    if (cs.p.xp >= 6 && !cs.p.auto) out.push({ txt: `${cs.p.xp} skill points to spend.`, ctab: 'player' });
    return out;
  }
  if (typeof state === 'undefined' || !state || appMode !== 'ad') return out;
  if (isComm()) { const c = cm2(); const ag = c.items.filter(x => x.agenda).length; if (c.items.length) out.push({ txt: `${c.items.length} item${c.items.length > 1 ? 's' : ''} on your desk${ag ? ` (${ag} on the offseason agenda)` : ''}.`, tab: 'office' }); if (c.m.own < 30) out.push({ txt: `${cmLabel('own')} are losing patience (${c.m.own}).`, tab: 'office' }); return out; }
  if (liveBusy()) out.push({ txt: 'A live game is paused.', act: 'liveresume' });
  if (state.event) out.push({ txt: (state.event.title || 'A decision') + ' is waiting for your answer.', tab: 'office' });
  if (state.phase === 'offseason') offBlockers().forEach(b => out.push({ txt: b.txt, tab: b.tab, act: b.act }));
  if (isComm() && (commOf().desk || []).length) out.push({ txt: `${commOf().desk.length} request${commOf().desk.length > 1 ? 's' : ''} on your desk.`, tab: 'office' });
  if (!isComm()) { const rh = (state.roster || []).filter(p => typeof rehabOpen === 'function' && rehabOpen(p)); if (rh.length) out.push({ txt: `${rh.length} injured player${rh.length > 1 ? 's need' : ' needs'} a rehab plan.`, tab: isPro() ? 'roster' : 'roster' }); }
  if (!isPro() && !isComm() && state.rec && !state.rec.done && state.phase === 'regular' && state.rec.visits > 0 && !autoOn('rec') && state.week >= 3) out.push({ txt: `${state.rec.visits} official visit${state.rec.visits > 1 ? 's' : ''} not used yet.`, tab: 'recruit' });
  if (isPro() && isGM() && capRoom(ME) < 0) out.push({ txt: 'You are over the salary cap.', tab: 'cap' });
  return out;
}
function inboxHTML() {
  const it = inboxItems(); const c = appMode === 'career';
  return `<div class="eyebrow">Inbox</div><h2 class="h2">${it.length ? `${it.length} thing${it.length > 1 ? 's' : ''} waiting on you` : 'Nothing waiting on you'}</h2>${it.length ? `<ul class="plainlist inbox">${it.map(x => `<li><span>${esc(x.txt)}</span>${x.act ? `<button class="btn sm" data-act="${x.act}">Go</button>` : x.tab || x.ctab ? `<button class="btn sm" data-act="inboxgo" data-tab="${x.tab || x.ctab}" data-c="${c ? 1 : 0}">Go</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">You are all caught up.</p>'}`;
}
function qolToolsHTML(mode) {
  if (mode === 'home') return ''; let n = 0; try { n = inboxItems().length; } catch (e) { n = 0; }
  return `${mode !== 'career' ? `<button class="tbtn" data-act="search" aria-label="Search players, teams and coaches">${IC.search}<span>Search</span></button>` : ''}<button class="tbtn" data-act="inbox" aria-label="Inbox: ${n} waiting">${IC.inbox}<span>Inbox</span>${n ? `<i class="ibadge">${n}</i>` : ''}</button>`;
}

// what stops "Sim to the next decision": a question for you, an injured player's rehab plan, or a big game you may want to watch
function decisionNow() {
  if (state.gameOver || state.phase === 'offseason') return true; if (isComm()) return cm2().items.length > 0; if (state.event) return true;
  if (!isComm() && (state.roster || []).some(p => typeof rehabOpen === 'function' && rehabOpen(p))) return true;
  if (isPro()) { const g = proMyGame(state.week); return !!(g && g.type === 'po'); }
  const g = michGameThisWeek(state.week); if (!g) return false; const opp = g.h === ME ? g.a : g.h; return g.type !== 'reg' || !!rivalOf(opp) || (rankOf(opp) && rankOf(opp) <= 15);
}
/* ---------- search: players, teams, coaches and recruits ---------- */
function searchResults(q) {
  q = String(q || '').trim().toLowerCase(); if (q.length < 2) return []; const out = []; const hit = s => String(s || '').toLowerCase().includes(q);
  if (!isComm()) (state.roster || []).forEach(p => { if (hit(p.n)) out.push({ k: 'Player', txt: `${p.n} · ${p.pos} · ${p.ovr} OVR`, act: 'player', id: p.id }); });
  Object.values(state.teams || {}).forEach(t => { if (hit(t.name) || hit(t.id)) out.push({ k: 'Team', txt: t.name, act: 'team', id: t.id }); if (t.coach && hit(t.coach)) out.push({ k: 'Coach', txt: `${t.coach}, head coach of ${t.name}`, act: 'team', id: t.id }); (t.stars || []).forEach(s => { if (hit(s.n)) out.push({ k: 'Star', txt: `${s.n} · ${s.pos} · ${t.name}`, act: 'team', id: t.id }); }); });
  if (!isComm()) Object.entries(state.staff || {}).forEach(([r, c]) => { if (c && hit(c.name)) out.push({ k: 'Your staff', txt: `${c.name} · ${r}`, tab: 'staff' }); });
  if (state.rec && state.rec.list && !isPro() && !isComm()) state.rec.list.forEach(r => { if (hit(r.n)) out.push({ k: 'Recruit', txt: `${r.n} · ${r.star}★ ${r.pos} · ${r.home || ''}`, tab: 'recruit' }); });
  if (isPro()) NFL.forEach(t => { if (t.id === ME && !isComm()) return; (proRoster(t.id) || []).forEach(p => { if (hit(p.n)) out.push({ k: 'NFL player', txt: `${p.n} · ${p.pos} · ${t.name}`, act: 'player', id: p.id }); }); });
  return out.slice(0, 40);
}
function searchListHTML(q) { const r = searchResults(q); return r.length ? r.map(x => `<li><span class="pill ghost">${esc(x.k)}</span> ${x.act ? `<button class="lnk" data-act="${x.act}" data-id="${esc(x.id)}">${esc(x.txt)}</button>` : `<button class="lnk" data-act="inboxgo" data-tab="${x.tab}" data-c="0">${esc(x.txt)}</button>`}</li>`).join('') : `<li class="muted">${String(q || '').trim().length < 2 ? 'Type at least two letters.' : 'Nothing found.'}</li>`; }
document.addEventListener('input', e => { if (e.target && e.target.id === 'srchq') { const ul = document.getElementById('srchres'); if (ul) ul.innerHTML = searchListHTML(e.target.value); } });
document.addEventListener('keydown', e => { if (e.key === '/' && prefs.keys !== 'off' && appMode === 'ad' && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') && $('#modal').hidden) { e.preventDefault(); actions.search(); } });

/* ---------- rating history charts ---------- */
function ratingHist(p) {
  const pts = (p.hist || []).filter(h => h && h.ovr != null).map(h => [h.s, h.ovr]);
  if (!pts.length || pts[pts.length - 1][0] !== state.season) pts.push([state.season, p.ovr]); return pts.filter(x => x[1] != null);
}
function ratingChartHTML(p) {
  const pts = ratingHist(p); if (pts.length < 2) return ''; const v = pts.map(x => x[1]); const lo = Math.floor(Math.min(...v) - 2), hi = Math.ceil(Math.max(...v) + 2);
  return `<div class="rchart">${lineChart(pts.map(x => ({ y: x[1], lbl: String(x[0]), tip: `${x[0]}: ${x[1]} OVR` })), { min: lo, max: hi, yTicks: [lo, Math.round((lo + hi) / 2), hi], title: 'Rating by season', dots: true })}</div>`;
}
function cRatingChartHTML() {
  const s = cs.p.seasons.filter(x => x.ovr != null); const pts = s.map(x => [x.year + (x.lvl === 'hs' ? ' HS' : x.lvl === 'nfl' ? ' NFL' : ''), x.ovr]).concat([['Now', cOvr(cs.p)]]); if (pts.length < 2) return '';
  const v = pts.map(x => x[1]); const lo = Math.floor(Math.min(...v) - 2), hi = Math.ceil(Math.max(...v) + 2);
  return `<section class="card"><div class="eyebrow">Your rating over your career</div>${lineChart(pts.map(x => ({ y: x[1], lbl: String(x[0]), tip: `${x[0]}: ${x[1]} OVR` })), { min: lo, max: hi, yTicks: [lo, Math.round((lo + hi) / 2), hi], title: 'Rating by season', dots: true })}</section>`;
}

/* ---------- spreadsheets (CSV) ---------- */
function csvOf(rows) { return rows.map(r => r.map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n'); }
function csvRows(kind) {
  if (kind === 'lghist') { const H = lgHistOf(); const r = [['League', 'Season', 'Champion', 'Runner-up', 'Score', 'Top player', 'Coach of the year']]; H.col.forEach(e => r.push(['College', e.s, lhColName(e.champ), e.runner ? lhColName(e.runner) : '', e.score || '', e.heis ? e.heis.n : '', e.coy ? e.coy.n : ''])); H.nfl.forEach(e => r.push(['NFL', e.s, lhNflName(e.champ), e.runner ? lhNflName(e.runner) : '', e.score || '', e.mvp ? e.mvp.n : '', e.coy ? e.coy.n : ''])); return r; }
  if (kind === 'records') { const B = bookOf(); const r = [['Table', 'Record', 'Mark', 'Held by', 'Season']]; const add = (tb, k, x, l) => { if (x) r.push([tb, l || k, x.v, x.base ? 'Before your time' : x.n, x.s || '']); };
    Object.entries(B.team || {}).forEach(([k, x]) => add('Team', k, x, (TEAM_REC[k] || [k])[0])); Object.entries(B.game || {}).forEach(([k, x]) => add('Game', k, x, (BOOK_KEYS[k] || [k])[0])); Object.entries(B.season || {}).forEach(([k, x]) => add('Season', k, x, (BOOK_KEYS[k] || [k])[0])); return r; }
  if (kind === 'roster') { const r = [['Name', 'Pos', isPro() ? 'Age' : 'Class', 'OVR', 'Potential', 'Games', 'Season stats']]; state.roster.forEach(p => r.push([p.n, p.pos, isPro() ? p.age : clsLabel(p), p.ovr, p.pot, p.gp, statLine(p, p.st || {})])); return r; }
  if (kind === 'cstats') { const cols = cStatCols(cs.p); const r = [['Season', 'Level', 'Team', 'GP', 'GS'].concat(cols.map(k => STAT_LBL[k] || k)).concat(['OVR'])]; cs.p.seasons.forEach(s => r.push([s.year, s.lvl, s.lvl === 'col' ? cTeamName(s.team) : s.lvl === 'nfl' ? nflName(s.team) : s.team, s.gp, s.gs].concat(cols.map(k => s.st[k] || 0)).concat([s.ovr]))); return r; }
  return [];
}
async function csvSave(kind, btn) {
  const rows = csvRows(kind); if (rows.length < 2) return; const name = 'football-empire-' + kind + '.csv'; const data = csvOf(rows); const say = t => { if (btn) { btn.textContent = t; setTimeout(() => { if (btn.isConnected) btn.textContent = 'Download as a spreadsheet'; }, 2500); } };
  const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) { try { await dl.save({ filename: name, data }); say('Saved'); } catch (e) { say(e && e.code === 'declined' ? 'Not saved' : 'Saving is not available here'); } return; }
  try { const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); say('Downloading'); } catch (e) { say('Downloads are blocked here'); }
}
const csvBtn = kind => `<button class="btn ghost sm" data-act="csvexp" data-v="${kind}">Download as a spreadsheet</button>`;

/* ---------- sortable tables, remembered per table ---------- */
function cellVal(td) { const t = (td ? td.textContent : '').trim(); const n = parseFloat(t.replace(/[$,%M]/g, '').replace(/^No\. /, '')); return t !== '' && /^[-$\d.,%M No]+/.test(t) && !isNaN(n) ? n : t.toLowerCase(); }
function sortTable(tbl, col, dir) {
  const tb = tbl.tBodies[0]; if (!tb) return; const rows = [...tb.rows]; if (rows.some(r => r.cells.length < col + 1)) return;
  rows.sort((a, b) => { const x = cellVal(a.cells[col]), y = cellVal(b.cells[col]); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir; });
  rows.forEach(r => tb.appendChild(r)); [...tbl.tHead.rows[0].cells].forEach((th, i) => { th.dataset.sorted = i === col ? (dir > 0 ? 'asc' : 'desc') : ''; th.setAttribute('aria-sort', i === col ? (dir > 0 ? 'ascending' : 'descending') : 'none'); });
}
function applySorts() { const S = lsJSON('fe-sorts'); document.querySelectorAll('#view table.sortable[data-sk]').forEach(t => { const s = S[t.dataset.sk]; if (s) sortTable(t, s[0], s[1]); const f = lsJSON('fe-filters')[t.dataset.sk]; const inp = document.querySelector(`#view input[data-filt="${t.dataset.sk}"]`); if (inp && f && inp.value !== f) inp.value = f; if (f) filterTable(t, f); }); }
function filterTable(tbl, q) { q = String(q || '').toLowerCase().trim(); [...(tbl.tBodies[0] || { rows: [] }).rows].forEach(r => { r.hidden = !!q && !r.textContent.toLowerCase().includes(q); }); }
const filterBox = (sk, label) => `<input class="tfilter" type="search" data-filt="${sk}" placeholder="${esc(label || 'Filter this table')}" aria-label="${esc(label || 'Filter this table')}">`;
document.addEventListener('click', e => {
  const th = e.target.closest && e.target.closest('#view table.sortable[data-sk] thead th'); if (!th || e.target.closest('button, a, input, select')) return;
  const tbl = th.closest('table'); const col = [...th.parentNode.cells].indexOf(th); const S = lsJSON('fe-sorts'); const cur = S[tbl.dataset.sk]; const dir = cur && cur[0] === col ? -cur[1] : (th.classList.contains('num') || /^\d/.test((tbl.tBodies[0] && tbl.tBodies[0].rows[0] && tbl.tBodies[0].rows[0].cells[col] || {}).textContent || '') ? -1 : 1);
  S[tbl.dataset.sk] = [col, dir]; lsPut('fe-sorts', S); sortTable(tbl, col, dir);
});
document.addEventListener('input', e => { const k = e.target && e.target.dataset && e.target.dataset.filt; if (!k) return; const F = lsJSON('fe-filters'); F[k] = e.target.value; lsPut('fe-filters', F); const t = document.querySelector(`#view table.sortable[data-sk="${k}"]`); if (t) filterTable(t, e.target.value); });
function qolAfterRender() { try { applySorts(); } catch (e) { } try { if (typeof tutAfterRender === 'function') tutAfterRender(); } catch (e) { console.error(e); } }

Object.assign(actions, {
  inbox() { openModal(inboxHTML(), 'Inbox'); },
  inboxgo(d) { hideModal(); if (d.c === '1') { cui.tab = d.tab; render(); } else { ui.tab = d.tab; render(); } window.scrollTo(0, 0); },
  search() { if (appMode !== 'ad') return; openModal(`<div class="eyebrow">Search</div><h2 class="h2">Find a player, team or coach</h2><input id="srchq" class="srch" type="search" placeholder="Type a name" autocomplete="off" aria-label="Search"><ul class="plainlist srchres" id="srchres">${searchListHTML('')}</ul>`, 'Search'); setTimeout(() => { const i = document.getElementById('srchq'); if (i) i.focus(); }, 30); },
  csvexp(d) { csvSave(d.v, document.querySelector(`[data-act=csvexp][data-v="${d.v}"]`)); },
  simdec() { let first = true; simUntil(() => { if (first) { first = false; return false; } return decisionNow(); }); after(state.phase === 'offseason' ? 'The season is over.' : state.event ? 'Stopped: a decision is waiting.' : 'Stopped before a big game.'); },
});

