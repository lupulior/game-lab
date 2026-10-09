/* ===================================================================================================
   MATCH-FORMAT EXTRAS — Golden Goal sudden-death kicks (the tie-break of the 🥇 format), the Best-of-3
   series (3 Quick games, first to 2), the party format picker (4 chips, reusable on the home screen)
   and the party version check. Everything wraps core functions; core.html is not edited.
   =================================================================================================== */
Object.assign(ECON, { fmt:{ sdStart:900, sdGap:1500, sdPairs:3, seriesGames:3, seriesCoins:40, seriesTrophies:1 } });

I18N_ADD({
 'fmt.bo3':['🏆 הטוב מ-3','🏆 Best of 3','🏆 الأفضل من 3','🏆 До 2 побед'],
 'fmt.bo3Sub':['3 משחקים מהירים · מי שמנצח 2','3 quick games · first to 2 wins','3 مباريات سريعة · أول من يفوز مرتين','3 быстрых игры · до 2 побед'],
 'fmt.pickTitle':['סוג המשחק:','Match type:','نوع المباراة:','Тип матча:'],
 'fmt.classicOnly':['חבר עם גרסה ישנה — משחקים קלאסי 4:00','A friend has an old version — Classic 4:00 only','صديق بنسخة قديمة — نلعب كلاسيكي 4:00 فقط','У друга старая версия — только классика 4:00'],
 'fmt.goldenTimer':['🥇 שער זהב','🥇 Golden goal','🥇 الهدف الذهبي','🥇 Золотой гол'],
 'fmt.sdSay':['🎙️ תיקו! בעיטות הכרעה — מי שמבקיע ומונע מנצח!','🎙️ A tie! Sudden-death kicks — score and save to win!','🎙️ تعادل! ركلات الحسم — من يسجل ويصد يفوز!','🎙️ Ничья! Серия пенальти — забей и отбей, чтобы победить!'],
 'fmt.sdTitle':['🥇 בעיטות הכרעה · בעיטה {0}','🥇 Sudden-death kicks · kick {0}','🥇 ركلات الحسم · ركلة {0}','🥇 Серия пенальти · удар {0}'],
 'fmt.sdWon':['🥇 ניצחת בבעיטות {0}-{1}','🥇 You won the kicks {0}-{1}','🥇 فزت بالركلات {0}-{1}','🥇 Ты выиграл серию ударов {0}-{1}'],
 'fmt.sdLost':['הפסדת בבעיטות {0}-{1}','You lost the kicks {0}-{1}','خسرت الركلات {0}-{1}','Ты проиграл серию ударов {0}-{1}'],
 'fmt.sdDraw':['תיקו גם בבעיטות {0}-{1} 🤝','Still level after the kicks {0}-{1} 🤝','تعادل حتى في الركلات {0}-{1} 🤝','Ничья и после ударов {0}-{1} 🤝'],
 'fmt.series':['סדרה: {0}-{1} · משחק {2} מתוך {3}','Series: {0}-{1} · game {2} of {3}','السلسلة: {0}-{1} · مباراة {2} من {3}','Серия: {0}-{1} · игра {2} из {3}'],
 'fmt.seriesTag':['🏆 משחק {0}','🏆 Game {0}','🏆 مباراة {0}','🏆 Игра {0}'],
 'fmt.next':['המשחק הבא ▶','Next game ▶','المباراة التالية ▶','Следующая игра ▶'],
 'fmt.seriesWon':['🏆 ניצחת בסדרה {0}-{1}! +{2} 🪙','🏆 You won the series {0}-{1}! +{2} 🪙','🏆 فزت بالسلسلة {0}-{1}! +{2} 🪙','🏆 Ты выиграл серию {0}-{1}! +{2} 🪙'],
 'fmt.seriesLost':['הסדרה הסתיימה: הפסדת {0}-{1} 😢','Series over: you lost {0}-{1} 😢','انتهت السلسلة: خسرت {0}-{1} 😢','Серия окончена: ты проиграл {0}-{1} 😢'],
 'fmt.seriesDraw':['הסדרה הסתיימה בתיקו {0}-{1} 🤝','The series ended in a draw {0}-{1} 🤝','انتهت السلسلة بالتعادل {0}-{1} 🤝','Серия завершилась вничью {0}-{1} 🤝'],
 'fmt.seriesToast':['🏆 ניצחת בסדרה!','🏆 You won the series!','🏆 فزت بالسلسلة!','🏆 Ты выиграл серию!'],
 'fmt.waitHost':['⏳ המארח מתחיל את המשחק הבא…','⏳ The host starts the next game…','⏳ المضيف يبدأ المباراة التالية…','⏳ Хост начинает следующую игру…'],
 'fmt.oldVersion':['{0} צריך לרענן את המשחק 🔄','{0} needs to refresh the game 🔄','{0} يحتاج إلى تحديث اللعبة 🔄','{0} нужно обновить игру 🔄'],
 'fmt.hostOld':['המארח צריך לרענן את המשחק 🔄','The host needs to refresh the game 🔄','المضيف يحتاج إلى تحديث اللعبة 🔄','Хосту нужно обновить игру 🔄'],
 'fmt.hostNewer':['רענן את המשחק כדי לקבל את הגרסה החדשה 🔄','Refresh the game to get the new version 🔄','حدّث اللعبة للحصول على النسخة الجديدة 🔄','Обнови игру, чтобы получить новую версию 🔄'],
 'fmt.sdQuitQ':['לצאת מבעיטות ההכרעה? זה ייחשב הפסד','Quit the kicks? It counts as a loss','الخروج من ركلات الحسم؟ سيُحسب خسارة','Выйти из серии ударов? Это засчитается как поражение'],
});
STATIC_ADD({ '#fmt-party-l':'fmt.pickTitle', '#btn-fmt-next':'fmt.next' });

