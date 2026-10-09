/* boot smoke test: the page runs init without errors and the main screens exist */
(async()=>{
  await new Promise(r=>setTimeout(r,300));
  TASSERT('no script errors', window.__errs.length===0); if(window.__errs.length) TLOG('errors', window.__errs);
  TASSERT('home screen exists', !!document.querySelector('#home'));
  TASSERT('T works', typeof T==='function' && T('btn.play').length>0);
  TLOG('version', typeof GAME_VERSION!=='undefined' ? GAME_VERSION : 'n/a');
  TDONE();
})();
