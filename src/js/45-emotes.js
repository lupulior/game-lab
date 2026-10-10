/* ===================================================================================================
   EMOTES (45-emotes) — 4 in-match emotes 😂 😎 🔥 👏 (PLAN §5.4), also online.
   Keys 1–4 on a keyboard; on phones a small 😀 button (top-left) opens a 4-emoji strip for 3 s.
   A speech bubble (.emote) pops over the sender's player for 1.6 s; 4-s cooldown per player.
   Online: host → netEv('emote:<slot>:<id>') inside the snapshot (applySnapshot wrapper shows it);
           guest → mp.conn.send({t:'emote', i}) → the host (mpOnMsg wrapper) shows it and relays it.
   Offline: bots emote back sometimes (after a goal, or when you emote) — 30 %, one second later.
   settings.emotesOff hides OTHER people's (and bots') emotes; your own always show.
   =================================================================================================== */
Object.assign(ECON, { emotes:{
  list:['😂','😎','🔥','👏'],   // ids 0..3
  cooldown:4000,                // ms between two emotes of the same player
  show:1600,                    // ms a bubble stays
  strip:3000,                   // ms the touch strip stays open
  botReply:.3, botDelay:1000,   // bots emote back: chance, delay
}});
I18N_ADD({
  'emote.btn':      ["אימוג'י", 'Emote', 'إيموجي', 'Эмодзи'],
  'emote.helpKeys': ['😂 😎 🔥 👏 — מקשים 1 2 3 4', '😂 😎 🔥 👏 — keys 1 2 3 4', '😂 😎 🔥 👏 — المفاتيح 1 2 3 4', '😂 😎 🔥 👏 — клавиши 1 2 3 4'],
  'emote.helpTouch':['😀 ואז 😂 😎 🔥 👏', '😀 then 😂 😎 🔥 👏', '😀 ثم 😂 😎 🔥 👏', '😀, потом 😂 😎 🔥 👏'],
  'emote.setting':  ["😀 אימוג'ים של שחקנים אחרים", '😀 Emotes from other players', '😀 إيموجي اللاعبين الآخرين', '😀 Эмодзи других игроков'],
});
const EMOTES={ lastT:0, stripTimer:0, coolTimer:0 };    // lastT: my last emote (performance.now()); tests reset it

/* ----- the bubble ----- */
/* p: a player object ({el}), a slot name ('P1'..'P4') or an element. Returns the bubble element (or null). */
function emoteShow(p, id){
  const el = p && p.el ? p.el : (typeof p==='string' ? (SLOT_P[p] ? SLOT_P[p].el : null) : p);
  const ch=ECON.emotes.list[id|0];
  if(!el || !(el instanceof Element) || !ch) return null;
  el.querySelectorAll('.emote').forEach(x=>x.remove());
  const d=document.createElement('div'); d.className='emote'; d.textContent=ch; el.appendChild(d);
  setTimeout(()=>d.remove(), ECON.emotes.show);
  return d;
}
const emoteMySlot = () => (mp && mp.role==='guest') ? (mp.slot||'P2') : 'P1';
/* may I emote right now? in a running match (play / celebrate), not watching, not on the penalty screens, cooldown over */
function emoteCanSend(){
  if(spectating || (typeof pk!=='undefined' && pk)) return false;
  if(state!=='play' && state!=='celebrate') return false;
  return performance.now()-EMOTES.lastT >= ECON.emotes.cooldown;
}
/* host (or offline with friends watching): put the event into the next snapshot — unless a guest runs an older build (same guard as say()) */
function emoteRelay(slot, id){
  if(mp && mp.conns && mp.conns.some(c=>!c.ver || c.ver<GAME_VERSION)) return;
  netEv('emote:'+slot+':'+id);
}
/* my emote: bubble over my player, then the network / the bots */
function emoteSend(id){
  id=id|0;
  if(!ECON.emotes.list[id] || !emoteCanSend()) return false;
  EMOTES.lastT=performance.now(); emoteStripClose();
  const b=$('#btn-emote'); if(b){ b.classList.add('cool'); clearTimeout(EMOTES.coolTimer); EMOTES.coolTimer=setTimeout(()=>b.classList.remove('cool'), ECON.emotes.cooldown); }
  const slot=emoteMySlot(); emoteShow(slot, id);
  try{ sfx.click(); }catch(e){}
  if(mp && mp.role==='guest'){ if(mp.conn && mp.connected){ try{ mp.conn.send({t:'emote', i:id}); }catch(e){} } }
  else { emoteRelay(slot, id); if(!mp) for(const p of (teamR||[])) if(p.src==='ai') emoteBotReply(p, [0,1,2,3]); }
  Hooks.emit('emote', slot, id);
  return true;
}
/* a bot answers (offline only): 30 % chance, one second later, one of the given emote ids */
function emoteBotReply(p, pool){
  if(!p || !p.el || Math.random()>=ECON.emotes.botReply) return;
  setTimeout(()=>{
    if(settings.emotesOff || mp || spectating) return;
    if(state!=='play' && state!=='celebrate' && state!=='replay') return;
    if(p.el.hidden || p.el.classList.contains('bot-emote')) return;      // the Trickster is already laughing (50-bot)
    emoteShow(p, pool[Math.floor(Math.random()*pool.length)]);
  }, ECON.emotes.botDelay);
}

