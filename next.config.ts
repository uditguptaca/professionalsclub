import type { NextConfig } from "next";

/**
 * Security headers, applied to every route.
 *
 * These are table stakes for the store-published WebView builds: Apple's App
 * Store Review (5.1 Data Collection and Storage) and Google Play's User Data
 * policy both expect transport security and defence-in-depth on the web
 * content the app ships. They cost nothing on the website either.
 *
 * The CSP is intentionally pragmatic: Next inlines bootstrap scripts and this
 * codebase uses inline styles heavily, so 'unsafe-inline' stays. The clauses
 * that matter most here are frame-ancestors (nobody may embed the portal),
 * object-src, and base-uri.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self'",
      // What WE may embed. Without this clause default-src 'self' applied, and
      // it silently blanked both embeds we actually ship: the resume builder on
      // /build-resume and every video on /youtube. This is the whole list —
      // frame-ancestors below still stops anyone embedding us.
      "frame-src 'self' https://writecv.io https://www.youtube.com https://www.youtube-nocookie.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Dev-only: lets a phone or the Android emulator load this dev server's
  // assets. Without it, Next serves the HTML but blocks /_next/* cross-origin,
  // so nothing hydrates and every button on the page is dead. Ignored in
  // production builds.
  allowedDevOrigins: ['192.168.1.3', '10.0.2.2', '192.168.1.10'],

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
