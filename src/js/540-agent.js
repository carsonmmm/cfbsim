/* ===================== v9.60: Agent mode =====================
 * You run a sports agency. Each year has six steps: sign draft prospects away from rival agencies, get them
 * ready for the draft, the draft itself, free agency (where you negotiate against the clubs), the season
 * (with decisions about your clients), and the year in review. You earn 3% of every contract.
 * It is a game of its own (see 530-mini-shell.js): the league here is a light model, not the full NFL engine.
 * The whole career is one object: { kind: 'agent', you, year, step, rep, cash, staff, clients, pros, teams,
 * fa, events, log, hist, ach }. Money is in millions of dollars. */
const AG_STEPS = [['sign', 'Signing season'], ['prep', 'Draft preparation'], ['draft', 'The draft'], ['fa', 'Free agency'], ['season', 'The season'], ['review', 'Year in review']];
const AG_TOP = { QB: 55, DE: 30, WR: 30, DT: 25, OL: 24, CB: 24, LB: 20, S: 18, TE: 16, RB: 14, K: 6, P: 4, LS: 1.5 }; // the best contract at each position, a year
const AG_POSW = [['QB', 6], ['RB', 7], ['WR', 13], ['TE', 6], ['OL', 16], ['DE', 10], ['DT', 8], ['LB', 10], ['CB', 11], ['S', 7], ['K', 1], ['P', 1]];
const AG_WANT = { money: ['The biggest contract', 'money'], winner: ['A club that wins', 'a winner'], role: ['A starting job', 'a starting job'], home: ['To play near home', 'home'] };
const AG_PITCH = { money: ['Show him the money', 'Your record getting clients paid.'], winner: ['Talk about winning', 'How you place clients with contenders.'], role: ['Promise him a role', 'A plan to land him where he starts.'], home: ['Meet the family', 'Time with his parents, at their table.'] };
const AG_RIVALS = [['Apex Sports Group', 82], ['Kessler & Vane', 68], ['Gridiron Partners', 54]];
const AG_STAFF = { scout: ['Scouting', 'Two more pitch meetings a year for each level, and better reads on prospects.', 0.25], negot: ['Negotiation', 'Clubs give a little more each time you push, and walk away less often.', 0.3], brand: ['Marketing', 'Endorsement money for your stars, and prospects notice.', 0.25] };
const AG_MIN = 0.9;
const agValue = (pos, ovr, age) => { const q = Math.max(0, (ovr - 60) / 38); let v = (AG_TOP[pos] || 10) * Math.pow(q, 1.6); if (age >= 30) v *= clamp(1 - 0.09 * (age - 29), 0.35, 1); return r2(Math.max(AG_MIN, v)); };
const agRookieApy = pick => r2(Math.max(AG_MIN, 0.9 + 9.6 * Math.exp(-pick / 24)));
const agRound = pick => Math.min(7, Math.ceil(pick / 32));
const agTeamName = id => (NFL_BY[id] ? NFL_BY[id].name : id);
const agLog = (g, t, tone) => { g.log.unshift({ y: g.year, t, tone: tone || '' }); if (g.log.length > 60) g.log.length = 60; };
const agMaxClients = g => 6 + (g.staff.scout + g.staff.negot + g.staff.brand) * 2;
const agPitches = g => 6 + g.staff.scout * 2;
const agStepKey = g => AG_STEPS[g.step][0];
const agFee = k => r2(0.03 * k.apy);
let agSeq = 0; const agId = g => 'a' + (g.nid = (g.nid || 0) + 1);
function agTeams(g) { // a fresh picture of the league each year: how good each club is, its cap room, where it needs help
  const T_ = {}; NFL.forEach(t => { const old = g.teams && g.teams[t.id]; const r = clamp(Math.round((old ? old.r : t.p) + gauss() * 3), 62, 92); const need = {}; shuffle(AG_POSW.map(x => x[0])).slice(0, 4).forEach(p => { need[p] = 1; }); T_[t.id] = { r, cap: r1(rnd(4, 60)), need }; }); return T_;
}
function agProspects(g) {
  const out = []; const picks = shuffle(Array.from({ length: 256 }, (_, i) => i + 1)).slice(0, 34).sort((a, b) => a - b);
  picks.forEach(pk => { const pos = wpick(AG_POSW.map(x => [x[0], x[1]])); const ovr = clamp(Math.round(79 - pk * 0.085 + gauss() * 2.5), 52, 82); const want = pick(Object.keys(AG_WANT));
    const heat = clamp(Math.round(AG_RIVALS[0][1] * 0.45 + (260 - pk) / 260 * 42 + gauss() * 9), 15, 96); // how hard the big agencies are chasing him
    out.push({ id: agId(g), n: genName(), pos, age: ri(21, 23), ovr, pot: clamp(ovr + ri(4, 14), ovr, 97), col: pick(Object.values(CTEAMS0_AD)).name, stock: pk, want, heat, int: clamp(Math.round(g.rep * 0.55 + gauss() * 8 + g.staff.brand * 4), 2, 90), pitched: {}, home: pick(NFL).id }); });
  return out;
}
function agNew(f) {
  const g = { kind: 'agent', v: 1, you: { name: plainName(f.name, 28) || 'Jordan Reese', agency: plainName(f.agency, 32) || 'Reese Sports' }, year: 2026, step: 0, rep: 18, cash: 0.35, staff: { scout: 0, negot: 0, brand: 0 }, clients: [], pros: [], teams: null, fa: [], events: [], log: [], hist: [], ach: {}, nid: 0, stats: { fees: 0, deals: 0, best: 0, firsts: 0 } };
  g.teams = agTeams(g);
  // two veterans who took a chance on a new agent; both are out of contract after this season
  for (let i = 0; i < 2; i++) { const pos = pick(['WR', 'LB', 'CB', 'OL', 'S', 'RB']); const age = ri(26, 29), ovr = ri(71, 77); const tm = pick(NFL).id; g.clients.push({ id: agId(g), n: genName(), pos, age, ovr, pot: ovr + 1, tm, k: { apy: r2(agValue(pos, ovr, age) * 0.8), yrs: 2, left: 1 }, trust: 62, want: pick(Object.keys(AG_WANT)), home: pick(NFL).id, lvl: 'nfl', since: 2026, earned: 0 }); }
  g.pros = agProspects(g); g.pitches = agPitches(g); agLog(g, `${g.you.agency} opens its doors with two clients and a phone.`); return g;
}
function agCheck(g) { if (!g || !g.you || !Array.isArray(g.clients) || !(g.step >= 0 && g.step < AG_STEPS.length)) return null; g.pros = g.pros || []; g.fa = g.fa || []; g.events = g.events || []; g.log = g.log || []; g.hist = g.hist || []; g.ach = g.ach || {}; g.staff = Object.assign({ scout: 0, negot: 0, brand: 0 }, g.staff); g.stats = Object.assign({ fees: 0, deals: 0, best: 0, firsts: 0 }, g.stats); if (!g.teams) g.teams = agTeams(g); return g; }
const agAch = (g, k, t) => { if (!g.ach[k]) { g.ach[k] = g.year; agLog(g, 'Milestone: ' + t, 'good'); } };

