"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type KidState = {
  studioName: string;
  groupIndex: number;
  workshopName: string;
  day: number;
  totalDays: number;
  dayTitle: string;
  motto: string;
  phase: "PLENUM" | "STUDIO" | "PAUSE";
  locked: boolean;
  guidance: "FREI" | "IMPULSE" | "GEFUEHRT";
  attemptsLeft: number;
  cooldownRemaining: number;
  cooldownSeconds: number;
  generating: boolean;
  gameVersion: number;
  branding: { colorPrimary: string; colorAccent: string; hasLogo: boolean };
};

const CHIPS: Record<number, string[]> = {
  1: ["Unser Spiel heißt …", "Die Hauptfigur ist …", "Die Farben sollen … sein", "Wenn man die Figur antippt, soll …"],
  2: ["Man muss … sammeln", "Man muss … ausweichen", "Man gewinnt, wenn …", "Man verliert, wenn …"],
  3: ["Der Hintergrund soll …", "Die Figur soll sich bewegen, wenn …", "Bei einem Treffer soll ein Geräusch …", "Baut Sterne/Konfetti ein, wenn …"],
  4: ["Es soll Punkte geben für …", "Nach … wird es schwerer", "Baut ein zweites Level ein mit …", "Es soll einen Endgegner geben, der …"],
  5: ["Ein Startbildschirm mit unserem Studio-Namen", "Eine Sieger-Urkunde am Ende", "Macht den Anfang leichter", "Der beste Punktestand soll gespeichert werden"],
};

const CHECKFRAGEN = [
  "Habt ihr zusammen besprochen, was sich ändern soll?",
  "Sagt euer Satz WAS passieren soll und WIE es aussehen soll?",
  "Habt ihr das Spiel vorher ausprobiert?",
];

const WARTE_SPRUECHE = [
  "Die KI tippt ganz schnell …",
  "Pixel werden gestapelt …",
  "Die Spielfigur bekommt Schuhe an …",
  "Sound-Bleeps werden gestimmt …",
  "Gleich könnt ihr testen!",
];

