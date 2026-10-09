/* ===================================================================================================
   ECONOMY FOUNDATION — currencies (🪙 coins, 💎 gems, 🔑 keys), the ⭐ level meter, the match payout,
   daily caps, server time, the hook bus other modules build on, and the one-time migration from XP.
   Every number lives in ECON so the game can be tuned in one place.
   =================================================================================================== */
const ECON = {
  formats: { quick:{time:90, target:2, mult:1, golden:30}, classic:{time:240, target:0, mult:2.5, golden:0}, golden:{time:120, target:1, mult:1, golden:0} },
  win:[20,30,40,50,60,80], online:50, draw:10, loss:8, goal:3, clean:10, threeStar:5, goldenBonus:10,
  xpWin:[10,15,20,30,40,60], xpOnline:25, xpDraw:5, xpLoss:3, xpGoal:2, xpMotd:30,
  matchMax:250, capCoins:600, capSunday:900, overCapPay:5,
  keysPerDay:3, keyMinLevel:1, keyCap:10,
  gemWeekCap:60,
  levelCoins:100, level5Gems:5,
  achMult:5, achGems:{win_master:5, cup_master:5, win_impossible:10},
  chalGems:2, chalXP:100,
  cupCoins:[20,30,40,60,100], cupsPerDay:3, cupFinalKey:1, trainCoins:20, trainPerDay:3, trainDrill:5,
  welcome:{coins:300, gems:10, keys:1},
  motdMult:2, sundayMult:2,
  starter:{khalaili:100, dabbur:300, gloukh:400, spiegler:400, griezmann:400},
  streakBonusStep:.1, streakBonusMax:.5, winStreakStep:.1, winStreakMax:.5,
  winStreakMilestones:{3:{coins:50}, 5:{coins:100, gems:1}, 10:{coins:300, gems:5}, every10:{coins:300, gems:5}},   // ⚡ wins in a row
};
/* ----- hook bus: modules subscribe to game events instead of editing the core ----- */
const Hooks = {
  _h:{},
  on(n, f){ (this._h[n]=this._h[n]||[]).push(f); },
  emit(n, ...a){ for(const f of (this._h[n]||[])){ try{ f(...a); }catch(e){ console.error('hook '+n, e); } } },
};
function I18N_ADD(o){ Object.assign(I18N_RAW, o); }          // {key:[he,en,ar,ru]}
const _coreApplyLang=applyLang; applyLang=function(){ if(!window.MODS_READY) return; return _coreApplyLang.apply(this, arguments); };   // modules call applyLang() at load; only the init line's pass does real work
function STATIC_ADD(o){ Object.assign(STATIC_I18N, o); }     // {'#selector':'key'}
const fmtNum = n => Number(n||0).toLocaleString('en-US');
const pad2 = n => (n<10?'0':'')+n;

