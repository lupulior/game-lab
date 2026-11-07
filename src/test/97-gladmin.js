/* 🔑 shared code button (GL): admin mode (∞ + free spending), gift codes, play counter */
(async()=>{
  await new Promise(r=>setTimeout(r,250));
  const tick=(ms=40)=>new Promise(r=>setTimeout(r,ms));
  showScreen('home'); await tick();
  const home=$('#home'), key=home.querySelector('.gl-key');
  TASSERT('🔑 button is the last element of #home and ≥ 32 px tall', !!key && home.lastElementChild===key && key.offsetHeight>=32);
  TLOG('🔑 button height', key ? key.offsetHeight : 'missing');
  prog.coins=1234; prog.gems=5; saveProg(); updateXpBadge();
  const a=GL.submit(GL.ADMIN);
  TASSERT('admin code → gl.admin=1', !!a && a.ok===true && a.admin===true && localStorage.getItem('gl.admin')==='1');
  TASSERT('admin: the wallet pills show ∞', $('#xp-badge').textContent.includes('∞') && $('#gem-badge').textContent.includes('∞'));
  TASSERT('admin: spending is free (coins and gems untouched)', spendCoins(100000)===true && spendGems(1000)===true && prog.coins===1234 && prog.gems===5);
  TASSERT('admin: the affordability gate sees a rich wallet, the real wallet is back afterwards', (()=>{ let seen=0; const f=glRich(()=>{ seen=prog.coins|0; return 'x'; }); const r=f(); return r==='x' && seen===2e9 && prog.coins===1234; })());
  GL.setAdmin(false); updateXpBadge();
  TASSERT('admin off: real numbers again, spending checks the wallet', $('#xp-badge').textContent.includes('1,234') && spendCoins(100000)===false && prog.coins===1234);
  const code=GL.makeGift('game1', 500), r1=GL.submit(code), r2=GL.submit(code);
  TASSERT('gift code adds exactly 500 coins once', !!r1 && r1.ok===true && prog.coins===1734 && $('#xp-badge').textContent.includes('1,734'));
  TASSERT('the same gift code again is refused as used', !!r2 && r2.ok===false && /כבר|already/.test(r2.msg) && prog.coins===1734);
  const bad=GL.submit('nonsense'); TASSERT('a wrong code is refused', !!bad && bad.ok===false);
  const other=GL.submit(GL.makeGift('snake', 50)); TASSERT('a gift code of another game is refused', !!other && other.ok===false && prog.coins===1734);
  const p0=GL.plays('game1'); beginMatch(CHARS[0], CHARS[1]); await tick(); TASSERT('a match counts a play', GL.plays('game1')===p0+1);
  try{ quitToHome(); }catch(e){}
  GL.setAdmin(false); localStorage.removeItem('gl.used'); localStorage.removeItem('gl.plays.game1'); prog.coins=0; prog.gems=0; saveProg(); updateXpBadge();
  TDONE();
})();
