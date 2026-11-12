# Football Empire roadmap

A plan for where to take the game next. It started as a full review of version 9.52 (the modes, the home screen, the save system, the code and the site at collegefbsim.com) and is updated as items ship.

**The short version:** the game already has more features than most players will ever find. The biggest gains now are not more features. They are (1) fixing what is broken or missing on the website itself, (2) helping new players find the good parts, and (3) a small number of new modes that reuse systems you already built.

Effort: **S** is a day or less, **M** is a few days, **L** is a week or more.

## Status

**Versions 9.53 and 9.54 shipped the first round.** Done:

- The build: plain source files in `src/` joined by `build.js`. The patch-against-v9.47 build is gone.
- Tests on every push: every mode opens, feature tests, balance guardrails, saves load.
- Home screen: a Continue card, quick picks for new players, a card for NFL General Manager, six cards in an even grid, scenarios folded away, no stale "NEW" labels.
- Fantasy draft start for general managers.
- Ironman careers in every mode.
- Share your season: a picture in team colors.
- Installable and playable offline.
- A storage note on the Save file page, and the game asks the browser to keep saves.
- Every online feature (leaderboards, posting scores, cloud saves, the friends league) is switched off behind one switch until the site has its own sign-in.
- Visit counting is on, through GoatCounter, on the live site only.
- A contrast check of all five themes in light and dark, with the faint spots fixed, and a test that loads one saved career of every kind on each build.
- Search and link-preview tags, an icon, a not-found page, a sitemap, the page language.

**A correction to my first review.** I wrote that saves could run out of room at about 5 MB. I had measured the save before it is stored. Saves are compressed: a six-season athletic director save takes 134 KB, so the limit is roughly 35 long careers away. Moving saves to a different kind of storage is not needed, and I did not do it. The storage note covers the rare case.

## The build list

Fourteen features chosen by the owner, grouped into batches so each update stays small enough to test well. One batch is one update. All seven batches are done as of version 9.61. The game becomes **version 10.00, "A New Beginning"** when the owner says so; there may be more to add first, so updates keep the 9.x numbers until then. Check each against what is already in the game before building; some may partly exist.

| Batch | Feature | What it is | Effort | Status |
|---|---|---|---|---|
| 1 | **Feedback button** | A button on the Home screen and in Settings that opens a pre-filled report with the version, mode and device. | S | Done in 9.55 |
| 1 | **Season recap** | One page per finished season: the record, how it ended, the best win, the worst loss, awards and the biggest decision, with a picture to share. | S | Done in 9.55 |
| 1 | **Career timeline picture** | One tall picture of a whole career, season by season, built for posting. | S | Done in 9.55 |
| 2 | **Alumni network** | Former players send recruits your way, donate, or come back as assistants. | S | Done in 9.56 |
| 2 | **Weather and travel** | Long road trips, altitude and cold-weather games nudge results, so scheduling becomes a real decision. | S | Done in 9.56 |
| 2 | **Injuries with a human cost** | A medical-retirement decision, and a player who rushes back for the big game and pays for it later. | S | Done in 9.56 |
| 3 | **Rival AI** | One rival athletic director or general manager who is the same person for your whole career, with a personality and a memory: poaches your coordinators, flips your recruits, talks about you in the press. | M | Done in 9.57 |
| 3 | **Scandals** | Ones you can cause: the under-the-table deal, the hidden injury, the suspended star who plays anyway. Bigger short-term gains, with an investigation that may or may not find it. | M | Done in 9.57 |
| 4 | **Player stories** | One page per person that follows them across modes: the recruit you signed as an AD, drafted as a GM, hired as a coach. | M | Done in 9.58 |
| 4 | **Conference realignment** | Conferences raid each other over the years, and your school gets invitations with real money and travel trade-offs. | M | Done in 9.58 |
| 5 | **Draft class and recruiting class files** | Import and export classes as files, so players can make and trade their own. | S | Done in 9.59 |
| 5 | **Balance dashboard** | A page built by the tests that charts hundreds of simulated seasons: wins by rating, scoring, upsets, draft outcomes. For the developer, not players. | M | Done in 9.59 |
| 6 | **Agent mode** | Represent players. Sign recruits and draft prospects as clients, negotiate their NIL and NFL contracts against the GMs, manage holdouts, build an agency. Built on the shared negotiation system. | L | Done in 9.60 |
| 7 | **High school coach** | Start in a small town, develop players who then show up as recruits in the college world, and get noticed by colleges. | L | Done in 9.61 |

## Still open from the first review

