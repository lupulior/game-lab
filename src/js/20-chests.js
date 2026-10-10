/* ===================================================================================================
   CHESTS — a chest is a DROP (Brawl-Stars Starr-Drop style): tap it open, it rolls a rarity
   (נדיר 🟢 · נדיר במיוחד 🔵 · אדיר 🟣 · מדהים 🔴 · אגדי 🟡): the first rarity rests, then every further step is a distinct
   "⬆ שדרוג!" moment (white flash, screen shake, rising sound, colour snap, name stamp — timings in ECON.chests.climb),
   then three FACE-DOWN cards of that rarity appear; pick one and it flips; the two others flip too, greyed with a red
   "✖ לא נבחר" ribbon so the kid sees what was inside. Better chests → better odds.
   A legendary is guaranteed after ECON.chests.pity drops without one.
   Public: giveChest(kind) openChestsScreen() closeChestsScreen() openChest(kind) openWelcomeChest()
           claimDailyBronze() chestsBadge() chestCanOpen(kind) refreshChestsBadge() buildChests() chestTap()
   prog: prog.chests={bronze,silver,gold,legend,welcome}  prog.chestDay{key,n}  prog.chestOpened{kind:n}
         prog.chestPity (drops since the last legendary)  prog.chestPick={kind,rarity,cards,paid,all} (survives a reload)
   Hooks emitted: 'chest'(kind) when a chest is handed out, 'chestOpen'(kind,{rarity}) when one is opened, 'chestPick'(card)
   =================================================================================================== */
Object.assign(ECON, { chests: {
  taps:3,
  kinds:['bronze','silver','gold','legend'],
  rarities:['rare','superrare','epic','mythic','legendary'],
  bronze: { keys:1, coins:150, gems:0,  odds:[60,25,10,4,1] },
  silver: { keys:3, coins:500, gems:0,  odds:[35,33,20,9,3] },
  gold:   { keys:8, coins:0,   gems:35, odds:[10,28,32,20,10] },
  legend: { keys:0, coins:0,   gems:60, odds:[0,10,35,35,20] },
  welcome:{ cards:[{t:'cos',id:'kit_il'},{t:'coins',n:100},{t:'keys',n:1}] },
  pity:40,              // a legendary is guaranteed after this many drops without one
  /* the rarity climb (ms): the first rarity rests `first`, every "⬆ שדרוג!" moment lasts `step` (white flash `flash`), the final rarity rests `hold` before the cards.
     A legendary = 480 (burst) + first + 3·step + hold ≈ 4.8 s — the slots test waits ~4.9 s for the cards, keep it under that */
  climb:{ first:900, step:800, hold:1000, flash:250 },
  /* what each rarity can hold: coins are small on purpose — the exciting things are players, looks, gems, keys, powers */
  pool:{
    rare:      { coins:[30,50],   keys:1, xp:30,  cos:'rare',      charMax:1000 },
    superrare: { coins:[70,100],  keys:2, gems:2, cos:'rare',      charMax:2500 },
    epic:      { coins:[150,150], keys:3, gems:5, cos:'epic',      charMax:5000 },
    mythic:    { coins:[300,300], gems:12, cos:'epic', cos2:'legendary', charMax:8000 },
    legendary: { coins:[600,600], gems:30, cos:'legendary', charMax:99999, power:true },
  },
  dailyBronze:1,
}});

