/* ===================================================================================================
   PLAYER LEVELS — shards + coins raise an OWNED player from level 1 up to 5 (Rumble-Stars style).
   Shards come from chests: a card of a player the kid already owns becomes a 🧩 shard card
   (superrare 3 · epic 5 · mythic 8 · legendary 10, ~35% of those drops). 10 shards + coins = one level.
   Each level above 1 gives MY player +2.5% speed and +2.5% kick power in OFFLINE matches only
   (never online, never hot-seat: both sides stay fair). The core's `st(p)` consults charBoost(p.ch).
   Public: charLevel(c) charShards(c) charBoost(c) charLevelPrice(lv) charCanLevel(c) charLevelUp(c)
           charUpgradable() addShards(c,n) lvDecorateShop(body)
   prog: prog.charLv={charId:1..5} (missing = 1)   prog.shards={charId:n}
   Hooks emitted: 'charLevel'(id, lv) after a level-up · 'shards'(id, n) when shards are added
   Wraps (never edits): chestCards chestCardName chestCardType chestCardPreview chestGrant buildChests
                        shopBuildPlayers refreshHome
   Core edit (the only one, line ~1795): `st` multiplies speed and power by charBoost(p.ch) for P1 when !mp.
   =================================================================================================== */
Object.assign(ECON, { levels:{
  max:5, shards:10, boost:.025,
  price:{2:200, 3:400, 4:800, 5:1500},                       // coins to REACH that level (plus 10 shards)
  chestChance:.35,                                            // chance that a superrare+ drop holds a shard card
  chestShards:{superrare:3, epic:5, mythic:8, legendary:10},  // shards on that card, per rarity
}});

I18N_ADD({
 'lv.badge':['⭐ רמה {0}','⭐ Lv {0}','⭐ مستوى {0}','⭐ Ур. {0}'],
 'lv.bonus':['+{0}% ⚡💥','+{0}% ⚡💥','+{0}% ⚡💥','+{0}% ⚡💥'],
 'lv.max':['מקס','MAX','الأقصى','МАКС'],
 'lv.maxed':['⭐ רמה מקסימלית!','⭐ Max level!','⭐ المستوى الأقصى!','⭐ Максимальный уровень!'],
 'lv.shards':['🧩 {0}/{1}','🧩 {0}/{1}','🧩 {0}/{1}','🧩 {0}/{1}'],
 'lv.upgrade':['⬆ שדרג! 🪙 {0}','⬆ Upgrade! 🪙 {0}','⬆ طوّر! 🪙 {0}','⬆ Улучшить! 🪙 {0}'],
 'lv.ask':['לשדרג את {0} לרמה {1} תמורת 🪙 {2} ו-🧩 {3} שברים?','Upgrade {0} to level {1} for 🪙 {2} and 🧩 {3} shards?','هل تطوّر {0} إلى المستوى {1} مقابل 🪙 {2} و🧩 {3} قطع؟','Улучшить {0} до уровня {1} за 🪙 {2} и 🧩 {3} осколков?'],
 'lv.up':['⭐ {0} עלה לרמה {1}!','⭐ {0} reached level {1}!','⭐ {0} وصل إلى المستوى {1}!','⭐ {0} достиг уровня {1}!'],
 'lv.noCoins':['חסרים מטבעות 😕 יש לך {0}, צריך {1}','Not enough coins 😕 you have {0}, need {1}','لا تكفي العملات 😕 لديك {0}، تحتاج {1}','Не хватает монет 😕 у тебя {0}, нужно {1}'],
 'lv.noShards':['חסרים שברים 🧩 יש לך {0}, צריך {1} · שברים מגיעים מתיבות 🎁','Not enough shards 🧩 you have {0}, need {1} · shards come from chests 🎁','لا تكفي القطع 🧩 لديك {0}، تحتاج {1} · القطع تأتي من الصناديق 🎁','Не хватает осколков 🧩 у тебя {0}, нужно {1} · осколки приходят из сундуков 🎁'],
 'lv.shardCard':['🧩 {0} שברים · {1}','🧩 {0} shards · {1}','🧩 {0} قطع · {1}','🧩 {0} осколков · {1}'],
 'lv.shardType':['שברי שחקן','Player shards','قطع لاعب','Осколки игрока'],
 'lv.shardsGot':['🧩 +{0} שברים של {1} ({2}/{3})','🧩 +{0} {1} shards ({2}/{3})','🧩 +{0} قطع {1} ({2}/{3})','🧩 +{0} осколков {1} ({2}/{3})'],
 'lv.nextUp':['אפשר לשדרג את {0}!','You can upgrade {0}!','يمكنك تطوير {0}!','Можно улучшить {0}!'],   // the 🧩 is the entry's icon
});

