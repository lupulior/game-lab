/* ===================================================================================================
   DAILY LOOP — the gentle streak (7-day reward cycle, milestones, free freezes, "save the streak"),
   3 daily missions from a pool of 16, the 28-day calendar, the one-tap daily pickup, the Match of the
   Day row and the home "היום" card. Spec: PLAN.md §4.1–4.4, §2.1. Every number lives in ECON.daily.
   =================================================================================================== */
Object.assign(ECON, { daily: {
  cycle:[50,75,100,125,150,200,0],            // coins on the first match of each day of the 7-day cycle (day 7 = Silver chest + gems instead)
  cycleKeyDay:3, cycleChestDay:7, cycleChest:'silver', cycleGems:3,
  milestones:[[7,3],[14,5],[30,10],[60,20],[100,50],[365,150]],   // [streak days, gems] + a title each
  freezeMax:2, freezeWeekly:1, freezeCalDay:10, saveDays:30, saveHours:48,
  missionCoins:40, missionXP:10, allChest:'bronze', allXP:25, freeRerolls:1, rerollGems:5,   // all three missions → a Bronze chest + XP (allKey is gone: keys open only the gold chest)
  calDays:28, calMin:40, calMax:120, calKeyDays:[3,10], calChestDay:7, calChest:'bronze', calGemsDay:14, calGems:5,
  calPackDay:21, calPackCoins:150, calKitDay:28, calKitCoins:300, calKitGems:10,
  bronzeCoins:80, packCoins:100,              // the free daily Bronze chest / sticker pack, when no chests / album module exists
  chestFallback:{bronze:80, silver:300, gold:900},
  autoOpenMs:500, celebMs:450,
}});

/* ----- small helpers ----- */
function dailyHash(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h; }
function dailyRnd(seed){ let s=(seed>>>0)||1; return ()=>{ s=(Math.imul(s,1103515245)+12345)>>>0; return s/4294967296; }; }
/* whole local calendar days since a 'YYYY-MM-DD' key (Date.UTC on local y/m/d parts: a 23- or 25-hour DST day still counts as one day) */
function dailyDaysSince(key){
  if(!key) return 1e9; const [Y,M,D]=String(key).split('-').map(Number); if(!(Y>0 && M>0 && D>0)) return 1e9;
  const t=new Date(now()); return Math.round((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())-Date.UTC(Y, M-1, D))/864e5);
}
/* the day a reward belongs to: while a match is being settled (streakDay / ev / matchEnd fire with state 'end') it is the server day
   captured at kick-off (core: matchDay), so a match that crosses midnight is credited to the day it started; otherwise today */
function dailyDay(){ return (typeof matchDay!=='undefined' && matchDay && typeof inMatch==='function' && inMatch()) ? matchDay : dayKey(); }
function dailyOverlayOpen(){ return !!document.querySelector('.overlay.show'); }
function dailyGiveChest(kind, why){   // the chests module hands out real chests (with its own toast); until it exists a chest is its coin value
  if(typeof giveChest==='function'){ try{ giveChest(kind); return true; }catch(e){ console.error(e); } }
  addCoins(ECON.daily.chestFallback[kind]||0, why||'daily'); return false;
}
/* keys never vanish: addKeys() returns what fitted under the key cap; the rest is owed and paid the moment a chest makes room */
function dailyAddKeys(n, why){
  n=n|0; if(n<=0) return 0; const got=addKeys(n, why)|0;
  if(got<n){ prog.dailyKeyOwed=(prog.dailyKeyOwed|0)+(n-got); saveProg(); }
  return got;
}
function dailyPayOwedKeys(){
  const owed=prog.dailyKeyOwed|0; if(owed<=0 || (prog.keys|0)>=ECON.keyCap) return 0;
  prog.dailyKeyOwed=0; const got=addKeys(owed, 'owed')|0; if(got<owed) prog.dailyKeyOwed=owed-got; saveProg(); return got;
}
Hooks.on('wallet', ()=>{ if((prog.dailyKeyOwed|0)>0) dailyPayOwedKeys(); });
/* the calendar kit (day 28): any unowned kit the shop currently sells — when every kit is owned the tile pays gems instead */
function dailyKitPick(){
  const avail = c => typeof shopAvailable==='function' ? shopAvailable(c) : !c.week;
  return COSMETICS.find(c=>c.type==='kit' && avail(c) && !cosOwned(c.id)) || null;
}
function dailyGiveKit(){
  const k=dailyKitPick(); if(!k) return false;
  if(typeof giveCosmetic==='function') return !!giveCosmetic(k.id);
  prog.cos=prog.cos||{}; prog.cos.items=prog.cos.items||[]; if(prog.cos.items.includes(k.id)) return false;
  prog.cos.items.push(k.id); saveProg(); toast(T('dm.kitGot', cosName(k)),'ach'); return true;
}
/* a reward bundle {coins,gems,keys,chest,freeze,kit} → text and payment (the text always matches what dailyGrant can pay) */
function dailyRewardText(r){
  const b=[], kit = r.kit ? dailyKitPick() : null, gems=(r.gems|0)+(r.kit && !kit ? ECON.daily.calKitGems : 0);
  if(r.chest) b.push('🎁 '+T('dm.chest.'+r.chest));
  if(r.coins) b.push('🪙 '+fmtNum(r.coins));
  if(gems) b.push('💎 '+gems);
  if(r.keys) b.push('🔑 '+r.keys);
  if(r.freeze) b.push('❄️ '+r.freeze);
  if(kit) b.push('👕 '+cosName(kit));
  return b.join(' + ');
}
function dailyGrant(r, why){
  if(r.chest) dailyGiveChest(r.chest, why);
  if(r.coins) addCoins(r.coins, why);
  if(r.gems) addGems(r.gems, why);
  if(r.keys) dailyAddKeys(r.keys, why);
  if(r.freeze){ prog.freezes=Math.min(ECON.daily.freezeMax, (prog.freezes|0)+r.freeze); }
  if(r.kit && !dailyGiveKit()) addGems(ECON.daily.calKitGems, why);
  saveProg();
}

