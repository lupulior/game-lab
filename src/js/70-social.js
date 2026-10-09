/* ===================================================================================================
   SOCIAL & SAFETY — deep links (?ref ?code ?join ?mode), the "invite a friend" button, share text,
   automatic cloud backup + restore code, and optional Firebase anonymous sign-in (behind FB_KEY).
   Everything degrades gracefully: no server → no backup, no key → no sign-in, no share API → wa.me.
   =================================================================================================== */
const FB_KEY='';                                          // Firebase Web API key (console → project settings). Empty = no sign-in, the game runs exactly as before. See src/PARENTS.md
const SOCIAL_LINK='https://lupulior.github.io/game-lab/'; // the short link WhatsApp previews (index.html forwards the query string to game1.html)
const AUTH_KEY='footballStar.auth';
const SOCIAL_B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

I18N_ADD({
 'social.invite':['📣 הזמן חבר','📣 Invite a friend','📣 ادعُ صديقًا','📣 Пригласи друга'],
 'social.inviteText':['בואו לשחק כוכב הכדורגל ⚽ {0}','Come play Football Star ⚽ {0}','تعالوا نلعب نجم كرة القدم ⚽ {0}','Давай играть в Звезду футбола ⚽ {0}'],
 'social.shareWin':['🏆 ניצחתי {0}-{1} נגד {2} ברמה {3}! 🔥 רצף {4} · שחקו נגדי: {5}','🏆 I won {0}-{1} against {2} on {3}! 🔥 streak {4} · play me: {5}','🏆 فزت {0}-{1} على {2} في مستوى {3}! 🔥 سلسلة {4} · العبوا ضدي: {5}','🏆 Я выиграл {0}-{1} у {2} на уровне {3}! 🔥 серия {4} · сыграй со мной: {5}'],
 'social.shareDraw':['🤝 תיקו {0}-{1} נגד {2} ברמה {3}! 🔥 רצף {4} · שחקו נגדי: {5}','🤝 Draw {0}-{1} against {2} on {3}! 🔥 streak {4} · play me: {5}','🤝 تعادل {0}-{1} مع {2} في مستوى {3}! 🔥 سلسلة {4} · العبوا ضدي: {5}','🤝 Ничья {0}-{1} с {2} на уровне {3}! 🔥 серия {4} · сыграй со мной: {5}'],
 'social.shareLose':['😤 הפסדתי {0}-{1} נגד {2} ברמה {3}, בפעם הבאה אני מנצח! שחקו נגדי: {5}','😤 Lost {0}-{1} to {2} on {3}, next time I win! Play me: {5}','😤 خسرت {0}-{1} أمام {2} في مستوى {3}، المرة القادمة أفوز! العبوا ضدي: {5}','😤 Проиграл {0}-{1} {2} на уровне {3}, в следующий раз выиграю! Сыграй со мной: {5}'],
 'social.share':['📤 שתף','📤 Share','📤 شارك','📤 Поделиться'],
 'social.friend':['חבר','a friend','صديق','друга'],
 'social.joinQ':['להצטרף למשחק {0}?','Join game {0}?','الانضمام إلى اللعبة {0}؟','Присоединиться к игре {0}?'],
 'social.join':['🚀 הצטרף','🚀 Join','🚀 انضم','🚀 Войти'],
 'social.restoreLink':['🔑 יש לי קוד שחזור','🔑 I have a restore code','🔑 لدي رمز استعادة','🔑 У меня есть код восстановления'],
 'social.restoreTitle':['🔑 קוד שחזור','🔑 Restore code','🔑 رمز الاستعادة','🔑 Код восстановления'],
 'social.restoreHint':['הקוד מופיע במכשיר הישן, במסך "עוד"','The code is shown on the old device, in the "More" sheet','الرمز موجود في الجهاز القديم في شاشة "المزيد"','Код показан на старом устройстве в меню «Ещё»'],
 'social.restorePh':['ABCD-EFGH-IJ','ABCD-EFGH-IJ','ABCD-EFGH-IJ','ABCD-EFGH-IJ'],
 'social.restoreGo':['⬇️ שחזר','⬇️ Restore','⬇️ استعادة','⬇️ Восстановить'],
 'social.restoreBad':['הקוד צריך להיות 10 אותיות','The code is 10 letters','الرمز مكوّن من 10 أحرف','Код — 10 букв'],
 'social.noSave':['לא נמצא גיבוי עם הקוד הזה','No backup with that code','لم يُعثر على نسخة بهذا الرمز','Нет копии с таким кодом'],
 'social.restoreQ':['לשחזר את {0}? (רמה {1} · {2} משחקים)','Restore {0}? (level {1} · {2} matches)','استعادة {0}؟ (المستوى {1} · {2} مباريات)','Восстановить {0}? (уровень {1} · {2} матчей)'],
 'social.overwriteQ':['⚠️ זה ימחק את ההתקדמות במכשיר הזה! לשחזר את {0}? (רמה {1} · {2} משחקים)','⚠️ This replaces the progress on this device! Restore {0}? (level {1} · {2} matches)','⚠️ سيحل هذا محل التقدم على هذا الجهاز! استعادة {0}؟ (المستوى {1} · {2} مباريات)','⚠️ Это заменит прогресс на этом устройстве! Восстановить {0}? (уровень {1} · {2} матчей)'],
 'social.autoQ':['מצאנו את ההתקדמות של {0} בענן ☁️ להחזיר אותה?','We found {0}\'s progress in the cloud ☁️ bring it back?','وجدنا تقدم {0} في السحابة ☁️ نعيده؟','Мы нашли прогресс {0} в облаке ☁️ вернуть?'],
 'social.restored':['✅ ההתקדמות חזרה!','✅ Progress restored!','✅ عاد التقدم!','✅ Прогресс восстановлен!'],
 'social.codeTitle':['☁️ קוד השחזור שלי','☁️ My restore code','☁️ رمز الاستعادة الخاص بي','☁️ Мой код восстановления'],
 'social.codeHint':['עם הקוד הזה ההתקדמות חוזרת בכל מכשיר. שמרו אותו — רק לכם!','With this code your progress comes back on any device. Keep it — just for you!','بهذا الرمز يعود تقدمك على أي جهاز. احفظه — لك فقط!','С этим кодом прогресс вернётся на любом устройстве. Сохрани его — только для себя!'],
 'social.newCodeHint':['✨ זה הקוד החדש של המכשיר הזה. הקוד הישן נשאר במכשיר הישן. שמרו את החדש!','✨ This is the new code of this device. The old code stays on the old device. Keep the new one!','✨ هذا هو الرمز الجديد لهذا الجهاز. الرمز القديم يبقى على الجهاز القديم. احفظ الجديد!','✨ Это новый код этого устройства. Старый код остаётся на старом устройстве. Сохрани новый!'],
 'social.copy':['📋 העתק','📋 Copy','📋 نسخ','📋 Копировать'],
 'social.copied':['📋 הועתק!','📋 Copied!','📋 تم النسخ!','📋 Скопировано!'],
 'social.copyFail':['לא הצלחנו להעתיק — כתבו את הקוד: {0}','Could not copy — write the code down: {0}','لم ننجح في النسخ — اكتبوا الرمز: {0}','Не удалось скопировать — запиши код: {0}'],
 'social.saveFail':['⚠️ המשחק לא מצליח לשמור במכשיר הזה — שמרו את קוד השחזור (במסך "עוד")','⚠️ The game cannot save on this device — keep your restore code (in the "More" sheet)','⚠️ اللعبة لا تستطيع الحفظ على هذا الجهاز — احفظوا رمز الاستعادة (في شاشة "المزيد")','⚠️ Игра не может сохраняться на этом устройстве — запиши код восстановления (в меню «Ещё»)'],
 'social.badChars':['הקוד יכול להכיל רק אותיות, ספרות, - ו-_','A code may only contain letters, digits, - and _','يمكن أن يحتوي الكود فقط على أحرف وأرقام و- و_','Код может содержать только буквы, цифры, - и _'],
 'social.backupOk':['גיבוי אחרון: לפני {0} דק׳','Last backup: {0} min ago','آخر نسخة: قبل {0} دقيقة','Последняя копия: {0} мин назад'],
 'social.backupNone':['עדיין לא גובה (צריך אינטרנט)','Not backed up yet (needs internet)','لم يُنسخ بعد (يحتاج إنترنت)','Ещё нет копии (нужен интернет)'],
 'social.backupOff':['אין שרת — הגיבוי כבוי','No server — backup is off','لا يوجد خادم — النسخ متوقف','Нет сервера — копия выключена'],
 'social.back':['חזרה','Back','رجوع','Назад'],
 'social.ok':['אישור','OK','موافق','ОК'],
});
STATIC_ADD({'#btn-invite':'social.invite', '#btn-social-restore':'social.restoreLink', '#social-input-title':'social.restoreTitle', '#social-input-hint':'social.restoreHint',
  '#btn-social-input-ok':'social.restoreGo', '#btn-social-input-cancel':'social.back', '#social-code-title':'social.codeTitle', '#social-code-hint':'social.codeHint',
  '#btn-social-copy':'social.copy', '#btn-social-code-close':'social.back'});