I18N_ADD({
 'chests.title':['🎁 תיבות','🎁 Chests','🎁 الصناديق','🎁 Сундуки'],
 'chests.bronze':['תיבת ברונזה','Bronze chest','صندوق برونزي','Бронзовый сундук'],
 'chests.silver':['תיבת כסף','Silver chest','صندوق فضي','Серебряный сундук'],
 'chests.gold':['תיבת זהב','Gold chest','صندوق ذهبي','Золотой сундук'],
 'chests.legend':['תיבה אגדית','Legendary chest','صندوق أسطوري','Легендарный сундук'],
 'chests.welcome':['תיבת ברוכים הבאים','Welcome chest','صندوق الترحيب','Приветственный сундук'],
 'chests.have':['יש לך {0}','You have {0}','لديك {0}','У тебя {0}'],
 'chests.haveNone':['אין לך עדיין','None yet','لا تملك بعد','Пока нет'],
 'chests.price':['🔑 {0} או {1}','🔑 {0} or {1}','🔑 {0} أو {1}','🔑 {0} или {1}'],
 'chests.priceGems':['💎 {0}','💎 {0}','💎 {0}','💎 {0}'],
 'chests.openOwned':['🎁 פתח!','🎁 Open!','🎁 افتح!','🎁 Открыть!'],
 'chests.openKeys':['פתח ב-🔑 {0}','Open for 🔑 {0}','افتح بـ 🔑 {0}','Открыть за 🔑 {0}'],
 'chests.openCoins':['פתח ב-🪙 {0}','Open for 🪙 {0}','افتح بـ 🪙 {0}','Открыть за 🪙 {0}'],
 'chests.openGems':['פתח ב-💎 {0}','Open for 💎 {0}','افتح بـ 💎 {0}','Открыть за 💎 {0}'],
 'chests.need':['חסר 🔑 {0}','Need 🔑 {0}','ينقص 🔑 {0}','Нужно 🔑 {0}'],
 'chests.needGems':['חסר 💎 {0}','Need 💎 {0}','ينقص 💎 {0}','Нужно 💎 {0}'],
 'chests.askKeys':['לפתוח {0} ב-🔑 {1}?','Open {0} for 🔑 {1}?','هل تفتح {0} بـ 🔑 {1}؟','Открыть {0} за 🔑 {1}?'],
 'chests.askCoins':['לפתוח {0} ב-🪙 {1}?','Open {0} for 🪙 {1}?','هل تفتح {0} بـ 🪙 {1}؟','Открыть {0} за 🪙 {1}?'],
 'chests.askGems':['לפתוח {0} ב-💎 {1}?','Open {0} for 💎 {1}?','هل تفتح {0} بـ 💎 {1}؟','Открыть {0} за 💎 {1}?'],
 'chests.noMoney':['אין מספיק 😕 נצח משחקים ברמה בינונית ומעלה למפתחות','Not enough 😕 win at Medium or above for keys','غير كافٍ 😕 افز في المستوى المتوسط أو أعلى للمفاتيح','Не хватает 😕 побеждай на Среднем и выше ради ключей'],
 'chests.got':['🎁 קיבלת {0}!','🎁 You got a {0}!','🎁 حصلت على {0}!','🎁 Ты получил: {0}!'],
 'chests.tap':['לחץ על התיבה!','Tap the chest!','اضغط على الصندوق!','Нажми на сундук!'],
 'chests.pickOne':['בחר קלף! 👇','Pick a card! 👇','اختر بطاقة! 👇','Выбери карту! 👇'],
 'chests.picked':['✨ {0} שלך!','✨ {0} is yours!','✨ {0} لك!','✨ {0} твоё!'],
 'chests.yours':['🎁 הכול שלך!','🎁 All yours!','🎁 كله لك!','🎁 Всё твоё!'],
 'chests.done':['✔ סיימתי','✔ Done','✔ انتهيت','✔ Готово'],
 'chests.r.rare':['נדיר','Rare','نادر','Редкий'], 'chests.r.superrare':['נדיר במיוחד','Super rare','نادر جدًا','Сверхредкий'],
 'chests.r.epic':['אדיר','Epic','ملحمي','Эпический'], 'chests.r.mythic':['מדהים','Mythic','أسطوري خارق','Мифический'], 'chests.r.legendary':['אגדי','Legendary','أسطوري','Легендарный'],
 'chests.r.welcome':['ברוכים הבאים!','Welcome!','مرحبًا بك!','Добро пожаловать!'],
 'chests.up':['⬆ שדרוג!','⬆ Upgrade!','⬆ ترقية!','⬆ Повышение!'],
 'chests.lost':['✖ לא נבחר','✖ Not picked','✖ لم يُختر','✖ Не выбрано'],
 'chests.c.coins':['🪙 {0} מטבעות','🪙 {0} coins','🪙 {0} عملة','🪙 {0} монет'], 'chests.c.gems':['💎 {0} יהלומים','💎 {0} gems','💎 {0} جواهر','💎 {0} алмазов'],
 'chests.c.keys':['🔑 {0} מפתחות','🔑 {0} keys','🔑 {0} مفاتيح','🔑 {0} ключей'], 'chests.c.xp':['⭐ {0} נקודות','⭐ {0} points','⭐ {0} نقطة','⭐ {0} очк.'],
 'chests.c.char':['שחקן חדש!','New player!','لاعب جديد!','Новый игрок!'], 'chests.c.ice':['❄️ כוח הקרח!','❄️ Ice power!','❄️ قوة الجليد!','❄️ Сила льда!'], 'chests.c.fire':['🔥 כוח האש!','🔥 Fire power!','🔥 قوة النار!','🔥 Сила огня!'],
 'chests.t.kit':['מדים','Kit','طقم','Форма'], 'chests.t.boots':['נעליים','Boots','حذاء','Бутсы'], 'chests.t.ball':['כדור','Ball','كرة','Мяч'],
 'chests.t.stadium':['אצטדיון','Stadium','ملعب','Стадион'], 'chests.t.celeb':['חגיגה','Celebration','احتفال','Празднование'], 'chests.t.title':['תארים','Titles','ألقاب','Титулы'],
 'chests.can':['מה אפשר לקבל: {0}','You can get: {0}','يمكنك الحصول على: {0}','Можно получить: {0}'],
 'chests.pity':['⭐ אגדי מובטח בעוד {0} תיבות','⭐ Legendary guaranteed in {0} chests','⭐ أسطوري مضمون بعد {0} صناديق','⭐ Легендарный гарантирован через {0}'],
 'chests.pityNow':['⭐ התיבה הבאה: אגדי מובטח!','⭐ Next chest: legendary guaranteed!','⭐ الصندوق التالي: أسطوري مضمون!','⭐ Следующий сундук: легендарный точно!'],
 'chests.coll':['🧑 {0}/{1} שחקנים · 👕 {2}/{3} פריטים','🧑 {0}/{1} players · 👕 {2}/{3} items','🧑 {0}/{1} لاعبين · 👕 {2}/{3} عناصر','🧑 {0}/{1} игроков · 👕 {2}/{3} предметов'],
 'chests.welcomeBtn':['🎁 תיבת ברוכים הבאים — פתח!','🎁 Welcome chest — open!','🎁 صندوق الترحيب — افتح!','🎁 Приветственный сундук — открой!'],
 'chests.pendingBtn':['🎴 יש לך קלף לבחור!','🎴 You have a card to pick!','🎴 لديك بطاقة لتختارها!','🎴 Тебе нужно выбрать карту!'],
 'chests.nextUp':['יש לך תיבה לפתוח!','You have a chest to open!','لديك صندوق لتفتحه!','У тебя есть сундук!'],
 'chests.cosGot':['✨ קיבלת: {0}','✨ You got: {0}','✨ حصلت على: {0}','✨ Получено: {0}'],
 'chests.dailyFree':['🎁 תיבת ברונזה חינם להיום!','🎁 Free Bronze chest for today!','🎁 صندوق برونزي مجاني لليوم!','🎁 Бесплатный бронзовый сундук на сегодня!'],
 'chests.capped':['🪙 הגעת לתקרה היומית','🪙 Daily coin cap reached','🪙 وصلت إلى الحد اليومي','🪙 Дневной лимит монет'],
});
STATIC_ADD({ '#chests-title':'chests.title', '#btn-chests-back':'btn.back', '#chests-welcome':'chests.welcomeBtn', '#chests-pending':'chests.pendingBtn', '#btn-chest-done':'chests.done' });

