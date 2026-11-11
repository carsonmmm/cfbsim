/* ===================== PLAYER CAREER: the NFL =====================
 * After the draft a player can turn pro: a rookie contract, 17-game seasons with snap decisions,
 * the playoffs and the Super Bowl, Pro Bowls and All-Pros, contracts, free agency, trades, cuts,
 * aging and retirement. Rosters and schedules come from the career's seed (hrng), so they cost
 * nothing to save and look the same every time. No DOM here. */
const NFL_PHYS = { QB: ['arm', 'mob'], RB: ['spd', 'elu', 'pow'], WR: ['spd', 'rel'], TE: ['spd', 'pow'], CB: ['spd', 'prs'], S: ['spd', 'tkl'], DE: ['bst', 'pow'], LB: ['spd', 'blz'], OL: ['pow', 'ftw'], DT: ['pow', 'bst'], K: ['kpw'], P: ['ppw'] };
const NFL_PEAK = { QB: 31, RB: 26, WR: 28, TE: 29, CB: 27, S: 28, DE: 28, LB: 28, OL: 29, DT: 28, K: 33, P: 33 };
const NFL_TOP_APY = { QB: 55e6, WR: 38e6, DE: 40e6, CB: 30e6, LB: 22e6, S: 21e6, RB: 16e6, TE: 18e6, OL: 28e6, DT: 32e6, K: 6e6, P: 4e6 };
const NFL_MIN = 840000;
const NFL_PO_NAME = { 19: 'Wild Card round', 20: 'Divisional round', 21: 'Conference championships', 22: 'Super Bowl' };
const nflWeekLabel = wk => (wk <= 18 ? 'Week ' + wk : NFL_PO_NAME[wk] || 'Postseason');
const NFL_DIVS = ['East', 'North', 'South', 'West'];
const nflSameDiv = (a, b) => NFL_BY[a].conf === NFL_BY[b].conf && NFL_BY[a].div === NFL_BY[b].div;
function nflYearLabel() { if (!cs.nfl) return 'Rookie'; const y = cs.nfl.yrs + (cs.phase === 'nfloff' ? 0 : 1); return y <= 1 && cs.phase !== 'nfloff' ? 'Rookie' : 'Year ' + y; }

/* ---------- team strength ---------- */
function nflInitPow(year) { const pw = {}; NFL.forEach(t => pw[t.id] = t.p); for (let y = 2027; y <= year; y++) nflDrift(pw, y); return pw; }
function nflDrift(pw, y) { const r = hrng(cs.seed + ':npow:' + y); NFL.forEach(t => { const d = (r() + r() + r() - 1.5) * 9; pw[t.id] = Math.round(clamp(pw[t.id] * 0.62 + 76 * 0.38 + d, 52, 97)); }); }
// unit ratings on the same scale the college game uses, so the game engine needs no changes
function nflStr(id) { const t = cs.nfl.L.teams[id]; return { off: t.off, def: t.def }; }

/* ---------- rosters ----------
 * Each depth slot on each team is held by one player at a time; when his run ends the next man
 * takes the slot. Names, ages and ratings come from the career seed, so a teammate is the same
 * person from one season to the next until he moves on. */
const NFL_DEPTH = { QB: 3, RB: 4, WR: 6, TE: 3, OL: 9, DE: 4, DT: 4, LB: 5, CB: 5, S: 4, K: 1, P: 1 };
const NFL_SLOT = { QB: [2, -7, -11], RB: [1, -3, -7, -10], WR: [2, 1, 0, -5, -8, -11], TE: [1, -5, -9], CB: [1, 0, -4, -8, -11], S: [1, 0, -5, -9], DE: [2, 1, -4, -8], LB: [1, 0, -1, -6, -10], OL: [2, 1, 1, 0, 0, -6, -9, -12], DT: [2, 1, -4, -8], K: [1, -12], P: [1, -12] };
const nflRosterCache = new Map();
function nflRoster(tm, year) {
  const key = tm + '@' + year + '@' + cs.seed; if (nflRosterCache.has(key)) return nflRosterCache.get(key);
  const pw = (cs.nfl && cs.nfl.L && cs.nfl.L.year === year && cs.nfl.L.teams[tm]) ? cs.nfl.L.teams[tm].pow : (cs.nfl && cs.nfl.pow ? cs.nfl.pow[tm] : 76);
  const base = 84 + (pw - 76) * 0.28; const list = [];
  Object.entries(NFL_DEPTH).forEach(([pos, n]) => {
    for (let i = 0; i < n; i++) {
      // walk this slot's history in runs of 2-9 years until the run covering `year`
      let start = 2008, k = 0, r = null;
      for (; ; k++) { r = hrng(cs.seed + ':nr:' + tm + pos + i + ':' + k); const len = 2 + Math.floor(r() * 8); if (year < start + len) break; start += len; }
      const exp = year - start; const age0 = 22 + Math.floor(r() * 4); const slotOff = (NFL_SLOT[pos] || [0, -5, -9, -12, -14, -16, -18, -20, -22])[i] ?? -12; // 0 is a real offset (B11)
      const curve = Math.min(exp, 3) * 1.6 - Math.max(0, age0 + exp - 30) * 1.4;
      const ovr = Math.round(clamp(base + slotOff + hgauss(r) * 2.6 + curve - 2.5, 55, 99));
      list.push({ id: 'n' + tm + pos + i + '-' + k, n: hpick(r, FIRST) + ' ' + hpick(r, LAST), pos, num: 1 + Math.floor(r() * 99), age: age0 + exp, exp, cls: exp ? 'Yr ' + (exp + 1) : 'Rookie', ovr });
    }
  });
  list.sort((a, b) => b.ovr - a.ovr);
  if (nflRosterCache.size > 200) nflRosterCache.clear();
  nflRosterCache.set(key, list); return list;
}
// draft capital: teams give high picks a longer look early on
function nflDraftCapital() { const n = cs.nfl; if (!n || !n.draft || n.yrs > 1 || n.draft.udfa || n.tm !== n.draft.tm) return 0; return n.draft.round === 1 ? 2.5 : n.draft.round === 2 ? 1.2 : n.draft.round === 3 ? 0.5 : 0; }

