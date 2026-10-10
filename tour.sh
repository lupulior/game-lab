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
    $('#intro').classList.remove('active'); showScreen('home'); refreshHome(); await w(300);
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
