/* ===================================================================================================
   SHOP + COSMETICS + LOCKER — the daily rotating shop (seeded by the server day, same for everyone),
   the 80 characters with rarity frames, the locker (equip what you own), the gem tab, the powers tab,
   and the cosmetics rendering hooks the core already checks for (skinFor / ballSkin) + stadium themes.
   Ownership: prog.cos={items:[ids]}   Equipped: prog.eq={skin,kit,boots,ball,stadium,celeb,title,titlePack,color,number}
   Shop state: prog.shop={bought:{dayKey[r]:slot → id, dayKey:free → 'free_<type>'}, reroll:dayKey, seen:dayKey, seenWeek:n}
   The free gift of the day (first card of the today tab) rotates by the day index: coins → key → gem → bronze chest.
   Skins (type 'skin', char:'messi'): a whole new look for ONE character, merged under the kit/boots/number in skinFor() when that
   character is selected. Selling: every owned item (except the welcome kit) sells back for half its listed price (coins or gems).
   =================================================================================================== */
Object.assign(ECON, { shop:{ launch:'2026-10-12', charOff:.3, charGemDiv:70, rerollGems:7, silverDeal:450, silverPrice:500, goldDealGems:26, goldGems:33,
  colors:{gold:55, neon:80, rainbow:105, pink:45, silver:45, emerald:55, ice:60, fire:65, galaxy:110}, numberPrice:500, gemCycle:10, sellRate:.5,
  free:{coins:40, keys:1, gems:1, chest:'bronze', chestCoins:60}, urgentMs:36e5 } });

/* items sold by the shop that are not in the catalogue (name colours, the shirt number) — same shape as COSMETICS */
const SHOP_EXTRA=[
  {id:'color_gold',    type:'color',  name:['שם זהב','Gold name','اسم ذهبي','Золотое имя'],        price:0, gems:ECON.shop.colors.gold,    rarity:'epic',      data:{color:'gold'}},
  {id:'color_neon',    type:'color',  name:['שם ניאון','Neon name','اسم نيون','Неоновое имя'],     price:0, gems:ECON.shop.colors.neon,    rarity:'epic',      data:{color:'neon'}},
  {id:'color_rainbow', type:'color',  name:['שם קשת','Rainbow name','اسم قوس قزح','Радужное имя'], price:0, gems:ECON.shop.colors.rainbow, rarity:'legendary', data:{color:'rainbow'}},
  {id:'color_pink',    type:'color',  name:['שם ורוד','Pink name','اسم وردي','Розовое имя'],       price:0, gems:ECON.shop.colors.pink,    rarity:'epic',      data:{color:'pink'}},
  {id:'color_silver',  type:'color',  name:['שם כסף','Silver name','اسم فضي','Серебряное имя'],    price:0, gems:ECON.shop.colors.silver,  rarity:'epic',      data:{color:'silver'}},
  {id:'color_emerald', type:'color',  name:['שם אזמרגד','Emerald name','اسم زمردي','Изумрудное имя'], price:0, gems:ECON.shop.colors.emerald, rarity:'epic',   data:{color:'emerald'}},
  {id:'color_ice',     type:'color',  name:['שם קרח','Ice name','اسم جليدي','Ледяное имя'],        price:0, gems:ECON.shop.colors.ice,     rarity:'epic',      data:{color:'ice'}},
  {id:'color_fire',    type:'color',  name:['שם אש','Fire name','اسم ناري','Огненное имя'],        price:0, gems:ECON.shop.colors.fire,    rarity:'epic',      data:{color:'fire'}},
  {id:'color_galaxy',  type:'color',  name:['שם גלקסיה','Galaxy name','اسم المجرة','Галактическое имя'], price:0, gems:ECON.shop.colors.galaxy, rarity:'legendary', data:{color:'galaxy'}},
  {id:'number_pick',   type:'number', name:['מספר חולצה משלי','My shirt number','رقم قميصي','Свой номер'], price:ECON.shop.numberPrice, rarity:'rare', data:{}},
];
const SHOP_TYPES=['skin','kit','boots','ball','stadium','celeb','title','color','number'];
const shopItem = id => cosById(id) || SHOP_EXTRA.find(c=>c.id===id) || null;
const shopOwned = id => cosOwned(id);
const shopItemName = it => cosName(it);
function shopProg(){ prog.shop = prog.shop || {bought:{}}; prog.shop.bought = prog.shop.bought || {}; prog.cos = prog.cos || {items:[]}; prog.cos.items = prog.cos.items || []; prog.eq = prog.eq || {}; return prog.shop; }

/* ----- the Sunday drop clock: items with `week` are sold once that many Sundays have passed since launch ----- */
function shopLaunchDate(){ const [y,m,d]=ECON.shop.launch.split('-').map(Number); return new Date(y, m-1, d); }
function shopDayIndex(){ const t=new Date(now()); const t0=new Date(t.getFullYear(), t.getMonth(), t.getDate()); return Math.round((t0-shopLaunchDate())/864e5); }
function shopWeek(){ const L=shopLaunchDate(), days=shopDayIndex(); if(days<0) return 0; return Math.floor((days+L.getDay())/7); }
const shopAvailable = it => !it.week || it.week<=shopWeek();
const shopIsNew = it => !!it.week && it.week===shopWeek();

