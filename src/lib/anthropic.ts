import "server-only";
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
