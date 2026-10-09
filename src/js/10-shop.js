/* ===================================================================================================
   SHOP + COSMETICS + LOCKER — the daily rotating shop (seeded by the server day, same for everyone),
   the 80 characters with rarity frames, the locker (equip what you own), the gem tab, the powers tab,
   and the cosmetics rendering hooks the core already checks for (skinFor / ballSkin) + stadium themes.
   Ownership: prog.cos={items:[ids]}   Equipped: prog.eq={kit,boots,ball,stadium,celeb,title,titlePack,color,number}
   Shop state: prog.shop={bought:{dayKey[r]:slot → id}, reroll:dayKey, seen:dayKey, seenWeek:n}
   =================================================================================================== */
Object.assign(ECON, { shop:{ launch:'2026-10-12', charOff:.3, rerollGems:5, silverDeal:450, silverPrice:500, goldDealGems:20, goldGems:25,
  colors:{gold:40, neon:60, rainbow:80}, numberPrice:500, gemCycle:10 } });

/* items sold by the shop that are not in the catalogue (name colours, the shirt number) — same shape as COSMETICS */
const SHOP_EXTRA=[
  {id:'color_gold',    type:'color',  name:['שם זהב','Gold name','اسم ذهبي','Золотое имя'],        price:0, gems:ECON.shop.colors.gold,    rarity:'epic',      data:{color:'gold'}},
  {id:'color_neon',    type:'color',  name:['שם ניאון','Neon name','اسم نيون','Неоновое имя'],     price:0, gems:ECON.shop.colors.neon,    rarity:'epic',      data:{color:'neon'}},
  {id:'color_rainbow', type:'color',  name:['שם קשת','Rainbow name','اسم قوس قزح','Радужное имя'], price:0, gems:ECON.shop.colors.rainbow, rarity:'legendary', data:{color:'rainbow'}},
  {id:'number_pick',   type:'number', name:['מספר חולצה משלי','My shirt number','رقم قميصي','Свой номер'], price:ECON.shop.numberPrice, rarity:'rare', data:{}},
];
const SHOP_TYPES=['kit','boots','ball','stadium','celeb','title','color','number'];
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
const charDealGems  = c => Math.ceil(priceOf(c)/100);

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
  // 4) one gem item: a 10-day cycle in which every gem exclusive appears exactly once; the other days offer a Gold chest deal
  const gemPool=COSMETICS.filter(c=>shopAvailable(c) && c.gems>0).concat(SHOP_EXTRA.filter(c=>c.gems>0));
  const d=shopDayIndex(), N=ECON.shop.gemCycle, cyc=Math.floor(d/N), p=((d%N)+N)%N;
  const perm=shopShuffle(gemPool, shopRng(shopHash('gem:'+cyc+(s.reroll===dayKey()?'r':''))));
  const b3=s.bought[salt+':3'];
  if(b3 && b3!=='chest_gold' && shopItem(b3)) slots.push({slot:'gem', item:shopItem(b3)});
  else if(!b3 && p<perm.length) slots.push({slot:'gem', item:perm[p]});
  else slots.push({slot:'gem', chest:'gold', gems:ECON.shop.goldDealGems, fullGems:ECON.shop.goldGems});
  // 5) the chest deal
  slots.push({slot:'chest', chest:'silver', coins:ECON.shop.silverDeal, full:ECON.shop.silverPrice});
  slots.forEach((sl,i)=>{ sl.key=salt+':'+i; sl.sold=!!s.bought[sl.key]; });
  return slots;
}
function shopMarkSold(key, id){ const s=shopProg(); s.bought[key]=id||true; const today=dayKey(); for(const k of Object.keys(s.bought)) if(!k.startsWith(today)) delete s.bought[k]; saveProg(); }
function shopTimeLeft(){ const d=new Date(now()); const next=new Date(d.getFullYear(), d.getMonth(), d.getDate()+1).getTime(); const ms=Math.max(0, next-now()); return Math.floor(ms/36e5)+':'+pad2(Math.floor(ms%36e5/6e4)); }
function shopHasNew(){ const s=prog.shop||{}; if(s.seen!==dayKey()) return true; const drop=COSMETICS.some(c=>shopIsNew(c) && !shopOwned(c.id)); return drop && s.seenWeek!==shopWeek(); }

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
  else prog.eq[it.type]=id;
  saveProg(); shopApplyEquip(it.type); Hooks.emit('equip', {type:it.type, id}); return true;
}
function unequipType(type){
  shopProg(); if(type==='title'){ delete prog.eq.title; delete prog.eq.titlePack; } else delete prog.eq[type];
  saveProg(); shopApplyEquip(type); Hooks.emit('equip', {type, id:null}); return true;
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
  shopWallet(); shopBuildTab(); showScreen('shop');
  clearInterval(shopTimer); shopTimer=setInterval(shopTick, 30000);
}
function shopStopTimer(){ clearInterval(shopTimer); shopTimer=0; }
function shopTick(){ if(!$('#shop').classList.contains('active')) return shopStopTimer(); if(shopTab==='today' && shopBuiltDay!==dayKey()) return shopBuildTab(); const t=$('#shop-timer'); if(t) t.textContent=T('shop.renew', shopTimeLeft()); }
function shopWallet(){ const c=$('#shop-coins'), g=$('#shop-gems'); if(c) c.textContent='🪙 '+fmtNum(prog.coins|0); if(g) g.textContent='💎 '+fmtNum(prog.gems|0); }
function shopRefresh(){ shopWallet(); if($('#shop').classList.contains('active')) shopBuildTab(); }
function shopBuildTab(){
  document.querySelectorAll('#shop-tabs .shop-tab').forEach(b=>b.classList.toggle('on', b.dataset.tab===shopTab));
  const body=$('#shop-body'); const keepScroll=body.scrollTop; body.innerHTML='';
  ({today:shopBuildToday, players:shopBuildPlayers, looks:shopBuildLooks, gems:shopBuildGems, powers:shopBuildPowers})[shopTab](body);
  body.scrollTop=keepScroll;                                           // re-rendering (equip/unequip) keeps the scroll position
}
const shopBtn=(cls, txt, fn, extra)=>{ const b=document.createElement('button'); b.className='btn small '+cls; b.innerHTML=txt; if(extra) Object.assign(b.dataset, extra); b.addEventListener('click', e=>{ e.stopPropagation(); sfx.click(); fn(); }); return b; };