/* =====================================================================================================
   1. STREAK — the core stamps the day and fires 'streakDay'(days); we pay the cycle reward and milestones
   ===================================================================================================== */
function streakCycleReward(cycleDay){          // cycleDay 1..7 → {coins,keys,chest,gems}
  const D=ECON.daily, r={coins:0, gems:0, keys:0, chest:null};
  if(cycleDay===D.cycleChestDay){ r.chest=D.cycleChest; r.gems=D.cycleGems; }
  else { r.coins=D.cycle[cycleDay-1]|0; if(cycleDay===D.cycleKeyDay) r.keys=1; }
  return r;
}
function streakInfo(){
  const days=prog.streakDays|0, cycleDay=days>0 ? ((days-1)%7)+1 : 0;
  return { days, freezes:prog.freezes|0, cycleDay, nextReward: streakCycleReward(cycleDay>=7||cycleDay===0 ? 1 : cycleDay+1), broken:prog.streakBroken|0, save:prog.streakSave||null };
}
function dailyTitles(){ return (prog.dailyTitles||[]).map(k=>T('dm.title.'+k)); }
let _dailyCeleb=null, _dailyStreakToday=0;
function dailyFreezeRefill(){               // +1 free freeze every Monday (weekKey weeks start on Monday), at most 2 held
  const w=weekCounter('freezeWeek'); if(w.n>0) return false;
  w.n=1; prog.freezes=Math.min(ECON.daily.freezeMax, (prog.freezes|0)+ECON.daily.freezeWeekly); saveProg(); return true;
}
function dailyStreakDay(days){
  const k=dailyDay(); if(prog.streakRewardDay===k) return; prog.streakRewardDay=k;   // the day the match started, not the day it ended
  /* a broken streak: offer "save the streak" once per 30 days (the modal shows on the next home visit) */
  if((prog.streakBroken|0)>0){
    if(dailyDaysSince(prog.streakSaveUsed)>=ECON.daily.saveDays) prog.streakSave={broken:prog.streakBroken|0, offered:false, active:false};
    prog.streakBroken=0;
  }
  const cd=((days-1)%7)+1, r=streakCycleReward(cd);
  dailyGrant(r, 'streak');
  /* milestones: gems + a title, each once */
  prog.streakMs=prog.streakMs||[]; prog.dailyTitles=prog.dailyTitles||[];
  for(const [m,g] of ECON.daily.milestones){ if(days>=m && !prog.streakMs.includes(m)){ prog.streakMs.push(m); addGems(g,'streak'); if(!prog.dailyTitles.includes('t'+m)) prog.dailyTitles.push('t'+m); } }
  _dailyStreakToday=days; _dailyCeleb={days, text:dailyRewardText(r), cd};
  saveProg(); refreshDailyCard();
}
Hooks.on('streakDay', dailyStreakDay);
function dailyShowCeleb(){
  const c=_dailyCeleb; if(!c) return false; _dailyCeleb=null;
  $('#dstk-day').textContent=T('dm.day', c.days); $('#dstk-reward').textContent=c.text;
  const ms=ECON.daily.milestones.find(x=>x[0]===c.days); $('#dstk-ms').hidden=!ms; if(ms) $('#dstk-ms').textContent=T('dm.milestone', ms[1], T('dm.title.t'+ms[0]));
  $('#dstk-next').textContent=T('dm.tomorrow', dailyRewardText(streakCycleReward(c.cd>=7 ? 1 : c.cd+1)));
  $('#daily-streak-modal').classList.add('show'); try{ sfx.win(); confetti.burst(c.days%7===0 ? 220 : 90); }catch(e){} return true;
}
/* save the streak: one match within 48 h brings the old streak back */
function dailyShowSave(){
  const s=prog.streakSave; if(!s || s.offered) return false;
  $('#dsv-text').textContent=T('dm.saveText', s.broken); $('#daily-save-modal').classList.add('show'); return true;
}
function dailySaveAccept(){ const s=prog.streakSave; if(!s) return; s.offered=true; s.active=true; s.until=now()+ECON.daily.saveHours*36e5; prog.streakSaveUsed=dayKey(); saveProg(); $('#daily-save-modal').classList.remove('show'); toast(T('dm.saveGo'),'ach'); refreshDailyCard(); }
function dailySaveDecline(){ delete prog.streakSave; prog.streakSaveUsed=dayKey(); saveProg(); $('#daily-save-modal').classList.remove('show'); }
function dailySaveCheck(info){               // called on matchEnd: the restoring match
  const s=prog.streakSave; if(!s || !s.active) return false;
  if(now()>s.until){ delete prog.streakSave; saveProg(); return false; }
  prog.streakDays=(s.broken|0)+(prog.streakDays|0); delete prog.streakSave; saveProg();
  toast(T('dm.saved', prog.streakDays),'ach'); try{ sfx.win(); confetti.burst(160); }catch(e){} refreshDailyCard(); return true;
}

