/* ===================================================================================================
   ONBOARDING — the first session: a controls card before match 1 (and labels on the real buttons while the
   bot sleeps), the first key + welcome chest after match 1, the daily pickup after match 2, the shop after
   match 3 (the first purchase lands in session one), then the WhatsApp channel + invite card.
   =================================================================================================== */
I18N_ADD({
 'onb.ctrlTitle':['🎮 ככה משחקים','🎮 How to play','🎮 كيف تلعب','🎮 Как играть'],
 'onb.move':['תנועה','Move','تحرّك','Движение'], 'onb.moveTouch':['החלק על הכפתורים משמאל','slide on the left buttons','اسحب على الأزرار اليسرى','кнопки слева'],
 'onb.kick':['בעיטה','Kick','ركلة','Удар'], 'onb.kickHow':['הכפתור הגדול למטה מימין','the big button bottom-right','الزر الكبير أسفل اليمين','большая кнопка справа'],
 'onb.jump':['קפיצה','Jump','قفز','Прыжок'], 'onb.slide':['גליץ\'','Slide','انزلاق','Подкат'], 'onb.scissors':['מספרת','Bicycle kick','مقصية','Бисиклета'],
 'onb.powers':['כוחות','Powers','قوى','Силы'], 'onb.powersHow':['קונים בחנות: קרח ואש','buy in the shop: ice & fire','من المتجر: جليد ونار','в магазине: лёд и огонь'],
 'onb.go':['הבנתי, קדימה! ▶','Got it, let\'s go! ▶','فهمت، هيا! ▶','Понял, вперёд! ▶'], 'onb.close':['סגור','Close','إغلاق','Закрыть'],
 'onb.sleep':['😴 הבוט ישן… עוד {0}','😴 The bot is asleep… {0}','😴 الروبوت نائم… {0}','😴 Бот спит… {0}'], 'onb.wake':['😮 הבוט התעורר!','😮 The bot woke up!','😮 استيقظ الروبوت!','😮 Бот проснулся!'],
 'onb.keyTitle':['הנה המפתח הראשון שלך 🔑','Here is your first key 🔑','هذا أول مفتاح لك 🔑','Вот твой первый ключ 🔑'],
 'onb.keyText':['מפתחות פותחים תיבות עם מטבעות ובגדים. קיבלת גם תיבת ברוכים הבאים!','Keys open chests with coins and kits. You also got a welcome chest!','المفاتيح تفتح صناديق فيها عملات وأطقم. حصلت أيضًا على صندوق ترحيب!','Ключи открывают сундуки с монетами и формой. Ещё ты получил приветственный сундук!'],
 'onb.openChest':['🎁 פתח את התיבה','🎁 Open the chest','🎁 افتح الصندوق','🎁 Открыть сундук'],
 'onb.pickupTitle':['כל יום מחכה לך מתנה 🎁','A gift waits every day 🎁','كل يوم تنتظرك هدية 🎁','Каждый день тебя ждёт подарок 🎁'],
 'onb.pickupText':['לחיצה אחת על "איסוף יומי" לוקחת הכול. מחר: 75 🪙, ובעוד 7 ימים תיבה!','One tap on "daily pickup" takes everything. Tomorrow: 75 🪙, and a chest in 7 days!','ضغطة واحدة على "الجمع اليومي" تأخذ كل شيء. غدًا: 75 🪙، وبعد 7 أيام صندوق!','Одно нажатие на «ежедневный сбор» забирает всё. Завтра: 75 🪙, а через 7 дней сундук!'],
 'onb.shopTitle':['יש לך מספיק לשחקן חדש! 🛒','You can afford a new player! 🛒','لديك ما يكفي للاعب جديد! 🛒','Хватает на нового игрока! 🛒'],
 'onb.shopText':['חלאילי עולה רק 100 🪙. בוא לחנות!','Khalaili costs only 100 🪙. Come to the shop!','خلايلي يكلف 100 🪙 فقط. تعال إلى المتجر!','Халаили стоит всего 100 🪙. Идём в магазин!'],
 'onb.toShop':['🛒 לחנות','🛒 To the shop','🛒 إلى المتجر','🛒 В магазин'],
 'onb.shareTitle':['הצטרפו לערוץ וקבלו קודים 📱','Join the channel for free codes 📱','انضموا إلى القناة لأكواد مجانية 📱','Вступай в канал за кодами 📱'],
 'onb.shareText':['בערוץ הוואטסאפ מתפרסמים קודים לכסף חינם. ותזמין חבר — תשחקו ביחד!','Free codes are posted in the WhatsApp channel. Invite a friend and play together!','تُنشر أكواد مجانية في قناة واتساب. وادعُ صديقًا لتلعبا معًا!','В WhatsApp-канале выкладывают бесплатные коды. Пригласи друга и играйте вместе!'],
 'onb.invite':['📣 הזמן חבר','📣 Invite a friend','📣 ادعُ صديقًا','📣 Пригласить друга'], 'onb.later':['אחר כך','Later','لاحقًا','Позже'],
});
const ONB = { sleepT:0, labelsT:0 };
function onb(){ prog.onboard=prog.onboard||{}; return prog.onboard; }
const isTouchUI = () => document.body.classList.contains('touch');

