"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LernfallAnsicht, type LernfallState } from "./lernfall-ansicht";
import { diktatSitzung } from "@/lib/diktat";

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
  ageGroup: "GRUNDSCHULE" | "MITTELSTUFE" | "OBERSTUFE";
  optik: {
    verspielt: boolean;
    radius: string;
    grundschrift: string;
    knopfHoehe: string;
    emojiImKopf: boolean;
    animationen: boolean;
  };
  texte: {
    eingabeHinweis: string;
    bauKnopf: string;
    wartenTitel: string;
    fertig: string;
    plenum: string;
    tipp: string;
  };
  chips: string[];
  hilfen: { chips: boolean; teamCheck: boolean; coachAbZeichen: number };
  attemptsLeft: number;
  cooldownRemaining: number;
  cooldownSeconds: number;
  generating: boolean;
  laufSekunden: number;
  dauerSchaetzung: number;
  gameVersion: number;
  verbrauch: {
    gesamtTokens: number;
    letzterTokens: number;
    gesamtEuro: string | null;
    letzterEuro: string | null;
    energie: string[];
  };
  challenge: { platz: number; von: number; fuehrtTokens: number } | null;
  /** Aus dem Steckbrief des Spiels: was die Gruppe verlangt und was die KI ergänzt hat */
  herkunft: { gruppe: string[]; ki: string[] } | null;
  /** Die Lehrkraft legt eine Beschreibung für den Director's Cut zur Abstimmung vor */
  directorCut: { spec: string } | null;
  /** Von der Lehrkraft freigegebener Lernfall — ersetzt solange das Studio */
  lernfall: LernfallState | null;
  branding: {
    primary: string;
    accent: string;
    /** Schrift auf der Hauptfarbe — berechnet, damit helle Töne lesbar bleiben */
    aufPrimary: string;
    aufAccent: string;
    /** Hauptfarbe als Schrift auf hellem Grund */
    primaryText: string;
    accentText: string;
    primaryDunkel: string;
    hasLogo: boolean;
  };
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
  const [bauSekunden, setBauSekunden] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [listening, setListening] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [coachVorschlag, setCoachVorschlag] = useState<string | null>(null);
  const [showVerbrauch, setShowVerbrauch] = useState(false);
  const [showHerkunft, setShowHerkunft] = useState(false);
  const [geradeGebaut, setGeradeGebaut] = useState(false);
  const [dcNein, setDcNein] = useState(false);
  const [dcHinweis, setDcHinweis] = useState("");
  const [dcSendet, setDcSendet] = useState(false);
  const [coachGezeigt, setCoachGezeigt] = useState(false);
  const [coachLaeuft, setCoachLaeuft] = useState(false);
  const gameVersionRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const abbruchRef = useRef<AbortController | null>(null);

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

  const baut = busy || Boolean(state?.generating);

  useEffect(() => {
    if (!baut) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % WARTE_SPRUECHE.length;
      setBusyMsg(WARTE_SPRUECHE[i]);
    }, 6000);
    return () => clearInterval(t);
  }, [baut]);

  // Sekundenzähler während des Bauens — Grundlage für Balken und Restzeit
  useEffect(() => {
    if (!baut) {
      setBauSekunden(0);
      return;
    }
    const t = setInterval(() => setBauSekunden((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [baut]);

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
    // Der Text wird bei jedem Ergebnis komplett neu aufgebaut (siehe lib/diktat) —
    // ⏳ markiert das noch Vorläufige, das beim Bauen nicht mitgeschickt wird.
    const sitzung = diktatSitzung(text.replace(/⏳.*$/, ""));
    rec.onresult = (e: { results: Parameters<typeof sitzung.ergebnis>[0] }) => {
      const { text: stand, vorlaeufig } = sitzung.ergebnis(e.results);
      setText(vorlaeufig ? `${stand} ⏳${vorlaeufig}`.trimStart() : stand);
    };
    rec.onend = () => {
      setListening(false);
      // Was beim Stopp noch vorläufig war, bleibt stehen — die Gruppe hat es gesehen
      setText((prev) => prev.replace(/\s*⏳/, " ").trim() + " ");
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  /** Formulierungshilfe: zeigt eine genauere Fassung des Wunsches zur Auswahl. */
  async function holeCoachVorschlag(): Promise<boolean> {
    if (!state || state.hilfen.coachAbZeichen === 0) return false;
    const roh = text.replace(/⏳.*$/, "").trim();
    if (roh.length === 0 || roh.length > state.hilfen.coachAbZeichen) return false;
    setCoachLaeuft(true);
    try {
      const res = await fetch(`/api/g/${code}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: roh }),
      });
      if (!res.ok) return false;
      const out = await res.json();
      if (!out.vorschlag) return false;
      setCoachVorschlag(out.vorschlag);
      return true;
    } catch {
      return false;
    } finally {
      setCoachLaeuft(false);
    }
  }

  async function submit() {
    if (!state) return;
    // Erst die Formulierungshilfe, dann der Team-Check, dann bauen
    if (!coachGezeigt && (await holeCoachVorschlag())) {
      setCoachGezeigt(true);
      return;
    }
    if (state.hilfen.teamCheck && !showCheck) {
      setChecks([false, false, false]);
      setShowCheck(true);
      return;
    }
    setShowCheck(false);
    setCoachVorschlag(null);
    setCoachGezeigt(false);
    setBusy(true);
    setBusyMsg(WARTE_SPRUECHE[0]);
    setFeedback(null);
    setGeradeGebaut(false);

    // Nicht ewig hängen bleiben, wenn die Antwort nie kommt
    const abbruch = new AbortController();
    abbruchRef.current = abbruch;
    const notbremse = setTimeout(() => abbruch.abort(), 12 * 60 * 1000);

    try {
      const res = await fetch(`/api/g/${code}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text.replace(/⏳.*$/, "").trim() }),
        signal: abbruch.signal,
      });
      const out = await res.json();
      if (out.ok) {
        setText("");
        setFeedback(state.texte.fertig);
        setGeradeGebaut(true);
        await refresh();
      } else {
        setFeedback(`💡 ${out.reason ?? "Das hat nicht geklappt — probiert es nochmal."}`);
        await refresh();
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setFeedback("⏹️ Warten beendet. Falls die KI doch noch fertig wird, erscheint euer Spiel von selbst.");
      } else {
        setFeedback("💡 Verbindungsproblem — probiert es gleich nochmal.");
      }
      await refresh();
    } finally {
      clearTimeout(notbremse);
      abbruchRef.current = null;
      setBusy(false);
    }
  }

  /** Warten abbrechen: gibt die Gruppe wieder frei, damit sie nicht festhängt. */
  async function abbrechen() {
    abbruchRef.current?.abort();
    setBusy(false);
    try {
      await fetch(`/api/g/${code}/abbrechen`, { method: "POST" });
    } catch {
      /* egal — der Serverlauf gibt sich spätestens per Timeout selbst frei */
    }
    setFeedback("⏹️ Warten beendet. Ihr könnt es gleich noch einmal versuchen.");
    await refresh();
  }

  /** Antwort der Gruppe auf die vorgelegte Director's-Cut-Beschreibung */
  async function antworteDirectorCut(antwort: "ja" | "nein") {
    setDcSendet(true);
    try {
      await fetch(`/api/g/${code}/director`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ antwort, hinweis: antwort === "nein" ? dcHinweis.trim() : undefined }),
      });
    } catch {
      /* die Vorlage bleibt offen und erscheint beim nächsten Abgleich wieder */
    }
    setDcNein(false);
    setDcHinweis("");
    setDcSendet(false);
    await refresh();
  }

  if (!state) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-100">
        <p className="text-xl text-slate-500 animate-pulse">Studio wird geöffnet …</p>
      </main>
    );
  }

  const vars = {
    fontFamily: "var(--font-kind)",
    "--s45-primary": state.branding.primary,
    "--s45-accent": state.branding.accent,
    "--s45-auf-primary": state.branding.aufPrimary,
    "--s45-auf-accent": state.branding.aufAccent,
    "--s45-primary-text": state.branding.primaryText,
    "--s45-primary-dunkel": state.branding.primaryDunkel,
    "--s45-radius": state.optik.radius,
    "--s45-schrift": state.optik.grundschrift,
    "--s45-knopf": state.optik.knopfHoehe,
  } as React.CSSProperties;

  const promptText = text.replace(/⏳.*$/, "").trim();
  const canSend = !baut && promptText.length >= 3 && cooldown === 0 && state.attemptsLeft > 0 && !state.locked;

  // „Zu lang" heißt: doppelte Schätzung, mindestens aber zwei Minuten.
  // Der Serverlauf zählt mit, damit auch ein neu geladener Tab den Knopf sieht.
  const wartezeit = Math.max(bauSekunden, state.laufSekunden);
  const wartetZuLang = baut && wartezeit > Math.max(120, state.dauerSchaetzung * 2);

  // Es ist das Spiel der Gruppe: Bevor die Lehrkraft daraus ein Gesamtspiel bauen lässt,
  // sieht die Gruppe die Beschreibung und stimmt zu oder widerspricht.
  const directorCutDialog = state.directorCut && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 text-left text-slate-900">
      <div className="max-h-[92svh] w-full max-w-xl space-y-4 overflow-y-auto bg-white p-6" style={{ borderRadius: "var(--s45-radius)" }}>
        <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
          🎬 Passt das zu eurem Spiel?
        </h2>
        <p className="text-sm text-slate-600">
          Aus all euren Wünschen soll ein großes Gesamtspiel entstehen. So ist es beschrieben —
          lest es zusammen. Es ist euer Spiel: Ihr entscheidet, ob das stimmt.
        </p>
        <p className="whitespace-pre-wrap rounded-lg bg-slate-100 p-4 text-base leading-relaxed">{state.directorCut.spec}</p>
        {dcNein ? (
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Was soll anders sein?</label>
            <textarea
              value={dcHinweis}
              onChange={(e) => setDcHinweis(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Zum Beispiel: Unsere Figur ist ein Fuchs, kein Hase."
              className="w-full resize-none border-2 border-slate-200 p-3 text-base"
              style={{ borderRadius: "var(--s45-radius)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => setDcNein(false)} className="flex-1 border-2 border-slate-300 py-3 font-bold text-slate-600" style={{ borderRadius: "var(--s45-radius)" }}>
                Zurück
              </button>
              <button
                onClick={() => antworteDirectorCut("nein")}
                disabled={dcSendet}
                className="flex-1 py-3 font-black disabled:opacity-40"
                style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)", borderRadius: "var(--s45-radius)" }}
              >
                Abschicken
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setDcNein(true)}
              disabled={dcSendet}
              className="flex-1 border-2 border-slate-300 py-3 font-bold text-slate-700 disabled:opacity-40"
              style={{ borderRadius: "var(--s45-radius)" }}
            >
              Nein, das passt nicht
            </button>
            <button
              onClick={() => antworteDirectorCut("ja")}
              disabled={dcSendet}
              className="flex-1 py-3 font-black disabled:opacity-40"
              style={{ background: "var(--s45-accent)", color: "var(--s45-auf-accent)", borderRadius: "var(--s45-radius)" }}
            >
              Ja, so soll es werden
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Lernfall: Hat die Lehrkraft ihn freigegeben, arbeitet die Gruppe daran statt im Studio —
  // auch im Plenum. Nur die Pause deckt ihn zu.
  if (state.lernfall && state.phase !== "PAUSE") {
    return (
      <LernfallAnsicht code={code} lernfall={state.lernfall} studioName={state.studioName} hasLogo={state.branding.hasLogo} style={vars}>
        {directorCutDialog}
      </LernfallAnsicht>
    );
  }

  // Plenum-/Pause-Sperre: Kinder sehen Wartebildschirm mit Merksatz
  if (state.phase !== "STUDIO") {
    return (
      <main
        style={{ ...vars, color: state.branding.aufPrimary }}
        className="flex min-h-svh flex-col items-center justify-center gap-6 p-8 text-center"
      >
        {directorCutDialog}
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(160deg, var(--s45-primary), var(--s45-primary-dunkel))" }} />
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
    <main style={vars} className="flex min-h-svh flex-col bg-slate-100 lg:h-svh lg:overflow-hidden">
      {/* Kopfzeile */}
      <header className="flex items-center gap-3 px-4 py-2" style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)" }}>
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
          <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: "var(--s45-accent)", color: "var(--s45-auf-accent)" }}>
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

      {/* Breite Geräte (Tablet quer, Laptop): Spiel links im Rahmen über die volle Höhe, Bedienung
          rechts daneben — so verdeckt die Eingabe nichts und im Spiel muss niemand scrollen.
          Schmale Geräte: wie bisher untereinander. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Spiel */}
      <div className="relative min-h-0 flex-1 lg:m-3 lg:overflow-hidden lg:rounded-2xl lg:border-2 lg:border-slate-300 lg:bg-white lg:shadow-md">
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
        {baut && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 px-6 text-white">
            <div className={`text-6xl ${state.optik.animationen ? "animate-bounce" : ""}`}>🛠️</div>
            <p className="text-2xl font-bold">{state.optik.verspielt ? busyMsg : state.texte.wartenTitel}</p>
            {/* Fortschritt: Schätzung aus den bisherigen Bauzeiten dieses Workshops */}
            <div className="w-full max-w-sm">
              <div className="h-3 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${Math.min(97, (wartezeit / Math.max(10, state.dauerSchaetzung)) * 100)}%`,
                    background: "var(--s45-accent)",
                  }}
                />
              </div>
              <p className="mt-2 text-center text-lg font-bold">
                {wartezeit < state.dauerSchaetzung
                  ? `noch ungefähr ${Math.max(1, state.dauerSchaetzung - wartezeit)} Sekunden`
                  : "gleich fertig …"}
              </p>
            </div>
            <p className="text-center text-sm opacity-80">
              Besprecht in der Zwischenzeit, was ihr als Nächstes ändern wollt!
            </p>
            {/* Nach deutlicher Überschreitung: Notausgang, damit niemand festhängt */}
            {wartetZuLang && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <p className="text-center text-sm">
                  Das dauert länger als sonst. Ihr könnt das Warten beenden und es neu versuchen.
                </p>
                <button
                  onClick={abbrechen}
                  className="rounded-xl bg-white/90 px-5 py-2 text-base font-bold text-slate-900"
                >
                  ⏹️ Warten beenden
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Eingabe */}
      <footer className="space-y-2 border-t bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:w-[23rem] lg:shrink-0 lg:space-y-3 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-4 xl:w-[26rem]">
        {feedback && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{feedback}</p>}
        {geradeGebaut && state.herkunft && state.herkunft.ki.length > 0 && (
          <div className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm">
            <span className="font-semibold">Das hat die KI von sich aus ergänzt:</span>{" "}
            {state.herkunft.ki.slice(0, 4).join(" · ")}
            {state.herkunft.ki.length > 4 ? " …" : ""}{" "}
            <button onClick={() => setShowHerkunft(true)} className="font-semibold underline underline-offset-2" style={{ color: "var(--s45-primary-text)" }}>
              Ansehen und entscheiden
            </button>
          </div>
        )}
        {cooldown > 0 && (
          <p className="rounded-lg px-3 py-2 text-center text-sm font-bold" style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)" }}>
            ⏸️ Denkpause: Testet euer Spiel und besprecht den nächsten Schritt — weiter in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
          </p>
        )}
        {state.hilfen.chips && (
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
            {state.chips.map((chip) => (
              <button
                key={chip}
                onClick={() => setText((t) => (t ? t.replace(/⏳.*$/, "").trim() + " — " + chip : chip))}
                disabled={baut}
                className="whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-sm font-semibold disabled:opacity-40 lg:whitespace-normal lg:text-left"
                style={{ borderColor: "var(--s45-primary-text)", color: "var(--s45-primary-text)" }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 lg:flex-wrap">
          <button
            onClick={toggleMic}
            disabled={baut}
            className={`flex w-14 shrink-0 items-center justify-center rounded-full text-2xl shadow disabled:opacity-40 ${listening ? "animate-pulse" : ""}`}
            style={{
              background: listening ? "#dc2626" : "var(--s45-primary)",
              color: listening ? "#ffffff" : "var(--s45-auf-primary)",
              height: "var(--s45-knopf)",
            }}
            title={baut ? "Die KI baut gerade" : listening ? "Aufnahme stoppen" : "Sprechen"}
          >
            {listening ? "⏹" : "🎤"}
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={4000}
            disabled={baut}
            placeholder={
              baut
                ? `${state.texte.wartenTitel} …`
                : listening
                  ? "Sprecht jetzt …"
                  : state.texte.eingabeHinweis
            }
            className="flex-1 resize-none border-2 border-slate-200 p-3 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 min-h-[var(--s45-knopf)] lg:order-first lg:min-h-40 lg:basis-full"
            style={{
              borderColor: !baut && promptText ? "var(--s45-primary-text)" : undefined,
              borderRadius: "var(--s45-radius)",
              fontSize: "var(--s45-schrift)",
            }}
          />
          <button
            onClick={submit}
            disabled={!canSend}
            className="shrink-0 px-5 text-lg font-black shadow disabled:opacity-40 lg:flex-1"
            style={{ background: "var(--s45-accent)", color: "var(--s45-auf-accent)", height: "var(--s45-knopf)", borderRadius: "var(--s45-radius)" }}
          >
            {baut || coachLaeuft ? "…" : state.texte.bauKnopf}
          </button>
        </div>
        {state.hilfen.chips && (
          <p className="text-center text-xs text-slate-400">{state.texte.tipp}</p>
        )}
        {state.verbrauch.gesamtTokens > 0 && (
          <button
            onClick={() => setShowVerbrauch(true)}
            className="mx-auto block text-center text-xs text-slate-400 underline-offset-2 hover:underline"
          >
            ⚡ {state.verbrauch.letzterTokens > 0 && (
              <>Letzter Bau: {state.verbrauch.letzterTokens.toLocaleString("de-DE")} · </>
            )}
            Gesamt: {state.verbrauch.gesamtTokens.toLocaleString("de-DE")} Tokens
            {state.verbrauch.gesamtEuro && <> ({state.verbrauch.gesamtEuro})</>}
            {state.challenge && <> · 🏆 Platz {state.challenge.platz} von {state.challenge.von}</>} ⓘ
          </button>
        )}
        {state.herkunft && (
          <button
            onClick={() => setShowHerkunft(true)}
            className="mx-auto block text-center text-xs text-slate-400 underline-offset-2 hover:underline"
          >
            🧩 Was kam von uns — was von der KI?
          </button>
        )}
      </footer>
      </div>

      {/* Formulierungshilfe: der eigene Wunsch und eine genauere Fassung im Vergleich */}
      {coachVorschlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg space-y-4 bg-white p-6"
            style={{ borderRadius: "var(--s45-radius)" }}
          >
            <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
              So könnte man es genauer sagen
            </h2>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Euer Wunsch</p>
              <p className="rounded-lg bg-slate-100 p-3 text-sm">{promptText}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Genauer gesagt</p>
              <p
                className="p-3 text-base"
                style={{ background: "var(--s45-accent)", borderRadius: "var(--s45-radius)", color: "var(--s45-auf-accent)" }}
              >
                {coachVorschlag}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Je genauer der Auftrag, desto näher kommt das Spiel an eure Idee. Ihr entscheidet.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => {
                  setText(coachVorschlag);
                  setCoachVorschlag(null);
                  setCoachGezeigt(true);
                }}
                className="flex-1 py-3 font-bold"
                style={{ background: "var(--s45-accent)", color: "var(--s45-auf-accent)", borderRadius: "var(--s45-radius)" }}
              >
                Übernehmen und bearbeiten
              </button>
              <button
                onClick={() => {
                  setCoachVorschlag(null);
                  setCoachGezeigt(true);
                  void submit();
                }}
                className="flex-1 py-3 font-bold"
                style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)", borderRadius: "var(--s45-radius)" }}
              >
                So bauen
              </button>
            </div>
            <button
              onClick={() => {
                setCoachVorschlag(null);
                setCoachGezeigt(true);
              }}
              className="w-full text-center text-sm text-slate-500 underline"
            >
              Bei unserem Satz bleiben
            </button>
          </div>
        </div>
      )}

      {directorCutDialog}

      {/* Wer hat was entschieden? Die Gruppe soll sagen können, welche Idee ihre eigene ist. */}
      {showHerkunft && state.herkunft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92svh] w-full max-w-lg space-y-4 overflow-y-auto bg-white p-6" style={{ borderRadius: "var(--s45-radius)" }}>
            <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
              🧩 Von uns — und von der KI
            </h2>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Das haben wir verlangt</p>
              {state.herkunft.gruppe.length === 0 && <p className="text-sm text-slate-500">Noch nichts eingetragen.</p>}
              <ul className="space-y-1">
                {state.herkunft.gruppe.map((eintrag) => (
                  <li key={eintrag} className="rounded-lg bg-slate-100 px-3 py-2 text-base">{eintrag}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Das hat die KI von sich aus ergänzt</p>
              {state.herkunft.ki.length === 0 && <p className="text-sm text-slate-500">Nichts — die KI hat nur gebaut, was ihr gesagt habt.</p>}
              <ul className="space-y-1">
                {state.herkunft.ki.map((eintrag) => (
                  <li key={eintrag} className="flex items-center gap-2 rounded-lg border-2 border-slate-200 px-3 py-2 text-base">
                    <span className="flex-1">{eintrag}</span>
                    <button
                      onClick={() => {
                        setText(`Nimm das wieder heraus: ${eintrag}. Alles andere bleibt, wie es ist.`);
                        setShowHerkunft(false);
                      }}
                      disabled={baut}
                      className="shrink-0 rounded-full border-2 px-3 py-1 text-xs font-semibold disabled:opacity-40"
                      style={{ borderColor: "var(--s45-primary-text)", color: "var(--s45-primary-text)" }}
                    >
                      Wollen wir nicht
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-slate-500">
              Die KI schlägt vor — ihr entscheidet. Was euch gefällt, bleibt. „Wollen wir nicht“ schreibt
              den Wunsch ins Eingabefeld; gebaut wird erst, wenn ihr ihn abschickt. Die Liste führt die KI
              selbst — prüft im Spiel, ob sie stimmt.
            </p>
            <button
              onClick={() => setShowHerkunft(false)}
              className="w-full py-3 font-bold"
              style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)", borderRadius: "var(--s45-radius)" }}
            >
              Alles klar!
            </button>
          </div>
        </div>
      )}

      {/* Token-Transparenz: was das Bauen verbraucht — mit Alltagsvergleich */}
      {showVerbrauch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 bg-white p-6" style={{ borderRadius: "var(--s45-radius)" }}>
            <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
              ⚡ Was verbraucht unser Bauen?
            </h2>
            <div className="space-y-2 text-base">
              {state.verbrauch.letzterTokens > 0 && (
                <p className="flex justify-between gap-4 rounded-lg bg-slate-100 p-3">
                  <span>Letzter Bau</span>
                  <span className="font-bold">
                    {state.verbrauch.letzterTokens.toLocaleString("de-DE")} Tokens
                    {state.verbrauch.letzterEuro && <> · {state.verbrauch.letzterEuro}</>}
                  </span>
                </p>
              )}
              <p className="flex justify-between gap-4 rounded-lg bg-slate-100 p-3">
                <span>Alle Bauten zusammen</span>
                <span className="font-bold">
                  {state.verbrauch.gesamtTokens.toLocaleString("de-DE")} Tokens
                  {state.verbrauch.gesamtEuro && <> · {state.verbrauch.gesamtEuro}</>}
                </span>
              </p>
            </div>
            {state.verbrauch.energie.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  So viel Strom ist das ungefähr
                </p>
                {state.verbrauch.energie.map((zeile, i) => (
                  <p key={zeile} className="text-base">
                    {["🔋", "🚴", "💡"][i] ?? "⚡"} {zeile}
                  </p>
                ))}
              </div>
            )}
            {state.challenge && (
              <p
                className="rounded-lg p-3 text-base font-semibold"
                style={{ background: "var(--s45-accent)", color: "var(--s45-auf-accent)", borderRadius: "var(--s45-radius)" }}
              >
                🏆 Sparsamkeits-Challenge: Ihr seid Platz {state.challenge.platz} von {state.challenge.von}.
                {state.challenge.platz === 1
                  ? " Ihr baut am sparsamsten — weiter so!"
                  : ` Die sparsamste Gruppe liegt bei ${state.challenge.fuehrtTokens.toLocaleString("de-DE")} Tokens.`}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Tokens sind die „Denk-Häppchen" der KI — jedes Bauen kostet Rechenleistung und Strom.
              Der Vergleich ist eine grobe Schätzung. Genaue, gut überlegte Wünsche sparen Tokens:
              erst denken, dann tippen!
            </p>
            <button
              onClick={() => setShowVerbrauch(false)}
              className="w-full py-3 font-bold"
              style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)", borderRadius: "var(--s45-radius)" }}
            >
              Alles klar!
            </button>
          </div>
        </div>
      )}

      {/* Geführter Modus: Checkfragen vor dem Senden */}
      {showCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6">
            <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
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
                className="flex-1 rounded-xl py-3 font-black disabled:opacity-40"
                style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)" }}
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