/* =====================================================================================================
   2. MISSIONS — 3 a day from a pool of 16, seeded by the server day; play2 is always slot 1
   ===================================================================================================== */
const DM_POOL=[
  {id:'play2',     ev:'play',    n:2, icon:'🎮'},
  {id:'goals5',    ev:'goal',    n:5, icon:'⚽'},
  {id:'win1',      ev:'win',     n:1, icon:'🏆'},
  {id:'motd',      ev:'daily',   n:1, icon:'📅'},
  {id:'quick1',    ev:'quick',   n:1, icon:'⚡'},
  {id:'header1',   ev:'header',  n:1, icon:'🧠'},
  {id:'slide3',    ev:'slide',   n:3, icon:'🦵'},
  {id:'pk1',       ev:'pk',      n:1, icon:'🥅'},
  {id:'hard1',     ev:'winHard', n:1, icon:'🔥'},
  {id:'v2online1', ev:'v2online',n:1, icon:'👥'},
  {id:'early1',    ev:'early',   n:1, icon:'⏱️'},
  {id:'clean1',    ev:'clean',   n:1, icon:'🧱'},
  {id:'power2',    ev:'power',   n:2, icon:'❄️'},
  {id:'chest1',    ev:'chest',   n:1, icon:'🎁'},
  {id:'israeli1',  ev:'israeli', n:1, icon:'🇮🇱'},
  {id:'margin2',   ev:'margin',  n:1, icon:'💪'},
];
const dmById = id => DM_POOL.find(m=>m.id===id);
const dmText = m => T('dm.'+m.id, m.n);
function dmPick(key, salt, avoid){
  const rnd=dailyRnd(dailyHash(key+'#'+salt)), pool=DM_POOL.filter(m=>m.id!=='play2' && !(avoid||[]).includes(m.id)).map(m=>m.id), out=[];
  while(out.length<2 && pool.length) out.push(pool.splice(Math.floor(rnd()*pool.length),1)[0]);
  return out;
}
function dailyMissions(){
  const k=dailyDay();                                 // a match across midnight still feeds the missions of the day it started on
  if(!prog.dm || prog.dm.key!==k){ prog.dm={key:k, ids:['play2'].concat(dmPick(k,0)), prog:{}, done:[], reroll:0, bonus:false}; saveProg(); }
  return prog.dm;
}
function dailyMissionStatus(){
  const dm=dailyMissions();
  return dm.ids.map(id=>{ const m=dmById(id); return m ? {id, text:dmText(m), icon:m.icon, n:m.n, prog:Math.min(m.n, dm.prog[id]|0), done:dm.done.includes(id)} : null; }).filter(Boolean);
}
let _dmTouched={};
function dmEvent(ev, n=1){
  if(training) return false;
  const dm=dailyMissions(); let changed=false;
  for(const id of dm.ids){
    const m=dmById(id); if(!m || m.ev!==ev || dm.done.includes(id)) continue;
    dm.prog[id]=Math.min(m.n, (dm.prog[id]|0)+(n|0||1)); changed=true; _dmTouched[id]=true;
    if(dm.prog[id]>=m.n){
      dm.done.push(id); addCoins(ECON.daily.missionCoins,'mission'); addXP(ECON.daily.missionXP, true);
      if(!(matchEarn && inMatch())){ toast(T('dm.done', dmText(m)),'ach'); try{ sfx.win(); }catch(e){} }
      if(dm.done.length>=3 && !dm.bonus){ dm.bonus=true; dailyGiveChest(ECON.daily.allChest,'missions'); addXP(ECON.daily.allXP, true); if(!(matchEarn && inMatch())) toast(T('dm.all'),'ach'); }   // the bonus is a Bronze chest (coins when no chests module exists)
    }
  }
  if(changed){ saveProg(); refreshDailyCard(); }
  return changed;
}
function dailyRerollCost(){ const dm=dailyMissions(); return dm.reroll<ECON.daily.freeRerolls ? 0 : ECON.daily.rerollGems; }
function dailyReroll(){
  const dm=dailyMissions(), cost=dailyRerollCost();
  const open=dm.ids.filter(id=>id!=='play2' && !dm.done.includes(id)); if(!open.length){ toast(T('dm.rerollNone'),'warn'); return false; }
  if(cost && !spendGems(cost)){ toast(T('dm.noGems', cost),'warn'); return false; }
  const fresh=dmPick(dm.key, dm.reroll+1, dm.ids);
  dm.ids=dm.ids.map(id=> open.includes(id) ? (fresh.shift()||id) : id);
  for(const id of open) delete dm.prog[id];
  dm.reroll++; saveProg(); try{ sfx.click(); }catch(e){} refreshDailyCard(); missionsRender(); return true;
}
function missionsRender(){
  const dm=dailyMissions(), st=dailyMissionStatus(), D=ECON.daily;
  $('#dms-list').innerHTML=st.map(s=>`<div class="dmr ${s.done?'done':''}"><span class="dmi">${s.icon}</span><span class="dmt">${esc(s.text)}</span><span class="dmb"><i style="width:${Math.round(s.prog/s.n*100)}%"></i></span><span class="dmn">${s.done?'✔':s.prog+'/'+s.n}</span><span class="dmx">${s.done?'✔':'🪙 '+D.missionCoins}</span></div>`).join('');
  const all=dm.done.length>=3; $('#dms-bonus').textContent=(all?'✔ ':'')+T('dm.bonus', T('dm.chest.'+D.allChest), D.allXP); $('#dms-bonus').classList.toggle('on', all);
  const cost=dailyRerollCost(), can=dm.ids.some(id=>id!=='play2' && !dm.done.includes(id));
  const rb=$('#btn-dms-reroll'); rb.textContent=cost ? T('dm.rerollGems', cost) : T('dm.rerollFree'); rb.disabled=!can; rb.classList.toggle('d-off', !can);
}
function missionsOpen(){ missionsRender(); $('#daily-missions-modal').classList.add('show'); }

