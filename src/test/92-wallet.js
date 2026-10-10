/* 92-wallet: no maximum for coins/gems, fmtNum/fmtNumHTML magnitudes, pills that fit, no cap row on the end card, no "XP" wording */
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const tick=(ms=40)=>new Promise(r=>setTimeout(r,ms));
  const errs0=window.__errs.length;
  TASSERT('module loaded', typeof walletPill==='function' && typeof walletBadges==='function' && typeof fmtNumHTML==='function' && typeof walletNum==='function');
  // --- A: no caps by default, a finite cap still works, Infinity never becomes NaN
  TASSERT('caps are Infinity by default (keys keep 10)', ECON.capCoins===Infinity && ECON.capSunday===Infinity && ECON.gemWeekCap===Infinity && ECON.keyCap===10);
  TASSERT('coinCapToday/coinCapLeft are Infinity, no NaN', coinCapToday()===Infinity && coinCapLeft()===Infinity);
  prog.streak=0; prog.streakDays=0; prog.coinDay={key:dayKey(), n:123456}; prog.keyDay={key:dayKey(), n:0};
  let r=payout({outcome:'win', fmt:'classic', levelI:5, goals:3, clean:true, stars:3});
  TASSERT('payout with Infinity: finite coins, not capped, no NaN', Number.isFinite(r.coins) && r.coins>0 && r.capped===false && Number.isFinite(r.xp));
  { const c0=[ECON.capCoins, ECON.capSunday]; ECON.capCoins=600; ECON.capSunday=900;
    prog.coinDay={key:dayKey(), n:coinCapToday()-7}; r=payout({outcome:'win', fmt:'classic', levelI:5, goals:3});
    TASSERT('a finite cap still clamps', r.coins===7 && r.capped===true && coinCapLeft()===7);
    ECON.capCoins=c0[0]; ECON.capSunday=c0[1]; }
  prog.coinDay={key:dayKey(), n:0};
  TASSERT('chests coin route sees room (coinCapLeft>0)', coinCapLeft()>0);
  // --- the wallet holds huge numbers
  prog.coins=0; prog.gems=0; mp=null; state='idle';
  addCoins(3000000000,'test'); addCoins(2500000000,'test'); addGems(4000000000,'test');
  TASSERT('wallet above 2^31: no wrap, no clamp', prog.coins===5500000000 && prog.gems===4000000000);
  TASSERT('spend from a huge wallet', spendCoins(500000000)===true && prog.coins===5000000000 && spendGems(1)===true && prog.gems===3999999999);
  TASSERT('non-finite gifts are ignored', addCoins(Infinity,'test')===0 && addCoins(NaN,'test')===0 && prog.coins===5000000000);
  // --- B: fmtNum / fmtNumHTML
  const lang0=lang; lang='he';
  TASSERT('fmtNum 999,999', fmtNum(999999)==='999,999');
  TASSERT('fmtNum 1,000,000 → 1 מיליון', fmtNum(1000000)==='1 מיליון');
  TASSERT('fmtNum 1,500,000 → 1.5 מיליון', fmtNum(1500000)==='1.5 מיליון');
  TASSERT('fmtNum 100,000,000 → 100 מיליון', fmtNum(100000000)==='100 מיליון');
  TASSERT('fmtNum 2,000,000,000 → 2 מיליארד', fmtNum(2000000000)==='2 מיליארד');
  TASSERT('fmtNum 12,345,678 → 12.3 מיליון (one decimal, no trailing .0)', fmtNum(12345678)==='12.3 מיליון' && fmtNum(3000000)==='3 מיליון' && fmtNum(999950000)==='1 מיליארד');
  TASSERT('fmtNum small numbers unchanged', fmtNum(0)==='0' && fmtNum(12345)==='12,345' && fmtNum(null)==='0' && fmtNum(-2500)==='-2,500');
  TASSERT('fmtNum never prints Infinity digits', fmtNum(Infinity)==='∞' && fmtNum(NaN)==='0');
  TASSERT('fmtNumHTML wraps the word in small.mag', fmtNumHTML(1500000)==='1.5<small class="mag">מיליון</small>' && fmtNumHTML(999999)==='999,999' && fmtNumHTML(2e9)==='2<small class="mag">מיליארד</small>');
  const words={he:['מיליון','מיליארד'], en:['million','billion'], ar:['مليون','مليار'], ru:['млн','млрд']}; let okW=true;
  for(const L of Object.keys(words)){ lang=L; if(fmtNum(1500000)!=='1.5 '+words[L][0] || fmtNum(3e9)!=='3 '+words[L][1]) okW=false; }
  lang=lang0; TASSERT('million/billion words in 4 languages', okW);
  TASSERT('fmtXp delegates to fmtNum', typeof fmtXp==='function' && fmtXp(1500000)===fmtNum(1500000) && fmtXp(1200)==='1,200');
  // --- the pills fit with tour-like numbers
  showScreen('home'); prog.coins=12345678; prog.gems=98765; prog.trophies=48765; updateXpBadge(); await tick(350);
  const fits=el=>!!el && el.scrollWidth<=el.clientWidth+1;
  TASSERT('home pills: 12.3 מיליון / 98,765 / 48,765 fit their boxes', fits($('#xp-badge')) && fits($('#gem-badge')) && fits($('#trophy-badge')));
  TASSERT('coin pill: number + small word', !!$('#xp-badge small.mag') && $('#xp-badge').textContent.includes('12.3') && $('#xp-badge small.mag').textContent===T('num.million') && $('#gem-badge').textContent.includes('98,765') && $('#trophy-badge').textContent.includes('48,765'));
  TASSERT('the word is really smaller than the number', parseFloat(getComputedStyle($('#xp-badge small.mag')).fontSize) < parseFloat(getComputedStyle($('#xp-badge')).fontSize));
  prog.coins=5000000000; updateXpBadge(); await tick(350);
  TASSERT('5 מיליארד fits too', fits($('#xp-badge')) && $('#xp-badge').textContent.includes('5') && $('#xp-badge small.mag').textContent===T('num.billion'));
  prog.coins=12345678;
  if(typeof openShop==='function'){ openShop(); await tick(80); TASSERT('shop wallet: fits, small word', fits($('#shop-coins')) && fits($('#shop-gems')) && !!$('#shop-coins small.mag') && $('#shop-gems').textContent.includes('98,765')); showScreen('home'); }
  // (the 40-endcard suite leaves a stub on openChestsScreen for the rest of a multi-suite run, so the screen is opened directly)
  if(typeof buildChests==='function' && $('#chests')){ prog.coins=12345678; prog.gems=98765; showScreen('chests'); buildChests(); await tick(80); const c=$('#chests-wallet span.c'), g=$('#chests-wallet span.g'); const ok=fits(c) && fits(g) && !!c.querySelector('small.mag') && g.textContent.includes(fmtNum(prog.gems)); TASSERT('chests wallet: fits, small word', ok); if(!ok) TLOG('chests wallet', [$('#chests-wallet').innerHTML, prog.gems, c&&c.scrollWidth, c&&c.clientWidth, g&&g.scrollWidth, g&&g.clientWidth]); showScreen('home'); }
  if(typeof updatePresenceUI==='function'){ const n0=settings.name; settings.name='דני'; updatePresenceUI(); TASSERT('friends "me" line uses the small word', !!$('#fr-me small.mag') && $('#fr-me').textContent.includes('דני')); settings.name=n0; updatePresenceUI(); }
  showScreen('home'); prog.coins=12; prog.gems=0; prog.trophies=0; updateXpBadge(); await tick(350);
  TASSERT('small numbers: plain digits, full size back', !$('#xp-badge small.mag') && $('#xp-badge').textContent.includes('12') && (!$('#xp-badge').style.fontSize || parseFloat($('#xp-badge').style.fontSize)>=20));
  // --- the end card has no cap row
  settings.format='quick'; level=LEVELS[1]; mp=null; dailyMatch=false; training=null; prog.coinDay={key:dayKey(), n:0}; prog.keyDay={key:dayKey(), n:0}; prog.streak=0;
  beginMatch(CHARS[0], CHARS[1]); state='play'; score.me=2; score.op=0; matchEarn.goals=2; endGame(); await tick(30); if(typeof endcardSkip==='function') endcardSkip(); await tick(30);
  TASSERT('end card: coins shown, no daily cap row', $('#end').classList.contains('show') && prog.coins>12 && !$('#endcard-cap-bar') && !document.querySelector('.ec-cap') && !$('#end-xp').textContent.includes(T('end.capped')));
  TASSERT('end card: no "XP" wording', !/XP/.test($('#end .panel').textContent));
  goHome(); await tick(50);
  // --- achievements and stats name coins, not XP
  if(typeof buildAch==='function'){ buildAch(); const cards=[...document.querySelectorAll('#ach-grid .achc .xp')]; TASSERT('achievement cards show the coins they pay', cards.length===ACH.length && cards.every(x=>!/XP/.test(x.textContent) && x.textContent.includes('🪙')) && cards[0].textContent==='🪙 +'+fmtNum(ACH[0][1]*ECON.achMult)); }
  TASSERT('ach.new / stats.xp / shop strings name coins', T('ach.new','x',75).includes('🪙') && T('stats.xp',5).includes('🪙') && T('shop.noXp',1,2).includes('🪙') && T('board.cols').split('|')[3].includes('🪙'));
  // --- C: no quoted "XP" left in the i18n store (all 4 languages), except the migration sentence
  const bad=Object.entries(I18N_RAW).filter(([k,v])=>k!=='welcome.text' && Array.isArray(v) && v.some(s=>/XP/.test(String(s)))).map(([k])=>k);
  TASSERT('no "XP" in any i18n value (except welcome.text)', bad.length===0); if(bad.length) TLOG('XP keys', bad);
  TASSERT('level points wording + 4-language rows', /נקודות/.test(T('xp.gain',5)) && /נקודות/.test(T('end.xp',5)) && ['xp.gain','end.xp','num.million','num.billion','shop.hint','daily.desc'].every(k=>I18N_RAW[k] && I18N_RAW[k].length===4 && I18N_RAW[k].every(s=>s.length>0)));
  TASSERT('no script errors', window.__errs.length===errs0); if(window.__errs.length) TLOG('errors', window.__errs);
  TDONE();
})();
