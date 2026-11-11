/* ===================== COMMISSIONER (v9.10): running college football or the NFL, never a team ===================== */
// The league office: five meters (owners or presidents, fans, the players' union or the athletes, integrity, revenue),
// a desk of decisions that arrive week by week (discipline, controversies, emergencies) and in the offseason (money,
// the rules committee, the Hall of Fame, ownership), a term that ends in a vote, and a legacy.
// The engine still keeps one team under the hood (ME) because the season engine needs it; it runs itself and the
// commissioner screens never show it. Every random choice here uses hash(), so the season's random stream is untouched.

const cmLvl = () => (isPro() ? 'nfl' : 'col');
const CM_LBL = { own: ['University presidents', 'Owners'], fan: ['Fans', 'Fans'], union: ['Athletes', 'Players\' union'], integ: ['Integrity', 'Integrity'] };
const cmLabel = k => CM_LBL[k][cmLvl() === 'nfl' ? 1 : 0];
function cm2() {
  const c = commOf();
  if (!c.v2) { c.v2 = 1; c.lvl = cmLvl(); c.m = { own: 60, fan: 60, union: 58, integ: 70 }; c.rev = isPro() ? 23 : 3.1; c.rev0 = c.rev; c.term = { start: c.since || state.season, n: 1 }; c.items = []; c.disc = []; c.prec = {}; c.susp = []; c.refQ = 60; c.safety = 50; c.share = 50; c.yrs = []; c.ach = {}; c.peace = 0; c.hof = []; c.flags = {}; c.owners = {}; c.reloc = {}; c.seq = 1; c.cmt = []; c.bans = c.bans || {}; c.tv = { until: state.season + 2, k: 'split', g: 0.04 }; if (isPro()) c.cba = { until: state.season + 4, share: 48.5 }; c.nil = 'guard'; c.athShare = 0; c.cfpSplit = 'power'; }
  c.items = c.items || []; c.m = c.m || { own: 60, fan: 60, union: 58, integ: 70 }; return c;
}
const cmH = k => hash((state.seed || 0) + ':cm:' + state.season + ':' + state.week + ':' + k);
const cmPick = (arr, k) => arr[Math.floor(cmH(k) * arr.length) % arr.length];
const fmB = v => (typeof fmO === 'function' ? fmO(v * 1000) : '$' + (Math.round(v * 10) / 10).toFixed(1) + 'B'); /* v9.50: one money format */
function cmFx(fx) { const c = cm2(); Object.entries(fx || {}).forEach(([k, v]) => { if (!v) return; if (k === 'rev') c.rev = r2(Math.max(0.3, c.rev + v * (cmLvl() === 'nfl' ? 1 : 0.15))); /* college money is about a seventh of the NFL's */ else if (k === 'refQ' || k === 'safety') c[k] = clamp(Math.round((c[k] || 50) + v), 0, 100); else if (c.m[k] != null) { const cur = c.m[k]; const f = v > 0 ? clamp((100 - cur) / 40, 0.2, 1) : clamp(cur / 40, 0.2, 1); c.m[k] = clamp(Math.round(cur + v * f), 0, 100); } }); } /* harder to push a meter the closer it is to either end */
function cmLog(txt, big) { const c = cm2(); (c.log = c.log || []).unshift({ s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, txt }); if (c.log.length > 120) c.log.length = 120; addNews('Commissioner: ' + txt, big ? 'big' : ''); }
function cmPost(it) { const c = cm2(); it.id = 'm' + (c.seq = (c.seq || 1) + 1); it.s = state.season; it.wk = state.phase === 'offseason' ? 0 : state.week; c.items.push(it); return it; }
const cmAgendaOpen = () => cm2().items.filter(x => x.agenda);
const cmWkLbl = () => (state.phase === 'offseason' ? 'Offseason' : isPro() ? nflWeekLabel(state.week) : weekLabel(state.week));
function cmTeams() { return Object.values(state.teams).filter(t => t && !(typeof isFCS === 'function' && !isPro() && isFCS(t.id))); }
const cmTName = id => teamName(id);

