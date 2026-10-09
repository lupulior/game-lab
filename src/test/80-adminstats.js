/* 80-adminstats: measurement counters, heartbeat fields, stats PATCHes, admin dashboard, red flags, leaderboard bots, polish items */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const errs0=window.__errs.length;
  const today=dayKey(), yday=localDayKey(now()-864e5);
  // --- per-device counters
  TASSERT('session counted once at load', prog.m && prog.m.sess===1);
  const cE0=prog.m.cE|0, cS0=prog.m.cS|0; prog.coins=1000;
  addCoins(50,'test'); spendCoins(20);
  TASSERT('coins hook feeds cE / spend feeds cS', prog.m.cE===cE0+50 && prog.m.cS===cS0+20);
  // --- stub the server: capture every PATCH, answer GETs with fake data
  const calls=[]; const T0=Date.now();
  const USERS={ good:{name:'דני', w:12, tr:40, xp:900, t:T0, st:'idle', days:0b110, sess:4, cE:500, cS:100},
                cheat:{name:'רמאי', w:3, tr:9000, xp:10, t:T0, st:'idle', days:0b100, sess:1, cE:0, cS:0},
                rich:{name:'עשיר', w:200, tr:300, xp:900000, t:T0-9e5, days:0b10000110, sess:9, cE:1e6, cS:2e5},
                boss:{name:'בוס', w:1, tr:99999, xp:9e6, adm:true, t:T0, st:'idle', days:1} };
  const STATS={ [today]:{dau:3, matches:9, newPlayers:1, chests:2, buys:1, shares:4}, [yday]:{dau:6, matches:30, newPlayers:2, chests:5, buys:3, shares:1} };
  fbReq=async(p,m,b)=>{ calls.push([p,m,b]); if(m==='GET'){ if(p==='users') return USERS; if(p==='stats') return STATS; } return null; };
  const patches=()=>calls.filter(c=>c[0]==='stats/'+today && c[1]==='PATCH');
  prog.statDau={key:'never', n:0};                    // dau was already sent at init through the 'home' hook; force a fresh day
  Hooks.emit('matchEnd', {outcome:'win', training:false});
  TASSERT('matchEnd stamps the day', prog.m.days[today]===1 && prog.m.lastDay===today && (daysMask()&1)===1 && mMatchesToday()===1);
  TASSERT('matchEnd PATCHes stats/<day> matches + dau', patches().some(c=>c[2].matches && c[2].matches['.sv'].increment===1) && patches().some(c=>c[2].dau));
  const dauBefore=patches().filter(c=>c[2].dau).length;
  Hooks.emit('matchEnd', {outcome:'lose', training:false}); Hooks.emit('matchEnd', {outcome:'win', training:true});
  TASSERT('dau once per day, training not counted', patches().filter(c=>c[2].dau).length===dauBefore && prog.m.days[today]===2);
  statShare(); Hooks.emit('purchase', {type:'char'}); Hooks.emit('chest', {});
  TASSERT('share / buy / chest PATCHes', prog.m.sh===1 && patches().some(c=>c[2].shares) && patches().some(c=>c[2].buys) && patches().some(c=>c[2].chests));
  // --- the heartbeat carries the measurement fields
  const body={name:'x'}; Hooks.emit('heartbeat', body);
  TASSERT('heartbeat fields', body.sess===1 && body.days===daysMask() && body.mToday===2 && body.lastDay===today && body.cE===cE0+50 && body.cS===cS0+20 && body.sh===1 && body.lv===myLevel() && typeof body.fmt==='string');
  settings.name='בדיקה'; fbHeartbeat(true); await Promise.resolve();
  TASSERT('real heartbeat PATCH includes days bitmask', calls.some(c=>c[0].startsWith('users/') && c[1]==='PATCH' && typeof c[2].days==='number' && 'sess' in c[2]));
  // --- bans compare with server time (bug #13)
  prog.admin=false; try{ localStorage.setItem(BAN_KEY, JSON.stringify({until:Date.now()+60000, by:'t'})); }catch(e){}
  clockOffset=120000;                                // the server is 2 minutes ahead of this phone: the ban is already over in server time
  await checkBan(); const shown1=$('#ban-overlay').classList.contains('show');
  clockOffset=0; try{ localStorage.setItem(BAN_KEY, JSON.stringify({until:Date.now()+60000, by:'t'})); }catch(e){}
  await checkBan(); const shown2=$('#ban-overlay').classList.contains('show');
  $('#ban-overlay').classList.remove('show'); clearInterval(banTimer); try{ localStorage.removeItem(BAN_KEY); }catch(e){}
  TASSERT('ban uses now(): expired on the server = not shown, live = shown', !shown1 && shown2);
  // --- admin dashboard
  prog.admin=true; setupAdminUI(); $('#btn-admin').click();
  await new Promise(r=>setTimeout(r,20));
  TASSERT('admin panel opens with a metrics box', $('#admin-modal').classList.contains('show') && !!$('#adm-stats') && !$('#adm-stats').hidden);
  const tot=renderStats({days:STATS, users:USERS});
  TASSERT('renderStats: 14 bars, totals and D1 from bitmasks', $('#ast-bars').querySelectorAll('.ast-col').length===14 && tot.matches===39 && tot.dau===9
    && $('#ast-d1 b').textContent==='50%' && $('#ast-mpd b').textContent==='4.3' && $('#ast-flags b').textContent==='2' && $('#ast-coins b').textContent.includes('1,000,500'));
  TASSERT('metrics heading in Hebrew, 4-language strings present', $('#adm-stats-h').textContent===T('adm.stats') && I18N_RAW['ast.d1'].length===4 && I18N_RAW['ast.hide'].length===4);
  // --- red flags in the online list + one-tap hide
  await refreshAdminLists();
  const rows=[...document.querySelectorAll('#adm-online .frow.adm')];
  const cheatRow=rows.find(r=>r.dataset.key==='cheat'), goodRow=rows.find(r=>r.dataset.key==='good'), bossRow=rows.find(r=>r.dataset.key==='boss');
  TASSERT('cheater row red, honest and admin rows not', cheatRow && cheatRow.classList.contains('adm-flag') && !!cheatRow.querySelector('.ast-flag') && goodRow && !goodRow.classList.contains('adm-flag') && bossRow && !bossRow.classList.contains('adm-flag'));
  TASSERT('isFlagged rules', isFlagged(USERS.cheat) && isFlagged(USERS.rich) && !isFlagged(USERS.good) && !isFlagged(USERS.boss));
  cheatRow.querySelector('button[data-act=hide]').click(); await new Promise(r=>setTimeout(r,20));
  TASSERT('one-tap hide → HIDDEN_IDS + prog.hiddenNames', HIDDEN_IDS.includes('cheat') && prog.hiddenNames.includes('cheat') && document.querySelector('#adm-online .frow.adm[data-key=cheat]').classList.contains('adm-hidden'));
  $('#btn-adm-close').click();
  // --- leaderboard: no bots once a real player exists, hidden ids filtered
  await buildTop(); let names=[...document.querySelectorAll('#fr-top .frow')].map(r=>r.dataset.name);
  TASSERT('leaderboard: real rows, no bots, hidden cheater gone', names.includes('דני') && !names.includes('רמאי') && !LEADER_BOTS.some(b=>names.includes(b.name)));
  fbReq=async(p,m)=>{ if(p==='users'&&m==='GET') return {}; return null; }; astUsersCache=null;
  await buildTop(); names=[...document.querySelectorAll('#fr-top .frow')].map(r=>r.dataset.name);
  TASSERT('empty table still shows the friendly bots', LEADER_BOTS.every(b=>names.includes(b.name)));
  // --- party leave button (bug #9)
  mp={connected:true, role:'host', code:'ABCD', conns:[]}; partyRefresh();
  const leaveShown=!$('#btn-party-leave').hidden; mp=null; partyRefresh();
  TASSERT('party leave button shown in a party, hidden outside', leaveShown && $('#btn-party-leave').hidden);
  // --- document.title (bug #15)
  const fn=()=>({prio:1, icon:'🎁', text:'x', action(){}}); NextUp.add(fn);
  const t1=updateTitle(); const title1=document.title;
  NextUp.fns.splice(NextUp.fns.indexOf(fn),1); NextUp.add(()=>({prio:9, icon:'', text:'', action(){}, claim:false}));
  const t2=updateTitle();
  TASSERT('title shows (1) while claimable', t1 && title1.startsWith('(1) Football Star') && !t2 && document.title==='Football Star ⚽');
  // --- reduced motion (bug #21)
  applyMotionPref(true); const r1=document.body.classList.contains('reduced'); applyMotionPref(false);
  TASSERT('applyMotionPref toggles body.reduced', r1 && !document.body.classList.contains('reduced'));
  TASSERT('ECON.stats present', ECON.stats && ECON.stats.dash===14 && ECON.stats.flagTr===5000);
  TASSERT('no script errors during the module tests', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
