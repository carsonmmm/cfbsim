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
| `scripts/` | `serve.js` (local server), `patch-notes.js` (writes `PATCH_NOTES.md`) and `make-save-fixture.js` (saves one career of every kind for the tests). |
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

## How the game is put together

**Modes**
- **Athletic Director and Coach (college):** the game lives in `state`. `state.kind` is `undefined` (AD), `'coach'`, `'comm'` (Commissioner) or `'owner'`.
- **NFL modes:** `state.lvl === 'nfl'`. The league is `state.pro`, read through `PS()`.
- **Player Career:** a separate object, `cs`. The page renders with `appMode === 'career'`, and the current tab is `cui.tab`.
- **Extra save data:** `X()` (stored in `state.x`) and `CX()` (stored in `cs.x`). New features keep their data here so old saves stay valid.

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
node tests/run.js tests/balance.js        # seasons on autopilot stay in a believable range
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