/* ---------- discipline: incidents, suspensions, precedent and appeals ---------- */
const CM_INC = {
  hit: { t: 'Dirty hit', sev: 2, txt: n => `${n} launched into a defenseless receiver with a helmet-to-helmet hit. The video is everywhere.` },
  fight: { t: 'Fight on the field', sev: 1, txt: n => `${n} threw punches in a scrum after the whistle and was ejected.` },
  ped: { t: 'Failed drug test', sev: 3, txt: n => `${n} tested positive for a banned performance-enhancing substance.` },
  arrest: { t: 'Off-field arrest', sev: 3, txt: n => `${n} was arrested after a late-night fight outside a club. Charges are pending.` },
  dui: { t: 'Drunk-driving arrest', sev: 3, txt: n => `${n} was arrested for driving under the influence.` },
  taunt: { t: 'Bumping an official', sev: 1, txt: n => `${n} was ejected for shoving an official after a call.` },
  gamble: { t: 'Betting on games', sev: 5, txt: n => `${n} placed bets on league games, including his own team's.` },
};
const cmStd = sev => (cmLvl() === 'nfl' ? [0, 1, 2, 4, 6, 17] : [0, 1, 1, 2, 4, 12])[sev];
function cmIncident() {
  const nfl = cmLvl() === 'nfl'; const kind = cmPick(Object.keys(CM_INC).concat(['hit', 'fight', 'taunt', 'arrest']), 'ik'); const D = CM_INC[kind];
  const teams = cmTeams().filter(t => nfl || (t.id !== ME && t.stars && t.stars.length)); if (!teams.length) return null; const t = cmPick(teams, 'it');
  let p;
  if (nfl) { const ros = (proRoster(t.id) || []).filter(x => !x.real && !x.inj).sort((a, b) => b.ovr - a.ovr).slice(0, 22); if (!ros.length) return null; const x = cmPick(ros, 'ip'); p = { pid: x.id, n: x.n, pos: x.pos, ovr: x.ovr }; }
  else { const x = cmPick(t.stars, 'ip'); p = { n: x.n, pos: x.pos, ovr: x.ovr || 75 }; }
  const star = p.ovr >= (nfl ? 84 : 82); const std = cmStd(D.sev); const harsh = D.sev >= 4 ? (nfl ? 17 : 12) : Math.max(std * 2, std + 2); const pc = cm2().prec[kind];
  const opts = [['none', 'No further action', 'Let the team handle it.'], ['fine', 'A fine only', 'Money, but he keeps playing.'], ['std', `Suspend him ${std} game${std > 1 ? 's' : ''}`, 'The standard penalty for this.'], ['harsh', D.sev >= 4 ? 'Suspend him for the season' : `Suspend him ${harsh} games`, 'Send a message.']];
  return cmPost({ kind: 'inc', title: D.t + (star ? ' · a star' : ''), txt: `${D.txt(`${p.pos} ${p.n} (${cmTName(t.id)})`)}${pc != null ? ` Your past rulings for this average ${pc.toFixed(1)} games.` : ''}`, opts, def: 2, data: { k: kind, tid: t.id, p, star, std, harsh } });
}
function cmSuspend(it, g) {
  const c = cm2(); const d = it.data; if (!g) return;
  if (cmLvl() === 'nfl') { const x = (proRoster(d.tid) || []).find(y => y.id === d.p.pid); if (x) { x.inj = Math.max(x.inj || 0, g); x.susp = g; } }
  else { const t = T(d.tid); const dd = d.star ? 1.6 : 0.9; if (t) { t.rating = r1(t.rating - dd); c.susp.push({ tid: d.tid, n: d.p.n, wks: g, d: dd, s: state.season }); } }
}
function cmDiscipline(it, k) {
  const c = cm2(); const d = it.data; const e = d.std; const g = k === 'std' ? e : k === 'harsh' ? d.harsh : 0; const sev = CM_INC[d.k].sev; const fx = {};
  const pc = c.prec[d.k]; const msgs = [];
  if (k === 'none') { fx.integ = -(1 + sev * 1.5); fx.fan = -Math.ceil(sev / 2); fx.union = 2; }
  else if (k === 'fine') { fx.integ = sev >= 3 ? -sev : 1; fx.union = 1; fx.fan = sev >= 3 ? -2 : 0; }
  else { fx.integ = clamp(Math.round((g - e) * 0.8) + (g >= e ? 1 : 0), -4, 5); fx.union = clamp(-Math.round((g - e) * 0.8) - (g >= 6 ? 2 : 0), -7, 2); fx.fan = g >= e ? 1 : -1; }
  if (d.star && g < e) { fx.fan = (fx.fan || 0) - 3; fx.integ = (fx.integ || 0) - 2; msgs.push('Fans call it favoritism for a star.'); }
  if (pc != null && k !== 'none') { if (Math.abs(g - pc) <= 1) { fx.own = (fx.own || 0) + 1; fx.integ = (fx.integ || 0) + 1; msgs.push('Consistent with your past rulings.'); } else if (Math.abs(g - pc) >= 3) { fx.own = (fx.own || 0) - 1; msgs.push('Inconsistent with your past rulings.'); } }
  cmFx(fx); cmSuspend(it, g);
  const n = (c.precN = c.precN || {}); n[d.k] = (n[d.k] || 0) + 1; c.prec[d.k] = r1(((pc || 0) * (n[d.k] - 1) + g) / n[d.k]);
  c.disc.unshift({ s: state.season, wk: it.wk, n: d.p.n, pos: d.p.pos, tm: d.tid, k: d.k, g, fine: k === 'fine', star: d.star }); if (c.disc.length > 200) c.disc.length = 200;
  if (g) c.suspN = (c.suspN || 0) + 1;
  cmLog(g ? `${d.p.n} (${cmTName(d.tid)}) is suspended ${g >= 12 ? 'for the season' : g + ' game' + (g > 1 ? 's' : '')}: ${CM_INC[d.k].t.toLowerCase()}.` : k === 'fine' ? `${d.p.n} (${cmTName(d.tid)}) is fined: ${CM_INC[d.k].t.toLowerCase()}.` : `No action against ${d.p.n} (${cmTName(d.tid)}).`);
  // the union (or the player's school) appeals a long or out-of-line suspension
  if (g && (g >= 6 || (pc != null && g > pc + 1.5)) && cmH('ap' + it.id) < 0.75) cmPost({ kind: 'appeal', title: `${cmLvl() === 'nfl' ? 'The union appeals' : 'An appeal'}: ${d.p.n}`, txt: `${cmLvl() === 'nfl' ? 'The players\' union' : d.p.n + '\'s school'} appealed the ${g}-game suspension${pc != null ? ` (your rulings for this average ${pc.toFixed(1)})` : ''}.`, opts: [['fight', 'Fight it before the arbitrator', 'Win and your authority grows. Lose and it shrinks.'], ['settle', 'Settle: cut it in half', 'Labor peace, but it looks soft.'], ['rescind', 'Drop the suspension', 'The union is thrilled. Nobody else is.']], def: 1, data: Object.assign({}, d, { g, pc }) });
  return msgs.join(' ');
}
function cmAppeal(it, k) {
  const c = cm2(); const d = it.data; const half = Math.floor(d.g / 2); let msg = '';
  const lift = n => { if (cmLvl() === 'nfl') { const x = (proRoster(d.tid) || []).find(y => y.id === d.p.pid); if (x && x.susp) { x.inj = Math.max(0, (x.inj || 0) - n); x.susp = Math.max(0, x.susp - n); } } else { const s = c.susp.find(x => x.n === d.p.n && x.tid === d.tid && x.wks > 0); if (s) { s.wks = Math.max(0, s.wks - n); if (!s.wks) { const t = T(s.tid); if (t) t.rating = r1(t.rating + s.d); s.d = 0; } } } };
  if (k === 'fight') { const p = clamp(0.5 + (d.pc != null && Math.abs(d.g - d.pc) <= 1.5 ? 0.2 : -0.15) + (c.m.integ - 60) / 200, 0.15, 0.85); if (cmH('arb' + it.id) < p) { cmFx({ own: 2, integ: 2, union: -3 }); msg = 'The arbitrator upholds your suspension.'; c.arbW = (c.arbW || 0) + 1; } else { lift(d.g - half); cmFx({ own: -3, integ: -3, union: 2 }); msg = `The arbitrator cuts it to ${half} game${half === 1 ? '' : 's'}.`; c.arbL = (c.arbL || 0) + 1; } }
  else if (k === 'settle') { lift(d.g - half); cmFx({ union: 3, integ: -1, own: -1 }); msg = `You settle at ${half} game${half === 1 ? '' : 's'}.`; }
  else { lift(d.g); cmFx({ union: 5, integ: -4, own: -2, fan: -2 }); msg = 'You drop the suspension.'; }
  cmLog(`Appeal for ${d.p.n}: ${msg}`); return msg;
}
const CM_TV = { nfl: { tamper: ['Tampering', 'contacted a star under contract with another team.'], tape: ['Filming signals', 'was caught filming opponents\' defensive signals.'], cap: ['Hidden payments', 'hid payments to players to get around the salary cap.'] }, col: { rec: ['Recruiting violations', 'had impermissible contact with recruits during a dead period.'], ben: ['Improper benefits', 'had boosters paying players outside the NIL rules.'], acad: ['Academic fraud', 'enrolled players in classes that never met.'] } };
function cmTeamViolation() {
  const nfl = cmLvl() === 'nfl'; const L = CM_TV[nfl ? 'nfl' : 'col']; const k = cmPick(Object.keys(L), 'tk'); const t = cmPick(cmTeams().filter(x => nfl || x.id !== ME), 'tt'); if (!t) return null;
  const opts = nfl ? [['warn', 'A private warning', 'Keep it quiet.'], ['fine', 'A $5 million fine', 'Money only.'], ['pick2', 'Fine them and take a 2nd-round pick', 'A real penalty.'], ['pick1', 'Fine them and take a 1st-round pick', 'The harshest penalty.']]
    : [['warn', 'Probation', 'A warning on the record.'], ['schol', 'Scholarship cuts', 'Weaker for the next two seasons.'], ['ban', `A postseason ban ${state.phase === 'offseason' ? 'next season' : 'this season'}`, 'No bowl, no playoff.'], ['none', 'No action', 'Let it go.']];
  return cmPost({ kind: 'tv', title: `${L[k][0]}: ${cmTName(t.id)}`, txt: `An investigation found that ${cmTName(t.id)} ${L[k][1]}`, opts, def: 1, data: { k, tid: t.id } });
}
// The pick a penalty takes: one the club owns right now (a pick it traded away is someone else's), its own round
// first, then the next year, then any later round. None at all: the penalty is noted and nothing is taken (FE-10).
function cmPickToForfeit(L, tid, rd, yr) {
  const mine = x => x.own === tid && !x.c && !x.forf; const by = [x => x.yr === yr && x.rd === rd, x => x.yr === yr + 1 && x.rd === rd, x => x.yr === yr && x.rd > rd, x => x.yr === yr + 1 && x.rd > rd];
  for (const f of by) { const p = L.picks.filter(x => mine(x) && f(x)).sort((a, b) => (a.orig === tid ? 0 : 1) - (b.orig === tid ? 0 : 1))[0]; if (p) return p; }
  return null;
}
const cmPickTxt = p => `its ${p.yr} round ${p.rd} pick${p.orig !== p.own ? ` (the one it got from ${cmTName(p.orig)})` : ''}`;
function cmTeamPenalty(it, k) {
  const c = cm2(); const d = it.data; const nm = cmTName(d.tid); let msg = '';
  if (k === 'warn') { cmFx({ integ: -3, own: 1 }); msg = `${nm} gets a warning.`; }
  else if (k === 'none') { cmFx({ integ: -6, fan: -2 }); msg = `No action against ${nm}.`; }
  else if (k === 'fine') { cmFx({ integ: 1, own: -1, rev: 0.005 }); msg = `${nm} is fined $5 million.`; }
  else if (k === 'pick1' || k === 'pick2') { const rd = k === 'pick1' ? 1 : 2; const L = PS(); const yr = state.season + 1; const pk = cmPickToForfeit(L, d.tid, rd, yr); if (pk) pk.forf = true; cmFx({ integ: rd === 1 ? 6 : 4, own: rd === 1 ? -4 : -2, fan: 2 }); msg = pk ? `${nm} is fined and loses ${cmPickTxt(pk)}.` : `${nm} is fined. It has no pick left to take, so the forfeit is noted for the record.`; }
  else if (k === 'schol') { const t = T(d.tid); if (t) t.rating = r1(t.rating - 2); cmFx({ integ: 4, own: -2 }); msg = `${nm} loses scholarships for two seasons.`; }
  else if (k === 'ban') { const yr = state.phase === 'offseason' ? state.season + 1 : state.season; (c.bans = c.bans || {})[d.tid] = yr; cmFx({ integ: 6, own: -3, fan: 1 }); msg = `${nm} is banned from the ${yr} postseason.`; }
  c.tpen = c.tpen || []; c.tpen.unshift({ s: state.season, tm: d.tid, k: d.k, pen: k }); if (c.tpen.length > 60) c.tpen.length = 60;
  cmLog(msg, k === 'pick1' || k === 'ban'); return msg;
}
function cmBanned(id) { const c = state.comm; return !!(c && c.bans && c.bans[id] === state.season); }

