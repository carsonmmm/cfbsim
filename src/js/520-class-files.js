/* ===================== v9.59: recruiting class and draft class files =====================
 * The Save file page can write the current recruiting class (college) or draft class (NFL) to a spreadsheet
 * file and read one back, so players can make and trade their own classes. A file is plain text, one player
 * a line: name, position, then the columns below. Imported players are fictional unless the file says otherwise;
 * the game ships no real names in these. Nothing new is stored in a save. */
const classKind = () => (isComm() || (typeof isOwner === 'function' && isOwner() && typeof ownHands === 'function' && ownHands()) ? null : isPro() ? (PS().dc && PS().dc.list ? 'draft' : null) : (state.rec && state.rec.list ? 'recruit' : null));
const CLASS_HEAD = { recruit: 'Name,Pos,Stars,Rating,Potential,Hometown', draft: 'Name,Pos,Age,Rating,Potential,College' };
const csvCell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function classExport() {
  const k = classKind(); if (!k) return ''; const rows = k === 'recruit' ? state.rec.list.map(r => [r.n, r.pos, r.star, r.ovr, r.pot, r.home]) : PS().dc.list.map(p => [p.n, p.pos, p.age, p.ovr, p.pot, p.col]);
  return CLASS_HEAD[k] + '\n' + rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n';
}
const classPos = s => String(s || '').toUpperCase().replace('OT', 'OL').replace('OG', 'OL').replace(/^C$/, 'OL').replace('FS', 'S').replace('SS', 'S').replace('ILB', 'LB').replace('OLB', 'LB').replace('EDGE', 'DE').replace('NT', 'DT').replace('HB', 'RB');
function classParse(text, kind) {
  const rows = [], bad = []; const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  lines.forEach((l, i) => {
    const c = csvCells(l, '\t,;'); if (i === 0 && /name/i.test(c[0]) && /pos/i.test(c[1] || '')) return;
    const n = plainName(c[0]); const pos = classPos(c[1]); if (!n || !POS_ORDER.includes(pos)) { bad.push(i + 1); return; }
    if (kind === 'recruit') { const star = Math.round(+c[2]), ovr = Math.round(+c[3]); if (!(star >= 1 && star <= 5) || !(ovr >= 35 && ovr <= 85)) { bad.push(i + 1); return; } rows.push({ n, pos, star: clamp(star, 2, 5), ovr, pot: clamp(Math.round(+c[4]) || ovr + 12, ovr, 99), home: plainName(c[5], 40) }); }
    else { const age = Math.round(+c[2]), ovr = Math.round(+c[3]); if (!(age >= 19 && age <= 27) || !(ovr >= 40 && ovr <= 90)) { bad.push(i + 1); return; } rows.push({ n, pos, age, ovr, pot: clamp(Math.round(+c[4]) || ovr + 6, ovr, 99), col: plainName(c[5], 40) || 'Imported' }); }
  });
  return { rows: rows.slice(0, kind === 'recruit' ? 150 : 400), bad };
}
function classImport(text, mode) {
  const kind = classKind(); if (!kind) return { added: 0, bad: [], err: 'There is no class to change right now.' }; if (typeof liveRosterLock === 'function' && liveRosterLock()) return { added: 0, bad: [], err: LIVE_ROSTER_MSG };
  const { rows, bad } = classParse(text, kind); if (!rows.length) return { added: 0, bad, err: `No players found. Each line needs: ${CLASS_HEAD[kind].replace(/,/g, ', ')}.` };
  const tag = Date.now().toString(36);
  if (kind === 'recruit') {
    const p4 = Object.values(state.teams).filter(t => (CONFS[t.conf].p4 || t.id === 'ND') && t.id !== ME);
    const fresh = rows.map((x, i) => { const town = x.home ? [x.home, ''] : recruitTown(TEAM_STATE[ME]); const b = genBody(x.pos); const lead = shuffle(p4.filter(t => t.rating >= (x.star === 5 ? 82 : x.star === 4 ? 74 : 62)).slice()).slice(0, 3).map(t => t.id);
      const r = { id: 'ri' + tag + i, n: x.n, pos: x.pos, star: x.star, ovr: x.ovr, pot: x.pot, home: town[0], inState: town[1] === TEAM_STATE[ME], ht: b.ht, wt: b.wt, status: 'open', offered: false, visit: null, nil: 0, ask: r2(x.star === 5 ? rnd(0.8, 1.6) : x.star === 4 ? rnd(0.2, 0.6) : 0), lead, trend: 0, to: null, imported: true }; r.interest = baseInterest(r); return r; });
    // recruits you have already landed stay yours when the board is replaced
    const keep = mode === 'replace' ? state.rec.list.filter(r => r.status !== 'open') : state.rec.list; state.rec.list = keep.concat(fresh).sort((a, b) => b.star - a.star || b.pot - a.pot);
  } else {
    const D = PS().dc; const fresh = rows.map((x, i) => ({ id: 'di' + D.yr + '_' + tag + i, n: x.n, pos: x.pos, age: x.age, ovr: x.ovr, pot: x.pot, col: x.col, sc: 0, bias: 0, pbias: 0, hype: 0, imported: true }));
    D.list = (mode === 'replace' ? [] : D.list).concat(fresh); const cv = p => p.ovr * 0.55 + p.pot * 0.45 + (p.hype || 0) + (PRO_POS_W[p.pos] - 1) * 8; D.list.sort((a, b) => cv(b) - cv(a)); D.list.forEach((p, i) => { p.cr = i + 1; });
    const L = PS(); if (L.cin && L.cin.draft) L.cin.draft = L.cin.draft.filter(id => D.list.some(p => p.id === id));
  }
  addNews(`${rows.length} ${kind === 'recruit' ? 'recruit' : 'draft prospect'}${rows.length === 1 ? '' : 's'} imported${mode === 'replace' ? ' (the old class was replaced)' : ''}.`);
  return { added: rows.length, bad };
}
function classCardHTML() {
  const k = classKind(); if (!k) return ''; const n = k === 'recruit' ? state.rec.list.length : PS().dc.list.length; const what = k === 'recruit' ? `the ${state.rec.cls} recruiting class` : `the ${PS().dc.yr} draft class`;
  const prev = ui.clsPrev; const posLine = prev ? POS_ORDER.filter(p => prev.byPos[p]).map(p => `${p} ${prev.byPos[p]}`).join(' · ') : '';
  return `<section class="card" id="classcard"><div class="head"><div><div class="eyebrow">Class files</div><h2 class="h3">${k === 'recruit' ? 'Recruiting class' : 'Draft class'}: ${n} players</h2></div><p class="hint">Save ${what} as a spreadsheet file, edit it or swap it with a friend, and load it back. One player a line: ${CLASS_HEAD[k].replace(/,/g, ', ')}.</p></div>
   <div class="row gap"><button class="btn sm" data-act="clsdl">Download this class</button><label class="btn ghost sm" for="clsfile">Choose a file…</label><input id="clsfile" type="file" accept=".csv,.txt,text/csv,text/plain" class="sr-only" data-chg="clsfile"></div>
   <textarea id="clstext" class="inp mt" rows="5" style="width:100%" aria-label="Class file text" placeholder="${CLASS_HEAD[k].replace(/,/g, ', ')}">${esc(ui.clsText || '')}</textarea>
   ${prev ? `<div class="decision mt"><b>${prev.mode === 'replace' ? 'Replace the class' : 'Add to the class'}: ${prev.n} player${prev.n === 1 ? '' : 's'} found</b><p class="small">By position: ${esc(posLine || 'none')}.${prev.bad.length ? ` Skipped line${prev.bad.length > 1 ? 's' : ''} ${prev.bad.slice(0, 10).join(', ')}${prev.bad.length > 10 ? ' and more' : ''}.` : ''}${prev.mode === 'replace' && k === 'recruit' ? ' Recruits who have already committed or signed stay.' : ''}</p><div class="row gap">${prev.n ? `<button class="btn ${prev.mode === 'replace' ? 'danger' : 'primary'}" data-act="clsimport" data-v="${prev.mode}">${prev.mode === 'replace' ? 'Confirm: replace the class' : 'Add them'}</button>` : ''}<button class="btn ghost" data-act="clsno">Back</button></div></div>`
    : '<div class="row gap mt"><button class="btn sm" data-act="clsprev" data-v="add">Add these players…</button><button class="btn ghost sm" data-act="clsprev" data-v="replace">Replace the class…</button></div>'}
   ${ui.clsMsg ? `<p class="small" role="status">${esc(ui.clsMsg)}</p>` : ''}</section>`;
}
const clsRead = () => { const t = document.getElementById('clstext'); if (t) ui.clsText = t.value; return ui.clsText || ''; };
Object.assign(actions, {
  clsdl() { const k = classKind(); if (!k) return; clsRead(); const name = `football-empire-${k === 'recruit' ? 'recruits-' + state.rec.cls : 'draft-' + PS().dc.yr}.csv`;
    try { const url = URL.createObjectURL(new Blob([classExport()], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); ui.clsMsg = 'Saved ' + name + '.'; } catch (e) { ui.clsText = classExport(); ui.clsMsg = 'Downloads are blocked here, so the class is in the box below. Copy it from there.'; } render(); },
  clsprev(d) { const k = classKind(); if (!k) return; const txt = clsRead(); const { rows, bad } = classParse(txt, k); const byPos = {}; rows.forEach(r => { byPos[r.pos] = (byPos[r.pos] || 0) + 1; }); ui.clsPrev = { n: rows.length, bad, byPos, mode: d.v === 'replace' ? 'replace' : 'add' }; ui.clsMsg = ''; render(); },
  clsno() { clsRead(); ui.clsPrev = null; render(); },
  clsimport(d) { const r = classImport(clsRead(), d.v === 'replace' ? 'replace' : 'add'); ui.clsPrev = null; ui.clsMsg = r.err ? r.err : `${r.added} player${r.added === 1 ? '' : 's'} imported.${r.bad.length ? ` Skipped ${r.bad.length} line${r.bad.length > 1 ? 's' : ''}.` : ''}`; if (!r.err) ui.clsText = ''; after(); },
});
document.addEventListener('change', e => { const t = e.target; if (!t || t.id !== 'clsfile' || !t.files || !t.files[0]) return; const f = t.files[0]; if (f.size > 400000) { ui.clsMsg = 'That file is too large to be a class.'; return render(); } const rd = new FileReader(); rd.onload = () => { ui.clsText = String(rd.result || ''); ui.clsPrev = null; ui.clsMsg = `Loaded ${f.name}. Choose Add or Replace.`; render(); }; rd.onerror = () => { ui.clsMsg = 'That file could not be read.'; render(); }; rd.readAsText(f); });
{ const _v = vFile; vFile = function () { let x = ''; try { x = classCardHTML(); } catch (e) { console.error(e); } return _v.apply(this, arguments) + x; }; }
