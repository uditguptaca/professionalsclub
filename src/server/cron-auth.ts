import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. With no secret set
 * the routes refuse to run rather than default to open: they do privileged
 * work with no user attached. Compared in constant time; `===` gives up at the
 * first wrong byte.
 */
export function cronAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