/* ===================================================================================================
   (3) FORMAT PICKER — ⚡ quick / ⏱️ classic / 🥇 golden / 🏆 best-of-3. Bo3 = settings.bo3 on top of Quick,
   so the core's myFormat() keeps returning 'quick' for every game of a series.
   =================================================================================================== */
const FMT_CHIPS=[['quick','fmt.quick','fmt.quickSub'],['classic','fmt.classic','fmt.classicSub'],['golden','fmt.golden','fmt.goldenSub'],['bo3','fmt.bo3','fmt.bo3Sub']];
function currentFormatChip(){ return settings.bo3 ? 'bo3' : myFormat(); }
function fmtChipsHTML(){ const cur=currentFormatChip(); return FMT_CHIPS.map(([k,l,s])=>`<button class="btn small blue${cur===k?' on':''}" data-fmt="${k}"><span class="l">${T(l)}</span><span class="s">${T(s)}</span></button>`).join(''); }
function formatPickerHTML(){ return `<div class="fmt-picker">${fmtChipsHTML()}</div>`; }
function setFormatChip(k){
  if(k==='bo3'){ settings.format='quick'; settings.bo3=true; }
  else if(ECON.formats[k]){ settings.format=k; settings.bo3=false; }
  else return;
  saveSettings(); syncFormatPickers(); Hooks.emit('format', currentFormatChip());
}
function syncFormatPickers(){ const cur=currentFormatChip(); document.querySelectorAll('.fmt-picker [data-fmt]').forEach(b=>b.classList.toggle('on', b.dataset.fmt===cur)); }
function bindFormatPicker(el){
  if(!el || el.dataset.fmtBound) return; el.dataset.fmtBound='1';
  el.addEventListener('click', e=>{ const b=e.target.closest('[data-fmt]'); if(!b || !el.contains(b)) return; sfx.click(); setFormatChip(b.dataset.fmt); });
}
function fmtRelabel(){ document.querySelectorAll('.fmt-picker').forEach(p=>{ p.innerHTML=fmtChipsHTML(); }); }
/* ---------- the small DOM this module needs (built once at load; everything lives inside #stage) ---------- */
(function fmtBuildDom(){
  const mk=(tag, id, cls)=>{ const d=document.createElement(tag); d.id=id; if(cls) d.className=cls; d.hidden=true; return d; };
  const g=$('#game'), timer=$('#timer');
  if(g && !$('#fmt-series')) g.insertBefore(mk('div','fmt-series'), timer ? timer.nextSibling : null);
  const pkS=$('#pk'); if(pkS && !$('#fmt-sd-pips')) pkS.appendChild(mk('div','fmt-sd-pips'));
  const xp=$('#end-xp'); if(xp && !$('#fmt-end-line')) xp.parentNode.insertBefore(mk('div','fmt-end-line'), xp.nextSibling);
  const eb=$('#end-btns'); if(eb && !$('#btn-fmt-next')){ const b=mk('button','btn-fmt-next','btn yellow'); b.textContent=T('fmt.next'); eb.insertBefore(b, eb.firstChild); eb.insertBefore(document.createTextNode(' '), b.nextSibling); }
  const pm=$('#party-modal .panel');
  if(pm && !$('#fmt-party-picker')){
    const row=pm.querySelector('#btn-party-go') ? pm.querySelector('#btn-party-go').parentNode : null;
    const l=document.createElement('div'); l.className='hint'; l.id='fmt-party-l'; l.textContent=T('fmt.pickTitle');
    const p=document.createElement('div'); p.id='fmt-party-picker'; p.innerHTML=formatPickerHTML();
    const h=mk('div','fmt-party-hint','fmt-hint');
    for(const el of [l,p,h]) pm.insertBefore(el, row);
    bindFormatPicker(p);
  }
})();
/* the party modal: chips synced; a guest on a build without a version OR an older one makes the core force
   Classic (the same test as the core's mpStart), so the chips go off and the series is skipped (#35) */
