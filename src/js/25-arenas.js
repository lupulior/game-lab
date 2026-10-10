/* ===================================================================================================
   ARENAS — six arenas unlocked by lifetime trophies (Rumble-Stars style). Every arena has its own
   pitch look (PITCH_THEMES.arenaN, drawn instead of the plain 'day' pitch), tints the home background
   (#home[data-arena]) and the fans (#game[data-arena]), and holds ONE exclusive player that can be
   bought (normal price) only once the arena is reached. Crossing into a new arena after a match shows
   a celebration with confetti and a coin gift, once (prog.arenaSeen = highest arena celebrated).
   Public: ARENAS, arenaIndex(t?), arenaCurrent(), arenaNextOf(), arenaOf(i), arenaName(a),
           arenaFor(char), arenaLocked(char), arenaLockText(a), arenaSwatch(a,w,h), openArenas(),
           arenaHomeRefresh(), arenaCheckNew(delay), arenaShowNew(), closeArenaNew()
   Wraps: buildPitch, tryBuy, buildGallery, refreshPreview, shopBuildPlayers, shopBuyChar, shopRotation
   prog: prog.arenaSeen   ECON: ECON.arenas={thresholds, giftPer, showDelay}
   =================================================================================================== */
I18N_ADD({
 'arena.1':['מגרש השכונה','Neighbourhood Pitch','ملعب الحي','Дворовое поле'],
 'arena.2':['אצטדיון העיר','City Stadium','ملعب المدينة','Городской стадион'],
 'arena.3':['ארנת החוף','Beach Arena','ساحة الشاطئ','Пляжная арена'],
 'arena.4':['אצטדיון הלילה','Night Stadium','ملعب الليل','Ночной стадион'],
 'arena.5':['ארנת הקרח','Ice Arena','ساحة الجليد','Ледовая арена'],
 'arena.6':['ארנת האלופים','Champions Arena','ساحة الأبطال','Арена чемпионов'],
 'arena.title':['🏟️ הארנות','🏟️ Arenas','🏟️ الساحات','🏟️ Арены'],
 'arena.sub':['יש לך {0} 🏆 · ארנה {1} מתוך 6','You have {0} 🏆 · arena {1} of 6','لديك {0} 🏆 · الساحة {1} من 6','У тебя {0} 🏆 · арена {1} из 6'],
 'arena.next':['עוד {0} 🏆 לארנה הבאה','{0} 🏆 more to the next arena','{0} 🏆 أخرى للساحة التالية','Ещё {0} 🏆 до следующей арены'],
 'arena.top':['הארנה האחרונה!','The top arena!','الساحة الأخيرة!','Последняя арена!'],
 'arena.here':['אתה כאן','You are here','أنت هنا','Ты здесь'],
 'arena.excl':['שחקן בלעדי','Exclusive player','لاعب حصري','Эксклюзивный игрок'],
 'arena.lock':['🏟️ נפתח בארנה {0} ({1} 🏆)','🏟️ Unlocks in arena {0} ({1} 🏆)','🏟️ يُفتح في الساحة {0} ({1} 🏆)','🏟️ Откроется на арене {0} ({1} 🏆)'],
 'arena.lockBtn':['🔒 נפתח בארנה {0} ({1} 🏆)','🔒 Unlocks in arena {0} ({1} 🏆)','🔒 يُفتح في الساحة {0} ({1} 🏆)','🔒 Откроется на арене {0} ({1} 🏆)'],
 'arena.lockToast':['🔒 {0} נפתח רק ב{1} — צריך {2} 🏆','🔒 {0} unlocks only in {1} — you need {2} 🏆','🔒 {0} يُفتح فقط في {1} — تحتاج {2} 🏆','🔒 {0} откроется только на {1} — нужно {2} 🏆'],
 'arena.newTitle':['🏟️ ארנה חדשה!','🏟️ New arena!','🏟️ ساحة جديدة!','🏟️ Новая арена!'],
 'arena.gift':['מתנה: 🪙 {0}','Gift: 🪙 {0}','هدية: 🪙 {0}','Подарок: 🪙 {0}'],
 'arena.newChar':['עכשיו אפשר לקנות את {0}!','Now you can buy {0}!','الآن يمكنك شراء {0}!','Теперь можно купить {0}!'],
 'arena.newPitch':['המגרש החדש שלך','Your new pitch','ملعبك الجديد','Твоё новое поле'],
 'arena.ok':['יש! 🎉','Yes! 🎉','رائع! 🎉','Ура! 🎉'],
 'arena.close':['סגור','Close','إغلاق','Закрыть'],
});
STATIC_ADD({'#arena-title':'arena.title', '#btn-arena-close':'arena.close', '#arena-new-title':'arena.newTitle', '#btn-arena-new-ok':'arena.ok'});