/* ----- touch: the 😀 button and the strip ----- */
function emoteStripOpen(){
  const s=$('#emote-strip'); if(!s || !emoteCanSend()) return false;
  s.hidden=false; clearTimeout(EMOTES.stripTimer); EMOTES.stripTimer=setTimeout(emoteStripClose, ECON.emotes.strip);
  return true;
}
function emoteStripClose(){ const s=$('#emote-strip'); if(s) s.hidden=true; clearTimeout(EMOTES.stripTimer); EMOTES.stripTimer=0; }
(function emoteBuildUI(){
  const g=$('#game'); if(!g || $('#btn-emote')) return;
  const b=document.createElement('button'); b.type='button'; b.id='btn-emote'; b.textContent='😀'; b.title=T('emote.btn');
  b.addEventListener('click', e=>{ e.stopPropagation(); if($('#emote-strip').hidden){ if(emoteStripOpen()) try{ sfx.click(); }catch(_){} } else emoteStripClose(); });
  const s=document.createElement('div'); s.id='emote-strip'; s.hidden=true; s.title=T('emote.btn');
  ECON.emotes.list.forEach((ch,i)=>{ const x=document.createElement('button'); x.type='button'; x.className='eb'; x.dataset.i=i; x.textContent=ch; x.addEventListener('click', e=>{ e.stopPropagation(); emoteSend(i); }); s.appendChild(x); });
  g.appendChild(b); g.appendChild(s);
})();
Hooks.on('screen', id=>{ if(id!=='game') emoteStripClose(); });

/* ----- keyboard: 1 2 3 4 (top row only — the numpad belongs to the 2v2 key sets) ----- */
window.addEventListener('keydown', e=>{
  if(e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  const m=/^Digit([1-4])$/.exec(e.code||''); if(!m) return;
  const t=e.target; if(t && t!==window && t!==document && t!==document.body && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)) return;
  if(emoteSend(+m[1]-1)) e.preventDefault();
});

/* ----- online: snapshot events (guests + spectators) ----- */
function emoteOnNetEv(e){                              // 'emote:<slot>:<id>'
  const a=String(e).split(':'); const slot=a[1], id=+a[2];
  if(!SLOT_P[slot] || !(id>=0)) return;
  if(mp && mp.role==='guest' && slot===mp.slot) return;   // my own emote coming back from the host: it was shown when I sent it
  if(settings.emotesOff) return;
  emoteShow(slot, id);
}
const _emoteApplySnapshot=applySnapshot;
applySnapshot=function(s, teamL, isPlayer){
  if(s && Array.isArray(s.ev)) for(const e of s.ev){ if(typeof e==='string' && e.startsWith('emote:')) emoteOnNetEv(e); }
  return _emoteApplySnapshot.apply(this, arguments);
};
/* ----- online: a guest's emote reaches the host ----- */
function emoteFromGuest(m, c){
  if(!mp || mp.role!=='host' || !c || !c.slot) return;
  const id=m.i|0; if(!ECON.emotes.list[id]) return;
  if(state!=='play' && state!=='celebrate' && state!=='replay') return;
  const now=performance.now(); if(c.emoteT && now-c.emoteT<ECON.emotes.cooldown) return; c.emoteT=now;
  if(!settings.emotesOff) emoteShow(c.slot, id);
  emoteRelay(c.slot, id);
  Hooks.emit('emote', c.slot, id);
}
const _emoteMpOnMsg=mpOnMsg;
mpOnMsg=function(m, c){
  if(m && m.t==='emote'){ if(c) emoteFromGuest(m, c); return; }
  return _emoteMpOnMsg.apply(this, arguments);
};

/* ----- offline: the bot reacts to goals (scored: 😎 🔥, conceded: 👏 😂) ----- */
const _emoteScoreGoal=scoreGoal;
scoreGoal=function(who){
  const s0=state; const r=_emoteScoreGoal.apply(this, arguments);
  if(s0==='play' && state==='celebrate' && !training && !mp && !spectating) for(const p of (teamR||[])) if(p.src==='ai') emoteBotReply(p, who==='op' ? [1,2] : [3,0]);
  return r;
};

/* ----- settings: show other people's emotes (on by default) ----- */
(function emoteSettingsRow(){
  const v=$('#set-voice'); const row=v && v.closest('.setrow'); if(!row || $('#set-emotes')) return;
  const d=document.createElement('div'); d.className='setrow';
  d.innerHTML='<span id="set-emotes-l"></span><label class="switch"><input type="checkbox" id="set-emotes"><span></span></label>';
  row.after(d);
  const cb=$('#set-emotes'); cb.checked=!settings.emotesOff;
  cb.addEventListener('change', ()=>{ settings.emotesOff=!cb.checked; saveSettings(); try{ sfx.click(); }catch(e){} });
  STATIC_ADD({'#set-emotes-l':'emote.setting'});
})();

/* ----- one help line under the controls card (95-onboard loads later, so the wrap waits for the page to finish loading) ----- */
setTimeout(()=>{
  if(typeof showControlsHelp!=='function') return;
  const _h=showControlsHelp;
  showControlsHelp=function(){
    const r=_h.apply(this, arguments);
    try{ const g=$('#ctrl-grid'); if(g){ let d=$('#emote-help'); if(!d){ d=document.createElement('div'); d.id='emote-help'; g.after(d); } d.textContent=T(document.body.classList.contains('touch') ? 'emote.helpTouch' : 'emote.helpKeys'); } }catch(e){}
    return r;
  };
}, 0);
applyLang();
