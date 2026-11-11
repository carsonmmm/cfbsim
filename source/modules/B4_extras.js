
/* ===================== v9.49: ownership extras =====================
 * Selling and buying back pieces of the club, private equity, contract talks with the people you hire, owner moments
 * with players, the Ring of Honor, owner achievements and a guided first season. */

/* ---------- pieces of the club ---------- */
function ownSellPiece() {
  const o = OWN(); if (o.partner || o.out) return { err: 'Not now.' }; if (o.pct - 0.05 < 0.3 - 1e-9) return { err: 'The league requires the controlling owner to keep at least 30%.' };
  const amt = r1(ownEquity() * 0.05 * 0.95); o.pct = r2(o.pct - 0.05); o.cash = r1(o.cash + amt); o.partners = (o.partners || 0) + (ownH('pp:' + state.season + o.pct) < 0.5 ? 1 : 0);
  ownLog(`${o.name} sells 5% of the ${myName()} to minority partners for ${fmO(amt)}.`); return { ok: true, amt };
}
function ownBuyPiece() {
  const o = OWN(); if (o.partner || o.out) return { err: 'Not now.' }; if (o.pct >= 0.995) return { err: 'You own the whole club.' }; const pe = o.pe ? 0.1 : 0; if (o.pct + 0.05 > 1 - pe + 1e-9) return { err: 'Your partners have nothing left to sell.' };
  const amt = r1(ownEquity() * 0.05 * 1.04); if (o.cash < amt) return { err: `It costs ${fmO(amt)}; you have ${fmO(o.cash)}.` }; o.cash = r1(o.cash - amt); o.pct = r2(Math.min(1, o.pct + 0.05)); o.paid = r1((o.paid || 0) + amt);
  if (o.pct >= 0.995 - pe) o.partners = 0; ownLog(`${o.name} buys back 5% of the ${myName()} for ${fmO(amt)}.`); return { ok: true, amt };
}
// a private-equity fund buys 10% of the club: cash for the club, a smaller share for everyone, and a payout floor
function ownPeIn() {
  const o = OWN(); if (!o.lg.pe) return { err: 'The league doesn\'t allow private equity (yet).' }; if (o.pe) return { err: 'A fund already owns 10%.' }; if (o.partner || o.out) return { err: 'Not now.' };
  const amt = r1(ownEquity() * 0.1); o.bank = r1(o.bank + amt); o.pct = r2(o.pct * 0.9); o.pe = { s: state.season, fund: ownPick(['Harbor Peak Capital', 'Granite Arch Partners', 'Lakeview Equity', 'Summit Bridge Capital'], 'pe' + state.season), amt };
  o.biz.pay = Math.max(o.biz.pay, 0.5); ownLog(`${o.pe.fund} buys 10% of the ${myName()}: ${fmO(amt)} into the club's bank. The fund wants at least half the profits paid out every year.`, 'big'); return { ok: true };
}
function ownPeOut() { const o = OWN(); if (!o.pe) return { err: 'No fund to buy out.' }; const amt = r1(ownEquity() * 0.1 * 1.12); if (!ownSpend(amt, 'Buying out the fund', true)) return { err: `It costs ${fmO(amt)} from the club's bank.` }; o.pct = r2(Math.min(1, o.pct / 0.9)); ownLog(`The ${myName()} buy out ${o.pe.fund} for ${fmO(amt)}.`); o.pe = null; return { ok: true }; }
{ const _sp = ownSetPay; ownSetPay = function (v) { const o = OWN(); return _sp(o.pe ? Math.max(0.5, +v) : v); }; }

