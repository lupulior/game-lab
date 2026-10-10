/* chest slots: a win fills a slot, timers tick (server time, reload-safe), gems skip, ready → the drop; keys only for gold; the missions bonus is a bronze chest */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length, tick=(ms=30)=>new Promise(r=>setTimeout(r,ms)), H=3600e3;
  const lastToast=()=>{ const t=document.querySelectorAll('#toast .tst'); return t.length ? t[t.length-1].textContent : ''; };
  const tiles=sel=>[...document.querySelectorAll(sel+' .slot')];
  const hasChests = typeof giveChest==='function' && typeof openChest==='function';
  // --- config: keys only for gold
  TASSERT('keys only for gold (bronze/silver 0, gold 8, legend 0)', !ECON.chests || (ECON.chests.bronze.keys===0 && ECON.chests.silver.keys===0 && ECON.chests.gold.keys===8 && ECON.chests.legend.keys===0));
  TASSERT('ECON.slots: 3 slots, 1 h / 3 h / 8 h', ECON.slots.n===3 && ECON.slots.hours.bronze===1 && ECON.slots.hours.silver===3 && ECON.slots.hours.gold===8);
  TASSERT('i18n in 4 languages', ['slots.empty','slots.open','slots.full','slots.got','slots.skipQ','slots.noGems','slots.fromSlots','slots.priceCoins','slots.nextUp','slots.ready','slots.hint'].every(k=>I18N_RAW[k] && I18N_RAW[k].length===4 && I18N_RAW[k].every(s=>s.length>0)));
  prog.slots=null; prog.coins=0; prog.gems=0; prog.keys=0; prog.chests={}; prog.chestPick=null; prog.chestPity=0; training=null; state='idle'; mp=null; prog.matches=5;
  showScreen('home'); refreshHome(); await tick(120);
  TASSERT('slot row on the home: 3 empty tiles', $('#home').contains($('#chest-slots')) && tiles('#chest-slots').length===3 && tiles('#chest-slots').every(b=>b.classList.contains('empty')) && tiles('#chest-slots')[0].querySelector('.s-cd').textContent===T('slots.empty'));
  TASSERT('prog.slots is 3 × null', Array.isArray(prog.slots) && prog.slots.length===3 && prog.slots.every(s=>s===null));
  if($('#home').classList.contains('v2')){
    const s=$('#stage').getBoundingClientRect(), sc=s.width/1000;
    const box=el=>{ const b=el.getBoundingClientRect(); return {l:(b.left-s.left)/sc, t:(b.top-s.top)/sc, r:(b.right-s.left)/sc, b:(b.bottom-s.top)/sc}; };
    const hit=(a,b)=>!(a.r<=b.l || a.l>=b.r || a.b<=b.t || a.t>=b.b);
    const me=box($('#chest-slots')), others=['#home-right','#home-centre','#today-card','#home-trophy','#home .home-foot','#btn-play-big','#home-chips'].map(q=>$(q)).filter(Boolean).map(box);
    TASSERT('tiles sit in the free area on the right (x 730–970, y 438–504), clear of everything', me.l>=720 && me.r<=980 && me.t>=430 && me.b<=515 && !others.some(o=>hit(me,o)));
    TASSERT('#52 tiles >= 44px tall', tiles('#chest-slots').every(b=>b.offsetHeight>=44));
  }
  // --- which chest a win gives
  { const r=Math.random;
    TASSERT('Impossible (BOSS) win → gold', slotKindForWin({level:5})==='gold');
    Math.random=()=>0.99; TASSERT('easy win, no luck → bronze', slotKindForWin({level:0})==='bronze');
    Math.random=()=>0.0;  TASSERT('lucky win → gold', slotKindForWin({level:0})==='gold');
    Math.random=()=>0.5;  TASSERT('level 3 win / online win → silver', slotKindForWin({level:3})==='silver' && slotKindForWin({level:0, online:true})==='silver');
    Math.random=()=>0.1;  TASSERT('25% silver on an easy win', slotKindForWin({level:0})==='silver');
    Math.random=r; }
  // --- a win fills a slot; losses, draws and training do not
  const win=extra=>Hooks.emit('matchEnd', Object.assign({outcome:'win', training:false, online:false, level:1, score:{me:3,op:0}, earn:{}, pay:{}, trophies:1}, extra||{}));
  Hooks.emit('matchEnd', {outcome:'lose', training:false, online:false, level:1, score:{me:0,op:1}, earn:{}, pay:{}, trophies:0});
  Hooks.emit('matchEnd', {outcome:'draw', training:false, online:false, level:1, score:{me:1,op:1}, earn:{}, pay:{}, trophies:0});
  Hooks.emit('matchEnd', {outcome:'win', training:true, online:false, level:1, score:{me:3,op:0}, earn:{}, pay:{}, trophies:0});
  TASSERT('lose / draw / training give nothing', prog.slots.every(s=>s===null));
  win();
  TASSERT('a win puts a chest in slot 1 with a timer', !!prog.slots[0] && ['bronze','silver','gold'].includes(prog.slots[0].kind) && prog.slots[0].at>now() && prog.slots[0].at<=now()+8*H+1000 && !prog.slots[1] && !prog.slots[2]);
  TASSERT('timer = the kind\'s hours from now', Math.abs(prog.slots[0].at-now()-ECON.slots.hours[prog.slots[0].kind]*H)<2000);
  TASSERT('home tile ticks with ⏳ H:MM:SS', tiles('#chest-slots')[0].classList.contains('tick') && /^⏳ \d+:\d\d:\d\d$/.test(tiles('#chest-slots')[0].querySelector('.s-cd').textContent));
  win(); win();
  TASSERT('three wins → three full slots', prog.slots.every(s=>!!s));
  win(); await tick();
  TASSERT('fourth win: every slot taken → the toast, nothing lost', lastToast()===T('slots.full') && prog.slots.every(s=>!!s));
  // --- countdown text + the one-second tick
  prog.slots=[{kind:'bronze', at:now()+59*60e3+12e3}, {kind:'silver', at:now()+3*H}, {kind:'gold', at:now()+8*H}]; saveProg(); slotsRender(); await tick();
  TASSERT('slotsFmt', slotsFmt(3552e3)==='0:59:12' && slotsFmt(8*H)==='8:00:00' && slotsFmt(0)==='0:00:00' && slotsFmt(61e3)==='0:01:01');
  TASSERT('countdown "⏳ 0:59:12" on the bronze tile', tiles('#chest-slots')[0].querySelector('.s-cd').textContent==='⏳ '+slotsFmt(prog.slots[0].at-now()) && tiles('#chest-slots')[0].querySelector('.s-cd').textContent.startsWith('⏳ 0:59:'));
  /* the headless clock may not advance with the timers, so move the silver timer 5 s closer and let the interval repaint it */
  const t0=tiles('#chest-slots')[1].querySelector('.s-cd').textContent, n0=now(); prog.slots[1].at-=5000; await tick(1600); TLOG('clock moved (ms)', now()-n0);
  TASSERT('the countdown is repainted every second while on the home', SLOTS.timer!==0 && tiles('#chest-slots')[1].querySelector('.s-cd').textContent!==t0 && tiles('#chest-slots')[1].querySelector('.s-cd').textContent.startsWith('⏳ 2:59:5'));
  showScreen('chars'); await tick(50); TASSERT('timer stops off-home', SLOTS.timer===0); showScreen('home'); await tick(50); TASSERT('timer back on the home', SLOTS.timer!==0);
  // --- gem skip cost: ceil(remaining hours × rate), min 1, capped
  TASSERT('skip costs: bronze 59 min → 3, silver 3 h → 8 (cap), gold 8 h → 18 (cap)', slotSkipCost(0)===3 && slotSkipCost(1)===8 && slotSkipCost(2)===18);
  prog.slots[2].at=now()+H; TASSERT('gold with 1 h left → 3 (2.5/h rounded up)', slotSkipCost(2)===3);
  prog.slots[0].at=now()+60e3; TASSERT('one minute left → still 1 💎', slotSkipCost(0)===1);
  prog.slots[0].at=now()+59*60e3+12e3; slotsRender();
  // no gems → the question, yes → refused, slot keeps ticking
  prog.gems=0; tiles('#chest-slots')[0].click(); await tick();
  TASSERT('tap a ticking tile → "open now for 💎 3?"', $('#ask-modal').classList.contains('show') && $('#ask-text').textContent===T('slots.skipQ',3));
  $('#btn-ask-no').click(); await tick(); TASSERT('no → nothing changes', !$('#ask-modal').classList.contains('show') && now()<prog.slots[0].at && prog.gems===0);
  tiles('#chest-slots')[0].click(); await tick(); $('#btn-ask-yes').click(); await tick();
  TASSERT('yes without gems → refused with a toast, slot still ticking', lastToast()===T('slots.noGems',3) && now()<prog.slots[0].at);
  prog.gems=10; tiles('#chest-slots')[0].click(); await tick(); $('#btn-ask-yes').click(); await tick(60);
  TASSERT('yes with gems → 3 💎 spent, slot ready, tile bounces "פתח!"', prog.gems===7 && slotReady(0) && tiles('#chest-slots')[0].classList.contains('ready') && tiles('#chest-slots')[0].querySelector('.s-cd').textContent===T('slots.open'));
  TASSERT('badge + next-up count the ready slot', slotsReadyCount()===1 && (!hasChests || chestsBadge()>=1) && slotsNextUp() && slotsNextUp().prio===45);
  // --- ready → open: the slot empties, the drop opens on the chests screen
  if(hasChests){
    prog.chestPick=null; prog.chests={}; const kind=prog.slots[0].kind;
    tiles('#chest-slots')[0].click(); await tick();
    TASSERT('tap a ready tile → chests screen, drop on, slot empty', $('#chests').classList.contains('active') && !$('#chest-drop').hidden && DROP.phase==='tap' && prog.slots[0]===null && prog.chestPick && prog.chestPick.kind===kind && (prog.chests[kind]|0)===0);
    TASSERT('slot row on the chests screen too, same tiles', $('#chests').contains($('#chests-slots')) && tiles('#chests-slots').length===3 && tiles('#chests-slots')[0].classList.contains('empty') && tiles('#chests-slots')[1].classList.contains('tick') && $('#chests').classList.contains('slots-on'));
    for(let i=0;i<(ECON.chests.taps||3);i++){ chestTap(); await tick(); } await tick(650); for(let i=0;i<6;i++){ if(DROP.phase==='cards') break; await tick(700); }
    TASSERT('the drop reaches the cards', DROP.phase==='cards' && document.querySelectorAll('#cd-cards .ccard').length===3);
    document.querySelector('#cd-cards .ccard').click(); await tick(1400); $('#btn-chest-done').click(); await tick();
    TASSERT('card picked, drop closed', !prog.chestPick && $('#chest-drop').hidden);
    // bronze / silver cards: no key price; a hint where they come from, or the coins price
    prog.coins=0; prog.keys=0; prog.coinDay={key:dayKey(), n:0}; buildChests();   // the picked card may have been keys/coins
    const bc=$('#chests-row .chest-card[data-kind="bronze"]'), sc=$('#chests-row .chest-card[data-kind="silver"]'), gc=$('#chests-row .chest-card[data-kind="gold"]');
    TASSERT('bronze/silver: price line says coins or slots, no 🔑', bc.querySelector('.price').textContent===T('slots.priceCoins','150') && sc.querySelector('.price').textContent===T('slots.priceCoins','500') && !bc.querySelector('.price').textContent.includes('🔑'));
    TASSERT('bronze/silver unaffordable → "comes from the slots"', bc.querySelector('.btn.open').classList.contains('off') && bc.querySelector('.btn.open').textContent===T('slots.fromSlots') && sc.querySelector('.btn.open').textContent===T('slots.fromSlots'));
    TASSERT('gold still 🔑 8 or 💎 25', gc.querySelector('.price').textContent===T('chests.price', 8, '💎 25') && gc.querySelector('.btn.open').textContent===T('chests.need', 8));
    bc.querySelector('.btn.open').click(); await tick();
    TASSERT('tapping the grey bronze button explains the slots (no "not enough keys" toast, no drop)', lastToast()===T('slots.hint') && $('#chest-drop').hidden);
    { const s=$('#stage').getBoundingClientRect(), sc=s.width/1000; const box=el=>{ const b=el.getBoundingClientRect(); return {l:(b.left-s.left)/sc, t:(b.top-s.top)/sc, r:(b.right-s.left)/sc, b:(b.bottom-s.top)/sc}; }; const hit=(a,b)=>!(a.r<=b.l || a.l>=b.r || a.b<=b.t || a.t>=b.b);
      const row=box($('#chests-slots')), wallet=box($('#chests-wallet')), cardEls=[...document.querySelectorAll('#chests-row .chest-card')], cards=cardEls.map(box);
      TASSERT('chests screen: slot row between the wallet and the cards, no overlap, cards inside the stage and not overflowing', !hit(row, wallet) && row.t>=wallet.b-1 && !cards.some(c=>hit(row,c)) && cards.every(c=>c.t>=row.b && c.b<=620) && cardEls.every(c=>c.scrollHeight<=c.clientHeight+2)); }
    prog.coins=150; buildChests(); TASSERT('150 coins → bronze opens for coins', chestCanOpen('bronze')==='coins' && $('#chests-row .chest-card[data-kind="bronze"] .btn.open').textContent===T('chests.openCoins','150'));
    prog.keys=1; TASSERT('one key opens nothing (keys are for gold)', chestCanOpen('bronze')===null || chestCanOpen('bronze')==='coins'); prog.keys=0;
    closeChestsScreen(); await tick();
  }
  // --- reload safety: slots live in prog, a saved copy comes back the same; ready/ticking states after the "reload"
  prog.slots=[{kind:'silver', at:now()+2*H}, null, {kind:'gold', at:now()-1000}]; saveProg();
  const saved=JSON.parse(localStorage.getItem(PROG_KEY)).slots;
  TASSERT('prog.slots persisted', Array.isArray(saved) && saved[0].kind==='silver' && saved[0].at===prog.slots[0].at && saved[1]===null && saved[2].kind==='gold');
  prog.slots=JSON.parse(JSON.stringify(saved)); slotsRender(); await tick();
  TASSERT('after a reload: tick / empty / ready', tiles('#chest-slots')[0].classList.contains('tick') && tiles('#chest-slots')[1].classList.contains('empty') && tiles('#chest-slots')[2].classList.contains('ready') && slotsReadyCount()===1);
  prog.slots=[{kind:'bronze', at:now()+50*H}, {kind:'nope', at:now()+H}, {at:5}]; slotsInv();
  TASSERT('a clock set forward is clamped to the full time; junk entries become empty', prog.slots[0].at<=now()+H+1000 && prog.slots[1]===null && prog.slots[2]===null);
  prog.slots=[null,null,null]; slotsRender();
  // --- the missions bonus is a bronze chest (no key)
  if(typeof dmEvent==='function' && typeof dailyMissions==='function'){
    prog.dm={key:dailyDay(), ids:['play2','goals5','win1'], prog:{}, done:[], reroll:0, bonus:false}; prog.keys=0; prog.dailyKeyOwed=0; training=null; state='idle';
    if(prog.chests) prog.chests.bronze=0; const c0=prog.coins|0;
    Hooks.emit('ev','goal',5); Hooks.emit('ev','win',1); Hooks.emit('ev','play',2);
    const chestOK = hasChests ? (prog.chests.bronze|0)===1 : prog.coins===c0+3*ECON.daily.missionCoins+ECON.daily.chestFallback.bronze;
    TASSERT('all three missions → bronze chest, no key', prog.dm.bonus===true && chestOK && prog.keys===0 && (prog.dailyKeyOwed|0)===0);
    TASSERT('dm.all / dm.bonus name the chest', I18N_RAW['dm.all'][0].includes('תיבת ברונזה') && I18N_RAW['dm.all'].every(s=>!s.includes('🔑')) && I18N_RAW['dm.bonus'].every(s=>!s.includes('🔑')));
    missionsOpen(); await tick();
    TASSERT('missions modal: bonus line shows the chest', $('#dms-bonus').textContent.includes('🎁') && $('#dms-bonus').textContent.includes(T('dm.chest.bronze')) && !$('#dms-bonus').textContent.includes('🔑'));
    $('#btn-dms-close').click();
  }
  // --- a real match through the core
  prog.slots=[null,null,null]; level=LEVELS[1]; mp=null; dailyMatch=false; settings.format='quick'; prog.matches=5;
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=0; endGame(); await tick(80);
  TASSERT('a real won match lands a chest in slot 1', !!prog.slots[0] && prog.slots[0].at>now());
  if(typeof endcardRow==='function'){ await tick(1600); TASSERT('the end card shows the slot line', !!$('#endcard-earn .ec-slot') && $('#endcard-earn .ec-slot').textContent.includes('⏳')); }
  goHome(); await tick(50);
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
