'use server';

import { requireUserId, requireAdminId } from '@/server/auth';
import * as repo from '@/server/repos/community';
import type {
  CommunityGroup, CommunityPost, CommunityComment, CommunityReport,
  CommunityReportTarget, CommunityReportStatus, CommunityMedia,
} from '@/types';

/**
 * Server Actions for the community module.
 *
 * Every export is a public HTTP endpoint. Each one re-establishes the caller
 * (requireUserId / requireAdminId) and never accepts a user id as a parameter
 * — authorship, membership and blocks are all resolved from the session and
 * enforced again by RLS inside the repository transaction.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[action] ${context}:`, detail);
  const expected =
    detail.startsWith('Not signed in') ||
    detail.startsWith('Administrator access required') ||
    detail.startsWith('This account is not active') ||
    detail.startsWith('That group name is taken') ||
    detail.startsWith('Please keep it');
  return { ok: false, error: expected ? detail : `${context} failed. Please try again.` };
}

async function run<T>(context: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return fail(context, error);
  }
}

/**
 * Minimal objectionable-content gate, the first of the three layers the app
 * stores expect for user-generated content (filter, report, block + human
 * moderation). Deliberately short and severe-only: this is a community of
 * adults, and the report queue handles judgement calls a wordlist cannot.
 */
const BLOCKED_TERMS = [
  'kill yourself', 'kys', 'nigger', 'faggot', 'chink', 'paki',
  'send me your password', 'western union transfer',
];

function assertClean(text: string): void {
  const t = text.toLowerCase();
  if (BLOCKED_TERMS.some((w) => t.includes(w))) {
    throw new Error('Please keep it respectful — that language is not allowed here.');
  }
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) +
  '-' + Math.random().toString(36).slice(2, 6);

// ========== FEED ==========

export async function fetchFeed(opts: {
  groupId?: string | null;
  before?: string;
}): Promise<ActionResult<CommunityPost[]>> {
  return run('Loading the feed', async () => {
    const uid = await requireUserId();
    return repo.listFeed(uid, opts);
  });
}

/** The personalised feed: me, people I follow, my groups, plus suggestions. */
export async function fetchPersonalFeed(opts: { before?: string } = {}): Promise<ActionResult<CommunityPost[]>> {
  return run('Loading your feed', async () => {
    const uid = await requireUserId();
    return repo.listPersonalFeed(uid, opts);
  });
}

/** Searchable group directory for the Groups tab. */
export async function fetchGroupsExplore(query = ''): Promise<ActionResult<CommunityGroup[]>> {
  return run('Loading groups', async () => {
    const uid = await requireUserId();
    return repo.exploreGroups(uid, query);
  });
}

/** Groups to weave into the feed as suggestion cards. */
export async function fetchSuggestedGroups(): Promise<ActionResult<CommunityGroup[]>> {
  return run('Loading suggestions', async () => {
    const uid = await requireUserId();
    return repo.suggestedGroups(uid);
  });
}

/**
 * Media pointers are validated hard: only URLs from our own storage (the
 * public Vercel Blob store or the dev uploads folder), correctly typed, and
 * at most four images or one video. A crafted payload cannot make members'
 * browsers load an attacker's origin.
 */
