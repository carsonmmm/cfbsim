/* ===================== v9.9 UI: league history, weekly awards, predictions, signing day battles, draft night ===================== */
function lhColName(id) { if (!id) return '—'; if (!isPro() && state.teams[id]) return teamName(id); return CTEAMS0_AD[id] ? CTEAMS0_AD[id].name : id; }
function lhNflName(id) { return id && NFL_BY[id] ? NFL_BY[id].name : id || '—'; }
function lhCol(id) { return !isPro() && state.teams[id] ? tchip(id, { norank: true }) : esc(lhColName(id)); }
function lhNfl(id) { return id && NFL_BY[id] ? nflChip(id) : esc(id || '—'); }
function lhTitles(list, nm) {
  const n = {}; list.forEach(e => { if (e.champ) n[e.champ] = (n[e.champ] || 0) + 1; }); const rows = Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return rows.length ? `<ol class="plainlist small lhtitles">${rows.map(([id, k]) => `<li><b>${k}</b> ${esc(nm(id))}</li>`).join('')}</ol>` : '';
}
function vLgHist() {
  const H = lgHistOf(); const col = H.col.slice().reverse(), nfl = H.nfl.slice().reverse(); const pick = e => e.pred ? `${e.pred.hit ? '<span class="pill good">Called it</span>' : '<span class="muted small">Picked ' + esc((e.nfl ? lhNflName : lhColName)(e.pred.pick)) + '</span>'}` : '<span class="muted small">—</span>';
  const pf = (x, nm) => x ? `<b>${esc(x.n)}</b> <span class="muted small">${esc(x.pos || '')}${x.tm ? ', ' + esc(nm(x.tm)) : ''}</span>` : '<span class="muted">—</span>';
  const colT = col.length ? `<section class="card"><div class="head"><div><div class="eyebrow">College football</div><h2 class="h2">National champions and award winners</h2></div><button class="btn ghost sm" data-act="csvexp" data-v="lghist">Download as a spreadsheet</button></div>
    <div class="tw"><table class="tbl lht sortable" data-sk="lhcol"><thead><tr><th>Season</th><th>Champion</th><th>Runner-up</th><th>Heisman Trophy</th><th>Coach of the year</th><th>Called it?</th></tr></thead><tbody>${col.map(e => `<tr class="${e.champ && e.champ === e.me ? 'me' : ''}"><td>${e.s}</td><td>${e.champ ? lhCol(e.champ) : '—'}${e.score ? ` <span class="muted small">${esc(e.score)}</span>` : ''}</td><td>${e.runner ? esc(lhColName(e.runner)) : '<span class="muted">—</span>'}</td><td>${pf(e.heis, lhColName)}</td><td>${e.coy ? esc(e.coy.n) + ` <span class="muted small">${esc(lhColName(e.coy.tm))}</span>` : '—'}</td><td>${pick(e)}</td></tr>`).join('')}</tbody></table></div>
    ${col.some(e => e.old) ? '<p class="hint">Seasons played before this update show the champion and award winners only.</p>' : ''}</section>` : '';
  const nflT = nfl.length ? `<section class="card"><div class="eyebrow">The NFL</div><h2 class="h2">Super Bowl winners and MVPs</h2>
    <div class="tw"><table class="tbl lht sortable" data-sk="lhnfl"><thead><tr><th>Season</th><th>Super Bowl winner</th><th>Runner-up</th><th>MVP</th><th>Coach of the year</th><th>Called it?</th></tr></thead><tbody>${nfl.map(e => `<tr class="${e.champ && e.champ === e.me ? 'me' : ''}"><td>${e.s}</td><td>${lhNfl(e.champ)}${e.score ? ` <span class="muted small">${esc(e.score)}</span>` : ''}</td><td>${e.runner ? esc(lhNflName(e.runner)) : '—'}</td><td>${pf(e.mvp, lhNflName)}</td><td>${e.coy ? esc(e.coy.n) + ` <span class="muted small">${esc(lhNflName(e.coy.tm))}</span>` : '—'}</td><td>${e.pred ? (e.pred.hit ? '<span class="pill good">Called it</span>' : '<span class="muted small">Picked ' + esc(lhNflName(e.pred.pick)) + '</span>') : '<span class="muted small">—</span>'}</td></tr>`).join('')}</tbody></table></div></section>` : '';
  const last = col[0] && col[0].top && col[0].top.length ? col[0] : null; const lastN = nfl[0] && nfl[0].top && nfl[0].top.length ? nfl[0] : null;
  const side = `<section class="card"><div class="eyebrow">Most titles</div>${col.length ? `<h3 class="h3">College</h3>${lhTitles(H.col, lhColName) || '<p class="muted small">No champions yet.</p>'}` : ''}${nfl.length ? `<h3 class="h3 mt">NFL</h3>${lhTitles(H.nfl, lhNflName)}` : ''}
    ${last ? `<div class="eyebrow mt">${last.s} final top 5</div><ol class="plainlist small">${last.top.map(id => `<li>${esc(lhColName(id))}</li>`).join('')}</ol>` : ''}${lastN ? `<div class="eyebrow mt">${lastN.s} best records</div><ol class="plainlist small">${lastN.top.map(id => `<li>${esc(lhNflName(id))} <span class="muted">${(lastN.top.indexOf(id) + 1)}</span></li>`).join('')}</ol>` : ''}
    ${last && last.ccg && last.ccg.length ? `<div class="eyebrow mt">${last.s} conference champions</div><ul class="plainlist small">${last.ccg.map(([c, w]) => `<li>${esc(CONFS[c] ? CONFS[c].name : c)}: ${esc(lhColName(w))}</li>`).join('')}</ul>` : ''}</section>`;
  if (!col.length && !nfl.length) return `<section class="card"><div class="eyebrow">League history</div><h2 class="h2">Nothing to show yet</h2><p class="muted">When a season ends, its champion, runner-up, award winners and how the preseason picks turned out are saved here, season after season.</p></section>${predCardHTML()}`;
  return `<div class="grid2 lhgrid"><div>${colT}${nflT}</div><div>${predCardHTML()}${side}</div></div>`;
}
// preseason picks against what is happening (or happened)
function predCardHTML() {
  const pr = predEnsure(); if (!pr) return '';
  const nfl = !!pr.nfl; const nm = nfl ? lhNflName : lhColName;
  const now = id => { if (nfl) { const t = T(id); return t ? t.w + '-' + t.l : '—'; } const r = rankOf(id); return r ? 'No. ' + r : 'Unranked'; };
  const rows = pr.top.map((id, i) => { const t = T(id); const r = nfl ? null : rankOf(id); const d = r ? i + 1 - r : null;
    return `<tr class="${id === ME ? 'me' : ''}"><td class="num muted">${i + 1}</td><td>${esc(nm(id))}</td><td class="num">${t ? t.w + '-' + t.l : ''}</td>${nfl ? '' : `<td class="num">${now(id)}${d ? ` <span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' + d : '▼' + -d}</span>` : ''}</td>`}</tr>`; }).join('');
  const me = `${T(ME).w}-${T(ME).l}${state.phase === 'offseason' ? '' : ' so far'}, picked to win about ${pr.myExp}`;
  return `<section class="card pred"><div class="eyebrow">Preseason predictions vs. reality · ${pr.s}</div><h2 class="h2">${state.phase === 'offseason' ? 'How the picks turned out' : 'How the picks are holding up'}</h2>
   <p class="small">Title pick: <b>${esc(nm(pr.top[0]))}</b>${pr.heis ? ` · ${nfl ? 'MVP' : 'Heisman'} favorite: <b>${esc(pr.heis.n)}</b> <span class="muted">(${esc(pr.heis.pos)}, ${esc(nm(pr.heis.tm))})</span>` : ''}</p>
   ${isComm() ? '' : `<p class="small muted">${esc(myName())}: ${me}.</p>`}${pr.late ? '<p class="hint">These picks were made after the season had started.</p>' : ''}
   <div class="tw"><table class="tbl"><thead><tr><th>Pick</th><th>Team</th><th>Rec</th>${nfl ? '' : '<th>Now</th>'}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
// players and coaches of the week
function weeklyCardHTML() {
  const W = (state.weekly || []).filter(x => x.s === state.season).slice().reverse(); const nm = isPro() ? lhNflName : lhColName;
  const who = x => x ? `<b>${esc(x.n)}</b> <span class="muted small">${esc(x.pos)}, ${esc(nm(x.tm))}</span>${x.tm === ME && !isComm() ? ' <span class="pill maize">Yours</span>' : ''}<br><span class="small muted">${esc(x.line || '')}</span>` : '<span class="muted">—</span>';
  const tally = !isComm() && (state.wkMine || state.wkCoach) ? `<p class="hint">Your weekly awards so far: ${state.wkMine || 0} player${state.wkMine === 1 ? '' : 's'} of the week, ${state.wkCoach || 0} coach of the week.</p>` : '';
  return `<section class="card"><div class="eyebrow">Weekly awards · ${state.season}</div><h2 class="h2">Players and coaches of the week</h2>${tally}
   ${W.length ? `<div class="tw"><table class="tbl wkaw"><thead><tr><th>Week</th><th>Offense</th><th>Defense</th><th>Coach</th></tr></thead><tbody>${W.map(e => `<tr><td class="num">${e.wk}</td><td>${who(e.off)}</td><td>${who(e.def)}</td><td>${e.coach ? `<b>${esc(e.coach.n)}</b>${e.coach.tm === ME && !isComm() ? ' <span class="pill maize">Yours</span>' : ''}<br><span class="small muted">${esc(nm(e.coach.tm))} ${esc(e.coach.sc)} over ${esc(nm(e.coach.opp))}</span>` : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">The first winners are named after week 1.</p>'}</section>`;
}

/* ---------- playback: draft night and signing day reveal one moment at a time ---------- */
const dn = { t: null, i: 0, items: [], done: null };
function dnItemHTML(x) {
  const cls = x.k === 'mine' || x.k === 'sign' ? 'me' : x.k === 'lost' ? 'lost' : x.k === 'break' || x.k === 'open' || x.k === 'end' ? 'brk' : '';
  return `<li class="${cls}">${x.p && x.p.tm && NFL_BY[x.p.tm] ? nflChip(x.p.tm) + ' ' : ''}<span>${esc(x.txt)}${x.say ? `<br><i class="small">${esc(x.say)}</i>` : ''}</span></li>`;
}
function dnPlay(title, eyebrow, items, done) {
  clearTimeout(dn.t); dn.items = items; dn.i = 0; dn.done = done || null;
  openModal(`<div class="eyebrow">${esc(eyebrow)}</div><h2 class="h2">${esc(title)}</h2><ol class="dnlist" id="dnlist" aria-live="polite"></ol><div class="row gap mt" id="dnctl"><button class="btn" data-act="dnskip">Skip to the end</button></div>`, title);
  dnStep();
}
function dnStep() {
  const ol = document.getElementById('dnlist'); if (!ol) { clearTimeout(dn.t); return; }
  const x = dn.items[dn.i++]; if (!x) return dnEnd(); ol.insertAdjacentHTML('beforeend', dnItemHTML(x)); ol.lastElementChild.scrollIntoView({ block: 'nearest' });
  const slow = x.k === 'mine' || x.k === 'sign' || x.k === 'lost' || x.k === 'break'; dn.t = setTimeout(dnStep, (slow ? 1700 : 650));
}
function dnEnd() { clearTimeout(dn.t); const ol = document.getElementById('dnlist'); if (ol) { while (dn.i < dn.items.length) ol.insertAdjacentHTML('beforeend', dnItemHTML(dn.items[dn.i++])); } const c = document.getElementById('dnctl'); if (c) c.innerHTML = '<button class="btn primary" data-act="dnclose">Continue</button>'; }
// signing day: the last pitch for each close race, then the announcements
function signHTML(B) {
  const opt = r => Object.entries(SIGN_PITCH).map(([k, l]) => { const f = pitchFx(r, k); return `<option value="${k}">${esc(l)}${k !== 'none' ? ` (${f.b >= 0 ? '+' : ''}${f.b})` : ''}</option>`; }).join('');
  return `<div class="eyebrow">National Signing Day</div><h2 class="h2">The closest races</h2><p class="hint">Each of these recruits is still deciding. You get one last pitch for each: the number is how much it moves his odds of signing with you. Then the hats come out.</p>
   <div class="tw"><table class="tbl"><thead><tr><th>Recruit</th><th>Odds</th><th>Also in it</th><th>Last pitch</th></tr></thead><tbody>${B.map(r => `<tr><td><b>${esc(r.n)}</b> <span class="muted small">${'★'.repeat(r.star)} ${esc(r.pos)}, ${esc(r.home || '')}</span></td><td class="num">${recOdds(r)}%</td><td class="small">${(r.lead || []).slice(0, 2).map(id => esc(teamName(id))).join(', ')}</td><td><select data-pitch="${r.id}" aria-label="Last pitch for ${esc(r.n)}">${opt(r)}</select></td></tr>`).join('')}</tbody></table></div>
   <p class="small muted mt">NIL: adds money to his deal. Playing time: depends on who is ahead of him. Head coach: depends on your coach's recruiting. Facilities: your football building. Winning: your final ranking.</p>
   <div class="row gap mt"><button class="btn primary" data-act="signgo">Make the calls</button><button class="btn ghost" data-act="close">Not yet</button></div>`;
}
function signReveal(B) {
  const items = [{ k: 'open', txt: `National Signing Day. ${B.length} recruits are announcing live.` }];
  B.forEach(r => { const mine = r.status === 'signed'; const pitch = r.pitch && r.pitch !== 'none' ? ` Your last pitch: ${SIGN_PITCH[r.pitch].toLowerCase()}.` : '';
    items.push({ k: mine ? 'sign' : 'lost', txt: `${r.star}-star ${r.pos} ${r.n} reaches under the table... ${mine ? `and puts on the ${myName()} hat!` : r.to === 'grayshirt' ? `and picks ${myName()}, but there is no room left this year, so he will grayshirt.` : `and picks ${r.to ? teamName(r.to) : 'another school'}.`}`, say: pitch.trim() }); });
  const rc = state.rec; items.push({ k: 'end', txt: `Signing Day is over: ${rc.signed ? rc.signed.length : 0} signees, a class ranked No. ${rc.classRank || '—'}.` }); return items;
}
Object.assign(actions, {
  dnskip() { dnEnd(); },
  dnclose() { clearTimeout(dn.t); const f = dn.done; dn.done = null; hideModal(); if (f) f(); else render(); },
  dnwatch() { const nf = state.off && state.off.nfl ? state.off.nfl : null; if (!nf) return; dnPlay(nf.year + ' NFL Draft', 'Draft night', draftNightScript(nf)); },
  signgo() { const B = signBattles(); document.querySelectorAll('#modal [data-pitch]').forEach(s => { if (s.value !== 'none') setPitch(s.dataset.pitch, s.value); else { const r = state.rec.list.find(x => x.id === s.dataset.pitch); if (r) r.pitch = 'none'; } }); signingDay(); save(); dnPlay('Signing Day', 'National Signing Day', signReveal(B), () => after()); },
});

