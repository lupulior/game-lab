/* the bot: personalities, countdown tag, sleep, mercy, newbie mercy, aim, powers, 2v2, no errors at every level */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const errs0=window.__errs.length;
  const _raf=window.requestAnimationFrame; window.requestAnimationFrame=()=>0;      // no background loops: every frame is simulated by hand
  const said=[]; const _say=say; say=function(k,...a){ said.push(k); return _say(k,...a); };
  const frames=(n, each)=>{ let t=performance.now(); for(let i=0;i<n;i++){ if(each) each(i); t+=16; lastT=t-16; loop(t); } };
  const P=id=>ECON.bot.profiles[id];
  // --- personalities are deterministic per character id, weighted by level, BOSS at Impossible
  TASSERT('personality deterministic per id', botProfileFor('salah',1)===botProfileFor('salah',1) && BOT_IDS.includes(botProfileFor('salah',1)));
  TASSERT('all 5 personalities appear at Medium', new Set(CHARS.map(c=>botProfileFor(c.id,1))).size===5);
  const easyT=CHARS.filter(c=>botProfileFor(c.id,0)==='trickster').length/CHARS.length; TLOG('easy trickster share', easyT.toFixed(2));
  TASSERT('Easy: about 40% Tricksters', easyT>.25 && easyT<.55);
  TASSERT('BOSS for level 5', CHARS.every(c=>botProfileFor(c.id,5)==='boss') && botProfileInfo('boss').icon==='☠️');
  TASSERT('ECON.bot carries the numbers', ECON.bot.bossSpeed===1.45 && P('wall').speed===.95 && P('sprinter').speed===1.08 && P('trickster').err===1.4 && P('turtle').err===0);
  TASSERT('4 languages for the names', ['wall','sprinter','sniper','trickster','turtle','boss'].every(id=>I18N_RAW['bot.'+id].length===4 && I18N_RAW['bot.line.'+id].length===4));
  // --- a match: P2 gets its personality, the tag shows over the countdown, the commentator introduces it
  settings.format='quick'; level=LEVELS[1]; mp=null; training=null; dailyMatch=false; prog.matches=10; prog.recent={};
  beginMatch(CHARS[0], CHARS[1]);
  TASSERT('P2 is a bot with its personality', !!P2.bot && P2.bot.prof===botProfileFor(CHARS[1].id,1) && botPersonality().id===P2.bot.prof && P2.bot.side===1);
  TASSERT('tag visible on the countdown', !$('#bot-tag').hidden && $('#bot-tag-name').textContent===T('bot.'+P2.bot.prof) && $('#bot-tag-ico').textContent===P(P2.bot.prof).icon);
  await new Promise(r=>setTimeout(r,500)); clearTimeout(cdTimer);
  TASSERT('commentator intro line', said.includes('bot.line.'+P2.bot.prof));
  state='play'; lastT=performance.now();
  // --- botSleep: a sleep started before kick-off also counts the countdown seconds; in play the bot does not move, then wakes up and plays
  botSleep(5); showCount(2); showCount(1); showCount(0);
  TASSERT('countdown steps count toward the sleep', Math.abs(botState.sleepT-2)<1e-9);
  const x0=P2.x; ball.x=P2.x-150; ball.y=R; ball.vx=0; ball.vy=0;
  botSleep(3); frames(20);
  TASSERT('asleep: bot x unchanged', P2.x===x0 && botAsleep() && P2.el.classList.contains('bot-sleep'));
  frames(260);
  TASSERT('wakes after the sleep and moves', !botAsleep() && !P2.el.classList.contains('bot-sleep') && said.includes('bot.wake') && P2.x!==x0);
  // --- coach mercy: human trails by 2 → tired bot + commentator line; leads by 3 → the bot wakes up
  state='play'; score.me=0; score.op=0; resetPositions(); const base=LEVELS[1].speed*P(P2.bot.prof).speed;
  scoreGoal('op'); state='play';
  TASSERT('one goal behind: no mercy yet', botState.mercy===null);
  // review #31: in a quick match (target 2) the bot's 2nd goal decides the match → no mercy, no coach line over the result card
  TASSERT('quick match target is 2', matchFmt==='quick' && matchTarget()===2);
  scoreGoal('op'); state='play';
  TASSERT('deciding goal: no mercy (and no late coach line)', botState.mercy===null && botState.saidTired===false);
  await new Promise(r=>setTimeout(r,2600));
  TASSERT('no coach line after a deciding goal', !said.includes('bot.tired'));
  // the same trail with a far target: the mercy applies
  const qt=ECON.formats.quick.target; ECON.formats.quick.target=10;
  score.me=0; score.op=1; state='play'; scoreGoal('op'); state='play';
  TASSERT('two goals behind: mercy flag + slower bot', botState.mercy==='tired' && P2.bot.E.speed<base-1e-6 && Math.abs(P2.bot.E.err-(LEVELS[1].err*P(P2.bot.prof).err+30))<1e-6 && Math.abs(P2.bot.E.react-(LEVELS[1].react+.1))<1e-6);
  await new Promise(r=>setTimeout(r,2600));
  TASSERT('coach line said', said.includes('bot.tired'));
  score.me=4; score.op=0; state='play'; scoreGoal('me'); state='play';
  TASSERT('leading by 3: the bot wakes up (faster, capped by the next level)', botState.mercy==='awake' && P2.bot.E.speed>base && P2.bot.E.speed<=LEVELS[2].speed*P(P2.bot.prof).speed+1e-9);
  await new Promise(r=>setTimeout(r,2600)); TASSERT('awake line said', said.includes('bot.awake'));
  // review #31: a late line never fires over the result card — the delayed say checks botLive()
  botState.mercy=null; botState.saidTired=false; score.me=0; score.op=2; state='play'; const nTired=said.filter(k=>k==='bot.tired').length;
  scoreGoal('op'); state='end';
  await new Promise(r=>setTimeout(r,2600)); TASSERT('mercy line skipped once the match ended', said.filter(k=>k==='bot.tired').length===nTired);
  ECON.formats.quick.target=qt;
  // --- review #42: with a guest on a build without this module, the commentator line shows only on the host (never relayed as a raw key)
  mp={role:'host', slot:'P1', connected:true, conns:[{ver:''}]}; const nSaid=said.length; botSay('bot.awake');
  TASSERT('old guest in the party: the line is not relayed', said.length===nSaid && $('#commentary').textContent===T('bot.awake'));
  mp.conns=[{ver:GAME_VERSION}]; botSay('bot.awake'); TASSERT('up-to-date guest: the line is relayed', said.length===nSaid+1);
  mp=null;
  // --- review #23: a sleep requested while beginMatch runs (the onboarding 'screen' hook) survives botSetupMatch
  let once=true; Hooks.on('screen', id=>{ if(once && id==='game'){ once=false; botSleep(4); } });
  level=LEVELS[0]; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer);
  TASSERT('sleep requested during beginMatch is kept on the bot', botAsleep() && Math.abs(botState.sleepT-4)<1e-9 && botState.sleepPlayers.includes(P2) && P2.el.classList.contains('bot-sleep'));
  once=false; botWake(); level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer);
  TASSERT('a plain match starts awake', !botAsleep() && !P2.el.classList.contains('bot-sleep'));
  // --- review #36: a spectated 1v1 is human vs human — the host's setup carries src:null, so P2.src falls back to 'ai' here, but no personality
  spectating={names:{P1:'Yoni', P2:'Dani'}}; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer);
  TASSERT('spectated 1v1: no personality for the friend', P2.src==='ai' && !P2.bot && botPersonality()===null && $('#bot-tag').hidden);
  spectating=null; cancelAnimationFrame(rafId);
  // --- goal-aware shooting: aim at the corner away from the human, vy nudged, speed within 10%
  level=LEVELS[2]; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer); state='play';
  P2.x=250; P2.y=0; P2.kickT=0; P2.vx=0; ball.x=220; ball.y=R; ball.vx=0; ball.vy=0; P1.x=120; P1.y=80;
  const aimLow=botAimY(P2, 1, [P1]); P1.y=0; const aimHigh=botAimY(P2, 1, [P1]);
  TASSERT('human in the air → low corner, on the ground → upper corner', aimLow<GOAL_BOT+40 && aimHigh>GOAL_H-50);
  P2.x=700; TASSERT('far from the goal: no aim', botAimY(P2, 1, [P1])===null); P2.x=250;
  botLastAim=null; doKick(P2, 1, aimLow);
  TASSERT('bot kick near the goal: vy nudged toward the low corner', !!botLastAim && botLastAim.vy1<botLastAim.vy0 && ball.vy===botLastAim.vy1 && botLastAim.vy1>=botLastAim.vy0*.75-1e-6);
  TASSERT('ball speed changed by at most 10%', Math.abs(botLastAim.s1/botLastAim.s0-1)<=.1+1e-6);
  botLastAim=null; P1.x=ball.x-20; P1.y=0; P1.kickT=0; doKick(P1); TASSERT('human kick is never aimed', botLastAim===null && ball.vx>0);
  // --- bot powers (Master+): ice freezes the human, fire burns the ball
  level=LEVELS[4]; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer); state='play';
  TASSERT('bot ice freezes the human', botIce(P2)===true && P1.frozenT>0 && P1.el.classList.contains('frozen') && P2.bot.used.ice && said.includes('bot.ice'));
  P1.frozenT=0; P1.el.classList.remove('frozen');
  TASSERT('bot fire burns the ball', botFire(P2)===true && fireBusy && P2.bot.used.fire && said.includes('bot.fire'));
  fireDone();
  // --- Impossible: one fixed BOSS, speed 1.45, no mercy ever
  level=LEVELS[5]; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer); state='play';
  TASSERT('Impossible = BOSS tag', P2.bot.prof==='boss' && $('#bot-tag').classList.contains('boss') && P2.bot.E.speed===1.45);
  score.me=0; score.op=1; scoreGoal('op'); state='play';
  TASSERT('no mercy for the BOSS', botState.mercy===null && P2.bot.E.speed===1.45);
  // --- newbie mercy: first 3 matches at Easy
  prog.matches=1; level=LEVELS[0]; beginMatch(CHARS[0], CHARS[2]); clearTimeout(cdTimer);
  const pr=P(P2.bot.prof);
  TLOG('newbie E', {newbie:botState.newbie, mercy:botState.mercy, react:P2.bot.E.react, speed:P2.bot.E.speed, prof:P2.bot.prof});
  TASSERT('newbie mercy at Easy', botState.newbie && Math.abs(P2.bot.E.react-(LEVELS[0].react+.2))<1e-6 && Math.abs(P2.bot.E.speed-LEVELS[0].speed*pr.speed*.85)<1e-6);
  prog.matches=10; beginMatch(CHARS[0], CHARS[2]); clearTimeout(cdTimer);
  TASSERT('no newbie mercy after 3 matches', !botState.newbie && Math.abs(P2.bot.E.speed-LEVELS[0].speed*pr.speed)<1e-6);
  // --- three straight losses at a level: mercy from kick-off + the next-up suggestion
  prog.recent={1:['l','l','l']}; ECON._lastLevel=1; level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer);
  TASSERT('3 losses: mercy from kick-off', botState.mercy==='tired' && botState.kickoffMercy);
  const nu=NextUp.best(); TASSERT('next-up suggests an easier level', !!nu && nu.text===T('bot.nextEasier', T('lvl.0')));
  prog.recent={};
  // --- 2v2: partner and opponent bots all get personalities and play without errors
  level=LEVELS[2]; beginMatch(CHARS[0], CHARS[1], {c3:CHARS[2], c4:CHARS[3], src:{P3:'ai',P2:'ai',P4:'ai'}}); clearTimeout(cdTimer); state='play';
  TASSERT('2v2: partner bot (side -1) and both opponents have personalities', P3.bot && P3.bot.side===-1 && P2.bot && P4.bot && P4.bot.side===1 && botPersonality()!==null);
  const p3x=P3.x; frames(150, i=>{ if(state!=='play'){ state='play'; resetPositions(); } if(i%30===0){ ball.x=200+Math.random()*(FIELD_W-400); ball.y=R+Math.random()*150; ball.vx=(Math.random()*2-1)*800; ball.vy=Math.random()*300; } });
  TASSERT('2v2: the partner bot moves', P3.x!==p3x);
  // --- online guest / human opponent / training: no personality
  mp={role:'guest', slot:'P2', connected:true, conns:[]}; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer);
  TASSERT('online human opponent: no personality, tag hidden', botPersonality()===null && !P2.bot && $('#bot-tag').hidden);
  mp=null; state='idle';
  training='shoot'; TASSERT('training: no personality', botPersonality()===null); training=null;
  // --- 200 simulated frames at every level with the ball placed randomly: no script errors
  for(let li=0; li<6; li++){
    level=LEVELS[li]; beginMatch(CHARS[(li*7)%CHARS.length], CHARS[(li*11+3)%CHARS.length]); clearTimeout(cdTimer); state='play'; score.me=1; score.op=0; timeLeft=20;
    frames(200, i=>{ if(state!=='play'){ state='play'; resetPositions(); } if(i%25===0){ ball.x=100+Math.random()*800; ball.y=R+Math.random()*200; ball.vx=(Math.random()*2-1)*900; ball.vy=(Math.random()*2-1)*400; } });
    TLOG('level '+li, {prof:P2.bot.prof, mode:P2.mode, kicks:P2.kicks|0, ice:P2.bot.used.ice, fire:P2.bot.used.fire});
  }
  TASSERT('no script errors over 6×200 frames', window.__errs.length===errs0);
  fireDone(); for(const p of [P1,P2,P3,P4]){ p.frozenT=0; p.el.classList.remove('frozen'); }
  // --- the end card learns the personality
  level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); clearTimeout(cdTimer); state='play'; score.me=2; score.op=0;
  let info=null; Hooks.on('matchEnd', i=>{ info=i; }); endGame();
  TASSERT('matchEnd info.bot + end card line', !!info && !!info.bot && info.bot.id===P2.bot.prof && (typeof endcardRow==='function' || $('#end-sub').textContent.includes(info.bot.icon)));
  goHome();
  TASSERT('no new script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  window.requestAnimationFrame=_raf; say=_say;
  TDONE();
})();
