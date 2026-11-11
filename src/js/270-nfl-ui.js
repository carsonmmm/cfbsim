/* ===================== NFL FRONT OFFICE (interface) =====================
 * Views and actions for the NFL: the GM's desk in AD mode, and an NFL coach's views in Coach
 * mode. Everything here renders from state; the engine lives in pro.js. */
const PRO_TABS = [['office', 'Office'], ['career', 'My career'], ['schedule', 'Schedule'], ['roster', 'Roster'], ['depth', 'Depth chart'], ['staff', 'Staff'], ['cap', 'Contracts & cap'], ['fa', 'Free agency'], ['trades', 'Trades'], ['front', 'Front office'], ['draft', 'Draft board'], ['standings', 'Standings'], ['league', 'Around the league'], ['lghist', 'League history'], ['history', 'History'], ['records', 'Records'], ['off', 'Offseason'], ['file', 'Save file'], ['settings', 'Settings']];
const PRO_GROUPS = [['Season', ['office', 'schedule', 'standings', 'league', 'lghist']], ['Team', ['roster', 'depth', 'staff', 'front']], ['Front office', ['cap', 'fa', 'trades', 'draft']], ['Career', ['career', 'off', 'history', 'records', 'file', 'settings']]];
const PRO_MNAV = [['office', 'Office', 'home'], ['schedule', 'Schedule', 'cal'], ['roster', 'Roster', 'users'], ['draft', 'Draft', 'star']];
function proTabVisible(k) {
  if (k === 'off') return state.phase === 'offseason';
  if (typeof isOwner === 'function' && isOwner()) { const x = xTabVis(k); if (x != null) return x; if (k === 'history') return true; return k !== 'nflx' || !ownHands(); }
  if (isCoach()) return !['cap', 'fa', 'trades'].includes(k);
  return k !== 'front';
}
const curTabs = () => (isComm() ? commTabList() : isPro() ? PRO_TABS : TABS);
const curGroups = () => (isComm() ? commGroups() : isPro() ? PRO_GROUPS : TAB_GROUPS);
const curMnav = () => (isComm() ? [['office', 'Office', 'home'], ['cdisc', 'Discipline', 'users'], ['cmoney', 'Money', 'star'], ['standings', 'Standings', 'grid']] : isPro() ? (isOwner() ? OWN_MNAV : PRO_MNAV) : MNAV);
const fmS = v => (v < 0 ? '−' : '') + fmM(Math.abs(v));
const capCls = v => (v >= 0 ? 'pos' : 'neg');
const proSecWord = v => (v >= 75 ? 'Secure' : v >= 55 ? 'Steady' : v >= 35 ? 'Uneasy' : 'Hot seat');
function proSeedTxt(id) { const s = proSeedOf(id); return s ? `No. ${s} seed` : ''; }
function proStandTxt(id) { const t = T(id); const d = proDivStand(t.conf, t.div); const i = d.findIndex(x => x.id === id); return `${['1st', '2nd', '3rd', '4th'][i]} in the ${t.conf} ${t.div}`; }

/* ---------- header ---------- */
function proPrimaryLabel() {
  if (state.gameOver) return 'Find a new job';
  const ph = state.phase;
  if (ph === 'offseason') { const o = PS().off; return `Offseason: ${proStepLabels()[o ? o.step : 0]}`; }
  const g = proMyGame(state.week);
  if (state.week <= 18) return g ? `Quick sim Week ${state.week}: ${siteOf(g)} ${nflNick(oppOf(g))}` : `Sim Week ${state.week} (bye)`;
  const nm = NFL_PO_NAME[state.week] || 'Postseason';
  return g ? `Quick sim the ${g.name}` : `Sim the ${nm}`;
}
function proHeaderHTML() {
  const L = PS(); const m = T(ME); const nm = m.nick || myName(); const coach = isCoach();
  const wl = state.phase === 'offseason' ? 'Offseason' : proWeekLabel(state.week);
  const inSeason = state.phase !== 'offseason' && !state.gameOver; const mgNow = proMyGame(state.week);
  const own = isOwner(); const badge = coach ? state.co.role : own ? 'OWN' : 'GM';
  const sub = coach ? `${esc(state.co.name)}, ${esc(roleTitle(state.co.role))}` : own ? `${esc(OWN().name)}, Owner` : `The ${esc(nm)} Front Office`;
  const sec = coach ? state.co.sec : own ? state.meters.fan : (L.gm ? L.gm.sec : 60);
  return `<div class="brand"><div class="wm${nm.length > 14 ? ' long' : ''}" data-badge="${badge}"><span class="wmu">${esc(nm.toUpperCase())}</span><span class="wmn">${esc(nm)}</span><span class="wmt">${sub}</span></div><div class="sub">${esc(m.city || '')} · NFL · ${coach ? 'Coaching staff' : own ? 'Owner\'s suite' : 'Front office'} · Slot ${slot}<span class="savew"> · <span class="savest">${esc(saveStateTxt())}</span></span></div></div>
  <div class="board">
    <div class="cell"><span class="k">Season</span><span class="v">${state.season}</span></div>
    <div class="cell wide"><span class="k">Calendar</span><span class="v sm">${esc(wl)}</span></div>
    <div class="cell"><span class="k">Record</span><span class="v">${m.w}-${m.l}</span><span class="s">${m.dw}-${m.dl} ${esc(m.div)}</span></div>
    ${coach ? `<div class="cell"><span class="k">Standing</span><span class="v sm">${esc(proSeedTxt(ME) || (m.w + m.l ? proStandTxt(ME).replace(/ in the .*/, '') + ' ' + m.div : '—'))}</span></div>` : own ? `<div class="cell"><span class="k">Club value</span><span class="v sm">${fmO(OWN().val)}</span><span class="s">${fmMs(OWN().bank)} in the bank</span></div>` : `<div class="cell"><span class="k">Cap space</span><span class="v sm ${capCls(capRoom(ME))}">${fmS(capRoom(ME))}</span></div>`}
    <div class="cell"><span class="k">${coach ? 'Job security' : own ? 'Fans' : 'Owner'}</span><span class="v">${sec}</span><span class="s">${own ? ownFanWord(sec) : proSecWord(sec)}</span></div>
  </div>
  <div class="acts">${toolsHTML()}
    ${state.gameOver ? `<div class="row gap"><button class="btn primary" data-act="jobsopen">${esc(proPrimaryLabel())}</button></div>` : liveBusy() ? `<div class="row gap"><button class="btn primary" data-act="liveresume">Resume live game · ${esc(liveScoreText())}</button></div>` : `<div class="row gap">${inSeason && mgNow ? `<button class="btn watch" data-act="live">${coach ? 'Coach it live' : 'Watch live'}</button>` : ''}<button class="btn primary" data-act="primary">${esc(proPrimaryLabel())}</button></div>`}
    ${!state.gameOver && !liveBusy() ? `<details class="simmenu"><summary>More sim options</summary><div class="menu">
      ${state.phase !== 'offseason' ? '<button data-act="simdec">Sim to the next decision</button>' : ''}${state.phase === 'regular' ? '<button data-act="simloss">Sim to next loss</button><button data-act="simreg">Sim to end of regular season</button>' : ''}
      ${inSeason ? '<button data-act="simpost">Sim to the offseason</button>' : ''}
      <div class="mlabel">Sim whole seasons, offseasons included${coach ? '' : ' (your automation settings apply)'}</div>
      <div class="yrs">${[1, 3, 5, 10].map(n => `<button data-act="simyears" data-n="${n}">${n} ${n === 1 ? 'season' : 'seasons'}</button>`).join('')}</div>
    </div></details>` : ''}
  </div>`;
}

/* ---------- office ---------- */
function proNextCard() {
  const ms = michStrength(); const nx = state.phase !== 'offseason' ? mGames().find(g => !g.done) : null;
  if (state.gameOver) return `<section class="card next"><div class="eyebrow">Out of a job</div><h2 class="h2">You've been let go</h2><p class="muted">${esc(state.gameOver.reason || '')}</p><div class="row gap"><button class="btn primary" data-act="jobsopen">See open jobs</button><button class="btn ghost" data-act="tab" data-tab="file">Load or start a career</button></div></section>`;
  if (state.phase === 'offseason') { return `<section class="card next"><div class="eyebrow">Offseason</div><h2 class="h2">Build the ${state.season + 1} ${esc(nflNick(ME))}</h2>${offChecklist()}<button class="btn primary" data-act="tab" data-tab="off">Open the offseason desk</button></section>`; }
  if (!nx || nx.wk !== state.week) {
    if (state.week <= 18) return `<section class="card next"><div class="eyebrow">${esc(proWeekLabel(state.week))}</div><h2 class="h2">Bye week</h2><p class="muted">No game this week. ${nx ? `Next: ${siteOf(nx)} ${esc(teamName(oppOf(nx)))} in ${esc(nflWeekLabel(nx.wk))}.` : ''}</p><button class="btn primary" data-act="primary">${esc(proPrimaryLabel())}</button></section>`;
    return `<section class="card next"><div class="eyebrow">${esc(proWeekLabel(state.week))}</div><h2 class="h2">${proAlive(ME) ? 'Waiting on the next round' : `The ${esc(nflNick(ME))}' season is over`}</h2><p class="muted">The rest of the playoffs are still being played.</p><button class="btn primary" data-act="primary">${esc(proPrimaryLabel())}</button></section>`;
  }
  const opp = oppOf(nx); const p = mWinProb(nx); const os = strength(opp);
  return `<section class="card next">
    <div class="eyebrow">${esc(proWeekLabel(nx.wk))}${nx.name ? ' · ' + esc(nx.name) : nx.div ? ' · Division game' : ''}</div>
    <div class="matchup"><div class="side">${tchip(ME, { rec: true })}</div><div class="at">${siteOf(nx)}</div><div class="side">${tchip(opp, { rec: true })}</div></div>
    <div class="wp"><div class="wpbar"><i style="width:${Math.round(p * 100)}%"></i></div><div class="wpl"><span>${esc(nflNick(ME))} win chance <b>${Math.round(p * 100)}%</b></span><span>${esc(nflNick(opp))} ${100 - Math.round(p * 100)}%</span></div></div>
    <table class="mini"><tr><th></th><th>OFF</th><th>DEF</th><th>ST</th></tr><tr><td>${esc(nflNick(ME))}</td><td>${ms.off.toFixed(0)}</td><td>${ms.def.toFixed(0)}</td><td>${ms.st.toFixed(0)}</td></tr><tr><td>${esc(nflNick(opp))}</td><td>${os.off.toFixed(0)}</td><td>${os.def.toFixed(0)}</td><td>${os.st.toFixed(0)}</td></tr></table>
    ${scoutBlock(opp)}
    ${liveBusy() ? `<div class="row gap mt"><button class="btn primary" data-act="liveresume">Resume the live game · ${esc(liveScoreText())}</button></div><p class="hint">If you leave the site before it is final, it will be waiting where you left it when you come back.</p>` : `<div class="row gap mt"><button class="btn watch" data-act="live">${isCoach() ? 'Coach it live' : 'Watch live, drive by drive'}</button><button class="btn primary" data-act="primary">Quick sim</button>${!isOwner() && (!isCoach() || callsOff() || callsDef()) ? '<button class="btn ghost" data-act="live2">Two-minute drill</button>' : ''}</div>`}
  </section>`;
}
function proLastCard() {
  const last = mGames().filter(g => g.done).pop(); if (!last) return '';
  const a = last.h === ME ? last.hs : last.as, b = last.h === ME ? last.as : last.hs;
  return `<section class="card"><div class="eyebrow">Last game · ${esc(nflWeekLabel(last.wk))}</div><div class="final"><span class="res ${a > b ? 'w' : 'l'}">${a > b ? 'W' : 'L'}</span><span class="sc">${a}–${b}</span><span>${siteOf(last)} ${tchip(oppOf(last))}</span></div>${last.box ? `<button class="btn ghost sm" data-act="box" data-id="${last.id}">Box score</button>` : ''}</section>`;
}
function newsCard(n) { const news = state.news.slice(0, n || 14).map(x => `<li class="${x.kind}"><span class="when">${x.s} · ${x.wk && x.wk <= 22 ? (x.wk <= 18 ? 'Wk ' + x.wk : 'Post') : 'Off'}</span>${esc(x.txt)}</li>`).join(''); return `<section class="card"><div class="eyebrow">Newswire</div><ul class="news">${news}</ul></section>`; }
function ownerCard() {
  const L = PS(); const g = L.gm; if (!g) return '';
  return `<section class="card"><div class="eyebrow">Ownership · ${DIFF[state.settings.diff].label} difficulty</div>
   ${meter('Owner confidence', g.sec, `Your job security. At or below ${diff().fire + 14} after a season and you're out (your first season gets some patience).${state.settings.noFire ? ' Firing is off.' : ''}`)}
   ${meter('Head coach relationship', L.hcRel, 'Rises when you deliver what he asks for, falls when you don\'t. A bad relationship hurts the locker room.')}
   ${meter('Fan approval', state.meters.fan, 'Moves with results.')}
   ${meter('Locker room', state.meters.morale, 'Adds or subtracts a little on game day.')}
   <p class="small">Contract: ${g.yrs} year${g.yrs === 1 ? '' : 's'} left at ${fmM(g.sal)} a year. Expected wins this season: <b>${L.expW}</b>.</p>
   <div class="legacy"><span class="k">Reputation</span><b>${execState().rep}</b><button class="lnk small" data-act="tab" data-tab="career">Career</button></div></section>`;
}
function hcInputCard() {
  const L = PS(); const hc = state.staff.HC; if (!hc) return `<section class="card"><div class="eyebrow">Head coach</div><p class="flash bad">You have no head coach. Hire one on the Staff tab.</p></section>`;
  const w = L.hcIn && L.hcIn.s === state.season && !L.hcIn.judged ? L.hcIn : null;
  return `<section class="card"><div class="eyebrow">Your head coach</div><h3 class="h3">${esc(hc.name)}${hc.interim ? ' <span class="pill warn">Interim</span>' : ''}</h3>
   <p class="small muted">Offense ${hc.off} · Defense ${hc.def} · Game day ${hc.gm} · Development ${hc.dev}</p>
   ${w ? `<div class="decision"><div class="eyebrow">What he wants</div><p>"${esc(w.txt)}"</p><p class="hint">Deliver it and your relationship improves. Ignore it and he notices.</p></div>` : '<p class="hint">No requests from the head coach right now.</p>'}</section>`;
}
function capCard() {
  const cy = capYear(); const cap = proCap(cy); const pay = payrollOf(ME); const dead = deadNow(ME); const room = r2(cap - pay);
  const next = r2(state.roster.reduce((s, p) => s + yearHit(p, 1), 0));
  return `<section class="card"><div class="head"><div class="eyebrow">Salary cap · ${cy}</div><button class="btn ghost sm" data-act="tab" data-tab="cap">Contracts</button></div>
   <div class="bar capbar"><i class="${room >= 0 ? 'good' : 'bad'}" style="width:${Math.min(100, Math.round(pay / cap * 100))}%"></i></div>
   <div class="tiles"><div><span class="k">Cap</span><span class="v">${fmM(cap)}</span></div><div><span class="k">Committed</span><span class="v">${fmM(pay)}</span></div><div><span class="k">Space</span><span class="v ${capCls(room)}">${fmS(room)}</span></div><div><span class="k">Dead money</span><span class="v">${fmM(dead)}</span></div></div>
   <p class="small muted">Next year's commitments: ${fmM(next)} of a projected ${fmM(proCap(cy + 1))} cap.</p></section>`;
}
function tradeAlert() { const o = (PS().tradeOffers || []).filter(x => x.s === state.season); if (!o.length || isCoach()) return ''; return `<div class="flash" role="status">${o.length} trade offer${o.length > 1 ? 's' : ''} waiting. <button class="lnk" data-act="tab" data-tab="trades">Open Trades</button></div>`; }
// QOL-10: the offseason at a glance (shown through the offseason and the first two weeks)
function proChangesHTML() {
  if (!(state.phase === 'offseason' || state.week <= 2)) return ''; let d = null; try { d = proChanges(); } catch (e) { d = null; } if (!d) return '';
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v); const nm = p => `${esc(p.pos)} ${esc(p.n)} (${p.ovr})`; const nr = r => `${esc(r[2])} ${esc(r[1])} (${r[3]})`; const cap = (a, f) => a.slice(0, 6).map(f).join(', ') + (a.length > 6 ? ` and ${a.length - 6} more` : '');
  return `<section class="card"><div class="eyebrow">What changed since the ${d.s} season</div><ul class="plainlist small">
   <li>Team overall <b>${d.ovr[0]} → ${d.ovr[1]}</b> (${sg(d.ovr[1] - d.ovr[0])})</li>
   <li><b>In (${d.added.length}):</b> ${d.added.length ? cap(d.added, nm) : 'no one yet'}</li>
   <li><b>Out (${d.gone.length}):</b> ${d.gone.length ? cap(d.gone, nr) : 'no one yet'}</li>
   ${d.moved.length ? `<li><b>Rating changes:</b> ${d.moved.slice(0, 5).map(([p, v]) => `${esc(p.pos)} ${esc(p.n)} ${sg(v)}`).join(', ')}</li>` : ''}</ul></section>`;
}
function vProOffice() {
  if (isCoach()) return vProCoachOffice();
  const ms = michStrength(); const nat = Object.values(state.teams).slice().sort((a, b) => b.rating - a.rating).findIndex(t => t.id === ME) + 1;
  return `${tradeAlert()}<div class="grid2"><div class="col">${proNextCard()}${proChangesHTML()}${proLastCard()}${hcInputCard()}${newsCard()}</div>
  <div class="col">${ownerCard()}${capCard()}${injuryCard()}${relCardHTML()}
   <section class="card"><div class="eyebrow">Team strength</div><div class="tiles"><div><span class="k">Overall</span><span class="v">${ms.ovr.toFixed(0)}</span><span class="s">#${nat} of 32</span></div><div><span class="k">Offense</span><span class="v">${ms.off.toFixed(0)}</span></div><div><span class="k">Defense</span><span class="v">${ms.def.toFixed(0)}</span></div><div><span class="k">Special teams</span><span class="v">${ms.st.toFixed(0)}</span></div></div>
   <p class="small muted">${state.phase !== 'offseason' && T(ME).w + T(ME).l ? esc(proStandTxt(ME)) + '. ' : ''}Expected wins: ${PS().expW}.</p></section></div></div>`;
}