/* ---------- contract talks with the people you hire ---------- */
// kind: 'gm' | 'hc' | 'pres'. A fair offer is accepted; a low one gets a counter, then a walkout.
function ownNegCand(kind, id) { const o = OWN(); if (kind === 'gm') return ownGmCands().find(x => x.id === id); if (kind === 'pres') return ownPresCands().find(x => x.id === id); return (state.cands.HC || []).find(x => x.id === id); }
function ownNeg(kind, id, sal, yrs) {
  const c = ownNegCand(kind, id); if (!c) return { err: 'That candidate is gone.' }; const ask = kind === 'hc' ? { s: c.salary, y: c.years } : { s: c.sal, y: c.yrs }; c.ask0 = c.ask0 || { s: ask.s, y: ask.y };
  sal = r2(+sal); yrs = clamp(Math.round(+yrs), 1, 7); if (!(sal > 0)) return { err: 'Enter a salary.' };
  const yrOk = Math.abs(yrs - ask.y) <= 1; if (sal >= ask.s * 0.97 && yrOk) { if (kind === 'hc') { c.salary = sal; c.years = yrs; } else { c.sal = sal; c.yrs = yrs; } c.agreed = true; return { res: 'yes', txt: `${c.name} agrees: ${fmM(sal)} a year for ${yrs} years.` }; }
  c.rounds = (c.rounds || 0) + 1; if (c.rounds >= 3 || sal < ask.s * 0.75) { c.no = true; return { res: 'walk', txt: `${c.name} takes another job.` }; }
  const ns = r2((ask.s + Math.max(sal, ask.s * 0.85)) / 2); if (kind === 'hc') c.salary = ns; else c.sal = ns; return { res: 'counter', txt: `${c.name} counters at ${fmM(ns)} a year for ${ask.y} years.` };
}
// contracts run out: the owner decides whether to extend (with a raise) or open the job
function ownContractsTick() {
  const o = OWN(); const hc = state.staff.HC; o.ext = o.ext || [];
  if (hc && !hc.interim) { hc.years = Math.max(0, (hc.years || 3) - 1); if (hc.years <= 0 && !o.ext.some(x => x.k === 'hc')) o.ext.push({ k: 'hc', name: hc.name, sal: r2((hc.salary || 6) * 1.12), yrs: 3 }); }
  const g = o.gmP; if (g && g.yrs <= 0 && !o.ext.some(x => x.k === 'gm')) { o.ext.push({ k: 'gm', name: g.name, sal: r2(g.sal * 1.1), yrs: 3 }); g.yrs = 0; }
  const p = o.bizP; if (p) { p.yrs = Math.max(0, p.yrs - 1); if (p.yrs <= 0 && !o.ext.some(x => x.k === 'pres')) o.ext.push({ k: 'pres', name: p.name, sal: r2(p.sal * 1.08), yrs: 3 }); }
}
function ownExtend(k, yes) {
  const o = OWN(); const e = (o.ext || []).find(x => x.k === k); if (!e) return { err: 'Nothing to decide.' }; o.ext = o.ext.filter(x => x !== e);
  if (k === 'hc') { const hc = state.staff.HC; if (!hc) return { ok: true }; if (yes) { hc.salary = e.sal; hc.years = e.yrs; ownLog(`The ${myName()} extend head coach ${hc.name}: ${e.yrs} years at ${fmM(e.sal)} a year.`); } else { ownLog(`Head coach ${hc.name}'s contract runs out. The ${myName()} let him go.`); state.staff.HC = null; state.cands.HC = genProCandidates(5); T(ME).coach = ''; } }
  if (k === 'gm') { const g = o.gmP; if (!g) return { ok: true }; if (yes) { g.sal = e.sal; g.yrs = e.yrs; ownLog(`The ${myName()} extend GM ${g.name} for ${e.yrs} years.`); } else { ownLog(`GM ${g.name}'s contract runs out. The ${myName()} let him go.`); o.gmP = null; } }
  if (k === 'pres') { const p = o.bizP; if (!p) return { ok: true }; if (yes) { p.sal = e.sal; p.yrs = e.yrs; } else { o.bizP = null; o.bizMode = 'me'; ownLog(`President ${p.name}'s contract runs out.`); } }
  return { ok: true };
}
// moving on without deciding: keep good people, let go of the rest
function ownExtAuto() { const o = OWN(); (o.ext || []).slice().forEach(e => { const t = T(ME); const good = t && t.hist && t.hist.length ? t.hist[t.hist.length - 1].w >= 8 : true; ownExtend(e.k, e.k === 'pres' ? true : good || (e.k === 'gm' && o.gmP && o.gmP.ovr >= 75)); }); }