Object.assign(ECON, { arenas:{ thresholds:[0,25,75,150,300,600], giftPer:100, showDelay:600 } });   // gift = giftPer × arena index

/* the six arenas: threshold in lifetime trophies, emoji, pitch theme, the exclusive player (arenas 2..6) */
const ARENAS=[
  {i:1, t:ECON.arenas.thresholds[0], emoji:'🏘️', theme:'day',    char:null},
  {i:2, t:ECON.arenas.thresholds[1], emoji:'🏙️', theme:'arena2', char:'yamal'},
  {i:3, t:ECON.arenas.thresholds[2], emoji:'🏖️', theme:'arena3', char:'r9'},
  {i:4, t:ECON.arenas.thresholds[3], emoji:'🌃', theme:'arena4', char:'ronaldinho'},
  {i:5, t:ECON.arenas.thresholds[4], emoji:'❄️', theme:'arena5', char:'zlatan'},
  {i:6, t:ECON.arenas.thresholds[5], emoji:'👑', theme:'arena6', char:'pele'},
];
/* a clearly different pitch per arena (grass / surroundings / track / boards) */
Object.assign(PITCH_THEMES, {
  arena2:{ base:'#36A657', stripeA:'#36A657', stripeB:'#41BA64', far:'#2B8A47', track:'#737B8C', boards:['#3D8BFF','#ffffff','#1B2A4E','#FFD447','#3D8BFF','#ffffff','#1B2A4E','#FF7A3D'] },   // city: asphalt track, blue/white boards
  arena3:{ base:'#86CF4E', stripeA:'#86CF4E', stripeB:'#96DB60', far:'#F0D894', track:'#F7E4A8', boards:['#00C2D1','#FF8A5B','#FFE27A','#ffffff','#00C2D1','#FF8A5B','#FFE27A','#ffffff'] },   // beach: light grass, sand all around
  arena4:{ base:'#237A44', stripeA:'#237A44', stripeB:'#2C8E52', far:'#17562F', track:'#3D2A6E', boards:['#8E5CF6','#FF4E9B','#00D3A7','#ffffff','#8E5CF6','#FF4E9B','#00D3A7','#FFD447'] },   // night: dark grass, purple track, neon boards
  arena5:{ base:'#8FCDEB', stripeA:'#8FCDEB', stripeB:'#A4D9F2', far:'#EDF7FC', track:'#5E9FD1', boards:['#1B6FB8','#ffffff','#9ED8FF','#1B6FB8','#ffffff','#9ED8FF','#1B6FB8','#ffffff'] },   // ice: frozen pitch, snow around
  arena6:{ base:'#2E9E4F', stripeA:'#2E9E4F', stripeB:'#3BB562', far:'#23803E', track:'#B8902A', boards:['#FFD447','#8E5CF6','#ffffff','#FFD447','#8E5CF6','#ffffff','#FFD447','#8E5CF6'] },   // champions: gold track, gold/purple boards
});
/* defensive: an exclusive must be a real, buyable player that the trophy road does not hand out */
for(const a of ARENAS){
  if(!a.char) continue;
  const c=CHARS.find(x=>x.id===a.char);
  if(!c || FREE_CHARS.includes(c.id) || c.trophyOnly || (typeof roadFor==='function' && roadFor(c.id)!=null)) a.char=null;
}
const ARENA={ pending:null, drawn:0 };          // drawn = arena index of the pitch currently drawn (0 = not an arena pitch)

