/* ===================================================================================================
   HOME v2 — one big PLAY under the hero (smart level + format chips), a "today" card on the left, the
   shop/chests column on the right, a "⋯ עוד" sheet for everything else, and an Android-back / history
   stack so the back button closes modals instead of leaving the game.
   The original home buttons are MOVED (DOM nodes keep their listeners), never recreated.
   =================================================================================================== */
I18N_ADD({
 'home.play':['שחק','Play','العب','Играть'], 'home.playSub':['{0} · {1}','{0} · {1}','{0} · {1}','{0} · {1}'],
 'home.level':['רמה: {0}','Level: {0}','المستوى: {0}','Уровень: {0}'], 'home.mode':['מצב: {0}','Mode: {0}','الوضع: {0}','Режим: {0}'],
 'home.tryHarder':['נסה קשה יותר 🔥','Try harder 🔥','جرّب الأصعب 🔥','Попробуй сложнее 🔥'],
 'home.today':['היום','Today','اليوم','Сегодня'], 'home.more':['⋯ עוד','⋯ More','⋯ المزيد','⋯ Ещё'],
 'home.shop':['🛒 חנות','🛒 Shop','🛒 المتجر','🛒 Магазин'], 'home.chests':['🎁 תיבות','🎁 Chests','🎁 الصناديق','🎁 Сундуки'],
 'home.looks':['👕 מראה','👕 Looks','👕 المظهر','👕 Образ'], 'home.friendsTop':['👥 חברים ומובילים','👥 Friends & leaders','👥 الأصدقاء والمتصدرون','👥 Друзья и лидеры'], 'home.changeChar':['🧑 דמות','🧑 Player','🧑 الشخصية','🧑 Игрок'],
 'home.nextUp':['מה הבא?','Next up','ما التالي؟','Что дальше'], 'home.go':['קדימה','Go','هيا','Вперёд'],
 'home.playMore':['שחק עוד משחק','Play another match','العب مباراة أخرى','Сыграй ещё матч'],
 'home.streakDay':['🔥 יום {0}','🔥 Day {0}','🔥 اليوم {0}','🔥 День {0}'],
 'home.lang':['🌐 שפה','🌐 Language','🌐 اللغة','🌐 Язык'], 'home.restore':['🔑 קוד שחזור','🔑 Restore code','🔑 رمز الاستعادة','🔑 Код восстановления'],
 'home.help':['❓ איך משחקים','❓ How to play','❓ كيف تلعب','❓ Как играть'],
 'home.lvlTitle':['באיזו רמה לשחק?','Which level?','أي مستوى؟','Какой уровень?'], 'home.modeTitle':['איך לשחק?','How do you want to play?','كيف تلعب؟','Как играть?'],
 'home.recommended':['מומלץ לך','Recommended','موصى به','Рекомендуем'], 'home.current':['נבחר','Chosen','مختار','Выбрано'],
 'home.bo3':['🏆 הטוב מ-3','🏆 Best of 3','🏆 الأفضل من 3','🏆 До 2 побед'], 'home.bo3Sub':['3 משחקים מהירים, בקבוצה','3 quick games, in a party','3 مباريات سريعة في المجموعة','3 быстрых игры в команде'],
 'home.otherModes':['עוד דרכים לשחק','More ways to play','طرق أخرى للعب','Другие режимы'],
 'home.exitIntro':['↩ למסך הפתיחה','↩ Back to the start screen','↩ إلى شاشة البداية','↩ На стартовый экран'],
 'home.cupCont':['🥅 המשך גביע','🥅 Continue the cup','🥅 متابعة الكأس','🥅 Продолжить кубок'],
 'home.settings':['⚙️ הגדרות','⚙️ Settings','⚙️ الإعدادات','⚙️ Настройки'], 'home.music':['🎵 מוזיקה','🎵 Music','🎵 الموسيقى','🎵 Музыка'], 'home.codes':['🎁 קודים','🎁 Codes','🎁 أكواد','🎁 Коды'],
 'home.close':['סגור','Close','إغلاق','Закрыть'],
 'home.online':['🌐 אונליין','🌐 Online','🌐 أونلاين','🌐 Онлайн'],
 'party.leaveQ':['לצאת מהקבוצה?','Leave the team?','مغادرة الفريق؟','Выйти из команды?'],
});
/* static labels (#5/#54: the icons survive applyLang; #62: the sheets' buttons in every language; #53: a short online label for the column) */
STATIC_ADD({'#btn-settings':'home.settings', '#btn-music':'home.music', '#btn-codes':'home.codes',
            '#btn-more-close':'home.close', '#btn-lvl-close':'btn.back2', '#btn-mode-close':'btn.back2', '#btn-mp':'home.online'});

