import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/passwort");
  if (user.role !== "ADMIN") redirect("/lehrer");

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <span className="text-xl font-black tracking-tight">
            Studio<span className="text-primary">45</span>
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Admin</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.displayName}</span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">Abmelden</Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
