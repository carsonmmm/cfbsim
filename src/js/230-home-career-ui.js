/* ===================== HOME SCREEN and PLAYER CAREER interface ===================== */
// appMode decides what the page shows: the home screen, AD mode (ui.js) or Player Career (here).
let appMode = 'home';
const cui = { tab: 'home', lastTab: null, flash: '', recF: 'offers', recSort: 'prestige', lgV: 'top25', lgConf: null, confirm: null, form: null, gTimer: null, lastRec: null, admT: null, busy: false };
const CTABS = [['home', 'Home'], ['player', 'Player'], ['schedule', 'Schedule'], ['stats', 'Stats'], ['records', 'Records'], ['recruit', 'Recruiting'], ['nil', 'NIL'], ['team', 'Team'], ['league', 'College football'], ['settings', 'Settings'], ['saves', 'Save slots'], ['admin', 'Admin']];
const CTAB_GROUPS = [['My career', ['home', 'player', 'stats', 'records', 'schedule']], ['Recruiting', ['recruit', 'nil']], ['Football', ['team', 'league']], ['Game', ['settings', 'saves', 'admin']]];
const CMNAV = [['home', 'Home', 'home'], ['schedule', 'Schedule', 'cal'], ['player', 'Player', 'star'], ['recruit', 'Recruiting', 'users']];
const ctabLabel = k => { if (k === 'recruit' && cs && (cs.portal || offStep() === 'portal')) return 'Transfer portal'; if (cs && cs.nfl && k === 'nil') return 'Money'; if (cs && cs.nfl && k === 'league') return 'NFL'; return (CTABS.find(t => t[0] === k) || [k, k])[1]; };
const cGroupLabel = g => (cs && cs.nfl && g === 'Recruiting' ? 'Business' : g);
const PACES = { every: ['Play every game', 'You make the calls on your key snaps in every game.'], spotlight: ['Key games only', 'Sim the early years and the easy games. Play the big ones: the toughest opponents, ranked teams and the postseason.'], sim: ['Sim ahead', 'Sim as many games as you like. You can still play any game from the sim menu.'] };

/* ---------- small pieces ---------- */
function starsHTML(n, big) { n = Math.max(0, Math.min(5, Math.round(n || 0))); return `<span class="stars${big ? ' big' : ''}" role="img" aria-label="${n} star${n === 1 ? '' : 's'}">${'★'.repeat(n)}<span class="dimstar">${'★'.repeat(5 - n)}</span></span>`; }
function ovrHTML(v) { return `<span class="ovr ${v >= 85 ? 'o-elite' : v >= 75 ? 'o-good' : v >= 62 ? 'o-avg' : 'o-low'}">${v}</span>`; }
function cChip(tid, o) {
  o = o || {}; if (!tid) return 'TBD';
  if (tid.startsWith('HS:') || tid.startsWith('FCS:') || !cs.league.teams[tid]) return `<span class="team"><span class="tn">${esc(cTeamName(tid))}</span>${tid.startsWith('FCS:') ? ' <span class="rec">FCS</span>' : ''}</span>`;
  const t = cs.league.teams[tid]; const me = cs.col && cs.col.tid === tid;
  return `<span class="team">${t.ap && !o.norank ? `<span class="rk">${t.ap}</span> ` : ''}<span class="tn${me ? ' me' : ''}">${esc(o.short ? tid : t.name)}</span>${o.rec === false ? '' : ` <span class="rec">${t.w}-${t.l}</span>`}</span>`;
}
function cWeekLabel(wk, lvl) {
  lvl = lvl || cs.lvl;
  if (lvl === 'nfl') return nflWeekLabel(wk);
  if (lvl === 'hs') { if (wk <= 10) return 'Week ' + wk; const g = cs.hs && cs.hs.sched.find(x => x.wk === wk); return g && g.name ? g.name : 'Playoffs'; }
  return wk <= 13 ? 'Week ' + wk : ({ 14: 'Championship week', 15: 'CFP first round', 16: 'Bowls and quarterfinals', 17: 'CFP semifinals', 18: 'National championship' })[wk] || 'Postseason';
}
// "week 3", "the CFP first round", "the national championship": for use mid-sentence
function weekPhrase(wk) { const l = cWeekLabel(wk); if (/^Week /.test(l)) return l.toLowerCase(); return 'the ' + (/^CFP/.test(l) ? l : l[0].toLowerCase() + l.slice(1)); }
function clsText() { if (!cs) return ''; if (cs.nfl) return cs.phase === 'retired' ? 'Retired' : nflYearLabel() + ' · age ' + cs.nfl.age; if (cs.lvl === 'hs' && cs.hs) return 'HS ' + HS_CLS[Math.min(3, cs.hs.cls + (cs.phase === 'hsoff' && cs.hs.cls < 3 ? 1 : 0))].toLowerCase() + (cs.phase === 'hsoff' && cs.hs.cls < 3 ? ' next' : ''); if (cs.col) return colCls(); return 'Incoming freshman'; }
function teamText() { if (cs.nfl) return cs.phase === 'retired' ? 'Retired' : nflName(cs.nfl.tm); if (cs.lvl === 'hs' && cs.hs) return cs.hs.name + ' ' + cs.hs.mascot; if (cs.col) return cTeamName(cs.col.tid); return 'Uncommitted'; }
function recordText() { if (cs.nfl && cs.nfl.L && cs.phase === 'nfl') { const t = cs.nfl.L.teams[cs.nfl.tm]; return t.w + '-' + t.l; } if (cs.nfl) { const h = cs.nfl.hist[cs.nfl.hist.length - 1]; return h ? h.w + '-' + h.l : '—'; } if (cs.phase === 'hs' || (cs.lvl === 'hs' && cs.hs)) return cs.hs.w + '-' + cs.hs.l; if (cs.col && cs.league.teams[cs.col.tid]) { const t = LT(cs.col.tid); return t.w + '-' + t.l; } return '—'; }
function gradeHTML(gr, sm) { if (!gr) return '<span class="muted">—</span>'; const c = gr[0] === 'A' ? 'good' : gr === 'B' ? 'maize' : gr === 'C' ? '' : 'bad'; return `<span class="grade ${c}${sm ? ' sm' : ''}">${gr}</span>`; }
function statLineHTML(st, pos) { const cols = cs && cs.p && pos === cs.p.pos ? cStatCols(cs.p) : STAT_COLS[pos]; return cols.map(k => `<span><b>${st[k] || 0}</b> ${STAT_LBL[k]}</span>`).join(''); }
function gameLocked() { return !!(cg && !cg.done); }
const CLOCKED = new Set(['cnfl', 'cnflskip', 'cretire', 'cfa', 'cfawait', 'ctrade', 'cext', 'cprimary', 'cplay', 'csim', 'csimto', 'coffnext', 'csign', 'cportal', 'cstay', 'cpwait', 'cpcommit', 'cdraft', 'ccamp', 'cload', 'cstart', 'cdel', 'gohome', 'ctrain', 'crs', 'cevent']);

/* ---------- render ---------- */
// Replacing the page can blur a focused field, and its change event can ask for another render
// in the middle of this one. That request waits until the current render has finished.
const renderLock = { busy: false, again: false };
function render() {
  if (renderLock.busy) { renderLock.again = true; return; }
  renderLock.busy = true;
  try {
    document.documentElement.dataset.app = appMode; document.documentElement.dataset.comm = appMode === 'ad' && typeof state !== 'undefined' && state && isComm() ? '1' : '';
    if (appMode === 'home') renderHome(); else if (appMode === 'career') renderCareer(); else { renderAD(); rememberFilters(); }
  } finally { renderLock.busy = false; }
  if (renderLock.again) { renderLock.again = false; render(); return; }
  qolAfterRender();
}
function renderHome() {
  const el = document.getElementById('customTheme'); if (el) el.textContent = '';
  $('#hdr').innerHTML = `<div class="brand"><div class="wm" data-badge="FE"><span class="wmu">FOOTBALL EMPIRE</span><span class="wmn">Football Empire</span><span class="wmt">Football Empire</span></div><div class="sub">Pick how you want to play</div></div><div class="acts">${toolsHTML('home')}</div>`;
  $('#tabs').innerHTML = ''; const mn = $('#mnav'); if (mn) mn.innerHTML = ''; const tk = $('#ticker'); if (tk) tk.innerHTML = '';
  // The AD save slots hold four kinds of career. Each home card shows the one of its kind that was saved last.
  const am = slotsMetaOf('ad'); const adOf = f => [1, 2, 3, 4, 5].filter(i => am[i] && lsGet('mfad-slot-' + i) && f(am[i])).sort((x, y) => (am[y].saved || 0) - (am[x].saved || 0))[0] || null;
  const aSlot = adOf(m => !m.comm && !m.own && m.lvl !== 'nfl'), a = aSlot ? am[aSlot] : null; const gSlot = adOf(m => !m.comm && !m.own && m.lvl === 'nfl'), g = gSlot ? am[gSlot] : null;
  const kSlot = adOf(m => m.comm), wSlot = adOf(m => m.own); const nAD = [1, 2, 3, 4, 5].filter(i => lsGet('mfad-slot-' + i)).length;
  const om = slotsMetaOf('coach'); const oSlot = +lsGet('fecoach-active') || 1; const o = om[oSlot]; const nO = Object.keys(om).filter(i => lsGet('fecoach-slot-' + i)).length;
  const cm = cMeta(); const cSlot = +lsGet(CACTIVE_KEY) || 1; const c = cm[cSlot];
  const nC = Object.keys(cm).filter(i => lsGet(CSLOT_KEY(i))).length;
  // the career saved last, in any mode, leads the page
  const recent = [a && { t: a.saved, k: 'Athletic Director', n: a.name, d: `${a.season} · ${a.phase === 'offseason' ? 'offseason' : a.rec}`, act: 'homeopen', slot: aSlot },
    g && { t: g.saved, k: 'NFL General Manager', n: g.name, d: `${g.season} · ${g.phase === 'offseason' ? 'offseason' : g.rec}`, act: 'homeopen', slot: gSlot },
    kSlot && { t: am[kSlot].saved, k: 'Commissioner', n: am[kSlot].comm === 'nfl' ? 'The NFL' : 'College football', d: String(am[kSlot].season || ''), act: 'homeopen', slot: kSlot },
    wSlot && { t: am[wSlot].saved, k: 'Owner', n: am[wSlot].name, d: `${am[wSlot].season} · ${am[wSlot].phase === 'offseason' ? 'offseason' : am[wSlot].rec}`, act: 'homeopen', slot: wSlot },
    o && lsGet('fecoach-slot-' + oSlot) && { t: o.saved, k: 'Coach', n: o.coach ? o.coach.name : o.name, d: `${o.coach ? roleTitle(o.coach.role) + ', ' : ''}${o.name} · ${o.season}`, act: 'gocoach' },
    c && lsGet(CSLOT_KEY(cSlot)) && !c.done && { t: c.saved, k: 'Player Career', n: c.name, d: `${c.pos}${c.team ? ' · ' + c.team : ''}`, act: 'gocareer' }].filter(Boolean).sort((x, y) => (y.t || 0) - (x.t || 0))[0];
  const fresh = !nAD && !nO && !nC;
  const lead = recent ? `<section class="card next homecont"><div><div class="eyebrow">Pick up where you left off · ${esc(recent.k)}</div><h2 class="h2">${esc(recent.n)}</h2><p class="muted">${esc(recent.d)}</p></div><button class="btn primary" data-act="${recent.act}"${recent.slot ? ` data-slot="${recent.slot}"` : ''}>Continue</button></section>`
    : fresh ? `<section class="card homepick"><div class="eyebrow">New here? Start with one of these</div><div class="homepicks"><button class="evopt" data-act="homenew" data-v="col"><b>I want to build a program</b><span>Athletic Director: hire the coach, recruit, run the budget. The best place to start.</span></button><button class="evopt" data-act="gocoach" data-v="new"><b>I want to call the plays</b><span>Coach: game plans, play calling and a career ladder to climb.</span></button><button class="evopt" data-act="gocareer" data-v="new"><b>I want to be the star</b><span>Player Career: one player, from high school to the NFL.</span></button></div></section>` : '';
  if (cui.coSetup) { $('#view').innerHTML = coachSetupHTML(null); cui.flash = ''; document.title = 'Football Empire'; setInert(!$('#modal').hidden); return; }
  if (cui.ownSetup) { $('#view').innerHTML = ownSetupHTML(); cui.flash = ''; document.title = 'Football Empire'; setInert(!$('#modal').hidden); return; }
  if (cui.adPick) { $('#view').innerHTML = adPickHTML(); cui.flash = ''; document.title = 'Football Empire'; setInert(!$('#modal').hidden); return; }
  $('#view').innerHTML = (cui.flash ? `<div class="flash toast">${esc(cui.flash)}</div>` : '') + `<section class="homehero"><div class="eyebrow">Football Empire</div><h1 class="h2">Six ways to play</h1><p class="muted">Run a college program, coach on the sideline, play a career from high school to the NFL, build an NFL roster as general manager, run a whole league as commissioner, or buy a club and own it.</p></section>
  ${lead}<div class="modes">
   <article class="mode"><div class="mglyph" aria-hidden="true">${IC.grid}</div><div class="eyebrow">College</div><h2 class="h2">Athletic Director</h2><p>Pick any of the 138 FBS schools, or create your own. Hire and fire coaches, set the budget, recruit and build a dynasty. Good ADs hear from the NFL.</p>
    <div class="msave">${a ? `<b>${esc(a.name)}</b> · ${a.season} · ${a.phase === 'offseason' ? 'offseason' : esc(a.rec)} <span class="muted">· slot ${aSlot}</span>` : '<span class="muted">No AD career yet. Pick your school to start in 2026.</span>'}<div class="small muted">${nAD} of 5 save slots used</div></div>
    <div class="row gap">${a ? `<button class="btn primary" data-act="homeopen" data-slot="${aSlot}">Continue as AD</button>` : '<button class="btn primary" data-act="homenew" data-v="col">Pick your school</button>'}</div></article>
   <article class="mode"><div class="mglyph" aria-hidden="true">${IC.users}</div><div class="eyebrow">College and NFL</div><h2 class="h2">Coach</h2><p>Take any job, or start as a position coach and climb. Call plays on game day, recruit on the road, work the coaching carousel and negotiate your own contracts. The AD handles the money; you can ask.</p>
    <div class="msave">${o && lsGet('fecoach-slot-' + oSlot) ? `<b>${esc(o.coach ? o.coach.name : o.name)}</b> · ${esc(o.coach ? roleTitle(o.coach.role) : '')}, ${esc(o.name)} · ${o.season} <span class="muted">· slot ${oSlot}</span>` : '<span class="muted">No coaching career yet.</span>'}<div class="small muted">${nO} of 5 save slots used</div></div>
    <div class="row gap">${nO ? '<button class="btn primary" data-act="gocoach">Continue coaching</button>' : '<button class="btn primary" data-act="gocoach" data-v="new">Create a coach</button>'}</div></article>
   <article class="mode"><div class="mglyph" aria-hidden="true">${IC.star}</div><div class="eyebrow">High school to the NFL</div><h2 class="h2">Player Career</h2><p>Pick a position, play your high school seasons, earn your stars, choose from scholarship and NIL offers, hit the transfer portal, get drafted, and play out an NFL career.</p>
    <div class="msave">${c && lsGet(CSLOT_KEY(cSlot)) ? `<b>${esc(c.name)}</b> · ${esc(c.pos)} · ${esc(c.done ? 'career complete' : c.team || '')} ${c.stars ? starsHTML(c.stars) : ''} <span class="muted">· slot ${cSlot}</span>` : '<span class="muted">No player career yet.</span>'}<div class="small muted">${nC} of 5 save slots used</div></div>
    <div class="row gap">${c && lsGet(CSLOT_KEY(cSlot)) ? '<button class="btn primary" data-act="gocareer">Continue career</button><button class="btn ghost" data-act="gocareer" data-v="saves">Career save slots</button>' : '<button class="btn primary" data-act="gocareer" data-v="new">Create a player</button>'}</div></article>
   <article class="mode"><div class="mglyph" aria-hidden="true">${IC.grid}</div><div class="eyebrow">NFL</div><h2 class="h2">General Manager</h2><p>Run an NFL front office: the draft, the salary cap, free agency, trades and the head coach. Start with a real roster, or throw every player into one pool and draft all 32 clubs from scratch.</p>
    <div class="msave">${g ? `<b>${esc(g.name)}</b> · ${g.season} · ${g.phase === 'offseason' ? 'offseason' : esc(g.rec)} <span class="muted">· slot ${gSlot}</span>` : '<span class="muted">No GM career yet.</span>'}<div class="small muted">Shares the five AD save slots</div></div>
    <div class="row gap">${g ? `<button class="btn primary" data-act="homeopen" data-slot="${gSlot}">Continue as GM</button><button class="btn ghost" data-act="homenew" data-v="nfl">New GM</button>` : '<button class="btn primary" data-act="homenew" data-v="nfl">Pick your club</button>'}</div></article>
   <article class="mode"><div class="mglyph" aria-hidden="true">${IC.gavel}</div><div class="eyebrow">College or NFL</div><h2 class="h2">Commissioner</h2><p>Run all of college football or the NFL, never a team. Rule on suspensions and appeals, handle scandals and the press, set the salary cap and the TV deals, steer the rules committee, and survive the vote at the end of your term.</p>
    <div class="msave">${Object.values(slotsMetaOf('ad')).some(m => m && m.comm) ? '<b>Commissioner career saved</b> <span class="muted">· in your AD save slots</span>' : '<span class="muted">Uses one of your five AD save slots.</span>'}</div>
    <div class="row gap"><label class="fld inl"><span>League</span><select id="comm-lvl"><option value="col">College football</option><option value="nfl">The NFL</option></select></label><button class="btn primary" data-act="gocomm">${Object.values(slotsMetaOf('ad')).some(m => m && m.comm) ? 'Continue as commissioner' : 'Start as commissioner'}</button></div></article>
   ${ownHomeCardHTML()}
  </div>${patchHomeHTML()}${shareHomeHTML()}`;
  cui.flash = '';
  document.title = 'Football Empire';
  setInert(!$('#modal').hidden); shareKick(); if (share && share.ok) shareLoad();
}
// First AD career on this device: choose the school before anything is created.
function adPickHTML() {
  const f = ui.nc; if (!CTEAMS0_AD[f.tid]) f.tid = 'MICH';
  const gm = f.lvl === 'nfl';
  return `<section class="card newcareer"><div class="head"><div><div class="eyebrow">Athletic Director · new career</div><h1 class="h2">${gm ? 'Pick your NFL club' : 'Pick your school'}</h1></div><p class="hint">${gm ? 'Run an NFL front office as general manager: the draft, the salary cap, free agency, trades and the head coach. Good GMs hear from big college programs, and good ADs hear from the NFL.' : 'Every FBS program, in its 2026 conference. You can start more careers, or a custom program, from the Save file tab later.'}</p></div>
   <div>${seg('adpicklvl', gm ? 'nfl' : 'col', [['col', 'College athletic director'], ['nfl', 'NFL general manager']])}</div>
   ${gm ? nflPickerHTML(f) : schoolPickerHTML(f)}
   ${gm ? `<div class="eyebrow mt">Rosters</div><div>${seg('ncfd', f.fd ? '1' : '0', [['0', 'Start with the current rosters'], ['1', 'Fantasy draft: all 32 clubs draft from one pool']])}</div>` : ''}
   <div class="eyebrow mt">Ironman</div><div>${seg('nciron', f.iron ? '1' : '0', [['0', 'Off'], ['1', 'On: no undo, no admin tools, difficulty locked']])}</div>
   <div class="eyebrow mt">Difficulty</div><div class="diffs">${Object.entries(DIFF).map(([k, d]) => `<button class="evopt${ui.newDiff === k ? ' on' : ''}" data-act="adpickdiff" data-v="${k}"><b>${d.label}</b><span>${esc(d.desc)}</span></button>`).join('')}</div>
   <div class="row gap mt"><button class="btn primary" data-act="adpickstart">${gm ? `Become GM of the ${esc(nflName(NFL_BY[f.nfl] ? f.nfl : 'DET'))}` : `Become athletic director at ${esc(CTEAMS0_AD[f.tid].name)}`}</button><button class="btn ghost" data-act="adpickcancel">Back</button></div></section>`;
}
// the page for a career tab (extras pages first)
function cViewFor(k) { const V = { home: vCHome, player: vCPlayer, schedule: vCSchedule, stats: vCStats, records: vCRecords, recruit: vCRecruit, nil: vCNil, team: vCTeam, league: vCLeague, settings: vCSettings, saves: vCSaves, admin: vCAdmin }; return (typeof xCView === 'function' && xCView(k)) || V[k] || vCHome; }
function renderCareer() {
  const el = document.getElementById('customTheme'); if (el) el.textContent = '';
  if (!cs) cui.tab = 'saves';
  $('#hdr').innerHTML = cs ? cHeader() : `<div class="brand"><div class="wm" data-badge="PC"><span class="wmu">PLAYER CAREER</span><span class="wmn">Player Career</span><span class="wmt">Player Career</span></div><div class="sub">Create a player to begin</div></div><div class="acts">${toolsHTML('career')}</div>`;
  renderCTabs();
  const f = cs ? cViewFor(cui.tab) : vCSaves;
  if (cui.xFixed) { cui.flash = (cui.flash ? cui.flash + ' ' : '') + `Some optional data in this save was damaged and was reset: ${cui.xFixed.join(', ')}. Everything else loaded normally.`; cui.xFixed = null; }
  const entering = cui.lastTab !== cui.tab; cui.lastTab = cui.tab;
  let html; try { html = f(); } catch (e) { console.error(e); html = viewFailHTML(e, 'c'); }
  const failBanner = cSaveFailed() ? `<div class="flash bad" role="alert">This career isn't being saved: browser storage is full or blocked. <button class="lnk" data-act="cretry">Try again</button> · <button class="lnk" data-act="ctab" data-tab="saves">Create a save code</button></div>` : '';
  const keepY = window.scrollY; const sameTab = !entering;
  $('#view').innerHTML = failBanner + (cui.flash ? `<div class="flash toast">${esc(cui.flash)}</div>` : '') + html;
  if (sameTab && Math.abs(window.scrollY - keepY) > 1) window.scrollTo(0, keepY);
  if (cui.flash) announce(cui.flash); cui.flash = '';
  if (entering) { const vw = $('#view'); vw.classList.remove('enter'); void vw.offsetWidth; vw.classList.add('enter'); clearTimeout(cui.enterT); cui.enterT = setTimeout(() => vw.classList.remove('enter'), 1000); }
  renderCTicker();
  document.title = cs ? cName(cs.p) + ' · Player Career' : 'Player Career';
  $('#over').hidden = true;
  setInert(!$('#modal').hidden);
}
function renderCTicker() { const t = $('#ticker'); if (!t) return; if (prefs.skin !== 'broadcast' || !cs) { t.innerHTML = ''; return; } const items = cs.news.slice(0, 8).map(n => `<span>${esc(n.txt)}</span>`).join('<i>///</i>'); t.innerHTML = `<div class="tag">${cs.lvl === 'hs' ? 'Recruiting wire' : 'Player wire'}</div><div class="tk"><div class="run">${items}<i>///</i>${items}<i>///</i></div></div>`; }
function ctabVisible(k) { if (!cs) return k === 'saves' || k === 'settings'; if (k === 'recruit') return cs.lvl === 'hs' || cs.phase === 'sign' || !!cs.portal || offStep() === 'portal' || (cs.rec && !cs.col); return true; }
function renderCTabs() {
  const t = $('#tabs'); const btn = (k, cls) => { const on = cui.tab === k; const hot = k === 'recruit' && cs && (cs.phase === 'sign' || offStep() === 'signing' || offStep() === 'portal'); return `<button class="${cls}${on ? ' on' : ''}${hot ? ' hot' : ''}${k === 'admin' ? ' adm' : ''}" data-act="ctab" data-tab="${k}"${on ? ' aria-current="page"' : ''}>${esc(ctabLabel(k))}</button>`; };
  if (prefs.nav === 'side') t.innerHTML = `<div class="sbhead"><span class="sbw">${esc(cs ? cName(cs.p) : 'Player Career')}</span><button class="tbtn" data-act="toggleside" aria-label="Hide the sidebar">${IC.collapse}</button></div>` + CTAB_GROUPS.map(([g, ks]) => { const vis = ks.filter(ctabVisible); return vis.length ? `<div class="sbgrp">${cGroupLabel(g)}</div>` + vis.map(k => btn(k, 'tab')).join('') : ''; }).join('');
  else t.innerHTML = CTABS.filter(([k]) => ctabVisible(k)).map(([k]) => btn(k, 'tab')).join('');
  t.setAttribute('aria-label', 'Sections'); tabFade(true);
  const m = $('#mnav'); if (!m) return;
  const bar = CMNAV.filter(([k]) => ctabVisible(k) || k !== 'recruit').map(x => x[0] === 'recruit' && !ctabVisible('recruit') ? ['team', 'Team', 'users'] : x);
  const inBar = bar.some(x => x[0] === cui.tab);
  m.innerHTML = bar.map(([k, l, ic]) => `<button class="${cui.tab === k ? 'on' : ''}" data-act="ctab" data-tab="${k}"${cui.tab === k ? ' aria-current="page"' : ''}>${IC[ic]}<span>${esc(k === 'recruit' ? ctabLabel(k).replace('Transfer portal', 'Portal') : l)}</span></button>`).join('') + `<button class="${inBar ? '' : 'on'}" data-act="cmore" aria-haspopup="dialog">${IC.grid}<span>${inBar ? 'More' : esc(ctabLabel(cui.tab))}</span></button>`;
}
function cMoreView() { return `<div class="eyebrow">Go to</div><h2 class="h2">All sections</h2>${CTAB_GROUPS.map(([g, ks]) => { const vis = ks.filter(ctabVisible); return vis.length ? `<div class="eyebrow mt">${cGroupLabel(g)}</div><div class="moregrid">${vis.map(k => `<button class="morebtn${cui.tab === k ? ' on' : ''}" data-act="ctab" data-tab="${k}">${esc(ctabLabel(k))}</button>`).join('')}</div>` : ''; }).join('')}<div class="eyebrow mt">Switch mode</div><div class="moregrid"><button class="morebtn" data-act="gohome">Home screen</button></div>`; }

