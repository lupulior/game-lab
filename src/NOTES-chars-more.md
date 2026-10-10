# 07-chars-more — 16 more buyable characters (2026-10-10)
Data-only module: appends to `CHARS` (indexes 80–95, always at the END — online picks travel as indexes), sets `PRICES`, `CHAR_ST`, `CHAR_NAMES` (en/ar/ru), pushes the Israelis into `ISRAELI_IDS`, retired stars into `LEGEND_IDS`, all into `NEW_IDS`. Exposes `CHARS_MORE`, `CHARS_MORE_IDS`.
- Bronze: dorperetz דור פרץ 600 🇮🇱 · mitoma 700 · baribo טאי בריבו 900 🇮🇱 · alvarez 1000. Silver: raphinha 1500 · odegaard 2000 · valverde 2200 · dybala 2500 · nimni אבי נמני 3000 🇮🇱. Gold: hazard 4000 · ohana אלי אוחנה 4000 🇮🇱 · bale 4500 · puyol 5500 · robben 6500. Icon: rivaldo 8000 · romario 9500.
- Not trophy-road rewards (`TROPHY_ROAD` is computed from the first 80 at load). The daily opponent and the character of the day shift once when the list grows (cosmetic).
- Version skew: a friend on an older build receiving a pick index ≥80 would crash in `partyRefresh` — the version check / reload banner covers it.
