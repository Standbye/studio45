# Studio45 – Konzept und Rebuild-Spezifikation

> Peters Spezifikation vom 9. Okt. 2026, aus einem anderen Chat übernommen am 2026-10-19.
> Abschnitte 1–11 stehen im Wortlaut, die Tabellen sind in Markdown umgesetzt.
> Davor steht ein **Abgleich mit dem gebauten Stand**: Wo der Text vom Produkt abweicht,
> wird das dort vermerkt. Der Text selbst wird nicht stillschweigend angepasst.
>
> Damit liegt erstmals die Idee im Repo, aus der der Code gebaut wird (Leitgedanke
> „Die Idee ins Git, den Code baut die KI“ in `NEXT_BUILD.md`).
>
> Abschnitt 9 und 10.5 sind Arbeitsanweisungen für einen Neubau von null. Sie sind
> **kein laufender Auftrag**: Gebaut wird weiter nur auf Peters Kommando.

---

## Abgleich mit dem gebauten Stand (2026-10-19, live `v1.1.0-39-gf6627d7`)

### Überholt: im Produkt schon weiter als im Text

| Stelle | Text sagt | Stand heute |
|---|---|---|
| 8, Lasttest | steht aus | Am 2026-10-11 mit echtem Anbieter gelaufen: 10 Gruppen parallel, 2 Runden, 20/20 Bauten ok. |
| 8, Bauzeit | nicht gemessen | Im Lasttest 36–55 s pro Bau. Das Ziel von 4–5 Bauten pro Stunde ist damit zeitlich erreichbar; begrenzt wird es durch Versuchskontingent und Denkpause. |
| 5, Unterstützungslevel | ein Regler 1–5 | Heute **zwei getrennte Regler**: „Spielraum der KI“ 1–5 (Weit … Eng, das ist die Leitplanken-Idee) und „Hilfe beim Formulieren“ 0–3 (Keine, Impulse, Impulse + Formulierungshilfe, Volle Begleitung). Ein Kind kann Sprachhilfe brauchen und trotzdem selbst entscheiden wollen. |
| 8, Release-Tag | fehlt | Fehlt weiterhin. Live läuft der ungetaggte Stand 39 Commits nach v1.1.0. |

### Gebaut, aber nicht im Text

- **Tagesfokus für die Kinder:** Motto und Fokus der Stunde stehen im Kinder-Studio und am Beamer, die Satzanfänge passen zum Fokus.
- **Lernfall:** Die Lehrkraft schaltet ihn in Stufen frei. Ein KI-gebautes Spiel hält nicht alle seine eigenen Regeln ein, die Gruppen prüfen es mit einer Checkliste, eine zweite Fassung repariert Fehler und bringt einen neuen mit. Damit wird „Die KI klingt sicher, auch wenn sie falsch liegt“ **erlebt** statt nur benannt; das betrifft die Lücke im fünften Punkt von Abschnitt 8.
- **Hilfen für die Kleinen:** Vorlesen, Rückfrage zum Antippen statt Umformulierung, „Etwas geht nicht“ mit geführten Beobachtungen, „Das ist neu“ nach jedem Bau, „Einen Schritt zurück“.
- **Gründlichkeit** pro KI-Verbindung; der Director's Cut darf bis zu 150.000 Token ausgeben.
- **Reiter „KI-Anweisung“:** Hier setzt die Lehrkraft die Grenzen für die KI.
- **Ton:** Hörbar nach dem Start-Knopf, mit Schalter zum Abschalten.
- **Isolation der Gruppen** wurde geprüft: Es gibt keine gegenseitige Beeinflussung.

### Abweichung, Entscheidung offen

- **3, Streaming:** Abschnitt 9 verlangt das Streaming der Generierung an den Client. Gebaut ist es nicht: Das Kinder-Studio fragt den Stand alle 4 s ab und zeigt das Spiel erst, wenn es fertig geprüft ist. Für Kinder ist das eher richtig, denn ein halbfertiges Spiel wäre verwirrend.
- **6, Thementafel 1:** Der Text nennt „Die KI klingt immer sicher …“, im Produkt heißt die Tafel „Die KI ist ein Werkzeug — kein Mensch“. Tafel 2 heißt „Sicher unterwegs mit KI“.
- **6, Materialien:** Gebaut sind 12 Druckbögen: Rollenkarten, Laufplan, KI-Tipps, Thementafeln, QR-Blätter, Lehrer-Laufzettel, Stundenverlauf, Testbogen, Bugreport-Karten, Ich-kann-Bogen, Elternbrief, Urkunden. Die „Checkliste vor der Stunde“ aus Abschnitt 6 ist der Laufzettel.
- **2, Pressetermin:** Der Text nennt den 04.08.2026 (das ist das Datum von v1.0.0). Nach dem Pilot-Chat war der letzte Termin mit Presse, Urkunden und begehbarer Lindenschule am 10.07.2026. Welches Datum stimmt, muss Peter sagen.

