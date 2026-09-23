import { upload } from '@vercel/blob/client';

/**
 * The one Blob upload path for the browser.
 *
 * Six copies of this handshake had grown (community, matrimony, chats, the
 * business console, the event editor, attachments); the matrimony copy's own
 * comment asked for a shared helper at the third. They are here now, and so is
 * the thing none of them did: photos are downscaled on the device before they
 * leave it. A 4000x3000 JPEG business logo (2.7 MB) was being served, as
 * uploaded, into a 42 px badge on every member's dashboard - members on a
 * per-gigabyte data plan paid for that on every visit.
 *
 * `kind` is the upload route's clientPayload: it picks the MIME allowlist and
 * the size cap on the server (src/app/api/community/upload/route.ts).
 * Documents are never re-encoded: a scan of paperwork must stay legible, and a
 * PDF is not an image.
 */
export type UploadKind = 'image' | 'video' | 'document';

/** Long edge after downscaling. Ample for a full-width phone photo at 3x. */
const MAX_EDGE = 2000;
/** Below this, an image already within MAX_EDGE is sent as-is. */
const SMALL_ENOUGH = 400 * 1024;

const encode = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Downscale a photo to MAX_EDGE and re-encode it as WebP (JPEG or PNG where
 * the browser cannot write WebP - Safari keeps PNG so a logo's transparency
 * survives). Returns the original when it is already small, is a GIF (an
 * animation would be flattened), or when re-encoding would not make it
 * smaller. Never throws: any decoding failure hands the original back.
 */
export async function shrinkImage(file: File, maxEdge = MAX_EDGE): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < SMALL_ENOUGH) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob = await encode(canvas, 'image/webp', 0.85);
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      const keepAlpha = file.type === 'image/png';
      blob = keepAlpha ? await encode(canvas, 'image/png') : await encode(canvas, 'image/jpeg', 0.85);
      ext = keepAlpha ? 'png' : 'jpg';
    }
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type: blob.type });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/**
 * Upload one file and return its public URL. Photos go through shrinkImage()
 * first. With no Blob store configured (a laptop without the token) the
 * dev-only local-disk endpoint takes the file instead; it 404s in production,
 * in which case the original Blob error is the truth worth surfacing.
 */
export async function uploadToBlob(
  file: File,
  kind: UploadKind,
  opts: { prefix?: string; onPct?: (pct: number) => void } = {}
): Promise<string> {
  const body = kind === 'image' ? await shrinkImage(file) : file;
  const name = opts.prefix ? `${opts.prefix}/${body.name}` : body.name;
  try {
    const blob = await upload(name, body, {
      access: 'public',
      handleUploadUrl: '/api/community/upload',
      clientPayload: kind,
      onUploadProgress: opts.onPct ? (e) => opts.onPct?.(Math.min(99, Math.round(e.percentage))) : undefined,
    });
    return blob.url;
  } catch (error) {
    const form = new FormData();
    form.append('file', body);
    const res = await fetch('/api/community/upload-dev', { method: 'POST', body: form });
    if (res.status === 404) throw error;
    if (!res.ok) throw new Error('Upload failed');
    const data = (await res.json()) as { url: string };
    return data.url;
  }
}