/* ----- the stable per-device id: 10 base32 chars, created once, mirrored into IndexedDB so an evicted localStorage can find its backup ----- */
function genSaveId(){ const a=new Uint8Array(10); try{ crypto.getRandomValues(a); }catch(e){ for(let i=0;i<10;i++) a[i]=Math.random()*256|0; } return Array.from(a, b=>SOCIAL_B32[b%32]).join(''); }
/* noIdb: the first run after an evicted localStorage must NOT overwrite the IndexedDB mirror before socialAutoRestoreCheck has read it (review #70) */
function ensureSaveId(noIdb){ if(typeof prog.saveId!=='string' || !/^[A-Z2-7]{10}$/.test(prog.saveId)){ prog.saveId=genSaveId(); saveProg(); if(!noIdb) idbSet('saveId', prog.saveId); } return prog.saveId; }
function fmtRestoreCode(id){ id=String(id||''); return id.slice(0,4)+'-'+id.slice(4,8)+'-'+id.slice(8); }
function normRestoreCode(s){ return String(s||'').toUpperCase().replace(/[^A-Z2-7]/g,'').slice(0,10); }
/* the server key of a save: the first 24 hex chars of SHA-256(code) — the code itself never reaches the server, a listing of saves/ yields nothing usable (review #68) */
const socialKeyCache={};
async function saveKeyFor(code){ code=normRestoreCode(code); if(socialKeyCache[code]) return socialKeyCache[code]; const h=String(await sha256(code)).slice(0,24); if(/^[0-9a-f]{24}$/.test(h)) socialKeyCache[code]=h; return h; }
/* the referral code: 4 chars hashed from the save id (so sharing it does not leak the restore code) */
function hash32(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
function myRefCode(){ const h=hash32('ref:'+ensureSaveId()); let out=''; for(let i=0;i<4;i++) out+=SOCIAL_B32[(h>>>(i*5))&31]; return out; }
function myRefLink(){ return SOCIAL_LINK+'?ref='+myRefCode(); }

/* ----- tiny IndexedDB key/value mirror (never throws, never blocks) ----- */
function idbOpen(){ return new Promise((res,rej)=>{ try{ const r=indexedDB.open('footballStar',1); r.onupgradeneeded=()=>{ try{ r.result.createObjectStore('kv'); }catch(e){} }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); r.onblocked=()=>rej(new Error('blocked')); }catch(e){ rej(e); } }); }
async function idbSet(k, v){ try{ const db=await idbOpen(); const tx=db.transaction('kv','readwrite'); tx.objectStore('kv').put(v,k); await new Promise(r=>{ tx.oncomplete=tx.onerror=tx.onabort=r; }); db.close(); return true; }catch(e){ return false; } }
async function idbGet(k){ try{ const db=await idbOpen(); const tx=db.transaction('kv','readonly'); const rq=tx.objectStore('kv').get(k); const v=await new Promise(r=>{ rq.onsuccess=()=>r(rq.result); rq.onerror=()=>r(undefined); }); db.close(); return v; }catch(e){ return undefined; } }

