/* ===================================================================================================
   75-league — the monthly league (PLAN §7.1) + the league view on the leaderboard (§7.2, light) + "watch live".
   Season trophies live in prog.season={key:'YYYY-MM', tr, peak, floor}; lifetime prog.trophies are untouched.
   Per real match: win +4/+6/+8/+10/+12/+15 by level (online +10, classic +2 extra), draw +2, loss −4 but never
   below `floor` and never while in Bronze. Leagues: Bronze 0 · Silver 20 · Gold 50 · Platinum 100 · Diamond 200 ·
   Champion 400; crossing a threshold sets `floor` to it. When the month changes: prizes from the finished season's
   peak league (claimed from a modal, pending in prog.seasonPrize so a reload cannot lose it), then
   tr=min(100, floor(peak/2)), floor = tr>=20 ? 20 : 0, peak=tr.
   Public: seasonState() seasonPoints(info) seasonApply(info) leagueIndex(tr) leagueTier(tr) leagueName(i)
           leagueCheckRollover() leagueShowPrize() leagueClaimPrize() openLeagueModal() closeLeagueModal()
           leagueRowsFromUsers(usersObj) leagueTopHTML(rows) leagueRenderTop() leagueAddWatchButtons(box)
           leagueRefreshPill() leagueDaysLeft() leagueMonthKey()
   Heartbeat fields added: str (season trophies), sk (season key), lg (league index).
   Hooks emitted: 'leaguePrize'(leagueIndex) after a claim, 'leagueUp'(leagueIndex) on a promotion.
   =================================================================================================== */
