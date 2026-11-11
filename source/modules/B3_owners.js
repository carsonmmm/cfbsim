
/* ===================== v9.49: the other owners =====================
 * Every other club has an owner with a name and a style. Styles lean on issues; relationships remember how you
 * voted and what you said. Votes are counted owner by owner. own.owners[tid] = { name, style, rel, since, fav, grudge }. */
const OWN_OSTYLE = {
  spend: ['Big spender', 'Wants to win at any price. Loves expansion fees and big TV money.'],
  pinch: ['Penny-pincher', 'Watches every dollar. Likes anything that cuts costs or adds a revenue stream.'],
  old: ['Old guard', 'Has owned the club for decades. Distrusts change of any kind.'],
  fresh: ['Newcomer', 'Just bought in. Open to new ideas, eager to make friends.'],
  mav: ['Maverick', 'Votes however he likes and says so loudly.'],
};
function ownOwners() {
  const o = OWN(); o.owners = o.owners || {};
  NFL.forEach(t => { if (t.id === ME || o.owners[t.id]) return; const k = 'ow:' + t.id + ':' + (o.ownGen = (o.ownGen || 0)); const pf = ownProf(t.id);
    const st = pf.mkt >= 8 && ownH(k + 'a') < 0.5 ? 'spend' : pf.age >= 30 && ownH(k + 'b') < 0.5 ? 'old' : ownPick(['spend', 'pinch', 'old', 'fresh', 'mav', 'pinch', 'old'], k + 's');
    const used = new Set(Object.values(o.owners).map(w => w.name)); let nm = ownName(k), q = 0; while (used.has(nm) && q < 20) nm = ownName(k + ':' + ++q);
    o.owners[t.id] = { name: nm, style: st, rel: Math.round(42 + ownH(k + 'r') * 20), since: state.season - Math.floor(ownH(k + 'y') * (st === 'old' ? 40 : 12)), fav: 0, grudge: false, agree: 0, votes: 0 };
  });
  Object.keys(o.owners).forEach(id => { if (!NFL.some(t => t.id === id) || id === ME) delete o.owners[id]; });
  return o.owners;
}
// a club changes hands: a new owner, a fresh start
function ownNewOwner(tid) { const o = OWN(); const O = ownOwners(); o.ownGen = (o.ownGen || 0) + 1; delete O[tid]; ownOwners(); O[tid].style = 'fresh'; O[tid].since = state.season; return O[tid]; }
// how one owner leans on an item
function ownLean(tid, it) {
  const O = ownOwners()[tid]; if (!O) return 0; const st = O.style; const big = ownProf(tid).mkt >= 8, small = ownProf(tid).mkt <= 5; let b = 0;
  if (it.k === 'share') { const up = it.to > OWN().lg.share; b += (up ? 1 : -1) * ((small ? 0.22 : 0) - (big ? 0.22 : 0)) + (st === 'pinch' && up ? 0.04 : 0); }
  if (it.k === 'rule') b += st === 'old' ? -0.1 : st === 'fresh' ? 0.05 : 0;
  if (it.k === 'xexp') b += st === 'spend' ? 0.08 : st === 'old' ? -0.05 : 0.03;
  if (it.k === 'pe') b += st === 'old' ? -0.22 : st === 'fresh' || st === 'spend' ? 0.14 : 0;
  if (it.k === 'patch') b += st === 'pinch' ? 0.16 : st === 'old' ? -0.18 : 0.04;
  if (it.k === 'intl') b += st === 'spend' ? 0.1 : st === 'old' ? -0.12 : 0;
  if (it.k === 'sale' || it.k === 'airelo') b += st === 'old' ? 0.04 : 0;
  if (st === 'mav') b += (ownH('mav:' + it.id + ':' + tid) - 0.5) * 0.5;
  if (it.mine) b += (O.rel - 50) / 110 - (O.grudge ? 0.25 : 0); else b += (O.rel - 50) / 400;
  if (it.ask && it.ask.tid === tid) b += 1;
  return b;
}
// court an owner over dinner (twice an offseason)
function ownCourt(tid) {
  const o = OWN(); const O = ownOwners()[tid]; if (!O) return { err: 'No such owner.' }; if (state.phase !== 'offseason') return { err: 'Owners have time for dinner in the offseason.' };
  o.court = o.court && o.court.s === state.season ? o.court : { s: state.season, n: 0 }; if (o.court.n >= 2) return { err: 'You\'ve had your two dinners this offseason.' }; o.court.n++;
  const d = O.grudge ? 4 : O.style === 'fresh' ? 10 : O.style === 'old' ? 5 : 8; O.rel = clamp(O.rel + d, 0, 100); if (O.grudge && O.rel >= 55) O.grudge = false;
  return { ok: true, txt: `Dinner with ${O.name} of the ${teamName(tid)}: relationship +${d}.` };
}
// after the meeting: owners remember
function ownOwnersAfterVote(it, votes) {
  const o = OWN(); const O = ownOwners(); if (!votes) return;
  Object.entries(votes).forEach(([tid, y]) => { const w = O[tid]; if (!w || !it.my || it.my === 'abstain') return; w.votes++; if ((y ? 'yes' : 'no') === it.my) { w.agree++; w.rel = clamp(w.rel + 1, 0, 100); } else w.rel = clamp(w.rel - 0.5, 0, 100); });
  const sponsor = it.ask ? it.ask.tid : it.tid; if (sponsor && O[sponsor] && it.my) { O[sponsor].rel = clamp(O[sponsor].rel + (it.my === 'yes' ? 6 : -6), 0, 100); if (it.my === 'yes' && it.ask) O[sponsor].fav = (O[sponsor].fav || 0) + it.ask.fav; }
}
// the computer owners' legacies, for the all-time ranking
function ownAiLegacy(tid) { const O = ownOwners()[tid]; if (!O) return 0; const L = PS(); const titles = (L.champs || []).filter(c => c.tm === tid && c.s >= O.since).length; const yrs = Math.max(0, state.season - O.since); return Math.round(titles * 25 + yrs * 1.2 + (T(tid) ? (T(tid).rating - 76) * 0.6 : 0)); }

