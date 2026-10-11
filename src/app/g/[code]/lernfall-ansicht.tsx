"use client";

import { useRef, useState } from "react";

type Urteil = "" | "ok" | "fehler";
type Befund = { urteil: Urteil; notiz: string };
type Fassung = "erste" | "zweite";

export type LernfallState = {
  /** 1 erste Fassung · 2 zweite Fassung · 3 Auflösung */
  stufe: number;
  fassung: Fassung | null;
  titel: string;
  regeln: string[];
  spielPfad: string;
  /** Wechselt, wenn die Lehrkraft die Befunde leert */
  runde: number;
  befunde: Record<Fassung, Befund[]>;
  /** Erst mit der Auflösung: was das Spiel je Fassung falsch macht (null = hält sich dran) */
  loesung: Record<Fassung, string | null>[] | null;
  merksatz: string | null;
};

type Props = {
  code: string;
  lernfall: LernfallState;
  studioName: string;
  hasLogo: boolean;
  style: React.CSSProperties;
  children?: React.ReactNode;
};

const URTEIL_TEXT: Record<Urteil, string> = { "": "nicht geprüft", ok: "✅ stimmt", fehler: "❌ stimmt nicht" };

/**
 * Lernfall in der Kinder-App: links das vorbereitete Spiel, rechts die Prüfliste zum Auftrag.
 * Die Lehrkraft schaltet die Stufen weiter — die Gruppe kann nichts überspringen.
 */
export function LernfallAnsicht({ code, lernfall, studioName, hasLogo, style, children }: Props) {
  return (
    <main style={style} className="flex min-h-svh flex-col bg-slate-100 text-slate-900 lg:h-svh">
      {children}
      <header className="flex items-center gap-3 px-4 py-2" style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)" }}>
        {hasLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/g/${code}/logo`} alt="" className="h-9 w-auto rounded bg-white/90 p-0.5" />
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-black leading-tight">🔎 Lernfall: Findet den Fehler der KI</h1>
          <p className="truncate text-xs opacity-90">
            {studioName} · {lernfall.stufe === 1 ? "Erste Fassung" : lernfall.stufe === 2 ? "Zweite Fassung — „alles repariert“?" : "Auflösung"}
          </p>
        </div>
      </header>
      {lernfall.fassung ? (
        // Neu aufsetzen, wenn die Lehrkraft weiterschaltet oder die Befunde leert
        <Pruefen key={`${lernfall.fassung}-${lernfall.runde}`} code={code} lernfall={lernfall} fassung={lernfall.fassung} />
      ) : (
        <Aufloesung lernfall={lernfall} />
      )}
    </main>
  );
}

function Pruefen({ code, lernfall, fassung }: { code: string; lernfall: LernfallState; fassung: Fassung }) {
  const [befunde, setBefunde] = useState<Befund[]>(() => lernfall.regeln.map((_, i) => lernfall.befunde[fassung][i] ?? { urteil: "", notiz: "" }));
  const [status, setStatus] = useState<"" | "speichert" | "gespeichert" | "fehler">("");
  const [spielKey, setSpielKey] = useState(0);
  const timer = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  async function sende(regel: number, befund: Befund) {
    setStatus("speichert");
    try {
      const res = await fetch(`/api/g/${code}/lernfall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fassung, regel, urteil: befund.urteil, notiz: befund.notiz.trim() }),
      });
      // 409 = die Lehrkraft hat gerade weitergeschaltet; die Ansicht wechselt gleich von selbst
      setStatus(res.ok || res.status === 409 ? "gespeichert" : "fehler");
    } catch {
      setStatus("fehler");
    }
  }

  function aendere(regel: number, neu: Befund, sofort: boolean) {
    setBefunde((alt) => alt.map((b, i) => (i === regel ? neu : b)));
    clearTimeout(timer.current[regel]);
    if (sofort) void sende(regel, neu);
    else timer.current[regel] = setTimeout(() => void sende(regel, neu), 900);
  }

  const geprueft = befunde.filter((b) => b.urteil !== "").length;
  const zweite = fassung === "zweite";

  return (
    <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:grid-rows-[minmax(0,1fr)]">
      <section className="flex flex-col overflow-hidden bg-white shadow-md max-lg:sticky max-lg:top-2 max-lg:z-10 max-lg:h-[46svh] lg:min-h-0" style={{ borderRadius: "var(--s45-radius)" }}>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-sm font-bold text-slate-500">
          <span>
            {lernfall.titel} — {zweite ? "zweite Fassung" : "erste Fassung"}
          </span>
          <button onClick={() => setSpielKey((k) => k + 1)} className="rounded-full border-2 border-slate-200 px-3 py-1 text-slate-700">
            ↻ Spiel neu laden
          </button>
        </div>
        <iframe
          key={spielKey}
          src={`${lernfall.spielPfad}${zweite ? "?fassung=zweite" : ""}`}
          sandbox="allow-scripts"
          title="Lernfall-Spiel"
          className="min-h-0 w-full flex-1 border-0"
        />
      </section>

      <section className="space-y-3 lg:min-h-0 lg:overflow-y-auto">
        <div className="bg-white p-4 shadow-sm" style={{ borderRadius: "var(--s45-radius)" }}>
          <h2 className="text-lg font-black" style={{ color: "var(--s45-primary-text)" }}>
            {zweite ? "Die KI sagt: „Ich habe alles repariert.“" : "Der Auftrag an die KI war klar."}
          </h2>
          <p className="mt-1 text-base">
            {zweite
              ? "Stimmt das? Prüft jede Regel noch einmal — glaubt es erst, wenn ihr es selbst gesehen habt."
              : "Hält sich das Spiel daran? Prüft jede Regel einzeln: erst ausprobieren, dann ankreuzen."}
          </p>
          <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>
              <b className="text-slate-800">
                {geprueft} von {befunde.length}
              </b>{" "}
              Regeln geprüft
            </span>
            <span aria-live="polite">
              {status === "speichert" ? "speichert …" : status === "gespeichert" ? "gespeichert ✓" : status === "fehler" ? "⚠️ nicht gespeichert — tippt nochmal" : ""}
            </span>
          </p>
        </div>

        {lernfall.regeln.map((regel, i) => {
          const b = befunde[i];
          const vorher = zweite ? lernfall.befunde.erste[i]?.urteil ?? "" : "";
          return (
            <div key={i} className="bg-white p-4 shadow-sm" style={{ borderRadius: "var(--s45-radius)" }}>
              <p className="text-base font-semibold">
                <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black" style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)" }}>
                  {i + 1}
                </span>
                {regel}
              </p>
              {zweite && vorher !== "" && <p className="mt-1 text-sm text-slate-500">Beim ersten Mal habt ihr gesagt: {URTEIL_TEXT[vorher as Urteil]}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["ok", "fehler"] as const).map((u) => {
                  const aktiv = b.urteil === u;
                  return (
                    <button
                      key={u}
                      onClick={() => aendere(i, { ...b, urteil: aktiv ? "" : u }, true)}
                      aria-pressed={aktiv}
                      className={`border-2 py-3 text-base font-black ${aktiv ? "" : "border-slate-200 text-slate-600"}`}
                      style={{
                        borderRadius: "var(--s45-radius)",
                        ...(aktiv ? { background: "var(--s45-primary)", color: "var(--s45-auf-primary)", borderColor: "var(--s45-primary)" } : {}),
                      }}
                    >
                      {u === "ok" ? "✅ Stimmt" : "❌ Stimmt nicht"}
                    </button>
                  );
                })}
              </div>
              {b.urteil === "fehler" && (
                <label className="mt-3 block text-sm font-semibold">
                  Was habt ihr erwartet — und was ist passiert?
                  <textarea
                    value={b.notiz}
                    onChange={(e) => aendere(i, { ...b, notiz: e.target.value }, false)}
                    onBlur={() => aendere(i, b, true)}
                    rows={2}
                    maxLength={300}
                    placeholder="Erwartet: …  Passiert: …"
                    className={`mt-1 w-full resize-none border-2 p-2 text-base font-normal ${b.notiz.trim() ? "border-slate-200" : "border-amber-400"}`}
                    style={{ borderRadius: "var(--s45-radius)" }}
                  />
                </label>
              )}
            </div>
          );
        })}
        <p className="px-1 pb-2 text-xs text-slate-500">
          Das Spiel ist vorbereitet und hat eingebaute Fehler — so, wie sie einer KI wirklich passieren.
        </p>
      </section>
    </div>
  );
}

