import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { setupAction } from "../actions";
import { AuthShell } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) redirect("/login");
  const { fehler } = await searchParams;

  return (
    <AuthShell
      title="Ersteinrichtung"
      description="Lege das Admin-Konto dieser Instanz an. Es gibt genau einen Admin — er verwaltet Workshops, Lehrkräfte und API-Keys."
      fehler={fehler}
    >
      <form action={setupAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Anzeigename</Label>
          <Input id="displayName" name="displayName" placeholder="z. B. Peter" required maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Benutzername</Label>
          <Input id="username" name="username" autoComplete="username" required minLength={2} maxLength={60} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Passwort (min. 8 Zeichen)</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password2">Passwort wiederholen</Label>
          <Input id="password2" name="password2" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <Button type="submit" className="w-full">Admin-Konto anlegen</Button>
      </form>
    </AuthShell>
  );
}
