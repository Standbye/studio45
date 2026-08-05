import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { BASE_URL } from "@/lib/env";
import { dayTitle, dayMotto } from "@/lib/prompts";
import { attemptsLeft } from "@/lib/generate";
import {
  addBonusAction,
  newLessonAction,
  renameStudioAction,
  setDayAction,
  setPhaseAction,
  toggleLockAction,
  updateBrandingAction,
  updateSettingsAction,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALTERSSTUFEN } from "@/lib/audience";
import { promptBloecke, didaktikStandard } from "@/lib/prompts";
import { SupportLevelWahl } from "./support-level";
import { PromptVorschau } from "./prompt-vorschau";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

export default async function WorkshopDashboard({ params }: PageProps<"/lehrer/[id]">) {
  const user = await requireUserPage("TEACHER");
  const { id } = await params;
  const w = await db.workshop.findFirst({
    where: { id, teacherId: user.id },
    include: {
      groups: { orderBy: { index: "asc" }, include: { _count: { select: { prompts: true } } } },
      apiKey: { select: { label: true, protocol: true, modelKid: true, modelDirector: true } },
    },
  });
  if (!w) notFound();

  const qrCodes = Object.fromEntries(
    await Promise.all(
      w.groups.map(async (g) => [
        g.id,
        await QRCode.toDataURL(`${BASE_URL}/g/${g.code}`, { errorCorrectionLevel: "H", margin: 1, width: 220 }),
      ])
    )
  ) as Record<string, string>;

  const budgetPct = Math.min(100, Math.round((w.tokensUsed / w.tokenBudget) * 100));

  const promptKontext = {
    ageGroup: w.ageGroup,
    supportLevel: w.supportLevel,
    learningGoal: w.learningGoal,
    promptDidactic: w.promptDidactic,
    day: w.currentDay,
    totalDays: w.totalDays,
  };
  const bloecke = promptBloecke(promptKontext);
  const standardDidaktik = didaktikStandard({ ...promptKontext, promptDidactic: "" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{w.name}</h1>
        {w.className && <Badge variant="secondary">{w.className}</Badge>}
        <Link href={`/w/${w.slug}`} target="_blank" className="text-sm text-primary underline-offset-2 hover:underline">
          Beamer-Seite ↗
        </Link>
        <Link href={`/lehrer/${w.id}/material`} className="text-sm text-primary underline-offset-2 hover:underline">
          Materialien 🖨️
        </Link>
      </div>

      {/* Steuerung */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unterrichts-Steuerung</CardTitle>
          <CardDescription>
            Tag {w.currentDay}: <b>{dayTitle(w.currentDay, w.totalDays)}</b> · Merksatz: „{dayMotto(w.currentDay, w.totalDays)}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-sm font-medium text-muted-foreground">Tag</span>
            {Array.from({ length: w.totalDays }, (_, i) => i + 1).map((d) => (
              <form key={d} action={setDayAction}>
                <input type="hidden" name="workshopId" value={w.id} />
                <input type="hidden" name="day" value={d} />
                <Button type="submit" size="sm" variant={w.currentDay === d ? "default" : "outline"}>
                  {d}
                </Button>
              </form>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-sm font-medium text-muted-foreground">Phase</span>
            {(["PLENUM", "STUDIO", "PAUSE"] as const).map((p) => (
              <form key={p} action={setPhaseAction}>
                <input type="hidden" name="workshopId" value={w.id} />
                <input type="hidden" name="phase" value={p} />
                <Button type="submit" size="sm" variant={w.phase === p ? "default" : "outline"}>
                  {p === "PLENUM" ? "🗣️ Plenum" : p === "STUDIO" ? "🎮 Studio" : "⏸️ Pause"}
                </Button>
              </form>
            ))}
            <form action={newLessonAction} className="ml-auto">
              <input type="hidden" name="workshopId" value={w.id} />
              <Button type="submit" size="sm" variant="secondary">
                🔄 Neue Stunde (Versuche zurücksetzen)
              </Button>
            </form>
          </div>
          <Separator />
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token-Budget ({w.apiKey?.label ?? "kein Key"})</span>
              <span className={budgetPct > 85 ? "font-semibold text-destructive" : ""}>{budgetPct}% verbraucht</span>
            </div>
            <Progress value={budgetPct} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="gruppen" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gruppen">Gruppen ({w.groups.length})</TabsTrigger>
          <TabsTrigger value="einstellungen">Einstellungen</TabsTrigger>
          <TabsTrigger value="prompt">KI-Anweisung</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="gruppen" className="grid gap-4 md:grid-cols-2">
          {w.groups.map((g) => {
            const left = attemptsLeft(g, w.genLimitPerLesson);
            return (
              <Card key={g.id} className={g.locked ? "border-destructive/50" : ""}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      Gruppe {g.index}
                      {g.studioName && <span className="text-muted-foreground"> · „{g.studioName}"</span>}
                    </CardTitle>
                    <CardDescription>
                      {g._count.prompts} Prompts · noch {left}/{w.genLimitPerLesson + g.genBonus} Versuche diese Stunde
                    </CardDescription>
                  </div>
                  {g.locked && <Badge variant="destructive">gesperrt</Badge>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodes[g.id]} alt={`QR Gruppe ${g.index}`} className="h-24 w-24 rounded border" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <a
                        href={`/g/${g.code}`}
                        target="_blank"
                        className="block truncate font-mono text-xs text-primary underline-offset-2 hover:underline"
                      >
                        /g/{g.code}
                      </a>
                      <form action={renameStudioAction} className="flex gap-2">
                        <input type="hidden" name="groupId" value={g.id} />
                        <Input name="studioName" defaultValue={g.studioName} placeholder="Studio-Name" className="h-8 text-sm" maxLength={40} />
                        <Button type="submit" size="sm" variant="outline">OK</Button>
                      </form>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={addBonusAction}>
                      <input type="hidden" name="groupId" value={g.id} />
                      <Button type="submit" size="sm" variant="secondary">＋1 Versuch nachladen</Button>
                    </form>
                    <form action={toggleLockAction}>
                      <input type="hidden" name="groupId" value={g.id} />
                      <Button type="submit" size="sm" variant="outline">
                        {g.locked ? "Entsperren" : "Sperren"}
                      </Button>
                    </form>
                    <Link href={`/lehrer/${w.id}/gruppe/${g.id}`} className="ml-auto">
                      <Button size="sm" variant="ghost">Verlauf & Spiel →</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="einstellungen">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workshop-Einstellungen</CardTitle>
              <CardDescription>Zielgruppe, Unterstützung durch die KI, Lernziel und Limits.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateSettingsAction} className="space-y-4">
                <input type="hidden" name="workshopId" value={w.id} />
                <div className="space-y-2">
                  <Label htmlFor="learningGoal">Lernziel / fachlicher Auftrag an die KI</Label>
                  <Textarea
                    id="learningGoal"
                    name="learningGoal"
                    defaultValue={w.learningGoal}
                    rows={4}
                    placeholder="z. B.: Baue Mathe-Aufgaben der 4. Klasse (Einmaleins, schriftliche Addition) als Hindernisse ins Spiel ein."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ageGroup">Zielgruppe</Label>
                    <select id="ageGroup" name="ageGroup" defaultValue={w.ageGroup} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                      {Object.values(ALTERSSTUFEN).map((a) => (
                        <option key={a.id} value={a.id}>{a.name} · {a.klassen}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Steuert Optik und Ansprache der Schüler-Seite — und wie die KI baut.
                    </p>
                  </div>
                  <SupportLevelWahl standard={w.supportLevel} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="genLimit">Versuche pro Stunde/Gruppe</Label>
                    <Input id="genLimit" name="genLimitPerLesson" type="number" min={1} max={20} defaultValue={w.genLimitPerLesson} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cooldown">Denkpause (Sekunden)</Label>
                    <Input id="cooldown" name="cooldownSeconds" type="number" min={0} max={1800} defaultValue={w.cooldownSeconds} />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <span className="font-medium">KI-Verbindung: </span>
                  {w.apiKey ? (
                    <>
                      {w.apiKey.label}{" "}
                      <span className="text-muted-foreground">
                        ({w.apiKey.protocol === "openai" ? "OpenAI-Protokoll" : "Anthropic-Protokoll"} ·{" "}
                        {w.apiKey.modelKid} für die Kinder, {w.apiKey.modelDirector} für den Director&apos;s Cut)
                      </span>
                    </>
                  ) : (
                    <span className="text-destructive">keine hinterlegt</span>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Anbieter, Endpunkt und Modelle pflegt der Admin — so bleiben Zugangsdaten an einer Stelle.
                  </p>
                </div>
                <Button type="submit">Speichern</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Was die KI liest</CardTitle>
              <CardDescription>
                Der vollständige Auftrag, aus dem die Spiele entstehen — zusammengesetzt aus festem
                Kern, Tagesfokus und der didaktischen Zone. Letztere kannst du anpassen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateSettingsAction} className="space-y-4">
                <input type="hidden" name="workshopId" value={w.id} />
                <input type="hidden" name="nurPrompt" value="1" />
                <PromptVorschau
                  bloecke={bloecke}
                  eigeneFassung={w.promptDidactic}
                  standardFassung={standardDidaktik}
                />
                <Button type="submit">KI-Anweisung speichern</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Farbschema & Logo</CardTitle>
              <CardDescription>
                Zieht sich durch Kinder-Oberfläche, Beamer-Seite und Materialien. Logo: PNG/JPG/WebP, wird serverseitig neu kodiert (kein SVG).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateBrandingAction} className="space-y-4">
                <input type="hidden" name="workshopId" value={w.id} />
                <div className="flex flex-wrap items-end gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="colorPrimary">Hauptfarbe</Label>
                    <input id="colorPrimary" name="colorPrimary" type="color" defaultValue={w.colorPrimary} className="h-10 w-20 cursor-pointer rounded border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorAccent">Akzentfarbe</Label>
                    <input id="colorAccent" name="colorAccent" type="color" defaultValue={w.colorAccent} className="h-10 w-20 cursor-pointer rounded border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo (max. 4 MB)</Label>
                    <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
                  </div>
                  {w.logoPath && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="removeLogo" value="1" /> Logo entfernen
                    </label>
                  )}
                </div>
                <Button type="submit">Branding speichern</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
