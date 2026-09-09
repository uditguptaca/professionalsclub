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
/**
 * Where the shell points. Production by default; `CAP_SERVER_URL` overrides it
 * for a device build against the dev server:
 *
 *   npm run app:dev        (bridges adb, builds, installs, launches)
 *
 * This exists because the alternative is hand-editing the URL before a build
 * and remembering to put it back. That went wrong once already: an APK built
 * against localhost was installed while the committed config said production,
 * and the emulator then looked like it was ignoring code changes.
 */
const SERVER_URL =
  process.env.CAP_SERVER_URL ?? 'https://professionalsclub.vercel.app/portal/member/dashboard';

const config: CapacitorConfig = {
  appId: 'ca.professionalsclub.app',
  appName: 'Professionals Club',
  webDir: 'mobile/www',
  server: {
    // The app starts on the DASHBOARD, not /portal/auth. The native login is
    // the front door on both shells, so the WebView never needs the web
    // sign-in page - and pointing the start URL at it was actively harmful:
    // both shells read "the WebView is on /portal/auth" as "this member signed
    // out", so the very first navigation of every launch was the same URL that
    // means sign-out, and only the proxy's 307 kept it from being read that
    // way. Starting at the dashboard makes /portal/auth reachable only by the
    // proxy actually redirecting there, which is exactly what it should mean.
    url: SERVER_URL,
    errorPath: 'error.html',
    androidScheme: 'https',
    allowNavigation: [
      'localhost',
      '10.0.2.2',
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
