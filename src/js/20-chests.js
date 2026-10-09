/* ===================================================================================================
   CHESTS — keys 🔑 open fixed bundles (no loot boxes): Bronze / Silver / Gold, printed contents,
   the only choice inside is "pick 1 of 3" face-up cosmetic cards (never an owned item).
   Public: giveChest(kind) openChestsScreen() closeChestsScreen() openChest(kind) openWelcomeChest()
           claimDailyBronze() chestsBadge() chestCanOpen(kind) chestPickOffer(kind) refreshChestsBadge()
           chestCoinReturn(kind) chestCoinPrice(kind) chestPayCoins(n,why) — chest coins count toward the daily coin cap
   prog: prog.chests={bronze,silver,gold,welcome}  prog.packs  prog.chestDay{key,n}  prog.chestOpened{kind:n}
         prog.chestPick={kind,rarity,ids,seed} (an unpicked offer survives a reload)  prog.welcomeChest=true once granted
   Hooks emitted: 'chest'(kind) when a chest is handed out, 'chestOpen'(kind, rewards) after one is opened, 'chestPick'(id)
   =================================================================================================== */
Object.assign(ECON, { chests: {
  bronze: { keys:1, coins:150, gems:0,  give:{coins:80,  packs:1, gems:0}, pick:null,   kitAlways:false },
  silver: { keys:3, coins:500, gems:0,  give:{coins:300, packs:2, gems:0}, pick:'rare', kitAlways:false },
  gold:   { keys:8, coins:0,   gems:25, give:{coins:900, packs:3, gems:5}, pick:'epic', kitAlways:true  },
  welcome:{ give:{coins:100, packs:0, gems:0}, kit:'kit_il' },
  packCoins:0,          // sticker packs pay nothing until the album exists (prog.packs still counts them for the future album)
  missingCard:100,      // coins per card when the cosmetic pools run dry
  /* invariant (tested): a kind sold for coins costs more than it can return (give.coins + packs×packCoins + a dry-pool coin card) —
     chestCoinPrice() hides the coin route otherwise, and every chest coin goes through chestPayCoins() = the daily coin cap */
  pickCount:3,
  dailyBronze:1,        // free Bronze chests per day through claimDailyBronze()
  kinds:['bronze','silver','gold'],
}});

