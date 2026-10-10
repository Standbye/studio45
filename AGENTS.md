<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Zusammenarbeit: getrennte Worktrees (Claude und Codex)

An diesem Repo arbeiten zwei KI-Agenten. Damit sie sich nicht in die Quere kommen, hat jeder
ein eigenes Verzeichnis (git worktree) und einen eigenen Branch:

| Agent  | Verzeichnis                | Branches   | Dev-Port |
| ------ | -------------------------- | ---------- | -------- |
| Codex  | `~/coding/studio45`        | `codex/…`  | 3020     |
| Claude | `~/coding/studio45-claude` | `claude/…` | 3021     |

Regeln:

- **Nur im eigenen Verzeichnis arbeiten.** Im Verzeichnis des anderen nichts ändern: kein
  Checkout, kein Stash, kein Reset, keine Dateiänderung.
- **Nie direkt auf `main` committen.** `main` ist der gemeinsame Integrationsstand und in
  keinem Verzeichnis ausgecheckt.
- **Integrieren:** eigene Arbeit committen → `git fetch origin && git rebase origin/main` →
  prüfen (`npx tsc --noEmit`, bei Druckmaterial der PDF-Härtetest) →
  `git push origin HEAD:main`. Nur Fast-Forward, nie `--force`. Danach auf dem eigenen
  Branch weiterarbeiten.
- **Vor einer neuen Aufgabe** `git fetch origin && git rebase origin/main`, damit die Arbeit
  des anderen enthalten ist.
- Jeder Baum hat eigene `node_modules`, eine eigene `.env` und ein eigenes `data/`
  (eigene SQLite-Datenbank).
- **Zuständigkeiten (Stand 2026-10-10):** Codex überarbeitet die Druckmaterialien
  (`src/lib/materials.tsx`, `src/lib/workshop-days.ts`, `src/components/material-dokument.tsx`,
  `src/app/druck/**`, `src/app/lehrer/[id]/material/**`, `scripts/material-*`,
  `scripts/druck-pdf.ts`). Claude macht alles Übrige (Generierung, Sicherheit, Regler,
  Lehrer- und Kinder-Oberfläche, Betrieb). Wer eine Datei aus dem Bereich des anderen
  ändern muss, klärt das vorher mit Peter.
- `NEXT_BUILD.md` ändern beide: kleine, eigene Commits, fremde Einträge stehen lassen.
- **Deploy und Release nur auf Peters Ansage**, und nur aus einem Stand, der `origin/main`
  entspricht (`scripts/deploy.sh`).