/* ----- state ----- */
function lvProg(){ prog.charLv = (prog.charLv && typeof prog.charLv==='object') ? prog.charLv : {}; prog.shards = (prog.shards && typeof prog.shards==='object') ? prog.shards : {}; return prog; }
const lvId = c => (c && typeof c==='object') ? c.id : c;
const lvChar = c => (c && typeof c==='object') ? c : CHARS.find(k=>k.id===c);
function charLevel(c){ const lv=lvProg().charLv[lvId(c)]|0; return Math.max(1, Math.min(ECON.levels.max, lv||1)); }
function charShards(c){ return Math.max(0, lvProg().shards[lvId(c)]|0); }
/* the stat multiplier the core applies to MY player offline: 1 at level 1, +2.5% per level, +10% at level 5 (1 during hot-seat penalties) */
function charBoost(c){
  try{ if(typeof hs!=='undefined' && hs) return 1; }catch(e){}
  return 1 + ECON.levels.boost*(charLevel(c)-1);
}
function charLevelPrice(lv){ return ECON.levels.price[lv]|0; }
/* everything the UI needs to know about one player's level */
function charCanLevel(c){
  const lv=charLevel(c), max=lv>=ECON.levels.max, next=max ? lv : lv+1, shards=charShards(c), need=ECON.levels.shards, price=max ? 0 : charLevelPrice(next);
  const ready=!max && shards>=need, afford=(prog.coins|0)>=price;
  return {lv, next, max, shards, need, price, ready, afford, can:ready && afford};
}
function addShards(c, n){
  const id=lvId(c); n=Math.round(n); if(!id || !(n>0)) return charShards(id);
  const p=lvProg(); p.shards[id]=(p.shards[id]|0)+n; saveProg(); Hooks.emit('shards', id, n); return p.shards[id];
}
const lvOwnedBelowMax = () => CHARS.filter(c=>isUnlocked(c) && charLevel(c)<ECON.levels.max);
/* the first owned player that can be upgraded right now (shards AND coins) */
function charUpgradable(){
  const mine=CHARS[selected]; if(mine && isUnlocked(mine) && charCanLevel(mine).can) return mine;
  return CHARS.find(c=>isUnlocked(c) && charCanLevel(c).can) || null;
}
/* 10 shards + coins → one level; asks first (unless opts.silent), celebrates, re-renders */
async function charLevelUp(c, opts){
  const x=lvChar(c); if(!x || !isUnlocked(x)) return false;
  const s=charCanLevel(x); if(s.max) return false;
  if(!s.ready){ try{ sfx.lose(); }catch(e){} toast(T('lv.noShards', s.shards, s.need),'warn'); return false; }
  if(!s.afford){ try{ sfx.lose(); }catch(e){} toast(T('lv.noCoins', fmtNum(prog.coins|0), fmtNum(s.price)),'warn'); return false; }
  if(!(opts && opts.silent) && !(await ask(T('lv.ask', nm(x), s.next, fmtNum(s.price), s.need)))) return false;
  if(!spendCoins(s.price)) return false;
  const p=lvProg(); p.shards[x.id]=Math.max(0, (p.shards[x.id]|0)-s.need); p.charLv[x.id]=s.next; saveProg();
  try{ sfx.win(); }catch(e){} try{ confetti.burst(120); }catch(e){} toast(T('lv.up', nm(x), s.next),'ach');
  Hooks.emit('charLevel', x.id, s.next);
  if(typeof shopRefresh==='function') shopRefresh();
  if($('#home').classList.contains('active')) refreshHome();
  return true;
}