/* ---------- header and the primary button ---------- */
function cPrimary() {
  if (gameLocked()) return { label: 'Resume the game · ' + cgScore(cg), act: 'cresume' };
  if (cs.phase === 'done') return { label: 'Your NFL decision', act: 'ctab', tab: 'home' };
  if (cs.phase === 'retired') return { label: 'Career summary', act: 'ctab', tab: 'home' };
  if (cs.phase === 'sign') return { label: 'Choose your school', act: 'ctab', tab: 'recruit' };
  if (cs.event) return { label: 'Answer the decision first', act: 'ctab', tab: 'home' };
  if (cs.phase === 'hsoff' || cs.phase === 'coloff' || cs.phase === 'nfloff') {
    const s = offStep(); const bl = offBlocked(); const nx = cs.off.steps[cs.off.i + 1];
    if (s === 'signing') return { label: 'Signing day: choose your school', act: 'ctab', tab: 'recruit' };
    if (bl) return { label: OFF_LABEL[s] + ': ' + bl.replace(/ first\.$/, '').replace(/\.$/, ''), act: 'ctab', tab: 'home' };
    return { label: nx ? 'Continue: ' + OFF_LABEL[nx] : (cs.lvl === 'hs' ? `Start your ${HS_CLS[Math.min(3, cs.hs.cls + 1)].toLowerCase()} season` : `Start the ${cs.year} season`), act: 'coffnext' };
  }
  const sp = myGameSpec(); const opp = sp ? (sp.lvl === 'hs' ? sp.oppTid.slice(3) : sp.lvl === 'nfl' ? nflName(sp.oppTid) : cTeamName(sp.oppTid)) : '';
  if (!sp) return { label: cs.phase === 'nfl' && cs.week > 18 ? `Sim ${weekPhrase(cs.week)} (first-round bye)` : `Sim ${weekPhrase(cs.week)} (no game for you)`, act: 'csim' };
  const vs = (sp.home || sp.neutral ? 'vs. ' : 'at ') + opp;
  if (cs.pace === 'every') return { label: `Play ${cWeekLabel(cs.week)}: ${vs}`, act: 'cplay' };
  if (cs.pace === 'spotlight') {
    if (cs.lvl === 'hs' && cs.hs.cls < 3) return { label: 'Sim to your senior season (camps, visits and points picked for you)', act: 'csimto', v: 'senior' };
    if (sp.big) return { label: `Play the big one: ${vs}`, act: 'cplay' };
    return { label: 'Sim to the next big game', act: 'csimto', v: 'spot' };
  }
  return { label: `Sim ${/^Week /.test(cWeekLabel(cs.week)) ? cWeekLabel(cs.week) : weekPhrase(cs.week)}: ${vs}`, act: 'csim' };
}
function cgScore(g) { return `${g.ids[1]} ${g.pts[1]}, ${g.ids[0]} ${g.pts[0]}`; }
function cHeader() {
  const p = cs.p; const nm = cName(p); const pr = cPrimary(); const inSeason = cInSeason() && !gameLocked();
  const nil = cs.col ? cs.col.nil : 0; const offers = cs.rec ? Object.values(cs.rec.schools).filter(s => s.off).length : 0;
  const lastCell = cs.nfl ? `<div class="cell"><span class="k">Contract</span><span class="v">${money(cs.nfl.contract.apy)}</span><span class="s">per year · ${cs.nfl.contract.left} left</span></div>` : cs.lvl === 'hs' || cs.phase === 'sign' ? `<div class="cell"><span class="k">Offers</span><span class="v">${offers}</span>${cs.rec && cs.rec.committed ? `<span class="s">Committed: ${esc(cTeamName(cs.rec.committed))}</span>` : ''}</div>` : `<div class="cell"><span class="k">NIL deal</span><span class="v">${nil ? money(nil) : '—'}</span><span class="s">per year</span></div>`;
  const menu = inSeason && !cs.event ? `<details class="simmenu"><summary>More sim options</summary><div class="menu">
    ${myGameSpec() && cs.pace !== 'every' ? '<button data-act="cplay">Play this game</button>' : ''}${myGameSpec() && cs.pace === 'every' ? '<button data-act="csim">Sim this game</button>' : ''}
    <button data-act="csimto" data-v="dec">Sim to the next decision</button><button data-act="csimto" data-v="spot">Sim to the next big game</button><button data-act="csimto" data-v="n5">Sim the next 5 weeks</button><button data-act="csimto" data-v="season">Sim to the end of the season</button>
    ${cs.lvl === 'hs' && cs.hs.cls < 3 ? '<button data-act="csimto" data-v="senior">Sim to your senior season</button>' : ''}${cs.lvl === 'hs' ? '<button data-act="csimto" data-v="signing">Sim to signing day</button>' : ''}
  </div></details>` : '';
  return `<div class="brand"><div class="wm${nm.length > 15 ? ' long' : ''}" data-badge="${esc(p.pos)}"><span class="wmu">${esc(nm.toUpperCase())}</span><span class="wmn">${esc(nm)}</span><span class="wmt">${esc(nm)}</span></div><div class="sub">#${p.num} · ${esc(CPOS_NAME[p.pos])} · ${esc(teamText())} · Slot ${cslot}</div></div>
  <div class="board">
    <div class="cell"><span class="k">Season</span><span class="v">${cs.year}</span></div>
    <div class="cell wide"><span class="k">${cs.phase === 'done' ? 'Career' : cs.nfl ? 'NFL' : 'Class'}</span><span class="v sm">${esc(cs.phase === 'done' ? 'Drafted' : clsText())}</span></div>
    <div class="cell"><span class="k">Rating</span><span class="v">${cOvr(p)}</span><span class="s">${cs.nfl ? esc(CPOS_NAME[p.pos]) : p.stars ? starsHTML(p.stars) : 'Not yet rated'}</span></div>
    ${cs.phase === 'done' || (cs.phase === 'retired' && !cs.nfl) ? `<div class="cell"><span class="k">NFL Draft</span><span class="v">${cs.done.draft.udfa ? 'UDFA' : 'R' + cs.done.draft.round + ' · #' + cs.done.draft.pick}</span><span class="s">${esc(cs.done.draft.team)}</span></div><div class="cell"><span class="k">NIL earned</span><span class="v">${money(cs.p.earned)}</span></div>` : `<div class="cell"><span class="k">Record</span><span class="v">${recordText()}</span>${cs.nfl ? `<span class="s">${esc(nflName(cs.nfl.tm))}</span>` : cs.col && cs.league.teams[cs.col.tid] && LT(cs.col.tid).ap ? `<span class="s">No. ${LT(cs.col.tid).ap}</span>` : ''}</div>
    ${lastCell}`}
  </div>
  <div class="acts">${toolsHTML('career')}<div class="row gap"><button class="btn primary" data-act="${pr.act}"${pr.tab ? ` data-tab="${pr.tab}"` : ''}${pr.v ? ` data-v="${pr.v}"` : ''}>${esc(pr.label)}</button>${menu}</div></div>`;
}

