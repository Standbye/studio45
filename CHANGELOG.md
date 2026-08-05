# Änderungsverlauf

Alle nennenswerten Änderungen an Studio45. Das Format orientiert sich an
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/), die Versionierung an
[Semantic Versioning](https://semver.org/lang/de/).

## [1.0.1] — 2026-08-05

### Behoben

- **Helle Marken-Farben machten Text unlesbar.** Weiße Schrift war an vielen Stellen fest
  verdrahtet — bei einem weißen oder sehr hellen Hauptton verschwand sie. Schriftfarben werden
  jetzt aus der Hintergrundfarbe berechnet (WCAG-Leuchtdichte), und die Marken-Farbe wird
  automatisch abgedunkelt, wo sie als Text auf hellem Grund steht. Betrifft Kopfzeile und
  Knöpfe der Schüler-Seite, Plenum-Bildschirm, Beamer-Seite, Spiel-Platzhalter und die
  Druckmaterialien.

### Neu

- **Farbvorschau im Branding-Reiter**: zeigt Kopfzeile, Chip, Knopf und Druck-Überschrift in
  den gewählten Farben samt Kontrastwerten — bevor die Klasse davorsitzt.

## [1.0.0] — 2026-08-04

Erste vollständige Fassung. Studio45 löst den handgestrickten Prototyp ab, mit dem eine
4. Klasse der Lindenschule Gerlachsheim ihre eigenen Lernspiele gebaut hat, und macht daraus
ein Produkt: mandantenfähig, für beliebige Schulen und Altersstufen, als ein Docker-Container
zum Selbsthosten.

### Für Schülerinnen und Schüler

- **Studio pro Gruppe** unter einem nicht ratbaren Zugangscode — ohne Anmeldung, ohne Namen,
  ohne personenbezogene Daten. Der Einstieg läuft über einen QR-Code.
- **Sprechen statt tippen**: Spracheingabe auf Deutsch, Texteingabe als Rückfallebene.
- **Das Spiel läuft direkt daneben** und aktualisiert sich, sobald eine neue Fassung fertig ist.
- **Wartezeit wird sichtbar**: Fortschrittsbalken mit Restzeit, geschätzt aus den bisherigen
  Bauzeiten des Workshops. Während des Bauens ist die Eingabe gesperrt.
- **Notausgang**: Dauert eine Generierung ungewöhnlich lange, lässt sich das Warten beenden,
  statt vor einem stehenden Ladebildschirm zu sitzen.
- **Formulierungshilfe** (abhängig vom Unterstützungslevel): Bei sehr kurzen Wünschen schlägt
  Studio45 eine genauere Fassung vor — zum Übernehmen, direkt Bauen oder Verwerfen. Sie zählt
  nicht gegen das Kontingent.
- **Denkpause und Versuchskontingent** pro Schulstunde — bewusst als didaktische Bremse gegen
  „Stichwort eintippen und generieren".
- **Optik und Ansprache passen sich der Altersstufe an**: verspielt in der Grundschule,
  reduziert in der Oberstufe.

### Für Lehrkräfte

- **Unterrichts-Steuerung**: Tag und Phase (Plenum / Studio / Pause) zentral umschalten; im
  Plenum sehen alle Geräte den Merksatz des Tages.
- **Zielgruppe** wählen (Grundschule · Klasse 5–10 · Klasse 10–13) — wirkt auf Oberfläche und
  auf die Art, wie die KI baut.
- **Unterstützungslevel 1–5**: von „die KI denkt mit und ergänzt großzügig" bis „reines
  Werkzeug, das nur ausführt". Steuert zugleich die Hilfen auf der Schüler-Seite.
- **KI-Anweisung einsehen und anpassen**: Der vollständige Auftrag an die KI ist sichtbar,
  aufgeschlüsselt nach Herkunft. Die didaktische Zone lässt sich überschreiben und
  zurücksetzen; der technische Kern bleibt fest.
- **Lernziel** als fachlicher Auftrag — die Aufgaben werden in den Spielfortschritt eingebaut,
  nicht als wegklickbares Quiz davorgesetzt.
- **Gruppen verwalten**: Studio-Namen, QR-Codes, Sperren, Versuche live nachladen, neue Stunde
  starten.
- **Director's Cut**: alle Wünsche einer Gruppe zu einer Spezifikation verdichten, diese
  bearbeiten und daraus ein vollständiges Spiel bauen — wahlweise als echtes 3D mit Three.js.
  Der bisherige Stand wird vorher gesichert.
- **Zeitreise**: frühere Spielstände wiederherstellen.
- **Prompt-Verlauf** pro Gruppe und Tag — Material für die Reflexionsrunde.
- **Branding**: Farbschema und Logo pro Workshop, sichtbar in Schüler-Oberfläche, Beamer-Seite
  und allen Druckmaterialien.
- **Materialien-Generator**: Rollenkarten, zwei Thementafeln zu Gefahren und Risiken von KI,
  QR-Blätter, Stundenverläufe mit Reflexionsfragen, Ich-kann-Bogen, Elternbrief und Urkunden —
  im Branding des Workshops, direkt aus dem Browser druckbar.

### Für Administratoren

- **Ein Admin pro Instanz**: legt Workshops an, erzeugt Lehrer-Zugänge mit Startpasswort und
  erzwungenem Wechsel beim ersten Login, pflegt die KI-Verbindungen.
- **KI-Verbindungen** mit zwei Protokollen — Anthropic (Messages, mit Prompt-Caching) und
  OpenAI-kompatibel (`chat/completions`). Damit laufen unter anderem OpenAI, OpenRouter,
  Langdock, Azure OpenAI, Groq und lokale Modelle über Ollama. Vorlagen füllen Endpunkt und
  übliche Modellnamen vor; ein Testknopf prüft die Verbindung mit einem Probeaufruf.
- **Token-Budget** pro Workshop, jederzeit anpassbar, serverseitig hart durchgesetzt.
- **Protokoll** aller Admin- und Lehreraktionen.

### Öffentliche Seiten

- **Beamer-Seite** pro Workshop mit den QR-Codes aller Gruppen, Tagesfokus und Merksatz.
- **Begehbare Hub-Welt**: ein isometrischer Schulhof, aus dem heraus die Spiele gestartet
  werden — Stationen und Figuren werden aus den Workshop-Daten erzeugt und passen sich der
  Gruppenzahl an.

### Technik und Sicherheit

- **Ein Docker-Container**, non-root, alle Daten im Volume `/data`. Migrationen laufen beim
  Start automatisch (eigener Runner, der Fremdschlüssel außerhalb der Transaktion abschaltet —
  Lehre aus einem früheren Datenverlust).
- **Konfigurierbare Basis-URL**: steuert die QR-Code-Generierung; alle Bereiche liegen unter
  Unterverzeichnissen statt Subdomains.
- **KI-generierte Spiele gelten als nicht vertrauenswürdiger Code**: Auslieferung mit eigener,
  strenger CSP (`default-src 'none'`, keine Netzwerkzugriffe), Einbindung ausschließlich im
  `sandbox="allow-scripts"`-iframe ohne `allow-same-origin`.
- **Automatische Verifikation** jeder Generierung: Struktur-Prüfung und Ausführung im
  DOM-Nachbau über 30 Frames in einem eigenen Prozess. Schlägt sie fehl, versucht Studio45
  eine Reparatur — und der Versuch wird der Gruppe nicht angerechnet.
- **Spielsteckbrief**: Jedes erzeugte Spiel trägt einen Kommentarblock mit Titel, Figur, Ziel,
  Steuerung und erfüllten Wünschen. Die KI liest ihn bei der nächsten Änderung wieder — so
  bleibt die Linie erhalten, auch wenn der neue Wunsch nur zwei Worte hat.
- **Mandanten-Isolation**: Jeder Zugriff auf einen fremden Workshop wird serverseitig geprüft.
- **Ratenbegrenzung pro Gerät statt pro IP** — im Schul-WLAN teilen sich alle Tablets eine IP.
- Passwörter mit argon2id, Sitzungs-Cookies signiert und `HttpOnly`, Sperre nach Fehlversuchen,
  Logo-Uploads werden serverseitig neu kodiert (kein SVG).
- **Hängengebliebene Generierungen** werden nach zehn Minuten erkannt und geben die Gruppe
  wieder frei.

### Bezug

- **Fertiges Image** auf der GitHub Container Registry: `ghcr.io/standbye/studio45`
  (Tags `latest`, `1.0.0`, `1.0`, `1`), gebaut für `linux/amd64`.
- Ein GitHub-Actions-Workflow baut und veröffentlicht das Image bei jedem Push auf `main`
  und bei jedem Versions-Tag.

### Bekannte Grenzen

- Studio45 terminiert kein TLS und gehört hinter einen Reverse-Proxy.
- Die Ratenbegrenzung liegt im Arbeitsspeicher und wirkt daher pro Instanz.
- Für das Datenverzeichnis gibt es keine eingebaute Sicherung.

[1.0.1]: https://github.com/Standbye/studio45/releases/tag/v1.0.1
[1.0.0]: https://github.com/Standbye/studio45/releases/tag/v1.0.0