I18N_ADD({
 'chests.title':['🎁 תיבות','🎁 Chests','🎁 الصناديق','🎁 Сундуки'],
 'chests.bronze':['תיבת ברונזה','Bronze chest','صندوق برونزي','Бронзовый сундук'],
 'chests.silver':['תיבת כסף','Silver chest','صندوق فضي','Серебряный сундук'],
 'chests.gold':['תיבת זהב','Gold chest','صندوق ذهبي','Золотой сундук'],
 'chests.welcome':['תיבת ברוכים הבאים','Welcome chest','صندوق الترحيب','Приветственный сундук'],
 'chests.have':['יש לך {0}','You have {0}','لديك {0}','У тебя {0}'],
 'chests.haveNone':['אין לך עדיין','None yet','لا تملك بعد','Пока нет'],
 'chests.coins':['🪙 +{0}','🪙 +{0}','🪙 +{0}','🪙 +{0}'],
 'chests.gems':['💎 +{0}','💎 +{0}','💎 +{0}','💎 +{0}'],
 'chests.packs':['🎴 {0} חבילות מדבקות (בקרוב)','🎴 {0} sticker packs (soon)','🎴 {0} حزم ملصقات (قريبًا)','🎴 {0} набора наклеек (скоро)'],
 'chests.pack1':['🎴 חבילת מדבקות (בקרוב)','🎴 Sticker pack (soon)','🎴 حزمة ملصقات (قريبًا)','🎴 Набор наклеек (скоро)'],
 'chests.capped':['🪙 הגעת לתקרה היומית','🪙 Daily coin cap reached','🪙 وصلت إلى الحد اليومي','🪙 Дневной лимит монет'],
 'chests.packNow':['🎴 חבילה = 🪙 {0}','🎴 pack = 🪙 {0}','🎴 حزمة = 🪙 {0}','🎴 набор = 🪙 {0}'],
 'chests.pickRare':['🎴 בחר 1 מ-3 נדירים','🎴 Pick 1 of 3 rare','🎴 اختر 1 من 3 نادرة','🎴 Выбери 1 из 3 редких'],
 'chests.pickEpic':['🎴 בחר 1 מ-3 אפיים (תמיד מדים!)','🎴 Pick 1 of 3 epic (a kit always!)','🎴 اختر 1 من 3 ملحمية (طقم دائمًا!)','🎴 Выбери 1 из 3 эпических (всегда форма!)'],
 'chests.price':['🔑 {0} או {1}','🔑 {0} or {1}','🔑 {0} أو {1}','🔑 {0} или {1}'],
 'chests.openOwned':['🎁 פתח!','🎁 Open!','🎁 افتح!','🎁 Открыть!'],
 'chests.openKeys':['פתח ב-🔑 {0}','Open for 🔑 {0}','افتح بـ 🔑 {0}','Открыть за 🔑 {0}'],
 'chests.openCoins':['פתח ב-🪙 {0}','Open for 🪙 {0}','افتح بـ 🪙 {0}','Открыть за 🪙 {0}'],
 'chests.openGems':['פתח ב-💎 {0}','Open for 💎 {0}','افتح بـ 💎 {0}','Открыть за 💎 {0}'],
 'chests.need':['חסר 🔑 {0}','Need 🔑 {0}','ينقص 🔑 {0}','Нужно 🔑 {0}'],
 'chests.askKeys':['לפתוח {0} ב-🔑 {1}?','Open {0} for 🔑 {1}?','هل تفتح {0} بـ 🔑 {1}؟','Открыть {0} за 🔑 {1}?'],
 'chests.askCoins':['לפתוח {0} ב-🪙 {1}?','Open {0} for 🪙 {1}?','هل تفتح {0} بـ 🪙 {1}؟','Открыть {0} за 🪙 {1}?'],
 'chests.askGems':['לפתוח {0} ב-💎 {1}?','Open {0} for 💎 {1}?','هل تفتح {0} بـ 💎 {1}؟','Открыть {0} за 💎 {1}?'],
 'chests.noMoney':['אין מספיק 😕 נצח משחקים ברמה בינונית ומעלה למפתחות','Not enough 😕 win at Medium or above for keys','غير كافٍ 😕 افز في المستوى المتوسط أو أعلى للمفاتيح','Не хватает 😕 побеждай на среднем уровне и выше ради ключей'],
 'chests.got':['🎁 קיבלת {0}!','🎁 You got a {0}!','🎁 حصلت على {0}!','🎁 Ты получил: {0}!'],
 'chests.opening':['{0} נפתחת!','{0} opens!','{0} يُفتح!','{0} открывается!'],
 'chests.pickOne':['בחר קלף אחד! 👇','Pick one card! 👇','اختر بطاقة واحدة! 👇','Выбери одну карту! 👇'],
 'chests.picked':['✨ {0} שלך!','✨ {0} is yours!','✨ {0} لك!','✨ {0} твоё!'],
 'chests.done':['✔ סיימתי','✔ Done','✔ انتهيت','✔ Готово'],
 'chests.coinCard':['🪙 {0} מטבעות','🪙 {0} coins','🪙 {0} عملة','🪙 {0} монет'],
 'chests.rare':['נדיר','Rare','نادر','Редкий'], 'chests.epic':['אפי','Epic','ملحمي','Эпический'], 'chests.legendary':['אגדי','Legendary','أسطوري','Легендарный'],
 'chests.t.kit':['מדים','Kit','طقم','Форма'], 'chests.t.boots':['נעליים','Boots','حذاء','Бутсы'], 'chests.t.ball':['כדור','Ball','كرة','Мяч'],
 'chests.t.stadium':['אצטדיון','Stadium','ملعب','Стадион'], 'chests.t.celeb':['חגיגה','Celebration','احتفال','Празднование'], 'chests.t.title':['תארים','Titles','ألقاب','Титулы'],
 'chests.welcomeBtn':['🎁 תיבת ברוכים הבאים — פתח!','🎁 Welcome chest — open!','🎁 صندوق الترحيب — افتح!','🎁 Приветственный сундук — открой!'],
 'chests.pendingBtn':['🎴 יש לך קלף לבחור!','🎴 You have a card to pick!','🎴 لديك بطاقة لتختارها!','🎴 Тебе нужно выбрать карту!'],
 'chests.nextUp':['יש לך תיבה לפתוח!','You have a chest to open!','لديك صندوق لتفتحه!','У тебя есть сундук!'],
 'chests.keysFull':['🔑 מלא! פתח תיבות','🔑 Full! Open chests','🔑 ممتلئ! افتح الصناديق','🔑 Полно! Открой сундуки'],
 'chests.cosGot':['✨ קיבלת: {0}','✨ You got: {0}','✨ حصلت على: {0}','✨ Получено: {0}'],
 'chests.dailyFree':['🎁 תיבת ברונזה חינם להיום!','🎁 Free Bronze chest for today!','🎁 صندوق برونزي مجاني لليوم!','🎁 Бесплатный бронзовый сундук!'],
});
STATIC_ADD({ '#chests-title':'chests.title', '#btn-chests-back':'btn.back', '#chests-welcome':'chests.welcomeBtn', '#chests-pending':'chests.pendingBtn', '#btn-chest-done':'chests.done' });

