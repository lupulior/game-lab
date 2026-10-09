# Football Star — Master Live-Ops & Economy Plan (revision 2, closes the critic's points)

**File:** `C:\Users\liorl\game-lab\game1.html` (single page, 453 KB / ~5,100 lines today). Deployed at `https://lupulior.github.io/game-lab/game1.html`. Bump `GAME_VERSION` (L1268) on every release.
**Spine:** unchanged — "something is waiting every time" (streak, missions, calendar, chests, Next-up card, 3-match onboarding, Israeli holidays, Match of the Day), one job per currency with zero conversions, keys only from Medium+ wins, monthly season ladder with lifetime trophies untouched, bot personalities with visible mercy, ECON object, WhatsApp-native promotion.
**Still dropped (per judges):** evolutions/stat upgrades, squad chemistry, ghost challenges, prestige, character-pulling packs, 5-tier random loot tables, 4-digit PIN save, any currency conversion, Friday-evening tournaments, seven weekday events, 4-hour timers, Firebase sticker swaps, paid pass track, bottom tab bar, clubs with a wall, hidden rubber-banding, Impossible gate, consumable boosts.
**New in this revision (critic closure, details in each section and in Appendix C):** automatic cloud backup moved to wave 1 (before any lapsed-player feature); one-time Firebase hardening (anonymous sign-in + rules file) that makes news/codes/saves/boards tamper-proof; per-seat online/party payout rules; the "עוד" drawer and Android back button designed; bot brain (aiming, guarding, power use, partner passing) specified; Golden-Goal tiebreak specified as a real flow; one multiplier formula with a hard cap; migration level-reward rule; Firebase data lifecycle and read bounds; Hebrew-calendar holidays; promotion basics (exact URL, `index.html` with OG tags, invite button in wave 1); deterministic chests by default (random tables opt-in only); friends-only lobbies and confirmed `?join`; no service worker until wave 3 (manifest + OG only); server-time day keys; gentle streak (no evening nagging, no purchasable freezes); Sunday–Tuesday tournament; a content backlog of 24 items prepared before launch; a file-size budget; a measurement node. Every contradiction the critic listed is resolved to ONE rule (see Appendix C).

**Core-gameplay rule:** nothing below changes physics, controls or `doKick` arcs, except items explicitly marked **[touches core]** (timer/target/format logic and AI decision parameters, including one aiming parameter). The user can veto those individually (approval items 7, 8, 22, 23, 43, 48).

---

## 0. Design principles
1. **Every outcome pays** (Brawl Stars tokens): losses pay coins.
2. **One job per number, no exchanges** (Clash Royale): Coins spend, Gems are rare, Keys open chests, XP only levels.
3. **Something waiting on every open** (Duolingo/Subway Surfers) — but **one tap collects everything** (one daily pickup modal), never three rituals.
4. **One tap to the fun** (Brawl Stars PLAY): smart PLAY + Next-up card.
5. **Nothing a kid earned is taken away**: 1:1 migration, lifetime trophies and road untouched, league floors, welcome gift.
6. **Short loops**: 90-second Quick is the default; Classic stays and pays fairly per minute.
7. **The WhatsApp channel is the server**: one shareable short link, deep links, share cards, scheduled codes, CEO posts.
8. **Kid-safe by construction**: no money, no random loot by default, no stranger contact beyond today's private codes, no evening pressure, no free-text names on new public surfaces.
9. **Tune without a release**: `ECON` object + signed Firebase `config/`.

---

## 1. Currency model

| Symbol | Name | Job | Stored | Migration |
|---|---|---|---|---|
| 🪙 | **Coins** (מטבעות) | everyday wallet: characters, cosmetics, chests, powers | `prog.coins` | `coins = prog.xp` (1:1) |
| 💎 | **Gems** (יהלומים) | rare, time-gated: exclusives, rerolls, Gold chest, character-of-the-day | `prog.gems` | `gems = 10` welcome |
| 🔑 | **Keys** (מפתחות) | open chests; from wins at Medium+ and online | `prog.keys` | `keys = 1` |
| ⭐ | **XP → Level** | prestige meter, never spent | `prog.xpTotal` (never decreases) | see §1.6 |
| 🏆 | **Trophies** (lifetime) + season trophies | lifetime feeds the 622-stop road (only up); season drives the monthly league (wave 2) | `prog.trophies` as is; `prog.season={key,tr,peak,floor}` | season starts at 0 |

**Rules:** no coin→gem, gem→coin or key→anything. Chests are fixed bundles (§5.1); the only choice inside is "pick 1 of 3" face-up cards. Cosmetic duplicates are impossible (owned items are never offered; "pick 1 of 3" never shows owned items). Prices that read XP now read coins with the same numbers (`PRICES`, `ICE_PRICE`, `FIRE_PRICE`); `fmtXp` → `fmtNum`.

**Migration (idempotent, `prog.migrated='v2'`, in the `prog` IIFE at L1792):** `coins=prog.xp`, `gems=10`, `keys=1`, `xpTotal` per §1.6, `prog.selectedId=CHARS[selected].id`, `prog.lvClaimed=levelOf(xpTotal)` (so no back-pay of level rewards, §1.6), `prog.saveId` generated (§9.7). One-time modal "ברוך הבא לגרסה החדשה 🎁": **Silver chest** (fixed: 300 coins + welcome kit "כחול-לבן" + 2 sticker packs once the album exists, before that +100 coins) + 10 gems + 1 key — the update feels like a gift, but the day-1 gem supply is 10, below one Gold chest (25). `prog.xp` kept read-only for one version, then removed.

### 1.1 Coins — base table (per match, by format)
| Event | Quick (90 s) | Classic (4:00) |
|---|---|---|
| Win vs bot Easy/Med/Hard/Crazy/Master/Impossible | 20/30/40/50/60/80 | ×2.5 → 50/75/100/125/150/200 |
| Win online (≥1 human opponent) | 50 | 125 |
| Win in a party vs bots only | bot table at the party's level | same |
| Draw | 10 | 25 |
| Loss | 8 | 20 |
| Per goal **I** scored (by `lastTouch.p` = my sprite, not the team) | +3 | +3 |
| Clean-sheet win | +10 | +10 |
| 3-star win | +5 | +5 |
| Golden Goal win | Quick table + 10 | — |
| Best-of-3 series win (party) | per game as Quick, series winner +40 once | — |

Classic also pays **+2 season trophies** (wave 2) and counts as 2 matches for "play N matches" missions, so Classic is roughly equal per minute and better per match — not dead.

### 1.2 Multiplier formula (one formula, one place: `payout()` in ECON)
```
base   = table(format, outcome, level) + goals*3 + cleanSheet*10 + threeStar*5
bonus  = min(0.5, winStreak*0.10) + min(0.5, streakCycles*0.10)     // additive, cap +100% total
mult   = max(motd ? (sundayBoss ? 3 : 2) : 1, sunday ? 2 : 1, comebackBoost ? 2 : 1, eventMult)  // ONE multiplier, the best, max 3
coins  = round(base * (1 + bonus) * mult)
coins  = min(coins, ECON.matchMax = 250)
coins  = min(coins, capRemaining)            // daily cap is a hard ceiling on all match coins, multipliers included
```
**Daily cap:** `ECON.capCoins = 600` (900 on Sundays and during event days), `prog.coinDay={key,n}` keyed by the server day (§1.10). Above the cap a match pays 5 and the end card says "היום: 600/600 🪙 — מחר מתמלא". Not capped (but each individually bounded): missions 3×40, daily pickup 40–120, level-ups 100×level, chests (fixed), weekly challenges 150–450, cup rounds (first 3 cups/day), training drills (first 3/day), referral 300, comeback 300, codes, road stops (≤500 each). **Target:** active kid ≈ 450–600/day → a 1,200 character every 2–3 days, Pelé (12,000) in ~4 weeks.

