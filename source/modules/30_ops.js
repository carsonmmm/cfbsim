
/* ---------- football operations: the people who run the team ---------- */
const OWN_GM_STYLE = { trad: ['Old school', 'Trusts his scouts and the tape.'], data: ['Analytics', 'Lives in the numbers. Rarely overpays.'], cap: ['Cap expert', 'Keeps the books clean and the cap healthy.'], deal: ['Dealmaker', 'Loves a trade, especially at the deadline.'] };
function ownGenGM(n) {
  const o = OWN(); const out = [];
  for (let i = 0; i < n; i++) {
    const k = 'gm:' + state.season + ':' + (o.gmGenN = (o.gmGenN || 0) + 1); const ovr = clamp(Math.round(62 + ownH(k + 'o') * 26), 55, 90);
    const st = ownPick(Object.keys(OWN_GM_STYLE), k + 's'); const bg = ownPick(['Assistant GM in a winning front office', 'Director of player personnel', 'College scouting director', 'Former GM, fired two years ago', 'Vice president of football operations', 'Pro scouting director'], k + 'b');
    out.push({ id: 'g' + Math.floor(ownH(k + 'i') * 1e9), name: ownName(k), ovr, style: st, bg, age: 36 + Math.floor(ownH(k + 'a') * 22), sal: r1(1.5 + (ovr - 55) * 0.12), yrs: 4 + Math.floor(ownH(k + 'y') * 2), rel: 60 });
  }
  return out;
}
// will a candidate take the job? Good people avoid owners who meddle, clubs that lose and owners who run the football side
function ownDeclineP(ovr) { const o = OWN(); return clamp((o.meddle - 22) / 70 + (ovr - 74) / 32 + (ownSelfGM() ? 0.15 : 0) + (state.meters.fan < 35 ? 0.08 : 0) + (o.gmP && o.gmP.fired ? 0.05 : 0), 0, 0.85); }
function ownWilling(c, kind) { const ovr = kind === 'gm' ? c.ovr : coachOvr(c); if (c.no == null) c.no = ownH('dec:' + kind + ':' + c.id + ':' + state.season) < ownDeclineP(ovr); return !c.no; }
function ownGmCands() { const o = OWN(); if (!o.gmC || o.gmC.s !== state.season) o.gmC = { s: state.season, list: ownGenGM(5) }; return o.gmC.list; }
function ownHireGM(id) {
  const o = OWN(); const c = ownGmCands().find(x => x.id === id); if (!c) return { err: 'No such candidate.' }; if (!ownWilling(c, 'gm')) return { err: `${c.name} turned the job down.` };
  if (o.gmP) return { err: 'Fire your GM first.' }; o.gmP = Object.assign({}, c, { hired: state.season + 1, rel: 64 }); o.gmC.list = o.gmC.list.filter(x => x.id !== id);
  PS().aigm = { name: c.name, rel: 64 }; PS().gmName = c.name; o.gmLog.unshift({ s: state.season, txt: `Hired ${c.name} as GM` }); ownLog(`The ${myName()} hire ${c.name} as general manager: ${c.yrs} years at ${fmMs(c.sal)} a year.`, 'big'); return { ok: true };
}
function ownFireGM() {
  const o = OWN(); const g = o.gmP; if (!g) return { err: 'You don\'t have a GM.' }; const owed = r1(g.sal * Math.max(1, g.yrs) * 0.6); ownCost(owed, `Buyout: GM ${g.name}`);
  o.gmLog.unshift({ s: state.season, txt: `Fired GM ${g.name}` }); ownLog(`The ${myName()} fire general manager ${g.name}. The club owes him ${fmMs(owed)}.`, 'bad'); o.gmP = null; o.gmFired = state.season; PS().aigm = { name: '', rel: 50 };
  return { ok: true };
}
function ownHireHC(cid) {
  const c = (state.cands.HC || []).find(x => x.id === cid); if (!c) return { err: 'No such candidate.' }; if (!ownWilling(c, 'hc')) return { err: `${c.name} turned the job down.` };
  if (state.staff.HC && !state.staff.HC.interim) return { err: 'Fire your head coach first.' }; if (state.staff.HC && state.staff.HC.interim) state.staff.HC = null;
  return proHireHC(cid) ? { ok: true } : { err: 'The hire didn\'t go through.' };
}
// the offseason moves on: anyone missing gets hired (the best who will come)
function ownEnsureStaff() {
  const o = OWN(); if (o.pending) return;
  if (ownHands() && !o.gmP) { const c = ownGmCands().filter(x => ownWilling(x, 'gm')).sort((a, b) => b.ovr - a.ovr)[0] || ownGenGM(1)[0]; o.gmC.list = o.gmC.list.concat([c]).filter((x, i, a) => a.indexOf(x) === i); c.no = false; ownHireGM(c.id); }
  if (!state.staff.HC || state.staff.HC.interim) { if (!(state.cands.HC || []).length) state.cands.HC = genProCandidates(5); const c = state.cands.HC.filter(x => ownWilling(x, 'hc')).sort((a, b) => coachOvr(b) - coachOvr(a))[0] || state.cands.HC.slice().sort((a, b) => coachOvr(a) - coachOvr(b))[0]; c.no = false; ownHireHC(c.id); }
}
// switching between running the football side yourself and hiring a GM (offseason, before free agency)
function ownSetGM(k) {
  const o = OWN(); if (o.partner) return { err: 'As a minority partner, you don\'t make that call.' }; if (state.phase !== 'offseason' || PS().off.step > 1) return { err: 'You can change this early in the offseason, before players are re-signed.' };
  if (k === o.gm) return { ok: true };
  if (k === 'self') { if (o.gmP) ownFireGM(); o.gm = 'self'; o.rep = clamp(o.rep - 4, 0, 100); state.settings.ask = true; ownLog(`${o.name} will run the football side personally, as general manager.`, 'big'); }
  else { o.gm = 'hire'; const A = autoSet(); ['plan', 'depth', 'staff', 'resign', 'fa', 'draft', 'cuts', 'scout'].forEach(x => { A[x] = true; }); state.settings.ask = false; ownLog(`${o.name} steps back from the football side. The club will hire a general manager.`); }
  return { ok: true };
}
function ownSetDir(k) { const o = OWN(); if (!OWN_DIRS[k]) return null; if (o.dir !== k) { o.dir = k; ownLog(`The ${myName()} set a new direction: ${OWN_DIRS[k][0].toLowerCase()}.`); } return k; }
function ownSetBud(k, v) { const o = OWN(); if (!OWN_BUD[k]) return null; o.bud[k] = clamp(Math.round(+v), 1, 5); return o.bud[k]; }
// the budget lines feed the effects the GM's budget meetings use (-1 to +1)
function ownBudGot(k) {
  const o = OWN(); if (!o || o.pending) return 0; const b = o.bud;
  if (k === 'staff') return r2((b.coach - 3) / 2 + (b.anal - 3) / 8); if (k === 'travel') return b.med >= 4 ? 1 : b.med <= 2 ? -1 : 0;
  if (k === 'fac') { const v = b.fac + (o.stad.train ? 1 : 0); return v >= 5 ? 1 : v >= 4 ? (ownH('facl:' + state.season) < 0.5 ? 1 : 0) : v <= 2 ? -1 : 0; } return 0;
}
// how much your GM listens: almost always, unless the relationship is gone
function ownWeight() { const o = OWN(); const g = o.gmP; return g ? clamp(0.82 + (g.rel - 50) / 260, 0.55, 0.97) : 0.9; }
// every order to the GM costs a little: he notices, and so does everyone else
function ownOrder(kind, pid) { const o = OWN(); o.meddle = clamp(o.meddle + (kind === 'trade' || kind === 'cut' ? 4 : 3), 0, 100); if (o.gmP) o.gmP.rel = clamp(o.gmP.rel - 1.5, 0, 100); (o.ord || (o.ord = [])).push({ s: state.season, kind, pid }); }

