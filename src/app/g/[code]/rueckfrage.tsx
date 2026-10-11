"use client";

import { Vorlesen } from "./vorlesen";

type Props = {
  wunsch: string;
  frage: string;
  antworten: string[];
  vorlesen: boolean;
  /** Die Gruppe hat eine Antwort angetippt — sie wird an den Wunsch angehängt */
  onAntwort: (antwort: string) => void;
  /** Die Gruppe will es selbst schreiben */
  onSelbst: () => void;
  /** Die Gruppe überlässt es der KI und baut mit dem Wunsch, wie er ist */
  onEgal: () => void;
};

/**
 * Rückfrage statt Textvorschlag: Bei einem kargen Wunsch fragt Studio45 nach dem, was fehlt,
 * und bietet Antworten zum Antippen an. Die Entscheidung bleibt bei der Gruppe.
 */
export function RueckfrageDialog({ wunsch, frage, antworten, vorlesen, onAntwort, onSelbst, onEgal }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-slate-900">
      <div className="max-h-[92svh] w-full max-w-lg space-y-4 overflow-y-auto bg-white p-6" style={{ borderRadius: "var(--s45-radius)" }}>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Euer Wunsch</p>
          <p className="rounded-lg bg-slate-100 p-3 text-sm">{wunsch}</p>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
            🤔 {frage}
          </h2>
          {vorlesen && <Vorlesen text={`${frage} ${antworten.map((a, i) => `Antwort ${i + 1}: ${a}`).join(" ")}`} />}
        </div>
        <div className="space-y-2">
          {antworten.map((a) => (
            <button
              key={a}
              onClick={() => onAntwort(a)}
              className="w-full border-2 p-4 text-left text-base font-semibold"
              style={{ borderColor: "var(--s45-primary-text)", borderRadius: "var(--s45-radius)" }}
            >
              {a}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Tippt an, was zu eurer Idee passt — der Satz kommt zu eurem Wunsch dazu. Ihr entscheidet.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onSelbst}
            className="flex-1 border-2 border-slate-300 py-3 text-sm font-bold text-slate-700"
            style={{ borderRadius: "var(--s45-radius)" }}
          >
            ✏️ Wir schreiben es selbst
          </button>
          <button
            onClick={onEgal}
            className="flex-1 border-2 border-slate-300 py-3 text-sm font-bold text-slate-700"
            style={{ borderRadius: "var(--s45-radius)" }}
          >
            Egal — die KI soll entscheiden
          </button>
        </div>
      </div>
    </div>
  );
}
