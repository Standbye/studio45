/**
 * Design „Vortrag“ (Workshop-Einstellung beamerStil = "vortrag"): Rot-Weiß mit Montserrat,
 * passend zu den Folien für Veranstaltungen. Gilt für Beamer-Seite und Gruppen-Studio.
 */
export const VORTRAG = {
  rot: "#B30000",
  linie: "#F2D9D9",
  grau: "#8F6F6F",
  schrift: '"Montserrat Variable", "Helvetica Neue", Arial, sans-serif',
  radius: "4px",
} as const;

export const istVortrag = (beamerStil: string) => beamerStil === "vortrag";
