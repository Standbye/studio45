import { farbschema } from "@/lib/kontrast";

export type DruckOptionen = {
  /** Querformat — gilt für das ganze Dokument (Thementafeln). */
  quer?: boolean;
  /** Grundschule: rundere Ecken auf den Kinder-Blättern. */
  verspielt?: boolean;
};

/**
 * Gemeinsames Gestaltungssystem für alle Druckmaterialien.
 *
 * Bewusst Print-CSS im Browser statt weasyprint: volle Emoji- und CSS-Unterstützung
 * (Lehre aus dem Piloten), Ausdruck über den Druckdialog als PDF.
 *
 * Grundsätze:
 * - Jedes `.blatt` ist genau EINE A4-Seite. Im Druck bekommt es eine exakte Höhe
 *   (Seitenmaß minus `@page`-Rand) — Inhalte können nicht mehr unkontrolliert
 *   über den Seitenrand laufen, die Fußzeile sitzt verlässlich unten.
 * - Querformat wird pro Dokument geschaltet (`opt.quer`), nicht pro Blatt gemischt —
 *   sonst druckt der Browser Querblätter gestaucht auf Hochformat-Papier.
 * - Farbe kommt aus Akzentlinien und Auszeichnungsfarben, nicht aus Vollflächen:
 *   tonerfreundlich, ruhiges Druckbild, keine Folien-Optik.
 * - Auf weißem Papier muss die Markenfarbe als Schrift lesbar bleiben; sehr helle
 *   Töne dunkelt `farbschema` dafür ab. `--primary`/`--accent` bleiben original.
 */