/* ----- state helpers ----- */
function chestInv(){ prog.chests = prog.chests || {}; for(const k of ['bronze','silver','gold','legend','welcome']) prog.chests[k]=prog.chests[k]|0; return prog.chests; }
const chestName = kind => T('chests.'+kind);
const chestIcon = kind => ({bronze:'📦', silver:'🎁', gold:'👑', legend:'🌟', welcome:'🎁'})[kind] || '🎁';
function chestCfg(kind){ return ECON.chests[kind]; }
const rarityName = r => T('chests.r.'+r);
function chestCosAvailable(c){ if(cosOwned(c.id)) return false; return typeof shopAvailable==='function' ? !!shopAvailable(c) : !c.week; }
function chestCoinPrice(kind){ const cfg=chestCfg(kind); return cfg && cfg.coins && coinCapLeft()>0 ? cfg.coins : 0; }
/* chest coins bought WITH coins count toward the daily cap (no coin printer); keys/gems/owned chests pay in full */
function chestPayCoins(n, why, uncapped){
  if(uncapped){ addCoins(n, why); return n; }
  n=Math.round(n); if(!(n>0)) return 0;
  const give=Math.min(n, coinCapLeft()); if(give<=0) return 0;
  dayCounter('coinDay').n+=give; addCoins(give, why||'chest'); return give;
}
function chestSeed(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h, 16777619); } return h>>>0; }
function chestRng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }

/* ----- the roll: which rarity does this drop give? (pity makes a legendary certain) ----- */
function chestRollRarity(kind, rnd){
  const R=ECON.chests.rarities, odds=chestCfg(kind).odds;
  if((prog.chestPity|0)>=ECON.chests.pity-1) return 'legendary';
  let x=(rnd||Math.random)()*100; for(let i=0;i<R.length;i++){ x-=odds[i]; if(x<0) return R[i]; }
  return R[R.length-1];
}
/* the three cards of a rarity: distinct kinds of reward, only things the kid does not have yet */
function chestCards(rarity, rnd){
  const P=ECON.chests.pool[rarity]; rnd=rnd||Math.random;
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const options=[];
  options.push({t:'coins', n: P.coins[0]+Math.round(rnd()*(P.coins[1]-P.coins[0])/10)*10});
  if(P.gems) options.push({t:'gems', n:P.gems});
  if(P.keys && (prog.keys|0)<ECON.keyCap) options.push({t:'keys', n:P.keys});
  if(P.xp) options.push({t:'xp', n:P.xp});
  const cos=COSMETICS.filter(c=>(c.rarity===P.cos || c.rarity===P.cos2) && chestCosAvailable(c)); if(cos.length) options.push({t:'cos', id:pick(cos).id});
  const chars=CHARS.filter(c=>!isUnlocked(c) && !c.trophyOnly && priceOf(c)<=P.charMax && (rarity!=='legendary' || priceOf(c)>=5000 || !CHARS.some(x=>!isUnlocked(x) && !x.trophyOnly && priceOf(x)>=5000)));
  if(chars.length) options.push({t:'char', id:pick(chars).id});
  if(P.power){ const pw=['ice','fire'].filter(p=>!prog[p]); if(pw.length) options.push({t:'power', id:pick(pw)}); }
  /* three distinct options, the exciting ones (char / cos / power / gems) first */
  const prio={char:0, cos:1, power:1, gems:2, keys:3, coins:4, xp:5};
  options.sort((a,b)=>prio[a.t]-prio[b.t] + (rnd()-.5));
  const cards=options.slice(0,3);
  while(cards.length<3) cards.push({t:'coins', n:P.coins[0]});
  return cards.sort(()=>rnd()-.5);
}
function chestCardName(c){
  if(c.t==='coins') return T('chests.c.coins', fmtNum(c.n)); if(c.t==='gems') return T('chests.c.gems', c.n); if(c.t==='keys') return T('chests.c.keys', c.n); if(c.t==='xp') return T('chests.c.xp', c.n);
  if(c.t==='cos'){ const x=cosById(c.id); return x ? cosName(x) : c.id; } if(c.t==='char'){ const x=CHARS.find(k=>k.id===c.id); return x ? nm(x) : c.id; } if(c.t==='power') return T('chests.c.'+c.id);
  return '?';
}
function chestCardType(c){ if(c.t==='cos'){ const x=cosById(c.id); return x ? T('chests.t.'+x.type) : ''; } if(c.t==='char') return T('chests.c.char'); return ''; }
function chestCardPreview(c){
  const d=document.createElement('div'); d.className='pv';
  if(c.t==='char'){ const x=CHARS.find(k=>k.id===c.id); try{ d.innerHTML=playerSVG(x,'happy',null); }catch(e){ d.classList.add('emoji'); d.textContent='🧑'; } return d; }
  if(c.t==='cos'){ const x=cosById(c.id); if(!x){ d.classList.add('emoji'); d.textContent='👕'; return d; }
    if(x.type==='kit' || x.type==='boots'){ try{ d.innerHTML=playerSVG(CHARS[selected]||CHARS[0], 'happy', x.data); }catch(e){ d.classList.add('emoji'); d.textContent=x.type==='kit'?'👕':'👟'; } }
    else if(x.type==='ball'){ d.classList.add('ball'); d.style.background=`repeating-conic-gradient(${x.data.a} 0 30deg, ${x.data.b} 30deg 60deg)`; }
    else if(x.type==='stadium'){ d.classList.add('stad'); d.style.background=`linear-gradient(${x.data.night?'#1B2A4E':'#7ED3FF'} 0 30%, ${x.data.track} 30% 40%, ${x.data.stripeA} 40% 55%, ${x.data.stripeB} 55% 70%, ${x.data.stripeA} 70% 85%, ${x.data.stripeB} 85%)`; }
    else { d.classList.add('emoji'); d.textContent = x.type==='celeb' ? '🕺' : '🏷️'; }
    return d; }
  d.classList.add('emoji'); d.textContent = c.t==='coins' ? '🪙' : c.t==='gems' ? '💎' : c.t==='keys' ? '🔑' : c.t==='xp' ? '⭐' : c.id==='ice' ? '❄️' : '🔥';
  return d;
}
/* hand the chosen card's content to the player */
function chestGrant(c, paid){
  if(c.t==='coins'){ return chestPayCoins(c.n, 'chest', paid!=='coins')>0; }
  if(c.t==='gems'){ addGems(c.n,'chest'); return true; }
  if(c.t==='keys'){ return addKeys(c.n,'chest')>0; }
  if(c.t==='xp'){ addXP(c.n); return true; }
  if(c.t==='cos'){ return chestGiveCosmetic(c.id); }
  if(c.t==='char'){ const x=CHARS.find(k=>k.id===c.id); if(!x || isUnlocked(x)) return false; prog.unlocked.push(c.id); saveProg(); toast(T('chests.cosGot', nm(x)),'ach'); try{ buildGallery(); }catch(e){} return true; }
  if(c.t==='power'){ if(prog[c.id]) return false; prog[c.id]=true; saveProg(); toast(T('chests.c.'+c.id),'ach'); return true; }
  return false;
}
function chestGiveCosmetic(id){
  if(cosOwned(id)) return false;
  if(typeof giveCosmetic==='function'){ giveCosmetic(id); return true; }
  prog.cos=prog.cos||{}; prog.cos.items=prog.cos.items||[]; prog.cos.items.push(id); saveProg();
  const c=cosById(id); toast(T('chests.cosGot', c ? cosName(c) : id),'ach'); return true;
}

