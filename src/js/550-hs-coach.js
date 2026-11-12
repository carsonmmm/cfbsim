/* ===================== v9.61: High school coach =====================
 * You coach a high school team: forty kids, four years each, ten games and the playoffs. Develop them, win,
 * and send the best to college. Seniors who sign with a college are written to the device's shared register
 * (fe-world, "hs"), so an athletic director career with Shared world on finds them in the recruiting class of
 * the same year. A good enough coach gets offers: a bigger high school, and in time a college job, which can
 * start a Coach career with a head start. It runs in the shell in 530-mini-shell.js; it is a game of its own.
 * The career: { kind: 'hs', coach, school, year, wk, rep, comm, fund, up, roster, sched, rec, plan, style,
 * events, offers, alumni, hist, log, ach }. wk 0 is preseason, 1-10 the season, 11-14 the playoffs, 15 the offseason. */
const HS_POS = [['QB', 1, 3], ['RB', 2, 5], ['WR', 3, 7], ['OL', 5, 9], ['DL', 4, 7], ['LB', 3, 6], ['DB', 4, 7], ['K', 1, 1]]; // position, starters, on the roster
const HS_POSN = { QB: 'Quarterback', RB: 'Running back', WR: 'Receiver', OL: 'Offensive line', DL: 'Defensive line', LB: 'Linebacker', DB: 'Defensive back', K: 'Kicker' };
const HS_OFF = ['QB', 'RB', 'WR', 'OL'], HS_CLASS = { 9: 'Freshman', 10: 'Sophomore', 11: 'Junior', 12: 'Senior' };
const HS_TIER = [null, ['Small school', 'A few hundred students. Everybody plays both ways and the whole town comes on Friday.'], ['Mid-size', 'A solid program in a good district.'], ['Big-city power', 'Two thousand students, college scouts at every game, and no patience.']];
const HS_FOCUS = { fund: ['Fundamentals', 'Players improve faster all year.'], off: ['Offense', 'A sharper offense on Fridays.'], def: ['Defense', 'A sharper defense on Fridays.'], cond: ['Conditioning', 'Fewer injuries, and stronger in the playoffs.'] };
const HS_STYLE = { run: ['Run the ball', 'Leans on the line and the backs.'], bal: ['Balanced', 'No weakness, no edge.'], spread: ['Spread it out', 'Leans on the quarterback and the receivers.'] };
const HS_UP = { weight: ['Weight room', 'Players improve faster.', 6], youth: ['Youth program', 'Better freshmen every year.', 8], film: ['Film room', 'An edge every Friday.', 5] }; // cost in thousands, for level one
const HS_OPP = ['Central', 'North', 'East', 'West', 'South', 'Lincoln', 'Jefferson', 'Roosevelt', 'Washington', 'St. Mary\'s', 'Riverside', 'Lakeview', 'Hillcrest', 'Valley', 'Mountain View', 'Oak Grove', 'Cedar Ridge', 'Pine Bluff', 'Franklin', 'Madison'];
const hsStars = ovr => (ovr >= 88 ? 5 : ovr >= 80 ? 4 : ovr >= 71 ? 3 : ovr >= 62 ? 2 : 0);
const hsLog = (g, t, tone) => { g.log.unshift({ y: g.year, wk: g.wk, t, tone: tone || '' }); if (g.log.length > 60) g.log.length = 60; };
const hsId = g => 'h' + (g.nid = (g.nid || 0) + 1);
const hsMoney = k => '$' + Math.round(k * 1000).toLocaleString('en-US');
function hsFrosh(g, pos) { const tier = g.school.tier; const pot = clamp(Math.round(56 + tier * 3 + g.up.youth * 3 + g.rep / 14 + gauss() * 11), 34, 96); return { id: hsId(g), n: genName(), pos, cls: 9, pot, ovr: clamp(Math.round(pot - rnd(20, 32)), 26, 70), work: ri(35, 95), gp: 0 }; }
function hsClassIn(g) { const add = []; HS_POS.forEach(([pos, st, n]) => { const have = g.roster.filter(p => p.pos === pos).length; for (let i = have; i < n; i++) add.push(hsFrosh(g, pos)); }); for (let i = 0; i < 2; i++) add.push(hsFrosh(g, pick(['WR', 'DB', 'LB', 'OL', 'RB']))); g.roster.push(...add); return add.length; }
function hsNewSchool(g, tier, town) {
  g.school = { name: town[0].split(',')[0] + ' High', town: town[0], st: town[1], mascot: pick(HS_MASCOTS), tier }; g.roster = [];
  HS_POS.forEach(([pos, st, n]) => { for (let i = 0; i < n; i++) { const p = hsFrosh(g, pos); p.cls = 9 + (i % 4); const yrs = p.cls - 9; p.ovr = clamp(Math.round(p.ovr + (p.pot - p.ovr) * (1 - Math.pow(0.72, yrs)) + gauss() * 2), 26, p.pot); g.roster.push(p); } });
}
function hsSchedule(g) { const base = 44 + g.school.tier * 6; const names = shuffle(HS_OPP.slice()); g.sched = Array.from({ length: 10 }, (_, i) => ({ wk: i + 1, opp: names[i], r: clamp(Math.round(base + gauss() * 6 + (i >= 7 ? 3 : 0)), 34, 86), home: i % 2 === 0, res: null })); g.rec = { w: 0, l: 0 }; g.po = null; }
function hsNew(f) {
  const g = { kind: 'hs', v: 1, coach: { name: plainName(f.name, 28) || 'Sam Whitaker' }, school: null, year: 2026, wk: 0, rep: 20, comm: 55, fund: 4, up: { weight: 0, youth: 0, film: 0 }, roster: [], sched: [], rec: { w: 0, l: 0 }, plan: 'fund', style: 'bal', events: [], offers: [], alumni: [], hist: [], log: [], ach: {}, nid: 0, dev: 3, titles: 0, seed: Math.floor(R() * 1e9) };
  const town = TOWNS.find(t => t[0] === f.town) || pick(TOWNS); hsNewSchool(g, 1, town); hsSchedule(g); hsLog(g, `${g.coach.name} is the new head coach at ${g.school.name}, home of the ${g.school.mascot}.`); return g;
}
function hsCheck(g) { if (!g || !g.coach || !g.school || !Array.isArray(g.roster)) return null; g.sched = g.sched || []; g.events = g.events || []; g.offers = g.offers || []; g.alumni = g.alumni || []; g.hist = g.hist || []; g.log = g.log || []; g.ach = g.ach || {}; g.up = Object.assign({ weight: 0, youth: 0, film: 0 }, g.up); g.rec = g.rec || { w: 0, l: 0 }; return g; }
const hsAch = (g, k, t) => { if (!g.ach[k]) { g.ach[k] = g.year; hsLog(g, 'Milestone: ' + t, 'good'); } };
/* ---------- the team on Friday ---------- */
const hsStarters = (g, pos) => { const n = HS_POS.find(x => x[0] === pos)[1]; return g.roster.filter(p => p.pos === pos && !p.out && !p.sit).sort((a, b) => b.ovr - a.ovr).slice(0, n); };
function hsRating(g) {
  let off = 0, def = 0, ow = 0, dw = 0; const w = { run: { QB: 1.4, RB: 1.5, WR: 0.7, OL: 1.4 }, bal: { QB: 1.8, RB: 1, WR: 1, OL: 1.1 }, spread: { QB: 2.4, RB: 0.7, WR: 1.4, OL: 0.9 } }[g.style] || {};
  HS_POS.forEach(([pos, n]) => { if (pos === 'K') return; const st = hsStarters(g, pos); const sum = st.reduce((s, p) => s + p.ovr, 0) + (n - st.length) * 30; if (HS_OFF.includes(pos)) { off += sum * (w[pos] || 1); ow += n * (w[pos] || 1); } else { def += sum; dw += n; } });
  off = off / ow + (g.plan === 'off' ? 2.5 : 0); def = def / dw + (g.plan === 'def' ? 2.5 : 0); return { off, def, all: (off + def) / 2 + g.up.film * 0.8 };
}
function hsPlay(g, opp, home, playoff) {
  const R_ = hsRating(g); const edge = R_.all - opp + (home ? 1.5 : -1.5) + (playoff && g.plan === 'cond' ? 1.5 : 0) + (g.boost || 0); g.boost = 0; const p = clamp(1 / (1 + Math.exp(-edge / 6)), 0.03, 0.97);
  const win = R() < p; const base = 21 + (R_.off - 55) * 0.35 + gauss() * 6; let us = Math.max(0, Math.round(base + (win ? 6 : -4))), them = Math.max(0, Math.round(20 + (opp - R_.def) * 0.4 + gauss() * 6 + (win ? -5 : 5)));
  if (win && us <= them) us = them + ri(1, 8); if (!win && them <= us) them = us + ri(1, 8);
  HS_POS.forEach(([pos]) => hsStarters(g, pos).forEach(x => { x.gp = (x.gp || 0) + 1; }));
  return { win, us, them, p };
}
// one week of practice: everybody gets a little better, the ones who work at it more so
function hsGrow(g, weeks) { g.roster.forEach(p => { const starter = hsStarters(g, p.pos).includes(p); p.ovr = clamp(Math.round((p.ovr + (p.pot - p.ovr) * 0.011 * weeks * (0.55 + p.work / 100) * (1 + g.up.weight * 0.14) * (starter ? 1.15 : 0.9) * (g.plan === 'fund' ? 1.2 : 1) * (p.dev ? 1.8 : 1)) * 10) / 10, 26, 99); }); }
const hsOvr = p => Math.round(p.ovr);
/* ---------- decisions during the season ---------- */
const hsBest = (g, f) => g.roster.filter(p => !p.out && (!f || f(p))).sort((a, b) => b.ovr - a.ovr)[0];
const HS_EVENTS = [
  { k: 'grades', pick: g => hsBest(g, p => p.cls >= 10), t: (g, p) => `${p.n}, your best ${HS_POSN[p.pos].toLowerCase()}, is failing algebra. By the rules he sits this Friday.`,
    o: [['Sit him', 'The rules are the rules. The town grumbles; he learns something.', (g, p) => { p.sit = 1; p.work = clamp(p.work + 8, 0, 99); g.rep = clamp(g.rep + 1, 0, 100); g.comm = clamp(g.comm - 3, 0, 100); return `${p.n} watches from the sideline in street clothes.`; }], ['Ask the teacher for a favor', 'He plays. If it gets around, it costs you.', (g, p) => { if (R() < 0.35) { g.rep = clamp(g.rep - 7, 0, 100); g.comm = clamp(g.comm - 4, 0, 100); return 'The teacher tells the principal. It is all over town by Monday.'; } return 'The grade is changed to an incomplete. He plays.'; }], ['Pay for a tutor', `${hsMoney(1)} from the booster fund. He sits this week and is fine after.`, (g, p) => { if (g.fund < 1) return 'There is no money for a tutor.'; g.fund = r1(g.fund - 1); p.sit = 1; p.work = clamp(p.work + 12, 0, 99); g.comm = clamp(g.comm + 2, 0, 100); return `${p.n} sits one game and gets his grade up.`; }]] },
  { k: 'parent', pick: g => g.roster.filter(p => p.cls >= 11 && !hsStarters(g, p.pos).includes(p))[0], t: (g, p) => `The father of ${p.n}, a ${HS_CLASS[p.cls].toLowerCase()} who does not start, wants a word about playing time. He is on the booster board.`,
    o: [['Start the kid this week', 'The boosters are pleased. You are a little weaker on Friday.', (g, p) => { g.comm = clamp(g.comm + 5, 0, 100); g.boost = -2; g.fund = r1(g.fund + 1); return `${p.n} starts. His father writes a check.`; }], ['Hold your ground', 'The best players play.', (g, p) => { g.comm = clamp(g.comm - 4, 0, 100); g.rep = clamp(g.rep + 1, 0, 100); return 'You tell him the depth chart is earned. He is not pleased.'; }], ['Give the kid extra work', 'One of your development sessions goes to him.', (g, p) => { p.dev = 1; p.work = clamp(p.work + 6, 0, 99); g.comm = clamp(g.comm + 1, 0, 100); return `You stay late with ${p.n} twice a week.`; }]] },
  { k: 'private', pick: g => hsBest(g, p => p.cls === 11 || p.cls === 10), t: (g, p) => `A private school two towns over is telling ${p.n}'s family he would get more attention from colleges there.`,
    o: [['Sit down with the family', 'A good reputation keeps him.', (g, p) => { if (R() < 0.35 + g.rep / 110) { p.work = clamp(p.work + 4, 0, 99); return `${p.n} is staying.`; } g.roster = g.roster.filter(x => x !== p); g.comm = clamp(g.comm - 3, 0, 100); return `${p.n} transfers. The town takes it hard.`; }], ['Let him decide', 'It costs nothing.', (g, p) => { if (R() < 0.5) return `${p.n} stays with his friends.`; g.roster = g.roster.filter(x => x !== p); return `${p.n} transfers.`; }]] },
  { k: 'scout', pick: g => hsBest(g, p => p.cls === 12), t: (g, p) => `A college assistant is coming to Friday's game. He has time to watch one senior closely.`,
    o: [['Point him at your best senior', 'A better chance at a bigger school.', (g, p) => { p.seen = (p.seen || 0) + 1; return `He leaves with ${p.n}'s film and your phone number.`; }], ['Point him at a kid who needs the look', 'A senior who would not otherwise be noticed.', (g, p) => { const q = g.roster.filter(x => x.cls === 12 && x !== p && hsStars(x.ovr) <= 2).sort((a, b) => b.ovr - a.ovr)[0] || p; q.seen = (q.seen || 0) + 2; g.rep = clamp(g.rep + 1, 0, 100); return `He spends the night watching ${q.n}.`; }]] },
  { k: 'booster', pick: g => g.roster.filter(p => p.cls >= 10 && !hsStarters(g, p.pos).includes(p))[0], t: (g, p) => `A car dealer offers ${hsMoney(6)} for new uniforms. His son is ${p.n}, and he mentions that the boy has not been playing much.`,
    o: [['Take the money and play the boy', 'The fund grows. People notice why.', (g, p) => { g.fund = r1(g.fund + 6); g.boost = -2; g.rep = clamp(g.rep - 3, 0, 100); return 'The uniforms are sharp. The whispers are not.'; }], ['Take nothing', 'Your depth chart is not for sale.', (g, p) => { g.rep = clamp(g.rep + 2, 0, 100); g.comm = clamp(g.comm - 2, 0, 100); return 'You thank him and say no.'; }]] },
];
function hsMaybeEvent(g) { if (g.events.some(e => !e.done) || R() > 0.34) return; const used = new Set(g.events.map(e => e.k)); const def = shuffle(HS_EVENTS.slice()).find(e => !used.has(e.k) && e.pick(g)); if (!def) return; const p = def.pick(g); g.events.push({ k: def.k, pid: p.id, t: def.t(g, p), wk: g.wk, done: false }); }
function hsEvent(g, i, opt) { const e = g.events[i]; if (!e || e.done) return ''; const def = HS_EVENTS.find(x => x.k === e.k); const p = g.roster.find(x => x.id === e.pid); e.done = true; if (!def || !p) return ''; const m = def.o[opt][2](g, p); e.res = m; hsLog(g, m); return m; }
/* ---------- the year ---------- */
function hsDev(g, pid) { const p = g.roster.find(x => x.id === pid); if (!p || g.wk !== 0 || g.dev <= 0 || p.dev) return false; p.dev = 1; g.dev--; return true; }
function hsWeek(g) {
  if (g.wk === 0) { g.roster.forEach(p => { p.sit = 0; }); g.wk = 1; return 'start'; }
  g.events.filter(e => !e.done).forEach(e => hsEvent(g, g.events.indexOf(e), g.events.indexOf(e) >= 0 ? 1 : 1));
  if (g.wk >= 1 && g.wk <= 10) { const s = g.sched[g.wk - 1]; const r = hsPlay(g, s.r, s.home, false); s.res = r; if (r.win) g.rec.w++; else g.rec.l++; hsLog(g, `Week ${g.wk}: ${r.win ? 'beat' : 'lost to'} ${s.opp}, ${r.us}-${r.them}.`, r.win ? 'good' : 'bad'); g.roster.forEach(p => { p.sit = 0; });
    if (R() < 0.1 - (g.plan === 'cond' ? 0.05 : 0)) { const p = pick(g.roster.filter(x => !x.out)); if (p) { p.out = 1; hsLog(g, `${p.n} (${p.pos}) is hurt and out for the season.`, 'bad'); } }
    hsGrow(g, 1); g.wk++; if (g.wk <= 10) hsMaybeEvent(g); else { if (g.rec.w >= 6) { g.po = { rd: 1, alive: true, log: [] }; hsLog(g, `${g.school.name} makes the playoffs at ${g.rec.w}-${g.rec.l}.`, 'good'); } else { g.po = { rd: 0, alive: false, log: [] }; g.wk = 15; hsSeasonEnd(g); } } return 'game'; }
  if (g.wk >= 11 && g.wk <= 14) { const rd = g.wk - 10; const opp = clamp(Math.round(49 + g.school.tier * 6 + rd * 3 + gauss() * 4), 40, 92); const r = hsPlay(g, opp, rd <= 2 && g.rec.w >= 8, true); const nm = ['', 'first round', 'quarterfinal', 'semifinal', 'state championship'][rd]; g.po.log.push({ rd, r }); hsLog(g, `Playoffs, ${nm}: ${r.win ? 'won' : 'lost'} ${r.us}-${r.them}.`, r.win ? 'good' : 'bad'); hsGrow(g, 1);
    if (!r.win) { g.po.alive = false; g.po.rd = rd; g.wk = 15; hsSeasonEnd(g); } else if (rd === 4) { g.po.rd = 5; g.titles++; g.wk = 15; hsLog(g, `${g.school.name} wins the state championship.`, 'good'); hsAch(g, 'title', 'a state championship.'); hsSeasonEnd(g); } else { g.po.rd = rd + 1; g.wk++; } return 'playoff'; }
  if (g.wk === 15) { hsNewYear(g); return 'year'; }
}
const hsToCollege = (g, p, stars) => { const band = stars >= 5 ? [84, 99] : stars === 4 ? [74, 90] : stars === 3 ? [62, 80] : [40, 66]; const pool = Object.entries(CTEAMS0_AD).filter(([, t]) => t.base >= band[0] && t.base <= band[1]); const near = pool.filter(([id]) => TEAM_STATE[id] === g.school.st); return (near.length && R() < 0.45 ? pick(near) : pick(pool.length ? pool : Object.entries(CTEAMS0_AD)))[0]; };
const HS_TO_POS = { QB: ['QB'], RB: ['RB'], WR: ['WR', 'WR', 'TE'], OL: ['OL'], DL: ['DE', 'DT'], LB: ['LB'], DB: ['CB', 'S'], K: ['K'] };
function hsSeasonEnd(g) {
  const po = g.po || { rd: 0 }; const w = g.rec.w, l = g.rec.l; const exp = 5 + (hsRating(g).all - (44 + g.school.tier * 6)) * 0.25;
  const d = Math.round((w - exp) * 1.1 + [0, 0, 1, 3, 5, 9][Math.min(5, po.rd)]); g.rep = clamp(g.rep + d, 0, 100); g.comm = clamp(g.comm + Math.round((w - 5) * 2 + (po.rd >= 3 ? 6 : 0)), 0, 100);
  // signing day: where the seniors are going
  const signed = []; const reg = []; g.roster.filter(p => p.cls === 12).forEach(p => { let stars = hsStars(hsOvr(p)); if (p.seen && stars && stars < 5 && R() < 0.35 * p.seen) stars++; if (!stars) { g.alumni.push({ n: p.n, pos: p.pos, y: g.year + 1, stars: 0, to: null }); return; }
    const tid = hsToCollege(g, p, stars); const a = { n: p.n, pos: p.pos, y: g.year + 1, stars, to: tid, ovr: hsOvr(p) }; g.alumni.push(a); signed.push(a); g.rep = clamp(g.rep + (stars >= 4 ? 1 : 0), 0, 100);
    const cpos = pick(HS_TO_POS[p.pos]); const covr = stars === 5 ? ri(69, 75) : stars === 4 ? ri(62, 69) : stars === 3 ? ri(54, 63) : ri(45, 55); reg.push({ k: 'hs:' + g.seed + ':' + p.id, n: p.n, pos: cpos, stars, ovr: covr, pot: clamp(covr + ri(12, 24), covr, 99), cls: g.year + 1, hs: g.school.name, town: g.school.town, st: g.school.st, coach: g.coach.name, t: Date.now() }); });
  if (signed.length) hsLog(g, `Signing day: ${signed.length} senior${signed.length > 1 ? 's' : ''} will play in college. ${signed.slice().sort((a, b) => b.stars - a.stars).slice(0, 3).map(a => `${a.n} (${a.stars}-star) to ${CTEAMS0_AD[a.to].name}`).join('; ')}.`, 'good');
  if (signed.some(a => a.stars >= 4)) hsAch(g, 'blue', 'a four-star recruit.'); if (signed.some(a => a.stars >= 5)) hsAch(g, 'five', 'a five-star recruit.'); if (g.alumni.filter(a => a.to).length >= 20) hsAch(g, 'twenty', 'twenty players sent to college.');
  try { if (reg.length && typeof worldGet === 'function') { const W = worldGet(); W.hs = (W.hs || []).concat(reg).sort((a, b) => (b.t || 0) - (a.t || 0) || b.stars - a.stars).slice(0, 40); worldPut(W); } } catch (e) { }
  const gift = r1(clamp(g.comm / 12 + (po.rd >= 1 ? 2 : 0) + po.rd, 1, 20)); g.fund = r1(g.fund + gift);
  g.hist.push({ y: g.year, school: g.school.name, w, l, po: po.rd, rep: g.rep, signed: signed.length, best: signed.length ? Math.max(...signed.map(a => a.stars)) : 0 }); g.signed = signed; g.gift = gift;
  if (w === 10) hsAch(g, 'perfect', 'a perfect regular season.'); if (g.hist.length >= 10) hsAch(g, 'decade', 'ten seasons on the sideline.');
  // who is calling
  g.offers = []; if (g.school.tier < 3 && g.rep >= 30 + g.school.tier * 18 && R() < 0.7) { const town = pick(TOWNS); g.offers.push({ k: 'hs', tier: g.school.tier + 1, town, name: town[0].split(',')[0] + ' High' }); }
  if (g.rep >= 70 && g.hist.length >= 4) { const pool = Object.entries(CTEAMS0_AD).filter(([, t]) => t.base <= 72); const near = pool.filter(([id]) => TEAM_STATE[id] === g.school.st); const [tid] = pick(near.length ? near : pool); g.offers.push({ k: 'col', tid, role: R() < 0.5 ? 'RB' : 'LB' }); hsAch(g, 'call', 'a job offer from a college.'); }
}
function hsNewYear(g) {
  g.roster = g.roster.filter(p => p.cls < 12); g.roster.forEach(p => { p.cls++; p.out = 0; p.sit = 0; p.dev = 0; p.seen = 0; p.ovr = clamp(Math.round((p.ovr + (p.pot - p.ovr) * (0.2 + p.work / 500 + g.up.weight * 0.03)) * 10) / 10, 26, 99); });
  const n = hsClassIn(g); g.year++; g.wk = 0; g.dev = 3; g.events = []; g.offers = []; g.signed = null; hsSchedule(g); hsLog(g, `${n} freshmen come out for the team.`);
}
function hsTakeJob(g, i) {
  const o = g.offers[i]; if (!o || g.wk !== 15) return '';
  if (o.k === 'hs') { const from = g.school.name; hsNewYear(g); hsNewSchool(g, o.tier, o.town); hsSchedule(g); g.comm = 55; g.fund = r1(4 + o.tier * 3); g.up = { weight: 0, youth: 0, film: 0 }; const m = `${g.coach.name} leaves ${from} for ${g.school.name}.`; hsLog(g, m); return m; }
  return '';
}
const hsUpCost = (g, k) => HS_UP[k][2] * (g.up[k] + 1);
function hsUpgrade(g, k) { if (!HS_UP[k] || g.up[k] >= 3 || g.fund < hsUpCost(g, k)) return false; g.fund = r1(g.fund - hsUpCost(g, k)); g.up[k]++; hsLog(g, `${HS_UP[k][0]}: level ${g.up[k]}.`); return true; }
const hsLegacy = g => Math.round(g.rep + g.titles * 25 + g.alumni.reduce((s, a) => s + (a.stars >= 4 ? 6 : a.stars === 3 ? 2 : a.stars ? 1 : 0), 0) + g.hist.reduce((s, h) => s + h.w, 0) * 0.5);