### 1.3 Coins — sinks
Characters at `PRICES` (starter band lowered, §8), ice 10,000, fire 10,000, kits 600–2,500, boots 300–900, balls 500–2,000, stadiums 1,500–3,000, celebrations 800, titles 400, shirt number 500, Bronze chest 150, Silver chest 500. Catalogue: 24 items at launch (Appendix B), +1 new item per week, +1 returning item per week.

### 1.4 Gems — sources (hard weekly cap 60 on everything except codes and league/tournament prizes; `prog.gemWeek={key,n}`)
Streak milestones 7/14/30/60/100/365 days → 3/5/10/20/50/150 · calendar day 14 (5) and 28 (10) · weekly challenge +2 each (all four → Gold chest) · the three big achievements only: win_master 5, cup_master 5, win_impossible 10 · level-up every 5 levels +5 · pass every 5th tier +5 (30/month) · monthly league top 10 (30/20/15/10/8/6/5/4/3/2) · tournament top 3 (40/25/15) · Boss of the Week 10 · referral 10 per friend (max 10/month) · Gold chest 5 (fixed) · comeback 10 · codes. Expected 15–30/week for an active kid; Gold-from-keys alone ≈ 12/week.

### 1.5 Gems — sinks
Mission reroll 5 (1/day), shop reroll 5, Gold chest 25, epic cosmetics 40–120, legendary 150–300, character-of-the-day slot at `ceil(coinPrice/100)` gems (Salah 15, Pelé 120 — only that one rotating slot), pick-any-sticker 8, name colours 40/60/80, club creation 50 (wave 4). Gems never expire. **No streak freezes for sale** (§4.1).

### 1.6 Keys
+1 per win vs bot at **Medium or above** and +1 per online win, **together max 3 keys/day from matches of any kind** (`prog.keyDay`); +1 for all 3 missions, +1 calendar day 3/10, +1 Boss of the Week, codes. Wallet cap 10 (badge turns red: "פתח תיבות!"). Spend: Bronze 1, Silver 3, Gold 8 (≈ every 3 days).

