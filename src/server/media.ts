import 'server-only';
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
  const fromBlob = OUR_STORE
    ? url.startsWith(`https://${OUR_STORE}.public.blob.vercel-storage.com/`)
    : /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/./i.test(url);
  const exts = kind === 'attachment' ? 'jpg|jpeg|png|webp|gif|mp4|webm|mov|pdf|doc|docx' : 'jpg|jpeg|png|webp|gif|mp4|webm|mov';
  const fromDev = new RegExp(`^/uploads/[a-z0-9]+\\.(${exts})$`, 'i').test(url);
  return fromBlob || fromDev;
}

/** A single image URL a business or curator typed or uploaded; null clears it. */
export function assertOurImage(url: unknown, label = 'image'): void {
  if (url == null || url === '') return;
  if (typeof url !== 'string' || !isOurUpload(url, 'media')) {
    throw new Error(`Please keep it — that ${label} must be uploaded here, not linked from another site.`);
  }
}

export function sanitizeMedia(media: unknown): CommunityMedia[] {
  if (!Array.isArray(media) || media.length === 0) return [];
  const items = media.slice(0, 4).map((m) => {
    const url = typeof m?.url === 'string' ? m.url : '';
    const type = m?.type === 'video' ? 'video' as const : 'image' as const;
    if (!isOurUpload(url, 'media')) throw new Error('Please keep it — that media upload was not recognised.');
    return { url, type };
  });
  const videos = items.filter((m) => m.type === 'video');
  if (videos.length > 1 || (videos.length === 1 && items.length > 1)) {
    throw new Error('Please keep it — a post can carry up to four photos or one video.');
  }
  return items;
}
