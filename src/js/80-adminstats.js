/* ===================================================================================================
   MEASUREMENT + ADMIN DASHBOARD + POLISH  (module 80-adminstats)
   - prog.m = per-device counters {sess, cE, cS, sh, days:{day:matches}, lastDay} fed by the hook bus
   - the presence heartbeat carries {sess, days (28-day bitmask, bit 0 = today), mToday, lastDay, cE, cS, sh, lv, fmt}
   - stats/<day> on the server aggregates {dau, matches, newPlayers, chests, buys, shares} with .sv increments
   - "📈 מדדים" section in the admin panel: 14-day DAU bars, matches/DAU, D1/D7 return, coins in/out, chests, buys, shares, new players
   - red flags in the admin online list + one-tap hide (HIDDEN_IDS, remembered in prog.hiddenNames on this admin device)
   - polish: no leaderboard bots once a real player exists; party leave button; bans compared with server time;
             "(1) Football Star" title while something is claimable; prefers-reduced-motion → body.reduced
   =================================================================================================== */
Object.assign(ECON, { stats: {
  days:28,            // bits in the heartbeat bitmask
  dash:14,            // days shown on the admin dashboard
  titlePoll:10000,    // ms between document.title checks
  usersTTL:15000,     // ms a fetched users node is reused (admin list + dashboard + leaderboard share one GET)
  loadDelay:2500,     // ms after load before the first stats PATCH (after the heartbeat)
  flagTr:5000, flagW:50, flagCoins:500000,   // red flags: tr>flagTr && w<flagW (impossible) or coins>flagCoins, admins exempt
  d1Target:35, mpdTarget:3,                  // PLAN §14 decision rule for wave 2
}});
const AST_T0 = (typeof performance!=='undefined' && performance.now) ? performance.now() : 0;
const AST_BASE_TITLE = document.title.replace(/^\(\d+\)\s*/, '');

/* ----- per-device counters ----- */
function mState(){
  const m = prog.m = prog.m || {};
  m.sess=m.sess|0; m.cE=m.cE|0; m.cS=m.cS|0; m.sh=m.sh|0; m.days = (m.days && typeof m.days==='object') ? m.days : {};
  return m;
}
function mPruneDays(m){ const keep=new Set(); for(let i=0;i<ECON.stats.days;i++) keep.add(localDayKey(now()-i*864e5)); for(const k of Object.keys(m.days)) if(!keep.has(k)) delete m.days[k]; }
/* bitmask of the last 28 (server) days with at least one finished match; bit 0 = today */
function daysMask(){
  const m=mState(); let mask=0;
  for(let i=0;i<ECON.stats.days;i++) if((m.days[localDayKey(now()-i*864e5)]|0)>0) mask|=(1<<i);
  return mask>>>0;
}
function mMatchesToday(){ return mState().days[dayKey()]|0; }
function mNoteMatch(){ const m=mState(), k=dayKey(); m.days[k]=(m.days[k]|0)+1; m.lastDay=k; mPruneDays(m); saveProg(); }
Hooks.on('coins', n=>{ const m=mState(); m.cE+=Math.max(0,n|0); saveProg(); });
Hooks.on('spend', n=>{ const m=mState(); m.cS+=Math.max(0,n|0); saveProg(); });
Hooks.on('matchEnd', info=>{ if(info && info.training) return; mNoteMatch(); statDaily('matches'); statDau(); });
Hooks.on('purchase', ()=>statBuy());
Hooks.on('chest', ()=>statChest()); Hooks.on('chestOpen', ()=>statChest());        // whichever name the chests module uses
Hooks.on('share', ()=>statShare());
/* public counters for other modules (optional-function convention: if(typeof statShare==='function') statShare()) */
function statShare(){ const m=mState(); m.sh++; saveProg(); statDaily('shares'); }
function statChest(){ statDaily('chests'); }
function statBuy(){ statDaily('buys'); }

/* ----- the heartbeat carries the measurement fields (PLAN §14) ----- */
function statHeartbeatFields(body){
  const m=mState();
  Object.assign(body, { sess:m.sess|0, days:daysMask(), mToday:mMatchesToday(), lastDay:m.lastDay||'', cE:m.cE|0, cS:m.cS|0, sh:m.sh|0, lv:myLevel(), fmt:myFormat() });
  return body;
}
Hooks.on('heartbeat', statHeartbeatFields);

