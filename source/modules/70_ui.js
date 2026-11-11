
/* ===================== OWNER MODE: the pages ===================== */
const ownFanWord = v => (v >= 75 ? 'Fired up' : v >= 55 ? 'Happy' : v >= 35 ? 'Grumbling' : 'Angry');
const ownTile = (k, v, s, cls) => `<div><span class="k">${k}</span><span class="v${cls ? ' ' + cls : ''}">${v}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
const ownLocked = () => { const o = OWN(); return o.partner ? `<p class="flash">As a minority partner you can watch, but ${esc(o.partner.seller)} makes the decisions until you take control.</p>` : o.out ? `<p class="flash bad">${esc(o.out.txt)}</p>` : ''; };
const ownCan = () => { const o = OWN(); return !o.partner && !o.out && !o.done; };
// a simple crest: a shape, a mark and two colors
const ownInitials = c => { const w = String(c || 'FC').split(/\s+/).filter(Boolean); return (w.length > 1 ? w.map(x => x[0]).join('') : w[0].slice(0, 2)).slice(0, 3).toUpperCase(); };
const OWN_SHAPES = { shield: 'M50 6 L90 18 L86 62 Q80 86 50 96 Q20 86 14 62 L10 18 Z', circle: 'M50 6 A44 44 0 1 1 49.9 6 Z', diamond: 'M50 4 L94 50 L50 96 L6 50 Z', hex: 'M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z' };
const OWN_MARKS = { text: 'Letters', star: 'Star', bolt: 'Bolt', crown: 'Crown', horn: 'Horns', wave: 'Wave' };
const OWN_MARK_PATH = { star: 'M50 24 L57 43 L77 43 L61 55 L67 75 L50 63 L33 75 L39 55 L23 43 L43 43 Z', bolt: 'M56 20 L34 54 L48 54 L42 80 L68 44 L54 44 Z', crown: 'M28 66 L24 36 L38 48 L50 28 L62 48 L76 36 L72 66 Z', horn: 'M26 30 Q32 58 50 62 Q68 58 74 30 Q66 50 50 52 Q34 50 26 30 Z M42 64 L58 64 L54 76 L46 76 Z', wave: 'M20 56 Q32 40 44 56 T68 56 T84 52 L84 64 Q72 76 60 64 T36 64 T20 68 Z' };
function ownLogoSVG(lg, size) {
  lg = lg || { shape: 'shield', mark: 'text', c1: (NFL_BY[ME] || {}).c1 || '#334455', c2: (NFL_BY[ME] || {}).c2 || '#dddddd', txt: ownInitials(T(ME) && T(ME).city) };
  const sz = size || 72; const txt = esc(String(lg.txt || '').slice(0, 3).toUpperCase());
  const mark = lg.mark === 'text' || !OWN_MARK_PATH[lg.mark] ? `<text x="50" y="${txt.length > 2 ? 60 : 62}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="${txt.length > 2 ? 26 : 34}" fill="${esc(lg.c2)}">${txt}</text>` : `<path d="${OWN_MARK_PATH[lg.mark]}" fill="${esc(lg.c2)}"/>`;
  return `<svg class="ownlogo" width="${sz}" height="${sz}" viewBox="0 0 100 100" role="img" aria-label="Club crest"><path d="${OWN_SHAPES[lg.shape] || OWN_SHAPES.shield}" fill="${esc(lg.c1)}" stroke="${esc(lg.c2)}" stroke-width="4"/>${mark}</svg>`;
}
function ownLogoForm(lg, pre) {
  pre = pre || 'ol'; return `<div class="fgrid"><label class="fld"><span>Shape</span><select id="${pre}-shape">${Object.keys(OWN_SHAPES).map(k => `<option value="${k}" ${lg.shape === k ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}</select></label>
   <label class="fld"><span>Mark</span><select id="${pre}-mark">${Object.entries(OWN_MARKS).map(([k, l]) => `<option value="${k}" ${lg.mark === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <label class="fld"><span>Letters</span><input id="${pre}-txt" maxlength="3" value="${esc(lg.txt || '')}"></label>
   <label class="fld"><span>Main color</span><input id="${pre}-c1" type="color" value="${esc(lg.c1)}"></label><label class="fld"><span>Second color</span><input id="${pre}-c2" type="color" value="${esc(lg.c2)}"></label></div>`;
}
function ownReadLogo(pre) { const g = id => { const el = document.getElementById(pre + '-' + id); return el ? el.value : ''; }; return { shape: OWN_SHAPES[g('shape')] ? g('shape') : 'shield', mark: OWN_MARKS[g('mark')] ? g('mark') : 'text', txt: g('txt').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'FC', c1: tpkColor(g('c1')) || '#334455', c2: tpkColor(g('c2')) || '#dddddd' }; }

/* ---------- the owner's suite ---------- */
function ownMoneyCard() {
  const o = OWN();
  return `<section class="card"><div class="eyebrow">${esc(o.name)}${o.gen > 1 ? ` · generation ${o.gen}` : ''} · ${ownDiff().label}</div><h2 class="h3">${o.partner ? 'Minority partner' : `${Math.round(o.pct * 100)}% owner`} of the ${esc(myName())}</h2>
   <div class="tiles">${ownTile('Club value', fmO(o.val), o.valHist.length > 1 ? `${o.val >= o.valHist[o.valHist.length - 2].v ? '+' : '−'}${fmO(Math.abs(o.val - o.valHist[o.valHist.length - 2].v))} last year` : '')}${ownTile('Your stake', fmO(ownStakeVal()), `${Math.round(o.pct * 100)}% of the equity`)}${ownTile('Your cash', fmO(o.cash), 'outside the club')}${ownTile('Net worth', fmO(ownWorth()))}</div>
   <div class="tiles mt">${ownTile('Club bank', fmMs(o.bank), '', o.bank < 0 ? 'neg' : '')}${ownTile('Club debt', fmO(o.debt), `limit ${fmO(ownDebtLimit())}`)}${ownTile('Interest', fmMs(o.debt * o.rate), `${r1(o.rate * 100)}% a year`)}${ownTile('Partners', o.partners || 0, 'minority owners')}</div>
   <div class="row gap mt"><button class="btn ghost sm" data-act="tab" data-tab="obiz">Business</button><button class="btn ghost sm" data-act="tab" data-tab="career">Legacy</button></div></section>`;
}
function ownMetersCard() {
  const o = OWN();
  return `<section class="card"><div class="eyebrow">How it's going</div>
   ${meter('Fans', state.meters.fan, 'Winning, fair prices and a good stadium. Angry fans stop buying tickets.')}
   ${meter('Brand', Math.round(o.brand), 'How big the club is nationally: sponsors and merchandise follow it.')}
   ${meter('City relations', o.cityRel, 'What city hall thinks of you. It decides whether the public helps pay for a stadium.')}
   ${meter('Reputation with the owners', o.rep, 'How the other 31 owners see you. It moves votes.')}
   ${meter('Commissioner', o.comm, 'A good relationship brings prime-time games and hosting; a bad one brings fines.')}
   ${ownHands() || o.meddle ? meter('Meddling', o.meddle, 'Every order you give the GM counts. Good GMs and coaches avoid owners who meddle.', true) : ''}</section>`;
}
function ownEvCardHTML() {
  const o = OWN(); const ev = o.ev; if (!ev || !ownCan()) return '';
  return `<section class="card decision"><div class="eyebrow">For the owner</div><h2 class="h3">${esc(ev.t)}</h2><p>${esc(ev.x)}</p><div class="row gap wrap">${ev.opts.map(([k, l]) => `<button class="btn sm${k === 'quiet' ? ' ghost' : ''}" data-act="owev" data-v="${k}">${esc(l)}</button>`).join('')}</div>${ev.wk != null ? '<p class="hint">If you don\'t answer within two weeks, you say nothing.</p>' : ''}</section>`;
}
function ownDealCardHTML() {
  const o = OWN(); const d = o.gmDeal; if (!d || d.done || d.s !== state.season || !ownHands()) return '';
  return `<section class="card decision"><div class="eyebrow">Your GM's deadline deal</div><p>${esc(d.txt)}</p>${d.blocked ? '<p class="flash">You blocked it.</p>' : `<div class="row gap"><button class="btn ghost sm" data-act="owdealblock">Block it</button><span class="hint">Blocking counts as meddling. Otherwise it goes through next week.</span></div>`}</section>`;
}
function ownGoalsCard() {
  const o = OWN(); if (!o.goals || !o.goals.length) return '';
  return `<section class="card"><div class="eyebrow">Goals${o.scen ? ' · ' + esc(OWN_SCEN[o.scen] ? OWN_SCEN[o.scen][0] : '') : ''}</div><ul class="plainlist">${o.goals.map(g => `<li>${g.done ? '<span class="pill good">Done</span>' : g.fail ? '<span class="pill bad">Missed</span>' : `<span class="pill">By ${g.by}</span>`} ${esc(g.t)}</li>`).join('')}</ul></section>`;
}
function ownOutCard() {
  const o = OWN(); if (o.done) return `<section class="card"><div class="eyebrow">Retired</div><h2 class="h3">${esc(o.name)} has retired</h2><p>Your career is complete. The Legacy tab has the whole story. Start a new owner career from the Home screen.</p><button class="btn primary" data-act="tab" data-tab="career">See your legacy</button></section>`;
  if (o.out) return `<section class="card decision"><div class="eyebrow">Between clubs</div><p>${esc(o.out.txt)}</p><p>Buy another club, or retire.</p><div class="row gap"><button class="btn primary" data-act="tab" data-tab="career">Clubs for sale</button></div></section>`;
  if (o.partner) { const P_ = o.partner; return `<section class="card decision"><div class="eyebrow">Minority partner · 10%</div><p>${esc(P_.seller)} runs the club this season. ${P_.offer ? `<b>He's ready to sell you control.</b>` : `After the season, he sells you control if your group can pay its part (about ${fmO((P_.price - o.debt) * 0.2)}).`}</p>${P_.offer ? '<button class="btn primary sm" data-act="tab" data-tab="career">See the offer</button>' : ''}</section>`; }
  return '';
}
function vOwnOffice() {
  const ms = michStrength(); const o = OWN();
  return `${tradeAlert()}${ownOutCard()}<div class="grid2"><div class="col">${ownEvCardHTML()}${ownDealCardHTML()}${proNextCard()}${proChangesHTML()}${proLastCard()}${newsCard()}</div>
  <div class="col">${ownMoneyCard()}${ownMetersCard()}${ownGoalsCard()}${ownStaffMini()}
   <section class="card"><div class="eyebrow">Team strength</div><div class="tiles">${ownTile('Overall', ms.ovr.toFixed(0))}${ownTile('Offense', ms.off.toFixed(0))}${ownTile('Defense', ms.def.toFixed(0))}${ownTile('Expected wins', PS().expW)}</div>
   <p class="small muted">${state.phase !== 'offseason' && T(ME).w + T(ME).l ? esc(proStandTxt(ME)) + '. ' : ''}${o.gm === 'self' ? 'You are also the general manager.' : `General manager: ${o.gmP ? esc(o.gmP.name) : 'vacant'}.`}</p></section>${injuryCard()}</div></div>`;
}
function ownStaffMini() {
  const o = OWN(); const hc = state.staff.HC; const g = o.gmP;
  return `<section class="card"><div class="head"><div class="eyebrow">Running the team</div><button class="btn ghost sm" data-act="tab" data-tab="front">Front office</button></div>
   <p class="small">${o.gm === 'self' ? '<b>You</b> are the general manager.' : g ? `GM <b>${esc(g.name)}</b> (${g.ovr}, ${esc(OWN_GM_STYLE[g.style][0].toLowerCase())}) · relationship ${g.rel}` : '<b>No general manager.</b>'}<br>${hc ? `Head coach <b>${esc(hc.name)}</b>${hc.interim ? ' (interim)' : ''} · ${coachOvr(hc)} overall` : '<b>No head coach.</b>'}<br>Direction: <b>${OWN_DIRS[o.dir][0]}</b></p></section>`;
}

/* ---------- business ---------- */
function vOwnBiz() {
  const o = OWN(); const Y = o.ytd; const R_ = ownRevLines(state.season); const E_ = ownExpLines(); const g1 = ownGate(false); const homeN = 9;
  const projRev = { 'National TV and league money': R_.nat, 'Tickets': g1.gate * homeN, 'Suites and club seats': R_.prem, 'Concessions and parking': (g1.conc + g1.park) * homeN, 'Sponsors': R_.spons, 'Naming rights': R_.naming, 'Merchandise': R_.merch, 'Stadium events': R_.events, 'Revenue sharing': ownShareAdj(g1.gate * 8.5) };
  const projExp = { 'Player payroll': payrollOf(ME), 'Coaches and staff': E_.staff, 'Football budgets': E_.bud, 'Stadium operations': E_.ops, 'Business office': E_.admin, 'Interest': E_.interest, 'Community programs': E_.comty };
  const tr = Object.values(projRev).reduce((a, b) => a + b, 0), te = Object.values(projExp).reduce((a, b) => a + b, 0);
  const line = (l, v) => `<tr><td>${l}</td><td class="num">${fmMs(v)}</td></tr>`;
  const def = ownDefPrice(o.mkt) * ownG(); const can = ownCan();
  const last = o.pnl[o.pnl.length - 1];
  const hist = o.pnl.slice().reverse().slice(0, 15).map(r => `<tr><td>${r.s}</td><td class="small">${esc(nflNick(r.tm))}</td><td class="num">${r.w}-${r.l}</td><td class="num">${fmO(r.tr)}</td><td class="num">${fmO(r.te)}</td><td class="num ${r.net >= 0 ? 'pos' : 'neg'}">${fmMs(r.net)}</td><td class="num">${fmMs(r.mine)}</td><td class="num">${fmO(r.val)}</td><td class="num">${r.fill}%</td></tr>`).join('');
  return `${ownLocked()}<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">${state.phase === 'offseason' ? state.season + 1 + ' · next season, projected' : state.season + ' · a full season, projected'}</div><h2 class="h2">${tr - te >= 0 ? 'Profit' : 'Loss'} of about ${fmMs(Math.abs(tr - te))}</h2>
    <div class="tw"><table class="tbl"><thead><tr><th>Revenue</th><th class="num">$M</th></tr></thead><tbody>${Object.entries(projRev).map(([l, v]) => line(l, v)).join('')}<tr><td><b>Total</b></td><td class="num"><b>${fmO(tr)}</b></td></tr></tbody></table></div>
    <div class="tw mt"><table class="tbl"><thead><tr><th>Expenses</th><th class="num">$M</th></tr></thead><tbody>${Object.entries(projExp).map(([l, v]) => line(l, v)).join('')}<tr><td><b>Total</b></td><td class="num"><b>${fmO(te)}</b></td></tr></tbody></table></div>
    <p class="hint">Projections use today's ticket demand and payroll. Playoff home games add more.</p></section>
   ${state.phase !== 'offseason' ? `<section class="card"><div class="eyebrow">So far this season</div><div class="tiles">${ownTile('Home games', Y.games)}${ownTile('Average crowd', Y.games ? Math.round(Y.att / Y.games).toLocaleString() : '—', Y.fills && Y.fills.length ? `${Y.fills[Y.fills.length - 1]}% full last time` : '')}${ownTile('Tickets', fmMs(Y.gate + Y.poGate))}${ownTile('Payroll paid', fmMs(Y.pay))}</div></section>` : ''}
   ${last ? `<section class="card"><div class="eyebrow">${last.s} · the final books</div><div class="tiles">${ownTile('Revenue', fmO(last.tr))}${ownTile('Expenses', fmO(last.te))}${ownTile('Net', fmMs(last.net), '', last.net >= 0 ? 'pos' : 'neg')}${ownTile('Paid to you', fmMs(last.mine))}</div>
    <details class="mt"><summary>Every line</summary><div class="tw"><table class="tbl small"><tbody>${Object.entries(last.rev).map(([k, v]) => line(OWN_LINE[k] || k, v)).join('')}${Object.entries(last.exp).map(([k, v]) => line('− ' + (OWN_LINE[k] || k), v)).join('')}</tbody></table></div></details></section>` : ''}
  </div><div class="col">
   <section class="card"><div class="eyebrow">Prices</div><h2 class="h3">Tickets: $${o.biz.price} average</h2>
    <p class="small">The going rate in your market is about $${Math.round(def)}. At your price, expect the stadium about <b>${Math.round(ownFill() * 100)}%</b> full (${Math.round(ownFill() * o.stad.cap).toLocaleString()} of ${o.stad.cap.toLocaleString()}). ${o.biz.wait ? `Season-ticket waiting list: <b>${o.biz.wait.toLocaleString()}</b>.` : 'No waiting list.'}</p>
    ${can ? `<div class="fgrid"><label class="fld"><span>Average ticket ($)</span><input id="ow-price" type="number" min="20" step="5" value="${o.biz.price}"></label></div><div class="row gap"><button class="btn sm" data-act="owprice">Set the price</button><span class="hint">Fans react when the season starts: a big jump costs goodwill.</span></div>
    <div class="eyebrow mt">Concessions and parking</div>${seg('owconc', String(o.biz.conc), [['0.8', 'Fan friendly'], ['1', 'Normal'], ['1.2', 'Premium'], ['1.4', 'Gouging']])}` : ''}</section>
   <section class="card"><div class="eyebrow">The club's money</div><div class="tiles">${ownTile('Bank', fmMs(o.bank), '', o.bank < 0 ? 'neg' : '')}${ownTile('Debt', fmO(o.debt), `limit ${fmO(ownDebtLimit())}`)}${ownTile('Interest', fmMs(o.debt * o.rate) + '/yr')}</div>
    ${can ? `<div class="row gap wrap mt"><button class="btn ghost sm" data-act="owborrow" data-v="100">Borrow $100M</button><button class="btn ghost sm" data-act="owrepay" data-v="100">Pay down $100M</button><button class="btn ghost sm" data-act="owrepay" data-v="99999">Pay down all you can</button><button class="btn ghost sm" data-act="owinvest" data-v="100">Put in $100M of your own</button></div>
    <div class="eyebrow mt">Profits paid out to the owners</div>${seg('owpay', String(o.biz.pay), [['0', 'None'], ['0.25', '25%'], ['0.5', '50%'], ['0.75', '75%'], ['1', 'All']])}<p class="hint">What isn't paid out stays in the club's bank for projects. Partners get their share of every payout. You get ${Math.round(o.pct * 100)}%.</p>` : ''}</section>
  </div></div>
  <section class="card"><div class="eyebrow">Season by season</div>${hist ? `<div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>Club</th><th>W-L</th><th class="num">Revenue</th><th class="num">Expenses</th><th class="num">Net</th><th class="num">To you</th><th class="num">Value</th><th class="num">Full</th></tr></thead><tbody>${hist}</tbody></table></div>` : '<p class="muted">The first season\'s books close after the Super Bowl.</p>'}</section>`;
}
const OWN_LINE = { nat: 'National TV and league money', gate: 'Tickets (playoffs included)', prem: 'Suites and club seats', conc: 'Concessions', park: 'Parking', spons: 'Sponsors', naming: 'Naming rights', merch: 'Merchandise', events: 'Stadium events and hosting', share: 'Revenue sharing', extra: 'Other deals', players: 'Player payroll', floor: 'Salary floor shortfall (paid to players)', staff: 'Coaches, GM and staff', bud: 'Football budgets', ops: 'Stadium operations and rent', admin: 'Business office', interest: 'Interest', comty: 'Community programs', other: 'One-time costs' };

/* ---------- the stadium ---------- */
function vOwnStad() {
  const o = OWN(); const s = o.stad; const can = ownCan(); const off = state.phase === 'offseason';
  const b = s.build && !s.build.open ? s.build : null; const f = ui.ownSt || (ui.ownSt = { cap: 68000, roof: s.roof === 'o' && !OWN_WARM.has(ME) ? 'r' : s.roof, ask: 30, psl: 'some', loan: 300 });
  const q = ownStadQuote(f); const ok = o.cityOk && o.cityOk.s === state.season ? o.cityOk : null;
  const projRows = Object.entries(OWN_PROJ).map(([k, p]) => { const why = ownProjOk(k); const busy = s.proj.find(x => x.k === k && !x.done); return `<tr><td><b>${esc(p.t)}</b><div class="small muted">${esc(p.d)} ${esc(p.fx)}.</div></td><td class="num">${fmO(ownProjCost(k))}</td><td>${busy ? `<span class="pill">Ready ${busy.s}</span>` : can && !why ? `<button class="btn sm" data-act="owproj" data-k="${k}">Build</button>` : `<span class="small muted">${esc(why)}</span>`}</td></tr>`; }).join('');
  const cityOpts = OWN_CITIES.filter(c => !NFL.some(t => t.city === c.city)).map(c => `<option value="${esc(c.city)}">${esc(c.city)} · market ${c.mkt} · ${esc(OWN_STAD_TXT[c.stad])}</option>`).join('');
  return `${ownLocked()}<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">${s.temp ? 'Temporary home' : 'Home stadium'}</div><h2 class="h2">${esc(s.name)}</h2>
    <div class="tiles">${ownTile('Seats', s.cap.toLocaleString())}${ownTile('Suites', s.suites)}${ownTile('Club seats', s.club.toLocaleString())}${ownTile('Roof', OWN_ROOF[s.roof][0])}</div>
    ${meter('Quality', Math.round(s.qual), `${s.age} years old. Quality decides how much people pay for suites and events, and it slips as a stadium ages.`)}
    ${s.temp ? `<p class="flash">You're renting ${esc(s.name)} for ${fmMs(s.rent)} a year. A temporary home holds back tickets, suites and sponsors.</p>` : ''}
    <p class="small">${s.naming ? `Naming rights: ${esc(s.naming.co)}, ${fmMs(s.naming.amt)} a year through ${s.naming.end}.` : 'No naming-rights deal.'}</p>
    ${(o.nameOffers || []).length && can ? `<div class="decision mt"><div class="eyebrow">Naming-rights offers</div>${o.nameOffers.map((x, i) => `<div class="row gap mt"><span><b>${esc(x.co)}</b>: ${fmMs(x.amt)} a year for ${x.yrs} years</span><button class="btn sm" data-act="owname" data-i="${i}">Accept</button></div>`).join('')}<p class="hint">Fans of an old stadium don't love a corporate name.</p></div>` : ''}</section>
   <section class="card"><div class="eyebrow">Improvements</div><p class="hint">Started in the offseason, ready for the next season. Paid from the club's bank, then debt, then you and your partners.</p><div class="tw"><table class="tbl"><tbody>${projRows}</tbody></table></div></section>
  </div><div class="col">
   <section class="card"><div class="eyebrow">A new stadium</div>${b ? `<h2 class="h3">Under construction · opens ${b.yr}</h2><p class="small">${OWN_ROOF[b.roof][0]}, ${b.cap.toLocaleString()} seats, ${b.suites} suites. Cost ${fmO(b.cost)}${b.pub ? `, ${fmO(b.pub)} from the public` : ''}${b.psl ? `, ${fmO(b.psl)} in seat licenses` : ''}${b.loan ? `, ${fmO(b.loan)} league loan` : ''}.</p>` : `
    <div class="fgrid"><label class="fld"><span>Seats</span><select id="ow-scap">${[60000, 64000, 68000, 72000, 76000].map(v => `<option value="${v}" ${f.cap === v ? 'selected' : ''}>${v.toLocaleString()}</option>`).join('')}</select></label>
     <label class="fld"><span>Roof</span><select id="ow-sroof">${Object.entries(OWN_ROOF).map(([k, v]) => `<option value="${k}" ${f.roof === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label>
     <label class="fld"><span>Public money to ask for</span><select id="ow-sask">${[0, 15, 30, 45].map(v => `<option value="${v}" ${f.ask === v ? 'selected' : ''}>${v}%</option>`).join('')}</select></label>
     <label class="fld"><span>Personal seat licenses</span><select id="ow-spsl">${[['none', 'None'], ['some', 'Some (fans grumble)'], ['lots', 'Lots (fans are furious)']].map(([k, l]) => `<option value="${k}" ${f.psl === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
     <label class="fld"><span>League stadium loan</span><select id="ow-sloan">${[0, 150, 300].map(v => `<option value="${v}" ${f.loan === v ? 'selected' : ''}>${v ? fmO(v * ownG()) : 'None'}</option>`).join('')}</select></label></div>
    <div class="row gap"><button class="btn ghost sm" data-act="owsquote">Update the numbers</button></div>
    <div class="tiles mt">${ownTile('Cost', fmO(q.cost))}${ownTile('Public', ok ? fmO(q.cost * Math.min(f.ask, ok.ask) / 100) : `${f.ask}% asked`)}${ownTile('Seat licenses', fmO(q.psl))}${ownTile('Club and owners', fmO(Math.max(0, q.cost - (ok ? q.cost * Math.min(f.ask, ok.ask) / 100 : 0) - q.psl - q.loan)))}</div>
    ${ok ? `<p class="flash">The city's answer this offseason: ${ok.ask}% public money.</p>` : ''}
    ${can && off ? `<div class="row gap wrap mt">${ok ? '' : '<button class="btn sm" data-act="owcity">Ask the city</button>'}<button class="btn primary sm" data-act="owbuild">Break ground</button></div><p class="hint">Construction takes three seasons. Ask the city first: without its answer, you pay for all of it.</p>` : '<p class="hint">Stadium plans are made in the offseason.</p>'}`}</section>
   <section class="card"><div class="eyebrow">Leaving town</div><p class="small">A threat to leave gets the city's attention, and makes your fans furious. A real move needs 24 of the owners' votes, a relocation fee, and costs you most of your fan base.</p>
    ${can ? `<div class="row gap wrap"><button class="btn ghost sm" data-act="owthreat">Threaten to leave</button></div>${o.relo && o.relo.k === 'applied' ? `<p class="flash">Your request to move to ${esc(o.relo.city)} goes to the owners at the league meeting.</p>` : o.relo && o.relo.k === 'approved' ? `<p class="flash">Approved: the club plays in ${esc(o.relo.city)} next season.</p>` : off && PS().off && PS().off.step <= 3 ? `<div class="fgrid mt"><label class="fld"><span>Move to</span><select id="ow-rcity">${cityOpts}</select></label><label class="fld"><span>New nickname (optional)</span><input id="ow-rnick" maxlength="20" placeholder="${esc(T(ME).nick || '')}"></label></div><button class="btn danger sm" data-act="owreloc">Ask the owners to approve a move</button>` : '<p class="hint">Requests to move go to the owners in the offseason, before the draft.</p>'}` : ''}</section>
  </div></div>`;
}

/* ---------- fans and brand ---------- */
function vOwnFans() {
  const o = OWN(); const can = ownCan(); const lg = o.logo || { shape: 'shield', mark: 'text', c1: (NFL_BY[ME] || {}).c1 || '#334455', c2: (NFL_BY[ME] || {}).c2 || '#dddddd', txt: ownInitials(T(ME).city) };
  const prog = [['youth', 'Youth football camps', '$2M a year. Fans a little happier every season.'], ['nbhd', 'Invest in the stadium neighborhood', '$10M a year. City relations climb every season.'], ['found', 'A club foundation', '$5M a year. A bigger brand and a happier league office.']];
  return `${ownLocked()}<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">Fans</div>${meter('Fan mood', state.meters.fan, 'Moves with every game, your prices and how you treat the city.')}${meter('Brand', Math.round(o.brand), 'National reach: merchandise, sponsors and the club\'s value.')}
    <div class="tiles">${ownTile('Season tickets', pct0(o.biz.stb), 'of the seats')}${ownTile('Waiting list', o.biz.wait.toLocaleString())}${ownTile('Market size', o.mkt + ' of 10')}</div></section>
   <section class="card"><div class="eyebrow">Community</div>${prog.map(([k, t, d]) => `<div class="setrow"><div><b>${t}</b><div class="hint">${d}</div></div>${can ? seg('owcomty', o.comty[k] ? 'on' : 'off', [['on', 'On'], ['off', 'Off']], `data-k="${k}"`) : (o.comty[k] ? 'On' : 'Off')}</div>`).join('')}</section>
   <section class="card"><div class="eyebrow">Recent moments</div>${(o.evLog || []).length ? `<ul class="plainlist small">${o.evLog.slice(0, 8).map(e => `<li><b>${esc(e.t)}</b> (${e.s}): ${esc(e.a)}${e.auto ? ' <span class="muted">(no answer)</span>' : ''}</li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}</section>
  </div><div class="col">
   <section class="card"><div class="eyebrow">The look</div><div class="row gap">${ownLogoSVG(o.logo, 84)}<div><h2 class="h3">${esc(myName())}</h2><p class="small muted">${o.uni.yr ? `Uniforms introduced ${o.uni.yr}.` : 'Classic uniforms.'}${o.uni.alt ? ' Alternate uniform in the rotation.' : ''}</p></div></div>
    ${can ? `<details class="mt"><summary>Redesign the uniforms and crest</summary>${ownLogoForm(lg, 'ou')}<div class="row gap"><button class="btn ghost sm" data-act="owlogoprev">Preview</button><button class="btn sm" data-act="owuni" data-k="redesign">Unveil it (${fmMs(4 * ownG())})</button></div><div id="ow-prev" class="mt"></div><p class="hint">New uniforms sell, but fans may hate them. Once every five years, in the offseason.</p></details>
    <div class="row gap wrap mt"><button class="btn ghost sm" data-act="owuni" data-k="throwback">Throwback game this week</button><button class="btn ghost sm" data-act="owuni" data-k="alt" ${o.uni.alt ? 'disabled' : ''}>Add an alternate uniform</button></div>` : ''}</section>
  </div></div>`;
}

/* ---------- the front office ---------- */
function ownPlayerButtons(p) {
  const L = PS(); if (!ownCan()) return ''; const b = (k, on, off) => `<button class="btn ghost sm" data-act="owcin" data-k="${k}" data-id="${p.id}" data-pos="${p.pos}">${(L.cin[k] || []).includes(p.id) ? on : off}</button>`;
  return `<div class="eyebrow mt">Your orders to the GM</div><div class="row gap wrap">${underContract(p) ? b('cut', 'Cancel the release order', 'Order him released') + b('trade', 'Cancel the trade order', 'Order him traded') + (p.k && p.k.yrs <= 1 ? `<button class="btn ghost sm" data-act="owext" data-id="${p.id}">Extend him now</button>` : '') : b('keep', 'Cancel', 'Order him re-signed')}</div><p class="hint">Your GM almost always does what you say. Every order counts as meddling.</p>`;
}
function vOwnFront() {
  const o = OWN(); const can = ownCan(); const L = PS(); const hc = state.staff.HC; const g = o.gmP; const off = state.phase === 'offseason'; const early = off && L.off && L.off.step <= 1;
  const ck = ui.confirm;
  const gmBlock = o.gm === 'self' ? `<p>You are the general manager: the cap, contracts, free agency, trades and the draft are yours, on the usual GM tabs. Business sponsors and the other owners take you a little less seriously, and the best coaches are warier of working for an owner who runs the roster.</p>` :
    g ? `<h3 class="h3">${esc(g.name)} <span class="small muted">· ${g.ovr} · ${esc(OWN_GM_STYLE[g.style][0])}</span></h3><p class="small muted">${esc(OWN_GM_STYLE[g.style][1])} ${esc(g.bg)}. ${g.yrs} year${g.yrs === 1 ? '' : 's'} left at ${fmMs(g.sal)} a year.</p>${meter('Relationship', g.rel, 'Falls when you overrule him. Below about 20 he quits.')}${can ? (ck === 'firegm' ? '<div class="row gap"><button class="btn danger sm" data-act="owfiregm">Confirm: fire him</button><button class="btn ghost sm" data-act="ask" data-k="">Keep him</button></div>' : '<button class="btn ghost sm" data-act="ask" data-k="firegm">Fire the GM</button>') : ''}` :
    `<p class="flash bad">You have no general manager.</p>${can ? `<div class="coachgrid mt">${ownGmCands().map(c => `<div class="coach"><div class="cname">${esc(c.name)}</div><div class="hint">${esc(c.bg)} · age ${c.age}</div><div class="rt"><span><em>OVR</em>${c.ovr}</span></div><div class="small muted">${esc(OWN_GM_STYLE[c.style][0])} · ${fmMs(c.sal)} × ${c.yrs}</div>${ownWilling(c, 'gm') ? `<button class="btn sm mt" data-act="owhiregm" data-id="${c.id}">Hire</button>` : '<span class="pill bad mt">Not interested</span>'}</div>`).join('')}</div>` : ''}`;
  const hcCands = (state.cands.HC || []).slice().sort((a, b) => coachOvr(b) - coachOvr(a));
  const hcBlock = hc && !hc.interim ? `<h3 class="h3">${esc(hc.name)}</h3><p class="small muted">Offense ${hc.off} · Defense ${hc.def} · Game day ${hc.gm} · Development ${hc.dev} · ${hc.years || '?'} years left · ${fmM(hc.salary)} a year</p>${can ? (ck === 'firehc' ? '<div class="row gap"><button class="btn danger sm" data-act="prohcfire">Confirm: fire him</button><button class="btn ghost sm" data-act="ask" data-k="">Keep him</button></div>' : '<button class="btn ghost sm" data-act="ask" data-k="firehc">Fire the head coach</button>') : ''}` :
    `<p class="flash bad">${hc ? `${esc(hc.name)} is the interim head coach.` : 'The head coach job is open.'}</p>${can ? `<div class="coachgrid mt">${hcCands.map(c => `<div class="coach"><div class="cname">${esc(c.name)}</div><div class="hint">${esc(c.bg || '')} · age ${c.age || '—'}</div><div class="rt"><span><em>OFF</em>${c.off}</span><span><em>DEF</em>${c.def}</span><span><em>GAME</em>${c.gm}</span><span><em>DEV</em>${c.dev}</span></div><div class="small muted">${fmM(c.salary)} × ${c.years}</div>${ownWilling(c, 'hc') ? `<button class="btn sm mt" data-act="owhirehc" data-id="${c.id}">Hire</button>` : '<span class="pill bad mt">Not interested</span>'}</div>`).join('')}</div>` : ''}`;
  const roster = ownHands() ? state.roster.slice().sort((a, b) => b.ovr - a.ovr).map(p => `<tr><td><button class="lnk" data-act="player" data-id="${p.id}">${esc(p.n)}</button></td><td>${p.pos}</td><td class="num">${p.age}</td><td>${ovrTag(p.ovr)}</td><td class="small">${esc(kTxt(p))}</td><td>${can ? `<div class="row gap">${underContract(p) ? `<button class="chip${L.cin.cut.includes(p.id) ? ' on' : ''}" data-act="owcin" data-k="cut" data-id="${p.id}" data-pos="${p.pos}">Release</button><button class="chip${L.cin.trade.includes(p.id) ? ' on' : ''}" data-act="owcin" data-k="trade" data-id="${p.id}" data-pos="${p.pos}">Trade</button>` : `<button class="chip${(L.cin.keep || []).includes(p.id) ? ' on' : ''}" data-act="owcin" data-k="keep" data-id="${p.id}" data-pos="${p.pos}">Re-sign</button>`}</div>` : ''}</td></tr>`).join('') : '';
  return `${ownLocked()}<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">Who runs the football side</div>${can ? seg('owgm', o.gm, [['hire', 'A GM I hire'], ['self', 'Me, as GM']]) : ''}<p class="hint">${early ? 'You can switch now, before players are re-signed.' : 'You can switch early in the offseason.'}</p>${gmBlock}</section>
   <section class="card"><div class="eyebrow">Head coach</div>${hcBlock}<p class="hint">Candidates decide whether they want to work for you. Meddling, losing and running the roster yourself all scare good people off.</p></section>
   ${ownHands() ? `<section class="card"><div class="eyebrow">Your orders to the GM</div>${cinSummaryOwn()}</section>` : ''}
  </div><div class="col">
   <section class="card"><div class="eyebrow">Direction</div>${can ? seg('owdir', o.dir, Object.entries(OWN_DIRS).map(([k, v]) => [k, v[0]])) : `<b>${OWN_DIRS[o.dir][0]}</b>`}<p class="hint">${esc(OWN_DIRS[o.dir][1])}${o.gm === 'self' ? ' (As your own GM, this is a reminder to yourself.)' : ''}</p></section>
   <section class="card"><div class="eyebrow">Football budgets · ${fmMs(ownExpLines().bud)} a year</div>${Object.entries(OWN_BUD).map(([k, [t, d]]) => `<div class="setrow"><div><b>${t}</b><div class="hint">${d} ${OWN_BUD_LBL[o.bud[k]]}: ${fmMs(OWN_BUD_COST[o.bud[k]] * ownG())} a year.</div></div>${can ? seg('owbud', String(o.bud[k]), [1, 2, 3, 4, 5].map(v => [String(v), String(v)]), `data-k="${k}"`) : o.bud[k]}</div>`).join('')}</section>
   ${meter('Meddling', o.meddle, 'Orders to your GM, blocked trades and public complaints add up; it fades a little each year.', true)}
  </div></div>
  ${roster ? `<section class="card"><div class="eyebrow">The roster · give an order</div><div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>Contract</th><th>Order</th></tr></thead><tbody>${roster}</tbody></table></div><p class="hint">Free-agent targets and draft picks: mark them on the Free agency and Draft board tabs.</p></section>` : ''}`;
}
function cinSummaryOwn() {
  const L = PS(); const c = L.cin; const nm = id => { const p = P(id) || faFind(id) || (L.dc ? L.dc.list.find(x => x.id === id) : null); return p ? `${p.pos} ${p.n}` : null; };
  const line = (lbl, list) => list.length ? `<li><b>${lbl}:</b> ${list.map(nm).filter(Boolean).map(esc).join(', ')}</li>` : '';
  const items = line('Re-sign', c.keep || []) + line('Free-agent targets', c.fa) + line('Draft', c.draft) + line('Release', c.cut) + line('Trade', c.trade);
  const log = (L.cinLog || []).slice(0, 6).map(x => `<li>${esc(x.txt)}</li>`).join('');
  return `${items ? `<ul class="plainlist small">${items}</ul>` : '<p class="hint">No orders right now.</p>'}${log ? `<div class="eyebrow mt">What the GM did</div><ul class="plainlist small">${log}</ul>` : ''}`;
}

/* ---------- the league office ---------- */
function vOwnLeague() {
  const o = OWN(); const m = o.lg.meet; const can = ownCan() || !!o.partner; const open = m && !m.done && state.phase === 'offseason';
  const item = it => {
    if (it.cba) return `<div class="decision mt"><div class="eyebrow">${esc(it.t)}</div><p class="small">${esc(it.txt)}</p>${seg('owcba', it.my || 'mid', [['hard', 'Hard line'], ['mid', 'Compromise'], ['give', 'Keep the peace']], `data-id="${it.id}"`)}</div>`;
    const sup = it.k === 'sb' || it.k === 'dhost' || it.k === 'reloc' ? '' : `<span class="small muted">About ${Math.round(it.sup + (it.whip || 0) * 7)}% support · 75% needed</span>`;
    return `<div class="decision mt"><div class="eyebrow">${it.mine ? 'Your item · ' : ''}${esc(it.t)}</div><p class="small">${esc(it.txt)}${it.ask ? ` <b>The ${esc(teamName(it.ask.tid))} ask for your vote, and they'd owe you ${it.ask.fav === 1 ? 'a favor' : 'two favors'}.</b>` : ''}${it.office ? ` The league office wants a ${it.office}.` : ''}</p>
     <div class="row gap wrap">${!it.mine || it.k === 'share' || it.k === 'rule' ? seg('owvote', it.my || '', [['yes', 'Yes'], ['no', 'No']], `data-id="${it.id}"`) : ''}${o.favors > 0 ? `<button class="btn ghost sm" data-act="owwhip" data-id="${it.id}">Call in a favor (${it.whip || 0})</button>` : ''}${sup}</div></div>`;
  };
  const props = [['shareUp', `Share more of the gate (${o.lg.share}% → ${Math.min(60, o.lg.share + 5)}%)`], ['shareDown', `Share less of the gate (${o.lg.share}% → ${Math.max(20, o.lg.share - 5)}%)`]].concat(ownRuleOpts().map(r => [r.k + ':' + r.to, r.t]));
  const hist = (o.lg.hist || []).slice(0, 4).map(h => `<details><summary>${h.s} meeting · ${h.items.filter(x => x.pass).length} passed</summary><ul class="plainlist small">${h.items.map(x => `<li>${x.pass ? '<span class="pill good">Passed</span>' : '<span class="pill bad">Failed</span>'} ${esc(x.t)}${x.yes != null ? ` (${x.yes} yes)` : ''}${x.my ? ` · you voted ${x.my}` : ''}${x.cba ? ` · ${esc(x.cba)}` : ''}</li>`).join('')}</ul></details>`).join('');
  const vals = NFL.map(t => ({ id: t.id, v: t.id === ME ? o.val : ownClubVal(t.id) })).sort((a, b) => b.v - a.v); const myRank = vals.findIndex(x => x.id === ME) + 1;
  return `${ownLocked()}<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">The owners' meeting · ${m ? m.s + 1 : state.season + 1}</div>${open ? `<p class="small">The owners vote before the draft. You need 75% of the room to pass anything.</p>${m.items.length ? m.items.map(item).join('') : '<p class="muted">A quiet agenda this year.</p>'}
     ${ownCan() && !(o.prop && o.prop.s === state.season) ? `<div class="fgrid mt"><label class="fld"><span>Put an item on the agenda</span><select id="ow-prop">${props.map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join('')}</select></label></div><button class="btn sm" data-act="owprop">Propose it</button>` : ''}` : `<p class="muted">The next meeting's agenda comes out after the Super Bowl.</p>`}
     ${hist ? `<div class="eyebrow mt">Past meetings</div>${hist}` : ''}</section>
  </div><div class="col">
   <section class="card"><div class="eyebrow">Your reputation</div>${meter('Reputation with the owners', o.rep, 'Moves votes, and decides whether they approve your moves.')}${meter('Relationship with the commissioner', o.comm, 'Above 60: prime-time games. Above 72: more of them. Below 25: fines.')}
    <div class="tiles">${ownTile('Favors owed to you', o.favors || 0)}${ownTile('Prime-time games', o.lg.prime ? (o.lg.prime === 2 ? 3 : 2) : 0, 'this season')}</div></section>
   <section class="card"><div class="eyebrow">Hosting</div><p class="small">${o.lg.sbHost ? `You host the ${o.lg.sbHost} Super Bowl.` : 'A Super Bowl brings about $35M and a lot of attention.'} ${o.lg.draftHost ? `You host the ${o.lg.draftHost} draft.` : ''}</p>${ownCan() && open ? `<div class="row gap wrap"><button class="btn ghost sm" data-act="owbidsb">Bid for a Super Bowl</button><button class="btn ghost sm" data-act="owbiddraft">Bid for the draft</button></div>` : ''}</section>
   <section class="card"><div class="eyebrow">League business</div><div class="tiles">${ownTile('Revenue sharing', o.lg.share + '%', 'of the gate')}${ownTile('TV deals', 'through ' + (o.lg.tv - 1))}${ownTile('Labor deal', 'through ' + (o.lg.cba - 1))}${ownTile('Cap growth', rules().capGrow + '%')}</div></section>
   <section class="card"><div class="eyebrow">What the clubs are worth</div><p class="small">The ${esc(myName())} rank <b>${myRank}</b> of ${vals.length}.</p><div class="tw"><table class="tbl small"><tbody>${vals.slice(0, 8).map((x, i) => `<tr class="${x.id === ME ? 'me' : ''}"><td>${i + 1}</td><td>${tchip(x.id)}</td><td class="num">${fmO(x.v)}</td></tr>`).join('')}${myRank > 8 ? `<tr class="me"><td>${myRank}</td><td>${tchip(ME)}</td><td class="num">${fmO(o.val)}</td></tr>` : ''}</tbody></table></div></section>
  </div></div>`;
}

/* ---------- legacy ---------- */
function vOwnLegacy() {
  const o = OWN(); const off = state.phase === 'offseason'; const rows = o.pnl.slice().reverse().map(r => `<tr><td>${r.s}</td><td>${esc(nflNick(r.tm))}</td><td class="num">${r.w}-${r.l}</td><td>${esc(PO_LABEL[r.po])}</td><td class="num">${fmO(r.val)}</td><td class="num">${r.leg != null ? (r.leg >= 0 ? '+' : '') + r1(r.leg) : ''}</td></tr>`).join('');
  const W = o.pnl.reduce((s, r) => s + r.w, 0), Lr = o.pnl.reduce((s, r) => s + r.l, 0);
  const prev = (o.prev || []).map(x => `<li><b>${esc(x.name)}</b> ${x.from}–${x.to}: ${x.w}-${x.l}, ${x.po} playoff trip${x.po === 1 ? '' : 's'}${x.sb ? `, ${x.sb} Super Bowl${x.sb > 1 ? 's' : ''}` : ''}. ${x.how === 'sold' ? `Sold for ${fmO(x.price)}.` : x.how === 'forced' ? 'Forced sale.' : x.how === 'heir' ? 'Handed down.' : 'Retired.'}</li>`).join('');
  let act = '';
  if (o.done) act = '<p>Your career is over. Thanks for running the club.</p>';
  else if (o.out) {
    if (o.out.k === 'partner') act = `<p>${esc(o.out.txt)}</p><button class="btn sm" data-act="owsellstake">Sell your 10% and look for a club</button>`;
    else { const mk = o.mkt0 && o.mkt0.length ? o.mkt0 : ownMarketAgain(); act = `<p>${esc(o.out.txt)} You have ${fmO(o.cash)}.</p>${ownBuyFormHTML(mk, true)}<div class="row gap mt"><button class="btn ghost sm" data-act="owretire">Retire instead</button></div>`; }
  } else if (o.partner && o.partner.offer) act = `<div class="decision"><p>${esc(o.partner.seller)} will sell you control at a ${fmO(o.partner.price)} valuation. Your group needs at least ${fmO(o.partner.need)} from you; you have ${fmO(o.cash)}.</p><div class="fgrid"><label class="fld"><span>You put in ($M)</span><input id="ow-ctl" type="number" step="50" value="${Math.round(o.partner.need)}"></label></div><button class="btn primary sm" data-act="owcontrol">Take control (owners vote)</button></div>`;
  else if (off && !o.partner) { const offers = ownSaleOffers(); const ck = ui.confirm;
    act = `<div class="eyebrow">Sell the club</div><ul class="plainlist">${offers.map((f, i) => `<li>${esc(f.who)}: <b>${fmO(f.price)}</b> ${ck === 'sell-' + i ? `<button class="btn danger sm" data-act="owsell" data-i="${i}">Confirm the sale</button>` : `<button class="btn ghost sm" data-act="ask" data-k="sell-${i}">Sell</button>`}</li>`).join('')}</ul><p class="hint">You get your ${Math.round(o.pct * 100)}% after the debt is paid off, minus 20% tax on the gain. Afterwards you can buy another club or retire.</p>
    <div class="eyebrow mt">Hand the club to an heir</div><div class="fgrid"><label class="fld"><span>Heir's name</span><input id="ow-heir" maxlength="30" placeholder="Name"></label></div><div class="row gap"><button class="btn ghost sm" data-act="owheir">Hand it down (owners vote)</button><button class="btn ghost sm" data-act="${ck === 'retire' ? 'owretire' : 'ask'}" data-k="retire">${ck === 'retire' ? 'Confirm: retire' : 'Retire'}</button></div><p class="hint">The heir keeps your stake and half your legacy. Estate taxes take 40% of your cash.</p>`; }
  else act = '<p class="hint">Selling, retiring or handing the club down happen in the offseason.</p>';
  return `<div class="grid2"><div class="col">
   <section class="card"><div class="eyebrow">${o.gen > 1 ? `Generation ${o.gen} · ` : ''}Owner</div><h2 class="h2">${esc(o.name)}</h2><div class="row gap">${ownLogoSVG(o.logo, 56)}<p class="small">${o.hof ? `<span class="pill maize">Hall of Fame, ${o.hof}</span> ` : ''}${o.pnl.length} season${o.pnl.length === 1 ? '' : 's'} as an owner · ${W}-${Lr} · ${o.sb || 0} Super Bowl${o.sb === 1 ? '' : 's'}</p></div>
    <div class="tiles mt">${ownTile('Legacy', Math.round(o.legacy + (o.legacyOld || 0)), o.legacyOld ? `${Math.round(o.legacyOld)} from before` : '')}${ownTile('Net worth', fmO(ownWorth()))}${ownTile('Club value', fmO(o.val))}${ownTile('Bought for', o.price ? fmO(o.price) : o.path === 'family' ? 'Inherited' : '—')}</div>
    <p class="hint">Legacy grows with winning, titles, a growing club, a new stadium and community work. Meddling, losses and moving the club cost you. Owners with a big legacy go into the Hall of Fame.</p></section>
   <section class="card">${act}</section>
  </div><div class="col">
   <section class="card"><div class="eyebrow">Season by season</div>${rows ? `<div class="tw"><table class="tbl"><thead><tr><th>Year</th><th>Club</th><th>W-L</th><th>Result</th><th class="num">Value</th><th class="num">Legacy</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">Your first season is ahead.</p>'}</section>
   ${prev ? `<section class="card"><div class="eyebrow">Clubs you owned</div><ul class="plainlist small">${prev}</ul></section>` : ''}
  </div></div>`;
}
// clubs for sale and the money behind a bid (used at the start and after a sale)
function ownBuyFormHTML(mk, again) {
  const o = OWN(); const f = ui.ownBuy || (ui.ownBuy = {}); const pick = mk.find(x => x.tid === f.tid) || mk[0]; f.tid = pick.tid;
  const bid = f.bid != null ? f.bid : Math.round(pick.ask); const debt = f.debt != null ? f.debt : Math.round(Math.min(ownDebtLimit(), pick.ask * 0.18)); const eq = bid - debt; const mine = f.mine != null ? f.mine : Math.round(Math.min(o.cash, Math.max(eq * 0.3, eq * 0.5)));
  const chk = ownFinCheck(bid, debt, mine);
  return `<div class="diffs ownmk">${mk.map(x => { const t = T(x.tid); const pf = ownProf(x.tid); return `<button class="evopt${x.tid === pick.tid ? ' on' : ''}" data-act="owpick" data-v="${x.tid}"><b>${esc(teamName(x.tid))}</b><span>Asking about ${fmO(x.ask)} · ${t.hist.length ? t.hist[t.hist.length - 1].w + '-' + t.hist[t.hist.length - 1].l : t.w + '-' + t.l} last season · market ${pf.mkt} · stadium ${pf.age} years old${x.bidders > 1 ? ` · ${x.bidders} other bidders` : ' · another bidder'}</span><span class="small">${esc(x.story)}</span></button>`; }).join('')}</div>
   <div class="fgrid mt"><label class="fld"><span>Your bid ($M)</span><input id="ow-bid" type="number" step="25" value="${bid}"></label><label class="fld"><span>Club debt ($M)</span><input id="ow-debt" type="number" step="25" value="${debt}"></label><label class="fld"><span>Your own money ($M)</span><input id="ow-mine" type="number" step="25" value="${mine}"></label></div>
   <div class="row gap"><button class="btn ghost sm" data-act="owfin">Check the numbers</button></div>
   <p class="small">${chk.ok ? `Equity ${fmO(chk.eq)}: you'd own <b>${Math.round(chk.pct * 100)}%</b>${chk.partners ? ` with ${chk.partners} minority partner${chk.partners > 1 ? 's' : ''}` : ''}, and keep ${fmO(chk.left)} in cash.` : `<span class="neg">${esc(chk.err)}</span>`} League debt limit: ${fmO(ownDebtLimit())}.</p>
   ${f.msg ? `<p class="flash">${esc(f.msg)}</p>` : ''}
   <button class="btn primary" data-act="${again ? 'owbuyagain' : 'owsbid'}" ${chk.ok ? '' : 'disabled'}>${f.round ? 'Make your best and final offer' : 'Make the bid'}</button>`;
}
// the offseason pages
function ownReviewHTML() {
  const o = OWN(); const L = PS(); const rv = L.off.review; const r = o.pnl[o.pnl.length - 1];
  if (rv.fresh || !r) return `<section class="card"><div class="eyebrow">Welcome</div><h2 class="h2">The ${esc(myName())} are yours</h2><p>Last season the club went ${rv.w}-${rv.l} (${esc(PO_LABEL[rv.po].toLowerCase())}). Expected wins next season: <b>${proExpWins()}</b>.</p><p class="small">This offseason: ${o.gm === 'self' ? 'you run the roster as your own GM' : 'your GM runs the roster; you give orders if you want'}. Set ticket prices on the Business tab, look over the stadium, and vote at the league meeting before the draft.</p>${nextBtn('Continue to the front office')}</section>`;
  return `<section class="card"><div class="eyebrow">Season review · ${r.s}</div><h2 class="h2">${r.w}-${r.l} · ${esc(PO_LABEL[r.po])}</h2>
   <div class="tiles">${ownTile('Revenue', fmO(r.tr))}${ownTile('Profit', fmMs(r.net), '', r.net >= 0 ? 'pos' : 'neg')}${ownTile('Paid to you', fmMs(r.mine))}${ownTile('Club value', fmO(r.val), `${r.dv >= 0 ? '+' : '−'}${fmO(Math.abs(r.dv))}`)}</div>
   <div class="tiles mt">${ownTile('Crowds', r.fill + '% full')}${ownTile('Fans', r.fan)}${ownTile('Brand', r.brand)}${ownTile('Legacy', (r.leg >= 0 ? '+' : '') + r1(r.leg))}</div>
   ${r.call ? `<p class="flash bad">The club ran short: you put in ${fmMs(r.call)} of your own money.</p>` : ''}${o.out ? `<p class="flash bad">${esc(o.out.txt)}</p>` : ''}
   ${o.gmP && ownHands() ? `<p class="small">Your GM, ${esc(o.gmP.name)}: season grade ${o.gmP.score != null ? o.gmP.score : '—'}, relationship ${o.gmP.rel}.</p>` : ''}
   ${o.out || o.done ? '<button class="btn primary" data-act="tab" data-tab="career">What now?</button>' : nextBtn('Continue to the front office')}</section>${ownEvCardHTML()}${ownGoalsCard()}`;
}
function ownFrontStepHTML() {
  const o = OWN(); return `${vOwnFront()}<section class="card"><p class="small">${o.lg.meet && !o.lg.meet.done && o.lg.meet.items.length ? `The owners' meeting has ${o.lg.meet.items.length} item${o.lg.meet.items.length > 1 ? 's' : ''} for your vote, on the <button class="lnk" data-act="tab" data-tab="oleague">League office</button> tab. It meets before the draft.` : ''} ${ownHands() ? 'Anyone you haven\'t hired by the time you move on gets hired for you: the best candidate willing to come.' : ''}</p>${nextBtn('Continue to re-signing')}</section>`;
}