function sanitizeMedia(media: unknown): CommunityMedia[] {
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

export async function publishPost(input: {
  body: string;
  groupId: string | null;
  media?: CommunityMedia[];
}): Promise<ActionResult<CommunityPost>> {
  return run('Posting', async () => {
    const uid = await requireUserId();
    const body = input.body.trim();
    const media = sanitizeMedia(input.media);
    if (!body && media.length === 0) throw new Error('Please keep it — write something or add a photo first.');
    if (body) assertClean(body);
    return repo.createPost(uid, { body: body || ' ', groupId: input.groupId, media });
  });
}

export async function removeOwnPost(postId: string): Promise<ActionResult<null>> {
  return run('Deleting the post', async () => {
    const uid = await requireUserId();
    await repo.deletePost(uid, postId);
    return null;
  });
}

export async function likePost(
  postId: string
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  return run('Updating the like', async () => {
    const uid = await requireUserId();
    return repo.toggleLike(uid, postId);
  });
}

// ========== COMMENTS ==========

export async function fetchComments(postId: string): Promise<ActionResult<CommunityComment[]>> {
  return run('Loading comments', async () => {
    const uid = await requireUserId();
    return repo.listComments(uid, postId);
  });
}

export async function publishComment(input: {
  postId: string;
  body: string;
}): Promise<ActionResult<CommunityComment>> {
  return run('Commenting', async () => {
    const uid = await requireUserId();
    const body = input.body.trim();
    if (!body) throw new Error('Please keep it — write something first.');
    assertClean(body);
    return repo.addComment(uid, { postId: input.postId, body });
  });
}

export async function removeOwnComment(commentId: string): Promise<ActionResult<null>> {
  return run('Deleting the comment', async () => {
    const uid = await requireUserId();
    await repo.deleteComment(uid, commentId);
    return null;
  });
}

// ========== GROUPS ==========

/**
 * The groups rail and the first page of the feed, in one call.
 *
 * Next runs a client's Server Action calls one at a time, so the rail's group
 * fetch and the feed's post fetch never overlapped - they cost the community
 * page two full round trips on every view. Both mount in the same tick, so
 * they share this one.
 */
export async function fetchCommunityHome(opts: {
  groupId?: string | null;
}): Promise<ActionResult<{ groups: CommunityGroup[]; posts: CommunityPost[] }>> {
  return run('Loading the community', async () => {
    const uid = await requireUserId();
    const [groups, posts] = await repo.listGroupsAndFeed(uid, opts);
    return { groups, posts };
  });
}

export async function fetchGroups(): Promise<ActionResult<CommunityGroup[]>> {
  return run('Loading groups', async () => {
    const uid = await requireUserId();
    return repo.listGroups(uid);
  });
}

export async function fetchGroup(groupId: string): Promise<ActionResult<CommunityGroup>> {
  return run('Loading the group', async () => {
    const uid = await requireUserId();
    return repo.getGroup(uid, groupId);
  });
}

export async function startGroup(input: {
  name: string;
  description: string;
}): Promise<ActionResult<CommunityGroup>> {
  return run('Creating the group', async () => {
    const uid = await requireUserId();
    const name = input.name.trim();
    const description = input.description.trim();
    if (name.length < 3) throw new Error('Please keep it — the name needs at least 3 characters.');
    assertClean(name);
    assertClean(description);
    return repo.createGroup(uid, { name, description, slug: slugify(name) });
  });
}

export async function joinCommunityGroup(groupId: string): Promise<ActionResult<null>> {
  return run('Joining the group', async () => {
    const uid = await requireUserId();
    await repo.joinGroup(uid, groupId);
    return null;
  });
}

export async function leaveCommunityGroup(groupId: string): Promise<ActionResult<null>> {
  return run('Leaving the group', async () => {
    const uid = await requireUserId();
    await repo.leaveGroup(uid, groupId);
    return null;
  });
}

// ========== SAFETY ==========

export async function reportCommunityContent(input: {
  targetType: CommunityReportTarget;
  targetId: string;
  reason: string;
}): Promise<ActionResult<null>> {
  return run('Sending the report', async () => {
    const uid = await requireUserId();
    const reason = input.reason.trim();
    if (reason.length < 3) throw new Error('Please keep it — tell us briefly what is wrong.');
    await repo.reportContent(uid, { ...input, reason });
    return null;
  });
}

export async function blockCommunityMember(blockedId: string): Promise<ActionResult<null>> {
  return run('Blocking the member', async () => {
    const uid = await requireUserId();
    if (blockedId === uid) throw new Error('Please keep it — you cannot block yourself.');
    await repo.blockMember(uid, blockedId);
    return null;
  });
}

export async function unblockCommunityMember(blockedId: string): Promise<ActionResult<null>> {
  return run('Unblocking the member', async () => {
    const uid = await requireUserId();
    await repo.unblockMember(uid, blockedId);
    return null;
  });
}

// ========== ADMIN MODERATION ==========

export async function fetchCommunityReports(
  status: CommunityReportStatus
): Promise<ActionResult<CommunityReport[]>> {
  return run('Loading reports', async () => {
    const adminId = await requireAdminId();
    return repo.listReports(adminId, status);
  });
}

export async function resolveCommunityReport(input: {
  reportId: string;
  action: 'actioned' | 'dismissed';
}): Promise<ActionResult<null>> {
  return run('Resolving the report', async () => {
    const adminId = await requireAdminId();
    await repo.resolveReport(adminId, input);
    return null;
  });
}
