/* ===================== v9.53: a picture of your season to share =====================
 * In the offseason the Office offers a 1200x630 picture of the season just finished, in the team's colors:
 * the record, how it ended, and the career so far. It is drawn on a canvas in the browser; nothing is uploaded. */
function seasonCardData() {
  if (!state || appMode !== 'ad' || isComm() || typeof shareSeasons !== 'function') return null;
  let ss; try { ss = shareSeasons(); } catch (e) { return null; } if (!ss || !ss.length) return null; const h = ss[ss.length - 1];
  const sc = (typeof schoolColors === 'function' && schoolColors()) || { c1: '#FFCB05', c2: '#00274C' }; const p = teamPalette(sc.c1, sc.c2);
  const role = isOwner() ? 'Owner' : isCoach() ? (state.co && state.co.name ? state.co.name : 'Coach') : isPro() ? 'General manager' : 'Athletic director';
  return { team: myName(), season: h.s, w: h.w, l: h.l, end: h.title ? (isPro() ? 'Super Bowl champions' : 'National champions') : h.post ? (isPro() ? 'Playoff team' : 'Postseason team') : '', role,
    n: ss.length, tw: ss.reduce((a, x) => a + x.w, 0), tl: ss.reduce((a, x) => a + x.l, 0), titles: ss.filter(x => x.title).length, iron: typeof ironOn === 'function' && ironOn(), bg: p.band, fg: p.bandText, hi: p.onBand || p.bandText };
}
function seasonCardCanvas(d) {
  const W = 1200, H = 630; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const disp = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', body = '"Public Sans", system-ui, sans-serif';
  g.fillStyle = d.bg; g.fillRect(0, 0, W, H); g.fillStyle = d.hi; g.fillRect(0, H - 16, W, 16);
  const fit = (txt, font, size, max) => { do { g.font = font.replace('%', size); size -= 4; } while (g.measureText(txt).width > max && size > 24); };
  g.textBaseline = 'alphabetic'; g.fillStyle = d.fg; g.globalAlpha = 0.72; g.font = `600 30px ${body}`; g.fillText(`${d.season} SEASON · ${d.role.toUpperCase()}${d.iron ? ' · IRONMAN' : ''}`, 72, 104); g.globalAlpha = 1;
  g.fillStyle = d.hi; fit(d.team.toUpperCase(), `900 %px ${disp}`, 132, W - 144); g.fillText(d.team.toUpperCase(), 72, 236);
  g.fillStyle = d.fg; g.font = `900 220px ${disp}`; g.fillText(`${d.w}-${d.l}`, 72, 440);
  if (d.end) { const x = 72 + g.measureText(`${d.w}-${d.l}`).width + 40; g.fillStyle = d.hi; fit(d.end.toUpperCase(), `800 %px ${disp}`, 64, W - x - 72); g.fillText(d.end.toUpperCase(), x, 420); }
  g.fillStyle = d.fg; g.globalAlpha = 0.8; g.font = `500 30px ${body}`; g.fillText(`Career: ${d.n} season${d.n > 1 ? 's' : ''}, ${d.tw}-${d.tl}${d.titles ? `, ${d.titles} title${d.titles > 1 ? 's' : ''}` : ''}`, 72, 520);
  g.textAlign = 'right'; g.font = `600 28px ${body}`; g.fillText('Football Empire · collegefbsim.com', W - 72, 570); g.globalAlpha = 1; g.textAlign = 'left';
  return c;
}
function seasonCardHTML() {
  const d = state && state.phase === 'offseason' ? seasonCardData() : null; if (!d) return '';
  return `<section class="card" id="seasoncard"><div class="head"><div><div class="eyebrow">Share your season</div><h2 class="h3">${esc(d.team)}, ${d.season}: ${d.w}-${d.l}${d.end ? ' · ' + esc(d.end) : ''}</h2></div><p class="hint">A picture of the season in your team's colors, made on this device.</p></div><div class="row gap"><button class="btn" data-act="seasoncard" data-v="save">Save the picture</button>${navigator.share && navigator.canShare ? '<button class="btn ghost" data-act="seasoncard" data-v="share">Share</button>' : ''}</div><p class="small muted" id="seasoncardmsg" role="status"></p></section>`;
}
{ const w = f => function () { return f.apply(this, arguments) + seasonCardHTML(); }; vOffice = w(vOffice); vCoachOffice = w(vCoachOffice); vProOffice = w(vProOffice); }
Object.assign(actions, {
  async seasoncard(d) {
    const data = seasonCardData(); const msg = t => { const m = document.getElementById('seasoncardmsg'); if (m) m.textContent = t; }; if (!data) return;
    try { if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('600 30px "Public Sans"')]); } catch (e) { }
    const name = `football-empire-${String(data.team).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${data.season}.png`;
    const blob = await new Promise(res => seasonCardCanvas(data).toBlob(res, 'image/png')); if (!blob) return msg('The picture could not be made in this browser.');
    if (d.v === 'share') { try { const file = new File([blob], name, { type: 'image/png' }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Football Empire', text: `${data.team} went ${data.w}-${data.l} in ${data.season}.` }); return msg('Shared.'); } } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); msg('Saved ' + name + '.'); } catch (e) { msg('Downloads are blocked here.'); }
  },
});
