# NOTES — social & safety (70-social)

## Files
- `src/js/70-social.js` — the module (deep links, invite/share, cloud backup + restore, optional Firebase anonymous auth)
- `src/html/70-social.html` — `#social-input-modal` (in-game text prompt) and `#social-code-modal` (my restore code: copy / share)
- `src/css/70-social.css` — `#btn-invite`, `.social-panel`, `#social-input`, `.social-code`, `.social-link`
- `src/test/70-social.js` — 46 assertions, `./test.sh social`
- `index.html` (repo root) — OG/Twitter tags + `<meta refresh>` + JS redirect that forwards `?ref= ?join= ?code= ?mode=` to `game1.html`
- `art/og.html` → `art/og.png` (1200×630, 5 sprites in the game's style; re-render with headless Edge `--window-size=1200,630 --screenshot=...`)
- `src/PARENTS.md` — Hebrew step-by-step for the Firebase console (Anonymous sign-in, FB_KEY, rules, admin uid)

## Public functions
- `parseDeepLinks(search)` → `{ref?, code?, join?, mode?}` (validated/uppercased); `noteDeepLinks(o)` stores `prog.ref` (first referrer only, never my own code) and queues the rest; `runDeepLinks(o?)` runs the queued actions: `?join` → `ask(T('social.joinQ'))` then `showScreen('mp')` + `mpJoin(code)` (never auto-joins); `?code` → `#codes-modal` pre-filled; `?mode=daily` → `#btn-daily.click()`; `boss|tournament` → `openModeFromLink(mode)` if a module defines it. Queued actions wait for a name (`submitName` is wrapped) and run 350 ms after the home screen shows. The URL is cleaned at load with `history.replaceState`.
- `myRefCode()` (4 base32 chars hashed from `prog.saveId`), `myRefLink()`, `inviteText()`, `inviteShare()` (counts `prog.invites`), `shareText(text)` → `'share'|'wa'` (`navigator.share` or `wa.me`), `buildShareText(info)` (win/draw/loss, 4 languages), `shareResult(info)` (counts `prog.shares`; `info` defaults to `socialLastInfo`, the last `'matchEnd'` object).
- `ensureSaveId()`, `genSaveId()`, `fmtRestoreCode(id)` → `ABCD-EFGH-IJ`, `normRestoreCode(s)`.
- `cloudBackup(force)` → bool (sent now or not): PUT `saves/<saveId>` = `{d: JSON({prog, stats, cup, name, auth?}), t:{'.sv':'timestamp'}, v:GAME_VERSION, uid?}` via `fbReq`; once per 60 s at most, only when the payload hash changed (a pending change is flushed by a timer); `cloudState` = `{last, hash, timer, okAt, calls}`.
- `applyRestore(obj)` → bool (writes `footballStar.progress/stats/cup`, `settings.name`, auth refresh token), `parseSave(obj)`, `restoreFromCode(code)` (GET → `ask()` → `applyRestore` → `location.reload()`), `restoreFlow()` (the name-modal link), `askText(titleKey, hintKey, placeholder, value)` → `Promise<string|null>`, `openRestoreCode()`, `copyRestoreCode()`, `shareRestoreCode()`.
- `idbSet(k,v)` / `idbGet(k)` — IndexedDB `footballStar/kv` mirror of `saveId`; `socialAutoRestoreCheck(fresh)` offers the cloud copy on the first home screen when localStorage had no `saveId` but IndexedDB has one (`ask()` first, name modal hidden meanwhile).
- Auth (only when `FB_KEY` is non-empty): `socialAuthEnabled()`, `socialSetAuth(obj)`, `authToken()`, `myUid()`, `authSignUp()`, `authRefresh()` (every 50 min), `authEnsure()`, `fbUrlFor(path)`. `fbReq` is wrapped: with a token every request gets `?auth=<idToken>` (`&auth=` when the path carries a query); without a token the original `fbReq` runs untouched (`FB_KEY=''` = exactly today's behaviour).

## Hooks used
`'matchEnd'` (keeps `socialLastInfo`; adds a fallback `#btn-end-share` only when the end-card module's `#btn-ec-share` is absent), `'purchase' 'coins' 'gems' 'keys'` (+ `visibilitychange`→hidden, `pagehide`) → `cloudBackup()`, `'screen'` (home → run pending deep links / offer the auto-restore). Wraps `submitName` and `fbReq`.

## prog fields
`prog.saveId` (10 base32 chars, the restore code), `prog.ref` + `prog.refT` (the referrer, stored once), `prog.shares`, `prog.invites`. localStorage: `footballStar.auth` (`{idToken, refreshToken, localId, exp}`), IndexedDB `footballStar` db, store `kv`, key `saveId`.

## What the home screen must wire
- `#btn-invite` (📣 הזמן חבר) is inserted at load into `.home-foot .row:last-child` before `#btn-ceo` — restyle/move it freely; it calls `inviteShare()`.
- The "עוד" sheet: a button → `openRestoreCode()` (90-home already does this). The last onboarding card: `inviteShare()` (95-onboard already does this).
- End card: `shareResult(info)` (40-endcard already calls it).
- Admin panel (80-adminstats): show `myUid()` so the parent can copy it into `admins/<uid>` (see PARENTS.md step 4).

## Open questions
- `FB_KEY` is empty until the parents follow PARENTS.md; until then `saves/*` writes rely on the current open rules and carry no `uid`. The first write after enabling auth claims the save for that uid (rules in PLAN.md Appendix A).
- The save payload is not compressed; `prog` is small today (<10 KB) but a giant friends list could pass the 20 KB rule cap — add a `.validate` on `d.length` later or compress.
- `?join` asks with the code, not the host's name (the name is only known after the peer hello).
- `?mode=boss|tournament` are forwarded to `openModeFromLink(mode)` — nobody defines it yet (wave 2/3).
- `index.html` keeps a visible "שחק ▶" link in case both redirects are blocked; GitHub Pages serves `art/og.png` (284 KB, fine for WhatsApp previews).
- Channel kit (screenshots, square logo, ready posts, PLAN §9.1) is not part of this module.
