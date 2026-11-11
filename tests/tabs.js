const out = {}; appMode = 'ad'; saveBlocked = true;
const vis = () => curTabs().filter(([k]) => tabVisible(k)).map(t => t[0] + (state.phase ? '' : ''));
newGame('normal', null, 3, 'MICH'); out.ad = vis(); out.adGroups = curGroups().map(g => g[0] + ':' + g[1].filter(tabVisible).join('|'));
newCoachCareer({ tid: 'MICH', role: 'HC', name: 'C', diff: 'normal' }); out.coach = vis();
newGame('normal', null, 4, 'MICH'); goPro('DET', { role: 'gm' }); out.gm = vis(); out.gmGroups = curGroups().map(g => g[0] + ':' + g[1].filter(tabVisible).join('|'));
newComm2({ lvl: 'col' }); out.commCol = vis(); newComm2({ lvl: 'nfl' }); out.commNfl = vis();
ownWorld({ name: 'O', diff: 'normal', gm: 'hire', seed: 5 }); ownInherit(); OWN().pending = false; out.own = vis();
out.career = CTABS.map(t => t[0]); out.cgroups = CTAB_GROUPS.map(g => g[0] + ':' + g[1].join('|'));
return out;
