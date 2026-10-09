# Module: shop + cosmetics + locker (`10-shop.*`)

Files: `src/css/10-shop.css`, `src/html/10-shop.html`, `src/js/10-shop.js`, `src/test/10-shop.js` (61 assertions, `./test.sh shop`).
No core changes were needed (nothing appended to `CORE-REQUESTS.md`); `buildPitch` and `applyLang` are wrapped by monkey-patching.

## What it is
A full screen `<section id="shop" class="screen">` with five tabs (icon + text, ≥44 px): **היום / שחקנים / מראה / 💎 / כוחות**, a back button (`showScreen('home'); refreshHome()`) and the wallet (coins + gems, refreshed on `Hooks 'wallet'`). Each tab's DOM is built only when it opens.

- **היום** — 5 slots seeded by `dayKey()` (FNV hash → mulberry32; identical for everyone on the same day):
  1. character of the day — unowned, not free, not trophy-only (walks to the next unowned one deterministically); −30% coins (`round(price·0.7/10)·10`) **or** `ceil(price/100)` gems;
  2–3. two coin cosmetics (unowned first; a bought slot keeps showing the bought item as SOLD);
  4. gem item — a 10-day cycle (`ECON.shop.gemCycle`) in which each gem exclusive (kit_gold, ball_galaxy, the 3 name colours) appears exactly once; the other days offer a Gold chest for 20 💎 instead of 25;
  5. chest deal — Silver chest for 400 🪙 (`giveChest('silver')` if the chests module exists, else `prog.chests.silver++`).
  SOLD marks: `prog.shop.bought[dayKey(+'r' after a reroll)+':'+slot] = id` (older days are pruned). Countdown "⏳ מתחדש בעוד H:MM" to local midnight (refreshed every 30 s; the tab rebuilds itself when the day flips). Reroll 5 💎 once/day (`prog.shop.reroll = dayKey()`), re-seeds all five slots for this player only.
  Sunday drop: items with `week` are sold once `week ≤ shopWeek()`; they carry a 🆕 badge during their week.
- **שחקנים** — all 80 characters with rarity frames by price (bronze ≤1000 / silver ≤3000 / gold ≤7200 / icon >8000 / trophy-only), filters הכול / 🇮🇱 / חינם / אגדות / ברונזה / כסף / זהב / אייקון, tap → preview (sprite, rarity tag, price) + buy via the core `tryBuy(c)` (full price, `ask()`), or ✔ בחר (sets `selected`, emits `select`, `refreshHome()`). The old `#chars` screen is untouched.
- **מראה (the locker)** — owned cosmetics grouped by type with equip/unequip, plus a live preview of my character wearing the kit/boots/number, the equipped ball and title, and the name in the equipped colour. Also sells nothing: the shirt-number item (`number_pick`, 500 🪙, from the Today/gem flows or `giveCosmetic`) gets a −/+ picker here (`prog.eq.number`, 1–99).
- **💎** — kit_gold 60, ball_galaxy 150, name colours gold 40 / neon 60 / rainbow 80 (`prog.eq.color = 'gold'|'neon'|'rainbow'`, ownership ids `color_gold|color_neon|color_rainbow` in `prog.cos.items`).
- **כוחות** — ice and fire (10,000 🪙 each) through the core `tryBuyIce()` / `tryBuyFire()`, owned state shown.

Every purchase goes through `ask()`, `spendCoins`/`spendGems`, and emits `Hooks.emit('purchase', {type, id, price, gems})` (`type` = `kit|boots|ball|stadium|celeb|title|color|number|char|chest|power|reroll`). A bought cosmetic is auto-equipped.

## Cosmetics rendering
- `skinFor(c)` (checked by `playerSVG`): only for **my** character (`c.id===CHARS[selected].id`), never in training or while spectating; merges the equipped kit data, the boots colour and `prog.eq.number`.
- `ballSkin()` (checked by `ballSVG()`): a 30×30 SVG for the equipped ball — patterns `classic` / `flag` / `flame` / `galaxy`. `#ball` is refreshed on equip and on every `screen:'game'`.
- Stadiums: every stadium item's `data` is registered as `PITCH_THEMES[item.id]` at load; `buildPitch` is wrapped so an offline 1v1 `'day'` pitch (no `mp`, no `v2`, not spectating) draws the equipped stadium (night themes just use their colours). `pitchTheme` keeps the name the core asked for, so the core's rebuild check keeps working; equipping sets `pitchTheme=''` to force a rebuild at the next kick-off.
- Titles: `prog.eq.titlePack` (pack id) + `prog.eq.title` (index into the pack); `titleText()` returns the localized title (or `''`).
- Celebrations: `prog.eq.celeb = item id` only (another module animates it).
- Name colour: `nameColorClass()` → `'shop-nc-gold'|'shop-nc-neon'|'shop-nc-rainbow'|''` (CSS classes are defined in `10-shop.css`; apply them to any name tag).

