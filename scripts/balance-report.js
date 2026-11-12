#!/usr/bin/env node
// The balance dashboard. Plays whole leagues on autopilot in a headless browser and writes docs/balance.html:
// charts of wins by team rating, how often the better team wins, scoring, and what a draft pick is worth.
// Run it after any change to the game engine and read the page before shipping.
//   node scripts/balance-report.js            about 30 college seasons and 24 NFL seasons (under a minute)
//   node scripts/balance-report.js --big      five times as many
const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const big = process.argv.includes('--big'); const args = big ? ['10', '15', '6', '20'] : ['6', '5', '4', '6'];
const raw = execFileSync(process.execPath, ['tests/run.js', 'scripts/balance-probe.js'].concat(args), { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 1800000 });
const D = JSON.parse(raw.trim().split('\n').filter(l => l.startsWith('{')).pop()); if (D.ERR) { console.error(D.ERR); process.exit(1); }

const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0); const r1 = v => Math.round(v * 10) / 10; const pct = v => Math.round(v * 1000) / 10;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// bucket rows [key, values[]] in key order
function bucket(rows, keyOf, valOf, order) { const m = new Map(); rows.forEach(r => { const k = keyOf(r); if (k == null) return; if (!m.has(k)) m.set(k, []); m.get(k).push(valOf(r)); }); const keys = order || [...m.keys()].sort((a, b) => a - b); return keys.filter(k => m.has(k)).map(k => ({ k, n: m.get(k).length, v: avg(m.get(k)) })); }
const GAPS = [[0, 3, '0 to 3'], [3, 6, '3 to 6'], [6, 10, '6 to 10'], [10, 15, '10 to 15'], [15, 25, '15 to 25'], [25, 99, '25 and up']];
function favorites(games) { return GAPS.map(([lo, hi, lbl]) => { const g = games.filter(x => Math.abs(x[0]) >= lo && Math.abs(x[0]) < hi && x[0] !== 0 && x[1] !== x[2]); const w = g.filter(x => (x[0] > 0) === (x[1] > x[2])).length; return { k: lbl, n: g.length, v: g.length ? w / g.length * 100 : 0 }; }).filter(b => b.n >= 20); }
const homeRate = games => { const g = games.filter(x => !x[3] && x[1] !== x[2]); return g.length ? g.filter(x => x[1] > x[2]).length / g.length * 100 : 0; };
function section(L, isNfl) {
  const step = isNfl ? 2 : 5; const byRating = bucket(L.teams, t => Math.floor(t[0] / step) * step, t => t[1]).filter(b => b.n >= 5).map(b => ({ k: b.k + ' to ' + (b.k + step - 1), n: b.n, v: b.v }));
  const ppgStep = 4; const ppg = bucket(L.teams, t => Math.floor(t[3] / ppgStep) * ppgStep, () => 1).map(b => ({ k: b.k + ' to ' + (b.k + ppgStep - 1), n: b.n, v: b.n / L.teams.length * 100 }));
  const wins = isNfl ? bucket(L.teams, t => t[1], () => 1).map(b => ({ k: String(b.k), n: b.n, v: b.n / L.teams.length * 100 })) : null;
  return { byRating, fav: favorites(L.games), ppg, wins, home: homeRate(L.games), ppgAvg: avg(L.teams.map(t => t[3])), gp: L.games.length, ts: L.teams.length };
}
const C = section(D.college, false), N = section(D.nfl, true);
const rook = bucket(D.nfl.rookies, r => r[0], r => r[1]).map(b => ({ k: 'Round ' + b.k, n: b.n, v: b.v })); const rookPot = bucket(D.nfl.rookies, r => r[0], r => r[2]);
const topTitle = D.college.titles.filter(x => x >= 1 && x <= 10).length / (D.college.titles.length || 1) * 100; const nflTop = D.nfl.champs.filter(x => x >= 1 && x <= 8).length / (D.nfl.champs.length || 1) * 100;

