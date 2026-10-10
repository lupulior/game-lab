/* ===== SQUAD ("נבחרת"): three players; after each of my goals in an offline 1v1 match the next one comes on =====
   prog.squad = [charId, charId|null, charId|null]  — slot 0 is always the selected character (kept in sync both ways).
   Public: squad() squadCharAt(k) squadSet(k, id|null) squadOpen() squadClose() squadRender() squadSubstitute()
   Hooks emitted: 'squadSub'(char, slot) after a substitution.  No physics / controls are touched. */
I18N_ADD({
 'squad.btn':['👥 נבחרת','👥 Squad','👥 الفريق','👥 Состав'],
 'squad.title':['👥 הנבחרת שלי','👥 My squad','👥 فريقي','👥 Мой состав'],
 'squad.hint':['אחרי כל גול שלך השחקן הבא נכנס למגרש!','After each of your goals the next player comes on!','بعد كل هدف لك يدخل اللاعب التالي إلى الملعب!','После каждого твоего гола на поле выходит следующий игрок!'],
 'squad.main':['⭐ מתחיל','⭐ Starter','⭐ أساسي','⭐ Первый'],
 'squad.empty':['➕ הוסף','➕ Add','➕ أضف','➕ Добавить'],
 'squad.pickTitle':['מי נכנס למקום {0}?','Who takes spot {0}?','من يأخذ المكان {0}؟','Кто займёт место {0}?'],
 'squad.inSlot':['במקום {0}','In spot {0}','في المكان {0}','На месте {0}'],
 'squad.noMove':['קודם בחר מתחיל אחר','Pick another starter first','اختر لاعبًا أساسيًا آخر أولاً','Сначала выбери другого первого игрока'],
 'squad.sub':['🔁 החלפה! {0} נכנס למגרש','🔁 Substitution! {0} comes on','🔁 تبديل! {0} يدخل الملعب','🔁 Замена! {0} выходит на поле'],
 'squad.burst':['🔁 החלפה','🔁 Sub','🔁 تبديل','🔁 Замена'],
 'squad.back':['➜ חזרה','➜ Back','➜ رجوع','➜ Назад'],
 'squad.close':['סגור','Close','إغلاق','Закрыть'],
});
STATIC_ADD({'#sq-title':'squad.title', '#sq-hint':'squad.hint', '#btn-sq-back':'squad.back', '#btn-sq-close':'squad.close'});

const SQUAD={ idx:0, pending:false, active:false, pick:null };

/* ----- data ----- */
const squadCharById = id => id ? CHARS.find(c=>c.id===id) || null : null;
/* the squad array, always 3 long, slot 0 synced to `selected` (a character moved into slot 0 from another slot swaps with the old starter) */
function squad(){
  let s=prog.squad;
  if(!Array.isArray(s) || s.length!==3){ s=prog.squad=[null,null,null]; }
  for(let k=0;k<3;k++){ if(s[k]!=null && !squadCharById(s[k])) s[k]=null; }
  const me=CHARS[selected] ? CHARS[selected].id : null;
  if(me && s[0]!==me){ const j=s.indexOf(me); if(j>0) s[j]=s[0]; s[0]=me; }
  if(s[1] && s[1]===s[0]) s[1]=null; if(s[2] && (s[2]===s[0] || s[2]===s[1])) s[2]=null;
  return s;
}
function squadCharAt(k){ return squadCharById(squad()[k|0]); }
/* members who can actually play now (unlocked), as [{k, c}] */
function squadMembers(){ const out=[]; squad().forEach((id,k)=>{ const c=squadCharById(id); if(c && isUnlocked(c)) out.push({k, c}); }); return out; }

