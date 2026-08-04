import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' nur im Dev-Modus — React braucht es für Debugging-Features
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2", "sharp", "@prisma/adapter-better-sqlite3"],
  async headers() {
    return [
      // Generierte Spiele bringen ihre eigene, strengere CSP im Route-Handler mit
      // (keine externen Requests) — hier nur die restlichen Header.
      {
        source: "/g/:code/play",
        headers: securityHeaders.filter((h) => h.key !== "Content-Security-Policy"),
      },
      { source: "/((?!g/[^/]+/play).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
