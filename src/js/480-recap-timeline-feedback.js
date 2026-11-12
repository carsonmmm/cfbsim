/* ===================== v9.55: season recaps everywhere, the career timeline picture, feedback =====================
 * College careers already had a season recap (buildRecap, recapView). This adds the same for the NFL (kept on each
 * PS().hist entry as `recap`), lists the decisions made that season from the decision journal, and puts a
 * "save the picture" button on every recap. The career timeline is one tall picture of every season.
 * Nothing new is required in a save: a season without a recap simply has no Recap link. */

/* ---------- the NFL season recap ---------- */
function proBuildRecap() {
  const L = PS(); const games = mGames().filter(g => g.done); if (!games.length) return null;
  const mine = g => (g.h === ME ? g.hs - g.as : g.as - g.hs); const val = g => { const o = T(g.h === ME ? g.a : g.h); return (o && o.elo ? o.elo : 1500) + mine(g) * 5; };
  const nm = g => { const o = T(g.h === ME ? g.a : g.h); return o ? o.name : ''; }; const sc = g => (g.h === ME ? `${g.hs}-${g.as}` : `${g.as}-${g.hs}`);
  const wins = games.filter(g => mine(g) > 0), losses = games.filter(g => mine(g) < 0);
  const best = wins.sort((a, b) => val(b) - val(a))[0], worst = losses.sort((a, b) => val(a) - val(b))[0]; const comeback = wins.filter(g => (g.minM || 0) <= -10).sort((a, b) => a.minM - b.minM)[0];
  const top = state.roster.filter(p => p.st && Object.keys(p.st).length && !['K', 'P', 'LS'].includes(p.pos)).sort((a, b) => b.ovr - a.ovr).slice(0, 3).map(p => ({ n: p.n, pos: p.pos, line: statLineRaw(p.pos, p.st) }));
  const me = T(ME); const d = (me.w - (L.expW || 8.5)) * 3 + [0, 3, 6, 9, 12, 20][proPoResult(ME)] ;
  return { best: best ? { opp: nm(best), score: sc(best) } : null, worst: worst ? { opp: nm(worst), score: sc(worst) } : null, comeback: comeback ? { opp: nm(comeback), score: sc(comeback), down: -comeback.minM } : null, top, grade: d >= 12 ? 'A' : d >= 5 ? 'B' : d >= -2 ? 'C' : d >= -8 ? 'D' : 'F' };
}
{ const _p = proStartOffseason; proStartOffseason = function (fresh) {
  let rc = null; const s = state.season; if (!fresh) { try { rc = proBuildRecap(); } catch (e) { console.error(e); } }
  const r = _p.apply(this, arguments);
  try { const h = PS().hist[PS().hist.length - 1]; if (rc && h && h.s === s && h.tm === ME) h.recap = rc; } catch (e) { }
  return r;
}; }

/* ---------- on every recap: the decisions of that season, and a picture to share ---------- */
function recapExtrasHTML(season) {
  if (!state || !season) return ''; let dj = []; try { dj = djOf(X()).filter(j => j.s === +season).slice(-4); } catch (e) { }
  const pic = seasonCardData(season) ? `<div class="row gap mt"><button class="btn sm" data-act="seasoncard" data-v="save" data-s="${season}">Save the picture</button>${navigator.share && navigator.canShare ? `<button class="btn ghost sm" data-act="seasoncard" data-v="share" data-s="${season}">Share</button>` : ''}</div><p class="small muted seasoncardmsg" role="status"></p>` : '';
  return `${dj.length ? `<div class="eyebrow mt">Decisions that shaped it</div><ul class="plainlist small">${dj.map(j => `<li>· ${esc(j.t)}</li>`).join('')}</ul>` : ''}${pic}`;
}
{ const _r = recapView; recapView = function (r, season, h) { const html = _r.apply(this, arguments); return r && h ? html + recapExtrasHTML(season) : html; }; }
Object.assign(actions, {
  precap(d) { const h = PS().hist.find(x => x.s === +d.s && x.recap); if (!h) return; openModal(recapView(h.recap, h.s, { w: h.w, l: h.l, bowl: PO_LABEL[h.po] }).replace('Board grade', 'Season grade')); },
});