/* ----- state helpers ----- */
function chestInv(){ prog.chests = prog.chests || {}; for(const k of ['bronze','silver','gold','welcome']) prog.chests[k]=prog.chests[k]|0; return prog.chests; }
const chestName = kind => T('chests.'+kind);
const chestIcon = kind => ({bronze:'📦', silver:'🎁', gold:'👑', welcome:'🎁'})[kind] || '🎁';
function chestCfg(kind){ return ECON.chests[kind]; }
/* which cosmetics may a chest offer: unowned, right rarity, not reserved for a future Sunday drop (the shop module knows which week it is) */
function chestCosAvailable(c){ if(cosOwned(c.id)) return false; return typeof shopAvailable==='function' ? !!shopAvailable(c) : !c.week; }
/* the most coins a chest can hand back (its coins + packs + a dry-pool coin card); the coin route exists only when the price is higher */
function chestCoinReturn(kind){ const cfg=chestCfg(kind); if(!cfg || !cfg.give) return 0; return (cfg.give.coins|0) + (cfg.give.packs|0)*(ECON.chests.packCoins|0) + (cfg.pick ? ECON.chests.missingCard|0 : 0); }
function chestCoinPrice(kind){ const cfg=chestCfg(kind); return cfg && cfg.coins>chestCoinReturn(kind) && coinCapLeft()>0 ? cfg.coins : 0; }   // no coin route once the daily cap is full: a kid never pays for nothing
/* chest coins count toward the daily coin cap like match coins: pays what is left under the cap, returns what was actually given */
function chestPayCoins(n, why, uncapped){
  if(uncapped){ addCoins(n, why); return n; }
  n=Math.round(n); if(!(n>0)) return 0;
  const give=Math.min(n, coinCapLeft()); if(give<=0) return 0;
  dayCounter('coinDay').n+=give; addCoins(give, why||'chest'); return give;
}
function chestPool(rarity){ return COSMETICS.filter(c=>c.rarity===rarity && chestCosAvailable(c)); }
/* deterministic RNG (mulberry32) from a string seed: the same day + kind + count gives the same three cards */
function chestSeed(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h, 16777619); } return h>>>0; }
function chestRng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
/* the three face-up cards for a chest: ids of unowned cosmetics (or 'coins' cards when the pools are dry) */
function chestPickOffer(kind, count){
  const cfg=chestCfg(kind); if(!cfg || !cfg.pick) return null;
  const n=ECON.chests.pickCount, other = cfg.pick==='epic' ? 'rare' : 'epic';
  const seedStr = dayKey()+'|'+kind+'|'+(count!=null ? count : ((prog.chestOpened||{})[kind]|0));
  const rnd=chestRng(chestSeed(seedStr));
  const take=(arr)=>{ const i=Math.floor(rnd()*arr.length); return arr.splice(i,1)[0]; };
  let main=chestPool(cfg.pick), fallback=chestPool(other); const ids=[];
  if(cfg.kitAlways){ const kits=main.filter(c=>c.type==='kit'); const kits2=fallback.filter(c=>c.type==='kit'); const src = kits.length ? kits : kits2; if(src.length){ const k=take(src); ids.push(k.id); main=main.filter(c=>c.id!==k.id); fallback=fallback.filter(c=>c.id!==k.id); } }
  while(ids.length<n && main.length) ids.push(take(main).id);
  while(ids.length<n && fallback.length) ids.push(take(fallback).id);
  while(ids.length<n) ids.push('coins');
  return { kind, rarity:cfg.pick, ids, seed:seedStr };
}
/* can this chest be opened right now, and how? → 'owned' | 'keys' | 'coins' | 'gems' | null */
function chestCanOpen(kind){
  const inv=chestInv(), cfg=chestCfg(kind); if(!cfg) return null;
  if(kind==='welcome') return inv.welcome>0 ? 'owned' : null;
  if(inv[kind]>0) return 'owned';
  if(cfg.keys && (prog.keys|0)>=cfg.keys) return 'keys';
  const cp=chestCoinPrice(kind); if(cp && (prog.coins|0)>=cp) return 'coins';
  if(cfg.gems && (prog.gems|0)>=cfg.gems) return 'gems';
  return null;
}
/* number of chests the kid can open now: every chest in the inventory + one per kind affordable with keys (for the home button badge) */
function chestsBadge(){
  const inv=chestInv(); let n=inv.bronze+inv.silver+inv.gold+inv.welcome;
  for(const k of ECON.chests.kinds){ if(!inv[k] && (prog.keys|0)>=chestCfg(k).keys) n++; }
  return n;
}
function refreshChestsBadge(){
  const n=chestsBadge(); const el=$('#chests-badge'); if(el){ el.textContent=n ? String(n) : ''; el.hidden=!n; el.classList.toggle('full', (prog.keys|0)>=ECON.keyCap); }
  const b=$('#btn-chests'); if(b) b.classList.toggle('has-chest', n>0);
}