/* gameplay events → missions (the core fires 'ev' for every challenge event; a few need a look at the match state) */
Hooks.on('ev', (ev, n)=>{
  dmEvent(ev, n);
  if(ev==='goal'){
    if(state!=='idle' && timeLeft > matchTime()-30) dmEvent('early', 1);
    if(ISRAELI_IDS.includes(CHARS[selected].id)) dmEvent('israeli', 1);
  }
  if(ev==='ice') dmEvent('power', 1);
  if(ev==='v2win' || ev==='online') dmEvent('v2online', 1);
  if(ev==='play'){                                   // fired inside showEnd while the end card still collects rewards
    if(matchFmt==='quick') dmEvent('quick', 1);
    if(score.me>score.op && score.me-score.op>=2) dmEvent('margin', 1);
  }
});
/* the fire power has no challenge event: count a real use by wrapping it (fireBusy flips only when it fired) */
{ const _useFire=useFire; useFire=function(){ const was=fireBusy; _useFire.apply(this, arguments); if(!was && fireBusy) dmEvent('power', 1); }; }
/* "open a chest": the chests module emits 'chestOpen' only after a chest was really paid for and opened (never when a pending pick is
   re-shown). Its 'chest' hook fires when a chest is GIVEN (our own streak/calendar rewards do that), so that one only counts in a build
   without the chests module at all (checked at call time). */
Hooks.on('chestOpen', ()=>dmEvent('chest', 1));
Hooks.on('chest', ()=>{ if(typeof openChest!=='function') dmEvent('chest', 1); });

/* =====================================================================================================
   3. CALENDAR + the one-tap pickup
   ===================================================================================================== */