/* ----- deterministic PRNG from the day string ----- */
function shopHash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function shopRng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function shopShuffle(arr, rng){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ----- character rarity by price ----- */
function charRarity(c){ if(c.trophyOnly) return 'trophy'; const p=priceOf(c); return p<=1000 ? 'bronze' : p<=3000 ? 'silver' : p<=7200 ? 'gold' : 'icon'; }
const charDealCoins = c => Math.round(priceOf(c)*(1-ECON.shop.charOff)/10)*10;
const charDealGems  = c => Math.ceil(priceOf(c)/ECON.shop.charGemDiv);
/* skins: the character a skin belongs to, and the hint shown when it is not the selected one */
const shopSkinChar = it => (it && it.char && CHARS.find(c=>c.id===it.char)) || CHARS[selected] || CHARS[0];
const shopSkinMine = it => !!(it && it.type==='skin' && CHARS[selected] && it.char===CHARS[selected].id);
/* selling back: half the listed price, in the currency the item is listed in */
const shopSellValue = it => it.gems ? {coins:0, gems:Math.floor(it.gems*ECON.shop.sellRate)} : {coins:Math.floor((it.price|0)*ECON.shop.sellRate), gems:0};
const shopCanSell = it => { if(!it || it.welcome || !shopOwned(it.id)) return false; const v=shopSellValue(it); return v.coins>0 || v.gems>0; };
const shopSellText = it => { const v=shopSellValue(it); return v.gems ? T('shop.gemsN', v.gems) : T('shop.coinsN', fmtNum(v.coins)); };

/* ===== today's rotation: 5 slots, same for everyone on the same day; a reroll re-seeds it for this player only ===== */
function shopDaySalt(){ const s=shopProg(); return dayKey()+(s.reroll===dayKey() ? 'r' : ''); }
function shopSlotKey(i){ return shopDaySalt()+':'+i; }
function shopRotation(){
  const s=shopProg(), salt=shopDaySalt(), rng=shopRng(shopHash('shop:'+salt)), slots=[];
  // 1) character of the day: unowned, not free, not road-only; if the pick is owned, walk to the next one
  const bought0=s.bought[salt+':0'], pool=CHARS.filter(c=>!c.trophyOnly && !FREE_CHARS.includes(c.id)), start=Math.floor(rng()*pool.length);   // rng is consumed the same way whatever is owned
  let ch=null;
  if(bought0){ ch=CHARS.find(c=>c.id===bought0)||null; }
  else { for(let k=0;k<pool.length;k++){ const c=pool[(start+k)%pool.length]; if(!isUnlocked(c)){ ch=c; break; } } }
  slots.push({slot:'char', char:ch, coins:ch?charDealCoins(ch):0, gems:ch?charDealGems(ch):0, full:ch?priceOf(ch):0});
  // 2–3) two coin cosmetics, unowned first
  const coinPool=shopShuffle(COSMETICS.filter(c=>shopAvailable(c) && c.price>0 && !c.gems), rng);
  const picks=[]; for(const c of coinPool){ if(picks.length>=2) break; if(!shopOwned(c.id)) picks.push(c); } for(const c of coinPool){ if(picks.length>=2) break; if(!picks.includes(c)) picks.push(c); }
  for(let i=0;i<2;i++){ const b=s.bought[salt+':'+(i+1)]; const it=(b && shopItem(b)) || picks[i] || null; slots.push({slot:'cos', item:it}); }
  // 4) one gem item: a 10-day cycle over a per-cycle shuffle of the gem exclusives (skins, legendary looks, name colours); an owned pick walks
  //    to the next unowned one; a day without a gem item (or when everything is owned) offers a Gold chest deal instead
  const gemPool=COSMETICS.filter(c=>shopAvailable(c) && c.gems>0).concat(SHOP_EXTRA.filter(c=>c.gems>0));
  const d=shopDayIndex(), N=ECON.shop.gemCycle, cyc=Math.floor(d/N), p=((d%N)+N)%N;
  const perm=shopShuffle(gemPool, shopRng(shopHash('gem:'+cyc+(s.reroll===dayKey()?'r':''))));
  const b3=s.bought[salt+':3'];
  let gemIt=null; if(!b3 && p<perm.length){ for(let k=0;k<perm.length;k++){ const c=perm[(p+k)%perm.length]; if(!shopOwned(c.id)){ gemIt=c; break; } } }
  if(b3 && b3!=='chest_gold' && shopItem(b3)) slots.push({slot:'gem', item:shopItem(b3)});
  else if(gemIt) slots.push({slot:'gem', item:gemIt});
  else slots.push({slot:'gem', chest:'gold', gems:ECON.shop.goldDealGems, fullGems:ECON.shop.goldGems});
  // 5) the chest deal
  slots.push({slot:'chest', chest:'silver', coins:ECON.shop.silverDeal, full:ECON.shop.silverPrice});
  slots.forEach((sl,i)=>{ sl.key=salt+':'+i; sl.sold=!!s.bought[sl.key]; });
  return slots;
}
function shopMarkSold(key, id){ const s=shopProg(); s.bought[key]=id||true; const today=dayKey(); for(const k of Object.keys(s.bought)) if(!k.startsWith(today)) delete s.bought[k]; saveProg(); }
/* ----- the countdown to the next rotation (local midnight on the server clock) ----- */
function shopTimeLeftMs(){ const d=new Date(now()); const next=new Date(d.getFullYear(), d.getMonth(), d.getDate()+1).getTime(); return Math.max(0, next-now()); }
function shopTimeLeft(){ const ms=shopTimeLeftMs(); return Math.floor(ms/36e5)+':'+pad2(Math.floor(ms%36e5/6e4)); }                                   // "H:MM"
function shopTimeLeftFull(){ const ms=shopTimeLeftMs(); return Math.floor(ms/36e5)+':'+pad2(Math.floor(ms%36e5/6e4))+':'+pad2(Math.floor(ms%6e4/1e3)); }   // "H:MM:SS"

/* ===== the free gift of the day: one per day, the same for everyone, not touched by a reroll ===== */
const SHOP_FREE_CYCLE=['coins','keys','gems','chest'];
function shopFreeKey(){ return dayKey()+':free'; }
function shopFreeGift(){
  const F=ECON.shop.free, n=SHOP_FREE_CYCLE.length, d=shopDayIndex(); let t=SHOP_FREE_CYCLE[((d%n)+n)%n];
  if(t==='chest' && typeof giveChest!=='function') return {t:'coins', n:F.chestCoins, icon:'🪙', key:shopFreeKey()};   // no chests module in this build
  if(t==='keys' && (prog.keys|0)>=ECON.keyCap) t='coins';                                                              // a full key ring would swallow the gift
  const g = t==='coins' ? {t, n:F.coins, icon:'🪙'} : t==='keys' ? {t, n:F.keys, icon:'🔑'} : t==='gems' ? {t, n:F.gems, icon:'💎'} : {t, kind:F.chest, icon:'🎁'};
  g.key=shopFreeKey(); return g;
}
function shopFreeClaimed(){ const b=prog.shop && prog.shop.bought; return !!(b && b[shopFreeKey()]); }
function shopFreeName(g){ return g.t==='chest' ? (typeof chestName==='function' ? chestName(g.kind) : T('shop.gift.chest')) : T('shop.gift.'+g.t, g.n); }
function shopClaimFree(){
  if(shopFreeClaimed()){ toast(T('shop.freeAlready'),'warn'); return false; }
  const g=shopFreeGift();
  shopMarkSold(g.key, 'free_'+g.t);                        // marked before the grant: whatever a reward toast does, the gift can never be handed out twice
  if(g.t==='coins') addCoins(g.n,'shopFree'); else if(g.t==='keys') addKeys(g.n,'shopFree'); else if(g.t==='gems') addGems(g.n,'shopFree'); else giveChest(g.kind);
  sfx.win(); try{ confetti.burst(80); }catch(e){}
  Hooks.emit('shopFree', g); shopRefresh(); if($('#home').classList.contains('active')) refreshHome(); return true;
}
function shopHasNew(){ if(!shopFreeClaimed()) return true; const s=prog.shop||{}; if(s.seen!==dayKey()) return true; const drop=COSMETICS.some(c=>shopIsNew(c) && !shopOwned(c.id)); return drop && s.seenWeek!==shopWeek(); }

/* ===== ownership and equipping (public API) ===== */
function giveCosmetic(id){
  const it=shopItem(id); if(!it) return false; shopProg(); if(shopOwned(id)) return false;
  prog.cos.items.push(id); saveProg(); toast(T('shop.got', shopItemName(it)),'ach'); Hooks.emit('cosmetic', id); return true;
}
function ownedCosmetics(type){ shopProg(); return COSMETICS.concat(SHOP_EXTRA).filter(c=>shopOwned(c.id) && (!type || c.type===type)); }
function unownedCosmetics(rarity){ return COSMETICS.filter(c=>shopAvailable(c) && !shopOwned(c.id) && (!rarity || c.rarity===rarity)); }
function equipCosmetic(id){
  const it=shopItem(id); if(!it || !shopOwned(id)) return false; shopProg();
  if(it.type==='title') return equipTitle(id, 0);
  if(it.type==='color') prog.eq.color=it.data.color;
  else if(it.type==='number') return true;                      // the number itself is set with setShirtNumber()
  else if(it.type==='skin'){ prog.eq.skin=id; if(shopSkinMine(it)){ delete prog.eq.kit; delete prog.eq.boots; } }   // a skin is a whole look: the kit/boots come off so it shows (they stay owned, equip them again on top)
  else prog.eq[it.type]=id;
  saveProg(); shopApplyEquip(it.type); Hooks.emit('equip', {type:it.type, id}); return true;
}
function unequipType(type){
  shopProg(); if(type==='title'){ delete prog.eq.title; delete prog.eq.titlePack; } else delete prog.eq[type];
  saveProg(); shopApplyEquip(type); Hooks.emit('equip', {type, id:null}); return true;
}
/* is this item the one currently worn (titles: the pack, colours: the colour, the number: any custom number)? */
function shopIsEquipped(it){
  const eq=prog.eq||{}; if(!it) return false;
  if(it.type==='title') return eq.titlePack===it.id;
  if(it.type==='color') return eq.color===it.data.color;
  if(it.type==='number') return eq.number>0;
  return eq[it.type]===it.id;
}
/* ----- selling back: half the listed price; the item leaves the locker and comes off if it was worn ----- */
async function shopSellItem(id){
  const it=shopItem(id); if(!shopCanSell(it)) return false;
  const v=shopSellValue(it);
  if(!(await ask(T('shop.sellAsk', shopItemName(it), shopSellText(it))))) return false;
  shopProg();
  if(shopIsEquipped(it)){ if(it.type==='number') delete prog.eq.number; else if(it.type==='title'){ delete prog.eq.title; delete prog.eq.titlePack; } else delete prog.eq[it.type]; }
  prog.cos.items=prog.cos.items.filter(x=>x!==id); saveProg();
  if(v.gems) addGems(v.gems,'sell'); else addCoins(v.coins,'sell');
  sfx.click(); Hooks.emit('sell', it);
  shopApplyEquip(it.type); return true;                       // redraws the ball / home / the open shop tab
}
function equipTitle(packId, i){ const it=shopItem(packId); if(!it || it.type!=='title' || !shopOwned(packId)) return false; const n=(it.data.titles||[]).length; if(!(i>=0 && i<n)) return false; shopProg(); prog.eq.titlePack=packId; prog.eq.title=i; saveProg(); Hooks.emit('equip',{type:'title', id:packId, i}); return true; }
function setShirtNumber(n){ shopProg(); if(!shopOwned('number_pick')) return false; if(n>0 && n<=99) prog.eq.number=n|0; else delete prog.eq.number; saveProg(); shopApplyEquip('kit'); return true; }
function titleText(){ const eq=prog.eq||{}; const it=eq.titlePack && shopItem(eq.titlePack); if(!it || !shopOwned(it.id)) return ''; const t=(it.data.titles||[])[eq.title|0]; return t ? (t[LI[lang]]||t[0]) : ''; }
function nameColorClass(){ const c=prog.eq && prog.eq.color; return c && shopOwned('color_'+c) ? 'shop-nc-'+c : ''; }
function shopApplyEquip(type){
  if(type==='ball'){ const b=$('#ball'); if(b && state==='idle') b.innerHTML=ballSVG(); }
  if(type==='stadium') pitchTheme='';                                  // the next match rebuilds the pitch
  if($('#home').classList.contains('active')) refreshHome();
  if($('#shop').classList.contains('active')) shopRefresh();
}

/* ===== rendering hooks the core checks for ===== */
function skinFor(c){
  if(!c || !prog.eq) return null;
  if(training || (typeof spectating!=='undefined' && spectating)) return null;
  const me=CHARS[selected]; if(!me || c.id!==me.id) return null;
  const eq=prog.eq, s={}; let any=false;
  const sk=eq.skin && shopItem(eq.skin); if(sk && sk.type==='skin' && sk.char===c.id && shopOwned(sk.id)){ Object.assign(s, sk.data); any=true; }   // the skin goes under; kit / boots / number on top
  const kit=eq.kit && shopItem(eq.kit); if(kit && kit.type==='kit' && shopOwned(kit.id)){ Object.assign(s, kit.data); any=true; }
  const bo=eq.boots && shopItem(eq.boots); if(bo && bo.type==='boots' && shopOwned(bo.id)){ s.boots=bo.data.boots; any=true; }
  if(eq.number>0 && shopOwned('number_pick')){ s.number=eq.number; any=true; }
  return any ? s : null;
}
let shopSvgSeq=0;
function shopBallSVG(d){
  const id='sb'+(shopSvgSeq++), a=d.a||'#fff', b=d.b||'#222', O='stroke="#222" stroke-width="1.5"';
  const open=`<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}"><circle cx="15" cy="15" r="14"/></clipPath></defs>`;
  const pent=f=>`<polygon points="15,9 20,12.5 18,18.5 12,18.5 10,12.5" fill="${f}"/><polygon points="15,1.5 18,5 15,7.5 12,5" fill="${f}"/><polygon points="26,9 27.5,14 24,14.5 22,11" fill="${f}"/><polygon points="4,9 8,11 6,14.5 2.5,14" fill="${f}"/><polygon points="9,26 12,22 15,24.5 13,28" fill="${f}"/><polygon points="21,26 18,22 15,24.5 17,28" fill="${f}"/>`;
  if(d.pattern==='flag') return open+`<circle cx="15" cy="15" r="14" fill="#fff" ${O}/><g clip-path="url(#${id})"><rect x="0" y="4" width="30" height="4" fill="${a}"/><rect x="0" y="22" width="30" height="4" fill="${a}"/></g>
    <polygon points="15,9 20,18 10,18" fill="none" stroke="${a}" stroke-width="1.6"/><polygon points="15,21 10,12 20,12" fill="none" stroke="${a}" stroke-width="1.6"/><circle cx="15" cy="15" r="14" fill="none" ${O}/></svg>`;
  if(d.pattern==='flame') return open+`<circle cx="15" cy="15" r="14" fill="${b}" ${O}/><g clip-path="url(#${id})">
    <path d="M6 30 Q4 18 10 14 Q9 20 13 20 Q11 12 17 6 Q16 14 21 15 Q22 10 26 10 Q24 16 27 20 Q29 25 24 30Z" fill="${a}"/>
    <path d="M10 30 Q9 23 14 20 Q13 25 17 25 Q16 19 21 17 Q20 23 24 26 Q22 30 18 30Z" fill="#FFF3B8" opacity=".85"/></g><circle cx="15" cy="15" r="14" fill="none" ${O}/></svg>`;
  if(d.pattern==='galaxy') return open+`<circle cx="15" cy="15" r="14" fill="${a}" ${O}/><g clip-path="url(#${id})">
    <path d="M3 18 Q8 4 17 8 Q25 11 22 18 Q18 25 11 21 Q7 18 11 14 Q15 11 18 15" fill="none" stroke="${b}" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <circle cx="7" cy="8" r="1.1" fill="#fff"/><circle cx="23" cy="6" r="1.4" fill="#fff"/><circle cx="25" cy="22" r="1" fill="#fff"/><circle cx="9" cy="25" r="1.3" fill="#fff"/><circle cx="19" cy="24" r=".8" fill="#fff"/><circle cx="15" cy="15" r="1.6" fill="#FFD447"/></g><circle cx="15" cy="15" r="14" fill="none" ${O}/></svg>`;
  return open+`<circle cx="15" cy="15" r="14" fill="${a}" ${O}/>${pent(b)}</svg>`;    // classic: coloured leather with dark panels
}
function ballSkin(){ const id=prog.eq && prog.eq.ball; const it=id && shopItem(id); if(!it || it.type!=='ball' || !shopOwned(id)) return null; return shopBallSVG(it.data); }
function shopStadiumSVG(d){
  const sky = d.night ? '#1B2A4E' : '#7ED3FF', boards=d.boards||[];
  let s=`<svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="70" fill="${sky}"/>`;
  if(d.night) for(let i=0;i<6;i++) s+=`<circle cx="${10+i*20}" cy="${5+(i%2)*4}" r="2" fill="#FFF3B8"/>`;
  s+=`<rect y="14" width="120" height="12" fill="${d.far}"/><rect y="20" width="120" height="6" fill="${d.track}"/>`;
  for(let i=0;i<6;i++) s+=`<rect x="${i*20+1}" y="12" width="18" height="6" rx="1" fill="${boards[i%boards.length]||'#fff'}"/>`;
  for(let i=0;i<6;i++) s+=`<rect x="${i*20}" y="26" width="20" height="44" fill="${i%2?d.stripeA:d.stripeB}"/>`;
  s+=`<rect x="4" y="30" width="112" height="36" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/><circle cx="60" cy="48" r="8" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/><line x1="60" y1="30" x2="60" y2="66" stroke="#fff" stroke-width="1.5" opacity=".9"/></svg>`;
  return s;
}
function shopBootSVG(col){ return `<svg viewBox="0 0 44 30" xmlns="http://www.w3.org/2000/svg"><path d="M4 23 L4 9 Q4 5 8 5 L17 5 L23 13 L36 17 Q41 18.5 41 23 L41 26 L4 26 Z" fill="${col}" stroke="#222" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 26 h37" stroke="#555" stroke-width="2.4"/><path d="M12 9 l5 6 M15 8 l5 6" stroke="#222" stroke-width="1.2"/><circle cx="33" cy="25" r="1.5" fill="#222"/><circle cx="25" cy="25" r="1.5" fill="#222"/><circle cx="17" cy="25" r="1.5" fill="#222"/></svg>`; }
/* stadium cosmetics become pitch themes; an offline 1v1 'day' pitch uses the equipped one */
for(const c of COSMETICS) if(c.type==='stadium' && !PITCH_THEMES[c.id]) PITCH_THEMES[c.id]=Object.assign({}, c.data);
const _shopBuildPitch=buildPitch;
buildPitch=function(themeName){
  let t=themeName||'day';
  if(t==='day' && !mp && !v2 && !(typeof spectating!=='undefined' && spectating)){ const id=prog.eq && prog.eq.stadium; if(id && PITCH_THEMES[id] && shopOwned(id)) t=id; }
  _shopBuildPitch(t); pitchTheme=themeName||'day';                   // the core compares against the name it asked for
};
Hooks.on('screen', id=>{ if(id==='game'){ const b=$('#ball'); if(b) b.innerHTML=ballSVG(); } if(id!=='shop') shopStopTimer(); });

/* ===== visuals for an item card ===== */
function shopVisual(it){
  const me=CHARS[selected];
  switch(it.type){
    case 'kit':     return `<div class="sprite">${playerSVG(me,'happy',Object.assign({}, it.data))}</div>`;
    case 'skin':    return `<div class="sprite">${playerSVG(shopSkinChar(it),'happy',Object.assign({}, it.data))}</div>`;   // the character it belongs to, wearing it
    case 'boots':   return shopBootSVG(it.data.boots);
    case 'ball':    return shopBallSVG(it.data);
    case 'stadium': return shopStadiumSVG(it.data);
    case 'celeb':   return '<span class="emo">🎉</span>';
    case 'title':   return '<span class="emo">🏷️</span>';
    case 'color':   return `<span class="nc"><b class="shop-nc-${it.data.color}">${esc((settings.name||'').trim()||nm(me))}</b></span>`;
    case 'number':  return '<span class="emo">🔢</span>';
  }
  return '<span class="emo">🎁</span>';
}
const shopPriceText = it => it.gems ? T('shop.gemsN', it.gems) : T('shop.coinsN', fmtNum(it.price));

/* ===== buying ===== */
async function shopBuyItem(it, slotKey){
  if(!it) return false;
  if(shopOwned(it.id)){ toast(T('shop.owned2'),'warn'); return false; }
  const gems=it.gems|0, price=it.price|0;
  if(gems){ if((prog.gems|0)<gems){ sfx.lose(); toast(T('shop.noGems', prog.gems|0, gems),'warn'); return false; } }
  else if((prog.coins|0)<price){ sfx.lose(); toast(T('shop.noCoins', fmtNum(prog.coins|0), fmtNum(price)),'warn'); return false; }
  if(!(await ask(T('shop.confirm2', shopItemName(it), shopPriceText(it))))) return false;
  if(gems) spendGems(gems); else spendCoins(price);
  giveCosmetic(it.id); equipCosmetic(it.id); sfx.win(); try{ confetti.burst(80); }catch(e){}
  if(slotKey) shopMarkSold(slotKey, it.id);
  Hooks.emit('purchase', {type:it.type, id:it.id, price:gems?0:price, gems});
  shopRefresh(); return true;
}
async function shopBuyChar(c, useGems, slotKey){
  if(!c || isUnlocked(c)) return false;
  const coins=charDealCoins(c), gems=charDealGems(c);
  if(useGems){ if((prog.gems|0)<gems){ sfx.lose(); toast(T('shop.noGems', prog.gems|0, gems),'warn'); return false; } }
  else if((prog.coins|0)<coins){ sfx.lose(); toast(T('shop.noCoins', fmtNum(prog.coins|0), fmtNum(coins)),'warn'); return false; }
  if(!(await ask(T('shop.confirm2', nm(c), useGems ? T('shop.gemsN', gems) : T('shop.coinsN', fmtNum(coins)))))) return false;
  if(useGems) spendGems(gems); else spendCoins(coins);
  prog.unlocked.push(c.id); saveProg(); sfx.win(); try{ confetti.burst(120); }catch(e){} toast(T('shop.bought', nm(c)),'ach'); updateXpBadge();
  if(slotKey) shopMarkSold(slotKey, c.id);
  Hooks.emit('purchase', {type:'char', id:c.id, price:useGems?0:coins, gems:useGems?gems:0});
  buildGallery(); refreshPreview(); shopRefresh(); return true;
}
async function shopBuyChest(kind, coins, gems, slotKey){
  const name=T(kind==='gold' ? 'shop.chestGold' : 'shop.chestSilver');
  if(gems){ if((prog.gems|0)<gems){ sfx.lose(); toast(T('shop.noGems', prog.gems|0, gems),'warn'); return false; } }
  else if((prog.coins|0)<coins){ sfx.lose(); toast(T('shop.noCoins', fmtNum(prog.coins|0), fmtNum(coins)),'warn'); return false; }
  if(!(await ask(T('shop.confirm2', name, gems ? T('shop.gemsN', gems) : T('shop.coinsN', fmtNum(coins)))))) return false;
  if(gems) spendGems(gems); else spendCoins(coins);
  if(typeof giveChest==='function') giveChest(kind); else { prog.chests=prog.chests||{}; prog.chests[kind]=(prog.chests[kind]|0)+1; saveProg(); toast(T('shop.chestGot'),'ach'); }
  sfx.win(); if(slotKey) shopMarkSold(slotKey, 'chest_'+kind);
  Hooks.emit('purchase', {type:'chest', id:kind, price:gems?0:coins, gems:gems|0});
  shopRefresh(); return true;
}
async function shopReroll(){
  const s=shopProg(); if(s.reroll===dayKey()){ toast(T('shop.rerolled'),'warn'); return false; }
  const g=ECON.shop.rerollGems; if((prog.gems|0)<g){ sfx.lose(); toast(T('shop.noGems', prog.gems|0, g),'warn'); return false; }
  if(!(await ask(T('shop.rerollAsk', g)))) return false;
  spendGems(g); s.reroll=dayKey(); saveProg(); sfx.win(); Hooks.emit('purchase', {type:'reroll', id:'shop', price:0, gems:g}); shopRefresh(); return true;
}

/* ===== the screen ===== */
let shopTab='today', shopTimer=0, shopFilter='all', shopPick=-1, shopBuiltDay='';
function openShop(tab){
  const s=shopProg(); s.seen=dayKey(); s.seenWeek=shopWeek(); saveProg();
  shopTab = ['today','players','looks','gems','powers'].includes(tab) ? tab : 'today';
  showScreen('shop'); shopWallet(); shopBuildTab();                 // the screen first: fitText needs real widths
  clearInterval(shopTimer); shopTimer=setInterval(shopTick, 1000);  // 1 s: the countdown shows seconds; stopped as soon as the shop closes
}
function shopStopTimer(){ clearInterval(shopTimer); shopTimer=0; }
function shopTick(){ if(!$('#shop').classList.contains('active')) return shopStopTimer(); if(shopTab==='today' && shopBuiltDay!==dayKey()) return shopBuildTab(); shopTimerDraw(); }
function shopTimerDraw(){ const t=$('#shop-timer'); if(!t) return; t.textContent=T('shop.renewFull', shopTimeLeftFull()); t.classList.toggle('urgent', shopTimeLeftMs()<ECON.shop.urgentMs); }
function shopWallet(){ const c=$('#shop-coins'), g=$('#shop-gems'); if(c) c.textContent='🪙 '+fmtNum(prog.coins|0); if(g) g.textContent='💎 '+fmtNum(prog.gems|0); }
function shopRefresh(){ shopWallet(); if($('#shop').classList.contains('active')) shopBuildTab(); }
function shopBuildTab(){
  document.querySelectorAll('#shop-tabs .shop-tab').forEach(b=>b.classList.toggle('on', b.dataset.tab===shopTab));
  const body=$('#shop-body'); const keepScroll=body.scrollTop; const innerScroll=[...body.querySelectorAll('.shop-grid,.shop-locker,.shop-skins,.shop-gems .shop-row')].map(e=>[e.classList.contains('shop-grid')?'.shop-grid':e.classList.contains('shop-locker')?'.shop-locker':e.classList.contains('shop-skins')?'.shop-skins':'.shop-gems .shop-row', e.scrollTop]); body.innerHTML='';
  ({today:shopBuildToday, players:shopBuildPlayers, looks:shopBuildLooks, gems:shopBuildGems, powers:shopBuildPowers})[shopTab](body);
  body.scrollTop=keepScroll; innerScroll.forEach(([sel,top])=>{ const e=body.querySelector(sel); if(e) e.scrollTop=top; });   // re-rendering (equip / choose a player) keeps the scroll position of the list
}
const shopBtn=(cls, txt, fn, extra)=>{ const b=document.createElement('button'); b.className='btn small '+cls; b.innerHTML=txt; if(extra) Object.assign(b.dataset, extra); b.addEventListener('click', e=>{ e.stopPropagation(); sfx.click(); fn(); }); return b; };

/* --- today --- */
function shopBuildToday(body){
  shopBuiltDay=dayKey();
  const wrap=document.createElement('div'); wrap.className='shop-today';
  // the countdown pill (ticks every second while the shop is open) + the reroll button
  const top=document.createElement('div'); top.className='shop-today-top';
  const tm=document.createElement('span'); tm.id='shop-timer'; top.appendChild(tm);
  const done=shopProg().reroll===dayKey();
  const rb=shopBtn('purple'+(done?' done':''), done ? T('shop.rerolled') : T('shop.reroll', ECON.shop.rerollGems), shopReroll); rb.id='shop-reroll'; top.appendChild(rb);
  wrap.appendChild(top);
  const row=document.createElement('div'); row.className='shop-slots';
  const tonly=`<div class="shop-tonly">${T('shop.todayOnly')}</div>`;
  // 1) the free gift of the day — the first card, once a day
  { const g=shopFreeGift(), taken=shopFreeClaimed();
    const d=document.createElement('div'); d.className='shop-slot free'+(taken?' sold':''); d.dataset.slot='free'; d.dataset.gift=g.t;
    d.innerHTML=`<div class="tag">${T('shop.slot.free')}</div>${tonly}<div class="vis"><span class="emo big">${g.icon}</span></div><div class="nm">${esc(shopFreeName(g))}</div><div class="pr">${taken ? T('shop.freeTomorrow') : `<span class="shop-free-badge">${T('shop.free')}</span>`}</div>`;
    const bb=document.createElement('div'); bb.className='btns'; if(!taken) bb.appendChild(shopBtn('green', T('shop.take'), shopClaimFree, {buy:'free'})); d.appendChild(bb);
    if(taken) d.insertAdjacentHTML('beforeend', `<div class="shop-sold"><span>${T('shop.freeTaken')}</span></div>`);
    row.appendChild(d); }
  // 2) the five deals of the rotation
  const slots=shopRotation();
  slots.forEach((sl,i)=>{
    const d=document.createElement('div'); d.className='shop-slot'; d.dataset.slot=sl.slot; d.dataset.i=i;
    let vis='', name='', price='', rar='', badges='', btns=[], off=0;
    if(sl.slot==='char'){
      const c=sl.char;
      if(!c){ vis='<span class="emo">🏆</span>'; name=T('shop.allOwned'); }
      else {
        rar='rar-'+charRarity(c); vis=`<div class="sprite">${playerSVG(c,'happy',null)}</div>`; name=esc(nm(c));
        off=Math.round(ECON.shop.charOff*100);
        price=`<s>🪙 ${fmtNum(sl.full)}</s>`;
        if(!sl.sold && !isUnlocked(c)){ btns.push(shopBtn('yellow', '🪙 '+fmtNum(sl.coins), ()=>shopBuyChar(c,false,sl.key), {buy:'coins'})); btns.push(shopBtn('blue', '💎 '+sl.gems, ()=>shopBuyChar(c,true,sl.key), {buy:'gems'})); }
      }
    } else if(sl.slot==='cos' || (sl.slot==='gem' && sl.item)){
      const it=sl.item;
      if(!it){ vis='<span class="emo">🎁</span>'; name=T('shop.allOwned'); }
      else {
        rar='rar-'+it.rarity; vis=shopVisual(it); name=esc(shopItemName(it)); price=shopPriceText(it);
        if(shopIsNew(it)) badges=`<span class="shop-badge-new">${T('shop.new')}</span>`;
        if(shopOwned(it.id)) price=T('shop.owned2');
        else if(!sl.sold) btns.push(shopBtn(it.gems?'blue':'yellow', T('shop.buy')+' '+shopPriceText(it), ()=>shopBuyItem(it, sl.key), {buy:it.id}));
      }
    } else { // chest deals
      const gold=sl.chest==='gold'; rar=gold?'rar-legendary':'rar-rare';
      vis=`<span class="emo">${gold?'🏆':'🎁'}</span>`; name=T(gold?'shop.chestGold':'shop.chestSilver');
      price=`<s>${gold ? '💎 '+sl.fullGems : '🪙 '+fmtNum(sl.full)}</s>`;
      off = gold ? (sl.fullGems ? Math.round((1-sl.gems/sl.fullGems)*100) : 0) : (sl.full ? Math.round((1-sl.coins/sl.full)*100) : 0);
      if(!sl.sold) btns.push(shopBtn(gold?'blue':'yellow', (gold ? '💎 '+sl.gems : '🪙 '+fmtNum(sl.coins)), ()=>shopBuyChest(sl.chest, sl.coins|0, sl.gems|0, sl.key), {buy:'chest_'+sl.chest}));
    }
    if(off>0){ d.classList.add('deal'); badges+=`<span class="shop-badge-off">−${off}%</span>`; }   // deal of the day: glowing frame + ribbon
    if(rar) d.classList.add(rar); if(sl.sold) d.classList.add('sold');
    d.innerHTML=`${badges}<div class="tag">${T('shop.slot.'+sl.slot)}</div>${tonly}<div class="vis">${vis}</div><div class="nm">${name}</div><div class="pr">${price}</div>`;
    const bb=document.createElement('div'); bb.className='btns'; btns.forEach(b=>bb.appendChild(b)); d.appendChild(bb);
    if(sl.sold) d.insertAdjacentHTML('beforeend', `<div class="shop-sold"><span>${T('shop.sold')}</span></div>`);
    row.appendChild(d);
  });
  wrap.appendChild(row); body.appendChild(wrap);
  shopTimerDraw();
  wrap.querySelectorAll('#shop-timer,.shop-slot .tag,.shop-slot .pr,.shop-slot .btn').forEach(el=>fitText(el));   // long prices stay inside the narrow cards
}

/* --- players --- */
const SHOP_FILTERS=['all','il','free','legend','bronze','silver','gold','icon'];
function shopBuildPlayers(body){
  const wrap=document.createElement('div'); wrap.className='shop-players';
  const f=document.createElement('div'); f.className='shop-filters';
  for(const k of SHOP_FILTERS){ const b=shopBtn('blue'+(shopFilter===k?' on':''), T('shop.filter.'+k), ()=>{ shopFilter=k; shopBuildTab(); }, {f:k}); f.appendChild(b); }
  wrap.appendChild(f);
  const g=document.createElement('div'); g.className='shop-grid'; g.id='shop-pgrid';
  if(shopPick<0) shopPick=selected;
  CHARS.forEach((c,i)=>{
    const r=charRarity(c);
    if(shopFilter==='il' && !ISRAELI_IDS.includes(c.id)) return;
    if(shopFilter==='free' && !FREE_CHARS.includes(c.id)) return;
    if(shopFilter==='legend' && !LEGEND_IDS.includes(c.id)) return;
    if(['bronze','silver','gold','icon'].includes(shopFilter) && r!==shopFilter) return;
    const locked=!isUnlocked(c);
    const d=document.createElement('div'); d.className='shop-pcard rar-'+r+(locked?' locked':'')+(i===shopPick?' sel':''); d.dataset.i=i; d.tabIndex=0;
    d.innerHTML=`${ISRAELI_IDS.includes(c.id)?'<span class="il">🇮🇱</span>':''}${i===selected?`<span class="me">${T('shop.selected')}</span>`:''}<div class="sprite">${playerSVG(c,'happy',null)}</div><div class="nm">${esc(nm(c))}</div><div class="pr">${locked ? (c.trophyOnly ? T('road.lock', roadFor(c.id)) : '🪙 '+fmtNum(priceOf(c))) : T('shop.owned2')}</div>`;
    const pick=()=>{ sfx.click(); shopPick=i; shopBuildTab(); };
    d.addEventListener('click', pick); d.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(); } });
    g.appendChild(d);
  });
  wrap.appendChild(g);
  const pv=document.createElement('div'); pv.className='shop-preview'; pv.id='shop-ppv';
  const c=CHARS[shopPick], locked=!isUnlocked(c), r=charRarity(c);
  pv.innerHTML=`<div class="sprite${locked?' locked':''}">${playerSVG(c,'happy', shopPick===selected ? undefined : null)}</div><div class="nm">${esc(nm(c))}</div><span class="shop-rtag ${r}">${T('shop.rar.'+r)}</span><div class="pr">${locked ? (c.trophyOnly ? T('road.lock', roadFor(c.id)) : '🪙 '+fmtNum(priceOf(c))) : (shopPick===selected ? T('shop.selected') : T('shop.owned2'))}</div>`;
  if(locked && !c.trophyOnly) pv.appendChild(shopBtn('purple', T('shop.unlockCoins', fmtNum(priceOf(c))), ()=>tryBuy(c).then(ok=>{ if(ok) shopRefresh(); }), {act:'buy'}));
  else if(!locked && shopPick!==selected) pv.appendChild(shopBtn('yellow', T('btn.choose'), ()=>{ selected=shopPick; Hooks.emit('select', selected); refreshHome(); shopBuildTab(); }, {act:'select'}));
  wrap.appendChild(pv); body.appendChild(wrap);
}