/* ----- handing out chests ----- */
function giveChest(kind, silent){
  const inv=chestInv(); if(!(kind in inv)) return false;
  inv[kind]++; saveProg(); if(!silent) toast(T('chests.got', chestName(kind)),'ach');
  Hooks.emit('chest', kind); refreshChestsBadge(); if($('#chests').classList.contains('active')) buildChests();
  return true;
}
/* the free daily Bronze chest (the daily-pickup module calls this; once per server day) */
function claimDailyBronze(){
  const d=dayCounter('chestDay'); if(d.n>=ECON.chests.dailyBronze) return false;
  d.n++; saveProg(); giveChest('bronze'); return true;
}
/* sticker packs: the album does not exist yet → each pack pays coins now and is remembered in prog.packs */
function chestGivePacks(n){
  n=n|0; if(n<=0) return 0;
  if(typeof givePack==='function'){ for(let i=0;i<n;i++) givePack('chest'); return 0; }
  prog.packs=(prog.packs|0)+n; saveProg(); return n*ECON.chests.packCoins;
}
/* a cosmetic lands in the locker: through the shop module when it exists, else straight into prog.cos */
function chestGiveCosmetic(id){
  if(cosOwned(id)) return false;
  if(typeof giveCosmetic==='function'){ giveCosmetic(id); return true; }
  prog.cos=prog.cos||{}; prog.cos.items=prog.cos.items||[]; prog.cos.items.push(id); saveProg();
  const c=cosById(id); toast(T('chests.cosGot', c ? cosName(c) : id),'ach'); return true;
}

