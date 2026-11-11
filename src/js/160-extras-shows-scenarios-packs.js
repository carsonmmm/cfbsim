/* ===================== EXTRAS 2 (v9.14): the engine ===================== */
// The pregame show, the front page, the season in 60 seconds, scenario challenges, rivalry trophies, advanced stats and
// team packs (every mode); the athletic department (other sports, a conference TV network, department staff, prices
// for each game); the coach's playbook, player meetings and assistants; the GM's trade block, owner budget meetings,
// holdouts and trade demands; Player Career's new coaching staff, offseason training, jersey retirement and a GM job
// after retiring; the commissioner's realignment, strikes and award ballots. No DOM here: the pages are extui2.js.
// Everything random comes from hmix(), so the season's random stream and old saves are untouched. State lives in
// state.x (AD, Coach, GM, Commissioner) and cs.x (Player Career), created lazily.
// hash() is FNV-1a with no final mixing, so keys that differ only at the end give nearly the same number. hmix()
// adds an avalanche step; every hash in the v9.14+ features goes through it.
function hmix(s) { let h = Math.floor(hash(String(s)) * 4294967295) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const x2h = k => hmix(String(typeof state !== 'undefined' && state && state.seed || 0) + ':x2:' + k);
const cx2h = k => hmix(String(typeof cs !== 'undefined' && cs && cs.seed || 0) + ':cx2:' + k);
const x2pick = (arr, v) => arr[Math.min(arr.length - 1, Math.floor(v * arr.length))];
const x2wl = (w, l) => (w || 0) + '-' + (l || 0);
const x2fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : ''));
const x2ord = n => n + (['', 'st', 'nd', 'rd'][(n % 100 >> 3 ^ 1) && n % 10] || 'th');
// a career game's win chance, the same formula as the Home page
const x2cWin = (a, b, home) => clamp(1 / (1 + Math.exp(-(((a.off - b.def) - (b.off - a.def)) / 2 + home) / 6.2)), 0.03, 0.97);

/* ===================== 1. THE PREGAME SHOW ===================== */
// Three made-up hosts preview the week's biggest games, argue about them and make their picks. The picks are made
// before kickoff and kept, so each host has a record for the season.
const PG_HOSTS = [
  { n: 'Marcus Bell', s: 'chalk', bio: 'Former coach. Trusts the tape and the numbers.' },
  { n: 'Dana Ruiz', s: 'upset', bio: 'Former quarterback. Loves an underdog.' },
  { n: 'Lou Hargrove', s: 'homer', bio: 'Thirty years in radio. Picks with his heart.' },
];
const PG_SHOW = 'The Pregame Huddle';
function pgStore() { const X_ = xCareer() ? CX() : X(); const yr = xCareer() ? cs.year : state.season; if (!X_.pg || X_.pg.s !== yr) X_.pg = { s: yr, rec: [[0, 0], [0, 0], [0, 0]], wk: {}, hist: (X_.pg && X_.pg.hist) || [] }; return X_.pg; }
// this week's games for the show: yours first, then the biggest
function pgGames() {
  if (xCareer()) {
    const sp = typeof myGameSpec === 'function' ? myGameSpec() : null; const out = [];
    if (sp) { const mi = sp.lvl === 'hs' ? (sp.home ? 0 : 1) : sp.ids.indexOf(cs.nfl ? cs.nfl.tm : cs.col ? cs.col.tid : '') ; const home = sp.home && !sp.neutral ? 2.6 : sp.neutral ? 0 : -2.6; const pMe = x2cWin(sp.base[mi >= 0 ? mi : 0], sp.base[mi >= 0 ? 1 - mi : 1], home); const ph = (mi === 0 || mi < 0) ? pMe : 1 - pMe; out.push({ id: 'c' + cs.year + ':' + sp.wk, h: sp.names[0], a: sp.names[1], hn: sp.names[0], an: sp.names[1], hr: 0, ar: 0, ph: r2(ph), mine: true, mi: mi < 0 ? 0 : mi, name: sp.name || '' }); }
    const L = cs.phase === 'nfl' && cs.nfl ? cs.nfl.L : cs.phase === 'col' ? cs.league : null; if (!L) return out;
    const mine = cs.nfl ? cs.nfl.tm : cs.col ? cs.col.tid : null; const wk = cs.week;
    const gs = L.games.filter(g => g.wk === wk && !g.done && g.h !== mine && g.a !== mine && L.teams[g.h] && L.teams[g.a]);
    const sc = g => cs.nfl ? -((L.teams[g.h].off + L.teams[g.h].def) + (L.teams[g.a].off + L.teams[g.a].def)) : (L.teams[g.h].ap || 40) + (L.teams[g.a].ap || 40);
    gs.sort((a, b) => sc(a) - sc(b)).slice(0, 2).forEach(g => { const A = lgStrength(L, g.h), B = lgStrength(L, g.a); out.push({ id: g.id, h: g.h, a: g.a, hn: cs.nfl ? nflName(g.h) : cTeamName(g.h), an: cs.nfl ? nflName(g.a) : cTeamName(g.a), hr: cs.nfl ? 0 : L.teams[g.h].ap || 0, ar: cs.nfl ? 0 : L.teams[g.a].ap || 0, ph: r2(x2cWin(A, B, g.neutral ? 0 : 2.6)), mine: false, name: g.name || '' }); });
    return out;
  }
  if (typeof state === 'undefined' || !state || state.phase === 'offseason' || state.gameOver) return [];
  const wk = state.week; const gs = state.games.filter(g => g.wk === wk && !g.done && T(g.h) && T(g.a));
  const mine = isComm() ? null : gs.find(g => g.h === ME || g.a === ME);
  const sc = g => isPro() ? -((T(g.h).elo || 1500) + (T(g.a).elo || 1500)) : (rankOf(g.h) || 45) + (rankOf(g.a) || 45) - (g.type !== 'reg' ? 30 : 0);
  const others = gs.filter(g => g !== mine).sort((a, b) => sc(a) - sc(b)).slice(0, mine ? 2 : 3);
  return (mine ? [mine] : []).concat(others).map(g => ({ id: g.id, h: g.h, a: g.a, hn: teamName(g.h), an: teamName(g.a), hr: isPro() ? 0 : rankOf(g.h), ar: isPro() ? 0 : rankOf(g.a), hw: T(g.h).w, hl: T(g.h).l, aw: T(g.a).w, al: T(g.a).l, ph: r2(winProb(g.h, g.a, g.neutral)), mine: g === mine, mi: g === mine ? [g.h, g.a].indexOf(ME) : -1, riv: g === mine && !isPro() ? rivalOf(g.h === ME ? g.a : g.h) : null, name: g.name || '' }));
}
// a host's pick: 'h' or 'a', and how sure he is (1-3)
function pgPick(hi, g, key) {
  const st = PG_HOSTS[hi].s; const fav = g.ph >= 0.5 ? 'h' : 'a'; const dog = fav === 'h' ? 'a' : 'h'; const edge = Math.abs(g.ph - 0.5); const v = hmix(key + ':' + hi + ':' + g.id);
  let side = fav; if (st === 'upset' && edge < 0.3 && v < 0.55) side = dog; else if (st === 'homer') side = g.mine ? (g.mi === 1 ? 'a' : 'h') : (g.ph >= 0.42 ? 'h' : 'a'); else if (st === 'chalk' && edge < 0.04 && v < 0.5) side = dog;
  const conf = side === fav ? (edge > 0.3 ? 3 : edge > 0.14 ? 2 : 1) : 1; return { side, conf };
}
// the show for this week: made once, kept until the week is played
function pgEnsure() {
  const S = pgStore(); const wk = xCareer() ? cs.week : state.week; if (S.wk[wk]) return S.wk[wk];
  const games = pgGames(); if (!games.length) return null; const key = (xCareer() ? cs.seed + ':c' : state.seed) + ':pg:' + S.s + ':' + wk;
  const show = { wk, key, games: games.map(g => Object.assign({}, g, { picks: PG_HOSTS.map((h, i) => pgPick(i, g, key)) })) }; S.wk[wk] = show;
  const ks = Object.keys(S.wk).map(Number).sort((a, b) => a - b); while (ks.length > 3) delete S.wk[ks.shift()];
  return show;
}
// the hosts' records: called after the week is played
function pgScore(wk) {
  const S = pgStore(); const show = S.wk[wk]; if (!show || show.scored) return; show.scored = true;
  show.games.forEach(g => {
    let hw = null;
    if (xCareer()) { if (g.mine) { const r = cs.ss && cs.ss.games ? cs.ss.games.slice().reverse().find(x => x.wk === wk) : null; if (r && r.us != null) hw = (r.us > r.them) === (g.mi === 0); } else { const L = cs.nfl ? cs.nfl.L : cs.league; const x = L && L.games.find(y => y.id === g.id); if (x && x.done) hw = x.hs > x.as; } }
    else { const x = state.games.find(y => y.id === g.id); if (x && x.done) hw = x.hs > x.as; }
    if (hw == null) return; g.hw = hw; g.picks.forEach((p, i) => { if ((p.side === 'h') === hw) S.rec[i][0]++; else S.rec[i][1]++; });
  });
}
const PG_LINES = {
  open: ['Welcome to {SHOW}. {WK}. I\'m {A}, with {B} and {C}, and we have a big one for you.', 'It\'s {WK} and this is {SHOW}. {A} here with {B} and {C}. Let\'s get to it.', 'Good morning and welcome to {SHOW}. {WK}, {B} and {C} are already arguing.'],
  fav: ['{F} is the better team, and it isn\'t close. {P}% to win by our numbers.', 'Look at the trenches. {F} wins up front, and that\'s the game.', 'I watched the tape. {F} is just more complete right now.'],
  dog: ['Don\'t sleep on {D}. They\'re live in this one.', 'Everyone\'s picking {F}. That\'s exactly why I like {D}.', '{D} has nothing to lose. Upset alert.'],
  close: ['This is a coin flip. Whoever wins the turnover battle wins the game.', 'I can\'t separate them. Give me the team with the better quarterback.', 'Fourth quarter, one score either way. Book it.'],
  rival: ['It\'s the {R}. Throw out the records.', 'Rivalry week. Anything can happen in the {R}.'],
  mineW: ['{M} comes in rolling. They\'re playing their best football.', 'Keep an eye on {M}. They\'re better than people think.'],
  mineL: ['{M} needs this one. The pressure is on.', 'Big week for {M}. They have to respond.'],
  career: ['And keep an eye on {Y}. {Y} could swing this game.', 'Watch number {N} for {M}. That kid is a problem.', 'If {Y} gets going early, look out.'],
  pick: ['{H}: I\'ll take {T}.', '{H}: {T}, and I feel good about it.', '{H}: Give me {T}.'],
  lock: ['{H}: My lock of the week: {T}. Write it down.', '{H}: Lock it in. {T}. Not even close.'],
  close2: ['That\'s the show. Enjoy the games.', 'We\'ll see you next week. Enjoy the games, everybody.'],
};
// the script, built from the stored show: segments of [who, line]
function pgScript(show) {
  if (!show) return []; const h = k => hmix(show.key + ':ln:' + k); const P_ = PG_HOSTS.map(x => x.n);
  const wkL = xCareer() ? (typeof cWeekLabel === 'function' ? cWeekLabel(show.wk) : 'Week ' + show.wk) : isPro() ? nflWeekLabel(show.wk) : weekLabel(show.wk);
  const out = [{ who: 0, k: 'open', t: x2fill(x2pick(PG_LINES.open, h('o')), { SHOW: PG_SHOW, WK: wkL, A: P_[0], B: P_[1], C: P_[2] }) }];
  show.games.forEach((g, gi) => {
    const nm = (s) => (s === 'h' ? g.hn : g.an); const rk = s => { const r = s === 'h' ? g.hr : g.ar; return r ? 'No. ' + r + ' ' : ''; };
    out.push({ who: -1, k: 'game', t: `${rk('a')}${g.an} at ${rk('h')}${g.hn}${g.name ? ' · ' + g.name : ''}`, gi });
    const fav = g.ph >= 0.5 ? 'h' : 'a', dog = fav === 'h' ? 'a' : 'h'; const P = Math.round(Math.max(g.ph, 1 - g.ph) * 100); const v = { F: nm(fav), D: nm(dog), P, R: String(g.riv || 'rivalry game').replace(/^the /i, '') };
    if (g.riv) out.push({ who: 2, k: 'arg', t: x2fill(x2pick(PG_LINES.rival, h('r' + gi)), v) });
    if (P >= 58) { out.push({ who: 0, k: 'arg', t: x2fill(x2pick(PG_LINES.fav, h('f' + gi)), v) }); out.push({ who: 1, k: 'arg', t: x2fill(x2pick(PG_LINES.dog, h('d' + gi)), v) }); }
    else out.push({ who: gi % 2 ? 2 : 0, k: 'arg', t: x2fill(x2pick(PG_LINES.close, h('c' + gi)), v) });
    if (g.mine) {
      const M = g.mi === 0 ? g.hn : g.an; let won = null;
      if (!xCareer()) { const t = T(ME); won = t && t.w >= t.l; } else won = !!(cs.ss && cs.ss.games && cs.ss.games.length && cs.ss.games[cs.ss.games.length - 1].us > cs.ss.games[cs.ss.games.length - 1].them);
      out.push({ who: 2, k: 'mine', t: x2fill(x2pick(won ? PG_LINES.mineW : PG_LINES.mineL, h('m' + gi)), { M }) });
      if (xCareer() && cs.p) out.push({ who: 1, k: 'mine', t: x2fill(x2pick(PG_LINES.career, h('y' + gi)), { Y: cName(cs.p), N: cs.p.num, M }) });
    }
    g.picks.forEach((p, i) => out.push({ who: i, k: 'pick', gi, t: x2fill(PG_LINES.pick[(Math.floor(h('p' + gi) * 3) + i) % PG_LINES.pick.length], { H: P_[i], T: nm(p.side) }) })); /* each host says it his own way */
  });
  const best = []; show.games.forEach((g, gi) => g.picks.forEach((p, i) => best.push({ i, gi, c: p.conf, side: p.side, g })));
  const lock = best.filter(b => b.i === 2).sort((a, b) => b.c - a.c)[0] || best[0];
  if (lock) out.push({ who: lock.i, k: 'lock', t: x2fill(x2pick(PG_LINES.lock, h('l')), { H: P_[lock.i], T: lock.side === 'h' ? lock.g.hn : lock.g.an }) });
  out.push({ who: 0, k: 'close', t: x2pick(PG_LINES.close2, h('e')) });
  return out;
}

