/* ===================================================================================================
   92-wallet — big numbers that never overflow their box ("no maximum for coins and gems").
   fmtNum / fmtNumHTML live in 00-econ.js: below a million "12,345"; from a million "1.5 מיליון", "100 מיליון", "2 מיליארד"
   (the word through I18N 'num.million' / 'num.billion'). This module re-renders every wallet pill with the HTML variant —
   the word sits in <small class="mag"> — and runs fitText so the number shrinks inside its fixed box instead of widening it:
   the home pills (#xp-badge #gem-badge #trophy-badge), the shop wallet (#shop-coins #shop-gems), the chests wallet
   (#chests-wallet span.c / span.g) and the friends "me" line (#fr-me). The wallet is read through walletNum (never `|0`,
   which wraps above 2,147,483,647). It also retires the word "XP" from the two core template literals that still printed it
   (achievement cards → the coins they pay, the friend card's "⭐ XP" label → 🪙). Nothing is edited in other modules:
   every function is wrapped (chained) from here. Public: walletPill(el, icon, n), walletBadges().
   =================================================================================================== */
/* one pill: icon + the number (word small), then shrink to fit the box */
function walletPill(el, icon, n){ if(!el) return; el.innerHTML=icon+' '+fmtNumHTML(walletNum(n)); fitText(el); }
/* the three home pills */
function walletBadges(){ walletPill($('#xp-badge'), '🪙', prog.coins); walletPill($('#gem-badge'), '💎', prog.gems); walletPill($('#trophy-badge'), '🏆', prog.trophies); }
{ const _wUpdate=updateXpBadge; updateXpBadge=function(){ const r=_wUpdate.apply(this, arguments); walletBadges(); return r; }; }
/* the shop header (10-shop.js: shopWallet) */
if(typeof shopWallet==='function'){ const _wShop=shopWallet; shopWallet=function(){ const r=_wShop.apply(this, arguments); walletPill($('#shop-coins'), '🪙', prog.coins); walletPill($('#shop-gems'), '💎', prog.gems); return r; }; }
/* the chests screen (20-chests.js: buildChests fills #chests-wallet with span.k / span.c / span.g) */
if(typeof buildChests==='function'){ const _wChests=buildChests; buildChests=function(){ const r=_wChests.apply(this, arguments); const w=$('#chests-wallet'); if(w){ walletPill(w.querySelector('span.c'), '🪙', prog.coins); walletPill(w.querySelector('span.g'), '💎', prog.gems); } return r; }; }
/* the friends screen "me" line (core: updatePresenceUI) */
if(typeof updatePresenceUI==='function'){ const _wPresence=updatePresenceUI; updatePresenceUI=function(){ const r=_wPresence.apply(this, arguments); const me=$('#fr-me'), name=normName(settings.name); if(me && name) me.innerHTML=`${presence==='on'?'🟢':'⚪'} <b>${esc(name)}</b> · 🪙 ${fmtNumHTML(walletNum(prog.coins))} · 🏆 ${loadStats().w}`; return r; }; }
/* achievements screen: each card shows the coins it pays (a[1] × ECON.achMult) instead of "+15 XP" */
if(typeof buildAch==='function'){ const _wAch=buildAch; buildAch=function(){ const r=_wAch.apply(this, arguments); document.querySelectorAll('#ach-grid .achc').forEach((d,i)=>{ const x=d.querySelector('.xp'), a=ACH[i]; if(x && a) x.textContent='🪙 +'+fmtNum(a[1]*ECON.achMult); }); return r; }; }
/* a friend's card: the "⭐ XP" label under their coins becomes 🪙 */
if(typeof viewFriend==='function'){ const _wFriend=viewFriend; viewFriend=async function(){ const r=await _wFriend.apply(this, arguments); const l=document.querySelector('#fm-stats .stat.cup .l'); if(l) l.textContent='🪙'; return r; }; }
/* the admin panel's gift buttons add coins (core: addCoins(1000) / addCoins(10000)+gems+keys), so they say so */
{ const a1=$('#btn-adm-xp1'), a2=$('#btn-adm-xp2'); if(a1) a1.textContent='🪙 +1,000'; if(a2) a2.textContent='🪙 +10,000 · 💎 +100 · 🔑 +3'; }
/* the pills already on screen get the new rendering at load */
walletBadges();
