/* ===================== ADMIN PANEL ===================== */
function fld(label, target, key, val, type, opts) {
  type = type || 'number'; opts = opts || {};
  const id = 'adm-' + target.replace(/[^a-z0-9]/gi, '') + '-' + key.replace(/[^a-z0-9]/gi, '');
  if (type === 'select') return `<label class="fld" for="${id}"><span>${label}</span><select id="${id}" data-adm="${target}" data-k="${key}">${opts.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></label>`;
  if (type === 'checkbox') return `<label class="fld chk" for="${id}"><input type="checkbox" id="${id}" data-adm="${target}" data-k="${key}" ${val ? 'checked' : ''}><span>${label}</span></label>`;
  return `<label class="fld" for="${id}"><span>${label}</span><input id="${id}" type="${type}" data-adm="${target}" data-k="${key}" value="${esc(val)}" ${opts.step ? `step="${opts.step}"` : ''} ${opts.min != null ? `min="${opts.min}"` : ''} ${opts.max != null ? `max="${opts.max}"` : ''}></label>`;
}
function admSet(target, key, el) {
  const raw = el.type === 'checkbox' ? el.checked : el.value;
  const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const [kind, id] = target.split(':');
  if (kind === 'p') {
    const p = P(id); if (!p) return;
    if (key === 'pos') { if (raw !== p.pos) { state.depth[p.pos] = state.depth[p.pos].filter(x => x !== p.id); p.pos = raw; p.tr = genTraits(raw, p.ovr); state.depth[raw].push(p.id); ui.admPos = raw; ui.admP = p.id; } }
    else if (key.startsWith('tr.')) { const n = num(raw); if (n != null) p.tr[key.slice(3)] = clamp(Math.round(n), 1, 99); }
    else if (['n', 'cls', 'home', 'ht'].includes(key)) p[key] = String(raw).trim() || p[key];
    else { const n = num(raw); if (n == null) return; p[key] = ['pay'].includes(key) ? r2(Math.max(0, n)) : ['ovr', 'pot'].includes(key) ? clamp(Math.round(n), 1, 99) : Math.max(0, Math.round(n)); if (key === 'ovr' && p.pot < p.ovr) p.pot = p.ovr; }
  } else if (kind === 'c') {
    const c = state.staff[id]; if (!c) return;
    if (key === 'name' || key === 'title') c[key] = String(raw).trim() || c[key]; else { const n = num(raw); if (n == null) return; c[key] = key === 'salary' ? r1(Math.max(0, n)) : key === 'years' ? Math.max(0, Math.round(n)) : clamp(Math.round(n), 1, 99); }
  } else if (kind === 'fin') { const n = num(raw); if (n == null) return; state.fin[key] = key === 'balance' || key === 'collective' || key === 'recruit' || key === 'extraRev' ? r1(n) : Math.round(n); }
  else if (kind === 'm') { const n = num(raw); if (n != null) state.meters[key] = clamp(Math.round(n), 0, 100); }
  else if (kind === 'f') { const f = state.facilities.find(x => x.id === id); const n = num(raw); if (f && n != null) f.lvl = clamp(Math.round(n), 1, 5); }
  else if (kind === 't') {
    const t = T(id); if (!t) return;
    if (key === 'name') { t.name = String(raw).trim() || t.name; if (id === ME && state.me) state.me.name = t.name; save(); render(); return; }
    if (key === 'conf') { t.conf = raw; rebuildConfs(); addNews(`Admin: ${t.name} moves to the ${CONFS[raw].name}.`); save(); render(); return; }
    const n = num(raw); if (n == null) return;
    if (key.startsWith('style.')) t.style[key.slice(6)] = n; else if (key.startsWith('star.')) { const [, i, f] = key.split('.'); if (t.stars[+i]) t.stars[+i][f] = clamp(Math.round(n), 1, 99); }
    else { t[key] = ['w', 'l', 'cw', 'cl', 'pf', 'pa'].includes(key) ? Math.max(0, Math.round(n)) : key === 'elo' ? Math.round(n) : r1(n); if (key === 'rating') { t.off = r1(n); t.def = r1(n); } }
  } else if (kind === 'r') {
    const r = state.rec && state.rec.list.find(x => x.id === id); if (!r) return;
    if (key === 'status') { r.status = raw; if (raw === 'mc' || raw === 'signed') r.offered = true; } else { const n = num(raw); if (n != null) r[key] = key === 'star' ? clamp(Math.round(n), 1, 5) : clamp(Math.round(n), 1, 99); }
  } else if (kind === 'set') { if (key === 'seed') { const n = num(raw); if (n == null || n < 0) return; setSeed(Math.floor(n)); state.seed = RNG.s; } else if (key.startsWith('playoff.')) { state.settings.playoff = state.settings.playoff || { size: 12, auto: 'p4g6' }; state.settings.playoff[key.slice(8)] = key === 'playoff.size' ? +raw : raw; } else state.settings[key] = raw; if (key === 'sound' && raw) sfx('whistle'); }
  else if (kind === 'g') { const g = state.games.find(x => x.id === id); if (!g || g.done) return; if (key === 'w') { if (raw === 'none') delete g.force; else g.force = Object.assign(g.force || {}, { w: raw }); } else { const n = num(raw); if (!g.force) g.force = {}; g.force[key] = n == null ? null : Math.max(0, Math.round(n)); const fz = g.force; if (fz.hs != null && fz.as != null && fz.hs !== fz.as) fz.w = fz.hs > fz.as ? 'h' : 'a'; } }
  save(); ui.flash = 'Saved.'; render();
}
function vAdmin() {
  const tabs = [['players', 'Players'], ['coaches', 'Coaches'], ['money', 'Money & meters'], ['results', 'Force results'], ['teams', 'Other teams'], ['recruits', 'Recruits'], ['game', 'Game settings']];
  const nav = `<div class="chips">${tabs.map(([k, l]) => `<button class="chip${ui.admTab === k ? ' on' : ''}" data-act="admtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  const t = ui.admTab;
  if (t === 'players') {
    const list = state.roster.filter(p => p.pos === ui.admPos).sort((a, b) => b.ovr - a.ovr);
    if (!ui.admP || !P(ui.admP) || P(ui.admP).pos !== ui.admPos) ui.admP = list[0] ? list[0].id : null;
    const p = P(ui.admP);
    const posChips = POS_ORDER.map(x => `<button class="chip${ui.admPos === x ? ' on' : ''}" data-act="admpos" data-v="${x}">${x}</button>`).join('');
    const sel = `<label class="fld wide" for="admpsel"><span>Player</span><select id="admpsel">${list.map(x => `<option value="${x.id}" ${x.id === ui.admP ? 'selected' : ''}>${esc(x.n)} · ${x.ovr} OVR · ${x.cls}</option>`).join('')}</select></label>`;
    const form = p ? `<div class="fgrid">${fld('Name', 'p:' + p.id, 'n', p.n, 'text')}${fld('Jersey #', 'p:' + p.id, 'num', p.num, 'number', { min: 0, max: 99 })}${fld('Position', 'p:' + p.id, 'pos', p.pos, 'select', { options: POS_ORDER })}${fld('Class', 'p:' + p.id, 'cls', p.cls, 'select', { options: CLASSES })}${fld('Overall', 'p:' + p.id, 'ovr', p.ovr, 'number', { min: 1, max: 99 })}${fld('Potential', 'p:' + p.id, 'pot', p.pot, 'number', { min: 1, max: 99 })}${fld('Injured (weeks)', 'p:' + p.id, 'inj', p.inj, 'number', { min: 0 })}${fld('Suspended (games)', 'p:' + p.id, 'susp', p.susp || 0, 'number', { min: 0 })}${fld('Pay ($M)', 'p:' + p.id, 'pay', p.pay, 'number', { step: 0.05, min: 0 })}${fld('Hometown', 'p:' + p.id, 'home', p.home, 'text')}${Object.entries(p.tr || {}).map(([k, v]) => fld(TRAIT_NAME[k], 'p:' + p.id, 'tr.' + k, v, 'number', { min: 1, max: 99 })).join('')}</div>
      <div class="row gap mt">${ui.confirm === 'admdel' ? `<button class="btn danger sm" data-act="admdel" data-id="${p.id}">Confirm: remove ${esc(p.n)}</button><button class="btn ghost sm" data-act="unconfirm">Cancel</button>` : `<button class="btn ghost sm" data-act="ask" data-k="admdel">Remove from roster</button>`}</div>` : '<p class="muted">No players at this position.</p>';
    body = `<section class="card"><div class="eyebrow">Edit players</div><div class="chips">${posChips}</div>${sel}${form}</section>
     <section class="card"><div class="eyebrow">Roster tools</div><div class="row gap"><button class="btn sm" data-act="admadd">Add ${aAn(ui.admPos)}</button><button class="btn sm" data-act="admheal">Heal all injuries and suspensions</button><button class="btn sm" data-act="admboost" data-d="3">+3 OVR to everyone</button><button class="btn sm" data-act="admboost" data-d="-3">−3 OVR to everyone</button><button class="btn sm" data-act="admpayall">Pay everyone market value</button></div></section>`;
  } else if (t === 'coaches') {
    const c = state.staff[ui.admC];
    const sel = `<div class="chips">${STAFF_ROLES.map(r => `<button class="chip${ui.admC === r ? ' on' : ''}" data-act="admc" data-v="${r}">${r}</button>`).join('')}</div>`;
    const tg = 'c:' + ui.admC;
    const form = c ? `<div class="fgrid">${fld('Name', tg, 'name', c.name, 'text')}${fld('Title', tg, 'title', c.title, 'text')}${ui.admC === 'HC' ? fld('Offense', tg, 'off', c.off) + fld('Defense', tg, 'def', c.def) + fld('Recruiting', tg, 'rec', c.rec) + fld('Development', tg, 'dev', c.dev) + fld('Game management', tg, 'gm', c.gm) : fld('Overall', tg, 'ovr', c.ovr) + fld('Recruiting', tg, 'rec', c.rec) + fld('Development', tg, 'dev', c.dev)}${fld('Salary ($M/yr)', tg, 'salary', c.salary, 'number', { step: 0.1 })}${fld('Years left', tg, 'years', c.years)}</div>` : `<p class="muted">This job is vacant.</p><button class="btn sm" data-act="admfill">Instantly hire the best candidate</button>`;
    body = `<section class="card"><div class="eyebrow">Edit coaches</div>${sel}${form}<div class="row gap mt"><button class="btn ghost sm" data-act="admcands">Refresh every candidate pool</button>${c ? `<button class="btn ghost sm" data-act="admvacate">Remove without a buyout</button>` : ''}</div></section>`;
  } else if (t === 'money') {
    const f = state.fin, m = state.meters;
    body = `<section class="card"><div class="eyebrow">Money</div><div class="fgrid">${fld('Department reserve ($M)', 'fin', 'balance', r1(f.balance), 'number', { step: 1 })}${fld('Ticket price ($)', 'fin', 'ticket', f.ticket)}${fld('Revenue share to football (%)', 'fin', 'revPct', f.revPct, 'number', { min: 0, max: 100 })}${fld('Recruiting budget ($M)', 'fin', 'recruit', f.recruit, 'number', { step: 0.5 })}${fld('Extra collective money this year ($M)', 'fin', 'collective', f.collective || 0, 'number', { step: 0.5 })}${fld('Extra sponsorship per year ($M)', 'fin', 'extraRev', f.extraRev || 0, 'number', { step: 0.5 })}</div>
     <div class="row gap mt"><button class="btn sm" data-act="admcash" data-d="25">Add $25M</button><button class="btn sm" data-act="admcash" data-d="100">Add $100M</button></div></section>
     <section class="card"><div class="eyebrow">Meters</div><div class="fgrid">${fld('Board of Regents', 'm', 'board', m.board, 'number', { min: 0, max: 100 })}${fld('Fan approval', 'm', 'fan', m.fan, 'number', { min: 0, max: 100 })}${fld('Booster confidence', 'm', 'boost', m.boost, 'number', { min: 0, max: 100 })}${fld('Locker room', 'm', 'morale', m.morale, 'number', { min: 0, max: 100 })}${fld('Hot seat', 'm', 'hot', m.hot, 'number', { min: 0, max: 100 })}${fld('NCAA risk', 'm', 'risk', Math.round(m.risk), 'number', { min: 0, max: 100 })}</div><div class="row gap mt"><button class="btn sm" data-act="admmax">Max every meter (hot seat to 0)</button></div></section>
     <section class="card"><div class="eyebrow">Facilities</div><div class="fgrid">${state.facilities.map(x => fld(facName(x.id), 'f:' + x.id, 'lvl', x.lvl, 'number', { min: 1, max: 5 })).join('')}</div></section>`;
  } else if (t === 'results') {
    const wkGames = state.games.filter(g => !g.done && g.wk === state.week).sort((a, b) => (b.h === ME || b.a === ME) - (a.h === ME || a.a === ME));
    const mUp = mGames().filter(g => !g.done);
    const row = g => { const tg = 'g:' + g.id; const f = g.force || {}; return `<div class="frow"><div class="fg">${esc(teamName(g.a))} at ${esc(teamName(g.h))}${g.neutral ? ' (neutral)' : ''} <span class="muted small">${esc(weekLabel(g.wk))}</span></div>${fld('Result', tg, 'w', f.w || 'none', 'select', { options: [['none', 'Play it out'], ['h', teamName(g.h) + ' wins'], ['a', teamName(g.a) + ' wins']] })}${fld(teamName(g.a) + ' score', tg, 'as', f.as == null ? '' : f.as, 'number', { min: 0 })}${fld(teamName(g.h) + ' score', tg, 'hs', f.hs == null ? '' : f.hs, 'number', { min: 0 })}</div>`; };
    body = `<section class="card"><div class="eyebrow">${esc(myName())} every week</div>${fld(`${myName()} results`, 'set', 'forceM', state.settings.forceM, 'select', { options: [['none', 'Play them out'], ['win', `${myName()} wins every game`], ['lose', `${myName()} loses every game`]] })}<p class="hint">Forced games still play out drive by drive, so box scores and stats look normal.</p></section>
     <section class="card"><div class="eyebrow">Upcoming ${esc(myName())} games</div>${mUp.map(row).join('') || `<p class="muted">No upcoming ${esc(myName())} games.</p>`}</section>
     <section class="card"><div class="eyebrow">Every game this week · ${esc(weekLabel(state.week))}</div><p class="hint">Pick a winner, and optionally an exact score (the winner's score must be higher).</p>${wkGames.filter(g => g.h !== ME && g.a !== ME).map(row).join('') || '<p class="muted">No other games this week.</p>'}</section>`;
  } else if (t === 'teams') {
    const ids = Object.keys(state.teams).filter(x => x !== ME).sort((a, b) => teamName(a).localeCompare(teamName(b)));
    const tm = (ui.admT !== ME && T(ui.admT)) || T(ids[0]); const tg = 't:' + tm.id;
    body = `<section class="card"><div class="eyebrow">Edit any program</div><label class="fld wide" for="admtsel"><span>Team</span><select id="admtsel">${ids.map(i => `<option value="${i}" ${i === tm.id ? 'selected' : ''}>${esc(teamName(i))}</option>`).join('')}</select></label>
     <div class="fgrid">${fld('Name', tg, 'name', tm.name, 'text')}${fld('Conference', tg, 'conf', tm.conf, 'select', { options: Object.values(CONFS).map(c => [c.id, c.name]) })}${fld('Overall rating', tg, 'rating', tm.rating, 'number', { step: 0.5 })}${fld('Offense', tg, 'off', tm.off, 'number', { step: 0.5 })}${fld('Defense', tg, 'def', tm.def, 'number', { step: 0.5 })}${fld('Special teams', tg, 'st', tm.st, 'number', { step: 0.5 })}${fld('Poll strength (Elo)', tg, 'elo', Math.round(tm.elo), 'number', { step: 10 })}${fld('Wins', tg, 'w', tm.w)}${fld('Losses', tg, 'l', tm.l)}${fld('Conf. wins', tg, 'cw', tm.cw)}${fld('Conf. losses', tg, 'cl', tm.cl)}${fld('Run offense lean', tg, 'style.run', tm.style.run, 'number', { step: 0.5 })}${fld('Pass offense lean', tg, 'style.pass', tm.style.pass, 'number', { step: 0.5 })}${fld('Run defense lean', tg, 'style.runD', tm.style.runD, 'number', { step: 0.5 })}${fld('Pass defense lean', tg, 'style.passD', tm.style.passD, 'number', { step: 0.5 })}${(tm.stars || []).map((s, i) => fld(s.n + ' (' + s.pos + ') OVR', tg, 'star.' + i + '.ovr', s.ovr)).join('')}</div>
     <p class="hint">Changing overall rating resets offense and defense to match. Elo drives poll position. Conference moves take effect in next season's schedule and standings.</p></section>
     <section class="card"><div class="eyebrow">Historical season</div><h2 class="h3">Import a ranking</h2><p class="hint">Paste a poll, one team per line, like <code>1. Georgia</code>, <code>Michigan 94</code> or <code>OSU: 91</code>. Ranked teams get a rating and poll spot from their rank (or the rating you give); teams you leave out start behind them. Works best in the preseason.</p><label class="fld wide"><span>Ranking</span><textarea id="admrank" rows="8" placeholder="1. Georgia&#10;2. Michigan&#10;3. Texas"></textarea></label><div class="row gap mt"><button class="btn sm" data-act="admrank">Apply ranking</button></div></section>
     <section class="card"><div class="eyebrow">Your program</div><div class="fgrid">${fld('Name', 't:' + ME, 'name', T(ME).name, 'text')}${fld('Conference', 't:' + ME, 'conf', T(ME).conf, 'select', { options: Object.values(CONFS).map(c => [c.id, c.name]) })}${fld('Poll strength (Elo)', 't:' + ME, 'elo', Math.round(T(ME).elo), 'number', { step: 10 })}${fld('Wins', 't:' + ME, 'w', T(ME).w)}${fld('Losses', 't:' + ME, 'l', T(ME).l)}</div><p class="hint">Your team's on-field strength comes from the roster and staff. Edit players to change it.</p><div class="row gap"><button class="btn sm" data-act="admrepoll">Recalculate the poll now</button></div></section>`;
  } else if (t === 'recruits') {
    const rc = state.rec; if (!rc) body = '<section class="card"><p class="muted">No class.</p></section>';
    else {
      if (!ui.admR || !rc.list.find(x => x.id === ui.admR)) ui.admR = rc.list[0].id; const r = rc.list.find(x => x.id === ui.admR); const tg = 'r:' + r.id;
      body = `<section class="card"><div class="eyebrow">Edit recruits · Class of ${rc.cls}</div><label class="fld wide" for="admrsel"><span>Prospect</span><select id="admrsel">${rc.list.map(x => `<option value="${x.id}" ${x.id === r.id ? 'selected' : ''}>${esc(x.n)} · ${x.star}★ ${x.pos}</option>`).join('')}</select></label>
       <div class="fgrid">${fld('Stars', tg, 'star', r.star, 'number', { min: 1, max: 5 })}${fld('Overall', tg, 'ovr', r.ovr)}${fld('Potential', tg, 'pot', r.pot)}${fld(`Interest in ${myName()}`, tg, 'interest', r.interest, 'number', { min: 1, max: 99 })}${fld('Status', tg, 'status', r.status, 'select', { options: [['open', 'Uncommitted'], ['mc', `Committed to ${myName()}`], ['signed', `Signed with ${myName()}`], ['lost', 'Committed elsewhere']] })}</div></section>
       <section class="card"><div class="eyebrow">Class tools</div><div class="row gap"><button class="btn sm" data-act="admrecall">Commit every offered prospect</button><button class="btn sm" data-act="admvisits">Add 10 official visits</button><button class="btn sm" data-act="admnewclass">Generate a new class</button></div></section>`;
    }
  } else if (t === 'game') {
    const s = state.settings;
    body = `<section class="card"><div class="eyebrow">Game settings</div><div class="fgrid">${fld('Difficulty', 'set', 'diff', s.diff, 'select', { options: Object.entries(DIFF).map(([k, d]) => [k, d.label]) })}${fld('Ask me for 4th-down and final-drive calls in live games', 'set', 'ask', s.ask, 'checkbox')}${fld('The board cannot fire me', 'set', 'noFire', s.noFire, 'checkbox')}${fld('Sound effects', 'set', 'sound', s.sound, 'checkbox')}</div></section>
     <section class="card"><div class="eyebrow">Random seed</div><div class="fgrid">${fld('Seed', 'set', 'seed', state.seed || '', 'number', { min: 1, step: 1 })}</div><p class="hint">Entering a seed restarts the random sequence from here. Make a save code right after, and loading that code and making the same choices will replay the same results. Useful for reporting bugs.</p></section>
     <section class="card"><div class="eyebrow">Playoff format</div><div class="fgrid">${fld('Teams in the playoff', 'set', 'playoff.size', (s.playoff || {}).size || 12, 'select', { options: [[12, '12 teams (4 byes)'], [14, '14 teams (2 byes)'], [16, '16 teams (no byes)']] })}${fld('Automatic bids', 'set', 'playoff.auto', (s.playoff || {}).auto || 'p4g6', 'select', { options: [['p4g6', 'Power Four champions + top Group of Six (2026 rules)'], ['champs5', 'Five highest-ranked conference champions'], ['none', 'No automatic bids']] })}</div><p class="hint">Takes effect at the next selection day.</p></section>
     <section class="card"><div class="eyebrow">Season tools</div><div class="row gap"><button class="btn sm" data-act="admevent">Trigger a random decision now</button>${state.event ? '<button class="btn sm" data-act="admclearevent">Dismiss the current decision</button>' : ''}<button class="btn sm" data-act="admhist">Reset rivalry records to real totals</button><button class="btn sm" data-act="admach">Recheck achievements</button><button class="btn sm" data-act="admclean">Clear NCAA penalties</button>${state.gameOver ? '<button class="btn sm" data-act="admunfire">Undo my firing</button>' : ''}</div></section>`;
  }
  return `<section class="card adminhead"><div class="head"><div><div class="eyebrow">Commissioner mode</div><h2 class="h2">Admin panel</h2></div><p class="hint">Changes save as soon as you leave a field. Nothing here asks twice, except removing players.</p></div>${nav}</section>${body}`;
}