/* ---------- more for the owners to vote on ---------- */
function ownMoreItems(push) {
  const o = OWN(); const h = k => ownH('lg2:' + state.season + ':' + k);
  if (!o.lg.patch && h('p') < 0.35) push({ k: 'patch', t: 'Allow sponsor patches on jerseys', txt: 'One company logo on every club\'s jersey. Big money; traditionalists hate it.', sup: 62, office: 'yes' });
  if (!o.lg.pe && h('pe') < 0.3) push({ k: 'pe', t: 'Let private-equity funds buy into clubs', txt: 'Funds could own up to 10% of a club. Cash for owners; some worry about outsiders.', sup: 60, office: 'yes' });
  if (!o.lg.intlMore && h('i') < 0.25) push({ k: 'intl', t: 'More international games', txt: 'Clubs could play a home game abroad every season instead of every other.', sup: 58, office: 'yes' });
  if (NFL.length < 36 && state.season - (o.lg.lastExp || 0) >= 6 && h('x') < 0.12) push({ k: 'xexp', t: `Expand the league to ${NFL.length + 2} clubs`, txt: `Two new clubs pay ${fmO(OWN_EXP_FEE())} each, split among the current owners: about ${fmMs(OWN_EXP_FEE() * 2 / NFL.length)} for every club.`, sup: 72, office: 'yes' });
}
function ownApplyMore(it) {
  const o = OWN();
  if (it.k === 'patch') { o.lg.patch = true; ownLog('Jersey sponsor patches are coming. Expect offers next offseason.'); }
  if (it.k === 'pe') { o.lg.pe = true; ownLog('Private-equity funds can now buy up to 10% of a club.'); }
  if (it.k === 'intl') { o.lg.intlMore = true; ownLog('Clubs may now play a home game abroad every season.'); }
  if (it.k === 'xexp') ownAiExpansion();
}
// the league grows by two computer-run clubs; every current owner gets a share of the fees
function ownAiExpansion() {
  const o = OWN(); const fee = OWN_EXP_FEE(); const share = r1(fee * 2 / NFL.length); const used = new Set(NFL.map(t => t.city)); const cities = OWN_CITIES.filter(c => !used.has(c.city) && !(o.relo && o.relo.city === c.city));
  if (cities.length < 2) return; const NICKS = ['Generals', 'Marauders', 'Sentinels', 'Bandits', 'Kings', 'Voyagers', 'Wranglers', 'Cyclones']; const COLS = [['#2a3f6b', '#d9b24c'], ['#6b1f2a', '#e0c9a6'], ['#1f5c4a', '#f0e6d2'], ['#30303a', '#e86a2c']];
  const smallest = conf => NFL_DIVS.slice().sort((a, b) => NFL.filter(t => t.conf === conf && t.div === a).length - NFL.filter(t => t.conf === conf && t.div === b).length)[0];
  const ids = ['AFC', 'NFC'].map((cf, i) => { const c = cities[Math.floor(ownH('aix:' + state.season + i) * cities.length)] || cities[i]; const cc = ownPick(COLS, 'aic' + state.season + i); const id = ownAddClub({ city: c.city, nick: ownPick(NICKS, 'ain' + state.season + i), conf: cf, div: smallest(cf), c1: cc[0], c2: cc[1] }); used.add(c.city); cities.splice(cities.indexOf(c), 1); return id; });
  ids.forEach(id => { const picks = nflExpansionDraft(id); fillRosterPro(id); proRate(id); const L = PS(); if (L.order && !(L.draft && L.draft.done)) { L.order = L.order.filter(x => x !== id); L.order.unshift(id); } });
  o.bank = r1(o.bank + share); o.lg.lastExp = state.season; ownOwners();
  ownLog(`The NFL grows to ${NFL.length} clubs: the ${ids.map(teamName).join(' and the ')}. Your club's share of the expansion fees: ${fmMs(share)}.`, 'big');
}