function fmtPartyForced(){ return !!(mp && mp.role==='host' && mp.conns && mp.conns.some(c=>!c.ver || c.ver<GAME_VERSION)); }
function fmtPartyApplyForced(){
  const forced=fmtPartyForced();
  const p=$('#fmt-party-picker .fmt-picker'); if(p) p.classList.toggle('off', forced);
  const h=$('#fmt-party-hint'); if(h){ h.hidden=!forced; h.textContent=T('fmt.classicOnly'); }
}
const _fmtOpenPartyModal=openPartyModal;
openPartyModal=function(){
  _fmtOpenPartyModal();
  syncFormatPickers();
  fmtPartyApplyForced();
};
/* guests join and leave while the modal is open: every party refresh re-applies the forced state */
const _fmtPartyRefresh=partyRefresh;
partyRefresh=function(){ _fmtPartyRefresh(); const m=$('#party-modal'); if(m && m.classList.contains('show')) fmtPartyApplyForced(); };

/* ===================================================================================================
   (5) GOLDEN-GOAL CLOCK — no countdown, just the label (the last 10 seconds still tick, in red)
   =================================================================================================== */
const _fmtUpdateTimer=updateTimer;
updateTimer=function(){
  _fmtUpdateTimer();
  const el=$('#timer'); if(!el) return;
  const label = matchFmt==='golden' && !training && !(timeLeft<=10 && state==='play');
  el.classList.toggle('fmt-label', label);
  if(label){ el.textContent=T('fmt.goldenTimer'); el.classList.remove('urgent'); }
};

/* ===================================================================================================
   (1) GOLDEN GOAL SUDDEN-DEATH KICKS — a 🥇 match still level at full time is decided by alternating
   single kicks (the in-match penalty, reused): me first, up to 3 pairs; after a pair in which one side
   scored and the other missed there is a winner; still level after 3 pairs → draw. OFFLINE ONLY: an
   online 🥇 tie ends as a draw through the core's endGame (the core bans in-match penalties online too);
   a shootout with real guest participation needs netcode this module does not have (#24/#33).
   =================================================================================================== */
