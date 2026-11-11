/* ===================== RENDERING: views, dialogs, live game ===================== */
const ui = { board: { stance: 'balanced', fac: 'none', tix: 'hold', vote: 'yes' }, nc: { mode: 'school', tid: 'MICH', rep: null, name: 'Lakeshore Tech', ab: 'LAKE', conf: 'MAC', tier: 'mid', stadium: 'Harbor Field', cap: 40000, c1: '#2BB673', c2: '#10263F' }, newSlot: null, neg: null, negMsg: '', tab: 'office', rpos: 'ALL', rsort: 'ovr', sconf: null, swk: null, sfilter: 'top', poll: 'ap', pollIdx: -1, dpos: 'QB', confirm: null, saveMsg: '', importMsg: '', exportCode: '', flash: '', recF: 'all', paySort: 'pay', admTab: 'players', admP: null, admC: 'HC', admT: 'OSU', admR: null, admPos: 'QB', newDiff: 'normal', book: 'game' };
loadFilters(); // remembered list filters (per browser)
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const fm = x => (x < 0 ? '−$' : '$') + Math.abs(x).toFixed(1) + 'M';
const fm2 = x => (x < 0 ? '−$' : '$') + Math.abs(x).toFixed(2) + 'M';
const stars = n => '★'.repeat(n) + '<span class="dim">' + '★'.repeat(5 - n) + '</span>';
// reads a number box. Blank, non-numeric or out-of-range input comes back as an error message instead of a guess,
// so the caller can keep the old value and say why (QOL-03). A missing box gives { v: null, err: null }.
function numIn(id, lo, hi, label) { const el = document.getElementById(id); if (!el) return { v: null, err: null }; const raw = String(el.value).trim(); const v = raw === '' ? NaN : Number(raw); if (!Number.isFinite(v)) return { v: null, err: `${label}: enter a number.` }; if (v < lo || v > hi) return { v: null, err: `${label}: use ${lo} to ${hi}.` }; return { v, err: null }; }