/* ----- opening ----- */
let chestBusy=false;
async function openChest(kind){
  const cfg=chestCfg(kind); if(!cfg || chestBusy) return false;
  if(kind==='welcome') return openWelcomeChest();
  if(prog.chestPick){ chestShowPick(prog.chestPick); return false; }         // finish the pending pick first
  const how=chestCanOpen(kind);
  if(!how){ toast(T('chests.noMoney'),'warn'); return false; }
  chestBusy=true;
  try{
    if(how==='keys'){ if(!(await ask(T('chests.askKeys', chestName(kind), cfg.keys))) || !spendKeys(cfg.keys)) return false; }
    else if(how==='coins'){ const cp=chestCoinPrice(kind); if(!cp || !(await ask(T('chests.askCoins', chestName(kind), fmtNum(cp)))) || !spendCoins(cp)) return false; }
    else if(how==='gems'){ if(!(await ask(T('chests.askGems', chestName(kind), cfg.gems))) || !spendGems(cfg.gems)) return false; }
    else { chestInv()[kind]--; }
    prog.chestOpened=prog.chestOpened||{}; const count=prog.chestOpened[kind]|0;
    const offer = cfg.pick ? chestPickOffer(kind, count) : null;
    prog.chestOpened[kind]=count+1;
    const packCoins=chestGivePacks(cfg.give.packs);
    const rewards={ coins:cfg.give.coins, packs:cfg.give.packs, packCoins, gems:cfg.give.gems|0, capped:false };
    if(offer) prog.chestPick=offer;
    saveProg();
    const want=rewards.coins+packCoins, got=chestPayCoins(want, 'chest', how!=='coins');   // a chest bought with coins counts toward the daily cap; keys/gems/owned chests pay in full
    if(got<want){ rewards.capped=true; rewards.packCoins=Math.min(packCoins, got); rewards.coins=got-rewards.packCoins; }
    if(rewards.gems) addGems(rewards.gems, 'chest');
    chestShowOpen(kind, rewards, offer);
    Hooks.emit('chestOpen', kind, rewards); refreshChestsBadge(); buildChests();
    return true;
  } finally { chestBusy=false; }
}
/* the welcome chest: fixed 100 coins + the starter kit, exactly once (prog.welcomeChest); the onboarding calls this */
function openWelcomeChest(){
  if(prog.welcomeChest) return false;
  const cfg=ECON.chests.welcome; prog.welcomeChest=true; const inv=chestInv(); if(inv.welcome>0) inv.welcome--;
  saveProg();
  addCoins(cfg.give.coins, 'welcome');
  const kit = chestGiveCosmetic(cfg.kit) ? cfg.kit : null;
  chestShowOpen('welcome', {coins:cfg.give.coins, packs:0, packCoins:0, gems:0, kit}, null);
  Hooks.emit('chestOpen', 'welcome', {coins:cfg.give.coins, kit}); refreshChestsBadge(); if($('#chests').classList.contains('active')) buildChests();
  return true;
}