/* --- one item card (locker, skins list, gem tab): picture, name, [skin: whose + hint], [rarity + price], buttons --- */
function shopItemCard(it, o){
  o=o||{}; const owned=shopOwned(it.id), on=owned && shopIsEquipped(it);
  const d=document.createElement('div'); d.className='shop-item rar-'+it.rarity+(owned?' owned':'')+(on?' on':'')+(it.type==='skin'?' skin':''); d.dataset.id=it.id;
  let h=`<div class="vis">${shopVisual(it)}</div><div class="nm">${esc(shopItemName(it))}</div>`;
  if(it.type==='skin'){ const mine=shopSkinMine(it); h+=`<span class="ch${mine?' mine':''}">🎭 ${esc(nm(shopSkinChar(it)))}</span>`; if(!mine) h+=`<div class="skhint">${T('shop.skinOf', nm(shopSkinChar(it)))}</div>`; }
  if(o.price) h+=`<span class="shop-rtag ${it.rarity}">${T('shop.rar.'+it.rarity)}</span><div class="pr">${owned ? T('shop.owned2') : shopPriceText(it)}</div>`;
  d.innerHTML=h;
  if(!owned) d.appendChild(shopBtn(it.gems?'blue':'yellow', T('shop.buy')+' '+shopPriceText(it), ()=>shopBuyItem(it), {buy:it.id}));
  else d.appendChild(on ? shopBtn('red', T('shop.unequip'), ()=>unequipType(it.type), {act:'unequip'}) : shopBtn('green', T('shop.equip'), ()=>equipCosmetic(it.id), {act:'equip'}));
  if(o.sell && shopCanSell(it)) d.appendChild(shopBtn('red sell', T('shop.sell', shopSellText(it)), ()=>shopSellItem(it.id), {act:'sell'}));
  return d;
}
const shopFitCards = root => root.querySelectorAll('.shop-item .btn,.shop-item .ch,.shop-item .pr').forEach(el=>fitText(el, 10));   // long prices / names stay inside the narrow cards

