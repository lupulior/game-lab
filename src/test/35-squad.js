/* squad: default squad, slot 0 follows `selected`, the modal picker, home buttons, a real substitution after my goal in an offline match */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length; const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  const until=async(fn, ms)=>{ const t0=performance.now(); while(!fn()){ if(performance.now()-t0>ms) return false; await tick(50); } return true; };
  const idOf=i=>CHARS[i].id, idx=id=>CHARS.findIndex(c=>c.id===id);
  showScreen('home'); refreshHome(); await tick(50);
  // --- default squad: slot 0 is the selected character, the bench is empty
  delete prog.squad; prog.unlocked=[]; delete prog.admin;
  TASSERT('default squad = [selected, null, null]', JSON.stringify(squad())===JSON.stringify([idOf(selected),null,null]) && prog.squad===squad());
  // --- slot 0 follows `selected` (the core's choose button and the shop emit 'select')
  const free=FREE_CHARS.map(idx), s0=selected, other=free.find(i=>i!==s0);
  selected=other; Hooks.emit('select', other);
  TASSERT('select → slot 0 updated', prog.squad[0]===idOf(other) && prog.squad[1]===null);
  // --- squadSet: bench slots, swaps, slot 0 → selected follows
  TASSERT('locked player refused', squadSet(1, CHARS.find(c=>!isUnlocked(c)).id)===false && prog.squad[1]===null);
  const b1=free.find(i=>i!==selected);
  TASSERT('slot 1 filled', squadSet(1, idOf(b1))===true && prog.squad[1]===idOf(b1));
  TASSERT('same player again → moves, never twice', squadSet(2, idOf(b1))===true && prog.squad[2]===idOf(b1) && prog.squad[1]===null);
  const starter=selected;
  TASSERT('bench player into slot 0 → selected follows, old starter swapped to the bench', squadSet(0, idOf(b1))===true && selected===b1 && prog.squad[0]===idOf(b1) && prog.squad[2]===idOf(starter) && $('#home-name').textContent===nm(CHARS[b1]));
  TASSERT('starter cannot leave slot 0 empty', squadSet(1, idOf(b1))===false && prog.squad[0]===idOf(b1) && prog.squad[1]===null);
  const b3=free.find(i=>i!==b1 && i!==starter);
  TASSERT('a brand-new starter: the old one keeps a free bench slot', squadSet(0, idOf(b3))===true && selected===b3 && prog.squad[0]===idOf(b3) && prog.squad[1]===idOf(b1) && prog.squad[2]===idOf(starter));
  TASSERT('✖ empties a bench slot, never slot 0', squadSet(2, null)===true && prog.squad[2]===null && squadSet(0, null)===false && prog.squad[0]===idOf(b3));
  selected=b1; Hooks.emit('select', b1);
  TASSERT('selecting a bench player from the shop swaps it into slot 0', prog.squad[0]===idOf(b1) && prog.squad[1]===idOf(b3));
  // --- the modal: 3 slots, tap a slot → the picker of unlocked players, tap a card → it lands in the slot, ✖ empties
  squadOpen(); await tick();
  TASSERT('modal shows 3 slots', $('#squad-modal').classList.contains('show') && document.querySelectorAll('#sq-slots .sq-slot').length===3 && $('#sq-pick').hidden && $('#sq-slots .sq-slot.main .sq-name').textContent===nm(CHARS[selected]));
  TASSERT('slot 2 empty, slot 1 has ✖, slot 0 has no ✖', $('#sq-slots .sq-slot[data-k="2"]').classList.contains('empty') && !!$('#sq-slots .sq-slot[data-k="1"] .sq-x') && !$('#sq-slots .sq-slot[data-k="0"] .sq-x'));
  document.querySelectorAll('#sq-slots .sq-slot')[2].click(); await tick();
  const unlockedN=CHARS.filter(isUnlocked).length;
  TASSERT('picker lists exactly the unlocked players', !$('#sq-pick').hidden && $('#sq-slots').hidden && document.querySelectorAll('#sq-grid .sq-card').length===unlockedN && unlockedN===FREE_CHARS.length && !$('#btn-sq-back').hidden && $('#btn-sq-close').hidden);
  TASSERT('players already in the squad are marked', document.querySelectorAll('#sq-grid .sq-card.in').length===2 && $('#sq-pick-title').textContent===T('squad.pickTitle', 3));
  const pickId=[...document.querySelectorAll('#sq-grid .sq-card')].find(d=>!d.classList.contains('in')).dataset.id;
  $('#sq-grid .sq-card[data-id="'+pickId+'"]').click(); await tick();
  TASSERT('tapping a card fills slot 2 and returns to the slots', prog.squad[2]===pickId && $('#sq-pick').hidden && !$('#sq-slots').hidden && $('#sq-slots .sq-slot[data-k="2"] .sq-name').textContent===nm(CHARS[idx(pickId)]));
  $('#sq-slots .sq-slot[data-k="2"] .sq-x').click(); await tick();
  TASSERT('✖ empties the slot', prog.squad[2]===null && $('#sq-slots .sq-slot[data-k="2"]').classList.contains('empty'));
  document.querySelectorAll('#sq-slots .sq-slot')[0].click(); await tick();
  $('#btn-sq-back').click(); await tick();
  TASSERT('back leaves the picker', $('#sq-pick').hidden && !$('#sq-slots').hidden);
  $('#btn-sq-close').click(); await tick(); TASSERT('close', !$('#squad-modal').classList.contains('show'));
  TASSERT('4 languages for every string', ['btn','title','hint','main','empty','pickTitle','inSlot','noMove','sub','burst','back','close'].every(k=>I18N_RAW['squad.'+k] && I18N_RAW['squad.'+k].length===4));
  // --- home entry points (when the home module is loaded)
  if($('#home-centre .who')){
    await tick(20);
    TASSERT('squad button next to looks', !!$('#btn-squad') && $('#btn-squad').previousElementSibling===$('#btn-looks') && $('#btn-squad').textContent===T('squad.btn'));
    TASSERT('row fits the centre column', $('#home-centre .who').getBoundingClientRect().width <= $('#home-centre').getBoundingClientRect().width+1);
    TASSERT('more sheet has a squad button', !!$('#more-grid #btn-squad-more'));
    $('#btn-squad').click(); await tick(); TASSERT('home button opens the modal', $('#squad-modal').classList.contains('show')); squadClose();
  } else TLOG('home module not loaded', 'skipped the home button checks');
  // --- a real offline match: after my goal the next squad member comes on
  settings.format='classic'; training=null; dailyMatch=false; mp=null;
  const A=selected, B=free.find(i=>i!==A);
  prog.squad=[idOf(A), idOf(B), null];
  startOfflineMatch(1);
  TASSERT('match started with the starter', state==='countdown' && P1.ch===CHARS[A] && SQUAD.active===true && SQUAD.idx===0);
  TASSERT('kick-off', await until(()=>state==='play', 6000));
  if(typeof botSleep==='function') botSleep(60);         // the bot sits still: the goals in this test are mine
  await tick(700);                                       // a few frames in the replay buffer so the goal gets its replay
  const said=[]; const _sl=showLine; showLine=function(t,p){ said.push(t); return _sl(t,p); };
  scoreGoal('me');
  TASSERT('goal counted → celebration, no swap yet', score.me===1 && state==='celebrate' && SQUAD.pending===true && P1.ch===CHARS[A]);
  TASSERT('back in play after the replay', await until(()=>state==='play', 10000));
  TASSERT('P1 is now the second squad member', P1.ch===CHARS[B] && myChar===CHARS[B] && SQUAD.idx===1 && !SQUAD.pending);
  TASSERT('tag + scoreboard name updated', P1.el.querySelector('.tag').textContent===T('game.me', nm(CHARS[B])) && $('#n-me').textContent===nm(CHARS[B]));
  TASSERT('commentator line (local)', said.includes(T('squad.sub', nm(CHARS[B]))));
  TASSERT('sprite re-drawn with the burst over it', !!P1.el.querySelector('.sprite svg') && !!P1.el.querySelector('.sq-burst'));
  TASSERT('stats follow the new player', JSON.stringify(st(P1))===JSON.stringify(charStats(CHARS[B])));
  await tick(1400); TASSERT('burst gone after 1.2 s', !P1.el.querySelector('.sq-burst'));
  scoreGoal('me');
  TASSERT('second goal', score.me===2 && state==='celebrate');
  TASSERT('back in play again', await until(()=>state==='play', 10000));
  showLine=_sl;
  TASSERT('cycle wraps to the starter (slot 2 empty)', P1.ch===CHARS[A] && SQUAD.idx===0 && P1.el.querySelector('.tag').textContent===T('game.me', nm(CHARS[A])) && $('#n-me').textContent===nm(CHARS[A]));
  prog.squad=[idOf(A), null, null];
  TASSERT('one member → no substitution', squadSubstitute()===false && P1.ch===CHARS[A] && SQUAD.idx===0);
  quitToHome(); await tick();
  TASSERT('home again, squad inactive', state==='idle' && SQUAD.active===false && SQUAD.pending===false);
  prog.squad=[idOf(selected),null,null]; saveProg();
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
