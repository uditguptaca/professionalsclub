import 'server-only';
import { MemberFacingError } from '@/server/errors';
import type { CommunityMedia } from '@/types';

/**
 * What a post may attach.
 *
 * Shared between the member composer and the business composer (0050) so the
 * two cannot drift: media must come from our own blob store (or the dev-only
 * local upload path), at most four photos or one video, nothing else. The URL
 * check is the security half - a post is not allowed to embed an arbitrary
 * remote image, because that is a tracking pixel and a phishing lure in one.
 */
/**
 * Our own Blob store, from the token Vercel issued for it
 * (vercel_blob_rw_<STOREID>_<secret> -> <storeid>.public.blob.vercel-storage.com).
 * "Any Blob store" would let a member point every reader's browser at a store
 * they created themselves, which is a tracking pixel with extra steps. With no
 * token (development) uploads go to /uploads, and any store is tolerated so a
 * dev client can still forward production attachments.
 */
const OUR_STORE = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/)?.[1]?.toLowerCase() ?? null;

/** True for a URL that points at a file we stored. `attachment` also admits documents. */
export function isOurUpload(url: string, kind: 'media' | 'attachment' = 'media'): boolean {
  if (typeof url !== 'string' || /\s/.test(url) || url.length > 1000) return false;
  // With no token in production there is no "our store", so nothing from Blob
  // is ours: failing closed beats "any store on the internet" if the variable
  // is ever dropped from a deployment.
  const fromBlob = OUR_STORE
    ? url.startsWith(`https://${OUR_STORE}.public.blob.vercel-storage.com/`)
    : process.env.NODE_ENV !== 'production'
      && /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/./i.test(url);
  const exts = kind === 'attachment' ? 'jpg|jpeg|png|webp|gif|mp4|webm|mov|pdf|doc|docx' : 'jpg|jpeg|png|webp|gif|mp4|webm|mov';
  const fromDev = new RegExp(`^/uploads/[a-z0-9]+\\.(${exts})$`, 'i').test(url);
  // The extension rule applies to Blob URLs too, not only the dev path.
  const typed = new RegExp(`\\.(${exts})(\\?.*)?$`, 'i').test(url);
  return (fromBlob && typed) || fromDev;
}

/**
 * A link a person typed that will become an href: http(s) only, bounded.
 * React blocks javascript: on its own; nothing blocks data:, vbscript: or a
 * protocol-relative //host, and a mail client rendering the same string
 * blocks nothing. The rule belongs here, once, not in each renderer.
 */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000 || /\s/.test(value)) return false;
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Empty clears the field; anything else must be an http(s) URL. */
export function assertHttpUrl(value: unknown, label = 'link'): void {
  if (value == null || value === '') return;
  if (!isHttpUrl(value)) throw new MemberFacingError(`That ${label} must start with http:// or https://`);
}

/** A plain address: one @, no whitespace, no header separators, bounded. */
export function assertEmailAddress(value: unknown, label = 'email address'): void {
  if (value == null || value === '') return;
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@?&,;:<>"'()]+@[^\s@?&,;:<>"'()]+\.[a-z0-9-]{2,}$/i.test(value)) {
    throw new MemberFacingError(`That ${label} does not look like an email address.`);
  }
}

/** The links and pictures an event carries. Shared by the business, curator and admin write paths. */
export function assertEventLinks(data: Record<string, unknown>): void {
  assertOurImage(data.image, 'event image');
  if (Array.isArray(data.gallery)) for (const g of data.gallery) assertOurImage(g, 'gallery image');
  assertHttpUrl(data.rsvpUrl, 'RSVP link');
  assertHttpUrl(data.onlineUrl, 'join link');
  assertEmailAddress(data.contactEmail, 'contact email');
}

/** A single image URL a business or curator typed or uploaded; null clears it. */
export function assertOurImage(url: unknown, label = 'image'): void {
  if (url == null || url === '') return;
  if (typeof url !== 'string' || !isOurUpload(url, 'media')) {
    throw new MemberFacingError(`Upload that ${label} here rather than linking it from another site.`);
  }
}

export function sanitizeMedia(media: unknown): CommunityMedia[] {
  if (!Array.isArray(media) || media.length === 0) return [];
  const items = media.slice(0, 4).map((m) => {
    const url = typeof m?.url === 'string' ? m.url : '';
    const type = m?.type === 'video' ? 'video' as const : 'image' as const;
    if (!isOurUpload(url, 'media')) throw new MemberFacingError('That upload was not recognised. Try adding the photo again.');
    return { url, type };
  });
  const videos = items.filter((m) => m.type === 'video');
  if (videos.length > 1 || (videos.length === 1 && items.length > 1)) {
    throw new MemberFacingError('A post can carry up to four photos, or one video.');
  }
  return items;
}

/**
 * Remove files from our Blob store once the rows that referenced them are
 * gone. A deleted matrimony photo that stays fetchable at a stable public URL
 * was not deleted; storage also only ever grew. Fire-and-forget: the row is
 * already gone, and a failed delete is a stray file, not a failed request.
 * Only URLs in OUR store are touched (someone else's store is not ours to
 * delete from), and dev-path uploads are left alone.
 */
export function deleteUploads(urls: readonly (string | null | undefined)[]): void {
  const ours = urls.filter((u): u is string => typeof u === 'string' && !!OUR_STORE && u.startsWith(`https://${OUR_STORE}.public.blob.vercel-storage.com/`));
  if (ours.length === 0) return;
  void import('@vercel/blob')
    .then(({ del }) => del(ours, { token: process.env.BLOB_READ_WRITE_TOKEN }))
    .catch((error) => console.warn('[media] blob delete failed:', error instanceof Error ? error.message : error));
}