const HOME = { built:false, lastNext:null };
const MODE_NAMES = { quick:'fmt.quick', classic:'fmt.classic', golden:'fmt.golden' };
function homeMode(){ return ECON.formats[settings.format] ? settings.format : 'quick'; }
function homeLevel(){ const l=settings.lastLevel; return (l>=0 && l<=5) ? l|0 : 0; }

/* ----- build: move the existing buttons into the new layout once ----- */
function buildHomeV2(){
  if(HOME.built) return; HOME.built=true;
  const home=$('#home'); home.classList.add('v2');
  const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
  // centre: name row, next-up, PLAY, chips
  const centre=el('div','',''); centre.id='home-centre';
  const who=el('div','who',''); const charsBtn=$('#btn-chars'); who.appendChild(charsBtn); charsBtn.classList.add('small'); charsBtn.hidden=true;   // choosing a player lives in the shop (players tab)
  const looks=el('button','btn purple wide',T('home.looks')); looks.id='btn-looks'; looks.hidden=true; /* one entry to the shop: the looks tab lives inside it */ looks.addEventListener('click', ()=>{ sfx.click(); if(typeof openShop==='function') openShop('looks'); else $('#btn-chars').click(); }); who.appendChild(looks);
  centre.appendChild(who);
  const nu=el('div','',''); nu.id='nextup'; nu.hidden=true; centre.appendChild(nu);   // the next-up line is gone from the home (NextUp still drives the tab title)
  const play=el('button','btn green',''); play.id='btn-play-big'; play.addEventListener('click', homePlay); centre.appendChild(play);
  const chips=el('div','',''); chips.id='home-chips';
  const lvChip=el('button','chip',''); lvChip.id='chip-level'; lvChip.addEventListener('click', ()=>{ sfx.click(); openLevelSheet(); });
  const mdChip=el('button','chip',''); mdChip.id='chip-mode'; mdChip.addEventListener('click', ()=>{ sfx.click(); openModeSheet(); });
  chips.appendChild(lvChip); chips.appendChild(mdChip); centre.appendChild(chips);
  home.appendChild(centre);
  // trophies + the road to the next reward: bottom-left corner
  const tro=el('div','',''); tro.id='home-trophy'; const tp=$('#trophy-pill'); if(tp) tro.appendChild(tp); const ws=el('button','pill wstreak',''); ws.id='home-wstreak'; ws.hidden=true; ws.addEventListener('click', ()=>{ sfx.click(); toast(T('streak.win', prog.streak|0).replace('!',''),'xp'); }); tro.appendChild(ws); home.appendChild(tro);
  // left: today
  const today=el('div','',''); today.id='today-card'; home.appendChild(today);
  // right column
  const right=el('div','',''); right.id='home-right';
  const chests=el('button','btn yellow',T('home.chests')); chests.id='btn-chests'; chests.addEventListener('click', ()=>{ sfx.click(); if(typeof openChestsScreen==='function') openChestsScreen(); else toast('🎁','xp'); }); right.appendChild(chests);
  const shop=el('button','btn orange',T('home.shop')); shop.id='btn-shop'; shop.addEventListener('click', ()=>{ sfx.click(); if(typeof openShop==='function') openShop('today'); else $('#btn-chars').click(); }); right.appendChild(shop);
  { const top=$('#btn-top'); right.appendChild($('#btn-mp')); right.appendChild(top); top.hidden=true; right.appendChild($('#btn-friends')); }   // one entry to the friends screen: the leaderboard is a tab inside it
  const more=el('button','btn blue',T('home.more')); more.id='btn-more'; more.addEventListener('click', ()=>{ sfx.click(); openMoreSheet(); }); right.appendChild(more);
  home.appendChild(right);
  const fs=$('#btn-fs'), ex=$('#btn-exit'); if(fs && ex && ex.parentNode){ ex.parentNode.insertBefore(fs, ex.nextSibling); }   // fullscreen sits next to exit
  for(const id of ['btn-mp','btn-top','btn-friends']) $('#'+id).classList.remove('small');
  // the "more" sheet gets the rest
  const grid=$('#more-grid');
  for(const id of ['btn-stats','btn-ach-home','btn-codes','btn-settings','btn-music','btn-admin']){ const b=$('#'+id); if(!b) continue; b.classList.remove('small','icon-btn'); b.classList.add('btn'); grid.appendChild(b); }
  $('#btn-settings').textContent=T('home.settings'); $('#btn-music').textContent=T('home.music'); $('#btn-codes').textContent=T('home.codes');
  const help=el('button','btn purple',T('home.help')); help.id='btn-help'; help.addEventListener('click', ()=>{ sfx.click(); if(typeof showControlsHelp==='function') showControlsHelp(); else { $('#more-sheet').classList.remove('show'); $('#level-modal').classList.add('show'); } }); grid.appendChild(help);
  const restore=el('button','btn yellow',T('home.restore')); restore.id='btn-restore'; restore.addEventListener('click', ()=>{ sfx.click(); $('#more-sheet').classList.remove('show'); if(typeof openRestoreCode==='function') openRestoreCode(); }); grid.appendChild(restore);
  const langs=$('#more-langs'); for(const k of Object.keys(LANGS)){ const b=el('button','btn small'+(k===lang?' on':''), LANGS[k].name); b.dataset.lang=k; b.addEventListener('click', ()=>{ sfx.click(); setLang(k); langs.querySelectorAll('.btn').forEach(x=>x.classList.toggle('on', x.dataset.lang===k)); refreshHomeV2(); }); langs.appendChild(b); }
  for(const id of ['btn-settings','btn-music','btn-codes','btn-stats','btn-ach-home','btn-admin']){ $('#'+id).addEventListener('click', ()=>$('#more-sheet').classList.remove('show')); }
  $('#btn-more-close').addEventListener('click', ()=>{ sfx.click(); $('#more-sheet').classList.remove('show'); });
  $('#more-sheet').addEventListener('click', e=>{ if(e.target===$('#more-sheet')) $('#more-sheet').classList.remove('show'); });
  // the other play buttons live in the mode sheet
  const others=$('#mode-others'); for(const id of ['btn-2v2','btn-pk','btn-train','btn-daily','btn-chal']){ const b=$('#'+id); if(!b) continue; b.classList.remove('small'); others.appendChild(b); b.addEventListener('click', ()=>$('#mode-sheet').classList.remove('show')); }
  $('#btn-mode-close').addEventListener('click', ()=>{ sfx.click(); $('#mode-sheet').classList.remove('show'); });
  $('#btn-lvl-close').addEventListener('click', ()=>{ sfx.click(); $('#lvl-sheet').classList.remove('show'); });
  // exit modal: a way back to the start screen
  const stay=$('#btn-stay'); if(stay && !$('#btn-exit-intro')){ const b=el('button','btn small',T('home.exitIntro')); b.id='btn-exit-intro'; b.style.marginTop='10px'; b.addEventListener('click', ()=>{ sfx.click(); $('#exit-modal').classList.remove('show'); showScreen('intro'); }); stay.parentNode.appendChild(b); }
  $('#home .title').addEventListener('click', ()=>{});
  refreshHomeV2();
}