/* ----- the opening modal ----- */
let chestsConfetti=null;
function chestConfetti(n){
  const cv=$('#chests-confetti'); if(!cv) return;
  try{ chestsConfetti = chestsConfetti || makeConfetti(cv, ['#FFD447','#F5C542','#fff7c2','#FF7A3D','#8E5CF6','#fff']); cv.hidden=false; chestsConfetti.burst(n); setTimeout(()=>{ cv.hidden=true; }, 4500); }catch(e){}
}
function chestShowOpen(kind, r, offer){
  const m=$('#chest-open-modal'); if(!m) return;
  $('#copen-title').textContent=T('chests.opening', chestName(kind));
  const ch=$('#copen-chest'); ch.textContent=chestIcon(kind); ch.className='copen-chest'+(offer?' small':''); ch.style.animation='none'; void ch.offsetWidth; ch.style.animation='';
  const box=$('#copen-rewards'); box.innerHTML='';
  const chip=(txt,cls)=>{ const s=document.createElement('span'); if(cls) s.className=cls; s.textContent=txt; box.appendChild(s); };
  if(r.coins) chip(T('chests.coins', fmtNum(r.coins)));
  if(r.packs) chip((r.packs>1 ? T('chests.packs', r.packs) : T('chests.pack1')) + (r.packCoins ? ' = 🪙 +'+fmtNum(r.packCoins) : ''));
  if(r.gems) chip(T('chests.gems', r.gems), 'gem');
  if(r.kit){ const c=cosById(r.kit); chip('👕 '+(c ? cosName(c) : r.kit), 'kit'); }
  if(r.capped) chip(T('chests.capped'), 'capped');
  $('#btn-chest-done').hidden=!!offer;
  $('#copen-pick-title').hidden=!offer; $('#copen-cards').hidden=!offer; $('#copen-cards').innerHTML='';
  if(offer) chestBuildCards(offer);
  m.classList.add('show');
  try{ sfx.win(); }catch(e){}
  if(kind==='gold') chestConfetti(260);
}
function chestShowPick(offer){ chestShowOpen(offer.kind, {coins:0,packs:0,packCoins:0,gems:0}, offer); }
function chestCardPreview(c){
  const d=document.createElement('div'); d.className='pv';
  if(!c){ d.classList.add('emoji'); d.textContent='🪙'; return d; }
  if(c.type==='kit' || c.type==='boots'){ d.classList.add(c.type); try{ d.innerHTML=playerSVG(CHARS[selected]||CHARS[0], 'happy', c.data); }catch(e){ d.classList.add('emoji'); d.textContent=c.type==='kit'?'👕':'👟'; } }
  else if(c.type==='ball'){ d.classList.add('ball'); d.style.background=`repeating-conic-gradient(${c.data.a} 0 30deg, ${c.data.b} 30deg 60deg)`; }
  else if(c.type==='stadium'){ d.classList.add('stad'); d.style.background=`linear-gradient(${c.data.night?'#1B2A4E':'#7ED3FF'} 0 30%, ${c.data.track} 30% 40%, ${c.data.stripeA} 40% 55%, ${c.data.stripeB} 55% 70%, ${c.data.stripeA} 70% 85%, ${c.data.stripeB} 85%)`; }
  else { d.classList.add('emoji'); d.textContent = c.type==='celeb' ? '🕺' : '🏷️'; }
  return d;
}
function chestBuildCards(offer){
  const box=$('#copen-cards'); box.innerHTML=''; box.classList.remove('done');
  $('#copen-pick-title').textContent=T('chests.pickOne');
  offer.ids.forEach(id=>{
    const c = id==='coins' ? null : cosById(id);
    const b=document.createElement('button'); b.type='button'; b.className='cpick '+(c ? c.rarity : 'coin'); b.dataset.id=id;
    b.appendChild(chestCardPreview(c));
    const nm=document.createElement('div'); nm.className='pname'; nm.textContent = c ? cosName(c) : T('chests.coinCard', fmtNum(ECON.chests.missingCard)); b.appendChild(nm);
    const tp=document.createElement('div'); tp.className='ptype'; tp.textContent = c ? (T('chests.t.'+c.type)+' · '+T('chests.'+c.rarity)) : '🪙'; b.appendChild(tp);
    b.addEventListener('click', ()=>chestPickCard(id, b));
    box.appendChild(b);
  });
}
function chestPickCard(id, btn){
  const offer=prog.chestPick; if(!offer || !offer.ids.includes(id)) return false;
  try{ sfx.click(); }catch(e){}
  const box=$('#copen-cards'); box.classList.add('done');
  box.querySelectorAll('.cpick').forEach(b=>b.classList.toggle('lost', b!==btn)); if(btn) btn.classList.add('chosen');
  prog.chestPick=null; saveProg();
  if(id==='coins'){ const got=chestPayCoins(ECON.chests.missingCard, 'chest'); if(got<ECON.chests.missingCard) $('#copen-pick-title').textContent=T('chests.capped'); }
  else { chestGiveCosmetic(id); const c=cosById(id); $('#copen-pick-title').textContent=T('chests.picked', c ? cosName(c) : id); }
  Hooks.emit('chestPick', id);
  $('#btn-chest-done').hidden=false; refreshChestsBadge(); if($('#chests').classList.contains('active')) buildChests();
  return true;
}
function chestCloseOpen(){ $('#chest-open-modal').classList.remove('show'); if($('#chests').classList.contains('active')) buildChests(); }

