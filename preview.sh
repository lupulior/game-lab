#!/usr/bin/env bash
# Builds preview.html (not the deployed file) from the foundation + the modules whose names contain any of the given words.
# Usage: ./preview.sh home daily      -> preview.html with 00-*, 05-*, *home*, *daily*
#        ./preview.sh all             -> every module
set -e
cd "$(dirname "$0")"
tmpdir="$(mktemp -d)"; mkdir -p "$tmpdir/src/css" "$tmpdir/src/html" "$tmpdir/src/js" "$tmpdir/src/test"
cp src/core.html "$tmpdir/src/"; cp build.sh "$tmpdir/"
for d in css html js; do
  for p in src/$d/*; do [ -f "$p" ] || continue; b="$(basename "$p")"; keep=0
    case "$b" in 00-*|05-*) keep=1;; esac
    for w in "$@"; do [ "$w" = all ] && keep=1; case "$b" in *"$w"*) keep=1;; esac; done
    [ $keep = 1 ] && cp "$p" "$tmpdir/src/$d/"
  done
done
( cd "$tmpdir" && ./build.sh test "$tmpdir/p.html" >/dev/null )
sed -i '/^\/\* @test \*\/$/d' "$tmpdir/p.html"
mv "$tmpdir/p.html" preview.html; rm -rf "$tmpdir"
echo "preview.html ready ($(wc -l < preview.html) lines)"