/* ----- refresh: labels, badges, the today card, next-up ----- */
function refreshHomeV2(){
  if(!HOME.built) return;
  const inParty = !!(mp && mp.connected); $('#home').classList.toggle('inparty', inParty);
  $('#home').classList.toggle('guest', inParty && mp.role==='guest');          // #44: a waiting guest gets no level/mode chips
  const lv=homeLevel(), rec=recommendLevel(), md=homeMode();
  const play=$('#btn-play-big');
  if(inParty && mp.role==='guest') play.innerHTML=T('party.waitHost'); else play.innerHTML=T('home.play')+' ▶<small>'+T('home.playSub', T('lvl.'+lv), T(MODE_NAMES[md]||'fmt.quick'))+'</small>';
  play.classList.toggle('pulse', homeNewcomer());
  $('#chip-level').innerHTML=LEVEL_ICON[lv]+' '+T('home.level', T('lvl.'+lv))+(rec>lv ? ' <span class="up">'+T('home.tryHarder')+'</span>' : '');
  $('#chip-mode').textContent=T('home.mode', T(MODE_NAMES[md]||'fmt.quick'));
  $('#btn-more').textContent=T('home.more'); $('#btn-shop').innerHTML=T('home.shop'); $('#btn-chests').innerHTML=T('home.chests'); $('#btn-looks').textContent=T('home.looks'); $('#btn-friends').textContent=T('home.friendsTop');
  $('#btn-mp').innerHTML=T('home.online');                                       // #53: the short column label (the mp screen keeps 'btn.mp')
  $('#more-title').textContent=T('home.more'); $('#lvl-title').textContent=T('home.lvlTitle'); $('#mode-title').textContent=T('home.modeTitle');
  $('#btn-more-close').textContent=T('home.close'); $('#btn-lvl-close').textContent=T('btn.back2'); $('#btn-mode-close').textContent=T('btn.back2');
  $('#btn-settings').textContent=T('home.settings'); $('#btn-music').textContent=T('home.music'); $('#btn-codes').textContent=T('home.codes');   // #5/#54: with their icons, on every refresh
  // badges
  const n=(typeof chestsBadge==='function') ? chestsBadge() : 0; let b=$('#btn-chests .badge'); if(n>0){ if(!b){ b=document.createElement('span'); b.className='badge'; $('#btn-chests').appendChild(b); } b.textContent=n; } else if(b) b.remove();
  const sn=(typeof shopHasNew==='function') && shopHasNew(); let d=$('#btn-shop .dot'); if(sn && !d){ d=document.createElement('span'); d.className='dot'; $('#btn-shop').appendChild(d); } else if(!sn && d) d.remove();
  $('#btn-pk').textContent = (typeof cup!=='undefined' && cup && !cup.champion && !cup.out) ? T('home.cupCont') : T('btn.pk');
  const ttl=(typeof titleText==='function') ? titleText() : ''; let te=$('#home-title-tag'); if(ttl){ if(!te){ te=document.createElement('div'); te.id='home-title-tag'; $('#home-centre').insertBefore(te, $('#home-centre').firstChild); } te.textContent=ttl; } else if(te) te.remove();
  const nc=(typeof nameColorClass==='function') ? nameColorClass() : ''; $('#home-name').className='name'+(nc?' '+nc:'');
  const ws=$('#home-wstreak'); if(ws){ const n=prog.streak|0; ws.hidden=n<2; const nx=[3,5,10].find(x=>x>n)||(Math.floor(n/10)+1)*10; ws.textContent=T('streak.home', n)+' · '+T('streak.next', nx); fitText(ws); }
  refreshTodayCard(); refreshNextUp();
}
function refreshTodayCard(){
  const card=$('#today-card'); if(!card) return;
  if(typeof dailyCardHTML==='function'){ card.innerHTML=dailyCardHTML(); if(typeof bindDailyCard==='function') bindDailyCard(card); return; }
  // fallback until the daily module exists: streak + the daily match + the weekly challenges
  const days=prog.streakDays|0;
  card.innerHTML=`<h3><span>📅 ${T('home.today')}</span>${days?`<span class="flame">${T('home.streakDay',days)}</span>`:''}</h3>`;
  const row=document.createElement('div'); row.className='row';
  const daily=document.createElement('button'); daily.className='btn yellow small'; daily.textContent=T('daily.btn'); daily.addEventListener('click', ()=>$('#btn-daily').click());
  const chal=document.createElement('button'); chal.className='btn green small'; chal.textContent=$('#btn-chal').textContent; chal.addEventListener('click', ()=>$('#btn-chal').click());
  card.appendChild(daily); card.appendChild(chal);
}
function refreshNextUp(){
  const nu=$('#nextup'); if(!nu) return;
  const c=NextUp.best();
  if(!c){ nu.classList.remove('on'); nu.innerHTML=''; return; }
  nu.classList.add('on'); nu.hidden=true; nu.innerHTML=`<span class="nu-ic">${c.icon||'👉'}</span><span class="nu-text">${esc(c.text)}</span>`;
  const b=document.createElement('button'); b.className='btn small green'; b.textContent=c.btn||T('home.go'); b.addEventListener('click', ()=>{ sfx.click(); try{ c.action(); }catch(e){} }); nu.appendChild(b);
}
NextUp.add(()=>({prio:1, icon:'⚽', text:T('home.playMore'), action:homePlay, claim:false}));