/* ---------- owner moments ---------- */
const OWN_MOM = {
  star: { t: 'Sit down with an unhappy player', d: 'He feels heard. Rapport +8, and a trade demand may go away.' },
  practice: { t: 'Watch practice', d: 'The locker room notices the owner is there. Morale +2.', season: true },
  visit: { t: 'Hospital visit with players', d: 'Players and the owner visit a children\'s hospital. City relations +3.' },
  party: { t: 'Throw a draft party at the stadium', d: 'Thousands of fans watch the draft together. Fans +2, costs $1M.', off: true },
  ring: { t: 'Ring of Honor induction', d: 'Honor a retired great at halftime. Fans +3, brand +1, legacy +1.' },
};
function ownTime() { const o = OWN(); if (!o.time || o.time.s !== state.season) o.time = { s: state.season, n: 4, used: {} }; return o.time; }
function ownMomentOk(k, pid) {
  const o = OWN(); const T_ = ownTime(); const m = OWN_MOM[k]; if (!m) return 'Unknown.'; if (o.out || o.partner) return 'Not now.'; if (T_.n <= 0) return 'You\'re out of time this season (four moments a season).';
  if (m.season && state.phase === 'offseason') return 'During the season.'; if (m.off && (state.phase !== 'offseason' || !PS().off || PS().off.step > 4)) return 'In the offseason, before the draft.'; if ((k === 'party' || k === 'visit') && T_.used[k]) return 'Once a season.';
  if (k === 'star' && !ownUnhappy().length) return 'Nobody is unhappy right now.'; if (k === 'ring' && !ownRingCands().length) return 'No retired great is waiting for the Ring of Honor.'; return '';
}
const ownUnhappy = () => state.roster.filter(p => p.hold || p.tdem || (p.ovr >= 72 && rapOf(p) < 48)).sort((a, b) => b.ovr - a.ovr);
const ownRingCands = () => { const o = OWN(); const done = new Set((o.roh || []).map(x => x.n)); return (PS().ring || []).filter(x => !done.has(x.n)); };
function ownMoment(k, pid) {
  const o = OWN(); const why = ownMomentOk(k, pid); if (why) return { err: why }; const T_ = ownTime(); T_.n--; T_.used[k] = true;
  if (k === 'star') { const p = (pid && P(pid)) || ownUnhappy()[0]; rapAdj(p, 8, 'Met with the owner'); if (p.tdem && ownH('tdm:' + p.id + state.season) < 0.45) { delete p.tdem; ownLog(`After a sit-down with ${o.name}, ${p.n} withdraws his trade request.`); return { ok: true, txt: `${p.n} withdraws his trade request.` }; } if (ownHands()) o.meddle = clamp(o.meddle + 1, 0, 100); return { ok: true, txt: `${p.n} appreciates the talk.` }; }
  if (k === 'practice') { mv('morale', 2); return { ok: true, txt: 'Practice has a little extra energy today.' }; }
  if (k === 'visit') { o.cityRel = clamp(o.cityRel + 3, 0, 100); o.brand = clamp(o.brand + 0.5, 0, 99); return { ok: true, txt: 'The visit makes the local news.' }; }
  if (k === 'party') { mv('fan', 2); ownCost(1, 'Draft party'); return { ok: true, txt: 'The draft party fills the stadium.' }; }
  if (k === 'ring') { const x = ownRingCands()[0]; (o.roh || (o.roh = [])).push({ n: x.n, pos: x.pos, yrs: x.yrs, s: state.season }); mv('fan', 3); o.brand = clamp(o.brand + 1, 0, 99); o.legacy += 1; ownLog(`${x.pos} ${x.n} goes into the ${myName()} Ring of Honor.`, 'big'); return { ok: true, txt: `${x.n} goes into the Ring of Honor.` }; }
  return { err: 'Unknown.' };
}