/* ---------- Home (dashboard) ---------- */
function cChangesHTML() {
  let d = null; try { d = cChanges(); } catch (e) { d = null; } if (!d) return '';
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v); const parts = [];
  parts.push(`<li>OVR <b>${d.ovr[0]} → ${d.ovr[1]}</b> (${sg(d.ovr[1] - d.ovr[0])})</li>`);
  if (d.attrs.length) parts.push(`<li>${d.attrs.map(([l, v]) => `${esc(l)} ${sg(v)}`).join(' · ')}</li>`);
  if (d.moved) parts.push(`<li>Coach trust starts over with your new coaches (now ${cs.p.trust})</li>`); else if (d.trust) parts.push(`<li>Coach trust ${sg(d.trust)}</li>`);
  if (d.bank) parts.push(`<li>Bank ${d.bank > 0 ? '+' : '−'}${esc(money(Math.abs(d.bank)))}</li>`);
  if (d.moved) parts.push(`<li>New team: <b>${esc(d.lvl === 'nfl' ? nflName(d.tm) : d.lvl === 'col' ? cTeamName(d.tm) : 'high school')}</b></li>`);
  return `<section class="card"><div class="eyebrow">What changed since the ${d.y} season</div><ul class="plainlist small">${parts.join('')}</ul></section>`;
}
function vCHome() {
  if (cs.phase === 'done') return vCDone();
  if (cs.phase === 'retired') return vCRetired();
  const p = cs.p; let main = '';
  if (cs.event) {
    const e = CEVENTS.find(x => x.id === cs.event.id);
    main += `<section class="card decision"><div class="eyebrow">Decision</div><h2 class="h3">${esc(cs.event.txt)}</h2><div class="evopts">${e ? e.opts.map((o, i) => `<button class="evopt" data-act="cevent" data-i="${i}"><b>${esc(o[0])}</b><span>${esc(o[1])}</span></button>`).join('') : ''}</div></section>`;
  }
  main += cRehabCardHTML();
  if (cs.phase === 'sign') main += signCard();
  else if (cs.phase === 'hsoff' || cs.phase === 'coloff' || cs.phase === 'nfloff') main += vCOff();
  else main += nextGameCard();
  if (cs.chg && (cs.off || cs.week <= 2) && cs.phase !== 'sign') main += cChangesHTML(); /* QOL-10 */
  const last = cs.ss && cs.ss.games.length ? cs.ss.games[cs.ss.games.length - 1] : null;
  const lastC = last ? `<section class="card"><div class="eyebrow">Last game · ${esc(cWeekLabel(last.wk))}</div><div class="final"><span class="res ${last.w ? 'w' : 'l'}">${last.w ? 'W' : 'L'}</span><span class="sc">${last.us}–${last.them}</span><span>${last.home || last.neutral ? 'vs.' : 'at'} ${cs.lvl === 'hs' ? esc(last.opp) : cs.lvl === 'nfl' ? nChip(last.opp) : cChip(last.opp)}</span>${last.grade ? gradeHTML(last.grade, true) : ''}</div>${last.role === 'Not playing' ? `<p class="muted">You didn't play${cs.p.inj ? ' (injured)' : ''}.</p>` : `<div class="sline">${statLineHTML(last.line, p.pos)}</div>`}${last.plays && last.plays.length ? `<ul class="plays small">${last.plays.slice(-3).map(t => `<li><span class="when">Key play</span><span>${esc(t)}</span></li>`).join('')}</ul>` : ''}</section>` : '';
  const news = cs.news.slice(0, 12).map(n => `<li class="${n.kind}"><span class="when">${n.y} · ${n.lvl === 'hs' ? 'HS' : n.lvl === 'nfl' ? 'NFL' : 'College'}</span>${esc(n.txt)}</li>`).join('');
  return `<div class="grid2"><div class="col">${main}${lastC}</div><div class="col">${playerCard()}${cs.lvl === 'hs' || cs.phase === 'sign' ? recruitSnap() : cs.nfl ? nflCard() : trustCard()}<section class="card"><div class="eyebrow">News</div><ul class="news">${news || '<li>Nothing yet.</li>'}</ul></section></div></div>`;
}
function nextGameCard() {
  const sp = myGameSpec(); const p = cs.p; const share = myShare(); const d = myDepth();
  const role = p.inj ? `Out: ${esc(p.injName)} (${p.inj >= 20 ? 'season' : p.inj + ' week' + (p.inj > 1 ? 's' : '')})` : `${roleOf(share)} · No. ${d.rank + 1} ${esc(p.pos)} on the depth chart`;
  if (gameLocked()) return `<section class="card next"><div class="eyebrow">Game in progress</div><h2 class="h3">${esc(cgScore(cg))}</h2><button class="btn primary" data-act="cresume">Resume the game</button><p class="hint">If you leave the site before it is final, it is played to the final when you come back.</p></section>`;
  if (!sp && cs.phase === 'nfl') { const bye = cs.week <= 18; return `<section class="card next"><div class="eyebrow">${esc(cWeekLabel(cs.week))}</div><h2 class="h3">${bye ? 'Bye week' : 'First-round bye'}</h2><p class="muted">${bye ? 'No game this week. You still get practice reps.' : 'Your team earned the top seed and skips the Wild Card round.'}</p><button class="btn primary" data-act="csim" ${cs.event ? 'disabled' : ''}>Sim the week</button></section>`; }
  if (!sp) { const post = cs.phase === 'col' && cs.week >= 14; return `<section class="card next"><div class="eyebrow">${esc(cWeekLabel(cs.week))}</div><h2 class="h3">No game for you this week</h2><p class="muted">${post ? 'Conference title games, bowls and the playoff are being set. If your team is still playing, its next game shows up here.' : 'A bye week. You still get practice reps.'}</p><button class="btn primary" data-act="csim" ${cs.event ? 'disabled' : ''}>Sim the week</button></section>`; }
  const my = sp.home ? 0 : 1; const opp = sp.lvl === 'hs' ? sp.oppTid : sp.oppTid;
  const oppS = sp.base[1 - my], myS = sp.base[my];
  const pWin = clamp(1 / (1 + Math.exp(-(((myS.off - oppS.def) - (oppS.off - myS.def)) / 2 + (sp.home && !sp.neutral ? 2.6 : sp.neutral ? 0 : -2.6)) / 6.2)), 0.03, 0.97);
  const chipMe = sp.lvl === 'hs' ? `<span class="team"><span class="tn me">${esc(cs.hs.name)}</span> <span class="rec">${cs.hs.w}-${cs.hs.l}</span></span>` : sp.lvl === 'nfl' ? nChip(cs.nfl.tm) : cChip(cs.col.tid);
  const chipOpp = sp.lvl === 'hs' ? `<span class="team"><span class="tn">${esc(opp.slice(3))}</span></span>` : sp.lvl === 'nfl' ? nChip(opp) : cChip(opp);
  const pace = cs.pace;
  const dis = cs.event ? ' disabled' : '';
  const btns = `<div class="row gap mt"><button class="btn primary" data-act="cplay"${dis}>Play the game</button><button class="btn ghost" data-act="csim"${dis}>Sim it</button>${pace === 'spotlight' && !sp.big ? `<button class="btn ghost" data-act="csimto" data-v="spot"${dis}>Sim to the next big game</button>` : ''}</div>${cs.event ? '<p class="small"><b>Answer the decision above first.</b></p>' : ''}`;
  return `<section class="card next"><div class="eyebrow">${esc(cWeekLabel(sp.wk))}${sp.name ? ' · ' + esc(sp.name) : ''}${sp.big ? ' · <span class="pill maize">Big game</span>' : ''}</div>
   <div class="matchup"><div class="side">${chipMe}</div><div class="at">${sp.neutral ? 'vs' : sp.home ? 'vs' : 'at'}</div><div class="side">${chipOpp}</div></div>
   <div class="wp"><div class="wpbar"><i style="width:${Math.round(pWin * 100)}%"></i></div><div class="wpl"><span>Your team's win chance <b>${Math.round(pWin * 100)}%</b></span><span>${sp.neutral ? 'Neutral site' : sp.home ? 'Home' : 'Road'}</span></div></div>
   <p class="small"><b>Your role:</b> ${role}.${share > 0 && share < 0.3 ? ' Backups mostly play when the game is out of hand.' : ''}${cs.lvl === 'col' && cs.col.rs ? ` Redshirt plan on: ${cs.ss.gp} of 4 games used.` : ''}</p>
   ${p.xp >= 5 ? `<p class="small">You have <b>${p.xp} skill points</b> to spend. <button class="lnk" data-act="ctab" data-tab="player">Upgrade your ratings</button></p>` : ''}
   ${btns}<p class="hint">${esc(PACES[pace][0])}: ${esc(PACES[pace][1])} Change it in <button class="lnk" data-act="ctab" data-tab="settings">Settings</button>.</p></section>`;
}
function playerCard() {
  const p = cs.p; const st = cStyle(p);
  const score = p.rec && p.rec.score; const showRank = (cs.lvl === 'hs' && (cs.hs.cls > 0 || cs.phase === 'hsoff')) || cs.phase === 'sign';
  return `<section class="card pcard"><div class="eyebrow">Player</div><div class="pch"><span class="jn">${p.num}</span><div><h2 class="h3">${esc(cName(p))}</h2><div class="small muted">${esc(CPOS_NAME[p.pos])} · ${esc(st[1])} · ${esc(p.ht)}, ${p.wt} lb · ${esc(CSTATES[p.home])}</div></div></div>
   <div class="tiles"><div><span class="k">OVR</span><span class="v">${cOvr(p)}</span></div>${cs.nfl ? `<div><span class="k">Age</span><span class="v">${cs.nfl.age}</span></div>` : `<div><span class="k">Stars</span><span class="v sm">${p.stars ? starsHTML(p.stars) : '—'}</span>${showRank && score ? `<span class="s">${compositeOf(score).toFixed(4)}</span>` : ''}</div>`}<div><span class="k">Skill points</span><span class="v">${p.xp}</span></div><div><span class="k">${cs.nfl ? 'Experience' : 'Class'}</span><span class="v sm">${esc(cs.nfl ? nflYearLabel() : clsText().replace('HS ', ''))}</span></div></div>
   ${folLine()}
   <div class="row gap mt"><button class="btn sm" data-act="ctab" data-tab="player">Ratings and upgrades</button><button class="btn ghost sm" data-act="ctab" data-tab="stats">Stats</button></div></section>`;
}
function recruitSnap() {
  const p = cs.p; const offers = offersList(); const sc = p.rec.score;
  const rated = cs.phase === 'sign' || cs.phase === 'hsoff' || (cs.hs && cs.hs.cls > 0);
  return `<section class="card"><div class="eyebrow">Recruiting</div>${rated && sc ? `<p>${starsHTML(p.stars, true)}</p><p class="small">National rank <b>No. ${natRankOf(sc)}</b> · No. ${posRankOf(sc, p.pos)} ${esc(p.pos)} · ${esc(CSTATES[p.home])}</p>` : '<p class="muted">Recruiting services rate you after your freshman season.</p>'}
   <p><b>${offers.length}</b> scholarship offer${offers.length === 1 ? '' : 's'}${cs.rec.committed ? ` · Committed to <b>${esc(cTeamName(cs.rec.committed))}</b>` : ''}</p>
   ${offers.length ? `<p class="small muted">Top offers: ${offers.slice().sort((a, b) => teamLevel(b.id) - teamLevel(a.id)).slice(0, 5).map(o => esc(cTeamName(o.id))).join(', ')}</p>` : ''}
   <button class="btn sm" data-act="ctab" data-tab="recruit">Open recruiting</button></section>`;
}
function trustCard() {
  if (!cs.col) return ''; const p = cs.p; const t = LT(cs.col.tid);
  return `<section class="card"><div class="eyebrow">${esc(t.name)}</div><div class="meter"><div class="mrow"><span class="lbl">Coach trust</span><span class="mval ${p.trust >= 60 ? 'good' : p.trust < 40 ? 'bad' : ''}">${p.trust}</span></div><div class="bar"><i class="${p.trust >= 60 ? 'good' : p.trust < 40 ? 'bad' : 'warn'}" style="width:${p.trust}%"></i></div><p class="hint">Head coach ${esc(t.coach)}. Trust rises with good games and smart choices and helps you climb the depth chart.</p></div>
   <p class="small">Eligibility left: <b>${Math.max(0, eligibilityLeft())} season${eligibilityLeft() === 1 ? '' : 's'}</b>${draftEligible() ? ' · Draft eligible' : ''}</p><button class="btn ghost sm" data-act="ctab" data-tab="team">Team and depth chart</button></section>`;
}
function signCard() {
  const offers = offersList();
  return `<section class="card next"><div class="eyebrow">Signing</div><h2 class="h3">Choose where you'll play college football</h2><p>You're a ${starsHTML(cs.p.stars)} ${esc(CPOS_NAME[cs.p.pos].toLowerCase())} with <b>${offers.length} offers</b>. Compare NIL money, where you'd be on the depth chart and how close each school is to home, then sign.</p><button class="btn primary" data-act="ctab" data-tab="recruit">See your offers</button></section>`;
}

/* ---------- offseason steps ---------- */
function vCOff() {
  const s = offStep(); const o = cs.off; const steps = o.steps.map((k, i) => `<li class="${i < o.i ? 'done' : i === o.i ? 'cur' : ''}">${esc(OFF_LABEL[k])}</li>`).join('');
  let body = '';
  if (s === 'review') body = reviewHTML(o.review);
  if (s === 'recruit') { const r = o.review; body = `<h2 class="h3">Recruiting</h2><p>${r.newOffers && r.newOffers.length ? `New offers after the season: <b>${r.newOffers.map(t => esc(cTeamName(t))).join(', ')}</b>.` : 'No new offers yet. Keep producing.'}</p><p class="small">${canVisitKind() === 'official' ? `You can now take official visits: up to ${MAX_OFFICIAL} in total, one per school.` : `This offseason you can make up to ${MAX_UNOFFICIAL} unofficial visits.`} Visits raise a school's interest and can turn into an offer.</p><button class="btn" data-act="ctab" data-tab="recruit">Go to recruiting</button>`; }
  if (s === 'camp') body = `<h2 class="h3">Summer camps</h2><p>Camps are where recruiting analysts see you in person. A great showing raises your stock; a bad one can hurt it.</p>${o.camp ? `<p class="flash">${esc(o.campTxt || 'Done.')}</p>` : `<div class="evopts">${CAMPS.map(c => `<button class="evopt" data-act="ccamp" data-v="${c.id}"><b>${esc(c.name)}</b><span>${esc(c.desc)}</span></button>`).join('')}</div>`}`;
  if (s === 'train') body = `<h2 class="h3">Offseason training</h2><p>Your body kept developing${o.growXP ? `, and you earned <b>${o.growXP} skill points</b>` : ''}. You have <b>${cs.p.xp}</b> to spend.</p><div class="row gap"><button class="btn" data-act="ctab" data-tab="player">Spend skill points</button>${cs.lvl === 'col' || cs.p.bank > 0 ? '<button class="btn ghost" data-act="ctab" data-tab="nil">Training with NIL money</button>' : ''}</div>`;
  if (s === 'signing') body = `<h2 class="h3">Signing day</h2><p>${cs.rec.committed ? `You're committed to <b>${esc(cTeamName(cs.rec.committed))}</b>. Sign with them, or pick another school that offered.` : 'You haven\'t committed anywhere. Pick a school from your offers.'}</p><button class="btn primary" data-act="ctab" data-tab="recruit">Choose your school</button>`;
  if (s === 'draft') body = draftHTML();
  if (s === 'portal') body = `<h2 class="h3">Transfer portal window</h2>${portalIntro()}`;
  if (s === 'nreview') body = nflReviewHTML(o.review);
  if (s === 'nmoney') body = nflMoneyHTML();
  if (s === 'ntrain') body = nflTrainHTML();
  return `<section class="card offc"><div class="eyebrow">${cs.lvl === 'hs' ? 'High school offseason' : cs.year - 1 + (cs.nfl ? ' NFL offseason' : ' offseason')}</div><ol class="steps">${steps}</ol>${body}${offBlocked() || s === 'signing' ? '' : `<div class="row gap mt"><button class="btn primary" data-act="coffnext">${esc(cPrimary().label)}</button></div>`}</section>`;
}
function reviewHTML(r) {
  if (!r) return ''; const e = r.e; const p = cs.p; const st = e.st;
  const avg = e.ratio != null ? gradeOf(e.ratio)[1] : null;
  const starLine = e.lvl === 'hs' ? `<p>Recruiting stars: ${r.before && r.before !== r.after && cs.hs.cls > 0 ? `${starsHTML(r.before)} → ` : ''}${starsHTML(r.after, true)} <span class="small muted">${p.rec.score ? 'National rank No. ' + natRankOf(p.rec.score) : ''}</span></p>` : '';
  const heis = r.heis ? `<div class="eyebrow mt">Heisman voting</div><ol class="small">${r.heis.list.map(c => `<li${c.me ? ' class="me"' : ''}>${esc(c.n)} <span class="muted">${esc(c.pos)}, ${esc(cTeamName(c.tid))}</span></li>`).join('')}</ol>` : '';
  return `<h2 class="h3">${e.year} season review</h2><div class="tiles"><div><span class="k">Team</span><span class="v sm">${esc(e.rec)}</span><span class="s">${esc(e.lvl === 'hs' ? e.po || '' : (e.rank ? 'Final rank No. ' + e.rank : 'Unranked'))}</span></div><div><span class="k">Games</span><span class="v">${e.gp}</span><span class="s">${e.gs} starts</span></div><div><span class="k">Season grade</span><span class="v">${avg || '—'}</span></div><div><span class="k">OVR</span><span class="v">${e.ovr}</span></div></div>
   <div class="sline mt">${statLineHTML(st, p.pos)}</div>${starLine}
   ${e.awards.length ? `<p><b>Awards:</b> ${e.awards.map(esc).join(', ')}</p>` : ''}${r.post ? `<p class="small">Postseason: ${esc(r.post)}</p>` : ''}
   ${r.champ ? `<p class="small muted">${r.year} national champion: ${esc(cTeamName(r.champ))}</p>` : ''}${r.coach ? `<p class="flash bad">Coaching change: ${esc(cTeamName(cs.col.tid))} ${r.coach.why === 'fired' ? 'fired' : 'lost'} ${esc(r.coach.old)}. New head coach: ${esc(r.coach.now)}. Your coach trust starts over.</p>` : ''}${heis}`;
}
function draftHTML() {
  if (cs.off.draftChoice === 'return') return `<h2 class="h3">You're coming back</h2><p>One more season to raise your stock.</p>`;
  return turnProHTML();
}
function portalIntro() {
  const c = cs.col; const d = depthOutlook(c.tid, cs.year, cOvr(cs.p));
  if (cs.portal) return cs.portal.done ? `<p>You committed to <b>${esc(cTeamName(cs.portal.to))}</b>.</p>` : `<p>You're in the portal. Round ${cs.portal.round} of 3.</p><button class="btn primary" data-act="ctab" data-tab="recruit">Open the portal</button>`;
  return `<p>Next season at ${esc(cTeamName(c.tid))}, you look like: <b>${esc(d.txt.toLowerCase())}</b>. Coach trust ${cs.p.trust}. NIL ${money(c.nil)} a year.</p><p class="small">Entering the portal ends your current NIL deal. Schools recruit you again with new NIL offers based on your rating and production. You play right away wherever you land.</p>
   <div class="evopts"><button class="evopt" data-act="cstay"><b>Stay at ${esc(cTeamName(c.tid))}</b><span>Keep your NIL deal and your coach's trust.</span></button><button class="evopt" data-act="cportal"><b>Enter the transfer portal</b><span>See who wants you and what they'll pay.</span></button></div>`;
}