I18N_ADD({
 'lg.t0':['ברונזה','Bronze','برونز','Бронза'], 'lg.t1':['כסף','Silver','فضة','Серебро'], 'lg.t2':['זהב','Gold','ذهب','Золото'],
 'lg.t3':['פלטינה','Platinum','بلاتين','Платина'], 'lg.t4':['יהלום','Diamond','ماس','Алмаз'], 'lg.t5':['אלוף','Champion','بطل','Чемпион'],
 'lg.n0':['ליגת ברונזה','Bronze League','دوري البرونز','Бронзовая лига'], 'lg.n1':['ליגת כסף','Silver League','دوري الفضة','Серебряная лига'],
 'lg.n2':['ליגת זהב','Gold League','دوري الذهب','Золотая лига'], 'lg.n3':['ליגת פלטינה','Platinum League','دوري البلاتين','Платиновая лига'],
 'lg.n4':['ליגת יהלום','Diamond League','دوري الماس','Алмазная лига'], 'lg.n5':['ליגת אלוף','Champion League','دوري الأبطال','Лига чемпионов'],
 'lg.pill':['🏅 {0} · {1}','🏅 {0} · {1}','🏅 {0} · {1}','🏅 {0} · {1}'],
 'lg.tab':['🏅 ליגה החודש','🏅 This month','🏅 دوري الشهر','🏅 Лига месяца'],
 'lg.watch':['👀 צפה','👀 Watch','👀 شاهد','👀 Смотреть'],
 'lg.title':['🏅 הליגה החודשית','🏅 Monthly league','🏅 الدوري الشهري','🏅 Лига месяца'],
 'lg.yours':['אתה ב{0}','You are in the {0}','أنت في {0}','Твоя лига: {0}'],
 'lg.tr':['🏅 {0} גביעי עונה','🏅 {0} season trophies','🏅 {0} كؤوس الموسم','🏅 {0} кубков сезона'],
 'lg.toNext':['עוד {0} 🏅 ל{1}','{0} 🏅 to the {1}','{0} 🏅 حتى {1}','Ещё {0} 🏅 до: {1}'],
 'lg.top':['🏆 אתה בליגה הכי גבוהה!','🏆 You are in the top league!','🏆 أنت في أعلى دوري!','🏆 Ты в высшей лиге!'],
 'lg.daysLeft':['⏳ עוד {0} ימים בעונה','⏳ {0} days left in the season','⏳ باقي {0} أيام في الموسم','⏳ Дней до конца сезона: {0}'],
 'lg.lastDay':['⏳ היום האחרון של העונה!','⏳ Last day of the season!','⏳ آخر يوم في الموسم!','⏳ Последний день сезона!'],
 'lg.prizes':['🎁 פרסים בסוף החודש','🎁 Prizes at the end of the month','🎁 جوائز نهاية الشهر','🎁 Призы в конце месяца'],
 'lg.how':['ניצחון +4 עד +15 · תיקו +2 · הפסד −4','Win +4 to +15 · draw +2 · loss −4','فوز +4 إلى +15 · تعادل +2 · خسارة −4','Победа +4…+15 · ничья +2 · поражение −4'],
 'lg.board':['🏅 הטבלה','🏅 Table','🏅 الجدول','🏅 Таблица'],
 'lg.close':['סגור','Close','إغلاق','Закрыть'],
 'lg.over':['🏆 העונה הסתיימה!','🏆 The season is over!','🏆 انتهى الموسم!','🏆 Сезон окончен!'],
 'lg.finished':['סיימת ב{0}!','You finished in the {0}!','أنهيت الموسم في {0}!','Ты закончил сезон в: {0}!'],
 'lg.take':['קבל! 🎉','Claim! 🎉','خذ! 🎉','Забрать! 🎉'],
 'lg.chest':['🎁 תיבת כסף','🎁 Silver chest','🎁 صندوق فضي','🎁 Серебряный сундук'],
 'lg.newSeason':['עונה חדשה התחילה — מתחילים עם {0} 🏅','A new season starts — you begin with {0} 🏅','بدأ موسم جديد — تبدأ بـ {0} 🏅','Новый сезон — начинаешь с {0} 🏅'],
 'lg.ecDelta':['🏅 {0} לעונה','🏅 {0} season','🏅 {0} للموسم','🏅 {0} сезон'],
 'lg.up':['🎉 עלית ל{0}!','🎉 Promoted to the {0}!','🎉 صعدت إلى {0}!','🎉 Ты в: {0}!'],
});
Object.assign(ECON, { league: {
  tiers:[{min:0, icon:'🥉'}, {min:20, icon:'🥈'}, {min:50, icon:'🥇'}, {min:100, icon:'💠'}, {min:200, icon:'💎'}, {min:400, icon:'👑'}],
  win:[4,6,8,10,12,15], online:10, classic:2, draw:2, loss:-4, carryMax:100,
  prizes:[null, {coins:100}, {coins:200, keys:1}, {coins:300, gems:10}, {coins:500, gems:25}, {coins:800, gems:50}],   // by league index; everyone ≥ Silver also gets a silver chest
  chestFrom:1,
}});
const LEAGUE = { view:'top', pillBound:false };