/* ----- sharing: the system share sheet when there is one, WhatsApp otherwise ----- */
function shareText(text){
  if(navigator.share){ try{ const p=navigator.share({text}); if(p && p.catch) p.catch(()=>{}); return 'share'; }catch(e){} }
  try{ window.open('https://wa.me/?text='+encodeURIComponent(text), '_blank', 'noopener'); }catch(e){}
  return 'wa';
}
function inviteText(){ return T('social.inviteText', myRefLink()); }
function inviteShare(){ try{ sfx.click(); }catch(e){} prog.invites=(prog.invites|0)+1; saveProg(); return shareText(inviteText()); }
/* the result text for the end card: info = the 'matchEnd' hook object (or the last one) */
let socialLastInfo=null;
function buildShareText(info){
  info=info||socialLastInfo||{outcome:'win', score:{me:0,op:0}, level:1, opp:null};
  const s=info.score||{me:0,op:0}, opp=info.opp ? CHARS.find(c=>c.id===info.opp) : null, oppName=opp ? nm(opp) : T('social.friend');
  const lvl=T('lvl.'+Math.max(0, Math.min(5, info.level|0))), key = info.outcome==='win' ? 'social.shareWin' : info.outcome==='draw' ? 'social.shareDraw' : 'social.shareLose';
  return T(key, s.me|0, s.op|0, oppName, lvl, prog.streak|0, myRefLink());
}
function shareResult(info){ try{ sfx.click(); }catch(e){} prog.shares=(prog.shares|0)+1; saveProg(); return shareText(buildShareText(info)); }
Hooks.on('matchEnd', info=>{
  socialLastInfo=info;
  if($('#btn-ec-share')) return;                                                   // the end-card module has its own 📤 button that calls shareResult(info)
  if(!$('#btn-end-share') && $('#end-btns')){ const b=document.createElement('button'); b.className='btn purple'; b.id='btn-end-share'; b.textContent=T('social.share'); b.addEventListener('click', ()=>shareResult(socialLastInfo)); $('#end-btns').appendChild(document.createTextNode(' ')); $('#end-btns').appendChild(b); }
  else if($('#btn-end-share')) $('#btn-end-share').textContent=T('social.share');
});