/* ----- stats/<day>: fire-and-forget server-side increments, only with a server ----- */
function statDaily(field, n){
  if(!fbOn()) return false;
  const body = typeof field==='object' ? field : {[field]:{'.sv':{increment:(n==null?1:n)}}};
  try{ const p=fbReq('stats/'+dayKey(),'PATCH',body); if(p && p.catch) p.catch(()=>{}); }catch(e){}
  return true;
}
/* dau: once per (server) day per device */
function statDau(){ const c=dayCounter('statDau'); if(c.n>0) return false; c.n=1; saveProg(); return statDaily('dau'); }
/* at load: the session counter, dau and (for a brand-new device) newPlayers */
function statSessionStart(){
  if(statSessionStart.done) return; statSessionStart.done=true;
  const m=mState(); m.sess++; mPruneDays(m); saveProg();
  const fresh = !m.newSent && (prog.matches|0)===0 && (prog.wins|0)===0 && (prog.trophies|0)===0 && !(prog.unlocked||[]).length;   // a device that has never played (a migrated veteran has wins/trophies)
  setTimeout(()=>{ if(!fbOn()) return;
    const body={}; const c=dayCounter('statDau'); if(c.n===0){ c.n=1; body.dau={'.sv':{increment:1}}; }
    if(fresh){ m.newSent=true; body.newPlayers={'.sv':{increment:1}}; }
    saveProg(); if(Object.keys(body).length) statDaily(body);
  }, ECON.stats.loadDelay);
}
Hooks.on('home', ()=>{ if(statSessionStart.done) statDau(); });   // a page left open past midnight counts for the new day on its next home visit

/* ----- one users GET shared by the admin list, the dashboard and the leaderboard (15 s) ----- */
let astUsersCache=null;
{ const _fbReq=fbReq;
  fbReq=async function(path, method, body){
    if(path==='users' && method==='GET'){
      if(astUsersCache && Date.now()-astUsersCache.t<ECON.stats.usersTTL) return astUsersCache.v;
      const v=await _fbReq(path, method, body); if(v && typeof v==='object') astUsersCache={t:Date.now(), v}; return v;
    }
    return _fbReq(path, method, body);
  }; }

/* ----- red flags and the hidden list ----- */
const HIDDEN_IDS=['בדיקה-קלוד'];                                   // names (lower-cased) or user keys never shown on the leaderboard
{ try{ for(const x of (prog.hiddenNames||[])) if(x && !HIDDEN_IDS.includes(x)) HIDDEN_IDS.push(x); }catch(e){} }
function isHiddenId(key, name){ const n=(name||'').toLowerCase(); return HIDDEN_IDS.some(h=>h===key || h.toLowerCase()===n); }
function hideId(key, name){ const id=key||(name||'').toLowerCase(); if(!id || HIDDEN_IDS.includes(id)) return; HIDDEN_IDS.push(id); prog.hiddenNames=HIDDEN_IDS.filter(h=>h!=='בדיקה-קלוד'); saveProg(); }
function unhideId(key, name){ const n=(name||'').toLowerCase(); for(let i=HIDDEN_IDS.length-1;i>=0;i--) if(HIDDEN_IDS[i]===key || HIDDEN_IDS[i].toLowerCase()===n) HIDDEN_IDS.splice(i,1); prog.hiddenNames=HIDDEN_IDS.filter(h=>h!=='בדיקה-קלוד'); saveProg(); }
/* a users row that cannot be honest: thousands of trophies with almost no wins, or a coin pile no cap allows; admins are exempt */
function isFlagged(u){
  if(!u || u.adm) return false; const S=ECON.stats;
  return ((u.tr|0)>S.flagTr && (u.w|0)<S.flagW) || (u.xp|0)>S.flagCoins;
}

