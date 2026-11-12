// The optional real 2026 pack: the file itself, and what it does to a new career. Run with: node tests/realpack.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); };
  const file = path.join(__dirname, '..', 'packs', 'real-2026.json'); const pack = JSON.parse(fs.readFileSync(file, 'utf8')); const ids = Object.keys(pack.teams);
  // the file
  need(pack.v === 1 && pack.season === 2026 && ids.length === 138, 'the pack should cover 138 schools for 2026'); out.kb = Math.round(fs.statSync(file).size / 1024); need(out.kb < 1200, 'the pack is too large: ' + out.kb + ' KB');
  const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'LS']; let players = 0;
  ids.forEach(id => { const L = pack.teams[id]; players += L.length; if (L.length < 80) out.fail.push(id + ' has only ' + L.length + ' players'); L.forEach(p => { if (!p[0] || !POS.includes(p[1]) || !['Fr', 'So', 'Jr', 'Sr'].includes(p[2]) || /[<>]/.test(p[0] + p[6])) out.fail.push(id + ': bad player ' + JSON.stringify(p)); }); ['QB', 'RB', 'WR', 'OL', 'LB', 'CB'].forEach(pos => { if (!L.some(p => p[1] === pos)) out.fail.push(id + ' has nobody at ' + pos); }); });
  out.players = players; const cnt = {}, wk = {};
  pack.games.forEach(([w, h, a]) => { if (!(w >= 1 && w <= 13)) out.fail.push('a game is outside weeks 1 to 13'); [h, a].forEach(t => { if (t.startsWith('FCS:')) return; if (!pack.teams[t]) out.fail.push('unknown school in the schedule: ' + t); cnt[t] = (cnt[t] || 0) + 1; const k = t + ':' + w; if (wk[k]) out.fail.push(t + ' plays twice in week ' + w); wk[k] = 1; }); });
  ids.forEach(id => { if (!(cnt[id] >= 11 && cnt[id] <= 13)) out.fail.push(id + ' has ' + (cnt[id] || 0) + ' games'); }); out.games = pack.games.length; need(ids.filter(id => cnt[id] === 12).length >= 125, 'most schools should have twelve games');
  // in the game
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); p.setDefaultTimeout(0); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort()); await p.goto('file://' + (process.env.GAME || path.join(__dirname, '..', 'index.html'))); await p.waitForTimeout(600);
  const r = await p.evaluate(async (pack) => {
    const fail = []; const need = (ok, msg) => { if (!ok) fail.push(msg); }; const o = {}; const V = () => document.getElementById('view');
    await enterAD(); appMode = 'ad';
    // the same school and seed without the pack, for comparison
    REAL.want = false; newGame('normal', null, 7, 'OSU'); const base = { rating: T(ME).rating, str: Math.round(michStrength().ovr * 10) / 10, n: state.roster.length, top: state.roster.map(x => x.ovr).sort((a, b) => b - a).slice(0, 22).join() }; need(!X().realPack && !state.roster.some(x => x.real), 'a career without the pack has real players');
    REAL.pack = pack; REAL.status = 'ready'; REAL.want = true; newGame('normal', null, 7, 'OSU'); const names = new Set(pack.teams.OSU.map(x => x[0])); const real = state.roster.filter(x => x.real);
    o.osu = { real: real.length, roster: state.roster.length, str: Math.round(michStrength().ovr * 10) / 10 }; need(real.length >= 70 && real.every(x => names.has(x.n)), 'Ohio State should have its real players: ' + real.length);
    need(T(ME).rating === base.rating && Math.abs(o.osu.str - base.str) < 0.6, `the pack changed the team's strength: ${base.str} to ${o.osu.str}`); need(state.roster.map(x => x.ovr).sort((a, b) => b - a).slice(0, 22).join() === base.top, 'the best 22 ratings changed');
    need(real.every(x => ['leader', 'worker', 'clutch', 'steady'].includes(x.pers)), 'a real player was given a negative personality'); need(POS_ORDER.every(pos => (state.depth[pos] || []).length >= START[pos] && state.depth[pos].every(id => P(id) && P(id).pos === pos)), 'the depth chart is broken');
    need(new Set(state.roster.map(x => x.id)).size === state.roster.length && state.roster.length <= 125, 'the roster has duplicates or is too large');
    const qb = real.filter(x => x.pos === 'QB').sort((a, b) => b.ovr - a.ovr)[0]; const cl = { Fr: 0, So: 1, Jr: 2, Sr: 3 }; need(real.filter(x => x.pos === 'QB').every(x => cl[x.cls] <= cl[qb.cls]), 'the best quarterback should be from the oldest class on the roster');
    // the schedule
    const mine = mGames().filter(g => g.type === 'reg').map(g => g.wk + ':' + g.h + ':' + g.a).join(); const want = pack.games.filter(g => g[1] === 'OSU' || g[2] === 'OSU').map(g => g[0] + ':' + g[1] + ':' + g[2]).join(); need(mine === want, 'Ohio State does not have its real schedule: ' + mine);
    const reg = state.games.filter(g => g.type === 'reg'); need(reg.length === pack.games.length, 'the league does not have the real schedule: ' + reg.length); const twice = {}; reg.forEach(g => [g.h, g.a].forEach(t => { if (!isFCS(t)) { const k = t + g.wk; if (twice[k]) fail.push(t + ' plays twice in week ' + g.wk); twice[k] = 1; } }));
    need(reg.some(g => g.neutral) && reg.some(g => g.conf) && reg.some(g => isFCS(g.a) && teamName(g.a).length > 3), 'neutral sites, conference games or FCS opponents are missing');
    const stars = Object.values(state.teams).filter(t => t.id !== ME && t.stars && t.stars.some(s => s.real)).length; need(stars >= 130, 'other schools did not get real stars: ' + stars); need(X().realPack && X().realPack.season === 2026, 'the career is not marked as started with the pack');
    // every page draws, a season plays, and 2027 is scheduled the usual way
    const bad = []; TABS.map(t => t[0]).filter(tabVisible).forEach(k => { ui.tab = k; try { render(); if (/could not be shown/.test(V().textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } }); need(!bad.length, 'pages failed with the pack on: ' + bad); ui.tab = 'file'; render(); need(!!document.getElementById('realnote'), 'the Save file page does not mention the pack');
    let g = 0; while (state.phase !== 'offseason' && g++ < 60) advance(); const t = T(ME); o.season = t.w + '-' + t.l; need(t.w + t.l >= 12 && Object.values(state.teams).every(x => x.w + x.l >= 11), 'the real season did not play out');
    autoOffseason(); need(state.season === 2027 && mGames().filter(x => x.type === 'reg').length >= 11, 'the 2027 season was not scheduled'); need(state.roster.some(x => x.real) && state.roster.some(x => !x.real), 'real players should stay and new recruits should join');
    // Michigan keeps its own roster; the pack still gives it the real schedule for everyone
    REAL.want = false; newGame('normal', null, 7, 'MICH'); const m0 = state.roster.map(x => x.n + x.ovr).join(); REAL.want = true; newGame('normal', null, 7, 'MICH'); need(state.roster.map(x => x.n + x.ovr).join() === m0, 'the pack changed Michigan\'s roster'); need(state.games.filter(x => x.type === 'reg').length === pack.games.length, 'Michigan careers should get the real league schedule');
    // a school whose feed is missing a position still gets a full team
    newGame('normal', null, 7, 'SDSU'); need(POS_ORDER.every(pos => (state.depth[pos] || []).length >= START[pos]), 'a school with gaps in its real roster is missing starters');
    // Coach mode, and the switch on the new-career screen
    switchNS('coach'); newCoachCareer({ name: 'Pack Coach', start: 'any', tid: 'IOWA', role: 'HC', diff: 'normal', gameDay: 'plan', lvl: 'col', seed: 3 }); appMode = 'ad'; need(state.roster.filter(x => x.real).length >= 70 && X().realPack, 'a Coach career did not get the pack'); ui.tab = 'roster'; render(); need(!/could not be shown/.test(V().textContent), 'the Coach roster page broke');
    switchNS('ad'); await actions.gohome(); await new Promise(r => setTimeout(r, 200)); REAL.want = false; actions.homenew({ v: 'col' }); need(!!document.querySelector('[data-act=realpack]'), 'the school picker has no switch for the pack'); actions.realpack({ v: '1' }); need(REAL.want && /real 2026 schedule|real schedule for every other school/.test(V().textContent), 'switching the pack on does not say what it adds'); ui.nc.tid = 'OSU'; render(); need(/real players at this school/.test(V().textContent), 'the switch does not count the real players at the chosen school');
    await actions.adpickstart(); await new Promise(r => setTimeout(r, 400)); need(X().realPack && state.roster.some(x => x.real) && !REAL.want, 'starting a career with the switch on did not apply the pack, or left the switch on');
    newGame('normal', null, 9, 'TEX'); need(!X().realPack && !state.roster.some(x => x.real), 'the pack leaked into a career that did not ask for it');
    o.wide = document.documentElement.scrollWidth; o.fail = fail; return o;
  }, pack);
  r.fail.forEach(f => out.fail.push(f)); delete r.fail; Object.assign(out, r); errs.slice(0, 3).forEach(e => out.fail.push('page error: ' + e)); await b.close(); console.log(JSON.stringify(out));
})();
