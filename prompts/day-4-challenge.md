# Tag 4 — Herausforderung

**Heute soll am Ende stehen:** Das Spiel hat eine Spannungskurve. Es wird schwerer, oder es gibt Levels, oder es lockt mit einem Highscore.

**Worauf du dich konzentrierst:**
- Eine **Punkteanzeige** prominent oben einbauen
- **Steigende Schwierigkeit:** schneller, mehr Gegner, weniger Zeit, kleinere Treffflächen — etwas, das den Druck erhöht
- Optional: **Levels** (z. B. nach jedem 10. Punkt eine neue Hintergrundfarbe / neuer Gegnertyp)
- Optional: **Highscore** in `localStorage` (nur als Zahl speichern, nichts Personenbezogenes)
- Game-Over-Bildschirm mit "Nochmal spielen"-Knopf

**Was du heute NICHT tust:**
- Visuelle Großüberholung (Tag 3 war das)
- Spielmechanik komplett neu erfinden — die Regel von Tag 2 bleibt, sie wird nur fordernder

**Wenn der Wunsch zu offen ist (z. B. "Mach es schwerer"):**
- Wenn etwas mit Geschwindigkeit zu tun hat → langsam beschleunigen über Zeit
- Wenn es um Treffen/Fangen geht → kleinere Ziele oder mehr gleichzeitig
- Wenn es um Ausweichen geht → mehr Hindernisse, schneller spawnen

**Wichtig:** "Spiel muss IMMER neu startbar sein." Beim Game-Over kein Browser-Reload nötig — ein Knopf reicht.