/* ----- leaderboard: HIDDEN_IDS filter, bots only while NOBODY real is on the table (bug #5) ----- */
buildTop=async function(){
  const box=$('#fr-top'); if(!box) return; box.innerHTML=`<div class="hint" style="text-align:center;margin-top:20px">${T('friends.checking')}</div>`;
  let rows=null, server=false;
  if(fbOn()){ const all=await fbReq('users','GET'); if(all){ server=true; rows=Object.entries(all).filter(([k,u])=>u&&u.name).map(([k,u])=>({key:k, name:normName(u.name), w:u.w|0, c:u.c|0, xp:u.xp|0, tr:u.tr|0, online:fbOnline(u), st:u.st, adm:!!u.adm})); } }
  if(!rows){ const s=loadStats(); rows=Object.keys(prog.friends).filter(n=>n.toLowerCase()!==normName(settings.name).toLowerCase()).map(n=>({name:n, w:prog.friends[n].w|0, c:prog.friends[n].c|0, xp:prog.friends[n].xp|0, tr:prog.friends[n].tr|0, online:!!prog.friends[n].online})); rows.push({name:normName(settings.name)||T('mp.you'), w:s.w|0, c:s.c|0, xp:prog.coins|0, tr:prog.trophies|0, online:true, me:true}); }
  rows=rows.filter(r=>!isHiddenId(r.key, r.name));
  if(!rows.length) rows=LEADER_BOTS.map(b=>Object.assign({online:false}, b));      // an empty table shows the three friendly bots; one real player and they are gone
  rows.sort((a,b)=>b.w-a.w || b.c-a.c || b.xp-a.xp); rows=rows.slice(0,25);
  const me=normName(settings.name).toLowerCase();
  const medal=i=>i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
  box.innerHTML = (server ? '' : `<div class="hint" style="text-align:center">${T('friends.topNeedsServer')}</div>`) +
    (rows.length ? rows.map((r,i)=>{ const mine=r.me||r.name.toLowerCase()===me; return `<div class="frow top ${mine?'mine':''}" data-name="${esc(r.name)}"><span class="rank">${medal(i)}</span><span class="dot ${r.online?(r.st==='match'?'match':'online'):'offline'}"></span><span class="fname">${esc(crown(r.name, r.adm||(mine&&isAdmin())))}${mine?' <small>('+T('mp.you')+')</small>':''}</span><span class="fstat">✅ ${r.w} · 🏆 ${r.tr|0} · ⭐ ${r.xp}</span>${mine||r.bot?'':`<button class="btn small blue" data-act="view">${T('friends.view')}</button>${prog.friends[r.name]?'':`<button class="btn small yellow" data-act="add">${T('friends.add')}</button>`}`}</div>`; }).join('') : `<div class="hint" style="text-align:center;margin-top:20px">${T('friends.empty')}</div>`);
};

/* ----- admin panel: the measurement section + red flags in the online list ----- */
function astBox(){
  let box=$('#adm-stats'); if(box) return box;
  const panel=$('#admin-modal .panel'); if(!panel) return null;
  box=document.createElement('div'); box.className='adm-box adm-stats'; box.id='adm-stats';
  box.innerHTML=`<div class="adm-h"><span id="adm-stats-h">${T('adm.stats')}</span><button class="btn small blue" id="btn-adm-stats-refresh">🔄</button><span class="ast-boot" id="adm-stats-boot"></span></div><div id="adm-stats-body"><div class="hint">${T('friends.checking')}</div></div>`;
  const grid=panel.querySelector('.adm-grid'); if(grid) grid.insertAdjacentElement('afterend', box); else panel.appendChild(box);
  $('#btn-adm-stats-refresh').addEventListener('click', ()=>{ sfx.click(); astUsersCache=null; loadStatsDash(); });
  return box;
}
{ const _openAdmin=openAdmin;
  openAdmin=function(){ _openAdmin(); if(!isAdmin()) return; const box=astBox(); if(box){ box.hidden=!isAdmin(); $('#adm-stats-h').textContent=T('adm.stats'); $('#adm-stats-boot').textContent=AST_T0 ? T('ast.boot', Math.round(astBootMs())) : ''; } loadStatsDash(); }; }
