import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";
import { KidStudio } from "./kid-studio";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: PageProps<"/g/[code]">) {
  const { code } = await params;
  const group = await db.group.findUnique({
    where: { code },
    include: { workshop: true },
  });
  if (!group || group.workshop.archived) {
    // Enumeration-Schutz: Fehlversuche pro Gerät begrenzen
    const jar = await cookies();
    rateLimit(`code-miss:${deviceIdFrom(jar.get(DEVICE_COOKIE)?.value)}`, 10, 300);
    notFound();
  }

  return <KidStudio code={code} />;
}
