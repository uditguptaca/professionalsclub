import 'server-only';
import { withUser, type Db } from '@/server/db';
import { toDomain, toDomainAll } from '@/server/case';
import type {
  CommunityGroup, CommunityPost, CommunityComment, CommunityReport,
  CommunityReportTarget, CommunityReportStatus,
} from '@/types';

/**
 * Community data access.
 *
 * Every function runs inside withUser(), so RLS is the authority on what comes
 * back: removed posts vanish for members but not for admins, content from
 * blocked authors does not exist for the blocker, and writes outside your own
 * rows fail at the database even if a bug up here asks for them.
 *
 * Author names come from public.member_names (name + city only) — never join
 * profiles directly here; members cannot read other profiles and the view is
 * the deliberate, minimal exception.
 */

/** First row or a thrown, user-safe error. */
function first<T>(rows: unknown[], message: string): T {
  if (rows.length === 0) throw new Error(message);
  return rows[0] as T;
}

const POST_SELECT = `
  p.id, p.author_id, p.group_id, p.body, p.media, p.status, p.created_at,
  n.first_name as author_first_name,
  n.last_name  as author_last_name,
  n.city       as author_city,
  g.name       as group_name,
  (select count(*)::int from public.community_likes l where l.post_id = p.id) as like_count,
  (select count(*)::int from public.community_comments c
     where c.post_id = p.id and c.status = 'active') as comment_count,
  exists(select 1 from public.community_likes l
     where l.post_id = p.id and l.member_id = app.current_user_id()) as liked_by_me
`;

const GROUP_SELECT = `
  g.id, g.slug, g.name, g.description, g.created_by, g.is_archived, g.created_at,
  (select count(*)::int from public.community_group_members m where m.group_id = g.id) as member_count,
  exists(select 1 from public.community_group_members m
     where m.group_id = g.id and m.member_id = app.current_user_id()) as is_member,
  (select m.role from public.community_group_members m
     where m.group_id = g.id and m.member_id = app.current_user_id()) as my_role
`;

// ========== FEED ==========

/**
 * groupId === undefined -> the home feed: club-wide posts plus posts from
 * groups the caller has joined. groupId === null -> club-wide posts only.
 * A string -> that group's posts.
 */
export async function listFeed(
  userId: string,
  opts: { groupId?: string | null; before?: string; limit?: number } = {}
): Promise<CommunityPost[]> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);
  return withUser(userId, async (db) => {
    const scope =
      opts.groupId === undefined
        ? `(p.group_id is null or exists(
             select 1 from public.community_group_members gm
             where gm.group_id = p.group_id and gm.member_id = app.current_user_id()))`
        : opts.groupId === null
          ? `p.group_id is null`
          : `p.group_id = $1`;

    const params: unknown[] = opts.groupId ? [opts.groupId] : [];
    if (opts.before) params.push(opts.before);
    const beforeClause = opts.before ? `and p.created_at < $${params.length}` : '';
    params.push(limit);

    const rows = await db.run(
      `select ${POST_SELECT}
       from public.community_posts p
       join public.member_names n on n.id = p.author_id
       left join public.community_groups g on g.id = p.group_id
       where p.status = 'active' and ${scope} ${beforeClause}
       order by p.created_at desc
       limit $${params.length}`,
      params
    );
    return toDomainAll<CommunityPost>(rows);
  });
}

export async function createPost(
  userId: string,
  input: { body: string; groupId: string | null; media: { url: string; type: 'image' | 'video' }[] }
): Promise<CommunityPost> {
  return withUser(userId, async (db) => {
    const inserted = first(await db`
        insert into public.community_posts (author_id, group_id, body, media)
        values (${userId}::uuid, ${input.groupId}::uuid, ${input.body}, ${JSON.stringify(input.media)}::jsonb)
        returning id
      `,
      'Post was not created'
    ) as { id: string };
    return fetchPost(db, inserted.id);
  });
}

async function fetchPost(db: Db, id: string): Promise<CommunityPost> {
  const rows = await db.run(
    `select ${POST_SELECT}
     from public.community_posts p
     join public.member_names n on n.id = p.author_id
     left join public.community_groups g on g.id = p.group_id
     where p.id = $1`,
    [id]
  );
  return toDomain<CommunityPost>(first(rows, 'Post not found'));
}

/** Author deleting their own post (RLS also lets admins hard-delete). */
export async function deletePost(userId: string, postId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`delete from public.community_posts where id = ${postId}::uuid`;
  });
}

export async function toggleLike(
  userId: string,
  postId: string
): Promise<{ liked: boolean; likeCount: number }> {
  return withUser(userId, async (db) => {
    const inserted = await db`
      insert into public.community_likes (post_id, member_id)
      values (${postId}::uuid, ${userId}::uuid)
      on conflict do nothing
      returning post_id
    `;
    if (inserted.length === 0) {
      await db`
        delete from public.community_likes
        where post_id = ${postId}::uuid and member_id = ${userId}::uuid
      `;
    }
    const count = first<{ n: number }>(
      await db`select count(*)::int as n from public.community_likes where post_id = ${postId}::uuid`,
      'Count failed'
    );
    return { liked: inserted.length > 0, likeCount: count.n };
  });
}

// ========== COMMENTS ==========

