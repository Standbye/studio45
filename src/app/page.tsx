import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount === 0) redirect("/setup");
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/passwort");
  redirect(user.role === "ADMIN" ? "/admin" : "/lehrer");
}
