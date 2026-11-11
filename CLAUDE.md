# Football Empire

A single-page college football and NFL sim, served by GitHub Pages at collegefbsim.com. Read `docs/DEVELOPMENT.md` before changing anything; it has the file map and the house rules.

- **Edit `src/`, never `index.html`.** `index.html` is built: `node build.js`. Commit the rebuilt file with the source change.
- **Run `npm test` before every commit.** It needs Playwright; Chromium is already installed in cloud sessions, so do not run `playwright install` there.
- All of `src/js` is one global scope joined in file-name order. New features go in a new numbered file.
- Old saves must keep loading. New save data goes in `X()` (`state.x`) or `CX()` (`cs.x`) and must be optional.
- Changes players can see need a patch note at the top of `src/js/210-patch-notes.js`, then `npm run notes`.
- Every screen must fit a 390px-wide phone with no sideways scroll.
- Lines in `src/js` are long. Search with `grep -n -o '.\{0,80\}pattern.\{0,80\}'` and cut the output, and replace exact strings instead of rewriting lines.
- Write player-facing text in plain words, the way the existing patch notes read.