/* ---------- step 1: signing season ---------- */
function agPitch(g, pid, topic) {
  const p = g.pros.find(x => x.id === pid); if (!p || agStepKey(g) !== 'sign' || g.pitches <= 0 || p.pitched[topic] || p.signed) return 'no';
  g.pitches--; p.pitched[topic] = 1; const hit = topic === p.want; p.int = clamp(p.int + (hit ? 26 : 7) + g.staff.brand * 2, 0, 99); if (hit) p.known = true; return hit ? 'hit' : 'miss';
}
function agAdvance(g, pid) { const p = g.pros.find(x => x.id === pid); if (!p || agStepKey(g) !== 'sign' || p.adv || g.cash < 0.05) return false; g.cash = r2(g.cash - 0.05); p.adv = true; p.int = clamp(p.int + 14, 0, 99); return true; }
function agSigningEnd(g) {
  let n = 0; const room = agMaxClients(g) - g.clients.length; const mine = g.pros.filter(p => p.int > p.heat).sort((a, b) => a.stock - b.stock).slice(0, Math.max(0, room));
  mine.forEach(p => { p.signed = true; n++; g.clients.push({ id: p.id, n: p.n, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, tm: null, k: null, trust: clamp(55 + (p.known ? 12 : 0), 0, 100), want: p.want, home: p.home, lvl: 'draft', stock: p.stock, col: p.col, since: g.year, earned: 0, prep: null }); });
  const lost = g.pros.filter(p => !p.signed && Object.keys(p.pitched).length); agLog(g, n ? `${n} prospect${n > 1 ? 's' : ''} signed with ${g.you.agency}: ${mine.map(p => p.n).join(', ')}.` : 'No prospect signed with you this year.', n ? 'good' : 'bad');
  if (lost.length) agLog(g, `${lost.slice(0, 3).map(p => p.n).join(', ')} went with ${AG_RIVALS[0][0]} and the other big agencies.`); g.pros = [];
}
/* ---------- step 2 and 3: preparation and the draft ---------- */
const AG_PREP = { elite: ['Elite training', 'Six weeks with a private coach. Costs $80,000. His stock rises.', 0.08], std: ['Standard preparation', 'The usual. No cost.', 0], skip: ['Skip the workouts', 'Stand on his game film. It can go either way, and scouts talk.', 0] };
function agPrep(g, cid, k) { const c = g.clients.find(x => x.id === cid); if (!c || c.lvl !== 'draft' || !AG_PREP[k] || agStepKey(g) !== 'prep') return false; const was = c.prep ? AG_PREP[c.prep][2] : 0; const cost = AG_PREP[k][2]; if (g.cash + was < cost) return false; g.cash = r2(g.cash + was - cost); c.prep = k; return true; }
function agDraft(g) {
  const res = []; g.clients.filter(c => c.lvl === 'draft').forEach(c => {
    const mv_ = c.prep === 'elite' ? -(6 + c.stock * 0.12) : c.prep === 'skip' ? gauss() * (10 + c.stock * 0.18) : 0; const pk = Math.round(clamp(c.stock + mv_ + gauss() * (4 + c.stock * 0.1), 1, 300));
    if (pk > 256) { c.lvl = 'nfl'; c.tm = pick(NFL).id; c.k = { apy: AG_MIN, yrs: 1, left: 1 }; c.trust = clamp(c.trust - 10, 0, 100); res.push(`${c.n} (${c.pos}) was not drafted. He signs with the ${agTeamName(c.tm)} as a free agent.`); return; }
    const fits = NFL.filter(t => g.teams[t.id].need[c.pos]); c.tm = pick(fits.length ? fits : NFL).id; c.lvl = 'nfl'; c.pick = pk; c.k = { apy: agRookieApy(pk), yrs: 4, left: 4, rk: true };
    const rose = pk < c.stock - 8; c.trust = clamp(c.trust + (rose ? 10 : pk > c.stock + 12 ? -8 : 2), 0, 100); if (agRound(pk) === 1) { g.stats.firsts++; g.rep = clamp(g.rep + 4, 0, 100); agAch(g, 'first', 'your first first-round pick.'); } if (pk <= 10) agAch(g, 'top10', 'a client taken in the top ten.');
    res.push(`${c.n} (${c.pos}): round ${agRound(pk)}, pick ${pk}, to the ${agTeamName(c.tm)}. ${fmM(c.k.apy)} a year for four years${rose ? ', higher than projected' : pk > c.stock + 12 ? ', lower than projected' : ''}.`);
  });
  res.forEach(t => agLog(g, t)); return res;
}
/* ---------- step 4: free agency ---------- */
// Each club has a number in mind that it will not say out loud. Pushing moves its offer toward that number, or ends the talk.
function agOffers(g, c) {
  const val = agValue(c.pos, c.ovr, c.age); const n = clamp(Math.round(1.5 + (c.ovr - 66) / 6 + R() * 1.5), 1, 5);
  const pool = shuffle(NFL.slice()).sort((a, b) => (g.teams[b.id].need[c.pos] || 0) - (g.teams[a.id].need[c.pos] || 0)).slice(0, n);
  return pool.map(t => { const tm = g.teams[t.id]; const need = tm.need[c.pos] ? 1.12 : 0.92; const max = r2(Math.max(AG_MIN, Math.min(tm.cap, val * need * rnd(0.9, 1.15)))); const open = r2(Math.max(AG_MIN, max * rnd(0.72, 0.86)));
    return { tm: t.id, apy: open, max, yrs: c.age >= 31 ? ri(1, 2) : ri(2, 4), start: !!tm.need[c.pos] || c.ovr >= 80, pushes: 0, gone: false }; });
}
function agFaStart(g) {
  g.fa = []; g.clients.filter(c => c.lvl === 'nfl' && c.k && c.k.left <= 0).forEach(c => { const offers = agOffers(g, c); g.fa.push({ cid: c.id, offers, val: agValue(c.pos, c.ovr, c.age), done: false }); });
  if (!g.fa.length) agLog(g, 'None of your clients is out of contract this year.');
}
const agLeverage = (g, f) => clamp(0.34 + (f.offers.filter(o => !o.gone).length - 1) * 0.11 + g.staff.negot * 0.08 + (g.rep - 40) / 300, 0.15, 0.9);
function agPush(g, cid, tm) {
  const f = g.fa.find(x => x.cid === cid && !x.done); const o = f && f.offers.find(x => x.tm === tm && !x.gone); if (!o) return 'no';
  o.pushes++; if (o.apy >= o.max - 0.01) { if (R() < 0.5 - g.staff.negot * 0.1) { o.gone = true; return 'walk'; } return 'firm'; }
  if (R() < agLeverage(g, f) - (o.pushes - 1) * 0.12) { o.apy = r2(Math.min(o.max, o.apy + (o.max - o.apy) * rnd(0.45, 0.8) + 0.01)); return 'up'; }
  if (R() < 0.3 - g.staff.negot * 0.06 + (o.pushes - 1) * 0.1) { o.gone = true; return 'walk'; } return 'hold';
}
function agFit(g, c, o) { // how well an offer matches what he wants, 0 to 1
  if (c.want === 'money') return clamp(o.apy / Math.max(AG_MIN, agValue(c.pos, c.ovr, c.age)), 0, 1.2) / 1.2;
  if (c.want === 'winner') return clamp((g.teams[o.tm].r - 66) / 22, 0, 1); if (c.want === 'role') return o.start ? 1 : 0.25; return o.tm === c.home ? 1 : NFL_BY[o.tm].div === NFL_BY[c.home].div ? 0.6 : 0.2;
}
function agAccept(g, cid, tm) {
  const f = g.fa.find(x => x.cid === cid && !x.done); const c = g.clients.find(x => x.id === cid); const o = f && f.offers.find(x => x.tm === tm && !x.gone); if (!o || !c) return '';
  f.done = true; c.tm = o.tm; c.k = { apy: o.apy, yrs: o.yrs, left: o.yrs }; const fit = agFit(g, c, o); const pay = o.apy / f.val; const d = Math.round((fit - 0.5) * 26 + (pay - 0.9) * 20); c.trust = clamp(c.trust + d, 0, 100);
  g.stats.deals++; g.stats.best = Math.max(g.stats.best, r1(o.apy * o.yrs)); if (pay >= 1.05) g.rep = clamp(g.rep + 3, 0, 100); else if (pay < 0.8) g.rep = clamp(g.rep - 2, 0, 100); if (o.apy * o.yrs >= 100) agAch(g, 'hundred', 'a contract worth $100 million.');
  const m = `${c.n} signs with the ${agTeamName(o.tm)}: ${fmM(o.apy)} a year for ${o.yrs} year${o.yrs > 1 ? 's' : ''}. ${d >= 8 ? 'He is thrilled.' : d >= 0 ? 'He is content.' : 'It is not what he asked you for.'}`; agLog(g, m, d >= 0 ? 'good' : 'bad'); return m;
}
function agFaEnd(g) { g.fa.filter(f => !f.done).forEach(f => { const c = g.clients.find(x => x.id === f.cid); if (!c) return; const best = f.offers.filter(o => !o.gone).sort((a, b) => b.apy - a.apy)[0]; if (best) { agAccept(g, c.id, best.tm); c.trust = clamp(c.trust - 6, 0, 100); } else { c.tm = null; c.k = null; c.lvl = 'out'; c.trust = clamp(c.trust - 25, 0, 100); agLog(g, `${c.n} has no club. Every team walked away.`, 'bad'); } }); g.fa = []; }
/* ---------- step 5: the season ---------- */
const AG_EVENTS = [
  { k: 'holdout', ok: c => c.k && c.k.left >= 2 && c.ovr >= 80 && c.k.apy < agValue(c.pos, c.ovr, c.age) * 0.75, t: c => `${c.n} is badly underpaid and wants to hold out for a new deal.`,
    o: [['Back the holdout', 'Even odds the club gives in. If it does not, he loses money and blames you a little.', (g, c) => { if (R() < 0.5 + g.staff.negot * 0.08) { c.k = { apy: r2(agValue(c.pos, c.ovr, c.age) * 0.97), yrs: 4, left: 4 }; c.trust = clamp(c.trust + 14, 0, 100); g.rep = clamp(g.rep + 3, 0, 100); g.stats.deals++; return `The ${agTeamName(c.tm)} blink. ${c.n} gets ${fmM(c.k.apy)} a year.`; } c.trust = clamp(c.trust - 8, 0, 100); return `The ${agTeamName(c.tm)} do not move. ${c.n} reports late and is fined.`; }], ['Talk him out of it', 'He plays. He is not happy with you.', (g, c) => { c.trust = clamp(c.trust - 6, 0, 100); return `${c.n} reports on time.`; }]] },
  { k: 'trouble', ok: c => c.lvl === 'nfl', t: c => `${c.n} is in the news for the wrong reasons after a night out. Reporters are calling you.`,
    o: [['Get in front of it', 'You fly out and handle the press yourself. Costs $30,000.', (g, c) => { g.cash = r2(g.cash - 0.03); c.trust = clamp(c.trust + 10, 0, 100); g.rep = clamp(g.rep + 1, 0, 100); return `It is a one-day story. ${c.n} thanks you.`; }], ['Say nothing', 'It may blow over.', (g, c) => { if (R() < 0.5) { g.rep = clamp(g.rep - 3, 0, 100); c.trust = clamp(c.trust - 6, 0, 100); return 'It does not blow over. Your name is in every story.'; } return 'It blows over.'; }]] },
  { k: 'poach', ok: (c, g) => c.ovr >= 78 && c.trust < 75, t: c => `${AG_RIVALS[0][0]} has been taking ${c.n} to dinner.`,
    o: [['Fly out and see him', 'Costs $20,000. He usually stays.', (g, c) => { g.cash = r2(g.cash - 0.02); if (R() < 0.3 + c.trust / 110) { c.trust = clamp(c.trust + 8, 0, 100); return `${c.n} says he is not going anywhere.`; } g.clients = g.clients.filter(x => x !== c); g.rep = clamp(g.rep - 4, 0, 100); return `${c.n} fires you and signs with ${AG_RIVALS[0][0]}.`; }], ['Trust the relationship', 'It costs nothing.', (g, c) => { if (R() < c.trust / 100) return `${c.n} stays.`; g.clients = g.clients.filter(x => x !== c); g.rep = clamp(g.rep - 4, 0, 100); return `${c.n} fires you and signs with ${AG_RIVALS[0][0]}.`; }]] },
  { k: 'endorse', ok: c => c.ovr >= 82, t: c => `A national brand wants ${c.n} for a campaign.`,
    o: [['Take the deal', 'You earn 15% of it.', (g, c) => { const amt = r2((c.ovr - 76) * 0.35 * (1 + g.staff.brand * 0.35)); g.cash = r2(g.cash + amt * 0.15); g.stats.fees = r2(g.stats.fees + amt * 0.15); c.trust = clamp(c.trust + 5, 0, 100); return `${c.n} signs for ${fmM(amt)}. Your cut is ${fmM(r2(amt * 0.15))}.`; }], ['Hold out for a better one', 'One time in three something bigger comes.', (g, c) => { if (R() < 0.34 + g.staff.brand * 0.12) { const amt = r2((c.ovr - 72) * 0.6 * (1 + g.staff.brand * 0.35)); g.cash = r2(g.cash + amt * 0.15); g.stats.fees = r2(g.stats.fees + amt * 0.15); c.trust = clamp(c.trust + 9, 0, 100); return `A bigger brand calls. ${c.n} signs for ${fmM(amt)}.`; } c.trust = clamp(c.trust - 3, 0, 100); return 'Nothing else comes.'; }]] },
  { k: 'trade', ok: (c, g) => c.k && c.k.left >= 1 && g.teams[c.tm] && g.teams[c.tm].r < 72 && c.want === 'winner', t: c => `${c.n} is tired of losing with the ${agTeamName(c.tm)} and wants out.`,
    o: [['Ask for a trade', 'It may work. It will not make you friends in that front office.', (g, c) => { if (R() < 0.45 + g.rep / 300) { const to = NFL.filter(t => g.teams[t.id].r >= 80)[0] || pick(NFL); c.tm = to.id; c.trust = clamp(c.trust + 14, 0, 100); return `${c.n} is traded to the ${agTeamName(c.tm)}.`; } c.trust = clamp(c.trust - 4, 0, 100); g.rep = clamp(g.rep - 1, 0, 100); return 'The club says no, and does not appreciate the call.'; }], ['Tell him to be patient', 'He stays.', (g, c) => { c.trust = clamp(c.trust - 5, 0, 100); return `${c.n} stays put, unhappily.`; }]] },
];
function agSeasonStart(g) {
  g.events = []; const pool = shuffle(g.clients.filter(c => c.lvl === 'nfl').slice());
  for (const c of pool) { if (g.events.length >= 3) break; const ev = shuffle(AG_EVENTS.slice()).find(e => e.ok(c, g) && !g.events.some(x => x.k === e.k)); if (ev && R() < 0.75) g.events.push({ k: ev.k, cid: c.id, t: ev.t(c), done: false }); }
}
function agEvent(g, i, opt) { const e = g.events[i]; if (!e || e.done) return ''; const def = AG_EVENTS.find(x => x.k === e.k); const c = g.clients.find(x => x.id === e.cid); e.done = true; if (!def || !c) return ''; const m = def.o[opt][2](g, c); e.res = m; agLog(g, m); return m; }
function agSeasonPlay(g) {
  g.events.filter(e => !e.done).forEach((e, i) => agEvent(g, g.events.indexOf(e), 1)); const notes = [];
  g.clients.filter(c => c.lvl === 'nfl').forEach(c => {
    const grow = c.age <= 25 ? (c.pot - c.ovr) * rnd(0.2, 0.5) : c.age <= 29 ? gauss() * 1.2 : -rnd(0.5, 2.6) - (c.age - 30) * 0.4; c.ovr = clamp(Math.round(c.ovr + grow), 50, 99);
    if (R() < 0.08) { c.ovr = clamp(c.ovr - ri(1, 4), 50, 99); notes.push(`${c.n} missed most of the season with an injury.`); }
    else if (c.ovr >= 86 && R() < 0.6) { c.probowl = (c.probowl || 0) + 1; g.rep = clamp(g.rep + 2, 0, 100); notes.push(`${c.n} made the Pro Bowl.`); agAch(g, 'probowl', 'a client in the Pro Bowl.'); }
    if (g.teams[c.tm] && g.teams[c.tm].r >= 86 && R() < 0.12) { c.rings = (c.rings || 0) + 1; notes.push(`${c.n} won the Super Bowl with the ${agTeamName(c.tm)}.`); c.trust = clamp(c.trust + 4, 0, 100); }
  });
  notes.forEach(t => agLog(g, t, 'good')); return notes;
}
/* ---------- step 6: the year in review, then a new year ---------- */
function agReview(g) {
  const fees = r2(g.clients.reduce((s, c) => s + (c.k && c.lvl === 'nfl' ? agFee(c.k) : 0), 0)); const cost = r2(0.12 + (g.staff.scout + g.staff.negot + g.staff.brand) * 0.07);
  g.clients.forEach(c => { if (c.k && c.lvl === 'nfl') c.earned = r2((c.earned || 0) + agFee(c.k)); });
  g.cash = r2(g.cash + fees - cost); g.stats.fees = r2(g.stats.fees + fees); const fired = g.clients.filter(c => c.trust < 25 && c.lvl === 'nfl');
  fired.forEach(c => { agLog(g, `${c.n} fires you. He says he never felt like a priority.`, 'bad'); g.rep = clamp(g.rep - 3, 0, 100); }); g.clients = g.clients.filter(c => !fired.includes(c) && c.lvl !== 'out');
  const rep0 = g.hist.length ? g.hist[g.hist.length - 1].rep : 18; g.rep = clamp(g.rep + (g.clients.length >= 8 ? 1 : 0), 0, 100);
  g.hist.push({ y: g.year, fees, cost, cash: g.cash, rep: g.rep, clients: g.clients.length, d: g.rep - rep0 });
  if (g.clients.length >= 10) agAch(g, 'ten', 'ten clients.'); if (g.rep >= 90) agAch(g, 'super', 'the most respected agency in football.'); if (g.cash >= 10) agAch(g, 'rich', '$10 million in the bank.');
  if (g.cash < -0.5) { g.over = { y: g.year, why: 'The agency ran out of money.' }; agLog(g, `${g.you.agency} closes. The money ran out.`, 'bad'); }
  return { fees, cost, fired: fired.length };
}
function agNewYear(g) {
  g.year++; g.step = 0; g.clients.forEach(c => { c.age++; if (c.k) c.k.left--; });
  const ret = g.clients.filter(c => c.lvl === 'nfl' && (c.age >= 36 || (c.age >= 32 && c.ovr < 68) || (c.age >= 33 && R() < 0.3))); ret.forEach(c => agLog(g, `${c.n} retires after ${c.age - 22} seasons. You earned ${fmM(c.earned || 0)} representing him.`)); g.clients = g.clients.filter(c => !ret.includes(c));
  g.teams = agTeams(g); g.pros = agProspects(g); g.pitches = agPitches(g); g.fa = []; g.events = [];
}
// the one button that moves the year along
function agNext(g) {
  if (g.over) return 'over'; const k = agStepKey(g);
  if (k === 'sign') { agSigningEnd(g); g.step = 1; if (!g.clients.some(c => c.lvl === 'draft')) { g.step = 3; agFaStart(g); } }
  else if (k === 'prep') { g.clients.forEach(c => { if (c.lvl === 'draft' && !c.prep) c.prep = 'std'; }); g.step = 2; g.draftRes = agDraft(g); }
  else if (k === 'draft') { g.step = 3; agFaStart(g); }
  else if (k === 'fa') { agFaEnd(g); g.step = 4; agSeasonStart(g); }
  else if (k === 'season') { g.seasonNotes = agSeasonPlay(g); g.step = 5; g.rev = agReview(g); }
  else if (!g.over) agNewYear(g);
  return agStepKey(g);
}
const agLegacy = g => Math.round(g.rep * 2 + g.stats.fees * 6 + g.stats.firsts * 8 + Object.keys(g.ach).length * 10 + g.clients.reduce((s, c) => s + (c.probowl || 0) * 3 + (c.rings || 0) * 5, 0));
const agUpgradeCost = (g, k) => r2(AG_STAFF[k][2] * (g.staff[k] + 1));
function agUpgrade(g, k) { if (!AG_STAFF[k] || g.staff[k] >= 3) return false; const cost = agUpgradeCost(g, k); if (g.cash < cost) return false; g.cash = r2(g.cash - cost); g.staff[k]++; if (k === 'scout' && agStepKey(g) === 'sign') g.pitches += 2; agLog(g, `${AG_STAFF[k][0]} is now level ${g.staff[k]}.`); return true; }