function dailyCal(){ prog.cal=prog.cal||{claimed:0, last:null, bronze:null, pack:null, autoShown:null}; return prog.cal; }
function calTile(n){                               // tile n (1..28) → reward bundle; the counter cycles after 28
  const D=ECON.daily, r={n, coins:0, gems:0, keys:0, chest:null, freeze:0};
  if(n===D.calKitDay){ r.coins=D.calKitCoins; r.gems=D.calKitGems; r.kit=true; }
  else if(n===D.calPackDay){ r.coins=D.calPackCoins; r.pack=true; }
  else if(n===D.calGemsDay) r.gems=D.calGems;
  else if(n===D.calChestDay) r.chest=D.calChest;
  else if(D.calKeyDays.includes(n)){ r.keys=1; if(n===D.freezeCalDay) r.freeze=1; }
  else r.coins=D.calMin+Math.round((n-1)*(D.calMax-D.calMin)/(D.calDays-1));
  return r;
}
function calTodayN(){ return (dailyCal().claimed % ECON.daily.calDays)+1; }
function dailyHasPacks(){ return !!(prog.packs && typeof prog.packs==='object'); }
function dailyRows(){                              // what the pickup modal shows: [{id, icon, text, reward, claimed}]
  const c=dailyCal(), k=dayKey(), n=calTodayN(), rows=[];
  rows.push({id:'cal', icon:'📅', text:T('dm.calDay', n), reward:dailyRewardText(calTile(n)), claimed:c.last===k});
  rows.push({id:'bronze', icon:'🎁', text:T('dm.bronzeFree'), reward: typeof claimDailyBronze==='function' ? T('dm.chest.bronze') : '🪙 '+ECON.daily.bronzeCoins, claimed:c.bronze===k});
  if(dailyHasPacks()) rows.push({id:'pack', icon:'🃏', text:T('dm.packFree'), reward:'🪙 '+ECON.daily.packCoins, claimed:c.pack===k});
  return rows;
}
function pickupDue(){ return dailyRows().some(r=>!r.claimed); }
function claimDailyAll(){
  const c=dailyCal(), k=dayKey(); let got=0;
  for(const r of dailyRows()){
    if(r.claimed) continue; got++;
    if(r.id==='cal'){ dailyGrant(calTile(calTodayN()), 'calendar'); c.claimed=(c.claimed|0)+1; c.last=k; }
    else if(r.id==='bronze'){ c.bronze=k; if(typeof claimDailyBronze==='function'){ try{ claimDailyBronze(); }catch(e){ console.error(e); } } else addCoins(ECON.daily.bronzeCoins,'dailyBronze'); }
    else if(r.id==='pack'){ c.pack=k; addCoins(ECON.daily.packCoins,'dailyPack'); }
  }
  if(!got) return false;
  saveProg(); try{ sfx.win(); confetti.burst(180); }catch(e){} refreshDailyCard(); return true;
}
function pickupRender(){
  const rows=dailyRows(), due=rows.some(r=>!r.claimed), c=dailyCal();
  let html=rows.map(r=>`<div class="dpk-row ${r.claimed?'done':''}"><span class="dpi">${r.icon}</span><span class="dpt">${esc(r.text)}</span><span class="dpr">${esc(r.reward)}</span><span class="dpc">${r.claimed?'✔':''}</span></div>`).join('');
  if(!due){ const t=calTile(calTodayN()); html+=`<div class="dpk-row dim"><span class="dpi">🌙</span><span class="dpt">${esc(T('dm.calTomorrow', t.n))}</span><span class="dpr">${esc(dailyRewardText(t))}</span><span class="dpc"></span></div>`; }
  $('#dpk-rows').innerHTML=html;
  const b=$('#btn-dpk-all'); b.textContent=due ? T('dm.takeAll') : T('dm.taken'); b.disabled=!due; b.classList.toggle('d-off', !due);
  $('#dpk-sub').textContent=T('dm.calCount', c.claimed % ECON.daily.calDays, ECON.daily.calDays);
}
function openDailyPickup(){ pickupRender(); $('#daily-pickup-modal').classList.add('show'); }
function calendarOpen(){
  const c=dailyCal(), n=calTodayN(), today=c.last===dayKey(), D=ECON.daily, tiles=[];
  for(let i=1;i<=D.calDays;i++){ const t=calTile(i), st = i<n ? 'got' : i===n ? (today ? 'next' : 'now') : '';   /* n = the next unclaimed tile; after today's claim it is tomorrow's */ tiles.push(`<div class="dcal-tile ${st}"><b>${i}</b><span>${st==='got'?'✔':esc(dailyRewardText(t))}</span></div>`); }
  $('#dcal-grid').innerHTML=tiles.join(''); $('#dcal-sub').textContent=T('dm.calCount', c.claimed % D.calDays, D.calDays);
  $('#daily-cal-modal').classList.add('show');
}
/* auto-open once a day on the home screen (after the first match ever, never over another modal) */
Hooks.on('screen', id=>{
  if(id!=='home') return;
  dailyFreezeRefill();
  setTimeout(()=>{
    if(!$('#home').classList.contains('active') || dailyOverlayOpen() || mp || prog.welcomeDue) return;
    if(dailyShowSave()) return;
    if(dailyShowCeleb()) return;
    const c=dailyCal();
    const onbDone = !!(prog.onboard && prog.onboard.pickup) || (prog.matches|0)>=4;   // the onboarding card introduces the pickup first
    if(pickupDue() && (prog.matches|0)>=1 && onbDone && c.autoShown!==dayKey()){ c.autoShown=dayKey(); saveProg(); openDailyPickup(); }
  }, ECON.daily.autoOpenMs);
});

/* =====================================================================================================
   4. Next-up candidates, the end card line, the home "היום" card
   ===================================================================================================== */
function dailyMotdOpen(){ if(typeof openDaily==='function') openDaily(); else { const b=$('#btn-daily'); if(b) b.click(); } }
NextUp.add(()=> pickupDue() ? {prio:50, icon:'🎁', text:T('dm.nextPickup'), action:openDailyPickup} : null);
NextUp.add(()=>{ const s=dailyMissionStatus().find(x=>!x.done && x.prog>0 && x.n-x.prog===1); return s ? {prio:35, icon:s.icon, text:T('dm.nextMission', s.text), action:missionsOpen} : null; });
NextUp.add(()=>{ const d=dailyInfo(); return d.done ? null : {prio:25, icon:'📅', text:T('dm.nextMotd', nm(CHARS[d.opp])), action:dailyMotdOpen}; });