/* ---------- career complete ---------- */
function vCDone() {
  const d = cs.done.draft; const p = cs.p;
  const hs = p.seasons.filter(s => s.lvl === 'hs'), col = p.seasons.filter(s => s.lvl === 'col');
  const teams = [...new Set(col.map(s => s.team))].map(t => cTeamName(t)).join(', ');
  const tm = nflId(d.team); const rd = rookieDeal(d.udfa ? 0 : d.pick);
  const ck = cui.confirm === 'nflskip';
  return `<section class="card next donec"><div class="eyebrow">${d.year} NFL Draft</div><h2 class="h2">${d.udfa ? 'Undrafted, signed by the ' + esc(d.team) : `Round ${d.round}, pick ${d.pick}: ${esc(d.team)}`}</h2><p class="muted">${esc(cName(p))} · ${esc(CPOS_NAME[p.pos])} · ${hs.length ? `${hs.length} high school season${hs.length === 1 ? '' : 's'}, ` : ''}${col.length} college season${col.length === 1 ? '' : 's'} at ${esc(teams)}</p>
   <div class="tiles"><div><span class="k">Final OVR</span><span class="v">${cOvr(p)}</span></div><div><span class="k">Out of high school</span><span class="v sm">${starsHTML(p.stars0 || p.stars)}</span></div><div><span class="k">NIL earned</span><span class="v">${money(p.earned)}</span></div><div><span class="k">Awards</span><span class="v">${p.awards.length}</span></div></div>
   ${p.awards.length ? `<p class="mt"><b>Honors:</b> ${p.awards.map(a => `${esc(a.a)} (${a.y})`).join(', ')}</p>` : ''}</section>
   <section class="card decision"><div class="eyebrow">Your NFL decision</div><h2 class="h3">${tm ? nChip(tm, { rec: false }) : ''} ${d.udfa ? 'offer a free-agent deal' : 'are ready to sign you'}</h2>
   <p>${d.udfa ? 'A three-year deal' : 'A four-year rookie contract'} worth about <b>${money(rd.apy * rd.yrs)}</b>${rd.bonus ? `, with a <b>${money(rd.bonus)}</b> signing bonus` : ''}. Play 17-game seasons, chase the playoffs and the Super Bowl, earn your next contract and decide when to walk away.</p>
   <div class="evopts"><button class="evopt" data-act="cnfl"><b>Start your NFL career</b><span>Sign the contract and report to camp.</span></button>${ck ? '<button class="evopt danger" data-act="cnflskip"><b>Confirm: walk away now</b><span>The career ends here, at the draft.</span></button>' : '<button class="evopt" data-act="cask2" data-k="nflskip"><b>Walk away</b><span>End the career at the draft.</span></button>'}</div></section>${seasonTable()}`;
}
/* ---------- Player: ratings and upgrades ---------- */
function vCPlayer() {
  const p = cs.p; const st = cStyle(p);
  const rows = CATTR[p.pos].map(([k, lbl]) => { const v = p.a[k]; const c = cCost(v); const can = p.xp >= c && v < CATTR_MAX; return `<li><span class="an">${esc(lbl)}${k === CREAD[p.pos] ? ' <span class="pill ghost" title="Helps you read the defense before the snap">Reads</span>' : ''}${(st[3][k] || 0) > 0 ? ' <span class="pill maize">Style</span>' : ''}</span><span class="av">${v}</span><span class="bar"><i class="${v >= 85 ? 'good' : v >= 70 ? 'warn' : 'bad'}" style="width:${v}%"></i></span><span class="row gap"><button class="btn sm" data-act="cup" data-k="${k}" ${can ? '' : 'disabled'} aria-label="Raise ${esc(lbl)} by 1 for ${c} point${c > 1 ? 's' : ''}">+1 <span class="muted">(${c})</span></button><button class="btn ghost sm" data-act="cup" data-k="${k}" data-n="5" ${can ? '' : 'disabled'} aria-label="Raise ${esc(lbl)} by up to 5">+5</button></span></li>`; }).join('');
  const aw = p.awards.slice().reverse().map(a => `<li><span class="when">${a.y}</span>${esc(a.a)}</li>`).join('');
  return `<div class="grid2"><div class="col"><section class="card"><div class="head"><div><div class="eyebrow">Ratings</div><h2 class="h2">${cOvr(p)} OVR ${esc(p.pos)}</h2></div><p class="hint">Each upgrade costs more as a rating climbs. You earn skill points from every game (more for better grades) and every offseason.</p></div>
   <p><b>${p.xp}</b> skill point${p.xp === 1 ? '' : 's'} available.</p><ul class="attrs">${rows}</ul>
   <div class="row gap mt"><button class="btn" data-act="cauto" ${p.xp ? '' : 'disabled'}>Spend them for me</button><label class="fld chk"><input type="checkbox" id="cautochk" ${p.auto ? 'checked' : ''}> Always spend new points automatically</label></div></section>${cRatingChartHTML()}</div>
   <div class="col"><section class="card"><div class="eyebrow">Profile</div><h2 class="h3">${esc(cName(p))}</h2><p class="small muted">#${p.num} · ${esc(CPOS_NAME[p.pos])} · ${esc(p.ht)}, ${p.wt} lb · ${esc(CSTATES[p.home])}</p><p><b>${esc(st[1])}.</b> ${esc(st[2])}</p>
   <p class="small">Style bonus: ${Object.entries(st[3]).filter(([, v]) => v > 0).map(([k]) => esc(CATTR[p.pos].find(a => a[0] === k)[1])).join(', ')}</p></section>
   ${twoWayCardHTML()}${cs.lvl === 'nfl' && !agentOf() ? `<section class="card"><p class="small muted">You never signed with an agent. You can still pick one: it changes your next contract and your endorsements.</p>${agentCardHTML(true)}</section>` : agentCardHTML(false)}${rivalCardHTML()}${acadCardHTML()}${matesCardHTML()}<section class="card"><div class="eyebrow">Trophy case</div>${aw ? `<ul class="news">${aw}</ul>` : '<p class="muted">No awards yet.</p>'}</section></div></div>`;
}

/* ---------- Schedule ---------- */
function vCSchedule() {
  if (cs.phase === 'hs' || (cs.lvl === 'hs' && cs.hs)) {
    const h = cs.hs; const rows = h.sched.map(g => { const r = cs.ss.games.find(x => x.wk === g.wk); return `<tr class="${g.wk === cs.week && cs.phase === 'hs' ? 'cur' : ''}"><td class="nowrap">${esc(g.name || 'Week ' + g.wk)}</td><td>${g.neutral ? 'vs' : g.home ? 'vs' : 'at'} ${esc(g.opp)} ${g.big ? '<span class="pill maize">Big game</span>' : ''}</td><td class="nowrap">${g.done ? `<b>${g.us > g.them ? 'W' : 'L'}</b> ${g.us}–${g.them}` : '<span class="muted">—</span>'}</td><td class="small">${r && r.role !== 'Not playing' ? statLineShort(r.line) : ''}</td><td>${r ? gradeHTML(r.grade, true) : ''}</td></tr>`; }).join('');
    return `<section class="card"><div class="head"><div><div class="eyebrow">${cs.year} · ${esc(HS_CLS[Math.min(3, h.cls)])} season</div><h2 class="h2">${esc(h.name)} ${esc(h.mascot)}</h2></div><p class="hint">Record ${h.w}-${h.l}. Win seven games to make the state playoffs; six might do it.</p></div><div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Opponent</th><th>Result</th><th>Your game</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }
  if (cs.nfl) return nflScheduleHTML();
  if (!cs.col) return `<section class="card"><p class="muted">Your college schedule appears after you sign.</p></section>`;
  const tid = cs.col.tid; const gs = myColGames();
  const rows = gs.map(g => { const home = g.h === tid; const opp = home ? g.a : g.h; const r = cs.ss.games.find(x => x.wk === g.wk); const won = g.done && (home ? g.hs > g.as : g.as > g.hs); return `<tr class="${g.wk === cs.week && cs.phase === 'col' ? 'cur' : ''}"><td class="nowrap">${esc(g.name || cWeekLabel(g.wk))}</td><td>${g.neutral ? 'vs' : home ? 'vs' : 'at'} ${cChip(opp)}${g.conf ? '' : ' <span class="site">nonconf.</span>'}</td><td class="nowrap">${g.done ? `<b>${won ? 'W' : 'L'}</b> ${home ? g.hs : g.as}–${home ? g.as : g.hs}${g.ot ? ' (OT)' : ''}` : '<span class="muted">—</span>'}</td><td class="small">${r && r.role !== 'Not playing' ? statLineShort(r.line) : r ? '<span class="muted">DNP</span>' : ''}</td><td>${r ? gradeHTML(r.grade, true) : ''}</td></tr>`; }).join('');
  const t = LT(tid);
  return `<section class="card"><div class="head"><div><div class="eyebrow">${cs.year} schedule</div><h2 class="h2">${esc(t.name)}</h2></div><p class="hint">${t.w}-${t.l} overall, ${t.cw}-${t.cl} in the ${esc(CCONF[t.conf].name)}.${t.ap ? ' Ranked No. ' + t.ap + '.' : ''}</p></div><div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Opponent</th><th>Result</th><th>Your game</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function statLineShort(st) { return esc(lineText(st, cs.p.pos) || '—'); }

/* ---------- Stats ---------- */
function seasonTable() {
  const p = cs.p; const cols = cStatCols(p);
  const row = s => `<tr><td>${s.year}</td><td>${seasonTeamHTML(s)}</td><td class="nowrap">${esc(s.cls)}</td><td class="num">${s.gp}</td><td class="num">${s.gs}</td>${cols.map(k => `<td class="num">${s.st[k] || 0}</td>`).join('')}<td>${s.ratio != null && s.gp ? gradeOf(s.ratio)[1] : '—'}</td><td class="small">${esc((s.awards || []).join(', '))}</td></tr>`;
  const tot = (lvl, lbl) => { const T = careerTotals(lvl); const ss = p.seasons.filter(s => s.lvl === lvl); if (!ss.length) return ''; return `<tr class="me"><td colspan="3"><b>${lbl}</b></td><td class="num">${ss.reduce((a, s) => a + s.gp, 0)}</td><td class="num">${ss.reduce((a, s) => a + s.gs, 0)}</td>${cols.map(k => `<td class="num"><b>${T[k] || 0}</b></td>`).join('')}<td></td><td></td></tr>`; };
  const hs = p.seasons.filter(s => s.lvl === 'hs'), col = p.seasons.filter(s => s.lvl === 'col'), pro = p.seasons.filter(s => s.lvl === 'nfl');
  const cur = cs.ss && cs.ss.gp && cInSeason() ? `<tr class="cur"><td>${cs.year}</td><td>${cs.lvl === 'hs' ? esc(cs.hs.name) : cs.lvl === 'nfl' ? nChip(cs.nfl.tm, { rec: false }) : cChip(cs.col.tid, { rec: false, norank: true })}</td><td>${esc(clsText().replace('HS ', ''))} <span class="pill">so far</span></td><td class="num">${cs.ss.gp}</td><td class="num">${cs.ss.gs}</td>${cols.map(k => `<td class="num">${cs.ss.st[k] || 0}</td>`).join('')}<td>${seasonRatio(cs.ss) != null ? gradeOf(seasonRatio(cs.ss))[1] : '—'}</td><td></td></tr>` : '';
  return `<section class="card"><div class="eyebrow">Season by season</div><div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>Team</th><th>Class</th><th>GP</th><th>GS</th>${cols.map(k => `<th>${STAT_LBL[k]}</th>`).join('')}<th>Grade</th><th>Honors</th></tr></thead><tbody>${hs.map(row).join('')}${tot('hs', 'High school')}${col.map(row).join('')}${tot('col', 'College')}${pro.map(row).join('')}${tot('nfl', 'NFL regular season')}${nflPoTotal()}${cur}</tbody></table></div>${!p.seasons.length && !cur ? '<p class="muted">Play some games and your stats show up here.</p>' : ''}</section>`;
}
function vCStats() {
  const log = cs.ss ? cs.ss.games.map((r, i) => [r, i]).reverse().map(([r, gi]) => `<tr><td class="nowrap">${esc(cWeekLabel(r.wk))}${r.hl ? ` <button class="lnk small" data-act="chlwatch" data-i="${gi}">Highlights</button>` : ''}</td><td>${r.home || r.neutral ? 'vs' : 'at'} ${cs.lvl === 'hs' ? esc(r.opp) : cs.lvl === 'nfl' ? nChip(r.opp, { rec: false }) : cChip(r.opp, { rec: false })}</td><td class="nowrap"><b>${r.w ? 'W' : 'L'}</b> ${r.us}–${r.them}</td><td class="small">${r.role === 'Not playing' ? '<span class="muted">Did not play</span>' : statLineShort(r.line)}</td><td>${gradeHTML(r.grade, true)}</td><td class="num small">+${r.xp || 0}</td></tr>`).join('') : '';
  return `${seasonTable()}<div class="row gap">${csvBtn('cstats')}</div><section class="card"><div class="eyebrow">${cs.year} game log</div>${log ? `<div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Opponent</th><th>Result</th><th>Your game</th><th>Grade</th><th>Pts</th></tr></thead><tbody>${log}</tbody></table></div>` : '<p class="muted">No games yet this season.</p>'}<p class="hint">Grades compare your production with what a good starter in your role usually puts up. Pts are the skill points each game earned.</p></section>`;
}

/* ---------- Records (Player Career) ---------- */
function vCRecords() {
  const p = cs.p; const keys = crecKeysFor(p.pos); const lvl = cs.lvl; const team = cTeamNow(); const fmtv = v => (Math.round(v * 10) / 10).toLocaleString();
  const tname = (l, t) => (l === 'hs' ? t : l === 'nfl' ? nflName(t) : cTeamName(t));
  const A = cs.cach || {}; const ach = CACH.map(([id, name, desc]) => `<div class="ach${A[id] ? ' on' : ''}"><b>${esc(name)}</b><span>${esc(desc)}</span><em>${A[id] ? 'Unlocked ' + A[id].y : 'Locked'}</em></div>`).join('');
  const B = cs.pb || { game: {}, season: {} };
  const R_ = team && (lvl === 'hs' || lvl === 'col' || lvl === 'nfl') ? cTeamRec(lvl, team) : null;
  const tot = {}; if (team) p.seasons.filter(s => s.lvl === lvl && s.team === team).forEach(s => Object.entries(s.st || {}).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; })); if (cs.ss && cInSeason()) Object.entries(cs.ss.st || {}).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; });
  const cur = { game: B.game, season: { }, career: tot }; if (cs.ss) keys.forEach(k => { cur.season[k] = { v: (cs.ss.st || {})[k] || 0 }; });
  const rows = tb => keys.map(k => { const r = R_[tb][k]; const mine = tb === 'game' ? (B.game[k] && B.game[k].lvl === lvl ? B.game[k].v : 0) : tb === 'season' ? (cur.season[k] ? cur.season[k].v : 0) : tot[k] || 0; const pct = r.v ? Math.min(100, Math.round(mine / r.v * 100)) : 0;
    return `<tr class="${r.me ? 'me' : ''}"><td>${esc(CREC_KEYS[k])}</td><td class="num"><b>${fmtv(r.v)}</b></td><td>${r.me ? '<b>You</b>' : esc(r.n)}</td><td class="muted small">${r.y || ''}</td><td class="num small">${r.me ? '—' : `${fmtv(mine)} <span class="muted">(${pct}%)</span>`}</td></tr>`; }).join('');
  const book = R_ ? ['game', 'season', 'career'].map(tb => `<section class="card"><div class="eyebrow">${esc(tname(lvl, team))} · ${tb === 'game' ? 'single game' : tb === 'season' ? 'single season' : 'career with the team'}</div><div class="tw"><table class="tbl"><thead><tr><th>Record</th><th>Mark</th><th>Held by</th><th>Year</th><th>${tb === 'game' ? 'Your best here' : tb === 'season' ? 'You this season' : 'You so far'}</th></tr></thead><tbody>${rows(tb)}</tbody></table></div></section>`).join('') : '';
  const L = cs.lrec || {}; const nfl = (lvl === 'nfl' || cs.nfl) ? `<section class="card"><div class="eyebrow">NFL single-season records</div><p class="hint">The real league records (through the 2025 season). Break one and it's yours.</p><div class="tw"><table class="tbl"><thead><tr><th>Record</th><th>Mark</th><th></th></tr></thead><tbody>${keys.filter(k => NFL_SEASON_REC[k]).map(k => `<tr class="${L[k] && L[k].me ? 'me' : ''}"><td>${esc(CREC_KEYS[k])}</td><td class="num"><b>${fmtv(L[k] ? L[k].v : NFL_SEASON_REC[k])}</b></td><td class="small">${L[k] && L[k].me ? `<b>You, ${L[k].y}</b>` : 'League record'}</td></tr>`).join('')}</tbody></table></div></section>` : '';
  const pb = `<section class="card"><div class="eyebrow">Personal bests</div><div class="tw"><table class="tbl"><thead><tr><th>Stat</th><th>Best game</th><th></th><th>Best season</th><th></th></tr></thead><tbody>${keys.map(k => { const g = B.game[k], s = B.season[k]; return `<tr><td>${esc(CREC_KEYS[k])}</td><td class="num"><b>${g ? fmtv(g.v) : '—'}</b></td><td class="muted small">${g ? g.y + (g.opp ? ' vs. ' + esc(g.opp) : '') : ''}</td><td class="num"><b>${s ? fmtv(s.v) : '—'}</b></td><td class="muted small">${s ? s.y + ' · ' + ({ hs: 'High school', col: 'College', nfl: 'NFL' }[s.lvl] || '') : ''}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  const log = (cs.crLog || []).slice().reverse().slice(0, 15).map(x => `<li><span class="when">${x.y}</span><span>${esc(x.tb === 'league' ? 'NFL' : tname(x.lvl, x.team))}: ${esc(CREC_KEYS[x.k].toLowerCase())}, ${x.tb === 'game' ? 'single game' : x.tb === 'career' ? 'career' : 'single season'}, <b>${fmtv(x.v)}</b> <span class="muted">(was ${fmtv(x.pv)}${x.pn ? ', ' + esc(x.pn) : ''})</span></span></li>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Record book</div><h2 class="h2">Chase the records</h2></div><p class="hint">Every team you play for has its own record book. Break a mark and your name goes in it; break enough and the achievements below unlock.</p></div><div class="achs">${ach}</div></section>
   ${log ? `<section class="card"><div class="eyebrow">Records you broke</div><ul class="news">${log}</ul></section>` : ''}
   <div class="grid2"><div class="col">${book}</div><div class="col">${nfl}${pb}</div></div>`;
}

