# NOTES — daily loop module (files `30-daily.*`)

Streak (gentle 7-day cycle + milestones + free freezes + "save the streak"), 3 daily missions from a pool of 16, the 28-day calendar, the one-tap daily pickup, the Match of the Day row, the home "היום" card and Next-up candidates. Spec: PLAN.md §4.1–4.4, §2.1. Every number is in `ECON.daily`.

## Files
- `src/js/30-daily.js` — logic, texts (4 languages), modal wiring
- `src/html/30-daily.html` — 5 modals inside `#stage`: `#daily-pickup-modal`, `#daily-cal-modal`, `#daily-missions-modal`, `#daily-streak-modal`, `#daily-save-modal`
- `src/css/30-daily.css` — scoped to `.dpk-* .dcal-* .dmr .dms-* .dstk-* .dsv-* .dcard* #daily-end-line`
- `src/test/30-daily.js` — 59 assertions (`./test.sh daily`)

## Public functions
| function | what |
|---|---|
| `streakInfo()` | `{days, freezes, cycleDay (1..7, 0 when no streak), nextReward:{coins,gems,keys,chest}, broken, save}` |
| `streakCycleReward(cycleDay)` | the reward bundle of a cycle day |
| `dailyTitles()` | localized titles earned at milestones (stored as `prog.dailyTitles=['t7',...]`) |
| `dailyFreezeRefill()` | +1 free freeze once per week (Monday, `weekCounter('freezeWeek')`), max 2; runs at load and on every home visit |
| `dailyMissions()` | today's `prog.dm` (creates it, seeded by `dayKey()`; `play2` always slot 1) |
| `dailyMissionStatus()` | `[{id, text, icon, n, prog, done}]` (the end card reads `text`/`done`) |
| `dmEvent(ev, n)` | progress missions by event name (see below) |
| `dailyReroll()` / `dailyRerollCost()` | reroll the undone non-`play2` missions: free once a day, then 5 💎 |
| `missionsOpen()` | the missions modal (bars, reroll button, "all three" bonus state) |
| `calTile(n)` | tile n (1..28) → `{coins,gems,keys,chest,freeze,kit?,pack?}` |
| `calTodayN()` | the next unclaimed tile (claim counter, cycles after 28) |
| `dailyRows()` | the pickup rows `[{id:'cal'|'bronze'|'pack', text, reward, claimed}]` |
| `pickupDue()` | true when any row is unclaimed today |
| `claimDailyAll()` | claims every unclaimed row (confetti + `sfx.win`) |
| `openDailyPickup()` | the pickup modal ("🎁 קח הכול"; after the claim: tomorrow's tile dimmed) |
| `calendarOpen()` | the 28-tile grid |
| `dailyCardHTML()` | HTML of the home "היום" card: title + flame (+ freezes), pickup button, 3 mission bars, Match of the Day row |
| `refreshDailyCard()` | re-renders into `#today-card` (or `#daily-card`) if it exists; also runs on Hooks `'home'` |
| `bindDailyCard(card)` | no-op kept for the home module: clicks inside the card are delegated on `document` via `data-daily="pickup|missions|motd"` |
| `dailyMotdOpen()` | opens the Match of the Day modal (`openDaily()` if a module defines it, else `#btn-daily` click) |
| `dailyRewardText(r)` / `dailyGrant(r, why)` / `dailyGiveChest(kind, why)` | reward helpers (`giveChest()` when the chests module exists, else `ECON.daily.chestFallback` coins) |

## Hooks used
- `'streakDay'(days)` → cycle reward (50/75/100+🔑/125/150/200/Silver chest+3💎), milestones (7/14/30/60/100/365 → 3/5/10/20/50/150 💎 + title), prepares the "save the streak" offer when the core set `prog.streakBroken` (once per 30 days), queues the "🔥 יום N" celebration modal.
- `'ev'(name, n)` → missions. Extra checks on `goal`: `timeLeft > matchTime()-30` → `early`, `ISRAELI_IDS.includes(CHARS[selected].id)` → `israeli`; `ice` → `power`; `v2win`/`online` → `v2online`; on `play` (fires inside `showEnd`, rewards still land on the end card): `matchFmt==='quick'` → `quick`, win by 2+ → `margin`.
- `'chest'` → `chest1`, only when no chest-open function exists; otherwise `chestShowOpen()`/`openChest()` is wrapped (the chests module emits `'chest'` on *giving* a chest, which our own rewards do).
- `useFire` is wrapped (a real use flips `fireBusy`) → `power`.
- `'matchEnd'(info)` → the restoring match of "save the streak"; a small `#daily-end-line` (streak day + mission ticks) inserted before `#end-btns` — skipped when the end-card module (`endcardRow`) is present, since it draws both itself.
- `'screen'('home')` → freeze refill, then after 500 ms (only when home is still active, no overlay is open, not in a party, no welcome gift pending): save-the-streak modal → celebration modal → auto pickup (once a day, `prog.cal.autoShown`, only after the first match ever).
- `'home'` → `refreshDailyCard()`.
- `NextUp.add` ×3: pickup unclaimed (prio 50), a started mission one step from done (prio 35), Match of the Day not won today (prio 25, text "משחק היום: נגד {name}").

## prog fields
- `prog.dm = {key, ids:[3], prog:{id:n}, done:[ids], reroll:n, bonus:bool}`
- `prog.cal = {claimed:n, last:dayKey, bronze:dayKey, pack:dayKey, autoShown:dayKey}` (claim counter, not dates — skipped days are not lost)
- `prog.streakRewardDay` (cycle reward paid today), `prog.streakMs=[7,14,...]`, `prog.dailyTitles=['t7',...]`
- `prog.streakSave = {broken, offered, active, until}` while an offer / rescue is pending; `prog.streakSaveUsed = dayKey` (one offer per 30 days)
- `prog.freezeWeek = {key, n}` (weekCounter), `prog.freezes` (core field, capped at 2 here)
- Reads: `prog.streakDays/streakBroken/freezes/matches/daily/welcomeDue/packs` (`prog.packs` existing → a sticker-pack row worth 100 🪙 appears in the pickup).

## ECON.daily
cycle `[50,75,100,125,150,200,0]`, cycleKeyDay 3, cycleChestDay 7 (silver + 3 gems), milestones, freezeMax 2 / freezeWeekly 1 / freezeCalDay 10, saveDays 30 / saveHours 48, missionCoins 40 / missionXP 10 / allChest bronze (was allKey 1) / allXP 25 / freeRerolls 1 / rerollGems 5, calDays 28 / calMin 40 / calMax 120 / calKeyDays [3,10] / calChestDay 7 / calGemsDay 14 (5) / calPackDay 21 (150 🪙) / calKitDay 28 (300 🪙 + 10 💎 until a monthly kit exists), bronzeCoins 80, packCoins 100, chestFallback, autoOpenMs 500, celebMs 450.

## What the home screen must wire
- A container `#today-card` (the home module already does this and calls `dailyCardHTML()`); nothing else — the pickup button, mission bars and MOTD row inside it work through `data-daily` delegation.
- Optional direct buttons: `openDailyPickup()`, `missionsOpen()`, `calendarOpen()`.
- `NextUp.best()` already receives the three candidates.

## Open questions
1. Milestone titles are stored as `prog.dailyTitles` keys (`dm.title.t7` …) and exposed through `dailyTitles()`; the titles/name-colour feature (§5.7, wave 2) should read them — no `giveTitle()` exists yet.
2. Calendar day 28 pays 300 🪙 + 10 💎 until a monthly exclusive kit exists (then: `giveCosmetic(kitId)`).
3. "Save the streak" is offered once per 30 days by day difference from `prog.streakSaveUsed` (the brief suggested a month key; 30 days matches the plan better). Declining also consumes the offer.
4. The "one step from done" Next-up candidate requires some progress (`prog>0`), so an untouched 1-step mission does not outrank the Match of the Day.
5. The chest1 mission ticks on the chests module's `chestShowOpen()`; if that module renames the open function, the `'chest'` hook (give) takes over.
