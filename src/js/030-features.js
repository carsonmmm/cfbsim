/* ===================== FEATURES ===================== */

/* ---------- Record book ---------- */
const BOOK_KEYS = { py: ['Passing yards', 'QB'], ptd: ['Passing TDs', 'QB'], ry: ['Rushing yards'], rtd: ['Rushing TDs'], rc: ['Receptions'], rcy: ['Receiving yards'], rctd: ['Receiving TDs'], tk: ['Tackles'], sk: ['Sacks'], int: ['Interceptions'], fgm: ['Field goals made'] };
function bookSet(tbl, k, v, n, extra) { if (!v) return; const B = bookOf(); const cur = B[tbl][k]; if (!cur || v > cur.v) { B[tbl][k] = Object.assign({ v, n, s: state.season }, extra || {}); if (cur && cur.v > 0 && !(cur.n === n && cur.s === state.season)) recordBroken(tbl, k, v, n, cur); } }
function updateBook(g, ms, opp) {
  if (!g.box) return;
  Object.entries(g.box.p).forEach(([pid, st]) => { const p = P(pid); if (!p) return; Object.keys(BOOK_KEYS).forEach(k => bookSet('game', k, st[k], p.n, { opp: teamName(opp) })); });
  bookSet('game', 'pts', ms, myName(), { opp: teamName(opp) });
}
function careerTable() {
  const all = state.roster.map(p => ({ n: p.n, pos: p.pos, cs: p.cs || {}, cur: true })).concat((state.alumni || []).map(a => ({ n: a.n, pos: a.pos, cs: a.cs || {} })));
  const out = {}; Object.keys(BOOK_KEYS).forEach(k => { const b = all.filter(x => (x.cs[k] || 0) > 0).sort((a, c) => c.cs[k] - a.cs[k])[0]; if (b) out[k] = { v: b.cs[k], n: b.n, cur: b.cur }; });
  return out;
}

/* ---------- Heisman & awards ---------- */
function heisScore(st, pos, tm) {
  const g = k => st[k] || 0; let s;
  if (pos === 'QB') s = g('py') * 0.035 + g('ptd') * 3.5 - g('pint') * 3 + g('ry') * 0.07 + g('rtd') * 4;
  else if (pos === 'RB') s = g('ry') * 0.085 + g('rtd') * 5 + g('rcy') * 0.04 + g('rctd') * 4;
  else if (pos === 'WR' || pos === 'TE') s = g('rcy') * 0.075 + g('rctd') * 5;
  else if (['DE', 'DT', 'LB', 'CB', 'S'].includes(pos)) s = (g('tk') * 0.4 + g('sk') * 5 + g('int') * 7) * 0.75;
  else return 0;
  const t = T(tm); s += t.w * 5 - t.l * 7 + (t.apRank ? (26 - t.apRank) * 1.2 : 0);
  return s;
}
function awardCands() {
  const out = [];
  Object.values(state.teams).forEach(t => { if (t.stars) t.stars.forEach(s => out.push({ n: s.n, pos: s.pos, tm: t.id, st: s.st })); });
  state.roster.forEach(p => { if (Object.keys(p.st).length && !['OL', 'K', 'P', 'LS'].includes(p.pos)) out.push({ n: p.n, pos: p.pos, tm: ME, st: p.st, pid: p.id }); });
  out.forEach(c => c.sc = heisScore(c.st, c.pos, c.tm));
  return out.sort((a, b) => b.sc - a.sc);
}
function heisWatch(n) { return awardCands().filter(c => ['QB', 'RB', 'WR', 'TE'].includes(c.pos) || c.sc > 60).slice(0, n || 10); }
const DEFP = ['DE', 'DT', 'LB', 'CB', 'S'];
function computeAwards() {
  const c = awardCands();
  const top = f => c.filter(f)[0];
  const heis = c.filter(x => ['QB', 'RB', 'WR', 'TE'].includes(x.pos) || x.sc > 70).slice(0, 5).map((x, i) => ({ n: x.n, pos: x.pos, tm: x.tm, pid: x.pid, pts: Math.round(x.sc * (i === 0 ? 9 : 7 - i)) }));
  const team = (f, k, n) => c.filter(f).slice(0, n).map(x => ({ n: x.n, pos: x.pos, tm: x.tm, pid: x.pid }));
  const allAm = [].concat(team(x => x.pos === 'QB', 0, 1), team(x => x.pos === 'RB', 0, 2), team(x => x.pos === 'WR' || x.pos === 'TE', 0, 3), team(x => DEFP.includes(x.pos), 0, 5));
  const b1 = x => T(x.tm).conf === T(ME).conf;
  const allB1G = [].concat(team(x => b1(x) && x.pos === 'QB', 0, 1), team(x => b1(x) && x.pos === 'RB', 0, 2), team(x => b1(x) && (x.pos === 'WR' || x.pos === 'TE'), 0, 3), team(x => b1(x) && DEFP.includes(x.pos), 0, 5));
  const coyT = Object.values(state.teams).filter(t => t.apRank).map(t => ({ t, d: t.elo - (t.elo0 || t.elo) })).sort((a, b) => b.d - a.d)[0];
  const aw = {
    s: state.season, heis,
    obrien: top(x => x.pos === 'QB'), walker: top(x => x.pos === 'RB'), bilet: top(x => x.pos === 'WR' || x.pos === 'TE'), bednarik: top(x => DEFP.includes(x.pos)),
    coy: coyT ? { tm: coyT.t.id, name: coyT.t.id === ME && state.staff.HC ? state.staff.HC.name : 'Head coach, ' + coyT.t.name } : null, allAm, allB1G,
  };
  ['obrien', 'walker', 'bilet', 'bednarik'].forEach(k => { if (aw[k]) aw[k] = { n: aw[k].n, pos: aw[k].pos, tm: aw[k].tm, pid: aw[k].pid }; });
  const give = (pid, t) => { const p = pid && P(pid); if (p) (p.awards = p.awards || []).push(state.season + ' ' + t); };
  if (heis[0]) give(heis[0].pid, 'Heisman Trophy'); give(aw.obrien && aw.obrien.pid, 'Davey O’Brien Award'); give(aw.walker && aw.walker.pid, 'Doak Walker Award'); give(aw.bilet && aw.bilet.pid, 'Biletnikoff Award'); give(aw.bednarik && aw.bednarik.pid, 'Bednarik Award');
  allAm.forEach(x => give(x.pid, 'All-America')); allB1G.forEach(x => give(x.pid, 'All-' + CONFS[T(ME).conf].name));
  state.awards.push(aw);
  const AW = { obrien: 'Davey O’Brien Award', walker: 'Doak Walker Award', bilet: 'Biletnikoff Award', bednarik: 'Bednarik Award' };
  if (heis[0]) { addNews(`${heis[0].n} (${heis[0].pos}, ${teamName(heis[0].tm)}) wins the Heisman Trophy.`, heis[0].tm === ME ? 'big' : ''); if (heis[0].tm === ME) state.trophies.push({ s: state.season, t: 'Heisman Trophy: ' + heis[0].n, k: 'award' }); }
  Object.entries(AW).forEach(([k, name]) => { if (aw[k] && aw[k].tm === ME) state.trophies.push({ s: state.season, t: name + ': ' + aw[k].n, k: 'award' }); });
  if (aw.coy && aw.coy.tm === ME) state.trophies.push({ s: state.season, t: 'Coach of the Year: ' + aw.coy.name, k: 'award' });
  const mAA = allAm.filter(x => x.tm === ME).length; if (mAA) addNews(`${mAA} ${myName()} player${mAA > 1 ? 's' : ''} named first-team All-America.`);
}

