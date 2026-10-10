/* ===================================================================================================
   CLUBS — a shared weekly goal, no chat, no free text (PLAN §9.8 simplified, Rumble-Stars style).
   Server (Firebase REST through fbReq):
     clubs/<id>      = {name:<presetIndex>, emoji, code, created, members:{<fbKey>:{name,lv,g,w,m,wk,t}}, week:{key,goals}}
     clubCodes/<CODE> = <id>
   Every member's REAL matches PATCH its own member node with absolute weekly counters (goals g, wins w,
   matches m, week key wk) — when the week key changes the counters restart. The club total is the sum
   of g over the members whose wk is the current week; target = 15 goals × members (min 30).
   Local: prog.club = {id, code, name:<presetIndex>, emoji, joined, me:{wk,g,w,m}, dirty?, codeDirty?, tot?, target?, n?}
          prog.clubPrize = weekKey() once this week's prize was taken.
   Reads are bounded: one GET of clubs/<id> when the club screen opens (cached 10 min, 🔄 forces), one
   PATCH after every match, one GET on the claim button. Everything degrades: undefined = "no connection".
   =================================================================================================== */
const CLUB_ALPHA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';            // join codes and ids: no 0/O/1/I
const CLUB_NAMES=[
  ['האריות','The Lions','الأسود','Львы'], ['הברקים','The Lightnings','البروق','Молнии'], ['הכרישים','The Sharks','القروش','Акулы'],
  ['הנמרים','The Tigers','النمور','Тигры'], ['הנשרים','The Eagles','النسور','Орлы'], ['הדרקונים','The Dragons','التنانين','Драконы'],
  ['הזאבים','The Wolves','الذئاب','Волки'], ['הדובים','The Bears','الدببة','Медведи'], ['הרקטות','The Rockets','الصواريخ','Ракеты'],
  ['הכוכבים','The Stars','النجوم','Звёзды'], ['האלופים','The Champions','الأبطال','Чемпионы'], ['הפנתרים','The Panthers','الفهود','Пантеры'],
  ['הסופות','The Storms','العواصف','Бури'], ['הפיראטים','The Pirates','القراصنة','Пираты'], ['הגיבורים','The Heroes','الأبطال الخارقون','Герои'],
  ['הקוסמים','The Wizards','السحرة','Волшебники'], ['הרובוטים','The Robots','الروبوتات','Роботы'], ['הנינג׳ות','The Ninjas','النينجا','Ниндзя'],
  ['הקופים','The Monkeys','القرود','Обезьяны'], ['הפילים','The Elephants','الفيلة','Слоны'], ['הסוסים','The Horses','الخيول','Кони'],
  ['הצפרדעים','The Frogs','الضفادع','Лягушки'], ['האש','The Fire','النار','Огонь'], ['הקרח','The Ice','الجليد','Лёд'],
];
const CLUB_EMOJIS=['🦁','⚡','🦈','🐯','🦅','🐉','🚀','⭐','🏆','🔥','🤖','🐺'];
const CLUB_NAME_EMOJI=['🦁','⚡','🦈','🐯','🦅','🐉','🐺','🏆','🚀','⭐','🏆','🐯','⚡','🏆','⭐','🔥','🤖','⚡','🦁','🏆','🚀','🐉','🔥','⭐'];   // the default emoji per preset name
Object.assign(ECON, { clubs:{ create:20, max:20, goalPer:15, goalMin:30, prizeMatches:5, prizeGems:10, prizeCoins:300, prizeCoinsGold:600, refreshMs:10*60000 } });