/* ----- deep links: ?ref=XXXX ?code=ABC ?join=ABCD ?mode=daily — parsed at load, the URL is cleaned only once the action is consumed, the actions wait for a name ----- */
/* one validator for channel codes on both sides (admin panel + ?code= links): Hebrew allowed, the Firebase-illegal . # $ [ ] / and spaces refused (review #76) */
function socialValidCodeKey(c){ return typeof validCodeKey==='function' ? !!validCodeKey(c) : /^[^.#$\[\]\/\s]{2,40}$/.test(String(c||'')); }
function parseDeepLinks(search){
  const o={}; let p; try{ p=new URLSearchParams(search||''); }catch(e){ return o; }
  const ref=(p.get('ref')||'').trim().toUpperCase(); if(/^[A-Z0-9]{3,8}$/.test(ref)) o.ref=ref;
  const code=(p.get('code')||'').trim().toUpperCase().replace(/\s+/g,''); if(socialValidCodeKey(code)) o.code=code;
  const join=(p.get('join')||'').trim().toUpperCase(); if(/^[A-Z0-9]{4}$/.test(join)) o.join=join;
  const mode=(p.get('mode')||'').trim().toLowerCase(); if(['daily','boss','tournament'].includes(mode)) o.mode=mode;
  return o;
}
let socialPending=null, socialPendingBusy=false;
function noteDeepLinks(o){
  if(o.ref && !prog.ref && o.ref!==myRefCode()){ prog.ref=o.ref; prog.refT=now(); saveProg(); }   // the newcomer remembers who invited him (payouts: wave 2)
  socialPending = (o.code || o.join || o.mode) ? {code:o.code, join:o.join, mode:o.mode} : null;
  if(!socialPending) cleanUrl();                                                            // nothing to wait for: the URL is cleaned now; otherwise runDeepLinks cleans it (review #79)
}
async function runDeepLinks(o){
  o=o||socialPending; socialPending=null; cleanUrl(); if(!o || socialPendingBusy) return false; socialPendingBusy=true;
  try{
    if(o.join){
      const ok=await ask(T('social.joinQ', o.join), T('social.join'));
      if(ok){ if(typeof mpTeardown==='function' && !(mp && mp.connected)) mpTeardown(); if(typeof mpLobby==='function') mpLobby(); if(typeof mpStatus==='function') mpStatus(''); showScreen('mp'); const inp=$('#mp-input'); if(inp) inp.value=o.join; mpJoin(o.join); return true; }
    }
    if(o.code){ const inp=$('#code-input'); if(inp){ inp.value=o.code; inp.placeholder=T('codes.ph'); $('#codes-modal').classList.add('show'); return true; } }
    if(o.mode==='daily'){ const b=$('#btn-daily'); if(b){ b.click(); return true; } }
    if(o.mode==='boss' || o.mode==='tournament'){ if(typeof openModeFromLink==='function') openModeFromLink(o.mode); }   // a later module may pick these up
  }catch(e){ console.error('deep link', e); }
  finally{ socialPendingBusy=false; }
  return false;
}
function socialPendingTick(){ if(socialPending && normName(settings.name) && !$('#name-modal').classList.contains('show')) setTimeout(()=>runDeepLinks(), 350); }
Hooks.on('screen', id=>{ if(id==='home') socialPendingTick(); });
{ const _submitName=submitName; submitName=function(){ _submitName(); if(normName(settings.name)){ socialPendingTick(); cloudBackup(); } }; }
function cleanUrl(){ try{ if(location.search) history.replaceState(null, '', location.pathname+location.hash); }catch(e){} }
/* the admin panel: refuse a code the server would reject (or silently nest) before the PUT, with a message about the characters, not the server (review #76) */
if(typeof createCode==='function'){ const _cc=createCode; createCode=async function(){ const code=(($('#adm-code')||{}).value||'').trim().toUpperCase().replace(/\s+/g,''); if(code && !socialValidCodeKey(code)){ toast(T('social.badChars'),'warn'); return; } return _cc.apply(this, arguments); }; }

/* ----- optional Firebase anonymous sign-in (only with FB_KEY): the phone gets a random uid, every fbReq carries ?auth=<idToken> ----- */
let authData=null; try{ const a=JSON.parse(localStorage.getItem(AUTH_KEY)); if(a && typeof a==='object' && a.idToken) authData=a; }catch(e){}
function socialAuthEnabled(){ return !!FB_KEY; }
function socialSetAuth(a){ authData = (a && a.idToken) ? a : null; try{ if(authData) localStorage.setItem(AUTH_KEY, JSON.stringify(authData)); else localStorage.removeItem(AUTH_KEY); }catch(e){} }
function authToken(){ return (socialAuthEnabled() && authData && authData.idToken) || ''; }
function myUid(){ return (socialAuthEnabled() && authData && authData.localId) || null; }
async function authSignUp(){
  if(!socialAuthEnabled()) return false;
  try{ const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(FB_KEY), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({returnSecureToken:true})});
    if(!r.ok) return false; const j=await r.json(); if(!j || !j.idToken) return false;
    socialSetAuth({idToken:j.idToken, refreshToken:j.refreshToken, localId:j.localId, exp:Date.now()+Math.max(600,(+j.expiresIn||3600))*1000}); return true; }catch(e){ return false; }
}
async function authRefresh(){
  if(!socialAuthEnabled()) return false;
  if(!authData || !authData.refreshToken) return authSignUp();
  try{ const r=await fetch('https://securetoken.googleapis.com/v1/token?key='+encodeURIComponent(FB_KEY), {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(authData.refreshToken)});
    if(!r.ok){ if(r.status===400){ socialSetAuth(null); return authSignUp(); } return false; }   // a revoked/invalid refresh token: start a fresh anonymous identity
    const j=await r.json(); if(!j || !j.id_token) return false;
    socialSetAuth({idToken:j.id_token, refreshToken:j.refresh_token||authData.refreshToken, localId:j.user_id||authData.localId, exp:Date.now()+Math.max(600,(+j.expires_in||3600))*1000}); return true; }catch(e){ return false; }
}
async function authEnsure(){ if(!socialAuthEnabled()) return false; if(authData && authData.idToken && authData.exp && Date.now()<authData.exp-5*60000) return true; return authRefresh(); }
/* the URL fbReq will hit for a path (exposed so it can be tested); a path may carry its own query: 'users?orderBy="str"' */
function fbUrlFor(path){
  let p=String(path||''), q=''; const i=p.indexOf('?'); if(i>=0){ q=p.slice(i+1); p=p.slice(0,i); }
  const tok=authToken();
  return FB_URL.replace(/\/$/,'')+'/'+p+'.json'+(q ? '?'+q : '')+(tok ? (q ? '&' : '?')+'auth='+encodeURIComponent(tok) : '');
}
{ const _fbReq=fbReq;
  /* opts: {keepalive:true} lets a PUT outlive the page (the backup on pagehide, review #77); with options the request is made here, so they reach the fetch even without a token */
  fbReq=async function(path, method, body, opts){
    if(!fbOn()) return null;
    if(!opts && !authToken() && String(path||'').indexOf('?')<0) return _fbReq(path, method, body);   // no sign-in, no options: exactly the original request
    try{ const init={method, headers:{'Content-Type':'application/json'}, body: body!==undefined ? JSON.stringify(body) : undefined}; if(opts && opts.keepalive) init.keepalive=true;
      const r=await fetch(fbUrlFor(path), init); if(!r.ok) return undefined; return await r.json(); }catch(e){ return undefined; }
  };
}

