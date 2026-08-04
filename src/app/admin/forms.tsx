"use client";

import { useActionState, useState } from "react";
import {
  createApiKeyAction,
  createTeacherAction,
  createWorkshopAction,
  resetTeacherPasswordAction,
  testApiKeyAction,
  updateApiKeyAction,
  type ActionState,
} from "./actions";
import { ANBIETER, anbieterVorlage } from "@/lib/providers";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const IDLE: ActionState = { ok: false };

function StartPasswordNote({ state }: { state: ActionState }) {
  if (!state.startPassword) return null;
  return (
    <Alert>
      <AlertDescription className="space-y-1">
        <p>
          Startpasswort für <b>{state.username}</b>:
        </p>
        <p className="select-all rounded bg-muted px-2 py-1 font-mono text-lg font-bold tracking-wide">
          {state.startPassword}
        </p>
        <p className="text-xs text-muted-foreground">
          Jetzt notieren und der Lehrkraft übergeben — es wird nur einmal angezeigt. Beim ersten Login muss es geändert werden.
        </p>
      </AlertDescription>
    </Alert>
  );
}

export function CreateTeacherDialog() {
  const [state, action, pending] = useActionState(createTeacherAction, IDLE);
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ size: "sm" })}>+ Lehrkraft</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lehrkraft anlegen</DialogTitle>
          <DialogDescription>
            Es wird ein Startpasswort erzeugt, das du der Lehrkraft übergibst (Zettel genügt). Beim ersten Login wird ein Wechsel erzwungen.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state.error && (
            <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          <StartPasswordNote state={state} />
          <div className="space-y-2">
            <Label htmlFor="t-name">Anzeigename</Label>
            <Input id="t-name" name="displayName" placeholder="z. B. Frau Muster" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-user">Benutzername</Label>
            <Input id="t-user" name="username" placeholder="z. B. muster" required />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Wird angelegt …" : "Anlegen & Startpasswort erzeugen"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResetTeacherPasswordDialog({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(resetTeacherPasswordAction, IDLE);
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Passwort zurücksetzen
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Passwort zurücksetzen</DialogTitle>
          <DialogDescription>Erzeugt ein neues Startpasswort für {name} (mit Wechselzwang).</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          {state.error && (
            <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          <StartPasswordNote state={state} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Wird zurückgesetzt …" : "Neues Startpasswort erzeugen"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Gemeinsames Formular für neue und bestehende Verbindungen. */
function VerbindungsFelder({
  vorhanden,
}: {
  vorhanden?: {
    label: string;
    protocol: string;
    baseUrl: string;
    modelKid: string;
    modelDirector: string;
  };
}) {
  const start =
    ANBIETER.find(
      (a) => a.protocol === vorhanden?.protocol && a.baseUrl === vorhanden?.baseUrl
    )?.id ?? (vorhanden ? "custom" : "anthropic");

  const [anbieterId, setAnbieterId] = useState(start);
  const [protocol, setProtocol] = useState(vorhanden?.protocol ?? "anthropic");
  const [baseUrl, setBaseUrl] = useState(vorhanden?.baseUrl ?? "");
  const [modelKid, setModelKid] = useState(vorhanden?.modelKid ?? "claude-sonnet-5");
  const [modelDirector, setModelDirector] = useState(vorhanden?.modelDirector ?? "claude-opus-5");

  const anbieter = anbieterVorlage(anbieterId);

  function waehleAnbieter(id: string) {
    setAnbieterId(id);
    const a = anbieterVorlage(id);
    if (!a) return;
    setProtocol(a.protocol);
    setBaseUrl(a.baseUrl);
    if (a.modelle.kinder[0]) setModelKid(a.modelle.kinder[0]);
    if (a.modelle.director[0]) setModelDirector(a.modelle.director[0]);
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="k-anbieter">Anbieter</Label>
        <select
          id="k-anbieter"
          value={anbieterId}
          onChange={(e) => waehleAnbieter(e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        >
          {ANBIETER.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {anbieter && <p className="text-xs text-muted-foreground">{anbieter.hinweis}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="k-protocol">Protokoll</Label>
          <select
            id="k-protocol"
            name="protocol"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="anthropic">Anthropic (Messages)</option>
            <option value="openai">OpenAI (chat/completions)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="k-label">Bezeichnung</Label>
          <Input id="k-label" name="label" defaultValue={vorhanden?.label} placeholder="z. B. Schulbudget" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="k-baseUrl">Endpunkt (leer = Standard des Protokolls)</Label>
        <Input
          id="k-baseUrl"
          name="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://…/v1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="k-modelKid">Modell für die Kinder</Label>
          <Input
            id="k-modelKid"
            name="modelKid"
            value={modelKid}
            onChange={(e) => setModelKid(e.target.value)}
            list="modelle-kinder"
            required
          />
          <datalist id="modelle-kinder">
            {anbieter?.modelle.kinder.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="k-modelDirector">Modell für Director&apos;s Cut</Label>
          <Input
            id="k-modelDirector"
            name="modelDirector"
            value={modelDirector}
            onChange={(e) => setModelDirector(e.target.value)}
            list="modelle-director"
            required
          />
          <datalist id="modelle-director">
            {anbieter?.modelle.director.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
      </div>
    </>
  );
}

export function CreateApiKeyDialog() {
  const [state, action, pending] = useActionState(createApiKeyAction, IDLE);
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ size: "sm" })}>+ Verbindung</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KI-Verbindung anlegen</DialogTitle>
          <DialogDescription>
            Anbieter, Endpunkt, Zugangsschlüssel und Modelle. Der Schlüssel bleibt serverseitig und
            wird in der Oberfläche nur maskiert angezeigt.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state.error && (
            <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          {state.ok && <Alert><AlertDescription>Verbindung gespeichert.</AlertDescription></Alert>}
          <VerbindungsFelder />
          <div className="space-y-2">
            <Label htmlFor="k-secret">Zugangsschlüssel</Label>
            <Input id="k-secret" name="secret" type="password" placeholder="sk-…" required autoComplete="off" />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditApiKeyDialog({
  verbindung,
}: {
  verbindung: { id: string; label: string; protocol: string; baseUrl: string; modelKid: string; modelDirector: string };
}) {
  const [state, action, pending] = useActionState(updateApiKeyAction, IDLE);
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Bearbeiten</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verbindung bearbeiten</DialogTitle>
          <DialogDescription>
            Schlüsselfeld leer lassen, um den gespeicherten Schlüssel zu behalten.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={verbindung.id} />
          {state.error && (
            <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          {state.ok && <Alert><AlertDescription>Gespeichert.</AlertDescription></Alert>}
          <VerbindungsFelder vorhanden={verbindung} />
          <div className="space-y-2">
            <Label htmlFor="k-secret-edit">Neuer Zugangsschlüssel (optional)</Label>
            <Input id="k-secret-edit" name="secret" type="password" placeholder="unverändert lassen" autoComplete="off" />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TestApiKeyButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(testApiKeyAction, IDLE);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? "testet …" : "Testen"}
      </Button>
      {state.hinweis && <span className="text-xs text-emerald-600">✓ {state.hinweis}</span>}
      {state.error && <span className="text-xs text-destructive" title={state.error}>✗ {state.error.slice(0, 60)}</span>}
    </form>
  );
}

export function CreateWorkshopDialog({
  teachers,
  apiKeys,
}: {
  teachers: { id: string; displayName: string }[];
  apiKeys: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(createWorkshopAction, IDLE);
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ size: "sm" })}>+ Workshop</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workshop anlegen</DialogTitle>
          <DialogDescription>
            Gruppen-Codes und QR-Zugänge werden automatisch erzeugt. Details (Lernziel, Limits, Branding) stellt die Lehrkraft selbst ein.
          </DialogDescription>
        </DialogHeader>
        {teachers.length === 0 || apiKeys.length === 0 ? (
          <Alert>
            <AlertDescription>
              Bitte zuerst {teachers.length === 0 ? "eine Lehrkraft" : ""}
              {teachers.length === 0 && apiKeys.length === 0 ? " und " : ""}
              {apiKeys.length === 0 ? "eine KI-Verbindung" : ""} anlegen.
            </AlertDescription>
          </Alert>
        ) : (
          <form action={action} className="space-y-4">
            {state.error && (
              <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
            )}
            {state.ok && <Alert><AlertDescription>Workshop angelegt.</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="w-name">Name (Schule/Projekt)</Label>
              <Input id="w-name" name="name" placeholder="z. B. Lindenschule Gerlachsheim" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="w-class">Klasse</Label>
                <Input id="w-class" name="className" placeholder="z. B. 4a" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-groups">Anzahl Gruppen</Label>
                <Input id="w-groups" name="groupCount" type="number" min={1} max={10} defaultValue={5} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-days">Anzahl Termine</Label>
                <select id="w-days" name="totalDays" defaultValue="3" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                  <option value="3">3 Termine</option>
                  <option value="5">5 Termine</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-budget">Token-Budget</Label>
                <Input id="w-budget" name="tokenBudget" type="number" min={10000} step={100000} defaultValue={2000000} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-teacher">Lehrkraft</Label>
              <select id="w-teacher" name="teacherId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.displayName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-key">KI-Verbindung</Label>
              <select id="w-key" name="apiKeyId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                {apiKeys.map((k) => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Wird angelegt …" : "Workshop anlegen"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
