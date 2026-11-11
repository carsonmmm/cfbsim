/* ===================== EXTRAS 3 (v9.15): the pages ===================== */
// The pages for ext3.js: The story so far (a new tab), game prep and the daily challenge on the office pages, the
// athletic department's renovation, boosters and academics, the coaching search on Staff, the defensive playbook and
// practice week on Playbook, home visits on Recruiting, agents in contract talks, deadline day on Trades, the new
// stadium on the GM's office, the Player Career cards, the commissioner's prime-time picks, share cards, and the live
// game's commentary, two-minute drill and defensive play calls.
(function x3TabsInit() {
  const at = (L, after, it) => { if (L.some(t => t[0] === it[0])) return; let i = L.findIndex(t => t[0] === after); if (i < 0) i = L.length - 1; L.splice(i + 1, 0, it); };
  const grp = (G, name, k) => { const g = G.find(x => x[0] === name); if (g && !g[1].includes(k)) g[1].push(k); };
  at(TABS, 'trophy', ['story', 'The story so far']); grp(TAB_GROUPS, 'Career', 'story');
  at(PRO_TABS, 'trophy', ['story', 'The story so far']); grp(PRO_GROUPS, 'Career', 'story');
  at(CTABS, 'records', ['cstory', 'The story so far']); grp(CTAB_GROUPS, 'My career', 'cstory');
})();
{
  const _ct = commTabList; commTabList = function () { const L = _ct(); if (!L.some(t => t[0] === 'story')) L.splice(L.length - 1, 0, ['story', 'The story so far']); return L; };
  const _cg = commGroups; commGroups = function () { const G = _cg(); const f = G.find(g => g[0] === 'Fans'); if (f && !f[1].includes('story')) f[1].push('story'); return G; };
  const _tv = xTabVis; xTabVis = function (k) { return k === 'story' ? true : _tv(k); };
  const _xv = xView; xView = function (tab) { return tab === 'story' ? vX3Story : _xv(tab); };
  const _xc = xCView; xCView = function (tab) { return tab === 'cstory' ? vX3CStory : _xc(tab); };
}

/* ---------- 5. the story so far ---------- */
function vX3Story() {
  if (ui.storyV === 'hall') return storyNavHTML(ui.storyV) + hallADHTML(); if (ui.storyV === 'jr') return storyNavHTML(ui.storyV) + journalHTML(djOf(X()), false);
  const S = storyAD(); const titles = isPro() ? (PS().hist || []).filter(h => h.po === 5).length : isComm() ? 0 : (state.history || []).filter(h => h.champ === ME).length;
  if (!S.length) return `<section class="card"><div class="eyebrow">The story so far</div><h2 class="h2">Chapter one</h2><p class="muted">The big moments of this save show up here as they happen: hires, titles, upsets, records.</p></section>`;
  return `<section class="card"><div class="head"><div><div class="eyebrow">The story so far</div><h2 class="h2">${esc(isComm() ? (isPro() ? 'The NFL' : 'College football') : myName())}</h2></div><p class="hint">${S.length} season${S.length === 1 ? '' : 's'}${titles ? ` · ${titles} title${titles === 1 ? '' : 's'}` : ''}. The big moments, newest first.</p></div>${!isComm() ? '<button class="btn ghost sm" data-act="x3card" data-k="season">Share this season as an image</button>' : ''}</section>
   ${storyNavHTML(ui.storyV)}${storyFilterHTML(ui.storyF)}
   <ol class="x3tl">${S.map(x => `<li><div class="x3tly"><b>${x.s}</b>${x.season ? `<span class="small">${esc(x.season.line)}</span>${x.season.title ? '<span class="pill maize">Champions</span>' : ''}` : ''}</div>${storyItemsHTML(x.items, ui.storyF, e => `<span class="small muted">${e.wk ? 'Week ' + e.wk : 'Offseason'}</span> `, 12, 'A quiet year.')}</li>`).join('')}</ol>`;
}
function vX3CStory() {
  if (cui.storyV === 'hall') return storyNavHTML(cui.storyV) + hallCHTML(); if (cui.storyV === 'jr') return storyNavHTML(cui.storyV) + journalHTML(djOf(CX()), true);
  const S = storyC(); const p = cs.p;
  return `<section class="card"><div class="head"><div><div class="eyebrow">The story so far</div><h2 class="h2">${esc(cName(p))}</h2></div><p class="hint">${(p.seasons || []).length} season${(p.seasons || []).length === 1 ? '' : 's'} · ${(p.awards || []).length} honor${(p.awards || []).length === 1 ? '' : 's'}</p></div><button class="btn ghost sm" data-act="x3card" data-k="career">Share your career as an image</button></section>
   ${storyNavHTML(cui.storyV)}${storyFilterHTML(cui.storyF)}
   <ol class="x3tl">${S.map(x => `<li><div class="x3tly"><b>${x.s}</b>${x.season.map(e => `<span class="small">${esc(e.lvl === 'nfl' ? nflName(e.team) : e.lvl === 'col' ? cTeamName(e.team) : e.team)} · ${esc(e.cls || '')}${e.rec ? ' · ' + esc(e.rec) : ''}</span>`).join('')}</div>${storyItemsHTML(x.items, cui.storyF, () => '', 99, 'Head down, working.')}</li>`).join('')}</ol>`;
}

