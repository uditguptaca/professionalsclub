import 'server-only';
import { createNeonAuth } from '@neondatabase/auth/next/server';

/**
 * Neon Managed Better Auth instance.
 *
 * A module-level singleton: `createNeonAuth` reads the cookie secret once, and
 * creating a second instance per request would re-derive signing keys on every
 * call.
 *
 * Usable from Server Components, Server Actions, Route Handlers and the proxy.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.local.example to .env.local and fill it in from the ` +
        'Neon Console (Auth -> Configuration), then restart the dev server.'
    );
  }
  return value;
}

export const auth = createNeonAuth({
  baseUrl: required('NEON_AUTH_BASE_URL'),
  cookies: {
    secret: required('NEON_AUTH_COOKIE_SECRET'),
    /**
     * The signed session-data cookie defaults to a 5-minute TTL, so almost
     * every page load and Server Action asked the auth service to re-validate
     * (it was raised to an hour once; see the ceiling note).
     * Each of those calls is a chance to fail, and a failure reads as "signed
     * out" (see the proxy) - which on a phone is a member typing their password
     * again. An hour of cache turns that from a per-request dice roll into a
     * per-hour one, and lets the app ride out short connectivity gaps.
     *
     * Ceiling: a session revoked elsewhere (sign-out, password reset, an admin
     * killing it) stays usable here for this long. Round 3 measured the
     * previous hour: a copied cookie pair rendered the member's dashboard 35
     * minutes after they signed out. Two minutes is one upstream call per
     * member per two minutes, and a stolen pair that dies with the sign-out.
     */
    sessionDataTtl: 120,
  },
});
