import "server-only";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { gameBuilderPrompt, dayFocusPrompt } from "@/lib/prompts";

const MAX_TOKENS = 32000; // Lehre aus dem Piloten: 8k schneidet Spiele mitten im Script ab

export type BuildResult = {
  html: string | null;
  tokensIn: number;
  tokensOut: number;
  error?: string;
};

export type BuildParams = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  currentHtml: string | null;
  userPrompt: string;
  day: number;
  totalDays: number;
  studioName: string;
  learningGoal: string;
};

function extractHtml(text: string): string | null {
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  const html = fence ? fence[1].trim() : null;
  if (html && html.toLowerCase().includes("<!doctype html") && html.toLowerCase().includes("</html>")) {
    return html;
  }
  return null;
}

export async function buildOrEditGame(p: BuildParams): Promise<BuildResult> {
  const client = new Anthropic({
    apiKey: p.apiKey,
    ...(p.baseUrl ? { baseURL: p.baseUrl } : {}),
  });

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: gameBuilderPrompt(), cache_control: { type: "ephemeral" } },
    { type: "text", text: `## Tagesfokus (Tag ${p.day} von ${p.totalDays})\n\n${dayFocusPrompt(p.day, p.totalDays)}` },
  ];
  if (p.learningGoal.trim()) {
    system.push({
      type: "text",
      text: `## Lernziel der Lehrkraft (in das Spiel einbauen!)\n\n${p.learningGoal.trim()}\n\nDas Spiel ist ein LERNSPIEL: Baue Aufgaben zu diesem Lernziel sinnvoll in die Spielmechanik ein (z. B. als Fragen, Hindernisse, Schlüssel). Kindgerecht für die angegebene Klassenstufe.`,
    });
  }

  const stand = p.currentHtml
    ? `## Aktueller Stand des Spiels\n\n\`\`\`html\n${p.currentHtml}\n\`\`\``
    : `## Aktueller Stand des Spiels\n\nEs gibt noch KEIN Spiel — das ist der allererste Wunsch. Baue eine erste Version.`;

  const userMsg = `${stand}\n\n## Wunsch der Kinder (Studio „${p.studioName || "?"}")\n\n${p.userPrompt.trim()}`;

  try {
    const stream = client.messages.stream({
      model: p.model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const msg = await stream.finalMessage();
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const html = extractHtml(text);
    return {
      html,
      tokensIn: msg.usage.input_tokens,
      tokensOut: msg.usage.output_tokens,
      ...(html ? {} : { error: "Die Antwort enthielt kein vollständiges HTML." }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { html: null, tokensIn: 0, tokensOut: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// Director's Cut: alle Wünsche einer Gruppe zu EINER Spezifikation destillieren
// und daraus ein vollständiges Spiel bauen.
// ---------------------------------------------------------------------------

export type DistillParams = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  studioName: string;
  prompts: string[];
  learningGoal: string;
};

export async function distillSpec(p: DistillParams): Promise<{ spec: string; tokensIn: number; tokensOut: number; error?: string }> {
  const client = new Anthropic({ apiKey: p.apiKey, ...(p.baseUrl ? { baseURL: p.baseUrl } : {}) });
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

  try {
    const stream = client.messages.stream({
      model: p.model,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const msg = await stream.finalMessage();
    const spec = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return { spec, tokensIn: msg.usage.input_tokens, tokensOut: msg.usage.output_tokens };
  } catch (err) {
    return { spec: "", tokensIn: 0, tokensOut: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

export type DirectorParams = {
  apiKey: string;
  baseUrl?: string;
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
  const client = new Anthropic({ apiKey: p.apiKey, ...(p.baseUrl ? { baseURL: p.baseUrl } : {}) });

  const directorBlock = `\n\n## Director's Cut — Gesamtvision umsetzen

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
    ? `\n\n## 3D-Modus mit Three.js (PFLICHT)

Die Bibliothek **Three.js (r128)** ist bereits geladen und global als \`THREE\` verfügbar.
- Lade Three.js NICHT selbst — kein \`import\`, kein \`<script src=...>\`, kein CDN.
- Echtes 3D mit \`THREE.WebGLRenderer\`, \`THREE.Scene\`, \`THREE.PerspectiveCamera\`; Renderer auf Fenstergröße, Resize beachten.
- **Third-Person-Kamera** schräg hinter einer sichtbaren Spielfigur aus Grundformen — die Kinder wollen ihre Figur sehen.
- Welt aus kräftig gefärbten Quadern/Flächen, klarer Comic-Look, performant auf iPad.
- Licht: \`THREE.HemisphereLight\` + \`THREE.DirectionalLight\` genügen.
- **Touch-Steuerung** (kein Keyboard): virtueller Joystick als HTML-Overlay oder Tippen-wohin-laufen.
- Lernaufgaben als HTML-Overlay ÜBER dem Canvas, nicht in der 3D-Szene.`
    : "";

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: gameBuilderPrompt(), cache_control: { type: "ephemeral" } },
    { type: "text", text: directorBlock + engineBlock },
  ];
  if (p.learningGoal.trim()) {
    system.push({ type: "text", text: `## Lernziel der Lehrkraft (PFLICHT im Spiel)\n\n${p.learningGoal.trim()}` });
  }

  const userMsg = [
    `Studio: ${p.studioName}`,
    `\n\nGesamtspezifikation (aus allen Wünschen der Kinder destilliert):\n\n${p.spec.trim()}`,
    p.engine3d
      ? `\n\nBaue daraus die KOMPLETTE HTML-Datei mit echtem 3D (THREE ist global geladen — NICHT selbst einbinden). Eine einzige Datei, CSS+JS inline, in genau einem \`\`\`html ... \`\`\`-Block. Keine Erklärungen.`
      : `\n\nBaue daraus die KOMPLETTE HTML-Datei (eine Datei, HTML+CSS+JS inline), in genau einem \`\`\`html ... \`\`\`-Block. Keine Erklärungen.`,
  ].join("");

  try {
    const stream = client.messages.stream({
      model: p.model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const msg = await stream.finalMessage();
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    let html = extractHtml(text);
    if (html && p.engine3d) html = injectThreeJs(html);
    return {
      html,
      tokensIn: msg.usage.input_tokens,
      tokensOut: msg.usage.output_tokens,
      ...(html ? {} : { error: "Die Antwort enthielt kein vollständiges HTML." }),
    };
  } catch (err) {
    return { html: null, tokensIn: 0, tokensOut: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