/* ---------- controversies and the press ---------- */
const CM_STORY = {
  badcall: { t: 'A blown call', heat: 2, txt: d => `A missed pass-interference call decided ${d.g || 'a big game'} last week. Replays show the officials got it wrong.`, opts: [['review', 'Expand replay review', { refQ: 8, fan: 3, rev: -0.05 }], ['crew', 'Suspend the officiating crew', { fan: 2, refQ: 3 }], ['defend', 'Stand by the officials', { own: 1, fan: -3 }]] },
  protest: { t: 'Player protests', heat: 2, txt: () => 'Players on several teams staged a protest before kickoff about a social issue. It is all anyone is talking about.', opts: [['support', 'Back the players\' right to speak', { union: 5, fan: -2, own: -2 }], ['neutral', 'Allow it and stay neutral', { union: 2, own: -1 }], ['fine', 'Fine players who protest on the field', { union: -8, own: 2, fan: -1 }]] },
  leak: { t: 'An owner goes to the press', heat: 2, txt: d => `The owner of ${d.tn || 'a team'} told reporters the league office is "out of touch."`, opts: [['meet', 'Meet with him privately', { own: 2 }], ['fine', 'Fine him for the comments', { own: -2, integ: 2, fan: 1 }], ['answer', 'Answer him in public', { fan: 1, own: -1 }]] },
  lawsuit: { t: 'Concussion lawsuit', heat: 2, txt: () => 'A group of former players sued the league over head injuries.', opts: [['settle', 'Settle the case', { rev: -0.4, union: 4, fan: 2 }], ['fund', 'Settle and fund safety research', { rev: -0.6, union: 6, fan: 3, safety: 8 }], ['fight', 'Fight it in court', { rev: -0.1, fan: -3, union: -4 }]] },
  betting: { t: 'Betting scandal', heat: 3, txt: () => 'Investigators say a referee and two players were tied to a betting ring.', opts: [['probe', 'Order an independent investigation', { rev: -0.1, integ: 6, fan: 2 }], ['ban', 'Ban everyone involved for life', { integ: 8, union: -4, fan: 4 }], ['quiet', 'Handle it quietly', { integ: -6, own: 1 }]] },
  coverup: { t: 'Cover-up report', heat: 2, txt: () => 'A newspaper reports the league office went easy on a star last season and hid it.', opts: [['reform', 'Admit mistakes and reform the process', { integ: 5, own: -3, fan: 2 }], ['review', 'Order an outside review', { integ: 3, rev: -0.05 }], ['deny', 'Deny everything', { integ: -4, own: 1 }]] },
  reflock: { t: 'Referee walkout', heat: 2, txt: () => 'The referees walked out over pay. Replacement officials are on standby.', opts: [['pay', 'Give the referees a raise', { rev: -0.1, refQ: 4 }], ['replace', 'Use replacement officials', { refQ: -20, fan: -4, own: 1 }], ['split', 'Meet them halfway', { rev: -0.05, refQ: 1 }]] },
};
function cmStory(kind, d) {
  const S = CM_STORY[kind]; const c = cm2(); if (c.items.some(x => x.kind === 'story' && x.data.k === kind)) return null; d = d || {};
  return cmPost({ kind: 'story', title: S.t, txt: S.txt(d), opts: S.opts.map(([k, l, fx]) => [k, l, cmFxTxt(fx)]).concat([['wait', 'Say nothing and let it pass', 'It may die down, or it may grow.']]), def: 1, data: { k: kind, heat: d.heat || S.heat, d } });
}
function cmFxTxt(fx) { const lbl = { own: cmLabel('own'), fan: 'fans', union: cmLabel('union'), integ: 'integrity', rev: 'revenue', refQ: 'referees', safety: 'safety' }; return Object.entries(fx).filter(([, v]) => v).map(([k, v]) => `${k === 'rev' ? (v > 0 ? '+' : '−') + fmB(Math.abs(v) * (cmLvl() === 'nfl' ? 1 : 0.15)) : (v > 0 ? '+' : '−') + Math.abs(v)} ${lbl[k] || k}`).join(', '); }
function cmStoryAnswer(it, k) {
  const c = cm2(); const S = CM_STORY[it.data.k]; const o = S.opts.find(x => x[0] === k);
  if (o) { cmFx(o[2]); if (it.data.k === 'betting') c.betHandled = (c.betHandled || 0) + 1; if (it.data.k === 'betting' && k === 'quiet') c.flags.hid = state.season; cmLog(`${S.t}: ${o[1].toLowerCase()}.`); return 'Done.'; }
  // ignored: the story grows, and at full heat it becomes a crisis
  const heat = it.data.heat + 1;
  if (heat >= 5) { cmFx({ fan: -8, integ: -8, own: -6, rev: -0.2 }); c.crisis = state.season; cmLog(`${S.t} becomes a full-blown crisis.`, true); return 'It became a crisis.'; }
  cmFx({ fan: -heat, integ: -1 }); const n = cmPost({ kind: 'story', title: S.t + ' · the story grows', txt: S.txt(it.data.d) + ` (heat ${heat} of 5)`, opts: it.opts, def: 1, data: { k: it.data.k, heat, d: it.data.d } }); n.wk = it.wk; return 'The story keeps growing.';
}
function cmPresser() {
  const c = cm2(); if (c.items.some(x => x.kind === 'press')) return null; const hot = c.items.filter(x => x.kind === 'story').sort((a, b) => b.data.heat - a.data.heat)[0]; if (!hot) return null;
  return cmPost({ kind: 'press', title: 'Weekly press conference', txt: `Reporters want to know about: ${hot.title.toLowerCase()}.`, opts: [['own', 'Take responsibility', 'Fans like it; owners less so.'], ['defend', 'Defend the league', 'Owners like it; fans less so.'], ['deflect', 'Deflect and move on', 'Nothing gained, a little trust lost.'], ['skip', 'Skip it this week', 'Reporters notice.']], def: 2, data: { story: hot.id } });
}
function cmPress(it, k) { const fx = { own: { fan: 2, own: -1 }, defend: { own: 2, fan: -2 }, deflect: { integ: -1 }, skip: { fan: -1 } }[k] || {}; cmFx(fx); const s = cm2().items.find(x => x.id === it.data.story); if (s && k === 'own') s.data.heat = Math.max(1, s.data.heat - 1); return { own: 'You took responsibility.', defend: 'You defended the league.', deflect: 'You deflected.', skip: 'You skipped the press conference.' }[k] || ''; }

