/* ===================== v9.50: design pass for every mode =====================
 * 1. Main tabs and a More menu (each mode shows the sections it uses most; the rest are one tap away).
 * 2. "Needs your attention" on each mode's home page, and long tables folded on phones.
 * 3. A guided first season in every mode.
 * 4. One set of terms and money formats. */
(function () {
  const css = `.tab.tmore{font-weight:600;opacity:.92}.tab.tmore::after{content:" ▾";font-size:.8em}
details.sbmore>summary{cursor:pointer;list-style:none}details.sbmore>summary::-webkit-details-marker{display:none}details.sbmore>summary::after{content:" ▸"}details.sbmore[open]>summary::after{content:" ▾"}
[data-nav=side] #tabs details.sbmore>.tab{display:block;width:100%;box-sizing:border-box}[data-nav=side] #tabs details.sbmore>.sbgrp{display:block}
.attn ul{margin:6px 0 0;padding:0;list-style:none}.attn li{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:7px 0;border-top:1px solid var(--line)}.attn li:first-child{border-top:0}
.attn li .btn{flex:none}.foldbtn{margin-top:8px}.guide ol{margin:6px 0 0;padding:0;list-style:none}.guide li{padding:5px 0}`;
  const el = document.createElement('style'); el.id = 'v950css'; el.textContent = css; document.head.appendChild(el);
})();
PREF_DEFAULTS.tabs = 'main'; PREF_CHOICES.tabs = ['main', 'all'];
try { const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; prefs.tabs = PREF_CHOICES.tabs.includes(p.tabs) ? p.tabs : 'main'; } catch (e) { prefs.tabs = 'main'; }

/* ---------- 1. main tabs ---------- */
function primTabs() {
  if (isComm()) return isPro() ? ['office', 'cdisc', 'cmoney', 'cleague', 'standings', 'league', 'clegacy'] : ['office', 'cdisc', 'cmoney', 'cleague', 'poll', 'standings', 'post', 'clegacy'];
  if (typeof isOwner === 'function' && isOwner()) return ownHands() ? ['office', 'obiz', 'ostad', 'ofans', 'oleague', 'front', 'schedule', 'standings', 'off'] : ['office', 'obiz', 'ostad', 'oleague', 'front', 'roster', 'cap', 'fa', 'draft', 'schedule', 'off'];
  if (isPro()) return isCoach() ? ['office', 'career', 'schedule', 'roster', 'depth', 'pbook', 'front', 'standings', 'off'] : ['office', 'schedule', 'roster', 'depth', 'cap', 'fa', 'trades', 'draft', 'standings', 'off'];
  if (isCoach()) return ['office', 'career', 'schedule', 'roster', 'depth', 'pbook', 'recruit', 'standings', 'off'];
  return ['office', 'schedule', 'roster', 'depth', 'staff', 'recruit', 'money', 'poll', 'off'];
}
const cPrimTabs = () => ['home', 'player', 'schedule', 'stats', 'recruit', 'nil', 'team'];
{ const _rt = renderTabs; renderTabs = function () {
  _rt(); if (prefs.tabs === 'all' || !state) return; const t = $('#tabs'); if (!t) return;
  const P_ = primTabs().filter(k => curTabs().some(x => x[0] === k) && tabVisible(k)); const extra = !P_.includes(ui.tab) && tabVisible(ui.tab) ? [ui.tab] : [];
  if (prefs.nav === 'side') {
    const rest = curGroups().map(([g, ks]) => { const vis = ks.filter(k => tabVisible(k) && !P_.includes(k)); return vis.length ? `<div class="sbgrp">${g}</div>` + vis.map(k => tabBtn(k, 'tab')).join('') : ''; }).join('');
    t.innerHTML = `<div class="sbhead"><span class="sbw">${esc(isComm() ? 'Commissioner' : teamName(ME))}</span><button class="tbtn" data-act="toggleside" aria-label="Hide the sidebar">${IC.collapse}</button></div><div class="sbgrp">Main</div>${P_.map(k => tabBtn(k, 'tab')).join('')}${rest ? `<details class="sbmore"${ui.sbMore || extra.length ? ' open' : ''}><summary class="sbgrp" data-act="sbmore">More sections</summary>${rest}</details>` : ''}`;
  } else t.innerHTML = P_.concat(extra).map(k => tabBtn(k, 'tab')).join('') + `<button class="tab tmore" data-act="moremenu" aria-haspopup="dialog">More</button>`;
  tabFade(true);
}; }
{ const _rc = renderCTabs; renderCTabs = function () {
  _rc(); if (prefs.tabs === 'all' || !cs) return; const t = $('#tabs'); if (!t) return;
  const btn = (k, cls) => { const on = cui.tab === k; return `<button class="${cls}${on ? ' on' : ''}" data-act="ctab" data-tab="${k}"${on ? ' aria-current="page"' : ''}>${esc(ctabLabel(k))}</button>`; };
  const P_ = cPrimTabs().filter(k => CTABS.some(x => x[0] === k) && ctabVisible(k)); const extra = !P_.includes(cui.tab) && ctabVisible(cui.tab) ? [cui.tab] : [];
  if (prefs.nav === 'side') {
    const rest = CTAB_GROUPS.map(([g, ks]) => { const vis = ks.filter(k => ctabVisible(k) && !P_.includes(k)); return vis.length ? `<div class="sbgrp">${cGroupLabel(g)}</div>` + vis.map(k => btn(k, 'tab')).join('') : ''; }).join('');
    t.innerHTML = `<div class="sbhead"><span class="sbw">${esc(cName(cs.p))}</span><button class="tbtn" data-act="toggleside" aria-label="Hide the sidebar">${IC.collapse}</button></div><div class="sbgrp">Main</div>${P_.map(k => btn(k, 'tab')).join('')}${rest ? `<details class="sbmore"${ui.sbMore || extra.length ? ' open' : ''}><summary class="sbgrp" data-act="sbmore">More sections</summary>${rest}</details>` : ''}`;
  } else t.innerHTML = P_.concat(extra).map(k => btn(k, 'tab')).join('') + `<button class="tab tmore" data-act="cmore" aria-haspopup="dialog">More</button>`;
  tabFade(true);
}; }
{ const _ds = displaySettingsHTML; displaySettingsHTML = function (mode, extra) {
  const h = _ds(mode, extra); const row = setRow('Tabs', 'Main shows the sections you use most, with everything else under More. All shows every section, the way it used to be.', prefSeg('tabs', [['main', 'Main + More'], ['all', 'All']]));
  const i = h.indexOf('<div class="setrow"><div class="sl"><b>Animations</b>'); return i >= 0 ? h.slice(0, i) + row + h.slice(i) : h;
}; }

