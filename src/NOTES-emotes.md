# 45-emotes — in-match emotes, also online (2026-10-10)
- 😂 😎 🔥 👏 (`ECON.emotes.list`), keys Digit1–4 (top row); touch: `#btn-emote` 😀 under the level tag opens `#emote-strip` for 3 s. 4-s cooldown, only while `state` is play/celebrate, not in penalties/spectating. Bubble `.emote` appended to the player element for 1.6 s.
- Online: the host sends `netEv('emote:<slot>:<id>')` (skipped when a guest runs an older build, like say()); a guest sends `mp.conn.send({t:'emote',i})`; `mpOnMsg` and `applySnapshot` are wrapped. Guests skip their own echo.
- Bots emote back offline (30%, 1 s later). Settings switch `#set-emotes` (`settings.emotesOff` hides others' emotes). The controls help gets one line.
- Public: `emoteShow(p|slot|el,id) emoteSend(id) emoteCanSend() emoteRelay(slot,id) emoteFromGuest(m,c) emoteOnNetEv(str) emoteBotReply(p,pool) emoteStripOpen() emoteStripClose() emoteMySlot()`; state `EMOTES`. Hook emitted: `emote(slot,id)`. No core edit.