/* --- looks: the locker (what you own, equip / sell) or the skins catalogue --- */
let shopLooksView='locker';
function shopBuildLooks(body){
  shopProg();
  const wrap=document.createElement('div'); wrap.className='shop-looks';
  const f=document.createElement('div'); f.className='shop-lfilters';
  for(const k of ['locker','skins']) f.appendChild(shopBtn('blue'+(shopLooksView===k?' on':''), T('shop.looks.'+k), ()=>{ shopLooksView=k; shopBuildTab(); }, {lv:k}));
  wrap.appendChild(f);
  wrap.appendChild(shopLooksView==='skins' ? shopBuildSkins() : shopBuildLocker());
  const pv=document.createElement('div'); pv.className='shop-preview'; pv.id='shop-lpv';
  const me=CHARS[selected], ttl=titleText(), nc=nameColorClass(), sk=prog.eq.skin && shopItem(prog.eq.skin);
  pv.innerHTML=`<div class="shop-hint">${T('shop.myLook')}</div><div class="sprite">${playerSVG(me)}</div><div class="nm">${nc ? `<b class="${nc}">${esc(nm(me))}</b>` : esc(nm(me))}</div>${ttl?`<div class="ttl">${esc(ttl)}</div>`:''}${sk && shopOwned(sk.id) ? `<div class="skin${shopSkinMine(sk)?'':' off'}">${esc(shopItemName(sk))}</div>` : ''}<div class="ball">${ballSVG()}</div>`;
  wrap.appendChild(pv); body.appendChild(wrap);
  shopFitCards(wrap);
}
function shopBuildLocker(){
  const L=document.createElement('div'); L.className='shop-locker'; L.id='shop-locker';
  const hint=document.createElement('div'); hint.className='shop-hint'; hint.textContent=T('shop.lockerHint'); L.appendChild(hint);
  let any=false;
  for(const type of SHOP_TYPES){
    const items=ownedCosmetics(type); if(!items.length) continue; any=true;
    const sec=document.createElement('div'); sec.className='shop-sec'; sec.dataset.type=type;
    sec.innerHTML=`<h3>${T('shop.type.'+type)}</h3>`;
    const row=document.createElement('div'); row.className='shop-row';
    for(const it of items){
      if(type==='title'){ (it.data.titles||[]).forEach((t,i)=>{ const on=prog.eq.titlePack===it.id && (prog.eq.title|0)===i; const d=document.createElement('div'); d.className='shop-item owned rar-'+it.rarity+(on?' on':''); d.dataset.id=it.id; d.dataset.i=i;
          d.innerHTML=`<div class="vis"><span class="emo">🏷️</span></div><div class="nm">${esc(t[LI[lang]]||t[0])}</div>`;
          d.appendChild(on ? shopBtn('red', T('shop.unequip'), ()=>unequipType('title'), {act:'unequip'}) : shopBtn('green', T('shop.equip'), ()=>{ equipTitle(it.id, i); shopRefresh(); }, {act:'equip'}));
          if(shopCanSell(it)) d.appendChild(shopBtn('red sell', T('shop.sell', shopSellText(it)), ()=>shopSellItem(it.id), {act:'sell'}));   // sells the whole pack
          row.appendChild(d); }); continue; }
      if(type==='number'){
        const d=document.createElement('div'); d.className='shop-item owned rar-'+it.rarity; d.dataset.id=it.id;
        d.innerHTML=`<div class="vis">${shopVisual(it)}</div><div class="nm">${esc(shopItemName(it))}</div>`;
        const n=prog.eq.number|0, cur=n||(CHARS[selected].number|0)||10; const box=document.createElement('div'); box.className='shop-num';
        box.appendChild(shopBtn('blue','−',()=>setShirtNumber(Math.max(1,cur-1)), {act:'numDown'}));
        const b=document.createElement('b'); b.textContent=cur; box.appendChild(b);
        box.appendChild(shopBtn('blue','+',()=>setShirtNumber(Math.min(99,cur+1)), {act:'numUp'}));
        d.appendChild(box); d.classList.toggle('on', n>0);
        if(n>0) d.appendChild(shopBtn('red', T('shop.numberDefault'), ()=>setShirtNumber(0), {act:'unequip'}));
        if(shopCanSell(it)) d.appendChild(shopBtn('red sell', T('shop.sell', shopSellText(it)), ()=>shopSellItem(it.id), {act:'sell'}));
        row.appendChild(d); continue;
      }
      row.appendChild(shopItemCard(it, {sell:true}));
    }
    sec.appendChild(row); L.appendChild(sec);
  }
  if(!any){ const e=document.createElement('div'); e.className='shop-empty'; e.textContent=T('shop.lockerEmpty'); L.appendChild(e); L.appendChild(shopBtn('yellow', '🛒 '+T('shop.tab.today'), ()=>{ shopTab='today'; shopBuildTab(); })); }
  return L;
}
/* the skins catalogue: the selected character's skins first, then owned ones, then the rest; each card is the character wearing it */
function shopSkins(){ return COSMETICS.filter(c=>c.type==='skin' && (shopAvailable(c) || shopOwned(c.id))); }
function shopBuildSkins(){
  const S=document.createElement('div'); S.className='shop-skins'; S.id='shop-skins';
  const hint=document.createElement('div'); hint.className='shop-hint'; hint.textContent=T('shop.skinsHint'); S.appendChild(hint);
  const items=shopSkins().sort((a,b)=>(shopSkinMine(b)-shopSkinMine(a)) || (shopOwned(b.id)-shopOwned(a.id)));
  const row=document.createElement('div'); row.className='shop-row';
  for(const it of items){ const d=shopItemCard(it, {price:true}); if(shopIsNew(it)) d.insertAdjacentHTML('afterbegin', `<span class="shop-badge-new">${T('shop.new')}</span>`); row.appendChild(d); }
  if(!items.length){ const e=document.createElement('div'); e.className='shop-empty'; e.textContent=T('shop.skinsNone'); S.appendChild(e); }
  S.appendChild(row); return S;
}

