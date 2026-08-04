/**
 * Gemeinsame Druck-Styles für alle Materialien.
 * Bewusst Print-CSS im Browser statt weasyprint: volle Emoji- und CSS-Unterstützung
 * (Lehre aus dem Piloten), Ausdruck über den Druckdialog als PDF.
 */
export function printStyles(primary: string, accent: string): string {
  return `
:root { --primary: ${primary}; --accent: ${accent}; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2430; background: #f1f3f6; }

.werkzeugleiste { position: sticky; top: 0; z-index: 10; display: flex; gap: .75rem; align-items: center;
  padding: .75rem 1rem; background: #fff; border-bottom: 1px solid #dfe3ea; }
.werkzeugleiste a, .werkzeugleiste button { font: inherit; font-weight: 600; padding: .45rem .9rem; border-radius: .5rem;
  border: 1px solid #d3d8e0; background: #fff; color: #1f2430; text-decoration: none; cursor: pointer; }
.werkzeugleiste .haupt { background: var(--primary); border-color: var(--primary); color: #fff; }
.hinweis { margin-left: auto; font-size: .85rem; color: #6b7280; }

.blatt { width: 210mm; min-height: 297mm; margin: 1rem auto; padding: 18mm; background: #fff;
  box-shadow: 0 2px 12px #0002; page-break-after: always; }
.blatt.quer { width: 297mm; min-height: 210mm; }

h1 { font-size: 26pt; margin: 0 0 2mm; color: var(--primary); }
h2 { font-size: 15pt; margin: 8mm 0 3mm; color: var(--primary); }
p, li { font-size: 11.5pt; line-height: 1.5; }
.klein { font-size: 9.5pt; color: #6b7280; }
.kopf { display: flex; align-items: center; gap: 5mm; border-bottom: 3px solid var(--accent); padding-bottom: 4mm; margin-bottom: 6mm; }
.kopf img { height: 18mm; width: auto; }
.kopf .titel { flex: 1; }
.kopf .marke { font-weight: 900; font-size: 11pt; color: var(--primary); }

@media print {
  body { background: #fff; }
  .werkzeugleiste { display: none; }
  .blatt { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
  @page { size: A4 portrait; margin: 14mm; }
  .blatt.quer { page-break-before: always; }
}
`;
}
