import 'server-only';
import { withUser, withUserRead, type Db } from '@/server/db';
import { toDomain, toDomainAll } from '@/server/case';
// One repo reaching into another, deliberately: the people rail is the chat
// module's follow graph, and communityStart's whole point is to read it on the
// SAME connection instead of paying a second round trip for it.
import {
  COMMUNITY_EDGES_CTE, COMMUNITY_PEOPLE_JSON, toChatPeople, type ChatPeople,
} from '@/server/repos/chat';
import type {
  CommunityGroup, CommunityPost, CommunityComment, CommunityReport,
  CommunityReportTarget, CommunityReportStatus, CommunityFeedScope, CommunityContentStatus,
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

/** One page of the feed. */
const FEED_PAGE = 20;

/** First row or a thrown, user-safe error. */
function first<T>(rows: unknown[], message: string): T {
  if (rows.length === 0) throw new Error(message);
  return rows[0] as T;
}

const POST_SELECT = `
  p.id, p.author_id, p.group_id, p.body, p.media, p.status, p.moderation, p.created_at,
  n.first_name as author_first_name,
  n.last_name  as author_last_name,
  n.city       as author_city,
  n.job_title  as author_job_title,
  n.company    as author_company,
  p.audience, p.topic,
  p.business_id,
  bz.name      as business_name,
  bz.slug      as business_slug,
  bz.logo      as business_logo,
  g.name       as group_name,
  (select count(*)::int from public.community_likes l where l.post_id = p.id) as like_count,
  (select count(*)::int from public.community_comments c
     where c.post_id = p.id and c.status = 'active') as comment_count,
  exists(select 1 from public.community_likes l
     where l.post_id = p.id and l.member_id = app.current_user_id()) as liked_by_me,
  (select coalesce(json_agg(x.first_name), '[]'::json) from (
     select n.first_name from public.community_likes l
       join public.member_names n on n.id = l.member_id
      where l.post_id = p.id
      order by l.created_at desc limit 2) x) as liker_names
`;

const GROUP_SELECT = `
  g.id, g.slug, g.name, g.description, g.kind, g.created_by, g.is_archived, g.created_at,
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
  opts: { before?: string; limit?: number; scope?: CommunityFeedScope } = {}
): Promise<CommunityPost[]> {
  return withUserRead(userId, (db) => personalFeedOn(db, userId, opts));
}

/** The same query without the transaction, so a combined read can share one. */
export async function personalFeedOn(
  db: Db,
  userId: string,
  opts: { before?: string; limit?: number; scope?: CommunityFeedScope } = {}
): Promise<CommunityPost[]> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const params: unknown[] = [userId];
    let beforeClause = '';
    if (opts.before) { params.push(opts.before); beforeClause = `and p.created_at < $${params.length}`; }
    params.push(limit);
    // Instagram's Following / Threads' For you switch, club-flavoured: the
    // relevance rules stay the same, the switch narrows to one kind of source.
    const scopeClause =
      opts.scope === 'following'
        ? `and p.group_id is null`
        : opts.scope === 'groups'
          ? `and p.group_id is not null`
          : '';

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
               when p.audience = 'club' then 'club'
               when p.business_id is not null then 'saved_business'
               when p.author_id = $1 then 'mine'
               when p.group_id in (select id from mine) then 'group'
               when p.group_id in (select id from suggested_groups) then 'suggested_group'
               else 'followed'
             end as source
        from public.community_posts p
        left join public.member_names n on n.id = p.author_id
        left join public.businesses bz on bz.id = p.business_id
        left join public.community_groups g on g.id = p.group_id
       where (p.status = 'active' or (p.status = 'held' and p.author_id = $1))
         and (
           p.audience = 'club'
           or p.author_id = $1
           or (p.group_id is null and p.author_id in (select id from followed))
           or p.group_id in (select id from mine)
           or p.group_id in (select id from suggested_groups)
           -- A business I saved is a business I asked to hear from (0050).
           or (p.business_id is not null and p.business_id in (
                 select s.business_id from public.member_saved_businesses s where s.member_id = $1))
         )
         ${scopeClause}
         ${beforeClause}
       order by p.created_at desc
       limit $${params.length}
      `,
      params
    );
  return toDomainAll<CommunityPost>(rows);
}