I18N_ADD({
 'clubs.title':['🏟️ מועדון','🏟️ Club','🏟️ النادي','🏟️ Клуб'],
 'clubs.btn':['🏟️ מועדון','🏟️ Club','🏟️ النادي','🏟️ Клуб'],
 'clubs.pillNone':['🏟️ מועדון','🏟️ Club','🏟️ النادي','🏟️ Клуб'],
 'clubs.pill':['{0} {2}/{3}','{0} {2}/{3}','{0} {2}/{3}','{0} {2}/{3}'],   /* short: the pill shares a row with the league pill */
 'clubs.intro':['שחקו יחד עם חברים למטרה שבועית ⚽ כל גול נספר!','Play with friends toward a weekly goal ⚽ every goal counts!','العبوا مع الأصدقاء نحو هدف أسبوعي ⚽ كل هدف يُحتسب!','Играй с друзьями к недельной цели ⚽ каждый гол считается!'],
 'clubs.createCost':['➕ צור מועדון · {0}💎','➕ Create a club · {0}💎','➕ أنشئ ناديًا · {0}💎','➕ Создать клуб · {0}💎'],
 'clubs.createFree':['➕ צור מועדון · חינם','➕ Create a club · free','➕ أنشئ ناديًا · مجانًا','➕ Создать клуб · бесплатно'],
 'clubs.joinBtn':['🔑 הצטרף עם קוד','🔑 Join with a code','🔑 انضم برمز','🔑 Войти по коду'],
 'clubs.pickName':['בחרו שם','Pick a name','اختاروا اسمًا','Выбери имя'],
 'clubs.pickEmoji':['בחרו סמל','Pick an emoji','اختاروا رمزًا','Выбери эмодзи'],
 'clubs.createQ':['ליצור את המועדון {0} {1} תמורת {2}💎?','Create the club {0} {1} for {2}💎?','إنشاء النادي {0} {1} مقابل {2}💎؟','Создать клуб {0} {1} за {2}💎?'],
 'clubs.createQFree':['ליצור את המועדון {0} {1}?','Create the club {0} {1}?','إنشاء النادي {0} {1}؟','Создать клуб {0} {1}?'],
 'clubs.created':['🎉 המועדון {0} {1} נוצר! הקוד: {2}','🎉 Club {0} {1} created! Code: {2}','🎉 تم إنشاء النادي {0} {1}! الرمز: {2}','🎉 Клуб {0} {1} создан! Код: {2}'],
 'clubs.codeHint':['בקשו מחבר את קוד המועדון (6 אותיות)','Ask a friend for the club code (6 letters)','اطلبوا من صديق رمز النادي (6 أحرف)','Попроси у друга код клуба (6 знаков)'],
 'clubs.join':['🚀 הצטרף','🚀 Join','🚀 انضم','🚀 Войти'],
 'clubs.joinQ':['להצטרף למועדון עם הקוד {0}?','Join the club with code {0}?','الانضمام إلى النادي بالرمز {0}؟','Войти в клуб с кодом {0}?'],
 'clubs.joined':['🎉 הצטרפת למועדון {0} {1}!','🎉 You joined {0} {1}!','🎉 انضممت إلى {0} {1}!','🎉 Ты в клубе {0} {1}!'],
 'clubs.badCode':['הקוד הוא 6 אותיות או ספרות','The code is 6 letters or digits','الرمز 6 أحرف أو أرقام','Код — 6 букв или цифр'],
 'clubs.notFound':['אין מועדון עם הקוד הזה','No club with that code','لا يوجد نادٍ بهذا الرمز','Нет клуба с таким кодом'],
 'clubs.full':['המועדון מלא ({0} חברים)','The club is full ({0} members)','النادي ممتلئ ({0} أعضاء)','Клуб полон ({0} участников)'],
 'clubs.already':['אתם כבר במועדון — עזבו אותו קודם','You are already in a club — leave it first','أنتم بالفعل في نادٍ — غادروه أولًا','Ты уже в клубе — сначала выйди'],
 'clubs.needName':['צריך שם קודם','You need a name first','تحتاج إلى اسم أولًا','Сначала нужно имя'],
 'clubs.needGems':['צריך {0}💎 כדי ליצור מועדון','You need {0}💎 to create a club','تحتاج إلى {0}💎 لإنشاء نادٍ','Нужно {0}💎, чтобы создать клуб'],
 'clubs.noConn':['אין חיבור — נסו שוב עוד רגע','No connection — try again in a moment','لا يوجد اتصال — حاولوا بعد قليل','Нет связи — попробуй через минуту'],
 'clubs.offlineCached':['אין חיבור — מציג את הנתונים האחרונים','No connection — showing the last data','لا يوجد اتصال — عرض آخر البيانات','Нет связи — показаны последние данные'],
 'clubs.code':['קוד: {0}','Code: {0}','الرمز: {0}','Код: {0}'],
 'clubs.copy':['📋 העתק קוד','📋 Copy code','📋 نسخ الرمز','📋 Копировать код'],
 'clubs.copied':['📋 הקוד הועתק!','📋 Code copied!','📋 تم نسخ الرمز!','📋 Код скопирован!'],
 'clubs.copyFail':['לא הצלחנו להעתיק — הקוד: {0}','Could not copy — the code: {0}','لم ننجح في النسخ — الرمز: {0}','Не удалось скопировать — код: {0}'],
 'clubs.invite':['📣 הזמן חברים','📣 Invite friends','📣 ادعُ الأصدقاء','📣 Пригласить друзей'],
 'clubs.inviteText':['בואו למועדון שלי {0} {1} בכוכב הכדורגל ⚽ הקוד: {2}\n{3}','Join my club {0} {1} in Football Star ⚽ code: {2}\n{3}','انضموا إلى ناديي {0} {1} في نجم كرة القدم ⚽ الرمز: {2}\n{3}','Вступай в мой клуб {0} {1} в Звезде футбола ⚽ код: {2}\n{3}'],
 'clubs.leave':['🚪 עזוב','🚪 Leave','🚪 غادر','🚪 Выйти'],
 'clubs.leaveQ':['לעזוב את המועדון? הגולים שלכם השבוע יורדים מהמועדון','Leave the club? Your goals this week leave with you','مغادرة النادي؟ أهدافكم هذا الأسبوع تُحذف من النادي','Выйти из клуба? Твои голы за неделю уйдут с тобой'],
 'clubs.left':['עזבתם את המועדון','You left the club','غادرتم النادي','Ты вышел из клуба'],
 'clubs.gone':['המועדון כבר לא קיים','The club no longer exists','النادي لم يعد موجودًا','Клуба больше нет'],
 'clubs.progress':['⚽ {0} / {1} השבוע','⚽ {0} / {1} this week','⚽ {0} / {1} هذا الأسبوع','⚽ {0} / {1} на этой неделе'],
 'clubs.daysLeft':['⏳ נשארו {0} ימים','⏳ {0} days left','⏳ بقي {0} أيام','⏳ осталось {0} дн.'],
 'clubs.lastDay':['⏳ היום האחרון!','⏳ Last day!','⏳ اليوم الأخير!','⏳ Последний день!'],
 'clubs.prizeLine':['🎁 יעד = תיבת כסף + 10💎 לכל מי ששיחק {0} משחקים · פי 2 = תיבת זהב','🎁 Goal = Silver chest + 10💎 for everyone with {0} matches · 2× = Gold chest','🎁 الهدف = صندوق فضي + 10💎 لكل من لعب {0} مباريات · ×2 = صندوق ذهبي','🎁 Цель = серебряный сундук + 10💎 всем с {0} матчами · 2× = золотой сундук'],
 'clubs.members':['👥 חברים ({0}/{1})','👥 Members ({0}/{1})','👥 الأعضاء ({0}/{1})','👥 Участники ({0}/{1})'],
 'clubs.memberStats':['⚽ {0} · 🏆 {1} · 🎮 {2}','⚽ {0} · 🏆 {1} · 🎮 {2}','⚽ {0} · 🏆 {1} · 🎮 {2}','⚽ {0} · 🏆 {1} · 🎮 {2}'],
 'clubs.me':['אני','me','أنا','я'],
 'clubs.claim':['🎁 קח את הפרס!','🎁 Take the prize!','🎁 خذ الجائزة!','🎁 Забрать приз!'],
 'clubs.claimGold':['🥇 קח את תיבת הזהב!','🥇 Take the Gold chest!','🥇 خذ الصندوق الذهبي!','🥇 Забрать золотой сундук!'],
 'clubs.claimed':['✅ קיבלת את הפרס השבוע','✅ Prize taken this week','✅ أخذت الجائزة هذا الأسبوع','✅ Приз за неделю получен'],
 'clubs.claimFar':['🎁 הפרס מחכה ביעד','🎁 The prize waits at the goal','🎁 الجائزة تنتظر عند الهدف','🎁 Приз ждёт у цели'],
 'clubs.claimNeed':['🎁 עוד {0} משחקים לפרס','🎁 {0} more matches for the prize','🎁 {0} مباريات أخرى للجائزة','🎁 Ещё {0} матчей до приза'],
 'clubs.notYet':['המועדון עוד לא הגיע ליעד ({0}/{1})','The club has not reached the goal yet ({0}/{1})','لم يصل النادي إلى الهدف بعد ({0}/{1})','Клуб ещё не достиг цели ({0}/{1})'],
 'clubs.needMatches':['שחקו עוד {0} משחקים השבוע כדי לקבל את הפרס','Play {0} more matches this week to get the prize','العبوا {0} مباريات أخرى هذا الأسبوع لنيل الجائزة','Сыграй ещё {0} матчей на этой неделе, чтобы получить приз'],
 'clubs.prizeSilver':['🎁 פרס המועדון: תיבת כסף + 10💎!','🎁 Club prize: Silver chest + 10💎!','🎁 جائزة النادي: صندوق فضي + 10💎!','🎁 Приз клуба: серебряный сундук + 10💎!'],
 'clubs.prizeGold':['🥇 פרס המועדון: תיבת זהב + 10💎!','🥇 Club prize: Gold chest + 10💎!','🥇 جائزة النادي: صندوق ذهبي + 10💎!','🥇 Приз клуба: золотой сундук + 10💎!'],
 'clubs.back':['חזרה','Back','رجوع','Назад'],
});
STATIC_ADD({'#club-title':'clubs.title', '#btn-club-close':'clubs.back', '#btn-club':'clubs.btn'});

