/* ===================================================================================================
   CHEST SLOTS — three timed slots (Clash-Royale / Rumble-Stars style). A WIN in a real match drops a
   chest into the first free slot; it unlocks after bronze 1 h / silver 3 h / gold 8 h (server time,
   survives a reload) or right away for a few gems. The tiles live on the home (right side, under the
   column) and on the chests screen. Keys now open only the GOLD chest: bronze and silver come from the
   slots, the daily pickup, the missions bonus or coins.
   Public: slotsInv() slotKindForWin(info) slotGive(kind)→i slotReady(i) slotRemaining(i)→ms slotSkipCost(i)
           slotSkip(i) slotOpen(i) slotTap(i) slotsRender() slotsTick() slotsFmt(ms) slotsReadyCount() slotsNextUp()
   prog:   prog.slots=[null|{kind, at}, ×3]  (at = the now() timestamp the chest becomes ready)
   Hooks emitted: 'slotGiven'(i, kind) when a win lands a chest, 'slotOpen'(i, kind) when a ready slot is opened
   Wraps: buildChests (adds the slot row + fixes the bronze/silver card texts), chestsBadge (+ ready slots)
   =================================================================================================== */
Object.assign(ECON, { slots: {
  n:3,
  hours:{bronze:1, silver:3, gold:8},
  rate:{bronze:3, silver:3, gold:2.5},          // 💎 per remaining hour …
  max:{bronze:3, silver:8, gold:18},            // … capped here
  goldPct:5, silverPct:25,                      // a lucky win upgrades the chest
  silverLevel:3, goldLevel:5,                   // a win at this level or above guarantees silver / gold (5 = Impossible, the BOSS)
  fallback:{bronze:80, silver:300, gold:900},   // coins instead of a chest when no chests module exists
}});
/* keys only for the gold chest (gold stays 8 🔑 or 25 💎, legendary 40 💎) */
if(ECON.chests){ if(ECON.chests.bronze) ECON.chests.bronze.keys=0; if(ECON.chests.silver) ECON.chests.silver.keys=0; }

I18N_ADD({
 'slots.empty':['ריק – נצח משחק','Empty – win a match','فارغ – افز بمباراة','Пусто – выиграй матч'],
 'slots.open':['פתח!','Open!','افتح!','Открыть!'],
 'slots.full':['📦 כל התאים מלאים – פתח תיבה כדי לפנות מקום','📦 All slots are full – open a chest to make room','📦 كل الخانات ممتلئة – افتح صندوقًا لإخلاء مكان','📦 Все ячейки заняты – открой сундук, чтобы освободить место'],
 'slots.got':['📦 {0} נכנסה לתא! נפתחת בעוד ⏳ {1}','📦 {0} is in a slot! Opens in ⏳ {1}','📦 {0} في خانة! يُفتح بعد ⏳ {1}','📦 {0} в ячейке! Откроется через ⏳ {1}'],
 'slots.skipQ':['לפתוח עכשיו ב-💎 {0}?','Open now for 💎 {0}?','هل تفتح الآن بـ 💎 {0}؟','Открыть сейчас за 💎 {0}?'],
 'slots.noGems':['חסר 💎 – צריך {0}','Not enough 💎 – you need {0}','لا تكفي 💎 – تحتاج {0}','Не хватает 💎 – нужно {0}'],
 'slots.fromSlots':['מגיע מהתאים ⏳','Comes from the slots ⏳','يأتي من الخانات ⏳','Приходит из ячеек ⏳'],
 'slots.priceCoins':['🪙 {0} או מהתאים ⏳','🪙 {0} or from the slots ⏳','🪙 {0} أو من الخانات ⏳','🪙 {0} или из ячеек ⏳'],
 'slots.nextUp':['יש תיבה מוכנה בתא!','A chest is ready in a slot!','هناك صندوق جاهز في الخانة!','В ячейке готов сундук!'],
 'slots.ready':['📦 {0} מוכנה! לחץ לפתוח','📦 {0} is ready! Tap to open','📦 {0} جاهز! اضغط لفتحه','📦 {0} готов! Нажми, чтобы открыть'],
 'slots.hint':['📦 תיבות ברונזה וכסף מגיעות מהתאים – נצח משחק!','📦 Bronze and silver chests come from the slots – win a match!','📦 الصناديق البرونزية والفضية تأتي من الخانات – افز بمباراة!','📦 Бронзовые и серебряные сундуки приходят из ячеек – выиграй матч!'],
});