/**
 * Groups for the Groups tab: searchable, mine first, then suggestions ranked
 * by city/interest match and size. suggest_reason is the honest explanation
 * shown on the card.
 */
export async function exploreGroups(userId: string, query = ''): Promise<CommunityGroup[]> {
  return withUserRead(userId, (db) => exploreGroupsOn(db, userId, query));
}

export async function exploreGroupsOn(db: Db, userId: string, query = ''): Promise<CommunityGroup[]> {
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
                 then case when g.kind = 'location' then 'Your city' else 'Popular in ' || (select city from me) end
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
}

/**
 * Everything the Community page paints on arrival: the personal feed, the
 * group rail and the people rail (plus incoming follow requests, which the
 * People tab needs the moment it is opened).
 *
 * ONE statement. It was three Server Actions fired from one effect, and Next
 * runs a client's action calls one at a time, so a Promise.all of three was
 * three sequential round trips to a remote database - the reason the page
 * rendered its shell fast and its content two seconds later. Three statements
 * inside one transaction would have cost the same: a connection runs them in
 * sequence too. The CTEs are hoisted so all three branches share them.
 */
export async function communityStart(userId: string): Promise<{
  posts: CommunityPost[];
  groups: CommunityGroup[];
  people: ChatPeople;
}> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<{
      posts: Record<string, unknown>[] | null;
      groups: Record<string, unknown>[] | null;
      people: Parameters<typeof toChatPeople>[0];
    }>(
      `
      with me as (select city, industry, job_title from public.profiles where id = $1),
      followed as (
        select followee_id as id from public.member_follows
         where follower_id = $1 and status = 'accepted'
      ),
      my_groups as (
        select group_id as id from public.community_group_members where member_id = $1
      ),
      suggested_groups as (
        select g.id
          from public.community_groups g
         where not g.is_archived
           and g.id not in (select id from my_groups)
           and (coalesce((select city from me), '') <> ''
                and (g.name ilike '%' || (select city from me) || '%'
                     or g.description ilike '%' || (select city from me) || '%'))
      ),
      edges as (${COMMUNITY_EDGES_CTE})
      select
        (select coalesce(json_agg(t order by t.created_at desc), '[]'::json) from (
          select ${POST_SELECT},
                 g.slug as group_slug,
                 (p.group_id is not null and p.group_id in (select id from my_groups)) as in_group,
                 case
                   -- A club broadcast (0049) reaches every member, whoever posted it.
                   when p.audience = 'club' then 'club'
                   when p.business_id is not null then 'saved_business'
                   when p.author_id = $1 then 'mine'
                   when p.group_id in (select id from my_groups) then 'group'
                   when p.group_id in (select id from suggested_groups) then 'suggested_group'
                   else 'followed'
                 end as source
            from public.community_posts p
            left join public.member_names n on n.id = p.author_id
            left join public.businesses bz on bz.id = p.business_id
            left join public.community_groups g on g.id = p.group_id
           where p.status = 'active'
             and (
               p.audience = 'club'
               or p.author_id = $1
               or (p.group_id is null and p.author_id in (select id from followed))
               or p.group_id in (select id from my_groups)
               or p.group_id in (select id from suggested_groups)
               or (p.business_id is not null and p.business_id in (
                     select s.business_id from public.member_saved_businesses s where s.member_id = $1))
             )
           order by p.created_at desc
           limit $2
        ) t) as posts,
        -- The SAME group list the Groups tab, the feed's inline Join cards and
        -- the desktop aside all need. One list, three consumers: the aside used
        -- to fetch its own copy on mount (fetchCommunityHome), which was a whole
        -- extra round trip whose twenty posts were then thrown away.
        (select coalesce(json_agg(t), '[]'::json) from (
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
           order by exists (select 1 from public.community_group_members m
                             where m.group_id = g.id and m.member_id = $1) desc,
                    member_count desc
           limit 60
        ) t) as groups,
        ${COMMUNITY_PEOPLE_JSON} as people
      `,
      [userId, FEED_PAGE]
    );
    const row = rows[0];
    return {
      posts: toDomainAll<CommunityPost>(row?.posts ?? []),
      groups: toDomainAll<CommunityGroup>(row?.groups ?? []),
      people: toChatPeople(row?.people),
    };
  });
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
    // A club broadcast (0049) is part of every scope: the whole point of it is
    // that an admin posts once and it is in every group.
    const scope =
      opts.groupId === undefined
        ? `(p.audience = 'club' or p.group_id is null or exists(
             select 1 from public.community_group_members gm
             where gm.group_id = p.group_id and gm.member_id = app.current_user_id()))`
        : opts.groupId === null
          ? `(p.audience = 'club' or p.group_id is null)`
          : `(p.audience = 'club' or p.group_id = $1)`;

    const params: unknown[] = opts.groupId ? [opts.groupId] : [];
    if (opts.before) params.push(opts.before);
    const beforeClause = opts.before ? `and p.created_at < $${params.length}` : '';
    params.push(limit);

    const rows = await db.run(
      `select ${POST_SELECT}
       from public.community_posts p
       left join public.member_names n on n.id = p.author_id
       left join public.businesses bz on bz.id = p.business_id
       left join public.community_groups g on g.id = p.group_id
       where (p.status = 'active' or (p.status = 'held' and p.author_id = app.current_user_id()))
         and ${scope} ${beforeClause}
       order by p.created_at desc
       limit $${params.length}`,
      params
    );
    return toDomainAll<CommunityPost>(rows);
  });
}

