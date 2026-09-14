-- ============================================================================
-- 0050 — Businesses speak in the community, and members are pointed at the
--        businesses their circle already trusts
--
-- BUSINESS POSTS. A business account (0046) is deliberately not a member: it
-- has no profile row, so it cannot author a post the way the schema stood
-- (author_id references profiles and every policy says "author = me"). Rather
-- than bend that - giving a business a profile is the door 0046 nailed shut -
-- a post gets a second kind of author: business_id. One of the two must be
-- set, never both. A business post is bylined with the business's name and
-- logo, links to its page, and is otherwise an ordinary post members can like,
-- comment on and report.
--
--   Reach is opt-in. A business has no followers (member_follows is member to
--   member), so its posts appear on its own page and in the personal feed of
--   members who SAVED it. Saving a business is how a member says "tell me what
--   they are up to", which makes it the right signal here and, below, the
--   right signal for recommendations. A business cannot post into a group,
--   cannot speak as the club (guard_post_audience pins that), and cannot like
--   or comment - those policies say is_active_member() and stay that way.
--
--   Two existing triggers notify a post's AUTHOR on like and comment. A
--   business post has none, and notify_member(null) would fail the like. Both
--   now return early when there is nobody to tell.
--
-- RECOMMENDATIONS. One SECURITY DEFINER function scores every verified
-- business a member has not saved, from four things the member already gave
-- us: who they follow (and what those people saved), what they themselves
-- save, where they live, and what they do. It runs as definer for one reason:
-- member_saved_businesses is readable only by its owner, and "people you
-- follow saved this" has to read THEIR rows. The function returns only what
-- the sentence needs - a count and up to two first names of ACCEPTED followees
-- - which is a deliberate disclosure in the 0041 spirit: someone you follow
-- saving a business is the kind of thing a club exists to pass on.
-- ============================================================================

-- 1. A post may come from a business ------------------------------------------------
alter table public.community_posts
  alter column author_id drop not null;

alter table public.community_posts
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.community_posts
  drop constraint if exists community_posts_has_author;
alter table public.community_posts
  add constraint community_posts_has_author check (
    (author_id is not null and business_id is null)
    or (author_id is null and business_id is not null)
  );

create index if not exists idx_community_posts_business
  on public.community_posts (business_id, created_at desc) where business_id is not null;

comment on column public.community_posts.business_id is
  'Set when a business account posted this (0050). Exactly one of author_id / business_id is set. Such a post has no group, no club audience, and is shown on the business page and to members who saved the business.';

-- Members read business posts exactly as they read any other active post;
-- the business reads its own. The blocked-author clause is unchanged and is
-- simply false for a post with no author.
drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts
  for select to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or (business_id is not null and public.owns_business(business_id))
    or (
      public.is_active_member()
      and status = 'active'
      and not exists (
        select 1 from public.community_blocks b
         where b.blocker_id = app.current_user_id()
           and b.blocked_id = community_posts.author_id
      )
    )
  );

drop policy if exists community_posts_business_insert on public.community_posts;
create policy community_posts_business_insert on public.community_posts
  for insert to app_authenticated
  with check (
    business_id is not null
    and author_id is null
    and group_id is null
    and public.is_business_user()
    and public.owns_business(business_id)
    and exists (
      select 1 from public.businesses b
       where b.id = business_id and b.verification_status = 'verified'
    )
  );

drop policy if exists community_posts_business_update on public.community_posts;
create policy community_posts_business_update on public.community_posts
  for update to app_authenticated
  using (business_id is not null and public.owns_business(business_id))
  with check (business_id is not null and public.owns_business(business_id));

drop policy if exists community_posts_business_delete on public.community_posts;
create policy community_posts_business_delete on public.community_posts
  for delete to app_authenticated
  using (business_id is not null and public.owns_business(business_id));

-- 2. Nobody to notify ---------------------------------------------------------------
create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_author uuid;
begin
  select author_id into v_author from public.community_posts where id = new.post_id;
  -- A business post has no member to tell; business accounts have no inbox.
  if v_author is null then
    return new;
  end if;
  perform public.notify_member(
    v_author, 'community', 'post_like',
    coalesce(public.member_display_name(new.member_id), 'A member'),
    'Liked your post',
    '/portal/member/community',
    new.member_id,
    'like:' || new.post_id::text,
    jsonb_build_object('postId', new.post_id)
  );
  return new;
end;
$$;