/* ----- arena lookups ----- */
function arenaIndex(t){ t = t==null ? (prog.trophies|0) : t; let i=1; for(const a of ARENAS) if(t>=a.t) i=a.i; return i; }
function arenaOf(i){ return ARENAS[Math.max(1, Math.min(ARENAS.length, i|0))-1]; }
function arenaCurrent(){ return arenaOf(arenaIndex()); }
function arenaNextOf(){ const i=arenaIndex(); return i<ARENAS.length ? ARENAS[i] : null; }
function arenaName(a){ return T('arena.'+a.i); }
function arenaFor(c){ if(!c) return null; return ARENAS.find(a=>a.char===c.id)||null; }                 // the arena a player is exclusive to
function arenaLocked(c){ const a=arenaFor(c); if(!a || isUnlocked(c)) return null; return arenaIndex()<a.i ? a : null; }
function arenaLockText(a){ return T('arena.lock', a.i, a.t); }
function arenaRefuse(c, a){ sfx.lose(); toast(T('arena.lockToast', nm(c), arenaName(a), a.t),'warn'); }

/* ----- the pitch: an offline 1v1 'day' match without an equipped stadium look plays in the current arena ----- */
function arenaPitchFree(){
  if(typeof mp!=='undefined' && mp) return false;
  if(typeof v2!=='undefined' && v2) return false;
  if(typeof spectating!=='undefined' && spectating) return false;
  const id=prog.eq && prog.eq.stadium; if(id && PITCH_THEMES[id] && (typeof cosOwned!=='function' || cosOwned(id))) return false;
  return true;
}
function arenaPitchWant(){ const a=arenaCurrent(); return (arenaPitchFree() && a.i>1 && PITCH_THEMES[a.theme]) ? a.i : 0; }
const _arenaBuildPitch=buildPitch;
buildPitch=function(themeName){
  const want=themeName||'day'; let t=want, idx=0;
  if(want==='day'){ idx=arenaPitchWant(); if(idx) t=arenaOf(idx).theme; }
  _arenaBuildPitch(t);
  pitchTheme=want;                                                            // the core compares against the name it asked for
  ARENA.drawn=idx;
  const g=$('#game'); if(g){ if(idx) g.setAttribute('data-arena', idx); else g.removeAttribute('data-arena'); }
};
function arenaPitchInvalidate(){ if(arenaPitchWant()!==ARENA.drawn) pitchTheme=''; }   // the next match redraws the pitch

/* ----- buying: refused below the arena ----- */
const _arenaTryBuy=tryBuy;
tryBuy=async function(c){ const a=arenaLocked(c); if(a){ arenaRefuse(c, a); return false; } return _arenaTryBuy.apply(this, arguments); };
if(typeof shopBuyChar==='function'){
  const _arenaShopBuyChar=shopBuyChar;
  shopBuyChar=async function(c){ const a=arenaLocked(c); if(a){ arenaRefuse(c, a); return false; } return _arenaShopBuyChar.apply(this, arguments); };
}
/* the character of the day is never one the kid cannot buy yet: walk the shop's own pool to the next one */
if(typeof shopRotation==='function'){
  const _arenaShopRotation=shopRotation;
  shopRotation=function(){
    const slots=_arenaShopRotation.apply(this, arguments);
    const s=slots && slots[0]; if(!s || s.slot!=='char' || !s.char || !arenaLocked(s.char)) return slots;
    const pool=CHARS.filter(c=>!c.trophyOnly && !FREE_CHARS.includes(c.id)), j=pool.indexOf(s.char);
    for(let k=1;k<pool.length;k++){ const c=pool[(j+k)%pool.length]; if(!isUnlocked(c) && !arenaLocked(c)){ s.char=c; s.coins=charDealCoins(c); s.gems=charDealGems(c); s.full=priceOf(c); break; } }
    return slots;
  };
}