/* ---------- emergencies and awards ---------- */
function cmEmergency() {
  const g = state.games.filter(x => x.wk === state.week && !x.done && T(x.h)).sort((a, b) => cmH('eg' + a.id) - cmH('eg' + b.id))[0]; if (!g) return null;
  const city = isPro() ? (NFL_BY[g.h] ? NFL_BY[g.h].name.split(' ').slice(0, -1).join(' ') : cmTName(g.h)) : ((TEAM_INFO[g.h] || {}).city || cmTName(g.h)); const storm = cmH('es') < 0.6;
  return cmPost({ kind: 'emerg', title: storm ? 'A hurricane is coming' : 'Stadium damage', txt: storm ? `A hurricane is heading toward ${city} before ${cmTName(g.a)} at ${cmTName(g.h)} this week.` : `A fire damaged part of the stadium in ${city} before ${cmTName(g.a)} at ${cmTName(g.h)}.`, opts: [['move', 'Move the game to a neutral site', 'Safe, and a little costly.'], ['delay', 'Postpone it a day', 'Teams and broadcasters grumble.'], ['play', 'Play as scheduled', 'Probably fine. Probably.']], def: 1, data: { gid: g.id } });
}
function cmEmerg(it, k) {
  if (k === 'move') { cmFx({ rev: -0.05, fan: 2, integ: 1 }); const g = state.games.find(x => x.id === it.data.gid); if (g) g.neutral = true; return 'The game moves to a neutral site.'; }
  if (k === 'delay') { cmFx({ own: -2, fan: -1 }); return 'The game is pushed back a day.'; }
  if (cmH('ep' + it.id) < 0.35) { cmFx({ fan: -6, integ: -5, own: -2 }); cmLog('Playing through the storm went badly: fans and players were put at risk.', true); return 'It went badly.'; }
  cmFx({ own: 1 }); return 'The game went off without a problem.';
}
function cmAward() {
  const nfl = cmLvl() === 'nfl'; const a = cRecName((state.seed || 0) + ':roy:a:' + state.season), b = cRecName((state.seed || 0) + ':roy:b:' + state.season); const P = ['QB', 'RB', 'WR', 'DE', 'LB', 'CB'];
  const pa = P[Math.floor(cmH('pa') * P.length)], pb = P[Math.floor(cmH('pb') * P.length)];
  return cmPost({ kind: 'award', title: `${nfl ? 'Rookie' : 'Freshman'} of the Year: the vote is tied`, txt: `The voters split evenly between ${pa} ${a} and ${pb} ${b}. As commissioner, you break the tie.`, opts: [['a', `${a} (${pa})`, ''], ['b', `${b} (${pb})`, ''], ['co', 'Name them co-winners', 'Nobody loses; some call it a cop-out.']], def: 2, data: { a: a + ', ' + pa, b: b + ', ' + pb } });
}

/* ---------- every week of the season ---------- */
function cmWeek() {
  if (!isComm() || state.phase === 'offseason') return; const c = cm2(); if (c.wkS === state.season * 100 + state.week) return; c.wkS = state.season * 100 + state.week;
  state.event = null; cmSeasonStart();
  // whatever is still open is decided by your staff (the default), with a small cost for letting it sit
  c.items.filter(x => !x.agenda).forEach(x => { cmResolve(x.id, cmStaffK(x), true); });
  // suspensions served (college: the team gets its player back)
  c.susp.forEach(s => { if (s.wks > 0) { s.wks--; if (!s.wks && s.d) { const t = T(s.tid); if (t) t.rating = r1(t.rating + s.d); s.d = 0; } } }); c.susp = c.susp.filter(s => s.wks > 0 || s.s === state.season);
  const wk = state.week; const late = isPro() ? wk > 18 : state.phase !== 'regular';
  if (cmH('inc') < 0.42) cmIncident(); if (cmH('inc2') < 0.08) cmIncident();
  if (cmH('tv') < (late ? 0.03 : 0.1)) cmTeamViolation();
  const prev = state.games.filter(x => x.wk === wk - 1 && x.done && Math.abs(x.hs - x.as) <= 3);
  if (prev.length && cmH('bc') < 0.1 + (60 - (c.refQ || 60)) / 250) { const g = prev[0]; cmStory('badcall', { g: `${cmTName(g.a)} at ${cmTName(g.h)}` }); }
  if (cmH('st') < 0.12) { const pool = ['protest', 'leak', 'lawsuit', 'reflock']; if (c.flags.bet) pool.push('betting', 'betting'); if (c.flags.hid && c.flags.hid < state.season) pool.push('coverup', 'coverup'); if (c.flags.shady) pool.push('leak'); const k = pool[Math.floor(cmH('sk') * pool.length)]; const tm = cmPick(cmTeams(), 'st'); cmStory(k, { tn: tm ? cmTName(tm.id) : '' }); }
  else if (cmH('bet') < 0.025) cmStory('betting');
  if (c.items.some(x => x.kind === 'story')) cmPresser();
  if (cmH('em') < 0.035 && !late) cmEmergency();
  if (wk === (isPro() ? 16 : 11) && cmH('aw') < 0.6) cmAward();
}
// at the start of each season: competitive balance, owners who spend, the money split
function cmSeasonStart() {
  const c = cm2(); if (c.startS === state.season || state.phase === 'offseason') return; c.startS = state.season;
  const ts = cmTeams(); if (!ts.length) return;
  if (cmLvl() === 'nfl') {
    const mean = ts.reduce((s, t) => s + t.rating, 0) / ts.length; const f = clamp(1 - ((c.share || 50) - 50) / 300, 0.8, 1.1); ts.forEach(t => { t.rating = r1(mean + (t.rating - mean) * f); });
    Object.entries(c.owners || {}).forEach(([tid, o]) => { if (o.k === 'deep' && state.season - o.s <= 3 && T(tid)) T(tid).rating = r1(T(tid).rating + 0.8); });
    if (c.flags.lottery) { const worst = ts.slice().sort((a, b) => a.rating - b.rating).slice(0, 4); worst.forEach(t => { t.rating = r1(t.rating + 0.4); }); }
  } else {
    const p4 = t => CONFS[t.conf] && CONFS[t.conf].p4; const d = (c.cfpSplit === 'even' ? -0.3 : 0.2) + (c.nil === 'open' ? 0.2 : c.nil === 'strict' ? -0.15 : 0);
    ts.forEach(t => { if (t.id === ME) return; t.rating = r1(t.rating + (p4(t) ? d : -d)); });
  }
}
function cmInjF() { return isComm() ? clamp(1.3 - (cm2().safety || 50) / 100 * 0.6, 0.6, 1.4) : 1; }

