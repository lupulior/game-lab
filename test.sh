#!/usr/bin/env bash
# Headless harness: builds the game with src/test/*.js appended, loads it in headless Edge and prints
#   - script errors recorded by the page (window.__errs)
#   - whatever the tests wrote into #test-log (tests call TLOG(name, value) / TASSERT(name, cond) and finish with TDONE())
# Usage: ./test.sh            builds EVERY module and runs every test
#        ./test.sh name       builds only the foundation (00-*, 05-*) plus the files whose name contains "name"
#                             (css/html/js/test) — so one module can be tested while others are half-written
set -e
cd "$(dirname "$0")"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
tmpdir="$(mktemp -d)"; out="$tmpdir/t.html"
mkdir -p "$tmpdir/src/css" "$tmpdir/src/html" "$tmpdir/src/js" "$tmpdir/src/test"
cp src/core.html "$tmpdir/src/"; cp build.sh "$tmpdir/"
if [ -n "${1:-}" ]; then
  for d in css html js test; do
    for p in src/$d/*; do [ -f "$p" ] || continue; b="$(basename "$p")"
      case "$b" in 00-*|05-*) cp "$p" "$tmpdir/src/$d/";; *"$1"*) cp "$p" "$tmpdir/src/$d/";; esac
    done
  done
  ls "$tmpdir/src/test/" | grep -q . || { echo "no test file matches '$1' (expected src/test/NN-$1.js)"; exit 1; }
else
  for d in css html js test; do cp src/$d/* "$tmpdir/src/$d/" 2>/dev/null || true; done
fi
( cd "$tmpdir" && ./build.sh test "$out" >/dev/null )
cat > "$tmpdir/harness.js" <<'EOF'
window.__tlog=[]; function TLOG(n,v){ window.__tlog.push([n, v]); } function TASSERT(n,c){ window.__tlog.push([n, c?'PASS':'FAIL']); }
function TDONE(){ if(document.getElementById('test-log')) return; const el=document.createElement('pre'); el.id='test-log'; el.textContent=JSON.stringify({errs:window.__errs, log:window.__tlog}); document.body.appendChild(el); }
setTimeout(TDONE, 6500);
EOF
awk -v h="$tmpdir/harness.js" 'BEGIN{done=0} /^\/\* ===== .*\.js ===== \*\/$/ && !done && seen_init { while((getline l < h)>0) print l; done=1 } /^\/\* ---------- init ---------- \*\/$/ {seen_init=1} {print}' "$out" > "$out.2" && mv "$out.2" "$out"
"$EDGE" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=9000 --dump-dom "file:///$(cygpath -m "$out")" 2>/dev/null \
  | grep -o '<pre id="test-log">.*</pre>' | sed 's|<pre id="test-log">||; s|</pre>||' | sed 's|&quot;|"|g; s|&lt;|<|g; s|&gt;|>|g; s|&amp;|\&|g' > "$tmpdir/result.json" || true
if [ ! -s "$tmpdir/result.json" ]; then echo "NO RESULT: the page never reached the test log (a syntax error in a module? run: grep -n 'errs' or load $out in a browser)"; cp "$out" ./last-test-build.html; echo "copied the test build to ./last-test-build.html"; exit 2; fi
cat "$tmpdir/result.json"; echo
if grep -q '"FAIL"' "$tmpdir/result.json" || ! grep -q '"errs":\[\]' "$tmpdir/result.json"; then echo "== FAILURES or script errors above =="; rm -rf "$tmpdir"; exit 1; fi
rm -rf "$tmpdir"
