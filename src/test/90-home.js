/* home v2: layout, smart play, sheets, next-up, back button */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length;
  $('#intro').click(); showScreen('home'); await new Promise(r=>setTimeout(r,100));
  TASSERT('home v2 built', $('#home').classList.contains('v2') && !!$('#btn-play-big') && !!$('#today-card') && !!$('#home-right'));
  TASSERT('old buttons moved, listeners kept', $('#home-right').contains($('#btn-mp')) && $('#more-grid').contains($('#btn-stats')) && $('#mode-others').contains($('#btn-2v2')));
  TASSERT('play label shows level + mode', /▶/.test($('#btn-play-big').textContent) && $('#btn-play-big').textContent.includes(T('lvl.0')));
  // level sheet
  $('#chip-level').click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('level sheet opens with 6 cards', $('#lvl-sheet').classList.contains('show') && $('#lvl-grid').children.length===6);
  $('#lvl-grid').children[2].click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('level chosen and remembered', settings.lastLevel===2 && !$('#lvl-sheet').classList.contains('show') && $('#chip-level').textContent.includes(T('lvl.2')));
  // mode sheet
  $('#chip-mode').click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('mode sheet opens', $('#mode-sheet').classList.contains('show') && $('#mode-fmts').children.length===3);
  $('#mode-fmts').children[1].click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('classic chosen', settings.format==='classic' && $('#chip-mode').textContent.includes(T('fmt.classic')));
  // more sheet + language
  $('#btn-more').click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('more sheet opens', $('#more-sheet').classList.contains('show') && $('#more-langs').children.length===4);
  $('#more-langs').children[1].click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('language switch re-labels', lang==='en' && $('#btn-play-big').textContent.includes('Play'));
  TASSERT('#62 sheet buttons follow the language', $('#btn-more-close').textContent==='Close' && $('#btn-lvl-close').textContent==='Back' && $('#btn-mode-close').textContent==='Back');
  TASSERT('#5/#54 more-sheet icons survive applyLang', $('#btn-settings').textContent==='⚙️ Settings' && $('#btn-music').textContent==='🎵 Music' && $('#btn-codes').textContent==='🎁 Codes');
  TASSERT('#53 short online label in the column', $('#btn-mp').textContent==='🌐 Online' && $('#btn-mp').scrollWidth<=$('#btn-mp').clientWidth+1);
  TASSERT('#52 language buttons >= 44px', [...$('#more-langs').children].every(b=>b.offsetHeight>=44));
  $('#more-langs').children[0].click(); $('#btn-more-close').click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('more sheet closes', !$('#more-sheet').classList.contains('show') && lang==='he');
  // #52: thumb-sized controls that still fit the 1000×620 stage without touching the foot row
  refreshNextUp();
  const h44=sel=>[...document.querySelectorAll(sel)].every(b=>b.offsetHeight>=44);
  TASSERT('#52 chips / name row / next-up / foot >= 44px', h44('.chip') && h44('#home-centre .who .btn') && h44('#nextup .btn') && h44('#home.v2 .home-foot .row .btn.small') && h44('#home-right .btn'));
  const st=$('#stage').getBoundingClientRect(), ch=$('#home-chips').getBoundingClientRect(), ft=$('#home .home-foot .row').getBoundingClientRect();
  const overlap=!(ch.right<ft.left || ch.left>ft.right || ch.bottom<ft.top || ch.top>ft.bottom);
  TASSERT('#52 centre column inside the stage, clear of the foot row', ch.bottom<=st.bottom+1 && !overlap);
  // #56: the six level cards share one row
  $('#chip-level').click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('#56 level cards on one row', new Set([...$('#lvl-grid').children].map(b=>b.offsetTop)).size===1);
  $('#btn-lvl-close').click(); await new Promise(r=>setTimeout(r,30));
  // smart play: first match is easy + quick
  prog.matches=0; settings.lastLevel=4; settings.format='classic';
  $('#btn-play-big').click(); await new Promise(r=>setTimeout(r,100)); if($('#ctrl-modal') && $('#ctrl-modal').classList.contains('show')){ $('#btn-ctrl-go').click(); await new Promise(r=>setTimeout(r,150)); }
  TASSERT('first match forced easy + quick', state==='countdown' && level.i===0 && matchFmt==='quick' && $('#game').classList.contains('active'));
  // back during a match pauses instead of leaving
  const before=state; window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r=>setTimeout(r,50));
  TASSERT('back in a match = pause', state==='paused' || state===before);
  if(state==='paused') resumeGame();
  quitToHome(); await new Promise(r=>setTimeout(r,80));
  // play at the chosen level afterwards
  prog.matches=5; settings.lastLevel=3; settings.format='quick'; refreshHomeV2();
  $('#btn-play-big').click(); await new Promise(r=>setTimeout(r,100));
  TASSERT('later matches use the chosen level', level.i===3 && matchFmt==='quick');
  quitToHome(); await new Promise(r=>setTimeout(r,80));
  // #47: a save with wins but no matches is not a newcomer
  prog.matches=0; prog.wins=2; settings.lastLevel=3; settings.format='classic'; refreshHomeV2();
  TASSERT('#47 no pulse with wins on record', !$('#btn-play-big').classList.contains('pulse'));
  $('#btn-play-big').click(); await new Promise(r=>setTimeout(r,100));
  TASSERT('#47 wins on record: the chosen level is kept', level.i===3 && matchFmt==='classic');
  quitToHome(); await new Promise(r=>setTimeout(r,80)); prog.wins=0; prog.matches=5; settings.format='quick';
  // #48: back on the result card goes home like the 🏠 button (no frozen pitch)
  level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=1; score.op=0; endGame(); await new Promise(r=>setTimeout(r,80));
  TASSERT('#48 result card on the stack', $('#end').classList.contains('show') && UI.stack[UI.stack.length-1]==='#end');
  window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r=>setTimeout(r,80));
  TASSERT('#48 back from the card = home', state==='idle' && $('#home').classList.contains('active') && !$('#end').classList.contains('show') && !UI.stack.includes('#end') && !UI.stack.includes('screen'));
  // #45: back on a question answers "no" so the promise resolves
  let answer='pending'; ask('?').then(v=>{ answer=v; }); await new Promise(r=>setTimeout(r,60));
  TASSERT('#45 question tracked on the stack', $('#ask-modal').classList.contains('show') && UI.stack[UI.stack.length-1]==='#ask-modal');
  window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r=>setTimeout(r,60));
  TASSERT('#45 back resolves the question with no', answer===false && !$('#ask-modal').classList.contains('show'));
  // #46: the ban screen never enters the stack and back does nothing while it shows
  const depth=UI.stack.length; $('#ban-overlay').classList.add('show'); await new Promise(r=>setTimeout(r,60));
  TASSERT('#46 ban screen not on the stack', UI.stack.length===depth);
  window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r=>setTimeout(r,60));
  TASSERT('#46 back ignored while banned', $('#ban-overlay').classList.contains('show') && !$('#exit-modal').classList.contains('show'));
  $('#ban-overlay').classList.remove('show'); await new Promise(r=>setTimeout(r,60));
  // #51/#55: back from a screen uses the screen's own back button (the CEO confetti stops)
  $('#btn-ceo').click(); await new Promise(r=>setTimeout(r,60));
  TASSERT('#55 ceo screen with its timer', $('#ceo').classList.contains('active') && ceoTimer!==0);
  window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r=>setTimeout(r,60));
  TASSERT('#55 back = the screen\'s own back button, timer cleared', $('#home').classList.contains('active') && ceoTimer===0);
  // #44: a match screen sweeps open sheets and answers a pending question with no
  $('#chip-level').click(); let ans2='pending'; ask('?').then(v=>{ ans2=v; }); await new Promise(r=>setTimeout(r,60));
  showScreen('game'); await new Promise(r=>setTimeout(r,60));
  TASSERT('#44 overlays closed when the match screen appears', !$('#lvl-sheet').classList.contains('show') && !$('#ask-modal').classList.contains('show') && ans2===false);
  showScreen('home'); await new Promise(r=>setTimeout(r,80));
  // ---- a (fake) party on the home screen
  mp={connected:true, role:'host', conns:[], code:'TEST', lobby:null}; partyRefresh(); await new Promise(r=>setTimeout(r,30));
  TASSERT('#40 party layout follows partyRefresh', $('#home').classList.contains('inparty'));
  $('#chip-mode').click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('#39 other modes hidden in a party', $('#mode-sheet').classList.contains('show') && $('#mode-others').hidden);
  $('#btn-mode-close').click(); await new Promise(r=>setTimeout(r,60));
  settings.lastLevel=4; refreshHomeV2(); openPartyModal(); await new Promise(r=>setTimeout(r,30));
  TASSERT('#43 party modal starts at the home level', partyLevel===4 && $('#party-levels .btn.on').dataset.lv==='4');
  $('#party-levels [data-lv="2"]').click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('#43 modal choice flows back to the chip', partyLevel===2 && settings.lastLevel===2 && $('#chip-level').textContent.includes(T('lvl.2')));
  $('#btn-party-cancel').click(); await new Promise(r=>setTimeout(r,60));
  window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r=>setTimeout(r,60));
  TASSERT('#34/#49 back in a party asks first', !!mp && $('#ask-modal').classList.contains('show') && $('#ask-text').textContent===T('party.leaveQ'));
  $('#btn-ask-no').click(); await new Promise(r=>setTimeout(r,60));
  TASSERT('#34/#49 "no" keeps the team', !!mp && mp.connected && !$('#ask-modal').classList.contains('show'));
  window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r=>setTimeout(r,60)); $('#btn-ask-yes').click(); await new Promise(r=>setTimeout(r,60));
  TASSERT('#34/#49 "yes" leaves the team and relayouts home', mp===null && !$('#home').classList.contains('inparty'));
  $('#mode-others').hidden=false;
  TASSERT('#65 the day is remembered for the 30-s refresh', HOME.lastDay===dayKey());
  TASSERT('i18n: party.leaveQ / home.online / home.close in 4 languages', ['party.leaveQ','home.online','home.close','home.settings','home.music','home.codes'].every(k=>I18N_RAW[k] && I18N_RAW[k].length===4 && I18N_RAW[k].every(s=>s.length>0)));
  // next-up shows something
  refreshNextUp(); TASSERT('next-up visible', $('#nextup').classList.contains('on') && $('#nextup').textContent.length>3);
  // back closes a modal
  $('#chip-level').click(); await new Promise(r=>setTimeout(r,60));
  window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r=>setTimeout(r,60));
  TASSERT('back closes the open sheet', !$('#lvl-sheet').classList.contains('show'));
  // exit modal has a way to the intro
  mp=null; partyRefresh(); $('#btn-exit').click(); await new Promise(r=>setTimeout(r,30));
  TASSERT('exit modal + intro button', $('#exit-modal').classList.contains('show') && !!$('#btn-exit-intro'));
  $('#btn-stay').click();
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