/* ---------- the offseason: money, rules, the Hall of Fame, ownership and your term ---------- */
const CM_PROPS = {
  otboth: { lvl: 'nfl', t: 'Overtime: both teams get the ball', ok: () => rules().otNfl !== 'nfl', go: () => setRule('otNfl', 'nfl'), sup: 72, fx: { fan: 2 } },
  otsd: { lvl: 'nfl', t: 'Overtime: sudden death', ok: () => rules().otNfl !== 'sudden', go: () => setRule('otNfl', 'sudden'), sup: 45, fx: { fan: -1 } },
  seeds6: { lvl: 'nfl', t: 'Playoffs: six teams per conference', ok: () => +rules().nflSeeds === 7, go: () => setRule('nflSeeds', 6), sup: 40, fx: { rev: -0.2, own: 2 } },
  seeds7: { lvl: 'nfl', t: 'Playoffs: seven teams per conference', ok: () => +rules().nflSeeds === 6, go: () => setRule('nflSeeds', 7), sup: 70, fx: { rev: 0.3, fan: 2 } },
  r48: { lvl: 'nfl', t: 'Cut rosters to 48 players', ok: () => +rules().proRoster === 53, go: () => setRule('proRoster', 48), sup: 52, fx: { own: 3, union: -6 } },
  r53: { lvl: 'nfl', t: 'Restore 53-player rosters', ok: () => +rules().proRoster !== 53, go: () => setRule('proRoster', 53), sup: 60, fx: { own: -2, union: 5 } },
  kick: { lvl: 'nfl', t: 'A new kickoff rule to cut high-speed collisions', flag: 'kick', sup: 64, fx: { fan: -1, safety: 8 } },
  hip: { lvl: 'nfl', t: 'Ban the hip-drop tackle', flag: 'hip', sup: 58, fx: { safety: 6, union: 2 } },
  replay: { lvl: 'any', t: 'Expand replay review to more penalties', flag: 'replay', sup: 56, fx: { refQ: 10, fan: 2 } },
  intl: { lvl: 'nfl', t: 'Play more games overseas', flag: 'intl', sup: 62, fx: { rev: 0.4, fan: 2, union: -2 } },
  prime: { lvl: 'nfl', t: 'Add another prime-time game each week', flag: 'prime', sup: 66, fx: { rev: 0.5, union: -3, safety: -2 } },
  lottery: { lvl: 'nfl', t: 'A draft lottery for teams that miss the playoffs', flag: 'lottery', sup: 46, fx: { fan: 2, own: -1 } },
  elig: { lvl: 'nfl', t: 'Let players enter the draft two years after high school', flag: 'elig', sup: 40, fx: { union: 4, own: -2, fan: 1 } },
  cfp14: { lvl: 'col', t: 'Grow the playoff to 14 teams', ok: () => +rules().cfp === 12, go: () => setRule('cfp', 14), sup: 62, fx: { rev: 0.15, fan: 2, union: -1 } },
  cfp16: { lvl: 'col', t: 'Grow the playoff to 16 teams', ok: () => +rules().cfp === 14, go: () => setRule('cfp', 16), sup: 55, fx: { rev: 0.15, fan: 2, union: -2 } },
  otsdc: { lvl: 'col', t: 'College overtime: sudden death', ok: () => rules().otCol !== 'sudden', go: () => setRule('otCol', 'sudden'), sup: 35, fx: { fan: -1, safety: 2 } },
  r85: { lvl: 'col', t: 'Go back to 85 scholarships', ok: () => +rules().roster === 105, go: () => setRule('roster', 85), sup: 48, fx: { own: 3, union: -5 } },
  transfer: { lvl: 'col', t: 'Limit transfers to one window a year', flag: 'transfer', sup: 64, fx: { own: 3, union: -4 } },
  target: { lvl: 'col', t: 'Tougher targeting penalties', flag: 'target', sup: 66, fx: { safety: 7, fan: -1 } },
  five: { lvl: 'col', t: 'Five years to play five seasons', flag: 'five', sup: 50, fx: { union: 5, own: -1, fan: 1 } },
};
const CM_HOSTS = { nfl: [['Las Vegas', 0.25, 1, 0], ['Miami', 0.2, 2, 0.1], ['New Orleans', 0.18, 3, 0], ['Minneapolis', 0.15, 0, 0.3], ['Los Angeles', 0.24, 2, 0], ['Atlanta', 0.17, 1, 0], ['Phoenix', 0.18, 1, 0]], col: [['Atlanta', 0.2, 2, 0], ['Arlington', 0.23, 1, 0], ['Miami Gardens', 0.2, 1, 0.1], ['Indianapolis', 0.17, 2, 0.2], ['Pasadena', 0.2, 3, 0], ['Houston', 0.19, 1, 0]] };
function cmOffseason() {
  if (!isComm()) return; const c = cm2(); if (c.offS === state.season) return; c.offS = state.season; const nfl = cmLvl() === 'nfl';
  // let go of anything left from the season
  c.items.filter(x => !x.agenda).forEach(x => cmResolve(x.id, cmStaffK(x), true));
  c.susp.forEach(s => { if (s.d) { const t = T(s.tid); if (t) t.rating = r1(t.rating + s.d); s.d = 0; } }); c.susp = [];
  cmReview();
  if (state.gameOver) return;
  const h = k => hash((state.seed || 0) + ':cmo:' + state.season + ':' + k);
  if (nfl) {
    const opts = [[0, 'No increase'], [3, '+3%'], [5.5, '+5.5% (normal)'], [8, '+8%'], [12, '+12%']].map(([v, l]) => ['c' + v, `${l}: ${fmM(r1(proCap(state.season) * (1 + v / 100)))}`, v < 5.5 ? 'Owners happy, players angry.' : v > 5.5 ? 'Players happy, owners pay.' : 'What everyone expects.']);
    cmPost({ kind: 'cap', agenda: true, title: `The ${state.season + 1} salary cap`, txt: `This season's cap is ${fmM(proCap(state.season))}. The salary floor is 89% of the cap.`, opts, def: 2 });
    if (c.cba && c.cba.until <= state.season + 1) cmPost({ kind: 'cba', agenda: true, title: 'The labor deal is expiring', txt: `The collective bargaining agreement with the players runs out after ${c.cba.until}. Players get ${c.cba.share}% of revenue now. Make your offer.`, opts: [['owners', 'Owner-friendly: 47% for players, longer rookie deals', 'The union will probably say no.'], ['middle', 'Middle ground: 48.5%, fewer padded practices', 'A fair shot at a deal.'], ['players', 'Player-friendly: 50%, shorter rookie deals', 'An easy yes from the union.'], ['lockout', 'Let it expire and lock the players out', 'Leverage, at a cost.']], def: 1 });
    if ((c.share || 50) && h('sh') < 0.35) cmPost({ kind: 'share', agenda: true, title: 'Revenue sharing review', txt: `Teams share ${c.share}% of league revenue. Big-market owners want less; small-market owners want more.`, opts: [['up', 'Share more (+10%)', 'More balance, big markets grumble.'], ['keep', 'Keep it where it is', ''], ['down', 'Share less (−10%)', 'Big markets cheer, small ones struggle.']], def: 1 });
    if (h('sale') < 0.3) { const t = cmPick(cmTeams(), 'sale' + state.season); if (t) cmPost({ kind: 'sale', agenda: true, title: `${cmTName(t.id)} are for sale`, txt: `The owners of the ${cmTName(t.id)} are selling. Three groups want the team. The league has to approve the buyer.`, opts: [['deep', 'A tech billionaire with deep pockets', 'Will spend whatever it takes.'], ['local', 'A local family business', 'The fans\' favorite.'], ['shady', 'An investor with a shaky past (biggest bid)', 'The most money for the sellers.']], def: 1, data: { tid: t.id } }); }
    if (h('rel') < 0.2) { const t = cmPick(cmTeams().filter(x => !(c.reloc || {})[x.id]), 'rel' + state.season); const city = ['San Antonio', 'Portland', 'St. Louis', 'Toronto', 'Salt Lake City', 'Oklahoma City', 'San Diego'][Math.floor(h('rc') * 7)]; if (t) cmPost({ kind: 'reloc', agenda: true, title: `${cmTName(t.id)} want to move`, txt: `The ${cmTName(t.id)} say they will move to ${city} unless they get a new stadium.`, opts: [['move', `Approve the move to ${city}`, 'A new market; old fans are crushed.'], ['stadium', 'Push the city for a new stadium', 'The team stays; it costs the league.'], ['block', 'Block the move', 'Fans cheer; owners don\'t.']], def: 1, data: { tid: t.id, city } }); }
    if (state.season % 4 === 0 || !c.pbS) cmPost({ kind: 'pb', agenda: true, title: 'The Pro Bowl format', txt: 'The all-star game needs a format for the next few years.', opts: [['classic', 'A full-contact game', 'Players hate the injury risk.'], ['skills', 'Skills contests', 'Fun and safe.'], ['flag', 'Flag football and skills events', 'The most popular option.'], ['scrap', 'Cancel it', 'Saves money; fans miss it.']], def: 2 });
  } else {
    if (state.season % 3 === 0 || !c.nilS) cmPost({ kind: 'nil', agenda: true, title: 'NIL rules', txt: `How much schools and boosters can pay players. Now: ${{ open: 'open market', guard: 'guardrails', strict: 'strict limits' }[c.nil || 'guard']}.`, opts: [['open', 'An open market', 'Athletes love it; the rich get richer.'], ['guard', 'Guardrails: a cap per school', 'A middle path.'], ['strict', 'Strict limits', 'Presidents love it; athletes don\'t.']], def: 1 });
    if (state.season % 3 === 1 || c.athS == null) cmPost({ kind: 'ath', agenda: true, title: 'Revenue sharing with athletes', txt: `Schools now share ${c.athShare ? '+' + c.athShare + '% more than the base' : 'the base amount'} with athletes.`, opts: [['up', 'Share 5% more', 'Athletes +, presidents −.'], ['keep', 'Keep it', ''], ['down', 'Share 5% less', 'Presidents +, athletes −.']], def: 1 });
    if (state.season % 4 === 2 || !c.splitS) cmPost({ kind: 'split', agenda: true, title: 'Splitting the playoff money', txt: `Now: ${c.cfpSplit === 'even' ? 'an even split' : 'most of it to the power conferences'}.`, opts: [['power', 'Most of it to the power conferences', 'Power schools get stronger.'], ['even', 'Split it more evenly', 'More balance; power schools push back.']], def: 0 });
    commDesk(); (c.desk || []).forEach(d => cmPost({ kind: 'req', agenda: true, title: d.kind === 'cfp' ? 'Playoff expansion request' : 'Realignment request', txt: d.txt, opts: [['yes', 'Approve', ''], ['no', 'Turn it down', '']], def: 1, data: { did: d.id, d } }));
  }
  if (c.tv && c.tv.until <= state.season) cmPost({ kind: 'tvdeal', agenda: true, title: nfl ? 'New TV rights deals' : 'New media rights deal', txt: 'The current deal is up. Three offers are on the table.', opts: [['broad', 'Broadcast networks: the biggest audience', '+fans, steady money.'], ['split', 'A mix of networks and streaming', 'Balanced.'], ['stream', 'Streaming: the most money', '+money, fewer viewers.']], def: 1 });
  // the rules committee: two proposals from the pool that fit this league and today's rules
  const props = Object.entries(CM_PROPS).filter(([k, p]) => (p.lvl === cmLvl() || p.lvl === 'any') && (p.ok ? p.ok() : !(c.flags || {})[p.flag])).sort((a, b) => h('p' + a[0]) - h('p' + b[0])).slice(0, 2);
  props.forEach(([k, p]) => cmPost({ kind: 'prop', agenda: true, title: `Rules committee: ${p.t}`, txt: `About ${p.sup}% of ${nfl ? 'owners' : 'conference presidents'} are inclined to support it. It needs ${nfl ? '75% (24 of 32 owners)' : '60%'}.`, opts: [['push', 'Lobby hard for it', 'Better odds; a loss costs you.'], ['vote', 'Put it to a vote', ''], ['table', 'Table it', '']], def: 2, data: { pk: k } }));
  // the Hall of Fame class
  const H = lgHistOf(); const past = (nfl ? H.nfl : H.col).filter(e => e.s <= state.season - 3).map(e => nfl ? e.mvp : e.heis).filter(Boolean).filter(x => !(c.hof || []).some(y => y.n === x.n));
  const noms = past.slice(0, 3).map(x => ({ n: x.n, pos: x.pos, why: nfl ? 'League MVP' : 'Heisman Trophy winner' }));
  const used = new Set(noms.map(x => x.n).concat((c.hof || []).map(x => x.n))); const POS9 = ['QB', 'WR', 'DE', 'LB', 'RB', 'CB', 'OL', 'S', 'TE'];
  for (let i = 0; noms.length < 5 && i < 60; i++) { const n = cRecName((state.seed || 0) + ':hof:' + state.season + ':' + i); if (used.has(n)) continue; used.add(n); noms.push({ n, pos: POS9[i % POS9.length], why: ['A record-setting career', 'A two-time champion', 'Ten straight all-star seasons', 'A league leader for a decade', 'The best of his era'][i % 5] }); }
  cmPost({ kind: 'hof', agenda: true, title: `The ${state.season + 1} Hall of Fame class`, txt: 'Pick up to three nominees to induct.', opts: [['auto', 'Induct the top two', '']], def: 0, data: { noms } });
  const hc = CM_HOSTS[cmLvl()].slice().sort((a, b) => h('hc' + a[0]) - h('hc' + b[0])).slice(0, 3);
  cmPost({ kind: 'host', agenda: true, title: `Host city for the ${state.season + 2} ${nfl ? 'Super Bowl' : 'national championship game'}`, txt: 'Three cities have bid.', opts: hc.map(x => [x[0], x[0], `${fmB(x[1] * (nfl ? 1 : 0.15))} for the league${x[3] ? ', a weather risk' : ''}${x[2] >= 2 ? ', a fan favorite' : ''}`]), def: 0, data: { hosts: hc } });
  if (!c.flags.bet && !c.flags.betNo && h('gam') < 0.4) cmPost({ kind: 'bet', agenda: true, title: 'A betting partnership', txt: 'A sportsbook offers the league a big sponsorship deal.', opts: [['yes', 'Take the deal', '+money every year; integrity risk.'], ['no', 'Turn it down', 'Integrity first.']], def: 1 });
  const L5 = (nfl ? H.nfl : H.col).slice(-3); if (L5.length === 3 && L5.every(e => e.champ && e.champ === L5[0].champ)) cmPost({ kind: 'dyn', agenda: true, title: 'Dynasty concerns', txt: `${(nfl ? lhNflName : lhColName)(L5[0].champ)} have won three straight titles. Ratings outside their market are slipping.`, opts: [['share', nfl ? 'Tighten revenue sharing' : 'Split the playoff money more evenly', 'More balance.'], ['lottery', nfl ? 'Add a draft lottery for the worst teams' : 'Cap NIL spending', 'Help the bottom.'], ['none', 'Let greatness be great', 'Some fans tune out.']], def: 2 });
}
function cmCba(it, k) {
  const c = cm2(); const acc = { owners: 0.25, middle: 0.6, players: 0.92 }[k]; const p = acc == null ? 0 : clamp(acc + (c.m.union - 55) / 150, 0.05, 0.98);
  const deal = (share, fx) => { c.cba = { until: state.season + 7, share }; cmFx(fx); };
  if (k === 'lockout') return cmLockout();
  if (cmH('cba' + it.id) < p) { deal({ owners: 47, middle: 48.5, players: 50 }[k], { owners: { own: 6, union: -6 }, middle: { own: 1, union: 2 }, players: { own: -6, union: 7, rev: -0.3 } }[k]); cmLog(`The players accept a new labor deal through ${state.season + 7}.`, true); return 'A new labor deal is signed.'; }
  cmPost({ kind: 'cba2', agenda: true, title: 'The union says no', txt: 'The players turned down your offer. Their counter: 50% of revenue and fewer padded practices.', opts: [['accept', 'Accept their counter', 'Labor peace; owners are unhappy.'], ['lockout', 'Lock them out', 'A work stoppage.']], def: 0 });
  return 'The union said no.';
}
function cmLockout() { const c = cm2(); c.peace = 0; c.stop = state.season; c.stops = (c.stops || 0) + 1; cmFx({ rev: -2, fan: -10, union: -10, own: 2, integ: -2 }); c.cba = { until: state.season + 7, share: 48.5 }; cmLog('A lockout wipes out training camp and the preseason before a middle-ground deal is signed.', true); return 'The lockout ended with a middle-ground deal.'; }
function cmReview() {
  const c = cm2(); const nfl = cmLvl() === 'nfl'; const H = lgHistOf(); const last = (nfl ? H.nfl : H.col).slice(-1)[0];
  const g = 0.01 + (c.tv ? c.tv.g : 0.04) + (c.m.fan - 60) / 2000 + (c.flags.intl ? 0.01 : 0) + (c.flags.prime ? 0.01 : 0); c.rev = r2(c.rev * (1 + g) + (c.flags.bet ? (nfl ? 0.5 : 0.05) : 0));
  if (c.stop !== state.season) c.peace = (c.peace || 0) + 1;
  // the meters drift back toward the middle every year, owners expect growth, and fans expect more every season
  Object.keys(c.m).forEach(k => { c.m[k] = Math.round(c.m[k] + (55 - c.m[k]) * 0.15); });
  cmFx({ own: Math.round((g * 100 - 5) * 1.5), fan: -2 });
  const legacy = cmLegacy(); const top = (c.log || []).filter(x => x.s === state.season).slice(0, 3).map(x => x.txt);
  c.yrs.push({ s: state.season, m: Object.assign({}, c.m), rev: c.rev, champ: last && last.s === state.season ? last.champ : null, legacy, top }); if (c.yrs.length > 60) c.yrs.shift();
  cmAch();
  // your term: the owners (or presidents) vote at the end of every five seasons, and can vote you out any time things fall apart
  const sec = { patient: [15, 42], normal: [20, 50], strict: [28, 56] }[rules().security] || [20, 50]; const end = c.term.start + 5 * c.term.n - 1; const who = nfl ? 'owners' : 'university presidents';
  if (c.m.own < sec[0]) { state.gameOver = { reason: `The ${who} voted no confidence in you after the ${state.season} season. You have been replaced as commissioner. Your legacy score: ${legacy}.` }; return; }
  if (state.season >= end) { const sup = Math.round(c.m.own * 0.75 + legacy * 0.25 + (hash((state.seed || 0) + ':vote:' + state.season) - 0.5) * 8); c.lastVote = { s: state.season, sup };
    if (sup >= sec[1]) { c.term.n++; cmLog(`The ${who} re-elect you to another five-year term (${Math.min(99, sup)}% support).`, true); }
    else state.gameOver = { reason: `Your term ended and the ${who} did not renew it (${sup}% support, ${sec[1]}% needed). You have been replaced as commissioner. Your legacy score: ${legacy}.` }; }
}
function cmLegacy() { const c = cm2(); const avg = (c.m.own + c.m.fan + c.m.union + c.m.integ) / 4; return clamp(Math.round(avg * 0.6 + clamp((c.rev / (c.rev0 || c.rev) - 1) * 40, -20, 40) + Math.min(c.peace || 0, 15) + Object.keys(c.ach || {}).length * 3 - (c.stops || 0) * 6), 0, 150); }
const CM_ACH = {
  peace10: ['Labor peace', 'Ten straight seasons without a work stoppage.'], rev2: ['Doubled it', 'League revenue doubled on your watch.'], bet: ['Survived a betting scandal', 'Handled a betting scandal without it becoming a crisis.'],
  term2: ['Re-elected', 'Won a second term.'], term3: ['Three terms', 'Won a third term.'], integ90: ['Above reproach', 'Integrity of 90 or more at the end of a season.'], fan90: ['Fans love the league', 'Fans at 90 or more at the end of a season.'],
  bal5: ['Parity', 'Five different champions in five seasons.'], tough: ['Law and order', 'Handed down 60 suspensions.'], hof10: ['Keeper of history', 'Inducted 20 Hall of Famers.'], calm5: ['Steady hand', 'Five seasons in a row without a crisis.'],
};
function cmAch() {
  const c = cm2(); const got = k => { if (!c.ach[k]) { c.ach[k] = state.season; cmLog(`Achievement: ${CM_ACH[k][0]}.`, true); } }; const H = lgHistOf(); const L = (cmLvl() === 'nfl' ? H.nfl : H.col).slice(-5);
  if ((c.peace || 0) >= 10) got('peace10'); if (c.rev >= (c.rev0 || c.rev) * 2) got('rev2'); if ((c.betHandled || 0) && c.crisis !== state.season) got('bet');
  if (c.term.n >= 2) got('term2'); if (c.term.n >= 3) got('term3'); if (c.m.integ >= 90) got('integ90'); if (c.m.fan >= 90) got('fan90');
  if (L.length === 5 && new Set(L.map(e => e.champ)).size === 5) got('bal5'); if ((c.suspN || 0) >= 60) got('tough'); if ((c.hof || []).length >= 20) got('hof10');
  if (c.yrs.length >= 5 && !(c.crisis && c.crisis > state.season - 5)) got('calm5');
}

