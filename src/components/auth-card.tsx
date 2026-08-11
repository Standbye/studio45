import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FEHLER_TEXTE: Record<string, string> = {
  eingabe: "Bitte prüfe deine Eingaben (Benutzername min. 2, Passwort min. 8 Zeichen).",
  wiederholung: "Die Passwörter stimmen nicht überein.",
  zugangsdaten: "Benutzername oder Passwort ist falsch.",
  gesperrt: "Zu viele Fehlversuche — Konto ist kurzzeitig gesperrt. Bitte in 5 Minuten erneut versuchen.",
  aktuell: "Das aktuelle Passwort ist falsch.",
  zuviele: "Zu viele Anmeldeversuche von diesem Gerät. Bitte ein paar Minuten warten.",
};

export function AuthShell({
  title,
  description,
  fehler,
  children,
}: {
  title: string;
  description: string;
  fehler?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-primary p-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center text-primary-foreground">
          <span className="text-4xl font-black tracking-tight">
            Studio<span className="text-amber-400">45</span>
          </span>
          <p className="mt-1.5 text-sm opacity-85">
            Spielestudio in 45 Minuten — Kinder bauen mit KI ihre eigenen Lernspiele.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fehler && (
              <Alert variant="destructive">
                <AlertDescription>{FEHLER_TEXTE[fehler] ?? "Unbekannter Fehler."}</AlertDescription>
              </Alert>
            )}
            {children}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