/* ----- the screen ----- */
function openChestsScreen(){ showScreen('chests'); buildChests(); if(prog.chestPick) chestShowPick(prog.chestPick); }
function closeChestsScreen(){ chestCloseOpen(); showScreen('home'); }
function buildChests(){
  const inv=chestInv(), row=$('#chests-row'); if(!row) return;
  const w=$('#chests-wallet'); w.innerHTML='';
  const pill=(txt,cls)=>{ const s=document.createElement('span'); s.className=cls; s.textContent=txt; w.appendChild(s); };
  pill('🔑 '+(prog.keys|0), 'k'+((prog.keys|0)>=ECON.keyCap?' full':'')); pill('🪙 '+fmtNum(prog.coins|0), 'c'); pill('💎 '+fmtNum(prog.gems|0), 'g');
  row.innerHTML='';
  for(const kind of ECON.chests.kinds){
    const cfg=chestCfg(kind), how=chestCanOpen(kind), n=inv[kind];
    const card=document.createElement('div'); card.className='chest-card ck-'+kind; card.dataset.kind=kind;
    const name=document.createElement('div'); name.className='cname'; name.textContent=chestName(kind); card.appendChild(name);
    const box=document.createElement('div'); box.className='cbox'+(n?' has':''); box.textContent=chestIcon(kind);
    if(n){ const c=document.createElement('span'); c.className='cnt'; c.textContent='×'+n; box.appendChild(c); } card.appendChild(box);
    const have=document.createElement('div'); have.className='have'+(n?'':' none'); have.textContent = n ? T('chests.have', n) : T('chests.haveNone'); card.appendChild(have);
    const gives=document.createElement('div'); gives.className='gives';
    const g=(txt,cls)=>{ const s=document.createElement('span'); if(cls) s.className=cls; s.textContent=txt; gives.appendChild(s); };
    g(T('chests.coins', fmtNum(cfg.give.coins)));
    g(cfg.give.packs>1 ? T('chests.packs', cfg.give.packs) : T('chests.pack1'));
    if(cfg.give.gems) g(T('chests.gems', cfg.give.gems));
    if(cfg.pick) g(T(cfg.pick==='epic' ? 'chests.pickEpic' : 'chests.pickRare'), 'pick');
    card.appendChild(gives);
    const cp=chestCoinPrice(kind);
    const price=document.createElement('div'); price.className='price'; price.textContent=T('chests.price', cfg.keys, cp ? '🪙 '+fmtNum(cp) : '💎 '+cfg.gems); card.appendChild(price);
    const b=document.createElement('button'); b.type='button'; b.className='btn open '+(how==='owned'?'green':how?'yellow':'off'); b.dataset.open=kind;
    b.textContent = how==='owned' ? T('chests.openOwned') : how==='keys' ? T('chests.openKeys', cfg.keys) : how==='coins' ? T('chests.openCoins', fmtNum(cp)) : how==='gems' ? T('chests.openGems', cfg.gems) : T('chests.need', cfg.keys);
    b.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} openChest(kind); });
    card.appendChild(b); row.appendChild(card);
  }
  const wb=$('#chests-welcome'); wb.hidden=!(inv.welcome>0 && !prog.welcomeChest);
  const pb=$('#chests-pending'); pb.hidden = !prog.chestPick || !wb.hidden;        // one banner at a time: the welcome chest wins
}
$('#btn-chests-back').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} closeChestsScreen(); });
$('#chests-welcome').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} openWelcomeChest(); });
$('#chests-pending').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} if(prog.chestPick) chestShowPick(prog.chestPick); });
$('#btn-chest-done').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} chestCloseOpen(); });

/* ----- home integration: badge refresh, next-up candidate ----- */
Hooks.on('home', refreshChestsBadge);
Hooks.on('wallet', refreshChestsBadge);
Hooks.on('screen', id=>{ if(id==='chests') buildChests(); });
NextUp.add(()=> chestsBadge()>0 ? { prio:40, icon:'🎁', text:T('chests.nextUp'), action:openChestsScreen } : null);
chestInv();
applyLang();
