# 80-adminstats — measurement, admin dashboard, polish (PLAN §14, §1.12, §11 #5 #9 #13 #15 #21)

Files: `src/js/80-adminstats.js`, `src/css/80-adminstats.css`, `src/test/80-adminstats.js` (22 assertions, `./test.sh adminstats`). No HTML file: the dashboard section is built in JS inside the existing `#admin-modal .panel` (after `.adm-grid`), only when the admin opens the panel.

## What it does
1. **Per-device counters** `prog.m = {sess, cE, cS, sh, days:{'YYYY-MM-DD':matches}, lastDay, newSent}` — `sess` +1 once per page load; `cE` from the `coins` hook, `cS` from `spend`, `days`/`lastDay` from `matchEnd` (training ignored), `sh` via `statShare()`; `days` pruned to 28 days.
2. **Heartbeat fields** (hook `heartbeat`): adds `{sess, days (28-day bitmask, bit 0 = today), mToday, lastDay, cE, cS, sh, lv, fmt}` to the presence PATCH body.
3. **Daily aggregate** `stats/<dayKey>` with `{'.sv':{increment:n}}`: `matches` (every real match), `dau` (once per day per device, `dayCounter('statDau')`, checked on load, on every `home` and on `matchEnd`), `newPlayers` (a device that never played: matches/wins/trophies 0, no unlocked players; once, `prog.m.newSent`), `chests` (hooks `chest`/`chestOpen` or `statChest()`), `buys` (hook `purchase` or `statBuy()`), `shares` (hook `share` or `statShare()`). Fire-and-forget through `fbReq`, only when `fbOn()`. The load-time PATCH is delayed 2.5 s (after the first heartbeat).
4. **Admin dashboard** "📈 מדדים" box: one GET `stats` (filtered to the last 14 days) + one GET `users`; tiles: players today, matches/DAU (green when ≥ 3), D1 and D7 return rates from the users' `days` bitmasks (green when D1 ≥ 35 %), coins earned / spent (sum of `cE`/`cS`), 14-day matches, new players, chests, buys, shares, sessions, players on the server, suspicious count; 14 DAU bars (plain divs); the list of flagged names; the wave-2 decision rule; "ready in N ms" boot time (§15 g). Refresh button clears the users cache.
5. **Red flags** (`isFlagged(u)`: `!adm && (tr>5000 && w<50 || xp(coins)>500000)`): rows in `#adm-online` get `.adm-flag` (red) + a "⚠️ חשוד" badge with the numbers in its tooltip; every row (except mine) gets a one-tap "🙈 הסתר" / "👁 הצג" button → `HIDDEN_IDS` (names or user keys), remembered in `prog.hiddenNames` on this admin device only.
6. **Polish**: `buildTop` replaced — filters `HIDDEN_IDS`, shows `LEADER_BOTS` only while the table is completely empty (one real player and the bots are gone); `partyRefresh` wrapped — `#btn-party-leave` shown while `mp && mp.connected`; `applyBan`/`checkBan`/`kickPlayer` replaced — all compare with `now()` (server-synced); `updateTitle()` every 10 s and after `home` — `document.title = '(1) Football Star ⚽'` while `NextUp.best()` returns a candidate (a candidate with `claim:false` does not count); `applyMotionPref(bool)` toggles `body.reduced` from `prefers-reduced-motion` (live on change) — CSS stops the decorative loops, hides the confetti canvases, and `confetti.burst`/`ceoConfetti.burst` become no-ops while reduced.
7. `fbReq` is wrapped so that `GET users` is served from a 15 s cache (`astUsersCache`): the admin list, the flags pass, the dashboard and the leaderboard share one whole-node read.

## Public functions
`statShare()`, `statChest()`, `statBuy()`, `statDaily(fieldOrBody, n?)`, `statDau()`, `daysMask()`, `mMatchesToday()`, `mState()`, `statHeartbeatFields(body)`, `renderStats({days, users})` (pure render, returns the 14-day totals), `loadStatsDash()`, `flagAdminRows(users?)`, `isFlagged(u)`, `isHiddenId(key,name)`, `hideId(key,name)`, `unhideId(key,name)`, `updateTitle()`, `applyMotionPref(bool)`, `reducedMotion()`. Constants: `HIDDEN_IDS`, `ECON.stats` (`days, dash, titlePoll, usersTTL, loadDelay, flagTr, flagW, flagCoins, d1Target, mpdTarget`).

## Hooks used
`coins`, `spend`, `matchEnd`, `purchase`, `chest`, `chestOpen`, `share`, `heartbeat`, `home`.

## prog / settings fields
`prog.m` (above), `prog.statDau` (`dayCounter`), `prog.hiddenNames` (array). Nothing in `settings`.

## Home screen wiring
Nothing new to wire: the admin button already opens the panel. Other modules should call `if(typeof statShare==='function') statShare()` on a share tap (or `Hooks.emit('share')`), `statChest()` / `Hooks.emit('chest')` when a chest opens, and `Hooks.emit('purchase', {...})` for shop buys. NextUp candidates that are not claims (e.g. "play a match") should set `claim:false` so the tab title does not show "(1)".

## Open questions
- The server-side hidden list (`hidden` node, §1.9 rules) is wave 2; today the hide is per admin device (`prog.hiddenNames`).
- `w grew > 60 in a day` / `trDay > 400` (§1.12) need history the heartbeat does not keep; the flags implemented are the two "impossible" ones from the task.
- Firebase rules must allow `stats/$day` `.sv increment` writes by any client and the new `users` fields (`sess, days, mToday, lastDay, cE, cS, sh, fmt`) — Appendix A update needed.
- `build.sh` inlines each `src/html` file as `<!-- /* ===== name ===== */` + content + ` -->`: the opening comment is only closed by the first `-->` inside the file, and the trailing ` -->` lands as visible text in `#stage` (files that start with an HTML comment work; others would be swallowed). Not my file to fix — flagging for the integrator.
- `buildTop` is a full replacement of the core function (needed to change the bot filler); when §7.2 reworks the leaderboard, drop this override.
