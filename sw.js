// Football Empire service worker: lets the game load with no connection once it has been opened online.
// The game page is fetched from the network first, so players always get the newest version when they are
// online, and falls back to the saved copy when they are not. Fonts and images are served from the saved copy.
const CACHE = 'football-empire-v1';
const SHELL = ['./', 'favicon.svg', 'manifest.webmanifest', 'docs/img/icon-192.png', 'docs/img/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); const same = url.origin === self.location.origin; const font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return; // everything else goes straight to the network
  const keep = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') { // the game page: newest first, saved copy when offline
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(keep)));
});
