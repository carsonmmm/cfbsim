/* ===================== CONTRACT TALKS (v9.16): the panel ===================== */
// The contract talks panel on Player Career's offseason money step: pick how to negotiate, use a preset (player
// friendly, neutral, team friendly) or set the numbers yourself, and go back and forth with the team.
const ctPct = v => Math.round((v || 0) * 100) + '%';
const ctDealTxt = d => `${money(d.apy)} a year · ${d.yrs} year${d.yrs > 1 ? 's' : ''} · ${ctPct(d.gtd)} guaranteed · ${ctPct(d.bonus)} signing bonus`;
function ctForm() { if (!cui.ctForm) cui.ctForm = ctPresetDeal('neutral') || { apy: NFL_MIN, yrs: 2, bonus: 0.15, gtd: 0.45, st: 'neutral' }; return cui.ctForm; }
// reads the offer form: a blank or out-of-range box keeps its previous value and is reported, never guessed (FE-03)
function ctRead() {
  const F = ctForm(); const errs = [];
  const a = numIn('ct-apy', +(NFL_MIN / 1e6).toFixed(2), 99, '$M a year'), y = numIn('ct-yrs', 1, 6, 'Years'), b = numIn('ct-bonus', 0, 50, 'Signing bonus'), g = numIn('ct-gtd', 0, 100, 'Guaranteed');
  [a, y, b, g].forEach(r => { if (r.err) errs.push(r.err); });
  if (a.v != null) F.apy = Math.max(NFL_MIN, Math.round(a.v * 1e6 / 10000) * 10000); if (y.v != null) F.yrs = Math.round(y.v); if (b.v != null) F.bonus = b.v / 100; if (g.v != null) F.gtd = g.v / 100;
  return { F, errs };
}
// the last check before a deal can be signed: every term, the agent's cut, and a warning when you'd take less than they offer (QOL-01)
function ctConfirmHTML(T_) {
  const C = cui.ctConf; if (!C || T_.done) return ''; const d = C.k === 'offer' ? C.d : (T_.deal || T_.last); if (!d) return '';
  const fee = T_.mode === 'self' ? 0 : agentFee(); const feeTxt = fee ? `Your agent takes ${Math.round(fee * 100)}%, about ${money(Math.round(d.apy * d.yrs * fee / 10000) * 10000)} over the deal.` : 'No agent fee: you negotiated it yourself.';
  const age = ctAge(); const less = C.k === 'offer' && T_.last && ctCost(d, age) < ctCost(T_.last, age) * 0.97;
  const warn = less ? `<p class="flash bad">Their current offer is worth more than this one: ${esc(ctDealTxt(T_.last))}. You can take theirs instead.</p>` : '';
  const lead = C.k === 'offer' ? `If the ${esc(nflName(T_.tm))} accept, you're signed right away:` : `Sign with the ${esc(nflName(T_.tm))}:`;
  return `<div class="decision" id="x4ctconf"><b>${C.k === 'offer' ? 'Before you send this offer' : 'Before you sign'}</b><p>${lead} <b>${esc(ctDealTxt(d))}</b>. ${esc(feeTxt)}</p>${warn}
   <div class="row gap wrap"><button class="btn primary" data-act="${C.k === 'offer' ? 'x4ctsend' : 'x4ctsign'}">${C.k === 'offer' ? 'Send the offer' : 'Sign it'}</button><button class="btn ghost" data-act="x4ctback">${C.k === 'offer' ? 'Change it' : 'Not yet'}</button></div></div>`;
}
function ctPanelHTML() {
  const T_ = ctStore(); if (!T_ || T_.closed || (T_.k === 'fa' && !T_.done && (!cs.nfl.fa || cs.nfl.fa.done))) return ''; const tm = nflName(T_.tm); const log = T_.log.length ? `<ul class="plainlist small x4log">${T_.log.slice(-8).map(l => `<li class="${l.who}">${esc(l.txt)}</li>`).join('')}</ul>` : '';
  const head = `<div class="head"><div><div class="eyebrow">Contract talks · ${esc(tm)}${T_.k === 'ext' ? ' · extension' : ''}</div><h2 class="h3">${T_.done ? { signed: 'Deal done', pulled: 'They walked away', walked: 'You walked away' }[T_.done] : 'Their offer: ' + esc(ctDealTxt(T_.last))}</h2></div></div>`;
  if (T_.done) return `<section class="card next" id="x4ct">${head}${T_.done === 'signed' ? `<p>You signed: <b>${esc(ctDealTxt(T_.deal))}</b>.${T_.mode === 'self' ? ' You negotiated it yourself, so there is no agent fee on it.' : ''}</p>` : `<p>${T_.k === 'fa' ? 'That offer is off the table. The others are still there.' : 'No extension this year. You can still play out the deal and hit free agency.'}</p>`}${log}<button class="btn" data-act="x4ctclose">Close</button></section>`;
  const A = agentOf();
  if (!T_.mode) return `<section class="card next" id="x4ct">${head}<p class="small">How do you want to handle it?</p><div class="evopts">${Object.entries(CT_MODE).map(([k, [l, d]]) => `<button class="evopt" data-act="x4ctm" data-v="${k}" ${k !== 'self' && !A ? 'disabled' : ''}><b>${esc(l)}</b><span>${esc(k !== 'self' && !A ? 'You don\'t have an agent yet.' : d)}</span></button>`).join('')}</div>
    ${A ? `<p class="small muted mt">Your agent: <b>${esc(A.n)}</b> (${esc(A.t.toLowerCase())}), takes ${Math.round(A.fee * 100)}%.</p>` : `<div class="mt"><div class="lbl">Hire an agent</div><div class="evopts">${Object.entries(AGENTS).map(([k, a]) => `<button class="evopt" data-act="x4agent" data-v="${k}"><b>${esc(a.n)} · ${esc(a.t)}</b><span>${esc(a.d)}</span></button>`).join('')}</div></div>`}
    <div class="row gap mt"><button class="btn ghost sm" data-act="x4ctwalk">Never mind</button></div></section>`;
  if (T_.mode === 'agent') return `<section class="card next" id="x4ct">${head}${log}<p>${T_.deal ? `${esc(A ? A.n : 'Your agent')} has a deal: <b>${esc(ctDealTxt(T_.deal))}</b>.` : ''}</p>${cui.ctConf ? ctConfirmHTML(T_) : `<div class="row gap"><button class="btn primary" data-act="x4ctacc">Sign it</button><button class="btn ghost" data-act="x4ctwalk">Walk away</button></div>`}</section>`;
  const F = ctForm(); const adv = T_.mode === 'advice' && T_.adv ? `<div class="decision"><b>${esc(T_.adv.n)}'s read</b><p class="small">"I think they'll go to about <b>${money(T_.adv.lo)}–${money(T_.adv.hi)}</b> a year on a neutral structure. ${esc(T_.adv.yrsTip)} ${esc(T_.adv.gtdTip)}"</p></div>` : '';
  return `<section class="card next" id="x4ct">${head}${adv}${log}
   <div class="lbl mt">Start from a structure</div>${seg('x4ctp', F.st || '', Object.entries(CT_PRESET).map(([k, p]) => [k, p[0]]))}<p class="hint">${esc(F.st && CT_PRESET[F.st] ? CT_PRESET[F.st][1] : 'Your own numbers.')}</p>
   <div class="fgrid x4form"><label class="fld"><span>$M a year</span><input id="ct-apy" type="number" step="0.05" min="${(NFL_MIN / 1e6).toFixed(2)}" value="${(F.apy / 1e6).toFixed(2)}"></label><label class="fld"><span>Years</span><input id="ct-yrs" type="number" min="1" max="6" step="1" value="${F.yrs}"></label><label class="fld"><span>Signing bonus (% of the deal)</span><input id="ct-bonus" type="number" min="0" max="50" step="1" value="${Math.round(F.bonus * 100)}"></label><label class="fld"><span>Guaranteed (%)</span><input id="ct-gtd" type="number" min="0" max="100" step="5" value="${Math.round(F.gtd * 100)}"></label></div>
   <p class="small">${T_.pat > 0 ? `They'll talk for about ${T_.pat} more round${T_.pat === 1 ? '' : 's'}.` : 'Their last offer is final.'} Guaranteed money is paid even if you're cut; the signing bonus is paid now.</p>
   ${cui.ctConf ? ctConfirmHTML(T_) : `<div class="row gap wrap"><button class="btn primary" data-act="x4ctoff">Make your offer</button><button class="btn" data-act="x4ctacc">Take their offer</button><button class="btn ghost" data-act="x4ctwalk">Walk away</button></div>`}</section>`;
}
{
  const _nm = nflMoneyHTML; nflMoneyHTML = function () {
    let h = _nm.apply(this, arguments);
    try {
      const n = cs.nfl; const T_ = ctStore(); const busy = T_ && !T_.done;
      const tIdx = busy && T_.k === 'fa' ? ctIdx(T_) : -1;
      if (busy && T_.k === 'fa') { // one negotiation at a time: signing elsewhere or waiting has to wait (QOL-02)
        h = h.replace(/<button class="btn (?:primary|danger) sm" data-act="(?:cask2" data-k="fa-|cfa" data-i=")(\d+)">(?:Sign|Confirm: sign)<\/button>/g, (m, i) => +i === tIdx ? `<span class="pill maize">In talks</span>` : `<button class="btn sm" disabled title="Finish or end your talks with the ${esc(nflName(T_.tm))} first">Sign</button>`);
        h = h.replace(/<button class="btn" data-act="cfawait">([^<]*)<\/button>/, (m, t) => `<button class="btn" disabled title="Finish or end your talks first">${t}</button>`);
      } else h = h.replace(/data-k="fa-(\d+)">Sign<\/button>/g, (m, i) => `${m} <button class="btn sm" data-act="x4ct" data-k="fa" data-i="${i}" ${n.fa && n.fa.offers[+i] && n.fa.offers[+i].ctNo ? 'disabled title="You walked away from these talks"' : ''}>Negotiate</button>`);
      const ck = /^fa-(\d+)$/.exec(cui.confirm || ''); const co = ck && n.fa && !n.fa.done && n.fa.offers[+ck[1]];
      if (co && !busy) { const fee = agentFee(); h = h.replace('<div class="row gap mt">', `<p class="decision">You're about to sign with the ${esc(nflName(co.tm))}: <b>${money(co.apy)} a year for ${co.yrs} year${co.yrs > 1 ? 's' : ''}</b>${co.bonus ? `, with a ${money(co.bonus)} signing bonus` : ''}. ${fee ? `Your agent takes ${Math.round(fee * 100)}% (about ${money(Math.round(co.apy * co.yrs * fee / 10000) * 10000)}).` : 'No agent fee.'} Press Confirm to sign.</p><div class="row gap mt">`); }
      h = h.replace('<button class="btn" data-act="cext">Ask for an extension</button>', busy ? '' : '<button class="btn" data-act="x4ct" data-k="ext">Negotiate an extension</button>');
      const c = n.contract; if (c && c.st && !(n.fa && !n.fa.done)) h = h.replace('<div class="row gap">', `<p class="small">Structure: <b>${esc(CT_PRESET[c.st] ? CT_PRESET[c.st][0] : 'Standard')}</b> · ${ctPct(c.gtd)} guaranteed${c.noFee ? ' · you negotiated it yourself (no agent fee on it)' : ''}.</p><div class="row gap">`);
    } catch (e) { }
    return ctPanelHTML() + h;
  };
}
const ctScroll = () => setTimeout(() => { const el = document.getElementById('x4ct'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30);
// the ways out of a page that can't be drawn (QOL-05)
const xClip = t => (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject(new Error('no clipboard'))).then(() => true, () => false);
const xHint = t => { const el = document.getElementById('xerrhint'); if (el) el.textContent = t; };
Object.assign(actions, {
  xrepair() { const f = adViewFor(); const r = xRepairView(X(), f) || (xSanitize(state, X_SHAPE).length ? ['damaged optional data'] : null); let ok = !!r; try { f(); } catch (e) { ok = false; } after(ok ? `Reset: ${r.join(', ')}. The rest of your career is unchanged.` : 'The problem isn\'t in this page\'s optional data, so nothing was reset. Copy the details and a save code to keep a copy.'); },
  cxrepair() { const f = cViewFor(cui.tab); const r = xRepairView(CX(), f) || (xSanitize(cs, CX_SHAPE).length ? ['damaged optional data'] : null); let ok = !!r; try { f(); } catch (e) { ok = false; } cAfter(ok ? `Reset: ${r.join(', ')}. The rest of your career is unchanged.` : 'The problem isn\'t in this page\'s optional data, so nothing was reset. Copy the details and a save code to keep a copy.'); },
  xcopyerr() { const e = ui.viewErr || {}; xClip(`Football Empire ${e.v || ''} · tab ${e.tab || ''} · ${e.msg || ''}`).then(ok => xHint(ok ? 'Details copied.' : 'Copying was blocked by the browser. The details: ' + (e.msg || ''))); },
  async xexport() { const code = await makeCode(); xHint((await xClip(code)) ? 'A save code for this career was copied. Paste it somewhere safe.' : 'Copying was blocked. Use the Save file tab to create a save code.'); },
  async cxexport() { const code = await cMakeCode(); xHint((await xClip(code)) ? 'A save code for this career was copied. Paste it somewhere safe.' : 'Copying was blocked. Use the Saves tab to create a save code.'); },
});
Object.assign(actions, {
  x4ct(d) { const r = ctOpen(d.k, d.i != null ? +d.i : null); cui.ctForm = null; cui.confirm = null; cui.ctConf = null; if (r === 'ok') { cAfter(); ctScroll(); } else cAfter({ busy: 'Finish the talks you have going first.', gone: 'That offer is gone.', closed: 'You walked away from those talks.', later: 'The team wants to see one more season before talking about an extension.', no: '' }[r] || ''); },
  x4ctm(d) { const r = ctMode(d.v); if (r === 'agent') return cAfter('You need an agent for that.'); cui.ctForm = ctPresetDeal(d.v === 'self' || d.v === 'advice' ? 'neutral' : 'neutral'); cAfter(r === 'pulled' ? 'Your agent pushed too hard, and they walked away.' : ''); ctScroll(); },
  x4agent(d) { if (setAgent(d.v)) cAfter(`You signed with ${AGENTS[d.v].n}.`); },
  x4ctp(d) { cui.ctForm = ctPresetDeal(d.v); cui.ctConf = null; cAfter(); refocus({ act: 'x4ctp', v: d.v }); },
  // making an offer: check the boxes, then show exactly what you'd sign before it goes out (FE-03, QOL-01)
  x4ctoff() { const { F, errs } = ctRead(); if (errs.length) { cui.ctConf = null; return cAfter(`Check your offer: ${errs.join(' ')} Nothing was sent.`); } cui.ctConf = { k: 'offer', d: Object.assign({}, F) }; cAfter(); ctScroll(); },
  x4ctsend() { const C = cui.ctConf; cui.ctConf = null; if (!C || C.k !== 'offer') return cAfter(); const F = C.d; const r = ctOffer(Object.assign({}, F)); if (r === 'counter') { const T_ = ctStore(); cui.ctForm = Object.assign({}, F, { apy: Math.round((F.apy + T_.last.apy) / 2 / 10000) * 10000 }); } cAfter(r === 'signed' ? 'Deal done.' : r === 'pulled' ? 'They walked away.' : r === 'counter' ? 'They countered.' : r === 'gone' ? 'That team pulled its offer before the deal was signed.' : r === 'bad' ? 'That offer is missing something. Nothing was sent.' : ''); ctScroll(); },
  x4ctacc() { const T_ = ctStore(); if (!T_ || T_.done) return cAfter(); cui.ctConf = { k: 'accept' }; cAfter(); ctScroll(); },
  x4ctsign() { cui.ctConf = null; const r = ctAccept(); cAfter(r === 'signed' ? 'Deal done.' : r === 'gone' ? 'That team pulled its offer before the deal was signed.' : ''); ctScroll(); },
  x4ctback() { cui.ctConf = null; cAfter(); ctScroll(); },
  x4ctwalk() { ctWalk(); cui.ctConf = null; cAfter(); },
  x4ctclose() { const T_ = ctStore(); if (T_) T_.closed = true; cui.ctForm = null; cui.ctConf = null; cAfter(); },
});

/* ===================== IDEA-02: the Save health center ===================== */
// One place that checks every part of the open save, repairs the part that is bad (never the whole save), keeps the
// last good copy current and gives you a short diagnostic code to send with a bug report (no names, only checks).
// the function that draws AD tab k (the extras pages hand back a function; the rest come from a table)
function healthView(k) { const v = adViewFor(); return typeof v === 'function' ? v : v ? v[k] || v.office : null; }
function healthAD() {
  const out = []; const add = (id, label, ok, detail, fix) => out.push({ id, label, ok, detail, fix });
  if (!state) return out; const real = state, rng = RNG.s, tab0 = ui.tab;
  // 1. the core of the save
  try { const cl = JSON.parse(JSON.stringify(state)); state = cl; rebuildPMap(); checkIntegrity(cl); /* on a copy: drawing pages fills in defaults */ add('core', 'Core save data', true, 'Rosters, depth chart, schedule and settings check out.'); } catch (e) { add('core', 'Core save data', false, String(e.message || e), 'restore'); } finally { state = real; rebuildPMap(); rebuildConfs(); RNG.s = rng; }
  // 2. optional systems, one by one
  const bad = Object.keys(X_SHAPE).filter(k => state.x && state.x[k] != null && !xShapeOk(state.x[k], X_SHAPE[k]));
  add('extras', 'Optional systems', !bad.length, bad.length ? `Damaged: ${bad.map(k => X_NAME[k] || k).join(', ')}.` : `${Object.keys(state.x || {}).length} systems in use, all in shape.`, bad.length ? 'extras' : null);
  // 3. every page draws (on a copy, so nothing changes)
  const tabs = (isComm() ? commTabList() : isPro() ? PRO_TABS : TABS).map(t => t[0]); const fail = [];
  tabs.forEach(k => { try { state = JSON.parse(JSON.stringify(real)); rebuildPMap(); ui.tab = k; const f = healthView(k); if (typeof f === 'function') f(); } catch (e) { fail.push(k); } finally { state = real; rebuildPMap(); RNG.s = rng; } });
  ui.tab = tab0; rebuildConfs();
  const nm = k => { const t = (isComm() ? commTabList() : isPro() ? PRO_TABS : TABS).find(x => x[0] === k); return t ? t[1] : k; };
  add('pages', 'Every page draws', !fail.length, fail.length ? `Could not draw: ${fail.map(nm).join(', ')}.` : `${tabs.length} pages checked.`, fail.length ? 'pages' : null);
  // 4. the slot list and the spare copy
  const meta = slotsMeta()[slot]; add('slot', 'Slot list entry', !!meta && !meta.rebuilt, meta ? (meta.rebuilt ? 'The entry was rebuilt from the save itself.' : `Slot ${slot}: ${meta.name || ''}, ${meta.season || ''}.`) : 'This slot is missing from the slot list.', !meta || meta.rebuilt ? 'meta' : null);
  const g = goodCopy(NS_PREFIX[NS]); add('good', 'Last good copy', !!g && g.i === slot, g ? `Slot ${g.i}, kept ${goodWhen(g)}.${g.i !== slot ? ' It belongs to another slot.' : ''}` : 'None kept yet.', 'keep');
  // 5. room on this device
  let tot = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); tot += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch (e) { }
  const mine = ((lsGet(SLOT_KEY(slot)) || '').length) * 2; add('room', 'Storage on this device', tot < 4.2e6, `This save ${(mine / 1e6).toFixed(2)} MB; everything ${(tot / 1e6).toFixed(2)} MB of about 5 MB.`, tot >= 4.2e6 ? 'room' : null);
  return out;
}
function healthC() {
  const out = []; const add = (id, label, ok, detail, fix) => out.push({ id, label, ok, detail, fix }); if (!cs) return out;
  const bad = Object.keys(CX_SHAPE).filter(k => cs.x && cs.x[k] != null && !xShapeOk(cs.x[k], CX_SHAPE[k]));
  add('extras', 'Optional systems', !bad.length, bad.length ? `Damaged: ${bad.map(k => X_NAME[k] || k).join(', ')}.` : `${Object.keys(cs.x || {}).length} systems in use, all in shape.`, bad.length ? 'extras' : null);
  const real = cs, rng = RNG.s; const fail = []; CTABS.map(t => t[0]).filter(k => k !== 'settings').forEach(k => { try { cs = JSON.parse(JSON.stringify(real)); rosterCache.clear(); cViewFor(k)(); } catch (e) { fail.push(k); } finally { cs = real; RNG.s = rng; rosterCache.clear(); } });
  add('pages', 'Every page draws', !fail.length, fail.length ? `Could not draw: ${fail.map(k => (CTABS.find(t => t[0] === k) || [k, k])[1]).join(', ')}.` : `${CTABS.length - 1} pages checked.`, fail.length ? 'pages' : null);
  let meta = null; try { meta = (JSON.parse(lsGet(CMETA_KEY) || '{}') || {})[cslot]; } catch (e) { } add('slot', 'Slot list entry', !!meta && !meta.rebuilt, meta ? `Slot ${cslot}: ${meta.name || ''}.` : 'This slot is missing from the slot list.', !meta || meta.rebuilt ? 'meta' : null);
  const g = goodCopy('mfpc-'); add('good', 'Last good copy', !!g && g.i === cslot, g ? `Slot ${g.i}, kept ${goodWhen(g)}.` : 'None kept yet.', 'keep');
  return out;
}
function healthCode(list, mode) { const o = { v: PATCH_NOTES[0].v, m: mode, s: mode === 'pc' ? (cs && cs.year) : (state && state.season), ph: mode === 'pc' ? (cs && cs.phase) : (state && state.phase), c: list.map(x => x.id + (x.ok ? '+' : '-')).join(','), d: list.filter(x => !x.ok).map(x => x.detail.slice(0, 120)) }; try { return 'FE-' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))); } catch (e) { return 'FE-?'; } }
function healthHTML(career) {
  const H = career ? cui.health : ui.health; if (!H) return `<section class="card" id="xhealth"><div class="head"><div><div class="eyebrow">Save health</div><h2 class="h3">Check this save</h2></div><p class="hint">Looks at every part of the open save: the core data, each optional system, every page, the slot list, the spare copy${career ? '' : ' and the room left on this device'}. Nothing changes unless you press a repair button.</p></div><button class="btn sm" data-act="xhealth">Run the check</button></section>`;
  const bad = H.list.filter(x => !x.ok); const fixL = { extras: 'Reset the damaged systems', pages: 'Repair the pages', meta: 'Rebuild the slot list', keep: 'Keep this as the last good copy', restore: 'Restore the last good copy', room: 'Free up space' };
  return `<section class="card" id="xhealth"><div class="head"><div><div class="eyebrow">Save health · checked ${esc(H.at)}</div><h2 class="h3">${bad.length ? `${bad.length} thing${bad.length === 1 ? '' : 's'} to look at` : 'Everything checks out'}</h2></div><button class="btn ghost sm" data-act="xhealth">Check again</button></div>
   <ul class="plainlist">${H.list.map(x => `<li class="setrow"><div class="sl"><b>${x.ok ? '✓' : '✗'} ${esc(x.label)}</b><span class="hint">${esc(x.detail)}</span></div><div class="sctl">${x.fix && (!x.ok || x.fix === 'keep') ? `<button class="btn ${x.ok ? 'ghost' : 'primary'} sm" data-act="xhfix" data-k="${x.fix}">${esc(fixL[x.fix] || 'Fix')}</button>` : ''}</div></li>`).join('')}</ul>
   <details class="mt"><summary class="small">Diagnostic code (for a bug report)</summary><p class="small muted">It lists the checks and what failed: no names, no rosters. Copy it into your report.</p><textarea readonly rows="3" class="xcode" aria-label="Diagnostic code">${esc(H.code)}</textarea><button class="btn ghost sm" data-act="xhcopy">Copy</button></details></section>`;
}
{ const _vf = vFile; vFile = function () { return _vf.apply(this, arguments) + (state ? healthHTML(false) : ''); }; }
{ const _vs = vCSaves; vCSaves = function () { return _vs.apply(this, arguments) + (cs ? healthHTML(true) : ''); }; }
const healthAt = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function healthRun(career) { const list = career ? healthC() : healthAD(); const H = { list, at: healthAt(), code: healthCode(list, career ? 'pc' : isComm() ? 'comm' : isPro() ? (isCoach() ? 'nflcoach' : 'gm') : isCoach() ? 'coach' : 'ad') }; if (career) cui.health = H; else ui.health = H; return H; }
Object.assign(actions, {
  xhealth() { const c = appMode === 'career'; healthRun(c); render(); },
  async xhfix(d) {
    const c = appMode === 'career'; let msg = '';
    if (d.k === 'extras') { const f = c ? xSanitize(cs, CX_SHAPE) : xSanitize(state, X_SHAPE); msg = f.length ? `Reset: ${f.join(', ')}. Everything else is untouched.` : 'Nothing needed resetting.'; }
    else if (d.k === 'pages') { if (c) { const f = cValidateView() || []; msg = f.length ? `Repaired: ${f.join(', ')}.` : 'Every page draws now.'; } else { const tabs = (isComm() ? commTabList() : isPro() ? PRO_TABS : TABS).map(t => t[0]); const tab0 = ui.tab; const fixed = []; tabs.forEach(k => { ui.tab = k; const f = healthView(k); if (typeof f !== 'function') return; try { f(); } catch (e) { const r = xRepairView(X(), f); if (r) fixed.push(...r); } }); ui.tab = tab0; msg = fixed.length ? `Repaired: ${fixed.join(', ')}.` : 'No page could be repaired by resetting one optional system. Restore the last good copy, or send the diagnostic code.'; } }
    else if (d.k === 'meta') { const n = await repairSlotMeta(); msg = n ? 'The slot list was rebuilt.' : 'The slot list is fine.'; }
    else if (d.k === 'keep') { const raw = c ? lsGet(CSLOT_KEY(cslot)) : lsGet(SLOT_KEY(slot)); if (raw) { keepGood(c ? 'mfpc-' : NS_PREFIX[NS], c ? cslot : slot, raw); msg = 'This save is now the last good copy.'; } else msg = 'Save first, then keep it.'; }
    else if (d.k === 'restore') { const g = goodCopy(c ? 'mfpc-' : NS_PREFIX[NS]); if (!g) { msg = 'There is no last good copy to restore.'; } else return c ? actions.crestoregood({ i: g.i }) : actions.restoregood({ i: g.i }); }
    else if (d.k === 'room') { const n = dropGood(); msg = n ? 'Spare copies removed to free space. Delete old slots for more.' : 'Delete old save slots to free space.'; }
    if (c) { cSave(); healthRun(true); cAfter(msg); } else { save(); healthRun(false); after(msg); }
  },
  xhcopy() { const H = appMode === 'career' ? cui.health : ui.health; if (!H) return; try { navigator.clipboard.writeText(H.code).then(() => announce('Copied.'), () => announce('Select the code and copy it.')); } catch (e) { announce('Select the code and copy it.'); } },
});