/* ---------- IDEA-14: the History hall and the decision journal ---------- */
function storyNavHTML(cur) { cur = cur === 'hall' || cur === 'jr' ? cur : 'story'; return `<div class="seg mt" role="group" aria-label="View">${[['story', 'Timeline'], ['hall', 'History hall'], ['jr', 'Decision journal']].map(([k, l]) => `<button class="${k === cur ? 'on' : ''}" data-act="x3sv" data-v="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>`; }
function hallTile(k, v, s) { return `<div><span class="k">${esc(k)}</span><span class="v">${v}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`; }
function hallADHTML() {
  const pro = isPro(); const H = pro ? (PS().hist || []).map(h => ({ s: h.s, w: h.w, l: h.l, title: h.po === 5, line: h.po ? ['', 'Wild card', 'Divisional round', 'Conference title game', 'Super Bowl loss', 'Super Bowl champions'][h.po] : '' })) : isComm() ? [] : (state.history || []).map(h => ({ s: h.season, w: h.w, l: h.l, title: h.champ === ME, line: [h.rank ? 'No. ' + h.rank : '', h.bowl || ''].filter(Boolean).join(' · ') }));
  const rings = H.filter(h => h.title); const best = H.slice().sort((a, b) => (b.w - b.l) - (a.w - a.l) || b.s - a.s).slice(0, 5); const tw = H.reduce((s, h) => s + h.w, 0), tl = H.reduce((s, h) => s + h.l, 0);
  const ach = Object.entries(state.ach || {}).map(([id, v]) => { const a = ACH.find(x => x[0] === id); return a ? { n: a[1], d: a[2], s: v.s } : null; }).filter(Boolean).sort((a, b) => b.s - a.s);
  const hof = isComm() ? (cm2().hof || []) : [];
  const tiles = isComm() ? `${hallTile('Seasons in office', (cm2().yrs || []).length)}${hallTile('Hall of Famers inducted', hof.length)}${hallTile('Achievements', ach.length + Object.keys(cm2().ach || {}).length)}`
    : `${hallTile(pro ? 'Super Bowls' : 'National titles', rings.length, rings.map(h => h.s).join(', '))}${hallTile('Record', `${tw}-${tl}`, H.length + ' season' + (H.length === 1 ? '' : 's'))}${hallTile('Achievements', ach.length)}`;
  const cmAch = isComm() ? Object.entries(cm2().ach || {}).map(([k, s]) => (typeof CM_ACH !== 'undefined' && CM_ACH[k] ? { n: CM_ACH[k][0], d: CM_ACH[k][1], s } : null)).filter(Boolean) : [];
  const allAch = ach.concat(cmAch).sort((a, b) => b.s - a.s);
  return `<section class="card"><div class="eyebrow">History hall</div><h2 class="h2">${esc(isComm() ? (pro ? 'The NFL' : 'College football') : myName())}</h2><div class="tiles">${tiles}</div></section>
   ${best.length ? `<section class="card"><div class="eyebrow">Best seasons</div><ol class="plainlist">${best.map(h => `<li><b>${h.s}</b> · ${h.w}-${h.l}${h.line ? ' · ' + esc(h.line) : ''}${h.title ? ' <span class="pill maize">Champions</span>' : ''}</li>`).join('')}</ol></section>` : ''}
   ${hof.length ? `<section class="card"><div class="eyebrow">Hall of Fame classes</div><ul class="plainlist small">${hof.slice().reverse().slice(0, 40).map(x => `<li><b>${x.s || ''}</b> ${esc(x.n || '')}${x.pos ? ' · ' + esc(x.pos) : ''}</li>`).join('')}</ul></section>` : ''}
   <section class="card"><div class="eyebrow">Achievements</div>${allAch.length ? `<ul class="plainlist small">${allAch.map(a => `<li><b>${esc(a.n)}</b> <span class="muted">${a.s}</span> · ${esc(a.d)}</li>`).join('')}</ul>` : '<p class="muted small">None yet.</p>'}</section>`;
}
function hallCHTML() {
  const p = cs.p; const S = p.seasons || []; const cnt = {}; (p.awards || []).forEach(a => { (cnt[a.a] = cnt[a.a] || []).push(a.y || a.year || ''); });
  const aw = Object.entries(cnt).sort((a, b) => b[1].length - a[1].length); const ach = Object.entries(cs.cach || {}).map(([id, v]) => { const a = CACH.find(x => x[0] === id); return a ? { n: a[1], d: a[2], y: v.y } : null; }).filter(Boolean).sort((a, b) => b.y - a.y);
  const arc = S.length ? barChart(S.map(e => ({ lbl: String(e.year).slice(2) + (e.lvl === 'nfl' ? 'N' : e.lvl === 'col' ? 'C' : 'H'), v: e.ovr || 0, tip: `${e.year} (${e.lvl === 'nfl' ? 'NFL' : e.lvl === 'col' ? 'college' : 'high school'}): OVR ${e.ovr}` })), { h: 140, title: 'Your OVR, season by season', fmt: v => String(v), min0: false }) : '';
  const earned = p.earned || 0;
  return `<section class="card"><div class="eyebrow">History hall</div><h2 class="h2">${esc(cName(p))}</h2><div class="tiles">${hallTile('Seasons', S.length)}${hallTile('Honors', (p.awards || []).length)}${hallTile('Achievements', ach.length)}${earned ? hallTile('Career earnings', esc(money(earned))) : ''}</div>${arc ? `<div class="mt">${arc}</div><p class="hint">H = high school, C = college, N = NFL.</p>` : ''}</section>
   <section class="card"><div class="eyebrow">Honors</div>${aw.length ? `<ul class="plainlist small">${aw.map(([n, ys]) => `<li><b>${esc(n)}</b>${ys.length > 1 ? ` ×${ys.length}` : ''} <span class="muted">${esc(ys.filter(Boolean).join(', '))}</span></li>`).join('')}</ul>` : '<p class="muted small">None yet.</p>'}</section>
   <section class="card"><div class="eyebrow">Achievements</div>${ach.length ? `<ul class="plainlist small">${ach.map(a => `<li><b>${esc(a.n)}</b> <span class="muted">${a.y}</span> · ${esc(a.d)}</li>`).join('')}</ul>` : '<p class="muted small">None yet.</p>'}</section>`;
}
const JR_K = { event: 'Decision', hire: 'Hire', trade: 'Trade', comm: 'League office', build: 'Facilities', sign: 'Signing', agent: 'Agent', transfer: 'Transfer' };
// what followed each decision: the season's final record (or, in Player Career, the OVR at the end of that season)
function journalHTML(J, career) {
  if (!J.length) return `<section class="card"><div class="eyebrow">Decision journal</div><p class="muted">Your big decisions show up here from now on (events you answer, hires, trades, facility projects${career ? ', schools, contracts, agents and transfers' : ', league office calls'}), each with what followed.</p></section>`;
  const seasonOf = e => { if (career) { const s = (cs.p.seasons || []).find(x => x.year === e.y && x.lvl === e.lvl); return s ? `That season: OVR ${e.ovr} → ${s.ovr}${s.rec ? ', team ' + s.rec : ''}.` : `OVR ${e.ovr} when you decided.`; }
    const H = isPro() ? (PS().hist || []).find(h => h.s === e.s) : (state.history || []).find(h => h.season === e.s); const atT = e.r != null ? `Team rating ${e.r}${e.w != null && e.w + e.l ? ` at ${e.w}-${e.l}` : ''} when you decided.` : '';
    if (!H) return atT + (e.s === state.season ? ' The season is still going.' : ''); const now = T(ME) ? Math.round(T(ME).rating) : null; return `${atT} The season finished ${H.w}-${H.l}${H.rank ? ', No. ' + H.rank : ''}${now != null && e.r != null ? `; rating now ${now} (${now - e.r >= 0 ? '+' : '−'}${Math.abs(now - e.r)})` : ''}.`; };
  const by = {}; J.slice().reverse().forEach(e => { const y = career ? e.y : e.s; (by[y] = by[y] || []).push(e); });
  return `<section class="card"><div class="eyebrow">Decision journal</div><p class="hint">Newest first. Each entry keeps its own id, so it stays linked to the season it shaped.</p></section><ol class="x3tl">${Object.keys(by).map(Number).sort((a, b) => b - a).map(y => `<li><div class="x3tly"><b>${y}</b></div><ul class="plainlist">${by[y].map(e => `<li id="jr-${esc(e.id)}"><span class="pill small">${esc(JR_K[e.k] || 'Decision')}</span> ${esc(e.t)}<div class="small muted">${esc(seasonOf(e))}</div></li>`).join('')}</ul></li>`).join('')}</ol>`;
}

// QOL-07 / SUS-04: filter the story by kind; achievements fold into one line per season unless you ask for them
const STORY_F = [['all', 'All'], ['games', 'Games'], ['staff', 'Staff'], ['money', 'Money'], ['ach', 'Achievements']];
function storyKind(t) {
  t = String(t || ''); if (/^Achievement/i.test(t)) return 'ach';
  if (/\$\d|budget|donor|booster|revenue|\bNIL\b|contract|signs? |signed|extension|deal\b|stadium|facilit|sponsor|endorse|salary|cap space|ticket/i.test(t)) return 'money';
  if (/coach|coordinator|\bhire|hired|fired|\bstaff\b|athletic director|\bGM\b|general manager|commissioner|resign|front office|scout/i.test(t)) return 'staff';
  return 'games';
}
function storyFilterHTML(cur) { cur = STORY_F.some(f => f[0] === cur) ? cur : 'all'; return `<div class="row gap wrap mt x3sf" role="group" aria-label="Show">${STORY_F.map(([k, l]) => `<button class="btn ${k === cur ? 'primary' : 'ghost'} sm" data-act="x3sf" data-v="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>`; }
function storyItemsHTML(items, cur, pre, max, empty) {
  cur = STORY_F.some(f => f[0] === cur) ? cur : 'all'; const show = items.filter(e => cur === 'all' ? storyKind(e.t) !== 'ach' : storyKind(e.t) === cur); const ach = cur === 'all' ? items.filter(e => storyKind(e.t) === 'ach') : [];
  const li = show.slice(0, max).map(e => `<li>${pre(e)}${esc(e.t)}</li>`).join('');
  const fold = ach.length ? `<li><details><summary class="small muted">${ach.length} achievement${ach.length === 1 ? '' : 's'}</summary><ul class="plainlist small">${ach.map(e => `<li>${esc(e.t)}</li>`).join('')}</ul></details></li>` : '';
  return `<ul class="plainlist">${li + fold || `<li class="small muted">${cur === 'all' ? empty : 'Nothing of this kind this year.'}</li>`}</ul>`;
}

/* ---------- 1. game prep, the daily challenge and the scenario: office cards ---------- */
function x3PrepCard() {
  const g = prepNext(); if (!g) return ''; const sc = prepScout(g); const S = prepStore(); const cur = S.wk[g.wk] || { keys: [] }; const last = S.hist[0];
  return `<section class="card" id="x3prep"><div class="head"><div><div class="eyebrow">Game prep · ${esc(isPro() ? nflWeekLabel(g.wk) : weekLabel(g.wk))}</div><h2 class="h3">Scouting ${esc(teamName(sc.opp))}${sc.rank ? ' (No. ' + sc.rank + ')' : ''}</h2></div><p class="hint">Pick two keys to the game. A key aimed at their weakness is worth the most.</p></div>
   <p>They run about <b>${sc.run}%</b> of the time: <b>${esc(PREP_S[sc.style])}</b>. On defense, <b>${esc(PREP_W[sc.weak])}</b>. Keys marked ★ go right at them.</p>
   <div class="x3keys">${Object.entries(PREP_K).map(([k, [l, , w, goal]]) => `<button class="evopt${cur.keys.includes(k) ? ' on' : ''}" data-act="x3prep" data-v="${k}" aria-pressed="${cur.keys.includes(k)}"><b>${esc(l)}${w === sc.weak || w === sc.style ? ' ★' : ''}</b><span>${esc(goal)}</span></button>`).join('')}</div>
   ${last ? `<p class="small mt">Last game vs. ${esc(teamName(last.opp))}: ${last.res.map(([k, ok]) => `${ok ? '✓' : '✗'} ${esc(PREP_K[k][0])}`).join(' · ') || 'no keys picked'}.</p>` : ''}</section>`;
}
function x3DailyCard() {
  if (!dailyOn()) return ''; const ch = state.chal; const h = (isPro() ? (PS().hist || []).map(x => ({ s: x.s, w: x.w, l: x.l })) : (state.history || []).map(x => ({ s: x.season, w: x.w, l: x.l }))).find(x => x.s === ch.s0);
  return `<section class="card next"><div class="eyebrow">Daily challenge · ${esc(String(ch.id).slice(6))}</div><h2 class="h3">${h ? `Final: ${h.w}-${h.l}` : `One season at ${esc(teamName(ch.tid))}`}</h2><p class="small">${h ? 'Post your score to the leaderboard from the Save file page, then see how everyone else did on the Home screen.' : 'Everyone gets the same school and the same league today. Play the season, then post your score.'}</p>${h ? '<button class="btn primary sm" data-act="x3dailypost">Post my score</button>' : ''}</section>`;
}
{ const w = f => function () { return x3DailyCard() + x3PrepCard() + f.apply(this, arguments); }; vOffice = w(vOffice); vCoachOffice = w(vCoachOffice); vProOffice = w(vProOffice); }

/* ---------- 4. the daily challenge (Home) ---------- */
function x3DailyHomeHTML() {
  const D = dailyToday(); const chk = D.id + ':' + (lsGet(NS_PREFIX.ad + 'slots-meta') || ''); if (cui.dailyChk !== chk) { cui.dailyChk = chk; /* looked up again whenever the AD slots change */ x3DailySlot(D.id).then(i => { const v = i ? D.id : null; if (cui.dailyHave !== v) { cui.dailyHave = v; if (appMode === 'home') render(); } }).catch(() => { }); } const nm = CTEAMS0_AD[D.tid] ? CTEAMS0_AD[D.tid].name : D.tid; const board = (typeof share !== 'undefined' && share.board ? share.board.filter(x => x.chal === D.id) : []).sort((a, b) => b.score - a.score).slice(0, 8);
  return `<section class="card" id="x3daily"><div class="head"><div><div class="eyebrow">Daily challenge · ${esc(D.k)} (your local date)</div><h2 class="h2">Today: ${esc(nm)}</h2></div><p class="hint">The same school and the same league for everyone today. Play one season as athletic director and post your score. A new one every day.</p></div>
   <div class="row gap"><button class="btn primary" data-act="x3daily">Play today's challenge</button>${cui.dailyHave === D.id ? (cui.confirm === 'x3restart' ? '<button class="btn danger" data-act="x3dailyre">Confirm: start it over</button>' : '<button class="btn ghost" data-act="cask2" data-k="x3restart">Start it over</button>') : ''}</div><p class="small muted">A new challenge starts at midnight on your device's clock. Playing again picks up the same save.</p>
   ${board.length ? `<div class="tw mt"><table class="tbl"><thead><tr><th>#</th><th>Who</th><th>Record</th><th class="num">Score</th></tr></thead><tbody>${board.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(shareWho(x.uid))}</td><td>${x.w}-${x.l}</td><td class="num">${x.score}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small muted mt">${typeof share !== 'undefined' && share.ok ? 'No scores posted yet today.' : 'Scores show up here when the game is opened from its claude.ai link.'}</p>`}</section>`;
}
{ const _ph = patchHomeHTML; patchHomeHTML = function () { return x3DailyHomeHTML() + _ph(); }; }
// the AD slot already holding today's challenge, if any (older saves' summaries don't say, so those are opened to check)
async function x3DailySlot(id) {
  const m = slotsMetaOf('ad');
  for (let i = 1; i <= 5; i++) { const raw = lsGet(NS_PREFIX.ad + 'slot-' + i); if (!raw) continue; if (m[i] && m[i].chal !== undefined) { if (m[i].chal === id) return i; continue; }
    try { const s = JSON.parse(await gunz(raw)); if (s && s.chal && s.chal.id === id) return i; } catch (e) { /* a damaged slot is not today's challenge */ } }
  return null;
}
// Play today's challenge: resume the slot that already holds it, or start it in a free slot. Restart replays it in the
// same slot, so retries never fill the save slots (FE-14).
async function x3DailyStart(restart) {
  const D = dailyToday(); if (!CTEAMS0_AD[D.tid]) return; if (appMode === 'career' && !(await leaveMode())) return; if (appMode === 'ad' && state && !saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL);
  switchNS('ad'); const have = await x3DailySlot(D.id);
  if (have && !restart) { if (!(state && slot === have && !saveBlocked)) { state = null; setActiveSlot(have); await boot(); } appMode = 'ad'; rngOwner = 'ad'; cui.adPick = false; resetUi(); ui.tab = 'office'; hideModal(); applyTheme(); ui.flash = `Today's challenge, picked up where you left it (slot ${have}).`; render(); window.scrollTo(0, 0); return; }
  const free = have || firstFreeSlot(); if (!free) { appMode = 'home'; rngOwner = null; cui.flash = 'All five AD save slots are in use. Delete one on the Save file tab, then start the daily challenge.'; render(); return; }
  if (have) saveQ.retire(have);
  newGame('normal', null, D.seed, D.tid); state.chal = { id: D.id, s0: state.season, n: 1, tid: D.tid }; setActiveSlot(free); appMode = 'ad'; rngOwner = 'ad'; cui.adPick = false; resetUi(); ui.tab = 'office'; hideModal(); applyTheme(); save(); await flushSave();
  ui.flash = `Daily challenge${have ? ', restarted' : ''}: one season at ${teamName(D.tid)} (slot ${free}).`; render(); window.scrollTo(0, 0);
}

/* ---------- 8. the coaching search (AD, the Staff page) ---------- */
{ const _s = vStaff; vStaff = function () { const html = _s(); if (!csOn()) return html; const L = state.cands.HC || []; const open = state.phase === 'offseason' || (state.staff.HC && state.staff.HC.interim); if (!open || !L.length) return html; const S = csStore();
  return `<section class="card" id="x3cs"><div class="head"><div><div class="eyebrow">The coaching search</div><h2 class="h3">Interview the candidates</h2></div><p class="hint">The ratings don't tell you everything. Interviews show his fit, his integrity, his loyalty and how he handles the media, and those matter once he's hired. ${S.left} interview${S.left === 1 ? '' : 's'} left this year.</p></div>
   ${S.firm ? '<p class="small">The search firm has added its candidates.</p>' : `<button class="btn sm" data-act="x3firm">Hire a search firm (${fmM(csFirmCost())}): two more candidates</button>`}
   <div class="x3cs">${L.filter(c => !c.declined).slice(0, 9).map(c => { const seen = S.seen[c.id] || {}; return `<div class="x3csc"><b>${esc(c.name)}</b>${c.firm ? ' <span class="pill">Search firm</span>' : ''}<div class="small muted">${esc(c.bg)}</div><ul class="plainlist small">${Object.entries(CSQ).map(([q, l]) => seen[q] ? `<li><b>${esc(l)}</b> ${esc(seen[q])}</li>` : '').join('')}</ul><div class="row gap wrap">${Object.entries(CSQ).filter(([q]) => !seen[q]).map(([q, l]) => `<button class="btn ghost sm" data-act="x3ask" data-id="${c.id}" data-v="${q}" ${!seen.met && S.left <= 0 ? 'disabled' : ''}>${esc(l)}</button>`).join('')}</div></div>`; }).join('')}</div></section>` + html; }; }

/* ---------- 9-11. renovation, boosters, academics (the Athletic department page) ---------- */
{ const _d = vX2Dept; vX2Dept = function () { const html = _d(); if (!bizOn()) return html; const R_ = renoStore(); const B = bstStore(); const A = acadStore(); const a = B.ask;
  const reno = `<section class="card"><div class="eyebrow">Stadium renovation</div><h2 class="h3">${R_ && R_.st === 'build' ? `Under construction for ${R_.s}` : R_ && R_.st === 'done' ? `Renovated in ${R_.at}` : 'Renovate the stadium'}</h2><p class="small">${R_ && R_.st === 'build' ? `Part of the stadium is closed: the gate is about 15% smaller this season. It finishes next offseason, and the rest of the bill (${fmM(r1(R_.cost - R_.paid))}) is due then.` : `A two-year project: half the cost now, half when it's done. The season in between, part of the stadium is closed. After it, a bigger gate every home game, and a better stadium for recruiting.`}</p>${R_ && R_.st === 'build' ? '' : `<button class="btn sm" data-act="x3reno" ${state.phase === 'offseason' ? '' : 'disabled'}>Start a renovation (${fmM(renoCost())})</button>${state.phase === 'offseason' ? '' : '<p class="hint">Renovations start in the offseason.</p>'}`}</section>`;
  const bst = `<section class="card"><div class="eyebrow">Big boosters</div><div class="x3bst">${B.list.map(d => `<div><b>${esc(d.n)}</b><div class="small muted">${esc(BST_K[d.k])}</div>${xMeter(d.mood, 'Mood')}</div>`).join('')}</div>
    ${a && !a.done ? `<div class="decision mt"><b>${esc(a.n)} has an offer.</b> <p class="small">${esc({ coach: `${fmM(a.amt)} now, if he gets a seat in your next coaching search.`, suite: `${fmM(a.amt)} to put his name on the suite level.`, win: `${fmM(a.amt * 2)} next year, if you win nine games.`, facility: `A new weight room, paid for. He wants it built his way.` }[a.k])}</p><div class="row gap"><button class="btn sm primary" data-act="x3bst" data-v="yes">Accept</button><button class="btn sm ghost" data-act="x3bst" data-v="no">Say no</button></div></div>` : `<p class="small muted">${B.pledge ? `${esc(B.pledge.n)} has pledged ${fmM(B.pledge.amt)} if you win nine games in ${B.pledge.s}.` : 'A booster comes to you with an offer every offseason.'}</p>`}</section>`;
  const ac = `<section class="card"><div class="eyebrow">Academics</div><div class="row between gap wrap"><div>${A.hist[0] ? `<b>Team GPA ${A.hist[0].gpa.toFixed(2)}</b> · academic score <b class="${A.hist[0].apr < 930 ? 'res-l' : ''}">${A.hist[0].apr}</b>` : '<span class="small muted">The first academic report comes after the season.</span>'}</div>${seg('x3acad', String(A.lv), ACAD_LV.map((x, i) => [String(i), x[0]]))}</div><p class="hint">An academic score under 930 cuts practice time and recruiting visits for a season. Tutors cost ${fmM(ACAD_LV[1][1] * econ())} a year, full support ${fmM(ACAD_LV[2][1] * econ())}.${acadPen() ? ' <b>The penalty is in effect this season.</b>' : ''}</p></section>`;
  return html + reno + bst + ac; }; }

/* ---------- 12-13. the defensive playbook and the practice week (the Playbook page) ---------- */
function dpbSvg(d, o) {
  o = o || {}; const Y = dn => (6 + dn).toFixed(1); const r = d.r || {}; let s = `<svg class="x2pb x3dpb${o.ed ? ' ed' : ''}" ${o.ed ? 'id="x3dped" ' : ''}viewBox="-26 0 52 40" role="img" aria-label="${esc(d.n)}: defense diagram"><rect x="-26" y="0" width="52" height="40" class="x2pbf"/>`;
  for (let dn = 5; dn <= 30; dn += 5) s += `<line x1="-26" x2="26" y1="${Y(dn)}" y2="${Y(dn)}" class="x2pbyl"/>`; s += `<line x1="-26" x2="26" y1="6" y2="6" class="x2pblos"/>`;
  [-4.4, -2.2, 0, 2.2, 4.4].forEach(x => { s += `<circle cx="${x}" cy="4.6" r="0.8" class="x3dpo"/>`; }); s += `<circle cx="0" cy="1.2" r="0.8" class="x3dpo"/>`;
  Object.entries(DPB_FORM).forEach(([k, [dn, lat]]) => { const pts = r[k]; if (pts && pts.length) { const P_ = [[lat, dn]].concat(pts.map(p => [p[1], p[0]])); const rush = pts.some(p => p[0] < 0); const path = P_.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + Y(p[1])).join(' '); const a = P_[P_.length - 2], b = P_[P_.length - 1]; const ang = Math.atan2(+Y(b[1]) - +Y(a[1]), b[0] - a[0]); const ax = b[0], ay = +Y(b[1]); const hd = t => `${(ax - Math.cos(ang + t) * 1.4).toFixed(2)} ${(ay - Math.sin(ang + t) * 1.4).toFixed(2)}`;
    s += `<path d="${path}" class="x2pbr${rush ? ' tg' : ''}${o.sel === k ? ' sel' : ''}"/><path d="M${hd(0.5)} L${ax.toFixed(2)} ${ay.toFixed(2)} L${hd(-0.5)}" class="x2pbr${rush ? ' tg' : ''} hd"/>`; } });
  Object.entries(DPB_FORM).forEach(([k, [dn, lat]]) => { s += `<text x="${lat}" y="${(+Y(dn) + 0.9).toFixed(1)}" class="x3dpx${o.sel === k ? ' sel' : ''}">✕</text>${o.ed ? `<text x="${lat}" y="${(+Y(dn) - 1.6).toFixed(1)}" class="x2pbt" text-anchor="middle">${k}</text>` : ''}`; });
  return s + '</svg>';
}
function x3DpEd() { if (!ui.dpEd) ui.dpEd = { sel: 'LB1', r: {}, b: 'blitz', n: '', id: null }; return ui.dpEd; }
function x3DefenseHTML() {
  if (!dpbOn()) return ''; const B = dpbStore(); const f = dpbFit(); const bon = dpbBonus(); const sch = myScheme().def;
  const card = d => { const on = B.on.includes(d.id); return `<div class="x2pbc${on ? ' on' : ''}">${dpbSvg(d)}<div><b>${esc(d.n)}</b>${d.cr ? ' <span class="pill">Yours</span>' : (d.fit || []).includes(sch) ? ' <span class="pill good">Fits your system</span>' : ''}<div class="small muted">Plays like: ${esc(DCALLS[d.b])} · ${esc(d.d || '')}</div><div class="row gap wrap mt"><button class="btn sm${on ? '' : ' primary'}" data-act="x3dpb" data-id="${d.id}" aria-pressed="${on}">${on ? 'In the playbook ✓' : 'Add it'}</button>${d.cr ? `<button class="btn ghost sm" data-act="x3dpedit" data-id="${d.id}">Edit</button><button class="btn ghost sm" data-act="x3dpdel" data-id="${d.id}">Delete</button>` : ''}</div></div></div>`; };
  const E = x3DpEd(); const full = !E.id && B.custom.length >= DPB_CUSTOM;
  return `<section class="card" id="x3def"><div class="head"><div><div class="eyebrow">Defensive playbook</div><h2 class="h2">Your calls on defense</h2></div><p class="hint">Pick ${DPB_MIN} to ${DPB_MAX} calls. When you call the defense in a game, these are your buttons, and the field view runs your blitzes and coverages. Calls that fit your system, from at least four families, help a little.</p></div>
    <div class="tiles"><div><span class="k">Calls</span><span class="v">${f.n}</span><span class="s">${f.kinds} families</span></div><div><span class="k">Fit your system</span><span class="v">${f.fit} of ${f.n}</span><span class="s">${f.custom ? f.custom + ' of your own' : 'Draw your own below'}</span></div><div><span class="k">Effect on game day</span><span class="v">${B.set ? (bon > 0 ? '+' : '') + bon.toFixed(2) : '—'}</span><span class="s">${B.set ? 'On defense' : 'No effect until you change it'}</span></div></div>
    <div class="x2pbgrid mt">${Object.keys(DPB_PLAYS).map(dpbDef).concat(B.custom.map(c => dpbDef(c.id))).map(card).join('')}</div></section>
   <section class="card" id="x3dpedc"><div class="head"><div><div class="eyebrow">Draw your own defense</div><h2 class="h2">${E.id ? 'Edit: ' + esc(E.n) : 'A new call'}</h2></div><p class="hint">Pick a defender, then tap the field to draw his path, up to three points. Tap behind the line of scrimmage to send him after the quarterback.</p></div>
    <div class="x2pbedw">${dpbSvg({ n: E.n || 'Your call', r: E.r }, { ed: true, sel: E.sel })}<div>
     <div class="lbl">Drawing the path for</div>${seg('x3dpsel', E.sel, DPB_ROLES.map(k => [k, k + ((E.r[k] || []).length ? ' ✓' : '')]))}
     <div class="lbl mt">It plays like</div>${seg('x3dpb2', E.b, Object.entries(DCALLS).map(([k, l]) => [k, l]))}
     <div class="row gap wrap mt"><button class="btn ghost sm" data-act="x3dpundo">Undo a point</button><button class="btn ghost sm" data-act="x3dpnew">Start over</button></div>
     <label class="fld mt"><span>Name</span><input id="x3dpn" maxlength="28" value="${esc(E.n)}" placeholder="Name your call"></label>
     <div class="row gap wrap mt"><button class="btn primary" data-act="x3dpsave"${full ? ' disabled' : ''}>${E.id ? 'Save changes' : 'Add it to the playbook'}</button></div>${full ? `<p class="hint">You have ${DPB_CUSTOM} calls of your own. Delete one to draw another.</p>` : ''}${ui.dpMsg ? `<p class="small">${esc(ui.dpMsg)}</p>` : ''}</div></div></section>`;
}
function x3PracHTML() {
  if (!pracOn()) return ''; const P_ = pracStore(); const fx = pracFx();
  return `<section class="card" id="x3prac"><div class="head"><div><div class="eyebrow">Practice week</div><h2 class="h3">Install, rest and fatigue</h2></div><p class="hint">On top of your practice plan. Walkthroughs install your playbooks; rest days take fatigue off but cost sharpness. Hard weeks build fatigue: more injuries, slower legs late in games.</p></div>
   ${xMeter(P_.fat, 'Team fatigue')}<div class="plans mt"><div><div class="lbl">Walkthroughs to install plays</div>${seg('x3prac', String(P_.inst), [['0', 'None'], ['1', 'One'], ['2', 'Two']], 'data-k="inst"')}</div><div><div class="lbl">Rest days</div>${seg('x3prac', String(P_.rest), [['0', 'None'], ['1', 'One'], ['2', 'Two']], 'data-k="rest"')}</div></div>
   <p class="small">This week: offense and defense <b>${fx.off >= 0 ? '+' : ''}${fx.off.toFixed(2)}</b>, injury risk <b>×${fx.inj.toFixed(2)}</b>.</p></section>`;
}
{ const _p = vX2Pbook; vX2Pbook = function () { const off = pbkOn() ? _p() : ''; const def = x3DefenseHTML(); const pr = x3PracHTML(); if (!off && !def) return _p(); return pr + off + def; }; }
document.addEventListener('click', e => { const svg = e.target && e.target.closest ? e.target.closest('#x3dped') : null; if (!svg || !ui.dpEd || appMode !== 'ad') return; const m = svg.getScreenCTM(); if (!m) return; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(m.inverse());
  const E = ui.dpEd; const n = document.getElementById('x3dpn'); if (n) E.n = n.value; const L = E.r[E.sel] || (E.r[E.sel] = []); if (L.length >= 3) { ui.dpMsg = 'Three points a path at most.'; render(); return; }
  L.push([clamp(Math.round((p.y - 6) * 2) / 2, -8, 30), clamp(Math.round(p.x * 2) / 2, -24.5, 24.5)]); ui.dpMsg = ''; render(); });

/* ---------- 14. recruiting home visits (the Recruiting page) ---------- */
{ const _r = vRecruit; vRecruit = function () { const html = _r(); if (isPro() || isComm() || !state.rec) return html; const L = hvList(); const H = hvStore(); const left = Math.max(0, hvMax() - H.used);
  return `<section class="card" id="x3hv"><div class="head"><div><div class="eyebrow">Home visits · ${left} of ${hvMax()} left ${state.phase === 'offseason' ? 'this offseason' : 'this week'}</div><h2 class="h3">Sit down with the family</h2></div><p class="hint">Three questions at the kitchen table. Each recruit cares about two things most: answer to those and his interest jumps. Recruits you've offered show up here.</p></div>
   ${L.length ? `<ul class="plainlist">${L.map(r => `<li class="row between gap"><span><b>${'★'.repeat(r.star)} ${esc(r.pos)} ${esc(r.n)}</b> <span class="small muted">${esc(r.home)} · interest ${r.interest}</span></span><button class="btn sm" data-act="x3hv" data-id="${r.id}" ${left ? '' : 'disabled'}>Home visit</button></li>`).join('')}</ul>` : '<p class="small muted">Offer a three-star or better to visit his family.</p>'}</section>` + html; }; }
function x3HvOpen(rid) {
  const r = state.rec && state.rec.list.find(x => x.id === rid); if (!r) return; ui.hvAns = { rid, a: [] };
  openModal(`<div class="eyebrow">Home visit · ${esc(r.home)}</div><h2 class="h2">${'★'.repeat(r.star)} ${esc(r.pos)} ${esc(r.n)}</h2><div id="x3hvq"></div>`, 'Home visit'); x3HvStep();
}
function x3HvStep() {
  const A = ui.hvAns; const el = document.getElementById('x3hvq'); if (!A || !el) return; const i = A.a.length;
  if (i >= HV_Q.length) { const r = hvVisit(A.rid, A.a); const pr = r.pri ? r.pri.map(k => HV_PRI[k].toLowerCase()).join(' and ') : ''; el.innerHTML = `<p class="big">${r.ok ? (r.d >= 0 ? '+' : '') + r.d + ' interest' : ''}</p><p>${esc(r.txt)}</p>${r.ok ? `<p class="small muted">What he cared about most: ${esc(pr)}.</p>` : ''}<button class="btn primary" data-act="close">Done</button>`; save(); render(); return; }
  const [q, opts] = HV_Q[i]; el.innerHTML = `<p class="small muted">Question ${i + 1} of ${HV_Q.length}</p><p><b>${esc(q)}</b></p><div class="evopts">${opts.map(([k, t]) => `<button class="evopt" data-act="x3hva" data-v="${k}"><b>${esc(t)}</b></button>`).join('')}</div>`;
}

/* ---------- 16. agents in contract talks; 18. deadline day; 19. the new stadium ---------- */
{ const _rs = proResignStep; proResignStep = function () { let html = _rs.apply(this, arguments); try { const p = ui.rsFor && P(ui.rsFor); if (p) { const g = gmAgentOf(p); html = html.replace('<button class="btn ghost sm" data-act="rsclose">Close</button></div>', `<button class="btn ghost sm" data-act="rsclose">Close</button></div><p class="small x3agent">Agent: <b>${esc(g.n)}</b> · <span class="pill">${esc(AGENT_ST[g.st][0])}</span> ${esc(AGENT_ST[g.st][1])}${g.st === 'friend' && rapOf(p) >= 55 ? ' Your client likes it here.' : ''}</p>`); } } catch (e) { } return html; }; }
{ const _t = vProTrades; vProTrades = function () { const html = _t(); if (!isGM()) return html; const D = X().tdd; if (!D || D.s !== state.season || state.week !== 9 || state.phase === 'offseason') return html;
  return `<section class="card next" id="x3tdd"><div class="eyebrow">Trade deadline day</div><h2 class="h3">The phones are ringing</h2><ul class="plainlist small">${D.rum.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="hint">Offers made today expire when this week's games are played.</p></section>` + html; }; }
{ const _o = vProOffice; vProOffice = function () { const html = _o(); if (!isGM()) return html; const S = stadStore(); if (!S) return html;
  if (S.st === 'ask') return `<section class="card next"><div class="eyebrow">A new stadium</div><h2 class="h3">The owner wants a new stadium</h2><p class="small">He wants a new home for the ${esc(myName())}. How do you pay for it?</p><div class="evopts"><button class="evopt" data-act="x3stad" data-v="public"><b>Ask the voters for public money</b><span>Cheaper for the owner. A losing team or angry fans can sink the vote.</span></button><button class="evopt" data-act="x3stad" data-v="private"><b>The owner pays for it himself</b><span>It gets built. He won't love the bill.</span></button><button class="evopt" data-act="x3stad" data-v="stay"><b>Talk him out of it</b><span>Keep the old place, for now.</span></button></div></section>` + html;
  if (S.st === 'move') return `<section class="card next"><div class="eyebrow">Relocation</div><h2 class="h3">The vote failed. The owner is looking at other cities</h2><p class="small">Move the team, or talk him into staying.</p><div class="row gap wrap">${STAD_CITIES.slice(0, 4).map(c => `<button class="btn sm" data-act="x3stad" data-v="${esc(c)}">Move to ${esc(c)}</button>`).join('')}<button class="btn sm primary" data-act="x3stad" data-v="stay">Stay</button></div></section>` + html;
  if (S.st === 'build') return `<section class="card"><div class="eyebrow">A new stadium</div><p class="small">Construction is under way. It opens in ${S.done}.</p></section>` + html;
  return html; }; }

/* ---------- 20-23. Player Career ---------- */
function x3CareerCards() {
  let out = '';
  if (sbOn()) { const S = sbStore(); if (S.inv) out += `<section class="card next"><div class="eyebrow">Senior Bowl week</div><h2 class="h3">You're invited</h2><p class="small">A week of practice in front of every scout in the league. Good work moves your draft stock${S.bonus ? `: so far <b>${S.bonus >= 0 ? '+' : ''}${S.bonus.toFixed(1)}</b>` : ''}.</p><div class="x2trn">${Object.entries(SB_DRILLS).map(([k, l]) => `<div class="drill"><b>${esc(l)}</b>${S.done[k] != null ? `<div class="small">Done: ${Math.round(S.done[k] * 100)}%</div>` : `<button class="btn sm mt" data-act="x3sb" data-k="${k}">Start</button>`}</div>`).join('')}</div>${S.game ? `<p class="small mt">${S.game.mvp ? '<b>Senior Bowl MVP!</b>' : 'A good game in the Senior Bowl.'}</p>` : ''}</section>`; }
  if (pbOn()) out += `<section class="card next"><div class="eyebrow">Pro Bowl</div><h2 class="h3">You made the Pro Bowl</h2><p class="small">Play in the skills showdown. A big day makes you the Pro Bowl MVP.</p><button class="btn primary sm" data-act="x3pb">Play in the Pro Bowl</button></section>`;
  const pc = pcSync(); if (pc) out += `<section class="card next"><div class="eyebrow">A position change</div><h2 class="h3">The coaches want you at ${esc(pc.to)}</h2><p class="small">They think you'd see the field more at ${esc(CPOS_NAME[pc.to] ? CPOS_NAME[pc.to].toLowerCase() : pc.to)}. Your skills carry over where they can; you'd learn the rest.</p><div class="row gap"><button class="btn sm primary" data-act="x3pc" data-v="yes">Make the move</button><button class="btn sm ghost" data-act="x3pc" data-v="no">Stay at ${esc(pc.from)}</button></div></section>`;
  if (['hs', 'col', 'nfl'].includes(cs.phase)) { const C = capStore(); if (C.is) out += `<section class="card${C.ev ? ' next' : ''}"><div class="eyebrow">Team captain · chemistry ${C.chem >= 0 ? '+' : ''}${C.chem}</div>${C.ev ? `<h2 class="h3">Trouble in the locker room</h2><p class="small">${esc(CAP_EV[C.ev.i][0])}</p><div class="evopts">${Object.entries(CAP_CH).map(([k, [l, d]]) => `<button class="evopt" data-act="x3cap" data-v="${k}"><b>${esc(l)}</b><span>${esc(d)}</span></button>`).join('')}</div>` : `<p class="small">You're a captain. Good chemistry makes the whole team a little better on game day.</p>`}</section>`; }
  return out;
}
{ const _ch = vCHome; vCHome = function () { return x3CareerCards() + _ch(); }; }
function x3HofHTML() {
  if (!hofOn()) return ''; const H = CX().hofSel || (CX().hofSel = { m: [], p: [] }); const M = hofMoments(), PP = hofPeople();
  return `<section class="card next"><div class="eyebrow">Hall of Fame</div><h2 class="h3">Your induction speech</h2><p class="small">Pick up to three moments and up to three people to thank.</p><div class="x3hof"><div><div class="lbl">Moments</div>${M.map(m => `<label class="chk"><input type="checkbox" data-x3hof="m" value="${esc(m.k)}" ${H.m.includes(m.k) ? 'checked' : ''}> ${esc(m.t)}</label>`).join('') || '<p class="small muted">Your career.</p>'}</div><div><div class="lbl">People</div>${PP.map(m => `<label class="chk"><input type="checkbox" data-x3hof="p" value="${esc(m.k)}" ${H.p.includes(m.k) ? 'checked' : ''}> ${esc(m.t)}</label>`).join('')}</div></div><button class="btn primary mt" data-act="x3hof">Give the speech</button></section>`;
}
{ const _nc = nextChapterHTML; nextChapterHTML = function () { return x3HofHTML() + _nc(); }; }
document.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset || !t.dataset.x3hof || appMode !== 'career') return; const H = CX().hofSel || (CX().hofSel = { m: [], p: [] }); const L = H[t.dataset.x3hof]; const i = L.indexOf(t.value); if (t.checked && i < 0) { if (L.length >= 3) { t.checked = false; return; } L.push(t.value); } else if (!t.checked && i >= 0) L.splice(i, 1); });
// the Senior Bowl and Pro Bowl drills use the combine's mini-games
function x3DrillOpen(kind, k, title, how) { const T_ = { pos: 'pos', talk: 'talk', forty: 'forty' }[k] || 'pos'; xd = { k: T_, pro: false, t0: 0, n: 0, reps: [], hits: [], q: 0, ok: 0, done: false, x3: kind, x3k: k };
  openModal(`<div class="eyebrow">${esc(kind === 'sb' ? 'Senior Bowl week' : 'Pro Bowl')}</div><h2 class="h2">${esc(title)}</h2><p>${esc(how)}</p><div id="xdrill" class="xdrill"></div><div class="row gap mt" id="xdctl"><button class="btn primary" data-act="xdgo">Start</button><button class="btn ghost" data-act="close">Not now</button></div>`, title); }
{ const _xf = xDrillFinish; xDrillFinish = function (perf) { if (!xd || !xd.x3) return _xf(perf); if (xd.done) return; xd.done = true; let msg = ''; if (xd.x3 === 'sb') { sbFinish(xd.x3k, perf); const S = sbStore(); msg = `Draft stock so far: ${S.bonus >= 0 ? '+' : ''}${S.bonus.toFixed(1)}.${S.game && S.game.mvp ? ' Senior Bowl MVP!' : ''}`; } else { const B = pbPlay(perf); msg = B && B.mvp ? 'Pro Bowl MVP!' : 'A fun day at the Pro Bowl.'; } cSave();
  const el = document.getElementById('xdrill'); if (el) el.innerHTML = `<p class="big">${Math.round(clamp(perf, 0, 1) * 100)}%</p><p class="small muted">${esc(msg)}</p>`; const c = document.getElementById('xdctl'); if (c) c.innerHTML = '<button class="btn primary" data-act="close">Done</button>'; render(); }; }

