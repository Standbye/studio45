import "@fontsource-variable/montserrat";
import { supportProfil, wirksameStufen } from "@/lib/audience";
import { VORTRAG } from "@/lib/vortrag";

/**
 * Beamer-Seite im Vortrags-Design (Workshop-Einstellung „Vortrag“): weißer Grund, rote
 * Schrift, Montserrat in Ultra-Thin und Fett — dieselbe Gestaltung wie die Folien für
 * Veranstaltungen. Heißen die Gruppen „1A …“, „1B …“, werden sie nach Stufe in Spalten
 * gestellt, die Stufe kommt aus dem tatsächlich eingestellten Spielraum der Gruppe.
 */

const { rot: ROT, linie: LINIE, grau: GRAU } = VORTRAG;

type Gruppe = { id: string; index: number; code: string; studioName: string; supportLevel: number | null; helpLevel: number | null };
type Props = {
  workshop: { name: string; slug: string; supportLevel: number; helpLevel: number; phase: string; lernfallStufe: number };
  gruppen: Gruppe[];
  qr: string[];
  merksatz: string;
};

/** „1A Freie Hand“ → Stufe 1, Buchstabe A, Name „Freie Hand“ */
function zerlege(name: string) {
  const m = name.trim().match(/^(\d{1,2})\s*([A-Za-z])\b[\s·.:-]*(.*)$/);
  return m ? { stufe: Number(m[1]), buchstabe: m[2].toUpperCase(), rest: m[3].trim() } : null;
}

