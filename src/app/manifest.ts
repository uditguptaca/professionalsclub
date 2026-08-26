import type { MetadataRoute } from 'next';

/**
 * The web app manifest - what makes the site installable from a browser
 * ("Add to Home screen" / the install icon in the address bar).
 *
 * start_url is the portal entry: an installed app is a member tool, and
 * /portal/auth bounces a signed-in member straight to their dashboard (the
 * same front door the native shells use). The marketing site stays reachable,
 * it is just not what the installed icon opens.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Professionals Club',
    short_name: 'Pro Club',
    description:
      'Careers, settlement and community for newcomers to Canada - events, jobs, referrals and member offers, city by city.',
    id: '/portal/auth',
    start_url: '/portal/auth',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFF7ED',
    theme_color: '#0f2318',
    icons: [
      { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
