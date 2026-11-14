/* ===================== PLAYER CAREER: games and snap decisions ===================== */
// A game is played drive by drive. On some of the drives where the player's unit is on the
// field, the game stops for a snap decision. The rest of his stat line comes from the drives
// themselves, sized by his share of the snaps. Simulated games use the same engine and let the
// game pick sensible choices, so played and simulated stat lines look alike.

const STAT_LBL = { cmp: 'Cmp', att: 'Att', pyd: 'Pass yds', ptd: 'Pass TD', int: 'INT', car: 'Car', ryd: 'Rush yds', rtd: 'Rush TD', tgt: 'Tgt', rec: 'Rec', recyd: 'Rec yds', rectd: 'Rec TD', fum: 'Fum', pan: 'Pancakes', tkl: 'Tkl', tfl: 'TFL', sack: 'Sacks', dint: 'INT', pbu: 'PBU', ff: 'FF', hur: 'Hurries', dtd: 'Def TD', sk: 'Sacked', snp: 'Snaps', sa: 'Sacks allowed', fga: 'FGA', fgm: 'FGM', fg50: '50+ FG', xpa: 'XPA', xpm: 'XPM', punt: 'Punts', puyd: 'Punt yds', in20: 'Inside 20' };
const STAT_COLS = { QB: ['cmp', 'att', 'pyd', 'ptd', 'int', 'car', 'ryd', 'rtd'], RB: ['car', 'ryd', 'rtd', 'rec', 'recyd', 'rectd', 'fum'], WR: ['tgt', 'rec', 'recyd', 'rectd'], TE: ['tgt', 'rec', 'recyd', 'rectd', 'pan'], CB: ['tkl', 'dint', 'pbu', 'tfl', 'dtd'], S: ['tkl', 'dint', 'pbu', 'tfl', 'ff'], DE: ['tkl', 'tfl', 'sack', 'ff', 'hur'], LB: ['tkl', 'tfl', 'sack', 'dint', 'pbu'], OL: ['snp', 'pan', 'sa'], DT: ['tkl', 'tfl', 'sack', 'hur', 'ff'], K: ['fgm', 'fga', 'fg50', 'xpm', 'xpa'], P: ['punt', 'puyd', 'in20'] };
// "Impact points" turn a stat line into one number per position, used for grades and awards.
function impactPts(st, pos) {
  const g = k => st[k] || 0;
  switch (pos) {
    case 'QB': return g('pyd') / 25 + g('ptd') * 4 - g('int') * 4 + g('ryd') / 10 + g('rtd') * 6 - g('fum') * 3 + (g('att') >= 8 ? (g('cmp') / g('att') - 0.6) * 12 : 0);
    case 'RB': return g('ryd') / 10 + g('rtd') * 6 + g('recyd') / 10 + g('rec') * 0.5 + g('rectd') * 6 - g('fum') * 4;
    case 'WR': return g('recyd') / 10 + g('rectd') * 6 + g('rec') * 0.5;
    case 'TE': return g('recyd') / 10 + g('rectd') * 6 + g('rec') * 0.5 + g('pan') * 0.8;
    case 'CB': return g('tkl') + g('pbu') * 3 + g('dint') * 8 + g('tfl') * 2 + g('dtd') * 6 + g('ff') * 5;
    case 'S': return g('tkl') + g('pbu') * 3 + g('dint') * 8 + g('tfl') * 2 + g('ff') * 5 + g('dtd') * 6;
    case 'DE': return g('tkl') + g('tfl') * 2 + g('sack') * 5 + g('ff') * 5 + g('hur') + g('dtd') * 6;
    case 'LB': return g('tkl') + g('tfl') * 2 + g('sack') * 4 + g('dint') * 8 + g('pbu') * 2 + g('ff') * 5 + g('dtd') * 6;
    case 'OL': return g('snp') * 0.12 + g('pan') * 1.5 - g('sa') * 4;
    case 'DT': return g('tkl') * 1.2 + g('tfl') * 2 + g('sack') * 5 + g('ff') * 5 + g('hur') + g('dtd') * 6;
    case 'K': return g('fgm') * 3 + g('fg50') * 2 + g('xpm') - (g('fga') - g('fgm')) * 3 - (g('xpa') - g('xpm')) * 2;
    case 'P': return g('puyd') / 12 + g('in20') * 2.5;
  }
  return 0;
}
// what an average full-time starter produces in one game (the "B" grade line)
const EXP_IMP = { QB: 17.5, RB: 19.5, WR: 14.3, TE: 11.8, CB: 9.3, S: 12.5, DE: 11.6, LB: 13.2, OL: 11.5, DT: 11.5, K: 8.5, P: 19 }; // WR, TE, CB, DE, LB re-set after the v7 stat calibration
// share of team targets / carries by depth rank
const TGT_SHARE = { WR: [0.23, 0.19, 0.14, 0.07, 0.03], TE: [0.14, 0.06, 0.02], RB: [0.07, 0.04, 0.01] };
const RUN_SHARE = [0.55, 0.3, 0.08];
const TKL_SHARE = { LB: [0.14, 0.115, 0.09, 0.05], S: [0.1, 0.09, 0.04], CB: [0.062, 0.058, 0.045], DE: [0.065, 0.06, 0.045, 0.035], DT: [0.05, 0.045, 0.035, 0.03] };
const SACK_SHARE = { DE: [0.28, 0.22, 0.12, 0.08], LB: [0.1, 0.07, 0.05], S: [0.03, 0.03], CB: [0.02, 0.02, 0.02], DT: [0.1, 0.08, 0.05, 0.03] };
const INT_SHARE = { CB: [0.28, 0.25, 0.12], S: [0.17, 0.15, 0.05], LB: [0.07, 0.05, 0.04], DE: [0.01, 0.01], DT: [0.005, 0.005] };
const GRADES = [[1.55, 'A+', 6], [1.25, 'A', 5], [1.0, 'B', 4], [0.75, 'C', 3], [0.5, 'D', 1], [-99, 'F', 0]];
function gradeOf(ratio) { return GRADES.find(g => ratio >= g[0]); }