const CLUB={ data:null, fetched:0, offline:false, busy:false, loading:null, view:'none', pick:{name:0, emoji:CLUB_NAME_EMOJI[0], emojiSet:false}, pending:null, pendingBusy:false };

/* ----- small helpers ----- */
function clubName(i, l){ const row=CLUB_NAMES[i|0]||CLUB_NAMES[0]; return row[LI[l||lang]]||row[0]; }
function clubRand(n){ const a=new Uint8Array(n); try{ crypto.getRandomValues(a); }catch(e){ for(let i=0;i<n;i++) a[i]=Math.random()*256|0; } return Array.from(a, b=>CLUB_ALPHA[b%32]).join(''); }
function clubValidCode(c){ return /^[A-Z0-9]{6}$/.test(String(c||'')); }
function clubNormCode(s){ return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); }
function myClub(){ return (prog.club && typeof prog.club==='object' && prog.club.id) ? prog.club : null; }
function clubMyKey(){ const n=normName(settings.name); return n ? fbKey(n) : ''; }
function clubTarget(n){ return Math.max(ECON.clubs.goalMin, ECON.clubs.goalPer*Math.max(1, n|0)); }
function clubDaysLeft(){ const d=new Date(now()); return 7-((d.getDay()+6)%7); }   // weeks start on Monday (weekKey): Monday 7 … Sunday 1
/* my weekly counters, restarted when the (server) week changes */
function clubMe(){ const c=myClub(); const wk=weekKey(); if(!c) return {wk, g:0, w:0, m:0}; if(!c.me || c.me.wk!==wk) c.me={wk, g:0, w:0, m:0}; return c.me; }
function clubMemberBody(me){ me=me||clubMe(); return {name:normName(settings.name), lv:myLevel(), g:me.g|0, w:me.w|0, m:me.m|0, wk:me.wk, t:{'.sv':'timestamp'}}; }
/* the week as the club sees it: members whose wk is the current week count; my own local counters may be ahead of the server (a PATCH that failed) → the better of the two */
function clubWeekStats(data){
  const wk=weekKey(), ms=(data && data.members && typeof data.members==='object') ? data.members : {}, my=clubMyKey(), me=clubMe();
  const list=Object.keys(ms).map(k=>{ const m=ms[k]||{}; const cur=m.wk===wk; return {key:k, name:String(m.name||'?').slice(0,14), lv:m.lv|0, g:cur?m.g|0:0, w:cur?m.w|0:0, m:cur?m.m|0:0, me:k===my}; });
  const totalServer=list.reduce((s,x)=>s+x.g, 0);
  let mine=list.find(x=>x.me);
  if(!mine && my && myClub()){ mine={key:my, name:normName(settings.name), lv:myLevel(), g:0, w:0, m:0, me:true}; list.push(mine); }
  if(mine && me.wk===wk){ mine.g=Math.max(mine.g, me.g|0); mine.w=Math.max(mine.w, me.w|0); mine.m=Math.max(mine.m, me.m|0); }
  list.sort((a,b)=>b.g-a.g || b.w-a.w || a.name.localeCompare(b.name));
  const n=Math.max(1, list.length), total=list.reduce((s,x)=>s+x.g, 0);
  return {wk, n, total, totalServer, target:clubTarget(n), list, myM: mine ? mine.m : 0};
}
function clubPrizeState(st){
  if(prog.clubPrize===st.wk) return 'claimed';
  if(st.total<st.target) return 'far';
  if(st.myM<ECON.clubs.prizeMatches) return 'need';
  return st.total>=st.target*2 ? 'ready2' : 'ready';
}
function clubNeedName(){
  if(normName(settings.name)) return true;
  toast(T('clubs.needName'),'warn'); clubClose();
  try{ if(typeof askNameIfMissing==='function') askNameIfMissing(); else if($('#btn-settings')) $('#btn-settings').click(); }catch(e){}
  return false;
}
function clubRefund(n){ if(n>0){ prog.gems=(prog.gems|0)+n; saveProg(); try{ updateXpBadge(); }catch(e){} } }

