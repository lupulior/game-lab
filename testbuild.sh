#!/usr/bin/env bash
# Writes test-build.html (all modules + all tests, sequential harness) for running the suite in a real browser:
#   ./testbuild.sh && open http://localhost:8765/test-build.html   (serve.ps1 must be running)
set -e; cd "$(dirname "$0")"
tmpdir=$(mktemp -d); mkdir -p $tmpdir/src; cp -r src/core.html src/css src/html src/js src/test $tmpdir/src/; cp build.sh $tmpdir/
( cd $tmpdir && ./build.sh test $tmpdir/t.html >/dev/null )
sed -n '/^cat > "\$tmpdir\/harness.js"/,/^EOF$/p' test.sh | sed '1d;$d' > $tmpdir/harness.js
awk -v h="$tmpdir/harness.js" 'BEGIN{intest=0; open=0} /^\/\* ---------- init ---------- \*\/$/ {seen_init=1} seen_init && /^\/\* ===== .*\.js ===== \*\/$/ { if(!intest){ while((getline l < h)>0) print l; intest=1 } if(open){ print "}});" } name=$0; sub(/^\/\* ===== /,"",name); sub(/ ===== \*\/$/,"",name); print; print "TQUEUE.push({name:\"" name "\", fn: async()=>{ await "; open=1; next } /^<\/script>$/ && open { print "}});"; open=0 } {print}' $tmpdir/t.html > test-build.html
rm -rf $tmpdir; echo "test-build.html ready"
