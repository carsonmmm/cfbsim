/* ===================== v9.58: player stories, and conferences that move =====================
 * STORIES. Every player, former player and NFL player has a story: where he came from, each season, the awards,
 * the injuries, how he left and what became of him. It is built from what the save already holds, plus a note
 * made on signing day (p.sig). Players an athletic director sends to the NFL Draft are also written to the
 * shared register on this device (fe-world, "alumni"), so a general manager career with Shared world on finds
 * them in the draft class of the same year, and their page there tells the college half of the story.
 * REALIGNMENT. The game already moved a school now and then and let you apply to another conference. Now the
 * power conferences raid each other, the raided league refills, and a conference may invite your school, with
 * the money, the travel and the level of play laid out. The invitation lives in X().inv. */

/* ---------- stories ---------- */
const storyYear = t => +((String(t).match(/^(\d{4})\b/) || [])[1] || 0);
function storyCollege(o, alum) { // o: a roster player or an alumni record
  const ch = []; const hist = o.hist || []; const y0 = hist.length ? hist[0].s : (alum ? o.last : state.season);
  const sig = o.sig || null;
  if (o.transfer) ch.push({ y: y0, t: `Transferred in from ${o.from || 'another school'}.` });
  else if (o.recruit || sig) ch.push({ y: sig ? sig.s : y0, t: `Signed as a ${o.star || (sig && sig.star) || 3}-star recruit${o.home ? ' from ' + o.home : ''}.${sig && sig.beat ? ` ${teamName(sig.beat)} wanted him too.` : ''}${sig && sig.alum ? ` ${sig.alum}, who played his position here, helped bring him in.` : ''}${sig && sig.held ? ` ${sig.held} came after him and you held on.` : ''}` });
  else if (o.walkon) ch.push({ y: y0, t: 'Joined the team as a walk-on.' });
  else if (o.home) ch.push({ y: y0, t: `Came to ${myName()} from ${o.home}.` });
  hist.forEach(h => { const line = h.line || (h.st && h.pos ? statLineRaw(h.pos, h.st) : ''); ch.push({ y: h.s, t: `${h.cls || ''} season: ${h.ovr} overall, ${h.gp || 0} game${h.gp === 1 ? '' : 's'}${line && h.gp ? ', ' + line : ''}.` }); });
  (o.awards || []).forEach(a => { const s = typeof a === 'string' ? a : String(a.t || a.a || ''); if (s) ch.push({ y: storyYear(s), t: s.replace(/^\d{4}\s*/, '') + '.', star: true }); });
  (o.persLog || []).forEach(x => ch.push({ y: x.s, t: `Changed as a person: ${PERS[x.from] ? PERS[x.from].label.toLowerCase() : x.from} to ${PERS[x.to] ? PERS[x.to].label.toLowerCase() : x.to}.` }));
  if (o.medRS) ch.push({ y: 0, t: 'Received a medical redshirt.' }); if (o.medBack) ch.push({ y: 0, t: 'Came back to football against medical advice.' });
  if (alum) { ch.push({ y: o.last + 0.5, t: (o.where || o.why || 'Left the program') + '.' }); if (o.coach) ch.push({ y: o.last + 4, t: `Came home to ${myName()} to coach.` }); }
  else if ((state.captains || []).includes(o.id)) ch.push({ y: state.season + 0.4, t: 'Team captain this season.' });
  return ch.filter(c => c.t).sort((a, b) => (a.y || 9999) - (b.y || 9999));
}
const worldAlumni = () => { try { return worldGet().alumni || []; } catch (e) { return []; } };
function storyPro(p) {
  const ch = []; const w = worldAlumni().find(a => a.n === p.n && a.pos === p.pos);
  if (w) { ch.push({ y: w.yr - (w.seasons || 3), t: `You signed him at ${w.col} as athletic director${w.stars ? ', a ' + w.stars + '-star recruit' : ''}.` }); (w.aw || []).forEach(a => ch.push({ y: storyYear(a), t: a.replace(/^\d{4}\s*/, '') + ' at ' + w.col + '.', star: true })); ch.push({ y: w.yr, t: `Left ${w.col} after ${w.seasons || 'several'} season${w.seasons === 1 ? '' : 's'}. In that career he went in round ${w.rd} of the ${w.yr} draft.` }); }
  else if (p.col) ch.push({ y: 0, t: `Played college football at ${p.col}.` });
  if (p.exp != null) ch.push({ y: state.season - p.exp, t: p.exp ? `Entered the NFL ${p.exp} season${p.exp === 1 ? '' : 's'} ago.` : 'A rookie this season.' });
  if (p.yw) ch.push({ y: state.season - p.yw, t: `With the ${myName()} for ${p.yw} season${p.yw === 1 ? '' : 's'}.` });
  (p.awards || []).forEach(a => { const s = typeof a === 'string' ? a : String(a.t || a.a || ''); if (s) ch.push({ y: storyYear(s), t: s.replace(/^\d{4}\s*/, '') + '.', star: true }); });
  return ch.sort((a, b) => (a.y || 9999) - (b.y || 9999));
}
function storyHTML(ch, title) {
  if (!ch.length) return ''; return `<div class="eyebrow mt">${esc(title || 'His story')}</div><ul class="plainlist small story">${ch.map(c => `<li>${c.y >= 1900 ? `<span class="muted">${Math.floor(c.y)}</span> · ` : ''}${c.star ? '<b>' + esc(c.t) + '</b>' : esc(c.t)}</li>`).join('')}</ul>`;
}
{ const _p = playerModal; playerModal = function (id) { const html = _p.apply(this, arguments); try { const p = P(id); if (p) return html + storyHTML(isPro() ? storyPro(p) : storyCollege(p, false)); } catch (e) { console.error(e); } return html; }; }
// signing day: remember how each recruit was won, for his story
{ const _s = signingDay; signingDay = function () { const before = new Set(state.roster.map(p => p.id)); const r = _s.apply(this, arguments);
  try { const list = state.rec && state.rec.list ? state.rec.list : []; state.roster.forEach(p => { if (before.has(p.id) || !p.recruit || p.sig) return; const x = list.find(q => q.n === p.n && q.pos === p.pos); p.sig = { s: state.season + 1, star: p.star }; if (x) { if (x.alum) p.sig.alum = x.alum; if (x.nemHeld) p.sig.held = x.nemHeld; const b = (x.lead || []).find(id => id !== ME && T(id)); if (b && x.star >= 4) p.sig.beat = b; } }); } catch (e) { console.error(e); }
  return r; }; }
