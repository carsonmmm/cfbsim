// Player stories and conference realignment. Run with: node tests/run.js tests/stories.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); };
localStorage.removeItem('fe-world'); await enterAD(); newGame('normal', null, 7, 'OSU'); appMode = 'ad';
// stories: four seasons, then a current player, a former player and the draft register
for (let y = 0; y < 4; y++) autoSeason();
const signee = state.roster.find(p => p.recruit && p.sig); need(!!signee, 'no signee carries a signing-day note');
if (signee) { const ch = storyCollege(signee, false); need(ch.length >= 1 && /Signed as a/.test(ch[0].t), 'a signee\'s story should start with signing day'); const html = playerModal(signee.id); need(/His story/.test(html), 'the player page has no story'); }
const vet = state.roster.filter(p => (p.hist || []).length >= 2)[0]; if (vet) need(storyCollege(vet, false).filter(c => /season:/.test(c.t)).length >= 2, 'a veteran\'s story should list his seasons');
const dr = state.alumni.find(a => /^Drafted by/.test(a.where || '')); need(!!dr, 'nobody was drafted in four seasons');
if (dr) { const ch = storyCollege(dr, true); need(ch.some(c => /Drafted by/.test(c.t)), 'a drafted player\'s story should end with the draft'); actions.alumstory({ n: dr.n, s: String(dr.last) }); need(!document.getElementById('modal').hidden && document.getElementById('modal').textContent.includes(dr.n), 'the former player\'s story did not open'); hideModal(); }
ui.tab = 'history'; render(); need(!!document.getElementById('storycard') && !!document.querySelector('#view [data-act=alumstory]'), 'the History page has no stories to open');
const reg = worldAlumni(); need(reg.length > 0 && reg.every(a => a.col === 'Ohio State' && a.yr && a.rd), 'drafted players were not written to the shared register'); out.register = reg.length;
// realignment: the conference table, a raid, and an invitation
ui.tab = 'standings'; render(); need(!!document.getElementById('confcard'), 'the Standings page has no conference table');
const sizes0 = Object.fromEntries(Object.keys(CONFS).map(c => [c, confMembers(c).length])); let raids = 0, s0 = state.season;
for (let i = 0; i < 60 && !raids; i++) { state.season = 3000 + i; if (confRaid()) raids++; } state.season = s0;
need(raids === 1, 'a raid never happened in sixty tries'); need(Object.keys(CONFS).every(c => c === 'IND' || !confMembers(c).length || confMembers(c).length >= 7), 'a raid left a conference too small');
need(Object.values(state.teams).every(t => CONFS[t.conf]), 'a school ended up in no conference'); need((state.confMoves || []).length >= 1, 'the move was not recorded');
// an invitation, at a strong school in a weaker league
newGame('normal', null, 12, 'BSU'); { let g = 0; while (state.phase !== 'offseason' && g++ < 60) advance(); } const mine = T(ME).conf; let got = null; s0 = state.season;
for (let i = 0; i < 80 && !got; i++) { state.season = 3100 + i; delete X().invS; got = invMake(); } need(!!got && got.to !== mine, 'no conference ever invited a strong program');
if (got) { ui.tab = 'office'; render(); need(!!document.getElementById('invcard'), 'the Office does not show the invitation'); const f = invFacts(got); need(f.tvThen > f.tvNow, 'a move up should pay more: ' + f.tvNow + ' to ' + f.tvThen); out.invite = { to: got.to, tv: f.tvNow + ' -> ' + f.tvThen, level: f.lvNow + ' -> ' + f.lvThen, travel: f.tzNow.toFixed(1) + ' -> ' + f.tzThen.toFixed(1), fee: got.fee };
  const bal = state.fin.balance; actions.invdo({ v: 'yes' }); need(state.myMove && state.myMove.to === got.to && state.fin.balance <= bal && !invNow(), 'accepting should book the move');
  const mb = state.mediaBonus || 0; realign(); need(T(ME).conf === got.to, 'the school did not change conference'); need(Math.abs((state.mediaBonus || 0) - mb - got.tv) < 0.11, 'the TV money did not change with the move'); }
state.season = s0;
// declining keeps them away for three seasons
newGame('normal', null, 13, 'BSU'); { let g = 0; while (state.phase !== 'offseason' && g++ < 60) advance(); } got = null; for (let i = 0; i < 80 && !got; i++) { state.season = 3200 + i; delete X().invS; got = invMake(); }
if (got) { actions.invdo({ v: 'no' }); need(!invNow() && X().invNo[got.to] === state.season && !state.myMove, 'declining should end the offer'); }
// the general manager's draft finds the athletic director's players
newGame('normal', null, 21, 'MICH'); state.settings.world = 'on'; goPro('DEN', { role: 'gm' }); const yr = reg.length ? reg[0].yr : 0; const D = genDraftClass(yr); const mineIn = D.list.filter(p => String(p.world || '').startsWith('al:'));
need(mineIn.length > 0, 'the draft class does not include the players from the athletic director career'); if (mineIn.length) { const fake = Object.assign({}, mineIn[0], { exp: 0 }); need(storyPro(fake).some(c => /You signed him at Ohio State/.test(c.t)), 'his NFL page does not tell the college half'); }
out.inDraft = mineIn.length; localStorage.removeItem('fe-world'); out.wide = document.documentElement.scrollWidth; return out;
