# Developing Football Empire

For what the game is, see the [README](../README.md). For where it is going, see the [roadmap](../ROADMAP.md).

## The one rule

**Edit files in `src/`, then run `node build.js`.** `index.html` is the built game that GitHub Pages serves. Never edit it by hand: the next build overwrites it, and `npm test` fails until it matches `src/` again.

## Everyday commands

Needs Node.js 20 or newer. The tests also need Playwright (`npm install`, then `npx playwright install chromium`).

| Command | What it does |
|---|---|
| `npm start` | Serves the game at http://localhost:8080 and rebuilds whenever a file in `src/` changes. |
| `npm run build` | Builds `index.html` from `src/` and checks that the JavaScript parses. A syntax error is reported with its source file and line. |
| `npm test` | Everything GitHub checks on each push: the build is fresh, every mode opens, the feature tests and balance guardrails pass, the patch notes file is current, saves load. About 20 seconds. |
| `npm run notes` | Rewrites `PATCH_NOTES.md` from the patch notes in the game. |
| `npm run balance` | Plays about 30 college and 24 NFL seasons on autopilot and writes `docs/balance.html`, the balance dashboard. Add `-- --big` for five times as many. |

## What's in the repository

| Path | What it is |
|---|---|
| `index.html` | **The built game.** Generated. GitHub Pages serves it at collegefbsim.com. |
| `src/head.html`, `src/body.html`, `src/tail.html` | The page around the code: meta tags, the empty page skeleton, the closing tag. |
| `src/css/*.css` | Styles, joined in name order. |
| `src/js/*.js` | The game, joined in name order into one script. The number at the front of each name is its load order. |
| `build.js` | Joins `src/` into `index.html`. |
| `sw.js`, `manifest.webmanifest` | The installable app: offline loading and the home-screen icon. |
| `tests/` | Automated checks that run the game in a headless browser. `tests/fixtures/v947.html` is an old build used to prove old saves still load. |
| `scripts/` | `serve.js` (local server), `patch-notes.js` (writes `PATCH_NOTES.md`), `make-save-fixture.js` (saves one career of every kind for the tests), and `fetch-real-data.js` and `build-real-pack.js` (the real pack). |
| `packs/real-2026.json` | The optional real pack: rosters and the schedule. Generated; fetched by the game only when a player turns it on. |
| `data/real/espn-teams.json` | Which team in the data feed is which school in the game. |
| `.github/` | The check that runs on every push, plus pull request and issue templates. |
| `favicon.svg`, `404.html`, `robots.txt`, `sitemap.xml`, `docs/img/` | Site extras. |

## Where the code is

All of `src/js` shares one global scope, exactly as if it were one file. A file can use anything defined in a file with a lower number, and anything at all from inside a function that runs later.

| Files | Area |
|---|---|
| `010` to `050` | League data, the game engine, season systems, team systems |
| `060`, `140`, `280` | Commissioner: classic rules, the engine, the screens |
| `070` | Saving: slots, the save queue, import and export |
| `080`, `260` | Coach mode: engine and screens |
| `100` to `120`, `230`, `250`, `430` | Player Career: engine, games, the NFL, screens, actions, recruiting fixes. `230` also draws the Home screen. |
| `130`, `270`, `370` | NFL front office (general manager and NFL coach): engine, screens, roster cuts |
| `150` to `180`, `320` to `350` | Features added across versions 9.12 to 9.45 and their pages |
| `190`, `200` | Rendering every page, and the field view |
| `210` | Patch notes |
| `240` | Button actions, keyboard input, start-up |
| `300` | Sharing: leaderboards, challenges, cloud saves (needs a host that provides them) |
| `310`, `410`, `420` | Quality of life, navigation and "Needs your attention", the Inbox |
| `360` | Tutorials |
| `380` to `400` | Owner mode |
| `440` | Fantasy draft start |
| `450` | Ironman careers (every mode) |
| `460` | The website: offline app, storage note, visit counting |
| `470` | The share-your-season picture |
| `480` | NFL season recaps, recap pictures, the career timeline picture, feedback links |
| `490` | Travel and altitude, injury decisions, the alumni network |
| `500` | The nemesis, and scandals you can cause |
| `510` | Player stories, and conference raids and invitations |
| `520` | Recruiting class and draft class files |
| `530` | The shell for the self-contained modes: saves, header, tabs, Home cards (`appMode === 'mini'`, the game is `mm`) |
| `540` | Agent mode |
| `550` | High School Coach |
| `560` | Coach mode: running your staff, interim promotions, the job market |
| `570` | The optional real 2026 pack: loading it, real identities on your roster, the real schedule |
| `580` | Staff moves for an AD and a head coach: promotions from within, interims at every job, the assistant head coach |
| `590` | Player Career two-way players: weekly plan, fatigue, split training, coach trust, schools, awards, draft and NFL packages (`cs.x.tw`) |

