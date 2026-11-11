await enterCareer('new');
newCareer({ pos: 'QB', first: 'N', last: 'F', num: 7, home: 'TX', path: 'hs', stars: 5, seed: 307, diff: 'easy' }); cslot = 1; cs.p.auto = true;
CATTR[cs.p.pos].forEach(([k]) => cs.p.a[k] = 80);
cSimUntil(() => cs.hs.cls === 3 && cs.phase === 'hs' && cs.week === 4, { events: true, spend: true, max: 600 });
appMode = 'career'; cui.tab = 'recruit'; render();
const v = document.getElementById('view').innerText;
return { ver: PATCH_NOTES[0].v, t: PATCH_NOTES[0].t, rank: (v.match(/National rank[^\n]*/) || [''])[0], offersShown: (v.match(/offer/gi) || []).length, n: offersList().length, top: offersList().slice(0, 5).map(o => cTeamName(o.id)) };
