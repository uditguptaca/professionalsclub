'use server';

import { isMemberFacing, MemberFacingError } from '@/server/errors';

import { requireUserId, requireAdminId } from '@/server/auth';
import * as repo from '@/server/repos/community';
import { moderateContent, rejectionMessage } from '@/server/moderation';
import { sanitizeMedia } from '@/server/media';
import type {
  CommunityGroup, CommunityPost, CommunityComment, CommunityReport,
  CommunityReportTarget, CommunityReportStatus, CommunityMedia, CommunityFeedScope,
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
  // Show the member what was written for them; mask everything else, because a
  // raw fault names internals.
  const expected =
    isMemberFacing(error) ||
    detail.startsWith('Not signed in') ||
    detail.startsWith('That page is for club admins') ||
    detail.startsWith('This account is not active') ||
    detail.startsWith('That group name is taken');
  return { ok: false, error: expected ? detail : `${context} failed. Please try again.` };
}

async function run<T>(context: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return fail(context, error);
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
export async function fetchPersonalFeed(
  opts: { before?: string; scope?: CommunityFeedScope } = {}
): Promise<ActionResult<CommunityPost[]>> {
  return run('Loading your feed', async () => {
    const uid = await requireUserId();
    const scope = opts.scope === 'following' || opts.scope === 'groups' ? opts.scope : 'all';
    return repo.listPersonalFeed(uid, { before: opts.before, scope });
  });
}

/** One post, for its permalink. */
export async function fetchPost(postId: string): Promise<ActionResult<CommunityPost>> {
  return run('Loading the post', async () => {
    const uid = await requireUserId();
    if (typeof postId !== 'string' || postId.length !== 36) throw new MemberFacingError('We could not find that post.');
    const post = await repo.getPost(uid, postId);
    if (!post) throw new MemberFacingError('That post is not available. It may have been removed, or its author\u2019s profile is private.');
    return post;
  });
}

/** Everyone in a group, with my follow state on each row. */
export async function fetchGroupMembers(groupId: string): Promise<ActionResult<repo.GroupMember[]>> {
  return run('Loading members', async () => {
    const uid = await requireUserId();
    return repo.listGroupMembers(uid, groupId);
  });
}

/** Searchable group directory for the Groups tab. */
export async function fetchGroupsExplore(query = ''): Promise<ActionResult<CommunityGroup[]>> {
  return run('Loading groups', async () => {
    const uid = await requireUserId();
    return repo.exploreGroups(uid, query);
  });
}

/**
 * Everything the Community page needs on arrival: feed, group rail, people
 * rail and incoming follow requests. Replaces the three actions the mount
 * effect used to fire (fetchPersonalFeed + listPeople + fetchSuggestedGroups),
 * which Next ran one after another.
 */
export async function fetchCommunityStart(): Promise<ActionResult<{
  posts: CommunityPost[];
  groups: CommunityGroup[];
  people: import('@/server/repos/chat').ChatPeople;
}>> {
  return run('Loading the community', async () => {
    const uid = await requireUserId();
    return repo.communityStart(uid);
  });
}


export async function publishPost(input: {
  body: string;
  groupId: string | null;
  media?: CommunityMedia[];
  /** 'club' asks for an admin broadcast to every member (0049). The database
      pins it to 'normal' for anyone who is not an admin, whatever is sent. */
  audience?: 'normal' | 'club';
  topic?: string | null;
}): Promise<ActionResult<CommunityPost>> {
  return run('Posting', async () => {
    const uid = await requireUserId();
    const body = input.body.trim();
    const media = sanitizeMedia(input.media);
    if (!body && media.length === 0) throw new MemberFacingError('Write something, or add a photo, first.');
    // The classifier (0053): reject and say why, hold for a moderator, or let it through.
    const verdict = await moderateContent({ text: body, media, kind: 'post' });
    if (verdict.decision === 'reject') throw new MemberFacingError(rejectionMessage(verdict));
    const audience = input.audience === 'club' ? 'club' : 'normal';
    const topic = audience === 'club' && typeof input.topic === 'string' ? input.topic : null;
    return repo.createPost(uid, {
      body: body || ' ', groupId: input.groupId, media, audience, topic,
      status: verdict.decision === 'hold' ? 'held' : 'active',
      moderation: verdict.decision === 'allow' ? null : { ...verdict, scores: undefined },
    });
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
    if (!body) throw new MemberFacingError('Write something first.');
    const verdict = await moderateContent({ text: body, kind: 'comment' });
    if (verdict.decision === 'reject') throw new MemberFacingError(rejectionMessage(verdict));
    return repo.addComment(uid, {
      postId: input.postId, body,
      status: verdict.decision === 'hold' ? 'held' : 'active',
      moderation: verdict.decision === 'allow' ? null : { ...verdict, scores: undefined },
    });
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
  kind?: 'location' | 'activity' | 'interest';
}): Promise<ActionResult<CommunityGroup>> {
  return run('Creating the group', async () => {
    // Groups are the club's to start (0053); RLS refuses anyone else too.
    const uid = await requireAdminId();
    const name = input.name.trim();
    const description = input.description.trim();
    if (name.length < 3) throw new MemberFacingError('The name needs at least 3 characters.');
    const verdict = await moderateContent({ text: `${name}\n${description}`, kind: 'group' });
    if (verdict.decision !== 'allow') throw new MemberFacingError(rejectionMessage(verdict));
    // A group is a place, a shared activity, or a topic (0049). Anything else
    // sent here is treated as a topic - the CHECK constraint would refuse it
    // anyway, but with a message nobody should have to read.
    const kind = input.kind === 'location' || input.kind === 'activity' ? input.kind : 'interest';
    return repo.createGroup(uid, { name, description, slug: slugify(name), kind });
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

// ========== GOVERNANCE AND MODERATION (0053) ==========

/** A club admin makes a member a moderator of a group, or takes it back. */
export async function setGroupRole(input: {
  groupId: string; memberId: string; role: 'admin' | 'member';
}): Promise<ActionResult<null>> {
  return run('Updating the role', async () => {
    const uid = await requireAdminId();
    if (input.role !== 'admin' && input.role !== 'member') throw new MemberFacingError('That is not a role we recognise.');
    await repo.setGroupMemberRole(uid, input.groupId, input.memberId, input.role);
    return null;
  });
}

/** Held posts and comments waiting for the caller, as RLS defines "the caller's". */
export async function fetchModerationQueue(): Promise<ActionResult<repo.ModerationItem[]>> {
  return run('Loading the queue', async () => {
    const uid = await requireUserId();
    return repo.listModerationQueue(uid);
  });
}

/** Approve or remove one held (or reported) item. Group moderators and club admins. */
export async function moderateContentItem(input: {
  kind: 'post' | 'comment'; id: string; action: 'approve' | 'remove';
}): Promise<ActionResult<null>> {
  return run('Moderating', async () => {
    const uid = await requireUserId();
    if (input.kind !== 'post' && input.kind !== 'comment') throw new MemberFacingError('That is not something we can moderate.');
    if (input.action !== 'approve' && input.action !== 'remove') throw new MemberFacingError('That is not an action we recognise.');
    await repo.moderateItem(uid, input);
    return null;
  });
}

/** Reports visible to the caller: their own, or those on content they moderate. */
export async function fetchModeratorReports(): Promise<ActionResult<CommunityReport[]>> {
  return run('Loading reports', async () => {
    const uid = await requireUserId();
    return repo.listReports(uid, 'open');
  });
}

/** Resolve a report as a group moderator; RLS refuses anyone who is not one. */
export async function resolveReportAsModerator(input: {
  reportId: string; action: 'actioned' | 'dismissed';
}): Promise<ActionResult<null>> {
  return run('Resolving the report', async () => {
    const uid = await requireUserId();
    await repo.resolveReport(uid, { reportId: input.reportId, action: input.action });
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
    if (reason.length < 3) throw new MemberFacingError('Tell us briefly what is wrong, so a moderator knows what to look at.');
    await repo.reportContent(uid, { ...input, reason });
    return null;
  });
}

export async function blockCommunityMember(blockedId: string): Promise<ActionResult<null>> {
  return run('Blocking the member', async () => {
    const uid = await requireUserId();
    if (blockedId === uid) throw new MemberFacingError('You cannot block yourself.');
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
