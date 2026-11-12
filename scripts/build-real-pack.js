#!/usr/bin/env node
// Builds packs/real-<season>.json, the optional pack of real rosters and the real schedule, from the files
// scripts/fetch-real-data.js downloaded into data/real/cache/. Run with: node scripts/build-real-pack.js [season]
// The pack holds names, positions, classes, numbers, sizes and hometowns: facts from public rosters. It holds
// no ratings. The game gives each real player the rating of a generated player at his position, so a school
// plays at the same strength with or without the pack.
//   teams:  { ID: [[name, position, class, number, height, weight, hometown], ...] }
//   games:  [[week, home, away, neutral]]   (a school outside the game's 138 is written as "FCS:Name")
const fs = require('fs'); const path = require('path'); const root = path.join(__dirname, '..'); const season = +process.argv[2] || 2026;
const teams = JSON.parse(fs.readFileSync(path.join(root, 'data/real/espn-teams.json'), 'utf8')); const cache = path.join(root, 'data/real/cache'); const byEspn = {}; Object.entries(teams).forEach(([id, t]) => { byEspn[t.espn] = id; });
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h / 4294967296; };
const POS = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', PR: 'WR', TE: 'TE', OL: 'OL', OT: 'OL', G: 'OL', OG: 'OL', C: 'OL', T: 'OL', DE: 'DE', EDGE: 'DE', DT: 'DT', NT: 'DT', LB: 'LB', ILB: 'LB', OLB: 'LB', CB: 'CB', S: 'S', FS: 'S', SS: 'S', PK: 'K', K: 'K', P: 'P', LS: 'LS' };
const CLS = { FR: 'Fr', SO: 'So', JR: 'Jr', SR: 'Sr' };
const clean = s => String(s || '').replace(/[<>|]/g, '').replace(/\s+/g, ' ').trim();
function posOf(p) { const a = (p.position && p.position.abbreviation) || ''; const w = p.weight || 0; if (a === 'LB' && w >= 275) return 'OL'; // a few schools file their linemen under linebacker
  if (POS[a]) return POS[a];
  if (a === 'DL') return w >= 280 ? 'DT' : w ? 'DE' : (hash(p.fullName) < 0.45 ? 'DT' : 'DE'); if (a === 'DB') return w && w >= 198 ? 'S' : w ? 'CB' : (hash(p.fullName) < 0.5 ? 'CB' : 'S'); if (a === 'ATH') return 'WR'; return null; }
const out = { v: 1, season, source: 'ESPN public college football feed', built: new Date().toISOString().slice(0, 10), teams: {}, games: [] }; const warn = []; let players = 0;
Object.keys(teams).sort().forEach(id => {
  const r = JSON.parse(fs.readFileSync(path.join(cache, id + '.roster.json'), 'utf8')); if (!r.season || r.season.year !== season) warn.push(`${id}: the roster is for ${r.season && r.season.year}, not ${season}`);
  const list = []; const seen = new Set();
  (r.athletes || []).forEach(g => (g.items || []).forEach(p => { const n = clean(p.fullName || p.displayName); const pos = posOf(p); if (!n || !pos || seen.has(n)) return; seen.add(n);
    const h = p.height ? Math.floor(p.height / 12) + '-' + Math.round(p.height % 12) : ''; const bp = p.birthPlace || {}; const home = clean([bp.city, bp.state || bp.country].filter(Boolean).join(', '));
    list.push([n, pos, CLS[(p.experience && p.experience.abbreviation) || ''] || 'So', p.jersey != null && p.jersey !== '' ? +p.jersey : null, h, p.weight ? Math.round(p.weight) : null, home]); }));
  if (list.length < 60) warn.push(`${id}: only ${list.length} players`); ['QB', 'RB', 'WR', 'OL', 'LB'].forEach(pos => { if (!list.some(x => x[1] === pos)) warn.push(`${id}: nobody at ${pos}`); });
  out.teams[id] = list; players += list.length;
});
// the schedule: every game once, from whichever school's file lists it
const G = {}; Object.keys(teams).forEach(id => { const s = JSON.parse(fs.readFileSync(path.join(cache, id + '.schedule.json'), 'utf8'));
  (s.events || []).forEach(e => { if (G[e.id] || (e.seasonType && e.seasonType.type && e.seasonType.type !== 2)) return; const c = e.competitions[0]; const side = k => c.competitors.find(x => x.homeAway === k); const H = side('home'), A = side('away'); if (!H || !A) return;
    const nm = t => byEspn[t.team.id] || 'FCS:' + clean(t.team.location || t.team.displayName); G[e.id] = { wk: e.week && e.week.number, h: nm(H), a: nm(A), n: c.neutralSite ? 1 : 0, d: e.date }; }); });