/* ----- state ----- */
const SLOTS={ timer:0, toasted:{} };
const slotMs = kind => (ECON.slots.hours[kind]||1)*3600e3;
const slotIcon = kind => (typeof chestIcon==='function' ? chestIcon(kind) : ({bronze:'📦', silver:'🎁', gold:'👑'})[kind]) || '📦';
const slotChestName = kind => I18N_RAW['chests.'+kind] ? T('chests.'+kind) : I18N_RAW['dm.chest.'+kind] ? T('dm.chest.'+kind) : kind;
/* prog.slots, always n entries; a bad entry becomes empty, a timer longer than the chest's full time (a clock set forward when it was given) is clamped */
function slotsInv(){
  const n=ECON.slots.n|0; if(!Array.isArray(prog.slots)) prog.slots=[];
  while(prog.slots.length<n) prog.slots.push(null); if(prog.slots.length>n) prog.slots.length=n;
  for(let i=0;i<n;i++){
    const s=prog.slots[i];
    if(!s || typeof s!=='object' || !ECON.slots.hours[s.kind] || !(s.at>0)){ prog.slots[i]=null; continue; }
    const full=slotMs(s.kind); if(s.at-now()>full) s.at=now()+full;
  }
  return prog.slots;
}
function slotReady(i){ const s=slotsInv()[i]; return !!s && now()>=s.at; }
function slotRemaining(i){ const s=slotsInv()[i]; return s ? Math.max(0, s.at-now()) : 0; }
function slotsReadyCount(){ return slotsInv().filter(s=>s && now()>=s.at).length; }
function slotsFmt(ms){ let t=Math.max(0, Math.ceil(ms/1000)); const h=Math.floor(t/3600), m=Math.floor(t%3600/60), s=t%60; return h+':'+pad2(m)+':'+pad2(s); }
/* 💎 to open now: ceil(remaining hours × rate), at least 1, at most the kind's cap */
function slotSkipCost(i){
  const s=slotsInv()[i]; if(!s) return 0;
  const hrs=slotRemaining(i)/3600e3; if(hrs<=0) return 0;
  const cost=Math.ceil(Math.round(hrs*(ECON.slots.rate[s.kind]||3)*1000)/1000);
  return Math.max(1, Math.min(ECON.slots.max[s.kind]||99, cost));
}
/* which chest a win earns: Impossible (the BOSS) → gold; 5% gold; level ≥ 3 or online → silver; 25% silver; else bronze */
function slotKindForWin(info){
  info=info||{}; const S=ECON.slots, lv=info.level|0;
  if(lv>=S.goldLevel) return 'gold';
  if(Math.random()*100<S.goldPct) return 'gold';
  if(lv>=S.silverLevel || info.online) return 'silver';
  if(Math.random()*100<S.silverPct) return 'silver';
  return 'bronze';
}
/* put a chest into the first free slot → its index, or -1 when every slot is taken */
function slotGive(kind){
  const inv=slotsInv(); if(!ECON.slots.hours[kind]) return -1;
  const i=inv.indexOf(null); if(i<0) return -1;
  inv[i]={kind, at: now()+slotMs(kind)}; saveProg();
  Hooks.emit('slotGiven', i, kind); slotsRender(); return i;
}

