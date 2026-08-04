import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FEHLER_TEXTE: Record<string, string> = {
  eingabe: "Bitte prüfe deine Eingaben (Benutzername min. 2, Passwort min. 8 Zeichen).",
  wiederholung: "Die Passwörter stimmen nicht überein.",
  zugangsdaten: "Benutzername oder Passwort ist falsch.",
  gesperrt: "Zu viele Fehlversuche — Konto ist kurzzeitig gesperrt. Bitte in 5 Minuten erneut versuchen.",
  aktuell: "Das aktuelle Passwort ist falsch.",
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
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <span className="text-3xl font-black tracking-tight">
            Studio<span className="text-primary">45</span>
          </span>
          <p className="text-xs text-muted-foreground mt-1">Spielestudio in 45 Minuten</p>
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