/* ---------- Events (board, boosters, players) ---------- */
function randStarter(filter) { const l = []; POS_ORDER.forEach(pos => starters(pos).forEach(p => { if (!filter || filter(p)) l.push(p); })); return l.length ? pick(l) : null; }
const EVENT_DEFS = {
  naming: { w: 3, cond: () => true, make: () => { const donor = pick(LAST); const amt = ri(8, 15); const fac = pick(FAC_DEFS); return { title: 'A donor wants his name on a building', text: `Longtime booster Richard ${donor} offers $${amt}M to rename ${facName(fac.id)} after his family.`, data: { amt, donor, fac: facName(fac.id) }, opts: [{ label: `Accept $${amt}M`, hint: 'Reserve +, boosters +, some fans grumble' }, { label: 'Decline politely', hint: 'Boosters −' }], def: 0 }; },
    res: (i, d) => { if (i === 0) { state.fin.balance += d.amt; state.fin.ytd.events += 0; mv('boost', 4); mv('fan', -3); return `The ${d.donor} name goes up. $${d.amt}M added to the reserve.`; } mv('boost', -4); return `You declined the ${d.donor} gift.`; } },
  offfield: { w: 3, cond: () => !!randStarter(p => !p.real && !['K', 'P', 'LS'].includes(p.pos)), make: () => { const p = randStarter(p => !p.real && !['K', 'P', 'LS'].includes(p.pos)); return { title: 'Off-field incident', text: `${p.n} (${p.pos}) was cited after an incident near campus. Local media is asking what you will do.`, data: { pid: p.id }, opts: [{ label: 'Suspend him 2 games', hint: 'Board +, locker room −, he misses 2 games' }, { label: 'Handle it internally', hint: 'No lost games; risk of a bigger story later' }, { label: 'Dismiss him from the team', hint: 'Board ++, locker room −−, he is gone' }], def: 0 }; },
    res: (i, d) => { const p = P(d.pid); if (!p) return ''; if (i === 0) { p.susp = 2; mv('board', 2); mv('morale', -2); return `${p.n} is suspended for two games.`; } if (i === 1) { if (R() < 0.35) { mv('board', -8); mv('fan', -4); addNews(`The ${p.n} story grew after reports the program kept it quiet. The board is unhappy.`, 'bad'); } return 'Handled internally.'; } releasePlayer(p.id); mv('board', 4); mv('morale', -5); return `${p.n} was dismissed from the program.`; } },
  night: { w: 3, cond: () => !!mGames().find(g => !g.done && g.h === ME && g.type === 'reg'), make: () => { const g = mGames().find(x => !x.done && x.h === ME && x.type === 'reg'); return { title: 'Primetime request', text: `A national network wants the ${teamName(g.a)} game under the lights at ${facName('stadium')}.`, data: { gid: g.id }, opts: [{ label: 'Accept the night game', hint: '+$1.5M, fans +' }, { label: 'Keep the afternoon kickoff', hint: 'No change' }], def: 0 }; },
    res: (i, d) => { if (i === 0) { state.fin.balance += 1.5; state.fin.ytd.events += 1.5; mv('fan', 3); const g = state.games.find(x => x.id === d.gid); if (g) g.night = true; return 'Night game set. The network adds $1.5M.'; } return 'Afternoon kickoff it is.'; } },
  uniform: { w: 2, cond: () => !state.fin.altUni, make: () => ({ title: 'Alternate uniform pitch', text: `The apparel partner wants ${myName()} to wear a new alternate uniform for one game. The money is good; the traditionalists will not be happy.`, data: {}, opts: [{ label: 'Approve the alternate', hint: '+$2M sponsorship per year, fans −2' }, { label: 'Keep the classic look', hint: 'Fans +1' }], def: 1 }),
    res: i => { if (i === 0) { state.fin.extraRev = (state.fin.extraRev || 0) + 2; state.fin.altUni = true; mv('fan', -2); return 'Alternate uniform approved.'; } mv('fan', 1); return 'The classic look stays.'; } },
  tamper: { w: 3, cond: () => !!randStarter(p => p.ovr >= 78 && ['Fr', 'So', 'Jr'].includes(p.cls)), make: () => { const p = randStarter(x => x.ovr >= 78 && ['Fr', 'So', 'Jr'].includes(x.cls)); const riv = pick(Object.values(state.teams).filter(t => CONFS[t.conf].p4 && t.id !== ME && t.rating >= 78)); return { title: 'Tampering rumors', text: `Word is that people connected to ${riv.name} are telling ${p.n} (${p.pos}) he could make more there.`, data: { pid: p.id, riv: riv.name }, opts: [{ label: 'Give him a raise', hint: 'His pay goes up to market value +10%' }, { label: 'Report it to the conference', hint: 'Board +1; 50/50 he stays happy' }, { label: 'Ignore it', hint: 'Higher chance he transfers after the season' }], def: 0 }; },
    res: (i, d) => { const p = P(d.pid); if (!p) return ''; if (i === 0) { p.pay = r2(marketValue(p) * 1.1); return `${p.n} gets a raise to $${p.pay.toFixed(2)}M.`; } if (i === 1) { mv('board', 1); if (R() < 0.5) p.portalRisk = (p.portalRisk || 0) + 0.3; return `You filed a report with the ${CONFS[T(ME).conf] ? CONFS[T(ME).conf].name : 'conference'}.`; } p.portalRisk = (p.portalRisk || 0) + 0.45; return 'You let it go.'; } },
  collective: { w: 3, cond: () => true, make: () => ({ title: 'The NIL collective needs a backstop', text: 'The collective wants the athletic department to guarantee $3M so it can make offers before next offseason.', data: {}, opts: [{ label: 'Guarantee $3M', hint: 'Reserve −$3M, collective +$6M, boosters +' }, { label: 'Say no', hint: 'Boosters −' }], def: 0 }),
    res: i => { if (i === 0) { state.fin.balance -= 3; state.fin.ytd.eventx += 3; state.fin.collective = (state.fin.collective || 0) + 6; mv('boost', 5); return 'The department backs the collective.'; } mv('boost', -4); return 'You kept the department out of it.'; } },
  students: { w: 2, cond: () => state.fin.ticket >= 85, make: () => ({ title: 'Student ticket protest', text: 'Student government says season tickets cost too much and plans a protest before the next home game.', data: {}, opts: [{ label: 'Cut student prices', hint: '−$1.2M, fans +5' }, { label: 'Hold firm', hint: 'Fans −4' }], def: 0 }),
    res: i => { if (i === 0) { state.fin.balance -= 1.2; state.fin.ytd.eventx += 1.2; mv('fan', 5); return 'Student prices come down.'; } mv('fan', -4); return 'Prices stay where they are.'; } },
  academics: { w: 2, cond: () => state.roster.filter(p => !p.real && state.depth[p.pos].indexOf(p.id) >= START[p.pos]).length >= 3, make: () => ({ title: 'Academic eligibility scare', text: 'Three reserve players are at risk of becoming academically ineligible.', data: {}, opts: [{ label: 'Pay for extra tutoring ($0.8M)', hint: 'They stay eligible; board +1' }, { label: 'Let them sit', hint: 'Three backups miss 3 games; board −2' }], def: 0 }),
    res: i => { if (i === 0) { state.fin.balance -= 0.8; state.fin.ytd.eventx += 0.8; mv('board', 1); return 'Tutors are hired. Everyone stays eligible.'; } const pool = state.roster.filter(p => !p.real && state.depth[p.pos].indexOf(p.id) >= START[p.pos]); shuffle(pool).slice(0, 3).forEach(p => p.susp = 3); mv('board', -2); return 'Three backups will sit for three games.'; } },
  meddle: { w: 2, cond: () => !state.donorDemand && !!archRival(), make: () => ({ title: 'A big gift with strings', text: `A billionaire alum offers $15M but wants a say in football decisions, and he expects wins over ${teamName(archRival())}.`, data: {}, opts: [{ label: 'Take the $15M', hint: `If ${myName()} loses to ${teamName(archRival())}, the board takes a big hit` }, { label: 'Decline', hint: 'Boosters −5' }], def: 1 }),
    res: i => { if (i === 0) { state.fin.balance += 15; state.donorDemand = state.season; state.donorRival = archRival(); mv('boost', 3); return `$15M received. He will be watching the ${teamName(state.donorRival)} game.`; } mv('boost', -5); return 'You turned down the gift.'; } },
  coachask: { w: 2, cond: () => state.staff.HC && !state.staff.HC.interim, make: () => ({ title: 'The head coach wants more', text: `${state.staff.HC.name} asks for $3M to raise assistant salaries and upgrade the video and analytics staff.`, data: {}, opts: [{ label: 'Approve $3M', hint: 'Locker room +4, coordinators slightly better' }, { label: 'Deny', hint: 'Locker room −3; he may listen to other offers' }], def: 0 }),
    res: i => { if (i === 0) { state.fin.balance -= 3; state.fin.ytd.eventx += 3; mv('morale', 4); ['OC', 'DC'].forEach(r => { if (state.staff[r]) state.staff[r].ovr = Math.min(95, state.staff[r].ovr + 1); }); return 'Approved. The staff gets a boost.'; } mv('morale', -3); state.hcUnhappy = true; return 'Request denied.'; } },
  raise: { w: 4, cond: () => state.roster.some(p => p.ovr >= 80 && satisfaction(p) < 0.85), make: () => { const p = pick(state.roster.filter(x => x.ovr >= 80 && satisfaction(x) < 0.85)); const ask = r2(marketValue(p)); return { title: 'A starter wants a raise', text: `${p.n} (${p.pos}, ${p.ovr} OVR) makes $${p.pay.toFixed(2)}M. His camp says his market value is $${ask.toFixed(2)}M.`, data: { pid: p.id, ask }, opts: [{ label: `Pay him $${ask.toFixed(2)}M`, hint: 'He is happy; payroll goes up' }, { label: 'Say no', hint: 'Locker room −2; he may transfer after the season' }], def: 0 }; },
    res: (i, d) => { const p = P(d.pid); if (!p) return ''; if (i === 0) { p.pay = d.ask; return `${p.n} gets his raise.`; } mv('morale', -2); p.portalRisk = (p.portalRisk || 0) + 0.3; return `${p.n} is unhappy with his deal.`; } },
  gameday: { w: 2, cond: () => !!mGames().find(g => !g.done && g.h === ME && g.type === 'reg'), make: () => ({ title: 'National pregame show', text: 'A national pregame show wants to broadcast live from campus before the next home game.', data: {}, opts: [{ label: 'Roll out the welcome mat ($0.3M)', hint: 'Fans +4, boosters +2' }, { label: 'Pass', hint: 'No change' }], def: 0 }),
    res: i => { if (i === 0) { state.fin.balance -= 0.3; state.fin.ytd.eventx += 0.3; mv('fan', 4); mv('boost', 2); return `The show is coming to ${myCity()}.`; } return 'You passed on the show.'; } },
  beer: { w: 1, cond: () => !state.fin.beer, make: () => ({ title: 'Expanded concessions', text: `The stadium operator proposes expanding alcohol sales to more sections of ${facName('stadium')}.`, data: {}, opts: [{ label: 'Approve', hint: '+$1.5M per year, board −2' }, { label: 'Decline', hint: 'No change' }], def: 1 }),
    res: i => { if (i === 0) { state.fin.extraRev = (state.fin.extraRev || 0) + 1.5; state.fin.beer = true; mv('board', -2); return 'Expanded concessions approved.'; } return 'Concessions stay as they are.'; } },
};
function maybeEvent() {
  if (isCoach()) { coachEvent(); if (state.event && autoOn('events')) autoResolveEvent(); return; }
  if (state.event || state.phase !== 'regular' || R() > 0.3) return;
  const opts = Object.entries(EVENT_DEFS).filter(([k, e]) => e.cond());
  if (!opts.length) return;
  const [key, def] = wpick(opts.map(x => [x, x[1].w]));
  const ev = def.make(); ev.key = key; ev.wk = state.week; state.event = ev;
  if (autoOn('events')) autoResolveEvent();
}
function resolveEvent(i) {
  const ev = state.event; if (!ev) return '';
  if (String(ev.key).startsWith('coach:')) { const title = ev.title; const label = (ev.opts[i] || ev.opts[0]).label; const msg = resolveCoachEvent(i); state.eventLog.push({ s: state.season, wk: ev.wk, title, choice: label }); addNews(`${title}: ${msg}`); return msg; }
  const msg = ev.key === 'presser' ? resolvePresser(i) : EVENT_DEFS[ev.key].res(i, ev.data);
  state.eventLog.push({ s: state.season, wk: ev.wk, title: ev.title, choice: ev.opts[i].label });
  addNews(`${ev.title}: ${msg}`);
  state.event = null; return msg;
}
function autoResolveEvent() { if (state.event) resolveEvent(state.event.def || 0); }

