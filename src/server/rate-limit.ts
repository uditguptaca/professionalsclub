import 'server-only';
import { headers } from 'next/headers';

/**
 * A small sliding-window rate limit for the handful of endpoints that are
 * reachable without a session or that make the server do work on a member's
 * say-so: verification resends, signups, public forms, link previews.
 *
 * ponytail: in-process. Each serverless instance keeps its own counters, so
 * the real ceiling is limit × warm instances. That still turns "unbounded"
 * into "a handful", which is what stops a mail-bomb or a fetch loop. Move the
 * counters to a table (or Vercel Firewall rules) if the club ever gets big
 * enough for the difference to matter.
 */

const hits = new Map<string, number[]>();
let sweeps = 0;

/** True when this key may proceed; false when it has exceeded `limit` in `windowMs`. */
export function allow(bucket: string, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const k = `${bucket}:${key}`;
  const recent = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) { hits.set(k, recent); return false; }
  recent.push(now);
  hits.set(k, recent);
  // Keep the map from growing forever on a long-lived instance.
  if (++sweeps % 500 === 0) {
    for (const [mk, times] of hits) if (times.every((t) => now - t >= windowMs)) hits.delete(mk);
  }
  return true;
}

/** The caller's address as the platform reports it; 'unknown' when it does not. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? 'unknown').split(',')[0].trim() || 'unknown';
}

export const TOO_MANY = 'Too many attempts. Please wait a few minutes and try again.';