let shootout=null;                                   // {a:[bool], b:[bool], turn} while the kicks run (a = my kicks, b = the opponent's)
let lastSd=null;                                     // the decided tie-break, shown on the result card
function sdEligible(){ return matchFmt==='golden' && score.me===score.op && !training && !spectating && !mp; }
const _fmtEndGame=endGame;
endGame=function(){
  if(!shootout && state!=='end' && sdEligible()){ startSuddenDeath(); return; }
  _fmtEndGame();
};
function startSuddenDeath(){
  shootout={a:[], b:[], turn:0};
  state='penalty'; cancelAnimationFrame(rafId); sfx.whistle(); say('fmt.sdSay');
  netEv('hold:pk'); sendSnapshot();                  // anyone watching or playing on another computer: the match is paused for kicks
  setTimeout(()=>{ if(shootout && state==='penalty') sdNextKick(); }, ECON.fmt.sdStart);
}
function sdNextKick(){
  if(!shootout) return;
  const meShoots = shootout.turn%2===0, lv=PK_LEVELS[level ? level.i : 1]||PK_LEVELS[1];
  const pp=!!(pk && pk.pausePending);                // ❚❚ pressed between two kicks: carried onto the new kick (#29)
  setupPenalty(meShoots, lv, (goal, why)=>sdResult(meShoots, goal, why), T('fmt.sdTitle', Math.floor(shootout.turn/2)+1));
  if(pp && pk) pk.pausePending=true;                 // the core's setupKick pauses as soon as the kick is set up
  sdRenderPips();
}
/* ✖ during the tie-break: the core's ✖ handler calls pk.onResult(false,'quit') for a single kick, which lands
   here: ask first, then count it as a loss — never as a miss for whoever was kicking (#22) */
function sdQuit(){
  if(!shootout || !pk || pk.quitting) return;
  pk.quitting=true;
  ask(T('fmt.sdQuitQ')).then(ok=>{
    if(pk) pk.quitting=false;
    if(!ok || !shootout || !pk) return;
    pk.phase='over'; cancelAnimationFrame(pk.raf); clearTimeout(pk.timer);
    finishSuddenDeath('lose');
  });
}
function sdResult(meShoots, goal, why){
  if(why==='quit'){ sdQuit(); return; }              // the ✖ path (explicit, so a quit is never mistaken for a miss)
  if(!shootout || !pk || pk.phase==='over') return;  // already resolved (✖ pressed while the ball was in flight)
  pk.phase='over'; cancelAnimationFrame(pk.raf); clearTimeout(pk.timer);
  (meShoots ? shootout.a : shootout.b).push(!!goal); shootout.turn++;
  sdRenderPips();
  const o=sdOutcome();
  setTimeout(()=>{ if(!shootout || state!=='penalty') return; if(o) finishSuddenDeath(o); else sdNextKick(); }, ECON.fmt.sdGap);
}
function sdOutcome(){
  const {a,b}=shootout; if(a.length!==b.length) return null;         // only after a full pair
  const ga=a.filter(Boolean).length, gb=b.filter(Boolean).length;
  if(ga!==gb) return ga>gb ? 'win' : 'lose';
  return a.length>=ECON.fmt.sdPairs ? 'draw' : null;
}
function sdPips(arr){ let s=''; for(let i=0;i<ECON.fmt.sdPairs;i++) s+= i<arr.length ? (arr[i]?'⚽':'❌') : '⚪'; return s; }
function sdRenderPips(){
  const el=$('#fmt-sd-pips'); if(!el || !shootout) return;
  el.hidden=false; el.innerHTML=`<span class="me">${esc(nm(myChar))} ${sdPips(shootout.a)}</span><span class="sep">·</span><span class="op">${sdPips(shootout.b)} ${esc(nm(opChar))}</span>`;
}
function finishSuddenDeath(o){
  const s=shootout; shootout=null;
  pk=null; $('#pk-score').hidden=false; $('#fmt-sd-pips').hidden=true;
  showScreen('game'); netEv('holdEnd');
  lastSd={o, me:s.a.filter(Boolean).length, op:s.b.filter(Boolean).length};
  if(o!=='draw'){ overtime=true; netEv('golden'); }   // decided by the golden tie-break: the +10 golden bonus, on every seat
  netEv('end:'+(o==='win'?'p1':o==='lose'?'p2':'draw'));   // the displayed score stays level; the result is the kicks'
  showEnd(o); sendSnapshot();
}
function clearSuddenDeath(){ shootout=null; const el=$('#fmt-sd-pips'); if(el) el.hidden=true; }
/* a kick left alive by an abort (a friend dropping, a stale home button): killed with the shootout */
function sdKillKick(){ if(pk){ cancelAnimationFrame(pk.raf); clearTimeout(pk.timer); pk=null; clearCornerUI(); } clearSuddenDeath(); }
/* leaving for home is always the end of a tie-break, whichever quitToHome the pause button holds (#3) */
Hooks.on('screen', id=>{ if(id==='home') clearSuddenDeath(); });

