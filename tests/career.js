const [diff, nSeeds, seed0] = [ARGS[0] || 'normal', +(ARGS[1] || 1), +(ARGS[2] || 100)];
await enterCareer('new');
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P']; const out = []; let i = 0;
for (let sr = 0; sr < nSeeds; sr++) for (const pos of POS) for (const stars of [2, 4]) {
  const seed = seed0 + (i++);
  newCareer({ pos, first: 'N', last: 'F', num: 7, home: 'TX', path: 'hs', stars, seed, diff }); cslot = 1; cs.p.auto = true; let guard = 0, peak = 0;
  while (!['retired'].includes(cs.phase) && guard++ < 3000) { peak = Math.max(peak, cOvr(cs.p));
    if (cs.phase === 'done') { if (cs.done && cs.done.draft && !cs.nfl) { nflStart(); continue; } break; }
    if (cs.phase === 'sign') { const o = offersList(); if (o.length) { const best = o.slice().sort((a, b) => teamLevel(b.id) - teamLevel(a.id))[0]; signWith(best.id); } else break; continue; }
    if (cs.phase === 'nfl') { cSimWeek(); continue; }
    if (cs.phase === 'nfloff') { if (offStep() === 'nmoney') { nflMoneyStep(); if (cs.nfl.fa && !cs.nfl.fa.done) { if (cs.nfl.fa.offers.length) nflSign(0); else { nflRetire('none'); break; } } } if (cs.nfl && cs.nfl.age >= 36) { nflRetire('choice'); break; } offNext(); continue; }
    const r = cSimUntil(null, { events: true, spend: true }); if (r === 'choice') { const st = offStep(); if (st === 'draft') declareDraft(true); else if (st === 'signing') { const o = offersList(); if (o.length) signWith(o.slice().sort((a, b) => teamLevel(b.id) - teamLevel(a.id))[0].id); offNext(); } else offNext(); } }
  const p = cs.p; const col = p.seasons.filter(s => s.lvl === 'col'); const nfl = p.seasons.filter(s => s.lvl === 'nfl'); const aw = [...new Set(p.awards.map(a => a.a))];
  const wl = nfl.map(s => (s.rec || '0-0').split('-').map(Number)); const w = wl.reduce((a, x) => a + x[0], 0), l = wl.reduce((a, x) => a + x[1], 0);
  const firstStart = nfl.findIndex(s => (s.gs || 0) >= 10);
  out.push({ pos, stars, hsStars: p.stars, school: col.length ? col[0].team : null, colYrs: col.length, colStartSeasons: col.filter(s => (s.gs || 0) >= 8).length, draft: cs.done && cs.done.draft ? (cs.done.draft.udfa ? 'UDFA' : 'R' + cs.done.draft.round) : 'none', nflYrs: nfl.length, nflStartSeasons: nfl.filter(s => (s.gs || 0) >= 10).length, firstStart: firstStart < 0 ? null : firstStart + 1, w, l,
    pb: p.awards.filter(a => a.a === 'Pro Bowl').length, ap: p.awards.filter(a => /All-Pro/.test(a.a)).length, mvp: p.awards.filter(a => /MVP|Player of the Year/.test(a.a) && a.lvl === 'nfl').length, sb: p.awards.filter(a => /Super Bowl champ/i.test(a.a)).length, heis: p.awards.filter(a => /Heisman/.test(a.a)).length, aa: p.awards.filter(a => /All-America/.test(a.a)).length, peak, nflGp: nfl.reduce((a, s) => a + (s.gp || 0), 0), ps: cs.nfl ? (cs.nfl.moves || []).filter(m => /Practice squad/.test(m.txt)).length : 0, hof: cs.nfl ? nflHofScore() >= 75 : false, bal: cs.balV || 1 });
}
return out;
