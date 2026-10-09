# Module: chests (files `20-chests.*`) — keys 🔑 + fixed-bundle chests, pick 1 of 3

Spec: PLAN.md §5.1 (fixed bundles, no loot boxes), §1.6 (keys), §2.1 (Chests button with key badge), §2.5 step 2 (welcome chest).

## Files
- `src/css/20-chests.css` — the `#chests` screen, the `#chest-open-modal`, the pick cards, the gold confetti canvas.
- `src/html/20-chests.html` — `<section id="chests">` (title, back, wallet pills, 3 chest cards, welcome / pending banners), `#chest-open-modal`, `#chests-confetti`.
- `src/js/20-chests.js` — everything below.
- `src/test/20-chests.js` — 50 assertions (`./test.sh chests` → `"errs":[]`, all PASS).

## What it does
- **Three chests** (Bronze / Silver / Gold) with printed contents and both prices, the inventory count on each ("יש לך 2", red ×N bubble, wiggling box), the wallet (🔑 🪙 💎, the key pill turns red at the 10-key cap), and one big OPEN button per chest whose label says how it will be paid: owned chest first (green, no question), else keys, else coins/gems (yellow; `ask()` before paying), else grey "חסר 🔑 N".
- **Opening** (`openChest`): one tap → the modal: chest icon pops (CSS), reward chips slide in (🪙, 🎴 packs = 🪙, 💎), `sfx.win()`, confetti on Gold (own canvas, since the core `#confetti` lives inside `#game`). Coins/gems are added through `addCoins`/`addGems` (one `addCoins` call for chest coins + pack coins). Then, for Silver/Gold, **pick 1 of 3** face-up cards; tap one → the cosmetic lands in the locker; the other two fade; "✔ סיימתי" closes.
- **Sticker packs**: the album does not exist yet, so every pack pays `ECON.chests.packCoins` (100 🪙) now and `prog.packs` counts them. If a future album defines `givePack(src)`, packs go there instead and pay no coins.
- **Pick pool**: unowned cosmetics of the chest's rarity (rare for Silver, epic for Gold) excluding items with `week` (reserved Sunday drops) unless the shop defines `cosAvailable(c)` and says yes. Gold's first card is always a kit. Short pool → fall back to the other rarity → then "🪙 200" cards (`ECON.chests.missingCard`; tapping one pays 200). Owned items are never offered; a second tap on the cards does nothing.
- **Deterministic + reload-safe**: the offer is seeded by `dayKey()|kind|count` (count = chests of that kind opened so far, `prog.chestOpened[kind]`), and the unpicked offer is stored in `prog.chestPick` — reopening the screen (or reloading) shows the same three cards until one is picked; the screen shows a "🎴 יש לך קלף לבחור!" banner meanwhile, and `openChest()` refuses to open another chest until the pick is done.
- **Welcome chest** (`openWelcomeChest`): fixed 100 🪙 + `kit_il`, exactly once (`prog.welcomeChest`), through `giveCosmetic` when the shop has it, else `prog.cos.items`. Also shown as a green banner in the screen while `prog.chests.welcome>0`.
- **Free daily Bronze** (`claimDailyBronze`): one Bronze per server day through `dayCounter('chestDay')`.
- **Cosmetics hand-out**: `giveCosmetic(id)` if the shop module defines it, else `prog.cos={items:[...]}` push + toast — never a duplicate.

## Public functions (plain globals)
| function | what |
|---|---|
| `giveChest(kind, silent?)` | +1 to `prog.chests[kind]` (`bronze|silver|gold|welcome`), toast, `Hooks.emit('chest', kind)`; returns bool |
| `openChestsScreen()` / `closeChestsScreen()` | show / leave the `#chests` screen (reopens a pending pick) |
| `openChest(kind)` → Promise<bool> | pay (owned → keys → coins/gems with `ask()`), add rewards, show the modal and the pick |
| `openWelcomeChest()` → bool | 100 🪙 + `kit_il`, once; false afterwards (the onboarding module calls this) |
| `claimDailyBronze()` → bool | one free Bronze chest per day (the daily-pickup module calls this) |
| `chestsBadge()` → number | chests openable now = inventory (all kinds) + one per kind whose key price the wallet covers |
| `chestCanOpen(kind)` → `'owned'|'keys'|'coins'|'gems'|null` | how a chest would be paid right now |
| `chestPickOffer(kind, count?)` | pure: the 3 card ids for that kind/count (`'coins'` = a 🪙200 card) |
| `refreshChestsBadge()` | fills `#chests-badge` (text = count, `hidden` when 0, class `full` at the key cap) and toggles `.has-chest` on `#btn-chests`, if those elements exist |
| `buildChests()` | re-render the screen (called on every open, give, pick, done) |

