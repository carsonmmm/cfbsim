/* ===================== COACH MODE (interface) =====================
 * Coach mode reuses the AD screens (schedule, roster, recruiting, polls, live games) with the AD's
 * business tabs hidden. This file adds the coach's header, office, career page, job market,
 * contract talks, recruiting trips, defensive play calling, settings and the setup form. */
const secWord = v => (v >= 75 ? 'Rock solid' : v >= 55 ? 'Secure' : v >= 35 ? 'Uneasy' : v >= 20 ? 'Hot seat' : 'On the brink');
function coachHeaderHTML() {
  const co = state.co; const m = T(ME); const r = rankOf(ME);
  const wl = state.phase === 'offseason' ? 'Offseason' : weekLabel(state.week); const inSeason = state.phase !== 'offseason';
  const mgNow = michGameThisWeek(state.week); const nm = myName();
  return `<div class="brand"><div class="wm${nm.length > 14 ? ' long' : ''}" data-badge="${esc(co.role)}"><span class="wmu">${esc(nm.toUpperCase())}</span><span class="wmn">${esc(nm)}</span><span class="wmt">${esc(co.name)}, ${esc(roleTitle(co.role))}</span></div><div class="sub">Football · ${esc(co.name)} · ${esc(roleTitle(co.role))} · Slot ${slot}<span class="savew"> · <span class="savest">${esc(saveStateTxt())}</span></span></div></div>
  <div class="board">
    <div class="cell"><span class="k">Season</span><span class="v">${state.season}</span></div>
    <div class="cell wide"><span class="k">Calendar</span><span class="v sm">${esc(wl)}</span></div>
    <div class="cell"><span class="k">Record</span><span class="v">${m.w}-${m.l}</span><span class="s">${m.cw}-${m.cl} ${confShort(m.conf)}</span></div>
    <div class="cell"><span class="k">AP poll</span><span class="v">${r ? '#' + r : 'NR'}</span></div>
    <div class="cell"><span class="k">Job security</span><span class="v">${co.sec}</span><span class="s">${secWord(co.sec)}</span></div>
  </div>
  <div class="acts">${toolsHTML()}
    ${liveBusy() ? `<div class="row gap"><button class="btn primary" data-act="liveresume">Resume live game · ${esc(liveScoreText())}</button></div>` : `<div class="row gap">${inSeason && mgNow && !state.event ? '<button class="btn watch" data-act="live">Coach it live</button>' : ''}<button class="btn primary" data-act="primary">${esc(primaryLabel())}</button></div>`}
    ${!liveBusy() ? `<details class="simmenu"><summary>More sim options</summary><div class="menu">
      ${state.phase !== 'offseason' ? '<button data-act="simdec">Sim to the next decision</button>' : ''}${state.phase === 'regular' ? '<button data-act="simloss">Sim to next loss</button><button data-act="simreg">Sim to end of regular season</button>' : ''}
      ${inSeason ? '<button data-act="simpost">Sim to the offseason</button>' : ''}
      <div class="mlabel">Sim whole seasons (offseasons included, with your automation settings)</div>
      <div class="yrs">${[1, 3, 5, 10].map(n => `<button data-act="simyears" data-n="${n}">${n} ${n === 1 ? 'season' : 'seasons'}</button>`).join('')}</div>
    </div></details>` : ''}
  </div>`;
}

