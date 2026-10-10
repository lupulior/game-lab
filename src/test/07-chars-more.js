/* 16 more characters: appended to CHARS, priced, with stats and names; they render, show in the shop, and can be bought */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const errs0=window.__errs.length; const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
  const HAIR=['bald','bun','curly','longband','mohawk','short','spiky','tuft','wavy'];
  const news=CHARS_MORE_IDS.map(id=>CHARS.find(c=>c.id===id)).filter(Boolean);
  // --- the data
  TASSERT('96 characters', CHARS.length===96 && news.length===16);
  TASSERT('all ids unique', new Set(CHARS.map(c=>c.id)).size===CHARS.length);
  TASSERT('appended at the end, fixed order', CHARS.slice(80).map(c=>c.id).join()===CHARS_MORE_IDS.join() && CHARS[0].id==='mbappe' && CHARS[79].id==='streetking');
  TASSERT('price, stats and names for every new one', news.every(c=>typeof PRICES[c.id]==='number' && PRICES[c.id]>0 && Array.isArray(CHAR_ST[c.id]) && CHAR_ST[c.id].length===4 && Array.isArray(CHAR_NAMES[c.id]) && CHAR_NAMES[c.id].length===3 && CHAR_NAMES[c.id].every(s=>typeof s==='string' && s.length>0)));
  TASSERT('stats stay near 1 (0.9–1.12)', news.every(c=>CHAR_ST[c.id].every(v=>v>=.9 && v<=1.12)));
  TASSERT('valid hair + every look field', news.every(c=>HAIR.includes(c.hair) && /^#[0-9a-fA-F]{6}$/.test(c.skin) && c.skinDark && c.hairColor && c.jersey && c.numColor && c.shorts && c.socks && c.number>0 && (c.brows==='round'||c.brows==='sharp') && (!c.beard || c.beardColor)));
  TASSERT('Hebrew names in the data', news.every(c=>/[֐-׿]/.test(c.name)));
  TASSERT('not free, not trophy-only, not on the road', news.every(c=>!FREE_CHARS.includes(c.id) && !c.trophyOnly && !isUnlocked(c) && roadFor(c.id)==null));
  // --- nm() per language
  const mit=CHARS.find(c=>c.id==='mitoma');
  TASSERT('nm() Hebrew', lang==='he' && nm(mit)==='מיטומה');
  setLang('en'); TASSERT('nm() English', nm(mit)==='Mitoma' && nm(CHARS.find(c=>c.id==='odegaard'))==='Ødegaard');
  setLang('ru'); TASSERT('nm() Russian', nm(mit)==='Митома');
  setLang('he'); TASSERT('language restored', lang==='he' && nm(mit)==='מיטומה');
  // --- rendering
  TASSERT('playerSVG renders each new one', news.every(c=>{ const s=playerSVG(c); return typeof s==='string' && s.includes('<svg') && s.includes('>'+c.number+'<'); }));
  TASSERT('playerBackSVG too', news.every(c=>playerBackSVG(c).includes('<svg')));
  // --- rarity spread
  if(typeof charRarity==='function'){
    const cnt={}; news.forEach(c=>{ const r=charRarity(c); cnt[r]=(cnt[r]||0)+1; }); TLOG('rarities', cnt);
    TASSERT('4 bronze / 5 silver / 5 gold / 2 icon', cnt.bronze===4 && cnt.silver===5 && cnt.gold===5 && cnt.icon===2 && !cnt.trophy);
  } else TLOG('rarity check', 'skipped: no shop module in this build');
  // --- Israelis
  const il=['ohana','nimni','dorperetz','baribo'];
  TASSERT('4 Israelis flagged', il.every(id=>ISRAELI_IDS.includes(id)) && ISRAELI_IDS.length===13 && news.filter(c=>c.il).length===4);
  TASSERT('legends filter knows the retired ones', ['romario','rivaldo','puyol','ohana'].every(id=>LEGEND_IDS.includes(id)));
  // --- the characters gallery (core)
  buildGallery(); TASSERT('gallery holds 96 cards with a NEW badge on the new ones', document.querySelectorAll('#gallery .card[data-i]').length===96 && !!document.querySelector('#gallery .card[data-i="95"] .badge.new'));
  previewIdx=95; refreshPreview(); TASSERT('preview of the last one shows its price', $('#preview-name').textContent===nm(CHARS[95]) && $('#btn-choose').textContent.includes(fmtXp(priceOf(CHARS[95]))));
  previewIdx=0; refreshPreview();
  // --- buying straight through tryBuy (ask → yes)
  prog.coins=priceOf(mit); const buying=tryBuy(mit); await tick();
  TASSERT('ask() shows before paying', $('#ask-modal').classList.contains('show')); $('#btn-ask-yes').click(); const ok=await buying; await tick();
  TASSERT('bought with enough coins', ok===true && isUnlocked(mit) && prog.unlocked.includes('mitoma') && prog.coins===0);
  // --- the shop's players tab
  if(typeof openShop==='function'){
    shopFilter='all'; shopPick=-1; openShop('players'); await tick();
    TASSERT('shop players tab shows 96 cards', document.querySelectorAll('#shop-pgrid .shop-pcard').length===96 && !!$('#shop-pgrid .shop-pcard[data-i="95"]'));
    TASSERT('new cards carry the right rarity frame and price', news.every(c=>{ const d=$('#shop-pgrid .shop-pcard[data-i="'+CHARS.indexOf(c)+'"]'); return d && d.classList.contains('rar-'+charRarity(c)) && (c.id==='mitoma' ? d.querySelector('.pr').textContent===T('shop.owned2') : d.querySelector('.pr').textContent.includes(fmtNum(priceOf(c)))); }));
    $('#shop-body .shop-filters .btn[data-f=il]').click(); await tick();
    const shown=Array.from(document.querySelectorAll('#shop-pgrid .shop-pcard')).map(d=>CHARS[+d.dataset.i].id);
    TASSERT('🇮🇱 filter includes the 4 new Israelis', shown.length===ISRAELI_IDS.length && il.every(id=>shown.includes(id)));
    $('#shop-body .shop-filters .btn[data-f=icon]').click(); await tick();
    TASSERT('icon filter shows Romário and Rivaldo', ['romario','rivaldo'].every(id=>!!$('#shop-pgrid .shop-pcard[data-i="'+CHARS.findIndex(c=>c.id===id)+'"]')));
    $('#shop-body .shop-filters .btn[data-f=all]').click(); await tick();
    const dp=CHARS.find(c=>c.id==='dorperetz'), dpI=CHARS.indexOf(dp); prog.coins=priceOf(dp);
    $('#shop-pgrid .shop-pcard[data-i="'+dpI+'"]').click(); await tick();
    TASSERT('tap a new card → preview with buy button', $('#shop-ppv .nm').textContent===nm(dp) && !!$('#shop-ppv .btn[data-act=buy]'));
    $('#shop-ppv .btn[data-act=buy]').click(); await tick(); $('#btn-ask-yes').click(); await tick(); await tick();
    TASSERT('bought from the shop', isUnlocked(dp) && prog.coins===0 && !!$('#shop-ppv .btn[data-act=select]'));
    $('#shop-ppv .btn[data-act=select]').click(); await tick();
    TASSERT('a new one can be selected (index 94)', selected===dpI && prog.selectedId==='dorperetz');
    selected=0; Hooks.emit('select', 0); shopFilter='all'; shopPick=-1; if(typeof shopStopTimer==='function') shopStopTimer();
  } else TLOG('shop checks', 'skipped: no shop module in this build');
  // --- a match with a new one as the opponent
  beginMatch(CHARS[0], CHARS[95]); state='play'; score.me=1; endGame(); await tick(300);
  TASSERT('match vs a new character ends cleanly', state!=='play' && P2.ch===CHARS[95]);
  try{ quitToHome(); }catch(e){}
  // --- leave things as they were for the next suites
  prog.unlocked=prog.unlocked.filter(id=>!CHARS_MORE_IDS.includes(id)); prog.coins=0; delete prog.selectedId; selected=0; saveProg(); refreshHome();
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
