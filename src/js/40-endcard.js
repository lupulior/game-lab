/* ===================================================================================================
   40-endcard — the reward ceremony on the result card (PLAN §10, §2.4, §6.4, §9.3).
   On 'matchEnd' the plain "#end-xp" summary is hidden and #endcard-earn is rendered inside the #end panel:
   a vertical reveal (0.3 s steps, tick sound) of coins + breakdown, streak bonus / multiplier, daily cap bar,
   XP bar with level-ups, trophies, keys ("open now"), gems, mission ticks, the streak day, the bot personality
   line and (on a loss) a tip. The buttons become ▶ more (NEW opponent) · 🔄 again (same opponent) · 📤 share · 🏠.
   The core's original buttons stay in the DOM, hidden, so their listeners keep working.
   =================================================================================================== */
I18N_ADD({
 'ec.more':['▶ עוד משחק','▶ Next match','▶ مباراة أخرى','▶ Ещё матч'],
 'ec.again':['🔄 שוב','🔄 Again','🔄 مرة أخرى','🔄 Ещё раз'],
 'ec.share':['📤 שתף','📤 Share','📤 شارك','📤 Поделиться'],
 'ec.home':['🏠','🏠','🏠','🏠'],
 'ec.homeLbl':['בית','Home','الرئيسية','Домой'],
 'ec.openNow':['פתח עכשיו','Open now','افتح الآن','Открыть'],
 'ec.bonus':['+{0}% בונוס רצף','+{0}% streak bonus','+{0}% مكافأة السلسلة','+{0}% бонус серии'],
 'ec.multSun':['×{0} יום ראשון','×{0} Sunday','×{0} يوم الأحد','×{0} воскресенье'],
 'ec.multMotd':['×{0} משחק היום','×{0} match of the day','×{0} مباراة اليوم','×{0} матч дня'],
 'ec.multEvent':['×{0} אירוע','×{0} event','×{0} حدث','×{0} событие'],
 'ec.lvl':['דרגה {0}','Lv {0}','المستوى {0}','Ур. {0}'],
 'ec.lvup':['⭐ עלית לדרגה {0}!','⭐ Level {0}!','⭐ وصلت إلى المستوى {0}!','⭐ Уровень {0}!'],
 'ec.streak':['🔥 יום {0} ✔','🔥 Day {0} ✔','🔥 اليوم {0} ✔','🔥 День {0} ✔'],
 'ec.missions':['משימות:','Missions:','المهام:','Задания:'],
 'ec.trainDone':['סיימת אימון! 💪','Training done! 💪','أنهيت التدريب! 💪','Тренировка окончена! 💪'],
 'ec.trainGoals':['{0} גולים באימון','{0} goals in training','{0} أهداف في التدريب','{0} голов на тренировке'],
 'ec.tip0':['💡 נסה לבעוט כשהכדור לפניך','💡 Try kicking when the ball is in front of you','💡 جرّب الركل عندما تكون الكرة أمامك','💡 Бей, когда мяч прямо перед тобой'],
 'ec.tip1':['💡 כשהכדור אצל היריב — חזור לשמור על השער','💡 When the bot has the ball, run back and guard your goal','💡 عندما تكون الكرة مع الخصم، ارجع لحماية مرماك','💡 Когда мяч у соперника, беги защищать ворота'],
 'ec.tip2':['💡 ברח מהגליץ\' — קפוץ כשהיריב מחליק','💡 Escape the slide: jump when the bot slides at you','💡 اهرب من الانزلاق: اقفز عندما ينزلق الخصم','💡 Спасайся от подката: прыгай, когда бот скользит'],
 'ec.tip3':['💡 קפוץ ⤒ כדי לנגוח כדורים גבוהים','💡 Jump ⤒ to head high balls','💡 اقفز ⤒ لتنطح الكرات العالية','💡 Прыгай ⤒, чтобы бить головой'],
 'ec.tip4':['💡 החלקה 🦵 לוקחת את הכדור מהיריב','💡 A slide 🦵 steals the ball from the bot','💡 الانزلاق 🦵 يأخذ الكرة من الخصم','💡 Подкат 🦵 отбирает мяч у бота'],
 'ec.tip5':['💡 נסה רמה קלה יותר ותחזור חזק יותר','💡 Try an easier level and come back stronger','💡 جرّب مستوى أسهل وعد أقوى','💡 Попробуй уровень полегче и возвращайся сильнее'],
});