/* ---------- 24. prime-time picks (the commissioner's office) ---------- */
{ const _c = vCmOffice; vCmOffice = function () { const html = _c(); const sl = tvSlate(); if (!sl.length) return html; const S = tvStore(); const cur = S.wk[state.week] || []; const last = S.hist[0];
  return `<section class="card" id="x3tv"><div class="head"><div><div class="eyebrow">Prime time · ${esc(isPro() ? nflWeekLabel(state.week) : weekLabel(state.week))}</div><h2 class="h3">Pick the games for the big TV windows</h2></div><p class="hint">Two picks. Close games between good teams pay; blowouts don't, and snubbing the best game of the week makes the fans mad.</p></div>
   <div class="x3keys">${sl.map(g => `<button class="evopt${cur.includes(g.id) ? ' on' : ''}" data-act="x3tv" data-id="${g.id}" aria-pressed="${cur.includes(g.id)}"><b>${!isPro() && rankOf(g.a) ? 'No. ' + rankOf(g.a) + ' ' : ''}${esc(teamName(g.a))} at ${!isPro() && rankOf(g.h) ? 'No. ' + rankOf(g.h) + ' ' : ''}${esc(teamName(g.h))}</b><span>${esc(record(g.a))} vs. ${esc(record(g.h))}</span></button>`).join('')}</div>
   ${last ? `<p class="small mt">Last week: ${last.score >= 2 ? 'great TV.' : last.score > 0 ? 'decent TV.' : 'not great TV.'}${last.snub ? ' You snubbed the best game.' : ''}</p>` : ''}</section>` + html; }; }