/* ===================== 2. THE FRONT PAGE ===================== */
// After every week, the local paper's front page: a big headline about the biggest story, a subhead, two or three
// more stories and the player of the game. The last 20 front pages are kept.
const FP_PAPERS = ['Herald', 'Tribune', 'Gazette', 'Ledger', 'Courier', 'Daily Star', 'Post-Dispatch', 'Chronicle'];
function fpStore() { const X_ = xCareer() ? CX() : X(); return X_.fp || (X_.fp = { list: [] }); }
function fpPaper() { const key = xCareer() ? cs.seed + ':fp' : state.seed + ':fp'; const city = xCareer() ? (cs.nfl ? String(nflName(cs.nfl.tm)).split(' ').slice(0, -1).join(' ') : cs.col ? cTeamName(cs.col.tid) : cs.hs ? cs.hs.name : 'Hometown') : isComm() ? 'National' : isPro() ? (T(ME) && T(ME).city) || String(myName()).split(' ').slice(0, -1).join(' ') || 'City' : (typeof myCity === 'function' && myCity() !== 'campus' ? myCity() : myName()); return `The ${city} ${x2pick(FP_PAPERS, hmix(key))}`; }
const FP_H = {
  rout: ['{W} ROLLS', '{W} ROUTS {L}', 'NO CONTEST: {W} {S}'], win: ['{W} TOPS {L}', '{W} HOLDS OFF {L}', '{W} GETS IT DONE'], close: ['{W} SURVIVES', 'HEART-STOPPER: {W} EDGES {L}', 'BY A WHISKER'],
  loss: ['{L} STUNNED', '{W} SPOILS IT', 'ROUGH DAY FOR {L}'], blow: ['{L} EMBARRASSED', 'DISASTER: {W} {S}', '{L} FLATTENED'], comeback: ['COMEBACK! {W} RALLIES', '{W} STORMS BACK', 'FROM DOWN {D}: {W} WINS'],
  upset: ['SHOCKER: {W} TOPPLES NO. {R} {L}', 'UPSET! {W} STUNS {L}', '{W} PULLS THE UPSET'], rival: ['{W} KEEPS THE {TR}', '{W} OWNS THE RIVALRY', 'BRAGGING RIGHTS: {W}'], ot: ['OVERTIME THRILLER', '{W} WINS IT IN OT'],
  champ: ['CHAMPIONS!', '{W} WINS IT ALL', 'TITLE TOWN: {W}'], none: ['A QUIET WEEK', 'WAITING GAME', 'ON THE BYE'],
};
const fpUp = s => String(s).toUpperCase();
// the week's top story for an AD-side save
function fpBuildAD(wk, mg) {
  const h = k => x2h('fp:' + state.season + ':' + wk + ':' + k); const stories = []; let lead = null;
  const games = state.games.filter(g => g.wk === wk && g.done && T(g.h) && T(g.a));
  if (mg && mg.done && !isComm()) {
    const me = mg.h === ME ? 0 : 1; const us = me === 0 ? mg.hs : mg.as, them = me === 0 ? mg.as : mg.hs; const won = us > them; const opp = me === 0 ? mg.a : mg.h; const d = Math.abs(us - them);
    const W = fpUp(won ? (isPro() ? String(myName()).split(' ').pop() : myName()) : teamName(opp)), L = fpUp(won ? teamName(opp) : (isPro() ? String(myName()).split(' ').pop() : myName())); const S = Math.max(us, them) + '-' + Math.min(us, them);
    const champ = mg.type === 'cfp' && mg.wk === 18 || (isPro() && mg.type === 'po' && mg.name && /Super Bowl/i.test(mg.name));
    const riv = !isPro() && rivalOf(opp); const oppR = !isPro() ? rankOf(opp) : 0; const kind = champ && won ? 'champ' : won && mg.minM <= -10 ? 'comeback' : mg.ot ? 'ot' : won && riv ? 'rival' : won && oppR && oppR <= 15 && (rankOf(ME) === 0 || rankOf(ME) > oppR) ? 'upset' : won ? (d >= 24 ? 'rout' : d <= 3 ? 'close' : 'win') : d >= 24 ? 'blow' : 'loss';
    const tr = riv && typeof troName === 'function' ? fpUp(troName(opp)) : 'TROPHY';
    lead = { h: x2fill(x2pick(FP_H[kind], h('lead')), { W, L, S, R: oppR, D: -mg.minM, TR: tr }), sub: `${won ? myName() : teamName(opp)} beat ${won ? teamName(opp) : myName()} ${S}${mg.ot ? ' in overtime' : ''}${mg.name && mg.type !== 'reg' ? ' in the ' + mg.name : ''}.`, kind, gid: mg.id };
    const box = mg.box; if (box && box.p) { const best = Object.entries(box.p).map(([pid, s]) => ({ p: P(pid), s })).filter(x => x.p).map(x => ({ n: x.p.n, pos: x.p.pos, sc: (x.s.py || 0) / 25 + (x.s.ptd || 0) * 4 + ((x.s.ry || 0) + (x.s.rcy || 0)) / 10 + ((x.s.rtd || 0) + (x.s.rctd || 0)) * 6 + (x.s.sk || 0) * 4 + (x.s.int || 0) * 5 + (x.s.tk || 0) * 0.5, s: x.s })).sort((a, b) => b.sc - a.sc)[0]; if (best && best.sc > 3) lead.pog = { n: best.n, pos: best.pos, line: typeof statLine === 'function' ? statLine({ pos: best.pos }, best.s) : '' }; }
  }
  // around the league: upsets of ranked teams, then the best games
  const ups = games.filter(g => g !== mg && !isPro() && ((g.hs > g.as && rankOf(g.a) && (!rankOf(g.h) || rankOf(g.h) > rankOf(g.a) + 8)) || (g.as > g.hs && rankOf(g.h) && (!rankOf(g.a) || rankOf(g.a) > rankOf(g.h) + 8))));
  ups.slice(0, 2).forEach(g => { const hw = g.hs > g.as; const w = hw ? g.h : g.a, l = hw ? g.a : g.h; stories.push({ h: `${teamName(w)} upsets No. ${rankOf(l) || '?'} ${teamName(l)}`, t: `${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}${g.ot ? ' in overtime' : ''}.` }); });
  const rest = games.filter(g => g !== mg && !ups.includes(g)).sort((a, b) => Math.abs(a.hs - a.as) - Math.abs(b.hs - b.as));
  rest.slice(0, 3 - Math.min(2, ups.length)).forEach(g => { const hw = g.hs > g.as; stories.push({ h: `${teamName(hw ? g.h : g.a)} ${Math.abs(g.hs - g.as) <= 3 ? 'edges' : 'beats'} ${teamName(hw ? g.a : g.h)}`, t: `${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}${g.name && g.type !== 'reg' ? ', ' + g.name : ''}.` }); });
  const news = (state.news || []).filter(n => n.s === state.season && n.wk === wk && n.kind === 'big').slice(0, 1); news.forEach(n => stories.unshift({ h: 'Inside the program', t: n.txt }));
  if (isComm()) { const c = typeof cm2 === 'function' ? cm2() : null; const lg = c && (c.log || []).find(x => x.s === state.season && x.wk === wk); if (lg) lead = { h: fpUp(lg.txt.length > 46 ? lg.txt.split(/[.:]/)[0] : lg.txt), sub: lg.txt, kind: 'news' }; }
  if (!lead) { const g = ups[0] || rest[rest.length - 1] || games[0]; if (g) { const hw = g.hs > g.as; const W = fpUp(teamName(hw ? g.h : g.a)), L = fpUp(teamName(hw ? g.a : g.h)); lead = { h: ups[0] ? x2fill(x2pick(FP_H.upset, h('l2')), { W, L, R: rankOf(hw ? g.a : g.h) }) : x2fill(x2pick(FP_H.win, h('l3')), { W, L }), sub: `${teamName(hw ? g.h : g.a)} beat ${teamName(hw ? g.a : g.h)} ${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}.`, kind: 'lg' }; } else lead = { h: x2pick(FP_H.none, h('n')), sub: 'No games this week.', kind: 'none' }; }
  return { s: state.season, wk, wl: isPro() ? nflWeekLabel(wk) : weekLabel(wk), h: lead.h, sub: lead.sub, kind: lead.kind, pog: lead.pog || null, gid: lead.gid || null, st: stories.slice(0, 3), rec: isComm() ? '' : x2wl(T(ME) && T(ME).w, T(ME) && T(ME).l) };
}
function fpBuildC(rec) {
  const h = k => cx2h('fp:' + cs.year + ':' + cs.week + ':' + k); const stories = [];
  const me = cs.nfl ? nflName(cs.nfl.tm) : cs.col ? cTeamName(cs.col.tid) : cs.hs ? cs.hs.name + ' ' + cs.hs.mascot : 'Your team';
  let lead;
  if (rec && rec.us != null) {
    const won = rec.us > rec.them; const d = Math.abs(rec.us - rec.them); const S = Math.max(rec.us, rec.them) + '-' + Math.min(rec.us, rec.them); const opp = !rec.opp ? 'the opponent' : cs.nfl ? nflName(rec.opp) : cs.lvl === 'hs' || cs.phase === 'hs' || cs.phase === 'hsoff' ? rec.opp : cTeamName(rec.opp);
    const big = rec.line && typeof lineText === 'function' ? lineText(rec.line, cs.p.pos) : '';
    const star = rec.grade && /^A/.test(rec.grade) ? fpUp(cs.p.last || cName(cs.p)) : null;
    const kind = won ? (d >= 24 ? 'rout' : d <= 3 ? 'close' : 'win') : d >= 24 ? 'blow' : 'loss';
    lead = { h: star && won ? x2pick([`${star} LEADS THE WAY`, `${star} TAKES OVER`, `THE ${star} SHOW`], h('s')) : x2fill(x2pick(FP_H[kind], h('l')), { W: fpUp(won ? me : opp), L: fpUp(won ? opp : me), S }), sub: `${won ? me : opp} beat ${won ? opp : me} ${S}.${big ? ' ' + cName(cs.p) + ': ' + big + '.' : ''}`, kind };
    if (big) lead.pog = { n: cName(cs.p), pos: cs.p.pos, line: big };
  } else lead = { h: x2pick(FP_H.none, h('n')), sub: `${me} had the week off.`, kind: 'none' };
  const L = cs.nfl ? cs.nfl.L : cs.phase === 'col' || cs.phase === 'coloff' ? cs.league : null; const wk = rec ? rec.wk : cs.week - 1;
  if (L) L.games.filter(g => g.wk === wk && g.done && L.teams[g.h] && L.teams[g.a]).sort((a, b) => Math.abs(a.hs - a.as) - Math.abs(b.hs - b.as)).slice(0, 3).forEach(g => { const hw = g.hs > g.as; const nm = id => (cs.nfl ? nflName(id) : cTeamName(id)); stories.push({ h: `${nm(hw ? g.h : g.a)} ${Math.abs(g.hs - g.as) <= 3 ? 'edges' : 'beats'} ${nm(hw ? g.a : g.h)}`, t: `${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}.` }); });
  const n = (cs.news || []).find(x => x.y === cs.year && x.kind === 'big'); if (n) stories.unshift({ h: 'Around the team', t: n.txt });
  return { s: cs.year, wk: rec ? rec.wk : cs.week, wl: rec && typeof cWeekLabel === 'function' ? cWeekLabel(rec.wk) : 'Week ' + (rec ? rec.wk : cs.week), h: lead.h, sub: lead.sub, kind: lead.kind, pog: lead.pog || null, st: stories.slice(0, 3), rec: '' };
}
function fpAdd(page) { const F = fpStore(); if (!page || F.list.some(p => p.s === page.s && p.wk === page.wk)) return; F.list.unshift(page); if (F.list.length > 20) F.list.length = 20; }

/* ===================== 3. THE SEASON IN 60 SECONDS ===================== */
// every score of the year in your games, back to back on the field, at a speed that fits about a minute
function s60Items() {
  if (xCareer()) { const L = (cs.x && cs.x.s60) || []; return L.filter(e => e.y === cs.year); }
  return (state.games || []).filter(g => g.done && g.hl && g.hl.d && (g.h === ME || g.a === ME) && String(g.id).startsWith(state.season + '-')).sort((a, b) => a.wk - b.wk)
    .flatMap(g => { const mi = [g.h, g.a].indexOf(ME); return g.hl.d.filter(x => (x.s === mi && x.out === 'td' && !x.p6) || (x.p6 && x.s !== mi)).map(x => ({ g, x })); });
}
function s60AddCareer(rec) {
  if (!rec || !rec.hl || !rec.hl.snaps) return; const X_ = CX(); const L = X_.s60 || (X_.s60 = []); const yr = cs.year;
  for (let i = L.length - 1; i >= 0; i--) if (L[i].y !== yr) L.splice(i, 1);
  rec.hl.snaps.filter(x => x.imm === 'td' || (x.imm === 'fg' && x.kk === 'fg')).forEach(x => L.push({ y: yr, wk: rec.wk, opp: rec.opp, g: { lvl: rec.hl.lvl, wk: rec.hl.wk, ids: rec.hl.ids, names: rec.hl.names, first: rec.hl.first, mi: rec.hl.mi, side: rec.hl.side, rank: rec.hl.rank, share: rec.hl.share, num: rec.hl.num }, x }));
  if (L.length > 80) L.splice(0, L.length - 80);
}

/* ===================== 5. RIVALRY TROPHIES ===================== */
// Each rivalry has a trophy: its real name when the rivalry has one, otherwise the game's name with "Trophy" on it.
// The page shows who holds it, the series record, the current streak, the longest streaks and every result.
const TRO_REAL = /trophy|bell|jug|axe|bucket|cup|cannon|boot|shillelagh|keg|skillet|wheel|stalk|oil can|bones|belt/i;
function troName(opp) {
  if (xCareer()) return 'Rivalry Trophy';
  if (isPro()) { const a = String(myName()).split(' ').pop(), b = String(teamName(opp)).split(' ').pop(); return `${a}–${b} Trophy`; }
  const r = state.rivals && state.rivals[opp]; if (!r) return 'Rivalry Trophy'; if (r.trophy) return r.trophy; if (TRO_REAL.test(r.name)) return r.name;
  return /trophy/i.test(r.name) ? r.name : r.name + ' Trophy';
}
function troList() {
  if (xCareer() || isComm() || typeof state === 'undefined' || !state) return [];
  if (isPro()) {
    const L = PS(); const h2 = L.h2h || []; const me = T(ME); if (!me) return [];
    return NFL.filter(t => t.id !== ME && T(t.id) && T(t.id).conf === me.conf && T(t.id).div === me.div).map(t => { const log = h2.filter(x => x.opp === t.id); const w = log.filter(x => x.win).length; return { id: t.id, name: `${String(myName()).split(' ').pop()} vs. ${String(t.name).split(' ').pop()}`, trophy: troName(t.id), w, l: log.length - w, t: 0, base: false, log }; });
  }
  return Object.entries(state.rivals || {}).filter(([id]) => T(id)).map(([id, r]) => { const log = (state.rivalLog || []).filter(x => x.opp === id); return { id, name: r.name, trophy: troName(id), w: r.w || 0, l: r.l || 0, t: r.t || 0, base: !!(r.note && /all-time|through/i.test(r.note)), note: r.note || '', arch: !!r.arch, log }; });
}
function troStats(R) {
  const log = R.log; if (!log.length) return { holder: null, cur: 0, curW: null, bestW: 0, bestL: 0, big: null, bad: null };
  let bestW = 0, bestL = 0, rw = 0, rl = 0; log.forEach(x => { if (x.win) { rw++; rl = 0; } else { rl++; rw = 0; } bestW = Math.max(bestW, rw); bestL = Math.max(bestL, rl); });
  const last = log[log.length - 1]; let cur = 0; for (let i = log.length - 1; i >= 0 && log[i].win === last.win; i--) cur++;
  const big = log.filter(x => x.win).sort((a, b) => (b.ms - b.os) - (a.ms - a.os))[0] || null; const bad = log.filter(x => !x.win).sort((a, b) => (b.os - b.ms) - (a.os - a.ms))[0] || null;
  return { holder: last.win ? ME : R.id, cur, curW: last.win, bestW, bestL, big, bad };
}