// the draft: your players go into the device's shared register, for a general manager career to find
{ const _d = runADDraft; runADDraft = function () { const n0 = state.draft.length; const r = _d.apply(this, arguments);
  try { if (!isPro() && !isCoach() && !isComm() && typeof worldGet === 'function') { const got = state.draft.slice(n0); if (got.length) { const w = worldGet(); w.alumni = w.alumni || [];
    got.forEach(d => { const a = state.alumni.find(x => x.n === d.n && x.pos === d.pos); if (!a || a.real) return; const last = (a.hist || []).slice(-1)[0] || {}; const ovr = last.ovr || 70;
      w.alumni.push({ k: 'al:' + state.seed + ':' + (a.pid || d.n), n: d.n, pos: d.pos, ovr, pot: clamp(ovr + 6, ovr, 99), col: myName(), yr: d.s, rd: d.rd, no: d.no, seasons: (a.hist || []).length, aw: (a.awards || []).map(x => String(typeof x === 'string' ? x : x.t || '')).filter(Boolean).slice(0, 4), t: Date.now() }); });
    w.alumni = w.alumni.sort((x, y) => (y.t || 0) - (x.t || 0) || x.no - y.no).slice(0, 40); worldPut(w); } } } catch (e) { console.error(e); }
  return r; }; }
{ const _g = genDraftClass; genDraftClass = function (yr) { const D = _g.apply(this, arguments);
  try { if (worldOn() && D && D.list) { let n = 0; worldAlumni().forEach(a => { if (a.yr !== yr || n >= 6 || D.list.some(x => x.world === a.k || (x.n === a.n && x.pos === a.pos))) return; n++;
      D.list.push({ id: 'da' + yr + '_' + Math.floor(hmix(a.k) * 1e6), n: a.n, pos: a.pos, age: 22, ovr: clamp(Math.round(a.ovr * 0.9), 50, 82), pot: clamp(a.pot, 60, 99), col: a.col, sc: 0, bias: 0, pbias: 0, hype: 1, world: a.k }); });
    if (n) { const cv = p => p.ovr * 0.55 + p.pot * 0.45 + p.hype + (PRO_POS_W[p.pos] - 1) * 8; D.list.sort((a, b) => cv(b) - cv(a)); D.list.forEach((p, i) => { p.cr = i + 1; }); } } } catch (e) { console.error(e); }
  return D; }; }