## ECON
`ECON.chests = { bronze:{keys:1, coins:150, gems:0, give:{coins:80, packs:1, gems:0}, pick:null}, silver:{keys:3, coins:500, give:{coins:300, packs:2}, pick:'rare'}, gold:{keys:8, gems:25, give:{coins:900, packs:3, gems:5}, pick:'epic', kitAlways:true}, welcome:{give:{coins:100}, kit:'kit_il'}, packCoins:100, missingCard:200, pickCount:3, dailyBronze:1, kinds:[...] }`.

## Hooks
- Emits: `'chest'(kind)` on `giveChest`; `'chestOpen'(kind, rewards)` after an open (`rewards={coins,packs,packCoins,gems}`; for the welcome chest `{coins,kit}`); `'chestPick'(id)` when a card is chosen (`'coins'` for the coin card).
- Listens: `'home'` and `'wallet'` → `refreshChestsBadge()`; `'screen'` (`'chests'`) → `buildChests()`.
- `NextUp.add`: prio **40**, "יש לך תיבה לפתוח!", action `openChestsScreen`, whenever `chestsBadge()>0`.

## prog fields
`prog.chests={bronze,silver,gold,welcome}` (inventory), `prog.packs` (sticker packs owed to a future album), `prog.chestDay={key,n}` (free daily Bronze), `prog.chestOpened={kind:n}` (seed counter), `prog.chestPick={kind,rarity,ids,seed}|null` (unpicked offer), `prog.welcomeChest` (true once granted), `prog.cos.items` (only when no shop module).

## What the home screen must wire
- A **🎁 Chests** button → `openChestsScreen()`. Give it `id="btn-chests"` and a child `<span id="chests-badge" hidden></span>` (count of openable chests; `refreshChestsBadge()` keeps it current on every `'home'`/`'wallet'` hook; it gets class `full` when keys are at the cap so the home can colour it red "פתח תיבות!"). The core's `updateXpBadge()` also fills an element with `id="key-badge"` ("🔑 N") if the home adds one.
- Next-up card: `NextUp.best()` already returns the chest candidate (prio 40) — just render it.
- Onboarding (§2.5 step 2): after match 1 call `openWelcomeChest()` (one tap: "הנה המפתח הראשון שלך 🔑" → the modal shows 🪙 +100 and 👕 כחול-לבן). Or `giveChest('welcome')` to let the kid open it from the screen banner.
- Daily pickup (§4.3): call `claimDailyBronze()` inside the one-tap pickup.
- Migration welcome modal (PLAN §1): the foundation pays 300 🪙 directly; if the integrator wants the planned Silver chest instead, `Hooks.on('welcome', ()=>giveChest('silver'))` is one line.

## Open questions
1. **Keys ask**: the spec says "ask() before paying"; I ask for keys too (one tap). If keys should open without a question (they are the intended currency), drop the `how==='keys'` branch's `ask`.
2. **Missing cards**: "200 🪙 per missing card" is implemented as a 🪙200 card the kid can pick (so it is still "pick 1 of 3"); if it should be paid automatically for every missing slot, change the `'coins'` handling in `chestPickOffer`/`openChest`.
3. **Reserved `week` items**: excluded from the pools until a shop function `cosAvailable(c)` says they are out. With the launch catalogue the epic pool is 7 items (Gold falls back to rare after ~7 Gold chests, then to coin cards).
4. **Badge semantics**: `chestsBadge()` = inventory + one per kind affordable with keys (8 keys, empty inventory → 3). If the home wants "inventory only" or "keys ≥ 1 → 1", it is one line.
5. `prog.packs` is only a counter; the album module (wave 3) should honour it (`givePack` hook ready).
