// Ironman careers. Run with: node tests/run.js tests/ironman.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); }; const wait = ms => new Promise(r => setTimeout(r, ms));
actions.homenew({ v: 'col' }); actions.nciron({ v: '1' }); need(!!document.querySelector('[data-act=nciron][data-v="1"].on'), 'the Ironman choice is not shown as on');
await actions.adpickstart(); await wait(500);
need(ironOn(), 'the career is not Ironman'); need(!TABS.map(t => t[0]).filter(tabVisible).includes('admin'), 'the admin page is reachable');
need(undoSnap(Object.keys(UNDO_ACTS)[0]) === null, 'undo is available');
const d0 = state.settings.diff; actions.setgame({ k: 'diff', v: d0 === 'easy' ? 'hard' : 'easy' }); need(state.settings.diff === d0, 'the difficulty could be changed');
await flushSave(); need(slotsMetaOf('ad')[slot].iron === true, 'the slot list does not mark the career'); need(!!document.querySelector('#hdr .ironpill'), 'the header has no Ironman badge');
// an ordinary career keeps everything
newGame('normal', null, 3, 'MICH'); need(!ironOn(), 'a normal career is Ironman'); need(TABS.map(t => t[0]).filter(tabVisible).includes('admin'), 'a normal career lost the admin page'); need(!!undoSnap(Object.keys(UNDO_ACTS)[0]), 'a normal career lost undo');
// turned on later from Settings, in a coach career
switchNS('coach'); newCoachCareer({ name: 'Iron Test', start: 'any', tid: 'UGA', role: 'HC', diff: 'normal', gameDay: 'plan', lvl: 'col' }); appMode = 'ad'; ui.tab = 'settings'; render();
need(!!document.querySelector('[data-act=ironask]'), 'coach Settings has no Ironman row'); actions.ironask(); need(!!document.querySelector('[data-act=ironon]'), 'no confirm step'); actions.ironon();
need(ironOn() && !document.querySelector('[data-act=ironask]'), 'Ironman did not turn on for the coach'); need(undoSnap(Object.keys(UNDO_ACTS)[0]) === null, 'a coach on Ironman still has undo');
// Player Career
await enterCareer('new'); newCareer({ pos: 'WR', first: 'I', last: 'T', num: 1, home: 'TX', path: 'college', stars: 3, seed: 5, diff: 'normal' }); cslot = 1; cui.tab = 'settings'; render();
need(!!document.querySelector('[data-act=ironask]'), 'career Settings has no Ironman row'); actions.ironask(); actions.ironon(); need(cIronOn(), 'Ironman did not turn on for the player');
const cd = cs.diff; actions.cdiff({ v: cd === 'easy' ? 'hard' : 'easy' }); need(cs.diff === cd, 'the career difficulty could be changed');
cui.tab = 'admin'; render(); need(/locked/.test(document.getElementById('view').textContent), 'the career admin tools are open');
cSave(); await cFlush(); cs = null; const lr = await cLoadSlot(1); need(lr.ok && cIronOn(), 'Ironman did not survive saving and loading a career'); need(cMeta()[1] && cMeta()[1].iron === true, 'the career slot is not marked');
return out;
