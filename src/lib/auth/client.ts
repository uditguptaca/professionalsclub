'use client';
import { createAuthClient } from '@neondatabase/auth/next';

/**
 * Browser-side auth client. Talks to /api/auth/*, never to Neon directly.
 *
 * Only sign-in, sign-up and sign-out belong here. Anything that decides what a
 * user may see or do runs on the server.
 */
export const authClient = createAuthClient();