/* ---------- 2. needs your attention ---------- */
function attnItems() {
  const out = []; const add = (txt, tab, act) => { if (out.length < 5) out.push({ txt, tab, act }); };
  if (appMode === 'career') {
    if (!cs) return out; if (cs.event) add('A decision is waiting for you.', 'home'); if (cs.phase === 'sign') add('Signing day: choose your school.', 'recruit');
    if (['hsoff', 'coloff', 'nfloff'].includes(cs.phase) && typeof offBlocked === 'function') { const b = offBlocked(); if (b) add(b, 'home'); }
    if (ctabVisible('recruit') && cs.portal && cs.portal.open) add('The transfer portal is open.', 'recruit');
    return out;
  }
  if (!state) return out;
  if (typeof isOwner === 'function' && isOwner()) {
    const o = OWN(); if (o.out && !o.done) add('You don\'t own a club right now: buy one or retire.', 'career');
    if (o.ev) add(`For the owner: ${o.ev.t}.`, 'office'); if (o.gmDeal && !o.gmDeal.done && !o.gmDeal.blocked && o.gmDeal.s === state.season) add('Your GM has a deadline deal ready.', 'office');
    if ((o.ext || []).length) add(`${o.ext.length === 1 ? 'A contract runs' : o.ext.length + ' contracts run'} out: extend or let go.`, 'front');
    if ((o.sOff || []).some(f => !f.done) && !(typeof ownPresOn === 'function' && ownPresOn())) add(`${o.sOff.filter(f => !f.done).length} sponsor offer${o.sOff.filter(f => !f.done).length === 1 ? '' : 's'} waiting.`, 'obiz');
    if (o.lg.meet && !o.lg.meet.done && o.lg.meet.items.some(i => !i.my && !i.mine)) add('The owners\' meeting has items for your vote.', 'oleague');
    if ((o.nameOffers || []).length && !o.stad.naming && !(typeof ownPresOn === 'function' && ownPresOn())) add('Naming-rights offers for your stadium.', 'ostad');
    if (o.bank < 0) add('The club\'s bank is overdrawn.', 'obiz');
  } else if (isComm()) {
    const c = cm2(); const n = (c.items || []).length; if (n) add(`${n} item${n === 1 ? '' : 's'} on your desk.`, 'office');
  } else if (state.event) add(`Decision needed: ${state.event.title}.`, 'office');
  if (state.phase === 'offseason' && typeof offBlockers === 'function') offBlockers().forEach(b => { if (b.tab || !b.act) add(b.txt, b.tab || 'off'); else add(b.txt, null, b.act); });
  if (!isComm()) {
    if (state.phase !== 'offseason' && !(typeof ownHands === 'function' && ownHands())) { const hurt = POS_ORDER.reduce((s, pos) => s + (state.depth[pos] || []).slice(0, START[pos]).map(P).filter(p => p && p.inj > 0).length, 0); if (hurt) add(`${hurt} injured player${hurt === 1 ? ' is' : 's are'} still listed as a starter.`, 'depth'); }
    if (isPro() && isGM()) { if (overCap()) add(`You're ${fmM(-capRoom(ME))} over the salary cap.`, 'cap'); const n = (PS().tradeOffers || []).filter(x => x.s === state.season).length; if (n) add(`${n} trade offer${n === 1 ? '' : 's'} to answer.`, 'trades'); if (state.roster.some(p => p.hold)) add('A player is holding out.', 'roster'); }
    if (isCoach() && state.co && typeof coFireAt === 'function' && state.co.role === 'HC' && state.co.sec <= coFireAt() + 8) add('Your job security is low.', 'career');
    if (!isPro() && !isCoach() && state.fin && state.fin.balance < 0) add('The athletic department is in the red.', 'money');
  }
  return out;
}
function attnHTML(cur) {
  const it = attnItems().filter(x => x.tab !== cur || x.act); if (!it.length) return '';
  const go = x => x.act ? `<button class="btn ghost sm" data-act="${x.act}">Go</button>` : `<button class="btn ghost sm" data-act="${appMode === 'career' ? 'ctab' : 'tab'}" data-tab="${x.tab}">Go</button>`;
  return `<section class="card attn" role="status"><div class="eyebrow">Needs your attention</div><ul>${it.map(x => `<li><span>${esc(x.txt)}</span>${go(x)}</li>`).join('')}</ul></section>`;
}