/* ----- chests: a card of an owned player becomes a shard card (wrapping, never editing 20-chests.js) ----- */
if(typeof chestCards==='function'){
  const _lvChestCards=chestCards;
  chestCards=function(rarity, rnd){
    const cs=_lvChestCards(rarity, rnd); rnd=rnd||Math.random;
    try{
      const n=ECON.levels.chestShards[rarity]|0; if(!n || !Array.isArray(cs) || cs.some(c=>c && c.t==='shards')) return cs;
      if(rnd()>=ECON.levels.chestChance) return cs;
      const owned=lvOwnedBelowMax(); if(!owned.length) return cs;
      /* the least exciting card makes room: xp → coins → keys → gems; never a player / look / power */
      let i=-1; for(const t of ['xp','coins','keys','gems']){ i=cs.findIndex(c=>c && c.t===t); if(i>=0) break; }
      if(i<0) return cs;
      const x=owned[Math.floor(rnd()*owned.length)];
      cs[i]={t:'shards', id:x.id, n};
    }catch(e){ console.error('levels: chestCards', e); }
    return cs;
  };
  const _lvChestCardName=chestCardName;
  chestCardName=function(c){ if(c && c.t==='shards'){ const x=lvChar(c.id); return T('lv.shardCard', c.n, x ? nm(x) : c.id); } return _lvChestCardName.apply(this, arguments); };
  const _lvChestCardType=chestCardType;
  chestCardType=function(c){ if(c && c.t==='shards') return T('lv.shardType'); return _lvChestCardType.apply(this, arguments); };
  const _lvChestCardPreview=chestCardPreview;
  chestCardPreview=function(c){
    if(c && c.t==='shards'){
      const d=document.createElement('div'); d.className='pv lv-shardpv'; const x=lvChar(c.id);
      try{ d.innerHTML=playerSVG(x,'happy',null); }catch(e){ d.textContent='🧑'; }
      const b=document.createElement('span'); b.className='lv-shardbadge'; b.textContent='🧩'; d.appendChild(b);
      return d;
    }
    return _lvChestCardPreview.apply(this, arguments);
  };
  const _lvChestGrant=chestGrant;
  chestGrant=function(c, paid){
    if(c && c.t==='shards'){
      const x=lvChar(c.id); if(!x) return false;
      const have=addShards(x.id, c.n); toast(T('lv.shardsGot', c.n, nm(x), Math.min(have, ECON.levels.shards), ECON.levels.shards),'ach');
      return true;
    }
    return _lvChestGrant.apply(this, arguments);
  };
  if(typeof buildChests==='function'){
    const _lvBuildChests=buildChests;
    buildChests=function(){ const r=_lvBuildChests.apply(this, arguments); try{ document.querySelectorAll('#chests-row .chest-card .can').forEach(e=>{ if(!e.textContent.includes('🧩')) e.textContent+=' 🧩'; }); }catch(e){} return r; };
  }
}