// one bar chart: a single series, so no legend; the title says what the bars are
let chartN = 0;
function bars(title, sub, data, o) {
  o = o || {}; const id = 'c' + (++chartN); const W = 640, H = 260, L = 44, R = 12, T = 14, B = 46; const max = o.max || Math.max(1, ...data.map(d => d.v)) * 1.1; const iw = W - L - R, ih = H - T - B; const bw = iw / data.length;
  const y = v => T + ih - (v / max) * ih; const ticks = o.ticks || [0, max / 4, max / 2, max * 3 / 4, max].map(v => Math.round(v * 10) / 10); const fmt = o.fmt || (v => r1(v)); const unit = o.unit || '';
  const grid = ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${L - 6}" y="${y(t) + 4}" class="tick" text-anchor="end">${fmt(t)}${unit}</text>`).join('');
  const ref = o.ref != null ? `<line x1="${L}" x2="${W - R}" y1="${y(o.ref)}" y2="${y(o.ref)}" class="ref"/><text x="${W - R}" y="${y(o.ref) - 5}" class="tick" text-anchor="end">${esc(o.refLabel || '')}</text>` : '';
  const every = Math.ceil(data.length / 9);
  const marks = data.map((d, i) => { const x = L + i * bw + 1, w = Math.max(2, bw - 2), top = y(d.v), h = Math.max(0, T + ih - top), rr = Math.min(4, w / 2, h);
    return `<g class="bar" tabindex="0" data-tip="${esc(d.k)}: ${fmt(d.v)}${unit} (${d.n.toLocaleString('en-US')} ${esc(o.count || 'team seasons')})"><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${ih}" class="hit"/><path d="M${x},${T + ih} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + w - rr} Q${x + w},${top} ${x + w},${top + rr} V${T + ih} Z" class="mark"/>${i % every === 0 ? `<text x="${x + w / 2}" y="${H - B + 16}" class="tick" text-anchor="middle">${esc(d.k)}</text>` : ''}</g>`; }).join('');
  const table = `<details><summary>Show as a table</summary><table><thead><tr><th>${esc(o.xLabel || '')}</th><th>${esc(o.yLabel || '')}</th><th>${esc(o.count || 'Team seasons')}</th></tr></thead><tbody>${data.map(d => `<tr><td>${esc(d.k)}</td><td>${fmt(d.v)}${unit}</td><td>${d.n.toLocaleString('en-US')}</td></tr>`).join('')}</tbody></table></details>`;
  return `<figure class="chart"><figcaption><b>${esc(title)}</b><span>${esc(sub)}</span></figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}"><title id="${id}">${esc(title)}</title>${grid}${ref}${marks}<text x="${L + iw / 2}" y="${H - 6}" class="axis" text-anchor="middle">${esc(o.xLabel || '')}</text></svg>${table}</figure>`;
}
const tile = (k, v, s) => `<div class="tile"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span class="s">${esc(s || '')}</span></div>`;
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Balance dashboard · Football Empire</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<style>
  :root{--surface:#fcfcfb;--panel:#fff;--text:#0b0b0b;--text2:#52514e;--line:#e4e3de;--series:#2a78d6;--series-hover:#1c5cab;--ref:#52514e}
  @media (prefers-color-scheme:dark){:root{--surface:#1a1a19;--panel:#232321;--text:#f0efec;--text2:#c3c2b7;--line:#3a3a36;--series:#3987e5;--series-hover:#6da7ec;--ref:#c3c2b7}}
  *{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}h1{font-size:28px;margin:0 0 4px}h2{font-size:20px;margin:36px 0 12px}p{color:var(--text2);margin:0 0 12px;max-width:70ch}
  .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0 20px}.tile{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column}
  .tile .k{font-size:12px;color:var(--text2)}.tile .v{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums}.tile .s{font-size:12px;color:var(--text2)}
  .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:14px}
  .chart{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;min-width:0}figcaption{display:flex;flex-direction:column;margin-bottom:6px}figcaption span{font-size:13px;color:var(--text2)}
  svg{width:100%;height:auto;display:block}.grid{stroke:var(--line);stroke-width:1}.tick{font-size:11px;fill:var(--text2);font-variant-numeric:tabular-nums}.axis{font-size:12px;fill:var(--text2)}
  .mark{fill:var(--series)}.hit{fill:transparent}.bar:hover .mark,.bar:focus .mark{fill:var(--series-hover)}.bar:focus{outline:none}.bar:focus-visible .hit{stroke:var(--text);stroke-width:1}.ref{stroke:var(--ref);stroke-width:1;stroke-dasharray:4 4}
  details{margin-top:8px;font-size:13px}summary{cursor:pointer;color:var(--text2)}table{border-collapse:collapse;width:100%;margin-top:6px;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)}
  #tip{position:fixed;pointer-events:none;background:var(--text);color:var(--surface);font-size:12px;padding:6px 8px;border-radius:6px;max-width:260px;z-index:5}
  a{color:inherit}
