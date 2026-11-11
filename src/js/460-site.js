/* ===================== v9.53: the website (collegefbsim.com) =====================
 * Things that belong to the site the game is hosted on, not to the game itself: installing it as an app and
 * playing offline, keeping browser storage safe, and optional visit counting. None of it changes a save. */
const SITE = {
  // The GoatCounter site code (the "mysite" in mysite.goatcounter.com). Empty turns visit counting off.
  // GoatCounter uses no cookies. See docs/DEVELOPMENT.md, "Visit counting".
  goatcounter: 'carsonm',
  host: /(^|\.)collegefbsim\.com$/, // visits are only counted on the real site, never on a copy or a local file
};
// The live site, or a local server while developing (for the offline app shell)
const siteLive = () => (location.protocol === 'https:' && SITE.host.test(location.hostname)) || location.hostname === 'localhost';
const siteCounts = () => !!SITE.goatcounter && location.protocol === 'https:' && SITE.host.test(location.hostname);

/* ---------- visit counting: which modes get played, and how many seasons get finished ---------- */
const siteSeen = {};
function siteTrack(name) {
  if (!siteCounts() || siteSeen[name]) return; siteSeen[name] = 1;
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'event/' + name, title: name, event: true }); } catch (e) { }
}
function siteModeName() { if (appMode === 'career') return 'player'; if (appMode !== 'ad' || !state) return null; return isComm() ? 'commissioner' : isOwner() ? 'owner' : isCoach() ? (isPro() ? 'nfl-coach' : 'coach') : isPro() ? 'gm' : 'ad'; }
let siteSeason = null;
function siteAfterRender() {
  const m = siteModeName(); if (!m) { siteSeason = null; return; }
  siteTrack('play-' + m);
  const yr = appMode === 'career' ? (cs && cs.year) : state.season; const key = m + ':' + (appMode === 'career' ? cslot : slot);
  if (siteSeason && siteSeason.key === key && yr > siteSeason.yr) { delete siteSeen['season-' + m]; siteTrack('season-' + m); }
  siteSeason = { key, yr };
}
{ const _q = qolAfterRender; qolAfterRender = function () { const r = _q.apply(this, arguments); try { siteAfterRender(); } catch (e) { } return r; }; }

/* ---------- storage: ask the browser to keep saves, and show how much room is left ---------- */
const LS_ROOM = 5 * 1024 * 1024; // browsers allow about five million characters for a site
function storageUsed() { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } } catch (e) { } return n; }
function storageNoteHTML() {
  const u = storageUsed(); const pct = Math.round(u / LS_ROOM * 100); if (!u) return '';
  const kept = SITE.persisted === true ? ' This browser has agreed to keep them.' : '';
  return `<p class="small ${pct >= 80 ? 'bad' : 'muted'}" id="storagenote">Saves on this device use ${pct < 1 ? 'less than 1' : pct}% of the room this browser allows (${(u / 1048576).toFixed(1)} of about 5 MB).${pct >= 80 ? ' Room is running out: download a save file for the careers you care about, then delete a slot you no longer play.' : kept}</p>`;
}
function sitePersist() { try { if (navigator.storage && navigator.storage.persist && storageUsed() > 0) navigator.storage.persist().then(ok => { SITE.persisted = ok; }).catch(() => { }); } catch (e) { } }

/* ---------- start-up: the app shell (offline play) and the visit counter ---------- */
function siteBoot() {
  sitePersist();
  if (!siteLive()) return;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  if (siteCounts() && /^[a-z0-9-]+$/i.test(SITE.goatcounter)) { const s = document.createElement('script'); s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = 'https://' + SITE.goatcounter + '.goatcounter.com/count'; document.head.appendChild(s); }
}
try { siteBoot(); } catch (e) { console.error(e); }