const games = Object.values(G).filter(g => !(g.h.startsWith('FCS:') && g.a.startsWith('FCS:'))).sort((x, y) => x.d < y.d ? -1 : 1);
// The game's regular season is weeks 1 to 13. The feed files "Week 0" games (the last weekend of August) under
// week 1, and Army-Navy under week 15. Every game on a normal weekend is placed first, exactly where it is.
// Then the few early and late games go into a week when both schools are otherwise off.
const busy = {}; const isB = (t, w) => busy[t] && busy[t][w]; const take = (t, w) => { if (!t.startsWith('FCS:')) (busy[t] = busy[t] || {})[w] = 1; };
const placed = []; const put = (g, w) => { take(g.h, w); take(g.a, w); placed.push([w, g.h, g.a, g.n]); };
const opener = new Date(Date.UTC(season, 8, 2)).toISOString(); // games before the first Wednesday of September are "Week 0"
const odd = games.filter(g => g.d < opener || !(g.wk >= 1 && g.wk <= 13)); const normal = games.filter(g => !odd.includes(g));
normal.forEach(g => { if (isB(g.h, g.wk) || isB(g.a, g.wk)) { odd.push(g); return; } put(g, g.wk); });
odd.forEach(g => { const order = g.wk > 13 ? [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; const w = order.find(x => !isB(g.h, x) && !isB(g.a, x));
  if (w == null) { // no shared open week: move one other game by a week or two to make room
    const free = t => (busy[t] = busy[t] || {}, t);
    for (const [X, Y] of [[g.h, g.a], [g.a, g.h]]) { if (X.startsWith('FCS:')) continue; let done = false;
      for (const wk of order) { if (isB(X, wk) || !isB(Y, wk)) continue; const i = placed.findIndex(q => q[0] === wk && (q[1] === Y || q[2] === Y)); if (i < 0) continue; const q = placed[i]; const Z = q[1] === Y ? q[2] : q[1];
        const w2 = order.find(x => x !== wk && !isB(Y, x) && !isB(Z, x) && Math.abs(x - wk) <= 6); if (w2 == null) continue;
        delete busy[Y][wk]; if (busy[Z]) delete busy[Z][wk]; q[0] = w2; take(q[1], w2); take(q[2], w2); put(g, wk); warn.push(`${g.a} at ${g.h} (${g.d.slice(0, 10)}) is played in week ${wk}; ${q[2]} at ${q[1]} moves from week ${wk} to week ${w2}`); done = true; break; }
      if (done) return; }
    warn.push(`could not place ${g.a} at ${g.h} (${g.d.slice(0, 10)})`); return; } warn.push(`${g.a} at ${g.h} (${g.d.slice(0, 10)}) is played in week ${w}`); put(g, w); });
out.games = placed.sort((x, y) => x[0] - y[0] || (x[1] < y[1] ? -1 : 1));
const cnt = {}; out.games.forEach(g => [g[1], g[2]].forEach(t => { if (!t.startsWith('FCS:')) cnt[t] = (cnt[t] || 0) + 1; })); Object.keys(teams).forEach(id => { if ((cnt[id] || 0) < 11 || cnt[id] > 13) warn.push(`${id}: ${cnt[id] || 0} games`); });
fs.mkdirSync(path.join(root, 'packs'), { recursive: true }); const file = path.join(root, 'packs', `real-${season}.json`); fs.writeFileSync(file, JSON.stringify(out));
console.log(`wrote packs/real-${season}.json: ${Object.keys(out.teams).length} schools, ${players} players, ${out.games.length} games, ${Math.round(fs.statSync(file).size / 1024)} KB`);
if (warn.length) console.log('notes:\n- ' + warn.join('\n- '));
