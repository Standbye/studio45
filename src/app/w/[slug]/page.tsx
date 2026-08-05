import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { BASE_URL } from "@/lib/env";
import { dayMotto, dayTitle } from "@/lib/prompts";
import { AutoRefresh } from "@/components/auto-refresh";
import { farbschema } from "@/lib/kontrast";

export const dynamic = "force-dynamic";

const GROUP_COLORS = ["#1d4e89", "#0b6e4f", "#5e35b1", "#e65100", "#c8102e", "#00838f", "#6d4c41", "#37474f", "#ad1457", "#558b2f"];

/**
 * Öffentliche Beamer-/Startseite eines Workshops: QR-Codes pro Gruppe
 * (aus der konfigurierten BASE_URL erzeugt), Tagesfokus + Merksatz.
 */
export default async function WorkshopStartPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const w = await db.workshop.findUnique({
    where: { slug },
    include: { groups: { orderBy: { index: "asc" } } },
  });
  if (!w || w.archived) notFound();

  const qr = await Promise.all(
    w.groups.map((g) =>
      QRCode.toDataURL(`${BASE_URL}/g/${g.code}`, { errorCorrectionLevel: "H", margin: 1, width: 400 })
    )
  );

  // Schrift- und Verlaufsfarben aus der Markenfarbe ableiten — bei hellen
  // Tönen wäre weiße Schrift auf hellem Grund unlesbar.
  const farben = farbschema(w.colorPrimary, w.colorAccent);

  return (
    <main
      className="min-h-svh p-8"
      style={{
        background: `linear-gradient(160deg, ${farben.primary}, ${farben.primaryDunkel})`,
        color: farben.aufPrimary,
      }}
    >
      <AutoRefresh seconds={30} />
      <header className="mb-8 flex items-center gap-4">
        {w.logoPath && w.groups[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/g/${w.groups[0].code}/logo`} alt="" className="h-16 w-auto rounded-xl bg-white/90 p-1.5" />
        )}
        <div>
          <h1 className="text-4xl font-black">
            {w.name} {w.className && <span className="opacity-70">· {w.className}</span>}
          </h1>
          <p className="text-lg opacity-90">
            Tag {w.currentDay}/{w.totalDays}: {dayTitle(w.currentDay, w.totalDays)}
          </p>
        </div>
        <div className="ml-auto rounded-2xl px-5 py-3 text-right" style={{ background: "rgba(255,255,255,.12)" }}>
          <span className="block text-xs uppercase tracking-widest opacity-75">Merksatz des Tages</span>
          <span className="text-xl font-bold">„{dayMotto(w.currentDay, w.totalDays)}"</span>
        </div>
      </header>

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))` }}
      >
        {w.groups.map((g, i) => (
          <div key={g.id} className="rounded-3xl bg-white p-5 text-center text-slate-900 shadow-xl">
            <div
              className="mb-3 rounded-xl py-2 text-xl font-black text-white"
              style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }}
            >
              {g.studioName || `Gruppe ${g.index}`}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr[i]} alt={`QR-Code Gruppe ${g.index}`} className="mx-auto w-full max-w-52" />
            <p className="mt-2 text-sm text-slate-500">iPad-Kamera drauf halten 📷</p>
          </div>
        ))}
      </div>

      <footer className="mt-10 flex flex-col items-center gap-4 text-sm opacity-90">
        <a
          href={`/w/${w.slug}/hub`}
          className="rounded-full bg-white/15 px-6 py-3 text-lg font-bold backdrop-blur transition hover:bg-white/25"
        >
          🌳 Zur begehbaren Schule
        </a>
        <span className="opacity-70">
          {w.phase === "STUDIO" ? "🎮 Studio-Phase läuft — baut los!" : w.phase === "PAUSE" ? "⏸️ Pause" : "🗣️ Plenum — Blick nach vorne!"}
          <span className="mx-3">·</span> Studio45
        </span>
      </footer>
    </main>
  );
}
