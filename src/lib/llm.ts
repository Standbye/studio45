import "server-only";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { kernPrompt, systemTeile, type PromptKontext } from "@/lib/prompts";
import { alterProfil } from "@/lib/audience";
import type { AgeGroup } from "@/generated/prisma/enums";
import type { Protokoll } from "@/lib/providers";

const MAX_TOKENS = 32000; // Lehre aus dem Piloten: 8k schneidet Spiele mitten im Script ab

/** Zugangsdaten einer vom Admin gepflegten Verbindung. */
export type Verbindung = {
  protocol: string;
  secret: string;
  baseUrl: string;
};

export type LlmAntwort = {
  text: string;
  tokensIn: number;
  tokensOut: number;
  error?: string;
};

export type BuildResult = {
  html: string | null;
  tokensIn: number;
  tokensOut: number;
  error?: string;
};

/**
 * Ein Aufruf, zwei Protokolle. Systemanweisungen kommen als Liste, damit das
 * Anthropic-Protokoll den langen Basis-Prompt zwischenspeichern kann; für das
 * OpenAI-Protokoll werden sie zu einer System-Nachricht zusammengefügt.
 */
async function rufeModell(
  v: Verbindung,
  model: string,
  anweisungen: string[],
  userMsg: string,
  maxTokens: number
): Promise<LlmAntwort> {
  const protokoll: Protokoll = v.protocol === "openai" ? "openai" : "anthropic";
  try {
    if (protokoll === "anthropic") {
      const client = new Anthropic({
        apiKey: v.secret,
        ...(v.baseUrl ? { baseURL: v.baseUrl } : {}),
      });
      const system: Anthropic.TextBlockParam[] = anweisungen.map((text, i) => ({
        type: "text",
        text,
        // Nur der erste (lange, immer gleiche) Block profitiert vom Caching
        ...(i === 0 ? { cache_control: { type: "ephemeral" as const } } : {}),
      }));
      // Streaming ist bei großen max_tokens Pflicht (sonst lehnt die API ab)
      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMsg }],
      });
      const msg = await stream.finalMessage();
      return {
        text: msg.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join(""),
        tokensIn: msg.usage.input_tokens,
        tokensOut: msg.usage.output_tokens,
      };
    }

    const client = new OpenAI({
      apiKey: v.secret,
      ...(v.baseUrl ? { baseURL: v.baseUrl } : {}),
      maxRetries: 1,
    });
    // Auch hier streamen: manche Gateways kappen lange stille Verbindungen
    const stream = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: anweisungen.join("\n\n") },
        { role: "user", content: userMsg },
      ],
    });
    let text = "";
    let tokensIn = 0;
    let tokensOut = 0;
    for await (const teil of stream) {
      text += teil.choices?.[0]?.delta?.content ?? "";
      if (teil.usage) {
        tokensIn = teil.usage.prompt_tokens ?? 0;
        tokensOut = teil.usage.completion_tokens ?? 0;
      }
    }
    return { text, tokensIn, tokensOut };
  } catch (err) {
    return { text: "", tokensIn: 0, tokensOut: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

function extractHtml(text: string): string | null {
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  const html = (fence ? fence[1] : text).trim();
  if (html.toLowerCase().includes("<!doctype html") && html.toLowerCase().includes("</html>")) {
    return html;
  }
  return null;
}

/** Kurzer Testaufruf, um eine Verbindung im Admin zu prüfen. */
export async function testeVerbindung(v: Verbindung, model: string): Promise<{ ok: boolean; detail: string }> {
  const antwort = await rufeModell(
    v,
    model,
    ["Du antwortest extrem knapp."],
    "Antworte mit genau einem Wort: bereit",
    64
  );
  if (antwort.error) return { ok: false, detail: antwort.error.slice(0, 300) };
  const text = antwort.text.trim().slice(0, 80);
  if (!text) return { ok: false, detail: "Leere Antwort vom Dienst." };
  return { ok: true, detail: `Antwort: „${text}" (${antwort.tokensIn + antwort.tokensOut} Tokens)` };
}

// ---------------------------------------------------------------------------
// Spiel bauen / ändern (Kinder)
// ---------------------------------------------------------------------------

export type BuildParams = {
  verbindung: Verbindung;
  model: string;
  currentHtml: string | null;
  userPrompt: string;
  studioName: string;
  /** Altersstufe, Unterstützungslevel, Lernziel, eigene Fassung, Tag */
  kontext: PromptKontext;
};

export async function buildOrEditGame(p: BuildParams): Promise<BuildResult> {
  const teile = systemTeile(p.kontext);

  const stand = p.currentHtml
    ? `## Aktueller Stand des Spiels\n\n\`\`\`html\n${p.currentHtml}\n\`\`\`\n\nBewahre alles, was nicht ausdrücklich geändert werden soll. Steht oben ein STUDIO45-Steckbrief, halte dich an ihn und schreibe ihn fort.`
    : `## Aktueller Stand des Spiels\n\nEs gibt noch KEIN Spiel — das ist der allererste Wunsch. Baue eine erste, vollständig spielbare Version und lege den STUDIO45-Steckbrief an.`;
  const userMsg = `${stand}\n\n## Wunsch des Studios „${p.studioName || "?"}"\n\n${p.userPrompt.trim()}`;

  const antwort = await rufeModell(p.verbindung, p.model, teile, userMsg, MAX_TOKENS);
  if (antwort.error) return { html: null, tokensIn: 0, tokensOut: 0, error: antwort.error };
  const html = extractHtml(antwort.text);
  return {
    html,
    tokensIn: antwort.tokensIn,
    tokensOut: antwort.tokensOut,
    ...(html ? {} : { error: "Die Antwort enthielt kein vollständiges HTML." }),
  };
}

// ---------------------------------------------------------------------------
// Prompt-Coach: aus einem kargen Wunsch eine brauchbare Anforderung machen
// ---------------------------------------------------------------------------

export type CoachParams = {
  verbindung: Verbindung;
  model: string;
  wunsch: string;
  currentHtml: string | null;
  studioName: string;
  ageGroup: AgeGroup;
  learningGoal: string;
};

/**
 * Schlägt eine ausformulierte Fassung des Wunsches vor.
 *
 * Didaktisch der stärkste Hebel: Die Klasse sieht am eigenen Beispiel, wie ein
 * präziser Auftrag klingt — und entscheidet selbst, ob sie ihn übernimmt.
 */
export async function coachWunsch(p: CoachParams): Promise<{ vorschlag: string; tokensIn: number; tokensOut: number; error?: string }> {
  const alter = alterProfil(p.ageGroup);
  const steckbrief = p.currentHtml?.match(/<!--\s*STUDIO45([\s\S]{0,1200}?)-->/)?.[1]?.trim();

  const system = `Du hilfst einer Schulklasse (${alter.name}, ${alter.klassen}), ihren Wunsch an eine spielebauende KI genauer zu formulieren.

Du baust NICHTS. Du schreibst nur den Wunsch besser auf.

Regeln:
- Bleibe strikt bei der Idee der Klasse. Erfinde kein anderes Spiel und kein anderes Thema.
- Ergänze das, was offensichtlich fehlt, damit die KI nicht raten muss: WAS passiert, WIE es
  aussieht, WANN man gewinnt oder verliert.
- Höchstens drei kurze Sätze, Sprache der Zielgruppe, keine Fachbegriffe.
- Schreibe aus Sicht der Klasse („Wir wollen …").
- Keine Einleitung, keine Erklärung, keine Anführungszeichen — nur der verbesserte Wunsch.${
    p.learningGoal.trim() ? `\n- Das Spiel soll außerdem zu diesem Lernziel passen: ${p.learningGoal.trim()}` : ""
  }`;

  const userMsg = [
    steckbrief ? `So sieht das bisherige Spiel aus:\n${steckbrief}` : "Es gibt noch kein Spiel.",
    `\n\nDas hat das Studio „${p.studioName}" gesagt:\n${p.wunsch.trim()}`,
  ].join("");

  const antwort = await rufeModell(p.verbindung, p.model, [system], userMsg, 500);
  if (antwort.error) return { vorschlag: "", tokensIn: 0, tokensOut: 0, error: antwort.error };
  return {
    vorschlag: antwort.text.trim().replace(/^["„]|["“]$/g, ""),
    tokensIn: antwort.tokensIn,
    tokensOut: antwort.tokensOut,
  };
}

// ---------------------------------------------------------------------------
// Director's Cut
// ---------------------------------------------------------------------------

export type DistillParams = {
  verbindung: Verbindung;
  model: string;
  studioName: string;
  prompts: string[];
  learningGoal: string;
};

export async function distillSpec(
  p: DistillParams
): Promise<{ spec: string; tokensIn: number; tokensOut: number; error?: string }> {
  const system = [
    "Du hilfst einer Lehrkraft, aus den gesammelten Spiel-Wünschen einer Kindergruppe (Grundschule) eine klare, kohärente Spielspezifikation zu schreiben.",
    "Die Kinder haben über mehrere Runden per Sprache Wünsche geäußert — mit Tippfehlern, Widersprüchen, abgeschnittenen Sätzen.",
    "Schreibe daraus EINE zusammenhängende Spezifikation in 6–12 kurzen deutschen Sätzen:",
    "- interpretiere Sprach-/Tippfehler sinnvoll,",
    "- löse Widersprüche zugunsten der spezifischeren/späteren Angabe,",
    "- ersetze geschützte Marken/Songs durch eigene Pendants,",
    "- benenne klar: Titel-Idee, Setting, Kern-Spielmechanik, Steuerung (Touch), das Lernfach und wie die Aufgaben eingebaut sind, Schwierigkeit/Progression, visueller Stil.",
    p.learningGoal.trim() ? `\nLernziel der Lehrkraft: ${p.learningGoal.trim()}` : "",
    "\nGib NUR die Spezifikation als Fließtext aus, keine Aufzählungszeichen, keine Vorrede.",
  ].join("\n");

  const userMsg = [
    `Studio: ${p.studioName}`,
    `\n\nAlle Wünsche der Kinder (chronologisch):`,
    ...p.prompts.map((t, i) => `\n${i + 1}. ${t}`),
  ].join("");

  const antwort = await rufeModell(p.verbindung, p.model, [system], userMsg, 4000);
  if (antwort.error) return { spec: "", tokensIn: 0, tokensOut: 0, error: antwort.error };
  return { spec: antwort.text.trim(), tokensIn: antwort.tokensIn, tokensOut: antwort.tokensOut };
}

export type DirectorParams = {
  verbindung: Verbindung;
  model: string;
  studioName: string;
  spec: string;
  learningGoal: string;
  engine3d: boolean;
};

/** Three.js lokal einbetten — die Spiele dürfen keine externen Requests machen. */
export function injectThreeJs(html: string): string {
  const file = path.join(process.cwd(), "vendor", "three.min.js");
  if (!fs.existsSync(file)) return html;
  const lib = fs.readFileSync(file, "utf8");
  const tag = `<script>\n${lib}\n</script>\n`;
  return html.includes("</head>")
    ? html.replace("</head>", `${tag}</head>`)
    : html.replace(/<body[^>]*>/i, (m) => `${m}\n${tag}`);
}

export async function buildFromSpec(p: DirectorParams): Promise<BuildResult> {
  const directorBlock = `## Director's Cut — Gesamtvision umsetzen

Du bekommst die GESAMMELTE Vision der Kinder als kohärente Spezifikation. Baue daraus EIN vollständiges, in sich stimmiges, sofort spielbares Spiel — komplett neu, nicht iterativ.

Regeln:
- Setze ALLE genannten Elemente um, soweit sie zusammenpassen.
- Löse Widersprüche zugunsten der spezifischeren/späteren Angabe.
- Ersetze geschützte Marken, Charakternamen oder Songs durch eigene, ähnliche Pendants — niemals echte Marken nennen.
- Die Lernaufgaben sind PFLICHT und gehören zum Spielfortschritt (Gate/Belohnung), mit großen Touch-Buttons und sofortigem Feedback.
- VOLLSTÄNDIGKEIT vor Umfang: Das Spiel muss von "Start" bis Spielende ohne Lücken funktionieren. Lieber kompakter und fehlerfrei als groß und abgeschnitten.
- Erfolgserlebnis einbauen: Startbildschirm mit Studio-Name, sichtbarer Fortschritt, Konfetti/Fanfare beim Sieg, Abschluss-Bildschirm.
- iPad/Touch zuerst: große Flächen, klare Steuerung.`;

  const engineBlock = p.engine3d
    ? `## 3D-Modus mit Three.js (PFLICHT)

Die Bibliothek **Three.js (r128)** ist bereits geladen und global als \`THREE\` verfügbar.
- Lade Three.js NICHT selbst — kein \`import\`, kein \`<script src=...>\`, kein CDN.
- Echtes 3D mit \`THREE.WebGLRenderer\`, \`THREE.Scene\`, \`THREE.PerspectiveCamera\`; Renderer auf Fenstergröße, Resize beachten.
- **Third-Person-Kamera** schräg hinter einer sichtbaren Spielfigur aus Grundformen — die Kinder wollen ihre Figur sehen.
- Welt aus kräftig gefärbten Quadern/Flächen, klarer Comic-Look, performant auf iPad.
- Licht: \`THREE.HemisphereLight\` + \`THREE.DirectionalLight\` genügen.
- **Touch-Steuerung** (kein Keyboard): virtueller Joystick als HTML-Overlay oder Tippen-wohin-laufen.
- Lernaufgaben als HTML-Overlay ÜBER dem Canvas, nicht in der 3D-Szene.`
    : "";

  const teile = [kernPrompt(), directorBlock];
  if (engineBlock) teile.push(engineBlock);
  if (p.learningGoal.trim()) {
    teile.push(`## Lernziel der Lehrkraft (PFLICHT im Spiel)\n\n${p.learningGoal.trim()}`);
  }

  const userMsg = [
    `Studio: ${p.studioName}`,
    `\n\nGesamtspezifikation (aus allen Wünschen der Kinder destilliert):\n\n${p.spec.trim()}`,
    p.engine3d
      ? `\n\nBaue daraus die KOMPLETTE HTML-Datei mit echtem 3D (THREE ist global geladen — NICHT selbst einbinden). Eine einzige Datei, CSS+JS inline, in genau einem \`\`\`html ... \`\`\`-Block. Keine Erklärungen.`
      : `\n\nBaue daraus die KOMPLETTE HTML-Datei (eine Datei, HTML+CSS+JS inline), in genau einem \`\`\`html ... \`\`\`-Block. Keine Erklärungen.`,
  ].join("");

  const antwort = await rufeModell(p.verbindung, p.model, teile, userMsg, MAX_TOKENS);
  if (antwort.error) return { html: null, tokensIn: 0, tokensOut: 0, error: antwort.error };
  let html = extractHtml(antwort.text);
  if (html && p.engine3d) html = injectThreeJs(html);
  return {
    html,
    tokensIn: antwort.tokensIn,
    tokensOut: antwort.tokensOut,
    ...(html ? {} : { error: "Die Antwort enthielt kein vollständiges HTML." }),
  };
}