/* ---------- IDEA-03: the negotiation layer on every contract screen ---------- */
function negStyleHTML(st, who) { const S = AGENT_ST[st] || AGENT_ST.fair; return `<p class="small"><span class="pill">${esc(S[0])}</span> ${esc(who)}: ${esc(S[1])}</p>`; }
function negPresetRow(mode, id, px) { return `<div class="row gap wrap negpre" role="group" aria-label="Deal presets">${Object.entries(NEG_PRE).map(([k, [l, d]]) => `<button class="btn ghost sm" data-act="negpre" data-m="${mode}" data-k="${k}" data-id="${esc(id)}" data-px="${px}" title="${esc(d)}">${esc(l)}</button>`).join('')}</div>`; }
function negLogHTML(key) { const L = negLogOf(key); return L.length ? `<details class="small mt"><summary>Talks so far (${L.length})</summary><ul class="plainlist">${L.map(e => `<li>${e.who === 'you' ? '<b>You</b> · ' : ''}${esc(e.txt.replace(/^You: /, ''))}</li>`).join('')}</ul></details>` : ''; }
{
  const _rs = proResignStep; proResignStep = function () { let h = _rs.apply(this, arguments); try { const p = ui.rsFor && P(ui.rsFor); if (p) { const a = '<div class="fgrid"><label class="fld"><span>$M a year</span><input id="rs-apy"'; h = h.replace(a, negPresetRow('gm', p.id, 'rs') + a).replace('data-act="rssub" data-id="' + p.id + '">Make the offer</button></div>', 'data-act="rssub" data-id="' + p.id + '">Make the offer</button></div>' + negLogHTML('gm:' + p.id)); } } catch (e) { } return h; };
  const _pm = proPlayerModal; proPlayerModal = function (id) { let h = _pm.apply(this, arguments); try { const a = '<div class="fgrid"><label class="fld"><span>$M a year</span><input id="ex-apy"'; if (h.includes(a)) h = h.replace(a, negPresetRow('gm', id, 'ex') + a).replace('<button class="btn ghost sm" data-act="pxcancel">Cancel</button></div>', '<button class="btn ghost sm" data-act="pxcancel">Cancel</button></div>' + negLogHTML('gm:' + id)); } catch (e) { } return h; };
  const _nv = negView; negView = function () { let h = _nv.apply(this, arguments); try { const n = ui.neg; const c = n && (n.ext ? state.staff[n.role] : (state.cands[n.role] || []).find(x => x.id === n.cid)); if (c) { const key = c.id || c.name; h = h.replace('<div class="stepper"><div class="lbl">Salary per year</div>', negStyleHTML(negStyle('ad', key), 'His approach') + negPresetRow('ad', key, 'ad') + '<div class="stepper"><div class="lbl">Salary per year</div>').replace('<div class="row gap mt"><button class="btn primary" data-act="negsubmit">', negLogHTML('ad:' + key) + '<div class="row gap mt"><button class="btn primary" data-act="negsubmit">'); } } catch (e) { } return h; };
}
// Coach: the same presets, the school's style and the log on the job talks
{ const _ng = negHTML; negHTML = function (o) { let h = _ng.apply(this, arguments); try { if (o && o.offer && o.offer.status === 'open') { h = h.replace('<div class="fgrid">', negStyleHTML(negStyle('coach', o.tid + ':' + o.role), o.lvl === 'nfl' || jobLvl(o) === 'nfl' ? 'The owner' : 'The AD') + negPresetRow('coach', o.id, 'ng') + '<div class="fgrid">'); } h = h.replace(/<\/section>$/, negLogHTML('coach:' + o.id) + '</section>'); } catch (e) { } return h; }; }
Object.assign(actions, {
  negpre(d) {
    const k = d.k; if (!NEG_PRE[k]) return; const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; } };
    if (d.m === 'gm') { const p = P(d.id); if (!p) return; const a = askFor(p, underContract(p)); const t = negPreset('gm', k, a); set(d.px + '-apy', t.apy); set(d.px + '-yrs', t.yrs); set(d.px + '-sh', t.sh); announce(`${NEG_PRE[k][0]} terms filled in. Nothing is sent until you make the offer.`); return; }
    if (d.m === 'ad') { const n = ui.neg; if (!n) return; const c = n.ext ? state.staff[n.role] : (state.cands[n.role] || []).find(x => x.id === n.cid); if (!c) return; const t = negPreset('ad', k, { sal: n.ext ? c.salary * 1.12 : c.salary, yrs: n.ext ? 3 : c.years, role: n.role }); Object.assign(n, t); openModal(negView()); announce(`${NEG_PRE[k][0]} terms filled in.`); return; }
    if (d.m === 'coach') { const o = marketJob(d.id); if (!o || !o.offer) return; const b = o.offer.k; const t = negPreset('coach', k, { sal: b.sal, yrs: b.yrs, buy: b.buy, exit: b.exit }); set('ng-sal', t.sal); set('ng-yrs', t.yrs); set('ng-buy', t.buy); set('ng-exit', t.exit); announce(`${NEG_PRE[k][0]} terms filled in. Nothing is sent until you send the counteroffer.`); }
  },
});