## How the game is put together

**Modes**
- **Athletic Director and Coach (college):** the game lives in `state`. `state.kind` is `undefined` (AD), `'coach'`, `'comm'` (Commissioner) or `'owner'`.
- **NFL modes:** `state.lvl === 'nfl'`. The league is `state.pro`, read through `PS()`.
- **Player Career:** a separate object, `cs`. The page renders with `appMode === 'career'`, and the current tab is `cui.tab`.
- **Agent mode (and any other self-contained mode):** a separate object, `mm`, with `mm.kind` naming the mode. The page renders with `appMode === 'mini'` and the current tab is `mui.tab`. A mode registers itself in `MINI` (see the top of `530-mini-shell.js`), and the shell gives it saves, a header, tabs and a Home card. These modes do not use the college and NFL engine and must not read `state`.
- **Extra save data:** `X()` (stored in `state.x`) and `CX()` (stored in `cs.x`). New features keep their data here so old saves stay valid.
- **College and the NFL are separate worlds.** When a career moves between them, everything in `state` is set aside except the keys in `WORLD_SHARED` (`130-nfl-engine.js`). `state.x` is set aside too. Data that must follow the person, like the nemesis (`state.nem`) and Ironman (`state.iron`), goes in its own key that is added to `WORLD_SHARED`.

**Adding to the game**
- **A new feature gets a new file** with the next number, for example `src/js/480-my-feature.js`. Start it with a comment that says what it does and where its data lives.
- **Buttons:** clicks are routed by `data-act="name"`, which runs `actions.name(dataset)`. Add yours with `Object.assign(actions, { … })`.
- **Adding to an existing function from your new file:** functions written as `function name() {}` can be wrapped:
  ```js
  { const _f = name; name = function () { const r = _f.apply(this, arguments); /* extra */ return r; }; }
  ```
  `const name = () => …` can't be wrapped. Edit those where they are defined.
- **Changing existing behavior:** edit the function where it lives. That is the point of having plain source files.
- **After every render:** `qolAfterRender()` runs.
- **Forms must not redraw the page on every change.** `render()` replaces the page, so the cursor leaves the form and the next field typed into loses its text. Save the value, then bring the other fields up to date in place (`admInPlace` in `220-admin.js` does this for the admin panels).
- **In Coach mode, your own entry on the staff is a copy.** `syncMe()` rebuilds it from `state.co`. Anything that should change the coach has to change `state.co`.
- **Which tabs show:** `tabVisible(k)` in `190-render.js`.
- **Balance:** `balOn()` is true when the Updated balance setting is on.

**Saving**
- Saves are compressed and kept in the browser's `localStorage`, five slots per set. The AD set (`mfad-`) also holds general manager, commissioner and owner careers; Coach (`fecoach-`) and Player Career (`mfpc-`) have their own.
- Saves are checked on load in `checkPro`, `cValidate` and `cSettle()`. Anything new must read an old save that lacks the new fields and fill in defaults.

## Tests

`npm test` runs `tests/check.js`. To run one test by hand:

```sh
node tests/run.js tests/smoke.js          # every mode opens and every tab draws
node tests/run.js tests/home.js           # the Home screen
node tests/run.js tests/fantasy-draft.js  # the fantasy draft start
node tests/run.js tests/ironman.js        # Ironman careers
node tests/run.js tests/recap.js          # season recaps, the career timeline picture, feedback links
node tests/run.js tests/world.js          # travel, injury decisions, the alumni network
node tests/run.js tests/rivals.js         # the nemesis and scandals
node tests/run.js tests/stories.js        # player stories and realignment
node tests/run.js tests/classfiles.js     # recruiting class and draft class files
node tests/run.js tests/agent.js          # Agent mode: twelve years played by a simple strategy
node tests/run.js tests/hscoach.js        # High School Coach: fifteen seasons, the recruiting link and the college job
node tests/run.js tests/coachjobs.js      # Coach mode: hiring and firing as head coach, interim promotions, the job market
node tests/run.js tests/staffmoves.js     # promoting from within, interims at every job, the assistant head coach
node tests/run.js tests/twoway.js         # Player Career two-way players, through a full career
node tests/run.js tests/balance.js        # seasons on autopilot stay in a believable range
node tests/realpack.js                    # the real 2026 pack file, and a career started with it
node tests/admin.js                       # the admin panels, typed into with a real keyboard and mouse
node tests/saves.js                       # every saved career in tests/fixtures opens, draws and plays on
node tests/contrast.js                    # text contrast in all five themes, light and dark
node tests/persist.js                     # saves from the v9.47 build load in this one
node tests/inbox.js                       # the Inbox and "decisions first"
```

