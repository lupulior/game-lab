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
   THE OFFICIAL CLUB (run by the admin, everyone is in automatically — in ADDITION to the personal club):
     official/club   = {id, name:<free text ≤24>, emoji, msg:<free text ≤300>, by:<admin name>, auto:true|false, code, updated}
     clubs/<id>      = a normal club node with name:<string> and official:true (members/week as usual)
   Only the admin writes official/* (client-side isAdmin() checks; the rules are open today — see PLAN Appendix A).
   name and msg are the only free text in the game: both are rendered through esc() only.
   Local: prog.official   = the sanitised official/club node (+ tot/target/n cache for the home pill)
          prog.officialId = the official club I am a member of, prog.officialMe = {wk,g,w,m,dirty?} my weekly counters there
          prog.officialSeen = when official/club was last fetched from load/home (at most once an hour)
          prog.clubPrizeOf = {<clubId>: weekKey} the weekly prize, per club (migrated from the old prog.clubPrize)
   Reads: load/home → one GET of official/club per hour (+ one PATCH of my member node the first time);
          modal open → one GET of official/club + one GET of clubs/<id> (cached 10 min). Target = 10 × members, min 50.
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
const OFFICIAL_EMOJIS=['📣'].concat(CLUB_EMOJIS);                 // the admin's emoji picker for the official club
Object.assign(ECON, { clubs:{ create:30, max:20, goalPer:15, goalMin:30, prizeMatches:5, prizeGems:10, prizeCoins:300, prizeCoinsGold:600, refreshMs:10*60000,
  oGoalPer:10, oGoalMin:50, oTop:20, oSeenMs:60*60000, oRetryMs:5*60000, nameMax:24, msgMax:300 } });   // o* = the official club

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
 'clubs.blocked':['השרת חוסם את המועדונים 🔒 צריך לעדכן את חוקי Firebase (ראו PARENTS.md)','The server blocks clubs 🔒 the Firebase rules need an update (see PARENTS.md)','الخادم يحظر الأندية 🔒 يجب تحديث قواعد Firebase (انظر PARENTS.md)','Сервер блокирует клубы 🔒 нужно обновить правила Firebase (см. PARENTS.md)'],
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
 /* the official club */
 'clubs.tabMine':['🏟️ המועדון שלי','🏟️ My club','🏟️ ناديي','🏟️ Мой клуб'],
 'clubs.tabAdmin':['⚙️ המועדון הרשמי','⚙️ The official club','⚙️ النادي الرسمي','⚙️ Официальный клуб'],
 'clubs.oTitle':['📣 המועדון הרשמי','📣 The official club','📣 النادي الرسمي','📣 Официальный клуб'],
 'clubs.oBoardFrom':['📣 הודעה מ-{0}','📣 A message from {0}','📣 رسالة من {0}','📣 Сообщение от {0}'],
 'clubs.oBoard':['📣 הודעה','📣 Message','📣 رسالة','📣 Сообщение'],
 'clubs.oNoMsg':['עוד אין הודעה 🙂','No message yet 🙂','لا توجد رسالة بعد 🙂','Сообщения пока нет 🙂'],
 'clubs.oMembers':['👥 חברים ({0})','👥 Members ({0})','👥 الأعضاء ({0})','👥 Участники ({0})'],
 'clubs.oMore':['ועוד {0} חברים','and {0} more members','و{0} أعضاء آخرين','и ещё {0} участников'],
 'clubs.oIntro':['כולם במועדון הרשמי! לחצו כדי להצטרף','Everyone is in the official club! Tap to join','الجميع في النادي الرسمي! اضغطوا للانضمام','Все в официальном клубе! Нажми, чтобы вступить'],
 'clubs.oIntroCode':['מצטרפים למועדון הרשמי עם קוד מהאדמין','Join the official club with a code from the admin','انضموا إلى النادي الرسمي برمز من المشرف','В официальный клуб — по коду от админа'],
 'clubs.oJoin':['🚀 הצטרף','🚀 Join','🚀 انضم','🚀 Войти'],
 'clubs.oNoLeave':['כולם במועדון הרשמי — אי אפשר לעזוב','Everyone is in the official club — no leaving','الجميع في النادي الرسمي — لا يمكن المغادرة','Все в официальном клубе — выйти нельзя'],
 'clubs.oAlready':['אתם כבר במועדון הרשמי','You are already in the official club','أنتم بالفعل في النادي الرسمي','Ты уже в официальном клубе'],
 'clubs.oHint':['המועדון של כולם: שם חופשי, הודעה לכולם, וכולם מצטרפים אוטומטית','The club of everyone: a free name, a message to all, and everyone joins automatically','نادي الجميع: اسم حر، رسالة للجميع، والجميع ينضمون تلقائيًا','Клуб для всех: свободное название, сообщение всем, и все вступают автоматически'],
 'clubs.oName':['שם המועדון (עד 24 תווים)','Club name (up to 24 characters)','اسم النادي (حتى 24 حرفًا)','Название клуба (до 24 знаков)'],
 'clubs.oNamePh':['שם המועדון','Club name','اسم النادي','Название клуба'],
 'clubs.oNameShort':['השם צריך לפחות 2 תווים','The name needs at least 2 characters','الاسم يحتاج إلى حرفين على الأقل','В названии нужно минимум 2 знака'],
 'clubs.oCreate':['➕ צור את המועדון הרשמי','➕ Create the official club','➕ أنشئ النادي الرسمي','➕ Создать официальный клуб'],
 'clubs.oCreateQ':['ליצור את המועדון הרשמי {0} {1}? כולם יצטרפו אליו אוטומטית','Create the official club {0} {1}? Everyone joins it automatically','إنشاء النادي الرسمي {0} {1}؟ سينضم الجميع تلقائيًا','Создать официальный клуб {0} {1}? Все вступят автоматически'],
 'clubs.oCreated':['🎉 המועדון הרשמי {0} {1} נוצר! הקוד: {2}','🎉 The official club {0} {1} is ready! Code: {2}','🎉 تم إنشاء النادي الرسمي {0} {1}! الرمز: {2}','🎉 Официальный клуб {0} {1} создан! Код: {2}'],
 'clubs.oSaveName':['💾 שמור שם','💾 Save name','💾 احفظ الاسم','💾 Сохранить название'],
 'clubs.oSaved':['✅ נשמר','✅ Saved','✅ تم الحفظ','✅ Сохранено'],
 'clubs.oMsgLabel':['הודעה לכולם (עד 300 תווים)','A message to everyone (up to 300 characters)','رسالة للجميع (حتى 300 حرف)','Сообщение всем (до 300 знаков)'],
 'clubs.oMsgPh':['כתבו הודעה לכל השחקנים…','Write a message to all players…','اكتبوا رسالة لكل اللاعبين…','Напиши сообщение всем игрокам…'],
 'clubs.oSaveMsg':['📣 שמור הודעה','📣 Save message','📣 احفظ الرسالة','📣 Сохранить сообщение'],
 'clubs.oAuto':['כולם במועדון אוטומטית','Everyone joins automatically','الجميع في النادي تلقائيًا','Все вступают автоматически'],
 'clubs.oAutoOn':['✅ כולם מצטרפים אוטומטית','✅ Everyone joins automatically','✅ الجميع ينضمون تلقائيًا','✅ Все вступают автоматически'],
 'clubs.oAutoOff':['🚪 מצטרפים עם קוד בלבד — אפשר לעזוב','🚪 Join by code only — leaving is allowed','🚪 الانضمام بالرمز فقط — يمكن المغادرة','🚪 Вход только по коду — выйти можно'],
 'clubs.oAdminOnly':['רק האדמין יכול לעשות את זה','Only the admin can do that','المشرف فقط يستطيع ذلك','Это может только админ'],
});
STATIC_ADD({'#club-title':'clubs.title', '#btn-club-close':'clubs.back', '#btn-club':'clubs.btn'});