### Noch offen, wie im Text beschrieben

- **7, Spracheingabe:** Das Kinder-Studio zeigt keinen Hinweis darauf, dass das Audio in Chrome an Google und in Safari an Apple geht. Der Elternbrief verspricht „keine Namen, Fotos oder persönlichen Daten“. Der Widerspruch besteht also weiter (gesammelt in `NEXT_BUILD.md`).
- **7, DSGVO und Auftragsverarbeitungsvertrag** für den Fremdeinsatz: ungeklärt.
- **8, Einsatz im Klassenzimmer:** Der nächste Einsatz ist das Führungskräfte-Symposium am 14.11.2026.
- **10, Codex als MCP-Server:** nicht eingerichtet, und es gibt kein `reviews/`-Verzeichnis. Codex arbeitet heute in einem eigenen Worktree (`~/coding/studio45`) am Material, siehe `AGENTS.md`.

---

## 1. Zweck und Intention

Studio45 („Spielestudio in 45 Minuten“) ist ein selbst gehostetes Open-Source-Werkzeug, mit dem Schulklassen in Kleingruppen per Sprache oder Text eigene Browser-Lernspiele bauen und dabei den Umgang mit KI lernen. Der Name steht für eine Schulstunde: Eine Gruppe soll in 45 Minuten vom Wunsch zum spielbaren Ergebnis kommen.

Kernbotschaft, die das Tool erlebbar machen soll: Gute Ergebnisse hängen von klarer Spezifikation ab. „Mach schöner“ hilft nicht, man muss sagen, was genau schöner werden soll. Wenn die KI Mist baut, ist das der beste Lernmoment. Leitsatz für die Kinder: **„Ich entscheide, die KI schlägt vor.“**

Zielgruppen: Grundschule (Pilot: 4. Klasse), Mittelstufe, Oberstufe. Betreiber sind Schulen oder Patenunternehmen, nicht der Autor. Das Tool bringt keinen eigenen KI-Zugang mit; der Betreiber nutzt eigene API-Keys.

Referenzen: Repo github.com/Standbye/studio45 (AGPL-3.0), Docker-Image ghcr.io/standbye/studio45, Live-Instanz studio45.littleproject.de. Stand: v1.1.0 vom 06.08.2026.

## 2. Entstehung und pädagogischer Hintergrund

Auslöser war der Osterurlaub 2026: Peter baute mit seinem Sohn (damals 4. Klasse) per Spracheingabe ein 2D-isometrisches Schulspiel mit Matheaufgaben, Setting war die eigene Schule mit den eigenen Lehrern als Aufgabensteller. Der Sohn zeigte es in der Schule, Lehrer und Direktor wollten ein Klassenprojekt.

Pilot „lsg-ai“ an der Lindenschule Gerlachsheim (4. Klasse): 5 Schulstunden geplant, 3 durchgeführt, Abschluss mit Pressetermin am 04.08.2026. Technik des Prototyps: Backend auf eigenem Server, Weboberfläche auf iPads, Eingabe per Sprache oder Text, Anbindung über OpenRouter, Ergebnis ein reines HTML-Spiel im Frontend. 5 Gruppen mit rotierenden Rollen. Ablauf: Stunde 1 Projektvorstellung, Handout „Wie spricht man mit KI“, Grobkonzept; danach Ausbau; zum Schluss Sounds, Design und gezielte Änderungen.

Lehren aus dem Piloten, die ins Produkt eingeflossen sind:

- Der Prototyp lief nur mit Peter vor Ort; das Produkt muss von Dritten mit eigenen Keys betreibbar sein.
- Kinder geben wenig Input, die KI muss Lücken füllen können, soll aber nicht alles vorwegnehmen. Daraus wurde das einstellbare Unterstützungslevel.
- Aus 5 Stunden wurden 3; das Produkt bietet deshalb ein Format mit 3 und eines mit 5 Terminen.
- Erst besprechen, dann bauen; daraus wurden Versuchskontingent und Denkpause.

Studio45 ist eine komplette Neuimplementierung des Prototyps, nicht dessen Fortführung (v1.0.0 am 04.08.2026, v1.1.0 am 06.08.2026). Es stand bis Stand 20.09.2026 noch in keinem Klassenzimmer.

## 3. Technische Architektur und Deployment

Studio45 ist ein einzelner Docker-Container zum Selbsthosten hinter einem Reverse-Proxy. Repo-Struktur laut Stand v1.1.0: TypeScript/React-Frontend (`src/`, `src/components/ui/`), Prisma mit Migrationen (`prisma/migrations/`), Prompt-Dateien unter `prompts/`, Materialien in `src/lib/materials.tsx`, Zielgruppen-Logik in `src/lib/audience.ts`, Tages-Mottos in `src/lib/prompts.ts`, `CHANGELOG.md`.

| Baustein | Anforderung |
|---|---|
| Laufzeit | Ein Docker-Image, Konfiguration per Umgebungsvariablen, Datenbank via Prisma (Migrationen im Repo) |
| KI-Anbindung | Austauschbare Provider: Anthropic, OpenAI, OpenRouter, Langdock, Azure OpenAI, lokales Modell über Ollama. Keys werden vom Admin hinterlegt, nie im Client |
| Eingabe | Text oder Sprache (Web Speech API im Browser) auf Tablets/iPads und Laptops |
| Ausgabe | Ein reines HTML/JS-Spiel pro Gruppe, läuft komplett im Browser, keine Serverlogik im Spiel |
| Spielausführung | Generierter Code gilt als nicht vertrauenswürdig: abgeschottet in sandboxed iframe, kein Zugriff auf Host-Seite |
| Qualitätssicherung | Jede Generierung wird automatisch geprüft (Syntax/Laufzeit) und bei Bedarf per Reparatur-Durchlauf korrigiert |
| Prompt-Architektur | Kern-Prompt (`prompts/kern.md`) plus Tages-Prompts (`day-1-idee` bis `day-5-polish`) plus Moderations-Prompt; Zielgruppe und Unterstützungslevel modulieren die System-Anweisung |
| Gruppen-Zugang | QR-Code mit Join-Token pro Gruppe, kein Login, keine Namen, keine personenbezogenen Daten |
| Token-Tracking | Input- und Output-Token pro Bau und pro Gruppe, Budget auf Workshop-Ebene, Umrechnung in Energie-Alltagsvergleiche |
| Lizenz | AGPL-3.0; wer eine veränderte Fassung öffentlich betreibt, muss Änderungen offenlegen |

## 4. Rollen und Oberflächen

Drei Ebenen mit getrennten Oberflächen.

| Ebene | Zugang | Was sie kann |
|---|---|---|
| Admin | Login | Workshops anlegen, KI-Verbindungen (Provider, Modell, Key) hinterlegen, Token-Budget pro Workshop setzen, Branding (Logo/Name) für Materialien |
| Lehrkraft | Login oder Workshop-Code | Tag (1–5) und Phase steuern, Zielgruppe und Unterstützungslevel wählen, Prompt-Verlauf jeder Gruppe einsehen, Plenum-Schaltung (alle Geräte sperren), Director's Cut (alle Wünsche einer Gruppe zu einer Spezifikation verdichten), Materialien generieren |
| Gruppe | QR-Code, kein Login | Wunsch per Sprache oder Text eingeben, Formulierungshilfe annehmen, Bau auslösen, Spiel testen, Token-/Energieanzeige sehen, Hub-Welt betreten |

Gruppenrollen (Rollenkarten, mit Rotationsplan über die Termine): Sprecher:in (formuliert den Wunsch an die KI), Tester:in (spielt und findet Fehler), Gestalter:in (Optik, Sounds, Design), Teamchef:in (entscheidet, hält die Gruppe zusammen). Im Piloten hießen die Rollen Regisseur, Tester, Designer.

Hub-Welt: Ein begehbarer isometrischer Schulhof (Anlehnung an das Osterurlaub-Spiel), aus dem die Spiele aller Gruppen gestartet werden. Jede Gruppe hat dort ihr Gebäude oder ihren Eingang.