/* ---------- the season ---------- */
function nflNewLeague(year) {
  const pw = cs.nfl.pow; const r = hrng(cs.seed + ':nstr:' + year);
  const L = { year, week: 1, gid: 0, teams: {}, games: [], seeds: null, champ: null, runner: null, awards: null };
  NFL.forEach(t => { const p = pw[t.id]; const tilt = (r() - 0.5) * 6; L.teams[t.id] = { id: t.id, w: 0, l: 0, pf: 0, pa: 0, dw: 0, dl: 0, cw: 0, cl: 0, pow: p, off: r1(93 + (p - 76) * 0.34 + tilt), def: r1(93 + (p - 76) * 0.34 - tilt) }; });
  nflSchedule(L); return L;
}
// 17 games in 18 weeks: one bye per team (weeks 6-13), at most two games against a division rival
// and one against anyone else. Each week is paired at random with a few retries.
function nflSchedule(L) {
  const r = hrng(cs.seed + ':nsch:' + L.year); const ids = NFL.map(t => t.id);
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const byeOrder = shuf(ids.slice()); const bye = {}; byeOrder.forEach((id, i) => bye[id] = 6 + Math.floor(i / 4));
  const pk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  for (let attempt = 0; attempt < 80; attempt++) {
    const met = {}; const home = {}; ids.forEach(id => home[id] = 0); const games = []; let ok = true;
    for (let wk = 1; wk <= 18 && ok; wk++) {
      const pool = ids.filter(id => bye[id] !== wk); let found = null;
      for (let t = 0; t < 60 && !found; t++) {
        const left = shuf(pool.slice()); const pairs = []; let fail = false;
        while (left.length) {
          const a = left.shift(); const cand = left.filter(b => (met[pk(a, b)] || 0) < (nflSameDiv(a, b) ? 2 : 1));
          if (!cand.length) { fail = true; break; }
          let best = null, bs = -1; cand.forEach(b => { const s = (nflSameDiv(a, b) ? (wk >= 10 ? 2.4 : 1.5) : NFL_BY[a].conf === NFL_BY[b].conf ? 1.3 : 1) * (0.4 + r()); if (s > bs) { bs = s; best = b; } });
          left.splice(left.indexOf(best), 1); pairs.push([a, best]);
        }
        if (!fail) found = pairs;
      }
      if (!found) { ok = false; break; }
      found.forEach(([a, b]) => { met[pk(a, b)] = (met[pk(a, b)] || 0) + 1; const h = home[a] < home[b] ? a : home[b] < home[a] ? b : (r() < 0.5 ? a : b); const aw = h === a ? b : a; home[h]++; games.push({ id: L.year + 'n' + (++L.gid), wk, h, a: aw, done: false, neutral: false, type: 'reg', div: nflSameDiv(a, b) }); });
    }
    if (ok) { L.games = games; return; }
    L.gid = 0;
  }
  // practically unreachable; a looser draw keeps the season playable
  const games = []; for (let wk = 1; wk <= 18; wk++) { const pool = shuf(ids.filter(id => bye[id] !== wk)); for (let i = 0; i < pool.length; i += 2) games.push({ id: L.year + 'n' + (++L.gid), wk, h: pool[i], a: pool[i + 1], done: false, neutral: false, type: 'reg', div: nflSameDiv(pool[i], pool[i + 1]) }); }
  L.games = games;
}
function nflApply(L, g) {
  g.done = true; const hw = g.hs > g.as; const H = L.teams[g.h], A = L.teams[g.a];
  [[H, g.hs, g.as, hw], [A, g.as, g.hs, !hw]].forEach(([t, us, them, win]) => {
    if (g.type !== 'reg') return; t.pf += us; t.pa += them; if (win) t.w++; else t.l++;
    if (g.div) { if (win) t.dw++; else t.dl++; } if (NFL_BY[g.h].conf === NFL_BY[g.a].conf) { if (win) t.cw++; else t.cl++; }
  });
}
const nflWinner = g => (g.hs > g.as ? g.h : g.a);
const nflRank = (a, b) => (b.w - a.w) || ((b.pf - b.pa) - (a.pf - a.pa)) || (b.pow - a.pow);
function nflSimWeek(L, wk) { L.games.filter(g => g.wk === wk && !g.done).forEach(g => { fastGame(L, g); nflApply(L, g); }); }
// seven teams a conference: four division winners, then three wild cards
function nflSeedsOf(L) {
  const out = {};
  ['AFC', 'NFC'].forEach(cf => { const ts = Object.values(L.teams).filter(t => NFL_BY[t.id].conf === cf); const divW = NFL_DIVS.map(dv => ts.filter(t => NFL_BY[t.id].div === dv).sort(nflRank)[0]).sort(nflRank); const wc = ts.filter(t => !divW.includes(t)).sort(nflRank).slice(0, 3); out[cf] = divW.concat(wc).map(t => t.id); });
  return out;
}
const seedOf = (L, id) => { for (const cf of ['AFC', 'NFC']) { const i = (L.seeds && L.seeds[cf] || []).indexOf(id); if (i >= 0) return i + 1; } return 0; };
function nflPoGame(L, wk, a, b, name, neutral) { const sa = seedOf(L, a), sb = seedOf(L, b); const h = neutral ? (L.year % 2 ? a : b) : sa <= sb ? a : b; const aw = h === a ? b : a; const g = { id: L.year + 'n' + (++L.gid), wk, h, a: aw, done: false, neutral: !!neutral, type: 'po', name }; L.games.push(g); return g; }
function nflAfterWeek(L, wk) {
  if (wk === 18) {
    L.seeds = nflSeedsOf(L);
    ['AFC', 'NFC'].forEach(cf => { const S = L.seeds[cf]; [[2, 7], [3, 6], [4, 5]].forEach(([x, y]) => nflPoGame(L, 19, S[x - 1], S[y - 1], cf + ' Wild Card')); });
  } else if (wk === 19 || wk === 20) {
    ['AFC', 'NFC'].forEach(cf => {
      const S = L.seeds[cf]; const alive = wk === 19 ? [S[0]].concat(L.games.filter(g => g.wk === 19 && NFL_BY[g.h].conf === cf).map(nflWinner)) : L.games.filter(g => g.wk === 20 && NFL_BY[g.h].conf === cf).map(nflWinner);
      const bySeed = alive.slice().sort((a, b) => seedOf(L, a) - seedOf(L, b));
      if (wk === 19) { nflPoGame(L, 20, bySeed[0], bySeed[3], cf + ' Divisional'); nflPoGame(L, 20, bySeed[1], bySeed[2], cf + ' Divisional'); }
      else nflPoGame(L, 21, bySeed[0], bySeed[1], cf + ' Championship');
    });
  } else if (wk === 21) {
    const w = L.games.filter(g => g.wk === 21).map(nflWinner); const afc = w.find(id => NFL_BY[id].conf === 'AFC'), nfc = w.find(id => NFL_BY[id].conf === 'NFC');
    nflPoGame(L, 22, afc, nfc, 'Super Bowl', true);
  } else if (wk === 22) { const sb = L.games.find(g => g.wk === 22); if (sb && sb.done) { L.champ = nflWinner(sb); L.runner = sb.h === L.champ ? sb.a : sb.h; } }
  L.week = wk + 1;
}
function nflAlive(L, id) { if (L.champ) return false; if (L.week <= 18) return true; if (!seedOf(L, id)) return false; return !L.games.some(g => g.type === 'po' && g.done && (g.h === id || g.a === id) && nflWinner(g) !== id); }
function nflMyGame() { const N = cs.nfl.L; const tm = cs.nfl.tm; return N.games.find(g => g.wk === cs.week && !g.done && (g.h === tm || g.a === tm)); }
function nflGameSpec() {
  const g = nflMyGame(); if (!g) return null; const N = cs.nfl.L; const tm = cs.nfl.tm;
  const myHome = g.h === tm || (g.neutral && g.h === tm); const opp = g.h === tm ? g.a : g.h; const o = N.teams[opp];
  const big = g.type !== 'reg' || g.div || (cs.week >= 10 && o.w + o.l > 0 && o.w / (o.w + o.l) >= 0.6);
  return { lvl: 'nfl', wk: g.wk, home: g.h === tm, neutral: !!g.neutral, name: g.name || '', type: g.type, ids: [g.h, g.a], names: [nflName(g.h), nflName(g.a)], base: [nflStr(g.h), nflStr(g.a)], oppTid: opp, lgId: g.id, big: !!big, myHome };
}
function nflSeasonOver() { const N = cs.nfl.L; if (cs.week <= 18) return false; if (nflMyGame()) return false; if (!N.games.some(g => !g.done) && N.champ) return true; return !nflAlive(N, cs.nfl.tm); }
function nflFinish(L) { let guard = 0; while (!L.champ && guard++ < 30) { const wk = L.week; nflSimWeek(L, wk); nflAfterWeek(L, wk); } }
function nflPayWeek() { const c = cs.nfl.contract; const pay = Math.round((c.apy * c.yrs - (c.bonus || 0)) / c.yrs / 18); if (pay > 0) { cs.p.bank += Math.round(pay * (1 - agentFee())); cs.p.earned += pay; cs.nfl.earn = (cs.nfl.earn || 0) + pay; } if (cs.week === 18) cs.nilLog.unshift({ y: cs.year, txt: `Salary, ${nflName(cs.nfl.tm)} (${cs.year} season)`, amt: pay * 18 }); }

