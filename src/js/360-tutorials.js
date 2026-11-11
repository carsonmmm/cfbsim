/* ===================== TUTORIALS (v9.13): one walkthrough for each mode ===================== */
// Each mode has its own tutorial: Athletic director, Coach, NFL general manager, NFL coach, Commissioner and Player
// Career. It starts by itself the first time you open that mode, once nothing else is on screen, and never again on
// its own. Settings plays it again, and Home → Settings resets them all.
// A step can open a page (its tab), point at things on screen (the page is dimmed with a cut-out and a ring around
// each one) and say what they do. The page underneath is inert while it runs, and it puts you back where you were.
// Seen flags live on this device (fe-tours, the key the v9.9 quick tour used, so anyone who saw that tour isn't shown
// this one by itself) and, when the game runs from its claude.ai link, in your account (data/users/<id>/tutorials),
// so another device doesn't show it again. If storage is blocked, they last for the visit.
var tut = { on: false, k: null, i: 0, auto: false, steps: [], back: null, focus: null, mem: {}, acct: null, acctTried: false, acctBusy: false, wait: 0, raf: 0, tm: [] };
const TUT_KEYS = ['ad', 'coach', 'nfl', 'nflcoach', 'comm', 'career'];

function tutKey() {
  if (appMode === 'career') return typeof cs !== 'undefined' && cs ? 'career' : null;
  if (appMode !== 'ad' || typeof state === 'undefined' || !state) return null;
  return isComm() ? 'comm' : isPro() ? (isCoach() ? 'nflcoach' : 'nfl') : isCoach() ? 'coach' : 'ad';
}

/* ---------- seen flags: this device, this visit, your account ---------- */
function tutLocal() {
  let L = lsJSON('fe-tours'); if (!L || typeof L !== 'object' || Array.isArray(L)) L = {};
  if (!L.v) { if (L.nfl) L.nflcoach = 1; L.v = 2; } /* the v9.9 quick tour used one flag for both NFL jobs */
  return L;
}
function tutIsSeen(k) { return !!(tut.mem[k] || tutLocal()[k] || (tut.acct && tut.acct[k])); }
function tutMarkSeen(k) { tut.mem[k] = 1; const L = tutLocal(); L[k] = 1; lsPut('fe-tours', L); if (tut.acct) tutAcctSave(); }
function tutReset() {
  tut.mem = {}; lsPut('fe-tours', { v: 2 });
  const ref = tutAcctDoc(); if (ref) { tut.acct = {}; try { ref.set({ seen: {}, t: Date.now() }).catch(() => { }); } catch (e) { } }
}
const tutAcctDoc = () => (typeof share !== 'undefined' && share && share.ok && share.db && share.uid ? share.db.collection('data/users/' + share.uid).doc('tutorials') : null);
const tutWithin = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise(r => setTimeout(() => r(null), ms))]);
// The account's flags are read once a visit, before the first tutorial can start, so a second device doesn't show it again.
async function tutAcctLoad() {
  if (tut.acctTried) return; tut.acctTried = true;
  const c = window.claude; if (!c || typeof c.use !== 'function' || typeof shareInit !== 'function') return;
  tut.acctBusy = true;
  try {
    shareInit().catch(() => { }); const t0 = Date.now();
    while (!share.ok && !share.ready && Date.now() - t0 < 1500) await new Promise(r => setTimeout(r, 100)); /* someone else may have started it */
    const ref = tutAcctDoc(); const snap = ref ? await tutWithin(ref.get(), 1500) : null;
    if (snap) {
      const d = snap.exists ? snap.data() : null; const seen = Object.assign({}, (d && d.seen) || {}); tut.acct = seen;
      const L = tutLocal(); let up = false, down = false;
      TUT_KEYS.forEach(k => { if ((L[k] || tut.mem[k]) && !seen[k]) up = true; if (seen[k] && !L[k]) { L[k] = 1; down = true; } });
      if (down) lsPut('fe-tours', L); if (up) tutAcctSave();
    }
  } catch (e) { }
  tut.acctBusy = false;
}
// Only written once the account's flags are known, so nothing seen elsewhere is overwritten.
function tutAcctSave() {
  const ref = tutAcctDoc(); if (!ref || !tut.acct) return; const L = tutLocal(); const seen = {};
  TUT_KEYS.forEach(k => { if (L[k] || tut.mem[k] || tut.acct[k]) seen[k] = 1; }); tut.acct = seen;
  try { ref.set({ seen, t: Date.now() }).catch(() => { }); } catch (e) { }
}