### 1.7 XP → Level
XP per match (level only): win 10/15/20/30/40/**60** (Impossible 1,000 → 60, closes the exploit), online 25, draw 5, loss 3, goal 2 (**batched into the end card, no toast per goal**); mission +10, weekly challenge +100, achievements (table §8), cup as today. Level n at `25·n²+75·n` lifetime XP (L5 1,000 · L10 3,250 · L20 11,500 · L30 24,750 · L50 66,250). Level-up: 100×level coins; every 5th level +5 gems + title; L10 Gold chest.
**Migration:** `xpTotal = prog.xp + Σ priceOf(unlocked chars that are neither free nor trophyOnly) + 10000·ice + 10000·fire`, **clamped to 24,750 (L30)**; admins (`isAdmin()`) use `prog.xp` only, same clamp. `prog.lvClaimed = levelOf(xpTotal)`: levels at or below the migrated level pay nothing (the welcome gift covers it); every level gained afterwards pays normally. The level pill shows "⭐ Lv 7" with a thin bar; `users.lv` pushed to Firebase.

### 1.8 ECON object
`const ECON={...}` right after `GAME_VERSION` holds every number in §1, §4, §5, §7. `fbReq('config/pub')` (signed node, §1.9) may return `{coinMul,gemMul,keyMax,capCoins,events:[...],publicLobbies:false,randomChests:false}` read on load. Admin panel shows "גרסה: 2026-…" and the live values.

### 1.9 Firebase hardening — one-time console setup (wave 1, before any new server node)
The critic is right that public rules make every new server feature (news, codes v2, saves, boards, referrals) writable by anyone. Fix once, invisibly to kids, with **Firebase Anonymous sign-in** (no account, no password, no e-mail — a random uid the phone remembers) plus a rules file the author pastes in the console. Steps for the author: (1) Console → Authentication → enable "Anonymous"; (2) copy the Web API key into `FB_KEY`; (3) paste the rules from Appendix A; (4) after first launch, open the admin panel, copy the shown uid, add `admins/<uid>: true` in the console. Client side (~80 lines): `signUp` via `identitytoolkit.googleapis.com/v1/accounts:signUp?key=FB_KEY` → `{idToken, refreshToken, localId}` stored in localStorage (and inside the cloud save, so a restore keeps the identity); refresh via `securetoken.googleapis.com/v1/token` every 50 min; every `fbReq` appends `?auth=<idToken>`. If sign-in fails (blocked network), the game runs offline exactly as today.
What the rules give: `users/$uid` writable only by its owner (names cannot be impersonated; `name` ≤ 16 chars; `str`/`lv`/`w` increments bounded per write); `saves/$id` not listable; `news`, `config`, `hidden`, `codes/$c` (except `used`/`users/$uid`) writable only by `admins`; `refs/$ref/$uid`, `daily/$day/$uid`, `tourn/$week/$uid`, `lobbies/$uid` keyed by the writer's uid; `.indexOn` for `str`, `t`, `pts` so reads can be bounded with `orderBy`+`limitToLast`. Old rows written before the change keep working (read-only) until the prune (§1.11). **If the author prefers not to touch the console:** news banner, codes v2, lobby list, saves and MOTD board are dropped (they are unsafe without it); everything else still works.

### 1.10 Server time
`fbHeartbeat` (L2644) already writes `t:{'.sv':'timestamp'}`; the PATCH response returns the resolved value → `clockOffset = serverT − Date.now()`, stored in `settings.clockOffset`. `now()` = `Date.now()+clockOffset` feeds `dayKey`, `weekKey`, `seasonKey`, calendar, streak, shop rotation, events. Offline: local clock, but if the next sync finds |offset| > 6 h the day's daily rewards are held ("השעון בטלפון לא מכוון") until synced. Bans compare with server time too (bug #13).

### 1.11 Firebase data lifecycle and read budget
- `users`: leaderboard reads `users.json?orderBy="str"&limitToLast=100` (and `orderBy="t"` for "online"); friends by key; no more whole-node GETs (today L2721/L2975 fetch everything).
- `daily/<day>`: 7 days kept; `tourn/<week>`: 4 weeks; `lobbies`: entries older than 60 s ignored, deleted on start/teardown; `refs/<ref>`: max 10 children/month by rule; `saves/<id>`: ≤20 KB each, written at most once/60 s.
- **Prune:** admin panel "ניקוי" button deletes `daily`/`tourn`/`lobbies` keys older than the retention and `users` rows with `t` older than 180 days and `w<3`; additionally, any admin client prunes automatically once per day on open.
- Budget: Spark plan 10 GB/month download. Leaderboard 100 rows ≈ 12 KB × ~3,000 opens/day ≈ 1 GB/month; MOTD board top 10 + friends ≈ 2 KB; OG image and share PNGs are served by GitHub Pages, not Firebase. Share cards are generated on device.

### 1.12 Cheating stance
Rules bound each write (one match per write: `str` +≤15, `w` +1, `lv` ≤ 200, `pts` ≤ 25/match). Admin list flags rows in red when `trDay > 400`, `w` grew by > 60 in a day, or tournament `m` > 60; admins (`adm:true`) are exempt from flags. One-tap ban/reset/hide. No further anti-cheat; localStorage edits only inflate the cheater's own cosmetics.

---

## 2. Home, navigation, first session

### 2.1 Home layout (1000×620 stage, cartoon palette and bobbing hero stay)
- **Top bar, 4 pills:** `🏆 123 · ⭐ דרגה 3` (lifetime trophies + star rank; tap → road), `⭐ Lv 7 ▮▮▮▯` (tap → level rewards), `🪙 1,240` (tap → shop), `💎 23` (tap → gem tab). In wave 2 the first pill shows the season league badge instead of the star rank (`🥈 ליגת כסף · 🏆 123`). Name pill shows `🔥12` and the equipped title; admin crown as today. Keys appear as a badge on the Chests button.
- **Centre:** podium hero + "🧑 הלוקר" (choose character + equip cosmetics). Under it the **big PLAY** (300×110 px, green, pulsing on first run) and two chips: `רמה: קשה ▾` (level sheet, 6 cards, recommendation arrow) and `מצב: מהיר ▾` (Quick / Classic / Golden Goal / Best-of-3 / 2v2 / Online / Cup / Training). Remembered in `settings.lastLevel/lastMode`.
- **Next-up card** (one line, one action), priority: daily pickup unclaimed > chest openable (keys ≥ cost) > mission one step from done > weekly challenge one step from done > Match of the Day not played > friend online ("דני מחובר — הזמן") > "שחק עוד משחק". **The streak is never used as a prompt** (§4.1).
- **Left card "היום":** one button "🎁 איסוף יומי" (calendar tile + free Bronze chest + free sticker pack in ONE modal, one tap), 3 missions with bars, Match of the Day row, "🔥 יום 12".
- **Right column:** 🎁 Chests (key badge), 🛒 Shop (red dot), 🏅 Pass (wave 2), 🏆 Leaderboard, 👥 Friends, **⋯ עוד**.
- **Foot:** fullscreen, WhatsApp channel, exit as today. `hasNew(section)` drives all red dots. League accent colours: bronze #c77b3a, silver #b9c3d1, gold #f5c542, platinum #7fd3ff, diamond #a78bfa, champion #ffd700.

### 2.2 The "⋯ עוד" drawer (designed)
A bottom sheet (`#more-sheet`, slides up over the stage, dark scrim, swipe-down or scrim tap closes) with a 3×3 icon grid: 📊 סטטיסטיקה · 🏅 הישגים · 🎟️ קודים · ⚙️ הגדרות · 🎵 מוזיקה · 🌐 שפה (the 4 language buttons inline in the sheet as today's flags) · 🔑 קוד שחזור (copy/share) · 📲 הוסף למסך הבית (wave 2) · 👑 ניהול (admins only, same `isAdmin()` gate). Each opens the existing modal/screen; the sheet closes first so there is never more than one overlay plus the sheet. Settings modal keeps name / voice / sfx / emotes-mute / reduced-motion.

### 2.3 Android back button / browser history (new, wave 1)
A tiny `UI` stack: `UI.open(id)` pushes `history.pushState({ui:id})`, `UI.close()` pops. `popstate` closes the top-most modal or sheet; with nothing open on a non-home screen it goes home; on home it opens the exit modal (which now has "להישאר" / "חזרה למסך הפתיחה"). During a match, back = pause menu (never quits a match in one press). Every modal `.show` toggle goes through `UI.open/close` (one helper, ~40 lines), including the end card. `#rotate` overlay and fullscreen are unaffected because all new modals live inside `#stage` like today's.

### 2.4 Smart PLAY
One tap: in a party → host starts / guest sees "מחכים למארח"; else starts a match at `settings.lastMode` and the **recommended level**: `prog.recent[level]` = last 5 results excluding the first 3 lifetime matches; 3 wins in a row at L with ≥2-goal margins → suggest L+1 (never Impossible automatically); 3 losses → L−1; first-ever match = Easy. The chip shows "נסה קשה יותר (+10 🪙)" when a promotion is suggested; the kid can always override. Opponent: random character weighted 2:1 toward unowned ones; "▶ עוד משחק" on the end card always picks a new opponent (fixes the "again replays the same opponent" gap; "🔄 שוב" keeps the old behaviour).

### 2.5 First session (`prog.onboard` step counter, each step one skippable modal)
0. Intro tap → name modal (+ optional "מי הזמין אותך?" referral field, pre-filled by `?ref=` — parsing ships in wave 1, payout in wave 2; the code is stored in `prog.ref`).
1. **Controls overlay** before match 1 (new): a translucent layer over the real match for its first 10 s with labels on the actual touch buttons ("⬅➡ תנועה", "⬆ קפיצה", "⚽ בעיטה", "🦵 החלקה") and on desktop the key hints; the bot "sleeps" for these 8–10 s (😴 then "מתעורר!"). A "?" button in the pause menu reopens it any time.
2. Match 1 = Quick, Easy, newbie mercy (§6.2). End card: `+20 🪙 · +10 ⭐ · +1 🏆`, first_win (100 coins, §8), "🔥 יום 1", and a scripted "הנה המפתח הראשון שלך 🔑" → one-tap **Welcome chest** (fixed: 100 coins + the starter kit "כחול-לבן"; this is the ONLY starter-kit grant).
3. Match 2 (Easy/Medium suggested): afterwards the daily-pickup intro: "מחר: 75 🪙 · בעוד 7 ימים תיבה".
4. Match 3: the shop opens on the players tab with khalaili (100) affordable (3 wins 60–90 + first_win 100 + welcome chest 100 ≈ 300 coins) — the first purchase lands in session one.
5. Last card: WhatsApp channel link + "הזמן חבר" (share text with the short link; wave 1).

### 2.6 Shortened entry flows
Cup: "המשך גביע / גביע חדש" from the mode chip; level defaults to the recommended; team pick shows 8 teams (Israel first) + "הצג את כל ה-32". 2v2: default partner = highest-mastery owned character, sources ai/ai/ai, one tap; "התאמה אישית" hides the rows. Online: big 4-letter code + "שתף בוואטסאפ" (`?join=CODE`, confirmed on arrival, §9.2); friends-online row under PLAY. `#btn-party-leave` shown.

---

## 3. Match formats **[touches core: timer/target logic only]**
`MATCH_TIME` (L3253) becomes a `FORMAT` object read by `beginMatch`, `afterGoal`, `loop`, `showEnd`:

| Format | Time | Target | Tie at 0:00 | Payout |
|---|---|---|---|---|
| **Quick (default)** | 90 s | first to 2 | 30-s Golden Goal ("⚡ שער זהב" flash, hype bar maxed); still tied → draw | §1.1 |
| Classic | 240 s | `level.goals` | draw (as today) | ×2.5, +2 season trophies |
| Golden Goal | no clock, max 120 s | first goal | **sudden-death kicks** (§3.1) | Quick + 10 |
| Best-of-3 (party/friends/2v2) | 3 Quick games | 2 game wins | per game | series winner +40, +1 trophy; pips under the clock |
| Tournament (wave 3) | 120 s | first to 3 | draw | tournament points only |

Time announcements scale (30 s / 10 s in Quick). Party host picks the format (`PARTY_CFG.format`), broadcast in the `start` message (L4346). Cup unchanged. Level-modal hint becomes per level/format (bug #7). New profiles default to Quick; `settings.format` remembered.

### 3.1 Golden Goal sudden-death kicks (new flow, size M)
`startMatchPenalty` (L4941) is a single in-match kick; the tiebreak reuses it in a loop: `shootout = {round, a:[], b:[]}` → the match characters alternate, kicker first = the team that did not take the last kick-off; each kick runs the existing penalty setup/resolve and returns to `shootout`; after each pair, if one scored and the other missed → winner; after 3 pairs still level → draw (no infinite loop). Scoreboard shows pips "⚽⚪❌". Online: the host runs the loop as it runs physics; guests only render. Result goes to `showEnd` as win/lose/draw with `golden:true` for the +10.

### 3.2 Party version check (new)
`hello` (L4199/L4243) and `start` carry `ver: GAME_VERSION` and `fmt`. A guest whose `ver` is older than the host's: the host shows "דני צריך לרענן את המשחק" and refuses to start anything but Classic 4:00 (legacy-compatible); a guest with no `ver` field (pre-wave-1 build) is treated the same. Guests on a newer version than the host see "המארח צריך לרענן".

### 3.3 Online / party payouts per seat (new)
- **Who computes:** every client computes its own payout from the host's `end` message, which now carries `{sc, fmt, lv, scorers:[uid…], golden}`; the host computes its own too. No client pays for another seat.
- **What counts as online:** at least one **human opponent**. A party where all humans are on one team vs bots pays the bot table at the party level (keys only Medium+); this also means personalities and coach mercy apply there (§6).
- **2v2:** "win" is the team result; goal bonus counts only goals where the scorer sprite is mine (`lastTouch.p`); the partner's goals pay nothing to me. Spectators get nothing.
- **Same-opponent rule (farming two names):** wins against the same opponent uid pay full the first 3 times per day, then the draw rate (10/25) and no key; online wins also count inside the 3-keys/day cap and the 600 cap. Self-hosted games where both seats share a uid pay nothing.
- A guest who disconnects before the end gets the loss rate (8/20) once reconnected — no reward for rage-quitting, no punishment either.

---

## 4. Daily / weekly / monthly loops

### 4.1 Daily streak (gentle)
`prog.streakDays, prog.streakLast (server day), prog.freezes`. **Finishing any match (win OR loss, not training) stamps the day.** Reward on the first match each day in a 7-day cycle: 50/75/100+🔑/125/150/200/Silver chest+3💎; each completed cycle +10% coins (cap +50%, part of the `bonus` term in §1.2). Milestones 7/14/30/60/100/365 → gems + titles. **Freezes are free only:** 1 refill every Monday (max 2 held) + calendar day 10; a missed day auto-consumes one; otherwise the streak resets and a one-time, non-timed "הצל את הרצף 💪" (play 1 match within 48 h) is offered once per 30 days. **No evening pulse, no "ends tonight" text, no countdown, no freeze for coins or gems.** The flame simply shows "🔥 יום 12" on home and the end card shows "יום 12 ✔" on the first match of the day.

### 4.2 3 daily missions
`prog.dm={key,ids[3],prog{},done[]}`, seeded by the server day from a pool of 16 (score 5 goals · win 1 · play 2 (always slot 1) · win Match of the Day · play 1 Quick · header · 3 slides · cup shootout · win at Hard+ · play 2v2 or online · score in the first 30 s · clean-sheet win · use ice/fire 2× · open a chest · score with an Israeli player · win by 2+). Each 40 coins + 10 XP + 10 pass points; all three → +1 key + 25 XP. One free reroll/day, extra 5 gems. Reset at server midnight.

### 4.3 28-day calendar + the daily pickup (one tap)
`prog.cal={month,claimed[]}`. The "🎁 איסוף יומי" button opens one modal with up to three rows: today's calendar tile (40→120 coins rising; day 3 and 10: 1 key; day 7: Bronze chest; day 14: 5 gems; day 21: 2 sticker packs (150 coins before the album); day 28: exclusive monthly kit), the free daily Bronze chest, and (wave 3) the free sticker pack — one "קח הכול" button. Skipped days are not lost (claim counter, not date). Tomorrow's tile shown dimmed. Opens automatically on first home visit of the day after the first session.

### 4.4 Match of the Day (keeps `dailyInfo()` opponent/level)
Pays the MOTD multiplier (§1.2) + 1 trophy + 30 XP once/day; Sunday = boss-level opponent at ×3. Winners write `daily/<day>/<uid>={name,margin,t}` (uid-keyed by rules); the modal shows the top 10 (bounded read `orderBy="margin"&limitToLast=10`) and friends' rows. Replayable for normal rewards.

### 4.5 Weekly
Monday: new weekly challenges (pool 24; 150–450 coins + 2 gems each; all four → Gold chest), streak-freeze refill. **Carry-over rule:** an unfinished challenge whose id is redrawn keeps its progress; otherwise it converts to pass points = `floor(progress/n × 50)` (max 50 per challenge, toast "המרנו 30 נק' לפאס"), nothing else. Wednesday 12:00 → Thursday 23:59: Boss of the Week window (wave 3). Sunday 12:00 → Tuesday 21:00: weekend tournament (wave 3). Sunday: shop drop (1 new + 1 returning item) + "double coins Sunday" (cap 900) + the channel's weekly code.

### 4.6 Monthly
Season = calendar month (`seasonKey` via Asia/Jerusalem). New free pass track, league prizes + soft reset, calendar day-28 kit, 1 new catalogue item, Hebrew-calendar holiday events.

### 4.7 Lapsed players (comeback kit, wave 2 — only after automatic backup, §9.7, has shipped in wave 1)
`prog.lastPlay`. Gap 3–6 days → "התגעגענו! 🎁": 300 coins + Silver chest + streak restored (once/30 days). ≥7 days → +10 gems + Gold chest + 3-day comeback multiplier (part of the single-multiplier formula, capped). ≥30 days → also "choose any character up to 3,000". On iOS Safari (not installed) storage can be evicted after 7 days without a visit; the profile comes back from the cloud save by uid (§9.7) before the kit is evaluated, so the gift lands on the real profile. Admin panel: "lapsed 7+ days" list (from `users.t`) + one-tap 48-h comeback code (`lapsedOnly:true`, checked client-side against `lastPlay`).

---

## 5. Chests, shop, cosmetics, collection

### 5.1 Chests — fixed bundles by default (no loot boxes)
| Chest | Cost | Contents (printed on the chest) |
|---|---|---|
| Bronze | 1 🔑 or 150 🪙 | 80 🪙 + 1 sticker pack (100 🪙 before the album) |
| Silver | 3 🔑 or 500 🪙 | 300 🪙 + 2 packs + **pick 1 of 3** rare cosmetics (face-up cards from the unowned rare pool, seeded by day+uid) |
| Gold | 8 🔑 or 25 💎 | 900 🪙 + 3 packs + 5 💎 + **pick 1 of 3** epic cosmetics (one of the three is always a kit) |

No rarity roll, no pity, no duplicates, no "cracking" animation — the chest opens on one tap, cards flip and the kid chooses; confetti on Gold. `ECON.randomChests` (default **false**, signed config) can enable the old odds tables (kept in a comment block) only if the author wants them later; the rule here is deterministic-first. **Free daily Bronze** is part of the daily pickup (§4.3). Chest coins never exceed ~3 matches (Gold 900 ≈ 3 Classic wins).

### 5.2 Daily rotating shop (seeded by server day — same for everyone)
`#shop` tabs: **היום** · **שחקנים** (80 characters, rarity frames bronze ≤1,000 / silver ≤3,000 / gold ≤7,200 / icon >8,000 + trophyOnly; filters all/🇮🇱/free/**אגדות**/rarity) · **מראה** (owned cosmetics, equip) · **💎** · **כוחות**. Rotation = 5 slots: (1) character of the day −30% coins or `ceil(price/100)` gems (unowned; seed+1 if owned), (2–3) coin cosmetics, (4) gem item (each exclusive at most once per 10 days), (5) chest deal (Silver 400). Countdown "מתחדש בעוד 7:12". Reroll 5 gems. `prog.bought[dayKey+slot]` marks SOLD. Sunday drop: 1 new item from the backlog (Appendix B) + 1 returning. Holiday items with countdown (§7.4).