/* ---------- IDEA-11: the promise ledger on screen ---------- */
function prmHTML(compact) {
  const L = prmList(); if (!L.length && compact) return ''; const R_ = prmRecord(); const cred = Math.round(prmCred() * 100);
  const row = e => `<li><span class="pill ${e.st === 'kept' ? 'good' : e.st === 'broken' ? 'bad' : e.st === 'void' ? '' : 'maize'}">${e.st === 'open' ? 'Open' : e.st === 'kept' ? 'Kept' : e.st === 'broken' ? 'Broken' : 'Off'}</span> ${esc(e.txt)} <span class="small muted">· ${esc(PRM_K[e.k] || '')}, ${e.s}${e.st === 'open' && e.due ? ` · due ${e.due.wk ? 'week ' + e.due.wk + ', ' : ''}${e.due.s}` : ''}</span>${e.res ? `<div class="small muted">${esc(e.res)}</div>` : ''}</li>`;
  return `<section class="card" id="xprm"><div class="head"><div><div class="eyebrow">Promises</div><h2 class="h3">${R_.kept} kept · ${R_.broken} broken · ${R_.open} open</h2></div><p class="hint">Your word is worth ${cred}% right now. Every promise broken in the last two seasons makes the next one count less.</p></div>
   ${L.length ? `<ul class="plainlist small">${L.slice().reverse().slice(0, compact ? 6 : 40).map(row).join('')}</ul>` : '<p class="muted small">No promises yet. Promise a recruit early playing time from the recruiting board' + (isCoach() ? ', a player a bigger role in a meeting, or your AD that you\'re staying' : '') + '.</p>'}</section>`;
}
{ const _vr = vRecruit; vRecruit = function () { const h = _vr.apply(this, arguments); try { return state && state.rec && !isPro() && !isComm() ? h + prmHTML(true) : h; } catch (e) { return h; } }; }
{ const _vc = vCoachCareer; vCoachCareer = function () { const h = _vc.apply(this, arguments); try { const can = state.phase === 'offseason' && !prmOpen('stay', 'ad') && !(state.co.market && (state.co.market.done || state.co.market.take)); const boss = isPro() ? 'the owner' : 'the AD'; return h + (can ? `<section class="card"><div class="eyebrow">Your ${isPro() ? 'owner' : 'AD'}</div><h2 class="h3">Tell ${boss} you're staying</h2><p class="small">It buys job security now. Take another job this offseason and the promise is broken, and people around the sport will notice.</p><button class="btn sm" data-act="prmstay">Promise to stay</button></section>` : '') + prmHTML(false); } catch (e) { return h; } }; }
Object.assign(actions, {
  rpt(d) { const r = prmPromisePT(d.id); after(r === 'max' ? `You can promise playing time to ${PRM_PT_MAX} recruits a class.` : r === 'staff' ? 'That recruit belongs to another coach on the staff.' : r == null ? '' : `Promise made: +${r} interest. He expects to be on the two-deep by week 6 of his first season.`); },
  prmstay() { if (prmStay()) after('You told the AD you\'re staying. Job security went up.'); },
});