create or replace function public.notify_on_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_author uuid;
begin
  if new.status <> 'active' then
    return new;
  end if;
  select author_id into v_author from public.community_posts where id = new.post_id;
  if v_author is null then
    return new;
  end if;
  perform public.notify_member(
    v_author, 'community', 'post_comment',
    coalesce(public.member_display_name(new.author_id), 'A member'),
    'Commented on your post',
    '/portal/member/community',
    new.author_id,
    'comment:' || new.post_id::text,
    jsonb_build_object('postId', new.post_id)
  );
  return new;
end;
$$;

-- 3. Recommendations ---------------------------------------------------------------
/**
 * Verified businesses this member has not saved, scored and explained.
 *
 *   followee_savers   how many people I follow (accepted) saved it
 *   followee_names    up to two of their first names, for the sentence
 *   category_affinity I already save businesses in this category
 *   city_match        it is in my city
 *   interest_match    my industry / role / category / skills name it
 *
 * The score weights the social signal highest: a business three people you
 * trust have saved is a stronger tip than a category you once bookmarked.
 * Featured is a tie-breaker, not a reason - the club's editorial choice should
 * not masquerade as a personal one.
 */
create or replace function public.business_recommendations(p_limit integer default 12)
returns table (
  business_id       uuid,
  score             integer,
  followee_savers   integer,
  followee_names    text[],
  category_affinity boolean,
  city_match        boolean,
  interest_match    boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select p.id, p.city, p.industry, p.job_title, p.professional_category, p.skills
      from public.profiles p
     where p.id = app.current_user_id() and p.account_status = 'active'
  ),
  followees as (
    select f.followee_id as id
      from public.member_follows f
     where f.follower_id = app.current_user_id() and f.status = 'accepted'
  ),
  my_saves as (
    select s.business_id from public.member_saved_businesses s
     where s.member_id = app.current_user_id()
  ),
  saved_categories as (
    select distinct b.category from public.businesses b
     where b.id in (select business_id from my_saves)
  ),
  -- Words from what the member does, four letters or longer, so "IT" and
  -- "and" do not match everything.
  my_terms as (
    select distinct lower(t) as term
      from me,
           regexp_split_to_table(
             coalesce(me.industry, '') || ' ' || coalesce(me.job_title, '') || ' '
             || coalesce(me.professional_category, '') || ' ' || coalesce(me.skills, ''),
             '[^A-Za-z]+'
           ) as t
     where length(t) >= 4
  ),
  social as (
    select s.business_id,
           count(*)::int as savers,
           (array_agg(p.first_name order by s.created_at desc))[1:2] as names
      from public.member_saved_businesses s
      join public.profiles p on p.id = s.member_id and p.account_status = 'active'
     where s.member_id in (select id from followees)
     group by s.business_id
  ),
  scored as (
    select
      b.id as business_id,
      coalesce(so.savers, 0) as followee_savers,
      coalesce(so.names, '{}'::text[]) as followee_names,
      (b.category in (select category from saved_categories)) as category_affinity,
      (coalesce((select city from me), '') <> ''
         and lower(coalesce(b.city, '')) = lower((select city from me))) as city_match,
      exists (
        select 1 from my_terms t
         where (b.name || ' ' || b.category || ' ' || coalesce(b.subcategory, '') || ' '
                || coalesce(b.description_short, '')) ilike '%' || t.term || '%'
      ) as interest_match,
      b.is_featured
      from public.businesses b
      left join social so on so.business_id = b.id
     where b.verification_status = 'verified'
       and exists (select 1 from me)
       and b.id not in (select business_id from my_saves)
  )
  select
    business_id,
    (3 * least(followee_savers, 3)
      + case when category_affinity then 2 else 0 end
      + case when city_match then 2 else 0 end
      + case when interest_match then 1 else 0 end) as score,
    followee_savers,
    followee_names,
    category_affinity,
    city_match,
    interest_match
    from scored
   where (3 * least(followee_savers, 3)
      + case when category_affinity then 2 else 0 end
      + case when city_match then 2 else 0 end
      + case when interest_match then 1 else 0 end) > 0
   order by 2 desc, is_featured desc, followee_savers desc
   limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;

revoke all on function public.business_recommendations(integer) from public;
grant execute on function public.business_recommendations(integer) to app_authenticated;

comment on function public.business_recommendations(integer) is
  'Verified businesses the caller has not saved, scored from who they follow, what they save, their city and their work (0050). Reads followees'' saves as definer; returns a count and up to two first names of accepted followees - a deliberate disclosure.';
