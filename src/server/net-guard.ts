import 'server-only';
import { lookup as dnsLookup, promises as dns, type LookupAddress } from 'node:dns';
import { isIP } from 'node:net';

/**
 * "Is this an address the server may connect to on somebody's behalf?"
 *
 * One answer for every place the server fetches a URL a person typed: chat
 * link previews (a member), the job-board feed and link check (a curator or
 * admin). The private ranges, the internal hostnames and the DNS check live
 * here once so the three cannot drift apart.
 */

export function privateV4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return p[0] === 0 || p[0] === 10 || p[0] === 127
    || (p[0] === 100 && p[1] >= 64 && p[1] <= 127)
    || (p[0] === 169 && p[1] === 254)
    || (p[0] === 172 && p[1] >= 16 && p[1] <= 31)
    || (p[0] === 192 && p[1] === 168)
    || (p[0] === 192 && p[1] === 0 && (p[2] === 0 || p[2] === 2))
    || (p[0] === 198 && (p[1] === 18 || p[1] === 19))
    || p[0] >= 224;
}

/** Only plain global-unicast IPv6 (2000::/3) is public. Everything else, including every IPv4 embedding, is not. */
export function privateV6(ip: string): boolean {
  const first = ip.toLowerCase().replace(/^\[|\]$/g, '').split(':')[0];
  if (first === '') return true; // ::, ::1, ::ffff:..., ::a.b.c.d
  const n = parseInt(first, 16);
  if (Number.isNaN(n)) return true;
  return !(n >= 0x2000 && n <= 0x3fff);
}

export function privateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return privateV4(ip);
  if (v === 6) return privateV6(ip);
  return true;
}

export function hostnameLooksInternal(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  return h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.arpa') || !h.includes('.');
}

/**
 * node's `lookup` hook: resolve, refuse if ANY returned address is private,
 * and hand the socket exactly what was checked. Handles both the single
 * answer and the `all: true` array form newer Node versions ask for.
 */
export const guardedLookup: typeof dnsLookup = ((hostname: string, options: unknown, callback: (...args: unknown[]) => void) => {
  const cb = typeof options === 'function' ? (options as (...a: unknown[]) => void) : callback;
  const opts = typeof options === 'function' ? {} : (options as Record<string, unknown>);
  dnsLookup(hostname, opts as never, ((err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => {
    if (err) return cb(err, address, family);
    const list = Array.isArray(address) ? address.map((a) => a.address) : [address];
    if (list.length === 0 || list.some((a) => privateIp(a))) {
      const e = new Error('Address not allowed') as NodeJS.ErrnoException;
      e.code = 'EACCES';
      return cb(e, address, family);
    }
    cb(null, address, family);
  }) as never);
}) as unknown as typeof dnsLookup;

/** Refuses before any connection: not http(s), credentials in the URL, an internal name or a private literal. */
export function refuseUrl(url: URL): string | null {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Only http and https links';
  if (url.username || url.password) return 'Links with credentials are not fetched';
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) ? privateIp(host) : hostnameLooksInternal(host)) return 'Address not allowed';
  return null;
}

/**
 * Resolve the name and refuse if any answer is private. Where a socket-level
 * `lookup` hook is not available (global fetch), this is the check.
 *
 * ponytail: a name could answer differently to this lookup and to fetch's own
 * a moment later. That window is why /api/link-preview uses guardedLookup on a
 * raw request instead; here the callers are cron jobs whose only output is a
 * status code, and the check closes the "point the cron at 10.0.0.1" door.
 */
export async function assertPublicUrl(url: URL): Promise<void> {
  const refused = refuseUrl(url);
  if (refused) throw new Error(refused);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return;
  const answers = await dns.lookup(host, { all: true });
  if (answers.length === 0 || answers.some((a) => privateIp(a.address))) throw new Error('Address not allowed');
}

/** fetch() that vets every hop of a redirect chain instead of following blindly. */
export async function guardedFetch(input: string, init: RequestInit = {}, maxHops = 3): Promise<Response> {
  let url = new URL(input);
  for (let hop = 0; ; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, { ...init, redirect: 'manual' });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location && hop < maxHops) {
      url = new URL(location, url);
      continue;
    }
    return res;
  }
}
