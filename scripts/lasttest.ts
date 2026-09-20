// Lasttest-Treiber: simuliert einen kompletten Workshop gegen einen laufenden
// Server — N Tablets mit je eigenem Gerätecookie, die wie die Kinder-App alle
// 4 s den Zustand abfragen, gleichzeitig bauen lassen und ihr Spiel abrufen.
//
// Aufruf:
//   npx tsx scripts/lasttest.ts --basis https://studio45.littleproject.de --codes lasttest-codes.json
// Optionen:
//   --runden N       Bau-Runden (1)          --pause S     Pause zwischen Runden (10)
//   --gleichzeitig   alle exakt zugleich statt gestaffelt über 0–8 s
//   --ssh HOST       misst per `ssh HOST docker stats` CPU/Speicher des Containers
//   --slug NAME      Beamer-Seite mitpollen (lasttest)   --wunsch TEXT   ein Wunsch für alle
//
// Die Codes liefert runtime/lasttest-seed.mjs. Der Test kostet nichts, solange der
// Workshop am Mock-Anbieter hängt (docker-compose.lasttest.yml).
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const schlafe = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Optionen
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name: string, standard: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : standard;
};
const BASIS = opt("--basis", "http://localhost:3020").replace(/\/+$/, "");
const CODES = opt("--codes", "");
const RUNDEN = Number(opt("--runden", "1"));
const PAUSE_S = Number(opt("--pause", "10"));
const GLEICHZEITIG = args.includes("--gleichzeitig");
const SSH_HOST = opt("--ssh", "");
const SLUG = opt("--slug", "lasttest");
const WUNSCH = opt("--wunsch", "");

const WUENSCHE = [
  "Ein Spiel, in dem ein Frosch über Seerosen springt und Fliegen fängt. Wenn er ins Wasser fällt, ist es vorbei.",
  "Wir wollen ein Weltraumspiel: Eine Rakete weicht Asteroiden aus und sammelt Sterne für Punkte.",
  "Ein Rechenspiel: Aufgaben fallen vom Himmel, man tippt auf das richtige Ergebnis, bevor sie unten ankommen.",
  "Eine Katze muss über Dächer laufen und Mäuse fangen, dabei Hunden ausweichen. Mit Punkten oben.",
  "Baut ein Spiel, in dem man Müll sortieren muss: Papier, Plastik, Glas — richtig sortiert gibt Punkte.",
  "Ein Labyrinth mit einer Maus, die den Käse finden muss. Es soll drei Level geben.",
  "Ein Fußballspiel: Man tippt, wohin der Ball fliegen soll, der Torwart springt zufällig.",
  "Ein Drache fliegt durch Wolken und sammelt Edelsteine. Blitze machen ihn langsamer.",
  "Vokabeln lernen: Ein Wort erscheint auf Englisch, man tippt die richtige deutsche Übersetzung von drei Kärtchen.",
  "Ein Pinguin rutscht einen Berg runter und muss Steinen ausweichen. Je länger, desto schneller.",
];

type Poll = { t: number; ms: number; status: number };

// ---------------------------------------------------------------------------
// Ein simuliertes Tablet: eigener Cookie-Jar (Gerätekennung!), eigene Messwerte
// ---------------------------------------------------------------------------
class Tablet {
  cookie = "";
  polls: Poll[] = [];
  constructor(public index: number, public code: string) {}

