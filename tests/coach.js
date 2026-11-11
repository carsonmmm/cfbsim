const [diff, start, nRuns, years] = [ARGS[0] || 'normal', ARGS[1] || 'pos', +(ARGS[2] || 6), +(ARGS[3] || 12)];
// mid-pack Group of Five schools to start from
await enterAD(); switchNS('coach');
const g5 = Object.entries(CTEAMS0_AD).filter(([id, t]) => CONFS[t.conf] && !CONFS[t.conf].p4 && id !== 'ND').sort((a, b) => a[0] < b[0] ? -1 : 1);
const out = [];
for (let k = 0; k < nRuns; k++) {
  const P4 = ['OSU', 'UGA', 'BAMA', 'TEX', 'ORE', 'PSU', 'LSU', 'ND']; const tid = start === 'oc' ? P4[k % P4.length] : start === 'nflte' ? NFL[(k * 5) % 32].id : g5[(k * 7) % g5.length][0];
  newCoachCareer({ name: 'Probe ' + k, start: 'any', tid, role: start === 'hc' ? 'HC' : start === 'oc' ? 'OC' : start === 'nflte' ? 'TE' : 'QB', diff, gameDay: 'plan', lvl: start === 'nflte' ? 'nfl' : 'col', nfl: start === 'nflte' ? tid : undefined, seed: 1000 + k });
  if (ARGS[4]) state.settings.rules.bal = ARGS[4]; appMode = 'ad'; const tl = [];
  for (let y = 0; y < years && !state.gameOver; y++) {
    autoSeasonRecruiting(); let n = 0; while (state.phase !== 'offseason' && !state.gameOver && n++ < 40) advance();
    const co = state.co; const h = co.hist[co.hist.length - 1] || {};
    tl.push([y + 1, co.role, isPro() ? 'nfl' : 'col', isPro() ? ME : ME, Math.round(jobPrestige(ME, isPro() ? 'nfl' : 'col')), h.w, h.l, co.rep]);
    if (state.gameOver) break; autoOffseason(); if (isPro() && state.phase === 'offseason') proAutoOffseason();
  }
  const firstAt = f => { const x = tl.find(f); return x ? x[0] : null; };
  out.push({ roles: tl.map(t => t[1] + '@' + t[3] + (t[2] === 'nfl' ? '(N)' : '')).join(' '), teams: tl.map(t => t[3] + (CONFS[(CTEAMS0_AD[t[3]] || {}).conf] && CONFS[CTEAMS0_AD[t[3]].conf].p4 ? '*' : '')).join(' '), tid, coord: firstAt(t => ['OC', 'DC'].includes(t[1])), hc: firstAt(t => t[1] === 'HC'), p4hc: firstAt(t => t[1] === 'HC' && t[2] === 'col' && CONFS[(CTEAMS0_AD[t[3]] || {}).conf] && CONFS[CTEAMS0_AD[t[3]].conf].p4), nfl: firstAt(t => t[2] === 'nfl'), nflhc: firstAt(t => t[2] === 'nfl' && t[1] === 'HC'), over: !!state.gameOver, tl: tl.map(t => t.slice(0, 2).concat(t[4], (t[5] || 0) + '-' + (t[6] || 0), t[7]).join(':')).join(' ') });
}
return out;
