/* social & safety: deep links, invite/share text, cloud backup throttle, restore, auth wrapper */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length;
  const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  // the harness runs on virtual time: while the page waits for a real IndexedDB answer the clock jumps to the next timer (the 40-s timeout). A 1-ms keep-alive
  // interval makes it advance one ms per idle turn instead, and idbW polls the IDB promise in 1-ms ticks rather than awaiting it bare.
  const keepAlive=setInterval(()=>{}, 1);
  const idbW=async p=>{ let v, done=false; p.then(x=>{ v=x; done=true; }, ()=>{ done=true; }); for(let i=0;i<20000 && !done;i++) await tick(1); return v; };
  const lastToast=()=>{ const t=document.querySelectorAll('#toast .tst'); return t.length ? t[t.length-1].textContent : ''; };
  // --- save id + referral code
  TASSERT('saveId: 10 base32 chars', typeof prog.saveId==='string' && /^[A-Z2-7]{10}$/.test(prog.saveId));
  const id0=prog.saveId, ref1=myRefCode(), ref2=myRefCode();
  TASSERT('myRefCode stable, 4 chars', ref1===ref2 && /^[A-Z2-7]{4}$/.test(ref1) && prog.saveId===id0);
  TASSERT('restore code formatted ABCD-EFGH-IJ', /^[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{2}$/.test(fmtRestoreCode(prog.saveId)) && normRestoreCode(fmtRestoreCode(prog.saveId).toLowerCase())===prog.saveId);
  // #68: the server key is a 24-hex SHA-256 prefix of the code, never the code itself
  const key0=await saveKeyFor(prog.saveId);
  TASSERT('saveKeyFor: 24 hex chars = sha256(code).slice(0,24), dashes ignored', /^[0-9a-f]{24}$/.test(key0) && key0===(await sha256(prog.saveId)).slice(0,24) && (await saveKeyFor(fmtRestoreCode(prog.saveId).toLowerCase()))===key0 && key0.indexOf(prog.saveId)<0);
  // --- deep-link parsing
  let o=parseDeepLinks('?ref=ab12&code=goal 77&join=abcd&mode=Daily&x=1');
  TASSERT('parseDeepLinks: ref/code/join/mode', o.ref==='AB12' && o.code==='GOAL77' && o.join==='ABCD' && o.mode==='daily');
  o=parseDeepLinks('?join=abc&mode=nope&ref=!!!&code=');
  TASSERT('parseDeepLinks: rejects bad values', !o.ref && !o.code && !o.join && !o.mode);
  TASSERT('parseDeepLinks: empty search', Object.keys(parseDeepLinks('')).length===0);
  // #76: one validator — Hebrew codes pass, Firebase-illegal characters fail (on links and in the admin panel)
  TASSERT('parseDeepLinks: Hebrew code accepted, . # $ [ ] / refused', parseDeepLinks('?code=שבת').code==='שבת' && !parseDeepLinks('?code=HAPPY.DAY').code && !parseDeepLinks('?code=A/B').code && !parseDeepLinks('?code=A#1').code && !parseDeepLinks('?code=A').code);
  TASSERT('socialValidCodeKey', socialValidCodeKey('GOAL77') && socialValidCodeKey('שבת') && !socialValidCodeKey('HAPPY.DAY') && !socialValidCodeKey('A B') && !socialValidCodeKey('x'.repeat(41)));
  { const _fb=fbReq; let put=null; fbReq=async function(p,m,b){ if(p.startsWith('codes/')) put=[p,m,b]; return null; };
    const admIn=$('#adm-code'); if(admIn){ admIn.value='HAPPY.DAY'; $('#adm-code-xp').value='5'; $('#adm-code-uses').value='3'; await createCode(); }
    TASSERT('createCode: a code with "." is refused with the characters message, nothing is PUT', !!admIn && put===null && lastToast().includes('אותיות') && admIn.value==='HAPPY.DAY');
    admIn.value=''; fbReq=_fb; }
  delete prog.ref; noteDeepLinks({ref:'ZZ99'}); const refA=prog.ref; noteDeepLinks({ref:'QQ11'});
  TASSERT('prog.ref stored once (first referrer wins)', refA==='ZZ99' && prog.ref==='ZZ99');
  delete prog.ref; noteDeepLinks({ref:myRefCode()}); TASSERT('own ref code ignored', !prog.ref);
  // #79: the query survives in the URL until the action is consumed (a reload before the name is typed re-asks); runDeepLinks cleans it
  { let urlOk=false; try{ history.replaceState(null, '', location.pathname+'?join=QQQQ'); urlOk=location.search==='?join=QQQQ'; }catch(e){}
    if(urlOk){ noteDeepLinks(parseDeepLinks(location.search));
      TASSERT('pending ?join keeps the query in the URL', socialPending && socialPending.join==='QQQQ' && location.search==='?join=QQQQ');
      socialPending=null; const _n=socialPendingBusy; socialPendingBusy=true; await runDeepLinks({}); socialPendingBusy=_n;
      TASSERT('runDeepLinks cleans the URL once the action is consumed', location.search==='');
      try{ history.replaceState(null, '', location.pathname+'?ref=AB12'); }catch(e){} noteDeepLinks(parseDeepLinks(location.search));
      TASSERT('?ref alone (nothing pending) is cleaned at once', location.search==='' && socialPending===null);
    } else TLOG('url query tests skipped (replaceState refused on this origin)', location.protocol); }
  delete prog.ref;
  // --- invite button + share text (no share sheet here: wa.me is opened)
  const inv=$('#btn-invite');
  TASSERT('invite button in the home foot row next to #btn-ceo', !!inv && inv.parentElement===$('#btn-ceo').parentElement && inv.textContent.includes('הזמן'));
  try{ Object.defineProperty(navigator,'share',{value:undefined, configurable:true}); }catch(e){}
  let opened=null; const _open=window.open; window.open=(u)=>{ opened=u; return null; };
  inv.click();
  TASSERT('invite opens wa.me with the Hebrew text + ref link', typeof opened==='string' && opened.startsWith('https://wa.me/?text=') && decodeURIComponent(opened.slice(20)).includes('בואו לשחק כוכב הכדורגל ⚽ https://lupulior.github.io/game-lab/?ref='+myRefCode()) && (prog.invites|0)===1);
  prog.streak=5;
  let txt=buildShareText({outcome:'win', score:{me:3,op:1}, level:2, opp:'messi'});
  TASSERT('share text: win 3-1, opponent, level, streak, link', txt.startsWith('🏆') && txt.includes('3-1') && txt.includes(nm(CHARS[1])) && txt.includes(T('lvl.2')) && txt.includes('רצף 5') && txt.endsWith('?ref='+myRefCode()));
  txt=buildShareText({outcome:'lose', score:{me:0,op:2}, level:0, opp:'mbappe'});
  TASSERT('share text: loss variant', txt.startsWith('😤') && txt.includes('0-2') && txt.includes(nm(CHARS[0])) && !txt.includes('רצף'));
  TASSERT('share text: draw variant', buildShareText({outcome:'draw', score:{me:1,op:1}, level:1, opp:null}).startsWith('🤝'));
  opened=null; const sh0=prog.shares|0; shareResult({outcome:'win', score:{me:2,op:0}, level:1, opp:'salah'});
  TASSERT('shareResult counts prog.shares and opens wa.me', (prog.shares|0)===sh0+1 && opened && decodeURIComponent(opened).includes('2-0'));
  window.open=_open;
  // --- cloud backup: throttled, only on change, through fbReq, under the hashed key
  const _fb=fbReq; let puts=[]; fbReq=async function(p,m,b,opts){ if(p.startsWith('saves/')) puts.push([p,m,b,opts]); return null; };
  prog.friends=prog.friends||{}; prog.friends['דני']={t:1};
  cloudState.last=0; cloudState.hash=''; if(cloudState.timer){ clearTimeout(cloudState.timer); cloudState.timer=0; }
  const r1=cloudBackup(), r2=cloudBackup();
  prog.coins=(prog.coins|0)+1; const r3=cloudBackup(); await tick(60); const n3=puts.length;
  TASSERT('cloudBackup: first call PUTs saves/<sha256(code)[0..24]>, not saves/<code>', r1===true && puts.length>=1 && puts[0][0]==='saves/'+key0 && puts[0][0]!=='saves/'+prog.saveId && puts[0][1]==='PUT');
  TASSERT('cloudBackup: payload {d:JSON{prog,stats,cup,name}, t:.sv, v}', typeof puts[0][2].d==='string' && JSON.parse(puts[0][2].d).prog.saveId===prog.saveId && 'stats' in JSON.parse(puts[0][2].d) && puts[0][2].t['.sv']==='timestamp' && puts[0][2].v===GAME_VERSION);
  TASSERT('cloudBackup: no friends list and only the name of the settings in the payload (#68)', !('friends' in JSON.parse(puts[0][2].d).prog) && prog.friends['דני'] && JSON.parse(puts[0][2].d).name===(settings.name||'') && !('settings' in JSON.parse(puts[0][2].d)));
  TASSERT('cloudBackup: nothing changed → no call', r2===false && n3===1);
  TASSERT('cloudBackup: changed within 60 s → throttled (timer pending)', r3===false && n3===1 && cloudState.timer!==0);
  const r4=cloudBackup(true); await tick(40); TASSERT('cloudBackup(force) sends now', r4===true && puts.length===2 && cloudState.timer===0 && !(puts[1][3]&&puts[1][3].keepalive));
  // #77: flush (tab hidden / page closing) skips the throttle but not the change check, and the PUT is keepalive
  const r5=cloudBackup(false, true); prog.coins=(prog.coins|0)+1; const r6=cloudBackup(false, true); await tick(40);
  TASSERT('cloudBackup(flush): unchanged → nothing; changed within 60 s → sent at once with keepalive', r5===false && r6===true && puts.length===3 && puts[2][3] && puts[2][3].keepalive===true && cloudState.timer===0);
  delete prog.friends['דני']; fbReq=_fb;
  // the module's fbReq passes keepalive to fetch even without a sign-in token
  { const _fetch=window.fetch; let init=null; window.fetch=async(u,i)=>{ init=i; return {ok:true, json:async()=>null}; };
    await fbReq('saves/abc','PUT',{x:1},{keepalive:true}); const k1=!!(init&&init.keepalive===true); init=null; await fbReq('saves/abc','PUT',{x:1}); const k2=!(init&&init.keepalive);
    window.fetch=_fetch; TASSERT('fbReq: {keepalive:true} reaches fetch; absent by default', k1 && k2); }
  // --- restore writes localStorage from a save object; a typed-code restore gives this device a FRESH id (#68d/#73)
  const fake={d:JSON.stringify({prog:Object.assign({}, prog, {coins:4321, saveId:'ABCDEFGHIJ'}), stats:{w:7,d:1,l:2,c:3}, cup:'{"rounds":[1]}', name:'דני'}), t:1, v:'x'};
  const okR=applyRestore(fake);
  let lsP=null, lsS=null, lsC=null; try{ lsP=JSON.parse(localStorage.getItem(PROG_KEY)); lsS=JSON.parse(localStorage.getItem(STATS_KEY)); lsC=localStorage.getItem(CUP_KEY); }catch(e){}
  TASSERT('applyRestore: prog/stats/cup/name written', okR===true && lsP && lsP.coins===4321 && lsS && lsS.w===7 && lsC==='{"rounds":[1]}' && settings.name==='דני');
  TASSERT('applyRestore: fresh 10-char saveId (not the typed code), newCode flag, friends object present', lsP && /^[A-Z2-7]{10}$/.test(lsP.saveId) && lsP.saveId!=='ABCDEFGHIJ' && lsP.social && lsP.social.newCode===true && lsP.friends && typeof lsP.friends==='object');
  TASSERT('applyRestore(keepId): the automatic restore keeps the code', applyRestore(fake, true)===true && JSON.parse(localStorage.getItem(PROG_KEY)).saveId==='ABCDEFGHIJ');
  TASSERT('applyRestore: rejects junk', applyRestore(null)===false && applyRestore({d:'not json'})===false && applyRestore({d:JSON.stringify({x:1})})===false);
  try{ localStorage.removeItem(CUP_KEY); }catch(e){} saveProg(); await idbW(idbSet('saveId', prog.saveId));
  TASSERT('restoreFromCode: short code refused', (await restoreFromCode('AB-CD'))===false);
  // a real code with a stubbed server: the GET goes to the hashed key, the question shows, "no" keeps everything
  const keyABC=await saveKeyFor('ABCDEFGHIJ'); let gets=[];
  fbReq=async function(p,m){ gets.push(p); if(p==='saves/'+keyABC && m==='GET') return {d:JSON.stringify({prog:{coins:1, matches:9, xpTotal:0}, stats:{w:1,d:0,l:0,c:0}, name:'רוני'})}; return null; };
  const pr=restoreFromCode('abcd-efgh-ij'); await tick(60);
  TASSERT('restoreFromCode: GET saves/<hash>, never saves/<code>', gets.length===1 && gets[0]==='saves/'+keyABC);
  TASSERT('restoreFromCode: asks before overwriting (name + matches in the question)', $('#ask-modal').classList.contains('show') && $('#ask-text').textContent.includes('רוני') && $('#ask-text').textContent.includes('9'));
  $('#btn-ask-no').click(); TASSERT('restoreFromCode: "no" cancels', (await pr)===false && !$('#ask-modal').classList.contains('show'));
  fbReq=_fb;
  // --- #70: the automatic restore reads the IndexedDB mirror BEFORE anything overwrites it
  { while(!socialAutoCheck) await tick(50); await idbW(socialAutoCheck);   // the load-time check must have finished with the mirror before this block touches it
    const OLD='ZZZZZZZZZ2', keyOld=await saveKeyFor(OLD); let srv=undefined;
    fbReq=async function(p,m){ if(p==='saves/'+keyOld && m==='GET') return srv; return null; };
    await idbW(idbSet('saveId', OLD)); delete prog.saveId; prog.social=prog.social||{}; delete prog.social.oldId;
    const fresh=ensureSaveId(true); await tick(40);
    TASSERT('ensureSaveId(true): a fresh run does not touch the IndexedDB mirror', /^[A-Z2-7]{10}$/.test(fresh) && fresh!==OLD && (await idbW(idbGet('saveId')))===OLD);
    await socialAutoRestoreCheck(true);                                   // server down → the old id is remembered, the mirror is left alone
    TASSERT('auto-restore: server down keeps the old id for the next launch', prog.social.oldId===OLD && (await idbW(idbGet('saveId')))===OLD && socialAutoSave===null);
    srv={d:JSON.stringify({prog:{coins:50, matches:5, xpTotal:0, saveId:OLD}, stats:{w:1,d:0,l:0,c:0}, name:'נועה'})};
    await socialAutoRestoreCheck(false);                                  // a later launch: prog.social.oldId is tried again
    TASSERT('auto-restore: the old id\'s backup is offered (found through the hashed key), the mirror untouched', (!!socialAutoSave || $('#ask-modal').classList.contains('show')) && (await idbW(idbGet('saveId')))===OLD);
    showScreen('home'); await tick(380);
    TASSERT('auto-restore: the question names the kid', $('#ask-modal').classList.contains('show') && $('#ask-text').textContent.includes('נועה'));
    $('#btn-ask-no').click(); await tick(60);
    TASSERT('auto-restore declined: the mirror now holds this device\'s new id', !$('#ask-modal').classList.contains('show') && (await idbW(idbGet('saveId')))===prog.saveId && !prog.social.oldId);
    prog.saveId=id0; saveProg(); await idbW(idbSet('saveId', id0)); fbReq=_fb; }
  // --- the restore link inside the name modal
  settings.name=''; askNameIfMissing();
  TASSERT('name modal has the restore link', $('#name-modal').classList.contains('show') && !!$('#name-modal #btn-social-restore'));
  $('#btn-social-restore').click(); await tick(40);
  TASSERT('restore link → in-game input modal (name modal hidden)', $('#social-input-modal').classList.contains('show') && !$('#name-modal').classList.contains('show'));
  $('#social-input').value='abcdefghij'; $('#social-input').dispatchEvent(new Event('input'));
  TASSERT('restore input auto-formats', $('#social-input').value==='ABCD-EFGH-IJ');
  $('#btn-social-input-cancel').click(); await tick(40);
  TASSERT('cancel → back to the name modal', !$('#social-input-modal').classList.contains('show') && $('#name-modal').classList.contains('show'));
  $('#name-modal').classList.remove('show');
  // --- restore-code modal: copy only (#68c), the copy toast tells the truth (#78), the new code shows once after a restore (#68d)
  openRestoreCode();
  TASSERT('openRestoreCode shows my formatted code', $('#social-code-modal').classList.contains('show') && $('#social-code-text').textContent===fmtRestoreCode(prog.saveId));
  TASSERT('restore-code modal has no share button', !$('#btn-social-share-code') && typeof shareRestoreCode==='undefined' && !!$('#btn-social-copy'));
  { const _clip=navigator.clipboard, _exec=document.execCommand;
    try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('blocked'))}, configurable:true}); }catch(e){}
    document.execCommand=()=>false;
    const c1=await copyRestoreCode();
    TASSERT('copy refused → no "Copied!", the code is shown to write down', c1===false && lastToast().includes(fmtRestoreCode(prog.saveId)) && !lastToast().includes('הועתק'));
    try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.resolve()}, configurable:true}); }catch(e){}
    const c2=await copyRestoreCode();
    TASSERT('copy accepted → "Copied!"', c2===true && lastToast().includes('הועתק'));
    try{ Object.defineProperty(navigator,'clipboard',{value:_clip, configurable:true}); }catch(e){} document.execCommand=_exec; }
  $('#btn-social-code-close').click(); TASSERT('restore-code modal closes', !$('#social-code-modal').classList.contains('show'));
  prog.social=Object.assign({}, prog.social||{}, {newCode:true}); showScreen('home'); Hooks.emit('screen','home'); await tick(480);
  TASSERT('after a restore the new code is shown once with the "new code" hint', $('#social-code-modal').classList.contains('show') && $('#social-code-hint').textContent.includes('החדש') && !prog.social.newCode);
  $('#btn-social-code-close').click(); openRestoreCode(); TASSERT('the normal hint is back afterwards', $('#social-code-hint').textContent===T('social.codeHint')); $('#btn-social-code-close').click();
  // --- #67: storage that cannot save → one warning + a forced backup
  { const _si=Storage.prototype.setItem; let forced=0; const _cb=cloudBackup; cloudBackup=function(f){ if(f===true) forced++; return false; };
    socialSaveWarned=false; Storage.prototype.setItem=function(){ throw new Error('QuotaExceededError'); };
    const p1=socialStorageProbe(), p2=socialStorageProbe(); const warnTxt=lastToast();
    Storage.prototype.setItem=_si; cloudBackup=_cb;
    TASSERT('storage probe: failure → false, the warning once, cloudBackup(true) once', p1===false && p2===false && socialSaveWarned===true && forced===1 && warnTxt.includes('קוד השחזור'));
    socialSaveWarned=false; TASSERT('storage probe: working storage → true, no warning', socialStorageProbe()===true && socialSaveWarned===false); }
  // --- deep-link actions
  settings.name='טסט';
  await runDeepLinks({code:'GOAL77'});
  TASSERT('?code → codes modal pre-filled', $('#codes-modal').classList.contains('show') && $('#code-input').value==='GOAL77');
  $('#codes-modal').classList.remove('show');
  const _join=mpJoin; let joined=null; mpJoin=async function(c){ joined=c; };
  let pj=runDeepLinks({join:'ABCD'}); await tick(40);
  TASSERT('?join → asks first, never auto-joins', $('#ask-modal').classList.contains('show') && $('#ask-text').textContent.includes('ABCD') && joined===null);
  $('#btn-ask-no').click(); await pj; TASSERT('?join: "no" → nothing happens', joined===null && !$('#mp').classList.contains('active'));
  pj=runDeepLinks({join:'WXYZ'}); await tick(40); $('#btn-ask-yes').click(); await pj;
  TASSERT('?join: "yes" → mp screen + mpJoin(code)', joined==='WXYZ' && $('#mp').classList.contains('active') && $('#mp-input').value==='WXYZ');
  mpJoin=_join; showScreen('home');
  await runDeepLinks({mode:'daily'});
  TASSERT('?mode=daily → daily modal', $('#daily-modal').classList.contains('show')); $('#daily-modal').classList.remove('show');
  // pending links wait for the name: nothing runs while the name modal is up, then it runs after submitName
  settings.name=''; socialPending={code:'WAIT1'}; askNameIfMissing(); Hooks.emit('screen','home'); await tick(420);
  TASSERT('pending link waits for the name', socialPending && socialPending.code==='WAIT1' && !$('#codes-modal').classList.contains('show'));
  $('#name-input').value='יוסי'; submitName(); await tick(420);
  TASSERT('pending link runs after the name is saved', settings.name==='יוסי' && $('#codes-modal').classList.contains('show') && $('#code-input').value==='WAIT1' && socialPending===null);
  $('#codes-modal').classList.remove('show');
  // --- auth wrapper: ?auth= only when a token exists
  const _en=socialAuthEnabled, _fetch=window.fetch; let urls=[];
  window.fetch=async(u,opt)=>{ urls.push(u); return {ok:true, json:async()=>({ok:1})}; };
  TASSERT('no key: fbUrlFor has no auth', fbUrlFor('users/x')===FB_URL+'/users/x.json');
  socialAuthEnabled=()=>true; socialSetAuth({idToken:'tok1', refreshToken:'rt', localId:'uid1', exp:Date.now()+3600e3});
  const a1=await fbReq('users/x','GET'); const a2=await fbReq('users?orderBy="str"&limitToLast=5','GET');
  TASSERT('auth: ?auth=<idToken> appended', a1 && a1.ok===1 && urls[0]===FB_URL+'/users/x.json?auth=tok1');
  TASSERT('auth: &auth= when the path has a query', urls[1]===FB_URL+'/users.json?orderBy="str"&limitToLast=5&auth=tok1');
  TASSERT('myUid from the stored identity', myUid()==='uid1' && JSON.parse(localStorage.getItem(AUTH_KEY)).localId==='uid1');
  socialSetAuth(null); socialAuthEnabled=_en; window.fetch=_fetch;
  TASSERT('auth off again: myUid null', myUid()===null && fbUrlFor('users/x')===FB_URL+'/users/x.json');
  // --- end card gets a share button after a match
  settings.format='quick'; level=LEVELS[1]; mp=null; dailyMatch=false; beginMatch(CHARS[0],CHARS[1]); state='play'; score.me=2; endGame(); await tick(30);
  TASSERT('end card: 📤 share button + last info kept', !!$('#btn-end-share') && $('#end').classList.contains('show') && socialLastInfo && socialLastInfo.outcome==='win');
  goHome();
  TASSERT('no new script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  clearInterval(keepAlive); TDONE();
})();