/* ---------- IDEA-12: milestones, mentors and what a career is remembered for ---------- */
function cStoryCardsHTML() {
  if (!cs || !cs.p || ['retired', 'done'].includes(cs.phase)) return ''; let out = '';
  const M = cMentorOffer(); if (M && M.st === 'offer') out += `<section class="card next"><div class="eyebrow">A veteran mentor</div><h2 class="h3">${esc(M.n)} offers to show you the ropes</h2><p class="small">He has been at ${esc(M.pos)} longer than anyone in the room. Learn from him and you pick up extra skill points through your first season, and the coaches see you listening.</p><div class="row gap"><button class="btn primary sm" data-act="cmentor" data-v="yes">Learn from him</button><button class="btn ghost sm" data-act="cmentor" data-v="no">Do it your own way</button></div></section>`;
  if (cs.lvl === 'hs') return out; const N = cMsNext().slice(0, 3); const have = Object.keys((cs.x && cs.x.ms) || {}).length;
  if (N.length) out += `<section class="card"><div class="eyebrow">${esc(cs.p.pos)} milestones · ${have} reached</div><ul class="plainlist small">${N.map(x => `<li><b>${x.n.toLocaleString()} ${esc(cmsLbl(x.k).toLowerCase())}</b><div class="ibar"><i style="width:${Math.min(100, Math.round(x.v / x.n * 100))}%"></i></div><span class="muted">${x.v.toLocaleString()} so far (college and pro)</span></li>`).join('')}</ul></section>`;
  return out;
}
{ const _h = vCHome; vCHome = function () { const h = _h.apply(this, arguments); try { return cStoryCardsHTML() + h; } catch (e) { return h; } }; }
{ const _hc = hallCHTML; hallCHTML = function () { const h = _hc.apply(this, arguments); try { const I = cIdentity(); const M = Object.entries((cs.x && cs.x.ms) || {}).sort((a, b) => a[1] - b[1]);
  return h + `<section class="card"><div class="eyebrow">Remembered as</div>${I.length ? `<ul class="plainlist small">${I.map(([n, d]) => `<li><span class="pill maize">${esc(n)}</span> ${esc(d)}</li>`).join('')}</ul>` : '<p class="muted small">Every career finds its story. Campus legend, transfer who made it, specialist, journeyman, iron man, late bloomer, mentor, Hall of Famer: yours is still being written.</p>'}</section>
   <section class="card"><div class="eyebrow">Milestones</div>${M.length ? `<ul class="plainlist small">${M.map(([id, y]) => { const [k, n] = id.split(':'); return `<li><b>${(+n).toLocaleString()} ${esc(cmsLbl(k).toLowerCase())}</b> <span class="muted">${y}</span></li>`; }).join('')}</ul>` : '<p class="muted small">None yet.</p>'}</section>`; } catch (e) { return h; } }; }
{ const _vr = vCRetired; vCRetired = function () { const h = _vr.apply(this, arguments); try { const I = cIdentity(); return I.length ? h + `<section class="card"><div class="eyebrow">Remembered as</div><ul class="plainlist small">${I.map(([n, d]) => `<li><span class="pill maize">${esc(n)}</span> ${esc(d)}</li>`).join('')}</ul></section>` : h; } catch (e) { return h; } }; }
Object.assign(actions, { cmentor(d) { const r = cMentorAnswer(d.v === 'yes'); if (r) cAfter(r === 'yes' ? 'You have a mentor for the season.' : 'You\'ll find your own way.'); } });

