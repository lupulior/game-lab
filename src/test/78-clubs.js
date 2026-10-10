/* clubs: create / join / leave, the weekly counters (restart on a new week), progress + target, the prize once a week, invite text, deep link, entry points, offline */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length, tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  // ----- an in-memory Firebase fake: a JSON tree keyed by path with GET/PUT/PATCH/DELETE semantics, '.sv' timestamps resolved; `offline` → undefined like the real fbReq
  const _fb=fbReq, DB={}, calls=[]; let offline=false;
  const copy=v=>v===undefined ? null : JSON.parse(JSON.stringify(v));
  const getAt=parts=>{ let n=DB; for(const p of parts){ if(n==null || typeof n!=='object') return null; n=n[p]; } return n===undefined ? null : n; };
  const setAt=(parts,v)=>{ let n=DB; for(let i=0;i<parts.length-1;i++){ if(n[parts[i]]==null || typeof n[parts[i]]!=='object') n[parts[i]]={}; n=n[parts[i]]; } if(v===null || v===undefined) delete n[parts[parts.length-1]]; else n[parts[parts.length-1]]=v; };
  const sv=v=>{ if(v && typeof v==='object'){ if(v['.sv']==='timestamp') return Date.now(); const o={}; for(const k of Object.keys(v)) o[k]=sv(v[k]); return o; } return v; };
  fbReq=async function(path, method, body){
    calls.push([String(path), method, copy(body)]); await tick(1); if(offline) return undefined;
    const parts=String(path).split('?')[0].split('/').filter(Boolean);
    if(method==='GET') return copy(getAt(parts));
    if(method==='PUT'){ const v=sv(body); setAt(parts, v); return copy(v); }
    if(method==='PATCH'){ const v=sv(body); const cur=getAt(parts); const merged=Object.assign({}, cur && typeof cur==='object' ? cur : {}, v); for(const k of Object.keys(merged)) if(merged[k]===null) delete merged[k]; setAt(parts, merged); return copy(v); }
    if(method==='DELETE'){ setAt(parts, null); return null; }
    return null;
  };
  const clickYes=async()=>{ await tick(); const shown=$('#ask-modal').classList.contains('show'); $('#btn-ask-yes').click(); await tick(); return shown; };
  const fakeInfo=(outcome, me, op, training)=>({outcome, stars:1, score:{me, op}, earn:{coins:0,gems:0,keys:0,xp:0,goals:me,levelUps:[]}, pay:null, trophies:0, online:false, motd:false, fmt:'quick', level:1, v2:false, training:!!training, overtime:false, opp:null});
  const name1='בדיקה-קלוד', name2='בדיקה-קלוד ב', name3='בדיקה-קלוד ג';   // the first one is hidden from leaderboards; none of them reaches the real server (fbReq is faked)
  const name0=settings.name, adm0=prog.admin; settings.name=name1; saveSettings(); prog.admin=false;
  const key1=fbKey(name1), key2=fbKey(name2);
  delete prog.club; prog.clubPrize=null; prog.gems=30; prog.coins=0; saveProg(); CLUB.data=null; CLUB.fetched=0; CLUB.offline=false; CLUB.pending=null;
  // ----- entry points
  showScreen('home'); await tick(150);
  TASSERT('more-sheet button exists', !!$('#btn-club') && $('#more-grid').contains($('#btn-club')) && $('#btn-club').textContent===T('clubs.btn'));
  TASSERT('home pill exists (in #home-trophy when the home v2 is built)', !!$('#home-club') && (!$('#home-trophy') || $('#home-trophy').contains($('#home-club'))) && $('#home-club').textContent===T('clubs.pillNone'));
  TASSERT('pill is at least 36px tall', !$('#home-trophy') || $('#home-club').getBoundingClientRect().height/($('#stage').getBoundingClientRect().width/1000)>=35);
  // ----- pure helpers
  TASSERT('target = 15 × members, min 30', clubTarget(1)===30 && clubTarget(2)===30 && clubTarget(3)===45 && clubTarget(20)===300);
  TASSERT('code validation + normalisation', clubValidCode('ABC234') && !clubValidCode('abc234') && !clubValidCode('ABC23') && clubNormCode(' ab-c2 34x ')==='ABC234');
  TASSERT('days left 1..7', clubDaysLeft()>=1 && clubDaysLeft()<=7);
  TASSERT('24 preset names × 4 languages, 12 emojis', CLUB_NAMES.length===24 && CLUB_NAMES.every(r=>r.length===4 && r.every(s=>s.length>1)) && CLUB_EMOJIS.length===12 && clubName(0,'en')==='The Lions' && clubName(0,'he')==='האריות');
  // ----- open: no club yet
  $('#btn-club').click(); await tick();
  TASSERT('club modal opens on the "no club" view', $('#club-modal').classList.contains('show') && $('#club-body').dataset.view==='none' && !!$('#btn-club-create') && !!$('#btn-club-join'));
  TASSERT('create button names the price', $('#btn-club-create').textContent.includes(String(ECON.clubs.create)));
  // ----- create
  $('#btn-club-create').click(); await tick();
  TASSERT('create view: 24 name chips + 12 emojis', $('#club-body').dataset.view==='create' && document.querySelectorAll('.club-chip').length===24 && document.querySelectorAll('.club-emo').length===12);
  document.querySelectorAll('.club-chip')[2].click(); await tick(); document.querySelectorAll('.club-emo')[9].click(); await tick();
  TASSERT('picked name + emoji shown', CLUB.pick.name===2 && CLUB.pick.emoji==='🔥' && $('#club-prev').textContent.includes(clubName(2)) && document.querySelectorAll('.club-chip.on').length===1);
  prog.gems=5; $('#btn-club-do-create').click(); await tick(60);
  TASSERT('5 gems: refused before the question, nothing written', !$('#ask-modal').classList.contains('show') && !prog.club && !DB.clubs);
  prog.gems=30; $('#btn-club-do-create').click(); const asked=await clickYes(); await tick(200);
  const c=prog.club;
  TASSERT('ask() shown, then 20 gems spent', asked && prog.gems===10);
  TASSERT('prog.club set: id(8) code(6, no 0/O/1/I) name emoji joined', !!c && /^[A-HJ-NP-Z2-9]{8}$/.test(c.id) && /^[A-HJ-NP-Z2-9]{6}$/.test(c.code) && c.name===2 && c.emoji==='🔥' && c.joined>0);
  const node=DB.clubs && DB.clubs[c.id];
  TASSERT('clubs/<id> written with my member node + week', !!node && node.name===2 && node.emoji==='🔥' && node.code===c.code && typeof node.created==='number' && !!node.members[key1] && node.members[key1].g===0 && node.members[key1].wk===weekKey() && node.members[key1].name===name1 && node.week.key===weekKey() && node.week.goals===0);
  TASSERT('clubCodes/<code> → id', !!DB.clubCodes && DB.clubCodes[c.code]===c.id);
  TASSERT('club view: 0/30, my row, claim far, invite + leave, the code', $('#club-body').dataset.view==='club' && $('#club-progress-text').textContent.includes('0 / 30') && document.querySelectorAll('#club-members .club-row.me').length===1 && $('#btn-club-claim').classList.contains('off') && !!$('#btn-club-invite') && !!$('#btn-club-leave') && $('#club-code').textContent.includes(c.code));
  TASSERT('home pill shows the club', (clubHomePill()||{}).textContent.includes('0/30') && $('#home-club').textContent.includes('0/30'));
  { const body={}; Hooks.emit('heartbeat', body); TASSERT('heartbeat carries the club id', body.club===c.id); }
  // ----- matches feed my member node (training never)
  calls.length=0;
  Hooks.emit('matchEnd', fakeInfo('win', 3, 1)); await tick(250);
  TASSERT('matchEnd: local counters g+3 w+1 m+1', c.me.g===3 && c.me.w===1 && c.me.m===1 && c.me.wk===weekKey());
  const m1=DB.clubs[c.id].members[key1];
  TASSERT('matchEnd: my member node PATCHed with absolute counters', m1.g===3 && m1.w===1 && m1.m===1 && m1.wk===weekKey() && typeof m1.t==='number' && calls.some(x=>x[0]==='clubs/'+c.id+'/members/'+key1 && x[1]==='PATCH'));
  TASSERT('only a PATCH after a match, no GET', !calls.some(x=>x[1]==='GET'));
  Hooks.emit('matchEnd', fakeInfo('win', 9, 0, true)); await tick(200);
  TASSERT('training does not count', c.me.g===3 && c.me.m===1 && DB.clubs[c.id].members[key1].g===3);
  { clubClose(); settings.format='quick'; level=LEVELS[1]; mp=null; training=null; dailyMatch=false; const g0=c.me.g, n0=c.me.m;
    try{ beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=0; endGame(); }catch(e){ console.error(e); }
    await tick(300); TASSERT('a real match → +2 goals, +1 match', c.me.g===g0+2 && c.me.m===n0+1 && DB.clubs[c.id].members[key1].g===g0+2);
    try{ goHome(); }catch(e){} await tick(60); }
  // ----- weekly reset: an old week key restarts my counters; members from last week count 0
  c.me={wk:'w1', g:40, w:5, m:9}; saveProg();
  Hooks.emit('matchEnd', fakeInfo('lose', 1, 2)); await tick(250);
  TASSERT('new week: counters restart (g 1, w 0, m 1) on the server too', c.me.wk===weekKey() && c.me.g===1 && c.me.w===0 && c.me.m===1 && DB.clubs[c.id].members[key1].g===1 && DB.clubs[c.id].members[key1].m===1);
  DB.clubs[c.id].members.oldkid={name:'ישן', lv:3, g:50, w:9, m:9, wk:'w1'};
  DB.clubs[c.id].members.dana={name:'דנה', lv:2, g:12, w:2, m:4, wk:weekKey()};
  { const st=clubWeekStats(DB.clubs[c.id]); TASSERT('stats: last week counts 0, 3 members → target 45, total 13, sorted by goals', st.n===3 && st.target===45 && st.total===13 && st.totalServer===13 && st.list[0].name==='דנה' && st.myM===1); }
  calls.length=0; CLUB.fetched=0; clubOpen(); await tick(150);
  TASSERT('club screen: one GET, 13 / 45, 3 rows, my row named', calls.filter(x=>x[0]==='clubs/'+c.id && x[1]==='GET').length===1 && $('#club-progress-text').textContent.includes('13 / 45') && document.querySelectorAll('#club-members .club-row').length===3 && $('#club-members .club-row.me').textContent.includes(name1));
  TASSERT('bar width follows the total', parseInt($('#club-bar i').style.width)===Math.round(13/45*100));
  TASSERT('week summary cached on the server', DB.clubs[c.id].week.key===weekKey() && DB.clubs[c.id].week.goals===13);
  TASSERT('days-left line + prize line', $('#club-days').textContent.length>2 && $('#club-prize-line').textContent.includes(String(ECON.clubs.prizeMatches)));
  TASSERT('home pill 13/45', $('#home-club').textContent.includes('13/45'));
  // ----- invite: through the share helper (70-social) with the code and the ?club= link
  { let shared=null; const had=typeof shareText==='function', _st=had ? shareText : null; window.shareText=t=>{ shared=t; return 'test'; };
    const r=clubInvite();
    TASSERT('invite: the share helper gets the code, the name and the ?club= link', r==='test' && !!shared && shared.includes(c.code) && shared.includes('?club='+c.code) && shared.includes(clubName(c.name)));
    if(had) shareText=_st; else delete window.shareText; }
  TASSERT('?club= parsed (also through parseDeepLinks when 70-social exists)', clubParseSearch('?x=1&club=abc234')==='ABC234' && clubParseSearch('?club=AB')===null && (typeof parseDeepLinks!=='function' || parseDeepLinks('?club=qwe789').club==='QWE789'));
  { const _clip=navigator.clipboard; try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.resolve()}, configurable:true}); }catch(e){}
    const ok=await clubCopyCode(); TASSERT('copy code', ok===true);
    try{ Object.defineProperty(navigator,'clipboard',{value:_clip, configurable:true}); }catch(e){} }
  // ----- join from a second identity (a second fake player on the same fake server)
  const club1=Object.assign({}, c, {me:Object.assign({}, c.me)}), code=c.code, id=c.id;
  clubClose(); delete prog.club; saveProg(); CLUB.data=null; CLUB.fetched=0; settings.name=name2; saveSettings();
  clubOpen(); await tick(); $('#btn-club-join').click(); await tick();
  TASSERT('join view with the 6-box input', $('#club-body').dataset.view==='join' && !!$('#club-code-input') && document.querySelectorAll('#club-boxes span').length===6);
  const inp=$('#club-code-input'); inp.value='ab'; inp.dispatchEvent(new Event('input')); await tick();
  TASSERT('typing is uppercased and mirrored into the boxes', inp.value==='AB' && $('#club-boxes').children[0].textContent==='A' && $('#club-boxes').children[2].classList.contains('on'));
  $('#btn-club-do-join').click(); await tick(100);
  TASSERT('a short code is refused', !prog.club);
  inp.value='ZZZZZZ'; inp.dispatchEvent(new Event('input')); $('#btn-club-do-join').click(); await tick(150);
  TASSERT('an unknown code: not found, nothing joined', !prog.club && !DB.clubs[id].members[key2]);
  inp.value=code.toLowerCase(); inp.dispatchEvent(new Event('input')); $('#btn-club-do-join').click(); await tick(250);
  TASSERT('joined by code: prog.club = the same club, member node written', !!prog.club && prog.club.id===id && prog.club.code===code && prog.club.name===2 && prog.club.emoji==='🔥' && !!DB.clubs[id].members[key2] && DB.clubs[id].members[key2].name===name2 && DB.clubs[id].members[key2].g===0 && DB.clubs[id].members[key2].wk===weekKey());
  TASSERT('club view after the join: 4 members, target 60', $('#club-body').dataset.view==='club' && $('#club-progress-text').textContent.includes('/ 60') && document.querySelectorAll('#club-members .club-row').length===4 && $('#club-members .club-row.me').textContent.includes(name2));
  TASSERT('already in a club: a second join is refused', (await clubJoin(code))===false);
  { const saved=prog.club; delete prog.club; settings.name=name3; saveSettings();
    const ms=DB.clubs[id].members; for(let i=0;i<20;i++) ms['f'+i]={name:'ילד'+i, lv:1, g:0, w:0, m:0, wk:weekKey()};
    const ok=await clubJoin(code); TASSERT('a full club (20+) refuses a new member', ok===false && !prog.club);
    for(let i=0;i<20;i++) delete ms['f'+i]; settings.name=name2; saveSettings(); prog.club=saved; saveProg(); }
  // ----- leave (confirmed)
  const leaveP=clubLeave(); await tick(); TASSERT('leave asks first', $('#ask-modal').classList.contains('show')); $('#btn-ask-no').click(); await tick();
  TASSERT('no → still a member', (await leaveP)===false && !!prog.club && !!DB.clubs[id].members[key2]);
  const leaveP2=clubLeave(); await clickYes(); await tick(100);
  TASSERT('yes → left: prog.club gone, member node deleted, "no club" view, plain pill', (await leaveP2)===true && !prog.club && !DB.clubs[id].members[key2] && $('#club-body').dataset.view==='none' && $('#home-club').textContent===T('clubs.pillNone'));
  // ----- the weekly prize, back as the first identity (1 member → target 30)
  settings.name=name1; saveSettings(); prog.club=club1; saveProg(); CLUB.data=null; CLUB.fetched=0; prog.clubPrize=null;
  delete DB.clubs[id].members.oldkid; delete DB.clubs[id].members.dana;
  const hasChests=typeof giveChest==='function', inv=k=>hasChests ? ((prog.chests||{})[k]|0) : 0;
  DB.clubs[id].members[key1]={name:name1, lv:1, g:20, w:2, m:3, wk:weekKey()}; prog.club.me={wk:weekKey(), g:20, w:2, m:3};
  TASSERT('goal not reached: claim refused', (await clubClaim())===false && prog.clubPrize!==weekKey());
  DB.clubs[id].members[key1].g=31; prog.club.me.g=31;
  TASSERT('reached but only 3 matches: claim refused', (await clubClaim())===false && prog.clubPrize!==weekKey());
  clubOpen(); await tick(150);
  TASSERT('claim button says how many matches are missing, bar is gold', $('#btn-club-claim').textContent.includes('2') && $('#btn-club-claim').classList.contains('off') && $('#club-bar').classList.contains('done'));
  DB.clubs[id].members[key1].m=5; prog.club.me.m=5; const g0=prog.gems, c0=prog.coins, s0=inv('silver');
  clubRender(); TASSERT('ready: the claim button is green', $('#btn-club-claim').classList.contains('green'));
  $('#btn-club-claim').click(); await tick(250);
  TASSERT('claimed: +10 gems, silver chest (or 300 coins), marked for this week', prog.clubPrize===weekKey() && prog.gems===g0+10 && (hasChests ? inv('silver')===s0+1 : prog.coins===c0+300) && $('#btn-club-claim').textContent===T('clubs.claimed'));
  TASSERT('once per week', (await clubClaim())===false && prog.gems===g0+10);
  prog.clubPrize=null; DB.clubs[id].members[key1].g=70; prog.club.me.g=70; const g1=prog.gems, c1=prog.coins, s1=inv('gold');
  TASSERT('2× target → gold chest (or 600 coins)', (await clubClaim())===true && prog.gems===g1+10 && (hasChests ? inv('gold')===s1+1 : prog.coins===c1+600));
  // ----- offline: every request returns undefined
  offline=true; CLUB.data=null; CLUB.fetched=0; const e1=window.__errs.length;
  clubOpen(); await tick(150);
  TASSERT('offline club screen: "no connection" state, my own row still shown, no errors', $('#club-body').dataset.view==='club' && !!$('#club-status') && $('#club-status').textContent===T('clubs.noConn') && document.querySelectorAll('#club-members .club-row.me').length===1 && window.__errs.length===e1);
  Hooks.emit('matchEnd', fakeInfo('win', 2, 0)); await tick(250);
  TASSERT('offline match: counted locally, marked dirty, pill updated', prog.club.me.g===72 && prog.club.dirty===true && DB.clubs[id].members[key1].g===70 && $('#home-club').textContent.includes('72/30'));
  prog.clubPrize=null; TASSERT('offline claim refused, nothing granted', (await clubClaim())===false && prog.clubPrize===null);
  { const p=clubLeave(); await clickYes(); TASSERT('offline leave refused (no ghost member)', (await p)===false && !!prog.club); }
  { const gg=prog.gems, saved=prog.club; clubClose(); delete prog.club; CLUB.view='create';
    const p=clubCreate(0,'🦁'); await clickYes(); TASSERT('offline create: refused, gems kept', (await p)===false && prog.gems===gg && !prog.club);
    TASSERT('offline join refused', (await clubJoin(code))===false && !prog.club);
    prog.club=saved; saveProg(); }
  offline=false; await clubRefresh(true); await tick(100);
  TASSERT('back online: the dirty counters are pushed on the next refresh', DB.clubs[id].members[key1].g===72 && prog.club.dirty===false);
  // ----- no name → "need a name first", nothing created
  { const saved=prog.club; delete prog.club; settings.name=''; saveSettings(); const gg=prog.gems;
    const r=await clubCreate(1,'⚡'); TASSERT('no name: refused with the name prompt, gems kept', r===false && prog.gems===gg && !prog.club);
    try{ $('#name-modal').classList.remove('show'); }catch(e){} settings.name=name1; saveSettings(); prog.club=saved; saveProg(); }
  // ----- a club deleted on the server disappears locally
  delete DB.clubs[id]; CLUB.fetched=0; await clubRefresh(true); await tick(50);
  TASSERT('club gone on the server → prog.club cleared, plain pill', !prog.club && $('#home-club').textContent===T('clubs.pillNone'));
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length>errs0) TLOG('errors', window.__errs.slice(errs0));
  // ----- cleanup: nothing of the fake identities survives, the real fbReq is back
  clubClose(); delete prog.club; prog.clubPrize=null; prog.gems=0; prog.coins=0; prog.admin=adm0; saveProg(); CLUB.data=null; CLUB.fetched=0; CLUB.offline=false; CLUB.pending=null; CLUB.view='none';
  settings.name=name0||''; saveSettings(); fbReq=_fb; clubHomePill();
  TDONE();
})();