/* ---------- turning pro ---------- */
function rookieDeal(pick) {
  const yrs = pick ? 4 : 3;
  const apy = pick ? interp([[1, 10.8e6], [5, 8.6e6], [10, 6.4e6], [20, 4.6e6], [32, 3.5e6], [33, 2.4e6], [64, 1.6e6], [100, 1.25e6], [150, 1.1e6], [257, 1.0e6]], pick) : 960000;
  const share = pick ? interp([[1, 0.66], [32, 0.5], [64, 0.3], [100, 0.18], [257, 0.06]], pick) : 0.02;
  return { yrs, apy: Math.round(apy / 1000) * 1000, bonus: Math.round(apy * yrs * share / 1000) * 1000 };
}
function nflStart() {
  if (cs.phase !== 'done' || !cs.done || !cs.done.draft || cs.nfl) return false;
  const d = cs.done.draft; const tm = nflId(d.team) || NFL[Math.floor(hash(cs.seed + 'udfa') * 32)].id;
  cs.nfl = { tm, age: 18 + (cs.col ? cs.col.years : 3), yrs: 0, pow: nflInitPow(d.year), contract: null, L: null, hist: [], champs: [], earn: 0, draft: { year: d.year, round: d.round || 0, pick: d.pick || 0, udfa: !!d.udfa, tm }, moves: [] };
  const rd = rookieDeal(d.udfa ? 0 : d.pick);
  cs.nfl.contract = { tm, yrs: rd.yrs, left: rd.yrs, apy: rd.apy, bonus: rd.bonus, kind: d.udfa ? 'udfa' : 'rookie', from: d.year, opt: d.round === 1 && !d.udfa };
  cs.lvl = 'nfl'; cs.year = d.year; cs.p.trust = 50; cs.off = null; cs.portal = null;
  if (rd.bonus) { cs.p.bank += rd.bonus; cs.p.earned += rd.bonus; cs.nfl.earn += rd.bonus; cs.nilLog.unshift({ y: cs.year, txt: `Signing bonus, ${nflName(tm)}`, amt: rd.bonus }); }
  cNews(`${cName(cs.p)} signs his rookie contract with the ${nflName(tm)}: ${rd.yrs} years, ${money(rd.apy * rd.yrs)}${rd.bonus ? `, with a ${money(rd.bonus)} signing bonus` : ''}.`, 'big');
  nflSeasonStart();
  return true;
}
function nflSeasonStart() {
  cs.nfl.L = nflNewLeague(cs.year); nflRosterCache.clear();
  cs.phase = 'nfl'; cs.week = 1; cs.ss = newSS(); cs.p.inj = 0; cs.p.injName = ''; cs.p.injFresh = false;
  const d = myDepth(); cNews(`${cs.year} season: ${cName(cs.p)} opens ${cs.nfl.yrs ? 'year ' + (cs.nfl.yrs + 1) : 'his rookie year'} with the ${nflName(cs.nfl.tm)} as ${roleOf(myShare()).toLowerCase() === 'starter' ? 'a starter' : 'No. ' + (d.rank + 1) + ' on the ' + cs.p.pos + ' depth chart'}.`);
}
function nflNewSeason() {
  cs.nfl.age++; nflDrift(cs.nfl.pow, cs.year); nflSeasonStart();
}

