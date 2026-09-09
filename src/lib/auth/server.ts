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
     * every page load and Server Action asked the auth service to re-validate.
     * Each of those calls is a chance to fail, and a failure reads as "signed
     * out" (see the proxy) - which on a phone is a member typing their password
     * again. An hour of cache turns that from a per-request dice roll into a
     * per-hour one, and lets the app ride out short connectivity gaps.
     *
     * Ceiling: a session revoked elsewhere stays usable here for up to an hour.
     * That is acceptable because it only buys a stale SESSION - role and
     * account_status are re-read from profiles on every query and enforced by
     * RLS underneath, so a demoted or suspended member loses access immediately
     * regardless. Lower this if revocation latency ever matters more.
     */
    sessionDataTtl: 3600,
  },
});
