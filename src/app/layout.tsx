import type { Metadata } from "next";
// Schriften selbst gehostet (fontsource) — keine externen Requests zur Laufzeit
import "@fontsource-variable/inter";
import "@fontsource-variable/nunito";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Studio45",
  description: "Spielestudio in 45 Minuten — Kinder lernen KI-Kompetenz, indem sie eigene Lernspiele bauen.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
