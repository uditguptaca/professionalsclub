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
      // No 'unsafe-eval': nothing in the production bundle evaluates strings,
      // and it is the primitive that turns an injected string into code.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Any https host, deliberately: chat link cards show the linked page's
      // own picture and company logos are admin-typed URLs. That does leave an
      // injected script a GET it could put data into (Round 3, L4); the fix is
      // a same-origin image proxy, not a narrower list that blanks the cards.
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // The browser talks to us and to Blob storage (client uploads). Nothing
      // else - an injected script has nowhere to send what it reads.
      //
      // @vercel/blob/client 2.x does not PUT to *.blob.vercel-storage.com: it
      // PUTs to https://vercel.com/api/blob/ with the token our route signs,
      // and the stored file then lives on the storage host. Without that path
      // here every browser upload (post photos, matrimony photos, business
      // logos, chat attachments, help-desk documents) was refused by our own
      // header - the store's last upload is dated two days before this list
      // was introduced. The path is a prefix match, so /api/blob/mpu (multipart)
      // is covered and the rest of vercel.com is not.
      "connect-src 'self' https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://vercel.com/api/blob/",
      // Post videos and chat clips play from Blob; blob: is the composer's own preview.
      "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
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
    // camera=(self): the coupon scanner. An empty list would deny the camera to
    // this origin too, before the browser ever asked the member.
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

/**
 * Our Blob store's hostname, read off the token the same way isOurUpload() in
 * src/server/media.ts does (vercel_blob_rw_<STOREID>_<secret>). Every upload
 * a member or business can make lands on this one host, so it is the only
 * remote host the image optimiser may fetch from. The same value is inlined
 * for the client (it is public already: it is in every image URL we store) so
 * BlobImage knows which URLs may go through next/image without a runtime
 * "hostname is not configured" throw for anything else.
 */
const BLOB_STORE_ID = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/)?.[1]?.toLowerCase();
const BLOB_HOST = BLOB_STORE_ID ? `${BLOB_STORE_ID}.public.blob.vercel-storage.com` : null;

/**
 * /public images are not content-hashed (a re-exported /logo.png keeps its
 * name), so they must never be `immutable`: a week fresh, then a month of
 * stale-while-revalidate. Before this they went out as `max-age=0` and a
 * repeat visit was 37 conditional requests for pictures that had not changed.
 * _next/static is excluded because Next owns its (hashed, immutable) headers.
 */
const PUBLIC_IMAGE_SOURCE = '/:path((?!_next/).*\\.(?:png|webp|jpe?g|gif|svg|ico))';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: BLOB_HOST ? { NEXT_PUBLIC_BLOB_HOST: BLOB_HOST } : {},

  /**
   * Uploaded images used to be served at their original size: a 4000x3000
   * business logo (2.7 MB) rendered in a 42px badge. With no `images` block
   * next/image had no remote host to work with, so every Blob URL fell back
   * to a plain <img>. AVIF first, WebP second, and a year in the optimiser's
   * cache - Blob filenames carry a random suffix, so a URL never changes
   * content.
   */
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: BLOB_HOST ? [{ protocol: 'https', hostname: BLOB_HOST }] : [],
    minimumCacheTTL: 31536000,
  },
  // Dev-only: lets a phone or the Android emulator load this dev server's
  // assets. Without it, Next serves the HTML but blocks /_next/* cross-origin,
  // so nothing hydrates and every button on the page is dead. Ignored in
  // production builds.
  allowedDevOrigins: ['192.168.1.3', '10.0.2.2', '192.168.1.10'],

  /**
   * Client Router Cache lifetimes.
   *
   * Every portal route is force-dynamic (the root layout reads cookies), and
   * Next's default for a dynamic segment is `dynamic: 0` — no client cache at
   * all. So tapping Community, then Jobs, then Community again refetched the
   * RSC payload all three times, on top of whatever data the page asked for.
   *
   * 120s is the window a member actually moves around the tab bar in. It only
   * governs the RSC payload; every page still revalidates its own data through
   * its start action on mount, so nothing here can show stale content for
   * longer than one round trip. `static` is the floor Next allows (>= 30s) and
   * is what router.prefetch() results are held under.
   *
   * Confirmed present in this version: next@16.2.3 declares
   * experimental.staleTimes in server/config-shared.d.ts and validates it in
   * config-schema — see node_modules/next/dist/docs/01-app/03-api-reference/
   * 05-config/01-next-config-js/staleTimes.md.
   */
  experimental: {
    staleTimes: { dynamic: 120, static: 180 },
  },

  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: PUBLIC_IMAGE_SOURCE,
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
      },
    ];
  },
};

export default nextConfig;
