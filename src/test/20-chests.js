/* chests: inventory, the screen, opening every kind through the DOM, pick 1 of 3, welcome chest, daily bronze, badge */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const tick=()=>new Promise(r=>setTimeout(r,30));
  const errs0=window.__errs.length;
  const clickYes=async()=>{ await tick(); TASSERT('ask() shows before paying', $('#ask-modal').classList.contains('show')); $('#btn-ask-yes').click(); await tick(); await openTaps(); };
  const openTaps=async()=>{ if(!$('#copen-chest').classList.contains('locked')) return; for(let i=0;i<(ECON.chests.taps||3);i++){ chestTap(); } await new Promise(r=>setTimeout(r,500)); };
  const offered=()=>[...document.querySelectorAll('#copen-cards .cpick')].map(b=>b.dataset.id);
  const owned=()=>((prog.cos&&prog.cos.items)||[]).slice();
  // --- clean wallet
  Object.assign(prog, {coins:0, gems:0, keys:0, chests:null, packs:0, chestPick:null, chestOpened:null, welcomeChest:false, cos:{items:[]}, chestDay:null});
  TASSERT('ECON.chests holds the numbers', ECON.chests.bronze.keys===1 && ECON.chests.silver.coins===500 && ECON.chests.gold.gems===25 && ECON.chests.gold.give.coins===900 && ECON.chests.packCoins===0 && ECON.chests.missingCard===100);
  // --- #8/#9: no chest sold for coins can return as many coins as it costs (packs pay 0 until the album, a coin card 100)
  TASSERT('invariant: coin price > max coin return for every kind sold for coins', ECON.chests.kinds.every(k=>!ECON.chests[k].coins || ECON.chests[k].coins>chestCoinReturn(k)) && chestCoinReturn('bronze')===80 && chestCoinReturn('silver')===400);
  TASSERT('shop silver deal (when the shop exists) is never a coin printer: deal ≥ coins + packs + a dry-pool coin card', !ECON.shop || ECON.shop.silverDeal>=chestCoinReturn('silver'));
  { const pc=ECON.chests.packCoins; ECON.chests.packCoins=100; prog.coins=150; prog.keys=0;
    TASSERT('a chest that would print coins loses its coin route', chestCoinPrice('bronze')===0 && chestCanOpen('bronze')===null);
    ECON.chests.packCoins=pc; prog.coins=0; TASSERT('coin route back when the price is safe', chestCoinPrice('bronze')===150); }
  TASSERT('week-reserved cosmetics never reach a chest without the shop module', COSMETICS.filter(c=>c.week).length>0 && COSMETICS.filter(c=>c.week).every(c=>!chestCosAvailable(c)));
  if(typeof shopAvailable==='function'){ TASSERT('…and follow shopAvailable() when the shop exists', COSMETICS.filter(c=>c.week).every(c=>chestCosAvailable(c)===!!shopAvailable(c))); }
  else { window.shopAvailable=()=>true; TASSERT('…and follow shopAvailable() when the shop exists', COSMETICS.filter(c=>c.week).every(c=>chestCosAvailable(c))); delete window.shopAvailable; }
  TASSERT('pack text says "soon" in 4 languages', I18N_RAW['chests.pack1'].every(s=>/בקרוב|soon|قريبًا|скоро/.test(s)) && I18N_RAW['chests.packs'].every(s=>/בקרוב|soon|قريبًا|скоро/.test(s)));
  // --- giveChest + hook
  let hooked=null; Hooks.on('chest', k=>{ hooked=k; });
  TASSERT('giveChest adds to the inventory + hook', giveChest('bronze')===true && prog.chests.bronze===1 && hooked==='bronze');
  TASSERT('chestsBadge counts the owned chest', chestsBadge()===1);
  const nu=NextUp.best(); TASSERT('NextUp candidate prio 40', !!nu && nu.prio===40 && typeof nu.action==='function' && nu.text.length>0);
  // --- the screen
  openChestsScreen();
  TASSERT('chests screen shows 3 chest cards', $('#chests').classList.contains('active') && document.querySelectorAll('#chests-row .chest-card').length===3);
  TASSERT('bronze card shows "you have 1" and a green OPEN', $('#chests-row .chest-card.ck-bronze .have').textContent===T('chests.have',1) && $('[data-open=bronze]').classList.contains('green') && $('[data-open=bronze]').textContent===T('chests.openOwned'));
  TASSERT('silver/gold unaffordable → grey buttons', $('[data-open=silver]').classList.contains('off') && $('[data-open=gold]').classList.contains('off'));
  TASSERT('wallet pill shows keys', $('#chests-wallet .k').textContent.includes('🔑 0'));
  // --- open the owned bronze through the DOM (no ask, no pick)
  prog.coinDay={key:dayKey(), n:0};
  let c0=prog.coins; $('[data-open=bronze]').click(); await tick();
  TASSERT('a paid chest arrives closed: tap hint, no rewards yet', $('#copen-chest').classList.contains('locked') && !$('#copen-tap').hidden && $('#copen-rewards').children.length===0 && $('#btn-chest-done').hidden);
  chestTap(); await tick(); TASSERT('first tap shakes', $('#copen-chest').classList.contains('shake1') && $('#copen-tap').textContent===T('chests.tapN',2));
  await openTaps();
  TASSERT('after the taps the chest is open', !$('#copen-chest').classList.contains('locked') && $('#copen-tap').hidden);
  TASSERT('bronze opens without asking', !$('#ask-modal').classList.contains('show') && $('#chest-open-modal').classList.contains('show'));
  TASSERT('bronze: 80 coins + 1 pack (0 coins, counted) + inventory 0', prog.coins===c0+80 && prog.packs===1 && prog.chests.bronze===0 && prog.chestOpened.bronze===1);
  TASSERT('an owned chest does not touch the daily cap', (prog.coinDay?prog.coinDay.n:0)===0 && coinCapLeft()===coinCapToday());
  TASSERT('bronze: no pick, done button visible, pack chip without a coin value', $('#copen-cards').hidden && !$('#btn-chest-done').hidden && document.querySelectorAll('#copen-rewards span').length===2 && !$('#copen-rewards').textContent.includes('= 🪙'));
  $('#btn-chest-done').click(); await tick();
  prog.coins=150; buildChests();
  TASSERT('done closes the modal; 150 coins → bronze now offers coins', !$('#chest-open-modal').classList.contains('show') && $('[data-open=bronze]').textContent===T('chests.openCoins','150') && chestCanOpen('bronze')==='coins');
  // --- #8: opening for coins is a net loss (150 → 80), and a full daily cap pays nothing but says so
  $('[data-open=bronze]').click(); await clickYes();
  TASSERT('bronze for coins: 150 paid, 80 back, counted in the cap', prog.coins===80 && prog.coinDay.n===80); $('#btn-chest-done').click(); await tick();
  prog.coinDay={key:dayKey(), n:coinCapToday()}; prog.coins=150; buildChests(); c0=prog.coins;
  TASSERT('cap reached: the coin route is closed, nothing is charged', chestCanOpen('bronze')===null && $('[data-open=bronze]').classList.contains('off'));
  TASSERT('cap reached: openChest refuses for coins', (await openChest('bronze'))===false && prog.coins===c0);
  prog.coinDay={key:dayKey(), n:0};
  // --- not enough: openChest refuses
  prog.coins=0; buildChests();
  TASSERT('no coins → bronze button grey', $('[data-open=bronze]').classList.contains('off'));
  TASSERT('openChest refuses when nothing can pay', (await openChest('bronze'))===false && !$('#chest-open-modal').classList.contains('show'));
  // --- silver with keys: ask → no → nothing spent
  prog.keys=3; buildChests();
  TASSERT('with 3 keys the silver button offers keys', $('[data-open=silver]').textContent===T('chests.openKeys',3) && chestCanOpen('silver')==='keys');
  $('[data-open=silver]').click(); await tick(); $('#btn-ask-no').click(); await tick();
  TASSERT('ask no → keys kept, no chest', prog.keys===3 && !$('#chest-open-modal').classList.contains('show') && !prog.chestPick);
  // --- silver with keys: ask → yes → rewards + pick 1 of 3 rare
  c0=prog.coins; $('[data-open=silver]').click(); await clickYes();
  TASSERT('silver: 3 keys spent, 300 coins in full (keys are not capped), 2 packs', prog.keys===0 && prog.coins===c0+300 && prog.packs===4 && prog.coinDay.n===0);
  let ids=offered();
  TASSERT('silver offers 3 face-up cards', $('#chest-open-modal').classList.contains('show') && !$('#copen-cards').hidden && ids.length===3);
  TASSERT('all 3 are distinct unowned rare cosmetics', new Set(ids).size===3 && ids.every(id=>cosById(id) && cosById(id).rarity==='rare' && !cosOwned(id)));
  TASSERT('pending offer saved in prog (reload-safe)', !!prog.chestPick && prog.chestPick.kind==='silver' && prog.chestPick.ids.join()===ids.join());
  TASSERT('offer is deterministic for day+kind+count', chestPickOffer('silver', 0).ids.join()===ids.join() && chestPickOffer('silver', 0).ids.join()===chestPickOffer('silver', 0).ids.join());
  TASSERT('done hidden until a card is picked', $('#btn-chest-done').hidden);
  const pick=ids[1], before=owned(); document.querySelectorAll('#copen-cards .cpick')[1].click(); await tick();
  const after=owned();
  TASSERT('picking adds exactly that id', after.length===before.length+1 && after.includes(pick) && !after.includes(ids[0]) && !after.includes(ids[2]) && !prog.chestPick);
  TASSERT('chosen card marked, others lost, done shown', $('#copen-cards .cpick.chosen').dataset.id===pick && document.querySelectorAll('#copen-cards .cpick.lost').length===2 && !$('#btn-chest-done').hidden);
  document.querySelectorAll('#copen-cards .cpick')[0].click(); await tick();
  TASSERT('a second tap gives nothing', owned().length===after.length);
  $('#btn-chest-done').click(); await tick();
  // --- gold with gems: confetti, 5 gems, epic pick with a kit
  prog.gems=30; prog.coinDay={key:dayKey(), n:0}; buildChests(); c0=prog.coins;
  TASSERT('gold button offers gems', $('[data-open=gold]').textContent===T('chests.openGems',25));
  $('[data-open=gold]').click(); await clickYes();
  const goldCoins=900;                                   // gem-bought: paid in full, never capped
  TASSERT('gold: 25 gems paid, +5 gems, 900 coins in full, 3 packs', prog.gems===10 && prog.coins===c0+goldCoins && prog.packs===7 && prog.coinDay.n===0 && !$('#copen-rewards span.capped'));
  ids=offered();
  TASSERT('gold offers 3 unowned epics, one is a kit', ids.length===3 && ids.every(id=>cosById(id).rarity==='epic' && !cosOwned(id)) && ids.some(id=>cosById(id).type==='kit'));
  TASSERT('gold confetti canvas visible', !$('#chests-confetti').hidden);
  document.querySelectorAll('#copen-cards .cpick')[0].click(); await tick(); $('#btn-chest-done').click(); await tick();
  TASSERT('gold pick landed', cosOwned(ids[0]));
  // --- owned items are never offered: own every epic but two → pool short → rare fallback, no owned ids
  prog.chestPick=null; const epics=COSMETICS.filter(c=>c.rarity==='epic' && !c.week).map(c=>c.id);
  prog.cos.items=[...new Set([...prog.cos.items, ...epics.slice(0, epics.length-2)])];
  let off=chestPickOffer('gold', 7);
  TASSERT('short epic pool falls back to rare, never an owned id', off.ids.length===3 && off.ids.every(id=>!cosOwned(id) && cosById(id)) && off.ids.filter(id=>cosById(id).rarity==='epic').length===2 && off.ids.filter(id=>cosById(id).rarity==='rare').length===1);
  // --- every rare and epic owned → coin cards worth 100 (counted toward the cap too)
  prog.cos.items=[...new Set([...prog.cos.items, ...COSMETICS.filter(c=>c.rarity!=='legendary').map(c=>c.id)])];
  prog.keys=3; prog.coinDay={key:dayKey(), n:0}; buildChests(); c0=prog.coins; $('[data-open=silver]').click(); await clickYes();
  ids=offered();
  TASSERT('dry pools → three 🪙100 cards', ids.length===3 && ids.every(id=>id==='coins') && document.querySelector('#copen-cards .cpick .pname').textContent===T('chests.coinCard','100'));
  const c1=prog.coins; document.querySelectorAll('#copen-cards .cpick')[2].click(); await tick();
  TASSERT('coin card pays 100, counted in the cap', prog.coins===c1+100 && !prog.chestPick && prog.coinDay.n===100);
  $('#btn-chest-done').click(); await tick();
  // --- welcome chest: 100 coins + kit_il, once
  prog.cos.items=[]; prog.welcomeChest=false; prog.chests.welcome=1; buildChests();
  TASSERT('welcome banner shows when prog.chests.welcome>0', !$('#chests-welcome').hidden);
  c0=prog.coins; $('#chests-welcome').click(); await tick(); await openTaps();
  TASSERT('welcome chest: +100 coins + kit_il', prog.coins===c0+100 && cosOwned('kit_il') && prog.welcomeChest===true && prog.chests.welcome===0 && $('#chest-open-modal').classList.contains('show'));
  $('#btn-chest-done').click(); await tick();
  TASSERT('welcome chest only once', openWelcomeChest()===false && prog.coins===c0+100 && prog.cos.items.filter(x=>x==='kit_il').length===1 && $('#chests-welcome').hidden);
  // --- free daily bronze
  const b0=prog.chests.bronze;
  TASSERT('claimDailyBronze gives one bronze per day', claimDailyBronze()===true && prog.chests.bronze===b0+1 && claimDailyBronze()===false && prog.chests.bronze===b0+1 && prog.chestDay.key===dayKey() && prog.chestDay.n===1);
  prog.chestDay={key:'2000-01-01', n:1}; TASSERT('a new day resets the free bronze', claimDailyBronze()===true && prog.chests.bronze===b0+2);
  // --- badge: inventory + kinds affordable with keys
  prog.keys=8; TASSERT('badge = 2 owned bronze + silver + gold by keys', chestsBadge()===4);
  prog.keys=0; prog.chests.bronze=0; { const b=NextUp.best(); TASSERT('badge 0 when nothing can open, no chests next-up', chestsBadge()===0 && !(b && b.action===openChestsScreen)); }
  // --- back to home
  $('#btn-chests-back').click(); await tick();
  TASSERT('back goes home', $('#home').classList.contains('active'));
  TASSERT('4 languages for every chest string', Object.keys(I18N_RAW).filter(k=>k.startsWith('chests.')).every(k=>I18N_RAW[k].length===4 && I18N_RAW[k].every(s=>s.length>0)));
  TASSERT('no new script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
