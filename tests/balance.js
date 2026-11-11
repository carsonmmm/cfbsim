// Balance guardrails. Run with: node tests/run.js tests/balance.js
// Plays seasons on autopilot and checks that the numbers stay in a believable range. The ranges are wide on
// purpose: this catches a change that breaks the sim (a 60-point average, a club that never loses), not small drift.
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); }; const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1); const r1_ = v => Math.round(v * 10) / 10;
await enterAD(); appMode = 'ad';

// College: three seeds, three seasons each, at a strong school, a middling one and a weak one.
const col = { wins: {}, ppg: [] };
for (const [tid, seed] of [['OSU', 11], ['MINN', 12], ['UMASS', 13]]) {
  newGame('normal', null, seed, tid); const w = [];
  for (let y = 0; y < 3; y++) {
    let g = 0; while (state.phase !== 'offseason' && g++ < 60) advance();
    const t = T(ME); w.push(t.w); const gp = t.w + t.l; need(gp >= 11 && gp <= 17, `college: ${tid} played ${gp} games in a season`);
    const all = Object.values(state.teams).filter(x => x.w + x.l >= 10); col.ppg.push(avg(all.map(x => x.pf / (x.w + x.l))));
    autoOffseason(); need(state.roster.length >= 60 && state.roster.length <= 125, `college: ${tid} has ${state.roster.length} players after an autopilot offseason`);
  }
  col.wins[tid] = r1_(avg(w));
}
out.college = { wins: col.wins, ppg: r1_(avg(col.ppg)) };
need(col.wins.OSU > col.wins.UMASS, 'college: a top program should win more than a bottom one on autopilot');
need(col.wins.OSU >= 7, `college: Ohio State averaged ${col.wins.OSU} wins`); need(col.wins.UMASS <= 8, `college: UMass averaged ${col.wins.UMASS} wins`);
need(out.college.ppg >= 18 && out.college.ppg <= 36, `college: teams average ${out.college.ppg} points a game`);

// NFL: a general manager on autopilot for three seasons.
newGame('normal', null, 21, 'MICH'); goPro('DEN', { role: 'gm' }); const nw = [], nppg = [];
for (let y = 0; y < 3; y++) {
  let g = 0; while (state.phase === 'offseason' && g++ < 40) proAutoOffseason();
  g = 0; while (state.phase !== 'offseason' && g++ < 40) advance();
  const t = T(ME); nw.push(t.w); const all = Object.values(state.teams); nppg.push(avg(all.map(x => x.pf / Math.max(1, x.w + x.l))));
  need(Math.abs(all.reduce((a, x) => a + x.w - x.l, 0)) <= 1, 'NFL: league wins and losses do not add up'); need(all.every(x => x.w + x.l >= 16), 'NFL: a club played fewer than 16 games');
  need(Object.keys(state.teams).every(id => proRoster(id).length >= 40), 'NFL: a club has fewer than 40 players'); need(capRoom(ME) > -30, `NFL: your club is ${Math.round(-capRoom(ME))}M over the cap on autopilot`);
}
out.nfl = { wins: r1_(avg(nw)), ppg: r1_(avg(nppg)) };
need(out.nfl.wins >= 2 && out.nfl.wins <= 14, `NFL: an autopilot GM averaged ${out.nfl.wins} wins`); need(out.nfl.ppg >= 16 && out.nfl.ppg <= 30, `NFL: clubs average ${out.nfl.ppg} points a game`);
return out;
