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
export function sanitizeMedia(media: unknown): CommunityMedia[] {
  if (!Array.isArray(media) || media.length === 0) return [];
  const items = media.slice(0, 4).map((m) => {
    const url = typeof m?.url === 'string' ? m.url : '';
    const type = m?.type === 'video' ? 'video' as const : 'image' as const;
    const fromBlob = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(url);
    const fromDev = /^\/uploads\/[a-z0-9]+\.(jpg|png|webp|gif|mp4|webm|mov)$/.test(url);
    if (!fromBlob && !fromDev) throw new Error('Please keep it — that media upload was not recognised.');
    return { url, type };
  });
  const videos = items.filter((m) => m.type === 'video');
  if (videos.length > 1 || (videos.length === 1 && items.length > 1)) {
    throw new Error('Please keep it — a post can carry up to four photos or one video.');
  }
  return items;
}