/* ----- can this chest be opened, and how? ----- */
function chestCanOpen(kind){
  const inv=chestInv(), cfg=chestCfg(kind); if(!cfg) return null;
  if(kind==='welcome') return inv.welcome>0 ? 'owned' : null;
  if(inv[kind]>0) return 'owned';
  if(cfg.keys && (prog.keys|0)>=cfg.keys) return 'keys';
  const cp=chestCoinPrice(kind); if(cp && (prog.coins|0)>=cp) return 'coins';
  if(cfg.gems && (prog.gems|0)>=cfg.gems) return 'gems';
  return null;
}
function chestsBadge(){
  const inv=chestInv(); let n=inv.bronze+inv.silver+inv.gold+inv.legend+inv.welcome;
  for(const k of ECON.chests.kinds){ if(!inv[k] && chestCfg(k).keys && (prog.keys|0)>=chestCfg(k).keys) n++; }
  return n;
}
function refreshChestsBadge(){
  const n=chestsBadge(); const el=$('#chests-badge'); if(el){ el.textContent=n ? String(n) : ''; el.hidden=!n; el.classList.toggle('full', (prog.keys|0)>=ECON.keyCap); }
  const b=$('#btn-chests'); if(b) b.classList.toggle('has-chest', n>0);
}
function giveChest(kind, silent){
  const inv=chestInv(); if(!(kind in inv)) return false;
  inv[kind]++; saveProg(); if(!silent) toast(T('chests.got', chestName(kind)),'ach');
  Hooks.emit('chest', kind); refreshChestsBadge(); if($('#chests').classList.contains('active')) buildChests();
  return true;
}
function claimDailyBronze(){
  const d=dayCounter('chestDay'); if(d.n>=ECON.chests.dailyBronze) return false;
  d.n++; saveProg(); giveChest('bronze'); return true;
}

/* ----- opening ----- */
let chestBusy=false;
async function openChest(kind){
  const cfg=chestCfg(kind); if(!cfg || chestBusy) return false;
  if(kind==='welcome') return openWelcomeChest();
  if(prog.chestPick){ chestDropResume(); return false; }                  // finish the pending pick first
  const how=chestCanOpen(kind);
  if(!how){ toast(T('chests.noMoney'),'warn'); return false; }
  chestBusy=true;
  try{
    if(how==='keys'){ if(!(await ask(T('chests.askKeys', chestName(kind), cfg.keys))) || !spendKeys(cfg.keys)) return false; }
    else if(how==='coins'){ const cp=chestCoinPrice(kind); if(!cp || !(await ask(T('chests.askCoins', chestName(kind), fmtNum(cp)))) || !spendCoins(cp)) return false; }
    else if(how==='gems'){ if(!(await ask(T('chests.askGems', chestName(kind), cfg.gems))) || !spendGems(cfg.gems)) return false; }
    else { chestInv()[kind]--; }
    prog.chestOpened=prog.chestOpened||{}; prog.chestOpened[kind]=(prog.chestOpened[kind]|0)+1;
    const rarity=chestRollRarity(kind);
    prog.chestPity = rarity==='legendary' ? 0 : (prog.chestPity|0)+1;
    const cards=chestCards(rarity);
    prog.chestPick={kind, rarity, cards, paid:how, all:false, seen:false};
    saveProg();
    chestDropStart(kind, prog.chestPick);
    Hooks.emit('chestOpen', kind, {rarity}); refreshChestsBadge(); buildChests();
    return true;
  } finally { chestBusy=false; }
}
/* the welcome chest: three face-down cards that ALL flip and are all yours (kit, coins, a key), exactly once */
function openWelcomeChest(){
  if(prog.welcomeChest) return false;
  prog.welcomeChest=true; const inv=chestInv(); if(inv.welcome>0) inv.welcome--;
  prog.chestPick={kind:'welcome', rarity:'welcome', cards:ECON.chests.welcome.cards.map(c=>Object.assign({},c)), paid:'owned', all:true, seen:false};
  saveProg();
  chestDropStart('welcome', prog.chestPick);
  Hooks.emit('chestOpen', 'welcome', {rarity:'welcome'}); refreshChestsBadge(); if($('#chests').classList.contains('active')) buildChests();
  return true;
}