/* choosing a starter from the squad UI behaves exactly like the core's "choose" button */
function squadChoose(i){
  if(!(i>=0) || i===selected) return;
  selected=i; Hooks.emit('select', selected); refreshHome();
  if(mp && mp.role==='guest' && mp.connected){ try{ mp.conn.send({t:'pick', i:selected}); }catch(e){} }
  if(mp && mp.role==='host' && typeof mpBroadcastLobby==='function') mpBroadcastLobby();
  if(typeof partyRefresh==='function') partyRefresh();
}
/* put character `id` into slot k (null empties slots 1/2). Returns true when something changed. */
function squadSet(k, id){
  const s=squad(); k=k|0; if(k<0 || k>2) return false;
  if(id==null){ if(k===0) return false; if(s[k]==null) return false; s[k]=null; saveProg(); squadRender(); return true; }
  const c=squadCharById(id); if(!c || !isUnlocked(c)) return false;
  const j=s.indexOf(id);
  if(j===k) return false;
  if(j===0 && !s[k]){ toast(T('squad.noMove'),'warn'); return false; }    // the starter cannot move away and leave slot 0 empty
  const old=s[k];
  if(j>=0) s[j]=old;                                                        // swap with the slot it came from
  else if(k===0 && old){ const e=s.findIndex((x,i)=>i>0 && !x); if(e>0) s[e]=old; }   // a new starter: the old one keeps a free bench slot
  s[k]=id;
  if(s[0]!==(CHARS[selected]||{}).id){ squadChoose(CHARS.findIndex(x=>x.id===s[0])); }   // slot 0 changed → the selected character follows
  saveProg(); squadRender(); return true;
}
Hooks.on('select', ()=>{ squad(); saveProg(); });

/* ----- the match: a substitution after each of my goals (offline 1v1 only) ----- */
function squadNext(){
  const s=squad();
  for(let step=1; step<=2; step++){ const k=(SQUAD.idx+step)%3; const c=squadCharById(s[k]); if(c && isUnlocked(c)) return k; }
  return null;
}
function squadBurst(el){
  if(!el) return; const b=document.createElement('div'); b.className='sq-burst'; b.textContent=T('squad.burst'); el.appendChild(b);
  setTimeout(()=>{ try{ b.remove(); }catch(e){} }, 1250);
}
function squadSubstitute(){
  const k=squadNext(); if(k==null || k===SQUAD.idx) return false;
  const c=squadCharById(squad()[k]); if(!c) return false;
  SQUAD.idx=k; P1.ch=c; myChar=c;
  const sp=P1.el.querySelector('.sprite'); if(sp) sprite(sp, c, 'happy', undefined);   // undefined = my own kit, like beginMatch
  const tag=P1.el.querySelector('.tag'); if(tag) tag.textContent=T('game.me', nm(c));
  const n=$('#n-me'); if(n) n.textContent=nm(c);
  showLine(T('squad.sub', nm(c)), true);                                    // local commentator only (say() would relay online)
  squadBurst(P1.el);
  Hooks.emit('squadSub', c, k);
  return true;
}
const _sqBeginMatch=beginMatch;
beginMatch=function(c1, c2, opts){
  _sqBeginMatch(c1, c2, opts);
  SQUAD.idx=0; SQUAD.pending=false;
  SQUAD.active = !training && !mp && !v2 && !spectating && !pk && !opts && players.length===2 && P1.ch===CHARS[selected];
};
const _sqScoreGoal=scoreGoal;
scoreGoal=function(who){
  const s0=state; _sqScoreGoal(who);
  if(who==='me' && s0==='play' && state==='celebrate' && SQUAD.active && !training) SQUAD.pending=true;
};
const _sqAfterGoal=afterGoal;
afterGoal=function(){
  _sqAfterGoal();
  if(!SQUAD.pending) return; SQUAD.pending=false;
  if(SQUAD.active && state==='play' && !training && !mp && !v2 && !spectating) squadSubstitute();   // the game is back in play, positions reset: swap the sprite now
};
Hooks.on('screen', id=>{ if(id!=='game'){ SQUAD.active=false; SQUAD.pending=false; } });