const ENDCARD = { info:null, timers:[], motd:false, trainKind:null, step:0 };

/* no delays for kids who asked for less motion (OS setting or the game's own setting, if a settings module adds one) */
function endcardNoMotion(){
  try{ if(settings && settings.reducedMotion) return true; }catch(e){}
  try{ return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; }
}
function endcardClearTimers(){ for(const t of ENDCARD.timers) clearTimeout(t); ENDCARD.timers=[]; }

/* the block and the button bar are created once and reused */
function endcardEls(){
  const panel=$('#end .panel'); if(!panel) return null;
  let earn=$('#endcard-earn');
  if(!earn){
    panel.classList.add('endcard-panel');
    earn=document.createElement('div'); earn.id='endcard-earn'; earn.hidden=true;
    const xp=$('#end-xp'); if(xp && xp.parentNode===panel) panel.insertBefore(earn, xp.nextSibling); else panel.insertBefore(earn, $('#end-btns'));
    earn.addEventListener('click', ()=>endcardSkip());
    const bar=document.createElement('div'); bar.id='endcard-btns'; bar.hidden=true;
    bar.innerHTML='<button class="btn green" id="btn-ec-more"></button> <button class="btn yellow" id="btn-ec-again"></button> <button class="btn purple" id="btn-ec-share"></button> <button class="btn blue ec-icon" id="btn-ec-home"></button>';
    $('#end-btns').appendChild(bar);
    $('#btn-ec-more').addEventListener('click', ()=>endcardMore());
    $('#btn-ec-again').addEventListener('click', ()=>endcardAgain());
    $('#btn-ec-share').addEventListener('click', ()=>endcardShare());
    $('#btn-ec-home').addEventListener('click', ()=>endcardHome());
  }
  return {panel, earn, bar:$('#endcard-btns')};
}
function endcardLabels(){
  const b=$('#btn-ec-more'); if(!b) return;
  b.textContent=T('ec.more'); $('#btn-ec-again').textContent=T('ec.again'); $('#btn-ec-share').textContent=T('ec.share');
  $('#btn-ec-home').textContent=T('ec.home'); $('#btn-ec-home').setAttribute('aria-label', T('ec.homeLbl')); $('#btn-ec-home').title=T('ec.homeLbl');
}

/* a small number tween: "🪙 +0" counts up to "🪙 +123" */
function endcardCount(el, to, prefix, suffix, ms){
  prefix=prefix||''; suffix=suffix||''; to=Math.round(to||0);
  if(endcardNoMotion() || to<=0 || ms<=0){ el.textContent=prefix+fmtNum(to)+suffix; return; }
  const t0=performance.now();
  const tick=()=>{ const u=Math.min(1,(performance.now()-t0)/ms), v=Math.round(to*(1-Math.pow(1-u,3))); el.textContent=prefix+fmtNum(v)+suffix; if(u<1 && el.isConnected) ENDCARD.timers.push(setTimeout(tick, 40)); };
  tick();
  ENDCARD.timers.push(setTimeout(()=>{ el.textContent=prefix+fmtNum(to)+suffix; }, ms+20));   // the final value is always written, even if the timers were throttled
}
const endcardRow=(cls, html)=>{ const d=document.createElement('div'); d.className='ec-row '+cls; if(html!=null) d.innerHTML=html; return d; };
const endcardChip=(txt, cls)=>'<span class="ec-chip '+(cls||'')+'">'+esc(txt)+'</span>';

/* which multiplier label: Sunday, match of the day, or an event from another module */
function endcardMultLabel(mult, motd){
  const m = Number.isInteger(mult) ? mult : Math.round(mult*10)/10;
  if(isSunday() && mult===ECON.sundayMult) return T('ec.multSun', m);
  if(motd && mult===ECON.motdMult) return T('ec.multMotd', m);
  if(isSunday()) return T('ec.multSun', m);
  if(motd) return T('ec.multMotd', m);
  return T('ec.multEvent', m);
}
/* a loss tip picked from the match: no goals → shooting, many conceded → defending, else rotate */
function endcardTipKey(info){
  const sc=info.score||{me:0,op:0};
  if((sc.me|0)===0) return 'ec.tip0';
  if((sc.op|0)>=3) return (prog.matches|0)%2 ? 'ec.tip1' : 'ec.tip4';
  return 'ec.tip'+(((prog.matches|0)+2)%6);
}