/* ---------- end of a season ---------- */
function nflEndSeason() {
  const N = cs.nfl.L; nflFinish(N);
  const ss = cs.ss; const p = cs.p; const tm = cs.nfl.tm; const t = N.teams[tm];
  const sr = seasonRatio(ss); const e = archiveSeason({ team: tm }); e.age = cs.nfl.age; e.rank = 0;
  const po = N.games.filter(g => g.type === 'po' && (g.h === tm || g.a === tm));
  const lastPo = po[po.length - 1];
  e.post = N.champ === tm ? 'Won the Super Bowl' : lastPo ? { 19: 'Lost in the Wild Card round', 20: 'Lost in the Divisional round', 21: 'Lost in the conference championship', 22: 'Lost the Super Bowl' }[lastPo.wk] : 'Missed the playoffs';
  e.seed = seedOf(N, tm);
  const aw = nflAwards(e, sr);
  if (N.champ === tm) { e.awards.unshift('Super Bowl champion'); p.awards.push({ y: e.year, lvl: 'nfl', a: 'Super Bowl champion' }); }
  cs.nfl.champs.unshift({ year: N.year, champ: N.champ, runner: N.runner, aw: N.awards }); if (cs.nfl.champs.length > 30) cs.nfl.champs.length = 30;
  cs.nfl.hist.push({ year: N.year, tm, w: t.w, l: t.l, seed: e.seed, post: e.post });
  cs.nfl.yrs++; cs.nfl.contract.left--;
  if (cs.nfl.contract.left < 0) cs.nfl.contract.left = 0;
  cs.year = N.year + 1;
  p.inj = 0; p.injName = ''; p.injFresh = false;
  cs.phase = 'nfloff'; cs.week = 0;
  cs.off = { steps: ['nreview', 'nmoney', 'ntrain'], i: 0, review: { year: e.year, e, aw, champ: N.champ, runner: N.runner, post: e.post }, grown: false }; cChgMark();
  cs.nfl.fa = null; cs.nfl.asked = null;
  cNews(`${nflName(N.champ)} win the ${N.year} season's Super Bowl over the ${nflName(N.runner)}.`, N.champ === tm ? 'big' : '');
}
// Season honors. `aw` blends production against a starter's workload, the player's rating and
// the team's record; the league's other winners come from the best teams' rosters.
function nflAwards(e, sr) {
  const N = cs.nfl.L; const p = cs.p; const t = N.teams[cs.nfl.tm]; const starter = starterSeason(cs.ss, p.pos); const rookie = cs.nfl.yrs === 0;
  const off = cSide(p.pos) === 'off';
  const best = Object.values(N.teams).sort(nflRank); const nm = (pos, k) => { const tm = best[k % 8].id; return { n: oppName(tm, pos), tm, pos }; };
  const r = hrng(cs.seed + ':naw:' + N.year);
  const A = { mvp: nm('QB', Math.floor(r() * 4)), opoy: nm(r() < 0.5 ? 'WR' : 'RB', Math.floor(r() * 8)), dpoy: nm(r() < 0.6 ? 'DE' : 'LB', Math.floor(r() * 8)), oroy: nm(pick(['QB', 'WR', 'RB']), 8 + Math.floor(r() * 16)), droy: nm(pick(['DE', 'CB', 'LB']), 8 + Math.floor(r() * 16)) };
  const won = [];
  if (starter && sr != null) {
    const nb = cs.balV >= 2; /* Updated balance (BAL-16): honors are for the league's best, not every good starter */
    const aw = sr + (cOvr(p) - (nb ? 90 : 88)) * 0.03 + (t.w - 8.5) * 0.02 - (nb ? cHonorBar() : 0); /* v9.47: Hard asks more */
    const me = { n: cName(p), tm: cs.nfl.tm, pos: p.pos, me: true };
    if (aw >= (nb ? 1.64 : 1.48)) won.push('First-team All-Pro'); else if (aw >= (nb ? 1.53 : 1.32)) won.push('Second-team All-Pro');
    if (aw >= (nb ? 1.4 : 1.12) || (cOvr(p) >= 93 && sr >= (nb ? 1.05 : 0.95))) won.push('Pro Bowl');
    if (p.pos === 'QB' && aw >= 1.5 && t.w >= 11 && aw > 1.55 + hgauss(r) * 0.1) { won.push('NFL MVP'); A.mvp = me; }
    else if (p.pos !== 'QB' && off && aw >= 1.9 && t.w >= 12 && R() < 0.3) { won.push('NFL MVP'); A.mvp = me; }
    if (off && A.mvp !== me && aw >= 1.55 && aw > 1.62 + hgauss(r) * 0.12) { won.push('Offensive Player of the Year'); A.opoy = me; }
    if (!off && aw >= 1.5 && aw > 1.58 + hgauss(r) * 0.12) { won.push('Defensive Player of the Year'); A.dpoy = me; }
    if (rookie && aw >= 1.1 && aw > 1.18 + hgauss(r) * 0.15) { won.push(off ? 'Offensive Rookie of the Year' : 'Defensive Rookie of the Year'); A[off ? 'oroy' : 'droy'] = me; }
  }
  const sb = N.games.find(g => g.wk === 22); const myLast = cs.ss.games[cs.ss.games.length - 1];
  if (N.champ === cs.nfl.tm && sb && myLast && myLast.wk === 22 && myLast.grade && /^A/.test(myLast.grade) && (p.pos === 'QB' || myLast.grade === 'A+')) { won.push('Super Bowl MVP'); A.sbmvp = { n: cName(p), tm: cs.nfl.tm, pos: p.pos, me: true }; }
  const cash = { 'NFL MVP': 1000000, 'First-team All-Pro': 500000, 'Pro Bowl': 250000, 'Offensive Player of the Year': 500000, 'Defensive Player of the Year': 500000 };
  won.forEach(a => giveAward(e, a, cash[a] ? Math.round(cash[a] * Math.max(0.3, cs.nfl.contract.apy / 2e7)) : 0));
  N.awards = A; return won;
}