## 5. Didaktische Features

| Feature | Verhalten |
|---|---|
| Tagesstruktur | 5 Tage mit eigenem Motto und Prompt: Tag 1 Idee, Tag 2 Mechanik, Tag 3 Visuals, Tag 4 Test, Tag 5 Polish. Kompaktformat mit 3 Terminen wählbar |
| Unterstützungslevel 1–5 | 1 = KI denkt mit und füllt Lücken; 5 = reines Werkzeug. Ab Stufe 4 bleiben Lücken sichtbar, das Ergebnis ist genau so reich wie die Ansage |
| Zielgruppe | Grundschule, Mittelstufe, Oberstufe: ändert Optik, Ansprache der Oberfläche und die Bau-Anweisung an die KI (Oberstufe erlaubt komplexe Mechaniken und verlangt kommentierten Code) |
| Versuchskontingent | Begrenzte Zahl von Bauten pro Stunde, damit die Gruppe erst bespricht und dann baut |
| Denkpause | Pflichtpause zwischen zwei Bauten; während der Pause wird getestet und besprochen |
| Formulierungshilfe | Bei zu kurzen oder unklaren Wünschen schlägt die KI eine genauere Fassung vor, die Gruppe entscheidet |
| Director's Cut | Lehrkraft verdichtet alle Wünsche einer Gruppe zu einer Spezifikation und löst damit einen Bau aus |
| Plenum-Schaltung | Lehrkraft sperrt alle Gruppengeräte, wenn Aufmerksamkeit nötig ist |
| Token-Transparenz | Live-Zähler pro Bau, Input und Output getrennt, Umrechnung in Alltagsenergie (Handy laden, Minuten Radfahren, Treppensteigen, LED-Lampe); Hinweis, dass Werte Schätzungen sind |
| Spar-Challenge | Optional: Gruppen vergleichen, wer mit wenig Token viel erreicht |
| Fehlerkultur | Bugs und Missverständnisse werden nicht versteckt, sondern mit Bugreport-Karten dokumentiert und als Lernmoment behandelt |

## 6. Unterrichtsmaterialien

Ein Materialien-Generator erzeugt druckbare Handreichungen im Branding des Workshops (Logo, Name). Alle Materialien sind auf Deutsch und auf die gewählte Zielgruppe abgestimmt.

- Rollenkarten für die vier Gruppenrollen mit Rotationsplan
- Handout „Wie rede ich mit der KI?“ mit fünf Regeln (Kern: genau sagen, was man will; Beispiele statt Adjektive; eine Änderung pro Wunsch; erst testen, dann ändern; ich entscheide)
- Thementafel 1: „Die KI klingt immer sicher, auch wenn sie falsch liegt“
- Thementafel 2: Datenschutz-Ampel, Fälschungen, „Erst selber denken, dann fragen“
- Stundenverläufe für das 3- und das 5-Termine-Format
- Testbogen für die Tester:in-Rolle
- Bugreport-Karten
- Ich-kann-Bogen (Selbsteinschätzung der Kinder)
- Elternbrief
- Urkunden zum Abschluss
- Checkliste vor der Stunde (Geräte, Mikrofon-Freigabe für Spracheingabe, QR-Codes, Budget)

## 7. Sicherheit und Datenschutz

- Keine Schülerkonten, keine Namen, keine personenbezogenen Daten. Gruppen sind nur über ihren Join-Token identifizierbar.
- Selbsthosting, auf Wunsch mit lokalem Modell über Ollama, damit keine Prompts das Haus verlassen.
- Generierte Spiele laufen als nicht vertrauenswürdiger Code abgeschottet (sandboxed iframe, keine Cookies, kein Zugriff auf die Hostseite).
- API-Keys liegen nur serverseitig beim Admin.
- Token-Budget pro Workshop als Kostenbremse.
- Bekannte Schwachstelle: Die Spracheingabe über die Web Speech API schickt Audio in Chrome in der Regel an Google, in Safari an Apple. Das widerspricht dem Satz „keine personenbezogenen Daten“ und muss im Neubau entweder dokumentiert oder durch lokale Spracherkennung ersetzt werden.
- DSGVO und Auftragsverarbeitungsvertrag für den Fremdeinsatz sind ungeklärt.

