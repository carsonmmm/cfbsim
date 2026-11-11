
/* ---------- legacy, goals, the Hall of Fame, selling up and handing over ---------- */
function ownLegacySeason(row) {
  const o = OWN(); const v0 = o.valHist.length > 1 ? o.valHist[o.valHist.length - 2].v : row.val;
  const d = [0, 2, 4, 7, 11, 25][row.po] + Math.max(0, row.w - 8.5) * 0.5 + clamp((row.val - v0) / Math.max(1, v0) * 30, -4, 6) + (o.comty.found ? 0.5 : 0) + (o.comty.youth ? 0.5 : 0) - (o.meddle > 60 ? 2 : 0) - (row.net < 0 ? 1 : 0);
  o.legacy = r1(o.legacy + d); o.seasons = (o.seasons || 0) + 1; row.leg = r1(d);
}
// scenario goals: what the start promised
function ownGoalsInit() {
  const o = OWN(); const s = o.since; const g = [];
  if (o.scen === 'worst') g.push({ k: 'po', t: 'Make the playoffs within four seasons', by: s + 3 }, { k: 'val', t: 'Grow the club\'s value by a third', by: s + 6, v: r1(o.val * 1.33) });
  else if (o.scen === 'frontier' || o.path === 'exp') g.push({ k: 'stad', t: 'Open a permanent stadium', by: s + 6 }, { k: 'po', t: 'Make the playoffs within six seasons', by: s + 5 });
  else if (o.scen === 'family') g.push({ k: 'debt', t: 'Get the debt under $800M', by: s + 5, v: 800 }, { k: 'win', t: 'A winning season within three years', by: s + 2 });
  else if (o.path === 'partner') g.push({ k: 'ctrl', t: 'Take control of the club', by: s + 2 }, { k: 'po', t: 'Make the playoffs within five seasons', by: s + 4 });
  else g.push({ k: 'po', t: 'Make the playoffs within five seasons', by: s + 4 }, { k: 'sb', t: 'Win a Super Bowl', by: s + 14 });
  o.goals = g.map(x => Object.assign({ done: null, fail: false }, x));
}
function ownGoalsCheck() {
  const o = OWN(); const last = o.pnl[o.pnl.length - 1]; if (!last) return;
  o.goals.forEach(g => {
    if (g.done || g.fail) return; let hit = false;
    if (g.k === 'po') hit = last.po >= 1; if (g.k === 'sb') hit = last.po === 5; if (g.k === 'val') hit = o.val >= g.v; if (g.k === 'stad') hit = !o.stad.temp; if (g.k === 'debt') hit = o.debt < g.v * ownG() / ownG(last.s);
    if (g.k === 'win') hit = last.w > last.l; if (g.k === 'ctrl') hit = !o.partner;
    if (hit) { g.done = state.season; o.legacy += 4; ownLog(`Goal reached: ${g.t.toLowerCase()}.`, 'big'); } else if (state.season >= g.by) { g.fail = true; o.rep = clamp(o.rep - 2, 0, 100); ownLog(`Goal missed: ${g.t.toLowerCase()}.`, 'bad'); }
  });
}
// owners go into the Hall of Fame as contributors
function ownHofCheck(leaving) {
  const o = OWN(); if (o.hof) return; const yrs = o.seasons || 0; const L = o.legacy + (o.legacyOld || 0);
  if ((yrs < 8 && !leaving) || yrs < 5) return; const p = L >= 170 ? 0.55 : L >= 120 ? 0.25 : L >= 90 ? 0.08 : 0;
  if (p && ownH('hof:' + state.season + ':' + (leaving ? 'x' : '')) < p) { o.hof = state.season; ownLog(`${o.name} is elected to the Pro Football Hall of Fame as a contributor.`, 'big'); }
}
// selling: two or three groups make offers around what the club is worth
function ownSaleOffers() {
  const o = OWN(); if (o.saleOffers && o.saleOffers.s === state.season) return o.saleOffers.list;
  const list = [0, 1, 2].map(i => ({ who: ownPick(['A tech founder', 'A private-equity group', 'A real-estate family', 'A sovereign wealth fund partner', 'A shipping magnate', 'A hedge-fund manager'], 'sw:' + state.season + ':' + i), price: r1(o.val * (0.97 + ownH('sp:' + state.season + ':' + i) * 0.13)) }));
  o.saleOffers = { s: state.season, list }; return list;
}
function ownSell(i) {
  const o = OWN(); if (state.phase !== 'offseason') return { err: 'Clubs are sold in the offseason.' }; if (o.partner) return { err: 'As a minority partner, you can only sell your 10%.' };
  const f = ownSaleOffers()[i]; if (!f) return { err: 'That offer is gone.' }; const gross = r1((f.price - o.debt) * o.pct); const gain = Math.max(0, gross - (o.paid || 0)); const tax = r1(gain * 0.2); const net = r1(gross - tax);
  o.cash = r1(o.cash + net + Math.max(0, o.bank) * o.pct * 0.5); ownHofCheck(true);
  ownArchive({ how: 'sold', price: f.price, net }); o.pct = 0;
  o.out = { k: 'sold', s: state.season, txt: `You sold the ${myName()} to ${f.who.toLowerCase()} for ${fmO(f.price)}. Your share after taxes: ${fmO(net)}.` };
  ownLog(o.out.txt, 'big'); return { ok: true, net };
}
// the league steps in: the club is sold for what it fetches quickly
function ownForcedSale() { const o = OWN(); const price = r1(o.val * 0.88); const gross = Math.max(0, r1((price - o.debt) * o.pct)); o.cash = r1(Math.max(0, o.cash) + gross); ownArchive({ how: 'forced', price, net: gross }); o.pct = 0; ownLog(`${o.out.txt} The club goes for ${fmO(price)}; your share is ${fmO(gross)}.`, 'bad'); }
// a record of each club you owned
function ownArchive(x) { const o = OWN(); const W = o.pnl.filter(r => r.tm === ME); const w = W.reduce((s, r) => s + r.w, 0), l = W.reduce((s, r) => s + r.l, 0); (o.prev || (o.prev = [])).push({ tm: ME, name: myName(), from: o.since, to: state.season, w, l, sb: W.filter(r => r.po === 5).length, po: W.filter(r => r.po >= 1).length, how: x.how, price: x.price, net: x.net, gen: o.gen }); }
// after a sale: buy another club, or call it a career
function ownRetire() { const o = OWN(); if (!o.out && state.phase !== 'offseason') return { err: 'You can retire in the offseason.' }; if (!o.out) ownArchive({ how: 'retired', price: o.val, net: 0 }); ownHofCheck(true); o.done = true; o.out = o.out || { k: 'retired', s: state.season, txt: `${o.name} retires.` }; ownLog(`${o.name} retires from football.`, 'big'); return { ok: true }; }
function ownHeir(name) {
  const o = OWN(); if (state.phase !== 'offseason' || o.out) return { err: 'The club can be handed down in the offseason.' }; if (o.partner) return { err: 'You don\'t control the club yet.' }; name = String(name || '').trim().slice(0, 30); if (!name) return { err: 'Name your heir.' };
  const v = ownVote('heir', { key: 'heir' }); if (!v.ok) return { err: `The owners don't approve the transfer (${v.yes} of ${v.need} votes). Try again next year.` };
  ownHofCheck(true); ownArchive({ how: 'heir', price: o.val, net: 0 }); const prevName = o.name;
  o.legacyOld = r1((o.legacyOld || 0) + o.legacy * 0.5); o.legacy = 0; o.name = name; o.gen = (o.gen || 1) + 1; o.cash = r1(o.cash * 0.6); o.rep = 48; o.meddle = 0; o.seasons = 0; o.since = state.season + 1; o.hof = null;
  ownLog(`${prevName} hands the ${myName()} to ${name}. The family's second chapter begins.`, 'big'); return { ok: true };
}
// buy another club (after a sale): same rules as the first time
function ownMarketAgain() { const o = OWN(); o.mkt0 = null; o.saleOffers = null; const m = ownMarket().filter(x => x.tid !== ME); o.mkt0 = m; return m; }
function ownBuyAgain(tid, price, debt, mine) {
  const o = OWN(); if (!o.out || o.done) return { err: 'You own a club already.' }; const keep = { prev: o.prev, legacyOld: r1((o.legacyOld || 0) + o.legacy), sb: o.sb, hof: o.hof, gen: o.gen, ord: [], seasons: 0 };
  const v = ownVote('buy', { pct: Math.min(1, mine / (price - debt)), debt, partners: 1, key: tid }); if (!v.ok) return { err: `The owners vote you down (${v.yes} of ${v.need}).` };
  const r = ownCloseBuy(tid, price, debt, mine); if (!r.ok) return r; Object.assign(state.own, keep, { legacy: 0 }); return { ok: true };
}
// the partner years: at the end of each, the controlling owner offers control if your group can pay
function ownPartnerSeasonEnd() {
  const o = OWN(); const P_ = o.partner; P_.yrs--; P_.price = r1(Math.max(P_.price, o.val * 1.03)); const eq = P_.price - o.debt; const need = r1(eq * 0.2);
  P_.need = need; P_.offer = o.cash >= need; if (P_.offer) ownLog(`${P_.seller} is ready to sell you control of the ${myName()} at a ${fmO(P_.price)} valuation. Your part: at least ${fmO(need)}.`, 'big');
  else if (P_.yrs <= -2) { o.out = { k: 'partner', s: state.season, txt: `${P_.seller} sells control to another group. You keep your 10%, but the club isn't yours to run.` }; ownLog(o.out.txt, 'bad'); }
  else ownLog(`${P_.seller} will wait another year: your group needs ${fmO(need)} to take control.`);
}
function ownPartnerTake(mine) {
  const o = OWN(); const P_ = o.partner; if (!P_ || !P_.offer) return { err: 'No offer on the table.' }; const eq = P_.price - o.debt; mine = r1(clamp(+mine || P_.need, P_.need, o.cash));
  const v = ownVote('control', { key: 'ctrl' }); if (!v.ok) return { err: `The owners don't approve the transfer yet (${v.yes} of ${v.need}).` };
  o.cash = r1(o.cash - mine); o.paid = r1((o.paid || 0) + mine); o.pct = r2(clamp(0.1 + mine / eq, 0.3, 1)); o.partners = Math.max(1, Math.ceil((1 - o.pct) / 0.12)); o.partner = null; o.since = state.season + 1;
  ownLog(`${o.name} takes control of the ${myName()} with ${Math.round(o.pct * 100)}% of the club.`, 'big'); return { ok: true };
}