/* ---------- Recruiting and the transfer portal ---------- */
function collegeStartYear() { if (cs.lvl === 'hs') return cs.phase === 'hs' ? cs.year + 4 - cs.hs.cls : cs.year + 3 - cs.hs.cls; return cs.year; }
function vCRecruit() {
  if (cs.portal || offStep() === 'portal') return vCPortal();
  const p = cs.p; const R_ = cs.rec;
  if (!R_ || (R_.signed && cs.phase !== 'sign')) return `<section class="card"><div class="eyebrow">Recruiting</div><h2 class="h2">You signed with ${esc(cTeamName(R_ && R_.signed))}</h2><p class="muted">Your recruitment is over. The transfer portal opens after each college season.</p></section>`;
  const signing = cs.phase === 'sign' || offStep() === 'signing';
  const sc = p.rec.score; const rated = signing || cs.phase === 'hsoff' || (cs.hs && cs.hs.cls > 0);
  const all = Object.entries(R_.schools).map(([id, s]) => Object.assign({ id }, s));
  const f = cui.recF; let list = all.filter(s => f === 'offers' ? s.off : f === 'int' ? s.i >= 45 || s.off : true);
  const sorters = { interest: (a, b) => b.i - a.i, prestige: (a, b) => teamLevel(b.id) - teamLevel(a.id), nil: (a, b) => b.nil - a.nil || b.i - a.i, close: (a, b) => proximity(b.id) - proximity(a.id) || b.i - a.i };
  list.sort(sorters[cui.recSort] || sorters.interest); const total = list.length; list = list.slice(0, 60);
  const yr = collegeStartYear(); const proj = projOvrAtCollege();
  const rows = list.map(s => {
    const t = cs.league.teams[s.id]; const d = depthOutlook(s.id, yr, proj); const vk = canVisit(s.id); const com = R_.committed === s.id; const px = proximity(s.id);
    const act = signing ? (s.off ? (cui.confirm === 'sign-' + s.id ? `<button class="btn danger sm" data-act="csign" data-id="${s.id}">Confirm: sign here</button>` : `<button class="btn primary sm" data-act="cask2" data-k="sign-${s.id}">Sign</button>`) : '')
      : (s.off ? (com ? '<button class="btn ghost sm" data-act="cdecommit">Decommit</button>' : `<button class="btn sm" data-act="ccommit" data-id="${s.id}">Commit</button>`) : '');
    const visit = vk === 'official' || vk === 'unofficial' ? `<button class="btn ghost sm" data-act="cvisit" data-id="${s.id}">${vk === 'official' ? 'Official visit' : 'Visit'}</button>` : '';
    const ask = s.off && !R_.signed && (s.asked || 0) < 2 ? `<button class="btn ghost sm" data-act="cask" data-id="${s.id}" title="Ask for a bigger NIL offer">Ask for more</button>` : '';
    return `<tr class="${com ? 'me' : ''}"><td>${cChip(s.id)}<div class="small muted">${esc(CCONF[t.conf].name)} · ${esc(CSTATES[TEAM_STATE[s.id]])}${px >= 16 ? ' · <span class="pill good">Home state</span>' : px ? ' · <span class="pill ghost">Your region</span>' : ''}</div></td>
     <td data-l="Interest"><div class="ib"><span class="bar"><i class="${s.i >= 70 ? 'good' : s.i >= 45 ? 'warn' : 'bad'}" style="width:${s.i}%"></i></span><span class="num small">${s.i}</span></div></td>
     <td data-l="Offer">${s.off ? `<span class="pill ${com ? 'maize' : 'good'}">${com ? 'Committed' : 'Offered'}</span>` : '<span class="muted small">No offer</span>'}</td><td class="num" data-l="NIL / yr">${s.off ? money(s.nil) : '—'}</td><td class="small dc" data-l="Depth chart">${esc(d.txt)}</td><td class="num vis"${s.v ? ' data-l="Visits"' : ''}>${s.v || ''}</td><td><div class="row gap">${act}${visit}${ask}</div></td></tr>`;
  }).join('');
  const offers = all.filter(s => s.off).length;
  const visits = cs.lvl === 'hs' && !(cs.hs.cls >= 3 || (cs.phase === 'hsoff' && cs.hs.cls >= 2)) ? (cs.phase === 'hs' ? 'Visits open in the offseason.' : `Unofficial visits this offseason: ${(R_.uv && R_.uv.y === cs.year ? R_.uv.n : 0)} of ${MAX_UNOFFICIAL}.`) : `Official visits used: ${R_.offVisits} of ${MAX_OFFICIAL}.`;
  const vl = R_.visitLog.slice(0, 4).map(v => `<li><span class="when">${v.year}</span><span><b>${esc(cTeamName(v.tid))}</b> (${v.kind}): ${esc(v.depth)}. Coach ${esc(v.coach)}.${v.offer ? ' <b>Offered on the visit.</b>' : ''}${v.nil ? ' NIL ' + money(v.nil) + '/yr.' : ''}</span></li>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">${signing ? 'Signing day' : 'Recruiting'}</div><h2 class="h2">${rated && sc ? starsHTML(p.stars, true) : 'Not yet rated'}</h2>${rated && sc ? `<p class="small">Composite ${compositeOf(sc).toFixed(4)} · National No. ${natRankOf(sc)} · No. ${posRankOf(sc, p.pos)} ${esc(p.pos)} · ${esc(CSTATES[p.home])}</p>` : ''}</div>
   <p class="hint">${signing ? 'Signing is final. NIL offers are per year and are paid during the season.' : 'Schools offer players in their range. Your stars move with your ratings, your production and camps. Commit anytime, and you can back out until you sign.'}</p></div>
   ${R_.committed ? `<p class="flash">Committed to ${esc(cTeamName(R_.committed))}${R_.schools[R_.committed].nil ? ' · NIL ' + money(R_.schools[R_.committed].nil) + ' a year' : ''}.</p>` : ''}
   <div class="chips" role="group" aria-label="Show">${[['offers', 'Offers', offers], ['int', 'Interested', all.filter(s => s.i >= 45 || s.off).length], ['all', 'All schools', all.length]].map(([k, l, n]) => `<button class="chip${f === k ? ' on' : ''}" data-act="crecf" data-v="${k}" aria-pressed="${f === k}">${l} <span>${n}</span></button>`).join('')}
    <label class="fld inl"><span>Sort</span><select id="crecsort">${[['interest', 'Interest'], ['prestige', 'Program strength'], ['nil', 'NIL offer'], ['close', 'Close to home']].map(([k, l]) => `<option value="${k}" ${cui.recSort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
   <p class="small muted">${esc(visits)} Depth chart outlook is for your first college season.</p>
   ${rows ? `<div class="tw"><table class="tbl rec"><thead><tr><th>School</th><th>Interest</th><th>Offer</th><th>NIL / yr</th><th>Depth chart</th><th>Visits</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${total > 60 ? `<p class="small muted">Showing 60 of ${total}.</p>` : ''}` : `<p class="muted">${f === 'offers' ? 'No offers yet. Keep producing and schools will come.' : 'Nobody here yet.'}</p>`}</section>
   ${vl ? `<section class="card"><div class="eyebrow">Visit reports</div><ul class="plays">${vl}</ul></section>` : ''}`;
}
function vCPortal() {
  const P = cs.portal;
  if (!P) return `<section class="card"><div class="eyebrow">Transfer portal</div><h2 class="h2">Stay or go?</h2>${portalIntro()}</section>`;
  const offers = Object.entries(P.offers).map(([id, o]) => Object.assign({ id }, o)).sort((a, b) => b.nil - a.nil);
  const rows = offers.map(o => `<tr class="${P.to === o.id ? 'me' : ''}"><td>${cChip(o.id)}<div class="small muted">${esc(CCONF[LT(o.id).conf].name)}${o.id === P.from ? ' · your old school' : ''}</div></td><td class="num">${money(o.nil)}</td><td class="small">${esc(o.start)}</td><td class="small">Coach ${esc(LT(o.id).coach)}</td><td>${P.done ? '' : cui.confirm === 'port-' + o.id ? `<button class="btn danger sm" data-act="cpcommit" data-id="${o.id}">Confirm</button>` : `<button class="btn primary sm" data-act="cask2" data-k="port-${o.id}">Commit</button>`}</td></tr>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Transfer portal · round ${P.round} of 3</div><h2 class="h2">${P.done ? 'Committed to ' + esc(cTeamName(P.to)) : offers.length + ' offer' + (offers.length === 1 ? '' : 's')}</h2></div><p class="hint">Transfer rating ${starsHTML(starsOf(portalScore()))}, based on your OVR and last season. More offers can come in later rounds, but some schools move on.</p></div>
   ${rows ? `<div class="tw"><table class="tbl"><thead><tr><th>School</th><th>NIL / yr</th><th>Your spot</th><th>Head coach</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">No offers yet. Wait a round.</p>'}
   <div class="row gap mt">${P.done ? '<button class="btn primary" data-act="coffnext">Continue</button>' : P.round < 3 ? '<button class="btn" data-act="cpwait">Wait for more offers</button>' : '<p class="small muted">Last round. Pick a school.</p>'}</div></section>`;
}

/* ---------- NIL ---------- */
function vCNil() {
  const p = cs.p; cs.bought = cs.bought || {};
  if (cs.nfl) return nflMoneyView();
  const deal = cs.col ? `<p>Your deal with <b>${esc(cTeamName(cs.col.tid))}</b>: <b>${money(cs.col.nil)}</b> a year, paid weekly during the regular season.</p>` : cs.rec && cs.rec.committed ? `<p>Committed to ${esc(cTeamName(cs.rec.committed))}. NIL offer: <b>${money(cs.rec.schools[cs.rec.committed].nil)}</b> a year once you enroll.</p>` : '<p class="muted">NIL money starts when you sign with a college. Offers depend on your stars, your position (quarterbacks earn the most), the school\'s budget and its conference.</p>';
  const shop = TRAIN.map(t => { const cost = trainCost(t); const has = cs.bought[t.id] === cs.year; const can = p.bank >= cost && !has && trainLeft() > 0; return `<div class="cand"><div><b>${esc(t.name)}</b> <span class="muted">· ${money(cost)}</span><div class="small muted">${esc(t.desc)}</div></div>${has ? '<span class="pill good">Done this year</span>' : `<button class="btn sm" data-act="ctrain" data-id="${t.id}" ${can ? '' : 'disabled'}>Buy</button>`}</div>`; }).join('');
  const log = cs.nilLog.slice(0, 25).map(l => `<tr><td>${l.y}</td><td>${esc(l.txt)}</td><td class="num ${l.amt < 0 ? 'neg' : 'pos'}">${l.amt < 0 ? '−' : '+'}${money(Math.abs(l.amt))}</td></tr>`).join('');
  return `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">NIL</div><h2 class="h2">${money(p.bank)} in the bank</h2>${deal}<div class="tiles"><div><span class="k">Earned</span><span class="v">${money(p.earned)}</span></div><div><span class="k">Spent on training</span><span class="v">${money(p.spent)}</span></div></div></section>
   <section class="card"><div class="eyebrow">Invest in yourself</div><p class="small muted">Each program can be bought once a year, and you can do ${TRAIN_CAP} programs a year. ${trainLeft() > 0 ? `${trainLeft()} left this year.` : 'You\'ve done your two for this year.'}</p>${shop}</section></div>
   <div class="col">${endorseCardHTML()}<section class="card"><div class="eyebrow">Ledger</div>${log ? `<div class="tw"><table class="tbl"><tbody>${log}</tbody></table></div>` : '<p class="muted">Nothing yet.</p>'}</section></div></div>`;
}

/* ---------- Team ---------- */
function vCTeam() {
  const p = cs.p; const n = START_N[p.pos];
  if (cs.nfl) return nflTeamView();
  if (!(cs.lvl === 'hs' && cs.hs) && !cs.col) return `<section class="card"><div class="eyebrow">Team</div><p class="muted">Your college team appears here after you sign.</p></section>`;
  const d = myDepth();
  const dl = d.all.slice(0, 12).map((x, i) => `<li class="${x.me ? 'me' : ''}${i < n ? ' st' : ''}"><span class="ord">${i + 1}</span><span class="nm">${esc(x.n)}${x.me ? ' <span class="pill maize">You</span>' : ''}</span><span class="small muted">${esc(x.cls || '')}</span>${ovrHTML(x.ovr)}</li>`).join('');
  if (cs.lvl === 'hs' && cs.hs) {
    return `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">High school</div><h2 class="h2">${esc(cs.hs.name)} ${esc(cs.hs.mascot)}</h2><p>${cs.hs.w}-${cs.hs.l} this season.${cs.hs.titles ? ` State titles with you: ${cs.hs.titles}.` : ''}</p><p class="small muted">${esc(CSTATES[p.home])}</p></section></div><div class="col"><section class="card"><div class="eyebrow">${esc(p.pos)} depth chart</div><ol class="cdepth">${dl}</ol><p class="hint">The top ${n} start. Improve your ratings to move up.</p></section></div></div>`;
  }
  const t = LT(cs.col.tid); const c = cs.col;
  const canRs = !c.rsYear && cs.phase === 'col' && cs.ss.gp <= 4;
  const rs = `<div class="setrow"><div class="sl"><b>Redshirt</b><span class="hint">${c.rsYear ? 'You have already used your redshirt year.' : 'Play four games or fewer and the season doesn\'t count against your four years of eligibility.'}</span></div><div class="sctl">${canRs ? seg('crs', c.rs ? 'on' : 'off', [['on', 'Redshirt this year'], ['off', 'Play all season']]) : `<span class="muted small">${c.rsYear ? 'Used' : 'Not available now'}</span>`}</div></div>`;
  const roster = teamRoster(c.tid, cs.year).slice().sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr);
  return `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">${esc(CCONF[t.conf].name)}</div><h2 class="h2">${esc(t.name)}</h2><p>${t.w}-${t.l}${t.ap ? ' · No. ' + t.ap : ''} · Head coach ${esc(t.coach)}</p>
    <div class="meter"><div class="mrow"><span class="lbl">Coach trust</span><span class="mval">${p.trust}</span></div><div class="bar"><i class="${p.trust >= 60 ? 'good' : p.trust < 40 ? 'bad' : 'warn'}" style="width:${p.trust}%"></i></div></div>
    <p class="small">College years: ${c.years} · Seasons of eligibility used: ${c.seasons} of 4${c.transfers ? ` · Transfers: ${c.transfers}` : ''}</p>${rs}</section>
   <section class="card"><details><summary class="eyebrow">Full roster (${roster.length})</summary><div class="tw"><table class="tbl sortable" data-sk="croster"><thead><tr><th>#</th><th>Name</th><th>Pos</th><th>Class</th><th>OVR</th></tr></thead><tbody>${roster.map(x => `<tr><td class="num">${x.num}</td><td>${esc(x.n)}</td><td>${x.pos}</td><td>${x.cls}</td><td>${ovrHTML(x.ovr)}</td></tr>`).join('')}</tbody></table></div></details></section></div>
   <div class="col"><section class="card"><div class="eyebrow">${esc(p.pos)} depth chart</div><ol class="cdepth">${dl}</ol><p class="hint">${n === 1 ? 'The top player starts' : `The top ${n} start`}. Your spot depends on your OVR plus your coach's trust.</p>${playWhyHTML()}</section></div></div>`;
}

/* ---------- College football (league) ---------- */
function vCLeague() {
  if (cs.nfl) return nflLeagueView();
  const L = cs.league; const v = cui.lgV;
  const segs = seg('clg', v, [['top25', 'Top 25'], ['stand', 'Standings'], ['post', 'Postseason'], ['heis', 'Heisman watch'], ['hist', 'Champions']]);
  let body = '';
  if (v === 'top25') { const top = Object.values(L.teams).filter(t => t.ap).sort((a, b) => a.ap - b.ap); body = `<div class="tw"><table class="tbl poll"><thead><tr><th>Rank</th><th>Team</th><th>Record</th><th>Conference</th></tr></thead><tbody>${top.map(t => `<tr class="${cs.col && t.id === cs.col.tid ? 'me' : ''}"><td class="rk2">${t.ap}</td><td>${cChip(t.id, { norank: true, rec: false })}</td><td>${t.w}-${t.l}</td><td class="small">${esc(CCONF[t.conf].name)}</td></tr>`).join('')}</tbody></table></div>`; }
  if (v === 'stand') { const cid = cui.lgConf || (cs.col ? LT(cs.col.tid).conf : 'B1G'); const st = lgStandings(L, cid); body = `<label class="fld inl"><span>Conference</span><select id="cconfsel">${Object.values(CCONF).map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label><div class="tw"><table class="tbl"><thead><tr><th>Team</th><th>Conf.</th><th>Overall</th><th>PF</th><th>PA</th></tr></thead><tbody>${st.map(t => `<tr class="${cs.col && t.id === cs.col.tid ? 'me' : ''}"><td>${cChip(t.id, { rec: false })}</td><td>${t.cw}-${t.cl}</td><td>${t.w}-${t.l}</td><td class="num">${t.pf}</td><td class="num">${t.pa}</td></tr>`).join('')}</tbody></table></div>`; }
  if (v === 'post') { const gs = L.games.filter(g => g.type !== 'reg').sort((a, b) => a.wk - b.wk || (a.round || 0) - (b.round || 0)); body = gs.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Game</th><th>Matchup</th><th>Score</th></tr></thead><tbody>${gs.map(g => `<tr class="${cs.col && (g.h === cs.col.tid || g.a === cs.col.tid) ? 'me' : ''}"><td class="small">${esc(g.name || '')}</td><td>${cChip(g.a)} vs ${cChip(g.h)}</td><td class="nowrap">${g.done ? `${g.as}–${g.hs}` : '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Conference title games start after Week 13; the playoff field of 12 is set after that.</p>'; }
  if (v === 'heis') body = heisWatchHTML();
  if (v === 'hist') body = L.hist.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Champion</th><th>Heisman</th><th>Top 5</th></tr></thead><tbody>${L.hist.map(h => `<tr><td>${h.year}</td><td>${esc(cTeamName(h.champ))}</td><td class="small">${h.heis ? esc(h.heis.n) + ', ' + esc(cTeamName(h.heis.tid)) : '—'}</td><td class="small">${h.top.slice(0, 5).map(x => esc(cTeamName(x[0]))).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Champions are listed after the first season.</p>';
  return `<section class="card"><div class="head"><div><div class="eyebrow">${L.year} college football</div><h2 class="h2">${esc({ top25: 'AP Top 25', stand: 'Standings', post: 'Bowls and playoff', heis: 'Heisman watch', hist: 'Past champions' }[v])}</h2></div>${segs}</div>${body}</section>`;
}
function heisWatchHTML() {
  if (cs.lvl !== 'col' || !cs.col) return '<p class="muted">You can win the Heisman once you\'re in college. Here are this season\'s front-runners.</p>' + aiHeisList();
  const p = cs.p; const t = LT(cs.col.tid); const mult = ({ QB: 1, RB: 0.95, WR: 0.9, TE: 0.6, CB: 0.55, S: 0.5, DE: 0.6, LB: 0.55, OL: 0.35, DT: 0.45, K: 0.2, P: 0.15 })[p.pos] || 0.5;
  const wks = Math.min(13, t.w + t.l); // games your team has played, not calendar weeks (CL-13)
  if (!wks || cs.phase !== 'col') return '<p class="small">The Heisman race starts with your first game. Production and winning both count; quarterbacks have the easiest path.</p>' + aiHeisList();
  const my = (cs.ss.imp || 0) * mult * (1 + (t.w - t.l * 0.8 - wks * 0.3) * 0.04);
  return `<p class="small">Your Heisman score so far: <b>${Math.round(my)}</b>. After ${wks} game${wks === 1 ? '' : 's'}, a winner is usually near ${Math.round(360 * wks / 13)}. Production and winning both count; quarterbacks have the easiest path. Only starters are on the ballot.</p>` + aiHeisList();
}
function aiHeisList() { const L = cs.league; const top = Object.values(L.teams).filter(x => x.ap).sort((a, b) => a.ap - b.ap).slice(0, 5); return `<ol class="small">${top.map(x => { const pos = hash(x.id + L.year) < 0.6 ? 'QB' : 'RB'; return `<li>${esc(oppName(x.id, pos))} <span class="muted">${pos}, ${esc(x.name)} (${x.w}-${x.l})</span></li>`; }).join('')}</ol>`; }

/* ---------- Settings ---------- */
function vCSettings() {
  return `${displaySettingsHTML('career')}${cs ? `<section class="card"><div class="eyebrow">Gameplay · career slot ${cslot}</div>
   ${typeof ironRowHTML === 'function' ? ironRowHTML() : ''}
   ${setRow('Difficulty', esc(cdiff().desc), seg('cdiff', cs.diff, Object.entries(CDIFF).map(([k, d]) => [k, d.label])))}
   ${setRow('Pace', esc(PACES[cs.pace][1]), seg('cpace', cs.pace, Object.entries(PACES).map(([k, v]) => [k, v[0]])))}
   ${setRow('Career growth', cs.balV >= 2 ? 'Updated: every player has a natural ceiling, some offseasons are bigger than others, and Pro Bowls go to the best seasons in the league.' : 'Generous: steady growth and easier honors, as before v9.28.', seg('cgrowth', cs.balV >= 2 ? 'upd' : 'gen', [['upd', 'Updated'], ['gen', 'Generous']]))}
   ${setRow('Skill points', 'Spend new skill points automatically, the way your play style would.', seg('cautoset', cs.p.auto ? 'on' : 'off', [['on', 'Automatic'], ['off', 'I\'ll spend them']]))}
   ${setRow('Game speed', 'How fast drives go by while you play a game.', prefSeg('liveSpeed', [[1, 'Normal'], [2, 'Fast'], [3, 'Instant']]))}
   ${setRow('Field view', 'Watch your snaps on a top-down field: you are the dot with the gold ring. The other drives show their scoring plays and turnovers (at Instant, only your snaps).', prefSeg('field', [['on', 'On'], ['off', 'Off']]))}
   ${setRow('Injuries', 'League rule: how often you get hurt in games. Your rest-or-grind choices still count on top of it.', seg('cinj', cs.injRule || 'normal', [['low', 'Fewer'], ['normal', 'Normal'], ['high', 'More']]))}
   ${setRow('Sound', 'A crowd roar for your touchdowns and takeaways in games you play.', seg('csound', cs.sound ? 'on' : 'off', [['on', 'On'], ['off', 'Off']]))}
   <p class="hint mt">Rating and team editors are in <button class="lnk" data-act="ctab" data-tab="admin">Admin</button>. To switch to AD mode, use Home at the top.</p></section>` : ''}`;
}

/* ---------- Save slots and new career ---------- */
function vCSaves() {
  const meta = cMeta();
  const cards = [1, 2, 3, 4, 5].map(i => {
    const m = meta[i]; const has = !!lsGet(CSLOT_KEY(i)); const active = cs && i === cslot;
    const info = has && m ? `<b>${esc(m.name)}</b><div class="small muted">${esc(m.pos)} · ${esc(m.done ? 'Career complete' : m.team || '')} · ${m.year}</div><div>${m.stars ? starsHTML(m.stars) : ''} <span class="small muted">${m.ovr} OVR</span></div><div class="small muted">Saved ${new Date(m.saved).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>` : has ? '<span class="muted">Saved data with no summary (it may be damaged). Try loading it, or delete it.</span>' : '<span class="muted">Empty slot</span>';
    const ck = cui.confirm; const g = has && !active && (cui.badSlots || []).includes(i) ? goodCopy('mfpc-') : null; const gd = g && g.i === i ? g : null;
    const restore = gd ? (ck === 'crg-' + i ? `<button class="btn danger sm" data-act="crestoregood" data-i="${i}">Confirm: restore the copy from ${esc(goodWhen(gd))}</button>` : `<button class="btn sm" data-act="cask2" data-k="crg-${i}">Restore last good copy</button>`) : '';
    const btns = has ? `${restore}${active ? '<span class="pill maize">Playing now</span>' : `<button class="btn sm" data-act="cload" data-i="${i}">Load</button>`}${ck === 'cdel-' + i ? `<button class="btn danger sm" data-act="cdel" data-i="${i}">Confirm delete</button>` : `<button class="btn ghost sm" data-act="cask2" data-k="cdel-${i}">Delete</button>`}<button class="btn ghost sm" data-act="cnew" data-i="${i}">New player here</button>` : `<button class="btn sm" data-act="cnew" data-i="${i}">Create a player here</button>`;
    return `<div class="slotcard${active ? ' on' : ''}"><div class="eyebrow">Slot ${i}</div>${info}<div class="row gap mt">${btns}</div></div>`;
  }).join('');
  const codes = cs ? `<section class="card"><div class="eyebrow">Save codes</div><h2 class="h3">Back up or move a career</h2><p class="small muted">A save code is your whole career as text. Keep it somewhere safe, or paste it into another browser.</p>
   <div class="row gap"><button class="btn sm" data-act="ccode">Create a save code for ${esc(cName(cs.p))}</button>${cui.code ? '<button class="btn ghost sm" data-act="ccopy">Copy</button>' : ''}<span class="small muted" id="ccodemsg">${esc(cui.codeMsg || '')}</span></div>
   ${cui.code ? `<textarea id="ccodeout" class="codebox" readonly aria-label="Save code">${esc(cui.code)}</textarea>` : ''}
   <label class="fld wide mt"><span>Paste a save code (starts with MFPC)</span><textarea id="cimportbox" class="codebox" aria-label="Paste a save code">${esc(cui.importCode || '')}</textarea></label>
   ${cui.importMsg ? `<p class="flash bad">${esc(cui.importMsg)}</p>` : ''}
   <div class="row gap mt">${cui.confirm === 'cimp' ? `<button class="btn danger sm" data-act="cimport">Confirm: replace ${esc(cName(cs.p))} in slot ${cslot}</button>` : `<button class="btn sm" data-act="cask2" data-k="cimp">Load this code into slot ${cslot}</button>`}</div></section>` : `<section class="card"><div class="eyebrow">Save codes</div><label class="fld wide"><span>Paste a save code (starts with MFPC)</span><textarea id="cimportbox" class="codebox" aria-label="Paste a save code">${esc(cui.importCode || '')}</textarea></label>${cui.importMsg ? `<p class="flash bad">${esc(cui.importMsg)}</p>` : ''}<div class="row gap mt"><button class="btn sm" data-act="cimport">Load this code</button></div></section>`;
  cloudKick(); return `${cui.form ? newPlayerForm() : ''}${cloudCardHTML()}${typeof storageNoteHTML === 'function' ? storageNoteHTML() : ''}<section class="card"><div class="head"><div><div class="eyebrow">Player Career</div><h2 class="h2">Five save slots</h2></div><p class="hint" id="csavemsg">${esc(cui.saveMsg || 'These are separate from your five AD mode slots. Careers save automatically after every action.')}</p></div><div class="slots5">${cards}</div></section>${codes}`;
}
function newPlayerForm() {
  const f = cui.form; const styles = CSTYLES[f.pos]; const om = lsGet(CSLOT_KEY(f.slot)) ? (cMeta()[f.slot] || {}) : null; const over = om ? (om.name || 'a career') : '';
  if (!styles.find(s => s[0] === f.style)) f.style = styles[0][0];
  const posBtns = CPOS.map(k => `<button class="evopt${f.pos === k ? ' on' : ''}" data-act="cform" data-k="pos" data-v="${k}" aria-pressed="${f.pos === k}"><b>${k}</b><span>${esc(CPOS_NAME[k])}</span></button>`).join('');
  const styBtns = styles.map(s => `<button class="evopt${f.style === s[0] ? ' on' : ''}" data-act="cform" data-k="style" data-v="${s[0]}" aria-pressed="${f.style === s[0]}"><b>${esc(s[1])}</b><span>${esc(s[2])}</span></button>`).join('');
  const states = Object.entries(CSTATES).sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => `<option value="${k}" ${f.home === k ? 'selected' : ''}>${esc(v)}</option>`).join('');
  return `<section class="card newcareer" id="cnewform"><div class="eyebrow">New player · slot ${f.slot}</div><h2 class="h2">Create your player</h2>${f.err ? `<p class="flash bad">${esc(f.err)}</p>` : ''}
   <div class="fgrid"><label class="fld"><span>First name</span><input id="cf-first" value="${esc(f.first)}" maxlength="18" autocomplete="off"></label><label class="fld"><span>Last name</span><input id="cf-last" value="${esc(f.last)}" maxlength="24" autocomplete="off"></label><label class="fld"><span>Jersey number</span><input id="cf-num" type="number" min="0" max="99" value="${esc(f.num)}"></label><label class="fld"><span>Home state</span><select id="cf-home">${states}</select></label></div>
   <div class="eyebrow mt">Position</div><div class="posgrid">${posBtns}</div>
   ${TWO_WAY[f.pos] ? `<div class="setrow"><div class="sl"><b>Two-way player</b><span class="hint">Also play ${esc(CPOS_NAME[TWO_WAY[f.pos]].toLowerCase())}. More snaps and more attention, starting with lower ratings at the second position.</span></div><div class="sctl">${seg('cform', f.two === 'on' ? 'on' : 'off', [['off', 'One position'], ['on', 'Two-way']], 'data-k="two"')}</div></div>` : ''}
   <div class="eyebrow mt">Play style</div><div class="evopts">${styBtns}</div>
   <div class="eyebrow mt">Where to start</div><div class="evopts"><button class="evopt${f.path === 'hs' ? ' on' : ''}" data-act="cform" data-k="path" data-v="hs" aria-pressed="${f.path === 'hs'}"><b>High school</b><span>Four seasons to earn your stars and your offers.</span></button><button class="evopt${f.path === 'college' ? ' on' : ''}" data-act="cform" data-k="path" data-v="college" aria-pressed="${f.path === 'college'}"><b>Skip to college</b><span>Start as a recruit with a star rating you choose.</span></button></div>
   ${f.path === 'college' ? `<div class="setrow"><div class="sl"><b>Star rating</b><span class="hint">More stars: more offers, more NIL money, higher starting ratings, and tougher competition at the top schools.</span></div><div class="sctl">${seg('cform', String(f.stars), [1, 2, 3, 4, 5].map(n => [String(n), n + '★']), 'data-k="stars"')}</div></div>` : `<label class="fld wide"><span>High school name (optional)</span><input id="cf-hs" value="${esc(f.hsName || '')}" maxlength="28" placeholder="Leave blank for a random one"></label>`}
   <div class="setrow"><div class="sl"><b>Difficulty</b><span class="hint">${esc(CDIFF[f.diff].desc)}</span></div><div class="sctl">${seg('cform', f.diff, Object.entries(CDIFF).map(([k, d]) => [k, d.label]), 'data-k="diff"')}</div></div>
   <div class="setrow"><div class="sl"><b>Pace</b><span class="hint">${esc(PACES[f.pace][1])}</span></div><div class="sctl">${seg('cform', f.pace, Object.entries(PACES).map(([k, v]) => [k, v[0]]), 'data-k="pace"')}</div></div>
   ${over ? `<p class="flash bad">Slot ${f.slot} holds ${esc(over)}. Starting here replaces that career for good.</p>` : ''}
   <div class="row gap mt">${over && cui.confirm !== 'over-' + f.slot ? `<button class="btn primary" data-act="cask2" data-k="over-${f.slot}">Start the career</button>` : `<button class="btn ${over ? 'danger' : 'primary'}" data-act="cstart">${over ? 'Confirm: replace it' : 'Start the career'}</button>`}<button class="btn ghost" data-act="ccancel">Cancel</button></div></section>`;
}
function readCForm() { const f = cui.form; if (!f) return; const g = id => { const e = document.getElementById(id); return e ? e.value : null; }; [['cf-first', 'first'], ['cf-last', 'last'], ['cf-num', 'num'], ['cf-home', 'home'], ['cf-hs', 'hsName']].forEach(([id, k]) => { const v = g(id); if (v != null) f[k] = v; }); }

/* ---------- Admin: team editor and personal ratings ---------- */
function vCAdmin() {
  const p = cs.p; const tid = cui.admT || (cs.col ? cs.col.tid : 'MICH'); const t = cs.league.teams[tid];
  const opts = Object.values(cs.league.teams).sort((a, b) => a.name.localeCompare(b.name)).map(x => `<option value="${x.id}" ${x.id === tid ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  const num = (k, v, min, max, lbl, extra) => `<label class="fld"><span>${lbl}</span><input type="number" min="${min}" max="${max}" value="${v}" data-cadm="${k}" ${extra || ''}></label>`;
  return `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">Admin · personal ratings</div><h2 class="h3">${esc(cName(p))}</h2><p class="hint">Changes apply right away. OVR is ${cOvr(p)}.</p>
   <div class="fgrid">${CATTR[p.pos].map(([k, l]) => num('a:' + k, p.a[k], 20, 99, esc(l))).join('')}${num('stars', p.stars || 1, 1, 5, 'Recruiting stars')}${num('xp', p.xp, 0, 999, 'Skill points')}${cs.col ? num('trust', p.trust, 0, 100, 'Coach trust') : ''}</div></section></div>
   <div class="col"><section class="card"><div class="eyebrow">Admin · teams</div><label class="fld"><span>Team</span><select id="cadmteam">${opts}</select></label>
   <div class="fgrid"><label class="fld"><span>Name</span><input value="${esc(t.name)}" data-cadm="t:name" maxlength="26"></label>${num('t:rating', t.rating, 30, 99, 'Overall rating')}${num('t:off', t.off, 30, 99, 'Offense')}${num('t:def', t.def, 30, 99, 'Defense')}<label class="fld"><span>Head coach</span><input value="${esc(t.coach)}" data-cadm="t:coach" maxlength="26"></label></div>
   <p class="hint">Ratings change how the team plays from the next game on. Recruiting interest and offers follow the new rating.</p></section></div></div>`;
}
function cAdmSet(k, el) {
  const p = cs.p; const tid = cui.admT || (cs.col ? cs.col.tid : 'MICH'); const t = cs.league.teams[tid]; const v = el.value;
  if (el.dataset.was === v) return; el.dataset.was = v;
  const n = Math.round(+v);
  if (k.startsWith('a:')) { if (!Number.isFinite(n)) return; p.a[k.slice(2)] = clamp(n, 20, 99); }
  else if (k === 'stars') { if (!Number.isFinite(n)) return; p.stars = clamp(n, 1, 5); const target = { 1: 55, 2: 62, 3: 69.5, 4: 76, 5: 82 }[p.stars]; if (p.rec.fixed != null) p.rec.fixed = target; else p.rec.camp = r1((p.rec.camp || 0) + target - recruitScore()); p.rec.score = p.rec.fixed != null ? p.rec.fixed : recruitScore(); }
  else if (k === 'xp') { if (Number.isFinite(n)) p.xp = clamp(n, 0, 999); }
  else if (k === 'trust') { if (Number.isFinite(n)) p.trust = clamp(n, 0, 100); }
  else if (k === 't:name') { const s = String(v).trim().slice(0, 26); if (s) t.name = s; }
  else if (k === 't:coach') { const s = String(v).trim().slice(0, 26); if (s) t.coach = s; }
  else if (k.startsWith('t:')) { if (!Number.isFinite(n)) return; t[k.slice(2)] = clamp(n, 30, 99); if (k === 't:rating') { t.off = r1(clamp(t.rating + (t.off - t.def) / 2, 30, 99)); t.def = r1(clamp(2 * t.rating - t.off, 30, 99)); } else t.rating = r1((t.off + t.def) / 2); rosterCache.clear(); }
  cs.admin++; cSave(); cui.flash = 'Saved.'; render(); refocus({ cadm: k });
}

/* ---------- the game dialog ---------- */
function cgView(keepSel) {
  const g = cg; if (!g) return; const p = cs.p; const dec = g.pending; const last = g.log[0];
  const side = s => `<div class="bt${s === g.mi ? ' me' : ''}"><span class="bn"><span class="full">${esc(g.names[s])}</span><span class="abbr">${esc(g.ids[s])}</span></span><span class="brec">${s === g.mi ? 'You' : 'Opp.'}</span><b class="bs">${g.pts[s]}</b></div>`;
  const c = cgBoardClock(g);
  const curQ = g.done ? 9 : c.qtr || 0;
  const lrow = s => `<tr class="${s === g.mi ? 'me' : ''}"><th scope="row">${esc(g.ids[s])}</th>${g.q[s].slice(0, g.ot ? 5 : 4).map((v, i) => `<td>${i + 1 <= curQ || g.done ? v : '–'}</td>`).join('')}<td class="tot">${g.pts[s]}</td></tr>`;
  const line = `<table class="lscore"><caption class="sr-only">Score by quarter</caption><thead><tr><th scope="col"><span class="sr-only">Team</span></th>${[1, 2, 3, 4].concat(g.ot ? ['OT'] : []).map(q => `<th scope="col">${q}</th>`).join('')}<th scope="col">T</th></tr></thead><tbody>${lrow(1)}${lrow(0)}</tbody></table>`;
  const outTxt = o => ({ td: 'Touchdown', fg: 'Field goal', miss: 'Missed field goal', punt: 'Punt', to: 'Turnover', downs: 'On downs' }[o] || o);
  // at Instant speed the drives fly by, so your own result stays up until your next snap (CL-09)
  const lp = cui.gRes && (+prefs.liveSpeed === 3 || g.i - (cui.gResI || 0) <= 2) ? `<div class="lastplay big me"><span class="lpk">${esc(cui.gRes.kind === 'ok' ? 'Your play' : cui.gRes.kind === 'mid' ? 'Close call' : 'Your play')}</span><span class="lpt">${esc(cui.gRes.txt)}</span></div>` : last ? `<div class="lastplay${g.names[last.s] && last.s === g.mi ? ' me' : ''}"><span class="lpk">${esc(outTxt(last.out))}</span><span class="lpt"><b>${esc(g.ids[last.s])}</b> ${last.np} plays, ${last.yds} yds${last.me ? ' · You: ' + esc(last.me) : ''}</span></div>` : `<div class="lastplay"><span class="lpk">Kickoff</span><span class="lpt">${esc(g.names[g.first])} get the ball first.</span></div>`;
  let panel = '';
  if (dec) {
    const where = g.side === 'off' ? `${dec.yl} yards to the end zone` : `They need ${dec.yl} yards to score`;
    panel = `<div class="decision" id="cdec"><div class="eyebrow">Q${dec.clk.qtr} · ${dec.clk.clock} · ${dec.down === 1 ? '1st' : dec.down === 2 ? '2nd' : '3rd'} &amp; ${Math.min(dec.dist, dec.yl)} · ${esc(where)}</div><h3 class="h3">${esc(dec.title)}</h3><p class="look"><b>Pre-snap read:</b> ${esc(dec.look)}</p><div class="evopts">${dec.opts.map((k, i) => { const o = optDef(p.pos, k); return `<button class="evopt" data-act="cpick" data-k="${k}"${i === 0 ? ' id="cfirstopt"' : ''}><b>${esc(o.label)}</b><span>${esc(o.hint)}</span></button>`; }).join('')}</div></div>`;
  } else if (g.done) {
    const r = cui.lastRec;
    panel = `<div class="gsum"><div class="eyebrow">Final${g.ot ? ' (OT)' : ''}: ${g.pts[g.mi] > g.pts[1 - g.mi] ? 'you won' : 'you lost'} ${g.pts[g.mi]}–${g.pts[1 - g.mi]}</div>${r && r.role !== 'Not playing' ? `<div class="gsrow">${gradeHTML(r.grade)}<div><div class="sline">${statLineHTML(g.line, p.pos)}</div><p class="small">+${r.xp} skill points${r.trust != null ? ` · Coach trust ${r.trust >= 0 ? '+' : ''}${r.trust}` : ''} ${g.decN ? `· ${g.decOk} of ${g.decN} snap decisions worked` : ''}${r.inj ? ` · <b class="neg">Injured: ${esc(r.inj)}</b>` : ''}</p></div></div>` : '<p class="muted">You didn\'t get into this one.</p>'}<div class="row gap"><button class="btn primary" data-act="cgdone" id="cgdonebtn">Continue</button>${cs.ss && cs.ss.games.length && cs.ss.games[cs.ss.games.length - 1].hl ? `<button class="btn" data-act="chlwatch" data-i="${cs.ss.games.length - 1}">Watch the highlights</button>` : ''}</div></div>`;
  }
  const controls = !g.done && !dec ? `<div class="row gap"><span class="small muted">Playing to your next snap…</span><button class="btn ghost sm" data-act="cgauto">Sim the rest of the game</button><label class="chk small"><input type="checkbox" id="cfield" ${fieldOn() ? 'checked' : ''}> Field view</label></div>` : !g.done ? `<div class="row gap"><button class="btn ghost sm" data-act="cgauto">Let the computer decide the rest</button><label class="chk small"><input type="checkbox" id="cfield" ${fieldOn() ? 'checked' : ''}> Field view</label></div>` : '';
  const logRows = g.log.slice(0, 40).map(x => `<li class="${x.out === 'td' || x.out === 'fg' ? 'sc' : ''}${x.dec ? ' mine' : ''}"><span class="when">${x.qtr > 4 ? 'OT' : 'Q' + x.qtr + ' ' + x.clock}</span><span><b>${esc(g.ids[x.s])}</b> ${esc(outTxt(x.out))} · ${x.np} plays, ${x.yds} yds${x.txt ? `<br><span class="you">You: ${esc(x.txt)}</span>` : x.me ? ` <span class="muted">· You: ${esc(x.me)}</span>` : ''}</span></li>`).join('');
  const mb = $('#modal .mbody');
  mb.innerHTML = `<div class="live cgame"><div class="lhead"><div class="eyebrow">${esc(cWeekLabel(g.wk, g.lvl))}${g.name ? ' · ' + esc(g.name) : ''} · ${g.done ? 'Final' : 'Live'}</div><span class="small muted">${esc(g.role)} · ${esc(p.pos)}${g.share > 0 && g.share < 0.3 ? ' (you play if the game gets out of hand)' : ''}</span></div>
   <div class="bug">${side(1)}<div class="bclock"><b>${g.done ? 'Final' : last ? (c.qtr > 4 ? 'OT' : 'Q' + c.qtr) : 'Pregame'}</b><span>${g.done ? '' : last ? esc(c.clock) : 'Kickoff'}</span></div>${side(0)}</div>
   ${fieldOn() ? '<div class="pfslot"></div>' : ''}
   <div class="lrow">${line}${lp}</div><div class="myline small"><b>Your game:</b> ${esc(lineText(g.line, p.pos) || 'nothing yet')}</div>
   ${panel}${controls}<ul class="plays livelog">${logRows || '<li><span class="when"></span><span class="muted">Kickoff is coming up.</span></li>'}</ul></div>`;
  const m = $('#modal'); if (m.hidden) showModal('Game'); if (fieldOn()) pfSyncCareer();
  const f = keepSel ? mb.querySelector(keepSel) : dec ? $('#cfirstopt') : g.done ? $('#cgdonebtn') : null;
  if (f) f.focus({ preventScroll: true });
}
// Drives go by one at a time until the player's next snap decision (or the final whistle).
function cgRun() {
  clearTimeout(cui.gTimer); if (!cg) return;
  const delay = [0, 420, 170, 0][prefs.liveSpeed] || 0;
  const tick = () => {
    if (!cg || $('#modal').hidden) return;
    let steps = 0;
    do { cgStep(cg); steps++; } while (!delay && !cg.pending && !cg.done && steps < 200);
    if (cg.done && !cui.lastRec) { const g = cg; cui.lastRec = cFinishGame(g); cEndWeek(); cg = g; cSave(); }
    cgView();
    if (!cg.pending && !cg.done) cui.gTimer = setTimeout(tick, Math.max(delay, delay && fieldOn() ? pfLeft() : 0)); /* with the field view on, the next drive waits for the play on screen */
  };
  if (delay && fieldOn() && pfLeft() > 50) cui.gTimer = setTimeout(tick, pfLeft()); else tick(); /* let your snap finish playing first */
}
function openGame() {
  if (!cg) { if (!cStartGame()) return; cui.lastRec = null; cSave(); } // the save marks the game as started, so a reload settles it
  cui.gRes = null; cgView(); cgRun();
}

cSaveStatus = (i, good, metaOk) => {
  if (i !== cslot) return;
  cui.saveMsg = good && metaOk === false ? `Saved to slot ${i}, but the slot list could not be updated. It will try again with your next save.` : good ? `Saved to slot ${i} · ` + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Could not save. Browser storage is full or blocked. Create a save code below to keep your progress.';
  const el = document.getElementById('csavemsg'); if (el) el.textContent = cui.saveMsg;
  if (appMode === 'career' && !good && !document.querySelector('#view [data-act=cretry]')) render();
  if (appMode === 'career' && good && document.querySelector('#view [data-act=cretry]')) render();
};

/* ---------- NFL ---------- */
function nChip(id, o) {
  o = o || {}; const t = NFL_BY[id]; if (!t) return esc(String(id || 'TBD'));
  const L = cs && cs.nfl && cs.nfl.L; const r = L && L.teams[id]; const me = cs && cs.nfl && cs.nfl.tm === id;
  return `<span class="team nflt"><i class="nsw" style="background:${t.c1};border-color:${t.c2}" aria-hidden="true"></i><span class="tn${me ? ' me' : ''}">${esc(o.short ? t.nick : t.name)}</span>${o.rec === false || !r ? '' : ` <span class="rec">${r.w}-${r.l}</span>`}</span>`;
}
function seasonTeamHTML(s) { return s.lvl === 'hs' ? esc(s.team) : s.lvl === 'nfl' ? nChip(s.team, { rec: false }) : cChip(s.team, { rec: false, norank: true }); }
function nflPoTotal() {
  const ss = cs.p.seasons.filter(s => s.lvl === 'nfl' && s.pgp); if (!ss.length) return ''; const cols = cStatCols(cs.p); const T = {}; ss.forEach(s => Object.entries(s.pst || {}).forEach(([k, v]) => T[k] = (T[k] || 0) + v));
  return `<tr class="me"><td colspan="3"><b>NFL playoffs</b></td><td class="num">${ss.reduce((a, s) => a + s.pgp, 0)}</td><td class="num">—</td>${cols.map(k => `<td class="num"><b>${T[k] || 0}</b></td>`).join('')}<td></td><td></td></tr>`;
}
function contractText(c) { return `${money(c.apy)} a year · ${c.left} year${c.left === 1 ? '' : 's'} left${c.kind === 'rookie' ? ' (rookie deal)' : c.kind === 'option' ? ' (fifth-year option)' : c.kind === 'udfa' ? ' (undrafted free agent)' : c.kind === 'min' ? ' (veteran minimum)' : ''}`; }
function nflCard() {
  const n = cs.nfl; const p = cs.p; const d = myDepth();
  return `<section class="card"><div class="eyebrow">${nChip(n.tm, { rec: false })}</div><div class="meter"><div class="mrow"><span class="lbl">Coach trust</span><span class="mval ${p.trust >= 60 ? 'good' : p.trust < 40 ? 'bad' : ''}">${p.trust}</span></div><div class="bar"><i class="${p.trust >= 60 ? 'good' : p.trust < 40 ? 'bad' : 'warn'}" style="width:${p.trust}%"></i></div></div>
   <p class="small">Contract: <b>${esc(contractText(n.contract))}</b></p><p class="small">Depth chart: No. ${d.rank + 1} ${esc(p.pos)} · Age ${n.age} · NFL seasons: ${n.yrs}</p><button class="btn ghost sm" data-act="ctab" data-tab="team">Team and depth chart</button></section>`;
}
function nflReviewHTML(r) {
  if (!r) return ''; const e = r.e; const p = cs.p; const avg = e.ratio != null ? gradeOf(e.ratio)[1] : null;
  const ck = cui.confirm === 'retire';
  return `<h2 class="h3">${e.year} season review</h2><div class="tiles"><div><span class="k">Team</span><span class="v sm">${esc(e.rec)}</span><span class="s">${esc(e.post || '')}</span></div><div><span class="k">Games</span><span class="v">${e.gp}</span><span class="s">${e.gs} starts${e.pgp ? ` · ${e.pgp} playoff` : ''}</span></div><div><span class="k">Season grade</span><span class="v">${avg || '—'}</span></div><div><span class="k">OVR</span><span class="v">${e.ovr}</span><span class="s">age ${e.age}</span></div></div>
   <div class="sline mt">${statLineHTML(e.st, p.pos)}</div>${e.pgp ? `<p class="small muted">Playoffs: ${esc(lineText(e.pst || {}, p.pos) || '—')}</p>` : ''}
   ${e.awards.length ? `<p><b>Honors:</b> ${e.awards.map(esc).join(', ')}</p>` : '<p class="small muted">No league honors this season.</p>'}
   <p class="small muted">${esc(nflName(r.champ))} beat the ${esc(nflName(r.runner))} in the Super Bowl.</p>
   <div class="row gap mt">${ck ? '<button class="btn danger sm" data-act="cretire">Confirm: retire now</button><button class="btn ghost sm" data-act="cask2" data-k="retire">Keep playing</button>' : `<button class="btn ghost sm" data-act="cask2" data-k="retire">Retire</button>`}</div>`;
}
function nflMoneyHTML() {
  const n = cs.nfl; const c = n.contract; const F = n.fa; const mkt = nflMarket();
  if (F && !F.done) {
    const head = F.why === 'cut' ? `The ${esc(nflName(n.tm))} released you. You're a free agent.` : 'Your contract is up. You\'re a free agent.';
    const rows = F.offers.map((o, i) => `<tr class="${o.kind === 'resign' ? 'me' : ''}"><td>${nChip(o.tm, { rec: false })}${o.kind === 'resign' ? ' <span class="pill maize">Your team</span>' : ''}<div class="small muted">Team strength ${o.pow >= 84 ? 'contender' : o.pow >= 74 ? 'playoff hopeful' : 'rebuilding'}</div></td><td class="num">${money(o.apy)}</td><td class="num">${o.yrs}</td><td class="num">${o.bonus ? money(o.bonus) : '—'}</td><td class="small">${esc(o.role)}</td><td>${cui.confirm === 'fa-' + i ? `<button class="btn danger sm" data-act="cfa" data-i="${i}">Confirm: sign</button>` : `<button class="btn primary sm" data-act="cask2" data-k="fa-${i}">Sign</button>`}</td></tr>`).join('');
    return `<h2 class="h3">Free agency</h2><p>${head} Your market value is about <b>${money(mkt)}</b> a year.</p>
     ${rows ? `<div class="tw"><table class="tbl"><thead><tr><th>Team</th><th>Per year</th><th>Years</th><th>Bonus</th><th>Your role</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="flash bad">No team has made an offer.</p>`}
     <div class="row gap mt">${F.round < 3 ? `<button class="btn" data-act="cfawait">Wait for more offers (${3 - F.round} left)</button>` : ''}${cui.confirm === 'retire' ? '<button class="btn danger" data-act="cretire">Confirm: retire</button>' : '<button class="btn ghost" data-act="cask2" data-k="retire">Retire</button>'}</div>
     <p class="hint">Waiting can bring new offers, but teams fill their rosters and some offers get pulled.</p>`;
  }
  const signed = F && F.done && F.signed ? `<p class="flash">Signed with the ${esc(nflName(F.signed))}: ${esc(contractText(c))}.</p>` : '';
  const ext = c.left === 1 ? (n.asked === 'ext' ? '' : '<button class="btn" data-act="cext">Ask for an extension</button>') : '';
  const trade = n.asked === 'trade' ? '' : (cui.confirm === 'trade' ? '<button class="btn danger" data-act="ctrade">Confirm: ask for a trade</button>' : '<button class="btn ghost" data-act="cask2" data-k="trade">Request a trade</button>');
  const hold = canHoldout() ? (cui.confirm === 'hold' ? '<button class="btn danger" data-act="chold">Confirm: hold out</button>' : `<button class="btn ghost" data-act="cask2" data-k="hold">Hold out for a new deal (about ${Math.round(holdoutOdds() * 100)}%)</button>`) : '';
  return `<h2 class="h3">Contract</h2>${signed}<p>You're under contract with the ${esc(nflName(n.tm))}: <b>${esc(contractText(c))}</b>.</p><p class="small">Market value right now: about <b>${money(mkt)}</b> a year. ${c.left === 1 ? 'This is the last year of your deal: a starter who outplays his contract can ask for an extension.' : ''}</p>
   <div class="row gap">${ext}${hold}${trade}</div><p class="hint">A trade request works more often for a good player on a fair deal. If it's turned down, your coach's trust drops.${hold ? ' A holdout can get you paid now; if it fails you pay fines, lose trust and miss camp.' : ''}</p>`;
}
function nflTrainHTML() {
  const o = cs.off; const log = (o.ageLog || []).map(([k, v]) => `${esc(CATTR[cs.p.pos].find(a => a[0] === k)[1])} ${v > 0 ? '+' : ''}${v}`).join(', ');
  return `<h2 class="h3">Offseason training</h2><p>${cs.nfl.age + 1 > NFL_PEAK[cs.p.pos] ? 'Age is starting to show.' : 'Another year stronger.'} ${log ? `Changes: ${log}.` : 'No change in your ratings.'}${o.growXP ? ` You earned <b>${o.growXP} skill points</b>.` : ''} You have <b>${cs.p.xp}</b> to spend.</p><div class="row gap"><button class="btn" data-act="ctab" data-tab="player">Spend skill points</button><button class="btn ghost" data-act="ctab" data-tab="nil">Training programs</button></div>`;
}
function nflScheduleHTML() {
  const n = cs.nfl; if (!n.L) return '<section class="card"><p class="muted">The schedule comes out when the season starts.</p></section>';
  const N = n.L; const tm = n.tm; const gs = N.games.filter(g => g.h === tm || g.a === tm).sort((a, b) => a.wk - b.wk); const t = N.teams[tm];
  const rows = []; for (let wk = 1; wk <= 22; wk++) { const g = gs.find(x => x.wk === wk); if (!g) { if (wk <= 18) rows.push(`<tr class="${wk === cs.week && cs.phase === 'nfl' ? 'cur' : ''}"><td class="nowrap">Week ${wk}</td><td class="muted" colspan="4">Bye</td></tr>`); continue; }
    const home = g.h === tm; const opp = home ? g.a : g.h; const r = cs.ss && cs.ss.games.find(x => x.wk === g.wk && cs.year === N.year); const won = g.done && nflWinner(g) === tm;
    rows.push(`<tr class="${g.wk === cs.week && cs.phase === 'nfl' ? 'cur' : ''}"><td class="nowrap">${esc(g.name || nflWeekLabel(g.wk))}</td><td>${g.neutral ? 'vs' : home ? 'vs' : 'at'} ${nChip(opp)}${g.div ? ' <span class="site">division</span>' : ''}</td><td class="nowrap">${g.done ? `<b>${won ? 'W' : 'L'}</b> ${home ? g.hs : g.as}–${home ? g.as : g.hs}${g.ot ? ' (OT)' : ''}` : '<span class="muted">—</span>'}</td><td class="small">${r && r.role !== 'Not playing' ? statLineShort(r.line) : r ? '<span class="muted">DNP</span>' : ''}</td><td>${r ? gradeHTML(r.grade, true) : ''}</td></tr>`); }
  return `<section class="card"><div class="head"><div><div class="eyebrow">${N.year} schedule</div><h2 class="h2">${esc(nflName(tm))}</h2></div><p class="hint">${t.w}-${t.l} · ${t.dw}-${t.dl} in the ${esc(NFL_BY[tm].conf + ' ' + NFL_BY[tm].div)}.${seedOf(N, tm) ? ' Playoff seed No. ' + seedOf(N, tm) + '.' : ''} Player Career uses a simpler league schedule than NFL GM mode: 17 games, but division games can vary.</p></div><div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Opponent</th><th>Result</th><th>Your game</th><th>Grade</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></section>`;
}
function nflMoneyView() {
  const p = cs.p; const n = cs.nfl; cs.bought = cs.bought || {};
  const shop = TRAIN.map(t => { const cost = trainCost(t); const has = cs.bought[t.id] === cs.year; const can = p.bank >= cost && !has && trainLeft() > 0; return `<div class="cand"><div><b>${esc(t.name)}</b> <span class="muted">· ${money(cost)}</span><div class="small muted">${esc(t.desc)}</div></div>${has ? '<span class="pill good">Done this year</span>' : `<button class="btn sm" data-act="ctrain" data-id="${t.id}" ${can ? '' : 'disabled'}>Buy</button>`}</div>`; }).join('');
  const log = cs.nilLog.slice(0, 30).map(l => `<tr><td>${l.y}</td><td>${esc(l.txt)}</td><td class="num ${l.amt < 0 ? 'neg' : 'pos'}">${l.amt < 0 ? '−' : '+'}${money(Math.abs(l.amt))}</td></tr>`).join('');
  const moves = (n.moves || []).slice().reverse().map(m => `<li><span class="when">${m.y}</span>${esc(m.txt)}</li>`).join('');
  return `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">Money</div><h2 class="h2">${money(p.bank)} in the bank</h2><p>${nChip(n.tm, { rec: false })}: <b>${esc(contractText(n.contract))}</b></p><div class="tiles"><div><span class="k">NFL earnings</span><span class="v">${money(n.earn || 0)}</span></div><div><span class="k">Career earnings</span><span class="v">${money(p.earned)}</span></div><div><span class="k">Spent on training</span><span class="v">${money(p.spent)}</span></div><div><span class="k">Market value</span><span class="v">${money(nflMarket())}</span><span class="s">per year</span></div></div></section>
   <section class="card"><div class="eyebrow">Invest in yourself</div><p class="small muted">Each program can be bought once a year, and you can do ${TRAIN_CAP} programs a year. ${trainLeft() > 0 ? `${trainLeft()} left this year.` : 'You\'ve done your two for this year.'}</p>${shop}</section></div>
   <div class="col">${endorseCardHTML()}${moves ? `<section class="card"><div class="eyebrow">Transactions</div><ul class="news">${moves}</ul></section>` : ''}<section class="card"><div class="eyebrow">Ledger</div>${log ? `<div class="tw"><table class="tbl"><tbody>${log}</tbody></table></div>` : '<p class="muted">Nothing yet.</p>'}</section></div></div>`;
}
function nflTeamView() {
  const n = cs.nfl; const p = cs.p; const st = START_N[p.pos]; const d = myDepth(); const N = n.L; const t = N && N.teams[n.tm];
  const dl = d.all.slice(0, 10).map((x, i) => `<li class="${x.me ? 'me' : ''}${i < st ? ' st' : ''}"><span class="ord">${i + 1}</span><span class="nm">${esc(x.n)}${x.me ? ' <span class="pill maize">You</span>' : ''}</span><span class="small muted">${x.me ? '' : 'age ' + x.age}</span>${ovrHTML(x.ovr)}</li>`).join('');
  const roster = nflRoster(n.tm, cs.year).slice().sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr);
  const hist = n.hist.slice().reverse().map(h => `<tr><td>${h.year}</td><td>${nChip(h.tm, { rec: false })}</td><td>${h.w}-${h.l}</td><td class="small">${esc(h.post)}</td></tr>`).join('');
  return `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">${esc(NFL_BY[n.tm].conf + ' ' + NFL_BY[n.tm].div)}</div><h2 class="h2">${esc(nflName(n.tm))}</h2>${t ? `<p>${t.w}-${t.l}${seedOf(N, n.tm) ? ' · Playoff seed No. ' + seedOf(N, n.tm) : ''}</p>` : ''}
    <div class="meter"><div class="mrow"><span class="lbl">Coach trust</span><span class="mval">${p.trust}</span></div><div class="bar"><i class="${p.trust >= 60 ? 'good' : p.trust < 40 ? 'bad' : 'warn'}" style="width:${p.trust}%"></i></div></div>
    <p class="small">Contract: ${esc(contractText(n.contract))}</p>${n.contract && n.contract.apy ? `<p class="small muted">Take-home this year: about ${esc(money(n.contract.apy * (1 - agentFee())))} after your agent's ${Math.round(agentFee() * 100)}% (before taxes)${n.contract.left > 1 ? `; about ${esc(money(n.contract.apy * (1 - agentFee()) * n.contract.left))} over the ${n.contract.left} years left` : ''}.</p>` : ''}</section>
   ${hist ? `<section class="card"><div class="eyebrow">Your NFL seasons</div><div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Team</th><th>Record</th><th>Postseason</th></tr></thead><tbody>${hist}</tbody></table></div></section>` : ''}
   <section class="card"><details><summary class="eyebrow">Full roster (${roster.length})</summary><div class="tw"><table class="tbl"><thead><tr><th>#</th><th>Name</th><th>Pos</th><th>Age</th><th>OVR</th></tr></thead><tbody>${roster.map(x => `<tr><td class="num">${x.num}</td><td>${esc(x.n)}</td><td>${x.pos}</td><td>${x.age}</td><td>${ovrHTML(x.ovr)}</td></tr>`).join('')}</tbody></table></div></details></section></div>
   <div class="col"><section class="card"><div class="eyebrow">${esc(p.pos)} depth chart</div><ol class="cdepth">${dl}</ol><p class="hint">${st === 1 ? 'The top player starts' : `The top ${st} start`}. Your spot depends on your OVR, your coach's trust and, early on, where you were drafted.</p>${playWhyHTML()}</section></div></div>`;
}
function nflLeagueView() {
  const n = cs.nfl; const N = n.L; const v = ['stand', 'po', 'awards', 'hist'].includes(cui.nlgV) ? cui.nlgV : 'stand';
  const segs = seg('cnlg', v, [['stand', 'Standings'], ['po', 'Playoffs'], ['awards', 'Awards'], ['hist', 'Champions']]);
  let body = '';
  if (!N) body = '<p class="muted">The league table appears when the season starts.</p>';
  else if (v === 'stand') body = ['AFC', 'NFC'].map(cf => `<div class="eyebrow mt">${cf}</div><div class="nfldivs">${NFL_DIVS.map(dv => { const ts = Object.values(N.teams).filter(t => NFL_BY[t.id].conf === cf && NFL_BY[t.id].div === dv).sort(nflRank); return `<div class="tw"><table class="tbl"><thead><tr><th>${cf} ${dv}</th><th>W-L</th><th>Div</th><th>PF</th><th>PA</th></tr></thead><tbody>${ts.map(t => `<tr class="${t.id === n.tm ? 'me' : ''}"><td>${nChip(t.id, { rec: false, short: true })}${seedOf(N, t.id) ? ` <span class="pill ghost">${seedOf(N, t.id)}</span>` : ''}</td><td>${t.w}-${t.l}</td><td>${t.dw}-${t.dl}</td><td class="num">${t.pf}</td><td class="num">${t.pa}</td></tr>`).join('')}</tbody></table></div>`; }).join('')}</div>`).join('');
  else if (v === 'po') { const gs = N.games.filter(g => g.type === 'po').sort((a, b) => a.wk - b.wk); body = gs.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Round</th><th>Matchup</th><th>Score</th></tr></thead><tbody>${gs.map(g => `<tr class="${g.h === n.tm || g.a === n.tm ? 'me' : ''}"><td class="small">${esc(g.name)}</td><td>${nChip(g.a, { rec: false })} <span class="muted">(${seedOf(N, g.a)})</span> ${g.neutral ? 'vs' : 'at'} ${nChip(g.h, { rec: false })} <span class="muted">(${seedOf(N, g.h)})</span></td><td class="nowrap">${g.done ? `${g.as}–${g.hs}` : '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Seven teams from each conference make the playoffs after Week 18. Division winners take the top four seeds, and the No. 1 seed gets a bye.</p>'; }
  else if (v === 'awards') { const last = n.champs[0]; const A = last && last.aw; body = A ? `<p class="small muted">${last.year} season</p><ul class="news">${[['mvp', 'MVP'], ['opoy', 'Offensive Player of the Year'], ['dpoy', 'Defensive Player of the Year'], ['oroy', 'Offensive Rookie of the Year'], ['droy', 'Defensive Rookie of the Year'], ['sbmvp', 'Super Bowl MVP']].filter(([k]) => A[k]).map(([k, l]) => `<li class="${A[k].me ? 'win' : ''}"><span class="when">${esc(l)}</span>${esc(A[k].n)}, ${esc(A[k].pos)}, ${esc(nflName(A[k].tm))}</li>`).join('')}</ul>` : '<p class="muted">Awards are handed out after the Super Bowl.</p>'; }
  else body = n.champs.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Champion</th><th>Runner-up</th><th>MVP</th></tr></thead><tbody>${n.champs.map(h => `<tr><td>${h.year}</td><td>${nChip(h.champ, { rec: false })}</td><td>${nChip(h.runner, { rec: false })}</td><td class="small">${h.aw && h.aw.mvp ? esc(h.aw.mvp.n) + ', ' + esc(NFL_BY[h.aw.mvp.tm].nick) : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Champions are listed after your first season.</p>';
  return `<section class="card"><div class="head"><div><div class="eyebrow">${N ? N.year : cs.year} NFL</div><h2 class="h2">${esc({ stand: 'Standings', po: 'Playoffs', awards: 'League awards', hist: 'Super Bowl champions' }[v])}</h2></div>${segs}</div>${body}</section>`;
}
function vCRetired() { return vCRetiredBase() + nextChapterHTML(); }
// what comes after playing: coaching (a Coach mode career) or the broadcast booth
function careerRepBonus() { const sc = cs.nfl && cs.nfl.retired ? cs.nfl.retired.hof : 0; return clamp(Math.round(sc / 6 + (cs.p.awards || []).length * 0.8), 2, 20); }
function nextChapterHTML() {
  if (cs.after === 'booth') return `<section class="card"><div class="eyebrow">Next chapter</div><h2 class="h3">In the broadcast booth</h2><p>${esc(cName(cs.p))} calls games as a national analyst, ${cs.p.fol ? `with ${folTxt(cs.p.fol)} followers along for the ride` : 'a familiar voice for a new generation of fans'}.</p></section>`;
  if (cs.after === 'coach') return `<section class="card"><div class="eyebrow">Next chapter</div><h2 class="h3">Coaching</h2><p>${esc(cName(cs.p))} went into coaching. Find his coaching career in Coach mode on the Home screen.</p><button class="btn ghost" data-act="cafter" data-v="coach2">Set up the coaching career</button></section>`;
  return `<section class="card"><div class="eyebrow">Next chapter</div><h2 class="h3">What does ${esc(cs.p.first)} do now?</h2><div class="evopts"><button class="evopt" data-act="cafter" data-v="coach"><b>Go into coaching</b><span>Start a Coach mode career as the ${esc(CPOS_NAME[cs.p.pos].toLowerCase())} coach at a college, with a reputation boost of +${careerRepBonus()} from your playing days.</span></button><button class="evopt" data-act="cafter" data-v="booth"><b>Join the broadcast booth</b><span>Call games as a national TV analyst. This career ends here.</span></button></div></section>`;
}
// the NFL Combine and pro day (Player Career, before the draft decision)
function combineHTML() {
  const C = combineRec(); const drills = combineDrills(); const all = drills.every(d => C.d[d[0]]); const dl = combineDelta();
  return `<div class="decision"><div class="eyebrow">NFL Combine${C.pro ? ' and pro day' : ''}</div><p class="small">Four tests, measured against your overall rating. ${all ? `Your stock: <b>${dl >= 0 ? '+' : ''}${dl}</b> draft points.` : 'Run them before you decide; skip any you like.'}</p>
   <div class="combine">${drills.map(([k, n]) => { const r = C.d[k]; return `<div class="drill"><b>${esc(n)}</b><div>${r ? `${esc(drillShow(k, r.v))}${r.pro ? ' <span class="pill good">Pro day</span>' : ''}` : `<button class="btn sm" data-act="ccomb" data-k="${k}">Run it</button>`}</div>${all && !C.pro ? `<button class="btn ghost sm mt" data-act="ccomb" data-k="${k}" data-pro="1">Redo at pro day</button>` : ''}</div>`; }).join('')}</div>
   ${all && !C.pro ? '<p class="hint">At your pro day you can redo one test. The better result counts.</p>' : ''}</div>`;
}
// college classes: major, study hours, GPA and eligibility
function acadCardHTML() {
  if (!cs.col || cs.lvl === 'nfl' || cs.nfl) return ''; const a = acad(); if (!a) return ''; const st = STUDY[a.study];
  const status = a.susp > 0 ? `<span class="pill bad">Ineligible for ${a.susp} more game${a.susp > 1 ? 's' : ''}</span>` : a.terms && a.gpa < 2.3 ? '<span class="pill warn">Close to probation</span>' : '<span class="pill good">Eligible</span>';
  return `<section class="card"><div class="head"><div><div class="eyebrow">Academics</div><h2 class="h3">${a.terms ? 'GPA ' + a.gpa.toFixed(2) : 'First term'} ${status}</h2></div><p class="hint">Grades post at the end of each season (fall and spring). A GPA under 2.0 means you sit the first three games of the next season.${a.grad ? ` Graduated in ${a.grad}.` : ''}</p></div>
   <div class="lbl">Major${a.terms >= 6 && a.major !== 'und' ? ' (set)' : ''}</div><div class="chips">${Object.entries(MAJORS).filter(([k]) => k !== 'und' || a.major === 'und').map(([k, v]) => `<button class="chip${a.major === k ? ' on' : ''}" data-act="cmajor" data-v="${k}" ${a.terms >= 6 && a.major !== 'und' && a.major !== k ? 'disabled' : ''}>${esc(v[0])}${v[1] >= 0.4 ? ' · hard' : ''}</button>`).join('')}</div>
   <div class="lbl mt">Study hours</div>${seg('cstudy', a.study, Object.entries(STUDY).map(([k, v]) => [k, v[0]]))}<p class="small muted">${a.study === 'heavy' ? 'Better grades, but 2 fewer skill points each season.' : a.study === 'light' ? 'More football (2 extra skill points a season), weaker grades.' : 'A normal balance.'} Expected term GPA about ${Math.max(0.8, st[1] - MAJORS[a.major][1]).toFixed(1)}.</p>
   ${a.hist.length ? `<p class="small muted">Recent terms: ${a.hist.slice(-4).map(h => `${h.t} ${h.y}: ${h.g.toFixed(2)}`).join(' · ')}</p>` : ''}</section>`;
}
// teammates you compete with, and how you get along
function matesCardHTML() {
  const m = mateList(); if (!m.length) return ''; const c = chemistry();
  return `<section class="card"><div class="head"><div><div class="eyebrow">Teammates</div><h2 class="h3">Chemistry ${c}</h2></div><p class="hint">Wins and big games bring you closer; beating a teammate out for snaps can sour him. Chemistry of 70 or more builds your coach's trust every week; 30 or less wears it down.</p></div>
   <table class="mini wide">${m.map(x => `<tr><td><b>${esc(x.n)}</b> <span class="small muted">${esc(x.pos)}${x.rival ? ' · competing with you' : ''}</span></td><td style="width:40%"><div class="bar"><i class="${x.v >= 65 ? 'good' : x.v >= 40 ? 'warn' : 'bad'}" style="width:${x.v}%"></i></div></td><td class="num">${Math.round(x.v)}</td></tr>`).join('')}</table></section>`;
}
// one line on the home card: followers, deals, and offers waiting
function folLine() { const p = cs.p; const deals = (cs.endorse || []).filter(d => d.left > 0).length; const off = (cs.endOff || []).length; return `<p class="small mt"><b>${folTxt(p.fol || 0)}</b> followers${deals ? ` · ${deals} endorsement deal${deals > 1 ? 's' : ''}` : ''}${off ? ` · <a href="#" data-act="ctab" data-tab="nil"><b>${off} brand offer${off > 1 ? 's' : ''} waiting</b></a>` : ''}${cs.lvl === 'hs' ? ' <span class="muted">(brands call once you reach college)</span>' : ''}</p>`; }
// following and endorsements (Player Career money tab)
function endorseCardHTML() {
  const p = cs.p; const off = (cs.endOff || []); const deals = (cs.endorse || []).filter(d => d.left > 0 || d.paid === cs.year);
  return `<section class="card"><div class="eyebrow">Following & endorsements</div><h2 class="h3">${folTxt(p.fol || 0)} followers</h2><p class="hint">Big games and awards grow your following. Brands call when you reach 5K, 25K, 100K, 400K and 1.5M followers, and each season you can hold one deal per level reached (up to 3). Spotlight games, the postseason, awards and draft night count most${cs.lvl === 'col' ? '; in college the deals count as NIL money' : cs.lvl === 'hs' ? '. High school players can\'t sign until college' : ''}.</p>
   ${off.length ? off.map(o => `<div class="cand"><div><b>${esc(o.brand)}</b><div class="small muted">${money(o.amt)} a year for ${o.yrs} year${o.yrs > 1 ? 's' : ''}</div></div><div class="row gap"><button class="btn sm" data-act="cendorse" data-id="${o.id}" data-v="1">Sign</button><button class="btn ghost sm" data-act="cendorse" data-id="${o.id}" data-v="0">Pass</button></div></div>`).join('') : ''}
   ${deals.length ? `<table class="mini wide">${deals.map(d => `<tr><td>${esc(d.brand)}</td><td class="num">${money(d.amt)}/yr</td><td class="small muted">${d.left} more year${d.left === 1 ? '' : 's'}</td></tr>`).join('')}</table>` : off.length ? '' : '<p class="muted small">No deals yet.</p>'}</section>`;
}
function vCRetiredBase() {
  const p = cs.p; const n = cs.nfl;
  if (!n) return `<section class="card next donec"><div class="eyebrow">Career complete</div><h2 class="h2">${esc(cName(p))} walked away after the draft</h2><p class="muted">${esc(CPOS_NAME[p.pos])} · drafted ${cs.done.draft.udfa ? 'as an undrafted free agent' : `in round ${cs.done.draft.round}, pick ${cs.done.draft.pick}`} by the ${esc(cs.done.draft.team)}.</p><div class="row gap mt"><button class="btn primary" data-act="ctab" data-tab="saves">Start a new career</button><button class="btn ghost" data-act="gohome">Home screen</button></div></section>${seasonTable()}`;
  const R_ = n.retired; const pro = p.awards.filter(a => a.lvl === 'nfl').map(a => a.a); const cnt = k => pro.filter(a => a === k).length;
  const teams = [...new Set(p.seasons.filter(s => s.lvl === 'nfl').map(s => s.team))];
  const tiles = [['NFL seasons', R_.seasons], ['Super Bowls', cnt('Super Bowl champion')], ['Pro Bowls', cnt('Pro Bowl')], ['All-Pro', cnt('First-team All-Pro') + cnt('Second-team All-Pro')], ['MVPs', cnt('NFL MVP')], ['Career earnings', money(p.earned)]];
  return `<section class="card next donec"><div class="eyebrow">Retired ${R_.year} · age ${R_.age}</div><h2 class="h2">${esc(R_.verdict)}</h2><p class="muted">${esc(cName(p))} · ${esc(CPOS_NAME[p.pos])} · ${n.draft.udfa ? 'undrafted' : `drafted round ${n.draft.round}, pick ${n.draft.pick}`} · ${teams.map(t => esc(nflName(t))).join(', ')}</p>
   <div class="tiles">${tiles.map(([k, v]) => `<div><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}</div>
   <p class="small mt">Hall of Fame case: <b>${R_.hof}</b> points. ${R_.hof >= 75 ? 'Voters will put him in Canton.' : R_.hof >= 40 ? 'A strong résumé that comes up short of Canton.' : 'A career to be proud of.'}</p>
   ${pro.length ? `<p><b>NFL honors:</b> ${p.awards.filter(a => a.lvl === 'nfl').map(a => `${esc(a.a)} (${a.y})`).join(', ')}</p>` : ''}
   <div class="row gap mt"><button class="btn primary" data-act="ctab" data-tab="saves">Start a new career</button><button class="btn ghost" data-act="ctab" data-tab="stats">Career stats</button><button class="btn ghost" data-act="gohome">Home screen</button></div></section>${seasonTable()}`;
}
// Loading a career renders every career screen once before it's accepted (see cAdopt).
// every screen the career can open is drawn once as a final check on a load. A screen that fails because of one
// extras store gets that store reset (and reported); anything else rejects the load and keeps the current career.
// Each screen is drawn from a copy of the career, so the check itself changes nothing in the save.
cValidateView = () => {
  const real = cs; const rng = RNG.s; const fixed = []; const keys = CTABS.map(t => t[0]).filter(k => k !== 'settings');
  try {
    keys.forEach(k => { cs = JSON.parse(JSON.stringify(real)); rosterCache.clear(); const f = cViewFor(k);
      try { f(); } catch (e) { const bad = xRepairKey(CX(), f); if (!bad) throw e; if (real.x) delete real.x[bad]; fixed.push(X_NAME[bad] || bad); } });
  } finally { cs = real; RNG.s = rng; rosterCache.clear(); }
  cHeader(); return fixed;
};

