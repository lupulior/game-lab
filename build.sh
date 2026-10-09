#!/usr/bin/env bash
# Builds game1.html (the single deployed file) from src/:
#   src/core.html            the game shell with four markers: /* @css */  <!-- @html -->  /* @js */  /* @test */
#   src/css/NN-name.css      inlined into the <style> block, sorted by name
#   src/html/NN-name.html    inlined inside #stage (so modals scale with the stage), sorted by name
#   src/js/NN-name.js        inlined before the init line, sorted by name
#   src/test/*.js            only with "./build.sh test OUT.html": appended after init (for the headless harness)
# Usage: ./build.sh            -> game1.html
#        ./build.sh test out.html
set -e
cd "$(dirname "$0")"
mode="${1:-}"; out="${2:-game1.html}"; [ "$mode" = "test" ] || out="game1.html"
tmp="$(mktemp)"
inject(){ # $1 marker line (exact), $2 glob of files, $3 wrap-start, $4 wrap-end
  local marker="$1" glob="$2" pre="$3" post="$4" part="$(mktemp)"
  : > "$part"
  for p in $glob; do [ -f "$p" ] || continue; printf "%s===== %s =====%s
" "$pre" "$(basename "$p")" "$post" >> "$part"; cat "$p" >> "$part"; printf "
" >> "$part"; done
  awk -v marker="$marker" -v partfile="$part" '
    $0==marker { while((getline line < partfile)>0) print line; close(partfile); next } { print }' "$tmp" > "$tmp.2" && mv "$tmp.2" "$tmp"
  rm -f "$part"
}
cp src/core.html "$tmp"
inject '/* @css */'     'src/css/*.css'   '/* ' ' */'
inject '<!-- @html -->' 'src/html/*.html' '<!-- ' ' -->'
inject '/* @js */'      'src/js/*.js'     '/* ' ' */'
if [ "$mode" = "test" ]; then inject '/* @test */' 'src/test/*.js' '/* ' ' */'; else sed -i '/^\/\* @test \*\/$/d' "$tmp"; fi
mv "$tmp" "$out"
printf 'built %s (%s lines, %s KB)\n' "$out" "$(wc -l < "$out")" "$(( $(stat -c %s "$out") / 1024 ))"
