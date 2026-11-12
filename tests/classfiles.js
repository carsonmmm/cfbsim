// Recruiting class and draft class files. Run with: node tests/run.js tests/classfiles.js
const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); };
await enterAD(); newGame('normal', null, 7, 'OSU'); appMode = 'ad';
// college: export, read back, add, replace
need(classKind() === 'recruit', 'a college career should offer the recruiting class'); const n0 = state.rec.list.length; const csv = classExport();
need(csv.split('\n')[0] === 'Name,Pos,Stars,Rating,Potential,Hometown' && csv.trim().split('\n').length === n0 + 1, 'the recruiting class did not export one line a player');
let pr = classParse(csv, 'recruit'); need(pr.rows.length === n0 && !pr.bad.length, 'the exported class does not read back cleanly: ' + pr.rows.length + ' of ' + n0 + ', bad ' + pr.bad.length);
const mine = 'Name,Pos,Stars,Rating,Potential,Hometown\n"Test, Jr.",QB,5,74,97,"Columbus, OH"\nBad Line,XX,9,10\nEdge Guy,EDGE,4,66,88,Miami FL\n<b>Tag</b> Name,WR,3,58,80,';
pr = classParse(mine, 'recruit'); need(pr.rows.length === 3 && pr.bad.length === 1 && pr.rows[0].n === 'Test, Jr.' && pr.rows[1].pos === 'DE' && pr.rows[2].n === 'Tag Name', 'a hand-made file was not read correctly: ' + JSON.stringify(pr));
let r = classImport(mine, 'add'); need(r.added === 3 && state.rec.list.length === n0 + 3, 'adding recruits did not add three'); const t = state.rec.list.find(x => x.n === 'Test, Jr.'); need(t && t.star === 5 && t.interest > 0 && t.status === 'open' && t.lead.length, 'an imported recruit is not a working recruit');
state.rec.list[5].status = 'signed'; const kept = state.rec.list[5].n; r = classImport(mine, 'replace'); need(state.rec.list.length === 4 && state.rec.list.some(x => x.n === kept), 'replacing the class should keep recruits already signed');
ui.tab = 'file'; render(); need(!!document.getElementById('classcard') && !!document.getElementById('clsfile'), 'the Save file page has no class card');
document.getElementById('clstext').value = mine; actions.clsprev({ v: 'add' }); need(/3 players found/.test(document.getElementById('classcard').textContent), 'the preview did not count the players'); actions.clsimport({ v: 'add' }); need(/3 players imported/.test(document.getElementById('classcard').textContent), 'importing from the page did not report back');
ui.tab = 'recruit'; let bad = false; try { render(); bad = /could not be shown/.test(document.getElementById('view').textContent); } catch (e) { bad = true; } need(!bad, 'the Recruiting page broke after an import');
autoSeason(); need(state.history.length === 1, 'a season did not play out after importing recruits');
// NFL: export, add, replace, then run the draft
newGame('normal', null, 21, 'MICH'); goPro('DEN', { role: 'gm' }); need(classKind() === 'draft', 'a GM career should offer the draft class'); const d0 = PS().dc.list.length; const dcsv = classExport();
need(dcsv.split('\n')[0] === 'Name,Pos,Age,Rating,Potential,College' && classParse(dcsv, 'draft').rows.length === d0, 'the draft class does not read back cleanly');
r = classImport('Can\'t Miss,QB,21,82,97,Imported U\nToo Old,RB,40,70,75,Nowhere', 'add'); need(r.added === 1 && r.bad.length === 1 && PS().dc.list.length === d0 + 1, 'adding a prospect did not work'); const top = PS().dc.list.find(p => p.n === 'Can\'t Miss'); need(top && top.cr <= 5, 'a top prospect should rank near the top of the board: ' + (top && top.cr));
r = classImport(dcsv, 'replace'); need(PS().dc.list.length === d0 && PS().dc.list.every((p, i) => p.cr === i + 1), 'replacing the draft class did not rebuild the board');
ui.tab = 'draft'; bad = false; try { render(); bad = /could not be shown/.test(document.getElementById('view').textContent); } catch (e) { bad = true; } need(!bad, 'the Draft page broke after an import');
let g = 0; while (state.phase === 'offseason' && g++ < 40) proAutoOffseason(); need(state.phase !== 'offseason', 'the offseason and draft did not finish after an import'); out.rookies = state.roster.filter(p => p.exp === 0).length;
out.wide = document.documentElement.scrollWidth; return out;
