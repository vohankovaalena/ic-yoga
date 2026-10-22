#!/bin/bash
# Dvojklik ve Finderu: nainstaluje závislosti (jen poprvé), spustí web
# a otevře ho v prohlížeči, jakmile server odpovídá.
# Zastavení: zavřít okno Terminálu (nebo Ctrl+C).
cd "$(dirname "$0")"
[ -d node_modules ] || npm install

PORT=8080
# Když už web běží (třeba z VS Code), jen ho otevřeme.
if curl -s -o /dev/null "http://localhost:$PORT/"; then
  open "http://localhost:$PORT/"
  echo "Web už běží na http://localhost:$PORT/"
  exit 0
fi

(
  for i in $(seq 1 60); do
    if curl -s -o /dev/null "http://localhost:$PORT/"; then open "http://localhost:$PORT/"; exit; fi
    sleep 1
  done
) &
npx eleventy --serve --port $PORT