/* --- today --- */
function shopBuildToday(body){
  shopBuiltDay=dayKey();
  const wrap=document.createElement('div'); wrap.className='shop-today';
  const row=document.createElement('div'); row.className='shop-slots';
  const slots=shopRotation();
  slots.forEach((sl,i)=>{
    const d=document.createElement('div'); d.className='shop-slot'; d.dataset.slot=sl.slot; d.dataset.i=i;
    let vis='', name='', price='', rar='', badges='', btns=[];
    if(sl.slot==='char'){
      const c=sl.char;
      if(!c){ vis='<span class="emo">🏆</span>'; name=T('shop.allOwned'); }
      else {
        rar='rar-'+charRarity(c); vis=`<div class="sprite">${playerSVG(c,'happy',null)}</div>`; name=esc(nm(c));
        badges=`<span class="shop-badge-off">−${Math.round(ECON.shop.charOff*100)}%</span>`;
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
      if(!sl.sold) btns.push(shopBtn(gold?'blue':'yellow', (gold ? '💎 '+sl.gems : '🪙 '+fmtNum(sl.coins)), ()=>shopBuyChest(sl.chest, sl.coins|0, sl.gems|0, sl.key), {buy:'chest_'+sl.chest}));
    }
    if(rar) d.classList.add(rar); if(sl.sold) d.classList.add('sold');
    d.innerHTML=`${badges}<div class="tag">${T('shop.slot.'+sl.slot)}</div><div class="vis">${vis}</div><div class="nm">${name}</div><div class="pr">${price}</div>`;
    const bb=document.createElement('div'); bb.className='btns'; btns.forEach(b=>bb.appendChild(b)); d.appendChild(bb);
    if(sl.sold) d.insertAdjacentHTML('beforeend', `<div class="shop-sold"><span>${T('shop.sold')}</span></div>`);
    row.appendChild(d);
  });
  wrap.appendChild(row);
  const bar=document.createElement('div'); bar.className='shop-today-bar';
  const tm=document.createElement('span'); tm.id='shop-timer'; tm.textContent=T('shop.renew', shopTimeLeft()); bar.appendChild(tm);
  const done=shopProg().reroll===dayKey();
  const rb=shopBtn('purple'+(done?' done':''), done ? T('shop.rerolled') : T('shop.reroll', ECON.shop.rerollGems), shopReroll); rb.id='shop-reroll'; bar.appendChild(rb);
  wrap.appendChild(bar); body.appendChild(wrap);
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

/* --- looks: the locker --- */
function shopBuildLooks(body){
  shopProg();
  const wrap=document.createElement('div'); wrap.className='shop-looks';
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
          row.appendChild(d); }); continue; }
      const d=document.createElement('div'); d.className='shop-item owned rar-'+it.rarity; d.dataset.id=it.id;
      d.innerHTML=`<div class="vis">${shopVisual(it)}</div><div class="nm">${esc(shopItemName(it))}</div>`;
      if(type==='number'){
        const n=prog.eq.number|0, cur=n||(CHARS[selected].number|0)||10; const box=document.createElement('div'); box.className='shop-num';
        box.appendChild(shopBtn('blue','−',()=>setShirtNumber(Math.max(1,cur-1)), {act:'numDown'}));
        const b=document.createElement('b'); b.textContent=cur; box.appendChild(b);
        box.appendChild(shopBtn('blue','+',()=>setShirtNumber(Math.min(99,cur+1)), {act:'numUp'}));
        d.appendChild(box); d.classList.toggle('on', n>0);
        if(n>0) d.appendChild(shopBtn('red', T('shop.numberDefault'), ()=>setShirtNumber(0), {act:'unequip'}));
        row.appendChild(d); continue;
      }
      const on = type==='color' ? prog.eq.color===it.data.color : prog.eq[type]===it.id;
      d.classList.toggle('on', on);
      d.appendChild(on ? shopBtn('red', T('shop.unequip'), ()=>unequipType(type), {act:'unequip'}) : shopBtn('green', T('shop.equip'), ()=>equipCosmetic(it.id), {act:'equip'}));
      row.appendChild(d);
    }
    sec.appendChild(row); L.appendChild(sec);
  }
  if(!any){ const e=document.createElement('div'); e.className='shop-empty'; e.textContent=T('shop.lockerEmpty'); L.appendChild(e); L.appendChild(shopBtn('yellow', '🛒 '+T('shop.tab.today'), ()=>{ shopTab='today'; shopBuildTab(); })); }
  wrap.appendChild(L);
  const pv=document.createElement('div'); pv.className='shop-preview'; pv.id='shop-lpv';
  const me=CHARS[selected], ttl=titleText(), nc=nameColorClass();
  pv.innerHTML=`<div class="shop-hint">${T('shop.myLook')}</div><div class="sprite">${playerSVG(me)}</div><div class="nm">${nc ? `<b class="${nc}">${esc(nm(me))}</b>` : esc(nm(me))}</div>${ttl?`<div class="ttl">${esc(ttl)}</div>`:''}<div class="ball">${ballSVG()}</div>`;
  wrap.appendChild(pv); body.appendChild(wrap);
}

