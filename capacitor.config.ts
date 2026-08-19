import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The store-published apps are thin native shells around the hosted portal:
 * the WebView loads the production site directly, so every deploy updates the
 * app without a store release. mobile/www holds only the offline fallback
 * page shown when the site cannot be reached.
 *
 * When professionalsclub.ca goes live, change server.url (and hostname) and
 * ship an app update.
 */
const config: CapacitorConfig = {
  appId: 'ca.professionalsclub.app',
  appName: 'Professionals Club',
  webDir: 'mobile/www',
  server: {
    // The app starts INSIDE the portal, not on the marketing homepage: the
    // /portal/auth entry point shows sign-in to a signed-out user and bounces
    // a signed-in one straight to their dashboard (the proxy handles that).
    url: 'https://professionalsclub.vercel.app/portal/auth',
    errorPath: 'error.html',
    androidScheme: 'https',
    allowNavigation: [
      'professionalsclub.vercel.app',
      'professionalsclub.ca',
      'www.professionalsclub.ca',
      '*.neonauth.c-5.us-east-2.aws.neon.tech',
    ],
  },
  android: {
    backgroundColor: '#0f2318',
  },
  ios: {
    backgroundColor: '#0f2318',
    contentInset: 'never',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f2318',
      overlaysWebView: false,
    },
  },
};

export default config;