/* ---------- the steps ---------- */
// A step: t title, d text (either can be a function), tab (the page it opens), at (what it points at: 'tab' is the
// step's tab, 'tab:x' another tab, 'page' the top of the page, anything else a CSS selector), when (shown only if true).
const tS = (t, d, tab, at, when) => ({ t, d, tab: tab || null, at: at || [], when: when || null });
const TUT_NEXT = ['#hdr [data-act="primary"]', '#hdr [data-act="live"]', '#hdr .simmenu'];
const TUT_TOOLS = ['#hdr .tools'];
const tutOff = () => typeof state !== 'undefined' && state && state.phase === 'offseason';
const tutCoachLine = () => (state.co.role === 'HC' ? 'Win games, recruit, develop your players and keep the AD happy.' : 'Win games, develop your players and work your way up to a head coaching job.');
// what a coach does depends on the job: who calls plays, who sets which part of the depth chart, how many recruiting trips
const tutCalls = () => ['HC', 'OC', 'DC'].includes(state.co.role);
const tutLiveLine = () => ({ HC: 'Coach it live to call plays on both sides of the ball.', OC: 'Coach it live to call the offense yourself.', DC: 'Coach it live to call the defense yourself.' }[state.co.role] || 'Coach it live to watch from the sideline while the head coach and the coordinators call the game.');
const tutDepthLine = () => { const r = state.co.role; return r === 'HC' ? 'Set the starters anywhere on the roster, and pick the systems on both sides of the ball. A new system takes two games to install.' : r === 'OC' || r === 'DC' ? `Set the starters on ${r === 'OC' ? 'offense' : 'defense'} and pick the system you run there. A new system takes two games to install.` : 'Set the starters at the positions you coach. The head coach and the coordinators pick the systems, and players who fit them play a little better.'; };
const tutRecLine = () => { const r = state.co.role; const n = r === 'HC' ? 1 : r === 'OC' || r === 'DC' ? 2 : 3; return r === 'HC' ? 'You recruit every position, with one travel day a week during the season to see prospects in person.' : `You recruit ${rolePositions(r).join(', ')}, with ${n} travel days a week during the season to see prospects in person. The rest of the staff recruits everyone else.`; };
const tutNflCoachLine = () => { const r = state.co.role; return r === 'HC' ? 'Call plays, win games and keep ownership happy. The general manager runs the roster and the cap, but he listens to you.' : r === 'OC' || r === 'DC' ? `Call the ${r === 'OC' ? 'offense' : 'defense'}, win games and work your way up to a head coaching job. The general manager runs the roster and the cap, and he takes your requests.` : 'Develop your position group, win games and work your way up. The general manager runs the roster and the cap, and he takes a few requests from you.'; };
const TUT = {
  ad: [
    tS('Welcome, athletic director', () => `You run football at ${myName()}: the coaches, the money, recruiting, the stadium and the fans. Here's a quick look at the main parts. It takes about a minute.`),
    tS('Play the season', 'This button always does the next thing: sim the week, or move the offseason along. Watch live plays the game out on the field, where you make the big calls. More sim options skips ahead weeks or whole seasons.', null, TUT_NEXT),
    tS('Your office', 'Home base: this week\'s opponent and scouting report, your game plan, game prep (pick two keys to the game), and the decisions that land on your desk.', 'office', ['tab', 'page']),
    tS('Roster and depth chart', 'Every player with his rating, potential and class. The depth chart sets your starters and your offense and defense.', 'roster', ['tab', 'tab:depth', 'page']),
    tS('Your coaching staff', 'Hire, fire and extend the head coach and his coordinators. Firing a coach on the hot seat pleases the fans; firing a winner angers the boosters.', 'staff', ['tab', 'page']),
    tS('Recruiting', 'Build next year\'s class: offer scholarships, invite prospects to home games for official visits, and hire scouts. Wins help most of all.', 'recruit', ['tab', 'page']),
    tS('The money', 'Ticket prices, revenue sharing, the recruiting budget and compliance. Keep the reserve healthy; Facilities spends it on upgrades that draw recruits.', 'money', ['tab', 'tab:fac', 'page']),
    tS('Game day and business', 'Build suites, a video board or lights, size the student section, run promotions, and sell the stadium\'s naming rights if you dare. The Athletic department page funds basketball and the Olympic sports, starts a conference TV network, hires your front-office staff and prices each home game.', 'biz', ['tab', 'tab:dept', 'page']),
    tS('Every week', 'The pregame show previews the big games and the hosts make their picks. After the games, the front page has the headline, and Advanced stats breaks down every play and drive.', 'pregame', ['tab', 'tab:paper', 'tab:adv', 'page']),
    tS('Fans and rivals', 'The fan feed reacts to every game, signing and rumor. Make your picks in Pick\'em each week, and watch the rival athletic directors who chase your coaches and recruits.', 'feed', ['tab', 'tab:pickem', 'tab:rivals', 'page']),
    tS('Everything else', 'Home switches modes. Search finds any player, coach or team. The Inbox lists everything waiting on you. Settings has the look, the gameplay options and this tutorial, if you want it again.', null, TUT_TOOLS),
  ],
  coach: [
    tS('Welcome, coach', () => `You're the ${roleTitle(state.co.role)} at ${myName()}. ${tutCoachLine()} Here's a quick look at the main parts.`),
    tS('Game day', () => `This button always does the next thing: sim the week, or move the offseason along. ${tutLiveLine()} More sim options skips ahead.`, null, TUT_NEXT),
    tS('Your office', 'This week\'s game, the scouting report and your game plan, what your role controls, and your requests to the AD. You don\'t run the budget, but you can ask.', 'office', ['tab', 'page']),
    tS('Your career', 'Your skills, contract and reputation. Skills grow every season, and your reputation decides which schools call in the offseason job market.', 'career', ['tab', 'page']),
    tS('Recruiting on the road', tutRecLine, 'recruit', ['tab', 'page']),
    tS('Depth chart and systems', tutDepthLine, 'depth', ['tab', 'page']),
    tS('Camp and goals', 'Settle the closest position battles in fall camp, and set growth goals for your players this season.', 'camp', ['tab', 'page']),
    tS('Your playbook', () => (pbkOn() ? 'Pick the plays you call on game day on offense and defense, draw your own, and plan the practice week. Player meetings are next door: a talk keeps a player happy and out of the transfer portal.' : 'The play callers pick the plays and can draw their own. Player meetings are next door: a talk keeps a player happy and out of the transfer portal.'), 'pbook', ['tab', 'tab:meet', 'page']),
    tS('The fans', 'The fan feed reacts to every game, signing and rumor about you and your team. Pick\'em and the highlights are next to it.', 'feed', ['tab', 'tab:pickem', 'page']),
    tS('Everything else', 'Home switches modes. Search finds any player, coach or team. The Inbox lists what\'s waiting on you. Settings has your game-day and automation options, the look and this tutorial.', null, TUT_TOOLS),
  ],
  nfl: [
    tS('Welcome, general manager', () => `You run the ${myName()} front office: the roster, the salary cap, free agency, trades and the draft. The head coach runs the games, and the owner judges you on results.`),
    tS('Play the season', 'This button always does the next thing: sim the week, or take the next offseason step. More sim options skips ahead weeks or whole seasons.', null, TUT_NEXT),
    tS('The offseason', 'Six steps: the season review, the head coach, re-signings, free agency, the draft and training camp. The button at the top moves you through them.', 'off', ['tab', 'page'], tutOff),
    tS('Your office', 'Your head coach and what he wants from you, your last game and the league newswire.', 'office', ['tab', 'page']),
    tS('Contracts and the cap', 'Every contract and its cap hit, future commitments and your draft picks. Release, extend or restructure players, and stay under the cap.', 'cap', ['tab', 'page']),
    tS('Free agency and trades', 'Sign free agents when the market opens (asking prices drop as it goes on), and trade players and picks with the other clubs. Put players on the trade block and clubs call you.', 'fa', ['tab', 'tab:trades', 'page']),
    tS('Every week', 'The pregame show previews the big games and makes its picks, the front page has the headline after, and Advanced stats breaks down every play and drive.', 'pregame', ['tab', 'tab:paper', 'tab:adv', 'page']),
    tS('The draft board', 'Scout the class, hire scouts and set your board. The mock draft shows round one as the experts see it.', 'draft', ['tab', 'page']),
    tS('Waivers and the practice squad', 'Claim players other clubs let go, keep prospects on the practice squad, and write incentives into contracts.', 'nflx', ['tab', 'page']),
    tS('Fans and rivals', 'The fan feed reacts to every move you make, and rival front offices bid for your coaches and keep score.', 'feed', ['tab', 'tab:rivals', 'page']),
    tS('Everything else', 'Home switches modes. Search finds any player in the league. The Inbox lists what\'s waiting on you. Settings has the look, the gameplay options and this tutorial.', null, TUT_TOOLS),
  ],
  nflcoach: [
    tS('Welcome, coach', () => `You're the ${roleTitle(state.co.role)} of the ${myName()}. ${tutNflCoachLine()}`),
    tS('Game day', () => `This button always does the next thing: sim the week, or take the next offseason step. ${tutLiveLine()} More sim options skips ahead.`, null, TUT_NEXT),
    tS('The offseason', 'The offseason runs in steps, and the button at the top moves you through them. The GM signs players and makes the picks, with your input.', 'off', ['tab', 'page'], tutOff),
    tS('Your office', () => `Your job security, your reputation and your standing with the GM${tutCalls() ? ', plus how much of game day you call: the game plan only, the key calls, or every play' : ', and what your job controls'}.`, 'office', ['tab', 'page']),
    tS('The front office', 'Ask the GM to release, trade or re-sign players, and mark free-agent targets and draft picks. He weighs your input but makes the final call.', 'front', ['tab', 'page']),
    tS('Depth chart and systems', tutDepthLine, 'depth', ['tab', 'page']),
    tS('Camp and goals', 'Name the winners of the closest position battles in training camp, and set growth goals for the season.', 'camp', ['tab', 'page']),
    tS('Your playbook', () => (pbkOn() ? 'Pick the plays you call on game day, and draw your own. Player meetings are next door: a talk keeps a player happy.' : 'The play caller picks the plays and can draw his own. Player meetings are next door: a talk keeps a player happy.'), 'pbook', ['tab', 'tab:meet', 'page']),
    tS('Your career', 'Your record, skills, contract and reputation. Your reputation decides which jobs call, in the NFL and in college.', 'career', ['tab', 'page']),
    tS('Everything else', 'Home switches modes. Search finds any player or coach. The Inbox lists what\'s waiting on you. Settings has your game-day and automation options, the look and this tutorial.', null, TUT_TOOLS),
  ],
  comm: [
    tS('Welcome, commissioner', () => `You run ${isPro() ? 'the NFL' : 'college football'}, not a team. You rule on discipline, handle controversies, and set the money and the rules. Here's a quick look at the main parts.`),
    tS('Your standing', () => (isPro() ? 'How the owners, the fans and the players\' union rate you, plus the league\'s integrity and revenue. Keep the owners on your side: they decide whether you keep the job.' : 'How the university presidents, the fans and the athletes rate you, plus the league\'s integrity and revenue. The presidents vote at the end of every season, so keep them on your side.'), null, ['#hdr .board']),
    tS('Run the season', 'This button sims the week, or moves the offseason agenda along. Anything you leave on your desk is decided by your staff.', null, ['#hdr [data-act="primary"]', '#hdr .simmenu']),
    tS('The league office', 'Your desk: discipline cases, controversies and emergencies land here week by week, and you pick the prime-time TV games. Your standing and your term are here too.', 'office', ['tab', 'page']),
    tS('Discipline', 'Every ruling you\'ve made and the precedent it set. Stay near your average and rulings look fair; go easy on a star and it looks like favoritism.', 'cdisc', ['tab', 'page']),
    tS('The money', () => (isPro() ? 'League revenue and the TV deal, the salary cap you set every offseason, the labor deal with the players and revenue sharing.' : 'League revenue and the TV deal, and how athletes get paid: the NIL rules, revenue sharing and the split of the playoff money.'), 'cmoney', ['tab', 'page']),
    tS('League and rules', () => (isPro() ? 'The rules committee, teams changing hands or moving, and the size of the league: add clubs or fold them in the offseason.' : 'The rules committee, the playoff format and realignment: drag any school to another conference on the map.'), 'cleague', ['tab', 'page']),
    tS('The fans', 'The fan feed reacts to your rulings and the games. Pick\'em, the highlights and the friends league are next to it.', 'feed', ['tab', 'tab:pickem', 'page']),
    tS('Your legacy', 'Your legacy score, your achievements and the Hall of Fame class you induct every offseason.', 'clegacy', ['tab', 'page']),
    tS('Everything else', 'Home switches modes. Search finds any player, coach or team. The Inbox lists what\'s on your desk. Settings has the look, the gameplay options and this tutorial.', null, TUT_TOOLS),
  ],
  career: [
    tS('Welcome to your career', () => `${cName(cs.p)}, ${CPOS_NAME[cs.p.pos].toLowerCase()}. One player, from ${cs.lvl === 'hs' ? 'high school' : cs.nfl ? 'your rookie year' : 'college'} to the end of an NFL career. Here's a quick look at the main parts.`),
    tS('Your next game', 'This button plays your next game, where you make the calls on your key snaps, or moves the offseason along. More sim options skips ahead.', null, ['#hdr .acts .btn.primary', '#hdr .simmenu']),
    tS('Home', 'Your next game, your spot on the depth chart, the decisions that come up, and the news about you.', 'home', ['tab', 'page']),
    tS('Your player', 'Your ratings. Spend the skill points you earn from games and offseasons to raise them. Your rival, your profile and your grades are here too.', 'player', ['tab', 'page']),
    tS('Recruiting', 'Schools offer players in their range, and your stars move with your ratings, your games and camps. Visit, commit when you\'re ready, and sign.', 'recruit', ['tab', 'page']),
    tS('Your money', () => (cs.nfl ? 'Your contract, your earnings and your endorsement deals. Spend on training to get better, and the brands call as your following grows.' : 'Your NIL deal and what you earn. Spend it on training programs, and land endorsements as your following grows.'), 'nil', ['tab', 'page']),
    tS('The fan feed', 'Fans, writers and rivals react to your games, your highlights and your choices. Post your own update once a week.', 'cfeed', ['tab', 'page']),
    tS('Life off the field', 'Family weekends, a youth camp back home, a foundation, a visit to your old school: each once a year.', 'life', ['tab', 'page']),
    tS('Records', 'Every team you play for has its own record book. Break a mark and your name goes in it.', 'records', ['tab', 'page']),
    tS('The pregame show', 'Before each game, three hosts preview it and make their picks, and you might come up. After it, the front page has the headline.', 'cshow', ['tab', 'tab:cpaper', 'page']),
    tS('Everything else', 'Home switches modes. The Inbox lists the decisions, offers and skill points waiting on you. Settings has the look, the gameplay options and this tutorial.', null, TUT_TOOLS),
  ],
};
const tutTabOk = t => !t || (appMode === 'career' ? ctabVisible(t) : tabVisible(t) && curTabs().some(x => x[0] === t));
const tutTxt = v => esc(typeof v === 'function' ? v() : v);

