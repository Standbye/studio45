/**
 * Eigene Wurzel für Druckseiten: kein App-Chrome, damit der Ausdruck sauber bleibt.
 * Die Seiten bringen ihr eigenes <html>/<head> mit.
 */
export default function DruckLayout({ children }: LayoutProps<"/druck">) {
  return children;
}