/* ---------- office ---------- */
// QOL-17: what your job is judged on and what the next rung asks for
function coachNextCard() {
  const co = state.co; if (!co || !co.role) return ''; const tier = ROLE_TIER[co.role]; let ten = 0; for (let i = co.hist.length - 1; i >= 0 && ROLE_TIER[co.hist[i].role] >= tier; i--) ten++;
  const last = co.hist[co.hist.length - 1]; const grp = rolePositions(co.role); const st = state.roster.filter(p => grp.includes(p.pos) && state.depth[p.pos] && state.depth[p.pos].indexOf(p.id) < (START[p.pos] || 1));
  const avg = st.length ? Math.round(st.reduce((s, p) => s + p.ovr, 0) / st.length) : null;
  const judged = co.role === 'HC' ? 'Wins against expectations, the conference and the postseason, plus the AD\'s goals.' : co.role === 'OC' ? 'Your offense\'s national rank, then the team\'s record.' : co.role === 'DC' ? 'Your defense\'s national rank, then the team\'s record.' : 'How your position group develops and plays, then the team\'s record.';
  const unit = last ? (co.role === 'OC' ? `Offense ranked No. ${last.off} last season.` : co.role === 'DC' ? `Defense ranked No. ${last.def} last season.` : `${last.w}-${last.l} last season.`) : 'No full season here yet.';
  const nextRole = tier >= 3 ? null : tier === 2 ? 'head coach' : 'coordinator'; const want = 3;
  const ladder = !nextRole ? 'You are a head coach: bigger programs want a few strong seasons first, and an NFL head job wants NFL experience.' : balOn() ? `Programs want about ${want} seasons at this level before they hire you as a ${nextRole}. You have ${ten}.${ten < want ? ' A breakout year (about +8 in wins over losses across two seasons) speeds that up.' : ' You are ready for the next rung.'}` : `A strong season and a good reputation get calls for ${nextRole} jobs.`;
  return `<section class="card"><div class="eyebrow">Your next step</div><ul class="plainlist small"><li><b>Judged on:</b> ${judged}</li><li><b>Your unit:</b> ${esc(unit)}${avg != null && tier < 3 ? ` Starters in your group average ${avg} OVR.` : ''}</li><li><b>Contract:</b> ${esc(fmM(co.contract.sal))} a year, ${co.contract.yrs} year${co.contract.yrs === 1 ? '' : 's'}.</li><li><b>Moving up:</b> ${esc(ladder)}</li></ul></section>`;
}
function coachStandingCard() {
  const co = state.co; const k = co.contract;
  const inc = [k.inc.wins ? `${k.inc.wins}+ wins` : '', k.inc.conf ? 'conference title' : '', k.inc.cfp ? 'playoff' : '', k.inc.title ? 'national title' : ''].filter(Boolean);
  return `<section class="card"><div class="eyebrow">${esc(co.name)} · ${esc(roleTitle(co.role))}</div>
   ${meter('Job security', co.sec, co.role === 'HC' ? `How the AD rates your work. At or below ${coFireAt()} after a season and you're fired.` : 'How the head coach rates your work. Your own unit counts most.')}
   ${meter('Reputation', co.rep, 'How the rest of college football sees you. It decides which jobs call.')}
   ${co.role === 'HC' ? meter('Hot seat', state.meters.hot, 'How loudly fans want you gone. Losses to teams you should beat make it worse.', true) : ''}
   ${meter('Locker room', state.meters.morale, 'Adds or subtracts a little on game day.')}
   <div class="tiles mt"><div><span class="k">Salary</span><span class="v">${fmM(k.sal)}</span><span class="s">${k.left} year${k.left === 1 ? '' : 's'} left</span></div><div><span class="k">Career record</span><span class="v">${co.w}-${co.l}</span><span class="s">${co.titles ? co.titles + ' national title' + (co.titles > 1 ? 's' : '') : co.hist.length + ' season' + (co.hist.length === 1 ? '' : 's')}</span></div><div><span class="k">Buyout</span><span class="v">${k.buy}%</span><span class="s">of what's left if they fire you</span></div><div><span class="k">Career earnings</span><span class="v">${fmM(co.earn)}</span></div></div>
   ${inc.length ? `<p class="small">Bonuses: ${inc.map(esc).join(', ')}.</p>` : ''}<button class="lnk small" data-act="tab" data-tab="career">Your career page</button></section>`;
}
function adRequestsCard() {
  const co = state.co; const rows = Object.entries(REQS).filter(([, r]) => !r.hc || co.role === 'HC').map(([k, r]) => {
    const used = reqUsed(k); const odds = Math.round(reqOdds(k) * 100);
    const ctl = used ? `<span class="pill ${used === 'yes' ? 'good' : 'bad'}">${used === 'yes' ? 'Approved' : 'Turned down'}</span>` : k === 'fac' ? `<div class="row gap"><select id="reqfac" aria-label="Facility to ask for">${state.facilities.filter(f => !f.building && f.lvl < 5).map(f => `<option value="${f.id}">${esc(facName(f.id))} (level ${f.lvl})</option>`).join('')}</select><button class="btn sm" data-act="coreq" data-k="fac">Ask (${odds}%)</button></div>` : `<button class="btn sm" data-act="coreq" data-k="${k}">Ask (${odds}%)</button>`;
    return `<div class="cand"><div><b>${esc(r.label)}</b><div class="small muted">${esc(r.hint)}</div></div>${ctl}</div>`;
  }).join('');
  const last = co.reqLog.filter(x => x.s === state.season).slice(0, 3).map(x => `<li>${esc(x.txt)}</li>`).join('');
  return `<section class="card"><div class="eyebrow">Requests to the athletic director</div><p class="hint">One of each a year. The AD decides on wins, the board's mood and the money in the bank. You don't run the budget, but you can ask.</p>${rows}${last ? `<ul class="news small mt">${last}</ul>` : ''}</section>`;
}
function focusCard() {
  const co = state.co; const pos = rolePositions(co.role);
  const grp = state.roster.filter(p => pos.includes(p.pos)); const avg = grp.length ? Math.round(grp.reduce((s, p) => s + p.ovr, 0) / grp.length) : 0;
  return `<section class="card"><div class="eyebrow">Practice · ${esc(roleTitle(co.role))}</div><h2 class="h3">Where your practice time goes</h2>${seg('cofocus', co.focus || 'balanced', Object.entries(CO_FOCUS).map(([k, v]) => [k, v[0]]))}<p class="hint">${esc(CO_FOCUS[co.focus || 'balanced'][1])} Your group: ${grp.length} players, average OVR ${avg}. Development counts toward your review${co.lastDev != null ? `; last offseason your players gained ${co.devGain} OVR on average (${co.lastDev >= 0 ? '+' : ''}${co.lastDev} vs. the rest of the team)` : ''}.</p></section>`;
}
function vCoachOffice() {
  const co = state.co; const ms = michStrength(); let next = '';
  const nx = state.phase !== 'offseason' ? mGames().find(g => !g.done) : null; const last = mGames().filter(g => g.done).pop();
  if (nx) {
    const opp = oppOf(nx); const p = mWinProb(nx); const os = strength(opp); const thisWeek = nx.wk === state.week; const rv = rivalOf(opp) ? `<span class="pill maize">${esc(rivalOf(opp))}</span>` : '';
    const caller = callsOff() || callsDef(); const plan = co.role === 'HC' || co.role === 'OC' || co.role === 'DC';
    next = `<section class="card next"><div class="eyebrow">${esc(weekLabel(nx.wk))}${nx.name && nx.type !== 'reg' ? ' · ' + esc(nx.name) : ''}</div>
      <div class="matchup"><div class="side">${tchip(ME, { rec: true })}</div><div class="at">${siteOf(nx)}</div><div class="side">${tchip(opp, { rec: true })}</div></div><div class="venue">${rv}</div>
      <div class="wp"><div class="wpbar"><i style="width:${Math.round(p * 100)}%"></i></div><div class="wpl"><span>${esc(myName())} win chance <b>${Math.round(p * 100)}%</b></span><span>${esc(teamName(opp))} ${100 - Math.round(p * 100)}%</span></div></div>
      <table class="mini"><tr><th></th><th>OFF</th><th>DEF</th><th>ST</th></tr><tr><td>${esc(teamName(ME))}</td><td>${ms.off.toFixed(0)}</td><td>${ms.def.toFixed(0)}</td><td>${ms.st.toFixed(0)}</td></tr><tr><td>${esc(teamName(opp))}</td><td>${os.off.toFixed(0)}</td><td>${os.def.toFixed(0)}</td><td>${os.st.toFixed(0)}</td></tr></table>
      ${forecastLine(nx)}${treeNote(opp)}${plan ? scoutBlock(opp) : '<p class="hint">The head coach and coordinators set the game plan. Your job this week: your position group and recruiting.</p>'}
      ${thisWeek && liveBusy() ? `<div class="row gap mt"><button class="btn primary" data-act="liveresume">Resume the live game · ${esc(liveScoreText())}</button></div><p class="hint">If you leave the site before it is final, it will be waiting where you left it when you come back.</p>` : thisWeek && !state.event ? `<div class="row gap mt"><button class="btn watch" data-act="live">${caller ? 'Coach it live' : 'Watch live'}</button><button class="btn primary" data-act="primary">Quick sim</button>${caller ? '<button class="btn ghost" data-act="live2">Two-minute drill</button>' : ''}</div><p class="hint">${caller ? `Game day: <b>${esc(CO_GAMEDAY[co.gameDay][0])}</b>. ${esc(CO_GAMEDAY[co.gameDay][1])} Change it in Settings or during the game.` : plan ? 'Live, you make the halftime adjustments.' : 'Watch the game live, or let it play out.'}</p>` : thisWeek ? '<p class="hint">Answer the decision above before kickoff.</p>' : ''}
    </section>`;
  } else if (state.phase === 'offseason') {
    next = `<section class="card next"><div class="eyebrow">Offseason</div><h2 class="h2">${co.fired ? 'You need a new job' : 'Get ready for ' + (state.season + 1)}</h2>${offChecklist()}<button class="btn primary" data-act="tab" data-tab="off">Open the offseason</button></section>`;
  } else next = `<section class="card next"><div class="eyebrow">${esc(weekLabel(state.week))}</div><h2 class="h2">${esc(teamName(ME))}'s season is over</h2><p class="muted">The rest of the postseason is still being played.</p><button class="btn primary" data-act="primary">${esc(primaryLabel())}</button></section>`;
  const lastC = last ? (() => { const a = last.h === ME ? last.hs : last.as, b = last.h === ME ? last.as : last.hs; return `<section class="card"><div class="eyebrow">Last game · ${esc(weekLabel(last.wk))}</div><div class="final"><span class="res ${last.mResult === 'W' ? 'w' : 'l'}">${last.mResult}</span><span class="sc">${a}–${b}</span><span>${siteOf(last)} ${tchip(oppOf(last))}</span></div><button class="btn ghost sm" data-act="box" data-id="${last.id}">Box score</button></section>`; })() : '';
  const news = state.news.slice(0, 14).map(n => `<li class="${n.kind}"><span class="when">${n.s} · ${n.wk <= 13 ? 'Wk ' + n.wk : 'Post'}</span>${esc(n.txt)}</li>`).join('');
  const goals = state.goals.map(gl => { const s = goalStatus(gl); return `<li><span class="gs ${s}">${s === 'met' ? 'Met' : s === 'failed' ? 'Missed' : 'Open'}</span>${esc(gl.txt)}</li>`; }).join('');
  return `${eventCard()}${recruitWarnCoach()}<div class="grid2"><div class="col">${next}${lastC}${practiceCard()}<section class="card"><div class="eyebrow">Newswire</div><ul class="news">${news}</ul></section></div>
   <div class="col">${coachStandingCard()}${coachNextCard()}${authorityCard()}${injuryCard()}${relCardHTML()}<section class="card"><div class="eyebrow">What the AD expects · ${state.season}</div><ul class="goals">${goals}</ul></section>${adRequestsCard()}
   <section class="card"><div class="eyebrow">Team strength</div><div class="tiles"><div><span class="k">Overall</span><span class="v">${ms.ovr.toFixed(0)}</span></div><div><span class="k">Offense</span><span class="v">${ms.off.toFixed(0)}</span></div><div><span class="k">Defense</span><span class="v">${ms.def.toFixed(0)}</span></div><div><span class="k">Special teams</span><span class="v">${ms.st.toFixed(0)}</span></div></div></section></div></div>`;
}
function authorityCard() { const co = state.co; const open = ui.authOpen !== false; return `<section class="card"><div class="head"><div class="eyebrow">What you control</div><button class="btn ghost sm" data-act="authtog" aria-expanded="${!!open}">${open ? 'Hide' : 'Show'}</button></div>${open ? `<ul class="authl small">${roleAuthority(co.role, isPro()).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</section>`; }
function recruitWarnCoach() { return state.co.role === 'HC' && !autoOn('rec') ? recruitWarn() : ''; }

/* ---------- your career ---------- */
function vCoachCareer() {
  const co = state.co; const sk = co.sk;
  const rows = co.hist.slice().reverse().map(h => `<tr><td>${h.s}</td><td>${(h.lvl || 'col') === (isPro() ? 'nfl' : 'col') ? tchip(h.tm, { norank: true }) : esc((h.lvl || 'col') === 'nfl' ? nflName(h.tm) : colTeamName(h.tm))}${h.lvl === 'nfl' ? ' <span class="pill ghost">NFL</span>' : ''}</td><td>${esc(roleTitle(h.role))}</td><td>${h.w}-${h.l}</td><td>${h.rank ? '#' + h.rank : '—'}</td><td class="small">${esc(h.post || '—')}</td><td class="num">#${h.off}</td><td class="num">#${h.def}</td><td class="num">${h.sec}</td></tr>`).join('');
  const k = co.contract;
  return `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">Coach</div><h2 class="h2">${esc(co.name)}</h2><p class="muted">${esc(roleTitle(co.role))} at ${esc(myName())} · age ${co.age} · ${co.start === 'climb' ? 'started at the bottom' : 'started at a job of his choosing'}</p>
    <div class="tiles"><div><span class="k">Record</span><span class="v">${co.w}-${co.l}</span></div><div><span class="k">National titles</span><span class="v">${co.titles}</span></div><div><span class="k">Conference titles</span><span class="v">${co.confT}</span></div><div><span class="k">Playoff trips</span><span class="v">${co.cfp}</span></div><div><span class="k">Reputation</span><span class="v">${co.rep}</span></div><div><span class="k">Earnings</span><span class="v">${fmM(co.earn)}</span></div></div></section>
   <section class="card"><div class="eyebrow">Your skills</div><div class="tiles">${[['Offense', sk.off], ['Defense', sk.def], ['Recruiting', sk.rec], ['Development', sk.dev], ['Game management', sk.gm]].map(([l, v]) => `<div><span class="k">${l}</span><span class="v">${v}</span></div>`).join('')}</div><p class="hint">Skills grow with every season in the job, faster in the areas your role uses. They feed straight into game day, recruiting and player development.</p></section>
   <section class="card"><div class="eyebrow">Contract with ${esc(myName())}</div><ul class="plainlist small"><li>${fmM(k.sal)} a year, ${k.left} of ${k.yrs} years left</li><li>Buyout if they fire you: ${k.buy}% of what's left (${fmM(k.sal * k.left * k.buy / 100)} today)</li><li>Exit fee if you leave early: ${fmM(k.exit)}</li><li>Bonuses: ${[k.inc.wins ? k.inc.wins + '+ wins' : '', k.inc.conf ? 'conference title' : '', k.inc.cfp ? 'playoff' : '', k.inc.title ? 'national title' : ''].filter(Boolean).join(', ') || 'none'}</li>${co.role === 'HC' ? `<li>Assistant pool: ${fmM(k.pool)} (${fmM(assistantSpend())} used)</li>` : ''}</ul><p class="hint">New deals and extensions are negotiated in the offseason job market.</p></section></div>
   <div class="col"><section class="card"><div class="eyebrow">Season by season</div>${rows ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>School</th><th>Role</th><th>Record</th><th>Final</th><th>Postseason</th><th>Off.</th><th>Def.</th><th>Security</th></tr></thead><tbody>${rows}</tbody></table></div><p class="hint">Off. and Def. are national ranks in points scored and allowed.</p>` : '<p class="muted">Your first season is under way.</p>'}</section>
   <section class="card"><div class="eyebrow">Requests to the AD</div>${co.reqLog.length ? `<ul class="news small">${co.reqLog.slice(0, 12).map(x => `<li class="${x.ok ? 'win' : 'bad'}"><span class="when">${x.s}</span>${esc(x.txt)}</li>`).join('')}</ul>` : '<p class="muted">None yet.</p>'}</section></div></div>`;
}

/* ---------- recruiting ---------- */
function coachTripButtons(r) {
  if (!canRecruit(r.pos)) return ''; const left = travelLeft();
  const home = r.hv === state.season ? '<span class="small muted">Visited</span>' : `<button class="tog" data-act="cotrip" data-id="${r.id}" ${left ? '' : 'disabled'} title="One travel day. A big interest boost.">Home visit</button>`;
  const watch = r.seen === state.season ? '' : `<button class="tog" data-act="cowatch" data-id="${r.id}" ${left ? '' : 'disabled'} title="One travel day. An exact read on his ceiling, and a little interest.">Watch him</button>`;
  return `${home} ${watch} `;
}
function coachRecruitCard() {
  const co = state.co; const left = travelLeft(); const pos = rolePositions(co.role);
  return `<section class="card"><div class="head"><div><div class="eyebrow">On the road · ${esc(roleTitle(co.role))}</div><h2 class="h2">${left} travel day${left === 1 ? '' : 's'} left ${state.phase === 'offseason' ? 'this step' : 'this week'}</h2></div><p class="hint">${co.role === 'HC' ? 'You recruit every position.' : `You recruit ${pos.join(', ')}. The rest of the staff handles the other positions.`} A home visit is the biggest boost; watching a prospect play gives an exact read on his ceiling. Days reset every week in season and every offseason step in the winter contact period.</p></div>
   <div class="row gap">${seg('coautorec', autoOn('rec') ? 'on' : 'off', [['off', 'I recruit'], ['on', 'Auto-recruit']])}<span class="small muted">${autoOn('rec') ? 'Offers, trips and Signing Day are handled for you.' : ''}</span></div></section>`;
}
function autoRecCard() {
  return `<section class="card"><div class="row gap"><span class="lbl">Recruiting</span>${seg('coautorec', autoOn('rec') ? 'on' : 'off', [['off', 'I recruit'], ['on', 'Auto-recruit']])}<span class="small muted">${autoOn('rec') ? 'Your staff makes the offers and handles Signing Day. You can still step in at any time.' : 'Turn on auto-recruiting to hand the board to your staff.'}</span></div></section>`;
}

/* ---------- offseason: review and job market ---------- */
function coachOffTop(step) {
  const steps = COACH_OFF_STEPS.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'on' : ''}"><span>${i + 1}</span>${s}</li>`).join('');
  return `<section class="card"><ol class="steps">${steps}</ol>${offChecklist()}</section>${step === 0 ? coachReviewHTML() : jobMarketHTML()}`;
}
function coachReviewHTML() {
  const co = state.co; const rv = state.off.review; const r = co.review || {}; const ur = r.ur || {};
  const delta = r.sec - r.secBefore;
  return `<section class="card"><div class="eyebrow">Season review · ${esc(roleTitle(co.role))}</div><h2 class="h2">${rv.w}-${rv.l}${rv.finalRank ? ', finished No. ' + rv.finalRank : ', unranked'}${rv.champ === ME ? ' · National champions' : ''}</h2>
   ${co.fired ? `<p class="flash bad">${esc(co.fired.why)}</p>` : co.newBoss ? `<p class="flash">The school fired head coach ${esc(co.newBoss.old)}. A new head coach arrives this offseason${co.role !== 'HC' ? ', and he is keeping you' : ''}.</p>` : ''}
   <ul class="goals">${rv.goals.map(g => `<li><span class="gs ${g.st}">${g.st === 'met' ? 'Met' : g.st === 'failed' ? 'Missed' : '—'}</span>${esc(g.txt)}</li>`).join('')}</ul>
   <div class="tiles"><div><span class="k">Job security</span><span class="v">${r.secBefore} → ${r.sec}</span><span class="s ${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${delta}</span></div><div><span class="k">Reputation</span><span class="v">${co.rep}</span><span class="s ${r.repD >= 0 ? 'pos' : 'neg'}">${r.repD >= 0 ? '+' : ''}${r.repD}</span></div><div><span class="k">Offense</span><span class="v">#${ur.off}</span><span class="s">${ur.ppg} points a game (expected about #${r.eOff})</span></div><div><span class="k">Defense</span><span class="v">#${ur.def}</span><span class="s">${ur.papg} allowed (expected about #${r.eDef})</span></div></div>
   ${r.bonus ? `<p class="small">Incentives earned: <b>${fmM(r.bonus)}</b> (${esc(r.why.join(', '))}).</p>` : ''}${co.lastDev != null && ROLE_TIER[co.role] === 1 ? `<p class="small">Your position group's development last offseason: ${co.lastDev >= 0 ? '+' : ''}${co.lastDev} OVR against the rest of the roster.</p>` : ''}
   ${rv.recap ? `<div class="mt">${recapView(rv.recap, state.season)}</div>` : ''}
   <div class="row gap mt"><button class="btn primary" data-act="offnext">Go to the job market</button></div></section>`;
}
const incLbl = lvl => (lvl === 'nfl' ? { conf: 'division title', cfp: 'playoffs', title: 'Super Bowl' } : { conf: 'conf. title', cfp: 'playoff', title: 'title' });
function offerTerms(k, role, lvl) { const IL = incLbl(lvl); return `${fmM(k.sal)} a year · ${k.yrs} yr${k.yrs === 1 ? '' : 's'} · buyout ${k.buy}% · exit fee ${fmM(k.exit)}${role === 'HC' ? ' · assistant pool ' + fmM(k.pool) : ''}${k.inc.wins || k.inc.conf || k.inc.cfp || k.inc.title ? ' · bonuses: ' + [k.inc.wins ? k.inc.wins + '+ wins' : '', k.inc.conf ? IL.conf : '', k.inc.cfp ? IL.cfp : '', k.inc.title ? IL.title : ''].filter(Boolean).join(', ') : ''}`; }
function jobRow(o) {
  const of = o.offer; const m = state.co.market; const lvl = jobLvl(o); const here = isPro() ? 'nfl' : 'col';
  const info = lvl === 'nfl' ? `NFL · ${NFL_BY[o.tid].conf} ${NFL_BY[o.tid].div} · club rating ${here === 'nfl' && T(o.tid) ? T(o.tid).rating : NFL_BY[o.tid].p}` : (() => { const t = colTeams()[o.tid]; return t ? `${esc(CONFS[t.conf] ? CONFS[t.conf].name : '')} · ${schoolTier(t.rating)} (${Math.round(t.rating)})` : ''; })();
  const nameCell = lvl === here ? tchip(o.tid, { norank: true }) : `<b>${esc(jobNm(o))}</b>`;
  const st = of ? (of.status === 'walked' ? '<span class="pill bad">They walked away</span>' : of.status === 'agreed' ? '<span class="pill good">Agreed</span>' : `<span class="pill maize">${o.called ? 'They called you' : 'Offer'}</span>`) : o.tried ? '<span class="pill bad">Went another way</span>' : `<span class="small muted">Interest ${o.int >= 70 ? 'high' : o.int >= 40 ? 'fair' : o.int >= 15 ? 'low' : 'a long shot'} (${o.int})</span>`;
  const act = m.take && m.take.id === o.id ? '<span class="pill good">Your next job</span>' : of && of.status !== 'walked' ? `<button class="btn sm" data-act="mkopen" data-id="${o.id}">${of.status === 'agreed' ? 'Review' : 'Talk terms'}</button>` : !o.tried && !of && m.interviews > 0 ? `<button class="btn ghost sm" data-act="mkinterview" data-id="${o.id}">Interview</button>` : '';
  const fit = (() => { try { const f = []; const t = lvl === 'col' ? colTeams()[o.tid] : null; if (t && t.rating < 50) f.push('weak roster: a rebuild'); if (of && of.k && of.k.yrs <= 2) f.push('short contract'); if (o.role === 'HC' && of && of.k && of.k.pool < 4) f.push('small staff pool'); const lad = coLadder(o.tid, o.role, lvl, ROLE_TIER[state.co.role], 0); if (lad > 0) f.push('wants more seasons at your level'); return f.length ? `<div class="small">Fit: ${esc(f.join(' · '))}</div>` : ''; } catch (e) { return ''; } })();
  return `<tr class="${m.take && m.take.id === o.id ? 'kept' : ''}"><td>${nameCell}<div class="small muted">${info}</div>${fit}</td><td>${esc(roleTitle(o.role))}</td><td>${st}</td><td>${act}</td></tr>`;
}
// your current deal and every live offer side by side
function offerCompareHTML() {
  const co = state.co; const m = co.market; if (!m) return ''; const here = isPro() ? 'nfl' : 'col';
  const rtOf = (tid, lvl) => { if (lvl === 'nfl') return here === 'nfl' && T(tid) ? T(tid).rating : NFL_BY[tid] ? NFL_BY[tid].p : null; const t = colTeams()[tid]; return t ? Math.round(t.rating) : null; };
  const rows = [];
  if (!co.fired && co.contract && co.contract.left > 0 && !(m.home && m.home.notRetained)) rows.push({ nm: 'Stay on your current deal', role: co.role, lvl: here, k: Object.assign({}, co.contract, { yrs: co.contract.left }), rt: rtOf(ME, here) });
  if (m.home && m.home.offer && !m.home.notRetained) rows.push({ nm: `New deal at ${myName()}`, role: co.role, lvl: here, k: m.home.offer.k, rt: rtOf(ME, here) });
  m.open.filter(o => o.offer && o.offer.status !== 'walked').forEach(o => rows.push({ nm: jobNm(o), role: o.role, lvl: jobLvl(o), k: o.offer.k, rt: rtOf(o.tid, jobLvl(o)), st: o.offer.status }));
  if (rows.length < 2) return '';
  const best = Math.max(...rows.map(r => r.k.sal)); const inc = r => { const IL = incLbl(r.lvl); const i = r.k.inc || {}; return [i.wins ? i.wins + '+ wins' : '', i.conf ? IL.conf : '', i.cfp ? IL.cfp : '', i.title ? IL.title : ''].filter(Boolean).join(', ') || '—'; };
  return `<section class="card"><div class="eyebrow">Compare your options</div><div class="tw"><table class="tbl cmpt"><thead><tr><th>Option</th><th>Job</th><th>Level</th><th class="num">Team</th><th class="num">Salary</th><th class="num">Years</th><th class="num">Buyout</th><th class="num">Exit fee</th><th class="num">Staff pool</th><th>Bonuses</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.nm)}</b>${r.st === 'agreed' ? ' <span class="pill good">Agreed</span>' : ''}</td><td>${esc(roleTitle(r.role))}</td><td>${r.lvl === 'nfl' ? 'NFL' : 'College'}</td><td class="num">${r.rt != null ? r.rt : '—'}</td><td class="num${r.k.sal === best ? ' best' : ''}">${fmM(r.k.sal)}</td><td class="num">${r.k.yrs}</td><td class="num">${r.k.buy != null ? r.k.buy + '%' : '—'}</td><td class="num">${r.k.exit != null ? fmM(r.k.exit) : '—'}</td><td class="num">${r.role === 'HC' && r.k.pool != null ? fmM(r.k.pool) : '—'}</td><td class="small">${esc(inc(r))}</td></tr>`).join('')}</tbody></table></div><p class="hint">Buyout is the share of what's left on your deal you are paid if you're fired. The exit fee is what you owe if you leave early. Team is the program's current rating.</p></section>`;
}
function jobMarketHTML() {
  const co = state.co; const m = co.market; if (!m) return '<section class="card"><p class="muted">The job market opens after the season.</p></section>';
  const blocked = marketBlocked(); const neg = ui.mkOpen ? marketJob(ui.mkOpen) : null;
  const filt = ui.mkF || 'up'; const list = m.open.filter(o => filt === 'all' || (filt === 'up' ? ROLE_TIER[o.role] >= ROLE_TIER[co.role] : filt === 'hc' ? o.role === 'HC' : filt === 'offers' ? !!o.offer : filt === 'nfl' ? jobLvl(o) === 'nfl' : filt === 'col' ? jobLvl(o) === 'col' : true));
  const home = m.home; const k = co.contract;
  const homeCard = home ? `<section class="card"><div class="eyebrow">Your job · ${esc(myName())}</div><h2 class="h3">${esc(roleTitle(co.role))} · ${k.left > 0 ? `${k.left} year${k.left === 1 ? '' : 's'} left on your deal` : 'your contract is up'}</h2>
     ${home.notRetained ? `<p class="flash bad">${isPro() ? 'The club' : 'The school'} is not bringing you back. Find a new job below.</p>` : home.offer ? `<p>${k.left > 0 ? (isPro() ? 'Ownership is open to a new deal.' : 'The AD is open to a new deal.') : (isPro() ? 'The club wants to re-sign you.' : 'The AD wants to re-sign you.')} Starting terms: ${esc(offerTerms(home.offer.k, co.role, isPro() ? 'nfl' : 'col'))}.</p><div class="row gap">${m.take && m.take.home ? '<span class="pill good">Re-signed</span>' : `<button class="btn sm" data-act="mkopen" data-id="${home.id}">Talk terms</button>`}</div>` : k.left > 0 ? `<p class="small muted">You can stay on your current deal${co.sec >= 70 ? `, or ask for a new one` : ''}.</p>${co.sec >= 70 && !home.asked ? `<button class="btn ghost sm" data-act="mkext">Ask for an extension</button>` : ''}` : ''}</section>` : `<section class="card"><div class="eyebrow">Out of work</div><p class="flash bad">${esc(co.fired.why)}</p></section>`;
  const rows = list.map(jobRow).join('');
  const chips = [['up', 'Your level and up'], ['hc', 'Head coaching jobs'], ['offers', 'Offers'], ['col', 'College'], ['nfl', 'NFL'], ['all', 'Everything']].map(([kk, l]) => `<button class="chip${filt === kk ? ' on' : ''}" data-act="mkf" data-v="${kk}">${l}</button>`).join('');
  const takeTxt = m.take ? (m.take.home ? `You're staying at ${esc(myName())} on a new deal.` : `You're taking the ${esc(roleTitle(m.take.role).toLowerCase())} job ${jobLvl(m.take) === 'nfl' ? 'with the' : 'at'} ${esc(jobNm(m.take))}: ${esc(offerTerms(m.take.k, m.take.role, jobLvl(m.take)))}.${jobLvl(m.take) !== (isPro() ? 'nfl' : 'col') ? (jobLvl(m.take) === 'nfl' ? ' You join the NFL this offseason.' : ' You head back to college for the next season.') : ''}`) : '';
  return `${neg ? negHTML(neg) : ''}${homeCard}${offerCompareHTML()}<section class="card"><div class="head"><div><div class="eyebrow">Job market · ${state.season} offseason</div><h2 class="h2">${m.open.filter(o => o.offer).length} offer${m.open.filter(o => o.offer).length === 1 ? '' : 's'} · ${m.interviews} interview${m.interviews === 1 ? '' : 's'} left</h2></div><p class="hint">Teams call the coaches they want most. You can also interview for any opening: pick what to sell them on, and if it's what they care about, your odds go up. Moving up a level takes a strong reputation.</p></div>
   ${m.log.length ? `<div class="mklog">${m.log.slice(0, 4).map(x => `<p class="small muted">${esc(x)}</p>`).join('')}</div>` : ''}
   <div class="chips">${chips}</div><div class="tw"><table class="tbl"><thead><tr><th>School</th><th>Job</th><th>Status</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">Nothing here.</td></tr>'}</tbody></table></div>
   ${ui.mkPitch ? pitchHTML() : ''}
   ${takeTxt ? `<p class="flash">${takeTxt}</p>` : ''}${blocked ? `<p class="flash bad">${esc(blocked)}</p>` : ''}
   <div class="row gap mt">${m.take ? '<button class="btn primary" data-act="offnext">Take the job and move on</button><button class="btn ghost" data-act="mkundo">Change my mind</button>' : blocked ? '' : '<button class="btn primary" data-act="offnext">Stay where I am</button>'}</div></section>`;
}
function pitchHTML() {
  const o = marketJob(ui.mkPitch); if (!o) return '';
  return `<div class="decision mt"><div class="eyebrow">Interview · ${esc(jobNm(o))} · ${esc(roleTitle(o.role))}</div><h3 class="h3">What do you lead with?</h3><div class="evopts">${Object.entries(PITCHES).map(([k, l]) => `<button class="evopt" data-act="mkpitch" data-v="${k}"><b>${esc(l)}</b><span>${k === 'recruit' ? 'Who you can bring in and how.' : k === 'scheme' ? 'How your teams win on Saturdays.' : 'How players grow under you.'}</span></button>`).join('')}</div><button class="btn ghost sm mt" data-act="mkpitchx">Cancel</button></div>`;
}
function negHTML(o) {
  const of = o.offer; const k = of.k; const done = of.status !== 'open'; const hc = o.role === 'HC';
  const wins = [0, 8, 9, 10, 11].map(n => `<option value="${n}" ${k.inc.wins === n ? 'selected' : ''}>${n ? n + '+ wins' : 'None'}</option>`).join('');
  return `<section class="card decision"><div class="head"><div><div class="eyebrow">Contract talks · ${esc(jobNm(o))} · ${esc(roleTitle(o.role))}</div><h2 class="h3">${of.status === 'agreed' ? 'You have a deal' : of.status === 'walked' ? 'They walked away' : of.status === 'final' ? 'Their final offer' : of.rounds ? 'Their counteroffer' : 'Their opening offer'}</h2></div><button class="btn ghost sm" data-act="mkclose">Close</button></div>
   <p>${esc(offerTerms(k, o.role, jobLvl(o)))}</p>
   ${done ? '' : `<div class="fgrid">
     <label class="fld"><span>Salary ($M a year)</span><input id="ng-sal" type="number" step="0.05" min="0.05" value="${k.sal}"></label>
     <label class="fld"><span>Years</span><input id="ng-yrs" type="number" min="1" max="7" value="${k.yrs}"></label>
     <label class="fld"><span>Buyout if fired (% of what's left)</span><input id="ng-buy" type="number" min="0" max="100" step="5" value="${k.buy}"></label>
     <label class="fld"><span>Exit fee if you leave ($M)</span><input id="ng-exit" type="number" min="0" step="0.05" value="${k.exit}"></label>
     ${hc ? `<label class="fld"><span>Assistant pool ($M a year)</span><input id="ng-pool" type="number" min="0.5" step="0.1" value="${k.pool}"></label>` : ''}
     <label class="fld"><span>Win bonus</span><select id="ng-wins">${wins}</select></label>
   </div><div class="row gap"><label class="chk"><input type="checkbox" id="ng-conf" ${k.inc.conf ? 'checked' : ''}> ${jobLvl(o) === 'nfl' ? 'Division title' : 'Conference title'} bonus</label><label class="chk"><input type="checkbox" id="ng-cfp" ${k.inc.cfp ? 'checked' : ''}> Playoff bonus</label><label class="chk"><input type="checkbox" id="ng-title" ${k.inc.title ? 'checked' : ''}> ${jobLvl(o) === 'nfl' ? 'Super Bowl' : 'National title'} bonus</label></div>
   <p class="hint">Round ${of.rounds + 1} of 3. Ask for too much and they walk${o.home ? ' (your own school just keeps the deal you have)' : ''}. A bigger buyout protects you if you're fired; a smaller exit fee makes it cheaper to leave.</p>`}
   <div class="row gap mt">${done ? (of.status === 'walked' ? '' : `<button class="btn primary" data-act="mkaccept" data-id="${o.id}">${o.home ? 'Sign it' : 'Accept the job'}</button>`) : `<button class="btn" data-act="mkcounter" data-id="${o.id}">Send counteroffer</button><button class="btn primary" data-act="mkaccept" data-id="${o.id}">Accept these terms</button>${autoOn('neg') ? `<button class="btn ghost" data-act="mkauto" data-id="${o.id}">Let my agent handle it</button>` : ''}`}</div></section>`;
}

/* ---------- live game ---------- */
function ddriveHTML(sim, p) {
  const ds = p.ds; const ab = isFCS(sim.oppId) ? 'their' : sim.oppId; const spot = ds.yl === 50 ? 'midfield' : ds.yl < 50 ? ab + ' ' + ds.yl : 'your ' + (100 - ds.yl);
  const ord = ['1st', '2nd', '3rd', '4th'][ds.down - 1]; const run = Math.round(oppTendency(sim, ds) * 100);
  return `<div class="decision"><div class="eyebrow">${p.ot ? 'Overtime' : 'Q' + p.qtr + ' · ' + p.clock} · ${sim.pts[sim.mSide]}–${sim.pts[1 - sim.mSide]} · ${sim.keyOnly ? 'Key play: your defense' : 'You call the defense'}</div>
   <h3 class="h3">${esc(teamName(sim.oppId))} ball · ${ord} & ${100 - ds.yl < ds.togo ? 'goal' : ds.togo} at the ${esc(spot)}</h3>
   <div class="field" aria-hidden="true"><i class="los" style="left:${100 - ds.yl}%"></i><i class="fd" style="left:${Math.max(0, 100 - ds.yl - ds.togo)}%"></i></div>
   ${ds.log.length ? `<ul class="plainlist small dlog">${ds.log.slice(-4).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
   <p class="small">Scouting: they run about <b>${run}%</b> of the time in this spot.</p>
   <div class="calls">${Object.entries(DCALLS).map(([k, l]) => `<button class="evopt" data-act="ldcall" data-v="${k}"><b>${esc(l)}</b><span>${esc(DCALL_HINT[k])}</span></button>`).join('')}</div>
   <p class="hint">The same call over and over gets easier to beat.</p></div>`;
}
function coachLiveLevel() { if (!(callsOff() || callsDef())) return ''; return `<span class="small muted">Game day:</span>${seg('cogameday', state.co.gameDay, Object.entries(CO_GAMEDAY).map(([k, v]) => [k, v[0]]))}`; }

/* ---------- settings ---------- */
function autoSettingsHTML() {
  const mode = isPro() ? (isCoach() ? 'nflcoach' : ownHands() ? 'own' : 'gm') : isCoach() ? 'coach' : 'ad'; const A = autoSet(); if (mode === 'own') return '<div class="eyebrow mt">Automation</div><p class="hint">Your general manager and head coach make the football calls: the depth chart, game plans, contracts, free agency, the draft and cuts. Give them orders from the Front office tab.</p>';
  return `<div class="eyebrow mt">Automation</div><p class="hint">Hand routine jobs to your ${mode === 'coach' || mode === 'nflcoach' ? 'staff and agent' : 'staff'}. Each runs at the point in the year where you would do it yourself, and you can step in anytime.</p>
   ${Object.entries(AUTO_DEFS).filter(([, d]) => d.modes.includes(mode)).map(([k, d]) => setRow(esc(d.label), esc(d.hint), seg('setauto', A[k] ? 'on' : 'off', [['on', 'Automatic'], ['off', 'Me']], `data-k="${k}"`))).join('')}`;
}
function coachSettingsHTML() {
  const st = state.settings; const co = state.co; const gameSeg = (k, cur, opts) => seg('setgame', String(cur), opts, `data-k="${k}"`);
  return `<section class="card"><div class="eyebrow">Gameplay · coach slot ${slot}</div>
   ${setRow('Difficulty', `${esc(DIFF[st.diff].desc)}`, gameSeg('diff', st.diff, Object.entries(DIFF).map(([k, d]) => [k, d.label])))}
   ${callsOff() || callsDef() ? setRow('Game day', esc(CO_GAMEDAY[co.gameDay][1]) + (co.role === 'HC' ? ' As head coach you call both sides.' : ` As ${roleTitle(co.role).toLowerCase()} you call the ${co.role === 'OC' ? 'offense' : 'defense'}.`), seg('cogameday', co.gameDay, Object.entries(CO_GAMEDAY).map(([k, v]) => [k, v[0]]))) : setRow('Game day', 'Position coaches don’t call plays. You can still watch every game live.', '<span class="muted small">—</span>')}
   ${setRow('Live game speed', 'How fast live games start. You can change it during a game.', prefSeg('liveSpeed', [[1, 'Normal'], [2, 'Fast'], [3, 'Very fast']]))}
   ${setRow('Field view', 'Watch each play on a top-down field during live games: dots with jersey numbers line up, the ball is snapped and the play runs. It follows the live game speed.', prefSeg('field', [['on', 'On'], ['off', 'Off']]))}
   ${setRow('Play clock', 'When you call plays in a live game, you get 20 seconds per play. If it runs out, your staff makes the call.', prefSeg('playClock', [['off', 'Off'], ['on', 'On']]))}
   ${setRow('Keyboard shortcuts', 'N for next, L to watch live, 1–9 for tabs, U to undo, G for the glossary, ? for the full list.', prefSeg('keys', [['on', 'On'], ['off', 'Off']]))}
   <div class="row gap mt"><button class="btn ghost sm" data-act="kbhelp">Keyboard shortcuts</button><button class="btn ghost sm" data-act="glossary">What the numbers mean</button></div>
   ${setRow('Sound effects', 'Crowd roar, final whistle and a victory jingle.', gameSeg('sound', !!st.sound, [['true', 'On'], ['false', 'Off']]))}
   ${autoSettingsHTML()}
   <p class="hint mt">Save slots and save codes are in <button class="lnk" data-act="tab" data-tab="file">Save file</button>. AD mode and Player Career are on the Home screen.</p></section>${rulesCardHTML()}`;
}

/* ---------- starting a coaching career ---------- */
const coForm = () => ui.coForm || (ui.coForm = { name: '', start: 'any', lvl: 'col', tid: 'MICH', nfl: 'DET', role: 'HC', pick: 0, gameDay: 'key', diff: 'normal', seed: '' });
function coachSetupHTML(slotI) {
  const f = coForm(); const seed = f.seedK || (f.seedK = Math.floor(Math.random() * 1e9));
  const entry = entryJobs(seed); const roles = STAFF_ROLES.map(r => `<option value="${r}" ${f.role === r ? 'selected' : ''}>${esc(roleTitle(r))}</option>`).join('');
  const over = slotI && lsGet(NS_PREFIX.coach + 'slot-' + slotI);
  return `<section class="card newcareer" id="coform"><div class="head"><div><div class="eyebrow">Coach mode · new career${slotI ? ' · slot ' + slotI : ''}</div><h2 class="h2">Create your coach</h2>${f.fromPlayer ? `<p class="flash">From Player Career: ${esc(f.fromPlayer)} starts with +${f.repBonus} reputation from his playing days.</p>` : ''}</div>${over ? '<p class="hint">This replaces the coaching career in this slot.</p>' : ''}</div>
   ${f.err ? `<p class="flash bad">${esc(f.err)}</p>` : ''}
   <div class="fgrid"><label class="fld"><span>Your name</span><input id="co-name" value="${esc(f.name)}" maxlength="30" placeholder="Coach's name" autocomplete="off"></label></div>
   <div class="eyebrow mt">How do you start?</div>
   <div class="evopts"><button class="evopt${f.start === 'any' ? ' on' : ''}" data-act="coform" data-k="start" data-v="any" aria-pressed="${f.start === 'any'}"><b>Pick any job</b><span>Any school, any role: head coach, coordinator or position coach.</span></button><button class="evopt${f.start === 'climb' ? ' on' : ''}" data-act="coform" data-k="start" data-v="climb" aria-pressed="${f.start === 'climb'}"><b>Start at the bottom</b><span>A position coach at a smaller program. Earn every promotion.</span></button></div>
   ${f.start === 'any' ? `<div class="mt">${seg('coform', f.lvl || 'col', [['col', 'College'], ['nfl', 'NFL']], 'data-k="lvl"')}</div>${f.lvl === 'nfl' ? nflPickerHTML({ nfl: f.nfl }) : schoolPickerHTML({ tid: f.tid })}<label class="fld"><span>Role</span><select id="co-role">${roles}</select></label><p class="hint">${f.lvl === 'nfl' ? (f.role === 'HC' ? 'Head coach: you run the team, call both sides on game day and have the biggest say with the GM on the draft, trades, free agents and cuts.' : ['OC', 'DC'].includes(f.role) ? 'Coordinator: you run one side of the ball, call its plays and advise the GM on its players.' : 'Position coach: you develop one position group and advise the GM on it. Build a name and move up.') : f.role === 'HC' ? 'Head coach: you run the program, call both sides on game day, recruit every position and hire your assistants.' : ['OC', 'DC'].includes(f.role) ? 'Coordinator: you run one side of the ball, call its plays and recruit its positions.' : 'Position coach: you develop and recruit one position group. Build a name and move up.'}</p>`
    : `<div class="eyebrow mt">Entry-level offers</div><div class="evopts">${entry.map((j, i) => `<button class="evopt${f.pick === i ? ' on' : ''}" data-act="coform" data-k="pick" data-v="${i}" aria-pressed="${f.pick === i}"><b>${esc(CTEAMS0_AD[j.tid].name)}</b><span>${esc(roleTitle(j.role))} · ${esc(CONFS[CTEAMS0_AD[j.tid].conf].name)}</span></button>`).join('')}</div>`}
   <div class="eyebrow mt">Game day</div><div class="evopts">${Object.entries(CO_GAMEDAY).map(([k, v]) => `<button class="evopt${f.gameDay === k ? ' on' : ''}" data-act="coform" data-k="gameDay" data-v="${k}" aria-pressed="${f.gameDay === k}"><b>${esc(v[0])}</b><span>${esc(v[1])}</span></button>`).join('')}</div>
   <div class="eyebrow mt">Difficulty</div><div class="diffs">${Object.entries(DIFF).map(([k, d]) => `<button class="evopt${f.diff === k ? ' on' : ''}" data-act="coform" data-k="diff" data-v="${k}"><b>${d.label}</b><span>${esc(d.desc)}</span></button>`).join('')}</div>
   <div class="row gap mt"><button class="btn primary" data-act="costart" data-i="${slotI || ''}">Start the career</button><button class="btn ghost" data-act="cocancel">Cancel</button></div></section>`;
}
function readCoForm() { const f = coForm(); const g = id => { const e = document.getElementById(id); return e ? e.value : null; }; const n = g('co-name'); if (n != null) f.name = n; const t = g('nc-tid'); if (t) f.tid = t; const r = g('co-role'); if (r) f.role = r; const nf = g('nc-nfl'); if (nf) f.nfl = nf; }

/* ---------- actions ---------- */
Object.assign(actions, {
  authtog() { ui.authOpen = ui.authOpen === false; render(); },
  coreq(d) { const arg = d.k === 'fac' ? ($('#reqfac') || {}).value : null; const r = makeRequest(d.k, arg); after(r ? r.txt : ''); },
  cotrip(d) { const g = tripHome(d.id); if (g == null) return after('No travel days left right now.'); const r = state.rec.list.find(x => x.id === d.id); render(); announce(`Home visit with ${r.n}: interest +${g}.`); },
  cowatch(d) { const g = tripWatch(d.id); if (g == null) return after('No travel days left right now.'); const r = state.rec.list.find(x => x.id === d.id); render(); announce(`You watched ${r.n} play. His ceiling: ${r.pot}.`); },
  cofocus(d) { if (CO_FOCUS[d.v]) state.co.focus = d.v; after(); refocus({ act: 'cofocus', v: d.v }); },
  cogameday(d) { if (!CO_GAMEDAY[d.v]) return; state.co.gameDay = d.v; if (live.sim && !live.finished) { live.sim.callPlays = callsOff() && d.v !== 'plan'; live.sim.callDef = callsDef() && d.v !== 'plan'; live.sim.keyOnly = d.v === 'key'; live.sim.ask = state.co.role === 'HC' && d.v !== 'plan'; if (d.v === 'plan' && live.sim.pending && ['drive', 'ddrive'].includes(live.sim.pending.type)) { if (live.sim.pending.type === 'drive') autoFinishDrive(live.sim); else autoFinishDefDrive(live.sim); } else autoAdvance(live.sim); save(); renderLive(); if (!live.sim.pending) liveTick(); refocus({ act: 'cogameday', v: d.v }); return; } after(); refocus({ act: 'cogameday', v: d.v }); },
  coautorec(d) { autoSet().rec = d.v === 'on'; if (d.v === 'on' && state.rec) { autoSeasonRecruiting(); if (isCoach()) autoTrips(); } after(d.v === 'on' ? 'Auto-recruiting is on.' : 'You run recruiting again.'); refocus({ act: 'coautorec', v: d.v }); },
  setauto(d) { if (!AUTO_DEFS[d.k]) return; autoSet()[d.k] = d.v === 'on'; if (d.v === 'on') { if (d.k === 'rec' && state.rec && !isPro()) autoSeasonRecruiting(); if (isPro()) proRunOffAuto(); else runOffAutomation(); weekAutomation(); } after(); refocus({ act: 'setauto', k: d.k, v: d.v }); },
  mkf(d) { ui.mkF = d.v; render(); refocus({ act: 'mkf', v: d.v }); },
  mkinterview(d) { ui.mkPitch = d.id; render(); const b = document.querySelector('[data-act=mkpitch]'); if (b) b.focus(); },
  mkpitchx() { ui.mkPitch = null; render(); },
  mkpitch(d) { const id = ui.mkPitch; ui.mkPitch = null; const r = interviewJob(id, d.v); if (!r) return render(); const o = marketJob(id); if (r.ok) ui.mkOpen = id; after(r.ok ? `${jobNm(o)} offered you the job. Talk terms below.` : `${jobNm(o)} went another way. They cared most about ${PITCHES[r.wants].toLowerCase()}.`); window.scrollTo(0, 0); },
  mkopen(d) { ui.mkOpen = d.id; render(); window.scrollTo(0, 0); const e = document.getElementById('ng-sal'); if (e) e.focus(); },
  mkclose() { ui.mkOpen = null; render(); },
  mkcounter(d) {
    const g = id => { const e = document.getElementById(id); return e ? e : {}; };
    const bad = [['ng-sal', 0.05, 30, 'Salary'], ['ng-yrs', 1, 7, 'Years'], ['ng-buy', 0, 100, 'Buyout'], ['ng-exit', 0, 50, 'Exit fee'], ['ng-pool', 0.5, 15, 'Assistant pool']].map(([id, lo, hi, l]) => numIn(id, lo, hi, l).err).filter(Boolean);
    if (bad.length) return after(`Check your terms: ${bad.join(' ')} Nothing was sent.`); // a blank box is not a request for zero (QOL-03)
    const ask = { sal: +g('ng-sal').value, yrs: +g('ng-yrs').value, buy: +g('ng-buy').value, exit: +g('ng-exit').value, pool: +g('ng-pool').value, wins: +g('ng-wins').value, conf: !!g('ng-conf').checked, cfp: !!g('ng-cfp').checked, title: !!g('ng-title').checked };
    const r = coNegotiate(d.id, ask); if (!r) return; const o = marketJob(d.id);
    after(r.res === 'accept' ? `${jobNm(o)} agreed to your terms.` : r.res === 'counter' ? `${jobNm(o)} came back with a counteroffer.` : r.res === 'final' ? (isPro() ? 'Ownership says that is as far as they go.' : 'Your AD says that is as far as they go.') : `${jobNm(o)} walked away from the table.`);
  },
  mkaccept(d) { if (acceptOffer(d.id)) { ui.mkOpen = null; const t = state.co.market.take; after(t.home ? 'Deal signed. Continue when you are ready.' : `Agreed: you're headed to ${jobNm(t)}. Continue to make it official.`); } },
  mkauto(d) { if (autoNegotiate(d.id)) { ui.mkOpen = null; after('Your agent got it done.'); } },
  mkundo() { const m = state.co.market; if (m && !m.done) { m.take = null; } after(); },
  mkext() { const m = state.co.market; if (!m || !m.home || m.home.asked) return; m.home.asked = true; if (R() < clamp((state.co.sec - 55) / 40, 0.1, 0.9)) { m.home.offer = makeOffer(ME, state.co.role, null, true); ui.mkOpen = m.home.id; after(isPro() ? 'Ownership is willing to talk about a new deal.' : 'Your AD is willing to talk about a new deal.'); } else after(isPro() ? 'Ownership would rather wait a year.' : 'Your AD would rather wait a year.'); },
  coform(d) { readCoForm(); const f = coForm(); f[d.k] = d.k === 'pick' ? +d.v : d.v; f.err = ''; render(); refocus({ act: 'coform', k: d.k, v: d.v }); },
  cocancel() { ui.coForm = null; ui.newSlot = null; cui.coSetup = false; render(); },
  async costart(d) {
    readCoForm(); const f = coForm(); f.name = String(f.name || '').replace(/<\/?[a-z][^>]*>/gi, '').replace(/[<>]/g, '').trim();
    if (!f.name) { f.err = 'Give your coach a name.'; render(); return; }
    const j = f.start === 'climb' ? entryJobs(f.seedK)[f.pick] : { tid: f.tid, role: f.role };
    if (appMode === 'career' && !(await leaveMode())) return;
    if (appMode === 'ad' && state && NS === 'ad' && !(await saveNow())) return notify(AD_SAVE_FAIL);
    if (NS === 'coach' && state && !(await saveNow())) return notify(AD_SAVE_FAIL);
    switchNS('coach'); const target = +d.i || firstFreeSlot() || slot || 1;
    newCoachCareer({ name: f.name, start: f.start, tid: j.tid, role: j.role, diff: f.diff, gameDay: f.gameDay, lvl: f.start === 'any' ? f.lvl : 'col', nfl: f.nfl, repBonus: f.repBonus });
    setActiveSlot(target); appMode = 'ad'; rngOwner = 'ad'; cui.coSetup = false; ui.coForm = null; ui.newSlot = null; resetUi(); ui.tab = 'office'; hideModal(); applyTheme(); save(); await flushSave(); render(); window.scrollTo(0, 0);
  },
  async gocoach(d) { await enterCoach(d.v); },
});
// Opens Coach mode: the active coaching career, or the setup form when there is none.
async function enterCoach(v) {
  if (appMode === 'career' && !(await leaveMode())) return;
  if (appMode === 'ad' && state && NS !== 'coach' && !saveBlocked && !(await saveNow())) return notify(AD_SAVE_FAIL);
  switchNS('coach');
  if (!state) { const ok = await boot(); if (!ok || !state) { appMode = 'home'; rngOwner = null; cui.coSetup = true; render(); window.scrollTo(0, 0); const e = document.getElementById('co-name'); if (e) e.focus(); return; } }
  appMode = 'ad'; rngOwner = 'ad'; hideModal(); RNG.s = (state.rng >>> 0) || RNG.s;
  if (v === 'new') { ui.tab = 'file'; ui.newSlot = firstFreeSlot() || slot; }
  else if (ui.tab === 'money' || ui.tab === 'payroll' || ui.tab === 'fac') ui.tab = 'office';
  applyTheme(); render(); window.scrollTo(0, 0);
}
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.id) return;
  if ((appMode === 'home' && cui.coSetup) || (appMode === 'ad' && isCoach() && ui.newSlot) || (appMode === 'ad' && !isCoach() && NS === 'coach')) { if (t.id === 'nc-tid' || t.id === 'co-role') { readCoForm(); render(); const el = document.getElementById(t.id); if (el) el.focus(); } }
});