function astBootMs(){ return astBootMs.v || (astBootMs.v = AST_T0); }
async function loadStatsDash(){
  const box=astBox(); if(!box) return null;
  const body=$('#adm-stats-body');
  if(!fbOn()){ body.innerHTML=`<div class="hint">${T('adm.serverOff')}</div>`; return null; }
  body.innerHTML=`<div class="hint">${T('friends.checking')}</div>`;
  const [stats, users]=await Promise.all([fbReq('stats','GET'), fbReq('users','GET')]);
  const data={days:(stats&&typeof stats==='object')?stats:{}, users:(users&&typeof users==='object')?users:{}};
  renderStats(data); return data;
}
/* D1/D7 from the users' 28-day bitmasks: of every "played on day i+d" (d days ago, i ≥ 1 so the return day is complete), how many also played on day i */
function astReturnRate(users, d){
  let pairs=0, back=0; const N=ECON.stats.days;
  for(const u of Object.values(users||{})){ const mask=(u&&u.days)|0; if(!mask) continue;
    for(let i=1;i+d<N;i++){ if(mask&(1<<(i+d))){ pairs++; if(mask&(1<<i)) back++; } } }
  return pairs ? Math.round(back/pairs*100) : null;
}
function astPct(v){ return v==null ? '—' : v+'%'; }
/* pure render: data={days:{'2026-10-09':{dau,matches,newPlayers,chests,buys,shares}}, users:{key:{name,w,tr,xp,adm,days,sess,cE,cS,sh}}} */
function renderStats(data){
  const box=astBox(); if(!box) return null; const body=$('#adm-stats-body');
  data=data||{}; const days=data.days||{}, users=data.users||{}, S=ECON.stats;
  const keys=[]; for(let i=S.dash-1;i>=0;i--) keys.push(localDayKey(now()-i*864e5));
  const sum=f=>keys.reduce((a,k)=>a+((days[k]&&days[k][f])|0),0);
  const tot={dau:sum('dau'), matches:sum('matches'), newPlayers:sum('newPlayers'), chests:sum('chests'), buys:sum('buys'), shares:sum('shares')};
  const today=days[dayKey()]||{};
  const ul=Object.values(users).filter(u=>u&&u.name);
  const cE=ul.reduce((a,u)=>a+(u.cE|0),0), cS=ul.reduce((a,u)=>a+(u.cS|0),0), sess=ul.reduce((a,u)=>a+(u.sess|0),0);
  const d1=astReturnRate(users,1), d7=astReturnRate(users,7);
  const mpd = tot.dau ? Math.round(tot.matches/tot.dau*10)/10 : null;
  const flagged=Object.entries(users).filter(([k,u])=>isFlagged(u));
  const maxDau=Math.max(1, ...keys.map(k=>(days[k]&&days[k].dau)|0));
  const good=(v,t)=>v!=null && v>=t ? ' good' : v!=null ? ' bad' : '';
  const tile=(id,label,val,cls)=>`<div class="ast-tile${cls||''}" id="ast-${id}"><b>${val}</b><span>${label}</span></div>`;
  const empty=!keys.some(k=>days[k]) && !ul.length;
  body.innerHTML = (empty ? `<div class="hint">${T('ast.none')}</div>` : '') +
    `<div class="ast-tiles">`+
      tile('dau', T('ast.dau'), fmtNum(today.dau|0)) +
      tile('mpd', T('ast.mpd'), mpd==null?'—':mpd, good(mpd,S.mpdTarget)) +
      tile('d1', T('ast.d1'), astPct(d1), good(d1,S.d1Target)) +
      tile('d7', T('ast.d7'), astPct(d7)) +
      tile('coins', T('ast.coins'), '🪙 '+fmtNum(cE)+' / '+fmtNum(cS)) +
      tile('matches', T('ast.matches')+' · '+T('ast.14d'), fmtNum(tot.matches)) +
      tile('new', T('ast.new')+' · '+T('ast.14d'), fmtNum(tot.newPlayers)) +
      tile('chests', T('ast.chests')+' · '+T('ast.14d'), fmtNum(tot.chests)) +
      tile('buys', T('ast.buys')+' · '+T('ast.14d'), fmtNum(tot.buys)) +
      tile('shares', T('ast.shares')+' · '+T('ast.14d'), fmtNum(tot.shares)) +
      tile('sess', T('ast.sess'), fmtNum(sess)) +
      tile('users', T('ast.users'), fmtNum(ul.length)) +
      tile('flags', T('ast.flags'), fmtNum(flagged.length), flagged.length?' bad':'') +
    `</div>`+
    `<div class="ast-h">${T('ast.dau14')}</div><div class="ast-bars" id="ast-bars">`+
      keys.map(k=>{ const v=(days[k]&&days[k].dau)|0; return `<div class="ast-col" title="${k}: ${v}"><div class="ast-bar" style="height:${Math.round(v/maxDau*100)}%"></div><small>${+k.slice(-2)}</small></div>`; }).join('')+
    `</div>`+
    (flagged.length ? `<div class="ast-h bad">${T('ast.flag')}: ${flagged.map(([k,u])=>esc(normName(u.name||k))).join(', ')}</div>` : '')+
    `<div class="hint ast-rule">${T('ast.wave2')}</div>`;
  return tot;
}
/* red rows + one-tap hide in the existing online list */
{ const _refreshAdminLists=refreshAdminLists;
  refreshAdminLists=async function(){ await _refreshAdminLists(); await flagAdminRows(); }; }
