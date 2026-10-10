/* daily loop: missions, reroll, calendar + pickup, streak cycle + milestones, save-the-streak, next-up, home card, a real match */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const errs0=window.__errs.length, tick=()=>new Promise(r=>setTimeout(r,30));
  const today=dayKey();
  TASSERT('ECON.daily + pool of 16', ECON.daily && ECON.daily.missionCoins===40 && DM_POOL.length===16);
  // --- missions: seeded, play2 first
  let dm=dailyMissions();
  TASSERT('3 missions today, play2 in slot 1', dm.key===today && dm.ids.length===3 && dm.ids[0]==='play2' && new Set(dm.ids).size===3);
  TASSERT('seed is deterministic', JSON.stringify(dmPick(today,0))===JSON.stringify(dmPick(today,0)));
  // force a known set and drive them through Hooks 'ev'
  prog.dm={key:today, ids:['play2','goals5','win1'], prog:{}, done:[], reroll:0, bonus:false}; prog.coins=0; prog.gems=0; prog.keys=0; prog.xpTotal=0; prog.lvClaimed=0; training=null; state='idle';
  const hasChests=typeof giveChest==='function'; if(prog.chests) prog.chests.bronze=0;   // the all-3 bonus is a Bronze chest (its coin value without the chests module)
  Hooks.emit('ev','goal',3);
  TASSERT('goal ×3 → goals5 at 3/5', prog.dm.prog.goals5===3 && !prog.dm.done.includes('goals5'));
  Hooks.emit('ev','goal',5);
  TASSERT('goals5 done: +40 coins +10 xp, capped at n', prog.dm.done.includes('goals5') && prog.dm.prog.goals5===5 && prog.coins===40 && prog.xpTotal===10);
  const st=dailyMissionStatus(); TASSERT('dailyMissionStatus shape', st.length===3 && st[1].id==='goals5' && st[1].done && st[1].prog===5 && st[1].n===5 && typeof st[1].text==='string' && st[1].text.includes('5'));
  Hooks.emit('ev','win',1); Hooks.emit('ev','play',1); Hooks.emit('ev','play',1);
  const bonusChest = hasChests ? (prog.chests.bronze|0)===1 && prog.coins===120 : prog.coins===120+ECON.daily.chestFallback.bronze;
  TASSERT('all three done → Bronze chest +25 xp (3×10+25), no key', prog.dm.done.length===3 && prog.dm.bonus===true && prog.keys===0 && prog.xpTotal===55 && bonusChest);
  Hooks.emit('ev','play',1); TASSERT('bonus paid once', prog.keys===0 && prog.xpTotal===55 && (!hasChests || (prog.chests.bronze|0)===1));
  // --- next-up: one step from done
  prog.dm={key:today, ids:['play2','goals5','win1'], prog:{goals5:4}, done:[], reroll:0, bonus:false};
  prog.cal={claimed:0, last:today, bronze:today, pack:null}; prog.daily=today;
  let nb=NextUp.best(); TASSERT('next-up: mission one step from done (prio 35)', nb && nb.prio===35 && typeof nb.action==='function');
  prog.cal={claimed:0, last:null, bronze:null, pack:null}; nb=NextUp.best(); TASSERT('next-up: pickup unclaimed wins (prio 50)', nb && nb.prio===50 && nb.action===openDailyPickup);
  prog.cal={claimed:0, last:today, bronze:today, pack:null}; prog.dm.prog={}; prog.daily=null; nb=NextUp.best(); TASSERT('next-up: match of the day (prio 25) with the opponent name', nb && nb.prio===25 && nb.text.includes(nm(CHARS[dailyInfo().opp])));
  // --- special events: early goal, israeli scorer, quick + margin via the 'play' event, fire wrap
  prog.dm={key:today, ids:['play2','early1','israeli1'], prog:{}, done:[], reroll:0, bonus:false};
  state='play'; matchFmt='quick'; timeLeft=matchTime()-10; selected=CHARS.findIndex(c=>c.id==='khalaili');
  Hooks.emit('ev','goal',1);
  TASSERT('goal in the first 30 s + israeli scorer', prog.dm.done.includes('early1') && prog.dm.done.includes('israeli1'));
  timeLeft=matchTime()-60; prog.dm={key:today, ids:['play2','early1','israeli1'], prog:{}, done:[], reroll:0, bonus:false}; selected=0; Hooks.emit('ev','goal',1);
  TASSERT('late goal / non-israeli → no progress', !(prog.dm.prog.early1|0) && !(prog.dm.prog.israeli1|0));
  prog.dm={key:today, ids:['play2','quick1','margin2'], prog:{}, done:[], reroll:0, bonus:false}; score.me=3; score.op=1; Hooks.emit('ev','play',1);
  TASSERT('play event: quick format + 2-goal margin', prog.dm.done.includes('quick1') && prog.dm.done.includes('margin2') && prog.dm.prog.play2===1);
  prog.dm={key:today, ids:['play2','power2','chest1'], prog:{}, done:[], reroll:0, bonus:false}; state='idle'; Hooks.emit('ev','ice',1); Hooks.emit('chest');
  TASSERT('ice → power, chest hook (no chests module) → chest', prog.dm.prog.power2===1 && prog.dm.done.includes('chest1'));
  // #4/#16: with the chests module present only a real 'chestOpen' counts, never a 'chest' grant (or a re-shown pick)
  prog.dm={key:today, ids:['play2','power2','chest1'], prog:{}, done:[], reroll:0, bonus:false}; window.openChest=()=>false;
  Hooks.emit('chest','bronze'); TASSERT('chests module present: a GIVEN chest does not count', !(prog.dm.prog.chest1|0));
  Hooks.emit('chestOpen','bronze',{}); TASSERT('a real chestOpen counts once', prog.dm.done.includes('chest1') && prog.dm.prog.chest1===1); delete window.openChest;
  // #14: the all-3 bonus is a Bronze chest, so a full key wallet owes nothing; owed keys (calendar) still land when a chest makes room
  prog.dm={key:today, ids:['play2','goals5','win1'], prog:{goals5:5, play2:2}, done:['goals5','play2'], reroll:0, bonus:false}; prog.keys=ECON.keyCap; prog.dailyKeyOwed=0; const xp0=prog.xpTotal|0, bc0=hasChests ? (prog.chests.bronze|0) : 0, cc0=prog.coins|0;
  Hooks.emit('ev','win',1);
  const bonusChest2 = hasChests ? (prog.chests.bronze|0)===bc0+1 : prog.coins===cc0+ECON.daily.missionCoins+ECON.daily.chestFallback.bronze;
  TASSERT('full wallet: bonus marked, XP paid once, Bronze chest given, no key owed', prog.dm.bonus===true && prog.keys===ECON.keyCap && (prog.dailyKeyOwed|0)===0 && bonusChest2 && prog.xpTotal===xp0+10+25);
  Hooks.emit('ev','win',1); TASSERT('no double bonus', (prog.dailyKeyOwed|0)===0 && prog.xpTotal===xp0+35 && (!hasChests || (prog.chests.bronze|0)===bc0+1));
  prog.dailyKeyOwed=1; spendKeys(1); TASSERT('a chest makes room → an owed key lands', prog.keys===ECON.keyCap && prog.dailyKeyOwed===0);
  prog.keys=ECON.keyCap; dailyGrant({keys:1}, 'calendar'); TASSERT('calendar key on a full wallet is owed too', prog.dailyKeyOwed===1); prog.keys=9; prog.dailyKeyOwed=0;
  // #58/#59: a match that crosses midnight is credited to the day it started (matchDay) — only while settling
  { const md=matchDay; matchDay='2000-01-02'; state='end'; delete prog.streakRewardDay; prog.streakDays=2; Hooks.emit('streakDay',2);
    TASSERT('streak reward stamped with the kick-off day while settling', prog.streakRewardDay==='2000-01-02');
    prog.dm={key:'2000-01-02', ids:['play2','goals5','win1'], prog:{}, done:[], reroll:0, bonus:false}; Hooks.emit('ev','goal',1);
    TASSERT("the started day's missions keep counting", prog.dm.key==='2000-01-02' && prog.dm.prog.goals5===1);
    state='idle'; TASSERT('outside a match: today', dailyDay()===today && dailyMissions().key===today); matchDay=md; delete prog.streakRewardDay; }
  // #66: whole calendar days, DST-immune
  { const t=new Date(now()), y=new Date(t.getFullYear(), t.getMonth(), t.getDate()-1), k=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
    TASSERT('dailyDaysSince: yesterday = 1, today = 0, bad key = huge', dailyDaysSince(k)===1 && dailyDaysSince(today)===0 && dailyDaysSince(null)>1e8 && dailyDaysSince('x')>1e8); }
  // --- reroll: free once, then 5 gems
  prog.dm={key:today, ids:['play2','goals5','win1'], prog:{goals5:2}, done:[], reroll:0, bonus:false}; prog.gems=0;
  missionsOpen(); await tick();
  TASSERT('missions modal shows 3 rows + free reroll label', $('#daily-missions-modal').classList.contains('show') && $('#dms-list').querySelectorAll('.dmr').length===3 && $('#btn-dms-reroll').textContent===T('dm.rerollFree'));
  $('#btn-dms-reroll').click();
  TASSERT('free reroll: play2 kept, others replaced, progress reset', prog.dm.reroll===1 && prog.dm.ids[0]==='play2' && !prog.dm.ids.includes('goals5') && !prog.dm.ids.includes('win1') && prog.dm.prog.goals5===undefined && new Set(prog.dm.ids).size===3);
  TASSERT('second reroll costs 5 gems', $('#btn-dms-reroll').textContent===T('dm.rerollGems',5));
  const ids1=prog.dm.ids.slice(); $('#btn-dms-reroll').click(); TASSERT('no gems → reroll refused', prog.dm.reroll===1 && JSON.stringify(prog.dm.ids)===JSON.stringify(ids1));
  prog.gems=7; $('#btn-dms-reroll').click(); TASSERT('with gems → reroll, 5 gems spent', prog.dm.reroll===2 && prog.gems===2 && JSON.stringify(prog.dm.ids)!==JSON.stringify(ids1));
  $('#btn-dms-close').click(); TASSERT('missions modal closes', !$('#daily-missions-modal').classList.contains('show'));
  // --- calendar tiles
  TASSERT('calendar tiles: 40 → 120, keys on 3/10, chest 7, gems 14, 150 on 21, kit day 28', calTile(1).coins===40 && calTile(28).coins===300 && calTile(28).gems===10 && calTile(27).coins===117 && calTile(3).keys===1 && calTile(10).keys===1 && calTile(10).freeze===1 && calTile(7).chest==='bronze' && calTile(14).gems===5 && calTile(21).coins===150);
  // #13: day 28 really hands out a kit (text names it); when every kit is owned the tile says and pays +10 gems instead
  { prog.cos={items:[]}; const kit=dailyKitPick(); const g0=prog.gems|0;
    TASSERT('day 28 text names an unowned kit', !!kit && kit.type==='kit' && dailyRewardText(calTile(28)).includes('👕 '+cosName(kit)));
    dailyGrant(calTile(28), 'calendar'); TASSERT('day 28 grant: the kit lands, gems 10', cosOwned(kit.id) && prog.gems===g0+10);
    prog.cos.items=COSMETICS.filter(c=>c.type==='kit').map(c=>c.id);
    TASSERT('all kits owned: no 👕, gems 20 promised and paid', !dailyRewardText(calTile(28)).includes('👕') && dailyRewardText(calTile(28)).includes('💎 20'));
    dailyGrant(calTile(28), 'calendar'); TASSERT('gem top-up instead of a kit', prog.gems===g0+30); prog.cos={items:[]}; }
  // --- pickup modal: one tap claims everything, once per day
  prog.cal={claimed:0, last:null, bronze:null, pack:null}; prog.coins=0; delete prog.packs;
  TASSERT('pickupDue before the claim', pickupDue()===true);
  openDailyPickup(); await tick();
  TASSERT('pickup modal: 2 rows (tile + bronze), button live', $('#daily-pickup-modal').classList.contains('show') && $('#dpk-rows').querySelectorAll('.dpk-row:not(.dim)').length===2 && !$('#btn-dpk-all').disabled);
  $('#btn-dpk-all').click();
  TASSERT('take all: 40 + 80 coins, counter 1, stamped today', prog.coins===120 && prog.cal.claimed===1 && prog.cal.last===today && prog.cal.bronze===today && pickupDue()===false);
  TASSERT('after the claim: tomorrow dimmed, button off', $('#dpk-rows').querySelector('.dpk-row.dim') && $('#btn-dpk-all').disabled && $('#dpk-rows').querySelectorAll('.dpk-row.done').length===2);
  claimDailyAll(); $('#btn-dpk-all').click(); TASSERT('cannot claim twice the same day', prog.coins===120 && prog.cal.claimed===1);
  $('#btn-dpk-cal').click(); await tick(); TASSERT('28-tile calendar opens, tile 1 claimed, tile 2 next', $('#daily-cal-modal').classList.contains('show') && $('#dcal-grid').querySelectorAll('.dcal-tile').length===28 && $('#dcal-grid').children[0].classList.contains('got') && $('#dcal-grid').children[1].classList.contains('next'));
  prog.cal.last=null; calendarOpen(); TASSERT('calendar: unclaimed today → tile 2 is "now"', $('#dcal-grid').children[1].classList.contains('now') && !$('#dcal-grid').children[1].classList.contains('got')); prog.cal.last=today;
  $('#btn-dcal-close').click(); $('#btn-dpk-close').click(); TASSERT('pickup + calendar close', !$('#daily-pickup-modal').classList.contains('show') && !$('#daily-cal-modal').classList.contains('show'));
  prog.cal.claimed=28; TASSERT('tile counter cycles after 28', calTodayN()===1);
  prog.packs={}; TASSERT('sticker pack row appears when the album tracks packs', dailyRows().length===3 && dailyRows()[2].id==='pack'); delete prog.packs;
  // --- streak: cycle rewards, keys, chest fallback, milestones, streakInfo
  prog.coins=0; prog.gems=0; prog.keys=0; prog.streakDays=3; delete prog.streakRewardDay; prog.streakMs=[]; prog.dailyTitles=[]; prog.streakBroken=0;
  Hooks.emit('streakDay',3);
  TASSERT('streak day 3 → 100 coins + 1 key', prog.coins===100 && prog.keys===1);
  Hooks.emit('streakDay',3); TASSERT('cycle reward paid once per day', prog.coins===100 && prog.keys===1);
  delete prog.streakRewardDay; prog.streakDays=7; Hooks.emit('streakDay',7);
  TASSERT('day 7 → Silver chest (300 coins fallback) + 3 gems + milestone 3 gems + title', prog.coins===400 && prog.gems===6 && prog.streakMs.includes(7) && prog.dailyTitles.includes('t7') && dailyTitles()[0]===T('dm.title.t7'));
  delete prog.streakRewardDay; Hooks.emit('streakDay',7); TASSERT('milestone not paid twice (cycle gems 3 again, milestone 3 not)', prog.gems===9 && prog.streakMs.length===1 && prog.dailyTitles.length===1);
  delete prog.streakRewardDay; prog.streakDays=8; Hooks.emit('streakDay',8);
  TASSERT('day 8 = cycle day 1 → 50 coins', prog.coins===750);
  const si=streakInfo(); TASSERT('streakInfo: days 8, cycleDay 1, next = 75 coins', si.days===8 && si.cycleDay===1 && si.nextReward.coins===75 && si.freezes===(prog.freezes|0));
  // the celebration modal shows on the next home visit
  showScreen('home'); await new Promise(r=>setTimeout(r, ECON.daily.celebMs+ECON.daily.autoOpenMs));
  TASSERT('🔥 celebration modal after the streak day', $('#daily-streak-modal').classList.contains('show') && $('#dstk-day').textContent===T('dm.day',8));
  $('#btn-dstk-ok').click(); TASSERT('celebration closes', !$('#daily-streak-modal').classList.contains('show'));
  // --- Monday freeze refill
  prog.freezes=0; delete prog.freezeWeek; TASSERT('weekly free freeze', dailyFreezeRefill()===true && prog.freezes===1 && dailyFreezeRefill()===false);
  prog.freezes=2; delete prog.freezeWeek; dailyFreezeRefill(); TASSERT('freezes capped at 2', prog.freezes===2);
  // --- save the streak
  prog.streakBroken=12; prog.streakDays=1; delete prog.streakRewardDay; delete prog.streakSave; delete prog.streakSaveUsed; prog.cal.autoShown=today;
  Hooks.emit('streakDay',1);
  TASSERT('broken streak → offer prepared, flag cleared', prog.streakSave && prog.streakSave.broken===12 && prog.streakBroken===0);
  showScreen('home'); await new Promise(r=>setTimeout(r, ECON.daily.autoOpenMs+80));
  TASSERT('save-the-streak modal on home', $('#daily-save-modal').classList.contains('show') && $('#dsv-text').textContent.includes('12'));
  $('#btn-dsv-yes').click();
  TASSERT('accepted: active for 48 h, used today', prog.streakSave.active===true && prog.streakSave.until>now() && prog.streakSaveUsed===today && !$('#daily-save-modal').classList.contains('show'));
  Hooks.emit('matchEnd', {outcome:'lose', score:{me:0,op:1}, training:false, fmt:'quick', earn:{}, pay:null});
  TASSERT('one match restores the streak: 12 + 1', prog.streakDays===13 && !prog.streakSave);
  prog.streakBroken=5; delete prog.streakRewardDay; Hooks.emit('streakDay',1); TASSERT('no second offer within 30 days', !prog.streakSave && prog.streakBroken===0);
  $('#daily-streak-modal').classList.remove('show'); _dailyCeleb=null;
  // --- home card
  let card=$('#daily-card'); if(!card){ card=document.createElement('div'); card.id='daily-card'; $('#home').appendChild(card); }
  prog.cal={claimed:1, last:null, bronze:null, pack:null}; refreshDailyCard();
  TASSERT('home module contract: bindDailyCard exists, no chest wrapping left', typeof bindDailyCard==='function' && typeof _dailyChestWrapped==='undefined' && typeof dailyWrapChest==='undefined');
  TASSERT('home card: flame, pickup button due, 3 mission bars, motd row', card.querySelector('.dcard-flame').textContent.includes('13') && card.querySelector('.dcard-pick.due') && card.querySelectorAll('.dcard-m').length===3 && card.querySelector('.dcard-motd'));
  card.querySelector('[data-daily="pickup"]').click(); await tick(); TASSERT('card button opens the pickup', $('#daily-pickup-modal').classList.contains('show')); $('#btn-dpk-close').click();
  card.querySelector('[data-daily="missions"]').click(); await tick(); TASSERT('card missions open the missions modal', $('#daily-missions-modal').classList.contains('show')); $('#btn-dms-close').click();
  card.querySelector('[data-daily="motd"]').click(); await tick(); TASSERT('card motd row opens the core daily modal', $('#daily-modal').classList.contains('show')); $('#btn-daily-cancel').click();
  // --- auto-open on home: due + played ≥1 match + not shown today
  prog.matches=1; prog.cal.autoShown=null; prog.onboard={pickup:true}; showScreen('chars'); showScreen('home'); await new Promise(r=>setTimeout(r, ECON.daily.autoOpenMs+80));
  TASSERT('pickup auto-opens once a day on home (after the onboarding introduced it)', $('#daily-pickup-modal').classList.contains('show') && prog.cal.autoShown===today);
  $('#btn-dpk-close').click(); showScreen('chars'); showScreen('home'); await new Promise(r=>setTimeout(r, ECON.daily.autoOpenMs+80));
  TASSERT('not auto-opened twice', !$('#daily-pickup-modal').classList.contains('show'));
  // --- a real match: play2 ticks, the end card shows the mission line
  prog.dm={key:today, ids:['play2','goals5','win1'], prog:{}, done:[], reroll:0, bonus:false}; _dmTouched={};
  settings.format='quick'; level=LEVELS[1]; mp=null; dailyMatch=false; beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=0; endGame(); await tick();
  TASSERT('real match: play2 1/2, win1 done, end-card line visible', prog.dm.prog.play2===1 && prog.dm.done.includes('win1') && $('#daily-end-line') && !$('#daily-end-line').hidden && $('#daily-end-line').textContent.includes('🏆'));
  goHome();
  TASSERT('no new script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