/* ---------- render the ceremony for one finished match ---------- */
function endcardRender(info){
  const els=endcardEls(); if(!els || !info) return;
  endcardClearTimers(); ENDCARD.info=info; ENDCARD.step=0;
  const {earn, bar}=els; earn.innerHTML=''; earn.hidden=false; earn.classList.remove('ec-now');
  const xp=$('#end-xp'); if(xp) xp.hidden=true;
  endcardLabels();
  const online = !!info.online || !!mp, trainingMatch=!!info.training;
  ENDCARD.trainKind = trainingMatch ? (training || 'shoot') : null;
  const rows=[];
  if(trainingMatch){
    const g=(info.score && info.score.me)|0;
    rows.push(endcardRow('ec-train', '<span>'+esc(T('ec.trainDone'))+'</span>'+(g>0 ? ' <span class="ec-small">'+esc(T('ec.trainGoals', g))+'</span>' : '')));
  } else {
    const e=info.earn||{coins:0,gems:0,keys:0,xp:0,goals:0,levelUps:[]}, pay=info.pay;
    // 🪙 coins + breakdown
    const coins=e.coins|0;
    if(coins>0 || pay){
      const r=endcardRow('ec-coins'); const big=document.createElement('span'); big.className='ec-big'; big.id='endcard-coins'; big.textContent='🪙 +0'; r.appendChild(big);
      r._count=[big, coins, '🪙 +', ''];
      let chips='';
      if(pay && pay.parts) for(const p of pay.parts){ chips+=endcardChip(T(p[0])+' +'+fmtNum(p[1])); }
      if(pay && pay.bonus>0) chips+=endcardChip('🔥 '+T('ec.bonus', Math.round(pay.bonus*100)), 'ec-bonus');
      if(pay && pay.mult>1) chips+=endcardChip(endcardMultLabel(pay.mult, ENDCARD.motd), 'ec-mult');
      const span=document.createElement('span'); span.id='endcard-parts'; span.innerHTML=chips; r.appendChild(span);
      rows.push(r);
      // the daily cap bar — only while a daily cap exists (ECON.capCoins is Infinity by default: no row at all)
      const dc=dayCounter('coinDay'), cap=coinCapToday();
      if(isFinite(cap) && cap>0){
        const pct=Math.min(100, Math.round(dc.n/cap*100));
        const c=endcardRow('ec-cap'+(dc.n>=cap ? ' ec-full' : ''), '<span class="ec-bar" id="endcard-cap-bar"><i></i></span><span class="ec-small">'+esc(T('cap.today', fmtNum(dc.n), fmtNum(cap)))+'</span>'+(pay && pay.capped ? '<span class="ec-capped" id="endcard-capped">'+esc(T('end.capped'))+'</span>' : ''));
        c._bar=[c.querySelector('.ec-bar>i'), pct]; rows.push(c);
      }
    }
    // ⭐ XP bar + level-ups
    const lp=levelProgress(), ups=(e.levelUps||[]);
    if((e.xp|0)>0 || ups.length){
      const before = ups.length ? 0 : Math.max(0, Math.round((lp.have-(e.xp|0))/lp.need*100));
      const r=endcardRow('ec-xp'); const big=document.createElement('span'); big.className='ec-big'; big.id='endcard-xp'; big.textContent='⭐ +0'; r.appendChild(big);
      r._count=[big, e.xp|0, '⭐ +', ''];
      r.insertAdjacentHTML('beforeend', '<span class="ec-small">'+esc(T('ec.lvl', lp.lv))+'</span><span class="ec-bar" id="endcard-xp-bar"><i style="width:'+before+'%"></i></span><span class="ec-small">'+lp.have+'/'+lp.need+'</span>'+ups.map(l=>'<span class="ec-lvup">'+esc(T('ec.lvup', l))+'</span>').join(''));
      r._bar=[r.querySelector('.ec-bar>i'), lp.pct]; rows.push(r);
    }
    // 🏆 🔑 💎
    const extra=[];
    if((info.trophies|0)>0) extra.push('<span class="ec-big" id="endcard-trophies">🏆 +'+(info.trophies|0)+'</span>');
    if((e.keys|0)>0) extra.push('<span class="ec-big" id="endcard-keys">🔑 +'+(e.keys|0)+'</span>'+(typeof openChestsScreen==='function' ? ' <button class="btn green ec-open" id="btn-ec-open">'+esc(T('ec.openNow'))+'</button>' : ''));
    if((e.gems|0)>0) extra.push('<span class="ec-big" id="endcard-gems">💎 +'+(e.gems|0)+'</span>');
    if(extra.length){ const r=endcardRow('ec-extra', extra.join(' ')); rows.push(r); }
    // mission ticks (daily module, optional)
    if(typeof dailyMissionStatus==='function'){
      try{
        const ms=dailyMissionStatus();
        if(Array.isArray(ms) && ms.length){
          // #64: the daily module reports {n, prog}; the older {need, have} names stay as a fallback
          const r=endcardRow('ec-missions', '<span class="ec-small">'+esc(T('ec.missions'))+'</span>'+ms.slice(0,3).map(m=>{ const done=!!(m&&m.done); const txt=(m&&(m.text||m.name||m.title||m.desc))||''; const need=(m&&(m.n||m.need))|0, have=(m&&(m.prog!=null?m.prog:m.have))|0; return '<span class="ec-mission'+(done?' ec-done':'')+'">'+(done?'✅':'⬜')+' '+(m&&m.icon?esc(String(m.icon))+' ':'')+esc(String(txt))+(need&&!done ? ' '+have+'/'+need : '')+'</span>'; }).join(''));
          rows.push(r);
        }
      }catch(err){ console.error('endcard missions', err); }
    }
    // 🔥 the streak day (first match today)
    if(prog.streakNew){ rows.push(endcardRow('ec-streak', '<span class="ec-big" id="endcard-streak">'+esc(T('ec.streak', prog.streakDays|0))+'</span>')); prog.streakNew=false; saveProg(); }
    // the bot's personality (bot module, optional)
    if(typeof botPersonality==='function' && !online){
      try{
        const oc = (typeof opChar!=='undefined' && opChar) ? opChar : (info.opp ? CHARS.find(c=>c.id===info.opp) : null);
        let p=botPersonality(oc, info); if(p && typeof p==='object') p=[p.icon, p.name||p.title, p.text||p.line].filter(Boolean).join(' ');
        if(p) rows.push(endcardRow('ec-bot', '<span id="endcard-bot">🤖 '+esc(String(p))+'</span>'));
      }catch(err){ console.error('endcard personality', err); }
    }
    // a tip after a loss
    if(info.outcome==='lose') rows.push(endcardRow('ec-tip', '<span id="endcard-tip">'+esc(T(endcardTipKey(info)))+'</span>'));
  }
  for(const r of rows) earn.appendChild(r);
  // #50: leave the match properly (state idle, #end off the back stack) before the chests screen opens
  const open=$('#btn-ec-open'); if(open) open.addEventListener('click', ev=>{ ev.stopPropagation(); sfx.click(); endcardClose(); goHome(); if(typeof openChestsScreen==='function') openChestsScreen(); });
  // buttons
  $('#btn-ec-more').hidden=false;
  $('#btn-ec-again').hidden = online && !trainingMatch;
  $('#btn-ec-share').hidden = trainingMatch || typeof shareResult!=='function';
  $('#btn-end-again').hidden=true; $('#btn-end-home2').hidden=true; $('#end-btns').hidden=false; bar.hidden=false;
  if(trainingMatch) $('#btn-ec-more').hidden=true;
  // the reveal
  if(endcardNoMotion()){ earn.classList.add('ec-now'); endcardSkip(); return; }
  const step=()=>{
    const r=rows[ENDCARD.step]; if(!r){ return; }
    ENDCARD.step++; r.classList.add('ec-on'); try{ sfx.click(); }catch(e){}
    if(r._count) endcardCount(r._count[0], r._count[1], r._count[2], r._count[3], 500);
    if(r._bar) requestAnimationFrame(()=>{ r._bar[0].style.width=r._bar[1]+'%'; });
    if(ENDCARD.step<rows.length) ENDCARD.timers.push(setTimeout(step, 300));
  };
  ENDCARD.timers.push(setTimeout(step, 250));
}
/* reveal everything at once (a tap on the card, reduced motion, tests) */
function endcardSkip(){
  endcardClearTimers(); const earn=$('#endcard-earn'); if(!earn) return;
  earn.querySelectorAll('.ec-row').forEach(r=>{
    if(!r.classList.contains('ec-on')){ r.classList.add('ec-on'); }
    if(r._count){ r._count[0].textContent=r._count[2]+fmtNum(r._count[1])+r._count[3]; }
    if(r._bar) r._bar[0].style.width=r._bar[1]+'%';
  });
  ENDCARD.step=1e9;
}
/* hide the ceremony (a new match, home, spectating) — the core's buttons come back for whoever still relies on them */
function endcardClose(){
  endcardClearTimers();
  const earn=$('#endcard-earn'), bar=$('#endcard-btns');
  if(earn){ earn.hidden=true; earn.innerHTML=''; }
  if(bar) bar.hidden=true;
  const a=$('#btn-end-again'), h=$('#btn-end-home2'); if(a) a.hidden=false; if(h) h.hidden=false;
}