/* ----- server-synced time: dayKey/weekKey use it, so changing the phone clock does not hand out rewards ----- */
let clockOffset=0;                                                         // server − phone, learned from the heartbeat each session (never persisted: a fixed phone clock must not stay wrong)
function now(){ return Date.now() + clockOffset; }
function localDayKey(ms){ const d=new Date(ms); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function isSunday(){ return new Date(now()).getDay()===0; }
function syncClock(serverMs){ if(typeof serverMs==='number' && serverMs>1e12){ const off=serverMs-Date.now(); if(Math.abs(off-clockOffset)>5000) clockOffset=off; } }

/* ----- level meter: level L is reached at 25·L²+75·L lifetime XP (L5 = 1,000, L10 = 3,250, L30 = 24,750) ----- */
const xpForLevel = n => 25*n*n + 75*n;
function levelOf(xp){ let n=0; while(xpForLevel(n+1)<=xp) n++; return n; }
const myLevel = () => levelOf(prog.xpTotal|0) + 1;                       // shown as "Lv 1" from the start
function levelProgress(){ const n=levelOf(prog.xpTotal|0), a=xpForLevel(n), b=xpForLevel(n+1); return {lv:n+1, have:(prog.xpTotal|0)-a, need:b-a, pct:Math.min(100, Math.round(((prog.xpTotal|0)-a)/(b-a)*100))}; }

/* ----- the wallet ----- */
let matchEarn=null;                                                      // while a match runs: rewards are collected here and shown on the end card, not toasted
const inMatch = () => ['play','celebrate','replay','countdown','penalty','corner','end'].includes(state);   // 'end': the result card is still collecting
function addCoins(n, why){
  n=Math.round(n); if(!(n>0)) return 0;
  prog.coins=(prog.coins|0)+n; saveProg();
  if(matchEarn && inMatch()) matchEarn.coins+=n; else toast(T('coins.gain', fmtNum(n)),'xp');
  updateXpBadge(); Hooks.emit('coins', n, why||''); return n;
}
function spendCoins(n){ n=Math.round(n); if((prog.coins|0)<n) return false; prog.coins-=n; saveProg(); updateXpBadge(); Hooks.emit('spend', n); return true; }
function addGems(n, why){
  n=Math.round(n); if(!(n>0)) return 0;
  prog.gems=(prog.gems|0)+n; saveProg();
  if(matchEarn && inMatch()) matchEarn.gems+=n; else toast(T('gems.gain', n),'ach');
  updateXpBadge(); Hooks.emit('gems', n, why||''); return n;
}
function spendGems(n){ n=Math.round(n); if((prog.gems|0)<n) return false; prog.gems-=n; saveProg(); updateXpBadge(); return true; }
function addKeys(n, why){
  n=Math.round(n); if(!(n>0)) return 0;
  const room=Math.max(0, ECON.keyCap-(prog.keys|0)); n=Math.min(n, room); if(!n){ toast(T('keys.full'),'warn'); return 0; }
  prog.keys=(prog.keys|0)+n; saveProg();
  if(matchEarn && inMatch()) matchEarn.keys+=n; else toast(T('keys.gain', n),'ach');
  updateXpBadge(); Hooks.emit('keys', n, why||''); return n;
}
function spendKeys(n){ if((prog.keys|0)<n) return false; prog.keys-=n; saveProg(); updateXpBadge(); return true; }
/* XP only levels you up; level-ups pay coins (100 × level) and every 5th level 5 gems */
function addXP(n, silent){
  n=Math.round(n); if(!(n>0)) return;
  prog.xpTotal=(prog.xpTotal|0)+n; if(matchEarn && inMatch()) matchEarn.xp+=n; else if(!silent) toast(T('xp.gain',n),'xp');
  const L=levelOf(prog.xpTotal);
  while((prog.lvClaimed|0)<L){
    prog.lvClaimed=(prog.lvClaimed|0)+1; const lv=prog.lvClaimed+1;
    const coins=ECON.levelCoins*lv; prog.coins=(prog.coins|0)+coins; if(matchEarn && inMatch()) matchEarn.coins+=coins;
    if(lv%5===0){ prog.gems=(prog.gems|0)+ECON.level5Gems; if(matchEarn && inMatch()) matchEarn.gems+=ECON.level5Gems; }
    const show=()=>{ toast(T('lvl.up', lv, fmtNum(coins)),'ach'); try{ sfx.win(); }catch(e){} };
    if(matchEarn && inMatch()) matchEarn.levelUps.push(lv); else setTimeout(show, 300);
    Hooks.emit('levelUp', lv);
  }
  saveProg(); updateXpBadge();
}
/* a day-keyed counter: {key, n} that resets when the (server) day changes */
function dayCounter(field){ const k=dayKey(); if(!prog[field] || prog[field].key!==k) prog[field]={key:k, n:0}; return prog[field]; }
function weekCounter(field){ const k=weekKey(); if(!prog[field] || prog[field].key!==k) prog[field]={key:k, n:0}; return prog[field]; }
function coinCapToday(){ return isSunday() ? ECON.capSunday : ECON.capCoins; }
function coinCapLeft(){ return Math.max(0, coinCapToday()-dayCounter('coinDay').n); }

/* ----- match formats ----- */
let matchFmt='classic', overtime=false, matchDay=null, matchSunday=null;   // matchDay/matchSunday: the server day the running match started on
function fmtOf(name){ return ECON.formats[name] || ECON.formats.classic; }
function matchTime(){ return fmtOf(matchFmt).time; }
function matchTarget(){ const f=fmtOf(matchFmt); if(f.target) return f.target; return (mp && !v2) ? 3 : (level && level.goals) || 3; }
function myFormat(){ return ECON.formats[settings.format] ? settings.format : 'quick'; }

/* ----- the one payout formula ----- */
function payout(o){
  /* o = {outcome:'win'|'draw'|'lose', fmt, levelI, online, goals, clean, stars, golden, motd, training} */
  if(o.training) return {coins:0, xp:0, key:0, parts:[], capped:false, mult:1, bonus:0};
  const F=fmtOf(o.fmt), lvl=Math.max(0, Math.min(5, o.levelI|0)), parts=[];
  let base;
  if(o.outcome==='win'){ base=(o.online ? ECON.online : ECON.win[lvl])*F.mult; parts.push(['end.pWin', base]); }
  else if(o.outcome==='draw'){ base=ECON.draw*F.mult; parts.push(['end.pDraw', base]); }
  else { base=ECON.loss*F.mult; parts.push(['end.pLoss', base]); }
  base=Math.round(base);
  if(o.goals>0){ const g=o.goals*ECON.goal; base+=g; parts.push(['end.pGoals', g]); }
  if(o.outcome==='win' && o.clean){ base+=ECON.clean; parts.push(['end.pClean', ECON.clean]); }
  if(o.outcome==='win' && o.stars>=3){ base+=ECON.threeStar; parts.push(['end.pStars', ECON.threeStar]); }
  if(o.outcome==='win' && o.golden){ base+=ECON.goldenBonus; parts.push(['end.pGolden', ECON.goldenBonus]); }
  const winStreak = o.outcome==='win' ? (prog.streak|0) : 0;
  const ms = o.outcome==='win' ? winStreakMilestone(winStreak) : null;
  if(ms && ms.coins){ base+=ms.coins; parts.push(['end.pStreakWin', ms.coins]); }
  const cycles = Math.floor((prog.streakDays|0)/7);
  const bonus = Math.min(ECON.winStreakMax, Math.max(0,winStreak-1)*ECON.winStreakStep) + Math.min(ECON.streakBonusMax, cycles*ECON.streakBonusStep);
  const sunday = (typeof matchSunday!=='undefined' && matchSunday!=null) ? matchSunday : isSunday();
  const mult = Math.max(o.motd ? ECON.motdMult : 1, sunday ? ECON.sundayMult : 1, (typeof eventMult==='function' ? eventMult() : 1));
  let coins=Math.round(base*(1+bonus)*mult);
  coins=Math.min(coins, ECON.matchMax);
  const left=coinCapLeft(); let capped=false;
  if(coins>left){ capped=true; coins = left>0 ? left : ECON.overCapPay; }
  let xp = o.outcome==='win' ? (o.online ? ECON.xpOnline : ECON.xpWin[lvl]) : o.outcome==='draw' ? ECON.xpDraw : ECON.xpLoss;
  xp += (o.goals|0)*ECON.xpGoal; if(o.motd) xp+=ECON.xpMotd;
  const kd=dayCounter('keyDay');
  const key = (o.outcome==='win' && (o.online || lvl>=ECON.keyMinLevel) && kd.n<ECON.keysPerDay && (prog.keys|0)<ECON.keyCap) ? 1 : 0;
  return {coins, xp, key, parts, bonus, mult, capped, base, streakGems: ms && ms.gems ? ms.gems : 0, streak: winStreak};
}
/* called once per finished match (not training): stamps the day for the streak, applies the payout, returns the summary for the end card */
function applyMatchRewards(o){
  const r=payout(o);
  if(r.coins>0){ dayCounter('coinDay').n+=r.coins; addCoins(r.coins,'match'); }
  if(r.key){ if(addKeys(1,'match')>0) dayCounter('keyDay').n+=1; else r.key=0; }
  if(r.xp>0) addXP(r.xp);
  if(r.streakGems>0) addGems(r.streakGems,'winstreak');
  if(r.streak>=3 && winStreakMilestone(r.streak)) setTimeout(()=>toast(T('streak.win', r.streak),'ach'), 800);
  prog.matches=(prog.matches|0)+1; prog.lastPlay=now();
  stampStreakDay(typeof matchDay!=='undefined' && matchDay ? matchDay : undefined);
  saveProg();
  return r;
}
/* the daily streak: finishing any real match (win or loss) counts; a missed day uses a free freeze if there is one */
function stampStreakDay(day){
  const k=day||dayKey(); if(prog.streakLast===k) return false;
  const dy=new Date(now()); dy.setDate(dy.getDate()-1); const y=localDayKey(dy.getTime()); dy.setDate(dy.getDate()-1); const y2=localDayKey(dy.getTime());
  if(!prog.streakLast) prog.streakDays=1;
  else if(prog.streakLast===y) prog.streakDays=(prog.streakDays|0)+1;
  else if(prog.streakLast===y2 && (prog.freezes|0)>0){ prog.freezes--; prog.streakDays=(prog.streakDays|0)+1; }
  else { prog.streakBroken=prog.streakDays|0; prog.streakDays=1; }
  prog.streakLast=k; prog.streakNew=true; saveProg(); Hooks.emit('streakDay', prog.streakDays); return true;
}
/* level recommendation: last 5 results per level (the first 3 lifetime matches are ignored) */
function noteResult(levelI, outcome, margin){
  if((prog.matches|0)<3) return;
  prog.recent=prog.recent||{}; const a=prog.recent[levelI]=prog.recent[levelI]||[];
  a.push(outcome==='win' ? (margin>=2 ? 'W' : 'w') : outcome==='draw' ? 'd' : 'l'); while(a.length>5) a.shift();
}
function recommendLevel(){
  const cur = ECON._lastLevel!=null ? ECON._lastLevel : (settings.lastLevel|0);
  const a=(prog.recent||{})[cur]||[];
  if(a.length>=3 && a.slice(-3).every(x=>x==='W') && cur<4) return cur+1;      // never Impossible automatically
  if(a.length>=3 && a.slice(-3).every(x=>x==='l') && cur>0) return cur-1;
  return cur;
}

/* ----- a yes/no question inside the game (never the browser's confirm(), which drops fullscreen on phones) ----- */
function ask(text, yes, no){
  return new Promise(res=>{
    const m=$('#ask-modal'); $('#ask-text').textContent=text; $('#btn-ask-yes').textContent=yes||T('ask.yes'); $('#btn-ask-no').textContent=no||T('ask.no');
    const done=v=>{ m.classList.remove('show'); $('#btn-ask-yes').onclick=$('#btn-ask-no').onclick=null; res(v); };
    $('#btn-ask-yes').onclick=()=>{ sfx.click(); done(true); }; $('#btn-ask-no').onclick=()=>{ sfx.click(); done(false); };
    m.classList.add('show');
  });
}

/* ----- one-time migration from the XP-only game: every XP point becomes a coin, nothing is lost ----- */
function migrateProg(){
  if(prog.migrated==='v2') return false;
  const was=prog.xp|0, existing = was>0 || (prog.unlocked||[]).length>0 || (prog.trophies|0)>0 || (prog.wins|0)>0;
  prog.coins=(prog.coins|0)+was;
  prog.gems=(prog.gems|0)+ECON.welcome.gems; prog.keys=(prog.keys|0)+ECON.welcome.keys;
  let xp=was;
  if(!prog.admin){ for(const id of (prog.unlocked||[])){ const c=CHARS.find(x=>x.id===id); if(c && !FREE_CHARS.includes(id) && !c.trophyOnly && !roadFor(id)) xp+=priceOf(c); } if(prog.ice) xp+=ICE_PRICE; if(prog.fire) xp+=FIRE_PRICE; }
  xp=Math.min(xp, xpForLevel(30));
  prog.xpTotal=xp; prog.lvClaimed=levelOf(xp);
  const st=loadStats(); const played=(st.w|0)+(st.d|0)+(st.l|0);
  prog.matches=Math.max(prog.matches|0, played, existing ? 1 : 0);
  if(existing) prog.onboard=Object.assign({ctrl:true,welcome:true,pickup:true,shop:true,share:true}, prog.onboard||{});   // a veteran skips the first-session cards
  prog.migrated='v2'; prog.welcomeDue=existing;
  if(!settings.format){ settings.format = existing ? 'classic' : 'quick'; saveSettings(); }
  saveProg(); return existing;
}
/* keep the chosen character between sessions */
function restoreSelected(){ if(prog.selectedId){ const i=CHARS.findIndex(c=>c.id===prog.selectedId); if(i>=0 && isUnlocked(CHARS[i])) selected=i; } }
Hooks.on('select', i=>{ prog.selectedId=CHARS[i].id; saveProg(); });

I18N_ADD({
 'coins.gain':['🪙 +{0}','🪙 +{0}','🪙 +{0}','🪙 +{0}'],
 'gems.gain':['💎 +{0} יהלומים','💎 +{0} gems','💎 +{0} جواهر','💎 +{0} алмазов'],
 'keys.gain':['🔑 +{0} מפתח','🔑 +{0} key','🔑 +{0} مفتاح','🔑 +{0} ключ'],
 'keys.full':['🔑 הארנק מלא במפתחות, פתח תיבות!','🔑 Your keys are full, open chests!','🔑 المفاتيح ممتلئة، افتح الصناديق!','🔑 Ключей слишком много, открой сундуки!'],
 'lvl.up':['⭐ עלית לרמה {0}! +{1} 🪙','⭐ Level {0}! +{1} 🪙','⭐ المستوى {0}! +{1} 🪙','⭐ Уровень {0}! +{1} 🪙'],
 'cur.coins':['מטבעות','Coins','عملات','Монеты'], 'cur.gems':['יהלומים','Gems','جواهر','Алмазы'], 'cur.keys':['מפתחות','Keys','مفاتيح','Ключи'],
 'cur.level':['רמה','Level','المستوى','Уровень'],
 'ask.yes':['כן','Yes','نعم','Да'], 'ask.no':['לא','No','لا','Нет'],
 'end.pWin':['ניצחון','Win','فوز','Победа'], 'end.pDraw':['תיקו','Draw','تعادل','Ничья'], 'end.pLoss':['על המאמץ','For trying','على المحاولة','За старание'],
 'end.pGoals':['גולים','Goals','أهداف','Голы'], 'end.pClean':['שער נקי','Clean sheet','شباك نظيفة','Сухой матч'], 'end.pStars':['3 כוכבים','3 stars','3 نجوم','3 звезды'], 'end.pGolden':['שער זהב','Golden goal','هدف ذهبي','Золотой гол'],
 'end.bonus':['בונוס רצף','Streak bonus','مكافأة السلسلة','Бонус серии'], 'end.mult':['מכפיל','Multiplier','مضاعف','Множитель'],
 'end.capped':['הגעת למקסימום היומי, מחר מתמלא','Daily max reached, refills tomorrow','وصلت إلى الحد اليومي، يتجدد غدًا','Дневной максимум, завтра обновится'],
 'end.earned':['הרווחת','You earned','ربحت','Ты получил'],
 'fmt.quick':['⚡ מהיר','⚡ Quick','⚡ سريع','⚡ Быстрый'], 'fmt.classic':['⏱️ קלאסי','⏱️ Classic','⏱️ كلاسيكي','⏱️ Классика'], 'fmt.golden':['🥇 שער זהב','🥇 Golden goal','🥇 الهدف الذهبي','🥇 Золотой гол'],
 'fmt.quickSub':['דקה וחצי · מי שמגיע ל-2','90 s · first to 2','دقيقة ونصف · أول من يصل إلى 2','90 с · до 2 голов'],
 'fmt.classicSub':['4 דקות · פרסים פי 2.5','4 min · 2.5× rewards','4 دقائق · مكافآت ×2.5','4 мин · награды ×2.5'],
 'fmt.goldenSub':['הגול הראשון מנצח','First goal wins','الهدف الأول يفوز','Первый гол побеждает'],
 'c.golden':['🎙️ שער זהב! הגול הבא מנצח!','🎙️ Golden goal! Next goal wins!','🎙️ هدف ذهبي! الهدف التالي يفوز!','🎙️ Золотой гол! Следующий гол побеждает!'],
 'golden.flash':['⚡ שער זהב ⚡','⚡ GOLDEN GOAL ⚡','⚡ الهدف الذهبي ⚡','⚡ ЗОЛОТОЙ ГОЛ ⚡'],
 'welcome.title':['🎁 ברוך הבא לגרסה החדשה!','🎁 Welcome to the new version!','🎁 مرحبًا بك في النسخة الجديدة!','🎁 Добро пожаловать в новую версию!'],
 'welcome.text':['ה-XP שלך הפך למטבעות 🪙 (אותו מספר!). עכשיו יש גם יהלומים 💎, מפתחות 🔑 ותיבות. הנה מתנה:','Your XP became coins 🪙 (same number!). There are gems 💎, keys 🔑 and chests now. Here is a gift:','تحولت نقاطك إلى عملات 🪙 (نفس الرقم!). الآن توجد جواهر 💎 ومفاتيح 🔑 وصناديق. إليك هدية:','Твой опыт стал монетами 🪙 (то же число!). Теперь есть алмазы 💎, ключи 🔑 и сундуки. Вот подарок:'],
 'welcome.take':['🎁 קח את המתנה','🎁 Take the gift','🎁 خذ الهدية','🎁 Забрать подарок'],
 'cap.today':['היום: {0}/{1} 🪙','Today: {0}/{1} 🪙','اليوم: {0}/{1} 🪙','Сегодня: {0}/{1} 🪙'],
});

/* ----- the ball and the golden-goal flash ----- */
function ballSVG(){ return (window.MODS_READY && typeof ballSkin==='function' && ballSkin()) || BALL_SVG; }
function goldenFlash(){ const el=$('#golden-flash'); if(!el) return; el.textContent=T('golden.flash'); el.hidden=false; el.style.animation='none'; void el.offsetWidth; el.style.animation=''; setTimeout(()=>{ el.hidden=true; }, 1900); try{ sfx.whistle(); }catch(e){} }

/* ----- the welcome gift for players who already had XP ----- */
Hooks.on('screen', id=>{ if(id==='home' && prog.welcomeDue && !mp){ setTimeout(()=>{ if(prog.welcomeDue && $('#home').classList.contains('active')){ $('#welcome-text').textContent=T('welcome.text'); $('#welcome-title').textContent=T('welcome.title'); $('#btn-welcome-take').textContent=T('welcome.take'); $('#welcome-modal').classList.add('show'); } }, 600); } });
$('#btn-welcome-take').addEventListener('click', ()=>{ if(!prog.welcomeDue) return; prog.welcomeDue=false; saveProg(); $('#welcome-modal').classList.remove('show'); sfx.win(); confetti.burst(200); addCoins(ECON.welcome.coins,'welcome'); if(typeof giveCosmetic==='function') giveCosmetic('kit_il'); Hooks.emit('welcome'); });

/* ----- "what should I do next?" — modules register candidates {prio (higher first), text, icon, action}; the home shows the best one ----- */
const NextUp = { fns:[], add(fn){ this.fns.push(fn); }, best(){ let b=null; for(const fn of this.fns){ try{ const c=fn(); if(c && (!b || c.prio>b.prio)) b=c; }catch(e){} } return b; } };
/* ----- start an offline match against a random (or given) opponent at a level, from anywhere ----- */
function randomOpponent(){ const pool=CHARS.map((c,i)=>i).filter(i=>i!==selected); const un=pool.filter(i=>!isUnlocked(CHARS[i])); return (un.length && Math.random()<2/3) ? un[Math.floor(Math.random()*un.length)] : pool[Math.floor(Math.random()*pool.length)]; }
function startOfflineMatch(levelI, oppIdx){ if(mp) mpTeardown(); dailyMatch=false; v2Pending=null; forcedOpp = oppIdx!=null ? oppIdx : randomOpponent(); document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); startGame(Math.max(0, Math.min(5, levelI|0))); }

