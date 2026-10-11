import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { LERNFALL, LERNFALL_STUFEN, bewerte, leseBefunde, stufenName, type Treffer } from "@/lib/lernfall";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setLernfallStufeAction } from "../../actions";
import { BefundeLeeren } from "./befunde-leeren";

export const dynamic = "force-dynamic";

const ZEICHEN: Record<Treffer, { text: string; klasse: string; titel: string }> = {
  offen: { text: "·", klasse: "text-muted-foreground", titel: "noch nicht geprüft" },
  richtig: { text: "✓", klasse: "font-bold text-emerald-700", titel: "richtig beurteilt" },
  falsch: { text: "✗", klasse: "font-bold text-red-600", titel: "anders beurteilt als die Lösung" },
};

/** Lehrkraft-Seite zum Lernfall: freigeben und weiterschalten, Befunde der Gruppen, Lösung. */
export default async function LernfallLehrkraft({ params }: PageProps<"/lehrer/[id]/lernfall">) {
  const user = await requireUserPage("TEACHER");
  const { id } = await params;
  const w = await db.workshop.findFirst({
    where: { id, teacherId: user.id },
    include: { groups: { orderBy: { index: "asc" }, select: { id: true, index: true, studioName: true, lernfallBefunde: true } } },
  });
  if (!w) notFound();

  const stufe = w.lernfallStufe;
  const beamerPfad = `/w/${w.slug}/lernfall`;
  const spielPfad = `/w/${w.slug}/lernfall/spiel`;
  const gruppen = w.groups.map((g) => {
    const b = leseBefunde(g.lernfallBefunde);
    return { ...g, befunde: b, erste: bewerte(b.erste, "erste"), zweite: bewerte(b.zweite, "zweite") };
  });
  const irgendwas = gruppen.some((g) => [...g.befunde.erste, ...g.befunde.zweite].some((b) => b.urteil !== ""));

  return (
    <div className="space-y-6">
      {/* Solange der Lernfall läuft, kommen die Befunde der Gruppen von selbst nach */}
      {stufe > 0 && <AutoRefresh seconds={5} />}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/lehrer/${id}`} className="text-sm text-primary underline-offset-2 hover:underline">← Zurück</Link>
        <h1 className="text-2xl font-bold">Lernfall: Klarer Auftrag, fehlerhaftes Ergebnis</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stufe > 0 ? "bg-amber-100 text-amber-900" : "bg-muted text-muted-foreground"}`}>
          {stufe > 0 ? `läuft: ${stufenName(stufe)}` : "aus"}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Steuerung</CardTitle>
          <CardDescription>
            Sie schalten frei und weiter — die Gruppen können nichts überspringen. Solange der Lernfall läuft,
            sehen die Gruppen ihn auf ihren Geräten <b>statt ihres Studios</b> (auch im Plenum; „Pause“ deckt ihn zu).
            Ein QR-Code ist nicht nötig.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {LERNFALL_STUFEN.map((s) => (
              <form key={s.stufe} action={setLernfallStufeAction} className="flex">
                <input type="hidden" name="workshopId" value={w.id} />
                <input type="hidden" name="stufe" value={s.stufe} />
                <Button type="submit" variant={stufe === s.stufe ? "default" : "outline"} className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-3 text-left">
                  <span className="font-semibold">
                    {s.stufe === 0 ? "⏹ " : `${s.stufe}. `}
                    {s.name}
                  </span>
                  <span className="text-xs font-normal opacity-80">{s.kurz}</span>
                </Button>
              </form>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <span className="font-medium">Gemeinsam am Beamer: </span>
              {stufe > 0 ? (
                <a href={beamerPfad} target="_blank" className="font-mono text-primary underline-offset-2 hover:underline">{beamerPfad} ↗</a>
              ) : (
                <span className="text-muted-foreground">erst nach der Freigabe erreichbar</span>
              )}
            </span>
            <span>
              <span className="font-medium">Selbst ausprobieren: </span>
              <a href={spielPfad} target="_blank" className="text-primary underline-offset-2 hover:underline">erste Fassung ↗</a>
              {" · "}
              <a href={`${spielPfad}?fassung=zweite`} target="_blank" className="text-primary underline-offset-2 hover:underline">zweite Fassung ↗</a>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Befunde der Gruppen</CardTitle>
          <CardDescription>
            Je Regel: ✓ richtig beurteilt · ✗ anders als die Lösung · · noch offen. Die Gruppen sehen diese Wertung
            erst mit der Auflösung.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Gruppe</th>
                  <th className="py-2 pr-3">Fassung</th>
                  {LERNFALL.regeln.map((r, i) => (
                    <th key={r.kurz} className="py-2 pr-3 text-center" title={r.text}>
                      {i + 1}
                      <span className="block max-w-28 text-[10px] font-normal normal-case leading-tight tracking-normal">{r.kurz}</span>
                    </th>
                  ))}
                  <th className="py-2 text-right">geprüft</th>
                </tr>
              </thead>
              <tbody>
                {gruppen.flatMap((g) =>
                  (["erste", "zweite"] as const).map((f) => (
                    <tr key={`${g.id}-${f}`} className={`align-top ${f === "zweite" ? "border-b" : ""}`}>
                      <td className="py-1.5 pr-3 font-medium">{f === "erste" ? g.studioName || `Gruppe ${g.index}` : ""}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{f === "erste" ? "erste" : "zweite"}</td>
                      {g[f].map((t, i) => (
                        <td key={i} className={`py-1.5 pr-3 text-center ${ZEICHEN[t].klasse}`} title={ZEICHEN[t].titel}>
                          {ZEICHEN[t].text}
                        </td>
                      ))}
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                        {g[f].filter((t) => t !== "offen").length}/{LERNFALL.regeln.length}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {irgendwas && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-primary">Was die Gruppen aufgeschrieben haben</summary>
              <div className="mt-3 space-y-3 text-sm">
                {gruppen.map((g) => {
                  const notizen = (["erste", "zweite"] as const).flatMap((f) =>
                    g.befunde[f].flatMap((b, i) => (b.urteil === "fehler" ? [{ f, i, notiz: b.notiz }] : []))
                  );
                  if (notizen.length === 0) return null;
                  return (
                    <div key={g.id}>
                      <p className="font-medium">{g.studioName || `Gruppe ${g.index}`}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        {notizen.map((n) => (
                          <li key={`${n.f}-${n.i}`}>
                            <span className="text-muted-foreground">
                              {n.f === "erste" ? "Erste" : "Zweite"} Fassung, Regel {n.i + 1}:
                            </span>{" "}
                            {n.notiz || <span className="italic text-muted-foreground">„stimmt nicht“ ohne Begründung</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
          <BefundeLeeren workshopId={w.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wozu — und wie?</CardTitle>
          <CardDescription>
            Im Studio erleben die Gruppen vor allem: Ein unklarer Wunsch führt zu einem falschen Spiel. Daraus
            wird leicht „Fehler liegen immer an uns“. Dieser Fall zeigt das Gegenstück — der Auftrag ist
            eindeutig, das Spiel hält sich trotzdem nicht daran. Das Spiel ist vorbereitet, kein echter
            KI-Lauf; die Fehler sind solche, wie sie einer KI tatsächlich passieren.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 text-sm md:grid-cols-2">
          <div>
            <p className="font-medium">Ablauf (10–15 Minuten, passt gut zu Termin 2 oder zum Test-Tag)</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Auftrag gemeinsam lesen: Ist er klar? (Ja — das ist der Punkt.)</li>
              <li><b>Erste Fassung</b> freigeben. Die Gruppen spielen und kreuzen je Regel an: stimmt / stimmt nicht — mit einem Satz „erwartet / passiert“.</li>
              <li>Belegen lassen: „Zeig es mir.“ Vermutung und Beobachtung trennen.</li>
              <li><b>Zweite Fassung</b> freigeben („alles repariert“). Die Gruppen prüfen alle Regeln erneut.</li>
              <li><b>Auflösung</b> freigeben und am Beamer besprechen: Woran lag es? Was heißt das für unsere eigenen Spiele?</li>
              <li>Zum Schluss auf <b>Aus</b> stellen — dann sehen die Gruppen wieder ihr Studio.</li>
            </ol>
            <p className="mt-2 text-muted-foreground">
              Untere Klassenstufen: gemeinsam am Beamer, nur die erste Fassung, danach direkt zur Auflösung.
            </p>
          </div>
          <div>
            <p className="font-medium">Der Auftrag</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              {LERNFALL.regeln.map((r) => (
                <li key={r.kurz}>{r.text}</li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lösung — nur für die Lehrkraft</CardTitle>
          <CardDescription>
            Erste Fassung: drei Regeln verletzt, zwei eingehalten. Zweite Fassung: zwei Fehler behoben, einer
            nicht — und eine Regel, die vorher stimmte, ist neu kaputt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-primary">Lösung anzeigen</summary>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Regel</th>
                  <th className="py-2 pr-3">Erste Fassung</th>
                  <th className="py-2">Zweite Fassung („alles repariert“)</th>
                </tr>
              </thead>
              <tbody>
                {LERNFALL.regeln.map((r, i) => (
                  <tr key={r.kurz} className="border-b align-top last:border-0">
                    <td className="py-2 pr-3 font-medium">{i + 1}. {r.kurz}</td>
                    <td className="py-2 pr-3">{r.erste ?? <span className="text-muted-foreground">stimmt</span>}</td>
                    <td className="py-2">{r.zweite ?? <span className="text-muted-foreground">{r.erste ? "behoben" : "stimmt"}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-muted-foreground">Merksatz für die Auswertung: {LERNFALL.merksatz}</p>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
