import { auth } from '@/lib/auth/server';

/**
 * Neon Auth endpoints (sign-in, sign-up, sign-out, session, token refresh).
 *
 * The client SDK posts here; this handler proxies to the Neon Auth instance and
 * manages the signed session cookie. Nothing else should mint or read that
 * cookie directly.
 */
export const { GET, POST } = auth.handler();
