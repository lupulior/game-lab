/* onboarding: controls card before match 1, labels + sleeping bot, the cards after matches 1-4 */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length;
  $('#intro').click(); showScreen('home'); await new Promise(r=>setTimeout(r,100));
  prog.matches=0; prog.onboard={}; prog.coins=0;
  TASSERT('before play: takes over on match 0', onboardingBeforePlay(3)===true && $('#ctrl-modal').classList.contains('show') && $('#ctrl-grid').children.length===6);
  $('#btn-ctrl-go').click(); await new Promise(r=>setTimeout(r,150));
  TASSERT('go starts an easy match', state==='countdown' && level.i===0 && prog.onboard.ctrl===true);
  TASSERT('labels shown over the buttons', !$('#ctrl-labels').hidden);
  state='play'; await new Promise(r=>setTimeout(r,1100));
  TASSERT('sleep counter ticks', $('#cl-sleep').textContent.includes('8') || $('#cl-sleep').textContent.includes('9'));
  quitToHome(); await new Promise(r=>setTimeout(r,200));
  TASSERT('labels hidden after leaving', $('#ctrl-labels').hidden);
  TASSERT('second time: no take-over', onboardingBeforePlay(3)===false);
  prog.onboard={}; prog.matches=0; prog.wins=1;
  TASSERT('#47 wins on record = no newcomer card', onboardingBeforePlay(3)===false && !$('#ctrl-modal').classList.contains('show'));
  prog.wins=0;
  // after match 1: the first key card
  prog.matches=1; document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); showScreen('home'); await new Promise(r=>setTimeout(r,900));
  TASSERT('card after match 1', $('#onb-modal').classList.contains('show') && $('#onb-title').textContent===T('onb.keyTitle'));
  const c0=prog.coins; $('#onb-btns .btn').click(); await new Promise(r=>setTimeout(r,100));
  TASSERT('welcome chest fallback pays', prog.onboard.welcome===true && (prog.coins>c0 || typeof openWelcomeChest==='function'));
  // after match 2: pickup card
  prog.matches=2; document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); showScreen('home'); await new Promise(r=>setTimeout(r,900));
  TASSERT('card after match 2', $('#onb-modal').classList.contains('show') && $('#onb-title').textContent===T('onb.pickupTitle'));
  $('#onb-btns .btn').click(); await new Promise(r=>setTimeout(r,100));
  // after match 3: shop card only when khalaili is affordable
  prog.matches=3; prog.coins=50; document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); showScreen('home'); await new Promise(r=>setTimeout(r,900));
  TASSERT('no shop card when poor', !$('#onb-modal').classList.contains('show'));
  prog.coins=300; showScreen('intro'); showScreen('home'); await new Promise(r=>setTimeout(r,900));
  TASSERT('shop card when affordable', $('#onb-modal').classList.contains('show') && $('#onb-title').textContent===T('onb.shopTitle'));
  $('#onb-btns .btn:last-child').click(); await new Promise(r=>setTimeout(r,100));
  // after match 4: channel + invite
  prog.matches=4; document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); showScreen('intro'); showScreen('home'); await new Promise(r=>setTimeout(r,900));
  TASSERT('share card after match 4', $('#onb-modal').classList.contains('show') && $('#onb-title').textContent===T('onb.shareTitle'));
  $('#onb-btns .btn:last-child').click();
  TASSERT('pause menu has a help button', !!$('#btn-pause-help'));
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
