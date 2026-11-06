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
  # msedge.exe is a GUI-subsystem exe: PowerShell only waits for it when it has to consume its stdout, so the
  # dump is piped through Out-String (without it PowerShell returns after ~0.2 s with an empty dump whenever
  # this script's stdout is a file rather than a pipe, and the profile dir is left behind).
  powershell -NoProfile -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; & 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' $args --dump-dom '$url' 2>\$null | Out-String -Stream"
fi
rm -rf "$profile" 2>/dev/null || true