### 5.3 Cosmetics (parameter overrides on the existing renderer; 24 items at launch, all data lines, no new SVG art)
`prog.cos={kits[],boots[],balls[],stadiums[],celebs[],titles[]}`, `prog.eq={kit,boots,number,ball,stadium,celeb,title,color}`; `playerSVG(c, skin)` merges `skin` over `c`; `leg()` takes a `boots` colour instead of `#23232b`; ball = swap the SVG in `#ball`; stadium = `PITCH_THEMES` entry (colours + stand palette). Sprite cache keyed by (char, eq) with an LRU of 40 entries (≈ 2 MB max). Loadout broadcast in the party pick message. Item names are 4-language keys like everything else.

### 5.4 Celebrations + emotes (wave 2)
Celebration = CSS keyframe on the scorer's sprite during the existing `celebrate` state (1.2 s): siu, knee slide, backflip, dab, robot, shh; `netEv('celeb:id')`. 4 preset emotes 😂 😎 🔥 👏 (keys 1–4, tiny 😀 touch button near pause; 4-s cooldown; "השתק אימוג'ים" in settings). Bots emote by personality. Emotes are fixed pictures, never text.

### 5.5 Sticker album (wave 3, deterministic)
100 stickers: 80 characters + 10 stadiums + 10 gold "moments". `prog.album={have:[ids], seq}`; a **pack = the next 3 stickers of a per-player shuffled order** (seeded by `saveId`), so no duplicates, no swaps needed, album complete after 34 packs; gold moments sit at fixed pack numbers (5, 10, 15 …). Packs from chests, calendar day 21, missions, 1 free/day in the daily pickup. Page complete → 300 coins + 1 key; full album → 50 gems + "אלבום מלא" title + gold-foil kit. "Pick any sticker" 8 gems reorders the sequence. Owning a character's sticker → −10% on that character.