export function printStyles(primary: string, accent: string, opt: DruckOptionen = {}): string {
  const f = farbschema(primary, accent);
  // A4: 210 × 297 mm, Rand 13 mm → Inhaltsfläche 184 × 271 mm (quer: 271 × 184).
  // Die Druckhöhe bekommt 0,5 mm Luft, damit Rundungsfehler keine Leerseiten erzeugen.
  const seite = opt.quer
    ? { breite: "297mm", hoehe: "210mm", inhaltB: "271mm", inhaltH: "183.5mm", lage: "landscape" }
    : { breite: "210mm", hoehe: "297mm", inhaltB: "184mm", inhaltH: "270.5mm", lage: "portrait" };
  const rand = "13mm";
  const rund = opt.verspielt ? "5mm" : "3mm";

  return `
:root {
  --primary: ${f.primary};
  --accent: ${f.accent};
  --primary-text: ${f.primaryText};
  --accent-text: ${f.accentText};
  --auf-primary: ${f.aufPrimary};
  --auf-accent: ${f.aufAccent};
  --tinte: #1f2430;
  --grau: #6b7280;
  --linie: #d9dee6;
  --rund: ${rund};
}
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--tinte); background: #eef1f5; }

/* Bildschirm-Werkzeugleiste — verschwindet im Druck */
.werkzeugleiste { position: sticky; top: 0; z-index: 10; display: flex; gap: .75rem; align-items: center;
  padding: .75rem 1rem; background: #fff; border-bottom: 1px solid #dfe3ea; }
.werkzeugleiste a, .werkzeugleiste button { font: inherit; font-weight: 600; padding: .45rem .9rem; border-radius: .5rem;
  border: 1px solid #d3d8e0; background: #fff; color: var(--tinte); text-decoration: none; cursor: pointer; }
.werkzeugleiste .haupt { background: var(--primary); border-color: var(--primary); color: var(--auf-primary); }
.hinweis { margin-left: auto; font-size: .85rem; color: var(--grau); }

/* ---- Bogen-Geometrie -------------------------------------------------- */
/* Umbruch VOR jedem Folgeblatt statt nach jedem Blatt — ein abschließendes
   page-break-after würde eine leere Schlussseite drucken. */
.blatt { position: relative; width: ${seite.breite}; height: ${seite.hoehe}; padding: ${rand};
  margin: 1rem auto; background: #fff; box-shadow: 0 2px 12px #0002; overflow: hidden; }
.blatt + .blatt { break-before: page; }
.fuss { position: absolute; left: ${rand}; right: ${rand}; bottom: 9mm; display: flex; justify-content: space-between;
  gap: 5mm; padding-top: 2.5mm; border-top: 0.3mm solid var(--linie); font-size: 8.5pt; color: var(--grau); }

/* ---- Typografie ------------------------------------------------------- */
h1 { font-size: 22pt; font-weight: 800; letter-spacing: -0.01em; margin: 0; color: var(--primary-text); }
h2 { font-size: 13pt; font-weight: 800; margin: 7mm 0 2.5mm; color: var(--primary-text); }
p, li { font-size: 11pt; line-height: 1.55; }
p { margin: 0 0 3mm; }
.klein { font-size: 9pt; color: var(--grau); }
/* Tailwind-Preflight (globals.css) entfernt Listenpunkte — hier explizit zurückholen */
ul { list-style: disc; margin: 0 0 3mm; padding-left: 6.5mm; }
ul li { margin-bottom: 1.6mm; }
ul li::marker { color: var(--accent); }

/* ---- Kopfzeile -------------------------------------------------------- */
.kopf { position: relative; display: flex; align-items: flex-end; gap: 5mm;
  padding-bottom: 3.5mm; border-bottom: 0.3mm solid var(--linie); margin-bottom: 7mm; }
.kopf::after { content: ""; position: absolute; left: 0; bottom: -0.45mm; width: 26mm; height: 0.9mm; background: var(--accent); }
.kopf img { height: 13mm; width: auto; }
.kopf .marke { font-size: 8.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--grau); }
.kopf h1 { margin-top: 1mm; }

/* ---- Bausteine -------------------------------------------------------- */
.kasten { border: 0.4mm solid var(--linie); border-radius: var(--rund); padding: 4.5mm 6mm; break-inside: avoid; }
.kasten.akzent { border-left: 1.6mm solid var(--accent); }
.ktitel { font-weight: 800; font-size: 11.5pt; margin: 0 0 1.5mm; color: var(--primary-text); }

.merksatz { border-left: 1.6mm solid var(--accent); padding: 2mm 0 2mm 6mm; margin: 5mm 0 6mm; break-inside: avoid; }
.merksatz .label { display: block; font-size: 8.5pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--grau); margin-bottom: 1mm; }
.merksatz .satz { font-size: 14.5pt; font-weight: 700; line-height: 1.4; color: var(--primary-text); }

.linie { height: 10.5mm; border-bottom: 0.35mm solid #a8b0bd; }
.check { display: inline-block; width: 5.5mm; height: 5.5mm; border: 0.45mm solid #5b6472; border-radius: 1.2mm; vertical-align: -1.2mm; margin-right: 3mm; }
.kreis { display: inline-block; width: 7mm; height: 7mm; border: 0.5mm solid #5b6472; border-radius: 50%; }
.chip { display: inline-block; border: 0.4mm solid var(--linie); border-radius: 10mm; padding: 1.5mm 4.5mm; font-size: 9.5pt; font-weight: 700; }

/* Ablauf-Tabelle (Stundenverlauf) */
table.plan { width: 100%; border-collapse: collapse; margin-top: 1mm; }
table.plan td { padding: 2.6mm 0; border-bottom: 0.3mm solid var(--linie); vertical-align: top; font-size: 11pt; line-height: 1.45; }
table.plan tr:last-child td { border-bottom: none; }
table.plan td.zeit { width: 22mm; font-weight: 800; color: var(--primary-text); }
table.plan td.was { width: 46mm; font-weight: 600; padding-right: 4mm; }
table.plan td.detail { color: #4b5563; }

/* Ich-kann-Bogen */
table.bogen { width: 100%; border-collapse: collapse; margin-top: 3mm; }
table.bogen th { font-size: 15pt; font-weight: 400; width: 20mm; padding-bottom: 2mm; }
table.bogen th.frage { width: auto; text-align: left; font-size: 9pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--grau); }
table.bogen td { padding: 3.4mm 0; border-top: 0.3mm solid var(--linie); font-size: 12pt; }
table.bogen td.mitte { text-align: center; }

/* Rollenkarten — gestrichelte Kante = Schnittlinie */
.rollen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 5mm; }
.rollenkarte { position: relative; border: 0.35mm dashed #9aa3b0; border-radius: var(--rund); padding: 5mm 6mm; min-height: 102mm; break-inside: avoid; }
.rollenkarte .schere { position: absolute; top: -3.1mm; left: 6mm; padding: 0 1.5mm; background: #fff; font-size: 9pt; color: #9aa3b0; }
.rolle-kopf { display: flex; align-items: center; gap: 3mm; }
.rolle-kopf .emoji { font-size: 19pt; line-height: 1; }
.rolle-kopf .name { font-size: 15pt; font-weight: 900; }
.rolle-rule { width: 16mm; height: 0.8mm; border-radius: 1mm; margin: 2.5mm 0; }
.rollenkarte .aufgabe { font-size: 10.5pt; margin: 0 0 2.5mm; }
.rollenkarte .so { font-size: 8.5pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--grau); margin: 0 0 1.5mm; }
.tipps { list-style: none; margin: 0; padding: 0; }
.tipps li { position: relative; padding-left: 5mm; font-size: 10pt; line-height: 1.45; margin-bottom: 1.6mm; }
.tipps li::before { content: "▸"; position: absolute; left: 0; font-weight: 900; color: var(--rolle, var(--accent)); }

/* Thementafeln (Querformat-Poster) */
.tafel-titel { text-align: center; margin-top: 4mm; }
.tafel-titel .gross { font-size: 29pt; font-weight: 900; letter-spacing: -0.01em; color: var(--primary-text); }
.tafel-titel .unter { margin-top: 1.5mm; font-size: 11.5pt; color: var(--grau); }
.tafel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 9mm; }
.tafel-punkt { display: flex; align-items: center; gap: 6mm; min-height: 52mm; border: 0.4mm solid var(--linie); border-left: 1.8mm solid var(--accent); border-radius: var(--rund); padding: 6mm 7mm; break-inside: avoid; }
.tafel-punkt .icon { font-size: 25pt; line-height: 1.15; }
.tafel-punkt .text { font-size: 15.5pt; line-height: 1.45; margin: 0; }

/* QR-Blatt */
.gruppen-pill { display: inline-block; border: 1mm solid; border-radius: 12mm; padding: 2mm 9mm; font-size: 15pt; font-weight: 900; }
.schritte { display: flex; justify-content: center; gap: 9mm; margin: 6mm 0 2mm; }
.schritt { display: flex; align-items: center; gap: 2.5mm; font-size: 11pt; font-weight: 600; }
.schritt .nr { display: inline-flex; align-items: center; justify-content: center; width: 7.5mm; height: 7.5mm; border: 0.55mm solid; border-radius: 50%; font-size: 10.5pt; font-weight: 900; }
.qr-rahmen { display: inline-block; padding: 5mm; border: 0.5mm solid var(--linie); border-radius: var(--rund); }

/* Urkunde — festlich, mit Doppelrahmen und Serifenschrift */
.blatt.urkunde { padding: 3.5mm; border: 0.9mm solid; border-radius: 2.5mm; }
.urkunde-innen { height: 100%; display: flex; flex-direction: column; align-items: center; text-align: center;
  border: 0.3mm solid var(--accent); border-radius: 1.5mm; padding: 12mm 14mm 10mm;
  font-family: Georgia, "Times New Roman", serif; }
.urkunde-marke { font-family: system-ui, sans-serif; font-size: 8pt; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: var(--grau); }
.urkunde-titel { font-size: 38pt; font-weight: 700; letter-spacing: 7pt; margin: 3mm 0 0; text-indent: 7pt; }
.urkunde-ornament { display: flex; align-items: center; gap: 4mm; margin: 4mm 0; color: var(--accent); font-size: 10pt; }
.urkunde-ornament::before, .urkunde-ornament::after { content: ""; width: 26mm; height: 0.3mm; background: var(--accent); }
.urkunde-innen .namenszeile { width: 112mm; height: 14mm; border-bottom: 0.5mm solid var(--tinte); margin-top: 9mm; }
.urkunde-innen .flusstext { font-size: 12.5pt; line-height: 1.65; max-width: 142mm; margin-top: 9mm; }
.urkunde-emblem { margin-top: auto; font-size: 16pt; }
.unterschriften { display: flex; justify-content: space-between; width: 150mm; margin-top: 8mm; }
.unterschriften .feld { text-align: center; font-family: system-ui, sans-serif; }
.unterschriften .feld .strich { width: 56mm; height: 10mm; border-bottom: 0.4mm solid #8a8f9a; }

/* Elternbrief */
.datum { text-align: right; font-size: 10pt; color: var(--grau); margin: 0; }
.betreff { font-size: 13.5pt; font-weight: 800; color: var(--primary-text); margin: 7mm 0 4mm; }
.brief h2 { font-size: 11.5pt; margin: 5.5mm 0 1.5mm; }
.brief p, .brief li { font-size: 10.5pt; line-height: 1.6; }
ul.regeln { margin: 0; padding-left: 6mm; }
ul.regeln li { margin-bottom: 1.4mm; }

/* ---- Druck ------------------------------------------------------------ */
@media print {
  body { background: #fff; }
  .werkzeugleiste { display: none; }
  @page { size: A4 ${seite.lage}; margin: ${rand}; }
  .blatt { width: ${seite.inhaltB}; height: ${seite.inhaltH}; margin: 0; padding: 0; box-shadow: none; }
  .blatt.urkunde { padding: 3.5mm; }
  .fuss { left: 0; right: 0; bottom: 0; }
}
`;
}
