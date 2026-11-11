/* ===================== FIELD VIEW: the play on the field (live games, Player Career games, highlights) ===================== */
// An optional top-down field. Twenty-two players with jersey numbers line up against each other, the ball is snapped
// and the play runs. Every play is choreographed as a small motion simulation (30 steps a second of football):
// players have their own top speeds and acceleration, linemen lock up in blocks, receivers run real routes, defenders
// cover, read and take pursuit angles, nobody runs through anybody, and the ball carrier is brought down exactly where
// the game engine said the play ended. It only draws what the engine already decided (the drive log and the plays you
// call), uses hash() for every choice it makes and never R(), so turning it on or off can't change a result.

const PF_O = ['LT', 'LG', 'C', 'RG', 'RT', 'TE', 'WR1', 'WR2', 'WR3', 'RB', 'QB'];
const PF_D = ['DE1', 'DT1', 'DT2', 'DE2', 'LB1', 'LB2', 'LB3', 'CB1', 'CB2', 'S1', 'S2'];
const PF_ALL = PF_O.map(k => 'O' + k).concat(PF_D.map(k => 'D' + k));
const PF_MID = 28.65, PF_H = 57.3; // the field is 53.3 yards wide; 2 yards of sideline on each side
const PF_FPS = 30, PF_DT = 1 / PF_FPS, PF_R = 1.05; // simulation steps per second; a player's dot radius in yards
const PF_PB = 0.45; // one second of football takes a little under half a second on screen at normal speed
// top speeds in yards per second, and how quickly each kind of player gets there
const PF_VMAX = { QB: 7.3, RB: 8.7, WR1: 9.3, WR2: 9.3, WR3: 9.1, TE: 8.2, LT: 6.2, LG: 6.0, C: 6.0, RG: 6.0, RT: 6.2, DE1: 7.8, DE2: 7.8, DT1: 6.8, DT2: 6.8, LB1: 8.4, LB2: 8.2, LB3: 8.4, CB1: 9.3, CB2: 9.3, S1: 9.0, S2: 9.0 };
const pfAcc = r => (/^(LT|LG|C|RG|RT|DT)/.test(r) ? 6.5 : /^(DE|TE|QB)/.test(r) ? 8.5 : 10.5);
// offensive formations: a = yards downfield from the line of scrimmage (offense behind it is negative), b = across the field
const PF_OL = { LT: [-0.7, -4.5], LG: [-0.7, -2.25], C: [-0.7, 0], RG: [-0.7, 2.25], RT: [-0.7, 4.5] };
const PF_FORM = {
  gun: { QB: [-5, 0], RB: [-5, 2.3], WR1: [-0.7, -19.5], WR2: [-1.3, 19], WR3: [-1.3, -11.5], TE: [-0.8, 6.9] },
  trips: { QB: [-5, 0], RB: [-5, -2.3], WR1: [-0.7, -19.5], WR2: [-1.3, 20.5], WR3: [-1.3, 14], TE: [-0.8, 6.9] },
  empty: { QB: [-5, 0], RB: [-1.3, -12.5], WR1: [-0.7, -20], WR2: [-1.3, 20], WR3: [-1.3, 13.5], TE: [-0.8, 6.9] },
  pistol: { QB: [-4, 0], RB: [-7, 0], WR1: [-0.7, -19], WR2: [-1.3, 18.5], WR3: [-1.3, -11], TE: [-0.8, 6.9] },
  uc: { QB: [-1.4, 0], RB: [-7, 0], WR1: [-0.7, -19], WR2: [-1.3, 18], WR3: [-1.3, -10.5], TE: [-0.8, 6.9] },
  wing: { QB: [-1.4, 0], RB: [-7, 0], WR1: [-0.7, -18], WR2: [-1.3, 17], WR3: [-1.7, -8.4], TE: [-0.8, 6.9] },
};

const pf = { el: null, svg: null, q: [], cur: null, raf: 0, until: 0, cam: [60, PF_MID, 44, 60], pos: {}, cpos: {}, hd: {}, sim: null, ds: null, seen: 0, lastLog: 0, next: [25, 25], team: null, W: 120 };
function fieldOn() { return prefs.field !== 'off'; }
const pfSpeed = () => (pf.spdF ? pf.spdF() : [1, 0.55, 0.3][(live.speed || 1) - 1] || 1);
const pfLerp = (a, b, k) => a + (b - a) * k;
const pfEase = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const pfSmooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const pvSub = (p, q) => [p[0] - q[0], p[1] - q[1]], pvAdd = (p, q) => [p[0] + q[0], p[1] + q[1]], pvMul = (p, s) => [p[0] * s, p[1] * s];
const pvLen = p => Math.hypot(p[0], p[1]), pvDist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const pvNorm = p => { const l = Math.hypot(p[0], p[1]); return l > 1e-6 ? [p[0] / l, p[1] / l] : [0, 0]; };
const pvLerp = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];