/* ----- smart PLAY ----- */
/* #47: a newcomer has neither a finished match nor a win (old saves may count wins without matches) */
function homeNewcomer(){ return (prog.matches|0)===0 && !(prog.wins|0); }
function homePlay(){
  sfx.click();
  if(mp && mp.connected){ $('#btn-play').click(); return; }                 // party: the original logic (host starts / guest waits)
  if(mp) mpTeardown();
  if(homeNewcomer()){ settings.lastLevel=0; settings.format='quick'; saveSettings(); }   // the very first match: easy and quick
  v2Pending=null; dailyMatch=false; forcedOpp=null;
  const lv=homeLevel(); ECON._lastLevel=lv;
  if(typeof onboardingBeforePlay==='function' && onboardingBeforePlay(lv)) return;   // the onboarding module may take over (controls overlay)
  startOfflineMatch(lv);
}
/* ----- level sheet ----- */
function openLevelSheet(){
  const grid=$('#lvl-grid'); grid.innerHTML=''; const cur=homeLevel(), rec=recommendLevel();
  LEVELS.forEach((L,i)=>{
    const b=document.createElement('button'); b.className=`btn lvcard ${L.color}`+(i===cur?' on':'');
    b.innerHTML=`<div class="lvico">${LEVEL_ICON[i]}</div><div class="lvname">${T('lvl.'+i)}</div>${i===rec && rec!==cur ? `<span class="rec">${T('home.recommended')}</span>` : ''}`;
    b.addEventListener('click', ()=>{ sfx.click(); settings.lastLevel=i; saveSettings(); ECON._lastLevel=i; $('#lvl-sheet').classList.remove('show'); refreshHomeV2(); });
    grid.appendChild(b);
  });
  $('#lvl-keys').innerHTML = document.body.classList.contains('touch') ? '' : T('level.keys');
  $('#lvl-sheet').classList.add('show');
}
/* ----- mode sheet ----- */
function openModeSheet(){
  const row=$('#mode-fmts'); row.innerHTML='';
  const subs={quick:'fmt.quickSub', classic:'fmt.classicSub', golden:'fmt.goldenSub'};
  for(const k of ['quick','classic','golden']){
    const b=document.createElement('button'); b.className='btn '+(k==='quick'?'green':k==='classic'?'blue':'yellow')+(homeMode()===k && !settings.bo3 ? ' on':'');
    b.innerHTML=`${T(MODE_NAMES[k])}<small>${T(subs[k])}</small>`;
    b.addEventListener('click', ()=>{ sfx.click(); settings.format=k; settings.bo3=false; saveSettings(); $('#mode-sheet').classList.remove('show'); refreshHomeV2(); });
    row.appendChild(b);
  }
  const inParty = !!(mp && mp.connected);
  if(inParty){ const b=document.createElement('button'); b.className='btn purple'+(settings.bo3?' on':''); b.innerHTML=`${T('home.bo3')}<small>${T('home.bo3Sub')}</small>`; b.addEventListener('click', ()=>{ sfx.click(); settings.format='quick'; settings.bo3=true; saveSettings(); $('#mode-sheet').classList.remove('show'); refreshHomeV2(); }); row.appendChild(b); }
  $('#mode-others').hidden=inParty;                                            // #39: training / daily / cup / 2v2 would silently leave the team
  $('#mode-sheet').classList.add('show');
}
function openMoreSheet(){ $('#btn-admin').hidden=!isAdmin(); $('#more-sheet').classList.add('show'); }