Object.assign(actions, {
  alumstory(d) { const a = (state.alumni || []).find(x => x.n === d.n && String(x.last) === String(d.s)); if (!a) return; openModal(`<div class="eyebrow">${esc(POS_NAME[a.pos] || a.pos)} · ${esc(myName())} · last season ${a.last}</div><h2 class="h2">${esc(a.n)}</h2><p class="muted">${esc(a.where || a.why || '')}</p>${a.cs && Object.keys(a.cs).length ? `<p class="small">Career here: ${esc(statLine({ pos: a.pos }, a.cs))}</p>` : ''}${storyHTML(storyCollege(a, true))}`, a.n); },
});
// the people recruits and fans still talk about, on the History page
function storyPeopleHTML() {
  if (isPro() || isComm() || !state.alumni || !state.alumni.length) return ''; const score = a => (a.awards || []).length * 3 + (/^Drafted/.test(a.where || '') ? 6 - Math.min(5, +(((a.where || '').match(/round (\d)/) || [])[1] || 7)) : 0) + (a.coach ? 4 : 0) + (a.why === 'Medical retirement' ? 2 : 0);
  const top = state.alumni.filter(a => score(a) > 0).sort((a, b) => score(b) - score(a) || b.last - a.last).slice(0, 10); if (!top.length) return '';
  return `<section class="card" id="storycard"><div class="head"><div><div class="eyebrow">Player stories</div><h2 class="h3">The ones people still talk about</h2></div><p class="hint">Open any name for his whole story. Current players have theirs on their player page.</p></div><ul class="plainlist">${top.map(a => `<li><button class="lnk" data-act="alumstory" data-n="${esc(a.n)}" data-s="${a.last}"><b>${esc(a.n)}</b></button>, ${a.pos} <span class="small muted">· ${esc(a.where || a.why || '')}</span></li>`).join('')}</ul></section>`;
}

