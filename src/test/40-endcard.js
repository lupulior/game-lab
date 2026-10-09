/* 40-endcard: the reward ceremony on the result card */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const vis=el=>!!el && !el.hidden && el.offsetParent!==null;
  let last=null; Hooks.on('matchEnd', i=>{ last=i; });
  TASSERT('module loaded', typeof endcardRender==='function' && !!$('#endcard-earn') && !!$('#endcard-btns'));
  TASSERT('block sits inside the #end panel', $('#endcard-earn').parentNode===$('#end .panel') && $('#endcard-btns').parentNode===$('#end-btns'));

  // ---- a quick win at Medium
  settings.format='quick'; level=LEVELS[1]; mp=null; dailyMatch=false; training=null;
  prog.coinDay={key:dayKey(), n:0}; prog.keyDay={key:dayKey(), n:0}; prog.streakLast=null; prog.streakNew=false; prog.streak=0;
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=0; matchEarn.goals=2; endGame();
  await wait(30); endcardSkip(); await wait(30);
  TASSERT('matchEnd info received (win)', !!last && last.outcome==='win' && last.pay && last.earn.coins>0);
  TASSERT('end overlay shown with the earn block', $('#end').classList.contains('show') && vis($('#endcard-earn')));
  TASSERT('plain #end-xp hidden', $('#end-xp').hidden===true);
  TASSERT('coin line = earned coins', $('#endcard-coins') && $('#endcard-coins').textContent==='🪙 +'+fmtNum(last.earn.coins));
  const partsTxt=$('#endcard-parts').textContent;
  TASSERT('breakdown lists every part', last.pay.parts.length>=3 && last.pay.parts.every(p=>partsTxt.includes(T(p[0])) && partsTxt.includes('+'+fmtNum(p[1]))));
  TASSERT('win parts include win + goals + clean sheet', partsTxt.includes(T('end.pWin')) && partsTxt.includes(T('end.pGoals')) && partsTxt.includes(T('end.pClean')));
  TASSERT('multiplier chip only when mult>1', (last.pay.mult>1) === partsTxt.includes('×'));
  TASSERT('daily cap bar shows today', !!$('#endcard-cap-bar') && $('.ec-cap').textContent.includes(fmtNum(dayCounter('coinDay').n)) && $('.ec-cap').textContent.includes(fmtNum(coinCapToday())));
  const capW=parseInt($('#endcard-cap-bar>i').style.width)||0;
  TASSERT('cap bar width = used %', capW===Math.min(100, Math.round(dayCounter('coinDay').n/coinCapToday()*100)));
  TASSERT('XP bar at level progress', !!$('#endcard-xp-bar') && parseInt($('#endcard-xp-bar>i').style.width)===levelProgress().pct && $('#endcard-xp').textContent==='⭐ +'+last.earn.xp);
  TASSERT('trophy line', !!$('#endcard-trophies') && $('#endcard-trophies').textContent.includes('+'+last.trophies));
  TASSERT('key line (medium win pays a key)', last.earn.keys===1 && !!$('#endcard-keys'));
  TASSERT('streak day line shown and flag cleared', !!$('#endcard-streak') && $('#endcard-streak').textContent.includes(String(prog.streakDays)) && prog.streakNew===false);
  TASSERT('all rows revealed after skip', [...document.querySelectorAll('#endcard-earn .ec-row')].every(r=>r.classList.contains('ec-on')));
  TASSERT('no tip on a win', !$('#endcard-tip'));
  TASSERT('buttons: more + again + home visible, share hidden, core buttons hidden', vis($('#btn-ec-more')) && vis($('#btn-ec-again')) && vis($('#btn-ec-home')) && $('#btn-ec-share').hidden && $('#btn-end-again').hidden && $('#btn-end-home2').hidden);
  TASSERT('button labels localized', $('#btn-ec-more').textContent===T('ec.more') && $('#btn-ec-again').textContent===T('ec.again'));
  TASSERT('buttons tall enough for thumbs', $('#btn-ec-more').offsetHeight>=44 && $('#btn-ec-home').offsetHeight>=44);
  TASSERT('panel fits the stage', $('#end .panel').getBoundingClientRect().height <= $('#stage').getBoundingClientRect().height+1);

  // ---- ▶ more: a NEW opponent, same level
  const prevOp=opChar, prevLv=level.i;
  $('#btn-ec-more').click(); await wait(50);
  TASSERT('more → a new countdown', state==='countdown' && $('#game').classList.contains('active') && !$('#end').classList.contains('show'));
  TASSERT('more → different opponent, same level', opChar && opChar.id!==prevOp.id && level.i===prevLv && !dailyMatch);
  TASSERT('more → earn block closed', $('#endcard-earn').hidden && $('#endcard-btns').hidden);
  // repeat a few times: never the same opponent twice in a row
  let ok=true; for(let k=0;k<6;k++){ const o=opChar; state='play'; score.me=1; score.op=0; endGame(); await wait(10); $('#btn-ec-more').click(); await wait(10); if(opChar.id===o.id) ok=false; }
  TASSERT('more never repeats the opponent (6 tries)', ok);

  // ---- a loss shows a tip and the "for trying" coins
  state='play'; score.me=0; score.op=2; endGame(); await wait(30); endcardSkip(); await wait(10);
  TASSERT('loss: tip shown', last.outcome==='lose' && !!$('#endcard-tip') && $('#endcard-tip').textContent===T('ec.tip0'));
  TASSERT('loss: still pays coins', $('#endcard-coins').textContent==='🪙 +'+fmtNum(last.earn.coins) && last.earn.coins>0 && $('#endcard-parts').textContent.includes(T('end.pLoss')));
  // a loss with many goals conceded picks a defending tip
  state='play'; score.me=1; score.op=4; if(matchEarn) matchEarn.goals=1; endGame(); await wait(30); endcardSkip();
  TASSERT('loss 1-4: defending/slide tip', ['ec.tip1','ec.tip4'].map(k=>T(k)).includes($('#endcard-tip').textContent));

  // ---- 🔄 again: the same opponent
  const sameOp=opChar; $('#btn-ec-again').click(); await wait(30);
  TASSERT('again → same opponent, countdown', state==='countdown' && opChar.id===sameOp.id);
  state='play'; score.me=0; score.op=1; endGame(); await wait(10);

  // ---- 🏠 home
  $('#btn-ec-home').click(); await wait(20);
  TASSERT('home → home screen, card closed', state==='idle' && $('#home').classList.contains('active') && !$('#end').classList.contains('show') && $('#endcard-btns').hidden);
  TASSERT('core buttons restored after close', !$('#btn-end-again').hidden && !$('#btn-end-home2').hidden);

  // ---- optional modules: share, missions, personality, chests
  let shared=null; window.shareResult=i=>{ shared=i; };
  window.dailyMissionStatus=()=>[{text:'A', done:true},{text:'B', done:false, prog:1, n:3},{text:'C', done:false}];   // #64: the daily module's real shape
  window.botPersonality=c=>({icon:'🧱', name:'Wall'});
  window.openChestsScreen=()=>{ opened=true; }; let opened=false;
  prog.keyDay={key:dayKey(), n:0}; prog.keys=0;
  level=LEVELS[2]; beginMatch(CHARS[2], CHARS[3]); state='play'; score.me=3; score.op=0; matchEarn.goals=3; endGame(); await wait(30); endcardSkip(); await wait(10);
  TASSERT('share button appears with shareResult', vis($('#btn-ec-share')));
  $('#btn-ec-share').click(); TASSERT('share → shareResult(info)', shared===last && $('#end').classList.contains('show'));
  TASSERT('mission ticks: 3 shown, 1 done', document.querySelectorAll('.ec-mission').length===3 && document.querySelectorAll('.ec-mission.ec-done').length===1 && $('.ec-missions').textContent.includes('1/3'));
  TASSERT('bot personality line', !!$('#endcard-bot') && $('#endcard-bot').textContent.includes('🧱') && $('#endcard-bot').textContent.includes('Wall'));
  TASSERT('"open now" next to the key', !!$('#btn-ec-open'));
  $('#btn-ec-open').click(); await wait(10); TASSERT('open now → openChestsScreen', opened===true);
  TASSERT('#50 open now leaves the match properly', state==='idle' && !$('#end').classList.contains('show') && $('#endcard-btns').hidden);
  delete window.shareResult; delete window.dailyMissionStatus; delete window.botPersonality; delete window.openChestsScreen;

  // ---- #28: a new match closes a card still revealing
  settings.reducedMotion=false; level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=0; matchEarn.goals=2; endGame(); await wait(30);
  TASSERT('#28 card revealing (timers pending)', !$('#endcard-earn').hidden && ENDCARD.timers.length>0);
  beginMatch(CHARS[0], CHARS[2]); await wait(10);
  TASSERT('#28 beginMatch closes the card and stops the reveal', $('#endcard-earn').hidden && $('#endcard-btns').hidden && ENDCARD.timers.length===0);
  state='play'; score.me=1; score.op=0; endGame(); await wait(10); $('#btn-ec-home').click(); await wait(20);

  // ---- #41: in a party 🏠 goes back to the team, it does not dissolve it
  mp={connected:true, role:'host', conns:[], code:'TEST', lobby:null};
  level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=1; score.op=0; endGame(); await wait(30); endcardSkip();
  $('#btn-ec-home').click(); await wait(30);
  TASSERT('#41 home in a party keeps mp and shows the party on home', !!mp && mp.connected && state==='idle' && $('#home').classList.contains('active') && !$('#end').classList.contains('show') && !$('#party').hidden);
  mp=null; partyRefresh();

  // ---- online info: "more" keeps the core behaviour, "again" hidden
  const stepsBefore=ENDCARD.step;
  endcardRender(Object.assign({}, last, {online:true})); endcardSkip();
  TASSERT('online: again hidden, more shown, no personality line', $('#btn-ec-again').hidden && !$('#btn-ec-more').hidden && !$('#endcard-bot'));
  endcardClose();

  // ---- training: no earnings
  goHome(); training='shoot'; level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=4; endGame(); await wait(30); endcardSkip();
  TASSERT('training: "training done", no coins/xp', last.training===true && !!$('.ec-train') && $('.ec-train').textContent.includes(T('ec.trainDone')) && !$('#endcard-coins') && !$('#endcard-xp') && !$('#endcard-cap-bar'));
  TASSERT('training: only again + home', $('#btn-ec-more').hidden && vis($('#btn-ec-again')) && vis($('#btn-ec-home')) && $('#btn-ec-share').hidden);
  $('#btn-ec-again').click(); await wait(30);
  TASSERT('training again → training restarts', training==='shoot' && state==='countdown');
  state='play'; endGame(); await wait(10); $('#btn-ec-home').click(); await wait(10);
  TASSERT('training home → idle, training ended', state==='idle' && training===null);

  // ---- the staged reveal (no reduced motion): rows appear one by one, then all
  settings.reducedMotion=false; level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=1; matchEarn.goals=2; endGame();
  const total=document.querySelectorAll('#endcard-earn .ec-row').length; await wait(400);
  const shown1=document.querySelectorAll('#endcard-earn .ec-row.ec-on').length; await wait(300*total+400);
  const shown2=document.querySelectorAll('#endcard-earn .ec-row.ec-on').length;
  TASSERT('reveal is staged (some first, all later)', total>=3 && shown1>=1 && shown1<total && shown2===total);
  TASSERT('coins counted up to the final value', $('#endcard-coins').textContent==='🪙 +'+fmtNum(last.earn.coins));
  // reduced motion: everything at once
  settings.reducedMotion=true; endcardRender(last);
  TASSERT('reduced motion: all rows at once', document.querySelectorAll('#endcard-earn .ec-row.ec-on').length===document.querySelectorAll('#endcard-earn .ec-row').length && $('#endcard-coins').textContent==='🪙 +'+fmtNum(last.earn.coins));
  settings.reducedMotion=false;
  // 4 languages for every ec.* key
  TASSERT('i18n: every ec.* key has 4 translations', Object.keys(I18N_RAW).filter(k=>k.startsWith('ec.')).every(k=>I18N_RAW[k].length===4 && I18N_RAW[k].every(s=>s.length>0)));
  $('#btn-ec-home').click();
  TASSERT('no script errors', window.__errs.length===0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
