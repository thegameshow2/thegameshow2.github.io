# Game Show Buzzer Project: Handoff Summary
Updated Sunday, 22 Nov 2026, after the code cleanup pass. Attach this file plus the project files to a new chat.

## 1. Purpose
A trivia game show you host with friends. The host runs a control panel, a big-screen page (TV or projector) shows the board and animations, and players use their phones as buzzers, joining by QR code. First buzz wins and the others are locked out. The host rewards or penalizes points.

Modular site, two game types chosen per board in the editor:
- **Jeopardy board:** categories x point tiles. Each clue is text, an image or an audio clip.
- **Tier ladder:** tiers (e.g. Easy, Hard), each with many levels. A level has several clues (text, image, audio) revealed one at a time. Reward shrinks as more clues are shown (hint decay), or all clues show at once. Each tier has its own reward and penalty.

## 2. Stack
- Static site: plain HTML + vanilla JS ES modules + CSS. No build step. Hosted on GitHub Pages.
- Firebase Realtime Database (live state, board library) and Firebase Auth (email/password, host only). SDK 10.12.2 from gstatic CDN.
- `qrcode-generator` 1.4.4 (cdnjs) for the join QR. Font Outfit (Google Fonts `<link>` in each page's head).
- Sounds are synthesized with the Web Audio API (no audio files).

## 3. Files
| File | Role |
|---|---|
| `index.html` | Big-screen display (also the repo front page). Needs `?room=` from the host's link. |
| `host.html` | Host control panel (login). |
| `play.html` | Player phone page. |
| `editor.html` | Board editor (login). |
| `ui.js` | **Pure helpers, no Firebase, no game modes:** `esc arr gridKeys setHtml dot audioHtml bindAudio parseKey byNum byScore nextNum sleep TEAM_COLORS`. |
| `modes/index.js` | **Game-mode registry + the interface every mode implements** (documented at the top of the file). Exposes `MODES, modeOf, norm, publicBoard, tileKeys, worth, penaltyOf, answerOf, paintBoard`. |
| `modes/jeopardy.js`, `modes/tier.js` | One self-contained file per game mode: data shape, public copy, picking a clue, scoring, board drawing, big-screen header, editor forms. |
| `common.js` | Firebase init, `room`, `R(path)` (room ref), `LIB(path)` (library ref), `$`, `hostLogin(onUser)`, `COUNT_STEP`, `BUZZ_DELAY`. Re-exports `ui.js` and `modes/index.js`, so pages import from `common.js` only. |
| `sound.js` | Synthesized effects: `sfx(name)`, `SFX` (on/volume), `ctx`. Optional `CUSTOM` file overrides. |
| `config.js` | Firebase web config (placeholders in any copy I give you; **keep your real one in the repo and never overwrite it**). |
| `style.css` | All styling, one consolidated file with sections and colour tokens. |
| `data/board.json` | Sample Jeopardy board to import from the editor. |

URLs: host `.../host.html`, editor `.../editor.html`, display `.../index.html?room=CODE` (link on the host panel), players scan the QR.

## 4. Firebase data model (unchanged)
- `library/boards/{id}`: `{name, type ("tier" or Jeopardy), categories[], decay, allAtOnce, levelNames}`
  - Jeopardy category: `{name, clues:[{value, question, answer, type, media}]}`
  - Tier: `{name, points, penalty, clues:[level]}`, level: `{name, answer, items:[{type: text|image|audio, v}]}`
  - `decay` = % of reward lost per extra clue (default 10).
- `library/media/{id}`: uploads as base64 data URLs (images shrunk to 900px, audio <= 1.5 MB). `library/room`: host's last room code.
- `rooms/{room}/`: `players/{id}` `{name,num,score,team}`, `teams/{id}` `{name,color}`, `teamsOn`, `requests/{id}`, `board` (public copy, no answers), `boardId`, `used/{key}`, `clue` (key = `catIndex-clueIndex`), `media/{id}`, `buzz {open,winner,out{}}`, `timer`, `result`, `start`.
- Rules: `library` readable/writable only by the host UID; `rooms` open (phones join without login).

## 5. How the code is organised
**Core vs mode.** The core never asks which mode is running; it calls hooks on `modeOf(board)`. Core (same for every game): rooms, players, teams, scores, join requests, buzzers, answer timer, CORRECT/WRONG + leaderboard, winner screen, sounds, media upload, host login. Mode (changes per game): board data shape, what the room may see, what a clue is, scoring/hints, board drawing, clue header, editor forms.

**Adding a game mode:** (1) copy `modes/jeopardy.js` to `modes/<name>.js` and change what you need, (2) `import` it and add it to `MODES` in `modes/index.js`. Nothing else changes: the editor gets a "New <label>" button and its option inputs, the host/display/editor board lists show it, and a missing hook is reported in the browser console on load. A board's `type` field selects its mode (no type = jeopardy). Still shared by modes: boards are `categories[].clues[]`, clues carry `items:[{type,v}]` for media, tile keys are `"i-j"`. A mode with a different shape can override `tileKeys`/`answer` and provide its own editor `head/entry`.

**Not yet modular (needed for "answer on phones" modes):** the phone page (`play.html`) always shows only the buzzer. Planned hook: optional `phone: { render(clue, me, api) }` on a mode, called from `play.html` for `clue.mode`, plus a `rooms/{room}/answers` node.

- **Same board markup everywhere:** `paintBoard(el, board, used, host, lock)` delegates to `mode.renderBoard`, for the host panel (buttons) and the display (divs).
- **No needless DOM churn:** `setHtml(el, html)` only touches the DOM when the markup changed, so re-renders don't flicker or reset audio.
- **Timing link:** the display's 3-2-1 uses `COUNT_STEP`; the host opens buzzers after `BUZZ_DELAY = 3*COUNT_STEP + 300`. Both live in `common.js`, so they can't drift apart anymore.
- **Display (`index.html`):** `TIME` block = animation timings. Sections: live data, answer timer, result + leaderboard, winner screen, clue panel (`runCount`, `fit`, `items`), scoreboard.
- **Host (`host.html`):** the board click handler calls `mode.pick`, "Next clue" calls `mode.reveal`; `result/penalize/done` for scoring, `watchTimer` (panel must stay open for the timer), teams, join requests.
- **Editor:** generic shell (`category`, `draw`, drag/drop, uploads) that asks the mode for `head`, `entry`, `options`, `newCategory`, `newEntry`, `action`; every input carries `data-c/q/i/f` telling the single `input` handler which field it edits. Unsaved-changes guard.

## 6. Decisions (unchanged)
Firebase + GitHub Pages; login only for the host; display and phones never get answers; no Firebase Storage (uploads are base64 in the DB); one default room `main`; join approval is a convenience, not security; phones don't show the question; hint decay lowers only the reward; timeout = wrong answer. Style: dark violet aurora, glass cards, Outfit; reward green, penalty red; team colour dots.

## 7. Setup recap
Firebase: Realtime Database + Auth (email/password) -> create host user -> rules with the host UID -> web config into `config.js` (with `databaseURL`). Upload all files to the repo root, enable Pages. First run: editor -> import `data/board.json` or create a board -> host -> Load board -> open the display link -> players scan the QR.

## 8. What the cleanup pass changed
Bugs fixed:
- The player who buzzed first **disappeared** from the host player list and the display scoreboard (the `.win` class was also the winner-screen class). Now `.hot` / `.champ`.
- Editor: Value box stretched wide (nth-child rules broke when drag handles were added).
- Editor: switching boards or closing the tab silently dropped unsaved edits; now asks first.
- Phone: re-sending a join request could stack listeners.
- Host: the answer is no longer re-hidden every time a clue updates (e.g. Replay); only when the clue changes.
- Host: Firebase `set` could receive `undefined` for a tier without points; defaulted to 0.
- Signing out now reloads, so listeners don't stay dead after signing back in.
- `.small` text broke mid-word everywhere; now only the join URL does.

Cleanup:
- `style.css`: duplicated/overridden rules merged (ladder, flash, overlay, lbl, rt, rn, node...), dead rules and unused keyframes removed, the `--g` variable collision inside `.ladder` fixed (`--gap`), colour tokens added. Display pages render **pixel-identical** to before.
- Duplicate code removed: board rendering (host vs display), login forms, `R()`/`$` helpers, wrong-answer logic (Wrong button and timeout share `penalize`), per-page font `@import` replaced with `<link>` (faster first paint).
- Performance: unchanged markup is not re-rendered; `fit()` runs at most once per frame; clue media is copied to the room in parallel.
- Removed legacy `.pages.yml`. `data/board.json` kept as the sample.

## 8b. Mode refactor (later the same day)
Game-mode logic moved out of 4 pages into `modes/`. Public board no longer includes clue questions (they are sent only when a clue is picked). Display stays pixel-identical; a throwaway third mode was added in a test with one new file and two registry lines.

## 9. Testing note
This pass was tested in a real browser against a mocked Firebase (host + display + phone together, tier and Jeopardy boards, penalties, timer timeout, correct -> leaderboard -> winner screen, editor save/guard/collapse). It has still **not** run against the real Firebase, so on first deploy please check: sounds, teams, drag-reorder in the editor, upload of image and audio.

## 10. To do / ideas
- New mode: options shown on the phones, players pick an answer (needs the phone hook above).
- Tighter database rules for `rooms` (validate data shape).
- Unused uploaded media is never deleted from `library/media`.
- Link preview in the editor, reorder clues inside a level, phone buzz tap sound.
