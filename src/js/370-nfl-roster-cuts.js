/* ===================== v9.47: the NFL is hard to make, and hard to stay in ===================== */
// Updated growth: undrafted and late-round rookies (and young backups) have to win a job at the final cut. Miss it
// and you start the season on the practice squad: no snaps, practice-squad pay, a weekly chance to be promoted if
// you keep working. Harder difficulty raises the bar. Careers on Generous growth play as before.
function nflCutDay() {
  const n = cs.nfl; if (!n || cs.balV < 2) { if (n) n.ps = false; return false; } n.ps = false;
  const young = n.yrs <= 2 && (n.draft.udfa || (n.draft.round || 0) >= 6 || n.contract.kind === 'min'); if (!young) return false;
  const d = myDepth(); const two = (START_N[cs.p.pos] || 1) * 2; if (d.rank < two) return false;
  const r = hrng(cs.seed + ':cut:' + cs.year); const ch = clamp(0.2 + (cOvr(cs.p) - (74 + cNflBar())) * 0.06, 0.05, 0.6);
  if (r() < ch) return false;
  n.ps = true; n.moves.push({ y: cs.year, txt: `Practice squad, ${nflName(n.tm)}` }); cNews(`${cName(cs.p)} misses the final cut and signs to the ${nflName(n.tm)} practice squad.`, 'bad'); return true;
}
{
  const _ss = nflSeasonStart; nflSeasonStart = function () { const r = _ss.apply(this, arguments); try { if (nflCutDay() && cs.ss) { /* the depth chart note at kickoff already went out; the cut news follows it */ } } catch (e) { } return r; };
  const _pw = nflPayWeek; nflPayWeek = function () {
    const n = cs.nfl; if (!(n && n.ps)) return _pw.apply(this, arguments);
    const pay = 13000; cs.p.bank += Math.round(pay * (1 - agentFee())); cs.p.earned += pay; n.earn = (n.earn || 0) + pay; if (cs.week === 18) cs.nilLog.unshift({ y: cs.year, txt: `Practice squad pay, ${nflName(n.tm)} (${cs.year} season)`, amt: pay * 18 });
    // keep working and you may get the call
    const r = hrng(cs.seed + ':psup:' + cs.year + ':' + cs.week); if (r() < clamp(0.04 + (cOvr(cs.p) - (72 + cNflBar())) * 0.01, 0.02, 0.12)) { n.ps = false; n.moves.push({ y: cs.year, txt: `Promoted to the active roster, ${nflName(n.tm)}` }); cNews(`${cName(cs.p)} is promoted from the practice squad to the ${nflName(n.tm)} active roster.`, 'win'); }
  };
}

