'use server';

import { requireUserId } from '@/server/auth';
import * as repo from '@/server/repos/matrimony-media';
import type { MatrimonyMedia } from '@/types/matrimony';

/**
 * Server Actions for matrimony photos.
 *
 * Same contract as the rest of the matrimony actions: every export is a public
 * HTTP endpoint, so each one re-establishes the caller and none of them takes a
 * profile id. The photo's owner is always the session's own listing.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[matrimony] ${context}:`, detail);

  // Only messages this module and the repository wrote are shown; anything else
  // could be a database error carrying column or constraint names.
  const safe =
    detail.startsWith('Not signed in') ||
    detail.startsWith('This account is not active') ||
    detail.startsWith('Create your profile first') ||
    detail.startsWith('You can add up to') ||
    detail.startsWith('That upload was not recognised');

  return { ok: false, error: safe ? detail : `${context} failed. Please try again.` };
}

/**
 * Only URLs from our own storage are accepted — the public Vercel Blob store or
 * the dev uploads folder. Same check the community module applies, minus the
 * video extensions: a crafted payload must not be able to put a third-party
 * origin into another member's browser.
 */
function assertOurPhotoUrl(url: unknown): string {
  const value = typeof url === 'string' ? url.trim() : '';
  const fromBlob = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(value);
  const fromDev = /^\/uploads\/[a-z0-9]+\.(jpg|png|webp|gif)$/.test(value);
  if (!fromBlob && !fromDev) throw new Error('That upload was not recognised. Please try again.');
  return value;
}

export async function addMatrimonyPhoto(url: string): Promise<ActionResult<MatrimonyMedia>> {
  try {
    const uid = await requireUserId();
    return { ok: true, data: await repo.addPhoto(uid, assertOurPhotoUrl(url)) };
  } catch (error) {
    return fail('Adding the photo', error);
  }
}

export async function removeMatrimonyPhoto(mediaId: string): Promise<ActionResult<null>> {
  try {
    const uid = await requireUserId();
    await repo.removePhoto(uid, mediaId);
    return { ok: true, data: null };
  } catch (error) {
    return fail('Removing the photo', error);
  }
}
