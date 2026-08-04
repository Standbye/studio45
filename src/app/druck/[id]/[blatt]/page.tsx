import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { BASE_URL } from "@/lib/env";
import { dayMotto, dayTitle } from "@/lib/prompts";
import {
  ICH_KANN,
  Kopf,
  REFLEXIONSFRAGEN,
  ROLLEN,
  TAFEL_1,
  TAFEL_2,
  stundenverlauf,
  type MaterialKontext,
} from "@/lib/materials";
import { printStyles } from "../../print.css";
import { DruckLeiste } from "./druck-leiste";

export const dynamic = "force-dynamic";

const GRUPPENFARBEN = ["#1d4e89", "#0b6e4f", "#5e35b1", "#e65100", "#c8102e", "#00838f", "#6d4c41", "#37474f", "#ad1457", "#558b2f"];

function fett(text: string) {
  // **fett** → <strong>
  const teile = text.split(/\*\*(.+?)\*\*/g);
  return teile.map((t, i) => (i % 2 === 1 ? <strong key={i}>{t}</strong> : t));
}

export default async function MaterialBlatt({ params }: PageProps<"/druck/[id]/[blatt]">) {
  const user = await requireUserPage("TEACHER");
  const { id, blatt } = await params;
  const w = await db.workshop.findFirst({
    where: { id, teacherId: user.id },
    include: { groups: { orderBy: { index: "asc" } } },
  });
  if (!w) notFound();

  const ctx: MaterialKontext = {
    workshopName: w.name,
    className: w.className,
    totalDays: w.totalDays,
    colorPrimary: w.colorPrimary,
    colorAccent: w.colorAccent,
    logoUrl: w.logoPath && w.groups[0] ? `/api/g/${w.groups[0].code}/logo` : null,
    groups: w.groups.map((g) => ({ index: g.index, studioName: g.studioName, code: g.code })),
  };

  const qr =
    blatt === "qr"
      ? await Promise.all(
          w.groups.map((g) =>
            QRCode.toDataURL(`${BASE_URL}/g/${g.code}`, { errorCorrectionLevel: "H", margin: 1, width: 700 })
          )
        )
      : [];

  let inhalt: React.ReactNode;
  let titel = "";

  switch (blatt) {
    case "rollenkarten":
      titel = "Rollenkarten";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Unsere Rollen im Spielestudio" />
          <p className="klein">Ausschneiden und in der Gruppe verteilen. <strong>Wichtig: Jede Stunde tauschen!</strong></p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6mm", marginTop: "6mm" }}>
            {ROLLEN.map((r) => (
              <div key={r.name} style={{ border: `2mm solid ${r.farbe}`, borderRadius: "4mm", padding: "5mm", minHeight: "78mm" }}>
                <div style={{ fontSize: "22pt" }}>{r.emoji}</div>
                <div style={{ fontSize: "16pt", fontWeight: 900, color: r.farbe, margin: "1mm 0 2mm" }}>{r.name}</div>
                <p style={{ margin: "0 0 3mm", fontSize: "11pt" }}>{r.aufgabe}</p>
                <ul style={{ margin: 0, paddingLeft: "5mm" }}>
                  {r.tipps.map((t) => (
                    <li key={t} style={{ fontSize: "10pt" }}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
      break;

    case "tafeln":
      titel = "Thementafeln";
      inhalt = (
        <>
          {[TAFEL_1, TAFEL_2].map((tafel) => (
            <div key={tafel.titel} className="blatt quer">
              <Kopf ctx={ctx} titel={`${tafel.emoji} ${tafel.titel}`} />
              <div style={{ display: "grid", gap: "8mm", marginTop: "8mm" }}>
                {tafel.punkte.map((p) => (
                  <div key={p.text} style={{ display: "flex", gap: "6mm", alignItems: "center" }}>
                    <div style={{ fontSize: "30pt", lineHeight: 1 }}>{p.icon}</div>
                    <p style={{ fontSize: "17pt", margin: 0, lineHeight: 1.35 }}>{fett(p.text)}</p>
                  </div>
                ))}
              </div>
              <p className="klein" style={{ marginTop: "10mm", textAlign: "center" }}>
                Studio45 · {ctx.workshopName} — zum Aufhängen im Klassenzimmer
              </p>
            </div>
          ))}
        </>
      );
      break;

    case "qr":
      titel = "QR-Blätter";
      inhalt = (
        <>
          {w.groups.map((g, i) => (
            <div key={g.id} className="blatt" style={{ textAlign: "center" }}>
              <Kopf ctx={ctx} titel={g.studioName || `Gruppe ${g.index}`} />
              <div
                style={{
                  background: GRUPPENFARBEN[i % GRUPPENFARBEN.length],
                  color: "#fff",
                  fontSize: "22pt",
                  fontWeight: 900,
                  borderRadius: "4mm",
                  padding: "4mm",
                  margin: "4mm 0 8mm",
                }}
              >
                Gruppe {g.index}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr[i]} alt="" style={{ width: "120mm", height: "120mm" }} />
              <p style={{ fontSize: "14pt", marginTop: "6mm" }}>iPad-Kamera auf den Code halten 📷</p>
              <p className="klein">Dieser Code gehört nur eurer Gruppe — bitte nicht weitergeben.</p>
            </div>
          ))}
        </>
      );
      break;

    case "stundenverlauf":
      titel = "Stundenverläufe";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Stundenverläufe & Reflexion" />
          {Array.from({ length: w.totalDays }, (_, i) => i + 1).map((day) => (
            <div key={day} style={{ marginBottom: "8mm" }}>
              <h2>
                Termin {day}: {dayTitle(day, w.totalDays)}
              </h2>
              <p style={{ margin: "0 0 3mm" }}>
                <strong>Merksatz:</strong> „{dayMotto(day, w.totalDays)}"
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {stundenverlauf(day, w.totalDays).map((z) => (
                    <tr key={z.was}>
                      <td style={{ width: "18mm", padding: "1.5mm 0", fontWeight: 700, verticalAlign: "top" }}>{z.zeit}</td>
                      <td style={{ width: "42mm", padding: "1.5mm 0", verticalAlign: "top" }}>{z.was}</td>
                      <td style={{ padding: "1.5mm 0", color: "#555" }}>{z.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <h2>Reflexionsfragen (jede Stunde, 5 Minuten)</h2>
          <ul>
            {REFLEXIONSFRAGEN.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <h2>Peer-Testing: „Zwei Sterne und ein Wunsch"</h2>
          <p>
            Jede Gruppe spielt das Spiel einer anderen Gruppe und nennt <strong>zwei Dinge, die gut sind</strong>,
            und <strong>einen Wunsch</strong> für die nächste Version. Das trainiert Feedback geben und annehmen —
            und ist genau das, was Software-Teams auch tun.
          </p>
          <h2>Wenn die KI Mist baut</h2>
          <p>
            Das ist der beste Lernmoment der Stunde. Fragen Sie laut: „Was genau haben wir gesagt? Was hat die KI
            daraus gemacht? Woran könnte das liegen?" Fehlschläge kosten die Gruppe <strong>keinen</strong> Versuch.
          </p>
        </div>
      );
      break;

    case "ich-kann":
      titel = "Ich-kann-Bogen";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Das kann ich jetzt!" />
          <p>Kreuze an, wie gut du das schon kannst.</p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6mm" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "3mm 0", fontSize: "11pt" }}>Das kann ich …</th>
                <th style={{ width: "22mm", fontSize: "16pt" }}>😀</th>
                <th style={{ width: "22mm", fontSize: "16pt" }}>🙂</th>
                <th style={{ width: "22mm", fontSize: "16pt" }}>🤔</th>
              </tr>
            </thead>
            <tbody>
              {ICH_KANN.map((s) => (
                <tr key={s} style={{ borderTop: "0.3mm solid #ccc" }}>
                  <td style={{ padding: "4mm 0", fontSize: "12pt" }}>{s}</td>
                  {[0, 1, 2].map((n) => (
                    <td key={n} style={{ textAlign: "center" }}>
                      <span style={{ display: "inline-block", width: "8mm", height: "8mm", border: "0.5mm solid #555", borderRadius: "1.5mm" }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <h2 style={{ marginTop: "10mm" }}>Das war mein bester Moment:</h2>
          <div style={{ borderBottom: "0.4mm solid #999", height: "12mm" }} />
          <div style={{ borderBottom: "0.4mm solid #999", height: "12mm" }} />
        </div>
      );
      break;

    case "elternbrief":
      titel = "Elternbrief";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Ihr Kind baut ein Computerspiel — mit KI" />
          <p>Liebe Eltern,</p>
          <p>
            in den nächsten {w.totalDays} Unterrichtseinheiten entwickelt Ihr Kind gemeinsam mit seiner Gruppe ein
            eigenes Lernspiel für den Browser. Dabei spricht die Gruppe mit einer KI, die den Programmcode
            schreibt — die Kinder beschreiben, testen und verbessern.
          </p>
          <p>
            Das Ziel ist nicht Programmieren. Das Ziel ist <strong>Kompetenz im Umgang mit KI</strong>: präzise
            formulieren, Ergebnisse prüfen, hartnäckig verbessern — und verstehen, was eine KI ist und wo sie irrt.
          </p>
          <h2>Datenschutz</h2>
          <p>
            Die Kinder melden sich <strong>nicht</strong> an. Es werden <strong>keine Namen, Fotos oder
            persönlichen Daten</strong> erfasst — der Zugang läuft über einen anonymen Gruppen-Code. Gespeichert
            werden nur die Sätze, die die Gruppe der KI sagt, und die entstandenen Spiele.
          </p>
          <h2>Das lernt Ihr Kind über Sicherheit</h2>
          <ul>
            {TAFEL_2.punkte.map((p) => (
              <li key={p.text}>{fett(p.text)}</li>
            ))}
          </ul>
          <p>
            Sprechen Sie zu Hause gern darüber — die Regeln gelten für Sprachassistenten und Chat-Programme genauso.
          </p>
          <p style={{ marginTop: "10mm" }}>Mit freundlichen Grüßen<br />{user.displayName}</p>
        </div>
      );
      break;

    case "urkunden":
      titel = "Urkunden";
      inhalt = (
        <>
          {w.groups.map((g, i) => {
            const farbe = GRUPPENFARBEN[i % GRUPPENFARBEN.length];
            return (
              <div key={g.id} className="blatt" style={{ textAlign: "center", border: `3mm solid ${farbe}`, borderRadius: "6mm" }}>
                <div style={{ fontSize: "48pt", marginTop: "6mm" }}>🏆</div>
                <h1 style={{ fontSize: "34pt", letterSpacing: "6pt", color: farbe, margin: "2mm 0" }}>URKUNDE</h1>
                <p style={{ fontSize: "12pt", letterSpacing: "2pt", textTransform: "uppercase", color: "#6b6455" }}>
                  Spiele-Entwickler:in
                </p>
                <div style={{ borderBottom: "0.8mm solid #1f2430", width: "120mm", height: "16mm", margin: "16mm auto 1mm" }} />
                <p className="klein" style={{ margin: 0 }}>Name</p>
                <p style={{ fontSize: "13pt", maxWidth: "150mm", margin: "12mm auto 0", lineHeight: 1.6 }}>
                  hat im KI-Spielestudio der {ctx.className || "Klasse"} gemeinsam mit dem Studio{" "}
                  <strong style={{ color: farbe }}>{g.studioName || `Gruppe ${g.index}`}</strong> ein eigenes Lernspiel
                  erdacht, der KI klare Anweisungen gegeben, getestet, verbessert — und ein echtes Spiel veröffentlicht.
                </p>
                <div style={{ display: "flex", gap: "6mm", justifyContent: "center", marginTop: "12mm" }}>
                  {["🎤 Prompten", "🧪 Testen", "🎨 Gestalten", "🤝 Teamwork"].map((b) => (
                    <span key={b} style={{ border: "0.4mm solid #ddd3bd", borderRadius: "3mm", padding: "3mm 5mm", fontSize: "10pt", fontWeight: 700 }}>
                      {b}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "22mm 10mm 0" }}>
                  {["Ort, Datum", "Unterschrift"].map((t) => (
                    <div key={t} style={{ textAlign: "center" }}>
                      <div style={{ borderBottom: "0.5mm solid #9a917d", width: "56mm", height: "10mm" }} />
                      <span className="klein">{t}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "20pt", marginTop: "8mm" }}>🌳</p>
              </div>
            );
          })}
        </>
      );
      break;

    default:
      notFound();
  }

  return (
    <html lang="de">
      <head>
        <title>{`${titel} — ${w.name}`}</title>
        <style dangerouslySetInnerHTML={{ __html: printStyles(w.colorPrimary, w.colorAccent) }} />
      </head>
      <body>
        <DruckLeiste zurueck={`/lehrer/${id}/material`} titel={titel} />
        {inhalt}
      </body>
    </html>
  );
}
