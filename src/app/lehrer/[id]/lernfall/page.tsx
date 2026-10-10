import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { BASE_URL } from "@/lib/env";
import { LERNFALL } from "@/lib/lernfall";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/** Lehrkraft-Seite zum Lernfall: Einsatz, Zugang für die Gruppen und die Lösung. */
export default async function LernfallLehrkraft({ params }: PageProps<"/lehrer/[id]/lernfall">) {
  const user = await requireUserPage("TEACHER");
  const { id } = await params;
  const w = await db.workshop.findFirst({ where: { id, teacherId: user.id } });
  if (!w) notFound();

  const pfad = `/w/${w.slug}/lernfall`;
  const qr = await QRCode.toDataURL(`${BASE_URL}${pfad}`, { errorCorrectionLevel: "M", margin: 1, width: 260 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/lehrer/${id}`} className="text-sm text-primary underline-offset-2 hover:underline">← Zurück</Link>
        <h1 className="text-2xl font-bold">Lernfall: Klarer Auftrag, fehlerhaftes Ergebnis</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wozu?</CardTitle>
          <CardDescription>
            Im Studio erleben die Gruppen vor allem: Ein unklarer Wunsch führt zu einem falschen Spiel. Daraus
            wird leicht „Fehler liegen immer an uns“. Dieser Fall zeigt das Gegenstück — der Auftrag ist
            eindeutig, das Spiel hält sich trotzdem nicht daran. Das Spiel ist vorbereitet, kein echter
            KI-Lauf; die Fehler sind solche, wie sie einer KI tatsächlich passieren.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR-Code zum Lernfall" className="h-40 w-40 rounded border" />
          <div className="space-y-3">
            <p>
              <span className="font-medium">Für Gruppen oder Beamer: </span>
              <a href={pfad} target="_blank" className="font-mono text-primary underline-offset-2 hover:underline">{pfad}</a>
              {" "}— ohne Anmeldung, ohne Lösung. Der Link steht auch unten auf der Beamer-Seite.
            </p>
            <div>
              <p className="font-medium">Ablauf (etwa 10 Minuten, passt gut zu Termin 2 oder zum Test-Tag)</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>Auftrag gemeinsam lesen: Ist er klar? (Ja — das ist der Punkt.)</li>
                <li>Gruppen spielen und prüfen jede Regel einzeln. Abweichungen notieren: erwartet / beobachtet.</li>
                <li>Befunde belegen lassen: „Zeig es mir.“ Vermutung und Beobachtung trennen.</li>
                <li>Zweite Fassung laden („alles repariert“) und erneut prüfen — ein Fehler ist noch da.</li>
                <li>Auswertung: Woran lag es? Was heißt das für unsere eigenen Spiele?</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Der Auftrag</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {LERNFALL.auftrag.map((zeile) => (
              <li key={zeile}>{zeile}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lösung — nur für die Lehrkraft</CardTitle>
          <CardDescription>Drei Abweichungen in der ersten Fassung; die zweite behebt nur zwei davon.</CardDescription>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-primary">Lösung anzeigen</summary>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Regel im Auftrag</th>
                  <th className="py-2 pr-3">Was das Spiel tut</th>
                  <th className="py-2">In der zweiten Fassung</th>
                </tr>
              </thead>
              <tbody>
                {LERNFALL.loesung.map((l) => (
                  <tr key={l.regel} className="border-b align-top last:border-0">
                    <td className="py-2 pr-3 font-medium">{l.regel}</td>
                    <td className="py-2 pr-3">{l.fehler}</td>
                    <td className="py-2">{l.zweite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-muted-foreground">
              Merksatz für die Auswertung: Ein klarer Auftrag schützt nicht vor Fehlern der KI — und „ist repariert“
              ist eine Behauptung, kein Beleg. Prüfen muss man selbst.
            </p>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