- **Files run through `tests/run.js`** are the body of a function that runs inside the game page, so they call game functions directly. Arguments arrive as `ARGS`. New ones should return `{ fail: [] }` with one line per problem, and be added to the list in `tests/check.js`.
- **Files run with plain `node`** are standalone scripts.
- **Testing another build:** set `GAME=/path/to/file.html` before `node tests/run.js …`.
- `run.js` blocks network requests, so web fonts are missing in test screenshots.
- The other files in `tests/` (`own*.js`, `rec*.js`, `coach.js`, `career.js`, `tabs.js`, `shot.js`) are probes from earlier updates. They print results for a person to read and are not part of `npm test`.

## Shipping an update

1. Make the change in `src/` on a branch.
2. Add a patch note at the top of the list in `src/js/210-patch-notes.js`: `{ v: '9.54', t: 'Title', n: ['…'] }`. The version shown in the game is the first entry. Then run `npm run notes`. Skip this for changes players can't see.
3. Run `npm test`.
4. For a version that changes what a save holds, run `node scripts/make-save-fixture.js` and commit the new file in `tests/fixtures/`. From then on every build must load those careers.
5. Open a pull request. The check runs by itself.
6. Merge into `main`. GitHub Pages publishes `main` to collegefbsim.com within a minute or two.

## The real pack

`packs/real-2026.json` is built in two steps, and both need network access to `site.api.espn.com` (the cloud environment named `cfbsim` allows it):

```sh
node scripts/fetch-real-data.js 2026 --fresh   # downloads every roster and schedule into data/real/cache/ (not committed, about 120 MB)
node scripts/build-real-pack.js 2026           # writes packs/real-2026.json and prints anything odd it found
```

The pack holds names, positions, classes, numbers, sizes, hometowns and the schedule. It holds no ratings. In the game (`570-real-pack.js`) each real player takes over a generated player at his position, so a school plays at the same strength with or without the pack; `tests/realpack.js` checks that. To refresh rosters during the season, run both steps again and commit the new pack. For a new season, run them with the new year, then change `REAL.url` and the wording in `570-real-pack.js`.

Things the builder does that are worth knowing: a school outside the game's 138 becomes an `FCS:Name` opponent; late-August "Week 0" games and Army-Navy are moved to a week when both schools are otherwise off, moving one other game if it has to; players listed as DL or DB are split by weight; and one school's linemen, filed in the feed as linebackers, are moved to the line by weight.

## The balance dashboard

`npm run balance` writes `docs/balance.html`: wins by team rating, how often the better team wins by rating gap, scoring, how many games NFL clubs win, and what a draft pick is worth, each with the real-world figure to compare against where there is one. Run it after any change to the game engine, read it, and commit the new page with the change so the history of the file is the history of the game's balance. It is published at collegefbsim.com/docs/balance.html and is not linked from the game.

## Visit counting

On, using GoatCounter (the dashboard is at carsonm.goatcounter.com). The site code is `SITE.goatcounter` at the top of `src/js/460-site.js`; an empty string turns it off. It uses no cookies. It counts page views, which modes are opened (`play-ad`, `play-gm` and so on) and finished seasons (`season-ad` and so on). It only runs on collegefbsim.com, never on a local copy.

## Online features

Leaderboards, posting scores, cloud saves, the friends league and tutorial sync are all behind one switch: `ONLINE` at the top of `src/js/300-sharing.js`. It is `false`, so they are hidden everywhere and nothing is sent or fetched. The code is still there for the day the site has its own sign-in and database.

## House rules

- Old saves must keep loading.
- Features stay unless the owner approves removing them.
- The design stays: five themes, light and dark, sidebar or top tabs, and a layout that works on a 390px phone.
- Teams outside Michigan use fictional rosters. Real players never get negative traits or off-field storylines.
- Every update players can see gets a patch note.
