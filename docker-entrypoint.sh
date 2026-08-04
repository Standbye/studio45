#!/bin/sh
set -e

# Migrationen beim Start anwenden (SQLite-Datei liegt im Volume)
echo "→ Datenbank-Migrationen werden angewendet …"
npx prisma migrate deploy

echo "→ Studio45 startet auf Port ${PORT:-3000} (BASE_URL=${BASE_URL:-nicht gesetzt})"
exec "$@"
