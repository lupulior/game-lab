/* player levels: shards from chests (shard cards for owned players), 10 shards + coins → a level (max 5), the stat boost offline only, the shop badges + upgrade button, the home tag, next-up */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length; const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  const clickYes=async()=>{ await tick(); TASSERT('ask() shows before paying', $('#ask-modal').classList.contains('show')); $('#btn-ask-yes').click(); await tick(); await tick(); };
  prog.coins=0; prog.gems=0; prog.keys=0; prog.unlocked=['haaland']; prog.admin=false; prog.superOn=false; prog.charLv={}; prog.shards={}; prog.chestPick=null; prog.cos=prog.cos||{items:[]}; mp=null;
  const me=CHARS.find(c=>c.id==='messi'), ha=CHARS.find(c=>c.id==='haaland'), pele=CHARS.find(c=>c.id==='pele'), meI=CHARS.indexOf(me);
  // --- defaults, boost, prices
  TASSERT('level defaults to 1, no shards', charLevel(me)===1 && charLevel('messi')===1 && charShards(me)===0 && charLevel({id:'nobody'})===1);
  TASSERT('boost 1 at level 1', charBoost(me)===1 && charBoost('messi')===1);
  prog.charLv={messi:2}; TASSERT('boost +2.5% at level 2', Math.abs(charBoost(me)-1.025)<1e-9);
  prog.charLv={messi:3}; TASSERT('boost +5% at level 3', Math.abs(charBoost(me)-1.05)<1e-9);
  prog.charLv={messi:5}; TASSERT('boost +10% at level 5', Math.abs(charBoost(me)-1.1)<1e-9);
  prog.charLv={messi:9}; TASSERT('level is clamped to 5', charLevel(me)===5 && Math.abs(charBoost(me)-1.1)<1e-9); prog.charLv={};
  TASSERT('prices 200/400/800/1500', charLevelPrice(2)===200 && charLevelPrice(3)===400 && charLevelPrice(4)===800 && charLevelPrice(5)===1500);
  TASSERT('charCanLevel: nothing yet', (()=>{ const s=charCanLevel(me); return s.lv===1 && s.next===2 && !s.max && s.shards===0 && s.need===10 && s.price===200 && !s.ready && !s.can; })());
  // --- st(P1): the boost applies to MY player offline only
  P1.ch=me; P2.ch=me; mp=null; prog.charLv={messi:3};
  const base=charStats(me);
  TASSERT('st(P1) offline: speed and power ×1.05, slide and jump untouched', Math.abs(st(P1).speed-base.speed*1.05)<1e-9 && Math.abs(st(P1).power-base.power*1.05)<1e-9 && st(P1).slide===base.slide && st(P1).jump===base.jump);
  TASSERT('st(P2) (the opponent with the same player) gets no boost', st(P2).speed===base.speed && st(P2).power===base.power);
  mp={role:'host', connected:false}; TASSERT('online (mp) → no boost', st(P1).speed===base.speed && st(P1).power===base.power); mp=null;
  prog.charLv={}; TASSERT('level 1 → plain stats', st(P1).speed===base.speed);
  // --- shard cards from chests (only with the chests module in the build)
  if(typeof chestCards==='function'){
    let found=0, bad=0, badN=0, badOwn=0, inRare=0; const ids=new Set();
    for(let k=0;k<120;k++){
      for(const r of ['superrare','epic','mythic','legendary']){
        const cs=chestCards(r); const s=cs.filter(c=>c.t==='shards');
        if(!s.length) continue; found++; ids.add(s[0].id);
        if(s.length>1 || cs.length!==3 || new Set(cs.map(c=>c.t+(c.id||''))).size!==3) bad++;
        if(s[0].n!==ECON.levels.chestShards[r]) badN++;
        const x=CHARS.find(c=>c.id===s[0].id); if(!x || !isUnlocked(x)) badOwn++;
      }
      if(chestCards('rare').some(c=>c.t==='shards')) inRare++;
    }
    TLOG('shard cards in 480 superrare+ draws', found);
    TASSERT('shard cards appear in superrare+ drops (3 distinct cards, the right amount, an owned player)', found>200 && found<=480 && bad===0 && badN===0 && badOwn===0);
    TASSERT('also in rare drops (2 points), about half of them', inRare>20 && inRare<110 && chestCards('rare', ()=>0.1).some(c=>c.t==='shards' && c.n===2));
    TASSERT('shards go to owned players only (free ones + haaland)', [...ids].every(id=>FREE_CHARS.includes(id) || id==='haaland') && ids.size>1);
    const seeded=chestCards('epic', ()=>0.1); TASSERT('seeded rnd below the chance → a 5-shard card for mbappe', seeded.some(c=>c.t==='shards' && c.n===5 && c.id==='mbappe') && seeded.length===3);
    TASSERT('seeded rnd above the chance → no shard card', !chestCards('epic', ()=>0.9).some(c=>c.t==='shards'));
    prog.charLv={mbappe:5, messi:5, ronaldo:5, neymar:5, haaland:5};
    TASSERT('everyone at level 5 → no shard cards', !chestCards('epic', ()=>0.1).some(c=>c.t==='shards') && !chestCards('legendary', ()=>0.1).some(c=>c.t==='shards'));
    prog.charLv={};
    TASSERT('card name / type / preview', chestCardName({t:'shards',id:'messi',n:5})===T('lv.shardCard',5,nm(me)) && chestCardType({t:'shards',id:'messi',n:5})===T('lv.shardType') && !!chestCardPreview({t:'shards',id:'messi',n:5}).querySelector('svg') && !!chestCardPreview({t:'shards',id:'messi',n:5}).querySelector('.lv-shardbadge'));
    TASSERT('other card types still work', chestCardName({t:'coins',n:50})===T('chests.c.coins','50') && chestCardPreview({t:'gems',n:2}).textContent==='💎');
    // granting a shards card adds shards, not a player
    const u0=prog.unlocked.length; let hookShards=null; Hooks.on('shards', (id,n)=>{ hookShards=[id,n]; });
    TASSERT('chestGrant(shards) → +5 shards, no new player, hook fired', chestGrant({t:'shards',id:'messi',n:5},'keys')===true && prog.shards.messi===5 && prog.unlocked.length===u0 && hookShards && hookShards[0]==='messi' && hookShards[1]===5);
    TASSERT('shards keep adding up', chestGrant({t:'shards',id:'messi',n:8},'owned')===true && prog.shards.messi===13);
    prog.shards={};
    // the drop screen renders a shard card through the helpers
    prog.chestPick={kind:'silver', rarity:'epic', cards:[{t:'shards',id:'messi',n:5},{t:'coins',n:150},{t:'gems',n:5}], paid:'keys', all:false};
    openChestsScreen(); await tick();
    TASSERT('chests screen lists ⚡ among the drops', [...document.querySelectorAll('#chests-row .chest-card .can')].every(e=>e.textContent.includes('⚡')));
    chestDropResume(); await tick();
    const card0=document.querySelectorAll('#cd-cards .ccard')[0];
    TASSERT('shard card shown: player sprite + ⚡ badge + name + type', DROP.phase==='cards' && !!card0 && !!card0.querySelector('.pv.lv-shardpv svg') && !!card0.querySelector('.lv-shardbadge') && card0.querySelector('.pname').textContent===T('lv.shardCard',5,nm(me)) && card0.querySelector('.ptype').textContent===T('lv.shardType'));
    card0.click(); await tick(1400);
    TASSERT('picking it grants the shards', prog.shards.messi===5 && !prog.chestPick && $('#cd-got').textContent.includes('⚡'));
    $('#btn-chest-done').click(); await tick(); closeChestsScreen(); await tick();
  } else TLOG('chests module not in this build', 'shard card tests skipped');
  // --- level-up through charLevelUp (silent)
  prog.shards={messi:10}; prog.coins=100;
  TASSERT('no coins → refused', (await charLevelUp(me, {silent:true}))===false && charLevel(me)===1 && prog.shards.messi===10 && prog.coins===100);
  prog.shards={messi:7}; prog.coins=1000;
  TASSERT('no shards → refused', (await charLevelUp(me, {silent:true}))===false && charLevel(me)===1 && prog.coins===1000);
  TASSERT('locked player → refused', (await charLevelUp(pele, {silent:true}))===false);
  prog.shards={messi:12}; let hookLv=null; Hooks.on('charLevel', (id,lv)=>{ hookLv=[id,lv]; });
  TASSERT('10 shards + 200 coins → level 2, 2 shards left, hook fired', (await charLevelUp(me, {silent:true}))===true && charLevel(me)===2 && prog.shards.messi===2 && prog.coins===800 && hookLv && hookLv[0]==='messi' && hookLv[1]===2);
  prog.shards={messi:10}; TASSERT('level 3 costs 400', (await charLevelUp('messi', {silent:true}))===true && charLevel(me)===3 && prog.coins===400);
  prog.shards={messi:10}; TASSERT('level 4 costs 800 → not affordable with 400', (await charLevelUp(me, {silent:true}))===false && charLevel(me)===3);
  prog.coins=5000; prog.shards={messi:10}; await charLevelUp(me, {silent:true}); prog.shards={messi:10}; await charLevelUp(me, {silent:true});
  TASSERT('up to 5: 800 + 1500 spent', charLevel(me)===5 && prog.coins===5000-800-1500);
  prog.shards={messi:10}; TASSERT('max level → refused, nothing spent', (await charLevelUp(me, {silent:true}))===false && charLevel(me)===5 && prog.coins===2700 && prog.shards.messi===10 && charCanLevel(me).max);
  // --- the shop's players tab (only with the shop module in the build)
  if(typeof openShop==='function'){
    prog.charLv={messi:2}; prog.shards={messi:10}; prog.coins=100; shopFilter='all'; shopPick=meI;
    openShop('players'); await tick();
    const cardMe=$('#shop-pgrid .shop-pcard[data-i="'+meI+'"]'), cardHa=$('#shop-pgrid .shop-pcard[data-i="'+CHARS.indexOf(ha)+'"]'), cardPele=$('#shop-pgrid .shop-pcard[data-i="'+CHARS.indexOf(pele)+'"]');
    TASSERT('owned card: level badge + shard bar, ready state', !!cardMe && cardMe.querySelector('.lv-badge').textContent===T('lv.badge',2) && cardMe.querySelector('.lv-shards').textContent.includes('10/10') && cardMe.classList.contains('lv-ready'));
    TASSERT('other owned card: Lv 1, 0/10', !!cardHa && cardHa.querySelector('.lv-badge').textContent===T('lv.badge',1) && cardHa.querySelector('.lv-shards').textContent.includes('0/10') && !cardHa.classList.contains('lv-ready'));
    TASSERT('locked card: no level row', !!cardPele && !cardPele.querySelector('.lv-row'));
    TASSERT('preview: level box, bar, grey upgrade button with the price (coins missing)', $('#shop-ppv .lv-lvl').textContent.includes(T('lv.badge',2)) && $('#shop-ppv .lv-bar span').textContent.includes('10/10') && !!$('#shop-ppv .lv-upbtn.off') && $('#shop-ppv .lv-upbtn').textContent.includes('400'));
    $('#shop-ppv .lv-upbtn').click(); await tick();
    TASSERT('grey button → warning toast, nothing changes', charLevel(me)===2 && !$('#ask-modal').classList.contains('show'));
    prog.coins=450; shopBuildTab(); await tick();
    TASSERT('coins there → green upgrade button', !!$('#shop-ppv .lv-upbtn.green') && !$('#shop-ppv .lv-upbtn.off'));
    $('#shop-ppv .lv-upbtn').click(); await tick(); $('#btn-ask-no').click(); await tick();
    TASSERT('no → nothing spent', charLevel(me)===2 && prog.coins===450 && prog.shards.messi===10);
    $('#shop-ppv .lv-upbtn').click(); await clickYes(); await tick();
    TASSERT('yes → level 3, coins spent, shards used', charLevel(me)===3 && prog.coins===50 && prog.shards.messi===0);
    TASSERT('shop re-rendered: badge Lv 3, 0/10, button grey again', $('#shop-pgrid .shop-pcard[data-i="'+meI+'"] .lv-badge').textContent===T('lv.badge',3) && $('#shop-ppv .lv-bar span').textContent.includes('0/10') && !!$('#shop-ppv .lv-upbtn.off'));
    prog.charLv={messi:5}; shopBuildTab(); await tick();
    TASSERT('max level: gold badge, no bar, no button', $('#shop-ppv .lv-box.max') && !$('#shop-ppv .lv-bar') && !$('#shop-ppv .lv-upbtn') && $('#shop-pgrid .shop-pcard[data-i="'+meI+'"] .lv-row.max') && !$('#shop-pgrid .shop-pcard[data-i="'+meI+'"] .lv-shards'));
    TASSERT('the select button is still there', !!$('#shop-ppv .btn[data-act=select]') || shopPick===selected);
    // --- next up
    prog.charLv={messi:1}; prog.shards={messi:10}; prog.coins=200; showScreen('home'); await tick();
    const mine=()=>NextUp.fns.map(f=>{ try{ return f(); }catch(e){ return null; } }).find(x=>x && x.icon==='⚡');
    const nu=mine(); TASSERT('next-up entry when a player can be upgraded', !!nu && nu.prio===30 && nu.text===T('lv.nextUp', nm(me)));
    nu.action(); await tick();
    TASSERT('next-up opens the players tab on that player with the green button', $('#shop').classList.contains('active') && shopTab==='players' && shopPick===meI && !!$('#shop-ppv .lv-upbtn.green'));
    prog.coins=0; TASSERT('no coins → no next-up', !mine()); prog.shards={}; prog.coins=500; TASSERT('no shards → no next-up', !mine());
    showScreen('home'); await tick();
  } else TLOG('shop module not in this build', 'players tab tests skipped');
  // --- home tag
  selected=meI; prog.charLv={messi:4}; refreshHome(); await tick();
  TASSERT('home: ⭐ Lv 4 tag beside the name', !!$('#home-name .lv-tag') && $('#home-name .lv-tag').textContent===T('lv.badge',4) && $('#home-name').textContent.startsWith(nm(me)));
  prog.charLv={}; refreshHome(); await tick(); TASSERT('level 1 → no tag', !$('#home-name .lv-tag'));
  selected=0; refreshHome();
  prog.charLv={}; prog.shards={}; prog.coins=0; P1.ch=CHARS[0]; P2.ch=CHARS[1];
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
