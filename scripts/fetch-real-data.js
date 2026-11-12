#!/usr/bin/env node
// Downloads the real rosters and schedules the optional "real 2026" pack is built from.
// Source: ESPN's public college football feed (site.api.espn.com). One roster and one schedule per school.
//   node scripts/fetch-real-data.js [season]     downloads anything not already in data/real/cache/
//   node scripts/fetch-real-data.js 2026 --fresh downloads everything again
// The raw files are large and are not committed. Run scripts/build-real-pack.js afterwards to make the pack.
// It needs network access to site.api.espn.com and uses curl, which honors the session's proxy settings.
const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const season = +process.argv[2] || 2026; const fresh = process.argv.includes('--fresh');
const teams = JSON.parse(fs.readFileSync(path.join(root, 'data/real/espn-teams.json'), 'utf8')); const cache = path.join(root, 'data/real/cache'); fs.mkdirSync(cache, { recursive: true });
const base = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/';
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function get(url, file) {
  if (!fresh && fs.existsSync(file) && fs.statSync(file).size > 2000) return 'cached';
  for (let i = 0; i < 4; i++) {
    try { execFileSync('curl', ['-sS', '-m', '40', '--fail', '-o', file, url], { stdio: ['ignore', 'ignore', 'pipe'] }); JSON.parse(fs.readFileSync(file, 'utf8')); sleep(250); return 'ok'; }
    catch (e) { sleep(2000 * Math.pow(2, i)); }
  }
  try { fs.unlinkSync(file); } catch (e) { } return 'FAILED';
}
let bad = 0; const ids = Object.keys(teams);
ids.forEach((id, i) => {
  const r = get(base + teams[id].espn + '/roster', path.join(cache, id + '.roster.json')); const s = get(base + teams[id].espn + '/schedule?season=' + season, path.join(cache, id + '.schedule.json'));
  if (r === 'FAILED' || s === 'FAILED') bad++; process.stdout.write(`\r${i + 1}/${ids.length} ${id.padEnd(6)} roster ${r}, schedule ${s}      `);
});
console.log(`\n${ids.length - bad} of ${ids.length} schools downloaded to data/real/cache/` + (bad ? ` (${bad} failed: run it again)` : ''));
process.exit(bad ? 1 : 0);