/* #40: leaving a party (or the last guest leaving) only calls partyRefresh — relayout the home screen too */
{ const _hpr=partyRefresh; partyRefresh=function(){ _hpr.apply(this, arguments); if(HOME.built && $('#home').classList.contains('active')) refreshHomeV2(); }; }
/* #43: the party modal starts from the level chosen on the home chip, and a choice in the modal flows back to the chip */
{ const _hop=openPartyModal; openPartyModal=function(){ partyLevel=homeLevel(); return _hop.apply(this, arguments); }; }
$('#party-levels').addEventListener('click', e=>{ const b=e.target.closest('[data-lv]'); if(!b) return; const lv=+b.dataset.lv; if(!(lv>=0 && lv<=5)) return; settings.lastLevel=lv; saveSettings(); ECON._lastLevel=lv; if(HOME.built) refreshHomeV2(); });
/* #55: the CEO screen's confetti stops on ANY way out, not only its own back button */
Hooks.on('screen', id=>{ if(id!=='ceo' && typeof ceoTimer!=='undefined' && ceoTimer){ clearInterval(ceoTimer); ceoTimer=0; } });
/* #44: when a match screen appears nothing stays open on top of it (a pending question resolves "no") */
Hooks.on('screen', id=>{
  if(id!=='game') return;
  document.querySelectorAll('.overlay.show').forEach(o=>{
    if(o.id==='pause-modal' || o.id==='ban-overlay') return;
    if(o.id==='ask-modal'){ const no=$('#btn-ask-no'); if(no && no.onclick) no.onclick(); else o.classList.remove('show'); }
    else o.classList.remove('show');
  });
});