/* ---------- Future non-conference scheduling ---------- */
function ncBooked(s) { return state.ncBook[s] || (state.ncBook[s] = []); }
function ncOpenWeeks(s) { const b = ncBooked(s).map(x => x.wk); return [1, 2, 3].filter(w => !b.includes(w)); }
function genNcOffers(s) {
  if (state.ncOffers[s]) return;
  const myConf = T(ME).conf; const teams = Object.values(state.teams).filter(t => t.id !== ME && (t.conf !== myConf || myConf === 'IND'));
  const p4 = teams.filter(t => CONFS[t.conf].p4 || t.id === 'ND'), g5 = teams.filter(t => !CONFS[t.conf].p4 && t.id !== 'ND');
  const offers = [];
  shuffle(p4.slice()).slice(0, 3).forEach(t => offers.push({ id: 'o' + Math.floor(R() * 1e9), kind: 'hh', opp: t.id, txt: `Home-and-home with ${t.name}`, detail: `Home in ${s}, at ${t.name} in ${s + 1}. Strong schedule, full home gate in year one.` }));
  shuffle(p4.filter(t => t.rating >= 76)).slice(0, 2).forEach(t => { const pay = ri(4, 7); offers.push({ id: 'o' + Math.floor(R() * 1e9), kind: 'neutral', opp: t.id, loc: pick(NEUTRAL_SITES), payout: pay, txt: `Neutral-site kickoff vs. ${t.name}`, detail: `$${pay}M appearance fee. Big national TV window.` }); });
  shuffle(g5.slice()).slice(0, 3).forEach(t => { const fee = r1(rnd(1.2, 1.9)); offers.push({ id: 'o' + Math.floor(R() * 1e9), kind: 'buy', opp: t.id, fee, txt: `Home game vs. ${t.name}`, detail: `You pay them a $${fee}M guarantee. Likely win, weak schedule strength.` }); });
  const f = pick(FCS_NAMES); offers.push({ id: 'o' + Math.floor(R() * 1e9), kind: 'buy', opp: 'FCS:' + f, fee: 0.9, txt: `Home game vs. ${f} (FCS)`, detail: 'You pay a $0.9M guarantee. Fans and voters will not be impressed.' });
  state.ncOffers[s] = offers;
}
function bookNc(s, oid) {
  const o = (state.ncOffers[s] || []).find(x => x.id === oid); if (!o || o.booked) return 'gone';
  const open = ncOpenWeeks(s); if (!open.length) return 'full';
  if (ncBooked(s).some(x => x.opp === o.opp)) return 'dup';
  if (T(o.opp) && T(o.opp).conf === T(ME).conf && T(ME).conf !== 'IND') return 'conf';
  if (o.kind === 'hh') { const open2 = ncOpenWeeks(s + 1); if (!open2.length) return 'full2'; ncBooked(s + 1).push({ wk: open2[0], opp: o.opp, site: 'A', kind: 'hh', txt: `at ${teamName(o.opp)} (return game)` }); }
  ncBooked(s).push({ wk: open[0], opp: o.opp, site: o.kind === 'neutral' ? 'N' : 'H', kind: o.kind, payout: o.payout || 0, fee: o.fee || 0, loc: o.loc || '', txt: o.txt });
  o.booked = true; addNews(`Scheduling: ${myName()} books ${o.txt.toLowerCase().startsWith('home') ? o.txt.charAt(0).toLowerCase() + o.txt.slice(1) : o.txt} for ${s}.`);
  return 'ok';
}
function cancelNc(s, wk) { const b = ncBooked(s); const i = b.findIndex(x => x.wk === wk); if (i < 0) return; const x = b[i]; b.splice(i, 1); state.fin.balance -= 1; state.fin.ytd.eventx += 1; if (x.kind === 'hh') { const r = ncBooked(s + 1).findIndex(y => y.opp === x.opp && y.site === 'A'); if (r >= 0) ncBooked(s + 1).splice(r, 1); } const o = (state.ncOffers[s] || []).find(y => y.opp === x.opp); if (o) o.booked = false; addNews(`Scheduling: you paid a $1M cancellation fee to drop the ${teamName(x.opp)} game in ${s}.`); }

