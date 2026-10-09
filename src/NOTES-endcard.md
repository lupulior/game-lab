# 40-endcard — the result card ceremony (PLAN §10, §2.4, §6.4, §9.3)

## Files
- `src/css/40-endcard.css` — styles for `#endcard-earn`, `.ec-*` rows, `#endcard-btns`, and the `.endcard-panel` class the module adds to the `#end .panel` (fixed 780 px width, max-height 604, overflow hidden, tighter padding so everything fits in the 620 px stage).
- `src/js/40-endcard.js` — the module (no html file: the block is created once by JS inside the core's `#end .panel`, after `#end-xp`; the button bar is appended inside `#end-btns`).
- `src/test/40-endcard.js` — 50 assertions (`./test.sh endcard` → `"errs":[]`, all PASS).

## What it does
On `Hooks 'matchEnd'(info)` (not for spectators): hides `#end-xp`, renders `#endcard-earn` as a vertical reveal (0.3 s steps, `sfx.click()` tick, numbers count up, bars animate; a tap on the block or reduced motion reveals everything at once):
1. `🪙 +coins` + chips from `info.pay.parts` (`T(key) +n`), `🔥 +{pct}% בונוס רצף` when `pay.bonus>0`, a multiplier chip when `pay.mult>1` (`×2 יום ראשון` on Sunday, `×2 משחק היום` for the match of the day — captured by wrapping `showEnd`, since the core clears `dailyMatch` before the hook — else `×N אירוע`).
2. Daily cap bar: `dayCounter('coinDay').n / coinCapToday()` + `T('cap.today')`, orange when full, `T('end.capped')` when `pay.capped`.
3. `⭐ +xp` + `דרגה N` + XP bar (animates from before-match % to `levelProgress().pct`) + a chip per level-up in `info.earn.levelUps`.
4. `🏆 +n` · `🔑 +n` (+ "פתח עכשיו" → `openChestsScreen()` if it exists) · `💎 +n`.
5. Mission ticks from `dailyMissionStatus()` if it exists (accepts `[{text|name|title, done, have?, need?}]`, first 3).
6. `🔥 יום N ✔` when `prog.streakNew` (then clears it + `saveProg()`).
7. Bot personality line from `botPersonality(opChar, info)` if it exists (string or `{icon,name|title,text|line}`), offline only.
8. On a loss: one of 6 tips (4 languages): 0 goals → "kick when the ball is in front of you"; conceded ≥3 → defend / slide tip; otherwise rotating by `prog.matches`.
Training (`info.training`): only "סיימת אימון! 💪" (+ goals in shooting practice), no earnings, buttons 🔄 + 🏠.

## Buttons (`#endcard-btns`, inside `#end-btns`; the core's `#btn-end-again` / `#btn-end-home2` stay in the DOM, hidden while the card is shown, restored on close)
- `#btn-ec-more` ▶ עוד משחק — offline: `startOfflineMatch(info.level, newOpp)` with an opponent that is never the one just played (`endcardNewOpponent`); offline 2v2: `beginMatch` with the same `lastMatch.opts` and a new first opponent; online/`mp`: delegates to the core's `#btn-end-again` handler.
- `#btn-ec-again` 🔄 שוב — offline only (hidden online): the core's `#btn-end-again` (replays `lastMatch`, same opponent); training: `startTraining(kind)` again.
- `#btn-ec-share` 📤 שתף — only when `typeof shareResult==='function'`; calls `shareResult(info)`.
- `#btn-ec-home` 🏠 — the core's `#btn-end-home2` handler (goHome, mp teardown).
Buttons are real `<button>`s (click = touch + keyboard), ≥ 50 px tall, `touch-action:manipulation`.

## Public functions
`endcardRender(info)`, `endcardSkip()` (reveal everything now), `endcardClose()`, `endcardMore()`, `endcardAgain()`, `endcardShare()`, `endcardHome()`, `endcardNewOpponent(prevCharId)→index`, `endcardNoMotion()`, `ENDCARD` state (`info`, `motd`, `trainKind`).

## Hooks / patches
- `Hooks.on('matchEnd')` → render; `Hooks.on('screen')` → close when leaving the game screen.
- Monkey-patches: `showEnd` (captures the match-of-the-day flag before the core clears it), `applyLang` (relabels the buttons on language change).
- Optional functions used if present: `shareResult(info)`, `botPersonality(char, info)`, `dailyMissionStatus()`, `openChestsScreen()`, `startTraining(kind)` (core).

## prog / settings fields
Reads `prog.streakNew` (clears it after showing the streak line), `prog.streakDays`, `prog.matches`, `prog.coinDay` via `dayCounter`; writes nothing else. Honours `settings.reducedMotion` (if a settings module adds it) and the OS `prefers-reduced-motion`.

## Home screen wiring
Nothing — the card wires itself on `matchEnd`. Other modules only need to expose the optional functions above.

## Open questions
- `info` has no "match of the day" flag; the module wraps `showEnd` to read `dailyMatch` before the core resets it. A `motd` field in `info` would remove the wrapper (not requested in CORE-REQUESTS, the workaround is clean).
- Online "שחק שוב" request to the party (§10) is left to the core's existing "עוד משחק" behaviour (back to the party).
- The `.endcard-panel` class slightly tightens the core panel's padding and the h2 margin so a full win card (level-up, key, missions, streak, personality) fits 620 px; if the core later shrinks `#end` fonts this can be removed.
