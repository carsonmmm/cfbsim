# Football Empire

**A free college football and NFL simulator that runs in your browser. Play it at [collegefbsim.com](https://collegefbsim.com/).**

[![Checks](https://github.com/carsonmmm/cfbsim/actions/workflows/ci.yml/badge.svg)](https://github.com/carsonmmm/cfbsim/actions/workflows/ci.yml)

No download, no account, no ads. Your careers are saved in your own browser, and you can install the game on your phone and play offline.

![The Football Empire home screen, showing the modes](docs/img/home.png)

## Eight ways to play

| Mode | You are | What you do |
|---|---|---|
| **Athletic Director** | The AD at any of the 138 FBS schools, or one you create | Hire and fire coaches, set the budget, recruit, run the department and build a dynasty. |
| **Coach** | A coach at any level, from position coach to head coach | Call plays on game day, draw your own playbook, recruit on the road, work the coaching carousel and negotiate your own contracts. |
| **Player Career** | One player, from high school on | Earn your stars, choose from scholarship and NIL offers, use the transfer portal, get drafted and play out an NFL career. |
| **General Manager** | The GM of an NFL club | Run the draft, the salary cap, free agency and trades. Start with the current rosters, or with a fantasy draft where all 32 clubs pick from one pool. |
| **Commissioner** | The head of college football or the NFL | Rule on suspensions and appeals, handle scandals, set the salary cap and TV deals, steer the rules committee and survive the vote on your term. |
| **Owner** | The owner of an NFL club | Buy a club or start an expansion team, set prices, build a stadium, hire the GM and coach, and win votes at the owners' meeting. |
| **Agent** | The head of a sports agency | Win draft prospects away from the big agencies, get them drafted high, negotiate their contracts against the clubs, and keep their trust. You earn 3% of every deal. |
| **High School Coach** | The coach of a small-town team | Develop players over four years, win on Friday nights, send your seniors to college, and move up until a college calls. |

Also on the home screen:

- **Daily challenge:** the same school and league for everyone, one season, a new one each day.
- **Scenario challenges:** nine careers that start in trouble (a scandal, an 0-12 program, cap hell, a labor war and more), each with goals and a deadline.
- **Build your own challenge**, and share it with a code.
- **Ironman:** in any mode, play with no undo, no admin tools and a locked difficulty. Choose it at the start or turn it on in Settings.

![The athletic director's office in the middle of a season](docs/img/athletic-director.png)

## What's in the game

- **Game day:** a field view where all 22 players move, with four cameras, weather, live play calling, game plans, halftime adjustments and a two-minute drill.
- **A living world:** a fan feed, a weekly pregame show, a front page, rivalry trophies, award night, record books, a Hall of Fame and league history that carries from one career to the next.
- **Front office depth:** recruiting with uncertain scouting, promises, the transfer portal, the NFL draft, the salary cap, free agency, trades, agents and one negotiation system shared by every mode.
- **Share it:** a picture of any season in your team's colors, and one tall picture of your whole career, to save or post.
- **Made for long saves:** five save slots per mode, save files you can download, a save health center, and old saves that keep loading after every update.
- **Yours to shape:** five themes, light and dark, a sidebar or top tabs, keyboard shortcuts, color-blind friendly colors, team packs with your own names and colors, and a tutorial for every mode.
- **The real 2026 season, if you want it:** an optional pack gives your school its real 2026 roster and gives every school its real 2026 schedule. It is off by default.
- **Works on a phone:** the layout fits a 390px screen.

<img src="docs/img/phone.png" alt="The home screen on a phone" width="280">

All 71 updates are in [PATCH_NOTES.md](PATCH_NOTES.md). The current version is **10.01**.

## Good to know

- **Your saves live in your browser.** Clearing site data for collegefbsim.com deletes them. Download a save file from the Save file tab to back one up or move it to another device.
- **Install it.** On a phone, open collegefbsim.com and choose "Add to Home Screen". After that it opens with no connection.
- **Leaderboards, cloud saves and the friends league are not on collegefbsim.com yet.** They need a sign-in service behind them, which is the next big item on the [roadmap](ROADMAP.md). They are switched off until then.
- **Privacy.** The site counts visits and which modes get opened, using GoatCounter. No cookies, no accounts, nothing that identifies you.

## Where it's going

[ROADMAP.md](ROADMAP.md) has the plan: what to fix first, what to improve in each mode, and what new modes and features are worth building.

## Working on the game

The game is built from the files in `src/`. `index.html` is the built result; don't edit it by hand.

```bash
npm install && npx playwright install chromium
```

```bash
npm start
```

```bash
npm test
```

`npm start` serves the game at http://localhost:8080 and rebuilds when a source file changes. `npm test` checks that the build is fresh, every mode opens, the feature and balance tests pass, and saves load; GitHub runs it on every push. [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) has the file map, how to add a feature, how to ship an update and the house rules.

Publishing is automatic: GitHub Pages serves the `main` branch at collegefbsim.com, so whatever `index.html` is on `main` is the live game.

## Disclaimer

Football Empire is an unofficial fan project. It is not affiliated with, endorsed by or sponsored by the NCAA, the NFL, any conference, any university or any professional club. Team and school names are used only to identify them. Stadiums, capacities and colors are approximations, and all ratings, salaries, budgets and results are simulated. The optional real 2026 pack contains player names and schedules taken from public rosters; it contains no ratings, and every rating shown in the game is the game's own estimate.
