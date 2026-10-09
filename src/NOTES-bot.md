# 50-bot — the bot: personalities, brain, mercy, newbie mercy, sleep (PLAN §6, §2.5 step 1)

## Files
- `src/css/50-bot.css` — the countdown tag (`#bot-tag`, BOSS variant), the 😴 sleep marker on the bot's name tag, the 😂 Trickster emote.
- `src/html/50-bot.html` — `#bot-tag` (icon + name + one-line description), hidden except during the 3-second countdown.
- `src/js/50-bot.js` — everything below. `src/test/50-bot.js` — 38 assertions (`./test.sh bot`).

## What it does
1. **Personalities** — `botProfileFor(charId, levelI)` is pure and deterministic (djb2 hash of the character id): 🧱 wall / ⚡ sprinter / 🎯 sniper / 🤪 trickster / 🐢 turtle, Easy gives 40 % Tricksters, level 5 is always ☠️ `boss`. Every AI seat (P2, P4, and the partner P3) gets `p.bot = {prof, side, used:{ice,fire}, E}` when the match is set up. Multipliers (ECON.bot.profiles): wall speed ×.95, slide ×.6, block-jump ×1.3, defends anywhere in its half · sprinter speed ×1.08, kick −.1 · sniper power +.1, waits for the ball to be ahead, flat drive 30 % · trickster hops ×2, err ×1.4, scissors 8 %/s, 😂 when it scores · turtle speed ×.9, err 0, always predicts · BOSS all ×1, speed fixed 1.45, never any mercy.
2. **Countdown + commentator** — when the host's countdown starts, `#bot-tag` shows "🧱 החומה" over the number for the 3 s (every client: the tag is driven from `showCount`, which guests also run via `count:n` events) and the host's commentator says `bot.line.<id>`.
3. **Brain** — `updateAI` is replaced by a copy of the original plus: goal-aware shooting (`botAimY` picks the corner farther from the human nearest its goal when the bot is within 220 px of the goal line; Easy/Medium add noise), **`doKick(p, power, aimY)`** (after the original kick, a bot's `vy` is nudged toward `aimY` within ±25 %, the speed never changes by more than 10 %; the physics constants are untouched; humans are never aimed), goal-line guard (`guardX` = own goal + 90, taken with probability `smart` when the ball comes at >250 px/s into its half and the bot is not the closest; jumps when the predicted ball height would pass over its body), scissors (Hard+, 5 %/s, Trickster 8 %, only when the ball sits between the bot and its own goal so the flick goes the right way), ice/fire (Master+/BOSS, opponent bots only, once each per match, when trailing or in the last 30 s; `botIce` freezes the human team with the same visual as the human's ice, `botFire` burns the ball through `fireFx` / `fireBusy` so `updateFire` finishes it). The 2v2 support logic is kept; the partner bot (P3) runs the same brain mirrored (`side=-1`), never gets weaker from the mercies.
4. **Coach mercy (visible)** — `botCheckMercy()` after every goal (offline or party-vs-bots, never Impossible/training/human opponents): human trails by ≥2 → speed ×.9, err +30, react +.1 and "המאמן: הבוט קצת עייף 😉" once; human leads by ≥3 → speed ×1.05 (capped at the next level's speed) and "הבוט מתעורר!" once. Three straight losses at a level (`prog.recent`) → the mercy numbers from kick-off, with the tired line 5 s in.
5. **Newbie mercy** — `prog.matches < 3` at Easy: react +.2 s, speed ×.85 (`botState.newbie`).
6. **Sleep** — `botSleep(seconds)` (default 9): every bot stands still (😴 on its name tag), then wakes with "{name} מתעורר! ⏰". Counts play seconds plus the countdown steps (a sleep started on the `screen` hook before kick-off loses ~3 s to the countdown, which is what `95-onboard` assumes with `botSleep(secs+3)`); pauses do not count.
7. **Level recommendation** — a `NextUp` candidate (prio 2) "נסה רמה קשה/קלה יותר: X" whenever `recommendLevel()` differs from the last level.

## Public functions
`botProfileFor(charId, levelI)` → id · `botProfileInfo(id)` → `{id, icon, name, desc}` · `botPersonality()` → the main opponent bot's info for the current match or `null` (online vs humans, training, no bot) · `botMatchReport()` → the same plus `{mercy:'tired'|'awake'|null, newbie, boss}` · `botSleep(sec)` · `botAsleep()` · `botWake()` · `botCheckMercy()` · `botAimY(ai, side, opps)` · `botIce(ai)` · `botFire(ai)` · `botParams(ai)` → the effective numbers · `botSetupMatch()` · `botState` (match state) · `botLastAim` (diagnostics of the last aimed kick) · `ECON.bot` (every number).

## Core functions wrapped / replaced
`updateAI` (replaced), `doKick` (wrapped, new 3rd argument `aimY`), `beginMatch`, `startCountdown`, `showCount`, `scoreGoal` (wrapped), `Hooks.emit` (wrapped only to add `info.bot` to `'matchEnd'` and a "היריב: 🧱 החומה" line to `#end-sub`). Hooks used: `screen` (hides the tag off the game screen), `NextUp.add`.

## prog fields
None of its own (reads `prog.matches`, `prog.recent`). No new network calls.

## What the home / other modules must wire
- **Onboarding (§2.5 step 1):** already wired — `95-onboard` calls `botSleep(12)` on the `screen` hook before the countdown, which leaves ~9 s of sleeping play. Nothing else is needed; the wake line is the bot module's.
- **End card module (§10):** already wired — `40-endcard` calls `botPersonality()` and shows "🤖 🧱 החומה" in its own row (it reads `icon` + `name`); `info.bot` on `'matchEnd'` is `{id, icon, name, desc, mercy, newbie, boss}` (or null) for anything else. Without an end-card module the bot module appends "היריב: 🧱 החומה" to `#end-sub` itself (it checks `typeof endcardRow`).
- Home "next up" picks up the level suggestion automatically through `NextUp`.

## Open questions
- Boss of the Week (§6.8, wave 3) is not built; only the fixed ☠️ BOSS profile for Impossible is.
- Bot ice/fire run in party-vs-bots too (the host runs the AI; frozen players and the fire event already travel in snapshots / `netEv('fire')`), while the human's ice/fire stay offline-only — say if the bot should also be offline-only.
- The Sniper's "kicks only 60–170 px ahead" from the plan conflicts with the kick reach (72 px); implemented as "waits until the ball is ≥20 px ahead of it toward the goal" plus the flat drive.
- The pass for 2v2 partners (wave 4) is not built, as the plan says.
