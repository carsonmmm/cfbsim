/* ===================== EXTRAS (v9.12): fan feed, pick'em, rival executives, award night, game of the week,
 * the business of the program, camp battles and growth goals, the NFL waiver wire, practice squad and incentives,
 * life off the field, a new player in the same world, and an NFL expansion draft. Engine only: no DOM.
 * Everything new here uses hash() for its choices, never R(), so it never shifts the game's random stream.
 * State lives in state.x (AD, Coach, NFL, Commissioner saves) and cs.x (Player Career), created lazily, so
 * old saves load untouched. */
function X() { if (!state.x || typeof state.x !== 'object') state.x = {}; return state.x; }
function CX() { if (!cs.x || typeof cs.x !== 'object') cs.x = {}; return cs.x; }
/* ---------- extras data checks (v9.21) ----------
 * The shape each extras store needs. When a save loads, a store with the wrong shape (a hand-edited or half-written
 * save) is removed, so it starts fresh the next time it's used, and the player is told which parts were reset,
 * instead of a page breaking later (FE-06). Types: a = list, o = object, n = number, s = text; ! = must be there. */
const X_SHAPE = { feed: 'o:posts=a!,seq=n', pk: 'o:games=a,picks=o,exp=a,log=a,hist=a', rx: 'o:list=a', goals: 'o:list=a,hist=a', pg: 'o:rec=a,wk=o,hist=a', fp: 'o:list=a!', pack: 'o:t=o!,q=a!', osp: 'o:lv=o!,hist=a!', tvn: 'o', dst: 'o:cur=o!,cands=o', gpr: 'o', pb: 'o:on=a!,custom=a!', mtg: 'o:met=a,hist=a,prom=a', tbk: 'o:ids=a!', obm: 'o:got=o,hist=a', prep: 'o:wk=o,hist=a', csr: 'o:seen=o', reno: 'o', bst: 'o:list=a!', acad: 'o:hist=a!', dpb: 'o:on=a!,custom=a!', prac: 'o:inst=n,rest=n,fat=n', hv: 'o:done=o', stad: 'o', story: 'a', gotw: 'a', biz: 'o:proj=o,build=a,promo=o,staff=o', scn: 'o:goals=a!', scnEv: 'a', camp: 'o:list=a', promo: 'a' };
const CX_SHAPE = { feed: 'o:posts=a!,seq=n', pg: 'o:rec=a,wk=o,hist=a', fp: 'o:list=a!', trn: 'o:done=o', sb: 'o:done=o', cap: 'o:hist=a', ct: 'o:log=a!,open=o!,last=o!', story: 'a', reel: 'a', legends: 'a', life: 'o:fam=a,did=o,log=a', bt: 'o:log=a', nflHist: 'a', hofSel: 'o:m=a,p=a', scn: 'o:goals=a!', scnEv: 'a' };
const X_NAME = { feed: 'fan feed', pk: 'pick\'em', rx: 'rivals', goals: 'goals', pg: 'pregame show', fp: 'front page', pack: 'team pack', osp: 'other sports', tvn: 'TV network', dst: 'department staff', gpr: 'ticket prices', pb: 'playbook', mtg: 'player meetings', tbk: 'trade block', obm: 'owner budget meetings', prep: 'game prep', csr: 'coaching search', reno: 'stadium renovation', bst: 'boosters', acad: 'academics', dpb: 'defensive playbook', prac: 'practice', hv: 'home visits', stad: 'stadium', story: 'story', gotw: 'game of the week', biz: 'business', scn: 'scenario', scnEv: 'scenario events', camp: 'camp battles', promo: 'assistant promotions', trn: 'offseason training', sb: 'Senior Bowl', cap: 'captaincy', ct: 'contract talks', reel: 'career reel', legends: 'legends', life: 'life', bt: 'position battle', nflHist: 'NFL history', hofSel: 'Hall of Fame' };
const xTypeOk = (v, t) => t === 'a' ? Array.isArray(v) : t === 'o' ? !!v && typeof v === 'object' && !Array.isArray(v) : t === 'n' ? typeof v === 'number' && Number.isFinite(v) : t === 's' ? typeof v === 'string' : true;
function xShapeOk(v, spec) { const [t, f] = spec.split(':'); if (!xTypeOk(v, t)) return false; return !f || f.split(',').every(fs => { const [k, ft] = fs.replace('!', '').split('='); return v[k] == null ? !fs.endsWith('!') : xTypeOk(v[k], ft); }); }
// checks a save's extras (the object, and its shape table); returns the names of the parts that were reset
function xSanitize(holder, shape) {
  if (!holder) return []; if (holder.x == null) return []; if (!xTypeOk(holder.x, 'o')) { holder.x = {}; return ['all optional data']; }
  const out = []; Object.keys(shape).forEach(k => { const v = holder.x[k]; if (v != null && !xShapeOk(v, shape[k])) { delete holder.x[k]; out.push(X_NAME[k] || k); } }); return out;
}
// a page that still won't draw: find the one extras store that breaks it and reset just that store (returns its key)
function xRepairKey(obj, draw) {
  for (const k of Object.keys(obj || {})) { const v = obj[k]; delete obj[k]; let ok = false; try { draw(); ok = true; } catch (e) { /* not this one */ } if (ok) return k; obj[k] = v; }
  return null;
}
const xRepairView = (obj, draw) => { const k = xRepairKey(obj, draw); return k ? [X_NAME[k] || k] : null; };
// Careers started from v9.25 on use the better-mixed hash for these picks; older saves keep the original so nothing
// already set in them changes (SUS-03).
const xh = k => (state && state.hashV >= 2 ? hmix : hash)(String(state && state.seed || 0) + ':x:' + k);
const cxh = k => (cs && cs.hashV >= 2 ? hmix : hash)(String(cs && cs.seed || 0) + ':cx:' + k);
const xpk = (arr, v) => arr[Math.min(arr.length - 1, Math.floor(v * arr.length))];
const xfill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : ''));
const xLast = n => String(n || '').split(' ').slice(-1)[0];
const xCareer = () => typeof appMode !== 'undefined' && appMode === 'career' && typeof cs !== 'undefined' && !!cs;
const xWho = () => (isComm() ? 'The commissioner' : isOwner() ? 'The owner' : isCoach() ? (state.co && state.co.name) || 'Coach' : isPro() ? 'The GM' : 'The AD');

