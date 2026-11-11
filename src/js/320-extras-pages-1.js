/* ===================== EXTRAS (v9.12): the pages ===================== */
// Fan feed, Pick'em, Highlights, Rivals, Game day & business, Camp & goals, Waivers & practice squad, Friends league,
// roster import, live-game two-point and onside calls, and the Player Career pages (fan feed, life, combine drills,
// a new player in the same world). The engine is ext.js.
const X_TABS = [['feed', 'Fan feed'], ['pickem', 'Pick\'em'], ['reels', 'Highlights'], ['rivals', 'Rivals'], ['biz', 'Game day & business'], ['camp', 'Camp & goals'], ['nflx', 'Waivers & practice squad'], ['friends', 'Friends league']];
(function xTabsInit() {
  TABS.splice(TABS.findIndex(t => t[0] === 'lghist') + 1, 0, ...X_TABS);
  const grp = (G, name, ks) => { const g = G.find(x => x[0] === name); if (g) ks.forEach(k => { if (!g[1].includes(k)) g[1].push(k); }); };
  grp(TAB_GROUPS, 'Season', ['feed', 'pickem', 'reels']); grp(TAB_GROUPS, 'Program', ['camp']); grp(TAB_GROUPS, 'Business', ['biz']); grp(TAB_GROUPS, 'Career', ['rivals', 'friends']);
  PRO_TABS.splice(PRO_TABS.findIndex(t => t[0] === 'lghist') + 1, 0, ...X_TABS.filter(t => t[0] !== 'biz'));
  grp(PRO_GROUPS, 'Season', ['feed', 'pickem', 'reels']); grp(PRO_GROUPS, 'Team', ['camp', 'nflx']); grp(PRO_GROUPS, 'Career', ['rivals', 'friends']);
  CTABS.splice(1, 0, ['cfeed', 'Fan feed'], ['life', 'Life']); CTAB_GROUPS[0][1].splice(1, 0, 'cfeed', 'life');
  PREF_CHOICES.fcam = ['tv', 'wide', 'ez', 'me'];
})();
// Commissioner: the fan feed, pick'em, highlights and the friends league are part of the league office too
const _xCommTabs = commTabList; commTabList = function () { const L = _xCommTabs(); const i = L.findIndex(t => t[0] === 'lghist'); L.splice(i, 0, ['feed', 'Fan feed'], ['pickem', 'Pick\'em'], ['reels', 'Highlights'], ['friends', 'Friends league']); return L; };
const _xCommGroups = commGroups; commGroups = function () { const G = _xCommGroups(); G.splice(2, 0, ['Fans', ['feed', 'pickem', 'reels', 'friends']]); return G; };
function xTabVis(k) {
  if (!X_TABS.some(t => t[0] === k)) return null;
  if (k === 'friends') return typeof shareHere === 'function' && shareHere();
  if (k === 'biz') return bizOn(); if (k === 'nflx') return isGM(); if (k === 'rivals' || k === 'camp') return !isComm();
  return true;
}
function xView(tab) { if (!X_TABS.some(t => t[0] === tab) || !xTabVis(tab)) return null; return { feed: vXFeed, pickem: vXPick, reels: vXReels, rivals: vXRivals, biz: vXBiz, camp: vXCamp, nflx: vXNfl, friends: vXFriends }[tab]; }
function xCView(tab) { return { cfeed: vXFeed, life: vXLife }[tab] || null; }
const xAfter = msg => (xCareer() ? cAfter(msg) : after(msg));
const xK = n => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));
const xMeter = (v, lbl) => `<div class="xmeter"><div class="row between"><span class="small">${esc(lbl)}</span><b>${Math.round(v)}</b></div><div class="bar"><i class="${v >= 60 ? 'good' : v < 35 ? 'bad' : ''}" style="width:${clamp(v, 0, 100)}%"></i></div></div>`;
const xIni = n => String(n || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

/* ---------- the fan feed ---------- */
const FEED_FILTERS = [['all', 'All'], ['game', 'Game day'], ['rival', 'Rivals'], ['rec', 'Recruiting'], ['hot', 'Hot takes'], ['you', 'You'], ['news', 'News']];
function vXFeed() {
  const F = feedStore(); const ctx = feedCtx(); const acc = feedCast(F, ctx.key, ctx.T, ctx.R, ctx.yr); const mood = feedMood(); const flt = (xCareer() ? cui.xfeed : ui.xfeed) || 'all';
  const wkKey = xCareer() ? cs.year + ':' + cs.week : state.season + ':' + state.week; const posted = F.youWk === wkKey;
  const list = F.posts.filter(p => flt === 'all' || p.cat === flt).slice(0, 60);
  const who = a => (a >= 0 ? acc[a] : null);
  const fmt = t => esc(t).replace(/#\w+/g, m => `<b class="xtag">${m}</b>`).replace(/@\w+/g, m => `<b class="xtag">${m}</b>`);
  const avatar = (a, you) => `<span class="xav" style="background:${you ? 'var(--accent, #2f6fd6)' : a.c}">${esc(you ? xIni(you) : xIni(a.n))}</span>`;
  const head = (a, p) => a ? `<span class="xnm" title="${esc(a.bio)}">${esc(a.n)}${a.v ? ' <span class="xver" aria-label="verified">✓</span>' : ''}</span> <span class="muted small">@${esc(a.h)} · ${p.s} wk ${p.wk}</span>` : `<span class="xnm">${esc(p.who || 'You')} <span class="xver">✓</span></span> <span class="muted small">${p.s} wk ${p.wk}</span>`;
  const post = p => { const a = who(p.a); return `<article class="xpost${p.cat === 'you' && p.a < 0 ? ' mine' : ''}">${avatar(a || {}, p.a < 0 ? (p.who || 'You') : null)}<div class="xbody"><div>${head(a, p)}</div><p>${fmt(p.t)}</p><div class="xstats small muted"><span>♥ ${xK(p.lk)}</span><span>⟲ ${xK(p.rt)}</span><span>💬 ${p.rp.length}</span></div>
     ${p.rp.length ? `<div class="xreplies">${p.rp.map(r => { const ra = acc[r.a]; return `<div class="xreply">${avatar(ra)}<div><span class="xnm small">${esc(ra.n)}</span> <span class="muted small">@${esc(ra.h)}</span><p>${fmt(r.t)}</p><span class="small muted">♥ ${xK(r.lk)}</span></div></div>`; }).join('')}</div>` : ''}</div></article>`; };
  const tr = feedTrends();
  const tones = Object.entries(FEED_TONES).map(([k, t]) => `<button class="btn sm${posted ? ' ghost' : ''}" data-act="xyou" data-v="${k}" ${posted ? 'disabled' : ''}>${esc(t.l)}</button>`).join('');
  const awn = !xCareer() && typeof awardNightReady === 'function' && awardNightReady() ? `<section class="card next"><div class="eyebrow">Tonight</div><h2 class="h3">Award night</h2><p>The season's awards are about to be handed out.</p><button class="btn primary" data-act="xawn">Watch award night</button></section>` : '';
  return `${awn}<section class="card"><div class="head"><div><div class="eyebrow">Fan feed</div><h2 class="h2">What the fans are saying</h2></div><p class="hint">Made-up fans, writers and rivals react to everything that happens. ${F.posts.length} posts this far.</p></div>
    <div class="xfeedtop"><div>${xMeter(mood, 'Fan mood: ' + FEED_MOOD_L(mood))}<div class="small mt"><b>Trending</b> ${tr.map(t => `<span class="pill">${esc(t.t)} <span class="muted">${xK(t.n)}</span></span>`).join(' ')}</div></div>
    <div><div class="small"><b>Post to the fans</b> <span class="muted">(once a week)</span></div><div class="row gap mt">${tones}</div>${posted ? '<p class="small muted">You posted this week. Their replies are below.</p>' : ''}</div></div>
    ${seg('xfeedf', flt, FEED_FILTERS)}
    <div class="xfeed">${list.length ? list.map(post).join('') : '<p class="muted">Nothing yet. Play a week and the fans will have plenty to say.</p>'}</div></section>
    <details class="card"><summary><b>Who's who</b> <span class="muted small">the regulars</span></summary><div class="xcast">${acc.slice().sort((a, b) => b.fol - a.fol).slice(0, 14).map(a => `<div class="xcastp">${avatar(a)}<div><span class="xnm small">${esc(a.n)}${a.v ? ' ✓' : ''}</span> <span class="muted small">@${esc(a.h)} · ${xK(a.fol)} followers</span><div class="small muted">${esc(a.bio)}</div></div></div>`).join('')}</div></details>`;
}

/* ---------- pick'em ---------- */
function vXPick() {
  if (state.phase === 'offseason') { const K = pkStore(); return `<section class="card"><div class="eyebrow">Pick'em</div><h2 class="h2">Back next season</h2>${pkHistHTML(K)}</section>`; }
  const K = pkSlate(); const tn = id => esc(teamName(id)); const rk = id => (!isPro() && rankOf(id) ? `<span class="muted small">#${rankOf(id)}</span> ` : '');
  const rows = K.games.map(g => { const gm = state.games.find(x => x.id === g.id); const done = gm && gm.done; const p = K.picks[g.id]; const lock = K.lock === g.id;
    const btn = side => { const id = g[side]; return `<button class="btn sm${p === side ? ' primary' : ' ghost'}" data-act="xpick" data-g="${g.id}" data-v="${side}" ${done ? 'disabled' : ''}>${rk(id)}${tn(id)}</button>`; };
    return `<tr><td>${btn('a')} <span class="muted">at</span> ${btn('h')}${g.h === ME || g.a === ME ? ' <span class="pill">Your game</span>' : ''}</td><td class="small">${Math.round(Math.max(g.ph, 1 - g.ph) * 100)}% ${tn(g.ph >= 0.5 ? g.h : g.a)}</td><td>${PK_EXPERTS.map((e, i) => `<span class="pill small" title="${esc(e[0])}">${esc(e[0].split(' ').slice(-1)[0])}: ${tn(g[pkExpertPick(i, g)])}</span>`).join(' ')}</td><td><button class="btn sm ${lock ? 'primary' : 'ghost'}" data-act="xlock" data-g="${g.id}" ${done ? 'disabled' : ''}>${lock ? 'Locked (x2)' : 'Lock'}</button></td></tr>`; }).join('');
  const ex = PK_EXPERTS.map((e, i) => ({ n: e[0], d: e[2], v: K.exp[i] })).concat([{ n: 'You', d: '', v: K.tot, me: true }]).sort((a, b) => b.v - a.v);
  return `<section class="card"><div class="head"><div><div class="eyebrow">Pick'em · ${esc(weekLabel(state.week, state.season))}</div><h2 class="h2">This week's big games</h2></div><p class="hint">Pick the winners before you play the week. One point each, two for your lock (and minus one if your lock loses).</p></div>
    <div class="tw"><table class="tbl"><thead><tr><th>Your pick</th><th>Favorite</th><th>The experts</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">No games this week.</td></tr>'}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Season standings</div><ol class="xrank">${ex.map(e => `<li class="${e.me ? 'me' : ''}"><b>${esc(e.n)}</b> <span class="muted small">${esc(e.d)}</span><span class="v">${e.v}</span></li>`).join('')}</ol>
    ${K.log.length ? `<div class="tw mt"><table class="tbl"><thead><tr><th>Week</th><th>You</th>${PK_EXPERTS.map(e => `<th>${esc(e[0].split(' ').slice(-1)[0])}</th>`).join('')}</tr></thead><tbody>${K.log.map(l => `<tr><td>${l.wk}</td><td class="num">${l.picked ? l.pts + ' / ' + l.max : '—'}</td>${l.exp.map(v => `<td class="num">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}${pkHistHTML(K)}</section>`;
}
function pkHistHTML(K) { return K.hist && K.hist.length ? `<p class="small mt"><b>Past seasons:</b> ${K.hist.map(h => `${h.s}: ${h.pts} pts, ${['1st', '2nd', '3rd', '4th', '5th'][h.rank - 1]}`).join(' · ')}${K.best ? ` · best ${K.best.pts} (${K.best.s})` : ''}</p>` : ''; }

/* ---------- highlights: game of the week, the top 10, award night ---------- */
function vXReels() {
  const L = gotwList(); const next = state.phase !== 'offseason' ? gotwPick(state.week) : null; const tops = xTopPlays().length;
  return `<section class="card"><div class="eyebrow">Highlights</div><h2 class="h2">Game of the week</h2>${next ? `<p>This week: <b>${esc(teamName(next.a))}</b> at <b>${esc(teamName(next.h))}</b>${next.name ? ' · ' + esc(next.name) : ''}. Watch it here after the week is played.</p>` : ''}
    ${L.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Game</th><th>Final</th><th></th></tr></thead><tbody>${L.map(e => `<tr><td>${e.s} · ${e.wk}</td><td>${esc(teamName(e.a))} at ${esc(teamName(e.h))}</td><td class="num">${e.as}-${e.hs}</td><td><button class="btn sm" data-act="xgotw" data-id="${e.id}">Watch</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Play a week to see the first one.</p>'}</section>
   <section class="card"><div class="eyebrow">Your season</div><h2 class="h2">Top 10 plays</h2><p>${tops ? `Your ${tops >= 10 ? 'ten best plays' : tops + ' best play' + (tops === 1 ? '' : 's')} of the season, counted down on the field.` : 'Your best plays will show up here once you have played some games.'}</p>${tops ? '<button class="btn primary" data-act="xtop10">Watch the countdown</button>' : ''}</section>
   ${!isComm() ? `<section class="card"><div class="eyebrow">Award night</div><h2 class="h2">The season's awards</h2><p>${awardNightReady() ? 'Award night is ready.' : X().awnSeen ? 'You watched this season\'s show. You can watch it again.' : 'Award night comes after the season.'}</p>${awardNightScript().length ? '<button class="btn" data-act="xawn">Watch award night</button>' : ''}</section>` : ''}`;
}
// your best plays of the season, from the highlights kept for each of your games
function xTopPlays() {
  const out = []; (state.games || []).filter(g => g.done && g.hl && g.hl.d && (g.h === ME || g.a === ME) && String(g.id).startsWith(state.season + '-')).forEach(g => {
    const mi = [g.h, g.a].indexOf(ME); g.hl.d.forEach((x, i) => { if (x.s !== mi && !(x.p6 && x.s !== mi)) return; const last = x.pl && x.pl[x.pl.length - 1]; let sc = 0;
      if (x.out === 'td') sc = 40 + (last ? Math.abs(last.y || 0) : 10); else if (x.out === 'fg' && x.fg >= 48) sc = 30 + x.fg - 40; else if (last && last.k === 'p' && last.y >= 25) sc = 25 + last.y; if (sc) out.push({ g, x, i, sc }); });
    g.hl.d.forEach((x, i) => { if (x.s === mi || !(x.out === 'to')) return; out.push({ g, x, i, sc: x.p6 ? 90 : 45 }); });
  });
  return out.sort((a, b) => b.sc - a.sc).slice(0, 10);
}
Object.assign(actions, {
  xfeedf(d) { if (xCareer()) cui.xfeed = d.v; else ui.xfeed = d.v; xCareer() ? render() : render(); },
  xyou(d) { const p = feedYouPost(d.v); xAfter(p ? 'Posted. The replies are rolling in.' : 'You already posted this week.'); },
  xpick(d) { pkPick(d.g, d.v); after(); },
  xlock(d) { pkLock(d.g); after(); },
  xawn() { X().awnSeen = isPro() ? state.season : state.season; save(); dnPlay(isPro() ? `${state.season} NFL Honors` : `${state.season} college football awards`, 'Award night', awardNightScript()); },
  xgotw(d) { const e = gotwList().find(x => x.id === d.id); if (!e) return; hlOpen(`${teamName(e.a)} ${e.as}, ${teamName(e.h)} ${e.hs}`, `Game of the week · ${weekLabel(e.wk, e.s)}`, () => pfReplayAD({ h: e.h, a: e.a, hl: e.hl, box: null })); },
  xtop10() { const L = xTopPlays(); if (!L.length) return; hlOpen(`Top ${L.length} plays of ${state.season}`, myName(), () => pfTop10(L)); },
});

/* ---------- rival executives ---------- */
function vXRivals() {
  const R_ = rxStore(); const ch = R_.chase; const rc = ch && !ch.met && state.rec ? state.rec.list.find(x => x.id === ch.rid) : null; const key = state.season + ':' + state.week;
  return `${rc ? `<section class="card next"><div class="eyebrow">Recruiting fight</div><h2 class="h3">${esc(teamName(ch.by))} is after ${esc(rc.n)}</h2><p>${'★'.repeat(rc.star)} ${esc(rc.pos)} · interest ${rc.interest}. Counter with a visit and a pitch for ${fmM(ch.cost)}, or he will cool on you next week.</p><button class="btn primary" data-act="xrxcounter">Counter (${fmM(ch.cost)})</button></section>` : ''}
   <section class="card"><div class="head"><div><div class="eyebrow">Rivals</div><h2 class="h2">The other ${isPro() ? 'front offices' : 'athletic directors'}</h2></div><p class="hint">They make moves you'll read about, bid against you for coaches, chase your recruits${isPro() ? '' : ''} and keep score. Heat is how hot the feud is.</p></div>
    <div class="xrxgrid">${R_.list.map(r => { const st = RX_STYLE[r.style]; return `<div class="xrx"><div class="row between"><b>${esc(r.name)}</b><span class="pill">${esc(st.l)}</span></div><div class="small muted">${isPro() ? 'GM' : 'Athletic director'}, ${esc(teamName(r.id))} · ${esc(st.d)}</div>
      ${xMeter(clamp(r.heat, 0, 100), 'Heat')}<p class="small">Your games against them: <b>${r.w}-${r.l}</b></p><ul class="small plainlist">${r.log.slice(0, 4).map(l => `<li><span class="muted">${l.s} wk ${l.wk}:</span> ${esc(l.txt)}</li>`).join('') || '<li class="muted">Quiet so far.</li>'}</ul>
      <div class="row gap"><button class="btn sm" data-act="xrx" data-id="${r.id}" data-v="talk" ${r.act === key ? 'disabled' : ''}>Fire back in the press</button><button class="btn sm ghost" data-act="xrx" data-id="${r.id}" data-v="peace" ${r.act === key ? 'disabled' : ''}>Clear the air</button></div></div>`; }).join('')}</div></section>`;
}
Object.assign(actions, {
  xrx(d) { const ok = rxAction(d.id, d.v); after(ok ? (d.v === 'talk' ? 'You fired back. The fans loved it; the feud heats up.' : 'You called to clear the air.') : 'Once a week.'); },
  xrxcounter() { after(rxCounter() ? 'You made your pitch. He is staying interested.' : 'Too late.'); },
});

/* ---------- game day and business (AD) ---------- */
function vXBiz() {
  const B = biz(); const off = state.phase === 'offseason'; const homes = state.games.filter(g => g.h === ME && !g.done && !g.neutral).sort((a, b) => a.wk - b.wk).slice(0, 4); const mine = state.games.filter(g => (g.h === ME || g.a === ME) && !g.done).sort((a, b) => a.wk - b.wk).slice(0, 4);
  const proj = Object.entries(XPROJ).map(([k, p]) => { const b = B.build.find(x => x.k === k); return `<tr><td><b>${esc(p.l)}</b><div class="small muted">${esc(p.d)}</div></td><td class="num">${fmM(p.cost)}</td><td>${B.proj[k] ? `<span class="pill good">Built ${B.proj[k]}</span>` : b ? `<span class="pill">${b.left} weeks left</span>` : `<button class="btn sm" data-act="xproj" data-v="${k}">Build</button>`}</td></tr>`; }).join('');
  const nm = bizNamingOffer();
  const staff = Object.entries(XSTAFF).map(([k, s]) => `<div><b>${esc(s.l)}</b><div class="small muted">${esc(s.d)}</div>${seg('xstaff', String(B.staff[k] || 1), [1, 2, 3, 4, 5].map(n => [String(n), String(n)]), `data-k="${k}"`)}<div class="small muted">${fmM(XSTAFF_PAY[B.staff[k] || 1])} a year</div></div>`).join('');
  const uni = B.uni ? `<span class="xuni" style="background:${B.uni.c1};border-color:${B.uni.c2}"><i style="background:${B.uni.c2}"></i></span> <b>${esc(B.uni.sty)}</b>` : '<span class="muted">No alternate yet.</span>';
  const f = ui.xuni || { c1: XUNI_COLS[0], c2: XUNI_COLS[4], sty: XUNI_STY[1] };
  const sw = (k) => XUNI_COLS.map(c => `<button class="xsw${f[k] === c ? ' on' : ''}" style="background:${c}" data-act="xunic" data-k="${k}" data-v="${c}" aria-label="${c}"></button>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Game day & business</div><h2 class="h2">The stadium</h2></div><p class="hint">Bank ${fmM(state.fin.balance)}. Store and suites pay out every home game.</p></div>
     <div class="tw"><table class="tbl"><thead><tr><th>Project</th><th>Cost</th><th></th></tr></thead><tbody>${proj}</tbody></table></div>
     ${B.naming && B.naming.until >= state.season ? `<p class="mt">Naming rights: <b>${esc(B.naming.co)} Field</b>, ${fmM(B.naming.fee)} a year through ${B.naming.until}.</p>` : nm ? `<div class="decision mt"><b>Naming rights offer:</b> ${esc(nm.co)} will pay ${fmM(nm.fee)} a year for ${nm.yrs} years to put its name on the stadium. Fans won't love it. <button class="btn sm" data-act="xname">Take the deal</button></div>` : ''}</section>
   <section class="card"><div class="eyebrow">Game day</div><h2 class="h3">Home games</h2>
     <p class="small">Student section: ${seg('xstud', String(B.student || 1), [['1', 'Standard'], ['2', 'Bigger'], ['3', 'Whole end zone']])} <span class="muted">A bigger student section is louder (a home-field edge) but sells fewer full-price seats.</span></p>
     ${homes.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Game</th><th>Promotion</th></tr></thead><tbody>${homes.map(g => `<tr><td>${esc(weekLabel(g.wk))} vs. ${esc(teamName(g.a))}${xNight(g) ? ' <span class="pill">Night</span>' : ''}</td><td><select data-xch="promo" data-g="${g.id}">${Object.entries(XPROMO).map(([k, p]) => `<option value="${k}" ${(B.promo[g.id] || 'none') === k ? 'selected' : ''}>${esc(p.l)}${p.cost ? ' (' + fmM(p.cost) + ')' : ''}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No home games left this season.</p>'}</section>
   <section class="card"><div class="eyebrow">Uniforms</div><h2 class="h3">Alternate uniform</h2><p>Current: ${uni}</p>
     <div class="xuniform"><div><div class="small">Main color</div><div class="xsws">${sw('c1')}</div><div class="small mt">Trim</div><div class="xsws">${sw('c2')}</div><div class="small mt">Style</div>${seg('xunis', f.sty, XUNI_STY.map(s => [s, s]))}</div>
     <div class="xunip"><span class="xjersey" style="background:${f.c1};color:${f.c2};border-color:${f.c2}">${esc(String(myAb()).slice(0, 4))}<b>7</b></span><button class="btn mt" data-act="xuniset">Unveil it</button></div></div>
     ${B.uni && mine.length ? `<p class="small mt"><b>Wear it for:</b> ${mine.map(g => `<label class="chk small"><input type="checkbox" data-xch="alt" data-g="${g.id}" ${B.alt[g.id] ? 'checked' : ''}> ${esc(weekLabel(g.wk))} ${g.h === ME ? 'vs.' : 'at'} ${esc(teamName(g.h === ME ? g.a : g.h))}</label>`).join(' ')}</p><p class="hint">Alternates get recruits and the team store buzzing. You'll see them on the field.</p>` : ''}</section>
   <section class="card"><div class="eyebrow">Team store</div><h2 class="h3">${esc(XSTORE[B.store || 0][0])}</h2><p class="small">This season: ${fmM(B.storeYtd || 0)} in sales.</p>${(B.store || 0) < 2 ? `<button class="btn sm" data-act="xstore">Upgrade to ${esc(XSTORE[(B.store || 0) + 1][0].toLowerCase())} (${fmM(XSTORE[(B.store || 0) + 1][1])})</button>` : ''}</section>
   <section class="card"><div class="eyebrow">Support staff</div><h2 class="h3">Strength and nutrition</h2><div class="xstaff">${staff}</div></section>
   <section class="card"><div class="eyebrow">Spring game</div><h2 class="h3">${B.spring && B.spring.s === state.season ? 'Spring game results' : 'The spring game'}</h2>${B.spring && B.spring.s === state.season ? `<p>${B.spring.att.toLocaleString()} fans, ${fmM(B.spring.rev)} in tickets. Final ${Math.max(...B.spring.sc)}-${Math.min(...B.spring.sc)}.</p><p class="small"><b>Standouts:</b> ${B.spring.stars.map(s => esc(s.n + ' (' + s.pos + ', ' + s.ovr + ')')).join(', ')}</p>` : off ? '<p>Open the doors: fans and recruits come for a first look at next year\'s team.</p><button class="btn" data-act="xspring">Hold the spring game</button>' : '<p class="muted">The spring game is held in the offseason.</p>'}</section>`;
}
const xNight = g => !!g && (g.night != null ? g.night : hash(String(g.id) + ':night') < 0.33);
Object.assign(actions, {
  xproj(d) { const r = bizStart(d.v); after(r === 'ok' ? 'Approved. Construction starts this week.' : r === 'money' ? 'Not enough money in the bank.' : 'Already done.'); },
  xname() { after(bizNamingTake() ? 'Deal signed.' : 'No offer right now.'); },
  xstud(d) { bizStudent(+d.v); after(); },
  xstaff(d) { bizStaff(d.k, +d.v); after(); },
  xstore() { after(bizStore((biz().store || 0) + 1) ? 'The new store is open.' : 'Not enough money in the bank.'); },
  xspring() { after(springGame() ? 'What a day. The results are in.' : 'Already held this year.'); },
  xunic(d) { ui.xuni = Object.assign({ c1: XUNI_COLS[0], c2: XUNI_COLS[4], sty: XUNI_STY[1] }, ui.xuni || {}, { [d.k]: d.v }); render(); },
  xunis(d) { ui.xuni = Object.assign({ c1: XUNI_COLS[0], c2: XUNI_COLS[4], sty: XUNI_STY[1] }, ui.xuni || {}, { sty: d.v }); render(); },
  xuniset() { const f = ui.xuni || { c1: XUNI_COLS[0], c2: XUNI_COLS[4], sty: XUNI_STY[1] }; const r = bizUniform(f); after(r === 'launch' ? 'Unveiled. The fans are talking.' : r === 'saved' ? 'Saved. You already had this season\'s uniform launch, so this one is just a new look.' : r === 'same' ? 'That is the uniform you already have.' : 'Pick the colors first.'); },
});
const XCH = {
  promo(t) { bizPromo(t.dataset.g, t.value); after(); },
  alt(t) { bizAlt(t.dataset.g, t.checked); after(); },
  goalp(t) { ui.xgoalP = t.value; },
  goalk(t) { ui.xgoalK = t.value; },
};
document.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset || !t.dataset.xch) return; const fn = XCH[t.dataset.xch]; if (fn) fn(t); });

/* ---------- camp battles and growth goals ---------- */
function vXCamp() {
  const C = campBattles(); const G = goalsStore(); const open = state.phase === 'offseason' || state.week <= 3; const name = id => { const p = P(id); return p ? `${esc(p.n)} <span class="muted small">${p.ovr} ovr, ${esc(p.cls || (p.age ? 'age ' + p.age : ''))}</span>` : '?'; };
  const bt = C && C.list.length ? C.list.map(b => `<tr><td><b>${esc(b.pos)}</b></td><td>${[b.a, b.b].map(id => b.w ? (b.w === id ? `<span class="pill good">Won the job</span> ${name(id)}` : `<span class="muted">${name(id)}</span>`) : `<button class="btn sm" data-act="xcamp" data-pos="${b.pos}" data-v="${id}" ${open ? '' : 'disabled'}>${name(id)}</button>`).join(' <span class="muted">vs.</span> ')}</td></tr>`).join('') : '<tr><td class="muted">No close battles this year. Your starters are clear.</td></tr>';
  const opts = state.roster.slice().sort((a, b) => (b.pot - b.ovr) - (a.pot - a.ovr)).slice(0, 60);
  return `<section class="card"><div class="head"><div><div class="eyebrow">${isPro() ? 'Training camp' : 'Fall camp'}</div><h2 class="h2">Position battles</h2></div><p class="hint">The closest races for a starting job. Name the winner: he moves up the depth chart and plays with confidence; the loser may grumble. ${open ? 'Decide before week 4.' : 'Camp is over for this year.'}</p></div>
    <div class="tw"><table class="tbl"><tbody>${bt}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Growth goals</div><h2 class="h2">This season's goals</h2><p class="hint">Up to three players. A goal met at season's end gives the player a bigger ceiling (+2 potential) and a head start on development.</p>
    ${G.list.length ? `<ul class="plainlist">${G.list.map(g => { const p = P(g.pid); const met = goalMet(g); return `<li><b>${esc(g.n)}</b> (${esc(g.pos)}) · ${esc(GOAL_K[g.k])} ${g.k === 'ovr' && p ? `<span class="muted small">(${p.ovr - g.base >= 0 ? '+' : ''}${p.ovr - g.base} so far)</span>` : ''} ${met ? '<span class="pill good">On track</span>' : '<span class="pill">Not yet</span>'} <button class="lnk" data-act="xgoalx" data-v="${g.pid}">remove</button></li>`; }).join('')}</ul>` : '<p class="muted">No goals set.</p>'}
    ${G.list.length < 3 ? `<div class="row gap mt"><select data-xch="goalp" aria-label="Player"><option value="">Pick a player</option>${opts.map(p => `<option value="${p.id}" ${ui.xgoalP === p.id ? 'selected' : ''}>${esc(p.n)} (${esc(p.pos)}, ${p.ovr}/${p.pot})</option>`).join('')}</select><select data-xch="goalk" aria-label="Goal">${Object.entries(GOAL_K).map(([k, l]) => `<option value="${k}" ${ui.xgoalK === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><button class="btn sm" data-act="xgoal">Set the goal</button></div>` : ''}
    ${G.hist.length ? `<p class="small mt"><b>Past seasons:</b> ${G.hist.map(h => `${h.s}: ${h.n} of ${h.of} met`).join(' · ')}</p>` : ''}</section>`;
}
Object.assign(actions, {
  xcamp(d) { after(campPick(d.pos, d.v) ? 'Decision made. The depth chart is updated.' : 'That battle is settled.'); },
  xgoal() { const pid = ui.xgoalP; const k = ui.xgoalK || 'ovr'; after(pid && goalSet(pid, k) ? 'Goal set.' : 'Pick a player (up to three, one goal each).'); },
  xgoalx(d) { goalClear(d.v); after(); },
});

/* ---------- the NFL: waivers, practice squad, preseason, incentives ---------- */
function vXNfl() {
  const N = nflx(); const L = PS(); const fa = (L.fa || []).filter(p => p.age <= 26 || p.ovr <= 64).sort((a, b) => b.pot - a.pot).slice(0, 12);
  const row = (p, btns) => `<tr><td><b>${esc(p.n)}</b> <span class="muted small">${esc(p.pos)}, age ${p.age}</span></td><td class="num">${p.ovr}</td><td class="num">${p.pot}</td><td>${btns}</td></tr>`;
  const head = '<thead><tr><th>Player</th><th>Ovr</th><th>Pot</th><th></th></tr></thead>';
  const inc = state.roster.filter(p => p.k && !p.k.rk && (p.k.apy || 0) >= 2).sort((a, b) => (b.k.apy || 0) - (a.k.apy || 0)).slice(0, 12);
  return `<section class="card"><div class="head"><div><div class="eyebrow">Waiver wire</div><h2 class="h2">Players other clubs let go</h2></div><p class="hint">Claims go by record: the worse your record, the better your chance. Roster: ${state.roster.length} of ${proMax()}.</p></div>
    ${N.wv.length ? `<div class="tw"><table class="tbl">${head}<tbody>${N.wv.map(w => row(w.p, `<span class="muted small">from ${esc(teamName(w.from))}</span> <button class="btn sm" data-act="xwv" data-v="${w.p.id}">Claim</button>${N.psq.length < PSQ_MAX && (w.p.age <= 26 || w.p.ovr <= 64) ? ` <button class="btn sm ghost" data-act="xpsq" data-v="${w.p.id}">Practice squad</button>` : ''}`)).join('')}</tbody></table></div>` : '<p class="muted">Nobody on waivers right now. Cut-down day fills the wire.</p>'}</section>
   <section class="card"><div class="head"><div><div class="eyebrow">Practice squad</div><h2 class="h2">${N.psq.length} of ${PSQ_MAX}</h2></div><p class="hint">Young players who don't count against the 53 or the cap. They improve each week, and other clubs can sign the good ones away.</p></div>
    ${N.psq.length ? `<div class="tw"><table class="tbl">${head}<tbody>${N.psq.map(p => row(p, `<button class="btn sm" data-act="xpsqup" data-v="${p.id}">Promote</button> <button class="btn sm ghost" data-act="xpsqcut" data-v="${p.id}">Release</button>`)).join('')}</tbody></table></div>` : ''}
    ${N.poached.length ? `<p class="small"><b>Signed away:</b> ${N.poached.slice(0, 5).map(x => `${esc(x.n)} (${esc(teamName(x.to))}, ${x.s})`).join(', ')}</p>` : ''}
    ${fa.length && N.psq.length < PSQ_MAX ? `<details class="mt"><summary>Free agents who qualify</summary><div class="tw"><table class="tbl">${head}<tbody>${fa.map(p => row(p, `<button class="btn sm ghost" data-act="xpsq" data-v="${p.id}">Sign to practice squad</button>`)).join('')}</tbody></table></div></details>` : ''}</section>
   ${N.pre ? `<section class="card"><div class="eyebrow">Preseason ${N.pre.s}</div><div class="tw"><table class="tbl"><tbody>${N.pre.games.map(g => `<tr><td>vs. ${esc(teamName(g.o))}</td><td class="num">${g.us}-${g.them}</td><td>${g.us > g.them ? 'W' : 'L'}</td></tr>`).join('')}</tbody></table></div><p class="small"><b>Turned heads:</b> ${N.pre.stars.map(s => esc(s.n + ' (' + s.pos + ')')).join(', ') || 'nobody in particular'}.</p></section>` : ''}
   <section class="card"><div class="eyebrow">Contract incentives</div><h2 class="h3">Pay for results</h2><p class="hint">Add up to two incentives to a contract. It lowers this season's cap number now; any incentive he earns counts against next season's cap.</p>
    <div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Cap hit</th><th>Incentives</th></tr></thead><tbody>${inc.map(p => `<tr><td>${esc(p.n)} <span class="muted small">${esc(p.pos)}</span></td><td class="num">${fmM(capHit(p))}</td><td>${(p.k.inc || []).map(i => `<span class="pill${i.paid ? ' good' : ''}">${esc(INC_K[i.k][0])} ${fmM(i.amt)}${i.paid ? ' earned' : ''}</span>`).join(' ')} ${(p.k.inc || []).length < 2 ? Object.entries(INC_K).filter(([k]) => !(p.k.inc || []).some(i => i.k === k)).map(([k, v]) => `<button class="btn sm ghost" data-act="xinc" data-p="${p.id}" data-v="${k}">+ ${esc(v[0])}</button>`).join(' ') : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}
Object.assign(actions, {
  xwv(d) { const r = wvClaim(d.v); after({ live: LIVE_ROSTER_MSG, ok: 'Claimed. He is on your roster.', full: 'Your roster is full. Cut someone first.', lost: 'Another club put in a better claim.', gone: 'He is gone.' }[r]); },
  xpsq(d) { const r = psqSign(d.v); after({ ok: 'Signed to the practice squad.', full: 'The practice squad is full.', vet: 'Too experienced for the practice squad.', gone: 'He is gone.' }[r]); },
  xpsqup(d) { const r = psqPromote(d.v); after({ live: LIVE_ROSTER_MSG, ok: 'Promoted to the 53.', full: 'Your roster is full.', gone: 'He is gone.' }[r]); },
  xpsqcut(d) { psqRelease(d.v); after('Released.'); },
  xinc(d) { after(incAdd(d.p, d.v) ? 'Incentive added. His cap number this season drops a little.' : 'That contract already has two incentives.'); },
});

/* ---------- the friends league (shared, when the game is opened from its link) ---------- */
// Everyone in a league plays their own save; each brings their team's current strength, and the league plays a
// round-robin season of head-to-head games between those teams. The league's owner plays each round.
var fl = { list: null, busy: false, msg: '', loaded: 0 };
async function flLoad(force) {
  if (!(await shareInit())) return; if (fl.busy || (!force && Date.now() - fl.loaded < 20000)) return; fl.busy = true;
  try { const snap = await share.db.collection('fleagues').orderBy('t', 'desc').limit(20).get(); const L = []; snap.forEach(d => { const v = d.data(); v.id = d.id; L.push(v); }); fl.list = L; fl.loaded = Date.now();
    const ids = new Set(); L.forEach(x => Object.keys(x.mem || {}).forEach(u => ids.add(u))); if (ids.size && share.user) Object.assign(share.names, await share.user.profiles([...ids])); } catch (e) { fl.msg = 'The friends league is not reachable right now.'; }
  fl.busy = false; render();
}
function flMyTeam() {
  if (xCareer() || !state) return null; const t = T(ME); const r = isPro() ? Math.round(55 + ((t && t.elo ? t.elo : 1500) - 1300) / 12) : Math.round(t && t.rating ? t.rating : 70);
  return { team: myName(), mode: isComm() ? 'comm' : isPro() ? (isCoach() ? 'nflcoach' : 'gm') : isCoach() ? 'coach' : 'ad', r: clamp(r, 40, 99), rec: t ? t.w + '-' + t.l : '', t: Date.now() };
}
function flRounds(L) { const ids = Object.keys(L.mem || {}).sort((a, b) => (L.mem[a].j || 0) - (L.mem[b].j || 0)); if (ids.length < 2) return []; const n = ids.length % 2 ? ids.concat([null]) : ids.slice(); const R_ = []; for (let r = 0; r < n.length - 1; r++) { const pr = []; for (let i = 0; i < n.length / 2; i++) { const a = n[i], b = n[n.length - 1 - i]; if (a && b) pr.push([a, b]); } R_.push(pr); n.splice(1, 0, n.pop()); } return R_; }
function flPlay(L) {
  const rr = flRounds(L); if (!rr.length) return null; const r = (L.res || []).length; const pairs = rr[r % rr.length];
  return pairs.map(([a, b], i) => { const A = L.mem[a], B = L.mem[b]; const h = k => hash(L.id + ':' + r + ':' + i + ':' + k); const pa = 1 / (1 + Math.pow(10, -(A.r - B.r) / 14)); const aw = h('w') < pa; const w = 17 + Math.floor(h('s') * 21), l = Math.max(0, w - 3 - Math.floor(h('m') * 18)); return [a, b, aw ? w : l, aw ? l : w]; });
}
function flTable(L) { const S = {}; Object.keys(L.mem || {}).forEach(u => { S[u] = { u, w: 0, l: 0, pf: 0, pa: 0 }; }); (L.res || []).forEach(rd => rd.g.forEach(([a, b, sa, sb]) => { if (!S[a] || !S[b]) return; S[a].pf += sa; S[a].pa += sb; S[b].pf += sb; S[b].pa += sa; if (sa > sb) { S[a].w++; S[b].l++; } else { S[b].w++; S[a].l++; } })); return Object.values(S).sort((x, y) => y.w - x.w || (y.pf - y.pa) - (x.pf - x.pa)); }
function vXFriends() {
  if (!share.tried) shareKick(); if (share.tried && !share.ok) return `<section class="card"><div class="eyebrow">Friends league</div><h2 class="h2">Play against your friends</h2><p class="muted">Friends leagues work when the game is opened from its shared link while signed in.</p></section>`;
  if (!fl.list && !fl.busy) flLoad(); const me = flMyTeam(); const uid = share.uid;
  const card = L => { const mine = L.mem && L.mem[uid]; const tb = flTable(L); const owner = L.by === uid; const rounds = flRounds(L).length; const done = (L.res || []).length;
    return `<div class="xfl"><div class="row between"><b>${esc(L.name)}</b><span class="small muted">${Object.keys(L.mem || {}).length} teams · round ${done}${rounds ? ' of ' + rounds : ''}</span></div>
     <div class="tw"><table class="tbl"><thead><tr><th>Team</th><th>Who</th><th>Strength</th><th>W-L</th><th>PF-PA</th></tr></thead><tbody>${tb.map(s => { const m = L.mem[s.u]; return `<tr class="${s.u === uid ? 'me' : ''}"><td>${esc(m.team)}</td><td class="small">${esc(shareWho(s.u))}</td><td class="num">${m.r}</td><td class="num">${s.w}-${s.l}</td><td class="num">${s.pf}-${s.pa}</td></tr>`; }).join('')}</tbody></table></div>
     ${(L.res || []).slice(-1).map(rd => `<p class="small"><b>Round ${rd.r + 1}:</b> ${rd.g.map(([a, b, sa, sb]) => `${esc(L.mem[a] ? L.mem[a].team : '?')} ${sa}, ${esc(L.mem[b] ? L.mem[b].team : '?')} ${sb}`).join(' · ')}</p>`).join('')}
     <div class="row gap">${me ? `<button class="btn sm${mine ? ' ghost' : ''}" data-act="xfljoin" data-id="${L.id}">${mine ? 'Update my team (' + esc(me.team) + ', ' + me.r + ')' : 'Join with ' + esc(me.team)}</button>` : ''}${owner && done < rounds * 2 && Object.keys(L.mem || {}).length >= 2 ? `<button class="btn sm primary" data-act="xflplay" data-id="${L.id}">Play the next round</button>` : ''}</div></div>`; };
  return `<section class="card"><div class="head"><div><div class="eyebrow">Friends league</div><h2 class="h2">Your team against theirs</h2></div><p class="hint">Each person plays their own career and enters their current team. Strength comes from your team's rating; update it as your team gets better. The league's creator plays the rounds.</p></div>
    ${me ? `<div class="row gap"><input id="xflname" class="inp" maxlength="40" placeholder="League name"><button class="btn" data-act="xflnew">Start a league</button><button class="btn ghost sm" data-act="xflre">Refresh</button></div>` : ''}${fl.msg ? `<p class="small">${esc(fl.msg)}</p>` : ''}
    <div class="xflgrid mt">${fl.list ? (fl.list.length ? fl.list.map(card).join('') : '<p class="muted">No leagues yet. Start one and share the link.</p>') : '<p class="muted">Loading leagues...</p>'}</div></section>`;
}
Object.assign(actions, {
  async xflnew() { const el = document.getElementById('xflname'); const name = (el && el.value.trim()) || myName() + ' league'; if (!(await shareInit())) return; const me = flMyTeam(); try { await share.db.collection('fleagues').add({ name: name.slice(0, 40), by: share.uid, t: Date.now(), mem: { [share.uid]: Object.assign({ j: Date.now() }, me) }, res: [] }); fl.msg = 'League started. Share the game link with your friends.'; } catch (e) { fl.msg = 'Could not start the league.'; } flLoad(true); },
  async xfljoin(d) { if (!(await shareInit())) return; const me = flMyTeam(); const L = (fl.list || []).find(x => x.id === d.id); if (!L || !me) return; try { const old = L.mem && L.mem[share.uid]; await share.db.doc('fleagues/' + L.id).update({ ['mem.' + share.uid]: Object.assign({ j: old ? old.j : Date.now() }, me) }); fl.msg = old ? 'Your team is updated.' : 'You are in.'; } catch (e) { fl.msg = 'Could not update the league.'; } flLoad(true); },
  async xflplay(d) { if (!(await shareInit())) return; const L = (fl.list || []).find(x => x.id === d.id); if (!L || L.by !== share.uid) return; const g = flPlay(L); if (!g) return; try { await share.db.doc('fleagues/' + L.id).update({ res: (L.res || []).concat([{ r: (L.res || []).length, g, t: Date.now() }]) }); fl.msg = 'Round played.'; } catch (e) { fl.msg = 'Could not play the round.'; } flLoad(true); },
  xflre() { flLoad(true); },
});

/* ---------- roster import (Save file tab) ---------- */
const _xvFile = vFile;
vFile = function () { const base = _xvFile(); if (isComm()) return base; return base + `<section class="card"><div class="eyebrow">Import a roster</div><h2 class="h3">Bring in your own players</h2><p class="hint">Paste lines from a spreadsheet: name, position, rating, then optionally ${isPro() ? 'age' : 'class (Fr, So, Jr, Sr)'}, jersey number and potential. Example: <code>Sam Carter, QB, 82, ${isPro() ? '26' : 'Jr'}, 7, 88</code></p>
  <textarea id="xroster" class="inp" rows="6" style="width:100%" placeholder="Name, Pos, Rating, ${isPro() ? 'Age' : 'Class'}, Number, Potential"></textarea>${ui.ximpPrev ? ximpPrevHTML(ui.ximpPrev) : `<div class="row gap mt"><button class="btn" data-act="ximpprev" data-v="add">Add these players...</button><button class="btn ghost" data-act="ximpprev" data-v="replace">Replace the roster with these...</button></div>`}${ui.ximp ? `<p class="small mt">${esc(ui.ximp)}</p>` : ''}</section>`; };
// the check before an import lands
function ximpPrevHTML(v) {
  const pos = POS_ORDER.filter(p => v.byPos[p]).map(p => `${p} ${v.byPos[p]}`).join(' · ') || 'none';
  const cap = v.capAdd != null ? ` Their contracts add about ${fmM(v.capAdd)}; cap room after: <b>${fmM(v.roomAfter)}</b>${v.roomAfter < 0 ? ' (over the cap: you would need to get under it before the next game)' : ''}.` : ` Roster size after: <b>${v.sizeAfter}</b>.`;
  return `<div class="decision mt"><b>${v.mode === 'replace' ? 'Replace the whole roster' : 'Add to the roster'}: ${v.n} player${v.n === 1 ? '' : 's'} found</b><p class="small">By position: ${esc(pos)}.${v.bad.length ? ` Skipped line${v.bad.length > 1 ? 's' : ''} ${v.bad.slice(0, 10).join(', ')} (each line needs a name, a position and a rating from 30 to 99).` : ''}${cap}</p>
   <div class="row gap">${v.n ? `<button class="btn ${v.mode === 'replace' ? 'danger' : 'primary'}" data-act="ximport" data-v="${v.mode}">${v.mode === 'replace' ? 'Confirm: replace the roster' : 'Add them'}</button>` : ''}<button class="btn ghost" data-act="ximpno">Back</button></div></div>`;
}
Object.assign(actions, {
  ximpprev(d) { const t = document.getElementById('xroster'); ui.ximpText = t ? t.value : ''; ui.ximpPrev = rosterPreview(ui.ximpText, d.v === 'replace' ? 'replace' : 'add'); ui.ximp = ''; render(); const t2 = document.getElementById('xroster'); if (t2) t2.value = ui.ximpText || ''; },
  ximpno() { const t = document.getElementById('xroster'); ui.ximpText = t ? t.value : ui.ximpText; ui.ximpPrev = null; render(); const t2 = document.getElementById('xroster'); if (t2) t2.value = ui.ximpText || ''; },
  ximportask() { const t = document.getElementById('xroster'); ui.ximpText = t ? t.value : ''; ui.confirm = 'ximport'; render(); const t2 = document.getElementById('xroster'); if (t2) t2.value = ui.ximpText || ''; },
  ximport(d) { const t = document.getElementById('xroster'); const txt = t && t.value ? t.value : ui.ximpText || ''; ui.ximpPrev = null; const r = rosterImport(txt, d.v === 'replace' ? 'replace' : 'add'); ui.confirm = null; ui.ximpText = ''; ui.ximp = r.err ? r.err : `${r.added} player${r.added === 1 ? '' : 's'} imported.${r.bad.length ? ' Skipped line' + (r.bad.length > 1 ? 's ' : ' ') + r.bad.slice(0, 8).join(', ') + '.' : ''}`; after(); },
});

/* ---------- live games: two-point tries and onside kicks ---------- */
function xLiveCtl(sim) {
  if (!sim || sim.done || isComm()) return ''; const m = sim.twoPt || 'kick';
  return `<span class="xlive small">After a touchdown: ${seg('xtwo', m, [['kick', 'Kick'], ['two', 'Go for two'], ['chart', 'Use the chart']])} <button class="btn ghost sm${sim.onsideArm ? ' on' : ''}" data-act="xonside" aria-pressed="${!!sim.onsideArm}">${sim.onsideArm ? 'Onside kick: armed' : 'Onside kick after our next score'}</button></span>`;
}
Object.assign(actions, {
  xtwo(d) { if (!live.sim) return; live.sim.twoPt = d.v; renderLive(); },
  xonside() { if (!live.sim) return; live.sim.onsideArm = !live.sim.onsideArm; renderLive(); },
});

/* ---------- Player Career: life, the job battle, combine drills, a new player in the same world ---------- */
function vXLife() {
  if (!cs) return ''; const L = cxLife(); const y = cs.year; const did = L.did[y] || {}; const b = cxBattle(); const bank = cs.p.bank || 0;
  const acts = Object.entries(CX_LIFE).filter(([k, a]) => !(a.once && L.found) && !(a.need && !L.found)).map(([k, a]) => { const cost = k === 'gala' ? Math.max(10000, Math.round(bank * 0.1)) : a.cost || 0; return `<div class="xlife"><b>${esc(a.l)}</b><div class="small muted">${esc(a.d)}</div><button class="btn sm mt" data-act="xlife" data-v="${k}" ${did[k] || cost > bank || cs.phase === 'retired' ? 'disabled' : ''}>${did[k] ? 'Done this year' : cost ? 'Do it (' + money(cost) + ')' : 'Do it'}</button></div>`; }).join('');
  const bt = b ? `<section class="card"><div class="eyebrow">The job battle</div><h2 class="h2">${b.chase ? 'Chasing' : 'Holding off'} ${esc(b.n)}</h2><p>${b.chase ? `${esc(b.n)} (${b.ovr}) has the job you want. Outwork him in practice and outplay him on Saturdays.` : `${esc(b.n)} (${b.ovr}) wants your spot. Keep your edge.`} ${b.won ? '<span class="pill good">You won the job</span>' : ''}</p>
     ${xMeter(clamp(50 + b.score * 2.5, 0, 100), 'Battle')}<div class="row gap mt">${Object.entries(CX_BT).map(([k, v]) => `<button class="btn sm" data-act="xbt" data-v="${k}" ${b.wk === cs.year + ':' + cs.week ? 'disabled' : ''}>${esc(v[0])}</button>`).join('')}</div><p class="hint">One extra session a week. Extra reps leave you a little tired for the game.</p>${b.log.length ? `<ul class="small plainlist">${b.log.slice(0, 6).map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</section>` : '';
  const reel = cs.x && cs.x.reel && cs.x.reel.length ? `<section class="card"><div class="eyebrow">Career reel</div><h2 class="h3">Your best plays</h2><p>Your ${Math.min(10, cs.x.reel.length)} best snaps so far, from every season, counted down on the field.</p><button class="btn" data-act="xcreel">Watch the reel</button></section>` : '';
  return `${bt}${reel}<section class="card"><div class="head"><div><div class="eyebrow">Life off the field</div><h2 class="h2">${esc(cName(cs.p))}</h2></div><p class="hint">Bank: ${money(bank)}. Each of these once a year.</p></div>
     <p><b>Family:</b> ${L.fam.map(f => `${esc(f.r)} ${esc(f.n)}`).join(' · ')}${L.found ? ` · <b>${esc(L.found.n)}</b> (since ${L.found.y}, ${money(L.give)} given)` : ''}</p>
     <div class="xlifegrid">${acts}</div>${L.log.length ? `<ul class="small plainlist mt">${L.log.slice(0, 8).map(l => `<li><span class="muted">${l.y}:</span> ${esc(l.txt)}</li>`).join('')}</ul>` : ''}</section>${xLegendsHTML()}`;
}
function xLegendsHTML() { const X_ = cs && cs.x; const L = X_ && X_.legends; if (!L || !L.length) return ''; return `<section class="card"><div class="eyebrow">Legends of this world</div><h2 class="h3">The players who came before</h2><ul class="plainlist">${L.slice(0, 12).map(l => `<li><b>${esc(l.n)}</b> <span class="muted small">${esc(l.pos)} #${l.num} · ${l.y0}–${l.y1}${l.col.length ? ' · ' + l.col.map(t => esc(cTeamName(t))).join(', ') : ''}${l.nfl.length ? ' · ' + l.nfl.map(t => esc(nflName(t))).join(', ') : ''}</span><div class="small">${esc(l.v)}${l.hof >= 75 ? ' · Hall of Fame' : ''}${l.aw.length ? ' · ' + esc(l.aw.slice(0, 4).join(', ')) : ''}</div></li>`).join('')}</ul></section>`; }
Object.assign(actions, {
  xcreel() { hlOpen('Career reel', cName(cs.p), () => pfCareerReel()); },
  xlife(d) { cAfter(cxLifeAct(d.v) ? 'Done.' : 'Not possible right now.'); },
  xbt(d) { cAfter(cxBattleAct(d.v) ? 'Done. The coaches noticed.' : 'One extra session a week.'); },
  xnewworld() { const W = cWorldSnap(); if (!W) return; const m = typeof cMeta === 'function' ? cMeta() : {}; let sl = null; for (let i = 1; i <= 5; i++) if (!m[i] && !lsGet(CSLOT_KEY(i))) { sl = i; break; } cui.form = defaultForm(sl || cslot); cui.form.world = W; cui.tab = 'saves'; cui.flash = `A new player in the same world: ${W.year}, with ${W.legends[0].n} in the record books.${sl ? '' : ' Every save slot is full, so this one replaces the career in slot ' + cslot + '.'}`; render(); window.scrollTo(0, 0); },
});
// the retired screen gets a way to start the next generation; the records page shows the legends
const _xRet = vCRetiredBase; vCRetiredBase = function () { return _xRet() + `<section class="card next"><div class="eyebrow">The next generation</div><h2 class="h3">A new player in this world</h2><p>Start a new player in ${cs.year + 1}. The record books, the league's history and ${esc(cName(cs.p))}'s legacy stay; the fans remember him.</p><button class="btn primary" data-act="xnewworld">Start a new player here</button></section>`; };
const _xRec = vCRecords; vCRecords = function () { return xLegendsHTML() + _xRec(); };
// combine drills as mini-games
const XDRILL = {
  forty: { l: '40-yard dash', how: 'Tap GO (or press the space bar) as fast as you can for 4 seconds.' },
  bench: { l: 'Bench press', how: 'Stop the bar in the green zone. Five reps.' },
  pos: { l: 'Position drills', how: 'Hit the cone that lights up, as fast as you can. Six cones.' },
  talk: { l: 'Team interviews', how: 'Three questions from a coaching staff.' },
};
const XQ = [['Third and 2, they show a single-high safety. Where does the ball go?', ['A run at the light side', 'A hail mary', 'Punt'], 0], ['What beats Cover 2 deep?', ['A seam between the safeties', 'A screen', 'A QB sneak'], 0], ['A defense shows blitz with six. You?', ['Find the hot route', 'Hold the ball', 'Throw it away every time'], 0], ['Two-minute drill, no timeouts. After a catch in bounds?', ['Hurry to the line and spike or snap', 'Huddle up', 'Call a run'], 0], ['A teammate is late to meetings again. You?', ['Talk to him first, man to man', 'Tell the media', 'Ignore it'], 0], ['Your coach changes your role. You?', ['Ask what he needs and go to work', 'Demand a trade', 'Sulk'], 0]];
const _xComb = combineHTML; combineHTML = function () { return _xComb().replace(/data-act="ccomb" data-k="(\w+)"( data-pro="1")?/g, (m, k, pro) => `data-act="xdrill" data-k="${k}"${pro ? ' data-pro="1"' : ''}`); };
var xd = null;
function xDrillOpen(k, pro) {
  const D = XDRILL[k]; if (!D) return; xd = { k, pro, t0: 0, n: 0, reps: [], hits: [], q: 0, ok: 0, done: false };
  openModal(`<div class="eyebrow">NFL Combine${pro ? ' · pro day' : ''}</div><h2 class="h2">${esc(D.l)}</h2><p>${esc(D.how)}</p><div id="xdrill" class="xdrill"></div><div class="row gap mt" id="xdctl"><button class="btn primary" data-act="xdgo">Start</button><button class="btn ghost" data-act="close">Not now</button></div>`, D.l);
}
function xDrillFinish(perf) { if (!xd || xd.done) return; xd.done = true; const r = runDrillX(xd.k, perf, xd.pro); cSave(); const el = document.getElementById('xdrill'); if (el) el.innerHTML = `<p class="big">${r ? esc(drillShow(xd.k, r.v)) : 'Done'}</p><p class="small muted">How you did: ${Math.round(perf * 100)}%.</p>`; const c = document.getElementById('xdctl'); if (c) c.innerHTML = '<button class="btn primary" data-act="close">Back to the combine</button>'; render(); }
Object.assign(actions, {
  xdrill(d) { xDrillOpen(d.k, d.pro === '1'); },
  xdgo() {
    if (!xd || xd.t0) return; const el = document.getElementById('xdrill'); const c = document.getElementById('xdctl'); xd.t0 = performance.now();
    if (xd.k === 'forty') { el.innerHTML = '<button class="btn primary xdbig" data-act="xdtap">GO</button><p class="small" id="xdn">0 taps</p>'; c.innerHTML = ''; const key = e => { if (e.code === 'Space' && xd && !xd.done) { e.preventDefault(); actions.xdtap(); } }; document.addEventListener('keydown', key); setTimeout(() => { document.removeEventListener('keydown', key); xDrillFinish(clamp((xd.n - 10) / 26, 0, 1)); }, 4000); }
    else if (xd.k === 'bench') { el.innerHTML = '<div class="xdbar"><i class="z"></i><i class="m" id="xdm"></i></div><button class="btn primary mt" data-act="xdstop">Stop</button><p class="small" id="xdn">Rep 1 of 5</p>'; c.innerHTML = ''; const tick = () => { if (!xd || xd.done || xd.k !== 'bench') return; const m = document.getElementById('xdm'); if (!m) return; const t = (performance.now() - xd.t0) / 1000; xd.pos = (Math.sin(t * (2.6 + xd.reps.length * 0.5)) + 1) / 2; m.style.left = (xd.pos * 96) + '%'; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
    else if (xd.k === 'pos') { el.innerHTML = '<div class="xdcones">' + [0, 1, 2, 3, 4, 5].map(i => `<button class="xdcone" data-act="xdcone" data-v="${i}" aria-label="Cone ${i + 1}"></button>`).join('') + '</div><p class="small" id="xdn">Cone 1 of 6</p>'; c.innerHTML = ''; xDrillCone(); }
    else { c.innerHTML = ''; xDrillQ(); }
  },
  xdtap() { if (!xd || xd.done) return; xd.n++; const n = document.getElementById('xdn'); if (n) n.textContent = xd.n + ' taps'; },
  xdstop() { if (!xd || xd.done) return; const acc = 1 - Math.min(1, Math.abs((xd.pos || 0) - 0.5) / 0.5); xd.reps.push(acc); const n = document.getElementById('xdn'); if (n) n.textContent = `Rep ${xd.reps.length + 1} of 5 · last: ${Math.round(acc * 100)}%`; if (xd.reps.length >= 5) xDrillFinish(xd.reps.reduce((a, b) => a + b, 0) / 5); },
  xdcone(d) { if (!xd || xd.done || +d.v !== xd.lit) return; xd.hits.push(performance.now() - xd.litT); const n = document.getElementById('xdn'); if (xd.hits.length >= 6) { const avg = xd.hits.reduce((a, b) => a + b, 0) / 6; xDrillFinish(clamp((900 - avg) / 600, 0, 1)); return; } if (n) n.textContent = `Cone ${xd.hits.length + 1} of 6`; xDrillCone(); },
  xdans(d) { if (!xd || xd.done) return; if (+d.v === 0) xd.ok++; xd.q++; if (xd.q >= 3) xDrillFinish(xd.ok / 3); else xDrillQ(); },
});
function xDrillCone() { const cones = document.querySelectorAll('.xdcone'); cones.forEach(c => c.classList.remove('lit')); let i = Math.floor(Math.random() * 6); if (i === xd.lit) i = (i + 1) % 6; xd.lit = i; setTimeout(() => { if (!xd || xd.done) return; xd.litT = performance.now(); const c = document.querySelectorAll('.xdcone')[i]; if (c) c.classList.add('lit'); }, 300 + Math.random() * 600); }
function xDrillQ() { const el = document.getElementById('xdrill'); const pool = XQ.slice(); const q = pool[(xd.q * 2 + Math.floor(Math.random() * 2)) % pool.length]; const order = [0, 1, 2].sort(() => Math.random() - 0.5); el.innerHTML = `<p><b>Question ${xd.q + 1} of 3.</b> ${esc(q[0])}</p><div class="evopts">${order.map(i => `<button class="evopt" data-act="xdans" data-v="${i}">${esc(q[1][i])}</button>`).join('')}</div>`; }

/* ---------- Commissioner of the NFL: expansion and contraction ---------- */
const _xCmLeague = vCmLeague;
vCmLeague = function () { const base = _xCmLeague(); if (!isPro()) return base; return base + xExpHTML(); };
const XEXP_COLS = ['#0b3d91', '#8b0000', '#1b5e20', '#4a148c', '#e65100', '#263238', '#004d40', '#b71c1c', '#00a3e0', '#d4af37', '#111111', '#ffffff', '#ff6a13', '#7c878e'];
function xExpHTML() {
  const open = nflxOpen(); const E = state.lgx || { add: [], gone: [], log: [] }; const f = ui.xexp || { conf: 'AFC', div: 'East', c1: XEXP_COLS[0], c2: XEXP_COLS[11] };
  const opt = (list, cur) => list.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v}</option>`).join('');
  const sw = k => XEXP_COLS.map(c => `<button class="xsw${f[k] === c ? ' on' : ''}" style="background:${c}" data-act="xexpc" data-k="${k}" data-v="${c}" aria-label="${c}"></button>`).join('');
  const divs = ['AFC', 'NFC'].map(cf => `<div><b>${cf}</b>${NFL_DIVS.map(dv => { const ts = NFL.filter(t => t.conf === cf && t.div === dv); return `<div class="small mt"><span class="muted">${dv} (${ts.length})</span><ul class="plainlist">${ts.map(t => `<li>${esc(teamName(t.id))}${t.id !== ME && open ? (ui.confirm === 'fold:' + t.id ? ` <button class="btn danger sm" data-act="xfold" data-v="${t.id}">Confirm: fold</button>` : ` <button class="lnk" data-act="xfoldask" data-v="${t.id}">fold</button>`) : ''}</li>`).join('')}</ul></div>`; }).join('')}</div>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">League size</div><h2 class="h2">Expansion and contraction</h2></div><p class="hint">The NFL has ${NFL.length} clubs. Add as many as you like or fold clubs, in the offseason before the draft. New clubs are stocked by an expansion draft and pick first in the next draft. Each conference needs at least 8 clubs.</p></div>
    ${open ? `<div class="xexp"><div class="row gap"><input id="xexpcity" class="inp" maxlength="24" placeholder="City" value="${esc(f.city || '')}"><input id="xexpnick" class="inp" maxlength="20" placeholder="Team name" value="${esc(f.nick || '')}"><select data-xch="expconf">${opt(['AFC', 'NFC'], f.conf)}</select><select data-xch="expdiv">${opt(NFL_DIVS, f.div)}</select></div>
     <div class="small mt">Main color</div><div class="xsws">${sw('c1')}</div><div class="small mt">Second color</div><div class="xsws">${sw('c2')}</div><button class="btn primary mt" data-act="xexpgo">Add the club and hold the expansion draft</button></div>` : '<p class="muted">Changes to the league\'s size open in the offseason, before the draft.</p>'}
    <div class="xexpdivs mt">${divs}</div>
    ${E.log && E.log.length ? `<div class="eyebrow mt">History</div><ul class="plainlist small">${E.log.slice(0, 10).map(l => `<li>${l.s}: ${l.k === 'add' ? `the ${esc(l.name)} join (expansion draft: ${(l.picks || []).slice(0, 4).map(p => esc(p.n + ', ' + p.pos)).join('; ')}${(l.picks || []).length > 4 ? '...' : ''})` : `the ${esc(l.name)} fold`}</li>`).join('')}</ul>` : ''}</section>`;
}
Object.assign(XCH, { expconf(t) { ui.xexp = Object.assign(xExpForm(), { conf: t.value }); }, expdiv(t) { ui.xexp = Object.assign(xExpForm(), { div: t.value }); } });
function xExpForm() { const f = Object.assign({ conf: 'AFC', div: 'East', c1: XEXP_COLS[0], c2: XEXP_COLS[11] }, ui.xexp || {}); const c = document.getElementById('xexpcity'), n = document.getElementById('xexpnick'); if (c) f.city = c.value; if (n) f.nick = n.value; return f; }
Object.assign(actions, {
  xexpc(d) { ui.xexp = Object.assign(xExpForm(), { [d.k]: d.v }); render(); },
  xexpgo() { const f = xExpForm(); ui.xexp = f; const r = nflExpand(f); if (r.ok) ui.xexp = null; after(r.ok ? `Welcome to the league. ${r.picks.length} players taken in the expansion draft.${r.warn ? ' ' + r.warn : ''}` : r.err); },
  xfoldask(d) { ui.confirm = 'fold:' + d.v; render(); },
  xfold(d) { ui.confirm = null; const r = nflFold(d.v); after(r.ok ? `The club has folded.${nflOdd() ? ' ' + NFL_ODD_MSG() : ''}` : r.err); },
});