async function flagAdminRows(users){
  const on=$('#adm-online'); if(!on) return 0;
  const all = users || (fbOn() ? await fbReq('users','GET') : null) || {};
  let n=0;
  on.querySelectorAll('.frow.adm[data-key]').forEach(row=>{
    const key=row.dataset.key, name=row.dataset.name||'', u=all[key]||{};
    const fl=isFlagged(u), hid=isHiddenId(key,name); if(fl) n++;
    row.classList.toggle('adm-flag', fl); row.classList.toggle('adm-hidden', hid);
    row.querySelectorAll('.ast-flag,.ast-hidebtn').forEach(e=>e.remove());
    if(fl){ const b=document.createElement('span'); b.className='ast-flag'; b.textContent=T('ast.flag'); b.title=`🏆 ${u.tr|0} · ✅ ${u.w|0} · 🪙 ${fmtNum(u.xp|0)}`; const st=row.querySelector('.fstat'); if(st) st.insertAdjacentElement('afterend', b); else row.appendChild(b); }
    if(!row.querySelector('small') || fl || hid){                  // not on my own row unless it is flagged/hidden
      const btn=document.createElement('button'); btn.className='btn small ast-hidebtn '+(hid?'green':'yellow'); btn.dataset.act=hid?'unhide':'hide'; btn.textContent=hid?T('ast.unhide'):T('ast.hide'); if(hid) btn.title=T('ast.hidden'); row.appendChild(btn);
    }
  });
  return n;
}
$('#admin-modal').addEventListener('click', e=>{
  const b=e.target.closest('button[data-act]'); if(!b) return; const row=b.closest('.frow'); if(!row) return;
  if(b.dataset.act==='hide'){ hideId(row.dataset.key, row.dataset.name); flagAdminRows(); }
  else if(b.dataset.act==='unhide'){ unhideId(row.dataset.key, row.dataset.name); flagAdminRows(); }
});

/* ----- bug #9: the party bar shows its leave button while in a party ----- */
{ const _partyRefresh=partyRefresh;
  partyRefresh=function(){ _partyRefresh(); const b=$('#btn-party-leave'); if(b) b.hidden=!(mp && mp.connected); }; }

/* ----- bug #13: bans are compared with server-synced time, never the phone clock ----- */
applyBan=function(until, by){
  if(isAdmin()) return;
  try{ localStorage.setItem(BAN_KEY, JSON.stringify({until, by})); }catch(e){}
  if(mp) mpTeardown(); if(spectating) stopWatching(false); dropSpectators();
  if(state!=='idle'){ state='idle'; cancelAnimationFrame(rafId); clearTimeout(cdTimer); $('#countdown').hidden=true; $('#end').classList.remove('show'); showScreen('home'); }
  try{ speechSynthesis.cancel(); }catch(e){}
  const ov=$('#ban-overlay'); ov.classList.add('show');
  const tick=()=>{ const left=until-now(); if(left<=0){ ov.classList.remove('show'); clearInterval(banTimer); try{ localStorage.removeItem(BAN_KEY); }catch(e){} return; }
    const m=Math.ceil(left/60000); $('#ban-text').textContent=T('ban.text', by||'', m>=120 ? T('ban.hours', Math.ceil(m/60)) : T('ban.minutes', m)); };
  clearInterval(banTimer); banTimer=setInterval(tick, 1000); tick();
};
checkBan=async function(){
  if(isAdmin()) return;
  try{ const b=JSON.parse(localStorage.getItem(BAN_KEY)); if(b && b.until>now()) applyBan(b.until, b.by); }catch(e){}
  const name=normName(settings.name); if(!fbOn()||!name) return;
  const b=await fbReq('bans/'+fbKey(name),'GET');
  if(b && b.until>now()) applyBan(b.until, b.by);
};
kickPlayer=async function(name, key, minutes){                      // the ban end is stamped with server time too
  const until=now()+minutes*60000, by=normName(settings.name);
  if(fbOn()){ const r=await fbReq('bans/'+key,'PUT',{name, until, by, t:{'.sv':'timestamp'}}); if(r===undefined) toast(T('fb.down'),'warn'); }
  const c=await reach(name,'kick',4000);
  if(c){ try{ c.send({t:'kick', until, by}); }catch(e){} setTimeout(()=>{ try{ c.close(); }catch(e){} },500); }
  toast(T('adm.kicked', name),'warn'); refreshAdminLists();
};