/* ---------- the career timeline picture ---------- */
function timelineData() {
  if (appMode === 'career') {
    if (!cs || !cs.p || !(cs.p.seasons || []).length) return null; const p = cs.p;
    const tn = e => { try { return e.lvl === 'hs' ? e.team : e.lvl === 'nfl' ? nflName(e.team) : cTeamName(e.team); } catch (x) { return String(e.team || ''); } };
    return { title: cName(p), sub: `${p.pos} · PLAYER CAREER${typeof cIronOn === 'function' && cIronOn() ? ' · IRONMAN' : ''}`, rows: p.seasons.map(e => ({ y: e.year, a: tn(e), b: e.rec || '', c: `${e.cls || ''}${e.ovr ? ' · ' + e.ovr + ' overall' : ''}`, star: !!(e.awards && e.awards.length), note: e.awards && e.awards.length ? String(e.awards[0]) : '' })),
      foot: `${p.seasons.length} season${p.seasons.length > 1 ? 's' : ''}`, bg: '#00274C', fg: '#F4F7FB', hi: '#FFCB05' };
  }
  const d = seasonCardData(); if (!d) return null; const pro = isPro(); const ss = shareSeasons(); const hist = pro ? PS().hist : state.history;
  return { title: d.team, sub: `${d.role.toUpperCase()}${d.iron ? ' · IRONMAN' : ''}`, rows: ss.map((h, i) => { const x = hist[i] || {}; return { y: h.s, a: pro ? (T(x.tm) ? T(x.tm).name : d.team) : (x.hc ? 'Coach ' + x.hc : ''), b: `${h.w}-${h.l}`, c: pro ? (PO_LABEL[x.po] || '') : (x.bowl || '') + (x.rank ? (x.bowl ? ' · ' : '') + 'No. ' + x.rank : ''), star: h.title, note: h.title ? (pro ? 'Super Bowl champions' : 'National champions') : '' }; }),
    foot: `${d.n} season${d.n > 1 ? 's' : ''} · ${d.tw}-${d.tl}${d.titles ? ` · ${d.titles} title${d.titles > 1 ? 's' : ''}` : ''}`, bg: d.bg, fg: d.fg, hi: d.hi };
}
function timelineCanvas(d) {
  const rows = d.rows.slice(-60); const rh = rows.length > 40 ? 40 : rows.length > 24 ? 50 : 62; const W = 1200, top = 290, H = top + rows.length * rh + 130;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const disp = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', body = '"Public Sans", system-ui, sans-serif';
  const clip = (t, max) => { t = String(t || ''); if (g.measureText(t).width <= max) return t; while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
  g.fillStyle = d.bg; g.fillRect(0, 0, W, H); g.fillStyle = d.hi; g.fillRect(0, H - 16, W, 16); g.textBaseline = 'alphabetic';
  g.fillStyle = d.fg; g.globalAlpha = 0.72; g.font = `600 30px ${body}`; g.fillText(clip(d.sub, W - 144), 72, 100); g.globalAlpha = 1;
  let size = 124; do { g.font = `900 ${size}px ${disp}`; size -= 4; } while (g.measureText(d.title.toUpperCase()).width > W - 144 && size > 40); g.fillStyle = d.hi; g.fillText(d.title.toUpperCase(), 72, 222);
  const fs = Math.round(rh * 0.5);
  rows.forEach((r, i) => {
    const y = top + i * rh; if (r.star) { g.fillStyle = d.hi; g.globalAlpha = 0.16; g.fillRect(56, y - rh * 0.7, W - 112, rh * 0.94); g.globalAlpha = 1; }
    g.fillStyle = d.fg; g.globalAlpha = 0.25; g.fillRect(72, y + rh * 0.24, W - 144, 1); g.globalAlpha = 1;
    g.font = `800 ${fs + 4}px ${disp}`; g.fillStyle = d.hi; g.fillText(String(r.y), 72, y); g.fillStyle = d.fg; g.fillText(String(r.b), 190, y);
    g.font = `600 ${fs - 4}px ${body}`; g.fillText(clip(r.a, 360), 340, y); g.globalAlpha = 0.8; g.font = `500 ${fs - 4}px ${body}`; g.fillText(clip(r.note || r.c, 400), 728, y); g.globalAlpha = 1;
  });
  g.fillStyle = d.fg; g.font = `600 30px ${body}`; g.fillText(d.foot + (d.rows.length > rows.length ? ` (last ${rows.length} shown)` : ''), 72, H - 62); g.globalAlpha = 0.8; g.textAlign = 'right'; g.font = `600 26px ${body}`; g.fillText('Football Empire · collegefbsim.com', W - 72, H - 62); g.globalAlpha = 1; g.textAlign = 'left';
  return c;
}
function timelineCardHTML() {
  const d = timelineData(); if (!d) return '';
  return `<section class="card" id="timelinecard"><div class="head"><div><div class="eyebrow">Career timeline</div><h2 class="h3">Your whole career in one picture</h2></div><p class="hint">Every season, the record and how it ended, made on this device to save or post.</p></div><div class="row gap"><button class="btn" data-act="timelinepic" data-v="save">Save the picture</button>${navigator.share && navigator.canShare ? '<button class="btn ghost" data-act="timelinepic" data-v="share">Share</button>' : ''}</div><p class="small muted" id="timelinemsg" role="status"></p></section>`;
}
{ const w = f => function () { return f.apply(this, arguments) + (isComm() ? '' : timelineCardHTML()); }; vHistory = w(vHistory); vProHistory = w(vProHistory); }
{ const _c = vCStats; vCStats = function () { return _c.apply(this, arguments) + timelineCardHTML(); }; }
Object.assign(actions, {
  async timelinepic(d) {
    const data = timelineData(); const msg = t => { const m = document.getElementById('timelinemsg'); if (m) m.textContent = t; }; if (!data) return;
    try { if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('600 30px "Public Sans"')]); } catch (e) { }
    const name = `football-empire-${String(data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-career.png`;
    const blob = await new Promise(res => timelineCanvas(data).toBlob(res, 'image/png')); if (!blob) return msg('The picture could not be made in this browser.');
    if (d.v === 'share') { try { const file = new File([blob], name, { type: 'image/png' }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Football Empire', text: `${data.title}: ${data.foot}.` }); return msg('Shared.'); } } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); msg('Saved ' + name + '.'); } catch (e) { msg('Downloads are blocked here.'); }
  },
});

/* ---------- feedback: a report that already knows the version, the mode and the device ---------- */
const FEEDBACK_REPO = 'https://github.com/carsonmmm/cfbsim/issues/new';
function feedbackDevice() { const u = navigator.userAgent || ''; const os = /iPhone|iPad/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Mac OS X/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : 'Other'; const br = /Edg\//.test(u) ? 'Edge' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'browser'; return `${os}, ${br}, ${window.innerWidth}px wide`; }
function feedbackMode() { if (appMode === 'career') return 'Player Career'; if (appMode !== 'ad' || !state) return 'Home screen'; return isComm() ? 'Commissioner' : isOwner() ? 'Owner' : isCoach() ? 'Coach' : isPro() ? 'NFL General Manager' : 'Athletic Director'; }
function feedbackURL(kind) { const q = new URLSearchParams({ template: kind === 'idea' ? 'idea.yml' : 'bug.yml', mode: kind === 'idea' && feedbackMode() === 'Home screen' ? 'Every mode' : feedbackMode() }); if (kind !== 'idea') { q.set('version', PATCH_NOTES[0].v); q.set('device', feedbackDevice()); } return FEEDBACK_REPO + '?' + q.toString(); }
function feedbackHTML() {
  return `<section class="card feedback"><div class="head"><div><div class="eyebrow">Feedback</div><h2 class="h3">Found a bug, or have an idea?</h2></div><p class="hint">Opens a short form on GitHub with the game version, the mode you are in and your device already filled in. You need a free GitHub account to send it.</p></div><div class="row gap"><a class="btn sm" href="${esc(feedbackURL('bug'))}" target="_blank" rel="noopener">Report a problem</a><a class="btn ghost sm" href="${esc(feedbackURL('idea'))}" target="_blank" rel="noopener">Suggest an idea</a></div></section>`;
}
{ const _d = displaySettingsHTML; displaySettingsHTML = function () { return _d.apply(this, arguments) + feedbackHTML(); }; }
{ const _ph = patchHomeHTML; patchHomeHTML = function () { return _ph.apply(this, arguments) + feedbackHTML(); }; }
