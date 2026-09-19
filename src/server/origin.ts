import 'server-only';
import { headers } from 'next/headers';

/**
 * The one configured site URL, for anything built outside a request: email
 * bodies, QR codes, calendar files, the SMS trigger (published as
 * app.site_url). Three different defaults for the same site is how the text
 * message ended up pointing at the vercel.app host.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || 'https://professionalsclub.ca');

/**
 * The origin to put in links we email out (verification callbacks, business
 * invitations). In production this is the configured site URL: a link built
 * from the request's Host header would follow a forged header straight to an
 * attacker's domain. The header is only consulted where there is no
 * configured URL, which is development.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured && process.env.NODE_ENV === 'production') return configured;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return configured || `${proto}://${host}`;
}