/* ---------- when to start ---------- */
// After every render. It only starts once nothing else is on screen: no dialog, no game, no sim, no firing.
function tutReady() {
  if (!$('#modal').hidden || !$('#over').hidden) return false;
  if (appMode === 'ad') return !!state && !state.gameOver && !ui.simming && !ui.slotBusy && !liveBusy();
  if (appMode === 'career') return !!cs && !cui.simming && !gameLocked();
  return false;
}
function tutAfterRender() {
  if (typeof tut === 'undefined' || !tut) return; /* the first render happens while the page is still loading */
  if (tut.on) { setInert(true); tutSoon(); return; }
  tutMaybe();
}
function tutMaybe() {
  clearTimeout(tut.wait); tut.wait = 0;
  if (tut.on || (navigator.webdriver && !window.FE_TUT_TEST)) return; /* automated tests opt in */
  const k = tutKey(); if (!k || tutIsSeen(k)) return;
  if (!tut.acctTried) { tutAcctLoad().then(tutMaybe, tutMaybe); return; }
  if (tut.acctBusy) return;
  if (!tutReady()) { tut.wait = setTimeout(tutMaybe, 1000); return; }
  tut.wait = setTimeout(() => { tut.wait = 0; if (!tut.on && tutKey() === k && !tutIsSeen(k) && tutReady()) tutStart(k, true); else tutMaybe(); }, 450);
}

