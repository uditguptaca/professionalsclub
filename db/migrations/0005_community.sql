-- ============================================================================
-- 0005 — Community: public feed, groups, comments, likes, reports, blocks
--
-- Same access model as the rest of the portal: app_authenticated + RLS does
-- the authorization, the server actions only decide *what* to ask for.
--
-- Design notes:
--   * A post with group_id NULL is on the club-wide public feed; otherwise it
--     belongs to a group. Groups are open — any active member may join — so
--     read access is uniform for active members and the group is a topic
--     space, not a privacy boundary.
--   * Author names come from public.member_names, a security_barrier view in
--     the same mould as matrimony_visible_profiles: profiles' RLS restricts
--     SELECT to self+admins, so the view (owner rights) republishes ONLY
--     name + city, and only to active members. Adding a column here publishes
--     it to every member — do not add contact fields.
--   * Blocks are enforced in the posts/comments SELECT policies themselves,
--     not in application queries: content from someone you blocked does not
--     exist for you, no matter which code path asks.
--   * Reports + admin removal (status='removed', body preserved for audit)
--     satisfy the UGC moderation rules both app stores apply (Apple 1.2).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.community_groups (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null check (char_length(name) between 3 and 80),
  description text not null default '' check (char_length(description) <= 500),
  created_by  uuid references public.profiles(id) on delete set null,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.community_group_members (
  group_id   uuid not null references public.community_groups(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, member_id)
);

create table if not exists public.community_posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  group_id       uuid references public.community_groups(id) on delete cascade,
  body           text not null check (char_length(body) between 1 and 5000),
  status         text not null default 'active' check (status in ('active', 'removed')),
  removed_reason text,
  created_at     timestamptz not null default now()
);

create index if not exists community_posts_feed_idx
  on public.community_posts (group_id, created_at desc);
create index if not exists community_posts_author_idx
  on public.community_posts (author_id);

create table if not exists public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  status     text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now()
);

create index if not exists community_comments_post_idx
  on public.community_comments (post_id, created_at);

create table if not exists public.community_likes (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create table if not exists public.community_reports (
  id            uuid primary key default gen_random_uuid(),
  target_type   text not null check (target_type in ('post', 'comment')),
  target_id     uuid not null,
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  reason        text not null check (char_length(reason) between 3 and 500),
  status        text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_by   uuid references public.profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists community_reports_status_idx
  on public.community_reports (status, created_at desc);

create table if not exists public.community_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ----------------------------------------------------------------------------
-- Safe member directory for author bylines (name + city, nothing else).
-- ----------------------------------------------------------------------------

create or replace view public.member_names
with (security_barrier)
as
select p.id, p.first_name, p.last_name, p.city
from public.profiles p
where public.is_active_member()
  and p.account_status = 'active';

grant select on public.member_names to app_authenticated;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'community_groups', 'community_group_members', 'community_posts',
    'community_comments', 'community_likes', 'community_reports',
    'community_blocks'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Groups: browse them as an active member; create your own; owners rename,
-- admins can do anything including archive.
grant select, insert, update, delete on public.community_groups to app_authenticated;

drop policy if exists community_groups_select on public.community_groups;
create policy community_groups_select on public.community_groups
  for select to app_authenticated
  using (public.is_active_member() and (not is_archived or public.is_admin()));

drop policy if exists community_groups_insert on public.community_groups;
create policy community_groups_insert on public.community_groups
  for insert to app_authenticated
  with check (created_by = app.current_user_id() and public.is_active_member());

drop policy if exists community_groups_update on public.community_groups;
create policy community_groups_update on public.community_groups
  for update to app_authenticated
  using (created_by = app.current_user_id() or public.is_admin())
  with check (created_by = app.current_user_id() or public.is_admin());

drop policy if exists community_groups_delete on public.community_groups;
create policy community_groups_delete on public.community_groups
  for delete to app_authenticated
  using (public.is_admin());

-- Membership: join and leave for yourself. The owner row is insertable only
-- by the group's creator — nobody joins somebody else's group as 'owner'.
grant select, insert, delete on public.community_group_members to app_authenticated;

drop policy if exists community_group_members_select on public.community_group_members;
create policy community_group_members_select on public.community_group_members
  for select to app_authenticated
  using (public.is_active_member());

drop policy if exists community_group_members_insert on public.community_group_members;
create policy community_group_members_insert on public.community_group_members
  for insert to app_authenticated
  with check (
    member_id = app.current_user_id()
    and public.is_active_member()
    and (
      role = 'member'
      or exists (
        select 1 from public.community_groups g
        where g.id = group_id and g.created_by = app.current_user_id()
      )
    )
  );

drop policy if exists community_group_members_delete on public.community_group_members;
create policy community_group_members_delete on public.community_group_members
  for delete to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin());

-- Posts: the block check lives here, so blocked content is invisible at the
-- database layer, not by application convention. Authors always see their own
-- rows (including removed ones); admins see everything.
grant select, insert, update, delete on public.community_posts to app_authenticated;

drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts
  for select to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or (
      public.is_active_member()
      and status = 'active'
      and not exists (
        select 1 from public.community_blocks b
        where b.blocker_id = app.current_user_id()
          and b.blocked_id = author_id
      )
    )
  );

drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts
  for insert to app_authenticated
  with check (
    author_id = app.current_user_id()
    and public.is_active_member()
    and (
      group_id is null
      or exists (
        select 1 from public.community_group_members m
        where m.group_id = community_posts.group_id
          and m.member_id = app.current_user_id()
      )
    )
  );

-- Update is how admins remove (status flip) and authors edit their body.
drop policy if exists community_posts_update on public.community_posts;
create policy community_posts_update on public.community_posts
  for update to app_authenticated
  using (author_id = app.current_user_id() or public.is_admin())
  with check (author_id = app.current_user_id() or public.is_admin());

drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts
  for delete to app_authenticated
  using (author_id = app.current_user_id() or public.is_admin());

-- Comments: same shape as posts.
grant select, insert, update, delete on public.community_comments to app_authenticated;

drop policy if exists community_comments_select on public.community_comments;
create policy community_comments_select on public.community_comments
  for select to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or (
      public.is_active_member()
      and status = 'active'
      and not exists (
        select 1 from public.community_blocks b
        where b.blocker_id = app.current_user_id()
          and b.blocked_id = author_id
      )
    )
  );

drop policy if exists community_comments_insert on public.community_comments;
create policy community_comments_insert on public.community_comments
  for insert to app_authenticated
  with check (author_id = app.current_user_id() and public.is_active_member());

drop policy if exists community_comments_update on public.community_comments;
create policy community_comments_update on public.community_comments
  for update to app_authenticated
  using (author_id = app.current_user_id() or public.is_admin())
  with check (author_id = app.current_user_id() or public.is_admin());

drop policy if exists community_comments_delete on public.community_comments;
create policy community_comments_delete on public.community_comments
  for delete to app_authenticated
  using (author_id = app.current_user_id() or public.is_admin());

-- Likes: yours to give and take away.
grant select, insert, delete on public.community_likes to app_authenticated;

drop policy if exists community_likes_select on public.community_likes;
create policy community_likes_select on public.community_likes
  for select to app_authenticated
  using (public.is_active_member());

drop policy if exists community_likes_insert on public.community_likes;
create policy community_likes_insert on public.community_likes
  for insert to app_authenticated
  with check (member_id = app.current_user_id() and public.is_active_member());

drop policy if exists community_likes_delete on public.community_likes;
create policy community_likes_delete on public.community_likes
  for delete to app_authenticated
  using (member_id = app.current_user_id());

-- Reports: file your own; staff triage. Reporters cannot read anyone else's
-- report or the moderation outcome (same rule as matrimony_reports).
grant select, insert, update on public.community_reports to app_authenticated;

drop policy if exists community_reports_select on public.community_reports;
create policy community_reports_select on public.community_reports
  for select to app_authenticated
  using (reporter_id = app.current_user_id() or public.is_admin());

drop policy if exists community_reports_insert on public.community_reports;
create policy community_reports_insert on public.community_reports
  for insert to app_authenticated
  with check (reporter_id = app.current_user_id() and public.is_active_member());

drop policy if exists community_reports_update on public.community_reports;
create policy community_reports_update on public.community_reports
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Blocks: yours to place and lift.
grant select, insert, delete on public.community_blocks to app_authenticated;

drop policy if exists community_blocks_select on public.community_blocks;
create policy community_blocks_select on public.community_blocks
  for select to app_authenticated
  using (blocker_id = app.current_user_id() or public.is_admin());

drop policy if exists community_blocks_insert on public.community_blocks;
create policy community_blocks_insert on public.community_blocks
  for insert to app_authenticated
  with check (blocker_id = app.current_user_id() and public.is_active_member());

drop policy if exists community_blocks_delete on public.community_blocks;
create policy community_blocks_delete on public.community_blocks
  for delete to app_authenticated
  using (blocker_id = app.current_user_id());
