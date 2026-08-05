import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { BASE_URL } from "@/lib/env";
import { dayMotto, dayTitle } from "@/lib/prompts";
import { alterProfil } from "@/lib/audience";
import {
  BUG_FRAGEN,
  Fuss,
  ICH_KANN,
  KI_BEISPIEL,
  KI_TIPPS,
  Kopf,
  laufzettel,
  REFLEXIONSFRAGEN,
  ROLLEN,
  TAFEL_1,
  TAFEL_2,
  stundenverlauf,
  vorbereitung,
  type MaterialKontext,
} from "@/lib/materials";
import { printStyles } from "../../print.css";
import { DruckLeiste } from "./druck-leiste";

export const dynamic = "force-dynamic";

const GRUPPENFARBEN = ["#1d4e89", "#0b6e4f", "#5e35b1", "#e65100", "#c8102e", "#00838f", "#6d4c41", "#37474f", "#ad1457", "#558b2f"];
const AMPEL: Record<string, string> = { rot: "#c8102e", gelb: "#e6a700", gruen: "#0b6e4f" };

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
          <p className="klein">
            An den gestrichelten Linien ausschneiden und in der Gruppe verteilen.{" "}
            <strong>Jede Stunde tauschen — der Laufplan zeigt, wer dran ist.</strong>
          </p>
          <div className="rollen-grid">
            {ROLLEN.map((r) => (
              <div key={r.name} className="schnittkarte rollenkarte" style={{ "--rolle": r.farbe } as React.CSSProperties}>
                <span className="schere">✂</span>
                <div className="rolle-kopf">
                  <span className="emoji">{r.emoji}</span>
                  <span className="name" style={{ color: r.farbe }}>{r.name}</span>
                </div>
                <div className="rolle-rule" style={{ background: r.farbe }} />
                <p className="aufgabe">{r.aufgabe}</p>
                <p className="so">Das machst du</p>
                <ul className="tipps">
                  {r.schritte.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className="so" style={{ marginTop: "2.5mm" }}>Tipps</p>
                <ul className="tipps">
                  {r.tipps.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Fuss ctx={ctx} blatt="Rollenkarten" seite={1} von={1} />
        </div>
      );
      break;

    case "tafeln":
      titel = "Thementafeln";
      inhalt = (
        <>
          {[TAFEL_1, TAFEL_2].map((tafel, ti) => (
            <div key={tafel.titel} className="blatt">
              <Kopf ctx={ctx} schlicht />
              <div className="tafel-titel">
                <div className="gross">{tafel.emoji} {tafel.titel}</div>
                <div className="unter">Unsere Regeln für den Umgang mit KI — zum Aufhängen im Klassenzimmer</div>
              </div>
              <div className="tafel-grid">
                {tafel.punkte.map((p) => (
                  <div
                    key={p.text}
                    className="tafel-punkt"
                    style={p.ampel ? { borderLeftColor: AMPEL[p.ampel] } : undefined}
                  >
                    <span className="icon">{p.icon}</span>
                    <p className="text">{fett(p.text)}</p>
                  </div>
                ))}
              </div>
              <Fuss ctx={ctx} blatt="Thementafeln" seite={ti + 1} von={2} />
            </div>
          ))}
        </>
      );
      break;

    case "qr":
      titel = "QR-Blätter";
      inhalt = (
        <>
          {w.groups.map((g, i) => {
            const farbe = GRUPPENFARBEN[i % GRUPPENFARBEN.length];
            return (
              <div key={g.id} className="blatt">
                <Kopf ctx={ctx} titel={g.studioName || `Gruppe ${g.index}`} />
                <div style={{ textAlign: "center" }}>
                  <span className="gruppen-pill" style={{ borderColor: farbe, color: farbe }}>
                    Gruppe {g.index}
                  </span>
                  <div className="schritte">
                    {["iPad-Kamera öffnen 📷", "Code scannen", "Losbauen! 🎮"].map((s, n) => (
                      <span key={s} className="schritt">
                        <span className="nr" style={{ borderColor: farbe, color: farbe }}>{n + 1}</span>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="qr-rahmen">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr[i]} alt={`QR-Code Gruppe ${g.index}`} style={{ display: "block", width: "112mm", height: "112mm" }} />
                  </div>
                  <p style={{ fontSize: "13pt", margin: "6mm 0 0" }}>
                    Haltet die Kamera auf den Code — euer Studio öffnet sich von selbst.
                  </p>
                  <div className="kasten" style={{ display: "inline-block", marginTop: "6mm" }}>
                    <p className="klein" style={{ margin: 0 }}>
                      🔒 Dieser Code gehört nur eurer Gruppe — bitte nicht weitergeben.
                    </p>
                  </div>
                </div>
                <Fuss ctx={ctx} blatt="QR-Blätter" seite={i + 1} von={w.groups.length} />
              </div>
            );
          })}
        </>
      );
      break;

    case "stundenverlauf": {
      titel = "Stundenverläufe";
      const seiten = w.totalDays + 1;
      inhalt = (
        <>
          {Array.from({ length: w.totalDays }, (_, i) => i + 1).map((day) => (
            <div key={day} className="blatt">
              <Kopf ctx={ctx} titel={`Termin ${day} von ${w.totalDays}: ${dayTitle(day, w.totalDays)}`} />
              <div className="merksatz">
                <span className="label">Merksatz des Tages — im Plenum an den Beamer</span>
                <span className="satz">„{dayMotto(day, w.totalDays)}"</span>
              </div>
              <h2>Ablauf — 45 Minuten</h2>
              <table className="plan">
                <tbody>
                  {stundenverlauf(day, w.totalDays).map((z) => (
                    <tr key={z.was}>
                      <td className="zeit">{z.zeit}</td>
                      <td className="was">{z.was}</td>
                      <td className="detail">{z.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h2>Checkliste vor der Stunde</h2>
              {vorbereitung(w.slug).map((v) => (
                <p key={v} style={{ margin: "0 0 2.2mm" }}>
                  <span className="check" />
                  {v}
                </p>
              ))}
              <div className="kasten akzent" style={{ marginTop: "7mm" }}>
                <p className="ktitel">Wenn die KI Mist baut</p>
                <p style={{ margin: 0, fontSize: "10.5pt" }}>
                  Das ist der beste Lernmoment der Stunde. Fragen Sie laut: „Was genau haben wir gesagt?
                  Was hat die KI daraus gemacht? Woran könnte das liegen?" Fehlschläge kosten die Gruppe{" "}
                  <strong>keinen</strong> Versuch.
                </p>
              </div>
              <h2>Notizen</h2>
              <div className="linie" />
              <div className="linie" />
              <div className="linie" />
              <div className="linie" />
              <Fuss ctx={ctx} blatt="Stundenverläufe" seite={day} von={seiten} />
            </div>
          ))}
          <div className="blatt">
            <Kopf ctx={ctx} titel="Methoden & Reflexion" />
            <h2>Reflexionsfragen — jede Stunde, letzte 5 Minuten</h2>
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
            <h2>Rollen rotieren</h2>
            <p>
              Die Rollenkarten wandern jede Stunde eine Position weiter. So kommt jedes Kind einmal ans
              Mikro, ans Testen, ans Gestalten und in die Teamleitung — und kein Kind dominiert die Gruppe.
            </p>
            <Fuss ctx={ctx} blatt="Stundenverläufe" seite={seiten} von={seiten} />
          </div>
        </>
      );
      break;
    }

    case "ich-kann":
      titel = "Ich-kann-Bogen";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Das kann ich jetzt!" />
          <div style={{ display: "flex", gap: "10mm", marginBottom: "6mm" }}>
            <div style={{ flex: 2 }}>
              <span className="klein">Name</span>
              <div className="linie" style={{ height: "7mm" }} />
            </div>
            <div style={{ flex: 1 }}>
              <span className="klein">Datum</span>
              <div className="linie" style={{ height: "7mm" }} />
            </div>
          </div>
          <p>Male für jeden Satz den Kreis aus, der zu dir passt.</p>
          <table className="bogen">
            <thead>
              <tr>
                <th className="frage">Das kann ich …</th>
                <th>😀</th>
                <th>🙂</th>
                <th>🤔</th>
              </tr>
            </thead>
            <tbody>
              {ICH_KANN.map((s) => (
                <tr key={s}>
                  <td>{s}</td>
                  {[0, 1, 2].map((n) => (
                    <td key={n} className="mitte">
                      <span className="kreis" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <h2 style={{ marginTop: "9mm" }}>Mein bester Moment war …</h2>
          <div className="linie" />
          <div className="linie" />
          <div className="linie" />
          <Fuss ctx={ctx} blatt="Ich-kann-Bogen" seite={1} von={1} />
        </div>
      );
      break;

    case "elternbrief":
      titel = "Elternbrief";
      inhalt = (
        <div className="blatt brief">
          <Kopf ctx={ctx} schlicht />
          <p className="datum">
            {new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="betreff">Ihr Kind baut ein Computerspiel — mit KI</p>
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
          <h2>Diese Sicherheitsregeln lernt Ihr Kind</h2>
          <ul className="regeln">
            {TAFEL_2.punkte.map((p) => (
              <li key={p.text}>{fett(p.text)}</li>
            ))}
          </ul>
          <p>
            Sprechen Sie zu Hause gern darüber — die Regeln gelten für Sprachassistenten und Chat-Programme genauso.
          </p>
          <p style={{ marginTop: "9mm", marginBottom: 0 }}>Mit freundlichen Grüßen</p>
          <div style={{ width: "70mm" }}>
            <div className="linie" style={{ height: "9mm" }} />
            <span className="klein">{user.displayName}</span>
          </div>
          <Fuss ctx={ctx} blatt="Elternbrief" seite={1} von={1} />
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
              <div key={g.id} className="blatt urkunde" style={{ borderColor: farbe }}>
                <div className="urkunde-innen">
                  <div className="urkunde-marke">
                    Studio45 · KI-Spielestudio{ctx.className ? ` · Klasse ${ctx.className}` : ""}
                  </div>
                  <div style={{ fontSize: "34pt", lineHeight: 1.2, marginTop: "9mm" }}>🏆</div>
                  <div className="urkunde-titel" style={{ color: farbe }}>URKUNDE</div>
                  <div className="urkunde-ornament">✦</div>
                  <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "10.5pt", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--grau)" }}>
                    Spiele-Entwickler:in
                  </div>
                  <div className="namenszeile" />
                  <span className="klein" style={{ fontFamily: "system-ui, sans-serif", marginTop: "1mm" }}>Vor- und Nachname</span>
                  <p className="flusstext">
                    hat im KI-Spielestudio{ctx.className ? ` der Klasse ${ctx.className}` : ""} gemeinsam mit dem
                    Studio <strong style={{ color: farbe }}>{g.studioName || `Gruppe ${g.index}`}</strong> ein
                    eigenes Lernspiel erdacht, der KI klare Anweisungen gegeben, getestet, verbessert — und ein
                    echtes Spiel veröffentlicht.
                  </p>
                  <div style={{ display: "flex", gap: "5mm", marginTop: "9mm", fontFamily: "system-ui, sans-serif" }}>
                    {["🎤 Prompten", "🧪 Testen", "🎨 Gestalten", "🤝 Teamwork"].map((b) => (
                      <span key={b} className="chip">{b}</span>
                    ))}
                  </div>
                  <div className="urkunde-emblem">🌳</div>
                  <div className="unterschriften">
                    {["Ort, Datum", "Unterschrift"].map((t) => (
                      <div key={t} className="feld">
                        <div className="strich" />
                        <span className="klein">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      );
      break;

    case "ki-tipps":
      titel = "Wie rede ich mit der KI?";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Wie rede ich mit der KI?" />
          <div className="merksatz">
            <span className="label">Die wichtigste Regel</span>
            <span className="satz">Erst denken, dann tippen!</span>
          </div>
          <h2>Die fünf Regeln für gute Wünsche</h2>
          <ol>
            {KI_TIPPS.map((t) => (
              <li key={t.regel}>
                <strong>{t.regel}</strong> {t.erklaerung}
              </li>
            ))}
          </ol>
          <h2>So klingt der Unterschied</h2>
          <div className="spalten">
            <div className="kasten">
              <p className="ktitel">❌ So versteht die KI euch nicht</p>
              <p style={{ margin: 0, fontSize: "12pt" }}>„{KI_BEISPIEL.schlecht}"</p>
            </div>
            <div className="kasten akzent">
              <p className="ktitel">✅ So klappt es</p>
              <p style={{ margin: 0, fontSize: "10.5pt" }}>„{KI_BEISPIEL.gut}"</p>
            </div>
          </div>
          <div className="kasten" style={{ marginTop: "6mm" }}>
            <p className="ktitel">Wenn es nicht klappt</p>
            <p style={{ margin: 0, fontSize: "10.5pt" }}>
              Nicht ärgern — nachdenken: Was hat die KI verstanden? Was war anders gemeint?
              Sagt es beim nächsten Wunsch <strong>genauer</strong>. Die Bugreport-Karte hilft euch dabei.
            </p>
          </div>
          <Fuss ctx={ctx} blatt="Wie rede ich mit der KI?" seite={1} von={1} />
        </div>
      );
      break;

    case "laufplan":
      titel = "Laufplan";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Unser Laufplan" />
          <div style={{ display: "flex", gap: "10mm", marginBottom: "5mm" }}>
            <div style={{ flex: 1 }}>
              <span className="klein">Unser Studio</span>
              <div className="linie" style={{ height: "7mm" }} />
            </div>
          </div>
          <p>
            Tragt ein, wer in welcher Stunde welche Rolle hat.{" "}
            <strong>Jede Stunde wandern die Rollen eine Position weiter</strong> — so kommt jedes Kind
            einmal an jede Aufgabe. Seid ihr mehr als vier? Dann gibt es eine Rolle doppelt.
          </p>
          <table className="rotation">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Termin</th>
                {ROLLEN.map((r) => (
                  <th key={r.name} style={{ color: r.farbe }}>
                    {r.emoji} {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: w.totalDays }, (_, i) => i + 1).map((day) => (
                <tr key={day}>
                  <td className="termin">
                    Termin {day}
                    <span className="klein">{dayTitle(day, w.totalDays)}</span>
                  </td>
                  {ROLLEN.map((r) => (
                    <td key={r.name} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="klein" style={{ marginTop: "4mm" }}>
            Tipp: Blatt gut sichtbar auf den Gruppentisch legen — dann gibt es keine Diskussionen. 😉
          </p>
          <Fuss ctx={ctx} blatt="Laufplan" seite={1} von={1} />
        </div>
      );
      break;

    case "laufzettel":
      titel = "Lehrer-Laufzettel";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Lehrer-Laufzettel" />
          <h2 style={{ marginTop: "2mm" }}>Vor dem Workshop</h2>
          {[
            "KI-Verbindung im Workshop testen, Versuche pro Stunde und Token-Budget prüfen",
            "Materialien drucken: QR-Blätter, Rollenkarten, Laufplan, KI-Tipps, Thementafeln",
            "Beamer testen (Startseite des Workshops), iPads laden, Kamera-Zugriff erlauben",
            "Testbogen und Bugreport-Karten fürs Peer-Testing bereitlegen",
          ].map((v) => (
            <p key={v} style={{ margin: "0 0 2mm", fontSize: "10pt" }}>
              <span className="check" />
              {v}
            </p>
          ))}
          <h2>Die Termine im Überblick</h2>
          <table className="zettel">
            <thead>
              <tr>
                <th>Termin</th>
                <th>Das tun Sie</th>
                <th>Darauf achten</th>
              </tr>
            </thead>
            <tbody>
              {laufzettel(w.totalDays).map((z) => (
                <tr key={z.termin}>
                  <td className="termin">
                    Termin {z.termin}
                    <span className="klein">{z.fokus}</span>
                  </td>
                  <td>{z.tun}</td>
                  <td>{z.achten}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="kasten akzent" style={{ marginTop: "6mm" }}>
            <p className="ktitel">In jeder Stunde im Blick</p>
            <p style={{ margin: 0, fontSize: "9.5pt" }}>
              Phase „Plenum" sperrt die Eingabe der Kinder — nutzen Sie das für Erklärungen. Versuche
              können Sie im Dashboard pro Gruppe nachladen (+N); fehlgeschlagene Generierungen kosten{" "}
              <strong>keinen</strong> Versuch. Der Merksatz des Tages steht automatisch auf der Beamer-Seite.
              Wenn die KI Mist baut: laut analysieren — das ist der beste Lernmoment.
            </p>
          </div>
          <Fuss ctx={ctx} blatt="Lehrer-Laufzettel" seite={1} von={1} />
        </div>
      );
      break;

    case "testbogen":
      titel = "Testbogen";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Was funktioniert gut — was noch nicht?" />
          <div style={{ display: "flex", gap: "10mm", marginBottom: "5mm" }}>
            <div style={{ flex: 1 }}>
              <span className="klein">Wir sind Studio</span>
              <div className="linie" style={{ height: "7mm" }} />
            </div>
            <div style={{ flex: 1 }}>
              <span className="klein">Wir testen das Spiel von</span>
              <div className="linie" style={{ height: "7mm" }} />
            </div>
          </div>
          <p>Spielt das Spiel der anderen Gruppe in Ruhe — und schreibt auf, was euch auffällt.</p>
          <div className="spalten">
            <div className="kasten">
              <p className="ktitel">👍 Das funktioniert gut</p>
              {[0, 1, 2, 3, 4].map((n) => (
                <div key={n} className="linie" style={{ height: "9.5mm" }} />
              ))}
            </div>
            <div className="kasten">
              <p className="ktitel">👎 Das funktioniert noch nicht</p>
              {[0, 1, 2, 3, 4].map((n) => (
                <div key={n} className="linie" style={{ height: "9.5mm" }} />
              ))}
            </div>
          </div>
          <h2>Zwei Sterne und ein Wunsch</h2>
          <p className="klein" style={{ marginTop: 0 }}>
            Das sagt ihr der anderen Gruppe ins Gesicht: zwei Dinge, die richtig gut sind — und einen
            freundlichen Wunsch für die nächste Version.
          </p>
          {["⭐", "⭐", "🌠"].map((s, n) => (
            <div key={n} className="mitzeile" style={{ marginBottom: "2mm" }}>
              <span style={{ fontSize: "13pt" }}>{s}</span>
              <div className="linie" style={{ height: "9mm" }} />
            </div>
          ))}
          <Fuss ctx={ctx} blatt="Testbogen" seite={1} von={1} />
        </div>
      );
      break;

    case "bugreport":
      titel = "Bugreport-Karten";
      inhalt = (
        <div className="blatt">
          <Kopf ctx={ctx} titel="Bugreport-Karten" />
          <p className="klein">
            Für jeden Fehler eine Karte ausfüllen — erst Detektiv spielen, dann den neuen Wunsch formulieren.
          </p>
          {[0, 1].map((k) => (
            <div key={k} className="schnittkarte" style={{ marginTop: k === 0 ? "3mm" : "6mm" }}>
              <span className="schere">✂</span>
              <p style={{ fontSize: "13pt", fontWeight: 900, margin: "0 0 3mm", color: "var(--primary-text)" }}>
                🐞 Bugreport
              </p>
              <div className="spalten">
                <div>
                  <span className="klein">Das wollten wir:</span>
                  <div className="linie" style={{ height: "8mm" }} />
                  <div className="linie" style={{ height: "8mm" }} />
                </div>
                <div>
                  <span className="klein">Das ist stattdessen passiert:</span>
                  <div className="linie" style={{ height: "8mm" }} />
                  <div className="linie" style={{ height: "8mm" }} />
                </div>
              </div>
              <p className="so" style={{ margin: "3.5mm 0 1.5mm" }}>Detektiv-Fragen: Woran könnte es liegen?</p>
              {BUG_FRAGEN.map((f) => (
                <p key={f} style={{ margin: "0 0 1.6mm", fontSize: "10pt" }}>
                  <span className="check" />
                  {f}
                </p>
              ))}
              <span className="klein" style={{ display: "block", marginTop: "2.5mm" }}>
                Unser neuer, genauerer Wunsch:
              </span>
              <div className="linie" style={{ height: "8mm" }} />
              <div className="linie" style={{ height: "8mm" }} />
            </div>
          ))}
          <Fuss ctx={ctx} blatt="Bugreport-Karten" seite={1} von={1} />
        </div>
      );
      break;

    default:
      notFound();
  }

  const alter = alterProfil(w.ageGroup);
  return (
    <html lang="de">
      <head>
        <title>{`${titel} — ${w.name}`}</title>
        <style
          dangerouslySetInnerHTML={{
            __html: printStyles(w.colorPrimary, w.colorAccent, {
              quer: blatt === "tafeln",
              verspielt: alter.optik.verspielt,
            }),
          }}
        />
      </head>
      <body>
        <DruckLeiste zurueck={`/lehrer/${id}/material`} titel={titel} />
        {inhalt}
      </body>
    </html>
  );
}
