# Module `60-formats` — match-format extras

Files: `src/css/60-formats.css`, `src/js/60-formats.js`, `src/test/60-formats.js` (41 assertions, `./test.sh formats`). No HTML file: the few elements are created at load (`#fmt-series` in `#game`, `#fmt-sd-pips` in `#pk`, `#fmt-end-line` + `#btn-fmt-next` in the `#end` card, the picker in `#party-modal`). Nothing in the core was edited; no CORE-REQUEST was needed.

## What it does
1. **Golden Goal tie-break (sudden-death kicks).** `endGame` is wrapped: a `golden` match still level at full time (not training, not guest, not spectator) runs alternating single kicks through the core's `setupPenalty` (me first, up to `ECON.fmt.sdPairs`=3 pairs). A pair with one goal and one miss decides; still level after 3 pairs → draw. Pips `⚽❌⚪` per side in `#fmt-sd-pips`, the kick number in `#pk-round`. The decision goes straight to `showEnd(outcome)` after `netEv('end:…')` (same as `endGame`), the displayed score stays level, and a win sets `overtime=true` + `netEv('golden')` so every seat gets the +10 golden bonus. Online host runs it like physics (`hold:pk` / `holdEnd` events); guests and spectators only receive the result. ✖ on the penalty screen = a miss (core behaviour of single kicks); pause/quit from the pause modal work.
2. **Best-of-3.** `settings.bo3` (boolean, on top of `settings.format='quick'`; `myFormat()` stays `'quick'`). A series `{n, wins:{me,op}, hist, game, done, winner, pending, guest}` starts with every eligible match (party host, offline 2v2 with keyboard friends, plain offline matches; never training / Match-of-the-Day / guest / spectator). First to 2 wins; after 3 games the leader wins (level → series draw). Pips under the clock (`#fmt-series`: `🏆 משחק 2 · 1-0 🟢⚪⚪`), a line on the result card ("סדרה: 1-0 · משחק 2 מתוך 3") and a **המשחק הבא ▶** button (replaces "שוב" during a series; offline replays `lastMatch` — same opponents, same level; host calls `mpStart(mode, lvl)` again). Series winner: `+ECON.fmt.seriesCoins` (40 🪙, counted inside the daily coin cap, "end.capped" shown if clipped) and `+1 🏆` via `addTrophies`, plus the toast `fmt.seriesToast`. Guests mirror the host's series from a `{t:'fmt', bo3, game, n, wins:[L,R], hist}` message the host sends right before the core's `start` message (same ordered connection) and pay themselves the bonus when their team wins; they see "⏳ המארח מתחיל את המשחק הבא…" instead of the button. Leaving to the home screen / quitting / party teardown ends the series.
3. **Format picker.** 4 chips (⚡ מהיר / ⏱️ קלאסי / 🥇 שער זהב / 🏆 הטוב מ-3) with a sub-line each, appended to the party modal (host). A guest with no `ver` (pre-wave-1 build) → the chips dim and a hint says Classic only (the core forces `classic` in that case).
4. **Version check.** Host: a guest whose `hello` has no `ver` or an older one (string compare with `GAME_VERSION`) → one toast `fmt.oldVersion(name)` per guest. Guest: the host's `hello` already carries `ver` (core line ≈4225), so no lobby change was needed — newer host → `fmt.hostNewer` ("refresh"), older / no version → `fmt.hostOld`; a `lobby` message with `ver` is honoured too if it ever carries one.
5. **Golden clock.** `updateTimer` is wrapped: in `golden` matches the clock shows "🥇 שער זהב" (class `fmt-label`); the last 10 s still tick in red.

## Public functions
- `formatPickerHTML()` → the chips markup (`<div class="fmt-picker">…</div>`), `bindFormatPicker(el)` → one click handler per container (safe to call twice), `syncFormatPickers()` → re-marks `.on` in every picker on the page, `setFormatChip('quick'|'classic'|'golden'|'bo3')`, `currentFormatChip()`.
- `seriesInfo()` → `null` or `{n, game, wins:{me,op}, hist:['W'|'L'|'D'], done, winner:'me'|'op'|'draw'|null, guest, text}` for the end card / home.
- Internals exposed as globals for tests: `series`, `shootout`, `startSuddenDeath()`, `sdRenderPips()`, `seriesRenderTag()`.
- Tunables: `ECON.fmt = {sdStart:900, sdGap:1500, sdPairs:3, seriesGames:3, seriesCoins:40, seriesTrophies:1}`.

## Hooks
- Listens: `matchEnd` (series update + end-card line/button).
- Emits: `Hooks.emit('format', chip)` whenever a chip changes the setting (for the home screen to refresh its own picker / hint).
- Wrapped core functions: `endGame`, `updateTimer`, `beginMatch`, `mpStart`, `mpOnMsg`, `openPartyModal`, `goHome`, `quitToHome`, `mpTeardown`, `applyLang`.

## prog / settings fields
- `settings.bo3` (boolean). No new `prog` fields (the series bonus goes through `addCoins`/`dayCounter('coinDay')`/`addTrophies`).
- Online: `mp.fmtSeries` (guest, the pending host message), `mp.fmtVerWarned` (guest, once per room), `c.fmtWarned` (host, per guest connection).

## What the home screen must wire
- Put `formatPickerHTML()` wherever the format is chosen (level modal / play flow) and call `bindFormatPicker(thatElement)` once; listen to `Hooks.on('format', …)` if a hint depends on it. The chips keep `settings.format` + `settings.bo3` in sync across every picker on the page.
- Optional: show `seriesInfo()` (when not null) in a home/party line while a series is paused between games.

## Open questions
- Bo3 is also allowed for plain offline matches vs the bot (the chip would otherwise be dead on the home screen); PLAN §3 lists it for party/friends/2v2 only. Easy to restrict in `seriesEligible()` if the integrator prefers.
- Series bonus coins count against the 600/900 daily cap (not the 250 per-match max); trophies are not capped.
- The sudden-death kicker is always me first (PLAN says "the team that did not take the last kick-off"); the core does not track kick-off teams.
- PLAN §3.2 wants the host to refuse everything but Classic for *older* (versioned) guests too; the core forces Classic only for guests without a version, and this module only toasts for older ones. If the stricter rule is wanted: `mpStart` line ≈4372, `conns.every(c=>c.ver && c.ver>=GAME_VERSION)`.
