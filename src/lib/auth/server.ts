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
  },
});
