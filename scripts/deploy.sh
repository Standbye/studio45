#!/usr/bin/env bash
# Deploy auf den Server: rsync des Repos + Neubau des Containers.
#
# Läuft aus JEDEM Arbeitsverzeichnis — die Quelle ist immer das Repo, in dem
# dieses Skript liegt. (Lehre vom 2026-08-11: ein rsync mit relativem `./` aus
# dem falschen Arbeitsverzeichnis hat mit --delete das gesamte ~/coding nach
# /opt/studio45 gespült und die dortigen Quellen gelöscht.)
#
# Aufruf: scripts/deploy.sh [ssh-host:zielpfad]   (Standard: lsg-srv:/opt/studio45/)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIEL="${1:-lsg-srv:/opt/studio45/}"
HOST="${ZIEL%%:*}"
PFAD="${ZIEL#*:}"

echo "Quelle: $REPO"
echo "Ziel:   $ZIEL"

rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude 'data' \
  --exclude '.env' --exclude 'docker-compose.override.yml' \
  "$REPO/" "$ZIEL"

ssh "$HOST" "cd '$PFAD' && docker compose up -d --build && sleep 5 && docker compose ps --format '{{.Name}} {{.Status}}'"