/* --- gems --- */
function shopBuildGems(body){
  const wrap=document.createElement('div'); wrap.className='shop-gems';
  const hint=document.createElement('div'); hint.className='shop-hint'; hint.textContent=T('shop.gemHint'); wrap.appendChild(hint);
  const row=document.createElement('div'); row.className='shop-row';
  const items=COSMETICS.filter(c=>shopAvailable(c) && c.gems>0).concat(SHOP_EXTRA.filter(c=>c.gems>0));
  for(const it of items){
    const owned=shopOwned(it.id), on = owned && (it.type==='color' ? prog.eq.color===it.data.color : prog.eq[it.type]===it.id);
    const d=document.createElement('div'); d.className='shop-item rar-'+it.rarity+(owned?' owned':'')+(on?' on':''); d.dataset.id=it.id;
    d.innerHTML=`<div class="vis">${shopVisual(it)}</div><div class="nm">${esc(shopItemName(it))}</div><span class="shop-rtag ${it.rarity}">${T('shop.rar.'+it.rarity)}</span><div class="pr">${owned ? T('shop.owned2') : shopPriceText(it)}</div>`;
    if(!owned) d.appendChild(shopBtn('blue', T('shop.buy')+' 💎 '+it.gems, ()=>shopBuyItem(it), {buy:it.id}));
    else d.appendChild(on ? shopBtn('red', T('shop.unequip'), ()=>unequipType(it.type), {act:'unequip'}) : shopBtn('green', T('shop.equip'), ()=>equipCosmetic(it.id), {act:'equip'}));
    row.appendChild(d);
  }
  wrap.appendChild(row); body.appendChild(wrap);
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
Hooks.on('home', ()=>{ const b=$('#btn-shop'); if(b){ let d=b.querySelector('.shop-dot'); if(shopHasNew()){ if(!d){ d=document.createElement('span'); d.className='shop-dot'; if(!b.style.position) b.style.position='relative'; b.appendChild(d); } } else if(d) d.remove(); } });
/* the wallet pills on the home screen open the shop (coins → players, gems → the gem tab) */
for(const [id,tab] of [['#xp-badge','players'],['#gem-badge','gems']]){ const el=$(id); if(el && !el.dataset.shopWired){ el.dataset.shopWired='1'; el.addEventListener('click', ()=>{ sfx.click(); openShop(tab); }); } }
NextUp.add(()=>{ const sl=shopRotation()[0]; const c=sl.char; if(!c || sl.sold || isUnlocked(c)) return null; if((prog.coins|0)<sl.coins && (prog.gems|0)<sl.gems) return null; return {prio:20, icon:'🛒', text:T('shop.nextUp', nm(c)), action:()=>openShop('today')}; });
const _shopApplyLang=applyLang; applyLang=function(){ _shopApplyLang(); if($('#shop').classList.contains('active')) shopBuildTab(); };

I18N_ADD({
 'shop.title':['🛒 החנות','🛒 Shop','🛒 المتجر','🛒 Магазин'],
 'shop.tab.today':['היום','Today','اليوم','Сегодня'], 'shop.tab.players':['שחקנים','Players','اللاعبون','Игроки'], 'shop.tab.looks':['מראה','Looks','المظهر','Образ'],
 'shop.tab.gems':['יהלומים','Gems','جواهر','Алмазы'], 'shop.tab.powers':['כוחות','Powers','القوى','Силы'],
 'shop.renew':['⏳ מתחדש בעוד {0}','⏳ Refreshes in {0}','⏳ يتجدد خلال {0}','⏳ Обновится через {0}'],
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
