/* match-format extras: picker chips, golden clock, sudden-death kicks, best-of-3 (offline + host + guest mirror), version check */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const errs0=window.__errs.length, wait=ms=>new Promise(r=>setTimeout(r,ms));
  const untilKick=async()=>{ for(let i=0;i<60;i++){ if(pk && pk.single && pk.phase!=='idle' && pk.phase!=='over') return true; await wait(20); } return false; };   // the core sets the kick up 500 ms after setupPenalty
  let seriesPaid=0; Hooks.on('coins', (n,why)=>{ if(why==='series') seriesPaid+=n; });
  prog.coinDay={key:dayKey(), n:0}; training=null; dailyMatch=false; mp=null;

  // --- (3) the picker: 4 chips, Bo3 = quick + settings.bo3, the party modal carries the same chips
  TASSERT('picker: 4 chips', (formatPickerHTML().match(/data-fmt=/g)||[]).length===4);
  const host=document.createElement('div'); host.innerHTML=formatPickerHTML(); document.body.appendChild(host); bindFormatPicker(host);
  host.querySelector('[data-fmt="bo3"]').click();
  TASSERT('picker: bo3 chip → settings.bo3 + format quick', settings.bo3===true && settings.format==='quick' && myFormat()==='quick' && host.querySelector('[data-fmt="bo3"]').classList.contains('on'));
  host.querySelector('[data-fmt="golden"]').click();
  TASSERT('picker: golden chip', settings.format==='golden' && settings.bo3===false && myFormat()==='golden');
  TASSERT('party modal: picker present and synced', !!$('#party-modal .fmt-picker') && $('#party-modal .fmt-picker [data-fmt="golden"]').classList.contains('on'));
  $('#party-modal .fmt-picker [data-fmt="classic"]').click();
  TASSERT('party modal: chip sets classic and syncs the other picker', settings.format==='classic' && host.querySelector('[data-fmt="classic"]').classList.contains('on'));
  mp={role:'host', code:'ABCD', connected:true, conns:[{conn:{send(){}}, slot:'P2', name:'Old', pick:null, ready:false, ver:''}], cfg:{v2:true,src:{},party:true}, myPick:null, myReady:false};
  openPartyModal();
  TASSERT('party modal: a guest without a version → classic-only hint, chips off', !$('#fmt-party-hint').hidden && $('#fmt-party-picker .fmt-picker').classList.contains('off'));
  // #35: an OLDER version forces classic too, and a refresh while the modal is open re-applies the state
  mp.conns[0].ver='2000-01-01.1'; openPartyModal();
  TASSERT('#35 party modal: a guest on an older version → chips off, hint shown', fmtPartyForced() && !$('#fmt-party-hint').hidden && $('#fmt-party-picker .fmt-picker').classList.contains('off'));
  mp.conns[0].ver=GAME_VERSION; partyRefresh();
  TASSERT('#35 party refresh with the modal open: the guest updated → chips back on', !fmtPartyForced() && $('#fmt-party-hint').hidden && !$('#fmt-party-picker .fmt-picker').classList.contains('off'));
  $('#party-modal').classList.remove('show'); mp=null;

  // --- (5) the golden clock
  settings.format='golden'; level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]);
  TASSERT('golden: the clock shows the label', matchFmt==='golden' && $('#timer').textContent===T('fmt.goldenTimer') && $('#timer').classList.contains('fmt-label'));
  state='play'; timeLeft=8; updateTimer();
  TASSERT('golden: the last 10 s still tick', $('#timer').textContent==='0:08' && !$('#timer').classList.contains('fmt-label'));
  TASSERT('#27 the spectator setup message carries the format', matchSetupMsg().fmt==='golden');

  // --- (1) golden tie at full time → sudden-death kicks, me first, decided after one pair
  ECON.fmt.sdStart=30; ECON.fmt.sdGap=30;
  score.me=1; score.op=1; timeLeft=0.001; lastT=performance.now()-16; loop(performance.now());
  TASSERT('golden tie → sudden death (state penalty, shootout object)', state==='penalty' && !!shootout && shootout.turn===0);
  TASSERT('kick 1: a single in-match penalty, me first', await untilKick() && pk.single===true && typeof pk.onResult==='function' && pk.meFirst===true && $('#pk').classList.contains('active'));
  TASSERT('kick 1: pips shown', !$('#fmt-sd-pips').hidden && $('#fmt-sd-pips').textContent.includes('⚪⚪⚪'));
  TASSERT('kick 1: title names the kick', $('#pk-round').textContent===T('fmt.sdTitle',1));
  pk.onResult(true);
  // #29: ❚❚ pressed in the gap between two kicks pauses the next kick as soon as it is set up
  pauseGame();
  TASSERT('#29 pause between kicks: flagged on the finished kick', pk.pausePending===true && !$('#pause-modal').classList.contains('show'));
  TASSERT('#29 pause between kicks: the next kick starts paused', await untilKick() && pk.phase==='paused' && pausedFrom==='pk' && $('#pause-modal').classList.contains('show') && pk.meFirst===false);
  resumeGame();
  TASSERT('#29 resume: the opponent kicks', pk.phase!=='paused' && pausedFrom===null && !$('#pause-modal').classList.contains('show'));
  TASSERT('kick 2: the opponent shoots, my goal recorded', await untilKick() && pk.meFirst===false && shootout.a[0]===true && $('#fmt-sd-pips').textContent.includes('⚽⚪⚪'));
  // #22: ✖ during the opponent's kick never records a miss for him; it asks, and "yes" counts as a loss
  $('#btn-pk-back').click(); await wait(20);
  TASSERT('#22 ✖ during the kicks: asks, no miss recorded', $('#ask-modal').classList.contains('show') && shootout.b.length===0 && pk.phase!=='over' && pk.quitting===true);
  $('#btn-ask-no').click(); await wait(20);
  TASSERT('#22 ✖ → no: the kicks go on', !$('#ask-modal').classList.contains('show') && !!shootout && pk.quitting===false && state==='penalty');
  const c0=prog.coins; pk.onResult(false); await wait(80);
  TASSERT('scored vs missed → win card, score unchanged, shootout cleared', state==='end' && $('#end-title').textContent===T('end.win') && score.me===1 && score.op===1 && shootout===null && $('#game').classList.contains('active'));
  TASSERT('end card: the kicks line 1-0', !$('#fmt-end-line').hidden && $('#fmt-end-line').textContent.includes('1-0') && prog.coins>c0);
  goHome();
  // still level after 3 pairs → draw
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=0; score.op=0; timeLeft=0.001; lastT=performance.now()-16; loop(performance.now());
  let ok=true; for(let i=0;i<6;i++){ if(!(await untilKick())){ ok=false; break; } pk.onResult(true); }
  await wait(80);
  TASSERT('3 level pairs → draw card', ok && state==='end' && $('#end-title').textContent===T('end.draw') && $('#fmt-end-line').textContent.includes('3-3') && shootout===null);
  goHome();
  // #22: ✖ → yes ends the tie-break as a loss
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=0; score.op=0; timeLeft=0.001; lastT=performance.now()-16; loop(performance.now());
  await untilKick(); $('#btn-pk-back').click(); await wait(20); $('#btn-ask-yes').click(); await wait(80);
  TASSERT('#22 ✖ → yes: the kicks are lost, score still level', state==='end' && $('#end-title').textContent===T('end.lose') && shootout===null && pk===null && score.me===0 && $('#fmt-end-line').textContent.includes(T('fmt.sdLost',0,0)));
  goHome();
  // #3: the pause menu's home button holds the ORIGINAL quitToHome; the screen hook still clears the pips
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=0; score.op=0; timeLeft=0.001; lastT=performance.now()-16; loop(performance.now());
  await untilKick(); pauseGame(); $('#btn-quit-home').click();
  TASSERT('#3 pause → home mid-shootout: shootout and pips cleared', state==='idle' && pk===null && shootout===null && $('#fmt-sd-pips').hidden && $('#home').classList.contains('active'));
  // a guest never runs the tie-break
  mp={role:'guest', code:'ABCD', connected:true, slot:'P2', teamL:false, conn:{send(){}}, hostName:'H'};
  level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); matchFmt='golden'; state='play'; score.me=0; score.op=0; endGame();
  TASSERT('guest: a level golden match ends as a draw, no kicks', state==='end' && shootout===null);
  mp=null; goHome();
  // #24/#33: neither does a connected host — an online golden tie is a draw
  mp={role:'host', code:'ABCD', connected:true, conns:[{conn:{send(){}}, slot:'P2', name:'Dani', pick:3, ready:true, ver:GAME_VERSION}], cfg:{v2:false,src:{P2:'net'},party:true}, myPick:null, myReady:false};
  level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]); matchFmt='golden'; state='play'; score.me=1; score.op=1; endGame();
  TASSERT('#24/#33 host: a level online golden match ends as a draw, no kicks', state==='end' && shootout===null && $('#end-title').textContent===T('end.draw') && $('#game').classList.contains('active'));
  goHome();
  // #25: a friend dropping mid-kick kills the kick and the shootout with the abort
  beginMatch(CHARS[0], CHARS[1]); state='play'; shootout={a:[],b:[],turn:0}; pk={single:true, phase:'aim', raf:0, timer:0}; $('#fmt-sd-pips').hidden=false; pausedFrom='pk';
  mpAbort();
  TASSERT('#25 abort mid-kick: no ghost penalty, shootout and pause bookkeeping cleared', pk===null && shootout===null && $('#fmt-sd-pips').hidden && pausedFrom===null && state==='idle' && !$('#pk-score').hidden);
  mpTeardown(); mp=null; goHome();
  // #27/#37: a spectator's clock follows the WATCHED match, not the watcher's last format
  settings.format='golden'; matchFmt='golden';
  spectating={name:'Yoav', conn:{close(){}, on(){}}, snap:null, names:null};
  const setup={t:'setup', chars:[CHARS[0].id, CHARS[1].id], v2:false, src:null, names:{}, lv:1, sc:[0,0], tl:200, host:'Yoav'};
  spectSetup(setup);
  TASSERT('#27/#37 spectating an old host (no fmt) → classic clock, no golden label', matchFmt==='classic' && !$('#timer').classList.contains('fmt-label') && !$('#game').classList.contains('fmt-golden') && $('#timer').textContent!==T('fmt.goldenTimer'));
  spectSetup(Object.assign({}, setup, {fmt:'golden'}));
  TASSERT('#27/#37 spectating a golden match → the golden label', matchFmt==='golden' && $('#timer').classList.contains('fmt-label') && $('#game').classList.contains('fmt-golden'));
  stopWatching(false); matchFmt='classic';

  // --- (2) best-of-3 offline: 3 games, the series bonus
  settings.format='quick'; settings.bo3=true; level=LEVELS[1]; beginMatch(CHARS[0], CHARS[1]);
  TASSERT('bo3: a series starts, each game is Quick, pips under the clock', !!series && series.game===1 && matchFmt==='quick' && !$('#fmt-series').hidden && $('#fmt-series').textContent.includes('⚪⚪⚪'));
  state='play'; score.me=2; score.op=0; endGame();
  TASSERT('game 1 won → 1-0, next button replaces "again"', state==='end' && series.wins.me===1 && !series.done && !$('#btn-fmt-next').hidden && $('#btn-end-again').hidden && $('#fmt-end-line').textContent.includes('1-0'));
  const si=seriesInfo(); TASSERT('seriesInfo()', si && si.game===2 && si.wins.me===1 && si.wins.op===0 && si.hist[0]==='W' && !si.done);
  $('#btn-fmt-next').click();
  TASSERT('next game: same opponent, same level, series continues', state==='countdown' && !!series && series.game===2 && opChar===CHARS[1] && level===LEVELS[1] && $('#fmt-series').textContent.includes('1-0') && $('#fmt-series').textContent.includes('🟢'));
  state='play'; score.me=0; score.op=1; endGame();
  TASSERT('game 2 lost → 1-1', series.wins.op===1 && !series.done && $('#fmt-end-line').textContent.includes('1-1'));
  $('#btn-fmt-next').click(); state='play'; score.me=1; score.op=0; prog.coinDay={key:dayKey(), n:0}; const t1=prog.trophies|0; endGame();
  TASSERT('game 3 won → series won: +40 🪙 inside the cap, +1 🏆, line + toast', series.done && series.winner==='me' && seriesPaid===40 && (prog.trophies|0)>=t1+2 && dayCounter('coinDay').n>=40 && $('#fmt-end-line').textContent.includes('40') && $('#toast').textContent.includes(T('fmt.seriesToast')));
  TASSERT('series over: "again" is back, no next button', $('#btn-fmt-next').hidden && !$('#btn-end-again').hidden);
  goHome(); TASSERT('home clears the series', series===null);
  // no series when the chip is off
  settings.bo3=false; beginMatch(CHARS[0], CHARS[1]);
  TASSERT('bo3 off: no series, no pips', series===null && $('#fmt-series').hidden);
  state='play'; score.me=2; score.op=0; endGame();
  TASSERT('bo3 off: no series line, no next button, again visible', $('#fmt-end-line').hidden && $('#btn-fmt-next').hidden && !$('#btn-end-again').hidden);
  goHome();
  // quitting mid-series ends it
  settings.bo3=true; beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=0; endGame(); $('#btn-fmt-next').click(); state='play'; quitToHome();
  TASSERT('quit mid-series → series gone', series===null && state==='idle');

  // --- (2) best-of-3 on the party host: the 'fmt' message precedes 'start'
  const sent=[]; mp={role:'host', code:'ABCD', connected:true, conns:[{conn:{send(m){ sent.push(m); }}, slot:'P2', name:'Dani', pick:3, ready:true, ver:GAME_VERSION}], cfg:{v2:false,src:{P2:'net'},party:true}, myPick:null, myReady:false};
  settings.bo3=true; mpStart('1v1', 2);
  TASSERT('host: fmt message before start, series game 1', sent[0] && sent[0].t==='fmt' && sent[0].bo3===true && sent[0].game===1 && sent[1] && sent[1].t==='start' && sent[1].fmt==='quick' && !!series && series.game===1 && series.mode==='1v1' && series.lvl===2);
  state='play'; score.me=2; score.op=1; endGame();
  TASSERT('host: game 1 won, next button', series.wins.me===1 && !$('#btn-fmt-next').hidden);
  sent.length=0; $('#btn-fmt-next').click();
  TASSERT('host: next game → mpStart again with the series state', sent[0] && sent[0].t==='fmt' && sent[0].game===2 && sent[0].wins[0]===1 && sent[0].wins[1]===0 && sent[0].hist[0]==='W' && sent[1] && sent[1].t==='start' && sent[1].lv===2 && series.game===2 && state==='countdown');
  state='idle'; cancelAnimationFrame(rafId); series=null;
  // #35: a guest on an older build → the core forces Classic, so no series is announced or started
  mp.conns[0].ver='2000-01-01.1'; sent.length=0; mpStart('1v1', 2);
  TASSERT('#35 host with an old guest: fmt says no series, classic match, no series started', sent[0] && sent[0].t==='fmt' && sent[0].bo3===false && sent[1] && sent[1].fmt==='classic' && matchFmt==='classic' && series===null && $('#fmt-series').hidden);
  state='idle'; cancelAnimationFrame(rafId); mp.conns[0].ver=GAME_VERSION;

  // --- (4) version check + guest mirror
  const c=mp.conns[0]; const toastsBefore=$('#toast').children.length;
  mpOnMsg({t:'hello', name:'Dani', s:{}, ver:'2000-01-01.1'}, c); mpOnMsg({t:'hello', name:'Dani', s:{}, ver:'2000-01-01.1'}, c);
  const oldToasts=[...$('#toast').children].filter(d=>d.textContent===T('fmt.oldVersion','Dani')).length;
  TASSERT('host: an old guest → one toast (not twice)', c.ver==='2000-01-01.1' && c.fmtWarned===true && oldToasts===1);
  mp={role:'guest', code:'ABCD', connected:true, slot:'P2', teamL:false, conn:{send(){}}};
  mpOnMsg({t:'hello', name:'Host', s:{}, slot:'P2', ver:'9999-01-01.1'}, null);
  TASSERT('guest: a newer host → "refresh" toast', mp.fmtVerWarned===true && $('#toast').textContent.includes(T('fmt.hostNewer')));
  mpOnMsg({t:'fmt', bo3:true, game:2, n:3, wins:[1,0], hist:['W']}, null);
  TASSERT('guest: fmt message kept', !!mp.fmtSeries && mp.fmtSeries.bo3===true);
  level=LEVELS[1]; matchFmt='quick'; beginMatch(CHARS[0], CHARS[1]);
  TASSERT('guest: mirrors the series from its own side', !!series && series.guest && series.wins.op===1 && series.wins.me===0 && series.game===2 && series.hist[0]==='L' && !$('#fmt-series').hidden);
  state='play'; score.me=0; score.op=1; showEnd('lose');
  TASSERT('guest: series lost 0-2, no next button, line shown', series.done && series.winner==='op' && $('#btn-fmt-next').hidden && $('#fmt-end-line').textContent.includes('0-2'));
  state='idle'; cancelAnimationFrame(rafId); mp=null; series=null; $('#end').classList.remove('show'); showScreen('home');

  TASSERT('no new script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
