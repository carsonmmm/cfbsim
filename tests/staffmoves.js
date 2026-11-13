// Promotions, interims and the assistant head coach (v10.02). Run with: node tests/run.js tests/staffmoves.js
const fail = []; const need = (ok, msg) => { if (!ok) fail.push(msg); };
  await enterAD(); newGame('normal', null, 7, 'IOWA'); appMode = 'ad';
  // assistant head coach: optional, one at a time, with a raise that comes off again
  need(spAhc() === null, 'nobody should start as assistant head coach');
  const dcPay = state.staff.DC.salary; need(spSetAhc('DC') === 'ok' && spAhc() === 'DC' && state.staff.DC.salary > dcPay, 'naming the DC assistant head coach');
  need(spSetAhc('OC') === 'ok' && spAhc() === 'OC' && Math.abs(state.staff.DC.salary - dcPay) < 0.11 && !state.staff.DC.ahc, 'moving the title to the OC should take it, and the raise, from the DC');
  need(spSetAhc('HC') === 'no', 'the head coach cannot be the assistant head coach');
  // an interim at a position job and at a coordinator job
  need(spInterim('QB', 'GA') === 'no', 'no interim in a job that is filled');
  const ocName = state.staff.OC.name, qbName = state.staff.QB.name;
  fireCoach('QB'); need(spInterim('QB', 'GA') === 'ok' && state.staff.QB.interim, 'a graduate assistant as interim QB coach');
  need(spSendBack('QB') === 'ok' && !state.staff.QB, 'ending an interim');
  fireCoach('DC'); need(spInterim('DC', 'QB') === 'no', 'an offensive coach cannot stand in on defense');
  const lbName = state.staff.LB.name; need(spInterim('DC', 'LB') === 'ok' && state.staff.DC.interim && state.staff.DC.name === lbName && state.staff.LB && state.staff.LB.name === lbName, 'the LB coach as interim DC keeps his own job');
  need(spKeep('DC') === 'ok' && !state.staff.DC.interim && state.staff.DC.salary > 0 && state.staff.DC.years > 0 && !state.staff.LB, 'giving the interim DC the job opens the LB job');
  // straight promotion
  need(spPromote('LB', 'OC') === 'no', 'a coordinator cannot be promoted down');
  fireCoach('ST'); const wrName = state.staff.WR.name; need(spPromote('ST', 'WR') === 'ok' && state.staff.ST.name === wrName && !state.staff.WR && !state.staff.ST.interim, 'promoting the WR coach to special teams');
  // fire the head coach in season: the assistant head coach steps in, and you can pick another
  fireCoach('HC'); let hc = state.staff.HC; need(hc && hc.interim && hc.name === ocName && state.staff.OC.name === ocName, 'the assistant head coach should be the interim head coach: ' + (hc && hc.name));
  need(spPromote('HC', 'OC') === 'wait' && spKeep('HC') === 'wait', 'a head coach is not named for good during the season');
  need(spInterim('HC', 'DC') === 'ok' && state.staff.HC.name === lbName, 'choosing a different coordinator as interim');
  need(spInterim('HC', 'OC') === 'ok', 'and switching back');
  const html = vStaff(); need(html.includes('Promotions and interims') && html.includes('data-act="spinterim"') && html.includes('Assistant head coach'), 'the Staff page should show the promotions card');
  // through the season: he is still there in the offseason, and the hiring step waits for a decision
  let g = 0; while (state.phase !== 'offseason' && g++ < 60) advance();
  need(state.phase === 'offseason', 'the season should end'); g = 0; while (state.off.step < 2 && g++ < 6) { if (!state.off.boardRes && typeof autoBoard === 'function') autoBoard(); offStepNext(); }
  hc = state.staff.HC; need(hc && hc.interim && hc.name === ocName, 'the interim head coach should still be there in the offseason: ' + JSON.stringify(hc && [hc.name, hc.interim]));
  (state.off.poach || []).forEach((x, i) => resolvePoach(i, true));
  need(spHcUnsettled() && offStepNext() === false && state.off.step === 2, 'the offseason should wait while the head coach is an interim');
  if (state.staff.OC && state.staff.OC.name === ocName) { need(spKeep('HC') === 'ok', 'giving the interim head coach the job'); hc = state.staff.HC; need(!hc.interim && hc.years === 4 && hc.salary >= 2 && !state.staff.OC && hc.title === 'Head Coach' && !hc.ahc, 'the new head coach has a contract and his old job is open: ' + JSON.stringify([hc.interim, hc.years, hc.salary, !!state.staff.OC])); }
  else need(spKeep('HC') === 'ok' && !state.staff.HC.interim, 'giving the interim the job after his old job changed hands');
  need(!spHcUnsettled() && offStepNext() !== false && state.off.step === 3, 'the offseason moves on once the head coach is settled');
  // the save round-trips
  setActiveSlot(1); save(); await flushSave(); const nm = state.staff.HC.name; state = null; const r = await loadSlot(1); need(r.ok && state.staff.HC.name === nm && !state.staff.HC.interim, 'the promoted head coach survives a save and load');

  // Coach mode: a head coach moves assistants up, never into his own job
  switchNS('coach'); newCoachCareer({ name: 'Test Coach', start: 'any', tid: 'IOWA', role: 'HC', diff: 'normal', gameDay: 'plan', lvl: 'col', seed: 5 }); appMode = 'ad';
  need(spCan('OC') && !spCan('HC'), 'a head coach runs every job but his own');
  need(spInterim('HC', 'OC') === 'no' && spPromote('HC', 'OC') === 'no', 'nobody can be promoted into your job');
  state.co.contract.pool = r1(assistantSpend() + 5); fireCoach('OC'); need(!state.staff.OC, 'the head coach fires his OC');
  const qb2 = state.staff.QB.name; need(spPromote('OC', 'QB') === 'ok' && state.staff.OC.name === qb2 && !state.staff.QB, 'the head coach promotes his QB coach');
  state.co.contract.pool = r1(assistantSpend()); need(spSetAhc('DC') === 'pool', 'the raise has to fit in the assistant pool');
  state.co.contract.pool = r1(assistantSpend() + 2); need(spSetAhc('DC') === 'ok' && state.staff.HC.me && !vStaff().includes('data-role="HC" data-from'), 'assistant head coach in Coach mode, and no head coach row on the card');
  // an assistant coach has no say
  newCoachCareer({ name: 'Test Coach', start: 'any', tid: 'IOWA', role: 'OC', diff: 'normal', gameDay: 'plan', lvl: 'col', seed: 5 }); need(!STAFF_ROLES.some(spCan) && !vStaff().includes('Promotions and interims'), 'a coordinator does not get the promotions card');
  return { fail };
