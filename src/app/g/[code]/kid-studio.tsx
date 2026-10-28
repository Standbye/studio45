"use client";

import "@fontsource-variable/montserrat";
import { useCallback, useEffect, useRef, useState } from "react";
import { LernfallAnsicht, type LernfallState } from "./lernfall-ansicht";
import { diktatSitzung } from "@/lib/diktat";
import { hinweisGesehen, lokalMoeglich, merkeHinweis, type SprachModus } from "@/lib/sprache";
import { unklareWoerter } from "@/lib/unklar";
import { Vorlesen } from "./vorlesen";
import { FehlerMelden } from "./fehler-melden";
import { RueckfrageDialog } from "./rueckfrage";

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
  hilfen: { chips: boolean; teamCheck: boolean; coachAbZeichen: number; vorlesen: boolean; fehlerMelden: boolean; sprache: SprachModus };
  /** Worauf es heute ankommt — in der Sprache der Altersstufe */
  fokus: { heute: string; teamFrage: string };
  /** Aus dem Steckbrief: was der letzte Bau geändert hat und was die Gruppe testen soll */
  letzterBau: { neu: string[]; ausprobieren: string[] } | null;
  /** Gibt es eine frühere Fassung, zu der die Gruppe zurückgehen kann? */
  kannZurueck: boolean;
  attemptsLeft: number;
  cooldownRemaining: number;
  cooldownSeconds: number;
  generating: boolean;
  laufSekunden: number;
  dauerSchaetzung: number;
  /** Live-Fortschritt des laufenden Baus (vom Server gestreamt) */
  fortschritt: { phase: "plant" | "schreibt" | "prueft" | "repariert"; zeilen: number } | null;
  gameVersion: number;
  verbrauch: {
    gesamtTokens: number;
    letzterTokens: number;
    gesamtIn: number;
    gesamtOut: number;
    letzterIn: number;
    letzterOut: number;
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
    /** Eigene Schrift des Workshop-Designs (z. B. „Vortrag“), sonst die Kinderschrift */
    schrift: string | null;
  };
};

/** Die dritte Frage des Team-Checks kommt aus dem Schwerpunkt des Termins (state.fokus.teamFrage). */
const CHECKFRAGEN = [
  "Habt ihr zusammen besprochen, was sich ändern soll?",
  "Sagt euer Satz WAS passieren soll und WIE es aussehen soll?",
];

const WARTE_SPRUECHE = [
  "Die KI tippt ganz schnell …",
  "Pixel werden gestapelt …",
  "Die Spielfigur bekommt Schuhe an …",
  "Sound-Bleeps werden gestimmt …",
  "Gleich könnt ihr testen!",
];

/** Warum die Spracheingabe nicht klappt — in Worten, die eine Gruppe versteht. */
function sprachFehlerText(fehler: string | undefined): string | null {
  switch (fehler) {
    case "not-allowed":
    case "service-not-allowed":
    case "audio-capture":
      return "🎤 Das Mikrofon ist auf diesem Gerät nicht freigegeben. Erlaubt es in den Einstellungen des Browsers — oder tippt euren Wunsch einfach.";
    case "network":
      return "🎤 Die Spracherkennung ist gerade nicht erreichbar. Tippt euren Wunsch bitte, oder versucht es gleich noch einmal.";
    case "language-not-supported":
      return "🎤 Dieses Gerät kann Deutsch gerade nicht erkennen. Tippt euren Wunsch bitte.";
    case "no-speech":
      return "🎤 Wir haben nichts gehört. Tippt noch einmal aufs Mikrofon und sprecht etwas lauter.";
    default:
      return null; // „aborted“ u. a.: von uns selbst beendet, kein Hinweis nötig
  }
}

/** Tokens getrennt nach Lesen (Eingabe) und Schreiben (Ausgabe) — wie die Spezifikation es verlangt */
function TokenTeile({ gelesen, geschrieben }: { gelesen: number; geschrieben: number }) {
  if (gelesen + geschrieben <= 0) return null;
  return (
    <p className="mt-1 flex justify-between gap-4 text-sm text-slate-500">
      <span>📖 gelesen {gelesen.toLocaleString("de-DE")}</span>
      <span>✍️ geschrieben {geschrieben.toLocaleString("de-DE")}</span>
    </p>
  );
}