/* ----- the drop (full stage) ----- */
let chestsConfetti=null;
function chestConfetti(n){
  const cv=$('#chests-confetti'); if(!cv) return;
  try{ chestsConfetti = chestsConfetti || makeConfetti(cv, ['#FFD447','#F5C542','#fff7c2','#FF7A3D','#8E5CF6','#fff']); cv.hidden=false; chestsConfetti.burst(n); setTimeout(()=>{ cv.hidden=true; }, 4500); }catch(e){}
}
const DROP={ phase:'idle', taps:0, timers:[], upgrades:0 };   // upgrades = how many "⬆ שדרוג!" moments the current climb has shown
function dropTimer(fn, ms){ const t=setTimeout(fn, ms); DROP.timers.push(t); return t; }
function dropClear(){ DROP.timers.forEach(clearTimeout); DROP.timers=[]; }
function chestDropStart(kind, pick){
  const d=$('#chest-drop'); if(!d) return;
  dropClear(); DROP.phase='tap'; DROP.taps=0; DROP.pick=pick; DROP.upgrades=0;
  d.removeAttribute('data-r'); d.classList.remove('cd-shake','big'); d.hidden=false;
  $('#cd-kind').textContent=chestName(kind);
  const ch=$('#cd-chest'); ch.textContent=chestIcon(kind); ch.className='cd-chest'; ch.hidden=false;
  $('#cd-hint').hidden=false; $('#cd-hint').textContent='👆 '+T('chests.tap');
  const fl=$('#cd-flash'); if(fl) fl.classList.remove('on'); const up=$('#cd-up'); if(up){ up.hidden=true; up.classList.remove('pop'); }
  $('#cd-rarity').hidden=true; $('#cd-pick').hidden=true; $('#cd-cards').hidden=true; $('#cd-cards').innerHTML=''; $('#cd-got').hidden=true; $('#btn-chest-done').hidden=true;
}
/* a pending pick after a reload: straight to the cards */
function chestDropResume(){
  const pick=prog.chestPick; if(!pick) return;
  chestDropStart(pick.kind, pick); DROP.phase='cards';
  $('#cd-chest').hidden=true; $('#cd-hint').hidden=true;
  $('#chest-drop').setAttribute('data-r', pick.rarity==='welcome' ? 'legendary' : pick.rarity);
  const r=$('#cd-rarity'); r.hidden=false; r.className='cd-rarity'; r.textContent=rarityName(pick.rarity);
  chestShowCards(pick);
}
function chestTap(){
  if(DROP.phase!=='tap') return;
  const ch=$('#cd-chest'); DROP.taps++;
  try{ sfx.click(); }catch(e){}
  if(DROP.taps<(ECON.chests.taps|0)){ ch.classList.remove('shake1','shake2','shake3'); void ch.offsetWidth; ch.classList.add('shake'+Math.min(3,DROP.taps)); return; }
  DROP.phase='burst'; ch.classList.remove('shake1','shake2','shake3'); ch.classList.add('burst'); $('#cd-hint').hidden=true;
  try{ sfx.kick(); }catch(e){}
  dropTimer(()=>{ ch.hidden=true; chestRarityClimb(DROP.pick); }, 480);
}
/* the rarity climb, Brawl-Stars style: after the burst the FIRST rarity (always rare) appears big with its colour and rests
   ECON.chests.climb.first ms; every further rarity is a distinct "⬆ שדרוג!" moment — a white flash over the whole drop (#cd-flash),
   a screen shake (#chest-drop.cd-shake, .big for legendary), a rising sound, the background SNAPPING to the new colour (data-r),
   the name stamping in (.cd-rarity.up) with the "⬆ שדרוג!" label above it (#cd-up), small confetti for mythic/legendary;
   the final rarity rests climb.hold ms, then the cards. A plain rare has no upgrade moment at all. Everything runs on dropTimer
   (cleared by chestCloseOpen); a reload never replays the climb — chestDropResume goes straight to the cards. */