/* ---------- realignment ---------- */
const confMembers = c => Object.values(state.teams).filter(t => t.conf === c);
const confLevel = c => { const m = confMembers(c).map(t => t.rating).sort((a, b) => b - a).slice(0, 10); return m.length ? m.reduce((a, b) => a + b, 0) / m.length : 0; };
const confTravel = (c, id) => { const m = confMembers(c).filter(t => t.id !== id); return m.length ? m.reduce((a, t) => a + Math.abs(tzOf(t.id) - tzOf(id)), 0) / m.length : 0; };
const confTV = c => r1(clamp((confLevel(c) - 66) * 0.7, -4, 12)); // what a league's TV partners add on top of the base deal
const CONF_MAX = 18, CONF_MIN = 8;
function confRecordMove(id, from, to) { T(id).conf = to; state.confMoves = (state.confMoves || []).concat([{ s: state.season + 1, id, from, to }]); }
// once an offseason at most: the strongest league with room takes the best school it can get, and the league it
// raided fills the hole from below
function confRaid() {
  if (isPro() || xh('raid' + state.season) > 0.14) return null; const P4 = Object.keys(CONFS).filter(c => CONFS[c].p4 && confMembers(c).length);
  const rich = P4.filter(c => confMembers(c).length < CONF_MAX).sort((a, b) => confLevel(b) - confLevel(a))[0]; if (!rich) return null;
  const tgt = Object.values(state.teams).filter(t => t.id !== ME && t.id !== 'ND' && t.conf !== rich && t.conf !== 'IND' && CONFS[t.conf] && CONFS[t.conf].p4 && confLevel(t.conf) < confLevel(rich) - 2 && confMembers(t.conf).length > CONF_MIN && !(state.myMove && state.myMove.to === t.conf)).sort((a, b) => b.rating - a.rating)[0]; if (!tgt) return null;
  const from = tgt.conf; confRecordMove(tgt.id, from, rich); const out = [`${tgt.name} leaves the ${CONFS[from].name} for the ${CONFS[rich].name}.`];
  const fill = Object.values(state.teams).filter(t => t.id !== ME && t.id !== 'ND' && CONFS[t.conf] && !CONFS[t.conf].p4 && t.conf !== 'IND' && t.rating >= 60 && confMembers(t.conf).length > CONF_MIN).sort((a, b) => b.rating - a.rating)[0];
  if (fill) { const ff = fill.conf; confRecordMove(fill.id, ff, from); out.push(`The ${CONFS[from].name} answers by adding ${fill.name} from the ${CONFS[ff].name}.`); }
  rebuildConfs(); addNews('Realignment: ' + out.join(' '), 'big'); X().raidS = state.season; X().raided = from; return out;
}
{ const _r = realign; realign = function () {
  const mm = state.myMove && state.myMove.s === state.season && state.myMove.done !== true ? state.myMove : null; const r = _r.apply(this, arguments);
  try { if (mm && mm.done === true && mm.tv) { state.mediaBonus = r1((state.mediaBonus || 0) + mm.tv); addNews(`${myName()}'s first TV check from the ${CONFS[mm.to].name} is ${mm.tv > 0 ? 'bigger' : 'smaller'} by $${Math.abs(mm.tv)}M a year.`, mm.tv > 0 ? 'good' : 'bad'); } confRaid(); } catch (e) { console.error(e); }
  return r; }; }
