// The admin panels, driven with a real keyboard and mouse. Run with: node tests/admin.js
// Every value typed has to be saved, including when you move from field to field with Tab, and edits to your own
// coach in Coach mode have to change the coach, not a copy of him.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const out = { fail: [] }; const need = (ok, msg) => { if (!ok) out.fail.push(msg); };
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.setDefaultTimeout(8000); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort()); await p.goto('file://' + (process.env.GAME || path.join(__dirname, '..', 'index.html'))); await p.waitForTimeout(600);
  const type = async v => { await p.keyboard.press('Control+A'); await p.keyboard.type(String(v)); }; const F = (t, k) => `[data-adm="${t}"][data-k="${k}"]`;
  const where = () => p.evaluate(() => ({ tab: ui.tab, adm: ui.admTab, focus: document.activeElement ? (document.activeElement.dataset.k || document.activeElement.dataset.cadm || document.activeElement.tagName) : null }));
  try {
    // athletic director: three fields in a row with the Tab key
    await p.evaluate(async () => { await enterAD(); newGame('normal', null, 5, 'OSU'); appMode = 'ad'; setActiveSlot(1); ui.tab = 'admin'; ui.admTab = 'coaches'; ui.admC = 'HC'; render(); }); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await p.click(F('c:HC', 'off')); await type(71); await p.keyboard.press('Tab'); await type(72); await p.keyboard.press('Tab'); await type(73); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
    let v = await p.evaluate(() => { const c = state.staff.HC; return [c.off, c.def, c.rec]; }); need(v.join() === '71,72,73', 'tabbing through three coach fields saved ' + v.join() + ', not 71,72,73'); let w = await where(); need(w.tab === 'admin' && w.adm === 'coaches' && w.focus === 'dev', 'after tabbing, the cursor should be in the next field of the same page: ' + JSON.stringify(w));
    // click from one field straight into another, then press a button without leaving the field
    await p.click(F('c:HC', 'dev')); await type(88); await p.click(F('c:HC', 'gm')); await type(87); await p.click('[data-act="admtab"][data-v="money"]'); await p.waitForTimeout(150);
    v = await p.evaluate(() => [state.staff.HC.dev, state.staff.HC.gm, ui.admTab]); need(v.join() === '88,87,money', 'clicking between fields and then a button: ' + v.join());
    // a change that affects another field shows there without a redraw
    await p.evaluate(() => { ui.admTab = 'players'; ui.admPos = 'QB'; render(); }); const pid = await p.evaluate(() => ui.admP); await p.evaluate(id => { P(id).ovr = 70; P(id).pot = 72; render(); }, pid);
    await p.click(F('p:' + pid, 'ovr')); await type(90); await p.keyboard.press('Tab'); await p.waitForTimeout(150); v = await p.evaluate(id => [P(id).ovr, P(id).pot, document.querySelector(`[data-adm="p:${id}"][data-k="pot"]`).value, !!document.getElementById('admsaved')], pid);
    need(v[0] === 90 && v[1] === 90 && v[2] === '90' && v[3], 'raising a rating should lift the potential field and say Saved: ' + v.join());
    // digits typed after an edit must never act as shortcuts
    w = await where(); need(w.tab === 'admin', 'typing in the admin panel switched pages'); const wk = await p.evaluate(() => state.week); need(wk === 1, 'typing in the admin panel advanced the season');
    // another school's rating sticks through an offseason
    await p.evaluate(() => { ui.admTab = 'teams'; ui.admT = 'AF'; render(); }); await p.click(F('t:AF', 'rating')); await type(88); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
    v = await p.evaluate(() => { const t = T('AF'); const a = [t.rating, t.pres]; autoSeason(); return a.concat([Math.round(T('AF').rating)]); }); need(v[0] === 88 && v[1] === 88 && v[2] >= 80, 'a school set to 88 should stay near it after a season: ' + v.join());
    // everything typed is still there after saving and loading
    v = await p.evaluate(async () => { save(); await flushSave(); state = null; const r = await loadSlot(1); const c = state.staff.HC; return [r.ok, c.off, c.def, c.rec, c.dev, c.gm].join(); }); need(v === 'true,71,72,73,88,87', 'edits were lost by saving and loading: ' + v);

    // Coach mode: your own coach
    for (const role of ['HC', 'OC']) {
      await p.evaluate(async role => { switchNS('coach'); newCoachCareer({ name: 'Admin Coach', start: 'any', tid: 'IOWA', role, diff: 'normal', gameDay: 'plan', lvl: 'col', seed: 5 }); appMode = 'ad'; setActiveSlot(1); ui.tab = 'admin'; ui.admTab = 'coaches'; ui.admC = role; render(); }, role); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      const tg = 'c:' + role; need(await p.$(F(tg, 'title')) === null && await p.$(F('co', 'rep')) !== null, role + ': your own card should hide Title and show your reputation');
      await p.click(F(tg, 'name')); await type('Sam Rivers'); await p.keyboard.press('Tab');
      if (role === 'HC') { await type(81); await p.keyboard.press('Tab'); await type(82); await p.keyboard.press('Tab'); await type(83); await p.keyboard.press('Tab'); await type(84); await p.keyboard.press('Tab'); await type(85); await p.keyboard.press('Tab'); } else { await type(86); await p.keyboard.press('Tab'); await type(83); await p.keyboard.press('Tab'); await type(84); await p.keyboard.press('Tab'); }
      await type('4.5'); await p.keyboard.press('Tab'); await type(6); await p.keyboard.press('Tab'); await type(77); await p.keyboard.press('Tab'); await type(66); await p.keyboard.press('Tab'); await type(41); await p.keyboard.press('Tab'); if (role === 'HC') { await type('12.5'); await p.keyboard.press('Tab'); } await p.waitForTimeout(150);
      const read = () => p.evaluate(role => { const co = state.co, c = state.staff[role]; return { name: co.name, card: c.name, me: !!c.me, sk: [co.sk.off, co.sk.def, co.sk.rec, co.sk.dev, co.sk.gm].join(), ovr: coachRoleOvr(co.role, co.sk), cardOvr: c.ovr, sal: co.contract.sal, cardSal: c.salary, left: co.contract.left, rep: co.rep, sec: co.sec, age: co.age, pool: co.contract.pool }; }, role);
      const want = role === 'HC' ? { name: 'Sam Rivers', sk: '81,82,83,84,85', sal: 4.5, left: 6, rep: 77, sec: 66, age: 41, pool: 12.5 } : { name: 'Sam Rivers', ovr: 86, sal: 4.5, left: 6, rep: 77, sec: 66, age: 41 };
      const cmp = (tag, got) => { Object.entries(want).forEach(([k, x]) => { if (got[k] !== x) out.fail.push(`${role} coach ${tag}: ${k} is ${got[k]}, not ${x}`); }); if (!got.me || got.card !== 'Sam Rivers' || got.cardSal !== 4.5 || (role !== 'HC' && got.cardOvr !== 86)) out.fail.push(`${role} coach ${tag}: the staff card does not match the coach: ${JSON.stringify(got)}`); };
      cmp('right after typing', await read()); await p.evaluate(() => syncMe()); cmp('after the staff list is refreshed', await read());
      await p.evaluate(async () => { save(); await flushSave(); state = null; await loadSlot(1); appMode = 'ad'; }); cmp('after saving and loading', await read());
      await p.evaluate(() => { advance(); }); const g = await read(); need(g.name === 'Sam Rivers' && g.sal === 4.5 && g.rep >= 70 && g.card === 'Sam Rivers', role + ' coach after a week of play: ' + JSON.stringify(g));
      await p.evaluate(() => { ui.tab = 'staff'; render(); }); need(/Sam Rivers/.test(await p.evaluate(() => document.getElementById('view').textContent)), role + ': the Staff page does not show the new name');
    }
    // Player Career admin: two fields in a row
    await p.evaluate(async () => { await actions.gohome(); await new Promise(r => setTimeout(r, 200)); await enterCareer('new'); newCareer({ pos: 'QB', first: 'Ad', last: 'Min', num: 1, home: 'TX', path: 'college', stars: 3, seed: 5, diff: 'normal' }); cslot = 1; cui.tab = 'admin'; render(); }); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const ks = await p.evaluate(() => [...document.querySelectorAll('#view [data-cadm^="a:"]')].slice(0, 2).map(e => e.dataset.cadm)); if (ks.length === 2) { await p.click(`[data-cadm="${ks[0]}"]`); await type(77); await p.keyboard.press('Tab'); await type(78); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
      v = await p.evaluate(ks => [cs.p.a[ks[0].slice(2)], cs.p.a[ks[1].slice(2)], cui.tab], ks); need(v.join() === '77,78,admin', 'tabbing through two Player Career fields saved ' + v.join()); } else out.fail.push('the Player Career admin has no attribute fields');
  } catch (e) { out.fail.push('the test could not finish: ' + String(e.message).split('\n')[0]); }
  errs.slice(0, 3).forEach(e => out.fail.push('page error: ' + e)); await b.close(); console.log(JSON.stringify(out));
})();