/* ---------- owner achievements ---------- */
const OWN_ACH = [
  ['expProfit', 'Profitable from day one', 'Turn a profit in an expansion club\'s first season.'], ['sbBuilt', 'The house that you built', 'Win a Super Bowl in a stadium you built.'],
  ['sellout', 'Sold out', 'Fill every seat at every home game in a season.'], ['billion', 'Billion-dollar club', 'Bring in $1 billion of revenue in a season.'],
  ['doubler', 'Double up', 'Double the club\'s value from what you paid.'], ['debtFree', 'Debt free', 'Pay off all of the club\'s debt.'],
  ['host', 'Host city', 'Host a Super Bowl.'], ['hof', 'Canton', 'Go into the Hall of Fame.'], ['dynasty', 'Dynasty', 'Win three Super Bowls as an owner.'],
  ['moved', 'New city, new team', 'Make the playoffs in your first season after a move.'], ['unanimous', 'Unanimous', 'Pass your own proposal without a single no vote.'],
  ['hands', 'Hands off', 'Five straight winning seasons with a hired GM and no meddling.'], ['district', 'A whole neighborhood', 'Finish the stadium district.'], ['ooy', 'Owner of the Year', 'Win Owner of the Year.'],
];
function ownAch(k) { const o = OWN(); o.ach = o.ach || {}; if (o.ach[k]) return; const a = OWN_ACH.find(x => x[0] === k); if (!a) return; o.ach[k] = state.season; addNews(`Owner achievement: ${a[1]}. ${a[2]}`, 'big'); state.achToast = a[1]; }
function ownAchSeason(row) {
  const o = OWN(); if (o.path === 'exp' && o.pnl.filter(r => r.tm === ME).length === 1 && row.net > 0) ownAch('expProfit');
  if (row.po === 5 && o.stad.build && o.stad.build.open && o.stad.build.open <= row.s) ownAch('sbBuilt'); if (row.fill >= 100 && row.hg >= 8) ownAch('sellout'); if (row.tr >= 1000) ownAch('billion');
  if (o.price && o.val >= o.price * 2) ownAch('doubler'); if (o.debt <= 0.5) ownAch('debtFree'); if (o.lg.sbHost === row.s) ownAch('host'); if (o.hof) ownAch('hof'); if ((o.sb || 0) >= 3) ownAch('dynasty');
  if (o.relo && o.relo.k === 'done' && o.relo.first == null) { o.relo.first = row.s; if (row.po >= 1) ownAch('moved'); }
  const last5 = o.pnl.slice(-5); if (last5.length === 5 && last5.every(r => r.w > r.l && r.gm !== 'self') && ownHands() && (o.ord || []).filter(x => x.s >= row.s - 4).length === 0) ownAch('hands');
}

/* ---------- a guided first season ---------- */
function ownGuide() {
  const o = OWN(); if (o.guideOff || o.pnl.length >= 1) return null; const L = PS();
  const steps = [
    ['price', 'Set your ticket prices', 'Business', 'obiz', !!o.biz.pricedAt || o.biz.price !== ownDefPrice(o.mkt) || ownPresOn()],
    ['front', 'Meet your GM and head coach', 'Front office', 'front', !!o.seen && !!o.seen.front],
    ['stad', 'Walk through your stadium', 'Stadium', 'ostad', !!o.seen && !!o.seen.ostad],
    ['vote', 'Vote at the owners\' meeting', 'League office', 'oleague', !!(o.lg.meet && (o.lg.meet.done || o.lg.meet.items.some(i => i.my))) || (o.lg.hist || []).length > 0],
    ['game', 'Watch your first game', 'Schedule', 'schedule', state.phase !== 'offseason' && state.week > 1],
  ];
  return steps;
}
