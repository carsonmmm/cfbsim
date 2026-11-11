// v9.49 features. ARGS: seed seasons
const seed = +(ARGS[0] || 81), N = +(ARGS[1] || 4); const out = {}; const log = (k, v) => { out[k] = v; };
appMode = 'ad'; saveBlocked = true; ownWorld({ name: 'H', diff: 'normal', gm: 'hire', seed }); const t0 = ownMarket()[3].tid; const v = ownClubVal(t0);
log('buy', ownCloseBuy(t0, v, 800, Math.min(OWN().cash, (v - 800) * 0.45))); OWN().pending = false;
const sim1 = () => { let g = 0; const s0 = OWN().pnl.length; while (OWN().pnl.length === s0 && g++ < 400) { if (state.phase === 'offseason') { if (OWN().ev) ownEvAnswer(OWN().ev.opts[0][0]); proAutoOffseason(); if (state.phase === 'offseason') return 'stuck ' + PS().off.step + ' ' + JSON.stringify(proOffBlockers()); } else { if (overCap()) capFix(ME); advance(); } } return 'ok ' + state.season; };
const tabs = () => { const bad = []; for (const [k] of PRO_TABS) { if (!tabVisible(k)) continue; ui.tab = k; try { render(); if (/could not be shown/.test(document.getElementById('view').textContent)) bad.push(k); } catch (e) { bad.push(k + ':' + e.message); } } return bad; };
log('tabs0', tabs()); log('visible', PRO_TABS.filter(([k]) => tabVisible(k)).map(t => t[0]).join(','));
const o = OWN(); log('owners', Object.keys(ownOwners()).length);
log('pres', ownHirePres(ownPresCands()[0].id)); log('presPrice', o.biz.price);
log('feat', [ownFeatBuild('plaza'), ownFeatBuild('board'), ownFeatBuild(ownFeat().field === 'turf' ? 'grass' : 'turf')]);
log('dist', ownDistStart()); log('ins', ownInsure(true)); log('intl', ownIntlAsk('London'));
log('court', ownCourt(Object.keys(ownOwners())[0]));
const gmc = ownGmCands(); log('neg', ownNeg('gm', gmc[0].id, gmc[0].sal * 0.8, gmc[0].yrs));
log('piece', [ownSellPiece(), ownBuyPiece()]); log('mom', ownMoment('visit'));
for (let i = 0; i < N; i++) { log('sim' + i, sim1()); const m = o.lg.meet; if (m && !m.done) { m.items.forEach(it => { if (!it.cba) ownVoteOn(it.id, 'yes'); }); } if (o.sOff) o.sOff.filter(f => !f.done).forEach(f => ownSponTake(f.id)); if (o.ext && o.ext.length) o.ext.slice().forEach(e => ownExtend(e.k, true)); if (i === 0) { log('media', ownMediaChoose('own')); log('pe', ownPeIn()); log('distNext', ownDistStart()); } }
log('rows', o.pnl.map(r => [r.s, r.w + '-' + r.l, Math.round(r.tr), Math.round(r.net), Math.round(r.val), r.fill, Object.entries(r.rev).filter(([k]) => ['deals', 'media', 'district', 'feat', 'spons', 'prem'].includes(k)).map(([k, v]) => k + ':' + Math.round(v)).join(' ')]));
log('awards', o.awards && o.awards[0]); log('survey', o.survey); log('ach', o.ach); log('lg', { patch: o.lg.patch, pe: o.lg.pe, intl: o.lg.intlMore, N: NFL.length, hist: (o.lg.hist || []).slice(0, 2).map(h => h.items.map(i => i.t + ':' + (i.pass ? 'Y' : 'N') + ':' + i.yes)) });
log('intlDone', o.intl); log('dis', o.dis); log('spons', o.spons); log('mediaNow', o.media); log('pe', o.pe); log('pct', o.pct); log('ext', o.ext); log('dist', o.dist);
log('tabs1', tabs()); ui.tab = 'history'; render(); log('hist', document.getElementById('view').textContent.slice(0, 200));
return out;
