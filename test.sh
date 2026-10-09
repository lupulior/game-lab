#!/usr/bin/env bash
# Headless harness: builds the game with src/test/*.js appended, loads it in headless Edge and prints
#   {"errs":[...script errors recorded by the page...], "log":[[test, PASS|FAIL]...]}
# Tests are plain async IIFEs that call TLOG(name, value) / TASSERT(name, cond) and finish with TDONE();
# the harness runs the test FILES ONE AFTER ANOTHER (never concurrently) and goes back home between them.
# Usage: ./test.sh                 every module, every test
#        ./test.sh shop daily      only the foundation (00-*, 05-*) + the files whose name contains one of the words
set -e
cd "$(dirname "$0")"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
tmpdir="$(mktemp -d)"; out="$tmpdir/t.html"
mkdir -p "$tmpdir/src/css" "$tmpdir/src/html" "$tmpdir/src/js" "$tmpdir/src/test"
cp src/core.html "$tmpdir/src/"; cp build.sh "$tmpdir/"
if [ -n "${1:-}" ] && [ -z "${ALL:-}" ]; then
  for d in css html js test; do
    for p in src/$d/*; do [ -f "$p" ] || continue; b="$(basename "$p")"
      keep=0; case "$b" in 00-*|05-*|99-*) keep=1;; esac; for w in "$@"; do case "$b" in *"$w"*) keep=1;; esac; done
      [ $keep = 1 ] && cp "$p" "$tmpdir/src/$d/"
    done
  done
  ls "$tmpdir/src/test/" | grep -q . || { echo "no test file matches"; exit 1; }
else
  for d in css html js; do cp src/$d/* "$tmpdir/src/$d/" 2>/dev/null || true; done
  for p in src/test/*; do [ -f "$p" ] || continue; b="$(basename "$p")"; keep=0; [ -z "${1:-}" ] && keep=1; for w in "$@"; do case "$b" in *"$w"*) keep=1;; esac; done; [ $keep = 1 ] && cp "$p" "$tmpdir/src/test/"; done
fi
( cd "$tmpdir" && ./build.sh test "$out" >/dev/null )
cat > "$tmpdir/harness.js" <<'EOF'
try{ localStorage.clear(); }catch(e){}
window.__tlog=[]; window.TQUEUE=[]; let __tcur='';
function TLOG(n,v){ window.__tlog.push([__tcur+n, v]); } function TASSERT(n,c){ window.__tlog.push([__tcur+n, c?'PASS':'FAIL']); }
function TDONE(){ let el=document.getElementById('test-log'); if(!el){ el=document.createElement('pre'); el.id='test-log'; document.body.appendChild(el); } el.textContent=JSON.stringify({errs:window.__errs, log:window.__tlog}); }
function TRESET(){ try{ document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); }catch(e){} try{ settings.format='quick'; settings.lastLevel=0; settings.bo3=false; training=null; dailyMatch=false; mp=null; prog.matches=0; prog.wins=0; prog.streak=0; prog.onboard={}; prog.coins=0; prog.gems=0; prog.keys=0; prog.chests={bronze:0,silver:0,gold:0,welcome:0}; delete prog.coinDay; delete prog.keyDay; delete prog.chestDay; delete prog.dm; delete prog.cal; prog.streakDays=0; prog.streakLast=null; }catch(e){} try{ if(typeof quitToHome==='function' && state!=='idle') quitToHome(); }catch(e){} try{ if(typeof mpTeardown==='function' && mp) mpTeardown(); }catch(e){} try{ showScreen('home'); }catch(e){} }
setTimeout(async()=>{ for(const t of window.TQUEUE){ __tcur=t.name+': '; try{ await Promise.race([t.fn(), new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), 40000))]); }catch(e){ window.__tlog.push([__tcur+'CRASHED', String(e)]); } TRESET(); await new Promise(r=>setTimeout(r,50)); } __tcur=''; TDONE(); }, 100);
EOF
# every test file becomes TQUEUE.push({name, fn: async()=>{ await <the file's IIFE> }})
awk -v h="$tmpdir/harness.js" '
  BEGIN{intest=0; open=0}
  /^\/\* ---------- init ---------- \*\/$/ {seen_init=1}
  seen_init && /^\/\* ===== .*\.js ===== \*\/$/ { if(!intest){ while((getline l < h)>0) print l; intest=1 } if(open){ print "}});" } name=$0; sub(/^\/\* ===== /,"",name); sub(/ ===== \*\/$/,"",name); print; print "TQUEUE.push({name:\"" name "\", fn: async()=>{ await "; open=1; next }
  /^<\/script>$/ && open { print "}});"; open=0 }
  {print}' "$out" > "$out.2" && mv "$out.2" "$out"
[ -n "${KEEP:-}" ] && cp "$out" ./test-build.html && echo "kept ./test-build.html"
"$EDGE" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=240000 --dump-dom "file:///$(cygpath -m "$out")" 2>/dev/null \
  | grep -o '<pre id="test-log">.*</pre>' | sed 's|<pre id="test-log">||; s|</pre>||' | sed 's|&quot;|"|g; s|&lt;|<|g; s|&gt;|>|g; s|&amp;|\&|g' > "$tmpdir/result.json" || true
if [ ! -s "$tmpdir/result.json" ]; then echo "NO RESULT: the page never reached the test log (a syntax error in a module? load last-test-build.html in a browser)"; cp "$out" ./last-test-build.html; exit 2; fi
cat "$tmpdir/result.json"; echo
if grep -q '"FAIL"\|CRASHED' "$tmpdir/result.json" || ! grep -q '"errs":\[\]' "$tmpdir/result.json"; then echo "== FAILURES or script errors above =="; rm -rf "$tmpdir"; exit 1; fi
rm -rf "$tmpdir"