/* ===================== THE FAN FEED ===================== */
// A season-long social feed of made-up fans, writers and rivals who react to everything that happens: results,
// the players who made them, injuries, commitments, coaching moves, your business decisions and your own posts.
const FEED_P = {
  diehard: { w: 4, bio: ['Season tickets since {yr}. Never miss a snap.', 'Born into it. Raising my kids in it.', 'Home and away. Every game.'] },
  doomer: { w: 3, bio: ['Expect the worst, never disappointed.', 'I have seen this movie before.', 'Cautiously pessimistic.'] },
  stats: { w: 2, bio: ['Charts, splits and the occasional hot take.', 'If it is not in the box score it did not happen.', 'Spreadsheet guy.'] },
  oldtimer: { w: 2, bio: ['First game: {yr}. Seen it all.', 'Back in my day the linemen played both ways.', 'Retired. Plenty of time to post.'] },
  student: { w: 3, bio: ['Student section, row 3. Voice gone by halftime.', 'Class of {cy}. Mostly here for game day.', 'Sleep is for the offseason.'] },
  band: { w: 1, bio: ['Trumpet, second row. Halftime is the real show.', 'Drumline. We are louder than the crowd.'] },
  parent: { w: 1, bio: ['Football mom. Proud of my son and his teammates.', 'Football dad. Sideline, every week.'] },
  insider: { w: 2, v: 1, bio: ['Recruiting news first. Sources everywhere.', 'Covering recruiting for a national site.'] },
  beat: { w: 2, v: 1, bio: ['Covers {team} for the {paper}.', 'Beat writer, {team}. Practice notes daily.'] },
  analyst: { w: 1, v: 1, bio: ['National football analyst.', 'TV analyst. Former player.'] },
  troll: { w: 3, rival: 1, bio: ['{rival} fan. Here for the meltdowns.', 'Living rent free in your mentions.', 'Proud {rival} alum.'] },
  tailgate: { w: 1, bio: ['Lot 7. Brisket on by 7 a.m.', 'Grill master. Will talk weather.'] },
  meme: { w: 2, bio: ['I make the edits.', 'Here for the jokes.'] },
  casual: { w: 2, bio: ['Watches when it is on.', 'Bandwagon and proud.'] },
};
const FEED_A1 = ['Saturday', 'Endzone', 'Blitz', 'Gridiron', 'RedZone', 'Pigskin', 'Huddle', 'Tailgate', 'Sideline', 'FourthDown', 'TwoMinute', 'Audible', 'Snap', 'Goalline', 'Kickoff', 'Hashmark', 'Fieldgoal', 'Playaction', 'Pocket', 'Trenches'];
const FEED_A2 = ['Steve', 'Mom', 'Dad', 'Kid', 'Guru', 'Joe', 'Prophet', 'Ref', 'Truther', 'Nerd', 'Fan', 'Hawk', 'Junkie', 'Grandpa', 'Queen', 'King', 'Crew', 'Diaries', 'Daily', 'Takes'];
const FEED_FN = ['Mike', 'Jen', 'Dave', 'Tasha', 'Carlos', 'Beth', 'Andre', 'Kim', 'Rob', 'Lena', 'Marcus', 'Sara', 'Tony', 'Priya', 'Gus', 'Hannah', 'Derek', 'Nina', 'Walt', 'Maya', 'Jamal', 'Erin', 'Luis', 'Grace'];
const FEED_LN = ['Kowalski', 'Bennett', 'Ramos', 'Okafor', 'Lindqvist', 'Morrow', 'Patel', 'Delgado', 'Hart', 'Brennan', 'Sato', 'Whitfield', 'Novak', 'Grant', 'Ellison', 'Fuentes', 'Carver', 'Ibarra', 'Pryor', 'Yates'];
const FEED_PAPER = ['Daily Ledger', 'Tribune', 'Morning Star', 'Gazette', 'Courier', 'Herald'];
const FEED_COLS = ['#d64545', '#2f6fd6', '#2e9e5b', '#c27c0e', '#7a4fc7', '#0f8b8d', '#c2417a', '#5b6470', '#a35d1f', '#3b7d3b'];
// the cast: made once per save from its seed
function feedCast(F, key, team, rival, yr) {
  if (F.acc && F.acc.length) return F.acc;
  const h = k => hash(key + ':acc:' + k); const list = []; const used = new Set();
  const per = []; Object.entries(FEED_P).forEach(([p, d]) => { for (let i = 0; i < d.w; i++) per.push(p); });
  for (let i = 0; i < 26; i++) {
    const p = i < per.length ? per[i] : xpk(per, h(i + 'p')); const d = FEED_P[p];
    const fn = xpk(FEED_FN, h(i + 'f')), ln = xpk(FEED_LN, h(i + 'l'));
    let handle = d.v ? (fn + ln).slice(0, 15) : (xpk(FEED_A1, h(i + 'a')) + xpk(FEED_A2, h(i + 'b')) + (h(i + 'n') < 0.5 ? Math.floor(h(i + 'm') * 99) : ''));
    while (used.has(handle)) handle += Math.floor(h(handle) * 9); used.add(handle);
    const name = d.v ? fn + ' ' + ln : p === 'troll' ? xfill('{r} {x}', { r: rival || 'Rival', x: xpk(['Fan', 'Truther', 'Alum', 'Guy'], h(i + 'tr')) }) : h(i + 'nm') < 0.45 ? fn + ' ' + ln[0] + '.' : handle.replace(/\d+$/, '');
    const bio = xfill(xpk(d.bio, h(i + 'bio')), { yr: yr - 5 - Math.floor(h(i + 'y') * 45), cy: yr + 1 + Math.floor(h(i + 'c') * 3), team, rival: rival || 'rival', paper: xpk(FEED_PAPER, h(i + 'pp')) });
    const fol = Math.round(d.v ? 20000 + h(i + 'fo') * 260000 : p === 'meme' ? 3000 + h(i + 'fo') * 40000 : 40 + Math.pow(h(i + 'fo'), 2) * 6000);
    list.push({ h: handle, n: name, p, v: d.v ? 1 : 0, fol, c: xpk(FEED_COLS, h(i + 'col')), bio });
  }
  F.acc = list; return list;
}
// who says what. {T} team, {A} short name, {O} opponent, {S} score, {P} player, {L} his line, {R} rival, {C} coach,
// {N} a number, {H} the main hashtag, {X} anything extra
const FEED_T = {
  winBig: {
    diehard: ['{S}. Never in doubt. {H}', 'THAT is the team I have been waiting for. {S} over {O}!', 'Put it on the big screen and leave it there. {S}.'],
    doomer: ['Fine. I will admit it. That was a beatdown. Ask me again next week.', 'Good win but {O} is not exactly a measuring stick.'],
    stats: ['{A} outgained {O} by a mile. {N} total yards. Not a fluke.', 'Win probability never dipped under 80 percent after the first quarter.'],
    oldtimer: ['Reminds me of the old days. Run it down their throats.', 'Haven\'t seen a {S} like that in years.'],
    student: ['Student section was ROCKING. {S}!!', 'my voice is gone and I regret nothing {H}'],
    meme: ['{O} fans walking to the parking lot in the 3rd quarter:', 'scoreboard operator had to call in for overtime pay'],
    troll: ['Wow you beat {O}. Want a trophy?', 'Enjoy it. Real teams are coming.'],
    casual: ['Was that good? Seemed good. {S}.'],
    tailgate: ['Win at the tailgate, win on the field. Ribs were perfect too.'],
    beat: ['Final: {A} {S} over {O}. Postgame notes coming up.', '{A} rolls, {S}. {P} led the way ({L}).'],
  },
  win: {
    diehard: ['W. Moving on. {H}', 'Win is a win. {S}. On to the next one.', '{P} is HIM. {L}.'],
    doomer: ['We won but did anyone else watch the second half??', 'Survive and advance I guess. That defense though.'],
    stats: ['{P}: {L}. Efficient day.', 'Third-down conversions told the story today.'],
    student: ['WE WON LETS GOOO {H}', 'class is cancelled tomorrow (in my heart)'],
    parent: ['So proud of these young men. {S}!', 'Great team win. Hug your players tonight, parents.'],
    beat: ['Final: {A} {S} over {O}. {P}: {L}.', 'Good enough. {A} improves after {S} win over {O}.'],
    troll: ['Closer than it should have been. Just saying.', 'Ok but who did you beat'],
    meme: ['me pretending I wasn\'t nervous in the 4th quarter', '{P} after that play: *adjusts gloves*'],
    casual: ['Nice win today!', 'Good game {A}'],
  },
  winClose: {
    diehard: ['MY HEART. {S}!!!', 'They made it interesting but a W is a W. {H}', 'Ice in the veins. {S}.'],
    doomer: ['I aged ten years in that fourth quarter. We are not a good team.', 'Won by {M}. Don\'t celebrate too hard.'],
    stats: ['{A} had a 41 percent win chance with 6 minutes left. Clutch.', 'Close games are mostly luck. Enjoy it anyway.'],
    student: ['I CANNOT FEEL MY LEGS {S}', 'rushing the field in my mind'],
    oldtimer: ['Never leave early. Never.'],
    meme: ['my blood pressure watching that last drive:', 'this team is a horror movie and I love it'],
    beat: ['{A} escapes, {S}. {P} made the difference ({L}).'],
    troll: ['You got lucky and you know it.', 'Refs earned their checks today.'],
  },
  upset: {
    diehard: ['WHO DOUBTED US?! {S} over {O}!!!', 'Nobody believed. We believed. {H}', 'Statement. Win.'],
    analyst: ['Upset alert came true: {A} knocks off {O}, {S}. That changes the picture.', 'Nobody had {A} winning this one. Credit the staff.'],
    stats: ['{A} entered as a {N} percent underdog. Biggest win in years.', 'That is the biggest upset by win probability this season.'],
    student: ['STORM THE FIELD STORM THE FIELD', 'I will tell my grandkids about {S}'],
    oldtimer: ['Been waiting a long time for one like that.'],
    troll: ['...', 'Fine. Good game. I\'m logging off.'],
    meme: ['{O} fans right now:', 'Vegas in shambles'],
    beat: ['UPSET: {A} {S} over {O}. {P} sparked it ({L}).'],
  },
  rivalW: {
    diehard: ['WE OWN {R}. {S}. Say it louder. {H}', 'The best day of the year. Beat {R}. Done.', 'Rivalry week, rivalry W. {S}.'],
    oldtimer: ['That one never gets old. Beat {R} every year of my life and I\'ll die happy.'],
    student: ['{R} FANS WHERE ARE YOU NOW', 'best day of my college life'],
    troll: ['Whatever. We\'ll see you next year.', 'Refs, wind, field, luck. Pick one.'],
    meme: ['{R} message boards right now:', 'brb framing this box score'],
    stats: ['{A} leads the series now. Little things add up.'],
    beat: ['{A} wins the rivalry game, {S}. {P}: {L}.'],
    parent: ['Rivalry wins hit different. So proud of these boys.'],
  },
  loss: {
    diehard: ['Tough one. We bounce back. {H}', 'Still with this team. Always.', 'Not our day. On to the next.'],
    doomer: ['Told you. Told all of you.', 'Same problems every year. Nothing changes.', 'Season over. See you in the spring.'],
    stats: ['Lost the turnover battle and that was the game.', 'Red zone efficiency did us in again.'],
    oldtimer: ['Back in my day we ran the ball when it rained.'],
    student: ['ok that hurt', 'i need a minute'],
    troll: ['LOL. {S}. Hahahaha.', 'Same old {A}.', 'How is that coach still employed'],
    meme: ['me turning off the TV after the 3rd quarter:', 'not like this'],
    beat: ['Final: {O} {S} over {A}. Turnovers loomed large.'],
    parent: ['Heads up boys. Proud of the fight.'],
  },
  lossBad: {
    doomer: ['Embarrassing. That is the word. Embarrassing.', 'I want answers. Real ones.', 'Lost to {O}. {O}!'],
    diehard: ['I\'m not giving up on this team but that was BAD.', 'Nobody look at me tomorrow.'],
    stats: ['{A} was a {N} percent favorite. Among the worst losses in the program\'s recent history.'],
    troll: ['This is the funniest thing I have ever seen.', 'Can we play you every week?'],
    meme: ['the scoreboard: {S}. me:', 'delete the tape'],
    analyst: ['Hard to explain that one. {A} lost to {O}, {S}.'],
    beat: ['A stunner: {O} {S} over {A}. Postgame mood: grim.'],
    oldtimer: ['Worst loss I\'ve seen in a while. And I\'ve seen a lot.'],
  },
  lossClose: {
    diehard: ['So close. Heads up. {H}', 'One play. That\'s all it was.'],
    doomer: ['Close doesn\'t count. We always find a way.', 'Should have run it on third down. Every time.'],
    stats: ['Lost by {M}. Play-calling in the last two minutes will be debated all week.'],
    student: ['WHY', 'this team will be the death of me'],
    troll: ['Almost! Cute.', 'So close yet so you.'],
    beat: ['{O} holds on, {S}. {A} had chances late.'],
  },
  rivalL: {
    doomer: ['Lost to {R}. Again. Somebody has to pay for this.', 'I can\'t go to work Monday.'],
    diehard: ['Hurts more than any loss. We\'ll get them next year.'],
    troll: ['{R} OWNS YOU. {S}!!!', 'See you next year. Same result.', 'Hey {A} fans, how\'s the weather down there?'],
    oldtimer: ['Losing to {R} ruins my whole winter.'],
    student: ['I am not leaving my dorm this week'],
    meme: ['{A} fans pretending the rivalry game doesn\'t matter:'],
    beat: ['{R} wins the rivalry game, {S}. Questions for {A}.'],
  },
  perf: {
    stats: ['{P}: {L}. Season-best.', 'Quietly, {P} has been one of the best at his position. {L} today.'],
    diehard: ['{P} deserves all the flowers. {L}!', 'Put {P} on the cover. {L}.'],
    student: ['{P} for president', '{P} is literally him'],
    parent: ['That\'s my baby! {L}! Proud of you {P}!'],
    analyst: ['{P} ({L}) showed up on the stage. Scouts will notice.'],
    meme: ['{P} when he gets the ball:'],
  },
  hype: {
    diehard: ['{O} week. Let\'s go. {H}', 'Clear your calendars. {O} on Saturday.', 'Who\'s ready for {O}??'],
    doomer: ['{O} is better than people think. Could be ugly.', 'Trap game. Mark my words.'],
    stats: ['Model has {A} at {N} percent against {O}.', '{O} allows the fewest yards per carry in its conference. Tough test.'],
    tailgate: ['{O} week menu: wings, chili, a little optimism.', 'Forecast says {X}. Bring layers.'],
    insider: ['A few top recruits are planning to visit for the {O} game.'],
    troll: ['{O} is going to cook you.', 'Enjoy the bye... I mean the {O} game.'],
    student: ['{O} week!! wear the colors', 'who\'s coming to the game I need a ride'],
    beat: ['{O} preview: three things to watch Saturday.', 'Injury report ahead of {O}: nothing major so far.'],
    band: ['New halftime show for {O} week. You\'re not ready.'],
  },
  hypeRival: {
    diehard: ['IT\'S {R} WEEK. Nothing else matters. {H}', 'Beat {R}. That\'s the whole post.'],
    oldtimer: ['I\'ve watched this rivalry for decades. This year feels different.'],
    troll: ['Can\'t wait to see you cry again.', 'Get your tissues ready.'],
    student: ['{R} week. Sleep is cancelled.'],
    meme: ['me counting down to {R} week:', 'normal week vs. {R} week:'],
    beat: ['Rivalry week: {A} vs. {R}. All the storylines.'],
  },
  inj: {
    doomer: ['Lost {P}. Season over.', 'We can never stay healthy. Never.'],
    diehard: ['Prayers for {P}. Next man up.', 'Get well soon {P}. We need you.'],
    stats: ['Without {P} the depth chart gets thin at {X}.'],
    beat: ['Injury update: {P} ({X}) is out. Timeline unclear.'],
    parent: ['Praying for {P} and his family.'],
    troll: ['Convenient excuse incoming.'],
  },
  commit: {
    insider: ['BREAKING: {N}-star {X} {P} commits to {A}. {H}', 'Commit alert: {P} ({N}-star {X}) is in for {A}.'],
    diehard: ['WELCOME HOME {P}!!! {H}', 'Recruiting is cooking. Welcome {P}!'],
    stats: ['{P} would be the highest rated {X} in the class so far.'],
    student: ['{P} I will personally carry your bags to the dorm'],
    troll: ['He\'ll decommit by December.'],
    doomer: ['Great, now actually develop him.'],
  },
  flip: {
    insider: ['FLIP: {P} ({N}-star {X}) backs off his pledge to {A}.', 'Sources: {P} is no longer committed to {A}.'],
    doomer: ['Of course. Of course he did.', 'Can\'t keep anybody.'],
    diehard: ['His loss. Next.', 'We\'ll be fine. Keep recruiting.'],
    troll: ['LMAOOO another one', 'Recruiting is going great over there huh'],
  },
  coachOut: {
    beat: ['{C} is out at {X}. The search begins.', 'Change at the top: {C} is out at {X}.'],
    doomer: ['About time.', 'Should have happened a year ago.'],
    diehard: ['Thank you {C}. Time for a new voice.'],
    troll: ['Who would even take that job'],
    analyst: ['That opening becomes one of the most interesting jobs in the country.'],
  },
  coachIn: {
    beat: ['{X} names {C} head coach.', 'It\'s official: {C} is the new head coach at {X}.'],
    diehard: ['Welcome {C}! Excited for the future.', 'New era. Let\'s go.'],
    doomer: ['Not who I wanted. We\'ll see.'],
    stats: ['{C}\'s teams have been better than expected in close games. Small sample.'],
    troll: ['Interesting choice. Very interesting.'],
  },
  hot: {
    doomer: ['#Fire{X}. I\'ve said it all season.', 'Make a change. Now.', 'This is the fifth bad loss under {C}. Enough.'],
    diehard: ['I don\'t want to be that guy, but something has to change.', 'Give {C} one more year? I don\'t know anymore.'],
    beat: ['Sources: patience is wearing thin around {C}.', 'The temperature on {C}\'s seat keeps rising.'],
    troll: ['Please keep him. Please.', '#Keep{X} lol'],
    meme: ['{C} reading the comments:'],
  },
  award: {
    diehard: ['{P} wins the {X}!!! {H}', 'Hardware. {P}. {X}. Never in doubt.'],
    analyst: ['{P} wins the {X}. Deserved.', 'A {X} for {P}. A season to remember.'],
    stats: ['{P} was the clear winner by every number that matters.'],
    troll: ['Overrated. Next.'],
    parent: ['So happy for {P} and his family.'],
  },
  wkAward: {
    beat: ['{P} named {X}.', 'Honors: {P} is the {X}.'],
    diehard: ['{P} {X}! Earned it.'],
    student: ['{P} bringing home awards and I can\'t bring home a passing grade'],
  },
  rankUp: {
    diehard: ['No. {N} in the country. Let\'s keep climbing. {H}', 'Up to {N}. Respect our name.'],
    stats: ['Up {X} spots this week. Strength of schedule finally catching up.'],
    doomer: ['Rankings in October mean nothing.'],
    analyst: ['{A} up to No. {N}. A real contender?'],
  },
  rankDown: {
    doomer: ['Down to {N}. Deserved honestly.', 'Out of the conversation now.'],
    diehard: ['Rankings don\'t matter. Win the next one.'],
    troll: ['Falling. Like a rock.'],
  },
  rivalLost: {
    diehard: ['{R} lost to {O} LOL', 'Happy {R} loss day to all who celebrate'],
    meme: ['me checking the {R} score:', '{R} fans being quiet today is beautiful'],
    troll: ['Not a word about this.', 'Bad day. Anyway.'],
    student: ['{R} LOST. Best day ever.'],
  },
  rivalWon: {
    troll: ['{R} wins again. Get used to it.', 'Just another {R} W. Watch and learn.'],
    doomer: ['{R} looks scary this year. Not great.'],
  },
  draft: {
    diehard: ['{P} going to the league! Proud of him. {H}', 'Congrats {P}! Rep us well.'],
    stats: ['That makes {N} draft picks from {A} this year.'],
    analyst: ['{P} ({X}) is a pro. Good fit too.'],
    parent: ['Watching {P} on draft night made me cry. So proud.'],
  },
  biz: {
    diehard: ['{X}', 'Love this. {X}'],
    doomer: ['Spend it on the defense instead. {X}', 'Nice. Now win a big game.'],
    stats: ['Smart business. {X}', 'The numbers on this one should work.'],
    student: ['{X} — ok this is actually cool', 'we\'re so back'],
    beat: ['News: {X}', 'Program note: {X}'],
    oldtimer: ['Back in my day we had bleachers and a hot dog stand. {X}'],
    troll: ['Can\'t buy a rivalry win though.', 'All that money and still mid.'],
  },
  bizBad: {
    doomer: ['{X} Unbelievable.', 'Who signs off on this stuff? {X}'],
    diehard: ['Not a fan of this one. {X}'],
    student: ['{X}?? we didn\'t want this', 'ratio this decision'],
    oldtimer: ['Some things should not be for sale. {X}'],
    troll: ['LOL. {X}'],
  },
  lgGame: {
    analyst: ['Game of the week: {W} {S} over {L}. That one will shape the race.', 'What a game. {W} beats {L}, {S}.'],
    diehard: ['{W} fans, how are we feeling?? {S}!', 'Huge win for {W}. {S}.'],
    troll: ['{L} fans are awfully quiet tonight.', '{L} folds again. {S}.'],
    stats: ['{W} {S} over {L}. The model had it a coin flip.', 'Biggest swing of the week in the standings: {W} over {L}.'],
    meme: ['{L} fans after that one:', 'me watching {W} vs. {L} instead of sleeping:'],
    casual: ['Did anyone else watch {W} and {L}? Wow.'],
  },
  champ: {
    diehard: ['CHAMPIONS. CHAMPIONS. CHAMPIONS. {H}', 'I am crying in public and I don\'t care. CHAMPIONS!'],
    oldtimer: ['I waited my whole life for this. Thank you.'],
    student: ['WE ARE THE CHAMPIONS (I have not slept)'],
    analyst: ['{A} are champions. A season for the history books.'],
    troll: ['...congrats. I guess.'],
    meme: ['nobody is working this week', 'parade route planning has begun'],
  },
  week: {
    doomer: ['Bye week. The only week we can\'t lose.'],
    diehard: ['Open date. Rest up, boys.'],
    tailgate: ['No game this week. Tailgating anyway.'],
  },
  offseason: {
    diehard: ['How many days until kickoff?', 'Offseason is the worst season.'],
    stats: ['Way-too-early projections are up. {A} at {N}.', 'Returning production ranks among the better groups in the conference.'],
    insider: ['Recruiting never sleeps. Big visit weekend coming up for {A}.'],
    oldtimer: ['Spring practice reminds me I\'m getting old.'],
    meme: ['me in the offseason refreshing the depth chart:'],
  },
};
const FEED_REPLY = {
  agree: ['This.', 'Facts.', '100 percent.', 'Couldn\'t have said it better.', 'Exactly what I was thinking.', 'Say it louder.'],
  disagree: ['Hard disagree.', 'Bad take.', 'We watched different games.', 'Relax. It\'s one week.', 'Way too early for that.', 'No chance.'],
  troll: ['Cope.', 'Sure, buddy.', 'Ratio.', 'Enjoy it while it lasts.', 'Cute.'],
  funny: ['I\'m dead', 'lmao', 'not the slander', 'framing this post', 'screenshot this'],
  stat: ['Not what the numbers say.', 'Small sample, big conclusions.', 'Actually the yards per play were fine.'],
};
// your own posts: a tone each week, with what the fans say back
const FEED_TONES = {
  thanks: { l: 'Thank the fans', t: ['Thank you for showing up for this team every week. We feel it.', 'The best fans in the country. That noise was for you.'], fan: 1, mood: 2 },
  hype: { l: 'Hype the next game', t: ['Big week ahead. Bring the noise. {H}', 'See you Saturday. Let\'s be loud.'], fan: 1, mood: 1 },
  calm: { l: 'Calm the storm', t: ['We hear you. We hold ourselves to a higher standard than anyone, and we will get it fixed.', 'Frustrated, like you. We go back to work tomorrow.'], fan: 1, mood: 3 },
  shot: { l: 'Take a shot at the rival', t: ['Some programs talk. We win. Looking forward to {R}.', 'Circle the date. {R}.'], fan: 2, mood: 1, risk: 1 },
};
function feedStore() { return xCareer() ? (CX().feed || (CX().feed = { posts: [], seq: 0 })) : (X().feed || (X().feed = { posts: [], seq: 0 })); }
// the context for posts: who we are, who we hate, what the hashtag is
function feedCtx() {
  if (xCareer()) {
    const tm = cs.nfl ? nflName(cs.nfl.tm) : cs.col ? cTeamName(cs.col.tid) : cs.hs ? cs.hs.name : 'the team';
    return { key: String(cs.seed) + ':cfeed', T: tm, A: tm, H: '#' + String(cs.p.last || 'Star').replace(/\W/g, '') + 'Watch', R: cs.rival ? (cs.rival.school || cs.rival.n || 'rival') : (cs.nfl ? 'the division rival' : 'the rival'), yr: cs.year, career: true };
  }
  const nick = isPro() ? String(myName()).split(' ').slice(-1)[0] : (typeof myAb === 'function' ? myAb() : myName());
  const ar = !isComm() && !isPro() && typeof archRival === 'function' ? archRival() : null; const rival = ar ? teamName(ar) : isPro() && !isComm() ? (NFL.filter(t => t.id !== ME && T(t.id) && T(ME) && NFL_BY[t.id] && NFL_BY[ME] && NFL_BY[t.id].div === NFL_BY[ME].div && NFL_BY[t.id].conf === NFL_BY[ME].conf).map(t => teamName(t.id))[0] || 'the rival') : 'the rival';
  if (isComm()) return { key: String(state.seed) + ':feed', T: isPro() ? 'the NFL' : 'college football', A: isPro() ? 'the league' : 'the sport', H: isPro() ? '#NFL' : '#CFB', R: 'the commissioner', yr: state.season, comm: true };
  return { key: String(state.seed) + ':feed', T: myName(), A: nick, H: '#' + String(nick).replace(/\W/g, '') + (isPro() ? '' : 'Nation'), R: rival, rid: ar, yr: state.season };
}
// add one post (and a few replies). situation picks the template table; vars fill it
function feedPost(sit, vars, o) {
  o = o || {}; const F = feedStore(); const ctx = feedCtx(); const acc = feedCast(F, ctx.key, ctx.T, ctx.R, ctx.yr); const tbl = FEED_T[sit]; if (!tbl) return null;
  const seq = ++F.seq; const h = k => hash(ctx.key + ':' + seq + ':' + k);
  const pers = o.p ? [o.p] : Object.keys(tbl).filter(p => !o.not || !o.not.includes(p)); const p = xpk(pers, h('p'));
  const cand = acc.map((a, i) => i).filter(i => acc[i].p === p); const ai = cand.length ? xpk(cand, h('a')) : Math.floor(h('a2') * acc.length);
  const v = Object.assign({ T: ctx.T, A: ctx.A, H: ctx.H, R: ctx.R }, vars || {}); let t = xfill(xpk(tbl[p], h('t')), v); if (o.tag && !t.includes('#')) t += ' ' + o.tag;
  const mood = o.mood != null ? o.mood : 50; const A_ = acc[ai];
  const base = Math.max(3, A_.fol * (0.004 + h('lk') * 0.02)) * (o.big ? 3 : 1) * (0.6 + mood / 100);
  const post = { id: seq, s: o.s != null ? o.s : ctx.yr, wk: o.wk != null ? o.wk : (xCareer() ? cs.week : state.week), a: ai, t, cat: o.cat || 'game', lk: Math.round(base), rt: Math.round(base * (0.08 + h('rt') * 0.25)), rp: [] };
  const nr = o.noReply ? 0 : Math.floor(h('nr') * (o.big ? 4 : 3));
  for (let i = 0; i < nr; i++) {
    let ri_ = Math.floor(h('r' + i) * acc.length); let g = 0; while ((ri_ === ai || post.rp.some(r => r.a === ri_)) && g++ < 30) ri_ = (ri_ + 7) % acc.length; const R_ = acc[ri_];
    const kind = R_.p === 'troll' ? 'troll' : R_.p === 'stats' ? 'stat' : R_.p === 'meme' ? 'funny' : h('rk' + i) < (A_.p === 'troll' ? 0.15 : 0.65) ? 'agree' : 'disagree';
    let rt = xfill(xpk(FEED_REPLY[kind], h('rt' + i)), v); if (post.rp.some(r => r.t === rt)) { const L = FEED_REPLY[kind]; rt = xfill(L[(L.indexOf(rt.replace(/\{\w+\}/g, '')) + 1 + i) % L.length] || rt, v); }
    post.rp.push({ a: ri_, t: rt, lk: Math.round(base * (0.05 + h('rl' + i) * 0.3)) });
  }
  F.posts.unshift(post); if (F.posts.length > 160) F.posts.length = 160;
  return post;
}
// your post of the week
function feedYouPost(tone) {
  const F = feedStore(); const T_ = FEED_TONES[tone]; if (!T_) return false; const ctx = feedCtx();
  const wkKey = (xCareer() ? cs.year + ':' + cs.week : state.season + ':' + state.week); if (F.youWk === wkKey) return false; F.youWk = wkKey;
  const seq = ++F.seq; const h = k => hash(ctx.key + ':you:' + seq + ':' + k);
  const t = xfill(xpk(T_.t, h('t')), { H: ctx.H, R: ctx.R });
  const who = xCareer() ? cName(cs.p) : isComm() ? 'Commissioner' : isOwner() ? 'Owner, ' + myName() : isCoach() ? (state.co && state.co.name) || 'Coach' : isPro() ? 'GM, ' + myName() : 'AD, ' + myName();
  const fol = xCareer() ? Math.max(500, (cs.p.fol || 0)) : 60000;
  const acc = feedCast(F, ctx.key, ctx.T, ctx.R, ctx.yr); const post = { id: seq, s: ctx.yr, wk: xCareer() ? cs.week : state.week, a: -1, who, t, cat: 'you', lk: Math.round(fol * (0.02 + h('l') * 0.05)), rt: Math.round(fol * (0.004 + h('r') * 0.01)), rp: [] };
  const n = 3 + Math.floor(h('n') * 3);
  for (let i = 0; i < n; i++) { const ri_ = Math.floor(h('a' + i) * acc.length); const R_ = acc[ri_]; const kind = R_.p === 'troll' ? 'troll' : tone === 'shot' && h('s' + i) < 0.4 ? 'disagree' : 'agree'; const extra = { thanks: ['Love this team.', 'We\'ll be there!', 'Respect.'], hype: ['LETS GOOO', 'Already bought my tickets.', 'Bring it.'], calm: ['Appreciate the honesty.', 'Words are nice. Win.', 'We\'ll see.'], shot: ['OH IT\'S ON', 'Bulletin board material lol', 'Love the energy.'] }[tone]; post.rp.push({ a: ri_, t: kind === 'agree' ? xpk(extra, h('e' + i)) : xpk(FEED_REPLY[kind], h('e' + i)), lk: Math.round(post.lk * (0.02 + h('k' + i) * 0.1)) }); }
  F.posts.unshift(post);
  // what it does: a little goodwill (or a little heat)
  if (xCareer()) { cs.p.fol = Math.round((cs.p.fol || 0) * 1.01 + 50 * T_.fan); }
  else if (!isComm() && state.meters && state.meters.fan != null) { state.meters.fan = clamp(state.meters.fan + T_.fan, 0, 100); if (T_.risk && typeof rxHeat === 'function') rxHeat(2); }
  return post;
}
// the feed's mood from 0 to 100
function feedMood() {
  if (xCareer()) { const g = cs.ss && cs.ss.games ? cs.ss.games.slice(-3) : []; return clamp(50 + g.reduce((a, r) => a + (r.w ? 10 : -10), 0) + (cs.p.fol ? Math.min(15, Math.log10(cs.p.fol + 1) * 3) : 0), 5, 98); }
  if (isComm()) { const m = typeof cm2 === 'function' ? cm2().m : null; return m ? clamp(Math.round(m.fan), 0, 100) : 50; }
  return state.meters ? state.meters.fan : 50;
}
const FEED_MOOD_L = m => (m >= 85 ? 'Euphoric' : m >= 70 ? 'Fired up' : m >= 55 ? 'Hopeful' : m >= 40 ? 'Restless' : m >= 25 ? 'Grumbling' : 'Furious');
// trending tags from the latest posts
function feedTrends() {
  const F = feedStore(); const c = {}; F.posts.slice(0, 40).forEach((p, i) => { (p.t.match(/#\w+/g) || []).forEach(t => { c[t] = (c[t] || 0) + p.lk / (1 + i * 0.1); }); });
  const ctx = feedCtx(); if (!c[ctx.H]) c[ctx.H] = 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, v]) => ({ t, n: Math.round(v * 3 + 200) }));
}
// what happened this week, in posts: AD, Coach, NFL and Commissioner saves
function feedWeek(wk, mg) {
  const ctx = feedCtx(); const mood = feedMood(); const s = state.season;
  const o = { s, wk, mood };
  if (isComm()) { feedComm(o); return; }
  // the game
  if (mg && mg.done && mg.hs != null) {
    const home = mg.h === ME; const ms = home ? mg.hs : mg.as, os = home ? mg.as : mg.hs; const opp = home ? mg.a : mg.h; const win = ms > os; const m = Math.abs(ms - os);
    const pw = mg.pw != null ? mg.pw : 0.5; const rv = !isPro() && ctx.rid === opp; const S = win ? ms + '-' + os : os + '-' + ms;
    const top = feedTop(mg); const v = { O: teamName(opp), S, M: m, P: top ? top.n : 'The defense', L: top ? top.l : 'all over the field', N: win ? Math.round((1 - pw) * 100) : Math.round(pw * 100), R: rv ? teamName(opp) : ctx.R };
    let sit = win ? (rv ? 'rivalW' : pw < 0.35 ? 'upset' : m >= 21 ? 'winBig' : m <= 7 ? 'winClose' : 'win') : (rv ? 'rivalL' : pw > 0.72 && m >= 10 ? 'lossBad' : m <= 7 ? 'lossClose' : 'loss');
    if (sit === 'winBig') v.N = Math.round(380 + hash(ctx.key + mg.id) * 220);
    const n = 4 + Math.floor(hash(ctx.key + ':n:' + mg.id) * 3) + (rv || sit === 'upset' || sit === 'lossBad' ? 2 : 0);
    const tag = '#' + String(isPro() ? String(myName()).split(' ').slice(-1)[0] : myAb()).replace(/\W/g, '') + 'vs' + String(isPro() ? teamName(opp).split(' ').slice(-1)[0] : opp).replace(/\W/g, '');
    for (let i = 0; i < n; i++) feedPost(sit, v, Object.assign({}, o, { big: i === 0 && (rv || sit === 'upset'), cat: rv ? 'rival' : 'game', tag: hash(ctx.key + mg.id + i) < 0.45 ? tag : null }));
    if (top && win) feedPost('perf', v, Object.assign({}, o, { cat: 'game' }));
    if (mg.type !== 'reg' && /Championship|Super Bowl|CFP National/.test(mg.name || '') && win && (/National|Super Bowl/.test(mg.name || ''))) for (let i = 0; i < 4; i++) feedPost('champ', v, Object.assign({}, o, { big: true, cat: 'game' }));
  } else if (!mg && state.phase !== 'offseason') feedPost('week', {}, Object.assign({}, o, { cat: 'game', noReply: true }));
  // the rival's day
  if (ctx.rid) { const rg = state.games.find(g => g.wk === wk && g.done && (g.h === ctx.rid || g.a === ctx.rid) && g.h !== ME && g.a !== ME); if (rg) { const rw = (rg.h === ctx.rid) === (rg.hs > rg.as); feedPost(rw ? 'rivalWon' : 'rivalLost', { O: teamName(rg.h === ctx.rid ? rg.a : rg.h) }, Object.assign({}, o, { cat: 'rival' })); } }
  // the polls
  if (!isPro()) { const rk = rankOf(ME); const X_ = X(); const was = X_.lastRk; X_.lastRk = rk; if (was != null && rk && (!was || rk < was - 2)) feedPost('rankUp', { N: rk, X: was ? was - rk : 'into the' }, Object.assign({}, o, { cat: 'game' })); else if (was && (!rk || rk > was + 3)) feedPost('rankDown', { N: rk || 'unranked' }, Object.assign({}, o, { cat: 'hot' })); }
  // the news since last time
  feedFromNews(state.news, o);
  // hype for the next one
  const nx = isPro() ? (typeof proMyGame === 'function' ? proMyGame(state.week) : null) : michGameThisWeek(state.week);
  if (nx) { const opp = nx.h === ME ? nx.a : nx.h; const rv = !isPro() && ctx.rid === opp; const wx = typeof forecast === 'function' ? forecast(nx) : null; const pw = typeof mWinProb === 'function' ? mWinProb(nx) : 0.5;
    feedPost(rv ? 'hypeRival' : 'hype', { O: teamName(opp), N: Math.round(pw * 100), X: wx && WX[wx.k] ? WX[wx.k].label.toLowerCase() + ', ' + wx.temp + '°' : 'clear skies', R: rv ? teamName(opp) : ctx.R }, Object.assign({}, o, { cat: rv ? 'rival' : 'game', wk: state.week }));
    if (rv) feedPost('hypeRival', { R: teamName(opp) }, Object.assign({}, o, { cat: 'rival', wk: state.week })); }
  // the hot seat
  const hotC = isCoach() ? (state.co && state.co.name) : state.staff && state.staff.HC ? state.staff.HC.name : null;
  if (hotC && state.meters && state.meters.fan < 35 && hash(ctx.key + ':hot:' + s + ':' + wk) < 0.6) feedPost('hot', { C: hotC, X: xLast(hotC).replace(/\W/g, '') }, Object.assign({}, o, { cat: 'hot', big: true }));
}
// the best line from your game's box score
function feedTop(g) {
  if (!g || !g.box || !g.box.p) return null; let best = null;
  Object.entries(g.box.p).forEach(([pid, s]) => { const p = typeof P === 'function' ? P(pid) : null; if (!p) return; const sc = (s.py || 0) * 0.05 + (s.ptd || 0) * 4 + (s.ry || 0) * 0.1 + (s.rtd || 0) * 6 + (s.rcy || 0) * 0.1 + (s.rctd || 0) * 6 + (s.tk || 0) * 0.6 + (s.sk || 0) * 4 + (s.int || 0) * 5;
    if (!best || sc > best.sc) best = { sc, n: p.n, l: statLineRaw(p.pos, s) }; });
  return best && best.sc > 6 ? best : null;
}
function feedFromNews(news, o) {
  const F = feedStore(); const key = n => n.s + ':' + n.wk + ':' + n.txt; const fresh = [];
  for (const n of (news || []).slice(0, 30)) { if (key(n) === F.nk) break; fresh.push(n); } if (news && news[0]) F.nk = key(news[0]);
  if (!F.nkInit) { F.nkInit = true; return; } /* the first week the feed runs, it starts fresh rather than replaying old news */
  fresh.slice(0, 12).reverse().forEach(n => {
    const t = n.txt; let m;
    if ((m = t.match(/^Injury: (.+?) \((\w+)\)/))) feedPost('inj', { P: m[1], X: m[2] }, Object.assign({}, o, { cat: 'game' }));
    else if ((m = t.match(/Commitment: (\d)-star (\w+) (.+?) \(/))) { feedPost('commit', { N: m[1], X: m[2], P: m[3] }, Object.assign({}, o, { p: 'insider', cat: 'rec', big: +m[1] >= 4 })); if (+m[1] >= 4) feedPost('commit', { N: m[1], X: m[2], P: m[3] }, Object.assign({}, o, { not: ['insider'], cat: 'rec' })); }
    else if ((m = t.match(/Flip: (\d)-star (\w+) (.+?) decommits/))) { feedPost('flip', { N: m[1], X: m[2], P: m[3] }, Object.assign({}, o, { p: 'insider', cat: 'rec' })); feedPost('flip', { N: m[1], X: m[2], P: m[3] }, Object.assign({}, o, { not: ['insider'], cat: 'rec' })); }
    else if ((m = t.match(/^(.+?) \((\w+), (.+?)\) wins the Heisman/))) feedPost('award', { P: m[1], X: 'Heisman Trophy' }, Object.assign({}, o, { cat: 'game', big: m[3] === myName() }));
    else if ((m = t.match(/^(.+?) \((\w+), (.+?)\) is named league MVP/))) feedPost('award', { P: m[1], X: 'MVP' }, Object.assign({}, o, { cat: 'game', big: m[3] === myName() }));
    else if ((m = t.match(/^(.+?) (?:is|named) (?:the )?((?:Offensive|Defensive|Special Teams|Freshman)?\s?(?:Player|Coach) of the Week)/i))) feedPost('wkAward', { P: m[1], X: m[2] }, Object.assign({}, o, { cat: 'game' }));
    else if (/fires|fired|parts ways|steps down|is out as/i.test(t) && /coach/i.test(t)) feedPost('coachOut', { C: (t.match(/(?:coach|Coach) ([A-Z][a-z]+ [A-Z][\w']+)/) || [])[1] || 'The coach', X: myName() }, Object.assign({}, o, { cat: 'hot' }));
    else if ((m = t.match(/hires? ([A-Z][a-z]+ [A-Z][\w']+) as (?:its |the )?(?:new )?head coach/i)) || (m = t.match(/([A-Z][a-z]+ [A-Z][\w']+) is the new head coach/))) feedPost('coachIn', { C: m[1], X: myName() }, Object.assign({}, o, { cat: 'news' }));
    else if ((m = t.match(/the (.+?) select (\w+) (.+?), /)) && t.includes(myName())) feedPost('draft', { P: m[3], X: m[2], N: 1 }, Object.assign({}, o, { cat: 'news' }));
  });
}
// commissioner saves: fans react to the league office
function feedComm(o) {
  const C = typeof cm2 === 'function' ? cm2() : null; if (!C) return;
  const gw = gotwPick(o.wk); if (gw && gw.done) { const hw = gw.hs > gw.as; const v = { W: teamName(hw ? gw.h : gw.a), L: teamName(hw ? gw.a : gw.h), S: Math.max(gw.hs, gw.as) + '-' + Math.min(gw.hs, gw.as) }; for (let i = 0; i < 3; i++) feedPost('lgGame', v, Object.assign({}, o, { cat: 'game', big: i === 0 })); } const F = feedStore(); const log = C.log || []; const key = n => (n.s || '') + ':' + (n.wk || '') + ':' + n.txt;
  const fresh = []; for (const n of log.slice(0, 12)) { if (key(n) === F.ck) break; fresh.push(n); } if (log[0]) F.ck = key(log[0]);
  if (!F.ckInit) { F.ckInit = true; return; }
  fresh.slice(0, 5).reverse().forEach(n => { const bad = /suspend|fine|ban|lockout|scandal|lawsuit|strip|forfeit|walkout/i.test(n.txt); feedPost(bad ? 'bizBad' : 'biz', { X: n.txt.length > 120 ? n.txt.slice(0, 117) + '...' : n.txt }, Object.assign({}, o, { cat: 'news' })); });
}
// a business decision you made, in the feed
function feedBiz(txt, bad) { const o = { s: state.season, wk: state.week, mood: feedMood(), cat: 'you' }; feedPost(bad ? 'bizBad' : 'biz', { X: txt }, o); if (hash(String(state.seed) + txt) < 0.6) feedPost(bad ? 'bizBad' : 'biz', { X: txt }, o); }
function feedOffseason() { const o = { s: state.season, wk: state.week, mood: feedMood(), cat: 'news' }; const pr = rankOf(ME); feedPost('offseason', { N: pr ? 'No. ' + pr : 'unranked' }, o); feedFromNews(state.news, o); }
// Player Career: the fans talk about you
const CFEED_T = {
  big: ['{P} is a problem. {L} tonight. {H}', 'Somebody check on the defense {P} just played against. {L}.', '{L}. {P} might be the best player in the conference.', 'I was there. {P} ({L}) is different.'],
  ok: ['Solid game from {P}: {L}.', '{P} keeps stacking good weeks. {L}.', 'Quiet {L} from {P}. Consistency matters.'],
  bad: ['Rough night for {P}. {L}. He\'ll bounce back.', 'Not {P}\'s best. {L}. Next week.', '{P} looked off tonight. Something up?'],
  win: ['{T} gets the W. {S}!', 'Big team win tonight, {S}.'],
  loss: ['Tough loss for {T}, {S}.', '{T} drops one, {S}. Long bus ride home.'],
  hype: ['{P} is the main reason I watch {T} now.', 'Every time {P} touches the ball I stand up.', 'Mark my words: {P} goes pro.'],
};
function cFeedGame(rec) {
  if (!rec || typeof cs === 'undefined' || !cs) return; const ctx = feedCtx(); const F = feedStore(); const o = { s: cs.year, wk: rec.wk || cs.week, mood: feedMood() };
  const line = rec.line ? lineText(rec.line, cs.p.pos) : ''; const v = { P: cName(cs.p), L: line || 'a quiet night', T: ctx.T, S: (rec.us != null ? rec.us + '-' + rec.them : '') };
  const gr = rec.grade; const sit = gr === 'A+' || gr === 'A' ? 'big' : gr === 'D' || gr === 'F' ? 'bad' : 'ok';
  const h = k => hash(ctx.key + ':cg:' + cs.year + ':' + (rec.wk || 0) + ':' + k);
  const acc = feedCast(F, ctx.key, ctx.T, ctx.R, ctx.yr);
  const add = (t, p, big) => { const seq = ++F.seq; const ai = acc.findIndex((a, i) => a.p === p && hash(ctx.key + seq + i) < 0.7); const a = ai >= 0 ? ai : Math.floor(h('a' + seq) * acc.length); const lk = Math.round((acc[a].fol * 0.01 + (cs.p.fol || 0) * 0.002) * (big ? 3 : 1) * (0.5 + h('l' + seq))); F.posts.unshift({ id: seq, s: o.s, wk: o.wk, a, t: xfill(t, v), cat: 'you', lk, rt: Math.round(lk * 0.15), rp: [] }); if (F.posts.length > 160) F.posts.length = 160; };
  add(xpk(CFEED_T[sit], h('t')), sit === 'bad' ? 'doomer' : 'diehard', sit === 'big');
  if (sit === 'big') add(xpk(CFEED_T.hype, h('h')), 'stats', true);
  add(xpk(rec.w ? CFEED_T.win : CFEED_T.loss, h('r')), 'beat');
  feedPost(rec.w ? 'win' : 'loss', { O: rec.opp || 'them', S: v.S, M: Math.abs((rec.us || 0) - (rec.them || 0)), P: cName(cs.p), L: line || '' }, Object.assign({}, o, { cat: 'game' }));
}

/* ===================== PICK'EM ===================== */
// Each week: pick the winners of the five biggest games (your own included), lock one for double points, and see
// how you stack up against four made-up experts. Their picks come from hash().
const PK_EXPERTS = [['Dr. Chalk', 'chalk', 'Always takes the favorite.'], ['Upset Ursula', 'upset', 'Lives for the underdog.'], ['Coin Flip Carl', 'coin', 'Swears by a lucky quarter.'], ['The Professor', 'model', 'Runs a computer model.']];
function pkStore() { const x = X(); if (!x.pk || x.pk.s !== state.season) x.pk = { s: state.season, wk: null, games: [], picks: {}, lock: null, tot: 0, exp: [0, 0, 0, 0], log: [], best: (x.pk && x.pk.best) || null, hist: (x.pk && x.pk.hist) || [] }; return x.pk; }
function pkSlate() {
  const K = pkStore(); if (state.phase === 'offseason' || isComm() && false) return K;
  if (K.wk === state.week && K.games.length) return K;
  const wk = state.week; const gs = state.games.filter(g => g.wk === wk && !g.done && T(g.h) && T(g.a));
  const sc = g => isPro() ? -((T(g.h).w || 0) + (T(g.a).w || 0) + ((T(g.h).elo || 1500) + (T(g.a).elo || 1500)) / 200) : (rankOf(g.h) || 40) + (rankOf(g.a) || 40) - (rivalOf && (g.h === ME || g.a === ME) ? 0 : 0);
  const mine = gs.find(g => g.h === ME || g.a === ME);
  const others = gs.filter(g => g !== mine).sort((a, b) => sc(a) - sc(b)).slice(0, mine && !isComm() ? 4 : 5);
  K.wk = wk; K.games = (mine && !isComm() ? [mine] : []).concat(others).map(g => ({ id: g.id, h: g.h, a: g.a, ph: r2(winProb(g.h, g.a, g.neutral)) })); K.picks = {}; K.lock = null;
  return K;
}
function pkPick(gid, side) { const K = pkSlate(); const g = K.games.find(x => x.id === gid); if (!g || !['h', 'a'].includes(side)) return false; const gm = state.games.find(x => x.id === gid); if (gm && gm.done) return false; K.picks[gid] = side; return true; }
function pkLock(gid) { const K = pkSlate(); if (!K.games.some(x => x.id === gid)) return false; K.lock = K.lock === gid ? null : gid; return true; }
function pkExpertPick(i, g) { const st = PK_EXPERTS[i][1]; const fav = g.ph >= 0.5 ? 'h' : 'a'; const dog = fav === 'h' ? 'a' : 'h'; const v = hash(String(state.seed) + ':pk:' + g.id + ':' + i); if (st === 'chalk') return fav; if (st === 'upset') return v < 0.55 ? dog : fav; if (st === 'coin') return v < 0.5 ? 'h' : 'a'; return v < Math.max(g.ph, 1 - g.ph) ? fav : dog; }
// after the week: score your picks and the experts'
function pkScore(wk) {
  const K = pkStore(); if (K.wk !== wk || !K.games.length || K.scored === wk) return null; K.scored = wk;
  let mine = 0, max = 0; const exp = [0, 0, 0, 0]; const rows = [];
  K.games.forEach(g => { const gm = state.games.find(x => x.id === g.id); if (!gm || !gm.done) return; const w = gm.hs > gm.as ? 'h' : 'a'; const pt = K.lock === g.id ? 2 : 1; max += pt;
    const p = K.picks[g.id]; if (p) mine += p === w ? pt : K.lock === g.id ? -1 : 0; for (let i = 0; i < 4; i++) if (pkExpertPick(i, g) === w) exp[i]++; rows.push({ id: g.id, w, p }); });
  if (!rows.length) return null; const picked = Object.keys(K.picks).length > 0;
  K.tot += mine; K.exp = K.exp.map((v, i) => v + exp[i]); K.log.unshift({ wk, pts: mine, max, exp, picked }); if (K.log.length > 25) K.log.length = 25;
  if (picked && mine === max && max >= 5) addNews(`Pick'em: a perfect week (${mine} points). The experts are impressed.`, 'win');
  return { mine, max, exp };
}
function pkSeasonEnd() { const K = pkStore(); if (!K.log.length || K.hist.some(h => h.s === K.s)) return; const ex = K.exp.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]); const rank = 1 + ex.filter(e => e[0] > K.tot).length; K.hist.unshift({ s: K.s, pts: K.tot, rank, best: ex[0] }); if (K.hist.length > 30) K.hist.length = 30; if (!K.best || K.tot > K.best.pts) K.best = { s: K.s, pts: K.tot }; }

/* ===================== RIVAL EXECUTIVES ===================== */
// Three or four rival athletic directors (or general managers) with their own styles. They make moves you read about,
// bid against you for coaches you try to hire, chase your recruits, call with hard-bargain trade offers in the NFL,
// and keep a running score of the feud. Their moves come from hash().
const RX_STYLE = {
  spender: { l: 'Big spender', d: 'Throws money at every problem: coaches, facilities, NIL.' },
  shark: { l: 'Dealmaker', d: 'Always working an angle. Loves a lopsided trade.' },
  builder: { l: 'Builder', d: 'Patient. Facilities first, then the roster.' },
  poacher: { l: 'Poacher', d: 'Goes after your staff and your recruits.' },
  showman: { l: 'Showman', d: 'Loves a headline and a microphone.' },
};
const RX_FN = ['Gordon', 'Patricia', 'Royce', 'Delia', 'Warren', 'Simone', 'Clint', 'Margo', 'Lyle', 'Vivian', 'Booker', 'Joan', 'Fletcher', 'Nadine', 'Harlan', 'Cecilia'];
const RX_LN = ['Ashby', 'Vance', 'Holloway', 'Prescott', 'Draper', 'Kincaid', 'Mercer', 'Talbot', 'Whitlock', 'Calloway', 'Beckett', 'Stroud', 'Hargrove', 'Pruitt', 'Lomax', 'Ridley'];
function rxStore() {
  const x = X(); if (x.rx && x.rx.lvl === (isPro() ? 'nfl' : 'col') && x.rx.me === ME) return x.rx;
  const ids = []; if (isPro()) { const me = NFL_BY[ME]; NFL.filter(t => t.id !== ME && me && NFL_BY[t.id].conf === me.conf && NFL_BY[t.id].div === me.div).forEach(t => ids.push(t.id)); const big = NFL.filter(t => t.id !== ME && !ids.includes(t.id) && T(t.id)).sort((a, b) => (T(b.id).elo || 0) - (T(a.id).elo || 0))[0]; if (big) ids.push(big.id); }
  else { const ar = typeof archRival === 'function' ? archRival() : null; if (ar && T(ar)) ids.push(ar); const conf = T(ME) ? T(ME).conf : null; Object.values(state.teams).filter(t => t.id !== ME && t.conf === conf && !ids.includes(t.id)).sort((a, b) => Math.abs(a.rating - T(ME).rating) - Math.abs(b.rating - T(ME).rating)).slice(0, 2).forEach(t => ids.push(t.id)); const pw = Object.values(state.teams).filter(t => t.id !== ME && !ids.includes(t.id) && CONFS[t.conf] && CONFS[t.conf].p4).sort((a, b) => b.rating - a.rating)[0]; if (pw) ids.push(pw.id); }
  const styles = Object.keys(RX_STYLE);
  x.rx = { lvl: isPro() ? 'nfl' : 'col', me: ME, list: ids.slice(0, 4).map((id, i) => ({ id, name: xpk(RX_FN, xh('rxf' + id)) + ' ' + xpk(RX_LN, xh('rxl' + id)), style: styles[Math.floor(xh('rxs' + id) * styles.length)], heat: Math.round((i === 0 ? 30 : 0) + xh('rxh' + id) * 20), w: 0, l: 0, log: [] })), log: [] };
  return x.rx;
}
function rxHeat(d, id) { const R_ = rxStore(); R_.list.forEach(r => { if (!id || r.id === id) r.heat = clamp(r.heat + d, -50, 100); }); }
const RX_MOVES = {
  spender: ['{N} hands his head coach a raise and an extension.', '{N} announces a record NIL budget at {T}.', '{N} breaks ground on a new indoor facility at {T}.'],
  shark: ['{N} is working the phones. {T} wants a deal before the deadline.', '{N} lands a bargain on the open market for {T}.', '{N} quietly restructures three contracts at {T}.'],
  builder: ['{N} unveils renderings for a new football building at {T}.', '{N} extends the strength staff at {T}.', '{N} adds analytics staff at {T}.'],
  poacher: ['{N} is calling around about your assistants.', '{N} has {T}\'s staff at a recruit\'s home tonight. One of yours.', '{N} hires away a support staffer from a rival program.'],
  showman: ['{N} tells reporters {T} is "the best program in the region, period."', '{N} calls this week\'s game "a statement opportunity."', '{N} unveils an alternate uniform with a laser show.'],
};
// once a week: one rival makes a move; sometimes it is aimed at you
function rxWeek(wk, mg) {
  if (isComm()) return; const R_ = rxStore(); if (!R_.list.length) return; const k = state.season + ':' + wk; const r = R_.list[Math.floor(xh('rxw' + k) * R_.list.length)];
  if (mg && mg.done) { const opp = mg.h === ME ? mg.a : mg.h; const me = R_.list.find(x => x.id === opp); if (me) { const win = (mg.h === ME) === (mg.hs > mg.as); if (win) me.w++; else me.l++; me.heat = clamp(me.heat + 6, -50, 100); rxLog(me, `${win ? 'You beat' : 'Lost to'} ${teamName(opp)}, ${Math.max(mg.hs, mg.as)}-${Math.min(mg.hs, mg.as)}.`); } }
  if (xh('rxgo' + k) > 0.55) return;
  const txt = xfill(xpk(RX_MOVES[r.style], xh('rxm' + k)), { N: r.name, T: teamName(r.id) }); rxLog(r, txt); addNews(`Rival front office: ${txt}`);
  // aimed at you: a recruit (college) or your coordinator (both)
  if (!isPro() && (r.style === 'poacher' || r.style === 'spender') && state.rec && state.rec.list && xh('rxr' + k) < 0.5) {
    const tgt = state.rec.list.filter(x => x.offered && x.status === 'open' && x.star >= 4).sort((a, b) => b.star - a.star || b.interest - a.interest)[0];
    if (tgt) { R_.chase = { rid: tgt.id, by: r.id, s: state.season, wk: state.week, cost: r2(0.15 + tgt.star * 0.05) }; addNews(`${r.name} (${teamName(r.id)}) is making a hard push for your ${tgt.star}-star recruit ${tgt.n}. Counter it from the Rivals page or he may cool on you.`, 'bad'); }
  }
}
function rxLog(r, txt) { r.log.unshift({ s: state.season, wk: state.week, txt }); if (r.log.length > 20) r.log.length = 20; }
// the rival's push on your recruit lands a week later unless you counter it
function rxChaseResolve() { const R_ = rxStore(); const c = R_.chase; if (!c || (c.s === state.season && c.wk >= state.week)) return; const r = state.rec && state.rec.list.find(x => x.id === c.rid); if (r && r.status === 'open' && !c.met) { r.interest = clamp(r.interest - 8, 1, 99); addNews(`${r.n} cools on ${myName()} after a visit from ${teamName(c.by)}.`); } R_.chase = null; }
function rxCounter() { const R_ = rxStore(); const c = R_.chase; if (!c || c.met) return false; const r = state.rec && state.rec.list.find(x => x.id === c.rid); if (!r) return false; state.fin.balance -= c.cost; state.fin.ytd.eventx = (state.fin.ytd.eventx || 0) + c.cost; r.interest = clamp(r.interest + 4, 1, 99); c.met = true; rxHeat(5, c.by); feedBiz(`${myName()} wins a recruiting fight with ${teamName(c.by)} for ${r.n}.`); return true; }
function rxAction(id, k) {
  const R_ = rxStore(); const r = R_.list.find(x => x.id === id); if (!r) return false; const key = state.season + ':' + state.week; if (r.act === key) return false; r.act = key;
  if (k === 'talk') { r.heat = clamp(r.heat + 10, -50, 100); if (state.meters) state.meters.fan = clamp(state.meters.fan + 2, 0, 100); rxLog(r, 'You fired back in the press.'); feedBiz(`${xWho()} fires back at ${r.name} of ${teamName(r.id)} in the press.`); }
  else if (k === 'peace') { r.heat = clamp(r.heat - 15, -50, 100); rxLog(r, 'You called to clear the air.'); }
  else return false;
  return true;
}
// coaching searches: a rival may bid on the same coach. Returns the extra cost in $M (0 if nobody did)
function rxBid(role, cid) { if (isComm()) return 0; const R_ = rxStore(); const r = R_.list.find(x => x.style === 'spender' || x.style === 'poacher'); if (!r || xh('rxbid' + role + cid + state.season) > 0.35) return 0; const extra = r2(role === 'HC' ? 0.6 + xh('rxbe' + cid) * 1.2 : 0.1 + xh('rxbe' + cid) * 0.25); rxLog(r, `Bid against you for a ${role} candidate.`); return { by: r.id, name: r.name, extra }; }

/* ===================== AWARD NIGHT ===================== */
// the season's awards revealed one at a time, finalists first (college: the Heisman and the position awards;
// NFL: MVP, offensive and defensive player of the year, coach of the year)
function awardNightScript() {
  const out = []; const h = k => xh('awn:' + state.season + ':' + k);
  const says = ['"I want to thank my teammates. This is theirs."', '"My mom is here tonight. Mom, this is for you."', '"Coaches, linemen, everybody. I didn\'t do this alone."', '"I\'m just a kid from a small town. This is crazy."'];
  if (!isPro()) {
    const aw = (state.awards || []).find(a => a.s === state.season); if (!aw) return out;
    out.push({ k: 'open', txt: `Welcome to college football's award night for the ${state.season} season.` });
    [['obrien', 'Davey O\'Brien Award (best quarterback)'], ['walker', 'Doak Walker Award (best running back)'], ['bilet', 'Biletnikoff Award (best receiver)'], ['bednarik', 'Bednarik Award (best defender)']].forEach(([k, l]) => { const w = aw[k]; if (!w) return; out.push({ k: 'break', txt: `The ${l}...` }); out.push({ k: w.tm === ME ? 'mine' : 'pick', txt: `...goes to ${w.n}, ${w.pos}, ${teamName(w.tm)}.` }); });
    if (aw.coy) { out.push({ k: 'break', txt: 'Coach of the Year...' }); out.push({ k: aw.coy.tm === ME ? 'mine' : 'pick', txt: `...${aw.coy.name}, ${teamName(aw.coy.tm)}.` }); }
    const he = aw.heis || []; if (he.length) {
      out.push({ k: 'break', txt: 'And now, the Heisman Trophy. The finalists:' });
      he.slice(0, 4).sort((a, b) => hash(a.n + h('o')) - hash(b.n + h('o'))).forEach(x => out.push({ k: x.tm === ME ? 'mine' : 'pick', txt: `${x.n}, ${x.pos}, ${teamName(x.tm)}` }));
      out.push({ k: 'break', txt: 'The envelope, please...' });
      out.push({ k: he[0].tm === ME ? 'mine' : 'sign', txt: `The ${state.season} Heisman Trophy winner is ${he[0].n} of ${teamName(he[0].tm)}!`, say: `${he[0].n}: ${xpk(says, h('say'))}` });
      if (he[1]) out.push({ k: 'pick', txt: `Runner-up: ${he[1].n} (${teamName(he[1].tm)}).` });
    }
    return out;
  }
  const c = awardCands(); if (!c.length) return out; const off = c.filter(x => ['QB', 'RB', 'WR', 'TE'].includes(x.pos)); const def = c.filter(x => DEFP.includes(x.pos));
  out.push({ k: 'open', txt: `The NFL honors night for the ${state.season} season.` });
  const reveal = (name, list) => { if (!list.length) return; out.push({ k: 'break', txt: `${name}. The finalists:` }); list.slice(0, 3).sort((a, b) => hash(a.n + name) - hash(b.n + name)).forEach(x => out.push({ k: x.tm === ME ? 'mine' : 'pick', txt: `${x.n}, ${x.pos}, ${teamName(x.tm)}` })); out.push({ k: list[0].tm === ME ? 'mine' : 'sign', txt: `The winner: ${list[0].n}!`, say: list[0].tm === ME ? `${list[0].n}: ${xpk(says, h(name))}` : null }); };
  reveal('Defensive Player of the Year', def); reveal('Offensive Player of the Year', off.filter(x => x.pos !== 'QB').concat(off.filter(x => x.pos === 'QB')).slice(0, 3));
  const H = lgHistOf().nfl.find(x => x.s === state.season); if (H && H.coy) { out.push({ k: 'break', txt: 'Coach of the Year...' }); out.push({ k: H.coy.tm === ME ? 'mine' : 'pick', txt: `...${H.coy.n}, ${teamName(H.coy.tm)}.` }); }
  reveal('Most Valuable Player', c.filter(x => ['QB', 'RB', 'WR', 'TE'].includes(x.pos) || x.sc > 70));
  return out;
}
function awardNightReady() { const x = X(); if (isComm()) return false; if (!isPro()) return !!(state.awards || []).find(a => a.s === state.season) && x.awnSeen !== state.season; return state.phase === 'offseason' && !!lgHistOf().nfl.find(e => e.s === state.season) && x.awnSeen !== state.season; }

/* ===================== GAME OF THE WEEK ===================== */
// the biggest game you're not in, picked before it's played, then watched on the field as a highlight reel built
// from its final score (only the field view's own made-up plays: the score is the real one)
function gotwPick(wk) {
  const gs = state.games.filter(g => g.wk === wk && g.h !== ME && g.a !== ME && T(g.h) && T(g.a)); if (!gs.length) return null;
  const sc = g => isPro() ? -((T(g.h).elo || 1500) + (T(g.a).elo || 1500)) : (rankOf(g.h) || 45) + (rankOf(g.a) || 45) - (g.type !== 'reg' ? 30 : 0);
  return gs.sort((a, b) => sc(a) - sc(b))[0];
}
function gotwList() { const x = X(); return x.gotw || (x.gotw = []); }
function gotwRecord(wk) { const g = gotwPick(wk); if (!g || !g.done) return; const L = gotwList(); if (L.some(e => e.id === g.id)) return; L.unshift({ id: g.id, s: state.season, wk, h: g.h, a: g.a, hs: g.hs, as: g.as, name: g.name || '', hl: gotwReel(g) }); if (L.length > 12) L.length = 12; }
// split a score into touchdowns and field goals, place the drives across four quarters
function gotwReel(g) {
  const k = (state.seed || 0) + ':gotw:' + g.id; const h = j => hash(k + ':' + j); const d = [];
  const split = (pts, side) => { let td = Math.floor(pts / 7), fg = 0; let rest = pts - td * 7; if (rest % 3 === 0) fg = rest / 3; else { while (td > 0 && (pts - td * 7) % 3 !== 0) td--; fg = Math.floor((pts - td * 7) / 3); } const out = []; for (let i = 0; i < td; i++) out.push('td'); for (let i = 0; i < fg; i++) out.push('fg'); return out.map((o, i) => ({ s: side, out: o, ord: h(side + ':' + i) })); };
  const all = split(g.hs, 0).concat(split(g.as, 1)).sort((a, b) => a.ord - b.ord);
  if (h('to') < 0.7) all.splice(Math.floor(h('tp') * (all.length + 1)), 0, { s: h('ts') < 0.5 ? 0 : 1, out: 'to', ord: 0 });
  all.forEach((x, i) => { const qtr = Math.min(4, 1 + Math.floor(i / Math.max(1, all.length) * 4)); const y = 8 + Math.floor(h('y' + i) * 50);
    d.push({ i, s: x.s, qtr, out: x.out, yards: x.out === 'fg' ? 30 + Math.floor(h('fy' + i) * 30) : 40 + Math.floor(h('ty' + i) * 40), fg: x.out === 'fg' ? 25 + Math.floor(h('fd' + i) * 25) : null, good: true, p6: false,
      pl: [{ k: x.out === 'to' ? (h('ti' + i) < 0.6 ? 'i' : 'f') : h('k' + i) < 0.5 ? 'r' : 'p', y: x.out === 'td' ? Math.min(60, y) : Math.floor(y / 3), n: null }] }); });
  return { d, first: h('f') < 0.5 ? 0 : 1, k: 'gotw:' + g.id };
}

/* ===================== THE BUSINESS (AD mode) ===================== */
// stadium projects, uniforms, game day promotions, the student section, the team store and the support staff
const XPROJ = {
  lux: { l: 'Luxury suites', cost: 38, wks: 30, d: 'About $0.45M a home game from suite rentals.' },
  board: { l: 'New video board', cost: 14, wks: 12, d: 'A louder, prouder crowd: home-field edge and fan mood.' },
  seats: { l: 'Upper deck expansion', cost: 55, wks: 40, d: '6,000 more seats.' },
  turf: { l: 'New playing surface', cost: 4, wks: 4, d: 'Fewer injuries at home.' },
  lights: { l: 'Stadium lights and a light show', cost: 7, wks: 8, d: 'Night games: a bigger crowd edge.' },
};
const XPROMO = {
  none: { l: 'No promotion', cost: 0, crowd: 0, fan: 0 },
  whiteout: { l: 'Color-out: everyone in team colors', cost: 0.08, crowd: 0.04, fan: 1 },
  flyover: { l: 'Military flyover', cost: 0.25, crowd: 0.035, fan: 1 },
  throwback: { l: 'Throwback uniforms', cost: 0.12, crowd: 0.02, fan: 2, rec: 1.5, store: 0.15 },
  fireworks: { l: 'Fireworks and a postgame concert', cost: 0.18, crowd: 0.02, fan: 2 },
  students: { l: 'Free shirts for students', cost: 0.06, crowd: 0.025, fan: 1 },
};
const XSTORE = [['Game day stand', 0, 0.02], ['Campus store', 6, 0.06], ['Flagship store and online shop', 18, 0.13]];
const XSTAFF = { str: { l: 'Strength and conditioning', d: 'Fewer injuries and better growth.' }, nut: { l: 'Nutrition and recovery', d: 'Fewer injuries and faster returns.' } };
const XSTAFF_PAY = [0, 0.15, 0.3, 0.55, 0.9, 1.4]; // $M a year by level
const XUNI_COLS = ['#111111', '#ffffff', '#c8102e', '#002868', '#ffb612', '#00843d', '#4b2e83', '#ff6a13', '#7c878e', '#00a3e0', '#6d0f1a', '#d4af37'];
const XUNI_STY = ['Classic', 'Blackout', 'Chrome', 'Throwback', 'Night', 'Stealth', 'Heritage', 'Ice'];
function biz() { const x = X(); return x.biz || (x.biz = { proj: {}, build: [], promo: {}, student: 1, store: 0, staff: { str: 1, nut: 1 }, uni: null, alt: {}, naming: null, offers: null, spring: null }); }
function bizOn() { return !isComm() && !isPro() && !isCoach(); }
function bizStart(k) {
  const B = biz(); const p = XPROJ[k]; if (!p || B.proj[k] || B.build.some(b => b.k === k)) return 'already'; if (state.fin.balance < p.cost * 0.3) return 'money';
  state.fin.balance -= p.cost; state.fin.ytd.eventx = (state.fin.ytd.eventx || 0) + p.cost; B.build.push({ k, left: p.wks, s: state.season });
  addNews(`${myName()} approves a $${p.cost}M project: ${p.l.toLowerCase()}. It will take about ${p.wks} weeks.`); feedBiz(`${myName()} approves ${p.l.toLowerCase()} ($${p.cost}M).`); return 'ok';
}
function bizWeek(mg) {
  const B = biz(); B.build.forEach(b => { b.left--; if (b.left <= 0) { B.proj[b.k] = state.season; addNews(`${XPROJ[b.k].l} complete at ${myName()}.`, 'win'); feedBiz(`The ${XPROJ[b.k].l.toLowerCase()} are done. Come see them.`);  } }); B.build = B.build.filter(b => b.left > 0);
  const st = XSTAFF_PAY[B.staff.str || 1] + XSTAFF_PAY[B.staff.nut || 1] - 2 * XSTAFF_PAY[1]; if (st > 0 && state.phase === 'regular') { const w = st / 13; state.fin.balance -= w; state.fin.ytd.eventx = (state.fin.ytd.eventx || 0) + w; }
  if (state.phase === 'regular') { const s = XSTORE[B.store || 0]; const win = mg && mg.done && mg.mResult === 'W' ? 1.25 : 1; const r = r2(s[2] * (0.6 + state.meters.fan / 100) * win * (B.uniBuzz ? 1.15 : 1)); state.fin.balance += r; state.fin.ytd.events = (state.fin.ytd.events || 0) + r; B.storeYtd = r2((B.storeYtd || 0) + r); if (B.uniBuzz) B.uniBuzz--; }
}
// money from a home game: suites; the promotion's cost
function bizGameMoney(g) {
  if (!bizOn() || !g || g.h !== ME || g.neutral) return 0; const B = biz(); let v = 0; if (B.proj.lux) v += 0.45;
  const pr = XPROMO[B.promo[g.id] || 'none']; if (pr && pr.cost) { v -= pr.cost; if (pr.fan) state.meters.fan = clamp(state.meters.fan + pr.fan, 0, 100); if (pr.rec && state.rec) state.rec.list.forEach(r => { if (r.visit === g.id) r.interest = clamp(r.interest + pr.rec, 1, 99); }); if (pr.store) B.uniBuzz = (B.uniBuzz || 0) + 2; }
  if (B.alt[g.id]) { B.uniBuzz = Math.min(UNI_BUZZ_MAX, (B.uniBuzz || 0) + 3); if (state.rec) state.rec.list.forEach(r => { if (r.visit === g.id) r.interest = clamp(r.interest + 1, 1, 99); }); }
  if (B.naming && B.naming.until >= state.season) v += B.naming.fee / 7;
  return r2(v);
}
// the home crowd: the video board, lights, the student section and the week's promotion
function bizCrowd(g) {
  if (!bizOn()) return 1; const B = biz(); let f = 1; if (B.proj.board) f += 0.03; if (B.proj.lights && g && g.night) f += 0.03;
  f += ((B.student || 1) - 1) * 0.02; const pr = g ? XPROMO[B.promo[g.id] || 'none'] : null; if (pr) f += pr.crowd || 0; return f;
}
function bizInjF() { if (isComm()) return 1; const B = X().biz; if (!B) return 1; const s = B.staff || {}; return clamp(1 - ((s.str || 1) - 1) * 0.04 - ((s.nut || 1) - 1) * 0.03 - (B.proj && B.proj.turf ? 0.03 : 0), 0.7, 1.05); }
function bizDev() { if (isComm()) return 0; const B = X().biz; if (!B) return 0; return ((B.staff && B.staff.str || 1) - 1) * 0.012; }
function bizStaff(k, lvl) { const B = biz(); if (!XSTAFF[k] || lvl < 1 || lvl > 5) return false; B.staff[k] = lvl; feedBiz(`${myName()} ${lvl >= 4 ? 'hires a top' : 'sets up its'} ${XSTAFF[k].l.toLowerCase()} staff.`); return true; }
function bizStore(t) { const B = biz(); const s = XSTORE[t]; if (!s || t <= (B.store || 0)) return false; if (state.fin.balance < s[1] * 0.3) return false; state.fin.balance -= s[1]; state.fin.ytd.eventx = (state.fin.ytd.eventx || 0) + s[1]; B.store = t; feedBiz(`${myName()} opens a new ${s[0].toLowerCase()}.`); return true; }
function bizStudent(n) { const B = biz(); if (![1, 2, 3].includes(n)) return false; B.student = n; return true; }
function bizPromo(gid, k) { const B = biz(); if (!XPROMO[k]) return false; const g = state.games.find(x => x.id === gid); if (!g || g.done || g.h !== ME) return false; if (k === 'none') delete B.promo[gid]; else B.promo[gid] = k; return true; }
// A new design is a free edit any time. The launch (buzz, and a nudge for recruits you've offered) happens once a
// season, and showing the same design again changes nothing, so the button can't be farmed (FE-12).
const UNI_BUZZ_MAX = 40;
function bizUniform(o) {
  const B = biz(); const ok = c => XUNI_COLS.includes(c); if (!ok(o.c1) || !ok(o.c2) || !XUNI_STY.includes(o.sty)) return false;
  if (B.uni && B.uni.c1 === o.c1 && B.uni.c2 === o.c2 && B.uni.sty === o.sty) return 'same';
  const first = !B.uni; B.uni = { c1: o.c1, c2: o.c2, sty: o.sty, s: state.season };
  if (B.uniLaunch === state.season) return 'saved';
  B.uniLaunch = state.season; B.uniBuzz = Math.min(UNI_BUZZ_MAX, (B.uniBuzz || 0) + 4); feedBiz(`${myName()} unveils ${first ? 'a new' : 'another'} alternate uniform: ${o.sty}.`);
  if (state.rec) state.rec.list.forEach(r => { if (r.status === 'open' && r.offered) r.interest = clamp(r.interest + 1, 1, 99); });
  return 'launch';
}
function bizAlt(gid, on) { const B = biz(); if (!B.uni) return false; const g = state.games.find(x => x.id === gid); if (!g || g.done || !(g.h === ME || g.a === ME)) return false; if (on) B.alt[gid] = 1; else delete B.alt[gid]; return true; }
// naming rights: a sponsor's offer once a season
const XNAMERS = ['Northstar Bank', 'Summit Health', 'Bluewater Energy', 'Ridgeline Motors', 'Keystone Insurance', 'Cobalt Wireless', 'Harbor Freightways', 'Evergreen Credit Union'];
function bizNamingOffer() { const B = biz(); if (B.naming && B.naming.until >= state.season) return null; if (B.offers && B.offers.s === state.season) return B.offers; const v = xh('nm' + state.season); B.offers = { s: state.season, co: xpk(XNAMERS, v), fee: r1(3 + v * 5 + (T(ME) ? (T(ME).rating - 70) * 0.08 : 0)), yrs: 5 + Math.floor(xh('ny' + state.season) * 6) }; return B.offers; }
function bizNamingTake() { const B = biz(); const o = bizNamingOffer(); if (!o) return false; B.naming = { co: o.co, fee: o.fee, until: state.season + o.yrs - 1 }; state.meters.fan = clamp(state.meters.fan - 6, 0, 100); state.meters.board = clamp((state.meters.board || 50) + 4, 0, 100); addNews(`${myName()} sells the stadium's naming rights to ${o.co}: $${o.fee}M a year for ${o.yrs} years.`); feedBiz(`The stadium is now ${o.co} Field. $${o.fee}M a year.`, true); return true; }
// the spring game (offseason): fans, a few recruits and a first look at the position battles
function springGame() {
  const B = biz(); if (B.spring && B.spring.s === state.season) return null; const att = Math.round(capacity() * (0.25 + state.meters.fan / 200) * (0.85 + xh('sp' + state.season) * 0.3));
  const rev = r2(att * 8 / 1e6); state.fin.balance += rev; state.fin.ytd.events = (state.fin.ytd.events || 0) + rev; state.meters.fan = clamp(state.meters.fan + 2, 0, 100);
  if (state.rec && state.rec.list) state.rec.list.filter(r => r.status === 'open').slice(0, 12).forEach(r => { r.interest = clamp(r.interest + 2, 1, 99); });
  const stars = state.roster.filter(p => ['QB', 'RB', 'WR', 'LB', 'DE', 'CB'].includes(p.pos)).sort((a, b) => (b.pot - b.ovr) - (a.pot - a.ovr)).slice(0, 3).map(p => ({ n: p.n, pos: p.pos, ovr: p.ovr }));
  const sc = [21 + Math.floor(xh('sa' + state.season) * 17), 14 + Math.floor(xh('sb' + state.season) * 17)];
  B.spring = { s: state.season, att, rev, stars, sc }; addNews(`Spring game: ${att.toLocaleString()} fans watch the ${sc[0] >= sc[1] ? 'offense' : 'defense'} win, ${Math.max(...sc)}-${Math.min(...sc)}. ${stars[0] ? stars[0].n + ' (' + stars[0].pos + ') steals the show.' : ''}`); feedBiz(`${att.toLocaleString()} fans at the spring game. ${stars[0] ? stars[0].n + ' looked like a different player.' : ''}`);
  return B.spring;
}

/* ===================== CAMP BATTLES AND GROWTH GOALS (college and NFL) ===================== */
const CAMP_POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S'];
function campBattles() {
  const x = X(); if (x.camp && x.camp.s === state.season) return x.camp; if (isComm()) return null;
  const list = []; CAMP_POS.forEach(pos => { const d = (state.depth[pos] || []).map(P).filter(p => p && avail(p)); const n = START[pos] || 1; const a = d[n - 1], b = d[n]; if (a && b && Math.abs(a.ovr - b.ovr) <= 3) list.push({ pos, a: a.id, b: b.id }); });
  x.camp = { s: state.season, list: list.slice(0, 4), done: false }; return x.camp;
}
function campPick(pos, pid) {
  const C = campBattles(); if (!C) return false; const bt = C.list.find(b => b.pos === pos); if (!bt || bt.w || ![bt.a, bt.b].includes(pid)) return false;
  const w = P(pid), l = P(pid === bt.a ? bt.b : bt.a); if (!w || !l) return false; bt.w = pid;
  const d = state.depth[pos]; const iw = d.indexOf(w.id), il = d.indexOf(l.id); if (iw > il) { d[il] = w.id; d[iw] = l.id; }
  w.ovr = Math.min(99, w.ovr + 1); state.meters.morale = clamp((state.meters.morale || 60) - (l.pers === 'ego' ? 4 : 1), 0, 100);
  addNews(`Camp battle settled: ${w.n} wins the ${pos} job over ${l.n}.`); return true;
}
const GOAL_K = { ovr: 'Improve his rating by 3', start: 'Become a starter', stat: 'A big statistical season' };
function goalsStore() { const x = X(); if (!x.goals || x.goals.s !== state.season) x.goals = { s: state.season, list: [], hist: (x.goals && x.goals.hist) || [] }; return x.goals; }
function goalSet(pid, k) { const G = goalsStore(); const p = P(pid); if (!p || !GOAL_K[k] || G.list.length >= 3 || G.list.some(g => g.pid === pid)) return false; G.list.push({ pid, k, base: p.ovr, n: p.n, pos: p.pos }); return true; }
function goalClear(pid) { const G = goalsStore(); G.list = G.list.filter(g => g.pid !== pid); return true; }
function goalMet(g) { const p = P(g.pid); if (!p) return false; if (g.k === 'ovr') return p.ovr >= g.base + 3; if (g.k === 'start') return (state.depth[p.pos] || []).indexOf(p.id) < (START[p.pos] || 1); const s = p.st || {}; return (s.py || 0) >= 3000 || (s.ry || 0) >= 1000 || (s.rcy || 0) >= 900 || (s.tk || 0) >= 80 || (s.sk || 0) >= 9 || (s.int || 0) >= 5; }
function goalsSeasonEnd() { const G = goalsStore(); if (!G.list.length || G.ended) return; G.ended = true; let n = 0; G.list.forEach(g => { g.met = goalMet(g); const p = P(g.pid); if (g.met && p) { n++; p.pot = Math.min(99, p.pot + 2); p.xp = (p.xp || 0) + 2; } }); G.hist.unshift({ s: G.s, n, of: G.list.length, list: G.list.map(g => ({ n: g.n, k: g.k, met: g.met })) }); if (G.hist.length > 20) G.hist.length = 20; if (n) addNews(`${n} of ${G.list.length} growth goals met this season. Those players get a boost.`, 'win'); }

/* ===================== THE NFL: WAIVERS, PRACTICE SQUAD, PRESEASON, INCENTIVES ===================== */
const PSQ_MAX = 16;
function xJoin(p) { p.tm = ME; state.roster.push(p); PMAP[p.id] = p; (state.depth[p.pos] || (state.depth[p.pos] = [])).push(p.id); autoDepth(p.pos); }
function bizSeats() { const B = X().biz; return B && B.proj && B.proj.seats && !isPro() ? 6000 : 0; }
function nflx() { const x = X(); return x.nfl || (x.nfl = { psq: [], wv: [], pre: null, poached: [] }); }
// players other clubs let go at cut-down day (and in season) land on waivers for a week
function wvAdd(p, from) { const N = nflx(); if (!p || N.wv.some(w => w.p.id === p.id)) return; N.wv.push({ p, from, s: state.season, wk: state.week }); N.wv.sort((a, b) => b.p.ovr - a.p.ovr); if (N.wv.length > 40) N.wv.length = 40; }
function wvClaimPri() { return NFL.map(t => T(t.id)).filter(Boolean).sort((a, b) => (a.w - a.l) - (b.w - b.l)).findIndex(t => t.id === ME) + 1; }
function wvClaim(pid) {
  if (liveRosterLock()) return 'live'; const N = nflx(); const w = N.wv.find(x => x.p.id === pid); if (!w) return 'gone'; if (state.roster.length >= proMax()) return 'full';
  const pri = wvClaimPri(); if (xh('wvc' + pid) * 32 < pri - 6) { N.wv = N.wv.filter(x => x !== w); addNews(`${w.p.n} was claimed off waivers by another club before you.`); return 'lost'; }
  const p = w.p; p.k = mkContract(Math.max(0.9, r2(0.8 + Math.max(0, p.ovr - 60) * 0.06)), 1, 0, false); xJoin(p); N.wv = N.wv.filter(x => x !== w); addNews(`${myName()} claims ${p.pos} ${p.n} off waivers from the ${teamName(w.from)}.`); return 'ok';
}
function psqSign(pid) {
  const N = nflx(); if (N.psq.length >= PSQ_MAX) return 'full'; const L = PS(); const fa = (L.fa || []); const p = fa.find(x => x.id === pid) || (N.wv.find(w => w.p.id === pid) || {}).p; if (!p) return 'gone';
  if (p.age > 26 && p.ovr > 64) return 'vet'; L.fa = fa.filter(x => x.id !== pid); N.wv = N.wv.filter(w => w.p.id !== pid); p.psq = true; N.psq.push(p); addNews(`${myName()} signs ${p.pos} ${p.n} to the practice squad.`); return 'ok';
}
function psqPromote(pid) { if (liveRosterLock()) return 'live'; const N = nflx(); const p = N.psq.find(x => x.id === pid); if (!p) return 'gone'; if (state.roster.length >= proMax()) return 'full'; N.psq = N.psq.filter(x => x !== p); p.psq = false; p.k = mkContract(0.9, 1, 0, false); xJoin(p); addNews(`${myName()} promotes ${p.n} from the practice squad.`); return 'ok'; }
function psqRelease(pid) { const N = nflx(); const p = N.psq.find(x => x.id === pid); if (!p) return false; N.psq = N.psq.filter(x => x !== p); p.psq = false; (PS().fa || (PS().fa = [])).push(p); return true; }
// in season: practice squad players grow; other clubs sometimes sign the best one away
function nflxWeek(wk) {
  if (!isGM()) return; const N = nflx(); N.wv = N.wv.filter(w => w.s === state.season && state.week - w.wk <= 3);
  N.psq.forEach(p => { if (xh('psqd' + p.id + wk + state.season) < 0.12 && p.ovr < p.pot) p.ovr++; });
  const best = N.psq.slice().sort((a, b) => b.ovr - a.ovr)[0]; if (best && best.ovr >= 66 && xh('poach' + best.id + wk + state.season) < 0.08) { const t = xpk(NFL.filter(x => x.id !== ME), xh('poachT' + best.id + wk)); N.psq = N.psq.filter(p => p !== best); N.poached.unshift({ n: best.n, pos: best.pos, to: t.id, s: state.season }); addNews(`The ${teamName(t.id)} sign ${best.pos} ${best.n} off your practice squad to their 53.`, 'bad'); }
  // an injury elsewhere: a club cuts someone to make room
  if (xh('wvw' + state.season + ':' + wk) < 0.5) { const t = xpk(NFL.filter(x => x.id !== ME), xh('wvt' + state.season + wk)); const r = proRoster(t.id); if (r.length > 40) { const p = r.slice().sort((a, b) => a.ovr - b.ovr)[Math.floor(xh('wvp' + wk) * 5)]; if (p && p.ovr >= 55) { PS().rost[t.id] = r.filter(x => x !== p); wvAdd(p, t.id); } } }
}
// cut-down day: what the other clubs trimmed goes to waivers (called just before the season starts)
function nflxCutdown(before) { if (!isGM()) return; NFL.forEach(t => { if (t.id === ME) return; const now = new Set(proRoster(t.id).map(p => p.id)); (before[t.id] || []).forEach(p => { if (!now.has(p.id) && p.ovr >= 56) wvAdd(p, t.id); }); }); }
// three preseason games: they don't count, but a few players make the team with them
function nflxPreseason() {
  const N = nflx(); if (N.pre && N.pre.s === state.season + 1) return N.pre; const opp = NFL.filter(t => t.id !== ME); const games = [];
  for (let i = 0; i < 3; i++) { const o = xpk(opp, xh('pre' + state.season + i)); const us = 10 + Math.floor(xh('pu' + state.season + i) * 24), them = 10 + Math.floor(xh('pt' + state.season + i) * 24); games.push({ o: o.id, us, them: them === us ? them + 3 : them }); }
  const young = state.roster.filter(p => p.age <= 24 && p.ovr < 72).sort((a, b) => xh('ps' + a.id) - xh('ps' + b.id)).slice(0, 3);
  young.forEach(p => { p.ovr = Math.min(99, p.ovr + 1); }); N.pre = { s: state.season + 1, games, stars: young.map(p => ({ n: p.n, pos: p.pos })) };
  addNews(`Preseason: ${myName()} goes ${games.filter(g => g.us > g.them).length}-${games.filter(g => g.us < g.them).length}. ${young[0] ? young[0].n + ' turned heads.' : ''}`); return N.pre;
}
// incentives in a contract: a Pro Bowl, a playoff berth or a statistical target. Earned ones count against
// next season's cap.
const INC_K = { pb: ['A Pro Bowl', 0.06], po: ['A playoff berth', 0.04], stat: ['A big statistical season', 0.05] };
function incAdd(pid, k) { const p = P(pid); if (!p || !p.k || !INC_K[k]) return false; const I = p.k.inc || (p.k.inc = []); if (I.some(x => x.k === k) || I.length >= 2) return false; const amt = r2(Math.max(0.25, (p.k.apy || p.k.base || 1) * INC_K[k][1] * 3)); I.push({ k, amt, s: state.season }); if (p.k.sal && p.k.sal[0] - amt * 0.5 > PRO_MINSAL) { p.k.sal[0] = r2(p.k.sal[0] - amt * 0.5); kFix(p.k); } return true; } /* incentives take a little off this season's number */
function incSeasonEnd() {
  if (!isGM()) return; let due = 0; const po = typeof proPoResult === 'function' ? proPoResult(ME) : 0;
  state.roster.forEach(p => { if (!p.k || !p.k.inc) return; p.k.inc.forEach(i => { if (i.paid === state.season) return; const st = p.st || {}; const met = i.k === 'po' ? po >= 1 : i.k === 'pb' ? (p.awards || []).some(a => String(a).startsWith(state.season + ' ') && /Pro Bowl|All-Pro/.test(a)) || p.ovr >= 85 : (st.py || 0) >= 4000 || (st.ry || 0) >= 1100 || (st.rcy || 0) >= 1100 || (st.sk || 0) >= 11 || (st.int || 0) >= 5; if (met) { i.paid = state.season; p.k.incDue = r2((p.k.incDue || 0) + i.amt); due += i.amt; } }); });
  if (due) addNews(`Contract incentives earned this season: $${r2(due)}M, charged to next season's cap.`);
}
function incNewYear() { state.roster.forEach(p => { if (p.k && p.k.incDue) { p.k.incPrev = p.k.incDue; delete p.k.incDue; } }); }

/* ===================== WEEK AND OFFSEASON HOOKS ===================== */
function xWeek(wk, mg) {
  try {
    pkScore(wk); gotwRecord(wk); if (!isComm() && !isOwner()) { rxChaseResolve(); rxWeek(wk, mg); }
    if (bizOn()) bizWeek(mg);
    if (isPro()) nflxWeek(wk);
    feedWeek(wk, mg);
    if (state.phase !== 'offseason') pkSlate(); /* next week's slate, so the experts keep score even when you skip a week */
  } catch (e) { if (typeof console !== 'undefined') console.error('extras', e); }
}
function xOffseason() {
  try {
    if (!isComm()) { pkSeasonEnd(); goalsSeasonEnd(); if (isPro()) { incNewYear(); incSeasonEnd(); } }
    if (!isComm()) feedOffseason(); else feedWeek(state.week, null);
  } catch (e) { if (typeof console !== 'undefined') console.error('extras', e); }
}

/* ===================== SPREADSHEET TEXT (team packs and roster import share it) ===================== */
// Splits one line of spreadsheet text into cells. Quoted cells may hold the separator ("Ann Arbor, MI") and doubled
// quotes ("" means "), the way spreadsheets export them (FE-15).
function csvCells(line, seps) {
  const out = []; let cur = '', q = false, quoted = false; const s = String(line);
  for (let i = 0; i < s.length; i++) { const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"' && !cur.trim()) { q = true; quoted = true; cur = ''; continue; }
    if (seps.includes(ch)) { out.push(quoted ? cur : cur.trim()); cur = ''; quoted = false; continue; }
    cur += ch; }
  out.push(quoted ? cur : cur.trim()); return out;
}
// a name typed or imported as text: markup tags and angle brackets are removed, the words are kept
const plainName = (s, n) => String(s || '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim().slice(0, n || 40);

/* ===================== ROSTER IMPORT (a spreadsheet of players) ===================== */
// lines of: name, position, rating[, class or age][, number][, potential]. Header lines and blank lines are skipped.
function rosterParse(text) {
  const out = [], bad = []; const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  lines.forEach((l, i) => {
    const c = csvCells(l, '\t,;'); if (i === 0 && /name/i.test(c[0]) && /pos/i.test(c[1] || '')) return;
    const n = plainName(c[0]); const pos = String(c[1] || '').toUpperCase().replace('OT', 'OL').replace('OG', 'OL').replace(/^C$/, 'OL').replace('FS', 'S').replace('SS', 'S').replace('ILB', 'LB').replace('OLB', 'LB').replace('EDGE', 'DE').replace('NT', 'DT').replace('HB', 'RB');
    const ovr = Math.round(+c[2]); if (!n || !POS_ORDER.includes(pos) || !(ovr >= 30 && ovr <= 99)) { bad.push(i + 1); return; }
    const yr = c[3] || ''; const num = c[4] !== '' && c[4] != null && /^\d{1,2}$/.test(c[4]) ? +c[4] : null; const pot = /^\d{2}$/.test(c[5] || '') ? clamp(+c[5], ovr, 99) : null;
    out.push({ n, pos, ovr, yr, num, pot });
  });
  return { rows: out, bad };
}
// roster changes wait until a live game is final, whatever button asks for them (FE-07)
const liveRosterLock = () => typeof state !== 'undefined' && !!state && state.liveWk != null; // the same signal as the B06 cut lock
const LIVE_ROSTER_MSG = 'Roster changes wait until the live game is final.';
// what an import would do, before it does it: players by position, skipped lines, and the cap effect in the NFL (QOL-06)
function rosterPreview(text, mode) {
  const { rows, bad } = rosterParse(text); const byPos = {}; rows.forEach(r => byPos[r.pos] = (byPos[r.pos] || 0) + 1); const out = { n: rows.length, bad, byPos, mode };
  if (isPro()) { const add = r2(rows.reduce((s, r) => s + Math.max(PRO_MINSAL, r2((r.ovr - 55) * 0.28)), 0)); out.capAdd = add; out.roomAfter = r2((mode === 'replace' ? proCap(capYear()) - ((PS().dead[ME] && PS().dead[ME].yr === capYear()) ? PS().dead[ME].amt : 0) : capRoom(ME)) - add); }
  else out.sizeAfter = (mode === 'replace' ? 0 : state.roster.length) + rows.length;
  return out;
}
function rosterImport(text, mode) {
  if (liveRosterLock()) return { added: 0, bad: [], err: LIVE_ROSTER_MSG };
  const { rows, bad } = rosterParse(text); if (!rows.length) return { added: 0, bad, err: 'No players found. Each line needs a name, a position and a rating.' };
  // the new roster is built on the side and only then put in place, so nothing is half-changed if anything goes wrong
  const pro = isPro(); const keep = mode === 'replace' ? [] : state.roster.slice(); const fresh = [];
  const used = new Set(keep.map(p => p.num)); const nextNum = pos => { const R_ = pos === 'OL' ? [50, 79] : ['DT', 'DE'].includes(pos) ? [90, 99] : pos === 'TE' ? [80, 89] : ['QB', 'K', 'P'].includes(pos) ? [1, 19] : [20, 49]; for (let n = R_[0]; n <= R_[1]; n++) if (!used.has(n)) return n; for (let n = 0; n < 100; n++) if (!used.has(n)) return n; return 0; };
  let added = 0; const max = pro ? 90 : 135;
  rows.forEach(r => {
    if (keep.length + fresh.length >= max) return; const num = r.num != null && !used.has(r.num) ? r.num : nextNum(r.pos); used.add(num);
    let p;
    if (pro) { const age = clamp(Math.round(+r.yr) || 25, 21, 40); p = mkPro({ n: r.n, pos: r.pos, age, ovr: r.ovr, pot: r.pot || clamp(r.ovr + Math.max(0, 27 - age) * 2, r.ovr, 99), exp: Math.max(0, age - 22), col: 'Imported', num }); enrichPro(p); p.k = mkContract(Math.max(PRO_MINSAL, r2((r.ovr - 55) * 0.28)), 2, 0, false); p.tm = ME; }
    else { const cls = ['Fr', 'So', 'Jr', 'Sr', 'Gr'].includes(r.yr) ? r.yr : ({ 1: 'Fr', 2: 'So', 3: 'Jr', 4: 'Sr', 5: 'Gr' }[r.yr] || 'So'); p = makePlayer({ num, n: r.n, pos: r.pos, cls, ht: '6-1', wt: 210, home: '', ovr: r.ovr, pot: r.pot || clamp(r.ovr + ({ Fr: 10, So: 7, Jr: 4, Sr: 2, Gr: 1 }[cls]), r.ovr, 99), real: false, imported: true }); }
    fresh.push(p); added++;
  });
  if (mode === 'replace') { state.roster.forEach(p => { delete PMAP[p.id]; }); POS_ORDER.forEach(pos => { state.depth[pos] = []; }); }
  state.roster = keep.concat(fresh); fresh.forEach(p => { PMAP[p.id] = p; (state.depth[p.pos] || (state.depth[p.pos] = [])).push(p.id); });
  POS_ORDER.forEach(pos => { if (state.depth[pos]) autoDepth(pos); });
  addNews(`${added} player${added === 1 ? '' : 's'} imported to the roster${mode === 'replace' ? ' (the old roster was replaced)' : ''}.`);
  return { added, bad };
}

/* ===================== PLAYER CAREER: LIFE, THE JOB BATTLE, COMBINE DRILLS, A NEW PLAYER IN THE SAME WORLD ===================== */
const CX_FEM = ['Denise', 'Carla', 'Monique', 'Teresa', 'Linda', 'Angela', 'Rosa', 'Janelle', 'Keisha', 'Maureen'];
const CX_MAL = ['Darnell', 'Greg', 'Tomas', 'Curtis', 'Raymond', 'Hector', 'Wayne', 'Andre', 'Dale', 'Marvin'];
const CX_SIB = [['Younger brother', CX_MAL], ['Younger sister', CX_FEM], ['Older brother', CX_MAL], ['Older sister', CX_FEM]];
function cxLife() {
  const X_ = CX(); if (X_.life) return X_.life; const h = k => cxh('life:' + k); const sib = xpk(CX_SIB, h('s'));
  X_.life = { fam: [{ r: 'Mom', n: xpk(CX_FEM, h('m')) }, { r: 'Dad', n: xpk(CX_MAL, h('d')) }, { r: sib[0], n: xpk(sib[1], h('sn')) }], found: null, did: {}, log: [], give: 0 };
  return X_.life;
}
const CX_LIFE = {
  home: { l: 'Go home for a weekend', d: 'Time with family. A steadier head (trust +2).' },
  camp: { l: 'Host a youth camp back home', d: 'Costs $20K. Kids remember it. Followers grow.', cost: 20000 },
  found: { l: 'Start a family foundation', d: 'Costs $50K to set up. Then a gala each year.', cost: 50000, once: true },
  gala: { l: 'Hold the foundation gala', d: 'Give 10% of your bank (at least $10K). Followers and legacy.', need: 'found' },
  school: { l: 'Visit your old school', d: 'Free. Followers, and your old coach is proud.' },
};
function cxLifeAct(k) {
  const L = cxLife(); const A = CX_LIFE[k]; if (!A) return false; const y = cs.year; L.did[y] = L.did[y] || {}; if (L.did[y][k]) return false;
  if (A.once && L.found) return false; if (A.need === 'found' && !L.found) return false; const bank = cs.p.bank || 0;
  const cost = k === 'gala' ? Math.max(10000, Math.round(bank * 0.1)) : A.cost || 0; if (cost > bank) return false;
  cs.p.bank = bank - cost; cs.p.spent = (cs.p.spent || 0) + cost; L.did[y][k] = 1; const p = cs.p; let txt;
  if (k === 'home') { p.trust = clamp((p.trust || 50) + 2, 0, 100); txt = `${cName(p)} spends a weekend at home with ${L.fam[0].n}, ${L.fam[1].n} and ${L.fam[2].n}.`; }
  if (k === 'camp') { folGain(3000 + (p.fol || 0) * 0.03); txt = `${cName(p)} hosts a free youth camp in ${CSTATES[p.home] || 'his hometown'}. Two hundred kids show up.`; }
  if (k === 'found') { L.found = { n: `${p.last} Family Foundation`, y }; folGain(2000); txt = `${cName(p)} starts the ${p.last} Family Foundation.`; }
  if (k === 'gala') { L.give += cost; folGain(4000 + cost * 0.05); txt = `The ${L.found.n} gala raises money for youth sports. ${cName(p)} gives $${Math.round(cost / 1000)}K.`; }
  if (k === 'school') { folGain(1200); txt = `${cName(p)} visits ${cs.hs ? cs.hs.name : 'his old high school'} and talks to the team.`; }
  L.log.unshift({ y, txt }); if (L.log.length > 30) L.log.length = 30; cNews(txt); feedPostCareerLife(txt);
  return true;
}
function feedPostCareerLife(txt) { const F = feedStore(); const ctx = feedCtx(); const acc = feedCast(F, ctx.key, ctx.T, ctx.R, ctx.yr); const seq = ++F.seq; const pi = acc.findIndex(a => a.p === 'parent'); const ai = pi >= 0 && cxh('lp' + seq) < 0.5 ? pi : Math.floor(cxh('la' + seq) * acc.length); F.posts.unshift({ id: seq, s: cs.year, wk: cs.week, a: ai, t: xpk(['Love seeing this. ', 'This is what it is about. ', 'Class act. '], cxh('lt' + seq)) + txt, cat: 'you', lk: Math.round(200 + (cs.p.fol || 0) * 0.004), rt: 30, rp: [] }); }
// the teammate you're fighting for snaps (or who is chasing you)
function cxBattle() {
  if (typeof cs === 'undefined' || !cs || !cs.p || cs.lvl === 'hs' || ['retired', 'done', 'sign', 'hs', 'hsoff'].includes(cs.phase)) return null;
  const X_ = CX(); const key = cs.year + ':' + cs.lvl + ':' + (cs.nfl ? cs.nfl.tm : cs.col ? cs.col.tid : ''); if (X_.bt && X_.bt.key === key) return X_.bt.none ? null : X_.bt;
  const d = myDepth(); const sh = ROT_SHARE[cs.p.pos] || [1]; const n = Math.max(1, sh.filter(x => x >= 0.9).length); const me = d.rank;
  const mate = me >= n ? d.all[n - 1] : d.all[n]; if (!mate || mate.me || Math.abs(mate.sc - d.me.sc) > 5) { X_.bt = { key, none: true }; return null; }
  X_.bt = { key, n: mate.n, ovr: mate.ovr, chase: me >= n, score: 0, wk: null, log: [], won: false }; return X_.bt;
}
function cxBattleBonus() { const X_ = typeof cs !== 'undefined' && cs && cs.x; const b = X_ && X_.bt; if (!b || b.none) return 0; if (b.key !== cs.year + ':' + cs.lvl + ':' + (cs.nfl ? cs.nfl.tm : cs.col ? cs.col.tid : '')) return 0; return clamp(b.score / 8, -1.6, 1.6); }
const CX_BT = { film: ['Extra film study', 3], reps: ['Extra reps after practice', 4], lift: ['Early lifting sessions', 2] };
function cxBattleAct(k) { const b = cxBattle(); if (!b || !CX_BT[k] || b.wk === cs.year + ':' + cs.week) return false; b.wk = cs.year + ':' + cs.week; const g = CX_BT[k][1] + Math.round(cxh('bt' + cs.year + cs.week + k) * 2 - 1); b.score = clamp(b.score + g, -20, 20); b.log.unshift(`Week ${cs.week}: ${CX_BT[k][0].toLowerCase()} (${g >= 0 ? '+' : ''}${g}).`); if (k === 'reps') cs.p.ready = 'tired'; return true; }
function cxBattleWeek(rec) {
  const b = cxBattle(); if (!b) return; const gr = rec && rec.grade; const d = gr ? ({ 'A+': 4, A: 3, B: 1, C: 0, D: -2, F: -3 }[gr] || 0) : 0; const m = Math.round(cxh('btm' + cs.year + cs.week) * 4 - 2);
  b.score = clamp(b.score + d - m * 0.5, -20, 20); if (d || m) b.log.unshift(`Week ${cs.week}: ${gr ? 'your game (' + gr + ')' : 'practice'}${m > 0 ? `, ${b.n} had a good week` : m < 0 ? `, ${b.n} struggled` : ''}.`); if (b.log.length > 12) b.log.length = 12;
  if (b.chase && !b.won && b.score >= 12) { b.won = true; cNews(`${cName(cs.p)} has won the starting job over ${b.n}.`, 'win'); }
}
// combine drills as mini-games: the result of the drill you just played (0 to 1) instead of a random draw
function runDrillX(k, perf, proDay) {
  const C = combineRec(); const dr = combineDrills().find(x => x[0] === k); if (!dr) return null; if (!proDay && C.d[k]) return C.d[k]; if (proDay && (C.pro || !C.d[k])) return null;
  const base = cs.p.a[dr[2]] || cOvr(cs.p); const q = clamp(+perf || 0, 0, 1); const v = clamp(Math.round(base + (q - 0.5) * 10 + (cxh('cmb' + k + cs.year + (proDay ? 'p' : '')) - 0.5) * 2), 30, 99);
  if (proDay) { C.pro = k; if (v > C.d[k].v) C.d[k] = { v, pro: true, perf: q }; } else C.d[k] = { v, perf: q };
  return C.d[k];
}
// a new player in the same world: the record books, the legends who came before, the league's history and the fans
function cWorldSnap() {
  if (typeof cs === 'undefined' || !cs || !cs.p) return null; const p = cs.p; const X_ = CX(); const seas = p.seasons || [];
  const me = { n: cName(p), pos: p.pos, num: p.num, y0: seas.length ? seas[0].year : cs.year, y1: cs.year, col: [...new Set(seas.filter(s => s.lvl === 'col').map(s => s.team))], nfl: [...new Set(seas.filter(s => s.lvl === 'nfl').map(s => s.team))], aw: (p.awards || []).slice(0, 14).map(a => `${a.a} (${a.y})`), hof: cs.nfl && cs.nfl.retired ? cs.nfl.retired.hof : 0, v: cs.nfl && cs.nfl.retired ? cs.nfl.retired.verdict : cs.phase === 'retired' ? 'Retired' : 'Playing days over', gen: X_.gen || 1, give: X_.life ? X_.life.give : 0 };
  return { gen: (X_.gen || 1) + 1, year: Math.max(2026, cs.year + 1), league: cs.league, trec: cs.trec || {}, lrec: cs.lrec || {}, legends: [me].concat(X_.legends || []).slice(0, 40), nflHist: (cs.nfl ? (cs.nfl.champs || []) : []).concat(X_.nflHist || []).filter((e, i, a) => a.findIndex(x => x.year === e.year) === i).slice(0, 80), worldId: X_.worldId || String(cs.seed), acc: X_.feed ? X_.feed.acc : null };
}
// the college league picks up where it was, played forward to the new year
function cWorldLeague(W) {
  let L = W && W.league; if (!L || !L.teams || !Array.isArray(L.hist)) return lgNew(W ? W.year : 2026);
  try { let n = 0; while (L.year < W.year && n++ < 45) { lgFinishSeason(L); lgRollover(L); } if (L.year !== W.year) return lgNew(W.year); return L; } catch (e) { return lgNew(W.year); }
}
function cWorldApply(W) {
  if (!W) return; const X_ = CX(); X_.gen = W.gen; X_.worldId = W.worldId; X_.legends = W.legends || []; X_.nflHist = W.nflHist || []; cs.trec = W.trec || {}; cs.lrec = W.lrec || {};
  if (W.acc) X_.feed = { posts: [], seq: 0, acc: W.acc };
  const last = X_.legends[0]; if (last) cNews(`A new name in a familiar world. ${last.n} is a legend here now${last.hof >= 75 ? ' (a Hall of Famer)' : ''}; his records still stand in the books.`, 'big');
}
// Player Career: your best snaps from every season, saved as you play
function pfCareerReelAdd(rec) {
  if (!rec || !rec.hl || !rec.hl.snaps) return; const X_ = CX(); const R_ = X_.reel || (X_.reel = []);
  rec.hl.snaps.forEach(x => { const sc = (x.imm === 'td' ? 50 : x.imm === 'to' ? 40 : 0) + Math.abs(x.y || 0) + (x.kk === 'fg' && x.imm === 'fg' && x.yl0 + 17 >= 48 ? 30 : 0); if (sc < 22) return; R_.push({ sc, y: cs.year, opp: rec.opp, g: { lvl: rec.hl.lvl, wk: rec.hl.wk, ids: rec.hl.ids, names: rec.hl.names, first: rec.hl.first, mi: rec.hl.mi, side: rec.hl.side, rank: rec.hl.rank, share: rec.hl.share, num: rec.hl.num }, x }); });
  R_.sort((a, b) => b.sc - a.sc); if (R_.length > 12) R_.length = 12;
}
// each week of a Player Career: the feed, the job battle
function cxWeek(wk) {
  try { const g = cs.ss && cs.ss.games ? cs.ss.games[cs.ss.games.length - 1] : null; const rec = g && g.wk === wk ? g : null; if (rec) { cFeedGame(rec); if (typeof pfCareerReelAdd === 'function') pfCareerReelAdd(rec); } cxBattleWeek(rec); } catch (e) { if (typeof console !== 'undefined') console.error('career extras', e); }
}

/* ===================== TWO-POINT TRIES AND ONSIDE KICKS (your live games) ===================== */
// sim.twoPt: 'kick' (default), 'two' (always go for two) or 'chart' (the standard chart in the second half).
// sim.onsideArm: kick onside after your next score. Both outcomes come from hash(), so the game's random
// draws are the same as before.
function xTwoPt(sim) {
  const m = sim.twoPt; if (!m || m === 'kick') return null; const me = sim.mSide; const d = sim.pts[me] - sim.pts[1 - me];
  if (m === 'chart' && !(sim.i >= sim.total / 2 && [-10, -5, -2, 1, 5, 12].includes(d))) return null;
  const p = clamp(0.46 + (sim.F[me].off - sim.F[1 - me].def) * 0.012, 0.3, 0.66); return { good: hash(sim.ckKey + ':two:' + sim.i) < p };
}
function xOnside(sim, drv) {
  if (!sim.onsideArm) return; sim.onsideArm = false; const late = sim.i >= sim.total - 6; const won = hash(sim.ckKey + ':onside:' + sim.i) < (late ? 0.12 : 0.2); /* a surprise onside works more often */
  drv.onside = won ? 'won' : 'lost'; if (won) sim.first = 1 - sim.first; else sim.shortField[1 - sim.mSide] = (sim.shortField[1 - sim.mSide] || 0) + 0.12;
}

/* ===================== NFL EXPANSION AND CONTRACTION (Commissioner of the NFL) ===================== */
// The league can grow or shrink by any number of clubs, in the offseason before the draft. New clubs are stocked by
// an expansion draft (every club protects its best players and loses at most two), then filled out from free agency.
// A folded club's players go to free agency. The changes live in state.lgx = { add: [club], gone: [ids], log: [] };
// nflLeagueSync() makes the global NFL list match the save that is loaded (and restores the 32 for any other save).
var NFL_BASE = null;
const nflxKey = s => (s && s.lvl === 'nfl' && s.lgx ? JSON.stringify([(s.lgx.add || []).map(t => t.id), s.lgx.gone || []]) : '');
const nflCountOf = s => 32 + ((s && s.lgx && s.lgx.add) || []).filter(t => !((s.lgx.gone || []).includes(t.id))).length - ((s && s.lgx && s.lgx.gone) || []).filter(id => !((s.lgx.add || []).some(t => t.id === id))).length;
function nflLeagueSync(s) {
  if (typeof NFL === 'undefined') return; if (!NFL_BASE) NFL_BASE = NFL.slice(); s = s || (typeof state !== 'undefined' ? state : null); const key = nflxKey(s); if (nflLeagueSync.key === key) return; nflLeagueSync.key = key;
  const E = key ? s.lgx : null; const gone = new Set(E ? E.gone || [] : []); const list = NFL_BASE.filter(t => !gone.has(t.id)).concat(E ? (E.add || []).filter(t => !gone.has(t.id)) : []);
  NFL.length = 0; list.forEach(t => NFL.push(t)); if (E) (E.add || []).forEach(t => { NFL_BY[t.id] = t; }); /* folded clubs stay in NFL_BY so old box scores keep their names */
}
const NFL_STD = () => NFL.length === 32 && ['AFC', 'NFC'].every(cf => NFL_DIVS.every(dv => NFL.filter(t => t.conf === cf && t.div === dv).length === 4));
// a schedule for any league size: a round robin in 18 weeks with a league-wide bye in week 9 (17 games each with an
// even number of clubs; with an odd number one club sits each week)
function proScheduleAny(year) {
  const r = lrng(state.seed + ':nsch2:' + year); const ids = NFL.map(t => t.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const list = ids.length % 2 ? ids.concat([null]) : ids.slice(); const n = list.length; const rounds = [];
  for (let rd = 0; rd < n - 1; rd++) { const pr = []; for (let i = 0; i < n / 2; i++) { const a = list[i], b = list[n - 1 - i]; if (a && b) pr.push((rd + i) % 2 ? [a, b] : [b, a]); } rounds.push(pr); list.splice(1, 0, list.pop()); }
  const games = []; let gid = 0; let k = 0;
  const hc = {}; for (let wk = 1; wk <= 18; wk++) { if (wk === 9) continue; const pr = rounds[k % rounds.length]; k++; pr.forEach(([x, y]) => { const hx = hc[x] || 0, hy = hc[y] || 0; const [h, a] = hx < hy ? [x, y] : hy < hx ? [y, x] : (r() < 0.5 ? [x, y] : [y, x]); hc[h] = (hc[h] || 0) + 1; games.push(proGame(year, ++gid, wk, h, a, { div: nflSameDiv(h, a) })); }); } /* home and away stay balanced (v9.48) */
  PS().lg.gid = gid; return games;
}
function nflAbbr(city) { const base = String(city).toUpperCase().replace(/[^A-Z]/g, ''); const cand = [base.slice(0, 3), base.slice(0, 2) + base.slice(-1), base[0] + base.slice(2, 4), base.slice(0, 4)]; for (const c of cand) if (c.length >= 2 && !NFL_BY[c] && !(state.teams || {})[c]) return c; let i = 2; while (NFL_BY[base.slice(0, 2) + i]) i++; return base.slice(0, 2) + i; }
const nflxOpen = () => isComm() && isPro() && state.phase === 'offseason' && PS().off && (PS().off.step <= 3 || nflOdd()); // an odd league can always be fixed
// With an odd number of clubs nobody can schedule 17 games each, so the season waits until the count is even (FE-09).
const nflOdd = () => typeof NFL !== 'undefined' && NFL.length % 2 === 1;
const NFL_ODD_MSG = () => `The league has ${NFL.length} clubs. A season needs an even number so every club plays 17 games: add or fold one more club before the season starts.`;
function nflExpand(o) {
  if (!nflxOpen()) return { err: 'Expansion happens in the offseason, before the draft.' };
  const city = String(o.city || '').trim().slice(0, 24), nick = String(o.nick || '').trim().slice(0, 20); if (!city || !nick) return { err: 'Give the new club a city and a name.' };
  if (!['AFC', 'NFC'].includes(o.conf) || !NFL_DIVS.includes(o.div)) return { err: 'Pick a conference and a division.' };
  if (NFL.length >= 48) return { err: 'The league is at its limit of 48 clubs.' };
  const id = nflAbbr(city); const c1 = /^#[0-9a-f]{6}$/i.test(o.c1 || '') ? o.c1 : '#334455', c2 = /^#[0-9a-f]{6}$/i.test(o.c2 || '') ? o.c2 : '#dddddd';
  const t = { id, name: city + ' ' + nick, city, nick, conf: o.conf, div: o.div, c1, c2, p: 68, exp: state.season + 1 };
  const E = state.lgx || (state.lgx = { add: [], gone: [], log: [] }); E.add.push(t); nflLeagueSync();
  const r = lrng(state.seed + ':xexp:' + id); const p = 68;
  state.teams[id] = { id, name: t.name, nick, city, conf: t.conf, div: t.div, rating: p, off: p, def: p, st: p, elo: 1380, w: 0, l: 0, pf: 0, pa: 0, dw: 0, dl: 0, cw: 0, cl: 0, style: { run: 0, pass: 0, runD: 0, passD: 0 }, coach: '', hist: [], pow: p };
  PS().rost[id] = []; PS().aistaff[id] = genAiStaff(id, p, r); state.teams[id].coach = PS().aistaff[id].hc.name; if (PS().dead) PS().dead[id] = PS().dead[id] || [];
  const yrs = [...new Set(PS().picks.map(k => k.yr))]; yrs.forEach(yr => { for (let rd = 1; rd <= PRO_ROUNDS; rd++) PS().picks.push({ yr, rd, orig: id, own: id }); });
  const L = PS(); if (L.order && !(L.draft && L.draft.done)) { L.order = L.order.filter(x => x !== id); L.order.unshift(id); } /* a new club picks first */
  const picks = nflExpansionDraft(id); fillRosterPro(id); if (typeof proRate === 'function') proRate(id);
  E.log.unshift({ s: state.season, k: 'add', id, name: t.name, picks: picks.slice(0, 25) }); addNews(`The NFL grows to ${NFL.length} clubs: the ${t.name} join the ${t.conf} ${t.div}. They picked ${picks.length} players in the expansion draft.`, 'big');
  if (typeof feedBiz === 'function') feedBiz(`The ${t.name} are coming. Expansion!`);
  return { ok: true, id, picks, warn: nflOdd() ? NFL_ODD_MSG() : '' };
}
// every club protects its best 42 by value; the new club takes the best of the rest, at most two from any club
function nflExpansionDraft(id) {
  const out = []; const taken = {}; const val = p => p.ovr + Math.max(0, 28 - (p.age || 28)) * 1.2;
  const pool = []; NFL.forEach(t => { if (t.id === id || (state.lgx.add || []).some(x => x.id === t.id && x.exp === state.season + 1 && (PS().rost[t.id] || []).length < 30)) return; const ros = proRoster(t.id).slice().sort((a, b) => val(b) - val(a)); ros.slice(42).forEach(p => pool.push({ p, from: t.id })); });
  pool.sort((a, b) => val(b.p) - val(a.p));
  for (const e of pool) { if (out.length >= 26) break; if ((taken[e.from] || 0) >= 2) continue; const p = e.from === ME ? removeMine(e.p.id) : (PS().rost[e.from] = PS().rost[e.from].filter(x => x !== e.p), e.p); if (!p) continue; taken[e.from] = (taken[e.from] || 0) + 1; p.tm = id; PS().rost[id].push(p); out.push({ n: p.n, pos: p.pos, ovr: p.ovr, from: e.from }); }
  return out;
}
function nflFold(id) {
  if (!nflxOpen()) return { err: 'Clubs can only fold in the offseason, before the draft.' }; if (id === ME) return { err: 'That club can\'t fold.' }; const t = T(id); if (!t) return { err: 'No such club.' };
  const left = NFL.filter(x => x.id !== id); if (left.filter(x => x.conf === t.conf).length < 8) return { err: `The ${t.conf} needs at least 8 clubs for the playoffs.` }; if (!left.some(x => x.conf === t.conf && x.div === t.div)) return { err: `The ${t.conf} ${t.div} would be empty. Fold another club, or add one there first.` };
  const name = t.name; const E = state.lgx || (state.lgx = { add: [], gone: [], log: [] }); const L = PS();
  (L.rost[id] || []).forEach(p => toFA(p, 1, null)); delete L.rost[id]; if (L.aistaff) delete L.aistaff[id];
  L.picks = L.picks.filter(k => k.orig !== id); L.picks.forEach(k => { if (k.own === id) k.own = k.orig; }); if (L.order) L.order = L.order.filter(x => x !== id);
  E.gone.push(id); delete state.teams[id]; nflLeagueSync();
  E.log.unshift({ s: state.season, k: 'gone', id, name }); addNews(`The ${name} fold. The NFL is down to ${NFL.length} clubs; their players are free agents.`, 'bad'); if (typeof feedBiz === 'function') feedBiz(`The ${name} are gone. Heartbreaking for that city.`, true);
  return { ok: true };
}