/* ----- opening ----- */
async function slotSkip(i){
  const s=slotsInv()[i]; if(!s || slotReady(i)) return false;
  const cost=slotSkipCost(i);
  if(!(await ask(T('slots.skipQ', cost)))) return false;
  const cur=slotsInv()[i]; if(!cur || cur!==s) return false;                 // the slot changed while the question was open
  if(!spendGems(cost)){ toast(T('slots.noGems', cost),'warn'); return false; }
  s.at=now(); saveProg(); try{ sfx.win(); }catch(e){}
  slotsRender(); slotsBadge(); return true;
}
/* a ready slot: the chest leaves the slot, lands in the inventory and its drop opens on the chests screen */
function slotOpen(i){
  const inv=slotsInv(), s=inv[i]; if(!s || !slotReady(i)) return false;
  inv[i]=null; saveProg(); Hooks.emit('slotOpen', i, s.kind);
  if(typeof giveChest==='function' && typeof openChest==='function'){
    giveChest(s.kind, true);
    if(typeof openChestsScreen==='function') openChestsScreen();
    openChest(s.kind);                                                      // owned → opens for free (a pending pick is finished first; the chest waits in the inventory)
  } else addCoins(ECON.slots.fallback[s.kind]||0, 'slot');
  slotsRender(); slotsBadge(); return true;
}
function slotTap(i){
  try{ sfx.click(); }catch(e){}
  const s=slotsInv()[i]; if(!s) return false;
  return slotReady(i) ? slotOpen(i) : slotSkip(i);
}

/* ----- the tiles ----- */
function slotsMountHome(){ const home=$('#home'); if(!home || $('#chest-slots')) return; const row=document.createElement('div'); row.id='chest-slots'; row.className='chest-slots'; home.appendChild(row); }
function slotsMountChests(){
  const sc=$('#chests'); if(!sc) return;
  if(!$('#chests-slots')){ const row=document.createElement('div'); row.id='chests-slots'; row.className='chest-slots wide'; const anchor=$('#chests-row'); if(anchor && anchor.parentNode===sc) sc.insertBefore(row, anchor); else sc.appendChild(row); }
  sc.classList.add('slots-on');
}
function slotsContainers(){ return ['#chest-slots','#chests-slots'].map(q=>$(q)).filter(Boolean); }
function slotState(s){ return !s ? 'empty' : now()>=s.at ? 'ready' : 'tick'; }
function slotLabel(s){ const st=slotState(s); return st==='empty' ? T('slots.empty') : st==='ready' ? T('slots.open') : '⏳ '+slotsFmt(s.at-now()); }
function slotsRender(){
  const inv=slotsInv();
  for(const box of slotsContainers()){
    box.innerHTML='';
    inv.forEach((s,i)=>{
      const b=document.createElement('button'); b.type='button'; b.dataset.slot=i;
      const st=slotState(s); b.className='slot '+st+(s ? ' ck-'+s.kind : '');
      const ic=document.createElement('span'); ic.className='s-ic'; ic.textContent = s ? slotIcon(s.kind) : '📦'; b.appendChild(ic);
      const tx=document.createElement('span'); tx.className='s-tx';
      const nm=document.createElement('b'); nm.className='s-nm'; if(s) nm.textContent=slotChestName(s.kind); else nm.hidden=true; tx.appendChild(nm);
      const cd=document.createElement('span'); cd.className='s-cd'; cd.textContent=slotLabel(s); tx.appendChild(cd);
      b.appendChild(tx);
      if(s) b.addEventListener('click', ()=>slotTap(i));
      box.appendChild(b);
    });
  }
  slotsTimerSync();
}
function slotsOnScreen(){ return ['home','chests'].some(id=>{ const el=$('#'+id); return !!el && el.classList.contains('active'); }); }
/* once a second while the home or the chests screen shows: countdown text in place; a state change rebuilds the tiles */
function slotsTick(){
  if(!slotsOnScreen()){ slotsTimerStop(); return; }
  const inv=slotsInv(); let changed=false;
  for(const box of slotsContainers()){
    box.querySelectorAll('.slot').forEach((b,i)=>{
      const s=inv[i], st=slotState(s);
      if(!b.classList.contains(st)){ changed=true; return; }
      const cd=b.querySelector('.s-cd'); if(cd) cd.textContent=slotLabel(s);
      const nm=b.querySelector('.s-nm'); if(nm && s) nm.textContent=slotChestName(s.kind);
    });
  }
  inv.forEach(s=>{ if(!s || now()<s.at) return; const key=s.kind+'@'+s.at; if(SLOTS.toasted[key]) return; SLOTS.toasted[key]=true; if(changed) toast(T('slots.ready', slotChestName(s.kind)),'ach'); });
  if(changed){ slotsRender(); slotsBadge(); }
  else slotsTimerSync();
}
function slotsTimerSync(){
  const need = slotsOnScreen() && slotsInv().some(s=>s && now()<s.at);
  if(need && !SLOTS.timer) SLOTS.timer=setInterval(slotsTick, 1000);
  else if(!need && SLOTS.timer) slotsTimerStop();
}
function slotsTimerStop(){ if(SLOTS.timer){ clearInterval(SLOTS.timer); SLOTS.timer=0; } }
/* the chests badge (home button + the 🎁 count) also counts ready slots */
function slotsBadge(){
  if(typeof refreshChestsBadge==='function') refreshChestsBadge();
  if(typeof refreshHomeV2==='function' && $('#home') && $('#home').classList.contains('active')) refreshHomeV2();
}
if(typeof chestsBadge==='function'){ const _slotsCB=chestsBadge; chestsBadge=function(){ return (_slotsCB.apply(this, arguments)|0)+slotsReadyCount(); }; }

