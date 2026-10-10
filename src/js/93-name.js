/* ===================================================================================================
   93-name — nobody plays without a name.
   The core's #name-modal (name ≥ 2 chars, "המשך", no skip; askNameIfMissing / submitName) was only shown on the way in from
   the intro. Now: the home screen asks whenever the name is missing ('home' + 'screen' hooks); PLAY (homePlay), startGame /
   startOfflineMatch, the online screen (mpLobby / mpHost / mpJoin), friends (openFriends), training and the entry buttons
   (#btn-play #btn-mp #btn-friends #btn-2v2 #btn-pk #btn-train #btn-daily #btn-hotseat) open the modal instead of starting;
   and when the back button (90-home's stack) closes the modal while the home is showing, it comes straight back.
   The modal has no outside-tap close in the core. submitName already registers the name (fbHeartbeat(true)).
   Returning players with a name see nothing new. Public: nameOk(), nameAsk(), nameGate() → true = go on.
   =================================================================================================== */
function nameOk(){ return !!normName(settings.name); }
function nameAsk(){ const m=$('#name-modal'); if(!m || m.classList.contains('show')) return; if(typeof askNameIfMissing==='function') askNameIfMissing(); else m.classList.add('show'); }
function nameGate(){ if(nameOk()) return true; nameAsk(); return false; }
/* the home asks */
Hooks.on('home', ()=>{ if(!nameOk() && $('#home').classList.contains('active')) nameAsk(); });
Hooks.on('screen', id=>{ if(id==='home' && !nameOk()) nameAsk(); });
/* the ways into a match or online: the functions (chained wrappers; a missing name opens the modal and aborts) */
for(const fn of ['homePlay','startGame','startOfflineMatch','openFriends','mpLobby','mpHost','mpJoin','startTraining']){
  if(typeof window[fn]!=='function') continue;
  const _orig=window[fn];
  window[fn]=function(){ if(!nameGate()) return; return _orig.apply(this, arguments); };
}
/* …and the buttons (capture phase: runs before the core's own listener and stops it) */
for(const id of ['btn-play','btn-mp','btn-friends','btn-2v2','btn-pk','btn-train','btn-daily','btn-hotseat']){
  const b=$('#'+id); if(!b) continue;
  b.addEventListener('click', e=>{ if(nameOk()) return; e.stopImmediatePropagation(); e.preventDefault(); try{ sfx.click(); }catch(_){} nameAsk(); }, true);
}
/* the modal cannot be dismissed: whenever it loses .show while the name is still missing and the home is idle underneath
   (the back button, a stray close), it is reopened right away — unless another overlay took over (the restore flow of 70-social,
   a question), which brings it back itself */
{ const m=$('#name-modal');
  if(m) new MutationObserver(()=>{
    if(m.classList.contains('show') || nameOk()) return;
    setTimeout(()=>{ if(nameOk() || m.classList.contains('show')) return; if(!$('#home').classList.contains('active') || state!=='idle') return; if(document.querySelector('.overlay.show')) return; nameAsk(); }, 0);
  }).observe(m, {attributes:true, attributeFilter:['class']});
}
