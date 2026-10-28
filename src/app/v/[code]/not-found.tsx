/** Abgeschalteter, ersetzter oder falscher Vertretungs-Link */
export default function VertretungNichtGefunden() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-black">Dieser Link gilt nicht (mehr)</h1>
      <p className="text-muted-foreground">
        Die Lehrkraft hat den Vertretungs-Link abgeschaltet oder einen neuen erzeugt. Bitte holen Sie sich bei ihr den
        aktuellen Link.
      </p>
    </main>
  );
}
