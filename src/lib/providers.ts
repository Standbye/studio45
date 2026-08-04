/**
 * Bekannte KI-Anbieter als Startpunkt für den Admin.
 *
 * Studio45 spricht genau zwei Protokolle:
 * - "anthropic": die Messages-API (Prompt-Caching, Streaming für große Antworten)
 * - "openai":    chat/completions — das sprechen OpenAI, OpenRouter, Langdock,
 *                Groq, Together, Azure, Ollama und praktisch jeder Gateway
 *
 * Die Liste ist reine Bequemlichkeit: URL und Modellnamen bleiben frei editierbar,
 * damit neue Dienste und Modelle ohne Code-Änderung nutzbar sind.
 */

export type Protokoll = "anthropic" | "openai";

export type AnbieterVorlage = {
  id: string;
  name: string;
  protocol: Protokoll;
  baseUrl: string; // leer = Standard-Endpunkt des SDK
  hinweis: string;
  modelle: { kinder: string[]; director: string[] };
};

export const ANBIETER: AnbieterVorlage[] = [
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    protocol: "anthropic",
    baseUrl: "",
    hinweis: "Direkt bei Anthropic. Nutzt Prompt-Caching — günstigste Variante für lange Systemprompts.",
    modelle: {
      kinder: ["claude-sonnet-5", "claude-haiku-4-5-20251001"],
      director: ["claude-opus-5", "claude-sonnet-5"],
    },
  },
  {
    id: "openai",
    name: "OpenAI",
    protocol: "openai",
    baseUrl: "https://api.openai.com/v1",
    hinweis: "Modellnamen wie gpt-5 oder gpt-5-mini — genaue Kennung in der OpenAI-Dokumentation prüfen.",
    modelle: { kinder: ["gpt-5-mini", "gpt-5"], director: ["gpt-5"] },
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    hinweis: "Ein Zugang, viele Modelle. Modellnamen im Format anbieter/modell.",
    modelle: {
      kinder: ["anthropic/claude-sonnet-5", "openai/gpt-5-mini", "meta-llama/llama-4-70b-instruct"],
      director: ["anthropic/claude-opus-5", "openai/gpt-5"],
    },
  },
  {
    id: "langdock",
    name: "Langdock",
    protocol: "openai",
    baseUrl: "https://api.langdock.com/openai/eu/v1",
    hinweis: "EU-Hosting. Region in der URL ggf. anpassen (eu/us).",
    modelle: {
      kinder: ["claude-sonnet-5", "gpt-5-mini"],
      director: ["claude-opus-5", "gpt-5"],
    },
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    protocol: "openai",
    baseUrl: "https://<ressource>.openai.azure.com/openai/v1",
    hinweis: "URL der eigenen Ressource eintragen; als Modell den Deployment-Namen verwenden.",
    modelle: { kinder: [], director: [] },
  },
  {
    id: "ollama",
    name: "Ollama / lokal",
    protocol: "openai",
    baseUrl: "http://localhost:11434/v1",
    hinweis: "Lokales Modell ohne Cloud. Achtung: Kleine Modelle liefern selten vollständige Spiele.",
    modelle: { kinder: ["qwen3:14b", "llama3.3"], director: ["qwen3:32b"] },
  },
  {
    id: "custom",
    name: "Anderer Dienst",
    protocol: "openai",
    baseUrl: "",
    hinweis: "Jeder Dienst mit OpenAI-kompatibler chat/completions-Schnittstelle.",
    modelle: { kinder: [], director: [] },
  },
];

export function anbieterVorlage(id: string): AnbieterVorlage | undefined {
  return ANBIETER.find((a) => a.id === id);
}
