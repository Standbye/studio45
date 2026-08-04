import Link from "next/link";
import { db } from "@/lib/db";
import { BASE_URL } from "@/lib/env";
import { archiveWorkshopAction, deleteApiKeyAction, deleteTeacherAction, updateBudgetAction } from "./actions";
import {
  CreateApiKeyDialog,
  CreateTeacherDialog,
  CreateWorkshopDialog,
  EditApiKeyDialog,
  ResetTeacherPasswordDialog,
  TestApiKeyButton,
} from "./forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [workshops, teachers, apiKeys, auditLogs] = await Promise.all([
    db.workshop.findMany({
      include: { teacher: true, apiKey: true, groups: { orderBy: { index: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({ where: { role: "TEACHER" }, orderBy: { displayName: "asc" }, include: { workshops: true } }),
    db.apiKey.findMany({ orderBy: { createdAt: "asc" }, include: { workshops: true } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: true } }),
  ]);

  return (
    <Tabs defaultValue="workshops" className="space-y-4">
      <TabsList>
        <TabsTrigger value="workshops">Workshops ({workshops.filter((w) => !w.archived).length})</TabsTrigger>
        <TabsTrigger value="teachers">Lehrkräfte ({teachers.length})</TabsTrigger>
        <TabsTrigger value="keys">KI-Verbindungen ({apiKeys.length})</TabsTrigger>
        <TabsTrigger value="audit">Protokoll</TabsTrigger>
      </TabsList>

      <TabsContent value="workshops" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workshops</h2>
          <CreateWorkshopDialog
            teachers={teachers.map((t) => ({ id: t.id, displayName: t.displayName }))}
            apiKeys={apiKeys.map((k) => ({ id: k.id, label: k.label }))}
          />
        </div>
        {workshops.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            Noch keine Workshops. Lege zuerst eine Lehrkraft und eine KI-Verbindung an, dann den ersten Workshop.
          </CardContent></Card>
        )}
        {workshops.map((w) => (
          <Card key={w.id} className={w.archived ? "opacity-60" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                {w.name} {w.className && <Badge variant="secondary">{w.className}</Badge>}
                {w.archived && <Badge variant="outline">archiviert</Badge>}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Link href={`/w/${w.slug}`} className="text-sm text-primary underline-offset-2 hover:underline" target="_blank">
                  Beamer-Seite ↗
                </Link>
                <form action={archiveWorkshopAction}>
                  <input type="hidden" name="id" value={w.id} />
                  <Button variant="outline" size="sm" type="submit">{w.archived ? "Reaktivieren" : "Archivieren"}</Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="text-muted-foreground">Lehrkraft:</span> {w.teacher?.displayName ?? "—"}</div>
              <div><span className="text-muted-foreground">Verbindung:</span> {w.apiKey?.label ?? "—"}</div>
              <div><span className="text-muted-foreground">Gruppen:</span> {w.groups.length} · Tag {w.currentDay}/{w.totalDays} · {w.phase}</div>
              <form action={updateBudgetAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={w.id} />
                <span className="whitespace-nowrap text-muted-foreground">
                  Budget ({Math.round((w.tokensUsed / w.tokenBudget) * 100)}% weg):
                </span>
                <Input
                  name="tokenBudget"
                  type="number"
                  min={10_000}
                  max={100_000_000}
                  step={10_000}
                  defaultValue={w.tokenBudget}
                  className="h-8 w-32 text-sm"
                />
                <Button type="submit" size="sm" variant="outline">OK</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="teachers" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lehrkräfte</h2>
          <CreateTeacherDialog />
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Benutzername</TableHead>
                <TableHead>Workshops</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.displayName}</TableCell>
                  <TableCell className="font-mono text-sm">{t.username}</TableCell>
                  <TableCell>{t.workshops.map((w) => w.name).join(", ") || "—"}</TableCell>
                  <TableCell>
                    {t.mustChangePassword ? <Badge variant="outline">Startpasswort aktiv</Badge> : <Badge variant="secondary">aktiv</Badge>}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <ResetTeacherPasswordDialog id={t.id} name={t.displayName} />
                    <form action={deleteTeacherAction} className="inline">
                      <input type="hidden" name="id" value={t.id} />
                      <Button variant="ghost" size="sm" type="submit">Löschen</Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {teachers.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Noch keine Lehrkräfte.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      <TabsContent value="keys" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">KI-Verbindungen</h2>
            <p className="text-sm text-muted-foreground">
              Anthropic, OpenAI, OpenRouter, Langdock, Azure, lokale Modelle — Schlüssel bleiben serverseitig
              und sind hier nur maskiert sichtbar.
            </p>
          </div>
          <CreateApiKeyDialog />
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Protokoll / Endpunkt</TableHead>
                <TableHead>Modelle</TableHead>
                <TableHead>Schlüssel</TableHead>
                <TableHead>Genutzt von</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.label}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="secondary">{k.protocol === "openai" ? "OpenAI" : "Anthropic"}</Badge>
                    <span className="ml-2 text-xs text-muted-foreground">{k.baseUrl || "Standard-Endpunkt"}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>👧 {k.modelKid}</div>
                    <div className="text-muted-foreground">🎬 {k.modelDirector}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">••••{k.secret.slice(-4)}</TableCell>
                  <TableCell className="text-sm">{k.workshops.map((w) => w.name).join(", ") || "—"}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <TestApiKeyButton id={k.id} />
                    <EditApiKeyDialog
                      verbindung={{
                        id: k.id,
                        label: k.label,
                        protocol: k.protocol,
                        baseUrl: k.baseUrl,
                        modelKid: k.modelKid,
                        modelDirector: k.modelDirector,
                      }}
                    />
                    <form action={deleteApiKeyAction} className="inline">
                      <input type="hidden" name="id" value={k.id} />
                      <Button variant="ghost" size="sm" type="submit" disabled={k.workshops.length > 0}>
                        Löschen
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {apiKeys.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Noch keine Verbindung. Ohne Verbindung kann kein Workshop generieren.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      <TabsContent value="audit" className="space-y-4">
        <h2 className="text-lg font-semibold">Protokoll (letzte 100)</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeit</TableHead>
                <TableHead>Wer</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {log.createdAt.toLocaleString("de-DE")}
                  </TableCell>
                  <TableCell>{log.user?.displayName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="text-sm">{log.detail}</TableCell>
                </TableRow>
              ))}
              {auditLogs.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Noch keine Einträge.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
        <p className="text-xs text-muted-foreground">Instanz-Basis-URL: {BASE_URL}</p>
      </TabsContent>
    </Tabs>
  );
}