/* ---------- IDEA-09: tendencies and the game plan on the game-prep card ---------- */
function gpHTML() {
  const g = prepNext(); if (!g) return ''; const opp = g.h === ME ? g.a : g.h; const t = oppTend(opp); const sc = prepScout(g); const cur = gpCur(g); const used = cur.reduce((s, k) => s + GP_ITEMS[k][1], 0); const B = gpBudget();
  return `<div class="mt"><div class="lbl">Their tendencies</div><ul class="plainlist small"><li>Run on 1st down: <b>${t.run1}%</b> · Throw on 3rd and long: <b>${t.pass3}%</b></li><li>Blitz: <b>${t.blitz}%</b> of snaps · Deep shots: <b>${t.deep}%</b> of throws${t.mobile ? ' · <b>Their quarterback runs</b>' : ''}</li></ul>
   <div class="lbl mt">Game plan · install points ${used} of ${B}</div><div class="x3keys">${Object.entries(GP_ITEMS).map(([k, [l, c, , d]]) => { const on = cur.includes(k); const fit = gpFit(k, t, sc) && !['goal', 'tempo'].includes(k); return `<button class="evopt${on ? ' on' : ''}" data-act="gpset" data-v="${k}" aria-pressed="${on}"><b>${esc(l)}${fit ? ' ★' : ''}</b><span>${esc(d)} Costs ${c}.</span></button>`; }).join('')}</div>
   <p class="hint">★ answers one of their tendencies and is worth the most. A walkthrough day adds an install point; a worn-out team (fatigue 70+) loses one.</p></div>`;
}
{ const _pc = x3PrepCard; x3PrepCard = function () { const h = _pc.apply(this, arguments); try { if (!h) return h; const add = gpHTML(); return add ? h.replace(/<\/section>$/, add + '</section>') : h; } catch (e) { return h; } }; }
Object.assign(actions, { gpset(d) { const r = gpSet(d.v); if (r === 'budget') return after(`Not enough install points this week (${gpBudget()}).`); if (r) after(); } });

/* ---------- IDEA-13: the League health card (Commissioner) ---------- */
function cmHealthHTML() {
  const c = cm2(); const h = cmHealthNow(); const P_ = cmHealthProj(); const prev = (c.health || []).slice(-4)[0]; const tr = (a, b) => (b == null ? '' : a > b + 2 ? ' <span class="up">▲</span>' : a < b - 2 ? ' <span class="dn">▼</span>' : '');
  const bar = (lbl, v, good, hint) => `<div class="meter"><div class="mrow"><span class="lbl">${lbl}</span><span class="mval">${v}</span></div><div class="bar"><i class="${good ? (v >= 60 ? 'good' : v < 40 ? 'bad' : 'warn') : (v <= 30 ? 'good' : v >= 60 ? 'bad' : 'warn')}" style="width:${v}%"></i></div><p class="hint">${hint}</p></div>`;
  return `<section class="card" id="xcmh"><div class="eyebrow">League health</div><h2 class="h3">How your policies are shaping the league</h2>
   ${bar('Competitive balance' + tr(h.parity, prev && prev.parity), h.parity, true, `Team ratings spread ${h.sd} points; ${h.champs} different champions in the last five seasons. In three seasons, if nothing changes: about ${P_.parity}.`)}
   ${bar('Discipline consistency' + tr(h.cons, prev && prev.cons), h.n ? h.cons : 50, true, h.n ? `${h.n} rulings in the last two seasons, measured against your own precedents.` : 'Not enough rulings yet to judge.')}
   ${bar('Strike risk', h.strike, false, c.cba ? `The labor deal runs ${h.left > 0 ? h.left + ' more season' + (h.left === 1 ? '' : 's') : 'out this year'}. Union mood ${c.m.union}.` : 'There is no labor deal in place.')}
   ${bar('Market strain', h.strain, false, h.strain >= 40 ? `The ${esc(h.strainWho)} feel shortchanged by how the money is split.` : 'The money split sits fine with most of the league.')}
   ${bar('Player safety', h.safety, true, 'Safer rules mean fewer injuries; let it slide and the players notice.')}
   <p class="hint">${balOn() ? 'Each season these move the meters a little: balance with the fans, consistency with integrity, strain with the owners, safety with the players.' : 'On the Classic balance these readings are for information only.'}</p></section>`;
}
{ const _o = vCmOffice; vCmOffice = function () { const h = _o.apply(this, arguments); try { return h + cmHealthHTML(); } catch (e) { return h; } }; }