/* ----- the chests screen: the slot row above the cards; bronze / silver cards say where they come from ----- */
function slotsFixCards(){
  if(!ECON.chests) return;
  for(const kind of ['bronze','silver']){
    const cfg=ECON.chests[kind]; if(!cfg || cfg.keys) continue;                 // only while keys do not open this chest
    const card=document.querySelector('#chests-row .chest-card[data-kind="'+kind+'"]'); if(!card) continue;
    const price=card.querySelector('.price'); if(price) price.textContent = cfg.coins ? T('slots.priceCoins', fmtNum(cfg.coins)) : T('slots.fromSlots');
    const b=card.querySelector('.btn.open');
    if(b && b.classList.contains('off')){
      b.textContent=T('slots.fromSlots');
      /* a tap on the grey button explains the slots (capture phase on the card: it never reaches the chests module's "not enough … keys" toast) */
      card.addEventListener('click', e=>{ if(e.target!==b && !b.contains(e.target)) return; e.stopPropagation(); e.preventDefault(); try{ sfx.click(); }catch(x){} toast(T('slots.hint'),'warn'); }, true);
    }
  }
}
if(typeof buildChests==='function'){ const _slotsBC=buildChests; buildChests=function(){ const r=_slotsBC.apply(this, arguments); try{ slotsMountChests(); slotsRender(); slotsFixCards(); }catch(e){ console.error('slots', e); } return r; }; }

/* ----- a win → a chest in a slot (the end card gets a line; a toast when every slot is taken) ----- */
function slotEndcardLine(kind, when){
  if(typeof endcardRow!=='function') return false;
  setTimeout(()=>{
    const earn=$('#endcard-earn'); if(!earn || earn.hidden) return;
    const n=earn.querySelectorAll('.ec-row').length;
    const r=endcardRow('ec-slot', '<span class="ec-big">'+slotIcon(kind)+' '+esc(T('slots.got', slotChestName(kind), when))+'</span>');
    earn.appendChild(r);
    setTimeout(()=>r.classList.add('ec-on'), earn.classList.contains('ec-now') ? 0 : 250+n*300);
  }, 0);
  return true;
}
Hooks.on('matchEnd', info=>{
  if(!info || info.outcome!=='win' || info.training) return;
  if(typeof spectating!=='undefined' && spectating) return;
  const kind=slotKindForWin(info), i=slotGive(kind);
  if(i<0){ toast(T('slots.full'),'warn'); return; }
  const when=slotsFmt(slotRemaining(i));
  if(!slotEndcardLine(kind, when)) toast(T('slots.got', slotChestName(kind), when),'ach');
});

/* ----- wiring ----- */
function slotsNextUp(){ return slotsReadyCount()>0 ? {prio:45, icon:'📦', text:T('slots.nextUp'), action:()=>{ if(typeof openChestsScreen==='function') openChestsScreen(); }} : null; }
NextUp.add(slotsNextUp);
Hooks.on('home', ()=>{ slotsMountHome(); slotsRender(); });
Hooks.on('screen', id=>{
  if(id==='home'){ slotsMountHome(); slotsRender(); }
  else if(id==='chests'){ slotsMountChests(); slotsRender(); }
  else slotsTimerStop();
});
slotsInv(); slotsMountHome(); applyLang();