/* ---------- 3. a guided first season ---------- */
function gStore() { return appMode === 'career' ? CX() : X(); }
function guideMode() { if (appMode === 'career') return 'pc'; if (isComm()) return 'comm'; if (typeof isOwner === 'function' && isOwner()) return 'own'; if (isPro()) return isCoach() ? 'nflcoach' : 'gm'; return isCoach() ? 'coach' : 'ad'; }
function guideFresh() {
  const m = guideMode();
  if (m === 'pc') return !!cs && !(cs.hist || []).length && cs.week <= 1 && !(cs.ss && cs.ss.gp);
  if (m === 'comm') { const c = cm2(); return !(c.yrs || []).length && (state.phase !== 'offseason' ? state.week <= 1 : true); }
  if (m === 'gm') return !(PS().hist || []).length;
  if (m === 'coach' || m === 'nflcoach') return !(state.co.hist || []).length && (state.phase === 'offseason' || state.week <= 1);
  if (m === 'ad') return !(state.history || []).length && state.week <= 1 && state.phase !== 'offseason';
  return false;
}
function guideSteps() {
  const S = gStore(); const seen = S.seen || {}; const m = guideMode(); const played = appMode === 'career' ? cs.week > 1 : state.phase !== 'offseason' && state.week > 1;
  if (m === 'pc') return [['player', 'Meet your player and pick a training plan', 'Player', !!seen.player], ['schedule', 'Look at your schedule', 'Schedule', !!seen.schedule], ['recruit', cs.phase === 'sign' ? 'Choose your school' : 'See which colleges are watching', 'Recruiting', !!seen.recruit || cs.phase !== 'sign' && cs.lvl !== 'hs'], ['stats', 'Check your stats page', 'Stats', !!seen.stats], ['home', 'Play your first game', 'Home', played]];
  if (m === 'comm') return [['cdisc', 'Rule on a discipline case', 'Discipline', !!seen.cdisc], ['cmoney', 'Look at the league\'s money', 'Money', !!seen.cmoney], ['cleague', 'Review the rules', 'League & rules', !!seen.cleague], ['office', 'Get through your first week', 'League office', played]];
  if (m === 'gm') return [['staff', 'Meet your head coach', 'Staff', !!seen.staff], ['cap', 'Check the salary cap', 'Contracts & cap', !!seen.cap], ['fa', 'Look at free agency', 'Free agency', !!seen.fa], ['draft', 'Study the draft board', 'Draft board', !!seen.draft], ['schedule', 'Play your first game', 'Schedule', played]];
  if (m === 'coach' || m === 'nflcoach') return [['career', 'Read your contract and goals', 'My career', !!seen.career], ['pbook', 'Set up your playbook', 'Playbook', !!seen.pbook], ['depth', 'Set the depth chart', 'Depth chart', !!seen.depth], m === 'coach' ? ['recruit', 'Look at recruiting', 'Recruiting', !!seen.recruit] : ['front', 'Tell the GM what you need', 'Front office', !!seen.front], ['schedule', 'Coach your first game', 'Schedule', played]];
  return [['roster', 'Meet your roster', 'Roster', !!seen.roster], ['depth', 'Set the depth chart', 'Depth chart', !!seen.depth], ['money', 'Check the budget', 'Finances', !!seen.money], ['recruit', 'Start recruiting', 'Recruiting', !!seen.recruit], ['schedule', 'Play your first game', 'Schedule', played]];
}
function guideHTML() {
  const m = guideMode(); if (m === 'own') return ''; const S = gStore(); if (!S || S.guideOff) return '';
  const yr = appMode === 'career' ? cs.year : state.season; if (S.guideYr == null) { if (!guideFresh()) { S.guideOff = true; return ''; } S.guideYr = yr; }
  if (yr !== S.guideYr) return ''; const st = guideSteps(); const done = st.filter(x => x[3]).length;
  const act = appMode === 'career' ? 'ctab' : 'tab';
  return `<section class="card next guide"><div class="head"><div><div class="eyebrow">Your first season · ${done} of ${st.length}</div><h2 class="h3">Getting started</h2></div><button class="btn ghost sm" data-act="guideoff">Hide</button></div><ol>${st.map(([k, t, lbl, ok]) => `<li>${ok ? '<span class="pill good">Done</span>' : '<span class="pill">To do</span>'} ${esc(t)} <button class="lnk small" data-act="${act}" data-tab="${k}">${esc(lbl)}</button></li>`).join('')}</ol><p class="hint">Everything else can wait. The rest of the sections are under More.</p></section>`;
}
Object.assign(actions, {
  guideoff() { const S = gStore(); if (S) S.guideOff = true; if (appMode === 'career') { if (typeof cSave === 'function') cSave(); render(); } else after(); },
  sbmore() { ui.sbMore = !ui.sbMore; render(); },
  unfold(d) { (ui.unfold || (ui.unfold = {}))[d.k] = true; render(); },
});
// remember which sections you've opened (for the guide)
{ const _r = render; render = function () { const r = _r.apply(this, arguments); try { if (appMode === 'career' && cs) { const S = CX(); (S.seen || (S.seen = {}))[cui.tab] = 1; } else if (appMode === 'ad' && state) { const S = X(); (S.seen || (S.seen = {}))[ui.tab] = 1; } } catch (e) { } return r; }; }
// the home page of each mode: the guide and what needs you, at the top
{ const _a = adViewFor; adViewFor = function () { const v = _a(); if (ui.tab !== 'office' || !state) return v; return function () { return guideHTML() + attnHTML('office') + v.apply(this, arguments); }; }; }
{ const _c = cViewFor; cViewFor = function (k) { const v = _c(k); if (k !== 'home' || !cs) return v; return function () { return guideHTML() + attnHTML('home') + v.apply(this, arguments); }; }; }

