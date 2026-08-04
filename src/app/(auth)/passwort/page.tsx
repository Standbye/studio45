import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { changePasswordAction } from "../actions";
import { AuthShell } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function PasswortPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { fehler } = await searchParams;

  return (
    <AuthShell
      title={user.mustChangePassword ? "Neues Passwort setzen" : "Passwort ändern"}
      description={
        user.mustChangePassword
          ? `Hallo ${user.displayName}! Bitte ersetze dein Startpasswort durch ein eigenes (min. 10 Zeichen).`
          : "Wähle ein neues Passwort (min. 10 Zeichen)."
      }
      fehler={fehler}
    >
      <form action={changePasswordAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">Aktuelles Passwort</Label>
          <Input id="current" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next">Neues Passwort (min. 10 Zeichen)</Label>
          <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next2">Neues Passwort wiederholen</Label>
          <Input id="next2" name="next2" type="password" autoComplete="new-password" required minLength={10} />
        </div>
        <Button type="submit" className="w-full">Passwort speichern</Button>
      </form>
    </AuthShell>
  );
}