/* ---------- snap decisions ---------- */
// Each option: the ratings it leans on, a base success chance, and what happens on success,
// a partial result (mid), failure, and a costly mistake (risk). `team` plays credit teammates.
const Y = (a, b) => () => ri(a, b);
const GOAL = d => d.yl;
const OPT = {
  QB: {
    give: { label: 'Hand it off', hint: 'Safe. Your running back gets the carry.', team: true, a: [], base: 0.55, ok: { yds: Y(4, 11), txt: '{rb} hits the hole for {y} yards.' }, no: { yds: Y(-1, 2), txt: '{rb} is stuffed after {y}.' }, risk: { p: 0.012, to: true, txt: '{rb} fumbles and the defense recovers.' } },
    throw: { label: 'Pull it and throw the slant', hint: 'Quick throw behind the linebacker.', a: ['acc', 'dec'], base: 0.6, ok: { yds: Y(7, 16), st: { att: 1, cmp: 1, pyd: 'y' }, txt: 'You pull it and hit {wr} on the slant for {y}.' }, no: { st: { att: 1 }, txt: 'The linebacker gets a hand on it. Incomplete.' }, risk: { p: 0.05, to: true, st: { att: 1, int: 1 }, txt: 'The linebacker drops right into the throwing lane. Intercepted.' } },
    keep: { label: 'Keep it and run', hint: 'Your legs against the edge.', a: ['mob'], base: 0.52, ok: { yds: Y(6, 18), st: { car: 1, ryd: 'y' }, txt: 'You keep it and race around the edge for {y}.' }, no: { yds: Y(-2, 2), st: { car: 1, ryd: 'y' }, txt: 'The end stays home and wraps you up for {y}.' }, risk: { p: 0.025, to: true, st: { car: 1, fum: 1 }, txt: 'You take a big hit as you cut and the ball comes loose. Fumble.' } },
    deep: { label: 'Take the shot downfield', hint: 'Big play chance. Risk of an interception.', a: ['arm', 'acc'], base: 0.32, ok: { yds: Y(20, 42), st: { att: 1, cmp: 1, pyd: 'y' }, txt: 'You let it fly and {wr} runs under it for {y}.' }, no: { st: { att: 1 }, txt: 'Just overthrown. Incomplete.' }, risk: { p: 0.09, to: true, st: { att: 1, int: 1 }, txt: 'The safety reads it the whole way. Intercepted.' } },
    check: { label: 'Check it down underneath', hint: 'Take the easy yards.', a: ['dec', 'acc'], base: 0.72, ok: { yds: Y(4, 9), st: { att: 1, cmp: 1, pyd: 'y' }, txt: 'You dump it off to {rb} for {y}.' }, no: { st: { att: 1 }, txt: 'The underneath defender breaks it up.' }, risk: { p: 0.015, to: true, st: { att: 1, int: 1 }, txt: 'Tipped at the line and intercepted.' } },
    hot: { label: 'Get it out fast to the hot route', hint: 'Beat the blitz before it gets home.', a: ['dec', 'pres'], base: 0.62, ok: { yds: Y(6, 22), st: { att: 1, cmp: 1, pyd: 'y' }, txt: 'You see the blitz and hit {te} on the hot route. {y} yards.' }, no: { yds: Y(-8, -5), st: { sk: 1 }, txt: 'The blitz gets home. Sacked for a loss of {n}.' }, risk: { p: 0.04, to: true, st: { att: 1, int: 1 }, txt: 'You rush it right to a zone defender. Intercepted.' } },
    scramble: { label: 'Tuck it and run', hint: 'Take what your legs can get.', a: ['mob', 'pres'], base: 0.5, ok: { yds: Y(6, 20), st: { car: 1, ryd: 'y' }, txt: 'You escape the pocket and pick up {y}.' }, no: { yds: Y(-6, 1), st: { car: 1, ryd: 'y' }, txt: 'Nowhere to go. You go down for {y}.' }, risk: { p: 0.03, to: true, st: { car: 1, fum: 1 }, txt: 'Stripped from behind. Fumble.' } },
    fade: { label: 'Throw the fade', hint: 'One-on-one to the back corner.', a: ['acc', 'arm'], base: 0.42, ok: { yds: GOAL, st: { att: 1, cmp: 1, pyd: 'y' }, txt: 'Perfect touch. {wr} tiptoes in the back corner.' }, no: { st: { att: 1 }, txt: 'Out the back of the end zone. Incomplete.' }, risk: { p: 0.05, to: true, st: { att: 1, int: 1 }, txt: 'Underthrown and picked off in the end zone.' } },
    rzslant: { label: 'Quick slant', hint: 'Fast and on target.', a: ['acc', 'dec'], base: 0.52, ok: { yds: GOAL, st: { att: 1, cmp: 1, pyd: 'y' }, txt: 'You fire the slant to {wr} and he falls into the end zone.' }, no: { st: { att: 1 }, txt: 'Knocked away at the goal line.' }, risk: { p: 0.035, to: true, st: { att: 1, int: 1 }, txt: 'The linebacker jumps the slant. Intercepted.' } },
    rzgive: { label: 'Hand it off inside', hint: 'Pound it in.', team: true, a: [], base: 0.45, ok: { yds: GOAL, txt: '{rb} powers into the end zone.' }, no: { yds: Y(0, 2), txt: '{rb} is stopped short.' }, risk: { p: 0.01, to: true, txt: '{rb} fumbles at the goal line.' } },
  },
  RB: {
    inside: { label: 'Hit the A-gap', hint: 'North and south. Dependable.', a: ['vis', 'pow'], base: 0.6, ok: { yds: Y(3, 8), st: { car: 1, ryd: 'y' }, txt: 'You hit the hole hard for {y}.', next: { id: 'contact', p: 0.45 } }, no: { yds: Y(-2, 1), st: { car: 1, ryd: 'y' }, txt: 'Nothing there. You get {y}.' }, risk: { p: 0.012, to: true, st: { car: 1, fum: 1 }, txt: 'The ball is punched out in the pile. Fumble.' } },
    bounce: { label: 'Bounce it outside', hint: 'Boom or bust.', a: ['spd', 'elu'], base: 0.45, ok: { yds: Y(6, 14), st: { car: 1, ryd: 'y' }, txt: 'You bounce it outside and turn the corner for {y}.', next: { id: 'contact', p: 0.55 } }, no: { yds: Y(-4, 0), st: { car: 1, ryd: 'y' }, txt: 'The edge defender runs you down for {y}.' }, risk: { p: 0.015, to: true, st: { car: 1, fum: 1 }, txt: 'You try to switch hands and the ball squirts free. Fumble.' } },
    cutback: { label: 'Cut back against the flow', hint: 'Make them miss where they aren\'t.', a: ['vis', 'elu'], base: 0.48, ok: { yds: Y(5, 12), st: { car: 1, ryd: 'y' }, txt: 'You plant, cut back and find daylight for {y}.', next: { id: 'contact', p: 0.55 } }, no: { yds: Y(-2, 1), st: { car: 1, ryd: 'y' }, txt: 'The backside end was waiting. {y} yards.' }, risk: { p: 0.012, to: true, st: { car: 1, fum: 1 }, txt: 'Fumble on the cutback.' } },
    juke: { label: 'Juke him', hint: 'Make him miss. Could go the distance.', a: ['elu', 'spd'], base: 0.45, ok: { yds: Y(8, 38), st: { ryd: 'y' }, txt: 'You leave him grasping at air. {y} more yards.' }, no: { yds: Y(0, 1), st: { ryd: 'y' }, txt: 'He doesn\'t bite and drops you.' }, risk: { p: 0.02, to: true, st: { fum: 1 }, txt: 'He gets a hand on the ball as you cut. Fumble.' } },
    truck: { label: 'Lower your shoulder', hint: 'Run through him. The coaches love it.', a: ['pow'], base: 0.5, trust: 1, ok: { yds: Y(3, 9), st: { ryd: 'y' }, txt: 'You run right through him and drag him {y} more yards.' }, no: { yds: Y(0, 1), st: { ryd: 'y' }, txt: 'He stands you up.' }, risk: { p: 0.03, to: true, st: { fum: 1 }, txt: 'A second defender rips at the ball. Fumble.' } },
    protect: { label: 'Cover the ball and fall forward', hint: 'No risk. A couple of yards.', a: ['bsec'], base: 0.92, ok: { yds: Y(1, 3), st: { ryd: 'y' }, txt: 'You cover up and fall forward for {y}.' }, no: { yds: Y(0, 0), txt: 'Brought down right there.' } },
    block: { label: 'Pick up the blitz', hint: 'Protect the quarterback.', team: true, a: ['pow'], base: 0.55, trust: 1, ok: { yds: Y(9, 26), txt: 'You stone the blitzer and {qb} hits {wr} for {y}.' }, no: { yds: Y(-8, -5), txt: 'The blitzer runs through you. {qb} is sacked.' }, risk: { p: 0.03, to: true, txt: 'The blitzer blows past you and strips {qb}. Fumble.' } },
    release: { label: 'Leak out for a check-down', hint: 'Get open in the flat.', a: ['hnd'], base: 0.58, ok: { yds: Y(4, 16), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You slip into the flat and turn it up for {y}.' }, no: { st: { tgt: 1 }, txt: 'The throw is behind you. Incomplete.' }, risk: { p: 0.02, to: true, st: { tgt: 1 }, txt: 'It bounces off your hands and into a defender\'s. Intercepted.' } },
    dive: { label: 'Dive over the top', hint: 'Fly over the pile.', a: ['pow'], base: 0.5, ok: { yds: GOAL, st: { car: 1, ryd: 'y' }, txt: 'You launch over the pile. Touchdown!' }, no: { yds: Y(0, 0), st: { car: 1 }, txt: 'Stopped at the goal line.' }, risk: { p: 0.02, to: true, st: { car: 1, fum: 1 }, txt: 'The ball comes out as you dive. Fumble.' } },
    stretch: { label: 'Stretch it outside', hint: 'Race to the pylon.', a: ['spd'], base: 0.44, ok: { yds: GOAL, st: { car: 1, ryd: 'y' }, txt: 'You beat everyone to the pylon. Touchdown!' }, no: { yds: Y(-3, 0), st: { car: 1, ryd: 'y' }, txt: 'Forced out of bounds for {y}.' } },
  },
  WR: {
    go: { label: 'Run the go route', hint: 'Win with speed off the line.', a: ['spd', 'rel'], base: 0.4, ok: { yds: Y(22, 45), txt: 'You blow past him off the line. The ball is in the air...', next: { id: 'catch', p: 1 } }, no: { txt: 'The corner runs stride for stride with you. {qb} looks elsewhere.' }, risk: { p: 0.04, to: true, st: { tgt: 1 }, txt: 'The safety comes over the top and picks it off.' } },
    slant: { label: 'Break inside on a slant', hint: 'Quick separation, catch in traffic.', a: ['rte', 'rel'], base: 0.55, ok: { yds: Y(7, 14), txt: 'You win inside leverage. Here comes the throw...', next: { id: 'catch', p: 1 } }, no: { txt: 'He jams you and the timing is gone.' }, risk: { p: 0.035, to: true, st: { tgt: 1 }, txt: 'The linebacker undercuts the slant. Intercepted.' } },
    comeback: { label: 'Sit down on a comeback', hint: 'Use his cushion against him.', a: ['rte', 'hnd'], base: 0.55, ok: { yds: Y(11, 18), txt: 'You sell the deep route and snap it back. The ball is coming...', next: { id: 'catch', p: 1 } }, no: { txt: 'He doesn\'t buy the fake. {qb} throws it away.' }, risk: { p: 0.035, to: true, st: { tgt: 1 }, txt: 'He was sitting on it. Intercepted.' } },
    highpoint: { label: 'Go up and high-point it', hint: 'Win the 50-50 ball.', a: ['ctc', 'hnd'], base: 0.58, ok: { yds: d => d.base, st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You climb the ladder and snag it at its highest point. {y} yards.' }, no: { st: { tgt: 1 }, txt: 'He gets a hand in and knocks it away.' }, risk: { p: 0.04, to: true, st: { tgt: 1 }, txt: 'It pops off your hands and he comes down with it. Intercepted.' } },
    secure: { label: 'Secure the catch', hint: 'Sure hands. No extra yards.', a: ['hnd'], base: 0.5, ok: { yds: d => Math.max(1, Math.round(d.base * 0.8)), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You look it in and secure it. {y} yards.' }, no: { st: { tgt: 1 }, txt: 'Dropped. You had it.' } },
    race: { label: 'Catch it on the run and turn upfield', hint: 'Yards after the catch, if you hang on.', a: ['spd', 'hnd'], base: 0.43, ok: { yds: d => d.base + ri(6, 28), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You catch it in stride and turn upfield. {y} yards.' }, no: { st: { tgt: 1 }, txt: 'You take your eyes off it to run. Dropped.' } },
    follow: { label: 'Follow your blocker', hint: 'Patient. Let it develop.', a: ['rte'], base: 0.62, ok: { yds: Y(5, 13), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You ride your blocker for {y}.' }, no: { yds: Y(-2, 1), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'The screen gets sniffed out. {y} yards.' } },
    cut: { label: 'Cut it back across the field', hint: 'Risky, but could break big.', a: ['spd', 'rte'], base: 0.42, ok: { yds: Y(10, 40), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You cut across the grain and there\'s open field. {y} yards.' }, no: { yds: Y(-4, 0), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'Swarmed from behind for {y}.' } },
    sideline: { label: 'Get to the sideline', hint: 'Take the sure yards and stop the clock.', a: ['spd'], base: 0.7, ok: { yds: Y(3, 8), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You get out of bounds after {y}.' }, no: { yds: Y(0, 1), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'Knocked out of bounds after {y}.' } },
    rzfade: { label: 'Fade to the back corner', hint: 'Go up and get it.', a: ['ctc', 'spd'], base: 0.44, ok: { yds: GOAL, st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You high-point it in the corner and get a foot down. Touchdown!' }, no: { st: { tgt: 1 }, txt: 'Out of bounds. Incomplete.' }, risk: { p: 0.03, to: true, st: { tgt: 1 }, txt: 'The corner out-leaps you. Intercepted.' } },
    rzslantwr: { label: 'Quick slant', hint: 'Win inside, catch in traffic.', a: ['rte', 'hnd'], base: 0.52, ok: { yds: GOAL, st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You take the hit and hold on. Touchdown!' }, no: { st: { tgt: 1 }, txt: 'Broken up at the goal line.' }, risk: { p: 0.03, to: true, st: { tgt: 1 }, txt: 'Tipped and intercepted.' } },
    backshoulder: { label: 'Back-shoulder stop', hint: 'Timing and hands.', a: ['hnd', 'rte'], base: 0.5, ok: { yds: GOAL, st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You turn, snatch the back-shoulder throw and fall in. Touchdown!' }, no: { st: { tgt: 1 }, txt: 'The timing is off. Incomplete.' } },
  },
  TE: {
    route: { label: 'Release into your route', hint: 'Get open over the middle.', a: ['rte', 'hnd'], base: 0.44, ok: { yds: Y(7, 22), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You slip past the linebacker and {qb} finds you for {y}.' }, no: { st: { tgt: 1 }, txt: 'Covered. The throw is broken up.' }, risk: { p: 0.03, to: true, st: { tgt: 1 }, txt: 'The linebacker undercuts it. Intercepted.' } },
    stay: { label: 'Stay in and block', hint: 'Give your quarterback time.', team: true, a: ['blk', 'pow'], base: 0.6, trust: 1, ok: { yds: Y(10, 30), st: { pan: 1 }, txt: 'You wall off the end and {qb} hits {wr} for {y}.' }, no: { yds: Y(-8, -4), txt: 'The end beats you inside. {qb} is sacked.' } },
    drive: { label: 'Drive block him off the ball', hint: 'Move him against his will.', team: true, a: ['pow', 'blk'], base: 0.55, trust: 1, ok: { yds: Y(4, 11), st: { pan: 1 }, txt: 'You put him on his back. {rb} runs behind you for {y}.' }, no: { yds: Y(-1, 2), txt: 'He sheds you and makes the stop.' } },
    reach: { label: 'Reach block to seal the edge', hint: 'Get outside him. Big run if you do.', team: true, a: ['blk', 'spd'], base: 0.48, ok: { yds: Y(6, 18), st: { pan: 1 }, txt: 'You seal the edge and {rb} turns the corner for {y}.' }, no: { yds: Y(-3, 1), txt: 'He beats your reach and strings the run out.' } },
    seam: { label: 'Run the seam', hint: 'Split the safeties.', a: ['spd', 'rte'], base: 0.45, ok: { yds: Y(16, 30), txt: 'You split the safeties. The ball is coming...', next: { id: 'catch', p: 1 } }, no: { txt: 'The safety sits on the seam. {qb} goes elsewhere.' }, risk: { p: 0.04, to: true, st: { tgt: 1 }, txt: 'The safety breaks on it. Intercepted.' } },
    flat: { label: 'Leak into the flat', hint: 'Easy yards.', a: ['hnd'], base: 0.46, ok: { yds: Y(3, 9), st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You catch it in the flat for {y}.' }, no: { st: { tgt: 1 }, txt: 'Knocked down.' } },
    rzcorner: { label: 'Corner route', hint: 'Use your size.', a: ['rte', 'hnd'], base: 0.5, ok: { yds: GOAL, st: { tgt: 1, rec: 1, recyd: 'y' }, txt: 'You box out the safety in the corner. Touchdown!' }, no: { st: { tgt: 1 }, txt: 'Just out of reach.' } },
    rzblock: { label: 'Block for the run', hint: 'Help punch it in.', team: true, a: ['blk', 'pow'], base: 0.5, ok: { yds: GOAL, st: { pan: 1 }, txt: 'You clear the way and {rb} walks in.' }, no: { yds: Y(0, 1), txt: 'Stuffed at the line.' } },
  },
  CB: {
    press: { label: 'Press him at the line', hint: 'Disrupt the timing. Risky if he wins.', a: ['prs', 'man'], base: 0.55, ok: { txt: 'You jam him and he\'s late into his route.', next: { id: 'ball', p: 0.6 }, stop: true }, no: { yds: Y(8, 16), st: { tkl: 1 }, txt: 'He slips the jam. Catch for {y} before you tackle him.' }, risk: { p: 0.1, big: true, yds: Y(20, 50), txt: 'He beats the press clean and runs away from you. {y} yards.' } },
    off: { label: 'Play off and read the quarterback', hint: 'Keep everything in front.', a: ['zon', 'bsk'], base: 0.62, ok: { txt: 'You mirror him from depth, eyes on the quarterback.', next: { id: 'ball', p: 0.55 }, stop: true }, no: { yds: Y(8, 14), st: { tkl: 1 }, txt: 'He sits down in front of you. {y}-yard catch.' }, risk: { p: 0.05, big: true, yds: Y(18, 35), txt: 'Double move. He\'s behind you for {y}.' } },
    jump: { label: 'Jump the route', hint: 'Go for the interception.', a: ['bsk', 'spd'], base: 0.36, ok: { take: 'int', tp: 0.55, st: { dint: 1 }, txt: 'You break on it before the ball is out. Interception!', alt: { st: { pbu: 1 }, txt: 'You break on it and get a hand on the ball. Incomplete.' } }, mid: { w: 0.35, st: { pbu: 1 }, txt: 'You get there a split second early and knock it away.' }, no: { yds: Y(15, 40), txt: 'You guessed wrong. He\'s wide open for {y}.' , big: true } },
    hands: { label: 'Play his hands', hint: 'Break it up at the catch point.', a: ['man', 'bsk'], base: 0.55, ok: { st: { pbu: 1 }, txt: 'You rake through his hands. Incomplete.', tp: 0.55, alt: { yds: Y(4, 8), st: { tkl: 1 }, txt: 'He makes the catch but you drop him right there. {y} yards.' } }, no: { yds: Y(8, 15), st: { tkl: 1 }, txt: 'He holds on through contact. {y} yards.' } },
    rally: { label: 'Rally and make the tackle', hint: 'Give up the catch, not the big play.', a: ['spd', 'man'], base: 0.78, ok: { yds: Y(3, 7), st: { tkl: 1 }, txt: 'You drive on the catch and drop him after {y}.' }, no: { yds: Y(12, 30), txt: 'You miss the tackle. He picks up {y}.', big: true } },
    shed: { label: 'Shed the block and fill', hint: 'Make the play in the backfield.', a: ['prs', 'spd'], base: 0.48, ok: { yds: Y(-2, 3), st: { tkl: 1, tfl: 'neg' }, txt: 'You throw off the receiver and make the stop for {y}.' }, no: { yds: Y(5, 12), txt: 'The receiver locks you up. {y}-yard run.' }, risk: { p: 0.06, big: true, yds: Y(18, 40), txt: 'You get sealed inside and he bounces it for {y}.' } },
    force: { label: 'Keep outside leverage', hint: 'Turn the run back inside.', a: ['spd', 'zon'], base: 0.62, ok: { yds: Y(2, 5), st: { tkl: 1 }, txt: 'You force it back inside into traffic. Gain of {y}.' }, no: { yds: Y(8, 18), txt: 'He gets the corner on you. {y} yards.' } },
    blitz: { label: 'Blitz off the edge', hint: 'Sack chance. Nobody covers your man.', a: ['spd'], base: 0.36, ok: { yds: Y(-9, -5), st: { sack: 1, tkl: 1, tfl: 1 }, txt: 'Untouched off the edge. Sack!', take: 'ff?', tp: 0.45, alt: { st: { hur: 1 }, txt: 'You get home a split second late. He throws it away under pressure.' } }, mid: { w: 0.35, st: { hur: 1 }, txt: 'You get there as he throws. Incomplete.' }, no: { yds: Y(10, 28), txt: 'He sees you coming and throws to your man. {y} yards.', big: true } },
    bail: { label: 'Show blitz, then bail into coverage', hint: 'Bait the quarterback.', a: ['zon', 'bsk'], base: 0.4, ok: { take: 'int', tp: 0.5, st: { dint: 1 }, txt: 'He throws right where you were supposed to leave. Interception!', alt: { st: { pbu: 1 }, txt: 'You drop into the lane and bat it away.' } }, mid: { w: 0.5, st: { pbu: 1 }, txt: 'You drop into the lane and deflect it.' }, no: { yds: Y(6, 12), txt: 'Completion underneath for {y}.' } },
  },
  S: {
    deepmid: { label: 'Stay deep in the middle', hint: 'Nothing gets over the top.', a: ['zon', 'spd'], base: 0.62, ok: { yds: Y(2, 6), st: { tkl: 1 }, txt: 'Nothing open deep. He checks down and you tackle him after {y}.' }, no: { yds: Y(15, 35), txt: 'He threads it in front of you for {y}.', big: true } },
    rob: { label: 'Rob the underneath route', hint: 'Bait the throw and take it away.', a: ['iq', 'bsk'], base: 0.4, ok: { take: 'int', tp: 0.28, st: { dint: 1 }, txt: 'You read his eyes and jump the dig. Interception!', alt: { st: { pbu: 1 }, txt: 'You read his eyes and break up the dig.' } }, mid: { w: 0.4, st: { pbu: 1 }, txt: 'You get a hand on it. Incomplete.' }, no: { yds: Y(15, 40), txt: 'He looks you off and goes deep behind you. {y} yards.', big: true } },
    box: { label: 'Come down to stop the run', hint: 'An extra body in the box.', a: ['tkl', 'iq'], base: 0.58, ok: { yds: Y(-2, 2), st: { tkl: 1, tfl: 'neg' }, txt: 'You fly downhill and meet the back at the line. {y} yards.' }, no: { yds: Y(6, 15), txt: 'Play-action. He hits the seam you left for {y}.' }, risk: { p: 0.06, big: true, yds: Y(20, 50), txt: 'Play-action freezes you and it\'s over your head. {y} yards.' } },
    wrap: { label: 'Square up and wrap him up', hint: 'Sure tackle.', a: ['tkl'], base: 0.66, ok: { yds: Y(3, 7), st: { tkl: 1 }, txt: 'You break down and drop him after {y}.' }, no: { yds: Y(10, 30), txt: 'He jukes you in space. {y} yards.', big: true } },
    strip: { label: 'Go for the strip', hint: 'Takeaway chance. He might break free.', a: ['bsk', 'tkl'], base: 0.34, ok: { take: 'ff', tp: 0.5, st: { tkl: 1, ff: 1 }, txt: 'You punch the ball out. Fumble, and your team recovers!', alt: { yds: Y(2, 5), st: { tkl: 1 }, txt: 'You get a hand on the ball but he holds on. Tackle after {y}.' } }, mid: { w: 0.4, yds: Y(4, 8), st: { tkl: 1 }, txt: 'No strip, but you get him down after {y}.' }, no: { yds: Y(12, 35), txt: 'He runs through your strip attempt for {y}.', big: true } },
    angle: { label: 'Take a safe angle', hint: 'Push him out of bounds. No big play.', a: ['spd'], base: 0.8, ok: { yds: Y(6, 12), st: { tkl: 1 }, txt: 'You take the angle and push him out after {y}.' }, no: { yds: Y(14, 25), txt: 'He outruns your angle for {y}.' } },
  },
  DE: {
    speed: { label: 'Speed rush around the edge', hint: 'Win with burst.', a: ['bst', 'rsh'], base: 0.3, ok: { yds: Y(-9, -5), st: { sack: 1, tkl: 1, tfl: 1 }, txt: 'You dip under the tackle\'s hands. Sack!', take: 'ff?', tp: 0.35, alt: { st: { hur: 1 }, txt: 'You get home a split second late. He throws it away under pressure.' } }, mid: { w: 0.4, st: { hur: 1 }, txt: 'You flush him out of the pocket. The throw sails incomplete.' }, no: { yds: Y(5, 13), txt: 'The tackle rides you past the pocket. Completion for {y}.' }, risk: { p: 0.08, big: true, yds: Y(14, 30), txt: 'You rush too far upfield and he steps up and escapes for {y}.' } },
    bull: { label: 'Bull rush', hint: 'Walk the tackle back into his lap.', a: ['pow', 'rsh'], base: 0.3, ok: { yds: Y(-8, -4), st: { sack: 1, tkl: 1, tfl: 1 }, txt: 'You drive the tackle into the quarterback. Sack!', take: 'ff?', tp: 0.35, alt: { st: { hur: 1 }, txt: 'You get home a split second late. He throws it away under pressure.' } }, mid: { w: 0.45, st: { hur: 1 }, txt: 'You collapse the pocket and force a bad throw.' }, no: { yds: Y(5, 13), txt: 'The tackle anchors. Completion for {y}.' } },
    spin: { label: 'Spin back inside', hint: 'Counter his outside set.', a: ['rsh', 'bst'], base: 0.3, ok: { yds: Y(-9, -5), st: { sack: 1, tkl: 1, tfl: 1 }, txt: 'Spin move, and you\'re clean inside. Sack!', take: 'ff?', tp: 0.35, alt: { st: { hur: 1 }, txt: 'You get home a split second late. He throws it away under pressure.' } }, mid: { w: 0.35, st: { hur: 1 }, txt: 'Your spin gets you close. He has to throw it away.' }, no: { yds: Y(5, 13), txt: 'The guard picks up your spin. Completion for {y}.' }, risk: { p: 0.07, big: true, yds: Y(12, 25), txt: 'Your spin opens the edge and he runs through it for {y}.' } },
    contain: { label: 'Hold contain', hint: 'Keep the quarterback in the pocket.', a: ['rnd', 'tkl'], base: 0.68, ok: { yds: Y(0, 4), st: { tkl: 1 }, txt: 'He tries to escape your way and you run him down after {y}.' }, no: { yds: Y(6, 14), txt: 'He finds a crease anyway. {y} yards.' } },
    setedge: { label: 'Set the edge', hint: 'Force the run back inside.', a: ['rnd', 'pow'], base: 0.6, ok: { yds: Y(0, 3), st: { tkl: 1 }, txt: 'You set a hard edge and make the stop after {y}.' }, no: { yds: Y(5, 12), txt: 'The tight end washes you inside. {y} yards.' } },
    shoot: { label: 'Shoot the gap', hint: 'Tackle for loss, or a big run.', a: ['bst'], base: 0.45, ok: { yds: Y(-5, -1), st: { tkl: 1, tfl: 1 }, txt: 'You knife through the gap and drop him for {y}.' }, no: { yds: Y(4, 9), txt: 'You get washed past the play. {y} yards.' }, risk: { p: 0.12, big: true, yds: Y(15, 40), txt: 'You shoot upfield and he cuts right behind you for {y}.' } },
    squeeze: { label: 'Squeeze down inside', hint: 'Close the gap and pile up the run.', a: ['tkl', 'pow'], base: 0.56, ok: { yds: Y(1, 4), st: { tkl: 1 }, txt: 'You squeeze the hole and make the tackle after {y}.' }, no: { yds: Y(6, 14), txt: 'He bounces outside where you were. {y} yards.' } },
  },
  LB: {
    lbblitz: { label: 'Blitz the A-gap', hint: 'Sack chance. Leaves a hole behind you.', a: ['blz', 'spd'], base: 0.36, ok: { yds: Y(-8, -4), st: { sack: 1, tkl: 1, tfl: 1 }, txt: 'You shoot the A-gap untouched. Sack!', take: 'ff?', tp: 0.32, alt: { st: { hur: 1 }, txt: 'You get home a split second late. He throws it away under pressure.' } }, mid: { w: 0.35, st: { hur: 1 }, txt: 'You get in his face and force a throwaway.' }, no: { yds: Y(8, 20), txt: 'They pick up the blitz and throw into the hole you left. {y} yards.', big: true } },
    drop: { label: 'Drop into the hook zone', hint: 'Take away the middle of the field.', a: ['cov', 'iq'], base: 0.55, ok: { st: { pbu: 1 }, txt: 'You sink under the tight end and deflect the throw.', take: 'int?', tp: 0.12, alt: { yds: Y(2, 6), st: { tkl: 1 }, txt: 'You take away the middle. He checks it down and you make the tackle after {y}.' } }, no: { yds: Y(8, 18), st: { tkl: 1 }, txt: 'They find the soft spot behind you. {y} yards.' } },
    fill: { label: 'Fill the run gap', hint: 'Meet the back in the hole.', a: ['tkl', 'iq'], base: 0.58, ok: { yds: Y(-1, 5), st: { tkl: 1, tfl: 'neg' }, txt: 'You fill downhill and make the stop for {y}.' }, no: { yds: Y(6, 14), txt: 'The guard climbs to you and seals you off. {y} yards.' }, risk: { p: 0.05, big: true, yds: Y(15, 35), txt: 'Play-action. You bite and it\'s thrown right over you for {y}.' } },
    blowup: { label: 'Blow up the screen', hint: 'Beat the linemen to the ball.', a: ['spd', 'iq'], base: 0.45, ok: { yds: Y(-4, 1), st: { tkl: 1, tfl: 'neg' }, txt: 'You read screen instantly and drop him for {y}.' }, no: { yds: Y(8, 25), txt: 'Three linemen are out in front. {y} yards.', big: true } },
    shedlb: { label: 'Shed the blocker', hint: 'Take on the lineman and make the tackle.', a: ['tkl', 'pow'], base: 0.55, ok: { yds: Y(2, 6), st: { tkl: 1 }, txt: 'You shed the guard and make the tackle after {y}.' }, no: { yds: Y(10, 22), txt: 'The guard drives you out of the play. {y} yards.' } },
    carry: { label: 'Carry him up the seam', hint: 'Run with him stride for stride.', a: ['cov', 'spd'], base: 0.5, ok: { st: { pbu: 1 }, txt: 'You carry him up the seam and break up the pass.', tp: 0.2, alt: { txt: 'You carry him up the seam. The quarterback looks elsewhere.' } }, no: { yds: Y(12, 25), st: { tkl: 1 }, txt: 'He gets a step on you. {y} yards.' } },
    undercut: { label: 'Undercut the throw', hint: 'Interception chance. Big play if you miss.', a: ['iq', 'cov'], base: 0.34, ok: { take: 'int', tp: 0.24, st: { dint: 1 }, txt: 'You read it and step in front. Interception!', alt: { txt: 'You read it, but the throw zips just past your fingertips. Incomplete.' } }, no: { yds: Y(15, 35), txt: 'You undercut and miss. {y} yards.', big: true } },
  },
};
// Scenarios: situation, a pre-snap look (which may give away the best answer), and options.
const SCN = {
  QB: [
    { id: 'rpo', title: 'Run-pass option', w: 3, zone: 'open', looks: [['give', 'The linebackers drop at the snap. Only six in the box.'], ['throw', 'The linebacker crashes hard on the run fake. The slant window behind him is open.'], ['keep', 'The defensive end squeezes down on the running back. Nobody is home on the edge.', p => p.a.mob >= 60]], opts: p => ['give', 'throw'].concat(p.a.mob >= 60 || p.style === 'dual' ? ['keep'] : []) },
    { id: 'drop', title: 'Dropback pass', w: 4, zone: 'open', looks: [['deep', 'Single-high safety, cheating toward the boundary. Your receiver has a step on the corner.'], ['check', 'Two deep safeties and the corners bailing. Everything underneath is open.'], ['hot', 'Both linebackers walk up to the line. Blitz is coming.']], opts: p => ['deep', 'check', 'hot'].concat(p.a.mob >= 66 || p.style === 'dual' ? ['scramble'] : []) },
    { id: 'rz', title: 'Red zone', w: 2, zone: 'red', looks: [['fade', 'Your tallest receiver has one-on-one coverage on the outside.'], ['rzslant', 'The corners play soft, protecting the goal line.'], ['rzgive', 'Pass look from the defense. Only five in the box.']], opts: () => ['fade', 'rzslant', 'rzgive'] },
  ],
  RB: [
    { id: 'lane', title: 'Inside zone', w: 5, zone: 'open', looks: [['inside', 'The nose tackle gets washed out. The A-gap is opening.'], ['bounce', 'The edge defender crashes inside. Nothing but grass outside.'], ['cutback', 'The linebackers overpursue to the play side.']], opts: () => ['inside', 'bounce', 'cutback'] },
    { id: 'pro', title: 'Third down protection', w: 2, zone: 'open', looks: [['block', 'The linebacker\'s eyes are locked on the quarterback. He\'s coming.'], ['release', 'The linebacker bails into coverage at the snap.']], opts: () => ['block', 'release'] },
    { id: 'goal', title: 'Goal line', w: 1, zone: 'goal', looks: [['dive', 'Everyone is stacked inside, but the linebackers are standing up.'], ['stretch', 'The defense is pinching inside. The edge is thin.']], opts: () => ['dive', 'stretch'] },
  ],
  WR: [
    { id: 'route', title: 'Beat your man', w: 5, zone: 'open', looks: [['go', 'The corner is pressing and the safety is shaded to the other side.'], ['slant', 'The corner is playing off, bailing at the snap.'], ['comeback', 'The corner has a deep cushion and is backpedaling hard.']], opts: () => ['go', 'slant', 'comeback'] },
    { id: 'screen', title: 'Receiver screen', w: 1.2, zone: 'open', looks: [['follow', 'Your blocker has a clean angle on the corner.'], ['cut', 'The whole defense is flowing hard to the sideline.'], ['sideline', 'The safety is crashing down fast. Take what you can.']], opts: () => ['follow', 'cut', 'sideline'] },
    { id: 'rzwr', title: 'Red zone', w: 2, zone: 'red', looks: [['rzfade', 'You have a shorter corner on you, one-on-one.'], ['rzslantwr', 'The corner is playing outside leverage.'], ['backshoulder', 'The corner is running with you, but never turns his head.']], opts: () => ['rzfade', 'rzslantwr', 'backshoulder'] },
  ],
  TE: [
    { id: 'pa', title: 'Play-action', w: 3, zone: 'open', looks: [['route', 'The linebacker bites hard on the run fake.'], ['stay', 'The defensive end is lined up wide over you, ready to rush.']], opts: () => ['route', 'stay'] },
    { id: 'run', title: 'Run play to your side', w: 3, zone: 'open', looks: [['drive', 'The end is playing tight, head-up on you.'], ['reach', 'The end is lined up wide, trying to set the edge.']], opts: () => ['drive', 'reach'] },
    { id: 'seamq', title: 'Third and long', w: 2, zone: 'open', looks: [['seam', 'Two-deep safeties split wide. The seam is open.'], ['flat', 'The safety is sitting in the middle of the field.']], opts: () => ['seam', 'flat'] },
    { id: 'rzte', title: 'Red zone', w: 2, zone: 'red', looks: [['rzcorner', 'A safety half your size is on you.'], ['rzblock', 'The defense is spread out to stop the pass.']], opts: () => ['rzcorner', 'rzblock'] },
  ],
  CB: [
    { id: 'cov', title: 'Cover their top receiver', w: 5, zone: 'open', looks: [['press', 'His stance says quick route. He wants to beat you off the line.'], ['off', 'He\'s their deep threat, and your safety help rotated away.']], opts: () => ['press', 'off'] },
    { id: 'rs', title: 'Run to your side', w: 1.2, zone: 'open', looks: [['shed', 'The receiver is coming to crack block. The back is right behind him.'], ['force', 'The back is aiming for the sideline.']], opts: () => ['shed', 'force'] },
    { id: 'nb', title: 'Nickel blitz call', w: 0.6, zone: 'open', looks: [['blitz', 'The running back stays in the backfield on the other side.'], ['bail', 'The quarterback is staring at your receiver.']], opts: () => ['blitz', 'bail'] },
  ],
  S: [
    { id: 'mid', title: 'Middle of the field', w: 4, zone: 'open', looks: [['deepmid', 'Two receivers running up the seams.'], ['rob', 'The quarterback\'s eyes are locked on a dig route underneath.'], ['box', 'Heavy formation: two tight ends and a fullback.']], opts: () => ['deepmid', 'rob', 'box'] },
    { id: 'alley', title: 'Back in the open field', w: 2, zone: 'open', looks: [['wrap', 'He\'s coming straight at you.'], ['strip', 'He\'s carrying the ball loose, away from his body.'], ['angle', 'He has the sideline and a head of steam.']], opts: () => ['wrap', 'strip', 'angle'] },
    { id: 'sball', title: 'Ball in the air', w: 2, zone: 'open', looks: [['jump', 'You read the quarterback\'s eyes the whole way.'], ['hands', 'You\'re in position but a step behind.'], ['rally', 'He\'s already running away from you after the catch point.']], opts: () => ['jump', 'hands', 'rally'], cb: true },
  ],
  DE: [
    { id: 'rush', title: 'Passing down', w: 5, zone: 'open', looks: [['speed', 'The tackle is slow out of his stance and leaning inside.'], ['bull', 'The tackle is sitting back on his heels.'], ['spin', 'The tackle is overplaying your outside rush.'], ['contain', 'Their quarterback is a runner looking for a lane.']], opts: () => ['speed', 'bull', 'spin', 'contain'] },
    { id: 'runstop', title: 'Run play', w: 3, zone: 'open', looks: [['setedge', 'They\'re running right at you.'], ['shoot', 'The guard pulls away. The gap in front of you opens.'], ['squeeze', 'The tight end blocks down and the back heads inside.']], opts: () => ['setedge', 'shoot', 'squeeze'] },
  ],
  LB: [
    { id: 'read', title: 'Read the play', w: 5, zone: 'open', looks: [['fill', 'The guard pulls. It\'s a power run.'], ['drop', 'Play-action coming. The tight end is sneaking out behind you.'], ['lbblitz', 'The center slides the protection away from the A-gap.']], opts: () => ['lbblitz', 'drop', 'fill'] },
    { id: 'scr', title: 'Screen developing', w: 1, zone: 'open', looks: [['blowup', 'The linemen let the rushers through too easily.'], ['shedlb', 'The guard is already out in space in front of the back.']], opts: () => ['blowup', 'shedlb'] },
    { id: 'seamlb', title: 'Tight end up the seam', w: 1, zone: 'open', looks: [['carry', 'He\'s running a straight vertical route.'], ['undercut', 'The quarterback stares him down from the snap.']], opts: () => ['carry', 'undercut'] },
  ],
};
// v9.9: offensive line, defensive tackle, kicker and punter
Object.assign(OPT, {
  OL: {
    anchor: { label: 'Anchor against the bull rush', hint: 'Sit down and hold your ground.', team: true, a: ['pow', 'pbk'], base: 0.6, ok: { yds: Y(6, 18), txt: 'You anchor and stone him. {qb} hits {wr} for {y}.' }, no: { yds: Y(-8, -5), st: { sa: 1 }, txt: 'He walks you back into {qb}. Sacked for {y}.' }, risk: { p: 0.02, to: true, st: { sa: 1 }, txt: 'Strip sack. The ball is out and they recover.' } },
    kick: { label: 'Kick-slide and ride him wide', hint: 'Beat the speed rusher to the spot.', team: true, a: ['ftw', 'pbk'], base: 0.58, ok: { yds: Y(7, 20), txt: 'You kick-slide and ride him past the pocket. {qb} finds {wr} for {y}.' }, no: { yds: Y(-9, -5), st: { sa: 1 }, txt: 'He dips under your hands. {qb} goes down for {y}.' }, risk: { p: 0.02, to: true, st: { sa: 1 }, txt: 'Blindside hit. The ball pops loose and they recover.' } },
    pass: { label: 'Pass off the stunt', hint: 'Stay square and trade rushers with the guard.', team: true, a: ['awr', 'ftw'], base: 0.55, ok: { yds: Y(6, 16), txt: 'You pass the stunt off cleanly. {qb} has all day and hits {wr} for {y}.' }, no: { yds: Y(-7, -4), st: { sa: 1 }, txt: 'The looper comes free through your gap. Sacked for {y}.' } },
    drive: { label: 'Drive him off the ball', hint: 'Win at the point of attack.', team: true, a: ['rbk', 'pow'], base: 0.58, ok: { yds: Y(4, 12), st: { pan: 1 }, txt: 'You drive him five yards and put him on his back. {rb} runs through the hole for {y}.' }, no: { yds: Y(-2, 2), txt: 'He sheds your block and stops {rb} for {y}.' } },
    pull: { label: 'Pull and lead through the hole', hint: 'Get out in front of the play.', team: true, a: ['ftw', 'rbk'], base: 0.5, ok: { yds: Y(6, 20), st: { pan: 1 }, txt: 'You pull, kick out the end, and {rb} cuts up inside for {y}.' }, no: { yds: Y(-3, 1), txt: 'You are a step late around the corner. {rb} is dropped for {y}.' } },
    climb: { label: 'Climb to the linebacker', hint: 'Seal the second level.', team: true, a: ['awr', 'rbk'], base: 0.55, ok: { yds: Y(7, 24), txt: 'You climb to the linebacker and seal him off. {rb} gets to the second level for {y}.' }, no: { yds: Y(1, 4), txt: 'The linebacker slips your block. {rb} gets {y}.' } },
    wedge: { label: 'Wedge the nose tackle back', hint: 'Low man wins.', team: true, a: ['pow', 'rbk'], base: 0.5, ok: { yds: GOAL, st: { pan: 1 }, txt: 'You and the center drive the nose tackle back. {rb} falls into the end zone.' }, no: { yds: Y(0, 1), txt: 'Stuffed at the line.' } },
    reachgl: { label: 'Reach the edge', hint: 'Get your head across and seal it.', team: true, a: ['ftw', 'awr'], base: 0.45, ok: { yds: GOAL, txt: 'You reach the end and {rb} walks in around the edge.' }, no: { yds: Y(0, 1), txt: 'The end beats your reach. No gain.' } },
  },
  DT: {
    bull: OPT.DE.bull, spin: OPT.DE.spin, shoot: OPT.DE.shoot, squeeze: OPT.DE.squeeze,
    swim: { label: 'Swim move', hint: 'Get over his hands and into the backfield.', a: ['rsh', 'bst'], base: 0.3, ok: { yds: Y(-8, -4), st: { sack: 1, tkl: 1, tfl: 1 }, txt: 'You swim right over the guard. Sack!', take: 'ff?', tp: 0.35, alt: { st: { hur: 1 }, txt: 'You swim past the guard and hurry the throw. Incomplete.' } }, no: { yds: Y(5, 14), txt: 'The guard stays square and the throw is complete for {y}.' } },
    hold2: { label: 'Hold up the double team', hint: 'Keep the linebackers clean.', a: ['pow', 'rnd'], base: 0.6, ok: { yds: Y(0, 3), st: { tkl: 1 }, txt: 'You split the double team and help make the stop after {y}.' }, no: { yds: Y(5, 12), txt: 'The double team moves you off the spot. {y}.' } },
  },
  K: {
    smooth: { label: 'Smooth, normal swing', hint: 'Your best accuracy. A long kick may come up short.', a: ['kac', 'tec'], base: 0.84, fgt: 1, kick: 0.022, ok: { txt: 'Smooth swing. The kick is good from {d} yards!' }, no: { txt: 'Your {d}-yard try drifts wide.' } },
    blast: { label: 'Hit it as hard as you can', hint: 'More distance, less control.', a: ['kpw', 'clu'], base: 0.74, fgt: 1, kick: 0.012, ok: { txt: 'You crush it. Good from {d} yards, with room to spare!' }, no: { txt: 'You hook the {d}-yard try. No good.' } },
    kfake: { label: 'Run the fake', hint: 'Catch them selling out. A turnover if it fails.', team: true, a: ['clu'], base: 0.36, ok: { yds: Y(5, 16), txt: 'The holder flips it to you on the fake and you run for {y}. First down!' }, no: { to: true, txt: 'They sniff out the fake. Turnover on downs.' } },
  },
  P: {
    boom: { label: 'Boom it', hint: 'Maximum distance. Might outkick the coverage.', a: ['ppw', 'hng'], base: 0.7, punt: [44, 56], ok: { txt: 'A booming {d}-yard punt, and the coverage is right there.' }, no: { txt: 'You outkick the coverage. {d} yards net after a nice return.' }, risk: { p: 0.015, to: true, txt: 'Blocked! They recover deep in your territory.' } },
    coffin: { label: 'Aim for the corner', hint: 'Pin them deep. It could sail into the end zone.', a: ['pac', 'tec'], base: 0.55, punt: [34, 46], pin: 1, ok: { txt: 'You drop it out of bounds inside the 10. A {d}-yard punt that flips the field.' }, no: { txt: 'It sails into the end zone. Touchback, {d} yards net.' } },
    hang: { label: 'High and short for a fair catch', hint: 'No return. Safe.', a: ['hng', 'tec'], base: 0.8, punt: [36, 45], ok: { txt: 'Plenty of hang time. Fair catch after {d} yards.' }, no: { txt: 'It comes down short. {d} yards.' } },
    pfake: { label: 'Run the fake', hint: 'Ten men on the line? Make them pay.', team: true, a: ['clu'], base: 0.34, ok: { yds: Y(6, 18), txt: 'You tuck it and run the fake for {y}. First down!' }, no: { to: true, txt: 'Stopped short on the fake. Their ball.' } },
  },
});
Object.assign(SCN, {
  OL: [
    { id: 'pp', title: 'Pass protection', w: 4, zone: 'open', looks: [['anchor', 'The defensive end is lined up head-up, ready to bull rush.'], ['kick', 'A speed rusher is lined up wide outside you.'], ['pass', 'The linebackers are creeping up. Looks like a stunt.']], opts: () => ['anchor', 'kick', 'pass'] },
    { id: 'olrun', title: 'Run play', w: 4, zone: 'open', looks: [['drive', 'The man in front of you is light and playing high.'], ['pull', 'The play goes to the other side. You are pulling.'], ['climb', 'The tackle slants away. The linebacker is unblocked.']], opts: () => ['drive', 'pull', 'climb'] },
    { id: 'olgl', title: 'Goal line', w: 1, zone: 'goal', looks: [['wedge', 'Everyone is stacked inside.'], ['reachgl', 'The end is pinching hard inside.']], opts: () => ['wedge', 'reachgl'] },
  ],
  DT: [
    { id: 'dtrush', title: 'Passing down', w: 3, zone: 'open', looks: [['bull', 'The guard is sitting back on his heels.'], ['spin', 'The guard is overplaying your outside shoulder.'], ['swim', 'The guard lunges at you with his hands.']], opts: () => ['bull', 'spin', 'swim'] },
    { id: 'dtrun', title: 'Run up the middle', w: 5, zone: 'open', looks: [['shoot', 'The center snaps and the gap in front of you opens.'], ['squeeze', 'The back heads straight at you.'], ['hold2', 'The guard and the center both come at you.']], opts: () => ['shoot', 'squeeze', 'hold2'] },
  ],
  K: [{ id: 'fgtry', title: 'Field goal try', w: 1, zone: 'kick', looks: [['smooth', 'Calm air. The snap and hold were perfect in warmups.'], ['blast', 'A stiff wind is blowing right in your face.'], ['kfake', 'Their edge rushers are selling out to block it.']], opts: () => ['smooth', 'blast', 'kfake'] }],
  P: [{ id: 'punt', title: 'Fourth down: punt', w: 1, zone: 'kick', looks: [['boom', 'Their returner is backed up deep and your coverage is fast.'], ['coffin', 'Near midfield. Room to pin them deep.'], ['hang', 'Their returner is dangerous.'], ['pfake', 'They put ten men on the line to block it.']], opts: () => ['boom', 'coffin', 'hang', 'pfake'] }],
});
// follow-up decisions within the same snap
const FOLLOW = {
  contact: { title: 'Second level', txt: 'A safety comes downhill to meet you.', opts: ['juke', 'truck', 'protect'], pos: 'RB' },
  catch: { title: 'Ball in the air', txt: 'The throw is on its way and the defender is closing.', opts: ['highpoint', 'secure', 'race'], pos: 'WR' },
  ball: { title: 'Ball in the air', txt: 'The quarterback throws your man\'s way.', opts: ['jump', 'hands', 'rally'], pos: 'CB' },
};
function optDef(pos, k) { return OPT[pos][k] || OPT.WR[k] || OPT.CB[k] || OPT.RB[k]; }

/* ---------- building a game ---------- */
let cg = null; // the game in progress (lives only while a game is being played)
const HS_IMPACT = { QB: 0.35, RB: 0.12, WR: 0.09, TE: 0.06, CB: 0.1, S: 0.08, DE: 0.11, LB: 0.1, OL: 0.07, DT: 0.1, K: 0.05, P: 0.04 };
function cgNew(spec) {
  // spec: { lvl, wk, h, a, hq, aq (HS strengths), neutral, name, type, lg (league game) }
  const me = cs.p; const pos = me.pos; const side = cSide(pos);
  const myHome = spec.home; const mi = myHome ? 0 : 1;
  const share = myShare(); const d = myDepth();
  const ids = spec.ids; const names = spec.names;
  const base = spec.base; // [{off,def},{off,def}] home/away
  const F = base.map(s => ({ off: s.off + gauss() * 2.4, def: s.def + gauss() * 2.4 }));
  // the player's impact on his own unit: how much better (or worse) he is than the man he replaces
  if (share > 0) {
    const repl = d.all.filter(x => !x.me)[Math.max(0, Math.min(d.rank, d.all.length - 2))];
    const gap = cOvr(me) - (repl ? repl.ovr : cOvr(me));
    F[mi][side] += clamp(gap, -15, 25) * HS_IMPACT[pos] * share;
  }
  const g = {
    lvl: cs.lvl, wk: spec.wk, name: spec.name || '', type: spec.type || 'reg', ids, names, mi, side, share, role: roleOf(share), rank: d.rank,
    neutral: !!spec.neutral, F, pts: [0, 0], q: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], N: ri(11, 13), i: 0, first: R() < 0.5 ? 0 : 1, ot: 0, done: false,
    line: {}, log: [], plays: [], decN: 0, decOk: 0, pending: null, trust: 0, lgId: spec.lgId || null, oppTid: spec.oppTid || null, hsIdx: spec.hsIdx,
  };
  g.total = g.N * 2;
  g.share2 = twoWayOn() && share > 0 ? (typeof twShare2 === 'function' ? twShare2() : clamp(0.2 + (cOvr2(me) - 65) * 0.012, 0.08, 0.5)) : 0; /* a two-way player's snaps on the other side */
  // which of the player's drives get a snap decision
  const mine = []; for (let i = 0; i < g.total; i++) { const s = (i + g.first) % 2; if ((side === 'off') === (s === mi)) mine.push(i); }
  let k = cSpec(pos) ? (share >= 0.9 ? ri(1, 2) : 0) : share >= 0.9 ? ri(6, 9) : share >= 0.3 ? ri(2, 3) : share > 0 ? (R() < 0.5 ? 1 : 0) : 0;
  const pickFrom = share < 0.3 ? mine.slice(-3) : mine.slice();
  shuffle(pickFrom); g.plan = pickFrom.slice(0, Math.min(k, pickFrom.length)).sort((a, b) => a - b);
  // the snap decisions are part of the player's normal workload, so the rest of it shrinks
  const use = cSpec(pos) || pos === 'OL' ? [0, 0] : { QB: [37 * share, 0.85], RB: [38 * (RUN_SHARE[d.rank] || 0.05), 0.9], WR: [37 * (TGT_SHARE.WR[d.rank] || 0.02), 0.65], TE: [37 * (TGT_SHARE.TE[d.rank] || 0.02) + 2, 0.7] }[pos] || [61 * ((TKL_SHARE[pos] || {})[d.rank] || 0.02), 0.7];
  g.bgScale = use[0] > 0 ? clamp(1 - g.plan.length * use[1] / use[0], 0.15, 1) : 1;
  return g;
}
// opponent units on the player OVR scale, so ratings can be compared directly
function unitLvl(g, v) { return g.lvl === 'hs' ? v - 3 : 60 + (v - 60) * 0.7; }
// Game clock at drive index x (fractions mean part-way through a drive). Drive lengths vary by a
// fixed per-game jitter taken from a hash, so no random numbers are used and replays match (CL-08).
function cgDriveT(g, i) {
  if (i <= 0 || i >= g.total) return clamp(i, 0, g.total);
  let h = 2166136261; const key = (g.wk || 0) + '|' + i + '|' + (g.ids || []).join('');
  for (let k = 0; k < key.length; k++) { h ^= key.charCodeAt(k); h = Math.imul(h, 16777619); }
  return i + (((h >>> 0) % 1000) / 1000 - 0.5) * 0.7;
}
function cgClock(g, x) {
  const fl = Math.floor(x); const a = cgDriveT(g, fl); const t0 = x === fl ? a : a + (x - fl) * (cgDriveT(g, fl + 1) - a);
  const t = Math.min(t0 / g.total * 60, 59.99); const qtr = Math.min(4, Math.floor(t / 15) + 1); const rem = 15 - (t % 15);
  return { qtr, clock: Math.floor(rem) + ':' + String(Math.floor((rem % 1) * 60)).padStart(2, '0') };
}
// What the scoreboard shows after the latest drive: the clock where that drive ended.
function cgBoardClock(g) {
  const last = g.log[0]; if (!last) return { qtr: 0 };
  if (last.qtr > 4) return { qtr: last.qtr, clock: last.clock };
  if (last.i + 1 >= g.total) return { qtr: 4, clock: '0:00' };
  return cgClock(g, last.i + 1);
}
function tpl(txt, d) {
  const y = d ? d.y : 0;
  // a loss reads as "a 3-yard loss", never "-3-yard" or "3-yard" gain wording (CL tpl fixes)
  const ph = y < 0 ? `a loss of ${-y} yard${y === -1 ? '' : 's'}` : 'no gain';
  // "drop him after no gain" reads badly: losses and no-gain plays take "for" (reviewer fix)
  if (y <= 0) txt = String(txt).replace(/after \{y\}/g, 'for ' + ph).replace(/You get \{y\}\./g, y < 0 ? `You lose ${-y} yard${y === -1 ? '' : 's'}.` : 'You get nothing.');
  txt = String(txt).replace(/\{y\}-yard (catch|gain|run|pickup|completion)/g, (m, w) => y < 0 ? `${-y}-yard loss` : y === 0 ? `no-gain ${w}` : `${y}-yard ${w}`).replace(/\{y\}-yard/g, Math.abs(y) + '-yard')
    .replace(/\{y\} yards?/g, y > 1 ? y + ' yards' : y === 1 ? '1 yard' : y === 0 ? 'no gain' : `a loss of ${-y} yard${y === -1 ? '' : 's'}`)
    .replace(/\{n\}/g, Math.abs(y) === 1 ? '1 yard' : Math.abs(y) + ' yards')
    .replace(/\{y\} more yards/g, y === 1 ? '1 more yard' : y + ' more yards');
  txt = txt.replace(/\{(\w+)\}/g, (m, k) => {
    if (k === 'y') return y < 0 ? `a loss of ${-y} yard${y === -1 ? '' : 's'}` : y === 0 ? 'no gain' : y === 1 ? '1 yard' : y + ' yards';
    const mate = { rb: 'RB', wr: 'WR', te: 'TE', qb: 'QB' }[k]; if (mate) return cLast(mateName(mate, 0)) || 'your teammate';
    return m;
  });
  // sentences that open with the yardage ("no gain.", "a loss of 2 yards.") start with a capital
  return txt.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
}
function addLine(g, st, y) { if (!st) return; for (const k in st) { let v = st[k]; if (v === 'y') v = y; else if (v === 'neg') v = y < 0 ? 1 : 0; g.line[k] = (g.line[k] || 0) + v; } }
function cgStep(g) {
  if (g.done || g.pending) return false;
  if (g.i >= g.total) { cgOvertimeOrEnd(g); return false; }
  const s = (g.i + g.first) % 2;
  if (g.plan.includes(g.i)) { g.pending = mkDecision(g, s); if (g.pending) return false; }
  cgDrive(g, s, null);
  return true;
}
function mkDecision(g, s) {
  const me = cs.p; const pos = me.pos; const list = SCN[pos];
  const redP = 0.14; const zoneRoll = R();
  const pool = list.filter(x => x.zone === 'open' || x.zone === 'kick' || (x.zone === 'red' && zoneRoll < redP) || (x.zone === 'goal' && zoneRoll < 0.1));
  const tot = pool.reduce((a, x) => a + x.w, 0); let r = R() * tot; let sc = pool[0]; for (const x of pool) { if ((r -= x.w) <= 0) { sc = x; break; } }
  const yl = pos === 'K' ? ri(3, 36) : pos === 'P' ? ri(45, 85) : sc.zone === 'red' ? ri(5, 19) : sc.zone === 'goal' ? ri(1, 3) : ri(22, 78);
  const down = cSpec(pos) ? 4 : sc.id === 'pro' || sc.id === 'seamq' || sc.id === 'rush' || sc.id === 'pp' ? 3 : pick([1, 1, 2, 2, 3]); const dist = down === 1 ? 10 : Math.min(yl, ri(2, 10));
  const looks = sc.looks.filter(l => !l[2] || l[2](me));
  const look = pick(looks);
  const oppLvl = unitLvl(g, g.F[1 - g.mi][g.side === 'off' ? 'def' : 'off']);
  const clarity = clamp(0.5 + ((me.a[CREAD[pos]] || 50) - oppLvl) * 0.013 + 0.12 + cdiff().dec, 0.25, 0.95);
  const seen = R() < clarity;
  const opts = sc.opts(me).filter(k => OPT[pos][k] || optDef(pos, k));
  return { s, sc: sc.id, title: sc.title, yl, down, dist, fav: look[0], look: seen ? look[1] : pick(['The defense shows nothing before the snap.', 'Hard to read. They\'re disguising it.', 'Everything looks normal. Trust your instincts.']), seen, opts, step: 1, gain: 0, mods: { td: 1, fg: 1, to: 0 }, clk: cgClock(g, g.i + 0.4) };
}
function optChance(g, dec, k) {
  const me = cs.p; const o = optDef(me.pos, k); const oppLvl = unitLvl(g, g.F[1 - g.mi][g.side === 'off' ? 'def' : 'off']);
  let av; if (o.team && !o.a.length) av = unitLvl(g, g.F[g.mi].off); else av = o.a.reduce((s, a) => s + (me.a[a] || 50), 0) / o.a.length;
  const fav = dec.step === 1 ? (dec.fav === k ? 0.13 : -0.04) : 0;
  if (o.fgt) return clamp(o.base + (av - 70) * 0.012 - Math.max(0, dec.yl + 17 - 30) * o.kick + fav * 0.5 + cdiff().dec, 0.05, 0.98);
  if (o.punt) return clamp(o.base + (av - 70) * 0.012 + fav + cdiff().dec, 0.1, 0.95);
  return clamp(o.base + (av - oppLvl) * 0.011 + fav + cdiff().dec, 0.04, 0.95);
}
// The computer's choice in simulated games: usually the play the look suggests, if it could see it.
function autoPick(g, dec) {
  if (dec.step === 1 && dec.seen && dec.opts.includes(dec.fav) && R() < 0.85) return dec.fav;
  let best = null; dec.opts.forEach(k => { const o = optDef(cs.p.pos, k); const p = optChance(g, dec, k) - ((o.risk && o.risk.p) || 0) * 2 + R() * 0.12; if (!best || p > best.p) best = { k, p }; });
  return best.k;
}
function cgChoose(g, k) {
  const dec = g.pending; if (!dec || !dec.opts.includes(k)) return null;
  const me = cs.p; const o = optDef(me.pos, k); const p = optChance(g, dec, k);
  const off = g.side === 'off'; const r = R();
  let br, kind;
  const tkM = g.share >= 0.9 ? 1 : 0.6; // CL-03: backups rarely get the takeaway
  if (r < p) { br = o.ok; kind = 'ok'; if (br.tp != null && br.alt && R() > br.tp * (br.take ? tkM : 1)) br = Object.assign({}, br.alt, { take: null }); }
  else if (o.mid && r < p + (1 - p) * o.mid.w) { br = o.mid; kind = 'mid'; }
  else { const rp = o.risk ? o.risk.p * (dec.fav === k ? 0.6 : 1.25) * clamp(1.3 - ((me.a[CREAD[me.pos]] || 50) - 50) / 100, 0.6, 1.3) : 0; if (o.risk && R() < rp) { br = o.risk; kind = 'risk'; } else { br = o.no; kind = 'no'; } }
  const d = { y: 0, oppTid: g.oppTid, base: dec.base, yl: dec.yl - dec.gain };
  d.y = br.yds ? br.yds(d) : 0; if (d.y > d.yl) d.y = d.yl;
  addLine(g, br.st, d.y);
  if (o.trust && kind === 'ok') g.trust += o.trust;
  g.decN += dec.step === 1 ? 1 : 0;
  let txt = tpl(br.txt, d);
  dec.gain += Math.max(0, d.y);
  const res = { kind, txt, k, label: o.label };
  const snap0 = dec.snap0 || { k, y: d.y, yl0: d.yl }; /* the field view draws the whole snap, both steps, once it is decided */
  if (o.fgt || o.punt) { /* a kick ends the drive: good or no good, or the punt and where it lands */
    let dd;
    if (o.fgt) { dd = dec.yl + 17; const made = kind === 'ok'; addLine(g, made ? { fga: 1, fgm: 1, fg50: dd >= 50 ? 1 : 0 } : { fga: 1 }); res.imm = made ? 'fg' : 'miss'; }
    else { const d0 = ri(o.punt[0], o.punt[1]) + Math.round(((me.a.ppw || 60) - 70) * 0.2); dd = kind === 'risk' ? 0 : kind === 'ok' ? d0 : Math.max(18, d0 - ri(8, 15)); dd = Math.min(dd, Math.max(10, dec.yl - 1)); res.imm = kind === 'risk' ? 'to' : 'punt'; if (kind !== 'risk') addLine(g, { punt: 1, puyd: dd, in20: o.pin && kind === 'ok' ? 1 : 0 }); }
    txt = String(br.txt).replace(/\{d\}/g, dd); res.txt = txt; g.plays.push(txt); g.pending = null; if (kind === 'ok') g.decOk++; g.decN += 0;
    (g.snaps || (g.snaps = [])).push({ s: dec.s, k1: k, k, kind, y: dd, yl0: dec.yl, down: dec.down, dist: dec.dist, qtr: dec.clk ? dec.clk.qtr : 1, imm: res.imm, pick6: false, i: g.i, kk: o.fgt ? 'fg' : 'punt' });
    cgDrive(g, dec.s, { mods: dec.mods, imm: res.imm, dtxt: txt, credited: false });
    return res;
  }
  if (off) {
    if (br.to) { res.imm = 'to'; }
    else if (d.y > 0 && d.y >= dec.yl - (dec.gain - d.y)) { res.imm = 'td'; if (!/Touchdown/.test(txt)) txt += ' Touchdown!'; tdCredit(g, o, br); }
    else if (kind === 'ok' && br.next && R() < br.next.p) { const f = FOLLOW[br.next.id]; g.pending = Object.assign({}, dec, { step: 2, title: f.title, look: f.txt, opts: f.opts, fav: null, base: d.y, gain: br.next.id === 'catch' ? dec.gain - d.y : dec.gain, snap0 }); g.plays.push(txt); res.txt = txt; res.follow = true; return res; }
    else if (kind === 'ok') { dec.mods.td *= 1.4; dec.mods.to -= 0.02; }
    else if (kind === 'mid') dec.mods.td *= 1.1;
    else dec.mods.td *= (d.y < 0 ? 0.6 : 0.72);
  } else {
    const takeaway = br.take === 'int' || br.take === 'ff' || (br.take === 'ff?' && R() < (0.08 + ((me.a.rsh || me.a.blz || 50) - 60) * 0.002) * tkM) || (br.take === 'int?' && R() < 0.1 * tkM);
    if (takeaway) {
      if (br.take === 'ff?') { addLine(g, { ff: 1 }); txt += ' The ball comes loose and your team recovers!'; }
      if (br.take === 'int?') { addLine(g, { dint: 1, pbu: -1 }); txt = 'You sink under the route and pick it off. Interception!'; }
      res.imm = 'to';
      if ((br.take === 'int' || br.take === 'int?') && R() < 0.12) { res.pick6 = true; addLine(g, { dtd: 1 }); txt += ' And you take it all the way back for a touchdown!'; }
    } else if (br.big && d.y >= dec.yl) { res.imm = 'td'; txt = txt.replace(/\{y\}|\d+ yards?/, 'a touchdown').replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()); if (!/touchdown/i.test(txt)) txt += ' Touchdown.'; }
    else if (kind === 'ok' && br.next && R() < br.next.p) { const f = FOLLOW[br.next.id]; g.pending = Object.assign({}, dec, { step: 2, title: f.title, look: f.txt, opts: f.opts, fav: null, snap0 }); g.plays.push(txt); res.txt = txt; res.follow = true; return res; }
    else if (kind === 'ok') { dec.mods.td *= 0.5; dec.mods.fg *= 1.15; dec.mods.to += 0.03; }
    else if (kind === 'mid') dec.mods.td *= 0.78;
    else if (br.big) dec.mods.td *= 1.7;
    else dec.mods.td *= 1.2;
  }
  res.txt = txt; g.plays.push(txt); g.pending = null; if (kind === 'ok') g.decOk++;
  (g.snaps || (g.snaps = [])).push({ s: dec.s, k1: snap0.k, k, kind, y: dec.snap0 ? snap0.y + d.y : d.y, yl0: snap0.yl0, down: dec.down, dist: dec.dist, qtr: dec.clk ? dec.clk.qtr : 1, imm: res.imm || null, pick6: !!res.pick6, i: g.i });
  cgDrive(g, dec.s, { mods: dec.mods, imm: res.imm, pick6: res.pick6, dtxt: txt, credited: res.imm === 'td' });
  return res;
}
// who gets credit for a touchdown the player's decision produced
function tdCredit(g, o, br) {
  const st = br.st || {};
  if (st.pyd) addLine(g, { ptd: 1 }); else if (st.ryd && cs.p.pos !== 'WR') addLine(g, { rtd: 1 }); else if (st.recyd) addLine(g, { rectd: 1 });
}
function cgDrive(g, s, dec) {
  const off = g.F[s].off, def = g.F[1 - s].def; const adv = s === 0 && !g.neutral ? 0.22 : 0;
  const mods = dec ? { td: dec.mods.td, fg: dec.mods.fg, to: dec.mods.to } : null;
  let out = dec && dec.imm ? dec.imm : rollOut(driveProbs(off, def, adv, false, mods));
  const c = cgClock(g, g.i); const qi = c.qtr - 1;
  let pts = 0, txt = '';
  if (dec && dec.pick6) { g.pts[1 - s] += 7; g.q[1 - s][qi] += 7; }
  else if (out === 'td') { pts = R() < 0.96 ? 7 : 6; }
  else if (out === 'fg') { pts = 3; }
  g.pts[s] += pts; g.q[s][qi] += pts;
  const bg = bgStats(g, s, out, !!dec, dec && dec.credited, typeof twAlt1 === 'function' ? twAlt1(g) : undefined);
  if (g.share2) { const b2 = bgStats(g, s, out, false, false, typeof twAlt2 === 'function' ? twAlt2(g) : { pos: cs.p.two, a: cs.p.a2, share: g.share2, rank: 1 }); if (b2.me) g.tw2 = (g.tw2 || 0) + 1; if (b2.me) bg.me = bg.me ? bg.me + '; ' + b2.me : b2.me; }
  txt = dec ? dec.dtxt : '';
  g.log.unshift({ i: g.i, qtr: c.qtr, clock: c.clock, s, out, np: bg.np, yds: bg.yds, txt, me: bg.me, dec: !!dec, pick6: dec && dec.pick6 });
  g.i++;
}
function cgOvertimeOrEnd(g) {
  if (g.pts[0] !== g.pts[1] || g.ot >= 6) { if (g.pts[0] === g.pts[1]) { g.pts[R() < 0.5 ? 0 : 1] += 2; } cgEnd(g); return; }
  g.ot++;
  for (let s = 0; s < 2; s++) { const o = rollOut(driveProbs(g.F[s].off, g.F[1 - s].def, 0, true), true); const p = o === 'td' ? (g.ot >= 3 ? 2 : 7) : o === 'fg' && g.ot < 3 ? 3 : 0; g.pts[s] += p; g.q[s][4] += p; g.log.unshift({ i: g.i++, qtr: 5, clock: 'OT', s, out: o, np: ri(3, 8), yds: ri(5, 25), txt: '', me: '' }); }
  if (g.pts[0] !== g.pts[1] || g.ot >= 6) cgOvertimeOrEnd(g);
}
// the player's stat line for the parts of the drive he didn't decide himself
function bgStats(g, s, out, hadDec, credited, alt) {
  const me = cs.p; const pos = alt ? alt.pos : me.pos; const share = alt ? alt.share : g.share; const my = s === g.mi; const L = {};
  const plays = { td: ri(6, 11), fg: ri(6, 10), punt: ri(3, 7), to: ri(2, 7), downs: ri(4, 9) }[out] || 5;
  const yds = { td: ri(45, 80), fg: ri(30, 60), punt: ri(0, 30), to: ri(0, 35), downs: ri(15, 45) }[out] || 10;
  const res = { np: plays, yds, me: '' };
  if (share <= 0) return res;
  const hsBoost = cs.lvl === 'hs' ? 1.1 : 1;
  const passRate = pos === 'QB' && me.style === 'dual' ? 0.43 : 0.47;
  let pp = Math.round(plays * passRate + (R() - 0.5)); pp = clamp(pp, 0, plays); const rp = plays - pp;
  const decAdj = 0; const B = alt && !alt.main ? 1 : g.bgScale || 1;
  const oppU = { off: unitLvl(g, g.F[1 - g.mi].off), def: unitLvl(g, g.F[1 - g.mi].def) }; const a = alt ? alt.a : me.a;
  const passTD = out === 'td' && !credited && R() < 0.58; const rushTD = out === 'td' && !credited && !passTD;
  const intTO = out === 'to' && !(hadDec) && R() < 0.55; const fumTO = out === 'to' && !hadDec && !intTO;
  const d = alt ? alt.rank : g.rank;
  if (my && pos === 'OL') {
    L.snp = Math.round(plays * Math.min(1, share)); L.pan = binom(rp, 0.06 * (1 + ((a.rbk || 60) - 60) * 0.02) * Math.min(1, share)); L.sa = binom(pp, 0.01 * clamp(1 - ((a.pbk || 60) - 60) * 0.02, 0.2, 2) * Math.min(1, share));
  } else if (my && pos === 'K') {
    if (out === 'td') { L.xpa = 1; L.xpm = R() < clamp(0.93 + ((a.kac || 60) - 70) * 0.003, 0.85, 0.995) ? 1 : 0; }
    if (out === 'fg' && !hadDec) { L.fga = 1; L.fgm = 1; if (R() < 0.12 + ((a.kpw || 60) - 70) * 0.006) L.fg50 = 1; }
  } else if (my && pos === 'P') {
    if (out === 'punt' && !hadDec && hash((g.wk || 0) + ':' + g.i + ':' + (g.ids || []).join('') + ':pn') < 0.6) { L.punt = 1; L.puyd = Math.max(25, Math.round(41 + ((a.ppw || 60) - 70) * 0.25 + gauss() * 5)); if (R() < 0.3 + ((a.pac || 60) - 70) * 0.01) L.in20 = 1; }
  } else if (my && cSide(pos) === 'off') {
    if (pos === 'QB') {
      const att = binom(pp, share * B); const cp = clamp(0.56 + (a.acc - oppU.def) * 0.005 + (a.dec - oppU.def) * 0.002, 0.42, 0.74);
      const cmp = binom(att, cp); const ypc = 10.3 + (a.arm - 72) * 0.06 + gauss() * 1.5;
      L.att = att; L.cmp = cmp; L.pyd = Math.round(cmp * Math.max(6, ypc)); if (passTD && share >= 0.9) L.ptd = 1;
      if (intTO && share >= 0.9) L.int = 1;
      const qr = me.style === 'dual' ? 0.18 : 0.08 + Math.max(0, a.mob - 60) * 0.004; const car = binom(rp, qr * share);
      L.car = car; L.ryd = Math.round(car * (3 + (a.mob - 65) * 0.12 + gauss() * 2)); if (rushTD && car && R() < qr * 1.6) L.rtd = 1;
      if (fumTO && (car || att) && R() < 0.2) L.fum = 1;
    } else if (pos === 'RB') {
      const rs = (RUN_SHARE[d] || 0.05) * (share >= 0.9 ? 1 : 0.9) * hsBoost; const car = binom(rp, rs * B);
      const ypc = 4.3 + (((a.spd + a.vis + a.elu + a.pow) / 4) - oppU.def) * 0.06 + gauss() * 1.2;
      const c2 = Math.max(0, car - decAdj); L.car = c2; L.ryd = Math.round(c2 * ypc); if (rushTD && c2 && R() < rs * 1.4) L.rtd = 1;
      const tg = binom(pp, (TGT_SHARE.RB[d] || 0.01) * (1 + (a.hnd - 60) * 0.01)); const rec = binom(tg, 0.72); L.tgt = tg; L.rec = rec; L.recyd = Math.round(rec * (7 + gauss() * 2));
      if (fumTO && (L.car || rec) && R() < rs * 0.5) L.fum = 1;
    } else {
      const ts = (TGT_SHARE[pos][d] || 0.02) * hsBoost * (share >= 0.3 ? 1 : share * 3) * B;
      const tg = Math.max(0, binom(pp, ts) - decAdj); // catch rates: about 60-70% for receivers, 65-75% for tight ends (CL-B3)
      const cp = pos === 'TE' ? clamp(0.57 + (((a.hnd + a.rte) / 2) - oppU.def) * 0.005, 0.48, 0.74) : clamp(0.5 + (((a.hnd + a.rte) / 2) - oppU.def) * 0.005, 0.42, 0.72);
      const rec = binom(tg, cp); const ypr = (pos === 'WR' ? 12.5 + (a.spd - 72) * 0.1 : 10 + (a.spd - 65) * 0.06) + gauss() * 2;
      L.tgt = tg; L.rec = rec; L.recyd = Math.round(rec * Math.max(4, ypr)); if (passTD && R() < (TGT_SHARE[pos][d] || 0.02) * (share >= 0.3 ? 1 : share * 3) * 1.3) { if (!rec) { L.tgt = tg + 1; L.rec = 1; L.recyd = ri(4, 30); } L.rectd = 1; }
      if (pos === 'TE') L.pan = binom(rp, 0.02 * (1 + (a.blk - 60) * 0.02) * share * B);
    }
  } else if (!my && cSide(pos) === 'def') {
    const tk = Math.max(0, rp + Math.round(pp * 0.62) - decAdj);
    const tsh = (TKL_SHARE[pos][d] || 0.02) * (share >= 0.3 ? 1 : share * 3) * (1 + ((a.tkl || a.rnd || a.man || 60) - 65) * 0.006) * hsBoost * B;
    L.tkl = Math.max(0, binom(tk + decAdj, tsh) - decAdj);
    const tflP = pos === 'DT' ? 0.016 : pos === 'DE' ? 0.02 : pos === 'LB' ? 0.004 : pos === 'S' ? 0.006 : 0.003; L.tfl = binom(rp, tflP * B * (share >= 0.9 ? 1 : share) * (1 + ((a.bst || a.iq || a.spd || 60) - 65) * 0.01));
    const sackP = 0.045 * B * (SACK_SHARE[pos][d] || 0.01) * (1 + ((a.rsh || a.blz || a.spd || 60) - 65) * 0.02) * hsBoost;
    const sk = binom(pp, sackP); L.sack = sk; if (sk) L.tfl += sk; L.tkl += sk;
    if (pos === 'DE' || pos === 'LB' || pos === 'DT') L.hur = binom(pp, 0.1 * B * (SACK_SHARE[pos][d] || 0.02));
    const Bc = pos === 'CB' ? Math.max(B, 0.5) : B; // coverage stats are mostly background plays
    if (intTO && R() < Bc * (INT_SHARE[pos][d] || 0.01) * (pos === 'CB' ? 1.8 : 1) * (1 + ((a.bsk || a.cov || 60) - 65) * 0.02)) L.dint = 1;
    if (fumTO && R() < B * ({ DE: 0.18, LB: 0.16, S: 0.12, CB: 0.08, DT: 0.14 }[pos] || 0.1) * (share >= 0.9 ? 1 : share)) L.ff = 1;
    if (pos !== 'DE' && pos !== 'DT') L.pbu = binom(pp, 0.018 * Bc * (INT_SHARE[pos][d] || 0.02) * ({ CB: 8, LB: 2.5 }[pos] || 4) * (1 + ((a.bsk || a.man || a.cov || 60) - 65) * 0.015));
  }
  Object.keys(L).forEach(k => { if (!L[k]) delete L[k]; });
  addLine(g, L);
  res.me = lineText(L, pos);
  return res;
}
function lineText(L, pos) {
  const g = k => L[k] || 0; const bits = []; const n = (k, one, many) => g(k) ? (g(k) > 1 ? `${g(k)} ${many || one}` : one) : '';
  const td = k => n(k, 'TD', 'TD'), join = a => a.filter(Boolean).join(', ');
  if (pos === 'QB') { if (g('att')) bits.push(join([`${g('cmp')}/${g('att')}, ${g('pyd')} yds`, td('ptd'), n('int', 'INT', 'INT')])); if (g('car')) bits.push(join([`${g('car')} run${g('car') > 1 ? 's' : ''} for ${g('ryd')}`, td('rtd')])); }
  else if (pos === 'RB') { if (g('car')) bits.push(join([`${g('car')} car, ${g('ryd')} yds`, td('rtd')])); if (g('rec')) bits.push(join([`${g('rec')} rec, ${g('recyd')} yds`, td('rectd')])); }
  else if (pos === 'OL') { if (g('snp')) bits.push(`${g('snp')} snaps`); if (g('pan')) bits.push(n('pan', 'pancake block', 'pancake blocks')); if (g('sa')) bits.push(n('sa', 'sack allowed', 'sacks allowed')); }
  else if (pos === 'K') { if (g('fga')) bits.push(`${g('fgm')}/${g('fga')} FG`); if (g('xpa')) bits.push(`${g('xpm')}/${g('xpa')} XP`); }
  else if (pos === 'P') { if (g('punt')) bits.push(`${g('punt')} punt${g('punt') > 1 ? 's' : ''}, ${g('puyd')} yds`); if (g('in20')) bits.push(n('in20', 'inside the 20', 'inside the 20')); }
  else if (pos === 'WR' || pos === 'TE') { if (g('rec')) bits.push(join([`${g('rec')} rec, ${g('recyd')} yds`, td('rectd')])); else if (g('tgt')) bits.push(`${g('tgt')} target${g('tgt') > 1 ? 's' : ''}, no catch`); if (g('pan')) bits.push(n('pan', 'pancake block', 'pancake blocks')); }
  else { if (g('tkl')) bits.push(`${g('tkl')} tackle${g('tkl') > 1 ? 's' : ''}`); if (g('sack')) bits.push(n('sack', 'sack', 'sacks')); else if (g('tfl')) bits.push(n('tfl', 'TFL', 'TFL')); if (g('dint')) bits.push(n('dint', 'INT', 'INT')); if (g('pbu')) bits.push(n('pbu', 'PBU', 'PBU')); if (g('ff')) bits.push(n('ff', 'forced fumble', 'forced fumbles')); }
  return bits.join(', ');
}
function cgEnd(g) {
  g.done = true; g.pending = null;
  const imp = impactPts(g.line, cs.p.pos);
  const expU = expectedUsage(g);
  // garbage-time snaps for a backup aren't graded; a real role or a snap decision is
  g.ratio = g.share > 0 && expU > 0 && (g.share >= 0.3 || g.decN > 0) ? imp / (EXP_IMP[cs.p.pos] * expU) : null;
  const gr = gameGradeRatio(g);
  g.grade = gr != null ? gradeOf(gr) : null;
}
// The letter grade: production against the role's workload, blended with how the snap decisions
// went, with floors for a strong decision game and a narrow band for tiny samples (CL-12, CL-B2).
const GRADE_MIN_TOUCH = { QB: 8, RB: 6, WR: 3, TE: 2, CB: 3, S: 3, DE: 3, LB: 3, OL: 3, DT: 2, K: 1, P: 2 };
function gameTouches(line, pos) {
  const v = k => line[k] || 0;
  if (pos === 'QB') return v('att') + v('car');
  if (pos === 'RB') return v('car') + v('tgt');
  if (pos === 'WR' || pos === 'TE') return v('tgt') + (pos === 'TE' ? Math.floor(v('pan') / 2) : 0);
  if (pos === 'OL') return Math.floor(v('snp') / 10); if (pos === 'K') return v('fga') + v('xpa'); if (pos === 'P') return v('punt');
  return v('tkl') + v('pbu') + v('dint') + v('hur') + v('ff');
}
function gameGradeRatio(g) {
  if (g.ratio == null) return null;
  const pos = cs.p.pos; const hasLine = Object.keys(g.line).some(k => g.line[k]);
  if (!hasLine) return null; // no stat line, no grade
  let r = g.ratio;
  if (g.decN >= 2) {
    const dr = g.decOk / g.decN; r = r * 0.7 + (0.55 + dr * 1.1) * 0.3;
    if (g.decN >= 4 && dr >= 0.75) r = Math.max(r, 1.0); else if (g.decN >= 3 && dr >= 0.6) r = Math.max(r, 0.75);
  }
  if (gameTouches(g.line, pos) < GRADE_MIN_TOUCH[pos]) r = clamp(r, 0.75, 1.24); // a few snaps: C to B only
  return r;
}
// how much of a full-time starter's workload this role gets, for grading
function expectedUsage(g) {
  const pos = cs.p.pos; const d = g.rank;
  if (pos === 'WR' || pos === 'TE') return Math.max(0.15, (TGT_SHARE[pos][d] || 0.02) / TGT_SHARE.WR[0] * (pos === 'TE' ? 1.25 : 1)) * (g.share >= 0.3 ? 1 : 0.5);
  if (pos === 'RB') return Math.max(0.12, (RUN_SHARE[d] || 0.05) / RUN_SHARE[0]);
  if (cSide(pos) === 'def') return Math.max(0.12, ((TKL_SHARE[pos][d] || 0.02) / TKL_SHARE[pos][0]) * (g.share >= 0.3 ? 1 : 0.4));
  return Math.max(0.1, g.share);
}
function cgAutoplay(g) { let guard = 0; while (!g.done && guard++ < 400) { if (g.pending) cgChoose(g, autoPick(g, g.pending)); else cgStep(g); } }