/* ---------- offseason: money ---------- */
// What the market would pay this player per year right now.
function nflMarket() {
  const p = cs.p, ovr = cOvr(p), age = cs.nfl.age, pos = p.pos;
  const f = interp([[72, 0], [76, 0.02], [80, 0.07], [84, 0.18], [87, 0.32], [90, 0.5], [93, 0.7], [96, 0.88], [99, 1]], ovr);
  const ageF = age <= 28 ? 1 : Math.max(0.3, 1 - (age - 28) * (pos === 'QB' ? 0.05 : cSpec(pos) ? 0.02 : 0.11));
  const last = p.seasons.filter(s => s.lvl === 'nfl').slice(-1)[0]; const prod = last && last.ratio != null && last.gs >= 8 ? clamp(last.ratio, 0.7, 1.5) : 0.85;
  return Math.round(Math.max(NFL_MIN + cs.nfl.yrs * 60000, NFL_TOP_APY[pos] * f * ageF * (0.7 + prod * 0.35) * agentPay()) / 10000) * 10000;
}
// last season's production counts with every front office: a Pro Bowl year earns a starting job
function nflProdBonus() { const last = cs.p.seasons.filter(s => s.lvl === 'nfl').slice(-1)[0]; return last && last.gs >= 8 && last.ratio != null ? clamp((last.ratio - 1) * 8, -2, 4) : 0; }
// how he'd fit on a team next season: depth rank among that team's players at his position
function nflFit(tm) { const mates = nflRoster(tm, cs.year).filter(x => x.pos === cs.p.pos); const sc = cOvr(cs.p) + (tm === cs.nfl.tm ? (cs.p.trust - 50) * 0.1 : 0) + nflProdBonus(); const rank = mates.filter(m => m.ovr + (m.exp >= 3 ? 0.6 : 0) > sc).length; const share = ROT_SHARE[cs.p.pos][rank]; return { rank, share: share != null ? share : 0.04, txt: share >= 0.9 ? 'Starter' : share >= 0.3 ? 'Rotation player' : 'Backup' }; }
function nflOffer(tm, mkt, r, kind) {
  const fit = nflFit(tm); const age = cs.nfl.age; const ovr = cOvr(cs.p);
  const apy = Math.max(NFL_MIN + cs.nfl.yrs * 60000, Math.round(mkt * (0.85 + r() * 0.3) * (fit.share >= 0.9 ? 1.05 : 0.8) / 10000) * 10000);
  const yrs = clamp(age < 27 ? 3 + Math.floor(r() * 3) : age < 30 ? 2 + Math.floor(r() * 3) : age < 33 ? 1 + Math.floor(r() * 2) : 1, 1, 5);
  const bonus = apy > 3e6 ? Math.round(apy * yrs * (0.12 + r() * 0.22) / 10000) * 10000 : 0;
  return { tm, apy, yrs, bonus, role: fit.txt, rank: fit.rank, pow: cs.nfl.pow[tm], kind: kind || 'fa', ovr };
}
// Opens the money step: expiring deals go to free agency, a fading veteran may be cut, a
// first-round pick may get his fifth-year option.
function nflMoneyStep() {
  const n = cs.nfl; const c = n.contract; if (n.moneyDone === cs.year) return; n.moneyDone = cs.year; n.fa = null; n.asked = null;
  const fit = nflFit(n.tm); const age = n.age + 1; // decisions look at next season
  if (c.left <= 0) {
    if (c.opt && c.kind === 'rookie' && fit.share >= 0.9) { c.left = 1; c.yrs++; c.apy = Math.max(c.apy, Math.round(nflMarket() * 0.8 / 10000) * 10000); c.opt = false; c.kind = 'option'; cNews(`The ${nflName(n.tm)} pick up ${cName(cs.p)}'s fifth-year option: ${money(c.apy)} next season.`, 'win'); return; }
    nflOpenFA('expired'); return;
  }
  const deep = fit.share < 0.3; const pricey = c.apy > 3 * NFL_MIN; const last = cs.p.seasons.filter(s => s.lvl === 'nfl').slice(-1)[0];
  if (last && last.gs >= 8 && last.ratio != null && last.ratio >= 1 && !(cs.balV >= 2 && age >= 32)) return; // nobody cuts a productive starter (Updated: unless he's 32 or older)
  if (c.kind === 'rookie' && !n.draft.udfa && n.draft.round <= 3 && n.yrs < 3) return; // or a high pick before his third year
  if (deep && (pricey || age >= 30 || cOvr(cs.p) < 74 + cNflBar()) && R() < (cs.balV >= 2 ? 0.8 : 0.7)) {
    cNews(`The ${nflName(n.tm)} release ${cName(cs.p)}.`, 'bad'); n.moves.push({ y: cs.year, txt: `Released by the ${nflName(n.tm)}` });
    c.left = 0; nflOpenFA('cut'); return;
  }
}
function nflOpenFA(why) {
  const n = cs.nfl; const mkt = nflMarket(); const r = hrng(cs.seed + ':nfa:' + cs.year + ':' + why); const ovr = cOvr(cs.p); const age = n.age + 1;
  const sh = cNflBar(); const want = ovr >= 88 + sh ? 6 : ovr >= 84 + sh ? 4 : ovr >= 80 + sh ? 3 : ovr >= 76 + sh ? 2 : ovr >= 72 + sh ? 1 : 0;
  const agePen = cs.balV >= 2 ? (age >= 34 ? 3 : age >= 32 ? 2 : age >= 30 ? 1 : 0) : (age >= 34 ? 2 : age >= 31 ? 1 : 0); /* Updated: clubs move on from aging players sooner */
  const lastN = cs.p.seasons.filter(s => s.lvl === 'nfl').slice(-1)[0]; const benchPen = cs.balV >= 2 && (!lastN || (lastN.gs || 0) < 8) ? 1 : 0; /* Updated: a backup gets fewer calls than a starter */
  const nOff = age >= 38 ? 0 : Math.max(0, Math.round(want - agePen - benchPen + (r() - 0.5) * 1.5));
  const teams = NFL.map(t => t.id).filter(id => id !== n.tm).map(id => ({ id, s: (nflFit(id).share >= 0.3 ? 2 : 0) + r() * 2 + (n.pow[id] - 76) / 20 })).sort((a, b) => b.s - a.s).slice(0, nOff).map(x => x.id);
  const offers = teams.map(id => nflOffer(id, mkt, r));
  // the old team bids too when his deal ran out, if he still helps them
  if (why === 'expired' && nflFit(n.tm).share >= 0.3 && age < 37) offers.unshift(nflOffer(n.tm, mkt * 1.02, r, 'resign'));
  if (!offers.length && ovr >= 75 + sh && age < (cs.balV >= 2 ? 33 : 35)) { const id = NFL.map(t => t.id).filter(x => x !== n.tm).sort((a, b) => n.pow[a] - n.pow[b])[Math.floor(r() * 8)]; offers.push(Object.assign(nflOffer(id, NFL_MIN, r), { apy: NFL_MIN + n.yrs * 60000, yrs: 1, bonus: 0, kind: 'min' })); }
  n.fa = { why, offers, done: false, none: !offers.length, round: 1 };
}
// Waiting a week in free agency: a team or two may call, and an offer can be pulled.
function nflFAWait() {
  const F = cs.nfl.fa; if (!F || F.done || F.round >= 3) return null; F.round++;
  const r = hrng(cs.seed + ':nfaw:' + cs.year + ':' + F.round); const mkt = nflMarket(); const out = [];
  if (F.offers.length > 1 && r() < 0.35) { const i = 1 + Math.floor(r() * (F.offers.length - 1)); out.push(['pulled', F.offers[i].tm]); F.offers.splice(i, 1); }
  if (r() < (cOvr(cs.p) >= 80 ? 0.6 : 0.35)) { const have = new Set(F.offers.map(o => o.tm)); const id = NFL.map(t => t.id).filter(x => !have.has(x) && x !== cs.nfl.tm)[Math.floor(r() * 25)]; if (id) { const o = nflOffer(id, mkt * (0.9 + r() * 0.2), r); F.offers.push(o); out.push(['offer', id]); } }
  F.none = !F.offers.length; return out;
}
function nflSign(i) {
  const n = cs.nfl; const F = n.fa; if (!F || F.done) return false; const o = F.offers[i]; if (!o) return false;
  const moved = o.tm !== n.tm; const from = n.tm;
  n.contract = { tm: o.tm, yrs: o.yrs, left: o.yrs, apy: o.apy, bonus: o.bonus, kind: o.kind === 'resign' ? 'resign' : 'fa', from: cs.year, opt: false };
  n.tm = o.tm; F.done = true; F.signed = o.tm;
  if (o.bonus) { cs.p.bank += Math.round(o.bonus * (1 - agentFee())); cs.p.earned += o.bonus; n.earn = (n.earn || 0) + o.bonus; cs.nilLog.unshift({ y: cs.year, txt: `Signing bonus, ${nflName(o.tm)}`, amt: o.bonus }); }
  if (moved) { cs.p.trust = 50; n.moves.push({ y: cs.year, txt: `Signed with the ${nflName(o.tm)} as a free agent` }); }
  cNews(moved ? `${cName(cs.p)} signs with the ${nflName(o.tm)}: ${o.yrs} year${o.yrs > 1 ? 's' : ''}, ${money(o.apy * o.yrs)}.` : `${cName(cs.p)} re-signs with the ${nflName(o.tm)}: ${o.yrs} year${o.yrs > 1 ? 's' : ''}, ${money(o.apy * o.yrs)}.`, 'big');
  void from; nflRosterCache.clear(); return true;
}
// Asking for a trade: works more often for a good player on a fair deal; a failed ask costs trust.
function nflRequestTrade() {
  const n = cs.nfl; if (n.asked === 'trade' || (n.fa && !n.fa.done) || cs.phase !== 'nfloff') return null; n.asked = 'trade';
  const ovr = cOvr(cs.p); const chance = clamp(0.25 + (ovr - 80) * 0.03 + (n.contract.apy < nflMarket() * 1.2 ? 0.15 : -0.1), 0.1, 0.85);
  if (R() < chance) {
    const from = n.tm; const cand = NFL.map(t => t.id).filter(id => id !== from).map(id => ({ id, s: nflFit(id).share + R() * 0.6 })).sort((a, b) => b.s - a.s);
    const to = cand[0].id; n.tm = to; n.contract.tm = to; cs.p.trust = 50; nflRosterCache.clear();
    n.moves.push({ y: cs.year, txt: `Traded from the ${nflName(from)} to the ${nflName(to)}` });
    cNews(`Trade: the ${nflName(from)} send ${cName(cs.p)} to the ${nflName(to)}.`, 'big'); return { ok: true, to, from };
  }
  cs.p.trust = clamp(cs.p.trust - 8, 0, 100); cNews(`The ${nflName(n.tm)} turn down ${cName(cs.p)}'s trade request.`, 'bad'); return { ok: false };
}
// Asking for an extension in the last year of a deal: a starter outplaying his contract gets one.
function nflAskExtension() {
  const n = cs.nfl; const c = n.contract; if (n.asked === 'ext' || c.left !== 1 || cs.phase !== 'nfloff' || (n.fa && !n.fa.done)) return null; n.asked = 'ext';
  const mkt = nflMarket(); const fit = nflFit(n.tm);
  if (fit.share >= 0.9 && mkt > c.apy * 1.15 && R() < 0.75) {
    const r = hrng(cs.seed + ':next:' + cs.year); const o = nflOffer(n.tm, mkt, r, 'ext'); const yrs = o.yrs;
    c.apy = o.apy; c.yrs = c.yrs + yrs; c.left = 1 + yrs; c.kind = 'ext'; c.bonus = (c.bonus || 0) + o.bonus;
    if (o.bonus) { cs.p.bank += Math.round(o.bonus * (1 - agentFee())); cs.p.earned += o.bonus; n.earn = (n.earn || 0) + o.bonus; cs.nilLog.unshift({ y: cs.year, txt: `Extension bonus, ${nflName(n.tm)}`, amt: o.bonus }); }
    cNews(`${cName(cs.p)} signs an extension with the ${nflName(n.tm)}: ${yrs} more year${yrs > 1 ? 's' : ''} at ${money(o.apy)} a year.`, 'big'); return { ok: true, apy: o.apy, yrs };
  }
  cNews(`The ${nflName(n.tm)} want to see one more season before talking about an extension.`); return { ok: false };
}

