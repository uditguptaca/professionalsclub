'use server';

import { requireUserId } from '@/server/auth';
import * as repo from '@/server/repos/people';
import { listMemberPosts } from '@/server/repos/community';
import type { CommunityPost } from '@/types';

/**
 * The member profile screen's reads. Like every action here the caller is
 * resolved from the session, never passed in, and the 0041/0051 views and
 * can_view_member() decide what a member is allowed to learn about another.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const isId = (v: unknown): v is string => typeof v === 'string' && v.length === 36;

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[people] ${context}:`, detail);
  if (detail.startsWith('Not signed in') || detail.startsWith('This account is not active')) {
    return { ok: false, error: detail };
  }
  return { ok: false, error: `${context} failed. Please try again.` };
}

export async function fetchMemberProfile(memberId: string): Promise<ActionResult<repo.MemberProfile>> {
  try {
    const userId = await requireUserId();
    if (!isId(memberId)) return { ok: false, error: 'That member could not be found.' };
    const data = await repo.memberProfile(userId, memberId);
    if (!data) return { ok: false, error: 'That member could not be found.' };
    return { ok: true, data };
  } catch (error) {
    return fail('Loading that profile', error);
  }
}

/**
 * A member's posts, oldest-cursor paged. Empty for a private profile the
 * caller does not follow - the database says so, not this file.
 */
export async function fetchMemberPosts(
  memberId: string,
  before?: string | null
): Promise<ActionResult<CommunityPost[]>> {
  try {
    const userId = await requireUserId();
    if (!isId(memberId)) return { ok: true, data: [] };
    const cursor = typeof before === 'string' && !Number.isNaN(Date.parse(before)) ? before : null;
    return { ok: true, data: await listMemberPosts(userId, memberId, cursor) };
  } catch (error) {
    return fail('Loading their posts', error);
  }
}