/* ----- lock labels on the rendered cards (gallery + shop players tab) ----- */
function arenaMarkGallery(){
  document.querySelectorAll('#gallery .card[data-i]').forEach(card=>{
    const c=CHARS[+card.dataset.i], a=c && arenaLocked(c); if(!a) return;
    card.classList.add('arena-locked');
    let l=card.querySelector('.lock'); if(!l){ l=document.createElement('div'); l.className='lock'; card.appendChild(l); }
    l.classList.add('arena-lock'); l.textContent=arenaLockText(a);
  });
}
const _arenaBuildGallery=buildGallery;
buildGallery=function(){ const r=_arenaBuildGallery.apply(this, arguments); arenaMarkGallery(); return r; };
const _arenaRefreshPreview=refreshPreview;
refreshPreview=function(){
  const r=_arenaRefreshPreview.apply(this, arguments);
  const c=CHARS[previewIdx], a=c && arenaLocked(c), b=$('#btn-choose'); if(a && b) b.textContent=T('arena.lockBtn', a.i, a.t);
  return r;
};
if(typeof shopBuildPlayers==='function'){
  const _arenaShopPlayers=shopBuildPlayers;
  shopBuildPlayers=function(body){
    const r=_arenaShopPlayers.apply(this, arguments);
    document.querySelectorAll('#shop-pgrid .shop-pcard[data-i]').forEach(d=>{
      const c=CHARS[+d.dataset.i], a=c && arenaLocked(c); if(!a) return;
      d.classList.add('arena-locked'); const pr=d.querySelector('.pr'); if(pr){ pr.classList.add('arena-lock'); pr.textContent=arenaLockText(a); }
    });
    const pv=$('#shop-ppv'), c=CHARS[typeof shopPick==='number' ? shopPick : -1], a=pv && c && arenaLocked(c);
    if(a){
      const pr=pv.querySelector('.pr'); if(pr){ pr.classList.add('arena-lock'); pr.textContent=arenaLockText(a); }
      const buy=pv.querySelector('.btn[data-act=buy]'); if(buy) buy.remove();
      const go=document.createElement('button'); go.className='btn small blue'; go.dataset.act='arena'; go.textContent=T('arena.title');
      go.addEventListener('click', e=>{ e.stopPropagation(); sfx.click(); openArenas(); }); pv.appendChild(go);
    }
    return r;
  };
}

/* ----- a 60×40 swatch of an arena's pitch ----- */
function arenaSwatch(a, w, h){
  const th=PITCH_THEMES[a.theme]||PITCH_THEMES.day, bc=th.boards||['#fff'];
  let s=`<svg viewBox="0 0 60 40" width="${w||60}" height="${h||40}" xmlns="http://www.w3.org/2000/svg">`;
  s+=`<rect width="60" height="40" fill="${th.far}"/><rect y="6" width="60" height="5" fill="${th.track}"/>`;
  for(let i=0;i<6;i++) s+=`<rect x="${i*10+.5}" y="0" width="9" height="5" rx="1" fill="${bc[i%bc.length]}"/>`;
  for(let i=0;i<6;i++) s+=`<rect x="${i*10}" y="11" width="10" height="29" fill="${i%2?th.stripeA:th.stripeB}"/>`;
  s+=`<rect x="4" y="14" width="52" height="23" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/><line x1="30" y1="14" x2="30" y2="37" stroke="#fff" stroke-width="1.5" opacity=".9"/><circle cx="30" cy="25.5" r="5" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/>`;
  return s+'</svg>';
}

/* ----- home: background per arena + the pill above the trophy pill ----- */
function arenaHomeRefresh(){
  const home=$('#home'); if(!home) return;
  const a=arenaCurrent(), nx=arenaNextOf(), t=prog.trophies|0;
  home.setAttribute('data-arena', a.i);
  const tp=$('#trophy-pill'); if(!tp || !tp.parentNode) return;
  let pill=$('#home-arena');
  if(!pill){ pill=document.createElement('button'); pill.id='home-arena'; pill.className='pill arena'; pill.addEventListener('click', ()=>{ sfx.click(); openArenas(); }); }
  if(pill.parentNode!==tp.parentNode || pill.nextElementSibling!==tp) tp.parentNode.insertBefore(pill, tp);   // always right before the trophy pill, wherever the home module keeps it
  pill.setAttribute('data-arena', a.i);
  pill.innerHTML=`<span class="arn-name">🏟️ ${esc(arenaName(a))}</span><span class="arn-next">${esc(nx ? T('arena.next', nx.t-t) : T('arena.top'))}</span>`;
}