/* ---------- running it ---------- */
function tutRoot() {
  let r = document.getElementById('tut'); if (r) return r;
  r = document.createElement('div'); r.id = 'tut'; r.hidden = true;
  r.innerHTML = `<svg class="tutdim" aria-hidden="true" focusable="false"><defs><mask id="tutmask" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="100%" height="100%" fill="#fff"></rect><g class="tutholes"></g></mask></defs><rect class="tutshade" x="0" y="0" width="100%" height="100%" mask="url(#tutmask)"></rect></svg><div class="tutrings" aria-hidden="true"></div>
   <div class="tutbox" role="dialog" aria-modal="true" aria-labelledby="tuttl" aria-describedby="tutd"><div class="eyebrow tutstep"></div><h2 class="h2 tuttl" id="tuttl"></h2><p class="tutd" id="tutd"></p><div class="tutbar" aria-hidden="true"><i></i></div>
    <div class="tutnav"><button type="button" class="btn ghost sm" data-tut="skip">Skip tutorial</button><span class="tutsp"></span><button type="button" class="btn sm" data-tut="back">Back</button><button type="button" class="btn primary sm" data-tut="next">Next</button></div></div>`;
  r.addEventListener('click', e => {
    const b = e.target.closest('[data-tut]'); if (!b) { const box = r.querySelector('.tutbox'); if (!box.contains(e.target)) { box.classList.remove('nudge'); void box.offsetWidth; box.classList.add('nudge'); } return; }
    const a = b.dataset.tut; if (a === 'next') tutNext(); else if (a === 'back') tutBack(); else if (a === 'skip') tutEnd();
  });
  document.body.appendChild(r); return r;
}
function tutStart(k, auto, i) {
  const all = TUT[k]; if (!all) return false;
  const prev = tut.on ? { back: tut.back, focus: tut.focus } : null; if (tut.on) tutEnd(true); /* starting over keeps the place to go back to */
  const steps = all.filter(s => (!s.when || s.when()) && tutTabOk(s.tab)); if (!steps.length) return false;
  clearTimeout(tut.wait); tut.wait = 0;
  Object.assign(tut, { on: true, k, auto: !!auto, steps, i: 0, back: prev ? prev.back : { tab: appMode === 'career' ? cui.tab : ui.tab, y: window.scrollY }, focus: prev ? prev.focus : document.activeElement });
  tutMarkSeen(k); /* it has really shown now; Skip and closing the page count as seen too */
  const r = tutRoot(); r.hidden = false; r.classList.add('tutnew'); setInert(true); /* the first placement doesn't slide */
  tutGo(Math.max(0, Math.min(steps.length - 1, +i || 0)));
  requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove('tutnew')));
  return true;
}
function tutGo(i) {
  const s = tut.steps[i]; if (!s) { tutEnd(); return; }
  tut.i = i; const r = tutRoot(); const n = tut.steps.length; const last = i === n - 1;
  if (s.tab) {
    try {
      if (appMode === 'career') { if (cui.tab !== s.tab) { cui.tab = s.tab; cui.confirm = null; render(); } }
      else if (ui.tab !== s.tab) { ui.tab = s.tab; ui.confirm = null; render(); }
    } catch (e) { console.error(e); }
  }
  window.scrollTo(0, 0);
  r.querySelector('.tutstep').textContent = `Tutorial · ${i + 1} of ${n}`;
  r.querySelector('.tuttl').innerHTML = tutTxt(s.t); r.querySelector('.tutd').innerHTML = tutTxt(s.d);
  r.querySelector('.tutbar i').style.width = Math.round((i + 1) / n * 100) + '%';
  const bk = r.querySelector('[data-tut="back"]'), nx = r.querySelector('[data-tut="next"]'), sk = r.querySelector('[data-tut="skip"]');
  bk.disabled = i === 0; bk.style.visibility = i === 0 ? 'hidden' : '';
  nx.textContent = last ? (tut.auto ? 'Start playing' : 'Done') : 'Next'; sk.style.visibility = last ? 'hidden' : '';
  tutScrollTargets(s);
  tutPlace(); tut.tm.forEach(clearTimeout); tut.tm = [120, 480, 800].map(ms => setTimeout(tutPlace, ms)); /* pages slide in when they open */
  const box = r.querySelector('.tutbox'); if (!box.contains(document.activeElement) || document.activeElement.disabled) nx.focus({ preventScroll: true });
  announce(`${r.querySelector('.tuttl').textContent}. ${r.querySelector('.tutd').textContent}`);
}
function tutNext() { if (!tut.on) return; if (tut.i >= tut.steps.length - 1) tutEnd(); else tutGo(tut.i + 1); }
function tutBack() { if (tut.on && tut.i > 0) tutGo(tut.i - 1); }
function tutEnd(quiet) {
  if (!tut.on) return; tut.on = false; tut.tm.forEach(clearTimeout); tut.tm = []; cancelAnimationFrame(tut.raf);
  const r = document.getElementById('tut'); if (r) r.hidden = true;
  const b = tut.back; tut.back = null; const f = tut.focus; tut.focus = null;
  if (quiet) return;
  try {
    if (b && appMode === 'career' && cs && cui.tab !== b.tab) { cui.tab = b.tab; render(); }
    else if (b && appMode === 'ad' && state && ui.tab !== b.tab) { ui.tab = b.tab; render(); }
  } catch (e) { console.error(e); }
  window.scrollTo(0, b ? b.y || 0 : 0);
  setInert(!$('#modal').hidden || !$('#over').hidden);
  const ok = el => el && el.isConnected && !el.disabled && el.getClientRects().length && !el.closest('[inert]');
  const t = ok(f) ? f : document.querySelector('#hdr [data-act="primary"]:not([disabled]), #hdr .acts .btn.primary');
  if (ok(t)) t.focus({ preventScroll: true });
}