/* ===================== IDEA-08: exact resumable live games ===================== */
// While a live game runs, a snapshot of it (score, clock, drive log, box score, the pending decision and the random
// position) is kept in the save, at most every few seconds. Reload the page and the game is waiting where you left
// it: same clock, same score, same decision. Your own players are stored by id and linked back to the roster, so the
// snapshot never holds stale copies. A snapshot that no longer matches the week (or a damaged one) falls back to the
// old behavior: the game is played to the final from kickoff.
const LIVE_SNAP_V = 1;
function liveSnapOf(sim) {
  const ids = new Set(state.roster.map(p => p.id));
  const json = JSON.stringify(sim, function (k, v) { if (k === 'g' && v && v.id && v === sim.g) return { __g: v.id }; if (v && typeof v === 'object' && !Array.isArray(v) && v.id && ids.has(v.id) && v.pos && P(v.id) === v) return { __p: v.id }; return v; });
  return { v: LIVE_SNAP_V, wk: live.wk, gid: sim.g.id, s: state.season, rng: RNG.s, sim: json, ui: { halfOff: live.halfOff, halfDef: live.halfDef, halfSpeech: live.halfSpeech, benchQB: live.benchQB, prevPts: live.prevPts, lastLog: live.lastLog } };
}
function liveSnapLoad(S) {
  if (!S || S.v !== LIVE_SNAP_V || S.s !== state.season || S.wk !== state.week) return null; const mg = michGameThisWeek(S.wk); if (!mg || mg.id !== S.gid || mg.done) return null;
  let bad = false; const sim = JSON.parse(S.sim, (k, v) => { if (v && typeof v === 'object' && v.__g) return mg; if (v && typeof v === 'object' && v.__p) { const p = P(v.__p); if (!p) bad = true; return p || null; } return v; });
  if (bad || !sim || !Array.isArray(sim.pts) || !Array.isArray(sim.F)) return null; return { sim, mg };
}
let liveSnapT = 0;
function liveSnapSave(force) { try { if (!liveBusy() || !state || state.liveWk == null) return; const now = Date.now(); if (!force && now - liveSnapT < 4000) return; liveSnapT = now; state.liveSnap = liveSnapOf(live.sim); save(); } catch (e) { state.liveSnap = null; } }
{
  const _rl = renderLive; renderLive = function () { const r = _rl.apply(this, arguments); if (liveBusy() && live.sim && !live.sim.done) liveSnapSave(!!live.sim.pending); return r; };
  // when the save opens with an unfinished game: bring it back instead of playing it out
  const _sl = settleLiveGame; settleLiveGame = function () {
    const S = state && state.liveSnap; state.liveSnap = null;
    try { if (S && state.liveWk != null) { const L = liveSnapLoad(S); if (L) { RNG.s = S.rng >>> 0; Object.assign(live, { sim: L.sim, wk: S.wk, mg: L.mg, finished: false, paused: true, heldPause: true, open: false, flash: '' }, S.ui || {}); live.callPlays = live.sim.callPlays; state.liveSnap = S; ui.flash = `Your live game against ${teamName(oppOf(L.mg))} is waiting where you left it (${liveScoreText()}).`; return; } } } catch (e) { }
    return _sl.apply(this, arguments);
  };
  // a finished game drops its snapshot
  const _fl = liveFinish; liveFinish = function () { if (state) state.liveSnap = null; return _fl.apply(this, arguments); };
}

/* ===================== IDEA-15: shareable league snapshots ===================== */
// Turn the league you're playing into a challenge someone else can start from: the same teams, rosters, money and
// history, with goals and a deadline you pick, checked the same way as a built challenge. The code starts with FECH.
// Starting one uses a free save slot and labels it, so your own careers are never touched.
function shareGoalsMode() { return isPro() ? 'gm' : isComm() || isCoach() ? null : 'ad'; }
function shareChalHTML() {
  const m = shareGoalsMode(); if (!m || !state) return ''; const f = ui.shc || (ui.shc = { l: '', yrs: 2, goals: {} }); const v = scnValidate({ mode: m, l: f.l || `${myName()} from ${state.season}`, tid: ME, yrs: f.yrs, goals: f.goals, start: {} });
  return `<section class="card" id="xshare"><div class="eyebrow">Share this league as a challenge</div><h2 class="h3">Let someone start where you are</h2><p class="hint">They get this league as it stands now (teams, rosters, money and history) with the goals you pick. Your own save isn't changed.</p>
   <div class="grid2"><label class="fld"><span>Name</span><input data-shc="l" maxlength="40" value="${esc(f.l)}" placeholder="${esc(myName() + ' from ' + state.season)}"></label><label class="fld"><span>Deadline (seasons)</span><select data-shc="yrs">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${+f.yrs === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
   <div class="x2cg">${Object.entries(SCN_GOALS[m]).filter(([k]) => k !== 'capOk').map(([k, G]) => { const on = f.goals[k] != null; const fixed = G[1] === G[2]; return `<label class="chk"><input type="checkbox" data-shcg="${k}" ${on ? 'checked' : ''}> ${esc(G[0].replace('{n}', fixed ? String(G[1]) : '…'))}</label>${on && !fixed ? `<input class="x2cn" data-shcn="${k}" type="number" min="${G[1]}" max="${G[2]}" value="${esc(f.goals[k])}">` : ''}`; }).join('')}</div>
   ${v.errs && v.errs.length ? `<ul class="small plainlist bad mt">${v.errs.filter(e => !/Pick a/.test(e) || /goal/.test(e)).map(e => `<li>· ${esc(e)}</li>`).join('')}</ul>` : ''}
   <div class="row gap mt"><button class="btn sm" data-act="shcmake" ${v.def ? '' : 'disabled'}>Make the challenge code</button></div>${ui.shcCode ? `<textarea readonly rows="3" class="xcode mt" aria-label="Challenge code">${esc(ui.shcCode)}</textarea><p class="small muted">${(ui.shcCode.length / 1024).toFixed(0)} KB. Paste it into "Play a shared challenge" on the Home screen.</p>` : ''}</section>`;
}
async function shareChalMake() {
  const m = shareGoalsMode(); const f = ui.shc || {}; const v = scnValidate({ mode: m, l: f.l || `${myName()} from ${state.season}`, tid: ME, yrs: f.yrs, goals: f.goals, start: {} }); if (!v.def) return null;
  state.rng = RNG.s; const c = JSON.parse(JSON.stringify(state)); c.x = c.x || {}; c.x.scn = { k: 'custom', def: Object.assign({}, v.def, { d: `A shared league: ${v.def.l}.`, shared: true }), goals: v.def.goals.map((g, i) => ({ id: i, st: 'open' })), res: null, s0: state.season, c0: null };
  ['dj', 'jr', 'prm', 'neg', 'edited'].forEach(k => { delete c.x[k]; }); c.x.shared = { from: state.season, t: Date.now() }; c.liveWk = null; c.liveRng = null; c.liveSnap = null;
  return encodeCode(JSON.stringify(c), 'FECH');
}
async function shareChalStart(code) {
  let cand; try { cand = await decodeCode(code, 'FECH'); } catch (e) { return e.message; }
  if (!cand || !cand.x || !cand.x.shared || !cand.x.scn || cand.x.scn.k !== 'custom') return 'That is not a shared challenge code.';
  const chk = scnValidate(Object.assign({}, cand.x.scn.def, { goals: Object.fromEntries((cand.x.scn.def.goals || []).map(g => [g[0], g[3]])) })); if (!chk.def) return 'The challenge in that code does not check out: ' + chk.errs.join(' ');
  if (appMode === 'career' && !(await leaveMode())) return ''; if (appMode === 'ad' && state && !saveBlocked && !(await saveNow())) return AD_SAVE_FAIL;
  switchNS('ad'); const free = firstFreeSlot(); if (!free) return 'All five AD save slots are in use. Delete one on the Save file tab, then start the challenge.';
  const prevSlot = slot; setActiveSlot(free); try { adoptState(cand); } catch (e) { setActiveSlot(prevSlot); return 'That league could not be loaded: ' + e.message; }
  appMode = 'ad'; rngOwner = 'ad'; resetUi(); ui.tab = isPro() ? 'off' : 'office'; hideModal(); applyTheme(); save(); await flushSave(); ui.flash = `Shared challenge: ${cand.x.scn.def.l} (slot ${free}). Your goals are on the office page.`; render(); window.scrollTo(0, 0); return null;
}
{ const _vf = vFile; vFile = function () { const h = _vf.apply(this, arguments); try { return h + (state ? shareChalHTML() : ''); } catch (e) { return h; } }; }
{ const _sh = x2ScnHomeHTML; x2ScnHomeHTML = function () { const h = _sh.apply(this, arguments); return h.replace(/<\/section>$/, `<details class="mt"><summary><b>Play a shared challenge</b> <span class="small muted">paste a code that starts with FECH</span></summary><textarea id="shcin" rows="3" class="xcode mt" aria-label="Shared challenge code"></textarea>${ui.shcErr ? `<p class="small bad">${esc(ui.shcErr)}</p>` : ''}<div class="row gap mt"><button class="btn sm" data-act="shcstart">Start it</button></div></details></section>`); }; }
document.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset || !ui.shc) return; let hit = true; const f = ui.shc;
  if (t.dataset.shc) f[t.dataset.shc] = t.value; else if (t.dataset.shcg) { const G = SCN_GOALS[shareGoalsMode()][t.dataset.shcg]; if (t.checked) f.goals[t.dataset.shcg] = G ? G[3] : 1; else delete f.goals[t.dataset.shcg]; } else if (t.dataset.shcn) f.goals[t.dataset.shcn] = t.value; else hit = false;
  if (hit) { ui.shcCode = ''; render(); } });
