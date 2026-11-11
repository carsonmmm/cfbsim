/* ===================== EXTRAS 2 (v9.14): the pages ===================== */
// The pages for ext2.js: Pregame show, Front page, Advanced stats, Rivalry trophies, Athletic department, Playbook and
// Player meetings (new tabs), plus cards on pages that already exist (Highlights, Save file, Game day & business,
// Staff, Trades, the offices, League & rules, the Player Career pages, the Home screen) and the live game's win
// chance graph and playbook calls.
const X2_TABS = [['pregame', 'Pregame show'], ['paper', 'Front page'], ['adv', 'Advanced stats'], ['trophy', 'Rivalry trophies'], ['dept', 'Athletic department'], ['pbook', 'Playbook'], ['meet', 'Player meetings']];
(function x2TabsInit() {
  const T2 = k => X2_TABS.find(t => t[0] === k);
  const at = (L, after, ks) => { let i = L.findIndex(t => t[0] === after); if (i < 0) i = L.length - 1; L.splice(i + 1, 0, ...ks.map(T2).filter(it => !L.some(t => t[0] === it[0]))); };
  const grp = (G, name, ks) => { const g = G.find(x => x[0] === name); if (g) ks.forEach(k => { if (!g[1].includes(k)) g[1].push(k); }); };
  at(TABS, 'reels', ['pregame', 'paper', 'adv']); at(TABS, 'fac', ['dept']); at(TABS, 'depth', ['pbook', 'meet']); at(TABS, 'records', ['trophy']);
  grp(TAB_GROUPS, 'Season', ['pregame', 'paper', 'adv']); grp(TAB_GROUPS, 'Business', ['dept']); grp(TAB_GROUPS, 'Program', ['pbook', 'meet']); grp(TAB_GROUPS, 'Career', ['trophy']);
  at(PRO_TABS, 'reels', ['pregame', 'paper', 'adv']); at(PRO_TABS, 'depth', ['pbook', 'meet']); at(PRO_TABS, 'records', ['trophy']);
  grp(PRO_GROUPS, 'Season', ['pregame', 'paper', 'adv']); grp(PRO_GROUPS, 'Team', ['pbook', 'meet']); grp(PRO_GROUPS, 'Career', ['trophy']);
  CTABS.splice(CTABS.findIndex(t => t[0] === 'league') + 1, 0, ['cshow', 'Pregame show'], ['cpaper', 'Front page']); grp(CTAB_GROUPS, 'Football', ['cshow', 'cpaper']);
  if (PREF_CHOICES.fcam && !PREF_CHOICES.fcam.includes('tilt')) PREF_CHOICES.fcam.push('tilt');
})();
{
  const _ct = commTabList; commTabList = function () { const L = _ct(); const i = L.findIndex(t => t[0] === 'reels'); L.splice(i < 0 ? L.length - 2 : i + 1, 0, ['pregame', 'Pregame show'], ['paper', 'Front page']); return L; };
  const _cg = commGroups; commGroups = function () { const G = _cg(); const f = G.find(g => g[0] === 'Fans'); if (f) f[1].push('pregame', 'paper'); return G; };
  const _tv = xTabVis; xTabVis = function (k) { if (!X2_TABS.some(t => t[0] === k)) return _tv(k); if (k === 'pregame' || k === 'paper') return true; if (k === 'adv' || k === 'trophy') return !isComm(); if (k === 'dept') return bizOn(); return isCoach(); };
  const _xv = xView; xView = function (tab) { const v = { pregame: vX2Show, paper: vX2Paper, adv: vX2Adv, trophy: vX2Trophy, dept: vX2Dept, pbook: vX2Pbook, meet: vX2Meet }[tab]; return v && xTabVis(tab) ? v : _xv(tab); };
  const _xc = xCView; xCView = function (tab) { return { cshow: vX2Show, cpaper: vX2Paper }[tab] || _xc(tab); };
}
const X2_COLS = ['#2f6fd6', '#c2417a', '#c27c0e'];
const x2Av = (n, i, sm) => `<span class="xav${sm ? ' sm' : ''}" style="background:${X2_COLS[i % 3]}" aria-hidden="true">${esc(xIni(n))}</span>`;