## 8. Offene Punkte und bekannte Lücken

- Echte Generierung noch nicht End-to-End unter Last erprobt (Stand 20.09.2026); Lasttest mit zehn parallelen Gruppen steht aus.
- Bauzeit pro Generierung mit dem Zielmodell nicht gemessen; vier bis fünf Bauten pro Gruppe und Stunde sind das Ziel.
- Live-Instanz läuft auf ungetaggtem Stand nach v1.1.0; Release-Tag fehlt.
- Wo das Unterstützungslevel für welche Altersgruppe stehen sollte, ist eine pädagogische Frage ohne Antwort; der Autor ist Techniker, kein Pädagoge.
- Risiken von KI werden in den Materialien benannt, aber nicht erlebt; erlebt wird nur die Spezifikationslücke.
- Nächster Einsatz: Hands-on-Challenge beim Führungskräfte-Symposium am 14.11.2026, Teilnehmer als erste Tester der neuen Fassung.

## 9. Anweisung an die bauende KI

Baue Studio45 von null neu, mit derselben Intention und denselben Themen wie oben beschrieben. Halte dich an diese Reihenfolge und Leitplanken.

1. **Grundgerüst:** Ein Docker-Container, Web-Frontend (React/TypeScript), Datenbank mit Migrationen, Konfiguration per Umgebungsvariablen. Lauffähig hinter einem Reverse-Proxy.
2. **Provider-Abstraktion:** Eine Schnittstelle für Anthropic, OpenAI, OpenRouter, Langdock, Azure OpenAI und Ollama. Keys nur serverseitig. Streaming der Generierung an den Client.
3. **Drei Oberflächen:** Admin, Lehrkraft, Gruppe, mit den Funktionen aus dem Abschnitt Rollen und Oberflächen. Gruppen-Zugang per QR-Code ohne Login.
4. **Bau-Pipeline:** Wunsch der Gruppe plus Kern-Prompt plus Tages-Prompt plus Zielgruppe plus Unterstützungslevel ergeben die System-Anweisung. Ausgabe ist eine einzelne HTML-Datei. Danach automatische Prüfung und bei Fehler ein Reparatur-Durchlauf. Ausführung im sandboxed iframe.
5. **Didaktische Bremsen:** Versuchskontingent, Denkpause, Formulierungshilfe, Director's Cut, Plenum-Schaltung.
6. **Token-Transparenz:** Zähler pro Bau und Gruppe, Input und Output getrennt, Budget auf Workshop-Ebene, Umrechnung in Alltagsenergie mit Hinweis auf Schätzwerte, optionale Spar-Challenge.
7. **Hub-Welt:** Begehbarer isometrischer Schulhof, aus dem alle Gruppenspiele gestartet werden.
8. **Materialien-Generator:** Alle Handreichungen aus dem Abschnitt Unterrichtsmaterialien als druckbare Seiten im Workshop-Branding, zielgruppenabhängig.
9. **Datenschutz:** Keine personenbezogenen Daten, kein Tracking, Spracheingabe mit klarem Hinweis oder lokaler Alternative.
10. **Lizenz** AGPL-3.0, README mit Installationsanleitung für Lehrkräfte und IT, CHANGELOG, Docker-Image-Build.

**Nicht verhandelbare Grundsätze:** Die Kinder lernen Spezifizieren, nicht Programmieren. Die KI schlägt vor, die Gruppe entscheidet. Fehler sind Lernmomente und werden sichtbar gemacht. Eine Lehrkraft ohne Technikwissen muss eine Stunde allein durchführen können. Alles auf Deutsch, Grundschulkinder als primäre Zielgruppe.

## 10. Cross-Model-Review und Grafik-Pipeline mit ChatGPT-Pro-Abo

Review durch GPT läuft über die Codex CLI (im Pro-Abo enthalten), Grafiken kommen manuell aus der ChatGPT-Oberfläche; Browser-Automatisierung der Oberfläche wird nicht genutzt.

### 10.1 Grundsatz: Abo und API sind getrennte Welten

- Das ChatGPT-Abo deckt die ChatGPT-Oberfläche, die Desktop-App und die Codex CLI (Login per ChatGPT-Account) ab.
- Die OpenAI-API und alle MCP-Server, die einen `OPENAI_API_KEY` verlangen, werden separat pro Token abgerechnet. Das Pro-Abo hilft dort nicht.
- Konsequenz: Review über Codex, Bildgenerierung manuell in der ChatGPT-Oberfläche oder über die Bild-API mit Kleinstbeträgen.