Hooks.on('matchEnd', info=>{
  if(info.training) return;
  dailySaveCheck(info);
  if(typeof endcardRow==='function'){ _dailyStreakToday=0; _dmTouched={}; return; }   // the end-card module draws the mission ticks and the streak day itself
  const bits=[]; if(_dailyStreakToday){ bits.push('🔥 '+T('dm.dayDone', _dailyStreakToday)); _dailyStreakToday=0; }
  for(const s of dailyMissionStatus()){ if(_dmTouched[s.id]) bits.push(s.icon+' '+(s.done?'✔':s.prog+'/'+s.n)); }
  _dmTouched={};
  let el=$('#daily-end-line'); if(!el){ el=document.createElement('div'); el.id='daily-end-line'; const btns=$('#end-btns'); if(btns) btns.parentNode.insertBefore(el, btns); }
  el.hidden=!bits.length; el.textContent=bits.join('  ·  ');
});

function dailyCardHTML(){
  const si=streakInfo(), st=dailyMissionStatus(), due=pickupDue(), d=dailyInfo();
  const bars=st.map(s=>`<div class="dcard-m ${s.done?'done':''}"><span class="dcard-mi">${s.icon}</span><span class="dcard-mb"><i style="width:${Math.round(s.prog/s.n*100)}%"></i></span><span class="dcard-mn">${s.done?'✔':s.prog+'/'+s.n}</span></div>`).join('');
  return `<div class="dcard">
    <div class="dcard-head"><span class="dcard-title">📅 ${esc(T('dm.cardTitle'))}</span><span class="dcard-flame ${si.days?'':'cold'}">🔥 ${esc(T('dm.day', si.days))}${si.freezes?` <span class="dcard-frz">❄️×${si.freezes}</span>`:''}</span></div>
    <button class="btn yellow small dcard-pick ${due?'due':'d-off'}" data-daily="pickup">${due?T('dm.pickup'):T('dm.pickedUp')}</button>
    <div class="dcard-missions" data-daily="missions">${bars}</div>
    <div class="dcard-motd" data-daily="motd">📅 ${esc(T('dm.motdRow', nm(CHARS[d.opp])))} ${d.done?'✔':'▶'}</div>
  </div>`;
}
/* the home module owns the container (#today-card, or #daily-card); clicks inside the card are delegated on the document through data-daily */
function refreshDailyCard(){ const el=$('#today-card')||$('#daily-card'); if(!el) return; el.innerHTML=dailyCardHTML(); }
function bindDailyCard(card){ /* nothing to bind: every [data-daily] element is handled by the document-level listener below */ return card; }
Hooks.on('home', refreshDailyCard);
document.addEventListener('click', e=>{
  const el=e.target && e.target.closest ? e.target.closest('[data-daily]') : null; if(!el) return;
  try{ sfx.click(); }catch(x){}
  const a=el.getAttribute('data-daily');
  if(a==='pickup') openDailyPickup(); else if(a==='missions') missionsOpen(); else if(a==='motd') dailyMotdOpen();
});

/* ----- modal buttons ----- */
$('#btn-dpk-all').addEventListener('click', ()=>{ if(claimDailyAll()) pickupRender(); });
$('#btn-dpk-cal').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} calendarOpen(); });
$('#btn-dpk-close').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} $('#daily-pickup-modal').classList.remove('show'); });
$('#btn-dcal-close').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} $('#daily-cal-modal').classList.remove('show'); });
$('#btn-dms-reroll').addEventListener('click', ()=>{ dailyReroll(); });
$('#btn-dms-close').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} $('#daily-missions-modal').classList.remove('show'); });
$('#btn-dstk-ok').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} $('#daily-streak-modal').classList.remove('show'); });
$('#btn-dsv-yes').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} dailySaveAccept(); });
$('#btn-dsv-no').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} dailySaveDecline(); });