/* ----- season state ----- */
function leagueMonthKey(){ return dayKey().slice(0,7); }
function seasonState(){
  if(!prog.season || typeof prog.season!=='object'){ prog.season={key:leagueMonthKey(), tr:0, peak:0, floor:0}; saveProg(); }
  const s=prog.season; if(!s.key) s.key=leagueMonthKey(); s.tr=s.tr|0; s.floor=s.floor|0; s.peak=Math.max(s.peak|0, s.tr);
  return s;
}
function leagueIndex(tr){ const t=ECON.league.tiers; let i=0; for(let k=0;k<t.length;k++) if((tr|0)>=t[k].min) i=k; return i; }
function leagueTier(tr){ return ECON.league.tiers[leagueIndex(tr)]; }
function leagueName(i){ return T('lg.n'+Math.max(0,Math.min(5,i|0))); }
function leagueShort(i){ return T('lg.t'+Math.max(0,Math.min(5,i|0))); }
function leagueIcon(i){ return ECON.league.tiers[Math.max(0,Math.min(5,i|0))].icon; }
function leagueBadge(i){ i=Math.max(0,Math.min(5,i|0)); return '<span class="lg-badge lg-'+i+'">'+leagueIcon(i)+' '+esc(leagueShort(i))+'</span>'; }
function leagueDaysLeft(){ const p=dayKey().split('-').map(Number); const dim=new Date(p[0], p[1], 0).getDate(); return Math.max(0, dim-p[2]); }
/* pure: how many season trophies a finished match is worth (before floor rules) */
function seasonPoints(info){
  if(!info || info.training) return 0; const L=ECON.league;
  if(info.outcome==='win'){ let p = info.online ? L.online : L.win[Math.max(0, Math.min(5, info.level|0))]; if(info.fmt==='classic') p+=L.classic; return p; }
  if(info.outcome==='draw') return L.draw;
  if(info.outcome==='lose') return L.loss;
  return 0;
}
/* applies a match to prog.season: the floor rule, the Bronze no-loss rule, peak and floor tracking */
function seasonApply(info){
  const s=seasonState(), want=seasonPoints(info), before=s.tr|0, lgBefore=leagueIndex(before);
  let after=before;
  if(want>0) after=before+want;
  else if(want<0 && before>=ECON.league.tiers[1].min) after=Math.max(s.floor|0, before+want);
  s.tr=after; if(after>(s.peak|0)) s.peak=after;
  const fl=leagueTier(after).min; if(fl>(s.floor|0)) s.floor=fl;
  saveProg();
  return {want, delta:after-before, tr:after, lgBefore, lgAfter:leagueIndex(after)};
}
/* a new month: remember the prize of the finished season, carry half the peak (max 100), reset the floor */
function leagueCheckRollover(){
  const s=seasonState(), cur=leagueMonthKey(); if(s.key===cur) return false;
  const peak=Math.max(s.peak|0, s.tr|0), lg=leagueIndex(peak);
  if(lg>=ECON.league.chestFrom && !prog.seasonPrize) prog.seasonPrize={key:s.key, league:lg};
  const tr=Math.min(ECON.league.carryMax, Math.floor(peak/2));
  s.key=cur; s.tr=tr; s.floor = tr>=ECON.league.tiers[1].min ? ECON.league.tiers[1].min : 0; s.peak=tr;
  saveProg(); return true;
}
function leaguePrizeHTML(i){
  const p=ECON.league.prizes[Math.max(0,Math.min(5,i|0))]; if(!p) return '';
  const bits=[]; if(p.coins) bits.push('🪙 '+fmtNum(p.coins)); if(p.keys) bits.push('🔑 '+p.keys); if(p.gems) bits.push('💎 '+p.gems);
  if(i>=ECON.league.chestFrom) bits.push(T('lg.chest'));
  return bits.map(b=>'<span class="lg-prize">'+b+'</span>').join('');
}
/* the end-of-season modal: shown once on the home screen while a prize is pending */
function leagueShowPrize(){
  const p=prog.seasonPrize; if(!p) return false;
  const m=$('#league-prize-modal'); if(!m || m.classList.contains('show')) return false;
  if((typeof mp!=='undefined' && mp) || state!=='idle' || !$('#home').classList.contains('active')) return false;
  const lg=Math.max(1, Math.min(5, p.league|0));
  $('#lgp-title').textContent=T('lg.over'); $('#lgp-icon').textContent=leagueIcon(lg); $('#lgp-icon').className='lgp-icon lg-'+lg;
  $('#lgp-sub').textContent=T('lg.finished', leagueName(lg)); $('#lgp-list').innerHTML=leaguePrizeHTML(lg);
  $('#lgp-new').textContent=T('lg.newSeason', seasonState().tr|0); $('#btn-lg-take').textContent=T('lg.take');
  m.classList.add('show'); return true;
}
function leagueClaimPrize(){
  const p=prog.seasonPrize; if(!p) return false;
  const lg=Math.max(1, Math.min(5, p.league|0)), pr=ECON.league.prizes[lg]||{};
  delete prog.seasonPrize; saveProg();
  const m=$('#league-prize-modal'); if(m) m.classList.remove('show');
  if(pr.coins) addCoins(pr.coins, 'league'); if(pr.gems) addGems(pr.gems, 'league'); if(pr.keys) addKeys(pr.keys, 'league');
  if(lg>=ECON.league.chestFrom && typeof giveChest==='function') giveChest('silver');
  try{ sfx.win(); confetti.burst(220); }catch(e){}
  Hooks.emit('leaguePrize', lg); leagueRefreshPill(); return true;
}

