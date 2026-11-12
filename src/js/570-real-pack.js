/* ===================== v10.00: the optional real 2026 pack =====================
 * packs/real-2026.json holds every FBS school's 2026 roster (names, positions, classes, numbers, sizes,
 * hometowns) and the real 2026 schedule. It is built by scripts/build-real-pack.js from public roster data and
 * is only downloaded when a player turns it on for a new athletic director or coach career.
 * Turning it on does three things to the new career, and nothing to any other:
 *   - your school's players get real identities. Each real player takes over a generated player at his position,
 *     rating and all, so the school plays at exactly the strength it would have had;
 *   - the 2026 regular season is the real schedule. From 2027 the game schedules as it always has;
 *   - the three "stars" the game names at every other school are real players from that school.
 * The pack holds no ratings: every rating is the game's own estimate. Real players are marked real, so the
 * house rule holds: they never get negative traits or off-field storylines.
 * Michigan already ships with a hand-rated real roster and schedule, so the pack leaves Michigan's roster alone. */
const REAL = { pack: null, status: 'idle', want: false, url: 'packs/real-2026.json' };
const realValid = p => !!(p && p.v === 1 && p.teams && typeof p.teams === 'object' && Array.isArray(p.games) && p.season);
async function realLoad() {
  if (REAL.pack) return true; if (REAL.status === 'loading') return false; REAL.status = 'loading';
  try { const r = await fetch(REAL.url); if (!r.ok) throw new Error('http ' + r.status); const p = await r.json(); if (!realValid(p)) throw new Error('bad pack'); REAL.pack = p; REAL.status = 'ready'; return true; }
  catch (e) { console.error(e); REAL.status = 'failed'; return false; }
}
const realCls = { Fr: 0, So: 1, Jr: 2, Sr: 3, Gr: 4 };
// your school: real identities on the generated roster
function realRoster() {
  const list = REAL.pack.teams[ME]; if (!list || !list.length || isRealMich()) return 0; let n = 0;
  POS_ORDER.forEach(pos => {
    const gen = state.roster.filter(p => p.pos === pos && !p.real).sort((a, b) => b.ovr - a.ovr); if (!gen.length) return;
    // the oldest players get the best ratings at the position, the way a depth chart usually falls
    const real = list.filter(x => x[1] === pos).sort((a, b) => (realCls[b[2]] || 0) - (realCls[a[2]] || 0) || hash(a[0]) - hash(b[0]));
    real.forEach((x, i) => {
      let p = gen[i];
      if (!p) { if (i >= gen.length + 3) return; const low = gen[gen.length - 1]; const ovr = clamp(low.ovr - 2 - i + gen.length - Math.round(hash(x[0] + 'o') * 3), 40, low.ovr); p = makePlayer({ num: 0, n: x[0], pos, cls: x[2], ht: '6-1', wt: 210, home: '', ovr, pot: ovr, real: true }); state.roster.push(p); (state.depth[pos] || (state.depth[pos] = [])).push(p.id); }
      p.n = x[0]; p.cls = x[2]; p.real = true; if (x[3] != null) p.num = x[3]; if (x[4]) p.ht = x[4]; if (x[5]) p.wt = x[5]; if (x[6]) p.home = x[6]; delete p.recruit; delete p.transfer;
      p.pot = clamp(Math.max(p.ovr, Math.min(p.pot, p.ovr + ({ Fr: 14, So: 10, Jr: 6, Sr: 3, Gr: 1 }[p.cls] || 6) + Math.round(hash(x[0] + 'p') * 8))), p.ovr, 97);
      p.pers = persOf(true, (state.seed || 0) + ':' + p.id + ':' + p.n); n++;
    });
  });
  rebuildPMap(); POS_ORDER.forEach(pos => { state.depth[pos] = state.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id); }); try { autoCaptains(); } catch (e) { }
  return n;
}
// the league: the real regular season, for the pack's season only
function realSchedule() {
  const P = REAL.pack; if (state.season !== P.season || state.week !== 1 || state.games.some(g => g.done)) return 0; const ok = id => id.startsWith('FCS:') || !!state.teams[id];
  const games = P.games.filter(g => ok(g[1]) && ok(g[2])).map(([wk, h, a, neu]) => { const H = state.teams[h], A = state.teams[a]; const conf = !!(H && A && H.conf === A.conf && H.conf !== 'IND'); return mkGame(wk, h, a, neu ? { conf, neutral: true } : { conf }); });
  if (games.length < 600) return 0; state.games = state.games.filter(g => g.type !== 'reg').concat(games); state.ncBook[state.season] = []; try { setGoals(); } catch (e) { } return games.length;
}
// every other school: the three players the game names are real ones
function realStars() {
  let n = 0; Object.values(state.teams).forEach(t => { const list = REAL.pack.teams[t.id]; if (!list || !t.stars || t.id === ME) return; const used = new Set();
    t.stars.forEach(s => { const pool = list.filter(x => x[1] === s.pos && !used.has(x[0])).sort((a, b) => (realCls[b[2]] || 0) - (realCls[a[2]] || 0) || hash(a[0] + t.id) - hash(b[0] + t.id)); const x = pool[0]; if (!x) return; used.add(x[0]); s.n = x[0]; s.cls = x[2]; s.real = true; n++; }); });
  return n;
}
function realApply() {
  if (!REAL.pack || !state || isPro() || state.me) return null; const res = { roster: realRoster(), games: realSchedule(), stars: realStars() };
  X().realPack = { season: REAL.pack.season, built: REAL.pack.built, players: res.roster, games: res.games };
  addNews(`The real ${REAL.pack.season} pack is on: ${res.roster ? res.roster + ' real players at ' + myName() + ', ' : ''}${res.games ? 'the real ' + REAL.pack.season + ' schedule, ' : ''}and real names for the stars at other schools. Every rating is the game's own estimate.`);
  return res;
}
{ const _n = newGame; newGame = function (diffKey, custom) { const r = _n.apply(this, arguments); try { if (REAL.want && REAL.pack && !custom) realApply(); } catch (e) { console.error(e); } return r; }; }
// the switch on the new-career screens
function realToggleHTML(tid) {
  const st = REAL.status; const on = REAL.want; const n = REAL.pack && REAL.pack.teams[tid] ? REAL.pack.teams[tid].length : 0;
  const note = !on ? 'Off: every roster is made up, and the game builds the schedule.' : st === 'loading' ? 'Downloading the pack…' : st === 'failed' ? 'The pack could not be downloaded. Check your connection and switch it on again. Your career can still start without it.'
    : st === 'ready' ? (tid === 'MICH' ? 'Michigan already has its real roster and schedule. The pack adds the real schedule for every other school and real names for their stars.' : `${n} real players at this school, the real 2026 schedule for every school, and real names for the stars you play against. Ratings are the game's own estimates, not real evaluations.`) : '';
  return `<div class="eyebrow mt">Real 2026 rosters and schedule (optional)</div><div>${seg('realpack', on ? '1' : '0', [['0', 'Off'], ['1', 'On']])}</div><p class="small muted" role="status">${esc(note)}</p>`;
}
Object.assign(actions, {
  realpack(d) {
    try { const sel = document.getElementById('nc-tid'); if (sel) ui.nc.tid = sel.value; if (cui.coSetup && typeof readCoForm === 'function') readCoForm(); } catch (e) { }
    REAL.want = d.v === '1'; if (REAL.want && !REAL.pack) { REAL.status = 'idle'; realLoad().then(() => { if (appMode === 'home') render(); }); }
    render(); refocus({ act: 'realpack', v: d.v });
  },
});
// Coach mode's setup form gets the same switch, above its Start button
{ const _c = coachSetupHTML; coachSetupHTML = function () { const html = _c.apply(this, arguments); try { const f = typeof coForm === 'function' ? coForm() : {}; if (f.lvl === 'nfl') return html; const k = '<div class="row gap mt"><button class="btn primary" data-act="costart"'; const i = html.indexOf(k); if (i < 0) return html; return html.slice(0, i) + realToggleHTML(f.tid) + html.slice(i); } catch (e) { return html; } }; }
// the pack is for the career being created: once it has started, the switch goes back to off
{ const w = name => { const f = actions[name]; if (typeof f !== 'function') return; actions[name] = async function () { try { return await f.apply(this, arguments); } finally { if (appMode !== 'home') REAL.want = false; } }; }; w('adpickstart'); w('costart'); }
// the Save file page says when a career was started with the pack
function realNoteHTML() { const r = state && state.x && state.x.realPack; return r ? `<p class="small muted" id="realnote">This career started with the real ${r.season} pack${r.players ? ` (${r.players} real players)` : ''}. Names and schedule come from public ${r.season} rosters; every rating is the game's own estimate.</p>` : ''; }
{ const _v = vFile; vFile = function () { let x = ''; try { x = realNoteHTML(); } catch (e) { } return _v.apply(this, arguments) + x; }; }