/* ---------- what the GM you hired does ---------- */
// skill shows up as fewer overpays and better re-sign calls
const ownGmSkill = () => { const o = OWN(); const g = o.gmP; return (g ? g.ovr : 65) + (o.bud.anal - 3) * 2.5 + (g && g.style === 'data' ? 3 : 0); };
function ownGmResign() {
  const o = OWN(); const w = ownWeight(); const cin = PS().cin; const sk = ownGmSkill(); const dir = o.dir;
  const ageCut = dir === 'win' ? 32 : dir === 'build' ? 28 : 30;
  state.roster.filter(p => !underContract(p)).sort((a, b) => b.ovr - a.ovr).forEach(p => {
    const asked = cin.cut.includes(p.id); const wantKeep = (cin.keep || []).includes(p.id);
    const seen = p.ovr + Math.round((ownH('rsn:' + p.id + ':' + state.season) - 0.5) * (90 - sk) / 4);
    let keep = p.age <= ageCut && seen >= worstStarter(ME, p.pos) - 1 ? 0.8 : p.age <= ageCut + 1 && seen >= 70 ? 0.4 : 0.12;
    if (asked && R() < w) keep = 0; if (wantKeep && R() < w) keep = 1;
    const apy = r2(pValue(p) * (1.02 + Math.max(0, 80 - sk) / 400) * rnd(0.97, 1.08));
    if (R() < keep && capRoom(ME) > apy) { p.k = mkContract(apy, wantYears(p.age), 0.25); txLog(`Re-signed ${p.pos} ${p.n}.`); if (wantKeep) cinNote(`The GM re-signed ${p.n}, as you ordered.`); }
    else { letWalk(p.id); if (wantKeep) cinNote(`The GM let ${p.n} walk despite your order to keep him.`); else if (asked) cinNote(`The GM let ${p.n} go, as you ordered.`); }
  });
}
function ownGmFaBids() {
  const o = OWN(); const L = PS(); const out = {}; const w = ownWeight(); const sk = ownGmSkill(); const over = 1 + Math.max(0, 82 - sk) / 160; let room = capRoom(ME) - (o.dir === 'win' ? 2 : 6);
  L.cin.fa.forEach(id => { const p = faFind(id); if (p && room > p.ask.apy && R() < w) { out[id] = { apy: r2(p.ask.apy * 1.04), yrs: p.ask.yrs }; room -= p.ask.apy; } });
  const n = clamp(Math.round(capRoom(ME) / 22), 2, 8) + (o.dir === 'win' ? 2 : o.dir === 'build' ? -1 : 0); const maxAge = o.dir === 'win' ? 33 : o.dir === 'build' ? 27 : 30;
  needList(ME).slice(0, n).forEach(nd => { const p = L.fa.filter(x => x.pos === nd.pos && !out[x.id] && x.age <= maxAge && x.ovr > worstStarter(ME, nd.pos) + 1).sort((a, b) => b.ovr - a.ovr)[0]; if (p && room > p.ask.apy * over && R() < 0.7) { out[p.id] = { apy: r2(p.ask.apy * over), yrs: p.ask.yrs }; room -= p.ask.apy * over; } });
  return out;
}
// the deadline: a GM who wants to win buys, a GM who's rebuilding sells. You can block either.
function ownGmDeadline() {
  const o = OWN(); const L = PS(); if (!o.gmP || o.dir === 'bal' && o.gmP.style !== 'deal') return null; const t = T(ME);
  const good = t.w >= t.l + 1; if (o.dir === 'win' && !good && t.w + t.l >= 5) return null;
  if (o.dir === 'build' || (o.dir === 'bal' && !good)) {
    const p = state.roster.filter(x => underContract(x) && x.age >= 29 && x.ovr >= 77).sort((a, b) => tradeValue(b) - tradeValue(a))[0]; if (!p) return null;
    const tid = NFL.map(x => x.id).filter(id => id !== ME && capRoom(id) >= capHit(p) && T(id).w >= T(id).l).sort((a, b) => posNeed(b, p.pos) - posNeed(a, p.pos))[0]; if (!tid) return null;
    const v = tradeValue(p); const their = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === tid && pickPts(x.pk) <= v * 1.15).sort((a, b) => pickPts(b.pk) - pickPts(a.pk))[0]; if (!their || pickPts(their.pk) < v * 0.6) return null;
    return { k: 'sell', tid, pid: p.id, pk: [their.i], txt: `Trade ${p.pos} ${p.n} (${p.age}, ${p.ovr}) to the ${teamName(tid)} for ${pickLabel(L.picks[their.i])}.` };
  }
  const nd = needList(ME)[0]; if (!nd || nd.n < 0.25) return null;
  const cands = []; NFL.forEach(x => { if (x.id === ME || T(x.id).w > T(x.id).l) return; proRoster(x.id).forEach(p => { if (p.pos === nd.pos && underContract(p) && p.age <= 31 && p.ovr >= worstStarter(ME, nd.pos) + 3 && capRoom(ME) >= capHit(p)) cands.push({ p, tid: x.id }); }); });
  const c = cands.sort((a, b) => b.p.ovr - a.p.ovr)[0]; if (!c) return null; const v = tradeValue(c.p);
  const mine = L.picks.map((pk, i) => ({ pk, i })).filter(x => x.pk.own === ME).sort((a, b) => pickPts(a.pk) - pickPts(b.pk)); const give = []; let sum = 0;
  for (const x of mine) { if (sum >= v * 0.95) break; give.push(x.i); sum += pickPts(x.pk); } if (sum < v * 0.9 || give.length > 3) return null;
  return { k: 'buy', tid: c.tid, pid: c.p.id, pk: give, txt: `Get ${c.p.pos} ${c.p.n} (${c.p.age}, ${c.p.ovr}) from the ${teamName(c.tid)} for ${give.map(i => pickLabel(L.picks[i])).join(' and ')}.` };
}
function ownGmDealRun() {
  const o = OWN(); const d = o.gmDeal; if (!d || d.done) return; d.done = true; if (d.blocked) return;
  const r = d.k === 'sell' ? tradeExec(d.tid, { pl: [d.pid], pk: [] }, { pl: [], pk: d.pk }, true) : tradeExec(d.tid, { pl: [], pk: d.pk }, { pl: [d.pid], pk: [] }, true);
  if (r && r.ok) ownLog(`Your GM makes his deadline deal with the ${teamName(d.tid)}.`); else ownLog('Your GM\'s deadline deal fell through.');
}
function ownGmDealBlock() { const o = OWN(); const d = o.gmDeal; if (!d || d.done || d.blocked) return false; d.blocked = true; o.meddle = clamp(o.meddle + 6, 0, 100); if (o.gmP) o.gmP.rel = clamp(o.gmP.rel - 6, 0, 100); ownLog('You block your GM\'s deadline trade.'); return true; }
// an extension the owner orders (hands-off): the GM pays a bit extra to get it done now
function ownForceExt(pid) {
  const o = OWN(); const p = P(pid); if (!p || !ownHands()) return { err: 'Not possible.' }; if (!p.k || p.k.yrs > 1) return { err: 'He has more than a year left on his deal.' };
  if (p.ovr < 72) return { err: 'Your GM won\'t extend him: he isn\'t good enough.' }; const a = askFor(p, true); if (a.walk) return { err: `${p.n} won't talk about an extension.` };
  const apy = r2(a.apy * 1.08); const nk = extendK(p.k, apy, a.yrs); const delta = r2(nk.base + nk.bpy - capHit(p)); if (delta > 0 && delta > capRoom(ME)) return { err: 'It doesn\'t fit under the cap.' };
  signOwn(p, apy, a.yrs, true); ownOrder('ext', pid); o.meddle = clamp(o.meddle + 2, 0, 100); cinNote(`On your orders, the GM extends ${p.n} (${fmM(apy)} a year).`); return { ok: true, apy };
}

