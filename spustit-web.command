#!/bin/bash
# Dvojklik ve Finderu: nainstaluje závislosti (jen poprvé), spustí web
# na http://localhost:8080 a otevře ho v prohlížeči. Zastavení: zavřít okno Terminálu.
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
(sleep 4 && open "http://localhost:8080") &
npm start
