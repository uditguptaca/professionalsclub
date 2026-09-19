import { NextResponse, type NextRequest } from 'next/server';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { requireUserId } from '@/server/auth';
import { allow } from '@/server/rate-limit';
import { guardedLookup, hostnameLooksInternal, privateIp } from '@/server/net-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Link previews for chat, the way WhatsApp and Signal do them: the SENDER's
 * device asks for the page's Open Graph card while typing, and the card then
 * travels inside the end-to-end encrypted message. The server sees a URL and a
 * signed-in member, never the message; the recipient's device fetches nothing.
 *
 * This is the one place the server fetches an arbitrary URL on a member's
 * behalf, so it is deliberately narrow: signed-in members only, sixty a
 * minute each, http(s) only, three redirects, six seconds, the first 512 KB of
 * HTML - and every connection is made to an address this file vetted itself.
 * The DNS lookup that decides "public address" is the same lookup the socket
 * connects to (node's `lookup` option), so a name cannot answer one thing to
 * the check and another to the connection. IPv6 is admitted only as plain
 * global unicast: every mapped, embedded, link-local or site-local form is
 * refused rather than parsed.
 */

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 6000;
const MAX_HOPS = 3;
const UA = 'Mozilla/5.0 (compatible; ProfessionalsClubLinkPreview/1.0; +https://professionalsclub.vercel.app)';

export interface LinkPreviewPayload {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName: string;
}

interface Fetched { status: number; headers: http.IncomingHttpHeaders; body: string; finalUrl: URL }

/** One guarded request. Redirects are followed by the caller so every hop is vetted. */
function guardedGet(url: URL): Promise<{ status: number; headers: http.IncomingHttpHeaders; res: http.IncomingMessage }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(url, {
      method: 'GET',
      lookup: guardedLookup,
      timeout: TIMEOUT_MS,
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml;q=0.9,image/*;q=0.5,*/*;q=0.1',
        'accept-language': 'en-CA,en;q=0.8',
      },
    }, (res) => resolve({ status: res.statusCode ?? 0, headers: res.headers, res }));
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function readCapped(res: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of res) {
    const buf = chunk as Buffer;
    chunks.push(buf);
    total += buf.byteLength;
    if (total >= MAX_BYTES) { res.destroy(); break; }
  }
  return Buffer.concat(chunks).subarray(0, MAX_BYTES).toString('utf8');
}

async function fetchPage(start: URL): Promise<Fetched | null> {
  let current = start;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if ((current.protocol !== 'http:' && current.protocol !== 'https:') || hostnameLooksInternal(current.hostname)) return null;
    if (isIP(current.hostname.replace(/^\[|\]$/g, '')) && privateIp(current.hostname.replace(/^\[|\]$/g, ''))) return null;
    const { status, headers, res } = await guardedGet(current);
    const loc = headers.location;
    if (status >= 300 && status < 400 && loc) {
      res.destroy();
      let next: URL;
      try { next = new URL(loc, current); } catch { return null; }
      current = next;
      continue;
    }
    if (status < 200 || status >= 300) { res.destroy(); return null; }
    const type = String(headers['content-type'] ?? '').toLowerCase();
    if (type.startsWith('image/')) { res.destroy(); return { status, headers, body: '', finalUrl: current }; }
    if (!type.includes('html')) { res.destroy(); return null; }
    return { status, headers, body: await readCapped(res), finalUrl: current };
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    try {
      if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16)) || m;
      if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10)) || m;
    } catch { return m; }
    return ENTITIES[k] ?? m;
  }).replace(/\s+/g, ' ').trim();
}

/** Every <meta> tag's (property|name) -> content, first one wins. */
function metaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  const tag = /<meta\s+([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html)) !== null) {
    const attrs = m[1];
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]?.toLowerCase();
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1];
    if (key && content != null && !out.has(key)) out.set(key, decodeEntities(content));
  }
  return out;
}

const clip = (s: string | undefined, n: number) => (s ? s.slice(0, n) : undefined);
const siteOf = (u: URL) => u.hostname.replace(/^www\./, '');
const refuse = (status = 400) => NextResponse.json({ ok: false }, { status });

export async function GET(request: NextRequest): Promise<NextResponse> {
  let userId: string;
  try { userId = await requireUserId(); } catch { return refuse(401); }
  if (!allow('link-preview', userId, 60, 60_000)) return refuse(429);

  let url: URL;
  try { url = new URL(request.nextUrl.searchParams.get('url') ?? ''); } catch { return refuse(); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return refuse();
  if (url.username || url.password) return refuse();
  const bare = url.hostname.replace(/^\[|\]$/g, '');
  if (hostnameLooksInternal(url.hostname) || (isIP(bare) && privateIp(bare))) return refuse();

  try {
    const page = await fetchPage(url);
    if (!page) return NextResponse.json({ ok: false });

    const type = String(page.headers['content-type'] ?? '').toLowerCase();
    if (type.startsWith('image/')) {
      // A link straight to a picture is its own preview.
      const preview: LinkPreviewPayload = { url: url.href, image: page.finalUrl.href, siteName: siteOf(page.finalUrl) };
      return NextResponse.json({ ok: true, preview }, { headers: { 'cache-control': 'private, max-age=3600' } });
    }

    const meta = metaTags(page.body);
    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(page.body)?.[1];
    const title = clip(meta.get('og:title') ?? meta.get('twitter:title') ?? (titleTag ? decodeEntities(titleTag) : undefined), 160);
    const description = clip(meta.get('og:description') ?? meta.get('twitter:description') ?? meta.get('description'), 300);
    let image: string | undefined;
    const rawImage = meta.get('og:image') ?? meta.get('og:image:url') ?? meta.get('og:image:secure_url') ?? meta.get('twitter:image') ?? meta.get('twitter:image:src');
    if (rawImage) {
      try {
        const img = new URL(rawImage, page.finalUrl);
        if (img.protocol === 'https:' || img.protocol === 'http:') image = clip(img.href, 1000);
      } catch { image = undefined; }
    }
    if (!title && !description && !image) return NextResponse.json({ ok: false });

    const preview: LinkPreviewPayload = {
      url: url.href.slice(0, 2000),
      title,
      description,
      image,
      siteName: clip(meta.get('og:site_name'), 80) || siteOf(page.finalUrl),
    };
    return NextResponse.json({ ok: true, preview }, { headers: { 'cache-control': 'private, max-age=3600' } });
  } catch {
    // Timeouts, refused connections, refused addresses, bad TLS: no card, and
    // never an error the composer has to show - a preview is a nicety.
    return NextResponse.json({ ok: false });
  }
}
