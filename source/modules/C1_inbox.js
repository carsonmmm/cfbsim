
/* ===================== v9.51: the inbox takes you there, and decisions come first =====================
 * The Inbox and the "Needs your attention" card share one list. Every item knows the page it lives on and the
 * card to scroll to, so Go lands right on it. With one thing waiting, the Inbox button goes straight there.
 * Decisions you have to answer move to the top of the page, above everything else, and every other page
 * shows a banner until they're answered. */
(function () { const el = document.createElement('style'); el.textContent = `.inbox li.go{cursor:pointer}.inbox li.go:hover span{text-decoration:underline}.inhl{animation:inhl 1.6s ease-out 1}@keyframes inhl{0%{box-shadow:0 0 0 3px var(--maize,#f2c14e)}70%{box-shadow:0 0 0 3px var(--maize,#f2c14e)}100%{box-shadow:none}}.evbanner{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}`; document.head.appendChild(el); })();
// the card each kind of item lives in
const INBOX_SEL = { event: '[data-act="event"]', cevent: '[data-act="cevent"]', crehab: '[data-act="crehab"]', owev: '[data-act="owev"]', desk: '.cmitem', spon: '[data-act="owspon"]', vote: '[data-act="owvote"], [data-act="owcba"]', ext: '[data-act="owext2"]', name: '[data-act="owname"]', deal: '[data-act="owdealblock"]', trade: '#view .card', nil: '#view .card', xp: '#view .card' };
function inboxSel(x) {
  if (x.sel) return x.sel; const t = String(x.txt || '').toLowerCase(); const tab = x.tab || x.ctab;
  if (/decision|is waiting for your answer/.test(t) && tab === 'office') return INBOX_SEL.event; if (/decision/.test(t) && tab === 'home') return INBOX_SEL.cevent;
  if (/rehab plan/.test(t) && x.ctab) return INBOX_SEL.crehab; if (/on your desk|agenda/.test(t)) return INBOX_SEL.desk;
  if (/for the owner/.test(t)) return INBOX_SEL.owev; if (/sponsor offer/.test(t)) return INBOX_SEL.spon; if (/meeting/.test(t)) return INBOX_SEL.vote;
  if (/contract.*run|extend or let go/.test(t)) return INBOX_SEL.ext; if (/naming-rights/.test(t)) return INBOX_SEL.name; if (/deadline deal/.test(t)) return INBOX_SEL.deal;
  return '';
}
// is it something you must answer before the game moves on?
function inboxBlocking(x) { const t = String(x.txt || '').toLowerCase(); return /decision|waiting for your answer|rehab plan|pick your college|choose your school|agenda|for the owner/.test(t) || x.act === 'liveresume'; }
// one list: the inbox's own items plus everything the attention card knows about, with no repeats
{ const _ii = inboxItems; inboxItems = function () {
  let base = []; try { base = _ii(); } catch (e) { base = []; } let extra = []; try { extra = typeof attnItems === 'function' ? attnItems() : []; } catch (e) { extra = []; }
  const key = x => (x.tab || x.ctab || x.act || '') + '|' + String(x.txt || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 24);
  const seen = new Set(base.map(key)); const tabs = new Set(base.map(x => (x.tab || x.ctab) + '|' + inboxSel(x)));
  extra.forEach(x => { const y = appMode === 'career' ? { txt: x.txt, ctab: x.tab, act: x.act } : x; const k2 = (y.tab || y.ctab) + '|' + inboxSel(y); if (!seen.has(key(y)) && !(inboxSel(y) && tabs.has(k2))) { base.push(y); seen.add(key(y)); } });
  return base.map((x, i) => Object.assign({}, x, { sel: inboxSel(x), blk: inboxBlocking(x), i })).sort((a, b) => (b.blk - a.blk) || (a.i - b.i));
}; }
// Go: the page, then the card on it
function inboxGo(x) {
  hideModal(); if (x.act) { const f = actions[x.act]; if (f) return f.call(actions, {}); }
  const tab = x.tab || x.ctab; if (appMode === 'career') cui.tab = tab; else ui.tab = tab; render();
  const land = () => { let el = x.sel ? document.querySelector('#view ' + x.sel.split(',').map(s => s.trim()).join(', #view ')) : null; if (el) el = el.closest('section') || el;
    if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.remove('inhl'); void el.offsetWidth; el.classList.add('inhl'); } else window.scrollTo(0, 0); };
  requestAnimationFrame(land);
}
function inboxRow(x, i) { return `<li class="go" data-act="inboxgo2" data-i="${i}"><span>${x.blk ? '<b>' : ''}${esc(x.txt)}${x.blk ? '</b>' : ''}</span><button class="btn sm${i === 0 ? ' primary' : ''}" data-act="inboxgo2" data-i="${i}">Go</button></li>`; }
inboxHTML = function () { const it = inboxItems(); ui.inboxList = it; return `<div class="eyebrow">Inbox</div><h2 class="h2">${it.length ? `${it.length} thing${it.length > 1 ? 's' : ''} waiting on you` : 'Nothing waiting on you'}</h2>${it.length ? `<ul class="plainlist inbox">${it.map(inboxRow).join('')}</ul><p class="hint">Go takes you to the page, and to the card that needs you.</p>` : '<p class="muted">You are all caught up.</p>'}`; };
Object.assign(actions, {
  inbox() { const it = inboxItems(); if (it.length === 1) { ui.inboxList = it; return inboxGo(it[0]); } openModal(inboxHTML(), 'Inbox'); },
  inboxgo2(d) { const x = (ui.inboxList || [])[+d.i]; if (x) inboxGo(x); },
});
// the attention card uses the same list (minus what's already on this page) and the same Go
attnHTML = function (cur) {
  const all = inboxItems(); ui.inboxList = all; const it = all.map((x, i) => [x, i]).filter(([x]) => (x.tab || x.ctab) !== cur || x.act); if (!it.length) return '';
  return `<section class="card attn" role="status"><div class="eyebrow">Needs your attention</div><ul>${it.slice(0, 6).map(([x, i]) => `<li><span>${x.blk ? '<b>' : ''}${esc(x.txt)}${x.blk ? '</b>' : ''}</span><button class="btn ghost sm" data-act="inboxgo2" data-i="${i}">Go</button></li>`).join('')}</ul></section>`;
};
// decisions first: on any page, a decision you have to answer moves above everything else
function blockingNow() { try { const all = inboxItems(); ui.inboxList = all; return all.filter(x => x.blk); } catch (e) { return []; } }
{ const _sc = signCard; signCard = function () { return _sc().replace('<section class="card next">', '<section class="card next" data-block="1">'); }; }
{ const _q = qolAfterRender; qolAfterRender = function () {
  try {
    const view = document.getElementById('view'); if (view && (appMode === 'ad' || appMode === 'career')) {
      const sels = ['[data-act="event"]', '[data-act="cevent"]', '[data-act="crehab"]', '[data-act="owev"]', '.cmitem', '[data-block]'];
      const cards = []; sels.forEach(s => view.querySelectorAll(s).forEach(el => { const c = el.classList.contains('cmitem') ? el : el.closest('section'); if (c && !cards.includes(c)) cards.push(c); }));
      if (cards.length) { const desk = view.querySelector('.cmitem') ? cards[0].previousElementSibling : null; cards.slice().reverse().forEach(c => view.prepend(c)); if (desk && desk.classList.contains('next')) view.prepend(desk); }
      else { const b = blockingNow()[0]; const here = appMode === 'career' ? cui.tab : ui.tab; if (b && (b.tab || b.ctab) !== here && !document.querySelector('#view .evbanner')) { const s = document.createElement('section'); s.className = 'card next evbanner'; s.setAttribute('role', 'alert'); const i = (ui.inboxList || []).indexOf(b); s.innerHTML = `<span><b>Waiting on you:</b> ${esc(b.txt)}</span><button class="btn primary sm" data-act="inboxgo2" data-i="${i}">${/decision|answer|for the owner|rehab/i.test(b.txt) ? 'Answer it' : 'Go there'}</button>`; view.prepend(s); } }
    }
  } catch (e) { console.error(e); }
  _q();
}; }
