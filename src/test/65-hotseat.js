/* penalties vs a friend on one device */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length; const tick=(ms=40)=>new Promise(r=>setTimeout(r,ms));
  $('#intro').click(); showScreen('home'); await tick(100);
  settings.name='ליאור';
  TASSERT('entry button in the mode sheet', !!$('#btn-hotseat') && $('#mode-others').contains($('#btn-hotseat')));
  startHotseatPk(); await tick();
  TASSERT('keeper pick modal on the pk screen', $('#pk').classList.contains('active') && $('#hs-pick-modal').classList.contains('show') && document.querySelectorAll('#hs-goal .hs-zone').length===6);
  const first=hs.shooter, keeper=first==='me'?'fr':'me';
  TASSERT('the keeper is named', $('#hs-pick-who').textContent.includes(hs.names[keeper]));
  document.querySelector('#hs-goal .hs-zone[data-col="2"][data-row="0"]').click(); await tick(600);
  TASSERT('pick → a penalty with the secret zone', !!pk && pk.hotseat && pk.keeperPick.col===2 && pk.keeperPick.row===0 && !$('#hs-pick-modal').classList.contains('show') && $('#pk-round').textContent.includes(hs.names[first]));
  TASSERT('shooter sprite = the shooter character', myChar===hs.chars[first] && opChar===hs.chars[keeper]);
  // resolve kicks through onResult, alternating
  pk.onResult(true); await tick(1600);
  TASSERT('goal recorded, turn passes, keeper asked again', hs.score[first].length===1 && hs.score[first][0]===true && hs.shooter===keeper && $('#hs-pick-modal').classList.contains('show'));
  // keyboard pick
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyA'})); await tick(600);
  TASSERT('keyboard pick A = bottom-left', !!pk && pk.keeperPick.col===0 && pk.keeperPick.row===1);
  pk.onResult(false); await tick(1600);
  TASSERT('miss recorded', hs.score[keeper].length===1 && hs.score[keeper][0]===false && hs.shooter===first);
  // play it out: first player scores everything, the other misses → decided early
  let guard=0;
  while(hs && !$('#hs-end-modal').classList.contains('show') && guard++<12){
    const z=document.querySelector('#hs-goal .hs-zone'); if(z && $('#hs-pick-modal').classList.contains('show')){ z.click(); await tick(600); }
    if(pk && pk.onResult){ pk.onResult(hs.shooter===first); await tick(1600); }
  }
  TASSERT('decided early: winner modal', $('#hs-end-modal').classList.contains('show') && $('#hs-end-title').textContent.includes(hs.names[first]));
  $('#btn-hs-home').click(); await tick(100);
  TASSERT('home after the end', hs===null && $('#home').classList.contains('active') && state==='idle');
  // quit from the keeper modal
  startHotseatPk(); await tick(); $('#btn-hs-quit').click(); await tick(100);
  TASSERT('quit goes home cleanly', hs===null && !pk && $('#home').classList.contains('active'));
  // ✖ on the pk screen during a kick
  startHotseatPk(); await tick(); document.querySelector('#hs-goal .hs-zone').click(); await tick(600);
  $('#btn-pk-back').click(); await tick(200);
  TASSERT('✖ during a kick ends the hot-seat', hs===null && $('#home').classList.contains('active'));
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