// ---- school colors: every theme picks up the school's primary and secondary colors ----
const hexRgb = h => { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v * (1 - t) + y[i] * t)); };
function relLum(h) { return hexRgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
const contrast = (a, b) => { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const inkFor = bg => contrast(bg, '#FFFFFF') >= contrast(bg, '#0B1628') ? '#FFFFFF' : '#0B1628';
// nudges a color toward white or black until it reads against `bg`
function readable(c, bg, min) { let x = c; const to = relLum(bg) < 0.3 ? '#FFFFFF' : '#000000'; for (let i = 0; i < 12 && contrast(x, bg) < min; i++) x = mixHex(x, to, 0.12); return x; }
function teamPalette(c1, c2) {
  const soft = c => (c.toUpperCase() === '#000000' ? '#121418' : c); // pure black reads as a hole on screen
  const band = relLum(c2) < 0.12 ? soft(c2) : relLum(c1) < 0.12 ? soft(c1) : mixHex(c1, '#000000', 0.62);
  const fillL = c1;
  const fillD = relLum(c1) >= 0.09 ? c1 : relLum(c2) >= 0.2 ? c2 : mixHex(c1, '#FFFFFF', 0.5);
  // the wordmark and header rule sit on the band, so they take whichever school color stands out there
  const onBand = [c2, c1, inkFor(band)].find(c => contrast(c, band) >= 3) || inkFor(band);
  // header buttons use the fill unless it melts into the band (Ohio State scarlet on scarlet, say)
  const hdrBtn = f => (contrast(f, band) >= 1.8 ? f : onBand);
  return { band, bandText: inkFor(band), onBand, hbL: hdrBtn(fillL), hbD: hdrBtn(fillD), fillL, inkL: inkFor(fillL), fillD, inkD: inkFor(fillD), accL: readable(relLum(c1) < 0.5 ? c1 : band, '#FFFFFF', 4.6), accD: readable(fillD, '#0F1A2C', 4.6) };
}
// colors for the AD school: a custom program's own, any real school's, nothing extra for Michigan (the themes are built on it)
function schoolColors() { if (!state) return null; if (isPro()) { const t = NFL_BY[ME]; return t ? { c1: t.c1, c2: t.c2 } : null; } if (state.me) return { c1: state.me.c1, c2: state.me.c2 }; if (ME === 'MICH') return null; const ti = TEAM_INFO[ME]; return ti ? { c1: ti.c1, c2: ti.c2 } : null; }
function applyTheme() {
  const el = document.getElementById('customTheme'); if (!el) return;
  const sc = appMode === 'ad' && !(typeof state !== 'undefined' && state && isComm()) ? schoolColors() : null; /* the commissioner has no team colors */
  if (!sc) { el.textContent = ''; return; }
  const p = teamPalette(sc.c1, sc.c2);
  const vars = (fill, ink, acc) => `--maize:${fill} !important;--maize-ink:${ink} !important;--accent:${acc} !important;--maize-bg:color-mix(in srgb, ${fill} 18%, transparent) !important;--me:color-mix(in srgb, ${fill} 10%, transparent) !important;`;
  const band = `--band:${p.band} !important;--band-text:${p.bandText} !important;--band-muted:color-mix(in srgb, ${p.bandText} 68%, transparent) !important;--band-line:color-mix(in srgb, ${p.bandText} 18%, transparent) !important;--on-band:${p.onBand};`;
  // the Gazette and Dashboard themes draw their header on the page itself, so they keep their own band
  const hb = c => `--hdr-btn:${c};--hdr-ink:${inkFor(c)};`; const nb = ':not([data-skin=gazette]):not([data-skin=dashboard])';
  el.textContent = `:root${nb}{${band}${hb(p.hbD)}}:root[data-mode="light"]${nb}{${hb(p.hbL)}}:root{${vars(p.fillD, p.inkD, p.accD)}}:root[data-mode="light"]{${vars(p.fillL, p.inkL, p.accL)}}`;
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', p.band);
}
// Before v8, custom-program names were swapped into finished text here. Every view now asks for the
// school's name directly, so this is kept only so older call sites have nothing to do.
function subst() { }
/* ---------- components ---------- */
function tchip(id, opts) {
  opts = opts || {}; if (!id) return '<span class="tn">TBD</span>';
  const r = isFCS(id) ? 0 : rankOf(id); const nm = teamName(id);
  const inner = `${r && !opts.norank ? `<span class="rk">${r}</span>` : ''}<span class="tn${id === ME ? ' me' : ''}">${esc(opts.short && !isFCS(id) ? id : nm)}</span>${opts.rec && !isFCS(id) ? `<span class="rec">${record(id)}</span>` : ''}`;
  return isFCS(id) ? `<span class="team fcs">${inner}<span class="rec">FCS</span></span>` : `<button class="team" data-act="team" data-id="${id}">${inner}</button>`;
}
function meter(label, v, hint, invert) { const good = invert ? v <= 35 : v >= 65, mid = invert ? v <= 65 : v >= 40; const cls = good ? 'good' : mid ? 'warn' : 'bad'; return `<div class="meter"><div class="mrow"><span class="lbl">${label}</span><span class="mval ${cls}">${v}</span></div><div class="bar"><i class="${cls}" style="width:${v}%"></i></div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`; }
function ovrTag(v) { const c = v >= 85 ? 'o-elite' : v >= 78 ? 'o-good' : v >= 70 ? 'o-avg' : 'o-low'; return `<span class="ovr ${c}">${v}</span>`; }
function statLine(p, st) {
  st = st || p.st; const g = k => st[k] || 0;
  if (p.pos === 'QB' && g('pa')) return `${g('pc')}/${g('pa')}, ${g('py')} yds, ${g('ptd')} TD, ${g('pint')} INT${g('ry') ? ` · ${g('ry')} rush` : ''}`;
  if (p.pos === 'RB' && (g('ra') || g('rc'))) return `${g('ra')} car, ${g('ry')} yds, ${g('rtd')} TD${g('rc') ? ` · ${g('rc')} rec, ${g('rcy')} yds` : ''}`;
  if (['WR', 'TE'].includes(p.pos) && g('rc')) return `${g('rc')} rec, ${g('rcy')} yds, ${g('rctd')} TD`;
  if (['DE', 'DT', 'LB', 'CB', 'S'].includes(p.pos) && (g('tk') || g('int') || g('sk'))) return `${g('tk')} tkl${g('sk') ? `, ${g('sk')} sk` : ''}${g('int') ? `, ${g('int')} INT` : ''}`;
  if (p.pos === 'K' && (g('fga') || g('xpa'))) return `${g('fgm')}/${g('fga')} FG, ${g('xpm')}/${g('xpa')} XP`;
  if (p.pos === 'P' && g('pn')) return `${g('pn')} punts, ${(g('pny') / g('pn')).toFixed(1)} avg`;
  return '';
}
function depthLabel(p) { const i = state.depth[p.pos].indexOf(p.id); if (i < 0) return ''; if (i < START[p.pos]) return (SLOT_LABELS[p.pos] ? SLOT_LABELS[p.pos][i] : p.pos + '1'); return p.pos + (i + 1); }

function siteOf(g) { return g.neutral ? 'vs.' : g.h === ME ? 'vs.' : 'at'; }
function satPill(p) { const s = satisfaction(p); return s >= 1 ? '<span class="pill good">Happy</span>' : s >= 0.85 ? '<span class="pill">Content</span>' : '<span class="pill bad">Unhappy</span>'; }
function seg(act, cur, opts, extra) { return `<div class="seg" role="group">${opts.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}" data-v="${k}" aria-pressed="${cur === k}" ${extra || ''}>${l}</button>`).join('')}</div>`; }
/* ---------- icons (simple line drawings, inherit the text color) ---------- */
const svgI = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const IC = {
  menu: svgI('<path d="M4 6h16M4 12h16M4 18h16"/>'), collapse: svgI('<path d="M15 6l-6 6 6 6"/><path d="M20 4v16"/>'),
  sun: svgI('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svgI('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  gear: svgI('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  gavel: svgI('<path d="M14 4l6 6"/><path d="M11 7l6 6"/><path d="M12.5 5.5l-6 6 3 3 6-6"/><path d="M8 13l-5 5 2 2 5-5"/><path d="M13 20h8"/>'),
  home: svgI('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  cal: svgI('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  users: svgI('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
  star: svgI('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
  grid: svgI('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),
};

/* ---------- charts (single series, accent ink, hover tooltips) ---------- */
function lineChart(pts, o) {
  // pts: [{y, lbl, tip}] ; o: {min,max,invert,ref,refLbl,h,yTicks,fmt}
  const W = 640, H = o.h || 200, L = 40, Rr = 12, Tp = 12, B = 26;
  const n = pts.length; if (n < 2) return `<p class="hint">${o.empty || 'Not enough data yet.'}</p>`;
  const xs = i => L + (W - L - Rr) * (n === 1 ? 0.5 : i / (n - 1));
  const ys = v => { const t = (v - o.min) / (o.max - o.min); return Tp + (H - Tp - B) * (o.invert ? t : 1 - t); };
  const grid = (o.yTicks || []).map(v => `<line x1="${L}" x2="${W - Rr}" y1="${ys(v)}" y2="${ys(v)}" class="cg"/><text x="${L - 6}" y="${ys(v) + 4}" text-anchor="end" class="ct">${o.fmt ? o.fmt(v) : v}</text>`).join('');
  const ref = o.ref != null ? `<line x1="${L}" x2="${W - Rr}" y1="${ys(o.ref)}" y2="${ys(o.ref)}" class="cref"/>${o.refLbl ? `<text x="${W - Rr}" y="${ys(o.ref) - 5}" text-anchor="end" class="ct">${o.refLbl}</text>` : ''}` : '';
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' ');
  const area = o.area ? `<path d="${d} L${xs(n - 1)},${ys(o.area)} L${xs(0)},${ys(o.area)} Z" class="carea"/>` : '';
  const xl = (o.xLabels || []).map(([i, t]) => `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle" class="ct">${esc(t)}</text>`).join('');
  const marks = pts.map((p, i) => (o.dots !== false || i === n - 1) ? `<circle cx="${xs(i)}" cy="${ys(p.y)}" r="${i === n - 1 ? 5 : 4}" class="cdot"/>` : '').join('');
  const bw = (W - L - Rr) / Math.max(1, n - 1);
  const hits = pts.map((p, i) => `<rect x="${xs(i) - bw / 2}" y="0" width="${bw}" height="${H}" class="chit" data-tip="${esc(p.tip || p.lbl + ': ' + p.y)}"/>`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Chart')}">${grid}${ref}${area}<path d="${d}" class="cline"/>${marks}${xl}${hits}</svg></div>`;
}
function barChart(items, o) {
  const W = 640, H = o.h || 180, L = 44, Rr = 10, Tp = 14, B = 26; const n = items.length; if (!n) return `<p class="hint">${o.empty || 'No data yet.'}</p>`;
  const vals = items.map(x => x.v); const max = Math.max(o.min0 ? 0 : -Infinity, ...vals, 1e-9), min = Math.min(0, ...vals);
  const hi = max === min ? max + 1 : max; const ys = v => Tp + (H - Tp - B) * (1 - (v - min) / (hi - min));
  const bwid = Math.min(46, (W - L - Rr) / n * 0.62); const xc = i => L + (W - L - Rr) * ((i + 0.5) / n);
  const ticks = o.ticks || [min, (min + hi) / 2, hi].map(v => Math.round(v * 10) / 10);
  const grid = ticks.map(v => `<line x1="${L}" x2="${W - Rr}" y1="${ys(v)}" y2="${ys(v)}" class="cg"/><text x="${L - 6}" y="${ys(v) + 4}" text-anchor="end" class="ct">${o.fmt ? o.fmt(v) : v}</text>`).join('');
  const bars = items.map((x, i) => { const y0 = ys(0), y1 = ys(x.v); const top = Math.min(y0, y1), h = Math.max(1.5, Math.abs(y1 - y0)); return `<rect x="${xc(i) - bwid / 2}" y="${top}" width="${bwid}" height="${h}" rx="3" class="cbar${x.v < 0 ? ' neg' : ''}"/><text x="${xc(i)}" y="${H - 8}" text-anchor="middle" class="ct">${esc(x.lbl)}</text><rect x="${xc(i) - (W - L) / n / 2}" y="0" width="${(W - L) / n}" height="${H}" class="chit" data-tip="${esc(x.tip || x.lbl + ': ' + x.v)}"/>`; }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Chart')}">${grid}<line x1="${L}" x2="${W - Rr}" y1="${ys(0)}" y2="${ys(0)}" class="cbase"/>${bars}</svg></div>`;
}
function rankChart(polls) {
  const pts = polls.map(pl => { const i = pl.rows.findIndex(r => r.id === ME); const rk = i >= 0 ? i + 1 : 27; return { y: rk, lbl: pl.label, tip: `${pl.label}: ${i >= 0 ? 'No. ' + (i + 1) : 'unranked'}` }; });
  const xl = pts.map((p, i) => [i, polls[i].label.replace('Week ', 'W').replace('Preseason', 'Pre').replace('After championships', 'CCG').replace('Final poll', 'Final')]).filter((x, i, a) => a.length <= 10 || i % 2 === 0 || i === a.length - 1);
  return lineChart(pts, { min: 1, max: 27, invert: true, yTicks: [1, 5, 10, 15, 20, 25], fmt: v => '#' + v, ref: 25.5, refLbl: 'Unranked below', xLabels: xl, title: teamName(ME) + ' poll rank by week', empty: 'The chart fills in after Week 1.' });
}

/* ---------- header ---------- */
function primaryLabel() {
  if (isPro()) return proPrimaryLabel();
  if (state.gameOver) return 'Career over';
  if (state.event && state.phase === 'regular') return 'Decision needed: ' + state.event.title;
  const ph = state.phase;
  if (ph === 'regular') { const g = michGameThisWeek(state.week); return g ? `Quick sim Week ${state.week}: ${siteOf(g)} ${teamName(oppOf(g))}` : `Sim Week ${state.week} (open week)`; }
  if (ph === 'ccg') { const g = michGameThisWeek(14); return g ? `Quick sim ${g.name}` : 'Sim conference championships'; }
  const labels = { cfp1: 'Sim CFP first round', cfp2: 'Sim bowls & CFP quarterfinals', cfp3: 'Sim CFP semifinals', cfp4: 'Sim national championship' };
  if (labels[ph]) { const g = michGameThisWeek(state.week); return g ? `Quick sim the ${g.name.replace(/ \(.*\)/, '')}` : labels[ph]; }
  if (ph === 'offseason') return `Offseason: ${offStepLabels()[state.off.step]}`;
  return 'Continue';
}
function confShort(c) { return { B1G: 'B1G', SEC: 'SEC', B12: 'Big 12', ACC: 'ACC', IND: 'Ind.', P12: 'Pac-12', AAC: 'AAC', MW: 'MW', SBC: 'SBC', MAC: 'MAC', CUSA: 'CUSA' }[c] || c; }
function renderHeader() { $('#hdr').innerHTML = headerHTML(); }
function toolsHTML(mode) {
  mode = mode || 'ad'; const dark = resolvedMode() === 'dark';
  const setOn = mode === 'career' ? cui.tab === 'settings' : mode === 'ad' && ui.tab === 'settings';
  const setBtn = mode === 'home' ? `<button class="tbtn" data-act="homeset">${IC.gear}<span>Settings</span></button>` : `<button class="tbtn${setOn ? ' on' : ''}" data-act="${mode === 'career' ? 'ctab' : 'tab'}" data-tab="settings">${IC.gear}<span>Settings</span>${prefs.seen ? '' : '<i class="newdot" aria-label="New"></i>'}</button>`;
  return `<div class="tools">${mode !== 'home' ? `<button class="tbtn" data-act="gohome" aria-label="Home screen: switch between AD mode and Player Career">${IC.home}<span>Home</span></button>` : ''}${mode !== 'home' && prefs.nav === 'side' ? `<button class="tbtn side-t" data-act="toggleside" aria-expanded="${prefs.side !== 'hidden'}" aria-controls="tabs">${IC.menu}<span>Menu</span></button>` : ''}${qolToolsHTML(mode)}<button class="tbtn" data-act="togglemode" aria-label="Switch to ${dark ? 'light' : 'dark'} mode">${dark ? IC.sun : IC.moon}<span>${dark ? 'Light' : 'Dark'}</span></button>${setBtn}</div>`;
}
function headerHTML() {
  if (isComm()) return commHeaderHTML();
  if (isPro()) return proHeaderHTML();
  if (isCoach()) return coachHeaderHTML();
  const m = T(ME); const r = rankOf(ME);
  const wl = state.phase === 'offseason' ? 'Offseason' : weekLabel(state.week);
  const inSeason = state.phase !== 'offseason' && !state.gameOver;
  const mgNow = michGameThisWeek(state.week);
  return `
  <div class="brand"><div class="wm" data-badge="AD"><span class="wmu">${esc(teamName(ME).toUpperCase())}</span><span class="wmn">${esc(teamName(ME))}</span><span class="wmt">The ${esc(teamName(ME))} Front Office</span></div><div class="sub">Football · Office of the Athletic Director · Slot ${slot}<span class="savew"> · <span class="savest">${esc(saveStateTxt())}</span></span></div></div>
  <div class="board">
    <div class="cell"><span class="k">Season</span><span class="v">${state.season}</span></div>
    <div class="cell wide"><span class="k">Calendar</span><span class="v sm">${esc(wl)}</span></div>
    <div class="cell"><span class="k">Record</span><span class="v">${m.w}-${m.l}</span><span class="s">${m.cw}-${m.cl} ${confShort(m.conf)}</span></div>
    <div class="cell"><span class="k">AP poll</span><span class="v">${r ? '#' + r : 'NR'}</span></div>
    <div class="cell"><span class="k">Reserve</span><span class="v">${fm(state.fin.balance)}</span></div>
  </div>
  <div class="acts">
    ${toolsHTML()}
    ${liveBusy() ? `<div class="row gap"><button class="btn primary" data-act="liveresume">Resume live game · ${esc(liveScoreText())}</button></div>` : `<div class="row gap">${inSeason && mgNow && !state.event ? '<button class="btn watch" data-act="live">Watch live</button>' : ''}<button class="btn primary" data-act="primary" ${state.gameOver ? 'disabled' : ''}>${esc(primaryLabel())}</button></div>`}
    ${!state.gameOver && !liveBusy() ? `<details class="simmenu"><summary>More sim options</summary><div class="menu">
      ${inSeason ? '<button data-act="simdec">Sim to the next decision</button>' : ''}${state.phase === 'regular' ? '<button data-act="simloss">Sim to next loss</button><button data-act="simreg">Sim to end of regular season</button>' : ''}
      ${inSeason ? '<button data-act="simpost">Sim to the offseason</button>' : ''}
      ${inSeason && typeof stopMenuHTML === 'function' ? stopMenuHTML() : ''}
      <div class="mlabel">Auto-AD: sim whole seasons, offseasons included</div>
      <div class="yrs">${[1, 3, 5, 10].map(n => `<button data-act="simyears" data-n="${n}">${n} ${n === 1 ? 'season' : 'seasons'}</button>`).join('')}</div>
    </div></details>` : ''}
  </div>`;
}
const TABS = [['office', 'Office'], ['career', 'My career'], ['schedule', 'Schedule'], ['roster', 'Roster'], ['depth', 'Depth chart'], ['staff', 'Staff'], ['recruit', 'Recruiting'], ['poll', 'Top 25'], ['awards', 'Heisman & awards'], ['draft', 'NFL Draft'], ['standings', 'Standings'], ['scores', 'Around the nation'], ['post', 'Postseason'], ['lghist', 'League history'], ['money', 'Finances'], ['payroll', 'Payroll'], ['fac', 'Facilities'], ['history', 'History'], ['records', 'Records'], ['off', 'Offseason'], ['admin', 'Admin'], ['file', 'Save file'], ['settings', 'Settings']];
const TAB_GROUPS = [['Season', ['office', 'schedule', 'poll', 'standings', 'scores', 'post', 'lghist']], ['Program', ['roster', 'depth', 'staff', 'recruit', 'awards', 'draft']], ['Business', ['money', 'payroll', 'fac']], ['Career', ['career', 'off', 'history', 'records', 'file', 'settings', 'admin']]];
const MNAV = [['office', 'Office', 'home'], ['schedule', 'Schedule', 'cal'], ['roster', 'Roster', 'users'], ['recruit', 'Recruiting', 'star']];
const tabLabel = k => (k === 'office' && isComm() ? 'League office' : k === 'career' && isOwner() ? 'Legacy' : k === 'office' && isOwner() ? 'Owner\'s suite' : (curTabs().find(t => t[0] === k) || [k, k])[1]);
const tabVisible = k => (typeof fdOn === 'function' && fdOn() ? FD_TABS.includes(k) : k === 'admin' && typeof ironOn === 'function' && ironOn() ? false : typeof xTabVis === 'function' && xTabVis(k) != null ? xTabVis(k) : isComm() ? COMM_TABS.has(k) : isPro() ? proTabVisible(k) : (k !== 'off' || state.phase === 'offseason') && (k !== 'career' || isCoach() || !!(state.jobs && state.jobs.length)) && !(isCoach() && ['money', 'payroll', 'fac'].includes(k)));
function tabBtn(k, cls) { const on = ui.tab === k; return `<button class="${cls}${on ? ' on' : ''}${k === 'off' ? ' hot' : ''}${k === 'admin' ? ' adm' : ''}" data-act="tab" data-tab="${k}"${on ? ' aria-current="page"' : ''}>${esc(tabLabel(k))}</button>`; }
function renderTabs() {
  const t = $('#tabs');
  if (prefs.nav === 'side') t.innerHTML = `<div class="sbhead"><span class="sbw">${esc(teamName(ME))}</span><button class="tbtn" data-act="toggleside" aria-label="Hide the sidebar">${IC.collapse}</button></div>` + curGroups().map(([g, ks]) => { const vis = ks.filter(tabVisible); return vis.length ? `<div class="sbgrp">${g}</div>` + vis.map(k => tabBtn(k, 'tab')).join('') : ''; }).join('');
  else t.innerHTML = curTabs().filter(([k]) => tabVisible(k)).map(([k]) => tabBtn(k, 'tab')).join('');
  t.setAttribute('aria-label', 'Sections'); tabFade(true);
  const m = $('#mnav'); if (!m) return;
  const inBar = curMnav().some(x => x[0] === ui.tab);
  m.innerHTML = curMnav().map(([k, l, ic]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}"${ui.tab === k ? ' aria-current="page"' : ''}>${IC[ic]}<span>${l}</span></button>`).join('') + `<button class="${inBar ? '' : 'on'}" data-act="moremenu" aria-haspopup="dialog">${IC.grid}<span>${inBar ? 'More' : esc(tabLabel(ui.tab))}</span></button>`;
}
function tabFade(scrollToOn) {
  const t = $('#tabs'); if (!t) return;
  if (prefs.nav === 'side') { t.classList.remove('fl', 'fr'); return; }
  if (scrollToOn) { const on = t.querySelector('.tab.on'); if (on) { const l = on.offsetLeft, r = l + on.offsetWidth; if (l < t.scrollLeft) t.scrollLeft = l - 32; else if (r > t.scrollLeft + t.clientWidth) t.scrollLeft = r - t.clientWidth + 32; } }
  t.classList.toggle('fl', t.scrollLeft > 4); t.classList.toggle('fr', t.scrollLeft + t.clientWidth < t.scrollWidth - 4);
}
function moreView() {
  return `<div class="eyebrow">Go to</div><h2 class="h2">All sections</h2>${curGroups().map(([g, ks]) => { const vis = ks.filter(tabVisible); return vis.length ? `<div class="eyebrow mt">${g}</div><div class="moregrid">${vis.map(k => tabBtn(k, 'morebtn')).join('')}</div>` : ''; }).join('')}`;
}

/* ---------- settings ---------- */
// League rules: a preset or your own mix. Shared by AD, Coach and GM settings.
function rulesCardHTML() {
  const r = rules(); const pk = rulePreset(); const nfl = isPro();
  const opts = Object.entries(RULE_PRESETS).map(([k, p]) => [k, p.label]).concat([['sandbox', 'Sandbox']]); if (pk === 'custom') opts.push(['custom', 'Custom']);
  const order = nfl ? ['otNfl', 'nflSeeds', 'capGrow', 'security', 'injuries', 'cfp', 'otCol', 'roster'] : ['cfp', 'otCol', 'roster', 'security', 'injuries', 'otNfl', 'nflSeeds', 'capGrow'];
  const row = k => { const d = RULE_DEFS[k]; return setRow(esc(d.label), esc(d.hint), seg('setrule', String(r[k]), d.opts.map(o => [String(o[0]), o[1]]), `data-k="${k}"`)); };
  return `<section class="card"><div class="eyebrow">League rules · slot ${slot}</div>
   ${setRow('Rules preset', esc(pk === 'custom' ? 'Your own mix of the rules below.' : pk === 'sandbox' ? 'The Updated balance with your own dials below. 1.0 is the Updated default.' : RULE_PRESETS[pk].desc), seg('rulepreset', pk, opts))}
   ${pk === 'sandbox' ? sbxHTML(r) : ''}
   ${order.slice(0, nfl ? 5 : 6).map(row).join('')}${row('bal')}
   ${setRow('Scouting reads', 'Ranges: recruits show a range for OVR and POT until you scout them, and computer-run clubs read prospects more sharply on harder difficulty. Exact: every rating shown exactly, as before v9.37.', seg('scoutmode', scoutRanges() ? 'ranges' : 'exact', [['ranges', 'Ranges'], ['exact', 'Exact']]))}
   ${isComm() ? '' : setRow('Shared world', `On: your Coach-mode coach can turn up in hiring pools, your Player Career player can turn up as a recruit or a draft prospect, from now on.${worldGet().rules ? ' You can also use the rules of your Commissioner league.' : ''}`, seg('worldmode', worldOn() ? 'on' : 'off', [['on', 'On'], ['off', 'Off']]) + (worldGet().rules ? ' <button class="btn ghost sm" data-act="worldrules">Use my Commissioner rules</button>' : ''))}
   ${isComm() ? '' : setRow('League eras', 'On: every six to eight seasons the sport changes around you (a TV-money boom, a bigger playoff, a realignment wave or a rules change). Off: the rules stay as you set them.', seg('erasmode', erasOn() ? 'on' : 'off', [['on', 'On'], ['off', 'Off']]))}
   <details class="mt"><summary class="small">${nfl ? 'College rules' : 'NFL rules'} (used if your career moves ${nfl ? 'to college' : 'to the NFL'})</summary>${order.slice(nfl ? 5 : 6).map(row).join('')}</details>
   <p class="hint mt">Changes apply from your next game. A postseason already under way keeps its format, and a new cap growth rate starts with next year's cap. Overtime rules apply to games played out drive by drive, which includes all of yours.</p></section>`;
}
function sbxHTML(r) {
  return `<div class="sbx">${Object.entries(SBX_DEFS).map(([k, d]) => { const v = sbx(k); return setRow(esc(d.label), esc(d.hint), `<label class="row gap"><input type="range" min="${d.min}" max="${d.max}" step="0.1" value="${v}" data-sbx="${k}" aria-label="${esc(d.label)}"><b class="num" data-sbxv="${k}">×${v.toFixed(1)}</b></label>`); }).join('')}<div class="row gap"><button class="btn ghost sm" data-act="sbxreset">Reset the dials</button></div></div>`;
}
function setRow(label, hint, control) { return `<div class="setrow"><div class="sl"><b>${label}</b>${hint ? `<span class="hint">${hint}</span>` : ''}</div><div class="sctl">${control}</div></div>`; }
function prefSeg(k, opts) { return seg('setpref', String(prefs[k]), opts.map(([v, l]) => [String(v), l]), `data-k="${k}"`); }
// Look and layout: shared by every mode and saved on this device.
function displaySettingsHTML(mode, extra) {
  const skins = Object.entries(SKINS).map(([k, s]) => `<button class="skincard${prefs.skin === k ? ' on' : ''}" data-act="setpref" data-k="skin" data-v="${k}" aria-pressed="${prefs.skin === k}"><span class="pv pv-${k}" aria-hidden="true"><i class="pb"><i></i></i><i class="pc"><i></i><i></i><i></i></i></span><b>${s.label}</b><span class="small muted">${s.desc}</span>${prefs.skin === k ? '<span class="pill maize">In use</span>' : ''}</button>`).join('');
  const hint = mode === 'ad' ? `Look and layout are saved on this device and apply to both modes and every save slot. Gameplay settings belong to the career in slot ${slot}.` : 'Look and layout are saved on this device and apply to both modes and every save slot.';
  const display = `<section class="card"><div class="eyebrow">Display · this device</div>
   ${setRow('Color mode', 'Match device follows your system setting. The sun and moon button at the top switches it anytime.', prefSeg('mode', [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Match device']]))}
   ${setRow('Navigation', 'Tabs across the top, or a sidebar grouped by section. Phones always use the bar at the bottom.', prefSeg('nav', [['top', 'Top tabs'], ['side', 'Sidebar']]))}
   ${prefs.nav === 'side' ? setRow('Sidebar', 'You can also show or hide it with the Menu button at the top of the page.', prefSeg('side', [['shown', 'Showing'], ['hidden', 'Hidden']])) : ''}
   ${setRow('Animations', 'Match device turns them off if your system asks for reduced motion.', prefSeg('anim', [['on', 'On'], ['off', 'Off'], ['auto', 'Match device']]))}
   ${setRow('Text size', 'Large makes everything about 12% bigger.', prefSeg('size', [['normal', 'Normal'], ['large', 'Large']]))}
   ${setRow('Color-blind friendly colors', 'Good and bad use blue and orange instead of green and red, everywhere in the game.', prefSeg('cb', [['off', 'Off'], ['on', 'On']]))}
   ${setRow('Compact tables', 'Tighter rows, so more of every table fits on the screen.', prefSeg('compact', [['off', 'Off'], ['on', 'On']]))}
   ${mode === 'home' ? setRow('Tutorials', 'Each mode plays a short tutorial the first time you open it. Reset them to see each one again.', '<button class="btn ghost sm" data-act="tutreset">Reset all tutorials</button>') : typeof tutKey === 'function' && tutKey() ? setRow('Tutorial', 'A short walk through the main parts of this mode.', '<button class="btn ghost sm" data-act="tourreplay">Play the tutorial</button>') : ''}
   <div class="row gap mt"><button class="btn ghost sm" data-act="resetprefs">Reset look and layout</button></div></section>`;
  return `<section class="card"><div class="head"><div><div class="eyebrow">Settings</div><h2 class="h2">Make it yours</h2></div><p class="hint">${hint}</p></div>
   <div class="eyebrow mt">Theme</div><div class="skins">${skins}</div></section>` + (mode === 'home' ? display : `<div class="grid2 setg">${display}${extra || ''}</div>`);
}
function vSettings() {
  const st = state.settings;
  const gameSeg = (k, cur, opts) => seg('setgame', String(cur), opts, `data-k="${k}"`);
  if (isCoach()) return displaySettingsHTML('ad', coachSettingsHTML());
  return displaySettingsHTML('ad', `<section class="card"><div class="eyebrow">Gameplay · slot ${slot}</div>
   ${setRow('Difficulty', `${esc(DIFF[st.diff].desc)} Legacy points count ×${LEGACY_MULT[st.diff]}.`, gameSeg('diff', st.diff, Object.entries(DIFF).map(([k, d]) => [k, d.label])))}
   ${setRow('Big calls in live games', 'Halftime adjustments, fourth downs and the final drive.', gameSeg('ask', !!st.ask, [['true', 'Ask me'], ['false', 'Coach decides']]))}
   ${setRow('Live game speed', 'How fast live games start. You can change it during a game.', prefSeg('liveSpeed', [[1, 'Normal'], [2, 'Fast'], [3, 'Very fast']]))}
   ${setRow('Field view', 'Watch each play on a top-down field during live games: dots with jersey numbers line up, the ball is snapped and the play runs. It follows the live game speed.', prefSeg('field', [['on', 'On'], ['off', 'Off']]))}
   ${setRow('Play clock', 'When you call plays in a live game, you get 20 seconds per play. If it runs out, your staff makes the call.', prefSeg('playClock', [['off', 'Off'], ['on', 'On']]))}
   ${setRow('Keyboard shortcuts', 'N for next, L to watch live, 1–9 for tabs, U to undo, G for the glossary, ? for the full list.', prefSeg('keys', [['on', 'On'], ['off', 'Off']]))}
   <div class="row gap mt"><button class="btn ghost sm" data-act="kbhelp">Keyboard shortcuts</button><button class="btn ghost sm" data-act="glossary">What the numbers mean</button></div>
   ${setRow(`Call ${esc(myName())}'s plays`, 'Start live games with play calling turned on.', prefSeg('callPlays', [[true, 'On'], [false, 'Off']]))}
   ${setRow('Sound effects', 'Crowd roar, final whistle and a victory jingle. All sounds are original.', gameSeg('sound', !!st.sound, [['true', 'On'], ['false', 'Off']]))}
   ${autoSettingsHTML()}
   <p class="hint mt">Commissioner tools, forced results and the playoff format are in <button class="lnk" data-act="tab" data-tab="admin">Admin</button>. Save slots and save codes are in <button class="lnk" data-act="tab" data-tab="file">Save file</button>. Player Career is on the Home screen.</p></section>${rulesCardHTML()}`);
}

/* ---------- office ---------- */
function eventCard() {
  const ev = state.event; if (!ev) return '';
  return `<section class="card event"><div class="eyebrow">Decision needed · ${esc(weekLabel(ev.wk))}</div><h2 class="h2">${esc(ev.title)}</h2><p>${esc(ev.text)}</p><div class="evopts">${ev.opts.map((o, i) => `<button class="evopt" data-act="event" data-i="${i}"><b>${esc(o.label)}</b><span>${esc(o.hint)}</span></button>`).join('')}</div></section>`;
}
function scoutBlock(opp) {
  if (isFCS(opp)) return '<p class="hint">FCS opponent: no scouting report. Any plan works.</p>';
  const st = T(opp).style;
  const grade = v => v >= 2.5 ? '<span class="pill good">Strong</span>' : v <= -2.5 ? '<span class="pill bad">Weak</span>' : '<span class="pill">Average</span>';
  const e = planEffects(opp); const bp = bestPlan(opp);
  const leanTxt = st.run - st.pass > 2.5 ? 'They like to run the ball.' : st.pass - st.run > 2.5 ? 'They like to throw it.' : 'Their offense is balanced.';
  return `<div class="scout"><div class="eyebrow">Scouting report</div>
   <table class="mini"><tr><td>Run offense</td><td>${grade(st.run)}</td><td>Run defense</td><td>${grade(st.runD)}</td></tr><tr><td>Pass offense</td><td>${grade(st.pass)}</td><td>Pass defense</td><td>${grade(st.passD)}</td></tr></table>
   <p class="hint">${leanTxt} Your run game vs. their run defense: ${e.runEdge >= 0 ? '+' : ''}${e.runEdge}. Your passing vs. their pass defense: ${e.passEdge >= 0 ? '+' : ''}${e.passEdge}. Staff recommends <b>${OFF_PLANS[bp.off].label}</b> on offense and <b>${DEF_PLANS[bp.def].label}</b> on defense.</p>
   <div class="plans"><div><div class="lbl">Offense</div>${seg('planoff', state.plan.off, Object.entries(OFF_PLANS).map(([k, v]) => [k, v.label]))}<div class="hint">${esc(OFF_PLANS[state.plan.off].desc)}</div></div>
   <div><div class="lbl">Defense</div>${seg('plandef', state.plan.def, Object.entries(DEF_PLANS).map(([k, v]) => [k, v.label]))}<div class="hint">${esc(DEF_PLANS[state.plan.def].desc)}</div></div></div>
   <p class="small">Plan effect this week: offense ${e.off >= 0 ? '+' : ''}${e.off}, defense ${e.def >= 0 ? '+' : ''}${e.def} rating points.</p>${scoutMore(opp, bp)}</div>`;
}
// the rest of the weekly report: who to watch, what they like to do, their scheme, and a one-click plan
function scoutMore(opp, bp) {
  const t = T(opp); if (!t) return ''; const st = t.style || { run: 0, pass: 0 }; const sch = teamScheme(opp); const se = schemeEdge(opp);
  const runPct = clamp(Math.round(50 + (st.run - st.pass) * 3), 30, 72); const third = clamp(Math.round(100 - runPct * 0.55), 55, 85); const rz = clamp(runPct + 8, 35, 80);
  const keys = (t.stars || []).slice().sort((a, b) => b.ovr - a.ovr).map(s => `<li><b>${esc(s.n)}</b> <span class="muted">${esc(s.pos)} · ${s.ovr} OVR${s.cls && s.cls !== 'Pro' ? ' · ' + esc(s.cls) : ''}</span>${s.st && (s.st.py || s.st.ry || s.st.rcy || s.st.tk || s.st.sk) ? ` <span class="small muted">${esc(statLine(s) || '')}</span>` : ''}</li>`).join('');
  const same = state.plan.off === bp.off && state.plan.def === bp.def;
  return `<div class="scoutmore"><div class="grid2 tight"><div><div class="lbl">Players to watch</div>${keys ? `<ul class="plainlist small">${keys}</ul>` : '<p class="small muted">No standouts.</p>'}</div>
   <div><div class="lbl">Tendencies</div><ul class="plainlist small"><li>Runs about <b>${runPct}%</b> of the time</li><li>Throws about <b>${third}%</b> on third and long</li><li>Runs about <b>${rz}%</b> in the red zone</li>${sch ? `<li>${esc(OFF_SCH[sch.off].n)} offense, ${esc(DEF_SCH[sch.def].n)} defense. Scheme matchup: your offense ${fmEdge(se.off)}, your defense ${fmEdge(se.def)}</li>` : ''}</ul></div></div>
   <div class="row gap mt"><button class="btn sm" data-act="useplan" data-off="${bp.off}" data-def="${bp.def}" ${same ? 'disabled' : ''}>${same ? 'Using the staff\'s plan' : `Use the staff's plan: ${esc(OFF_PLANS[bp.off].label)} / ${esc(DEF_PLANS[bp.def].label)}`}</button></div></div>`;
}
// CL-B8: warn before Signing Day brings an empty class
function recruitWarn() {
  const rc = state.rec; if (!rc || rc.done || state.gameOver) return '';
  const inSeason = state.phase !== 'offseason'; if (inSeason && state.week < 3) return '';
  const offers = rc.list.filter(r => r.offered && r.status === 'open').length, commits = recCommits().length, room = projRoom();
  if (room <= 0 || offers + commits >= Math.min(room, 12)) return '';
  const what = offers + commits === 0 ? 'No recruiting offers are out' : `Only ${offers} offer${offers === 1 ? '' : 's'} and ${commits} commit${commits === 1 ? '' : 's'} for about ${room} open spots`;
  return `<div class="flash bad" role="status">${what}. Recruits who never get an offer won't sign, and the roster shrinks if the class is small. <button class="lnk" data-act="tab" data-tab="recruit">Open Recruiting</button></div>`;
}
function vOffice() {
  const ms = michStrength();
  const nx = state.phase !== 'offseason' ? mGames().find(g => !g.done) : null;
  const last = mGames().filter(g => g.done).pop();
  let next = '';
  if (nx) {
    const opp = oppOf(nx); const p = mWinProb(nx); const os = strength(opp);
    const venue = nx.neutral ? (nx.loc || nx.name || 'Neutral site') : nx.h === ME ? facName('stadium') + ' · ' + myCity() + (nx.night ? ' · Night game' : '') : (T(opp) ? T(opp).name + ' home field' : 'Road game');
    const rv = rivalOf(opp) ? `<span class="pill maize">${esc(rivalOf(opp))}</span>` : '';
    const thisWeek = nx.wk === state.week;
    next = `<section class="card next">
      <div class="eyebrow">${esc(weekLabel(nx.wk))}${nx.name && nx.type !== 'reg' ? ' · ' + esc(nx.name) : ''}</div>
      <div class="matchup"><div class="side">${tchip(ME, { rec: true })}</div><div class="at">${siteOf(nx)}</div><div class="side">${tchip(opp, { rec: true })}</div></div>
      <div class="venue">${esc(venue)} ${rv}</div>
      <div class="wp"><div class="wpbar"><i style="width:${Math.round(p * 100)}%"></i></div><div class="wpl"><span>${esc(myName())} win chance <b>${Math.round(p * 100)}%</b></span><span>${esc(teamName(opp))} ${100 - Math.round(p * 100)}%</span></div></div>
      <table class="mini"><tr><th></th><th>OFF</th><th>DEF</th><th>ST</th></tr><tr><td>${esc(teamName(ME))}</td><td>${ms.off.toFixed(0)}</td><td>${ms.def.toFixed(0)}</td><td>${ms.st.toFixed(0)}</td></tr><tr><td>${esc(teamName(opp))}</td><td>${os.off.toFixed(0)}</td><td>${os.def.toFixed(0)}</td><td>${os.st.toFixed(0)}</td></tr></table>
      ${forecastLine(nx)}${treeNote(opp)}
      ${scoutBlock(opp)}
      ${thisWeek && liveBusy() ? `<div class="row gap mt"><button class="btn primary" data-act="liveresume">Resume the live game · ${esc(liveScoreText())}</button></div><p class="hint">The game is paused where you left it. Quick sim and the other sim options return once it is final. If you leave the site before it is final, it will be waiting where you left it when you come back.</p>` : thisWeek && !state.event ? `<div class="row gap mt"><button class="btn watch" data-act="live">Watch live, drive by drive</button><button class="btn primary" data-act="primary">Quick sim</button><button class="btn ghost" data-act="live2">Two-minute drill</button></div><p class="hint">Watching live lets you make halftime adjustments${state.settings.ask ? ', fourth-down calls and the final-drive call' : ''}. Quick sim lets your head coach make those calls. Two-minute drill sims the game and hands you every play call on the last drives if it's within one score.</p>` : thisWeek ? '<p class="hint">Answer the decision above before kickoff.</p>' : `<div class="row gap mt"><button class="btn primary" data-act="primary">${esc(primaryLabel())}</button></div>`}
    </section>`;
  } else if (state.gameOver) {
    // CL-27: a fired AD has no offseason desk to open
    next = `<section class="card next"><div class="eyebrow">Career over</div><h2 class="h2">Your tenure has ended</h2><p class="muted">${esc(state.gameOver.reason || '')}</p><button class="btn primary" data-act="tab" data-tab="file">Load or start a career</button></section>`;
  } else if (state.phase === 'offseason') {
    next = `<section class="card next"><div class="eyebrow">Offseason</div><h2 class="h2">Build the ${state.season + 1} ${isRealMich() ? 'Wolverines' : esc(myName()) + ' team'}</h2>${offChecklist()}<button class="btn primary" data-act="tab" data-tab="off">Open the offseason desk</button></section>`;
  } else {
    next = `<section class="card next"><div class="eyebrow">${esc(weekLabel(state.week))}</div><h2 class="h2">${esc(teamName(ME))}'s season is over</h2><p class="muted">The rest of the postseason is still being played.</p><button class="btn primary" data-act="primary">${esc(primaryLabel())}</button></section>`;
  }
  const lastC = last ? (() => { const a = last.h === ME ? last.hs : last.as, b = last.h === ME ? last.as : last.hs; return `<section class="card"><div class="eyebrow">Last game · ${esc(weekLabel(last.wk))}</div><div class="final"><span class="res ${last.mResult === 'W' ? 'w' : 'l'}">${last.mResult}</span><span class="sc">${a}–${b}</span><span>${siteOf(last)} ${tchip(oppOf(last))}</span></div><div class="row gap"><button class="btn ghost sm" data-act="box" data-id="${last.id}">Box score</button>${last.hl && last.hl.d.length ? `<button class="btn ghost sm" data-act="hlwatch" data-id="${last.id}">Highlights</button>` : ''}</div></section>`; })() : '';
  const news = state.news.slice(0, 14).map(n => `<li class="${n.kind}"><span class="when">${n.s} · ${n.wk <= 13 ? 'Wk ' + n.wk : 'Post'}</span>${esc(n.txt)}</li>`).join('');
  const goals = state.goals.map(gl => { const s = goalStatus(gl); return `<li><span class="gs ${s}">${s === 'met' ? 'Met' : s === 'failed' ? 'Missed' : 'Open'}</span>${esc(gl.txt)}</li>`; }).join('');
  const nat = Object.keys(state.teams).map(id => ({ id, o: teamOvr(id) })).sort((a, b) => b.o - a.o).findIndex(x => x.id === ME) + 1;
  const hw = heisWatch(5).map((c, i) => `<tr class="${c.tm === ME ? 'me' : ''}"><td class="num muted">${i + 1}</td><td>${c.pid ? `<button class="lnk" data-act="player" data-id="${c.pid}">${esc(c.n)}</button>` : esc(c.n)} <span class="muted small">${c.pos}</span></td><td>${tchip(c.tm, { short: true, norank: true })}</td></tr>`).join('');
  return `${eventCard()}${recruitWarn()}<div class="grid2">
   <div class="col">${next}${bowlWeekCard()}${lastC}
     ${practiceCard()}
     <section class="card"><div class="eyebrow">Poll position · ${state.season}</div>${rankChart(state.polls)}</section>
     <section class="card"><div class="eyebrow">Newswire</div><ul class="news">${news}</ul></section>
   </div>
   <div class="col">
     <section class="card"><div class="eyebrow">Your standing · ${DIFF[state.settings.diff].label} difficulty</div>
       ${meter('Board of Regents', state.meters.board, `Your job security. At or below ${diff().fire} at season’s end and you are out.${state.settings.noFire ? ' (Firing is off in Admin.)' : ''}`)}
       ${meter('Fan approval', state.meters.fan, 'Drives ticket demand and sponsorship.')}
       ${meter('Booster confidence', state.meters.boost, 'Drives donations and NIL collective money.')}
       ${meter('Locker room', state.meters.morale, 'Adds or subtracts a little on game day and affects transfers.')}
       ${meter('Coach’s hot seat', state.meters.hot, 'How loudly fans want the head coach gone. Keep a coach above 85 all year and the board blames you.', true)}
       ${meter('NCAA risk', Math.round(state.meters.risk), 'Rises with NIL overspending, a huge recruiting budget and bending recruiting rules. High risk can bring an investigation.', true)}
       <div class="legacy"><span class="k">Legacy score</span><b>${legacyScore()}</b><button class="lnk small" data-act="tab" data-tab="history">Achievements</button></div>
     </section>
     ${injuryCard()}${relCardHTML()}
     <section class="card"><div class="eyebrow">Board expectations · ${state.season}</div><ul class="goals">${goals}</ul></section>
     <section class="card"><div class="eyebrow">Team strength</div>
       <div class="tiles"><div><span class="k">Overall</span><span class="v">${ms.ovr.toFixed(0)}</span><span class="s">#${nat} of 138</span></div><div><span class="k">Offense</span><span class="v">${ms.off.toFixed(0)}</span></div><div><span class="k">Defense</span><span class="v">${ms.def.toFixed(0)}</span></div><div><span class="k">Special teams</span><span class="v">${ms.st.toFixed(0)}</span></div></div>
     </section>
     <section class="card"><div class="head"><div class="eyebrow">Heisman watch</div><button class="btn ghost sm" data-act="tab" data-tab="awards">Full list</button></div><table class="mini wide">${hw}</table></section>
   </div></div>`;
}

/* ---------- schedule ---------- */
function vSchedule() {
  const games = mGames(); let w = 0, l = 0; const rows = [];
  for (let wk = 1; wk <= 18; wk++) {
    const g = games.find(x => x.wk === wk);
    if (!g) { if (wk <= 13) rows.push(`<tr class="bye"><td>${wk}</td><td>${weekDate(state.season, wk)}</td><td colspan="4" class="muted">Open week</td></tr>`); continue; }
    const opp = oppOf(g); let res = '<span class="muted">—</span>', recs = '';
    if (g.done) { const a = g.h === ME ? g.hs : g.as, b = g.h === ME ? g.as : g.hs; if (a > b) w++; else l++; res = `<button class="lnk res-${a > b ? 'w' : 'l'}" data-act="box" data-id="${g.id}"><b>${a > b ? 'W' : 'L'}</b> ${a}–${b}${g.ot ? ' OT' : ''}</button>`; recs = `${w}-${l}`; }
    else if (!isFCS(opp)) res = `<span class="muted">${Math.round(mWinProb(g) * 100)}% win</span>`;
    const tag = rivalOf(opp) ? `<span class="pill maize">${esc(rivalOf(opp))}</span>` : g.type !== 'reg' ? `<span class="pill">${esc(g.name)}</span>` : g.loc ? `<span class="pill ghost">${esc(g.loc.split(' (')[0])}</span>` : (T(opp) && T(ME) && T(opp).conf === T(ME).conf && T(ME).conf !== 'IND' ? `<span class="pill ghost">${esc(confShort(T(ME).conf))}</span>` : '');
    rows.push(`<tr class="${g.done ? '' : 'up'}${state.week === wk && state.phase !== 'offseason' ? ' cur' : ''}"><td>${wk <= 13 ? wk : '—'}</td><td>${wk <= 13 ? weekDate(state.season, wk) : esc(weekLabel(wk).split(' · ').pop())}</td><td class="site">${siteOf(g)}</td><td>${tchip(opp, { rec: true })} ${tag}</td><td>${res}</td><td class="num">${recs}</td></tr>`);
  }
  return `<section class="card"><div class="head"><div><div class="eyebrow">${state.season} schedule</div><h2 class="h2">${esc(teamName(ME))} ${T(ME).w}-${T(ME).l}</h2></div><p class="hint">${state.season === 2026 && isRealMich() ? 'This is the real 2026 schedule. ' : ''}Tap a result for the box score.</p></div>
  <div class="tw"><table class="tbl sched"><thead><tr><th>Wk</th><th>Date</th><th></th><th>Opponent</th><th>Result</th><th>Rec</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></section>
  ${[state.season + 1, state.season + 2].map(futureSched).join('')}`;
}
function futureSched(s) {
  genNcOffers(s); const book = ncBooked(s); const offers = state.ncOffers[s] || []; const open = ncOpenWeeks(s);
  const slots = [1, 2, 3].map(wk => { const b = book.find(x => x.wk === wk); const ck = 'nc-' + s + '-' + wk; return `<div class="slot${b ? '' : ' open'}"><div class="eyebrow">Week ${wk}</div>${b ? `<div><b>${b.site === 'A' ? 'at ' : b.site === 'N' ? 'vs. ' : 'vs. '}${esc(teamName(b.opp))}</b></div><div class="small muted">${b.site === 'N' ? esc(b.loc) + ` · $${b.payout}M fee` : b.site === 'A' ? 'Return game of a home-and-home' : b.fee ? `Home · you pay $${b.fee}M` : 'Home'}</div>${ui.confirm === ck ? `<button class="btn danger sm" data-act="ncdrop" data-s="${s}" data-wk="${wk}">Pay $1M to cancel</button>` : `<button class="btn ghost sm" data-act="ask" data-k="${ck}">Cancel game</button>`}` : '<div class="muted">Open. If you leave it open, a home game against a Group of Six school is added.</div>'}</div>`; }).join('');
  const offerRows = offers.filter(o => !o.booked).map(o => `<div class="cand"><div><b>${esc(o.txt)}</b><div class="small muted">${esc(o.detail)}${o.opp && !isFCS(o.opp) ? ` · ${esc(CONFS[T(o.opp).conf].name)}, rated ${Math.round(T(o.opp).rating)}` : ''}</div></div><button class="btn sm" data-act="ncbook" data-s="${s}" data-id="${o.id}" ${open.length ? '' : 'disabled'}>Book</button></div>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Future non-conference schedule</div><h2 class="h2">${s}</h2></div><p class="hint">Weeks 1–3 are yours to fill. ${isRealMich() ? 'The nine Big Ten games, including Michigan State and Ohio State, are set by the conference.' : 'The rest of the schedule is set by your conference.'}</p></div><div class="slots">${slots}</div>${open.length ? `<div class="eyebrow mt">Offers for ${s}</div>${offerRows || '<p class="muted">No offers left.</p>'}` : ''}</section>`;
}

/* ---------- roster & depth ---------- */
function vRoster() {
  const pos = ui.rpos; let list = state.roster.filter(p => pos === 'ALL' || p.pos === pos); const s = ui.rsort;
  list.sort((a, b) => s === 'num' ? a.num - b.num : s === 'name' ? lastName(a.n).localeCompare(lastName(b.n)) : s === 'cls' ? CLASSES.indexOf(b.cls) - CLASSES.indexOf(a.cls) : s === 'pot' ? b.pot - a.pot : s === 'pay' ? b.pay - a.pay : b.ovr - a.ovr);
  const chips = ['ALL'].concat(POS_ORDER).map(p => `<button class="chip${pos === p ? ' on' : ''}" data-act="rpos" data-pos="${p}">${p === 'ALL' ? 'All' : p}<span>${p === 'ALL' ? state.roster.length : state.roster.filter(x => x.pos === p).length}</span></button>`).join('');
  const th = (k, l) => `<th><button class="sort${s === k ? ' on' : ''}" data-act="rsort" data-k="${k}">${l}</button></th>`;
  const caps = new Set(state.captains || []);
  const rows = list.map(p => `<tr><td class="num">${p.num}</td><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button>${caps.has(p.id) ? ' <span class="pill maize">C</span>' : ''}${p.transfer ? ' <span class="pill ghost">Transfer</span>' : ''}${p.recruit ? ` <span class="pill ghost">${p.star}★</span>` : ''}${p.walkon ? ' <span class="pill ghost">Walk-on</span>' : ''}${p.rsPlan ? ' <span class="pill ghost">Redshirting</span>' : ''}${unhappyPill(p)}</td><td>${p.pos}</td><td>${clsLabel(p)}</td><td class="small hide-sm">${p.pers && p.pers !== 'steady' ? esc(PERS[p.pers].label) : ''}</td><td class="small hide-sm">${fitCell(p)}</td><td class="nowrap hide-sm">${p.ht} · ${p.wt}</td><td class="muted hide-sm">${esc(p.home)}</td><td>${ovrTag(p.ovr)}</td><td class="num muted">${p.pot}</td><td>${depthLabel(p) ? `<span class="pill ${state.depth[p.pos].indexOf(p.id) < START[p.pos] ? 'maize' : 'ghost'}">${depthLabel(p)}</span>` : ''}${p.inj ? ` <span class="pill bad">Out ${p.inj} wk</span>` : ''}${p.susp ? ` <span class="pill warn">Suspended ${p.susp}</span>` : ''}</td><td class="num hide-sm">${fm2(p.pay)}</td><td class="muted hide-sm small">${esc(statLine(p))}</td></tr>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">${state.season} roster</div><h2 class="h2">${state.roster.length} players</h2></div><p class="hint">${state.season === 2026 && isRealMich() ? 'Names, numbers, classes, sizes and hometowns are from the official 2026 roster. Ratings and pay are game estimates.' : 'OVR is current ability; POT is ceiling.'} New signings are capped at ${rosterLimit()}.</p></div>
  <div class="chips">${chips}${csvBtn('roster')}</div>
  <div class="tw"><table class="tbl"><thead><tr>${th('num', '#')}${th('name', 'Name')}<th>Pos</th>${th('cls', 'Yr')}<th class="hide-sm">Trait</th><th class="hide-sm">Fit</th><th class="hide-sm">Ht · Wt</th><th class="hide-sm">Hometown</th>${th('ovr', 'OVR')}${th('pot', 'POT')}<th>Depth</th><th class="hide-sm"><button class="sort${s === 'pay' ? ' on' : ''}" data-act="rsort" data-k="pay">Pay</button></th><th class="hide-sm">Season</th></tr></thead><tbody>${rows}</tbody></table></div></section>${captainsCard()}${walkonCard()}`;
}
function vDepth() {
  const pos = ui.dpos; const ms = michStrength();
  const chips = POS_ORDER.map(p => { const st = starters(p); const avg = st.length ? Math.round(st.reduce((s, x) => s + x.ovr, 0) / st.length) : 0; return `<button class="chip${pos === p ? ' on' : ''}" data-act="dpos" data-pos="${p}">${p}<span>${avg}</span></button>`; }).join('');
  const ids = state.depth[pos]; let startSeen = 0; const n = START[pos]; const canEdit = !isCoach() || rolePositions(state.co.role).includes(pos);
  const rows = ids.map((id, i) => {
    const p = P(id); if (!p) return '';
    const ok = avail(p); const isStart = ok && startSeen < n; if (isStart) startSeen++;
    const slot = isStart ? (SLOT_LABELS[pos] ? SLOT_LABELS[pos][startSeen - 1] : 'Starter') : p.inj ? 'Injured' : p.susp ? 'Suspended' : '';
    const hdr = i === 0 ? '<li class="dhead">First team</li>' : i === n ? `<li class="dhead">${isStart ? 'Second team · starting while a first-teamer is out' : 'Second team'}</li>` : i === n * 2 ? '<li class="dhead">Reserves</li>' : '';
    const trs = Object.entries(p.tr || {}).map(([k, v]) => `${TRAIT_NAME[k]} ${v}`).join(' · ');
    return `${hdr}<li class="${isStart ? 'st' : ''}${!ok ? ' inj' : ''}"><span class="ord">${i + 1}</span><span class="slot">${slot}</span><span class="nmw"><button class="lnk nm" data-act="player" data-id="${p.id}">${esc(p.n)}</button><span class="small muted trs">${esc(trs)}${(() => { const l = fitLabel(playerFit(p)); return l && l !== 'Fits' ? ' · ' + l : ''; })()}</span></span><span class="muted cls">${clsLabel(p)} · #${p.num}${p.rsPlan ? ' · RS' : ''}</span>${ovrTag(p.ovr)}${canEdit ? '' : '<!--'}<span class="mv"><button class="icon" data-act="dmove" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(p.n)} up">▲</button><button class="icon" data-act="dmove" data-i="${i}" data-d="1" ${i === ids.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(p.n)} down">▼</button><button class="icon txt" data-act="dtop" data-i="${i}" ${i === 0 ? 'disabled' : ''}>Start</button></span>${canEdit ? '' : '-->'}</li>`;
  }).join('');
  const u = michUnits();
  return `${identityCardHTML()}<div class="grid2 depthg"><section class="card"><div class="head"><div><div class="eyebrow">Depth chart</div><h2 class="h2">${POS_NAME[pos]}</h2></div>${canEdit ? `<div class="row gap"><button class="btn ghost sm" data-act="dauto">Sort ${pos} by OVR</button><button class="btn ${depthLocked(pos).length ? 'primary' : 'ghost'} sm" data-act="dlock" aria-pressed="${!!depthLocked(pos).length}" title="Locked starters stay on top when the depth chart is sorted automatically">${depthLocked(pos).length ? 'Starters locked' : 'Lock starters'}</button>${!isCoach() || state.co.role === 'HC' ? '<button class="btn ghost sm" data-act="dautoall">Auto-set all</button>' : ''}</div>` : '<p class="hint">The staff sets this position.</p>'}</div>
  <div class="chips">${chips}</div><p class="hint">${n} starter${n > 1 ? 's' : ''} at ${pos}. Injured or suspended players are skipped on game day.</p><ol class="depth">${rows}</ol></section>
  <section class="card"><div class="eyebrow">Game-day ratings</div><div class="tiles"><div><span class="k">Overall</span><span class="v">${ms.ovr.toFixed(1)}</span></div><div><span class="k">Offense</span><span class="v">${ms.off.toFixed(1)}</span></div><div><span class="k">Defense</span><span class="v">${ms.def.toFixed(1)}</span></div><div><span class="k">Special teams</span><span class="v">${ms.st.toFixed(1)}</span></div></div>
  <div class="eyebrow mt">Unit strength from traits</div><div class="tiles"><div><span class="k">Run game</span><span class="v">${u.run.toFixed(0)}</span></div><div><span class="k">Pass game</span><span class="v">${u.pass.toFixed(0)}</span></div><div><span class="k">Run defense</span><span class="v">${u.runD.toFixed(0)}</span></div><div><span class="k">Pass defense</span><span class="v">${u.passD.toFixed(0)}</span></div></div>
  <p class="hint">Unit strengths decide which game plan works best against each opponent.</p>
  <table class="mini wide">${POS_ORDER.map(p => { const st = starters(p); return `<tr><td class="muted">${p}</td><td>${st.map(x => esc(lastName(x.n))).join(', ') || '—'}</td><td class="num">${st.length ? Math.round(st.reduce((s, x) => s + x.ovr, 0) / st.length) : '—'}</td></tr>`; }).join('')}</table></section></div>`;
}

/* ---------- staff ---------- */
/* ---------- team identity and relationships (shared by AD, Coach and GM views) ---------- */
const schN = (side, k) => ((side === 'off' ? OFF_SCH : DEF_SCH)[k] || { n: k }).n;
const fmEdge = x => (x > 0 ? '+' + x : x < 0 ? '−' + Math.abs(x) : 'even');
function fitHTML(p) { const f = playerFit(p); if (f == null) return ''; const sch = myScheme(); const lab = fitLabel(f); const side = OFF_SCH[sch.off].key[p.pos] ? 'off' : 'def'; return `<p class="small"><span class="pill ${lab === 'Great fit' ? 'good' : lab === 'Poor fit' ? 'warn' : 'ghost'}">${lab}</span> for your ${esc(schN(side, sch[side]))} ${side === 'off' ? 'offense' : 'defense'}.</p>`; }
function fitCell(p) { const l = fitLabel(playerFit(p)); return l ? `<span class="fit${l === 'Great fit' ? ' g' : l === 'Poor fit' ? ' b' : ''}">${l === 'Great fit' ? 'Great' : l === 'Poor fit' ? 'Poor' : 'Fits'}</span>` : '<span class="muted">—</span>'; }
function fitPill(p) { const l = fitLabel(playerFit(p)); return l && l !== 'Fits' ? ` <span class="pill ${l === 'Great fit' ? 'good' : 'ghost'}">${l}</span>` : ''; }
const unhappyPill = p => (rapOf(p) < 35 ? ' <span class="pill warn">Unhappy</span>' : '');
function rapHTML(x) { const v = rapOf(x); const w = (x.rapW || []).slice(0, 3); return `<p class="small"><b>Rapport with you:</b> ${Math.round(v)} · ${rapLabel(v)}${w.length ? ` <span class="muted">(${w.map(r => `${r.d > 0 ? '+' : '−'} ${esc(r.why.charAt(0).toLowerCase() + r.why.slice(1))}`).join('; ')})</span>` : ''}</p>`; }
function identityCardHTML() {
  const sch = myScheme(); const fb = schemeFitBonus(); const inst = schemeInstalling(); const s = state.staff || {};
  const nx = state.phase !== 'offseason' ? mGames().find(g => !g.done) : null; const opp = nx ? oppOf(nx) : null; const os = opp && !isFCS(opp) ? teamScheme(opp) : null; const se = os ? schemeEdge(opp) : null;
  const mine = state.schSet && state.schSet.tid === ME && (!isCoach() || state.schSet.role === state.co.role) ? state.schSet : {};
  const src = side => { const c = side === 'off' ? s.OC : s.DC; return mine[side] ? (isGM() ? 'set by the head coach at your request' : 'your call') : c && !c.me ? `${c.name}'s system` : "the program's system"; };
  const sideHTML = side => { const S = side === 'off' ? OFF_SCH : DEF_SCH; const k = sch[side]; const b = fb[side];
    return `<div><div class="eyebrow">${side === 'off' ? 'Offense' : 'Defense'} · ${esc(src(side))}</div><h3 class="h3">${esc(S[k].n)}${inst[side] ? ' <span class="pill warn">Installing</span>' : ''}</h3><p class="small muted">${esc(S[k].d)} It leans on ${Object.entries(S[k].key).map(([pos, ks]) => pos + ' ' + ks.map(x => TRAIT_NAME[x].toLowerCase()).join(' and ')).join(', ')}.</p><p class="small">Fit of your starters: <b class="${b >= 0 ? 'pos' : 'neg'}">${fmEdge(b)}</b> ${side === 'off' ? 'offense' : 'defense'} rating.</p>${canSetScheme(side) ? seg('setsch', k, Object.entries(S).map(([kk, v]) => [kk, v.n]), `data-side="${side}"`) : ''}</div>`; };
  const hint = isCoach() ? (canSetScheme('off') || canSetScheme('def') ? 'You pick the system for your side of the ball. A switch takes two games to install (−1 on that side while it does).' : 'The head coach and the coordinators pick the systems. Players who fit them play a little better.') : isGM() ? 'Your head coach runs these systems; you can ask him to switch. A switch takes two games to install (−1 on that side while it does).' : 'Your coordinators bring their own systems: hire a different coordinator to change one. A new system takes two games to install (−1 on that side while it does).';
  return `<section class="card"><div class="head"><div><div class="eyebrow">Team identity</div><h2 class="h3">${esc(OFF_SCH[sch.off].n)} offense · ${esc(DEF_SCH[sch.def].n)} defense</h2></div><p class="hint">${hint}</p></div>
   <div class="idgrid">${sideHTML('off')}${sideHTML('def')}</div>
   ${os ? `<p class="small mt"><b>Next: ${esc(teamName(opp))}</b> run ${aAn(OFF_SCH[os.off].n)} offense and ${aAn(DEF_SCH[os.def].n)} defense. Matchup: your offense <b>${fmEdge(se.off)}</b>, your defense <b>${fmEdge(se.def)}</b>.</p>` : ''}</section>`;
}
// your rapport with the people around you
function relCardHTML() {
  const rows = []; const row = (who, v, note, act) => rows.push(`<tr><td>${who}</td><td class="num"><b>${Math.round(v)}</b></td><td class="small muted">${rapLabel(v)}${note ? ' · ' + esc(note) : ''}${act || ''}</td></tr>`);
  if (hasBoss()) { const r = bossRel(); row(esc(bossName()), r.rap, r.rapW && r.rapW[0] ? r.rapW[0].why : ''); }
  const st = POS_ORDER.flatMap(pos => starters(pos)); if (st.length) row('Your starters', st.reduce((s, p) => s + rapOf(p), 0) / st.length, 'average');
  const sad = unhappy(); if (sad.length) rows.push(`<tr><td colspan="3" class="small"><b>Unhappy:</b> ${sad.slice(0, 4).map(p => `<button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button> (${p.pos}${p.rapW && p.rapW[0] ? ', ' + esc(p.rapW[0].why.toLowerCase()) : ''})`).join(', ')}${sad.length > 4 ? ` and ${sad.length - 4} more` : ''}</td></tr>`);
  const sf = state.staff || {}; ['OC', 'DC'].forEach(r => { const c = sf[r]; if (c && !c.me) row(esc(c.name) + ` <span class="small muted">${r}</span>`, rapOf(c), c.rapW && c.rapW[0] ? c.rapW[0].why : ''); });
  return `<section class="card"><div class="eyebrow">Relationships</div><table class="mini wide">${rows.join('')}</table><p class="hint">${hasBoss() ? 'Rapport with your boss counts in your season review. ' : 'The Board of Regents and the boosters are the meters above. '}Unhappy players are likelier to transfer${isPro() ? ' or want more money' : ''}; staff close to you are likelier to turn down other jobs.</p></section>`;
}
function coachCard(role, big) {
  const c = state.staff[role];
  if (!c) return `<div class="coach vacant"><div class="role">${ROLE_TITLE[role]}</div><div class="cname">Vacant</div><p class="hint">${role === 'HC' ? 'Hire from the candidates below.' : 'Hire below, or leave it open and a graduate assistant fills in (rating 62).'}</p></div>`;
  const conf = ui.confirm === 'fire-' + role;
  const ratings = role === 'HC' ? [['OFF', c.off], ['DEF', c.def], ['REC', c.rec], ['DEV', c.dev], ['GAME', c.gm]] : [['OVR', c.ovr], ['REC', c.rec], ['DEV', c.dev]];
  return `<div class="coach${big ? ' big' : ''}"><div class="role">${esc(c.title)}${c.interim ? ' <span class="pill warn">Interim</span>' : ''}</div><div class="cname">${esc(c.name)}</div>
   ${c.bg ? `<div class="hint">${esc(c.bg)}</div>` : c.note ? `<div class="hint">${esc(c.note)}</div>` : ''}
   <div class="rt">${ratings.map(([k, v]) => `<span><em>${k}</em>${v}</span>`).join('')}</div>
   ${!c.me ? `<div class="small muted">${role === 'OC' || role === 'DC' ? `Runs: ${esc(schN(role === 'OC' ? 'off' : 'def', coachSch(c)[role === 'OC' ? 'off' : 'def']))} · ` : ''}Rapport ${Math.round(rapOf(c))} (${rapLabel(rapOf(c))})</div>` : ''}
   ${role === 'HC' && !c.interim ? meter('Hot seat', state.meters.hot, '', true) : ''}
   <div class="contract">${c.interim ? 'Interim through the end of the season' : `${fm(c.salary)}/yr · ${c.years} yr${c.years === 1 ? '' : 's'} left · buyout ${fm(buyout(c))}${c.inc && (c.inc.conf || c.inc.cfp) ? ` · bonuses: ${c.inc.conf ? fm(c.inc.conf) + ' conf. title' : ''}${c.inc.conf && c.inc.cfp ? ', ' : ''}${c.inc.cfp ? fm(c.inc.cfp) + ' playoff' : ''}` : ''}`}</div>
   ${c.me ? '<div class="row gap"><span class="pill maize">You</span></div>' : c.interim || (isCoach() && !(state.co.role === 'HC' && role !== 'HC')) ? '' : `<div class="row gap">${conf ? `<button class="btn danger sm" data-act="fire" data-role="${role}">Confirm: fire and pay ${fm(buyout(c))}</button><button class="btn ghost sm" data-act="unconfirm">Cancel</button>` : `<button class="btn ghost sm" data-act="askfire" data-role="${role}">Fire</button>${isCoach() ? '' : canExtend(c) ? `<button class="btn ghost sm" data-act="negext" data-role="${role}">Negotiate extension</button>` : '<button class="btn ghost sm" disabled title="One extension per coach each season">Extended this season</button>'}`}</div>`}
  </div>`;
}
function candList(role) {
  const list = state.cands[role] || []; const blocked = (role === 'HC' && state.phase !== 'offseason') || (isCoach() && (state.co.role !== 'HC' || role === 'HC'));
  return `<div class="cands"><div class="eyebrow">${ROLE_TITLE[role]} candidates</div>${isCoach() && blocked ? '<p class="hint">The head coach and the AD fill this job.</p>' : blocked ? '<p class="hint">Head coaches are hired in the offseason. The interim coach runs the team until then.</p>' : ''}${isCoach() && !blocked ? `<p class="hint">Assistant pool: ${fm(assistantSpend())} of ${fm(state.co.contract.pool)} used.</p>` : ''}
  ${list.map(c => { const pa = Math.round(hireAccept(c, false) * 100); const r = role === 'HC' ? `OFF ${c.off} · DEF ${c.def} · REC ${c.rec} · DEV ${c.dev} · GAME ${c.gm}` : `OVR ${c.ovr} · REC ${c.rec} · DEV ${c.dev}`; return `<div class="cand${c.declined ? ' out' : ''}"><div><b>${esc(c.name)}</b> <span class="muted">· ${esc(c.bg)}</span><div class="small muted">${r} · asks ${fm(c.salary)}/yr for ${c.years} yrs${role === 'OC' || role === 'DC' ? ` · runs ${esc(schN(role === 'OC' ? 'off' : 'def', coachSch(c)[role === 'OC' ? 'off' : 'def']))}` : ''}</div></div>${c.declined ? '<span class="pill bad">Declined</span>' : blocked ? '' : `<div class="row gap"><button class="btn sm" data-act="negopen" data-role="${role}" data-id="${c.id}">Negotiate</button><button class="btn ghost sm" data-act="hire" data-role="${role}" data-id="${c.id}">Quick offer at ask (${pa}%)</button></div>`}</div>`; }).join('')}</div>`;
}
// your coaching tree: assistants who left for bigger jobs
function treeCardHTML() {
  const t = treeOf(); if (!t.length) return '';
  return `<section class="card"><div class="eyebrow">Your coaching tree</div><h2 class="h3">${t.length} former assistant${t.length === 1 ? '' : 's'}</h2><p class="hint">When one of them has a head coaching job you'll see it before you play his team. Former assistants sometimes show up as candidates when you have an opening, and they listen when you call.</p>
   <table class="mini wide">${t.slice().reverse().map(x => `<tr><td><b>${esc(x.name)}</b></td><td class="small">${esc(ROLE_TITLE[x.role] || x.role)} under you until ${x.s}</td><td class="small">${x.now === ME ? 'Back on your staff' : x.now && T(x.now) ? (x.nowRole === 'HC' ? 'Head coach' : esc(ROLE_TITLE[x.nowRole] || 'Assistant')) + ', ' + esc(teamName(x.now)) : x.now === null ? 'In the NFL' : '—'}</td></tr>`).join('')}</table></section>`;
}
const treeNote = opp => { const x = opp && treeAt(opp); return x ? `<p class="small"><span class="pill maize">Coaching tree</span> ${esc(teamName(opp))} is coached by ${esc(x.name)}, your former ${esc((ROLE_TITLE[x.role] || '').toLowerCase())}.</p>` : ''; };
function vStaff() {
  const vac = STAFF_ROLES.filter(r => !state.staff[r] || (r === 'HC' && state.staff.HC.interim));
  return `<section class="card"><div class="head"><div><div class="eyebrow">Football staff</div><h2 class="h2">${isCoach() ? `${esc(myName())} staff` : 'Coaching payroll ' + fm(staffPayroll())}</h2></div><p class="hint">${state.season === 2026 && isRealMich() ? 'Names and titles are the real 2026 staff. Ratings, salaries and contracts are game estimates.' : 'Firing a coach pays out part of the remaining contract.'} Firing a coach on the hot seat pleases fans; firing a winner angers boosters.</p></div>
   <div class="coachgrid top">${['HC', 'OC', 'DC', 'ST'].map(r => coachCard(r, r === 'HC')).join('')}</div>
   <div class="eyebrow mt">Position coaches</div><div class="coachgrid">${['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S'].map(r => coachCard(r)).join('')}</div></section>
   ${treeCardHTML()}${vac.length ? `<section class="card"><div class="head"><div><div class="eyebrow">Hiring</div><h2 class="h2">${vac.length} open job${vac.length > 1 ? 's' : ''}</h2></div><p class="hint">Offer odds depend on your program's standing, board support and the football building.</p></div>${vac.map(candList).join('')}</section>` : ''}`;
}

/* ---------- recruiting ---------- */
function recWhyHTML(r) { const w = recWhy(r); if (!w.pro.length && !w.con.length) return ''; return `<span class="rwhy">${w.pro.length ? `<span class="p">+ ${esc(w.pro.join(', '))}</span>` : ''}${w.pro.length && w.con.length ? ' · ' : ''}${w.con.length ? `<span class="c">− ${esc(w.con.join(', '))}</span>` : ''}</span>`; }
// QOL-13 / QOL-14: the counters stay in view while you scroll the board, with two bulk tools
function recBarHTML() {
  const rc = state.rec; if (!rc || rc.done) return ''; const out = rc.list.filter(x => x.offered && x.status === 'open').length; const sl = rc.list.filter(x => x.sl && x.status === 'open' && !x.offered).length; const weak = rc.list.filter(x => x.offered && x.status === 'open' && x.interest < 30 && (!isCoach() || canRecruit(x.pos))).length;
  const nilOn = rc.list.filter(x => x.nil && (x.status === 'open' || x.status === 'mc')).reduce((s, x) => s + (x.ask || 0), 0);
  return `<div class="recbar" role="status"><span><b>${out}</b>/30 offers</span><span><b>${rc.visits}</b> visits left</span><span><b>${recCommits().length}</b> commits</span>${nilOn ? `<span>NIL promised <b>${fm2(nilOn)}</b></span>` : ''}
   <span class="row gap">${isCoach() ? '' : `<button class="btn ghost sm" data-act="rbulk" data-v="sl" ${sl && out < 30 ? '' : 'disabled'} title="Offer everyone on your shortlist you have not offered yet (up to 30 offers out)">Offer shortlist${sl ? ` (${Math.min(sl, 30 - out)})` : ''}</button>`}<button class="btn ghost sm" data-act="rbulk" data-v="pull" ${weak ? '' : 'disabled'} title="Pull offers from prospects under 30 interest, to free up offer slots">Pull cold offers${weak ? ` (${weak})` : ''}</button></span></div>`;
}
function recBulk(k) {
  const rc = state.rec; if (!rc || rc.done) return null; let n = 0;
  if (k === 'sl') rc.list.filter(x => x.sl && x.status === 'open' && !x.offered).sort((a, b) => b.interest - a.interest).forEach(x => { if (toggleOffer(x.id) === 'ok') n++; });
  else if (k === 'pull') rc.list.filter(x => x.offered && x.status === 'open' && x.interest < 30 && (!isCoach() || canRecruit(x.pos))).forEach(x => { if (toggleOffer(x.id) === 'ok') n++; });
  else return null; return n;
}
function recTable(offMode) {
  const rc = state.rec; let list = rc.list.slice(); const f = ui.recF;
  if (f === 'offered') list = list.filter(r => r.offered && r.status === 'open'); else if (f === 'mc') list = list.filter(r => r.status === 'mc' || r.status === 'signed'); else if (f === 'top') list = list.filter(r => r.star >= 4); else if (f === 'lost') list = list.filter(r => r.status === 'lost'); else if (f === 'sl') list = list.filter(r => r.sl); else if (f === 'open') list = list.filter(r => r.status === 'open');
  const homeGames = mGames().filter(g => !g.done && g.h === ME && !g.neutral && g.type === 'reg');
  const done = rc.done;
  const rows = list.map(r => {
    const st = r.status === 'signed' ? '<span class="pill good">Signed</span>' : r.status === 'mc' ? '<span class="pill good">Committed</span>' : r.status === 'lost' ? `<span class="pill bad">${r.to === 'grayshirt' ? 'No roster spot' : 'Picked ' + esc(teamName(r.to))}</span>` : r.offered ? '<span class="pill maize">Offered</span>' : '<span class="pill ghost">Open</span>';
    const trend = r.trend > 0 ? `<span class="up">▲${r.trend}</span>` : r.trend < 0 ? `<span class="dn">▼${-r.trend}</span>` : '';
    const vis = r.visit === 'done' ? '<span class="small muted">Visited</span>' : r.visit ? `<span class="small">${esc(teamName(oppOf(state.games.find(g => g.id === r.visit) || { h: ME, a: '' })))} game</span> <button class="lnk small" data-act="rvisit" data-id="${r.id}" data-g="">undo</button>` : (!offMode && homeGames.length && rc.visits > 0 && r.status !== 'lost' && r.status !== 'signed') ? `<select data-act="rvisitsel" data-id="${r.id}" aria-label="Official visit for ${esc(r.n)}"><option value="">Invite…</option>${homeGames.map(g => `<option value="${g.id}">Wk ${g.wk} ${esc(teamName(g.a))}</option>`).join('')}</select>` : '<span class="muted small">—</span>';
    const actions = isCoach() && r.status === 'open' && !done && !canRecruit(r.pos) ? `<span class="small muted">${r.offered ? 'Offered by the staff' : 'Staff'}</span>` : r.status === 'open' && !done ? `${isCoach() ? coachTripButtons(r) : ''}<button class="tog${r.offered ? ' on' : ''}" data-act="roffer" data-id="${r.id}" aria-pressed="${r.offered}">${r.offered ? 'Offered' : 'Offer'}</button>${r.offered && !offMode ? ` <button class="tog${r.pt ? ' on' : ''}" data-act="rpt" data-id="${r.id}" aria-pressed="${!!r.pt}" ${r.pt ? 'disabled' : ''} title="Promise early playing time: more interest now; he expects to be on the two-deep by week 6 of his first season">${r.pt ? 'Promised PT' : 'Promise PT'}</button>` : ''}${r.offered && !r.contact && !isCoach() ? ` <button class="tog risky" data-act="rcontact" data-id="${r.id}" title="+8 interest, raises NCAA risk">Bend the rules</button>` : r.contact ? ' <span class="small warn-t">Extra contact</span>' : ''}` : '';
    const nil = r.ask > 0 && (r.status === 'open' || r.status === 'mc') && !done ? `<button class="tog${r.nil ? ' on' : ''}" data-act="rnil" data-id="${r.id}" aria-pressed="${!!r.nil}">${fm2(r.ask)}</button>` : '<span class="muted small">—</span>';
    return `<tr class="${r.status === 'signed' || r.status === 'mc' ? 'kept' : r.status === 'lost' ? 'out' : ''}"><td>${!offMode ? `<button class="lnk" data-act="rsl" data-id="${r.id}" aria-pressed="${!!r.sl}" aria-label="${r.sl ? 'Remove from' : 'Add to'} shortlist" title="Shortlist">${r.sl ? '★' : '☆'}</button> <button class="lnk small" data-act="rcmp" data-id="${r.id}" aria-pressed="${!!r.cmp}" title="Compare (up to 3)">${r.cmp ? '⇄✓' : '⇄'}</button> ` : ''}${esc(r.n)}${recScout(r) && recSleeper(r) ? ` <span class="pill good" title="${esc(recScout(r).name)} flagged him: more upside than his stars say">Sleeper</span>` : ''}${(r.status === 'open' || r.status === 'mc') && !done ? recWhyHTML(r) : ''}</td><td>${r.pos}</td><td class="stars">${stars(r.star)}</td>${(() => { if (!scoutRanges()) return `<td>${ovrTag(r.ovr)}</td><td class="num">${isCoach() && !r.scouted && !recScout(r) && r.star >= 3 ? `<span class="muted" title="Watch him play to get an exact read">${Math.max(r.ovr, r.pot - 6)}–${Math.min(99, r.pot + 6)}</span>` : r.pot}</td>`; const v = recView(r); const t = scoutTag(v, v.e); const rg = (a, b) => (a === b ? String(a) : `<span title="Scouting range: sharpen it with a scout in his region, a home visit or an official visit">${a}–${b}</span>`); return `<td>${v.e ? rg(v.lo, v.hi) : ovrTag(r.ovr)}${t ? ` <span class="pill small" title="${esc(t[1])}">${esc(t[0])}</span>` : ''}${v.e <= 1 ? ` <span class="small muted" title="${esc((PERS[recPers(r)] || {}).desc || '')}">${esc((PERS[recPers(r)] || {}).label || '')}</span>` : ''}</td><td class="num">${rg(v.plo, v.phi)}</td>`; })()}<td class="muted hide-sm">${esc(r.home)}${r.inState ? ' <span class="pill ghost">In-state</span>' : ''}</td><td><div class="ibar"><i style="width:${r.interest}%"></i></div><span class="num small">${r.interest}</span> ${trend}</td><td class="small muted hide-sm">${r.lead.map(id => id).join(', ')}</td><td>${st}</td><td>${actions}</td><td>${vis}</td><td>${nil}</td></tr>`;
  }).join('');
  const filters = [['all', 'All'], ['sl', `Shortlist (${rc.list.filter(r => r.sl).length})`], ['open', 'Uncommitted'], ['offered', 'Offered'], ['mc', 'Committed'], ['top', '4★ and 5★'], ['lost', 'Lost']].map(([k, l]) => `<button class="chip${f === k ? ' on' : ''}" data-act="recf" data-v="${k}">${l}</button>`).join('');
  return `<div class="chips">${filters}</div><div class="tw"><table class="tbl rec"><thead><tr><th>Prospect</th><th>Pos</th><th>Stars</th><th>OVR</th><th>POT</th><th class="hide-sm">Hometown</th><th>Interest</th><th class="hide-sm">Also in on him</th><th>Status</th><th>Offer</th><th>Visit</th><th>NIL</th></tr></thead><tbody>${rows || '<tr><td colspan="12" class="muted">Nobody matches this filter.</td></tr>'}</tbody></table></div>${offMode ? '' : recBarHTML()}`;
}
function recSummary() {
  const rc = state.rec; const commits = recCommits(); const offered = rc.list.filter(r => r.offered && r.status === 'open').length;
  return `<div class="tiles"><div><span class="k">Commits</span><span class="v">${commits.length}</span><span class="s">${commits.filter(r => r.star === 5).length} five-star · ${commits.filter(r => r.star === 4).length} four-star</span></div><div><span class="k">Projected class rank</span><span class="v">${commits.length ? '#' + classRank(commits) : '—'}</span></div><div><span class="k">Offers out</span><span class="v">${offered}</span><span class="s">max 30</span></div><div><span class="k">Official visits left</span><span class="v">${rc.visits}</span><span class="s">~${projRoom()} roster spots next year</span></div></div>`;
}
function vRecruit() {
  if (!state.rec) return '<section class="card"><p class="muted">No recruiting class yet.</p></section>';
  return `${isCoach() ? coachRecruitCard() : autoRecCard()}<section class="card"><div class="head"><div><div class="eyebrow">Class of ${state.rec.cls}</div><h2 class="h2">Recruiting board</h2></div><p class="hint">Interest moves every week. Offers help, wins help more. Invite prospects to a home game for an official visit: a win there is a big boost. Prospects commit at 86 interest and can flip if it drops. The line under each name shows what is helping (+) and hurting (−) his interest. Commits sign during the early period in December; everyone else decides on National Signing Day in the offseason.</p></div>${recSummary()}</section>
  <section class="card">${recTable(false)}</section>${natCard()}${scoutStaffCard()}`;
}

/* ---------- polls, awards, standings, scores, postseason ---------- */
function vPoll() {
  const isCfp = ui.poll === 'cfp' && state.cfp.length; const arr = isCfp ? state.cfp : state.polls;
  const idx = ui.pollIdx < 0 || ui.pollIdx >= arr.length ? arr.length - 1 : ui.pollIdx; const poll = arr[idx];
  const opts = arr.map((p, i) => `<option value="${i}" ${i === idx ? 'selected' : ''}>${esc(p.label)}</option>`).join('');
  const rows = poll ? poll.rows.map((r, i) => {
    const t = T(r.id); const rank = r.tie && i === 14 ? 14 : i + 1;
    const mvv = !isCfp && r.prev !== undefined ? (r.prev === 0 ? '<span class="up">new</span>' : r.prev > rank ? `<span class="up">▲${r.prev - rank}</span>` : r.prev < rank ? `<span class="dn">▼${rank - r.prev}</span>` : '<span class="muted">—</span>') : '';
    return `<tr class="${r.id === ME ? 'me' : ''}"><td class="num rk2">${rank}${r.tie ? 'T' : ''}</td><td>${tchip(r.id, { norank: true })} <span class="muted small">${CONFS[t.conf].name}</span></td><td class="num">${t.w}-${t.l}</td>${isCfp ? '' : `<td class="num">${r.pts}${r.fpv ? ` <span class="muted">(${r.fpv})</span>` : ''}</td><td class="num">${mvv}</td>`}</tr>`;
  }).join('') : '';
  const others = poll && poll.others && poll.others.length ? `<p class="small muted">Others receiving votes: ${poll.others.map(o => `${esc(teamName(o.id))} ${o.pts}`).join(', ')}</p>` : '';
  return `<section class="card"><div class="head"><div><div class="eyebrow">${isCfp ? 'College Football Playoff committee' : 'AP-style poll · 62 simulated voters'}</div><h2 class="h2">Top 25</h2></div>
   <div class="row gap"><div class="seg"><button class="${!isCfp ? 'on' : ''}" data-act="pollv" data-v="ap">AP poll</button><button class="${isCfp ? 'on' : ''}" data-act="pollv" data-v="cfp" ${state.cfp.length ? '' : 'disabled'}>CFP rankings</button></div><select id="pollsel" aria-label="Choose poll week">${opts}</select></div></div>
   ${poll && poll.real ? '<p class="hint">This is the actual 2026 preseason AP Top 25 order. Every poll after it is simulated: 62 voters each rank 25 teams, 25 points for first down to 1 for 25th.</p>' : !isCfp ? '<p class="hint">Points, with first-place votes in parentheses.</p>' : '<p class="hint">Committee rankings begin after Week 9 and decide the 12-team field: four power-conference champions, the top Group of Six team, and seven at-large teams. The top four seeds get byes.</p>'}
   <div class="tw"><table class="tbl poll"><thead><tr><th>#</th><th>Team</th><th>Rec</th>${isCfp ? '' : '<th>Pts</th><th>Prev</th>'}</tr></thead><tbody>${rows}</tbody></table></div>${others}</section>${predCardHTML()}`;
}
function vAwards() {
  const list = heisWatch(12);
  const rows = list.map((c, i) => `<tr class="${c.tm === ME ? 'me' : ''}"><td class="num rk2">${i + 1}</td><td>${c.pid ? `<button class="lnk" data-act="player" data-id="${c.pid}">${esc(c.n)}</button>` : esc(c.n)}</td><td>${c.pos}</td><td>${tchip(c.tm, { rec: true })}</td><td class="small muted">${esc(statLine({ pos: c.pos }, c.st))}</td></tr>`).join('');
  const past = state.awards.slice().reverse().map(a => {
    const w = (x, lbl) => x ? `<tr><td class="muted">${lbl}</td><td><b>${esc(x.n)}</b> <span class="muted">${x.pos || ''}</span></td><td>${tchip(x.tm, { norank: true })}</td></tr>` : '';
    return `<section class="card"><div class="eyebrow">${a.s} awards</div><div class="grid2"><div><table class="mini wide">${w(a.heis[0], 'Heisman Trophy')}${w(a.obrien, 'Davey O’Brien (QB)')}${w(a.walker, 'Doak Walker (RB)')}${w(a.bilet, 'Biletnikoff (WR)')}${w(a.bednarik, 'Bednarik (defense)')}${a.coy ? `<tr><td class="muted">Coach of the Year</td><td><b>${esc(a.coy.name)}</b></td><td>${tchip(a.coy.tm, { norank: true })}</td></tr>` : ''}</table>
     <div class="eyebrow mt">Heisman voting</div><ol class="small">${a.heis.map(h => `<li>${esc(h.n)}, ${h.pos}, ${esc(teamName(h.tm))} · ${h.pts} pts</li>`).join('')}</ol></div>
     <div><div class="eyebrow">All-America first team</div><ul class="small plainlist">${a.allAm.map(x => `<li class="${x.tm === ME ? 'meli' : ''}">${x.pos} · ${esc(x.n)}, ${esc(teamName(x.tm))}</li>`).join('')}</ul><div class="eyebrow mt">All-${esc(CONFS[T(ME).conf] ? CONFS[T(ME).conf].name : 'conference')} first team</div><ul class="small plainlist">${a.allB1G.map(x => `<li class="${x.tm === ME ? 'meli' : ''}">${x.pos} · ${esc(x.n)}, ${esc(teamName(x.tm))}</li>`).join('')}</ul></div></div></section>`;
  }).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Heisman watch · ${state.season}</div><h2 class="h2">Top candidates</h2></div><p class="hint">Stats plus team success. Other schools' stars are fictional players; ${isRealMich() ? 'Michigan candidates are your real roster.' : 'Your candidates come from your own roster.'}</p></div>
   <div class="tw"><table class="tbl sortable" data-sk="heis"><thead><tr><th>#</th><th>Player</th><th>Pos</th><th>Team</th><th>Season</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">The race starts after Week 1.</td></tr>'}</tbody></table></div></section>${weeklyCardHTML()}${past}`;
}
function vStandings() {
  const c = ui.sconf && CONFS[ui.sconf] ? ui.sconf : T(ME).conf;
  const chips = Object.values(CONFS).map(x => `<button class="chip${c === x.id ? ' on' : ''}" data-act="sconf" data-c="${x.id}">${x.name}</button>`).join('');
  const teams = CONFS[c].confGames ? standings(c) : CONFS[c].teams.map(T);
  const rows = teams.map((t, i) => `<tr class="${t.id === ME ? 'me' : ''}"><td class="num">${CONFS[c].confGames ? i + 1 : ''}</td><td>${tchip(t.id)}</td><td class="num">${CONFS[c].confGames ? t.cw + '-' + t.cl : '—'}</td><td class="num">${t.w}-${t.l}</td><td class="num">${t.pf}</td><td class="num">${t.pa}</td><td class="num muted">${Math.round(t.id === ME ? teamOvr(ME) : t.rating)}</td></tr>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">2026 alignment, all 138 FBS programs</div><h2 class="h2">${CONFS[c].name}</h2></div><p class="hint">Top two by conference record meet in each title game.</p></div><div class="chips">${chips}</div>
  <div class="tw"><table class="tbl sortable" data-sk="stand"><thead><tr><th>#</th><th>Team</th><th>Conf</th><th>Overall</th><th>PF</th><th>PA</th><th>Rating</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function gameRow(g) {
  const hw = g.done && g.hs > g.as; const hasM = g.h === ME || g.a === ME;
  const line = (id, sc, win) => `<div class="gl ${g.done ? (win ? 'win' : 'lose') : ''}">${tchip(id)}<span class="gsc">${g.done ? sc : ''}</span></div>`;
  return `<div class="game${hasM ? ' me' : ''}">${g.name && g.type !== 'reg' ? `<div class="gname">${esc(g.name)}</div>` : ''}${line(g.a, g.as, g.done && !hw)}${line(g.h, g.hs, hw)}<div class="gfoot">${g.done ? (g.ot ? 'Final/OT' : 'Final') : 'Upcoming'}${g.neutral ? ' · neutral' : ''}${hasM && g.done ? ` · <button class="lnk" data-act="box" data-id="${g.id}">Box score</button>` : ''}</div></div>`;
}
function vScores() {
  const maxWk = Math.max(1, ...state.games.map(g => g.wk));
  const wk = ui.swk && ui.swk <= maxWk ? ui.swk : Math.min(maxWk, Math.max(1, state.phase === 'regular' ? state.week - 1 : state.week));
  let list = state.games.filter(g => g.wk === wk); const f = ui.sfilter;
  if (f === 'top') list = list.filter(g => rankOf(g.h) || rankOf(g.a) || g.h === ME || g.a === ME || g.type !== 'reg'); else if (f === 'b1g') list = list.filter(g => (T(g.h) && T(g.h).conf === T(ME).conf) || (T(g.a) && T(g.a).conf === T(ME).conf));
  list.sort((a, b) => (b.h === ME || b.a === ME) - (a.h === ME || a.a === ME) || Math.min(rankOf(a.h) || 99, rankOf(a.a) || 99) - Math.min(rankOf(b.h) || 99, rankOf(b.a) || 99));
  const wopts = []; for (let w = 1; w <= maxWk; w++) if (state.games.some(g => g.wk === w)) wopts.push(`<option value="${w}" ${w === wk ? 'selected' : ''}>${esc(weekLabel(w))}</option>`);
  return `<section class="card"><div class="head"><div><div class="eyebrow">Around the nation</div><h2 class="h2">${esc(weekLabel(wk))}</h2></div><div class="row gap"><select id="swk" aria-label="Choose week">${wopts.join('')}</select>${seg('sfilter', f, [['top', 'Top 25'], ['b1g', CONFS[T(ME).conf] ? CONFS[T(ME).conf].name : 'Conference'], ['all', 'All games']])}</div></div>
  <div class="games">${list.map(gameRow).join('') || '<p class="muted">No games match this filter.</p>'}</div></section>`;
}
function vPost() {
  const b = state.bracket; const ccg = state.games.filter(g => g.type === 'ccg'); const ps = state.settings.playoff || { size: 12 };
  if (!b) {
    const proj = state.cfp.length ? `<p class="hint">Projected from the latest committee rankings.</p><ol class="proj">${state.cfp[state.cfp.length - 1].rows.slice(0, ps.size).map(r => `<li>${tchip(r.id, { rec: true, norank: true })}</li>`).join('')}</ol>` : '<p class="muted">The committee releases its first rankings after Week 9.</p>';
    return `<section class="card"><div class="eyebrow">College Football Playoff</div><h2 class="h2">${ps.size}-team field</h2>${proj}</section>${ccg.length ? `<section class="card"><div class="eyebrow">Conference championships</div><div class="games">${ccg.map(gameRow).join('')}</div></section>` : ''}`;
  }
  const s2 = b.seeds; const seedOf = id => s2.indexOf(id) + 1;
  const ln = (g, id, sc, w) => `<div class="bl ${g && g.done ? (w ? 'win' : 'lose') : ''}${id === ME ? ' me' : ''}"><span class="seed">${seedOf(id) || ''}</span>${tchip(id, { norank: true })}<span class="gsc">${g && g.done ? sc : ''}</span></div>`;
  const cell = (r, m) => {
    const g = state.games.find(x => x.type === 'cfp' && x.round === r && x.m === m);
    if (g) { const hw = g.done && g.hs > g.as; return `<div class="bg">${g.name && r > 1 ? `<div class="gname">${esc(g.name)}</div>` : ''}${ln(g, g.h, g.hs, hw)}${ln(g, g.a, g.as, g.done && !hw)}</div>`; }
    const bye = b.adv[r] && b.adv[r][m]; if (bye && r === 1) return `<div class="bg bye">${ln(null, bye, '', true)}<div class="gname">First-round bye</div></div>`;
    return '<div class="bg empty">TBD</div>';
  };
  const col = (r, title) => `<div class="round"><div class="rh">${title}</div>${Array.from({ length: 16 >> r }, (_, m) => cell(r, m)).join('')}</div>`;
  const bowls = state.games.filter(g => g.type === 'bowl');
  const autoTxt = ps.auto === 'p4g6' ? `Auto bids: ${['SEC', 'B1G', 'B12', 'ACC'].map(c => b.champs[c] ? esc(teamName(b.champs[c])) + ' (' + CONFS[c].name + ')' : '').filter(Boolean).join(', ')}, plus the top Group of Six team.` : ps.auto === 'champs5' ? 'Auto bids go to the five highest-ranked conference champions.' : 'No automatic bids: the top teams in the rankings get in.';
  return `<section class="card"><div class="head"><div><div class="eyebrow">${state.season} College Football Playoff · ${b.size || s2.length} teams</div><h2 class="h2">${state.champ ? esc(teamName(state.champ)) + ' are national champions' : 'The bracket'}</h2></div><p class="hint">${autoTxt} Change the format in Admin → Game settings.</p></div>
   <div class="bracket-wrap"><div class="bracket">${col(1, 'First round')}${col(2, 'Quarterfinals')}${col(3, 'Semifinals')}${col(4, 'Championship')}</div></div></section>
   <section class="card"><div class="eyebrow">Conference championships</div><div class="games">${ccg.map(gameRow).join('')}</div></section>
   <section class="card"><div class="eyebrow">Bowl season · ${bowls.length} games · conference tie-ins</div><div class="games">${bowls.sort((a, c) => (c.h === ME || c.a === ME) - (a.h === ME || a.a === ME)).map(gameRow).join('')}</div></section>`;
}
/* ---------- money, payroll, facilities ---------- */
function stepper(label, act, val, fmt, note, lim) {
  lim = lim || [false, false];
  const b = (d, at, verb, sym) => `<button class="icon" data-act="${act}" data-d="${d}" aria-label="${verb} ${label}" ${at ? `disabled title="Already at the ${d < 0 ? 'minimum' : 'maximum'}"` : ''}>${sym}</button>`;
  return `<div class="stepper"><div class="lbl">${label}</div><div class="ctl">${b(-1, lim[0], 'Decrease', '−')}<span class="val">${fmt(val)}</span>${b(1, lim[1], 'Increase', '+')}</div>${note ? `<div class="hint">${note}</div>` : ''}</div>`;
}
const leverLim = k => [leverAt(k, -1), leverAt(k, 1)];
function vMoney() {
  const f = state.fin, y = f.ytd, b = annualBudget(), tot = finTotals();
  const nextHome = mGames().find(g => !g.done && g.h === ME && !g.neutral);
  const dem = ticketDemand(nextHome ? nextHome.a : null); const cap = capacity(); const att = Math.round(cap * dem); const shareCap = r1(REV_SHARE_CAP * econ());
  const avgAtt = f.attend.length ? Math.round(f.attend.reduce((a, c) => a + c, 0) / f.attend.length) : 0;
  const homeGames = mGames().filter(g => g.h === ME && !g.neutral && g.type === 'reg').length;
  const rows = [['Ticket sales', y.tickets, att * f.ticket / 1e6 * homeGames * diff().money], [`${CONFS[T(ME).conf].name} media rights (est.)`, y.media, b.media], ['Donations', y.donations, b.donations], ['Sponsorship & licensing', y.sponsor, b.sponsor], ['Neutral-site & game fees', y.games, y.games], ['Postseason payouts', y.post, y.post], ['Special deals', y.events, y.events]];
  const erows = [['Coaching & support staff', y.salaries, b.salaries], ['Revenue sharing to players', y.revshare, b.revshare], ['NIL top-up (payroll over budget)', y.niltop, b.niltop], ['Operations & travel', y.ops, b.ops], ['Recruiting', y.recruiting, b.recruiting], ['Compliance office', y.compliance || 0, b.compliance], ['Coach incentives paid', y.incent || 0, y.incent || 0], ['Facility operations', y.facilities, b.facilities], ['Support for other varsity sports', y.other, b.other], ['Game guarantees paid', y.guar, y.guar], ['Coach buyouts', y.buyouts, y.buyouts], ['Other decisions', y.eventx, y.eventx], ...((y.debt || (state.bonds || []).length) ? [['Bond payments', y.debt || 0, (state.bonds || []).reduce((a, b) => a + b.pay, 0)]] : [])];
  if (balOn() && (f.balance < 0 || y.debt)) erows.push(['Interest on debt', y.debt || 0, r1((y.debt || 0) + Math.max(0, -f.balance) * 0.006 * Math.max(0, 13 - mGames().filter(g => g.done && g.type === 'reg').length))]);
  const tr = r => `<tr><td>${r[0]}</td><td class="num">${fm(r[1])}</td><td class="num muted">${fm(r[2])}</td></tr>`;
  const hist = state.history.map(h => ({ lbl: String(h.season), v: h.net, tip: `${h.season}: football net ${fm(h.net)}` }));
  // the season ahead in one number, with the biggest risk named (QOL-08)
  const projNet = r1(rows.reduce((s, r) => s + (r[2] || 0), 0) - erows.reduce((s, r) => s + (r[2] || 0), 0));
  const outlook = projNet < 0 ? `<p class="flash bad">Projected for the full season: ${fm(projNet)}.${b.niltop >= 3 ? ` The biggest cost over budget is the NIL top-up (${fm(b.niltop)}): the roster is paid more than the pay pool covers.` : ''}${f.balance < 0 ? ' The reserve is in debt' + (balOn() ? ', which costs about 8% a season in interest and tests the board\'s patience.' : '.') : ''}</p>` : '';
  return `${outlook}<div class="tiles big"><div><span class="k">Revenue to date</span><span class="v">${fm(tot.rev)}</span></div><div><span class="k">Expenses to date</span><span class="v">${fm(tot.exp)}</span></div><div><span class="k">Football net</span><span class="v ${tot.net >= 0 ? 'pos' : 'neg'}">${fm(tot.net)}</span></div><div><span class="k">Projected season</span><span class="v ${projNet >= 0 ? 'pos' : 'neg'}">${fm(projNet)}</span></div><div><span class="k">Department reserve</span><span class="v">${fm(f.balance)}</span></div></div>
  <div class="grid2"><section class="card"><div class="eyebrow">Levers</div>
   ${stepper('Average ticket price', 'tix', f.ticket, v => '$' + v, `Projected crowd for ${nextHome ? 'the ' + esc(teamName(nextHome.a)) + ' game' : 'a typical home game'}: <b>${att.toLocaleString()}</b> of ${cap.toLocaleString()} (${Math.round(dem * 100)}%).`, leverLim('ticket'))}
   ${stepper('Revenue sharing to football', 'rev', f.revPct, v => v + '% of $' + shareCap + 'M', `Share of the $${shareCap}M House settlement cap sent to football: ${fm(capAlloc())}. It pays player salaries first; see Payroll.`, leverLim('revPct'))}
   ${stepper('Recruiting budget', 'rbud', f.recruit, v => '$' + v.toFixed(1) + 'M', 'Each extra $1M lifts weekly recruit interest. Above $7M it draws NCAA attention.', leverLim('recruit'))}
   ${stepper('Compliance office', 'comp', f.compliance == null ? 1 : f.compliance, v => '$' + v.toFixed(1) + 'M', `Lowers NCAA risk each week and the odds of an investigation. Current risk: ${Math.round(state.meters.risk)}.`, leverLim('compliance'))}
   <div class="stepper"><div class="lbl">NIL collective fundraising drive</div>${f.drive ? '<div class="hint">Done this season.</div>' : '<button class="btn sm" data-act="drive">Launch drive</button><div class="hint">Raises $3–7M for the player pay pool this year. Costs some booster goodwill. Once per season.</div>'}</div>
  </section>
  <section class="card"><div class="eyebrow">Fiscal year ${state.season}–${String(state.season + 1).slice(2)}</div><div class="tw"><table class="tbl fin"><thead><tr><th>Revenue</th><th>To date</th><th>Full year</th></tr></thead><tbody>${rows.map(tr).join('')}</tbody><thead><tr><th>Expenses</th><th></th><th></th></tr></thead><tbody>${erows.map(tr).join('')}</tbody></table></div>
   <p class="hint">${esc(facName('stadium'))} seats ${cap.toLocaleString()}.${avgAtt ? ` Average attendance: ${avgAtt.toLocaleString()}.` : ''} All figures are game estimates. Construction comes out of the reserve, not the football net.</p></section></div>
   ${dealsCard()}${debtCard()}
   <section class="card"><div class="eyebrow">Football net by season</div>${barChart(hist, { fmt: v => '$' + Math.round(v) + 'M', title: 'Football net by season', empty: 'Finish a season to see the trend.' })}</section>`;
}
function vPayroll() {
  const pool = payPool(), pr = payroll(), room = payRoom();
  let list = state.roster.slice(); const s = ui.paySort;
  list.sort((a, b) => s === 'sat' ? satisfaction(a) - satisfaction(b) : s === 'ovr' ? b.ovr - a.ovr : b.pay - a.pay);
  const rows = list.map(p => { const m = marketValue(p); return `<tr><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button></td><td>${p.pos}</td><td>${ovrTag(p.ovr)}</td><td>${depthLabel(p)}</td><td class="num">${fm2(p.pay)}</td><td class="num muted">${fm2(m)}</td><td>${satPill(p)}</td><td><span class="row gap nowrap"><button class="icon" data-act="pay" data-id="${p.id}" data-d="-1" aria-label="Lower pay for ${esc(p.n)}" ${p.pay <= 0 ? 'disabled' : ''}>−</button><button class="icon" data-act="pay" data-id="${p.id}" data-d="1" aria-label="Raise pay for ${esc(p.n)}">+</button><button class="icon txt" data-act="paymkt" data-id="${p.id}">Market</button></span></td></tr>`; }).join('');
  const unhappy = state.roster.filter(p => satisfaction(p) < 0.85 && p.ovr >= 75).length;
  return `<section class="card"><div class="head"><div><div class="eyebrow">Player compensation</div><h2 class="h2">Payroll ${fm(pr)} of ${fm(pool)}</h2></div><p class="hint">The pay pool is your revenue-sharing allocation (${fm(capAlloc())}) plus NIL collective money (${fm(collectiveFunds())}, which grows with booster confidence). Anything over the pool is paid by the department as an NIL top-up. Underpaid starters are more likely to hit the transfer portal and may ask for raises.</p></div>
   <div class="tiles"><div><span class="k">Room under pool</span><span class="v ${room >= 0 ? 'pos' : 'neg'}">${fm(room)}</span></div><div><span class="k">Unhappy starters</span><span class="v">${unhappy}</span></div><div><span class="k">Top earner</span><span class="v sm">${esc(state.roster.slice().sort((a, b) => b.pay - a.pay)[0].n)}</span></div><div><span class="k">Room for transfers</span><span class="v">${room > 0 ? fm(room) : '$0'}</span></div></div>
   <div class="row gap mt"><button class="btn ghost sm" data-act="paystarters">Pay every starter market value</button><div class="seg"><button class="${s === 'pay' ? 'on' : ''}" data-act="paysort" data-v="pay">By pay</button><button class="${s === 'ovr' ? 'on' : ''}" data-act="paysort" data-v="ovr">By OVR</button><button class="${s === 'sat' ? 'on' : ''}" data-act="paysort" data-v="sat">Least happy</button></div></div>
   ${filterBox('payroll', 'Filter players')}<div class="tw mt"><table class="tbl sortable" data-sk="payroll"><thead><tr><th>Player</th><th>Pos</th><th>OVR</th><th>Depth</th><th>Pay</th><th>Market</th><th>Mood</th><th>Adjust</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function vFac() {
  const cards = state.facilities.map(f => { const d = FAC_DEFS.find(x => x.id === f.id); const cost = facCost(f.lvl); const can = f.lvl < 5 && !f.building && state.fin.balance >= cost;
    return `<section class="card fac"><div class="eyebrow">${esc(d.eff)}</div><h3 class="h3">${esc(facName(f.id))}</h3><p class="muted">${esc(d.desc)}</p><div class="pips">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= f.lvl ? 'on' : ''}${f.building && i === f.lvl + 1 ? ' bld' : ''}"></i>`).join('')}<span>Level ${f.lvl}${f.building ? ' → ' + (f.lvl + 1) : ''}</span></div>
    ${f.lvl >= 5 ? '<p class="hint">Top of the line.</p>' : f.building ? '<p class="hint">Under construction. Opens before next season.</p>' : `<button class="btn sm" data-act="build" data-id="${f.id}" ${can ? '' : 'disabled'}>Upgrade for ${fm(cost)}</button>${state.fin.balance < cost ? '<p class="hint">Not enough in the reserve.</p>' : ''}`}</section>`; }).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Facilities</div><h2 class="h2">Reserve: ${fm(state.fin.balance)}</h2></div><p class="hint">Upgrades take one offseason to build and are paid from the department reserve.</p></div></section><div class="facgrid">${cards}</div>`;
}

/* ---------- records ---------- */
// The record book on its own tab: team records, single-game, single-season and career marks, what was broken
// recently, and the achievements for breaking them. New marks set this season are tagged.
function vRecords() {
  const B = bookOf(); const fmtv = v => (Math.round(v * 10) / 10).toLocaleString();
  const row = (lbl, r) => `<tr><td>${esc(lbl)}</td><td class="num"><b>${r ? fmtv(r.v) : '—'}</b></td><td>${r ? (r.base ? '<span class="muted">Program record from before your time</span>' : esc(r.n)) : '<span class="muted">Nobody yet</span>'}</td><td class="muted small">${r ? (r.s || '') + (r.opp ? ' vs. ' + esc(r.opp) : '') : ''}${r && r.s === state.season && state.phase !== 'offseason' ? ' <span class="pill maize">New</span>' : ''}${r && r.cur ? ' <span class="pill ghost">Active</span>' : ''}</td></tr>`;
  const tbl = (title, rows, hint) => `<section class="card"><div class="eyebrow">${title}</div>${hint ? `<p class="hint">${hint}</p>` : ''}<div class="tw"><table class="tbl"><thead><tr><th>Record</th><th>Mark</th><th>Held by</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  const team = Object.entries(TEAM_REC).map(([k, [l]]) => row(l, B.team[k])).join('');
  const game = Object.entries(BOOK_KEYS).map(([k, [l]]) => row(l, B.game[k])).join('') + row('Points in a game', B.game.pts);
  const season = Object.entries(BOOK_KEYS).map(([k, [l]]) => row(l, B.season[k])).join('');
  const act = new Set(state.roster.map(p => p.n)); const ctop = B.careerTop || {}; const career = Object.entries(BOOK_KEYS).map(([k, [l]]) => row(l, ctop[k] ? Object.assign({}, ctop[k], { cur: act.has(ctop[k].n) }) : null)).join('');
  const log = (state.recLog || []).slice().reverse().slice(0, 15).map(x => `<li><span class="when">${x.s}${x.wk ? ' · Wk ' + x.wk : ''}</span><span><b>${esc(x.n)}</b>: ${esc(recLabel(x.tbl, x.k).toLowerCase())}, ${x.tbl === 'team' ? 'team record' : x.tbl === 'game' ? 'single game' : x.tbl === 'season' ? 'single season' : 'career'}, <b>${fmtv(x.v)}</b> <span class="muted">(was ${fmtv(x.pv)}${x.pn === 'Before your time' ? ', the old program record' : ', ' + esc(x.pn) + (x.ps ? ' ' + x.ps : '')})</span></span></li>`).join('');
  const got = state.ach || {}; const ach = ACH.filter(a => /^rec_/.test(a[0])).map(([id, name, desc, pts]) => `<div class="ach${got[id] ? ' on' : ''}"><b>${esc(name)}</b><span>${esc(desc)}</span><em>${got[id] ? 'Unlocked ' + got[id].s : pts + ' pts'}</em></div>`).join('');
  return `<section class="card"><div class="head"><div><div class="eyebrow">Record book · ${esc(myName())}</div><h2 class="h2">Records</h2>${csvBtn('records')}</div><p class="hint">The program's record book. Breaking a mark set by someone else, or in an earlier season, is news and counts toward the achievements below.</p></div><div class="achs">${ach}</div></section>
   ${log ? `<section class="card"><div class="eyebrow">Recently broken</div><ul class="news">${log}</ul></section>` : ''}
   <div class="grid2"><div class="col">${tbl('Team records', team)}${tbl('Single game', game)}</div><div class="col">${tbl('Single season', season)}${tbl('Career', career, 'Career totals with your program. Updated at the end of each season.')}</div></div>`;
}

/* ---------- history ---------- */
function vHistory() {
  const byS = {}; state.trophies.forEach(t => (byS[t.s] = byS[t.s] || []).push(t));
  const trophy = Object.keys(byS).length ? Object.keys(byS).sort((a, b) => b - a).map(s => `<div class="trow"><span class="ts">${s}</span><div class="tl">${byS[s].map(t => `<span class="trophy ${t.k}">${esc(t.t)}</span>`).join('')}</div></div>`).join('') : '<p class="muted">Empty for now. Win a rivalry game, a bowl or a title to start filling it.</p>';
  const riv = Object.entries(state.rivals).map(([id, r]) => { const log = state.rivalLog.filter(x => x.opp === id); return `<div class="rival"><div class="eyebrow">${esc(r.name)}</div><h3 class="h3">vs. ${esc(teamName(id))}</h3><div class="big">${r.w}-${r.l}${r.t ? '-' + r.t : ''}</div><div class="hint">${esc(r.note)}, updated with your games.</div>${h2hLine(h2hStats(log))}${log.length ? `<ul class="small plainlist">${log.slice().reverse().map(x => `<li><b class="${x.win ? 'res-w' : 'res-l'}">${x.win ? 'W' : 'L'}</b> ${x.ms}-${x.os} · ${x.s}</li>`).join('')}</ul>` : ''}</div>`; }).join('');
  const bk = ui.book; const src = bk === 'career' ? careerTable() : state.book[bk];
  const brow = Object.entries(BOOK_KEYS).concat([['pts', ['Points in a game']]]).filter(([k]) => bk === 'game' || k !== 'pts').map(([k, [lbl]]) => { const r = src[k]; return `<tr><td>${lbl}</td><td class="num"><b>${r ? r.v : '—'}</b></td><td>${r ? esc(r.n) : ''}</td><td class="muted">${r ? (r.s || '') + (r.opp ? ' vs. ' + esc(r.opp) : '') + (r.cur ? 'active' : '') : ''}</td></tr>`; }).join('');
  const draft = state.draft.length ? draftHistTable() : '<p class="muted">No draft picks yet. Players leave for the NFL after the season.</p>';
  const hs = state.history;
  const wins = hs.map(h => ({ lbl: String(h.season), v: h.w, tip: `${h.season}: ${h.w}-${h.l}${h.rank ? ', finished No. ' + h.rank : ''}` }));
  const seasons = hs.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Record</th><th>Conf.</th><th>Final rank</th><th>Postseason</th><th>Head coach</th><th>Class rank</th><th>Football net</th></tr></thead><tbody>${hs.slice().reverse().map(h => `<tr><td>${h.season}${h.recap ? ` <button class="lnk small" data-act="recap" data-s="${h.season}">Recap</button>` : ''}</td><td>${h.w}-${h.l}${h.vacated ? ' <span class="pill bad">Vacated</span>' : ''}</td><td>${h.cw}-${h.cl}</td><td>${h.rank ? '#' + h.rank : 'NR'}</td><td>${esc(h.bowl || '—')}${h.champ === ME ? ' · <b>National champions</b>' : ''}</td><td>${esc(h.hc)}</td><td>${h.classRank ? '#' + h.classRank : '—'}</td><td class="num">${fm(h.net)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Your first season is still in progress.</p>';
  shareKick(); return `${sharePostCard()}<section class="card"><div class="head"><div><div class="eyebrow">Legacy</div><h2 class="h2">Legacy score ${legacyScore()}</h2></div><p class="hint">Titles, wins, archrival wins, profits, draft picks, Heismans and achievements, multiplied by difficulty (Easy ×0.8, Hard ×1.3). <button class="lnk" data-act="exportcareer">Share your career summary</button></p></div>${achGrid()}</section>
   ${hlCardHTML()}${goalsCardHTML()}${hofCardHTML()}${timelineCardHTML()}
   <section class="card"><div class="eyebrow">Trophy case</div><h2 class="h2">Under your watch</h2>${trophy}</section>
   <section class="card"><div class="eyebrow">Rivalries</div><div class="rivals">${riv}</div></section>
   <section class="card"><div class="head"><div><div class="eyebrow">Record book</div><h2 class="h2">${esc(myName())} records during your tenure</h2></div>${seg('bookv', bk, [['game', 'Single game'], ['season', 'Single season'], ['career', 'Career']])}</div><div class="tw"><table class="tbl"><thead><tr><th>Record</th><th>Mark</th><th>Player</th><th>When</th></tr></thead><tbody>${brow}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Seasons</div>${seasons}${hs.length ? `<div class="eyebrow mt">Wins by season</div>${barChart(wins, { fmt: v => Math.round(v), title: 'Wins by season', min0: true })}` : ''}</section>
   <section class="card"><div class="eyebrow">NFL Draft picks produced</div>${draft}</section>${alumniCard()}${state.investigations.length ? `<section class="card"><div class="eyebrow">NCAA investigations</div><ul class="plainlist">${state.investigations.map(x => `<li><b>${x.s}</b> · ${esc(x.out)}</li>`).join('')}</ul></section>` : ''}`;
}

/* ---------- offseason ---------- */
// the next-step checklist: what still blocks moving on, each with a link to where it gets done
function offChecklist() {
  if (state.phase !== 'offseason' || typeof offBlockers !== 'function') return '';
  const b = offBlockers(); const labs = isPro() ? proStepLabels() : offStepLabels(); const step = isPro() ? (PS().off ? PS().off.step : 0) : state.off.step;
  const ok = k => curTabs().some(t => t[0] === k) && (!isPro() || proTabVisible(k));
  const lnk = x => x.act ? ` <button class="lnk" data-act="${x.act}">${x.act === 'jobsopen' ? 'See open jobs' : 'Finish the move'}</button>` : x.tab && ok(x.tab) && x.tab !== ui.tab ? ` <button class="lnk" data-act="tab" data-tab="${x.tab}">Go to ${esc((curTabs().find(t => t[0] === x.tab) || ['', x.tab])[1])}</button>` : '';
  const nxt = labs[step + 1] ? `Next: ${esc(labs[step + 1])}.` : 'Next: the new season.';
  return `<div class="checklist" role="status"><p class="small"><b>Step ${step + 1} of ${labs.length}: ${esc(labs[step] || '')}.</b> ${nxt}</p>${b.length ? `<ul>${b.map(x => `<li class="todo">${esc(x.txt)}${lnk(x)}</li>`).join('')}</ul>` : '<p class="small ok">Nothing is holding you up. Continue when you are ready.</p>'}</div>`;
}
function vOff() {
  if (state.phase !== 'offseason') return '<section class="card"><p class="muted">The offseason opens after the national championship.</p></section>';
  const o = state.off; const step = o.step;
  if (isCoach() && step <= 1) return coachOffTop(step);
  const steps = offStepLabels().map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'on' : ''}"><span>${i + 1}</span>${s}</li>`).join('');
  let body = '';
  if (step === 0) {
    const rv = o.review; const aw = state.awards[state.awards.length - 1];
    body = `<section class="card"><div class="eyebrow">Season recap</div><h2 class="h2">${rv.w}-${rv.l}${rv.finalRank ? ', finished No. ' + rv.finalRank : ', unranked'}${rv.champ === ME ? ' · National champions' : ''}</h2>
     ${rv.inv ? `<p class="flash bad">NCAA investigation: ${esc(rv.inv)}</p>` : ''}
     <ul class="goals">${rv.goals.map(g => `<li><span class="gs ${g.st}">${g.st === 'met' ? 'Met' : g.st === 'failed' ? 'Missed' : '—'}</span>${esc(g.txt)}</li>`).join('')}</ul>
     <div class="tiles"><div><span class="k">Board of Regents</span><span class="v">${rv.boardBefore} → ${rv.boardAfter}</span><span class="s ${rv.delta >= 0 ? 'pos' : 'neg'}">${rv.delta >= 0 ? '+' : ''}${rv.delta}</span></div><div><span class="k">Football net</span><span class="v ${rv.fin.net >= 0 ? 'pos' : 'neg'}">${fm(rv.fin.net)}</span></div><div><span class="k">Regular-season wins</span><span class="v">${rv.regW}</span><span class="s">expected ${rv.exp}</span></div><div><span class="k">Legacy score</span><span class="v">${legacyScore()}</span></div></div>
     ${rv.recap ? `<div class="mt">${recapView(rv.recap, state.season)}</div>` : ''}
     ${aw && aw.heis[0] ? `<p class="mt">Heisman Trophy: <b>${esc(aw.heis[0].n)}</b>, ${aw.heis[0].pos}, ${esc(teamName(aw.heis[0].tm))}. <button class="lnk" data-act="tab" data-tab="awards">All awards</button></p>` : ''}
     ${teamAwards()}<div class="row gap mt"><button class="btn primary" data-act="offnext">Go to the board meeting</button></div></section>${!state.gameOver && state.exec && state.exec.offers && state.exec.offers.length ? execOffersHTML(state.exec.offers) : ''}`;
  } else if (step === 1) {
    const bd = ui.board; const facs = state.facilities.filter(f => !f.building && f.lvl < 5);
    const expiring = (state.deals || []).filter(d => d.thru <= state.season + 1);
    body = o.boardRes ? `<section class="card"><div class="eyebrow">Board meeting</div><h2 class="h2">The board has decided</h2><ul class="news">${o.boardRes.map(r => `<li>${esc(r)}</li>`).join('')}</ul><div class="row gap mt"><button class="btn primary" data-act="offnext">Continue to the coaching staff</button></div></section>`
    : `<section class="card"><div class="eyebrow">Board meeting · Board of Regents at ${state.meters.board}</div><h2 class="h2">Present your plan</h2><p class="hint">Approval odds rise with board confidence and a profitable year.</p>
     <div class="bitem"><div class="lbl">Budget</div>${seg('bstance', bd.stance, [['invest', 'Invest to win'], ['balanced', 'Balanced'], ['lean', 'Tighten the belt']])}<div class="hint">${bd.stance === 'invest' ? `+$1.5M recruiting. About ${Math.round(boardApprove(0.5) * 100)}% to pass.` : bd.stance === 'lean' ? '−$1M recruiting, board +3. Always passes.' : 'No change. Always passes.'}</div></div>
     <div class="bitem"><div class="lbl">Facility request</div><select id="bfac" aria-label="Facility request"><option value="none">No request</option>${facs.map(f => `<option value="${f.id}" ${bd.fac === f.id ? 'selected' : ''}>${esc(facName(f.id))} (level ${f.lvl} → ${f.lvl + 1}), university pays half of ${fm(facCost(f.lvl))}</option>`).join('')}</select><div class="hint">About ${Math.round(boardApprove(0.45) * 100)}% to pass. If approved, construction starts now.</div></div>
     <div class="bitem"><div class="lbl">Ticket prices</div>${seg('btix', bd.tix, [['raise', 'Raise $10'], ['hold', 'Hold'], ['cut', 'Cut $10']])}</div>
     ${o.vote ? `<div class="bitem"><div class="lbl">Conference expansion vote</div><p>The ${CONFS[T(ME).conf].name} is considering adding ${o.vote.teams.map(id => esc(teamName(id))).join(' and ')}. More teams mean more TV money (+$3M a year) and a tougher schedule.</p>${seg('bvote', bd.vote, [['yes', 'Vote yes'], ['no', 'Vote no']])}</div>` : ''}
     ${mediaDue() ? `<div class="bitem"><div class="lbl">Conference media rights</div><p class="small">The ${esc(CONFS[T(ME).conf].name)} TV deal is up. Push the conference toward:</p>${seg('bmedia', bd.media || 'linear', Object.entries(MEDIA_PLANS).map(([k, v]) => [k, v.n]))}<div class="hint">${esc(MEDIA_PLANS[bd.media || 'linear'].d)}${(bd.media || 'linear') !== 'linear' ? ` About ${Math.round(mediaOdds() * 100)}% the conference goes along. The new deal runs seven years.` : ' The new deal runs seven years.'}</div></div>` : ''}
     <div class="bitem"><div class="lbl">Conference move</div><select id="bmove" aria-label="Apply to another conference"><option value="none">Stay in the ${esc(CONFS[T(ME).conf].name)}</option>${Object.values(CONFS).filter(c => c.id !== T(ME).conf && c.id !== 'IND' && (c.p4 || !CONFS[T(ME).conf].p4)).map(c => `<option value="${c.id}" ${bd.move === c.id ? 'selected' : ''}>Apply to the ${esc(c.name)} (about ${Math.round(moveOdds(c.id) * 100)}% to be accepted)</option>`).join('')}</select><div class="hint">${bd.move && bd.move !== 'none' ? `If accepted, you join next season and pay a $${moveFee(bd.move)}M exit fee. A new conference means a new schedule and new rivals for the title.` : 'Leagues take programs that win, draw fans and invest in facilities.'}</div></div>
     ${expiring.length ? `<p class="hint">Heads up: ${expiring.map(d => esc(d.name.toLowerCase())).join(', ')} ${expiring.length > 1 ? 'are' : 'is'} up for renewal. Negotiate in Finances.</p>` : ''}
     <div class="row gap mt"><button class="btn primary" data-act="presentboard">Present to the board</button></div></section>`;
  } else if (step === 2) {
    const poach = (o.poach || []).map((x, i) => { const c = state.staff[x.role]; if (x.done) return `<div class="cand"><div><b>${ROLE_TITLE[x.role]}</b>: ${x.result === 'stayed' ? 'stayed with a raise' : 'left the program'}</div></div>`; if (!c) return ''; return `<div class="cand"><div><b>${esc(x.suitor)}</b> is after ${esc(c.name)} (${ROLE_TITLE[x.role]}).<div class="small muted">Matching costs about ${Math.round(x.raise * 100)}% more per year (${fm(c.salary * (1 + x.raise))}) plus two extra years.</div></div><div class="row gap"><button class="btn sm" data-act="poach" data-i="${i}" data-m="1">Match the offer</button><button class="btn ghost sm" data-act="poach" data-i="${i}" data-m="0">Let him go</button></div></div>`; }).join('');
    const pend = (o.poach || []).some(x => !x.done);
    body = `<section class="card"><div class="eyebrow">Coaching carousel</div><h2 class="h2">Set the staff for ${state.season + 1}</h2>${poach ? `<div class="eyebrow mt">Other programs are calling</div>${poach}` : ''}${(o.coachNews || []).length ? `<ul class="news mt">${o.coachNews.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
     <div class="row gap mt"><button class="btn primary" data-act="offnext" ${state.staff.HC && !pend ? '' : 'disabled'}>${pend ? 'Answer the offers above first' : state.staff.HC ? 'Continue to departures' : 'Hire a head coach to continue'}</button></div></section>${vStaff()}`;
  } else if (step === 3) {
    const d = o.departures; const leaving = d.filter(x => !x.kept).length;
    body = `<section class="card"><div class="eyebrow">Departures</div><h2 class="h2">${leaving} players leaving</h2><p class="hint">You can try once to keep a graduating senior for a fifth year or talk a player out of the portal.</p>
     <div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Yr</th><th>OVR</th><th>Reason</th><th></th></tr></thead><tbody>${d.map(x => { const p = P(x.id); if (!p) return ''; const canTry = !x.tried && (x.why === 'Graduating' || x.why.startsWith('Entered transfer portal')); return `<tr class="${x.kept ? 'kept' : ''}"><td>${esc(p.n)}${p.pers === 'diva' ? ' <span class="pill ghost">Diva</span>' : ''}</td><td>${p.pos}</td><td>${clsLabel(p)}</td><td>${ovrTag(p.ovr)}</td><td>${esc(x.why)}</td><td>${x.kept ? '<span class="pill good">Staying</span>' : x.tried ? '<span class="pill bad">Leaving</span>' : canTry && (!isCoach() || canRecruit(p.pos)) ? `<button class="btn ghost sm" data-act="retain" data-id="${x.id}">Try to keep</button>${x.why.includes('money') ? ` <button class="btn ghost sm" data-act="retainpay" data-id="${x.id}">Pay market and keep</button>` : ''}` : ''}</td></tr>`; }).join('')}</tbody></table></div>
     <div class="row gap mt"><button class="btn primary" data-act="offnext">Say goodbye and open the transfer portal</button></div></section>`;
  } else if (step === 4) {
    const room = rosterLimit() - state.roster.length;
    body = `<section class="card"><div class="head"><div><div class="eyebrow">Transfer portal</div><h2 class="h2">${isCoach() ? 'The transfer portal' : 'Room under the pay pool: ' + fm(payRoom())}</h2></div><p class="hint">Roster: ${state.roster.length} of ${rosterLimit()}. Leave room for recruits on Signing Day.</p></div>
     <div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Yr</th><th>From</th><th>OVR</th><th>POT</th><th>Interest</th><th>Pay ask</th><th></th></tr></thead><tbody>${o.portal.map(x => `<tr class="${x.signed ? 'kept' : x.declined ? 'out' : ''}"><td>${esc(x.n)}</td><td>${x.pos}</td><td>${x.cls}</td><td class="muted">${esc(x.from)}</td><td>${ovrTag(x.ovr)}</td><td class="num muted">${x.pot}</td><td class="num">${x.interest}%</td><td class="num">${fm2(x.ask)}</td><td>${x.signed ? '<span class="pill good">Signed</span>' : x.declined ? '<span class="pill bad">Went elsewhere</span>' : (!isCoach() || canRecruit(x.pos)) ? `<button class="btn sm" data-act="portal" data-id="${x.id}" ${payRoom() >= x.ask && room > 0 ? '' : 'disabled'}>Pursue</button>` : '<span class="small muted">Staff</span>'}</td></tr>`).join('')}</tbody></table></div>
     <div class="row gap mt"><button class="btn primary" data-act="offnext">Close the portal</button></div></section>`;
  } else if (step === 5) {
    const rc = state.rec; const room = rosterLimit() - state.roster.length;
    body = `<section class="card"><div class="head"><div><div class="eyebrow">National Signing Day · Class of ${rc.cls}</div><h2 class="h2">${rc.done ? `Signed ${rc.signed.length} · class rank #${rc.classRank}` : `${recCommits().length} commits · ${room} roster spots`}</h2></div><p class="hint">${rc.done ? 'Signees join the roster as freshmen. Every other school signed a class too; see the national rankings below.' : 'Commits and early signees are locked in. Uncommitted prospects you offered decide today based on their interest.'}</p></div>${recSummary()}</section>
     <section class="card">${recTable(true)}<div class="row gap mt">${rc.done ? '<button class="btn primary" data-act="offnext">Continue to the NFL Draft</button>' : '<button class="btn primary" data-act="signday">Hold National Signing Day</button>'}</div></section>${rc.done ? natCard() : ''}`;
  } else if (step === 6) {
    body = o.nfl ? draftResultsHTML(o.nfl, true) : draftPreHTML();
  } else if (step === 7) {
    body = `<section class="card"><div class="eyebrow">Player development</div><h2 class="h2">Biggest jumps this offseason</h2><p class="hint">Growth depends on each player's ceiling, his position coach, facilities, starting time, the Hard worker trait and young-player practice time. Players who appeared in four or fewer games kept a year of eligibility (RS).</p>
     <div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>New class</th><th>OVR</th></tr></thead><tbody>${(o.devlog || []).map(x => { const p = P(x.id); return p ? `<tr><td>${esc(p.n)}</td><td>${p.pos}</td><td>${clsLabel(p)}</td><td>${x.before} → ${ovrTag(x.after)} <span class="up">+${x.after - x.before}</span></td></tr>` : ''; }).join('')}</tbody></table></div></section>
     ${captainsCard()}${walkonCard()}
     <section class="card"><div class="row gap"><button class="btn primary" data-act="offnext">Start the ${state.season + 1} season</button></div></section>`;
  }
  return `<section class="card"><ol class="steps">${steps}</ol>${offChecklist()}</section>${step < 5 ? recruitWarn() : ''}${body}`;
}
function teamAwards() {
  const best = f => state.roster.map(p => ({ p, v: f(p.lastSt || {}) })).sort((a, b) => b.v - a.v)[0];
  const off = best(s => (s.py || 0) * 0.05 + (s.ptd || 0) * 4 + (s.ry || 0) * 0.1 + (s.rtd || 0) * 6 + (s.rcy || 0) * 0.1 + (s.rctd || 0) * 6);
  const def = best(s => (s.tk || 0) + (s.sk || 0) * 4 + (s.int || 0) * 5);
  const line = (lbl, x) => x && x.v > 0 ? `<li><span class="gs met">${lbl}</span>${esc(x.p.n)} · ${esc(statLine(x.p, x.p.lastSt))}</li>` : '';
  return `<div class="eyebrow mt">Team awards</div><ul class="goals">${line('Offensive MVP', off)}${line('Defensive MVP', def)}</ul>`;
}

/* ---------- save file ---------- */
function vFile() {
  const meta = slotsMeta();
  const cards = [1, 2, 3, 4, 5].map(i => {
    const m = meta[i]; const active = i === slot && !saveBlocked; const has = !!lsGet(SLOT_KEY(i));
    const info = has && m ? `${m.chal ? '<span class="pill maize">Daily challenge</span> ' : ''}${m.scn ? `<span class="pill">${esc(m.scn)}</span> ` : ''}${m.edited ? '<span class="pill bad" title="Changed with the admin tools">Edited</span> ' : ''}${m.iron ? '<span class="pill maize" title="No undo, no admin tools, fixed difficulty">Ironman</span> ' : ''}<b>${m.coach ? esc(m.coach.name) + ' · ' + esc(roleTitle(m.coach.role)) + ', ' : m.own ? 'Owner, ' : m.lvl === 'nfl' && !m.comm ? 'GM, ' : ''}${esc(m.name)}</b><div class="small muted">${m.season} · ${m.phase === 'offseason' ? 'offseason' : m.rec} · ${DIFF[m.diff] ? DIFF[m.diff].label : ''} · ${m.seasons} season${m.seasons === 1 ? '' : 's'} done${m.legacy != null ? ' · legacy ' + m.legacy : ''}${m.fired ? ' · fired' : ''}</div><div class="small muted">Saved ${new Date(m.saved).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>` : has ? '<span class="muted">Saved data with no summary (it may be damaged). Try loading it, or delete it.</span>' : '<span class="muted">Empty slot</span>';
    const ck = ui.confirm; const g = has && !active && (ui.badSlots || []).includes(i) ? goodCopy(NS_PREFIX[NS]) : null; const gd = g && g.i === i ? g : null;
    const restore = gd ? (ck === 'rg-' + i ? `<button class="btn danger sm" data-act="restoregood" data-i="${i}">Confirm: restore the copy from ${esc(goodWhen(gd))}</button>` : `<button class="btn sm" data-act="ask" data-k="rg-${i}">Restore last good copy</button>`) : '';
    const btns = has ? `${restore}${active ? '<span class="pill maize">Playing now</span>' : `<button class="btn sm" data-act="slotload" data-i="${i}">Load</button>`}
      ${NS === 'coach' ? '' : ck === 'reset-' + i ? `<button class="btn danger sm" data-act="slotreset" data-i="${i}">Confirm reset</button>` : `<button class="btn ghost sm" data-act="ask" data-k="reset-${i}">Reset</button>`}
      ${ck === 'del-' + i ? `<button class="btn danger sm" data-act="slotdel" data-i="${i}">Confirm delete</button>` : `<button class="btn ghost sm" data-act="ask" data-k="del-${i}">Delete</button>`}
      <button class="btn ghost sm" data-act="slotnew" data-i="${i}">New career here</button>` : `<button class="btn sm" data-act="slotnew" data-i="${i}">Start a career here</button>`;
    return `<div class="slotcard${active ? ' on' : ''}"><div class="eyebrow">Slot ${i}</div>${info}<div class="row gap mt">${btns}</div></div>`;
  }).join('');
  const liveNote = liveBusy() ? `<p class="flash">A live game is paused (${esc(liveScoreText())}). Finish it before switching careers. If you leave the site now, that game will be waiting where you left it when you return to this career.</p>` : '';
  cloudKick(); return `${liveNote}${cloudCardHTML()}<section class="card"><div class="head"><div><div class="eyebrow">Save slots</div><h2 class="h2">Five careers at once</h2></div><p class="hint" id="savemsg">${esc(ui.saveMsg || 'Progress saves automatically after every action.')}</p></div>${saveBlocked ? '<p class="flash bad">This career is not saved yet because every slot holds a save that could not be read. Delete one of them and this career will be saved in its place.</p>' : ''}<div class="slots5">${cards}</div>
  ${NS === 'coach' ? '<p class="hint">Delete empties a slot. Saves live in this browser, so clearing site data or using a private window can erase them.</p>' : `<p class="hint">Reset restarts a slot from Week 1 of 2026 with the same program and difficulty. Delete empties it. Saves live in this browser, so clearing site data or using a private window can erase them.</p>`}</section>
  ${ui.newSlot ? (isCoach() || NS === 'coach' ? coachSetupHTML(ui.newSlot) : newCareerForm()) : ''}
  <div class="grid2"><section class="card"><div class="eyebrow">Back up slot ${slot}</div><p class="hint">Create a save code to keep a copy you control, or to move this career to another device.</p>
  <div class="row gap"><button class="btn" data-act="export">Create save code</button>${ui.exportCode ? '<button class="btn ghost" data-act="copycode">Copy code</button>' : ''}</div>
  ${ui.exportCode ? `<textarea id="exportbox" class="code" readonly aria-label="Save code">${esc(ui.exportCode)}</textarea><p class="hint" id="copyhint">${(ui.exportCode.length / 1024).toFixed(0)} KB of text.</p>` : ''}</section>
  <section class="card"><div class="eyebrow">Load a save code into slot ${slot}</div><textarea id="importbox" class="code" aria-label="Paste save code" placeholder="Paste a save code here">${ui.confirm === 'import' ? esc(ui.importCode || '') : ''}</textarea><div class="row gap">${ui.confirm === 'import' ? `<button class="btn danger" data-act="import">Confirm: replace ${esc(teamName(ME))} ${state.season} in slot ${slot}</button><button class="btn ghost" data-act="unconfirm">Cancel</button>` : `<button class="btn" data-act="askimport">Load into slot ${slot}</button>`}</div>${ui.importMsg ? `<p class="hint">${esc(ui.importMsg)}</p>` : ''}</section></div>
  <section class="card"><div class="eyebrow">Settings</div><p class="hint">Theme, light or dark mode, navigation, sound and difficulty are in <button class="lnk" data-act="tab" data-tab="settings">Settings</button>.</p></section>
  <section class="card"><div class="eyebrow">About this game</div><p class="muted nosub">Football Empire covers all 138 FBS programs in their 2026 conferences. Michigan's 2026 roster, coaching staff and schedule come from the official team site as of September 2026; every other school's roster and staff are generated. The preseason poll is the real 2026 AP order, and Michigan's rivalry series records are real through 2025. Stadiums, capacities and colors are approximations. Star players and head coaches at other schools are fictional, and real players never receive negative traits or off-field storylines. Everything after Week 1 kickoff is simulated, and all ratings, salaries and budgets are game estimates. No team logos or marks are used.</p></section>`;
}
// School picker: all 138 FBS programs by conference, with a preview of the one selected.
function schoolTier(r) { return r >= 86 ? 'National power' : r >= 78 ? 'Contender' : r >= 70 ? 'Solid program' : r >= 60 ? 'Rebuild job' : 'Long climb'; }
function schoolPickerHTML(f) {
  const tid = CTEAMS0_AD[f.tid] ? f.tid : 'MICH'; const t = CTEAMS0_AD[tid]; const ti = TEAM_INFO[tid] || {}; const ap = PRESEASON_AP.indexOf(tid) + 1;
  const groups = CONF_DEFS.map(([cid, cname]) => `<optgroup label="${esc(cname)}">${Object.entries(CTEAMS0_AD).filter(([, x]) => x.conf === cid).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, x]) => `<option value="${id}" ${id === tid ? 'selected' : ''}>${esc(x.name)}${id === 'MICH' ? ' (real 2026 roster)' : ''}</option>`).join('')}</optgroup>`).join('');
  const riv = rivalsFor(tid, CTEAMS0_AD, x => CTEAMS0_AD[x].conf).map(([id, nm]) => `${esc(CTEAMS0_AD[id].name)} <span class="muted">(${esc(nm)})</span>`).join(', ');
  return `<label class="fld wide"><span>School</span><select id="nc-tid">${groups}</select></label>
   <div class="schoolpv"><span class="sw" style="background:${ti.c1}"></span><span class="sw" style="background:${ti.c2}"></span><div><b>${esc(t.name)}</b> · ${esc(CONFS[t.conf] ? CONFS[t.conf].name : t.conf)} · ${schoolTier(t.base)} (${t.base})${ap ? ` · Preseason No. ${ap}` : ''}
   <div class="small muted">${esc(ti.stadium || '')}${ti.cap ? ', ' + ti.cap.toLocaleString() + ' seats' : ''} · ${esc(ti.city || '')}${riv ? ` · Rivals: ${riv}` : ''}</div>
   <div class="small muted">${tid === 'MICH' ? 'The real 2026 roster, coaching staff and schedule.' : 'A generated roster and staff built to this program\'s 2026 strength. Bigger programs have bigger budgets and higher expectations.'}</div></div></div>`;
}
function newCareerForm() {
  const f = ui.nc; const i = ui.newSlot; const confs = Object.values(CONFS); if (f.mode === 'mich') f.mode = 'school';
  const repOpts = Object.entries(CTEAMS0_AD).filter(([, x]) => x.conf === f.conf).sort((a, b) => a[1].base - b[1].base);
  if (!repOpts.some(([id]) => id === f.rep)) f.rep = repOpts.length ? repOpts[0][0] : 'MICH';
  return `<section class="card newcareer"><div class="head"><div><div class="eyebrow">New career · Slot ${i}</div><h2 class="h2">Choose your program</h2></div>${lsGet(SLOT_KEY(i)) ? '<p class="hint">This replaces the career in this slot.</p>' : ''}</div>
   <div>${seg('ncmode', f.mode, [['school', 'A real school (any of the 138)'], ['custom', 'Custom program'], ['nfl', 'An NFL club, as GM']])}</div>
   ${f.mode === 'custom' ? `<div class="fgrid">
     <label class="fld"><span>School name</span><input id="nc-name" value="${esc(f.name)}" maxlength="28"></label>
     <label class="fld"><span>Short name (up to 5 letters)</span><input id="nc-ab" value="${esc(f.ab)}" maxlength="5"></label>
     <label class="fld"><span>Conference</span><select id="nc-conf">${confs.map(c => `<option value="${c.id}" ${f.conf === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
     <label class="fld"><span>Takes the place of</span><select id="nc-rep">${repOpts.map(([id, x]) => `<option value="${id}" ${f.rep === id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
     <label class="fld"><span>Starting point (compared with your conference)</span><select id="nc-tier">${Object.entries(TIERS).map(([k, t]) => `<option value="${k}" ${f.tier === k ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
     <label class="fld"><span>Stadium name</span><input id="nc-stadium" value="${esc(f.stadium)}" maxlength="32"></label>
     <label class="fld"><span>Stadium capacity</span><input id="nc-cap" type="number" min="15000" max="115000" step="1000" value="${f.cap}"></label>
     <label class="fld"><span>Primary color</span><input id="nc-c1" type="color" value="${f.c1}"></label>
     <label class="fld"><span>Secondary color</span><input id="nc-c2" type="color" value="${f.c2}"></label>
   </div><p class="hint">Your school takes the chosen school's place in the league, including its schedule slot and rivals, with a fictional roster and staff. Everything else about the 138-team world stays the same.</p>` : f.mode === 'nfl' ? nflPickerHTML(f) : schoolPickerHTML(f)}
   <details class="mt" ${f.seed || ui.seedErr ? 'open' : ''}><summary class="small">Advanced: random seed</summary>${ui.seedErr ? `<p class="flash bad" id="seederr">${esc(ui.seedErr)}</p>` : ''}<label class="fld"><span>Seed (optional whole number)</span><input id="nc-seed" inputmode="numeric" ${ui.seedErr ? 'aria-invalid="true" aria-describedby="seederr"' : ''} value="${esc(f.seed || '')}" placeholder="Leave blank for a random season"></label><p class="hint">The same seed and the same choices replay the same results, which helps when reporting a bug.</p></details>
   <div class="eyebrow mt">Difficulty</div><div class="diffs">${Object.entries(DIFF).map(([k, d]) => `<button class="evopt${ui.newDiff === k ? ' on' : ''}" data-act="newdiff" data-v="${k}"><b>${d.label}</b><span>${esc(d.desc)}</span></button>`).join('')}</div>
   <div class="row gap mt"><button class="btn primary" data-act="startcareer">Start the career in slot ${i}</button><button class="btn ghost" data-act="cancelnew">Cancel</button></div></section>`;
}
/* ---------- modals ---------- */
/* A single dialog element hosts every popup. While it is open the rest of the page is inert,
 * Tab stays inside it (see app.js), and it has an accessible name. Closing returns focus to
 * the control that opened it, or to its re-rendered equivalent. */
const modal = { opener: null, openerSel: null };
const FOCUSABLE = 'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
function focusables(root) { return [...root.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled && el.getClientRects().length && !el.closest('[hidden]')); }
function selectorFor(el) {
  if (!el || el === document.body || !el.getAttribute) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  const ds = el.dataset || {}; const keys = Object.keys(ds); if (!keys.length) return null;
  return keys.map(k => `[data-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${CSS.escape(ds[k])}"]`).join('');
}
function setInert(on) { ['hdr', 'tabs', 'view', 'mnav', 'ticker'].forEach(id => { const el = document.getElementById(id); if (el) el.toggleAttribute('inert', on); }); }
function modalTitle(body) { const h = body.querySelector('h2, .h2, h3, .h3') || body.querySelector('.eyebrow'); return h ? h.textContent.trim().replace(/\s+/g, ' ') : 'Details'; }
function showModal(title, keepSel) {
  const m = $('#modal'); const wasOpen = !m.hidden;
  if (!wasOpen) { const a = document.activeElement; modal.opener = a && a !== document.body ? a : null; modal.openerSel = selectorFor(a); }
  $('#modaltitle').textContent = title || modalTitle(m.querySelector('.mbody'));
  m.hidden = false; setInert(true);
  if (!$('#over').hidden) return; // the game-over screen sits on top and keeps focus
  const keep = keepSel ? m.querySelector(keepSel) : null;
  if (keep && !keep.disabled) keep.focus({ preventScroll: true });
  else if (!wasOpen || !m.contains(document.activeElement)) m.querySelector('.mclose').focus({ preventScroll: wasOpen });
}
function openModal(html, title) {
  const m = $('#modal'); const keepSel = !m.hidden && m.contains(document.activeElement) ? selectorFor(document.activeElement) : null;
  const body = m.querySelector('.mbody'); body.innerHTML = html; subst(body);
  showModal(title, keepSel);
}
function hideModal(focusSel) {
  const m = $('#modal'); if (m.hidden) return; m.hidden = true; setInert(false);
  const usable = el => el && el.isConnected && !el.disabled && el.getClientRects().length;
  const opener = modal.opener, sel = modal.openerSel; modal.opener = modal.openerSel = null;
  // Focus moves after the current click finishes, because most actions re-render the page
  // right after closing the dialog and would otherwise destroy the element just focused.
  queueMicrotask(() => {
    let t = focusSel ? document.querySelector(focusSel) : null;
    if (!usable(t)) t = opener;
    if (!usable(t) && sel) t = document.querySelector(sel);
    if (!usable(t)) t = document.querySelector('#hdr [data-act="primary"]:not([disabled])') || $('#view');
    if (!$('#modal').hidden || !$('#over').hidden) return;
    if (t === $('#view')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });
}
function closeModal() {
  if (appMode === 'career') { if (cui.simming) { actions.csimstop(); return; } if (cg && cg.done) { cgFinishUp(); return; } clearTimeout(cui.gTimer); hideModal(); if (cg) render(); return; }
  if (appMode === 'home') { cui.homeSet = false; hideModal(); return; }
  if (ui.simming) { ui.simming.cancel = true; const el = $('#simcancel'); if (el) { el.disabled = true; el.textContent = 'Stopping after this week…'; } return; }
  if (liveBusy() && live.open) { hideLive(); return; }
  if (live.sim && live.finished) live.sim = null;
  ui.neg = null; hideModal();
}
function announce(msg) { const a = $('#announce'); if (!a || !msg) return; a.textContent = ''; setTimeout(() => { a.textContent = msg; }, 30); }
function boxTitle(g) { return g.done ? `Box score: ${teamName(g.a)} ${g.as}, ${teamName(g.h)} ${g.hs}` : `${teamName(g.a)} at ${teamName(g.h)}`; }
// the story of a game from its drives: lead changes, the biggest lead, the comeback and the deciding score
function howWonHTML(g) {
  const log = (g.log || []).filter(x => x.p); if (log.length < 4 || !g.done) return '';
  const mi = g.h === ME ? 0 : 1; const mm = x => x.p[mi] - x.p[1 - mi]; let prev = 0, changes = 0, maxL = 0, minL = 0, decide = null;
  const won = (g.h === ME ? g.hs > g.as : g.as > g.hs);
  log.forEach(x => { const m = mm(x); if (Math.sign(m) && Math.sign(prev) && Math.sign(m) !== Math.sign(prev)) changes++; if ((won ? m > 0 && prev <= 0 : m < 0 && prev >= 0)) decide = x; maxL = Math.max(maxL, m); minL = Math.min(minL, m); if (m !== 0) prev = m; });
  const ids = [g.h, g.a]; const who = s => (ids[s] === ME ? myName() : teamName(ids[s]));
  const lines = [];
  if (decide) lines.push(`<b>The deciding score:</b> ${esc(decide.q)} ${esc(decide.c || '')}, ${esc(who(decide.s))}: ${esc(decide.txt)} (${decide.np} plays, ${decide.y} yds)`);
  if (won && minL <= -7) lines.push(`<b>Comeback:</b> ${esc(myName())} trailed by ${-minL} and won.`); else if (!won && maxL >= 7) lines.push(`<b>Lead lost:</b> ${esc(myName())} led by ${maxL}.`);
  lines.push(`<b>Lead changes:</b> ${changes}. <b>Biggest ${esc(myName())} lead:</b> ${maxL > 0 ? maxL : 'none'}.`);
  return `<div class="decision mt"><div class="eyebrow">How it was ${won ? 'won' : 'lost'}</div>${lines.map(l => `<p class="small">${l}</p>`).join('')}</div>`;
}
function boxScore(g) {
  const b = g.box; const ids = [g.h, g.a];
  const qh = s => g.q[s].slice(0, g.ot ? 5 : 4).map(x => `<td class="num">${x}</td>`).join('');
  const head = `<div class="bsh"><div class="eyebrow">${esc(g.name || weekLabel(g.wk))}${g.att ? ' · Attendance ' + g.att.toLocaleString() : ''}</div>
   <table class="tbl line"><thead><tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th>${g.ot ? '<th>OT</th>' : ''}<th>T</th></tr></thead><tbody><tr><td>${tchip(g.a)}</td>${qh(1)}<td class="num tot">${g.as}</td></tr><tr><td>${tchip(g.h)}</td>${qh(0)}<td class="num tot">${g.hs}</td></tr></tbody></table>${g.hl && g.hl.d.length ? `<button class="btn sm mt" data-act="hlwatch" data-id="${g.id}">Watch the highlights</button>` : ''}</div>`;
  if (!b) return head + `<p class="muted">Detailed stats are kept for ${esc(myName())} games only.</p>`;
  const won = howWonHTML(g);
  const tn = s => esc(teamName(ids[s]));
  const tstat = `<table class="tbl"><thead><tr><th>Team stats</th><th>${tn(1)}</th><th>${tn(0)}</th></tr></thead><tbody>${[['First downs', 'fd'], ['Passing', t => `${t.pc}/${t.pa}, ${t.py} yds`], ['Rushing', t => `${t.ra} att, ${t.ry} yds`], ['Total yards', t => t.py + t.ry], ['Turnovers', 'to'], ['Sacks', 'sk'], ['Penalties', 'pen']].map(([l, k]) => `<tr><td>${l}</td><td class="num">${typeof k === 'function' ? k(b.t[1]) : b.t[1][k]}</td><td class="num">${typeof k === 'function' ? k(b.t[0]) : b.t[0][k]}</td></tr>`).join('')}</tbody></table>`;
  const ps = Object.entries(b.p).map(([id, s]) => ({ p: P(id), s })).filter(x => x.p);
  const g0 = (s, k) => s[k] || 0;
  const sec = (title, filt, cols, sort, cells) => { const rows = ps.filter(x => filt(x.s)).sort((a, c) => sort(c.s) - sort(a.s)); return rows.length ? `<table class="tbl"><thead><tr><th>${title}</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.p.n)}</td>${cells(x.s).map(c => `<td class="num">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''; };
  const indiv = [
    sec('Passing', s => s.pa, ['C/A', 'Yds', 'TD', 'INT'], s => g0(s, 'py'), s => [`${g0(s, 'pc')}/${g0(s, 'pa')}`, g0(s, 'py'), g0(s, 'ptd'), g0(s, 'pint')]),
    sec('Rushing', s => s.ra, ['Car', 'Yds', 'Avg', 'TD'], s => g0(s, 'ry'), s => [g0(s, 'ra'), g0(s, 'ry'), (g0(s, 'ry') / g0(s, 'ra')).toFixed(1), g0(s, 'rtd')]),
    sec('Receiving', s => s.rc, ['Rec', 'Yds', 'TD'], s => g0(s, 'rcy'), s => [g0(s, 'rc'), g0(s, 'rcy'), g0(s, 'rctd')]),
    sec('Defense', s => s.tk || s.int || s.sk, ['Tkl', 'Sacks', 'INT'], s => g0(s, 'tk') + g0(s, 'sk') * 3, s => [g0(s, 'tk'), g0(s, 'sk'), g0(s, 'int')]),
    sec('Kicking', s => s.fga || s.xpa, ['FG', 'XP'], s => g0(s, 'fgm'), s => [`${g0(s, 'fgm')}/${g0(s, 'fga')}`, `${g0(s, 'xpm')}/${g0(s, 'xpa')}`]),
    sec('Punting', s => s.pn, ['Punts', 'Avg'], s => g0(s, 'pn'), s => [g0(s, 'pn'), (g0(s, 'pny') / g0(s, 'pn')).toFixed(1)]),
  ].join('');
  const oppId = g.h === ME ? g.a : g.h; const ot = T(oppId);
  const oppRows = ot && ot.stars ? ot.stars.map(s => { const st = (b.op || {})[s.id]; return st ? `<tr><td>${esc(s.n)}</td><td>${s.pos}</td><td class="small">${esc(statLine({ pos: s.pos }, st)) || '—'}</td></tr>` : ''; }).join('') : '';
  const plays = b.plays.map(p => `<li class="${p.to ? 'to' : p.miss ? 'miss' : ''}"><span class="when">${p.q} ${p.c}</span><span><b>${esc(ids[p.s] === ME ? myAb() : isFCS(ids[p.s]) ? teamName(ids[p.s]) : ids[p.s])}</b> ${esc(p.txt)}${p.np ? ` <span class="muted">(${p.np} plays, ${p.y} yds)</span>` : ''}</span></li>`).join('');
  const wpPts = (b.wp || []).map(x => ({ y: x.v, lbl: x.lbl, tip: `${x.lbl}: ${myName()} ${x.v}%` }));
  const drives = (g.log || []).map(x => `<li><span class="when">${x.q} ${x.c || ''}</span><span><b>${esc(ids[x.s] === ME ? myAb() : isFCS(ids[x.s]) ? teamName(ids[x.s]) : ids[x.s])}</b> ${x.np} plays, ${x.y} yds · ${esc(x.txt)}</span></li>`).join('');
  return `${head}${won}<div class="eyebrow mt">${esc(myName())} win probability</div>${lineChart(wpPts, { min: 0, max: 100, yTicks: [0, 25, 50, 75, 100], fmt: v => v + '%', ref: 50, dots: false, area: 0, title: teamName(ME) + ' win probability by drive' })}
   <div class="eyebrow mt">Key plays</div><ul class="plays">${plays}</ul><div class="tw">${tstat}</div><div class="eyebrow mt">${esc(myName())} individual stats</div><div class="tw indiv">${indiv}</div>
   ${oppRows ? `<div class="eyebrow mt">${esc(teamName(oppId))} standouts</div><div class="tw"><table class="tbl"><tbody>${oppRows}</tbody></table></div>` : ''}
   ${drives ? `<details class="mt" open><summary>Drive by drive</summary><ul class="plays">${drives}</ul></details>` : ''}`;
}
function teamModal(id) {
  if (isPro()) return proTeamModal(id);
  const t = T(id); const games = state.games.filter(g => g.h === id || g.a === id).sort((a, b) => a.wk - b.wk);
  const rows = games.map(g => { const opp = g.h === id ? g.a : g.h; const us = g.h === id ? g.hs : g.as, them = g.h === id ? g.as : g.hs; return `<tr><td>${g.wk <= 13 ? g.wk : '—'}</td><td>${g.neutral ? 'vs.' : g.h === id ? 'vs.' : 'at'}</td><td>${tchip(opp)}</td><td>${g.done ? `<b class="${us > them ? 'res-w' : 'res-l'}">${us > them ? 'W' : 'L'}</b> ${us}–${them}` : '<span class="muted">—</span>'}</td></tr>`; }).join('');
  const s = strength(id);
  const stars2 = t.stars ? `<div class="eyebrow mt">Star players</div><table class="tbl"><tbody>${t.stars.map(x => `<tr><td><b>${esc(x.n)}</b></td><td>${x.pos} · ${x.cls}</td><td>${ovrTag(x.ovr)}</td><td class="small muted">${esc(statLine({ pos: x.pos }, x.st)) || 'No stats yet'}</td></tr>`).join('')}</tbody></table>` : '';
  const st = t.style; const lean = st ? (st.run - st.pass > 2.5 ? 'Run-first offense' : st.pass - st.run > 2.5 ? 'Pass-first offense' : 'Balanced offense') : '';
  return `<div class="eyebrow">${CONFS[t.conf].name}${t.apRank ? ' · AP No. ' + t.apRank : ''}${t.cfpRank ? ' · CFP No. ' + t.cfpRank : ''}</div><h2 class="h2">${esc(t.name)} <span class="muted">${t.w}-${t.l}</span></h2>
   <div class="tiles"><div><span class="k">Rating</span><span class="v">${Math.round(teamOvr(id))}</span></div><div><span class="k">Offense</span><span class="v">${s.off.toFixed(0)}</span></div><div><span class="k">Defense</span><span class="v">${s.def.toFixed(0)}</span></div><div><span class="k">Conference</span><span class="v">${t.cw}-${t.cl}</span></div></div>
   ${id === ME || isFCS(id) ? '' : `<p class="hint">${lean}: ${aAn(OFF_SCH[teamScheme(id).off].n)} offense and ${aAn(DEF_SCH[teamScheme(id).def].n)} defense (matchup with you: offense ${fmEdge(schemeEdge(id).off)}, defense ${fmEdge(schemeEdge(id).def)}). Other programs are simulated as team ratings with three fictional star players.</p>`}${stars2}
   ${t.hist.length ? `<p class="small muted">Past seasons: ${t.hist.map(h => `${h.s}: ${h.w}-${h.l}`).join(' · ')}</p>` : ''}
   <div class="tw"><table class="tbl"><thead><tr><th>Wk</th><th></th><th>Opponent</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function playerModal(id) {
  if (isPro()) return proPlayerModal(id);
  const p = P(id); if (!p) return '<p>Player not found.</p>';
  const di = state.depth[p.pos].indexOf(p.id); const cs = statLine(p, p.cs); const off = state.phase === 'offseason';
  const trs = Object.entries(p.tr || {}).map(([k, v]) => `<div class="trait"><span>${TRAIT_NAME[k]}</span><div class="bar"><i class="${v >= 80 ? 'good' : v >= 65 ? 'warn' : 'bad'}" style="width:${v}%"></i></div><b>${v}</b></div>`).join('');
  const sw = (SWITCH[p.pos] || []).map(np => `<button class="btn ghost sm" data-act="switchpos" data-id="${p.id}" data-pos="${np}">Move to ${np}</button>`).join('');
  return `<div class="eyebrow">#${p.num} · ${POS_NAME[p.pos]} · ${clsLabel(p)}${p.walkon ? ' · Walk-on' : ''}${p.real ? '' : p.transfer ? ' · Transfer from ' + esc(p.from) : p.recruit ? ' · ' + p.star + '-star signee' : ''}</div><h2 class="h2">${esc(p.n)}</h2>
   <p class="muted">${p.ht} · ${p.wt} lbs · ${esc(p.home)}</p>
   <div class="tiles"><div><span class="k">OVR</span><span class="v">${p.ovr}</span></div><div><span class="k">Potential</span><span class="v">${p.pot}</span></div><div><span class="k">Depth</span><span class="v sm">${di + 1} of ${state.depth[p.pos].length}</span></div><div><span class="k">Pay</span><span class="v sm">${fm2(p.pay)}</span><span class="s">market ${fm2(marketValue(p))} ${satPill(p)}</span></div></div>
   ${ratingChartHTML(p)}<div class="traits">${trs}</div>
   ${fitHTML(p)}${rapHTML(p)}${cmpBtns(p)}
   ${p.persLog && p.persLog.length ? `<p class="small muted">${p.persLog.map(x => `${x.s}: ${esc(PERS[x.from] ? PERS[x.from].label : x.from)} → ${esc(PERS[x.to] ? PERS[x.to].label : x.to)}`).join(' · ')}</p>` : ''}
   ${p.pers ? `<p><span class="pill ${p.pers === 'diva' || p.pers === 'fragile' ? 'warn' : p.pers === 'steady' ? 'ghost' : 'good'}">${esc(PERS[p.pers].label)}</span> <span class="small muted">${esc(PERS[p.pers].desc)}</span></p>` : ''}
   <p class="small">Games this season: <b>${p.gp}</b>. ${p.rsUsed ? 'Redshirt already used.' : p.gp <= 4 ? `Redshirt still available (${4 - p.gp} more game${4 - p.gp === 1 ? '' : 's'} allowed).` : 'Played too many games to redshirt this year.'}${p.medRS ? ' Received a medical redshirt.' : ''}</p>
   ${p.awards && p.awards.length ? `<p class="small"><b>Honors:</b> ${p.awards.map(esc).join(' · ')}</p>` : ''}
   ${p.inj ? `<p><span class="pill bad">${esc(p.injType || 'Injured')} · ${p.injSE ? 'out for the season' : 'out ' + p.inj + ' more week' + (p.inj > 1 ? 's' : '')}</span></p>` : ''}${p.susp ? `<p><span class="pill warn">Suspended ${p.susp} more game${p.susp > 1 ? 's' : ''}</span></p>` : ''}
   <p><b>This season:</b> ${esc(statLine(p) || 'No stats yet')}</p>${cs ? `<p><b>Career with you:</b> ${esc(cs)}</p>` : ''}
   ${p.hist && p.hist.length ? `<div class="eyebrow mt">Career by season</div><div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Class</th><th>OVR</th><th>Games</th><th>Stats</th></tr></thead><tbody>${p.hist.map(h => `<tr><td>${h.s}</td><td>${h.cls}</td><td>${h.ovr}</td><td>${h.gp}</td><td class="small">${esc(statLine({ pos: h.pos }, h.st) || '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}
   <div class="row gap mt"><button class="btn sm" data-act="mkstarter" data-id="${p.id}" ${di === 0 ? 'disabled' : ''}>Move to top of ${p.pos} depth chart</button><button class="btn ghost sm" data-act="paymkt" data-id="${p.id}">Pay market value</button>${!p.rsUsed ? `<button class="btn ghost sm" data-act="rsplan" data-id="${p.id}">${p.rsPlan ? 'Cancel redshirt plan' : 'Plan to redshirt'}</button>` : ''}${p.walkon ? `<button class="btn sm" data-act="scholar" data-id="${p.id}">Put him on scholarship</button>` : ''}${off ? (ui.confirm === 'rel-' + p.id ? `<button class="btn danger sm" data-act="release" data-id="${p.id}">Confirm release</button>` : `<button class="btn ghost sm" data-act="askrel" data-id="${p.id}">Release from roster</button>`) : ''}</div>
   ${sw ? `<div class="eyebrow mt">Change position</div><div class="row gap">${sw}</div><p class="hint">A move costs some OVR at first (3–8 points depending on how different the new spot is), and traits are re-rated for the new position.</p>` : ''}
   ${p.real ? '<p class="hint">Real 2026 roster player. Ratings are game estimates.</p>' : ''}`;
}

/* ---------- live game ---------- */
const live = { sim: null, timer: null, speed: 1, paused: false, finished: false, open: false, heldPause: false, wk: 0, mg: null, benchQB: false, halfOff: null, halfDef: null, callPlays: false, lastLog: 0, flash: '' };
function liveBusy() { return !!(live.sim && !live.finished); }
function liveScoreText() {
  const sim = live.sim; if (!sim) return ''; const nm = id => teamName(id);
  return `${nm(sim.ids[1])} ${sim.pts[1]}, ${nm(sim.ids[0])} ${sim.pts[0]}`;
}
function liveTitle() { const sim = live.sim; return sim ? `Live game: ${teamName(sim.ids[1])} at ${teamName(sim.ids[0])}` : 'Live game'; }
function startLive() {
  if (state.gameOver || state.event || liveBusy()) return;
  if (isPro() && overCap()) { ui.tab = 'cap'; ui.flash = `You are ${fmM(-capRoom(ME))} over the salary cap. Get under it before the next game.`; render(); return; }
  const wk = state.week; const mg = michGameThisWeek(wk); if (!mg) return;
  predEnsure(); weekAutomation(); if (isPro()) proSimOthers(wk); else simOthers(wk); state.liveWk = wk; state.liveRng = RNG.s; save();
  Object.assign(live, { sim: createSim(mg, { live: true }), wk, mg, finished: false, paused: false, heldPause: false, open: true, benchQB: false, halfOff: null, halfDef: null, halfSpeech: null, pc: null, lastLog: 0, flash: '', prevPts: [0, 0] }); live.sim.callPlays = isCoach() ? callsOff() && state.co.gameDay !== 'plan' : live.callPlays; if (isOwner()) Object.assign(live.sim, { callPlays: false, callDef: false, ask: false, askHalf: false }); sfx('whistle');
  $('#modal .mbody').innerHTML = ''; renderLive(); showModal(liveTitle()); liveTick();
}
// Two-minute drill: the game plays out on its own; if it's within one score on the last two drives, you take the play calls.
function startLive2min() {
  const before = live.sim; startLive(); const sim = live.sim; if (!sim || sim === before || sim.done) return; clearTimeout(live.timer);
  const keep = { callPlays: sim.callPlays, callDef: sim.callDef, ask: sim.ask, askHalf: sim.askHalf };
  Object.assign(sim, { callPlays: false, callDef: false, ask: false, askHalf: false });
  let n = 0; while (!sim.done && n++ < 600) { if (sim.i >= sim.total - 2 && Math.abs(simMargin(sim)) <= 8) break; if (sim.pending) autoAdvance(sim); else simStep(sim); }
  live.lastLog = sim.log.length; if (sim.done) { live.flash = 'DECIDED EARLY'; renderLive(); liveFinish(); return; }
  // in Coach mode you call your own side; in AD and GM mode you call the offense
  sim.callPlays = isCoach() ? callsOff() : true; sim.callDef = isCoach() ? callsDef() : keep.callDef; sim.ask = true; sim.askHalf = keep.askHalf;
  live.flash = 'TWO-MINUTE DRILL'; live.paused = false; renderLive(); liveTick();
}
// Close, Escape and clicking outside all land here: the game stops where it is and waits.
function hideLive() {
  live.open = false; live.heldPause = live.paused; live.paused = true; clearTimeout(live.timer);
  render(); hideModal('#hdr [data-act="liveresume"]');
  announce('Live game paused at ' + liveScoreText() + '. Choose Resume live game to continue.');
}
function resumeLive() {
  if (!liveBusy()) return;
  live.open = true; live.paused = live.heldPause; live.heldPause = false;
  renderLive(); showModal(liveTitle()); liveTick();
}
function liveTick() {
  clearTimeout(live.timer); const sim = live.sim; if (!sim) return;
  if (!sim.done && !sim.pending && !live.paused) { simStep(sim); if (sim.pending) autoAdvance(sim); liveEvents(); renderLive(); }
  if (sim.done) { liveFinish(); return; }
  if (!sim.pending && !live.paused) live.timer = setTimeout(liveTick, Math.max(live.speed === 1 ? 1100 : live.speed === 2 ? 450 : 120, fieldOn() ? pfLeft() : 0, reviewable(sim) ? [0, 2000, 1500, 1200][live.speed] : 0)); /* a reviewable play waits a moment so you can throw the flag */ /* with the field view on, the next drive waits for the play on screen */
  else renderLive();
}
function liveEvents() {
  const sim = live.sim; const n = sim.log.length; if (n === live.lastLog) return;
  const x = sim.log[n - 1]; live.lastLog = n; if (!x || x.half) return;
  const mine = x.s === sim.mSide;
  if (x.out === 'td' || (x.score && x.txt.includes('TD'))) { live.flash = mine ? 'TOUCHDOWN' : ''; sfx(mine ? 'crowd' : 'groan'); }
  else if (x.out === 'to' && !mine) { live.flash = 'TAKEAWAY'; sfx('crowd'); }
  else if (x.score && mine) { live.flash = 'FIELD GOAL'; }
  else live.flash = '';
  if (x.score || x.out === 'to') announce(`${x.txt}. ${liveScoreText()}.`);
}
function liveFinish() {
  if (live.finished) return; live.finished = true; clearTimeout(live.timer); liveEvents(); sfx('whistle'); if (live.mg.hs != null && ((live.mg.h === ME) === (live.mg.hs > live.mg.as))) setTimeout(() => sfx('jingle'), 600);
  state.liveWk = null; state.liveRng = null; endWeek(live.wk, live.mg); save(); render(); renderLive();
  announce('Final: ' + liveScoreText() + '.');
}
// clutch players: named in a close fourth quarter, and all game long in a big game
function clutchLine(sim, last) { if (sim.done || sim.mSide < 0) return ''; const late = last && (last.qtr >= 4 || last.ot) && Math.abs(simMargin(sim)) <= 8; if (!late && !sim.big) return ''; const n = clutchNames(); return n.length ? ` · <b>${late ? 'Clutch time' : 'Big-game players'}:</b> ${esc(n.join(', '))}` : ''; }
// optional play clock while you call plays: when it runs out, your staff makes the call
const PLAY_CLOCK = 20000;
function playClockHTML(p) { const key = p.ds; if (live.pc && live.pc.key === key && live.pc.n === p.ds.plays.length) { } else live.pc = { key, n: p.ds.plays.length, end: Date.now() + PLAY_CLOCK }; const left = Math.max(0, live.pc.end - Date.now()); return `<div class="pclock" role="timer" aria-label="Play clock"><span class="small"><b class="pcs">${Math.ceil(left / 1000)}</b> s on the play clock</span><div class="bar"><i style="width:${(left / PLAY_CLOCK * 100).toFixed(1)}%"></i></div></div>`; }
function playClockArm(sim) {
  clearInterval(live.pcTimer); const p = sim.pending; if (!p || !(p.type === 'drive' || p.type === 'ddrive') || prefs.playClock !== 'on' || !live.pc || live.paused) return;
  live.pcTimer = setInterval(() => {
    const pc = live.pc; const q = live.sim && live.sim.pending; if (!pc || !q || q.ds !== pc.key || q.ds.plays.length !== pc.n || !live.open) { clearInterval(live.pcTimer); return; }
    const left = Math.max(0, pc.end - Date.now()); const b = $('#modal .pclock .bar i'); const t = $('#modal .pclock .pcs'); if (b) b.style.width = (left / PLAY_CLOCK * 100).toFixed(1) + '%'; if (t) t.textContent = Math.ceil(left / 1000);
    if (left <= 0) { clearInterval(live.pcTimer); live.flash = 'PLAY CLOCK'; const s = live.sim; if (q.type === 'drive') runPlay(s, autoOffCall(s, q.ds)); else runDefPlay(s, autoDefCall(s, q.ds)); autoAdvance(s); liveEvents(); live.flash = 'STAFF CALL'; if (!s.pending) liveTick(); else renderLive(); }
  }, 250);
}
function liveSkip() { const sim = live.sim; if (!sim) return; clearTimeout(live.timer); pfClear(); simRun(sim); liveFinish(); }
// how loud it is: the home crowd's pull, louder late in a close game
function crowdMeter(sim) {
  const g = sim.g; const home = g.h === ME && !g.neutral; const close = Math.abs(simMargin(sim)) <= 8; const late = sim.i >= sim.total * 0.75 && !sim.done;
  let v = g.neutral ? 45 : home ? 45 + (crowdFactor(g.h, g.a) - 0.8) * 120 : 45 + ((T(g.h) ? T(g.h).rating : 60) - 60) * 1.2;
  if (late && close) v += 18; v = clamp(Math.round(v), 10, 100);
  return { v, home, lbl: v >= 85 ? 'Deafening' : v >= 70 ? 'Rocking' : v >= 50 ? 'Loud' : 'Quiet' };
}
function renderLive() {
  const sim = live.sim; if (!sim) return;
  const m = $('#modal'); const keepSel = !m.hidden && m.contains(document.activeElement) ? selectorFor(document.activeElement) : null;
  const ps = live.prevPts || [0, 0]; live.pop = sim.pts[0] !== ps[0] ? 0 : sim.pts[1] !== ps[1] ? 1 : -1; live.prevPts = sim.pts.slice(); const g = sim.g; const ids = sim.ids;
  const last = sim.log.filter(x => !x.half).slice(-1)[0];
  const wp = sim.box.wp.length ? sim.box.wp[sim.box.wp.length - 1].v : 50;
  const nm = id => teamName(id);
  const logRows = sim.log.slice().reverse().map(x => x.half ? `<li class="half"><span class="when">Half</span><span>${esc(x.txt)}</span></li>` : `<li class="${x.score ? 'sc' : ''}${x.out === 'to' ? ' to' : ''}"><span class="when">${x.ot ? 'OT' : 'Q' + x.qtr} ${x.clock || ''}</span><span><b>${esc(ids[x.s] === ME ? myAb() : isFCS(ids[x.s]) ? teamName(ids[x.s]) : ids[x.s])}</b> ${x.np} plays, ${x.yards} yds · ${esc(x.txt)} <span class="muted">${x.pts[1]}–${x.pts[0]}</span></span></li>`).join('');
  let dec = '';
  const p = sim.pending;
  if (p && p.type === 'drive') {
    const ds = p.ds; const ab = isFCS(sim.oppId) ? 'OPP' : sim.oppId; const spot = ds.yl === 50 ? 'midfield' : ds.yl < 50 ? 'your own ' + ds.yl : 'the ' + ab + ' ' + (100 - ds.yl); // CL-25
    const hints = playHints(sim); const lastDrive = !p.ot && sim.i >= sim.total - 2; const canFG = fgRange(ds) && (ds.down === 4 || p.ot || lastDrive);
    const ord = ['1st', '2nd', '3rd', '4th'][ds.down - 1];
    dec = `<div class="decision"><div class="eyebrow">${p.ot ? 'Overtime' : 'Q' + p.qtr + ' · ' + p.clock} · ${sim.pts[sim.mSide]}–${sim.pts[1 - sim.mSide]} · ${sim.keyOnly ? 'Key play: your call' : 'You are calling plays'}</div>
     <h3 class="h3">${ord} & ${100 - ds.yl < ds.togo ? 'goal' : ds.togo} at ${esc(spot)}</h3>
     <div class="field" aria-hidden="true"><i class="los" style="left:${ds.yl}%"></i><i class="fd" style="left:${Math.min(100, ds.yl + ds.togo)}%"></i><i class="start" style="left:${ds.start}%"></i></div>
     ${ds.log.length ? `<ul class="plainlist small dlog">${ds.log.slice(-4).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
     <div class="calls">${(() => { let od = null; try { od = callOdds(sim); } catch (e) { od = null; } return Object.entries(CALLS).map(([k, l]) => `<button class="evopt" data-act="lcall" data-v="${k}"><b>${l}</b><span>${esc(hints[k])}</span>${od && od[k] != null ? `<span class="pill ${od[k] >= 55 ? 'good' : od[k] >= 40 ? 'maize' : 'bad'} small" title="Chance this call keeps you on schedule here: your units vs. their defense, the weather and how often you've called it">${od[k]}% success</span>` : ''}</button>`).join(''); })()}
     ${ds.down === 4 ? '<button class="evopt" data-act="lkick" data-v="punt"><b>Punt</b><span>Flip the field</span></button>' : ''}${canFG ? `<button class="evopt" data-act="lkick" data-v="fg"><b>Field goal</b><span>${117 - ds.yl} yards</span></button>` : ''}</div>
     <p class="hint">Calling the same play over and over gets easier to stop.${ds.down === 4 ? ' On fourth down, pick a play to go for it.' : ''}</p></div>`;
  }
  if (p && p.type === 'ddrive') dec = ddriveHTML(sim, p);
  if (p && (p.type === 'drive' || p.type === 'ddrive') && prefs.playClock === 'on') dec = playClockHTML(p) + dec;
  if (p && p.type === 'half') {
    const qbs = state.depth.QB.map(P).filter(avail); const bench = qbs[1];
    dec = `<div class="decision"><div class="eyebrow">Halftime · ${sim.pts[sim.mSide]}–${sim.pts[1 - sim.mSide]}</div><h3 class="h3">Make your adjustments</h3>
     <div class="plans"><div><div class="lbl">Offense</div>${seg('lhoff', live.halfOff || state.plan.off, Object.entries(OFF_PLANS).map(([k, v]) => [k, v.label]))}</div><div><div class="lbl">Defense</div>${seg('lhdef', live.halfDef || state.plan.def, Object.entries(DEF_PLANS).map(([k, v]) => [k, v.label]))}</div></div>
     <div class="lbl mt">Halftime speech</div>${seg('lhspeech', live.halfSpeech || 'none', [['none', 'No speech']].concat(Object.entries(SPEECHES).map(([k, v]) => [k, v[0]])))}<p class="hint">${live.halfSpeech && SPEECHES[live.halfSpeech] ? esc(SPEECHES[live.halfSpeech][1]) + ` Right now: offense ${fmEdge(speechFx(sim, live.halfSpeech).off)}, defense ${fmEdge(speechFx(sim, live.halfSpeech).def)}.` : 'Pick a speech for the locker room. What works depends on the score.'}</p>
     ${bench ? `<label class="chk"><input type="checkbox" id="benchqb" ${live.benchQB ? 'checked' : ''}> Bench ${esc(qbs[0].n)} and start ${esc(bench.n)} (${bench.ovr} OVR). This changes the depth chart.</label>` : ''}
     <button class="btn primary mt" data-act="lhgo">Start the second half</button></div>`;
  } else if (p && p.type === '4th') {
    const d = p.drv; const fg = fgDistance(d.yards); const odds = Math.round(fourthOdds(sim, d) * 100);
    const kicker = starters('K')[0]; const make = Math.round(clamp(0.97 - (fg - 20) * 0.014 + (((kicker && kicker.tr && kicker.tr.kac) || 70) - 75) * 0.01, 0.25, 0.99) * 100);
    dec = `<div class="decision"><div class="eyebrow">Q${d.qtr} · ${d.clock} · ${p.margin > 0 ? 'Up ' + p.margin : p.margin < 0 ? 'Down ' + -p.margin : 'Tied'}</div><h3 class="h3">4th-and-${p.dist} at the ${esc(ids[1 - sim.mSide] === ME ? '' : isFCS(sim.oppId) ? 'opponent' : sim.oppId)} ${Math.max(1, Math.round(75 - d.yards))}</h3>
     <div class="evopts"><button class="evopt" data-act="ldec" data-v="go"><b>Go for it</b><span>About ${odds}% to convert</span></button><button class="evopt" data-act="ldec" data-v="kick"><b>Kick ${aAn(fg + '-yard')} field goal</b><span>About ${make}% to make</span></button><button class="evopt" data-act="ldec" data-v="punt"><b>Punt</b><span>Pin them deep</span></button></div></div>`;
  } else if (p && p.type === '2min') {
    const m = p.margin;
    dec = `<div class="decision"><div class="eyebrow">Final possession · ${m === 0 ? 'Tied' : 'Down ' + -m}</div><h3 class="h3">How do you play the last drive?</h3>
     <div class="evopts">${m >= -3 ? `<button class="evopt" data-act="ldec" data-v="fg"><b>Play for the field goal</b><span>Safe, short throws. Fewer turnovers, smaller chance of a touchdown.</span></button>` : ''}<button class="evopt" data-act="ldec" data-v="td"><b>Go for the end zone</b><span>Take shots downfield. More touchdowns, more interceptions.</span></button></div></div>`;
  }
  const mom = Math.abs(sim.mom) >= 0.05 ? (sim.mom > 0 ? ids[0] : ids[1]) : null;
  const W = WX[sim.wx.k];
  const controls = sim.done ? `<div class="row gap"><button class="btn primary" data-act="livebox">See the box score</button>${g.hl && g.hl.d.length ? `<button class="btn" data-act="hlwatch" data-id="${g.id}">Watch the highlights</button>` : ''}<button class="btn ghost" data-act="close">Close</button></div>` : `<div class="row gap">${seg('lspeed', String(live.speed), [['1', 'Normal'], ['2', 'Fast'], ['3', 'Very fast']])}<button class="btn ghost sm" data-act="lpause" ${p ? 'disabled' : ''}>${live.paused ? 'Resume' : 'Pause'}</button><button class="btn ghost sm" data-act="lskip">Simulate the rest of the game</button>${isCoach() ? coachLiveLevel() : `${isOwner() ? '<span class="small muted">Watching from the owner\'s suite</span>' : `<label class="chk small"><input type="checkbox" id="callplays" ${sim.callPlays ? 'checked' : ''}> Call ${esc(myName())}'s plays</label>`}`}<label class="chk small"><input type="checkbox" id="lfield" ${fieldOn() ? 'checked' : ''}> Field view</label>${typeof xLiveCtl === 'function' ? xLiveCtl(sim) : ''}<label class="chk small"><input type="checkbox" id="livesnd" ${state.settings.sound ? 'checked' : ''}> Sound</label></div><p class="hint">Closing this window pauses the game. Resume it from the top of the page. If you leave the site before it's final, the game will be waiting where you left it the next time you open this career.</p>`;
  const possSide = sim.done ? -1 : p ? (p.type === 'drive' ? p.s : p.drv ? p.drv.s : -1) : (sim.i < sim.total ? (sim.i + sim.first) % 2 : (sim.otTurn || 0) % 2);
  const rk = id => (!isFCS(id) && rankOf(id)) || '';
  const side = s => { const id = ids[s]; return `<div class="bt${id === ME ? ' me' : ''}${possSide === s ? ' poss' : ''}"><span class="bn">${rk(id) ? `<em>${rk(id)}</em>` : ''}${esc(nm(id))}${possSide === s ? '<i class="ball" role="img" aria-label="has the ball"></i>' : ''}</span><span class="brec">${isFCS(id) ? 'FCS' : record(id)}</span><b class="bs${live.pop === s ? ' pop' : ''}">${sim.pts[s]}</b></div>`; };
  const curQ = sim.done ? 9 : last ? (last.ot ? 5 : last.qtr) : 0; const nq = sim.ot ? 5 : 4;
  const lrow = s => `<tr class="${ids[s] === ME ? 'me' : ''}"><th scope="row">${esc(ids[s] === ME ? myAb() : isFCS(ids[s]) ? 'FCS' : ids[s])}</th>${sim.q[s].slice(0, nq).map((v, i) => `<td>${i + 1 <= curQ ? v : '–'}</td>`).join('')}<td class="tot">${sim.pts[s]}</td></tr>`;
  const line = `<table class="lscore"><caption class="sr-only">Score by quarter</caption><thead><tr><th scope="col"><span class="sr-only">Team</span></th>${[1, 2, 3, 4].concat(sim.ot ? ['OT'] : []).map(q => `<th scope="col">${q}</th>`).join('')}<th scope="col">T</th></tr></thead><tbody>${lrow(1)}${lrow(0)}</tbody></table>`;
  const lpKind = x => live.flash ? live.flash : x.out === 'td' || (x.score && /TD/.test(x.txt)) ? 'Touchdown' : x.out === 'fg' ? (x.score ? 'Field goal' : 'No good') : x.out === 'to' ? 'Turnover' : x.out === 'downs' ? 'On downs' : 'Punt';
  const lp = last ? `<div class="lastplay${live.flash ? ' big' : ''}${ids[last.s] === ME ? ' me' : ''}"><span class="lpk">${esc(lpKind(last))}</span><span class="lpt"><b>${esc(nm(ids[last.s]))}</b> ${esc(last.txt)} <span class="muted">· ${last.np} plays, ${last.yards} yds</span></span></div>`
    : `<div class="lastplay"><span class="lpk">Kickoff</span><span class="lpt">${esc(nm(ids[sim.first]))} gets the ball first.</span></div>`;
  const mb = $('#modal .mbody'); const crowd = crowdMeter(sim); mb.innerHTML = `<div class="live wx-${sim.wx.k}${g.type !== 'reg' ? ' bigstage' : ''}${isTitleGame(g) ? ' titlegame' : ''}${isTitleGame(g) && sim.done && sim.mSide >= 0 && simMargin(sim) > 0 ? ' champs' : ''}"><div class="lhead"><div class="eyebrow">${esc(g.name || weekLabel(g.wk))} · Live</div><span class="small muted">${esc(W.label)}, ${sim.wx.temp}°${sim.g.neutral ? ' · Neutral site' : ''}</span></div>
   <div class="bug">${side(1)}<div class="bclock"><b>${sim.done ? 'Final' + (sim.ot ? '/OT' : '') : last ? (last.ot ? 'OT' : 'Q' + last.qtr) : 'Pregame'}</b><span>${sim.done ? '' : last && !last.ot ? esc(last.clock) : last ? 'Overtime' : 'Kickoff'}</span></div>${side(0)}</div>
   ${fieldOn() ? '<div class="pfslot"></div>' : ''}<div class="lrow">${line}${lp}</div>
   <div class="wp"><div class="wpbar"><i style="width:${wp}%"></i></div><div class="wpl"><span>${esc(myName())} win chance <b>${wp}%</b></span><span>${esc(OFF_PLANS[state.plan.off].label)} · ${esc(DEF_PLANS[state.plan.def].label)}</span></div></div>
   <div class="crowd" title="How loud the stadium is"><span class="small muted">${crowd.home ? 'Your crowd' : sim.g.neutral ? 'Neutral crowd' : 'Road crowd'}</span><div class="bar"><i class="${crowd.home ? 'good' : 'bad'}" style="width:${crowd.v}%"></i></div><b class="small">${crowd.lbl}</b></div>
   <div class="lmeta small muted">${sim.g.h === ME && !sim.g.neutral ? 'Home crowd factor ' + crowdFactor(sim.g.h, sim.g.a).toFixed(2) : 'Road game'}${mom ? ` · <b>Momentum: ${esc(teamName(mom))}</b>` : ''}${clutchLine(sim, last)}${sim.mSide >= 0 ? ` · Challenges left: ${chalLeft(sim)}` : ''}</div>
   ${reviewable(sim) && !p ? `<div class="chal"><button class="btn sm" data-act="lchal">${reviewable(sim).kind === 'td' ? 'Challenge the touchdown' : 'Challenge the turnover'}</button><span class="small muted">${reviewable(sim).kind === 'td' ? 'If it\'s overturned they settle for a field goal.' : 'If he was down by contact, you keep the ball and punt.'} ${chalLeft(sim)} challenge${chalLeft(sim) === 1 ? '' : 's'} left.</span></div>` : ''}
   ${dec}${controls}<ul class="plays livelog">${logRows || '<li><span class="when"></span><span class="muted">Kickoff is coming up.</span></li>'}</ul></div>`;
  subst(mb); if (fieldOn()) pfSync(); playClockArm(sim);
  if (keepSel) { const k = mb.querySelector(keepSel); (k && !k.disabled ? k : m.querySelector('.mclose')).focus({ preventScroll: true }); }
}

/* ---------- render ---------- */
// What a page shows when it can't be drawn: what happened, a repair for the section, the details to copy, and a save
// code so nothing is lost (QOL-05). p is '' for AD-side careers and 'c' for Player Career.
function viewFailHTML(e, p) {
  ui.viewErr = { msg: String(e && e.message || e), tab: p ? cui.tab : ui.tab, v: PATCH_NOTES[0].v };
  return `<section class="card" role="alert"><div class="eyebrow">Something went wrong</div><h2 class="h3">This section could not be shown</h2>
   <p>Part of this save's data for this page looks damaged. Your career itself is fine, and it is still being saved.</p>
   <div class="row gap wrap"><button class="btn primary" data-act="${p}xrepair">Reset this section</button><button class="btn" data-act="xcopyerr">Copy details</button><button class="btn ghost" data-act="${p}xexport">Copy a save code</button></div>
   <p class="hint" id="xerrhint">Reset clears only the damaged part (for example the fan feed or the story), never your roster, money or record.</p></section>`;
}
// the page for the current AD-side tab (extras pages first)
function adViewFor() {
  const xv = typeof xView === 'function' ? xView(ui.tab) : null; /* the v9.12 pages */
  const v = xv ? xv : isComm() ? commView(ui.tab) : isPro() ? proView() : { office: isCoach() ? vCoachOffice : vOffice, career: isCoach() ? vCoachCareer : vExecCareer, schedule: vSchedule, roster: vRoster, depth: vDepth, staff: vStaff, recruit: vRecruit, poll: vPoll, awards: vAwards, draft: vDraft, standings: vStandings, scores: vScores, post: vPost, money: isCoach() ? vCoachOffice : vMoney, payroll: isCoach() ? vCoachOffice : vPayroll, fac: isCoach() ? vCoachOffice : vFac, history: vHistory, records: vRecords, lghist: vLgHist, off: vOff, admin: vAdmin, file: vFile, settings: vSettings }[ui.tab] || vOffice;
  return v;
}
function renderAD() {
  renderHeader(); renderTabs();
  if (typeof cmSyncNames === 'function') cmSyncNames();
  if (isComm() ? !commTabList().some(t => t[0] === ui.tab) : isPro() && !PRO_TABS.some(t => t[0] === ui.tab)) ui.tab = 'office';
  const v = adViewFor();
  const entering = ui.lastTab !== ui.tab; ui.lastTab = ui.tab;
  if (ui.firstTip) { ui.flash = (ui.flash ? ui.flash + ' ' : '') + ui.firstTip; ui.firstTip = null; } // after anything that happened at startup (SUS-01)
  if (ui.xFixed) { ui.flash = (ui.flash ? ui.flash + ' ' : '') + `Some optional data in this save was damaged and was reset: ${ui.xFixed.join(', ')}. Everything else loaded normally.`; ui.xFixed = null; }
  if (state.achToast) { ui.flash = (ui.flash ? ui.flash + ' ' : '') + 'Achievement unlocked: ' + state.achToast + '.'; state.achToast = null; }
  // a failed save stays on screen until a save lands (reviewer fix; Player Career has the same banner)
  const adFail = saveQ.failed[slot] ? `<div class="flash bad" role="alert">This career isn't being saved: browser storage is full or blocked. <button class="lnk" data-act="adretry">Try again</button> · <button class="lnk" data-act="tab" data-tab="file">Create a save code</button></div>` : '';
  if (ui.flash) { ui.lastFlash = ui.flash; ui.lastFlashT = Date.now(); }
  // a message about what you just did floats over the page instead of pushing it down, and the page keeps its place
  const keepY = window.scrollY;
  let body; try { body = v(); } catch (e) { console.error(e); body = viewFailHTML(e, ''); }
  $('#view').innerHTML = adFail + (ui.flash ? `<div class="flash toast">${esc(ui.flash)}</div>` : '') + undoBarHTML() + body;
  if (!entering && Math.abs(window.scrollY - keepY) > 1) window.scrollTo(0, keepY);
  if (ui.flash) announce(ui.flash);
  ui.flash = '';
  if (entering) { const vw = $('#view'); vw.classList.remove('enter'); void vw.offsetWidth; vw.classList.add('enter'); clearTimeout(ui.enterT); ui.enterT = setTimeout(() => vw.classList.remove('enter'), 1000); }
  renderTicker();
  subst($('#hdr')); subst($('#tabs')); subst($('#view')); subst($('#mnav')); document.title = myName() + ' · Football Empire';
  const ov = $('#over'); const wasHidden = ov.hidden;
  if (!state.gameOver) ui.overHide = false;
  if (state.gameOver && ui.overHide) { const vw = $('#view'); vw.insertAdjacentHTML('afterbegin', '<div class="flash bad">Your tenure is over. Load or start another career on the Save file tab, or undo the firing in Admin → Game settings. <button class="lnk" data-act="overshow">Show options</button></div>'); }
  const oj = $('#overjobs'); if (oj) oj.hidden = !(state.gameOver && state.gameOver.jobs && state.gameOver.jobs.length);
  if (state.gameOver && !ui.overHide) { ov.hidden = false; $('#over .otxt').textContent = state.gameOver.reason; ['hdr', 'tabs', 'view', 'mnav', 'ticker'].forEach(id => { const el = $('#' + id); if (el) el.setAttribute('inert', ''); }); if (wasHidden) ov.querySelector('button:not([hidden])').focus(); }
  else { ov.hidden = true; if (!wasHidden) { setInert(!$('#modal').hidden); if ($('#modal').hidden) { const b = document.querySelector('#hdr [data-act="primary"]'); if (b) b.focus(); } } }
}
// Broadcast theme: the newswire runs along the bottom of the screen like a TV ticker.
function renderTicker() {
  const t = $('#ticker'); if (!t) return;
  if (prefs.skin !== 'broadcast') { if (t.innerHTML) t.innerHTML = ''; ui.tickKey = ''; return; }
  const items = (isComm() ? (cm2().log || []).slice(0, 8) : state.news.slice(0, 8)).map(n => `<span>${esc(n.txt)}</span>`).join('<i>///</i>');
  if (ui.tickKey === items) return; ui.tickKey = items;
  t.innerHTML = `<div class="tag">Bottom line</div><div class="tk"><div class="run">${items}<i>///</i>${items}<i>///</i></div></div>`; subst(t);
}
// Used when adopting a loaded or imported save: the header and first screen must render.
function validateRender() { if (isPro()) { headerHTML(); primaryLabel(); vProOffice(); vProSchedule(); vProRoster(); if (isGM()) vProCap(); vProDraft(); vFile(); if (state.phase === 'offseason') vProOff(); return; } headerHTML(); primaryLabel(); vOffice(); vSchedule(); vRoster(); vMoney(); vFile(); if (state.phase === 'offseason') vOff(); }
function after(msg) { if (msg) ui.flash = msg; save(); render(); }

/* ---------- sound (original, synthesized) ---------- */
let AC = null;
// Sound follows the mode being played: AD's career setting, or the player career's own.
function soundOn() { if (typeof appMode !== 'undefined' && appMode === 'career') return !!(typeof cs !== 'undefined' && cs && cs.sound); return !!(state && state.settings && state.settings.sound); }
function actx() { if (!soundOn()) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
function sfx(kind) {
  const ac = actx(); if (!ac) return; const t = ac.currentTime;
  if (kind === 'crowd' || kind === 'groan') {
    const len = kind === 'crowd' ? 1.8 : 1.1; const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(kind === 'crowd' ? 950 : 420, t); if (kind === 'groan') f.frequency.linearRampToValueAtTime(180, t + len); f.Q.value = 0.6;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'crowd' ? 0.35 : 0.16, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(ac.destination); src.start(t); src.stop(t + len);
  } else if (kind === 'jingle') {
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((fq, i) => { const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'triangle'; o.frequency.value = fq; const st = t + i * 0.14; g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.18, st + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, st + (i === 5 ? 0.55 : 0.13)); o.connect(g).connect(ac.destination); o.start(st); o.stop(st + 0.6); });
  } else if (kind === 'whistle') {
    const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(2900, t); const lfo = ac.createOscillator(); const lg = ac.createGain(); lfo.frequency.value = 28; lg.gain.value = 120; lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g).connect(ac.destination); o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
  }
}

function forecastLine(g) {
  const wx = forecast(g); const W = WX[wx.k]; const home = g.h === ME && !g.neutral;
  const crowd = home ? Math.round(capacity() * ticketDemand(g.a)) : 0;
  const eff = wx.k === 'clear' ? 'No weather effect.' : wx.k === 'snow' ? 'Passing and kicking suffer; running teams gain.' : wx.k === 'wind' ? 'Deep passes and long kicks get harder.' : wx.k === 'rain' ? 'More fumbles, shakier passing.' : wx.k === 'cold' ? 'Kickers and passers feel it.' : 'Both teams wear down.';
  return `<div class="fcast"><span class="pill ${wx.k === 'clear' ? 'ghost' : 'warn'}">${W.label}, ${wx.temp}°</span><span class="small muted">${eff}</span>${home ? `<span class="small muted">· Expected crowd ${crowd.toLocaleString()}${crowd >= capacity() * 0.97 ? ' (sellout, louder home field)' : ''}</span>` : g.neutral ? '<span class="small muted">· Neutral site</span>' : '<span class="small muted">· Road crowd</span>'}</div>`;
}
function practiceCard() {
  if (isCoach() && state.co.role !== 'HC') return focusCard();
  if (state.phase === 'offseason') return '';
  if (isCoach()) { const p = state.pplan || { off: 2, def: 2, cond: 2, film: 2 }; const used = Object.values(p).reduce((a, b) => a + b, 0); const bn = pplanBonus();
    return `<section class="card"><div class="eyebrow">This week's practice plan · ${used} of 8 periods</div><div class="pplan">${PPLAN_KEYS.map(([k, l, d]) => `<span><b class="lbl">${l}</b> <span class="small muted">${d}</span></span><button class="btn ghost sm" data-act="pplan" data-k="${k}" data-d="-1" aria-label="Less ${l}" ${p[k] <= 0 ? 'disabled' : ''}>−</button><b>${p[k]}</b><button class="btn ghost sm" data-act="pplan" data-k="${k}" data-d="1" aria-label="More ${l}" ${used >= 8 || p[k] >= 6 ? 'disabled' : ''}>+</button>`).join('')}</div>
     <p class="hint">Two periods each is a normal week. Each extra period of offense or defense is worth about half a point on that side; conditioning cuts injuries; film study helps against this week's opponent.${state.pplan ? ` This week: offense ${fmEdge(r1(bn.off + bn.film))}, defense ${fmEdge(r1(bn.def + bn.film))}, injuries ×${bn.inj.toFixed(2)}.` : ''}</p></section>`; }
  return `<section class="card"><div class="eyebrow">Practice focus this week</div>${seg('practice', state.practice, Object.entries(PRACTICE).map(([k, v]) => [k, v.label]))}<p class="hint">${esc(PRACTICE[state.practice].desc)}</p></section>`;
}
function lockerHTML() { const { lead, trouble } = lockerRoom(); if (!lead.length && !trouble.length) return ''; return `<p class="small mt"><b>Locker room:</b> ${lead.length ? `leaders starting: ${lead.map(p => esc(p.n)).join(', ')}` : 'no leaders in the lineup'}${trouble.length ? ` · <span class="warn-t">unhappy on the bench: ${trouble.map(p => esc(p.n)).join(', ')}</span>` : ''}. Leaders lift the team every week; a diva on the bench drags it down, and a diva who starts sulks after a loss.</p>`; }
// the rehab call for an injured player (two weeks or more)
function rehabHTML(p) {
  if (!rehabOpen(p) || (isCoach() && state.co.role !== 'HC')) return p.rehab && REHAB[p.rehab] ? `<div class="small muted">${esc(REHAB[p.rehab][0])}${p.reinj ? ' · re-injury risk for ' + p.reinj + ' games' : p.prot ? ' · extra care for ' + p.prot + ' games' : ''}</div>` : '';
  return `<div class="rehab"><div class="small muted">${esc(doctorNote(p))}</div><div class="row gap">${Object.entries(REHAB).map(([k, v]) => `<button class="btn ${k === 'std' ? '' : 'ghost'} sm" data-act="rehab" data-id="${p.id}" data-v="${k}" title="${esc(v[1])}">${esc(v[0])}</button>`).join('')}</div></div>`;
}
// scouting staff: hire up to three; college scouts cover regions, NFL scouts cover position groups
function scoutStaffCard() {
  const L = scoutList(); const pro = isPro(); const lbl = s => (pro ? SC_GRP[s.spec][0] : SC_REG[s.spec][0]); const can = scoutCan(); const cands = L.length < 3 && can ? scoutCands() : [];
  const lv = n => ['', 'Area scout', 'Senior scout', 'Director'][n];
  return `<section class="card"><div class="head"><div><div class="eyebrow">Scouting staff · ${L.length} of 3</div><h2 class="h3">${L.length ? L.map(s => esc(lbl(s))).join(', ') : 'No scouts yet'}</h2></div><p class="hint">${pro ? 'Prospects in a scout\'s position group start better scouted (a director gets you two levels), and each scout adds a scouting point every week.' : 'Recruits from a scout\'s region are fully scouted, and he flags sleepers: three-star players or lower with a lot of upside.'}</p></div>
   ${L.length ? `<table class="mini wide">${L.map(s => `<tr><td><b>${esc(s.name)}</b> <span class="small muted">${lv(s.lvl)}</span></td><td class="small">${esc(lbl(s))}</td><td class="num small">$${Math.round(s.sal / 1000)}K</td><td>${can ? `<button class="btn ghost sm" data-act="scfire" data-id="${s.id}">Let go</button>` : ''}</td></tr>`).join('')}</table>` : ''}
   ${cands.length ? `<div class="lbl mt">Available</div><table class="mini wide">${cands.map(s => `<tr><td><b>${esc(s.name)}</b> <span class="small muted">${lv(s.lvl)}</span></td><td class="small">${esc(lbl(s))}</td><td class="num small">$${Math.round(s.sal / 1000)}K</td><td><button class="btn sm" data-act="schire" data-id="${s.id}">Hire</button></td></tr>`).join('')}</table>` : !can ? '<p class="small muted">The head coach hires the scouts.</p>' : ''}</section>`;
}
// AD money: bonds and boosters with strings attached
function debtCard() {
  if (isPro() || isCoach()) return ''; const bonds = state.bonds || []; const left = debtLeft(); const bo = boosterOffer(); const strs = (state.strings || []).filter(x => !x.broken && !x.kept);
  return `<section class="card"><div class="head"><div><div class="eyebrow">Debt and boosters</div><h2 class="h3">${left ? `$${left}M owed` : 'No debt'}</h2></div><p class="hint">Bonds pay out now and cost an equal payment every year for ${BOND_YRS} years at ${BOND_RATE * 100}%. The board doesn't like debt. Payments post at the end of each season.</p></div>
   ${bonds.length ? `<table class="mini wide">${bonds.map(b => `<tr><td>${b.s} bond</td><td class="num">$${b.amt}M</td><td class="num small">$${b.pay}M a year</td><td class="small muted">${b.left} payment${b.left === 1 ? '' : 's'} left</td></tr>`).join('')}</table>` : ''}
   <div class="row gap mt">${BOND_SIZES.map(a => `<button class="btn ghost sm" data-act="bond" data-v="${a}" ${debtLeft() + bondPay(a) * BOND_YRS > DEBT_MAX * 1.35 ? 'disabled' : ''}>Issue $${a}M (pay $${bondPay(a)}M a year)</button>`).join('')}</div>
   ${bo ? `<div class="cand mt"><div><b>${esc(bo.who)}</b> offers <b>$${bo.amt}M</b><div class="small muted">${bo.k === 'coach' ? `If you keep ${esc(bo.coach)} as head coach through ${bo.thru}.` : `If the average ticket stays at $${bo.tix} or less through ${bo.thru}.`} Break it and he wants half back.</div></div><div class="row gap"><button class="btn sm" data-act="booster" data-v="1">Accept</button><button class="btn ghost sm" data-act="booster" data-v="0">Decline</button></div></div>` : ''}
   ${strs.length ? `<p class="small mt"><b>Promises you made:</b> ${strs.map(x => esc(x.k === 'coach' ? `keep ${x.coach} through ${x.thru}` : `tickets at $${x.tix} or less through ${x.thru}`)).join(' · ')}</p>` : ''}</section>`;
}
// bowl week: travel party and tickets (AD)
function bowlWeekCard() {
  const g = bowlGame(); if (!g) return ''; const tr = state.trip && state.trip.gid === g.id ? state.trip : null; const t = bowlTix(g, false); const t2 = bowlTix(g, true);
  return `<section class="card bigstage-card"><div class="eyebrow">${g.type === 'cfp' ? 'Playoff week' : 'Bowl week'} · ${esc(g.name || 'Postseason')}</div><h2 class="h3">vs. ${esc(teamName(oppOf(g)))} · ${esc(bowlCity(g))}</h2>
   ${tr ? `<p class="small">Travel party: <b>${esc(TRIP[tr.k][0])}</b>${tr.promo ? ' with a ticket push' : ''}. ${tr.sold.toLocaleString()} of ${tr.allot.toLocaleString()} tickets sold. Cost $${tr.cost}M.</p>` : `<p class="small">Your allotment is ${t.allot.toLocaleString()} tickets. Fans are on pace to buy about ${t.sold.toLocaleString()} (${t2.sold.toLocaleString()} with a $0.2M ticket push). The school pays for the rest.</p>
   <div class="evopts">${Object.entries(TRIP).map(([k, v]) => `<button class="evopt" data-act="trip" data-v="${k}"><b>${esc(v[0])}</b><span>$${v[1]}M · fans +${v[2]}, boosters +${v[3]}</span></button>`).join('')}</div>
   <label class="chk small mt"><input type="checkbox" id="trippromo"> Push ticket sales ($0.2M)</label>`}</section>`;
}
function injuryCard() {
  const inj = state.roster.filter(p => p.inj || p.susp);
  if (!inj.length) return '';
  return `<section class="card"><div class="eyebrow">Injury & availability report</div><table class="mini wide">${inj.map(p => `<tr><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button> <span class="muted small">${p.pos}</span></td><td class="small">${p.susp ? 'Suspended' : esc(p.injType || 'Injured')}</td><td class="num small">${p.susp ? p.susp + ' g' : p.injSE ? 'Season' : p.inj + ' wk'}</td></tr>${!p.susp && (rehabOpen(p) || p.rehab) ? `<tr><td colspan="3">${rehabHTML(p)}</td></tr>` : ''}`).join('')}</table></section>`;
}

function captainsCard() {
  const caps = captainsList(); const pool = state.roster.filter(p => ['Jr', 'Sr', 'Gr'].includes(p.cls)).sort((a, b) => b.ovr - a.ovr);
  const sel = i => `<select data-act="capsel" data-i="${i}" aria-label="Captain ${i + 1}"><option value="">None</option>${pool.map(p => `<option value="${p.id}" ${caps[i] && caps[i].id === p.id ? 'selected' : ''}>${esc(p.n)} · ${p.pos} · ${clsLabel(p)}${p.pers === 'leader' ? ' · Leader' : ''}</option>`).join('')}</select>`;
  return `<section class="card"><div class="head"><div><div class="eyebrow">Captains & leadership council</div><h2 class="h2">Leadership ${leadership().toFixed(1)}</h2></div><p class="hint">Up to four captains. Players with the Leader trait count triple. Strong leadership lifts the locker room every week; weak leadership lets it drift down.</p></div><div class="caps">${[0, 1, 2, 3].map(sel).join('')}</div><div class="row gap mt"><button class="btn ghost sm" data-act="autocaps">Auto-pick captains</button></div>${lockerHTML()}</section>`;
}
function walkonCard() {
  const open = state.phase === 'offseason' || (state.phase === 'regular' && state.week === 1 && !mGames().some(g => g.done));
  if (!open) return '';
  const held = state.tryouts === state.season && state.walkons;
  return `<section class="card"><div class="head"><div><div class="eyebrow">Open tryouts</div><h2 class="h2">Walk-ons</h2></div><p class="hint">Once a year, before the season. Most walk-ons are depth, but about one in eight has real upside. Roster: ${state.roster.length} of ${rosterLimit()}.</p></div>
   ${held ? `<div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>OVR</th><th>Upside</th><th></th></tr></thead><tbody>${state.walkons.map(w => `<tr class="${w.added ? 'kept' : ''}"><td>${esc(w.n)}</td><td>${w.pos}</td><td>${ovrTag(w.ovr)}</td><td>${w.gem ? '<span class="pill good">Coaches love him</span>' : w.pot >= 70 ? '<span class="pill">Some</span>' : '<span class="pill ghost">Limited</span>'}</td><td>${w.added ? '<span class="pill good">Joined</span>' : `<button class="btn sm" data-act="walkon" data-id="${w.id}" ${state.roster.length < rosterLimit() ? '' : 'disabled'}>Add to roster</button>`}</td></tr>`).join('')}</tbody></table></div>` : `<button class="btn" data-act="tryouts">Hold open tryouts ($0.1M)</button>`}</section>`;
}

function negView() {
  const n = ui.neg; if (!n) return '';
  const c = n.ext ? state.staff[n.role] : (state.cands[n.role] || []).find(x => x.id === n.cid); if (!c) return '<p>This coach is no longer available.</p>';
  const o = { sal: n.sal, yrs: n.yrs, buy: n.buy, incConf: n.incConf, incCFP: n.incCFP }; const odds = Math.round(negOdds(c, o, n.ext) * 100);
  const ask = n.ext ? c.salary * 1.12 : c.salary;
  const lim = { sal: [n.sal <= 0.1, false], yrs: [n.yrs <= 1, n.yrs >= 8], buy: [n.buy <= 0.25, n.buy >= 1] };
  const dis = (f, i) => lim[f][i] ? `disabled title="Already at the ${i ? 'maximum' : 'minimum'}"` : '';
  const row = (lbl, f, val, hint) => `<div class="stepper"><div class="lbl">${lbl}</div><div class="ctl"><button class="icon" data-act="negadj" data-f="${f}" data-d="-1" aria-label="Lower ${lbl}" ${dis(f, 0)}>−</button><span class="val">${val}</span><button class="icon" data-act="negadj" data-f="${f}" data-d="1" aria-label="Raise ${lbl}" ${dis(f, 1)}>+</button></div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  return `<div class="eyebrow">${n.ext ? 'Contract extension' : 'Contract offer'} · ${esc(ROLE_TITLE[n.role])}</div><h2 class="h2">${esc(c.name)}</h2><p class="muted">${esc(c.bg || c.note || '')} · rating ${coachOvr(c)}</p>
   ${row('Salary per year', 'sal', fm(n.sal), `He is looking for about ${fm(ask)}.`)}${row('Years', 'yrs', n.yrs, `He wants ${n.ext ? 'about 3 more' : c.years}. Longer deals add security, and a bigger buyout if you fire him.`)}${row('Buyout protection', 'buy', Math.round(n.buy * 100) + '% of remaining salary', 'Coaches like high buyouts. You pay this if you fire him.')}
   <div class="stepper"><div class="lbl">Incentives</div><label class="chk"><input type="checkbox" id="neg-conf" data-act="negtog" data-f="incConf" ${n.incConf ? 'checked' : ''}> Conference title bonus (${fm(n.sal * 0.1)})</label><label class="chk"><input type="checkbox" id="neg-cfp" data-act="negtog" data-f="incCFP" ${n.incCFP ? 'checked' : ''}> Playoff bonus (${fm(n.sal * 0.15)})</label></div>
   <div class="odds"><span>Chance he signs</span><b>${odds}%</b><div class="bar"><i class="${odds >= 65 ? 'good' : odds >= 40 ? 'warn' : 'bad'}" style="width:${odds}%"></i></div></div>
   ${ui.negMsg ? `<p class="flash">${esc(ui.negMsg)}</p>` : ''}${c.fails ? `<p class="hint">He has turned down ${c.fails} offer${c.fails > 1 ? 's' : ''}. Each rejection makes the next one harder.</p>` : ''}
   <div class="row gap mt"><button class="btn primary" data-act="negsubmit">Make the offer</button><button class="btn ghost" data-act="close">Walk away</button></div>`;
}

function natCard() {
  const nc = state.natClasses; if (!nc) return '';
  return `<section class="card"><div class="eyebrow">National recruiting rankings · Class of ${nc.s + 1}</div><div class="tw"><table class="tbl"><thead><tr><th>#</th><th>School</th><th>Class score</th></tr></thead><tbody>${nc.rows.map((r, i) => `<tr class="${r.id === ME ? 'me' : ''}"><td class="num">${i + 1}</td><td>${tchip(r.id, { norank: true })}</td><td class="num">${r.sc}</td></tr>`).join('')}</tbody></table></div>${nc.mine > 25 ? `<p class="hint">${esc(myName())}'s class ranked No. ${nc.mine}.</p>` : ''}</section>`;
}

function dealsCard() {
  const rows = (state.deals || []).map(d => {
    const exp = d.thru < state.season; const open = dealOpen(d);
    const offers = open ? `<div class="evopts">${dealOffers(d).map(o => `<button class="evopt" data-act="deal" data-id="${d.id}" data-k="${o.k}"><b>${o.label}: ${fm(o.amt)}/yr</b><span>${esc(o.desc)}</span></button>`).join('')}</div>` : '';
    return `<div class="deal"><div class="row gap" style="justify-content:space-between"><div><b>${esc(d.name)}</b><div class="small muted">${exp ? 'Expired. No revenue until you sign a new deal.' : `${fm(d.amt)} per year through ${d.thru}${d.kind ? ' · ' + esc(d.kind) : ''}`}</div></div>${exp ? '<span class="pill bad">Expired</span>' : open ? '<span class="pill warn">Up for renewal</span>' : '<span class="pill ghost">Locked in</span>'}</div>${offers}</div>`;
  }).join('');
  return `<section class="card"><div class="eyebrow">Media & partner deals</div><p class="hint">Conference TV money is negotiated by the conference. These are the deals you control. Offers open in the final year of a deal and improve with fan approval and national rank. Figures are game estimates.</p>${rows}</section>`;
}

function achGrid() {
  const got = state.ach || {};
  return `<div class="achs">${ACH.map(([id, name, desc, pts]) => `<div class="ach${got[id] ? ' on' : ''}"><b>${esc(name)}</b><span>${esc(desc)}</span><em>${got[id] ? 'Unlocked ' + got[id].s : pts + ' pts'}</em></div>`).join('')}</div><p class="hint">${Object.keys(got).length} of ${ACH.length} unlocked.</p>`;
}
function alumniCard() {
  const a = state.alumni.slice().reverse().slice(0, 40); if (!a.length) return '';
  return `<section class="card"><div class="eyebrow">Where are they now</div><div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Last season</th><th>Now</th><th>Career with you</th></tr></thead><tbody>${a.map(x => `<tr><td>${esc(x.n)}</td><td>${x.pos}</td><td>${x.last}</td><td class="small">${esc(x.where || x.why)}</td><td class="small muted">${esc(statLine({ pos: x.pos }, x.cs))}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function recapView(r, season, h) {
  if (!r) return '<p class="muted">No recap for this season.</p>';
  return `<div class="eyebrow">${season} season recap</div><h2 class="h2">Board grade: ${r.grade}</h2>${h ? `<p class="muted">${h.w}-${h.l}${h.rank ? ', finished No. ' + h.rank : ''}${h.bowl ? ' · ' + esc(h.bowl) : ''}</p>` : ''}
   <div class="recap">${r.best ? `<div><span class="k">Best win</span><b>${esc(r.best.opp)}</b><span class="small muted">${r.best.score}</span></div>` : ''}${r.worst ? `<div><span class="k">Toughest loss</span><b>${esc(r.worst.opp)}</b><span class="small muted">${r.worst.score}</span></div>` : ''}${r.comeback ? `<div><span class="k">Comeback of the year</span><b>${esc(r.comeback.opp)}</b><span class="small muted">Won ${r.comeback.score} after trailing by ${r.comeback.down}</span></div>` : ''}</div>
   ${r.top && r.top.length ? `<div class="eyebrow mt">Top performers</div><ol class="plainlist">${r.top.map(t => `<li><b>${esc(t.n)}</b>, ${t.pos} · ${esc(t.line)}</li>`).join('')}</ol>` : ''}`;
}

/* ---------- NFL Draft ---------- */
function nflChip(id) { const t = NFL_BY[id]; if (!t) return ''; return `<span class="nflc" title="${esc(t.name)}"><i style="background:${t.c1};border-color:${t.c2}"></i>${esc(t.nick)}</span>`; }
function draftHistTable() {
  return `<div class="tw"><table class="tbl"><thead><tr><th>Draft</th><th>Player</th><th>Pos</th><th>Pick</th><th>Team</th></tr></thead><tbody>${state.draft.slice().reverse().map(d => `<tr><td>${d.s}</td><td>${esc(d.n)}</td><td>${d.pos}</td><td class="nowrap">${d.no ? `Rd ${d.rd}, #${d.no}` : d.rd === 7 ? 'Late round' : 'Round ' + d.rd}</td><td>${d.tm ? nflChip(d.tm) : '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table></div>`;
}
const DRAFT_POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P'];
// what the projections say before the draft: your prospects, the big board and a mock first round
function draftProjHTML(board) {
  const yr = draftYear(); const mine = board.map((x, i) => Object.assign({ rk: i + 1 }, x)).filter(x => x.mine);
  const pos = ui.dpos || 'all'; const fb = pos === 'all' ? board : board.filter(x => x.pos === pos);
  const top = fb.slice(0, 50).map(x => Object.assign({}, x, { rk: board.indexOf(x) + 1 }));
  const mock = simDraft(state.season, board.slice(0, 120)).picks.slice(0, 32);
  const myT = mine.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Board</th><th>Player</th><th>Pos</th><th>Yr</th><th>OVR</th><th>Projection</th><th>Status</th></tr></thead><tbody>${mine.map(x => `<tr><td class="num">${x.rk <= DRAFT_PICKS ? '#' + x.rk : '—'}</td><td><b>${esc(x.n)}</b></td><td>${x.pos}</td><td>${x.cls}</td><td>${ovrTag(x.ovr)}</td><td>${projLabel(x.rk)}${projPick(x.rk) ? ` <span class="muted small">(about pick ${x.rk})</span>` : ''}</td><td class="small">${state.phase === 'offseason' && state.off && state.off.declared ? 'Declared' : x.early ? 'Could leave early' : 'Draft-eligible after the season'}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">None of your players project as draft picks yet. Seniors rated around 80 and up, and juniors in the high 80s, show up here.</p>`;
  return `<section class="card"><div class="head"><div><div class="eyebrow">${yr} NFL Draft · projections</div><h2 class="h2">Your prospects</h2></div><p class="hint">Boards update every week with players' ratings. Seven rounds, ${DRAFT_PICKS} picks. Position value matters: quarterbacks and pass rushers go early, specialists late.</p></div>${myT}</section>
   <section class="card"><div class="head"><div><div class="eyebrow">Big board</div><h2 class="h2">Top 50 prospects</h2></div><label class="fld inl"><span>Position</span><select id="dpos" aria-label="Filter the board by position"><option value="all">All</option>${DRAFT_POS.map(p => `<option ${pos === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label></div>
   ${filterBox('draftb', 'Filter prospects')}<div class="tw"><table class="tbl sortable" data-sk="draftb"><thead><tr><th>#</th><th>Player</th><th>Pos</th><th>School</th><th>Yr</th><th>OVR</th><th>Projection</th></tr></thead><tbody>${top.map(x => `<tr class="${x.mine ? 'me' : ''}"><td class="num">${x.rk}</td><td><b>${esc(x.n)}</b>${x.mine ? ' <span class="pill maize">Yours</span>' : ''}</td><td>${x.pos}</td><td>${x.mine ? esc(myName()) : tchip(x.tm, { norank: true })}</td><td>${x.cls}</td><td>${ovrTag(x.ovr)}</td><td class="small">${projLabel(x.rk)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No prospects at this position.</td></tr>'}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Mock draft · order from the ${state.season} NFL season</div><h2 class="h2">Projected first round</h2><ol class="mock">${mock.map(p => `<li class="${p.mine ? 'me' : ''}"><span class="ord">${p.no}</span>${nflChip(p.tm)}<span class="mp"><b>${esc(p.n)}</b> · ${p.pos}, ${esc(p.mine ? myName() : teamName(p.school))}</span></li>`).join('')}</ol></section>`;
}
function draftPreHTML() {
  const o = state.off; const board = draftClass(); const dec = (o.declared || []).length;
  return `<section class="card"><div class="eyebrow">NFL Draft · ${draftYear()}</div><h2 class="h2">${dec ? `${dec} of your players declared` : 'Draft weekend'}</h2><p class="hint">${dec ? 'Seven rounds, all 32 teams. Your players are highlighted as they come off the board.' : 'None of your players declared this year. You can still watch the draft.'}</p><div class="row gap mt"><button class="btn primary" data-act="rundraft">Run the draft</button></div></section>${draftProjHTML(board)}`;
}
function draftResultsHTML(nf, inOff) {
  const mine = nf.picks.filter(p => p.mine); const rd = +(ui.drd || 1);
  const mineHTML = mine.length ? `<ul class="dpicks">${mine.map(p => `<li><span class="dno"><b>${p.rd}</b><small>Round</small></span><span class="dno"><b>${p.no}</b><small>Overall</small></span><span class="dwho"><b>${esc(p.n)}</b> · ${p.pos}<br>${nflChip(p.tm)} <span class="muted small">pick ${p.inRd} of round ${p.rd}</span></span></li>`).join('')}</ul>` : '<p class="muted">None of your players were drafted.</p>';
  const ud = nf.udfa && nf.udfa.length ? `<p class="hint mt">Undrafted: ${nf.udfa.map(x => esc(x.n) + ' (' + x.pos + ')').join(', ')}. They'll sign as free agents.</p>` : '';
  const rows = nf.picks.filter(p => p.rd === rd).map(p => `<tr class="${p.mine ? 'me' : ''}"><td class="num">${p.no}</td><td class="num muted">${p.inRd}</td><td>${nflChip(p.tm)}</td><td><b>${esc(p.n)}</b>${p.mine ? ' <span class="pill maize">Yours</span>' : ''}</td><td>${p.pos}</td><td>${p.mine ? esc(myName()) : esc(teamName(p.school))}</td></tr>`).join('');
  return `<section class="card"><div class="eyebrow">${nf.year} NFL Draft · results</div><h2 class="h2">${mine.length ? `${mine.length} ${esc(myName())} player${mine.length > 1 ? 's' : ''} drafted` : 'Draft complete'}</h2>${mineHTML}${ud}${state.off && state.off.nfl === nf ? '<button class="btn ghost sm mt" data-act="dnwatch">Watch draft night again</button>' : ''}${inOff ? '<div class="row gap mt"><button class="btn primary" data-act="offnext">Continue to development & captains</button></div>' : ''}</section>
   <section class="card"><div class="head"><div><div class="eyebrow">Every pick</div><h2 class="h2">Round ${rd}</h2></div><div class="seg" role="group" aria-label="Round">${DRAFT_ROUNDS.map((n, i) => `<button class="${rd === i + 1 ? 'on' : ''}" data-act="drd" data-v="${i + 1}" aria-pressed="${rd === i + 1}">${i + 1}</button>`).join('')}</div></div>
   <div class="tw"><table class="tbl sortable" data-sk="draftr"><thead><tr><th>Pick</th><th>In rd</th><th>Team</th><th>Player</th><th>Pos</th><th>School</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function vDraft() {
  if (state.phase === 'offseason' && state.off && state.off.nfl) return draftResultsHTML(state.off.nfl, false) + draftPastHTML();
  return draftProjHTML(draftClass()) + draftPastHTML();
}
function draftPastHTML() {
  const ld = state.lastDraft; const hist = state.draft.length ? draftHistTable() : '<p class="muted">No players drafted yet.</p>';
  return `<section class="card"><div class="eyebrow">Draft history</div><h2 class="h2">${esc(myName())} in the NFL Draft</h2>${hist}${ld ? `<div class="eyebrow mt">${ld.year} first round</div><ol class="mock">${ld.r1.map(p => `<li class="${p.mine ? 'me' : ''}"><span class="ord">${p.no}</span>${nflChip(p.tm)}<span class="mp"><b>${esc(p.n)}</b> · ${p.pos}, ${esc(p.mine ? myName() : teamName(p.school))}</span></li>`).join('')}</ol>` : ''}</section>`;
}

/* ---------- legacy pages (shared by AD, Coach and GM): highlights, timeline, Hall of Fame, goals, rivalries ---------- */
function cmpBtns(p) { const a = ui.cmpA && ui.cmpA !== p.id ? cmpPlayer(ui.cmpA) : null; return `<div class="row gap">${a ? `<button class="btn sm" data-act="cmpgo" data-id="${p.id}">Compare with ${esc(a.n)}</button>` : ''}<button class="btn ghost sm" data-act="cmpset" data-id="${p.id}">${ui.cmpA === p.id ? 'Picked for comparison' : 'Compare…'}</button></div>`; }
function selHTML(chg, cur, vals, label) { return `<select data-chg="${chg}" aria-label="${esc(label)}">${vals.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; }
function hlCardHTML() {
  const all = state.hl || {}; const yrs = Object.keys(all).map(Number).sort((a, b) => b - a);
  if (!yrs.length) return `<section class="card"><div class="eyebrow">Season highlights</div><p class="muted">Highlights from your first season show up here when it ends: the biggest plays, the best wins, your top players and how your team's rating moved.</p></section>`;
  const s = yrs.includes(+ui.hlS) ? +ui.hlS : yrs[0]; const h = all[s];
  const rt = (h.rating || []); const lo = rt.length ? Math.floor(Math.min(...rt.map(x => x.v)) - 2) : 0, hi = rt.length ? Math.ceil(Math.max(...rt.map(x => x.v)) + 2) : 100;
  const chart = rt.length > 1 ? lineChart(rt.map(x => ({ y: x.v, lbl: 'Week ' + x.wk, tip: `Week ${x.wk}: rating ${x.v}` })), { min: lo, max: hi, yTicks: [lo, Math.round((lo + hi) / 2), hi], title: 'Team rating by week', dots: true }) : '<p class="hint">Not enough games for a chart.</p>';
  const gl = (g, txt) => g.gid && state.games.some(x => x.id === g.gid && x.box) ? `<button class="lnk" data-act="box" data-id="${g.gid}">${txt}</button>` : txt;
  return `<section class="card"><div class="head"><div><div class="eyebrow">Season highlights</div><h2 class="h2">${s} · ${esc(h.rec)}${h.rank ? ', No. ' + h.rank : ''}${h.champ ? ' · Champions' : h.po ? ' · ' + esc(h.po) : ''}</h2></div>${yrs.length > 1 ? selHTML('hls', s, yrs.map(y => [y, String(y)]), 'Season') : ''}</div>
   <div class="grid2 hlgrid"><div><div class="eyebrow">Biggest scoring drives</div>${h.plays.length ? `<ul class="plays">${h.plays.map(p => `<li><span class="when">Wk ${p.wk}</span><span>${esc(p.txt)} <span class="muted">(${p.y} yds, vs. ${esc(p.opp)})</span></span></li>`).join('')}</ul>` : '<p class="muted small">Scoring drives of 20 yards or more show up here.</p>'}
    <div class="eyebrow mt">Best wins</div>${h.wins.length ? `<ul class="plainlist small">${h.wins.map(w => `<li>${gl(w, `${esc(w.score)} over ${esc(w.opp)}`)}${w.name ? ` <span class="muted">${esc(w.name)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="muted small">No wins this season.</p>'}
    ${h.close.length ? `<div class="eyebrow mt">Close calls</div><ul class="plainlist small">${h.close.map(w => `<li>${gl(w, `${esc(w.score)} over ${esc(w.opp)}`)}${w.ot ? ' (OT)' : ''}</li>`).join('')}</ul>` : ''}</div>
   <div><div class="eyebrow">Team rating, week by week</div>${chart}
    ${h.top.length ? `<div class="eyebrow mt">Top players</div><ul class="plainlist small">${h.top.map(p => `<li><b>${esc(p.n)}</b> ${p.pos} · ${esc(p.line || '')}</li>`).join('')}</ul>` : ''}
    ${h.awards && h.awards.length ? `<p class="small mt"><b>Awards:</b> ${h.awards.map(esc).join(' · ')}</p>` : ''}</div></div></section>`;
}
function timelineCardHTML() {
  const t = state.tline || []; const yrs = [...new Set(t.map(x => x.s))].sort((a, b) => b - a);
  if (!yrs.length) return `<section class="card"><div class="eyebrow">Timeline</div><p class="muted">The big moments of every season collect here as you play.</p></section>`;
  const s = yrs.includes(+ui.tlS) ? +ui.tlS : yrs[0]; const rows = t.filter(x => x.s === s);
  const wl = x => (x.wk === 0 ? 'Offseason' : x.lv === 'nfl' ? (x.wk <= 18 ? 'Week ' + x.wk : 'Playoffs') : (x.wk <= 13 ? 'Week ' + x.wk : 'Postseason'));
  return `<section class="card"><div class="head"><div><div class="eyebrow">Timeline</div><h2 class="h2">${s}</h2></div>${yrs.length > 1 ? selHTML('tls', s, yrs.map(y => [y, String(y)]), 'Season') : ''}</div>
   <ol class="timeline">${rows.map(x => `<li class="${x.k}"><span class="when">${wl(x)}</span><span>${esc(x.txt)}</span></li>`).join('')}</ol></section>`;
}
function goalsCardHTML() {
  const m = mileRec(); return `<section class="card"><div class="eyebrow">Long-term goals</div><p class="hint">These follow you through every job, in college and the NFL.</p><div class="goalsgrid">${MILES.map(x => { const [a, b] = x.p(m); const done = m.done[x.id]; return `<div class="lgoal${done ? ' done' : ''}"><div><b>${esc(x.n)}</b>${done ? ` <span class="pill good">${done}</span>` : ''}</div><div class="small muted">${esc(x.d)}</div><div class="bar"><i class="${done ? 'good' : ''}" style="width:${Math.round(Math.min(1, a / b) * 100)}%"></i></div><div class="small">${Math.min(a, b)} of ${b}</div></div>`; }).join('')}</div></section>`;
}
function hofCardHTML() {
  const h = state.hof || []; const ret = state.retNums || []; const canRet = !isCoach();
  return `<section class="card"><div class="head"><div><div class="eyebrow">Hall of Fame</div><h2 class="h2">${h.length ? h.length + ' inductee' + (h.length === 1 ? '' : 's') : 'No inductees yet'}</h2></div><p class="hint">Players go in when they leave after a great career: major awards, All-America honors, seasons as one of the best in the country.${canRet ? ' You can retire an inductee\'s number.' : ''}</p></div>
   ${h.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Years</th><th>Why</th><th></th></tr></thead><tbody>${h.slice().reverse().map(x => `<tr><td><b>${esc(x.n)}</b>${x.num != null ? ` <span class="muted">#${x.num}</span>` : ''}</td><td>${x.pos}</td><td class="nowrap">${x.from}–${x.to}</td><td class="small">${esc(x.why.join('; '))}</td><td>${ret.some(r => r.num === x.num) ? '<span class="pill maize">Number retired</span>' : canRet && x.num != null ? `<button class="btn ghost sm" data-act="retnum" data-id="${x.pid}">Retire No. ${x.num}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
   ${ret.length ? `<p class="small mt"><b>Retired numbers:</b> ${ret.map(r => `No. ${r.num} (${esc(r.n)})`).join(' · ')}</p>` : ''}</section>`;
}
// head-to-head summary: current streak, longest winning streak, biggest win and closest game
function h2hStats(log) {
  if (!log.length) return null; let cur = 0, curW = null, best = 0, run = 0;
  log.forEach(x => { if (x.win) { run++; best = Math.max(best, run); } else run = 0; });
  for (let i = log.length - 1; i >= 0; i--) { if (curW == null) curW = log[i].win; if (log[i].win !== curW) break; cur++; }
  const big = log.filter(x => x.win).sort((a, b) => (b.ms - b.os) - (a.ms - a.os))[0]; const close = log.slice().sort((a, b) => Math.abs(a.ms - a.os) - Math.abs(b.ms - b.os))[0];
  return { cur, curW, best, big, close, w: log.filter(x => x.win).length, l: log.filter(x => !x.win).length };
}
function h2hLine(st) { if (!st) return ''; return `<p class="small">${st.curW ? 'Won' : 'Lost'} the last ${st.cur}${st.best >= 2 ? ` · longest winning streak ${st.best}` : ''}${st.big ? ` · biggest win ${st.big.ms}-${st.big.os} (${st.big.s})` : ''}${st.close ? ` · closest ${st.close.ms}-${st.close.os} (${st.close.s})` : ''}</p>`; }
// compare two players side by side
function cmpPlayer(id) { const p = P(id); if (p) return Object.assign({ mine: true }, p); return typeof proFindAny === 'function' && isPro() ? proFindAny(id) : null; }
function compareHTML(a, b) {
  const keys = [...new Set(Object.keys(a.tr || {}).concat(Object.keys(b.tr || {})))];
  const row = (lbl, f, num) => { const x = f(a), y = f(b); const nx = typeof x === 'number', ny = typeof y === 'number'; return `<tr><td>${lbl}</td><td class="num${num && nx && ny && x > y ? ' best' : ''}">${x == null ? '—' : esc(String(x))}</td><td class="num${num && nx && ny && y > x ? ' best' : ''}">${y == null ? '—' : esc(String(y))}</td></tr>`; };
  const ct = p => (isPro() && p.k && p.k.yrs > 0 ? `${fmM(capHit(p))} · ${p.k.yrs} yr${p.k.yrs > 1 ? 's' : ''}` : isPro() ? 'No contract' : p.pay != null ? fm2(p.pay) : null);
  return `<div class="eyebrow">Compare players</div><h2 class="h2">${esc(a.n)} vs. ${esc(b.n)}</h2><div class="tw"><table class="tbl cmpt"><thead><tr><th></th><th>${esc(lastName(a.n))}</th><th>${esc(lastName(b.n))}</th></tr></thead><tbody>
   ${row('Position', p => p.pos)}${row(isPro() ? 'Age' : 'Year', p => (isPro() ? p.age : clsLabel(p)))}${row('Overall', p => p.ovr, true)}${row('Potential', p => p.pot, true)}
   ${keys.map(k => row(TRAIT_NAME[k], p => (p.tr && p.tr[k] != null ? p.tr[k] : null), true)).join('')}
   ${row('Scheme fit', p => fitLabel(playerFit(p)) || null)}${row('Rapport with you', p => (p.mine ? Math.round(rapOf(p)) : null), true)}${row(isPro() ? 'Contract' : 'Pay', ct)}${row('This season', p => (p.st ? statLine(p) || null : null))}
   </tbody></table></div><div class="row gap mt"><button class="btn ghost" data-act="cmpclear">Done</button></div>`;
}
// a one-page summary of your career, to keep or share
function careerSummary() {
  const nfl = isPro(); const L = nfl ? PS() : null; const hist = nfl ? L.hist.map(h => ({ s: h.s, tm: teamName(h.tm), rec: h.w + '-' + h.l, note: PO_LABEL[h.po] })) : state.history.map(h => ({ s: h.season, tm: myName(), rec: h.w + '-' + h.l, note: h.champ === ME ? 'National champions' : h.bowl || (h.rank ? 'Finished No. ' + h.rank : '') }));
  const who = isCoach() ? `${state.co.name}, ${roleTitle(state.co.role)}` : nfl ? 'General manager' : 'Athletic director';
  const m = mileRec(); const got = MILES.filter(x => m.done[x.id]).map(x => x.n);
  const hof = (state.hof || []).map(x => x.n); const ring = nfl ? (L.ring || []).map(x => x.n) : [];
  const w = hist.reduce((s, h) => s + (+h.rec.split('-')[0] || 0), 0), l = hist.reduce((s, h) => s + (+h.rec.split('-')[1] || 0), 0);
  return { who, team: myName(), nfl, hist, w, l, got, hof, ring, legacy: !nfl && !isCoach() && typeof legacyScore === 'function' ? legacyScore() : null };
}
function summaryHTML(x, full) {
  const body = `<div class="eyebrow">Football Empire · career summary</div><h2 class="h2">${esc(x.who)}</h2><p class="muted">${esc(x.team)} · ${x.hist.length} season${x.hist.length === 1 ? '' : 's'} · ${x.w}-${x.l}${x.legacy != null ? ' · Legacy score ' + x.legacy : ''}</p>
   <table class="tbl"><thead><tr><th>Season</th><th>Team</th><th>Record</th><th></th></tr></thead><tbody>${x.hist.slice().reverse().map(h => `<tr><td>${h.s}</td><td>${esc(h.tm)}</td><td>${h.rec}</td><td>${esc(h.note || '')}</td></tr>`).join('') || '<tr><td colspan="4">No seasons finished yet.</td></tr>'}</tbody></table>
   ${x.got.length ? `<p><b>Long-term goals reached:</b> ${x.got.map(esc).join(', ')}</p>` : ''}${x.hof.length ? `<p><b>Hall of Famers you had:</b> ${x.hof.map(esc).join(', ')}</p>` : ''}${x.ring.length ? `<p><b>Ring of Honor:</b> ${x.ring.map(esc).join(', ')}</p>` : ''}`;
  if (!full) return body;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(x.who)} · Football Empire</title><style>:root{color-scheme:light dark;--bg:#f6f4ee;--fg:#16202c;--mut:#5b6672;--line:#d8d3c6;--acc:#00274c}@media (prefers-color-scheme:dark){:root{--bg:#10161e;--fg:#e8ecf1;--mut:#9aa6b2;--line:#2a3542;--acc:#ffcb05}}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{max-width:760px;margin:0 auto;padding:32px 16px}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}.h2{font-size:30px;margin:4px 0;color:var(--acc)}.muted{color:var(--mut)}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}</style></head><body><main>${body}<p class="muted">Made with Football Empire.</p></main></body></html>`;
}
function summaryText(x) { return [`${x.who} · ${x.team}`, `${x.hist.length} seasons, ${x.w}-${x.l}`].concat(x.hist.slice(-10).map(h => `${h.s}: ${h.tm} ${h.rec}${h.note ? ' (' + h.note + ')' : ''}`)).concat(x.got.length ? ['Goals: ' + x.got.join(', ')] : []).join('\n'); }

// season pickers on the History tab
document.addEventListener('change', e => { const t = e.target; if (!t || !t.dataset || !['hls', 'tls'].includes(t.dataset.chg) || typeof state === 'undefined' || !state) return; ui[t.dataset.chg === 'hls' ? 'hlS' : 'tlS'] = +t.value; render(); const el = document.querySelector(`[data-chg="${t.dataset.chg}"]`); if (el) el.focus({ preventScroll: true }); });