</style>
<main>
<h1>Balance dashboard</h1>
<p>Whole leagues played on autopilot by version ${esc(D.version)} of the game: ${D.college.seasons} college seasons (${C.ts.toLocaleString('en-US')} team seasons, ${C.gp.toLocaleString('en-US')} games) and ${D.nfl.seasons} NFL seasons (${N.ts.toLocaleString('en-US')} team seasons, ${N.gp.toLocaleString('en-US')} games). Built ${new Date().toISOString().slice(0, 10)} by <code>node scripts/balance-report.js</code>. Run it again after any change to the engine and compare.</p>

<h2>College football</h2>
<div class="tiles">${tile('Home teams win', pct(C.home / 100) + '%', 'real FBS: about 60%')}${tile('Points a game', r1(C.ppgAvg), 'per team; real FBS: about 28')}${tile('Title won by a preseason top 10 team', Math.round(topTitle) + '%', D.college.titles.length + ' seasons')}</div>
<div class="grid2">
${bars('Wins by team rating', 'Average wins in a season for teams that started it at each rating. This should climb steadily.', C.byRating, { xLabel: 'Team rating at the start of the season', yLabel: 'Average wins' })}
${bars('How often the better team wins', 'Share of games won by the higher-rated team, by how far apart the two ratings were. Close games should be near a coin flip.', C.fav, { xLabel: 'Rating gap between the teams', yLabel: 'Better team wins', unit: '%', max: 100, ticks: [0, 25, 50, 75, 100], fmt: v => Math.round(v), ref: 50, refLabel: 'coin flip', count: 'games' })}
${bars('Scoring', 'Share of teams by points scored a game over a season.', C.ppg, { xLabel: 'Points a game', yLabel: 'Share of teams', unit: '%', fmt: v => r1(v) })}
</div>

<h2>The NFL</h2>
<div class="tiles">${tile('Home teams win', pct(N.home / 100) + '%', 'real NFL: about 55%')}${tile('Points a game', r1(N.ppgAvg), 'per team; real NFL: about 22')}${tile('Title won by a top 8 club', Math.round(nflTop) + '%', D.nfl.champs.length + ' seasons')}</div>
<div class="grid2">
${bars('Wins by club rating', 'Average wins for clubs that started the season at each rating.', N.byRating, { xLabel: 'Club rating at the start of the season', yLabel: 'Average wins' })}
${bars('How many games clubs win', 'Share of clubs finishing with each win total. A healthy league is a hump around eight or nine, with few clubs at the edges.', N.wins, { xLabel: 'Wins in a season', yLabel: 'Share of clubs', unit: '%', fmt: v => r1(v) })}
${bars('How often the better club wins', 'Share of games won by the higher-rated club, by rating gap.', N.fav, { xLabel: 'Rating gap between the clubs', yLabel: 'Better club wins', unit: '%', max: 100, ticks: [0, 25, 50, 75, 100], fmt: v => Math.round(v), ref: 50, refLabel: 'coin flip', count: 'games' })}
${rook.length ? bars('What a draft pick is worth', 'Average overall rating of rookies in their first camp, by the round they were taken. Only the played club\'s picks are tracked, so the counts are small.', rook, { xLabel: 'Round drafted', yLabel: 'Average overall', count: 'rookies', max: 90, ticks: [0, 30, 60, 90], fmt: v => Math.round(v) }) : ''}
</div>
${rookPot.length ? `<p style="margin-top:14px">Average potential by round: ${rookPot.map(b => 'round ' + b.k + ', ' + Math.round(b.v)).join('; ')}.</p>` : ''}
<p style="margin-top:28px"><a href="../">Back to the game</a></p>
</main>
<div id="tip" hidden></div>
<script>
(function () { var tip = document.getElementById('tip'); function show(el, x, y) { tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; var w = tip.offsetWidth; tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px'; tip.style.top = Math.max(8, y - tip.offsetHeight - 12) + 'px'; }
  document.querySelectorAll('.bar').forEach(function (b) { b.addEventListener('mousemove', function (e) { show(b, e.clientX, e.clientY); }); b.addEventListener('mouseleave', function () { tip.hidden = true; }); b.addEventListener('focus', function () { var r = b.getBoundingClientRect(); show(b, r.left + r.width / 2, r.top + 20); }); b.addEventListener('blur', function () { tip.hidden = true; }); }); })();
</script>
</html>
`;
fs.writeFileSync(path.join(root, 'docs', 'balance.html'), html);
console.log(`wrote docs/balance.html: ${D.college.seasons} college seasons, ${D.nfl.seasons} NFL seasons`);
console.log(`college: home ${pct(C.home / 100)}%, ${r1(C.ppgAvg)} points a game | NFL: home ${pct(N.home / 100)}%, ${r1(N.ppgAvg)} points a game`);
