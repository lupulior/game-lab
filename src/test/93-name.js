/* 93-name: nobody plays without a name — the home asks, PLAY/online/friends wait, back cannot dismiss, a 2+ char name closes it */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const tick=(ms=40)=>new Promise(r=>setTimeout(r,ms));
  const errs0=window.__errs.length, name0=settings.name, shown=()=>$('#name-modal').classList.contains('show');
  prog.welcomeDue=false;   // the econ suite's migration leaves the welcome gift pending; it must not pop over the prompt here
  TASSERT('module loaded', typeof nameOk==='function' && typeof nameAsk==='function' && typeof nameGate==='function');
  // --- a returning player sees nothing new
  settings.name='דני'; saveSettings(); document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); showScreen('intro'); showScreen('home'); await tick();
  TASSERT('with a name: no prompt on the home', !shown() && nameGate()===true);
  // --- no name: the home asks, nothing starts
  settings.name=''; saveSettings(); showScreen('intro'); showScreen('home'); await tick();
  TASSERT('empty name → #name-modal on the home', shown() && $('#home').classList.contains('active'));
  mp=null; training=null; prog.matches=5; prog.wins=1;
  const pressPlay=()=>{ if($('#btn-play-big')) $('#btn-play-big').click(); else if(typeof homePlay==='function') homePlay(); else startOfflineMatch(0); };   // the home v2 button when 90-home is loaded
  pressPlay(); await tick(120);
  TASSERT('PLAY with no name: no match, the prompt stays', state==='idle' && !$('#game').classList.contains('active') && shown());
  startGame(1); await tick(60); TASSERT('startGame gated', state==='idle' && $('#home').classList.contains('active'));
  startOfflineMatch(1); await tick(60); TASSERT('startOfflineMatch gated', state==='idle' && $('#home').classList.contains('active'));
  $('#btn-mp').click(); await tick(); TASSERT('online button gated', !$('#mp').classList.contains('active') && $('#home').classList.contains('active'));
  $('#btn-friends').click(); await tick(); TASSERT('friends button gated', !$('#friends').classList.contains('active'));
  $('#btn-play').click(); await tick(); TASSERT('level modal gated', !$('#level-modal').classList.contains('show'));
  TASSERT('prompt still up after every attempt', shown());
  // --- the back button closes it (90-home's stack) and it comes straight back
  if(typeof UI!=='undefined' && UI.stack){
    TASSERT('prompt sits on the back stack', UI.stack.includes('#name-modal')); if(UI.stack[UI.stack.length-1]!=='#name-modal') TLOG('UI.stack (stale entries from earlier suites?)', JSON.stringify(UI.stack)+' ignore='+UI.ignore);
    window.dispatchEvent(new PopStateEvent('popstate')); await tick(80);
    TASSERT('back cannot dismiss the prompt', shown() && $('#home').classList.contains('active') && !$('#exit-modal').classList.contains('show'));
  }
  $('#name-modal').classList.remove('show'); await tick(30);
  TASSERT('a stray close on the home reopens it', shown());
  // --- a short name is refused, a 2+ char name is accepted and registered
  let hb=0; const _hb=fbHeartbeat; fbHeartbeat=function(){ hb++; return _hb.apply(this, arguments); };
  $('#name-input').value='א'; $('#name-input').dispatchEvent(new Event('input'));
  TASSERT('1 char: button disabled', $('#btn-name-go').disabled===true);
  submitName(); await tick(); TASSERT('1 char: still asking', shown() && !normName(settings.name));
  $('#name-input').value='נועה'; $('#name-input').dispatchEvent(new Event('input'));
  TASSERT('2+ chars: button enabled', $('#btn-name-go').disabled===false);
  $('#btn-name-go').click(); await tick(80);
  TASSERT('2+ chars: modal closes, name saved, heartbeat sent', !shown() && settings.name==='נועה' && hb>0);
  fbHeartbeat=_hb; await tick(30);
  TASSERT('stays closed once a name exists', !shown());
  // --- now PLAY works
  pressPlay(); await tick(120); if($('#ctrl-modal') && $('#ctrl-modal').classList.contains('show')){ $('#btn-ctrl-go').click(); await tick(150); }
  TASSERT('with a name PLAY starts a match', (state==='countdown' || state==='play') && $('#game').classList.contains('active'));
  quitToHome(); await tick(80);
  TASSERT('no "XP" / skip text on the prompt', !/XP/.test($('#name-modal').textContent) && !!$('#btn-name-go'));
  settings.name=name0||'בודק'; saveSettings();
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
