/* economy foundation: migration, payout, caps, keys, streak days, level-ups, formats */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const errs0=window.__errs.length;
  // --- migration of an old XP save
  Object.assign(prog, {migrated:undefined, xp:5000, coins:0, gems:0, keys:0, unlocked:['salah'], ice:false, fire:false, admin:false, trophies:12});
  const existing=migrateProg();
  TASSERT('migrate: existing player', existing===true);
  TASSERT('migrate: coins = old xp', prog.coins===5000);
  TASSERT('migrate: welcome gems/keys', prog.gems===10 && prog.keys===1);
  TASSERT('migrate: xpTotal counts bought players', prog.xpTotal===5000+priceOf(CHARS.find(c=>c.id==='salah')));
  TASSERT('migrate: level claimed', prog.lvClaimed===levelOf(prog.xpTotal) && myLevel()>=10);
  TASSERT('migrate: idempotent', migrateProg()===false && prog.coins===5000);
  TASSERT('starter prices', PRICES.khalaili===100 && PRICES.dabbur===300);
  // --- level meter
  const lv0=prog.lvClaimed, c0=prog.coins; prog.xpTotal=xpForLevel(lv0+1)-1; addXP(1, true);
  TASSERT('level up pays 100×level', prog.lvClaimed===lv0+1 && prog.coins===c0+100*(lv0+2));
  // --- payout table
  prog.streak=1; prog.streakDays=0; prog.coinDay={key:dayKey(), n:0}; prog.keyDay={key:dayKey(), n:0};
  const sun=isSunday();
  let r=payout({outcome:'win', fmt:'quick', levelI:1, goals:2, clean:true, stars:3});
  TASSERT('quick win medium = 30+6+10+5 (×sunday)', r.coins===Math.round((30+6+10+5)*(sun?2:1)) && r.key===1 && r.xp===15+4);
  r=payout({outcome:'win', fmt:'classic', levelI:5, goals:0, clean:false, stars:2});
  TASSERT('classic impossible = 200, xp 60', r.coins===Math.min(250, Math.round(200*(sun?2:1))) && r.xp===60);
  r=payout({outcome:'lose', fmt:'quick', levelI:0, goals:1}); TASSERT('loss pays 8+3', r.coins===Math.round(11*(sun?2:1)) && r.key===0 && r.xp===5);
  r=payout({outcome:'win', fmt:'quick', levelI:0, goals:0}); TASSERT('easy win: no key', r.key===0);
  r=payout({outcome:'win', fmt:'quick', levelI:1, goals:0, online:true}); TASSERT('online win 50', r.coins===Math.round(50*(sun?2:1)));
  prog.streak=4; r=payout({outcome:'win', fmt:'quick', levelI:1, goals:0}); TASSERT('win streak +30%', r.coins===Math.round(30*1.3*(sun?2:1)));
  prog.streak=1; prog.coinDay={key:dayKey(), n:coinCapToday()-10}; r=payout({outcome:'win', fmt:'classic', levelI:4, goals:3});
  TASSERT('daily cap clamps', r.coins===10 && r.capped);
  prog.coinDay={key:dayKey(), n:coinCapToday()}; r=payout({outcome:'win', fmt:'classic', levelI:4, goals:3}); TASSERT('over cap pays 5', r.coins===5);
  prog.coinDay={key:dayKey(), n:0}; prog.keyDay={key:dayKey(), n:3}; r=payout({outcome:'win', fmt:'quick', levelI:3}); TASSERT('3 keys a day', r.key===0);
  TASSERT('training pays nothing', payout({training:true, outcome:'win'}).coins===0);
  // --- applyMatchRewards + streak days
  prog.keyDay={key:dayKey(), n:0}; prog.streakLast=null; prog.streakDays=0; const k0=prog.keys, m0=prog.matches|0;
  applyMatchRewards({outcome:'win', fmt:'quick', levelI:2, goals:1, clean:false, stars:2});
  TASSERT('rewards applied: key, match count, streak day 1', prog.keys===k0+1 && prog.matches===m0+1 && prog.streakDays===1 && prog.streakLast===dayKey());
  prog.streakLast=localDayKey(now()-864e5); prog.streakDays=6; stampStreakDay(); TASSERT('streak continues from yesterday', prog.streakDays===7);
  prog.streakLast=localDayKey(now()-2*864e5); prog.freezes=1; prog.streakDays=7; stampStreakDay(); TASSERT('freeze saves a missed day', prog.streakDays===8 && prog.freezes===0);
  prog.streakLast=localDayKey(now()-3*864e5); prog.streakDays=8; stampStreakDay(); TASSERT('streak resets', prog.streakDays===1 && prog.streakBroken===8);
  // --- achievements pay coins + xp
  delete prog.ach.hat_trick; const c1=prog.coins, x1=prog.xpTotal; training=null; achieve('hat_trick'); TASSERT('achievement = 75 coins + 15 xp', prog.coins===c1+75 && prog.xpTotal===x1+15);
  // --- a whole quick match through showEnd
  settings.format='quick'; level=LEVELS[1]; mp=null; dailyMatch=false; beginMatch(CHARS[0], CHARS[1]);
  TASSERT('quick match: 90s, first to 2', matchTime()===90 && matchTarget()===2 && matchFmt==='quick' && matchEarn && matchEarn.coins===0);
  state='play'; prog.coinDay={key:dayKey(), n:0}; const c2=prog.coins;
  score.me=1; score.op=1; timeLeft=0.001; lastT=performance.now()-16; loop(performance.now());
  TASSERT('tie at 0:00 → golden overtime 30s', overtime===true && timeLeft>20 && state==='play');
  timeLeft=0.001; lastT=performance.now()-16; loop(performance.now());
  TASSERT('still tied → draw ends the match', state==='end');
  TASSERT('end card shows coins', !$('#end-xp').hidden && $('#end-xp').textContent.includes('🪙') && prog.coins>c2);
  TASSERT('draw keeps the win streak', prog.streak===1);
  goHome();
  // --- ask() resolves through the buttons
  const p=ask('?'); await new Promise(r=>setTimeout(r,20)); TASSERT('ask shows', $('#ask-modal').classList.contains('show')); $('#btn-ask-yes').click(); TASSERT('ask yes', (await p)===true);
  // --- trophy road retune
  TASSERT('road: no stop above 500 coins', TROPHY_ROAD.every(r=>!r.coins || r.coins<=500) && TROPHY_ROAD.every(r=>!r.xp));
  TASSERT('road: fixed characters kept', roadFor('gloukh')===10 && roadFor('goldstar')===100 && roadFor('streetking')===150);
  TASSERT('road: gems at 500', TROPHY_ROAD.find(r=>r.t===500).gems===10 && TROPHY_ROAD.find(r=>r.t===2500).gems===25);
  TASSERT('road: fewer characters', TROPHY_ROAD.filter(r=>r.ch).length<25 && TROPHY_ROAD.filter(r=>r.ch).length>=10);
  TASSERT('no new script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