function Aufloesung({ lernfall }: { lernfall: LernfallState }) {
  const mitZweiter = lernfall.befunde.zweite.some((b) => b.urteil !== "");
  const fassungen: Fassung[] = mitZweiter ? ["erste", "zweite"] : ["erste"];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 p-3">
      <div className="p-5 text-center" style={{ background: "var(--s45-accent)", color: "var(--s45-auf-accent)", borderRadius: "var(--s45-radius)" }}>
        <p className="text-2xl font-black">Auflösung — schaut nach vorne! 👀</p>
        {lernfall.merksatz && <p className="mt-2 text-base">{lernfall.merksatz}</p>}
      </div>
      {lernfall.regeln.map((regel, i) => (
        <div key={i} className="bg-white p-4 shadow-sm" style={{ borderRadius: "var(--s45-radius)" }}>
          <p className="text-base font-semibold">
            {i + 1}. {regel}
          </p>
          {fassungen.map((f) => {
            const fehler = lernfall.loesung?.[i]?.[f] ?? null;
            const urteil = lernfall.befunde[f][i]?.urteil ?? "";
            const soll: Urteil = fehler === null ? "ok" : "fehler";
            return (
              <div key={f} className="mt-2 rounded-lg bg-slate-100 p-3 text-sm">
                <p>
                  <b>{f === "erste" ? "Erste Fassung" : "Zweite Fassung"}:</b>{" "}
                  {fehler ?? (f === "zweite" && lernfall.loesung?.[i]?.erste ? "Behoben — das Spiel hält sich jetzt an die Regel." : "Das Spiel hält sich an die Regel.")}
                </p>
                <p className="mt-1 text-slate-600">
                  Ihr: {URTEIL_TEXT[urteil]}
                  {urteil !== "" && (urteil === soll ? " — richtig erkannt 👍" : " — hier lohnt sich ein zweiter Blick")}
                </p>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