function chestUpSound(final){ try{ sfx.click(); setTimeout(()=>sfx.count(1), 90); if(final) setTimeout(()=>sfx.win(), 220); }catch(e){} }
function chestRarityClimb(pick){
  DROP.phase='rarity'; DROP.upgrades=0;
  const R=ECON.chests.rarities, C=ECON.chests.climb||{first:900, step:800, hold:1000, flash:250};
  const d=$('#chest-drop'), r=$('#cd-rarity'), up=$('#cd-up'), fl=$('#cd-flash');
  const target = pick.rarity==='welcome' ? 'legendary' : pick.rarity;
  const steps = R.slice(0, R.indexOf(target)+1);
  const repop=(el,cls)=>{ if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const show=i=>{
    const rr=steps[i], last=i===steps.length-1;
    d.setAttribute('data-r', rr);
    r.hidden=false; r.className='cd-rarity'; r.textContent = (pick.rarity==='welcome' && last) ? rarityName('welcome') : rarityName(rr);
    if(i===0){ repop(r,'pop'); if(up) up.hidden=true; try{ sfx.click(); }catch(e){} }
    else {
      DROP.upgrades++;
      repop(r,'up');
      if(fl){ repop(fl,'on'); dropTimer(()=>fl.classList.remove('on'), C.flash); }
      d.classList.toggle('big', rr==='legendary'); repop(d,'cd-shake');
      if(up){ up.hidden=false; up.textContent=T('chests.up'); repop(up,'pop'); if(last) dropTimer(()=>{ up.hidden=true; }, 900); }
      if(rr==='mythic') chestConfetti(80); else if(rr==='legendary') chestConfetti(220);
      chestUpSound(last && (rr==='mythic' || rr==='legendary'));
    }
    if(!last) dropTimer(()=>show(i+1), i===0 ? C.first : C.step);
    else dropTimer(()=>{ d.classList.remove('cd-shake','big'); chestShowCards(pick); }, C.hold);
  };
  show(0);
}
/* three face-down cards; the chosen one flips, the others flip dimmed afterwards */
function chestShowCards(pick){
  DROP.phase='cards';
  const box=$('#cd-cards'); box.innerHTML=''; box.classList.remove('done'); box.hidden=false;
  $('#cd-pick').hidden=false; $('#cd-pick').textContent = pick.all ? T('chests.yours') : T('chests.pickOne');
  pick.cards.forEach((c,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='ccard'; b.dataset.i=i;
    const back=document.createElement('div'); back.className='face back'; back.textContent='?'; b.appendChild(back);
    const front=document.createElement('div'); front.className='face front'; front.appendChild(chestCardPreview(c));
    const nm=document.createElement('div'); nm.className='pname'; nm.textContent=chestCardName(c); front.appendChild(nm);
    const tp=chestCardType(c); if(tp){ const t=document.createElement('div'); t.className='ptype r-'+(pick.rarity==='welcome'?'legendary':pick.rarity); t.textContent=tp; front.appendChild(t); }
    b.appendChild(front);
    b.addEventListener('click', ()=>chestPickCard(i, b));
    box.appendChild(b);
  });
  if(pick.all){ dropTimer(()=>{ box.querySelectorAll('.ccard').forEach((b,i)=>dropTimer(()=>b.classList.add('flipped'), i*350)); dropTimer(()=>chestFinishAll(pick), 1300); }, 300); }
}
function chestPickCard(i, btn){
  const pick=prog.chestPick; if(!pick || pick.all || DROP.phase!=='cards') return false;
  DROP.phase='done'; const c=pick.cards[i]; if(!c) return false;
  try{ sfx.click(); }catch(e){}
  const box=$('#cd-cards'); box.classList.add('done');
  btn.classList.add('flipped','chosen');
  prog.chestPick=null; saveProg();
  const ok=chestGrant(c, pick.paid);
  $('#cd-pick').hidden=true;
  dropTimer(()=>{ const g=$('#cd-got'); g.hidden=false; g.textContent = ok ? T('chests.picked', chestCardName(c)) : T('chests.capped'); try{ sfx.win(); }catch(e){} if(pick.rarity==='legendary') chestConfetti(200); }, 500);
  /* 900 ms later the two unchosen cards flip face-up one after another (350 ms apart), greyed with a red "not picked" ribbon */
  dropTimer(()=>{ [...box.querySelectorAll('.ccard')].filter(b=>b!==btn).forEach((b,j)=>dropTimer(()=>chestLoseCard(b), j*350)); }, 900);
  dropTimer(()=>{ $('#btn-chest-done').hidden=false; }, 1300);
  Hooks.emit('chestPick', c); refreshChestsBadge(); if($('#chests').classList.contains('active')) buildChests();
  return true;
}
/* an unchosen card: flips to its FRONT (readable), desaturated frame, a red "✖ לא נבחר" ribbon across the top — the kid sees what was inside */
function chestLoseCard(b){
  if(!b || b.classList.contains('lost')) return;
  if(!b.querySelector('.lost-tag')){ const t=document.createElement('div'); t.className='lost-tag'; t.textContent=T('chests.lost'); (b.querySelector('.front')||b).appendChild(t); }
  b.classList.add('flipped','lost');
  try{ sfx.bounce(); }catch(e){}
}
function chestFinishAll(pick){
  if(!prog.chestPick || !prog.chestPick.all) return;
  prog.chestPick=null; saveProg(); DROP.phase='done';
  pick.cards.forEach(c=>chestGrant(c, 'owned'));
  const g=$('#cd-got'); g.hidden=false; g.textContent=T('chests.yours'); try{ sfx.win(); }catch(e){} chestConfetti(160);
  $('#btn-chest-done').hidden=false; refreshChestsBadge(); if($('#chests').classList.contains('active')) buildChests();
}
function chestCloseOpen(){ dropClear(); DROP.phase='idle'; const d=$('#chest-drop'); if(d) d.hidden=true; if($('#chests').classList.contains('active')) buildChests(); }
$('#chest-drop').addEventListener('pointerdown', e=>{ if(e.target.closest('button')) return; if(DROP.phase==='tap'){ e.preventDefault(); chestTap(); } });
$('#btn-chest-done').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} chestCloseOpen(); });

