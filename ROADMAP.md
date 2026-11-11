# Football Empire roadmap

A plan for where to take the game next, written after a full review of version 9.52: the five modes, the home screen, the save system, the code and the site at collegefbsim.com.

**The short version:** the game already has more features than most players will ever find. The biggest gains now are not more features. They are (1) fixing what is broken or missing on the website itself, (2) helping new players find the good parts, and (3) a small number of new modes that reuse systems you already built.

Effort: **S** is a day or less, **M** is a few days, **L** is a week or more.

## What I found

### Works well

- All five modes open and draw every tab with no errors. The automated smoke test and save test both pass.
- Simulation is fast: six full seasons as athletic director run in about one second.
- The design is consistent on desktop and on a 390px phone, with five themes, light and dark, and keyboard shortcuts.
- Old saves keep loading, and the game has a save health center and downloadable save files.
- The 9.50 and 9.51 work (main tabs plus More, "Needs your attention", the Inbox that takes you to the decision) is the right direction.

### Problems

| # | Problem | Why it matters |
|---|---|---|
| 1 | **Online features are dead on collegefbsim.com.** The daily challenge leaderboard, cloud saves, the friends league and tutorial sync only work when the game is opened inside claude.ai. On your own domain, the home screen tells visitors "Scores show up here when the game is opened from its claude.ai link." | Visitors to your site see a feature they can't use and a link to somewhere else. The daily challenge has no reason to come back without a leaderboard. |
| 2 | **Saves use browser storage with a hard limit of about 5 MB.** An AD save starts at 230 KB and grows about 45 KB a season after the first (582 KB after six seasons). With up to 15 slots across modes, a player with a few long dynasties will run out of room. | Losing a 20-season dynasty is the worst thing that can happen to a player of this kind of game. I did not check whether saves are compressed before they are stored; if they are, the limit is further away but still there. |
| 3 | **You can't see how the game is played.** There are no visit or usage numbers. | You don't know which modes people play, where they quit, or whether an update helped. Every decision below is a guess without this. |
| 4 | **The home screen is a wall.** A first-time visitor sees five mode cards, the daily challenge, nine scenarios, a challenge builder and patch notes. Three modes still say "NEW". The fifth card (Owner) sits alone on its own row. | New players have to pick a mode before they know what any of them feel like. |
| 5 | **NFL general manager is hidden.** It is a full mode, but you reach it through the last sentence of the Athletic Director card. Commissioner and Owner both "use one of your five AD save slots." | Players who only want the NFL may never find it. Shared slots are confusing. |
| 6 | **Athletic Director has 39 tabs**, the NFL has 37. The More menu hides them but does not reduce them. | Features get lost. Several tabs are different views of the same thing (feed, front page, pregame show, reels). |
| 7 | **The build is fragile.** Every update is 75 exact-text replacements against a frozen copy of version 9.47, plus appended modules that wrap older functions. | Each new update gets harder to make and easier to break. One changed line in the base breaks an unrelated edit. |
| 8 | **Real names carry legal risk.** The game uses real school names, real NFL club names and the real Michigan roster. | This is common for fan projects and usually tolerated while the game is free. Real player names are the riskiest part, and all of it becomes a real problem the day you add ads or payments. Talk to a lawyer before monetizing. |
| 9 | **No offline play and no install.** The page needs a connection to load and fetches its fonts from Google. | A single-file game is the ideal installable app. Phones are where sim games get played. |

## Done on this branch

- A README, this roadmap and a developer guide.
- The full source, build script and tests are in the repository, not only the built file.
- `npm test` and a GitHub check that runs on every push: the build is fresh, every mode opens, saves load.
- Search and link-preview tags, a page title that says what the game is, a tab icon, a preview image, a not-found page, `robots.txt` and a sitemap.
- The page now declares its language (`lang="en"`), which screen readers need.

No gameplay changed, so the version is still 9.52.

## Phase 1: fix the foundation

Do these before any new feature. Together they are about two weeks of work.