### 10.2 Review-Brücke: Codex CLI als MCP-Server in Claude Code

Installation und Login:

1. `npm install -g @openai/codex`
2. `codex login` – Browser öffnet sich, mit ChatGPT-Account anmelden.
3. Testlauf im Studio45-Ordner: `codex "Erkläre kurz, was in diesem Repo liegt"`.

Einbindung in Claude Code: OpenAI hat den eingebauten Modus `codex mcp-server` (Codex selbst als MCP-Server) zurückgezogen; der Ersatz `codex app-server` ist experimentell. Stabil ist ein kleiner Wrapper, der Codex als Unterprozess aufruft:

- `kky42/codex-as-mcp` – zwei Tools (Codex im Arbeitsverzeichnis ausführen, Review-Modus), schlank, Einstieg.
- `tuannvm/codex-mcp-server` – mehr Optionen (Modell, Sandbox-Level).
- `Mr-Tomahawk/codex-cli-mcp-tool` – ausdrücklich für Claude-Abo plus ChatGPT-Abo gebaut.

Registrierung in Claude Code (Beispiel mit codex-as-mcp):

```
claude mcp add codex -- npx -y codex-as-mcp
```

Danach kann Claude Code Codex Aufträge geben, z. B.: „Reviewe src/lib/materials.tsx gegen Abschnitt 6 der Spezifikation und liste Abweichungen.“

Betriebsmuster für Studio45:

- **Spec-Review vor dem Bau:** Claude Code übergibt dieses Dokument an Codex. Frage: Was fehlt, was widerspricht sich, woran scheitert eine Lehrkraft ohne Technikwissen?
- **Komponenten-Review** nach jedem Meilenstein aus Abschnitt 9: Codex prüft gegen die nicht verhandelbaren Grundsätze.
- **Ideen-Review:** didaktische Entscheidungen (Unterstützungslevel, Versuchskontingent) als Frage an Codex: „Welche Nebenwirkung übersehe ich?“
- **Rückkanal:** Review-Ergebnis als `reviews/<datum>-<thema>.md` ins Repo, damit beide Modelle und Peter dieselbe Spur sehen.
- Optional: Claude-Code-Hook oder Git-Hook, der bei jedem Commit ein Codex-Review anstößt.

### 10.3 Grafiken: zwei Wege, kein Abo-Weg

- **Manuell (empfohlen):** Hub-Schulhof, Rollen-Icons und Sprites einmalig in der ChatGPT-Oberfläche erzeugen, als PNG/SVG unter `public/assets/` ins Repo legen. Es sind wenige Dutzend Dateien.
- **Programmatisch:** nur über die OpenAI-Bild-API mit API-Key, Kosten pro Bild im Cent-Bereich. Nur sinnvoll, falls Gruppen später eigene Sprites generieren sollen; dann als serverseitiger Provider analog zu den Text-Providern, Key bleibt auf dem Server.

### 10.4 Browser-Automatisierung der ChatGPT-Oberfläche: nicht empfohlen

Technisch möglich (Claude in Chrome, Playwright, Browser-Use), aber: verstößt gegen OpenAIs Nutzungsbedingungen, bricht regelmäßig an Cloudflare, Captchas und UI-Änderungen und riskiert die Sperre des Pro-Accounts. Für Studio45 kein tragfähiger Weg, weder für Review noch für Bilder.

### 10.5 Anweisung an die bauende KI

Vor Schritt 1 aus Abschnitt 9: Codex-Wrapper als MCP-Server registrieren, Spec-Review dieses Dokuments anfordern, Rückmeldung in `reviews/00-spec-review.md` ablegen. Nach jedem der zehn Schritte ein Komponenten-Review anfordern. Widersprüche zwischen den Modellen nicht stillschweigend auflösen, sondern Peter zur Entscheidung vorlegen.

### 10.6 Erster Review-Prompt für Codex (Spec-Review)

Claude Code übergibt diesen Prompt zusammen mit dem vollständigen Dokument an das Codex-Tool und legt die Antwort unverändert in `reviews/00-spec-review.md` ab.

