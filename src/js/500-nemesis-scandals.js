/* ===================== v9.57: your nemesis, and scandals you can cause =====================
 * NEMESIS (athletic director and NFL general manager). The game already has three or four rival front offices
 * (rxStore). One of them is now a person who lasts your whole career: the same name and style wherever you go,
 * a memory of what happened between you, and moves aimed at you. If you change jobs he turns up at a rival of
 * the new one. He lives in state.nem and takes over the first seat of the rivals list.
 * SCANDALS (college athletic director, fictional players only). Three temptations with a real short-term gain.
 * Each one raises the NCAA risk meter the game already has, and is remembered in X().dirt. If the end-of-season
 * investigation finds something while a secret is live, you choose how to answer. Old saves need none of this. */

/* ---------- the nemesis ---------- */
const nemOn = () => !!(state && appMode !== 'career' && !isComm() && !isCoach() && !(typeof isOwner === 'function' && isOwner()) && state.teams && T(ME));
const NEM_MEM = 40;
function nemNote(N, t, tone) { N.mem.unshift({ s: state.season, wk: state.phase === 'offseason' ? 0 : state.week, t, tone: tone || '' }); if (N.mem.length > NEM_MEM) N.mem.length = NEM_MEM; }
function nemSync() {
  if (!nemOn()) return null; const R_ = rxStore(); if (!R_.list.length) return null; const lvl = isPro() ? 'nfl' : 'col'; let N = state.nem;
  if (!N) { const e = R_.list[0]; N = state.nem = { name: e.name, style: e.style, id: e.id, lvl, me: ME, since: state.season, w: 0, l: 0, res: [], poached: 0, kept: 0, flipped: 0, held: 0, mem: [], pend: null }; nemNote(N, `${N.name} runs ${teamName(e.id)}. You are going to hear that name a lot.`); }
  let e = R_.list.find(r => r.id === N.id);
  if (!e || N.me !== ME || N.lvl !== lvl) { // you moved, or the rivals list was rebuilt: he takes the first seat
    e = R_.list[0]; const moved = N.me !== ME || N.lvl !== lvl; const from = N.id; N.id = e.id; N.me = ME; N.lvl = lvl; N.pend = null;
    if (moved && from !== e.id) { nemNote(N, `He left for ${teamName(e.id)} after you took the ${myName()} job.`); addNews(`${N.name} is the new ${lvl === 'nfl' ? 'general manager' : 'athletic director'} at ${teamName(e.id)}. He says the move has nothing to do with you.`); }
  }
  if (e.name !== N.name) { e.name = N.name; e.style = N.style; }
  return N;
}
const nemSeat = N => rxStore().list.find(r => r.id === N.id);
const nemHeat = N => { const e = nemSeat(N); return e ? e.heat : 0; };
const nemMood = N => { const h = nemHeat(N); return h < 0 ? 'Grudging respect' : h < 30 ? 'Rivals' : h < 60 ? 'Bad blood' : 'Open war'; };
const nemStreak = N => { let n = 0; for (const r of N.res) { if (r === N.res[0]) n++; else break; } return { n, win: N.res[0] === 'W' }; };
// what he says after you play each other: it depends on what has happened between you
function nemQuote(N, won, score) {
  const st = nemStreak(N); const T_ = teamName(N.id); const you = myName();
  if (won) return st.n >= 3 ? `"${st.n} in a row. I know the number. Everyone here knows the number," ${N.name} says after ${you} beats ${T_} again, ${score}.`
    : N.poached ? `"They coach well over there. They should. Half that staff was almost mine," ${N.name} says after losing to ${you}, ${score}.`
    : N.style === 'showman' ? `"Enjoy it. I will be saying something different next year," ${N.name} tells reporters after ${you} wins, ${score}.` : `${N.name} leaves without taking questions after ${you} beats ${T_}, ${score}.`;
  return st.n >= 3 ? `"${st.n} straight. At some point it stops being a rivalry," ${N.name} says after ${T_} beats ${you}, ${score}.`
    : N.flipped ? `"We recruit better and it shows on Saturdays," ${N.name} says. He has flipped ${N.flipped} of your recruits and just beat you ${score}.`
    : N.style === 'shark' ? `"I do not gloat. I just keep the receipts," ${N.name} says after ${T_} wins, ${score}.` : `"That is the program we are building, and that is the one they are," ${N.name} says after ${T_} beats ${you}, ${score}.`;
}
function nemWeek(wk, mg) {
  const N = nemSync(); if (!N) return; const e = nemSeat(N); const k = state.season + ':' + wk;
  // an unanswered offer to your coordinator is accepted when the season starts; an unanswered move on your recruit lands after two weeks
  if (N.pend && N.pend.k === 'poach' && state.phase === 'regular') nemResolve('poach', 'pass', true);
  if (N.pend && N.pend.k === 'flip' && (N.pend.s !== state.season || state.week - N.pend.wk >= 2)) nemResolve('flip', 'pass', true);
  if (mg && mg.done && (mg.h === N.id || mg.a === N.id)) {
    const mine = mg.h === ME ? mg.hs : mg.as, his = mg.h === ME ? mg.as : mg.hs; const won = mine > his; const score = Math.max(mine, his) + '-' + Math.min(mine, his);
    if (won) N.w++; else N.l++; N.res.unshift(won ? 'W' : 'L'); if (N.res.length > 12) N.res.length = 12;
    const q = nemQuote(N, won, score); nemNote(N, `${won ? 'You beat' : 'You lost to'} ${teamName(N.id)}, ${score}.`, won ? 'good' : 'bad'); addNews(q, won ? 'good' : 'bad'); try { feedBiz(q, !won); } catch (x) { }
    return;
  }
  // college, mid-season: he goes after the best recruit who is leaning your way
  if (!isPro() && !N.pend && state.phase === 'regular' && wk >= 5 && wk <= 10 && N.flipS !== state.season && state.rec && state.rec.list && xh('nemflip' + k) < 0.12 + Math.max(0, nemHeat(N)) / 400) {
    const r = state.rec.list.filter(x => x.offered && x.status === 'open' && x.star >= 4 && x.interest >= 55).sort((a, b) => b.star - a.star || b.interest - a.interest)[0];
    if (r) { N.flipS = state.season; N.pend = { k: 'flip', rid: r.id, n: r.n, pos: r.pos, star: r.star, s: state.season, wk: state.week, cost: r2(0.2 + r.star * 0.06) }; addNews(`${N.name} was at ${r.n}'s game on Friday night. ${teamName(N.id)} wants your ${r.star}-star ${r.pos}. Answer it from the Office.`, 'bad'); }
  }
}
{ const _w = rxWeek; rxWeek = function (wk, mg) { const r = _w.apply(this, arguments); try { nemWeek(wk, mg); } catch (e) { console.error(e); } return r; }; }
// once an offseason: the season's verdict, and sometimes a run at your coordinator
function nemOffseason() {
  const N = nemSync(); if (!N) return; if (N.offS === state.season) return; N.offS = state.season; const me = T(ME), him = T(N.id); if (!me || !him) return;
  const d = me.w - him.w; nemNote(N, d > 0 ? `You finished ${me.w}-${me.l}. He finished ${him.w}-${him.l}.` : d < 0 ? `He finished ${him.w}-${him.l}. You finished ${me.w}-${me.l}.` : `You both finished ${me.w}-${me.l}.`, d > 0 ? 'good' : d < 0 ? 'bad' : '');
  if (N.pend) return; const cand = ['OC', 'DC'].map(r => [r, state.staff && state.staff[r]]).filter(([, c]) => c && !c.me && !c.interim && (c.ovr || 0) >= 70).sort((a, b) => b[1].ovr - a[1].ovr)[0];
  if (cand && xh('nempoach' + state.season) < 0.2 + Math.max(0, nemHeat(N)) / 400 + (N.style === 'poacher' ? 0.12 : 0)) {
    const [role, c] = cand; N.pend = { k: 'poach', role, name: c.name, ovr: c.ovr, s: state.season, raise: r1(Math.max(0.2, (c.salary || 1) * 0.35)) };
    addNews(`${N.name} has offered your ${ROLE_TITLE[role] || role}, ${c.name}, a job at ${teamName(N.id)}. Answer it from the Office.`, 'bad');
  }
}
{ const _s = startOffseason; startOffseason = function () { const r = _s.apply(this, arguments); try { if (!isPro()) nemOffseason(); } catch (e) { console.error(e); } return r; }; }
{ const _p = proStartOffseason; proStartOffseason = function (fresh) { const r = _p.apply(this, arguments); try { if (!fresh) nemOffseason(); } catch (e) { console.error(e); } return r; }; }
// A coordinator who leaves is replaced from inside the building at once, so no job is ever empty mid-season.
function nemReplace(role) { const old = state.staff[role]; const c = genCandidates(role, 1)[0]; c.ovr = clamp((old.ovr || 72) - 7, 55, 90); c.bg = 'Promoted from within'; c.salary = r1(Math.max(0.25, (old.salary || 1) * 0.6)); c.years = 2; state.staff[role] = c; return c; }
function nemResolve(kind, how, quiet) {
  const N = state.nem; const P_ = N && N.pend; if (!P_ || P_.k !== kind) return ''; const e = nemSeat(N); const heat = d => { if (e) e.heat = clamp(e.heat + d, -50, 100); }; let msg = ''; N.pend = null;
  if (kind === 'poach') {
    const c = state.staff[P_.role]; if (!c || c.name !== P_.name) return 'He had already moved on.';
    const leave = why => { const nw = nemReplace(P_.role); N.poached++; mv('morale', -2); nemNote(N, `He hired ${P_.name} away from you.`, 'bad'); return `${P_.name} takes the job at ${teamName(N.id)}${why}. ${nw.name} is promoted to replace him.`; };
    if (how === 'match') { c.salary = r1((c.salary || 1) + P_.raise); c.years = Math.max(c.years || 1, 3); N.kept++; heat(5); nemNote(N, `He came for ${P_.name}. You paid to keep him.`, 'good'); msg = `${P_.name} stays, with a raise to $${c.salary}M a year.`; }
    else if (how === 'raid') { state.fin && state.fin.balance != null && (state.fin.balance -= 0.5); heat(15);
      if (R() < 0.5) { c.ovr = Math.min(95, (c.ovr || 72) + 2); N.kept++; nemNote(N, `He came for ${P_.name}. You kept him and hired one of his assistants instead.`, 'good'); msg = `${P_.name} stays, and one of ${N.name}'s best assistants joins his staff. ${N.name} is furious.`; }
      else msg = 'You went after his staff and came up empty. ' + leave(' anyway'); }
    else msg = leave('');
  } else if (kind === 'flip') {
    const r = state.rec && state.rec.list.find(x => x.id === P_.rid); if (!r || r.status !== 'open') return 'The recruit had already made up his mind.';
    const lose = () => { r.interest = clamp(r.interest - 15, 1, 99); r.lead = [N.id].concat((r.lead || []).filter(x => x !== N.id)).slice(0, 3); N.flipped++; nemNote(N, `He turned ${r.n}, your ${r.star}-star ${r.pos}, toward ${teamName(N.id)}.`, 'bad'); return `${r.n} now has ${teamName(N.id)} out in front.`; };
    if (how === 'nil') { state.fin.balance -= P_.cost; state.fin.ytd.eventx = (state.fin.ytd.eventx || 0) + P_.cost; r.interest = clamp(r.interest + 6, 1, 99); N.held++; heat(5); nemNote(N, `He came for ${r.n}. You answered with money and held on.`, 'good'); msg = `${r.n} hears your offer and stays with you. It cost $${P_.cost}M.`; }
    else if (how === 'visit' && state.rec.visits > 0) { state.rec.visits--; if (R() < 0.7) { r.interest = clamp(r.interest + 4, 1, 99); N.held++; heat(3); nemNote(N, `He came for ${r.n}. Your head coach went to the house and held on.`, 'good'); msg = `Your head coach spends the evening with ${r.n}'s family. He is still yours to lose.`; } else msg = 'The head coach made the trip. It was not enough. ' + lose(); }
    else msg = lose();
  }
  if (!quiet && msg) { try { jrAdd('nemesis', msg); } catch (x) { } } if (quiet && msg) addNews(msg, 'bad');
  return msg;
}
function nemPendHTML() {
  if (!nemOn()) return ''; const N = state.nem; const P_ = N && N.pend; if (!P_) return '';
  if (P_.k === 'poach') return `<section class="card decision" id="nempend" data-block="1"><div class="eyebrow">Decision needed · your nemesis</div><h2 class="h2">${esc(N.name)} wants your ${esc(ROLE_TITLE[P_.role] || P_.role)}</h2><p>${esc(teamName(N.id))} has offered ${esc(P_.name)} (${P_.ovr} overall) more money and a bigger title. He has not said no.</p>
    <div class="evopts"><button class="evopt" data-act="nemdo" data-k="poach" data-v="match"><b>Match it</b><span>A raise of $${P_.raise}M a year and a longer deal. He stays.</span></button><button class="evopt" data-act="nemdo" data-k="poach" data-v="raid"><b>Go after his staff instead</b><span>$0.5M. Even odds: you keep your man and take one of his, or you lose yours anyway.</span></button><button class="evopt" data-act="nemdo" data-k="poach" data-v="pass"><b>Let him go</b><span>You promote from within. The replacement is not as good.</span></button></div></section>`;
  return `<section class="card decision" id="nempend" data-block="1"><div class="eyebrow">Decision needed · your nemesis</div><h2 class="h2">${esc(N.name)} is after ${esc(P_.n)}</h2><p>${esc(teamName(N.id))} is making a hard push for your ${P_.star}-star ${P_.pos}. If you do nothing for two weeks, he will lean their way.</p>
    <div class="evopts"><button class="evopt" data-act="nemdo" data-k="flip" data-v="nil"><b>Answer with money</b><span>$${P_.cost}M from the reserve. He stays with you.</span></button><button class="evopt" data-act="nemdo" data-k="flip" data-v="visit"${state.rec && state.rec.visits > 0 ? '' : ' disabled'}><b>Send the head coach</b><span>Uses one official visit (${state.rec ? state.rec.visits : 0} left). Works about seven times in ten.</span></button><button class="evopt" data-act="nemdo" data-k="flip" data-v="pass"><b>Let it go</b><span>He cools on you and ${esc(teamName(N.id))} moves in front.</span></button></div></section>`;
}
function nemCardHTML() {
  const N = nemSync(); if (!N) return ''; const st = nemStreak(N); const him = T(N.id);
  const tone = t => (t === 'good' ? 'res-w' : t === 'bad' ? 'res-l' : 'muted');
  return `<section class="card" id="nemcard"><div class="head"><div><div class="eyebrow">Your nemesis · ${esc(nemMood(N))}</div><h2 class="h2">${esc(N.name)}</h2><p class="muted">${esc(isPro() ? 'General manager' : 'Athletic director')}, ${esc(teamName(N.id))} · ${esc(RX_STYLE[N.style].l)}${him ? ` · ${him.w}-${him.l} this season` : ''}</p></div><p class="hint">The same person for your whole career. If you change jobs, expect him to turn up across the field again. He remembers everything.</p></div>
   <div class="tiles"><div><span class="k">Head to head</span><span class="v">${N.w}-${N.l}</span>${st.n >= 2 ? `<span class="small muted">${st.win ? 'You have' : 'He has'} won ${st.n} straight</span>` : ''}</div><div><span class="k">Your staff</span><span class="v">${N.kept} kept · ${N.poached} lost</span></div>${isPro() ? '' : `<div><span class="k">Your recruits</span><span class="v">${N.held} held · ${N.flipped} lost</span></div>`}<div><span class="k">Since</span><span class="v">${N.since}</span></div></div>
   <div class="eyebrow mt">What has happened between you</div><ul class="plainlist small">${N.mem.slice(0, 12).map(m => `<li><span class="muted">${m.s}${m.wk ? ', week ' + m.wk : ''}</span> · <span class="${tone(m.tone)}">${esc(m.t)}</span></li>`).join('')}</ul></section>`;
}
{ const _v = vXRivals; vXRivals = function () { let x = ''; try { x = nemCardHTML(); } catch (e) { console.error(e); } return x + _v.apply(this, arguments); }; }
{ const w = f => function () { let x = ''; try { x = nemPendHTML() + dirtPendHTML(); } catch (e) { console.error(e); } return x + f.apply(this, arguments); }; vOffice = w(vOffice); vProOffice = w(vProOffice); }
{ const _a = rxAction; rxAction = function (id, k) { const ok = _a.apply(this, arguments); try { const N = state.nem; if (ok && N && N.id === id) nemNote(N, k === 'talk' ? 'You went after him in the press.' : 'You called him to clear the air.'); } catch (e) { } return ok; }; }