export function KidStudio({ code }: { code: string }) {
  const [state, setState] = useState<KidState | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState(WARTE_SPRUECHE[0]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [listening, setListening] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const gameVersionRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/g/${code}/state`, { cache: "no-store" });
      if (!res.ok) return;
      const s: KidState = await res.json();
      setState(s);
      setCooldown(s.cooldownRemaining);
      if (s.gameVersion !== gameVersionRef.current) {
        gameVersionRef.current = s.gameVersion;
        setIframeKey((k) => k + 1);
      }
    } catch {
      /* offline-Momente still aushalten */
    }
  }, [code]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!busy) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % WARTE_SPRUECHE.length;
      setBusyMsg(WARTE_SPRUECHE[i]);
    }, 6000);
    return () => clearInterval(t);
  }, [busy]);

  function toggleMic() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setFeedback("Auf diesem Gerät gibt es keine Spracheingabe — tippt euren Wunsch einfach.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "de-DE";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";
    rec.onresult = (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setText((prev) => {
        const base = prev.replace(/⏳.*$/, "");
        return (base + finalText + (interim ? `⏳${interim}` : "")).trimStart();
      });
      if (finalText) {
        setText((prev) => prev.replace(/⏳.*$/, ""));
      }
    };
    rec.onend = () => {
      setListening(false);
      setText((prev) => prev.replace(/⏳.*$/, "").trim() + " ");
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function submit() {
    if (!state) return;
    if (state.guidance === "GEFUEHRT" && !showCheck) {
      setChecks([false, false, false]);
      setShowCheck(true);
      return;
    }
    setShowCheck(false);
    setBusy(true);
    setBusyMsg(WARTE_SPRUECHE[0]);
    setFeedback(null);
    try {
      const res = await fetch(`/api/g/${code}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text.replace(/⏳.*$/, "").trim() }),
      });
      const out = await res.json();
      if (out.ok) {
        setText("");
        setFeedback("✅ Fertig! Testet euer Spiel — was wollt ihr als Nächstes ändern?");
        await refresh();
      } else {
        setFeedback(`💡 ${out.reason ?? "Das hat nicht geklappt — probiert es nochmal."}`);
        await refresh();
      }
    } catch {
      setFeedback("💡 Verbindungsproblem — probiert es gleich nochmal.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-100">
        <p className="text-xl text-slate-500 animate-pulse">Studio wird geöffnet …</p>
      </main>
    );
  }

  const vars = {
    "--s45-primary": state.branding.colorPrimary,
    "--s45-accent": state.branding.colorAccent,
  } as React.CSSProperties;

  const promptText = text.replace(/⏳.*$/, "").trim();
  const canSend = !busy && promptText.length >= 3 && cooldown === 0 && state.attemptsLeft > 0 && !state.generating && !state.locked;

  // Plenum-/Pause-Sperre: Kinder sehen Wartebildschirm mit Merksatz
  if (state.phase !== "STUDIO") {
    return (
      <main style={vars} className="flex min-h-svh flex-col items-center justify-center gap-6 p-8 text-center text-white" >
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(160deg, var(--s45-primary), #1a1a2e)" }} />
        {state.branding.hasLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/g/${code}/logo`} alt="" className="h-20 w-auto rounded-xl bg-white/90 p-2" />
        )}
        <h1 className="text-4xl font-black">{state.studioName}</h1>
        <p className="text-2xl">
          {state.phase === "PAUSE" ? "Pause — gleich geht's weiter! 🍎" : "Gerade ist Plenum — schaut nach vorne! 👀"}
        </p>
        <div className="max-w-xl rounded-2xl bg-white/15 p-6 text-xl backdrop-blur">
          <span className="mb-1 block text-sm uppercase tracking-widest opacity-80">Merksatz Tag {state.day}</span>
          „{state.motto}"
        </div>
      </main>
    );
  }

  return (
    <main style={vars} className="flex min-h-svh flex-col bg-slate-100">
      {/* Kopfzeile */}
      <header className="flex items-center gap-3 px-4 py-2 text-white" style={{ background: "var(--s45-primary)" }}>
        {state.branding.hasLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/g/${code}/logo`} alt="" className="h-9 w-auto rounded bg-white/90 p-0.5" />
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-black leading-tight">{state.studioName}</h1>
          <p className="truncate text-xs opacity-90">
            Tag {state.day}/{state.totalDays} · {state.dayTitle}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: "var(--s45-accent)", color: "#1f2430" }}>
            {state.attemptsLeft > 0 ? `Noch ${state.attemptsLeft} ${state.attemptsLeft === 1 ? "Versuch" : "Versuche"}` : "Keine Versuche mehr"}
          </span>
          <button
            onClick={() => frameRef.current?.requestFullscreen?.()}
            className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold"
            title="Spiel im Vollbild"
          >
            ⛶
          </button>
        </div>
      </header>

      {/* Spiel */}
      <div className="relative min-h-0 flex-1">
        <iframe
          key={iframeKey}
          ref={frameRef}
          src={`/g/${code}/play`}
          sandbox="allow-scripts"
          allow="fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0 bg-white"
          title="Euer Spiel"
        />
        {(busy || state.generating) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 text-white">
            <div className="text-6xl animate-bounce">🛠️</div>
            <p className="text-2xl font-bold">{busyMsg}</p>
            <p className="text-sm opacity-80">Das dauert ungefähr eine Minute — besprecht schon mal den nächsten Schritt!</p>
          </div>
        )}
      </div>

      {/* Eingabe */}
      <footer className="space-y-2 border-t bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {feedback && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{feedback}</p>}
        {cooldown > 0 && (
          <p className="rounded-lg px-3 py-2 text-center text-sm font-bold text-white" style={{ background: "var(--s45-primary)" }}>
            ⏸️ Denkpause: Testet euer Spiel und besprecht den nächsten Schritt — weiter in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
          </p>
        )}
        {state.guidance !== "FREI" && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(CHIPS[Math.min(state.day, 5)] ?? CHIPS[1]).map((chip) => (
              <button
                key={chip}
                onClick={() => setText((t) => (t ? t.replace(/⏳.*$/, "").trim() + " — " + chip : chip))}
                className="whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-sm font-semibold"
                style={{ borderColor: "var(--s45-primary)", color: "var(--s45-primary)" }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={toggleMic}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl text-white shadow ${listening ? "animate-pulse" : ""}`}
            style={{ background: listening ? "#dc2626" : "var(--s45-primary)" }}
            title={listening ? "Aufnahme stoppen" : "Sprechen"}
          >
            {listening ? "⏹" : "🎤"}
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={4000}
            placeholder={listening ? "Sprecht jetzt …" : "Was soll die KI bauen oder ändern?"}
            className="min-h-14 flex-1 resize-none rounded-xl border-2 border-slate-200 p-3 text-base focus:outline-none"
            style={{ borderColor: promptText ? "var(--s45-primary)" : undefined }}
          />
          <button
            onClick={submit}
            disabled={!canSend}
            className="h-14 shrink-0 rounded-xl px-5 text-lg font-black text-white shadow disabled:opacity-40"
            style={{ background: "var(--s45-accent)", color: "#1f2430" }}
          >
            {busy ? "…" : "Bauen!"}
          </button>
        </div>
        {state.guidance === "IMPULSE" && (
          <p className="text-center text-xs text-slate-400">
            💡 Gute Wünsche sagen WAS passieren soll und WIE es aussehen soll.
          </p>
        )}
      </footer>

      {/* Geführter Modus: Checkfragen vor dem Senden */}
      {showCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6">
            <h2 className="text-xl font-black" style={{ color: "var(--s45-primary)" }}>
              Kurzer Team-Check ✋
            </h2>
            {CHECKFRAGEN.map((frage, i) => (
              <label key={frage} className="flex cursor-pointer items-start gap-3 text-base">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                  className="mt-1 h-5 w-5"
                />
                {frage}
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCheck(false)} className="flex-1 rounded-xl border-2 border-slate-300 py-3 font-bold text-slate-600">
                Zurück
              </button>
              <button
                onClick={submit}
                disabled={!checks.every(Boolean)}
                className="flex-1 rounded-xl py-3 font-black text-white disabled:opacity-40"
                style={{ background: "var(--s45-primary)" }}
              >
                Los geht's!
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