/* ---------- awards ---------- */
function ownAwards() {
  const o = OWN(); const ts = Object.values(state.teams); const avg = ts.reduce((s, t) => s + t.rating, 0) / ts.length; const exp = t => 8.5 + (t.rating - avg) * 0.55;
  const hist = id => { const h = (T(id).hist || []); return h.length ? h[h.length - 1].w : 8; };
  const coy = ts.slice().sort((a, b) => (b.w - exp(b)) - (a.w - exp(a)))[0]; const eoy = ts.slice().sort((a, b) => ((b.w - hist(b.id)) * 2 + b.w) - ((a.w - hist(a.id)) * 2 + a.w))[0];
  const lastV = o.valHist.length > 1 ? o.valHist[o.valHist.length - 2].v : o.val; const myScore = T(ME).w + proPoResult(ME) * 3 + (o.val - lastV) / Math.max(1, lastV) * 60 + (o.comty.found ? 2 : 0) + (o.comty.nbhd ? 2 : 0) + (o.comty.youth ? 1 : 0);
  const oyCand = ts.filter(t => t.id !== ME).map(t => ({ id: t.id, s: t.w + proPoResult(t.id) * 3 + ownH('ooy:' + state.season + t.id) * 4 })).sort((a, b) => b.s - a.s)[0];
  const ooy = myScore > oyCand.s ? ME : oyCand.id; const O = ownOwners();
  const who = { coy: coy.id === ME ? (state.staff.HC ? state.staff.HC.name : 'Your coach') : T(coy.id).coach || 'their coach', eoy: eoy.id === ME ? (o.gm === 'self' ? o.name : o.gmP ? o.gmP.name : 'your GM') : (PS().aistaff[eoy.id] || {}).gm || 'their GM', ooy: ooy === ME ? o.name : (O[ooy] || {}).name || 'their owner' };
  const row = { s: state.season, coy: [coy.id, who.coy], eoy: [eoy.id, who.eoy], ooy: [ooy, who.ooy] }; (o.awards || (o.awards = [])).unshift(row); if (o.awards.length > 30) o.awards.length = 30;
  if (ooy === ME) { o.legacy += 5; o.rep = clamp(o.rep + 4, 0, 100); ownAch('ooy'); }
  if (eoy.id === ME) o.legacy += 2; if (coy.id === ME) o.legacy += 1;
  ownLog(`Awards: Coach of the Year ${who.coy} (${nflNick(coy.id)}), Executive of the Year ${who.eoy} (${nflNick(eoy.id)}), Owner of the Year ${who.ooy} (${nflNick(ooy)}).`, ooy === ME ? 'big' : '');
}
