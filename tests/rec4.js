await enterCareer('new');
const out = []; const att = +(ARGS[0] || 0); const seeds = (ARGS[1] || '307').split(',').map(Number);
for (const sd of seeds) {
  newCareer({ pos: 'QB', first: 'N', last: 'F', num: 7, home: 'TX', path: 'hs', stars: 5, seed: sd, diff: ARGS[2] || 'easy' }); cslot = 1; cs.p.auto = true;
  if (att) CATTR[cs.p.pos].forEach(([k]) => cs.p.a[k] = att);
  const log = []; let lastKey = '';
  const stop = () => { const k = cs.phase + ':' + (cs.hs ? cs.hs.cls : '') + ':' + (cs.phase === 'hs' ? Math.floor(cs.week / 5) : offStep());
    if (k !== lastKey && cs.lvl === 'hs') { lastKey = k; log.push(k + ' sc' + Math.round(cs.p.rec.score || 0) + ' #' + (cs.p.rec.score ? natRankOf(cs.p.rec.score) : '-') + ' off' + offersList().length + (offersList().length ? ' best:' + Math.round(Math.max(...offersList().map(o => teamLevel(o.id)))) : '')); }
    return cs.lvl !== 'hs' || offStep() === 'signing'; };
  cSimUntil(stop, { events: true, spend: true, max: 600 });
  out.push(log.join(' | '));
}
return out;
