import { NextResponse, type NextRequest } from 'next/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { requireUserId } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Link previews for chat, the way WhatsApp and Signal do them: the SENDER's
 * device asks for the page's Open Graph card while typing, and the card then
 * travels inside the end-to-end encrypted message. The server sees a URL and a
 * signed-in member, never the message; the recipient's device fetches nothing.
 *
 * This is also the one place the server fetches an arbitrary URL on a member's
 * behalf, so it is deliberately narrow: signed-in members only, http(s) only,
 * every hop resolved and refused when it lands on a private, loopback or
 * link-local address (no poking at the database host or metadata endpoints),
 * three redirects, six seconds, and the first 512 KB of HTML.
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

function privateV4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  return p[0] === 0 || p[0] === 10 || p[0] === 127
    || (p[0] === 100 && p[1] >= 64 && p[1] <= 127)
    || (p[0] === 169 && p[1] === 254)
    || (p[0] === 172 && p[1] >= 16 && p[1] <= 31)
    || (p[0] === 192 && p[1] === 168)
    || p[0] >= 224;
}

function privateIp(ip: string): boolean {
  if (isIP(ip) === 4) return privateV4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb');
}

async function hostAllowed(hostname: string): Promise<boolean> {
  const h = hostname.replace(/^\[|\]$/g, '');
  if (isIP(h)) return !privateIp(h);
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
  try {
    const addrs = await lookup(h, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
  } catch {
    return false;
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16)) || m;
    if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10)) || m;
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

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  void reader.cancel().catch(() => {});
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf);
}

const clip = (s: string | undefined, n: number) => (s ? s.slice(0, n) : undefined);
const siteOf = (u: URL) => u.hostname.replace(/^www\./, '');

export async function GET(request: NextRequest): Promise<NextResponse> {
  try { await requireUserId(); } catch { return NextResponse.json({ ok: false }, { status: 401 }); }

  let url: URL;
  try { url = new URL(request.nextUrl.searchParams.get('url') ?? ''); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await hostAllowed(url.hostname))) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    let current = url;
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      res = await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml;q=0.9,image/*;q=0.5,*/*;q=0.1', 'accept-language': 'en-CA,en;q=0.8' },
      });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = new URL(loc, current);
        if ((next.protocol !== 'http:' && next.protocol !== 'https:') || !(await hostAllowed(next.hostname))) {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
        current = next;
        res = null;
        continue;
      }
      break;
    }
    if (!res || !res.ok) return NextResponse.json({ ok: false });

    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    // A link straight to a picture is its own preview.
    if (type.startsWith('image/')) {
      void res.body?.cancel().catch(() => {});
      const preview: LinkPreviewPayload = { url: url.href, image: current.href, siteName: siteOf(current) };
      return NextResponse.json({ ok: true, preview }, { headers: { 'cache-control': 'private, max-age=3600' } });
    }
    if (!type.includes('html')) { void res.body?.cancel().catch(() => {}); return NextResponse.json({ ok: false }); }

    const html = await readCapped(res);
    const meta = metaTags(html);
    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
    const title = clip(meta.get('og:title') ?? meta.get('twitter:title') ?? (titleTag ? decodeEntities(titleTag) : undefined), 160);
    const description = clip(meta.get('og:description') ?? meta.get('twitter:description') ?? meta.get('description'), 300);
    let image: string | undefined;
    const rawImage = meta.get('og:image') ?? meta.get('og:image:url') ?? meta.get('og:image:secure_url') ?? meta.get('twitter:image') ?? meta.get('twitter:image:src');
    if (rawImage) {
      try {
        const img = new URL(rawImage, current);
        if (img.protocol === 'https:' || img.protocol === 'http:') image = clip(img.href, 1000);
      } catch { image = undefined; }
    }
    if (!title && !description && !image) return NextResponse.json({ ok: false });

    const preview: LinkPreviewPayload = {
      url: url.href.slice(0, 2000),
      title,
      description,
      image,
      siteName: clip(meta.get('og:site_name'), 80) || siteOf(current),
    };
    return NextResponse.json({ ok: true, preview }, { headers: { 'cache-control': 'private, max-age=3600' } });
  } catch {
    // Timeouts, refused connections, bad TLS: no card, and never an error the
    // composer has to show - a preview is a nicety.
    return NextResponse.json({ ok: false });
  }
}