/* ===================== 6. ADVANCED STATS ===================== */
// Every drive of your games is kept with its plays: where it started and ended, and each play's gain. From those:
// success rate (a play that gains 4 yards or more, or scores), points added per play (expected points from field
// position, before and after each play) and a drive chart. The numbers start with games played in v9.14.
const avsEP = yl => -1.0 + 0.068 * clamp(yl, 0, 100);
// called by the game engine at the end of each drive of a game with a box score
function avsDrive(sim, drv, plays, fgDist, fgGood, pick6) {
  const box = sim.box; if (!box) return; const D = box.dr || (box.dr = []); const out = drv.out; const yards = drv.yards || 0;
  const gains = plays.map(p => (p.sack ? (p.ly || p.yl || -6) : p.int || p.fum || (p.pass && !p.comp) ? 0 : p.y || 0));
  let start, end;
  if (drv.endYl != null) { end = clamp(drv.endYl, 0, 100); start = clamp(end - Math.max(0, drv.yards || 0), 1, 99); }
  else if (out === 'td') { end = 100; start = clamp(100 - yards, 1, 99); }
  else if (out === 'fg' && fgDist) { end = clamp(117 - fgDist, 1, 99); start = clamp(end - yards, 1, 99); }
  else { start = clamp(Math.round(18 + hmix((sim.ckKey || '') + ':avs:' + D.length) * 17), 5, 45); end = clamp(start + yards, 1, 99); }
  const code = p => (p.sack ? 's' : p.int ? 'i' : p.fum ? 'f' : p.pass ? (p.comp ? 'p' : 'x') : 'r');
  D.push([drv.s, out, start, end, plays.map((p, i) => code(p) + gains[i]).join(','), fgDist || 0, fgGood ? 1 : 0, pick6 ? 1 : 0, drv.qtr || 0]);
}
// the plays of a drive, with their success and points added
function avsPlays(d) {
  const [s, out, start, , str, , fgG, p6] = d; const ps = String(str || '').split(',').filter(Boolean).map(t => ({ k: t[0], y: +t.slice(1) || 0 })); let yl = start; const res = []; let down = 1, togo = 10;
  ps.forEach((p, i) => { const last = i === ps.length - 1; let after = clamp(yl + p.y, 0, 100); let epa; const need = down === 1 ? togo * 0.4 : down === 2 ? togo * 0.6 : togo; /* success: 40% of the distance on first down, 60% on second, all of it on third and fourth */
    if (last && out === 'td' && p.k !== 'i' && p.k !== 'f') { epa = 7 - avsEP(yl); after = 100; }
    else if (p.k === 'i' || p.k === 'f') epa = -avsEP(yl) - avsEP(100 - yl) - (p6 ? 7 : 0);
    else epa = avsEP(after) - avsEP(yl);
    res.push({ s, k: p.k, y: p.y, yl, down, ok: (p.k === 'r' || p.k === 'p') && (p.y >= need || (last && out === 'td')), boom: (p.k === 'r' && p.y >= 12) || (p.k === 'p' && p.y >= 18), epa }); yl = after; togo -= p.y; if (togo <= 0) { down = 1; togo = Math.min(10, 100 - yl); } else down = Math.min(4, down + 1); });
  if (out === 'fg') res.push({ s, k: 'k', y: 0, yl, ok: !!fgG, boom: false, epa: fgG ? 3 - avsEP(yl) : -avsEP(yl) - avsEP(clamp(100 - yl - 7, 0, 100)) + 0.5, kick: true });
  if (out === 'punt' || out === 'downs') res.push({ s, k: out === 'punt' ? 'u' : 'd', y: 0, yl, ok: false, boom: false, epa: out === 'punt' ? -avsEP(yl) - avsEP(clamp(100 - yl - 40, 5, 80)) + avsEP(yl) * 0.15 : -avsEP(yl) - avsEP(100 - yl), kick: true });
  return res;
}
// one game: per side (0 home, 1 away)
function avsGame(g) {
  const D = g && g.box && g.box.dr; if (!D || !D.length) return null; const side = [0, 1].map(() => ({ n: 0, ok: 0, boom: 0, epa: 0, run: { n: 0, ok: 0, epa: 0 }, pass: { n: 0, ok: 0, epa: 0 }, drives: 0, pts: 0, sc: 0 }));
  D.forEach(d => { const S = side[d[0]]; S.drives++; if (d[1] === 'td') { S.pts += 7; S.sc++; } else if (d[1] === 'fg' && d[6]) { S.pts += 3; S.sc++; }
    avsPlays(d).forEach(p => { if (p.kick) { S.epa += p.epa; return; } S.n++; if (p.ok) S.ok++; if (p.boom) S.boom++; S.epa += p.epa; const k = p.k === 'r' ? S.run : S.pass; k.n++; if (p.ok) k.ok++; k.epa += p.epa; }); });
  return { side, drives: D };
}
// the season so far: your offense and the defenses you faced, and your defense
function avsSeason() {
  const gs = (state.games || []).filter(g => g.done && g.box && g.box.dr && (g.h === ME || g.a === ME)); const acc = () => ({ n: 0, ok: 0, boom: 0, epa: 0, run: { n: 0, ok: 0, epa: 0 }, pass: { n: 0, ok: 0, epa: 0 }, drives: 0, pts: 0, sc: 0, g: 0 });
  const off = acc(), def = acc(); const rows = [];
  gs.sort((a, b) => a.wk - b.wk).forEach(g => { const A = avsGame(g); if (!A) return; const mi = g.h === ME ? 0 : 1; const add = (T_, S) => { ['n', 'ok', 'boom', 'epa', 'drives', 'pts', 'sc'].forEach(k => { T_[k] += S[k]; }); ['run', 'pass'].forEach(k => { T_[k].n += S[k].n; T_[k].ok += S[k].ok; T_[k].epa += S[k].epa; }); T_.g++; };
    add(off, A.side[mi]); add(def, A.side[1 - mi]); rows.push({ g, mi, me: A.side[mi], op: A.side[1 - mi] }); });
  return { off, def, rows };
}
const avsRate = (a, b) => (b ? Math.round(a / b * 100) : 0);
const avsPer = (a, b) => (b ? Math.round(a / b * 100) / 100 : 0);

/* ===================== 4. SCENARIO CHALLENGES ===================== */
// A new career that starts in a mess, with goals to hit by a deadline. The setup changes only the new career.
// state.x.scn (or cs.x.scn) = { k, s0, goals: [{ id, st: 'open'|'done'|'failed' }], res: null|'won'|'lost', at }.
const SCENS = {
  scandal: { mode: 'ad', l: 'Clean up a scandal', d: 'An NCAA investigation just ended. The boosters are gone, the fans are angry and the department owes money. Win back trust.', goals: [['boost', 'Boosters at 60 or better', 2, 60], ['risk', 'NCAA risk at 20 or lower', 2, 20], ['wins', 'Win 8 games in a season', 2, 8]] },
  winless: { mode: 'ad', l: 'The winless rebuild', d: 'This program went 0-12. The roster is thin and nobody comes to the games. Turn it around.', goals: [['wins', 'Win 6 games in a season', 3, 6], ['rankedWin', 'Beat a ranked team', 3, 1], ['rank', 'Finish a season ranked', 4, 25]] },
  hotseat: { mode: 'coach', l: 'The hot seat', d: 'You\'re the head coach, the fans want you gone, and the AD is listening. You get one season.', goals: [['wins', 'Win 8 games this season', 1, 8], ['rivalWin', 'Beat your rival this season', 1, 1]] },
  caphell: { mode: 'gm', l: 'Cap hell', d: 'The last GM handed out huge deals to aging stars. You\'re over the cap and the owner wants a winner.', goals: [['capOk', 'Get under the cap by the first game', 1, 0], ['playoffs', 'Make the playoffs', 2, 1]] },
  bottom: { mode: 'gm', l: 'From the bottom', d: 'The worst roster in the league. Build a contender.', goals: [['wins', 'Win 9 games in a season', 3, 9], ['poWin', 'Win a playoff game', 4, 1]] },
  crisis: { mode: 'comm', lvl: 'col', l: 'A sport in crisis', d: 'Scandals, empty seats and angry athletes. College football needs a new commissioner. Save it.', goals: [['cmInteg', 'Integrity at 60 or better', 2, 60], ['cmFan', 'Fans at 55 or better', 2, 55], ['cmJob', 'Keep your job', 2, 1]] },
  labor: { mode: 'comm', lvl: 'nfl', l: 'Labor war', d: 'The labor deal has run out and the players\' union is furious. Keep the peace and keep the money flowing.', goals: [['cmUnion', 'Players\' union at 45 or better', 1, 45], ['cmPeace', 'No work stoppage', 2, 1], ['cmRev', 'Grow league revenue', 2, 1]] },
  sleeper: { mode: 'career', l: 'The two-star sleeper', d: 'A two-star freshman nobody is recruiting yet. Make them notice.', goals: [['cStars', 'Become a four-star recruit', 0, 4], ['cP4', 'Sign with a Power Four school', 0, 1], ['cDraft', 'Get drafted', 0, 1]] },
  smallschool: { mode: 'career', l: 'Small school, big dreams', d: 'You signed with a small school. Play your way up: start, transfer to a power, and get drafted high.', goals: [['cStart', 'Start a college game', 0, 1], ['cP4', 'Play for a Power Four school', 0, 1], ['cRound', 'Get drafted in the first three rounds', 0, 3]] },
};
// a scenario's definition: a built-in one by key, or the one a custom challenge carries with it (IDEA-06)
function scnDef(sc) { return sc ? SCENS[sc.k] || (sc.k === 'custom' && sc.def && Array.isArray(sc.def.goals) ? sc.def : null) : null; }
function scnOf() { if (xCareer()) return cs.x && cs.x.scn || null; return typeof state !== 'undefined' && state && state.x && state.x.scn || null; }
// which school or club a scenario starts with (the same every time)
function scnTeam(k) {
  if (k === 'winless') { const p4 = Object.entries(CTEAMS0_AD).filter(([id, t]) => CONFS[t.conf] && CONFS[t.conf].p4 && id !== 'MICH').sort((a, b) => a[1].base - b[1].base); return p4[Math.floor(hmix('scn:w') * Math.min(5, p4.length))][0]; }
  if (k === 'scandal' || k === 'hotseat') { const mid = Object.entries(CTEAMS0_AD).filter(([id, t]) => CONFS[t.conf] && CONFS[t.conf].p4 && t.base >= 72 && t.base <= 82 && id !== 'MICH'); return mid[Math.floor(hmix('scn:' + k) * mid.length)][0]; }
  if (k === 'caphell') { const L = NFL.filter(t => NFL_BY[t.id] && t.p >= 70); return (L[Math.floor(hmix('scn:c') * L.length)] || NFL[0]).id; }
  if (k === 'bottom') { return NFL.slice().sort((a, b) => a.p - b.p)[0].id; }
  return 'MICH';
}
// the mess: applied right after the new career is created
function scnApply(k) {
  const S = SCENS[k]; if (!S) return false; const h = q => hmix('scn:' + k + ':' + q);
  const sc = { k, goals: S.goals.map((g, i) => ({ id: i, st: 'open' })), res: null };
  if (S.mode === 'career') { CX().scn = Object.assign(sc, { s0: cs.year }); return true; }
  X().scn = Object.assign(sc, { s0: state.season, c0: isComm() ? { rev: cm2().rev } : null });
  if (k === 'scandal') { Object.assign(state.meters, { boost: 30, fan: 38, board: 44 }); state.meters.risk = 55; state.fin.balance = r1(state.fin.balance - 18 * econ()); addNews('The NCAA case is closed, but the damage is done: the boosters have walked away and the department is in the red.', 'bad'); }
  if (k === 'winless') { state.roster.forEach(p => { p.ovr = clamp(p.ovr - 6, 40, 99); p.pot = Math.max(p.ovr, p.pot - 3); }); Object.assign(state.meters, { fan: 34, boost: 40, board: 52 }); if (T(ME)) T(ME).rating = r1(T(ME).rating - 6); addNews(`${myName()} went 0-12 last season. The rebuild starts now.`, 'bad'); }
  if (k === 'hotseat') { state.meters.hot = 78; state.meters.fan = 36; if (state.co) state.co.sec = 30; addNews('The fans want a new coach, and the AD has heard them. This season decides your job.', 'bad'); }
  if (k === 'caphell') { // the deals are sized against the real cap after the roster is in place, so the club always starts $6-14M over (FE-13)
    const vets = state.roster.filter(p => p.k && p.k.yrs > 0).sort((a, b) => b.ovr - a.ovr).slice(0, 7); vets.forEach((p, i) => { p.age = Math.max(p.age, 30 + Math.floor(h('a' + i) * 3)); });
    const want = -r2(6 + hmix('scn:caphell:def:' + state.seed) * 8); const w = vets.reduce((s, p) => s + p.ovr, 0) || 1; const grow = (p, add) => { if (Array.isArray(p.k.sal)) p.k.sal = p.k.sal.map(x => r2(x + add)); else p.k.base = r2(p.k.base + add); kFix(p.k); };
    const need = r2(capRoom(ME) - want); if (need > 0) vets.forEach(p => grow(p, r2(need * p.ovr / w)));
    const left = r2(capRoom(ME) - want); if (left > 0 && vets[0]) grow(vets[0], left);
    addNews(`The new GM inherits a roster of aging stars and a team ${fmM(-capRoom(ME))} over the salary cap.`, 'bad'); }
  if (k === 'bottom') { state.roster.forEach(p => { p.ovr = clamp(p.ovr - 4, 40, 99); }); addNews(`The ${myName()} have the worst roster in football. The rebuild is yours.`, 'bad'); }
  if (k === 'crisis') { const c = cm2(); Object.assign(c.m, { own: 38, fan: 34, union: 33, integ: 30 }); addNews('Scandals and empty stadiums: the new commissioner takes over a sport in crisis.', 'bad'); }
  if (k === 'labor') { const c = cm2(); c.m.union = 24; c.m.own = 52; c.cba = { until: state.season - 1, share: 48.5 }; addNews('The labor deal has expired and the players\' union is talking about a strike.', 'bad'); }
  return true;
}
/* ---------- IDEA-06: build your own challenge, with honest, checked starting conditions ---------- */
// Goals come from the same catalog the built-in scenarios use; each has a range it must stay in, and the setup is
// described in full before the career starts. A custom challenge stores its rules in the save, so it reads the same later.
const SCN_GOALS = {
  ad: { wins: ['Win {n} games in a season', 1, 12, 8], rank: ['Finish a season ranked in the top {n}', 1, 25, 25], rankedWin: ['Beat a ranked team', 1, 1, 1], boost: ['Boosters at {n} or better', 30, 90, 60], fan: ['Fans at {n} or better', 30, 90, 60], risk: ['NCAA risk at {n} or lower', 0, 40, 20] },
  gm: { wins: ['Win {n} games in a season', 1, 17, 9], playoffs: ['Make the playoffs', 1, 1, 1], poWin: ['Win a playoff game', 1, 1, 1], capOk: ['Get under the cap by the first game', 0, 0, 0] },
};
const SCN_START = { ad: { fan: ['Fans', 20, 80], boost: ['Boosters', 20, 80], cash: ['Money ($M, + or −)', -40, 40] }, gm: { over: ['Over the cap by ($M)', 0, 20] } };
function scnValidate(o) {
  const errs = []; const mode = o && SCN_GOALS[o.mode] ? o.mode : null; if (!mode) return { errs: ['Pick AD or NFL GM.'] };
  const name = String(o.l || '').replace(/[<>]/g, '').trim().slice(0, 40) || 'My challenge'; const yrs = Math.round(+o.yrs);
  if (!(yrs >= 1 && yrs <= 5)) errs.push('The deadline must be 1 to 5 seasons.');
  const tid = mode === 'gm' ? (NFL_BY[o.tid] ? o.tid : null) : (CTEAMS0_AD[o.tid] ? o.tid : null); if (!tid) errs.push(mode === 'gm' ? 'Pick an NFL club.' : 'Pick a school.');
  const goals = []; Object.entries(o.goals || {}).forEach(([k, n]) => { const G = SCN_GOALS[mode][k]; if (!G) return; const v = Math.round(+n); if (!(v >= G[1] && v <= G[2])) { errs.push(`${G[0].replace('{n}', '…')}: pick ${G[1]}${G[2] !== G[1] ? '–' + G[2] : ''}.`); return; } goals.push([k, G[0].replace('{n}', v), k === 'capOk' ? 1 : yrs, v]); });
  if (!goals.length) errs.push('Pick at least one goal.'); if (mode === 'gm' && goals.some(g => g[0] === 'capOk') && !(+((o.start || {}).over) > 0)) errs.push('"Get under the cap" needs a start over the cap.');
  const start = {}; Object.entries(SCN_START[mode]).forEach(([k, [l, lo, hi]]) => { const raw = (o.start || {})[k]; if (raw === '' || raw == null) return; const v = Math.round(+raw); if (!(v >= lo && v <= hi)) errs.push(`${l}: pick ${lo} to ${hi}.`); else start[k] = v; });
  const seed = o.seed != null && String(o.seed).trim() !== '' ? (/^\d{1,9}$/.test(String(o.seed).trim()) ? +String(o.seed).trim() : (errs.push('The seed must be a number (up to 9 digits).'), null)) : null;
  return { errs, def: errs.length ? null : { mode, l: name, d: 'A challenge you built.', tid, yrs, goals, start, seed, custom: true } };
}
// the rules in plain words: what the start looks like and what counts
function scnRulesTxt(def) {
  const L = []; L.push(`${def.mode === 'gm' ? 'NFL GM' : 'Athletic Director'} at ${def.mode === 'gm' ? nflName(def.tid) : (CTEAMS0_AD[def.tid] || {}).name || def.tid}.`);
  const st = def.start || {}; if (st.fan != null) L.push(`Fans start at ${st.fan}.`); if (st.boost != null) L.push(`Boosters start at ${st.boost}.`); if (st.cash) L.push(`${st.cash > 0 ? 'An extra' : 'A debt of'} $${Math.abs(st.cash)}M at the start.`); if (st.over) L.push(`The club starts $${st.over}M over the cap.`);
  L.push(`Deadline: ${def.yrs} season${def.yrs === 1 ? '' : 's'}. Every goal must be met by then; meter goals count at the end of the last season.`); L.push(def.seed != null ? `Seed ${def.seed}: everyone who uses it gets the same league.` : 'A random league each time.');
  return L;
}
function scnApplyCustom(def) {
  const sc = { k: 'custom', def, goals: def.goals.map((g, i) => ({ id: i, st: 'open' })), res: null, s0: state.season, c0: null }; X().scn = sc; const st = def.start || {};
  if (def.mode === 'ad') { if (st.fan != null) state.meters.fan = st.fan; if (st.boost != null) state.meters.boost = st.boost; if (st.cash) state.fin.balance = r1(state.fin.balance + st.cash * econ()); }
  if (def.mode === 'gm' && st.over) { const vets = state.roster.filter(p => p.k && p.k.yrs > 0).sort((a, b) => b.ovr - a.ovr).slice(0, 7); const w = vets.reduce((s, p) => s + p.ovr, 0) || 1; const grow = (p, add) => { if (Array.isArray(p.k.sal)) p.k.sal = p.k.sal.map(x => r2(x + add)); else p.k.base = r2(p.k.base + add); kFix(p.k); }; const need = r2(capRoom(ME) + st.over); if (need > 0) vets.forEach(p => grow(p, r2(need * p.ovr / w))); const left = r2(capRoom(ME) + st.over); if (left > 0 && vets[0]) grow(vets[0], left); }
  addNews(`Challenge: ${def.l}. ${scnRulesTxt(def).slice(1).join(' ')}`, 'big'); return sc;
}
// saves say what they are: a scenario, a custom challenge, or a save changed with the admin tools
{ const _ss = slotSummary; slotSummary = function () { const o = _ss.apply(this, arguments); try { const sc = scnOf(); const S = scnDef(sc); if (S) o.scn = (sc.k === 'custom' ? 'Custom: ' : '') + S.l; if (state.x && state.x.edited) o.edited = true; } catch (e) { } return o; }; }