/* ----- automatic cloud backup: saves/<sha256(code)[0..24]> = {d: JSON, t, v, uid?} — once per 60 s at most, only when something changed, never blocking ----- */
let cloudState={last:0, hash:'', timer:0, okAt:0, calls:0};
function cloudPayload(){
  let cup=null; try{ cup=localStorage.getItem(CUP_KEY); }catch(e){}
  const p=Object.assign({}, prog); delete p.friends;                                      // other kids' names stay on the device (review #68)
  const d={prog:p, stats:loadStats(), cup:cup||null, name:settings.name||''};             // of the settings only the name travels
  if(socialAuthEnabled() && authData && authData.refreshToken) d.auth={refreshToken:authData.refreshToken, localId:authData.localId};   // a restore keeps the identity
  return d;
}
/* force: send even when nothing changed; flush: skip the 60-s throttle but keep the change check (tab hidden / page closing, review #77) */
function cloudBackup(force, flush){
  if(!fbOn()) return false;
  const id=ensureSaveId(); let d; try{ d=JSON.stringify(cloudPayload()); }catch(e){ return false; }
  const h=String(d.length)+':'+hash32(d);
  if(!force && h===cloudState.hash) return false;
  const t=performance.now(), wait=60000-(t-cloudState.last);
  if(!force && !flush && cloudState.last && wait>0){ if(!cloudState.timer) cloudState.timer=setTimeout(()=>{ cloudState.timer=0; cloudBackup(); }, wait+50); return false; }
  if(cloudState.timer){ clearTimeout(cloudState.timer); cloudState.timer=0; }
  cloudState.last=t; cloudState.hash=h; cloudState.calls++;
  const body={d, t:{'.sv':'timestamp'}, v:GAME_VERSION}; const uid=myUid(); if(uid) body.uid=uid;
  const p=saveKeyFor(id).then(k=>fbReq('saves/'+k, 'PUT', body, flush ? {keepalive:true} : undefined));
  p.then(r=>{ if(r===undefined) cloudState.hash=''; else cloudState.okAt=now(); }).catch(()=>{ cloudState.hash=''; });
  return true;
}
['matchEnd','purchase','coins','gems','keys'].forEach(h=>Hooks.on(h, ()=>{ setTimeout(()=>cloudBackup(), 50); }));
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') cloudBackup(false, true); });
window.addEventListener('pagehide', ()=>cloudBackup(false, true));

