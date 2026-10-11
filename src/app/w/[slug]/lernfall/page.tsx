import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LERNFALL, bewerte, fassungZurStufe, leseBefunde } from "@/lib/lernfall";
import { AutoRefresh } from "@/components/auto-refresh";
import { farbschema } from "@/lib/kontrast";

export const dynamic = "force-dynamic";

/**
 * Lernfall am Beamer: klarer Auftrag, fehlerhaftes Spiel — für die gemeinsame Arbeit im Plenum.
 * Öffentlich wie die Beamer-Seite. Was zu sehen ist, bestimmt die Lehrkraft über die Stufe:
 * aus = nichts, erste/zweite Fassung = Auftrag und Spiel, Auflösung = Lösung und Befunde.
 */
export default async function LernfallSeite({ params }: PageProps<"/w/[slug]/lernfall">) {
  const { slug } = await params;
  const w = await db.workshop.findUnique({
    where: { slug },
    include: { groups: { select: { lernfallBefunde: true } } },
  });
  if (!w || w.archived) notFound();
  const farben = farbschema(w.colorPrimary, w.colorAccent);
  const stufe = w.lernfallStufe;
  const fassung = fassungZurStufe(stufe);
  const zweite = fassung === "zweite";

  const kopf = (
    <div className="rounded-2xl p-5" style={{ background: farben.primary, color: farben.aufPrimary }}>
      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Lernfall · {w.name}</p>
      <h1 className="text-3xl font-black">Findet den Fehler der KI</h1>
      <p className="mt-1 text-sm opacity-90">
        Vorbereitetes Spiel mit eingebauten Fehlern — so, wie sie einer KI wirklich passieren.
      </p>
    </div>
  );

  if (stufe === 0) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-stone-100 p-6 text-stone-900" style={{ fontFamily: "var(--font-kind)" }}>
        <AutoRefresh seconds={5} />
        <div className="max-w-lg space-y-4 text-center">
          {kopf}
          <p className="text-xl font-bold">Der Lernfall ist gerade nicht freigegeben.</p>
          <Link href={`/w/${slug}`} className="inline-block font-bold underline underline-offset-4" style={{ color: farben.primaryText }}>
            ← Zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  if (stufe >= 3) {
    // Wie viele Gruppen haben je Regel richtig geurteilt? Bewusst nur Zahlen, keine Rangliste.
    const gruppen = w.groups.map((g) => leseBefunde(g.lernfallBefunde));
    const zaehle = (f: "erste" | "zweite") => {
      const dabei = gruppen.filter((g) => g[f].some((b) => b.urteil !== ""));
      const treffer = dabei.map((g) => bewerte(g[f], f));
      return { dabei: dabei.length, richtig: LERNFALL.regeln.map((_, i) => treffer.filter((t) => t[i] === "richtig").length) };
    };
    const gesehen = (n: number, von: number) => `${n} von ${von} ${von === 1 ? "Gruppe hat" : "Gruppen haben"} das so gesehen`;
    const erste = zaehle("erste");
    const zweiteZahl = zaehle("zweite");
    const mitZweiter = zweiteZahl.dabei > 0;

    return (
      <main className="min-h-svh bg-stone-100 p-4 text-stone-900 sm:p-6" style={{ fontFamily: "var(--font-kind)" }}>
        <AutoRefresh seconds={5} />
        <div className="mx-auto max-w-5xl space-y-4">
          {kopf}
          <div className="overflow-x-auto rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black" style={{ color: farben.primaryText }}>Auflösung</h2>
            <table className="mt-3 w-full text-left text-base">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-2 pr-4">Regel im Auftrag</th>
                  <th className="py-2 pr-4">Erste Fassung</th>
                  {mitZweiter && <th className="py-2">Zweite Fassung („alles repariert“)</th>}
                </tr>
              </thead>
              <tbody>
                {LERNFALL.regeln.map((r, i) => (
                  <tr key={r.kurz} className="border-b align-top last:border-0">
                    <td className="py-3 pr-4 font-semibold">{i + 1}. {r.text}</td>
                    <td className="py-3 pr-4">
                      {r.erste ? <span>❌ {r.erste}</span> : <span>✅ Das Spiel hält sich daran.</span>}
                      {erste.dabei > 0 && (
                        <span className="mt-1 block text-sm text-stone-500">
                          {gesehen(erste.richtig[i], erste.dabei)}
                        </span>
                      )}
                    </td>
                    {mitZweiter && (
                      <td className="py-3">
                        {r.zweite ? <span>❌ {r.zweite}</span> : <span>✅ {r.erste ? "Behoben." : "Das Spiel hält sich daran."}</span>}
                        <span className="mt-1 block text-sm text-stone-500">
                          {gesehen(zweiteZahl.richtig[i], zweiteZahl.dabei)}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl p-5 text-lg font-bold" style={{ background: farben.accent, color: farben.aufAccent }}>
            {LERNFALL.merksatz}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-stone-100 p-4 text-stone-900 sm:p-6" style={{ fontFamily: "var(--font-kind)" }}>
      <AutoRefresh seconds={5} />
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="space-y-4">
          {kopf}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black" style={{ color: farben.primaryText }}>Der Auftrag an die KI</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-base">
              {LERNFALL.regeln.map((r) => (
                <li key={r.kurz}>{r.text}</li>
              ))}
            </ol>
            <p className="mt-2 text-sm text-stone-500">Der Auftrag ist klar und vollständig. Jetzt prüft ihr das Ergebnis.</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black" style={{ color: farben.primaryText }}>
              {zweite ? "Die KI sagt: „Ich habe alles repariert.“" : "Eure Aufgabe"}
            </h2>
            <p className="mt-2 text-base">
              {zweite
                ? "Stimmt das? Prüft jede Regel noch einmal — glaubt es erst, wenn ihr es selbst gesehen habt."
                : "Prüft jede Regel einzeln: erst ausprobieren, dann entscheiden — stimmt oder stimmt nicht? Schreibt auf, was ihr erwartet habt und was passiert ist."}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <p className="border-b px-4 py-2 text-sm font-bold text-stone-500">
            {LERNFALL.titel} — {zweite ? "zweite Fassung („alles repariert“)" : "erste Fassung"}
          </p>
          <iframe
            key={zweite ? "zweite" : "erste"}
            src={`/w/${slug}/lernfall/spiel${zweite ? "?fassung=zweite" : ""}`}
            sandbox="allow-scripts"
            title="Lernfall-Spiel"
            className="h-[70svh] w-full border-0"
          />
        </section>
      </div>
    </main>
  );
}
