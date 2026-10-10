/* chests as drops: rarity roll with pity, face-down cards that flip, rewards granted on the pick */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const errs0=window.__errs.length; const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  const clickYes=async()=>{ await tick(); TASSERT('ask() shows before paying', $('#ask-modal').classList.contains('show')); $('#btn-ask-yes').click(); await tick(); };
  const tapOpen=async()=>{ for(let i=0;i<(ECON.chests.taps||3);i++){ chestTap(); await tick(); } await tick(650); for(let i=0;i<6;i++){ if(DROP.phase==='cards') break; await tick(700); } };
  prog.keys=0; prog.coins=0; prog.gems=0; prog.chests={}; prog.chestPick=null; prog.chestPity=0; prog.cos={items:[]}; prog.unlocked=[];
  openChestsScreen(); await tick();
  TASSERT('four chests with odds chips', document.querySelectorAll('#chests-row .chest-card').length===4 && document.querySelectorAll('#chests-row .ck-bronze .odds span').length===5);
  TASSERT('pity bar shown', $('#chests-foot .pity').textContent.includes(String(ECON.chests.pity)));
  TASSERT('nothing affordable → grey', $('[data-open=bronze]').classList.contains('off') && $('[data-open=legend]').classList.contains('off'));
  // --- odds and pity
  const rr=[...Array(400)].map(()=>chestRollRarity('bronze')); TASSERT('bronze mostly rare', rr.filter(r=>r==='rare').length>150 && rr.every(r=>ECON.chests.rarities.includes(r)));
  const lg=[...Array(400)].map(()=>chestRollRarity('legend')); TASSERT('legendary chest never plain rare, often legendary', !lg.includes('rare') && lg.filter(r=>r==='legendary').length>30);
  prog.chestPity=ECON.chests.pity-1; TASSERT('pity forces a legendary', chestRollRarity('bronze')==='legendary'); prog.chestPity=0;
  // --- cards
  for(const r of ECON.chests.rarities){ const cs=chestCards(r); TASSERT('3 distinct cards for '+r, cs.length===3 && new Set(cs.map(c=>c.t+(c.id||''))).size===3); }
  TASSERT('legendary cards hold big things', chestCards('legendary').some(c=>c.t==='char' || c.t==='power' || c.t==='cos' || c.t==='gems'));
  TASSERT('rare coins are small', chestCards('rare').filter(c=>c.t==='coins').every(c=>c.n<=50));
  // --- open a bronze with a key: tap → rarity → face-down cards → pick flips
  giveChest('bronze', true); buildChests(); const c0=prog.coins;
  $('[data-open=bronze]').click(); await tick();
  TASSERT('drop covers the stage, closed chest, no counter text', !$('#chest-drop').hidden && DROP.phase==='tap' && !/\d/.test($('#cd-hint').textContent));
  TASSERT('cards not shown yet', $('#cd-cards').hidden);
  chestTap(); await tick(); TASSERT('first tap shakes', $('#cd-chest').classList.contains('shake1') && DROP.phase==='tap');
  await tapOpen();
  TASSERT('rarity revealed with a background colour', DROP.phase==='cards' && $('#chest-drop').getAttribute('data-r')===prog.chestPick.rarity && !$('#cd-rarity').hidden);
  TASSERT('three face-down cards', document.querySelectorAll('#cd-cards .ccard').length===3 && document.querySelectorAll('#cd-cards .ccard.flipped').length===0);
  TASSERT('pick survives in prog', prog.chestPick && prog.chestPick.cards.length===3 && prog.chestPick.kind==='bronze');
  const card=prog.chestPick.cards[1]; const k0=prog.keys, g0=prog.gems, x0=prog.xpTotal|0, u0=prog.unlocked.length, i0=prog.cos.items.length;
  document.querySelectorAll('#cd-cards .ccard')[1].click(); await tick(1400);
  TASSERT('chosen card flips, others dimmed', document.querySelectorAll('#cd-cards .ccard')[1].classList.contains('flipped') && document.querySelectorAll('#cd-cards .ccard.lost').length===2 && !$('#btn-chest-done').hidden);
  const gained = card.t==='coins' ? prog.coins===c0+card.n : card.t==='keys' ? prog.keys===k0+card.n : card.t==='gems' ? prog.gems===g0+card.n : card.t==='xp' ? (prog.xpTotal|0)===x0+card.n : card.t==='char' ? prog.unlocked.length===u0+1 : card.t==='cos' ? prog.cos.items.length===i0+1 : !!prog[card.id];
  TASSERT('the picked card was granted ('+card.t+')', gained && !prog.chestPick);
  $('#btn-chest-done').click(); await tick(); TASSERT('done closes the drop', $('#chest-drop').hidden && DROP.phase==='idle');
  // --- reload safety: a pending pick comes back as cards
  prog.chestPick={kind:'silver', rarity:'epic', cards:chestCards('epic'), paid:'keys', all:false}; chestDropResume(); await tick();
  TASSERT('pending pick resumes at the cards', DROP.phase==='cards' && document.querySelectorAll('#cd-cards .ccard').length===3 && $('#chest-drop').getAttribute('data-r')==='epic');
  document.querySelectorAll('#cd-cards .ccard')[0].click(); await tick(1400); $('#btn-chest-done').click(); await tick();
  // --- keys path with the question, gems path for the legendary chest
  prog.keys=3; buildChests(); $('[data-open=silver]').click(); await tick(); $('#btn-ask-no').click(); await tick();
  TASSERT('no → keys kept', prog.keys===3 && $('#chest-drop').hidden);
  $('[data-open=silver]').click(); await clickYes(); TASSERT('yes → keys spent, drop started', prog.keys===0 && !$('#chest-drop').hidden);
  await tapOpen(); document.querySelector('#cd-cards .ccard').click(); await tick(1400); $('#btn-chest-done').click(); await tick();
  prog.gems=40; buildChests(); TASSERT('legendary chest offered for gems', $('[data-open=legend]').textContent===T('chests.openGems',40));
  $('[data-open=legend]').click(); await clickYes(); TASSERT('gems spent', prog.gems<=40-40+30 && !$('#chest-drop').hidden);
  await tapOpen(); TASSERT('legendary chest never rare', prog.chestPick.rarity!=='rare');
  document.querySelector('#cd-cards .ccard').click(); await tick(1400); $('#btn-chest-done').click(); await tick();
  // --- coins route counts toward the cap; closed at the cap
  prog.coins=150; prog.coinDay={key:dayKey(), n:0}; buildChests(); TASSERT('150 coins → bronze for coins', chestCanOpen('bronze')==='coins');
  prog.coinDay={key:dayKey(), n:coinCapToday()}; buildChests(); TASSERT('cap full → no coin route', chestCanOpen('bronze')===null);
  prog.coinDay={key:dayKey(), n:0};
  // --- welcome chest: all three flip and are granted
  prog.welcomeChest=false; prog.chests.welcome=1; prog.cos.items=[]; buildChests(); const w0=prog.coins, wk=prog.keys;
  $('#chests-welcome').click(); await tick(); await tapOpen(); await tick(2200);
  TASSERT('welcome: everything flipped and granted', document.querySelectorAll('#cd-cards .ccard.flipped').length===3 && cosOwned('kit_il') && prog.coins===w0+100 && prog.keys===wk+1 && !prog.chestPick);
  TASSERT('welcome only once', openWelcomeChest()===false);
  $('#btn-chest-done').click(); await tick();
  // --- badge + daily bronze
  prog.keys=1; TASSERT('badge counts an affordable bronze', chestsBadge()>=1);
  prog.chestDay={key:dayKey(), n:0}; const b0=prog.chests.bronze|0; TASSERT('free daily bronze once', claimDailyBronze()===true && prog.chests.bronze===b0+1 && claimDailyBronze()===false);
  closeChestsScreen();
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
