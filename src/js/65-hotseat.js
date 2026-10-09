/* ===================================================================================================
   PENALTIES VS A FRIEND on the same device: two players take turns. Before every kick the keeper picks a
   corner in secret (6 buttons or Q W E / A S D), then the shooter shoots with the normal sight + power.
   5 kicks each, then sudden death. No coins (it is two friends on one phone), just bragging rights.
   =================================================================================================== */
I18N_ADD({
 'hs.btn':['🥅 פנדלים נגד חבר','🥅 Penalties vs a friend','🥅 ركلات جزاء ضد صديق','🥅 Пенальти с другом'],
 'hs.p1':['שחקן 1','Player 1','اللاعب 1','Игрок 1'], 'hs.friend':['חבר','Friend','صديق','Друг'],
 'hs.keeper':['🧤 {0} שומר — בוחר לאן לקפוץ','🧤 {0} keeps — pick where to dive','🧤 {0} يحرس — اختر أين تقفز','🧤 {0} в воротах — куда прыгать?'],
 'hs.hint':['{0}, אל תסתכל! השוער בוחר פינה בסתר','{0}, look away! The keeper picks a corner in secret','{0}، لا تنظر! الحارس يختار زاوية سرًا','{0}, не смотри! Вратарь тайно выбирает угол'],
 'hs.keys':['במקלדת: Q W E למעלה · A S D למטה','Keyboard: Q W E top · A S D bottom','لوحة المفاتيح: Q W E أعلى · A S D أسفل','Клавиши: Q W E верх · A S D низ'],
 'hs.title':['⚽ {0} בועט · בעיטה {1}','⚽ {0} shoots · kick {1}','⚽ {0} يسدد · ركلة {1}','⚽ {0} бьёт · удар {1}'],
 'hs.sudden':['מוות פתאומי','Sudden death','الموت المفاجئ','До промаха'],
 'hs.won':['🏆 {0} ניצח!','🏆 {0} wins!','🏆 {0} فاز!','🏆 {0} победил!'],
 'hs.quit':['✖ סיום','✖ Quit','✖ إنهاء','✖ Выход'], 'hs.again':['🔄 עוד סיבוב','🔄 Another round','🔄 جولة أخرى','🔄 Ещё раунд'], 'hs.home':['🏠 הביתה','🏠 Home','🏠 الرئيسية','🏠 Домой'],
});
let hs=null;                                               // {names:{me,fr}, chars:{me,fr}, score:{me:[],fr:[]}, shooter:'me'|'fr', kick:n}
const HS_KICKS=5;
function hsName(w){ return hs.names[w]; }
function hsDots(arr){ const n=Math.max(HS_KICKS, arr.length); let s=''; for(let i=0;i<n;i++) s+=`<span class="d${i<arr.length?(arr[i]?' g':' m'):''}"></span>`; return s; }
function hsScoreHTML(){ const g=a=>a.filter(Boolean).length; return `${esc(hs.names.me)} ${hsDots(hs.score.me)} <b>${g(hs.score.me)}</b> - <b>${g(hs.score.fr)}</b> ${hsDots(hs.score.fr)} ${esc(hs.names.fr)}`; }
function hsWinner(){
  const a=hs.score.me, b=hs.score.fr, ga=a.filter(Boolean).length, gb=b.filter(Boolean).length;
  if(a.length<=HS_KICKS && b.length<=HS_KICKS){ if(ga>gb+(HS_KICKS-b.length)) return 'me'; if(gb>ga+(HS_KICKS-a.length)) return 'fr'; if(a.length===HS_KICKS && b.length===HS_KICKS && ga!==gb) return ga>gb?'me':'fr'; return null; }
  if(a.length===b.length && ga!==gb) return ga>gb?'me':'fr';   // sudden death: decided after a complete pair
  return null;
}
function startHotseatPk(){
  if(mp) mpTeardown(); if(typeof endTraining==='function') endTraining();
  const me=CHARS[selected]; const pool=CHARS.map((c,i)=>i).filter(i=>i!==selected); const fr=CHARS[pool[Math.floor(Math.random()*pool.length)]];
  hs={ names:{me: normName(settings.name)||T('hs.p1'), fr:T('hs.friend')}, chars:{me, fr}, score:{me:[],fr:[]}, shooter: Math.random()<.5?'me':'fr', kick:0 };
  document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show'));
  state='penalty'; cancelAnimationFrame(rafId);
  showScreen('pk'); hsAskKeeper();
}
/* the keeper's secret pick */
function hsAskKeeper(){
  const keeper = hs.shooter==='me' ? 'fr' : 'me';
  $('#hs-pick-who').textContent=T('hs.keeper', hsName(keeper)); $('#hs-pick-hint').textContent=T('hs.hint', hsName(hs.shooter));
  $('#hs-pick-keys').textContent=T('hs.keys'); $('#hs-pick-keys').hidden=document.body.classList.contains('touch');
  $('#hs-pick-score').innerHTML=hsScoreHTML(); $('#btn-hs-quit').textContent=T('hs.quit');
  $('#hs-pick-modal').classList.add('show');
}
function hsKeeperPicked(col,row){
  if(!hs || !$('#hs-pick-modal').classList.contains('show')) return;
  $('#hs-pick-modal').classList.remove('show'); sfx.click();
  const zone={col:+col, row:+row};
  hs.kick++;
  const shooterC = hs.chars[hs.shooter], keeperC = hs.chars[hs.shooter==='me'?'fr':'me'];
  myChar=shooterC; opChar=keeperC;                                   // setupPenalty draws the shooter from myChar and the keeper from opChar
  const n=Math.ceil(hs.kick/2), sudden=n>HS_KICKS;
  setupPenalty(true, PK_LEVELS[1], hsResult, T('hs.title', hsName(hs.shooter), n)+(sudden ? ' · '+T('hs.sudden') : ''));
  pk.hotseat=true; pk.keeperPick=zone; pk.readP=0;
}
function hsResult(goal, why){
  if(!hs || !pk) return;
  if(why==='quit'){ hsQuit(); return; }
  pk.phase='over'; cancelAnimationFrame(pk.raf); clearTimeout(pk.timer);
  hs.score[hs.shooter].push(!!goal);
  const w=hsWinner();
  setTimeout(()=>{
    if(!hs) return;
    if(w){ hsEnd(w); return; }
    hs.shooter = hs.shooter==='me' ? 'fr' : 'me';
    pk=null; hsAskKeeper();
  }, 1500);
}
function hsEnd(w){
  pk=null; if(typeof clearCornerUI==='function') clearCornerUI();
  $('#hs-end-title').textContent=T('hs.won', hsName(w)); $('#hs-end-score').innerHTML=hsScoreHTML();
  $('#btn-hs-again').textContent=T('hs.again'); $('#btn-hs-home').textContent=T('hs.home');
  $('#hs-end-modal').classList.add('show'); try{ sfx.win(); }catch(e){} if(typeof pkConfetti!=='undefined') pkConfetti.burst(200);
  challengeEvent('pk');
}
function hsQuit(){ hs=null; if(pk){ cancelAnimationFrame(pk.raf); clearTimeout(pk.timer); pk=null; } $('#hs-pick-modal').classList.remove('show'); $('#hs-end-modal').classList.remove('show'); quitToHome(); }
$('#hs-goal').addEventListener('click', e=>{ const b=e.target.closest('.hs-zone'); if(b) hsKeeperPicked(b.dataset.col, b.dataset.row); });
window.addEventListener('keydown', e=>{ if(!hs || !$('#hs-pick-modal').classList.contains('show')) return; const m={KeyQ:[0,0],KeyW:[1,0],KeyE:[2,0],KeyA:[0,1],KeyS:[1,1],KeyD:[2,1]}[e.code]; if(m){ e.preventDefault(); hsKeeperPicked(m[0],m[1]); } }, true);
$('#btn-hs-quit').addEventListener('click', ()=>{ sfx.click(); hsQuit(); });
$('#btn-hs-home').addEventListener('click', ()=>{ sfx.click(); hsQuit(); });
$('#btn-hs-again').addEventListener('click', ()=>{ sfx.click(); $('#hs-end-modal').classList.remove('show'); startHotseatPk(); });
/* the ✖ on the penalty screen during a hot-seat kick */
Hooks.on('screen', id=>{ if(hs && id!=='pk' && !$('#hs-end-modal').classList.contains('show')){ hs=null; $('#hs-pick-modal').classList.remove('show'); } });
/* entry: the mode sheet's "other ways to play" row */
(function(){ const row=$('#mode-others'); if(!row) return; const b=document.createElement('button'); b.className='btn pink'; b.id='btn-hotseat'; b.textContent=T('hs.btn'); b.addEventListener('click', ()=>{ sfx.click(); $('#mode-sheet').classList.remove('show'); startHotseatPk(); }); row.appendChild(b); Hooks.on('home', ()=>{ b.textContent=T('hs.btn'); }); })();
