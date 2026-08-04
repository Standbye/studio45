import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { KidStudio } from "./kid-studio";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: PageProps<"/g/[code]">) {
  const { code } = await params;
  const group = await db.group.findUnique({
    where: { code },
    include: { workshop: true },
  });
  if (!group || group.workshop.archived) notFound();

  return <KidStudio code={code} />;
}