/* ----- restore: write a save object into localStorage; the caller reloads ----- */
function parseSave(o){
  if(!o || typeof o!=='object') return null; let d=o.d!==undefined ? o.d : o;
  if(typeof d==='string'){ try{ d=JSON.parse(d); }catch(e){ return null; } }
  if(!d || typeof d!=='object' || !d.prog || typeof d.prog!=='object') return null; return d;
}
/* keepId: the automatic restore of this very device keeps its code; a typed code gives THIS device a fresh id + code, so two devices never share one cloud slot (review #68d/#73) */
function applyRestore(o, keepId){
  const d=parseSave(o); if(!d) return false;
  const p=Object.assign({friends:{}}, d.prog);                                              // the backup carries no friends list; the core indexes prog.friends directly
  if(!keepId){ p.saveId=genSaveId(); p.social=Object.assign({}, p.social||{}, {newCode:true}); }   // the new code is shown once after the reload
  try{
    localStorage.setItem(PROG_KEY, JSON.stringify(p));
    if(d.stats && typeof d.stats==='object') localStorage.setItem(STATS_KEY, JSON.stringify({w:d.stats.w|0, d:d.stats.d|0, l:d.stats.l|0, c:d.stats.c|0}));
    if(d.cup) localStorage.setItem(CUP_KEY, typeof d.cup==='string' ? d.cup : JSON.stringify(d.cup)); else localStorage.removeItem(CUP_KEY);
    const n=normName(d.name); if(n){ settings.name=n; saveSettings(); }
    if(socialAuthEnabled() && d.auth && d.auth.refreshToken) socialSetAuth({idToken:'', refreshToken:d.auth.refreshToken, localId:d.auth.localId, exp:0});
  }catch(e){ return false; }
  if(p.saveId) idbSet('saveId', p.saveId);
  return true;
}
function saveSummary(d){ const p=d.prog||{}; return [normName(d.name)||'?', levelOf(p.xpTotal|0)+1, p.matches|0]; }
/* the kid typed a restore code: fetch, confirm, overwrite, reload */
async function restoreFromCode(raw){
  const code=normRestoreCode(raw);
  if(code.length!==10){ toast(T('social.restoreBad'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
  if(!fbOn()){ toast(T('social.backupOff'),'warn'); return false; }
  const r=await fbReq('saves/'+(await saveKeyFor(code)),'GET');
  if(r===undefined){ toast(T('fb.down'),'warn'); return false; }
  const d=parseSave(r); if(!d){ toast(T('social.noSave'),'warn'); try{ sfx.lose(); }catch(e){} return false; }
  const sum=saveSummary(d), local=(prog.matches|0)>0 || (prog.coins|0)>0;
  if(!(await ask(T(local ? 'social.overwriteQ' : 'social.restoreQ', sum[0], sum[1], sum[2]), T('social.restoreGo')))) return false;
  if(!applyRestore(r)) return false;
  toast(T('social.restored'),'ach'); try{ sfx.win(); }catch(e){}
  setTimeout(()=>{ try{ location.reload(); }catch(e){} }, 600); return true;
}
/* an in-game text prompt (never the browser's prompt()) → Promise<string|null> */
function askText(titleKey, hintKey, placeholder, value){
  return new Promise(res=>{
    const m=$('#social-input-modal'), inp=$('#social-input');
    $('#social-input-title').textContent=T(titleKey||'social.restoreTitle'); $('#social-input-hint').textContent=T(hintKey||'social.restoreHint');
    inp.placeholder=placeholder||T('social.restorePh'); inp.value=value||'';
    const done=v=>{ m.classList.remove('show'); $('#btn-social-input-ok').onclick=$('#btn-social-input-cancel').onclick=null; inp.onkeydown=null; res(v); };
    $('#btn-social-input-ok').onclick=()=>{ try{ sfx.click(); }catch(e){} done(inp.value); };
    $('#btn-social-input-cancel').onclick=()=>{ try{ sfx.click(); }catch(e){} done(null); };
    inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') done(inp.value); if(e.key==='Escape') done(null); };
    m.classList.add('show'); setTimeout(()=>{ try{ inp.focus(); }catch(e){} }, 60);
  });
}
async function restoreFlow(){
  const wasName=$('#name-modal').classList.contains('show'); if(wasName) $('#name-modal').classList.remove('show');
  const v=await askText('social.restoreTitle','social.restoreHint');
  let ok=false; if(v!==null) ok=await restoreFromCode(v);
  if(!ok && wasName && !normName(settings.name)) askNameIfMissing();
  return ok;
}
/* automatic restore: localStorage was wiped (no saveId yet) but IndexedDB still remembers the id → offer the cloud copy on the first home screen */
/* the IndexedDB mirror is read BEFORE it is written (ensureSaveId(true) on a fresh run skips the write) and mirrored only once the old id has been looked up;
   when the server could not be reached the old id is kept in prog.social.oldId so a later launch can ask again (review #70) */
let socialAutoSave=null;
async function socialAutoRestoreCheck(freshProg){
  const mirror=()=>{ if(prog.social) delete prog.social.oldId; idbSet('saveId', prog.saveId); };
  let old=null;
  if(freshProg) old=await idbGet('saveId'); else if(prog.social && prog.social.oldId) old=prog.social.oldId;
  if(typeof old!=='string' || old.length!==10 || old===prog.saveId){ if(freshProg) mirror(); return; }
  if(!fbOn()){ if(freshProg) mirror(); return; }
  const r=await fbReq('saves/'+(await saveKeyFor(old)),'GET');
  if(r===undefined){ prog.social=prog.social||{}; prog.social.oldId=old; saveProg(); return; }   // server down: the old id survives for the next launch, the mirror is left alone
  const d=parseSave(r); if(!d || (d.prog.matches|0)<1 && !(d.prog.coins|0)){ mirror(); return; }
  socialAutoSave=r; socialAutoRestoreOffer();
}
async function socialAutoRestoreOffer(){
  if(!socialAutoSave || !$('#home').classList.contains('active')) return;
  const r=socialAutoSave; socialAutoSave=null; const sum=saveSummary(parseSave(r));
  const wasName=$('#name-modal').classList.contains('show'); if(wasName) $('#name-modal').classList.remove('show');
  if(await ask(T('social.autoQ', sum[0]), T('social.restoreGo'))){ if(applyRestore(r, true)){ toast(T('social.restored'),'ach'); setTimeout(()=>{ try{ location.reload(); }catch(e){} }, 600); return; } }
  if(prog.social) delete prog.social.oldId; saveProg(); idbSet('saveId', prog.saveId);          // declined: this device keeps its new id from now on
  if(wasName && !normName(settings.name)) askNameIfMissing();
}
Hooks.on('screen', id=>{ if(id==='home' && socialAutoSave) setTimeout(socialAutoRestoreOffer, 300); });

/* ----- the restore-code modal (the home "more" sheet links it): code + copy. Copy only, no share sheet: the code is a key, not something to post in a group (review #68) ----- */
function openRestoreCode(fresh){
  const code=fmtRestoreCode(ensureSaveId()); $('#social-code-text').textContent=code;
  $('#social-code-hint').textContent=T(fresh ? 'social.newCodeHint' : 'social.codeHint');
  const st=$('#social-code-status');
  st.textContent = !fbOn() ? T('social.backupOff') : cloudState.okAt ? T('social.backupOk', Math.max(0, Math.round((now()-cloudState.okAt)/60000))) : T('social.backupNone');
  $('#social-code-modal').classList.add('show'); cloudBackup();
}
/* '📋 Copied!' only when the clipboard really took it; otherwise the code is shown to write down (review #78) */
async function copyRestoreCode(){
  const code=fmtRestoreCode(ensureSaveId()); let ok=false;
  try{ if(navigator.clipboard && navigator.clipboard.writeText) ok=await navigator.clipboard.writeText(code).then(()=>true, ()=>false); }catch(e){}
  if(!ok){ try{ const ta=document.createElement('textarea'); ta.value=code; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); ok=!!document.execCommand('copy'); ta.remove(); }catch(e){} }
  toast(ok ? T('social.copied') : T('social.copyFail', code), ok ? 'ach' : 'warn'); return ok;
}
/* after a typed-code restore the reload lands here: show the device's NEW code once (review #68d) */
Hooks.on('screen', id=>{ if(id==='home' && prog.social && prog.social.newCode && !socialAutoSave){ delete prog.social.newCode; saveProg(); setTimeout(()=>openRestoreCode(true), 400); } });

/* ----- storage that cannot save (private mode, blocked site data): say it once and push a backup; the restore code in the "more" sheet is the way out (review #67) ----- */
let socialSaveWarned=false;
function socialSaveFailed(){ if(socialSaveWarned) return; socialSaveWarned=true; try{ toast(T('social.saveFail'),'warn'); }catch(e){} try{ cloudBackup(true); }catch(e){} }
try{ const _sp=saveProg; saveProg=function(){ try{ localStorage.setItem(PROG_KEY, JSON.stringify(prog)); }catch(e){ socialSaveFailed(); } }; void _sp; }catch(e){}   // a const in the core today: the probe below covers it
function socialStorageProbe(){ try{ localStorage.setItem('fs.probe','1'); localStorage.removeItem('fs.probe'); return true; }catch(e){ socialSaveFailed(); return false; } }
Hooks.on('matchEnd', ()=>{ setTimeout(socialStorageProbe, 30); });

/* ----- load-time wiring ----- */
const socialFresh = typeof prog.saveId!=='string';          // no save id yet = first run on this browser (or an evicted localStorage)
ensureSaveId(socialFresh);                                  // a fresh run leaves the IndexedDB mirror alone until socialAutoRestoreCheck has read it
noteDeepLinks(parseDeepLinks(location.search));             // the URL keeps its query until the action is consumed (a reload before the name is typed re-asks)
(function socialBuildUI(){
  const row=$('.home-foot .row:last-child');
  if(row && !$('#btn-invite')){ const b=document.createElement('button'); b.className='btn purple small'; b.id='btn-invite'; b.textContent=T('social.invite'); b.addEventListener('click', ()=>inviteShare()); row.insertBefore(b, $('#btn-ceo')||row.firstChild); }
  const np=$('#name-modal .panel');
  if(np && !$('#btn-social-restore')){ const a=document.createElement('button'); a.type='button'; a.className='social-link'; a.id='btn-social-restore'; a.textContent=T('social.restoreLink'); a.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} restoreFlow(); }); np.appendChild(a); }
  $('#btn-social-copy').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} copyRestoreCode(); });
  $('#btn-social-code-close').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} $('#social-code-modal').classList.remove('show'); });
  $('#social-input').addEventListener('input', e=>{ const v=normRestoreCode(e.target.value); e.target.value = v.length>8 ? fmtRestoreCode(v) : v.length>4 ? v.slice(0,4)+'-'+v.slice(4) : v; });
})();
if(socialAuthEnabled()){ authEnsure().then(ok=>{ if(ok){ try{ fbHeartbeat(true); }catch(e){} cloudBackup(true); } }); setInterval(authRefresh, 50*60*1000); }
let socialAutoCheck=null;                                   // the load-time check's promise (tests wait for it before touching the IndexedDB mirror)
setTimeout(()=>{ socialAutoCheck=socialAutoRestoreCheck(socialFresh); }, 900);
setTimeout(()=>cloudBackup(), 4000);
setTimeout(socialStorageProbe, 1500);
applyLang();