/**
 * One member's posts for their profile page (0051). Empty unless
 * can_view_member() says the caller may see them: a private profile shows its
 * posts only to accepted followers. RLS still applies underneath.
 */
export async function listMemberPosts(
  userId: string,
  memberId: string,
  before: string | null = null,
  limit = 20
): Promise<CommunityPost[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run(
      `select ${POST_SELECT}
       from public.community_posts p
       left join public.member_names n on n.id = p.author_id
       left join public.businesses bz on bz.id = p.business_id
       left join public.community_groups g on g.id = p.group_id
       where p.author_id = $1
         and (p.status = 'active' or (p.status = 'held' and p.author_id = app.current_user_id()))
         and public.can_view_member($1)
         and ($2::timestamptz is null or p.created_at < $2::timestamptz)
       order by p.created_at desc
       limit $3`,
      [memberId, before, Math.min(Math.max(limit, 1), 50)]
    );
    return toDomainAll<CommunityPost>(rows);
  });
}

export async function createPost(
  userId: string,
  input: {
    body: string;
    groupId: string | null;
    /** 'held' when the classifier wants a moderator to look first (0053). */
    status?: 'active' | 'held';
    moderation?: Record<string, unknown> | null;
    media: { url: string; type: 'image' | 'video' }[];
    /** 'club' is an admin broadcast to every member. Pinned to 'normal' for anyone else by guard_post_audience. */
    audience?: 'normal' | 'club';
    topic?: string | null;
  }
): Promise<CommunityPost> {
  return withUser(userId, async (db) => {
    const inserted = first(await db`
        insert into public.community_posts (author_id, group_id, body, media, audience, topic, status, moderation)
        values (${userId}::uuid, ${input.groupId}::uuid, ${input.body}, ${JSON.stringify(input.media)}::jsonb,
                ${input.audience ?? 'normal'}, ${input.topic ?? null},
                ${input.status ?? 'active'}, ${input.moderation ? JSON.stringify(input.moderation) : null}::jsonb)
        returning id
      `,
      'Post was not created'
    ) as { id: string };
    return fetchPost(db, inserted.id);
  });
}

/**
 * A business posting as itself (0050). No author_id - the business is the
 * author - and never a group or a club audience; the insert policy and
 * guard_post_audience refuse both regardless of what arrives here.
 */
export async function createBusinessPost(
  userId: string,
  businessId: string,
  input: {
    body: string;
    media: { url: string; type: 'image' | 'video' }[];
    status?: 'active' | 'held';
    moderation?: Record<string, unknown> | null;
  }
): Promise<CommunityPost> {
  return withUser(userId, async (db) => {
    const inserted = first(await db`
        insert into public.community_posts (author_id, business_id, group_id, body, media, status, moderation)
        values (null, ${businessId}::uuid, null, ${input.body}, ${JSON.stringify(input.media)}::jsonb,
                ${input.status ?? 'active'}, ${input.moderation ? JSON.stringify(input.moderation) : null}::jsonb)
        returning id
      `,
      'Post was not created'
    ) as { id: string };
    return fetchPost(db, inserted.id);
  });
}