/* ----- the shop's players tab: level badge + shard bar on owned cards, level box + upgrade button in the preview ----- */
function lvDecorateShop(body){
  body=body||$('#shop-body'); if(!body) return;
  body.querySelectorAll('#shop-pgrid .shop-pcard').forEach(d=>{
    const c=CHARS[+d.dataset.i]; if(!c || !isUnlocked(c) || d.querySelector('.lv-row')) return;
    const s=charCanLevel(c);
    const row=document.createElement('div'); row.className='lv-row'+(s.ready?' ready':'')+(s.max?' max':'');
    const badge=document.createElement('span'); badge.className='lv-badge'; badge.textContent=T('lv.badge', s.lv); row.appendChild(badge);
    if(!s.max){ const sh=document.createElement('span'); sh.className='lv-shards'; sh.textContent=T('lv.shards', Math.min(s.shards, s.need), s.need)+(s.ready?' ⬆':''); row.appendChild(sh); }
    d.appendChild(row); d.classList.add('lv-has'); d.classList.toggle('lv-ready', s.ready);
  });
  const pv=body.querySelector('#shop-ppv'); if(!pv || pv.querySelector('.lv-box')) return;
  const i=(typeof shopPick==='number') ? shopPick : -1; const c=CHARS[i]; if(!c || !isUnlocked(c)) return;
  const s=charCanLevel(c); pv.classList.add('lv-has');
  const box=document.createElement('div'); box.className='lv-box'+(s.max?' max':'')+(s.ready?' ready':'');
  const lvl=document.createElement('span'); lvl.className='lv-lvl'; lvl.textContent=T('lv.badge', s.lv)+(s.max ? ' · '+T('lv.max') : s.lv>1 ? ' · '+T('lv.bonus', Math.round((charBoost(c)-1)*1000)/10) : ''); box.appendChild(lvl);
  if(!s.max){
    const bar=document.createElement('span'); bar.className='lv-bar';
    const fill=document.createElement('i'); fill.style.width=Math.round(Math.min(1, s.shards/s.need)*100)+'%'; bar.appendChild(fill);
    const txt=document.createElement('span'); txt.textContent=T('lv.shards', Math.min(s.shards, s.need), s.need); bar.appendChild(txt);
    box.appendChild(bar);
  }
  const anchor=pv.querySelector('.pr'); if(anchor && anchor.nextSibling) pv.insertBefore(box, anchor.nextSibling); else pv.appendChild(box);
  if(!s.max){
    const b=document.createElement('button'); b.type='button'; b.className='btn small lv-upbtn '+(s.can?'green':'off'); b.dataset.act='levelup';
    b.textContent=T('lv.upgrade', fmtNum(s.price));
    b.addEventListener('click', e=>{ e.stopPropagation(); try{ sfx.click(); }catch(x){} charLevelUp(c); });
    pv.insertBefore(b, box.nextSibling);
  }
}
if(typeof shopBuildPlayers==='function'){
  const _lvShopBuildPlayers=shopBuildPlayers;
  shopBuildPlayers=function(body){ const r=_lvShopBuildPlayers.apply(this, arguments); try{ lvDecorateShop(body); }catch(e){ console.error('levels: shop', e); } return r; };
}

/* ----- home: a tiny "⭐ Lv N" tag beside the hero name (level 2 and up) ----- */
function lvHomeTag(){
  const n=$('#home-name'); if(!n) return; const c=CHARS[selected]; const lv=c ? charLevel(c) : 1;
  let t=n.querySelector('.lv-tag'); if(lv<2){ if(t) t.remove(); return; }
  if(!t){ t=document.createElement('span'); t.className='lv-tag'; n.appendChild(t); }
  t.textContent=T('lv.badge', lv);
}
{ const _lvRefreshHome=refreshHome; refreshHome=function(){ const r=_lvRefreshHome.apply(this, arguments); try{ lvHomeTag(); }catch(e){} return r; }; }

/* ----- next up: when a player can be upgraded, say so (opens the players tab on that player) ----- */
NextUp.add(()=>{
  if(typeof openShop!=='function') return null;
  const c=charUpgradable(); if(!c) return null;
  return {prio:30, icon:'🧩', text:T('lv.nextUp', nm(c)), action:()=>{ try{ shopPick=CHARS.indexOf(c); }catch(e){} openShop('players'); }};
});
lvProg();
applyLang();