/* ---------- scandals you can cause ---------- */
const dirtBook = () => (X().dirt || (X().dirt = { acts: [], pend: null, hist: [] }));
function dirtAdd(k, t, risk) { const D = dirtBook(); D.acts.push({ s: state.season, wk: state.week, k, t }); state.meters.risk = clamp(state.meters.risk + risk, 0, 100); try { jrAdd('scandal', t); } catch (e) { } }
const dirtStar = () => POS_ORDER.flatMap(pos => (state.depth[pos] || []).slice(0, START[pos]).map(P)).filter(p => p && !p.real && !p.inj && !p.susp && p.ovr >= 80 && !['K', 'P', 'LS'].includes(p.pos));
const dirtRecruit = () => (state.rec && state.rec.list ? state.rec.list.filter(r => r.offered && r.status === 'open' && r.star >= 4 && r.interest < 75 && !r.bag) : []);
const dirtOk = () => !isPro() && !isCoach() && !isComm();
EVENT_DEFS.bagman = { w: 5, cond: () => dirtOk() && dirtRecruit().length > 0,
  make: () => { const r = pick(dirtRecruit()); r.bag = true; return { title: 'A man with an envelope', text: `A man who says he speaks for ${r.n}, your ${r.star}-star ${r.pos} target, tells a booster that $300,000 in cash would settle where he signs. Nothing would be written down.`, data: { rid: r.id },
    opts: [{ label: 'Let the booster handle it', hint: 'He becomes very hard to lose. $0.3M off the books and a large jump in NCAA risk. It stays a secret unless someone looks.' }, { label: 'Walk away', hint: 'He cools on you a little.' }, { label: 'Report the approach', hint: 'Board +, NCAA risk down. You are out of the running for him.' }], def: 1 }; },
  res: (i, d) => { const r = state.rec && state.rec.list.find(x => x.id === d.rid); if (!r) return 'The recruit is no longer on your board.';
    if (i === 0) { state.fin.balance -= 0.3; r.interest = clamp(r.interest + 30, 1, 99); dirtAdd('bagman', `A booster paid $300,000 in cash to land ${r.n}.`, 18); return `It is handled. ${r.n} is suddenly very interested in ${myName()}.`; }
    if (i === 1) { r.interest = clamp(r.interest - 4, 1, 99); return 'You tell the booster to hang up.'; }
    r.interest = clamp(r.interest - 25, 1, 99); mv('board', 2); state.meters.risk = clamp(state.meters.risk - 5, 0, 100); return `You report it to compliance. ${r.n} will sign somewhere else.`; } };