### 5.6 Character mastery (wave 2, cosmetic only)
`prog.mastery[id]`: win 5, goal 1, clean sheet 3 (×2 online). Stars at 10/30/75/150/300 → 50/100/200/400 coins and, at 5 stars, a mastery recolour kit + a star on the card and name tag.

### 5.7 Titles & name colours (wave 2)
~25 titles from a **fixed list** (never typed): streaks, cup master, league, season, tournament, referrals, mastery, album + 6 bought for 400 coins. Shown in party box, leaderboard, friend modal, scoreboard, end card; `users.ttl` as an id. Name colours gold 40💎 / neon 60💎 / rainbow 80💎 (`users.color` as an id).

---

## 6. Bot AI **[touches core: decision parameters, one aiming parameter in `doKick`, never physics]**
Everything lives in `updateAI` (L4028), `LEVELS` (L2512) and one new `aimY` argument of `doKick`. The host still runs the bot, so PeerJS determinism is untouched; personalities derive from the opponent id hash, so every client can show them.

1. **Goal-aware shooting (new).** Today the bot kicks "forward"; the new rule: when the bot decides to kick within 220 px of the goal line, it picks `aimY` = the goal corner farther from the human keeper-side sprite (upper if the human is low, lower if high; Easy/Medium add ±err px noise). `doKick` receives `aimY` and only adjusts the launch angle inside today's allowed range — the arc/power code is unchanged. Sniper personality uses the low shot (`vy`×0.5 flat drive) 30%×`L.smart` of the time.
2. **Goal-line guard (new, defensive idea for the open goal).** Each bot has a `guardX` (own goal + 90 px). When the ball is in the bot's half and moving toward its goal faster than 250 px/s and the bot is not the closest to the ball, it retreats to `guardX` and mirrors the ball's y (clamped to the goal mouth), jumping when the ball's predicted height crosses it — a real keeper-ish behaviour instead of chasing. Trigger probability = `L.smart` (Easy guards 45% of the time, Master always).
3. **Power and skill use (new).** Scissors: Hard+ within 120 px, 5%/s (Trickster 8%). Ice/fire: only Master/Impossible/Boss, at most once each per match, only when trailing or in the last 30 s; the bot "owns" them by level flag, not by purchase; the same visual as the human's. 2v2 partner: wave 4 adds a pass (kick with `aimY` at the partner's y when the partner is ahead and free); until then today's support logic.
4. **Personalities, visible.** Hash %5: 🧱 Wall (defend trigger anywhere in own half, slide ×0.6, block-jump ×1.3, speed ×0.95) · ⚡ Sprinter (speed ×1.08, kick −0.1) · 🎯 Sniper (kicks only 60–170 px ahead facing goal, power +0.1, low shot) · 🤪 Trickster (hops ×2, err ×1.4, scissors 8%/s, emotes 😂) · 🐢 Turtle (speed ×0.9, err 0, always predicts). Weighted by level (Easy: Trickster 40%). Shown on the countdown and end card. **Impossible = one fixed profile ☠️ BOSS (all multipliers 1.0) with `speed` 1.65 → 1.45 and everything else as today; no mercy ever.** Personalities apply in party-vs-bots too.
5. **Newbie mercy (Easy only, visible).** `prog.matches<3`: opponent react +0.2 s, speed ×0.85; match 1 only: the bot sleeps during the 8–10-s controls overlay, then plays with the mercy numbers — the second goal of the first-to-2 is earned. These matches are excluded from the recommendation history.
6. **Coach mercy (visible).** Human trails by ≥2 (offline or party-vs-bots, not Impossible/tournament/human opponents): bot speed ×0.9, err +30 px, react +0.1 s, commentary "המאמן: הבוט קצת עייף 😉"; human leads by ≥3: speed ×1.05 (never above the next level) with "הבוט מתעורר!". Three straight losses at a level → mercy numbers from kickoff + Next-up suggests L−1; three straight wins → "נסה רמה קשה יותר".
7. **Level recommendation** replaces the Medium+/Hard+ half-step cards; the Medium→Hard wall is softened by mercy instead.
8. **Boss of the Week** (wave 3): Wednesday-seeded legend at recommended+1, fixed personality, gold kit, 'doom' pitch, uses ice and fire once each; Best-of-3 Quick; first win per week pays Gold chest + 10 gems + a boss sticker; window Wednesday–Thursday.

---

## 7. Progression, competition, events

### 7.1 Monthly league (wave 2)
Lifetime `prog.trophies` untouched. `prog.season={key,tr,peak,floor}`; per match: win +4/+6/+8/+10/+12/+15 by level (online +10, Classic +2 extra), draw +2, loss −4 but never below `floor` and never while in Bronze (0–19). Leagues: Bronze 0 · Silver 20 · Gold 50 · Platinum 100 · Diamond 200 · Champion 400; **crossing a threshold during the month sets `floor` to it.** **Rollover order:** (1) prizes claimed client-side from own `peak`; (2) `tr = min(100, floor(peak/2))`; (3) `floor = tr ≥ 20 ? 20 : 0` (carried trophies cannot fall into Bronze, but higher leagues must be re-earned); (4) `peak = tr`. Prizes: Silver 100 coins · Gold 200 + 1 key · Platinum 300 + 10 gems · Diamond 500 + 25 gems + season kit · Champion 800 + 50 gems + title "אלוף אוקטובר 👑"; everyone ≥20 gets a Silver chest. **Naming clash fixed:** lifetime `RANKS` are renamed to star ranks ("⭐ דרגה 1–10", `rank.0..9` strings in 4 languages, 10 keys) and shown only on the road, profile and the first pill until wave 2; the metal names belong to the monthly league alone. Heartbeat adds `{str, lg, lv, ttl, color, trDay}`.

### 7.2 Leaderboard rework (wave 2)
Sort by season trophies (then wins, goals); tabs הכל / חברים / השבוע (`users.ww`) / טורניר (wave 3) / מועדון (wave 4). `LEADER_BOTS` and `HIDDEN_NAMES` (L2716–2725) removed; hidden ids live in the signed `hidden/` node. Under 20 players: "הזמן חברים להופיע כאן" + share. Own row pinned ("#37 מתוך 212"). Rows: league badge, 🔥, title, level. Bounded read (§1.11).

### 7.3 Free season pass (wave 2, 30 tiers, no paid track)
`prog.pass={key,pts,claimed[]}`; 100 points/tier. Points: mission 10 (+15 all three), weekly challenge 100 (+ conversions §4.5), win 5 (max 100/day), 3-star 5, first match of the day 20, cup title 100. Active kid (~110/day) finishes in ~3 weeks. Rewards: coins 100–400, packs, keys, 5 gems every 5th tier, rare kit at 10, Bronze chests at 5/15/25, stadium at 20, legendary season kit + title at 30. Manual claims; unclaimed tiers auto-claim at month end.