// Holding out: a starter who has outplayed a deal with two or more years left can skip camp until he gets a new one.
// It works more often the better he is and the bigger the gap. If it fails he pays fines, loses his coach's trust
// and misses camp (less growth this offseason).
function canHoldout() { const n = cs.nfl; if (!n || cs.phase !== 'nfloff' || n.asked || (n.fa && !n.fa.done)) return false; const c = n.contract; return !!c && c.left >= 2 && cOvr(cs.p) >= 78 && nflMarket() > c.apy * 1.3; }
function holdoutOdds() { const c = cs.nfl.contract; return clamp(0.15 + (cOvr(cs.p) - 80) * 0.04 + (nflMarket() / Math.max(1, c.apy) - 1.3) * 0.25 + (agentOf() ? agentOf().hold : 0), 0.08, 0.85); }
function nflHoldout() {
  if (!canHoldout()) return null; const n = cs.nfl; const c = n.contract; n.asked = 'hold'; const r = hrng(cs.seed + ':hold:' + cs.year);
  if (r() < holdoutOdds()) {
    const o = nflOffer(n.tm, nflMarket(), r, 'ext'); c.apy = o.apy; c.yrs += 1; c.left += 1; c.kind = 'ext'; c.bonus = (c.bonus || 0) + o.bonus;
    if (o.bonus) { cs.p.bank += Math.round(o.bonus * (1 - agentFee())); cs.p.earned += o.bonus; n.earn = (n.earn || 0) + o.bonus; cs.nilLog.unshift({ y: cs.year, txt: `New deal bonus, ${nflName(n.tm)}`, amt: o.bonus }); }
    n.moves.push({ y: cs.year, txt: 'Held out and got a new deal' }); cNews(`${cName(cs.p)}'s holdout ends with a new deal: ${money(o.apy)} a year through ${cs.year + c.left}.`, 'big'); return { ok: true, apy: o.apy };
  }
  const fine = Math.min(cs.p.bank, Math.round(c.apy * 0.08 / 1000) * 1000); cs.p.bank -= fine; if (fine) cs.nilLog.unshift({ y: cs.year, txt: 'Holdout fines', amt: -fine });
  cs.p.trust = clamp(cs.p.trust - 12, 0, 100); if (cs.off) cs.off.held = true; cNews(`${cName(cs.p)} ends his holdout without a new deal after ${money(fine)} in fines.`, 'bad'); return { ok: false, fine };
}