/** Everything one business has posted, newest first. RLS scopes it to what the caller may see. */
export async function listBusinessPosts(userId: string, businessId: string, limit = 30): Promise<CommunityPost[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run(
      `select ${POST_SELECT}
       from public.community_posts p
       left join public.member_names n on n.id = p.author_id
       left join public.businesses bz on bz.id = p.business_id
       left join public.community_groups g on g.id = p.group_id
       where p.business_id = $1 and p.status = 'active'
       order by p.created_at desc
       limit $2`,
      [businessId, Math.min(Math.max(limit, 1), 60)]
    );
    return toDomainAll<CommunityPost>(rows);
  });
}

async function fetchPost(db: Db, id: string): Promise<CommunityPost> {
  const rows = await db.run(
    `select ${POST_SELECT}
     from public.community_posts p
     left join public.member_names n on n.id = p.author_id
     left join public.businesses bz on bz.id = p.business_id
     left join public.community_groups g on g.id = p.group_id
     where p.id = $1`,
    [id]
  );
  return toDomain<CommunityPost>(first(rows, 'Post not found'));
}

/**
 * One post at its permalink. RLS already limits this to active posts; on top
 * of that a member's own (non-group) post is shown only to people who may see
 * their profile (0051), so a link cannot open a private member's post to a
 * stranger. Group posts follow the group's rules, as they do in the feed.
 */
export async function getPost(userId: string, postId: string): Promise<CommunityPost | null> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run(
      `select ${POST_SELECT}
       from public.community_posts p
       left join public.member_names n on n.id = p.author_id
       left join public.businesses bz on bz.id = p.business_id
       left join public.community_groups g on g.id = p.group_id
       where p.id = $1
         and (p.status = 'active' or (p.status = 'held' and p.author_id = app.current_user_id()))
         and (p.author_id is null or p.group_id is not null or public.can_view_member(p.author_id))`,
      [postId]
    );
    return rows.length ? toDomain<CommunityPost>(rows[0]) : null;
  });
}

export interface GroupMember {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  company: string | null;
  city: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  outgoing: 'none' | 'pending' | 'accepted';
  incoming: 'none' | 'pending' | 'accepted';
}

/** Who is in a group, owner first, with my follow edge each way. */
export async function listGroupMembers(userId: string, groupId: string): Promise<GroupMember[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select n.id, n.first_name, n.last_name, n.job_title, n.company, n.city,
              gm.role, gm.joined_at,
              (select f.status from public.member_follows f
                where f.follower_id = $1 and f.followee_id = n.id) as outgoing,
              (select f.status from public.member_follows f
                where f.follower_id = n.id and f.followee_id = $1) as incoming
         from public.community_group_members gm
         join public.member_names n on n.id = gm.member_id
        where gm.group_id = $2
          and not public.is_blocked_between_members($1, n.id)
        order by (gm.role = 'owner') desc, gm.joined_at asc
        limit 500`,
      [userId, groupId]
    );
    return rows.map((r) => ({
      id: r.id as string,
      firstName: r.first_name as string,
      lastName: r.last_name as string,
      jobTitle: (r.job_title as string | null) ?? null,
      company: (r.company as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      role: (r.role as 'owner' | 'admin' | 'member') ?? 'member',
      joinedAt: r.joined_at instanceof Date ? r.joined_at.toISOString() : String(r.joined_at),
      outgoing: ((r.outgoing as string | null) ?? 'none') as GroupMember['outgoing'],
      incoming: ((r.incoming as string | null) ?? 'none') as GroupMember['incoming'],
    }));
  });
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
      select c.id, c.post_id, c.author_id, c.body, c.status, c.moderation, c.created_at,
             n.first_name as author_first_name, n.last_name as author_last_name
      from public.community_comments c
      join public.member_names n on n.id = c.author_id
      where c.post_id = ${postId}::uuid
        and (c.status = 'active' or (c.status = 'held' and c.author_id = app.current_user_id()))
      order by c.created_at asc
    `;
    return toDomainAll<CommunityComment>(rows);
  });
}