/* --- gems --- */
function shopBuildGems(body){
  const wrap=document.createElement('div'); wrap.className='shop-gems';
  const hint=document.createElement('div'); hint.className='shop-hint'; hint.textContent=T('shop.gemHint'); wrap.appendChild(hint);
  const row=document.createElement('div'); row.className='shop-row';
  const items=COSMETICS.filter(c=>shopAvailable(c) && c.gems>0).concat(SHOP_EXTRA.filter(c=>c.gems>0));
  for(const it of items) row.appendChild(shopItemCard(it, {price:true}));
  wrap.appendChild(row); body.appendChild(wrap);
  shopFitCards(wrap);
}

/* --- powers --- */
function shopBuildPowers(body){
  const wrap=document.createElement('div'); wrap.className='shop-powers';
  for(const [k,icon,price,owned,buy] of [['ice','❄️',ICE_PRICE,!!prog.ice,tryBuyIce],['fire','🔥',FIRE_PRICE,!!prog.fire,tryBuyFire]]){
    const d=document.createElement('div'); d.className='shop-pow '+k+(owned?' owned':''); d.dataset.power=k;
    d.innerHTML=`<div class="big">${icon}</div><div class="nm">${T(k+'.name')}</div><div class="desc">${T(k+'.desc')}</div>`;
    if(owned){ const o=document.createElement('div'); o.className='own'; o.textContent=T('ice.owned'); d.appendChild(o); }
    else d.appendChild(shopBtn('purple', T('shop.unlockCoins', fmtNum(price)), ()=>buy().then(()=>{ shopRefresh(); Hooks.emit('purchase',{type:'power', id:k, price}); }), {buy:k}));
    wrap.appendChild(d);
  }
  body.appendChild(wrap);
}