/* ---------- answering an item ---------- */
function cmResolve(id, k, auto) {
  const c = cm2(); const it = c.items.find(x => x.id === id); if (!it) return null; if (!it.opts.some(o => o[0] === k) && it.kind !== 'hof') return null;
  c.items = c.items.filter(x => x !== it); let msg = '';
  if (auto && (it.kind === 'inc' || it.kind === 'tv')) cmFx({ integ: -1 }); if (auto && it.agenda) cmFx({ own: balOn() ? (hmix(state.seed + ':cmauto:' + it.id) < 0.5 * sbx('deleg') ? -1 : 0) : -2 }); /* your staff decided it for you (Updated balance: a smaller cost, BAL-15) */
  switch (it.kind) {
    case 'inc': msg = cmDiscipline(it, k); break;
    case 'appeal': msg = cmAppeal(it, k); break;
    case 'tv': msg = cmTeamPenalty(it, k); break;
    case 'story': msg = cmStoryAnswer(it, k); break;
    case 'press': msg = cmPress(it, k); break;
    case 'emerg': msg = cmEmerg(it, k); break;
    case 'award': cmFx({ fan: k === 'co' ? -1 : 1 }); msg = k === 'co' ? 'Co-winners it is.' : `${it.data[k]} wins it.`; cmLog(`${it.title.split(':')[0]}: ${msg}`); break;
    case 'cap': { const v = +k.slice(1); const st = state.settings; rules(); st.rules.capA = { yr: state.season + 1, cap: r1(proCap(state.season) * (1 + v / 100)) }; cmFx(v === 0 ? { union: -8, own: 4 } : v === 3 ? { union: -3, own: 2 } : v === 8 ? { union: 3, own: -2 } : v === 12 ? { union: 6, own: -5, rev: -0.2 } : {}); c.capLog = c.capLog || []; c.capLog.push({ s: state.season + 1, pct: v, cap: st.rules.capA.cap }); msg = `The ${state.season + 1} cap is ${fmM(st.rules.capA.cap)}.`; cmLog(msg); break; }
    case 'cba': msg = cmCba(it, k); break;
    case 'cba2': msg = k === 'accept' ? (c.cba = { until: state.season + 7, share: 50 }, cmFx({ own: -5, union: 5 }), cmLog('You accept the union\'s counter: a new labor deal is signed.', true), 'Deal signed.') : cmLockout(); break;
    case 'share': c.share = clamp((c.share || 50) + (k === 'up' ? 10 : k === 'down' ? -10 : 0), 20, 80); cmFx(k === 'up' ? { own: -3, fan: 2 } : k === 'down' ? { own: 3, fan: -2 } : {}); msg = `Revenue sharing: ${c.share}%.`; if (k !== 'keep') cmLog(msg); break;
    case 'sale': { const tid = it.data.tid; c.owners[tid] = { k, s: state.season }; cmFx({ deep: { own: 1 }, local: { fan: 3 }, shady: { own: 3, integ: -5, rev: 0.2 } }[k]); if (k === 'shady') c.flags.shady = tid; msg = `The sale of the ${cmTName(tid)} is approved.`; cmLog(msg + ' ' + { deep: 'The new owner has deep pockets.', local: 'A local family takes over.', shady: 'The new owner has a shaky past.' }[k]); break; }
    case 'reloc': { const d = it.data; if (k === 'move') { c.reloc[d.tid] = d.city; cmSyncNames(); cmFx({ fan: -5, own: 3, rev: 0.3 }); msg = `The team moves to ${d.city}.`; } else if (k === 'stadium') { cmFx({ rev: -0.1, fan: 3, own: 1 }); msg = 'The team stays, with a new stadium on the way.'; } else { cmFx({ own: -5, fan: 2 }); msg = 'You block the move.'; } cmLog(msg, k === 'move'); break; }
    case 'pb': c.pbS = state.season; c.pb = k; cmFx({ classic: { union: -2 }, skills: { fan: 1 }, flag: { fan: 3, union: 2 }, scrap: { fan: -3, own: 1, rev: -0.05 } }[k]); msg = 'All-star format set.'; break;
    case 'nil': c.nilS = state.season; c.nil = k; cmFx({ open: { union: 5, own: -3, fan: 1 }, guard: { own: 1 }, strict: { union: -6, own: 4, integ: 1 } }[k]); msg = 'NIL rules set.'; cmLog(`NIL rules: ${{ open: 'an open market', guard: 'guardrails', strict: 'strict limits' }[k]}.`); break;
    case 'ath': c.athS = state.season; c.athShare = (c.athShare || 0) + (k === 'up' ? 5 : k === 'down' ? -5 : 0); cmFx(k === 'up' ? { union: 5, own: -3, rev: -0.05 } : k === 'down' ? { union: -5, own: 3 } : {}); msg = 'Athlete revenue sharing set.'; break;
    case 'split': c.splitS = state.season; c.cfpSplit = k; cmFx(k === 'even' ? { own: -3, fan: 2 } : { own: 2, fan: -1 }); msg = 'Playoff money split set.'; break;
    case 'req': { msg = commAnswer(it.data.did, k === 'yes') || ''; if (!msg && it.data.d) { c.desk = [it.data.d]; msg = commAnswer(it.data.did, k === 'yes') || ''; } cmFx(k === 'yes' ? { own: 1 } : { own: -1 }); break; }
    case 'prop': { const p = CM_PROPS[it.data.pk]; if (k === 'table') { msg = 'Tabled.'; break; } const need = cmLvl() === 'nfl' ? 75 : 60; const sup = Math.round(p.sup + (c.m.own - 50) * 0.4 + (k === 'push' ? 12 : 0) + (cmH('pv' + it.id) - 0.5) * 16);
      if (sup >= need) { if (p.go) p.go(); else c.flags[p.flag] = state.season; cmFx(p.fx); msg = `Passed with ${Math.min(100, sup)}%: ${p.t.toLowerCase()}.`; c.cmt = c.cmt || []; c.cmt.unshift({ s: state.season, t: p.t, ok: true, sup }); }
      else { if (k === 'push') cmFx({ own: -2 }); msg = `Failed with ${Math.max(0, sup)}%: ${p.t.toLowerCase()}.`; c.cmt = c.cmt || []; c.cmt.unshift({ s: state.season, t: p.t, ok: false, sup }); }
      cmLog('Rules committee: ' + msg); break; }
    case 'hof': { const pick = (k === 'auto' ? [0, 1] : String(k).split(',').map(Number)).filter(i => it.data.noms[i]).slice(0, 3); pick.forEach(i => c.hof.push(Object.assign({ s: state.season + 1 }, it.data.noms[i]))); cmFx({ fan: pick.length }); msg = pick.length ? `${pick.map(i => it.data.noms[i].n).join(', ')} ${pick.length > 1 ? 'are' : 'is'} inducted into the Hall of Fame.` : 'No class this year.'; cmLog(msg); break; }
    case 'host': { const x = it.data.hosts.find(y => y[0] === k) || it.data.hosts[0]; const bad = x[3] && cmH('hw' + it.id) < x[3] * 2; cmFx({ rev: x[1], fan: bad ? -2 : x[2] }); (c.hosts = c.hosts || []).push({ s: state.season + 2, city: x[0] }); msg = `${x[0]} will host.${bad ? ' The forecast already worries people.' : ''}`; cmLog(msg); break; }
    case 'bet': if (k === 'yes') { c.flags.bet = state.season; cmFx({ rev: 0.5, integ: -3 }); msg = 'The league signs a betting partnership.'; } else { c.flags.betNo = state.season; cmFx({ integ: 1 }); msg = 'You turn the sportsbook down.'; } cmLog(msg); break;
    case 'dyn': if (k === 'share') { if (cmLvl() === 'nfl') c.share = Math.min(80, (c.share || 50) + 10); else c.cfpSplit = 'even'; cmFx({ own: -3, fan: 2 }); } else if (k === 'lottery') { if (cmLvl() === 'nfl') c.flags.lottery = state.season; else c.nil = 'guard'; cmFx({ fan: 2, own: -1 }); } else cmFx({ fan: -2 }); msg = 'Noted.'; break;
  }
  if (it.kind === 'tvdeal') { const d = { broad: [0.03, { fan: 3 }], split: [0.04, { fan: 1 }], stream: [0.055, { fan: -2, rev: 0.2 }] }[k] || [0.04, {}]; c.tv = { until: state.season + 5, k, g: d[0] }; cmFx(d[1]); msg = 'A new five-year media deal is signed.'; cmLog(`Media rights: ${{ broad: 'broadcast networks', split: 'networks and streaming', stream: 'streaming' }[k] || k}, through ${state.season + 5}.`, true); }
  return msg || 'Done.';
}
function cmAutoAll() { const c = cm2(); let n = 0; while (c.items.length && n++ < 60) { const x = c.items[0]; cmResolve(x.id, cmStaffK(x), true); } }
/* ---------- QOL-09 / DT-03: decision previews and a balanced staff ----------
   A preview tries each answer on a throwaway copy of the save and reads how the meters move. Nothing in the real save
   changes, and the copy uses a shifted random stream, so a preview shows the likely effect, not a guaranteed outcome. */
