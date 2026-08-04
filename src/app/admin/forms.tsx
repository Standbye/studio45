"use client";

import { useActionState, useState } from "react";
import {
  createApiKeyAction,
  createTeacherAction,
  createWorkshopAction,
  resetTeacherPasswordAction,
  type ActionState,
} from "./actions";
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

export function CreateApiKeyDialog() {
  const [state, action, pending] = useActionState(createApiKeyAction, IDLE);
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ size: "sm" })}>+ API-Key</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API-Key hinterlegen</DialogTitle>
          <DialogDescription>
            Der Key wird nur serverseitig gespeichert und in der Oberfläche maskiert angezeigt.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state.error && (
            <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          {state.ok && (
            <Alert><AlertDescription>API-Key gespeichert.</AlertDescription></Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="k-label">Bezeichnung</Label>
            <Input id="k-label" name="label" placeholder="z. B. Anthropic Schulbudget" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="k-secret">Key</Label>
            <Input id="k-secret" name="secret" type="password" placeholder="sk-ant-…" required autoComplete="off" />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
              {apiKeys.length === 0 ? "einen API-Key" : ""} anlegen.
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
              <Label htmlFor="w-key">API-Key</Label>
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
