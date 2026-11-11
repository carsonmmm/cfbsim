const out = { errs: [] }; const errs = []; const oe = window.onerror; window.addEventListener('error', e => errs.push(String(e.message)));
const tabsAD = () => (isComm() ? commTabList() : isPro() ? PRO_TABS : TABS).map(t => t[0]);
const drawAll = (tag) => { const bad = []; for (const k of tabsAD()) { if (isPro() && !isComm() && typeof proTabVisible==='function' && !proTabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } out[tag] = bad.length ? bad : 'ok'; };
await enterAD(); newGame('normal', null, 7, 'MICH'); appMode = 'ad'; for (let i = 0; i < 4; i++) advance(); drawAll('ad');
switchNS('coach'); newCoachCareer({ name: 'Smoke', start: 'any', tid: 'UGA', role: 'HC', diff: 'hard', gameDay: 'plan', lvl: 'col' }); appMode = 'ad'; autoSeason(); drawAll('coach'); out.coFire = coFireAt();
switchNS('ad'); newGame('normal', null, 8, 'MICH'); goPro('KC', { role: 'gm' }); appMode = 'ad'; for (let i = 0; i < 3; i++) advance(); drawAll('gm');
newComm2({ lvl: 'nfl' }); appMode = 'ad'; advance(); drawAll('comm');
await enterCareer('new'); newCareer({ pos: 'WR', first: 'S', last: 'M', num: 1, home: 'TX', path: 'college', stars: 3, seed: 5, diff: 'hard' }); cslot = 1; signWith(offersList()[0].id); cs.p.auto = true; let g = 0; while (cs.phase !== 'done' && g++ < 40) { const r = cSimUntil(null, { events: true, spend: true }); if (r === 'choice' && offStep() === 'draft') declareDraft(true); else if (r === 'choice') offNext(); }
if (cs.done && cs.done.draft) nflStart(); out.ps = cs.nfl ? !!cs.nfl.ps : 'no nfl'; for (let w = 0; w < 3 && cs.phase === 'nfl'; w++) cSimWeek();
const bad = []; for (const [k] of CTABS) { cui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } out.career = bad.length ? bad : 'ok'; out.ceil = cs.p.ceil; out.bar = cNflBar();
out.errs = errs.slice(0, 5); out.wide = document.documentElement.scrollWidth; return out;
