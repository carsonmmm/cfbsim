/* ===================== APPEARANCE: per-device display preferences ===================== */
// Theme, light/dark, navigation layout, animation and text size belong to the device, not to a
// career, so they live in their own storage key and survive switching save slots.
const PREFS_KEY = 'mfad-prefs';
const SKINS = {
  classic: { label: 'Classic', desc: 'Navy and gold with bold condensed headlines. Takes on your school\'s colors in AD mode.', fonts: 'Big+Shoulders+Display:wght@600;700;800;900&family=Public+Sans:wght@400;500;600;700' },
  broadcast: { label: 'Game Day Broadcast', desc: 'TV-style graphics: slanted type, a scorebug header and a news ticker.', fonts: 'Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,600;1,700;1,800&family=Barlow:wght@400;500;600;700' },
  gazette: { label: 'Front Office Gazette', desc: 'The sports section: serif headlines, ruled columns and newsprint.', fonts: 'Playfair+Display:wght@700;800;900&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400' },
  scoreboard: { label: 'Stadium Scoreboard', desc: 'Retro stadium: color blocks, pennant tabs and glowing scoreboard numbers.', fonts: 'Graduate&family=Zilla+Slab:wght@400;500;600;700&family=Share+Tech+Mono' },
  dashboard: { label: 'Front Office Dashboard', desc: 'A clean management app: soft cards, calm colors, easy to scan.', fonts: 'Poppins:wght@500;600;700&family=Inter:wght@400;500;600;700' },
};
const PREF_DEFAULTS = { skin: 'classic', mode: 'auto', nav: 'top', side: 'shown', anim: 'auto', size: 'normal', liveSpeed: 1, callPlays: false, field: 'on', playClock: 'off', keys: 'on', cb: 'off', compact: 'off', seen: 0 };
const PREF_CHOICES = { skin: Object.keys(SKINS), mode: ['auto', 'light', 'dark'], nav: ['top', 'side'], side: ['shown', 'hidden'], anim: ['auto', 'on', 'off'], size: ['normal', 'large'], liveSpeed: [1, 2, 3], callPlays: [false, true], field: ['on', 'off'], playClock: ['off', 'on'], cb: ['off', 'on'], compact: ['off', 'on'], keys: ['on', 'off'] };
function loadPrefs() {
  let p = {}; try { p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { p = {}; }
  const out = Object.assign({}, PREF_DEFAULTS);
  Object.keys(PREF_CHOICES).forEach(k => { if (PREF_CHOICES[k].includes(p[k])) out[k] = p[k]; });
  out.seen = +p.seen || 0; return out;
}
let prefs = loadPrefs();
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { } }
function setPref(k, v) {
  if (!(k in PREF_CHOICES)) return false;
  const val = PREF_CHOICES[k].find(x => String(x) === String(v)); if (val === undefined) return false;
  prefs[k] = val; savePrefs(); applyPrefs(); return true;
}
const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() { } });
const MQ_DARK = mq('(prefers-color-scheme: dark)'), MQ_MOTION = mq('(prefers-reduced-motion: reduce)');
function resolvedMode() { return prefs.mode === 'auto' ? (MQ_DARK.matches ? 'dark' : 'light') : prefs.mode; }
function motionOn() { return prefs.anim === 'on' || (prefs.anim === 'auto' && !MQ_MOTION.matches); }
function applyPrefs() {
  const r = document.documentElement; const d = r.dataset;
  d.skin = prefs.skin; d.mode = resolvedMode(); d.nav = prefs.nav; d.side = prefs.side; d.size = prefs.size; d.cb = prefs.cb; d.compact = prefs.compact;
  r.classList.toggle('fx', motionOn());
  const link = document.getElementById('fontlink');
  const href = 'https://fonts.googleapis.com/css2?family=' + SKINS[prefs.skin].fonts + '&display=swap';
  if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(r).getPropertyValue('--band').trim() || '#0A1424');
}
[MQ_DARK, MQ_MOTION].forEach(m => m.addEventListener && m.addEventListener('change', () => { applyPrefs(); if (typeof render === 'function' && typeof state !== 'undefined' && state) render(); }));

