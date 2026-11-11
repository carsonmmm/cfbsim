await enterCareer('new');
const out = []; const mode = ARGS[0] || 'nat';
for (let k = 0; k < (+ARGS[1] || 12); k++) {
  newCareer({ pos: ['QB','WR','RB','DE','CB','LB'][k % 6], first: 'N', last: 'F', num: 7, home: 'TX', path: 'hs', stars: 5, seed: 300 + k, diff: ARGS[2] || 'easy' }); cslot = 1; cs.p.auto = true;
  if (mode === 'boost') cs.p.rec.camp = 40;
  const log = []; let g = 0;
  while (cs.lvl === 'hs' && g++ < 400) {
    if (cs.phase === 'hsoff') { const st = offStep(); log.push([cs.hs.cls, st, Math.round(cs.p.rec.score), natRankOf(cs.p.rec.score), offersList().length]); if (st === 'signing') break; offNext(); continue; }
    const r = cSimUntil(null, { events: true, spend: true }); if (r === 'choice' && offStep() === 'signing') { log.push(['sign', Math.round(cs.p.rec.score), natRankOf(cs.p.rec.score), offersList().length]); break; }
  }
  out.push(log);
}
return out;