/* ---------- the pages ---------- */
const agTrust = t => `<span class="pill ${t >= 70 ? 'good' : t >= 40 ? 'ghost' : 'bad'}">${t >= 70 ? 'Trusts you' : t >= 40 ? 'Watching' : 'Unhappy'}</span>`;
const agNextLabel = g => (g.over ? null : ({ sign: 'Close the signing season', prep: 'Go to the draft', draft: 'On to free agency', fa: 'Close free agency', season: 'Play the season', review: `Start ${g.year + 1}` })[agStepKey(g)]);
function agHeader(g) { return { title: g.you.agency, sub: `${g.you.name}, agent · ${g.year} · ${AG_STEPS[g.step][1]}`, cells: [['Reputation', String(g.rep), g.rep >= 80 ? 'Elite' : g.rep >= 55 ? 'Respected' : g.rep >= 30 ? 'Known' : 'Unknown'], ['Bank', fmM(g.cash) === '$0' && g.cash < 0 ? '−' + fmM(-g.cash) : (g.cash < 0 ? '−' + fmM(-g.cash) : fmM(g.cash))], ['Clients', g.clients.length + ' of ' + agMaxClients(g)], ['Fees a year', fmM(r2(g.clients.reduce((s, c) => s + (c.k && c.lvl === 'nfl' ? agFee(c.k) : 0), 0)))]], primary: agNextLabel(g) ? [agNextLabel(g), 'agnext'] : null }; }
const agStepsBar = g => `<ol class="agsteps">${AG_STEPS.map(([k, l], i) => `<li class="${i === g.step ? 'on' : i < g.step ? 'done' : ''}">${esc(l)}</li>`).join('')}</ol>`;
function agOfficeHTML(g) {
  const k = agStepKey(g); let main = '';
  if (g.over) main = `<section class="card decision"><div class="eyebrow">The end</div><h2 class="h2">${esc(g.you.agency)} has closed</h2><p>${esc(g.over.why)} You lasted ${g.hist.length} year${g.hist.length === 1 ? '' : 's'} and finished with a legacy of ${agLegacy(g)}. Start a new career from the Saves page.</p></section>`;
  else if (k === 'sign') main = `<section class="card next"><div class="eyebrow">${g.year} · Signing season</div><h2 class="h2">${g.pitches} pitch meeting${g.pitches === 1 ? '' : 's'} left</h2><p>Draft prospects are choosing agents. Each one wants something different from his career. Find out what, pitch it, and he may choose you over the big agencies. You have room for ${Math.max(0, agMaxClients(g) - g.clients.length)} more client${agMaxClients(g) - g.clients.length === 1 ? '' : 's'}.</p><div class="row gap"><button class="btn primary" data-act="mtab" data-tab="board">Open the prospect board</button></div></section>`;
  else if (k === 'prep') { const L = g.clients.filter(c => c.lvl === 'draft'); main = `<section class="card next"><div class="eyebrow">${g.year} · Draft preparation</div><h2 class="h2">Get them ready</h2><p>Where a rookie is drafted sets his first contract, and your fee, for four years.</p><div class="tw"><table class="tbl"><thead><tr><th>Client</th><th>Projected</th><th>Plan</th></tr></thead><tbody>${L.map(c => `<tr><td><b>${esc(c.n)}</b> <span class="muted">${c.pos}, ${esc(c.col || '')}</span></td><td>Round ${agRound(c.stock)}, about pick ${c.stock}</td><td>${Object.entries(AG_PREP).map(([pk, d]) => `<button class="btn sm${c.prep === pk || (!c.prep && pk === 'std') ? ' primary' : ' ghost'}" data-act="agprep" data-id="${c.id}" data-v="${pk}" title="${esc(d[1])}">${esc(d[0])}${d[2] ? ' · ' + fmM(d[2]) : ''}</button>`).join(' ')}</td></tr>`).join('')}</tbody></table></div><p class="small muted">Elite training costs $80,000 and lifts his stock. Skipping the workouts can go either way.</p></section>`; }
  else if (k === 'draft') main = `<section class="card next"><div class="eyebrow">${g.year} · The draft</div><h2 class="h2">Draft night</h2><ul class="plainlist">${(g.draftRes || []).map(t => `<li>${esc(t)}</li>`).join('') || '<li class="muted">You had nobody in this draft.</li>'}</ul></section>`;
  else if (k === 'fa') main = g.fa.length ? g.fa.map(f => { const c = g.clients.find(x => x.id === f.cid); if (!c) return ''; const live = f.offers.filter(o => !o.gone);
      return `<section class="card ${f.done ? '' : 'decision'}" data-fa="${c.id}"><div class="eyebrow">Free agency · ${esc(c.pos)} · age ${c.age} · ${c.ovr} overall</div><h2 class="h3">${esc(c.n)} ${agTrust(c.trust)}</h2><p class="small">He wants: <b>${esc(AG_WANT[c.want][0].toLowerCase())}</b>. The market says he is worth about ${fmM(f.val)} a year.${f.done ? ` Signed with the ${esc(agTeamName(c.tm))}.` : ''}</p>
      ${f.done ? '' : `<div class="tw"><table class="tbl"><thead><tr><th>Club</th><th class="num">A year</th><th class="num">Years</th><th></th></tr></thead><tbody>${f.offers.map(o => `<tr class="${o.gone ? 'muted' : ''}"><td><b>${esc(agTeamName(o.tm))}</b>${o.tm === c.home ? ' <span class="pill ghost">Home</span>' : ''}<div class="small muted">${o.gone ? 'Walked away' : (o.start ? 'Starter' : 'Backup') + ' · ' + (g.teams[o.tm].r >= 82 ? 'contender' : g.teams[o.tm].r >= 74 ? 'middle of the pack' : 'rebuilding')}</div></td><td class="num">${o.gone ? '—' : fmM(o.apy)}</td><td class="num">${o.gone ? '' : o.yrs}</td><td>${o.gone ? '' : `<div class="row gap"><button class="btn sm primary" data-act="agtake" data-id="${c.id}" data-tm="${o.tm}">Accept</button><button class="btn sm ghost" data-act="agpush" data-id="${c.id}" data-tm="${o.tm}">Ask for more</button></div>`}</td></tr>`).join('')}</tbody></table></div><p class="small muted">${live.length > 1 ? `${live.length} clubs are bidding, which gives you leverage.` : live.length ? 'One club left. Push carefully.' : 'Every club has walked away.'} Asking for more can raise an offer or end the talk.</p>`}</section>`; }).join('') : `<section class="card next"><div class="eyebrow">${g.year} · Free agency</div><h2 class="h2">A quiet spring</h2><p>None of your clients is out of contract.</p></section>`;
  else if (k === 'season') main = (g.events.length ? g.events.map((e, i) => { const def = AG_EVENTS.find(x => x.k === e.k); return `<section class="card ${e.done ? '' : 'decision'}"><div class="eyebrow">${e.done ? 'Handled' : 'Decision needed'} · during the season</div><h2 class="h3">${esc(e.t)}</h2>${e.done ? `<p>${esc(e.res || '')}</p>` : `<div class="evopts">${def.o.map((o, j) => `<button class="evopt" data-act="agev" data-i="${i}" data-v="${j}"><b>${esc(o[0])}</b><span>${esc(o[1])}</span></button>`).join('')}</div>`}</section>`; }).join('') : '') + `<section class="card next"><div class="eyebrow">${g.year} · The season</div><h2 class="h2">Your clients are playing</h2><p>${g.events.some(e => !e.done) ? 'Answer what is on your desk, then play the season. Anything left unanswered is handled the quiet way.' : 'Nothing is waiting on you. Play the season to see how they did.'}</p></section>`;
  else { const r = g.rev || { fees: 0, cost: 0, fired: 0 }; const h = g.hist[g.hist.length - 1] || {}; main = `<section class="card next"><div class="eyebrow">${g.year} · Year in review</div><h2 class="h2">${r.fees - r.cost >= 0 ? 'A profit of ' + fmM(r2(r.fees - r.cost)) : 'A loss of ' + fmM(r2(r.cost - r.fees))}</h2><div class="tiles"><div><span class="k">Fees earned</span><span class="v">${fmM(r.fees)}</span></div><div><span class="k">Costs</span><span class="v">${fmM(r.cost)}</span></div><div><span class="k">Reputation</span><span class="v">${g.rep}</span><span class="s">${h.d > 0 ? '+' + h.d : h.d || 0} this year</span></div><div><span class="k">Legacy</span><span class="v">${agLegacy(g)}</span></div></div>${(g.seasonNotes || []).length ? `<ul class="plainlist small mt">${g.seasonNotes.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</section>`; }
  const first = !g.hist.length && g.step === 0 ? `<section class="card"><div class="eyebrow">How it works</div><p class="small">You earn 3% of every contract your clients sign, every year it runs. Sign prospects, get them drafted high, and negotiate hard in free agency without losing the club or the client. Clients who stop trusting you leave. Spend what you earn on staff from the Agency page.</p></section>` : '';
  return `${agStepsBar(g)}${main}${first}<section class="card"><div class="eyebrow">Latest</div><ul class="plainlist small">${g.log.slice(0, 10).map(x => `<li><span class="muted">${x.y}</span> · <span class="${x.tone === 'good' ? 'res-w' : x.tone === 'bad' ? 'res-l' : ''}">${esc(x.t)}</span></li>`).join('')}</ul></section>`;
}
function agClientsHTML(g) {
  const rows = g.clients.slice().sort((a, b) => b.ovr - a.ovr).map(c => `<tr><td><b>${esc(c.n)}</b>${c.probowl ? ` <span class="pill maize">${c.probowl}× Pro Bowl</span>` : ''}</td><td>${c.pos}</td><td class="num">${c.age}</td><td>${ovrTag(c.ovr)}</td><td>${c.lvl === 'draft' ? `<span class="muted">Draft prospect, round ${agRound(c.stock)}</span>` : esc(c.tm ? agTeamName(c.tm) : 'No club')}</td><td class="num">${c.k ? fmM(c.k.apy) : '—'}</td><td class="num">${c.k ? Math.max(0, c.k.left) : ''}</td><td class="num">${c.k ? fmM(agFee(c.k)) : '—'}</td><td>${esc(AG_WANT[c.want][1])}</td><td>${agTrust(c.trust)}</td></tr>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Clients</div><h2 class="h2">${g.clients.length} of ${agMaxClients(g)}</h2></div><p class="hint">Your fee is 3% of each contract, every year. A client whose trust falls too low will fire you.</p></div>${g.clients.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Client</th><th>Pos</th><th class="num">Age</th><th>Overall</th><th>Club</th><th class="num">A year</th><th class="num">Years left</th><th class="num">Your fee</th><th>Wants</th><th>Trust</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">No clients. Sign some in the signing season.</p>'}</section>`;
}
function agBoardHTML(g) {
  if (agStepKey(g) !== 'sign') return `<section class="card"><div class="eyebrow">Prospects</div><h2 class="h2">The board is closed</h2><p class="muted">Prospects choose their agents in the signing season, at the start of each year.</p></section>`;
  const rows = g.pros.map(p => { const lead = p.int > p.heat; const read = g.staff.scout >= 2 || p.known;
    return `<tr><td><b>${esc(p.n)}</b><div class="small muted">${esc(p.col)}</div></td><td>${p.pos}</td><td>${ovrTag(p.ovr)}</td><td>Rd ${agRound(p.stock)}<div class="small muted">about pick ${p.stock}</div></td><td>${read ? esc(AG_WANT[p.want][0]) : '<span class="muted">Not known yet</span>'}</td><td><span class="pill ${lead ? 'good' : p.int > p.heat - 15 ? 'warn' : 'ghost'}">${lead ? 'Leaning your way' : p.int > p.heat - 15 ? 'Close' : 'With the big agencies'}</span></td><td class="nowrap">${Object.entries(AG_PITCH).map(([k, d]) => `<button class="btn sm ghost" data-act="agpitch" data-id="${p.id}" data-v="${k}" title="${esc(d[1])}"${p.pitched[k] || g.pitches <= 0 ? ' disabled' : ''}>${esc(d[0])}</button>`).join(' ')} <button class="btn sm ghost" data-act="agadv" data-id="${p.id}"${p.adv || g.cash < 0.05 ? ' disabled' : ''} title="A $50,000 advance against his first contract">Advance $50K</button></td></tr>`; }).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Prospect board · ${g.year}</div><h2 class="h2">${g.pitches} pitch meeting${g.pitches === 1 ? '' : 's'} left</h2></div><p class="hint">Each pitch is one meeting. The right pitch for what he wants moves him a lot; the wrong one a little. Top prospects are chased hardest by the big agencies. A prospect signs with you if he is leaning your way when the signing season closes.</p></div><div class="tw"><table class="tbl"><thead><tr><th>Prospect</th><th>Pos</th><th>Overall</th><th>Projected</th><th>Wants</th><th>Where you stand</th><th>Pitch</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function agLeagueHTML(g) {
  const rows = NFL.slice().sort((a, b) => g.teams[b.id].r - g.teams[a.id].r).map(t => { const tm = g.teams[t.id]; const mine = g.clients.filter(c => c.tm === t.id); return `<tr><td><b>${esc(t.name)}</b></td><td>${tm.r >= 82 ? 'Contender' : tm.r >= 74 ? 'Middle' : 'Rebuilding'}</td><td class="num">${fmM(tm.cap)}</td><td>${Object.keys(tm.need).join(', ')}</td><td class="small">${mine.map(c => esc(c.n)).join(', ')}</td></tr>`; }).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">The league · ${g.year}</div><h2 class="h2">32 clubs</h2></div><p class="hint">A club pays more for a position it needs, and can never pay more than its cap room.</p></div><div class="tw"><table class="tbl"><thead><tr><th>Club</th><th>Outlook</th><th class="num">Cap room</th><th>Needs</th><th>Your clients</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
const AG_ACH = { first: 'A first-round pick', top10: 'A top-ten pick', hundred: 'A $100 million contract', probowl: 'A Pro Bowl client', ten: 'Ten clients', super: 'Reputation of 90', rich: '$10 million in the bank' };
function agAgencyHTML(g) {
  const staff = Object.entries(AG_STAFF).map(([k, d]) => `<div class="setrow"><div class="sl"><b>${esc(d[0])} · level ${g.staff[k]} of 3</b><span class="hint">${esc(d[1])}</span></div><div class="sctl">${g.staff[k] >= 3 ? '<span class="pill maize">Full</span>' : `<button class="btn sm" data-act="agup" data-v="${k}"${g.cash < agUpgradeCost(g, k) ? ' disabled' : ''}>Hire · ${fmM(agUpgradeCost(g, k))}</button>`}</div></div>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">The agency</div><h2 class="h2">Legacy ${agLegacy(g)}</h2></div><p class="hint">Staff cost money every year as well as up front: $70,000 a level. Each level also makes room for two more clients.</p></div>
   <div class="tiles"><div><span class="k">Career fees</span><span class="v">${fmM(g.stats.fees)}</span></div><div><span class="k">Deals done</span><span class="v">${g.stats.deals}</span></div><div><span class="k">Biggest contract</span><span class="v">${fmM(g.stats.best)}</span></div><div><span class="k">First-round picks</span><span class="v">${g.stats.firsts}</span></div></div>${staff}</section>
   <section class="card"><div class="eyebrow">Milestones</div><ul class="plainlist">${Object.entries(AG_ACH).map(([k, t]) => `<li>${g.ach[k] ? `<b>${esc(t)}</b> <span class="small muted">· ${g.ach[k]}</span>` : `<span class="muted">${esc(t)}</span>`}</li>`).join('')}</ul></section>
   ${g.hist.length ? `<section class="card"><div class="eyebrow">Year by year</div><div class="tw"><table class="tbl"><thead><tr><th>Year</th><th class="num">Fees</th><th class="num">Costs</th><th class="num">Bank</th><th class="num">Reputation</th><th class="num">Clients</th></tr></thead><tbody>${g.hist.slice().reverse().map(h => `<tr><td>${h.y}</td><td class="num">${fmM(h.fees)}</td><td class="num">${fmM(h.cost)}</td><td class="num">${h.cash < 0 ? '−' + fmM(-h.cash) : fmM(h.cash)}</td><td class="num">${h.rep}</td><td class="num">${h.clients}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
}
(function () { const el = document.createElement('style'); el.textContent = '.agsteps{list-style:none;display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:0 0 14px}.agsteps li{font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}.agsteps li.on{background:var(--maize);color:var(--maize-ink);border-color:var(--maize);font-weight:700}.agsteps li.done{color:var(--text)}'; document.head.appendChild(el); })();
MINI.agent = {
  name: 'Agent', badge: 'AG', eyebrow: 'New · NFL', icon: 'users', startLabel: 'Open an agency', formTitle: 'Open your agency', welcome: 'The agency is open. Start with the prospect board.',
  blurb: 'Represent players. Win prospects away from the big agencies, get them drafted high, and negotiate their contracts against the clubs. You earn 3% of every deal.',
  tabs: [['office', 'Office', 'home'], ['clients', 'Clients', 'users'], ['board', 'Prospects', 'star'], ['league', 'League', 'grid'], ['agency', 'Agency', 'gavel']],
  formHTML: () => `<div class="fgrid"><label class="fld"><span>Your name</span><input id="ag-name" maxlength="28" value="Jordan Reese"></label><label class="fld"><span>Agency name</span><input id="ag-agency" maxlength="32" value="Reese Sports"></label></div>`,
  readForm: () => ({ name: (document.getElementById('ag-name') || {}).value, agency: (document.getElementById('ag-agency') || {}).value }),
  create: agNew, check: agCheck, header: agHeader,
  view: (tab, g) => (tab === 'clients' ? agClientsHTML(g) : tab === 'board' ? agBoardHTML(g) : tab === 'league' ? agLeagueHTML(g) : tab === 'agency' ? agAgencyHTML(g) : agOfficeHTML(g)),
  summary: g => ({ name: g.you.agency, line: `${g.year} · reputation ${g.rep} · ${g.clients.length} client${g.clients.length === 1 ? '' : 's'}${g.over ? ' · closed' : ''}` }),
};
const agOn = () => appMode === 'mini' && mm && mm.kind === 'agent';
Object.assign(actions, {
  agnext() { if (!agOn()) return; agNext(mm); mui.tab = 'office'; miniAfter(); window.scrollTo(0, 0); },
  agpitch(d) { if (!agOn()) return; const r = agPitch(mm, d.id, d.v); miniAfter(r === 'hit' ? 'That is what he wanted to hear.' : r === 'miss' ? 'He was polite. It is not what he cares about most.' : ''); },
  agadv(d) { if (!agOn()) return; miniAfter(agAdvance(mm, d.id) ? 'He takes the advance.' : ''); },
  agprep(d) { if (!agOn()) return; miniAfter(agPrep(mm, d.id, d.v) ? '' : 'You cannot afford that.'); },
  agpush(d) { if (!agOn()) return; const r = agPush(mm, d.id, d.tm); miniAfter(r === 'up' ? `The ${agTeamName(d.tm)} raise their offer.` : r === 'walk' ? `The ${agTeamName(d.tm)} walk away.` : r === 'firm' ? `The ${agTeamName(d.tm)} say this is their final number.` : r === 'hold' ? `The ${agTeamName(d.tm)} do not move.` : ''); },
  agtake(d) { if (!agOn()) return; miniAfter(agAccept(mm, d.id, d.tm)); },
  agev(d) { if (!agOn()) return; miniAfter(agEvent(mm, +d.i, +d.v)); },
  agup(d) { if (!agOn()) return; miniAfter(agUpgrade(mm, d.v) ? '' : 'You cannot afford that.'); },
});
try { if (appMode === 'home') render(); } catch (e) { } // the Home screen was drawn before this mode existed