// a goal's progress now: { v: what to show, ok }
function scnGoalNow(sc, i) {
  const S = scnDef(sc); const [t, , , n] = S.goals[i]; const by = sc.s0 + S.goals[i][2] - 1;
  if (xCareer()) {
    const p = cs.p; const p4 = id => { const tm = cs.league && cs.league.teams[id]; return !!(tm && CCONF[tm.conf] && CCONF[tm.conf].p4); };
    if (t === 'cStars') return { v: (p.stars || 0) + ' stars', ok: (p.stars || 0) >= n, dead: cs.lvl !== 'hs' };
    if (t === 'cP4') { const ok = !!(cs.col && p4(cs.col.tid)) || (p.seasons || []).some(s => s.lvl === 'col' && p4(s.team)); return { v: ok ? 'Yes' : 'Not yet', ok, dead: !!cs.nfl || cs.phase === 'done' || cs.phase === 'retired' }; }
    if (t === 'cStart') { const ok = (p.seasons || []).some(s => s.lvl === 'col' && s.gs > 0) || (cs.lvl === 'col' && cs.ss && cs.ss.gs > 0); return { v: ok ? 'Yes' : 'Not yet', ok, dead: !!cs.nfl || cs.phase === 'done' || cs.phase === 'retired' }; }
    if (t === 'cDraft' || t === 'cRound') { const d = cs.done && cs.done.draft; const ok = !!(d && !d.udfa && (t === 'cDraft' || d.round <= n)); return { v: d ? (d.udfa ? 'Undrafted' : 'Round ' + d.round) : 'Not yet', ok, dead: !!d || cs.phase === 'retired' }; }
    return { v: '', ok: false };
  }
  const pro = isPro(); const hist = pro ? (PS().hist || []).map(x => ({ s: x.s, w: x.w, l: x.l, po: x.po })) : (state.history || []).map(x => ({ s: x.season, w: x.w, l: x.l, rank: x.rank, bowl: x.bowl }));
  const inWin = hist.filter(x => x.s >= sc.s0 && x.s <= by); const thisW = T(ME) ? T(ME).w : 0; const best = Math.max(thisW, ...inWin.map(x => x.w), 0);
  if (t === 'wins') return { v: `${best} best`, ok: best >= n };
  if (t === 'boost' || t === 'fan') return { v: Math.round(state.meters[t]), ok: state.meters[t] >= n, end: true };
  if (t === 'risk') return { v: Math.round(state.meters.risk || 0), ok: (state.meters.risk || 0) <= n, end: true };
  if (t === 'rank') { const r = inWin.filter(x => x.rank).map(x => x.rank); return { v: r.length ? 'No. ' + Math.min(...r) : 'Not yet', ok: r.length > 0 }; }
  if (t === 'rankedWin' || t === 'rivalWin') { const ok = (state.x.scnEv || []).some(e => e.k === t && e.s >= sc.s0 && e.s <= by); return { v: ok ? 'Done' : 'Not yet', ok }; }
  if (t === 'capOk') { const v = typeof capRoom === 'function' ? capRoom(ME) : 0; return { v: (v >= 0 ? '' : '−') + fmM(Math.abs(v)) + (v >= 0 ? ' under' : ' over'), ok: v >= 0, week1: true }; }
  if (t === 'playoffs' || t === 'poWin') { const ok = inWin.some(x => x.po != null && x.po >= (t === 'poWin' ? 2 : 1)); return { v: ok ? 'Done' : 'Not yet', ok }; }
  if (t.startsWith('cm')) { const c = cm2(); if (t === 'cmInteg') return { v: c.m.integ, ok: c.m.integ >= n, end: true }; if (t === 'cmFan') return { v: c.m.fan, ok: c.m.fan >= n, end: true }; if (t === 'cmUnion') return { v: c.m.union, ok: c.m.union >= n, end: true }; if (t === 'cmJob') return { v: state.gameOver ? 'Voted out' : 'In office', ok: !state.gameOver, end: true }; if (t === 'cmPeace') return { v: (c.stops || 0) + (c.strike && c.strike.wks ? 1 : 0) ? 'A stoppage' : 'Peace', ok: !(c.stops || 0) && !(c.strikes || 0), end: true, sticky: true }; if (t === 'cmRev') { const r0 = sc.c0 ? sc.c0.rev : c.rev0; return { v: fmB(c.rev), ok: c.rev > r0, end: true }; } }
  return { v: '', ok: false };
}
// settle goals at the end of a season (AD side) or whenever the career moves on
function scnCheck(atSeasonEnd) {
  const sc = scnOf(); if (!sc || sc.res) return null; const S = scnDef(sc); if (!S) return null; const yr = xCareer() ? cs.year : state.season;
  sc.goals.forEach((g, i) => { if (g.st !== 'open') return; const by = sc.s0 + S.goals[i][2] - 1; const now = scnGoalNow(sc, i);
    if (xCareer()) { if (now.ok) g.st = 'done'; else if (now.dead) g.st = 'failed'; return; }
    if (now.sticky && !now.ok) { g.st = 'failed'; return; }
    if (now.week1) { if (now.ok) g.st = 'done'; else if (yr > sc.s0 || (state.phase !== 'offseason' && state.week > 1)) g.st = 'failed'; return; }
    if (now.end) { if (atSeasonEnd && now.ok && yr >= by) g.st = 'done'; else if (atSeasonEnd && yr >= by) g.st = now.ok ? 'done' : 'failed'; return; }
    if (now.ok) g.st = 'done'; else if (atSeasonEnd && yr >= by) g.st = 'failed'; });
  if (sc.goals.every(g => g.st === 'done')) { sc.res = 'won'; sc.at = yr; } else if (sc.goals.some(g => g.st === 'failed')) { sc.res = 'lost'; sc.at = yr; }
  if (sc.res) { const txt = sc.res === 'won' ? `Scenario complete: ${S.l}. Every goal hit.` : `Scenario over: ${S.l}. A goal slipped away.`; if (xCareer()) cNews(txt, sc.res === 'won' ? 'big' : 'bad'); else addNews(txt, sc.res === 'won' ? 'big' : 'bad'); }
  return sc.res;
}
// events the goals need: a win over a ranked team, a rivalry win
function scnEvent(k) { const x = X(); const L = x.scnEv || (x.scnEv = []); L.push({ k, s: state.season, wk: state.week }); if (L.length > 30) L.splice(0, L.length - 30); }