const CM_PV = new Map();
function cmTrial(fn) {
  const s0 = state, r0 = RNG.s, me0 = ME, pm0 = PMAP, ui0 = Object.assign({}, ui), nfl0 = NFL.slice(), nflJ = nfl0.map(o => JSON.stringify(o));
  try { state = JSON.parse(JSON.stringify(state)); rebuildPMap(); /* players looked up by id must be the copy's too */ RNG.s = ((r0 ^ 0x5bd1e995) >>> 0) || 1; return fn(); } catch (e) { return null; }
  finally { state = s0; PMAP = pm0; RNG.s = r0; ME = me0; if (typeof rebuildConfs === 'function') try { rebuildConfs(); } catch (e) { } /* conference lists follow the real save again */ Object.keys(ui).forEach(k => { if (!(k in ui0)) delete ui[k]; }); Object.assign(ui, ui0);
    NFL.length = 0; nfl0.forEach((o, i) => { Object.keys(o).forEach(k => delete o[k]); Object.assign(o, JSON.parse(nflJ[i])); NFL.push(o); }); }
}
const CM_M = ['own', 'fan', 'union', 'integ'];
function cmPreview(it) {
  if (!it || it.kind === 'hof' || !Array.isArray(it.opts)) return null; const c = cm2();
  const key = (state.seed || 0) + ':' + it.id + ':' + state.season + ':' + state.week + ':' + JSON.stringify(c.m) + ':' + c.rev;
  if (CM_PV.has(key)) return CM_PV.get(key); if (CM_PV.size > 200) CM_PV.clear();
  const out = {}; it.opts.forEach(([k]) => { out[k] = cmTrial(() => { const a = cm2(); const m0 = Object.assign({}, a.m), rv0 = a.rev; cmResolve(it.id, k, false); const b = cm2(); const fx = {};
    CM_M.forEach(q => { const d = (b.m[q] || 0) - (m0[q] || 0); if (d) fx[q] = d; }); const dr = b.rev - rv0; if (Math.abs(dr) > 0.0001) fx.rev = r2(dr / (cmLvl() === 'nfl' ? 1 : 0.15)); return fx; }); });
  CM_PV.set(key, out); return out;
}
// the staff's answer: the default, or (Updated balance) the answer that keeps the lowest meter highest
function cmStaffK(it) {
  const def = it.opts[it.def || 0][0]; if (!balOn() || it.kind === 'hof') return def; const pv = cmPreview(it); if (!pv) return def; const c = cm2();
  const score = k => { const fx = pv[k]; if (!fx) return -1e9; const after = CM_M.map(q => (c.m[q] || 0) + (fx[q] || 0)); return Math.min(...after) * 10 + after.reduce((s, v) => s + v, 0) / 4 + (k === def ? 0.5 : 0); };
  return it.opts.map(o => o[0]).reduce((b, k) => (score(k) > score(b) ? k : b), def);
}
function cmRef(k) {
  const c = cm2(); c.refAct = c.refAct || {}; const a = c.refAct[state.season] = c.refAct[state.season] || {}; if (a[k]) return false; a[k] = 1;
  if (k === 'fire') cmFx({ refQ: 6, own: -1 }); else if (k === 'train') cmFx({ refQ: 4, rev: -0.05 }); else return false; cmLog(k === 'fire' ? 'You fire the lowest-graded officiating crew.' : 'You fund a new training program for officials.'); return true;
}
// relocated NFL teams keep their new city after a reload, and another save never inherits it
let NFL_BY0 = null;
function cmSyncNames() {
  if (typeof nflLeagueSync === 'function') nflLeagueSync();
  if (typeof NFL_BY === 'undefined') return; if (!NFL_BY0) { NFL_BY0 = {}; Object.keys(NFL_BY).forEach(id => { NFL_BY0[id] = NFL_BY[id].name; }); }
  Object.keys(NFL_BY0).forEach(id => { NFL_BY[id].name = NFL_BY0[id]; });
  const R_ = state && state.comm && state.comm.reloc; if (!R_) return;
  Object.entries(R_).forEach(([id, city]) => { if (NFL_BY[id]) { NFL_BY[id].name = city + ' ' + NFL_BY[id].nick; if (state.lvl === 'nfl' && state.teams[id]) state.teams[id].name = NFL_BY[id].name; } });
}
// a new commissioner career, college or NFL; the engine's own team runs itself and is never shown
function newComm2(o) {
  o = o || {}; const lvl = o.lvl === 'nfl' ? 'nfl' : 'col'; const sd = o.seed != null ? o.seed : null;
  const pickCol = () => { const ids = Object.keys(CTEAMS0_AD).filter(id => id !== 'MICH').sort(); return ids[Math.floor(hash(String(sd || Date.now()) + ':cmme') * ids.length)]; };
  newCommCareer({ tid: pickCol(), seed: sd, diff: o.diff });
  if (lvl === 'nfl') { const tid = NFL[Math.floor(hash(String(state.seed) + ':cmnfl') * NFL.length)].id; goPro(tid, { role: 'gm' }); state.kind = 'comm'; state.settings.noFire = true; const A = autoSet(); Object.keys(AUTO_DEFS).forEach(k => { A[k] = true; }); proAutoOffseason(); }
  const c = commOf(); c.v2 = 0; c.since = state.season; cm2(); c.lvl = lvl; state.news = []; c.log = [];
  cmLog(lvl === 'nfl' ? 'You are the commissioner of the NFL.' : 'You are the commissioner of college football.', true);
  return c;
}

function commSlotSummary() { const c = cm2(); const nfl = isPro(); return { lvl: nfl ? 'nfl' : undefined, comm: nfl ? 'nfl' : 'col', name: 'Commissioner · ' + (nfl ? 'NFL' : 'College football'), season: state.season, phase: state.phase, rec: `term ${c.term.n}`, legacy: cmLegacy(), diff: state.settings.diff, seasons: (c.yrs || []).length, fired: !!state.gameOver, saved: Date.now() }; }