### 7.4 Israeli holiday & seasonal events (wave 3, Hebrew calendar)
Dates come from `Intl.DateTimeFormat('en-u-ca-hebrew',{month:'long',day:'numeric',year:'numeric'})` → `{hm, hd}`; events are keyed by Hebrew date ranges: Hanukkah Kislev 25 → Tevet 2/3 (8 candles: one match a day, 8/8 → "סופגניה" ball + menorah stadium), Purim Adar 14 (Adar II in leap years — accept both "Adar" and "Adar II"), Pesach Nisan 15–21 (matzah ball), Yom Ha'atzmaut window Iyar 3–6 (blue-white kit, flag celebration, fireworks stadium, 2× trophies on the day), plus Gregorian ranges for summer vacation (July–Aug: 2 extra missions/day — **no fixed "peak hour"**), new school year (Sept 1–7), World Cup/Euro months. A signed `config/events` override lets the author shift a window without a release. Each event: 2–4 items purchasable only in the window, an event mission set, countdown banner, share button. Permanent: Sunday double coins (cap 900).

### 7.5 Tournament (wave 3) — Sunday 12:00 → Tuesday 21:00 Israel time
Via `Intl` Asia/Jerusalem. Tournament format (120 s, first to 3) vs seeded bots at Hard/Crazy/Master rotating by week, Impossible once a month, no mercy; score = 10/win + 2/goal + 5 clean sheet (max 25/match), best 5 matches count; `tourn/<week>/<uid>={name,pts,m,t}` with rules bounding `pts ≤ 25·m` and `m ≤ 60`. Live top 20 (bounded read) + gold chip on PLAY in the window. Prizes auto-claimed client-side on first open after close (no admin needed at night): #1 40💎 + "אלוף הטורניר" title + gold ball, #2–3 25/15💎, top 20 Silver chest, 3+ matches 200 coins. Admin "copy results" any time. Boss of the Week fills Wednesday–Thursday, so each half-week has something and Shabbat-observant kids miss nothing.