## Public functions
`openShop(tab)` (`'today'|'players'|'looks'|'gems'|'powers'`), `giveCosmetic(id)` (adds to `prog.cos.items`, toast, emits `cosmetic`, returns `false` if owned/unknown), `equipCosmetic(id)`, `unequipType(type)`, `equipTitle(packId, i)`, `setShirtNumber(n)` (0 = default), `ownedCosmetics(type?)`, `unownedCosmetics(rarity?)` (catalogue only, available this week — use it for "pick 1 of 3"), `skinFor(c)`, `ballSkin()`, `titleText()`, `nameColorClass()`, `shopHasNew()` (red dot), `shopWeek()`, `shopRotation()`, `shopItem(id)` (catalogue + name colours + shirt number), `charRarity(c)`, `charDealCoins(c)`, `charDealGems(c)`, `shopBuyItem(item, slotKey?)`, `shopBuyChar(c, useGems, slotKey?)`, `shopBuyChest(kind, coins, gems, slotKey?)`, `shopReroll()`, `shopRefresh()`.
Data: `SHOP_EXTRA` (the non-catalogue items), `ECON.shop = {launch:'2026-10-12', charOff:.3, rerollGems:5, silverDeal:400, silverPrice:500, goldDealGems:20, goldGems:25, colors:{gold:40,neon:60,rainbow:80}, numberPrice:500, gemCycle:10}`.

## Hooks
Listens: `wallet` (refresh pills), `screen` (`game` → refresh `#ball`; leaving the shop stops the countdown timer), `home` (red dot on `#btn-shop` if it exists).
Emits: `purchase` (every buy, see above), `cosmetic(id)` (giveCosmetic), `equip({type,id,i?})`.
`NextUp.add` candidate, prio 20: "⭐ {name} היום ב-30% הנחה!" when the character of the day is unowned, unsold and affordable (coins or gems) → `openShop('today')`.

## prog fields
`prog.cos = {items:[ids]}` · `prog.eq = {kit, boots, ball, stadium, celeb, titlePack, title, color, number}` · `prog.shop = {bought:{key→id}, reroll:dayKey, seen:dayKey, seenWeek:n}` · `prog.chests[kind]` only as a fallback when no `giveChest` exists.

## What the home screen must wire
- A **🛒 חנות** button with `id="btn-shop"` → `openShop()`; this module adds/removes a `.shop-dot` red dot on it from `shopHasNew()` on every `refreshHome()` (the button gets `position:relative` automatically).
- Already wired here (defensively, `dataset.shopWired`): `#xp-badge` → `openShop('players')`, `#gem-badge` → `openShop('gems')`. If the home module rebuilds those pills, call `openShop` from its own handlers instead.
- Name tag / party box / leaderboard: show `titleText()` and apply `nameColorClass()`.
- Onboarding step 4 (§2.5): `openShop('players')`.

## Open questions
1. The gem slot needs a fallback on the 5 "empty" days of the 10-day cycle; I chose a Gold chest for 20 💎 (instead of 25). Change `ECON.shop.goldDealGems` or replace the fallback if the chests module prefers something else.
2. The welcome kit: `giveCosmetic('kit_il')` works; nothing in this module hands it out by itself.
3. Celebrations (`prog.eq.celeb`) are stored only; the end-card/celebrate module animates `data.anim` (`'kneeslide'`).
4. Online: `skinFor` applies to my character locally only; the party `pick` message does not carry the loadout yet (PLAN §5.3 "loadout broadcast") — the online module can read `prog.eq` and send it.
5. If both players pick the same character in an online match, both sprites get my skin locally (the core calls `skinFor` by character id, not by slot).