/* ----- the modal ----- */
function squadOpen(){ SQUAD.pick=null; squadRender(); const m=$('#squad-modal'); if(m) m.classList.add('show'); }
function squadClose(){ const m=$('#squad-modal'); if(m) m.classList.remove('show'); SQUAD.pick=null; }
function squadRender(){
  const s=squad(), box=$('#sq-slots'), pick=$('#sq-pick'); if(!box || !pick) return;
  const picking = SQUAD.pick!=null;
  box.hidden=picking; pick.hidden=!picking;
  const hint=$('#sq-hint'); if(hint) hint.hidden=picking;
  const bk=$('#btn-sq-back'); if(bk) bk.hidden=!picking;
  const cl=$('#btn-sq-close'); if(cl) cl.hidden=picking;
  if(!picking){
    box.innerHTML='';
    s.forEach((id,k)=>{
      const c=squadCharById(id);
      const d=document.createElement('div'); d.className='sq-slot'+(c?'':' empty')+(k===0?' main':''); d.dataset.k=k; d.tabIndex=0;
      d.innerHTML = `<div class="sq-no">${k+1}</div>`
        + (c ? `<div class="sq-sprite">${playerSVG(c)}</div><div class="sq-name">${esc(nm(c))}</div>` : `<div class="sq-plus">➕</div><div class="sq-name">${T('squad.empty')}</div>`)
        + (k===0 ? `<div class="sq-main">${T('squad.main')}</div>` : (c ? `<button class="btn red small sq-x" data-x="${k}" type="button">✖</button>` : ''));
      d.addEventListener('click', e=>{ sfx.click(); if(e.target.closest('.sq-x')){ squadSet(k, null); return; } SQUAD.pick=k; squadRender(); });
      d.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); d.click(); } });
      box.appendChild(d);
    });
  } else {
    const k=SQUAD.pick, t=$('#sq-pick-title'); if(t) t.textContent=T('squad.pickTitle', k+1);
    const g=$('#sq-grid'); g.innerHTML='';
    CHARS.forEach(c=>{
      if(!isUnlocked(c)) return; const j=s.indexOf(c.id);
      const d=document.createElement('div'); d.className='sq-card'+(j===k?' cur':j>=0?' in':''); d.dataset.id=c.id; d.tabIndex=0;
      d.innerHTML=`<div class="sq-sprite">${playerSVG(c)}</div><div class="sq-name">${esc(nm(c))}</div>`+(j>=0?`<div class="sq-badge">${j===k?'✔':T('squad.inSlot', j+1)}</div>`:'');
      d.addEventListener('click', ()=>{ sfx.click(); if(j===k){ SQUAD.pick=null; squadRender(); return; } if(squadSet(k, c.id)){ SQUAD.pick=null; squadRender(); } });
      d.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); d.click(); } });
      g.appendChild(d);
    });
  }
}
(function(){
  const bk=$('#btn-sq-back'); if(bk) bk.addEventListener('click', ()=>{ sfx.click(); SQUAD.pick=null; squadRender(); });
  const cl=$('#btn-sq-close'); if(cl) cl.addEventListener('click', ()=>{ sfx.click(); squadClose(); });
  const m=$('#squad-modal'); if(m) m.addEventListener('click', e=>{ if(e.target===m) squadClose(); });
})();

/* ----- home: a small button next to "looks" in the centre row, and one in the "more" sheet ----- */
function squadHomeBtn(){
  const who=$('#home-centre .who'); if(!who) return;
  let b=$('#btn-squad');
  if(!b){
    b=document.createElement('button'); b.className='btn pink wide'; b.id='btn-squad'; b.type='button';
    b.addEventListener('click', ()=>{ sfx.click(); squadOpen(); });
    const looks=$('#btn-looks'); if(looks && looks.parentNode===who) looks.insertAdjacentElement('afterend', b); else who.appendChild(b);
  }
  b.textContent=T('squad.btn');
}
Hooks.on('home', ()=>{ squad(); if($('#home-centre .who')) squadHomeBtn(); else setTimeout(squadHomeBtn, 0); });   // the home module builds its row after this hook on the first pass
squad();
applyLang();