### 7.6 Trophy road retune (wave 1, same release as the currency migration — it is a data-table edit)
Keep the 622 stops. Characters only at the fixed stops (10 gloukh, 30 solomon, 50 zahavi, 100 goldstar, 150 streetking) and at every 10th former character slot (~11 more, cheapest first); every other former character slot pays `clamp(t/10, 50, 500)` coins; former XP stops pay `clamp(xp/4, 50, 500)` coins; every 4th stop up to 1,000 gives 1 key; multiples of 500 trophies give 10 gems, 2,500 give 25. **No single stop pays more than 500 coins**, so the road can never hand out Pelé in one tap. A road character already owned refunds price/10 in gems. Claims become a tap with toast + confetti (bug #10). Between now and launch nothing changes because the retune ships with the migration.

### 7.7 Training & cup (wave 1, small)
Training: first 3 drills/day pay 20 coins + 10 pass points with a target ("5 מתוך 10"); afterwards free. Cup: round wins pay 20/30/40/60/100 coins (replacing today's `addXP(2+cup.level.i)` at L5069 with coins + XP), final +1 key; first 3 cups/day. Weekly cup theme (wave 2): Monday-seeded 32 teams, finishing at Crazy+ gives "אלוף שבוע N".

---

## 8. Starter band & achievements (one table)
`PRICES` (L1770): khalaili 100, dabbur 300, gloukh 400, spiegler 400, griezmann 400 (exempt from the ×1.2 even-index bump). **Achievements (`ACH`, L1795) — one reward model:** each pays **coins = 5× its old XP value** (first_win 100, hat_trick 75, clean_sheet 125 … cup_master 600, win_impossible 1,500) **plus the old XP value into the Level meter**; only win_master (5), cup_master (5) and win_impossible (10) also pay gems. `achieve()` routes through `addCoins/addXP` (bug #12). No separate "first_win also pays 50 coins". Session-one maths: 3 Quick wins 60–90 + first_win 100 + welcome chest 100 + goals ≈ 300 → khalaili on day 1.

---

## 9. Social & promotion (WhatsApp-native)

### 9.1 Promotion basics (wave 1, S)
- **The link:** add `index.html` at the repo root (so the short link is `https://lupulior.github.io/game-lab/`) containing the OG/Twitter tags (`og:title` "כוכב הכדורגל ⚽", `og:description`, `og:image` = `art/og.png` 1200×630 with 5 characters, `og:url`) and an immediate `<meta http-equiv="refresh" content="0;url=game1.html">` + JS redirect that forwards the query string. WhatsApp's preview reads the tags from the URL it is given, so the channel always shares the short link. (Renaming `game1.html` itself is optional later; keep both working.)
- **"הזמן חבר" button** on home foot and the last onboarding card: `navigator.share({text})` or `wa.me/?text=` with "בואו לשחק כוכב הכדורגל ⚽ <short link>?ref=XXXX" — the `ref` is stored by the newcomer from day one; payouts come in wave 2.
- **Channel kit** (in `art/`): 3 phone screenshots (home, match, end card) + 1 square logo + 3 ready Hebrew posts (launch, weekly code, "new characters").

### 9.2 Deep links (wave 1, S)
Parse `location.search` on load, then `history.replaceState`: `?join=ABCD` → after the name prompt, a confirm "להצטרף למשחק של דני?" (host name read from the lobby/peer hello) — **never auto-join**; `?ref=XXXX` → `prog.ref`; `?code=GOAL77` → codes modal pre-filled, one-tap redeem; `?mode=daily|boss|tournament` → PLAY defaults there; `?club=` (wave 4). Party box gets "העתק קישור".

### 9.3 Share result card (wave 2: text S, PNG M)
End card "📤 שתף": text via `navigator.share({text})` / `wa.me`: "🏆 ניצחתי 3-1 נגד 🧱 ואן דייק ברמה קשה! 🔥 רצף 5 · ליגת זהב · שחקו נגדי: <short link>?ref=XXXX". PNG 1080×1080 later: no emoji, no `foreignObject` (sprites drawn by loading `playerSVG` output as a Blob-URL `Image`, so the canvas is not tainted), Hebrew via `ctx.direction='rtl'` + right-aligned text, league badge as a drawn shape, QR of the link; `navigator.share({files})` on Android, download on desktop; tested on 3 real phones before it is announced. 5 shares → "משפיען" title.

### 9.4 Referral (wave 2, two-sided, paid after the newcomer's 3rd win)
Code = `REF-` + 4 chars derived from the uid; newcomer stores `prog.ref` (from wave 1 on); after 3 wins writes `refs/<refKey>/<myUid>={name,t}` (uid-keyed by rules, 1 per newcomer, ≤10 children/month) and pays itself 300 coins + 10 gems; the referrer reads `refs/<myKey>` on home open and pays 300 coins + 10 gems + 1 key per unpaid entry (`prog.refPaid[]`), max 10/month. Self-referral blocked by uid. Titles: 3 friends "מגייס", 10 friends "Recruiter" kit; leaderboard tab "מגייסים".

### 9.5 CEO live-ops (wave 2, all writes signed by `admins`)
News banner `news/pub={text,until,link,icon}` (link allowed only to the game's own origin or `chat.whatsapp.com`, enforced in rules by string prefix), shown with the CEO sprite. Codes v2 `codes/<CODE>={coins,gems,keys,xp,max,used,exp,lapsedOnly}` + "צור קוד שבועי" one tap + ready Hebrew post; golden code 1/week (first 30). Post pack (Sunday drop, Monday challenges, Wednesday boss, Sunday tournament reminder, Tuesday results, season launch, comeback). QR on the CEO screen (tiny inline generator, lazy-loaded). "מה חדש" modal on version bump. Lapsed list, red flags, reset/hide/remove-entry buttons, prune button, `GAME_VERSION` line, measurement dashboard (§14).

### 9.6 Lobby list (wave 3, friends-only)
Hosts write `lobbies/<uid>={name,code,mode,lv,t}` on `mpHost`, refresh every 20 s, delete on start/teardown; entries older than 60 s ignored. The Online screen lists **only lobbies of players in my friends list** (names already known to the kid); a public list exists only behind the signed `config.publicLobbies` flag, off by default, and never for profiles with <10 matches. "הצטרף" → confirm → `mpJoin(code)`. Ban and hidden lists apply.

### 9.7 Automatic cloud backup + restore code (wave 1, M — before any lapsed-player feature)
`prog.saveId` = 10 random base32 chars on first run (shown in the "עוד" sheet as "קוד שחזור: ABCD-EFGH-IJ" with copy/share). **Automatic:** PUT `{d: compressed(prog+stats+cup+settings.name+auth refresh token), t, uid}` (≤20 KB) to `saves/<saveId>` after every end card, purchase and claim, throttled to once per 60 s, and on `visibilitychange`→hidden; rules: `saves` not listable, `saves/$id` writable only by its `uid` (first writer claims). **Automatic restore:** on load, if localStorage is empty (evicted) but `settings.saveId` survives in IndexedDB (we mirror the id there; Safari evicts both together only in the strictest case) or the kid types the code in the name modal ("יש לי קוד שחזור"), the profile and identity come back; a newer local save warns before overwrite. `navigator.storage.persist()` is requested after the 3rd session, and the install prompt (wave 2) removes the 7-day eviction entirely. No PIN, no password.

### 9.8 Clubs (wave 4, no wall/chat, no free text)
`clubs/<id>={name:presetIndex, emoji, code(6), created, members{uid:{name,lv}}, week{key,goals,wins,matches}}`. Club names come from a **preset list of 40** ("האריות", "הברקים" …) + emoji — no typed names. Create 50 gems; join by code; max 20; leave anytime; admin delete. Members' matches PATCH the week counters (`.sv increment`, bounded by rules). Weekly goal 15 goals/member → Silver chest + 10 gems for members with ≥5 matches; 2× goal → Gold chest. Club leaderboard top 20 (bounded read). **No messaging.**

---

## 10. End card (reward ceremony)
Vertical reveal, 0.3 s steps with tick sfx: score + stars → 🪙 line with breakdown ("+30 ניצחון · +9 גולים · +10 שער נקי · ×1.3 רצף · ×2 יום ראשון") and the cap bar → ⭐ XP ring (goal XP shown here, no toasts during play) → 🏆 season delta with league bar (wave 2) → 🔑 earned ("פתח עכשיו") → mission ticks → pass bar (wave 2) → "יום 12 ✔" → mastery points → bot personality line. Buttons: **▶ עוד משחק** (new opponent, same mode/level), 🔄 שוב (same opponent), 📤 שתף, 🏠. Loss card still shows +8 coins and a tip from match stats. Online: "שחק שוב" request to the party.

---

## 11. Bugs & polish (verified against the file)
1. `selected` (L2342) resets to Mbappé on reload → persist `prog.selectedId` + equipped cosmetics.
2. `dayKey()` (L1815) is UTC → daily/missions/streak flip at 02:00–03:00; `weekKey` (L4402) is local. Both move to server-offset time (§1.10); season/tournament keys via Asia/Jerusalem.
3. `tryBuy` (L2482) uses `confirm()` → breaks fullscreen on phones → in-game confirm modal reused for purchases, quits, resets.
4. Legends filter branch exists (L2455) without a button → "🏆 אגדות" chip + rarity chips.
5. `LEADER_BOTS` + `HIDDEN_NAMES` (L2716–2725) → removed (§7.2).
6. `sc.desc` says scissors is once per match; `SC_CD=.8` → fix in 4 languages.
7. Level-modal hint "first to 3 / 4 minutes" for all levels → per level and format.
8. Weekly challenge progress wiped on Monday → carry-over/convert (§4.5).
9. `#btn-party-leave` always hidden → shown in the party bar.
10. Trophy-road `ready` state never renders → manual claim tap + toast + confetti.
11. Exit modal has only "stay" → add "חזרה למסך הפתיחה"; Android back handled (§2.3).
12. `achieve()` (L1809) adds XP directly → route through `addCoins/addXP`.
13. Ban check uses the local clock → server timestamp (§1.10).
14. Dead code removal (~250 lines): hero 3D/turntable loader, `#mp-pick/#mp-gallery/#mp-duo/#mp-pick-code`, first `mpTaken`, `#board*` CSS, `#sc-preview/#sc-hud`, empty `CODES` map.
15. `document.title` "(1) Football Star" while something is claimable.
16. **New:** `addXP(1)` per goal (L3789, L4477) toasts during play → goal XP accumulates in `matchXP` and shows on the end card only; `addCoins` never toasts mid-match.
17. **New:** `prog.streak=0` on a draw (L3738) → a draw keeps the win streak (only a loss resets it); the +10%/step bonus reads the corrected field.
18. **New:** "again" (L3752) replays `lastMatch` with the same opponent → "▶ עוד משחק" picks a new opponent; "🔄 שוב" keeps the old path.
19. **New:** every new modal is placed inside `#stage` (so `#rotate` and fullscreen scaling behave like today's modals) and the `UI` stack keeps at most one modal + the sheet open.
20. **New:** leaderboard/friends whole-node GETs (L2721, L2975) → bounded `orderBy`/`limitToLast` reads.
21. Every new string goes into `I18N_RAW` in he/en/ar/ru (budget ~350 keys); `prefers-reduced-motion` respected for confetti/holographic effects.

---

## 12. Implementation waves (each ships alone with a version bump)

**Wave 1 — foundation (≈4–5 weeks): currencies, shop, daily loop, navigation, safety.**
Order: ECON object → bug sweep (#1–#3, #16–#18 first) → **Firebase hardening** (anonymous sign-in, rules, admin uid) → currencies + migration + Level + welcome gift → payout formula/cap/Impossible fix → trophy-road retune → **automatic cloud backup + restore code** → FORMAT (Quick/Classic/Golden/Bo3 + sudden-death kicks + party version check + per-seat payouts) → smart PLAY + home cards + top bar + Next-up → "עוד" sheet + back button → streak → 3 missions → calendar + daily pickup → keys + fixed chests → shop screen + rotation + locker + 24 cosmetics → end card ceremony → starter band + achievements table + 3-match onboarding + controls overlay → bot personalities + brain + mercy → deep links + invite button + `index.html` OG → cup/training coins → measurement counters + admin dashboard → size budget work (§15). After wave 1 the loop is complete and safe: open → one pickup → PLAY → earn → open chest → equip → tomorrow's tile visible.

**Wave 2 — progression, social, promotion (≈3–4 weeks).**
PWA manifest + install prompt (no service worker) → share text (then PNG) → referral payouts → monthly league + star-rank rename + leaderboard rework → free pass → weekly challenges rework → Match of the Day board → comeback kit → mastery → celebrations/emotes → titles/name colours → CEO live-ops (news, codes v2, post pack, QR, what's new) → weekly cup theme.

**Wave 3 — bigger features (≈3 weeks).**
Sticker album (deterministic packs) → Boss of the Week (Wed–Thu) + tournament (Sun–Tue) → Hebrew-calendar events + Sunday double coins → friends-only lobby list → optional pass-through service worker with kill switch (only if the install prompt needs it).

**Wave 4 — only once waves 1–3 show enough players.**
Clubs (preset names, no wall); partner AI passing; album "pick" extras; more stadiums.

---

## 13. Risks & mitigations
1. **Scope:** ~48 items ≈ 3–4 months for one developer; wave 1 alone is a complete game.
2. **Complexity for under-13s:** 4 pills, one daily pickup, one Next-up line; pass/league/album appear only after chests and shop have been used.
3. **Season trophy loss:** never in Bronze, floors, visible mercy; watch the channel two weeks, raise floors via ECON.
4. **Randomness:** none by default; chests are printed bundles with "pick 1 of 3"; sticker packs are sequential. The random tables exist only behind a signed flag.
5. **Firebase safety:** anonymous auth + rules; if the author skips the console step, the unsafe features are not shipped.
6. **Migration bugs:** `prog.migrated` flag; test with saved localStorage snapshots incl. an admin profile and a pre-wave-1 guest.
7. **Service worker:** none until wave 3; manifest + OG only. If Chrome's install prompt needs a SW, ship a pass-through SW (no caching) with a `GAME_VERSION` kill switch so `checkUpdate()` keeps working.
8. **Time zones / clock cheating:** server offset for all keys; held rewards when the clock is off.
9. **i18n:** keys in all four languages in the same commit; a build-time check lists missing keys in the console.
10. **Economy first-try error:** expected; ECON + signed config multipliers.
11. **Content treadmill:** 24 items prepared before launch (Appendix B), cadence 1 new + 1 returning per week, all items are data lines on the existing renderer.
12. **Streak pressure:** no evening prompts, no paid freezes; the streak is a flame, not a leash.

---

## 14. Measurement (what the author will look at before building wave 2)
`users/<uid>` gets `{sess (sessions), days (bitmask of the last 28 server days), mToday, lastDay, cE (coins earned, lifetime), cS (coins spent), sh (share taps), rf (referrals completed)}`, updated by the heartbeat (bounded increments by rules). `stats/<day>` holds `{dau, matches, newPlayers, shares, chests, buys}` via `.sv increment`. Admin dashboard tab reads the last 14 `stats` days + a bounded `users` sample and shows: matches/session, D1 and D7 return rates (from `days` bitmasks), coins earned vs spent, shop sell-through (buys/opens), share taps, referrals. Decision rule: wave 2 starts only when D1 ≥ 35% and matches/session ≥ 3 over two weeks, otherwise ECON is retuned first.

## 15. File-size and boot budget
Today 453 KB / 5,100 lines. Budget: wave 1 ≤ 650 KB, hard cap 800 KB for `game1.html`. Measures: (a) the en/ar/ru `I18N_RAW` tables move to `i18n/en.json` etc. loaded on demand (Hebrew stays inline) — saves ~90 KB now and stops i18n growth from bloating boot; (b) shop/album/pass/chest screens build their DOM on first open; (c) the PNG card and QR generators live in `extras.js`, loaded on first use; (d) sprite LRU cache of 40; (e) cosmetics and events are data lines, not SVG; (f) GitHub Pages serves gzip, so the wire size is ~¼; (g) a boot timer logs "ready in N ms" to the admin dashboard, target < 1.5 s on a 2019 Android. The game remains "one page"; the extra files are optional helpers the author can inline if he prefers a single file.

---

## Appendix A — Firebase rules (paste once in the console)
```json
{ "rules": {
  "users":   { ".read": true, ".indexOn": ["str","t","w"],
               "$uid": { ".write": "auth != null && auth.uid == $uid",
                         "name": { ".validate": "newData.isString() && newData.val().length <= 16" },
                         "str":  { ".validate": "!data.exists() || newData.val() - data.val() <= 15" },
                         "lv":   { ".validate": "newData.val() <= 200" } } },
  "admins":  { ".read": "auth != null && data.child(auth.uid).exists()", ".write": false },
  "news":    { "pub": { ".read": true }, ".write": "root.child('admins/'+auth.uid).val() == true",
               "pub": { "link": { ".validate": "!newData.exists() || newData.val().beginsWith('https://lupulior.github.io/') || newData.val().beginsWith('https://chat.whatsapp.com/')" } } },
  "config":  { "pub": { ".read": true }, ".write": "root.child('admins/'+auth.uid).val() == true" },
  "hidden":  { ".read": true, ".write": "root.child('admins/'+auth.uid).val() == true" },
  "bans":    { ".read": true, ".write": "root.child('admins/'+auth.uid).val() == true" },
  "codes":   { "$c": { ".read": true, ".write": "root.child('admins/'+auth.uid).val() == true",
                       "used":  { ".write": "auth != null && newData.val() == data.val() + 1" },
                       "users": { "$uid": { ".write": "auth != null && auth.uid == $uid && !data.exists()" } } } },
  "saves":   { "$id": { ".read": true, ".write": "auth != null && (!data.exists() || data.child('uid').val() == auth.uid)",
                        ".validate": "newData.child('uid').val() == auth.uid" } },
  "daily":   { "$day": { ".read": true, ".indexOn": ["margin"], "$uid": { ".write": "auth != null && auth.uid == $uid" } } },
  "tourn":   { "$wk":  { ".read": true, ".indexOn": ["pts"],   "$uid": { ".write": "auth != null && auth.uid == $uid",
                         ".validate": "newData.child('pts').val() <= newData.child('m').val() * 25 && newData.child('m').val() <= 60" } } },
  "refs":    { "$ref": { ".read": true, "$uid": { ".write": "auth != null && auth.uid == $uid && !data.exists()" } } },
  "lobbies": { ".read": true, "$uid": { ".write": "auth != null && auth.uid == $uid" } },
  "stats":   { ".read": true, "$day": { ".write": "auth != null" } },
  "clubs":   { ".read": true, "$id": { ".write": "auth != null" } }
} }
```
(Admins delete/prune with the same `admins` rule; the author adds a `.write` admin clause to any node that needs pruning. Keep `users` readable for the leaderboard; everything personal stays in localStorage/saves.)

## Appendix B — launch content backlog (24 items, all parameter data)
Kits (10): Israel blue-white 600 (welcome), red-black 600, neon 1,200, gold foil 60💎, purple-stripes 800, green-hoops 800, pink 800, black-gold 1,500, sky-white 600, retro-70s 1,200. Boots (4): white 300, gold 900, neon-green 500, red 400. Balls (4): Israel flag 500, flame 1,200, galaxy 150💎, classic brown 300. Stadiums (3): beach 1,500, snow 2,000, night-lights 2,500. Celebration (1): knee slide 800. Titles (2 bought packs of 3, 400 each). Plus 6 reserved for the first 6 Sunday drops: desert stadium, space stadium, 2 kits, 2 boots. Event items are separate (Hanukkah ball + stadium, Purim kit, Pesach ball, Independence kit + stadium).

## Appendix C — critic closure map
GAPS: backup → §9.7 wave 1 before §4.7 · per-seat payouts → §3.3 · "עוד" sheet + back → §2.2–2.3 · bot brain → §6.1–6.3 · Golden Goal tiebreak → §3.1 · pass conversion → §4.5 · multiplier stacking → §1.2 · migrated level rewards → §1.6 `lvClaimed` · data lifecycle/reads → §1.11 · holidays → §7.4 Hebrew calendar · promotion basics → §9.1 · bug list → §11 #16–#20 · tutorial → §2.5 step 1 · measurement → §14 · size budget → §15.
CONTRADICTIONS: achievements → §8 one table · starter kit → once, §2.5 step 2 · onboarding chest → fixed welcome chest · road → §7.6 wave 1, ≤500/stop · plausibility → §1.12 with rules bounds, admins exempt · xpTotal → §1.6 excludes trophyOnly/free, clamp L30 · gems day-1 → 10 + Silver, Gold gives 5, cap includes chests · Quick vs Classic → ×2.5, +2 season, counts as 2 matches · two ladders → star ranks vs metal leagues · reset vs floor → §7.1 order · three rituals → one pickup §4.3 · wave order → deep links/invite/cup-training in wave 1, referral payout wave 2 · newbie mercy → overlay sleep then real play, excluded from recommendation · Impossible → one profile, speed 1.45 · keys → one 3/day cap for all wins.
PROBLEMS: loot boxes → §5.1 fixed bundles, random opt-in flag · news phishing → signed node + link whitelist · lobby/auto-join → friends-only + confirm · names → uid-bound names, preset club names, fixed titles, hidden list · saves listing → rules · service worker → none until wave 3, pass-through + kill switch · client clock → §1.10 · fake refs/daily → uid-keyed + caps · PNG → M, no emoji/foreignObject, tested · event toggle → signed config; peak hour dropped · treadmill → Appendix B + lower cadence · size → §15 · party versions → §3.2 · streak pressure → §4.1 · tournament window → Sun–Tue, auto-claimed prizes.