/* ---------- the pages ---------- */
const hsNextLabel = g => (g.wk === 0 ? 'Start the season' : g.wk <= 10 ? `Play week ${g.wk}: ${g.sched[g.wk - 1].home ? 'vs.' : 'at'} ${g.sched[g.wk - 1].opp}` : g.wk <= 14 ? 'Play the ' + ['', 'first round', 'quarterfinal', 'semifinal', 'state championship'][g.wk - 10] : `Start ${g.year + 1}`);
function hsHeader(g) { const R_ = hsRating(g); return { title: g.school.name, sub: `${g.coach.name}, head coach · ${g.school.mascot} · ${g.school.town} · ${g.year}`, cells: [['Record', g.rec.w + '-' + g.rec.l, g.wk === 0 ? 'Preseason' : g.wk <= 10 ? 'Week ' + g.wk : g.wk <= 14 ? 'Playoffs' : 'Offseason'], ['Team', String(Math.round(R_.all)), HS_TIER[g.school.tier][0]], ['Reputation', String(g.rep)], ['Booster fund', hsMoney(g.fund)]], primary: [hsNextLabel(g), 'hsnext'] }; }
function hsOfficeHTML(g) {
  const ev = g.events.map((e, i) => { const def = HS_EVENTS.find(x => x.k === e.k); return e.done ? '' : `<section class="card decision"><div class="eyebrow">Decision needed · week ${e.wk}</div><h2 class="h3">${esc(e.t)}</h2><div class="evopts">${def.o.map((o, j) => `<button class="evopt" data-act="hsev" data-i="${i}" data-v="${j}"><b>${esc(o[0])}</b><span>${esc(o[1])}</span></button>`).join('')}</div></section>`; }).join('');
  let main;
  if (g.wk === 0) main = `<section class="card next"><div class="eyebrow">${g.year} · Preseason</div><h2 class="h2">Two-a-days</h2><p>Set how you will practice and what you will run, and choose up to three players to work with yourself. Then start the season.</p>
    <div class="eyebrow mt">Practice</div><div>${seg('hsplan', g.plan, Object.entries(HS_FOCUS).map(([k, d]) => [k, d[0]]))}</div><p class="small muted">${esc(HS_FOCUS[g.plan][1])}</p>
    <div class="eyebrow mt">Offense</div><div>${seg('hsstyle', g.style, Object.entries(HS_STYLE).map(([k, d]) => [k, d[0]]))}</div><p class="small muted">${esc(HS_STYLE[g.style][1])}</p>
    <p class="small mt">One-on-one sessions left: <b>${g.dev}</b>. Choose players on the Roster page; they improve almost twice as fast this year.</p></section>`;
  else if (g.wk <= 14) { const last = g.wk <= 10 ? g.sched[g.wk - 2] : null; const nxt = g.wk <= 10 ? g.sched[g.wk - 1] : null; main = `<section class="card next"><div class="eyebrow">${g.year} · ${g.wk <= 10 ? 'Week ' + g.wk + ' of 10' : 'Playoffs'}</div><h2 class="h2">${g.wk <= 10 ? `${nxt.home ? 'Home against' : 'On the road at'} ${esc(nxt.opp)}` : 'Win or go home'}</h2>${nxt ? `<p>They rate about ${nxt.r}. You rate ${Math.round(hsRating(g).all)}.</p>` : `<p>${esc(g.school.name)} is ${g.rec.w}-${g.rec.l}. Each round is harder than the last.</p>`}${last && last.res ? `<p class="small muted">Last week: ${last.res.win ? 'beat' : 'lost to'} ${esc(last.opp)}, ${last.res.us}-${last.res.them}.</p>` : ''}${g.wk <= 10 ? '<div class="row gap"><button class="btn ghost sm" data-act="hssim">Sim to the end of the regular season</button></div>' : ''}</section>`; }
  else { const h = g.hist[g.hist.length - 1] || {}; main = `<section class="card next"><div class="eyebrow">${g.year} · Season over</div><h2 class="h2">${h.w}-${h.l}${h.po === 5 ? ' · State champions' : h.po ? ' · ' + ['', 'Lost in the first round', 'Lost in the quarterfinal', 'Lost in the semifinal', 'Lost the state championship'][h.po] : ' · Missed the playoffs'}</h2>
    <div class="tiles"><div><span class="k">Reputation</span><span class="v">${g.rep}</span></div><div><span class="k">Signed with colleges</span><span class="v">${(g.signed || []).length}</span></div><div><span class="k">Boosters gave</span><span class="v">${hsMoney(g.gift || 0)}</span></div><div><span class="k">Legacy</span><span class="v">${hsLegacy(g)}</span></div></div>
    ${(g.signed || []).length ? `<div class="eyebrow mt">Signing day</div><ul class="plainlist">${g.signed.slice().sort((a, b) => b.stars - a.stars).map(a => `<li><b>${esc(a.n)}</b>, ${a.pos} · ${'★'.repeat(a.stars)} · ${esc(CTEAMS0_AD[a.to].name)}</li>`).join('')}</ul><p class="small muted">With Shared world on, these players are on the recruiting board of the same year in your athletic director careers on this device.</p>` : '<p class="muted">No senior signed with a college this year.</p>'}</section>
    ${g.offers.map((o, i) => o.k === 'hs' ? `<section class="card decision"><div class="eyebrow">A job offer</div><h2 class="h3">${esc(o.name)} wants you</h2><p>${esc(HS_TIER[o.tier][0])}: ${esc(HS_TIER[o.tier][1])} Better players, tougher opponents, and you start over with the boosters.</p><div class="row gap">${mui.confirm === 'hsjob' + i ? `<button class="btn danger" data-act="hsjob" data-i="${i}">Confirm: take the job</button>` : `<button class="btn" data-act="mask" data-k="hsjob${i}">Take the job</button>`}</div></section>`
      : `<section class="card decision"><div class="eyebrow">A college is calling</div><h2 class="h3">${esc(CTEAMS0_AD[o.tid].name)} offers you a job coaching ${esc(ROLE_TITLE[o.role].toLowerCase())}</h2><p>This ends your time as a high school coach and starts a Coach career at ${esc(CTEAMS0_AD[o.tid].name)}, with a reputation head start. It needs a free Coach save slot. Your high school career stays in its slot.</p><div class="row gap">${mui.confirm === 'hscol' + i ? `<button class="btn danger" data-act="hscol" data-i="${i}">Confirm: go to college</button>` : `<button class="btn" data-act="mask" data-k="hscol${i}">Take the job</button>`}</div></section>`).join('')}`; }
  const first = !g.hist.length && g.wk === 0 ? `<section class="card"><div class="eyebrow">How it works</div><p class="small">You get every player for four years. They improve with practice, faster if they work hard and if you spend time on them. Win on Fridays to build your reputation and the booster fund, and send your seniors to college. A good enough coach gets a call from a bigger school, and one day from a college.</p></section>` : '';
  return `${ev}${main}${first}<section class="card"><div class="eyebrow">Latest</div><ul class="plainlist small">${g.log.slice(0, 10).map(x => `<li><span class="muted">${x.y}</span> · <span class="${x.tone === 'good' ? 'res-w' : x.tone === 'bad' ? 'res-l' : ''}">${esc(x.t)}</span></li>`).join('')}</ul></section>`;
}
function hsRosterHTML(g) {
  const rows = HS_POS.map(([pos]) => { const st = hsStarters(g, pos); return g.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => { const s = hsStars(hsOvr(p));
    return `<tr><td><b>${esc(p.n)}</b>${st.includes(p) ? ' <span class="pill maize">Starter</span>' : ''}${p.out ? ' <span class="pill bad">Hurt</span>' : ''}${p.sit ? ' <span class="pill warn">Sitting</span>' : ''}</td><td>${p.pos}</td><td>${HS_CLASS[p.cls]}</td><td>${ovrTag(hsOvr(p))}</td><td class="num">${p.pot}</td><td>${p.work >= 75 ? 'Tireless' : p.work >= 50 ? 'Steady' : 'Coasts'}</td><td>${s ? '★'.repeat(s) : '<span class="muted">—</span>'}</td><td>${p.dev ? '<span class="pill good">Working with you</span>' : g.wk === 0 && g.dev > 0 ? `<button class="btn sm ghost" data-act="hsdev" data-id="${p.id}">Work with him</button>` : ''}</td></tr>`; }).join(''); }).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Roster</div><h2 class="h2">${g.roster.length} players</h2></div><p class="hint">The best at each position start. Stars are what college recruiters would call him today; a senior needs two to sign anywhere. In the preseason you can pick ${g.dev} more player${g.dev === 1 ? '' : 's'} to work with yourself.</p></div><div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Class</th><th>Overall</th><th class="num">Potential</th><th>Work ethic</th><th>Recruit</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function hsScheduleHTML(g) {
  return `<section class="card"><div class="eyebrow">${g.year} schedule</div><div class="tw"><table class="tbl"><thead><tr><th>Week</th><th>Opponent</th><th class="num">Rating</th><th>Result</th></tr></thead><tbody>${g.sched.map(s => `<tr><td>${s.wk}</td><td>${s.home ? 'vs.' : 'at'} ${esc(s.opp)}</td><td class="num">${s.r}</td><td>${s.res ? `<b class="${s.res.win ? 'res-w' : 'res-l'}">${s.res.win ? 'W' : 'L'}</b> ${s.res.us}-${s.res.them}` : ''}</td></tr>`).join('')}${g.po && g.po.log ? g.po.log.map(x => `<tr><td>Playoffs</td><td>${['', 'First round', 'Quarterfinal', 'Semifinal', 'State championship'][x.rd]}</td><td></td><td><b class="${x.r.win ? 'res-w' : 'res-l'}">${x.r.win ? 'W' : 'L'}</b> ${x.r.us}-${x.r.them}</td></tr>`).join('') : ''}</tbody></table></div><p class="small muted">Six wins makes the playoffs.</p></section>`;
}
function hsAlumniHTML(g) {
  const A = g.alumni.filter(a => a.to).slice().reverse();
  return `<section class="card"><div class="head"><div><div class="eyebrow">In college</div><h2 class="h2">${A.length} player${A.length === 1 ? '' : 's'} sent on</h2></div><p class="hint">Every senior who signed with a college. With Shared world on, they appear on the recruiting board of the same year in your athletic director careers on this device.</p></div>${A.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Class of</th><th>Recruit</th><th>College</th></tr></thead><tbody>${A.map(a => `<tr><td><b>${esc(a.n)}</b></td><td>${a.pos}</td><td>${a.y}</td><td>${'★'.repeat(a.stars)}</td><td>${esc(CTEAMS0_AD[a.to] ? CTEAMS0_AD[a.to].name : a.to)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nobody yet. A senior needs to be a two-star recruit or better to sign.</p>'}</section>`;
}
const HS_ACH = { title: 'A state championship', perfect: 'A perfect regular season', blue: 'A four-star recruit', five: 'A five-star recruit', twenty: 'Twenty players sent to college', decade: 'Ten seasons', call: 'A college calls' };
function hsProgramHTML(g) {
  const ups = Object.entries(HS_UP).map(([k, d]) => `<div class="setrow"><div class="sl"><b>${esc(d[0])} · level ${g.up[k]} of 3</b><span class="hint">${esc(d[1])}</span></div><div class="sctl">${g.up[k] >= 3 ? '<span class="pill maize">Full</span>' : `<button class="btn sm" data-act="hsup" data-v="${k}"${g.fund < hsUpCost(g, k) ? ' disabled' : ''}>Build · ${hsMoney(hsUpCost(g, k))}</button>`}</div></div>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">The program · ${esc(HS_TIER[g.school.tier][0])}</div><h2 class="h2">Legacy ${hsLegacy(g)}</h2></div><p class="hint">The boosters give more when the town is behind you and when you win in the playoffs. What you build stays with the school if you leave.</p></div>
   <div class="tiles"><div><span class="k">Booster fund</span><span class="v">${hsMoney(g.fund)}</span></div><div><span class="k">Town support</span><span class="v">${g.comm}</span></div><div><span class="k">State titles</span><span class="v">${g.titles}</span></div><div><span class="k">Career record</span><span class="v">${g.hist.reduce((s, h) => s + h.w, 0)}-${g.hist.reduce((s, h) => s + h.l, 0)}</span></div></div>${ups}</section>
   <section class="card"><div class="eyebrow">Milestones</div><ul class="plainlist">${Object.entries(HS_ACH).map(([k, t]) => `<li>${g.ach[k] ? `<b>${esc(t)}</b> <span class="small muted">· ${g.ach[k]}</span>` : `<span class="muted">${esc(t)}</span>`}</li>`).join('')}</ul></section>
   ${g.hist.length ? `<section class="card"><div class="eyebrow">Season by season</div><div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>School</th><th>Record</th><th>Playoffs</th><th class="num">Signed</th><th class="num">Reputation</th></tr></thead><tbody>${g.hist.slice().reverse().map(h => `<tr><td>${h.y}</td><td>${esc(h.school)}</td><td>${h.w}-${h.l}</td><td>${h.po === 5 ? 'State champions' : h.po ? ['', 'First round', 'Quarterfinal', 'Semifinal', 'Final'][h.po] : '—'}</td><td class="num">${h.signed}</td><td class="num">${h.rep}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
}
MINI.hs = {
  name: 'High School Coach', badge: 'HS', eyebrow: 'New · High school', icon: 'star', startLabel: 'Take the job', formTitle: 'Your first head coaching job', welcome: 'Welcome to town. Set up your preseason, then start the season.',
  blurb: 'Start at a small-town high school. Develop players over four years, win on Friday nights, send your seniors to college, and work your way up until a college calls.',
  tabs: [['office', 'Office', 'home'], ['roster', 'Roster', 'users'], ['sched', 'Schedule', 'calendar'], ['alumni', 'In college', 'star'], ['program', 'Program', 'gavel']],
  formHTML: () => `<div class="fgrid"><label class="fld"><span>Your name</span><input id="hs-name" maxlength="28" value="Sam Whitaker"></label><label class="fld"><span>Town</span><select id="hs-town">${TOWNS.map(t => `<option value="${esc(t[0])}">${esc(t[0])}</option>`).join('')}</select></label></div><p class="small muted">Every coach starts at a small school. Bigger schools call when you have earned it.</p>`,
  readForm: () => ({ name: (document.getElementById('hs-name') || {}).value, town: (document.getElementById('hs-town') || {}).value }),
  create: hsNew, check: hsCheck, header: hsHeader,
  view: (tab, g) => (tab === 'roster' ? hsRosterHTML(g) : tab === 'sched' ? hsScheduleHTML(g) : tab === 'alumni' ? hsAlumniHTML(g) : tab === 'program' ? hsProgramHTML(g) : hsOfficeHTML(g)),
  summary: g => ({ name: g.coach.name, line: `${g.school.name} · ${g.year} · ${g.rec.w}-${g.rec.l} · reputation ${g.rep}` }),
};
const hsOn = () => appMode === 'mini' && mm && mm.kind === 'hs';
Object.assign(actions, {
  hsnext() { if (!hsOn()) return; hsWeek(mm); mui.tab = 'office'; mui.confirm = null; miniAfter(); },
  hssim() { if (!hsOn()) return; let g = 0; while (mm.wk >= 1 && mm.wk <= 10 && g++ < 12) hsWeek(mm); miniAfter('The regular season is over.'); window.scrollTo(0, 0); },
  hsplan(d) { if (!hsOn() || !HS_FOCUS[d.v] || mm.wk !== 0) return; mm.plan = d.v; miniAfter(); },
  hsstyle(d) { if (!hsOn() || !HS_STYLE[d.v] || mm.wk !== 0) return; mm.style = d.v; miniAfter(); },
  hsdev(d) { if (!hsOn()) return; miniAfter(hsDev(mm, d.id) ? 'He will be in your office at seven every morning.' : ''); },
  hsev(d) { if (!hsOn()) return; miniAfter(hsEvent(mm, +d.i, +d.v)); },
  hsup(d) { if (!hsOn()) return; miniAfter(hsUpgrade(mm, d.v) ? '' : 'The fund cannot cover that.'); },
  hsjob(d) { if (!hsOn()) return; mui.confirm = null; miniAfter(hsTakeJob(mm, +d.i)); window.scrollTo(0, 0); },
  // the college job: this career is saved where it is, and a Coach career begins in a free slot
  async hscol(d) {
    if (!hsOn()) return; const o = mm.offers[+d.i]; mui.confirm = null; if (!o || o.k !== 'col') return; const name = mm.coach.name; const bonus = clamp(Math.round((mm.rep - 60) / 2), 5, 20);
    if (![1, 2, 3, 4, 5].some(i => !lsGet('fecoach-slot-' + i))) return miniAfter('All five Coach save slots are in use. Free one from Coach mode, then take the job.');
    mm.left = { y: mm.year, to: o.tid }; hsLog(mm, `${name} leaves ${mm.school.name} to coach ${ROLE_TITLE[o.role].toLowerCase()} at ${CTEAMS0_AD[o.tid].name}.`, 'good'); mm.offers = []; await miniSave();
    switchNS('coach'); const target = firstFreeSlot(); newCoachCareer({ name, start: 'any', tid: o.tid, role: o.role, diff: 'normal', gameDay: 'plan', lvl: 'col', repBonus: bonus });
    setActiveSlot(target); appMode = 'ad'; rngOwner = 'ad'; resetUi(); ui.tab = 'office'; hideModal(); applyTheme(); save(); await flushSave(); ui.flash = `From Friday nights to Saturdays. ${name} starts at ${CTEAMS0_AD[o.tid].name} with the reputation he earned.`; render(); window.scrollTo(0, 0);
  },
});
// athletic director careers: your high school seniors are on the board in their signing year (Shared world on)
{ const _g = genRecruitClass; genRecruitClass = function () { const r = _g.apply(this, arguments);
  try { if (worldOn() && state.rec) { (worldGet().hs || []).forEach(p => { if (p.cls !== state.rec.cls || state.rec.list.some(x => x.world === p.k)) return; const b = genBody(p.pos);
    const rec = { id: 'rh' + Math.floor(hmix(p.k) * 1e6), n: p.n, pos: p.pos, star: clamp(p.stars, 2, 5), ovr: p.ovr, pot: p.pot, home: p.town, inState: p.st === TEAM_STATE[ME], ht: b.ht, wt: b.wt, status: 'open', offered: false, visit: null, nil: 0, ask: 0, lead: [], trend: 0, to: null, world: p.k, hs: p.hs, hsCoach: p.coach }; rec.interest = clamp(baseInterest(rec) + 6, 1, 99); state.rec.list.push(rec); });
    state.rec.list.sort((a, b) => b.star - a.star || b.pot - a.pot); } } catch (e) { console.error(e); }
  return r; }; }
try { if (appMode === 'home') render(); } catch (e) { } // the Home screen was drawn before this mode existed
