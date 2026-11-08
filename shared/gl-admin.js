/* ===== Game Lab shared block – paste VERBATIM into every game (and index.html). =====
   🔑 code button at the bottom of the home screen: the admin code turns on admin mode in ALL games
   (shared localStorage on lupulior.github.io: infinite money, play counters, gift codes); gift codes
   (GL-<GAME>-<amount>-<nonce>-<sig>) give money to a player in one game. No server – everything is local.
   API: GL.mount({ game, container, lang:fn->'he'|'en', money:{ add:fn(n) }|null, refresh:fn, toast:fn })
        GL.isAdmin()  GL.played(id)  GL.plays(id)  GL.makeGift(game, amount)  GL.parseGift(code)  GL.submit(code)  GL.open()  GL.close()
   Canonical copy: shared/gl-admin.js (+ shared/gl-admin.css). */
var GL = (function(){
  'use strict';
  var ADMIN = '528963 ליאור לופו המלך יש', MO = null, UI = null;
  /* id, Hebrew name, English name, has money (gift codes possible) */
  var GAMES = [['game1', '⚽ כוכב הכדורגל', 'Football Star', 1], ['hook', '🪝 סטיקמן הוק', 'Stickman Hook', 1], ['neon', '💜 אתגר הניאון', 'Neon Challenge', 1], ['drivemad', '🚗 נהיגה משוגעת', 'Drive Mad', 0], ['snake', '🐍 נחש נגד תולעים', 'Snake vs Worms', 1], ['carcircle', '🔁 מעגל המכוניות', 'Car Circle', 0], ['survivor', '🏃 איש שורד', 'Survivor', 0], ['xo', '❌ איקס עיגול', 'Tic Tac Toe', 0], ['basketball', '🏀 כדורסל 1 על 1', 'Basketball 1v1', 0], ['impostor', '🕵️ אימפוסטר', 'Impostor', 0], ['mart', '🐵 מונקי מארט', 'Monkey Mart', 1], ['wreck', '🔨 שוד הבלוקים', 'Voxel Wreck', 1], ['smash', '💥 חדר הניפוץ', 'Smash Room', 0], ['obby', '🌈 אובי בצבעי הקשת', 'Rainbow Obby', 1], ['devil', '😈 שד השלבים', 'Level Trickster', 1], ['moto', '🏍️ אופנוע הפעלולים', 'Stunt Moto', 1], ['slope', '🟢 המדרון', 'Slope Run', 1], ['subway', '🚇 גולשי הרכבת', 'Train Surfers', 1]];
  var T = {
    he:{ title:'🔑 קוד', ph:'הקלידו קוד…', ok:'אישור', close:'סגור', bad:'❌ קוד לא נכון', usedMsg:'⚠️ הקוד הזה כבר נוצל במכשיר הזה', other:'הקוד הזה שייך למשחק {g} – הקלידו אותו שם', got:'🎁 קיבלתם {n} כסף!', adminOn:'👑 ברוך הבא, המלך! מצב אדמין פעיל בכל המשחקים', adminOff:'מצב אדמין כבוי', adminTitle:'👑 מצב אדמין', inf:'∞ כסף בלי סוף בכל המשחקים', plays:'כמה שיחקו בכל משחק (במכשיר הזה)', total:'סה״כ', gift:'🎁 שליחת כסף לשחקן', make:'צור קוד', copy:'📋 העתק', copied:'✅ הועתק!', wa:'וואטסאפ', off:'יציאה ממצב אדמין', share:'🎁 קוד מתנה ל{g}: {c} – לוחצים 🔑 למטה במסך הבית של המשחק ומקלידים אותו' },
    en:{ title:'🔑 Code', ph:'Type a code…', ok:'OK', close:'Close', bad:'❌ Wrong code', usedMsg:'⚠️ This code was already used on this device', other:'This code belongs to {g} – type it there', got:'🎁 You got {n} money!', adminOn:'👑 Welcome, King! Admin mode is on in every game', adminOff:'Admin mode off', adminTitle:'👑 Admin mode', inf:'∞ Infinite money in every game', plays:'Plays per game (on this device)', total:'Total', gift:'🎁 Send money to a player', make:'Make code', copy:'📋 Copy', copied:'✅ Copied!', wa:'WhatsApp', off:'Leave admin mode', share:'🎁 Gift code for {g}: {c} – tap 🔑 at the bottom of the game\'s home screen and type it' } };
  function L(){ var l = null; try { l = MO && MO.lang ? MO.lang() : null; } catch(e){} return l === 'en' ? 'en' : 'he'; }
  function t(k){ return T[L()][k] || T.he[k] || k; }
  function ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){} return null; }
  function norm(s){ return String(s || '').replace(/\s+/g, ' ').trim(); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function isAdmin(){ return ls('gl.admin') === '1'; }
  function setAdmin(on){ ls('gl.admin', on ? '1' : null); if (MO && MO.refresh){ try { MO.refresh(); } catch(e){} } }
  function plays(id){ return +(ls('gl.plays.' + id) || 0) || 0; }
  function played(id){ id = id || (MO && MO.game); if (!id) return; ls('gl.plays.' + id, String(plays(id) + 1)); }
  function fnv(s){ var h = 2166136261; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).toUpperCase(); }
  function sig(g, n, nonce){ return ('000000' + fnv(ADMIN + '|' + g + '|' + n + '|' + nonce)).slice(-6); }
  function makeGift(game, amount){ game = String(game).toUpperCase(); amount = Math.max(1, Math.floor(+amount || 0)); var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', nonce = '', i; for (i = 0; i < 4; i++) nonce += A[Math.floor(Math.random() * A.length)]; return 'GL-' + game + '-' + amount + '-' + nonce + '-' + sig(game, amount, nonce); }
  function parseGift(code){ var m = /^GL-([A-Z0-9]+)-(\d{1,9})-([A-Z0-9]{4})-([A-Z0-9]{6})$/.exec(norm(code).toUpperCase().replace(/\s/g, '')); if (!m || sig(m[1], +m[2], m[3]) !== m[4]) return null; return { game:m[1].toLowerCase(), amount:+m[2], code:m[0] }; }
  function usedList(){ return (ls('gl.used') || '').split(',').filter(Boolean); }
  function isUsed(code){ return usedList().indexOf(code) >= 0; }
  function markUsed(code){ var u = usedList(); u.push(code); ls('gl.used', u.slice(-300).join(',')); }
  function gameName(id){ for (var i = 0; i < GAMES.length; i++) if (GAMES[i][0] === id) return L() === 'en' ? GAMES[i][2] : GAMES[i][1]; return id; }
  /* applies a typed code (admin code or gift code); returns { ok, msg, admin?, gift? } or null for an empty string */
  function submit(v){ v = norm(v); if (!v) return null;
    if (v === ADMIN){ setAdmin(true); return { ok:true, admin:true, msg:t('adminOn') }; }
    var g = parseGift(v); if (!g) return { ok:false, msg:t('bad') };
    if (!MO || !MO.game || g.game !== MO.game) return { ok:false, msg:t('other').replace('{g}', gameName(g.game)) };
    if (!MO.money || !MO.money.add) return { ok:false, msg:t('bad') };
    if (isUsed(g.code)) return { ok:false, msg:t('usedMsg') };
    markUsed(g.code); try { MO.money.add(g.amount); } catch(e){} if (MO.refresh){ try { MO.refresh(); } catch(e){} }
    return { ok:true, gift:g, msg:t('got').replace('{n}', String(g.amount)) }; }
  function open(){ close(); var ov = document.createElement('div'); ov.className = 'gl-ov'; ov.innerHTML = '<div class="gl-card" role="dialog" aria-label="code"></div>'; document.body.appendChild(ov); UI = ov;
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); }); ov.addEventListener('keydown', function(e){ e.stopPropagation(); if (e.key === 'Escape') close(); }); ov.addEventListener('keyup', function(e){ e.stopPropagation(); }); ov.addEventListener('keypress', function(e){ e.stopPropagation(); });
    render(''); }
  function close(){ if (UI && UI.parentNode) UI.parentNode.removeChild(UI); UI = null; }
  function render(msg, cls){ if (!UI) return; var c = UI.firstChild, adm = isAdmin(), h = '', i;
    h += '<h3>' + t('title') + '</h3><div class="gl-row"><input class="gl-in" id="gl-in" type="text" autocomplete="off" autocapitalize="off" placeholder="' + esc(t('ph')) + '" aria-label="code"><button type="button" class="gl-b" id="gl-ok">' + t('ok') + '</button></div><p class="gl-msg' + (cls ? ' ' + cls : '') + '" id="gl-msg">' + esc(msg || '') + '</p>';
    if (adm){ h += '<div class="gl-adm"><h4>' + t('adminTitle') + '</h4><p>' + t('inf') + '</p><h4>' + t('plays') + '</h4><table class="gl-tb">'; var tot = 0; for (i = 0; i < GAMES.length; i++){ var n = plays(GAMES[i][0]); tot += n; h += '<tr><td>' + esc(L() === 'en' ? GAMES[i][2] : GAMES[i][1]) + '</td><td>' + n + '</td></tr>'; } h += '<tr class="gl-tot"><td>' + t('total') + '</td><td>' + tot + '</td></tr></table>';
      h += '<h4>' + t('gift') + '</h4><div class="gl-row"><select class="gl-in" id="gl-g" aria-label="game">'; for (i = 0; i < GAMES.length; i++) if (GAMES[i][3]) h += '<option value="' + GAMES[i][0] + '"' + (MO && MO.game === GAMES[i][0] ? ' selected' : '') + '>' + esc(L() === 'en' ? GAMES[i][2] : GAMES[i][1]) + '</option>'; h += '</select><input class="gl-in gl-n" id="gl-n" type="number" min="1" step="1" value="1000" aria-label="amount"><button type="button" class="gl-b" id="gl-make">' + t('make') + '</button></div><div id="gl-out"></div><button type="button" class="gl-b gl-ghost" id="gl-off">' + t('off') + '</button></div>'; }
    h += '<button type="button" class="gl-b gl-ghost" id="gl-close">' + t('close') + '</button>';
    c.innerHTML = h;
    var inp = c.querySelector('#gl-in'); function go(){ var r = submit(inp.value); if (!r) return; if (r.ok && MO && MO.toast){ try { MO.toast(r.msg); } catch(e){} } render(r.msg, r.ok ? 'ok' : 'bad'); }
    c.querySelector('#gl-ok').onclick = go; inp.onkeydown = function(e){ if (e.key === 'Enter'){ e.preventDefault(); go(); } }; c.querySelector('#gl-close').onclick = close;
    if (adm){ c.querySelector('#gl-off').onclick = function(){ setAdmin(false); render(t('adminOff')); };
      c.querySelector('#gl-make').onclick = function(){ var g = c.querySelector('#gl-g').value, n = +c.querySelector('#gl-n').value; if (!(n > 0)) return; var code = makeGift(g, n), out = c.querySelector('#gl-out'), txt = t('share').replace('{g}', gameName(g)).replace('{c}', code);
        out.innerHTML = '<div class="gl-code" id="gl-code">' + code + '</div><div class="gl-row"><button type="button" class="gl-b" id="gl-copy">' + t('copy') + '</button><a class="gl-b gl-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(txt) + '">' + t('wa') + '</a></div>';
        out.querySelector('#gl-copy').onclick = function(){ var b = this, done = function(){ b.textContent = t('copied'); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, done); else { try { var r = document.createRange(); r.selectNodeContents(out.querySelector('#gl-code')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); } catch(e){} done(); } }; }; }
    setTimeout(function(){ try { inp.focus(); } catch(e){} }, 50); }
  /* the small 🔑 button; container = the bottom of the home screen */
  function mount(o){ MO = o || {}; var b = document.createElement('button'); b.type = 'button'; b.className = 'gl-key'; b.setAttribute('aria-label', 'code'); b.textContent = '🔑 ' + (L() === 'en' ? 'Code' : 'קוד'); b.onclick = function(e){ if (e) e.stopPropagation(); open(); }; (MO.container || document.body).appendChild(b); MO.btn = b; return b; }
  return { mount:mount, open:open, close:close, isAdmin:isAdmin, setAdmin:setAdmin, played:played, plays:plays, makeGift:makeGift, parseGift:parseGift, submit:submit, GAMES:GAMES, ADMIN:ADMIN };
})();