/* ---------- schedule, standings, league ---------- */
function vProSchedule() {
  const games = mGames(); const rows = games.map(g => {
    const opp = oppOf(g); const us = g.h === ME ? g.hs : g.as, them = g.h === ME ? g.as : g.hs; const res = g.done ? `<span class="res ${us > them ? 'w' : 'l'}">${us > them ? 'W' : 'L'}</span> ${us}–${them}${g.ot ? ' OT' : ''}` : g.wk === state.week ? '<span class="pill maize">This week</span>' : `${Math.round(mWinProb(g) * 100)}% win chance`;
    return `<tr class="${g.wk === state.week && !g.done ? 'kept' : ''}"><td>${esc(nflWeekLabel(g.wk))}</td><td class="muted">${proWeekDate(state.season, g.wk)}</td><td>${siteOf(g)} ${tchip(opp, { rec: true })}${g.div ? ' <span class="pill">Division</span>' : ''}${g.name ? ` <span class="pill maize">${esc(g.name)}</span>` : ''}</td><td>${res}</td><td>${g.box ? `<button class="btn ghost sm" data-act="box" data-id="${g.id}">Box</button>` : ''}</td></tr>`;
  }).join('');
  const byes = [6, 7, 8, 9, 10, 11, 12, 13, 14].filter(w => w <= 18 && !games.some(g => g.wk === w));
  return `<section class="card"><div class="head"><div><div class="eyebrow">${state.season} schedule</div><h2 class="h2">${esc(myName())} · ${T(ME).w}-${T(ME).l}</h2></div><p class="hint">17 games in 18 weeks${byes.length ? `, bye in week ${byes[0]}` : ''}. Six division games. The top ${proSeedN() === 6 ? 'six' : 'seven'} in each conference make the playoffs; ${proSeedN() === 6 ? 'the top two seeds get byes' : 'the No. 1 seed gets a bye'}.</p></div>
   <div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Date</th><th>Opponent</th><th>Result</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">The schedule comes out when the season starts.</td></tr>'}</tbody></table></div></section>`;
}
function divTable(conf, div) {
  const rows = proDivStand(conf, div).map(t => `<tr class="${t.id === ME ? 'me' : ''}"><td>${tchip(t.id, { norank: true })}${proSeedOf(t.id) ? ` <span class="pill">${proSeedOf(t.id)}</span>` : ''}</td><td class="num">${t.w}-${t.l}</td><td class="num">${t.dw}-${t.dl}</td><td class="num">${t.pf}</td><td class="num">${t.pa}</td></tr>`).join('');
  return `<div class="divt"><div class="eyebrow">${conf} ${div}</div><table class="tbl"><thead><tr><th>Team</th><th>W-L</th><th>Div</th><th>PF</th><th>PA</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function vProStandings() {
  const cf = ui.pconf || T(ME).conf;
  const seeds = state.phase === 'offseason' || state.week > 18 ? null : proSeeds();
  const pic = seeds ? seeds[cf].map((id, i) => `<li class="${id === ME ? 'me' : ''}"><span class="ord">${i + 1}</span>${tchip(id, { rec: true })}${i < proByes() ? ' <span class="small muted">bye</span>' : ''}</li>`).join('') : '';
  return `<section class="card"><div class="head"><div><div class="eyebrow">Standings · ${state.season}</div><h2 class="h2">${cf}</h2></div>${seg('pconf', cf, [['AFC', 'AFC'], ['NFC', 'NFC']])}</div>
   <div class="divgrid">${NFL_DIVS.map(d => divTable(cf, d)).join('')}</div>
   ${pic ? `<div class="eyebrow mt">Playoff picture if the season ended today</div><ol class="seedlist">${pic}</ol>` : ''}</section>`;
}
function vProLeague() {
  const L = PS(); const wk = Math.min(state.week - (state.phase === 'offseason' ? 0 : 1), 22) || 1; const sel = ui.lgwk || wk;
  const games = state.games.filter(g => g.wk === sel && g.done);
  const rows = games.map(g => `<tr class="${g.h === ME || g.a === ME ? 'me' : ''}"><td>${tchip(g.a, { norank: true })}</td><td class="num">${g.as}</td><td>${tchip(g.h, { norank: true })}</td><td class="num">${g.hs}</td><td>${esc(g.name || '')}</td></tr>`).join('');
  const weeks = [...new Set(state.games.filter(g => g.done).map(g => g.wk))];
  const champs = L.champs.slice().reverse().slice(0, 12).map(c => `<tr><td>${c.s}</td><td>${tchip(c.tm, { norank: true })}</td><td class="muted">${c.ru ? 'over ' + esc(teamName(c.ru)) : ''}</td></tr>`).join('');
  const power = Object.values(state.teams).slice().sort((a, b) => b.rating - a.rating).slice(0, 10).map((t, i) => `<tr class="${t.id === ME ? 'me' : ''}"><td class="num muted">${i + 1}</td><td>${tchip(t.id, { rec: true })}</td><td class="num">${t.rating}</td></tr>`).join('');
  return `<div class="grid2"><section class="card"><div class="head"><div><div class="eyebrow">Scores</div><h2 class="h2">${weeks.length ? esc(nflWeekLabel(sel)) : 'No games yet'}</h2></div>${weeks.length ? `<select id="lgwk" data-chg="lgwk">${weeks.map(w => `<option value="${w}" ${w === sel ? 'selected' : ''}>${esc(nflWeekLabel(w))}</option>`).join('')}</select>` : ''}</div>
    ${rows ? `<div class="tw"><table class="tbl"><thead><tr><th>Away</th><th></th><th>Home</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">Scores show up here as the season is played.</p>'}</section>
   <div class="col"><section class="card"><div class="eyebrow">Power rankings</div><table class="mini wide">${power}</table></section>
   <section class="card"><div class="eyebrow">Super Bowl champions</div><table class="mini wide">${champs || '<tr><td class="muted">None yet.</td></tr>'}</table></section>${predCardHTML()}</div></div>${weeklyCardHTML()}`;
}
function vProHistory() {
  const L = PS(); const rows = L.hist.slice().reverse().map(h => `<tr><td>${h.s}${h.recap ? ` <button class="lnk small" data-act="precap" data-s="${h.s}">Recap</button>` : ''}</td><td>${tchip(h.tm, { norank: true })}</td><td>${esc(h.role === 'GM' ? 'General manager' : roleTitle(h.role))}</td><td class="num">${h.w}-${h.l}</td><td>${esc(PO_LABEL[h.po])}${h.seed ? ` <span class="small muted">(No. ${h.seed} seed)</span>` : ''}</td><td class="num">${h.exp}</td></tr>`).join('');
  const tx = L.tx.slice(0, 40).map(t => `<li><span class="when">${t.s}${t.wk ? ' · Wk ' + t.wk : ' · Off'}</span>${esc(t.txt)}</li>`).join('');
  const h2 = L.h2h || []; const rivals = NFL.filter(t => t.id !== ME && T(t.id) && T(t.id).conf === T(ME).conf && T(t.id).div === T(ME).div).map(t => { const log = h2.filter(x => x.opp === t.id); const st = h2hStats(log); return `<div class="rival"><h3 class="h3">vs. ${esc(t.name)}</h3><div class="big">${st ? st.w + '-' + st.l : '0-0'}</div>${h2hLine(st) || '<p class="small muted">No games yet.</p>'}</div>`; }).join('');
  const ring = L.ring || [];
  shareKick(); return `${sharePostCard()}<section class="card"><div class="head"><div><div class="eyebrow">Legacy</div><h2 class="h2">${esc(myName())}</h2></div><p class="hint"><button class="lnk" data-act="exportcareer">Share your career summary</button></p></div></section>${hlCardHTML()}${goalsCardHTML()}
   <section class="card"><div class="eyebrow">Division rivals</div><div class="rivals">${rivals}</div></section>
   <section class="card"><div class="eyebrow">Ring of Honor</div>${ring.length ? `<ul class="plainlist">${ring.slice().reverse().map(x => `<li><b>${esc(x.n)}</b> ${x.pos} · ${x.yrs} seasons with the club · inducted ${x.s}</li>`).join('')}</ul>` : '<p class="muted">Players who retire after a long, strong run with your club go in here.</p>'}</section>
   ${timelineCardHTML()}<div class="grid2"><section class="card"><div class="eyebrow">Your NFL seasons</div><div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Club</th><th>Job</th><th>Record</th><th>Postseason</th><th>Expected wins</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="muted">Your first season is still ahead.</td></tr>'}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Transactions</div><ul class="news">${tx || '<li class="muted">No moves yet.</li>'}</ul></section></div>`;
}

/* ---------- roster, players, teams ---------- */
const kTxt = p => (!p.k ? 'No contract' : p.k.yrs <= 0 ? 'Expiring' : `${fmM(capHit(p))} · ${p.k.yrs} yr${p.k.yrs > 1 ? 's' : ''}${p.k.rk ? ' · rookie deal' : ''}${p.k.tag ? ' · franchise tag' : ''}`);
function vProRoster() {
  const pos = ui.rpos || 'ALL'; let list = state.roster.filter(p => pos === 'ALL' || p.pos === pos); const s = ui.rsort || 'ovr';
  list.sort((a, b) => s === 'num' ? a.num - b.num : s === 'name' ? lastName(a.n).localeCompare(lastName(b.n)) : s === 'cls' ? a.age - b.age : s === 'pot' ? b.pot - a.pot : s === 'pay' ? capHit(b) - capHit(a) : b.ovr - a.ovr);
  const chips = ['ALL'].concat(POS_ORDER).map(p => `<button class="chip${pos === p ? ' on' : ''}" data-act="rpos" data-pos="${p}">${p === 'ALL' ? 'All' : p}<span>${p === 'ALL' ? state.roster.length : state.roster.filter(x => x.pos === p).length}</span></button>`).join('');
  const th = (k, l) => `<th><button class="sort${s === k ? ' on' : ''}" data-act="rsort" data-k="${k}">${l}</button></th>`;
  const gm = isGM();
  const rows = list.map(p => `<tr class="${p.inj ? 'inj' : ''}"><td class="num">${p.num}</td><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button>${p.inj ? ` <span class="pill bad">${p.injSE ? 'Out for season' : 'Out ' + p.inj + ' wk'}</span>` : ''}${p.dr && p.dr.yr === state.season + (state.phase === 'offseason' ? 1 : 0) ? ' <span class="pill maize">Rookie</span>' : ''}${unhappyPill(p)}</td><td>${p.pos}</td><td class="num">${p.age}</td><td class="muted">${esc(clsLabel(p))}</td><td>${ovrTag(p.ovr)}</td><td class="num muted">${p.pot}</td><td class="num">${p.k && p.k.yrs > 0 ? fmM(capHit(p)) : '—'}</td><td class="num">${p.k ? Math.max(0, p.k.yrs) : 0}</td><td class="small hide-sm">${fitCell(p)}</td><td class="hide-sm muted small">${esc(p.col || '')}</td></tr>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">${state.season} roster</div><h2 class="h2">${state.roster.length} players</h2></div><p class="hint">${state.phase === 'offseason' ? `Offseason rosters can hold up to ${PRO_OFF_MAX}. Cut down to ${proMax()} before the season.` : `Game-day roster limit: ${proMax()}.`} ${gm ? 'Open a player to release, extend or restructure him.' : 'The GM makes roster moves; you can weigh in on the Front office tab.'}</p></div>
   <div class="chips">${chips}${csvBtn('roster')}</div>
   <div class="tw"><table class="tbl"><thead><tr>${th('num', '#')}${th('name', 'Name')}<th>Pos</th>${th('cls', 'Age')}<th>Exp</th>${th('ovr', 'OVR')}${th('pot', 'POT')}${th('pay', 'Cap hit')}<th>Yrs</th><th class="hide-sm">Fit</th><th class="hide-sm">College</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function proPlayerModal(id) {
  const p = P(id); if (!p) { const o = proFindAny(id); return o ? proOtherPlayer(o) : '<p>Player not found.</p>'; }
  const di = (state.depth[p.pos] || []).indexOf(p.id); const gm = isGM(); const off = state.phase === 'offseason';
  const trs = Object.entries(p.tr || {}).map(([k, v]) => `<div class="trait"><span>${TRAIT_NAME[k]}</span><div class="bar"><i class="${v >= 80 ? 'good' : v >= 65 ? 'warn' : 'bad'}" style="width:${v}%"></i></div><b>${v}</b></div>`).join('');
  const k = p.k; const ext = gm && k && k.yrs > 0 && k.yrs <= 2 && k.ext !== state.season && !k.tag; const rs = gm && k && k.yrs >= 2 && !k.rk && k.rs !== state.season && k.base > PRO_MINSAL * 2;
  const cs = statLine(p, p.cs); const ck = ui.confirm === 'cut-' + p.id; const crs = rs && ui.confirm === 'rs-' + p.id;
  const a = ui.extFor === p.id ? askFor(p, true) : null; const room = capRoom(ME);
  const cutPrev = ck ? `<p class="small prev">Release ${esc(p.n)}: cap space ${fmS(room)} → <b>${fmS(r2(room + (k && k.yrs > 0 ? cutSaves(p) : 0)))}</b>${k && k.yrs > 0 && deadIfCut(p) > 0 ? `, with ${fmM(deadIfCut(p))} in dead money on this year's cap` : ''}.${k && k.yrs > 0 && cutSaves(p) < 0 ? ` <b class="neg">This release costs you ${fmM(-cutSaves(p))} in cap space this year:</b> the bonus still owed is more than his cap hit.` : ''}</p>` : '';
  const rp = crs ? restructurePreview(p) : null;
  const rsPrev = rp ? `<div class="decision mt"><div class="eyebrow">Restructure preview</div><p class="small">This year's cap hit drops by <b>${fmM(rp.saved)}</b>; each later year goes up by <b>${fmM(rp.later)}</b>. The total he is paid stays the same.</p><table class="mini wide prev"><tr><th>Season</th><th class="num">Now</th><th class="num">After</th></tr>${rp.yrs.map((y, i) => `<tr><td>${capYear() + i}</td><td class="num">${fmM(y.before)}</td><td class="num ${y.after > y.before ? 'up' : y.after < y.before ? 'dn' : ''}">${fmM(y.after)}</td></tr>`).join('')}</table><div class="row gap mt"><button class="btn primary sm" data-act="prs" data-id="${p.id}">Confirm: restructure ${esc(p.n)}</button><button class="btn ghost sm" data-act="pask" data-k="" data-id="${p.id}">Cancel</button></div></div>` : '';
  const exPrev = a && !a.walk && k ? (() => { const nk = extendK(k, a.apy, a.yrs); const hit = r2(nk.base + nk.bpy); return `<p class="small prev">At his asking price: cap hit ${fmM(capHit(p))} → <b>${fmM(hit)}</b> a year through ${capYear() + nk.yrs - 1}; cap space this year ${fmS(room)} → <b>${fmS(r2(room - (hit - capHit(p))))}</b>.</p>`; })() : '';
  return `<div class="eyebrow">#${p.num} · ${POS_NAME[p.pos]} · ${esc(clsLabel(p))} · age ${p.age}</div><h2 class="h2">${esc(p.n)}</h2>
   <p class="muted">${p.ht} · ${p.wt} lbs · ${esc(p.col || '')}${p.dr ? ` · Drafted ${p.dr.yr}, round ${p.dr.rd} (No. ${p.dr.no})` : p.udfa ? ' · Undrafted' : ''}</p>
   <div class="tiles"><div><span class="k">OVR</span><span class="v">${p.ovr}</span></div><div><span class="k">Potential</span><span class="v">${p.pot}</span></div><div><span class="k">Depth</span><span class="v sm">${di + 1} of ${(state.depth[p.pos] || []).length}</span></div><div><span class="k">Fair value</span><span class="v sm">${fmM(pValue(p))}/yr</span></div></div>
   ${ratingChartHTML(p)}<div class="traits">${trs}</div>
   ${fitHTML(p)}${rapHTML(p)}${cmpBtns(p)}
   <div class="eyebrow mt">Contract</div>
   ${k && k.yrs > 0 ? `<table class="mini wide"><tr><td>Cap hit</td><td class="num"><b>${fmM(capHit(p))}</b></td><td>Years left</td><td class="num">${k.yrs}</td></tr><tr><td>Salary this year</td><td class="num">${fmM(k.base)}</td><td>Bonus charge</td><td class="num">${fmM(k.bpy)}</td></tr><tr><td>Dead money if cut</td><td class="num">${fmM(deadIfCut(p))}</td><td>Cap saved if cut</td><td class="num ${capCls(cutSaves(p))}">${fmS(cutSaves(p))}</td></tr></table>${kYearsHTML(p)}` : `<p class="muted">${off ? 'His contract is up. Re-sign him on the Offseason tab or he goes to free agency.' : 'No contract.'}</p>`}
   ${p.inj ? `<p><span class="pill bad">${esc(p.injType || 'Injured')} · ${p.injSE ? 'out for the season' : 'out ' + p.inj + ' more week' + (p.inj > 1 ? 's' : '')}</span></p>` : ''}
   <p><b>This season:</b> ${esc(statLine(p) || 'No stats yet')}</p>${cs ? `<p><b>With you:</b> ${esc(cs)}</p>` : ''}
   ${a ? `<div class="decision mt"><div class="eyebrow">Extension talks</div><p>He wants about <b>${fmM(a.apy)}</b> a year for ${a.yrs} more year${a.yrs > 1 ? 's' : ''}.${a.walk ? ' <b>He\'s done talking for now.</b>' : ''}</p>${a.walk ? '' : `<div class="fgrid"><label class="fld"><span>$M a year</span><input id="ex-apy" type="number" step="0.1" min="0.9" value="${a.apy}"></label><label class="fld"><span>Added years</span><input id="ex-yrs" type="number" min="1" max="5" value="${a.yrs}"></label><label class="fld"><span>Structure</span><select id="ex-sh">${shapeOpts()}</select></label></div><div class="row gap"><button class="btn sm primary" data-act="pxsub" data-id="${p.id}">Offer extension</button><button class="btn ghost sm" data-act="pxcancel">Cancel</button></div>${exPrev}`}</div>` : ''}${rsPrev}${cutPrev}
   ${gm ? `<div class="row gap mt"><button class="btn sm" data-act="mkstarter" data-id="${p.id}" ${di === 0 ? 'disabled' : ''}>Move to top of ${p.pos} depth chart</button>${ext && !a ? `<button class="btn ghost sm" data-act="pxext" data-id="${p.id}">Extend</button>` : ''}${rs && !crs ? `<button class="btn ghost sm" data-act="pask" data-k="rs-${p.id}" data-id="${p.id}">Restructure (saves ${fmM(restructurePreview(p).saved)})</button>` : ''}<button class="btn ghost sm" data-act="ptrade" data-id="${p.id}">Shop in a trade</button>${ck ? `<button class="btn danger sm" data-act="pcut" data-id="${p.id}">Confirm: release ${esc(p.n)}${k && k.yrs > 0 && deadIfCut(p) > 0 ? ` (${fmM(deadIfCut(p))} dead money)` : ''}</button><button class="btn ghost sm" data-act="pask" data-k="" data-id="${p.id}">Keep him</button>` : `<button class="btn ghost sm" data-act="pask" data-k="cut-${p.id}" data-id="${p.id}">Release</button>`}</div>
   <p class="hint">Releasing him leaves ${fmM(deadIfCut(p))} in dead money on this year's cap. A restructure turns salary into bonus: less cap now, more later.</p>` : isCoach() ? cinButtons(p) : ownHands() ? ownPlayerButtons(p) : ''}`;
}
// the deal season by season: salary, bonus charge and cap hit
function kYearsHTML(p) {
  const k = p.k; if (!k || k.yrs < 2 || !kOk(k)) return ''; const cy = capYear();
  return `<table class="mini wide prev"><tr><th>Season</th><th class="num">Salary</th><th class="num">Bonus</th><th class="num">Cap hit</th></tr>${k.sal.map((x, i) => `<tr><td>${cy + i}</td><td class="num">${fmM(x)}</td><td class="num muted">${fmM(k.pr[i])}</td><td class="num"><b>${fmM(yearHit(p, i))}</b></td></tr>`).join('')}</table>${k.shape ? `<p class="small muted">${esc(SHAPES[k.shape])} deal.</p>` : ''}`;
}
function proFindAny(id) { const L = PS(); for (const t of NFL) { if (t.id === ME) continue; const p = proRoster(t.id).find(x => x.id === id); if (p) return Object.assign({ tm: t.id }, p); } const f = L.fa.find(x => x.id === id); if (f) return Object.assign({ tm: null }, f); return null; }
function proOtherPlayer(p) {
  return `<div class="eyebrow">${POS_NAME[p.pos]} · age ${p.age} · ${p.tm ? esc(teamName(p.tm)) : 'Free agent'}</div><h2 class="h2">${esc(p.n)}</h2><p class="muted">${esc(p.col || '')}</p>${fitHTML(p)}${cmpBtns(p)}
   <div class="tiles"><div><span class="k">OVR</span><span class="v">${p.ovr}</span></div><div><span class="k">Potential</span><span class="v">${p.pot}</span></div><div><span class="k">Contract</span><span class="v sm">${p.k ? esc(kTxt(p)) : p.ask ? 'Asking ' + fmM(p.ask.apy) : '—'}</span></div><div><span class="k">Trade value</span><span class="v sm">${tradeValue(p)}</span></div></div>
   ${isGM() && p.tm ? `<button class="btn sm mt" data-act="ptradefor" data-id="${p.id}" data-tid="${p.tm}">Ask about a trade</button>` : ''}`;
}
function proTeamModal(id) {
  const t = T(id); const s = strength(id); const list = proRoster(id).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 12);
  const games = state.games.filter(g => (g.h === id || g.a === id) && g.done);
  return `<div class="eyebrow">${t.conf} ${t.div}${proSeedOf(id) ? ' · No. ' + proSeedOf(id) + ' seed' : ''}</div><h2 class="h2">${esc(t.name)} <span class="muted">${t.w}-${t.l}</span></h2>
   <div class="tiles"><div><span class="k">Rating</span><span class="v">${t.rating}</span></div><div><span class="k">Offense</span><span class="v">${s.off.toFixed(0)}</span></div><div><span class="k">Defense</span><span class="v">${s.def.toFixed(0)}</span></div><div><span class="k">Cap space</span><span class="v sm ${capCls(capRoom(id))}">${fmS(capRoom(id))}</span></div></div>
   <p class="small muted">Runs ${aAn(OFF_SCH[teamScheme(id).off].n)} offense and ${aAn(DEF_SCH[teamScheme(id).def].n)} defense.${id !== ME ? ` Matchup with you: offense ${fmEdge(schemeEdge(id).off)}, defense ${fmEdge(schemeEdge(id).def)}.` : ''}</p>
   <p class="small muted">Head coach: ${esc(t.coach || '—')}${PS().aistaff[id] ? ' · GM: ' + esc(PS().aistaff[id].gm) : ''}</p>
   <div class="eyebrow mt">Best players</div><table class="tbl"><tbody>${list.map(p => `<tr><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button></td><td>${p.pos} · ${p.age}</td><td>${ovrTag(p.ovr)}</td><td class="small muted">${esc(kTxt(p))}</td></tr>`).join('')}</tbody></table>
   ${t.hist.length ? `<p class="small muted">Past seasons: ${t.hist.slice(-6).map(h => `${h.s}: ${h.w}-${h.l}`).join(' · ')}</p>` : ''}
   ${games.length ? `<p class="small muted">This season: ${games.map(g => { const us = g.h === id ? g.hs : g.as, th = g.h === id ? g.as : g.hs; return `${us > th ? 'W' : 'L'} ${us}-${th} ${g.h === id ? 'vs' : 'at'} ${nflNick(g.h === id ? g.a : g.h)}`; }).join(' · ')}</p>` : ''}`;
}

/* ---------- contracts and cap ---------- */
function vProCap() {
  const cy = capYear(); const list = state.roster.filter(p => p.k && p.k.yrs > 0).sort((a, b) => capHit(b) - capHit(a));
  const yrs = [0, 1, 2, 3].map(i => ({ y: cy + i, v: r2(state.roster.reduce((s, p) => s + yearHit(p, i), 0) + (i === 0 ? deadNow(ME) : 0)), cap: proCap(cy + i) }));
  const bars = barChart(yrs.map(x => ({ lbl: String(x.y), v: Math.round(x.v), tip: `${x.y}: ${fmM(x.v)} committed of a ${fmM(x.cap)} cap` })), { h: 160, title: 'Cap commitments by year', fmt: v => '$' + v + 'M', min0: true });
  const fut = i => p => { const v = yearHit(p, i); return `<td class="num${i > 1 ? ' hide-sm' : ''}${v ? '' : ' muted'}">${v ? fmM(v) : '—'}</td>`; };
  const rows = list.map(p => `<tr><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button></td><td>${p.pos}</td><td class="num">${p.age}</td><td>${ovrTag(p.ovr)}</td><td class="num"><b>${fmM(capHit(p))}</b></td>${[1, 2, 3].map(i => fut(i)(p)).join('')}<td class="num">${p.k.yrs}</td><td class="num muted">${fmM(deadIfCut(p))}</td><td class="num ${capCls(cutSaves(p))}">${fmS(cutSaves(p))}</td><td class="num muted">${fmM(pValue(p))}</td></tr>`).join('');
  // contention window: who you'll still have, what's free, and who is getting old, season by season (BAL-13, QOL-18)
  const starters = POS_ORDER.flatMap(pos => (state.depth[pos] || []).slice(0, START[pos] || 1)).map(P).filter(Boolean);
  const win = [0, 1, 2].map(i => { const keep = starters.filter(p => p.k && p.k.yrs > i); const old = keep.filter(p => p.age + i >= 31).length; const ovr = keep.length ? Math.round(keep.reduce((s, p) => s + p.ovr, 0) / keep.length) : 0; return { y: cy + i, keep: keep.length, of: starters.length, old, ovr, room: r1(yrs[i].cap - yrs[i].v) }; });
  const winHTML = `<section class="card"><div class="eyebrow">Contention window</div><div class="tw"><table class="mini wide"><thead><tr><th>Season</th><th class="num">Starters signed</th><th class="num">Their OVR</th><th class="num">Aged 31+</th><th class="num">Cap room now</th></tr></thead><tbody>${win.map(w => `<tr><td>${w.y}</td><td class="num">${w.keep} of ${w.of}</td><td class="num">${w.ovr || '—'}</td><td class="num">${w.old}</td><td class="num ${w.room >= 0 ? '' : 'neg'}">${fmM(w.room)}</td></tr>`).join('')}</tbody></table></div><p class="hint">Starters still under contract each season, how good and how old they are, and the room left with today's commitments. A win-now trade shows up here as less room later.</p></section>`;
  // QOL-18: one ledger for the next four league years: salaries, bonus money, dead money and what's left
  const led = [0, 1, 2, 3].map(i => { const sal = r2(state.roster.reduce((s, p) => s + (p.k && p.k.yrs > i ? (kOk(p.k) ? p.k.sal[i] : yearHit(p, i) - (p.k.bpy || 0)) + (i === 0 ? p.k.incDue || 0 : 0) : 0), 0)); /* earned incentives count this year */ const bon = r2(state.roster.reduce((s, p) => s + (p.k && p.k.yrs > i ? (kOk(p.k) ? p.k.pr[i] : p.k.bpy || 0) : 0), 0)); const dead = i === 0 ? deadNow(ME) : 0; const cap = proCap(cy + i); return { y: cy + i, sal, bon, dead, cap, room: r2(cap - sal - bon - dead) }; });
  const ledHTML = `<section class="card"><div class="eyebrow">Cap ledger</div><div class="tw"><table class="mini wide"><thead><tr><th></th>${led.map(x => `<th class="num">${x.y}</th>`).join('')}</tr></thead><tbody>
   <tr><td>Cap</td>${led.map(x => `<td class="num">${fmM(x.cap)}</td>`).join('')}</tr><tr><td>Salaries</td>${led.map(x => `<td class="num">${fmM(x.sal)}</td>`).join('')}</tr><tr><td>Bonus money (prorated)</td>${led.map(x => `<td class="num">${fmM(x.bon)}</td>`).join('')}</tr><tr><td>Dead money</td>${led.map(x => `<td class="num">${x.dead ? fmM(x.dead) : '—'}</td>`).join('')}</tr><tr><td><b>Room</b></td>${led.map(x => `<td class="num${x.room < 0 ? ' bad' : ''}"><b>${fmM(x.room)}</b></td>`).join('')}</tr></tbody></table></div><p class="hint">Future years count only deals already signed; the draft class, re-signings and free agents come out of that room.</p></section>`;
  const mv = ui.planMove || null; let plan = []; try { plan = proPlan(mv); } catch (e) { plan = []; }
  const planHTML = plan.length ? `<section class="card"><div class="eyebrow">Planning forecast</div><h2 class="h3">Room after the bills you can already see</h2><div class="tw"><table class="mini wide"><thead><tr><th></th>${plan.map(x => `<th class="num">${x.y}</th>`).join('')}</tr></thead><tbody>
   <tr><td>Cap</td>${plan.map(x => `<td class="num">${fmM(x.cap)}</td>`).join('')}</tr><tr><td>Signed deals and dead money</td>${plan.map(x => `<td class="num">${fmM(x.committed)}</td>`).join('')}</tr><tr><td>Rookies from your picks</td>${plan.map(x => `<td class="num">${x.rook ? fmM(x.rook) : '—'}</td>`).join('')}</tr>
   <tr><td>Re-sign starters whose deals end</td>${plan.map(x => `<td class="num">${x.resign ? `${fmM(x.resign)} <span class="small muted">(${x.n})</span>` : '—'}</td>`).join('')}</tr>${mv ? `<tr><td>Your win-now move</td>${plan.map(x => `<td class="num">${x.mv ? fmM(x.mv) : '—'}</td>`).join('')}</tr>` : ''}
   <tr><td><b>Room left</b></td>${plan.map(x => `<td class="num${x.room < 0 ? ' bad' : ''}"><b>${fmM(x.room)}</b></td>`).join('')}</tr></tbody></table></div>
   <div class="row gap wrap mt"><label class="fld inl"><span>Win-now move: $M a year</span><input type="number" min="0" max="80" step="0.5" data-plan="sal" value="${mv ? esc(mv.sal) : ''}" style="width:90px"></label><label class="fld inl"><span>Years</span><select data-plan="yrs">${[1, 2, 3].map(n => `<option value="${n}" ${mv && +mv.yrs === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>${mv ? '<button class="btn ghost sm" data-act="planclear">Clear</button>' : ''}</div>
   <p class="hint">Re-signing uses each starter's fair value at his age that year; rookies use a typical slot in each round. A deal you sign now shows up in "signed deals".</p></section>` : '';
  return `<div class="grid2">${capCard()}<section class="card"><div class="eyebrow">Commitments</div>${bars}<p class="hint">Bars show money already committed to each future cap. The cap grows about 5% a year.</p></section></div>${planHTML}${ledHTML}${winHTML}${pickInventory()}
   <section class="card"><div class="head"><div><div class="eyebrow">Contracts · ${cy} league year</div><h2 class="h2">${list.length} players under contract</h2></div><p class="hint">Cap hit is base salary plus the signing bonus spread over the deal. Releasing a player saves his base salary but puts the rest of his bonus on this year's cap as dead money.</p></div>
   <div class="tw"><table class="tbl sortable" data-sk="cap"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>${cy}</th><th>${cy + 1}</th><th class="hide-sm">${cy + 2}</th><th class="hide-sm">${cy + 3}</th><th>Yrs</th><th>Dead if cut</th><th>Saved if cut</th><th>Fair value</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

// every pick you hold, by draft year, and the ones you have traded away
function pickInventory() {
  const L = PS(); const own = L.picks.filter(pk => pk.own === ME); const gone = L.picks.filter(pk => pk.orig === ME && pk.own !== ME);
  const yrs = [...new Set(L.picks.map(pk => pk.yr))].sort();
  const rowsY = yrs.map(y => { const mine = own.filter(pk => pk.yr === y).sort((a, b) => a.rd - b.rd); const out = gone.filter(pk => pk.yr === y).sort((a, b) => a.rd - b.rd); return `<tr><td>${y}</td><td>${mine.length ? mine.map(pk => `R${pk.rd}${pk.orig !== ME ? ` <span class="small muted">(from ${esc(nflNick(pk.orig))})</span>` : ''}${pk.forf ? ' <span class="pill bad small">forfeited</span>' : ''}`).join(', ') : '<span class="muted">none</span>'}</td><td class="num">${mine.length}</td><td class="small muted">${out.length ? out.map(pk => `R${pk.rd} to ${esc(nflNick(pk.own))}`).join(', ') : '—'}</td></tr>`; }).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Draft picks</div><h2 class="h2">${own.length} pick${own.length === 1 ? '' : 's'} in hand</h2></div><button class="btn ghost sm" data-act="tab" data-tab="trades">Trade desk</button></div><div class="tw"><table class="tbl"><thead><tr><th>Draft</th><th>Your picks</th><th>Count</th><th>Traded away</th></tr></thead><tbody>${rowsY || '<tr><td colspan="4" class="muted">No picks on the books.</td></tr>'}</tbody></table></div></section>`;
}

/* ---------- staff ---------- */
function vProStaff() {
  const s = state.staff; const gm = isGM(); const hc = s.HC;
  const card = role => { const c = s[role]; if (!c) return `<div class="coach vacant"><div class="role">${ROLE_TITLE[role]}</div><div class="cname">Vacant</div></div>`; const rt = role === 'HC' ? [['OFF', c.off], ['DEF', c.def], ['GAME', c.gm], ['DEV', c.dev]] : [['OVR', c.ovr], ['DEV', c.dev]]; return `<div class="coach${role === 'HC' ? ' big' : ''}"><div class="role">${esc(c.title || ROLE_TITLE[role])}${c.me ? ' <span class="pill maize">You</span>' : ''}${c.interim ? ' <span class="pill warn">Interim</span>' : ''}</div><div class="cname">${esc(c.name)}</div>${c.bg ? `<div class="hint">${esc(c.bg)}</div>` : ''}<div class="rt">${rt.map(([k, v]) => `<span><em>${k}</em>${v}</span>`).join('')}</div><div class="small muted">${fmM(c.salary || 0)} a year${c.years ? ` · ${c.years} yr${c.years > 1 ? 's' : ''}` : ''}</div></div>`; };
  const ck = ui.confirm === 'firehc';
  const hcBlock = gm ? (hc && !hc.interim ? `<div class="row gap mt">${ck ? '<button class="btn danger sm" data-act="prohcfire">Confirm: fire the head coach</button><button class="btn ghost sm" data-act="ask" data-k="">Keep him</button>' : '<button class="btn ghost sm" data-act="ask" data-k="firehc">Fire the head coach</button>'}</div><p class="hint">The owner pays what is left on his deal. ${state.phase === 'offseason' ? 'Hire his replacement right away.' : 'His offensive coordinator takes over as interim until the offseason.'}</p>` : `<div class="eyebrow mt">Head coach candidates</div><div class="coachgrid mt">${(state.cands.HC || []).map(c => `<div class="coach"><div class="cname">${esc(c.name)}</div><div class="hint">${esc(c.bg || '')}</div><div class="rt"><span><em>OFF</em>${c.off}</span><span><em>DEF</em>${c.def}</span><span><em>GAME</em>${c.gm}</span><span><em>DEV</em>${c.dev}</span></div><div class="small muted">${fmM(c.salary)} a year · ${c.years} years</div>${state.phase === 'offseason' ? `<button class="btn sm mt" data-act="prohchire" data-id="${c.id}">Hire</button>` : ''}</div>`).join('')}</div>${state.phase !== 'offseason' ? '<p class="hint">You can hire a permanent head coach in the offseason.</p>' : ''}`) : '';
  return `<section class="card"><div class="head"><div><div class="eyebrow">Coaching staff</div><h2 class="h2">${esc(myName())}</h2></div><p class="hint">${gm ? 'You hire and fire the head coach; he picks his coordinators and assistants. The owner pays the staff, so coaching salaries do not count against the cap.' : 'The head coach runs the staff.'}</p></div>
   <div class="coachgrid">${STAFF_ROLES.map(card).join('')}</div>${hcBlock}</section>`;
}

/* ---------- free agency ---------- */
function faWindow() { const o = PS().off; return state.phase === 'offseason' && o && o.step === 3 && PS().faWave < 3; }
function vProFA() {
  const L = PS(); const pos = ui.fpos || 'ALL'; const gm = isGM(); const win = faWindow();
  let list = L.fa.filter(p => (pos === 'ALL' || p.pos === pos) && p.ask).sort((a, b) => b.ovr - a.ovr).slice(0, 80);
  const chips = ['ALL'].concat(POS_ORDER).map(p => `<button class="chip${pos === p ? ' on' : ''}" data-act="fpos" data-v="${p}">${p === 'ALL' ? 'All' : p}</button>`).join('');
  const mine = L.faOffers || {}; const open = ui.faFor && faFind(ui.faFor);
  const rows = list.map(p => { const o = mine[p.id]; const need = posNeed(ME, p.pos); return `<tr class="${o ? 'kept' : ''}"><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button>${p.udfa ? ' <span class="pill ghost">Undrafted rookie</span>' : ''}${fitPill(p)}${aiGM() && L.cin.fa.includes(p.id) ? ' <span class="pill maize">Your target</span>' : ''}</td><td>${p.pos}</td><td class="num">${p.age}</td><td>${ovrTag(p.ovr)}</td><td class="num muted">${p.pot}</td><td class="num">${fmM(p.ask.apy)} × ${p.ask.yrs}</td><td>${need >= 0.6 ? '<span class="pill warn">Need</span>' : p.ovr > worstStarter(ME, p.pos) ? '<span class="pill good">Upgrade</span>' : ''}</td><td>${gm ? (o ? `<span class="small">Offered ${fmM(o.apy)} × ${o.yrs}</span> <button class="lnk small" data-act="faclear" data-id="${p.id}">Withdraw</button>` : `<button class="btn ghost sm" data-act="faopen" data-id="${p.id}">${win ? 'Make offer' : 'Sign'}</button>`) : `<button class="btn ghost sm" data-act="cin" data-k="fa" data-id="${p.id}" data-pos="${p.pos}">${L.cin.fa.includes(p.id) ? 'Remove target' : 'Ask the GM'}</button>`}</td></tr>`; }).join('');
  const form = open && gm ? `<section class="card decision"><div class="head"><div><div class="eyebrow">${win ? 'Free-agent offer' : 'Sign a free agent'}</div><h2 class="h3">${esc(open.n)} · ${open.pos} · ${open.ovr} OVR · age ${open.age}</h2></div><button class="btn ghost sm" data-act="faclose">Close</button></div>
    <p>He's asking <b>${fmM(open.ask.apy)}</b> a year for ${open.ask.yrs} year${open.ask.yrs > 1 ? 's' : ''}. ${win ? `Offers are decided in waves: ${3 - L.faWave} left. Other clubs may bid too, and he weighs money, years and how good your team is.` : 'Outside the bidding waves he signs if you meet about 95% of his ask.'} Cap space: ${fmS(capRoom(ME))}.</p>
    <div class="fgrid"><label class="fld"><span>$M a year</span><input id="fa-apy" type="number" step="0.1" min="0.9" value="${open.ask.apy}"></label><label class="fld"><span>Years</span><input id="fa-yrs" type="number" min="1" max="5" value="${open.ask.yrs}"></label><label class="fld"><span>Structure</span><select id="fa-sh">${shapeOpts()}</select></label></div>
    <div class="row gap"><button class="btn primary sm" data-act="fasub" data-id="${open.id}">${win ? 'Place offer' : 'Sign him'}</button></div></section>` : '';
  const head = win ? `Free agency is open · wave ${L.faWave + 1} of 3` : state.phase === 'offseason' && PS().off.step < 3 ? 'Free agency opens at step 4 of the offseason' : 'Free agents';
  return `${form}<section class="card"><div class="head"><div><div class="eyebrow">${isCoach() ? 'Free agents · your targets go to the GM' : 'Free agency'}</div><h2 class="h2">${esc(head)}</h2></div><p class="hint">${gm ? `${L.fa.length} players available. Cap space ${fmS(capRoom(ME))}. ${win ? 'Place your offers, then run the next wave from the Offseason tab.' : 'Asking prices drop as time goes on.'}` : `Mark up to ${CIN_MAX()} targets at positions you coach. The GM weighs your input but makes the call.`}</p></div>
   <div class="chips">${chips}</div>${filterBox('fa', 'Filter free agents')}<div class="tw"><table class="tbl sortable" data-sk="fa"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>POT</th><th>Asking</th><th></th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="muted">Nobody here.</td></tr>'}</tbody></table></div></section>`;
}

/* ---------- trades ---------- */
// picks are kept as positions in pro.picks, so a trade in progress forgets its picks whenever that list changes
const picksSig = () => { const L = PS(); return L.picks.length + ':' + L.picks.map(p => p.yr + p.rd + p.orig + p.own).join('').length + ':' + (L.picks[0] ? L.picks[0].yr + L.picks[0].orig : ''); };
function tradeDraft() { if (!ui.tr) ui.tr = { tid: null, give: { pl: [], pk: [] }, get: { pl: [], pk: [] }, msg: '' }; const sg = picksSig(); if (ui.tr.pv !== sg) { ui.tr.give.pk = []; ui.tr.get.pk = []; ui.tr.pv = sg; } return ui.tr; }
function vProTrades() {
  const L = PS(); const tr = tradeDraft(); const closed = state.phase !== 'offseason' && state.week > 9;
  const offers = (L.tradeOffers || []).filter(o => o.s === state.season).map(o => { const theirs = id => proRoster(o.tid).find(x => x.id === id); const side = (pls, pks, mine) => pls.map(id => mine ? P(id) : theirs(id)).filter(Boolean).map(p => `${p.pos} ${esc(p.n)} (${p.ovr})`).concat(pks.map(i => L.picks[i]).filter(Boolean).map(pk => esc(pickLabel(pk)))).join(', '); return `<div class="offerrow"><div>${o.buy ? '<span class="pill maize">Deadline deal</span> ' : ''}<b>The ${esc(teamName(o.tid))}</b> ${o.buy ? 'offer' : 'want'} ${o.buy ? side(o.give.pl, o.give.pk, false) : side(o.get.pl, o.get.pk, true)} for ${o.buy ? side(o.get.pl, o.get.pk, true) : side(o.give.pl, o.give.pk, false)}.</div><div class="row gap"><button class="btn sm" data-act="toacc" data-id="${o.id}">Accept</button><button class="btn ghost sm" data-act="todec" data-id="${o.id}">Decline</button></div></div>`; }).join('');
  const teams = NFL.filter(t => t.id !== ME).map(t => `<option value="${t.id}" ${tr.tid === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  const box = (who, list, picks, side) => {
    const sel = side === 'give' ? tr.give : tr.get;
    const pl = list.slice().sort((a, b) => b.ovr - a.ovr).map(p => `<label class="tpick"><input type="checkbox" data-act="trpl" data-side="${side}" data-id="${p.id}" ${sel.pl.includes(p.id) ? 'checked' : ''}><span><b>${esc(p.n)}</b> ${p.pos} · ${p.age} · ${p.ovr}</span><span class="small muted">${p.k && p.k.yrs > 0 ? fmM(capHit(p)) + '×' + p.k.yrs : 'expiring'} · val ${tradeValue(p)}</span></label>`).join('');
    const pk = picks.map(x => `<label class="tpick"><input type="checkbox" data-act="trpk" data-side="${side}" data-i="${x.i}" ${sel.pk.includes(x.i) ? 'checked' : ''}><span><b>${esc(pickLabel(x.pk))}</b></span><span class="small muted">≈ No. ${proPickNo(x.pk)} · val ${pickPts(x.pk)}</span></label>`).join('');
    return `<div class="tside"><div class="eyebrow">${esc(who)}</div><div class="tlist">${pk}${pl}</div></div>`;
  };
  const myPicks = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === ME); const theirPicks = tr.tid ? L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === tr.tid) : [];
  let read = '';
  if (tr.tid && (tr.give.pl.length || tr.give.pk.length || tr.get.pl.length || tr.get.pk.length)) {
    const v = tradeValues(tr.tid, tr.give, tr.get); const c = tradeCheck(tr.tid, tr.give, tr.get);
    const pct = v.outV ? Math.round(v.inV / (v.outV * 1.05 + 15) * 100) : 100;
    read = `<div class="tread"><div class="bar"><i class="${c.ok ? 'good' : pct >= 85 ? 'warn' : 'bad'}" style="width:${clamp(pct, 3, 100)}%"></i></div><p class="small">You send ${v.inV} points of value, they send ${v.outV}. ${c.ok ? '<b>They would take this deal.</b>' : esc(c.why)}${c.need && sweetener(tr.tid, c.need) != null ? ` <button class="lnk" data-act="trsweet">Add the pick that closes the gap</button>` : ''}</p>
     ${c.ok && tr.cf ? (() => { const nm = (pl, pk) => pl.map(p => `${p.pos} ${p.n}`).concat(pk.map(i => L.picks[i] ? pickLabel(L.picks[i]) : '')).filter(Boolean).join(', '); return `<p class="small"><b>Send</b> ${esc(nm(v.mineP, tr.give.pk))} <b>to the ${esc(teamName(tr.tid))} for</b> ${esc(nm(v.theirP, tr.get.pk))}?</p><div class="row gap"><button class="btn primary sm" data-act="trgo">Confirm: trade ${esc(nm(v.mineP, tr.give.pk))}</button><button class="btn ghost sm" data-act="trback">Back</button></div>`; })() : `<div class="row gap"><button class="btn primary sm" data-act="trask" ${c.ok ? '' : 'disabled'}>Make the trade…</button><button class="btn ghost sm" data-act="trclear">Clear</button></div>`}</div>`;
  }
  const hcNote = L.hcIn && L.hcIn.k === 'need' && L.hcIn.dl && !L.hcIn.judged ? `<p class="flash">${esc(state.staff.HC ? state.staff.HC.name : 'The head coach')}: "${esc(L.hcIn.txt)}"</p>` : '';
  return `${offers ? `<section class="card"><div class="eyebrow">Trade offers</div>${offers}</section>` : ''}
   <section class="card"><div class="head"><div><div class="eyebrow">Trade desk</div><h2 class="h2">${closed ? 'The trade deadline has passed' : 'Build a trade'}</h2></div><p class="hint">Trade players and draft picks (this year's and next year's). Clubs judge value by age, rating, contract and their own needs; rebuilding clubs like picks more. Trades open until the week 9 deadline, and all offseason.</p></div>
   ${hcNote}${closed ? '<p class="muted">Trades open again when the offseason starts.</p>' : `<label class="fld"><span>Trade partner</span><select id="trtid" data-chg="trtid"><option value="">Pick a club</option>${teams}</select></label>
   ${tr.tid ? `<p class="small muted">${esc(teamName(tr.tid))}: ${T(tr.tid).w}-${T(tr.tid).l}, cap space ${fmS(capRoom(tr.tid))}, biggest needs ${needList(tr.tid).slice(0, 3).map(n => n.pos).join(', ')}.</p><div class="tgrid">${box('You send', state.roster, myPicks, 'give')}${box('You get', proRoster(tr.tid), theirPicks, 'get')}</div>${read}` : ''}`}
   ${tr.msg ? `<p class="flash">${esc(tr.msg)}</p>` : ''}</section>`;
}

/* ---------- the draft ---------- */
function prospectRow(p, opts) {
  const L = PS(); const v = scoutView(p); const coach = isCoach(); const D = L.draft; const onClock = D && !D.done && D.slots[D.cur] && D.slots[D.cur].own === ME && isGM(); const coach2 = coach || ownHands();
  const tg = typeof scoutTag === 'function' ? scoutTag(v, SC_ERR[effSc(p)]) : null; const range = (effSc(p) >= 3 ? `<b>${p.ovr}</b> / ${p.pot}` : `${v.lo}–${v.hi} / ${v.plo}–${v.phi}`) + (tg ? ` <span class="pill small" title="${esc(tg[1])}">${esc(tg[0])}</span>` : ''); /* IDEA-10 */
  const act = onClock && opts.room ? `<button class="btn sm primary" data-act="dpick" data-id="${p.id}">Draft</button>` : coach2 ? `<button class="btn ghost sm" data-act="cin" data-k="draft" data-id="${p.id}" data-pos="${p.pos}">${L.cin.draft.includes(p.id) ? 'Remove' : 'Want him'}</button>` : isGM() && !p.wo && workoutsLeft() > 0 && !(D && D.done) ? `<button class="btn ghost sm" data-act="dwork" data-id="${p.id}" title="A private workout gives a full read on him">Work him out</button>` : p.wo ? `<span class="small muted">${esc(p.woNote || 'Worked out')}</span>` : '';
  return `<tr class="${coach && L.cin.draft.includes(p.id) ? 'kept' : ''}"><td class="num muted">${p.cr}</td><td><b>${esc(p.n)}</b>${effSc(p) >= 1 ? fitPill(p) : ''}${proScoutBoost(p.pos) ? ' <span class="pill ghost" title="One of your scouts covers this position group">Scout</span>' : ''}${coach && L.cin.draft.includes(p.id) ? ' <span class="pill maize">Your pick</span>' : ''}</td><td>${p.pos}</td><td class="hide-sm muted">${esc(p.col)}</td><td class="num">${p.age}</td><td class="num">${range}</td><td>${'●'.repeat(effSc(p))}${'○'.repeat(3 - effSc(p))} ${effSc(p) < 3 && L.scout >= 1 ? `<button class="lnk small" data-act="dscout" data-id="${p.id}">Scout</button>` : ''}</td><td>${act}</td></tr>`;
}
function vProDraft() {
  const L = PS(); if (!L.dc) return '<section class="card"><p class="muted">The draft class is not set yet.</p></section>';
  const D = L.draft && L.draft.yr === L.dc.yr ? L.draft : null; const pos = ui.dfpos || 'ALL';
  const avail = L.dc.list.filter(p => !p.taken && (pos === 'ALL' || p.pos === pos)).sort((a, b) => ui.dsort === 'mine' ? myDraftScore(b) - myDraftScore(a) : a.cr - b.cr).slice(0, 90);
  const chips = ['ALL'].concat(POS_ORDER).map(p => `<button class="chip${pos === p ? ' on' : ''}" data-act="dfpos" data-v="${p}">${p === 'ALL' ? 'All' : p}</button>`).join('');
  const my = L.picks.filter(pk => pk.own === ME && pk.yr === L.dc.yr).sort((a, b) => proPickNo(a) - proPickNo(b));
  const room = D && !D.done ? draftRoomHTML() : '';
  const mock = !D || !D.done ? mockDraft() : []; const mockC = mock.length ? `<section class="card"><div class="head"><div><div class="eyebrow">Mock draft · ${L.mock && L.mock.wk === 'offseason' ? 'final order' : 'after week ' + (state.week - 1 || 1)}</div><h2 class="h3">Round one, as the experts see it</h2></div><p class="hint">Built from the current draft order and each club's needs, using the consensus board. It changes every week.${isGM() ? ` You have ${workoutsLeft()} private workout${workoutsLeft() === 1 ? '' : 's'} left this year.` : ''}</p></div><div class="tw"><table class="tbl"><thead><tr><th>Pick</th><th>Club</th><th>Prospect</th><th>Pos</th><th class="hide-sm">College</th></tr></thead><tbody>${mock.map(r => `<tr class="${r.tid === ME ? 'me' : ''}"><td class="num">${r.no}</td><td>${tchip(r.tid, { norank: true })}</td><td>${esc(r.n)}</td><td>${r.pos}</td><td class="hide-sm muted">${esc(r.col || '')}</td></tr>`).join('')}</tbody></table></div></section>` : '';
  return `${room}${mockC}${isGM() ? scoutStaffCard() : ''}<section class="card"><div class="head"><div><div class="eyebrow">${L.dc.yr} NFL Draft · scouting board</div><h2 class="h2">${D && D.done ? 'The draft is done' : `${L.dc.list.filter(p => !p.taken).length} prospects`}</h2></div><p class="hint">Ratings are your scouts' read: a range of current rating and potential that narrows each time you scout a player. Scouting points: <b>${L.scout}</b> (they build up during the season). ${isCoach() ? `Mark up to ${CIN_MAX()} players you want; the GM weighs your input.` : ''}</p></div>
   ${!D ? `<p class="small">Your picks: ${my.length ? my.map(pk => `${esc(pickLabel(pk))} (≈ No. ${proPickNo(pk)})`).join(' · ') : 'none this year'}.</p>` : ''}
   <div class="row gap">${seg('dsort', ui.dsort === 'mine' ? 'mine' : 'cons', [['cons', 'Consensus board'], ['mine', 'Your board']])}${isGM() ? `<button class="btn ghost sm" data-act="dautoscout" ${L.scout < 1 ? 'disabled' : ''}>Scout the top of the board</button>` : ''}</div>
   <div class="chips">${chips}</div>
   ${filterBox('pdraft', 'Filter prospects')}<div class="tw"><table class="tbl sortable" data-sk="pdraft"><thead><tr><th>Rank</th><th>Prospect</th><th>Pos</th><th class="hide-sm">College</th><th>Age</th><th>OVR / POT</th><th>Scouted</th><th></th></tr></thead><tbody>${avail.map(p => prospectRow(p, { room: !!room })).join('') || '<tr><td colspan="8" class="muted">Nobody left at this position.</td></tr>'}</tbody></table></div></section>`;
}
function draftRoomHTML() {
  const L = PS(); const D = L.draft; const s = D.slots[D.cur]; const mine = s && s.own === ME;
  const recent = D.slots.slice(Math.max(0, D.cur - 8), D.cur).reverse().map(x => `<li class="${x.own === ME ? 'me' : ''}"><span class="ord">${x.no}</span>${tchip(x.own, { norank: true })} <span>${esc(x.pos || '')} ${esc(x.n || '')}</span></li>`).join('');
  const next = D.slots.filter((x, i) => i >= D.cur && x.own === ME).slice(0, 4).map(x => `No. ${x.no}`).join(', ');
  const downs = mine && isGM() ? draftDownOffers() : [];
  const upTargets = isGM() ? D.slots.slice(D.cur, D.cur + 12).filter(x => x.own !== ME).slice(0, 6) : [];
  const up = ui.dup ? draftUpCost(ui.dup) : null;
  return `<section class="card draftroom"><div class="head"><div><div class="eyebrow">Draft room · round ${s ? s.rd : '—'}</div><h2 class="h2">${s ? `Pick No. ${s.no}: ${mine ? (isGM() ? "You're on the clock" : 'Your club is on the clock') : `the ${esc(teamName(s.own))} are on the clock`}` : 'Draft complete'}</h2></div>
   <div class="row gap">${isGM() && !mine ? '<button class="btn primary sm" data-act="drun">Sim to your next pick</button>' : ''}${isGM() && mine ? '<button class="btn ghost sm" data-act="dauto1">Take the best player on your board</button>' : ''}<button class="btn ghost sm" data-act="dall">${isGM() ? 'Auto-draft the rest' : 'Sim the draft'}</button></div></div>
   <p class="small">Your next picks: ${next || 'none left'}. ${isGM() && L.hcIn && L.hcIn.k === 'draft' ? `Head coach: "${esc(L.hcIn.txt)}"` : ''}</p>
   ${downs.length ? `<div class="eyebrow mt">Offers to move down</div>${downs.map(o => `<div class="offerrow"><div>The ${esc(teamName(o.tid))} offer No. ${o.slot} plus ${esc(pickLabel(L.picks[o.extra]))}.</div><button class="btn sm" data-act="ddown" data-tid="${o.tid}">Trade down</button></div>`).join('')}` : ''}
   ${upTargets.length ? `<div class="eyebrow mt">Move up</div><div class="row gap">${upTargets.map(x => `<button class="chip${ui.dup === x.no ? ' on' : ''}" data-act="dupq" data-v="${x.no}">No. ${x.no}</button>`).join('')}</div>${up ? `<p class="small">To get No. ${up.no} from the ${esc(teamName(up.tid))}: ${up.pkg.map(x => x.slot ? 'No. ' + x.slot : esc(pickLabel(L.picks[x.fut]))).join(' + ')}. <button class="btn sm" data-act="dup" data-v="${up.no}">Make the trade</button></p>` : ui.dup ? '<p class="small muted">You don\'t have enough picks to get there.</p>' : ''}` : ''}
   ${recent ? `<div class="eyebrow mt">Latest picks</div><ol class="seedlist">${recent}</ol>` : ''}</section>`;
}

/* ---------- the offseason desk ---------- */
function proOffTop(step) { const lab = proStepLabels(); return `<section class="card"><ol class="steps">${lab.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'on' : ''}"><span>${i + 1}</span>${s}</li>`).join('')}</ol>${offChecklist()}</section>`; }
const nextBtn = (lbl, extra) => `<div class="row gap mt"><button class="btn primary" data-act="pnext">${esc(lbl)}</button>${extra || ''}</div>`;
function execOffersHTML(list, fired) {
  if (!list || !list.length) return '';
  return `<section class="card"><div class="eyebrow">${fired ? 'Open jobs' : 'Job offers'}</div><h2 class="h3">${fired ? 'Where you could land' : 'Other clubs and schools want to talk'}</h2>
   <div class="tw"><table class="tbl"><thead><tr><th>Job</th><th></th><th>Interest</th><th></th></tr></thead><tbody>${list.map(j => `<tr><td><b>${esc(jobName(j))}</b></td><td>${j.role === 'GM' ? 'NFL general manager' : 'College athletic director'}</td><td>${j.int >= 70 ? '<span class="pill good">They want you</span>' : j.int >= 40 ? '<span class="pill">Open to it</span>' : '<span class="pill bad">Not interested</span>'} <span class="small muted">${j.int}</span></td><td>${!fired || j.int >= 40 ? (ui.confirm === 'job-' + j.id ? `<button class="btn danger sm" data-act="jobtake" data-id="${j.id}">Confirm</button>` : `<button class="btn sm" data-act="ask" data-k="job-${j.id}">Take the job</button>`) : ''}</td></tr>`).join('')}</tbody></table></div>
   <p class="hint">${fired ? 'Pick one to keep your career going in this save, or start over.' : 'Taking a job moves you right away. Moving between college and the NFL keeps both worlds in this save; the college world plays the seasons you were away.'}</p></section>`;
}
function proReviewGM() {
  const L = PS(); const rv = L.off.review;
  if (rv.fresh) return `<section class="card"><div class="eyebrow">Introductory press conference</div><h2 class="h2">Welcome to the ${esc(myName())}</h2><p>The owner expects about <b>${proExpWins()}</b> wins next season. Last year the club went ${rv.w}-${rv.l} (${esc(PO_LABEL[rv.po].toLowerCase())}).</p><p class="small">This offseason you'll decide on the head coach, re-sign or let go of expiring contracts, work free agency and run the draft. The cap for ${capYear()} is ${fmM(proCap(capYear()))}; you have ${fmS(capRoom(ME))} in space.</p>${nextBtn('Continue to the head coach')}</section>`;
  const d = rv.sec - rv.secBefore;
  return `<section class="card"><div class="eyebrow">Season review · ${state.season}</div><h2 class="h2">${rv.w}-${rv.l} · ${esc(PO_LABEL[rv.po])}</h2>
   <div class="tiles"><div><span class="k">Expected wins</span><span class="v">${rv.exp}</span></div><div><span class="k">Owner confidence</span><span class="v">${rv.secBefore} → ${rv.sec}</span><span class="s ${d >= 0 ? 'pos' : 'neg'}">${d >= 0 ? '+' : ''}${d}</span></div><div><span class="k">Head coach relationship</span><span class="v">${L.hcRel}</span></div><div><span class="k">Reputation</span><span class="v">${execState().rep}</span></div></div>
   ${state.gameOver ? `<p class="flash bad">${esc(state.gameOver.reason)}</p>` : `<p class="small">${rv.sec >= 70 ? 'The owner is thrilled with the direction.' : rv.sec >= 45 ? 'The owner is patient, for now.' : 'The owner is losing patience. Another season like that and you are out.'}</p>`}
   ${state.gameOver ? '<div class="row gap mt"><button class="btn primary" data-act="jobsopen">See open jobs</button></div>' : nextBtn('Continue to the head coach')}</section>${state.gameOver ? '' : execOffersHTML(L.offers)}`;
}
function proHCStep() {
  const L = PS(); const hc = state.staff.HC; const ck = ui.confirm === 'firehc';
  const sorted = (state.cands.HC || []).slice().sort((a, b) => coachOvr(b) - coachOvr(a));
  return `<section class="card"><div class="eyebrow">Head coach</div>${hc && !hc.interim ? `<h2 class="h2">${esc(hc.name)}</h2><p class="small muted">Offense ${hc.off} · Defense ${hc.def} · Game day ${hc.gm} · Development ${hc.dev} · ${hc.years || '?'} years left · ${fmM(hc.salary)} a year</p>
    ${meter('Your relationship', L.hcRel, 'Goes up when you give him what he asks for.')}
    <p>Keep him, or make a change. ${T(ME).hist.length ? `Last season: ${T(ME).hist[T(ME).hist.length - 1].w}-${T(ME).hist[T(ME).hist.length - 1].l}.` : ''}</p>
    <div class="row gap">${ck ? '<button class="btn danger sm" data-act="prohcfire">Confirm: fire him</button>' : '<button class="btn ghost sm" data-act="ask" data-k="firehc">Fire the head coach</button>'}</div>${nextBtn('Keep him and move on to re-signing')}` :
    `<h2 class="h2">Hire a head coach</h2><p class="small">The job is open. Your new coach brings his own coordinators about half the time.</p><div class="coachgrid mt">${sorted.map(c => `<div class="coach"><div class="cname">${esc(c.name)}</div><div class="hint">${esc(c.bg || '')} · age ${c.age || '—'}</div><div class="rt"><span><em>OFF</em>${c.off}</span><span><em>DEF</em>${c.def}</span><span><em>GAME</em>${c.gm}</span><span><em>DEV</em>${c.dev}</span></div><div class="small muted">${fmM(c.salary)} a year · ${c.years} years</div><button class="btn sm mt" data-act="prohchire" data-id="${c.id}">Hire</button></div>`).join('')}</div>`}</section>`;
}
function proResignStep() {
  const L = PS(); const list = state.roster.filter(p => !underContract(p)).sort((a, b) => b.ovr - a.ovr); const w = L.hcIn && L.hcIn.k === 'keep' && !L.hcIn.judged ? L.hcIn : null; const tagUsed = L.tag === state.season;
  const neg = ui.rsFor && P(ui.rsFor) && !underContract(P(ui.rsFor)) ? P(ui.rsFor) : null;
  const rows = list.map(p => { const a = askFor(p, false); return `<tr class="${w && w.pid === p.id ? 'kept' : ''}"><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button>${w && w.pid === p.id ? ' <span class="pill maize">Coach wants him</span>' : ''}${a.walk ? ' <span class="pill bad">Testing free agency</span>' : ''}</td><td>${p.pos}</td><td class="num">${p.age}</td><td>${ovrTag(p.ovr)}</td><td class="num">${fmM(a.apy)} × ${a.yrs}</td><td class="num muted">${fmM(pValue(p))}</td><td><div class="row gap">${a.walk ? '' : `<button class="btn sm" data-act="rsyes" data-id="${p.id}">Re-sign at ask</button><button class="btn ghost sm" data-act="rsneg" data-id="${p.id}">Negotiate</button>`}${!tagUsed ? `<button class="btn ghost sm" data-act="rstag" data-id="${p.id}">Tag (${fmM(tagValue(p.pos))})</button>` : ''}<button class="btn ghost sm" data-act="rsno" data-id="${p.id}">Let go</button></div></td></tr>`; }).join('');
  const negBox = neg ? (() => { const a = askFor(neg, false); return `<section class="card decision"><div class="head"><div><div class="eyebrow">Contract talks · ${esc(neg.n)}</div><h2 class="h3">He's asking ${fmM(a.apy)} a year for ${a.yrs} year${a.yrs > 1 ? 's' : ''}</h2></div><button class="btn ghost sm" data-act="rsclose">Close</button></div>${a.walk ? '<p class="flash bad">He has decided to test free agency.</p>' : `<div class="fgrid"><label class="fld"><span>$M a year</span><input id="rs-apy" type="number" step="0.1" min="0.9" value="${r2(a.apy * 0.92)}"></label><label class="fld"><span>Years</span><input id="rs-yrs" type="number" min="1" max="6" value="${a.yrs}"></label><label class="fld"><span>Structure</span><select id="rs-sh">${shapeOpts()}</select></label></div><p class="hint">Round ${a.round + 1} of 3. Come in far below his number and he stops talking.</p><div class="row gap"><button class="btn primary sm" data-act="rssub" data-id="${neg.id}">Make the offer</button></div>`}</section>`; })() : '';
  const opts = state.roster.filter(optionDue); const optC = opts.length ? `<section class="card"><div class="eyebrow">Fifth-year options</div><h2 class="h3">${opts.length} first-round pick${opts.length > 1 ? 's' : ''} entering the last year of his rookie deal</h2><p class="hint">Picking up the option adds one more season at a set salary. Decide before free agency, or the club makes its usual call (keep him if he's rated 74 or better).</p><table class="mini wide">${opts.map(p => `<tr><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button> <span class="small muted">${p.pos} · ${p.ovr} OVR · age ${p.age}</span></td><td class="num">${fmM(optionSalary(p))} in ${capYear() + 1}</td><td><button class="btn sm" data-act="popt" data-id="${p.id}" data-v="1">Pick it up</button> <button class="btn ghost sm" data-act="popt" data-id="${p.id}" data-v="0">Decline</button></td></tr>`).join('')}</table></section>` : '';
  return `${negBox}${optC}<section class="card"><div class="head"><div><div class="eyebrow">Re-sign players · ${list.length} expiring</div><h2 class="h2">Who stays?</h2></div><p class="hint">Cap space for ${capYear()}: <b>${fmS(capRoom(ME))}</b>. ${tagUsed ? 'You have used your franchise tag.' : 'One franchise tag a year: a one-year deal at a set price for his position.'} Anyone you don't sign goes to free agency.</p></div>
   ${w ? `<p class="flash">${esc(state.staff.HC.name)}: "${esc(w.txt)}"</p>` : ''}
   ${rows ? `<div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>Asking</th><th>Fair value</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">Nobody left to decide on.</p>'}
   ${nextBtn('Open free agency', rows ? '<span class="hint">Unsigned players leave.</span>' : '')}</section>`;
}
function proFAStep() {
  const L = PS(); const n = Object.keys(L.faOffers || {}).length; const signed = L.tx.filter(t => t.s === state.season && /Signed free agent/.test(t.txt)).slice(0, 8);
  const w = L.hcIn && L.hcIn.k === 'need' && !L.hcIn.judged ? L.hcIn : null;
  return `<section class="card"><div class="eyebrow">Free agency · wave ${Math.min(3, L.faWave + 1)} of 3</div><h2 class="h2">${L.faWave >= 3 ? 'The big signing period is over' : `${n} offer${n === 1 ? '' : 's'} out`}</h2>
   ${w ? `<p class="flash">${esc(state.staff.HC.name)}: "${esc(w.txt)}"</p>` : ''}
   <p>Make offers on the Free agency tab, then run a wave: every player with offers picks one. Other clubs bid too. Asking prices drop about 12% after each wave. Cap space: <b>${fmS(capRoom(ME))}</b>.</p>
   ${signed.length ? `<ul class="plainlist small">${signed.map(t => `<li>${esc(t.txt)}</li>`).join('')}</ul>` : ''}
   <div class="row gap mt"><button class="btn" data-act="tab" data-tab="fa">Open Free agency</button>${L.faWave < 3 ? `<button class="btn primary" data-act="fawave">Run wave ${L.faWave + 1}</button>` : ''}</div>
   ${nextBtn('Go to the draft', L.faWave < 3 ? '<span class="hint">Any waves left run first.</span>' : '')}</section>`;
}
function proDraftStep() { const D = PS().draft; return `${D && !D.done ? '' : `<section class="card"><div class="eyebrow">NFL Draft</div><h2 class="h2">The draft is complete</h2><p>Your class: ${(D ? D.mine : []).map(P).filter(Boolean).map(p => `${p.pos} ${esc(p.n)} (No. ${p.dr.no})`).join(', ') || 'no picks'}.</p>${nextBtn('Go to training camp')}</section>`}${vProDraft()}`; }
function proCampStep() {
  const L = PS(); const log = (L.campLog || []).map(x => { const p = P(x.id); return p ? `<li><b>${esc(p.n)}</b> ${p.pos} <span class="${x.d >= 0 ? 'pos' : 'neg'}">${x.d >= 0 ? '+' : ''}${x.d}</span> → ${p.ovr}</li>` : ''; }).join('');
  const over = state.roster.length - proMax(); const room = capRoom(ME);
  return `<section class="card"><div class="eyebrow">Training camp</div><h2 class="h2">${state.roster.length} players in camp</h2>
   ${log ? `<div class="eyebrow mt">Biggest changes</div><ul class="plainlist small cols2">${log}</ul>` : ''}
   ${over > 0 ? `<p class="flash bad">Cut ${over} player${over > 1 ? 's' : ''} to reach ${proMax()}.</p>${isGM() ? '<button class="btn ghost sm" data-act="pautocut">Let the staff make the cuts</button>' : ''}` : '<p class="small">The roster is at or under 53.</p>'}
   ${room < 0 ? `<p class="flash bad">You are ${fmM(-room)} over the cap. Restructure, release, or let the staff fix it.</p>${isGM() ? '<button class="btn ghost sm" data-act="pcapfix">Get under the cap</button>' : ''}` : `<p class="small">Cap space: ${fmS(room)}.</p>`}
   ${nextBtn(`Start the ${state.season + 1} season`)}</section>`;
}
function vProOff() {
  const L = PS(); const o = L.off; if (!o) return '<section class="card"><p class="muted">The offseason starts after the Super Bowl.</p></section>';
  const top = proOffTop(o.step);
  if (isCoach()) return top + proCoachOffStep(o.step);
  return top + [proReviewGM, proHCStep, proResignStep, proFAStep, proDraftStep, proCampStep][o.step]();
}

/* ---------- you as an NFL coach ---------- */
function proCoachStandingCard() {
  const co = state.co; const k = co.contract; const IL = incLbl('nfl');
  const inc = [k.inc.wins ? `${k.inc.wins}+ wins` : '', k.inc.conf ? IL.conf : '', k.inc.cfp ? IL.cfp : '', k.inc.title ? IL.title : ''].filter(Boolean);
  return `<section class="card"><div class="eyebrow">${esc(co.name)} · ${esc(roleTitle(co.role))}</div>
   ${meter('Job security', co.sec, co.role === 'HC' ? `How ownership rates your work. At or below ${coFireAt() + 6} after a season and you're fired.` : 'How the head coach rates your work. Your own unit counts most.')}
   ${meter('Reputation', co.rep, 'How the football world sees you. It decides which jobs call, in the NFL and in college.')}
   ${meter('GM relationship', (PS().aigm || { rel: 55 }).rel, 'How much the general manager listens to you.')}
   ${meter('Locker room', state.meters.morale, 'Adds or subtracts a little on game day.')}
   <div class="tiles mt"><div><span class="k">Salary</span><span class="v">${fmM(k.sal)}</span><span class="s">${k.left} year${k.left === 1 ? '' : 's'} left</span></div><div><span class="k">Career record</span><span class="v">${co.w}-${co.l}</span></div><div><span class="k">Earnings</span><span class="v">${fmM(co.earn)}</span></div></div>
   ${inc.length ? `<p class="small">Bonuses: ${inc.map(esc).join(', ')}.</p>` : ''}<button class="lnk small" data-act="tab" data-tab="career">Your career page</button></section>`;
}
function gameDayCard() {
  const co = state.co; if (!callsOff() && !callsDef()) return `<section class="card"><div class="eyebrow">Game day</div><p class="hint">${co.role === 'ST' ? 'Your units play every week; the coordinators call the plays.' : 'Your position group plays every week. The head coach and coordinators call the plays.'}</p></section>`;
  return `<section class="card"><div class="eyebrow">Game day · how much you call</div>${seg('cogameday', co.gameDay, Object.entries(CO_GAMEDAY).map(([kk, v]) => [kk, v[0]]))}<p class="hint">${esc(CO_GAMEDAY[co.gameDay][1])}</p></section>`;
}
function cinSummary() {
  const L = PS(); const c = L.cin; const nm = id => { const p = P(id) || faFind(id) || (L.dc ? L.dc.list.find(x => x.id === id) : null); return p ? `${p.pos} ${p.n}` : null; };
  const line = (lbl, list) => list.length ? `<li><b>${lbl}:</b> ${list.map(nm).filter(Boolean).map(esc).join(', ')}</li>` : '';
  const items = line('Keep', c.keep || []) + line('Free-agent targets', c.fa) + line('Draft', c.draft) + line('Release', c.cut) + line('Trade', c.trade);
  const log = (L.cinLog || []).slice(0, 5).map(x => `<li>${esc(x.txt)}</li>`).join('');
  return `<section class="card"><div class="head"><div class="eyebrow">Your input to the GM</div><button class="btn ghost sm" data-act="tab" data-tab="front">Front office</button></div><p class="small">GM: ${esc(PS().gmName || '—')}. He weighs your input (about ${Math.round(gmWeight() * 100)}% of the time, based on your role and your relationship) but makes the final call.</p>${items ? `<ul class="plainlist small">${items}</ul>` : '<p class="hint">No requests in. Mark players on the Front office, Free agency and Draft board tabs.</p>'}${log ? `<div class="eyebrow mt">What he did</div><ul class="plainlist small">${log}</ul>` : ''}</section>`;
}
function vProCoachOffice() {
  const co = state.co; const ms = michStrength();
  return `${eventCard()}<div class="grid2"><div class="col">${proNextCard()}${proLastCard()}${gameDayCard()}${newsCard()}</div>
   <div class="col">${proCoachStandingCard()}${authorityCard()}${cinSummary()}${co.role !== 'HC' ? focusCard() : practiceCard()}${injuryCard()}${relCardHTML()}
   <section class="card"><div class="eyebrow">Team strength</div><div class="tiles"><div><span class="k">Overall</span><span class="v">${ms.ovr.toFixed(0)}</span></div><div><span class="k">Offense</span><span class="v">${ms.off.toFixed(0)}</span></div><div><span class="k">Defense</span><span class="v">${ms.def.toFixed(0)}</span></div><div><span class="k">Expected wins</span><span class="v">${PS().expW}</span></div></div></section></div></div>`;
}
function cinButtons(p) {
  const L = PS(); if (!cinCanAbout(p.pos)) return '<p class="hint">Players outside your area are up to the head coach and the GM.</p>';
  const b = (k, on, off) => `<button class="btn ghost sm" data-act="cin" data-k="${k}" data-id="${p.id}" data-pos="${p.pos}">${(L.cin[k] || []).includes(p.id) ? on : off}</button>`;
  return `<div class="eyebrow mt">Your input to the GM</div><div class="row gap">${underContract(p) ? b('cut', 'Withdraw release request', 'Ask the GM to release him') + b('trade', 'Withdraw trade request', 'Ask the GM to trade him') : b('keep', 'Withdraw', 'Ask the GM to re-sign him')}</div>`;
}
function vProFront() {
  const L = PS(); const mine = state.roster.filter(p => cinCanAbout(p.pos)).sort((a, b) => b.ovr - a.ovr);
  const rows = mine.map(p => `<tr><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button></td><td>${p.pos}</td><td class="num">${p.age}</td><td>${ovrTag(p.ovr)}</td><td class="small">${esc(kTxt(p))}</td><td><div class="row gap">${underContract(p) ? `<button class="chip${L.cin.cut.includes(p.id) ? ' on' : ''}" data-act="cin" data-k="cut" data-id="${p.id}" data-pos="${p.pos}">Release</button><button class="chip${L.cin.trade.includes(p.id) ? ' on' : ''}" data-act="cin" data-k="trade" data-id="${p.id}" data-pos="${p.pos}">Trade</button>` : `<button class="chip${(L.cin.keep || []).includes(p.id) ? ' on' : ''}" data-act="cin" data-k="keep" data-id="${p.id}" data-pos="${p.pos}">Re-sign</button>`}</div></td></tr>`).join('');
  return `<div class="grid2"><div class="col">${cinSummary()}</div><section class="card"><div class="eyebrow">How it works</div><p class="small">As ${aAn(roleTitle(state.co.role).toLowerCase())}, you have a say on ${state.co.role === 'HC' ? 'the whole roster' : 'the players at your positions'}: up to ${CIN_MAX()} requests of each kind. Free-agent targets go in on the Free agency tab, draft picks on the Draft board. The GM acts on releases and trades right away when he agrees (trades only before the week 9 deadline), on re-signings when the offseason reaches that step, and on targets and picks when free agency and the draft come around.</p></section></div>
   <section class="card"><div class="eyebrow">Your players</div><div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>Contract</th><th>Ask the GM to</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function proCoachReview() {
  const co = state.co; const L = PS(); const rv = L.off.review; const r = co.review || {}; const ur = r.ur || {};
  if (rv.fresh || !co.review) return `<section class="card"><div class="eyebrow">New job</div><h2 class="h2">Welcome to the ${esc(myName())}</h2><p>You're the ${esc(roleTitle(co.role).toLowerCase())}. The GM, ${esc(L.gmName || '—')}, runs the roster; you get a say.</p>${nextBtn('Continue')}</section>`;
  const d = r.sec - r.secBefore;
  return `<section class="card"><div class="eyebrow">Season review · ${esc(roleTitle(co.role))}</div><h2 class="h2">${rv.w}-${rv.l} · ${esc(PO_LABEL[rv.po])}</h2>
   ${co.fired ? `<p class="flash bad">${esc(co.fired.why)}</p>` : co.newBoss ? `<p class="flash">The club fired head coach ${esc(co.newBoss.old)}. A new head coach arrives this offseason, and he is keeping you.</p>` : ''}
   <div class="tiles"><div><span class="k">Job security</span><span class="v">${r.secBefore} → ${r.sec}</span><span class="s ${d >= 0 ? 'pos' : 'neg'}">${d >= 0 ? '+' : ''}${d}</span></div><div><span class="k">Reputation</span><span class="v">${co.rep}</span><span class="s ${r.repD >= 0 ? 'pos' : 'neg'}">${r.repD >= 0 ? '+' : ''}${r.repD}</span></div><div><span class="k">Scoring offense</span><span class="v">No. ${ur.off}</span><span class="s">expected ${r.eOff}</span></div><div><span class="k">Scoring defense</span><span class="v">No. ${ur.def}</span><span class="s">expected ${r.eDef}</span></div></div>
   ${r.bonus ? `<p class="small">Incentives earned: <b>${fmM(r.bonus)}</b> (${esc(r.why.join(', '))}).</p>` : ''}
   ${nextBtn('Go to the job market')}</section>`;
}
function proCoachOffStep(step) {
  const L = PS();
  if (step === 0) return proCoachReview();
  if (step === 1) return jobMarketHTML();
  if (step === 2) return `<section class="card"><div class="eyebrow">Front office</div><h2 class="h2">Re-signings</h2><p>The GM decides who to bring back. Players at your positions with expiring deals: ${state.roster.filter(p => !underContract(p) && cinCanAbout(p.pos)).map(p => `${esc(p.n)} (${p.pos}, ${p.ovr})`).join(', ') || 'none'}.</p><p class="small">Mark the ones you want kept on the Front office tab before you continue.</p>${nextBtn('On to free agency')}</section>${vProFront()}`;
  if (step === 3) return `<section class="card"><div class="eyebrow">Free agency</div><h2 class="h2">The GM is shopping</h2><p>Mark targets on the Free agency tab. When you continue, free agency plays out and the GM bids with your input in mind.</p><div class="row gap"><button class="btn" data-act="tab" data-tab="fa">Open Free agency</button></div>${nextBtn('Go to the draft')}</section>`;
  if (step === 4) return `<section class="card"><div class="eyebrow">NFL Draft</div><h2 class="h2">${L.draft && L.draft.done ? 'The draft is done' : 'Draft week'}</h2><p>${L.draft && L.draft.done ? `The new class: ${(L.draft.mine || []).map(P).filter(Boolean).map(p => `${p.pos} ${esc(p.n)}`).join(', ') || 'none'}.` : 'Mark the prospects you want on the board below. The GM makes the picks.'}</p>${nextBtn(L.draft && L.draft.done ? 'Go to training camp' : 'Run the draft and go to camp')}</section>${vProDraft()}`;
  const log = (L.campLog || []).map(x => { const p = P(x.id); return p ? `<li><b>${esc(p.n)}</b> ${p.pos} <span class="${x.d >= 0 ? 'pos' : 'neg'}">${x.d >= 0 ? '+' : ''}${x.d}</span> → ${p.ovr}</li>` : ''; }).join('');
  return `<section class="card"><div class="eyebrow">Training camp</div><h2 class="h2">Get ready for ${state.season + 1}</h2>${state.co.role !== 'HC' ? `<p class="small">Your group's development: ${state.co.lastDev >= 0 ? '+' : ''}${state.co.lastDev || 0} a player on average.</p>` : ''}${log ? `<ul class="plainlist small cols2">${log}</ul>` : ''}<p class="small">The GM trims the roster to ${proMax()} when camp breaks.</p>${nextBtn(`Start the ${state.season + 1} season`)}</section>`;
}

/* ---------- your career as an executive ---------- */
function vExecCareer() {
  const e = execState(); const jobs = jobsLog().slice().reverse();
  const rows = jobs.map(j => `<tr><td>${j.s}</td><td>${j.lvl === 'nfl' ? 'NFL' : 'College'}</td><td>${esc(jobName(j))}</td><td>${j.role === 'GM' ? 'General manager' : 'Athletic director'}</td><td class="num">${j.w}-${j.l}</td><td>${j.po != null ? esc(PO_LABEL[j.po]) : ''}</td></tr>`).join('');
  const now = isPro() ? `General manager of the ${esc(myName())}` : `Athletic director at ${esc(myName())}`;
  const offers = isPro() ? PS().offers : e.offers;
  return `<div class="grid2"><section class="card"><div class="eyebrow">Your career</div><h2 class="h2">${now}</h2>
   ${meter('Reputation', e.rep, 'Built season by season. Strong ADs get calls from NFL clubs; strong GMs hear from big college programs.')}
   <p class="small">${jobs.length} season${jobs.length === 1 ? '' : 's'} on the record. Winning more than expected, playoff runs and titles build your name.</p></section>
   ${offers && offers.length && state.phase === 'offseason' && !state.gameOver && (isPro() ? PS().off && PS().off.step === 0 : state.off && state.off.step === 0) ? execOffersHTML(offers) : '<section class="card"><div class="eyebrow">Job offers</div><p class="muted">Offers come in after each season, in the offseason review.</p></section>'}</div>
   <section class="card"><div class="eyebrow">Season by season</div><div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Level</th><th>Team</th><th>Job</th><th>Record</th><th>Postseason</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="muted">Your first season is still ahead.</td></tr>'}</tbody></table></div></section>`;
}
function proSettings() {
  const st = state.settings; const gameSeg = (k, cur, opts) => seg('setgame', String(cur), opts, `data-k="${k}"`);
  if (isCoach()) return displaySettingsHTML('ad', coachSettingsHTML());
  return displaySettingsHTML('ad', `<section class="card"><div class="eyebrow">Gameplay · slot ${slot}</div>
   ${setRow('Difficulty', esc(DIFF[st.diff].desc), gameSeg('diff', st.diff, Object.entries(DIFF).map(([k, d]) => [k, d.label])))}
   ${setRow('Big calls in live games', 'Halftime adjustments, fourth downs and the final drive.', gameSeg('ask', !!st.ask, [['true', 'Ask me'], ['false', 'Coach decides']]))}
   ${setRow('Live game speed', 'How fast live games start. You can change it during a game.', prefSeg('liveSpeed', [[1, 'Normal'], [2, 'Fast'], [3, 'Very fast']]))}
   ${setRow('Field view', 'Watch each play on a top-down field during live games: dots with jersey numbers line up, the ball is snapped and the play runs. It follows the live game speed.', prefSeg('field', [['on', 'On'], ['off', 'Off']]))}
   ${setRow('Play clock', 'When you call plays in a live game, you get 20 seconds per play. If it runs out, your staff makes the call.', prefSeg('playClock', [['off', 'Off'], ['on', 'On']]))}
   ${setRow('Keyboard shortcuts', 'N for next, L to watch live, 1–9 for tabs, U to undo, G for the glossary, ? for the full list.', prefSeg('keys', [['on', 'On'], ['off', 'Off']]))}
   <div class="row gap mt"><button class="btn ghost sm" data-act="kbhelp">Keyboard shortcuts</button><button class="btn ghost sm" data-act="glossary">What the numbers mean</button></div>
   ${setRow('Sound effects', 'Crowd roar, final whistle and a victory jingle.', gameSeg('sound', !!st.sound, [['true', 'On'], ['false', 'Off']]))}
   ${autoSettingsHTML()}
   <p class="hint mt">Save slots and save codes are in <button class="lnk" data-act="tab" data-tab="file">Save file</button>.</p></section>${rulesCardHTML()}`);
}
function jobsModalHTML() { const go = state.gameOver; if (!go) return '<p class="muted">No open jobs right now.</p>'; return `<div class="eyebrow">Out of a job</div><h2 class="h2">Open jobs</h2><p class="muted">${esc(go.reason)}</p>${execOffersHTML(go.jobs || [], true)}<div class="row gap mt"><button class="btn ghost" data-act="close">Not now</button></div>`; }

/* ---------- views ---------- */
function proView() {
  return { office: vProOffice, career: isCoach() ? vCoachCareer : vExecCareer, schedule: vProSchedule, roster: vProRoster, depth: vDepth, staff: vProStaff, cap: vProCap, fa: vProFA, trades: vProTrades, front: vProFront, draft: vProDraft, standings: vProStandings, league: vProLeague, history: vProHistory, records: vRecords, lghist: vLgHist, off: vProOff, file: vFile, settings: proSettings }[ui.tab] || vProOffice;
}

/* ---------- moving back to college: the college world plays the seasons you were away ---------- */
async function runCatchUp() {
  if (!state.pendingArrive || ui.catching) return; ui.catching = true; const n0 = collegeNeedsSeasons();
  openModal(`<div class="eyebrow">Moving</div><h2 class="h2" id="cuh">Catching up on college football…</h2><div class="bar"><i class="good" id="cub" style="width:2%"></i></div><p class="hint">The college world plays the ${n0} season${n0 === 1 ? '' : 's'} you spent in the NFL.</p>`, 'Moving');
  try {
    while (collegeNeedsSeasons() > 0) { collegeSimSeason(); const done = n0 - collegeNeedsSeasons(); const b = $('#cub'); if (b) b.style.width = Math.max(2, Math.round(done / Math.max(1, n0) * 100)) + '%'; await new Promise(r => setTimeout(r, 0)); }
    collegeArrive();
  } catch (e) {
    // the move is not finished: keep it pending and offer a retry instead of a false welcome (S02)
    console.error(e); ui.catching = false; save();
    openModal(`<div class="eyebrow">Moving</div><h2 class="h2">The move didn't finish</h2><p>Something went wrong while the college world caught up (${esc(e.message || 'unknown error')}). Your progress is saved and the move is still waiting.</p><div class="row gap mt"><button class="btn primary" data-act="catchretry">Try again</button></div><p class="hint">Reloading the page also finishes the move.</p>`, 'Moving');
    return;
  } finally { ui.catching = false; }
  closeModal(); resetUi(); ui.tab = 'office'; applyTheme(); after(isCoach() ? `Welcome to ${myName()}. The ${state.season} season is about to start.` : `You're the new athletic director at ${myName()}. The ${state.season} season is about to start.`); window.scrollTo(0, 0);
}
const readSel = (id, dflt) => { const el = document.getElementById(id); return el && el.value ? el.value : dflt; };
const shapeOpts = () => Object.entries(SHAPES).map(([k, l]) => `<option value="${k}">${l}${k === 'front' ? ' (players like it)' : k === 'back' ? ' (players want a bit more)' : ''}</option>`).join('');
// every listed box must hold a number in range; returns the message to show, or '' when the form is fine (QOL-03)
const numErrs = list => { const e = list.map(([id, lo, hi, l]) => numIn(id, lo, hi, l).err).filter(Boolean); return e.length ? `Check the offer: ${e.join(' ')} Nothing was sent.` : ''; };
const readNum = (id, dflt) => { const el = document.getElementById(id); const v = el ? parseFloat(el.value) : NaN; return Number.isFinite(v) ? v : dflt; };

/* ---------- actions ---------- */
Object.assign(actions, {
  catchretry() { hideModal(); runCatchUp(); },
  pnext() {
    const L = PS(); const step = L.off ? L.off.step : 0; const ok = proOffNext();
    if (state.pendingArrive) return runCatchUp();
    if (!isPro()) { ui.tab = 'off'; return after(); }
    if (state.phase !== 'offseason') ui.tab = 'office';
    let why = '';
    if (!ok) why = step === 1 ? 'Hire a head coach first.' : step === 4 ? "You're on the clock. Make your pick, or auto-draft the rest." : step === 5 ? (state.roster.length > proMax() ? `Cut down to ${proMax()} players first.` : 'Get under the cap first.') : state.gameOver ? 'You need a new job first.' : 'Finish this step first.';
    after(why); window.scrollTo(0, 0);
  },
  jobsopen() { openModal(jobsModalHTML(), 'Open jobs'); },
  jobtake(d) { const r = execTake(d.id); ui.confirm = null; if (!$('#modal').hidden) hideModal(); if (r === 'catchup') return runCatchUp(); if (!r) return after('That job is no longer open.'); resetUi(); ui.tab = isPro() ? 'off' : 'office'; applyTheme(); after(isPro() ? `Welcome to the ${myName()}.` : `Welcome to ${myName()}.`); window.scrollTo(0, 0); },
  prohcfire() { ui.confirm = null; proFireHC(); after(); },
  prohchire(d) { if (proHireHC(d.id)) after(`${state.staff.HC.name} is your new head coach.`); },
  rsyes(d) { const p = P(d.id); if (!p) return; const a = askFor(p, false); if (a.apy > capRoom(ME) + 0.01) return after(`Not enough cap space: he wants ${fmM(a.apy)} and you have ${fmS(capRoom(ME))}.`); signOwn(p, a.apy, a.yrs, false); after(); },
  rsneg(d) { ui.rsFor = d.id; render(); window.scrollTo(0, 0); }, rsclose() { ui.rsFor = null; render(); },
  rssub(d) { const p = P(d.id); if (!p) return; const bad = numErrs([['rs-apy', PRO_MINSAL, 99, '$M a year'], ['rs-yrs', 1, 6, 'Years']]); if (bad) return after(bad); const apy = readNum('rs-apy', 1), yrs = readNum('rs-yrs', 1); const r = offerOwn(d.id, apy, yrs, readSel('rs-sh', 'flat')); if (r === 'signed') { ui.rsFor = null; return after(`${p.n} signed.`); } if (r === 'cap') return after(`That doesn't fit under the cap: you have ${fmS(capRoom(ME))} in space.`); after(r === 'counter' ? `${p.n} came back at ${fmM(p.ask.apy)} a year.` : `${p.n} is going to test free agency.`); },
  rstag(d) { const p = P(d.id); if (!p) return; if (tagValue(p.pos) > capRoom(ME) + 0.01) return after('Not enough cap space for the tag.'); tagPlayer(d.id); after(); },
  rsno(d) { const p = P(d.id); letWalk(d.id); after(p ? `${p.n} will go to free agency.` : ''); },
  fpos(d) { ui.fpos = d.v; render(); }, faopen(d) { ui.faFor = d.id; render(); window.scrollTo(0, 0); }, faclose() { ui.faFor = null; render(); },
  fasub(d) { const p = faFind(d.id); if (!p) return; const bad = numErrs([['fa-apy', PRO_MINSAL, 99, '$M a year'], ['fa-yrs', 1, 5, 'Years']]); if (bad) return after(bad); const apy = readNum('fa-apy', p.ask.apy), yrs = readNum('fa-yrs', p.ask.yrs); const r = faSignNow(d.id, apy, yrs, readSel('fa-sh', 'flat')); ui.faFor = r === 'ok' || r === 'signed' ? null : ui.faFor; after(r === 'ok' ? `Offer placed. ${p.n} decides when the next wave runs.` : r === 'signed' ? `${p.n} signed.` : r === 'cap' ? 'Not enough cap space for that offer.' : r === 'full' ? 'Your roster is full.' : r === 'low' ? `${p.n} wants closer to ${fmM(p.ask.apy)}.` : 'He has already signed elsewhere.'); },
  faclear(d) { delete PS().faOffers[d.id]; after(); },
  fawave() { const before = state.roster.length; proFaWave(); const got = state.roster.length - before; after(`Wave ${PS().faWave} done. ${got > 0 ? `You signed ${got} player${got > 1 ? 's' : ''}.` : 'Nobody new signed with you.'}`); },
  trpl(d) { const tr = tradeDraft(); const s = d.side === 'give' ? tr.give : tr.get; const i = s.pl.indexOf(d.id); if (i >= 0) s.pl.splice(i, 1); else s.pl.push(d.id); tr.msg = ''; tr.cf = false; render(); refocus({ act: 'trpl', id: d.id }); },
  trpk(d) { const tr = tradeDraft(); const s = d.side === 'give' ? tr.give : tr.get; const k = +d.i; const i = s.pk.indexOf(k); if (i >= 0) s.pk.splice(i, 1); else s.pk.push(k); tr.msg = ''; tr.cf = false; render(); refocus({ act: 'trpk', i: d.i, side: d.side }); },
  trsweet() { const tr = tradeDraft(); const c = tradeCheck(tr.tid, tr.give, tr.get); const i = c.need ? sweetener(tr.tid, c.need) : null; if (i != null && !tr.give.pk.includes(i)) tr.give.pk.push(i); tr.cf = false; render(); },
  trgo() { const tr = tradeDraft(); const r = tradeExec(tr.tid, tr.give, tr.get); if (r.ok) { ui.tr = null; after('Trade done.'); } else { tr.msg = r.why; render(); } },
  trclear() { ui.tr = null; render(); },
  trask() { const tr = tradeDraft(); tr.cf = true; render(); }, trback() { const tr = tradeDraft(); tr.cf = false; render(); },
  toacc(d) { const r = acceptOffer2(d.id); after(r.ok ? (r.why || '') + 'Trade done.' : r.why); }, todec(d) { PS().tradeOffers = (PS().tradeOffers || []).filter(o => o.id !== d.id); after('Offer declined.'); },
  ptrade(d) { hideModal(); ui.tr = { tid: ui.tr && ui.tr.tid || null, give: { pl: [d.id], pk: [] }, get: { pl: [], pk: [] }, msg: '' }; ui.tab = 'trades'; render(); window.scrollTo(0, 0); },
  ptradefor(d) { hideModal(); ui.tr = { tid: d.tid, give: { pl: [], pk: [] }, get: { pl: [d.id], pk: [] }, msg: '' }; ui.tab = 'trades'; render(); window.scrollTo(0, 0); },
  dscout(d) { if (scoutProspect(d.id)) after(); }, dautoscout() { autoScout(); after('Scouts sent to the top of the board.'); },
  dfpos(d) { ui.dfpos = d.v; render(); }, dsort(d) { ui.dsort = d.v; render(); },
  dpick(d) { if (draftPick(d.id)) { draftRun(true); after(); } },
  drun() { draftRun(true); after(); }, dauto1() { const D = PS().draft; const s = D && D.slots[D.cur]; if (!s || s.own !== ME) return; const p = draftChoose(ME); if (p) { draftMake(s, p); D.cur++; draftRun(true); } after(); },
  dall() { draftRun(false); after('The draft is complete.'); },
  ddown(d) { if (draftTradeDown(d.tid)) { draftRun(true); after('Traded down.'); } }, dupq(d) { ui.dup = +d.v; render(); }, dup(d) { if (draftTradeUp(+d.v)) { ui.dup = null; draftRun(true); after('Traded up.'); } },
  pautocut() { const out = trimRoster(ME, proMax()); after(out.length ? `Released: ${out.join(', ')}.` : ''); },
  pcapfix() { const out = capFix(ME); after(out.length ? `To get under the cap: ${out.join('; ')}.` : 'Nothing more to do.'); },
  pask(d) { ui.confirm = d.k; openModal(proPlayerModal(d.id)); },
  pcut(d) { const p = P(d.id); ui.confirm = null; const r = cutPlayer(d.id); hideModal(); after(r ? `${p.n} released. Dead money: ${fmM(r.dead)}; cap saved: ${fmS(r.saves)}.` : ''); },
  prs(d) { ui.confirm = null; const s = restructure(d.id); openModal(proPlayerModal(d.id)); after(s ? `Restructured: ${fmM(s)} saved this year.` : ''); },
  pxext(d) { ui.extFor = d.id; openModal(proPlayerModal(d.id)); }, pxcancel() { const id = ui.extFor; ui.extFor = null; if (id) openModal(proPlayerModal(id)); },
  pxsub(d) { const p = P(d.id); const bad = numErrs([['ex-apy', PRO_MINSAL, 99, '$M a year'], ['ex-yrs', 1, 5, 'Added years']]); if (bad) return after(bad); const apy = readNum('ex-apy', 1), yrs = readNum('ex-yrs', 1); const r = offerOwn(d.id, apy, yrs, readSel('ex-sh', 'flat')); if (r === 'signed') ui.extFor = null; openModal(proPlayerModal(d.id)); after(r === 'signed' ? `${p.n} extended.` : r === 'cap' ? `That extension doesn't fit under the cap: you have ${fmS(capRoom(ME))} in space.` : r === 'counter' ? `${p.n} wants ${fmM(p.ask.apy)} a year.` : `${p.n} isn't interested in extending right now.`); },
  cin(d) { const r = cinToggle(d.k, d.id, d.pos); if (isPro() && r === 'on' && (d.k === 'cut' || d.k === 'trade') && (state.phase === 'offseason' || state.week <= 9)) myGmActOnInput(); if (!$('#modal').hidden && P(d.id)) openModal(proPlayerModal(d.id)); after(r === 'role' ? 'That player is outside your area.' : r === 'max' ? `You can have ${CIN_MAX()} requests of that kind at a time.` : ''); },
  pconf(d) { ui.pconf = d.v; render(); },
});
// select boxes in NFL views
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset || !t.dataset.chg || typeof state === 'undefined' || !state) return;
  if (t.dataset.chg === 'trtid') { ui.tr = { tid: t.value || null, give: tradeDraft().give, get: { pl: [], pk: [] }, msg: '' }; render(); const el = document.getElementById('trtid'); if (el) el.focus(); }
  if (t.dataset.chg === 'lgwk') { ui.lgwk = +t.value; render(); const el = document.getElementById('lgwk'); if (el) el.focus(); }
});