const CLUB={ data:null, fetched:0, offline:false, busy:false, loading:null, view:'none', pick:{name:0, emoji:CLUB_NAME_EMOJI[0], emojiSet:false}, pending:null, pendingBusy:false,
  tab:'mine', oview:'main', opick:'📣', odata:null, ofetched:0, ooffline:false, oloading:null, osync:null, ogone:null };   // o* = the official club (its own cache, same 10-min rule)

/* ----- small helpers ----- */
function clubName(i, l){ const row=CLUB_NAMES[i|0]||CLUB_NAMES[0]; return row[LI[l||lang]]||row[0]; }
/* the name to show: preset index (personal clubs) or the admin's free text (official club) — free text goes through esc() at render time */
function clubDisplay(c){ if(!c) return ''; return typeof c.name==='number' ? clubName(c.name) : String(c.name||''); }
/* the weekly prize is per club: prog.clubPrizeOf={<clubId>:weekKey}; the old single prog.clubPrize (the personal club) migrates once */
function clubPrizeOf(){
  if(!prog.clubPrizeOf || typeof prog.clubPrizeOf!=='object') prog.clubPrizeOf={};
  if('clubPrize' in prog){ const c=myClub(); if(prog.clubPrize && c && !prog.clubPrizeOf[c.id]) prog.clubPrizeOf[c.id]=prog.clubPrize; delete prog.clubPrize; saveProg(); }
  return prog.clubPrizeOf;
}
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
/* the week as the club sees it: members whose wk is the current week count; my own local counters may be ahead of the server (a PATCH that failed) → the better of the two.
   o = {me, member, target} picks the club: the personal club by default, the official club through officialStats() */
function clubWeekStats(data, o){
  o=o||{}; const me=o.me||clubMe(), member=('member' in o) ? !!o.member : !!myClub(), targetOf=typeof o.target==='function' ? o.target : clubTarget;
  const wk=weekKey(), ms=(data && data.members && typeof data.members==='object') ? data.members : {}, my=clubMyKey();
  const list=Object.keys(ms).map(k=>{ const m=ms[k]||{}; const cur=m.wk===wk; return {key:k, name:String(m.name||'?').slice(0,14), lv:m.lv|0, g:cur?m.g|0:0, w:cur?m.w|0:0, m:cur?m.m|0:0, me:k===my}; });
  const totalServer=list.reduce((s,x)=>s+x.g, 0);
  let mine=list.find(x=>x.me);
  if(!mine && my && member){ mine={key:my, name:normName(settings.name), lv:myLevel(), g:0, w:0, m:0, me:true}; list.push(mine); }
  if(mine && me.wk===wk){ mine.g=Math.max(mine.g, me.g|0); mine.w=Math.max(mine.w, me.w|0); mine.m=Math.max(mine.m, me.m|0); }
  list.sort((a,b)=>b.g-a.g || b.w-a.w || a.name.localeCompare(b.name));
  const n=Math.max(1, list.length), total=list.reduce((s,x)=>s+x.g, 0);
  return {wk, n, total, totalServer, target:targetOf(n), list, myM: mine ? mine.m : 0};
}
function clubPrizeState(st, id){
  if(clubPrizeOf()[id]===st.wk) return 'claimed';
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
    if(r===null || typeof r!=='object'){ delete prog.club; delete clubPrizeOf()[c.id]; saveProg(); CLUB.data=null; toast(T('clubs.gone'),'warn'); clubHomePill(); return null; }   // pruned/deleted
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
  if(!fbOn()){ toast(clubNoConnText(),'warn'); return false; }
  const cost=isAdmin() ? 0 : ECON.clubs.create;
  if(cost && (prog.gems|0)<cost){ toast(T('clubs.needGems', cost),'warn'); try{ sfx.lose(); }catch(e){} return false; }
  if(!(await ask(cost ? T('clubs.createQ', emoji, clubName(nameI), cost) : T('clubs.createQFree', emoji, clubName(nameI))))) return false;
  CLUB.busy=true;
  try{
    let code=null;
    for(let i=0;i<3 && !code;i++){ const cand=clubRand(6); const r=await fbReq('clubCodes/'+cand, 'GET'); if(r===undefined){ toast(clubNoConnText(),'warn'); return false; } if(r===null) code=cand; }
    if(!code){ toast(clubNoConnText(),'warn'); return false; }
    if(cost && !spendGems(cost)){ toast(T('clubs.needGems', cost),'warn'); return false; }
    const id=clubRand(8), wk=weekKey(), k=clubMyKey(), me={wk, g:0, w:0, m:0};
    const body={name:nameI, emoji, code, created:{'.sv':'timestamp'}, members:{}, week:{key:wk, goals:0}}; body.members[k]=clubMemberBody(me);
    const r1=await fbReq('clubs/'+id, 'PUT', body);
    if(r1===undefined){ clubRefund(cost); toast(clubNoConnText(),'warn'); return false; }
    const r2=await fbReq('clubCodes/'+code, 'PUT', id);
    prog.club={id, code, name:nameI, emoji, joined:now(), me, dirty:false, tot:0, target:clubTarget(1), n:1}; if(r2===undefined) prog.club.codeDirty=true;   // the code is re-written on the next open
    saveProg();
    CLUB.data=Object.assign({}, body, {members:Object.assign({}, body.members)}); CLUB.fetched=now(); CLUB.offline=false; CLUB.view='club';
    toast(T('clubs.created', emoji, clubName(nameI), code),'ach'); try{ sfx.win(); confetti.burst(120); }catch(e){}
    clubHomePill(); clubRender(); return true;
  }catch(e){ console.error('club create', e); return false; }
  finally{ CLUB.busy=false; }
}
/* join by code: clubCodes/<code> → id → clubs/<id> (not full) → PATCH my member node.
   The official club's code (official:true) joins the official club IN ADDITION to the personal one (a rejoin after the admin turned auto off) */
