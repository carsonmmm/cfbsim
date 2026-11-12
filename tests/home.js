// The Home screen. Run with: node tests/run.js tests/home.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); }; const wait = ms => new Promise(r => setTimeout(r, ms)); const $v = s => document.querySelector('#view ' + s);
need(document.querySelectorAll('#view .mode').length === 6 + miniCount(), 'the Home screen is missing a mode card'); need(!!$v('.homepick'), 'a new player should see the quick picks'); need(!$v('.homecont'), 'no Continue card without a save');
need(!/claude\.ai/.test(document.getElementById('view').textContent), 'the Home screen mentions another website');
// a GM career from its own card
actions.homenew({ v: 'nfl' }); await wait(100); need(/NFL club/.test($v('h1').textContent), 'the GM card did not open the club picker'); await actions.adpickstart(); await wait(400); await flushSave();
need(state.lvl === 'nfl', 'the new career is not an NFL career'); const gmName = myName(), gmSlot = slot;
await actions.gohome(); await wait(300); need($v('.homecont') && $v('.homecont').textContent.includes(gmName), 'the Continue card does not show the GM career');
// an AD career next to it
actions.homenew({ v: 'col' }); await wait(100); await actions.adpickstart(); await wait(400); await flushSave(); const adName = myName(), adSlot = slot; need(adSlot !== gmSlot, 'the AD career overwrote the GM career');
await actions.gohome(); await wait(300); need($v('.homecont').textContent.includes(adName), 'the Continue card should show the career saved last');
const btn = t => [...document.querySelectorAll('#view .mode [data-act=homeopen]')].find(b => t.test(b.textContent));
await actions.homeopen(btn(/GM/).dataset); await wait(400); need(myName() === gmName && slot === gmSlot && appMode === 'ad', 'Continue as GM opened the wrong career');
await actions.gohome(); await wait(300); await actions.homeopen(btn(/AD/).dataset); await wait(400); need(myName() === adName && slot === adSlot, 'Continue as AD opened the wrong career');
// friends league is hidden where the host cannot provide it
need(!TABS.map(t => t[0]).filter(tabVisible).includes('friends'), 'the friends league page is reachable without a host');
out.wide = document.documentElement.scrollWidth; return out;
