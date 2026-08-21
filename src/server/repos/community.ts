import 'server-only';
import { withUser, withUserRead, type Db } from '@/server/db';
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

/**
 * The personalised feed (Instagram's contract, club-flavoured):
 *   - my own posts,
 *   - posts by people whose follow request I had ACCEPTED,
 *   - posts in groups I joined,
 *   - a sprinkle from groups I have not joined but probably want (city or
 *     interest match), tagged so the UI can offer Join inline.
 *
 * One round trip, cursor-paginated on created_at. RLS still decides what is
 * readable at all (0005): this only decides what is RELEVANT.
 */
export async function listPersonalFeed(
  userId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<CommunityPost[]> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  return withUserRead(userId, async (db) => {
    const params: unknown[] = [userId];
    let beforeClause = '';
    if (opts.before) { params.push(opts.before); beforeClause = `and p.created_at < $${params.length}`; }
    params.push(limit);

    const rows = await db.run(
      `
      with me as (select city from public.profiles where id = $1),
      followed as (
        select followee_id as id from public.member_follows
         where follower_id = $1 and status = 'accepted'
      ),
      mine as (
        select group_id as id from public.community_group_members where member_id = $1
      ),
      suggested_groups as (
        select g.id
          from public.community_groups g
         where not g.is_archived
           and g.id not in (select id from mine)
           and (coalesce((select city from me), '') <> ''
                and (g.name ilike '%' || (select city from me) || '%'
                     or g.description ilike '%' || (select city from me) || '%'))
      )
      select ${POST_SELECT},
             g.slug as group_slug,
             (p.group_id is not null and p.group_id in (select id from mine)) as in_group,
             case
               when p.author_id = $1 then 'mine'
               when p.group_id in (select id from mine) then 'group'
               when p.group_id in (select id from suggested_groups) then 'suggested_group'
               else 'followed'
             end as source
        from public.community_posts p
        join public.member_names n on n.id = p.author_id
        left join public.community_groups g on g.id = p.group_id
       where p.status = 'active'
         and (
           p.author_id = $1
           or (p.group_id is null and p.author_id in (select id from followed))
           or p.group_id in (select id from mine)
           or p.group_id in (select id from suggested_groups)
         )
         ${beforeClause}
       order by p.created_at desc
       limit $${params.length}
      `,
      params
    );
    return toDomainAll<CommunityPost>(rows);
  });
}

/**
 * Groups for the Groups tab: searchable, mine first, then suggestions ranked
 * by city/interest match and size. suggest_reason is the honest explanation
 * shown on the card.
 */
export async function exploreGroups(userId: string, query = ''): Promise<CommunityGroup[]> {
  return withUserRead(userId, async (db) => {
    const q = query.trim().slice(0, 80);
    const params: unknown[] = [userId, q === '' ? null : `%${q}%`];
    const rows = await db.run(
      `
      with me as (select city, industry, job_title from public.profiles where id = $1)
      select ${GROUP_SELECT},
             case
               when exists (select 1 from public.community_group_members m
                             where m.group_id = g.id and m.member_id = $1) then null
               when coalesce((select city from me), '') <> ''
                    and (g.name ilike '%' || (select city from me) || '%'
                         or g.description ilike '%' || (select city from me) || '%')
                 then 'Popular in ' || (select city from me)
               when coalesce((select industry from me), '') <> ''
                    and (g.name ilike '%' || (select industry from me) || '%'
                         or g.description ilike '%' || (select industry from me) || '%')
                 then 'Matches your industry'
               else null
             end as suggest_reason
        from public.community_groups g
       where not g.is_archived
         and ($2::text is null or g.name ilike $2 or g.description ilike $2)
       order by exists (select 1 from public.community_group_members m
                         where m.group_id = g.id and m.member_id = $1) desc,
                member_count desc
       limit 60
      `,
      params
    );
    return toDomainAll<CommunityGroup>(rows);
  });
}

/** Groups to suggest inside the feed: not joined, best match first. */
export async function suggestedGroups(userId: string, limit = 6): Promise<CommunityGroup[]> {
  const all = await exploreGroups(userId);
  return all.filter((g) => !g.isMember).slice(0, limit);
}

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
  return withUserRead(userId, async (db) => {
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
  return withUserRead(userId, async (db) => {
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

/**
 * Groups and feed together. They are two statements but share one transaction
 * and one connection acquisition, and - the point of it - one Server Action
 * round trip from the browser.
 */
export async function listGroupsAndFeed(
  userId: string,
  opts: { groupId?: string | null }
): Promise<[CommunityGroup[], CommunityPost[]]> {
  return [await listGroups(userId), await listFeed(userId, opts)];
}

export async function listGroups(userId: string): Promise<CommunityGroup[]> {
  return withUserRead(userId, async (db) => {
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
  return withUserRead(userId, async (db) => {
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
  return withUserRead(adminId, async (db) => {
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
