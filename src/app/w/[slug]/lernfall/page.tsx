import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LERNFALL } from "@/lib/lernfall";
import { farbschema } from "@/lib/kontrast";

export const dynamic = "force-dynamic";

/**
 * Lernfall für Gruppe oder Beamer: klarer Auftrag, fehlerhaftes Spiel.
 * Öffentlich wie die Beamer-Seite — enthält keine Lösung.
 */
export default async function LernfallSeite({ params, searchParams }: PageProps<"/w/[slug]/lernfall">) {
  const { slug } = await params;
  const zweite = (await searchParams).fassung === "zweite";
  const w = await db.workshop.findUnique({ where: { slug } });
  if (!w || w.archived) notFound();
  const farben = farbschema(w.colorPrimary, w.colorAccent);

  return (
    <main className="min-h-svh bg-stone-100 p-4 text-stone-900 sm:p-6" style={{ fontFamily: "var(--font-kind)" }}>
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: farben.primary, color: farben.aufPrimary }}>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Lernfall · {w.name}</p>
            <h1 className="text-3xl font-black">Findet den Fehler der KI</h1>
            <p className="mt-1 text-sm opacity-90">
              Vorbereitetes Spiel mit eingebauten Fehlern — so, wie sie einer KI wirklich passieren.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black" style={{ color: farben.primaryText }}>Der Auftrag an die KI</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-base">
              {LERNFALL.auftrag.map((zeile) => (
                <li key={zeile}>{zeile}</li>
              ))}
            </ol>
            <p className="mt-2 text-sm text-stone-500">Der Auftrag ist klar und vollständig. Jetzt prüft ihr das Ergebnis.</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black" style={{ color: farben.primaryText }}>
              {zweite ? "Stimmt „alles repariert“?" : "Eure Aufgabe"}
            </h2>
            {zweite ? (
              <p className="mt-2 text-base">
                Die KI behauptet, alle Fehler seien behoben. Prüft jede Regel noch einmal — glaubt es
                erst, wenn ihr es selbst gesehen habt.
              </p>
            ) : (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-base">
                {LERNFALL.aufgaben.map((zeile) => (
                  <li key={zeile}>{zeile}</li>
                ))}
              </ol>
            )}
            <div className="mt-4 rounded-xl border-2 border-dashed border-stone-300 p-3 text-sm">
              {zweite ? (
                <Link href={`/w/${slug}/lernfall`} className="font-bold underline underline-offset-2" style={{ color: farben.primaryText }}>
                  ← Zurück zur ersten Fassung
                </Link>
              ) : (
                <>
                  <p>{LERNFALL.reparatur}</p>
                  <Link
                    href={`/w/${slug}/lernfall?fassung=zweite`}
                    className="mt-2 inline-block rounded-full px-4 py-2 font-bold"
                    style={{ background: farben.accent, color: farben.aufAccent }}
                  >
                    Zweite Fassung laden →
                  </Link>
                </>
              )}
            </div>
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