export async function listComments(userId: string, postId: string): Promise<CommunityComment[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select c.id, c.post_id, c.author_id, c.body, c.status, c.created_at,
             n.first_name as author_first_name, n.last_name as author_last_name
      from public.community_comments c
      join public.member_names n on n.id = c.author_id
      where c.post_id = ${postId}::uuid and c.status = 'active'
      order by c.created_at asc
    `;
    return toDomainAll<CommunityComment>(rows);
  });
}

export async function addComment(
  userId: string,
  input: { postId: string; body: string }
): Promise<CommunityComment> {
  return withUser(userId, async (db) => {
    const inserted = first(await db`
        insert into public.community_comments (post_id, author_id, body)
        values (${input.postId}::uuid, ${userId}::uuid, ${input.body})
        returning id
      `,
      'Comment was not created'
    ) as { id: string };
    const rows = await db`
      select c.id, c.post_id, c.author_id, c.body, c.status, c.created_at,
             n.first_name as author_first_name, n.last_name as author_last_name
      from public.community_comments c
      join public.member_names n on n.id = c.author_id
      where c.id = ${inserted.id}::uuid
    `;
    return toDomain<CommunityComment>(first(rows, 'Comment not found'));
  });
}

export async function deleteComment(userId: string, commentId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`delete from public.community_comments where id = ${commentId}::uuid`;
  });
}

// ========== GROUPS ==========

export async function listGroups(userId: string): Promise<CommunityGroup[]> {
  return withUser(userId, async (db) => {
    const rows = await db.run(
      `select ${GROUP_SELECT}
       from public.community_groups g
       order by member_count desc, g.created_at asc`,
      []
    );
    return toDomainAll<CommunityGroup>(rows);
  });
}

export async function getGroup(userId: string, groupId: string): Promise<CommunityGroup> {
  return withUser(userId, async (db) => {
    const rows = await db.run(
      `select ${GROUP_SELECT} from public.community_groups g where g.id = $1`,
      [groupId]
    );
    return toDomain<CommunityGroup>(first(rows, 'Group not found'));
  });
}

export async function createGroup(
  userId: string,
  input: { name: string; description: string; slug: string }
): Promise<CommunityGroup> {
  return withUser(userId, async (db) => {
    const inserted = first(await db`
        insert into public.community_groups (slug, name, description, created_by)
        values (${input.slug}, ${input.name}, ${input.description}, ${userId}::uuid)
        returning id
      `,
      'Group was not created'
    ) as { id: string };
    await db`
      insert into public.community_group_members (group_id, member_id, role)
      values (${inserted.id}::uuid, ${userId}::uuid, 'owner')
    `;
    const rows = await db.run(
      `select ${GROUP_SELECT} from public.community_groups g where g.id = $1`,
      [inserted.id]
    );
    return toDomain<CommunityGroup>(first(rows, 'Group not found'));
  });
}

export async function joinGroup(userId: string, groupId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      insert into public.community_group_members (group_id, member_id)
      values (${groupId}::uuid, ${userId}::uuid)
      on conflict do nothing
    `;
  });
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      delete from public.community_group_members
      where group_id = ${groupId}::uuid and member_id = ${userId}::uuid
    `;
  });
}

// ========== SAFETY: REPORTS AND BLOCKS ==========

export async function reportContent(
  userId: string,
  input: { targetType: CommunityReportTarget; targetId: string; reason: string }
): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      insert into public.community_reports (target_type, target_id, reporter_id, reason)
      values (${input.targetType}, ${input.targetId}::uuid, ${userId}::uuid, ${input.reason})
    `;
  });
}

export async function blockMember(userId: string, blockedId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      insert into public.community_blocks (blocker_id, blocked_id)
      values (${userId}::uuid, ${blockedId}::uuid)
      on conflict do nothing
    `;
  });
}

export async function unblockMember(userId: string, blockedId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      delete from public.community_blocks
      where blocker_id = ${userId}::uuid and blocked_id = ${blockedId}::uuid
    `;
  });
}

// ========== ADMIN MODERATION ==========

/** Reports with the offending content pulled alongside for triage. */
export async function listReports(
  adminId: string,
  status: CommunityReportStatus
): Promise<CommunityReport[]> {
  return withUser(adminId, async (db) => {
    const rows = await db`
      select r.id, r.target_type, r.target_id, r.reporter_id, r.reason, r.status, r.created_at,
        case r.target_type
          when 'post' then (select p.body from public.community_posts p where p.id = r.target_id)
          else (select c.body from public.community_comments c where c.id = r.target_id)
        end as target_body,
        case r.target_type
          when 'post' then (select p.author_id from public.community_posts p where p.id = r.target_id)
          else (select c.author_id from public.community_comments c where c.id = r.target_id)
        end as target_author_id
      from public.community_reports r
      where r.status = ${status}
      order by r.created_at desc
      limit 100
    `;
    return toDomainAll<CommunityReport>(rows);
  });
}

/**
 * Resolve a report: 'actioned' flips the target to removed (body kept for the
 * audit trail), 'dismissed' leaves the content alone. RLS restricts both the
 * report update and the status flip to admins.
 */
export async function resolveReport(
  adminId: string,
  input: { reportId: string; action: 'actioned' | 'dismissed' }
): Promise<void> {
  await withUser(adminId, async (db) => {
    const report = first(await db`
        select target_type, target_id from public.community_reports
        where id = ${input.reportId}::uuid
      `,
      'Report not found'
    ) as { target_type: CommunityReportTarget; target_id: string };

    if (input.action === 'actioned') {
      if (report.target_type === 'post') {
        await db`
          update public.community_posts
          set status = 'removed', removed_reason = 'Removed after member report'
          where id = ${report.target_id}::uuid
        `;
      } else {
        await db`
          update public.community_comments
          set status = 'removed'
          where id = ${report.target_id}::uuid
        `;
      }
    }

    await db`
      update public.community_reports
      set status = ${input.action}, resolved_by = ${adminId}::uuid, resolved_at = now()
      where id = ${input.reportId}::uuid
    `;
  });
}