/* ---------- buttons ---------- */
/* a NEW random opponent (never the one just played) */
function endcardNewOpponent(prevId){
  let i=randomOpponent(), n=0;
  while(CHARS[i] && CHARS[i].id===prevId && n++<40) i=randomOpponent();
  if(!CHARS[i] || CHARS[i].id===prevId){ const alt=CHARS.map((c,k)=>k).filter(k=>k!==selected && CHARS[k].id!==prevId); i=alt[Math.floor(Math.random()*alt.length)]; }
  return i;
}
function endcardMore(){
  const info=ENDCARD.info; if(!info) return; sfx.click();
  if(info.online || mp){ endcardClose(); $('#btn-end-again').click(); return; }   // online: the core's behaviour (back to the party / character screen)
  if(info.training){ endcardAgain(); return; }
  const lm = (typeof lastMatch!=='undefined') ? lastMatch : null;
  const opp=endcardNewOpponent(info.opp), lv=Math.max(0, Math.min(5, info.level|0));
  endcardClose(); goHome();
  if(lm && lm.opts && !info.online){                                                 // offline 2v2: same partner and setup, a new first opponent
    level=LEVELS[lv]; dailyMatch=false; forcedOpp=null; settings.lastLevel=lv; saveSettings(); ECON._lastLevel=lv;
    const opts=Object.assign({}, lm.opts); if(opts.c4 && opts.c4.id===CHARS[opp].id) opts.c4=lm.c2;
    beginMatch(CHARS[selected], CHARS[opp], opts); return;
  }
  startOfflineMatch(lv, opp);
}
function endcardAgain(){
  const info=ENDCARD.info; if(!info) return; sfx.click();
  if(info.training){ const k=ENDCARD.trainKind||'shoot'; endcardClose(); goHome(); if(typeof startTraining==='function') startTraining(k); return; }
  endcardClose(); $('#btn-end-again').click();                                       // the core replays lastMatch (same opponent)
}
function endcardShare(){
  const info=ENDCARD.info; if(!info) return; sfx.click();
  if(typeof shareResult==='function'){ try{ shareResult(info); }catch(err){ console.error('shareResult', err); } }
}
/* #41: in a party 🏠 only goes back to the team on the home screen (the 🚪 button there leaves it); offline it is the core's button */
function endcardHome(){
  endcardClose();
  if(mp && mp.connected){ sfx.click(); goHome(); return; }
  $('#btn-end-home2').click();
}

/* ---------- wiring ---------- */
/* remember whether this was the (unplayed) match of the day: the core clears dailyMatch before the hook fires */
const _endcardShowEnd=showEnd;
showEnd=function(o){ ENDCARD.motd = !!dailyMatch && prog.daily!==dayKey(); return _endcardShowEnd(o); };
Hooks.on('matchEnd', info=>{ if(typeof spectating!=='undefined' && spectating) return; endcardRender(info); });
Hooks.on('screen', id=>{ if(id!=='game') endcardClose(); });
/* #28: a new match (the host's start reaching a guest still on the card, a series' next game) stops the hidden reveal */
const _endcardBeginMatch=beginMatch;
beginMatch=function(){ endcardClose(); return _endcardBeginMatch.apply(this, arguments); };
const _endcardApplyLang=applyLang;
applyLang=function(){ const r=_endcardApplyLang.apply(this, arguments); endcardLabels(); return r; };
endcardEls(); endcardLabels();