/* ===================== 7. TEAM PACKS ===================== */
// One file with your own names, colors and conferences: lines of  team, name, color1, color2, conference
// (team is the current name or id; colors are #rrggbb; conference is a name or id, college only). Blank fields keep
// what's there. Names and colors apply now; conference moves apply now in the offseason, otherwise when it begins.
let TPK_BASE = null;
function tpkStore() { const x = X(); return x.pack || (x.pack = { t: {}, q: [] }); }
const tpkColor = v => (/^#?[0-9a-f]{6}$/i.test(String(v || '').trim()) ? '#' + String(v).trim().replace('#', '').toLowerCase() : null);
function tpkFind(key) {
  const k = String(key || '').trim(); if (!k) return null; const up = k.toUpperCase(); const ids = Object.keys(state.teams || {});
  return ids.find(id => id === up) || ids.find(id => String(state.teams[id].name || '').toLowerCase() === k.toLowerCase()) || (isPro() ? NFL.map(t => t.id).find(id => NFL_BY[id] && (NFL_BY[id].nick || '').toLowerCase() === k.toLowerCase()) : null) || null;
}
function tpkConf(v) { const k = String(v || '').trim(); if (!k) return null; if (CONFS[k.toUpperCase()]) return k.toUpperCase(); const hit = Object.entries(CONFS).find(([, c]) => String(c.name || '').toLowerCase() === k.toLowerCase()); return hit ? hit[0] : undefined; }
function tpkParse(text) {
  const rows = [], errs = []; String(text || '').split(/\r?\n/).forEach((ln, i) => {
    const raw = ln.trim(); if (!raw || /^(#|team\s*,)/i.test(raw)) return; const c = csvCells(raw, '\t,').map(x => x.trim());
    const id = tpkFind(c[0]); if (!id) { errs.push(`Line ${i + 1}: no team called "${c[0]}".`); return; }
    const name = plainName(c[1]); const c1 = c[2] ? tpkColor(c[2]) : null, c2 = c[3] ? tpkColor(c[3]) : null;
    if (c[2] && !c1) errs.push(`Line ${i + 1}: "${c[2]}" is not a color like #1a2b3c.`); if (c[3] && !c2) errs.push(`Line ${i + 1}: "${c[3]}" is not a color like #1a2b3c.`);
    let conf = null; if (c[4]) { if (isPro()) errs.push(`Line ${i + 1}: NFL divisions don't change with a team pack; the conference was skipped.`); else { conf = tpkConf(c[4]); if (conf === undefined) { errs.push(`Line ${i + 1}: no conference called "${c[4]}".`); conf = null; } } }
    rows.push({ id, name: name || null, c1, c2, conf });
  });
  return { rows, errs };
}
function tpkApply(text) {
  const { rows, errs } = tpkParse(text); if (!rows.length) return { n: 0, errs: errs.length ? errs : ['Nothing to import. Each line: team, name, color1, color2, conference.'] };
  const K = tpkStore(); let moves = 0;
  rows.forEach(r => { const e = K.t[r.id] || (K.t[r.id] = {}); if (r.name) { e.n = r.name; if (state.teams[r.id]) state.teams[r.id].name = r.name; if (r.id === ME && state.me) state.me.name = r.name; } if (r.c1) e.c1 = r.c1; if (r.c2) e.c2 = r.c2;
    if (r.conf && state.teams[r.id] && state.teams[r.id].conf !== r.conf) { moves++; if (state.phase === 'offseason') { state.teams[r.id].conf = r.conf; } else K.q.push({ id: r.id, conf: r.conf }); } });
  if (moves && state.phase === 'offseason') rebuildConfs(); tpkSync();
  addNews(`Team pack imported: ${rows.length} team${rows.length === 1 ? '' : 's'} updated${moves ? `, ${moves} conference move${moves === 1 ? '' : 's'}${state.phase === 'offseason' ? '' : ' when the offseason begins'}` : ''}.`);
  return { n: rows.length, moves, errs };
}
// colors live in shared tables, so they are put back to the originals and the current save's pack applied on top
function tpkSync() {
  if (typeof TEAM_INFO === 'undefined') return; const K = typeof state !== 'undefined' && state && state.x && state.x.pack ? state.x.pack.t : null;
  if (!K && !TPK_BASE) return; if (!TPK_BASE) TPK_BASE = { ti: {}, nfl: {} };
  Object.entries(TPK_BASE.ti).forEach(([id, c]) => { if (TEAM_INFO[id]) Object.assign(TEAM_INFO[id], c); }); Object.entries(TPK_BASE.nfl).forEach(([id, c]) => { if (NFL_BY[id]) Object.assign(NFL_BY[id], c); });
  if (!K) return;
  Object.entries(K).forEach(([id, e]) => {
    if (isPro() && NFL_BY[id]) { if (!TPK_BASE.nfl[id]) TPK_BASE.nfl[id] = { c1: NFL_BY[id].c1, c2: NFL_BY[id].c2, name: NFL_BY[id].name }; if (e.c1) NFL_BY[id].c1 = e.c1; if (e.c2) NFL_BY[id].c2 = e.c2; if (e.n) { NFL_BY[id].name = e.n; if (state.teams[id]) state.teams[id].name = e.n; } return; }
    if (!TEAM_INFO[id]) TEAM_INFO[id] = { c1: '#5b6470', c2: '#e8e8e8', stadium: 'Home stadium', cap: 40000, city: '' };
    if (!TPK_BASE.ti[id]) TPK_BASE.ti[id] = { c1: TEAM_INFO[id].c1, c2: TEAM_INFO[id].c2 }; if (e.c1) TEAM_INFO[id].c1 = e.c1; if (e.c2) TEAM_INFO[id].c2 = e.c2; if (e.n && state.teams[id]) state.teams[id].name = e.n;
  });
}
function tpkOffseason() { const x = X(); const K = x.pack; if (!K || !K.q || !K.q.length) return; K.q.forEach(m => { if (state.teams[m.id] && CONFS[m.conf]) state.teams[m.id].conf = m.conf; }); K.q = []; rebuildConfs(); addNews('Team pack: the conference moves take effect for the new season.'); }
function tpkTemplate() { const ids = Object.keys(state.teams || {}).filter(id => !isFCS(id)).sort((a, b) => String(state.teams[a].name).localeCompare(String(state.teams[b].name))); const cols = id => (isPro() && NFL_BY[id] ? [NFL_BY[id].c1, NFL_BY[id].c2] : TEAM_INFO[id] ? [TEAM_INFO[id].c1, TEAM_INFO[id].c2] : ['', '']); return 'team,name,color1,color2,conference\n' + ids.map(id => [id, state.teams[id].name, ...cols(id), isPro() ? '' : (CONFS[state.teams[id].conf] ? CONFS[state.teams[id].conf].name : '')].map(v => /[",]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n'); }

/* ===================== 8-11. THE ATHLETIC DEPARTMENT (AD) ===================== */
// Other sports: men's and women's basketball and the Olympic sports share the "other sports" line of the budget.
// Each gets a level (cut, standard, invest); each season they post results, and fans, boosters and the board notice.
const OSP = { mbb: ['Men\'s basketball', 0.3], wbb: ['Women\'s basketball', 0.2], oly: ['Olympic sports', 0.5] };
const OSP_LV = [['cut', 'Cut', 0.82], ['std', 'Standard', 1], ['inv', 'Invest', 1.2]];
function ospStore() { const x = X(); return x.osp || (x.osp = { lv: { mbb: 1, wbb: 1, oly: 1 }, hist: [] }); }
function ospMult() { if (!bizOn()) return 1; const O = X().osp; if (!O) return 1; return Object.entries(OSP).reduce((s, [k, [, w]]) => s + w * OSP_LV[O.lv[k] != null ? O.lv[k] : 1][2], 0); }
function ospSet(k, lv) { if (!OSP[k] || ![0, 1, 2].includes(+lv)) return false; const O = ospStore(); const was = O.lv[k]; O.lv[k] = +lv; if (was !== +lv && +lv === 0 && k === 'wbb') { state.meters.risk = clamp((state.meters.risk || 0) + 6, 0, 100); addNews('Cutting women\'s basketball draws a Title IX complaint. NCAA risk goes up.', 'bad'); } return true; }
function ospSeason() {
  if (!bizOn()) return null; const O = ospStore(); if (O.hist.some(x => x.s === state.season)) return null; const e = econ(); const h = k => x2h('osp:' + state.season + ':' + k); const r = { s: state.season };
  ['mbb', 'wbb'].forEach(k => { const lv = O.lv[k]; const w = clamp(Math.round(12 + e * 9 + (lv - 1) * 4 + (h(k) - 0.5) * 10), 4, 32); const g = 31; r[k] = { w, l: g - w, tour: w >= 22, run: w >= 27 ? (h(k + 'r') < 0.35 ? 'Final Four' : 'Sweet 16') : w >= 22 ? 'NCAA Tournament' : w >= 18 ? 'NIT' : '' }; });
  const oly = O.lv.oly; r.oly = { titles: h('ot') < 0.08 + e * 0.12 + (oly - 1) * 0.1 ? 1 + (h('o2') < 0.3 ? 1 : 0) : 0, cup: clamp(Math.round(70 - e * 45 - (oly - 1) * 18 + (h('cup') - 0.5) * 20), 1, 120) };
  O.hist.unshift(r); if (O.hist.length > 12) O.hist.length = 12;
  const good = (r.mbb.tour ? 1 : 0) + (r.wbb.tour ? 1 : 0) + r.oly.titles; mv('boost', good * 2 - (O.lv.mbb === 0 ? 3 : 0)); mv('board', good * 1.5 - Object.values(O.lv).filter(v => v === 0).length * 2); mv('fan', r.mbb.run === 'Final Four' ? 4 : r.mbb.tour ? 1.5 : 0);
  addNews(`Around the department: men's basketball ${r.mbb.w}-${r.mbb.l}${r.mbb.run ? ' (' + r.mbb.run + ')' : ''}, women's basketball ${r.wbb.w}-${r.wbb.l}${r.wbb.run ? ' (' + r.wbb.run + ')' : ''}${r.oly.titles ? `, ${r.oly.titles} national title${r.oly.titles > 1 ? 's' : ''} in Olympic sports` : ''}.`, good >= 2 ? 'win' : '');
  return r;
}
// A conference TV network: you pitch it, the conference votes, it launches next season. You hold a founding stake
// plus an equal share of the rest. It grows with your conference's prestige and your success; you can sell your stake.
function tvnStore() { const x = X(); return x.tvn || null; }
function tvnName() { const c = CONFS[T(ME).conf]; return `${c ? (c.short || confShort(T(ME).conf)) : 'Conference'} Gameday Network`; }
function tvnCost() { return r1(14 * econ() + 4); }
function tvnPitch() {
  if (!bizOn()) return 'no'; const x = X(); if (x.tvn && !x.tvn.sold) return 'have'; if (x.tvnNo === state.season) return 'wait'; const cost = tvnCost(); if (state.fin.balance < cost) return 'money';
  const conf = T(ME).conf; if (conf === 'IND') return 'ind'; const prest = (CONFS[conf] && CONFS[conf].p4 ? 0.62 : 0.38) + (rankOf(ME) ? 0.12 : 0) + (state.meters.board - 60) / 300;
  if (x2h('tvn:' + state.season) > prest) { x.tvnNo = state.season; return 'no-vote'; }
  state.fin.balance = r1(state.fin.balance - cost); const n = (CONF_TEAMS(conf) || []).length || 12;
  x.tvn = { s0: state.season + 1, name: tvnName(), conf, n, stake: 0.25, subs: r1((CONFS[conf] && CONFS[conf].p4 ? 18 : 6) * (0.8 + econ() * 0.3)), cost, sold: null, paid: 0 };
  addNews(`The conference votes yes: the ${x.tvn.name} launches next season. ${myName()} is the founding partner.`, 'big'); return 'ok';
}
const CONF_TEAMS = conf => Object.values(state.teams || {}).filter(t => t.conf === conf);
function tvnYear() { const N = tvnStore(); if (!N || N.sold || state.season < N.s0) return 0; const total = N.subs * 0.9; const myShare = N.stake + (1 - N.stake) / Math.max(4, N.n); return r1(total * myShare); }
function tvnTotal() { const N = tvnStore(); return N ? r1(N.subs * 0.9) : 0; }
function tvnOffseason() { const N = tvnStore(); if (!N || N.sold || state.season < N.s0) return; const grow = 0.06 + (rankOf(ME) ? 0.04 : 0) + (state.history.length && state.history[state.history.length - 1].w >= 9 ? 0.03 : 0) + (x2h('tvg' + state.season) - 0.5) * 0.04; N.subs = r1(Math.min(N.subs * (1 + grow), 80)); N.paid = r1((N.paid || 0) + tvnYear()); }
function tvnSellPrice() { const N = tvnStore(); if (!N || N.sold) return 0; return r1(tvnTotal() * N.stake * 5.5 + (state.season >= N.s0 ? 0 : N.cost * 0.8)); }
function tvnSell() { const N = tvnStore(); if (!N || N.sold) return 0; const p = tvnSellPrice(); state.fin.balance = r1(state.fin.balance + p); N.sold = { s: state.season, price: p }; N.stake = 0; addNews(`${myName()} sells its stake in the ${N.name} for ${fmM(p)}. The network keeps paying the conference.`, 'big'); return p; }
// Department staff: a marketing director (crowds and the fans), a compliance chief (NCAA risk) and a fundraiser (donations).
const DST = { mkt: ['Marketing director', 'Fills seats and lifts the fans every week.'], cmp: ['Compliance chief', 'Lowers NCAA risk every week.'], fund: ['Fundraiser', 'Brings in more donations.'] };
const DST_FN = ['Alicia', 'Brent', 'Corinne', 'Darius', 'Elena', 'Franklin', 'Gwen', 'Howard', 'Ines', 'Jerome', 'Kara', 'Leon', 'Marisol', 'Nate', 'Odette', 'Preston'];
const DST_LN = ['Whitaker', 'Okonkwo', 'Lindgren', 'Castellanos', 'Pruitt', 'Haddad', 'Sorensen', 'Bramwell', 'Tavares', 'Quinlan', 'Ferraro', 'Ashworth', 'Mbeki', 'Doyle', 'Rasmussen', 'Vu'];
function dstStore() { const x = X(); return x.dst || (x.dst = { cur: {}, s: null, cands: {} }); }
function dstCands(k) {
  const D = dstStore(); if (D.s !== state.season) { D.s = state.season; D.cands = {}; }
  if (!D.cands[k]) D.cands[k] = [0, 1, 2].map(i => { const h = q => x2h('dst:' + state.season + ':' + k + ':' + i + ':' + q); const r = clamp(Math.round(58 + h('r') * 36), 55, 95); return { n: x2pick(DST_FN, h('f')) + ' ' + x2pick(DST_LN, h('l')), r, sal: r2(0.15 + (r - 55) / 40 * 0.75 * (0.8 + econ() * 0.4)) }; });
  return D.cands[k];
}
function dstHire(k, i) { const c = dstCands(k)[i]; if (!c || !DST[k]) return false; const D = dstStore(); D.cur[k] = Object.assign({ since: state.season }, c); D.cands[k] = D.cands[k].filter(x => x !== c); addNews(`${myName()} hires ${c.n} as ${DST[k][0].toLowerCase()}.`); return true; }
function dstFire(k) { const D = dstStore(); if (!D.cur[k]) return false; addNews(`${D.cur[k].n} is let go as ${DST[k][0].toLowerCase()}.`); delete D.cur[k]; return true; }
const dstR = k => { const D = X().dst; return D && D.cur[k] ? D.cur[k].r : 0; };
function dstPay() { const D = X().dst; if (!D) return 0; return r2(Object.values(D.cur).reduce((s, c) => s + (c.sal || 0), 0)); }
function dstWeek() { if (!bizOn()) return; const m = dstR('mkt'), c = dstR('cmp'); if (m) mv('fan', (m - 60) / 60); if (c) state.meters.risk = clamp(Math.round(((state.meters.risk || 0) - (c - 45) / 40) * 10) / 10, 0, 100); }
// Prices for each home game: a tier per game. Big games can cost more; resale shows what the market would pay.
const GPR = { value: ['Value', 0.8], std: ['Standard', 1], prem: ['Premium', 1.25], big: ['Big game', 1.5] };
function gprStore() { const x = X(); return x.gpr || (x.gpr = {}); }
const gprTier = gid => { const G = X().gpr; return G && G[gid] && GPR[G[gid]] ? G[gid] : 'std'; };
const gprMult = gid => GPR[gprTier(gid)][1];
function gprSet(gid, k) { if (!GPR[k]) return false; const g = state.games.find(x => x.id === gid); if (!g || g.done || g.h !== ME) return false; const G = gprStore(); if (k === 'std') delete G[gid]; else G[gid] = k; return true; }
// how much people want in: the game's demand without the stadium's ceiling (1 = exactly a sellout)
function gprRawDemand(g) { const f = state.fin, m = state.meters; let d = 1.03 - (f.ticket * gprMult(g.id) - 75) / 140 + (m.fan - 60) / 280 + (facLvl('stadium') - 3) * 0.02; const opp = g.a; if (rivalOf(opp)) d += 0.1; if (rankOf(opp)) d += 0.06; if (T(opp) && CONFS[T(opp).conf] && CONFS[T(opp).conf].p4) d += 0.03; else d -= 0.03; const mr = rankOf(ME); if (mr) d += 0.04; if (mr && mr <= 10) d += 0.03; return d + (dstR('mkt') ? (dstR('mkt') - 60) / 900 : 0); }
function gprResale(g) { const face = Math.round(state.fin.ticket * gprMult(g.id)); const d = gprRawDemand(g); return { face, resale: Math.round(face * clamp(0.75 + (d - 0.95) * 2.4, 0.5, 3.2)), sell: clamp(d, 0.35, 1) >= 0.995 }; }
let gprNow = null; /* the game whose money is being counted */

/* ===================== 12-13. THE PLAYBOOK (Coach) ===================== */
// Pick the plays your offense runs (six to ten, from the catalog or your own), and draw your own pass plays. The
// field view runs the plays you call with their real routes. A playbook that fits your system and has both runs
// and passes lifts the offense a little; a lopsided or poor fit costs a little. Routes are points in yards from
// the line of scrimmage (x downfield, y across), starting from the shotgun formation the field view uses.
const PB_FORM = { QB: [-5, 0], RB: [-5, 2.3], WR1: [-0.7, -19.5], WR2: [-1.3, 19], WR3: [-1.3, -11.5], TE: [-0.8, 6.9] };
const PB_PLAYS = {
  iz: { n: 'Inside zone', b: 'inside', fit: ['spread', 'wc', 'pro'], d: 'The line steps together; the back reads it and cuts.', r: { RB: [[-2.5, 0.8], [3, -0.6], [7, -1.5]] } },
  power: { n: 'Power', b: 'inside', fit: ['power', 'pro'], d: 'A pulling guard leads through the hole.', r: { RB: [[-3, 1.4], [2, 2.6], [7, 3.2]] } },
  counter: { n: 'Counter', b: 'inside', fit: ['power', 'spread'], d: 'A step one way, then back against the flow.', r: { RB: [[-4.2, 3.2], [-2.5, -1.2], [5, -2.8]] } },
  draw: { n: 'QB draw', b: 'inside', fit: ['air', 'spread'], d: 'Show pass, then the quarterback runs it.', r: { QB: [[-4.5, 0], [3, 0.6], [8, 1]] } },
  oz: { n: 'Outside zone', b: 'outside', fit: ['wc', 'pro'], d: 'Stretch it wide and cut back on the first crease.', r: { RB: [[-3, 4], [0, 8], [6, 10]] } },
  toss: { n: 'Toss sweep', b: 'outside', fit: ['power', 'pro'], d: 'Pitch it and get to the edge behind the pullers.', r: { RB: [[-5.5, 7], [-1, 12], [6, 13]] } },
  jet: { n: 'Jet sweep', b: 'outside', fit: ['spread', 'air'], d: 'The slot runs across at full speed and takes the handoff.', r: { WR3: [[-1.5, -4], [-1, 6], [5, 14]] } },
  zr: { n: 'Zone read', b: 'outside', fit: ['spread'], d: 'The quarterback reads the end and keeps or gives.', r: { QB: [[-4.5, -1], [-1, -6], [5, -9]] } },
  slant: { n: 'Slant-flat', b: 'short', tg: 'WR1', fit: ['wc', 'air', 'pro'], d: 'A quick slant inside and a flat route under it.', r: { WR1: [[1.5, -19.5], [6, -14.5]], WR3: [[0.5, -12], [1.2, -17.5]], WR2: [[1.5, 19], [6, 14.5]], TE: [[4, 6.9], [5.5, 3]] } },
  mesh: { n: 'Mesh', b: 'short', tg: 'WR3', fit: ['air', 'wc'], d: 'Two shallow crossers rub past each other.', r: { WR3: [[2, -11], [5, 0], [5.5, 11]], TE: [[2, 6.9], [5.5, -1], [6, -11]], WR1: [[12, -19.5], [19, -18]], WR2: [[10, 19], [12, 17]], RB: [[-3.5, 6], [0.5, 12]] } },
  stick: { n: 'Stick', b: 'short', tg: 'TE', fit: ['pro', 'wc', 'spread'], d: 'The tight end sits down at five yards; a flat route beside him.', r: { TE: [[5, 6.9], [5, 5.4]], WR2: [[1, 19], [2.5, 22]], WR3: [[9, -11.5], [13, -8]], WR1: [[14, -19.5], [20, -19]] } },
  smash: { n: 'Smash', b: 'short', tg: 'WR1', fit: ['pro', 'air'], d: 'An outside hitch with a corner route over the top.', r: { WR1: [[5, -19.5], [4.5, -19]], WR3: [[10, -11.5], [16, -18.5]], WR2: [[5, 19], [4.5, 18.5]], TE: [[11, 6.9], [17, 12]] } },
  dagger: { n: 'Dagger', b: 'deep', tg: 'WR2', fit: ['air', 'pro'], d: 'A seam clears the safety for a deep dig behind it.', r: { WR2: [[13, 19], [15, 9]], TE: [[18, 6.9]], WR1: [[6, -19.5], [5.5, -19]], WR3: [[3, -11.5], [5, -6]] } },
  verts: { n: 'Four verticals', b: 'deep', tg: 'WR1', fit: ['air'], d: 'Everybody goes deep. Somebody gets open.', r: { WR1: [[23, -19.5]], WR2: [[23, 19]], WR3: [[21, -9]], TE: [[21, 8]] } },
  postw: { n: 'Post-wheel', b: 'deep', tg: 'WR2', fit: ['pro', 'air'], d: 'A post route inside and the back wheeling up the sideline.', r: { WR2: [[11, 19], [24, 9]], RB: [[-2, 6], [2, 11], [17, 15]], WR1: [[12, -19.5], [10, -17]] } },
  pashot: { n: 'Play-action shot', b: 'deep', tg: 'WR1', pa: true, fit: ['power', 'pro'], d: 'Fake the run, then throw it deep down the field.', r: { WR1: [[12, -19.5], [26, -12]], TE: [[3, 6.9], [7, -2]], WR2: [[14, 19], [20, 16]] } },
  bubble: { n: 'Bubble screen', b: 'screen', tg: 'WR3', fit: ['spread', 'air'], d: 'A quick throw to the slot with blockers in front.', r: { WR3: [[-1.5, -13.5], [-1.2, -16]], WR1: [[1.5, -18.5]] } },
  rbscreen: { n: 'Running back screen', b: 'screen', tg: 'RB', fit: ['wc', 'pro'], d: 'Let the rush in, then dump it to the back behind the line.', r: { RB: [[-4, 5.5], [-1.6, 8]] } },
};
const PB_MIN = 6, PB_MAX = 10, PB_CUSTOM = 4;
const PB_ROLES = ['WR1', 'WR2', 'WR3', 'TE', 'RB'];
const pbkOn = () => isCoach() && ['HC', 'OC'].includes(state.co.role);
function pbkStore() { const x = X(); if (!x.pb) { const sch = typeof myScheme === 'function' ? myScheme().off : 'pro'; const fit = k => PB_PLAYS[k].fit.includes(sch); const runs = Object.keys(PB_PLAYS).filter(k => PB_PLAYS[k].b === 'inside' || PB_PLAYS[k].b === 'outside'); const pass = Object.keys(PB_PLAYS).filter(k => !runs.includes(k)); x.pb = { on: runs.filter(fit).slice(0, 3).concat(runs.filter(k => !fit(k))).slice(0, 3).concat(pass.filter(fit).slice(0, 4).concat(pass.filter(k => !fit(k))).slice(0, 4)), custom: [], set: false, seq: 0 }; } return x.pb; }
function pbkDef(id) { if (PB_PLAYS[id]) return Object.assign({ id }, PB_PLAYS[id]); const B = X().pb; const c = B && B.custom.find(x => x.id === id); return c ? Object.assign({ fit: [], d: 'Your own play.' }, c) : null; }
const pbkRun = d => d && (d.b === 'inside' || d.b === 'outside');
function pbkToggle(id) { if (!pbkOn()) return 'role'; const B = pbkStore(); if (!pbkDef(id)) return 'none'; const i = B.on.indexOf(id); if (i >= 0) { if (B.on.length <= PB_MIN) return 'min'; B.on.splice(i, 1); } else { if (B.on.length >= PB_MAX) return 'max'; B.on.push(id); } B.set = true; return 'ok'; }
function pbkFit() { const B = X().pb; if (!B) return { n: 0, fit: 0, runs: 0, pass: 0 }; const sch = myScheme().off; const L = B.on.map(pbkDef).filter(Boolean); return { n: L.length, fit: L.filter(d => (d.fit || []).includes(sch)).length, runs: L.filter(pbkRun).length, pass: L.filter(d => !pbkRun(d)).length, custom: L.filter(d => d.cr).length }; }
// the playbook's effect on your offense: zero until you change it
function pbkBonus() { if (!pbkOn()) return 0; const B = X().pb; if (!B || !B.set) return 0; const f = pbkFit(); if (!f.n) return 0; const share = (f.fit + f.custom * 0.5) / f.n; const bal = f.runs >= 3 && f.pass >= 3; return r2(clamp((share - 0.55) * 1.1, -0.4, 0.45) + (bal ? 0 : -0.3) + Math.min(3, f.custom) * 0.04); }
// your own play: routes for any of the five receivers (up to four points each), and the one the ball goes to
function pbkSave(o) {
  if (!pbkOn()) return 'role'; const B = pbkStore(); const name = String(o.n || '').replace(/[<>]/g, '').trim().slice(0, 28); if (!name) return 'name';
  const r = {}; PB_ROLES.forEach(k => { const L = (o.r && o.r[k]) || []; const pts = L.slice(0, 4).map(p => [clamp(Math.round(+p[0] * 2) / 2, -6, 30), clamp(Math.round(+p[1] * 2) / 2, -24.5, 24.5)]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])); if (pts.length) r[k] = pts; });
  const tg = PB_ROLES.includes(o.tg) && r[o.tg] ? o.tg : Object.keys(r)[0]; if (!tg) return 'routes';
  const end = r[tg][r[tg].length - 1]; const b = end[0] < 0 ? 'screen' : end[0] >= 15 ? 'deep' : 'short';
  const was = o.id ? B.custom.find(c => c.id === o.id) : null; if (!was && B.custom.length >= PB_CUSTOM) return 'max';
  const play = { id: was ? was.id : 'cu' + (++B.seq), n: name, b, tg, r, cr: true, fit: [] }; if (was) Object.assign(was, play); else { B.custom.push(play); if (B.on.length < PB_MAX) B.on.push(play.id); }
  B.set = true; return 'ok';
}
function pbkDelete(id) { const B = pbkStore(); const c = B.custom.find(x => x.id === id); if (!c) return false; B.custom = B.custom.filter(x => x !== c); B.on = B.on.filter(x => x !== id); while (B.on.length < PB_MIN) { const add = Object.keys(PB_PLAYS).find(k => !B.on.includes(k)); if (!add) break; B.on.push(add); } return true; }
// the play calls in a live game: your playbook's plays, each with the call it runs
function pbkCalls() { if (!pbkOn()) return null; const B = pbkStore(); return B.on.map(pbkDef).filter(Boolean); }
// what the field view needs to draw a pass play's routes
function pbkCr(d) { if (!d || pbkRun(d) || !d.r) return null; return { r: d.r, tg: d.tg, pa: !!d.pa }; }

/* ===================== 14. ONE-ON-ONE PLAYER MEETINGS (Coach) ===================== */
// Two meetings a week in season, four in the offseason. Praise, a promise of a bigger role (kept or broken over the
// next three weeks), a challenge, or a talk about his future, which keeps him from the transfer portal.
const MTG = { praise: ['Praise his work', 'A boost to how he feels about you. More for a player who\'s earning it.'], role: ['Promise a bigger role', 'A big lift now. If he isn\'t starting within three weeks, the promise is broken.'], push: ['Challenge him', 'Some players answer it. Others don\'t like it.'], future: ['Talk about his future', 'Keeps him out of the transfer portal this year.'] };
function mtgStore() { const x = X(); const key = state.phase === 'offseason' ? state.season + ':off' : state.season + ':' + state.week; if (!x.mtg || x.mtg.key !== key) x.mtg = { key, used: 0, met: [], hist: (x.mtg && x.mtg.hist) || [], prom: (x.mtg && x.mtg.prom) || [] }; return x.mtg; }
const mtgMax = () => (state.phase === 'offseason' ? 4 : 2);
// who needs a talk: transfer risks first (good players without a starting job, low rapport), then unhappy starters
function mtgList() {
  const out = state.roster.filter(p => !p.inj || p.inj < 6).map(p => { const di = (state.depth[p.pos] || []).indexOf(p.id); const benched = di >= (START[p.pos] || 1); const rap = rapOf(p); const yng = isPro() ? false : ['Fr', 'So', 'Jr'].includes(p.cls);
    const risk = clamp((60 - rap) / 120 + (benched && p.ovr >= 64 ? 0.25 : 0) + (yng ? 0.08 : 0) + (p.pers === 'diva' ? 0.12 : 0), 0, 1); return { p, risk, benched, rap }; });
  return out.filter(x => x.risk >= 0.12 || x.rap < 55).sort((a, b) => b.risk - a.risk).slice(0, 12);
}
function mtgMeet(pid, k) {
  if (!isCoach() || !MTG[k]) return { ok: false, txt: '' }; const M = mtgStore(); if (M.used >= mtgMax()) return { ok: false, txt: 'No more meetings this week.' }; const p = P(pid); if (!p) return { ok: false, txt: '' };
  if (M.met.includes(pid)) return { ok: false, txt: `You already met with ${p.n} this week.` };
  M.used++; M.met.push(pid); const h = q => x2h('mtg:' + M.key + ':' + pid + ':' + q); const di = (state.depth[p.pos] || []).indexOf(p.id); const starter = di >= 0 && di < (START[p.pos] || 1); let txt = '';
  if (k === 'praise') { const d = starter ? 6 : 4; rapAdj(p, d, 'You praised his work'); txt = `${p.n} appreciated it. ${starter ? 'He\'s playing well and knows you see it.' : 'He keeps working.'}`; }
  if (k === 'role') { rapAdj(p, 10, 'You promised him a bigger role'); M.prom = M.prom.filter(x => x.pid !== pid); M.prom.push({ pid, s: state.season, by: state.phase === 'offseason' ? 3 : state.week + 3 }); txt = `${p.n} lit up. He'll be watching the depth chart.`; }
  if (k === 'push') { const ans = p.pers === 'leader' || p.pers === 'worker' || h('p') < 0.55; rapAdj(p, ans ? 3 : -5, ans ? 'He answered your challenge' : 'He didn\'t like being called out'); if (ans) p.mtgDev = state.season; txt = ans ? `${p.n} took it to heart. Expect a better week of practice.` : `${p.n} didn't take it well.`; }
  if (k === 'future') { p.portalRisk = (p.portalRisk || 0) - 0.14; rapAdj(p, 2, 'You talked about his future'); txt = isPro() ? `${p.n} likes where his career is headed here.` : `${p.n} plans to stay. You talked about his path to the field${p.ovr >= 78 ? ' and to the NFL' : ''}.`; }
  M.hist.unshift({ s: state.season, wk: state.week, pid, n: p.n, k, txt }); if (M.hist.length > 24) M.hist.length = 24;
  return { ok: true, txt };
}
// promises: kept if he's a starter by the deadline
function mtgWeek() {
  if (!isCoach()) return; const x = X(); const M = x.mtg; if (!M || !M.prom || !M.prom.length) return;
  M.prom = M.prom.filter(pr => { const p = P(pr.pid); if (!p) return false; const di = (state.depth[p.pos] || []).indexOf(p.id); const starter = di >= 0 && di < (START[p.pos] || 1);
    if (starter) { rapAdj(p, 3, 'You kept your promise'); addNews(`${p.n} got the bigger role he was promised.`); return false; }
    if (pr.s !== state.season || state.week > pr.by) { rapAdj(p, -15, 'You broke your promise'); p.portalRisk = (p.portalRisk || 0) + 0.15; mv('morale', -1); addNews(`${p.n} feels misled: the bigger role he was promised never came.`, 'bad'); return false; }
    return true; });
}

/* ===================== 15. GROWING YOUR ASSISTANTS (Coach) ===================== */
// Every offseason your assistants grow, more under a head coach who develops coaches. Good ones get offers to move
// up. As the head coach you can try to keep one (a raise, and no guarantee) or let him go with your blessing: he
// joins your coaching tree and your reputation grows. Under another head coach, you just watch them go.
function astOffseason() {
  if (!isCoach() || isPro() || !state.staff) return; const co = state.co; const hc = co.role === 'HC' ? null : state.staff.HC; const mentor = co.role === 'HC' ? co.sk.dev : hc ? hc.dev || 70 : 70;
  const x = X(); x.astUp = []; x.promo = (x.promo || []).filter(o => o.s === state.season && !o.done);
  STAFF_ROLES.forEach(r => { const c = state.staff[r]; if (!c || c.me || r === 'HC') return; const h = q => x2h('ast:' + state.season + ':' + r + ':' + q);
    const g = Math.round(clamp((mentor - 68) / 10, -1, 2.5) + h('g') * 2); if (g > 0) { if (c.ovr != null) c.ovr = clamp(c.ovr + g, 40, 97); c.dev = clamp((c.dev || 70) + (h('d') < 0.5 ? 1 : 0), 40, 97); c.rec = clamp((c.rec || 70) + (h('r') < 0.4 ? 1 : 0), 40, 97); x.astUp.push({ r, n: c.name, g }); }
    const tier = ROLE_TIER[r]; const ready = (c.ovr || 0) >= (tier === 2 ? 84 : 81);
    if (ready && h('o') < 0.3 && x.promo.length < 2) { const pool = Object.values(state.teams).filter(t => t.id !== ME && CONFS[t.conf]); const dest = pool[Math.floor(h('t') * pool.length)]; const up = tier === 2 ? 'HC' : (OFF_POS.includes(r) ? 'OC' : DEF_POS.includes(r) ? 'DC' : 'OC');
      x.promo.push({ s: state.season, r, n: c.name, to: dest ? dest.id : null, up, done: false }); } });
  if (co.role !== 'HC') x.promo.forEach(o => astLetGo(o, true));
}
function astLetGo(o, quiet) {
  if (o.done) return; o.done = true; o.res = 'left'; const c = state.staff[o.r]; if (!c) return; treeAdd(c, o.r, o.to, o.up); state.staff[o.r] = null;
  if (o.up === 'HC' && o.to && T(o.to)) T(o.to).coach = c.name; if (state.co.role === 'HC') state.co.rep = clamp(Math.round((state.co.rep + 1) * 10) / 10, 0, 100);
  addNews(`${c.name} leaves ${myName()} to become the ${o.up === 'HC' ? 'head coach' : o.up === 'OC' ? 'offensive coordinator' : 'defensive coordinator'}${o.to ? ' at ' + teamName(o.to) : ''}.${quiet ? '' : ' He goes with your blessing, and your coaching tree grows.'}`, 'win');
}
function astKeep(o) {
  if (o.done) return 'done'; const c = state.staff[o.r]; if (!c) { o.done = true; return 'gone'; } const ok = x2h('astk:' + state.season + ':' + o.r) < 0.5 + (rapOf(c) - 60) / 150;
  if (ok) { o.done = true; o.res = 'stayed'; c.salary = r1((c.salary || 0.5) * 1.35); rapAdj(c, 6, 'You fought to keep him'); addNews(`${c.name} turns down the promotion to stay at ${myName()}, with a raise.`, 'win'); return 'stayed'; }
  astLetGo(o, true); return 'left';
}

/* ===================== 16-18. THE GM'S DESK ===================== */
// The trade block: put players on it and clubs call with offers (in season until the deadline, or any time in the
// offseason). The offers land with the others on the Trades tab.
function tbkStore() { const x = X(); return x.tbk || (x.tbk = { ids: [] }); }
function tbkOpen() { return isGM() && (state.phase === 'offseason' || state.week <= 9); }
function tbkToggle(pid) { if (!isGM()) return false; const B = tbkStore(); const p = P(pid); if (!p) return false; const i = B.ids.indexOf(pid); if (i >= 0) { B.ids.splice(i, 1); const L = PS(); L.tradeOffers = (L.tradeOffers || []).filter(o => !(o.blk && o.get.pl.includes(pid))); return 'off'; } B.ids.push(pid); tbkCalls(true, pid); return 'on'; }
function tbkCalls(now, only) {
  if (!tbkOpen()) return 0; const L = PS(); const B = tbkStore(); B.ids = B.ids.filter(id => P(id)); let n = 0; const wk = state.phase === 'offseason' ? 0 : state.week; L.tradeOffers = L.tradeOffers || [];
  B.ids.filter(id => !only || id === only).forEach(pid => { const p = P(pid); if (!p || !underContract(p)) return; const have = L.tradeOffers.filter(o => o.blk && o.get.pl.includes(pid)).length; if (have >= 2) return;
    const h = q => x2h('tbk:' + state.season + ':' + wk + ':' + pid + ':' + q); if (!now && h('call') > 0.55) return; const val = tradeValue(p);
    const clubs = NFL.map(t => t.id).filter(id => id !== ME && T(id) && capRoom(id) >= capHit(p) - 0.5).sort((a, b) => posNeed(b, p.pos) - posNeed(a, p.pos) || hmix(a + pid) - hmix(b + pid)).slice(0, 4);
    clubs.slice(0, now ? 2 : 1).forEach((tid, ci) => { if (L.tradeOffers.some(o => o.blk && o.tid === tid && o.get.pl.includes(pid))) return; const want = val * (0.82 + h('v' + ci) * 0.28);
      const swap = h('sw' + ci) < 0.35 ? proRoster(tid).filter(q => q.pos !== p.pos && underContract(q) && tradeValue(q) <= want * 1.05 && tradeValue(q) >= want * 0.6 && posNeed(ME, q.pos) > 0.3).sort((a, b) => tradeValue(b) - tradeValue(a))[0] : null;
      let give = [], sum = swap ? tradeValue(swap) : 0; if (sum < want * 0.95) { const their = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === tid).sort((a, b) => pickPts(b.pk) - pickPts(a.pk)); for (const x of their) { if (sum >= want * 0.95) break; if (sum + pickPts(x.pk) <= want * 1.2) { give.push(x.i); sum += pickPts(x.pk); } } }
      if (sum < want * 0.8) return; L.tradeOffers.push({ id: 'bk' + state.season + '_' + wk + '_' + pid + '_' + tid, s: state.season, tid, exp: state.phase === 'offseason' ? 99 : wk + 1, blk: true, get: { pl: [pid], pk: [] }, give: { pl: swap ? [swap.id] : [], pk: give } }); n++; }); });
  if (n && !now) addNews(`${n === 1 ? 'A club calls' : n + ' calls come in'} about players on your trade block. See the Trades tab.`);
  return n;
}
// Owner budget meetings: once each offseason, ask for more (or less) for the coaching staff, travel and recovery,
// and the training facility. The owner says yes more often when he's happy; cuts always go through and please him.
const OBM = { staff: ['Coaching staff', 'More money for assistants and analysts: a slightly better team on game day.'], travel: ['Travel and recovery', 'Charter flights, sleep and recovery staff: fewer injuries.'], fac: ['Training facility', 'New equipment and practice space: young players develop faster.'] };
function obmStore() { const x = X(); return x.obm || (x.obm = { yr: null, got: {}, hist: [] }); }
const obmReady = () => isGM() && !isOwner() && state.phase === 'offseason' && obmStore().yr !== state.season + 1;
function obmMeet(ask) {
  if (!obmReady()) return null; const O = obmStore(); const L = PS(); const sec = L.gm ? L.gm.sec : 60; const res = {}; let raises = 0;
  Object.keys(OBM).forEach(k => { const a = clamp(Math.round(+ask[k] || 0), -1, 1); if (a < 0) { res[k] = -1; if (L.gm) L.gm.sec = clamp(L.gm.sec + 1, 0, 100); } else if (a > 0) { raises++; const p = clamp(0.4 + (sec - 55) / 90 - (raises - 1) * 0.16 + (Object.values(ask).some(v => +v < 0) ? 0.15 : 0), 0.08, 0.9); res[k] = x2h('obm:' + state.season + ':' + k) < p ? 1 : 0; if (res[k] && L.gm) L.gm.sec = clamp(L.gm.sec - 1, 0, 100); } else res[k] = 0; });
  O.yr = state.season + 1; O.got = res; O.ask = Object.assign({}, ask); O.hist.unshift({ yr: O.yr, ask: Object.assign({}, ask), got: Object.assign({}, res) }); if (O.hist.length > 10) O.hist.length = 10;
  const yes = Object.values(res).filter(v => v > 0).length, no = Object.keys(res).filter(k => +ask[k] > 0 && !res[k]).length; addNews(`Budget meeting with the owner: ${yes ? yes + ' request' + (yes > 1 ? 's' : '') + ' approved' : 'no raises approved'}${no ? `, ${no} turned down` : ''}.`);
  return res;
}
const obmGot = k => { if (typeof isOwner === 'function' && isOwner()) return ownBudGot(k); const O = typeof state !== 'undefined' && state && state.x && state.x.obm; if (!O || !isGM()) return 0; const yr = state.phase === 'offseason' ? state.season + 1 : state.season; return O.yr === yr ? O.got[k] || 0 : 0; };
// Holdouts and trade demands on your roster: a star who's underpaid with little time left on his deal may hold out of
// camp (he can't play until you pay him, trade him or he reports); an unhappy veteran may demand a trade.
function hldCamp() {
  if (!isGM()) return; const yr = state.season + 1; const h = q => x2h('hld:' + yr + ':' + q); let n = 0, m = 0;
  state.roster.filter(p => p.k && p.ovr >= 82 && p.k.yrs <= 2 && !p.hold).sort((a, b) => b.ovr - a.ovr).forEach(p => { if (n >= 2) return; const under = (p.k.apy || capHit(p)) < pValue(p) * 0.75; if (under && h('h' + p.id) < 0.45) { n++; p.hold = { yr, wks: 0, ask: r2(Math.max(pValue(p) * 1.1, (p.k.apy || 0) * 1.3)) }; addNews(`${p.pos} ${p.n} holds out of training camp. He wants a new deal worth about ${fmM(p.hold.ask)} a year.`, 'bad'); } });
  state.roster.filter(p => p.k && p.ovr >= 74 && p.age >= 26 && !p.hold && !p.tdem).forEach(p => { if (m >= 1) return; const di = (state.depth[p.pos] || []).indexOf(p.id); const benched = di >= (START[p.pos] || 1); if ((benched || rapOf(p) < 45) && h('d' + p.id) < 0.3) { m++; p.tdem = { yr }; rapAdj(p, -4, 'Wants out'); addNews(`${p.pos} ${p.n} asks to be traded.`, 'bad'); } });
}
function hldWeek() {
  if (!isGM()) return; state.roster.forEach(p => {
    if (p.hold) { p.hold.wks++; mv('morale', -0.6); if (x2h('hldw:' + state.season + ':' + state.week + ':' + p.id) < 0.12 + p.hold.wks * 0.1) { rapAdj(p, -8, 'Reported without a new deal'); addNews(`${p.n} ends his holdout and reports without a new deal.`); delete p.hold; } }
    if (p.tdem) { mv('morale', -0.3); if (state.week > 9 && !p.tdem.late) { p.tdem.late = true; rapAdj(p, -6, 'Wasn\'t traded'); addNews(`The trade deadline passes and ${p.n} is still here. He isn't happy about it.`); } }
  });
}
function hldPay(pid) { const p = P(pid); if (!p || !p.hold) return false; const ask = p.hold.ask; signOwn(p, ask, 4, true, 'back'); delete p.hold; rapAdj(p, 6, 'Got paid'); return true; }
function hldTalk(pid) { const p = P(pid); if (!p || !p.tdem) return 'none'; if (p.tdem.talked) return 'done'; p.tdem.talked = true; if (x2h('hldt:' + p.id + ':' + state.season) < 0.45 + (rapOf(p) - 50) / 120) { delete p.tdem; rapAdj(p, 5, 'You talked him out of it'); addNews(`${p.n} withdraws his trade request after a talk with the GM.`); return 'ok'; } rapAdj(p, -3, 'Still wants out'); return 'no'; }
function hldSeasonEnd() { state.roster.forEach(p => { if (p.tdem && p.tdem.yr <= state.season) delete p.tdem; if (p.hold && p.hold.yr <= state.season) delete p.hold; }); }

/* ===================== 19-22. PLAYER CAREER ===================== */
// 20. A new head coach at your school (or your NFL club): his system, his first meeting with you, and your role.
const NCS_SYS = { pro: ['QB', 'TE', 'OL'], spread: ['QB', 'RB', 'WR'], air: ['QB', 'WR', 'TE'], power: ['RB', 'OL', 'TE', 'DT'], wc: ['WR', 'TE', 'RB'] };
const NCS_DEF = { d43: ['DE', 'DT', 'LB'], d34: ['LB', 'DE', 'S'], blitz: ['LB', 'CB', 'S'], zone: ['CB', 'S', 'LB'] };
function ncsSync() {
  if (!xCareer()) return null; const X_ = CX(); const r = cs.off && cs.off.review; const mine = r && r.coach;
  if (mine && (!X_.nc || X_.nc.y !== cs.year)) { const k = Object.keys(NCS_SYS)[Math.floor(cx2h('ncs:' + cs.year) * 5)]; const dk = Object.keys(NCS_DEF)[Math.floor(cx2h('ncd:' + cs.year) * 4)]; const fit = NCS_SYS[k].includes(cs.p.pos) || NCS_DEF[dk].includes(cs.p.pos); X_.nc = { y: cs.year, n: mine.now, old: mine.old, why: mine.why, sys: k, dsys: dk, fit, done: null, lvl: 'col' }; if (fit) cs.p.trust = clamp(cs.p.trust + 4, 0, 100); }
  return X_.nc && X_.nc.y === cs.year ? X_.nc : null;
}
const NCS_CH = { buy: ['Buy in at the first meeting', 'Tell him you\'re all in. He remembers who did.'], ask: ['Ask where you stand', 'Straight talk about your role in his system.'], open: ['Keep your options open', 'Let him know you\'ll see how it goes.'] };
function ncsChoose(k) { const N = ncsSync(); if (!N || N.done || !NCS_CH[k]) return null; N.done = k; const d = { buy: 8, ask: 3, open: -4 }[k]; cs.p.trust = clamp(cs.p.trust + d, 0, 100); cNews(k === 'buy' ? `${cName(cs.p)} buys in with new head coach ${N.n}.` : k === 'ask' ? `${cName(cs.p)} sits down with new head coach ${N.n} about his role.` : `${cName(cs.p)} is keeping his options open under new head coach ${N.n}.`, k === 'open' ? '' : 'win'); if (k === 'open' && cs.lvl === 'col') cs.p.portalLook = cs.year; return d; }
// 21. Offseason training: four drills you play yourself, each once an offseason, for skill points.
const TRN = { ladder: ['Footwork ladder', 'pos', 'Hit the cone that lights up, as fast as you can.'], weights: ['Weight room', 'bench', 'Stop the bar in the green zone. Five reps.'], sprints: ['Sprint work', 'forty', 'Tap as fast as you can for four seconds.'], film: ['Film room', 'talk', 'Three questions from the coaches.'] };
const trnOpen = () => xCareer() && ['hsoff', 'coloff', 'nfloff'].includes(cs.phase);
function trnStore() { const X_ = CX(); if (!X_.trn || X_.trn.y !== cs.year) X_.trn = { y: cs.year, done: {} }; return X_.trn; }
function trnFinish(k, perf) { if (!trnOpen() || !TRN[k]) return null; const S = trnStore(); if (S.done[k] != null) return null; const q = clamp(+perf || 0, 0, 1); const xp = typeof grantXP === 'function' ? grantXP(1 + Math.round(q * 3), 'Offseason training') : 0; S.done[k] = { q: r2(q), xp }; return S.done[k]; }
// 22. Jersey retirement night: a great career gets the school (and an NFL club) to retire your number.
function jrnList() {
  if (!xCareer() || !['retired', 'done'].includes(cs.phase)) return []; const X_ = CX(); if (typeof djOf === 'function') djOf(X_); /* a v9.31–v9.34 decision journal used this key */ if (X_.jr) return X_.jr; const p = cs.p; const aw = p.awards || []; const out = [];
  const col = p.seasons.filter(s => s.lvl === 'col'); const colAw = aw.filter(a => a.lvl === 'col'); const big = colAw.filter(a => /Heisman|All-American|Player of the Year|Award/.test(a.a));
  if (col.length && (colAw.some(a => /Heisman/.test(a.a)) || big.length >= 2)) { const by = {}; col.forEach(s => { by[s.team] = (by[s.team] || 0) + 1; }); const tm = Object.keys(by).sort((a, b) => by[b] - by[a])[0]; out.push({ lvl: 'col', tm, name: cTeamName(tm), num: p.num, why: (colAw.find(a => /Heisman/.test(a.a)) || big[0]).a, seen: false }); }
  if (cs.nfl && cs.phase === 'retired') { const sc = typeof nflHofScore === 'function' ? nflHofScore() : 0; const nAw = aw.filter(a => a.lvl === 'nfl'); if (sc >= 75 || nAw.filter(a => /MVP|Player of the Year/.test(a.a)).length) { const by = {}; p.seasons.filter(s => s.lvl === 'nfl').forEach(s => { by[s.team] = (by[s.team] || 0) + 1; }); const tm = Object.keys(by).sort((a, b) => by[b] - by[a])[0]; if (tm) out.push({ lvl: 'nfl', tm, name: nflName(tm), num: p.num, why: sc >= 110 ? 'A first-ballot Hall of Fame career' : nAw.length ? nAw.length + ' honors in the NFL' : 'A Hall of Fame career', seen: false }); } }
  X_.jr = out; out.forEach(j => cNews(`${j.name} will retire ${cName(p)}'s number ${j.num}.`, 'big')); return out;
}
function jrnScript(j) {
  const p = cs.p; const nm = cName(p); const yrs = p.seasons.filter(s => s.lvl === j.lvl && s.team === j.tm).map(s => s.year); const h = q => cx2h('jrn:' + j.lvl + ':' + q);
  return [{ k: 'open', txt: `A full house at ${j.lvl === 'nfl' ? 'the stadium' : j.name}. Tonight they retire number ${j.num}.` },
    { k: 'pick', txt: `${nm} wore it ${yrs.length ? 'from ' + Math.min(...yrs) + ' to ' + Math.max(...yrs) : 'for years'}. ${j.why}.` },
    { k: 'break', txt: x2pick(['The video board runs the highlights. The crowd is on its feet.', 'Old teammates walk out of the tunnel, one by one.', 'His family is at midfield. So is his old high school coach.'], h('a')) },
    { k: 'pick', txt: x2pick(['The banner rises to the rafters: ' + p.last + ' ' + j.num + '.', 'Number ' + j.num + ' goes up on the stadium wall, next to the legends.', 'The jersey is framed and handed to him at midfield.'], h('b')) },
    { k: 'sign', txt: `No one at ${j.name} will wear number ${j.num} again.`, say: `${nm}: "${x2pick(['This place made me. Thank you.', 'I gave it everything I had. You gave it right back.', 'To every teammate I ever had: this is yours too.'], h('c'))}"` }];
}

/* ===================== 23-25. THE COMMISSIONER ===================== */
// 23. The realignment map: where every school is, colored by conference (the same moves as the League & rules page).
const RM_ST = { AL: [-86.8, 32.8], AK: [-150, 61.4], AZ: [-111.7, 34.3], AR: [-92.4, 34.9], CA: [-119.4, 37.2], CO: [-105.5, 39], CT: [-72.7, 41.6], DE: [-75.5, 39], DC: [-77, 38.9], FL: [-81.7, 28.6], GA: [-83.4, 32.7], HI: [-157.8, 21.3], ID: [-114.6, 44.4], IL: [-89.2, 40], IN: [-86.3, 39.9], IA: [-93.5, 42.1], KS: [-98.4, 38.5], KY: [-85.3, 37.5], LA: [-91.9, 31], ME: [-69.2, 45.4], MD: [-76.7, 39], MA: [-71.8, 42.3], MI: [-84.7, 43.6], MN: [-94.3, 46.3], MS: [-89.7, 32.7], MO: [-92.5, 38.4], MT: [-109.6, 47], NE: [-99.8, 41.5], NV: [-116.6, 39.3], NH: [-71.6, 43.7], NJ: [-74.7, 40.2], NM: [-106.1, 34.4], NY: [-75.5, 42.9], NC: [-79.4, 35.6], ND: [-100.5, 47.5], OH: [-82.8, 40.3], OK: [-97.5, 35.6], OR: [-120.6, 44], PA: [-77.8, 40.9], RI: [-71.5, 41.7], SC: [-80.9, 33.9], SD: [-100.2, 44.4], TN: [-86.3, 35.9], TX: [-99.3, 31.5], UT: [-111.7, 39.3], VT: [-72.7, 44.1], VA: [-78.8, 37.5], WA: [-120.5, 47.4], WV: [-80.6, 38.6], WI: [-89.8, 44.6], WY: [-107.5, 43] };
function rmapPos(id) {
  const st = typeof TEAM_STATE !== 'undefined' ? TEAM_STATE[id] : null; let c = RM_ST[st]; const h = q => hmix('rm:' + id + ':' + q);
  if (!c) c = [-118 + h('x') * 46, 30 + h('y') * 16]; if (st === 'HI') return { x: 0.12 + (h('j') - 0.5) * 0.02, y: 0.9, inset: 'HI' }; if (st === 'AK') return { x: 0.06, y: 0.84, inset: 'AK' };
  const x = (c[0] + 125) / 58, y = (49.5 - c[1]) / 25; return { x: clamp(x + (h('jx') - 0.5) * 0.035, 0.01, 0.99), y: clamp(y + (h('jy') - 0.5) * 0.045, 0.02, 0.98) };
}
function rmapData() { if (!isComm() || isPro()) return null; const c = commOf(); const pend = {}; (c.moves || []).forEach(m => { pend[m.tid] = m.to; }); return Object.keys(CONFS).filter(k => k !== 'FCS').map(k => ({ k, name: CONFS[k].name, short: confShort(k), teams: Object.values(state.teams).filter(t => !isFCS(t.id) && (pend[t.id] || t.conf) === k).map(t => Object.assign({ id: t.id, name: t.name, from: pend[t.id] ? t.conf : null }, rmapPos(t.id))) })).filter(x => x.teams.length || CONFS[x.k]); }
// 24. A strike in the middle of a season: when the union is angry (or the labor deal has run out), the players walk
// out. Replacement players finish the games; every week costs revenue and fans until you settle.
function stkWeek() {
  if (!isComm() || state.phase === 'offseason') return; const c = cm2(); const wk = state.week; const S = c.strike;
  if (S && S.on) { S.wks++; cmFx({ fan: -2, rev: -0.35, own: -1, integ: -1 }); if (!c.items.some(x => x.kind === 'strike')) stkPost(); return; }
  const lateWk = isPro() ? 12 : 10; if (wk < 3 || wk > lateWk || (S && S.s >= state.season - 2)) return;
  const expired = c.cba && c.cba.until < state.season; const angry = c.m.union <= 30 || (expired && c.m.union <= 46);
  if (!angry || cmH('strike') > (expired ? 0.3 : 0.18)) return;
  c.strike = { s: state.season, wk0: wk, wks: 0, on: true }; c.strikes = (c.strikes || 0) + 1; cmFx({ fan: -4, union: 2, own: -2 });
  cmLog(isPro() ? `The players strike. Replacement players will take the field until a deal is done.` : `The athletes walk out. Walk-ons and replacement players will finish the games until a deal is done.`, true); stkPost();
}
function stkPost() { const c = cm2(); const S = c.strike; return cmPost({ kind: 'strike', title: `The ${isPro() ? 'strike' : 'walkout'}: week ${S.wks + 1}`, txt: `${isPro() ? 'The players\' union' : 'The athletes'} want${isPro() ? 's' : ''} ${isPro() ? 'a bigger share of revenue and safer practices' : 'a share of the money and a say in the schedule'}. Every week costs the league money and fans.`, opts: [['meet', 'Meet them halfway', 'Most likely to end it. Owners give up the most.'], ['mediator', 'Bring in a mediator', 'A fair process; it may take a while.'], ['firm', 'Hold firm', 'Owners love it. Fans and players don\'t.']], def: 2 }); }
function stkResolve(it, k) {
  const c = cm2(); const S = c.strike; if (!S || !S.on) return 'The strike is already over.'; const p = { meet: 0.62, mediator: 0.45, firm: 0.2 }[k] || 0.2;
  cmFx({ meet: { union: 6, own: -4 }, mediator: { integ: 1, rev: -0.1 }, firm: { own: 3, union: -5, fan: -2 } }[k] || {});
  if (cmH('stk' + it.id) < p + S.wks * 0.06) { S.on = false; c.cba = { until: state.season + 5, share: k === 'meet' ? 50 : 48.5 }; cmFx({ fan: 3, union: k === 'firm' ? -3 : 4 }); cmLog(`The ${isPro() ? 'strike' : 'walkout'} is over after ${S.wks || 1} week${S.wks === 1 ? '' : 's'}. A new deal runs through ${state.season + 5}.`, true); return 'Deal done. The players are back.'; }
  return k === 'firm' ? 'You held firm. The players stay out.' : 'No deal yet. The talks go on.';
}
// 25. The award ballot: the commissioner casts the deciding vote for the season's top award; the feed reacts.
function votPost() {
  if (!isComm()) return; const c = cm2(); if (c.voteS === state.season) return; let cands = [];
  if (!isPro()) { const aw = (state.awards || []).find(a => a.s === state.season); cands = aw && aw.heis ? aw.heis.slice(0, 4).map(x => ({ n: x.n, pos: x.pos, tm: x.tm })) : []; }
  else { const e = lgHistOf().nfl.find(x => x.s === state.season); if (!e || !e.mvp) return; const list = typeof awardCands === 'function' ? awardCands().filter(x => ['QB', 'RB', 'WR', 'TE'].includes(x.pos) || x.sc > 70).slice(0, 4).map(x => ({ n: x.n, pos: x.pos, tm: x.tm })) : []; cands = [e.mvp].concat(list.filter(x => x.n !== e.mvp.n)).slice(0, 4); }
  if (cands.length < 2) return; c.voteS = state.season; const aw = isPro() ? 'MVP' : 'Heisman Trophy';
  cmPost({ kind: 'ballot', agenda: true, title: `Your ${aw} ballot`, txt: `The voters are split. As commissioner, you cast the deciding vote. ${cands[0].n} leads the statistics.`, opts: cands.map((x, i) => ['v' + i, `${x.n}, ${x.pos}, ${teamName(x.tm)}`, i === 0 ? 'The numbers say he earned it.' : '']), def: 0, data: { cands, aw } });
}
function votResolve(it, k) {
  const d = it.data; const i = +String(k).slice(1); const pick = d.cands[i]; if (!pick) return '';
  if (!isPro()) { const aw = (state.awards || []).find(a => a.s === state.season); if (aw && aw.heis) { const j = aw.heis.findIndex(x => x.n === pick.n && x.tm === pick.tm); if (j > 0) { const [w] = aw.heis.splice(j, 1); aw.heis.unshift(w); } } const e = lgHistOf().col.find(x => x.s === state.season); if (e) e.heis = { n: pick.n, pos: pick.pos, tm: pick.tm }; }
  else { const e = lgHistOf().nfl.find(x => x.s === state.season); if (e) e.mvp = { n: pick.n, pos: pick.pos, tm: pick.tm }; }
  const fav = i === 0; cmFx(fav ? { fan: 1, integ: 1 } : { fan: -3, integ: -2, own: -1 }); cmLog(`${pick.n} wins the ${d.aw}${fav ? '' : ', and the vote is a shock'}.`, true);
  const o = { s: state.season, wk: state.week, mood: 50, cat: 'news' }; const v = { X: pick.n, Y: d.cands[0].n, A: d.aw };
  for (let n = 0; n < (fav ? 2 : 4); n++) feedPost(fav ? 'voteOk' : 'voteBad', v, Object.assign({}, o, { big: n === 0 }));
  return `${pick.n} wins it.`;
}
Object.assign(FEED_T, {
  voteOk: { stats: ['{X} for the {A}. The right call. The numbers were never close.', 'Correct. {X} was the best player in the sport.'], diehard: ['{X}! Deserved.', 'Good to see the commissioner get one right. {X}.'], analyst: ['{X} wins the {A}. Hard to argue.'], casual: ['congrats {X}'] },
  voteBad: { stats: ['{Y} had the better season and it isn\'t close. #Robbed', 'Explain to me how {X} wins the {A} over {Y}. I\'ll wait.'], troll: ['The commissioner just handed the {A} to {X}. Unreal.', 'Rigged. Next question. #Robbed'], diehard: ['{Y} got robbed.', 'This is why nobody trusts the league office. {X}?'], analyst: ['A surprising {A} vote. {Y} led every major category.'], meme: ['{Y} watching {X} take the {A}: 😐'] },
  pgShow: { stats: ['Our pick record vs. the TV guys this year: better. #Pregame', 'The hosts picked {X}. The numbers agree.'], diehard: ['They better not pick against us again.', 'Pregame show was fire today.'], troll: ['Lou Hargrove picking with his heart again lol', 'Dana Ruiz upset special incoming'] },
  holdout: { diehard: ['Pay {X}. Just pay him.', 'We need {X} on the field. Get it done.'], doomer: ['Holdout season. Here we go again.', '{X} is gone by the deadline, mark it.'], stats: ['{X} is worth every penny of that ask. Look at the snaps.'], troll: ['lol {X} wants out. Can\'t blame him.'] },
  jersey: { diehard: ['Number {X} to the rafters. Legend.', 'Tears in my eyes. Number {X} forever.'], oldtimer: ['I saw his first game. Tonight I saw his number go up. {X}.'], casual: ['jersey retirement night was so good'] },
});

/* ===================== HOOKS: where these plug into the season ===================== */
function x2Week(wk, mg) {
  if (typeof state === 'undefined' || !state) return;
  pgScore(wk); fpAdd(fpBuildAD(wk, mg));
  if (mg && mg.done && !isComm()) { const me = mg.h === ME ? 0 : 1; const won = me === 0 ? mg.hs > mg.as : mg.as > mg.hs; const opp = me === 0 ? mg.a : mg.h;
    if (won && mg.oppR) scnEvent('rankedWin'); if (won && !isPro() && rivalOf(opp)) scnEvent('rivalWin');
    if (bizOn() && mg.h === ME && !mg.neutral) { const t = gprTier(mg.id); if (t === 'value') mv('fan', 1); else if (t === 'big' && !(rivalOf(opp) || mg.oppR)) mv('fan', -2); } }
  if (bizOn()) dstWeek(); if (isCoach()) mtgWeek(); if (isGM()) { hldWeek(); tbkCalls(false); } if (isComm()) stkWeek();
  if (scnOf()) scnCheck(false); pgEnsure();
}
function x2Offseason() {
  if (typeof state === 'undefined' || !state) return;
  if (bizOn()) { ospSeason(); tvnOffseason(); } tpkOffseason(); if (isCoach()) astOffseason(); if (isComm()) votPost(); if (isPro()) hldSeasonEnd();
  if (scnOf()) scnCheck(true);
}
function cx2Week(wk) {
  const g = cs.ss && cs.ss.games ? cs.ss.games[cs.ss.games.length - 1] : null; const rec = g && g.wk === wk ? g : null;
  pgScore(wk); fpAdd(fpBuildC(rec)); if (rec) s60AddCareer(rec); if (scnOf()) scnCheck(false); pgEnsure();
}
{
  const _xw = xWeek; xWeek = function (wk, mg) { _xw(wk, mg); try { x2Week(wk, mg); } catch (e) { if (typeof console !== 'undefined') console.error('extras 2', e); } };
  const _xo = xOffseason; xOffseason = function () { _xo(); try { x2Offseason(); } catch (e) { if (typeof console !== 'undefined') console.error('extras 2', e); } };
  const _cw = cxWeek; cxWeek = function (wk) { _cw(wk); try { cx2Week(wk); } catch (e) { if (typeof console !== 'undefined') console.error('career extras 2', e); } };
  // each of your games: the opponent's rank before kickoff, the playbook, and the owner's staff budget
  const _cs = createSim; createSim = function (g, opts) {
    const sim = _cs(g, opts);
    try { if (sim.mSide >= 0) { if (!isPro() && g.oppR == null) g.oppR = rankOf(sim.oppId) || 0; const b = pbkBonus(); if (b) sim.F[sim.mSide].off += b; const st = obmGot('staff'); if (st) { sim.F[sim.mSide].off += 0.35 * st; sim.F[sim.mSide].def += 0.35 * st; } } } catch (e) { }
    return sim;
  };
  // the athletic department in the budget: other sports, department staff, the TV network, the fundraiser
  const _ab = annualBudget; annualBudget = function () { const b = _ab(); if (bizOn()) { b.other = r1(b.other * ospMult()); b.salaries = r1(b.salaries + dstPay()); const tv = tvnYear(); if (tv) b.media = r1(b.media + tv); const f = dstR('fund'); if (f) b.donations = r1(b.donations * (1 + (f - 55) / 300)); } return b; };
  const _td = ticketDemand; ticketDemand = function (opp) { let d = _td(opp); if (bizOn()) { const m = dstR('mkt'); if (m) d += (m - 60) / 900; if (gprNow && gprNow.h === ME) { const k = gprMult(gprNow.id); if (k !== 1) d *= 1 - (k - 1) * 0.55; } } return clamp(d, 0.35, 1.0); };
  const _wf = weeklyFinance; weeklyFinance = function (g) { gprNow = g || null; try { return _wf(g); } finally { gprNow = null; } };
  const _bm = bizGameMoney; bizGameMoney = function (g) { let v = _bm(g); if (bizOn() && g && g.h === ME && !g.neutral && g.att) { const m = gprMult(g.id); if (m !== 1) v += g.att * state.fin.ticket * (m - 1) / 1e6 * diff().money; } return v; };
  // the GM's desk: holdouts at camp, the facility budget, the travel budget
  const _camp = proCamp; proCamp = function () { _camp(); try { hldCamp(); } catch (e) { } };
  const _pd = proDevelop; proDevelop = function (p, mine) { let d = _pd(p, mine); if (mine) { const f = obmGot('fac'); if (f && p.age <= 26 && hmix('obmd:' + state.season + ':' + p.id) < 0.45) { const b = p.ovr; p.ovr = clamp(p.ovr + f, 40, 99); if (p.ovr > p.pot) p.pot = p.ovr; d += p.ovr - b; } } return d; };
  const _inj = bizInjF; bizInjF = function () { let f = _inj(); const t = obmGot('travel'); if (t) f *= t > 0 ? 0.85 : 1.15; return f; };
  // the commissioner's desk: strikes and the award ballot; team packs in the shared name and color tables
  const _cmr = cmResolve; cmResolve = function (id, k, auto) {
    const c = cm2(); const it = c.items.find(x => x.id === id);
    if (it && (it.kind === 'strike' || it.kind === 'ballot')) { if (!it.opts.some(o => o[0] === k)) return null; c.items = c.items.filter(x => x !== it); if (auto && it.agenda) cmFx({ own: -2 }); return it.kind === 'strike' ? stkResolve(it, k) : votResolve(it, k); }
    return _cmr(id, k, auto);
  };
  const _sync = cmSyncNames; cmSyncNames = function () { _sync(); try { tpkSync(); } catch (e) { } };
  // Player Career: a new NFL head coach after a bad year, and a front-office job after retiring
  const _nes = nflEndSeason; nflEndSeason = function () {
    _nes(); try { const N = cs.nfl; const t = N && N.L && N.L.teams[N.tm]; if (t && t.w <= 6 && cx2h('nflc:' + cs.year) < 0.55) { const nm = x2pick(DST_FN, cx2h('nfn' + cs.year)) + ' ' + x2pick(DST_LN, cx2h('nln' + cs.year)); const k = Object.keys(NCS_SYS)[Math.floor(cx2h('ncs:' + cs.year) * 5)]; const dk = Object.keys(NCS_DEF)[Math.floor(cx2h('ncd:' + cs.year) * 4)]; const fit = NCS_SYS[k].includes(cs.p.pos) || NCS_DEF[dk].includes(cs.p.pos); CX().nc = { y: cs.year, n: nm, old: null, why: 'fired', sys: k, dsys: dk, fit, done: null, lvl: 'nfl' }; cs.p.trust = clamp(45 + (fit ? 4 : 0), 0, 100); cNews(`The ${nflName(N.tm)} fire their head coach after a ${t.w}-${t.l} season. ${nm} takes over.`, 'bad'); } } catch (e) { }
  };
  const _ca = careerAfter; careerAfter = function (k) { if (k !== 'gm') return _ca(k); if (cs.phase !== 'retired' || cs.after) return false; cs.after = 'gm'; cNews(`${cName(cs.p)} moves into the front office.`, 'big'); return true; };
}
// a holdout can't play
{ const _av = avail; avail = function (p) { return _av(p) && !p.hold; }; }

