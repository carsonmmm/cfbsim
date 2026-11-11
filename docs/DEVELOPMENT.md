# Developing Football Empire

This is the developer guide. For what the game is, see the [README](../README.md); for where it is going, see the [roadmap](../ROADMAP.md).

## What's in the repository

| Path | What it is |
|---|---|
| `index.html` | **The game.** The whole site in one file. GitHub Pages serves it at collegefbsim.com. |
| `PATCH_NOTES.md` | Every patch note, newest first, exported from the game. |
| `build.sh` | Rebuilds `index.html` from `source/`, then checks the JavaScript syntax. |
| `source/base_v947.html` | The v9.47 game. Every build starts from this file. |
| `source/edits.py` | Exact text replacements applied to the base file (75 of them, patch notes included). |
| `source/modules/*.js` | The code added since v9.47. Modules are appended in name order, before the final `</script>`. |
| `tests/` | Automated checks that run the game in a headless browser (Playwright). `npm test` runs the main ones. |
| `.github/workflows/ci.yml` | Runs `npm test` on every push and pull request. |
| `favicon.svg`, `404.html`, `robots.txt`, `sitemap.xml`, `docs/img/` | Site extras: the tab icon, the not-found page, search engine files and images. |

`index.html` and the base file can each be opened on their own. Everything else is only needed if you change the code.

## Two ways to make changes

1. **Use the build (what this repository expects).** Add a module or a new edit, then run `./build.sh`. This keeps each update in its own small file, which is easier to review and undo. It's also how every update from 9.48 to 9.52 was made.
2. **Edit `index.html` directly.** It's a normal HTML file with one big `<script>`. The catch: the next `./build.sh` overwrites direct edits, and `npm test` fails until `index.html` matches `source/` again. Avoid this unless you are retiring the build.

## Building

Needs Python 3 and Node.js.

```sh
./build.sh          # prints "ok 75 edits" and "SYNTAX-OK"
```

- **New module:** add `source/modules/C3_whatever.js`. Name order decides load order, so a later letter or number loads after the modules it depends on.
- **New edit:** add `e("exact old text", "new text")` in `source/edits.py`, above `def apply`. The old text has to match exactly once in the base file, or the build stops with `EDIT FAILED`. Remember that edits match against the **v9.47 base**, not the current game.

## Testing

Needs Node.js and Playwright (`npm install` then `npx playwright install chromium`).

```sh
npm test                                # build is fresh, every mode opens, saves load; this is what CI runs
node tests/run.js tests/smoke.js        # opens every mode; expect "errs":[] and "ok" for each
node tests/persist.js                   # old saves still load in the new build
node tests/inbox.js                     # inbox and "decisions first"
node tests/run.js tests/rec4.js 80 307  # an elite recruit's offers each year (args: attributes, seed)
node tests/run.js tests/rec5.js         # repairing a save that has no offers, college-path offers
node tests/run.js tests/own1.js         # Owner mode engine paths (own3–own7 cover the rest)
```

- **Two kinds of test file:**
  - Files run through `tests/run.js` are bodies that run inside the page, so they can call game functions directly. Arguments arrive as `ARGS`.
  - Files run with plain `node` are standalone scripts.
- **Testing another build:** set `GAME=/path/to/file.html` before `node tests/run.js …`.

## How the code is organized

**Modes**
- **Athletic Director and Coach (college):** the game lives in `state`. `state.kind` is `undefined` (AD), `'coach'`, `'comm'` (Commissioner) or `'owner'`.
- **NFL modes:** `state.lvl === 'nfl'`.
- **Player Career:** a separate object, `cs`. The page renders with `appMode === 'career'`, and the current tab is `cui.tab`.
- **Extra save data:** `X()` (stored in `state.x`) and `CX()` (stored in `cs.x`). New features keep their data here so old saves stay valid.

**Changing behavior**
- **Wrapping a function:** functions written as `function name() {}` can be wrapped by reassigning them:
  ```js
  { const _f = name; name = function () { const r = _f.apply(this, arguments); /* extra */ return r; }; }
  ```
  `const name = () => …` arrow functions can't be wrapped this way. Change those through `edits.py`.
- **Buttons:** clicks are routed by `data-act="name"`, which runs `actions.name(dataset)`. Register new buttons with `Object.assign(actions, { … })`.
- **After every render:** `qolAfterRender()` runs. The inbox module wraps it to move decisions to the top.
- **Balance:** `balOn()` is true when the Updated balance setting is on.

**Saving and patch notes**
- **Old saves:** saves are checked on load. That happens in `checkPro` and `cValidate`, and in `cSettle()` for careers. Anything new should read old saves without the new fields and fill in defaults.
- **Patch notes:** they live in the `PATCH_NOTES` array, newest first. The version shown in the game is `PATCH_NOTES[0]`. To add one, insert a `{ v: '9.53', t: 'Title', n: ['…'] }` entry before the 9.52 entry (see the last `e(...)` in `edits.py`).

## Where the code for each mode is

| Area | Where |
|---|---|
| Owner mode (9.48) | `modules/00_core.js` … `90_home.js` |
| Owner mode expansion and removals (9.49) | `modules/B0_remove.js` … `B9_hooks.js` |
| Main tabs plus More menu, "Needs your attention", guided first season, glossary, folding tables on phones (9.50) | `modules/C0_design.js` |
| Inbox opens the right page, decisions move to the top (9.51) | `modules/C1_inbox.js` |
| Recruiting fixes (9.52) | `modules/C2_recruit.js` |
| Player Career recruiting engine | base file: `startRecruiting`, `recruitTick`, `schoolInterest`, `canOffer`, `offersList`, `doVisit`, `commitTo`, `portalRound` |

## House rules used so far

- **Keep:**
  - Old saves must keep loading.
  - Features stay unless you approve removing them.
  - The design stays: 5 themes, light and dark, sidebar or top tabs, and a layout that works on a 390px phone.
- **Rosters:** teams outside Michigan use fictional rosters.
- **Every update:** add a patch note, run the smoke and persist tests, and check the phone layout.
- **When asking Claude for an enhancement:** attach `index.html`. The whole zip is better if you want the work done through the build. Say which modes it applies to.