| Item | What to do | Effort |
|---|---|---|
| **Usage numbers** | Add a privacy-friendly counter (Cloudflare Web Analytics, GoatCounter or Plausible; none need a cookie banner). Record page views plus a few events: mode started, season finished, save exported. | S |
| **Hide the dead ends** | Until the online features work on your domain, hide the leaderboard text, cloud saves and the friends league there, so visitors don't see features they can't use. | S |
| **Safer saves** | Move saves from `localStorage` to IndexedDB (hundreds of MB, not 5). Migrate existing saves on first load and keep the old copy until the new one is confirmed. Ask the browser for persistent storage. Show storage used in the save health center and warn at 80%. Nudge players to download a backup every few seasons. | M |
| **Installable and offline** | Add a web app manifest and a small service worker that caches the page. Bundle the two fonts or fall back to system fonts. Players can then add the game to their home screen and play on a plane. | M |
| **Home screen** | When a save exists, lead with one "Continue" card for the most recent career. For first-time visitors, add a "Which mode is for me?" row (three questions, one recommendation). Give NFL General Manager its own card. Fold scenarios behind one "Challenges" card. Drop the stale "NEW" labels. Use a six-card grid so no card is orphaned. | M |
| **Own save slots for Commissioner and Owner** | Stop borrowing AD slots. Existing saves stay where they are; new ones get their own. | M |
| **Accessibility pass** | The page has good basics (labels, focus rings, keyboard shortcuts). Run a full audit on contrast in all five themes, focus order in dialogs, and screen reader announcements for live game events. | M |

## Phase 2: bring the online features home

Everything social in the game (leaderboards, cloud saves, friends league, shared challenges) is already written. It only needs a backend that works on your domain.

| Item | What to do | Effort |
|---|---|---|
| **A backend of your own** | The sharing code is in one section of the game and checks for its host before it does anything. Give it a second host: a hosted service with a free tier. My recommendation is **Supabase** (database, sign-in and row-level security in one, and no server to run). Cloudflare Workers with D1 is a good alternative if you'd like everything in one place with your domain. | L |
| **Sign-in** | Optional, never required to play. Email link or Google. Signing in turns on cloud saves and puts your name on leaderboards. | M |
| **Daily challenge leaderboard** | The daily challenge already gives everyone the same school and league. With a leaderboard it becomes the reason to come back each day. Add a weekly and an all-time board. Validate scores on the server, or expect cheating. | M |
| **Share cards** | After a title, a draft night, a Heisman or a fired coach, offer a "Share" button that makes a picture (team colors, record, headline) with a link back to the site. This is the cheapest growth feature available: every share is an ad. | M |
| **Friends league, then online leagues** | Turn the friends league back on first. Later, grow it into commissioner-run online leagues where each friend runs a program in the same world and the week advances when everyone is ready (or on a timer). | L, then L |

## Phase 3: new modes and features

Listed in the order I'd build them. Each reuses systems that already exist.

### New ways to play

| Idea | What it is | Why it's worth it | Effort |
|---|---|---|---|
| **Ironman** | One save, no reloading, no undo, saved after every decision. A badge on the career and its own leaderboard. | Cheap to build, and it gives your most dedicated players a reason to start over. | S |
| **Fantasy draft start** | For NFL GM and Owner: every player goes into one pool and all 32 clubs draft from scratch. | A favorite in every franchise game, and the draft-night screen already exists. | M |
| **Start at the bottom** | Begin as AD or coach at an FCS school (the game already has FCS teams as opponents) and earn the move up to FBS: stadium size, budget, results. | Gives the college modes a real "climb" story, the way Coach mode has a ladder. | L |
| **Agent mode** | Represent players. Sign recruits and draft prospects as clients, negotiate their NIL and NFL contracts against the GMs, manage holdouts, build an agency. | A sixth mode that no other football sim has, built almost entirely on the negotiation system from 9.35 and the agents from 9.46. | L |
| **Promotion and relegation** | A Commissioner option: tiers of conferences, with the bottom teams dropping and the top teams rising each year. | A "what if" that players love to argue about, and Commissioner mode already moves schools between conferences. | M |
| **Dynasty handoff** | When a career ends (retired, fired, sold), offer to continue in the same world in a different role: the retired player becomes a coach, the fired coach becomes an AD, the AD buys a club. | The shared world from 9.45 already keeps history. This makes it one long story across modes. | M |