/* ----- the league modal (from the home pill) ----- */
function openLeagueModal(){
  const m=$('#league-modal'); if(!m) return; const s=seasonState(), i=leagueIndex(s.tr), tiers=ECON.league.tiers, next=tiers[i+1]||null;
  $('#lg-title').textContent=T('lg.title'); $('#lg-icon').textContent=leagueIcon(i); $('#lg-icon').className='lg-icon lg-'+i;
  $('#lg-name').textContent=T('lg.yours', leagueName(i)); $('#lg-tr').textContent=T('lg.tr', s.tr|0);
  const from=tiers[i].min, to=next ? next.min : from, pct = next ? Math.min(100, Math.round(((s.tr|0)-from)/(to-from)*100)) : 100;
  $('#lg-bar i').style.width=pct+'%'; $('#lg-bar').className='lg-bar lg-'+i;
  $('#lg-next').textContent = next ? T('lg.toNext', Math.max(0, to-(s.tr|0)), leagueName(i+1)) : T('lg.top');
  const d=leagueDaysLeft(); $('#lg-days').textContent = d>0 ? T('lg.daysLeft', d) : T('lg.lastDay');
  $('#lg-how').textContent=T('lg.how'); $('#lg-prizes-h').textContent=T('lg.prizes');
  $('#lg-table').innerHTML = tiers.map((t,k)=>'<div class="lg-row lg-'+k+(k===i?' cur':'')+'"><span class="lg-cell lg-who">'+leagueBadge(k)+'</span><span class="lg-cell lg-min">🏅 '+t.min+'</span><span class="lg-cell lg-gift">'+(leaguePrizeHTML(k)||'—')+'</span></div>').join('');
  $('#btn-lg-board').textContent=T('lg.board'); $('#btn-lg-close').textContent=T('lg.close');
  m.classList.add('show');
}
function closeLeagueModal(){ const m=$('#league-modal'); if(m) m.classList.remove('show'); }

/* ----- the home pill: "🏅 ליגת כסף · 23" inside #home-trophy (bottom-left column), above the trophy pill ----- */
function leagueEnsurePill(){
  let b=$('#home-league'); if(b) return b;
  const col=$('#home-trophy'), tp=$('#trophy-pill'); if(!col && !tp) return null;
  b=document.createElement('button'); b.className='pill league'; b.id='home-league'; b.type='button';
  b.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} openLeagueModal(); });
  if(col) col.insertBefore(b, col.firstChild); else tp.parentNode.insertBefore(b, tp);   // home v2 column, or (without 90-home) right before the core's trophy pill
  return b;
}
function leagueRefreshPill(){
  const b=leagueEnsurePill(); if(!b) return;
  const s=seasonState(), i=leagueIndex(s.tr);
  b.textContent=T('lg.pill', leagueShort(i), s.tr|0); b.className='pill league lg-'+i; if(typeof fitText==='function') fitText(b, 12);
}
function leagueHomeTick(){ leagueCheckRollover(); leagueRefreshPill(); if(prog.seasonPrize) setTimeout(leagueShowPrize, 700); }

