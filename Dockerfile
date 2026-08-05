# Studio45 — Multi-Stage-Build, läuft als non-root, Daten liegen im Volume /data
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL wird für `prisma generate` gebraucht, nicht für eine echte Verbindung
ENV DATABASE_URL="file:/data/studio45.db"
RUN npx prisma generate && npm run build:next

FROM node:22-slim AS runner
WORKDIR /app

# Verknüpft das Image auf GHCR mit dem Repository (Quellcode, README, Lizenz)
LABEL org.opencontainers.image.source="https://github.com/Standbye/studio45" \
      org.opencontainers.image.description="Studio45 — Kinder lernen KI-Kompetenz, indem sie per Sprache eigene Lernspiele bauen." \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data \
    DATABASE_URL="file:/data/studio45.db"

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 --create-home studio45 \
  && mkdir -p /data && chown -R studio45:studio45 /data

# Standalone-Server + statische Dateien
COPY --from=builder --chown=studio45:studio45 /app/.next/standalone ./
COPY --from=builder --chown=studio45:studio45 /app/.next/static ./.next/static
COPY --from=builder --chown=studio45:studio45 /app/public ./public
# Laufzeit-Ressourcen: Systemprompts, Three.js, Verifikations- und Migrations-Runner,
# Migrations-SQL. Die Prisma-CLI wird nicht mitgeliefert — runtime/migrate.mjs wendet
# die Migrationen direkt an (siehe Kommentar dort).
COPY --from=builder --chown=studio45:studio45 /app/prompts ./prompts
COPY --from=builder --chown=studio45:studio45 /app/runtime ./runtime
COPY --from=builder --chown=studio45:studio45 /app/vendor ./vendor
COPY --from=builder --chown=studio45:studio45 /app/prisma/migrations ./prisma/migrations
COPY --chown=studio45:studio45 docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER studio45
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
