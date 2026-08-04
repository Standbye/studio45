# Studio45 — Spielestudio in 45 Minuten

**Kinder lernen den Umgang mit KI, indem sie ihr eigenes Lernspiel bauen.**

Studio45 ist die Produkt-Fassung eines Schulprojekts: Eine Klasse arbeitet in Kleingruppen,
jede Gruppe entwickelt an einem iPad **per Sprache** ihr eigenes Browser-Spiel — die KI baut,
die Kinder beschreiben, testen und verbessern. Nach jeder 45-Minuten-Einheit gibt es eine
spielbare Version. Die Lehrkraft steuert Tag und Phase zentral.

Gelernt wird dabei nicht nur „Prompten", sondern die ganze Haltung dazu: präzise formulieren,
Ergebnisse prüfen, iterieren — und **einschätzen, was eine KI ist und wo sie irrt**.

---

## Schnellstart (Docker)

```bash
git clone https://github.com/sapitvet/studio45.git && cd studio45 && docker compose up -d --build
```

Danach `http://localhost:3000` öffnen — die **Ersteinrichtung** legt das Admin-Konto an.

### Container selbst bauen

```bash
docker build -t studio45:local .
```

```bash
docker run -d --name studio45 -p 3000:3000 -e BASE_URL="https://studio45.example.org" -v studio45-data:/data studio45:local
```

Der Container läuft als **non-root**, alle Daten (SQLite, Spiele, Snapshots, Logos, Session-Secret)
liegen im Volume `/data`. Migrationen werden beim Start automatisch angewendet.

### Umgebungsvariablen

| Variable | Pflicht | Standard | Bedeutung |
|---|---|---|---|
| `BASE_URL` | **ja** (produktiv) | `http://localhost:3000` | Öffentliche Adresse der Instanz. **Steuert die QR-Code-Generierung** für die Gruppen — bei falschem Wert zeigen die QR-Codes ins Leere. |
| `DATA_DIR` | nein | `/data` | Verzeichnis für Datenbank, Spiele, Logos |
| `DATABASE_URL` | nein | `file:/data/studio45.db` | SQLite-Datei |
| `SESSION_SECRET` | nein | wird erzeugt | Mind. 32 Zeichen. Ohne Angabe wird einmalig ein Secret in `DATA_DIR` erzeugt und wiederverwendet. |
| `PORT` | nein | `3000` | Port im Container |

**Produktivbetrieb:** Studio45 gehört hinter einen Reverse-Proxy mit TLS (nginx, Caddy, Traefik).
Der Container selbst spricht nur HTTP.

---

## Die drei Ebenen

| Ebene | Zugang | Aufgaben |
|---|---|---|
| **Admin** (einer pro Instanz) | `/admin` | Workshops anlegen, Lehrkräfte anlegen (mit Startpasswort zur Übergabe), API-Keys hinterlegen, Budgets vorgeben, Protokoll einsehen |
| **Lehrkraft** | `/lehrer` | Tag & Phase steuern, Lernziel und Führungslevel setzen, Limits, Branding (Farben + Logo), Gruppen verwalten, Prompt-Verlauf, Zeitreise |
| **Gruppe (Kinder)** | `/g/<code>` per QR | Sprechen, bauen, testen — **kein Login, keine Namen, keine personenbezogenen Daten** |

Beamer-/Startseite eines Workshops: `/w/<slug>` — zeigt die QR-Codes aller Gruppen,
den Tagesfokus und den Merksatz des Tages.

## Ablauf einer Einheit

1. **Plenum** (Phase umschalten): Kinder-Geräte zeigen den Merksatz — Aufmerksamkeit nach vorne.
2. **Studio**: Gruppen bauen. Pro Gruppe gibt es ein **Kontingent an Generierungen pro Stunde**
   plus eine **Denkpause** zwischen den Versuchen — das ist Absicht: erst besprechen, dann bauen.
   Fehlgeschlagene Generierungen zählen nicht. Die Lehrkraft kann live nachladen.
3. **Neue Stunde**: Ein Klick setzt die Kontingente aller Gruppen zurück.

## Sicherheit in Kürze

- Von der KI erzeugte Spiele sind **untrusted Code**: Sie laufen ausschließlich im
  `sandbox="allow-scripts"`-iframe **ohne** `allow-same-origin` und mit strikter CSP
  (`default-src 'none'`, keine Netzwerkzugriffe). Im Spiel-Kontext existieren keine Tokens.
- Gruppen-Codes sind lange Zufallswerte (kein `g1`-Schema), Fehlversuche werden begrenzt.
- API-Keys bleiben serverseitig und werden in der Oberfläche maskiert.
- Alle Limits und Budgets werden **serverseitig** durchgesetzt; die Pause im Frontend ist nur UX.
- Ratenbegrenzung **pro Gerät statt pro IP** — im Schul-WLAN teilen sich alle iPads eine IP.
- Logo-Uploads werden serverseitig neu kodiert; **SVG ist nicht erlaubt**.

Details und Meldewege: [SECURITY.md](SECURITY.md).

## Entwicklung

```bash
npm install && npx prisma migrate dev && npm run dev
```

Optional Demo-Daten (Workshop mit drei Gruppen):

```bash
npx tsx scripts/seed-demo.ts
```

**Stack:** Next.js 16 (App Router) · Prisma 7 + SQLite · Tailwind 4 + shadcn/ui · Anthropic SDK.

## Lizenz

[AGPL-3.0](LICENSE) — Änderungen an öffentlich betriebenen Instanzen müssen offengelegt werden.
