import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loginAction } from "../actions";
import { AuthShell } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount === 0) redirect("/setup");
  const { fehler } = await searchParams;

  return (
    <AuthShell
      title="Anmelden"
      description="Zugang für Admin und Lehrkräfte. Kinder brauchen keinen Login — sie kommen über den QR-Code ihrer Gruppe."
      fehler={fehler}
    >
      <form action={loginAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Benutzername</Label>
          <Input id="username" name="username" autoComplete="username" required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="w-full">Anmelden</Button>
      </form>
    </AuthShell>
  );
}
