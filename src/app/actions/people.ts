'use server';

import { requireUserId } from '@/server/auth';
import * as repo from '@/server/repos/people';

/**
 * The member profile screen's one read. Like every action here the caller is
 * resolved from the session, never passed in, and the 0041 views decide what
 * a member is allowed to learn about another member.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchMemberProfile(memberId: string) {
  try {
    const userId = await requireUserId();
    if (typeof memberId !== 'string' || memberId.length !== 36) {
      return { ok: false as const, error: 'That member could not be found.' };
    }
    const data = await repo.memberProfile(userId, memberId);
    if (!data) return { ok: false as const, error: 'That member could not be found.' };
    return { ok: true as const, data };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[people] Loading profile:', detail);
    if (detail.startsWith('Not signed in') || detail.startsWith('This account is not active')) {
      return { ok: false as const, error: detail };
    }
    return { ok: false as const, error: 'Loading that profile failed. Please try again.' };
  }
}
