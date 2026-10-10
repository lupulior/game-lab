/* arenas: index from trophies, the pitch per arena, exclusive-player locks (gallery, shop, tryBuy, shopBuyChar), the home pill + modal, the new-arena celebration once */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length; const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  const byId=id=>CHARS.find(c=>c.id===id);
  const pitchBase=()=>{ const r=$('#pitch svg rect'); return r ? r.getAttribute('fill') : null; };
  prog.trophies=0; prog.arenaSeen=1; prog.unlocked=[]; prog.coins=0; prog.gems=0; prog.admin=false; prog.cos=prog.cos||{items:[]}; prog.cos.items=prog.cos.items||[]; prog.eq=prog.eq||{}; delete prog.eq.stadium;
  mp=null; v2=null; training=null; dailyMatch=false;
  // --- arena index from trophies
  TASSERT('6 arenas with rising thresholds 0/25/75/150/300/600', ARENAS.length===6 && ARENAS.map(a=>a.t).join()==='0,25,75,150,300,600' && ARENAS.every((a,i)=>a.i===i+1));
  TASSERT('arenaIndex: 0→1, 24→1, 25→2, 74→2, 75→3, 150→4, 299→4, 300→5, 600→6, 9999→6', [0,24,25,74,75,150,299,300,600,9999].map(t=>arenaIndex(t)).join()==='1,1,2,2,3,4,4,5,6,6');
  prog.trophies=30; TASSERT('arenaCurrent / arenaNextOf follow prog.trophies', arenaCurrent().i===2 && arenaNextOf().t===75);
  prog.trophies=600; TASSERT('the top arena has no next', arenaNextOf()===null && arenaCurrent().i===6);
  TASSERT('every arena is named in 4 languages', ARENAS.every(a=>I18N_RAW['arena.'+a.i] && I18N_RAW['arena.'+a.i].length===4 && I18N_RAW['arena.'+a.i].every(s=>s)));
  // --- exclusive players
  const ex=ARENAS.filter(a=>a.char);
  TASSERT('5 exclusive players, one per arena 2..6', ex.length===5 && ex.map(a=>a.i).join()==='2,3,4,5,6' && new Set(ex.map(a=>a.char)).size===5);
  TASSERT('exclusives are real, paid, not trophy-only, not trophy-road rewards', ex.every(a=>{ const c=byId(a.char); return !!c && !FREE_CHARS.includes(c.id) && !c.trophyOnly && roadFor(c.id)===undefined && priceOf(c)>=1000; }));
  TASSERT('no exclusive is the first locked player (the shop test buys that one)', ex.every(a=>CHARS.indexOf(byId(a.char))!==CHARS.findIndex(c=>!FREE_CHARS.includes(c.id) && !c.trophyOnly)));
  // --- pitch themes
  TASSERT('arenas 2..6 have their own, distinct pitch themes', ex.every(a=>PITCH_THEMES[a.theme] && PITCH_THEMES[a.theme].base && PITCH_THEMES[a.theme].boards.length) && new Set(ex.map(a=>PITCH_THEMES[a.theme].base+PITCH_THEMES[a.theme].track)).size===5 && ex.every(a=>PITCH_THEMES[a.theme].base!==PITCH_THEMES.day.base || PITCH_THEMES[a.theme].track!==PITCH_THEMES.day.track));
  prog.trophies=75; buildPitch('day');
  TASSERT('arena 3: a plain day match draws the arena pitch, pitchTheme stays "day"', pitchBase()===PITCH_THEMES.arena3.base && pitchTheme==='day' && $('#game').getAttribute('data-arena')==='3');
  buildPitch('daily');
  TASSERT('the daily match keeps its own pitch', pitchBase()===PITCH_THEMES.daily.base && pitchTheme==='daily' && !$('#game').hasAttribute('data-arena'));
  buildPitch('night');
  TASSERT('2v2 keeps the night pitch', pitchBase()===PITCH_THEMES.night.base && pitchTheme==='night');
  mp={role:'host', connected:false}; buildPitch('day'); TASSERT('online: the plain day pitch', pitchBase()===PITCH_THEMES.day.base && !$('#game').hasAttribute('data-arena')); mp=null;
  v2={partner:'ai'}; buildPitch('day'); TASSERT('2v2 flag: the plain day pitch', pitchBase()===PITCH_THEMES.day.base); v2=null;
  prog.trophies=0; buildPitch('day'); TASSERT('arena 1: the default day pitch', pitchBase()===PITCH_THEMES.day.base && !$('#game').hasAttribute('data-arena'));
  if(typeof giveCosmetic==='function' && PITCH_THEMES.stad_beach){
    prog.trophies=300; giveCosmetic('stad_beach'); prog.eq.stadium='stad_beach'; buildPitch('day');
    TASSERT('an equipped stadium look beats the arena pitch', pitchBase()===PITCH_THEMES.stad_beach.base && !$('#game').hasAttribute('data-arena'));
    delete prog.eq.stadium; prog.cos.items=prog.cos.items.filter(x=>x!=='stad_beach'); buildPitch('day');
    TASSERT('unequipped → the arena pitch again', pitchBase()===PITCH_THEMES.arena5.base && $('#game').getAttribute('data-arena')==='5');
  }
  // --- lock / unlock an exclusive player through tryBuy
  const a2=ARENAS[1], c2=byId(a2.char); prog.trophies=0; prog.unlocked=[]; prog.coins=priceOf(c2)*2;
  TASSERT('exclusive locked below its arena', !!arenaLocked(c2) && arenaLocked(c2).i===2 && arenaFor(c2)===a2);
  let ok=await tryBuy(c2); await tick();
  TASSERT('tryBuy refused: no question, not unlocked, coins kept', ok===false && !$('#ask-modal').classList.contains('show') && !isUnlocked(c2) && prog.coins===priceOf(c2)*2);
  prog.trophies=25; TASSERT('unlocked for sale at the threshold', arenaLocked(c2)===null);
  const p2=tryBuy(c2); await tick(); TASSERT('tryBuy now asks', $('#ask-modal').classList.contains('show')); $('#btn-ask-yes').click(); ok=await p2; await tick();
  TASSERT('bought once the arena is reached', ok===true && isUnlocked(c2) && prog.coins===priceOf(c2));
  if(typeof shopBuyChar==='function'){
    const a3=ARENAS[2], c3=byId(a3.char); prog.coins=priceOf(c3)*2; prog.gems=1000;
    ok=await shopBuyChar(c3, false); await tick();
    TASSERT('shopBuyChar refused below arena 3', ok===false && !isUnlocked(c3) && !$('#ask-modal').classList.contains('show') && prog.coins===priceOf(c3)*2);
    prog.trophies=75; const p3=shopBuyChar(c3, true); await tick(); TASSERT('shopBuyChar asks in arena 3', $('#ask-modal').classList.contains('show')); $('#btn-ask-yes').click(); ok=await p3; await tick();
    TASSERT('shopBuyChar allowed in arena 3', ok===true && isUnlocked(c3) && prog.gems===1000-charDealGems(c3));
    prog.trophies=0; prog.unlocked=prog.unlocked.filter(id=>id!==c3.id);
    const rot=shopRotation(); TASSERT('the character of the day is never arena-locked', !rot[0].char || !arenaLocked(rot[0].char));
  }
  // --- lock labels in the gallery and the shop
  prog.trophies=0; prog.unlocked=[]; const a4=ARENAS[3], c4=byId(a4.char), i4=CHARS.indexOf(c4);
  galFilter='all'; buildGallery();
  const card=$('#gallery .card[data-i="'+i4+'"]');
  TASSERT('gallery card shows the arena lock', !!card && card.classList.contains('arena-locked') && !!card.querySelector('.lock.arena-lock') && card.querySelector('.lock').textContent===T('arena.lock', 4, 150));
  previewIdx=i4; refreshPreview(); TASSERT('gallery choose button shows the arena lock', $('#btn-choose').textContent===T('arena.lockBtn', 4, 150));
  prog.trophies=150; buildGallery(); refreshPreview();
  TASSERT('reaching the arena removes the lock label (price again)', !$('#gallery .card[data-i="'+i4+'"] .arena-lock') && $('#gallery .card[data-i="'+i4+'"] .lock').textContent.includes(fmtXp(priceOf(c4))) && $('#btn-choose').textContent===T('shop.unlock', fmtXp(priceOf(c4))));
  prog.trophies=0;
  if(typeof openShop==='function'){
    openShop('players'); shopFilter='all'; shopPick=i4; shopBuildTab(); await tick();
    const pc=$('#shop-pgrid .shop-pcard[data-i="'+i4+'"]');
    TASSERT('shop card shows the arena lock', !!pc && pc.classList.contains('arena-locked') && pc.querySelector('.pr').textContent===T('arena.lock', 4, 150));
    TASSERT('shop preview: lock text, no buy button, an arenas button', $('#shop-ppv .pr').textContent===T('arena.lock', 4, 150) && !$('#shop-ppv .btn[data-act=buy]') && !!$('#shop-ppv .btn[data-act=arena]'));
    const plain=CHARS.findIndex(c=>!FREE_CHARS.includes(c.id) && !c.trophyOnly && !arenaFor(c));
    TASSERT('an ordinary locked player keeps its price', $('#shop-pgrid .shop-pcard[data-i="'+plain+'"] .pr').textContent.includes('🪙'));
    $('#shop-ppv .btn[data-act=arena]').click(); await tick();
    TASSERT('the arenas button opens the modal', $('#arena-modal').classList.contains('show')); $('#btn-arena-close').click(); await tick();
    showScreen('home'); await tick();
  }
  // --- home pill
  prog.trophies=30; showScreen('home'); refreshHome(); await tick();
  const pill=$('#home-arena');
  TASSERT('arena pill on the home, right before the trophy pill', !!pill && pill.nextElementSibling===$('#trophy-pill') && $('#home').getAttribute('data-arena')==='2' && pill.getAttribute('data-arena')==='2');
  TASSERT('pill: 🏟️ + arena name + trophies to the next arena', pill.textContent.includes('🏟️') && pill.textContent.includes(T('arena.2')) && pill.textContent.includes(T('arena.next', 45)));
  { const s=$('#stage').getBoundingClientRect(), sc=s.width/1000, pr=pill.getBoundingClientRect(), tr=$('#trophy-pill').getBoundingClientRect();
    TASSERT('pill is thumb-sized and inside the stage', pill.offsetHeight>=44 && pill.offsetWidth>=150 && pr.top>=s.top-1 && pr.bottom<=s.bottom+1 && pr.left>=s.left-1 && pr.right<=s.right+1);
    if($('#home-trophy')){ TASSERT('trophy pill still at the bottom-left', (s.bottom-tr.bottom)/sc<40 && pr.bottom<=tr.top+1);
      const tc=$('#today-card'); const t=tc ? tc.getBoundingClientRect() : null; TASSERT('arena pill clear of the today card', !t || pr.top>=t.bottom-1 || pr.left>=t.right-1 || pr.right<=t.left+1); } }
  prog.trophies=600; refreshHome(); await tick();
  TASSERT('top arena: last-arena text + arena 6 background', pill.textContent.includes(T('arena.top')) && $('#home').getAttribute('data-arena')==='6');
  TASSERT('home backgrounds differ per arena', (()=>{ const seen=new Set(); for(const a of ARENAS){ $('#home').setAttribute('data-arena', a.i); const cs=getComputedStyle($('#home')); seen.add(cs.backgroundImage+'|'+cs.backgroundColor); } return seen.size===6; })());
  TASSERT('wallet hook refreshes the pill', (prog.trophies=100, updateXpBadge(), pill.textContent.includes(T('arena.3')) && pill.textContent.includes(T('arena.next', 50))));
  // --- the arenas modal
  prog.trophies=30; refreshHome(); await tick(); pill.click(); await tick();
  TASSERT('arenas modal lists the six arenas, marks mine', $('#arena-modal').classList.contains('show') && document.querySelectorAll('#arena-list .arn-row').length===6 && document.querySelectorAll('#arena-list .arn-row.here').length===1 && $('#arena-list .arn-row.here').dataset.arena==='2');
  TASSERT('rows: swatch, exclusive player, threshold, status', document.querySelectorAll('#arena-list .arn-row .arn-sw svg').length===6 && document.querySelectorAll('#arena-list .arn-row .arn-ch svg').length===5 && [...document.querySelectorAll('#arena-list .arn-st')].map(e=>e.textContent).join('')==='✔📍🔒🔒🔒🔒' && $('#arena-list .arn-row[data-arena="6"] .arn-mid small').textContent.includes('600'));
  TASSERT('modal sub line + fits the stage', $('#arena-sub').textContent===T('arena.sub', '30', 2) && $('#arena-modal .panel').getBoundingClientRect().height<=$('#stage').getBoundingClientRect().height);
  $('#btn-arena-close').click(); await tick(); TASSERT('modal closes', !$('#arena-modal').classList.contains('show'));
  // --- celebration once: a win that crosses 25 trophies
  let gift=0; Hooks.on('coins', (n,why)=>{ if(why==='arena') gift+=n; });
  prog.trophies=24; prog.arenaSeen=1; prog.unlocked=[]; settings.format='quick'; level=LEVELS[1]; mp=null; v2=null; dailyMatch=false; training=null; refreshHome(); await tick();
  beginMatch(CHARS[0], CHARS[1]); await tick();
  TASSERT('a match in arena 1 draws the default pitch', pitchBase()===PITCH_THEMES.day.base && !$('#game').hasAttribute('data-arena'));
  state='play'; score.me=2; score.op=0; endGame(); await tick(ECON.arenas.showDelay+500);
  TASSERT('crossing into arena 2 → celebration modal, 🪙 200 gift, arenaSeen=2', (prog.trophies|0)>=25 && prog.arenaSeen===2 && $('#arena-new-modal').classList.contains('show') && gift===200 && $('#arena-new-name').textContent===T('arena.2') && $('#arena-new-gift').textContent.includes('200'));
  TASSERT('celebration names the exclusive player and shows the pitch', !$('#arena-new-char').hidden && $('#arena-new-char').textContent.includes(nm(byId(ARENAS[1].char))) && !!$('#arena-new-sw svg'));
  $('#btn-arena-new-ok').click(); await tick(); TASSERT('celebration closes', !$('#arena-new-modal').classList.contains('show'));
  goHome(); refreshHome(); await tick();
  gift=0; state='idle'; beginMatch(CHARS[0], CHARS[1]); await tick();
  TASSERT('the next match is played on the arena 2 pitch', pitchBase()===PITCH_THEMES.arena2.base && $('#game').getAttribute('data-arena')==='2' && pitchTheme==='day');
  state='play'; score.me=1; score.op=0; endGame(); await tick(ECON.arenas.showDelay+500);
  TASSERT('no second celebration inside the same arena', !$('#arena-new-modal').classList.contains('show') && gift===0 && prog.arenaSeen===2);
  goHome(); refreshHome(); await tick();
  TASSERT('a deferred celebration waits for the match to end', (prog.trophies=80, state='play', arenaCheckNew(0), !$('#arena-new-modal').classList.contains('show') && prog.arenaSeen===3 && gift===300));
  state='idle'; refreshHome(); await tick(); TASSERT('…and shows on the next home', $('#arena-new-modal').classList.contains('show') && $('#arena-new-name').textContent===T('arena.3'));
  $('#btn-arena-new-ok').click(); await tick();
  // --- cleanup for the next test files
  prog.trophies=0; prog.arenaSeen=1; prog.unlocked=[]; prog.coins=0; prog.gems=0; pitchTheme=''; state='idle'; $('#home').removeAttribute('data-arena'); refreshHome();
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length>errs0) TLOG('errors', window.__errs.slice(errs0));
  TDONE();
})();