/* ----- bug #15: "(1) Football Star" in the tab while something is claimable (a NextUp candidate; candidates may set claim:false to opt out) ----- */
function updateTitle(){
  let c=null; try{ c=NextUp.best(); }catch(e){}
  const claimable=!!(c && c.claim!==false);
  document.title=(claimable ? '(1) ' : '')+AST_BASE_TITLE; return claimable;
}
setInterval(updateTitle, ECON.stats.titlePoll);
Hooks.on('home', ()=>{ clearTimeout(updateTitle.t); updateTitle.t=setTimeout(updateTitle, 50); });

/* ----- bug #21: prefers-reduced-motion → body.reduced (CSS stops the decorative loops, confetti is skipped) ----- */
function applyMotionPref(on){ document.body.classList.toggle('reduced', !!on); return !!on; }
const reducedMotion = () => document.body.classList.contains('reduced');
{ try{ const mq=matchMedia('(prefers-reduced-motion: reduce)'); applyMotionPref(mq.matches); (mq.addEventListener ? mq.addEventListener('change', e=>applyMotionPref(e.matches)) : mq.addListener && mq.addListener(e=>applyMotionPref(e.matches))); }catch(e){}
  for(const cf of [typeof confetti!=='undefined' && confetti, typeof ceoConfetti!=='undefined' && ceoConfetti]) if(cf && typeof cf.burst==='function'){ const _b=cf.burst; cf.burst=function(n){ if(reducedMotion()) return; return _b(n); }; } }

I18N_ADD({
 'adm.stats':['📈 מדדים','📈 Metrics','📈 المقاييس','📈 Метрики'],
 'ast.dau':['שחקנים היום','Players today','لاعبون اليوم','Игроков сегодня'],
 'ast.dau14':['שחקנים בכל יום · 14 ימים','Players per day · 14 days','لاعبون كل يوم · 14 يومًا','Игроков в день · 14 дней'],
 'ast.mpd':['משחקים לשחקן','Matches per player','مباريات لكل لاعب','Матчей на игрока'],
 'ast.d1':['חוזרים למחרת','Back next day','يعودون في اليوم التالي','Возврат на след. день'],
 'ast.d7':['חוזרים אחרי שבוע','Back after a week','يعودون بعد أسبوع','Возврат через неделю'],
 'ast.coins':['מטבעות: הרוויחו / הוציאו','Coins: earned / spent','عملات: مكتسبة / منفقة','Монеты: заработано / потрачено'],
 'ast.matches':['משחקים','Matches','مباريات','Матчей'],
 'ast.new':['שחקנים חדשים','New players','لاعبون جدد','Новых игроков'],
 'ast.chests':['תיבות נפתחו','Chests opened','صناديق فُتحت','Сундуков открыто'],
 'ast.buys':['קניות','Purchases','مشتريات','Покупок'],
 'ast.shares':['שיתופים','Shares','مشاركات','Поделились'],
 'ast.sess':['כניסות למשחק','Sessions','جلسات','Сессий'],
 'ast.users':['שחקנים בשרת','Players on the server','لاعبون على الخادم','Игроков на сервере'],
 'ast.flags':['חשודים','Suspicious','مشبوهون','Подозрительных'],
 'ast.flag':['⚠️ חשוד','⚠️ Suspicious','⚠️ مشبوه','⚠️ Подозрительно'],
 'ast.14d':['14 ימים','14 days','14 يومًا','14 дней'],
 'ast.none':['אין נתונים עדיין','No data yet','لا توجد بيانات بعد','Пока нет данных'],
 'ast.boot':['עלה תוך {0} אלפיות','ready in {0} ms','جاهز خلال {0} مللي ثانية','готово за {0} мс'],
 'ast.hide':['🙈 הסתר','🙈 Hide','🙈 إخفاء','🙈 Скрыть'],
 'ast.unhide':['👁 הצג','👁 Show','👁 إظهار','👁 Показать'],
 'ast.hidden':['מוסתר מהטבלה','Hidden from the board','مخفي من الجدول','Скрыт из таблицы'],
 'ast.wave2':['כלל לשלב 2: חוזרים למחרת ≥ 35% ו-3+ משחקים לשחקן במשך שבועיים','Wave 2 rule: D1 ≥ 35% and 3+ matches per player over two weeks','قاعدة المرحلة 2: العودة في اليوم التالي ≥ 35% و3+ مباريات لكل لاعب لمدة أسبوعين','Правило волны 2: возврат ≥ 35% и 3+ матча на игрока за две недели'],
});
STATIC_ADD({'#adm-stats-h':'adm.stats'});

/* ----- load ----- */
statSessionStart();
applyLang();
