
/* ---------- league politics: the owners' meeting, the labor deal, the commissioner ---------- */
// rule proposals the owners can vote on; each changes a real league rule
const OWN_RULES = [
  { k: 'otNfl', to: 'sudden', t: 'Sudden-death overtime', d: 'The first score in overtime wins.', sup: 45 },
  { k: 'otNfl', to: 'nfl', t: 'Both teams get the ball in overtime', d: 'Each team gets a possession, then the next score wins.', sup: 70 },
  { k: 'nflSeeds', to: 6, t: 'Six playoff teams per conference', d: 'Fewer playoff spots; the top two seeds get byes.', sup: 30 },
  { k: 'nflSeeds', to: 7, t: 'Seven playoff teams per conference', d: 'More playoff games to sell.', sup: 78 },
  { k: 'proRoster', to: 48, t: 'Smaller rosters (48)', d: 'Lower payrolls; the union hates it.', sup: 46 },
  { k: 'proRoster', to: 53, t: 'Back to 53-man rosters', d: 'The standard roster size.', sup: 60 },
  { k: 'injuries', to: 'low', t: 'New player-safety rules', d: 'Fewer injuries; some say the game gets softer.', sup: 62 },
  { k: 'injuries', to: 'normal', t: 'Roll back the safety rules', d: 'The old rules return.', sup: 40 },
];
function ownRuleOpts() { const st = rules(); return OWN_RULES.filter(r => st[r.k] !== r.to); }
function ownNewItem(o_) { const o = OWN(); return Object.assign({ id: 'm' + state.season + '_' + (o.lg.itemN = (o.lg.itemN || 0) + 1), my: null, whip: 0 }, o_); }
// at the end of the season: the agenda for the spring meeting
function ownLeagueOffseason() {
  const o = OWN(); const h = k => ownH('lg:' + state.season + ':' + k); const items = [];
  const ro = ownRuleOpts(); if (ro.length) { const r = ro[Math.floor(h('r') * ro.length)]; items.push(ownNewItem({ k: 'rule', rule: r, t: `Rules: ${r.t}`, txt: r.d, sup: r.sup, office: r.sup >= 60 ? 'yes' : r.sup <= 40 ? 'no' : null })); }
  if (h('sh') < 0.45) { const up = h('shd') < 0.5; const to = clamp(o.lg.share + (up ? 5 : -5), 20, 60); if (to !== o.lg.share) items.push(ownNewItem({ k: 'share', to, t: `Revenue sharing: ${up ? 'more' : 'less'} (${o.lg.share}% → ${to}%)`, txt: up ? 'Small-market owners want more of the gate money shared. Big markets would pay for it.' : 'Big-market owners want to keep more of their own gate money.', sup: up ? 52 : 44, office: null })); }
  const others = NFL.map(t => t.id).filter(id => id !== ME);
  if (h('sale') < 0.4) { const tid = others[Math.floor(h('st') * others.length)]; const ask = h('ask') < 0.6; items.push(ownNewItem({ k: 'sale', tid, t: `Approve the sale of the ${teamName(tid)}`, txt: `A ${ownPick(['tech', 'private-equity', 'real-estate', 'shipping', 'hotel'], 'sb' + state.season)} billionaire is buying the club.`, sup: 82, office: 'yes', ask: ask ? { tid, fav: 1 } : null })); }
  const cityLeft = OWN_CITIES.filter(c => !NFL.some(t => t.city === c.city) && !(o.aiRelo || []).some(x => x.city === c.city) && !(o.relo && o.relo.city === c.city));
  if (h('rel') < 0.08 && cityLeft.length) { const tid = others.filter(id => ownProf(id).age >= 25 && ownProf(id).mkt <= 6)[Math.floor(h('rt') * 5)]; const c = cityLeft[Math.floor(h('rc') * cityLeft.length)]; if (tid) items.push(ownNewItem({ k: 'airelo', tid, city: c.city, t: `The ${teamName(tid)} want to move to ${c.city}`, txt: 'Their stadium talks failed. The owner promises a new stadium in the new city.', sup: 64, office: 'yes', ask: { tid, fav: 2 } })); }
  if (o.lg.cba <= state.season + 1) items.push(ownNewItem({ k: 'cba', t: 'The labor deal expires', txt: 'The owners have to agree on how hard to push the players\' union. A hard line saves money but risks a lockout that wipes out the preseason.', cba: true, sup: 0, office: 'mid' }));
  // your own business with the league
  if (o.relo && o.relo.k === 'applied') items.push(ownNewItem({ k: 'reloc', city: o.relo.city, t: `Your request to move to ${o.relo.city}`, txt: `The relocation fee is ${fmO(o.relo.fee)}. Owners don't like moves, but a better market helps everyone.`, sup: 0, mine: true }));
  if (o.sbBid === state.season) items.push(ownNewItem({ k: 'sb', t: `Your bid to host the ${state.season + 3} Super Bowl`, txt: `${o.stad.name} against two other cities.`, sup: 0, mine: true }));
  if (o.dBid === state.season) items.push(ownNewItem({ k: 'dhost', t: `Your bid to host the ${state.season + 2} NFL Draft`, txt: 'A week-long fan festival downtown.', sup: 0, mine: true }));
  if (o.prop && o.prop.s === state.season) items.push(ownNewItem(Object.assign({ mine: true }, o.prop.item)));
  ownMoreItems(x => items.push(ownNewItem(x)));
  o.lg.meet = { s: state.season, items, done: false };
  if (o.lg.tv <= state.season + 1) { const jump = r2(0.14 + ownH('tv:' + state.season) * 0.18 + (o.comm - 55) / 600); o.lg.tvF = r2(o.lg.tvF * (1 + jump)); o.lg.tv = state.season + 9; ownLog(`The league signs new TV deals: national money goes up ${Math.round(jump * 100)}%.`, 'big'); }
  if (o.comm < 25 && ownH('fine:' + state.season) < 0.6) { const f = r1(1 + ownH('fa:' + state.season) * 4); ownCost(f, 'League fine'); o.rep = clamp(o.rep - 2, 0, 100); ownLog(`The league office fines the ${myName()} ${fmMs(f)} for "conduct detrimental to the league."`, 'bad'); }
}
// one more item of your own each year (offseason, before the meeting)
function ownPropose(k) {
  const o = OWN(); if (o.prop && o.prop.s === state.season) return { err: 'One proposal a year.' }; const m = o.lg.meet; if (!m || m.done) return { err: 'The meeting has already happened.' };
  let item = null;
  if (k === 'shareUp' || k === 'shareDown') { const to = clamp(o.lg.share + (k === 'shareUp' ? 5 : -5), 20, 60); item = { k: 'share', to, t: `Your proposal: revenue sharing ${o.lg.share}% → ${to}%`, txt: 'Your proposal.', sup: k === 'shareUp' ? 45 : 40 }; }
  else { const r = ownRuleOpts().find(x => x.k + ':' + x.to === k); if (r) item = { k: 'rule', rule: r, t: `Your proposal: ${r.t}`, txt: r.d, sup: r.sup - 6 }; }
  if (!item) return { err: 'Pick a proposal.' }; o.prop = { s: state.season, item }; m.items.push(ownNewItem(Object.assign({ mine: true, my: 'yes' }, item))); return { ok: true };
}
function ownVoteOn(id, v) { const m = OWN().lg.meet; const it = m && !m.done ? m.items.find(x => x.id === id) : null; if (!it) return null; it.my = v; return v; }
// spend a favor to bring two or three owners along
function ownWhip(id) { const o = OWN(); const m = o.lg.meet; const it = m && !m.done ? m.items.find(x => x.id === id) : null; if (!it || (o.favors || 0) < 1) return null; o.favors--; it.whip = (it.whip || 0) + 1; return it.whip; }
function ownBidSB() { const o = OWN(); const s = o.stad; if (s.temp || s.qual < 78 || (s.roof === 'o' && !OWN_WARM.has(ME) && !(o.reloName && ownCity(o.reloName.city) && ownCity(o.reloName.city).warm))) return { err: 'A Super Bowl host needs a modern stadium (quality 78+) with a roof or in a warm-weather city.' }; if (o.sbBid === state.season) return { err: 'Your bid is in.' }; if (o.lg.meet && o.lg.meet.done) return { err: 'Bids go to the next meeting.' }; o.sbBid = state.season; o.lg.meet.items.push(ownNewItem({ k: 'sb', t: `Your bid to host the ${state.season + 3} Super Bowl`, txt: `${s.name} against two other cities.`, sup: 0, mine: true, my: 'yes' })); return { ok: true }; }
function ownBidDraft() { const o = OWN(); if (o.dBid === state.season) return { err: 'Your bid is in.' }; if (o.lg.meet && o.lg.meet.done) return { err: 'Bids go to the next meeting.' }; if (o.lg.draftHost && o.lg.draftHost >= state.season) return { err: 'You are already hosting a draft.' }; o.dBid = state.season; o.lg.meet.items.push(ownNewItem({ k: 'dhost', t: `Your bid to host the ${state.season + 2} NFL Draft`, txt: 'A week-long fan festival downtown.', sup: 0, mine: true, my: 'yes' })); return { ok: true }; }
// the meeting: before the draft, every item gets its vote
function ownMeetResolve() {
  const o = OWN(); const m = o.lg.meet; if (!m || m.done) return; m.done = true; const n = NFL.length - 1; const need = Math.ceil(NFL.length * 0.75); const out = [];
  m.items.forEach(it => {
    if (it.cba) { ownCbaResolve(it); out.push(it); return; }
    let p;
    if (it.k === 'reloc') { const c = ownCity(it.city); p = ownVote('reloc', { up: (c.mkt - o.mkt) * 0.025, key: it.id }).p; }
    else if (it.k === 'sb') p = clamp(0.25 + (o.stad.qual - 78) / 60 + (o.comm - 55) / 150 + (o.rep - 50) / 200, 0.05, 0.85);
    else if (it.k === 'dhost') p = clamp(0.4 + (o.comm - 55) / 150 + o.mkt * 0.02, 0.1, 0.9);
    else p = (it.sup / 100) + (it.mine ? (o.rep - 50) / 250 : 0);
    p = clamp(p + (it.whip || 0) * 0.07, 0.02, 0.98); let yes = 0;
    if (it.k === 'sb' || it.k === 'dhost') { it.pass = ownH('host:' + it.id) < p; }
    else { const votes = {}; Object.keys(ownOwners()).forEach(tid => { const y = ownH('mv:' + it.id + ':' + tid) < clamp(p + ownLean(tid, it), 0.02, 0.98); votes[tid] = y; if (y) yes++; }); if (it.my === 'yes') yes++; it.yes = yes; it.pass = yes >= need; it.votes = votes; ownOwnersAfterVote(it, votes); if (it.mine && yes === NFL.length) ownAch('unanimous'); }
    out.push(it); ownApplyItem(it); if (it.pass && ['patch', 'pe', 'intl', 'xexp'].includes(it.k)) ownApplyMore(it);
    if (it.ask) { if (it.my === 'yes') { o.favors = (o.favors || 0) + it.ask.fav; } else if (it.my === 'no') o.rep = clamp(o.rep - 2, 0, 100); }
    if (it.office && (it.my === 'yes' || it.my === 'no')) o.comm = clamp(o.comm + (it.my === it.office ? 2 : -2), 0, 100);
  });
  o.lg.hist.unshift({ s: m.s, items: out.map(it => ({ t: it.t, pass: it.pass, yes: it.yes, my: it.my, k: it.k, cba: it.cbaRes || null })) }); if (o.lg.hist.length > 12) o.lg.hist.length = 12;
  ownLog(`The league meeting wraps up: ${out.filter(x => x.pass).length} of ${out.filter(x => !x.cba).length} items pass.`);
}
function ownApplyItem(it) {
  const o = OWN(); if (!it.pass) { if (it.k === 'reloc') { o.relo.k = 'denied'; o.relocTries = (o.relocTries || 0) + 1; ownLog(`The owners vote down your move to ${it.city}.`, 'bad'); } return; }
  if (it.k === 'rule') { setRule(it.rule.k, it.rule.to); ownLog(`New league rule: ${it.rule.t.toLowerCase()}.`); }
  if (it.k === 'share') { o.lg.share = it.to; ownLog(`Revenue sharing is now ${it.to}% of the gate.`); }
  if (it.k === 'sale') { const w = ownNewOwner(it.tid); ownLog(`The owners approve the sale of the ${teamName(it.tid)}. ${w.name} is the new owner.`); }
  if (it.k === 'airelo') ownAiReloc(it.tid, it.city);
  if (it.k === 'reloc') { o.relo.k = 'approved'; ownLog(`The owners approve your move to ${it.city}. The club plays there next season.`, 'big'); }
  if (it.k === 'sb') { o.lg.sbHost = state.season + 3; o.legacy += 5; ownLog(`${o.stad.name} will host the ${state.season + 3} Super Bowl.`, 'big'); }
  if (it.k === 'dhost') { o.lg.draftHost = state.season + 2; ownLog(`Your city will host the ${state.season + 2} NFL Draft.`); }
}
// a computer-run club moves: new city, same nickname
function ownAiReloc(tid, city) {
  const o = OWN(); const t = T(tid); if (!t) return; const old = t.name; const nm = `${city} ${t.nick || NFL_BY[tid].nick}`; t.name = nm; t.city = city; if (NFL_BY[tid]) { NFL_BY[tid].name = nm; NFL_BY[tid].city = city; }
  (o.aiRelo || (o.aiRelo = [])).push({ id: tid, city, nick: t.nick || NFL_BY[tid].nick }); ownLog(`The ${old} move to ${city}.`, 'big');
}
// the labor deal: your stance counts for one owner in 32, but owners follow a strong voice
function ownCbaResolve(it) {
  const o = OWN(); const my = it.my || 'mid'; const lean = { hard: -1, mid: 0, give: 1 }[my]; const h = ownH('cba:' + state.season);
  const res = h + lean * 0.18 < 0.33 ? 'hard' : h + lean * 0.18 < 0.8 ? 'mid' : 'give'; 
  setRule('capGrow', { hard: 3, mid: 5.5, give: 8 }[res]); const lock = ownH('lock:' + state.season) < { hard: 0.55, mid: 0.12, give: 0 }[res];
  o.lg.cba = state.season + 1 + (res === 'hard' ? 10 : 7); if (lock) o.lg.lockout = state.season + 1; it.cbaRes = res + (lock ? '+lockout' : ''); it.pass = true;
  if (my === it.office) o.comm = clamp(o.comm + 2, 0, 100);
  ownLog(`A new labor deal through ${o.lg.cba - 1}: ${res === 'hard' ? 'the owners win big; the cap grows 3% a year' : res === 'give' ? 'the players win big; the cap grows 8% a year' : 'a compromise; the cap grows 5.5% a year'}.${lock ? ' It took a lockout that wipes out the preseason.' : ''}`, lock ? 'bad' : 'big');
}