/* ----- server I/O (all bounded, all tolerant: undefined = no connection) ----- */
/* PATCH my own member node (absolute weekly counters) */
async function clubPush(){
  const c=myClub(), k=clubMyKey(); if(!c || !k || !fbOn()) return false;
  const r=await fbReq('clubs/'+c.id+'/members/'+k, 'PATCH', clubMemberBody());
  if(r===undefined){ c.dirty=true; saveProg(); return false; }
  c.dirty=false; saveProg();
  if(CLUB.data){ CLUB.data.members=CLUB.data.members||{}; CLUB.data.members[k]=Object.assign({}, CLUB.data.members[k]||{}, r && typeof r==='object' ? r : clubMemberBody()); }
  if(r && typeof r.t==='number' && typeof syncClock==='function') syncClock(r.t);
  return true;
}
/* one GET of the whole club (cached 10 min unless forced); null = no data this time */
async function clubRefresh(force){
  const c=myClub(); if(!c) return null;
  if(!fbOn()){ CLUB.offline=true; return null; }
  if(!force && CLUB.data && now()-CLUB.fetched<ECON.clubs.refreshMs) return CLUB.data;
  if(CLUB.loading) return CLUB.loading;
  CLUB.loading=(async()=>{
    const r=await fbReq('clubs/'+c.id, 'GET');
    if(r===undefined){ CLUB.offline=true; return null; }
    CLUB.offline=false;
    if(r===null || typeof r!=='object'){ delete prog.club; prog.clubPrize=null; saveProg(); CLUB.data=null; toast(T('clubs.gone'),'warn'); clubHomePill(); return null; }   // pruned/deleted
    CLUB.data=r; CLUB.fetched=now();
    if(typeof r.name==='number') c.name=r.name|0; if(r.emoji) c.emoji=String(r.emoji).slice(0,8); if(r.code && clubValidCode(r.code)) c.code=r.code;
    const st=clubWeekStats(r); c.tot=st.total; c.target=st.target; c.n=st.n; saveProg();
    if(c.dirty) clubPush();                                                                         // a counter PATCH that failed earlier
    if(c.codeDirty) fbReq('clubCodes/'+c.code, 'PUT', c.id).then(x=>{ if(x!==undefined){ delete c.codeDirty; saveProg(); } });
    if(!r.week || r.week.key!==st.wk || (r.week.goals|0)!==st.totalServer) fbReq('clubs/'+c.id+'/week', 'PUT', {key:st.wk, goals:st.totalServer});   // the cached weekly summary, only when it changed
    return r;
  })();
  try{ return await CLUB.loading; } finally{ CLUB.loading=null; }
}
/* create: 20 gems (free for admins), a preset name + an emoji, a fresh 6-char code */
async function clubCreate(nameI, emoji){
  if(CLUB.busy) return false;
  nameI=Math.max(0, Math.min(CLUB_NAMES.length-1, nameI|0)); emoji=CLUB_EMOJIS.includes(emoji) ? emoji : CLUB_NAME_EMOJI[nameI]||CLUB_EMOJIS[0];
  if(!clubNeedName()) return false;
  if(myClub()){ toast(T('clubs.already'),'warn'); return false; }
  if(!fbOn()){ toast(T('clubs.noConn'),'warn'); return false; }
  const cost=isAdmin() ? 0 : ECON.clubs.create;
  if(cost && (prog.gems|0)<cost){ toast(T('clubs.needGems', cost),'warn'); try{ sfx.lose(); }catch(e){} return false; }
  if(!(await ask(cost ? T('clubs.createQ', emoji, clubName(nameI), cost) : T('clubs.createQFree', emoji, clubName(nameI))))) return false;
  CLUB.busy=true;
  try{
    let code=null;
    for(let i=0;i<3 && !code;i++){ const cand=clubRand(6); const r=await fbReq('clubCodes/'+cand, 'GET'); if(r===undefined){ toast(T('clubs.noConn'),'warn'); return false; } if(r===null) code=cand; }
    if(!code){ toast(T('clubs.noConn'),'warn'); return false; }
    if(cost && !spendGems(cost)){ toast(T('clubs.needGems', cost),'warn'); return false; }
    const id=clubRand(8), wk=weekKey(), k=clubMyKey(), me={wk, g:0, w:0, m:0};
    const body={name:nameI, emoji, code, created:{'.sv':'timestamp'}, members:{}, week:{key:wk, goals:0}}; body.members[k]=clubMemberBody(me);
    const r1=await fbReq('clubs/'+id, 'PUT', body);
    if(r1===undefined){ clubRefund(cost); toast(T('clubs.noConn'),'warn'); return false; }
    const r2=await fbReq('clubCodes/'+code, 'PUT', id);
    prog.club={id, code, name:nameI, emoji, joined:now(), me, dirty:false, tot:0, target:clubTarget(1), n:1}; if(r2===undefined) prog.club.codeDirty=true;   // the code is re-written on the next open
    saveProg();
    CLUB.data=Object.assign({}, body, {members:Object.assign({}, body.members)}); CLUB.fetched=now(); CLUB.offline=false; CLUB.view='club';
    toast(T('clubs.created', emoji, clubName(nameI), code),'ach'); try{ sfx.win(); confetti.burst(120); }catch(e){}
    clubHomePill(); clubRender(); return true;
  }catch(e){ console.error('club create', e); return false; }
  finally{ CLUB.busy=false; }
}
/* join by code: clubCodes/<code> → id → clubs/<id> (not full) → PATCH my member node */
async function clubJoin(code){
  code=clubNormCode(code);
  if(!clubValidCode(code)){ toast(T('clubs.badCode'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
  if(CLUB.busy) return false;
  if(!clubNeedName()) return false;
  if(myClub()){ toast(T('clubs.already'),'warn'); return false; }
  if(!fbOn()){ toast(T('clubs.noConn'),'warn'); return false; }
  CLUB.busy=true;
  try{
    const id=await fbReq('clubCodes/'+code, 'GET');
    if(id===undefined){ toast(T('clubs.noConn'),'warn'); return false; }
    if(typeof id!=='string' || !/^[A-Z0-9]{4,16}$/.test(id)){ toast(T('clubs.notFound'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
    const data=await fbReq('clubs/'+id, 'GET');
    if(data===undefined){ toast(T('clubs.noConn'),'warn'); return false; }
    if(!data || typeof data!=='object'){ toast(T('clubs.notFound'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
    const ms=(data.members && typeof data.members==='object') ? data.members : {}, k=clubMyKey();
    if(Object.keys(ms).length>=ECON.clubs.max && !ms[k]){ toast(T('clubs.full', ECON.clubs.max),'warn'); try{ sfx.lose(); }catch(e){} return false; }
    const me={wk:weekKey(), g:0, w:0, m:0}, node=clubMemberBody(me);
    const r=await fbReq('clubs/'+id+'/members/'+k, 'PATCH', node);
    if(r===undefined){ toast(T('clubs.noConn'),'warn'); return false; }
    const emoji=String(data.emoji||CLUB_EMOJIS[0]).slice(0,8), nameI=data.name|0;
    prog.club={id, code, name:nameI, emoji, joined:now(), me, dirty:false}; saveProg();
    data.members=Object.assign({}, ms); data.members[k]=r && typeof r==='object' ? r : node;
    CLUB.data=data; CLUB.fetched=now(); CLUB.offline=false; CLUB.view='club';
    const st=clubWeekStats(data); prog.club.tot=st.total; prog.club.target=st.target; prog.club.n=st.n; saveProg();
    toast(T('clubs.joined', emoji, clubName(nameI)),'ach'); try{ sfx.win(); confetti.burst(120); }catch(e){}
    clubHomePill(); clubRender(); return true;
  }catch(e){ console.error('club join', e); return false; }
  finally{ CLUB.busy=false; }
}
/* leave (confirmed): my member node is deleted on the server first, so no ghost member stays behind */
async function clubLeave(){
  const c=myClub(); if(!c || CLUB.busy) return false;
  if(!(await ask(T('clubs.leaveQ'), T('clubs.leave')))) return false;
  CLUB.busy=true;
  try{
    const k=clubMyKey();
    if(fbOn() && k){ const r=await fbReq('clubs/'+c.id+'/members/'+k, 'DELETE'); if(r===undefined){ toast(T('clubs.noConn'),'warn'); return false; } }
    delete prog.club; saveProg(); CLUB.data=null; CLUB.fetched=0; CLUB.view='none';
    toast(T('clubs.left'),'warn'); clubHomePill(); clubRender(); return true;
  } finally{ CLUB.busy=false; }
}
/* the weekly prize: the club total (server) ≥ target and I played ≥5 real matches this week → once per week */
async function clubClaim(){
  const c=myClub(); if(!c || CLUB.busy) return false;
  const wk=weekKey(); if(prog.clubPrize===wk){ toast(T('clubs.claimed'),'warn'); return false; }
  CLUB.busy=true;
  try{
    const r=await clubRefresh(true);
    if(!r){ if(myClub()) toast(T('clubs.noConn'),'warn'); return false; }
    const st=clubWeekStats(r);
    if(st.totalServer<st.target){ toast(T('clubs.notYet', fmtNum(st.totalServer), fmtNum(st.target)),'warn'); try{ sfx.lose(); }catch(e){} clubRender(); return false; }
    if(st.myM<ECON.clubs.prizeMatches){ toast(T('clubs.needMatches', ECON.clubs.prizeMatches-st.myM),'warn'); try{ sfx.lose(); }catch(e){} clubRender(); return false; }
    const gold=st.totalServer>=st.target*2;
    prog.clubPrize=wk; saveProg();
    let chest=false; if(typeof giveChest==='function'){ try{ chest=!!giveChest(gold ? 'gold' : 'silver'); }catch(e){ chest=false; } }
    if(!chest) addCoins(gold ? ECON.clubs.prizeCoinsGold : ECON.clubs.prizeCoins, 'club');
    addGems(ECON.clubs.prizeGems, 'club');
    toast(T(gold ? 'clubs.prizeGold' : 'clubs.prizeSilver'),'ach'); try{ sfx.win(); confetti.burst(200); }catch(e){}
    clubRender(); return true;
  } finally{ CLUB.busy=false; }
}

/* ----- invite: the share helper of 70-social when it exists (system share sheet / WhatsApp), the code inside the text and as ?club= ----- */
function clubLink(){ const c=myClub(); const base=(typeof SOCIAL_LINK==='string' && SOCIAL_LINK) ? SOCIAL_LINK : 'https://lupulior.github.io/game-lab/'; return c ? base+'?club='+c.code : base; }
function clubInviteText(){ const c=myClub(); if(!c) return ''; return T('clubs.inviteText', c.emoji, clubName(c.name), c.code, clubLink()); }
function clubInvite(){
  const c=myClub(); if(!c) return false; try{ sfx.click(); }catch(e){}
  const text=clubInviteText(); prog.clubInvites=(prog.clubInvites|0)+1; saveProg();
  if(typeof shareText==='function') return shareText(text);
  try{ window.open('https://wa.me/?text='+encodeURIComponent(text), '_blank', 'noopener'); }catch(e){}
  return 'wa';
}
async function clubCopyCode(){
  const c=myClub(); if(!c) return false; const code=c.code; let ok=false;
  try{ if(navigator.clipboard && navigator.clipboard.writeText) ok=await navigator.clipboard.writeText(code).then(()=>true, ()=>false); }catch(e){}
  if(!ok){ try{ const ta=document.createElement('textarea'); ta.value=code; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); ok=!!document.execCommand('copy'); ta.remove(); }catch(e){} }
  toast(ok ? T('clubs.copied') : T('clubs.copyFail', code), ok ? 'ach' : 'warn'); return ok;
}

/* ----- deep link ?club=CODE: never auto-join — a question on the home screen once there is a name ----- */
function clubParseSearch(s){ try{ const p=new URLSearchParams(String(s||'')); const c=clubNormCode(p.get('club')||''); return clubValidCode(c) ? c : null; }catch(e){ return null; } }
/* 70-social may already have cleaned the URL at its load time: the navigation entry still carries the original query */
function clubInitialSearch(){ let s=location.search||''; if(!s){ try{ const e=performance.getEntriesByType('navigation')[0]; if(e && e.name){ const i=e.name.indexOf('?'); if(i>=0) s=e.name.slice(i).replace(/#.*$/,''); } }catch(e){} } return s; }
if(typeof parseDeepLinks==='function'){ const _pdl=parseDeepLinks; parseDeepLinks=function(s){ const o=_pdl.apply(this, arguments)||{}; const c=clubParseSearch(s); if(c) o.club=c; return o; }; }
async function clubPendingTick(){
  const code=CLUB.pending; if(!code || CLUB.pendingBusy) return false;
  if(!normName(settings.name) || ($('#name-modal') && $('#name-modal').classList.contains('show'))) return false;
  if(!$('#home') || !$('#home').classList.contains('active')) return false;
  CLUB.pendingBusy=true; CLUB.pending=null;
  try{
    if(myClub()){ toast(T('clubs.already'),'warn'); return false; }
    if(!(await ask(T('clubs.joinQ', code), T('clubs.join')))) return false;
    const ok=await clubJoin(code); if(ok) clubOpen(); return ok;
  }catch(e){ console.error('club link', e); return false; }
  finally{ CLUB.pendingBusy=false; }
}

/* ----- the screen (a modal inside #stage) ----- */
function clubOpen(view){
  const m=$('#club-modal'); if(!m) return false;
  CLUB.view = myClub() ? 'club' : (view==='create' || view==='join') ? view : 'none';
  try{ const ms=$('#more-sheet'); if(ms) ms.classList.remove('show'); }catch(e){}
  m.classList.add('show'); clubRender();
  if(myClub()) clubRefresh().then(()=>{ clubRender(); clubHomePill(); });
  return true;
}
function clubClose(){ CLUB.view='none'; const m=$('#club-modal'); if(m) m.classList.remove('show'); }
function clubBoxes(v){ const b=$('#club-boxes'); if(!b) return; v=String(v||''); Array.from(b.children).forEach((s,i)=>{ s.textContent=v[i]||''; s.classList.toggle('on', i===v.length); s.classList.toggle('has', !!v[i]); }); }
function clubRender(){
  const body=$('#club-body'); if(!body) return;
  const c=myClub(); const v = c ? 'club' : (CLUB.view==='create' || CLUB.view==='join') ? CLUB.view : 'none';
  const title=$('#club-title'); if(title) title.textContent = c ? c.emoji+' '+clubName(c.name) : T('clubs.title');
  const close=$('#btn-club-close'); if(close) close.textContent=T('clubs.back');
  body.dataset.view=v;
  const cost=isAdmin() ? 0 : ECON.clubs.create, createLabel=cost ? T('clubs.createCost', cost) : T('clubs.createFree');
  if(v==='none'){
    body.innerHTML=`<div class="club-hero">🏟️</div><div class="hint club-intro">${esc(T('clubs.intro'))}</div>
      <div class="club-btns"><button class="btn green" id="btn-club-create" data-act="create">${esc(createLabel)}</button><button class="btn purple" id="btn-club-join" data-act="join">${esc(T('clubs.joinBtn'))}</button></div>`;
    return;
  }
  if(v==='create'){
    const p=CLUB.pick;
    body.innerHTML=`<div class="club-sub">${esc(T('clubs.pickName'))}</div>
      <div class="club-grid">${CLUB_NAMES.map((r,i)=>`<button class="club-chip${i===p.name?' on':''}" data-name="${i}">${esc(clubName(i))}</button>`).join('')}</div>
      <div class="club-sub">${esc(T('clubs.pickEmoji'))}</div>
      <div class="club-emos">${CLUB_EMOJIS.map(e=>`<button class="club-emo${e===p.emoji?' on':''}" data-emo="${e}">${e}</button>`).join('')}</div>
      <div class="club-prev" id="club-prev">${p.emoji} ${esc(clubName(p.name))}</div>
      <div class="club-btns"><button class="btn green" id="btn-club-do-create" data-act="doCreate">${esc(createLabel)}</button><button class="btn blue small" data-act="back">${esc(T('clubs.back'))}</button></div>`;
    return;
  }
  if(v==='join'){
    body.innerHTML=`<div class="hint club-intro">${esc(T('clubs.codeHint'))}</div>
      <div class="club-boxes" id="club-boxes">${'<span></span>'.repeat(6)}</div>
      <input id="club-code-input" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC234">
      <div class="club-btns"><button class="btn green" id="btn-club-do-join" data-act="doJoin">${esc(T('clubs.join'))}</button><button class="btn blue small" data-act="back">${esc(T('clubs.back'))}</button></div>`;
    const inp=$('#club-code-input');
    inp.addEventListener('input', ()=>{ inp.value=clubNormCode(inp.value); clubBoxes(inp.value); });
    inp.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter') clubJoin(inp.value); if(e.key==='Escape') clubClose(); });
    $('#club-boxes').addEventListener('click', ()=>{ try{ inp.focus(); }catch(e){} });
    clubBoxes(''); setTimeout(()=>{ try{ inp.focus(); }catch(e){} }, 60);
    return;
  }
  // ----- the club itself
  const st=clubWeekStats(CLUB.data), days=clubDaysLeft(), pct=Math.max(0, Math.min(100, Math.round(st.total/st.target*100))), prize=clubPrizeState(st);
  const status = CLUB.offline ? (CLUB.data ? T('clubs.offlineCached') : T('clubs.noConn')) : '';
  const rows=st.list.map(x=>`<div class="club-row${x.me?' me':''}"><span class="club-nm">${esc(x.name)}${x.me ? ' <small>('+esc(T('clubs.me'))+')</small>' : ''}</span><span class="club-lv">Lv ${x.lv}</span><span class="club-st">${esc(T('clubs.memberStats', x.g, x.w, x.m))}</span></div>`).join('');
  const claimLabel = prize==='claimed' ? T('clubs.claimed') : prize==='ready2' ? T('clubs.claimGold') : prize==='ready' ? T('clubs.claim') : prize==='need' ? T('clubs.claimNeed', Math.max(1, ECON.clubs.prizeMatches-st.myM)) : T('clubs.claimFar');
  body.innerHTML=`<div class="club-top"><button class="club-code" id="club-code" data-act="copy" title="${esc(T('clubs.copy'))}">${esc(T('clubs.code', c.code))} 📋</button><span class="club-days" id="club-days">${esc(days<=1 ? T('clubs.lastDay') : T('clubs.daysLeft', days))}</span><button class="btn blue small club-refresh" id="btn-club-refresh" data-act="refresh" title="🔄">🔄</button></div>
    <div class="club-progress"><div class="club-bar${st.total>=st.target ? ' done' : ''}" id="club-bar"><i style="width:${pct}%"></i></div><div class="club-ptext" id="club-progress-text">${esc(T('clubs.progress', fmtNum(st.total), fmtNum(st.target)))}</div></div>
    <div class="club-prize" id="club-prize-line">${esc(T('clubs.prizeLine', ECON.clubs.prizeMatches))}</div>
    ${status ? `<div class="club-status" id="club-status">${esc(status)}</div>` : ''}
    <div class="club-sub">${esc(T('clubs.members', st.n, ECON.clubs.max))}</div>
    <div class="club-members" id="club-members">${rows}</div>
    <div class="club-btns"><button class="btn ${prize==='ready' || prize==='ready2' ? 'green pulse' : 'yellow off'}" id="btn-club-claim" data-act="claim">${esc(claimLabel)}</button><button class="btn purple" id="btn-club-invite" data-act="invite">${esc(T('clubs.invite'))}</button><button class="btn red small" id="btn-club-leave" data-act="leave">${esc(T('clubs.leave'))}</button></div>`;
}
/* the home pill: "🏟️ האריות 83/150" (or just "🏟️ מועדון"), a third small pill in #home-trophy — placed ABOVE the trophy pill so the corner stays the trophy's */
function clubHomePill(){
  const home=$('#home'); if(!home) return null;
  let p=$('#home-club');
  if(!p){ p=document.createElement('button'); p.id='home-club'; p.className='pill club'; p.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} clubOpen(); }); }
  const host=$('#home-trophy');
  if(host){ if(p.parentNode!==host || host.firstChild!==p) host.insertBefore(p, host.firstChild); p.classList.remove('free'); }
  else if(!p.parentNode){ p.classList.add('free'); home.appendChild(p); }
  const c=myClub();
  if(c){ const st=CLUB.data ? clubWeekStats(CLUB.data) : null; const tot=st ? st.total : Math.max(0, c.tot|0), target=st ? st.target : (c.target || clubTarget(c.n||1)); p.textContent=T('clubs.pill', c.emoji, clubName(c.name), fmtNum(tot), fmtNum(target)); p.classList.toggle('done', tot>=target); }
  else { p.textContent=T('clubs.pillNone'); p.classList.remove('done'); }
  if(typeof fitText==='function') fitText(p, 11);
  return p;
}

/* ----- wiring ----- */
(function clubBuildUI(){
  const grid=$('#more-grid');
  if(grid && !$('#btn-club')){ const b=document.createElement('button'); b.className='btn blue'; b.id='btn-club'; b.textContent=T('clubs.btn'); b.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} clubOpen(); }); grid.appendChild(b); }
  const close=$('#btn-club-close'); if(close) close.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} clubClose(); });
  const m=$('#club-modal'); if(m) m.addEventListener('click', e=>{ if(e.target===m) clubClose(); });
  const body=$('#club-body'); if(!body) return;
  body.addEventListener('click', e=>{
    const nb=e.target.closest('[data-name]'); if(nb){ try{ sfx.click(); }catch(x){} CLUB.pick.name=+nb.dataset.name|0; if(!CLUB.pick.emojiSet) CLUB.pick.emoji=CLUB_NAME_EMOJI[CLUB.pick.name]||CLUB_EMOJIS[0]; clubRender(); return; }
    const eb=e.target.closest('[data-emo]'); if(eb){ try{ sfx.click(); }catch(x){} CLUB.pick.emoji=eb.dataset.emo; CLUB.pick.emojiSet=true; clubRender(); return; }
    const b=e.target.closest('[data-act]'); if(!b) return; try{ sfx.click(); }catch(x){}
    switch(b.dataset.act){
      case 'create': CLUB.view='create'; clubRender(); break;
      case 'join': CLUB.view='join'; clubRender(); break;
      case 'back': CLUB.view='none'; clubRender(); break;
      case 'doCreate': clubCreate(CLUB.pick.name, CLUB.pick.emoji); break;
      case 'doJoin': clubJoin(($('#club-code-input')||{}).value); break;
      case 'copy': clubCopyCode(); break;
      case 'refresh': clubRefresh(true).then(()=>{ clubRender(); clubHomePill(); }); break;
      case 'claim': clubClaim(); break;
      case 'invite': clubInvite(); break;
      case 'leave': clubLeave(); break;
    }
  });
})();
/* real matches feed my member node (training never counts); the PATCH goes out right after the result card */
Hooks.on('matchEnd', info=>{
  const c=myClub(); if(!c || !info || info.training) return;
  const me=clubMe(), goals=Math.max(0, (info.score && info.score.me)|0);
  me.g+=goals; if(info.outcome==='win') me.w++; me.m++; c.tot=(c.tot|0)+goals; c.dirty=true; saveProg();
  clubHomePill(); setTimeout(()=>{ clubPush().then(()=>clubHomePill()); }, 120);
});
Hooks.on('heartbeat', body=>{ const c=myClub(); body.club = c ? c.id : null; });
Hooks.on('home', ()=>setTimeout(()=>{ const g=$('#more-grid'), b=$('#btn-club'); if(g && b && g.lastElementChild!==b) g.appendChild(b); clubHomePill(); }, 0));
Hooks.on('screen', id=>{ if(id==='home'){ setTimeout(clubHomePill, 60); setTimeout(clubPendingTick, 500); } });
if(typeof setLang==='function'){ const _csl=setLang; setLang=function(){ const r=_csl.apply(this, arguments); try{ clubHomePill(); if($('#club-modal') && $('#club-modal').classList.contains('show')) clubRender(); }catch(e){} return r; }; }
{ const _csn=submitName; submitName=function(){ const r=_csn.apply(this, arguments); if(normName(settings.name)) setTimeout(clubPendingTick, 400); return r; }; }
CLUB.pending=clubParseSearch(clubInitialSearch());
applyLang();