EVENT_DEFS.buriedtest = { w: 4, cond: () => dirtOk() && !!bigGame() && dirtStar().length > 0,
  make: () => { const p = pick(dirtStar()); const o = oppOf(bigGame()); return { title: 'A failed test, four days out', text: `${p.n} (${p.pos}, ${p.ovr} OVR) failed a team drug test. ${teamName(o)} is on Saturday. Right now only you, the head coach and the trainer know.`, data: { pid: p.id, opp: o },
    opts: [{ label: 'Suspend him for the game', hint: 'He sits. Board +, locker room −.' }, { label: 'Lose the paperwork', hint: 'He plays. A large jump in NCAA risk, and it stays a secret unless someone looks.' }, { label: 'Suspend him two games and say why', hint: 'Board ++, fans +, NCAA risk down.' }], def: 0 }; },
  res: (i, d) => { const p = P(d.pid); if (!p) return 'He was no longer on the roster.';
    if (i === 0) { p.susp = 1; mv('board', 2); mv('morale', -1); return `${p.n} is suspended for the ${teamName(d.opp)} game.`; }
    if (i === 1) { dirtAdd('buriedtest', `${p.n} played against ${teamName(d.opp)} after a failed drug test that was never reported.`, 20); return `The result goes in a drawer. ${p.n} will play.`; }
    p.susp = 2; mv('board', 4); mv('fan', 1); state.meters.risk = clamp(state.meters.risk - 4, 0, 100); return `${p.n} is suspended two games, and you tell the press why.`; } };
