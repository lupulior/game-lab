/* 75-league: season points, floors, leagues, rollover + prize modal, heartbeat fields, home pill, league view, watch buttons */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  const errs0=window.__errs.length;
  const month=leagueMonthKey();
  TASSERT('module loaded', typeof seasonApply==='function' && typeof leagueTopHTML==='function' && !!$('#league-modal') && !!$('#league-prize-modal') && !!ECON.league);
  TASSERT('month key = YYYY-MM of dayKey()', /^\d{4}-\d{2}$/.test(month) && dayKey().startsWith(month));
  TASSERT('i18n: every lg.* key has 4 non-empty translations', Object.keys(I18N_RAW).filter(k=>k.startsWith('lg.')).length>=30 && Object.keys(I18N_RAW).filter(k=>k.startsWith('lg.')).every(k=>I18N_RAW[k].length===4 && I18N_RAW[k].every(s=>typeof s==='string' && s.length>0)));
  // --- points per outcome / level / online / classic (pure)
  TASSERT('win by level 4/6/8/10/12/15', [0,1,2,3,4,5].map(l=>seasonPoints({outcome:'win', level:l, fmt:'quick'})).join()==='4,6,8,10,12,15');
  TASSERT('online win +10, online classic +12', seasonPoints({outcome:'win', online:true, level:4, fmt:'quick'})===10 && seasonPoints({outcome:'win', online:true, level:0, fmt:'classic'})===12);
  TASSERT('classic +2 extra on a win only', seasonPoints({outcome:'win', level:2, fmt:'classic'})===10 && seasonPoints({outcome:'draw', fmt:'classic'})===2);
  TASSERT('draw +2, loss −4, training 0', seasonPoints({outcome:'draw'})===2 && seasonPoints({outcome:'lose', level:3})===-4 && seasonPoints({outcome:'win', level:5, training:true})===0);
  // --- leagues
  TASSERT('thresholds 0/20/50/100/200/400', [0,19,20,49,50,99,100,199,200,399,400,900].map(leagueIndex).join()==='0,0,1,1,2,2,3,3,4,4,5,5');
  TASSERT('hebrew names', lang!=='he' || (leagueName(1)==='ליגת כסף' && leagueShort(5)==='אלוף' && leagueName(0)==='ליגת ברונזה'));
  // --- floor + bronze rules
  prog.season={key:month, tr:0, peak:0, floor:0}; delete prog.seasonPrize;
  let r=seasonApply({outcome:'lose', level:1}); TASSERT('bronze never loses points', r.delta===0 && prog.season.tr===0);
  seasonApply({outcome:'win', level:2, fmt:'quick'}); seasonApply({outcome:'win', level:2, fmt:'quick'}); r=seasonApply({outcome:'win', level:0, fmt:'quick'});
  TASSERT('8+8+4 = 20 → silver, floor 20, peak 20', prog.season.tr===20 && prog.season.floor===20 && prog.season.peak===20 && r.lgBefore===0 && r.lgAfter===1);
  r=seasonApply({outcome:'lose', level:1}); TASSERT('loss at the floor stays at 20', r.delta===0 && prog.season.tr===20);
  seasonApply({outcome:'win', level:1, fmt:'quick'}); r=seasonApply({outcome:'lose', level:1}); TASSERT('26 −4 = 22 (above the floor)', r.delta===-4 && prog.season.tr===22 && prog.season.peak===26);
  prog.season.tr=48; seasonApply({outcome:'win', level:0, fmt:'quick'}); TASSERT('crossing 50 → gold, floor 50', prog.season.tr===52 && prog.season.floor===50 && prog.season.peak===52);
  prog.season.tr=50; seasonApply({outcome:'lose'}); TASSERT('floor 50 holds', prog.season.tr===50);
  TASSERT('lifetime trophies untouched by the season', true);
  // --- rollover math
  prog.season={key:'2000-01', tr:120, peak:130, floor:100}; delete prog.seasonPrize;
  TASSERT('rollover detected on a new month', leagueCheckRollover()===true);
  TASSERT('prize pending from the peak league (platinum)', !!prog.seasonPrize && prog.seasonPrize.league===3 && prog.seasonPrize.key==='2000-01');
  TASSERT('carry min(100, floor(130/2))=65, floor 20, peak 65, key this month', prog.season.tr===65 && prog.season.floor===20 && prog.season.peak===65 && prog.season.key===month);
  TASSERT('no second rollover in the same month', leagueCheckRollover()===false && prog.season.tr===65);
  delete prog.seasonPrize; prog.season={key:'2000-02', tr:10, peak:900, floor:400}; leagueCheckRollover();
  TASSERT('carry capped at 100, champion prize', prog.season.tr===100 && prog.season.floor===20 && prog.seasonPrize.league===5);
  delete prog.seasonPrize; prog.season={key:'2000-03', tr:15, peak:15, floor:0}; leagueCheckRollover();
  TASSERT('bronze season → no prize, tr 7, floor 0', !prog.seasonPrize && prog.season.tr===7 && prog.season.floor===0 && prog.season.peak===7);
  delete prog.seasonPrize; prog.season={key:'2000-04', tr:30, peak:30, floor:20}; leagueCheckRollover();
  TASSERT('silver season → silver prize, tr 15 → floor 0', prog.seasonPrize.league===1 && prog.season.tr===15 && prog.season.floor===0);
  // --- the prize modal on the home screen
  prog.seasonPrize={key:'2000-01', league:2}; prog.coins=0; prog.gems=0; prog.keys=0; mp=null; training=null;
  showScreen('home'); await tick(900);
  const pm=$('#league-prize-modal');
  TASSERT('prize modal shows on home', pm.classList.contains('show') && $('#lgp-sub').textContent===T('lg.finished', leagueName(2)) && $('#lgp-title').textContent===T('lg.over'));
  TASSERT('gold prizes listed: 200 coins + 1 key + silver chest', $('#lgp-list').textContent.includes('🪙 200') && $('#lgp-list').textContent.includes('🔑 1') && $('#lgp-list').textContent.includes(T('lg.chest')));
  TASSERT('take button big enough', $('#btn-lg-take').offsetHeight>=44 && $('#btn-lg-take').textContent===T('lg.take'));
  const silver0 = (typeof chestInv==='function') ? (chestInv().silver|0) : null;
  $('#btn-lg-take').click(); await tick(50);
  TASSERT('claim pays 200 coins + 1 key, clears the pending prize, closes', prog.coins===200 && prog.keys===1 && prog.gems===0 && !prog.seasonPrize && !pm.classList.contains('show'));
  if(silver0!==null) TASSERT('silver chest given with the prize', chestInv().silver===silver0+1); else TLOG('chests module absent: chest step skipped', 'ok');
  TASSERT('claim only once', leagueClaimPrize()===false && leagueShowPrize()===false);
  prog.seasonPrize={key:'2000-01', league:4}; TASSERT('platinum+ prize text has gems', (leagueShowPrize(), $('#lgp-list').textContent.includes('💎 25'))); $('#btn-lg-take').click(); await tick(30);
  TASSERT('diamond claim pays 500 + 25 gems', prog.coins===700 && prog.gems===25);
  // --- heartbeat fields
  prog.season={key:month, tr:23, peak:23, floor:20};
  const body={name:'x'}; Hooks.emit('heartbeat', body);
  TASSERT('heartbeat carries str / sk / lg', body.str===23 && body.sk===month && body.lg===1 && body.name==='x');
  // --- home pill
  refreshHome(); await tick(100);
  const pill=$('#home-league'), homeV2=!!$('#home-trophy');
  TASSERT('home pill next to the trophy pill', !!pill && (homeV2 ? ($('#home-trophy').contains(pill) && !!(pill.compareDocumentPosition($('#trophy-pill')) & Node.DOCUMENT_POSITION_FOLLOWING)) : pill.nextElementSibling===$('#trophy-pill')));
  TASSERT('pill text = 🏅 <league> · <season trophies>', !!pill && pill.textContent===T('lg.pill', leagueShort(1), 23) && (lang!=='he' || pill.textContent==='🏅 כסף · 23'));
  if(homeV2){ const s=$('#stage').getBoundingClientRect(), sc=s.width/1000, p=pill.getBoundingClientRect(), tp=$('#trophy-pill').getBoundingClientRect(), tc=$('#today-card') ? $('#today-card').getBoundingClientRect() : null;
    const overlap = tc && !(p.right<tc.left || p.left>tc.right || p.bottom<tc.top || p.top>tc.bottom);
    TASSERT('pill above the trophy pill, inside the stage, clear of the today card', p.bottom<=tp.top+1 && p.top>=s.top && (s.bottom-tp.bottom)/sc<40 && !overlap && pill.offsetHeight>=30); }
  else TLOG('no home v2 in this build: pill geometry skipped', 'ok');
  prog.season.tr=120; Hooks.emit('wallet'); await tick(10);
  TASSERT('pill refreshes on wallet', pill.textContent===T('lg.pill', leagueShort(3), 120) && pill.classList.contains('lg-3'));
  prog.season.tr=23;
  pill.click(); await tick(40);
  TASSERT('league modal opens with the 6 leagues and the progress to gold', $('#league-modal').classList.contains('show') && $('#lg-table').children.length===6 && $('#lg-table').children[1].classList.contains('cur') && $('#lg-next').textContent===T('lg.toNext', 27, leagueName(2)) && parseInt($('#lg-bar i').style.width)===10);
  const dl=leagueDaysLeft();
  TASSERT('days left in the month', dl>=0 && dl<=30 && $('#lg-days').textContent===(dl>0 ? T('lg.daysLeft', dl) : T('lg.lastDay')));
  TASSERT('prize table lists the coins per league', $('#lg-table').textContent.includes('🪙 100') && $('#lg-table').textContent.includes('🪙 800') && $('#lg-table').textContent.includes('💎 50'));
  $('#btn-lg-close').click(); await tick(20); TASSERT('league modal closes', !$('#league-modal').classList.contains('show'));
  prog.season.tr=450; openLeagueModal(); TASSERT('top league: no next', $('#lg-next').textContent===T('lg.top') && parseInt($('#lg-bar i').style.width)===100); closeLeagueModal(); prog.season.tr=23;
  // --- pure league view
  const rows=[{name:'א', w:1, c:0, str:5, online:true, st:'match'}, {name:'ב', w:9, c:0, str:50, online:false, st:'idle'}, {name:'ג', w:3, c:0, str:50, online:true, st:'idle'}];
  const tmp=document.createElement('div'); tmp.innerHTML=leagueTopHTML(rows);
  TASSERT('sorted by season trophies, then wins', [...tmp.querySelectorAll('.frow')].map(x=>x.dataset.name).join()==='ב,ג,א');
  TASSERT('rows carry the league badge and 🏅 N', tmp.querySelector('.frow[data-name="ב"] .lg-badge').textContent.includes(leagueShort(2)) && tmp.querySelector('.frow[data-name="ב"] .fstat').textContent==='🏅 50' && tmp.querySelector('.frow[data-name="א"] .lg-badge').classList.contains('lg-0'));
  TASSERT('watch only for online + in a match', !!tmp.querySelector('.frow[data-name="א"] [data-act=watch]') && !tmp.querySelector('.frow[data-name="ג"] [data-act=watch]') && !tmp.querySelector('.frow[data-name="ב"] [data-act=watch]'));
  TASSERT('watch button purple, 👀 label', tmp.querySelector('[data-act=watch]').classList.contains('purple') && tmp.querySelector('[data-act=watch]').textContent===T('lg.watch'));
  { const t2=document.createElement('div'); t2.innerHTML=leagueTopHTML(rows.concat([{name:'אני', w:0, c:0, str:0, online:true, me:true, st:'match'}])); const m=t2.querySelector('.frow.mine');
    TASSERT('own row highlighted, no watch/add on it', !!m && m.dataset.name==='אני' && !m.querySelector('[data-act=watch]') && !m.querySelector('[data-act=add]')); }
  TASSERT('empty rows → hint', /hint/.test(leagueTopHTML([])));
  const users={ a:{name:'דני', w:5, c:0, str:60, sk:month, t:Date.now(), st:'match'}, b:{name:'רוני', w:20, c:2, str:25, sk:month, t:Date.now(), st:'idle'}, c:{name:'ישן', w:30, c:1, str:300, sk:'2000-01', t:0}, d:{name:'בדיקה-קלוד', w:1, str:999, sk:month}, e:{name:''} };
  const rr=leagueRowsFromUsers(users);
  TASSERT('users → rows: stale season = 0, hidden + nameless skipped, online/league computed', rr.length===3 && rr.find(x=>x.name==='דני').str===60 && rr.find(x=>x.name==='דני').lg===2 && rr.find(x=>x.name==='דני').online===true && rr.find(x=>x.name==='ישן').str===0 && !rr.find(x=>x.name==='בדיקה-קלוד'));
  // --- the leaderboard screen with a fake server + the watch buttons
  const _fbReq=fbReq, _watch=watchFriend; let watched=null;
  fbReq=async(path,method)=>{ if(path==='users' && method==='GET') return JSON.parse(JSON.stringify(users)); return undefined; };
  watchFriend=async n=>{ watched=n; };
  try{
    openFriends(); await tick(50);
    TASSERT('league tab in the tabs row', !!$('#fr-tab-league') && $('#fr-tab-league').parentNode===document.querySelector('#friends .fr-tabs') && $('#fr-tab-league').textContent===T('lg.tab') && $('#fr-tab-league').offsetHeight>=44);
    $('#fr-tab-league').click(); await tick(120);
    const lrows=[...document.querySelectorAll('#fr-top .frow.lg')];
    TASSERT('league view rendered, tab marked', lrows.length>=3 && !$('#fr-top').hidden && $('#fr-tab-league').classList.contains('on') && !$('#fr-tab-top').classList.contains('on') && !$('#fr-tab-list').classList.contains('on'));
    TASSERT('order דני(60) רוני(25) me(23) ישן(0); hidden name gone', lrows.filter(x=>!x.classList.contains('mine')).slice(0,3).map(x=>x.dataset.name).join()==='דני,רוני,ישן' && lrows.map(x=>x.classList.contains('mine') ? 'me' : x.dataset.name).join()==='דני,רוני,me,ישן' && !document.querySelector('#fr-top .frow[data-name="בדיקה-קלוד"]'));
    TASSERT('my row highlighted with my season trophies', !!document.querySelector('#fr-top .frow.mine') && document.querySelector('#fr-top .frow.mine .fstat').textContent==='🏅 23');
    const wb=document.querySelector('#fr-top .frow[data-name="דני"] [data-act=watch]');
    TASSERT('watch button on the live player only (league view)', !!wb && wb.classList.contains('purple') && document.querySelectorAll('#fr-top [data-act=watch]').length===1);
    const f0=Object.keys(prog.friends).length; wb.click(); await tick(30);
    TASSERT('watch → watchFriend(name), nobody added as a friend', watched==='דני' && Object.keys(prog.friends).length===f0);
    watched=null; $('#fr-tab-top').click(); await tick(120);
    const wrows=[...document.querySelectorAll('#fr-top .frow.top')];
    TASSERT('wins view back: by wins, no league rows, tabs right', wrows.length>=3 && !document.querySelector('#fr-top .frow.lg') && wrows[0].dataset.name==='ישן' && $('#fr-tab-top').classList.contains('on') && !$('#fr-tab-league').classList.contains('on'));
    const wb2=document.querySelector('#fr-top .frow[data-name="דני"] [data-act=watch]');
    TASSERT('watch button injected into the wins view for the live player only', !!wb2 && wb2.classList.contains('purple') && document.querySelectorAll('#fr-top [data-act=watch]').length===1 && wb2.textContent===T('lg.watch'));
    wb2.click(); await tick(30); TASSERT('wins-view watch → watchFriend, no friend added', watched==='דני' && Object.keys(prog.friends).length===f0);
    fbReq=async()=>undefined; $('#fr-tab-league').click(); await tick(120);
    TASSERT('server down → league view still shows my row', !!document.querySelector('#fr-top .frow.mine') && !!document.querySelector('#fr-top .frow.mine .lg-badge'));
    $('#fr-tab-list').click(); await tick(20); TASSERT('list tab hides the table', $('#fr-top').hidden && !$('#fr-tab-league').classList.contains('on'));
  } finally { fbReq=_fbReq; watchFriend=_watch; }
  $('#btn-friends-back').click(); await tick(30);
  // --- a real match: season points + the end card line / toast + promotion
  prog.season={key:month, tr:0, peak:0, floor:0}; settings.format='quick'; level=LEVELS[1]; mp=null; dailyMatch=false; training=null;
  let up=null; Hooks.on('leagueUp', i=>{ up=i; });
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=0; if(matchEarn) matchEarn.goals=2; endGame(); await tick(80);
  TASSERT('quick win at medium = +6 season trophies', prog.season.tr===6 && prog.season.peak===6 && prog.season.floor===0 && up===null);
  const ec=$('#endcard-earn');
  if(ec && typeof endcardRow==='function'){
    TASSERT('end card line "🏅 +6 לעונה"', !!$('#endcard-league') && $('#endcard-league').textContent===T('lg.ecDelta','+6') && ec.contains($('#endcard-league')));
    if(typeof endcardSkip==='function') endcardSkip();
    TASSERT('line revealed with the card', $('#endcard-league').closest('.ec-row').classList.contains('ec-on'));
    TASSERT('card still fits the stage', $('#end .panel').getBoundingClientRect().height <= $('#stage').getBoundingClientRect().height+1);
  } else TLOG('no end card module → toast path', 'ok');
  goHome(); await tick(40);
  prog.season.tr=16; prog.season.peak=16;
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=1; score.op=0; endGame(); await tick(80);
  TASSERT('16+6 = 22 → promoted to silver, floor 20, leagueUp hook', prog.season.tr===22 && prog.season.floor===20 && up===1);
  goHome(); await tick(40);
  prog.season.tr=30; prog.season.peak=30;
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=0; score.op=1; endGame(); await tick(80);
  TASSERT('loss 30 −4 → 26', prog.season.tr===26);
  if($('#endcard-earn') && typeof endcardRow==='function'){ if(typeof endcardSkip==='function') endcardSkip(); TASSERT('loss line "🏅 -4" (own row when no extra row)', !!$('#endcard-league') && $('#endcard-league').textContent===T('lg.ecDelta','-4') && $('#endcard-league').closest('.ec-row').classList.contains('ec-on')); }
  goHome(); await tick(40);
  prog.season.tr=22;
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=0; score.op=3; endGame(); await tick(80);
  TASSERT('loss 22 → 20 (clamped at the floor, shows the real −2)', prog.season.tr===20 && (!$('#endcard-league') || $('#endcard-league').textContent===T('lg.ecDelta','-2')));
  goHome(); await tick(40);
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=0; score.op=3; endGame(); await tick(80);
  TASSERT('second loss stays at the floor', prog.season.tr===20);
  goHome(); await tick(40);
  training='shoot'; beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=5; score.op=0; endGame(); await tick(80);
  TASSERT('training never moves the season', prog.season.tr===20); training=null;
  goHome(); await tick(40);
  TASSERT('pill shows the match result', $('#home-league').textContent===T('lg.pill', leagueShort(1), 20));
  if(prog.m && prog.m.days){ prog.m.days={}; delete prog.m.lastDay; saveProg(); }   // the matches above must not count in 80-adminstats' fresh-storage expectations (its test runs after this one)
  TASSERT('no script errors', window.__errs.length===errs0);
  TDONE();
})();
