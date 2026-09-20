#!/usr/bin/env bash
# Deploy auf den Server: rsync des Repos + Neubau des Containers + Selbstprüfung.
#
# Läuft aus JEDEM Arbeitsverzeichnis — die Quelle ist immer das Repo, in dem
# dieses Skript liegt. (Lehre vom 2026-08-11: ein rsync mit relativem `./` aus
# dem falschen Arbeitsverzeichnis hat mit --delete das gesamte ~/coding nach
# /opt/studio45 gespült und die dortigen Quellen gelöscht.)
#
# Aufruf: scripts/deploy.sh [ssh-host:zielpfad]   (Standard: lsg-srv:/opt/studio45/)
# ENV:    PRUEF_URL — /api/version der Instanz für die Selbstprüfung
#         (Standard: https://studio45.littleproject.de/api/version; leer = keine Prüfung)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIEL="${1:-lsg-srv:/opt/studio45/}"
HOST="${ZIEL%%:*}"
PFAD="${ZIEL#*:}"
PRUEF_URL="${PRUEF_URL-https://studio45.littleproject.de/api/version}"

echo "Quelle: $REPO"
echo "Ziel:   $ZIEL"

# Welcher Stand geht raus? build-info.json fährt im rsync mit und landet im Image.
node "$REPO/scripts/build-info.mjs"
VERSION="$(node -e "console.log(require('$REPO/build-info.json').beschreibung)")"
COMMIT="$(node -e "console.log(require('$REPO/build-info.json').commit)")"

rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude 'data' \
  --exclude '.env' --exclude 'docker-compose.override.yml' \
  "$REPO/" "$ZIEL"

ssh "$HOST" "cd '$PFAD' \
  && docker compose build --build-arg APP_VERSION='$VERSION' --build-arg APP_REVISION='$COMMIT' \
  && docker compose up -d \
  && sleep 5 && docker compose ps --format '{{.Name}} {{.Status}}'"

# Selbstprüfung: meldet der Server den Stand, den wir gerade gebaut haben?
if [ -n "$PRUEF_URL" ]; then
  for i in $(seq 1 12); do
    GEMELDET="$(curl -sf --max-time 5 "$PRUEF_URL" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).beschreibung)}catch{console.log('')}})" 2>/dev/null || true)"
    if [ -n "$GEMELDET" ]; then break; fi
    sleep 5
  done
  if [ "${GEMELDET:-}" = "$VERSION" ]; then
    echo "✓ Server läuft auf $GEMELDET"
  else
    echo "⚠ Server meldet '${GEMELDET:-nichts}', gebaut wurde '$VERSION' — bitte prüfen ($PRUEF_URL)"
    exit 1
  fi
fi
