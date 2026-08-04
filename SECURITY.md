# Sicherheit

## Schwachstellen melden

Bitte **keine** öffentlichen Issues für Sicherheitslücken. Melde sie an
**lsg-ai@reuschlein.de** — gern mit Beschreibung, betroffener Version und
Reproduktionsschritten. Ich melde mich innerhalb weniger Tage zurück.

Studio45 wird von Kindern in Schulen benutzt. Meldungen zu Datenschutz oder
Kinderschutz werden bevorzugt behandelt.

## Bedrohungsmodell

Drei realistische Angreifer:

1. **Internet-Grundrauschen** — Bots und Scanner auf jede öffentlich erreichbare Instanz.
2. **Neugierige Kinder** — probieren Codes durch, spammen Generierungen, öffnen die DevTools.
   Kein böser Wille, aber Alltag und deshalb Standard-Annahme.
3. **Gezielte Angriffe** — auf den API-Key (verursacht echte Kosten), auf Lehrer-/Admin-Zugänge
   oder um Inhalte auf einer Schul-Seite zu platzieren.

## Getroffene Maßnahmen

**KI-generierter Code ist untrusted.** Das ist die zentrale Besonderheit dieser Anwendung:
Der Code in den Spielen wurde von einem Sprachmodell auf Zuruf von Kindern geschrieben.

- Auslieferung nur über `/g/<code>/play` mit eigener CSP:
  `default-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'` —
  ein Spiel kann keine Netzwerkverbindung aufbauen und keine Daten abfließen lassen.
- Einbindung ausschließlich als `sandbox="allow-scripts"` **ohne** `allow-same-origin`:
  kein Zugriff auf Cookies, Session oder das Eltern-Dokument.
- Vor der Veröffentlichung läuft jedes Spiel durch eine Verifikation
  (`runtime/dom-stub.mjs`, eigener Prozess mit Timeout): Struktur-Prüfung, Ausführung der
  Skripte in einer DOM-Attrappe über 30 Frames. Externe Skripte werden abgelehnt.

**Zugänge**

- Passwörter mit argon2id gehasht; kein Default-Passwort — der erste Aufruf erzwingt die
  Anlage des Admin-Kontos.
- Lehrer-Accounts erhalten ein Startpasswort mit **Wechselzwang beim ersten Login**.
- Konto-Sperre nach 8 Fehlversuchen (5 Minuten) plus Ratenbegrenzung pro Gerät.
- Session-Cookies: `HttpOnly`, `SameSite=Lax`, `Secure` in Produktion; signiert (HS256).
- Kinder haben keinen Account: Zugang über einen 20-stelligen Zufallscode (~100 Bit).
  Fehlversuche mit unbekannten Codes werden pro Gerät begrenzt.

**Mandanten-Isolation**

- Jede Lehrer-Aktion prüft serverseitig die Zugehörigkeit von Workshop bzw. Gruppe zur
  angemeldeten Lehrkraft (siehe `ownWorkshop`/`ownGroup` in `src/app/lehrer/actions.ts`).

**Kosten & Missbrauch**

- API-Keys werden nur serverseitig gespeichert und in der Oberfläche maskiert (letzte 4 Zeichen).
- Token-Budget pro Workshop als harte Obergrenze; Generierungs-Kontingent und Denkpause
  werden serverseitig geprüft, nicht nur im Frontend.
- Sperre gegen parallele Generierungen derselben Gruppe.

**Uploads**

- Logos: nur PNG/JPG/WebP, Größenbegrenzung, serverseitiges Re-Encoding nach WebP.
  **SVG ist bewusst nicht erlaubt** (kann Skripte enthalten).

**Betrieb**

- Container läuft als non-root, Daten ausschließlich im Volume `/data`.
- Keine Secrets im Image — Konfiguration nur über Umgebungsvariablen zur Laufzeit.
- Security-Header (CSP, `nosniff`, `frame-ancestors`, `Referrer-Policy`) für alle Seiten.
- Audit-Log für Admin- und Lehreraktionen; Prompts und Secrets landen nicht in den Server-Logs.

## Bekannte Grenzen

- Die Ratenbegrenzung liegt im Arbeitsspeicher — bei mehreren Instanzen hinter einem
  Load-Balancer wirkt sie pro Instanz.
- Studio45 terminiert kein TLS. Der Betrieb ohne vorgelagerten HTTPS-Proxy ist nicht vorgesehen.
- Die Inhalte generierter Spiele werden vom Modell moderiert, aber nicht zusätzlich gefiltert.
  Die Lehrkraft sieht jederzeit den vollständigen Prompt-Verlauf und kann Stände zurücksetzen.