/* ---------- colors and numbers ---------- */
function pfLum(hex) { const h = String(hex || '#777').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6), 16) || 0; return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }
function pfDist(a, b) { const p = x => { const n = parseInt(String(x || '#777').replace('#', '').slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }; const A = p(a), B = p(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
function pfColors(id) {
  if (id === ME && !(typeof isComm === 'function' && isComm())) { const c = schoolColors(); if (c && c.c1) return [c.c1, c.c2 || '#ffffff']; if (!isPro()) return ['#00274C', '#FFCB05']; }
  if (isPro() && NFL_BY[id]) return [NFL_BY[id].c1, NFL_BY[id].c2];
  const ti = TEAM_INFO[id]; return ti ? [ti.c1, ti.c2] : ['#5b6470', '#e8e8e8'];
}
// jersey numbers by role: your starters from the depth chart, the other team's from its roster when there is one
function pfNums(id, plain) {
  const used = new Set(); const h = (k, lo, hi) => { let n = lo + Math.floor(hash(id + ':pfn:' + k) * (hi - lo + 1)); let g = 0; while (used.has(n) && g++ < 100) n = n >= hi ? lo : n + 1; used.add(n); return n; };
  let get = null;
  if (plain) get = null;
  else if (id === ME && state.depth) get = (pos, n) => starters(pos, n);
  else if (isPro() && typeof proRoster === 'function') { const ros = proRoster(id) || []; get = (pos, n) => ros.filter(p => p.pos === pos && !p.inj).sort((a, b) => b.ovr - a.ovr).slice(0, n); }
  const take = (pos, n) => { try { return get ? get(pos, n).map(p => (p && p.num != null ? p.num : null)) : []; } catch (e) { return []; } };
  const ol = take('OL', 5), wr = take('WR', 3), de = take('DE', 2), dt = take('DT', 2), lb = take('LB', 3), cb = take('CB', 2), s = take('S', 2);
  const raw = { LT: ol[0], LG: ol[1], C: ol[2], RG: ol[3], RT: ol[4], TE: take('TE', 1)[0], WR1: wr[0], WR2: wr[1], WR3: wr[2], RB: take('RB', 1)[0], QB: take('QB', 1)[0], DE1: de[0], DT1: dt[0], DT2: dt[1], DE2: de[1], LB1: lb[0], LB2: lb[1], LB3: lb[2], CB1: cb[0], CB2: cb[1], S1: s[0], S2: s[1], K: take('K', 1)[0], P: take('P', 1)[0] };
  Object.values(raw).forEach(n => { if (n != null) used.add(n); });
  const R_ = { LT: [60, 79], LG: [60, 79], C: [50, 69], RG: [60, 79], RT: [60, 79], TE: [80, 89], WR1: [1, 19], WR2: [80, 89], WR3: [10, 19], RB: [20, 39], QB: [1, 19], DE1: [90, 99], DT1: [90, 99], DT2: [50, 79], DE2: [90, 99], LB1: [40, 59], LB2: [40, 59], LB3: [40, 59], CB1: [20, 39], CB2: [20, 39], S1: [20, 49], S2: [20, 49], K: [1, 19], P: [1, 19] };
  const out = {}; Object.keys(R_).forEach(k => { out[k] = raw[k] != null ? raw[k] : h(k, R_[k][0], R_[k][1]); }); return out;
}

/* ---------- the field ---------- */
function pfBuild(nfl) {
  const el = document.createElement('div'); el.className = 'pfield';
  const hashY = nfl ? 23.58 : 20; let ticks = '', lines = '', nums = '', stripes = '';
  for (let x = 10; x <= 110; x += 10) stripes += x < 110 ? `<rect x="${x}" y="2" width="5" height="53.3" class="pfstripe"/>` : '';
  for (let x = 10; x <= 110; x += 5) lines += `M${x} 2V55.3`;
  for (let x = 11; x < 110; x++) if (x % 5) ticks += `M${x} 2.2v0.7M${x} 54.4v0.7M${x} ${2 + hashY}v0.7M${x} ${55.3 - hashY - 0.7}v0.7`;
  for (let x = 20; x <= 100; x += 10) { const v = x <= 60 ? x - 10 : 110 - x; nums += `<text x="${x}" y="${2 + 9}" class="pfnum">${v}</text><text x="${x}" y="${55.3 - 9}" class="pfnum" transform="rotate(180 ${x} ${55.3 - 9})">${v}</text>`; }
  const dot = (k, side) => `<g class="pfd ${side}" data-k="${k}"><circle r="${PF_R}"/><path class="pfnose" d="M${(PF_R + 0.42).toFixed(2)} 0L${(PF_R - 0.12).toFixed(2)} -0.5L${(PF_R - 0.12).toFixed(2)} 0.5Z"/><text dy="0.04">00</text></g>`;
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 ${PF_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="pfworld">
    <rect x="-40" y="-8" width="200" height="${PF_H + 16}" class="pfgrass"/>${stripes}
    <rect x="0" y="2" width="10" height="53.3" class="pfez l"/><rect x="110" y="2" width="10" height="53.3" class="pfez r"/>
    <text class="pfezt l" transform="translate(5 ${PF_MID}) rotate(-90)"></text><text class="pfezt r" transform="translate(115 ${PF_MID}) rotate(90)"></text>
    <path d="${lines}" class="pfline"/><path d="${ticks}" class="pftick"/><path d="M0 2V55.3M120 2V55.3M0 2H120M0 55.3H120" class="pfbound"/>${nums}
    <path d="M0 ${PF_MID - 3.08}V${PF_MID + 3.08}M120 ${PF_MID - 3.08}V${PF_MID + 3.08}" class="pfpost"/>
    <line class="pflos" x1="0" x2="0" y1="2" y2="55.3"/><line class="pffd" x1="0" x2="0" y1="2" y2="55.3"/>
    <path class="pftrail run" d=""/><path class="pftrail air" d=""/><circle class="pfspot" r="0.9" cx="-10" cy="-10"/>
    <g class="pfdots">${PF_D.map(k => dot(k, 'def')).join('')}${PF_O.map(k => dot(k, 'off')).join('')}</g>
    <ellipse class="pfshadow" rx="0.55" ry="0.3"/><ellipse class="pfball" rx="0.6" ry="0.38"/><g class="pfflag" style="opacity:0"><path d="M-0.55 -0.35L0.55 -0.5L0.6 0.35L-0.5 0.5Z"/></g></g>
    <text class="pflbl" y="11"></text></svg><div class="pfwx" aria-hidden="true"></div><div class="pfwind" hidden></div><div class="pfctl"><button data-pf="prev" aria-label="Previous play" title="Previous play">⏮</button><button data-pf="again" aria-label="Watch that play again" title="Watch again">↺</button><button data-pf="pause" aria-label="Pause the field" title="Pause">❚❚</button><button data-pf="slow" aria-label="Slow motion" title="Slow motion">½×</button><button data-pf="cam" aria-label="Camera" title="Camera">TV</button></div><div class="pfcap"></div><div class="pfcall" aria-live="off"></div><div class="pftip" hidden></div><div class="pfref" hidden aria-hidden="true"><svg viewBox="0 0 40 48" class="pfrefi"></svg><span></span></div><div class="pfcrowd" aria-hidden="true" title="Crowd noise"><b><i></i></b><span>Crowd</span></div>`;
  pf.el = el; pf.svg = el.querySelector('svg'); pf.dots = {}; el.querySelectorAll('.pfd').forEach(g => { pf.dots[(g.classList.contains('off') ? 'O' : 'D') + g.dataset.k] = g; });
  pf.ball = el.querySelector('.pfball'); pf.shadow = el.querySelector('.pfshadow'); pf.lbl = el.querySelector('.pflbl'); pf.cap = el.querySelector('.pfcap'); pf.call = el.querySelector('.pfcall'); pf.tip = el.querySelector('.pftip');
  pf.trR = el.querySelector('.pftrail.run'); pf.trA = el.querySelector('.pftrail.air'); pf.spot = el.querySelector('.pfspot');
  pf.flag = el.querySelector('.pfflag'); pf.ref = el.querySelector('.pfref'); pf.crowdEl = el.querySelector('.pfcrowd'); pf.crowdBase = null;
  el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pf]'); if (b) { e.stopPropagation(); e.preventDefault(); pfCtl(b.dataset.pf); return; } pfTapDot(e); });
  pf.world = el.querySelector('.pfworld'); pf.ctl = el.querySelector('.pfctl'); pf.hist = []; pf.paused = false; pf.slow = false; pf.rot = 0; pfCtlLabels();
  pf.los = el.querySelector('.pflos'); pf.fd = el.querySelector('.pffd'); pf.hd = {};
  return el;
}
function pfReset(sim) {
  pfClear(); pf.sim = sim; pf.cg = null; pf.me = null; pf.spdF = null; pf.ds = null; pf.seen = 0; pf.lastLog = 0; pf.next = [25, 25]; pf.pos = {}; pf.team = null; pf.lastDir = null; pf.camSet = false; pf.koDone = false; pf.koHalf = false; pf.hd = {};
  pfBuild(isPro()); pf.nums = [pfNums(sim.ids[0]), pfNums(sim.ids[1])]; pf.col = pfContrast([pfColors(sim.ids[0]), pfColors(sim.ids[1])]);
  pf.ab = sim.ids.map(id => (id === ME && !(typeof isComm === 'function' && isComm()) ? myAb() : isFCS(id) ? 'FCS' : id));
  { const B = state && state.x && state.x.biz; const g = sim.g; if (B && B.uni && g && B.alt && B.alt[g.id]) { const mi = sim.ids.indexOf(ME); if (mi >= 0) pf.col[mi] = [B.uni.c1, B.uni.c2]; } pfWeather(g && typeof forecast === 'function' ? forecast(g) : null, g ? (g.night != null ? g.night : hash(String(g.id) + ':night') < 0.33) : false); } /* your alternate uniforms, the weather and the lights */ pf.names = [pfNamesFor(sim.ids[0]), pfNamesFor(sim.ids[1])]; pf.replay = false;
  // before the opening kickoff: the receiving team in a standard look at its 25
  const s = sim.first; pf.snap = true; pfStage({ o: s, dir: pfDir(s, 1), los: 25, fd: 35, kind: 'set' }); pfDraw(pf.stage, 0, 0, 1);
}
// two dark blues: the road team wears its other color, or white
function pfContrast(col) { if (pfDist(col[0][0], col[1][0]) < 110) col[1] = pfDist(col[1][1], col[0][0]) > 110 ? [col[1][1], col[1][0]] : ['#f2f2f2', col[1][0]]; return col; }
function pfClear() { pf.q = []; pf.cur = null; pf.until = 0; if (pf.raf) cancelAnimationFrame(pf.raf); pf.raf = 0; }
function pfLeft() { return pf.cur || pf.q.length ? Math.max(0, pf.until - performance.now()) : 0; }
// side 0 (home) attacks to the right in the first half; the teams switch ends at halftime
const pfDir = (s, qtr) => (s === 0 ? 1 : -1) * (qtr >= 3 ? -1 : 1);
// where a field yard line (from the offense's goal line) sits in the picture
const pfX = (P, a) => (P.dir > 0 ? 10 + P.los : 110 - P.los) + P.dir * a;

/* ---------- paths: smooth, timed routes for the players whose movement the play decides ---------- */
// knots [[t, a, b, flag]]: a Hermite curve through them in time. Players start from rest; flag 'm' keeps a knot moving
// (the end of a path that hands over to the player's own reactions), 's' makes a planted stop (a cut or a catch).
function pfPath(kn) {
  const n = kn.length; const slope = (A, B) => { const d = B[0] - A[0] || 1e-6; return [(B[1] - A[1]) / d, (B[2] - A[2]) / d]; };
  const tan = kn.map((k, i) => { if (n === 1) return [0, 0]; if (i === 0) return k[3] === 'm' ? slope(k, kn[1]) : [0, 0]; if (i === n - 1) return k[3] === 'm' ? slope(kn[i - 1], k) : [0, 0]; if (k[3] === 's') return [0, 0]; return slope(kn[i - 1], kn[i + 1]); });
  return { kn, t0: kn[0][0], t1: kn[n - 1][0], end: [kn[n - 1][1], kn[n - 1][2]], vEnd: tan[n - 1], at(t) {
    if (t <= kn[0][0]) return [kn[0][1], kn[0][2]];
    for (let i = 0; i < n - 1; i++) { const A = kn[i], B = kn[i + 1]; if (t <= B[0]) { const hh = B[0] - A[0] || 1e-6, s = (t - A[0]) / hh, s2 = s * s, s3 = s2 * s; const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2; const m0 = tan[i], m1 = tan[i + 1]; return [h00 * A[1] + h10 * hh * m0[0] + h01 * B[1] + h11 * hh * m1[0], h00 * A[2] + h10 * hh * m0[1] + h01 * B[2] + h11 * hh * m1[1]]; } }
    return [kn[n - 1][1], kn[n - 1][2]];
  } };
}
// knots from a start point and legs [{ to, v (yards a second), f (flag), dt (fixed time) }]; the first leg starts from rest
function pfLegs(t0, from, legs) { const kn = [[t0, from[0], from[1]]]; let t = t0, p = from; legs.forEach((L, i) => { const d = pvDist(p, L.to); const v = Math.max(0.6, L.v * (i === 0 && !L.go ? 0.6 : 1)); t += L.dt != null ? L.dt : Math.max(0.1, d / v); kn.push([t, L.to[0], L.to[1], L.f || '']); p = L.to; }); return kn; }
const pfLegsEnd = kn => kn[kn.length - 1][0];

/* ---------- the motion simulation ---------- */
// a tackler's (or pass rusher's) target: d yards from the ball carrier, on the side he comes from
const pfHit = (ck, d) => (S, t, pl) => { const c = S.pl[ck].p; let u = pvNorm(pvSub(pl.p, c)); if (!u[0] && !u[1]) u = [1, 0]; return pvAdd(c, pvMul(u, d)); };
// a timed path cut short at tc, still moving, so the player's own reactions take over from there
function pfCut(kn, tc) { if (pfLegsEnd(kn) <= tc) return kn; const p = pfPath(kn); const out = kn.filter(k => k[0] < tc - 0.05); const e = p.at(tc); out.push([tc, e[0], e[1], 'm']); return out; }
// plan: { T, form, path: {key: [paths]}, brain: {key: fn(S, pl, t) -> wanted velocity}, pairs: [blocks], ball: [steps], lbl, down, car, cam }
function pfSimulate(plan, mags) {
  const N = Math.max(2, Math.ceil(plan.T / PF_DT) + 1); const S = { t: 0, f: 0, pl: {}, plan, N };
  const rec = {}; PF_ALL.forEach(k => { const p0 = plan.form[k] || [0, 0]; S.pl[k] = { k, o: k[0] === 'O', role: k.slice(1), p: p0.slice(), v: [0, 0], vmax: (PF_VMAX[k.slice(1)] || 7.5) * (1 - (pf.tired || 0) * (k[0] === 'D' ? 0.1 : 0.04)), acc: pfAcc(k.slice(1)), lock: false, mw: 0 }; rec[k] = new Float32Array(N * 2); });
  const pairs = (plan.pairs || []).map(x => Object.assign({ on: false, done: false, gap: 1.95, amp: 0.22 }, x));
  const ms = (mags || []).filter(m => S.pl[m.k]);
  for (let f = 0; f < N; f++) {
    const t = f * PF_DT; S.t = t; S.f = f;
    // 1. scripted players (the ball carrier, the quarterback's drop, the targeted receiver...)
    PF_ALL.forEach(k => { const pl = S.pl[k]; pl.scripted = false; pl.frz = !!(plan.down && plan.down[k] != null && t >= plan.down[k]); const ps = plan.path[k]; if (!ps) return; for (const seg of ps) { if (t >= seg.t0 - 1e-6 && t <= seg.t1 + 1e-6) { const np = seg.at(t); pl.v = f ? pvMul(pvSub(np, pl.p), 1 / PF_DT) : [0, 0]; pl.p = np; pl.scripted = true; break; } } });
    // 2. everyone else reacts: their wanted velocity, limited by top speed and acceleration
    PF_ALL.forEach(k => { const pl = S.pl[k]; if (pl.scripted || pl.lock) return; if (pl.frz) { pl.v = [0, 0]; return; } const br = plan.brain[k]; let want = br ? br(S, pl, t) : [0, 0]; const sp = pvLen(want); if (sp > pl.vmax) want = pvMul(want, pl.vmax / sp);
      let dv = pvSub(want, pl.v); const dl = pvLen(dv); const cap = pl.acc * PF_DT * (pvLen(want) < pvLen(pl.v) ? 1.6 : 1); if (dl > cap) dv = pvMul(dv, cap / dl); pl.v = pvAdd(pl.v, dv); pl.p = pvAdd(pl.p, pvMul(pl.v, PF_DT)); });
    // 3. blocks: once a blocker and his man meet, they move together until the block ends
    pairs.forEach(e => {
      const O = S.pl[e.o], D = S.pl[e.d]; if (!O || !D || e.done) return;
      if (t >= e.t1 || O.scripted || D.scripted) { if (e.on) { O.lock = D.lock = false; const sh = pvNorm(pvSub(D.p, O.p)); D.v = pvAdd(D.v, pvMul([sh[1], -sh[0]], e.side || 1.5)); } e.on = false; if (t >= e.t1) e.done = true; return; }
      if (t < e.t0) return;
      if (!e.on) { if (pvDist(O.p, D.p) <= e.gap + 0.35) { e.on = true; e.c = pvLerp(O.p, D.p, 0.5); e.u = pvNorm(pvSub(D.p, O.p)); if (!e.u[0] && !e.u[1]) e.u = [1, 0]; e.ph = hash(e.o + e.d + (plan.key || '')) * 6.28; O.lock = D.lock = true; } else return; }
      const pv = e.push ? e.push(S, t, e) : [0, 0]; e.c = pvAdd(e.c, pvMul(pv, PF_DT)); const perp = [-e.u[1], e.u[0]]; const w = Math.sin(t * 5.2 + e.ph) * e.amp;
      const want = e.face ? pvNorm(e.face(S, t)) : e.u; e.u = pvNorm(pvLerp(e.u, want, 0.04));
      O.p = pvAdd(pvAdd(e.c, pvMul(e.u, -e.gap / 2)), pvMul(perp, w)); D.p = pvAdd(pvAdd(e.c, pvMul(e.u, e.gap / 2)), pvMul(perp, w)); O.v = D.v = pv;
    });
    // 4. the play's key contacts: tacklers, interceptions and breakups arrive exactly when and where they happen
    PF_ALL.forEach(k => { S.pl[k].mw = 0; });
    ms.forEach(m => { if (t < m.t0) return; const pl = S.pl[m.k]; if ((m.t2 != null && t > m.t2) || (pl.frz && !pl.scripted)) return; const w = m.t1 > m.t0 ? pfSmooth((t - m.t0) / (m.t1 - m.t0)) : 1; const tg = m.at(S, t, pl); const np = pvLerp(pl.p, tg, Math.max(w, pl.mw)); pl.v = pvMul(pvSub(np, pl.p), 1 / PF_DT * 0.5); pl.p = np; pl.mw = Math.max(pl.mw, w); if (pl.lock) { pl.lock = false; pairs.forEach(e => { if (e.on && (e.o === m.k || e.d === m.k)) { e.on = false; e.done = true; S.pl[e.o].lock = S.pl[e.d].lock = false; } }); } });
    // 5. nobody runs through anybody: overlapping players ease apart (the scripted and the tacklers hold their line)
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < PF_ALL.length; i++) { const A = S.pl[PF_ALL[i]]; for (let j = i + 1; j < PF_ALL.length; j++) { const Bp = S.pl[PF_ALL[j]];
        const dx = Bp.p[0] - A.p[0], dy = Bp.p[1] - A.p[1]; const d2 = dx * dx + dy * dy; const minD = A.o === Bp.o ? 1.9 : 1.75; if (d2 >= minD * minD || d2 < 1e-8) continue;
        const both = A.mw > 0.3 && Bp.mw > 0.3; const fa = A.scripted || A.lock || A.frz || (A.mw > 0.3 && !both) ? 0 : 1, fb = Bp.scripted || Bp.lock || Bp.frz || (Bp.mw > 0.3 && !both) ? 0 : 1; if (!fa && !fb) continue;
        const d = Math.sqrt(d2); const push = (minD - d) / (fa + fb); const nx = dx / d, ny = dy / d; if (fa) { A.p[0] -= nx * push; A.p[1] -= ny * push; } if (fb) { Bp.p[0] += nx * push; Bp.p[1] += ny * push; } } }
    }
    // 6. stay on the field (a step out of bounds is fine)
    PF_ALL.forEach(k => { const pl = S.pl[k]; if (pl.scripted) return; pl.p[1] = clamp(pl.p[1], -27.4, 27.4); pl.p[0] = clamp(pl.p[0], plan.minA, plan.maxA); rec[k][2 * f] = pl.p[0]; rec[k][2 * f + 1] = pl.p[1]; });
    PF_ALL.forEach(k => { const pl = S.pl[k]; if (pl.scripted) { rec[k][2 * f] = pl.p[0]; rec[k][2 * f + 1] = pl.p[1]; } });
  }
  return { N, rec };
}
// where the ball is at frame f: held (in front of the holder), in flight (an arc), or on the ground
function pfBallTrack(plan, rec, N) {
  const out = new Float32Array(N * 3); const air = new Uint8Array(N); const steps = plan.ball.slice().sort((a, b) => a.t - b.t);
  const posAt = (k, f) => [rec[k][2 * clamp(f, 0, N - 1)], rec[k][2 * clamp(f, 0, N - 1) + 1]];
  const heldAt = (k, f) => { const p = posAt(k, f), q = posAt(k, f - 3); let d = pvSub(p, q); d = pvLen(d) > 0.15 ? pvNorm(d) : [plan.holdDir ? plan.holdDir(k) : 1, 0]; return [p[0] + d[0] * 0.85, p[1] + d[1] * 0.85]; };
  for (let f = 0; f < N; f++) {
    const t = f * PF_DT; let st = null; for (const s of steps) if (s.t <= t + 1e-6) st = s; let p = [0, 0], z = 0;
    if (!st) p = [0, 0];
    else if (st.hold) p = heldAt(st.hold, f);
    else if (st.spot) p = st.spot.slice();
    else if (st.fly) { const fl = st.fly; const f0 = Math.round(st.t / PF_DT), f1 = Math.round(fl.t1 / PF_DT); const from = fl.from ? (typeof fl.from === 'string' ? heldAt(fl.from, f0) : fl.from) : [0, 0]; const to = typeof fl.to === 'string' ? heldAt(fl.to, f1) : fl.to; const k = fl.t1 > st.t ? clamp((t - st.t) / (fl.t1 - st.t), 0, 1) : 1; p = pvLerp(from, to, k); z = (fl.z || 0) * 4 * k * (1 - k) + (fl.z1 || 0) * k; if (k < 1 && (fl.z || 0) > 0.3) air[f] = 1; }
    out[3 * f] = p[0]; out[3 * f + 1] = p[1]; out[3 * f + 2] = z;
  }
  return { ball: out, air };
}
/* ---------- choreography: how each kind of play unfolds ---------- */
// P = { o: offense side, dir, los, fd, kind, call, y, n (ball carrier's or target's number), dist, good, ret, td, p6,
//       carrier, tg, tackler, rush, pk (Player Career: your role in the play), endYl (kickoffs: where the return ends), key }
function pfChoreo(P) {
  if (P.kind === 'two') { const toG = 100 - P.los; const pass = !!P.pass; const Q = Object.assign({}, P, { kind: P.good ? (pass ? 'pass' : 'run') : (pass ? 'inc' : 'run'), td: !!P.good, y: P.good ? toG : Math.max(0, toG - 1), tdLbl: 'Two points!' }); const sc = pfChoreo(Q); if (!P.good) { sc.lbls = (sc.lbls || []).filter(l => l[1] !== 'Incomplete' && l[1] !== 'Broken up!').concat([[sc.tEnd - 0.1, 'Two-point try no good', 'bad']]); sc.lbl = [1, 'Two-point try no good', 'bad']; } return sc; }
  const key = (P.key || 'x') + ':' + P.kind; const h = k => hash(key + ':' + k); const kind = P.kind;
  const toGoal = 100 - P.los; const minA = -P.los - 9.4, maxA = toGoal + 9.4;
  const CA = a => clamp(a, minA + 0.8, maxA - 0.8), CB = b => clamp(b, -25.8, 25.8);
  const plan = { key, form: {}, path: {}, brain: {}, pairs: [], ball: [], lbl: [], down: {}, car: [], minA, maxA, T: 3, roles: {}, ev: {}, endA: 0, tEnd: 2.5 };
  const F = plan.form; const pick = (arr, k) => arr[Math.floor(h(k) * arr.length) % arr.length];
  const wpick = (list, k) => { const r = h(k) * list.reduce((s, x) => s + x[1], 0); let a = 0; for (const x of list) { a += x[1]; if (r <= a) return x[0]; } return list[0][0]; };
  const roleOfNum = n => (n == null || !pf.nums || !pf.nums[P.o] ? null : PF_O.find(k => pf.nums[P.o][k] === n));
  const addPath = (k, kn) => { (plan.path[k] = plan.path[k] || []).push(pfPath(kn)); return plan.path[k][plan.path[k].length - 1]; };
  // ---- shared reactions ----
  const seek = (pl, tg, spd) => { const d = pvSub(tg, pl.p); const L = pvLen(d); if (L < 0.04) return [0, 0]; return pvMul(d, Math.min(spd, L * 2.4) / L); };
  const carAt = t => { let k = null; for (const c of plan.car) if (c[0] <= t + 1e-6) k = c[1]; return k; };
  const pursue = (S, pl, f, side) => { const ck = carAt(S.t); const tgt = ck ? S.pl[ck] : null; const aimPt = tgt ? tgt.p : plan.ballTo || [0, 0]; const v = tgt ? tgt.v : [0, 0]; const d = pvDist(pl.p, aimPt); const T_ = Math.min(1.4, d / pl.vmax * 0.8); let aim = pvAdd(aimPt, pvMul(v, T_)); if (side) aim = pvAdd(aim, [0, side]); return seek(pl, aim, pl.vmax * (f || 0.95)); };
  const settle = (S, pl) => { const ck = plan.endKey || carAt(S.t); if (!ck) return [0, 0]; const c = S.pl[ck].p; const d = pvDist(pl.p, c); if (d > 9) return pvMul(pl.v, 0.3); const ang = h('ring' + pl.k) * 6.283, rr = 2.4 + h('rr' + pl.k) * 1.6; return seek(pl, pvAdd(c, [Math.cos(ang) * rr, Math.sin(ang) * rr]), 2.4); };
  const wrap = (fn) => (S, pl, t) => (t > plan.tEnd ? settle(S, pl) : fn(S, pl, t));
  const stance = (ts, fn) => wrap((S, pl, t) => (t < ts ? [0, 0] : fn(S, pl, t)));
  // ---- formations ----
  const offForm = (name, m) => { const Fm = Object.assign({}, PF_OL, PF_FORM[name]); PF_O.forEach(r => { const p = Fm[r]; F['O' + r] = [CA(p[0]), p[1] * m]; }); };
  const cover = {}; let twoHigh = true;
  const alignD = () => {
    const tsd = Math.sign(F.OTE[1]) || 1; const lbA = Math.min(4.6, Math.max(1.6, toGoal + 0.4)), sA = Math.min(12.5, toGoal + 7.5), cA = x => Math.min(x, toGoal + 5.5);
    F.DDT1 = [1.15, -1.25 * tsd]; F.DDT2 = [1.15, 3.0 * tsd]; F.DDE1 = [1.25, -6.7 * tsd]; F.DDE2 = [1.25, (Math.abs(F.OTE[1]) + 1.5) * tsd];
    F.DLB2 = [lbA + 0.2, 0.7 * tsd]; F.DLB1 = [lbA - 0.1, -4.5 * tsd]; F.DLB3 = [lbA - 0.1, 4.5 * tsd];
    const rec = ['OWR1', 'OWR2', 'OWR3', 'ORB', 'OTE'].map(k => ({ k, b: F[k][1] }));
    const left = rec.filter(x => x.b < -8).sort((a, b) => a.b - b.b), right = rec.filter(x => x.b > 8).sort((a, b) => b.b - a.b);
    const press = h('press') < 0.35; const cbA = cA(press ? 1.4 : 6 + h('cush') * 1.6);
    if (left[0]) { F.DCB1 = [cbA, left[0].b + 0.8]; cover.DCB1 = left[0].k; } else F.DCB1 = [cA(7), -15];
    if (right[0]) { F.DCB2 = [cbA, right[0].b - 0.8]; cover.DCB2 = right[0].k; } else F.DCB2 = [cA(7), 15];
    const lbOn = b => (Math.sign(b) === -tsd ? 'DLB1' : 'DLB3');
    twoHigh = h('shell') < 0.55; F.DS1 = twoHigh ? [sA, -9.5 * tsd] : [Math.min(14.5, toGoal + 8), 0]; F.DS2 = twoHigh ? [sA, 9.5 * tsd] : [Math.min(7, toGoal + 4), 5.5 * tsd];
    const slots = left.slice(1).concat(right.slice(1));
    slots.forEach((s, i) => { if (i === 0) { const lb = lbOn(s.b); F[lb] = [Math.min(4, toGoal + 1), s.b * 0.62]; cover[lb] = s.k; } else { twoHigh = false; F.DS2 = [Math.min(6.5, toGoal + 3), s.b * 0.85]; cover.DS2 = s.k; F.DS1 = [Math.min(14.5, toGoal + 8), 0]; } });
    if (!Object.values(cover).includes('OTE')) { const lb = lbOn(F.OTE[1]); if (!cover[lb]) cover[lb] = 'OTE'; else if (!twoHigh && !cover.DS2) cover.DS2 = 'OTE'; }
    if (!Object.values(cover).includes('ORB')) cover.DLB2 = 'ORB';
  };
  // OL (and the TE) take the defensive linemen in front of them; whoever is left climbs to a linebacker
  const blockMap = (blockers, firsts, seconds) => { const asg = {}; const used = new Set(); firsts.forEach(dk => { let best = null, bd = 1e9; blockers.forEach(ok => { if (asg[ok]) return; const d = Math.abs(F[ok][1] - F[dk][1]); if (d < bd) { bd = d; best = ok; } }); if (best && bd < 5) { asg[best] = dk; used.add(dk); } });
    (seconds || []).length && blockers.forEach(ok => { if (asg[ok]) return; let best = null, bd = 1e9; seconds.forEach(dk => { if (used.has(dk)) return; const d = Math.abs(F[ok][1] - F[dk][1]); if (d < bd) { bd = d; best = dk; } }); if (best && bd < 7) { asg[ok] = best; used.add(best); } }); return asg; };
  const OLK = ['OLT', 'OLG', 'OC', 'ORG', 'ORT']; const DLK = ['DDE1', 'DDT1', 'DDT2', 'DDE2']; const LBK = ['DLB1', 'DLB2', 'DLB3'];
  const sg = h('s') < 0.5 ? -1 : 1; // the play side
  let ts = 0.42; // the snap
  const mags = []; // tacklers and other key contacts, chosen after a first look at the play
  const chooseNear = (rec, N, at, t, side, exclude, n) => { const f = clamp(Math.round(t / PF_DT), 0, N - 1); const pts = typeof at === 'function' ? at(f) : at; const keys = (side === 'D' ? PF_D.map(k => 'D' + k) : PF_O.map(k => 'O' + k)).filter(k => !(exclude || []).includes(k)); return keys.map(k => ({ k, d: pvDist([rec[k][2 * f], rec[k][2 * f + 1]], pts) })).sort((a, b) => a.d - b.d).slice(0, n || 2); };

  if (kind === 'set') {
    offForm(P.form || 'gun', 1); alignD(); plan.T = 0.1; plan.tEnd = 0.05; plan.ball = [{ t: 0, spot: [0, 0] }]; plan.camF = () => [0, 0, 42, 30];
    return pfFinish(P, plan, []);
  }

  /* ===== runs (and fumbles on runs) ===== */
  if (kind === 'run' || kind === 'fum') {
    const cr = P.carrier || (roleOfNum(P.n) === 'QB' ? 'QB' : 'RB'); const CK = 'O' + cr; const td = !!P.td;
    const sneak = cr === 'QB' && (P.y || 0) <= 2 && !td && toGoal > 1;
    const fn = sneak ? 'uc' : cr === 'QB' ? (h('qf') < 0.6 ? 'gun' : 'pistol') : wpick([['uc', 3], ['pistol', 2.5], ['gun', 2.5], ['wing', 1.5]], 'form');
    offForm(fn, h('m') < 0.5 ? 1 : -1); alignD();
    const outside = !sneak && (P.call === 'outside' || (P.call !== 'inside' && h('call') < 0.32));
    const y = td ? toGoal + 1.2 : clamp(P.y || 0, -12, toGoal); const uc = fn === 'uc' || fn === 'wing';
    // the mesh: quarterback and back meet, the ball changes hands
    const q0 = F.OQB, r0 = F.ORB; let th, M, qMesh;
    if (sneak) { th = ts + 0.05; M = q0; qMesh = q0; }
    else if (uc) { th = ts + 0.62; qMesh = [-2.9, sg * 1.0]; M = [-3.3, sg * 1.7]; }
    else if (fn === 'pistol') { th = ts + 0.72; qMesh = [-4.3, sg * 0.5]; M = [-4.5, sg * 1.6]; }
    else { th = ts + 0.75; qMesh = [-5.1, sg * 0.3]; M = [-4.7, sg * 1.5]; }
    const holeB = CB(sg * (sneak ? 0.4 + h('g') * 0.6 : outside ? 9 + h('g') * 2.4 : 1.0 + h('g') * 2.7)); const H = outside ? [1.3, holeB + sg * 1.4] : [sneak ? 0.2 : 0.5, holeB];
    const startC = cr === 'QB' ? qMesh : M; const legs = [];
    if (outside) legs.push({ to: [-1.2, holeB], v: 7.4, go: true }, { to: H, v: 7.9 }); else legs.push({ to: H, v: sneak ? 3.5 : 6.4, go: !sneak });
    const drift = (h('d') - 0.5) * Math.min(9, Math.abs(y - H[0]) * 0.55) + (outside ? sg * Math.min(4.5, Math.max(0, y) * 0.16) : 0); const Eb = CB(H[1] + drift);
    let tC, tE, Cpt, E;
    if (td) {
      const far = y - H[0]; if (far > 9) legs.push({ to: [H[0] + far * 0.42, CB(H[1] + (Eb - H[1]) * 0.3 + (h('cut') < 0.5 ? -1.8 : 1.8))], v: 8.3 });
      legs.push({ to: [toGoal + 1.2, Eb], v: 8.5, f: 'm' }, { to: [Math.min(toGoal + 4.2, maxA - 1.5), CB(Eb + sg * 1.2)], v: 4.5 });
      const kn = pfLegs(th, startC, legs); addPath(CK, kn); E = [kn[kn.length - 1][1], kn[kn.length - 1][2]]; tE = pfLegsEnd(kn); const tTd = kn[kn.length - 2][0];
      plan.lbl.push([tTd, P.tdLbl || 'Touchdown!', 'good']); plan.ev.td = tTd; tC = tE;
    } else {
      if (y < 0.6) { Cpt = [Math.min(y + 0.7, 0.4), CB(pfLerp(startC[1], H[1], 0.75))]; legs.length = 0; legs.push({ to: Cpt, v: 5.6, go: !sneak }); }
      else { const far = y - H[0]; if (far > 8) legs.push({ to: [H[0] + far * 0.42, CB(H[1] + (Eb - H[1]) * 0.3 + (h('cut') < 0.5 ? -1.8 : 1.8))], v: 8.1 }); Cpt = [y - Math.min(1.4, 0.4 + Math.max(0, y) * 0.12), Eb]; legs.push({ to: Cpt, v: far > 4 ? 8.2 : 6.2 }); }
      const kn = pfLegs(th, startC, legs); tC = pfLegsEnd(kn); kn[kn.length - 1][3] = 'm'; E = [y, CB(Cpt[1] + (h('fall') - 0.5) * 0.8)]; tE = tC + (kind === 'fum' ? 0.25 : 0.42); kn.push([tE, E[0], E[1]]); addPath(CK, kn);
    }
    plan.roles.c = CK; plan.car = [[0, null], [ts, 'OQB'], [th, CK]];
    // quarterback: the handoff, then the fake (or he keeps it); the back's path to the mesh arrives right on time
    if (!sneak) plan.path[CK][0].kn[0][3] = 'm';
    const retime = (kn, tEnd) => { const a = kn[0][0], b = pfLegsEnd(kn); return kn.map(k => [a + (k[0] - a) * (tEnd - a) / Math.max(0.05, b - a), k[1], k[2], k[3]]); };
    if (cr !== 'QB') {
      addPath('OQB', uc ? [[ts, q0[0], q0[1]], [th - 0.2, -2.6, sg * 0.8], [th, qMesh[0], qMesh[1], 'm'], [th + 0.9, -5.0, -sg * 4.2], [th + 1.8, -5.8, -sg * 6.6]] : [[ts, q0[0], q0[1]], [th, qMesh[0], qMesh[1], 'm'], [th + 0.9, -5.4, -sg * 3.8], [th + 1.8, -5.9, -sg * 6]]);
      const ap = retime(pfLegs(ts + 0.05, r0, (fn === 'gun' && Math.sign(r0[1]) === sg ? [{ to: [-5.6, r0[1] * 0.3], v: 4 }] : []).concat([{ to: M, v: 6.5 }])), th); ap[ap.length - 1][3] = 'm'; plan.path.ORB.unshift(pfPath(ap));
    } else if (!sneak) {
      addPath('ORB', [[ts + 0.05, r0[0], r0[1]], [th, M[0], M[1], 'm'], [th + 0.8, 0.2, sg * 2.2], [th + 1.2, 0.8, sg * 2.4]]);
      plan.path.OQB.unshift(pfPath([[ts, q0[0], q0[1]], [th, qMesh[0], qMesh[1], 'm']]));
    }
    // the ball: snapped, handed off, and maybe knocked loose
    plan.ball.push({ t: 0, spot: [0, 0] });
    if (uc || sneak) plan.ball.push({ t: ts, fly: { from: [0, 0], to: 'OQB', t1: ts + 0.08, z: 0 } }, { t: ts + 0.08, hold: 'OQB' }); else plan.ball.push({ t: ts, fly: { from: [0, 0], to: 'OQB', t1: ts + 0.3, z: 0.5 } }, { t: ts + 0.3, hold: 'OQB' });
    if (cr !== 'QB') plan.ball.push({ t: th, hold: CK });
    let loose = null; if (kind === 'fum') { loose = [CA(Cpt[0] + 1.4), CB(Cpt[1] + (h('fl') < 0.5 ? -1.9 : 1.9))]; plan.ball.push({ t: tC, fly: { from: CK, to: loose, t1: tC + 0.42, z: 0.9 } }, { t: tC + 0.42, spot: loose }); plan.lbl.push([tC + 0.05, 'Fumble!', 'bad']); }
    // blocks: the line takes the front, uncovered linemen climb to the linebackers, receivers stalk the corners
    const asg = blockMap(OLK.concat(['OTE']), DLK, sneak ? [] : LBK); const success = y >= 3, loss = y < 0.6;
    Object.entries(asg).forEach(([ok, dk]) => { const poa = Math.abs(F[ok][1] - holeB) < 3.6; const isLB = dk.indexOf('DLB') === 0;
      plan.pairs.push({ o: ok, d: dk, t0: ts + (isLB ? 0.4 : 0.05), t1: 99, push: (S, t) => (t < ts + 0.3 ? [0, 0] : poa ? (success ? [1.25, sg * (outside ? 0.9 : 0.2)] : loss ? [-1.4, 0] : [0.35, 0]) : [0.2, outside ? sg * 0.6 : 0]) }); });
    const stalk = []; [['OWR1', 'DCB1'], ['OWR2', 'DCB2']].forEach(([w, c]) => { const cc = Math.sign(F[c][1]) === Math.sign(F[w][1]) ? c : c === 'DCB1' ? 'DCB2' : 'DCB1'; if (!stalk.includes(cc)) { stalk.push(cc); plan.pairs.push({ o: w, d: cc, t0: ts + 0.4, t1: 99, push: () => [0.15, 0], gap: 2.0 }); } });
    { const free = ['DS2', 'DLB1', 'DLB3', 'DS1'].filter(k => !Object.values(asg).includes(k)); const tgt = free.sort((a, b) => Math.abs(F[a][1] - F.OWR3[1]) - Math.abs(F[b][1] - F.OWR3[1]))[0]; if (tgt) plan.pairs.push({ o: 'OWR3', d: tgt, t0: ts + 0.5, t1: 99, push: () => [0.1, 0] }); }
    plan.tEnd = tE + 0.05; plan.endKey = CK;
    // reactions
    PF_O.forEach(r => { const k = 'O' + r; if (plan.brain[k]) return; const e = plan.pairs.find(x => x.o === k); plan.brain[k] = stance(ts + 0.04, (S, pl, t) => { if (e && t < e.t1) { const D = S.pl[e.d]; const fit = pvSub(D.p, pvMul(pvNorm(pvSub(D.p, pl.p)), 1.7)); return seek(pl, pvAdd(fit, [0.3, outside ? sg * 0.6 : 0]), pl.vmax * 0.85); } return seek(pl, pvAdd(pl.p, [1, 0]), 1.2); }); });
    PF_D.forEach(r => { const k = 'D' + r; const isDL = DLK.includes(k); const isLB = LBK.includes(k); const isCB = /CB/.test(k);
      plan.brain[k] = stance(ts + (isDL ? 0.08 : 0.15), (S, pl, t) => {
        if (isDL) return t < th + 0.2 ? seek(pl, pvAdd(M, [0.6, 0]), pl.vmax * 0.85) : pursue(S, pl, 0.8);
        if (isLB) return t < ts + 0.45 ? seek(pl, pvAdd(F[k], [-0.6, 0]), 2.5) : pursue(S, pl, 0.95);
        if (isCB) return t < ts + 0.55 ? [2.2, 0] : pursue(S, pl, 0.92, -Math.sign(pl.p[1]) * -1.5);
        return t < ts + 0.6 ? [1.6, 0] : pursue(S, pl, 0.95);
      }); });
    // first look, then pick who makes the tackle (or recovers the fumble)
    const pre = pfSimulate(plan, []);
    if (!td) {
      const ex = []; const cand = chooseNear(pre.rec, pre.N, f => [pre.rec[CK][2 * f], pre.rec[CK][2 * f + 1]], tC, 'D', ex, 4);
      let tk1 = P.tackler && plan.form[P.tackler] ? P.tackler : cand[0].k; const tk2 = cand.find(c => c.k !== tk1); plan.roles.tk = tk1;
      mags.push({ k: tk1, t0: Math.max(ts + 0.35, tC - 0.55), t1: tC, at: pfHit(CK, 1.05) });
      if (tk2 && kind !== 'fum') mags.push({ k: tk2.k, t0: tC - 0.3, t1: tC + 0.28, at: pfHit(CK, 1.4) });
      plan.down[CK] = tE - 0.05; plan.down[tk1] = tE;
      if (kind === 'fum' && loose) { const rc = chooseNear(pre.rec, pre.N, loose, tC + 0.45, 'D', [tk1], 1)[0]; plan.roles.rc = rc.k; mags.push({ k: rc.k, t0: tC + 0.1, t1: tC + 0.62, at: () => loose }); plan.ball.push({ t: tC + 0.62, hold: rc.k }); plan.car.push([tC + 0.05, null], [tC + 0.62, rc.k]); plan.down[rc.k] = tC + 0.62; plan.endKey = rc.k; plan.tEnd = tC + 0.7; }
    }
    plan.T = plan.tEnd + 0.95; plan.endA = td ? toGoal : y;
    plan.camF = (t, f, bp) => [Math.max(bp[0] + 3, t < th ? 2 : bp[0] + 3), bp[1] * 0.55, t < th ? 40 : outside || Math.abs(y) > 12 ? 37 : 34, 30];
    return pfFinish(P, plan, mags);
  }

  /* ===== passes: completions, incompletions, interceptions, sacks, screens ===== */
  if (kind === 'pass' || kind === 'inc' || kind === 'int' || kind === 'sack') {
    const screen = P.call === 'screen'; const td = !!P.td && kind === 'pass';
    const yy = kind === 'pass' ? (td ? toGoal : clamp(P.y || 0, -6, toGoal)) : 0;
    let air;
    if (kind === 'pass') air = screen || yy <= 0 ? -1.4 : td && yy <= 22 && h('ezc') < 0.6 ? Math.min(toGoal + 2.2, maxA - 2) : clamp(Math.round(yy >= 10 ? yy * 0.72 : yy * 0.86), 1, Math.max(1, yy));
    else air = P.call === 'deep' ? 20 + Math.round(h('ad') * 14) : 5 + Math.round(h('ad') * 10);
    air = Math.min(air, maxA - 2.5);
    const crR = P.cr && P.cr.r && P.cr.tg ? P.cr.r[P.cr.tg] : null; /* a playbook play: its own routes (v9.14) */
    if (crR) { const d0 = crR[crR.length - 1][0]; air = kind === 'pass' ? clamp(Math.min(d0, yy - 0.5), -1.5, maxA - 2.5) : Math.min(d0, maxA - 2.5); }
    const depth = air <= 6 ? 0 : air <= 15 ? 1 : 2;
    let trole = P.tg ? P.tg.replace(/^O/, '') : null; if (!trole) { const r = roleOfNum(P.n); if (r && ['WR1', 'WR2', 'WR3', 'TE', 'RB'].includes(r)) trole = r; }
    if (!trole) trole = screen ? 'RB' : depth === 2 ? pick(['WR1', 'WR2', 'WR1', 'WR3'], 't') : depth === 1 ? pick(['WR1', 'WR2', 'WR3', 'TE'], 't') : pick(['WR3', 'TE', 'RB', 'WR2', 'WR1'], 't');
    const pa = P.cr ? !!P.cr.pa && kind !== 'sack' : !screen && kind !== 'sack' && h('pa') < 0.22; const fn = P.cr ? 'gun' : screen ? 'gun' : pa ? (h('paf') < 0.5 ? 'uc' : 'wing') : wpick([['gun', 4.5], ['trips', 2.5], ['empty', trole === 'RB' ? 0 : 1]], 'form');
    offForm(fn, P.cr ? 1 : h('m') < 0.5 ? 1 : -1); alignD();
    const TK = 'O' + trole; const gunLike = fn === 'gun' || fn === 'trips' || fn === 'empty';
    const q0 = F.OQB; const tGot = gunLike ? ts + 0.3 : ts + 0.08;
    const dropPt = gunLike ? [-5.9 - depth * 0.7, q0[1] * 0.3] : [-5.0 - depth * 1.3, 0]; const tD = gunLike ? ts + 0.6 + depth * 0.3 : ts + 0.85 + depth * 0.35 + (pa ? 0.4 : 0);
    // the target's route, built so he and the ball meet
    const S0 = F[TK]; const sgn = Math.sign(S0[1]) || 1; const wide = Math.abs(S0[1]) > 15; let CP, route = [];
    const rel = [S0[0] + 1.2, S0[1]];
    if (air < 0) { CP = trole === 'RB' ? [-1.6, CB((F.ORB[1] ? Math.sign(F.ORB[1]) : sg) * 8.5)] : [-0.6, S0[1] * 0.93]; route = trole === 'RB' ? [{ to: [-3.6, CP[1] * 0.45], v: 6 }, { to: CP, v: 6.5 }] : [{ to: CP, v: 4 }]; }
    else if (depth === 0) { if (trole === 'RB' || trole === 'TE') CP = [air, CB(S0[1] + (S0[1] ? Math.sign(S0[1]) : sg) * 5.5)]; else CP = h('rt') < 0.5 ? [air, CB(S0[1] - sgn * 5)] : [air, S0[1] * 0.97]; route = [{ to: rel, v: 6.5 }, { to: CP, v: 8.4 }]; }
    else if (depth === 1) { const rt = trole === 'RB' ? 'angle' : wide ? pick(['dig', 'out', 'curl'], 'rt') : pick(['out', 'seam', 'dig'], 'rt'); const K = [air + (rt === 'curl' ? 2 : 0.6), S0[1] * (wide ? 0.97 : 0.95)];
      CP = rt === 'dig' || rt === 'angle' ? [air, CB(S0[1] - sgn * 6.5)] : rt === 'out' ? [air, clamp(S0[1] + sgn * 4, -24.5, 24.5)] : rt === 'seam' ? [air, S0[1] * 0.9] : [air, CB(S0[1] * 0.96 - sgn * 0.8)]; route = rt === 'seam' ? [{ to: rel, v: 6.5 }, { to: CP, v: 8.8 }] : [{ to: rel, v: 6.5 }, { to: K, v: 8.8, f: rt === 'curl' || rt === 'out' ? 's' : '' }, { to: CP, v: 7 }]; }
    else { const rt = wide ? pick(['go', 'post', 'corner', 'go'], 'rt') : 'seam'; const K = [air * 0.55, S0[1] * 0.95]; CP = rt === 'post' ? [air, CB(S0[1] * 0.45)] : rt === 'corner' ? [air, clamp(S0[1] * 1.12, -24.5, 24.5)] : [air, CB(S0[1] * 0.93)]; route = rt === 'go' || rt === 'seam' ? [{ to: rel, v: 7 }, { to: CP, v: 9.2 }] : [{ to: rel, v: 7 }, { to: K, v: 9.2 }, { to: CP, v: 9.2 }]; }
    if (crR) { const d0 = crR[crR.length - 1][0]; const f = d0 > 0 && air < d0 ? Math.max(0.15, air / d0) : 1; const pts = crR.map(q => [q[0] > 0 ? q[0] * f : q[0], CB(q[1])]); CP = pts[pts.length - 1].slice(); route = pts.map((to, i) => ({ to, v: i ? 8.6 : 6.6 })); }
    const tStart = ts + 0.05; let rkn = pfLegs(tStart, S0, route); const tn = pfLegsEnd(rkn);
    const qThrow = pvAdd(dropPt, [0.6, 0]); const dThrow = pvDist(qThrow, CP); const ft = screen ? 0.42 : dThrow / (15.5 + dThrow * 0.2); const zPk = screen ? 0.3 : 0.7 + dThrow * 0.085;
    const tThr0 = screen ? ts + 1.0 : depth === 0 ? Math.max(tD + 0.05, ts + 1.05) : tD + (depth === 1 ? 0.4 : 0.6);
    const tCt = Math.max(tThr0 + ft, tn); const tThr = tCt - ft;
    if (tCt > tn + 0.02) { const fac = (tCt - tStart) / (tn - tStart); if (fac <= 1.35) rkn = rkn.map(k => [tStart + (k[0] - tStart) * fac, k[1], k[2], k[3]]); else { const last = rkn[rkn.length - 1]; const back = pvNorm(pvSub(qThrow, CP)); last[1] -= back[0] * 0.9; last[2] -= back[1] * 0.9; last[3] = 's'; rkn.push([tCt, CP[0], CP[1], 'm']); } }
    rkn[rkn.length - 1][3] = 'm'; plan.ev.thr = tThr; plan.ev.ct = tCt; plan.ballTo = CP; plan.roles.t = TK;
    // the quarterback: the snap, the drop, the throw (or the sack)
    const qkn = [[ts, q0[0], q0[1]]]; if (pa) qkn.push([ts + 0.55, -2.8, sg * 0.9]); qkn.push([tD, dropPt[0], dropPt[1], 's']);
    let sackA = 0, tSk = 0, SK = null; const rushK = P.rush ? P.rush.replace(/^D/, 'D') : (sg < 0 ? 'DDE1' : 'DDE2');
    if (kind === 'sack') { sackA = Math.min(-2, P.y || -6); tSk = tD + 0.75 + h('sk') * 0.6; const esc = (F[rushK] && F[rushK][1] > 0) ? -1 : 1; qkn.push([tD + 0.45, dropPt[0] + 0.9, esc * 0.9]); SK = [Math.max(minA + 1, sackA), esc * 2.1]; qkn.push([tSk, SK[0], SK[1], 'm'], [tSk + 0.35, SK[0] - 0.5, SK[1] + esc * 0.5]); plan.roles.r = rushK; plan.lbl.push([tSk, 'Sacked!', 'bad']); plan.down.OQB = tSk + 0.3; plan.endKey = 'OQB'; }
    else { qkn.push([tThr - 0.15, qThrow[0] - 0.5, qThrow[1]], [tThr, qThrow[0], qThrow[1]], [tThr + 0.6, qThrow[0] + 0.9, qThrow[1]]); }
    addPath('OQB', qkn);
    // the ball
    plan.ball.push({ t: 0, spot: [0, 0] }); if (gunLike) plan.ball.push({ t: ts, fly: { from: [0, 0], to: 'OQB', t1: tGot, z: 0.5 } }, { t: tGot, hold: 'OQB' }); else plan.ball.push({ t: ts, fly: { from: [0, 0], to: 'OQB', t1: tGot, z: 0 } }, { t: tGot, hold: 'OQB' });
    plan.car = [[0, null], [ts, 'OQB']];
    let tEnd = tCt + 0.6, E = CP; addPath(TK, rkn);
    if (kind === 'sack') { tEnd = tSk + 0.4; plan.endA = sackA; plan.path[TK] = [pfPath(rkn.filter(k => k[0] <= tSk + 0.6))]; }
    else if (kind === 'pass') {
      plan.ball.push({ t: tThr, fly: { from: 'OQB', to: CP, t1: tCt, z: zPk } }, { t: tCt, hold: TK }); plan.car.push([tThr, null], [tCt, TK]);
      const yac = yy - air; const legs = []; const fb = CB(CP[1] + (Math.abs(CP[1]) > 17 ? -Math.sign(CP[1]) * Math.min(4.5, Math.max(0, yac) * 0.3) : (h('yd') - 0.5) * Math.min(7, Math.abs(yac) * 0.45)));
      if (td && air >= toGoal) { legs.push({ to: [Math.min(CP[0] + 1.8, maxA - 1.2), CP[1]], v: 5, go: true }); E = legs[0].to; tEnd = tCt + 0.9; plan.lbl.push([tCt + 0.05, P.tdLbl || 'Touchdown!', 'good']); }
      else if (td) { if (yac > 9) legs.push({ to: [CP[0] + yac * 0.4, CB(CP[1] + (fb - CP[1]) * 0.3 + (h('cut') < 0.5 ? -1.7 : 1.7))], v: 8.4, go: true }); legs.push({ to: [toGoal + 1.2, fb], v: 8.6, go: true, f: 'm' }, { to: [Math.min(toGoal + 3.6, maxA - 1.5), fb], v: 4.5 }); }
      else { if (yac > 8) legs.push({ to: [CP[0] + yac * 0.42, CB(CP[1] + (fb - CP[1]) * 0.3 + (h('cut') < 0.5 ? -1.7 : 1.7))], v: 8.4, go: true }); const Cn = [yy - Math.min(1.3, 0.3 + Math.max(0, yac) * 0.12), fb]; if (pvDist(Cn, CP) > 0.6) legs.push({ to: Cn, v: yac > 4 ? 8.2 : 6, go: true }); }
      if (legs.length) { const kn = pfLegs(tCt, CP, legs); kn[0][3] = 'm'; if (!td && !(air >= toGoal)) { const tCn = pfLegsEnd(kn); kn[kn.length - 1][3] = 'm'; E = [yy, CB(fb + (h('fall') - 0.5) * 0.8)]; kn.push([tCn + 0.42, E[0], E[1]]); plan.ev.tC = tCn; tEnd = tCn + 0.42; } else { tEnd = pfLegsEnd(kn); E = [kn[kn.length - 1][1], kn[kn.length - 1][2]]; if (td && !(air >= toGoal)) { plan.lbl.push([kn[kn.length - 2][0], P.tdLbl || 'Touchdown!', 'good']); } } addPath(TK, kn); }
      else { E = [yy, CB(CP[1] + (h('fall') - 0.5) * 0.8)]; addPath(TK, [[tCt, CP[0], CP[1], 'm'], [tCt + 0.4, E[0], E[1]]]); plan.ev.tC = tCt; tEnd = tCt + 0.4; }
      plan.endKey = TK; plan.endA = td ? toGoal : yy; if (!td && yy >= 20) plan.lbl.push([tCt + 0.1, 'Big play!', 'good']);
    } else if (kind === 'inc') {
      const bu = !!P.tackler || h('bu') < 0.5; const over = !bu && h('ov') < 0.6; const land = over ? pvAdd(CP, [2.6, -sgn * 0.6]) : pvAdd(CP, [1.4, (h('df') - 0.5) * 3]);
      plan.ball.push({ t: tThr, fly: { from: 'OQB', to: bu ? CP : land, t1: bu ? tCt : tCt + 0.12, z: zPk } }); if (bu) plan.ball.push({ t: tCt, fly: { from: CP, to: land, t1: tCt + 0.42, z: 0.8 } }); plan.ball.push({ t: (bu ? tCt + 0.42 : tCt + 0.12), spot: land });
      plan.car.push([tThr, null]); plan.ev.bu = bu; plan.lbl.push([tCt + 0.05, bu ? 'Broken up!' : 'Incomplete', '']); addPath(TK, [[tCt, CP[0], CP[1], 'm'], [tCt + 0.45, CP[0] + 1.6, CP[1] + (over ? -sgn * 0.4 : 0)]]); plan.down[TK] = over ? tCt + 0.2 : 99; tEnd = tCt + 0.5; plan.endA = 0;
    } else if (kind === 'int') { plan.ball.push({ t: tThr, fly: { from: 'OQB', to: CP, t1: tCt, z: zPk } }); plan.car.push([tThr, null]); plan.lbl.push([tCt, P.p6 ? 'Pick six!' : 'Intercepted!', 'bad']); }
    // everyone else's routes: clear-outs, curls, outs, a check-down, or staying in to block
    const others = ['OWR1', 'OWR2', 'OWR3', 'OTE', 'ORB'].filter(k => k !== TK); const blitz = kind !== 'sack' && (P.dcr ? !!P.dcr.blitz : h('blz') < 0.22);
    others.forEach((k, i) => { const s0 = F[k]; const sb = Math.sign(s0[1]) || sg; const w = Math.abs(s0[1]) > 15;
      const crO = P.cr && P.cr.r ? P.cr.r[k.slice(1)] : null; if (P.cr && !crO && (k === 'ORB' || k === 'OTE')) return;
      if (crO) { const kn = pfLegs(ts + 0.05 + i * 0.03, s0, crO.map((to, j) => ({ to: [to[0], CB(to[1])], v: j ? 8.4 : 6.4 }))); addPath(k, pfCut(kn, (kind === 'sack' ? tSk + 0.4 : tThr + 0.35) + 0.5)); return; }
      if (k === 'ORB' && (blitz || h('rbp') < 0.5) && !pa) return; if (k === 'OTE' && h('tep') < 0.35) return;
      let L; const dd = depth === 2 ? 6 + Math.round(h('od' + k) * 6) : 12 + Math.round(h('od' + k) * 10);
      if (k === 'ORB') L = [{ to: [s0[0] + 2, s0[1] + sb * 2.5], v: 5 }, { to: [2.5, CB(sb * 6)], v: 6.5 }, { to: [3.4, CB(sb * 7)], v: 2 }];
      else if (w) L = h('or' + k) < 0.5 ? [{ to: [s0[0] + 1.2, s0[1]], v: 6.5 }, { to: [Math.min(dd + 10, maxA - 3), s0[1] * 0.95], v: 9 }] : [{ to: [s0[0] + 1.2, s0[1]], v: 6.5 }, { to: [Math.min(dd + 1.5, maxA - 3), s0[1] * 0.97], v: 8.6, f: 's' }, { to: [Math.min(dd, maxA - 3), s0[1] * 0.95 - sb * 0.8], v: 3 }];
      else L = h('or' + k) < 0.5 ? [{ to: [s0[0] + 1, s0[1]], v: 6 }, { to: [Math.min(dd * 0.55, maxA - 3), s0[1]], v: 8, f: 's' }, { to: [Math.min(dd * 0.55, maxA - 3), CB(s0[1] + sb * 6)], v: 7.5 }] : [{ to: [s0[0] + 1, s0[1]], v: 6 }, { to: [Math.min(dd + 4, maxA - 3), s0[1] * 0.9], v: 8.6 }];
      const kn = pfLegs(ts + 0.05 + i * 0.03, s0, L); const end = kind === 'sack' ? tSk + 0.4 : tThr + 0.35; addPath(k, pfCut(kn, end + 0.5));
    });
    // protection: the line sets a pocket; rushers fight to the quarterback; one gets through on a sack
    const asg = blockMap(OLK, DLK, []);
    Object.entries(asg).forEach(([ok, dk]) => { const beat = kind === 'sack' && dk === rushK; plan.pairs.push({ o: ok, d: dk, t0: ts + 0.1, t1: beat ? tSk - 0.95 : kind === 'sack' ? tSk + 0.3 : screen ? ts + 0.85 : tThr + 0.35, push: (S, t, e) => pvMul(pvNorm(pvSub(S.pl.OQB.p, e.c)), beat ? 0.9 : 0.42), face: (S) => pvSub(S.pl[dk].p, S.pl.OQB.p), side: beat ? 2.2 : 1.2 }); });
    if (blitz) { plan.pairs.push({ o: 'ORB', d: 'DLB2', t0: ts + 0.4, t1: kind === 'sack' ? tSk : tThr + 0.3, push: (S, t, e) => pvMul(pvNorm(pvSub(S.pl.OQB.p, e.c)), 0.3) }); }
    const setPt = { OLT: [-2.3, F.OLT[1] - Math.sign(F.OLT[1]) * -0.9], OLG: [-1.7, F.OLG[1]], OC: [-1.5, 0], ORG: [-1.7, F.ORG[1]], ORT: [-2.3, F.ORT[1] + Math.sign(F.ORT[1]) * 0.9] };
    PF_O.forEach(r => { const k = 'O' + r; if (plan.brain[k]) return; const e = plan.pairs.find(x => x.o === k); plan.brain[k] = stance(ts + 0.03, (S, pl, t) => {
      const after = kind !== 'sack' && t > tCt && kind === 'pass'; if (after) { const ck = carAt(t); if (ck) { const c = S.pl[ck]; return seek(pl, pvAdd(c.p, [3 + h('bl' + k) * 3, (h('bb' + k) - 0.5) * 6]), pl.vmax * 0.7); } }
      if (kind === 'int' && t > tCt) return pursue(S, pl, 0.9);
      if (screen && setPt[k] && t > ts + 0.85) return seek(pl, [Math.max(CP[0], -1) + 2 + h('sx' + k) * 3.5, CP[1] * 0.55 + (h('sy' + k) - 0.5) * 6], pl.vmax * 0.85); /* the screen: the line lets the rush through and leads the way */
      if (setPt[k]) { if (e && t < e.t1) { const D = S.pl[e.d]; const fit = pvAdd(S.pl.OQB.p, pvMul(pvNorm(pvSub(D.p, S.pl.OQB.p)), Math.max(2.4, pvDist(D.p, S.pl.OQB.p) - 1.9))); return seek(pl, t < ts + 0.45 ? setPt[k] : fit, pl.vmax * 0.9); } return seek(pl, t < tThr + 0.3 ? setPt[k] : pvAdd(setPt[k], [2, 0]), pl.vmax * 0.6); }
      if (k === 'ORB' && !plan.path.ORB) { if (blitz) return seek(pl, pvAdd(S.pl.DLB2.p, [-1.5, 0]), pl.vmax * 0.8); return seek(pl, [dropPt[0] + 2.2, sg * 1.6], 4); }
      if (k === 'OTE' && !plan.path.OTE) return seek(pl, [-1.6, F.OTE[1] * 1.05], 3);
      if (t > tThr + 0.3) return seek(pl, pvAdd(pl.p, pvMul(pvNorm(pvSub(plan.ballTo || [0, 0], pl.p)), 2)), 3.5);
      return pvMul(pl.v, 0.5); }); });
    // coverage: man on the receivers (with a cushion that closes), zones underneath and deep; everyone breaks on the throw
    const zone = { DLB1: [7.5, -5], DLB2: [8.5, 0], DLB3: [7.5, 5], DS1: [twoHigh ? 17 : 19, twoHigh ? -10 : 0], DS2: [twoHigh ? 17 : 8, twoHigh ? 10 : 6], DCB1: [8, -16], DCB2: [8, 16] };
    PF_D.forEach(r => { const k = 'D' + r; const isDL = DLK.includes(k);
      plan.brain[k] = stance(ts + (isDL ? 0.06 : 0.12), (S, pl, t) => {
        if (kind === 'pass' && t >= tCt) return pursue(S, pl, isDL ? 0.7 : 0.97);
        if (t > tThr + (isDL ? 0.4 : 0.22) && kind !== 'sack') return seek(pl, pvAdd(CP, [0.8, (h('bk' + k) - 0.5) * 3]), pl.vmax * (isDL ? 0.6 : 0.98));
        { const dp = P.dcr && P.dcr.r ? P.dcr.r[r] : null; if (dp && dp.length) { const q = dp[Math.min(dp.length - 1, Math.floor(Math.max(0, t - ts) / 0.8))]; if (q[0] < 0) return seek(pl, t > ts + 0.8 * (dp.length - 1) ? S.pl.OQB.p : [q[0], q[1]], pl.vmax * 0.95); return seek(pl, [Math.min(q[0], maxA - 1), q[1]], pl.vmax * 0.85); } } /* your own defensive call (v9.15) */
        if (isDL || (blitz && k === 'DLB2')) return seek(pl, S.pl.OQB.p, pl.vmax * 0.9);
        if (kind === 'sack' && t > tSk - 0.6) return seek(pl, S.pl.OQB.p, pl.vmax * 0.5);
        const ck = cover[k]; if (ck && h('man') < 0.6) { const R_ = S.pl[ck]; const c0 = Math.max(0.9, (F[k][0] - F[ck][0]) - (t - ts) * 1.4); return seek(pl, pvAdd(pvAdd(R_.p, pvMul(R_.v, -0.18)), [c0, -Math.sign(R_.p[1]) * 0.8]), pl.vmax * 0.98); }
        const z = zone[k] || F[k]; const zp = [Math.min(z[0], maxA - 1), z[1] * (Math.sign(F.OTE[1]) || 1)]; return seek(pl, zp, pl.vmax * 0.85);
      }); });
    if (kind === 'int') { // the pick and the return
      const prePI = pfSimulate(plan, []); const dk = P.pk && plan.form[P.pk] ? P.pk : (() => { const own = Object.keys(cover).find(x => cover[x] === TK); const c = chooseNear(prePI.rec, prePI.N, CP, tCt, 'D', DLK, 3); return own && c.slice(0, 2).some(x => x.k === own) ? own : c[0].k; })(); plan.roles.pk = dk;
      const IP = pvAdd(CP, pvMul(pvNorm(pvSub(qThrow, CP)), 0.7)); mags.push({ k: dk, t0: tCt - 0.7, t1: tCt - 0.02, t2: tCt, at: () => IP }); plan.ball[plan.ball.length - 1].fly.to = IP;
      const ret = P.p6 ? IP[0] + P.los + 2 : P.ret == null ? 6 + Math.round(h('ir') * 10) : P.ret; const back = P.p6 ? [Math.max(minA + 2, -P.los - 2.5), CB(IP[1] + (h('ib') - 0.5) * 12)] : [IP[0] - ret, CB(IP[1] + sg * 3.5)];
      const kn = pfLegs(tCt, IP, (ret > 10 ? [{ to: [IP[0] - ret * 0.45, CB(IP[1] + (back[1] - IP[1]) * 0.3 + (h('icut') < 0.5 ? -2 : 2))], v: 8.2 }] : []).concat([{ to: back, v: 8.4, f: P.p6 ? 'm' : '' }])); if (P.p6) kn.push([pfLegsEnd(kn) + 0.7, back[0] - 1.8, back[1]]); addPath(dk, kn); plan.ball.push({ t: tCt, hold: dk }); plan.car.push([tCt, dk]);
      const tR = pfLegsEnd(kn); tEnd = tR + 0.05; plan.endKey = dk; plan.endA = back[0];
      PF_O.forEach(r => { const k = 'O' + r; const old = plan.brain[k]; plan.brain[k] = (S, pl, t) => (t > tCt + 0.25 ? (t > plan.tEnd ? settle(S, pl) : pursue(S, pl, 0.9)) : old(S, pl, t)); });
      PF_D.forEach(r => { const k = 'D' + r; if (k === dk) return; const old = plan.brain[k]; plan.brain[k] = (S, pl, t) => (t > tCt + 0.2 ? (t > plan.tEnd ? settle(S, pl) : seek(pl, pvAdd(S.pl[dk].p, [-(2.5 + h('es' + k) * 6), (h('eb' + k) - 0.5) * 12]), pl.vmax * 0.85)) : old(S, pl, t)); }); /* teammates turn into blockers for the return */
      plan.tEnd = tEnd; if (P.p6) plan.lbl.push([tR - 0.6, 'Touchdown!', 'bad']);
      if (!P.p6) { const pre2 = pfSimulate(plan, mags); const tk = chooseNear(pre2.rec, pre2.N, f => [pre2.rec[dk][2 * f], pre2.rec[dk][2 * f + 1]], tR - 0.3, 'O', [], 1)[0]; if (tk) { mags.push({ k: tk.k, t0: tR - 0.75, t1: tR - 0.15, at: pfHit(dk, 1.05) }); plan.down[dk] = tR; plan.roles.tk2 = tk.k; } }
    }
    plan.tEnd = tEnd; plan.endKey = plan.endKey || TK;
    if (kind === 'sack') { const rk = rushK; mags.push({ k: rk, t0: tSk - 0.55, t1: tSk, at: pfHit('OQB', 1.0) }); plan.down[rk] = tSk + 0.35; }
    if (kind === 'pass' && !td && !(air >= toGoal)) { const tC_ = plan.ev.tC || tCt; const pre = pfSimulate(plan, mags); const cand = chooseNear(pre.rec, pre.N, f => [pre.rec[TK][2 * f], pre.rec[TK][2 * f + 1]], tC_, 'D', [], 3); const tk1 = P.tackler && plan.form[P.tackler] ? P.tackler : cand[0].k; plan.roles.tk = tk1; mags.push({ k: tk1, t0: Math.max(tCt, tC_ - 0.6), t1: tC_, at: pfHit(TK, 1.05) }); const tk2 = cand.find(c => c.k !== tk1); if (tk2 && yy > 3) mags.push({ k: tk2.k, t0: tC_ - 0.25, t1: tC_ + 0.3, at: pfHit(TK, 1.4) }); plan.down[TK] = tEnd - 0.05; plan.down[tk1] = tEnd; }
    if (kind === 'inc' && plan.ev.bu) { const pre = pfSimulate(plan, mags); const dk = P.tackler && plan.form[P.tackler] ? P.tackler : chooseNear(pre.rec, pre.N, CP, tCt, 'D', DLK, 1)[0].k; plan.roles.tk = dk; mags.push({ k: dk, t0: tCt - 0.6, t1: tCt, t2: tCt + 0.05, at: () => pvAdd(CP, [0.5, -sgn * 0.7]) }); }
    plan.tEnd = tEnd; plan.T = tEnd + 0.95;
    plan.camF = (t, f, bp, rec) => { const qb = [rec.OQB[2 * f], rec.OQB[2 * f + 1]]; const tg = [rec[TK][2 * f], rec[TK][2 * f + 1]]; if (t < tCt && kind !== 'sack') { const mid = pvLerp(qb, tg, 0.5); return [pfLerp(bp[0], mid[0], 0.55), pfLerp(bp[1], mid[1], 0.4) * 0.6, 40, Math.abs(qb[0] - tg[0]) + 18]; } return [bp[0], bp[1] * 0.55, kind === 'sack' ? 34 : 35, 28]; };
    return pfFinish(P, plan, mags);
  }

  /* ===== punts ===== */
  if (kind === 'punt') {
    const m = 1; const Fo = { LT: [-0.7, -4.2], LG: [-0.7, -2.1], C: [-0.7, 0], RG: [-0.7, 2.1], RT: [-0.7, 4.2], TE: [-1.5, 5.6], WR3: [-1.5, -5.6], RB: [-5.4, 0], QB: [-14, 0], WR1: [-0.7, -21.5], WR2: [-0.7, 21.5] };
    PF_O.forEach(r => { F['O' + r] = [CA(Fo[r][0]), Fo[r][1] * m]; });
    const dist = P.dist || 42; const land = Math.min(dist, toGoal + 6); const tb = land >= toGoal; const ret = tb ? 0 : P.ret == null ? 6 : P.ret; const fair = !tb && ret === 0;
    const L = [land, CB(sg * (1.5 + h('lb') * 4))];
    const Fd = { DE1: [1.2, -4.8], DT1: [1.2, -1.4], DT2: [1.2, 1.4], DE2: [1.2, 4.8], LB1: [3.6, -2.7], LB3: [3.6, 2.7], LB2: [Math.min(9, toGoal + 2), 0], CB1: [1.3, -21.5], CB2: [1.3, 21.5], S2: [Math.min(land - 9, toGoal + 3), -L[1] * 0.4], S1: [Math.min(land + 3, toGoal + 4), 0] };
    PF_D.forEach(r => { F['D' + r] = [Math.min(Fd[r][0], maxA - 1), Fd[r][1]]; });
    ts = 0.45; const tGot = ts + 0.78, tK = tGot + 0.85; const hang = clamp(2.8 + dist * 0.035, 3.3, 4.7); const tL = tK + hang;
    addPath('OQB', [[tGot - 0.1, -14, 0], [tK, -12.4, 0.2, 'm'], [tK + 0.8, -11.2, 0.3]]);
    plan.ball.push({ t: 0, spot: [0, 0] }, { t: ts, fly: { from: [0, 0], to: 'OQB', t1: tGot, z: 0.6 } }, { t: tGot, hold: 'OQB' }, { t: tK, fly: { from: 'OQB', to: L, t1: tL, z: 8 + dist * 0.08 } });
    plan.car = [[0, null], [tGot, 'OQB'], [tK, null]]; plan.ballTo = L; plan.lbl.push([tK + 0.1, 'Punt', '']); plan.roles.ret = 'DS1';
    let tEnd;
    if (tb) { const bo = [Math.min(toGoal + 9, maxA - 0.6), CB(L[1] * 1.3)]; plan.ball.push({ t: tL, fly: { from: L, to: bo, t1: tL + 0.7, z: 1.2 } }, { t: tL + 0.7, spot: bo }); addPath('DS1', [[ts, F.DS1[0], F.DS1[1]], [tK + 1.2, Math.min(toGoal - 1, F.DS1[0]), L[1] * 0.5, 's'], [tL + 0.6, toGoal - 2, L[1] * 0.3]]); tEnd = tL + 0.7; plan.lbl.push([tL + 0.4, 'Touchback', '']); plan.endA = toGoal; plan.endKey = 'DS1'; }
    else {
      addPath('DS1', [[ts, F.DS1[0], F.DS1[1]], [tK + 0.6, F.DS1[0] + 0.5, F.DS1[1]], [tL - 0.15, L[0] + 0.3, L[1], 'm'], [tL, L[0], L[1], fair ? '' : 'm']]); plan.ball.push({ t: tL, hold: 'DS1' }); plan.car.push([tL, 'DS1']);
      if (fair) { tEnd = tL + 0.4; plan.lbl.push([tL, 'Fair catch', '']); plan.endA = land; }
      else { const RE = [land - ret, CB(L[1] + sg * Math.min(6, ret * 0.5))]; const legs = []; if (ret > 8) legs.push({ to: [land - ret * 0.4, CB(L[1] + (h('pc') < 0.5 ? -2.5 : 2.5))], v: 8.2, go: true }); legs.push({ to: [RE[0] + 0.9, RE[1]], v: ret > 4 ? 8 : 5, go: true, f: 'm' }); const kn = pfLegs(tL, L, legs); kn[0][3] = 'm'; const tC = pfLegsEnd(kn); kn.push([tC + 0.4, RE[0], RE[1]]); addPath('DS1', kn); tEnd = tC + 0.4; plan.ev.tC = tC; plan.endA = RE[0]; }
      plan.endKey = 'DS1';
    }
    // protection, then everyone covers; gunners fight the jammers; the return team turns and sets a wall
    const rush = ['DDE1', 'DDT1', 'DDT2', 'DDE2', 'DLB1', 'DLB3']; const line = ['OLT', 'OLG', 'OC', 'ORG', 'ORT', 'OTE', 'OWR3']; const used = new Set();
    rush.forEach(dk => { let best = null, bd = 1e9; line.forEach(ok => { if (used.has(ok)) return; const d = Math.abs(F[ok][1] - F[dk][1]); if (d < bd) { bd = d; best = ok; } }); if (best) { used.add(best); plan.pairs.push({ o: best, d: dk, t0: ts + 0.05, t1: tK + 0.25, push: () => [-0.4, 0] }); } });
    plan.pairs.push({ o: 'OWR1', d: 'DCB1', t0: ts, t1: ts + 0.95, push: () => [2.6, 0], gap: 1.9 }, { o: 'OWR2', d: 'DCB2', t0: ts, t1: ts + 0.95, push: () => [2.6, 0], gap: 1.9 });
    const wallB = CB(L[1] + sg * 5);
    PF_O.forEach((r, i) => { const k = 'O' + r; if (k === 'OQB') { plan.brain[k] = wrap((S, pl, t) => seek(pl, [-9, 0], 3)); return; } plan.brain[k] = stance(ts + 0.03, (S, pl, t) => { if (t < tK + 0.25 && !/WR[12]/.test(r)) return seek(pl, F[k], 2); const tgt = carAt(t) ? null : L; if (!tgt) return pursue(S, pl, 0.95, (i - 5) * 0.4); const lane = [L[0] - 6, CB(L[1] + (F[k][1] * 0.45))]; return seek(pl, t < tL - 0.8 ? lane : L, pl.vmax * 0.95); }); });
    PF_D.forEach((r, i) => { const k = 'D' + r; if (k === 'DS1') { plan.brain[k] = wrap(() => [0, 0]); return; } plan.brain[k] = stance(ts + 0.06, (S, pl, t) => { if (/CB/.test(r)) { const g = S.pl[r === 'CB1' ? 'OWR1' : 'OWR2']; return seek(pl, pvAdd(g.p, [1.2, -Math.sign(g.p[1]) * 0.9]), pl.vmax * 0.97); } if (t < tK + 0.3) return seek(pl, S.pl.OQB.p, pl.vmax * 0.6); const wp = [Math.min(L[0] - 9 - (i % 3) * 2.5, maxA - 2), CB(wallB + ((i % 4) - 1.5) * 3.5)]; return t < tL + 0.3 ? seek(pl, wp, pl.vmax * 0.9) : pursue(S, pl, 0.4); }); });
    if (!tb && !fair) { const pre = pfSimulate(plan, []); const c = chooseNear(pre.rec, pre.N, f => [pre.rec.DS1[2 * f], pre.rec.DS1[2 * f + 1]], plan.ev.tC, 'O', ['OQB'], 2); const tk1 = c[0].k; plan.roles.tk = tk1; mags.push({ k: tk1, t0: plan.ev.tC - 0.55, t1: plan.ev.tC, at: pfHit('DS1', 1.05) }); if (c[1]) mags.push({ k: c[1].k, t0: plan.ev.tC - 0.2, t1: plan.ev.tC + 0.3, at: pfHit('DS1', 1.4) }); plan.down.DS1 = tEnd - 0.05; plan.down[tk1] = tEnd; }
    plan.tEnd = tEnd; plan.T = tEnd + 0.9; plan.ev.tK = tK; plan.ev.tL = tL;
    plan.camF = (t, f, bp) => [bp[0], bp[1] * 0.5, 44, t > tK && t < tL ? 36 : 30];
    return pfFinish(P, plan, mags);
  }

  /* ===== field goals and extra points ===== */
  if (kind === 'fg' || kind === 'xp') {
    const Fo = { LT: [-0.7, -4.2], LG: [-0.7, -2.1], C: [-0.7, 0], RG: [-0.7, 2.1], RT: [-0.7, 4.2], TE: [-0.8, 6.3], WR1: [-0.8, -6.3], WR2: [-1.5, 7.9], WR3: [-1.5, -7.9], QB: [-7, 0.5], RB: [-9.6, -2.6] };
    PF_O.forEach(r => { F['O' + r] = [CA(Fo[r][0]), Fo[r][1]]; });
    const Fd = { DT1: [1.1, -1.05], DT2: [1.1, 1.05], DE1: [1.1, -5.2], DE2: [1.1, 5.2], LB1: [1.2, -8.8], LB3: [1.2, 8.8], LB2: [3.3, 0], CB1: [1.6, -11.5], CB2: [1.6, 11.5], S1: [7, -4.5], S2: [7, 4.5] };
    PF_D.forEach(r => { F['D' + r] = [Math.min(Fd[r][0], maxA - 1), Fd[r][1]]; });
    ts = 0.45; const tHold = ts + 0.4, tK = ts + 1.2; const dist = P.dist || (toGoal + 17); const miss = !P.good; const short = miss && dist >= 50 && h('sh') < 0.4;
    const gb = miss && !short ? sg * (3.9 + h('mb') * 1.6) : (h('gb') - 0.5) * 3.2; const G = short ? [toGoal + 5 + h('sl') * 3, gb * 0.6] : [toGoal + 10, gb];
    const ft = clamp(dist * 0.028, 0.75, 1.75); const beyond = short ? G : [Math.min(toGoal + 13.5, maxA + 2.5), gb * 1.25];
    addPath('ORB', [[ts + 0.25, F.ORB[0], F.ORB[1]], [tK - 0.32, -8.4, -1.3], [tK, -7.5, -0.35, 'm'], [tK + 0.5, -6.0, 0.4]]);
    plan.ball.push({ t: 0, spot: [0, 0] }, { t: ts, fly: { from: [0, 0], to: [-7, 0], t1: tHold, z: 0.4 } }, { t: tHold, spot: [-7, 0] }, { t: tK, fly: { from: [-7, 0], to: G, t1: tK + ft, z: 3.2 + dist * 0.09, z1: short ? 0 : 1.6 } });
    if (!short) plan.ball.push({ t: tK + ft, fly: { from: G, to: beyond, t1: tK + ft + 0.35, z: 0, z1: 0 } }, { t: tK + ft + 0.35, spot: beyond }); else plan.ball.push({ t: tK + ft, spot: G });
    plan.car = [[0, null]]; plan.ballTo = G; plan.roles.k = 'ORB';
    plan.lbl.push([tK + ft - 0.05, kind === 'xp' ? (miss ? 'PAT no good' : 'Extra point good') : miss ? 'No good' : 'It\'s good!', miss ? 'bad' : 'good']);
    const used = new Set(); ['DDE1', 'DDT1', 'DDT2', 'DDE2'].forEach(dk => { let best = null, bd = 1e9; OLK.forEach(ok => { if (used.has(ok)) return; const d = Math.abs(F[ok][1] - F[dk][1]); if (d < bd) { bd = d; best = ok; } }); used.add(best); plan.pairs.push({ o: best, d: dk, t0: ts + 0.05, t1: tK + 0.7, push: () => [-0.35, 0] }); });
    PF_O.forEach(r => { const k = 'O' + r; if (!plan.brain[k]) plan.brain[k] = stance(ts + 0.04, (S, pl, t) => seek(pl, pvAdd(F[k], [-0.6, F[k][1] * 0.05]), 2)); });
    PF_D.forEach(r => { const k = 'D' + r; plan.brain[k] = stance(ts + 0.06, (S, pl, t) => (t < tK + 0.3 ? seek(pl, /LB[13]|CB/.test(r) ? [-5.5, F[k][1] * 0.45] : [-6, 0], pl.vmax * (/LB[13]|CB/.test(r) ? 0.95 : 0.6)) : seek(pl, pvAdd(pl.p, [0.4, 0]), 1))); });
    plan.tEnd = tK + ft + 0.5; plan.T = plan.tEnd + 0.8; plan.endA = 0; plan.ev.tK = tK;
    plan.camF = (t, f, bp) => [t < tK ? -3 : bp[0], 0, t < tK ? 34 : 40, t < tK ? 24 : 30];
    return pfFinish(P, plan, []);
  }

  /* ===== kickoffs ===== */
  if (kind === 'ko') {
    const lanes = [-22, -17.5, -13, -8.5, -4, 4, 8.5, 13, 17.5, 22]; const cov = ['OWR1', 'OLT', 'OLG', 'OTE', 'OC', 'ORG', 'ORT', 'OWR3', 'ORB', 'OWR2'];
    cov.forEach((k, i) => { F[k] = [-1.2, lanes[i]]; }); F.OQB = [-7.5, -1.2];
    const g = toGoal; const Fd = { DE1: [11.5, -14], DT1: [11.5, -5], DT2: [11.5, 5], DE2: [11.5, 14], LB2: [12.5, 0], LB1: [23, -10], LB3: [23, 10], CB1: [37, -9], CB2: [37, 9], S2: [g - 10, 0], S1: [g - 2, 0] };
    PF_D.forEach(r => { F['D' + r] = Fd[r].slice(); });
    const tK = 1.25; const touchback = P.tb != null ? P.tb : h('tb') < 0.58; const land = touchback ? g + 2 + h('kl') * 6 : g - 3 + h('kl') * 4; const L = [land, CB((h('kb') - 0.5) * 12)]; const hang = 3.7 + h('kh') * 0.5; const tL = tK + hang;
    addPath('OQB', [[0.15, F.OQB[0], F.OQB[1]], [tK, -0.4, -0.3, 'm'], [tK + 1.2, 5, -0.6]]);
    plan.ball.push({ t: 0, spot: [0, 0] }, { t: tK, fly: { from: [0, 0], to: L, t1: tL, z: 12 } }); plan.car = [[0, null]]; plan.ballTo = L; plan.lbl.push([tK, 'Kickoff', '']); plan.roles.ret = 'DS1';
    const endYl = P.endYl != null ? P.endYl : 25; const RE = [clamp(g - endYl, 0, g - 1), CB(L[1] + (h('rb') - 0.5) * 14)]; let tEnd;
    if (touchback && land > g + 0.5) { addPath('DS1', [[tK - 0.3, F.DS1[0], F.DS1[1]], [tL - 0.1, L[0], L[1], 'm'], [tL, L[0], L[1]]]); plan.ball.push({ t: tL, hold: 'DS1' }); plan.car.push([tL, 'DS1']); tEnd = tL + 0.6; plan.lbl.push([tL + 0.15, 'Touchback', '']); plan.endA = g - 25; plan.down.DS1 = tL + 0.3; }
    else { addPath('DS1', [[tK - 0.3, F.DS1[0], F.DS1[1]], [tL - 0.1, L[0] + 0.3, L[1], 'm'], [tL, L[0], L[1], 'm']]); const ret = L[0] - RE[0]; const legs = [{ to: [L[0] - ret * 0.4, CB(L[1] + (RE[1] - L[1]) * 0.3 + (h('kc') < 0.5 ? -2.5 : 2.5))], v: 8.3, go: true }, { to: [RE[0] + 0.9, RE[1]], v: 8.4, go: true, f: 'm' }]; const kn = pfLegs(tL, L, legs); kn[0][3] = 'm'; const tC = pfLegsEnd(kn); kn.push([tC + 0.4, RE[0], RE[1]]); addPath('DS1', kn); plan.ball.push({ t: tL, hold: 'DS1' }); plan.car.push([tL, 'DS1']); tEnd = tC + 0.4; plan.ev.tC = tC; plan.endA = RE[0]; }
    plan.endKey = 'DS1';
    // coverage sprints down its lanes; the front line turns to block; the second wave forms a wedge
    cov.forEach((k, i) => { plan.brain[k] = wrap((S, pl, t) => { if (t < tK - 0.55) return [0, 0]; if (t < tL) return seek(pl, [L[0] - 4 - Math.abs(lanes[i]) * 0.25, CB(L[1] + lanes[i] * 0.45)], pl.vmax); return pursue(S, pl, 0.95, lanes[i] * 0.08); }); });
    plan.brain.OQB = wrap((S, pl, t) => seek(pl, [20, 0], 5));
    const blk = ['DDE1', 'DDT1', 'DDT2', 'DDE2', 'DLB2', 'DLB1', 'DLB3', 'DCB1', 'DCB2', 'DS2'];
    blk.forEach((k, i) => { plan.brain[k] = wrap((S, pl, t) => { if (t < tK) return [0, 0]; const wp = [Math.min(L[0] - 12 - (i < 5 ? 0 : 5) + (i % 3), g - 4), CB(L[1] + ((i % 5) - 2) * 3.8)]; return t < tL + 0.4 ? seek(pl, wp, pl.vmax * 0.9) : seek(pl, pvAdd(S.pl.DS1.p, [-4 - (i % 3), ((i % 5) - 2) * 2.5]), pl.vmax * 0.8); }); });
    plan.brain.DS1 = wrap(() => [0, 0]);
    blk.slice(0, 6).forEach((k, i) => plan.pairs.push({ o: k, d: cov[[1, 3, 5, 7, 2, 6][i]], t0: tL - 0.4, t1: tL + 1.6 + i * 0.1, push: () => [0, 0], gap: 2 }));
    if (!(touchback && land > g + 0.5)) { const pre = pfSimulate(plan, []); const c = chooseNear(pre.rec, pre.N, f => [pre.rec.DS1[2 * f], pre.rec.DS1[2 * f + 1]], plan.ev.tC, 'O', ['OQB'], 2); plan.roles.tk = c[0].k; mags.push({ k: c[0].k, t0: plan.ev.tC - 0.6, t1: plan.ev.tC, at: pfHit('DS1', 1.05) }); if (c[1]) mags.push({ k: c[1].k, t0: plan.ev.tC - 0.2, t1: plan.ev.tC + 0.3, at: pfHit('DS1', 1.4) }); plan.down.DS1 = tEnd - 0.05; plan.down[c[0].k] = tEnd; }
    plan.tEnd = tEnd; plan.T = tEnd + 0.8; plan.ev.tK = tK; plan.ev.tL = tL;
    plan.camF = (t, f, bp) => [bp[0], bp[1] * 0.5, 46, 34];
    return pfFinish(P, plan, mags);
  }
  /* ===== trick plays, onside kicks (v9.12) ===== */
  // the ball carrier is brought down by whoever is closest when he is hit, with a second man helping
  const tackleOf = (CK, tC, tE, side, fixed) => { const pre = pfSimulate(plan, mags); const c = chooseNear(pre.rec, pre.N, f => [pre.rec[CK][2 * f], pre.rec[CK][2 * f + 1]], tC, side, fixed || [], 3); const tk1 = c[0] && c[0].k; if (!tk1) return; plan.roles.tk = tk1; mags.push({ k: tk1, t0: Math.max(ts + 0.3, tC - 0.55), t1: tC, at: pfHit(CK, 1.05) }); if (c[1]) mags.push({ k: c[1].k, t0: tC - 0.25, t1: tC + 0.3, at: pfHit(CK, 1.4) }); plan.down[CK] = tE - 0.05; plan.down[tk1] = tE; };
  // everyone without a plan: blockers fit on their man, then lead the way; defenders read, then run to the ball
  const genBrains = (drop) => {
    PF_O.forEach(r => { const k = 'O' + r; if (plan.brain[k]) return; const e = plan.pairs.find(x => x.o === k); plan.brain[k] = stance(ts + 0.04, (S, pl, t) => { if (e && t < e.t1) { const D = S.pl[e.d]; return seek(pl, pvSub(D.p, pvMul(pvNorm(pvSub(D.p, pl.p)), 1.7)), pl.vmax * 0.85); } const ck = carAt(t); if (ck && ck !== k && ck[0] === 'O') return seek(pl, pvAdd(S.pl[ck].p, [3 + h('ld' + k) * 3, (h('lb' + k) - 0.5) * 6]), pl.vmax * 0.75); return pvMul(pl.v, 0.6); }); });
    PF_D.forEach(r => { const k = 'D' + r; if (plan.brain[k]) return; const isDL = DLK.includes(k); plan.brain[k] = stance(ts + (isDL ? 0.08 : 0.15), (S, pl, t) => { if (!isDL && t < ts + (drop || 0.6)) return [2, 0]; return pursue(S, pl, isDL ? 0.85 : 0.95); }); });
  };
  if (kind === 'flea') { // flea flicker: handoff, the back flips it back, a deep shot
    offForm('gun', h('m') < 0.5 ? 1 : -1); alignD(); const td = !!P.td; const yy = td ? toGoal : clamp(P.y || 30, 15, toGoal);
    const q0 = F.OQB, r0 = F.ORB; const th = ts + 0.75, tb = th + 0.6, tThr = tb + 0.7; const M = [-4.7, sg * 1.2], R2 = [-2.6, sg * 0.8], Q2 = [-7.2, 0];
    addPath('OQB', [[ts, q0[0], q0[1]], [th, -5.0, sg * 0.3, 'm'], [tb, Q2[0], Q2[1], 's'], [tThr, Q2[0] + 0.4, 0], [tThr + 0.8, Q2[0] + 1.5, 0]]);
    addPath('ORB', [[ts + 0.05, r0[0], r0[1]], [th, M[0], M[1], 'm'], [tb, R2[0], R2[1], 's'], [tb + 1.2, R2[0] - 0.5, R2[1] + sg * 2]]);
    const air = Math.min(td ? toGoal + 2 : yy * 0.8, maxA - 2.5); const TK = 'OWR1'; const S0 = F[TK]; const CP = [air, CB(S0[1] * 0.85)]; const ft = pvDist(Q2, CP) / 19; const tCt = tThr + ft;
    addPath(TK, pfLegs(ts + 0.05, S0, [{ to: [S0[0] + 3, S0[1]], v: 4 }, { to: [air * 0.5, S0[1] * 0.92], v: 7.5, f: 's' }, { to: CP, v: 9.3, f: 'm' }]).map((k, i, a) => (i === a.length - 1 ? [tCt, k[1], k[2], 'm'] : k)));
    plan.ball.push({ t: 0, spot: [0, 0] }, { t: ts, fly: { from: [0, 0], to: 'OQB', t1: ts + 0.3, z: 0.5 } }, { t: ts + 0.3, hold: 'OQB' }, { t: th, hold: 'ORB' }, { t: tb, fly: { from: 'ORB', to: Q2, t1: tb + 0.35, z: 0.9 } }, { t: tb + 0.35, hold: 'OQB' }, { t: tThr, fly: { from: 'OQB', to: CP, t1: tCt, z: 2.2 + air * 0.09 } }, { t: tCt, hold: TK });
    plan.car = [[0, null], [ts, 'OQB'], [th, 'ORB'], [tb, 'OQB'], [tThr, null], [tCt, TK]]; plan.roles.t = TK; plan.lbl.push([tb + 0.1, 'Flea flicker!', 'good']); plan.ballTo = CP;
    const yac = yy - air; let tE; if (td) { const kn = pfLegs(tCt, CP, [{ to: [toGoal + 1.5, CP[1]], v: 8.6, go: true, f: 'm' }, { to: [Math.min(toGoal + 4, maxA - 1.5), CP[1]], v: 4 }]); kn[0][3] = 'm'; addPath(TK, kn); tE = pfLegsEnd(kn); plan.lbl.push([kn[kn.length - 2][0], P.tdLbl || 'Touchdown!', 'good']); }
    else { const E = [yy, CB(CP[1] + (h('fb') - 0.5) * 4)]; const kn = pfLegs(tCt, CP, yac > 1 ? [{ to: [yy - 0.6, E[1]], v: 8.4, go: true, f: 'm' }] : []); kn[0][3] = 'm'; const tC = pfLegsEnd(kn); kn.push([tC + 0.4, E[0], E[1]]); addPath(TK, kn); tE = tC + 0.4; plan.ev.tC = tC; }
    blockMap(OLK, DLK, []) && Object.entries(blockMap(OLK, DLK, [])).forEach(([ok, dk]) => plan.pairs.push({ o: ok, d: dk, t0: ts + 0.1, t1: tThr + 0.4, push: (S, t, e) => pvMul(pvNorm(pvSub(S.pl.OQB.p, e.c)), 0.4) }));
    // the linebackers bite on the run, the corner gets caught peeking
    LBK.forEach(k => { plan.brain[k] = stance(ts + 0.15, (S, pl, t) => (t < tb + 0.2 ? seek(pl, pvAdd(S.pl.ORB.p, [1.5, 0]), pl.vmax * 0.8) : pursue(S, pl, 0.95))); });
    const cbk = Math.sign(F.DCB1[1]) === Math.sign(S0[1]) ? 'DCB1' : 'DCB2'; plan.brain[cbk] = stance(ts + 0.15, (S, pl, t) => (t < tb ? seek(pl, pvAdd(S.pl[TK].p, [-0.5, 0]), pl.vmax * 0.55) : t < tCt ? seek(pl, pvAdd(S.pl[TK].p, [-1.2, 0]), pl.vmax) : pursue(S, pl, 0.97)));
    genBrains(0.7); plan.endKey = TK; plan.tEnd = tE; if (!td) tackleOf(TK, plan.ev.tC, tE, 'D');
    plan.T = tE + 0.9; plan.endA = yy; plan.camF = (t, f, bp) => [bp[0], bp[1] * 0.55, t < tThr ? 38 : 40, t < tThr ? 30 : 34];
    return pfFinish(P, plan, mags);
  }
  if (kind === 'rev') { // reverse: the back starts one way, hands it to a receiver going the other
    offForm('uc', h('m') < 0.5 ? 1 : -1); alignD(); const td = !!P.td; const y = td ? toGoal + 1.2 : clamp(P.y || 8, -3, toGoal);
    const q0 = F.OQB, r0 = F.ORB; const th = ts + 0.62, M = [-3.3, sg * 1.7]; const tx = th + 0.75, X2 = [-4.4, sg * 5.2]; const CK = Math.sign(F.OWR3[1]) === sg ? 'OWR1' : 'OWR3'; const w0 = F[CK];
    addPath('OQB', [[ts, q0[0], q0[1]], [th, -2.9, sg * 1.0, 'm'], [th + 1, -4.5, -sg * 2.5]]);
    addPath('ORB', [[ts + 0.05, r0[0], r0[1]], [th, M[0], M[1], 'm'], [tx, X2[0], X2[1], 'm'], [tx + 0.8, -1.5, sg * 9]]);
    addPath(CK, pfLegs(ts + 0.05, w0, [{ to: [-2.2, w0[1] * 0.7], v: 6 }, { to: X2, v: 8.4, f: 'm' }]).map((k, i, a) => (i === a.length - 1 ? [tx, X2[0], X2[1], 'm'] : k)));
    const holeB = CB(-sg * (12 + h('rh') * 6)); const legs = [{ to: [-3, holeB * 0.6], v: 8.5, go: true }, { to: [1, holeB], v: 9 }]; let tE;
    if (td) { legs.push({ to: [toGoal + 1.2, CB(holeB * 0.8)], v: 9, f: 'm' }, { to: [Math.min(toGoal + 4, maxA - 1.5), CB(holeB * 0.8)], v: 4 }); const kn = pfLegs(tx, X2, legs); kn[0][3] = 'm'; addPath(CK, kn); tE = pfLegsEnd(kn); plan.lbl.push([kn[kn.length - 2][0], P.tdLbl || 'Touchdown!', 'good']); }
    else { legs.push({ to: [y - 0.7, CB(holeB * 0.85)], v: 8.6, f: 'm' }); const kn = pfLegs(tx, X2, legs); kn[0][3] = 'm'; const tC = pfLegsEnd(kn); kn.push([tC + 0.4, y, CB(holeB * 0.85)]); addPath(CK, kn); tE = tC + 0.4; plan.ev.tC = tC; }
    plan.ball.push({ t: 0, spot: [0, 0] }, { t: ts, fly: { from: [0, 0], to: 'OQB', t1: ts + 0.08, z: 0 } }, { t: ts + 0.08, hold: 'OQB' }, { t: th, hold: 'ORB' }, { t: tx, hold: CK });
    plan.car = [[0, null], [ts, 'OQB'], [th, 'ORB'], [tx, CK]]; plan.roles.c = CK; plan.lbl.push([tx + 0.1, 'Reverse!', 'good']);
    Object.entries(blockMap(OLK.concat(['OTE']), DLK, LBK)).forEach(([ok, dk]) => plan.pairs.push({ o: ok, d: dk, t0: ts + 0.05, t1: 99, push: () => [0.3, -sg * 0.5] }));
    // the defense flows to the fake, then has to turn around
    PF_D.forEach(r => { const k = 'D' + r; plan.brain[k] = stance(ts + 0.12, (S, pl, t) => (t < tx + 0.3 ? seek(pl, pvAdd(S.pl.ORB.p, [2, sg * 2]), pl.vmax * 0.85) : pursue(S, pl, 0.95))); });
    genBrains(); plan.endKey = CK; plan.tEnd = tE; if (!td) tackleOf(CK, plan.ev.tC, tE, 'D');
    plan.T = tE + 0.9; plan.endA = td ? toGoal : y; plan.camF = (t, f, bp) => [bp[0] + 2, bp[1] * 0.5, 38, 32];
    return pfFinish(P, plan, mags);
  }
  if (kind === 'fakep' || kind === 'fakefg') { // a fake: the punter (or the holder) takes off
    const punt = kind === 'fakep';
    const Fo = punt ? { LT: [-0.7, -4.2], LG: [-0.7, -2.1], C: [-0.7, 0], RG: [-0.7, 2.1], RT: [-0.7, 4.2], TE: [-1.5, 5.6], WR3: [-1.5, -5.6], RB: [-5.4, 0], QB: [-14, 0], WR1: [-0.7, -21.5], WR2: [-0.7, 21.5] } : { LT: [-0.7, -4.2], LG: [-0.7, -2.1], C: [-0.7, 0], RG: [-0.7, 2.1], RT: [-0.7, 4.2], TE: [-0.8, 6.3], WR1: [-0.8, -6.3], WR2: [-1.5, 7.9], WR3: [-1.5, -7.9], QB: [-7, 0.5], RB: [-9.6, -2.6] };
    PF_O.forEach(r => { F['O' + r] = [CA(Fo[r][0]), Fo[r][1]]; });
    const Fd = punt ? { DE1: [1.2, -4.8], DT1: [1.2, -1.4], DT2: [1.2, 1.4], DE2: [1.2, 4.8], LB1: [3.6, -2.7], LB3: [3.6, 2.7], LB2: [Math.min(9, toGoal + 2), 0], CB1: [1.3, -21.5], CB2: [1.3, 21.5], S2: [Math.min(25, toGoal + 3), 0], S1: [Math.min(38, toGoal + 4), 0] } : { DT1: [1.1, -1.05], DT2: [1.1, 1.05], DE1: [1.1, -5.2], DE2: [1.1, 5.2], LB1: [1.2, -8.8], LB3: [1.2, 8.8], LB2: [3.3, 0], CB1: [1.6, -11.5], CB2: [1.6, 11.5], S1: [7, -4.5], S2: [7, 4.5] };
    PF_D.forEach(r => { F['D' + r] = [Math.min(Fd[r][0], maxA - 1), Fd[r][1]]; });
    ts = 0.45; const td = !!P.td; const y = td ? toGoal + 1.2 : clamp(P.y || 6, -4, toGoal); const CK = 'OQB'; const st = F.OQB; const tGot = ts + (punt ? 0.75 : 0.35);
    const side = h('fs') < 0.5 ? -1 : 1; const legs = [{ to: [st[0] + 2, side * 6], v: 6.5, go: true }, { to: [0.5, side * 9.5], v: 7.8 }]; let tE;
    if (td) { legs.push({ to: [toGoal + 1.2, side * 9], v: 8, f: 'm' }, { to: [Math.min(toGoal + 3.5, maxA - 1.5), side * 9], v: 4 }); const kn = pfLegs(tGot + 0.25, st, legs); addPath(CK, kn); tE = pfLegsEnd(kn); plan.lbl.push([kn[kn.length - 2][0], P.tdLbl || 'Touchdown!', 'good']); }
    else { legs.push({ to: [y - 0.6, side * 10], v: 7.6, f: 'm' }); const kn = pfLegs(tGot + 0.25, st, legs); const tC = pfLegsEnd(kn); kn.push([tC + 0.4, y, side * 10.4]); addPath(CK, kn); tE = tC + 0.4; plan.ev.tC = tC; }
    if (!punt) addPath('ORB', [[ts + 0.25, F.ORB[0], F.ORB[1]], [tGot + 0.3, -8.6, -1.4], [tGot + 0.7, -7.8, -0.6]]);
    plan.ball.push({ t: 0, spot: [0, 0] }, { t: ts, fly: { from: [0, 0], to: 'OQB', t1: tGot, z: punt ? 0.6 : 0.4 } }, { t: tGot, hold: 'OQB' });
    plan.car = [[0, null], [tGot, 'OQB']]; plan.roles.c = CK; plan.lbl.push([tGot + 0.35, punt ? 'Fake punt!' : 'Fake field goal!', 'good']);
    const used = new Set(); ['DDE1', 'DDT1', 'DDT2', 'DDE2'].forEach(dk => { let best = null, bd = 1e9; OLK.forEach(ok => { if (used.has(ok)) return; const d = Math.abs(F[ok][1] - F[dk][1]); if (d < bd) { bd = d; best = ok; } }); used.add(best); plan.pairs.push({ o: best, d: dk, t0: ts + 0.05, t1: tE, push: () => [0.2, side * 0.4] }); });
    genBrains(0.2); plan.endKey = CK; plan.tEnd = tE; if (!td) tackleOf(CK, plan.ev.tC, tE, 'D');
    plan.T = tE + 0.9; plan.endA = td ? toGoal : y; plan.camF = (t, f, bp) => [bp[0] + 3, bp[1] * 0.5, punt ? 42 : 36, 30];
    return pfFinish(P, plan, mags);
  }
  if (kind === 'onk') { // an onside kick: short, bouncing, and a scramble for it
    const lanes = [-20, -15, -11, -7, -3, 3, 7, 11, 15, 20]; const cov = ['OWR1', 'OLT', 'OLG', 'OTE', 'OC', 'ORG', 'ORT', 'OWR3', 'ORB', 'OWR2']; const kb = h('ob') < 0.5 ? -1 : 1;
    cov.forEach((k, i) => { F[k] = [-1.2, lanes[i]]; }); F.OQB = [-6, kb * -1.5];
    const Fd = { DE1: [10.5, -14], DT1: [10.5, -5], DT2: [10.5, 5], DE2: [10.5, 14], LB2: [11.5, 0], LB1: [15, -10], LB3: [15, 10], CB1: [19, -8], CB2: [19, 8], S2: [28, 0], S1: [42, 0] };
    PF_D.forEach(r => { F['D' + r] = Fd[r].slice(); }); const tK = 1.0; const L = [10.8 + h('ol') * 1.6, kb * (12 + h('ow') * 6)]; const tL = tK + 1.25; const won = !!P.won; const tR = tL + 0.65;
    addPath('OQB', [[0.15, F.OQB[0], F.OQB[1]], [tK, -0.4, kb * -0.3, 'm'], [tK + 1.2, 4, kb * 3]]);
    plan.ball.push({ t: 0, spot: [0, 0] }, { t: tK, fly: { from: [0, 0], to: [L[0] * 0.55, L[1] * 0.55], t1: tK + 0.5, z: 0.4 } }, { t: tK + 0.5, fly: { from: [L[0] * 0.55, L[1] * 0.55], to: L, t1: tL, z: 2.6 } });
    plan.car = [[0, null]]; plan.lbl.push([tK + 0.1, 'Onside kick!', '']); plan.ballTo = L;
    const brain = (k, i, side) => wrap((S, pl, t) => { if (t < (side ? tK : tK - 0.5)) return [0, 0]; const d = pvDist(pl.p, L); return seek(pl, pvAdd(L, [(side ? 1 : -1) * (0.8 + (i % 3) * 0.7), ((i % 5) - 2) * 1.2]), pl.vmax * (d < 6 ? 0.9 : 1)); });
    cov.forEach((k, i) => { plan.brain[k] = brain(k, i, 0); }); PF_D.forEach((r, i) => { plan.brain['D' + r] = brain('D' + r, i, 1); }); plan.brain.OQB = wrap((S, pl, t) => seek(pl, [6, 0], 4));
    const pre = pfSimulate(plan, []); const rc = chooseNear(pre.rec, pre.N, L, tL, won ? 'O' : 'D', ['OQB'], 1)[0]; const rk = rc ? rc.k : (won ? 'OWR1' : 'DLB2');
    mags.push({ k: rk, t0: tL - 0.35, t1: tR, at: () => L }); plan.ball.push({ t: tR, hold: rk }); plan.car.push([tR, rk]); plan.down[rk] = tR + 0.05; plan.roles.rc = rk;
    plan.lbl.push([tR, won ? 'Recovered by the kicking team!' : 'Recovered by the receiving team', won ? 'good' : 'bad']); plan.endKey = rk; plan.tEnd = tR + 0.3; plan.T = tR + 1.2; plan.endA = L[0]; plan.ev.tK = tK; plan.ev.tL = tL;
    plan.camF = (t) => [t < tK ? 4 : L[0], L[1] * 0.5, 30, 26];
    return pfFinish(P, plan, mags);
  }
  return pfChoreo(Object.assign({}, P, { kind: 'set' }));
}
// run the plan, then work out the ball, the camera and the look of every frame
function pfFinish(P, plan, mags) {
  if (P.kind !== 'set') plan.T = Math.min(plan.T, plan.tEnd + 0.65); /* a moment after the whistle, then the next play */
  const { N, rec } = pfSimulate(plan, mags); const { ball, air } = pfBallTrack(plan, rec, N);
  const cam = new Float32Array(N * 4); let c = null; const kp = 1 - Math.exp(-PF_DT / 0.32), kz = 1 - Math.exp(-PF_DT / 0.55);
  for (let f = 0; f < N; f++) { const t = f * PF_DT; const bp = [ball[3 * f], ball[3 * f + 1]]; const want = plan.camF ? plan.camF(t, f, bp, rec) : [bp[0], bp[1] * 0.5, 42, 30]; want[1] = clamp(want[1], -12, 12);
    if (!c) c = want.slice(); else { c[0] += (want[0] - c[0]) * kp; c[1] += (want[1] - c[1]) * kp; c[2] += (want[2] - c[2]) * kz; c[3] += (want[3] - c[3]) * kz; } cam.set(c, f * 4); }
  const form = {}; PF_ALL.forEach(k => { form[k] = [rec[k][0], rec[k][1]]; });
  const lbl = plan.lbl.length ? plan.lbl.slice().sort((a, b) => a[0] - b[0]) : []; const ln = lbl.length ? lbl[lbl.length - 1] : null;
  // trails: the carrier's run once he has the ball, and the ball's flight; a ring where a throw or a kick comes down
  const steps = plan.ball.slice().sort((a, b) => a.t - b.t); const trail = { run: null, air: null }; const spots = []; const fAt = t => Math.min(N - 1, Math.round(t / PF_DT));
  steps.forEach((s, i) => { const nx = steps[i + 1];
    if (s.fly && (s.fly.z || 0) >= 0.6) { trail.air = [s.t, s.fly.t1]; if (/^(pass|inc|int|punt|ko)$/.test(P.kind)) spots.push({ t0: s.t + 0.08, t1: s.fly.t1, p: [ball[3 * fAt(s.fly.t1)], ball[3 * fAt(s.fly.t1) + 1]] }); }
    if (s.hold && (s.hold !== 'OQB' || plan.roles.c === 'OQB')) trail.run = [s.t, Math.min(nx ? nx.t : plan.T, plan.tEnd + 0.1)]; });
  return { N, rec, ball, air, cam, form, T: plan.T, lbls: lbl, lbl: ln ? [ln[0] / plan.T, ln[1], ln[2]] : null, down: plan.down, car: plan.car, roles: plan.roles, endA: plan.endA, ev: plan.ev, tEnd: plan.tEnd, trail, spots };
}
/* ---------- staging and drawing ---------- */
// pf.stage holds the play on screen: what happened (P) and its simulation (sc)
function pfMake(P) { pf.tired = clamp(+P.tired || 0, 0, 1); try { const sc = pfChoreo(P); pfFlagFor(P, sc); return { P, sc }; } catch (e) { if (typeof console !== 'undefined') console.error('field view', e); return { P, sc: pfChoreo({ o: P.o, dir: P.dir, los: P.los, fd: P.fd, kind: 'set', key: P.key }) }; } }
function pfStage(P) { pf.stage = pfMake(P); return pf.stage; }
// a player's spot (or the ball's) between two simulation frames
function pfAt(sc, k, ft) { const r = sc.rec[k]; const f0 = Math.min(sc.N - 1, Math.floor(ft)), f1 = Math.min(sc.N - 1, f0 + 1), w = ft - f0; return [r[2 * f0] + (r[2 * f1] - r[2 * f0]) * w, r[2 * f0 + 1] + (r[2 * f1 + 1] - r[2 * f0 + 1]) * w]; }
function pfBallAt(sc, ft) { const r = sc.ball; const f0 = Math.min(sc.N - 1, Math.floor(ft)), f1 = Math.min(sc.N - 1, f0 + 1), w = ft - f0; return [0, 1, 2].map(i => r[3 * f0 + i] + (r[3 * f1 + i] - r[3 * f0 + i]) * w); }
function pfCarAt(sc, t) { let k = null; (sc.car || []).forEach(c => { if (c[0] <= t + 1e-6) k = c[1]; }); return k; }
const pfAng = (a, b) => { let d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
// colors, numbers, end zones and the lines, once per play
function pfColorStage(st) {
  const P = st.P; st.colored = true; const oc = pf.col[P.o], dc = pf.col[1 - P.o]; const on = pf.nums[P.o], dn = pf.nums[1 - P.o]; const kick = P.kind === 'fg' || P.kind === 'xp';
  Object.keys(pf.dots).forEach(key => { const g = pf.dots[key]; const isO = key[0] === 'O'; const c = isO ? oc : dc; const role = key.slice(1);
    const num = isO ? (P.kind === 'punt' && role === 'QB' ? on.P : P.kind === 'ko' && role === 'QB' ? on.K : kick && role === 'RB' ? on.K : kick && role === 'QB' ? on.P : on[role]) : dn[role];
    const cir = g.children[0], nose = g.children[1], tx = g.children[2]; cir.setAttribute('fill', c[0]); cir.setAttribute('stroke', c[1]); nose.setAttribute('fill', pfDist(c[1], c[0]) > 90 ? c[1] : pfLum(c[0]) > 0.6 ? '#111' : '#fff');
    tx.textContent = num; tx.setAttribute('fill', pfLum(c[0]) > 0.6 ? '#111' : '#fff');
    let me = pf.me && (isO ? P.o === pf.me.side && pf.me.o : P.o !== pf.me.side && !pf.me.o) && role === pf.me.role;
    if (pf.me && !pf.me.spec && (kick || P.kind === 'punt' || P.kind === 'ko')) me = false; /* special teams: only kickers and punters are marked */
    if (pf.me && pf.me.spec) { const mr = pf.me.spec === 'K' ? (kick ? 'RB' : P.kind === 'ko' ? 'QB' : null) : P.kind === 'punt' ? 'QB' : null; me = isO && P.o === pf.me.side && role === mr; } /* kickers and punters are on the field for their kicks */
    g.classList.toggle('me', !!me); g.classList.remove('down', 'car'); });
  const lt = P.dir > 0 ? P.o : 1 - P.o; const ez = pf.el.querySelectorAll('.pfez'); const ezt = pf.el.querySelectorAll('.pfezt');
  [lt, 1 - lt].forEach((s, i) => { ez[i].setAttribute('fill', pf.col[s][0]); ezt[i].textContent = pf.ab[s]; ezt[i].setAttribute('fill', pfLum(pf.col[s][0]) > 0.6 ? '#111' : '#fff'); });
  const lx = pfX(P, 0), fx = P.fd != null ? pfX(P, P.fd - P.los) : null; pf.los.setAttribute('x1', lx); pf.los.setAttribute('x2', lx); pf.fd.style.display = fx == null || P.fd >= 100 ? 'none' : ''; if (fx != null) { pf.fd.setAttribute('x1', fx); pf.fd.setAttribute('x2', fx); }
  pf.lbl.textContent = ''; pf.lbl.setAttribute('class', 'pflbl'); pf.trR.setAttribute('d', ''); pf.trA.setAttribute('d', ''); pf.spot.style.opacity = 0; pf.lblI = -1;
}
// draws one moment of the staged play. ph: 0 = sliding into formation (k = progress), 1 = the play at u (0 to 1)
function pfDraw(st, ph, u, k) {
  if (!pf.svg || !st) return; const P = st.P, sc = st.sc; if (!st.colored) pfColorStage(st);
  const t = ph === 1 ? clamp(u, 0, 1) * sc.T : 0; const ft = Math.min(sc.N - 1, t / PF_DT); const dir = P.dir;
  let car = ph === 1 && t > 0.2 ? pfCarAt(sc, t) : null; if (car === 'OQB' && sc.roles.c !== 'OQB') car = null; const pos = (a, b) => [pfX(P, a), PF_MID + b];
  PF_ALL.forEach(key => {
    const g = pf.dots[key]; let x, y; const base = key[0] === 'O' ? (dir > 0 ? 0 : 180) : (dir > 0 ? 180 : 0); let want = base;
    if (ph === 0) { const fp = sc.form[key]; const [fx, fy] = pos(fp[0], fp[1]); const from = pf.pos[key] || [fx, fy]; x = pfLerp(from[0], fx, k); y = pfLerp(from[1], fy, k); }
    else { const p = pfAt(sc, key, ft); [x, y] = pos(p[0], p[1]); const q = pfAt(sc, key, Math.max(0, ft - 4)); const vx = (p[0] - q[0]) * dir, vy = p[1] - q[1]; want = Math.hypot(vx, vy) > 0.22 ? Math.atan2(vy, vx) * 57.2958 : pf.hd[key] != null ? pf.hd[key] : base; }
    let hd = pf.hd[key]; hd = hd == null ? want : hd + pfAng(hd, want) * (ph === 0 ? 0.2 : 0.3); pf.hd[key] = hd;
    const down = ph === 1 && sc.down && sc.down[key] != null && t >= sc.down[key]; if (g.classList.contains('down') !== down) g.classList.toggle('down', down);
    const isCar = key === car; if (g.classList.contains('car') !== isCar) g.classList.toggle('car', isCar);
    pf.cpos[key] = [x, y]; g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})${down ? ' scale(0.88)' : ''}`); g.children[1].setAttribute('transform', `rotate(${hd.toFixed(1)})`);
  });
  // the ball: in a hand, in the air (higher means a bigger ball and a shadow), or on the ground
  const bp = ph === 1 ? pfBallAt(sc, ft) : [sc.ball[0], sc.ball[1], 0]; const [bx, by] = pos(bp[0], bp[1]); const z = bp[2]; const lift = z * 0.35;
  const bq = ph === 1 ? pfBallAt(sc, Math.max(0, ft - 3)) : bp; const dvx = (bp[0] - bq[0]) * dir, dvy = (bp[1] - bq[1]) - (bp[2] - bq[2]) * 0.35; if (Math.hypot(dvx, dvy) > 0.12) pf.bhd = Math.atan2(dvy, dvx) * 57.2958; else if (ph === 0) pf.bhd = dir > 0 ? 0 : 180;
  const sz = 1 + z * 0.035; pf.ball.setAttribute('cx', bx.toFixed(2)); pf.ball.setAttribute('cy', (by - lift).toFixed(2)); pf.ball.setAttribute('rx', (0.6 * sz).toFixed(2)); pf.ball.setAttribute('ry', (0.38 * sz).toFixed(2));
  pf.ball.setAttribute('transform', `rotate(${(pf.bhd || 0).toFixed(1)} ${bx.toFixed(2)} ${(by - lift).toFixed(2)})`);
  pf.shadow.setAttribute('cx', bx.toFixed(2)); pf.shadow.setAttribute('cy', (by + 0.2).toFixed(2)); pf.shadow.style.opacity = z > 0.25 ? Math.max(0.15, 0.4 - z * 0.015) : 0;
  // trails: the path the ball carrier ran and the flight of the ball
  if (ph === 1) {
    const tr = (span, airy) => { if (!span || t < span[0]) return ''; const f0 = Math.round(span[0] / PF_DT), f1 = Math.min(Math.round(Math.min(t, span[1]) / PF_DT), sc.N - 1); if (f1 - f0 < 2) return ''; let d = ''; for (let f = f0; f <= f1; f += 2) { const [x, y] = pos(sc.ball[3 * f], sc.ball[3 * f + 1]); d += (d ? 'L' : 'M') + x.toFixed(2) + ' ' + (y - (airy ? sc.ball[3 * f + 2] * 0.35 : 0)).toFixed(2); } return d; };
    pf.trR.setAttribute('d', tr(sc.trail && sc.trail.run, false)); pf.trA.setAttribute('d', tr(sc.trail && sc.trail.air, true));
    if (pf.flag) { const fl = sc.flag; if (fl && t >= fl.t) { const k = clamp((t - fl.t) / 0.45, 0, 1); const [fx0, fy0] = pos(fl.from[0], fl.from[1]), [fx1, fy1] = pos(fl.p[0], fl.p[1]); const fx = pfLerp(fx0, fx1, k), fy = pfLerp(fy0, fy1, k) - Math.sin(k * Math.PI) * 2.2; pf.flag.setAttribute('transform', `translate(${fx.toFixed(2)} ${fy.toFixed(2)}) rotate(${(k * 540).toFixed(0)})`); pf.flag.style.opacity = 1; } else pf.flag.style.opacity = 0; }
    if (pf.ref) { const fl = sc.flag; const show = !!(fl && t >= (sc.tEnd || sc.T) + 0.15); if (show !== !pf.ref.hidden) { pf.ref.hidden = !show; if (show) { pf.ref.querySelector('span').innerHTML = `<b>Flag</b> ${esc(fl.txt)}`; pf.ref.querySelector('svg').innerHTML = pfRefSvg(fl.sig); } } }
    const sp = (sc.spots || []).find(s => t >= s.t0 && t < s.t1); if (sp) { const [x, y] = pos(sp.p[0], sp.p[1]); pf.spot.setAttribute('cx', x.toFixed(2)); pf.spot.setAttribute('cy', y.toFixed(2)); pf.spot.style.opacity = 0.9; } else pf.spot.style.opacity = 0;
  }
  // the camera: the play decides what to show; it stays inside the stadium and keeps the field's shape
  const fi = ph === 1 ? Math.round(ft) : 0; const cv = sc.cam; const w = pf.svg.clientWidth || 600, h = pf.svg.clientHeight || 300; const asp = Math.max(0.8, w / h);
  const mode0 = pfCamNow(); const tilt = mode0 === 'tilt'; if (pf.el && pf.el.classList.contains('pftilt') !== tilt) pf.el.classList.toggle('pftilt', tilt); const mode = tilt ? 'tv' : mode0; const rot = mode === 'ez' ? (dir > 0 ? -90 : 90) : 0; let want;
  if (pf.rot !== rot && pf.world) { pf.rot = rot; pf.camSet = false; pf.world.setAttribute('transform', rot ? `rotate(${rot})` : ''); Object.values(pf.dots).forEach(g => g.children[2].setAttribute('transform', rot ? `rotate(${-rot})` : '')); }
  if (rot) { const fx = pos(cv[4 * fi], 0)[0] + dir * 7; const c = rot === -90 ? [PF_MID, -fx] : [-PF_MID, fx]; want = [c[0], c[1], 62 / asp]; } /* end zone: behind the offense, looking downfield */
  else {
    let vh = Math.min(PF_H + 6, Math.max(cv[4 * fi + 2] * (asp < 1.9 ? 0.9 : 1), cv[4 * fi + 3] / asp)); /* phones: a little closer */ let [cx, cy] = pos(cv[4 * fi], cv[4 * fi + 1]);
    if (mode === 'wide') vh = Math.max(vh, 50); /* all-22: the whole width of the field */
    if (mode === 'me') { const mk = Object.keys(pf.dots).find(k => pf.dots[k].classList.contains('me')); if (mk && pf.cpos[mk]) { [cx, cy] = pf.cpos[mk]; vh = Math.min(vh, 30); } }
    const W = vh * asp; const X = W >= 128 ? 60 : clamp(cx, W / 2 - 4, 124 - W / 2), Y = mode === 'wide' || vh >= PF_H + 2 ? PF_MID : clamp(cy, vh / 2 - 1, PF_H + 1 - vh / 2); want = [X, Y, vh];
  }
  if (!pf.camSet || !Array.isArray(pf.cam) || pf.cam.length < 3) { pf.cam = want; pf.camSet = true; } else { const kk = ph === 0 ? 0.1 : 0.22; pf.cam = pf.cam.map((v, i) => v + (want[i] - v) * kk); }
  const [CX, CY, VH] = pf.cam; const VW = VH * asp; pf.W = VW;
  pf.svg.setAttribute('viewBox', `${(CX - VW / 2).toFixed(2)} ${(CY - VH / 2).toFixed(2)} ${VW.toFixed(2)} ${VH.toFixed(2)}`);
  const fs = clamp(VH * 0.085, 2.6, 4.4); pf.lbl.setAttribute('x', CX.toFixed(2)); pf.lbl.setAttribute('y', (CY - VH / 2 + VH * 0.2 + fs).toFixed(2)); /* below the announcer's line */ pf.lbl.style.fontSize = fs.toFixed(2) + 'px';
  // the call on the field: "Touchdown!", "Sacked!", "Fair catch"...
  if (ph === 1 && sc.lbls && sc.lbls.length) { let li = -1; sc.lbls.forEach((L, i) => { if (t >= L[0]) li = i; }); if (li !== pf.lblI) { pf.lblI = li; const L = sc.lbls[li]; pf.lbl.textContent = L ? L[1] : ''; pf.lbl.setAttribute('class', L ? 'pflbl show ' + L[2] : 'pflbl'); } }
}
// queue a play: it slides into formation, holds a beat, runs at football speed, and holds the result
function pfQueue(P, cap, fx, grp) {
  if (!pf.el) return; const f = motionOn() ? pfSpeed() * (fx || 1) : 0; const st = pfMake(P); if (cap == null && (P.kind === 'xp' || P.kind === 'ko')) cap = pfCap(null, P);
  const set = P.kind === 'set'; const T = st.sc.T; const run = set ? 0 : (T <= 6 ? T : 6 + (T - 6) * 0.6) * 1000 * PF_PB;
  const item = { P, st, cap, g: grp != null ? grp : (pf.gid = (pf.gid || 0) + 1), d: set ? [320 * f, 120 * f, 0, 0] : [300 * f, 160 * f, run * f, 380 * f] }; item.total = item.d.reduce((a, b) => a + b, 0) || 0;
  // never fall behind the game: if plays pile up (fast play calling), skip ahead to the newest
  if (!pf.replay) { const gs = [...new Set(pf.q.map(x => x.g))].filter(x => x !== item.g); if (gs.length >= 2) pf.q = pf.q.filter(x => x.g === gs[gs.length - 1] || x.g === item.g); }
  pf.q.push(item); const now = performance.now(); pf.until = (pf.cur ? Math.max(now, pf.cur.t0 + pf.cur.total) : now) + pf.q.reduce((a, x) => a + x.total, 0);
  if (!pf.raf) pf.raf = requestAnimationFrame(pfLoop);
}
function pfLoop(now) {
  pf.raf = 0; const dt = pf.lastNow ? Math.min(100, now - pf.lastNow) : 0; pf.lastNow = now;
  if (pf.cur && (pf.paused || pf.slow)) { const hold = pf.paused ? dt : dt * 0.6; pf.cur.t0 += hold; pf.until += hold; } /* paused: the play (and the live game behind it) waits; slow motion: 40% speed */
  if (!pf.cur && pf.q.length && !pf.paused) { pf.cur = pf.q.shift(); pf.cur.t0 = now; if (pf.cur.ctx) Object.assign(pf, pf.cur.ctx); if (pf.cur.P.kind !== 'set') { pf.hist.unshift(pf.cur); if (pf.hist.length > 8) pf.hist.length = 8; } if (pf.ref) pf.ref.hidden = true; pfCrowd(pf.cur.P); pf.pos = Object.assign({}, pf.cpos); pf.stage = pf.cur.st; pf.stage.colored = false; if (pf.cap) pf.cap.textContent = pf.cur.cap || ''; if (pf.call) { pf.call.textContent = pfCallPre(pf.stage); pf.cur.called = false; } }
  const it = pf.cur;
  if (it) {
    const st = it.st, e = now - it.t0; const [a, b, c] = it.d; const tCall = st.sc.T > 0 ? clamp(((st.sc.tEnd || st.sc.T) + 0.1) / st.sc.T, 0, 1) : 1;
    if (it.total <= 0) { pfDraw(st, 0, 0, 1); pfDraw(st, 1, 1); if (pf.call) pf.call.textContent = pfCallText(st); pf.cur = null; }
    else if (e < a) pfDraw(st, 0, 0, pfEase(e / a));
    else if (e < a + b || !c) pfDraw(st, 0, 0, 1);
    else if (e < a + b + c) pfDraw(st, 1, (e - a - b) / c);
    else pfDraw(st, 1, 1);
    if (it.total > 0 && e >= it.total) pf.cur = null;
    if (pf.call && it.P.kind !== 'set' && c && e >= a + b + c * tCall && !it.called) { it.called = true; pf.call.textContent = pfCallText(st); }
  }
  if (pf.cur || pf.q.length) pf.raf = requestAnimationFrame(pfLoop); else pf.lastNow = 0;
}
pf.cpos = {};
/* ---------- replay controls, cameras, weather, night games, highlight reels (v9.12) ---------- */
const PF_CAMS = [['tv', 'TV'], ['tilt', '3D'], ['wide', 'All-22'], ['ez', 'End zone'], ['me', 'Me']];
function pfCamNow() { const m = prefs.fcam || 'tv'; return m === 'me' && !pf.me ? 'tv' : m; }
function pfCtlLabels() { if (!pf.ctl) return; const b = k => pf.ctl.querySelector(`[data-pf="${k}"]`); const p = b('pause'), s = b('slow'), c = b('cam'); if (p) { p.textContent = pf.paused ? '▶' : '❚❚'; p.setAttribute('aria-pressed', String(!!pf.paused)); } if (s) s.classList.toggle('on', !!pf.slow); if (c) c.textContent = (PF_CAMS.find(x => x[0] === pfCamNow()) || PF_CAMS[0])[1]; }
function pfCtl(k) {
  if (k === 'pause') { pf.paused = !pf.paused; if (!pf.paused && (pf.cur || pf.q.length) && !pf.raf) pf.raf = requestAnimationFrame(pfLoop); }
  else if (k === 'slow') pf.slow = !pf.slow;
  else if (k === 'cam') { const list = PF_CAMS.filter(c => c[0] !== 'me' || pf.me).map(c => c[0]); const i = list.indexOf(pfCamNow()); setPref('fcam', list[(i + 1) % list.length]); pf.camSet = false; if (pf.stage && !pf.cur) { pf.stage.colored = true; pfDraw(pf.stage, 1, 1); } }
  else if (k === 'again' || k === 'prev') { const it = pf.hist[k === 'again' ? (pf.cur ? 0 : 0) : (pf.cur ? 1 : 1)] || pf.hist[0]; if (!it) return; const copy = Object.assign({}, it, { t0: 0, called: false }); if (pf.cur && k === 'again' && pf.cur === it) { pf.cur.t0 = performance.now() - pf.cur.d[0]; pf.cur.called = false; } else { pf.q.unshift(copy); if (pf.cur) { pf.until += copy.total; } else { pf.until = performance.now() + pf.q.reduce((a, x) => a + x.total, 0); } } pf.hist = pf.hist.filter(x => x !== copy); if (!pf.raf) pf.raf = requestAnimationFrame(pfLoop); }
  pfCtlLabels();
}
// rain, snow, wind and the lights for a night game
function pfWeather(wx, night) {
  if (!pf.el) return; const k = wx && wx.k ? wx.k : 'clear'; pf.el.classList.toggle('wx-rain', k === 'rain'); pf.el.classList.toggle('wx-snow', k === 'snow'); pf.el.classList.toggle('night', !!night);
  const w = pf.el.querySelector('.pfwind'); if (w) { const txt = []; if (night) txt.push('Night game'); if (k !== 'clear' && WX[k]) txt.push(WX[k].label + (wx.temp != null ? ', ' + wx.temp + '°' : '')); if (k === 'wind') txt.push('gusts ' + (14 + Math.round(hash(String(wx.temp) + k) * 16)) + ' mph ➜'); w.textContent = txt.join(' · '); w.hidden = !txt.length; }
}
// the colors and numbers of one game, for reels that jump between games
function pfCtxFor(ids, careerG) {
  if (careerG) { const g = careerG; const nums = [pfNums(g.ids[0] + ':' + (g.names ? g.names[0] : ''), true), pfNums(g.ids[1] + ':' + (g.names ? g.names[1] : ''), true)]; const role = pfMyRole(cs.p.pos, g.rank); const me = role && g.share > 0 ? { side: g.mi, o: g.side === 'off', role, spec: cs.p.pos === 'K' || cs.p.pos === 'P' ? cs.p.pos : null } : null; if (me) nums[g.mi][me.spec || role] = g.num != null ? g.num : cs.p.num; const names = [{}, {}]; if (me) names[g.mi][nums[g.mi][me.spec || role]] = cs.p.last || cName(cs.p); return { col: pfContrast([pfCareerColors(g, 0), pfCareerColors(g, 1)]), nums, ab: g.ids.slice(), names, me }; }
  return { col: pfContrast([pfColors(ids[0]), pfColors(ids[1])]), nums: [pfNums(ids[0]), pfNums(ids[1])], ab: ids.map(id => (id === ME && !(typeof isComm === 'function' && isComm()) ? myAb() : isFCS(id) ? 'FCS' : id)), names: [pfNamesFor(ids[0]), pfNamesFor(ids[1])], me: null };
}
// your ten best plays of the season, counted down
function pfTop10(L) {
  if (!L || !L.length) return false; const g0 = L[0].g; pfReset({ ids: [g0.h, g0.a], first: 0, ckKey: 'top10', log: [], box: g0.box, mSide: [g0.h, g0.a].indexOf(ME) }); pf.replay = true; pf.spdF = () => 1;
  const n = L.length; L.slice().reverse().forEach((e, i) => { const ids = [e.g.h, e.g.a]; const ctx = pfCtxFor(ids); Object.assign(pf, ctx); const n0 = pf.q.length;
    pfDrive({ ids, ckKey: e.g.hl.k, log: e.g.hl.d, box: e.g.box }, Object.assign({}, e.x, { man: false })); const it = pf.q[pf.q.length - 1];
    if (it && pf.q.length > n0) { it.ctx = ctx; it.cap = `No. ${n - i} · ${it.cap} · ${teamName(e.g.h === ME ? e.g.a : e.g.h)}, ${weekLabel(e.g.wk)}`; } });
  return true;
}
function pfCareerReel() {
  const R_ = cs && cs.x && cs.x.reel; if (!R_ || !R_.length) return false; const g0 = R_[0].g; const num0 = cs.p.num; cs.p.num = g0.num != null ? g0.num : num0; pfResetCareer(Object.assign({ log: [], snaps: [] }, g0)); cs.p.num = num0; pf.replay = true; pf.spdF = () => 1;
  const L = R_.slice(0, 10); L.slice().reverse().forEach((e, i) => { const ctx = pfCtxFor(null, e.g); Object.assign(pf, ctx); const P = pfSnapPlay(e.g, e.x); pfQueue(P, `No. ${L.length - i} · ${e.y} vs. ${e.opp || 'opponent'}${P.td ? ' · Touchdown' : ''}`); const it = pf.q[pf.q.length - 1]; if (it) it.ctx = ctx; });
  return true;
}


/* ---------- reading the game ---------- */
function pfKind(pl) { return pl.sack ? 'sack' : pl.int ? 'int' : pl.fum ? 'fum' : pl.pass ? (pl.comp ? 'pass' : 'inc') : 'run'; }
function pfCap(sim, P) {
  const tm = pf.ab ? pf.ab[P.o] : ''; const num = n => (n != null ? '#' + n : '');
  const y = P.y, yd = Math.abs(y) + ' yard' + (Math.abs(y) === 1 ? '' : 's');
  const t = { run: `${num(P.n) || 'Run'} ${y > 0 ? 'for ' + yd : y === 0 ? 'for no gain' : 'loses ' + yd}`, pass: `Pass complete${P.n != null ? ' to #' + P.n : ''}, ${yd}`, inc: 'Pass incomplete', sack: `Sacked, loss of ${Math.abs(y)}`, int: 'Intercepted', fum: 'Fumble', punt: 'Punt', fg: `${P.dist}-yard field goal: ${P.good ? 'good' : 'no good'}`, xp: `Extra point: ${P.good ? 'good' : 'no good'}`, ko: 'Kickoff', two: `Two-point try: ${P.good ? 'good' : 'no good'}`, onk: `Onside kick: ${P.won ? 'recovered' : 'lost'}`, flea: `Flea flicker, ${yd}`, rev: `Reverse, ${yd}`, fakep: `Fake punt, ${yd}`, fakefg: `Fake field goal, ${yd}` }[P.kind] || '';
  return `${tm}${P.down ? ' · ' + ['1st', '2nd', '3rd', '4th'][P.down - 1] + ' & ' + (100 - P.los < P.togo ? 'goal' : P.togo) : ''} · ${t}${P.td ? ' · Touchdown' : ''}${P.pbn ? ' · ' + P.pbn : ''}${P.tired >= 0.5 ? ' · Tired legs' : ''}`;
}
// plays you (or your staff) called in the drive on screen
function pfFlushDs() {
  const ds = pf.ds; const sim = pf.sim; if (!ds || !sim) return; const n = ds.plays.length; if (n <= pf.seen) return;
  const from = Math.max(pf.seen, n - 2); let los = ds.start, down = 1, togo = 10;
  for (let i = 0; i < n; i++) {
    const pl = ds.plays[i]; const gain = pl.sack ? (pl.ly || pl.yl || -5) : pl.y || 0;
    if (i >= from && i >= pf.seen) {
      const kind = pfKind(pl); const P = { o: pf.dsSide, dir: pfDir(pf.dsSide, pf.dsQ), los, fd: Math.min(100, los + togo), kind, call: ds.calls[i], y: kind === 'sack' ? gain : kind === 'inc' || kind === 'int' ? 0 : gain, n: pl.who && pl.who.num != null ? pl.who.num : null, td: !pl.int && !pl.fum && los + gain >= 100, key: sim.ckKey + ':' + sim.i + ':' + i, down, togo };
      if (P.td) P.y = 100 - los; P.tired = clamp((i - 4) / 8, 0, 1); { const pb = ds.pb && ds.pb[i]; const d = pb && typeof pbkDef === 'function' ? pbkDef(pb) : null; if (d) { P.pbn = d.n; const cr = pbkCr(d); if (cr && kind !== 'run' && kind !== 'fum') { P.cr = cr; P.tg = 'O' + cr.tg; } } } { const dp = ds.dpb && ds.dpb[i]; const dd = dp && typeof dpbDef === 'function' ? dpbDef(dp) : null; if (dd) { P.pbn = dd.n; P.dcr = dpbCr(dd); } } /* a defensive playbook call (v9.15) */ pfQueue(P, pfCap(sim, P));
    }
    if (pl.int || pl.fum) break; los = clamp(los + gain, 1, 100); togo -= gain; if (togo <= 0) { down = 1; togo = 10; } else down++;
  }
  pf.seen = n;
}
// a finished drive from the log. Drives you called already played out; only their kick is left to show.
function pfDrive(sim, x) {
  const s = x.s, dir = pfDir(s, x.ot ? 3 : x.qtr); const key = sim.ckKey + ':' + sim.log.indexOf(x);
  let endA; if (x.out === 'td') endA = 100; else if (x.out === 'fg' && x.fg) endA = clamp(117 - x.fg, 1, 99); else endA = clamp((pf.next[s] || 25) + (x.yards || 0), 1, 99);
  if (x.man) { endA = x.endYl != null ? x.endYl : endA; }
  const q = [];
  if (!x.man && x.pl) {
    let los = endA; const pls = x.pl; const list = [];
    for (let i = pls.length - 1; i >= 0; i--) {
      const p = pls[i]; const kind = { r: 'run', p: 'pass', x: 'inc', s: 'sack', i: 'int', f: 'fum' }[p.k] || 'run'; const last = i === pls.length - 1;
      let gain = kind === 'inc' || kind === 'int' || kind === 'fum' ? 0 : p.y || 0; let start;
      if (last && x.out === 'td') { start = clamp(100 - Math.max(1, gain), 1, 99); gain = 100 - start; } else start = clamp(los - gain, 1, 99);
      list.unshift({ o: s, dir, los: start, fd: Math.min(100, start + 10), kind, y: gain, n: p.n, td: last && x.out === 'td', p6: last && !!x.p6, key: key + ':' + i, call: kind === 'pass' && gain >= 16 ? 'deep' : '' });
      los = start;
    }
    list.forEach(P => q.push(P));
  }
  if (x.out === 'punt') q.push({ o: s, dir, los: endA, fd: null, kind: 'punt', dist: 38 + Math.round(hash(key + 'pd') * 12), ret: Math.round(hash(key + 'pr') * 10), key: key + ':k' });
  if (x.out === 'fg') q.push({ o: s, dir, los: endA, fd: null, kind: 'fg', dist: x.fg || 117 - endA, good: !!x.good, key: key + ':k' });
  const grp = pf.gid = (pf.gid || 0) + 1;
  { const L_ = q[q.length - 1]; if (L_ && !x.man) { const tv = hash(key + ':trick'); if (L_.kind === 'pass' && L_.y >= 30 && tv < 0.14) L_.kind = 'flea'; else if (L_.kind === 'run' && L_.y >= 15 && tv < 0.12) L_.kind = 'rev'; } } /* now and then the big play was a trick play */
  q.slice(-1).forEach(P => { if (x.np) P.tired = clamp((x.np - 5) / 8, 0, 1); pfQueue(P, pfCap(sim, P), 1, grp); }); /* one play a drive: the one that decided it */
  // where the other team starts next
  const o = 1 - s; pf.next[o] = x.out === 'td' || x.out === 'fg' || x.p6 ? 25 : x.out === 'punt' ? clamp(100 - Math.min(endA + 40, 100), 10, 40) || 20 : clamp(100 - endA, 1, 99);
  // after a score: the extra point (good when the score went up by 7) and the kickoff
  if (!pf.replay && (x.out === 'td' || x.p6 || (x.out === 'fg' && x.good))) {
    const sc = x.p6 ? o : s; const prev = pfPrevPts(sim, x); const made = x.pts && prev ? x.pts[sc] - prev[sc] : 7;
    const dir2 = pfDir(sc, x.ot ? 3 : x.qtr);
    if (x.two) pfQueue({ o: sc, dir: dir2, los: isPro() ? 98 : 97, fd: 100, kind: 'two', good: !!x.two.good, pass: hash(key + ':2p') < 0.55, key: key + ':two' }, `${pf.ab[sc]} · Two-point try: ${x.two.good ? 'good' : 'no good'}`, 0.8, grp);
    else if (x.out === 'td' || x.p6) pfQueue(pfXP(sc, dir2, made !== 6, key + ':xp'), null, 0.55, grp);
    if (x.onside) pfQueue({ o: sc, dir: dir2, los: 35, fd: null, kind: 'onk', won: x.onside === 'won', key: key + ':onk' }, `${pf.ab[sc]} · Onside kick: ${x.onside === 'won' ? 'recovered!' : 'the other team has it'}`, 0.9, grp);
    else pfQueue(pfKO(sc, dir2, key + ':ko'), null, 0.65, grp);
  }
}
// the score before this drive
function pfPrevPts(sim, x) { const i = sim.log.indexOf(x); for (let j = i - 1; j >= 0; j--) if (sim.log[j] && sim.log[j].pts) return sim.log[j].pts; return [0, 0]; }
// an extra point: from the 15 in the NFL, the 3 in college
function pfXP(s, dir, good, key) { const los = (pf.cg ? pf.cg.lvl === 'nfl' : isPro()) ? 85 : 97; return { o: s, dir, los, fd: null, kind: 'xp', dist: 117 - los, good, key }; }
// a kickoff from the 35; the other team starts at its 25 (a touchback, or a return that gets there)
function pfKO(s, dir, key) { return { o: s, dir, los: 35, fd: null, kind: 'ko', endYl: 25, key }; }
// called after every live render: queue whatever happened since the last look
function pfSync() {
  const sim = live.sim; if (!sim || !fieldOn() || !sim.box) return;
  if (pf.sim !== sim || pf.cg || !pf.el) pfReset(sim);
  const slot = $('#modal .pfslot'); if (slot && pf.el.parentNode !== slot) slot.appendChild(pf.el);
  pfFlushDs();
  const n = sim.log.length; if (n - pf.lastLog > 3) pf.lastLog = n - 1; // a big jump (two-minute drill, a skip): show the last drive only
  if (!n && !pf.koDone && !pf.replay) { pf.koDone = true; pfQueue(pfKO(1 - sim.first, pfDir(1 - sim.first, 1), sim.ckKey + ':ko0'), null, 0.75); }
  while (pf.lastLog < n) { const x = sim.log[pf.lastLog++]; if (!x.half) pfDrive(sim, x); else if (!pf.replay && !pf.koHalf) { pf.koHalf = true; pfQueue(pfKO(sim.first, pfDir(sim.first, 3), sim.ckKey + ':ko2'), null, 0.75); } }
  const p = sim.pending; const ds = p && (p.type === 'drive' || p.type === 'ddrive') ? p.ds : null;
  if (ds && ds !== pf.ds) { pf.ds = ds; pf.dsSide = p.s; pf.dsQ = p.ot ? 3 : p.qtr; pf.seen = 0; if (!ds.plays.length) { const P = { o: p.s, dir: pfDir(p.s, pf.dsQ), los: ds.yl, fd: Math.min(100, ds.yl + ds.togo), kind: 'set' }; pfQueue(Object.assign(P, { kind: 'set' }), `${pf.ab[p.s]} ball · 1st & 10`); } }
  pfFlushDs();
}

/* ---------- Player Career games ---------- */
// The same field for your games as a player: your dot wears your number and a gold ring. Your own snaps play out in
// full; the other drives show their scoring plays and turnovers (at Instant speed only your snaps are shown).
const PF_RUNK = new Set(['keep', 'scramble', 'inside', 'bounce', 'juke', 'truck', 'protect', 'dive', 'stretch', 'follow', 'cut', 'sideline']);
const PF_RUSHK = new Set(['blitz', 'speed', 'bull', 'spin', 'lbblitz', 'swim']);
const PF_DRUNK = new Set(['shed', 'force', 'rally', 'box', 'wrap', 'strip', 'angle', 'contain', 'setedge', 'shoot', 'squeeze', 'fill', 'shedlb', 'hold2']);
const PF_OLRUN = new Set(['drive', 'pull', 'climb', 'wedge', 'reachgl']);
const PF_HS_COL = [['#0b3d91', '#ffffff'], ['#8b0000', '#f5c400'], ['#1b5e20', '#ffffff'], ['#4a148c', '#ffd54f'], ['#e65100', '#212121'], ['#263238', '#ff5252'], ['#004d40', '#ffeb3b'], ['#b71c1c', '#ffffff'], ['#0d47a1', '#ff9800'], ['#3e2723', '#ffcc80']];
function pfCareerColors(g, s) {
  const id = g.ids[s]; if (g.lvl === 'nfl' && NFL_BY[id]) return [NFL_BY[id].c1, NFL_BY[id].c2];
  if (g.lvl === 'col' && TEAM_INFO[id]) return [TEAM_INFO[id].c1, TEAM_INFO[id].c2];
  return PF_HS_COL[Math.floor(hash('hscol:' + (g.names ? g.names[s] : id)) * PF_HS_COL.length)];
}
// your spot in the 22: the role your dot plays
function pfMyRole(pos, rank) { return { QB: 'QB', RB: 'RB', WR: rank === 0 ? 'WR1' : rank === 1 ? 'WR2' : 'WR3', TE: 'TE', CB: rank === 0 ? 'CB1' : 'CB2', S: rank === 0 ? 'S1' : 'S2', LB: 'LB2', DE: rank === 1 ? 'DE2' : 'DE1', OL: ['LT', 'LG', 'C', 'RG', 'RT'][rank] || 'LG', DT: rank === 1 ? 'DT2' : 'DT1', K: 'RB', P: 'QB' }[pos] || null; }
function pfResetCareer(g) {
  pfClear(); pf.sim = null; pf.cg = g; pf.ds = null; pf.snapSeen = 0; pf.logSeen = 0; pf.pendKey = null; pf.next = [25, 25]; pf.pos = {}; pf.camSet = false; pf.hd = {};
  pfBuild(g.lvl === 'nfl'); pf.nums = [pfNums(g.ids[0] + ':' + (g.names ? g.names[0] : ''), true), pfNums(g.ids[1] + ':' + (g.names ? g.names[1] : ''), true)];
  pf.col = pfContrast([pfCareerColors(g, 0), pfCareerColors(g, 1)]); pf.ab = g.ids.slice();
  const role = pfMyRole(cs.p.pos, g.rank); pf.me = role && g.share > 0 ? { side: g.mi, o: g.side === 'off', role, spec: cs.p.pos === 'K' || cs.p.pos === 'P' ? cs.p.pos : null } : null; if (pf.me) { const nm = pf.nums[g.mi], rk = pf.me.spec || role, old = nm[rk]; Object.keys(nm).forEach(k => { if (k !== rk && nm[k] === cs.p.num) nm[k] = old; }); nm[rk] = cs.p.num; } /* nobody else wears your number */
  pf.spdF = () => [1, 1, 0.65, 0.6][+prefs.liveSpeed] || 1; pf.replay = false; pfWeather(g.wx || null, hash('cgn:' + (g.wk || 0) + ':' + (g.ids || []).join('')) < 0.3); pf.names = [{}, {}]; if (pf.me) pf.names[g.mi][cs.p.num] = cs.p.last || cName(cs.p);
  pf.snap = true; pfStage({ o: g.first, dir: pfDir(g.first, 1), los: 25, fd: 35, kind: 'set' }); pfDraw(pf.stage, 0, 0, 1);
}
const pfCovered = role => ({ CB1: 'WR1', CB2: 'WR2', S1: 'TE', S2: 'WR3', LB2: 'TE', DE1: 'RB', DE2: 'RB' }[role] || 'WR1');
// one of your snaps as a play on the field
function pfSnapPlay(g, x) {
  const me = pf.me; const pos = cs.p.pos; const los = clamp(100 - x.yl0, 1, 99); const y = Math.round(x.y);
  const P = { o: x.s, dir: pfDir(x.s, x.qtr), los, fd: Math.min(100, los + (x.dist || 10)), y, key: 'cg:' + g.wk + ':' + x.i + ':' + x.k, down: x.down, togo: x.dist, td: x.imm === 'td' };
  const R_ = me ? me.role : null; const run = PF_RUNK.has(x.k1) || PF_RUNK.has(x.k);
  if (x.k === 'kfake' || x.k === 'pfake') return Object.assign(P, { fd: Math.min(100, los + (x.dist || 10)), kind: x.k === 'kfake' ? 'fakefg' : 'fakep', y: x.imm === 'to' ? -2 : y, td: x.imm === 'td' }, x.imm === 'td' ? { y: 100 - los } : {});
  if (x.kk === 'fg') return Object.assign(P, { los: clamp(100 - x.yl0, 40, 99), fd: null, kind: 'fg', dist: x.yl0 + 17, good: x.imm === 'fg', y: 0, td: false });
  if (x.kk === 'punt') return Object.assign(P, x.imm === 'to' ? { kind: 'fum', carrier: 'QB', y: 0 } : { fd: null, kind: 'punt', dist: x.y, ret: x.kind === 'no' ? 9 : 0, td: false });
  if (pos === 'OL') { if (x.imm === 'to') Object.assign(P, { kind: 'fum', carrier: PF_OLRUN.has(x.k1) ? 'RB' : 'QB' }); else if (PF_OLRUN.has(x.k1)) Object.assign(P, { kind: 'run', carrier: 'RB' }); else if (y < 0) Object.assign(P, { kind: 'sack' }); else Object.assign(P, { kind: 'pass', tg: 'WR1', call: y >= 16 ? 'deep' : '' }); if (P.td) P.y = 100 - los; return P; }
  if (g.side === 'off') {
    if (x.imm === 'to') Object.assign(P, run || pos === 'RB' ? { kind: 'fum', carrier: pos === 'QB' ? 'QB' : 'RB' } : { kind: 'int', tg: pos === 'QB' ? null : R_, y: 0 });
    else if (run && pos !== 'WR' && pos !== 'TE') Object.assign(P, { kind: 'run', carrier: pos === 'QB' ? 'QB' : 'RB' });
    else if (pos === 'QB' && y < 0) Object.assign(P, { kind: 'sack' });
    else if (y <= 0 && (x.kind === 'no' || x.kind === 'risk')) Object.assign(P, { kind: 'inc', tg: pos === 'QB' ? null : R_, y: 0 });
    else Object.assign(P, { kind: 'pass', tg: pos === 'QB' ? null : R_, call: y >= 16 ? 'deep' : '' });
  } else {
    const dk = 'D' + R_;
    if (x.imm === 'to') Object.assign(P, PF_DRUNK.has(x.k1) || x.k === 'strip' ? { kind: 'fum', tackler: dk } : { kind: 'int', pk: dk, tg: pfCovered(R_), p6: x.pick6, y: 0 });
    else if (PF_RUSHK.has(x.k1) && (x.kind === 'ok' || y < 0)) Object.assign(P, { kind: 'sack', rush: dk, y: Math.min(-2, y || -6) });
    else if (PF_DRUNK.has(x.k1)) Object.assign(P, { kind: 'run', tackler: dk });
    else if (y <= 2 && (x.kind === 'ok' || x.kind === 'mid')) Object.assign(P, { kind: 'inc', tg: pfCovered(R_), tackler: dk, y: 0 });
    else Object.assign(P, { kind: 'pass', tg: pfCovered(R_), tackler: dk });
  }
  if (P.td) P.y = 100 - los;
  return P;
}
// a drive from the game log (yours or the other team's)
function pfCareerDrive(g, x, fast) {
  const s = x.s, dir = pfDir(s, x.qtr || 1); const key = 'cgd:' + g.wk + ':' + x.i; const h = k => hash(key + ':' + k); let P = null;
  const start = pf.next[s] || 25; const end = clamp(start + (x.yds || 0), 1, 99);
  if (x.out === 'td' && !(x.dec && x.snapTd)) { const yy = 3 + Math.round(h('y') * 38); const los = clamp(100 - yy, 1, 99); P = { o: s, dir, los, fd: 100, kind: h('k') < 0.5 ? 'run' : 'pass', y: 100 - los, td: true, key }; }
  else if (x.out === 'fg') { const los = end >= 60 ? clamp(end, 60, 92) : 62 + Math.round(h('fl') * 22); P = { o: s, dir, los, fd: null, kind: 'fg', dist: 117 - los, good: true, key }; }
  else if (x.out === 'to' && !x.dec) { P = { o: s, dir, los: end, fd: Math.min(100, end + 10), kind: h('k') < 0.6 ? 'int' : 'fum', y: 0, p6: !!x.pick6, key }; }
  else if (x.out === 'punt' && x.dec) { P = { o: s, dir, los: end, fd: null, kind: 'punt', dist: 38 + Math.round(h('d') * 12), ret: Math.round(h('r') * 9), key }; }
  const grp = pf.gid = (pf.gid || 0) + 1;
  if (P && !(fast && !x.dec)) pfQueue(P, pfCap(null, P), x.dec ? 1 : 0.6, grp);
  pf.next[1 - s] = x.out === 'td' || x.out === 'fg' ? 25 : x.out === 'punt' ? clamp(100 - Math.min(end + 40, 100), 10, 40) || 20 : clamp(100 - end, 1, 99);
  if (!fast && !pf.replay && (x.out === 'td' || x.out === 'fg')) { if (x.out === 'td') pfQueue(pfXP(s, dir, true, key + ':xp'), null, 0.6, grp); pfQueue(pfKO(s, dir, key + ':ko'), null, 0.6, grp); }
}
function pfSyncCareer() {
  const g = typeof cg !== 'undefined' ? cg : null; if (!g || !fieldOn()) return;
  if (pf.cg !== g || !pf.el) pfResetCareer(g);
  const slot = $('#modal .pfslot'); if (slot && pf.el.parentNode !== slot) slot.appendChild(pf.el);
  const fast = +prefs.liveSpeed === 3; const sn = g.snaps || []; let lastTd = false;
  while (pf.snapSeen < sn.length) { const x = sn[pf.snapSeen++]; const P = pfSnapPlay(g, x); lastTd = !!P.td; pfQueue(P, `${pf.ab[P.o]} · ${['1st', '2nd', '3rd', '4th'][(P.down || 1) - 1]} & ${P.togo || 10} · your snap${P.td ? ' · Touchdown' : ''}`); }
  const n = g.log.length; if (n - pf.logSeen > 3) pf.logSeen = n - 1;
  const fresh = g.log.slice(0, n - pf.logSeen).reverse(); pf.logSeen = n;
  fresh.forEach(x => { if (x.dec) x.snapTd = lastTd; pfCareerDrive(g, x, fast); });
  const d = g.pending; const pk = d ? d.s + ':' + d.yl + ':' + d.step + ':' + g.i : null;
  if (d && pk !== pf.pendKey) { pf.pendKey = pk; const los = clamp(100 - (d.yl - (d.gain || 0)), 1, 99); if (d.step === 1) pfQueue({ o: d.s, dir: pfDir(d.s, d.clk ? d.clk.qtr : 1), los, fd: Math.min(100, los + (d.dist || 10)), kind: 'set' }, `Your snap: ${['1st', '2nd', '3rd', '4th'][(d.down || 1) - 1]} & ${Math.min(d.dist || 10, d.yl)}`); }
}

/* ---------- the announcer ---------- */
// One line per play, from what the play script decided: who carried it, who caught it, who made the play.
function pfWho(side, key) {
  if (!key) return null; const role = key.slice(1); const n = (pf.nums[side] || {})[role]; if (n == null) return null; const nm = pf.names && pf.names[side] && pf.names[side][n];
  return nm ? nm : '#' + n;
}
function pfSpot(P, a) { const y = clamp(Math.round(P.los + (a || 0)), 1, 99); return y === 50 ? 'midfield' : y < 50 ? `the ${pf.ab[P.o]} ${y}` : `the ${pf.ab[1 - P.o]} ${100 - y}`; }
function pfCallPre(st) {
  const P = st.P; if (P.kind === 'set') return ''; if (P.kind === 'onk') return `${pf.ab[P.o]} lines up for the kickoff... watch the onside!`; if (P.kind === 'two') return `${pf.ab[P.o]} is going for two.`; if (P.kind === 'ko') return `${pf.ab[P.o]} kicks off.`; if (P.kind === 'xp') return `${pf.ab[P.o]} lines up for the extra point.`; if (P.kind === 'punt') return `${pf.ab[P.o]} sends out the punt team from ${pfSpot(P)}.`; if (P.kind === 'fg') return `${pf.ab[P.o]} lines up for a ${P.dist}-yard field goal.`;
  const dn = P.down ? `${['First', 'Second', 'Third', 'Fourth'][P.down - 1]} and ${100 - P.los < (P.togo || 10) ? 'goal' : P.togo || 10}` : `${pf.ab[P.o]} ball`; return `${dn} at ${pfSpot(P)}.${P.pbn ? ' The call: ' + P.pbn + '.' : ''}`;
}
function pfCallText(st) {
  const P = st.P, R_ = st.sc.roles || {}; const o = P.o, d = 1 - P.o; const pick = arr => arr[Math.floor(hash((P.key || '') + ':call') * arr.length)];
  const qb = pfWho(o, 'OQB') || 'The quarterback', c = pfWho(o, R_.c) || 'The back', t = pfWho(o, R_.t) || 'his receiver', y = Math.abs(P.y || 0), yd = y + (y === 1 ? ' yard' : ' yards');
  const tk = R_.tk ? pfWho(d, R_.tk) : null; const tail = tk ? ` ${tk} makes the stop.` : '';
  switch (P.kind) {
    case 'run': return P.td ? pick([`${c} punches it in from ${yd} out! Touchdown!`, `${c} finds the end zone! ${yd} for the score!`, `Touchdown! ${c} walks in from ${y}.`]) : P.y >= 15 ? pick([`${c} breaks free! A ${y}-yard run.`, `Big hole, and ${c} is through it for ${yd}.`]) + tail : P.y <= 0 ? `${c} is stopped ${P.y < 0 ? 'for a loss of ' + yd : 'for no gain'}.${tail}` : `${c} picks up ${yd}.${tail}`;
    case 'pass': return P.td ? pick([`${qb} finds ${t}... touchdown!`, `${qb} lets it fly, ${t} hauls it in for six!`, `Touchdown, ${t}! A ${y}-yard strike from ${qb}.`]) : P.y >= 20 ? pick([`${qb} goes deep... caught! ${t} for ${yd}!`, `What a throw! ${t} with a ${y}-yard grab.`]) + tail : `${qb} hits ${t} for ${yd}.${tail}`;
    case 'inc': return tk ? `${qb} throws for ${t}... broken up by ${tk}!` : pick([`${qb}'s pass for ${t} falls incomplete.`, `Incomplete. ${qb} and ${t} couldn't connect.`]);
    case 'sack': { const r = pfWho(d, R_.r) || 'the pass rush'; return pick([`${r} gets home! ${qb} is sacked for a loss of ${yd}.`, `Sack! ${r} brings down ${qb}.`]); }
    case 'int': { const k = pfWho(d, R_.pk) || 'the defense'; return P.p6 ? `Picked off by ${k}... and he's gone! Pick six!` : pick([`Intercepted! ${k} jumps the route.`, `${qb} throws it... picked off by ${k}!`]); }
    case 'fum': return tk ? `${tk} punches it out! Fumble, and the defense has it!` : `The ball is out! Fumble, recovered by the defense!`;
    case 'punt': { const pt = pfWho(o, 'OP') || 'The punter', rt = pfWho(d, 'DS1') || 'the returner', ktk = R_.tk ? pfWho(o, R_.tk) : null; const tb = st.sc.endA >= 100 - P.los - 0.5;
      return `${pt} punts it ${P.dist || 40} yards${tb ? ', into the end zone. Touchback.' : !P.ret ? `. Fair catch by ${rt}.` : `, ${rt} returns it ${P.ret} yard${P.ret === 1 ? '' : 's'}.${ktk ? ' ' + ktk + ' makes the tackle.' : ''}`}`; }
    case 'ko': { const kk = pfWho(o, 'OK') || 'The kicker', rt = pfWho(d, 'DS1') || 'the returner', ktk = R_.tk ? pfWho(o, R_.tk) : null; return R_.tk ? `${kk} kicks it deep. ${rt} brings it out to the 25${ktk ? ', where ' + ktk + ' makes the stop' : ''}.` : `${kk} kicks it into the end zone. Touchback.`; }
    case 'two': return P.good ? `They go for two... and get it!` : `They go for two... stopped!`;
    case 'onk': return P.won ? `Onside kick... ${pf.ab[o]} recovers! They keep the ball!` : `Onside kick... ${pf.ab[d]} falls on it.`;
    case 'flea': return P.td ? `Flea flicker! ${qb} finds ${t} for a ${y}-yard touchdown!` : `Flea flicker! ${qb} to ${t}, ${yd}.${tail}`;
    case 'rev': return P.td ? `Reverse! ${c} goes the distance from ${y} out!` : `Reverse! ${c} picks up ${yd}.${tail}`;
    case 'fakep': case 'fakefg': return P.y >= (P.togo || 1) || P.td ? `A fake! ${c} takes off for ${yd}${P.td ? ' and a touchdown' : ''}!` : `A fake... ${c} is stopped${P.y > 0 ? ' after ' + yd : ''}.`;
    case 'xp': return P.good ? pick([`The extra point is good.`, `The kick is through. Extra point good.`]) : `The extra point is no good!`;
    case 'fg': return P.good ? pick([`The kick is up... it's good from ${P.dist}!`, `Right down the middle. ${P.dist} yards, good.`]) : `${P.dist}-yard try... no good!`;
  }
  return '';
}
// the names the announcer knows: your players (and NFL rosters) by jersey number
function pfNamesFor(id) {
  const m = {}; const add = list => (list || []).forEach(p => { if (p && p.num != null && !m[p.num]) m[p.num] = String(p.n || '').split(' ').slice(-1)[0]; });
  try { if (id === ME) add(state.roster); else if (isPro() && typeof proRoster === 'function') add(proRoster(id)); } catch (e) { }
  return m;
}

/* ---------- tap a player ---------- */
function pfTapDot(e) {
  const g = e.target.closest && e.target.closest('.pfd'); if (!g || !pf.stage) { if (pf.tip) pf.tip.hidden = true; return; }
  const key = (g.classList.contains('off') ? 'O' : 'D') + g.dataset.k; const P = pf.stage.P; const side = key[0] === 'O' ? P.o : 1 - P.o; const role = key.slice(1); const n = (pf.nums[side] || {})[role];
  let txt = `#${n} · ${pf.ab[side]}`;
  if (pf.cg && pf.me && g.classList.contains('me')) txt = `#${n} ${cName(cs.p)} (you) · ${lineText(pf.cg.line, cs.p.pos) || 'no stats yet'}`;
  else if (pf.sim && pf.sim.box && pf.sim.ids[side] === ME) { const p = state.roster.find(x => x.num === n && pf.sim.box.p[x.id]) || state.roster.find(x => x.num === n); if (p) { const st = pf.sim.box.p[p.id]; const ss = p.st && Object.keys(p.st).length ? statLine(p, p.st) : ''; txt = `#${n} ${p.n}, ${p.pos} · this game: ${st ? statLine(p, st) || 'no stats yet' : 'no stats yet'}${ss ? ' · season: ' + ss : ''}`; } }
  else if (pf.names && pf.names[side] && pf.names[side][n]) txt = `#${n} ${pf.names[side][n]} · ${pf.ab[side]}`;
  pf.tip.textContent = txt; pf.tip.hidden = false; clearTimeout(pfTapDot.t); pfTapDot.t = setTimeout(() => { pf.tip.hidden = true; }, 4000);
}

/* ---------- the highlight reel ---------- */
// Replays a finished game's scoring drives and turnovers on the field, one after another, with the call.
function pfReplayAD(g) {
  if (!g || !g.hl || !g.hl.d.length) return false; const ids = [g.h, g.a];
  const sim = { ids, first: g.hl.first, ckKey: g.hl.k, log: g.hl.d, box: g.box, mSide: ids.indexOf(ME) };
  pfReset(sim); pf.replay = true; pf.spdF = () => 1;
  g.hl.d.forEach(x => pfDrive(sim, Object.assign({}, x, { man: false })));
  return true;
}
function pfReplayCareer(rec) {
  const h = rec && rec.hl; if (!h) return false; const g = { lvl: h.lvl, wk: h.wk, ids: h.ids, names: h.names, first: h.first, mi: h.mi, side: h.side, rank: h.rank, share: h.share, line: rec.line, log: [], snaps: [] };
  const num0 = cs.p.num; cs.p.num = h.num; pfResetCareer(g); cs.p.num = num0; pf.cg = g; pf.replay = true; pf.spdF = () => 1; pf.names = [{}, {}]; if (pf.me) pf.names[h.mi][h.num] = cs.p.last || cName(cs.p);
  const items = h.snaps.map(x => ({ i: x.i, x, kind: 'snap' })).concat(h.d.map(x => ({ i: x.i, x, kind: 'drive' }))).sort((a, b) => a.i - b.i);
  items.forEach(it => { if (it.kind === 'snap') { const P = pfSnapPlay(g, it.x); pfQueue(P, `${pf.ab[P.o]} · your snap${P.td ? ' · Touchdown' : ''}`); } else pfCareerDrive(g, it.x, false); });
  return items.length > 0;
}

// open the reel in a dialog
function hlOpen(title, sub, start) {
  openModal(`<div class="eyebrow">Highlights</div><h2 class="h2">${esc(title)}</h2>${sub ? `<p class="small muted">${esc(sub)}</p>` : ''}<div class="pfslot"></div><div class="row gap mt"><button class="btn sm" data-act="hlagain">Watch again</button><button class="btn ghost sm" data-act="close">Close</button></div><p class="hint">Scoring plays and turnovers, in order. Tap a player to see who it is.</p>`, 'Highlights');
  pf.hlStart = start; if (!start()) { $('#modal .pfslot').innerHTML = '<p class="muted">No highlights were kept for this game.</p>'; return; }
  const slot = $('#modal .pfslot'); if (slot && pf.el) slot.appendChild(pf.el);
}
function hlGame(id) {
  const g = (state.games || []).find(x => x.id === id); if (!g || !g.hl) return;
  hlOpen(`${teamName(g.a)} ${g.as}, ${teamName(g.h)} ${g.hs}`, g.name || weekLabel(g.wk), () => pfReplayAD(g));
}
function hlCareer(i) {
  const r = cs && cs.ss && cs.ss.games[i]; if (!r || !r.hl) return;
  hlOpen(`${r.w ? 'Won' : 'Lost'} ${r.us}–${r.them} ${r.home ? 'vs.' : 'at'} ${r.opp}`, cWeekLabel(r.wk), () => pfReplayCareer(r));
}

/* ---------- penalty flags, the ref's signal and the crowd meter (v9.14) ---------- */
// Now and then a flag flies on a play. The play's result never changes: the penalty is declined, so the ref signals
// it and the game goes on. The crowd meter rises with the home team's big moments and when the visitors have the ball.
const PF_PEN = { gain: [['Holding, defense', 'hold'], ['Offside, defense', 'hips'], ['Illegal contact', 'push'], ['Face mask, defense', 'mask']], fail: [['Holding, offense', 'hold'], ['Illegal formation', 'hips'], ['Ineligible man downfield', 'push'], ['Illegal shift', 'hips']] };
function pfFlagFor(P, sc) {
  if (!sc || !['run', 'pass', 'inc', 'sack'].includes(P.kind) || P.td) return; const v = hmix((P.key || '') + ':flag'); if (v >= 0.075) return;
  const gain = (P.kind === 'run' || P.kind === 'pass') && (P.y || 0) > 0; const L = gain ? PF_PEN.gain : PF_PEN.fail; const pk = L[Math.floor(hmix((P.key || '') + ':pen') * L.length)];
  const tEnd = sc.tEnd || sc.T * 0.7; sc.flag = { t: Math.max(0.4, tEnd * 0.45), from: [-3, (hmix((P.key || '') + ':fx') - 0.5) * 10], p: [1.5 + hmix((P.key || '') + ':fp') * 3, (hmix((P.key || '') + ':fy') - 0.5) * 16], txt: `${pk[0]} · declined`, sig: pk[1] };
}
function pfRefSvg(sig) {
  const body = '<circle cx="20" cy="8" r="5" class="rh"/><path d="M20 13V31M20 31L14 45M20 31L26 45" class="rb"/><path d="M15 14h10v13H15z" class="rs"/>';
  const arms = { hold: '<path d="M16 17L11 24L20 22M24 17L29 24L20 22" class="ra"/>', hips: '<path d="M16 17L10 22L15 27M24 17L30 22L25 27" class="ra"/>', push: '<path d="M16 17L7 17M24 17L33 17" class="ra"/><path d="M7 14V20M33 14V20" class="ra"/>', mask: '<path d="M16 17L13 10L18 8M24 17L28 24" class="ra"/>' }[sig] || '';
  return body + arms;
}
function pfCrowd(P) {
  const el = pf.crowdEl; if (!el || !P) return; if (P.kind === 'set') { el.style.opacity = 0; return; }
  if (pf.crowdBase == null) { const sim = pf.sim; const neutral = sim && sim.g ? !!sim.g.neutral : pf.cg ? !!pf.cg.neutral : false; pf.crowdBase = neutral ? 34 : 52 + (sim && sim.adv ? clamp(sim.adv[0] * 60, -10, 20) : 0); }
  const home = 0; const homeBall = P.o === home; let v = pf.crowdBase + (homeBall ? -6 : 14);
  if (P.td || P.kind === 'two') v += homeBall ? 30 : -24; else if (P.kind === 'int' || P.kind === 'fum') v += homeBall ? -16 : 26; else if (P.kind === 'sack') v += homeBall ? -8 : 22; else if ((P.y || 0) >= 15) v += homeBall ? 16 : -10; else if (P.down >= 3) v += homeBall ? 0 : 10;
  v = clamp(Math.round(v), 6, 100); el.style.opacity = 1; const i = el.querySelector('i'); if (i) i.style.height = v + '%'; el.classList.toggle('loud', v >= 80); el.title = `Crowd noise: ${v >= 85 ? 'deafening' : v >= 65 ? 'loud' : v >= 40 ? 'buzzing' : 'quiet'}`;
}

/* ---------- v9.15: stadium looks, the telestrator, celebrations and the band ---------- */
// Each home field gets a midfield logo and its own end-zone style; big plays get a telestrator replay; touchdowns
// get the crowd and the band going. All of it is drawing only: nothing here touches the game.
{
  const _pb = pfBuild; pfBuild = function (nfl) {
    const el = _pb(nfl);
    try {
      const svg = el.querySelector('svg'); svg.insertAdjacentHTML('afterbegin', '<defs><pattern id="pfezpat" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.1" height="2.2" fill="rgba(255,255,255,.22)"/></pattern></defs>');
      el.querySelector('.pfline').insertAdjacentHTML('beforebegin', `<rect x="0" y="2" width="10" height="53.3" class="pfezp"/><rect x="110" y="2" width="10" height="53.3" class="pfezp"/><g class="pfmid"><circle cx="60" cy="${PF_MID}" r="4.3"/><text x="60" y="${PF_MID}" dy="0.36em"></text></g>`);
      el.querySelector('.pftrail.air').insertAdjacentHTML('afterend', '<g class="pftele"></g>');
      el.insertAdjacentHTML('beforeend', '<div class="pfstands" aria-hidden="true"><i class="band"></i></div><div class="pfconf" aria-hidden="true"></div><div class="pftelel" aria-hidden="true">Replay</div>');
      pf.tele = el.querySelector('.pftele'); pf.mid = el.querySelector('.pfmid');
    } catch (e) { }
    return el;
  };
  const _pc = pfColorStage; pfColorStage = function (st) {
    _pc(st);
    try {
      const home = pf.col && pf.col[0]; if (pf.mid && home) { pf.mid.children[0].setAttribute('fill', home[0]); pf.mid.children[0].setAttribute('stroke', home[1]); const t = pf.mid.children[1]; t.textContent = pf.ab ? pf.ab[0] : ''; t.setAttribute('fill', pfLum(home[0]) > 0.6 ? '#111' : '#fff'); }
      const style = Math.floor(hmix('ezs:' + (pf.ab ? pf.ab[0] : '')) * 3); pf.el.classList.toggle('ezs1', style === 1); pf.el.classList.toggle('ezs2', style === 2);
      if (home) { pf.el.style.setProperty('--pfh1', home[0]); pf.el.style.setProperty('--pfh2', home[1]); }
      if (pf.tele) pf.tele.innerHTML = ''; pf.el.classList.remove('teleon'); st.tele = false;
    } catch (e) { }
  };
  const big = P => !!P && !P.noTele && (P.td || ['int', 'fum'].includes(P.kind) || ((P.kind === 'run' || P.kind === 'pass') && (P.y || 0) >= 20));
  // the replay: the ball carrier's path in yellow, the other receivers' routes dashed
  function pfTeleDraw(st) {
    if (!pf.tele || st.tele) return; st.tele = true; const P = st.P, sc = st.sc; if (!sc || !sc.rec) return; const car = pfCarAt(sc, sc.T) || pfCarAt(sc, (sc.tEnd || sc.T) * 0.99); const pos = (a, b) => [pfX(P, a), PF_MID + b];
    const path = (k, f0, f1) => { const r = sc.rec[k]; if (!r) return ''; let d = ''; for (let f = f0; f <= f1; f += 2) { const fr = Math.min(sc.N - 1, f); const [x, y] = pos(r[2 * fr], r[2 * fr + 1]); d += (d ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2); } return d; };
    const end = Math.min(sc.N - 1, Math.round((sc.tEnd || sc.T) / PF_DT)); let html = '';
    if (P.kind === 'pass') ['OWR1', 'OWR2', 'OWR3', 'OTE', 'ORB'].filter(k => k !== car).forEach(k => { html += `<path d="${path(k, 0, Math.round(end * 0.6))}" class="pftl dash"/>`; });
    if (car) { html += `<path d="${path(car, 0, end)}" class="pftl car"/>`; const r = sc.rec[car]; const [x, y] = pos(r[2 * end], r[2 * end + 1]); html += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.6" class="pftl ring"/>`; }
    pf.tele.innerHTML = html; pf.el.classList.add('teleon');
  }
  function pfCelebrate(st) {
    if (st.cele || !pf.el || !motionOn()) return; st.cele = true; const box = pf.el.querySelector('.pfconf'); if (!box) return; const h = q => hmix((st.P.key || '') + ':conf:' + q);
    box.innerHTML = Array.from({ length: 26 }, (_, i) => `<i style="left:${(h('x' + i) * 100).toFixed(1)}%;animation-delay:${(h('d' + i) * 0.5).toFixed(2)}s;background:${i % 2 ? 'var(--pfh1,#fff)' : 'var(--pfh2,#ffd23f)'}"></i>`).join('');
    pf.el.classList.add('cele'); clearTimeout(pf.celeT); pf.celeT = setTimeout(() => { if (pf.el) { pf.el.classList.remove('cele'); if (box.isConnected) box.innerHTML = ''; } }, 1800);
  }
  const _pd = pfDraw; pfDraw = function (st, ph, u, k) {
    _pd(st, ph, u, k);
    try { if (!st || !pf.el) return; if (ph === 1 && u >= 1) { if (big(st.P)) pfTeleDraw(st); if (st.P.td) pfCelebrate(st); } else if (st.tele) { st.tele = false; if (pf.tele) pf.tele.innerHTML = ''; pf.el.classList.remove('teleon'); } } catch (e) { }
  };
  // a big play holds on the replay a little longer (not in the highlight reels)
  const _pq = pfQueue; pfQueue = function (P, cap, fx, grp) {
    const n0 = pf.q.length; _pq(P, cap, fx, grp);
    try { const it = pf.q[pf.q.length - 1]; if (!pf.replay && pf.q.length > n0 && it && it.P === P && big(P) && it.total > 0) { const f = motionOn() ? pfSpeed() * (fx || 1) : 0; const add = 1400 * f; it.d[3] += add; it.total += add; } } catch (e) { }
  };
}