/* ===== wiring ===== */
$('#shop-back').addEventListener('click', ()=>{ sfx.click(); showScreen('home'); refreshHome(); });
document.querySelectorAll('#shop-tabs .shop-tab').forEach(b=>b.addEventListener('click', ()=>{ sfx.click(); shopTab=b.dataset.tab; shopBuildTab(); }));
Hooks.on('wallet', ()=>{ if($('#shop').classList.contains('active')) shopWallet(); });
/* the red dot on the home shop button: home v2 draws its own `.dot` from shopHasNew(); the fallback below is for the old home only */
Hooks.on('home', ()=>{ const b=$('#btn-shop'); if(!b) return; let d=b.querySelector('.shop-dot'); if(shopHasNew() && typeof refreshHomeV2!=='function'){ if(!d){ d=document.createElement('span'); d.className='shop-dot'; if(!b.style.position) b.style.position='relative'; b.appendChild(d); } } else if(d) d.remove(); });
/* the wallet pills on the home screen open the shop (coins → players, gems → the gem tab) */
for(const [id,tab] of [['#xp-badge','players'],['#gem-badge','gems']]){ const el=$(id); if(el && !el.dataset.shopWired){ el.dataset.shopWired='1'; el.addEventListener('click', ()=>{ sfx.click(); openShop(tab); }); } }
NextUp.add(()=> shopFreeClaimed() ? null : {prio:40, icon:'🎁', text:T('shop.nextFree'), action:()=>openShop('today')});
NextUp.add(()=>{ const sl=shopRotation()[0]; const c=sl.char; if(!c || sl.sold || isUnlocked(c)) return null; if((prog.coins|0)<sl.coins && (prog.gems|0)<sl.gems) return null; return {prio:20, icon:'🛒', text:T('shop.nextUp', nm(c)), action:()=>openShop('today')}; });
const _shopApplyLang=applyLang; applyLang=function(){ _shopApplyLang(); if($('#shop').classList.contains('active')) shopBuildTab(); };
/* chest cards (20-chests.js loads after this module, hence the deferred wrap): a skin card shows the character wearing it, not a tag emoji */
setTimeout(()=>{
  if(typeof chestCardPreview!=='function' || chestCardPreview.shopSkin) return;
  const _p=chestCardPreview;
  chestCardPreview=function(c){
    if(c && c.t==='cos'){ const x=cosById(c.id); if(x && x.type==='skin'){ try{ const d=document.createElement('div'); d.className='pv'; d.innerHTML=playerSVG(shopSkinChar(x),'happy',Object.assign({}, x.data)); return d; }catch(e){} } }
    return _p.apply(this, arguments);
  };
  chestCardPreview.shopSkin=true;
}, 0);