Object.assign(actions, {
  async shcmake() { const c = await shareChalMake(); ui.shcCode = c || ''; render(); },
  async shcstart() { const el = document.getElementById('shcin'); const r = await shareChalStart(el ? el.value : ''); if (r) { ui.shcErr = r; render(); } else ui.shcErr = ''; },
});

/* ---------- IDEA-16: the camp cards ---------- */
function campHTML() {
  if (!campOk()) return ''; const C = campStore(); const cost = campCost();
  if (C.done) { const R_ = Object.values(C.res).sort((a, b) => b.grade - a.grade); return `<section class="card" id="xcamp"><div class="eyebrow">Summer camp · ${state.season}</div><h2 class="h3">${R_.length} recruits worked out</h2><div class="tw"><table class="mini wide"><thead><tr><th>Recruit</th><th>Pos</th><th class="num">Camp grade</th><th class="num">40</th></tr></thead><tbody>${R_.map(x => `<tr><td>${esc(x.n)}</td><td>${esc(x.pos)}</td><td class="num"><b>${x.grade}</b></td><td class="num">${x.f.toFixed(2)}</td></tr>`).join('')}</tbody></table></div><p class="hint">Campers are read exactly on the board from now on.</p></section>`; }
  const pool = state.rec.list.filter(r => r.status === 'open' && (!isCoach() || typeof canRecruit !== 'function' || canRecruit(r.pos))).sort((a, b) => (C.inv.includes(b.id) - C.inv.includes(a.id)) || b.star - a.star || b.interest - a.interest).slice(0, 14);
  return `<section class="card" id="xcamp"><div class="head"><div><div class="eyebrow">Summer camp · ${C.inv.length} of ${CAMP_MAX} invited</div><h2 class="h3">Host a camp</h2></div><p class="hint">Once a season. Campers run drills in front of your staff, so you get an exact read on them, and a trip to campus lifts their interest. Costs ${fm(cost)}.</p></div>
   <div class="row gap wrap">${pool.map(r => { const on = C.inv.includes(r.id); return `<button class="tog${on ? ' on' : ''}" data-act="campinv" data-id="${r.id}" aria-pressed="${on}">${esc(r.pos)} ${esc(r.n)} · ${r.star}★</button>`; }).join('')}</div>
   <div class="row gap mt"><button class="btn primary sm" data-act="camprun" ${C.inv.length ? '' : 'disabled'}>Hold the camp (${fm(cost)})</button></div></section>`;
}
function pcampHTML() {
  if (!pcampOk()) return ''; const C = pcampStore(); const L = PS();
  if (C.done) { const R_ = Object.values(C.res); return `<section class="card" id="xpcamp"><div class="eyebrow">Prospect camp · ${C.yr}</div><h2 class="h3">${R_.length} prospects worked out</h2><div class="tw"><table class="mini wide"><thead><tr><th>Prospect</th><th>Pos</th><th class="num">OVR / POT</th><th class="num">40</th></tr></thead><tbody>${R_.map(x => `<tr><td>${esc(x.n)}</td><td>${esc(x.pos)}</td><td class="num"><b>${x.ovr}</b> / ${x.pot}</td><td class="num">${x.f.toFixed(2)}</td></tr>`).join('')}</tbody></table></div></section>`; }
  const pool = L.dc.list.filter(p => !p.taken && p.cr > 64 && effSc(p) < 3).sort((a, b) => (C.inv.includes(b.id) - C.inv.includes(a.id)) || a.cr - b.cr).slice(0, 14);
  return `<section class="card" id="xpcamp"><div class="head"><div><div class="eyebrow">Prospect camp · ${C.inv.length} of ${PCAMP_MAX} invited</div><h2 class="h3">Find a late-round sleeper</h2></div><p class="hint">Once a draft season, for prospects outside the top 64. Everyone who comes gets a full read.</p></div>
   <div class="row gap wrap">${pool.map(p => { const on = C.inv.includes(p.id); return `<button class="tog${on ? ' on' : ''}" data-act="pcampinv" data-id="${p.id}" aria-pressed="${on}">${esc(p.pos)} ${esc(p.n)} · No. ${p.cr}</button>`; }).join('')}</div>
   <div class="row gap mt"><button class="btn primary sm" data-act="pcamprun" ${C.inv.length ? '' : 'disabled'}>Hold the camp</button></div></section>`;
}
{ const _vr = vRecruit; vRecruit = function () { const h = _vr.apply(this, arguments); try { return h + campHTML(); } catch (e) { return h; } }; }
{ const _vd = vProDraft; vProDraft = function () { const h = _vd.apply(this, arguments); try { return h + pcampHTML(); } catch (e) { return h; } }; }
Object.assign(actions, {
  campinv(d) { const r = campInvite(d.id); if (r === 'full') return after(`A camp holds ${CAMP_MAX} recruits.`); if (r === 'staff') return after('That recruit belongs to another coach on the staff.'); if (r) after(); },
  camprun() { const C = campRun(); if (C) after(`Camp done: ${Object.keys(C.res).length} recruits worked out.`); },
  pcampinv(d) { const r = pcampInvite(d.id); if (r === 'full') return after(`A camp holds ${PCAMP_MAX} prospects.`); if (r) after(); },
  pcamprun() { const C = pcampRun(); if (C) after(`Camp done: ${Object.keys(C.res).length} prospects worked out.`); },
});

/* ---------- IDEA-07: the eras of your league ---------- */
function erasHTML() { const E = (state && state.eras) || []; if (!E.length && !erasOn()) return ''; return `<section class="card" id="xeras"><div class="eyebrow">Eras</div><h2 class="h3">${E.length ? `${E.length} era${E.length === 1 ? '' : 's'} so far` : 'The first era is still to come'}</h2>${E.length ? `<ol class="plainlist small">${E.slice().reverse().map(e => `<li><b>${e.s}</b> <span class="pill">${esc(ERA_N[e.k] || 'Era')}</span> ${esc(e.txt)}</li>`).join('')}</ol>` : `<p class="small muted">${isComm() ? 'Your biggest calls (TV deals, labor deals, realignment) will mark the eras of your league.' : `The sport changes every six to eight seasons. Next change expected around ${state.eraNext || state.season + 6}.`}</p>`}</section>`; }
{ const _lh = vLgHist; vLgHist = function () { const h = _lh.apply(this, arguments); try { return erasHTML() + h; } catch (e) { return h; } }; }
{ const _ha = hallADHTML; hallADHTML = function () { const h = _ha.apply(this, arguments); try { return h + erasHTML(); } catch (e) { return h; } }; }

/* ===================== QOL-20 (rest): stop conditions for multi-week sims ===================== */
// "Sim to…" now also stops for the things you'd want to see yourself: a starter hurt for two weeks or more, the board
// or the fans turning on you, a promise coming due, or a committed recruit flipping. Each can be switched off.
const STOP_K = { inj: 'A starter is hurt for 2+ weeks', danger: 'Your job gets shaky', promise: 'A promise comes due', flip: 'A commit flips' };
// the rarer, bigger moments stop by default; injuries and flips are yours to switch on
function stopSet() { const X_ = X(); return X_.stops || (X_.stops = { inj: false, danger: true, promise: true, flip: false }); }
function stopSnap() { const st = new Set(POS_ORDER.flatMap(pos => (state.depth[pos] || []).slice(0, START[pos] || 1))); return { hurt: new Set(state.roster.filter(p => st.has(p.id) && p.inj >= 2).map(p => p.id)), board: state.meters ? state.meters.board : 60, hot: state.meters ? state.meters.hot : 0, sec: state.co ? state.co.sec : 60, flips: state.rec ? state.rec.list.filter(r => r.status === 'lost').length : 0, wk: state.week, s: state.season }; }
function stopHit(S) {
  const on = stopSet(); if (state.week === S.wk && state.season === S.s) return null; const st = new Set(POS_ORDER.flatMap(pos => (state.depth[pos] || []).slice(0, START[pos] || 1)));
  if (on.inj) { const p = state.roster.find(x => st.has(x.id) && x.inj >= 2 && !S.hurt.has(x.id)); if (p) return `Stopped: ${p.pos} ${p.n} is hurt (${p.inj} weeks).`; }
  if (on.danger) { if (state.meters && S.board >= 35 && state.meters.board < 35) return 'Stopped: the board\'s confidence has dropped below 35.'; if (state.meters && S.hot < 70 && state.meters.hot >= 70) return 'Stopped: the hot seat is above 70.'; if (isCoach() && state.co && S.sec >= 35 && state.co.sec < 35) return 'Stopped: your job security is below 35.'; }
  if (on.promise && typeof prmList === 'function') { const e = prmList().find(x => x.st === 'open' && x.due && x.due.s === state.season && x.due.wk === state.week); if (e) return `Stopped: a promise comes due this week (${e.txt}).`; }
  if (on.flip && state.rec) { const L = state.rec.list.filter(r => r.status === 'lost' && r.star >= 4 && r.to && r.to !== 'grayshirt'); if (state.rec.list.filter(r => r.status === 'lost').length > S.flips && L.length) { const r = L[L.length - 1]; return `Stopped: ${r.star}-star ${r.pos} ${r.n} went elsewhere.`; } }
  return null;
}
{
  const _su = simUntil; simUntil = function (cond) { const S = stopSnap(); ui.stopWhy = null; return _su.call(this, () => { if (cond()) return true; const w = stopHit(S); if (w) { ui.stopWhy = w; return true; } return false; }); };
  ['simreg', 'simloss', 'simpost', 'simdec'].forEach(k => { const f = actions[k]; if (!f) return; actions[k] = function () { const r = f.apply(this, arguments); if (ui.stopWhy) { const m = ui.stopWhy; ui.stopWhy = null; after(m); } return r; }; });
}
function stopMenuHTML() { const on = stopSet(); return `<div class="mlabel">Also stop when</div>${Object.entries(STOP_K).map(([k, l]) => `<label class="chk small"><input type="checkbox" data-stopk="${k}" ${on[k] ? 'checked' : ''}> ${esc(l)}</label>`).join('')}`; }
document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.stopk && state) { stopSet()[t.dataset.stopk] = !!t.checked; save(); } });

