// Runs inside the game page (through tests/run.js). Plays whole leagues on autopilot and returns the raw numbers
// the balance dashboard charts. ARGS: college worlds, seasons each, NFL worlds, seasons each.
const CW = +ARGS[0] || 6, CS = +ARGS[1] || 5, NW = +ARGS[2] || 4, NS = +ARGS[3] || 6;
const out = { version: PATCH_NOTES[0].v, college: { seasons: 0, teams: [], games: [], titles: [] }, nfl: { seasons: 0, teams: [], games: [], champs: [], rookies: [] } };
await enterAD(); appMode = 'ad';
const collect = (dst, start, fbsOnly) => state.games.filter(g => g.done && g.hs != null && start[g.h] != null && start[g.a] != null).forEach(g => { dst.push([Math.round((start[g.h] - start[g.a]) * 10) / 10, g.hs, g.as, g.neutral ? 1 : 0]); });
// college: a different school and seed for each world, so no one program's story dominates
const schools = ['OSU', 'MINN', 'UMASS', 'TEX', 'BSU', 'WYO', 'UGA', 'TOL', 'ORE', 'RICE'];
for (let w = 0; w < CW; w++) {
  newGame('normal', null, 100 + w, schools[w % schools.length]);
  for (let y = 0; y < CS; y++) {
    const start = {}; Object.values(state.teams).forEach(t => { start[t.id] = t.rating; }); const top = Object.values(state.teams).sort((a, b) => b.rating - a.rating).map(t => t.id);
    let g = 0; while (state.phase !== 'offseason' && g++ < 60) advance();
    Object.values(state.teams).forEach(t => { const gp = t.w + t.l; if (gp >= 10) out.college.teams.push([Math.round(start[t.id]), t.w, t.l, Math.round(t.pf / gp * 10) / 10, Math.round(t.pa / gp * 10) / 10]); });
    collect(out.college.games, start); out.college.titles.push(top.indexOf(state.champ) + 1); out.college.seasons++; autoOffseason();
  }
}
// the NFL
const clubs = ['DEN', 'DET', 'MIA', 'SEA', 'NYJ', 'KC'];
for (let w = 0; w < NW; w++) {
  newGame('normal', null, 200 + w, 'MICH'); goPro(clubs[w % clubs.length], { role: 'gm' });
  for (let y = 0; y < NS; y++) {
    let g = 0; while (state.phase === 'offseason' && g++ < 40) proAutoOffseason();
    Object.keys(state.teams).flatMap(t => proRoster(t)).forEach(p => { if (p.exp === 0 && p.k && p.k.rk && p.k.pick) out.nfl.rookies.push([Math.min(7, Math.ceil(p.k.pick / 32)), p.ovr, p.pot]); });
    const start = {}; Object.values(state.teams).forEach(t => { start[t.id] = t.rating; });
    g = 0; while (state.phase !== 'offseason' && g++ < 40) advance();
    Object.values(state.teams).forEach(t => { const gp = t.w + t.l; out.nfl.teams.push([Math.round(start[t.id]), t.w, t.l, Math.round(t.pf / gp * 10) / 10, Math.round(t.pa / gp * 10) / 10]); });
    collect(out.nfl.games, start); const ch = PS().champs[PS().champs.length - 1]; if (ch) out.nfl.champs.push(Object.values(state.teams).sort((a, b) => start[b.id] - start[a.id]).map(t => t.id).indexOf(ch.tm) + 1); out.nfl.seasons++;
  }
}
return out;