```
Du bist unabhängiger Reviewer für die Rebuild-Spezifikation von Studio45,
einem Open-Source-Tool, mit dem Grundschulkinder (4. Klasse) in Gruppen
per KI ein eigenes Lernspiel bauen. Du hast an der Spezifikation nicht
mitgeschrieben. Deine Aufgabe ist Kritik, nicht Bestätigung.

Lies die Spezifikation vollständig. Prüfe sie gegen die sechs nicht
verhandelbaren Grundsätze aus Abschnitt 9 und 11:
1. Kinder spezifizieren, sie programmieren nicht.
2. Die KI schlägt vor, die Gruppe entscheidet.
3. Fehler sind sichtbar und werden nicht wegmoderiert.
4. Eine Lehrkraft ohne Technikwissen muss den Ablauf allein durchführen können.
5. Deutsch, Grundschule als primäre Zielgruppe.
6. Das Tool lehrt genaues Spezifizieren, keine Prompt-Technik:
   jede Hilfe führt zum Präzisieren des Wunsches, nie zu Formeln.

Beantworte genau diese Fragen, in dieser Reihenfolge, auf Deutsch:

A. Lücken: Welche Information fehlt, damit eine KI das Tool ohne
   Rückfragen von null bauen kann? Nenne pro Lücke den Abschnitt und
   was konkret fehlt.
B. Widersprüche: Wo widersprechen sich Abschnitte oder Features?
   Zitiere beide Stellen.
C. Scheiterpunkte für die Lehrkraft: Welche Schritte im Ablauf
   setzen stillschweigend Technikwissen voraus?
D. Scheiterpunkte für Kinder: Wo überfordert die Oberfläche oder der
   Tagesablauf eine 4. Klasse? Wo ist Frust ohne Lerneffekt eingebaut?
E. Sicherheits- und Datenschutzrisiken, die Abschnitt 7 nicht nennt.
F. Die drei wichtigsten Änderungen vor Baubeginn, mit Begründung.

Regeln:
- Keine Zusammenfassung der Spezifikation, keine Lobsätze.
- Jeder Punkt hat die Form: Abschnitt, Befund, Vorschlag.
- Wenn du dir bei einem Befund unsicher bist, schreibe das dazu.
- Erfinde keine Features; schlage nur vor, was die Grundsätze stützt.
- Maximal 1500 Wörter.
```

Folge-Prompts für Komponenten-Reviews nach jedem Meilenstein nutzen denselben Kopf (Rolle, Grundsätze, Regeln) und ersetzen die Fragen A bis F durch: Weicht der Code von Abschnitt X der Spezifikation ab? Welche Grundsätze verletzt er? Was würde im Klassenzimmer zuerst brechen?

## 11. Kernbotschaft und Talking Points

Studio45 lehrt nicht Prompt-Technik, sondern genaues Spezifizieren. Das ist die Haltung, die jede Oberfläche, jeder Prompt und jedes Unterrichtsmaterial transportieren muss.

**Folien-Einzeiler: Nicht prompten lernen, sondern wollen lernen.**

- Vieles, was man anfangs im Umgang mit KI gelernt hat, ist nach ein bis zwei Jahren obsolet. Prompt Engineering galt als Schlüsselkompetenz und ist es heute nicht mehr. Studio45 darf deshalb keine Prompt-Tricks vermitteln.
- Was bleibt: Je genauer jemand weiß, was er haben will, und je klarer er es sagt, desto besser wird das Ergebnis. Diese Erfahrung können Kinder mit KI unmittelbar machen, weil die Rückmeldung in Minuten kommt.
- KI, hier Studio45, ist ein Gegenüber, das exakt das macht, was man sagt. Das macht Ungenauigkeit sichtbar, ohne dass eine Lehrkraft sie erklären muss.
- Studio45 ist ein Framework, kein Fach: Es kann viele Schulthemen tragen, weil die Kinder Inhalte, die sie ohnehin lernen, in ein eigenes Spiel übersetzen.
- Bestehende Unterrichtsinhalte werden damit interaktiver und mit weniger Aufwand aufbereitet, statt neue Inhalte zu erfinden.

Konsequenz für die bauende KI: Alle Hilfetexte, Unterstützungslevel und Moderationsprompts sollen auf das Präzisieren des Wunsches hinführen („Was genau soll passieren, wenn ...?“), nie auf Formulierungsformeln oder Schlüsselwörter.