/** Fortschritt in Worten: Die Kinder sehen, dass die KI arbeitet — und was gerade passiert. */
function fortschrittText(f: { phase: "plant" | "schreibt" | "prueft" | "repariert"; zeilen: number }): string {
  switch (f.phase) {
    case "plant":
      return "🧠 Die KI plant euer Spiel …";
    case "schreibt":
      return f.zeilen > 0 ? `✍️ Die KI schreibt: ${f.zeilen.toLocaleString("de-DE")} Zeilen` : "✍️ Die KI fängt an zu schreiben …";
    case "prueft":
      return "🔍 Studio45 prüft, ob das Spiel startet …";
    case "repariert":
      return f.zeilen > 0
        ? `🔧 Ein Fehler wird repariert: ${f.zeilen.toLocaleString("de-DE")} Zeilen`
        : "🔧 Das Spiel startete nicht — die KI repariert den Fehler …";
  }
}

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
  // Hinweis vor der ersten Aufnahme über den Sprachdienst des Browsers (einmal pro Gerät)
  const [showSprachHinweis, setShowSprachHinweis] = useState(false);
  const [showHerkunft, setShowHerkunft] = useState(false);
  const [geradeGebaut, setGeradeGebaut] = useState(false);
  const [dcNein, setDcNein] = useState(false);
  const [dcHinweis, setDcHinweis] = useState("");
  const [dcSendet, setDcSendet] = useState(false);
  const [coachGezeigt, setCoachGezeigt] = useState(false);
  const [coachLaeuft, setCoachLaeuft] = useState(false);
  const [rueckfrage, setRueckfrage] = useState<{ frage: string; antworten: string[] } | null>(null);
  const [showFehler, setShowFehler] = useState(false);
  const [zurueckLaeuft, setZurueckLaeuft] = useState(false);
  const [showMehr, setShowMehr] = useState(false);
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

  /** Spracherkennung des Browsers, falls vorhanden */
  function spracherkennung() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }

  async function toggleMic() {
    const SR = spracherkennung();
    if (!SR) {
      setFeedback("Auf diesem Gerät gibt es keine Spracheingabe — tippt euren Wunsch einfach.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const modus = state?.hilfen.sprache ?? "";
    // Erst versuchen, auf dem Gerät zu erkennen — dann verlässt keine Aufnahme das Tablet.
    const lokal = await lokalMoeglich(SR, modus === "lokal");
    if (!lokal && modus === "lokal") {
      setFeedback("Eure Lehrkraft erlaubt die Spracheingabe nur direkt auf dem Gerät. Dieses Gerät kann das gerade nicht — tippt euren Wunsch bitte.");
      return;
    }
    if (!lokal && !hinweisGesehen()) {
      setShowSprachHinweis(true);
      return;
    }
    starteAufnahme(SR, lokal);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function starteAufnahme(SR: any, lokal: boolean) {
    const rec = new SR();
    if (lokal) rec.processLocally = true;
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
    rec.onerror = (e: { error?: string }) => {
      setListening(false);
      const meldung = sprachFehlerText(e.error);
      if (meldung) setFeedback(meldung);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  /** Formulierungshilfe: zeigt eine genauere Fassung des Wunsches zur Auswahl. */
  async function holeCoachVorschlag(): Promise<boolean> {
    if (!state || state.hilfen.coachAbZeichen === 0) return false;
    const roh = text.replace(/⏳.*$/, "").trim();
    // Kurze Wünsche — oder lange mit Wertungen ohne Inhalt („schöner“, „cooler“ …)
    if (roh.length === 0 || (roh.length > state.hilfen.coachAbZeichen && unklareWoerter(roh).length === 0)) return false;
    setCoachLaeuft(true);
    try {
      const res = await fetch(`/api/g/${code}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: roh }),
      });
      if (!res.ok) return false;
      const out = await res.json();
      // Grundschule: Rückfrage mit Antworten zum Antippen; sonst eine genauere Fassung
      if (out.rueckfrage?.frage && Array.isArray(out.rueckfrage.antworten)) {
        setRueckfrage(out.rueckfrage);
        return true;
      }
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
    setRueckfrage(null);
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

  /** Einen Schritt zurück: die Fassung vor dem letzten Bau wiederholen — kostet keinen Versuch. */
  async function einenSchrittZurueck() {
    if (!window.confirm("Wirklich einen Schritt zurück? Dann seht ihr wieder das Spiel von vorher.")) return;
    setZurueckLaeuft(true);
    setGeradeGebaut(false);
    try {
      const res = await fetch(`/api/g/${code}/zurueck`, { method: "POST" });
      const out = await res.json().catch(() => ({}));
      setFeedback(out.ok ? "↩︎ Das ist wieder euer Spiel von vorher." : `💡 ${out.reason ?? "Das hat nicht geklappt."}`);
    } catch {
      setFeedback("💡 Verbindungsproblem — probiert es gleich nochmal.");
    }
    setZurueckLaeuft(false);
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
    fontFamily: state.branding.schrift ?? "var(--font-kind)",
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

  // Die Grenzen in einem Satz — sie stehen direkt am Bau-Knopf, damit niemand rätselt,
  // warum er gerade nicht geht.
  const pauseText = `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`;
  const versuche = `Noch ${state.attemptsLeft} ${state.attemptsLeft === 1 ? "Versuch" : "Versuche"}`;
  const grenze = state.locked
    ? { warnung: true, text: "🔒 Eure Gruppe ist gerade gesperrt — fragt eure Lehrkraft." }
    : state.attemptsLeft <= 0
      ? { warnung: true, text: "Keine Versuche mehr in dieser Stunde — eure Lehrkraft kann nachladen." }
      : cooldown > 0
        ? { warnung: true, text: `⏸ Denkpause ${pauseText} — testet euer Spiel. ${versuche}.` }
        : { warnung: false, text: `${versuche} in dieser Stunde` };

  // Nach dem Bau reicht eine Karte: das Wichtigste in je einer Zeile, der Rest im Dialog.
  const kiErgaenzt = state.herkunft?.ki.length ?? 0;
  const nachBau =
    state.letzterBau || kiErgaenzt > 0
      ? {
          neu: state.letzterBau?.neu[0] ?? "",
          probiert: state.letzterBau?.ausprobieren[0] ?? "",
          kiAnzahl: kiErgaenzt,
          vorlesen: [
            state.letzterBau?.neu.length ? `Das ist neu: ${state.letzterBau.neu.join(". ")}.` : "",
            state.letzterBau?.ausprobieren.length ? `Probiert das aus: ${state.letzterBau.ausprobieren.join(". ")}.` : "",
            kiErgaenzt > 0 ? `Das hat die KI von sich aus ergänzt: ${state.herkunft?.ki.join(". ")}.` : "",
          ]
            .filter(Boolean)
            .join(" "),
        }
      : null;

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
          <span className="mb-1 block text-sm uppercase tracking-widest opacity-80">Heute: {state.dayTitle}</span>
          <span className="mb-4 block text-lg">{state.fokus.heute}</span>
          <span className="mb-1 block text-sm uppercase tracking-widest opacity-80">Merksatz</span>
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
            {/* Was die KI gerade tut — live vom Server, nicht geschätzt */}
            {state.fortschritt && (
              <p className="text-center text-base font-semibold" aria-live="polite">
                {fortschrittText(state.fortschritt)}
              </p>
            )}
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

      {/* Bedienung — bewusst knapp: Thema, Eingabe, Grenzen. Alles Weitere liegt unter „Mehr". */}
      <footer className="space-y-2 border-t bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:max-h-[58svh] max-lg:overflow-y-auto lg:flex lg:w-[23rem] lg:shrink-0 lg:flex-col lg:space-y-3 lg:overflow-hidden lg:border-l lg:border-t-0 lg:p-4 xl:w-[26rem]">
        {/* Hinweise oben scrollen für sich — die Eingabe darunter bleibt immer sichtbar */}
        <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {/* Worauf es heute ankommt */}
          <div className="flex items-start gap-2 border-2 px-3 py-2" style={{ borderColor: "var(--s45-primary-text)", borderRadius: "var(--s45-radius)" }}>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide" style={{ color: "var(--s45-primary-text)" }}>
                🎯 Heute: {state.dayTitle}
              </p>
              <p className="text-sm font-semibold">{state.fokus.heute}</p>
            </div>
            {state.hilfen.vorlesen && <Vorlesen text={`Heute: ${state.dayTitle}. ${state.fokus.heute}`} />}
          </div>
          {feedback && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              <p className="flex-1">{feedback}</p>
              {state.hilfen.vorlesen && <Vorlesen text={feedback.replace(/^[^\p{L}]+/u, "")} />}
            </div>
          )}
          {/* Nach dem Bau, in einer Karte: was neu ist, was zu testen ist, was die KI ergänzt hat */}
          {geradeGebaut && nachBau && (
            <div className="flex items-start gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              <div className="min-w-0 flex-1 space-y-0.5">
                {nachBau.neu && (
                  <p>
                    <b>✨ Neu:</b> {nachBau.neu}
                  </p>
                )}
                {nachBau.probiert && (
                  <p>
                    <b>🕹️ Probiert:</b> {nachBau.probiert}
                  </p>
                )}
                <button onClick={() => setShowHerkunft(true)} className="font-semibold underline underline-offset-2">
                  {nachBau.kiAnzahl > 0
                    ? `Die KI hat ${nachBau.kiAnzahl === 1 ? "eine Sache" : `${nachBau.kiAnzahl} Sachen`} ergänzt — ansehen`
                    : "Alles ansehen"}
                </button>
              </div>
              {state.hilfen.vorlesen && <Vorlesen text={nachBau.vorlesen} />}
            </div>
          )}
        </div>

        {/* Satzanfänge passend zum Thema — eine Zeile, zur Seite wischbar */}
        {state.hilfen.chips && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {state.hilfen.vorlesen && <Vorlesen text={`So könnt ihr anfangen: ${state.chips.join(". ")}.`} />}
            {state.chips.map((chip) => (
              <button
                key={chip}
                onClick={() => setText((t) => (t ? t.replace(/⏳.*$/, "").trim() + " — " + chip : chip))}
                disabled={baut}
                className="whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
                style={{ borderColor: "var(--s45-primary-text)", color: "var(--s45-primary-text)" }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 lg:flex-wrap">
          {state.hilfen.sprache !== "aus" && (
          <button
            onClick={() => void toggleMic()}
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
          )}
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
            className="flex-1 resize-none border-2 border-slate-200 p-3 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 min-h-[var(--s45-knopf)] lg:order-first lg:min-h-32 lg:basis-full"
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
            {baut || coachLaeuft ? "…" : cooldown > 0 ? `⏸ ${pauseText}` : state.texte.bauKnopf}
          </button>
        </div>

        {/* Die Grenzen stehen direkt am Bau-Knopf: Versuche, Denkpause, Sperre */}
        <p
          role="status"
          className={`rounded-lg px-3 py-1.5 text-center text-sm font-bold ${grenze.warnung ? "" : "bg-slate-100 text-slate-700"}`}
          style={grenze.warnung ? { background: "var(--s45-primary)", color: "var(--s45-auf-primary)" } : undefined}
        >
          {grenze.text}
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {state.gameVersion > 0 && state.hilfen.fehlerMelden && (
            <button
              onClick={() => setShowFehler(true)}
              disabled={baut}
              className="rounded-full border-2 border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              🐞 Etwas geht nicht
            </button>
          )}
          <button
            onClick={() => setShowMehr(true)}
            className="rounded-full border-2 border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            ⋯ Mehr
          </button>
        </div>
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

      {/* Rückfrage statt Textvorschlag (Grundschule): antippen, was zur eigenen Idee passt */}
      {rueckfrage && (
        <RueckfrageDialog
          wunsch={promptText}
          frage={rueckfrage.frage}
          antworten={rueckfrage.antworten}
          vorlesen={state.hilfen.vorlesen}
          onAntwort={(antwort) => {
            setText(`${promptText.replace(/[\s—-]+$/, "")}${/[.!?…]$/.test(promptText.trim()) ? "" : "."} ${antwort}`);
            setRueckfrage(null);
            setCoachGezeigt(true);
            setFeedback("👍 Euer Wunsch ist jetzt genauer. Lest ihn noch einmal — dann drückt auf Bauen.");
          }}
          onSelbst={() => {
            setRueckfrage(null);
            setCoachGezeigt(true);
          }}
          onEgal={() => {
            setRueckfrage(null);
            setCoachGezeigt(true);
            void submit();
          }}
        />
      )}

      {showFehler && (
        <FehlerMelden
          vorlesen={state.hilfen.vorlesen}
          onZu={() => setShowFehler(false)}
          onFertig={(wunsch) => {
            setText(wunsch);
            setShowFehler(false);
            setCoachGezeigt(true); // der Wunsch ist schon genau — keine Rückfrage obendrauf
            setFeedback("🐞 Eure Fehlermeldung steht im Wunsch. Lest sie noch einmal — dann drückt auf Bauen.");
          }}
        />
      )}

      {directorCutDialog}

      {/* Wer hat was entschieden? Die Gruppe soll sagen können, welche Idee ihre eigene ist. */}
      {showHerkunft && (state.herkunft || state.letzterBau) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92svh] w-full max-w-lg space-y-4 overflow-y-auto bg-white p-6" style={{ borderRadius: "var(--s45-radius)" }}>
            <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
              🧩 Unser Spiel: neu, von uns, von der KI
            </h2>
            {state.letzterBau && (
              <div className="space-y-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3 text-base text-emerald-950">
                {state.letzterBau.neu.length > 0 && (
                  <div>
                    <p className="font-black">✨ Das ist neu</p>
                    <ul className="list-disc pl-5">
                      {state.letzterBau.neu.map((z) => (
                        <li key={z}>{z}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {state.letzterBau.ausprobieren.length > 0 && (
                  <div>
                    <p className="font-black">🕹️ Probiert das aus</p>
                    <ul className="list-disc pl-5">
                      {state.letzterBau.ausprobieren.map((z) => (
                        <li key={z}>{z}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {state.herkunft && (
            <>
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
            </>
            )}
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

      {/* „Mehr": was nicht ständig gebraucht wird, liegt hier — die Bedienspalte bleibt knapp */}
      {showMehr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-slate-900" onClick={() => setShowMehr(false)}>
          <div className="max-h-[92svh] w-full max-w-md space-y-3 overflow-y-auto bg-white p-6" style={{ borderRadius: "var(--s45-radius)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
              Mehr
            </h2>
            <div className="flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-base">
              <p className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Merksatz</span>
                „{state.motto}“
                {state.hilfen.chips && <span className="mt-1 block text-sm text-slate-600">{state.texte.tipp}</span>}
              </p>
              {state.hilfen.vorlesen && <Vorlesen text={`Merksatz: ${state.motto}`} />}
            </div>
            {(state.herkunft || state.letzterBau) && (
              <button
                onClick={() => {
                  setShowMehr(false);
                  setShowHerkunft(true);
                }}
                className="w-full border-2 border-slate-200 p-3 text-left text-base font-semibold"
                style={{ borderRadius: "var(--s45-radius)" }}
              >
                🧩 Was ist neu — was kam von uns, was von der KI?
              </button>
            )}
            {state.kannZurueck && (
              <button
                onClick={() => {
                  setShowMehr(false);
                  void einenSchrittZurueck();
                }}
                disabled={baut || zurueckLaeuft || state.locked}
                className="w-full border-2 border-slate-200 p-3 text-left text-base font-semibold disabled:opacity-40"
                style={{ borderRadius: "var(--s45-radius)" }}
              >
                ↩︎ Einen Schritt zurück
                <span className="block text-sm font-normal text-slate-500">Holt das Spiel von vor dem letzten Bau zurück. Kostet keinen Versuch.</span>
              </button>
            )}
            {state.verbrauch.gesamtTokens > 0 && (
              <button
                onClick={() => {
                  setShowMehr(false);
                  setShowVerbrauch(true);
                }}
                className="w-full border-2 border-slate-200 p-3 text-left text-base font-semibold"
                style={{ borderRadius: "var(--s45-radius)" }}
              >
                ⚡ Was verbraucht unser Bauen?
                <span className="block text-sm font-normal text-slate-500">
                  Bisher {state.verbrauch.gesamtTokens.toLocaleString("de-DE")} Tokens
                  {state.verbrauch.gesamtEuro && <> ({state.verbrauch.gesamtEuro})</>}
                  {state.challenge && <> · 🏆 Platz {state.challenge.platz} von {state.challenge.von}</>}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowMehr(false)}
              className="w-full py-3 font-bold"
              style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)", borderRadius: "var(--s45-radius)" }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Hinweis vor der ersten Aufnahme, wenn die Erkennung nicht auf dem Gerät läuft */}
      {showSprachHinweis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 bg-white p-6" style={{ borderRadius: "var(--s45-radius)" }}>
            <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
              🎤 Kurz zur Spracheingabe
            </h2>
            <p className="text-base">
              Damit aus eurer Stimme Text wird, schickt dieser Browser das Gesprochene an Google oder Apple.
              Sagt deshalb <b>keine Namen und nichts Privates</b> — nur euren Wunsch für das Spiel.
            </p>
            <p className="text-sm text-slate-500">Wer das nicht möchte, tippt einfach. Studio45 speichert keine Aufnahmen.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSprachHinweis(false)}
                className="flex-1 border-2 border-slate-300 py-3 font-bold text-slate-600"
                style={{ borderRadius: "var(--s45-radius)" }}
              >
                Lieber tippen
              </button>
              <button
                onClick={() => {
                  merkeHinweis();
                  setShowSprachHinweis(false);
                  const SR = spracherkennung();
                  if (SR) starteAufnahme(SR, false);
                }}
                className="flex-1 py-3 font-bold"
                style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)", borderRadius: "var(--s45-radius)" }}
              >
                Verstanden, sprechen
              </button>
            </div>
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
                <div className="rounded-lg bg-slate-100 p-3">
                  <p className="flex justify-between gap-4">
                    <span>Letzter Bau</span>
                    <span className="font-bold">
                      {state.verbrauch.letzterTokens.toLocaleString("de-DE")} Tokens
                      {state.verbrauch.letzterEuro && <> · {state.verbrauch.letzterEuro}</>}
                    </span>
                  </p>
                  <TokenTeile gelesen={state.verbrauch.letzterIn} geschrieben={state.verbrauch.letzterOut} />
                </div>
              )}
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="flex justify-between gap-4">
                  <span>Alle Bauten zusammen</span>
                  <span className="font-bold">
                    {state.verbrauch.gesamtTokens.toLocaleString("de-DE")} Tokens
                    {state.verbrauch.gesamtEuro && <> · {state.verbrauch.gesamtEuro}</>}
                  </span>
                </p>
                <TokenTeile gelesen={state.verbrauch.gesamtIn} geschrieben={state.verbrauch.gesamtOut} />
              </div>
            </div>
            {state.verbrauch.energie.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  So viel Strom ist das ungefähr
                </p>
                {state.verbrauch.energie.map((zeile, i) => (
                  <p key={zeile} className="text-base">
                    {["🔋", "🚴", "🪜", "💡"][i] ?? "⚡"} {zeile}
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
              Gelesen hat die KI euren Wunsch, ihre Anweisungen und das bisherige Spiel; geschrieben hat sie das neue Spiel.
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
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
                Kurzer Team-Check ✋
              </h2>
              {state.hilfen.vorlesen && <Vorlesen text={[...CHECKFRAGEN, state.fokus.teamFrage].join(" ")} />}
            </div>
            {[...CHECKFRAGEN, state.fokus.teamFrage].map((frage, i) => (
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