export function VortragBeamer({ workshop: w, gruppen, qr, merksatz }: Props) {
  const teile = gruppen.map((g, i) => ({ g, qr: qr[i], teil: zerlege(g.studioName) }));
  const nachStufe = teile.every((t) => t.teil);

  // Spalten: je Stufe die Gruppen A, B, … untereinander
  const spalten = new Map<number, typeof teile>();
  if (nachStufe) {
    for (const t of teile) {
      const s = t.teil!.stufe;
      spalten.set(s, [...(spalten.get(s) ?? []), t]);
    }
    for (const liste of spalten.values()) liste.sort((a, b) => a.teil!.buchstabe.localeCompare(b.teil!.buchstabe));
  }

  // Merksatz in einen leisen und einen kräftigen Teil teilen: vor und nach dem Komma
  const komma = merksatz.indexOf(",");
  const leise = komma > 0 ? merksatz.slice(0, komma + 1) : "";
  const laut = komma > 0 ? merksatz.slice(komma + 1).trim() : merksatz;

  const phase = w.phase === "STUDIO" ? "Studio-Phase läuft" : w.phase === "PAUSE" ? "Pause" : "Plenum · Blick nach vorne";

  return (
    <main className="vortrag-beamer">
      <style>{`
        .vortrag-beamer { min-height: 100svh; background: #fff; color: ${ROT}; font-family: "Montserrat Variable", "Helvetica Neue", Arial, sans-serif;
          padding: clamp(20px, 4vh, 48px) clamp(20px, 4vw, 72px); display: grid; gap: clamp(16px, 3vh, 36px); align-content: start; }
        .vb-kopf { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 32px; }
        .vb-augenbraue { font-weight: 800; font-size: clamp(11px, .9vw, 15px); letter-spacing: .22em; text-transform: uppercase; }
        .vb-satz { margin: .3em 0 0; font-size: clamp(26px, 3.2vw, 56px); line-height: 1.04; letter-spacing: -.02em; max-width: 26ch; font-weight: 800; }
        .vb-satz .leise { font-weight: 100; }
        .vb-phase { font-weight: 800; font-size: clamp(12px, 1vw, 16px); letter-spacing: .14em; text-transform: uppercase; border: 2px solid ${ROT}; border-radius: 999px; padding: .5em 1.1em; white-space: nowrap; }
        .vb-raster { display: grid; gap: clamp(10px, 1.4vw, 24px); }
        .vb-spalte { display: grid; gap: clamp(8px, 1.2vh, 14px); align-content: start; min-width: 0; }
        /* Alle Spalten teilen dieselben Zeilen: bricht ein Stufenname um, bleiben die Codes trotzdem auf einer Linie */
        .vb-raster.gestuft { grid-template-rows: auto; row-gap: clamp(8px, 1.2vh, 14px); }
        .vb-raster.gestuft .vb-spalte { grid-row: span var(--zeilen); grid-template-rows: subgrid; }
        .vb-stufe { border-bottom: 2px solid ${LINIE}; padding-bottom: .5em; }
        .vb-stufe small { display: block; font-weight: 800; font-size: clamp(10px, .8vw, 13px); letter-spacing: .2em; text-transform: uppercase; }
        .vb-stufe strong { display: block; font-weight: 800; font-size: clamp(15px, 1.5vw, 26px); line-height: 1.1; margin-top: .2em; }
        .vb-stufe span { display: block; font-weight: 200; font-size: clamp(12px, .95vw, 16px); color: ${GRAU}; margin-top: .2em; }
        .vb-karte { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 10px; border: 2px solid ${LINIE}; padding: clamp(6px, .8vw, 12px);
          color: ${ROT}; text-decoration: none; transition: border-color .2s ease; }
        .vb-karte:hover, .vb-karte:focus-visible { border-color: ${ROT}; outline: none; }
        .vb-karte img { width: 100%; max-width: 100%; aspect-ratio: 1; display: block; }
        .vb-buchstabe { font-weight: 100; font-size: clamp(28px, 3.4vw, 64px); line-height: 1; min-width: 1ch; }
        .vb-karte.flach { grid-template-columns: 1fr; text-align: center; }
        .vb-karte.flach strong { font-weight: 800; font-size: clamp(14px, 1.3vw, 22px); }
        .vb-fuss { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; font-size: clamp(12px, 1vw, 16px); color: ${GRAU}; }
        .vb-fuss a { color: ${ROT}; font-weight: 800; text-decoration: none; border: 2px solid ${LINIE}; border-radius: 999px; padding: .5em 1.1em; }
        .vb-fuss a:hover { border-color: ${ROT}; }
        .vb-fuss .marke { margin-left: auto; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: ${ROT}; }
        @media (max-width: 900px) { .vb-raster { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
      `}</style>

      <header className="vb-kopf">
        <div>
          <p className="vb-augenbraue">Studio45 · {w.name}</p>
          <h1 className="vb-satz">
            {leise && <span className="leise">{leise} </span>}
            {laut}
          </h1>
        </div>
        <span className="vb-phase">{phase}</span>
      </header>

      {nachStufe ? (
        <div
          className="vb-raster gestuft"
          style={{
            gridTemplateColumns: `repeat(${spalten.size}, minmax(0, 1fr))`,
            ["--zeilen" as string]: 1 + Math.max(...[...spalten.values()].map((l) => l.length)),
          }}
        >
          {[...spalten.entries()]
            .sort(([a], [b]) => a - b)
            .map(([stufe, liste]) => {
              const erste = liste[0];
              const spielraum = supportProfil(wirksameStufen(erste.g, w).supportLevel);
              return (
                <section key={stufe} className="vb-spalte">
                  <div className="vb-stufe">
                    <small>Stufe {stufe}</small>
                    <strong>{erste.teil!.rest || `Gruppe ${stufe}`}</strong>
                    <span>Spielraum: {spielraum.name}</span>
                  </div>
                  {liste.map((t) => (
                    <a key={t.g.id} href={`/g/${t.g.code}`} target="_blank" rel="noopener" className="vb-karte" aria-label={t.g.studioName}>
                      <span className="vb-buchstabe">{t.teil!.buchstabe}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.qr} alt={`QR-Code ${t.g.studioName}`} />
                    </a>
                  ))}
                </section>
              );
            })}
        </div>
      ) : (
        <div className="vb-raster" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {teile.map((t) => (
            <a key={t.g.id} href={`/g/${t.g.code}`} target="_blank" rel="noopener" className="vb-karte flach">
              <strong>{t.g.studioName || `Gruppe ${t.g.index}`}</strong>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.qr} alt={`QR-Code Gruppe ${t.g.index}`} />
            </a>
          ))}
        </div>
      )}

      <footer className="vb-fuss">
        <span>Mit der Kamera scannen oder antippen.</span>
        <a href={`/w/${w.slug}/hub`}>Zur begehbaren Schule</a>
        {w.lernfallStufe > 0 && <a href={`/w/${w.slug}/lernfall`}>Lernfall: Findet den Fehler der KI</a>}
        <span className="marke">Studio45</span>
      </footer>
    </main>
  );
}