/* ----- texts ----- */
I18N_ADD({
 'dm.day':['יום {0}','Day {0}','اليوم {0}','День {0}'],
 'dm.dayDone':['יום {0} ✔','Day {0} ✔','اليوم {0} ✔','День {0} ✔'],
 'dm.streakTitle':['🔥 הרצף שלך','🔥 Your streak','🔥 سلسلتك','🔥 Твоя серия'],
 'dm.tomorrow':['מחר: {0}','Tomorrow: {0}','غدًا: {0}','Завтра: {0}'],
 'dm.milestone':['🏅 אבן דרך! +{0} 💎 ותואר חדש: {1}','🏅 Milestone! +{0} 💎 and a new title: {1}','🏅 إنجاز! +{0} 💎 ولقب جديد: {1}','🏅 Рубеж! +{0} 💎 и новый титул: {1}'],
 'dm.ok':['יש! 🎉','Yes! 🎉','رائع! 🎉','Ура! 🎉'],
 'dm.saveTitle':['הצל את הרצף 💪','Save the streak 💪','أنقذ السلسلة 💪','Спаси серию 💪'],
 'dm.saveText':['הרצף של {0} ימים נשבר 😢 שחק משחק אחד בשני הימים הקרובים והוא יחזור!','Your {0}-day streak broke 😢 Play one match in the next two days and it comes back!','انقطعت سلسلتك ({0} أيام) 😢 العب مباراة واحدة خلال يومين وستعود!','Серия из {0} дней прервалась 😢 Сыграй один матч за два дня, и она вернётся!'],
 'dm.saveYes':['💪 הצל את הרצף','💪 Save the streak','💪 أنقذ السلسلة','💪 Спасти серию'],
 'dm.saveNo':['לא עכשיו','Not now','ليس الآن','Не сейчас'],
 'dm.saveGo':['💪 שחק משחק אחד והרצף חוזר!','💪 Play one match and the streak is back!','💪 العب مباراة واحدة وتعود السلسلة!','💪 Сыграй один матч, и серия вернётся!'],
 'dm.saved':['🔥 הרצף ניצל! יום {0}','🔥 Streak saved! Day {0}','🔥 أُنقذت السلسلة! اليوم {0}','🔥 Серия спасена! День {0}'],
 'dm.title.t7':['🔥 מתמיד','🔥 Steady','🔥 مثابر','🔥 Упорный'], 'dm.title.t14':['🔥 שבועיים של אש','🔥 Two weeks of fire','🔥 أسبوعان من النار','🔥 Две недели огня'],
 'dm.title.t30':['🔥 חודש בוער','🔥 Burning month','🔥 شهر مشتعل','🔥 Огненный месяц'], 'dm.title.t60':['🔥 לא עוצר','🔥 Unstoppable','🔥 لا يتوقف','🔥 Неудержимый'],
 'dm.title.t100':['🔥 מאה ימים','🔥 Hundred days','🔥 مئة يوم','🔥 Сто дней'], 'dm.title.t365':['👑 אגדת השנה','👑 Legend of the year','👑 أسطورة السنة','👑 Легенда года'],
 'dm.kitGot':['👕 קיבלת מדים: {0}','👕 New kit: {0}','👕 طقم جديد: {0}','👕 Новая форма: {0}'],
 'dm.chest.bronze':['תיבת ברונזה','Bronze chest','صندوق برونزي','Бронзовый сундук'], 'dm.chest.silver':['תיבת כסף','Silver chest','صندوق فضي','Серебряный сундук'], 'dm.chest.gold':['תיבת זהב','Gold chest','صندوق ذهبي','Золотой сундук'],
 /* missions */
 'dm.missionsTitle':['🎯 המשימות של היום','🎯 Today\'s missions','🎯 مهام اليوم','🎯 Задания дня'],
 'dm.play2':['שחק {0} משחקים','Play {0} matches','العب {0} مباريات','Сыграй {0} матча'],
 'dm.goals5':['הבקע {0} גולים','Score {0} goals','سجّل {0} أهداف','Забей {0} голов'],
 'dm.win1':['נצח משחק','Win a match','افز بمباراة','Выиграй матч'],
 'dm.motd':['נצח במשחק היומי','Win the Match of the Day','افز بمباراة اليوم','Выиграй матч дня'],
 'dm.quick1':['שחק משחק מהיר ⚡','Play a Quick match ⚡','العب مباراة سريعة ⚡','Сыграй быстрый матч ⚡'],
 'dm.header1':['הבקע גול נגיחה','Score a header','سجّل هدفًا برأسية','Забей головой'],
 'dm.slide3':['בצע {0} החלקות','Do {0} slide tackles','نفّذ {0} انزلاقات','Сделай {0} подката'],
 'dm.pk1':['הבקע פנדל','Score a penalty','سجّل ركلة جزاء','Забей пенальти'],
 'dm.hard1':['נצח ברמה קשה ומעלה','Win at Hard or above','افز في مستوى صعب أو أعلى','Выиграй на уровне «Сложно» или выше'],
 'dm.v2online1':['שחק 2 על 2 או אונליין','Play 2v2 or online','العب 2 ضد 2 أو أونلاين','Сыграй 2 на 2 или онлайн'],
 'dm.early1':['הבקע ב-30 השניות הראשונות','Score in the first 30 seconds','سجّل في أول 30 ثانية','Забей в первые 30 секунд'],
 'dm.clean1':['נצח בלי לספוג גול','Win with a clean sheet','افز بشباك نظيفة','Выиграй всухую'],
 'dm.power2':['השתמש בכוח {0} פעמים','Use a power {0} times','استخدم قوة {0} مرات','Используй силу {0} раза'],
 'dm.chest1':['פתח תיבה','Open a chest','افتح صندوقًا','Открой сундук'],
 'dm.israeli1':['הבקע גול עם שחקן ישראלי 🇮🇱','Score with an Israeli player 🇮🇱','سجّل بلاعب إسرائيلي 🇮🇱','Забей израильским игроком 🇮🇱'],
 'dm.margin2':['נצח בהפרש של 2 גולים ומעלה','Win by 2+ goals','افز بفارق هدفين أو أكثر','Выиграй с разницей в 2+ гола'],
 'dm.done':['🎯 משימה הושלמה: {0}','🎯 Mission done: {0}','🎯 اكتملت المهمة: {0}','🎯 Задание выполнено: {0}'],
 'dm.all':['🎁 כל המשימות הושלמו! תיבת ברונזה','🎁 All missions done! A Bronze chest','🎁 اكتملت كل المهام! صندوق برونزي','🎁 Все задания выполнены! Бронзовый сундук'],
 'dm.bonus':['כל השלוש: 🎁 {0} + ⭐ {1}','All three: 🎁 {0} + ⭐ {1}','الثلاث كلها: 🎁 {0} + ⭐ {1}','Все три: 🎁 {0} + ⭐ {1}'],
 'dm.rerollFree':['🔄 החלף משימה (חינם)','🔄 Reroll (free)','🔄 بدّل المهمة (مجانًا)','🔄 Заменить (бесплатно)'],
 'dm.rerollGems':['🔄 החלף משימה ({0} 💎)','🔄 Reroll ({0} 💎)','🔄 بدّل المهمة ({0} 💎)','🔄 Заменить ({0} 💎)'],
 'dm.rerollNone':['אין משימה להחליף','Nothing to reroll','لا توجد مهمة للتبديل','Нечего менять'],
 'dm.noGems':['צריך {0} 💎','You need {0} 💎','تحتاج {0} 💎','Нужно {0} 💎'],
 'dm.close':['סגור','Close','إغلاق','Закрыть'],
 /* pickup + calendar */
 'dm.pickupTitle':['🎁 איסוף יומי','🎁 Daily pickup','🎁 جمع يومي','🎁 Ежедневный сбор'],
 'dm.pickup':['🎁 איסוף יומי','🎁 Daily pickup','🎁 جمع يومي','🎁 Ежедневный сбор'],
 'dm.pickedUp':['✔ נאסף להיום','✔ Collected today','✔ تم الجمع اليوم','✔ Собрано на сегодня'],
 'dm.takeAll':['🎁 קח הכול','🎁 Take it all','🎁 خذ الكل','🎁 Забрать всё'],
 'dm.taken':['✔ נאסף! מחר יש עוד','✔ Taken! More tomorrow','✔ تم! المزيد غدًا','✔ Забрано! Завтра ещё'],
 'dm.calDay':['יום {0} בלוח','Calendar day {0}','اليوم {0} في التقويم','День {0} в календаре'],
 'dm.calTomorrow':['מחר: יום {0}','Tomorrow: day {0}','غدًا: اليوم {0}','Завтра: день {0}'],
 'dm.calCount':['נאספו {0} מתוך {1} ימים','{0} of {1} days collected','جُمع {0} من {1} يومًا','Собрано {0} из {1} дней'],
 'dm.calTitle':['📅 לוח 28 הימים','📅 28-day calendar','📅 تقويم 28 يومًا','📅 Календарь на 28 дней'],
 'dm.calBtn':['📅 הלוח','📅 Calendar','📅 التقويم','📅 Календарь'],
 'dm.bronzeFree':['תיבת ברונזה חינם','Free Bronze chest','صندوق برونزي مجاني','Бесплатный бронзовый сундук'],
 'dm.packFree':['חבילת מדבקות חינם','Free sticker pack','حزمة ملصقات مجانية','Бесплатный набор наклеек'],
 /* next-up + card */
 'dm.nextPickup':['🎁 יש לך מתנה יומית לאסוף!','🎁 Your daily pickup is waiting!','🎁 هديتك اليومية بانتظارك!','🎁 Тебя ждёт ежедневный подарок!'],
 'dm.nextMission':['עוד צעד אחד: {0}','One step left: {0}','خطوة واحدة متبقية: {0}','Остался один шаг: {0}'],
 'dm.nextMotd':['משחק היום: נגד {0}','Match of the Day: vs {0}','مباراة اليوم: ضد {0}','Матч дня: против {0}'],
 'dm.motdRow':['משחק היום: {0}','Match of the Day: {0}','مباراة اليوم: {0}','Матч дня: {0}'],
 'dm.cardTitle':['היום','Today','اليوم','Сегодня'],
});
STATIC_ADD({ '#dpk-title':'dm.pickupTitle', '#btn-dpk-cal':'dm.calBtn', '#btn-dpk-close':'dm.close', '#dcal-title':'dm.calTitle', '#btn-dcal-close':'dm.close',
  '#dms-title':'dm.missionsTitle', '#btn-dms-close':'dm.close', '#dstk-title':'dm.streakTitle', '#btn-dstk-ok':'dm.ok',
  '#dsv-title':'dm.saveTitle', '#btn-dsv-yes':'dm.saveYes', '#btn-dsv-no':'dm.saveNo' });
applyLang();
/* load-time: lazy defaults, this week's free freeze, keys owed from a full wallet */
dailyMissions(); dailyCal(); dailyFreezeRefill(); dailyPayOwedKeys();