/* ---------- offseason: aging and growth ---------- */
function nflOffGrowth() {
  cs.off.grown = true; const p = cs.p; const age = cs.nfl.age + 1; const peak = NFL_PEAK[p.pos];
  const phys = NFL_PHYS[p.pos]; const read = CREAD[p.pos]; const log = [];
  CATTR[p.pos].forEach(([k]) => {
    let d;
    if (phys.includes(k)) d = age <= peak - 3 ? 1.2 : age <= peak ? 0 : -(1.5 + (age - peak) * (cs.balV >= 2 ? 1.5 : 1)); /* Updated: the body goes faster past the peak */
    else if (k === read) d = age <= 33 ? 1 : -(age - 33) * 0.6;
    else d = age <= peak - 2 ? 0.6 : age <= peak + 1 ? 0 : -(0.5 + (age - peak) * 0.5);
    const v = Math.round(d + gauss() * 0.7); if (v) { p.a[k] = clamp(p.a[k] + v, 20, CATTR_MAX); log.push([k, v]); }
  });
  const g = grantXP(Math.round(((age <= peak ? 4 : age <= peak + 3 ? (cs.balV >= 2 ? 2 : 3) : (cs.balV >= 2 ? 1 : 2)) - (cs.off.held ? 1 : 0)) * devYear())); /* a holdout misses camp */
  cs.off.growXP = g; cs.off.ageLog = log;
}

