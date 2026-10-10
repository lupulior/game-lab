/* shop + cosmetics + locker: rotation, buying through the DOM, locker equip/unequip, rendering hooks */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const tick=()=>new Promise(r=>setTimeout(r,15));
  const errs0=window.__errs.length;
  const purchases=[]; Hooks.on('purchase', o=>purchases.push(o));
  prog.coins=0; prog.gems=0; prog.unlocked=[]; prog.admin=false; prog.ice=false; prog.fire=false; delete prog.cos; delete prog.eq; delete prog.shop;

  // --- screen + tabs
  openShop();
  TASSERT('shop screen opens', $('#shop').classList.contains('active') && $('#home').classList.contains('active')===false);
  TASSERT('5 tabs, today selected', document.querySelectorAll('#shop-tabs .shop-tab').length===5 && $('#shop-tabs .shop-tab.on').dataset.tab==='today');
  TASSERT('wallet pills show coins and gems', $('#shop-coins').textContent.includes('🪙') && $('#shop-gems').textContent.includes('💎'));
  // --- the countdown pill: on top, H:MM:SS, ticking every second, red under an hour
  const tmEl=$('#shop-timer');
  TASSERT('countdown pill on top of the today tab shows H:MM:SS', !!tmEl && tmEl.parentElement.classList.contains('shop-today-top') && /\d+:\d\d:\d\d/.test(tmEl.textContent) && tmEl.textContent===T('shop.renewFull', shopTimeLeftFull()));
  TASSERT('shopTimeLeftFull = H:MM:SS, shopTimeLeft = H:MM, both from the same ms', /^\d+:\d\d:\d\d$/.test(shopTimeLeftFull()) && /^\d+:\d\d$/.test(shopTimeLeft()) && shopTimeLeftFull().startsWith(shopTimeLeft()) && shopTimeLeftMs()>0 && shopTimeLeftMs()<=864e5);
  TASSERT('urgent (red pulse) only under 1 hour', tmEl.classList.contains('urgent')===(shopTimeLeftMs()<36e5));
  const t0=tmEl.textContent, ms0=shopTimeLeftMs(); await new Promise(r=>setTimeout(r,1100)); const t1=$('#shop-timer').textContent; TLOG('countdown', t0+' → '+t1);
  TASSERT('countdown ticks every second while the shop is open', shopTimer>0 && t1!==t0 && /\d+:\d\d:\d\d/.test(t1) && shopTimeLeftMs()<ms0);
  // --- the free gift of the day: first card, once a day, drives the home dot and NextUp
  const gift=shopFreeGift(); TLOG('free gift', gift.t+(gift.n?' '+gift.n:' '+gift.kind));
  const cards=document.querySelectorAll('#shop-body .shop-slot');
  TASSERT('6 cards: the free gift first, then the 5 deals', cards.length===6 && cards[0].dataset.slot==='free' && cards[0].classList.contains('free') && cards[1].dataset.slot==='char' && cards[5].dataset.slot==='chest');
  TASSERT('every card is tagged "today only"', document.querySelectorAll('#shop-body .shop-slot .shop-tonly').length===6 && cards[0].querySelector('.shop-tonly').textContent===T('shop.todayOnly'));
  TASSERT('free card: FREE badge + take button, not taken yet', !!cards[0].querySelector('.shop-free-badge') && !!cards[0].querySelector('.btn[data-buy=free]') && !shopFreeClaimed() && !cards[0].classList.contains('sold'));
  TASSERT('free gift rotates by the day index, keyed today:free', ['coins','keys','gems','chest'].includes(gift.t) && gift.key===dayKey()+':free' && (gift.t!=='chest' || typeof giveChest==='function') && cards[0].dataset.gift===gift.t);
  TASSERT('deal of the day: glowing frame + −30% ribbon on the character, −10% on the silver chest', cards[1].classList.contains('deal') && cards[1].querySelector('.shop-badge-off').textContent==='−30%' && cards[5].classList.contains('deal') && cards[5].querySelector('.shop-badge-off').textContent==='−10%');
  const nuFree=()=>NextUp.fns.map(f=>{ try{ return f(); }catch(e){ return null; } }).find(c=>c && c.prio===40 && c.text===T('shop.nextFree'));
  TASSERT('NextUp: free gift (prio 40) while unclaimed', !!nuFree() && typeof nuFree().action==='function');
  TASSERT('shopHasNew true while the gift waits (seen today, seenWeek current)', prog.shop.seen===dayKey() && prog.shop.seenWeek===shopWeek() && shopHasNew()===true);
  prog.coins=0; prog.keys=0; prog.gems=0; prog.chests=prog.chests||{}; prog.chests.bronze=0;
  const frees=[]; Hooks.on('shopFree', g=>frees.push(g));
  $('#shop-body .shop-slot[data-slot=free] .btn[data-buy=free]').click(); await tick();
  const got = gift.t==='coins' ? prog.coins===gift.n && !prog.keys && !prog.gems : gift.t==='keys' ? prog.keys===gift.n && !prog.coins && !prog.gems : gift.t==='gems' ? prog.gems===gift.n && !prog.coins && !prog.keys : (prog.chests.bronze|0)===1 && !prog.coins && !prog.gems;
  TASSERT('take! grants the reward of the day once', got && frees.length===1 && frees[0].t===gift.t);
  const fc=$('#shop-body .shop-slot[data-slot=free]');
  TASSERT('taken: prog.shop.bought[today:free], card sold, "taken" + "more tomorrow", no button', prog.shop.bought[dayKey()+':free']==='free_'+gift.t && shopFreeClaimed() && fc.classList.contains('sold') && fc.textContent.includes(T('shop.freeTaken')) && fc.textContent.includes(T('shop.freeTomorrow')) && !fc.querySelector('.btn'));
  const c0=prog.coins, k0=prog.keys, g0=prog.gems, ch0=prog.chests.bronze|0;
  TASSERT('a second claim is refused, nothing granted twice', shopClaimFree()===false && prog.coins===c0 && prog.keys===k0 && prog.gems===g0 && (prog.chests.bronze|0)===ch0 && frees.length===1);
  TASSERT('shopHasNew false after taking the gift', shopHasNew()===false);
  TASSERT('NextUp free-gift entry gone after taking', !nuFree());
  prog.coins=0; prog.gems=0; prog.keys=0;
  // --- Sunday drop clock
  TLOG('shopWeek', shopWeek());
  TASSERT('shopWeek is a non-negative integer', Number.isInteger(shopWeek()) && shopWeek()>=0);
  TASSERT('future drops are not for sale', unownedCosmetics().every(c=>!c.week || c.week<=shopWeek()));
  TASSERT('unownedCosmetics(rarity) filters', unownedCosmetics('epic').every(c=>c.rarity==='epic') && unownedCosmetics('epic').length>0);
  // --- rotation
  const rot=shopRotation(), rot2=shopRotation();
  TASSERT('rotation has 5 slots: char, cos, cos, gem, chest', rot.length===5 && rot.map(s=>s.slot).join()==='char,cos,cos,gem,chest');
  TASSERT('rotation is deterministic', JSON.stringify(rot.map(s=>(s.char&&s.char.id)||(s.item&&s.item.id)||s.chest))===JSON.stringify(rot2.map(s=>(s.char&&s.char.id)||(s.item&&s.item.id)||s.chest)));
  const cd=rot[0].char;
  TASSERT('character of the day: unowned, not free, not road-only', !!cd && !isUnlocked(cd) && !FREE_CHARS.includes(cd.id) && !cd.trophyOnly);
  TASSERT('character of the day: −30% coins, ceil(price/100) gems', rot[0].coins===Math.round(priceOf(cd)*.7/10)*10 && rot[0].gems===Math.ceil(priceOf(cd)/100));
  TASSERT('coin slots hold unowned coin cosmetics', rot[1].item && rot[2].item && rot[1].item.id!==rot[2].item.id && [rot[1],rot[2]].every(s=>s.item.price>0 && !s.item.gems && !cosOwned(s.item.id)));
  TASSERT('gem slot is a gem item or a gold chest deal', (rot[3].item && rot[3].item.gems>0) || (rot[3].chest==='gold' && rot[3].gems===20));
  TASSERT('chest deal: silver for 450', rot[4].chest==='silver' && rot[4].coins===450);
  TASSERT('5 deal cards + the free card in the DOM, indexed by rotation slot', document.querySelectorAll('#shop-body .shop-slot[data-i]').length===5 && $('#shop-body .shop-slot[data-i="0"]').dataset.slot==='char' && $('#shop-body .shop-slot[data-i="4"]').dataset.slot==='chest');
  // --- NextUp candidate (found by priority: other modules may register louder entries)
  const nuChar=()=>NextUp.fns.map(f=>{ try{ return f(); }catch(e){ return null; } }).find(c=>c && c.prio===20);
  prog.coins=rot[0].coins; const best=nuChar();
  TASSERT('NextUp: character of the day when affordable', !!best && best.prio===20 && best.text.includes(nm(cd)));
  // --- buy the character of the day with coins through the DOM
  $('#shop-body .shop-slot[data-slot=char] .btn[data-buy=coins]').click(); await tick();
  TASSERT('char deal asks first', $('#ask-modal').classList.contains('show')); $('#btn-ask-yes').click(); await tick(); await tick();
  TASSERT('char deal bought: unlocked, coins spent, slot SOLD', isUnlocked(cd) && prog.coins===0 && $('#shop-body .shop-slot[data-slot=char]').classList.contains('sold') && prog.shop.bought[rot[0].key]===cd.id);
  TASSERT('purchase hook fired for the character', purchases.some(o=>o.type==='char' && o.id===cd.id && o.price===rot[0].coins));
  TASSERT('NextUp candidate gone after buying', !nuChar());
  // --- buy a coin cosmetic through the DOM
  const it=rot[1].item; prog.coins=it.price+5;
  TASSERT('slots 2-5 unchanged after buying the character', shopRotation()[1].item.id===it.id && shopRotation()[2].item.id===rot[2].item.id);
  $('#shop-body .shop-slot[data-i="1"] .btn[data-buy]').click(); await tick(); $('#btn-ask-yes').click(); await tick(); await tick();
  TASSERT('cosmetic bought: owned, auto-equipped, coins spent', cosOwned(it.id) && prog.eq[it.type]===it.id && prog.coins===5 && ownedCosmetics(it.type).some(c=>c.id===it.id));
  TASSERT('cosmetic slot marked SOLD and still shows the item', $('#shop-body .shop-slot[data-i="1"]').classList.contains('sold') && shopRotation()[1].item.id===it.id);
  TASSERT('not enough coins → refused without asking', (await shopBuyItem(rot[2].item))===false && !$('#ask-modal').classList.contains('show') && !cosOwned(rot[2].item.id));
  // --- chest deal (no chests module in this build → prog.chests)
  prog.coins=450; $('#shop-body .shop-slot[data-slot=chest] .btn[data-buy]').click(); await tick(); $('#btn-ask-yes').click(); await tick(); await tick();
  TASSERT('silver chest deal: 450 coins → prog.chests.silver', prog.coins===0 && (typeof giveChest==='function' || prog.chests.silver===1) && $('#shop-body .shop-slot[data-slot=chest]').classList.contains('sold'));
  // --- reroll
  prog.gems=10; const ids0=shopRotation().map(s=>(s.char&&s.char.id)||(s.item&&s.item.id)||s.chest).join();
  $('#shop-reroll').click(); await tick(); $('#btn-ask-yes').click(); await tick(); await tick();
  TASSERT('reroll: 5 gems, once a day, new seed', prog.gems===5 && prog.shop.reroll===dayKey() && $('#shop-reroll').classList.contains('done') && shopRotation().map(s=>(s.char&&s.char.id)||(s.item&&s.item.id)||s.chest).join()!==ids0);
  TASSERT('rerolled slots are not SOLD (the taken free gift stays taken)', document.querySelectorAll('#shop-body .shop-slot[data-i].sold').length===0 && $('#shop-body .shop-slot[data-slot=free]').classList.contains('sold'));
  $('#shop-reroll').click(); await tick();
  TASSERT('second reroll refused', !$('#ask-modal').classList.contains('show') && prog.gems===5);
  // --- giveCosmetic / welcome kit
  TASSERT('giveCosmetic(kit_il) works once', giveCosmetic('kit_il')===true && cosOwned('kit_il') && giveCosmetic('kit_il')===false && giveCosmetic('nope')===false);
  // --- skinFor
  equipCosmetic('kit_il'); giveCosmetic('boots_gold'); equipCosmetic('boots_gold');
  const me=CHARS[selected], other=CHARS.find(c=>c.id!==me.id);
  const sk=skinFor(me);
  TASSERT('skinFor merges kit + boots for my character', sk && sk.jersey==='#1D6FE8' && sk.boots==='#F5C542' && sk.shorts==='#FFFFFF');
  TASSERT('skinFor: null for other characters', skinFor(other)===null);
  training='shoot'; TASSERT('skinFor: null in training', skinFor(me)===null); training=null;
  TASSERT('home sprite wears the kit', (refreshHome(), $('#home-sprite').innerHTML.includes('#1D6FE8')));
  TASSERT('equipCosmetic refuses unowned items', equipCosmetic('kit_gold')===false && prog.eq.kit==='kit_il');
  // --- ball
  TASSERT('ballSkin null when nothing equipped', ballSkin()===null && ballSVG()===BALL_SVG);
  giveCosmetic('ball_flame'); equipCosmetic('ball_flame');
  TASSERT('ballSkin returns an SVG and #ball updates', typeof ballSkin()==='string' && ballSkin().startsWith('<svg') && ballSkin().includes('#FF7A3D') && $('#ball').innerHTML.includes('#FF7A3D'));
  // --- stadium
  giveCosmetic('stad_beach'); equipCosmetic('stad_beach');
  TASSERT('stadiums registered as pitch themes', !!PITCH_THEMES.stad_beach && !!PITCH_THEMES.stad_night && PITCH_THEMES.stad_night.night===true);
  mp=null; v2=null; buildPitch('day');
  TASSERT('offline day pitch uses the equipped stadium', $('#pitch').innerHTML.includes('#E8C97A') && pitchTheme==='day');
  v2={src:{},kp:[]}; buildPitch('day'); TASSERT('2v2 keeps the normal pitch', !$('#pitch').innerHTML.includes('#E8C97A')); v2=null;
  buildPitch('daily'); TASSERT('daily pitch untouched', $('#pitch').innerHTML.includes('#2C8C48') && pitchTheme==='daily'); buildPitch('day');
  // --- titles + name colour
  giveCosmetic('title_pack1'); equipTitle('title_pack1',1);
  TASSERT('titleText reads the equipped title', titleText().includes(lang==='he' ? 'המלך' : 'King') && prog.eq.title===1 && prog.eq.titlePack==='title_pack1');
  unequipType('title'); TASSERT('unequip title', titleText()==='' && prog.eq.title===undefined);
  // --- looks tab (locker) through the DOM
  shopTab='looks'; shopBuildTab();
  TASSERT('locker lists owned kits, boots, balls, stadiums, titles', ['kit','boots','ball','stadium','title'].every(t=>$('#shop-locker .shop-sec[data-type='+t+']')));
  TASSERT('equipped kit shows as on', $('#shop-locker .shop-item[data-id=kit_il]').classList.contains('on'));
  $('#shop-locker .shop-item[data-id=kit_il] .btn[data-act=unequip]').click(); await tick();
  TASSERT('unequip via the locker', prog.eq.kit===undefined && !$('#shop-locker .shop-item[data-id=kit_il]').classList.contains('on') && skinFor(me).jersey===undefined);
  $('#shop-locker .shop-item[data-id=kit_il] .btn[data-act=equip]').click(); await tick();
  TASSERT('equip via the locker', prog.eq.kit==='kit_il' && $('#shop-lpv .sprite').innerHTML.includes('#1D6FE8'));
  $('#shop-locker .shop-item[data-id=title_pack1][data-i="2"] .btn[data-act=equip]').click(); await tick();
  TASSERT('title equipped from the locker and shown in the preview', prog.eq.title===2 && $('#shop-lpv .ttl').textContent===titleText());
  // --- gems tab: name colour
  shopTab='gems'; shopBuildTab(); prog.gems=50;
  TASSERT('gem tab lists gem items + name colours', $('#shop-body .shop-item[data-id=kit_gold]') && $('#shop-body .shop-item[data-id=ball_galaxy]') && $('#shop-body .shop-item[data-id=color_rainbow]'));
  $('#shop-body .shop-item[data-id=color_gold] .btn[data-buy]').click(); await tick(); $('#btn-ask-yes').click(); await tick(); await tick();
  TASSERT('gold name bought with 40 gems and equipped', prog.gems===10 && cosOwned('color_gold') && prog.eq.color==='gold' && nameColorClass()==='shop-nc-gold' && $('#shop-body .shop-item[data-id=color_gold]').classList.contains('on'));
  TASSERT('purchase hook carries gems', purchases.some(o=>o.id==='color_gold' && o.gems===40));
  // --- shirt number
  giveCosmetic('number_pick'); shopTab='looks'; shopBuildTab();
  $('#shop-locker .shop-item[data-id=number_pick] .btn[data-act=numUp]').click(); await tick();
  TASSERT('shirt number +1 lands in prog.eq.number and skinFor', prog.eq.number===(me.number|0)+1 && skinFor(me).number===prog.eq.number);
  // --- players tab
  shopTab='players'; shopFilter='all'; shopPick=-1; shopBuildTab();
  TASSERT('players tab shows all 80 with rarity frames', document.querySelectorAll('#shop-pgrid .shop-pcard').length===CHARS.length && document.querySelectorAll('#shop-pgrid .shop-pcard.rar-icon').length>0 && document.querySelectorAll('#shop-pgrid .shop-pcard.rar-trophy').length===2);
  $('#shop-body .shop-filters .btn[data-f=il]').click(); await tick();
  TASSERT('🇮🇱 filter', document.querySelectorAll('#shop-pgrid .shop-pcard').length===ISRAELI_IDS.length);
  $('#shop-body .shop-filters .btn[data-f=bronze]').click(); await tick();
  TASSERT('bronze filter = price ≤ 1000', Array.from(document.querySelectorAll('#shop-pgrid .shop-pcard')).every(d=>priceOf(CHARS[+d.dataset.i])<=1000 && !CHARS[+d.dataset.i].trophyOnly));
  $('#shop-body .shop-filters .btn[data-f=all]').click(); await tick();
  const freeI=CHARS.findIndex(c=>FREE_CHARS.includes(c.id) && c.id!==me.id);
  $('#shop-pgrid .shop-pcard[data-i="'+freeI+'"]').click(); await tick();
  TASSERT('tap a card → preview with select button', $('#shop-ppv .nm').textContent===nm(CHARS[freeI]) && !!$('#shop-ppv .btn[data-act=select]'));
  $('#shop-ppv .btn[data-act=select]').click(); await tick();
  TASSERT('select switches my character', selected===freeI && prog.selectedId===CHARS[freeI].id);
  const lockedI=CHARS.findIndex(c=>!isUnlocked(c) && !c.trophyOnly); prog.coins=priceOf(CHARS[lockedI]);
  $('#shop-pgrid .shop-pcard[data-i="'+lockedI+'"]').click(); await tick(); $('#shop-ppv .btn[data-act=buy]').click(); await tick(); $('#btn-ask-yes').click(); await tick(); await tick();
  TASSERT('buy a player at full price via tryBuy', isUnlocked(CHARS[lockedI]) && prog.coins===0);
  // --- powers tab
  shopTab='powers'; shopBuildTab(); prog.coins=ICE_PRICE;
  $('#shop-body .shop-pow[data-power=ice] .btn[data-buy=ice]').click(); await tick(); $('#btn-ask-yes').click(); await tick(); await tick();
  TASSERT('ice bought through the powers tab', prog.ice===true && prog.coins===0 && $('#shop-body .shop-pow[data-power=ice]').classList.contains('owned') && !$('#shop-body .shop-pow[data-power=ice] .btn'));
  TASSERT('fire still for sale', !!$('#shop-body .shop-pow[data-power=fire] .btn[data-buy=fire]'));
  // --- back home
  $('#shop-back').click(); await tick();
  TASSERT('back button returns home', $('#home').classList.contains('active'));
  TASSERT('home pills open the shop', ($('#xp-badge').click(), $('#shop').classList.contains('active') && shopTab==='players'));
  $('#gem-badge').click(); TASSERT('gem pill opens the gem tab', shopTab==='gems');
  TASSERT('no new script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
