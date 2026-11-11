#!/usr/bin/env node
// Writes PATCH_NOTES.md from the PATCH_NOTES list in src/js/210-patch-notes.js, so the two never disagree.
//   node scripts/patch-notes.js          rewrite PATCH_NOTES.md
//   node scripts/patch-notes.js --check  exit 1 if PATCH_NOTES.md is out of date
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const root = path.join(__dirname, '..'); const src = fs.readFileSync(path.join(root, 'src/js/210-patch-notes.js'), 'utf8');
const a = src.indexOf('const PATCH_NOTES = ['); if (a < 0) { console.error('PATCH_NOTES not found'); process.exit(1); }
const b = src.indexOf('\n];', a); const list = vm.runInNewContext('(' + src.slice(src.indexOf('[', a), b + 2) + ')');
const md = '# Football Empire patch notes\n\n' + list.map(p => `## ${p.v} — ${p.t}\n${p.n.map(x => '- ' + x).join('\n')}\n`).join('\n');
const out = path.join(root, 'PATCH_NOTES.md');
if (process.argv.includes('--check')) { if (fs.readFileSync(out, 'utf8') !== md) { console.error('PATCH_NOTES.md is out of date. Run: node scripts/patch-notes.js'); process.exit(1); } console.log('PATCH_NOTES.md matches the game (' + list.length + ' updates, newest ' + list[0].v + ')'); }
else { fs.writeFileSync(out, md); console.log('wrote PATCH_NOTES.md (' + list.length + ' updates, newest ' + list[0].v + ')'); }