// an invitation for your school
const invOn = () => !isPro() && !isCoach() && !isComm() && state.phase === 'offseason';
const invNow = () => { const v = state.x && state.x.inv; return v && invOn() && v.s === state.season && CONFS[v.to] && T(ME).conf !== v.to && !(state.myMove && state.myMove.s === state.season) ? v : null; };
function invMake() {
  if (!invOn() || (state.myMove && state.myMove.s === state.season)) return null; const x = X(); if (x.invS === state.season) return null; x.invS = state.season; x.inv = null;
  const me = T(ME); const mine = me.conf; const no = x.invNo || {};
  const cands = Object.keys(CONFS).filter(c => c !== mine && c !== 'IND' && confMembers(c).length && confMembers(c).length < CONF_MAX && !(no[c] && state.season - no[c] < 3) && me.rating >= confLevel(c) - 6 && (confLevel(c) > confLevel(mine) + 1 || (CONFS[c].p4 && !CONFS[mine].p4))).sort((a, b) => confLevel(b) - confLevel(a));
  if (!cands.length) return null; const p = 0.16 + (rankOf(ME) ? 0.12 : 0) + (x.raided === mine && x.raidS === state.season - 1 ? 0.2 : 0) + (state.champ === ME ? 0.2 : 0); if (xh('inv' + state.season) > p) return null;
  const to = cands[Math.min(cands.length - 1, Math.floor(xh('invc' + state.season) * Math.min(2, cands.length)))];
  x.inv = { s: state.season, to, tv: r1(confTV(to) - confTV(mine)), fee: r1(moveFee(to) * 0.5), asked: false };
  addNews(`The ${CONFS[to].name} has invited ${myName()} to join. The offer is on your desk.`, 'big'); return x.inv;
}
{ const _s = startOffseason; startOffseason = function () { const r = _s.apply(this, arguments); try { invMake(); } catch (e) { console.error(e); } return r; }; }
function invFacts(v) {
  const mine = T(ME).conf; const eNow = econ(); const eThen = state.econ != null ? state.econ : (CONFS[v.to].p4 ? 0.85 : 0.3);
  const riv = typeof archRival === 'function' ? archRival() : null;
  return { mine, tvNow: r1(72 * eNow + (state.mediaBonus || 0) + mediaAmt()), tvThen: r1(72 * eThen + (state.mediaBonus || 0) + mediaAmt() + v.tv), lvNow: Math.round(confLevel(mine)), lvThen: Math.round(confLevel(v.to)), tzNow: confTravel(mine, ME), tzThen: confTravel(v.to, ME), rival: riv && T(riv) && T(riv).conf === mine ? riv : null, rank: confMembers(v.to).filter(t => t.rating > T(ME).rating).length + 1, size: confMembers(v.to).length + 1 };
}
function invResolve(how) {
  const v = invNow(); if (!v) return ''; const x = X(); const C = CONFS[v.to];
  if (how === 'ask') { if (v.asked) return ''; v.asked = true; if (R() < 0.5) { v.fee = 0; return `The ${C.name} agrees to cover your exit fee. The offer stands.`; } x.inv = null; (x.invNo || (x.invNo = {}))[v.to] = state.season; return `The ${C.name} does not like being asked for more. The invitation is withdrawn.`; }
  if (how === 'yes') { state.myMove = { s: state.season, to: v.to, fee: v.fee, tv: v.tv }; state.fin.balance -= v.fee; if (state.fin.ytd) state.fin.ytd.eventx = (state.fin.ytd.eventx || 0) + v.fee; x.inv = null; mv('fan', invFacts(v).rival ? -2 : 2); const m = `${myName()} will join the ${C.name} next season.${v.fee ? ` Exit fee: $${v.fee}M.` : ''}`; addNews(m, 'big'); try { jrAdd('realign', m); } catch (e) { } return m; }
  x.inv = null; (x.invNo || (x.invNo = {}))[v.to] = state.season; mv('fan', 2); const m = `${myName()} turns down the ${C.name} and stays in the ${CONFS[T(ME).conf].name}.`; addNews(m); try { jrAdd('realign', m); } catch (e) { } return m;
}
function invHTML() {
  const v = invNow(); if (!v) return ''; const f = invFacts(v); const C = CONFS[v.to]; const tz = n => (n < 0.15 ? 'almost none' : n.toFixed(1) + ' time zones a trip');
  return `<section class="card decision" id="invcard" data-block="1"><div class="eyebrow">Decision needed · realignment</div><h2 class="h2">The ${esc(C.name)} wants ${esc(myName())}</h2><p>The invitation is good until the new season starts. You would leave the ${esc(CONFS[f.mine].name)} after this offseason.</p>
   <div class="tw"><table class="tbl"><thead><tr><th></th><th>${esc(CONFS[f.mine].name)} (now)</th><th>${esc(C.name)}</th></tr></thead><tbody>
    <tr><td>TV money a year</td><td class="num">$${f.tvNow}M</td><td class="num"><b class="${f.tvThen >= f.tvNow ? 'res-w' : 'res-l'}">$${f.tvThen}M</b></td></tr>
    <tr><td>Level of play (top teams)</td><td class="num">${f.lvNow}</td><td class="num">${f.lvThen}</td></tr>
    <tr><td>Where you would rank</td><td class="num">${confMembers(f.mine).filter(t => t.rating > T(ME).rating).length + 1} of ${confMembers(f.mine).length}</td><td class="num">${f.rank} of ${f.size}</td></tr>
    <tr><td>Travel to league games</td><td class="num">${tz(f.tzNow)}</td><td class="num">${tz(f.tzThen)}</td></tr>
    <tr><td>Exit fee</td><td class="num">—</td><td class="num">${v.fee ? '$' + v.fee + 'M, once' : 'Covered'}</td></tr></tbody></table></div>
   ${f.rival ? `<p class="small">${esc(teamName(f.rival))} stays behind. You would no longer meet as conference opponents, and some fans will not forgive it.</p>` : ''}${f.tzThen > f.tzNow + 0.4 ? '<p class="small">The longer trips cost you a little in every road game.</p>' : ''}
   <div class="evopts"><button class="evopt" data-act="invdo" data-v="yes"><b>Accept</b><span>${v.fee ? `Pay $${v.fee}M and move` : 'Move'} next season.</span></button>${v.fee && !v.asked ? '<button class="evopt" data-act="invdo" data-v="ask"><b>Ask them to cover the exit fee</b><span>Even odds: they agree, or they withdraw the invitation.</span></button>' : ''}<button class="evopt" data-act="invdo" data-v="no"><b>Decline</b><span>You stay. They will not ask again for three seasons.</span></button></div></section>`;
}
function confCardHTML() {
  if (isPro() || !state.teams) return ''; const rows = Object.keys(CONFS).filter(c => c !== 'IND' && confMembers(c).length).sort((a, b) => confLevel(b) - confLevel(a));
  const mv_ = (state.confMoves || []).slice(-10).reverse();
  return `<section class="card" id="confcard"><div class="head"><div><div class="eyebrow">Realignment</div><h2 class="h3">The conferences, strongest first</h2></div><p class="hint">Strong leagues take schools from weaker ones, and the weaker ones refill from below. A league that rates your program may invite you.</p></div>
   <div class="tw"><table class="tbl"><thead><tr><th>Conference</th><th class="num">Schools</th><th class="num">Level</th><th class="num">TV extra</th></tr></thead><tbody>${rows.map(c => `<tr class="${T(ME) && T(ME).conf === c ? 'me' : ''}"><td>${esc(CONFS[c].name)}</td><td class="num">${confMembers(c).length}</td><td class="num">${Math.round(confLevel(c))}</td><td class="num">${confTV(c) >= 0 ? '+' : '−'}$${Math.abs(confTV(c))}M</td></tr>`).join('')}</tbody></table></div>
   ${mv_.length ? `<div class="eyebrow mt">Who moved</div><ul class="plainlist small">${mv_.map(m => `<li><span class="muted">${m.s}</span> · ${esc(teamName(m.id))}: ${esc(CONFS[m.from] ? CONFS[m.from].name : m.from)} to ${esc(CONFS[m.to] ? CONFS[m.to].name : m.to)}</li>`).join('')}</ul>` : '<p class="small muted mt">Nobody has moved yet.</p>'}</section>`;
}
{ const _v = vStandings; vStandings = function () { let x = ''; try { x = confCardHTML(); } catch (e) { console.error(e); } return _v.apply(this, arguments) + x; }; }
{ const _v = vOffice; vOffice = function () { let x = ''; try { x = invHTML(); } catch (e) { console.error(e); } return x + _v.apply(this, arguments); }; }
{ const _v = vHistory; vHistory = function () { let x = ''; try { x = storyPeopleHTML(); } catch (e) { console.error(e); } return _v.apply(this, arguments) + x; }; }
{ const _a = attnItems; attnItems = function () { const out = _a.apply(this, arguments); try { if (appMode === 'ad' && state && invNow()) out.unshift({ txt: `Decision: the ${CONFS[invNow().to].name} has invited ${myName()}.`, tab: 'office', sel: '#invcard' }); } catch (e) { } return out; }; }
Object.assign(actions, { invdo(d) { const m = invResolve(d.v); after(m); } });