/* ----- the arenas modal ----- */
function openArenas(){
  const t=prog.trophies|0, cur=arenaIndex();
  $('#arena-sub').textContent=T('arena.sub', fmtNum(t), cur);
  $('#arena-list').innerHTML=ARENAS.map(a=>{
    const c=a.char && CHARS.find(x=>x.id===a.char), reached=t>=a.t, here=a.i===cur, st=here ? '📍' : reached ? '✔' : '🔒';
    return `<div class="arn-row ${reached?'got':'locked'}${here?' here':''}" data-arena="${a.i}">
      <span class="arn-emo">${a.emoji}</span>
      <span class="arn-mid"><b>${esc(arenaName(a))}</b><small>🏆 ${a.t}${here ? ' · '+esc(T('arena.here')) : ''}</small></span>
      <span class="arn-sw">${arenaSwatch(a)}</span>
      <span class="arn-ch${c && isUnlocked(c) ? ' own' : ''}">${c ? playerSVG(c)+'<small>'+esc(nm(c))+'</small>' : ''}</span>
      <span class="arn-st">${st}</span></div>`;
  }).join('');
  $('#arena-modal').classList.add('show');
  const here=$('#arena-list .arn-row.here'); if(here) setTimeout(()=>{ try{ here.scrollIntoView({block:'nearest'}); }catch(e){} }, 30);
}
$('#btn-arena-close').addEventListener('click', ()=>{ sfx.click(); $('#arena-modal').classList.remove('show'); });
$('#arena-modal').addEventListener('click', e=>{ if(e.target===$('#arena-modal')) $('#arena-modal').classList.remove('show'); });

/* ----- a new arena: gift + celebration, once per arena ----- */
function arenaCheckNew(delay){
  const cur=arenaIndex(), seen=prog.arenaSeen|0;
  if(cur<=seen) return false;
  const a=arenaOf(cur), gift=ECON.arenas.giftPer*cur;
  prog.arenaSeen=cur; saveProg();
  addCoins(gift,'arena');
  ARENA.pending={a, gift};
  arenaPitchInvalidate();
  setTimeout(arenaShowNew, delay||0);
  return true;
}
function arenaShowNew(){
  const p=ARENA.pending; if(!p) return;
  if(['play','countdown','celebrate','replay','penalty','corner','training'].includes(state)) return;   // a match is on: the next home visit shows it
  const a=p.a, c=a.char && CHARS.find(x=>x.id===a.char);
  $('#arena-new-emoji').textContent=a.emoji; $('#arena-new-name').textContent=arenaName(a);
  $('#arena-new-sw').innerHTML=arenaSwatch(a, 180, 120); $('#arena-new-sw').title=T('arena.newPitch');
  $('#arena-new-gift').textContent=T('arena.gift', fmtNum(p.gift));
  const ch=$('#arena-new-char');
  if(c){ ch.hidden=false; ch.innerHTML=`<span class="sprite">${playerSVG(c)}</span><span>${esc(T('arena.newChar', nm(c)))}</span>`; } else { ch.hidden=true; ch.innerHTML=''; }
  ARENA.pending=null;
  $('#arena-new-modal').classList.add('show');
  try{ sfx.win(); }catch(e){} try{ confetti.burst(160); }catch(e){}
}
function closeArenaNew(){ $('#arena-new-modal').classList.remove('show'); }
$('#btn-arena-new-ok').addEventListener('click', ()=>{ sfx.click(); closeArenaNew(); if($('#home').classList.contains('active')) arenaHomeRefresh(); });

/* ----- wiring ----- */
if(prog.arenaSeen==null){ prog.arenaSeen=arenaIndex(); saveProg(); }          // existing players start at their arena without a retroactive celebration
Hooks.on('home', ()=>{ arenaHomeRefresh(); arenaPitchInvalidate(); if(ARENA.pending) arenaShowNew(); });
Hooks.on('wallet', ()=>{ if($('#home').classList.contains('active') && $('#home-arena')) arenaHomeRefresh(); });
Hooks.on('screen', id=>{
  if(id==='home'){ arenaHomeRefresh(); arenaPitchInvalidate(); if(ARENA.pending) arenaShowNew(); }
  if(id==='game'){ $('#arena-modal').classList.remove('show'); closeArenaNew(); }
});
Hooks.on('matchEnd', info=>{ if(info && info.training) return; arenaCheckNew(ECON.arenas.showDelay); });
applyLang();