/* ---------- hooks ---------- */
function ownOpsWeek(wk, mg) {
  const o = OWN(); const L = PS();
  L.scout = clamp(r1((L.scout || 0) + (o.bud.scout - 3) * 0.6 + (ownHands() && o.gmP ? (o.gmP.ovr - 70) / 15 : 0)), 0, 60);
  if (ownHands() && wk === 7 && !o.partner) { const d = ownGmDeadline(); o.gmDeal = d ? Object.assign(d, { s: state.season, done: false }) : null; if (d) ownLog(`Your GM has a deadline deal ready: ${d.txt} It goes through next week unless you block it.`); }
  if (ownHands() && wk === 8 && o.gmDeal && o.gmDeal.s === state.season) ownGmDealRun();
}
function ownOpsSeasonStart() { const o = OWN(); if (o.gmP && o.gmP.hired == null) o.gmP.hired = state.season; o.gmDeal = null; }
function ownOpsSeasonEnd(rv) {
  const o = OWN(); const g = o.gmP; if (!g || !ownHands()) return;
  const d = (rv.w - rv.exp) * 1.5 + [0, 2, 3, 4, 6, 10][rv.po]; g.rel = clamp(Math.round(g.rel + (60 - g.rel) * 0.15 - o.meddle / 25 + (d > 0 ? 2 : -1)), 0, 100); g.yrs = Math.max(0, g.yrs - 1);
  g.score = Math.round(clamp(55 + d * 3, 0, 100)); PS().aigm = { name: g.name, rel: g.rel };
  if (g.rel < 22) { o.gmLog.unshift({ s: state.season, txt: `${g.name} resigned` }); ownLog(`General manager ${g.name} resigns. He's had enough of being overruled.`, 'bad'); o.gmP = null; o.meddle = clamp(o.meddle + 5, 0, 100); return; }
}
