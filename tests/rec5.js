await enterCareer('new');
newCareer({ pos: 'WR', first: 'N', last: 'F', num: 7, home: 'OH', path: 'hs', stars: 5, seed: 55, diff: 'normal' }); cslot = 1; cs.p.auto = true;
CATTR[cs.p.pos].forEach(([k]) => cs.p.a[k] = 85);
cSimUntil(() => cs.hs.cls === 2 && cs.phase === 'hs' && cs.week === 6, { events: true, spend: true, max: 600 });
Object.values(cs.rec.schools).forEach(s => { s.off = false; s.nil = 0; }); cs.rec.committed = null;
const before = offersList().length; const c = JSON.parse(JSON.stringify(cs)); cAdopt(c);
const after = offersList().length;
// quick (college skip) path still works
newCareer({ pos: 'QB', first: 'N', last: 'F', num: 7, home: 'TX', path: 'college', stars: 5, seed: 9 }); const q5 = offersList().length;
newCareer({ pos: 'QB', first: 'N', last: 'F', num: 7, home: 'TX', path: 'college', stars: 1, seed: 9 }); const q1 = offersList().length;
return { before, after, score: cs.p.rec.score, q5, q1 };