/* ---------- 1. the pregame show ---------- */
function vX2Show() {
  const show = pgEnsure(); const S = pgStore();
  const hosts = PG_HOSTS.map((h, i) => `<div class="x2host">${x2Av(h.n, i)}<div><b>${esc(h.n)}</b><div class="small muted">${esc(h.bio)}</div><div class="small">Picks this season: <b>${S.rec[i][0]}-${S.rec[i][1]}</b></div></div></div>`).join('');
  if (!show) return `<section class="card"><div class="eyebrow">${esc(PG_SHOW)}</div><h2 class="h2">The pregame show</h2><p class="muted">${xCareer() ? 'The show is on before each of your games.' : 'The show is back when the season starts.'}</p><div class="x2hosts">${hosts}</div></section>`;
  const sc = pgScript(show); const first = PG_HOSTS.map(h => h.n.split(' ')[0]);
  const lines = sc.map((ln, i) => ln.who < 0 ? `<li class="x2seg" data-i="${i}"><b>${esc(ln.t)}</b></li>` : `<li class="x2ln ${ln.k}" data-i="${i}">${x2Av(PG_HOSTS[ln.who].n, ln.who, true)}<p><b>${esc(first[ln.who])}:</b> ${esc(ln.t.replace(/^[A-Z][a-z]+ [A-Z][a-z]+: /, ''))}</p></li>`).join('');
  const picks = show.games.map(g => `<tr><td>${esc(g.an)} at ${esc(g.hn)}${g.mine ? ' <span class="pill maize">Your game</span>' : ''}</td>${g.picks.map(p => `<td>${esc(p.side === 'h' ? g.hn : g.an)}${p.conf >= 3 ? ' 🔒' : ''}</td>`).join('')}<td class="num">${Math.round((g.ph >= 0.5 ? g.ph : 1 - g.ph) * 100)}% ${esc(g.ph >= 0.5 ? g.hn : g.an)}</td></tr>`).join('');
  const prev = Object.values(S.wk).filter(w => w.scored && w.wk !== show.wk).sort((a, b) => b.wk - a.wk)[0];
  const last = prev ? `<section class="card"><div class="eyebrow">Last week's picks</div><div class="tw"><table class="tbl"><thead><tr><th>Game</th>${first.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>${prev.games.filter(g => g.hw != null).map(g => `<tr><td>${esc(g.an)} at ${esc(g.hn)} <span class="small muted">· ${esc(g.hw ? g.hn : g.an)} won</span></td>${g.picks.map(p => `<td class="${(p.side === 'h') === g.hw ? 'res-w' : 'res-l'}">${(p.side === 'h') === g.hw ? '✓' : '✗'} ${esc(p.side === 'h' ? g.hn : g.an)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : '';
  return `<section class="card"><div class="head"><div><div class="eyebrow">${esc(PG_SHOW)} · ${esc(xCareer() ? cWeekLabel(show.wk) : isPro() ? nflWeekLabel(show.wk) : weekLabel(show.wk))}</div><h2 class="h2">This week's show</h2></div><p class="hint">Three hosts, the week's biggest games, an argument or two, and their picks. They keep score all season.</p></div>
    <div class="row gap"><button class="btn primary" data-act="x2show">Watch the show</button></div><ol class="x2show" id="x2show">${lines}</ol></section>
   <section class="card"><div class="eyebrow">The picks</div><div class="tw"><table class="tbl"><thead><tr><th>Game</th>${first.map(n => `<th>${esc(n)}</th>`).join('')}<th>Our numbers</th></tr></thead><tbody>${picks}</tbody></table></div><p class="hint">🔒 marks a host's most confident pick.</p></section>
   ${last}<section class="card"><div class="eyebrow">The hosts</div><div class="x2hosts">${hosts}</div></section>`;
}
let x2ShowT = 0;
function x2ShowPlay() {
  const ol = document.getElementById('x2show'); if (!ol) return; clearTimeout(x2ShowT); const items = [...ol.children]; items.forEach(li => li.classList.add('x2hide')); ol.classList.add('playing'); let i = 0;
  const step = () => { const li = items[i++]; if (!li || !li.isConnected) { ol.classList.remove('playing'); return; } li.classList.remove('x2hide'); li.classList.add('x2on'); setTimeout(() => li.classList.remove('x2on'), 900); if (i === 1) li.scrollIntoView({ block: 'nearest' }); x2ShowT = setTimeout(step, motionOn() ? (li.classList.contains('x2seg') ? 700 : 1500) : 60); };
  step();
}

/* ---------- 2. the front page ---------- */
function vX2Paper() {
  const F = fpStore(); const i = clamp(+((xCareer() ? cui.x2fp : ui.x2fp) || 0), 0, Math.max(0, F.list.length - 1)); const page = F.list[i];
  if (!page) return `<section class="card"><div class="eyebrow">Front page</div><h2 class="h2">${esc(fpPaper())}</h2><p class="muted">The first front page comes out after your first week of games.</p></section>`;
  const arch = F.list.map((p, j) => `<button class="btn sm${j === i ? ' primary' : ' ghost'}" data-act="x2fp" data-i="${j}">${esc(p.s + ' · ' + p.wl)}</button>`).join(' ');
  return `<article class="card x2paper" aria-label="Front page"><header class="x2mast"><div class="x2mtop"><span>${esc(page.wl)}</span><span>${page.s}</span><span>Final edition</span></div><div class="x2name">${esc(fpPaper())}</div></header>
    <h2 class="x2head">${esc(page.h)}</h2><p class="x2sub">${esc(page.sub)}</p>
    ${page.pog ? `<p class="x2pog"><b>Player of the game:</b> ${esc(page.pog.n)}, ${esc(page.pog.pos)}${page.pog.line ? ' · ' + esc(page.pog.line) : ''}</p>` : ''}
    ${page.st.length ? `<div class="x2cols">${page.st.map(s => `<section><h3>${esc(s.h)}</h3><p>${esc(s.t)}</p></section>`).join('')}</div>` : ''}${page.rec ? `<p class="x2foot">Record: ${esc(page.rec)}</p>` : ''}</article>
   <section class="card"><div class="eyebrow">Back issues</div><div class="row gap wrap">${arch}</div></section>`;
}

/* ---------- 6. advanced stats ---------- */
const AVS_COL = { td: 'var(--good)', fg: '#2f6fd6', punt: 'var(--dim)', to: 'var(--bad)', downs: 'var(--warn)' };
const AVS_OUT = { td: 'Touchdown', fg: 'Field goal', punt: 'Punt', to: 'Turnover', downs: 'Downs' };
function avsChart(g) {
  const A = avsGame(g); if (!A) return '<p class="muted">No drive data for this game.</p>'; const D = A.drives; const ab = [g.h, g.a].map(id => (id === ME ? myAb() : isFCS(id) ? 'FCS' : id)); const W = 1000, rowH = 17, top = 26, H = top + D.length * rowH + 10; const X = yl => 90 + yl * 8.8;
  let s = `<svg class="x2drive" viewBox="0 0 ${W} ${H}" role="img" aria-label="Drive chart: every drive, from where it started to where it ended"><rect x="${X(0)}" y="${top - 6}" width="${X(100) - X(0)}" height="${D.length * rowH + 6}" class="x2dfield"/>`;
  for (let y = 10; y < 100; y += 10) s += `<line x1="${X(y)}" x2="${X(y)}" y1="${top - 6}" y2="${top + D.length * rowH}" class="x2dline"/><text x="${X(y)}" y="${top - 10}" class="x2dlbl">${y <= 50 ? y : 100 - y}</text>`;
  D.forEach((d, i) => { const y = top + i * rowH; const f = v => (d[0] === 0 ? v : 100 - v); /* the home team drives left to right, the road team right to left */ const a = X(Math.min(f(d[2]), f(d[3]))), b = X(Math.max(f(d[2]), f(d[3]))); const fgOk = d[1] === 'fg' && d[6]; const col = d[1] === 'fg' && !fgOk ? 'var(--warn)' : AVS_COL[d[1]] || 'var(--dim)';
    s += `<text x="8" y="${y + 11}" class="x2dteam${[g.h, g.a][d[0]] === ME ? ' me' : ''}">${esc(String(ab[d[0]]).slice(0, 5))}</text><text x="60" y="${y + 11}" class="x2dlbl">${d[8] > 4 ? 'OT' : 'Q' + (d[8] || 1)}</text><rect x="${a.toFixed(1)}" y="${y + 2}" width="${Math.max(4, b - a).toFixed(1)}" height="${rowH - 5}" rx="3" fill="${col}"><title>${esc(ab[d[0]])}: ${esc(AVS_OUT[d[1]] || d[1])}${d[1] === 'fg' ? (fgOk ? ' (good)' : ' (missed)') : ''}, ${Math.max(0, d[3] - d[2])} yards</title></rect>`; });
  return s + '</svg><p class="small muted x2legend">' + Object.entries(AVS_OUT).map(([k, l]) => `<span><i style="background:${AVS_COL[k]}"></i>${l}</span>`).join('') + '<span><i style="background:var(--warn)"></i>Missed field goal</span></p>';
}
function vX2Adv() {
  const S = avsSeason(); const o = S.off, d = S.def; const ep = (a, n) => { const v = avsPer(a, n); return (v > 0 ? '+' : '') + v.toFixed(2); };
  const tile = (k, v, s) => `<div><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`;
  if (!o.n) return `<section class="card"><div class="eyebrow">Advanced stats</div><h2 class="h2">Every play, counted</h2><p class="muted">Play a game: success rate, points added per play and a drive chart for every game show up here. They count games played from this update on.</p></section>`;
  const rows = S.rows.slice().reverse().map(r => { const g = r.g; const opp = g.h === ME ? g.a : g.h; const us = g.h === ME ? g.hs : g.as, th = g.h === ME ? g.as : g.hs; return `<tr><td>${esc(isPro() ? nflWeekLabel(g.wk) : weekLabel(g.wk))}</td><td>${g.h === ME ? 'vs.' : 'at'} ${esc(teamName(opp))}</td><td class="${us > th ? 'res-w' : 'res-l'}">${us > th ? 'W' : 'L'} ${us}-${th}</td><td class="num">${avsRate(r.me.ok, r.me.n)}%</td><td class="num">${ep(r.me.epa, r.me.n)}</td><td class="num">${r.me.boom}</td><td class="num">${avsRate(r.op.ok, r.op.n)}%</td><td class="num">${ep(r.op.epa, r.op.n)}</td><td><button class="btn ghost sm" data-act="x2adv" data-id="${g.id}">Drive chart</button></td></tr>`; }).join('');
  const sel = ui.x2adv && S.rows.find(r => r.g.id === ui.x2adv) ? S.rows.find(r => r.g.id === ui.x2adv).g : S.rows[S.rows.length - 1].g;
  return `<section class="card"><div class="head"><div><div class="eyebrow">Advanced stats · ${state.season}</div><h2 class="h2">Your offense</h2></div><p class="hint">A play is a success when it gains 40% of the distance on first down, 60% on second and all of it on third or fourth. Points added: how much each play changed the expected points from the field position.</p></div>
    <div class="tiles">${tile('Success rate', avsRate(o.ok, o.n) + '%', o.n + ' plays')}${tile('Points added per play', ep(o.epa, o.n), 'run ' + ep(o.run.epa, o.run.n) + ' · pass ' + ep(o.pass.epa, o.pass.n))}${tile('Explosive plays', o.boom, 'runs of 12+, passes of 18+')}${tile('Points per drive', avsPer(o.pts, o.drives).toFixed(2), o.sc + ' scores on ' + o.drives + ' drives')}</div></section>
   <section class="card"><div class="eyebrow">Your defense</div><div class="tiles">${tile('Success rate allowed', avsRate(d.ok, d.n) + '%', d.n + ' plays')}${tile('Points added allowed', ep(d.epa, d.n), 'run ' + ep(d.run.epa, d.run.n) + ' · pass ' + ep(d.pass.epa, d.pass.n))}${tile('Explosive plays allowed', d.boom, '')}${tile('Points per drive allowed', avsPer(d.pts, d.drives).toFixed(2), d.drives + ' drives')}</div></section>
   <section class="card"><div class="eyebrow">Run and pass</div><div class="tw"><table class="tbl"><thead><tr><th></th><th class="num">Plays</th><th class="num">Success</th><th class="num">Points added per play</th></tr></thead><tbody>${[['Your runs', o.run], ['Your passes', o.pass], ['Runs against you', d.run], ['Passes against you', d.pass]].map(([l, x]) => `<tr><td>${l}</td><td class="num">${x.n}</td><td class="num">${avsRate(x.ok, x.n)}%</td><td class="num">${ep(x.epa, x.n)}</td></tr>`).join('')}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Game by game</div><div class="tw"><table class="tbl sortable" data-sk="x2adv"><thead><tr><th>Week</th><th>Opponent</th><th>Result</th><th class="num">Success</th><th class="num">Points/play</th><th class="num">Explosive</th><th class="num">Opp. success</th><th class="num">Opp. points/play</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Drive chart</div><h2 class="h3">${esc(isPro() ? nflWeekLabel(sel.wk) : weekLabel(sel.wk))}: ${esc(teamName(sel.a))} at ${esc(teamName(sel.h))}</h2>${avsChart(sel)}</section>`;
}
// the box score gets its own advanced section
{ const _bx = boxScore; boxScore = function (g) { const html = _bx(g); const A = g && g.box && g.box.dr ? avsGame(g) : null; if (!A) return html; const ab = [g.h, g.a].map(id => (id === ME ? myAb() : isFCS(id) ? 'FCS' : id)); const ep = S => { const v = avsPer(S.epa, S.n); return (v > 0 ? '+' : '') + v.toFixed(2); };
  return html + `<section class="card mt"><div class="eyebrow">Advanced</div><div class="tw"><table class="tbl"><thead><tr><th></th><th class="num">Plays</th><th class="num">Success</th><th class="num">Points added per play</th><th class="num">Explosive</th><th class="num">Points per drive</th></tr></thead><tbody>${[1, 0].map(s => `<tr><td><b>${esc(ab[s])}</b></td><td class="num">${A.side[s].n}</td><td class="num">${avsRate(A.side[s].ok, A.side[s].n)}%</td><td class="num">${ep(A.side[s])}</td><td class="num">${A.side[s].boom}</td><td class="num">${avsPer(A.side[s].pts, A.side[s].drives).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>${avsChart(g)}</section>`; }; }
Object.assign(actions, {
  x2show() { x2ShowPlay(); },
  x2fp(d) { if (xCareer()) cui.x2fp = +d.i; else ui.x2fp = +d.i; render(); },
  x2adv(d) { ui.x2adv = d.id; render(); const el = document.querySelector('.x2drive'); if (el) el.scrollIntoView({ block: 'center' }); },
});

/* ---------- 3. the season in 60 seconds ---------- */
// one play a score, squeezed so the whole reel runs about a minute
function x2S60Fit() { const tot = pf.q.reduce((s, it) => s + (it.total || 0), 0); const k = tot > 60000 ? 60000 / tot : 1; if (k < 1) pf.q.forEach(it => { it.d = it.d.map(v => v * k); it.total *= k; }); }
function pfS60AD(L) {
  if (!L.length) return false; const g0 = L[0].g; pfReset({ ids: [g0.h, g0.a], first: 0, ckKey: 's60', log: [], box: g0.box, mSide: [g0.h, g0.a].indexOf(ME) }); pf.replay = true; pf.spdF = () => 1;
  L.forEach((e, i) => { const ids = [e.g.h, e.g.a]; const ctx = pfCtxFor(ids); Object.assign(pf, ctx); const n0 = pf.q.length; pfDrive({ ids, ckKey: e.g.hl.k, log: e.g.hl.d, box: e.g.box }, Object.assign({}, e.x, { man: false })); pf.q.slice(n0).forEach(it => { it.ctx = ctx; }); const it = pf.q[pf.q.length - 1]; if (it && pf.q.length > n0) it.cap = `${i + 1} of ${L.length} · ${isPro() ? nflWeekLabel(e.g.wk) : weekLabel(e.g.wk)} · ${it.cap}`; });
  x2S60Fit(); return pf.q.length > 0;
}
function pfS60Career(L) {
  if (!L.length) return false; const g0 = L[0].g; const num0 = cs.p.num; cs.p.num = g0.num != null ? g0.num : num0; pfResetCareer(Object.assign({ log: [], snaps: [] }, g0)); cs.p.num = num0; pf.replay = true; pf.spdF = () => 1;
  L.forEach((e, i) => { const ctx = pfCtxFor(null, e.g); Object.assign(pf, ctx); const P = pfSnapPlay(e.g, e.x); pfQueue(P, `${i + 1} of ${L.length}${P.td ? ' · Touchdown' : ' · Field goal'}`); const it = pf.q[pf.q.length - 1]; if (it) it.ctx = ctx; });
  x2S60Fit(); return pf.q.length > 0;
}
const x2S60Card = (n, yr) => `<section class="card"><div class="eyebrow">Season in 60 seconds</div><h2 class="h2">Every score of ${yr}</h2><p>${n ? `${xCareer() ? 'Every score you were part of' : 'Every touchdown you scored, and every pick six'} this season: ${n} in all, back to back on the field in about a minute.` : 'Your scores show up here once you have played some games.'}</p>${n ? '<button class="btn primary" data-act="x2s60">Watch the season</button>' : ''}</section>`;
{ const _r = vXReels; vXReels = function () { return _r() + (isComm() ? '' : x2S60Card(s60Items().length, state.season)); }; }
{ const _l = vXLife; vXLife = function () { return x2S60Card(s60Items().length, cs.year) + _l(); }; }

/* ---------- 4. scenario challenges ---------- */
const SCN_MODE = { ad: 'Athletic Director', coach: 'Coach', gm: 'NFL general manager', comm: 'Commissioner', career: 'Player Career' };
function x2ScnHomeHTML() {
  const by = {}; Object.entries(SCENS).forEach(([k, s]) => { (by[s.mode] = by[s.mode] || []).push([k, s]); });
  return `<section class="card" id="x2scn"><div class="head"><div><div class="eyebrow">Scenario challenges</div><h2 class="h2">Start in a mess</h2></div><p class="hint">A new career that starts in trouble, with goals to hit by a deadline. Each one uses a free save slot; your other careers aren't touched.</p></div>
   <label class="fld inl"><span>Your name (Coach scenarios)</span><input id="x2scnname" maxlength="28" value="${esc(ui.x2scnName || 'Alex Morgan')}"></label>
   <div class="x2scns">${Object.entries(by).map(([m, L]) => `<div><div class="lbl">${esc(SCN_MODE[m])}</div>${L.map(([k, s]) => `<div class="x2scn"><b>${esc(s.l)}</b><p class="small">${esc(s.d)}</p><ul class="small plainlist">${s.goals.map(g => `<li>· ${esc(g[1])}${g[2] ? ` <span class="muted">(${g[2] === 1 ? 'first season' : 'within ' + g[2] + ' seasons'})</span>` : ''}</li>`).join('')}</ul><button class="btn sm" data-act="x2scn" data-k="${k}">Start this scenario</button></div>`).join('')}</div>`).join('')}</div>${x2BuildHTML()}</section>`;
}
{ const _ph = patchHomeHTML; patchHomeHTML = function () { return x2ScnHomeHTML() + _ph(); }; }
// IDEA-06: the challenge builder (AD and NFL GM). Nothing starts until the setup passes its checks.
function x2BuildHTML() {
  const f = ui.x2c || (ui.x2c = { mode: 'ad', l: '', tid: '', yrs: 3, goals: {}, start: {}, seed: '' }); const m = f.mode === 'gm' ? 'gm' : 'ad';
  const teams = m === 'gm' ? NFL.map(t => [t.id, NFL_BY[t.id].name]).sort((a, b) => a[1].localeCompare(b[1])) : Object.entries(CTEAMS0_AD).map(([id, t]) => [id, t.name]).sort((a, b) => a[1].localeCompare(b[1]));
  const v = validateNow(); function validateNow() { try { return scnValidate(f); } catch (e) { return { errs: [e.message] }; } }
  return `<details class="mt" ${f.open ? 'open' : ''} data-x2copen><summary><b>Build your own challenge</b> <span class="small muted">AD or NFL GM</span></summary>
   <div class="row gap wrap mt"><div class="seg" role="group" aria-label="Mode"><button class="${m === 'ad' ? 'on' : ''}" data-act="x2cmode" data-v="ad">Athletic Director</button><button class="${m === 'gm' ? 'on' : ''}" data-act="x2cmode" data-v="gm">NFL GM</button></div></div>
   <div class="grid2 mt"><label class="fld"><span>Name</span><input data-x2c="l" maxlength="40" value="${esc(f.l)}" placeholder="My challenge"></label>
   <label class="fld"><span>${m === 'gm' ? 'Club' : 'School'}</span><select data-x2c="tid"><option value="">Pick one…</option>${teams.map(([id, n]) => `<option value="${esc(id)}" ${f.tid === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
   <label class="fld"><span>Deadline (seasons)</span><select data-x2c="yrs">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${+f.yrs === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
   <label class="fld"><span>Seed (optional)</span><input data-x2c="seed" inputmode="numeric" maxlength="9" value="${esc(f.seed)}" placeholder="Random"></label></div>
   <div class="lbl mt">Goals</div><div class="x2cg">${Object.entries(SCN_GOALS[m]).map(([k, G]) => { const on = f.goals[k] != null; const fixed = G[1] === G[2]; return `<label class="chk"><input type="checkbox" data-x2cg="${k}" ${on ? 'checked' : ''}> ${esc(G[0].replace('{n}', fixed ? String(G[1]) : '…'))}</label>${on && !fixed ? `<input class="x2cn" data-x2cn="${k}" type="number" min="${G[1]}" max="${G[2]}" value="${esc(f.goals[k])}" aria-label="${esc(G[0].replace('{n}', 'target'))}">` : ''}`; }).join('')}</div>
   <div class="lbl mt">Starting conditions <span class="small muted">(leave blank to start as normal)</span></div><div class="grid2">${Object.entries(SCN_START[m]).map(([k, [l, lo, hi]]) => `<label class="fld"><span>${esc(l)} · ${lo} to ${hi}</span><input type="number" data-x2cs="${k}" min="${lo}" max="${hi}" value="${f.start[k] != null ? esc(f.start[k]) : ''}"></label>`).join('')}</div>
   ${v.errs && v.errs.length ? `<ul class="small plainlist bad mt">${v.errs.map(e => `<li>· ${esc(e)}</li>`).join('')}</ul>` : v.def ? `<div class="mt"><div class="lbl">The rules</div><ul class="small plainlist">${scnRulesTxt(v.def).concat(v.def.goals.map(g => `Goal: ${g[1]}${g[2] && g[0] !== 'capOk' ? ` (within ${g[2]} season${g[2] === 1 ? '' : 's'})` : ''}.`)).map(t => `<li>· ${esc(t)}</li>`).join('')}</ul></div>` : ''}
   <div class="row gap mt"><button class="btn primary sm" data-act="x2cstart" ${v.def ? '' : 'disabled'}>Start this challenge</button></div></details>`;
}
async function x2CustomStart() {
  const v = scnValidate(ui.x2c || {}); if (!v.def) return; const def = v.def;
  if (appMode === 'career' && !(await leaveMode())) return;
  if (appMode === 'ad' && state && !saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL);
  switchNS('ad'); const free = firstFreeSlot();
  if (!free) { appMode = 'home'; rngOwner = null; cui.flash = 'All five AD save slots are in use. Delete one on the Save file tab, then start the challenge.'; render(); window.scrollTo(0, 0); return; }
  if (def.mode === 'gm') { newGame('normal', null, def.seed, 'MICH'); goPro(def.tid, { role: 'gm' }); state.tline = []; } else newGame('normal', null, def.seed, def.tid);
  setActiveSlot(free); scnApplyCustom(def); appMode = 'ad'; rngOwner = 'ad'; cui.adPick = false; cui.coSetup = false; resetUi(); ui.tab = isPro() ? 'off' : 'office'; hideModal(); applyTheme(); save(); await flushSave();
  ui.flash = `Challenge: ${def.l} (slot ${free}). Your goals are on the office page.`; render(); window.scrollTo(0, 0);
}
document.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset || appMode !== 'home') return; const f = ui.x2c; if (!f) return; let hit = true;
  if (t.dataset.x2c) f[t.dataset.x2c] = t.value; else if (t.dataset.x2cg) { const G = SCN_GOALS[f.mode][t.dataset.x2cg]; if (t.checked) f.goals[t.dataset.x2cg] = G ? G[3] : 1; else delete f.goals[t.dataset.x2cg]; } else if (t.dataset.x2cn) f.goals[t.dataset.x2cn] = t.value; else if (t.dataset.x2cs) { if (t.value === '') delete f.start[t.dataset.x2cs]; else f.start[t.dataset.x2cs] = t.value; } else hit = false;
  if (hit) { f.open = true; const sel = t.dataset.x2c ? `[data-x2c="${t.dataset.x2c}"]` : t.dataset.x2cg ? `[data-x2cg="${t.dataset.x2cg}"]` : t.dataset.x2cn ? `[data-x2cn="${t.dataset.x2cn}"]` : `[data-x2cs="${t.dataset.x2cs}"]`; render(); const el = document.querySelector(sel); if (el) el.focus({ preventScroll: true }); } });
document.addEventListener('toggle', e => { const t = e.target; if (t && t.matches && t.matches('[data-x2copen]') && ui.x2c) ui.x2c.open = t.open; }, true);
Object.assign(actions, {
  x2cmode(d) { const f = ui.x2c || (ui.x2c = {}); if (d.v !== 'ad' && d.v !== 'gm') return; if (f.mode !== d.v) Object.assign(f, { mode: d.v, tid: '', goals: {}, start: {} }); f.open = true; render(); },
  x2cstart() { x2CustomStart(); },
});
// saves changed with the admin tools are marked as edited (scenario results and scores stay honest)
{ Object.keys(actions).filter(k => /^adm/.test(k) && !/^adm(tab|pos)$/.test(k)).forEach(k => { const f = actions[k]; actions[k] = function () { try { if (state) X().edited = state.season || 1; } catch (e) { } return f.apply(this, arguments); }; });
  if (typeof admSet === 'function') { const _as = admSet; admSet = function () { try { if (state) X().edited = state.season || 1; } catch (e) { } return _as.apply(this, arguments); }; } }
// the progress card on the office (or the career Home page)
function x2ScnCard() {
  const sc = scnOf(); if (!sc) return ''; const S = scnDef(sc); if (!S) return '';
  const rows = S.goals.map((g, i) => { const st = sc.goals[i].st; const now = scnGoalNow(sc, i); const by = g[2] ? `by ${sc.s0 + g[2] - 1}` : 'during your career';
    return `<li class="x2goal ${st}"><span class="x2gs" aria-hidden="true">${st === 'done' ? '✓' : st === 'failed' ? '✗' : '○'}</span><span><b>${esc(g[1])}</b> <span class="small muted">${by}</span><br><span class="small">${st === 'done' ? 'Done' : st === 'failed' ? 'Missed' : 'Now: ' + esc(String(now.v))}</span></span></li>`; }).join('');
  return `<section class="card${sc.res ? '' : ' next'}"><div class="eyebrow">${sc.k === 'custom' ? 'Challenge' : 'Scenario'} · ${esc(S.l)}</div>${sc.k === 'custom' ? `<details class="small"><summary>The rules</summary><ul class="plainlist">${scnRulesTxt(S).map(t => `<li>· ${esc(t)}</li>`).join('')}</ul></details>` : ''}<h2 class="h3">${sc.res === 'won' ? 'Scenario complete' : sc.res === 'lost' ? 'Scenario over' : 'Your goals'}</h2>${sc.res ? `<p>${sc.res === 'won' ? 'Every goal hit. You can keep playing this career as long as you like.' : 'A goal slipped away. The career goes on; the scenario is over.'}</p>` : `<p class="small muted">${esc(S.d)}</p>`}<ul class="plainlist x2goals">${rows}</ul></section>`;
}
{ const w = f => function () { return x2ScnCard() + f.apply(this, arguments); }; vOffice = w(vOffice); vCoachOffice = w(vCoachOffice); vProOffice = w(vProOffice); vCmOffice = w(vCmOffice); }
async function x2ScnStart(k) {
  const S = SCENS[k]; if (!S) return; const nmEl = document.getElementById('x2scnname'); const name = String(nmEl ? nmEl.value : '').replace(/[<>]/g, '').trim().slice(0, 28) || 'Alex Morgan'; ui.x2scnName = name;
  if (S.mode === 'career') {
    await enterCareer('new'); if (!cui.form) return; Object.assign(cui.form, { stars: 2, path: k === 'smallschool' ? 'college' : 'hs', scn: k }); cui.flash = `Scenario: ${S.l}. Create your player to begin.`; render(); return;
  }
  if (appMode === 'career' && !(await leaveMode())) return;
  if (appMode === 'ad' && state && !saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL);
  const ns = S.mode === 'coach' ? 'coach' : 'ad'; switchNS(ns); const free = firstFreeSlot();
  if (!free) { appMode = 'home'; rngOwner = null; cui.flash = `All five ${ns === 'coach' ? 'Coach mode' : 'AD'} save slots are in use. Delete one on the Save file tab, then start the scenario.`; render(); window.scrollTo(0, 0); return; }
  if (S.mode === 'coach') { const f = coForm(); newCoachCareer({ name, start: 'any', tid: scnTeam(k), role: 'HC', diff: f.diff || 'normal', gameDay: f.gameDay, lvl: 'col', nfl: f.nfl, repBonus: 0 }); ui.coForm = null; }
  else if (S.mode === 'comm') newComm2({ lvl: S.lvl });
  else if (S.mode === 'gm') { newGame('normal', null, null, 'MICH'); goPro(scnTeam(k), { role: 'gm' }); state.tline = []; }
  else newGame('normal', null, null, scnTeam(k));
  setActiveSlot(free); scnApply(k); appMode = 'ad'; rngOwner = 'ad'; cui.adPick = false; cui.coSetup = false; resetUi(); ui.tab = isPro() ? 'off' : 'office'; hideModal(); applyTheme(); save(); await flushSave();
  ui.flash = `Scenario: ${S.l} (slot ${free}). Your goals are on the ${isComm() ? 'office' : 'office'} page.`; render(); window.scrollTo(0, 0);
}
{ const _cst = actions.cstart; actions.cstart = async function (d) { const k = cui.form && cui.form.scn; const was = cs; await _cst.call(this, d); if (k && cs && cs !== was && !cui.form) { scnApply(k); cSave(); render(); } }; }
{ const _ch = vCHome; vCHome = function () { const over = cs && (cs.phase === 'retired' || cs.phase === 'done'); /* a finished career has no new coach to meet */ return x2ScnCard() + (over ? '' : x2NcsCard() + x2TrnCard()) + _ch(); }; }

/* ---------- 5. rivalry trophies ---------- */
function vX2Trophy() {
  const L = troList();
  if (!L.length) return `<section class="card"><div class="eyebrow">Rivalry trophies</div><h2 class="h2">No rivals yet</h2><p class="muted">${isPro() ? 'Your division rivals show up here.' : 'Your rivalries show up here.'}</p></section>`;
  return L.map(R => { const st = troStats(R); const tie = R.t ? '-' + R.t : ''; const holder = st.holder ? (st.holder === ME ? myName() : teamName(R.id)) : null;
    const res = R.log.slice().reverse().slice(0, 30).map(x => `<tr><td>${x.s}${x.po ? ' <span class="pill">Playoffs</span>' : ''}</td><td class="${x.win ? 'res-w' : 'res-l'}">${x.win ? 'W' : 'L'} ${x.ms}-${x.os}</td><td>${x.win ? esc(myName()) : esc(teamName(R.id))}</td></tr>`).join('');
    return `<section class="card x2tro"><div class="head"><div><div class="eyebrow">${esc(R.name)}</div><h2 class="h2">🏆 ${esc(R.trophy)}</h2></div><p class="hint">vs. ${esc(teamName(R.id))}${R.arch ? ' · your archrival' : ''}</p></div>
      <div class="tiles"><div><span class="k">Holder</span><span class="v">${holder ? esc(holder) : '—'}</span><span class="s">${st.holder ? (st.holder === ME ? 'In your trophy case' : 'Go get it back') : 'Not played yet'}</span></div><div><span class="k">Series${R.base ? ' (all-time)' : ''}</span><span class="v">${R.w}-${R.l}${tie}</span><span class="s">${R.note ? esc(R.note) : 'Your games: ' + R.log.filter(x => x.win).length + '-' + R.log.filter(x => !x.win).length}</span></div><div><span class="k">Streak</span><span class="v">${st.cur ? (st.curW ? 'W' : 'L') + st.cur : '—'}</span><span class="s">${st.cur ? (st.curW ? 'You have won ' : 'They have won ') + st.cur + ' straight' : ''}</span></div><div><span class="k">Longest streaks</span><span class="v">W${st.bestW} · L${st.bestL}</span><span class="s">In your games</span></div></div>
      ${st.big || st.bad ? `<p class="small">${st.big ? `Biggest win: <b>${st.big.ms}-${st.big.os}</b> in ${st.big.s}. ` : ''}${st.bad ? `Worst loss: <b>${st.bad.ms}-${st.bad.os}</b> in ${st.bad.s}.` : ''}</p>` : ''}
      ${res ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Result</th><th>Trophy went to</th></tr></thead><tbody>${res}</tbody></table></div>` : '<p class="muted small">You haven\'t played for it yet.</p>'}</section>`; }).join('');
}

/* ---------- 7. team packs (the Save file page) ---------- */
{ const _f = vFile; vFile = function () { const html = _f(); if (xCareer() || !state) return html; const K = state.x && state.x.pack; const n = K ? Object.keys(K.t).length : 0;
  return html + `<section class="card" id="x2tpk"><div class="head"><div><div class="eyebrow">Team pack</div><h2 class="h2">Your own names, colors${isPro() ? '' : ' and conferences'}</h2></div><p class="hint">One line per team: <code>team, name, color1, color2${isPro() ? '' : ', conference'}</code>. Team is the current name or abbreviation; colors look like #1a2b3c; leave a field blank to keep it.${isPro() ? '' : ' Conference moves happen in the offseason.'}</p></div>
   <textarea id="x2tpktxt" rows="5" class="code" placeholder="${isPro() ? 'DET,Motor City Lions,#0076b6,#b0b7bc' : 'MICH,Michigan Wolverines,#00274c,#ffcb05,Big Ten'}">${esc(ui.x2tpk || '')}</textarea>
   <div class="row gap wrap mt"><label class="btn ghost sm"><input type="file" id="x2tpkf" accept=".csv,.txt,text/csv,text/plain" class="sr-only">Open a file</label><button class="btn primary sm" data-act="x2tpkprev">Check the pack</button><button class="btn ghost sm" data-act="x2tpkdl">Download a template</button></div>
   ${ui.x2tpkPrev ? x2tpkPrevHTML(ui.x2tpkPrev) : ''}${ui.x2tpkMsg ? `<div class="small mt">${ui.x2tpkMsg}</div>` : ''}<p class="hint">${n ? `${n} team${n === 1 ? '' : 's'} changed by a pack in this save.` : 'No pack in this save yet.'} Packs are saved with this career only.</p></section>`; }; }
// every line of a pack, read back as it will be applied, before anything changes (QOL-06)
function x2tpkPrevHTML(P_) {
  const rows = P_.rows.map(r => `<tr><td>${esc(teamName(r.id))}</td><td>${r.name ? esc(r.name) : '<span class="muted">unchanged</span>'}</td><td>${[r.c1, r.c2].map(c => c ? `<span class="swatch" style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${c};vertical-align:middle"></span> ${esc(c)}` : '<span class="muted">unchanged</span>').join(' ')}</td>${isPro() ? '' : `<td>${r.conf ? esc(CONFS[r.conf] ? CONFS[r.conf].name : r.conf) : '<span class="muted">unchanged</span>'}</td>`}</tr>`).join('');
  return `<div class="decision mt"><b>${P_.rows.length} team${P_.rows.length === 1 ? '' : 's'} will change</b>${rows ? `<div class="tw"><table class="mini wide"><thead><tr><th>Team</th><th>Name</th><th>Colors</th>${isPro() ? '' : '<th>Conference</th>'}</tr></thead><tbody>${rows}</tbody></table></div>` : ''}${P_.errs.length ? `<ul class="plainlist small">${P_.errs.slice(0, 10).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
   <div class="row gap mt">${P_.rows.length ? '<button class="btn primary sm" data-act="x2tpk">Apply these changes</button>' : ''}<button class="btn ghost sm" data-act="x2tpkno">Back</button></div></div>`;
}
async function x2Download(name, data, type, btn) {
  const say = t => { if (btn) { const o = btn.textContent; btn.textContent = t; setTimeout(() => { if (btn.isConnected) btn.textContent = o; }, 2500); } };
  const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) { try { await dl.save({ filename: name, data }); say('Saved'); } catch (e) { say(e && e.code === 'declined' ? 'Not saved' : 'Saving is not available here'); } return; }
  try { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); say('Downloading'); } catch (e) { say('Downloads are blocked here'); }
}
document.addEventListener('change', e => { const t = e.target; if (!t || t.id !== 'x2tpkf' || !t.files || !t.files[0]) return; const f = t.files[0]; if (f.size > 200000) { ui.x2tpkMsg = 'That file is too big for a team pack.'; render(); return; } f.text().then(txt => { ui.x2tpk = txt; ui.x2tpkMsg = `Opened ${esc(f.name)}. Check it, then import.`; render(); }).catch(() => { ui.x2tpkMsg = 'That file could not be read.'; render(); }); });

/* ---------- 8-11. the athletic department (AD) ---------- */
const TVN_MSG = { ok: 'The conference voted yes. The network launches next season.', have: 'You already have a network.', wait: 'The conference already voted this season. Try again next season.', money: 'You need the launch money in the bank first.', ind: 'Independents don\'t have a conference to build a network with.', 'no-vote': 'The conference voted it down. Try again next season.', no: 'Not available.' };
function vX2Dept() {
  const O = ospStore(); const last = O.hist[0]; const N = tvnStore(); const D = dstStore();
  const osp = Object.entries(OSP).map(([k, [l, w]]) => `<tr><td><b>${esc(l)}</b><div class="small muted">${Math.round(w * 100)}% of the other-sports budget</div></td><td>${seg('x2osp', String(O.lv[k]), OSP_LV.map((x, i) => [String(i), x[1]]), `data-k="${k}"`)}</td><td class="small">${last ? (k === 'oly' ? `${last.oly.titles ? last.oly.titles + ' national title' + (last.oly.titles > 1 ? 's' : '') + ', ' : ''}${x2ord(last.oly.cup)} in the all-sports cup` : `${last[k].w}-${last[k].l}${last[k].run ? ' · ' + esc(last[k].run) : ''}`) : '<span class="muted">First results after the season</span>'}</td></tr>`).join('');
  const hist = O.hist.slice(0, 6).map(r => `<tr><td>${r.s}</td><td>${r.mbb.w}-${r.mbb.l}${r.mbb.run ? ' · ' + esc(r.mbb.run) : ''}</td><td>${r.wbb.w}-${r.wbb.l}${r.wbb.run ? ' · ' + esc(r.wbb.run) : ''}</td><td>${r.oly.titles} · ${x2ord(r.oly.cup)}</td></tr>`).join('');
  const tvn = !N || N.sold ? `<p>${N && N.sold ? `You sold your stake in the ${esc(N.name)} in ${N.sold.s} for ${fmM(N.sold.price)}.` : `Start the ${esc(tvnName())}: you pay to launch it and hold a founding stake, plus an equal share of the rest. It grows with your conference and your success.`}</p>${T(ME).conf === 'IND' ? '<p class="muted small">Independents can\'t start one.</p>' : `<button class="btn primary" data-act="x2tvn">Pitch it to the conference (${fmM(tvnCost())})</button>`}${X().tvnNo === state.season ? '<p class="small muted">The conference said no this season.</p>' : ''}`
    : `<div class="tiles"><div><span class="k">Network</span><span class="v">${esc(N.name)}</span><span class="s">${state.season >= N.s0 ? 'On the air since ' + N.s0 : 'Launches in ' + N.s0}</span></div><div><span class="k">Carriage fees</span><span class="v">${fmM(tvnTotal())}</span><span class="s">a year, for the whole conference</span></div><div><span class="k">Your share</span><span class="v">${fmM(tvnYear())}</span><span class="s">a year · ${Math.round(N.stake * 100)}% founding stake</span></div><div><span class="k">Paid so far</span><span class="v">${fmM(N.paid || 0)}</span><span class="s">Launch cost ${fmM(N.cost)}</span></div></div>
      <div class="row gap mt">${ui.x2tvsell ? `<button class="btn danger sm" data-act="x2tvsell" data-v="yes">Sell for ${fmM(tvnSellPrice())}</button><button class="btn ghost sm" data-act="x2tvsell" data-v="no">Keep it</button>` : `<button class="btn ghost sm" data-act="x2tvsell">Sell your stake (${fmM(tvnSellPrice())})</button>`}</div>`;
  const staff = Object.entries(DST).map(([k, [l, d]]) => { const c = D.cur[k];
    return `<div class="x2dst"><div class="lbl">${esc(l)}</div><p class="small muted">${esc(d)}</p>${c ? `<p><b>${esc(c.n)}</b> · rating ${c.r} · ${fmM(c.sal)} a year · since ${c.since}</p><button class="btn ghost sm" data-act="x2dfire" data-k="${k}">Let go</button>` : `<ul class="plainlist">${dstCands(k).map((x, i) => `<li class="row between gap"><span><b>${esc(x.n)}</b> · rating ${x.r} · ${fmM(x.sal)} a year</span><button class="btn sm" data-act="x2dhire" data-k="${k}" data-i="${i}">Hire</button></li>`).join('') || '<li class="muted small">No candidates left this year.</li>'}</ul>`}</div>`; }).join('');
  const homes = state.games.filter(g => g.h === ME && !g.neutral && T(g.a)).sort((a, b) => a.wk - b.wk);
  const prices = homes.map(g => { const r = g.done ? null : gprResale(g); const tier = gprTier(g.id);
    return `<tr><td>${esc(weekLabel(g.wk))}</td><td>vs. ${esc(teamName(g.a))}${rivalOf(g.a) ? ' <span class="pill">Rival</span>' : ''}${rankOf(g.a) ? ` <span class="small muted">No. ${rankOf(g.a)}</span>` : ''}</td><td>${g.done ? `<span class="muted">${esc(GPR[tier][0])}</span>` : `<select data-x2ch="gpr" data-id="${g.id}" aria-label="Price tier for ${esc(teamName(g.a))}">${Object.entries(GPR).map(([k, v]) => `<option value="${k}"${k === tier ? ' selected' : ''}>${esc(v[0])} (${Math.round(v[1] * 100)}%)</option>`).join('')}</select>`}</td><td class="num">${g.done ? (g.att ? Math.round(g.att).toLocaleString() : '—') : '$' + r.face}</td><td class="num">${g.done ? '' : '$' + r.resale}</td><td>${g.done ? (g.hs > g.as ? 'W' : 'L') + ' ' + g.hs + '-' + g.as : r.sell ? '<span class="pill good">Sellout</span>' : '<span class="small muted">Seats left</span>'}</td></tr>`; }).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Athletic department · ${state.season}</div><h2 class="h2">Other sports</h2></div><p class="hint">Basketball and the Olympic sports share the other-sports line of the budget. Investing costs more and wins more; cutting saves money but the boosters and the board notice${' '}(and cutting women's basketball draws a Title IX complaint).</p></div>
    <div class="tw"><table class="tbl"><thead><tr><th>Program</th><th>Budget</th><th>Last season</th></tr></thead><tbody>${osp}</tbody></table></div>${hist ? `<details class="mt"><summary>Past seasons</summary><div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Men's basketball</th><th>Women's basketball</th><th>Olympic titles · cup</th></tr></thead><tbody>${hist}</tbody></table></div></details>` : ''}<p class="hint">This year's other-sports spending: ${fmM(annualBudget().other || 0)}.</p></section>
   <section class="card"><div class="eyebrow">Conference TV network</div><h2 class="h2">${N && !N.sold ? esc(N.name) : 'Start a network'}</h2>${tvn}</section>
   <section class="card"><div class="head"><div><div class="eyebrow">Department staff</div><h2 class="h2">Your front office</h2></div><p class="hint">Salaries come out of the budget: ${fmM(dstPay())} a year now.</p></div><div class="x2dsts">${staff}</div></section>
   <section class="card"><div class="head"><div><div class="eyebrow">Home games</div><h2 class="h2">Price each game</h2></div><p class="hint">The base price is $${state.fin.ticket} (set it on the Money tab). Big games can cost more and still sell out; a value price fills seats and the fans love it. Resale is what the seats go for on the secondary market.</p></div>
    ${prices ? `<div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Opponent</th><th>Price</th><th class="num">Face value</th><th class="num">Resale</th><th></th></tr></thead><tbody>${prices}</tbody></table></div>` : '<p class="muted">No home games on the schedule.</p>'}</section>`;
}
document.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset || t.dataset.x2ch !== 'gpr' || appMode !== 'ad') return; if (gprSet(t.dataset.id, t.value)) { save(); render(); const el = document.querySelector(`[data-x2ch="gpr"][data-id="${t.dataset.id}"]`); if (el) el.focus(); } });

/* ---------- 15. your assistants (Coach, the Staff page) ---------- */
{ const _s = vStaff; vStaff = function () { const html = _s(); if (!isCoach() || isPro()) return html; const x = X(); const up = x.astUp || []; const pr = (x.promo || []).filter(o => o.s === state.season);
  if (!up.length && !pr.length) return html + `<section class="card"><div class="eyebrow">Your assistants</div><p class="small muted">Every offseason your assistants grow, more under a head coach who develops coaches. The good ones get offers to move up.</p></section>`;
  const hc = state.co.role === 'HC'; const roleL = u => (u === 'HC' ? 'head coach' : u === 'OC' ? 'offensive coordinator' : 'defensive coordinator');
  return html + `<section class="card"><div class="eyebrow">Your assistants · ${state.season} offseason</div><h2 class="h3">Growth and promotions</h2>${up.length ? `<p class="small">Got better: ${up.map(u => `<b>${esc(u.n)}</b> (${esc(u.r)}, +${u.g})`).join(', ')}.</p>` : ''}
   ${pr.length ? `<ul class="plainlist">${pr.map(o => `<li class="x2promo"><b>${esc(o.n)}</b> (${esc(o.r)}) has an offer to be the ${roleL(o.up)}${o.to ? ' at ' + esc(teamName(o.to)) : ''}. ${o.done ? `<span class="pill ${o.res === 'stayed' ? 'good' : ''}">${o.res === 'stayed' ? 'He stayed' : 'He left'}</span>` : hc ? `<span class="row gap"><button class="btn sm" data-act="x2astgo" data-r="${o.r}">Let him go</button><button class="btn ghost sm" data-act="x2astkeep" data-r="${o.r}">Try to keep him</button></span>` : ''}</li>`).join('')}</ul><p class="hint">${hc ? 'Letting him go with your blessing grows your coaching tree and your reputation. Keeping him costs a raise, and he may go anyway.' : 'Only the head coach can try to keep an assistant.'}</p>` : ''}</section>`; }; }

/* ---------- 12-13. the playbook (Coach) ---------- */
const PB_B = { inside: 'Inside runs', outside: 'Outside runs', short: 'Short passes', deep: 'Deep shots', screen: 'Screens' };
const PB_OL = [-4.4, -2.2, 0, 2.2, 4.4];
function pbSvg(d, o) {
  o = o || {}; const Y = dn => (32 - dn).toFixed(1); const r = d.r || {}; const run = pbkRun(d); let s = `<svg class="x2pb${o.ed ? ' ed' : ''}" ${o.ed ? 'id="x2pbed" ' : ''}viewBox="-26 0 52 40" role="img" aria-label="${esc(d.n)}: play diagram"><rect x="-26" y="0" width="52" height="40" class="x2pbf"/>`;
  for (let dn = 5; dn <= 30; dn += 5) s += `<line x1="-26" x2="26" y1="${Y(dn)}" y2="${Y(dn)}" class="x2pbyl"/>`;
  s += `<line x1="-26" x2="26" y1="32" y2="32" class="x2pblos"/>`; PB_OL.forEach(x => { s += `<rect x="${x - 0.8}" y="31.6" width="1.6" height="1.6" class="x2pbol"/>`; });
  [[-3, 1.5], [-1, -1.8], [1, 1.8], [3, -1.2], [-5, 7], [5, -7], [-12, 11], [12, 11], [-19, 9], [19, 9], [0, 14]].forEach(([x, dn]) => { s += `<text x="${x}" y="${Y(dn + 1.6)}" class="x2pbd">×</text>`; });
  Object.entries(PB_FORM).forEach(([k, [dn, lat]]) => { const pts = r[k]; if (pts && pts.length) { const P_ = [[lat, dn]].concat(pts.map(p => [p[1], p[0]])); const tg = d.tg === k || (run && k === Object.keys(r)[0]); const path = P_.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + Y(p[1])).join(' ');
      const a = P_[P_.length - 2], b = P_[P_.length - 1]; const ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]); const ax = b[0], ay = +Y(b[1]); const hd = (t, l) => `${(ax - Math.cos(ang + t) * l).toFixed(2)} ${(ay - Math.sin(ang + t) * l).toFixed(2)}`;
      s += `<path d="${path}" class="x2pbr${tg ? ' tg' : ''}${run ? ' run' : ''}${o.sel === k ? ' sel' : ''}"/><path d="M${hd(0.5, 1.4)} L${ax.toFixed(2)} ${ay.toFixed(2)} L${hd(-0.5, 1.4)}" class="x2pbr${tg ? ' tg' : ''}${run ? ' run' : ''} hd"/>`; } });
  Object.entries(PB_FORM).forEach(([k, [dn, lat]]) => { s += `<circle cx="${lat}" cy="${Y(dn)}" r="${o.sel === k ? 1.35 : 1.05}" class="x2pbp${d.tg === k ? ' tg' : ''}${o.sel === k ? ' sel' : ''}"/>${o.ed || o.lbl ? `<text x="${k === 'QB' ? lat - 0.6 : k === 'RB' ? lat + 0.6 : lat}" y="${(+Y(dn) + 2.9).toFixed(1)}" class="x2pbt" text-anchor="${k === 'QB' ? 'end' : k === 'RB' ? 'start' : 'middle'}">${k}</text>` : ''}`; });
  return s + '</svg>';
}
function vX2Pbook() {
  if (!pbkOn()) return `<section class="card"><div class="eyebrow">Playbook</div><h2 class="h2">The offense isn't yours to call</h2><p class="muted">The head coach or the offensive coordinator runs the playbook. ${isCoach() && state.co.role === 'DC' ? 'You run the defense.' : ''}</p></section>`;
  const B = pbkStore(); const f = pbkFit(); const bon = pbkBonus(); const sch = myScheme().off;
  const card = d => { const on = B.on.includes(d.id); const fit = (d.fit || []).includes(sch); return `<div class="x2pbc${on ? ' on' : ''}">${pbSvg(d)}<div><b>${esc(d.n)}</b>${d.cr ? ' <span class="pill">Yours</span>' : fit ? ' <span class="pill good">Fits your system</span>' : ''}<div class="small muted">${esc(PB_B[d.b] || '')} · ${esc(d.d || '')}</div><div class="row gap wrap mt"><button class="btn sm${on ? '' : ' primary'}" data-act="x2pb" data-id="${d.id}" aria-pressed="${on}">${on ? 'In the playbook ✓' : 'Add it'}</button><button class="btn ghost sm" data-act="x2pbw" data-id="${d.id}">See it on the field</button>${d.cr ? `<button class="btn ghost sm" data-act="x2pbedit" data-id="${d.id}">Edit</button><button class="btn ghost sm" data-act="x2pbdel" data-id="${d.id}">Delete</button>` : ''}</div></div></div>`; };
  const cat = Object.keys(PB_B).map(b => { const L = Object.keys(PB_PLAYS).filter(k => PB_PLAYS[k].b === b).map(pbkDef).concat(B.custom.filter(c => c.b === b).map(c => pbkDef(c.id))); return L.length ? `<h3 class="h3 mt">${esc(PB_B[b])}</h3><div class="x2pbgrid">${L.map(card).join('')}</div>` : ''; }).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Playbook · ${esc(OFF_SCH[sch] ? OFF_SCH[sch].n : sch)} offense</div><h2 class="h2">Your plays</h2></div><p class="hint">Pick ${PB_MIN} to ${PB_MAX} plays. When you call plays in a game, these are your buttons, and the field view runs them with their real routes. A playbook that fits your system, with at least three runs and three passes, lifts the offense a little.</p></div>
    <div class="tiles"><div><span class="k">Plays</span><span class="v">${f.n}</span><span class="s">${f.runs} runs · ${f.pass} passes</span></div><div><span class="k">Fit your system</span><span class="v">${f.fit} of ${f.n}</span><span class="s">${f.custom ? f.custom + ' of your own' : 'Draw your own below'}</span></div><div><span class="k">Effect on game day</span><span class="v">${B.set ? (bon > 0 ? '+' : '') + bon.toFixed(2) : '—'}</span><span class="s">${B.set ? (bon >= 0 ? 'A small lift for the offense' : 'It costs you a little: check the balance and the fit') : 'The default playbook: no effect until you change it'}</span></div></div></section>
   ${x2PbEditor()}<section class="card"><div class="eyebrow">The catalog</div>${cat}</section>`;
}
function x2PbEd() { if (!ui.pbEd) ui.pbEd = { sel: 'WR1', r: {}, tg: 'WR1', n: '', id: null }; return ui.pbEd; }
function x2PbEditor() {
  const E = x2PbEd(); const B = pbkStore(); const d = { n: E.n || 'Your play', r: E.r, tg: E.tg, b: 'short' }; const full = !E.id && B.custom.length >= PB_CUSTOM;
  return `<section class="card" id="x2pbedc"><div class="head"><div><div class="eyebrow">Draw your own play</div><h2 class="h2">${E.id ? 'Edit: ' + esc(E.n) : 'A new pass play'}</h2></div><p class="hint">Pick a player, then tap the field to draw his route, up to four points. The ball goes to the player you mark as the target. You can keep ${PB_CUSTOM} plays of your own.</p></div>
   <div class="x2pbedw">${pbSvg(d, { ed: true, sel: E.sel })}<div>
    <div class="lbl">Drawing the route for</div>${seg('x2pbsel', E.sel, PB_ROLES.map(k => [k, k + ((E.r[k] || []).length ? ' ✓' : '')]))}
    <div class="lbl mt">The ball goes to</div>${seg('x2pbtg', E.tg, PB_ROLES.map(k => [k, k]))}
    <div class="row gap wrap mt"><button class="btn ghost sm" data-act="x2pbundo">Undo a point</button><button class="btn ghost sm" data-act="x2pbclear">Clear his route</button><button class="btn ghost sm" data-act="x2pbnew">Start over</button></div>
    <label class="fld mt"><span>Name</span><input id="x2pbn" maxlength="28" value="${esc(E.n)}" placeholder="Name your play"></label>
    <div class="row gap wrap mt"><button class="btn primary" data-act="x2pbsave"${full ? ' disabled' : ''}>${E.id ? 'Save changes' : 'Add it to the playbook'}</button><button class="btn ghost" data-act="x2pbw" data-id="ed">See it on the field</button></div>${full ? `<p class="hint">You have ${PB_CUSTOM} plays of your own. Delete one to draw another.</p>` : ''}${ui.pbMsg ? `<p class="small">${esc(ui.pbMsg)}</p>` : ''}
   </div></div></section>`;
}
// tap the editor's field to add a point to the selected player's route
document.addEventListener('click', e => { const svg = e.target && e.target.closest ? e.target.closest('#x2pbed') : null; if (!svg || !ui.pbEd || appMode !== 'ad') return; const m = svg.getScreenCTM(); if (!m) return; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(m.inverse());
  const E = ui.pbEd; const n = document.getElementById('x2pbn'); if (n) E.n = n.value; const L = E.r[E.sel] || (E.r[E.sel] = []); if (L.length >= 4) { ui.pbMsg = 'Four points a route at most.'; render(); return; }
  L.push([clamp(Math.round((32 - p.y) * 2) / 2, -6, 30), clamp(Math.round(p.x * 2) / 2, -24.5, 24.5)]); ui.pbMsg = ''; render(); });
function x2PbWatch(d) {
  const opp = Object.keys(state.teams).find(id => id !== ME && !isFCS(id)) || ME; pfReset({ ids: [ME, opp], first: 0, ckKey: 'pb:' + (d.id || 'ed'), log: [], box: null, mSide: 0 }); pf.replay = true; pf.spdF = () => 1;
  const run = pbkRun(d); const cr = pbkCr(d); const end = !run && d.r && d.r[d.tg] ? d.r[d.tg][d.r[d.tg].length - 1] : null;
  const P = { o: 0, dir: 1, los: 30, fd: 40, kind: run ? 'run' : 'pass', call: d.b, y: run ? (d.b === 'outside' ? 9 : 6) : Math.max(4, Math.round((end ? end[0] : 8) + 3)), n: null, td: false, key: 'pbw:' + (d.id || 'ed'), down: 1, togo: 10, pbn: d.n };
  if (cr) { P.cr = cr; P.tg = 'O' + cr.tg; } pfQueue(P, `${d.n} · ${PB_B[d.b] || ''}`); return true;
}

/* ---------- 14. one-on-one meetings (Coach) ---------- */
function vX2Meet() {
  const M = mtgStore(); const left = Math.max(0, mtgMax() - M.used); const L = mtgList(); const pro = isPro();
  const rows = L.map(({ p, risk, benched, rap }) => { const met = M.met.includes(p.id); const pr = (M.prom || []).find(x => x.pid === p.id);
    return `<tr><td><b>${esc(p.n)}</b><div class="small muted">${esc(p.pos)} · ${p.ovr} OVR${pro ? '' : ' · ' + esc(p.cls || '')}${benched ? ' · backup' : ' · starter'}</div></td><td class="num">${Math.round(rap)}</td><td><span class="pill ${risk >= 0.45 ? 'bad' : risk >= 0.25 ? 'warn' : ''}">${risk >= 0.45 ? (pro ? 'Unhappy' : 'Might transfer') : risk >= 0.25 ? 'Restless' : 'Settled'}</span>${pr ? ' <span class="pill">Promised a role</span>' : ''}</td>
      <td><div class="row gap wrap">${met ? '<span class="small muted">Met this week</span>' : Object.entries(MTG).map(([k, [l]]) => `<button class="btn sm${k === 'future' && risk >= 0.25 ? ' primary' : ' ghost'}" data-act="x2mtg" data-id="${p.id}" data-k="${k}" ${left ? '' : 'disabled'}>${esc(l)}</button>`).join('')}</div></td></tr>`; }).join('');
  const hist = (M.hist || []).slice(0, 8).map(h => `<li><span class="muted small">${h.s}${h.wk ? ' wk ' + h.wk : ''}:</span> ${esc(MTG[h.k][0])} · ${esc(h.txt)}</li>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Player meetings · ${left} of ${mtgMax()} left ${state.phase === 'offseason' ? 'this offseason' : 'this week'}</div><h2 class="h2">Your door is open</h2></div><p class="hint">${Object.values(MTG).map(m => `<b>${esc(m[0])}:</b> ${esc(m[1])}`).join(' ')}</p></div>
    ${rows ? `<div class="tw"><table class="tbl"><thead><tr><th>Player</th><th class="num">Rapport</th><th>Mood</th><th>Meet with him</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">Everyone is happy right now.</p>'}${ui.x2mtgMsg ? `<p class="flash">${esc(ui.x2mtgMsg)}</p>` : ''}</section>
   ${hist ? `<section class="card"><div class="eyebrow">Recent meetings</div><ul class="plainlist small">${hist}</ul></section>` : ''}`;
}

/* ---------- 16-18. the GM's desk ---------- */
{ const _t = vProTrades; vProTrades = function () { const html = _t(); if (!isGM()) return html; const B = tbkStore(); const mine = state.roster.filter(p => underContract(p)).sort((a, b) => b.ovr - a.ovr); const on = mine.filter(p => B.ids.includes(p.id)); const L = PS(); const calls = (L.tradeOffers || []).filter(o => o.blk && o.s === state.season).length;
  const chip = p => `<button class="btn sm${B.ids.includes(p.id) ? ' primary' : ' ghost'}" data-act="x2tbk" data-id="${p.id}" aria-pressed="${B.ids.includes(p.id)}">${esc(p.pos)} ${esc(p.n)} · ${p.ovr}${p.tdem ? ' · wants out' : ''}</button>`;
  return `<section class="card" id="x2tbk"><div class="head"><div><div class="eyebrow">Trade block</div><h2 class="h2">Shop your players</h2></div><p class="hint">${tbkOpen() ? 'Put players on the block and clubs call with offers. They land with your other offers on this page.' : 'The trade deadline has passed. The block opens again in the offseason.'}</p></div>
   ${on.length ? `<div class="lbl">On the block${calls ? ` · ${calls} offer${calls === 1 ? '' : 's'}` : ''}</div><div class="row gap wrap">${on.map(chip).join('')}</div>` : '<p class="small muted">Nobody on the block.</p>'}
   <details class="mt"${on.length ? '' : ' open'}><summary>Add players</summary><div class="row gap wrap mt">${mine.filter(p => !B.ids.includes(p.id)).slice(0, 40).map(chip).join('')}</div></details></section>` + html; }; }
{ const _o = vProOffice; vProOffice = function () { const html = _o(); if (!isGM()) return html; const O = obmStore(); const ask = ui.x2obm || (ui.x2obm = { staff: 0, travel: 0, fac: 0 }); const yr = state.phase === 'offseason' ? state.season + 1 : state.season;
  const meet = obmReady() ? `<section class="card next"><div class="eyebrow">Owner budget meeting · ${state.season + 1} season</div><h2 class="h3">What do you ask for?</h2><p class="small muted">Once each offseason. The owner says yes more often when he's happy with you; a cut always goes through, and he likes it.</p>
      ${Object.entries(OBM).map(([k, [l, d]]) => `<div class="x2obm"><div><b>${esc(l)}</b><div class="small muted">${esc(d)}</div></div>${seg('x2obmask', String(ask[k]), [['-1', 'Cut it'], ['0', 'Keep it'], ['1', 'Ask for more']], `data-k="${k}"`)}</div>`).join('')}<button class="btn primary mt" data-act="x2obm">Go to the meeting</button></section>`
    : O.yr === yr ? `<section class="card"><div class="eyebrow">Owner budget meeting · ${yr}</div><ul class="plainlist small">${Object.entries(OBM).map(([k, [l]]) => `<li>${esc(l)}: <b>${O.got[k] > 0 ? 'more money approved' : O.got[k] < 0 ? 'cut' : O.ask && +O.ask[k] > 0 ? 'turned down' : 'the same'}</b></li>`).join('')}</ul></section>` : '';
  const hs = state.roster.filter(p => p.hold || p.tdem);
  const hold = hs.length ? `<section class="card next"><div class="eyebrow">Holdouts and trade demands</div><ul class="plainlist">${hs.map(p => p.hold ? `<li class="x2promo"><b>${esc(p.pos)} ${esc(p.n)}</b> is holding out${p.hold.wks ? ' (' + p.hold.wks + ' week' + (p.hold.wks === 1 ? '' : 's') + ')' : ''}. He wants about ${fmM(p.hold.ask)} a year. He can't play until it's settled. <span class="row gap"><button class="btn sm primary" data-act="x2hpay" data-id="${p.id}">Pay him (4 years)</button><button class="btn ghost sm" data-act="x2tbk" data-id="${p.id}">${tbkStore().ids.includes(p.id) ? 'On the block' : 'Put him on the block'}</button></span></li>`
      : `<li class="x2promo"><b>${esc(p.pos)} ${esc(p.n)}</b> wants to be traded. <span class="row gap">${p.tdem.talked ? '<span class="small muted">You talked; he still wants out.</span>' : `<button class="btn sm" data-act="x2htalk" data-id="${p.id}">Talk him out of it</button>`}<button class="btn ghost sm" data-act="x2tbk" data-id="${p.id}">${tbkStore().ids.includes(p.id) ? 'On the block' : 'Put him on the block'}</button></span></li>`).join('')}</ul></section>` : '';
  return hold + meet + html; }; }

/* ---------- 19-22. Player Career ---------- */
function x2NcsCard() {
  const N = ncsSync(); if (!N) return ''; const sys = OFF_SCH[N.sys] ? OFF_SCH[N.sys].n.toLowerCase() : N.sys;
  return `<section class="card${N.done ? '' : ' next'}"><div class="eyebrow">New head coach</div><h2 class="h3">${esc(N.n)} takes over</h2><p>${N.why === 'fired' ? 'The old staff was fired after a losing season.' : N.old ? esc(N.old) + ' is gone.' : 'The old staff is gone.'} The new coach runs a ${esc(sys)} offense. ${N.fit ? 'You fit what he wants to do.' : 'You\'ll have to earn a role in his system.'}</p>
   ${N.done ? `<p class="small">You chose: <b>${esc(NCS_CH[N.done][0])}</b>.</p>` : `<div class="evopts">${Object.entries(NCS_CH).map(([k, [l, d]]) => `<button class="evopt" data-act="x2ncs" data-v="${k}"><b>${esc(l)}</b><span>${esc(d)}</span></button>`).join('')}</div>`}</section>`;
}
function x2TrnCard() {
  if (!trnOpen()) return ''; const S = trnStore();
  return `<section class="card"><div class="eyebrow">Offseason training · ${cs.year}</div><h2 class="h3">Four drills, once each</h2><p class="small muted">Each one earns 1 to 4 skill points, depending on how you do.</p><div class="x2trn">${Object.entries(TRN).map(([k, [l, , how]]) => { const r = S.done[k]; return `<div class="drill"><b>${esc(l)}</b><div class="small muted">${esc(how)}</div>${r ? `<div class="small">Done: ${Math.round(r.q * 100)}% · +${r.xp || 0} skill points</div>` : `<button class="btn sm mt" data-act="x2trn" data-k="${k}">Start</button>`}</div>`; }).join('')}</div></section>`;
}
function x2TrnOpen(k) {
  const T_ = TRN[k]; if (!T_ || !trnOpen() || trnStore().done[k] != null) return; xd = { k: T_[1], pro: false, t0: 0, n: 0, reps: [], hits: [], q: 0, ok: 0, done: false, trn: k };
  openModal(`<div class="eyebrow">Offseason training</div><h2 class="h2">${esc(T_[0])}</h2><p>${esc(T_[2])}</p><div id="xdrill" class="xdrill"></div><div class="row gap mt" id="xdctl"><button class="btn primary" data-act="xdgo">Start</button><button class="btn ghost" data-act="close">Not now</button></div>`, T_[0]);
}
{ const _xf = xDrillFinish; xDrillFinish = function (perf) { if (!xd || !xd.trn) return _xf(perf); if (xd.done) return; xd.done = true; const r = trnFinish(xd.trn, perf); cSave(); const el = document.getElementById('xdrill'); if (el) el.innerHTML = `<p class="big">${Math.round(clamp(perf, 0, 1) * 100)}%</p><p class="small muted">${r ? '+' + (r.xp || 0) + ' skill points' : 'Done'}</p>`; const c = document.getElementById('xdctl'); if (c) c.innerHTML = '<button class="btn primary" data-act="close">Back to training</button>'; render(); }; }
{ const _nc = nextChapterHTML; nextChapterHTML = function () {
  const jr = jrnList(); const jc = jr.length ? `<section class="card next"><div class="eyebrow">Jersey retirement night</div><h2 class="h3">Number ${cs.p.num}, retired</h2><ul class="plainlist">${jr.map((j, i) => `<li class="row between gap"><span><b>${esc(j.name)}</b> · ${esc(j.why)}</span><button class="btn sm${j.seen ? ' ghost' : ' primary'}" data-act="x2jrn" data-i="${i}">${j.seen ? 'Watch it again' : 'Watch the ceremony'}</button></li>`).join('')}</ul></section>` : '';
  const tm = cs.nfl && NFL_BY[cs.nfl.tm] ? cs.nfl.tm : 'DET';
  if (cs.after === 'gm') return jc + `<section class="card"><div class="eyebrow">Next chapter</div><h2 class="h3">The front office</h2><p>${esc(cName(cs.p))} moved into an NFL front office. The GM career lives in your AD save slots.</p><button class="btn ghost" data-act="cafter" data-v="gm2">Set up the GM career</button></section>`;
  let h = _nc(); if (!cs.after) h = h.replace('<div class="evopts">', `<div class="evopts"><button class="evopt" data-act="cafter" data-v="gm"><b>Become a general manager</b><span>Run the ${esc(nflName(tm))} front office: the cap, the draft and trades. Your name carries weight with the owner.</span></button>`);
  return jc + h; }; }
async function x2StartGM() {
  const nm = cName(cs.p); const tm = cs.nfl && NFL_BY[cs.nfl.tm] ? cs.nfl.tm : 'DET'; const bonus = typeof careerRepBonus === 'function' ? careerRepBonus() : 0;
  if (!(await leaveMode())) return; switchNS('ad'); const free = firstFreeSlot();
  if (!free) { appMode = 'home'; rngOwner = null; cui.flash = 'All five AD save slots are in use. Delete one, then choose "Set up the GM career" on the retired player\'s page.'; render(); window.scrollTo(0, 0); return; }
  newGame('normal', null, null, 'MICH'); goPro(tm, { role: 'gm' }); state.tline = []; setActiveSlot(free); const L = PS(); if (L.gm) L.gm.sec = clamp(L.gm.sec + Math.min(12, bonus), 0, 100);
  addNews(`${nm} retires as a player and takes over as general manager of the ${myName()}.`, 'big');
  appMode = 'ad'; rngOwner = 'ad'; resetUi(); ui.tab = 'off'; hideModal(); applyTheme(); save(); await flushSave(); ui.flash = `Welcome to the front office (slot ${free}).`; render(); window.scrollTo(0, 0);
}
{ const _ca = actions.cafter; actions.cafter = async function (d) { if (d.v === 'gm' || d.v === 'gm2') { if (d.v === 'gm' && !careerAfter('gm')) return; cSave(); return x2StartGM(); } return _ca.call(this, d); }; }

/* ---------- 23. the realignment map (Commissioner, college) ---------- */
const RM_COL = ['#2f6fd6', '#c2417a', '#c27c0e', '#2e9e6a', '#7b4fd0', '#d0503a', '#1f8fa8', '#8a6d1f', '#b03fa8', '#4b7d2a', '#5a6b8c', '#a8551f'];
function x2RmapHTML() {
  const D = rmapData(); if (!D) return ''; const col = {}; D.forEach((c, i) => { col[c.k] = RM_COL[i % RM_COL.length]; }); const sel = ui.x2rm && T(ui.x2rm) ? ui.x2rm : null;
  const dots = D.flatMap(c => c.teams.map(t => `<circle cx="${(t.x * 1000).toFixed(0)}" cy="${(20 + t.y * 500).toFixed(0)}" r="${t.id === sel ? 11 : 7}" fill="${col[c.k]}" class="x2rmdot${t.id === sel ? ' sel' : ''}${t.from ? ' mv' : ''}" data-act="x2rmsel" data-id="${t.id}" tabindex="-1"><title>${esc(t.name)} · ${esc(c.name)}${t.from ? ' (moving)' : ''}</title></circle>`)).join('');
  const boxes = D.map(c => `<div class="x2rmc${sel ? ' tgt' : ''}" data-x2rmc="${c.k}"><div class="row between gap"><b><i class="x2sw" style="background:${col[c.k]}"></i>${esc(c.short || c.name)}</b><span class="small muted">${c.teams.length}</span></div>
     <div class="x2rmts">${c.teams.map(t => `<button class="x2rmt${t.id === sel ? ' sel' : ''}${t.from ? ' mv' : ''}" data-act="x2rmsel" data-id="${t.id}" data-x2rmt="${t.id}" title="${t.from ? 'Moving from the ' + esc(CONFS[t.from] ? CONFS[t.from].name : t.from) : 'Drag to another conference'}">${esc(t.id)}</button>`).join('')}</div>${sel && T(sel).conf !== c.k && !c.teams.some(t => t.id === sel) ? `<button class="btn sm mt" data-act="x2rm" data-k="${c.k}">Move ${esc(teamName(sel))} here</button>` : ''}</div>`).join('');
  return `<section class="card" id="x2rmap"><div class="head"><div><div class="eyebrow">Realignment</div><h2 class="h2">The map</h2></div><p class="hint">Drag a school to another conference, or tap it and then tap "Move here". ${state.phase === 'offseason' ? 'In the offseason the move happens now.' : 'During the season, moves take effect after it.'} Faded schools are already on the move.</p></div>
   <svg class="x2map" viewBox="0 0 1000 560" role="img" aria-label="Map of every school, colored by conference"><rect x="0" y="0" width="1000" height="560" class="x2mapbg"/><path d="M5 42 L16 86 L10 170 L21 214 L45 266 L76 318 L136 360 L178 356 L240 384 L290 384 L319 374 L353 418 L379 430 L407 414 L440 460 L476 492 L476 454 L522 422 L538 416 L603 428 L614 406 L638 402 L688 416 L707 408 L729 450 L747 504 L769 506 L776 476 L766 438 L752 396 L760 368 L793 340 L812 328 L853 304 L845 270 L862 240 L879 202 L916 184 L948 176 L938 158 L945 136 L1000 114 L986 68 L962 62 L922 110 L864 110 L838 126 L793 144 L734 150 L733 104 L697 80 L631 44 L514 30 L34 30Z" class="x2mapus"/><rect x="20" y="430" width="150" height="110" class="x2mapin"/><text x="28" y="448" class="x2maplbl">Alaska · Hawaii</text>${dots}</svg>
   ${sel ? `<p class="small">Selected: <b>${esc(teamName(sel))}</b> (${esc(CONFS[T(sel).conf] ? CONFS[T(sel).conf].name : '')}). <button class="btn ghost sm" data-act="x2rmsel" data-id="">Clear</button></p>` : ''}<div class="x2rmcs">${boxes}</div></section>`;
}
{ const _lg = vCmLeague; vCmLeague = function () { return (isPro() ? '' : x2RmapHTML()) + _lg(); }; }
function x2RmMove(id, k) { const t = T(id); if (!t) return; if (t.conf === k && !(commOf().moves || []).some(m => m.tid === id)) return; if (!commMove(id, k)) return after('That school is already in that conference.'); ui.x2rm = null; after(state.phase === 'offseason' ? `${t.name} moves to the ${CONFS[k].name}.` : `${t.name} will move to the ${CONFS[k].name} after the season.`); }
// dragging a school's chip onto another conference
let x2rmD = null;
document.addEventListener('pointerdown', e => { const b = e.target && e.target.closest ? e.target.closest('[data-x2rmt]') : null; if (!b || appMode !== 'ad') return; x2rmD = { id: b.dataset.x2rmt, x: e.clientX, y: e.clientY, moved: false, g: null, el: b }; });
document.addEventListener('pointermove', e => { const D = x2rmD; if (!D) return; if (!D.moved && Math.hypot(e.clientX - D.x, e.clientY - D.y) < 8) return; if (!D.moved) { D.moved = true; D.g = D.el.cloneNode(true); D.g.className = 'x2rmt x2ghost'; document.body.appendChild(D.g); try { D.el.setPointerCapture(e.pointerId); } catch (er) { } }
  D.g.style.left = e.clientX + 'px'; D.g.style.top = e.clientY + 'px'; document.querySelectorAll('.x2rmc.over').forEach(x => x.classList.remove('over')); const u = document.elementFromPoint(e.clientX, e.clientY); const c = u && u.closest ? u.closest('[data-x2rmc]') : null; if (c) c.classList.add('over'); e.preventDefault(); }, { passive: false });
document.addEventListener('pointerup', e => { const D = x2rmD; x2rmD = null; if (!D || !D.moved) return; if (D.g) D.g.remove(); document.querySelectorAll('.x2rmc.over').forEach(x => x.classList.remove('over')); x2rmSup = true; setTimeout(() => { x2rmSup = false; }, 60);
  const u = document.elementFromPoint(e.clientX, e.clientY); const c = u && u.closest ? u.closest('[data-x2rmc]') : null; if (c) x2RmMove(D.id, c.dataset.x2rmc); });
document.addEventListener('pointercancel', () => { if (x2rmD && x2rmD.g) x2rmD.g.remove(); x2rmD = null; });
let x2rmSup = false; window.addEventListener('click', e => { if (x2rmSup) { e.stopPropagation(); e.preventDefault(); x2rmSup = false; } }, true);

/* ---------- 30. the win chance graph, and playbook calls in the live game ---------- */
function x2LiveWp(sim) {
  const B = sim.box; let v = B && B.wp.length ? B.wp[B.wp.length - 1].v : 50; const p = sim.pending; if (sim.done) return v;
  if (p && (p.type === 'drive' || p.type === 'ddrive') && p.ds && p.ds.yl != null) { const m = simMargin(sim); const rem = Math.max(0.01, 1 - sim.i / sim.total); const ep = avsEP(p.ds.yl) * (p.type === 'drive' ? 1 : -1); v = Math.round(normcdf((m + ep * 0.8 + sim.m0 * rem) / (13.5 * Math.sqrt(rem) + 0.6)) * 100); }
  return clamp(v, 1, 99);
}
function x2WpSvg(L, me, op) {
  const W = 300, H = 70; const X_ = t => (clamp(t, 0, 1) * (W - 8) + 4).toFixed(1); const Y_ = v => (H - 4 - clamp(v, 0, 100) / 100 * (H - 8)).toFixed(1);
  const pts = L.map(p => `${X_(p.t)},${Y_(p.v)}`); const lastP = L[L.length - 1];
  return `<svg class="wpg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(me)} win chance over the game: now ${lastP.v}%"><rect x="0" y="0" width="${W}" height="${H / 2}" class="wpgt"/><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}" class="wpgb"/><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="wpgm"/>${[0.25, 0.5, 0.75].map(q => `<line x1="${X_(q)}" x2="${X_(q)}" y1="0" y2="${H}" class="wpgq"/>`).join('')}
   <polyline points="${pts.join(' ')}" class="wpgl"/><line x1="${X_(lastP.t)}" x2="${X_(lastP.t)}" y1="${Y_(lastP.v)}" y2="${Y_(lastP.v)}" class="wpgd"/></svg><span class="wpgk t">${esc(me)}</span><span class="wpgk m">50%</span><span class="wpgk b">${esc(op)}</span>`;
}
let x2PbName = null;
{ const _rp = runPlay; runPlay = function (sim, call) { if (!x2PbName || !CALLS[call]) return _rp(sim, call); const old = CALLS[call]; CALLS[call] = x2PbName; try { return _rp(sim, call); } finally { CALLS[call] = old; } }; }
{ const _lc = actions.lcall; actions.lcall = function (d) { const sim = live.sim; const p = sim && sim.pending; const def = d.pb ? pbkDef(d.pb) : null; if (p && p.type === 'drive' && def && CALLS[d.v]) { const ds = p.ds; (ds.pb || (ds.pb = []))[ds.plays.length] = d.pb; x2PbName = def.n; try { return _lc.call(this, d); } finally { x2PbName = null; } } return _lc.call(this, d); }; }
{ const _rl = renderLive; renderLive = function () { _rl(); try { x2LiveDecor(); } catch (e) { if (typeof console !== 'undefined') console.error('live extras', e); } }; }
function x2LiveDecor() {
  const sim = live.sim; if (!sim || sim.mSide < 0 || !sim.box) return; const mb = document.querySelector('#modal .mbody'); const wpEl = mb && mb.querySelector('.live .wp'); if (!wpEl) return; const p = sim.pending;
  const v = x2LiveWp(sim); const sig = sim.log.length + ':' + (p && p.ds ? p.ds.plays.length : '-') + (sim.done ? 'F' : '');
  const L = sim.x2wp || (sim.x2wp = [{ t: 0, v: sim.box.wp.length ? sim.box.wp[0].v : 50 }]);
  if (sim.x2sig !== sig) { sim.x2sig = sig; const t = sim.done ? 1 : clamp(sim.i / Math.max(1, sim.total) + (p && p.ds ? p.ds.plays.length * 0.004 : 0), 0, 0.999); if (t >= L[L.length - 1].t) L.push({ t, v }); else L[L.length - 1].v = v; if (L.length > 200) L.splice(1, L.length - 200); }
  const bar = wpEl.querySelector('.wpbar i'); if (bar) bar.style.width = v + '%'; const b = wpEl.querySelector('.wpl b'); if (b) b.textContent = v + '%';
  const g = document.createElement('div'); g.className = 'wpgw'; g.innerHTML = x2WpSvg(L, myAb(), isFCS(sim.oppId) ? 'OPP' : sim.oppId); wpEl.after(g);
  if (p && p.type === 'drive' && pbkOn()) { const calls = mb.querySelector('.calls'); const plays = pbkCalls(); if (calls && plays && plays.length) { const hints = playHints(sim); const kicks = [...calls.querySelectorAll('[data-act="lkick"]')].map(x => x.outerHTML).join('');
      calls.classList.add('x2calls'); calls.innerHTML = plays.map(d => `<button class="evopt" data-act="lcall" data-v="${d.b}" data-pb="${d.id}"><b>${esc(d.n)}</b><span>${esc(CALLS[d.b])} · ${esc(hints[d.b] || '')}</span></button>`).join('') + kicks; } }
}

/* ---------- the actions ---------- */
Object.assign(actions, {
  x2s60() { if (xCareer()) hlOpen(`${cs.year} in 60 seconds`, cName(cs.p), () => pfS60Career(s60Items())); else hlOpen(`${state.season} in 60 seconds`, myName(), () => pfS60AD(s60Items())); },
  x2scn(d) { x2ScnStart(d.k); },
  x2tpkprev() { const el = document.getElementById('x2tpktxt'); ui.x2tpk = el ? el.value : ui.x2tpk || ''; ui.x2tpkPrev = tpkParse(ui.x2tpk); ui.x2tpkMsg = ''; render(); },
  x2tpkno() { const el = document.getElementById('x2tpktxt'); ui.x2tpk = el ? el.value : ui.x2tpk; ui.x2tpkPrev = null; render(); },
  x2tpk() { ui.x2tpkPrev = null; const el = document.getElementById('x2tpktxt'); const txt = el ? el.value : ui.x2tpk || ''; ui.x2tpk = txt; const r = tpkApply(txt); ui.x2tpkMsg = (r.n ? `Imported ${r.n} team${r.n === 1 ? '' : 's'}${r.moves ? `, ${r.moves} conference move${r.moves === 1 ? '' : 's'}` : ''}.` : '') + (r.errs.length ? `<ul class="plainlist">${r.errs.slice(0, 8).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''); if (r.n) ui.x2tpk = ''; after(r.n ? 'Team pack imported.' : ''); },
  x2tpkdl(d, el) { x2Download('football-empire-team-pack.csv', tpkTemplate(), 'text/csv', el || document.querySelector('[data-act="x2tpkdl"]')); },
  x2osp(d) { if (ospSet(d.k, +d.v)) after(); },
  x2tvn() { const r = tvnPitch(); after(TVN_MSG[r] || ''); },
  x2tvsell(d) { if (d.v === 'yes') { ui.x2tvsell = false; const p = tvnSell(); after(p ? `Sold for ${fmM(p)}.` : ''); } else { ui.x2tvsell = d.v !== 'no'; render(); } },
  x2dhire(d) { if (dstHire(d.k, +d.i)) after('Hired.'); },
  x2dfire(d) { if (dstFire(d.k)) after('Let go.'); },
  x2astgo(d) { const o = (X().promo || []).find(x => x.r === d.r && !x.done); if (o) { astLetGo(o, false); after(`${o.n} moves on with your blessing.`); } },
  x2astkeep(d) { const o = (X().promo || []).find(x => x.r === d.r && !x.done); if (!o) return; const r = astKeep(o); after(r === 'stayed' ? `${o.n} is staying, with a raise.` : `${o.n} took the job anyway.`); },
  x2pb(d) { const r = pbkToggle(d.id); after(r === 'min' ? `Keep at least ${PB_MIN} plays.` : r === 'max' ? `${PB_MAX} plays at most. Take one out first.` : ''); },
  x2pbw(d) { const def = d.id === 'ed' ? (() => { const E = x2PbEd(); const n = document.getElementById('x2pbn'); if (n) E.n = n.value; return E.r[E.tg] ? { n: E.n || 'Your play', r: E.r, tg: E.tg, b: 'short', id: 'ed' } : null; })() : pbkDef(d.id); if (!def) { ui.pbMsg = 'Draw a route for the target first.'; render(); return; } hlOpen(def.n, 'Your playbook', () => x2PbWatch(def)); },
  x2pbsel(d) { const E = x2PbEd(); const n = document.getElementById('x2pbn'); if (n) E.n = n.value; E.sel = d.v; render(); },
  x2pbtg(d) { const E = x2PbEd(); const n = document.getElementById('x2pbn'); if (n) E.n = n.value; E.tg = d.v; render(); },
  x2pbundo() { const E = x2PbEd(); const L = E.r[E.sel]; if (L && L.length) L.pop(); if (L && !L.length) delete E.r[E.sel]; render(); },
  x2pbclear() { const E = x2PbEd(); delete E.r[E.sel]; render(); },
  x2pbnew() { ui.pbEd = null; ui.pbMsg = ''; render(); },
  x2pbsave() { const E = x2PbEd(); const n = document.getElementById('x2pbn'); if (n) E.n = n.value; const r = pbkSave({ n: E.n, r: E.r, tg: E.tg, id: E.id }); const M = { name: 'Give your play a name.', routes: 'Draw a route for the player the ball goes to.', max: `You can keep ${PB_CUSTOM} plays of your own.`, role: 'Only the play caller can do that.' }; if (r === 'ok') { ui.pbEd = null; ui.pbMsg = ''; after('Saved to your playbook.'); } else { ui.pbMsg = M[r] || ''; render(); } },
  x2pbedit(d) { const c = pbkDef(d.id); if (!c || !c.cr) return; ui.pbEd = { sel: c.tg, r: JSON.parse(JSON.stringify(c.r)), tg: c.tg, n: c.n, id: c.id }; ui.pbMsg = ''; render(); const el = document.getElementById('x2pbedc'); if (el) el.scrollIntoView({ block: 'start' }); },
  x2pbdel(d) { if (pbkDelete(d.id)) { if (ui.pbEd && ui.pbEd.id === d.id) ui.pbEd = null; after('Deleted.'); } },
  x2mtg(d) { const r = mtgMeet(d.id, d.k); ui.x2mtgMsg = r.txt; if (r.ok) after(); else render(); },
  x2tbk(d) { const r = tbkToggle(d.id); after(r === 'on' ? 'On the trade block. Clubs will call.' : r === 'off' ? 'Off the trade block.' : ''); },
  x2obmask(d) { const a = ui.x2obm || (ui.x2obm = { staff: 0, travel: 0, fac: 0 }); a[d.k] = +d.v; render(); refocus({ act: 'x2obmask', k: d.k, v: d.v }); },
  x2obm() { const r = obmMeet(ui.x2obm || {}); ui.x2obm = null; after(r ? 'The meeting is over.' : ''); },
  x2hpay(d) { const p = P(d.id); if (hldPay(d.id)) after(`${p.n} signs a new deal and reports.`); },
  x2htalk(d) { const r = hldTalk(d.id); after(r === 'ok' ? 'He withdraws his request.' : r === 'no' ? 'He still wants out.' : ''); },
  x2ncs(d) { if (ncsChoose(d.v) != null) cAfter('Your new coach will remember that.'); },
  x2trn(d) { x2TrnOpen(d.k); },
  x2jrn(d) { const j = jrnList()[+d.i]; if (!j) return; const first = !j.seen; j.seen = true; if (first) try { feedPost('jersey', { X: j.num }, { s: cs.year, wk: cs.week || 0, mood: 85, big: true }); } catch (e) { } cSave(); dnPlay(`${j.name} retires number ${j.num}`, 'Jersey retirement night', jrnScript(j)); },
  x2rmsel(d) { ui.x2rm = d.id || null; render(); },
  x2rm(d) { if (ui.x2rm) x2RmMove(ui.x2rm, d.k); },
});