/* ---------- pointing at things ---------- */
const tutRectOf = el => { if (!el || el.closest('[hidden]')) return null; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 ? r : null; };
const tutFirst = sel => { for (const el of document.querySelectorAll(sel)) if (tutRectOf(el)) return el; return null; };
// a tab is in the top tabs or the sidebar, or on phones in the bar at the bottom; a page that isn't in that bar shows under More
function tutTabEl(k, main) { return tutFirst(`#tabs [data-tab="${k}"]`) || tutFirst(`#mnav [data-tab="${k}"]`) || (main ? tutFirst('#mnav [data-act="moremenu"], #mnav [data-act="cmore"]') : null) || tutFirst('#tabs .tmore'); }
// The first block on the page with a heading; a tall one is pointed at by its top part, down to the last piece
// that fits in about 40% of the screen.
function tutPageRect() {
  const v = $('#view'); if (!v) return null; const vh = window.innerHeight;
  const skip = el => el.matches('.flash, .undobar, .toast, [hidden]') || !tutRectOf(el);
  const titled = el => !!el.querySelector('.eyebrow, .head, h1, h2, h3, .h2, .h3');
  const blocks = []; [...v.children].forEach(c => { if (skip(c)) return; if (c.matches('.grid2, .grid3, .modes')) [...c.children].forEach(g => { if (!skip(g)) blocks.push(g); }); else blocks.push(c); });
  const el = blocks.find(titled) || blocks[0]; if (!el) return null;
  const r = el.getBoundingClientRect(); const lim = r.top + Math.max(120, vh * 0.42);
  if (r.bottom <= lim) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  let bottom = 0;
  for (const c of el.children) { const q = c.getBoundingClientRect(); if (!q.height) continue; if (q.bottom <= lim) bottom = Math.max(bottom, q.bottom); else { if (!bottom) bottom = Math.min(q.bottom, lim); break; } }
  return { left: r.left, top: r.top, right: r.right, bottom: (bottom || r.top + 120) + 10 };
}
function tutTargetEls(s) {
  return s.at.map(a => (a === 'tab' ? tutTabEl(s.tab, true) : a.startsWith('tab:') ? tutTabEl(a.slice(4), false) : a === 'page' ? 'page' : tutFirst(a))).filter(Boolean);
}
// tabs scrolled out of the strip or the sidebar come into view, and so does a target further down the page
function tutScrollTargets(s) {
  tutTargetEls(s).forEach(el => {
    if (el === 'page') return;
    if (el.closest('#tabs')) { try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); } catch (e) { } return; }
    if (el.closest('#view')) { const r = el.getBoundingClientRect(); if (r.top < 60 || r.bottom > window.innerHeight - 20) { try { el.scrollIntoView({ block: 'center', behavior: 'instant' }); } catch (e) { } } }
  });
}
function tutRects(s) {
  const vw = window.innerWidth, vh = window.innerHeight;
  return tutTargetEls(s).map(el => {
    const r = el === 'page' ? tutPageRect() : tutRectOf(el); if (!r) return null; const p = el === 'page' ? 4 : 5;
    const q = { left: Math.max(3, r.left - p), top: Math.max(3, r.top - p), right: Math.min(vw - 3, r.right + p), bottom: Math.min(vh - 3, r.bottom + p) };
    return q.right - q.left > 8 && q.bottom - q.top > 8 ? q : null;
  }).filter(Boolean);
}
// Where the box goes: next to what it points at without covering it, inside the screen and above the phone's bottom bar.
function tutPick(rects, w, h, vw, top, bot) {
  const M = 12, G = Math.min(16, Math.max(0, (vw - w) / 2)); const cx = R => (R.left + R.right) / 2;
  const clampX = x => Math.max(G, Math.min(vw - w - G, x)); const clampY = y => Math.max(top, Math.min(bot - h, y));
  const mid = [clampX((vw - w) / 2), clampY((top + bot - h) / 2)]; if (!rects.length) return mid;
  const U = rects.reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) }));
  const C = []; [rects[rects.length - 1], U].forEach(R => C.push([clampX(cx(R) - w / 2), R.bottom + M], [clampX(cx(R) - w / 2), R.top - M - h], [R.right + M, clampY(R.top)], [R.left - M - w, clampY(R.top)]));
  C.push([clampX((vw - w) / 2), bot - h], [clampX((vw - w) / 2), top]);
  const fits = ([x, y]) => x >= G - 0.5 && x + w <= vw - G + 0.5 && y >= top - 0.5 && y + h <= bot + 0.5;
  const cover = ([x, y]) => rects.reduce((s, r) => s + Math.max(0, Math.min(x + w, r.right) - Math.max(x, r.left)) * Math.max(0, Math.min(y + h, r.bottom) - Math.max(y, r.top)), 0);
  let best = null, bs = Infinity; C.forEach((c, i) => { if (!fits(c)) return; const sc = cover(c) + i; if (sc < bs) { bs = sc; best = c; } });
  return best || mid;
}
function tutPlace() {
  if (!tut.on) return; const r = tutRoot(); const s = tut.steps[tut.i]; if (!s) return;
  const vw = window.innerWidth, vh = window.innerHeight; const rects = tutRects(s);
  r.querySelector('.tutholes').innerHTML = rects.map(q => `<rect x="${q.left.toFixed(1)}" y="${q.top.toFixed(1)}" width="${(q.right - q.left).toFixed(1)}" height="${(q.bottom - q.top).toFixed(1)}" rx="9" ry="9" fill="#000"></rect>`).join('');
  const rw = r.querySelector('.tutrings'); while (rw.children.length < rects.length) rw.appendChild(document.createElement('div')); while (rw.children.length > rects.length) rw.lastChild.remove();
  rects.forEach((q, j) => { const d = rw.children[j]; d.className = 'tutring'; Object.assign(d.style, { left: q.left + 'px', top: q.top + 'px', width: (q.right - q.left) + 'px', height: (q.bottom - q.top) + 'px' }); });
  const box = r.querySelector('.tutbox'); const w = Math.min(400, vw - 32); box.style.width = w + 'px';
  const mn = tutRectOf(document.getElementById('mnav')); const bot = vh - 8 - (mn ? mn.height : 0);
  const h = Math.min(box.offsetHeight, bot - 8); const [x, y] = tutPick(rects, w, h, vw, 8, bot);
  box.style.left = Math.round(x) + 'px'; box.style.top = Math.round(y) + 'px'; box.style.maxHeight = (bot - 8) + 'px';
}
function tutSoon() { if (!tut.on) return; cancelAnimationFrame(tut.raf); tut.raf = requestAnimationFrame(tutPlace); }
window.addEventListener('resize', tutSoon);
window.addEventListener('scroll', tutSoon, { passive: true, capture: true });
// While it runs, keys belong to the tutorial: the arrows step, Escape skips, Tab stays inside it, and the page's
// shortcuts (N, L, 1-9, ?) wait until it's over.
window.addEventListener('keydown', e => {
  if (!tut.on) return; const k = e.key; const box = tutRoot().querySelector('.tutbox');
  if (k === 'Escape') { e.preventDefault(); tutEnd(); }
  else if (k === 'ArrowRight') { e.preventDefault(); tutNext(); }
  else if (k === 'ArrowLeft') { e.preventDefault(); tutBack(); }
  else if (k === 'Tab') {
    const f = [...box.querySelectorAll('button')].filter(b => !b.disabled && b.style.visibility !== 'hidden'); const cur = document.activeElement; const at = f.indexOf(cur);
    e.preventDefault(); if (f.length) f[(at < 0 ? (e.shiftKey ? f.length - 1 : 0) : (at + (e.shiftKey ? -1 : 1) + f.length) % f.length)].focus();
  } else if ((k === 'Enter' || k === ' ') && !box.contains(document.activeElement)) { e.preventDefault(); tutNext(); }
  e.stopImmediatePropagation();
}, true);
// A dialog or the game-over screen closing is the moment a waiting tutorial can start.
(function tutWatch() {
  const mo = new MutationObserver(() => { if (!tut.on && !tut.wait) tut.wait = setTimeout(tutMaybe, 300); });
  ['modal', 'over'].forEach(id => { const el = document.getElementById(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['hidden'] }); });
})();
// the v9.9 name, for anything that still calls it
function tourShow(k, i) { return tutStart(k, false, i); }
Object.assign(actions, {
  tourreplay() { const k = tutKey(); if (k) tutStart(k, false, 0); },
  tutreset() {
    tutReset(); const b = document.querySelector('[data-act="tutreset"]'); const row = b && b.closest('.setrow'); const h = row && row.querySelector('.hint');
    if (b) { b.textContent = 'Reset'; b.disabled = true; } if (h) h.textContent = 'Done. Each mode shows its tutorial again the next time you open it.';
    announce('Tutorials reset. Each mode shows its tutorial again the next time you open it.');
  },
});
// the page's first render ran before this file loaded, so check once now in case it opened straight into a mode
setTimeout(() => { try { tutMaybe(); } catch (e) { console.error(e); } }, 0);