/* ----- leaderboard: the league view + watch buttons ----- */
function leagueWatchButtonHTML(){ return '<button class="btn small purple lg-watch" data-act="watch">'+esc(T('lg.watch'))+'</button>'; }
/* adds "👀 watch" to every rendered row whose player is in a match right now (the core's #fr-top click handler routes data-act=watch to watchFriend) */
function leagueAddWatchButtons(box){
  box=box||$('#fr-top'); if(!box) return 0; let n=0;
  box.querySelectorAll('.frow[data-name]').forEach(row=>{
    if(row.classList.contains('mine') || !row.querySelector('.dot.match') || row.querySelector('[data-act=watch]')) return;
    const st=row.querySelector('.fstat'); const b=document.createElement('span'); b.innerHTML=leagueWatchButtonHTML(); const btn=b.firstChild;
    if(st && st.nextSibling) row.insertBefore(btn, st.nextSibling); else row.appendChild(btn); n++;
  });
  return n;
}
function leagueHiddenRow(r){
  if(typeof isHiddenId==='function') return isHiddenId(r.key, r.name);
  const hidden=new Set((typeof HIDDEN_NAMES!=='undefined' ? HIDDEN_NAMES : []).concat((typeof LEADER_BOTS!=='undefined' ? LEADER_BOTS : []).map(b=>b.name)).map(n=>n.toLowerCase()));
  return hidden.has((r.name||'').toLowerCase());
}
/* pure: users/<key> objects → rows with this month's season trophies (a stale season key counts as 0) */
function leagueRowsFromUsers(all){
  const cur=leagueMonthKey(); if(!all || typeof all!=='object') return [];
  return Object.entries(all).filter(([k,u])=>u && u.name).map(([k,u])=>({key:k, name:normName(u.name), w:u.w|0, c:u.c|0, xp:u.xp|0, tr:u.tr|0, str: u.sk===cur ? (u.str|0) : 0, lg: u.sk===cur ? leagueIndex(u.str|0) : 0, online:fbOnline(u), st:u.st, adm:!!u.adm})).filter(r=>!leagueHiddenRow(r));
}
/* pure: the league table markup from rows {name,w,c,str,online,st,adm,me?} — sorted by season trophies, then wins, then cups; my row highlighted */
function leagueTopHTML(rows){
  const me=normName(settings.name).toLowerCase();
  rows=(rows||[]).slice().sort((a,b)=>(b.str|0)-(a.str|0) || (b.w|0)-(a.w|0) || (b.c|0)-(a.c|0)).slice(0,25);
  const medal=i=>i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.';
  if(!rows.length) return '<div class="hint" style="text-align:center;margin-top:20px">'+T('friends.empty')+'</div>';
  return rows.map((r,i)=>{ const mine=r.me||(r.name||'').toLowerCase()===me, lg=leagueIndex(r.str|0), live=!!r.online && r.st==='match';
    return '<div class="frow top lg '+(mine?'mine':'')+'" data-name="'+esc(r.name)+'"><span class="rank">'+medal(i)+'</span><span class="dot '+(r.online?(live?'match':'online'):'offline')+'"></span><span class="fname">'+esc(crown(r.name, r.adm||(mine&&isAdmin())))+(mine?' <small>('+T('mp.you')+')</small>':'')+'</span>'+leagueBadge(lg)+'<span class="fstat">🏅 '+(r.str|0)+'</span>'
      +(live && !mine ? leagueWatchButtonHTML() : '')
      +(mine||r.bot ? '' : '<button class="btn small blue" data-act="view">'+T('friends.view')+'</button>'+(prog.friends[r.name] ? '' : '<button class="btn small yellow" data-act="add">'+T('friends.add')+'</button>'))+'</div>'; }).join('');
}
/* the league view of #fr-top: one more read of users/ (the wins view already made its own) */
async function leagueRenderTop(){
  const box=$('#fr-top'); if(!box) return; box.innerHTML='<div class="hint" style="text-align:center;margin-top:20px">'+T('friends.checking')+'</div>';
  let rows=null, server=false;
  if(fbOn()){ const all=await fbReq('users','GET'); if(all){ server=true; rows=leagueRowsFromUsers(all); } }
  if(LEAGUE.view!=='league' || !box.isConnected) return;                       // the kid switched tabs while we were reading
  const myName=normName(settings.name), s=seasonState();
  if(!rows){ rows=Object.keys(prog.friends).filter(n=>n.toLowerCase()!==myName.toLowerCase()).map(n=>({name:n, w:prog.friends[n].w|0, c:prog.friends[n].c|0, str:0, online:!!prog.friends[n].online, st:prog.friends[n].st})); }
  if(!rows.some(r=>r.me || (r.name||'').toLowerCase()===myName.toLowerCase())) rows.push({name:myName||T('mp.you'), w:loadStats().w|0, c:loadStats().c|0, str:s.tr|0, online:true, me:true});
  box.innerHTML=(server ? '' : '<div class="hint" style="text-align:center">'+T('friends.topNeedsServer')+'</div>')+leagueTopHTML(rows);
}
function leagueAfterTop(){ if(LEAGUE.view==='league') return leagueRenderTop(); leagueAddWatchButtons($('#fr-top')); }
/* the tab button + the wrappers; installed after every module loaded (80-adminstats replaces buildTop outright) */
function leagueInstall(){
  const tabs=document.querySelector('#friends .fr-tabs');
  if(tabs && !$('#fr-tab-league')){ const b=document.createElement('button'); b.className='btn small purple'; b.id='fr-tab-league'; b.textContent=T('lg.tab'); b.addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} showFrTab('league'); }); tabs.appendChild(b); }
  if(typeof buildTop==='function' && !buildTop._league){ const orig=buildTop; buildTop=async function(){ const r=await orig.apply(this, arguments); try{ await leagueAfterTop(); }catch(e){ console.error('league top', e); } return r; }; buildTop._league=true; }
  if(typeof showFrTab==='function' && !showFrTab._league){ const orig=showFrTab; showFrTab=function(which){ LEAGUE.view = which==='league' ? 'league' : 'top'; const r=orig.call(this, which==='league' ? 'top' : which); const lt=$('#fr-tab-league'); if(lt) lt.classList.toggle('on', which==='league'); if(which==='league') $('#fr-tab-top').classList.remove('on'); return r; }; showFrTab._league=true; }
}

