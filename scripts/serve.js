#!/usr/bin/env node
// A tiny local web server for trying the game the way the website serves it (the offline app shell only works
// over http, not from a file). Rebuilds index.html whenever a file in src/ changes.
//   node scripts/serve.js [port]     then open http://localhost:8080
const http = require('http'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'); const port = +process.argv[2] || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain', '.md': 'text/plain; charset=utf-8' };
const build = () => { try { console.log(execFileSync(process.execPath, ['build.js'], { cwd: root, encoding: 'utf8' }).trim()); } catch (e) { console.error(String(e.stderr || e.message).trim()); } };
build(); let t = null; fs.watch(path.join(root, 'src'), { recursive: true }, () => { clearTimeout(t); t = setTimeout(build, 150); });
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p); if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return fs.readFile(path.join(root, '404.html'), (e, d) => res.end(d || 'Not found')); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  });
}).listen(port, () => console.log('Football Empire at http://localhost:' + port + '  (Ctrl+C to stop)'));