EVENT_DEFS.hiddeninjury = { w: 4, cond: () => dirtOk() && !X().gut && !!bigGame() && gutPick().length > 0,
  make: () => { const p = pick(gutPick()); const o = oppOf(bigGame()); return { title: 'Keep it off the injury report', text: `The conference requires an injury report. ${p.n} (${p.pos}, ${p.ovr} OVR) should be on it and should not play against ${teamName(o)}. The trainer says an injection would get him through, if nobody writes it down.`, data: { pid: p.id, opp: o },
    opts: [{ label: 'Do it quietly', hint: 'He plays. A jump in NCAA risk, and about two times in five he makes the injury worse.' }, { label: 'File the report and sit him', hint: 'He heals on schedule.' }], def: 1 }; },
  res: (i, d) => { const p = P(d.pid); if (!p) return 'He was no longer on the roster.'; if (i !== 0) return `${p.n} is listed as out.`;
    X().gut = { pid: p.id, wk: state.week, s: state.season, inj: p.inj, type: p.injType, opp: d.opp }; p.inj = 0; dirtAdd('hiddeninjury', `${p.n} was given an unreported injection to play against ${teamName(d.opp)}.`, 12); return `${p.n} is not on the report. He will play.`; } };
// The end-of-season investigation the game already runs. Secrets older than three seasons go cold; if the NCAA
// finds something while a secret is live, the story names it and you choose how to answer.
{ const _i = investigate; investigate = function () {
  const out = _i.apply(this, arguments);
  try { if (dirtOk()) { const D = dirtBook(); D.acts = D.acts.filter(a => state.season - a.s < 3);
    if (out && D.acts.length) { const a = D.acts[D.acts.length - 1]; D.pend = { s: state.season, out, t: a.t, n: D.acts.length }; D.hist.push({ s: state.season, t: a.t, out }); D.acts = []; mv('fan', -3); addNews(`What the investigators found: ${a.t}`, 'bad'); } } } catch (e) { console.error(e); }
  return out;
}; }
function dirtResolve(how) {
  const D = dirtBook(); const P_ = D.pend; if (!P_) return ''; D.pend = null; let msg = '';
  if (how === 'own') { mv('board', 3); mv('fan', 2); msg = 'You take responsibility in public and accept the penalty. It is not forgotten, but it is over.'; }
  else if (how === 'blame') { const role = ['OC', 'DC'].find(r => state.staff[r] && !state.staff[r].me); if (!role) { mv('board', -2); msg = 'There was nobody left to blame.'; } else { const old = state.staff[role].name; const nw = nemReplace(role); mv('board', 5); mv('morale', -6); if (R() < 0.3) { mv('board', -12); mv('fan', -5); addNews(`${old} tells a reporter he was fired to protect the people who gave the orders at ${myName()}.`, 'bad'); } msg = `${old} is fired for cause. ${nw.name} is promoted to replace him. The locker room knows what happened.`; } }
  else { if (R() < 0.4) { state.fin.balance += 1; mv('fan', 5); msg = 'You fight it in public, and it works: an appeal trims the fine and the fans rally behind the program.'; } else { mv('board', -7); mv('fan', -3); msg = 'You fight it in public and lose. The board is embarrassed.'; } }
  try { jrAdd('scandal', msg); } catch (e) { } addNews('The investigation: ' + msg); return msg;
}
function dirtPendHTML() {
  if (!state || !dirtOk() || !state.x || !state.x.dirt || !state.x.dirt.pend) return ''; const P_ = state.x.dirt.pend;
  return `<section class="card decision" id="dirtpend" data-block="1"><div class="eyebrow">Decision needed · the investigation</div><h2 class="h2">It came out</h2><p>${esc(P_.t)} The NCAA's ruling: ${esc(P_.out)}</p>
   <div class="evopts"><button class="evopt" data-act="dirtdo" data-v="own"><b>Take responsibility</b><span>Board +, fans +. It ends here.</span></button><button class="evopt" data-act="dirtdo" data-v="blame"><b>Fire a coordinator and blame him</b><span>Board ++, locker room −−. He may talk, and that would be worse.</span></button><button class="evopt" data-act="dirtdo" data-v="fight"><b>Fight it in public</b><span>Two times in five the fans rally and the fine is trimmed. Otherwise the board is embarrassed.</span></button></div></section>`;
}
function dirtCardHTML() {
  if (!state || !dirtOk() || !state.x || !state.x.dirt) return ''; const D = state.x.dirt; if (!D.acts.length && !D.hist.length) return '';
  return `<section class="card" id="dirtcard"><div class="eyebrow">What only you know</div>${D.acts.length ? `<ul class="plainlist small">${D.acts.map(a => `<li><span class="muted">${a.s}</span> · ${esc(a.t)}</li>`).join('')}</ul><p class="small muted">A secret goes cold after three seasons. Until then, every NCAA review is a risk.</p>` : '<p class="small muted">Nothing is hanging over the program right now.</p>'}${D.hist.length ? `<div class="eyebrow mt">What came out</div><ul class="plainlist small">${D.hist.map(a => `<li><span class="muted">${a.s}</span> · ${esc(a.t)} <span class="muted">${esc(a.out)}</span></li>`).join('')}</ul>` : ''}</section>`;
}
{ const _v = vHistory; vHistory = function () { let x = ''; try { x = dirtCardHTML(); } catch (e) { console.error(e); } return _v.apply(this, arguments) + x; }; }
Object.assign(actions, {
  nemdo(d) { const m = nemResolve(d.k, d.v); after(m); },
  dirtdo(d) { const m = dirtResolve(d.v); after(m); },
});
// Both decisions are in the Inbox and the "Needs your attention" list, so they move to the top of the Office.
{ const _a = attnItems; attnItems = function () { const out = _a.apply(this, arguments);
  try { if (appMode === 'ad' && state) { const N = nemOn() ? state.nem : null; if (N && N.pend) out.unshift({ txt: `Decision: ${N.name} is after your ${N.pend.k === 'poach' ? (ROLE_TITLE[N.pend.role] || 'coordinator').toLowerCase() : 'recruit ' + N.pend.n}.`, tab: 'office', sel: '#nempend' }); if (dirtOk() && state.x && state.x.dirt && state.x.dirt.pend) out.unshift({ txt: 'Decision: the investigation found something.', tab: 'office', sel: '#dirtpend' }); } } catch (e) { }
  return out; }; }
