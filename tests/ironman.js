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
return out;