I18N_ADD({
 'shop.title':['🛒 החנות','🛒 Shop','🛒 المتجر','🛒 Магазин'],
 'shop.tab.today':['היום','Today','اليوم','Сегодня'], 'shop.tab.players':['שחקנים','Players','اللاعبون','Игроки'], 'shop.tab.looks':['מראה','Looks','المظهر','Образ'],
 'shop.tab.gems':['יהלומים','Gems','جواهر','Алмазы'], 'shop.tab.powers':['כוחות','Powers','القوى','Силы'],
 'shop.renewFull':['⏳ ההצעות מתחלפות בעוד {0}','⏳ Offers change in {0}','⏳ تتغير العروض خلال {0}','⏳ Предложения сменятся через {0}'],
 'shop.todayOnly':['⏳ היום בלבד','⏳ Today only','⏳ اليوم فقط','⏳ Только сегодня'],
 'shop.slot.free':['🎁 מתנה חינם','🎁 Free gift','🎁 هدية مجانية','🎁 Подарок'],
 'shop.free':['חינם! 🎁','FREE! 🎁','مجانًا! 🎁','Бесплатно! 🎁'], 'shop.take':['קח!','Take!','خذ!','Взять!'],
 'shop.freeTaken':['✔ נלקח','✔ Taken','✔ أُخذت','✔ Получено'], 'shop.freeTomorrow':['מחר יש עוד 🎁','More tomorrow 🎁','غدًا المزيد 🎁','Завтра будет ещё 🎁'],
 'shop.freeAlready':['כבר לקחת היום 🎁 מחר יש עוד','Already taken today 🎁 more tomorrow','أخذتها اليوم 🎁 غدًا المزيد','Уже взято сегодня 🎁 завтра будет ещё'],
 'shop.nextFree':['🎁 מתנה חינם מחכה בחנות!','🎁 A free gift is waiting in the shop!','🎁 هدية مجانية تنتظرك في المتجر!','🎁 В магазине ждёт бесплатный подарок!'],
 'shop.gift.coins':['{0} מטבעות','{0} coins','{0} عملة','{0} монет'], 'shop.gift.keys':['מפתח {0}','{0} key','مفتاح {0}','{0} ключ'],
 'shop.gift.gems':['יהלום {0}','{0} gem','جوهرة {0}','{0} алмаз'], 'shop.gift.chest':['תיבת ברונזה','Bronze chest','صندوق برونزي','Бронзовый сундук'],
 'shop.reroll':['🔁 החלף מבחר ({0} 💎)','🔁 Reroll ({0} 💎)','🔁 تغيير العرض ({0} 💎)','🔁 Обновить ({0} 💎)'],
 'shop.rerolled':['✔ הוחלף היום','✔ Rerolled today','✔ تم التغيير اليوم','✔ Уже обновлено'],
 'shop.rerollAsk':['להחליף את המבחר של היום תמורת {0} 💎?','Reroll today\'s picks for {0} 💎?','هل تغيّر عرض اليوم مقابل {0} 💎؟','Обновить сегодняшний набор за {0} 💎?'],
 'shop.slot.char':['⭐ דמות היום','⭐ Player of the day','⭐ لاعب اليوم','⭐ Игрок дня'], 'shop.slot.cos':['👕 מבצע','👕 Deal','👕 عرض','👕 Акция'],
 'shop.slot.gem':['💎 נדיר','💎 Rare','💎 نادر','💎 Редкое'], 'shop.slot.chest':['🎁 תיבה','🎁 Chest','🎁 صندوق','🎁 Сундук'],
 'shop.sold':['✔ נקנה','✔ SOLD','✔ تم الشراء','✔ Куплено'], 'shop.owned2':['✔ שלך','✔ Yours','✔ لك','✔ Твоё'],
 'shop.coinsN':['🪙 {0}','🪙 {0}','🪙 {0}','🪙 {0}'], 'shop.gemsN':['💎 {0}','💎 {0}','💎 {0}','💎 {0}'],
 'shop.buy':['🛒 קנה','🛒 Buy','🛒 اشترِ','🛒 Купить'],
 'shop.confirm2':['לקנות {0} תמורת {1}?','Buy {0} for {1}?','هل تشتري {0} مقابل {1}؟','Купить {0} за {1}?'],
 'shop.noCoins':['חסרים מטבעות 😕 יש לך {0}, צריך {1}','Not enough coins 😕 you have {0}, need {1}','لا تكفي العملات 😕 لديك {0}، تحتاج {1}','Не хватает монет 😕 у тебя {0}, нужно {1}'],
 'shop.noGems':['חסרים יהלומים 😕 יש לך {0}, צריך {1}','Not enough gems 😕 you have {0}, need {1}','لا تكفي الجواهر 😕 لديك {0}، تحتاج {1}','Не хватает алмазов 😕 у тебя {0}, нужно {1}'],
 'shop.got':['🎁 קיבלת: {0}','🎁 You got: {0}','🎁 حصلت على: {0}','🎁 Ты получил: {0}'],
 'shop.equip':['✔ לבש','✔ Equip','✔ ارتدِ','✔ Надеть'], 'shop.unequip':['הסר','Remove','إزالة','Снять'],
 'shop.chestSilver':['תיבת כסף','Silver chest','صندوق فضي','Серебряный сундук'], 'shop.chestGold':['תיבת זהב','Gold chest','صندوق ذهبي','Золотой сундук'],
 'shop.chestGot':['🎁 התיבה נוספה לתיבות שלך','🎁 The chest was added to your chests','🎁 أُضيف الصندوق إلى صناديقك','🎁 Сундук добавлен к твоим сундукам'],
 'shop.new':['🆕 חדש','🆕 New','🆕 جديد','🆕 Новое'],
 'shop.type.kit':['👕 חולצות','👕 Kits','👕 أطقم','👕 Формы'], 'shop.type.boots':['👟 נעליים','👟 Boots','👟 أحذية','👟 Бутсы'], 'shop.type.ball':['⚽ כדורים','⚽ Balls','⚽ كرات','⚽ Мячи'],
 'shop.type.stadium':['🏟️ אצטדיונים','🏟️ Stadiums','🏟️ ملاعب','🏟️ Стадионы'], 'shop.type.celeb':['🎉 חגיגות','🎉 Celebrations','🎉 احتفالات','🎉 Празднования'],
 'shop.type.title':['🏷️ תארים','🏷️ Titles','🏷️ ألقاب','🏷️ Титулы'], 'shop.type.color':['🌈 צבע השם','🌈 Name colour','🌈 لون الاسم','🌈 Цвет имени'], 'shop.type.number':['🔢 מספר חולצה','🔢 Shirt number','🔢 رقم القميص','🔢 Номер на футболке'],
 'shop.type.skin':['🎭 סקינים','🎭 Skins','🎭 أشكال','🎭 Скины'], 'chests.t.skin':['סקין','Skin','شكل','Скин'],
 'shop.looks.locker':['👕 הארון שלי','👕 My locker','👕 خزانتي','👕 Мой шкаф'], 'shop.looks.skins':['🎭 סקינים','🎭 Skins','🎭 أشكال','🎭 Скины'],
 'shop.skinsHint':['🎭 סקין מחליף את כל המראה של דמות אחת · נלבש כשהדמות נבחרת · 💎 בלבד','🎭 A skin changes one player\'s whole look · worn when that player is selected · 💎 only','🎭 الشكل يغيّر مظهر لاعب واحد بالكامل · يظهر عند اختيار ذلك اللاعب · 💎 فقط','🎭 Скин меняет весь облик одного игрока · надевается, когда он выбран · только 💎'],
 'shop.skinsNone':['עוד אין סקינים 🎭 חכו ליום ראשון!','No skins yet 🎭 wait for Sunday!','لا توجد أشكال بعد 🎭 انتظر يوم الأحد!','Скинов пока нет 🎭 жди воскресенья!'],
 'shop.skinOf':['הסקין הזה שייך ל-{0}','This skin belongs to {0}','هذا الشكل يخص {0}','Этот скин принадлежит {0}'],
 'shop.sell':['💰 מכור ב-{0}','💰 Sell for {0}','💰 بِع مقابل {0}','💰 Продать за {0}'],
 'shop.sellAsk':['למכור את {0} ב-{1}?','Sell {0} for {1}?','هل تبيع {0} مقابل {1}؟','Продать {0} за {1}?'],
 'shop.lockerEmpty':['עוד אין לך פריטים 👕 קנו משהו בחנות או פתחו תיבה!','No items yet 👕 buy something in the shop or open a chest!','لا توجد أغراض بعد 👕 اشترِ شيئًا من المتجر أو افتح صندوقًا!','Пока нет вещей 👕 купи что-нибудь в магазине или открой сундук!'],
 'shop.lockerHint':['הפריטים שלך · לחצו כדי ללבוש','Your items · tap to equip','أغراضك · اضغط للارتداء','Твои вещи · нажми, чтобы надеть'],
 'shop.myLook':['המראה שלי','My look','مظهري','Мой образ'],
 'shop.numberDefault':['מספר רגיל','Default number','الرقم العادي','Обычный номер'],
 'shop.filter.all':['הכול','All','الكل','Все'], 'shop.filter.il':['🇮🇱 ישראלים','🇮🇱 Israelis','🇮🇱 إسرائيليون','🇮🇱 Израильтяне'], 'shop.filter.free':['🆓 חינם','🆓 Free','🆓 مجاني','🆓 Бесплатно'],
 'shop.filter.legend':['🏆 אגדות','🏆 Legends','🏆 أساطير','🏆 Легенды'], 'shop.filter.bronze':['🥉 ברונזה','🥉 Bronze','🥉 برونزي','🥉 Бронза'], 'shop.filter.silver':['🥈 כסף','🥈 Silver','🥈 فضي','🥈 Серебро'],
 'shop.filter.gold':['🥇 זהב','🥇 Gold','🥇 ذهبي','🥇 Золото'], 'shop.filter.icon':['💠 אייקון','💠 Icon','💠 أيقونة','💠 Икона'],
 'shop.rar.bronze':['🥉 ברונזה','🥉 Bronze','🥉 برونزي','🥉 Бронза'], 'shop.rar.silver':['🥈 כסף','🥈 Silver','🥈 فضي','🥈 Серебро'], 'shop.rar.gold':['🥇 זהב','🥇 Gold','🥇 ذهبي','🥇 Золото'],
 'shop.rar.icon':['💠 אייקון','💠 Icon','💠 أيقونة','💠 Икона'], 'shop.rar.trophy':['🏆 מדרך הגביעים','🏆 Trophy road','🏆 طريق الكؤوس','🏆 Дорога кубков'],
 'shop.rar.rare':['נדיר','Rare','نادر','Редкое'], 'shop.rar.epic':['אפי','Epic','ملحمي','Эпическое'], 'shop.rar.legendary':['אגדי','Legendary','أسطوري','Легендарное'],
 'shop.selected':['✔ נבחר','✔ Selected','✔ مختار','✔ Выбран'],
 'shop.unlockCoins':['🔓 פתח ב-{0} 🪙','🔓 Unlock for {0} 🪙','🔓 افتح مقابل {0} 🪙','🔓 Открыть за {0} 🪙'],
 'shop.nextUp':['⭐ {0} היום ב-30% הנחה!','⭐ {0} is 30% off today!','⭐ {0} بخصم 30% اليوم!','⭐ {0} сегодня со скидкой 30%!'],
 'shop.allOwned':['יש לך הכול! 🏆','You have everything! 🏆','لديك كل شيء! 🏆','У тебя есть всё! 🏆'],
 'shop.gemHint':['💎 יהלומים מגיעים מרצפים, אתגרי השבוע והישגים גדולים','💎 Gems come from streaks, weekly challenges and big achievements','💎 تأتي الجواهر من السلاسل وتحديات الأسبوع والإنجازات الكبيرة','💎 Алмазы дают серии, недельные задания и большие достижения'],
});
STATIC_ADD({'#shop-title':'shop.title', '#shop-back':'btn.back', '#shop-tab-today':'shop.tab.today', '#shop-tab-players':'shop.tab.players', '#shop-tab-looks':'shop.tab.looks', '#shop-tab-gems':'shop.tab.gems', '#shop-tab-powers':'shop.tab.powers'});
applyLang();