  private async anfrage(pfad: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
    const res = await fetch(BASIS + pfad, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), ...(this.cookie ? { cookie: this.cookie } : {}) },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const m = c.match(/^(s45_device=[^;]+)/);
      if (m) this.cookie = m[1];
    }
    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async state(): Promise<any> {
    const t0 = performance.now();
    let status = -1;
    let body = null;
    try {
      const res = await this.anfrage(`/api/g/${this.code}/state`);
      status = res.status;
      body = await res.json().catch(() => null);
    } catch {
      /* Timeout/Netz → status -1 */
    }
    this.polls.push({ t: Date.now(), ms: performance.now() - t0, status });
    return body;
  }

  async generate(prompt: string) {
    const t0 = performance.now();
    try {
      const res = await this.anfrage(
        `/api/g/${this.code}/generate`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) },
        12 * 60_000
      );
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
      return { status: res.status, ok: Boolean(body.ok), reason: body.reason, ms: performance.now() - t0 };
    } catch (err) {
      return { status: -1, ok: false, reason: (err as Error).message, ms: performance.now() - t0 };
    }
  }

  async play() {
    try {
      const res = await this.anfrage(`/g/${this.code}/play`);
      const text = await res.text();
      return { status: res.status, bytes: text.length, spiel: text.toLowerCase().includes("<!doctype html") };
    } catch {
      return { status: -1, bytes: 0, spiel: false };
    }
  }
}

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------
function perzentil(werte: number[], q: number): number {
  if (werte.length === 0) return 0;
  const s = [...werte].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

async function containerStats(host: string): Promise<{ cpu: number; memMiB: number } | null> {
  try {
    const { stdout } = await execFileP(
      "ssh",
      [host, "docker stats --no-stream --format '{{.CPUPerc}};{{.MemUsage}}' studio45"],
      { timeout: 20_000 }
    );
    const [cpu, mem] = stdout.trim().split(";");
    const m = mem.match(/([\d.]+)\s*(KiB|MiB|GiB)/);
    const faktor = m?.[2] === "GiB" ? 1024 : m?.[2] === "KiB" ? 1 / 1024 : 1;
    return { cpu: parseFloat(cpu), memMiB: m ? parseFloat(m[1]) * faktor : NaN };
  } catch {
    return null;
  }
}

function ladeCodes(): { index: number; code: string }[] {
  if (!CODES) {
    console.error("Bitte --codes <datei.json> (Ausgabe von runtime/lasttest-seed.mjs) oder --codes a,b,c angeben.");
    process.exit(2);
  }
  if (fs.existsSync(CODES)) {
    const json = JSON.parse(fs.readFileSync(CODES, "utf8")) as { gruppen: { index: number; code: string }[] };
    return json.gruppen;
  }
  return CODES.split(",").map((c, i) => ({ index: i + 1, code: c.trim() }));
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------
async function main() {
  const gruppen = ladeCodes();
  const tablets = gruppen.map((g) => new Tablet(g.index, g.code));
  console.log(`Lasttest gegen ${BASIS} — ${tablets.length} Tablets, ${RUNDEN} Runde(n), ${GLEICHZEITIG ? "alle gleichzeitig" : "gestaffelt 0–8 s"}\n`);

  // Aufwärmen: Cookie holen, Phase prüfen
  for (const t of tablets) {
    const s = await t.state();
    if (!s) {
      console.error(`Gruppe ${t.index}: kein Zustand abrufbar (Code falsch? Server erreichbar?)`);
      process.exit(2);
    }
    if (s.phase !== "STUDIO") {
      console.error(`Workshop steht auf Phase ${s.phase} — im Lehrer-Dashboard auf „Studio" schalten (oder Seed erneut laufen lassen).`);
      process.exit(2);
    }
    if (s.locked) console.warn(`Gruppe ${t.index} ist gesperrt — wird scheitern.`);
  }
  console.log(`Aufgewärmt: ${tablets.length} Gerätecookies, Phase STUDIO.\n`);

  // Hintergrund: State-Polling wie die Kinder-App (alle 4 s), Beamer-Seite (30 s), docker stats (5 s)
  const timer: NodeJS.Timeout[] = [];
  for (const t of tablets) {
    let laeuft = false;
    timer.push(
      setInterval(() => {
        if (laeuft) return;
        laeuft = true;
        t.state().finally(() => (laeuft = false));
      }, 4000)
    );
  }
  const beamer: Poll[] = [];
  if (SLUG) {
    timer.push(
      setInterval(async () => {
        const t0 = performance.now();
        try {
          const res = await fetch(`${BASIS}/w/${SLUG}`, { signal: AbortSignal.timeout(15_000) });
          await res.text();
          beamer.push({ t: Date.now(), ms: performance.now() - t0, status: res.status });
        } catch {
          beamer.push({ t: Date.now(), ms: performance.now() - t0, status: -1 });
        }
      }, 30_000)
    );
  }
  const stats: { t: number; cpu: number; memMiB: number }[] = [];
  if (SSH_HOST) {
    timer.push(
      setInterval(async () => {
        const s = await containerStats(SSH_HOST);
        if (s) stats.push({ t: Date.now(), ...s });
      }, 5000)
    );
  }

  const fenster: [number, number][] = [];
  let alleOk = true;

  for (let runde = 1; runde <= RUNDEN; runde++) {
    console.log(`── Runde ${runde} ─────────────────────────────────────────────`);
    const start = Date.now();
    const ergebnisse = await Promise.all(
      tablets.map(async (t, i) => {
        const prompt = WUNSCH || WUENSCHE[(i + runde - 1) % WUENSCHE.length];
        if (!GLEICHZEITIG) await schlafe(Math.random() * 8000);
        return { t, ...(await t.generate(prompt)) };
      })
    );
    const ende = Date.now();
    fenster.push([start, ende]);

    for (const e of ergebnisse) {
      const p = await e.t.play();
      const s = await e.t.state();
      const tokens = s?.verbrauch?.letzterTokens ?? 0;
      if (!e.ok || !p.spiel) alleOk = false;
      console.log(
        `Gruppe ${String(e.t.index).padStart(2)}  ${e.ok ? "✅" : "❌"}  ${(e.ms / 1000).toFixed(1).padStart(6)} s  HTTP ${e.status}` +
          `  Tokens ${String(tokens).padStart(6)}  Spiel ${p.spiel ? `${(p.bytes / 1024).toFixed(0)} kB` : "FEHLT"}` +
          (e.reason ? `  · ${e.reason}` : "")
      );
    }
    const dauern = ergebnisse.map((e) => e.ms / 1000);
    console.log(
      `Runde ${runde}: ${ergebnisse.filter((e) => e.ok).length}/${ergebnisse.length} ok · Bauzeit min ${Math.min(...dauern).toFixed(1)} s` +
        ` · median ${perzentil(dauern, 0.5).toFixed(1)} s · max ${Math.max(...dauern).toFixed(1)} s · Runde gesamt ${((ende - start) / 1000).toFixed(0)} s\n`
    );
    if (runde < RUNDEN) await schlafe(PAUSE_S * 1000);
  }

  timer.forEach(clearInterval);
  await schlafe(500);

  // Auswertung: Reaktionszeit der Kinder-App WÄHREND der Builds
  const imFenster = (p: Poll) => fenster.some(([a, b]) => p.t >= a && p.t <= b);
  const polls = tablets.flatMap((t) => t.polls).filter(imFenster);
  const pollFehler = polls.filter((p) => p.status !== 200).length;
  const latenzen = polls.filter((p) => p.status === 200).map((p) => p.ms);
  const p50 = perzentil(latenzen, 0.5);
  const p95 = perzentil(latenzen, 0.95);
  const maxLatenz = latenzen.length ? Math.max(...latenzen) : 0;
  const beamerFehler = beamer.filter((b) => b.status !== 200).length;

  console.log("── Auswertung ───────────────────────────────────────────────");
  console.log(`State-Polls während der Builds: ${polls.length} · Fehler ${pollFehler} · Latenz p50 ${p50.toFixed(0)} ms · p95 ${p95.toFixed(0)} ms · max ${maxLatenz.toFixed(0)} ms`);
  if (SLUG) console.log(`Beamer-Seite: ${beamer.length} Abrufe · Fehler ${beamerFehler}`);
  if (SSH_HOST) {
    if (stats.length) {
      const cpuMax = Math.max(...stats.map((s) => s.cpu));
      const memMax = Math.max(...stats.map((s) => s.memMiB));
      console.log(`Container (${SSH_HOST}): CPU-Spitze ${cpuMax.toFixed(0)} % · Speicher-Spitze ${memMax.toFixed(0)} MiB (${stats.length} Messungen)`);
    } else {
      console.log(`Container (${SSH_HOST}): keine Messwerte — ssh/docker stats fehlgeschlagen`);
    }
  }

  const gruende: string[] = [];
  if (!alleOk) gruende.push("nicht alle Builds erfolgreich oder Spiel fehlt");
  if (pollFehler > 0) gruende.push(`${pollFehler} fehlgeschlagene State-Polls`);
  if (p95 > 1500) gruende.push(`p95-Latenz ${p95.toFixed(0)} ms > 1500 ms — Kinder-App ruckelt`);
  if (beamerFehler > 0) gruende.push(`${beamerFehler} Beamer-Fehler`);
  console.log(gruende.length ? `\n❌ ROT: ${gruende.join(" · ")}` : "\n✅ GRÜN: Der Server hält einen Workshop dieser Größe aus.");
  process.exit(gruende.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
