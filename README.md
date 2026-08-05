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
git clone https://github.com/Standbye/studio45.git && cd studio45 && docker compose up -d --build
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
Der Container selbst spricht nur HTTP und bindet in der mitgelieferten `docker-compose.yml`
bewusst nur auf `127.0.0.1` — für einen Test ohne Proxy dort auf `"3000:3000"` ändern.

Migrationen laufen bei jedem Start automatisch (`runtime/migrate.mjs`, siehe unten), es gibt
also keinen separaten Migrationsschritt beim Deployen.

### Reverse-Proxy (nginx-Beispiel)

```nginx
upstream studio45_app { server 127.0.0.1:3000; keepalive 16; }

server {
    listen 80;
    server_name studio45.example.org;
    client_max_body_size 8m;          # Logo-Uploads

    location / {
        proxy_pass http://studio45_app;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        # Überschreiben statt anhängen — sonst kann ein Client eine fremde IP
        # voranstellen und IP-basierte Limits aushebeln.
        proxy_set_header X-Forwarded-For   $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";
        proxy_read_timeout 900s;      # Spiel-Generierung dauert Minuten
        proxy_send_timeout 900s;
    }
}
```

Danach TLS ergänzen, z. B. `certbot --nginx -d studio45.example.org`. **Wichtig:** Die
Generierung eines Spiels kann mehrere Minuten dauern — ohne die erhöhten Timeouts bricht
der Proxy die Anfrage mit 504 ab. Und `BASE_URL` muss auf die öffentliche HTTPS-Adresse
zeigen, sonst führen die QR-Codes der Gruppen ins Leere.

---

## Die drei Ebenen

| Ebene | Zugang | Aufgaben |
|---|---|---|
| **Admin** (einer pro Instanz) | `/admin` | Workshops anlegen, Lehrkräfte anlegen (mit Startpasswort zur Übergabe), KI-Verbindungen pflegen, Budgets vorgeben, Protokoll einsehen |
| **Lehrkraft** | `/lehrer` | Tag & Phase steuern, Zielgruppe und Unterstützungslevel wählen, Lernziel und KI-Anweisung anpassen, Limits, Branding (Farben + Logo), Gruppen verwalten, Prompt-Verlauf, Zeitreise |
| **Gruppe (Kinder)** | `/g/<code>` per QR | Sprechen, bauen, testen — **kein Login, keine Namen, keine personenbezogenen Daten** |

## KI-Anbieter

Studio45 ist nicht an einen Anbieter gebunden. Der Admin legt unter *KI-Verbindungen*
beliebig viele Zugänge an — jede Verbindung besteht aus **Protokoll, Endpunkt, Zugangsschlüssel
und zwei Modellen** (eines für die Kinder-Änderungen, ein stärkeres für den Director's Cut).
Ein Knopf *Testen* schickt einen winzigen Probeaufruf und meldet Fehler im Klartext zurück.

Es gibt genau zwei Protokolle:

| Protokoll | Passt zu | Besonderheit |
|---|---|---|
| **Anthropic** (Messages-API) | Anthropic direkt, Anthropic-kompatible Gateways | Prompt-Caching für den langen Systemprompt — spart bei jedem Aufruf |
| **OpenAI** (`chat/completions`) | OpenAI, OpenRouter, Langdock, Azure OpenAI, Groq, Together, Ollama, LM Studio … | Der De-facto-Standard; praktisch jeder Dienst spricht ihn |

Für die bekannten Anbieter gibt es Vorlagen, die Endpunkt und übliche Modellnamen vorausfüllen
(`src/lib/providers.ts`) — beides bleibt frei überschreibbar, damit neue Dienste und Modelle
ohne Code-Änderung nutzbar sind. Bei **Azure** wird der Deployment-Name als Modell eingetragen,
bei **Ollama** zeigt der Endpunkt auf die lokale Instanz.

> Hinweis zur Modellwahl: Ein komplettes Spiel ist eine große, zusammenhängende Datei. Kleine
> oder stark quantisierte Modelle brechen dabei oft mittendrin ab — die eingebaute Verifikation
> erkennt das zwar und der Versuch wird den Kindern nicht angerechnet, aber der Spaß leidet.

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
- Zugangsschlüssel der KI-Verbindungen bleiben serverseitig und werden maskiert angezeigt.
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

**Stack:** Next.js 16 (App Router) · Prisma 7 + SQLite · Tailwind 4 + shadcn/ui · Anthropic- und OpenAI-SDK.

### Eigenheiten, über die man sonst stolpert

- **Migrationen im Container** laufen über `runtime/migrate.mjs`, nicht über die Prisma-CLI.
  Das Standalone-Image enthält nur Laufzeit-Abhängigkeiten; die CLI bräuchte ihren kompletten
  eigenen Abhängigkeitsbaum. Der Runner wendet die SQL-Dateien aus `prisma/migrations/` an und
  merkt sich den Stand in `_studio45_migrations`. Er schaltet dabei **außerhalb** jeder
  Transaktion `foreign_keys = OFF` — mit aktiven Fremdschlüsseln löscht das `DROP TABLE` in
  Prisma-Umbaumigrationen abhängige Zeilen, bevor sie kopiert sind (echter Datenverlust in
  einem Vorgängerprojekt). Am Ende läuft ein `foreign_key_check`.
- **`better-sqlite3`** wird im Image aus dem Unterverzeichnis des Prisma-Adapters geladen.
  Die Trace-Analyse des Standalone-Builds lässt auf oberster Ebene nur ein `package.json`
  ohne Code zurück; der Runner probiert deshalb mehrere Pfade durch.
- **Prisma 7** braucht `prisma.config.ts` für die Datenbank-URL (im Schema ist `url` nicht
  mehr erlaubt) und einen Driver-Adapter im `PrismaClient`-Konstruktor.
- **Anbieter-Anbindung** liegt komplett in `src/lib/llm.ts` — eine Funktion `rufeModell()`
  kapselt beide Protokolle, alles andere (Spiel bauen, Destillat, Director's Cut) ist
  protokollunabhängig. Ein dritter Anbietertyp wäre dort ein weiterer Zweig.
- **`scripts/` ist von der Typprüfung ausgenommen** (`tsconfig.json`), weil die Skripte den
  generierten Prisma-Client per `.ts`-Pfad importieren und mit `tsx` laufen.
- **Dev-CSP** enthält `'unsafe-eval'`, Produktion nicht — React braucht es nur im
  Entwicklungsmodus für Debugging-Features.
- Die Spiel-Auslieferung unter `/g/<code>/play` bringt eine **eigene, strengere CSP** mit;
  sie ist in `next.config.ts` von der globalen Header-Regel ausgenommen.

## Änderungsverlauf

Siehe [CHANGELOG.md](CHANGELOG.md).

## Lizenz

[AGPL-3.0](LICENSE) — Änderungen an öffentlich betriebenen Instanzen müssen offengelegt werden.