export async function addComment(
  userId: string,
  input: { postId: string; body: string; status?: 'active' | 'held'; moderation?: Record<string, unknown> | null }
): Promise<CommunityComment> {
  return withUser(userId, async (db) => {
    const inserted = first(await db`
        insert into public.community_comments (post_id, author_id, body, status, moderation)
        values (${input.postId}::uuid, ${userId}::uuid, ${input.body},
                ${input.status ?? 'active'}, ${input.moderation ? JSON.stringify(input.moderation) : null}::jsonb)
        returning id
      `,
      'Comment was not created'
    ) as { id: string };
    const rows = await db`
      select c.id, c.post_id, c.author_id, c.body, c.status, c.moderation, c.created_at,
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
  input: { name: string; description: string; slug: string; kind: 'location' | 'activity' | 'interest' }
): Promise<CommunityGroup> {
  return withUser(userId, async (db) => {
    const inserted = first(await db`
        insert into public.community_groups (slug, name, description, kind, created_by)
        values (${input.slug}, ${input.name}, ${input.description}, ${input.kind}, ${userId}::uuid)
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

// ========== GOVERNANCE (0053) ==========

/**
 * A club admin makes a member a moderator of a group, or takes it back. The
 * member is added to the group if they are not in it yet; RLS lets only a club
 * admin insert someone else or change a role.
 */
export async function setGroupMemberRole(
  userId: string,
  groupId: string,
  memberId: string,
  role: 'admin' | 'member'
): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      insert into public.community_group_members (group_id, member_id, role)
      values (${groupId}::uuid, ${memberId}::uuid, ${role})
      on conflict (group_id, member_id) do update set role = excluded.role
        where public.community_group_members.role <> 'owner'
    `;
  });
}

export interface ModerationItem {
  kind: 'post' | 'comment';
  id: string;
  postId: string;
  body: string;
  media: unknown[];
  status: CommunityContentStatus;
  moderation: Record<string, unknown> | null;
  createdAt: string;
  authorId: string | null;
  authorFirstName: string | null;
  authorLastName: string | null;
  groupId: string | null;
  groupName: string | null;
}

/**
 * What is waiting for the caller: held posts and comments in groups they
 * moderate (every group for a club admin, plus club-wide content). RLS
 * decides what "they moderate" means; this only asks for status = 'held'.
 */
export async function listModerationQueue(userId: string): Promise<ModerationItem[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select 'post' as kind, p.id, p.id as post_id, p.body, p.media, p.status, p.moderation, p.created_at,
              p.author_id, n.first_name, n.last_name, p.group_id, g.name as group_name
         from public.community_posts p
         left join public.member_names n on n.id = p.author_id
         left join public.community_groups g on g.id = p.group_id
        where p.status = 'held' and p.author_id is distinct from $1
       union all
       select 'comment', c.id, c.post_id, c.body, '[]'::jsonb, c.status, c.moderation, c.created_at,
              c.author_id, n.first_name, n.last_name, p.group_id, g.name
         from public.community_comments c
         join public.community_posts p on p.id = c.post_id
         left join public.member_names n on n.id = c.author_id
         left join public.community_groups g on g.id = p.group_id
        where c.status = 'held' and c.author_id is distinct from $1
       order by created_at desc
       limit 200`,
      [userId]
    );
    return rows.map((r) => ({
      kind: r.kind as 'post' | 'comment',
      id: r.id as string,
      postId: r.post_id as string,
      body: (r.body as string) ?? '',
      media: Array.isArray(r.media) ? (r.media as unknown[]) : [],
      status: r.status as CommunityContentStatus,
      moderation: (r.moderation as Record<string, unknown> | null) ?? null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      authorId: (r.author_id as string | null) ?? null,
      authorFirstName: (r.first_name as string | null) ?? null,
      authorLastName: (r.last_name as string | null) ?? null,
      groupId: (r.group_id as string | null) ?? null,
      groupName: (r.group_name as string | null) ?? null,
    }));
  });
}

/** Approve (make active) or remove a post or comment. RLS decides who may. */
export async function moderateItem(
  userId: string,
  input: { kind: 'post' | 'comment'; id: string; action: 'approve' | 'remove' }
): Promise<void> {
  await withUser(userId, async (db) => {
    const status = input.action === 'approve' ? 'active' : 'removed';
    const rows = input.kind === 'post'
      ? await db`update public.community_posts set status = ${status} where id = ${input.id}::uuid returning id`
      : await db`update public.community_comments set status = ${status} where id = ${input.id}::uuid returning id`;
    if (rows.length === 0) throw new Error('You cannot moderate that.');
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