/* ----- wiring ----- */
Hooks.on('matchEnd', info=>{
  if(!info || info.training || (typeof spectating!=='undefined' && spectating)) return;
  const res=seasonApply(info); leagueRefreshPill();
  const txt=T('lg.ecDelta', (res.delta>0?'+':'')+res.delta);
  const earn=$('#endcard-earn');
  if(typeof endcardRow==='function' && earn && !earn.hidden){
    const span=document.createElement('span'); span.className='ec-big lg-ec lg-'+res.lgAfter; span.id='endcard-league'; span.textContent=txt;
    const extra=earn.querySelector('.ec-row.ec-extra');
    if(extra) extra.appendChild(span);
    else {
      const r=endcardRow('ec-extra ec-league'); r.appendChild(span); earn.appendChild(r);
      const n=earn.querySelectorAll('.ec-row').length, reveal=()=>r.classList.add('ec-on');
      if(typeof endcardNoMotion==='function' && endcardNoMotion()) reveal(); else { const t=setTimeout(reveal, 250+300*n); if(typeof ENDCARD!=='undefined' && ENDCARD && ENDCARD.timers) ENDCARD.timers.push(t); }
    }
  } else if(res.delta) setTimeout(()=>toast(txt,'xp'), 900);
  if(res.lgAfter>res.lgBefore){ setTimeout(()=>{ toast(T('lg.up', leagueName(res.lgAfter)),'ach'); try{ confetti.burst(160); }catch(e){} }, 1400); Hooks.emit('leagueUp', res.lgAfter); }
});
Hooks.on('heartbeat', body=>{ const s=seasonState(); body.str=s.tr|0; body.sk=s.key; body.lg=leagueIndex(s.tr); });
Hooks.on('home', leagueHomeTick);
Hooks.on('wallet', ()=>{ if($('#home-league')) leagueRefreshPill(); });
Hooks.on('screen', id=>{ if(id==='home') setTimeout(leagueHomeTick, 60); });
$('#btn-lg-take').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} leagueClaimPrize(); });
$('#btn-lg-close').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} closeLeagueModal(); });
$('#btn-lg-board').addEventListener('click', ()=>{ try{ sfx.click(); }catch(e){} closeLeagueModal(); if(typeof openFriends==='function'){ openFriends(); showFrTab('league'); } });
$('#league-modal').addEventListener('click', e=>{ if(e.target===$('#league-modal')) closeLeagueModal(); });
STATIC_ADD({'#fr-tab-league':'lg.tab', '#lg-title':'lg.title', '#btn-lg-close':'lg.close', '#btn-lg-board':'lg.board', '#lgp-title':'lg.over', '#btn-lg-take':'lg.take'});
{ const _lgApplyLang=applyLang; applyLang=function(){ const r=_lgApplyLang.apply(this, arguments); if($('#home-league')) leagueRefreshPill(); return r; }; }
leagueCheckRollover(); leagueInstall(); setTimeout(leagueInstall, 0);
applyLang();
