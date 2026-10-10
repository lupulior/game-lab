/* emotes: keys 1-4 → bubble over my player, cooldown, the touch strip, snapshot relay (guests), guest → host message, bots emote back */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length; const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  const key=(code,k)=>window.dispatchEvent(new KeyboardEvent('keydown',{code, key:k, bubbles:true, cancelable:true}));
  const bubble=p=>p.el.querySelector('.emote');
  TASSERT('4 fixed emotes, strings in 4 languages', ECON.emotes.list.join('')==='😂😎🔥👏' && ['emote.btn','emote.helpKeys','emote.helpTouch','emote.setting'].every(k=>I18N_RAW[k] && I18N_RAW[k].length===4));
  TASSERT('UI built: 😀 button, strip with 4 buttons, settings row', !!$('#btn-emote') && document.querySelectorAll('#emote-strip .eb').length===4 && $('#emote-strip').hidden && !!$('#set-emotes') && $('#set-emotes').checked);
  // --- not in a match: keys do nothing
  key('Digit1','1'); await tick();
  TASSERT('idle: no bubble, not sendable', !bubble(P1) && emoteCanSend()===false);
  // --- an offline match
  settings.format='quick'; prog.matches=10; EMOTES.lastT=0;
  startOfflineMatch(1); await tick(4500);
  for(let i=0;i<10 && state!=='play';i++) await tick(300);
  TASSERT('match running', state==='play' && $('#game').classList.contains('active'));
  TASSERT('button hidden without the touch class', getComputedStyle($('#btn-emote')).display==='none');
  // --- key 2 → 😎 over P1, then gone
  key('Digit2','2'); await tick();
  TASSERT('key 2 → 😎 bubble on P1', !!bubble(P1) && bubble(P1).textContent==='😎' && !bubble(P2));
  key('Digit3','3'); await tick();
  TASSERT('cooldown: the second emote is ignored', P1.el.querySelectorAll('.emote').length===1 && bubble(P1).textContent==='😎' && emoteCanSend()===false);
  await tick(2000);
  TASSERT('bubble gone after ~2 s', !bubble(P1));
  TASSERT('still on cooldown within 4 s', emoteSend(0)===false && !bubble(P1));
  // --- the touch strip: 😀 opens it for 3 s, a tap sends and closes
  EMOTES.lastT=0; document.body.classList.add('touch'); await tick();
  TASSERT('touch: the 😀 button shows', getComputedStyle($('#btn-emote')).display!=='none');
  $('#btn-emote').click(); await tick();
  TASSERT('strip opens', !$('#emote-strip').hidden);
  $('#emote-strip .eb[data-i="2"]').click(); await tick();
  TASSERT('tap 🔥 → bubble on P1, strip closed, button on cooldown', !!bubble(P1) && bubble(P1).textContent==='🔥' && $('#emote-strip').hidden && $('#btn-emote').classList.contains('cool'));
  TASSERT('offline without spectators: nothing queued for the network', !evBuf.some(e=>String(e).startsWith('emote:')));
  EMOTES.lastT=0; $('#btn-emote').click(); await tick(); TASSERT('strip open again', !$('#emote-strip').hidden);
  await tick(3200); TASSERT('strip closes by itself after 3 s', $('#emote-strip').hidden);
  document.body.classList.remove('touch');
  // --- guest / spectator side: an 'emote:' event in a snapshot shows the bubble over that slot (once)
  P1.el.querySelectorAll('.emote').forEach(x=>x.remove()); P2.el.querySelectorAll('.emote').forEach(x=>x.remove());
  const snap=ev=>({t:'s', p:players.map(p=>[Math.round(p.x),Math.round(p.y),Math.round(p.vx),p.facing,p.kicks|0,0,0,0]), b:[Math.round(ball.x),Math.round(ball.y),+ball.rot.toFixed(2)], sc:[score.me,score.op], tl:+timeLeft.toFixed(1), st:'play', ev});
  applySnapshot(snap(['emote:P2:0','kick']), true, false); await tick();
  TASSERT('snapshot emote:P2:0 → 😂 over P2', !!bubble(P2) && bubble(P2).textContent==='😂' && !bubble(P1));
  P2.el.querySelectorAll('.emote').forEach(x=>x.remove());
  mp={role:'guest', slot:'P2', connected:true, conn:{send(){}}};
  applySnapshot(snap(['emote:P2:1']), true, true); await tick();
  TASSERT('guest: my own echo is not shown twice', !bubble(P2));
  applySnapshot(snap(['emote:P1:3']), true, true); await tick();
  TASSERT('guest: the host\'s 👏 shows over P1', !!bubble(P1) && bubble(P1).textContent==='👏');
  settings.emotesOff=true; P1.el.querySelectorAll('.emote').forEach(x=>x.remove());
  applySnapshot(snap(['emote:P1:2']), true, true); await tick();
  TASSERT('emotesOff hides others\' emotes', !bubble(P1));
  settings.emotesOff=false; mp=null;
  // --- guest → host message: the host shows it over the guest's player and relays it in the snapshot (per-sender cooldown)
  evBuf.length=0; P2.el.querySelectorAll('.emote').forEach(x=>x.remove());
  const c={conn:{send(){}}, slot:'P2', name:'x', pick:null, ready:true, ver:GAME_VERSION, rin:{l:0,r:0,j:0,k:0,s:0}};
  mp={role:'host', connected:true, conns:[c], cfg:{v2:false, src:{P2:'net'}}};
  let crashed=false; try{ mpOnMsg({t:'emote', i:1}, c); mpOnMsg({t:'emote', i:2}, c); }catch(e){ crashed=true; }
  TASSERT('host: {t:emote} shows 😎 over P2, relayed once, no crash', !crashed && !!bubble(P2) && bubble(P2).textContent==='😎' && evBuf.filter(e=>e==='emote:P2:1').length===1 && !evBuf.includes('emote:P2:2'));
  c.emoteT=0; c.ver=''; mpOnMsg({t:'emote', i:3}, c);
  TASSERT('old-build guest: shown locally, not relayed (same guard as say)', bubble(P2).textContent==='👏' && !evBuf.includes('emote:P2:3'));
  c.ver=GAME_VERSION; EMOTES.lastT=0; evBuf.length=0; emoteSend(0);
  TASSERT('host\'s own emote goes into the snapshot', evBuf.includes('emote:P1:0'));
  let crashed2=false; try{ mpOnMsg({t:'emote', i:1}, null); mpOnMsg({t:'i', l:1, r:0}, c); }catch(e){ crashed2=true; }
  TASSERT('other messages still reach the core', !crashed2 && c.rin.l===1);
  mp=null; evBuf.length=0;
  // --- bots emote back (30 %, 1 s later): forced with Math.random = 0
  P1.el.querySelectorAll('.emote').forEach(x=>x.remove()); P2.el.querySelectorAll('.emote').forEach(x=>x.remove());
  const _rnd=Math.random; Math.random=()=>0;
  emoteBotReply(P2, [3]); TASSERT('bot reply waits', !bubble(P2));
  await tick(1150); TASSERT('bot replies 👏 after a second', !!bubble(P2) && bubble(P2).textContent==='👏');
  P2.el.querySelectorAll('.emote').forEach(x=>x.remove());
  Math.random=()=>.99; emoteBotReply(P2, [0]); await tick(1150); TASSERT('70 % of the time the bot stays quiet', !bubble(P2));
  Math.random=_rnd;
  TASSERT('penalties ignore emotes', (()=>{ const o=pk; pk={phase:'aim'}; const r=emoteCanSend(); pk=o; return r===false; })());
  // --- the controls card gets one help line
  if(typeof showControlsHelp==='function'){ showControlsHelp(null); await tick(); TASSERT('help line under the controls', !!$('#emote-help') && $('#emote-help').textContent===T('emote.helpKeys')); $('#ctrl-modal').classList.remove('show'); }
  quitToHome(); await tick();
  TASSERT('home again, strip closed', $('#home').classList.contains('active') && $('#emote-strip').hidden);
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