| # | Problem | Why it matters |
|---|---|---|
| 1 | **Online features have no home on collegefbsim.com.** The daily challenge leaderboard, cloud saves and the friends league only work when the game is opened inside claude.ai. They are hidden on your domain now, not fixed. | The daily challenge has little pull without a leaderboard. This is Phase 2. |
| 2 | **Commissioner, Owner and General Manager share the five AD save slots.** | Confusing, and five slots across four kinds of career is tight. Changing it means moving existing saves, so it needs its own careful update. |
| 3 | **Athletic Director has 39 tabs**, the NFL has 37. The More menu hides them but does not reduce them. | Features get lost. Several tabs are different views of the same thing (feed, front page, pregame show, reels). |
| 4 | **Real names carry legal risk.** The game uses real school names, real NFL club names and the real Michigan roster. | Usually tolerated while a fan game is free. Real player names are the riskiest part, and all of it becomes a real problem the day you add ads or payments. Talk to a lawyer before monetizing. |
| 5 | **The fantasy draft is for general managers only.** | Owners who act as their own GM will ask for it. |

## Phase 1: finish the foundation

| Item | What to do | Effort |
|---|---|---|
| **Read the visit numbers** | After a couple of weeks, look at which modes get opened and how many seasons get finished, and reorder this roadmap around what you see. | S |
| **Own save slots for General Manager, Commissioner and Owner** | Give each its own set of five. Existing saves stay where they are; new ones go to the new sets. | M |
| **Accessibility, the rest** | Contrast is checked on the Home screen and the Office in every theme. Still to do: the same check on more pages, focus order in dialogs, and screen reader announcements for live game events. | M |

## Phase 2: bring the online features home

Everything social in the game (leaderboards, cloud saves, friends league, shared challenges) is already written. It only needs a backend that works on your domain.

| Item | What to do | Effort |
|---|---|---|
| **A backend of your own** | The sharing code is in one file (`src/js/300-sharing.js`) and already talks to a document database in the collection-and-document style that **Firebase Firestore** uses. So my recommendation changed from Supabase to Firebase: its free tier covers this, it includes sign-in, and the existing calls map onto it almost one for one. This needs a Firebase project that you create. | M |
| **Sign-in** | Optional, never required to play. Email link or Google. Signing in turns on cloud saves and puts your name on leaderboards. | M |
| **Daily challenge leaderboard** | The daily challenge already gives everyone the same school and league. With a leaderboard it becomes the reason to come back each day. Add a weekly and an all-time board. Validate scores on the server, or expect cheating. | M |
| **More share cards** | The season picture is done. Add the same for draft night, a Heisman, a Hall of Fame induction and a Player Career. Every share is an ad for the site. | S |
| **Friends league, then online leagues** | Turn the friends league back on first. Later, grow it into commissioner-run online leagues where each friend runs a program in the same world and the week advances when everyone is ready (or on a timer). | L, then L |

## Phase 3: new modes and features

Listed in the order I'd build them. Each reuses systems that already exist.

### New ways to play

| Idea | What it is | Why it's worth it | Effort |
|---|---|---|---|
| **Fantasy draft for owners** | The general manager version is done. Offer it when an owner buys a club or starts an expansion team. | Owners who act as their own GM will want it. | S |
| **Start at the bottom** | Begin as AD or coach at an FCS school (the game already has FCS teams as opponents) and earn the move up to FBS: stadium size, budget, results. | Gives the college modes a real "climb" story, the way Coach mode has a ladder. | L |
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
- **Team packs gallery:** team packs and custom challenges already export to a file or code. A page on the site where players post and download them would make the game feel alive between updates.

## Phase 4: keep the code easy to change

| Item | What to do | Effort |
|---|---|---|
| **Fold the wrappers in** | Later updates added behavior by wrapping older functions from a new file. Now that the source is plain files, move each wrapper's code into the function it wraps, a few at a time, with `npm test` after each. | M |
| **More balance tests** | The guardrails cover wins and scoring for an AD and a GM. Add coach promotions, Player Career draft position and recruiting offers, which were all fixed by hand in 9.47 and 9.52. | M |
| **Preview builds** | Publish every pull request to a preview address so you can play a change on your phone before it goes live. | S |
| **Decide the names question** | Before any monetization: get advice on school names, club names and the Michigan roster. A safe fallback is fictional names by default with real names available as a team pack the player loads. | S |

## Suggested order

1. **Now:** the build list above, one batch at a time.
2. **Alongside:** read the visit numbers after a couple of weeks and reorder the batches around which modes people actually play.
3. **When you are ready for online features:** the Firebase backend, then the daily leaderboard.
4. **In the background:** Phase 4.

## What I'd hold off on

- **More tabs in existing modes.** The modes are deep enough; new pages add to the finding problem.
- **Real-time multiplayer.** Turn-based online leagues give most of the fun for a fraction of the work.
- **A native phone app.** The installable web version, which is done, gets you the home-screen icon and offline play with no app store.
- **Ads or payments,** until the names question is settled.