/* ===================================================================================================
   SPECTATING — the clock and the fmt-* classes follow the WATCHED match: the host's setup message
   carries its format, an older host without one means Classic (#27/#37)
   =================================================================================================== */
const _fmtSetupMsg=matchSetupMsg;
matchSetupMsg=function(){ const m=_fmtSetupMsg(); if(m && !m.fmt) m.fmt=matchFmt; return m; };
const _fmtSpectSetup=spectSetup;
spectSetup=function(m){ matchFmt = (m && ECON.formats[m.fmt]) ? m.fmt : 'classic'; _fmtSpectSetup(m); };

/* ===================================================================================================
   (2) BEST-OF-3 — settings.bo3 turns every eligible match into game 1 of a series of Quick games
   (party host, offline 2v2 with keyboard friends, and plain offline matches); guests mirror the host's
   series from a {t:'fmt'} message. First to 2 game wins; after 3 games the leader wins (level → draw).
   Series winner: +40 🪙 (inside the daily cap) and +1 🏆. Every seat pays itself, as the core does.
   =================================================================================================== */
let series=null;                                     // {n, wins:{me,op}, hist:['W'|'L'|'D'], game, done, winner, pending, guest, mode, lvl}
function seriesEligible(){ return !!settings.bo3 && !training && !dailyMatch && !spectating && !(mp && mp.role==='guest'); }
function seriesNew(){ return {n:ECON.fmt.seriesGames, wins:{me:0,op:0}, hist:[], game:1, done:false, winner:null, pending:false, guest:false}; }
function seriesFromHost(f){                          // the host sends team-left wins first; a guest on the left team (P3) shares the host's side
  const W=Array.isArray(f.wins) ? f.wins : [0,0], L=W[0]|0, R=W[1]|0, meL=!!(mp && mp.teamL);
  const s=seriesNew(); s.n=f.n|0||ECON.fmt.seriesGames; s.wins={me: meL?L:R, op: meL?R:L}; s.game=Math.max(1, f.game|0); s.guest=true;
  s.hist=Array.isArray(f.hist) ? f.hist.map(h=>h==='D' ? 'D' : ((h==='W')===meL ? 'W' : 'L')) : [];
  return s;
}
function seriesInfo(){
  if(!series) return null;
  const s=series; return {n:s.n, game:s.game, wins:{me:s.wins.me, op:s.wins.op}, hist:s.hist.slice(), done:s.done, winner:s.winner, guest:!!s.guest, text: s.done ? seriesDoneText(0) : T('fmt.series', s.wins.me, s.wins.op, s.game, s.n)};
}
function seriesDoneText(paid){ const w=series.wins; return series.winner==='me' ? T('fmt.seriesWon', w.me, w.op, paid) : series.winner==='op' ? T('fmt.seriesLost', w.me, w.op) : T('fmt.seriesDraw', w.me, w.op); }
function seriesPips(){ let s=''; for(let i=0;i<series.n;i++){ const h=series.hist[i]; s+= h==='W' ? '🟢' : h==='L' ? '🔴' : h==='D' ? '🟡' : '⚪'; } return s; }
function seriesRenderTag(){
  const el=$('#fmt-series'); if(!el) return;
  el.hidden=!series;
  if(series) el.innerHTML=`${T('fmt.seriesTag', series.game)} ${series.wins.me}-${series.wins.op}<span class="pips">${seriesPips()}</span>`;
}
function seriesPay(){                                // the series bonus counts inside the daily coin cap, like a match payout
  const want=ECON.fmt.seriesCoins, n=Math.min(want, coinCapLeft());
  if(n>0){ dayCounter('coinDay').n+=n; addCoins(n,'series'); }
  addTrophies(ECON.fmt.seriesTrophies);
  return n;
}
/* every match start: a pending "next game" continues the series, a guest mirrors the host, otherwise a fresh series (or none) */
const _fmtBeginMatch=beginMatch;
beginMatch=function(c1, c2, opts){
  sdKillKick(); lastSd=null;
  if(series && series.pending) series.pending=false;
  else if(mp && mp.role==='guest'){ const f=mp.fmtSeries; mp.fmtSeries=null; series = (f && f.bo3) ? seriesFromHost(f) : null; }
  else series = seriesEligible() ? seriesNew() : null;
  _fmtBeginMatch(c1, c2, opts);
  if(series && matchFmt!=='quick') series=null;      // a series is Quick games only: a forced Classic (old guest) means no series (#35)
  seriesRenderTag();
};
/* the host tells the guests about the series right before the core's 'start' message (same ordered connection) */
const _fmtMpStart=mpStart;
mpStart=function(mode, lvl){
  if(!mp || mp.role!=='host' || state!=='idle' || spectating) return _fmtMpStart(mode, lvl);
  const cont = !!(series && series.pending), bo3 = (cont || seriesEligible()) && !fmtPartyForced();
  const w = cont ? series.wins : {me:0,op:0};
  mpSendAll({t:'fmt', bo3, game: cont ? series.game : 1, n:ECON.fmt.seriesGames, wins:[w.me, w.op], hist: cont ? series.hist.slice() : []});
  _fmtMpStart(mode, lvl);
  if(series){ series.mode=mode; series.lvl=lvl; }
};
/* after the result card: update the series, show the line and the "next game" button */
Hooks.on('matchEnd', info=>{
  const line=$('#fmt-end-line'), next=$('#btn-fmt-next'), again=$('#btn-end-again'); if(!line || !next) return;
  const bits=[]; let won=false;
  if(lastSd){ bits.push(T(lastSd.o==='win' ? 'fmt.sdWon' : lastSd.o==='lose' ? 'fmt.sdLost' : 'fmt.sdDraw', lastSd.me, lastSd.op)); won = lastSd.o==='win'; lastSd=null; }
  let showNext=false;
  if(series && !info.training){
    const s=series, w=s.wins;
    if(info.outcome==='win'){ w.me++; s.hist.push('W'); } else if(info.outcome==='lose'){ w.op++; s.hist.push('L'); } else s.hist.push('D');
    const need=Math.floor(s.n/2)+1;
    if(w.me>=need || w.op>=need || s.hist.length>=s.n){ s.done=true; s.winner = w.me>w.op ? 'me' : w.op>w.me ? 'op' : 'draw'; }
    if(s.done){
      let paid=0;
      if(s.winner==='me'){ paid=seriesPay(); won=true; toast(T('fmt.seriesToast'),'ach'); }
      bits.push(seriesDoneText(paid)+(s.winner==='me' && paid<ECON.fmt.seriesCoins ? ' · '+T('end.capped') : ''));
    } else {
      s.game++; bits.push(T('fmt.series', w.me, w.op, s.game, s.n));
      if(s.guest) bits.push(T('fmt.waitHost')); else showNext=true;
    }
  }
  line.hidden=!bits.length; line.innerHTML=bits.map(esc).join('<br>'); line.classList.toggle('won', won);
  next.hidden=!showNext; next.textContent=T('fmt.next');
  if(showNext){ if(again) again.hidden=true; ['#btn-ec-more','#btn-ec-again'].forEach(s=>{ const b=$(s); if(b) b.hidden=true; }); }   // during a series the series button replaces "again"
  else if(again && !$('#endcard-btns')) again.hidden=false;                                                                 // the end-card module manages the core buttons itself
});
$('#btn-fmt-next').addEventListener('click', ()=>{
  if(!series || series.done || series.guest) return;
  sfx.click(); series.pending=true;
  if(mp && mp.role==='host'){ goHome(); mpStart(series.mode, series.lvl); return; }
  const m=lastMatch; goHome();
  if(m){ level=m.level; dailyMatch=false; forcedOpp=null; beginMatch(m.c1, m.c2, m.opts); }
  else startOfflineMatch(level ? level.i : 1);
});
/* leaving a match (or the party) ends the series, unless the next game is about to start */
const _fmtGoHome=goHome;
goHome=function(){ clearSuddenDeath(); if(series && !series.pending) series=null; _fmtGoHome(); };
const _fmtQuitToHome=quitToHome;
quitToHome=function(){ clearSuddenDeath(); series=null; _fmtQuitToHome(); };
const _fmtMpTeardown=mpTeardown;
mpTeardown=function(){ if(series && !series.pending) series=null; _fmtMpTeardown(); };
/* a friend dropping mid-match: no ghost penalty or shootout may survive the abort (#25) */
const _fmtMpAbort=mpAbort;
mpAbort=function(){ sdKillKick(); lastSd=null; pausedFrom=null; _fmtMpAbort(); };