/* ---------- long tables fold on phones ---------- */
{ const _q = qolAfterRender; qolAfterRender = function () {
  _q(); try {
    if (window.innerWidth > 640) return; const tab = appMode === 'career' ? cui.tab : ui.tab; const U = ui.unfold || {};
    document.querySelectorAll('#view table.tbl').forEach((tb, i) => {
      const rows = tb.tBodies[0] ? [...tb.tBodies[0].rows] : []; if (rows.length <= 14 || tb.classList.contains('nofold')) return; const key = appMode + ':' + tab + ':' + i; if (U[key]) return;
      rows.slice(10).forEach(r => { r.style.display = 'none'; }); const host = tb.closest('.tw') || tb; const b = document.createElement('button'); b.className = 'btn ghost sm foldbtn'; b.dataset.act = 'unfold'; b.dataset.k = key; b.textContent = `Show all ${rows.length} rows`; host.after(b);
    });
  } catch (e) { }
}; }

/* ---------- 4. one set of terms ---------- */
Object.assign(GLOSS, {
  reputation: 'How the football world sees you, 0–100. In every mode it decides who calls with jobs, who wants to work for you and how much benefit of the doubt you get.',
  legacy: 'Your career score: titles, winning and what you built, minus the damage done. It is shown on your career or Legacy page and decides the Hall of Fame.',
  'job security': 'How your boss rates your work, 0–100. Fall too low after a season and you are fired. Owners and commissioners can\'t be fired this way.',
  brand: 'How big a club is nationally, 0–100. Sponsors, merchandise and the club\'s value follow it.',
  'club value': 'What an NFL club would sell for: its revenue times a multiple that rewards big markets, strong brands and good stadiums.',
  money: 'Money is shown the same way everywhere: $950K, $4.25M, $340M, $5.12B. Contracts keep two decimals because a cap is tight.',
});