/* ===================== QOL-13 (rest): compare recruits side by side ===================== */
// Pick up to three recruits (⇄ on the board) and see them side by side: ratings (as your scouts read them), scheme
// fit, where he'd slot on your depth chart today, whether he'd likely redshirt, how badly you need the position,
// his interest and any promise you made.
function recCmpHTML() {
  if (!state || !state.rec) return ''; const L = state.rec.list.filter(r => r.cmp); if (L.length < 2) return '';
  const slot = r => { const mates = state.roster.filter(p => p.pos === r.pos).map(p => p.ovr).sort((a, b) => b - a); const v = typeof recView === 'function' ? recView(r).mid : r.ovr; const rank = mates.filter(o => o > v).length + 1; return { rank, rs: rank > (START[r.pos] || 1) * 2 }; };
  const need = r => { const n = typeof needScore === 'function' ? needScore(r.pos) : 0; return n >= 8 ? 'High' : n >= 3 ? 'Some' : 'Low'; };
  const cell = r => { const v = typeof recView === 'function' ? recView(r) : { lo: r.ovr, hi: r.ovr, plo: r.pot, phi: r.pot }; const w = recWhy(r); const fit = (w.pro || []).find(x => /^fits/.test(x)); const s = slot(r);
    return [`${r.pos} · ${r.star}★`, v.lo === v.hi ? String(v.lo) : `${v.lo}–${v.hi}`, v.plo === v.phi ? String(v.plo) : `${v.plo}–${v.phi}`, fit ? fit.replace(/^fits your /, 'Fits ') : '—', `No. ${s.rank} at ${r.pos}`, s.rs ? 'Likely' : 'Unlikely', need(r), String(r.interest), r.pt ? 'Playing time' : '—']; };
  const lbl = ['Position', 'OVR', 'POT', 'Scheme fit', 'Depth chart today', 'Redshirt year', 'Need at position', 'Interest', 'Your promise']; const C = L.map(cell);
  return `<section class="card" id="xcmp"><div class="head"><div><div class="eyebrow">Compare recruits</div><h2 class="h3">${L.map(r => esc(r.n)).join(' · ')}</h2></div><button class="btn ghost sm" data-act="rcmpclear">Clear</button></div><div class="tw"><table class="mini wide"><thead><tr><th></th>${L.map(r => `<th>${esc(r.n)}</th>`).join('')}</tr></thead><tbody>${lbl.map((l, i) => `<tr><td class="muted">${l}</td>${C.map(c => `<td>${esc(c[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
{ const _vr = vRecruit; vRecruit = function () { const h = _vr.apply(this, arguments); try { const c = recCmpHTML(); return c ? c + h : h; } catch (e) { return h; } }; }
Object.assign(actions, {
  rcmp(d) { const r = state.rec && state.rec.list.find(x => x.id === d.id); if (!r) return; if (!r.cmp && state.rec.list.filter(x => x.cmp).length >= 3) return after('Compare up to three recruits at a time.'); r.cmp = !r.cmp; after(); },
  rcmpclear() { if (state.rec) state.rec.list.forEach(r => { delete r.cmp; }); after(); },
});

/* ===================== QOL-19 (rest): one career money plan ===================== */
// Everything about money in one place on the Player page: what you have, what's coming in the next year (NIL or
// salary, after your agent's cut), the guaranteed money left on your deal, and what the training programs cost.
function cMoneyPlanHTML() {
  if (!cs || !cs.p || cs.lvl === 'hs') return ''; const p = cs.p; const fee = agentFee(); const yr = (cs.nilLog || []).filter(e => e.y === cs.year); const inc = yr.filter(e => e.amt > 0).reduce((s, e) => s + e.amt, 0), out = -yr.filter(e => e.amt < 0).reduce((s, e) => s + e.amt, 0);
  const rows = []; if (cs.nfl && cs.nfl.contract) { const c = cs.nfl.contract; rows.push(['NFL salary (next 12 months)', c.apy * (1 - (c.noFee ? 0 : fee))]); if (c.gtd && c.left > 0) rows.push(['Guaranteed money left on your deal', c.apy * c.left * c.gtd * (c.noFee ? 1 : 1 - fee)]); }
  else if (cs.col && cs.col.nil) rows.push(['NIL deal (next 12 months)', cs.col.nil * (1 - fee)]);
  const tr = TRAIN.map(t => [t.name, trainCost(t), t.desc]).sort((a, b) => a[1] - b[1]);
  return `<section class="card" id="xmoney"><div class="eyebrow">Money plan</div><div class="tiles"><div><span class="k">In the bank</span><span class="v">${esc(money(p.bank || 0))}</span></div><div><span class="k">This year in</span><span class="v">${esc(money(inc))}</span><span class="s">out ${esc(money(out))}</span></div><div><span class="k">Career earnings</span><span class="v">${esc(money(p.earned || 0))}</span></div></div>
   ${rows.length ? `<table class="mini wide mt">${rows.map(([l, v]) => `<tr><td>${esc(l)}</td><td class="num"><b>${esc(money(v))}</b></td></tr>`).join('')}</table>` : ''}
   <p class="small mt">${agentOf() ? `Your agent, ${esc(agentOf().n)}, takes ${Math.round(fee * 100)}% of salary and deals (not on a deal you negotiated yourself).` : 'No agent: you keep everything, but you negotiate alone.'}</p>
   <details class="small"><summary>What training costs this offseason (two programs a year)</summary><ul class="plainlist">${tr.map(([n, c, d]) => `<li><b>${esc(n)}</b> · ${esc(money(c))} · ${esc(d)}</li>`).join('')}</ul></details></section>`;
}
{ const _vp = vCPlayer; vCPlayer = function () { const h = _vp.apply(this, arguments); try { return h + cMoneyPlanHTML(); } catch (e) { return h; } }; }
// the coach's week, on the office
function coHoursHTML() { if (!coHoursOn()) return ''; const u = coHoursUsed(); const l = CO_HOURS - u; return `<section class="card"><div class="eyebrow">Your week · ${u} of ${CO_HOURS} hours used</div><div class="bar"><i class="${l <= 4 ? 'bad' : l <= 10 ? 'warn' : 'good'}" style="width:${Math.min(100, Math.round(u / CO_HOURS * 100))}%"></i></div><p class="hint">A road trip takes ${CO_COST.trip} hours, a home visit ${CO_COST.hv}, a player meeting ${CO_COST.meet}, an install walkthrough ${CO_COST.inst}, each game-plan point ${CO_COST.gp}. What you don't get to, your staff handles the usual way.</p></section>`; }
{ const _co = vCoachOffice; vCoachOffice = function () { const h = _co.apply(this, arguments); try { const c = coHoursHTML(); return c ? c + h : h; } catch (e) { return h; } }; }
{ const _gp = actions.gpset; actions.gpset = function (d) { if (gpSet === undefined) return; const r0 = coHoursOn() && GP_ITEMS[d.v] && !gpCur(prepNext()).includes(d.v) && coHoursLeft() < GP_ITEMS[d.v][1] * CO_COST.gp; if (r0) return after(CO_NOTIME); return _gp.apply(this, arguments); }; }
['cotrip', 'cowatch'].forEach(k => { const f = actions[k]; if (!f) return; actions[k] = function () { if (coNoTime(CO_COST.trip)) return after(CO_NOTIME); return f.apply(this, arguments); }; });

