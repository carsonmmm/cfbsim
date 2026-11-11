// One command for CI and before every push: `npm test`.
// 1) index.html must match what build.sh produces from source/. 2) The smoke test must open every mode with no errors.
// 3) Saves written by the game must load again. Exits non-zero on any failure.
const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path'); const os = require('os');
const root = path.join(__dirname, '..'); const fail = []; const node = process.execPath;
const run = (args, env) => execFileSync(node, args, { cwd: root, env: Object.assign({}, process.env, env || {}), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000 });
const lastJson = (s) => { const l = s.trim().split('\n').filter(x => x.startsWith('{')).pop(); return l ? JSON.parse(l) : null; };

// 1) build is fresh
try {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fe-')), 'built.html');
  const mods = fs.readdirSync(path.join(root, 'source/modules')).filter(f => f.endsWith('.js')).sort().map(f => 'source/modules/' + f);
  execFileSync('python3', ['source/edits.py', 'source/base_v947.html', tmp].concat(mods), { cwd: root, stdio: 'pipe' });
  if (fs.readFileSync(tmp, 'utf8') !== fs.readFileSync(path.join(root, 'index.html'), 'utf8')) fail.push('index.html is out of date or was edited by hand: run ./build.sh and commit the result');
  else console.log('ok  build: index.html matches source/');
} catch (e) { fail.push('build failed: ' + String(e.stderr || e.stdout || e.message).slice(0, 300)); }

// 2) smoke: every mode opens, every tab draws
try {
  const r = lastJson(run(['tests/run.js', 'tests/smoke.js']));
  if (!r || r.ERR) fail.push('smoke: ' + JSON.stringify(r));
  else {
    for (const k of ['ad', 'coach', 'gm', 'comm', 'career']) if (r[k] !== 'ok') fail.push('smoke: ' + k + ' tabs failed to draw: ' + JSON.stringify(r[k]));
    if (r.errs && r.errs.length) fail.push('smoke: page errors: ' + JSON.stringify(r.errs));
    if (!fail.length) console.log('ok  smoke: AD, Coach, NFL GM, Commissioner and Player Career all draw');
  }
} catch (e) { fail.push('smoke crashed: ' + String(e.stderr || e.message).slice(0, 300)); }

// 3) persistence
try {
  const out = run(['tests/persist.js']); const r = lastJson(out);
  if (!r) fail.push('persist: no result: ' + out.slice(0, 200));
  else if (r.errs && r.errs.length) fail.push('persist: page errors: ' + JSON.stringify(r.errs));
  else console.log('ok  persist: ' + JSON.stringify(r).slice(0, 200));
} catch (e) { fail.push('persist crashed: ' + String(e.stderr || e.message).slice(0, 300)); }

if (fail.length) { console.error('\nFAILED\n- ' + fail.join('\n- ')); process.exit(1); }
console.log('\nAll checks passed.');