/* ---------- 3. share cards ---------- */
function x3Canvas(o) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const g = c.getContext('2d'); const c1 = o.c1 || '#13294b', c2 = o.c2 || '#ffcb05';
  g.fillStyle = c1; g.fillRect(0, 0, 1200, 630); g.fillStyle = c2; g.fillRect(0, 560, 1200, 70); g.globalAlpha = 0.08; g.fillStyle = '#fff'; for (let x = -200; x < 1400; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 300, 630); g.lineTo(x + 330, 630); g.lineTo(x + 30, 0); g.fill(); } g.globalAlpha = 1;
  const lum = h => { const n = parseInt(String(h).replace('#', ''), 16); return ((n >> 16 & 255) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114) / 255; }; const ink = lum(c1) > 0.6 ? '#111' : '#fff';
  g.fillStyle = ink; g.font = '600 28px system-ui, sans-serif'; g.fillText(String(o.eyebrow || '').toUpperCase(), 70, 100);
  g.font = '900 84px system-ui, sans-serif'; let t = String(o.title || ''); while (g.measureText(t).width > 1060 && t.length > 4) t = t.slice(0, -2); g.fillText(t, 70, 210);
  if (o.big) { g.font = '900 120px system-ui, sans-serif'; g.fillText(o.big, 70, 360); }
  g.font = '500 34px system-ui, sans-serif'; (o.lines || []).slice(0, 4).forEach((l, i) => { let s = String(l); while (g.measureText(s).width > 1060 && s.length > 4) s = s.slice(0, -2); g.fillText(s, 70, (o.big ? 430 : 300) + i * 46); });
  g.fillStyle = lum(c2) > 0.6 ? '#111' : '#fff'; g.font = '800 28px system-ui, sans-serif'; g.fillText('FOOTBALL EMPIRE', 70, 606); return c;
}
async function x3ShareCard(k, id, btn) {
  let o = null;
  if (k === 'game') { const g = (state.games || []).find(x => x.id === id); if (!g || !g.done) return; const w = g.hs > g.as; const me = [g.h, g.a].includes(ME) && !isComm() ? ME : (w ? g.h : g.a); const col = isPro() && NFL_BY[me] ? [NFL_BY[me].c1, NFL_BY[me].c2] : TEAM_INFO[me] ? [TEAM_INFO[me].c1, TEAM_INFO[me].c2] : null;
    o = { eyebrow: `${g.name || (isPro() ? nflWeekLabel(g.wk) : weekLabel(g.wk))} · Final${g.ot ? ' (OT)' : ''}`, title: `${teamName(g.a)} at ${teamName(g.h)}`, big: `${g.as} – ${g.hs}`, lines: [`${teamName(w ? g.h : g.a)} win.`], c1: col && col[0], c2: col && col[1] }; }
  if (k === 'season') { const h = isPro() ? (PS().hist || []).slice(-1)[0] : (state.history || []).slice(-1)[0]; const s = h ? (h.s || h.season) : state.season; const t = T(ME); const col = isPro() && NFL_BY[ME] ? [NFL_BY[ME].c1, NFL_BY[ME].c2] : TEAM_INFO[ME] ? [TEAM_INFO[ME].c1, TEAM_INFO[ME].c2] : null;
    o = { eyebrow: `${s} season`, title: myName(), big: h ? `${h.w}-${h.l}` : `${t.w}-${t.l}`, lines: h ? [isPro() ? (h.po === 5 ? 'Super Bowl champions' : h.po ? 'Made the playoffs' : '') : [h.rank ? 'Final rank: No. ' + h.rank : '', h.bowl || '', h.champ === ME ? 'National champions' : ''].filter(Boolean).join(' · ')] : ['Season in progress'], c1: col && col[0], c2: col && col[1] }; }
  if (k === 'career') { const p = cs.p; const aw = (p.awards || []).slice(-3).map(a => a.a); o = { eyebrow: `${CPOS_NAME[p.pos] || p.pos} · #${p.num}`, title: cName(p), lines: [`${(p.seasons || []).length} seasons`, aw.length ? aw.join(' · ') : 'The journey so far', cs.nfl && cs.nfl.retired ? cs.nfl.retired.verdict : ''].filter(Boolean) }; }
  if (!o) return; const cv = x3Canvas(o); const name = `football-empire-${k}.png`;
  const say = t => { if (btn) { const o2 = btn.textContent; btn.textContent = t; setTimeout(() => { if (btn.isConnected) btn.textContent = o2; }, 2500); } };
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); if (!blob) return say('Not available here');
  const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) { try { await dl.save({ filename: name, data: blob }); say('Saved'); return; } catch (e) { if (e && e.code === 'declined') return say('Not saved'); } }
  try { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); say('Downloading'); } catch (e) { say('Downloads are blocked here'); }
}
{ const _bx = boxScore; boxScore = function (g) { const html = _bx(g); return g && g.done ? html + `<div class="row gap mt"><button class="btn ghost sm" data-act="x3card" data-k="game" data-id="${g.id}">Share the final as an image</button></div>` : html; }; }

