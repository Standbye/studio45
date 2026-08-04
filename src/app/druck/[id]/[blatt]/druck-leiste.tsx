"use client";

export function DruckLeiste({ zurueck, titel }: { zurueck: string; titel: string }) {
  return (
    <div className="werkzeugleiste">
      <a href={zurueck}>← Materialien</a>
      <button className="haupt" onClick={() => window.print()}>
        🖨️ Drucken / als PDF sichern
      </button>
      <span className="hinweis">{titel} · Im Druckdialog „Hintergrundgrafiken" aktivieren, damit die Farben mitkommen.</span>
    </div>
  );
}