/* ---------- Recruiting (year-round) ---------- */
function needScore(pos) {
  const have = state.roster.filter(p => p.pos === pos && !['Sr', 'Gr'].includes(p.cls));
  const want = { QB: 4, RB: 5, WR: 9, TE: 5, OL: 16, DE: 9, DT: 8, LB: 9, CB: 9, S: 8, K: 2, P: 2, LS: 2 }[pos];
  const top = starters(pos).reduce((s, p) => s + p.ovr, 0) / Math.max(1, START[pos]);
  return clamp((want - have.length) * 6 + (80 - top) * 1.2, -10, 40);
}
function genRecruitClass() {
  const list = [];
  const posW = POS_ORDER.map(p => [p, p === 'LS' ? (state.roster.filter(x => x.pos === 'LS').length < 2 ? 6 : 0.5) : Math.max(3, needScore(p) + 14)]);
  const p4 = Object.values(state.teams).filter(t => (CONFS[t.conf].p4 || t.id === 'ND') && t.id !== ME);
  for (let i = 0; i < 60; i++) {
    // the board of targets matches the program: Group of Six schools mostly chase two- and three-stars
    const big = econ() >= 0.8, g6 = !CONFS[T(ME).conf].p4 && ME !== 'ND'; const n5 = big ? 4 : g6 ? 0 : 1, n4 = big ? 24 : g6 ? 5 : 12, n3 = g6 ? 36 : 60;
    const pos = wpick(posW); const star = Math.min(i < n5 ? 5 : i < n4 ? 4 : i < n3 ? 3 : 2, ['K', 'P', 'LS'].includes(pos) ? 3 : 5); const town = recruitTown(TEAM_STATE[ME]); const b = genBody(pos); // specialists top out at 3 stars (CL-B9)
    // specialists are rated on their own scale: a 3-star kicker can still be a very good one
    const spec = ['K', 'P', 'LS'].includes(pos) && i < n4;
    const ovr = star === 5 ? ri(69, 75) : star === 4 || spec ? ri(62, 69) : star === 3 ? ri(54, 63) : ri(45, 55); const pot = star === 5 ? ri(90, 99) : star === 4 || spec ? ri(82, 93) : star === 3 ? ri(70, 86) : ri(60, 77);
    const lead = shuffle(p4.filter(t => t.rating >= (star === 5 ? 82 : star === 4 ? 74 : 62)).slice()).slice(0, 3).map(t => t.id);
    const r = { id: 'r' + i + Math.floor(R() * 1e6), n: genName(), pos, star, ovr, pot, home: town[0], inState: town[1] === TEAM_STATE[ME], ht: b.ht, wt: b.wt, status: 'open', offered: false, visit: null, nil: 0, ask: r2(star === 5 ? rnd(0.8, 1.6) : star === 4 ? rnd(0.2, 0.6) : 0), lead, trend: 0, to: null };
    r.interest = baseInterest(r); list.push(r);
  }
  state.rec = { cls: state.season + 1, list: list.sort((a, b) => b.star - a.star || b.pot - a.pot), visits: 15, classRank: null };
}
function baseInterest(r) {
  const hc = state.staff.HC; const mr = rankOf(ME);
  let v = 34 + (mr ? (26 - mr) * 0.7 : -4) + ((hc ? hc.rec : 65) - 75) * 0.7 + (facLvl('building') - 3) * 6 + (facLvl('indoor') - 3) * 2 + (r.inState ? 12 : 0) + needScore(r.pos) * 0.3 + (r.star === 5 ? -14 : r.star === 4 ? -5 : 4) + (state.meters.fan - 60) * 0.15 + (state.fin.recruit - 4) * 3;
  const pc = state.staff[POS_COACH[r.pos]]; if (pc) v += (pc.rec - 72) * 0.4;
  if (schemeKeyPos(r.pos)) v += 3; // the position is central to how you play (team identity)
  v += mediaRec2() * 1.5; // national TV windows (or the lack of them) under the conference's media deal
  if (!isRealMich()) v += Math.max(0, 86 - T(ME).rating) * [0, 1, 1, 1, 0.45, 0.15][r.star];
  v += (hash(r.id) - 0.5) * 30;
  return clamp(Math.round(v), 3, 95);
}
function projRoom() { const leaving = state.roster.filter(p => p.cls === 'Gr' || (p.cls === 'Sr' && p.ovr < 79)).length * 0.85 + state.roster.filter(p => p.cls === 'Sr' && p.ovr >= 79).length; return Math.max(0, Math.round(rosterLimit() - (state.roster.length - leaving))); }
function recCommits() { return state.rec ? state.rec.list.filter(r => r.status === 'mc' || r.status === 'signed') : []; }
// the main things moving a prospect toward you or away, from the same factors baseInterest and recruitWeek use
function recWhy(r) {
  const pro = [], con = []; const mr = rankOf(ME); const hc = state.staff.HC; const pc = state.staff[POS_COACH[r.pos]]; const nd = needScore(r.pos);
  if (r.inState) pro.push('in-state');
  if (schemeKeyPos(r.pos)) { const sc = myScheme(); pro.push(`fits your ${(OFF_SCH[sc.off].key[r.pos] ? OFF_SCH[sc.off] : DEF_SCH[sc.def]).n}`); }
  if (nd >= 15) pro.push(`need at ${r.pos}`); else if (nd <= 0) con.push(`crowded at ${r.pos}`);
  if (mr && mr <= 12) pro.push(`No. ${mr} ranking`); else if (!mr) con.push('unranked');
  if (hc && hc.rec >= 82) pro.push('head coach recruits well'); else if (hc && hc.rec < 68) con.push('head coach is a weak recruiter');
  if (pc && pc.rec >= 80) pro.push(`${r.pos} coach`); else if (pc && pc.rec < 64) con.push(`${r.pos} coach`);
  if (facLvl('building') >= 4) pro.push('facilities'); else if (facLvl('building') <= 2) con.push('facilities');
  if (r.status === 'open') { if (r.offered) pro.push('your offer'); else con.push('no offer yet'); }
  if (r.ask > 0) { if (r.nil >= r.ask) pro.push('NIL deal'); else con.push(`wants $${r.ask.toFixed(2)}M NIL`); }
  if (r.visit === 'done') pro.push('visited');
  if (r.star === 5) con.push('every top program wants him');
  return { pro: pro.slice(0, 3), con: con.slice(0, 2) };
}
// what has to happen before the offseason can move on, with where to do it (DOM-free; the UI draws the links)
function offBlockers() {
  if (isPro()) return proOffBlockers();
  const o = state.off, b = []; if (!o || state.phase !== 'offseason') return b;
  if (state.pendingArrive) return [{ txt: 'Your move to a new job still has to finish.', act: 'catchretry' }];
  if (isCoach() && o.step === 1 && typeof marketBlocked === 'function' && marketBlocked()) b.push({ txt: marketBlocked(), tab: 'off' });
  if (!isCoach() && o.step === 1 && !o.boardRes) b.push({ txt: 'Present your plan to the board.', tab: 'off' });
  if (o.step === 2 && (o.poach || []).some(x => !x.done)) b.push({ txt: 'Answer the other programs calling about your assistants.', tab: 'off' });
  if (o.step >= 2 && !state.staff.HC && !isCoach()) b.push({ txt: 'Hire a head coach.', tab: 'staff' });
  if (o.step === 5 && state.rec && !state.rec.done) b.push({ txt: 'Hold National Signing Day.', tab: 'off' });
  return b;
}
function recOdds(r) { return clamp(Math.round(r.interest + (r.nil && r.nil >= r.ask && r.ask > 0 ? 12 : 0) + (r.pitchB || 0)), 2, 98); }
function classScore(list) { return list.reduce((s, r) => s + (r.star === 5 ? 100 : r.star === 4 ? 60 : r.star === 3 ? 28 : 14) + r.pot * 0.2, 0); }
// Other schools' class scores come from a fixed per-class draw, so looking at the Recruiting
// screen never moves the game's random sequence.
function hgaussOf(key) { const u = Math.max(1e-9, hash(key + ':u')), v = hash(key + ':v'); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function classRank(list) { const sc = classScore(list); if (!state.rec.otherScores) state.rec.otherScores = Object.values(state.teams).filter(t => t.id !== ME).map(t => (t.rating - 40) * 24 + hgaussOf(state.seed + ':' + state.rec.cls + ':' + t.id) * 120 + (CONFS[t.conf].p4 ? 200 : 0)); return state.rec.otherScores.filter(x => x > sc).length + 1; }
function recruitWeek(mg) {
  const rc = state.rec; if (!rc) return;
  // auto-recruiting (either mode), and in Coach mode the rest of the staff handles the positions you don't
  if (autoOn('rec')) { autoSeasonRecruiting(); if (isCoach()) autoTrips(); }
  else if (isCoach() && state.co.role !== 'HC') autoSeasonRecruiting(r => !canRecruit(r.pos));
  const mw = mg && mg.done ? mg.mResult === 'W' : null; const opp = mg ? (mg.h === ME ? mg.a : mg.h) : null;
  const mr = rankOf(ME); const hc = state.staff.HC; const room = projRoom(); let commits = recCommits().length;
  const late0 = state.week >= 10 ? 1.6 : 1; const bal = balOn(); const pres = bal && T(ME) ? (T(ME).pres != null ? T(ME).pres : T(ME).rating) : 0;
  rc.list.forEach(r => {
    if (r.status === 'signed' || r.status === 'lost') return;
    const late = bal ? (1 + Math.max(0, state.week - 5) * 0.1) * (r.star >= 4 ? 1.35 : 1) : late0; // Updated balance: a steady rise, steeper for the top recruits (BAL-07)
    let d = (r.offered ? 1.4 : -0.6) + (mw === true ? 1.0 : mw === false ? -1.8 : 0) + (mr ? (26 - mr) * 0.05 : -0.4) + ((hc ? hc.rec : 65) - 75) * 0.05 + (state.fin.recruit - 4) * 0.25 + gauss() * 1.4;
    if (r.visit && mg && r.visit === mg.id && mg.done) { d += 7 + (mw ? 6 : -6) + (rankOf(opp) || rivalOf(opp) ? 4 : 0) + (facLvl('building') - 3) * 2; r.visit = 'done'; if (r.star >= 4) addNews(`${r.star}-star ${r.pos} ${r.n} took his official visit for the ${teamName(opp)} game${mw ? ' and saw a win' : ''}.`); }
    if (r.nil && r.nil >= r.ask) d += 0.8;
    if (bal) { d += (pres - 72) * 0.012; const room = START[r.pos] != null ? (state.roster.filter(p => p.pos === r.pos && ['Jr', 'Sr', 'Gr'].includes(p.cls)).length >= START[r.pos] + 1 ? -0.25 : 0.35) : 0; if (r.star >= 4) d += room; } // prestige and a clear path to playing time (BAL-05, BAL-06)
    const before = r.interest; r.interest = clamp(Math.round(r.interest + d), 1, 99); r.trend = r.interest - before;
    if (r.status === 'open' && r.offered && r.interest >= 86 && commits < room + 3) { r.status = 'mc'; commits++; if (r.star >= 4) addNews(`Commitment: ${r.star}-star ${r.pos} ${r.n} (${r.home}) commits to ${myName()}.`, 'win'); }
    else if (r.status === 'mc' && r.interest < 58 && R() < 0.3 * (bal && r.star >= 4 ? late : 1)) { r.status = 'lost'; r.to = pick(r.lead); commits--; addNews(`Flip: ${r.star}-star ${r.pos} ${r.n} decommits from ${myName()} and picks ${teamName(r.to)}.`, 'bad'); }
    else if (r.status === 'open' && !(r.offered && r.interest >= 70) && R() < 0.035 * late * (1.2 - r.interest / 100)) { r.status = 'lost'; r.to = pick(r.lead); }
  });
}
function earlySigning() { const rc = state.rec; if (!rc) return; const n = rc.list.filter(r => r.status === 'mc').length; rc.list.forEach(r => { if (r.status === 'mc') r.status = 'signed'; }); if (n) addNews(`Early signing period: ${n} ${myName()} commits sign their letters of intent.`); }
function toggleOffer(id) {
  const r = state.rec.list.find(x => x.id === id); if (!r || r.status !== 'open') return;
  if (!r.offered) {
    if (state.rec.list.filter(x => x.offered && x.status === 'open').length >= 30) return 'max';
    const before = r.interest; r.offered = true; r.interest = clamp(r.interest + 4, 1, 99); r.offerBonus = r.interest - before;
  } else {
    // Withdrawing takes back exactly the bump the offer gave, so offer/withdraw cycles gain nothing.
    r.offered = false; r.interest = clamp(r.interest - (r.offerBonus || 0), 1, 99); r.offerBonus = 0;
  }
  return 'ok';
}
function setVisit(id, gid) { const r = state.rec.list.find(x => x.id === id); if (!r) return; if (gid && !r.visit) { if (state.rec.visits <= 0) return; if (state.rec.list.filter(x => x.visit === gid).length >= 4) return 'full'; state.rec.visits--; r.visit = gid; } else if (!gid && r.visit && r.visit !== 'done') { state.rec.visits++; r.visit = null; } }
function signingDay() {
  const rc = state.rec; if (!rc || rc.done || state.phase !== 'offseason') return; const res = []; // one-time, offseason only (GPT-I7)
  rc.list.forEach(r => {
    if (r.status === 'signed' || r.status === 'mc') { res.push(r); r.status = 'signed'; return; }
    if (r.status === 'open' && r.offered) { if (R() * 100 < recOdds(r)) { r.status = 'signed'; res.push(r); } else { r.status = 'lost'; r.to = pick(r.lead); } }
  });
  let room = rosterLimit() - state.roster.length; const joined = [];
  res.sort((a, b) => b.star - a.star || b.pot - a.pot).forEach(r => {
    if (room <= 0) { r.status = 'lost'; r.to = 'grayshirt'; return; }
    room--;
    const p = makePlayer({ num: freeNumber(r.pos), n: r.n, pos: r.pos, cls: 'Fr', ht: r.ht, wt: r.wt, home: r.home, ovr: r.ovr, pot: r.pot, real: false, star: r.star, recruit: true });
    p.pay = r2(Math.max(r.nil || 0, marketValue(p))); p.rid = r.id; /* which recruit he was (promises follow him) */
    state.roster.push(p); state.depth[r.pos].push(p.id); joined.push(r);
  });
  rebuildPMap();
  rc.classRank = nationalClasses(joined); rc.signed = joined.map(r => r.id); rc.done = true; const hh = state.history[state.history.length - 1]; if (hh) { hh.classRank = rc.classRank; hh.classN = joined.length; }
  const fives = joined.filter(r => r.star === 5).length, fours = joined.filter(r => r.star === 4).length;
  addNews(`National Signing Day: ${myName()} signs ${joined.length} recruits (${fives} five-star, ${fours} four-star). The class ranks No. ${rc.classRank} nationally.`, rc.classRank <= 10 ? 'big' : '');
  mv('boost', rc.classRank <= 10 ? 4 : rc.classRank > 30 ? -3 : 0);
  checkAch('class');
}
function freeNumber(pos) { const range = pos === 'OL' ? [50, 79] : ['DT', 'DE'].includes(pos) ? [90, 99] : pos === 'TE' ? [80, 89] : [0, 49]; const ret = retiredNums(); for (let n = range[0]; n <= range[1]; n++) if (!ret.has(n) && !state.roster.some(p => p.num === n && p.pos === pos)) return n; return ri(0, 99); }

/* ---------- Positions & traits ---------- */
function switchPos(pid, np) {
  const p = P(pid); if (!p || !(SWITCH[p.pos] || []).includes(np)) return;
  const pen = { 'CB-S': 3, 'S-CB': 4, 'K-P': 6, 'P-K': 6, 'DE-LB': 5, 'LB-DE': 5, 'DE-DT': 4, 'DT-DE': 5 }[p.pos + '-' + np] || 8;
  state.depth[p.pos] = state.depth[p.pos].filter(x => x !== pid);
  const old = p.pos; p.pos = np; p.ovr = Math.max(40, p.ovr - pen); p.pot = Math.max(p.ovr, p.pot - Math.round(pen / 2)); p.tr = genTraits(np, p.ovr);
  state.depth[np].push(pid); autoDepth(np);
  addNews(`${p.n} moves from ${old} to ${np} (now ${p.ovr} OVR).`);
}
function autoDepth(pos) {
  state.depth[pos] = state.depth[pos].filter(id => P(id)).sort((a, b) => P(b).ovr - P(a).ovr);
  // QOL-15: locked starters stay on top in the order you set (an injured one sits out, then gets the job back)
  const lk = depthLocked(pos); if (lk.length) state.depth[pos] = lk.concat(state.depth[pos].filter(id => !lk.includes(id)));
}
function depthLocked(pos) { const L = state.depthLock && state.depthLock[pos]; if (!Array.isArray(L)) return []; const ok = L.filter(id => { const p = P(id); return p && p.pos === pos && (state.depth[pos] || []).includes(id); }); if (ok.length !== L.length) { if (ok.length) state.depthLock[pos] = ok; else delete state.depthLock[pos]; } return ok; }
function depthLockSet(pos, on) { if (!state.depth[pos]) return false; state.depthLock = state.depthLock || {}; if (on) state.depthLock[pos] = state.depth[pos].slice(0, START[pos] || 1); else delete state.depthLock[pos]; return true; }
// A roster can't be cut below what a team needs to play (the same floors walk-ons fill to).
const MIN_ROSTER = 45;
function canRelease(id) { const p = P(id); if (!p) return 'missing'; if (state.roster.length <= MIN_ROSTER) return `Keep at least ${MIN_ROSTER} players on the roster.`; const n = state.roster.filter(x => x.pos === p.pos).length; if (n <= (ROSTER_FLOOR[p.pos] || 1)) return `Keep at least ${ROSTER_FLOOR[p.pos] || 1} ${POS_NAME[p.pos].toLowerCase()}${(ROSTER_FLOOR[p.pos] || 1) > 1 ? 's' : ''} on the roster.`; return ''; }
function releasePlayer(id) { if (canRelease(id) || (typeof liveRosterLock === 'function' && liveRosterLock())) return false; state.roster = state.roster.filter(p => p.id !== id); rebuildPMap(); POS_ORDER.forEach(pos => state.depth[pos] = state.depth[pos].filter(x => x !== id)); return true; }

/* ---------- Offseason ---------- */
const OFF_STEPS = ['Season recap', 'Board meeting', 'Coaching staff', 'Departures', 'Transfer portal', 'Signing Day', 'NFL Draft', 'Development & captains'];
function startOffseason() {
  if (state.phase === 'offseason') return; // one-time transition (GPT-I7)
  state.phase = 'offseason'; if (state.event && state.event.key === 'presser') state.event = null;
  const games = mGames(); const reg = games.filter(g => g.type === 'reg');
  const w = games.filter(g => g.mResult === 'W').length, l = games.filter(g => g.mResult === 'L').length; const regW = reg.filter(g => g.mResult === 'W').length;
  const m = state.meters;
  // Year-end money posts first (performance clauses in partner deals), so the goals, the board
  // review, the recap and the history all read the same, final numbers.
  (state.deals || []).forEach(d => { if (d.perf && d.thru >= state.season) { let b = 0; if (games.some(g => g.type === 'cfp')) b += 1.5; if (w >= 10) b += 0.5; if (b) { state.fin.balance += b; state.fin.ytd.events += b; addNews(`Performance bonus from the ${d.name.toLowerCase()}: $${b}M.`); } } });
  bondsYearEnd(); stringsCheck('year'); evolvePers(); commApply(); /* bond payments, booster promises, and personalities that changed over the year */
  const goals = state.goals.map(gl => ({ txt: gl.txt, st: goalStatus(gl) }));
  const met = goals.filter(x => x.st === 'met').length, failed = goals.filter(x => x.st === 'failed').length;
  const fin = finTotals();
  let d = (regW - state.expWins) * 4 + met * 3 - failed * 4 + (fin.net >= 0 ? 3 : -5) + (m.fan - 60) / 6 + (state.champ === ME ? 25 : 0);
  if (m.hot >= 85 && state.staff.HC && !state.staff.HC.interim) { d -= 6; addNews('The board is frustrated that you kept a coach the fan base had turned on.', 'bad'); }
  const dr = state.donorRival || 'OSU'; const osu = reg.find(g => g.h === dr || g.a === dr);
  if (state.donorDemand === state.season && osu && osu.mResult === 'L') { d -= 10; addNews(`The billionaire donor is furious about the ${teamName(dr)} loss and has the board’s ear.`, 'bad'); }
  if (d < 0) d *= diff().neg;
  if (d < 0 && !state.history.length) d *= 0.6; // a new AD's first season gets some patience
  if (state.fin.balance < 0) { const pen = Math.min(15, Math.round(-state.fin.balance / 4)); d -= pen; addNews(`The department reserve is in the red (${state.fin.balance.toFixed(1)}M). The board is not happy.`, 'bad'); }
  const before = m.board; m.board = clamp(Math.round(60 + (m.board - 60) * 0.8 + d), 0, 100);
  ['fan', 'boost'].forEach(k => { m[k] = Math.round(60 + (m[k] - 60) * 0.9); });
  const cap = 150 * econ(); if (state.fin.balance > cap) { const sw = r1((state.fin.balance - cap) * 0.3); state.fin.balance -= sw; addNews(`The university moves $${sw}M of the athletic reserve to campus priorities.`); }
  const finalRank = rankOf(ME);
  if (state.champ === ME) state.trophies.push({ s: state.season, t: 'National Champions', k: 'natl' });
  state.rivalLog.filter(x => x.s === state.season && x.win).forEach(x => state.trophies.push({ s: state.season, t: x.opp === archRival() ? 'Beat ' + teamName(x.opp) : rivalOf(x.opp) || 'Beat ' + teamName(x.opp), k: 'rival' }));
  computeAwards(); lgHistCollege(); if (isComm()) cmOffseason();
  state.roster.forEach(p => Object.keys(BOOK_KEYS).forEach(k => bookSet('season', k, p.st[k], p.n)));
  teamRecSeason();
  const ranks = state.polls.map(pl => { const i = pl.rows.findIndex(r => r.id === ME); return i >= 0 ? i + 1 : 0; });
  const moved = m.board - before; // the real change, after the pull back toward 60
  const recap = buildRecap(Math.round(d)); // the season grade rates the season itself
  state.off = { step: 0, review: { w, l, regW, exp: state.expWins, goals, boardBefore: before, boardAfter: m.board, delta: moved, fin, finalRank, champ: state.champ, recap } };
  { const won = g => g && g.mResult === 'W'; const ccgW = games.some(g => g.type === 'ccg' && won(g)); buildHighlights({ rank: finalRank, champ: state.champ === ME, awards: (state.awards[state.awards.length - 1] || { heis: [] }).heis.filter(x => x.tm === ME).map(x => 'Heisman Trophy: ' + x.n) }); recordMile({ tm: ME, w, l, natl: state.champ === ME, conf: ccgW, po: games.some(g => g.type === 'cfp') }); }
  state.history.push({ season: state.season, w, l, cw: T(ME).cw, cl: T(ME).cl, rank: finalRank, champ: state.champ, bowl: (games.filter(g => g.type === 'bowl' || g.type === 'cfp').pop() || {}).name || '', hc: state.staff.HC ? state.staff.HC.name : '—', net: r1(fin.net), ranks, rev: r1(fin.rev), exp: r1(fin.exp), diff: state.settings.diff, recap, conf: T(ME).conf });
  const inv = investigate(); if (inv) state.off.review.inv = inv;
  // In Coach mode the computer-run AD answers for the money; the coach is judged on his own review.
  if (isCoach()) { if (m.board <= diff().fire || state.fin.balance < -75 * Math.max(0.3, econ())) { addNews(`${myName()} replaces its athletic director after a rough year.`, 'bad'); m.board = 55; if (state.fin.balance < 0) state.fin.balance = 0; } coachSeasonEnd(); }
  else if (!state.settings.noFire && state.fin.balance < -75 * Math.max(0.3, econ())) state.gameOver = { reason: `The university has taken over the athletic department's finances after the reserve fell to ${state.fin.balance.toFixed(1)}M. You have been relieved of your duties as athletic director.` };
  else if (m.board <= diff().fire && !state.settings.noFire) state.gameOver = { reason: `The Board of Regents has lost confidence in your leadership after ${aAn(w + '-' + l)} season. You have been relieved of your duties as athletic director.` };
  if (!isCoach()) execSeasonEnd(regW, before, w, l);
  applyRedshirts(); recordCareers();
  state.roster.forEach(p => { Object.entries(p.st).forEach(([k, v]) => p.cs[k] = (p.cs[k] || 0) + v); p.lastSt = p.st; p.st = {}; p.gp = 0; p.susp = 0; p.injFresh = false; if (p.inj) { p.inj = 0; p.injSE = false; } p.seasons = (p.seasons || 0) + 1; });
  careerRecCheck(); /* career leaders, now that this season's stats are in */
  // realignment vote
  if (R() < 0.2 && T(ME).conf !== 'IND') { const c = expansionCandidates(); if (c.length === 2) state.off.vote = { teams: c }; }
  checkAch('season');
  state.legacy = legacyScore();
}
function offCoaching() {
  const out = []; const poach = [];
  const mRank = state.off.review.finalRank; const good = state.off.review.w >= 10 || (mRank && mRank <= 12);
  const hc = state.staff.HC;
  if (hc && !hc.me && !hc.interim && good && coachOvr(hc) >= 76 && R() < 0.35 + (state.hcUnhappy ? 0.25 : 0)) poach.push({ role: 'HC', suitor: pick(['An NFL team', 'An NFL team', 'A rival SEC program', 'A Big 12 power']), raise: 0.35 });
  ['OC', 'DC'].forEach(r => { const c = state.staff[r]; if (c && !c.me && c.ovr >= 79 && R() < (good ? 0.45 : 0.22)) poach.push({ role: r, suitor: pick(['A Power Four school', 'A Group of Six school', 'An NFL team']) + ' wants him as ' + (R() < 0.6 ? 'head coach' : 'coordinator'), raise: 0.4 }); });
  STAFF_ROLES.forEach(r => { const c = state.staff[r]; if (c && !c.me && !c.interim) { coachNorm(c, r); c.years--; if (c.years <= 0) { if (R() < 0.5 || coachOvr(c) >= 78) { c.years = 2; c.salary = r1(c.salary * 1.08); out.push(`${c.name} re-signed for two years at $${c.salary.toFixed(1)}M.`); } else { out.push(`${c.name}'s contract expired and he moved on.`); state.staff[r] = null; { const pool = Object.values(state.teams).filter(t => t.id !== ME); const dest = pool[Math.floor(hash((state.seed || 0) + ':tx:' + state.season + ':' + c.name) * pool.length)]; /* hash, not R(): keeps the random stream unchanged */ const head = coachOvr(c) >= 78 && r !== 'HC'; if (head) dest.coach = c.name; treeAdd(c, r, dest.id, head ? 'HC' : r); } } } } });
  if (state.staff.HC && state.staff.HC.interim) { out.push(`Interim head coach ${state.staff.HC.name} returns to his assistant role. You need a permanent head coach.`); state.staff.HC = null; }
  STAFF_ROLES.forEach(r => state.cands[r] = genCandidates(r, r === 'HC' ? 7 : 4));
  state.hcUnhappy = false;
  out.forEach(t => addNews(t));
  state.off.coachNews = out; state.off.poach = poach;
}
function resolvePoach(i, match) {
  const x = state.off.poach[i]; if (!x || x.done) return; const c = state.staff[x.role]; x.done = true; if (!c) return;
  if (match) { const ok = R() < (x.role === 'HC' ? 0.7 : 0.6) + (rapOf(c) - 60) / 200; if (ok) { rapAdj(c, 10, 'You matched an outside offer'); c.salary = r1(c.salary * (1 + x.raise)); c.years = Math.max(c.years, 0) + 2; x.result = 'stayed'; addNews(`${c.name} stays after ${myName()} matched with a raise to $${c.salary.toFixed(1)}M.`, 'win'); return; } }
  if (!match && rapOf(c) >= 80 && R() < 0.3) { x.result = 'stayed'; rapAdj(c, 2, 'Turned down another job out of loyalty'); addNews(`${c.name} turns down ${x.suitor} to stay at ${myName()}.`, 'win'); return; }
  x.result = 'left'; state.staff[x.role] = null; const dest = pick(Object.values(state.teams).filter(t => t.id !== ME && CONFS[t.conf].p4)); treeAdd(c, x.role, /NFL/.test(x.suitor) ? null : dest.id, (x.role === 'HC' || /head coach/.test(x.suitor)) && !/NFL/.test(x.suitor) ? 'HC' : x.role); if (x.role === 'HC' || /head coach/.test(x.suitor)) { if (!/NFL/.test(x.suitor)) { dest.coach = c.name; dest.rating = r1(Math.min(96, dest.rating + 1.5)); } } addNews(`${c.name} leaves ${myName()}${/NFL/.test(x.suitor) ? ' for the NFL' : ' and takes over at ' + dest.name}.`, 'bad');
  if (x.role === 'HC') mv('boost', -3);
}
function offDepartures() {
  const list = []; const acad = (facLvl('academic') - 3) * 0.04;
  const board = draftClass(); const proj = p => projLabel(board.findIndex(x => x.id === p.id) + 1 || 999);
  state.roster.forEach(p => {
    const depthIdx = state.depth[p.pos].indexOf(p.id); const sat = satisfaction(p);
    if (p.cls === 'Gr') list.push({ id: p.id, why: p.ovr >= 80 ? 'NFL Draft (projected: ' + proj(p) + ')' : 'Out of eligibility' });
    else if (p.cls === 'Sr' && p.rsUsed && !p.medRS) list.push({ id: p.id, why: p.ovr >= 80 ? 'NFL Draft (projected: ' + proj(p) + ')' : 'Out of eligibility' });
    else if (p.cls === 'Sr') { if (p.ovr >= 79) list.push({ id: p.id, why: 'NFL Draft (projected: ' + proj(p) + ')' }); else if (R() < (p.rsUsed ? 0.62 : 0.5)) list.push({ id: p.id, why: 'Graduating' }); }
    else if (p.cls === 'Jr' && p.ovr >= 87 && R() < 0.6) list.push({ id: p.id, why: 'Declared early for NFL Draft (projected: ' + proj(p) + ')' });
    else if (['Fr', 'So', 'Jr'].includes(p.cls)) {
      const benched = depthIdx >= START[p.pos] + 1;
      let risk = (60 - rapOf(p)) / 250 + (benched && p.ovr >= 64 ? 0.18 : 0.02) + (sat < 0.8 && !p.walkon ? 0.2 : sat < 0.95 && !p.walkon ? 0.07 : -0.03) + (p.portalRisk || 0) - acad - (state.meters.morale - 60) / 400 + (p.pers === 'diva' && benched ? 0.2 : 0) + (p.pers === 'leader' ? -0.08 : 0);
      if (R() < clamp(risk, 0.01, 0.8)) list.push({ id: p.id, why: sat < 0.8 && !benched && !p.walkon ? 'Entered transfer portal (wants more money)' : 'Entered transfer portal' });
    }
    p.portalRisk = 0;
  });
  state.off.departures = list;
}
function applyDepartures() {
  const leave = state.off.departures.filter(d => !d.kept);
  // players headed to the draft are picked (or not) at the NFL Draft step, two steps from now
  const declared = state.off.declared = [];
  leave.forEach(d => { const p = P(d.id); if (!p) return; hofConsider(p, state.season); const draft = d.why.includes('NFL'); const dest = d.why.startsWith('Entered') ? pick(Object.values(state.teams).filter(t => t.id !== ME)).name : null;
    state.alumni.push({ pid: p.id, n: p.n, pos: p.pos, cs: p.cs, hist: (p.hist || []).map(h => ({ s: h.s, cls: h.cls, ovr: h.ovr, gp: h.gp, line: statLineRaw(h.pos, h.st) })), awards: p.awards || [], last: state.season, why: d.why, where: draft ? `Entered the ${state.season + 1} NFL Draft` : dest ? `Transferred to ${dest}` : d.why === 'Graduating' || d.why === 'Out of eligibility' ? 'Graduated' : d.why, real: p.real });
    if (draft) declared.push({ id: p.id, n: p.n, pos: p.pos, cls: p.cls, ovr: p.ovr, early: p.cls === 'Jr', v: draftVal(p.ovr, p.pos, p.cls, state.seed + ':' + p.id, honorBonus(p)) }); });
  const ids = new Set(leave.map(d => d.id)); const drafted = leave.filter(d => d.why.includes('NFL')).length;
  state.roster = state.roster.filter(p => !ids.has(p.id)); rebuildPMap(); POS_ORDER.forEach(pos => state.depth[pos] = state.depth[pos].filter(id => P(id)));
  state.captains = (state.captains || []).filter(id => P(id));
  addNews(`${ids.size} players leave the program${drafted ? `, including ${drafted} headed to the NFL Draft` : ''}.`);
}
function genPortal() {
  const list = []; const posW = POS_ORDER.filter(p => p !== 'LS').map(p => [p, Math.max(2, needScore(p) + 12)]);
  for (let i = 0; i < 18; i++) {
    const pos = wpick(posW); const ovr = ri(66, 85) - progShift(); const cls = pick(['So', 'Jr', 'Jr', 'Sr', 'Sr']); const b = genBody(pos);
    const from = pick(Object.values(state.teams).filter(t => t.id !== ME)).name;
    const x = { id: 'x' + i + Math.floor(R() * 1e6), n: genName(), pos, cls, ovr, pot: Math.min(96, ovr + ri(1, 8)), from, ht: b.ht, wt: b.wt, home: pick(TOWNS)[0], interest: clamp(Math.round(50 + (state.meters.morale - 60) / 2 + (rankOf(ME) ? 12 : 0) + gauss() * 15), 10, 95) };
    x.ask = r2(Math.max(0.1, marketValue(x) * rnd(1.0, 1.25))); list.push(x);
  }
  state.off.portal = list.sort((a, b) => b.ovr - a.ovr);
}
function signPortal(xid) {
  const x = state.off.portal.find(p => p.id === xid); if (!x || x.done) return 'gone';
  if (state.roster.length >= rosterLimit()) return 'full'; if (payRoom() < x.ask) return 'money';
  x.done = true;
  if (R() * 100 > x.interest + 25) { x.declined = true; addNews(`Transfer ${x.n} (${x.pos}, ${x.from}) chose another school.`); return 'declined'; }
  const p = makePlayer({ num: freeNumber(x.pos), n: x.n, pos: x.pos, cls: x.cls, ht: x.ht, wt: x.wt, home: x.home, ovr: x.ovr, pot: x.pot, real: false, pay: x.ask, from: x.from, transfer: true });
  state.roster.push(p); rebuildPMap(); state.depth[x.pos].push(p.id); autoDepth(x.pos);
  x.signed = true; addNews(`Transfer ${x.n} (${x.pos}, from ${x.from}) signs with ${myName()}.`); return 'signed';
}
function offDevelopment() {
  const log = [];
  const facDev = (facLvl('indoor') - 3) * 0.02 + (facLvl('weight') - 3) * 0.025; const hcDev = (state.staff.HC ? (state.staff.HC.dev - 75) / 400 : 0) + (typeof bizDev === 'function' ? bizDev() : 0);
  state.roster.forEach(p => {
    const pc = state.staff[POS_COACH[p.pos]];
    let dev = 0.3 + (pc ? (pc.dev - 75) / 300 : -0.04) + facDev + hcDev + (state.depth[p.pos].indexOf(p.id) < START[p.pos] ? 0.04 : 0) + (isCoach() ? coachFocusDev(p) : 0);
    if (p.pers === 'worker') dev *= 1.3;
    const before = p.ovr; const growth = Math.max(-2, Math.round((p.pot - p.ovr) * dev + gauss() * 1.6 + (p.xp || 0) * 0.25));
    p.ovr = clamp(p.ovr + growth, 40, 99); if (p.ovr > p.pot) p.pot = p.ovr; p.xp = 0;
    Object.keys(p.tr || {}).forEach(k => p.tr[k] = clamp(p.tr[k] + growth + ri(-1, 1), 35, 99));
    if (!p.rsThisYear) p.cls = CLASSES[Math.min(4, CLASSES.indexOf(p.cls) + 1)];
    p.rsThisYear = false; p.rsPlan = false;
    log.push({ id: p.id, before, after: p.ovr });
  });
  if (isCoach()) coachDevReport(log);
  state.off.devlog = log.sort((a, b) => (b.after - b.before) - (a.after - a.before)).slice(0, 12);
  POS_ORDER.forEach(autoDepth);
  autoCaptains(); state.walkons = null;
}
function nextSeason() {
  realign(); otherCarousel();
  Object.values(state.teams).forEach(t => {
    if (t.id === ME) return;
    const bonus = state.bracket && state.bracket.seeds.includes(t.id) ? 1 : 0;
    const cr = t.classRank || 60; const ce = cr <= 5 ? 1 : cr <= 15 ? 0.6 : cr <= 40 ? 0.2 : -0.3;
    if (t.pres == null) t.pres = t.rating; const home = balOn() ? t.pres * 0.7 + 68 * 0.3 : 68; // Updated balance: a program's history keeps pulling it back (BAL-05)
    t.rating = r1(clamp(t.rating + (home - t.rating) * 0.1 + gauss() * 3 + bonus + ce, 38, 94));
    t.off = r1(t.rating + gauss() * 2.5); t.def = r1(2 * t.rating - t.off); t.st = r1(t.rating + gauss() * 3);
    t.elo = 1500 + (t.elo - 1500) * 0.55 + (t.rating - 70) * 6; t.style = genStyle();
    t.stars = (t.stars || []).map(s => { if (s.cls === 'Sr' || s.cls === 'Gr' || s.ovr >= 90) return genStar(t, s.pos, pick(['So', 'Jr'])); return Object.assign(s, { cls: CLASSES[CLASSES.indexOf(s.cls) + 1], ovr: Math.min(97, s.ovr + ri(0, 4)), st: {}, gp: 0 }); });
  });
  const ms = michStrength(); T(ME).rating = Math.round(ms.ovr); T(ME).elo = 1500 + (T(ME).elo - 1500) * 0.55 + (ms.ovr - 70) * 6;
  Object.values(state.teams).forEach(t => { t.hist.push({ s: state.season, w: t.w, l: t.l }); t.w = t.l = t.cw = t.cl = t.pf = t.pa = 0; t.apRank = 0; t.cfpRank = 0; });
  state.facilities.forEach(f => { if (f.building) { f.lvl++; f.building = false; addNews(`Construction complete: ${facName(f.id)} is now level ${f.lvl}.`); } });
  state.season++;
  state.games = []; state.polls = []; state.cfp = []; state.bracket = null; state.champ = null; state.week = 1; state.phase = 'regular'; state.bulletin = null;
  const keep = { ticket: state.fin.ticket, revPct: state.fin.revPct, recruit: state.fin.recruit, compliance: state.fin.compliance, extraRev: state.fin.extraRev, altUni: state.fin.altUni, beer: state.fin.beer };
  state.fin = Object.assign(newFinance(state.fin.balance), keep);
  buildSchedule(ownSchedule());
  Object.values(state.teams).forEach(t => t.elo0 = t.elo);
  computePoll('Preseason', false);
  setGoals();
  state.meters.morale = clamp(Math.round((state.meters.morale + 66) / 2), 0, 100);
  state.fin.drive = false; state.off = null; state.donorDemand = state.donorDemand === state.season - 1 ? null : state.donorDemand;
  Object.keys(state.ncOffers).forEach(k => { if (+k <= state.season) delete state.ncOffers[k]; });
  genNcOffers(state.season + 1); genNcOffers(state.season + 2);
  genRecruitClass();
  (state.deals || []).forEach(d => { if (d.thru < state.season) addNews(`The ${d.name.toLowerCase()} has expired. Negotiate a new one in Finances.`, 'bad'); else if (d.thru === state.season) addNews(`The ${d.name.toLowerCase()} expires after this season.`); });
  if (state.ban === state.season) addNews(`${myName()} is banned from the postseason in ${state.season}.`, 'bad');
  addNews(`The ${state.season} season begins. ${myName()} opens ranked ${rankOf(ME) ? 'No. ' + rankOf(ME) : 'outside the Top 25'}. The board expects at least ${state.expWins} wins.`, 'big');
  if (isCoach()) coachSeasonStart();
}
/* ---------- Roster floor ----------
 * Preferred walk-ons fill any position that falls below a playable minimum, and the roster
 * never drops under 80, so a thin recruiting year can't leave a team without a quarterback,
 * kicker or snapper. */
const ROSTER_FLOOR = { QB: 3, RB: 3, WR: 6, TE: 3, OL: 10, DE: 4, DT: 4, LB: 5, CB: 5, S: 4, K: 1, P: 1, LS: 1 };
function addFloorWalkon(pos) { const b = genBody(pos); const p = makePlayer({ num: freeNumber(pos), n: genName(), pos, cls: 'Fr', ht: b.ht, wt: b.wt, home: pick(TOWNS)[0], ovr: ri(50, 58) - Math.round(progShift() / 2), pot: ri(60, 74) - Math.round(progShift() / 3), real: false, walkon: true, pay: 0 }); state.roster.push(p); state.depth[pos].push(p.id); return p; }
function fillRoster() {
  let n = 0;
  POS_ORDER.forEach(pos => { while (state.roster.filter(p => p.pos === pos).length < ROSTER_FLOOR[pos]) { addFloorWalkon(pos); n++; } });
  let guard = 0; while (state.roster.length < 80 && guard++ < 80) { const pos = POS_ORDER.filter(p => !['K', 'P', 'LS'].includes(p)).sort((a, b) => needScore(b) - needScore(a))[0]; addFloorWalkon(pos); rebuildPMap(); n++; }
  if (n) { rebuildPMap(); addNews(`${n} preferred walk-on${n > 1 ? 's' : ''} join${n > 1 ? '' : 's'} the program to fill out the roster.`); }
  return n;
}
/* ---------- Automation ---------- */
function autoHire() { STAFF_ROLES.forEach(r => { let guard = 0; while ((!state.staff[r] || (r === 'HC' && state.staff.HC.interim && state.phase === 'offseason')) && guard++ < 12) { if (state.staff.HC && state.staff.HC.interim && r === 'HC') state.staff.HC = null; const c = (state.cands[r] || []).find(x => !x.declined); if (!c) { state.cands[r] = genCandidates(r, 4); continue; } hireCoach(r, c.id, true); }
  // the program never goes into a season without a head coach: the AD appoints one
  if (r === 'HC' && !state.staff.HC && !(isCoach() && state.co.role === 'HC')) { const c = genCandidates('HC', 3).sort((a, b) => coachOvr(b) - coachOvr(a))[0]; state.staff.HC = c; addNews(`${myName()} names ${c.name} head coach.`, 'big'); } }); }
function offStepNext() {
  if (isPro()) return proOffNext();
  runOffAutomation(); if (isPro()) return true; // automation took an NFL job (B02)
  const o = state.off;
  if (o.step === 0) { o.step = 1; }
  else if (o.step === 1 && isCoach()) { const fm = finishMarket(); if (!fm) return false; if (isPro() || state.pendingArrive) return true; aiADOffseason(); offCoaching(); coachNewBoss(); if (!state.staff.HC) autoHire(); o.step = 2; }
  else if (o.step === 1) { if (!o.boardRes) return false; offCoaching(); o.step = 2; }
  else if (o.step >= 3 && !state.staff.HC && !(isCoach() && (autoHire(), state.staff.HC))) return false;
  else if (o.step === 2) { (o.poach || []).forEach((x, i) => { if (!x.done) resolvePoach(i, false); }); if (isCoach() && !state.staff.HC) autoHire(); if (!state.staff.HC) return false; STAFF_ROLES.forEach(r => { if (r !== 'HC' && !state.staff[r]) state.staff[r] = mkCoach({ name: genName(), role: r, title: ROLE_TITLE[r], real: false, bg: 'Promoted graduate assistant', ovr: 62, rec: 62, dev: 64, salary: 0.2, years: 1 }); }); offDepartures(); o.step = 3; }
  else if (o.step === 3) { applyDepartures(); genPortal(); o.step = 4; }
  else if (o.step === 4) { o.step = 5; }
  else if (o.step === 5) { if (!state.rec.done) return false; fillRoster(); o.step = 6; }
  else if (o.step === 6) { runADDraft(); offDevelopment(); trimToLimit(); o.step = 7; }
  else if (o.step === 7) { nextSeason(); }
  runOffAutomation();
  return true;
}
// a lower roster limit (league rules) is enforced before the new season: the least useful players go first
function trimToLimit() {
  if ((+rules().roster || ROSTER_LIMIT) >= ROSTER_LIMIT) return []; // only a limit below today's rule trims (Classic plays as before)
  const lim = rosterLimit(); if (state.roster.length <= lim) return [];
  const keep = new Set(); POS_ORDER.forEach(pos => (state.depth[pos] || []).slice(0, START[pos] + 1).forEach(id => keep.add(id)));
  const order = state.roster.filter(p => !keep.has(p.id)).sort((a, b) => (a.walkon ? 0 : 1) - (b.walkon ? 0 : 1) || (a.ovr + a.pot * 0.4) - (b.ovr + b.pot * 0.4));
  const out = order.slice(0, state.roster.length - lim);
  out.forEach(p => { state.roster.splice(state.roster.indexOf(p), 1); POS_ORDER.forEach(pos => state.depth[pos] = (state.depth[pos] || []).filter(id => id !== p.id)); });
  rebuildPMap(); if (out.length) addNews(`${myName()} trims its roster to ${lim} players: ${out.length} released.`, 'bad'); return out;
}
function autoOffseason() {
  if (isComm() && typeof cmAutoAll === 'function') cmAutoAll(); /* the league office decides anything still open */
  if (isPro()) return proAutoOffseason();
  let guard = 0;
  while (state.phase === 'offseason' && !state.gameOver && guard++ < 20) {
    if (isPro()) return proAutoOffseason();
    const o = state.off;
    if (o.step === 1) { if (isCoach()) autoMarket(); else { autoBoard(); autoDeals(); } }
    if (o.step === 2) { (o.poach || []).forEach((x, i) => { if (!x.done) resolvePoach(i, true); }); autoHire(); }
    if (o.step === 4) { o.portal.slice(0, 6).forEach(x => { if (payRoom() > x.ask + 3) signPortal(x.id); }); }
    if (o.step === 5 && !state.rec.done) { const room = rosterLimit() - state.roster.length; state.rec.list.filter(r => r.status === 'open').sort((a, b) => recOdds(b) * (b.star + 1) - recOdds(a) * (a.star + 1)).slice(0, Math.max(0, Math.min(room - recCommits().length + 10, 30 - state.rec.list.filter(r => r.offered && r.status === 'open').length))).forEach(r => r.offered = true); signingDay(); } // the autopilot obeys the 30-offer cap too (CL-B7)
    offStepNext();
  }
}
// `only` limits the offers to some positions (Coach mode: the rest of the staff recruits the positions you don't)
// Works the board the way a good staff would: offers go where they can land, hopeless ones are pulled
// mid-season, and official visits go to home games for the best targets still deciding.
function autoSeasonRecruiting(only) {
  const rc = state.rec; if (!rc || rc.done) return; const ok = r => !only || only(r); const open = rc.list.filter(r => r.status === 'open' && ok(r));
  if (state.phase !== 'offseason' && state.week > 6) open.filter(r => r.offered && r.interest < 25).forEach(r => r.offered = false);
  const live = rc.list.filter(r => r.offered && r.status === 'open').length; const room = projRoom() - recCommits().length;
  open.filter(r => !r.offered).sort((a, b) => recOdds(b) * (b.star + 1) - recOdds(a) * (a.star + 1)).slice(0, Math.max(0, Math.min(30, room + 12) - live)).forEach(r => r.offered = true);
  if (state.phase === 'offseason' || !rc.visits || (only && rc.visits <= 7)) return; // the rest of a coach's staff leaves him half the visits
  const homes = state.games.filter(g => g.h === ME && !g.done && g.wk > state.week && g.type === 'reg');
  rc.list.filter(r => r.offered && r.status === 'open' && !r.visit && ok(r)).sort((a, b) => b.star * b.interest - a.star * a.interest).forEach(r => { const g = homes.find(x => rc.list.filter(y => y.visit === x.id).length < 4); if (g && rc.visits > 0) setVisit(r.id, g.id); });
}

/* ---------- Save migration (v1 → v2) ---------- */
function migrate(s) {
  ME = s.my || 'MICH';
  // v9.4: league rules. A save from before them keeps playing exactly as it did (the Classic preset).
  const rulesFix = () => { if (s.settings && !s.settings.rules) s.settings.rules = classicRules(s.settings); };
  if (s.lvl === 'nfl') { if (s.kind === 'coach') migrateCoach(s); rulesFix(); migratePro(s); rebuildConfs(); return s; }
  if (s.kind === 'coach') migrateCoach(s);
  if (!(s.v >= 3)) migrate3(s);
  if (s.v < 4) migrate4(s);
  rulesFix(); rebuildConfs(); return s;
}
// v3 -> v4 (Football Empire): the school is stored, the offseason gains an NFL Draft step.
function migrate4(s) {
  s.my = ME;
  if (s.phase === 'offseason' && s.off && s.off.step >= 6) s.off.step++;
  s.v = 4;
}
function migrate3(s) {
  state = s;
  if (!s.v || s.v < 2) {
    s.settings = { diff: 'normal', ask: true, noFire: false, forceM: 'none' }; s.plan = { off: 'balanced', def: 'balanced' };
    s.meters.hot = s.meters.hot || 20; s.rivals = JSON.parse(JSON.stringify(RIVAL_DATA)); s.rivalLog = []; s.book = { game: {}, season: {} }; s.alumni = []; s.trophies = []; s.draft = []; s.awards = []; s.ncBook = {}; s.ncOffers = {}; s.event = null; s.eventLog = [];
    Object.values(s.teams).forEach(t => { t.style = t.style || genStyle(); if (t.id !== ME && !t.stars) genStars(t); t.elo0 = t.elo; });
    rebuildPMap();
    s.roster.forEach(p => { p.susp = p.susp || 0; if (!p.tr) p.tr = genTraits(p.pos, p.ovr, p.n); if (p.pay == null || p.nil != null) { p.pay = r2(marketValue(p) * rnd(0.85, 1.05)); delete p.nil; } });
    const y = s.fin.ytd; ['games', 'events', 'niltop', 'guar', 'eventx'].forEach(k => y[k] = y[k] || 0); s.fin.collective = s.fin.collective || 0; delete s.fin.nilPool;
    s.games.forEach(g => { if (g.box && !g.box.op) g.box.op = {}; });
    if (s.off && s.off.recruits) s.off.recruits = null;
    genNcOffers(s.season + 1); genNcOffers(s.season + 2); genRecruitClass();
    if (s.phase === 'offseason' && s.off && s.off.step >= 4) s.off.step = 4;
  }
  // v2 -> v3
  s.settings.sound = s.settings.sound || false; s.settings.playoff = s.settings.playoff || { size: 12, auto: 'p4g6' };
  s.practice = s.practice || 'balanced'; s.captains = s.captains || []; s.ach = s.ach || {}; s.deals = s.deals || DEAL_DEFS.map(d => Object.assign({}, d)); s.investigations = s.investigations || []; s.mediaBonus = s.mediaBonus || 0; s.meters.risk = s.meters.risk || 10;
  s.fin.compliance = s.fin.compliance == null ? 1 : s.fin.compliance; s.fin.ytd.compliance = s.fin.ytd.compliance || 0; s.fin.ytd.incent = s.fin.ytd.incent || 0;
  Object.values(s.teams).forEach(t => { if (!t.coach) t.coach = genName(); });
  rebuildConfs(); rebuildPMap();
  s.roster.forEach(p => { if (!p.pers) p.pers = rollPers(p.real); });
  // old bracket format -> new
  if (s.bracket && !s.bracket.adv) { const b = s.bracket; b.size = 12; b.adv = { 1: [], 2: [], 3: [], 4: [] }; for (let m = 0; m < 8; m++) { const a = b.seeds[ORDER16[2 * m] - 1], c = b.seeds[ORDER16[2 * m + 1] - 1]; if (!(a && c)) b.adv[1][m] = a || c; } s.games.filter(g => g.type === 'cfp' && g.round === 1).forEach(g => { g.m = [0, 0, 0, 0, 2, 4, 6, 1, 1][g.slot] || 0; const map = { 5: 2, 6: 4, 7: 6, 8: 1 }; g.m = map[g.slot]; }); s.games.filter(g => g.type === 'cfp' && g.round > 1).forEach(g => { g.m = g.round === 2 ? { 1: 0, 4: 1, 3: 2, 2: 3 }[g.slot] : g.round === 3 ? (g.slot === 1 ? 0 : 1) : 0; }); }
  if (s.phase === 'offseason' && s.off) { const map = [0, 2, 3, 4, 5, 6]; s.off.step = map[s.off.step] != null ? map[s.off.step] : s.off.step; if (s.off.step >= 1) s.off.boardRes = s.off.boardRes || ['Skipped (older save).']; }
  if (!s.captains.length) autoCaptains();
  s.v = 3;
  return s;
}