/* ===================================================================================================
   (4) VERSION CHECK — host: a guest whose hello carries no version or an older one gets one toast
   (the core already forces Classic for a guest without a version). Guest: the host's hello (and a
   lobby message that carries ver) tells whether the host is older or newer than me.
   =================================================================================================== */
const _fmtMpOnMsg=mpOnMsg;
mpOnMsg=function(m, c){
  if(m && m.t==='fmt'){ if(!c && mp) mp.fmtSeries=m; return; }   // the host's series message (consumed by the next beginMatch)
  _fmtMpOnMsg(m, c);
  if(!m || !mp) return;
  if(m.t==='hello' && c){
    if((!c.ver || c.ver<GAME_VERSION) && !c.fmtWarned){ c.fmtWarned=true; toast(T('fmt.oldVersion', c.name||T('mp.friend')),'warn'); }
  } else if((m.t==='hello' || m.t==='lobby') && !c && !mp.fmtVerWarned){
    if(m.t==='hello' && !m.ver){ mp.fmtVerWarned=true; toast(T('fmt.hostOld'),'warn'); }
    else if(m.ver && m.ver>GAME_VERSION){ mp.fmtVerWarned=true; toast(T('fmt.hostNewer'),'warn'); }
    else if(m.ver && m.ver<GAME_VERSION){ mp.fmtVerWarned=true; toast(T('fmt.hostOld'),'warn'); }
  }
};

/* ---------- language: the chips and the button are rebuilt with every applyLang ---------- */
const _fmtApplyLang=applyLang;
applyLang=function(){ _fmtApplyLang(); fmtRelabel(); const h=$('#fmt-party-hint'); if(h && !h.hidden) h.textContent=T('fmt.classicOnly'); };
applyLang();