### Improvements by mode

Check each against what is already in the game before building; with 59 updates, some may partly exist.

**Athletic Director**
- Group the 39 tabs into six hubs (Team, Recruiting, Game day, Business, League, History) with pages inside each.
- A five-year plan: set goals for facilities, budget and results, and have the board grade you against your own plan, not only wins.
- A coaching-search screen with a hot board, interviews and a bidding war with rival ADs, as one guided flow.

**Coach**
- A play-calling tendency report after each game: what you called, what worked, what the opponent expected.
- Scripted opening drives: plan your first 15 plays during the week and see how the script held up.
- Recruiting pitches that depend on the depth chart, so "you'll start as a freshman" is checked against who is actually ahead of the recruit.

**Player Career**
- More playable moments. The combine drills and training drills are the most hands-on parts of the mode; add one key play per game that you control (a third-down throw, a goal-line carry).
- Relationships that last: a coach, a teammate and a rival who follow you from college to the NFL and show up in decisions.
- Life after football: broadcasting or coaching as a short epilogue, feeding into the dynasty handoff above.

**Commissioner**
- A "state of the league" report each offseason with charts for the four meters, revenue and competitive balance, so you can see the result of your rules.
- Custom playoff and schedule formats built with a simple editor.

**Owner**
- A rival owner who bids against you for the same city, coach or stadium deal.
- A long-term franchise value chart against the league average, with the decisions that moved it marked.

**NFL General Manager**
- Let the player reorder the draft big board and set "do not draft" flags, and have the war room follow that board on autopilot.
- A trade finder: pick a player you want or want to move, and see which clubs have a fit.

### Every mode

- **Sound:** the game has only a few simple tones. Add an optional crowd, a whistle and a touchdown horn in the field view, with a mute button and off by default.
- **Compare anything:** two players, two recruits, two teams or two seasons side by side.
- **A season recap page:** one shareable page per season with the record, the best game, awards and the biggest decision. It doubles as the share card in Phase 2.
- **Team packs gallery:** team packs and custom challenges already export to a file or code. A page on the site where players post and download them would make the game feel alive between updates.

## Phase 4: make the code easier to change

This can run alongside Phase 3. It adds nothing a player sees, but every later update gets cheaper.

| Item | What to do | Effort |
|---|---|---|
| **Retire the base-plus-edits build** | Apply the 75 edits to the base once and make the result the source. Then split the single 22,000-line script into files by area (engine, each mode, UI, saves) and have a bundler (esbuild) produce the same single `index.html`. | L |
| **Balance tests** | The smoke test proves nothing crashes. Add tests that simulate 200 seasons on autopilot and check that the numbers stay in range: wins by roster strength, points per game, how often a top recruit gets no offers, how often a GM wins the Super Bowl. Versions 9.26 to 9.28, 9.47 and 9.52 were all balance fixes found by hand. | M |
| **Save format tests** | Keep a real save file from each major version in `tests/saves/` and load every one on each build. | S |
| **Preview builds** | Publish every pull request to a preview address so you can play a change on your phone before it goes live. | S |
| **Decide the names question** | Before any monetization: get advice on school names, club names and the Michigan roster. A safe fallback is fictional names by default with real names available as a team pack the player loads. | S |

## Suggested order

1. **Now:** usage numbers and hiding the dead ends (two small changes, both in Phase 1).
2. **Next:** safer saves, then the home screen.
3. **Then:** the backend, the daily leaderboard and share cards. This is the point where the game can start growing by itself.
4. **After that:** Ironman and fantasy draft (small, popular), then Agent mode or "start at the bottom" as the next headline update.
5. **In the background:** the code cleanup in Phase 4, starting with balance tests.

## What I'd hold off on

- **More tabs in existing modes.** The modes are deep enough; new pages add to the finding problem.
- **Real-time multiplayer.** Turn-based online leagues give most of the fun for a fraction of the work.
- **A native phone app.** The installable web version in Phase 1 gets you the home-screen icon and offline play with no app store.
- **Ads or payments,** until the names question is settled.
