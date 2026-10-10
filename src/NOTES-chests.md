# Module: chests (files `20-chests.*`) — drops, Brawl-Stars style (rewritten 2026-10-10)

The old fixed-bundle design (PLAN §5.1) is gone. A chest is a DROP: tap it 3 times, it bursts, the rarity climbs with a visible "⬆ שדרוג!" moment per step, then three face-down cards of that rarity; pick one, it flips; the two others flip too and show what they held with a red "✖ לא נבחר" ribbon.

## Economy (`ECON.chests`)
- Kinds: bronze (coins 150, no keys — comes from the slots/daily/missions), silver (coins 500, no keys), gold (🔑 8 or 💎 35), legend (💎 60). 27-slots sets bronze/silver `keys` to 0 at load; the chests test overrides them to 1/3 for its own run.
- Rarities rare / superrare / epic / mythic / legendary (green / sky / purple / red / gold, `#chest-drop[data-r]`), odds per kind, pity 40 (`prog.chestPity`).
- Pools per rarity: coins (30–600), gems, keys, xp (shown as "⭐ נקודות"), looks (`cos`), players (`char` by price), powers at legendary. 37-levels wraps `chestCards` and friends to add `{t:'shards'}` cards for owned players.
- Climb timings `ECON.chests.climb = {first:900, step:800, hold:1000, flash:250}` → rare 1.5 s … legendary 4.8 s from the third tap.

## Flow
`openChest(kind)` (pays: owned / keys / coins / gems via `ask()`) → `chestRollRarity` → `chestCards(rarity)` → `prog.chestPick={kind,rarity,cards,paid,all}` (survives reload: `chestDropResume` goes straight to the cards) → `chestDropStart` (full-stage `#chest-drop`, `chestTap` ×3) → `chestRarityClimb` (`DROP.upgrades` counts the upgrade moments; `#cd-flash`, `#chest-drop.cd-shake`, `#cd-up`) → `chestShowCards` → `chestPickCard` → `chestGrant(card, paid)`; the others → `chestLoseCard`. Welcome chest: all three flip (`openWelcomeChest`). Daily free bronze: `claimDailyBronze()`.

## Public
`giveChest(kind, silent)`, `openChest(kind)`, `openChestsScreen()`, `closeChestsScreen()`, `chestCanOpen(kind)`, `chestsBadge()`, `refreshChestsBadge()`, `buildChests()`, `chestTap()`, `chestCards(rarity, rnd)`, `chestCardName/Type/Preview(card)`, `chestGrant(card, paid)`, `chestRollRarity(kind, rnd)`, `chestDropResume()`. Hooks: `chest(kind)`, `chestOpen(kind,{rarity})`, `chestPick(card)`.