/* ---------- starting in the NFL ---------- */
function nflPickerHTML(f) {
  const id = NFL_BY[f.nfl] ? f.nfl : 'DET'; const t = NFL_BY[id];
  const groups = ['AFC', 'NFC'].map(cf => NFL_DIVS.map(dv => `<optgroup label="${cf} ${dv}">${NFL.filter(x => x.conf === cf && x.div === dv).map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')).join('');
  const tier = t.p >= 85 ? 'Contender' : t.p >= 77 ? 'Playoff hopeful' : t.p >= 68 ? 'Middle of the pack' : 'Rebuild';
  return `<label class="fld wide"><span>NFL club</span><select id="nc-nfl" data-chg="ncnfl">${groups}</select></label>
   <div class="schoolpv"><span class="sw" style="background:${t.c1}"></span><span class="sw" style="background:${t.c2}"></span><div><b>${esc(t.name)}</b> · ${t.conf} ${t.div} · ${tier}<div class="small muted">Rosters and contracts are generated. You start in the offseason before the 2026 season: free agency and the draft are ahead.</div></div></div>`;
}
document.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset || t.dataset.chg !== 'ncnfl') return; if (ui.coForm && document.getElementById('coform')) { readCoForm(); } else if (ui.nc) ui.nc.nfl = t.value; if (typeof appMode !== 'undefined' && appMode === 'home') { if (ui.coForm) ui.coForm.nfl = t.value; render(); } else render(); const el = document.getElementById('nc-nfl'); if (el) el.focus(); });
Object.assign(actions, {
  jobsopen() { ui.overHide = true; render(); openModal(jobsModalHTML(), 'Open jobs'); },
  adpicklvl(d) { const sel = document.getElementById('nc-tid'); if (sel) ui.nc.tid = sel.value; const sn = document.getElementById('nc-nfl'); if (sn) ui.nc.nfl = sn.value; ui.nc.lvl = d.v; render(); refocus({ act: 'adpicklvl', v: d.v }); },
});

