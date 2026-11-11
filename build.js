#!/usr/bin/env node
// Builds index.html (the whole game in one file) from src/.
//   node build.js          write index.html and check the JavaScript parses
//   node build.js --check  exit 1 if index.html is not what src/ produces (used by npm test)
// Files in src/css and src/js are joined in name order, so the number at the front of each name is its load order.
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const root = __dirname; const src = path.join(root, 'src');
const read = f => fs.readFileSync(path.join(src, f), 'utf8');
const dir = (d, ext) => fs.readdirSync(path.join(src, d)).filter(f => f.endsWith(ext)).sort().map(f => d + '/' + f);

const js = dir('js', '.js').map(read).join('');
const html = read('head.html') + '<style>\n' + dir('css', '.css').map(read).join('') + '</style>\n' + read('body.html') + '<script>\n' + js + read('tail.html');

try { new vm.Script(js, { filename: 'src/js (joined)' }); }
catch (e) {
  // Point at the source file and line, not the line in the joined script.
  let line = Number((String(e.stack).match(/src\/js \(joined\):(\d+)/) || [])[1] || 0); let where = '';
  for (const f of dir('js', '.js')) { const n = read(f).split('\n').length - 1; if (line <= n) { where = 'src/' + f + ':' + line; break; } line -= n; }
  console.error('SYNTAX ERROR ' + where + '\n' + e.message); process.exit(1);
}

const out = path.join(root, 'index.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== html) { console.error('index.html does not match src/. Run: node build.js'); process.exit(1); }
  console.log('index.html matches src/');
} else {
  fs.writeFileSync(out, html);
  console.log('built index.html (' + Math.round(html.length / 1024) + ' KB, ' + dir('js', '.js').length + ' script files, ' + dir('css', '.css').length + ' style files)');
}
