-- ============================================================================
-- 0060: like and comment counts as columns kept by triggers, and two indexes
--
-- The feed's POST_SELECT computed like_count and comment_count as correlated
-- subqueries. The SELECT policy on community_likes (0057) re-evaluates the
-- whole post-visibility predicate - is_active_member(), can_view_member() -
-- once per like row it counts, so the September perf audit measured 20 posts
-- with 93 likes at ~2,900 shared buffers, growing ~0.16 ms per like row. The
-- counts now live on community_posts and move with the rows that define them,
-- the idiom the notification producers (0031-0037) already use.
--
--   * The count triggers are SECURITY DEFINER because the like is the liker's
--     row and the post is somebody else's: RLS lets a member insert the like
--     but never touch the post.
--   * Only an 'active' comment counts. 'held' and 'removed' never did, so a
--     moderator's status flip moves the count too.
--   * A member's own statement cannot forge a count: guard_post_counters pins
--     both columns on INSERT and on any UPDATE that does not come from another
--     trigger (pg_trigger_depth() > 1), the test 0059 uses for is_volunteer.
--     The backfill below runs BEFORE that guard exists for the same reason.
--
-- Also here, from the same audit:
--   * community_group_members had no index led by member_id (the PK leads
--     with group_id), and "which groups am I in" runs on every Community and
--     dashboard load.
--   * community_likes (post_id, created_at desc): the two liker names shown
--     under a post read every like on it, each through the policy, to keep
--     two. The ordered index lets the LIMIT stop after two visible rows.
-- ============================================================================

-- 1. The columns, backfilled as the owner (RLS off, so every row is counted) ----
alter table public.community_posts
  add column if not exists like_count    integer not null default 0,
  add column if not exists comment_count integer not null default 0;

comment on column public.community_posts.like_count is
  'Rows in community_likes for this post. Trigger-maintained (0060); pinned against direct writes.';
comment on column public.community_posts.comment_count is
  'Active comments on this post. Trigger-maintained (0060); pinned against direct writes.';

update public.community_posts p
   set like_count    = (select count(*) from public.community_likes l where l.post_id = p.id),
       comment_count = (select count(*) from public.community_comments c
                         where c.post_id = p.id and c.status = 'active');

-- 2. Keep them moving ----------------------------------------------------------
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.community_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists community_likes_count on public.community_likes;
create trigger community_likes_count
  after insert or delete on public.community_likes
  for each row execute function public.sync_post_like_count();

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_post  uuid;
  v_delta integer := 0;
begin
  if tg_op = 'INSERT' then
    v_post := new.post_id;
    if new.status = 'active' then v_delta := 1; end if;
  elsif tg_op = 'DELETE' then
    v_post := old.post_id;
    if old.status = 'active' then v_delta := -1; end if;
  else
    v_post := new.post_id;
    v_delta := (new.status = 'active')::int - (old.status = 'active')::int;
  end if;
  if v_delta <> 0 then
    update public.community_posts
       set comment_count = greatest(comment_count + v_delta, 0)
     where id = v_post;
  end if;
  return null;
end;
$$;

drop trigger if exists community_comments_count on public.community_comments;
create trigger community_comments_count
  after insert or delete or update of status on public.community_comments
  for each row execute function public.sync_post_comment_count();

-- 3. Nobody writes them by hand -----------------------------------------------
create or replace function public.guard_post_counters()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.like_count    := 0;
    new.comment_count := 0;
  elsif pg_trigger_depth() <= 1 then
    new.like_count    := old.like_count;
    new.comment_count := old.comment_count;
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_guard_counters on public.community_posts;
create trigger community_posts_guard_counters
  before insert or update on public.community_posts
  for each row execute function public.guard_post_counters();

-- 4. The indexes ----------------------------------------------------------------
create index if not exists community_group_members_member_idx
  on public.community_group_members (member_id);

create index if not exists community_likes_post_recent_idx
  on public.community_likes (post_id, created_at desc);
