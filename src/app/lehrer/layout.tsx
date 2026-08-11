import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LehrerLayout({ children }: LayoutProps<"/lehrer">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/passwort");
  if (user.role !== "TEACHER") redirect("/admin");

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="text-xl font-black tracking-tight">
            Studio<span className="text-amber-400">45</span>
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">Lehrkraft</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm opacity-80">{user.displayName}</span>
            <form action={logoutAction}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
              >
                Abmelden
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