async function clubJoin(code){
  code=clubNormCode(code);
  if(!clubValidCode(code)){ toast(T('clubs.badCode'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
  if(CLUB.busy) return false;
  if(!clubNeedName()) return false;
  const o=officialInfo();
  if(myClub() && !(o && o.code===code)){ toast(T('clubs.already'),'warn'); return false; }
  if(!fbOn()){ toast(clubNoConnText(),'warn'); return false; }
  CLUB.busy=true;
  try{
    const id=await fbReq('clubCodes/'+code, 'GET');
    if(id===undefined){ toast(clubNoConnText(),'warn'); return false; }
    if(typeof id!=='string' || !/^[A-Z0-9]{4,16}$/.test(id)){ toast(T('clubs.notFound'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
    const data=await fbReq('clubs/'+id, 'GET');
    if(data===undefined){ toast(clubNoConnText(),'warn'); return false; }
    if(!data || typeof data!=='object'){ toast(T('clubs.notFound'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
    if(data.official===true) return await officialJoinWith(id, code, data);
    if(myClub()){ toast(T('clubs.already'),'warn'); return false; }
    const ms=(data.members && typeof data.members==='object') ? data.members : {}, k=clubMyKey();
    if(Object.keys(ms).length>=ECON.clubs.max && !ms[k]){ toast(T('clubs.full', ECON.clubs.max),'warn'); try{ sfx.lose(); }catch(e){} return false; }
    const me={wk:weekKey(), g:0, w:0, m:0}, node=clubMemberBody(me);
    const r=await fbReq('clubs/'+id+'/members/'+k, 'PATCH', node);
    if(r===undefined){ toast(clubNoConnText(),'warn'); return false; }
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
    if(fbOn() && k){ const r=await fbReq('clubs/'+c.id+'/members/'+k, 'DELETE'); if(r===undefined){ toast(clubNoConnText(),'warn'); return false; } }
    delete prog.club; saveProg(); CLUB.data=null; CLUB.fetched=0; CLUB.view='none';
    toast(T('clubs.left'),'warn'); clubHomePill(); clubRender(); return true;
  } finally{ CLUB.busy=false; }
}
/* the weekly prize: the club total (server) ≥ target and I played ≥5 real matches this week → once per week, per club.
   ctx = {id, refresh(force), stats(data), still()} — the personal club (clubClaim) or the official club (officialClaim) */
async function clubClaimFor(ctx){
  const id=ctx && ctx.id; if(!id || CLUB.busy) return false;
  const wk=weekKey(), po=clubPrizeOf(); if(po[id]===wk){ toast(T('clubs.claimed'),'warn'); return false; }
  CLUB.busy=true;
  try{
    const r=await ctx.refresh(true);
    if(!r){ if(ctx.still()) toast(clubNoConnText(),'warn'); return false; }
    const st=ctx.stats(r);
    if(st.totalServer<st.target){ toast(T('clubs.notYet', fmtNum(st.totalServer), fmtNum(st.target)),'warn'); try{ sfx.lose(); }catch(e){} clubRender(); return false; }
    if(st.myM<ECON.clubs.prizeMatches){ toast(T('clubs.needMatches', ECON.clubs.prizeMatches-st.myM),'warn'); try{ sfx.lose(); }catch(e){} clubRender(); return false; }
    const gold=st.totalServer>=st.target*2;
    po[id]=wk; saveProg();
    let chest=false; if(typeof giveChest==='function'){ try{ chest=!!giveChest(gold ? 'gold' : 'silver'); }catch(e){ chest=false; } }
    if(!chest) addCoins(gold ? ECON.clubs.prizeCoinsGold : ECON.clubs.prizeCoins, 'club');
    addGems(ECON.clubs.prizeGems, 'club');
    toast(T(gold ? 'clubs.prizeGold' : 'clubs.prizeSilver'),'ach'); try{ sfx.win(); confetti.burst(200); }catch(e){}
    clubRender(); return true;
  } finally{ CLUB.busy=false; }
}
function clubClaim(){ const c=myClub(); if(!c) return Promise.resolve(false); return clubClaimFor({id:c.id, refresh:clubRefresh, stats:clubWeekStats, still:()=>!!myClub()}); }
function officialClaim(){ const id=officialId(); if(!id) return Promise.resolve(false); return clubClaimFor({id, refresh:officialRefresh, stats:officialStats, still:()=>!!officialId()}); }

/* ----- invite: the share helper of 70-social when it exists (system share sheet / WhatsApp), the code inside the text and as ?club= ----- */
function clubLink(c){ c=c||myClub(); const base=(typeof SOCIAL_LINK==='string' && SOCIAL_LINK) ? SOCIAL_LINK : 'https://lupulior.github.io/game-lab/'; return c && c.code ? base+'?club='+c.code : base; }
function clubInviteText(c){ c=c||myClub(); if(!c || !c.code) return ''; return T('clubs.inviteText', c.emoji, clubDisplay(c), c.code, clubLink(c)); }
function clubInviteFor(c){
  if(!c || !c.code) return false; try{ sfx.click(); }catch(e){}
  const text=clubInviteText(c); prog.clubInvites=(prog.clubInvites|0)+1; saveProg();
  if(typeof shareText==='function') return shareText(text);
  try{ window.open('https://wa.me/?text='+encodeURIComponent(text), '_blank', 'noopener'); }catch(e){}
  return 'wa';
}
function clubInvite(){ return clubInviteFor(myClub()); }
function officialInvite(){ return officialId() ? clubInviteFor(officialInfo()) : false; }
async function clubCopyCode(code){
  if(code===undefined){ const c=myClub(); if(!c) return false; code=c.code; } if(!clubValidCode(code)) return false; let ok=false;
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

/* =====================================================================================================
   THE OFFICIAL CLUB — run by the admin, everyone is a member automatically (in addition to the personal club)
   ===================================================================================================== */
function officialInfo(){ const o=prog.official; return (o && typeof o==='object' && typeof o.id==='string' && o.id) ? o : null; }
function officialId(){ return (typeof prog.officialId==='string' && /^[A-Z0-9]{4,16}$/.test(prog.officialId)) ? prog.officialId : ''; }
function officialTarget(n){ return Math.max(ECON.clubs.oGoalMin, ECON.clubs.oGoalPer*Math.max(1, n|0)); }
/* the only free text in the game: control characters out, spaces collapsed, hard length caps (rendered through esc() only) */
function officialNormName(s){ return String(s||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0, ECON.clubs.nameMax).trim(); }
function officialNormMsg(s){ return String(s||'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,' ').replace(/[^\S\n]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0, ECON.clubs.msgMax); }
/* the official/club node as the client trusts it (null = no official club) */
function officialSan(r){
  if(!r || typeof r!=='object' || typeof r.id!=='string' || !/^[A-Z0-9]{4,16}$/.test(r.id)) return null;
  return { id:r.id, name:officialNormName(r.name)||'⭐', emoji:String(r.emoji||'📣').slice(0,8), msg:officialNormMsg(r.msg), by:normName(String(r.by||'')), auto:r.auto===true, code:clubValidCode(r.code) ? r.code : '', updated:+r.updated||0 };
}
/* my weekly counters in the official club (restart with the server week); a throw-away object while I am not a member */
function officialMe(){ const wk=weekKey(); if(!officialId()) return {wk, g:0, w:0, m:0}; let m=prog.officialMe; if(!m || typeof m!=='object' || m.wk!==wk) m=prog.officialMe={wk, g:0, w:0, m:0}; return m; }
function officialStats(data){ return clubWeekStats(data, {me:officialMe(), member:!!officialId(), target:officialTarget}); }
/* one GET of official/club → prog.official (null = none, undefined = no connection) */
async function officialGet(){
  if(!fbOn()) return null;
  const r=await fbReq('official/club', 'GET');
  if(r===undefined){ CLUB.ooffline=true; return undefined; }
  CLUB.ooffline=false;
  const o=officialSan(r);
  if(!o){ if(prog.official || prog.officialId){ delete prog.official; delete prog.officialId; delete prog.officialMe; CLUB.odata=null; CLUB.ofetched=0; saveProg(); clubHomePill(); } return null; }
  const prev=(prog.official && prog.official.id===o.id) ? prog.official : {};
  prog.official=Object.assign({}, o, {tot:prev.tot|0, target:prev.target|0, n:prev.n|0}); if(prev.codeDirty) prog.official.codeDirty=true;
  if(prog.officialId && prog.officialId!==o.id){ delete prog.officialId; delete prog.officialMe; CLUB.odata=null; CLUB.ofetched=0; }   // the admin made a new official club: the old membership is dropped
  saveProg(); return prog.official;
}
/* make sure my member node exists (auto → everyone; loud → the player tapped "join"); a player without a name is simply not added */
async function officialEnsure(o, loud){
  o=o||officialInfo(); if(!o || !o.id) return false;
  if(officialId()===o.id) return true;
  if(!o.auto && !loud) return false;
  if(CLUB.ogone===o.id) return false;                                                            // clubs/<id> vanished this session: do not recreate a stub
  const k=clubMyKey(); if(!k){ if(loud) clubNeedName(); return false; }
  if(!fbOn()){ if(loud) toast(clubNoConnText(),'warn'); return false; }
  const me={wk:weekKey(), g:0, w:0, m:0}, node=clubMemberBody(me);
  const r=await fbReq('clubs/'+o.id+'/members/'+k, 'PATCH', node);
  if(r===undefined){ if(loud) toast(clubNoConnText(),'warn'); return false; }
  prog.officialId=o.id; prog.officialMe=me; saveProg();
  if(CLUB.odata){ CLUB.odata.members=CLUB.odata.members||{}; CLUB.odata.members[k]=r && typeof r==='object' ? r : node; }
  if(loud){ toast(T('clubs.joined', o.emoji, o.name),'ach'); try{ sfx.win(); confetti.burst(120); }catch(e){} }
  clubHomePill(); return true;
}
/* load/home: at most once an hour (prog.officialSeen) — one GET, plus the member PATCH the first time; force = the modal / tests */
async function officialSync(force){
  if(!fbOn()) return false;
  if(!force && now()-(+prog.officialSeen||0)<ECON.clubs.oSeenMs) return false;
  if(CLUB.osync) return CLUB.osync;
  CLUB.osync=(async()=>{
    prog.officialSeen=now(); saveProg();
    const o=await officialGet();
    if(o===undefined){ prog.officialSeen=now()-ECON.clubs.oSeenMs+ECON.clubs.oRetryMs; saveProg(); return false; }   // no connection: try again in 5 minutes
    if(o && o.auto) await officialEnsure(o);
    clubHomePill(); return !!o;
  })();
  try{ return await CLUB.osync; } finally{ CLUB.osync=null; }
}
/* the modal: one GET of official/club, the auto-join when needed, then the club node (cached 10 min) */
async function officialOpenSync(){
  if(!fbOn()){ CLUB.ooffline=true; return false; }
  const o=await officialGet(); if(o===undefined) return false;
  if(o && o.auto) await officialEnsure(o);
  if(officialId()) await officialRefresh();
  return !!o;
}
/* one GET of clubs/<officialId> (cached 10 min unless forced); null = no data this time */
async function officialRefresh(force){
  const oid=officialId(); if(!oid) return null;
  if(!fbOn()){ CLUB.ooffline=true; return null; }
  if(!force && CLUB.odata && now()-CLUB.ofetched<ECON.clubs.refreshMs) return CLUB.odata;
  if(CLUB.oloading) return CLUB.oloading;
  CLUB.oloading=(async()=>{
    const r=await fbReq('clubs/'+oid, 'GET');
    if(r===undefined){ CLUB.ooffline=true; return null; }
    CLUB.ooffline=false;
    if(r===null || typeof r!=='object'){ delete prog.officialId; delete prog.officialMe; delete clubPrizeOf()[oid]; saveProg(); CLUB.odata=null; CLUB.ofetched=0; CLUB.ogone=oid; clubHomePill(); return null; }   // pruned/deleted
    CLUB.odata=r; CLUB.ofetched=now();
    const o=officialInfo(), mine=o && o.id===oid;
    if(mine){ if(typeof r.name==='string' && officialNormName(r.name)) o.name=officialNormName(r.name); if(r.emoji) o.emoji=String(r.emoji).slice(0,8); if(clubValidCode(r.code)) o.code=r.code; }
    const st=officialStats(r); if(mine){ o.tot=st.total; o.target=st.target; o.n=st.n; } saveProg();
    const me=officialMe(); if(me.dirty) officialPush();                                                // a counter PATCH that failed earlier
    if(mine && o.codeDirty && o.code) fbReq('clubCodes/'+o.code, 'PUT', oid).then(x=>{ if(x!==undefined){ delete o.codeDirty; saveProg(); } });
    if(!r.week || r.week.key!==st.wk || (r.week.goals|0)!==st.totalServer) fbReq('clubs/'+oid+'/week', 'PUT', {key:st.wk, goals:st.totalServer});
    return r;
  })();
  try{ return await CLUB.oloading; } finally{ CLUB.oloading=null; }
}
/* PATCH my member node in the official club (absolute weekly counters) */
async function officialPush(){
  const oid=officialId(), k=clubMyKey(); if(!oid || !k || !fbOn()) return false;
  const me=officialMe();
  const r=await fbReq('clubs/'+oid+'/members/'+k, 'PATCH', clubMemberBody(me));
  if(r===undefined){ me.dirty=true; saveProg(); return false; }
  delete me.dirty; saveProg();
  if(CLUB.odata){ CLUB.odata.members=CLUB.odata.members||{}; CLUB.odata.members[k]=Object.assign({}, CLUB.odata.members[k]||{}, r && typeof r==='object' ? r : clubMemberBody(me)); }
  return true;
}
/* the player taps "join" on the official tab (auto on, not added yet — e.g. the name came later) */
async function officialJoinNow(){
  const o=officialInfo(); if(!o || CLUB.busy) return false;
  if(!clubNeedName()) return false;
  CLUB.busy=true; try{ const ok=await officialEnsure(o, true); if(ok){ CLUB.tab='official'; CLUB.oview='main'; await officialRefresh(); clubRender(); } return ok; } finally{ CLUB.busy=false; }
}
/* joined by its code (clubJoin found official:true) — membership in ADDITION to the personal club, no member cap */
async function officialJoinWith(id, code, data){
  if(officialId()===id){ toast(T('clubs.oAlready'),'warn'); return false; }
  const k=clubMyKey(), me={wk:weekKey(), g:0, w:0, m:0}, node=clubMemberBody(me);
  const r=await fbReq('clubs/'+id+'/members/'+k, 'PATCH', node);
  if(r===undefined){ toast(clubNoConnText(),'warn'); return false; }
  let o=officialInfo();
  if(!o || o.id!==id){ o=officialSan({id, name:data.name, emoji:data.emoji, code, auto:false}); prog.official=Object.assign(o, {tot:0, target:0, n:0}); officialGet(); }   // the board arrives with the next GET
  prog.officialId=id; prog.officialMe=me; saveProg();
  data.members=Object.assign({}, data.members && typeof data.members==='object' ? data.members : {}); data.members[k]=r && typeof r==='object' ? r : node;
  CLUB.odata=data; CLUB.ofetched=now(); CLUB.ooffline=false; CLUB.ogone=null; CLUB.tab='official'; CLUB.oview='main';
  const st=officialStats(data); o.tot=st.total; o.target=st.target; o.n=st.n; saveProg();
  toast(T('clubs.joined', o.emoji, o.name),'ach'); try{ sfx.win(); confetti.burst(120); }catch(e){}
  clubHomePill(); clubRender(); return true;
}
/* leave: only while auto is off (the admin decides); my node is deleted on the server first */
async function officialLeave(){
  const o=officialInfo(), oid=officialId(); if(!oid || CLUB.busy) return false;
  if(o && o.id===oid && o.auto){ toast(T('clubs.oNoLeave'),'warn'); return false; }
  if(!(await ask(T('clubs.leaveQ'), T('clubs.leave')))) return false;
  CLUB.busy=true;
  try{
    const k=clubMyKey();
    if(fbOn() && k){ const r=await fbReq('clubs/'+oid+'/members/'+k, 'DELETE'); if(r===undefined){ toast(clubNoConnText(),'warn'); return false; } }
    delete prog.officialId; delete prog.officialMe; saveProg(); CLUB.odata=null; CLUB.ofetched=0; CLUB.oview='main';
    toast(T('clubs.left'),'warn'); clubHomePill(); clubRender(); return true;
  } finally{ CLUB.busy=false; }
}
/* ----- admin writes (client-side gate: isAdmin(); the server rules are open today) ----- */
function officialAdminOnly(){ if(isAdmin()) return true; toast(T('clubs.oAdminOnly'),'warn'); return false; }
/* create: a free-text name (≤24) + an emoji; clubs/<id> like any club with official:true, then official/club points at it; free (admin) */
async function officialCreate(name, emoji){
  if(!officialAdminOnly() || CLUB.busy) return false;
  name=officialNormName(name); emoji=OFFICIAL_EMOJIS.includes(emoji) ? emoji : OFFICIAL_EMOJIS[0];
  if(name.length<2){ toast(T('clubs.oNameShort'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
  if(!clubNeedName()) return false;
  if(!fbOn()){ toast(clubNoConnText(),'warn'); return false; }
  if(!(await ask(T('clubs.oCreateQ', emoji, name)))) return false;
  CLUB.busy=true;
  try{
    let code=null;
    for(let i=0;i<3 && !code;i++){ const cand=clubRand(6); const r=await fbReq('clubCodes/'+cand, 'GET'); if(r===undefined){ toast(clubNoConnText(),'warn'); return false; } if(r===null) code=cand; }
    if(!code){ toast(clubNoConnText(),'warn'); return false; }
    const id=clubRand(8), wk=weekKey(), k=clubMyKey(), me={wk, g:0, w:0, m:0}, by=normName(settings.name);
    const body={name, emoji, code, created:{'.sv':'timestamp'}, official:true, members:{}, week:{key:wk, goals:0}}; body.members[k]=clubMemberBody(me);
    const r1=await fbReq('clubs/'+id, 'PUT', body);
    if(r1===undefined){ toast(clubNoConnText(),'warn'); return false; }
    const r2=await fbReq('clubCodes/'+code, 'PUT', id);
    const info={id, name, emoji, msg:'', by, auto:true, code, updated:{'.sv':'timestamp'}};
    const r3=await fbReq('official/club', 'PUT', info);
    if(r3===undefined){ toast(clubNoConnText(),'warn'); return false; }                           // the club node exists but is not the official one yet: the admin simply creates again
    prog.official=Object.assign(officialSan(Object.assign({}, info, {updated:now()})), {tot:0, target:officialTarget(1), n:1}); if(r2===undefined) prog.official.codeDirty=true;
    prog.officialId=id; prog.officialMe=me; prog.officialSeen=now(); saveProg();
    CLUB.odata=Object.assign({}, body, {members:Object.assign({}, body.members)}); CLUB.ofetched=now(); CLUB.ooffline=false; CLUB.ogone=null; CLUB.tab='official'; CLUB.oview='main';
    toast(T('clubs.oCreated', emoji, name, code),'ach'); try{ sfx.win(); confetti.burst(160); }catch(e){}
    clubHomePill(); clubRender(); return true;
  }catch(e){ console.error('official create', e); return false; }
  finally{ CLUB.busy=false; }
}
/* rename / new emoji: official/club and clubs/<id> both */
async function officialRename(name, emoji){
  const o=officialInfo(); if(!o || !officialAdminOnly() || CLUB.busy) return false;
  name=officialNormName(name); emoji=OFFICIAL_EMOJIS.includes(emoji) ? emoji : o.emoji;
  if(name.length<2){ toast(T('clubs.oNameShort'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
  if(name===o.name && emoji===o.emoji){ CLUB.oview='main'; clubRender(); return true; }
  if(!fbOn()){ toast(clubNoConnText(),'warn'); return false; }
  CLUB.busy=true;
  try{
    const by=normName(settings.name)||o.by;
    const r=await fbReq('official/club', 'PATCH', {name, emoji, by, updated:{'.sv':'timestamp'}});
    if(r===undefined){ toast(clubNoConnText(),'warn'); return false; }
    fbReq('clubs/'+o.id, 'PATCH', {name, emoji});
    o.name=name; o.emoji=emoji; o.by=by; o.updated=now(); saveProg();
    if(CLUB.odata){ CLUB.odata.name=name; CLUB.odata.emoji=emoji; }
    toast(T('clubs.oSaved'),'ach'); CLUB.oview='main'; clubHomePill(); clubRender(); return true;
  } finally{ CLUB.busy=false; }
}
/* the message board (≤300 chars) — written only by the admin, shown through esc() */
async function officialSetMsg(msg){
  const o=officialInfo(); if(!o || !officialAdminOnly() || CLUB.busy) return false;
  msg=officialNormMsg(msg);
  if(!fbOn()){ toast(clubNoConnText(),'warn'); return false; }
  CLUB.busy=true;
  try{
    const by=normName(settings.name)||o.by;
    const r=await fbReq('official/club', 'PATCH', {msg, by, updated:{'.sv':'timestamp'}});
    if(r===undefined){ toast(clubNoConnText(),'warn'); return false; }
    o.msg=msg; o.by=by; o.updated=now(); saveProg();
    toast(T('clubs.oSaved'),'ach'); CLUB.oview='main'; clubRender(); return true;
  } finally{ CLUB.busy=false; }
}
/* the switch: auto on = everyone is added and nobody can leave; off = join by code only, leaving allowed */
async function officialSetAuto(on){
  const o=officialInfo(); if(!o || !officialAdminOnly() || CLUB.busy){ clubRender(); return false; }
  on=!!on;
  if(!fbOn()){ toast(clubNoConnText(),'warn'); clubRender(); return false; }
  CLUB.busy=true;
  try{
    const r=await fbReq('official/club', 'PATCH', {auto:on, updated:{'.sv':'timestamp'}});
    if(r===undefined){ toast(clubNoConnText(),'warn'); clubRender(); return false; }
    o.auto=on; o.updated=now(); saveProg();
    toast(T(on ? 'clubs.oAutoOn' : 'clubs.oAutoOff'),'ach'); clubRender(); return true;
  } finally{ CLUB.busy=false; }
}

/* ----- the screen (a modal inside #stage) ----- */
function clubOpen(view){
  const m=$('#club-modal'); if(!m) return false;
  CLUB.view = myClub() ? 'club' : (view==='create' || view==='join') ? view : 'none';
  CLUB.tab = (view==='official' && (officialInfo() || isAdmin())) ? 'official' : 'mine'; CLUB.oview='main';
  try{ const ms=$('#more-sheet'); if(ms) ms.classList.remove('show'); }catch(e){}
  m.classList.add('show'); clubRender();
  if(myClub()) clubRefresh().then(()=>{ clubRerender(); clubHomePill(); });
  officialOpenSync().then(()=>{ clubRerender(); clubHomePill(); });                           // one GET of official/club per open (+ the club node, cached)
  return true;
}
function clubClose(){ CLUB.view='none'; CLUB.oview='main'; const m=$('#club-modal'); if(m) m.classList.remove('show'); }
/* a re-render after a server answer: never under the player's fingers (a code / the admin's text being typed) — then only the tabs */
function clubRerender(){
  const m=$('#club-modal'); if(!m || !m.classList.contains('show')) return;
  const a=document.activeElement, body=$('#club-body');
  if(a && body && body.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName)){ clubRenderTabs(); return; }
  clubRender();
}
function clubBoxes(v){ const b=$('#club-boxes'); if(!b) return; v=String(v||''); Array.from(b.children).forEach((s,i)=>{ s.textContent=v[i]||''; s.classList.toggle('on', i===v.length); s.classList.toggle('has', !!v[i]); }); }
/* the join-by-code form (shared by the "mine" tab and the official tab when auto is off) */
function clubJoinHTML(){
  return `<div class="hint club-intro">${esc(T('clubs.codeHint'))}</div>
      <div class="club-boxes" id="club-boxes">${'<span></span>'.repeat(6)}</div>
      <input id="club-code-input" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC234">
      <div class="club-btns"><button class="btn green" id="btn-club-do-join" data-act="doJoin">${esc(T('clubs.join'))}</button><button class="btn blue small" data-act="back">${esc(T('clubs.back'))}</button></div>`;
}
function clubJoinWire(){
  const inp=$('#club-code-input'); if(!inp) return;
  inp.addEventListener('input', ()=>{ inp.value=clubNormCode(inp.value); clubBoxes(inp.value); });
  inp.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter') clubJoin(inp.value); if(e.key==='Escape') clubClose(); });
  $('#club-boxes').addEventListener('click', ()=>{ try{ inp.focus(); }catch(e){} });
  clubBoxes(''); setTimeout(()=>{ try{ inp.focus(); }catch(e){} }, 60);
}
/* the two tabs: "my club" and "📣 <emoji> <official name>" (hidden when there is no official club — the admin always sees it, to create one) */
function clubRenderTabs(){
  const tabs=$('#club-tabs'); if(!tabs) return;
  const o=officialInfo(), show=!!o || isAdmin();
  tabs.hidden=!show; if(!show){ CLUB.tab='mine'; tabs.innerHTML=''; return; }
  if(CLUB.tab!=='official') CLUB.tab='mine';
  tabs.innerHTML=`<button class="club-tab${CLUB.tab==='mine' ? ' on' : ''}" id="club-tab-mine" data-tab="mine">${esc(T('clubs.tabMine'))}</button><button class="club-tab${CLUB.tab==='official' ? ' on' : ''}" id="club-tab-official" data-tab="official">${o ? esc('📣 '+o.emoji+' '+o.name) : esc(T('clubs.tabAdmin'))}</button>`;
}
function clubRender(){
  const body=$('#club-body'); if(!body) return;
  clubRenderTabs();
  const close=$('#btn-club-close'); if(close) close.textContent=T('clubs.back');
  if(CLUB.tab==='official' && (officialInfo() || isAdmin())){ clubRenderOfficial(body); return; }
  CLUB.tab='mine';
  const c=myClub(); const v = c ? 'club' : (CLUB.view==='create' || CLUB.view==='join') ? CLUB.view : 'none';
  const title=$('#club-title'); if(title) title.textContent = c ? c.emoji+' '+clubDisplay(c) : T('clubs.title');
  body.dataset.view=v; delete body.dataset.oview;
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
  if(v==='join'){ body.innerHTML=clubJoinHTML(); clubJoinWire(); return; }
  // ----- the club itself
  const st=clubWeekStats(CLUB.data), days=clubDaysLeft(), pct=Math.max(0, Math.min(100, Math.round(st.total/st.target*100))), prize=clubPrizeState(st, c.id);
  const status = CLUB.offline ? (CLUB.data ? clubNoConnText(true) : clubNoConnText()) : '';
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
/* ----- the official tab: the admin's board (a speech bubble), the shared goal, the top-20 members, the code; the admin's ⚙️ form ----- */
function clubRenderOfficial(body){
  const o=officialInfo(), adm=isAdmin(), title=$('#club-title');
  body.dataset.view='official';
  if(CLUB.oview==='admin' && adm){ clubRenderOfficialAdmin(body, o); return; }
  if(!o){ if(adm){ CLUB.oview='admin'; clubRenderOfficialAdmin(body, null); return; } CLUB.tab='mine'; clubRender(); return; }
  if(title) title.textContent=o.emoji+' '+o.name;
  const member=officialId()===o.id;
  const board=`<div class="club-board" id="club-board"><div class="club-board-h" id="club-board-h">${esc(o.by ? T('clubs.oBoardFrom', o.by) : T('clubs.oBoard'))}</div><div class="club-board-msg" id="club-board-msg">${o.msg ? esc(o.msg) : '<span class="club-board-empty">'+esc(T('clubs.oNoMsg'))+'</span>'}</div></div>`;
  const admBtn=adm ? `<button class="btn blue small" id="btn-club-oadmin" data-act="oAdmin">${esc(T('clubs.tabAdmin'))}</button>` : '';
  if(CLUB.oview==='join' && !member){ body.dataset.oview='join'; body.innerHTML=board+clubJoinHTML(); clubJoinWire(); return; }
  if(!member){
    body.dataset.oview='out';
    body.innerHTML=`${board}<div class="club-hero">📣</div><div class="hint club-intro">${esc(o.auto ? T('clubs.oIntro') : T('clubs.oIntroCode'))}</div>
      <div class="club-btns">${o.auto ? `<button class="btn green" id="btn-club-ojoin" data-act="oJoin">${esc(T('clubs.oJoin'))}</button>` : `<button class="btn purple" id="btn-club-ojoin-code" data-act="oJoinCode">${esc(T('clubs.joinBtn'))}</button>`}${admBtn}</div>`;
    return;
  }
  body.dataset.oview='main';
  const st=officialStats(CLUB.odata), days=clubDaysLeft(), pct=Math.max(0, Math.min(100, Math.round(st.total/st.target*100))), prize=clubPrizeState(st, o.id);
  const status = CLUB.ooffline ? (CLUB.odata ? clubNoConnText(true) : clubNoConnText()) : '';
  const top=st.list.slice(0, ECON.clubs.oTop), mine=st.list.find(x=>x.me); if(mine && !top.includes(mine)) top.push(mine);
  const more=Math.max(0, st.list.length-top.length);
  const rows=top.map(x=>`<div class="club-row${x.me?' me':''}"><span class="club-nm">${esc(x.name)}${x.me ? ' <small>('+esc(T('clubs.me'))+')</small>' : ''}</span><span class="club-lv">Lv ${x.lv}</span><span class="club-st">${esc(T('clubs.memberStats', x.g, x.w, x.m))}</span></div>`).join('')
    + (more ? `<div class="club-more" id="club-omore">${esc(T('clubs.oMore', fmtNum(more)))}</div>` : '');
  const claimLabel = prize==='claimed' ? T('clubs.claimed') : prize==='ready2' ? T('clubs.claimGold') : prize==='ready' ? T('clubs.claim') : prize==='need' ? T('clubs.claimNeed', Math.max(1, ECON.clubs.prizeMatches-st.myM)) : T('clubs.claimFar');
  body.innerHTML=`${board}
    <div class="club-top">${o.code ? `<button class="club-code" id="club-ocode" data-act="oCopy" title="${esc(T('clubs.copy'))}">${esc(T('clubs.code', o.code))} 📋</button>` : '<span></span>'}<span class="club-days" id="club-odays">${esc(days<=1 ? T('clubs.lastDay') : T('clubs.daysLeft', days))}</span><button class="btn blue small club-refresh" id="btn-club-orefresh" data-act="oRefresh" title="🔄">🔄</button></div>
    <div class="club-progress"><div class="club-bar${st.total>=st.target ? ' done' : ''}" id="club-obar"><i style="width:${pct}%"></i></div><div class="club-ptext" id="club-oprogress-text">${esc(T('clubs.progress', fmtNum(st.total), fmtNum(st.target)))}</div></div>
    <div class="club-prize" id="club-oprize-line">${esc(T('clubs.prizeLine', ECON.clubs.prizeMatches))}</div>
    ${status ? `<div class="club-status" id="club-ostatus">${esc(status)}</div>` : ''}
    <div class="club-sub" id="club-omembers-h">${esc(T('clubs.oMembers', fmtNum(st.n)))}</div>
    <div class="club-members" id="club-omembers">${rows}</div>
    <div class="club-btns"><button class="btn ${prize==='ready' || prize==='ready2' ? 'green pulse' : 'yellow off'}" id="btn-club-oclaim" data-act="oClaim">${esc(claimLabel)}</button>${o.code ? `<button class="btn purple" id="btn-club-oinvite" data-act="oInvite">${esc(T('clubs.invite'))}</button>` : ''}${admBtn}${o.auto ? '' : `<button class="btn red small" id="btn-club-oleave" data-act="oLeave">${esc(T('clubs.leave'))}</button>`}</div>`;
}
/* the admin's form: free-text name + emoji, the message board, the auto switch (only rendered for isAdmin(); every write re-checks) */
function clubRenderOfficialAdmin(body, o){
  const title=$('#club-title'); if(title) title.textContent=T('clubs.tabAdmin');
  body.dataset.oview='admin';
  const emoji=OFFICIAL_EMOJIS.includes(CLUB.opick) ? CLUB.opick : (o ? o.emoji : OFFICIAL_EMOJIS[0]); CLUB.opick=emoji;
  body.innerHTML=`<div class="club-oadm">
      ${o ? '' : `<div class="hint club-intro">${esc(T('clubs.oHint'))}</div>`}
      <div class="club-sub">${esc(T('clubs.oName'))}</div>
      <input id="club-oname" maxlength="${ECON.clubs.nameMax}" autocomplete="off" spellcheck="false" placeholder="${esc(T('clubs.oNamePh'))}" value="${esc(o ? o.name : '')}">
      <div class="club-emos">${OFFICIAL_EMOJIS.map(e=>`<button class="club-emo${e===emoji ? ' on' : ''}" data-oemo="${e}">${e}</button>`).join('')}</div>
      <div class="club-btns"><button class="btn green" id="btn-club-osave" data-act="oSave">${esc(o ? T('clubs.oSaveName') : T('clubs.oCreate'))}</button></div>
      ${o ? `<div class="club-sub">${esc(T('clubs.oMsgLabel'))}</div>
      <textarea id="club-omsg" maxlength="${ECON.clubs.msgMax}" spellcheck="false" placeholder="${esc(T('clubs.oMsgPh'))}">${esc(o.msg)}</textarea>
      <div class="club-btns"><button class="btn purple" id="btn-club-omsg" data-act="oMsg">${esc(T('clubs.oSaveMsg'))}</button></div>
      <div class="setrow club-oauto"><span id="club-oauto-l">${esc(T('clubs.oAuto'))}</span><label class="switch"><input type="checkbox" id="club-oauto"${o.auto ? ' checked' : ''}><span></span></label></div>` : ''}
      <div class="club-btns"><button class="btn blue small" id="btn-club-oback" data-act="oBack">${esc(T('clubs.back'))}</button></div>
    </div>`;
  for(const el of body.querySelectorAll('input,textarea')) el.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Escape') clubClose(); });
}
/* the home pill: "🏟️ האריות 83/150" (or "📣 83/150" for the official club when there is no personal one, or just "🏟️ מועדון"), a third small pill in #home-trophy — placed ABOVE the trophy pill so the corner stays the trophy's */
function clubHomePill(){
  const home=$('#home'); if(!home) return null;
  let p=$('#home-club');
  if(!p){ p=document.createElement('button'); p.id='home-club'; p.className='pill club'; p.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} clubOpen(!myClub() && officialId() && officialInfo() ? 'official' : undefined); }); }
  const host=$('#home-trophy');
  if(host){ if(p.parentNode!==host || host.firstChild!==p) host.insertBefore(p, host.firstChild); p.classList.remove('free'); }
  else if(!p.parentNode){ p.classList.add('free'); home.appendChild(p); }
  const c=myClub(), o=officialInfo();
  if(c){ const st=CLUB.data ? clubWeekStats(CLUB.data) : null; const tot=st ? st.total : Math.max(0, c.tot|0), target=st ? st.target : (c.target || clubTarget(c.n||1)); p.textContent=T('clubs.pill', c.emoji, clubDisplay(c), fmtNum(tot), fmtNum(target)); p.classList.toggle('done', tot>=target); }
  else if(o && officialId()===o.id){ const st=CLUB.odata ? officialStats(CLUB.odata) : null; const tot=st ? st.total : Math.max(0, o.tot|0), target=st ? st.target : (o.target || officialTarget(o.n||1)); p.textContent=T('clubs.pill', '📣', o.name, fmtNum(tot), fmtNum(target)); p.classList.toggle('done', tot>=target); }
  else { p.textContent=T('clubs.pillNone'); p.classList.remove('done'); }
  if(typeof fitText==='function') fitText(p, 11);
  return p;
}

/* ----- wiring ----- */
(function clubBuildUI(){
  const grid=$('#more-grid');
  // no more-sheet button: the home pill (#home-club) is the one entry to the club screen
  const close=$('#btn-club-close'); if(close) close.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} clubClose(); });
  const m=$('#club-modal'); if(m) m.addEventListener('click', e=>{ if(e.target===m) clubClose(); });
  const tabs=$('#club-tabs'); if(tabs) tabs.addEventListener('click', e=>{ const t=e.target.closest('[data-tab]'); if(!t) return; try{ sfx.click(); }catch(x){} CLUB.tab=t.dataset.tab==='official' ? 'official' : 'mine'; CLUB.oview='main'; clubRender(); });
  const body=$('#club-body'); if(!body) return;
  body.addEventListener('click', e=>{
    const nb=e.target.closest('[data-name]'); if(nb){ try{ sfx.click(); }catch(x){} CLUB.pick.name=+nb.dataset.name|0; if(!CLUB.pick.emojiSet) CLUB.pick.emoji=CLUB_NAME_EMOJI[CLUB.pick.name]||CLUB_EMOJIS[0]; clubRender(); return; }
    const eb=e.target.closest('[data-emo]'); if(eb){ try{ sfx.click(); }catch(x){} CLUB.pick.emoji=eb.dataset.emo; CLUB.pick.emojiSet=true; clubRender(); return; }
    const ob=e.target.closest('[data-oemo]'); if(ob){ try{ sfx.click(); }catch(x){} CLUB.opick=ob.dataset.oemo; for(const x of body.querySelectorAll('[data-oemo]')) x.classList.toggle('on', x.dataset.oemo===CLUB.opick); return; }   // in place: the typed name stays
    const b=e.target.closest('[data-act]'); if(!b) return; try{ sfx.click(); }catch(x){}
    switch(b.dataset.act){
      case 'create': CLUB.view='create'; clubRender(); break;
      case 'join': CLUB.view='join'; clubRender(); break;
      case 'back': if(CLUB.tab==='official') CLUB.oview='main'; else CLUB.view='none'; clubRender(); break;
      case 'doCreate': clubCreate(CLUB.pick.name, CLUB.pick.emoji); break;
      case 'doJoin': clubJoin(($('#club-code-input')||{}).value); break;
      case 'copy': clubCopyCode(); break;
      case 'refresh': clubRefresh(true).then(()=>{ clubRender(); clubHomePill(); }); break;
      case 'claim': clubClaim(); break;
      case 'invite': clubInvite(); break;
      case 'leave': clubLeave(); break;
      /* the official tab */
      case 'oAdmin': if(!isAdmin()) break; CLUB.tab='official'; CLUB.oview='admin'; CLUB.opick=(officialInfo()||{}).emoji||OFFICIAL_EMOJIS[0]; clubRender(); break;
      case 'oBack': CLUB.oview='main'; clubRender(); break;
      case 'oSave': { const name=($('#club-oname')||{}).value||''; if(officialInfo()) officialRename(name, CLUB.opick); else officialCreate(name, CLUB.opick); } break;
      case 'oMsg': officialSetMsg(($('#club-omsg')||{}).value||''); break;
      case 'oJoin': officialJoinNow(); break;
      case 'oJoinCode': CLUB.oview='join'; clubRender(); break;
      case 'oCopy': clubCopyCode((officialInfo()||{}).code||''); break;
      case 'oRefresh': officialRefresh(true).then(()=>{ clubRender(); clubHomePill(); }); break;
      case 'oClaim': officialClaim(); break;
      case 'oInvite': officialInvite(); break;
      case 'oLeave': officialLeave(); break;
    }
  });
  body.addEventListener('change', e=>{ if(e.target && e.target.id==='club-oauto') officialSetAuto(e.target.checked); });
})();
/* real matches feed my member node in BOTH clubs (training never counts); the PATCHes go out right after the result card */
Hooks.on('matchEnd', info=>{
  if(!info || info.training) return;
  const c=myClub(), oid=officialId(), goals=Math.max(0, (info.score && info.score.me)|0); if(!c && !oid) return;
  if(c){ const me=clubMe(); me.g+=goals; if(info.outcome==='win') me.w++; me.m++; c.tot=(c.tot|0)+goals; c.dirty=true; }
  if(oid){ const om=officialMe(); om.g+=goals; if(info.outcome==='win') om.w++; om.m++; om.dirty=true; const o=officialInfo(); if(o && o.id===oid) o.tot=(o.tot|0)+goals; }
  saveProg(); clubHomePill();
  setTimeout(()=>{ if(c) clubPush().then(()=>clubHomePill()); if(oid) officialPush().then(()=>clubHomePill()); }, 120);
});
Hooks.on('heartbeat', body=>{ const c=myClub(); body.club = c ? c.id : null; });
Hooks.on('home', ()=>setTimeout(()=>{ clubHomePill(); officialSync(); }, 0));   // officialSync: at most once an hour
Hooks.on('screen', id=>{ if(id==='home'){ setTimeout(clubHomePill, 60); setTimeout(clubPendingTick, 500); setTimeout(officialSync, 700); } });
if(typeof setLang==='function'){ const _csl=setLang; setLang=function(){ const r=_csl.apply(this, arguments); try{ clubHomePill(); if($('#club-modal') && $('#club-modal').classList.contains('show')) clubRender(); }catch(e){} return r; }; }
{ const _csn=submitName; submitName=function(){ const r=_csn.apply(this, arguments); if(normName(settings.name)) setTimeout(clubPendingTick, 400); return r; }; }
CLUB.pending=clubParseSearch(clubInitialSearch());
applyLang();
/* 'no connection' vs. 'the server rules block clubs' (HTTP 401/403 recorded by fbReq) */
function clubNoConnText(cached){ const s=window.fbLastStatus|0; if(s===401 || s===403) return T('clubs.blocked'); return T(cached ? 'clubs.offlineCached' : 'clubs.noConn'); }
