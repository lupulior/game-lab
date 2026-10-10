#!/usr/bin/env bash
# Runs headless Edge through PowerShell (launching it straight from Git Bash sometimes yields no output at all).
# Usage: ./edge.sh <url> [extra edge args...]      -> prints the dumped DOM (--dump-dom) on stdout
#        SHOT=<windows path to png> ./edge.sh <url> [extra args]   -> takes a screenshot instead
url="$1"; shift
profile="$(cygpath -m "${TMP:-/tmp}")/edge-headless-$$"
args="--headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --user-data-dir=$profile"
for a in "$@"; do args="$args $a"; done
if [ -n "${SHOT:-}" ]; then
  powershell -NoProfile -Command "& 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' $args --hide-scrollbars --screenshot='$SHOT' '$url' 2>\$null | Out-Null"
else
  powershell -NoProfile -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; & 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' $args --dump-dom '$url' 2>\$null"
fi
rm -rf "$profile" 2>/dev/null || true
