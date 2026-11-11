
/* ===================== v9.49: the owner pages, expanded ===================== */
Object.assign(OWN_LINE, { spons: 'General sponsors', deals: 'Sponsor deals', media: 'Local TV and radio', district: 'Stadium district', feat: 'Plaza and lounge' });
// horizontal bars: one color, sorted, value labels in text ink, hover tips (the game's chart styles)
function ownHBars(items, o) {
  o = o || {}; const n = items.length; if (!n) return `<p class="hint">${o.empty || 'No data yet.'}</p>`; const W = 440, rowH = 24, L = 168, Rr = 64, H = n * rowH + 8; const max = Math.max(...items.map(x => Math.abs(x.v)), 1e-9);
  const rows = items.map((x, i) => { const y = 4 + i * rowH; const w = Math.max(2, (W - L - Rr) * Math.abs(x.v) / max); return `<text x="${L - 8}" y="${y + 16}" text-anchor="end" class="ct">${esc(x.lbl.length > 27 ? x.lbl.slice(0, 26) + '…' : x.lbl)}</text><rect x="${L}" y="${y + 5}" width="${w.toFixed(1)}" height="${rowH - 10}" rx="4" class="cbar${x.v < 0 ? ' neg' : ''}"/><text x="${L + w + 6}" y="${y + 16}" class="ct">${esc(o.fmt ? o.fmt(x.v) : x.v)}</text><rect x="0" y="${y}" width="${W}" height="${rowH}" class="chit" data-tip="${esc(x.lbl + ': ' + (o.fmt ? o.fmt(x.v) : x.v))}"/>`; }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Chart')}">${rows}</svg></div>`;
}
function ownValueChart() {
  const o = OWN(); const vh = o.valHist.filter(v => v && Number.isFinite(v.v)); if (vh.length < 2) return '<p class="hint">The chart fills in after your first season.</p>';
  const lo = Math.min(...vh.map(v => v.v)), hi = Math.max(...vh.map(v => v.v)); const pad = Math.max(200, (hi - lo) * 0.15); const min = Math.max(0, Math.floor((lo - pad) / 500) * 500), max = Math.ceil((hi + pad) / 500) * 500; const step = Math.max(500, Math.round((max - min) / 4 / 500) * 500);
  const ticks = []; for (let v = min; v <= max; v += step) ticks.push(v);
  return lineChart(vh.map(v => ({ y: v.v, lbl: String(v.s), tip: `${v.s}: ${fmO(v.v)}` })), { min, max, yTicks: ticks, fmt: v => fmO(v), xLabels: vh.map((v, i) => [i, String(v.s)]).filter((x, i, a) => a.length <= 10 || i % 2 === 0 || i === a.length - 1), title: 'Club value by season', h: 190 });
}
const ownSel = (id, cur, opts) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${esc(String(v))}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
function ownPresCardHTML() {
  const o = ownB(); const p = o.bizP; const can = ownCan(); const ck = ui.confirm; const ng = ui.ownNeg && ui.ownNeg.kind === 'pres' ? ui.ownNeg : null;
  const cands = !p && can ? `<div class="coachgrid mt">${ownPresCands().filter(c => !c.no).map(c => `<div class="coach"><div class="cname">${esc(c.name)}</div><div class="hint">${esc(c.bg)}</div><div class="rt"><span><em>OVR</em>${c.ovr}</span></div><div class="small muted">${esc(OWN_PRES_STYLE[c.style][0])} · ${fmM(c.sal)} × ${c.yrs}</div><div class="row gap mt"><button class="btn sm" data-act="owhirepres" data-id="${c.id}">Hire</button><button class="btn ghost sm" data-act="ownegopen" data-k="pres" data-id="${c.id}">Offer less</button></div>${ng && ng.id === c.id ? ownNegForm('pres', c) : ''}</div>`).join('')}</div>` : '';
  return `<section class="card"><div class="eyebrow">Who runs the business</div>${can ? seg('owbizmode', o.bizMode, [['me', 'I do'], ['pres', 'A president I hire']]) : ''}
   ${p ? `<h3 class="h3 mt">${esc(p.name)} <span class="small muted">· ${p.ovr} · ${esc(OWN_PRES_STYLE[p.style][0])}</span></h3><p class="small muted">${esc(OWN_PRES_STYLE[p.style][1])} ${p.yrs} year${p.yrs === 1 ? '' : 's'} left at ${fmM(p.sal)} a year.</p>${o.bizMode === 'pres' ? '<p class="small">He sets prices before each season, takes the best sponsor and naming-rights offers, and runs ticketing. A good president earns more from sponsors and premium seats.</p>' : '<p class="small">He\'s on staff, but you\'re making the business calls yourself right now.</p>'}${can ? (ck === 'firepres' ? '<div class="row gap"><button class="btn danger sm" data-act="owfirepres">Confirm: let him go</button><button class="btn ghost sm" data-act="ask" data-k="">Keep him</button></div>' : '<button class="btn ghost sm" data-act="ask" data-k="firepres">Let him go</button>') : ''}`
    : `<p class="small">You run the business yourself. A president would set prices, sign sponsors and run ticketing for you.</p>${cands}`}</section>`;
}
function ownNegForm(kind, c) { const s = kind === 'hc' ? c.salary : c.sal, y = kind === 'hc' ? c.years : c.yrs; return `<div class="decision mt"><div class="fgrid"><label class="fld"><span>$M a year</span><input id="ow-ns" type="number" step="0.1" value="${r2(s * 0.88)}"></label><label class="fld"><span>Years</span><input id="ow-ny" type="number" min="1" max="7" value="${y}"></label></div><button class="btn sm" data-act="owneg" data-k="${kind}" data-id="${c.id}">Make the offer</button>${ui.ownNeg && ui.ownNeg.msg ? `<p class="small">${esc(ui.ownNeg.msg)}</p>` : ''}</div>`; }
function ownTixCardHTML() {
  const o = ownB(); const b = o.biz; const def = ownDefPrice(o.mkt) * ownG(); const man = ownCan() && !ownPresOn();
  const ro = (l, v) => `<div class="setrow"><div class="sl"><b>${l}</b></div><div class="sctl">${v}</div></div>`;
  return `<section class="card"><div class="eyebrow">Tickets and prices${ownPresOn() ? ' · set by your president' : ''}</div><h2 class="h3">$${b.price} average ticket</h2>
   <p class="small">The going rate in your market is about $${Math.round(def)}. Expect the stadium about <b>${Math.round(ownFill() * 100)}%</b> full (${Math.round(ownFill() * o.stad.cap).toLocaleString()} of ${o.stad.cap.toLocaleString()}). Season-ticket waiting list: <b>${b.wait.toLocaleString()}</b>.</p>
   ${man ? `<div class="fgrid"><label class="fld"><span>Average ticket ($)</span><input id="ow-price" type="number" min="20" step="5" value="${b.price}"></label></div><button class="btn sm" data-act="owprice">Set the price</button>
   ${setRow('Concessions and parking', 'Higher prices bring in more and annoy fans.', seg('owconc', String(b.conc), [['0.8', 'Fan friendly'], ['1', 'Normal'], ['1.2', 'Premium'], ['1.4', 'Gouging']]))}
   ${setRow('Season-ticket discount', 'Cheaper for the loyal base: more of them renew.', seg('owtix', String(b.stDisc), [['0', 'None'], ['0.05', '5%'], ['0.1', '10%'], ['0.15', '15%']], 'data-k="stDisc"'))}
   ${setRow('Premium seat prices', 'Suites and club seats. Higher prices, fewer buyers.', seg('owtix', String(b.prem), [['0.85', 'Low'], ['1', 'Normal'], ['1.15', 'High'], ['1.3', 'Top dollar']], 'data-k="prem"'))}
   ${setRow('Family section', 'Half-price seats for families: a little less money, happier fans.', seg('owtix', b.family ? 'on' : 'off', [['on', 'On'], ['off', 'Off']], 'data-k="family"'))}
   ${setRow('Student section', 'Cheap seats behind the end zone: young fans grow into season-ticket holders.', seg('owtix', b.students ? 'on' : 'off', [['on', 'On'], ['off', 'Off']], 'data-k="students"'))}`
    : `<p class="small muted">Concessions ${({ 0.8: 'fan friendly', 1: 'normal', 1.2: 'premium', 1.4: 'gouging' })[b.conc] || 'normal'} · season-ticket discount ${Math.round(b.stDisc * 100)}% · premium prices ×${b.prem} · family section ${b.family ? 'on' : 'off'} · student section ${b.students ? 'on' : 'off'}.</p>`}
   <p class="hint">Fans react to prices when the season starts: a big jump costs goodwill.</p></section>`;
}
function ownSurveyHTML() { const s = OWN().survey; if (!s) return ''; const m = (l, v) => meter(l, v, ''); return `<section class="card"><div class="eyebrow">Fan survey · ${s.s}</div>${m('Value for money', s.value)}${m('Game-day experience', s.exp)}${m('The team', s.team)}<p class="small"><b>Overall ${s.all}.</b> What fans said most: ${esc(s.quote)}</p></section>`; }
function ownSponHTML() {
  const o = ownB(); const can = ownCan() && !ownPresOn(); const act = Object.entries(o.spons).filter(([, d]) => d && d.end >= state.season);
  const offers = (o.sOff || []).filter(f => !f.done);
  return `<section class="card"><div class="eyebrow">Sponsors · ${fmMs(ownSponRev())} a year in deals</div>
   ${act.length ? `<ul class="plainlist small">${act.map(([k, d]) => `<li><b>${esc(OWN_SPON[k].t)}:</b> ${esc(d.co)}, ${fmMs(d.amt)} a year through ${d.end}</li>`).join('')}</ul>` : '<p class="small muted">No sponsor deals yet.</p>'}
   ${offers.length ? `<div class="eyebrow mt">Offers${ownPresOn() ? ' (your president will take the good ones)' : ''}</div>${offers.map(f => `<div class="decision mt"><b>${esc(OWN_SPON[f.slot].t)}: ${esc(f.co)}</b> · ${fmMs(f.amt)} a year for ${f.yrs} years<div class="small muted">${esc(OWN_SPON[f.slot].d)}</div>${can ? `<div class="row gap mt"><button class="btn sm" data-act="owspon" data-id="${f.id}" data-v="yes">Sign</button>${f.asked ? '' : `<button class="btn ghost sm" data-act="owspon" data-id="${f.id}" data-v="more">Ask for 15% more</button>`}<button class="btn ghost sm" data-act="owspon" data-id="${f.id}" data-v="no">Pass</button></div>` : ''}</div>`).join('')}<p class="hint">Offers you don't sign go away when the season starts.</p>` : ''}
   ${!o.lg.patch ? '<p class="hint">Jersey patches need the owners\' approval first.</p>' : ''}</section>`;
}
function ownMediaHTML() {
  const o = ownB(); const M = o.media; const off = state.phase === 'offseason'; const due = M.k === 'net' && M.end <= state.season;
  return `<section class="card"><div class="eyebrow">Local TV and radio · ${fmMs(ownMediaRev())} a year</div>
   <p class="small">${M.k === 'own' ? `The club's own channel, since ${M.yr0}. It grows for about four seasons, then pays more than a network would.` : `A deal with a local network through ${M.end}.`}</p>
   ${ownCan() && off && (due || M.k !== 'own') ? `<div class="row gap wrap">${due ? '<button class="btn sm" data-act="owmedia" data-v="net">Sign a new network deal</button>' : ''}${M.k !== 'own' && due ? `<button class="btn ghost sm" data-act="owmedia" data-v="own">Start your own channel (${fmMs(30 * ownG())})</button>` : ''}</div>${due ? '' : `<p class="hint">You can decide when the deal runs out after ${M.end}.</p>`}` : ''}</section>`;
}
function ownStakeHTML() {
  const o = OWN(); if (!ownCan()) return '';
  return `<section class="card"><div class="eyebrow">Your share of the club · ${Math.round(o.pct * 100)}%</div><p class="small">Sell 5% to your partners for about ${fmO(ownEquity() * 0.05 * 0.95)}, or buy 5% back for about ${fmO(ownEquity() * 0.05 * 1.04)}. You must keep at least 30%.</p>
   <div class="row gap wrap"><button class="btn ghost sm" data-act="owpiece" data-v="sell">Sell 5%</button><button class="btn ghost sm" data-act="owpiece" data-v="buy">Buy 5% back</button>${o.lg.pe ? (o.pe ? `<button class="btn ghost sm" data-act="owpe" data-v="out">Buy out ${esc(o.pe.fund)}</button>` : '<button class="btn ghost sm" data-act="owpe" data-v="in">Sell 10% to a private-equity fund</button>') : ''}</div>
   ${o.pe ? `<p class="hint">${esc(o.pe.fund)} owns 10% and requires at least half the profits paid out.</p>` : o.lg.pe ? '<p class="hint">A fund\'s 10% goes into the club\'s bank, and everyone\'s share shrinks a little.</p>' : ''}</section>`;
}
vOwnBiz = function () {
  const o = ownB(); const Y = o.ytd; const R_ = ownRevLines(state.season); const E_ = ownExpLines(); const g1 = ownGate(false); const homeN = 8.5;
  const projRev = Object.assign({ nat: R_.nat, gate: g1.gate * homeN, prem: R_.prem, conc: (g1.conc + g1.park) * homeN }, R_, { share: ownShareAdj(g1.gate * 8.5) }); delete projRev.park;
  const projExp = Object.assign({ players: payrollOf(ME) }, E_); const tr = Object.values(projRev).reduce((a, b) => a + b, 0), te = Object.values(projExp).reduce((a, b) => a + b, 0);
  const lbl = k => (k === 'conc' ? 'Concessions and parking' : OWN_LINE[k] || k); const last = o.pnl[o.pnl.length - 1];
  const hist = o.pnl.slice().reverse().slice(0, 15).map(r => `<tr><td>${r.s}</td><td class="small">${esc(nflNick(r.tm))}</td><td class="num">${r.w}-${r.l}</td><td class="num">${fmO(r.tr)}</td><td class="num">${fmO(r.te)}</td><td class="num ${r.net >= 0 ? 'pos' : 'neg'}">${fmMs(r.net)}</td><td class="num">${fmMs(r.mine)}</td><td class="num">${fmO(r.val)}</td><td class="num">${r.fill}%</td></tr>`).join('');
  const mix = Object.entries(last ? last.rev : projRev).filter(([, v]) => Math.abs(v) >= 0.5).map(([k, v]) => ({ lbl: lbl(k), v: r1(v) })).sort((a, b) => b.v - a.v);
  const emix = Object.entries(last ? last.exp : projExp).filter(([, v]) => v >= 0.5).map(([k, v]) => ({ lbl: lbl(k), v: r1(v) })).sort((a, b) => b.v - a.v);
  const can = ownCan();
  return `${ownLocked()}<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">Club value</div><h2 class="h3">${fmO(o.val)}</h2>${ownValueChart()}</section>
   <section class="card"><div class="eyebrow">${last ? `${last.s} · where the money came from` : 'Where the money comes from (projected)'}</div>${ownHBars(mix, { fmt: v => fmMs(v), title: 'Revenue by source' })}
    <div class="eyebrow mt">${last ? 'Where it went' : 'Where it goes'}</div>${ownHBars(emix, { fmt: v => fmMs(v), title: 'Expenses by line' })}</section>
   <section class="card"><div class="eyebrow">${state.phase === 'offseason' ? state.season + 1 + ' · next season, projected' : state.season + ' · a full season, projected'}</div><h2 class="h3">${tr - te >= 0 ? 'Profit' : 'Loss'} of about ${fmMs(Math.abs(tr - te))}</h2>
    <details><summary>Every line</summary><div class="tw"><table class="tbl small"><tbody>${Object.entries(projRev).map(([k, v]) => `<tr><td>${esc(lbl(k))}</td><td class="num">${fmMs(v)}</td></tr>`).join('')}<tr><td><b>Revenue</b></td><td class="num"><b>${fmO(tr)}</b></td></tr>${Object.entries(projExp).map(([k, v]) => `<tr><td>− ${esc(lbl(k))}</td><td class="num">${fmMs(v)}</td></tr>`).join('')}<tr><td><b>Expenses</b></td><td class="num"><b>${fmO(te)}</b></td></tr></tbody></table></div></details>
    ${state.phase !== 'offseason' ? `<div class="tiles mt">${ownTile('Home games', Y.games)}${ownTile('Average crowd', Y.games ? Math.round(Y.att / Y.games).toLocaleString() : '—')}${ownTile('Tickets so far', fmMs(Y.gate + Y.poGate))}</div>` : ''}</section>
   ${ownSurveyHTML()}
  </div><div class="col">${ownPresCardHTML()}${ownTixCardHTML()}${ownSponHTML()}${ownMediaHTML()}
   <section class="card"><div class="eyebrow">The club's money</div><div class="tiles">${ownTile('Bank', fmMs(o.bank), '', o.bank < 0 ? 'neg' : '')}${ownTile('Debt', fmO(o.debt), `limit ${fmO(ownDebtLimit())}`)}${ownTile('Interest', fmMs(o.debt * o.rate) + '/yr')}</div>
    ${can ? `<div class="row gap wrap mt"><button class="btn ghost sm" data-act="owborrow" data-v="100">Borrow $100M</button><button class="btn ghost sm" data-act="owrepay" data-v="100">Pay down $100M</button><button class="btn ghost sm" data-act="owrepay" data-v="99999">Pay down all you can</button><button class="btn ghost sm" data-act="owinvest" data-v="100">Put in $100M of your own</button></div>
    ${setRow('Profits paid out', `What isn't paid out stays in the bank. You get ${Math.round(o.pct * 100)}% of every payout.`, seg('owpay', String(o.biz.pay), [['0', 'None'], ['0.25', '25%'], ['0.5', '50%'], ['0.75', '75%'], ['1', 'All']]))}` : ''}</section>
   ${ownStakeHTML()}
  </div></div>
  <section class="card"><div class="eyebrow">Season by season</div>${hist ? `<div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>Club</th><th>W-L</th><th class="num">Revenue</th><th class="num">Expenses</th><th class="num">Net</th><th class="num">To you</th><th class="num">Value</th><th class="num">Full</th></tr></thead><tbody>${hist}</tbody></table></div>` : '<p class="muted">The first season\'s books close after the Super Bowl.</p>'}</section>`;
};

/* ---------- the stadium: features, district, insurance, the world ---------- */
{ const _st = vOwnStad; vOwnStad = function () {
  const o = OWN(); const s = o.stad; const can = ownCan(); const F = ownFeat(); const D = o.dist || { n: 0 };
  const feats = Object.entries(OWN_FEAT).map(([k, f]) => { const why = ownFeatOk(k); const have = k === 'turf' ? F.field === 'turf' : k === 'grass' ? F.field === 'grass' : F[k]; return `<tr><td><b>${esc(f.t)}</b><div class="small muted">${esc(f.d)} ${esc(f.fx)}.</div></td><td class="num">${fmMs(f.c * ownG())}</td><td>${have ? `<span class="pill good">${k === 'turf' || k === 'grass' ? 'Current field' : 'Done'}</span>` : can && !why ? `<button class="btn sm" data-act="owfeat" data-k="${k}">Build</button>` : `<span class="small muted">${esc(why)}</span>`}</td></tr>`; }).join('');
  const dist = OWN_DIST.map((ph, i) => `<li>${i < D.n ? '<span class="pill good">Open</span>' : D.build && D.build.i === i ? `<span class="pill">Opens ${D.build.done}</span>` : '<span class="pill ghost">Planned</span>'} <b>${esc(ph.t)}</b> · ${fmO(ph.c * ownG())} · about ${fmMs(ph.rev * ownG())} a year<div class="small muted">${esc(ph.d)}</div></li>`).join('');
  const dwhy = ownDistOk(); const off = state.phase === 'offseason'; const I = o.intl;
  const extra = `<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">Stadium features · field: ${F.field === 'turf' ? 'artificial turf' : 'natural grass'}</div><div class="tw"><table class="tbl"><tbody>${feats}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Insurance</div><p class="small">Storms and power failures are rare, but they move home games and cost millions. Insurance covers 80% of repairs for ${fmMs((2 + s.cap / 30000) * ownG())} a year.</p>${can ? seg('owins', o.ins ? 'on' : 'off', [['on', 'Insured'], ['off', 'Not insured']]) : ''}${o.dis ? `<p class="small">Last damage: ${o.dis.s}, week ${o.dis.wk}, ${fmMs(o.dis.cost)}${o.dis.covered ? `, insurance paid ${fmMs(o.dis.covered)}` : ''}.</p>` : ''}</section>
  </div><div class="col">
   <section class="card"><div class="eyebrow">The stadium district · ${fmMs(ownDistRev())} a year</div><ul class="plainlist">${dist}</ul>${can && !dwhy ? `<button class="btn sm" data-act="owdist">Start the next phase</button>` : `<p class="hint">${esc(dwhy)}</p>`}</section>
   <section class="card"><div class="eyebrow">International games</div><p class="small">Give up one home game to play abroad: the brand and merchandise grow, the league office is pleased, local fans lose a game.${o.lg.intlMore ? '' : ' Once every two seasons, unless the owners vote for more.'}</p>
    ${I && I.s >= state.season ? `<p class="flash">${esc(I.city)}, ${I.s}${I.done ? '' : ' (scheduled)'}.</p>` : can && off ? `<div class="fgrid"><label class="fld"><span>City</span>${ownSel('ow-intl', 'London', OWN_INTL.map(c => [c, c]))}</label></div><button class="btn ghost sm" data-act="owintl">Play a home game there next season</button>` : '<p class="hint">Set in the offseason.</p>'}</section>
  </div></div>`;
  return _st() + extra;
}; }

/* ---------- the league office: the owners and the awards ---------- */
{ const _lg = vOwnLeague; vOwnLeague = function () {
  const o = OWN(); const O = ownOwners(); const off = state.phase === 'offseason' && ownCan(); const court = o.court && o.court.s === state.season ? 2 - o.court.n : 2;
  const rows = Object.entries(O).sort((a, b) => b[1].rel - a[1].rel).map(([tid, w]) => `<tr><td>${tchip(tid)}</td><td><b>${esc(w.name)}</b>${w.grudge ? ' <span class="pill bad">Grudge</span>' : ''}<div class="small muted">${esc(OWN_OSTYLE[w.style][0])} · owner since ${w.since}</div></td><td class="num">${Math.round(w.rel)}</td><td class="num small">${w.votes ? `${w.agree} of ${w.votes}` : '—'}</td><td>${off && court > 0 ? `<button class="btn ghost sm" data-act="owcourt" data-id="${tid}">Dinner</button>` : ''}</td></tr>`).join('');
  const aw = (o.awards || [])[0];
  const styles = Object.entries(OWN_OSTYLE).map(([k, v]) => { const g = Object.values(O).filter(w => w.style === k); return g.length ? `<li><b>${v[0]}s (${g.length}):</b> ${esc(v[1])} Average relationship ${Math.round(g.reduce((s, w) => s + w.rel, 0) / g.length)}.</li>` : ''; }).join('');
  return _lg() + `<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">The other owners</div><p class="small">They remember how you vote, what you say about them, and who did them a favor. Votes are counted owner by owner.${off ? ` Dinners left this offseason: <b>${court}</b>.` : ''}</p>
    <div class="tw"><table class="tbl"><thead><tr><th>Club</th><th>Owner</th><th class="num">With you</th><th class="num">Agreed</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>
  </div><div class="col">
   <section class="card"><div class="eyebrow">Voting blocs</div><ul class="plainlist small">${styles}</ul></section>
   <section class="card"><div class="eyebrow">League awards${aw ? ' · ' + aw.s : ''}</div>${aw ? `<ul class="plainlist"><li><b>Coach of the Year:</b> ${esc(aw.coy[1])} (${esc(teamName(aw.coy[0]))})</li><li><b>Executive of the Year:</b> ${esc(aw.eoy[1])} (${esc(teamName(aw.eoy[0]))})</li><li><b>Owner of the Year:</b> ${esc(aw.ooy[1])} (${esc(teamName(aw.ooy[0]))})</li></ul>` : '<p class="muted">Handed out after the Super Bowl.</p>'}
    ${(o.awards || []).filter(a => [a.coy[0], a.eoy[0], a.ooy[0]].includes(ME)).length ? `<p class="small">Your club's awards: ${(o.awards || []).filter(a => a.ooy[0] === ME).length} Owner of the Year, ${(o.awards || []).filter(a => a.eoy[0] === ME).length} Executive of the Year, ${(o.awards || []).filter(a => a.coy[0] === ME).length} Coach of the Year.</p>` : ''}</section>
  </div></div>`;
}; }

/* ---------- the front office: contracts ---------- */
function ownExtHTML() {
  const o = OWN(); const E = (o.ext || []); if (!E.length || !ownCan()) return '';
  return `<section class="card decision"><div class="eyebrow">Contracts running out</div>${E.map(e => `<div class="row gap wrap mt"><span><b>${esc(e.name)}</b> (${e.k === 'hc' ? 'head coach' : e.k === 'gm' ? 'GM' : 'president'}) wants ${fmM(e.sal)} a year for ${e.yrs} more years.</span><button class="btn sm" data-act="owext2" data-k="${e.k}" data-v="yes">Extend</button><button class="btn ghost sm" data-act="owext2" data-k="${e.k}" data-v="no">Let him go</button></div>`).join('')}<p class="hint">Undecided when you move past the front-office step: winners stay, the rest go.</p></section>`;
}
{ const _f = vOwnFront; vOwnFront = function () {
  let h = _f(); const ng = ui.ownNeg;
  // a "make an offer" button on every candidate card, and the offer form under the one you picked
  h = h.replace(/<button class="btn sm mt" data-act="owhiregm" data-id="([^"]+)">Hire<\/button>/g, (m, id) => `<div class="row gap mt"><button class="btn sm" data-act="owhiregm" data-id="${id}">Hire at his price</button><button class="btn ghost sm" data-act="ownegopen" data-k="gm" data-id="${id}">Offer less</button></div>${ng && ng.kind === 'gm' && ng.id === id ? ownNegForm('gm', ownNegCand('gm', id)) : ''}`);
  h = h.replace(/<button class="btn sm mt" data-act="owhirehc" data-id="([^"]+)">Hire<\/button>/g, (m, id) => `<div class="row gap mt"><button class="btn sm" data-act="owhirehc" data-id="${id}">Hire at his price</button><button class="btn ghost sm" data-act="ownegopen" data-k="hc" data-id="${id}">Offer less</button></div>${ng && ng.kind === 'hc' && ng.id === id && ownNegCand('hc', id) ? ownNegForm('hc', ownNegCand('hc', id)) : ''}`);
  return ownExtHTML() + h;
}; }

/* ---------- the office: the guide, owner moments, contracts ---------- */
function ownGuideHTML() {
  const st = ownGuide(); if (!st) return ''; const done = st.filter(x => x[4]).length;
  return `<section class="card next"><div class="head"><div><div class="eyebrow">Your first season · ${done} of ${st.length}</div><h2 class="h3">Getting started as an owner</h2></div><button class="btn ghost sm" data-act="owguideoff">Hide</button></div><ol class="plainlist">${st.map(([k, t, tab, key, ok]) => `<li>${ok ? '<span class="pill good">Done</span>' : '<span class="pill">To do</span>'} ${esc(t)} <button class="lnk small" data-act="tab" data-tab="${key}">${esc(tab)}</button></li>`).join('')}</ol><p class="hint">Everything else can wait: your GM and head coach run the team, and the Business tab shows where the money comes from.</p></section>`;
}
function ownMomentsHTML() {
  const o = OWN(); if (!ownCan()) return ''; const T_ = ownTime();
  const btns = Object.entries(OWN_MOM).map(([k, m]) => { const why = ownMomentOk(k); return `<div class="setrow"><div class="sl"><b>${esc(m.t)}</b><span class="hint">${esc(why || m.d)}</span></div><div class="sctl"><button class="btn ghost sm" data-act="owmom" data-k="${k}" ${why ? 'disabled' : ''}>Do it</button></div></div>`; }).join('');
  return `<section class="card"><div class="eyebrow">Owner moments · ${T_.n} left this season</div>${btns}${(o.roh || []).length ? `<p class="small">Ring of Honor: ${o.roh.map(x => esc(x.n)).join(', ')}.</p>` : ''}</section>`;
}
{ const _o = vOwnOffice; vOwnOffice = function () { const h = _o(); const pre = ownGuideHTML() + ownExtHTML(); const i = h.indexOf('<div class="col">', h.indexOf('<div class="grid2">')); const j = h.lastIndexOf('<div class="col">'); return h.slice(0, i + 17) + pre + h.slice(i + 17, j + 17) + ownMomentsHTML() + h.slice(j + 17); }; }

/* ---------- legacy: achievements and the all-time owners ---------- */
{ const _l = vOwnLegacy; vOwnLegacy = function () {
  const o = OWN(); const A = o.ach || {}; const O = ownOwners(); const mine = Math.round(o.legacy + (o.legacyOld || 0));
  const rank = Object.entries(O).map(([tid, w]) => ({ n: w.name, tm: tid, v: ownAiLegacy(tid) })).concat([{ n: o.name, tm: ME, v: mine, me: true }]).sort((a, b) => b.v - a.v); const r = rank.findIndex(x => x.me) + 1;
  return _l() + `<div class="grid2"><div class="col"><section class="card"><div class="eyebrow">Owner achievements · ${Object.keys(A).length} of ${OWN_ACH.length}</div><ul class="plainlist small">${OWN_ACH.map(([k, t, d]) => `<li>${A[k] ? `<span class="pill good">${A[k]}</span>` : '<span class="pill ghost">Locked</span>'} <b>${esc(t)}</b>: ${esc(d)}</li>`).join('')}</ul></section></div>
   <div class="col"><section class="card"><div class="eyebrow">The owners, by legacy</div><p class="small">You rank <b>${r}</b> of ${rank.length}.</p><div class="tw"><table class="tbl small"><tbody>${rank.slice(0, 10).map((x, i) => `<tr class="${x.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(x.n)}</td><td>${esc(nflNick(x.tm))}</td><td class="num">${x.v}</td></tr>`).join('')}${r > 10 ? `<tr class="me"><td>${r}</td><td>${esc(o.name)}</td><td>${esc(nflNick(ME))}</td><td class="num">${mine}</td></tr>` : ''}</tbody></table></div></section></div></div>`;
}; }

/* ---------- the franchise's history ---------- */
function vOwnHistory() {
  const o = OWN(); const L = PS(); const t = T(ME); const champs = (L.champs || []).filter(c => c.tm === ME).map(c => c.s); const confs = (L.champs || []).filter(c => c.ru === ME).map(c => c.s).concat(champs).sort();
  const hs = (t.hist || []).slice(); if (state.phase === 'offseason' && t.w + t.l > 0 && !hs.some(h => h.s === state.season)) hs.push({ s: state.season, w: t.w, l: t.l });
  const seasons = hs.reverse().map(h => { const p = (L.hist || []).find(x => x.s === h.s && x.tm === ME); const r = o.pnl.find(x => x.s === h.s && x.tm === ME); return `<tr><td>${h.s}</td><td class="num">${h.w}-${h.l}</td><td>${p ? esc(PO_LABEL[p.po]) : ''}</td><td class="small">${r ? esc(o.name) : ''}</td><td class="num">${r ? fmO(r.val) : ''}</td></tr>`; }).join('');
  const owners = (o.prev || []).filter(x => x.tm === ME).map(x => `<li><b>${x.from}–${x.to}</b>: ${x.w}-${x.l}${x.sb ? `, ${x.sb} Super Bowl${x.sb > 1 ? 's' : ''}` : ''}</li>`).join('') + `<li><b>${o.since}–</b>: ${esc(o.name)}${o.gen > 1 ? ` (generation ${o.gen})` : ''}</li>`;
  const ring = (o.roh || []).map(x => `<li>${x.pos} <b>${esc(x.n)}</b> · ${x.yrs} seasons · inducted ${x.s}</li>`).join(''); const greats = (L.ring || []).filter(x => !(o.roh || []).some(y => y.n === x.n)).map(x => `<li>${x.pos} ${esc(x.n)} · ${x.yrs} seasons with the club</li>`).join('');
  const museum = (o.log || []).filter(x => x.big && x.tm === ME).slice().reverse().slice(-20).reverse().map(x => `<li><span class="when">${x.s}</span>${esc(x.txt)}</li>`).join('');
  return `<section class="card"><div class="eyebrow">Franchise history</div><h2 class="h2">${esc(myName())}</h2><div class="row gap wrap">${ownLogoSVG(o.logo, 64)}<div class="tiles">${ownTile('Super Bowls', champs.length, champs.join(', '))}${ownTile('Conference titles', confs.length)}${ownTile('Ring of Honor', (o.roh || []).length)}</div></div>${champs.length ? `<p class="small">Banners: ${champs.map(s => `<span class="pill maize">${s} champions</span>`).join(' ')}</p>` : ''}</section>
  <div class="grid2"><div class="col"><section class="card"><div class="eyebrow">Season by season</div><div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>W-L</th><th>Result</th><th>Owner</th><th class="num">Value</th></tr></thead><tbody>${seasons || '<tr><td colspan="5" class="muted">No seasons yet.</td></tr>'}</tbody></table></div></section>
   <section class="card"><div class="eyebrow">Owners</div><ul class="plainlist small">${owners}</ul></section></div>
  <div class="col"><section class="card"><div class="eyebrow">Ring of Honor</div>${ring ? `<ul class="plainlist small">${ring}</ul>` : '<p class="muted small">Empty so far.</p>'}${greats ? `<div class="eyebrow mt">Waiting for their moment</div><ul class="plainlist small">${greats}</ul><p class="hint">Induct them from Owner moments on the Owner's suite.</p>` : ''}</section>
   <section class="card"><div class="eyebrow">The club museum</div>${museum ? `<ul class="news">${museum}</ul>` : '<p class="muted small">The big moments collect here.</p>'}</section></div></div>`;
}
{ const _v = ownViewFor; ownViewFor = function (tab) { if (tab === 'history') return vOwnHistory; const v = _v(tab); if (v && ['front', 'ostad'].includes(tab)) { const o = OWN(); o.seen = o.seen || {}; o.seen[tab] = true; } return v; }; }
