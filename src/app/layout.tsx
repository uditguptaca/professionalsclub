import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
// Loaded after globals.css on purpose: the editorial layer redefines the shared
// primitives and needs to win at equal specificity. See the header of that file.
import "./editorial.css";
import { AppProvider } from "@/context/app-context";
import { PortalProvider } from "@/context/portal-context";
import { MatrimonyProvider } from "@/context/matrimony-context";
import { getCurrentProfile } from "@/server/auth";

/**
 * Typefaces, self-hosted by next/font.
 *
 * Replaces a render-blocking Google Fonts @import of Inter + Outfit. Inter is
 * the default-issue AI sans and Outfit was carrying display duty without much
 * character, so this is an editorial pairing instead:
 *
 *   Fraunces  — variable soft serif for display. Warm, slightly quirky, and it
 *               reads as a considered publication rather than a template. Only
 *               used on marketing surfaces; the portal keeps a sans for headings
 *               because a serif fights dense tabular UI.
 *   Manrope   — humanist geometric sans for body copy. Warmer than Inter at the
 *               same legibility.
 *   JetBrains — tabular figures for case references, counts and money.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-src',
  axes: ['SOFT', 'WONK'],
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans-src',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-src',
});

/**
 * The root layout resolves the session, which reads cookies, so no route can be
 * statically prerendered. Declaring it here stops Next attempting a static pass
 * that is guaranteed to bail out, and keeps the build log free of
 * DYNAMIC_SERVER_USAGE noise.
 *
 * Nothing is lost: every page in this app already renders per-request.
 */
export const dynamic = 'force-dynamic';

/**
 * Viewport for the WebView app builds: viewport-fit=cover lets the layout use
 * the full screen on notched phones (the chrome pads itself with
 * env(safe-area-inset-*)), and themeColor tints the system status bar to the
 * portal green.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f2318',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://professionalsclub.ca';

/**
 * Shared metadata.
 *
 * The site previously had no Open Graph or Twitter card data at all, so every
 * shared link rendered as a bare URL with no title, description or image.
 * `title.template` means each page can set a short title and still get the brand
 * suffix.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Professionals Club — Careers, settlement and community for newcomers in Canada",
    template: "%s · Professionals Club",
  },
  description:
    "Job referrals, settlement guidance and mentorship for newcomers to Canada. Free, human help from people who have been there.",
  keywords: [
    "Canada newcomers", "settlement support", "job referrals",
    "career mentorship", "professional community", "newcomer jobs Canada",
  ],
  openGraph: {
    type: 'website',
    siteName: 'Professionals Club',
    locale: 'en_CA',
    url: SITE_URL,
    title: "Careers, settlement and community for newcomers in Canada",
    description:
      "Job referrals, settlement guidance and mentorship. Free, human help from people who have been there.",
    images: [{
      url: '/img/community-hall-1.jpg',
      width: 1800,
      height: 1200,
      alt: 'Members of Professionals Club talking around a table at a community meetup',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Careers, settlement and community for newcomers in Canada",
    description: "Job referrals, settlement guidance and mentorship for newcomers to Canada.",
    images: ['/img/community-hall-1.jpg'],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolved server-side so client components never have to guess who is signed
  // in, and so a signed-out visitor never briefly renders as signed in.
  const profile = await getCurrentProfile();

  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${mono.variable}`}>
      <body>
        {/* Keyboard users need a way past the nav; visually hidden until focused. */}
        <a href="#main" className="skip-link">Skip to content</a>

        {/* Fixed grain overlay. Breaks the digital flatness of large cream areas
            without costing a repaint — it never receives pointer events. */}
        <div className="grain" aria-hidden="true" />

        <AppProvider initialProfile={profile}>
          <PortalProvider>
            <MatrimonyProvider>
              {children}
            </MatrimonyProvider>
          </PortalProvider>
        </AppProvider>
      </body>
    </html>
  );
}