/* ---------- 2, 12, 15. the live game: commentary, defensive calls, the two-minute drill ---------- */
const COM_PBP = { td: ['Touchdown, {T}!', '{T} punches it in!', 'And {T} scores!', 'Into the end zone, and {T} has six!'], fg: ['The kick is good. Three for {T}.', 'Right down the middle. {T} adds three.'], miss: ['No good! {T} comes away empty.', 'Wide! {T} misses.'], punt: ['{T} has to punt it away.', 'Three and out for {T}.', 'That drive stalls, and {T} punts.'], to: ['Turnover! {O} takes it away!', 'Coughed up! {O} ball!', 'Picked off! {O} has it!'], downs: ['Stopped on fourth down!', 'Turned away on downs!'] };
const COM_AN = { lead: ['That changes everything. {T} in front now.', 'A new leader, and this place is rocking.'], rout: ['This one is getting away from {O}.', 'At some point you have to find an answer, and {O} hasn\'t.'], late: ['Every possession matters now.', 'Clock management is everything from here.'], long: ['{N} plays on that drive. That\'s how you wear a defense down.', 'A long, patient drive. {N} plays.'], fast: ['{N} plays, {Y} yards. That was fast.', 'Quick strike. The defense never got set.'], def: ['Great job by the {O} defense there.', 'The defense bent but didn\'t break.'], gen: ['Field position battle right now.', 'Both teams feeling each other out.', 'You can feel the momentum swinging.'] };
function x3Commentary(sim) {
  const L = sim.log.map((x, i) => [x, i]).filter(([x]) => !x.half); const out = [];
  L.slice(-2).forEach(([x, i]) => { const h = q => hmix((sim.ckKey || '') + ':com:' + i + ':' + q); const T_ = teamName(sim.ids[x.s]), O_ = teamName(sim.ids[1 - x.s]); const kind = x.out === 'fg' ? (x.score ? 'fg' : 'miss') : x.out === 'td' || (x.score && /TD/.test(x.txt)) ? 'td' : x.out === 'to' ? 'to' : x.out === 'downs' ? 'downs' : 'punt';
    const prev = i > 0 ? (sim.log.slice(0, i).filter(y => !y.half && y.pts).pop() || { pts: [0, 0] }).pts : [0, 0]; const m0 = prev[x.s] - prev[1 - x.s], m1 = x.pts ? x.pts[x.s] - x.pts[1 - x.s] : m0;
    const ctx = kind === 'td' || kind === 'fg' ? (m0 <= 0 && m1 > 0 ? 'lead' : Math.abs(m1) >= 24 ? 'rout' : (x.qtr >= 4 && Math.abs(m1) <= 8) ? 'late' : x.np >= 10 ? 'long' : x.np <= 3 && x.yards >= 45 ? 'fast' : 'gen') : (kind === 'to' || kind === 'downs') ? 'def' : (x.qtr >= 4 && Math.abs(m1) <= 8 ? 'late' : 'gen');
    const fill = s => s.replace(/\{T\}/g, kind === 'to' || kind === 'downs' ? O_ : T_).replace(/\{O\}/g, kind === 'to' || kind === 'downs' ? O_ : O_).replace(/\{N\}/g, x.np || 0).replace(/\{Y\}/g, x.yards || 0);
    out.push({ pbp: fill(x3pick(COM_PBP[kind], h('p'))).replace(O_ + ' takes', O_ + ' takes'), an: fill(x3pick(COM_AN[ctx], h('a'))).replace(/\{O\}/g, ctx === 'rout' ? (m1 > 0 ? O_ : T_) : O_) }); });
  return out;
}
let x3DpName = null;
{ const _rd = runDefPlay; runDefPlay = function (sim, call) { if (!x3DpName || !DCALLS[call]) return _rd(sim, call); const old = DCALLS[call]; DCALLS[call] = x3DpName; try { return _rd(sim, call); } finally { DCALLS[call] = old; } }; }
{ const _ld = actions.ldcall; actions.ldcall = function (d) { const sim = live.sim; const p = sim && sim.pending; const def = d.dpb ? dpbDef(d.dpb) : null; if (p && p.type === 'ddrive' && def && DCALLS[d.v]) { const ds = p.ds; (ds.dpb || (ds.dpb = []))[ds.plays.length] = d.dpb; x3DpName = def.n; try { return _ld.call(this, d); } finally { x3DpName = null; } } return _ld.call(this, d); }; }
{ const _rl = renderLive; renderLive = function () { _rl(); try { x3LiveDecor(); } catch (e) { if (typeof console !== 'undefined') console.error('live extras 3', e); } }; }
const fmClk = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
function x3LiveDecor() {
  const sim = live.sim; if (!sim || sim.mSide < 0) return; const mb = document.querySelector('#modal .mbody'); if (!mb) return; const p = sim.pending;
  if (prefs.x3com !== 'off') { const C = x3Commentary(sim); const row = mb.querySelector('.live .lrow'); if (row && C.length) { const d = document.createElement('div'); d.className = 'lcom'; d.setAttribute('aria-live', 'off'); d.innerHTML = C.slice(-1).map(c => `<p><b>Gary Holt:</b> ${esc(c.pbp)}</p><p><b>Tess Monroe:</b> ${esc(c.an)}</p>`).join(''); row.after(d); } }
  if (p && p.type === 'ddrive' && dpbOn()) { const calls = mb.querySelector('.calls'); const L = dpbCalls(); if (calls && L && L.length) { calls.classList.add('x2calls'); calls.innerHTML = L.map(d => `<button class="evopt" data-act="ldcall" data-v="${d.b}" data-dpb="${d.id}"><b>${esc(d.n)}</b><span>${esc(DCALLS[d.b])}${typeof DCALL_HINT !== 'undefined' && DCALL_HINT[d.b] ? ' · ' + esc(DCALL_HINT[d.b]) : ''}</span></button>`).join(''); } }
  if (p && p.type === '2min') { const dec = mb.querySelector('.decision'); if (!dec) return; const D = sim.tmd;
    if (!D) { const ev = dec.querySelector('.evopts'); if (ev && !ev.querySelector('[data-act="x3tmd"]')) ev.insertAdjacentHTML('beforeend', '<button class="evopt" data-act="x3tmd"><b>Run the drill yourself</b><span>Call every play against the clock.</span></button>'); return; }
    const spot = D.yl === 50 ? 'midfield' : D.yl < 50 ? 'your own ' + D.yl : 'their ' + (100 - D.yl); const fgOk = !D.done && 117 - D.yl <= 58;
    dec.innerHTML = `<div class="eyebrow">Two-minute drill · ${sim.pts[sim.mSide]}–${sim.pts[1 - sim.mSide]}</div><div class="x3tmd"><b class="x3clk">${fmClk(D.clk)}</b><span>${D.done ? 'Drive over' : `${['1st', '2nd', '3rd', '4th'][D.down - 1]} & ${100 - D.yl < D.togo ? 'goal' : D.togo} at ${esc(spot)}`}</span><span class="small muted">Timeouts: ${D.to}</span></div>
      <div class="field" aria-hidden="true"><i class="los" style="left:${D.yl}%"></i></div><ul class="plainlist small dlog">${D.log.slice(-4).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      ${D.done ? `<p><b>${{ td: 'Touchdown!', fg: `Field goal try from ${D.fg} yards.`, to: 'Turnover.', downs: 'The drive comes up short.' }[D.done]}</b></p><button class="btn primary" data-act="x3tmdfin">Back to the game</button>` : `<div class="calls x2calls">${Object.entries(TMD).map(([k, [l, h]]) => `<button class="evopt" data-act="x3tmdp" data-v="${k}"><b>${esc(l)}</b><span>${esc(h)}</span></button>`).join('')}<button class="evopt" data-act="x3tmdp" data-v="to" ${D.to ? '' : 'disabled'}><b>Timeout</b><span>The next play won't cost much clock.</span></button>${fgOk ? `<button class="evopt" data-act="x3tmdk"><b>Kick the field goal</b><span>${117 - D.yl} yards</span></button>` : ''}</div>`}`; }
}

/* ---------- the actions ---------- */
{ const _b = actions.build; actions.build = function (d) { const f = state && state.facilities && state.facilities.find(x => x.id === d.id); const was = f && f.building; const r = _b.apply(this, arguments); try { if (f && !was && f.building) jrAdd('build', `Started work on ${facName(f.id)} (level ${f.lvl + 1})`); } catch (e) { } return r; }; }
Object.assign(actions, {
  x3prep(d) { if (prepSet(d.v)) after(); },
  x3sv(d) { const v = d.v === 'hall' || d.v === 'jr' ? d.v : 'story'; if (appMode === 'career') cui.storyV = v; else ui.storyV = v; render(); },
  x3sf(d) { if (!STORY_F.some(f => f[0] === d.v)) return; if (appMode === 'career') cui.storyF = d.v; else ui.storyF = d.v; render(); },
  x3daily() { x3DailyStart(); },
  x3dailyre() { cui.confirm = null; x3DailyStart(true); },
  async x3dailypost(d, el) { const r = typeof sharePost === 'function' ? await sharePost() : 'unavailable'; after(r === 'ok' ? 'Posted. See the board on the Home screen.' : r === 'empty' ? 'Finish the season first.' : 'The leaderboard is only reachable from the game\'s claude.ai link.'); },
  x3firm() { const r = csFirm(); after(r === 'ok' ? 'Two more candidates are on the list.' : r === 'money' ? 'Not enough money in the reserve.' : ''); },
  x3ask(d) { const r = csAsk(d.id, d.v); after(r === 'none' ? 'No interviews left this year.' : ''); },
  x3reno() { const r = renoStart(); after({ ok: 'The renovation is on.', busy: 'A renovation is already under way.', money: 'You need half the cost in the reserve.', when: 'Renovations start in the offseason.' }[r] || ''); },
  x3bst(d) { const t = bstAnswer(d.v === 'yes'); if (t) after(t); },
  x3acad(d) { acadStore().lv = clamp(+d.v, 0, 2); after(); refocus({ act: 'x3acad', v: d.v }); },
  x3dpb(d) { const r = dpbToggle(d.id); after(r === 'min' ? `Keep at least ${DPB_MIN} calls.` : r === 'max' ? `${DPB_MAX} calls at most. Take one out first.` : ''); },
  x3dpsel(d) { const E = x3DpEd(); const n = document.getElementById('x3dpn'); if (n) E.n = n.value; E.sel = d.v; render(); },
  x3dpb2(d) { const E = x3DpEd(); const n = document.getElementById('x3dpn'); if (n) E.n = n.value; E.b = d.v; render(); },
  x3dpundo() { const E = x3DpEd(); const L = E.r[E.sel]; if (L && L.length) L.pop(); if (L && !L.length) delete E.r[E.sel]; render(); },
  x3dpnew() { ui.dpEd = null; ui.dpMsg = ''; render(); },
  x3dpsave() { const E = x3DpEd(); const n = document.getElementById('x3dpn'); if (n) E.n = n.value; const r = dpbSave({ n: E.n, r: E.r, b: E.b, id: E.id }); const M = { name: 'Give your call a name.', routes: 'Draw a path for at least one defender.', max: `You can keep ${DPB_CUSTOM} calls of your own.`, role: 'Only the defensive play caller can do that.', kind: 'Pick what it plays like.' }; if (r === 'ok') { ui.dpEd = null; ui.dpMsg = ''; after('Saved to your defensive playbook.'); } else { ui.dpMsg = M[r] || ''; render(); } },
  x3dpedit(d) { const c = dpbDef(d.id); if (!c || !c.cr) return; ui.dpEd = { sel: Object.keys(c.r)[0] || 'LB1', r: JSON.parse(JSON.stringify(c.r)), b: c.b, n: c.n, id: c.id }; ui.dpMsg = ''; render(); const el = document.getElementById('x3dpedc'); if (el) el.scrollIntoView({ block: 'start' }); },
  x3dpdel(d) { if (dpbDelete(d.id)) { if (ui.dpEd && ui.dpEd.id === d.id) ui.dpEd = null; after('Deleted.'); } },
  x3prac(d) { if (pracSet(d.k, d.v)) { after(); refocus({ act: 'x3prac', k: d.k, v: d.v }); } },
  x3hv(d) { x3HvOpen(d.id); },
  x3hva(d) { if (!ui.hvAns) return; ui.hvAns.a.push(d.v); x3HvStep(); },
  x3stad(d) { const r = stadChoose(d.v); if (r) after(r); },
  x3sb(d) { x3DrillOpen('sb', d.k, SB_DRILLS[d.k], d.k === 'talk' ? 'Three questions from an NFL coaching staff.' : 'Hit the cone that lights up, as fast as you can.'); },
  x3pb() { x3DrillOpen('pb', 'forty', 'Skills showdown', 'Tap as fast as you can for four seconds.'); },
  x3pc(d) { const r = pcAnswer(d.v === 'yes'); if (r) cAfter(r.st === 'yes' ? `You're a ${r.to} now. Your skill points carry over where they fit.` : 'You stay put.'); },
  x3cap(d) { const r = capChoose(d.v); if (r) cAfter(r.d > 0 ? 'The team came together.' : r.d < 0 ? 'That didn\'t go the way you wanted.' : 'The coaches handled it.'); },
  x3hof() { const H = CX().hofSel || { m: [], p: [] }; CX().hofDone = true; cSave(); dnPlay('Hall of Fame induction', 'Canton, Ohio', hofScript(H.m, H.p)); },
  x3tv(d) { if (tvPick(d.id)) after(); },
  x3card(d, el) { x3ShareCard(d.k, d.id, el || document.querySelector(`[data-act="x3card"][data-k="${d.k}"]`)); },
  x3tmd() { if (!liveBusy() || !live.sim || !live.sim.pending || live.sim.pending.type !== '2min') return; tmdStart(live.sim); renderLive(); },
  x3tmdp(d) { if (!live.sim || !live.sim.tmd) return; tmdPlay(live.sim, d.v); renderLive(); },
  x3tmdk() { if (!live.sim || !live.sim.tmd) return; tmdKick(live.sim); renderLive(); },
  x3tmdfin() { const sim = live.sim; if (!sim || !sim.tmd || !sim.tmd.done || !sim.pending) return; simResolve(sim, 'xd:' + sim.tmd.done); renderLive(); liveTick(); },
});
// the first screen is drawn before these files load: draw the Home screen again so its new cards show
setTimeout(() => { try { if (typeof appMode !== 'undefined' && appMode === 'home' && $('#modal').hidden) render(); } catch (e) { } }, 0);