/* ----- load-time: starter prices, migration, remembered character ----- */
migrateProg();
Object.assign(PRICES, ECON.starter);                                      // the starter band drops AFTER the level credit for already-bought players
restoreSelected();
/* ⚡ wins in a row: a reward at 3, 5, 10 and every 10 after that */
function winStreakMilestone(n){ const M=ECON.winStreakMilestones; if(!M || !(n>=3)) return null; if(M[n]) return M[n]; if(n>10 && n%10===0) return M.every10; return null; }
/* numbers that must stay inside a fixed box: shrink the font until the text fits (never grow the box) */
function fitText(el, minPx){ if(!el) return; el.style.fontSize=''; let fs=parseFloat(getComputedStyle(el).fontSize)||20; minPx=minPx||11; let guard=30; while(el.scrollWidth>el.clientWidth+1 && fs>minPx && guard-->0){ fs-=1; el.style.fontSize=fs+'px'; } }
function fitAllNumbers(){ for(const sel of ['#xp-badge','#gem-badge','#lv-badge','#trophy-badge','#home-me','#home-wstreak','#shop-coins','#shop-gems','#chests-wallet span','#end-score .me','#end-score .op','#st-xp','#road-next']) document.querySelectorAll(sel).forEach(el=>fitText(el)); }
Hooks.on('wallet', ()=>setTimeout(fitAllNumbers, 0));
Hooks.on('screen', ()=>setTimeout(fitAllNumbers, 50));
I18N_ADD({ 'end.pStreakWin':['⚡ רצף ניצחונות','⚡ Win streak','⚡ سلسلة انتصارات','⚡ Серия побед'],
           'streak.win':['⚡ {0} ניצחונות ברצף! פרס!','⚡ {0} wins in a row! Bonus!','⚡ {0} انتصارات متتالية! مكافأة!','⚡ {0} побед подряд! Бонус!'],
           'streak.home':['⚡ {0} ברצף','⚡ {0} in a row','⚡ {0} متتالية','⚡ {0} подряд'], 'streak.next':['הבא: {0}','next: {0}','التالي: {0}','след.: {0}'] });