/* ---------- retirement and the Hall of Fame ---------- */
function nflHofScore() {
  const aw = cs.p.awards.filter(a => a.lvl === 'nfl').map(a => a.a); const cnt = k => aw.filter(a => a === k).length;
  const starts = cs.p.seasons.filter(s => s.lvl === 'nfl' && s.gs >= 10).length;
  return cnt('First-team All-Pro') * 10 + cnt('Second-team All-Pro') * 5 + cnt('Pro Bowl') * 3 + cnt('NFL MVP') * 16 + cnt('Offensive Player of the Year') * 9 + cnt('Defensive Player of the Year') * 9
    + (cnt('Offensive Rookie of the Year') + cnt('Defensive Rookie of the Year')) * 3 + cnt('Super Bowl champion') * 6 + cnt('Super Bowl MVP') * 5 + starts * 1.5;
}
function nflHofVerdict(sc) { return sc >= 110 ? 'First-ballot Hall of Famer' : sc >= 75 ? 'Hall of Famer' : sc >= 40 ? 'Hall of Very Good' : sc >= 15 ? 'A solid pro career' : 'A career in the league'; }
function nflRetire(why) {
  if (!cs.nfl || cs.phase === 'retired') return false;
  if (cs.phase === 'nfl') return false; // seasons are finished first
  const sc = Math.round(nflHofScore()); const v = nflHofVerdict(sc);
  cs.nfl.retired = { year: cs.year, age: cs.nfl.age + (cs.phase === 'nfloff' ? 1 : 0), seasons: cs.nfl.yrs, hof: sc, verdict: v, why: why || 'choice' };
  cs.phase = 'retired'; cs.off = null; if (cs.nfl.fa) cs.nfl.fa.done = true;
  cNews(`${cName(cs.p)} retires after ${cs.nfl.yrs} NFL season${cs.nfl.yrs === 1 ? '' : 's'}. ${v}.`, 'big');
  return true;
}
// Retiring right after the draft, before playing a down.
function nflSkip() { if (cs.phase !== 'done' || cs.nfl) return false; cs.phase = 'retired'; cs.done.skipped = true; cNews(`${cName(cs.p)} decides not to play in the NFL.`, 'big'); return true; }

/* ---------- saves ---------- */
function nflValidate(c, bad, num) {
  const n = c.nfl; if (!n || typeof n !== 'object' || !NFL_BY[n.tm] || !num(n.age) || !num(n.yrs) || !n.pow || typeof n.pow !== 'object') bad('The NFL record is damaged.');
  const k = n.contract; if (!k || !num(k.apy) || !num(k.yrs) || !num(k.left)) bad('The NFL contract is damaged.');
  if (!Array.isArray(n.hist) || !Array.isArray(n.champs)) bad('The NFL history is damaged.');
  if (c.phase === 'nfl') { const L = n.L; if (!L || !L.teams || Object.keys(L.teams).length !== 32 || !Array.isArray(L.games) || !num(L.week)) bad('The NFL season is damaged.'); L.games.forEach(g => { if (!g || !NFL_BY[g.h] || !NFL_BY[g.a] || !num(g.wk)) bad('An NFL game record is damaged.'); }); }
  if (c.phase === 'retired' && !n.retired) bad('The retirement record is damaged.');
}

