#!/usr/bin/env bash
# Screenshots of the built game in headless Edge: ./tour.sh home shop-today chests endcard ...  → art/tour/<scene>.png
# Scenes are set up by the tail script below (fake progress, open a screen, play a quick match…).
set -e; cd "$(dirname "$0")"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
mkdir -p art/tour
cat > /tmp/tour-tail.js <<'EOF'
(async()=>{
  const scene=(location.hash||'#home').slice(1);
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    settings.name='ליאור'; saveSettings(); settings.lang='he';
    prog.matches=6; prog.coins=1240; prog.gems=23; prog.keys=4; prog.xpTotal=900; prog.lvClaimed=levelOf(900); prog.trophies=12; prog.streakDays=5; prog.streakLast=dayKey(); prog.onboard={ctrl:true,welcome:true,pickup:true,shop:true,share:true}; prog.migrated='v2'; prog.welcomeDue=false;
    if(typeof giveChest==='function'){ prog.chests={bronze:1,silver:1,gold:0,welcome:0}; }
    saveProg(); updateXpBadge();
    $('#intro').classList.remove('active'); showScreen('home'); refreshHome(); await w(900);
    document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show'));
    if(scene==='home'){ }
    else if(scene==='home-big'){ prog.coins=12345678; prog.gems=98765; prog.trophies=48765; prog.streak=7; saveProg(); updateXpBadge(); refreshHomeV2(); }
    else if(scene==='shop-today'){ openShop('today'); }
    else if(scene==='shop-players'){ openShop('players'); }
    else if(scene==='shop-looks'){ prog.cos={items:['kit_il','boots_gold','ball_flame']}; prog.eq={kit:'kit_il',boots:'boots_gold',ball:'ball_flame'}; saveProg(); openShop('looks'); }
    else if(scene==='chests'){ openChestsScreen(); }
    else if(scene==='chest-open'){ openChestsScreen(); await w(300); openChest('silver'); await w(200); $('#btn-ask-yes').click(); await w(300); for(let i=0;i<3;i++) chestTap(); await w(3200); }
    else if(scene==='chest-flip'){ prog.chestPick={kind:'gold', rarity:'legendary', cards:chestCards('legendary'), paid:'keys', all:false}; openChestsScreen(); await w(300); chestDropResume(); await w(300); document.querySelector('#cd-cards .ccard').click(); await w(1500); }
    else if(scene==='chest-tap'){ openChestsScreen(); await w(300); openChest('silver'); await w(200); $('#btn-ask-yes').click(); await w(800); }
    else if(scene==='pickup'){ openDailyPickup(); }
    else if(scene==='missions'){ if(typeof missionsOpen==='function') missionsOpen(); }
    else if(scene==='mode'){ openModeSheet(); }
    else if(scene==='level'){ openLevelSheet(); }
    else if(scene==='more'){ openMoreSheet(); }
    else if(scene==='match'){ startOfflineMatch(1); await w(4200); }
    else if(scene==='endcard'){ startOfflineMatch(1); await w(4200); score.me=3; score.op=1; if(matchEarn) matchEarn.goals=3; endGame(); await w(3600); }
    else if(scene==='endcard-lose'){ startOfflineMatch(2); await w(4200); score.me=0; score.op=2; endGame(); await w(3600); }
    else if(scene==='streak'){ Hooks.emit('streakDay', 5); await w(300); showScreen('intro'); showScreen('home'); await w(1500); }
    else if(scene==='home-touch'){ document.body.classList.add('touch'); refreshHomeV2(); }
    else if(scene==='match-touch'){ document.body.classList.add('touch'); startOfflineMatch(1); await w(4200); }
    else if(scene==='home-en'){ setLang('en'); refreshHomeV2(); }
    else if(scene==='home-ru'){ setLang('ru'); refreshHomeV2(); }
    else if(scene==='ctrl'){ prog.matches=0; prog.onboard={}; saveProg(); refreshHome(); $('#btn-play-big').click(); }
    else if(scene==='hotseat'){ startHotseatPk(); await w(400); }
    else if(scene==='hotseat-kick'){ startHotseatPk(); await w(300); document.querySelector('#hs-goal .hs-zone').click(); await w(900); }
    else if(scene==='arenas'){ prog.trophies=160; saveProg(); refreshHome(); await w(300); const b=document.querySelector('#home-arena'); if(b) b.click(); await w(400); }
    else if(scene==='arena-match'){ prog.trophies=160; saveProg(); if(typeof arenaPitchInvalidate==='function') arenaPitchInvalidate(); startOfflineMatch(1); await w(4200); }
    else if(scene==='squad'){ prog.unlocked=['messi','ronaldo','neymar']; saveProg(); if(typeof openSquad==='function') openSquad(); else { const b=document.querySelector('#btn-squad'); if(b) b.click(); } await w(400); }
    else if(scene==='slots'){ prog.slots=[{kind:'bronze',at:now()+3500000},{kind:'gold',at:now()-10},null]; saveProg(); refreshHome(); if(typeof slotsRefresh==='function') slotsRefresh(); await w(600); }
    else if(scene==='league'){ prog.season={key:(typeof seasonKey==='function'?seasonKey():''), tr:63, peak:63, floor:50}; saveProg(); refreshHome(); await w(300); const b=document.querySelector('#home-league'); if(b) b.click(); await w(400); }
    else if(scene==='clubs'){ prog.club={id:'x',code:'ABC123',name:0,emoji:'🦁',joined:now()}; saveProg(); if(typeof openClub==='function') openClub(); else { const b=document.querySelector('#btn-club'); if(b) b.click(); } await w(800); }
    else if(scene==='emote'){ if(typeof ECON!=='undefined' && ECON.emotes) ECON.emotes.show=60000; startOfflineMatch(1); await w(4200); for(let i=0;i<30 && state!=='play';i++) await w(200); document.dispatchEvent(new KeyboardEvent('keydown',{key:'1',code:'Digit1',bubbles:true})); await w(500); }
    else if(scene==='levels'){ prog.unlocked=['messi','ronaldo']; prog.shards={messi:10}; prog.charLv={ronaldo:3}; saveProg(); openShop('players'); await w(400); }
    else if(scene==='leaders'){ $('#btn-top').click(); await w(1500); }
    else if(scene==='chest-climb'){ if(ECON.chests.climb) ECON.chests.climb.step=60000; chestRollRarity=()=>'legendary'; prog.chestPick=null; prog.chests={gold:1}; saveProg(); openChestsScreen(); await w(300); openChest('gold'); await w(300); for(let i=0;i<3;i++){ chestTap(); await w(80); } await w(2200); }
    else if(scene==='shop-skins'){ prog.unlocked=['messi','ronaldo']; prog.gems=500; saveProg(); openShop('looks'); await w(300); const b=[...document.querySelectorAll('#shop button')].find(x=>x.textContent.includes('🎭')); if(b) b.click(); await w(400); }
    else if(scene==='name'){ settings.name=''; saveSettings(); showScreen('intro'); await w(100); showScreen('home'); await w(900); }
    else if(scene==='clubs-official'){ prog.admin=true; prog.official={id:'off1',name:'המועדון של ליאור',emoji:'📣',msg:'שלום לכולם! השבוע יעד של 150 גולים 💪',by:'ליאור',auto:true,code:'LIOR77',tot:83,target:150,n:12}; prog.officialId='off1'; saveProg(); if(typeof clubOpen==='function') clubOpen('official'); await w(800); }
    else if(scene==='admin'){ prog.admin=true; saveProg(); setupAdminUI(); openAdmin(); await w(800); }
    if(scene.startsWith('home')){ await w(900); document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); }
    await w(600);
  }catch(e){ document.title='ERR '+e; const d=document.createElement('div'); d.style.cssText='position:fixed;left:0;top:0;background:#fff;color:red;z-index:999;font:16px monospace'; d.textContent='ERR '+e+' '+(e.stack||'').split('\n')[1]; document.body.appendChild(d); }
})();
EOF
sed '/^<\/script>$/{
r /tmp/tour-tail.js
}' game1.html | awk 'BEGIN{p=0} /^<\/script>$/ && !p { getline nxt; while((getline l < "/tmp/tour-tail.js")>0) print l; print; print nxt; p=1; next } {print}' > tour.html 2>/dev/null || true
# simpler and reliable: append the tail before the LAST </script>
awk -v tail=/tmp/tour-tail.js '{lines[NR]=$0} END{ last=0; for(i=1;i<=NR;i++) if(lines[i]=="</script>") last=i; for(i=1;i<=NR;i++){ if(i==last){ while((getline l < tail)>0) print l } print lines[i] } }' game1.html > tour.html
for s in "$@"; do
  SHOT="$(cygpath -w "$PWD/art/tour/$s.png")" ./edge.sh "file:///$(cygpath -m "$PWD/tour.html")#$s" --window-size=1000,620 --virtual-time-budget=14000 >/dev/null 2>&1 || true
  printf '%-14s %s\n' "$s" "$( [ -f art/tour/$s.png ] && stat -c %s art/tour/$s.png || echo missing )"
done