/* ----- the controls card ----- */
function controlsCards(){
  const touch=isTouchUI();
  const k=(...ks)=>ks.map(x=>`<kbd>${x}</kbd>`).join('');
  return [
    {ic:'🏃', what:T('onb.move'), how: touch ? T('onb.moveTouch') : k('A','D')+' / '+k('◀','▶')},
    {ic:'⚽', what:T('onb.kick'), how: touch ? T('onb.kickHow') : k('Space')},
    {ic:'⬆️', what:T('onb.jump'), how: touch ? '⬆' : k('W')},
    {ic:'🦵', what:T('onb.slide'), how: touch ? '🦵' : k('S')},
    {ic:'🌀', what:T('onb.scissors'), how: touch ? '🌀' : k('Q')},
    {ic:'❄️🔥', what:T('onb.powers'), how:T('onb.powersHow')},
  ];
}
function showControlsHelp(start){
  const g=$('#ctrl-grid'); g.innerHTML=controlsCards().map(c=>`<div class="ck"><div class="big">${c.ic}</div><div class="what">${c.what}</div><div class="how">${c.how}</div></div>`).join('');
  $('#ctrl-title').textContent=T('onb.ctrlTitle');
  const go=$('#btn-ctrl-go'); go.textContent = start ? T('onb.go') : T('onb.close');
  go.onclick=()=>{ sfx.click(); $('#ctrl-modal').classList.remove('show'); if(start) start(); };
  $('#ctrl-modal').classList.add('show');
}
/* the home module calls this before an offline match; returning true means "I started it" */
function onboardingBeforePlay(lv){
  if((prog.matches|0)>0 || (prog.wins|0)>0 || onb().ctrl) return false;   // #47: a save with wins is no newcomer even if matches is 0
  showControlsHelp(()=>{ onb().ctrl=true; saveProg(); ONB.pending=true; startOfflineMatch(0); });
  return true;
}
/* labels on the real buttons + a sleeping bot for the first seconds of match 1 */
Hooks.on('screen', id=>{
  if(id!=='game' || !ONB.pending) return; ONB.pending=false;
  const secs=9; if(typeof botSleep==='function') botSleep(secs+3);
  const L=$('#ctrl-labels'); L.hidden=false; $('#cl-move').textContent='⬅ ➡ '+T('onb.move'); $('#cl-kick').textContent='⚽ '+T('onb.kick'); $('#cl-jump').textContent='⬆ '+T('onb.jump'); $('#cl-slide').textContent='🦵 '+T('onb.slide');
  let n=secs; const tick=()=>{ if(!$('#game').classList.contains('active') || state==='end'){ L.hidden=true; return; } if(state!=='play'){ setTimeout(tick, 300); return; } $('#cl-sleep').textContent=T('onb.sleep', n); if(n<=0){ $('#cl-sleep').textContent=T('onb.wake'); setTimeout(()=>{ L.hidden=true; }, 1200); return; } n--; setTimeout(tick, 1000); };
  tick();
});
/* a "?" in the pause menu reopens the card any time */
(function(){ const p=$('#pause-modal .panel'); if(!p || $('#btn-pause-help')) return; const b=document.createElement('button'); b.className='btn small purple'; b.id='btn-pause-help'; b.textContent='❓'; b.style.marginInlineStart='8px'; b.addEventListener('click', ()=>{ sfx.click(); showControlsHelp(null); }); p.appendChild(b); })();

/* ----- one small card after each of the first matches, shown when the player is back home ----- */
function onbCard(ic, title, text, btns){
  $('#onb-ic').textContent=ic; $('#onb-title').textContent=title; $('#onb-text').textContent=text;
  const box=$('#onb-btns'); box.innerHTML='';
  for(const b of btns){ const e=document.createElement('button'); e.className='btn '+(b.cls||'green'); e.textContent=b.label; e.addEventListener('click', ()=>{ sfx.click(); $('#onb-modal').classList.remove('show'); if(b.fn) b.fn(); }); box.appendChild(e); }
  $('#onb-modal').classList.add('show');
}
function onboardingNext(){
  if(!$('#home').classList.contains('active') || document.querySelector('.overlay.show') || mp) return;
  const o=onb(), m=prog.matches|0;
  if(m>=1 && !o.welcome){
    o.welcome=true; saveProg();
    const open=()=>{ if(typeof openWelcomeChest==='function') openWelcomeChest(); else { addCoins(100,'welcome'); if(typeof giveCosmetic==='function') giveCosmetic('kit_il'); } };
    onbCard('🔑', T('onb.keyTitle'), T('onb.keyText'), [{label:T('onb.openChest'), fn:open}]); return;
  }
  if(m>=2 && !o.pickup){
    o.pickup=true; saveProg();
    onbCard('🎁', T('onb.pickupTitle'), T('onb.pickupText'), [{label:T('ask.yes')+' 👍', fn:()=>{ if(typeof openDailyPickup==='function') openDailyPickup(); }}]); return;
  }
  if(m>=3 && !o.shop){
    const kh=CHARS.find(c=>c.id==='khalaili');
    if(kh && !isUnlocked(kh) && (prog.coins|0)>=priceOf(kh)){ o.shop=true; saveProg(); onbCard('🛒', T('onb.shopTitle'), T('onb.shopText'), [{label:T('onb.toShop'), fn:()=>{ if(typeof openShop==='function') openShop('players'); else $('#btn-chars').click(); }}, {label:T('onb.later'), cls:'small'}]); return; }
    if(m>=5){ o.shop=true; saveProg(); }
  }
  if(m>=4 && o.shop && !o.share){
    o.share=true; saveProg();
    const btns=[{label:T('btn.ceo'), fn:()=>$('#btn-ceo').click()}];
    if(typeof inviteShare==='function') btns.push({label:T('onb.invite'), cls:'purple', fn:inviteShare});
    btns.push({label:T('onb.later'), cls:'small'});
    onbCard('📱', T('onb.shareTitle'), T('onb.shareText'), btns);
  }
}
Hooks.on('screen', id=>{ if(id!=='game') $('#ctrl-labels').hidden=true; if(id==='home') setTimeout(onboardingNext, 700); });