/* ----- the back button / browser history: back closes the top modal, then leaves a screen, then asks before exiting ----- */
const UI={stack:[], ignore:0, popping:false, ready:false};
function uiPush(tag){ UI.stack.push(tag); try{ history.pushState({fs:tag}, ''); }catch(e){} }
function uiForget(tag){ const i=UI.stack.lastIndexOf(tag); if(i>=0) UI.stack.splice(i,1); }   // the history entry stays (same URL); the next back press simply pops it and acts on whatever is open then
function uiSetup(){
  if(UI.ready) return; UI.ready=true;
  try{ history.replaceState({fs:'root'}, ''); history.pushState({fs:'sentinel'}, ''); }catch(e){}
  // #46: overlays the kid must not be able to dismiss (the ban screen, or anything marked data-noback) never enter the stack
  const noBack=el=>el.id==='ban-overlay' || el.dataset.noback!==undefined;
  const obs=new MutationObserver(muts=>{ for(const m of muts){ const el=m.target; if(!el.classList || !el.classList.contains('overlay') || noBack(el)) continue; const shown=el.classList.contains('show'); if(shown && !el._uiShown){ el._uiShown=true; uiPush('#'+el.id); } else if(!shown && el._uiShown){ el._uiShown=false; uiForget('#'+el.id); } } });
  document.querySelectorAll('.overlay').forEach(o=>obs.observe(o,{attributes:true, attributeFilter:['class']}));
  Hooks.on('screen', id=>{ const tag='screen'; const has=UI.stack.includes(tag); if(id==='home' || id==='intro'){ if(has) uiForget(tag); } else if(!has) uiPush(tag); });
  window.addEventListener('popstate', ()=>{
    if(UI.ignore>0){ UI.ignore--; return; }
    const ban=$('#ban-overlay'); if(ban && ban.classList.contains('show')){ try{ history.pushState({fs:'sentinel'}, ''); }catch(e){} return; }   // #46: back does nothing while banned
    const top=UI.stack[UI.stack.length-1];
    const inParty=!!(mp && mp.connected);
    UI.popping=true;
    try{
      if(top && top[0]==='#'){
        const el=$(top); UI.stack.pop();
        if(el){
          if(el.id==='pause-modal' && state==='paused'){ resumeGame(); }
          else if(el.id==='ask-modal'){ const no=$('#btn-ask-no'); if(no && no.onclick) no.click(); else el.classList.remove('show'); }   // #45: the question resolves "no" so nothing stays stuck waiting
          else if(el.id==='end'){ if(typeof endcardHome==='function') endcardHome(); else $('#btn-end-home2').click(); }                   // #48: back from the result card = the 🏠 button
          else el.classList.remove('show');
        }
      }
      else if(top==='screen'){
        if(state==='play' || state==='countdown' || state==='celebrate' || state==='replay'){ UI.popping=false; pauseGame(); }   // never quit a match with one press
        else if(['penalty','corner','training'].includes(state)){ UI.popping=false; pauseGame(); }
        else {
          UI.stack.pop();
          if(state==='end') goHome();
          else if(typeof quitToHome==='function' && (training||pk)) quitToHome();
          else {
            // #51/#55: a screen's own back button knows how to leave it (lobby teardown, confetti timer…); in a party keep the team
            const back=document.querySelector('.screen.active .btn[id$="-back"], .screen.active #shop-back');
            if(back && !back.hidden && !inParty) back.click(); else showScreen('home');
          }
        }
      }
      else if($('#home').classList.contains('active')){
        if(inParty){ ask(T('party.leaveQ')).then(ok=>{ if(ok){ mpTeardown(); partyRefresh(); toast(T('party.left'),'warn'); } }); }   // #34/#49: never drop the team on one press
        else $('#btn-exit').click();
      }
    }catch(e){}
    UI.popping=false;
    try{ history.pushState({fs:'sentinel'}, ''); }catch(e){}            // keep one state to pop so the page never unloads on back
  });
}

/* ----- wiring ----- */
Hooks.on('home', ()=>{ if(!HOME.built) buildHomeV2(); refreshHomeV2(); });
Hooks.on('wallet', ()=>{ if(HOME.built && $('#home').classList.contains('active')) refreshHomeV2(); });
Hooks.on('screen', id=>{ if(id==='home' && HOME.built) setTimeout(refreshHomeV2, 50); });
Hooks.on('matchEnd', ()=>{ settings.lastLevel=homeLevel(); saveSettings(); });
/* every 30 s: the next-up line; and when the day turns (#65) the whole today card, streak and missions */
HOME.lastDay=dayKey();
setInterval(()=>{
  if(!HOME.built || !$('#home').classList.contains('active') || document.querySelector('.overlay.show')) return;
  const d=dayKey(); if(d!==HOME.lastDay){ HOME.lastDay=d; refreshHomeV2(); } else refreshNextUp();
}, 30000);
buildHomeV2(); uiSetup(); applyLang();
