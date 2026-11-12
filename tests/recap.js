// Season recaps, the career timeline picture and the feedback links. Run with: node tests/run.js tests/recap.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); }; const wait = ms => new Promise(r => setTimeout(r, ms));
need(!!document.querySelector('#view .feedback a[href*="issues/new"]'), 'the Home screen has no feedback links');
const fu = feedbackURL('bug'); need(fu.includes('version=' + PATCH_NOTES[0].v) && fu.includes('template=bug.yml') && fu.includes('device='), 'the bug report link is not pre-filled: ' + fu);
// college: two seasons, then the recap of the first one
await enterAD(); newGame('normal', null, 7, 'OSU'); appMode = 'ad'; applyTheme(); autoSeason(); autoSeason();
need(state.history.length >= 2 && state.history[0].recap, 'college seasons have no recap');
actions.recap({ s: state.history[0].season }); const m1 = document.getElementById('modal');
need(!m1.hidden && /season recap/i.test(m1.textContent), 'the college recap did not open'); need(!!m1.querySelector('[data-act=seasoncard][data-s="' + state.history[0].season + '"]'), 'the recap has no picture button');
const c1 = seasonCardData(state.history[0].season); need(c1 && c1.season === state.history[0].season && c1.n === 1, 'the picture is not for the season asked for'); hideModal();
ui.tab = 'history'; render(); need(!!document.getElementById('timelinecard'), 'the History page has no career timeline');
let t = timelineData(); need(t && t.rows.length === state.history.length, 'the college timeline has the wrong seasons'); let cv = timelineCanvas(t); need(cv.width === 1200 && cv.height > 400, 'the timeline picture has no size');
ui.tab = 'settings'; render(); need(!!document.querySelector('#view .feedback'), 'Settings has no feedback card');
// NFL: one full season as general manager
newGame('normal', null, 21, 'MICH'); goPro('DEN', { role: 'gm' }); let g = 0; while (state.phase === 'offseason' && g++ < 40) proAutoOffseason(); g = 0; while (state.phase !== 'offseason' && g++ < 40) advance();
const h = PS().hist[PS().hist.length - 1]; need(h && h.recap && h.recap.grade, 'the NFL season has no recap'); need(h && h.recap && (h.recap.best || h.recap.worst), 'the NFL recap has no games in it');
ui.tab = 'history'; render(); need(!!document.querySelector('[data-act=precap]'), 'the NFL history has no Recap link'); actions.precap({ s: h.s }); need(/Season grade/.test(document.getElementById('modal').textContent), 'the NFL recap did not open'); hideModal();
t = timelineData(); need(t && t.rows.length === PS().hist.length, 'the NFL timeline has the wrong seasons'); out.nfl = h.recap.grade + ' ' + h.w + '-' + h.l;
// Player Career
await enterCareer('new'); newCareer({ pos: 'WR', first: 'Tim', last: 'Line', num: 1, home: 'TX', path: 'college', stars: 3, seed: 5, diff: 'normal' }); cslot = 1; signWith(offersList()[0].id); cs.p.auto = true;
for (let i = 0; i < 6 && cs.phase !== 'done'; i++) { const r = cSimUntil(null, { events: true, spend: true }); if (r === 'choice' && offStep() === 'draft') declareDraft(true); else if (r === 'choice') offNext(); }
t = timelineData(); need(t && t.rows.length === cs.p.seasons.length && t.rows.length >= 1, 'the player timeline has no seasons'); cui.tab = 'stats'; render(); need(!!document.getElementById('timelinecard'), 'the Stats page has no career timeline');
if (ARGS[0] === 'png') out.png = timelineCanvas(t).toDataURL('image/png');
out.wide = document.documentElement.scrollWidth; return out;
