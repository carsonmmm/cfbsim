// Two-way players in Player Career (v10.04). Run with: node tests/run.js tests/twoway.js
const fail = []; const need = (ok, msg) => { if (!ok) fail.push(msg); };
await enterCareer('new');
const mk = (pos, two, seed) => { newCareer({ pos, first: 'N', last: 'F', num: 7, home: 'TX', path: 'hs', stars: 4, seed, diff: 'normal', two }); cslot = 1; };
// the weekly plan changes the snaps and the fatigue
mk('WR', true, 41); let t = twS(); need(cs.p.two === 'CB' && twoWayOn(), 'a two-way receiver also plays cornerback');
const sh = k => twShare2(k); need(sh('main') < sh('bal') && sh('bal') <= sh('second') && sh('second') < sh('iron'), 'bigger plans mean more snaps: ' + ['main', 'bal', 'second', 'iron'].map(sh).join());
need(twFatGain(1, sh('iron')) > twFatGain(1, sh('main')), 'more snaps should tire you more');
// fatigue: costs ratings, raises injury risk, and comes back with rest
t.fat = 0; const inj0 = cInjChance(); t.fat = 80; need(cInjChance() > inj0 * 1.8 && twFatDrop() >= 4 && twTired(cs.p.a)[CATTR.WR[0][0]] < cs.p.a[CATTR.WR[0][0]], 'tired legs should cost ratings and raise injury risk');
t.plan = 'iron'; t.trust = 90; t.fat = 0; CATTR.WR.forEach(([k]) => cs.p.a[k] = 88); let g = 0; while (cs.phase === 'hs' && cs.week < 6 && g++ < 10) { if (cs.event) cResolveEvent(0); cSimWeek(); } need(twS().fat > 30, 'playing every snap for weeks should leave you tired: ' + twS().fat);
// split training: the second position's points are yours to spend
mk('WR', true, 42); cs.p.auto = false; t = twS(); t.split = 50; const x0 = cs.p.xp; const got = grantXP(10); need(Math.abs(t.xp2 - got / 2) < 0.6 && Math.abs(cs.p.xp - x0 - got / 2) < 0.6, 'half of the points should go to the second position: ' + [got, t.xp2, cs.p.xp - x0]);
t.xp2 = 200; const k0 = CATTR.CB[0][0]; const v0 = cs.p.a2[k0]; need(twUp(k0) && cs.p.a2[k0] === v0 + 1 && t.xp2 < 200, 'spending a point on the second position'); t.xp2 = 0; need(!twUp(k0), 'no points, no upgrade');
t.split = 0; const x1 = cs.p.xp; grantXP(10); need(t.xp2 === 0 && cs.p.xp > x1, 'a 0% split sends everything to the main position');
// coach's trust sets the role
t.trust = 10; need(twRole() === 0, 'low trust: situational'); t.trust = 50; need(twRole() === 1, 'middle trust: rotation'); t.trust = 80; need(twRole() === 2, 'high trust: starter');
// the coach's questions
t.ask = { k: 'drop', wk: cs.week, y: cs.year }; need(twAskCardHTML().includes('ctwans'), 'the question should show as a decision'); twAnswer(0); need(!cs.p.two && cs.p.twoWas === 'CB', 'agreeing to focus ends the second position');
need(twCanAsk() && twoWayCardHTML().includes('ctwask'), 'a one-position player can ask to play both ways'); t = twS(); t.ask = { k: 'pickup', wk: cs.week, y: cs.year }; twAnswer(0); need(cs.p.two === 'CB' && twoWayOn() && twS().trust <= 50, 'saying yes to the coach starts you on the other side');
mk('LB', false, 43); need(!cs.p.two && twCanAsk(), 'a linebacker made as a one-position player'); let yes = 0; for (let y = 0; y < 30 && !cs.p.two; y++) { twS().asked = null; cs.year++; if (twAskCoach() === 'yes') yes++; } need(yes === 1 && cs.p.two === 'RB', 'asking the coach works within a few seasons');
need(twAskCoach() === 'no', 'a two-way player has nothing to ask for');
// pages
mk('WR', true, 44); ctab = 'home'; let h = vCHome(); need(h.includes('id="twplan"') && h.includes('data-act="ctwplan"'), 'the Home page should show the weekly two-way plan'); h = twoWayCardHTML(); need(h.includes('ctwsplit') && h.includes('ctwup') && h.includes('trust at CB'), 'the player page should show the training split, upgrades and trust');
// schools and the swap
const st = Object.keys(CTEAMS0).map(twStanceOf); need(['both', 'open', 'one'].every(s => st.filter(x => x === s).length > 15), 'schools should differ on two-way players');
const a = cs.p.a, a2 = cs.p.a2; need(twSwap() && cs.p.pos === 'CB' && cs.p.two === 'WR' && cs.p.a === a2 && cs.p.a2 === a, 'swapping makes the second position the main one');
// a full career that leans into it: awards, records, the draft and the NFL
mk('CB', true, 45); cs.p.auto = true; g = 0; let views = null, sawPlanNfl = false;
while (cs.phase !== 'retired' && g++ < 3000) {
  if (cs.p.two) { t = twS(); if (cs.lvl !== 'nfl') { t.plan = t.fat > 60 ? 'main' : 'second'; t.split = 50; } if (t.ask) twAnswer(t.ask.k === 'rest' ? 0 : 1); }
  if (cs.phase === 'done') { if (cs.done && cs.done.draft && !cs.nfl) { views = twDraftSplit(); need(twDraftHTML().includes('scouts are split'), 'the draft page should show how clubs see a two-way player'); nflStart(); if (cs.p.two && !twNfl()) { twS().nfl.pkg = true; } continue; } break; }
  if (cs.phase === 'sign') { const o = offersList(); if (o.length) signWith(o.slice().sort((x, y) => teamLevel(y.id) - teamLevel(x.id))[0].id); else break; continue; }
  if (cs.phase === 'nfl') { if (twNfl() && twoWayOn() && twShare2() > 0 && twoWayCardHTML().includes('package of snaps')) sawPlanNfl = true; if (cs.nfl.yrs >= 2) break; cSimWeek(); continue; }
  if (cs.phase === 'nfloff') { if (offStep() === 'nmoney') { nflMoneyStep(); if (cs.nfl.fa && !cs.nfl.fa.done) { if (cs.nfl.fa.offers.length) nflSign(0); else break; } } offNext(); continue; }
  const r = cSimUntil(null, { events: true, spend: true, max: 1 }); if (r === 'choice') { const s = offStep(); if (s === 'draft') declareDraft(true); else if (s === 'signing') { const o = offersList(); if (o.length) signWith(o.slice().sort((x, y) => teamLevel(y.id) - teamLevel(x.id))[0].id); offNext(); } else offNext(); }
}
const p = cs.p; t = twS(); const seas = p.seasons.filter(s => s.tw);
need(seas.filter(s => s.lvl === 'hs').length === 4 && seas.filter(s => s.lvl === 'col').length >= 3, 'every two-way season should be on record: ' + seas.map(s => s.lvl).join());
need(seas.every(s => s.tw.g <= 20) && t.c.g >= 60, 'season and career counts: ' + seas.map(s => s.tw.g).join() + ' / ' + t.c.g);
need(seas.filter(s => s.lvl === 'col').some(s => s.tw.sh >= 0.25), 'a player who works at it should earn real snaps in college: ' + seas.map(s => s.tw.sh).join());
need(cOvr2(p) >= 62, 'half the points should build a real second position: ' + cOvr2(p));
need(views && views.main + views.second + views.both === 32, 'all 32 clubs have a view'); need(cs.lvl === 'nfl' && sawPlanNfl, 'an NFL package lets you keep playing both ways');
// the save round-trips
cSave(); await cFlush(); const snap = JSON.stringify(cs.x.tw); cs = null; const r = await cLoadSlot(1); need(r && cs && JSON.stringify(cs.x.tw) === snap, 'the two-way record survives a save and load');
return { fail };
