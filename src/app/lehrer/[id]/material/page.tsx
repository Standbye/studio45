import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const BLAETTER = [
  { slug: "rollenkarten", titel: "Rollenkarten", beschreibung: "Vier Karten zum Ausschneiden: Sprecher:in, Tester:in, Gestalter:in, Teamchef:in — mit Aufgaben und Tipps.", emoji: "🎭" },
  { slug: "tafeln", titel: "Thementafeln: Gefahren & Risiken", beschreibung: "Zwei Plakate für die Wand: Die KI ist ein Werkzeug — und: Sicher unterwegs mit KI (Ampel-Regeln).", emoji: "🚦" },
  { slug: "qr", titel: "QR-Blätter", beschreibung: "Ein Blatt pro Gruppe mit großem QR-Code für den iPad-Einstieg.", emoji: "📱" },
  { slug: "stundenverlauf", titel: "Stundenverläufe & Reflexion", beschreibung: "Eine Seite pro Termin: Merksatz, Minutenplan, Checkliste und Notizen — plus Methodenseite.", emoji: "⏱️" },
  { slug: "ich-kann", titel: "Ich-kann-Bogen", beschreibung: "Selbsteinschätzung für Kinder am Ende des Workshops.", emoji: "✅" },
  { slug: "elternbrief", titel: "Elternbrief", beschreibung: "Informationsschreiben inkl. der Sicherheitsregeln zum Mitgeben.", emoji: "✉️" },
  { slug: "urkunden", titel: "Urkunden", beschreibung: "Eine Urkunde pro Gruppe im Workshop-Branding, Name handschriftlich einzutragen.", emoji: "🏆" },
];

export default async function MaterialIndex({ params }: PageProps<"/lehrer/[id]/material">) {
  const user = await requireUserPage("TEACHER");
  const { id } = await params;
  const w = await db.workshop.findFirst({ where: { id, teacherId: user.id } });
  if (!w) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/lehrer/${id}`} className="text-sm text-primary underline-offset-2 hover:underline">← Zurück</Link>
        <h1 className="text-2xl font-bold">Materialien</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Alle Blätter erscheinen im Branding dieses Workshops. Zum Drucken die Seite öffnen und
        den Druckdialog verwenden — „Als PDF sichern" funktioniert genauso.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BLAETTER.map((b) => (
          <Link key={b.slug} href={`/druck/${id}/${b.slug}`} target="_blank">
            <Card className="h-full transition hover:border-primary">
              <CardHeader>
                <CardTitle className="text-base">{b.emoji} {b.titel}</CardTitle>
                <CardDescription>{b.beschreibung}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-primary">Öffnen & drucken ↗</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