/* ----- the screen ----- */
function openChestsScreen(){ showScreen('chests'); buildChests(); if(prog.chestPick) chestDropResume(); }
function closeChestsScreen(){ chestCloseOpen(); showScreen('home'); }
function chestOddsHTML(kind){ const R=ECON.chests.rarities, odds=chestCfg(kind).odds; return R.map((r,i)=>odds[i] ? `<span class="r-${r}">${rarityName(r)} ${odds[i]}%</span>` : '').join(''); }
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
    const odds=document.createElement('div'); odds.className='odds'; odds.innerHTML=chestOddsHTML(kind); card.appendChild(odds);
    const can=document.createElement('div'); can.className='can'; can.textContent='🪙 🔑 💎 👕 🧑'+(kind==='gold'||kind==='legend' ? ' ❄️ 🔥' : ''); can.title=T('chests.can',''); card.appendChild(can);
    const cp=chestCoinPrice(kind);
    const price=document.createElement('div'); price.className='price'; price.textContent = cfg.keys ? T('chests.price', cfg.keys, cp ? '🪙 '+fmtNum(cp) : '💎 '+cfg.gems) : T('chests.priceGems', cfg.gems); card.appendChild(price);
    const b=document.createElement('button'); b.type='button'; b.className='btn open '+(how==='owned'?'green':how?'yellow':'off'); b.dataset.open=kind;
    b.textContent = how==='owned' ? T('chests.openOwned') : how==='keys' ? T('chests.openKeys', cfg.keys) : how==='coins' ? T('chests.openCoins', fmtNum(cp)) : how==='gems' ? T('chests.openGems', cfg.gems) : (cfg.keys ? T('chests.need', cfg.keys-(prog.keys|0)) : T('chests.needGems', cfg.gems-(prog.gems|0)));
    b.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} openChest(kind); });
    card.appendChild(b); row.appendChild(card);
  }
  const foot=$('#chests-foot'); foot.innerHTML='';
  const left=ECON.chests.pity-(prog.chestPity|0);
  const pity=document.createElement('div'); pity.className='pity'; pity.innerHTML=`<span>${left<=1 ? T('chests.pityNow') : T('chests.pity', left)}</span><span class="bar"><i style="width:${Math.round(Math.min(1,(prog.chestPity|0)/ECON.chests.pity)*100)}%"></i></span>`; foot.appendChild(pity);
  const ownedChars=CHARS.filter(c=>isUnlocked(c)).length, totalChars=CHARS.length, ownedCos=(prog.cos&&prog.cos.items||[]).length, totalCos=COSMETICS.filter(c=>!c.week).length;
  const coll=document.createElement('div'); coll.className='coll'; coll.textContent=T('chests.coll', ownedChars, totalChars, ownedCos, totalCos); foot.appendChild(coll);
  const wb=$('#chests-welcome'); wb.hidden=!(inv.welcome>0 && !prog.welcomeChest);
  const pb=$('#chests-pending'); pb.hidden = !prog.chestPick || !wb.hidden;
}
$('#btn-chests-back').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} closeChestsScreen(); });
$('#chests-welcome').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} openWelcomeChest(); });
$('#chests-pending').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} if(prog.chestPick) chestDropResume(); });

/* ----- home integration ----- */
Hooks.on('home', refreshChestsBadge);
Hooks.on('wallet', refreshChestsBadge);
Hooks.on('screen', id=>{ if(id==='chests') buildChests(); else if(DROP.phase!=='idle' && DROP.phase!=='cards') chestCloseOpen(); });
NextUp.add(()=> chestsBadge()>0 ? { prio:40, icon:'🎁', text:T('chests.nextUp'), action:openChestsScreen } : null);
chestInv();
applyLang();
