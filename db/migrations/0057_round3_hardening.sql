-- ============================================================================
-- 0057: the third audit round
--
-- Round 2 read the code by module. Round 3 audited the LIVE catalog, attacked
-- the running build per technique, and drove the state machines by ordering
-- and timing. What follows is every database-side fix, grouped by the report
-- that found it. Each block says what was wrong in one line.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Outboxes. The Round-2 drains stamp a claimed row 'sending'; neither CHECK
--    allowed the value, so every email and text since has been refused (23514)
--    and silently swallowed. claimed_at lets a drain take back rows a crashed
--    predecessor left in 'sending'; not_before is the retry backoff.
-- ---------------------------------------------------------------------------
alter table public.email_outbox drop constraint if exists email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'skipped'));
alter table public.email_outbox
  add column if not exists claimed_at timestamptz,
  add column if not exists not_before timestamptz;

alter table public.sms_outbox drop constraint if exists sms_outbox_status_check;
alter table public.sms_outbox add constraint sms_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'skipped'));
alter table public.sms_outbox
  add column if not exists claimed_at timestamptz,
  add column if not exists not_before timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Referral notices. The email was queued outside notify_member(), so it
--    ignored notification_prefs and the block list; and the seeker could call
--    the function as often as they liked (25 calls = 25 emails + 25 pushes).
--    A stamp on the request makes each notice happen once.
-- ---------------------------------------------------------------------------
alter table public.referral_direct_requests
  add column if not exists notified_at timestamptz,
  add column if not exists response_notified_at timestamptz;

create or replace function public.notify_referral_request(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r         record;
  v_seeker  text;
  v_company text;
  v_jobs    int;
begin
  select * into r from public.referral_direct_requests where id = p_request for update;
  if r.id is null then
    raise exception 'no such referral request';
  end if;
  if r.seeker_id is distinct from app.current_user_id() and not public.is_admin() then
    raise exception 'only the member who asked may send this notification';
  end if;
  if r.notified_at is not null then
    return;                                   -- already told, once is the deal
  end if;
  update public.referral_direct_requests set notified_at = now() where id = r.id;

  v_seeker  := coalesce(public.member_display_name(r.seeker_id), 'A member');
  select name into v_company from public.companies where id = r.company_id;
  v_jobs := coalesce(array_length(r.job_ids, 1), 0);

  perform public.notify_member(
    r.insider_id, 'referral', 'referral_request',
    v_seeker || ' asked you for a referral at ' || coalesce(v_company, 'their company'),
    case when v_jobs = 1 then 'One role, with a note. Open the chat to answer.'
         else v_jobs || ' roles, with a note. Open the chat to answer.' end,
    '/portal/member/chats',
    r.seeker_id,
    'referral_req:' || r.id::text,
    jsonb_build_object('requestId', r.id)
  );

  -- The email channel follows the same rules as the bell.
  if public.notifications_enabled(r.insider_id, 'referral')
     and not public.is_blocked_between_members(r.insider_id, r.seeker_id) then
    insert into public.email_outbox (recipient_id, template, payload)
    values (
      r.insider_id, 'referral_request',
      jsonb_build_object('company', coalesce(v_company, ''), 'seeker', v_seeker, 'jobCount', v_jobs)
    );
  end if;
end;
$$;

create or replace function public.notify_referral_response(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r         record;
  v_helper  text;
  v_company text;
begin
  select * into r from public.referral_direct_requests where id = p_request for update;
  if r.id is null then
    raise exception 'no such referral request';
  end if;
  if r.insider_id is distinct from app.current_user_id() and not public.is_admin() then
    raise exception 'only the member who was asked may send this notification';
  end if;
  if r.status <> 'accepted' or r.response_notified_at is not null then
    return;
  end if;
  update public.referral_direct_requests set response_notified_at = now() where id = r.id;

  v_helper := coalesce(public.member_display_name(r.insider_id), 'A member');
  select name into v_company from public.companies where id = r.company_id;

  perform public.notify_member(
    r.seeker_id, 'referral', 'referral_accepted',
    v_helper || ' can help at ' || coalesce(v_company, 'their company'),
    'They agreed to help with your request. Carry on in your chat.',
    '/portal/member/chats',
    r.insider_id,
    'referral_ok:' || r.id::text,
    jsonb_build_object('requestId', r.id)
  );

  if public.notifications_enabled(r.seeker_id, 'referral')
     and not public.is_blocked_between_members(r.seeker_id, r.insider_id) then
    insert into public.email_outbox (recipient_id, template, payload)
    values (
      r.seeker_id, 'referral_accepted',
      jsonb_build_object('company', coalesce(v_company, ''), 'helper', v_helper)
    );
  end if;
end;
$$;

-- The weekly cap counted without a lock, so five simultaneous requests let
-- four through a cap of two. The seeker's delete policy let the count be
-- reset; nothing in the app used it since 0019.
create or replace function public.enforce_referral_weekly_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Serialise per seeker so concurrent inserts see each other.
  perform pg_advisory_xact_lock(hashtextextended(new.seeker_id::text, 0));
  if (select count(*) from public.referral_direct_requests
       where seeker_id = new.seeker_id
         and created_at > now() - interval '7 days') >= 2 then
    raise exception 'weekly referral request limit reached';
  end if;
  return new;
end;
$$;

drop policy if exists referral_direct_delete on public.referral_direct_requests;
create policy referral_direct_delete on public.referral_direct_requests
  for delete to app_authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Events. Capacity was displayed and never enforced; a finished event kept
--    accepting RSVPs because nothing ever wrote status = 'past' (the daily cron
--    does now, and the policy no longer depends on it).
-- ---------------------------------------------------------------------------
create or replace function public.guard_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity  integer;
  v_attendees integer;
  v_going     integer;
begin
  -- The events row is the lock, the same shape claim_coupon() uses, so two
  -- members racing for the last place serialise instead of both winning.
  select capacity, attendees into v_capacity, v_attendees
    from public.events where id = new.event_id for update;
  if coalesce(v_capacity, 0) > 0 then
    select count(*) into v_going from public.event_rsvps where event_id = new.event_id;
    if coalesce(v_attendees, 0) + v_going >= v_capacity then
      raise exception 'This event is full.' using errcode = 'P0002';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_event_capacity() from public;

drop trigger if exists event_rsvps_capacity on public.event_rsvps;
create trigger event_rsvps_capacity
  before insert on public.event_rsvps
  for each row execute function public.guard_event_capacity();

drop policy if exists event_rsvps_own on public.event_rsvps;
create policy event_rsvps_own on public.event_rsvps
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (
    public.is_active_member()
    and member_id = app.current_user_id()
    and exists (
      select 1 from public.events e
       where e.id = event_id
         and e.is_published
         and e.moderation_status = 'approved'
         and e.status = 'upcoming'
         and (e.event_date is null or e.event_date >= current_date)
    )
  );

-- The publish fan-out used each member's city as a LIKE pattern over free
-- text, with an unordered LIMIT. Match on the city column first; escape the
-- pattern for rows that predate it.
create or replace function public.notify_on_event_published()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_member record;
begin
  if not new.is_published or new.status <> 'upcoming' or new.moderation_status <> 'approved' then
    return new;
  end if;
  -- Only when it becomes visible, not on every later edit.
  if tg_op = 'UPDATE' and old.is_published and old.status = 'upcoming' and old.moderation_status = 'approved' then
    return new;
  end if;

  -- ponytail: synchronous O(members) inside the publisher's request; a queue
  -- the cron drains is the upgrade when the club outgrows a few thousand.
  for v_member in
    select p.id from public.profiles p
     where p.account_status = 'active'
       and coalesce(p.city, '') <> ''
       and (
         (new.city is not null and lower(p.city) = lower(new.city))
         or (new.city is null and coalesce(new.location, '') ilike
             '%' || replace(replace(replace(p.city, '\', '\\'), '%', '\%'), '_', '\_') || '%')
       )
     order by p.id
     limit 2000
  loop
    perform public.notify_member(
      v_member.id, 'event', 'event_published',
      coalesce(nullif(new.title, ''), 'A new event'),
      case when new.location is null then 'New event' else 'New event in ' || new.location end,
      '/portal/member/events',
      null,
      'event:' || new.id::text,
      jsonb_build_object('eventId', new.id)
    );
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. A held group post that a moderator approves never reached the group: the
--    fan-out ran on INSERT only, and 0053 holds posts before anyone sees them.
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_group_post()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group_name text;
  v_member     record;
begin
  if new.group_id is null or new.status <> 'active' then
    return new;
  end if;
  -- Exactly once, on the transition INTO active.
  if tg_op = 'UPDATE' and old.status = 'active' then
    return new;
  end if;
  select name into v_group_name from public.community_groups where id = new.group_id;

  for v_member in
    select member_id from public.community_group_members
     where group_id = new.group_id and member_id <> new.author_id
  loop
    perform public.notify_member(
      v_member.member_id, 'community', 'group_post',
      coalesce(v_group_name, 'Your group'),
      coalesce(public.member_display_name(new.author_id), 'A member') || ' posted',
      '/portal/member/community/groups/' || new.group_id::text,
      new.author_id,
      'group_post:' || new.group_id::text,
      jsonb_build_object('groupId', new.group_id)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists community_posts_notify on public.community_posts;
create trigger community_posts_notify
  after insert or update of status on public.community_posts
  for each row execute function public.notify_on_group_post();

-- ---------------------------------------------------------------------------
-- 5. Indexes the hot paths had nothing to use: the feed's ORDER BY and the
--    inbox's default page.
-- ---------------------------------------------------------------------------
create index if not exists idx_community_posts_active_created
  on public.community_posts (created_at desc) where status = 'active';
create index if not exists idx_notifications_user_updated
  on public.in_app_notifications (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 6. expire_coupon_reservations() reported coupons touched, not seats freed.
-- ---------------------------------------------------------------------------
create or replace function public.expire_coupon_reservations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  with dead as (
    update public.coupon_redemptions
       set status = 'void'
     where status = 'reserved'
       and expires_at is not null
       and now() > expires_at
    returning coupon_id
  ), tally as (
    select coupon_id, count(*)::int as n from dead group by coupon_id
  ), freed as (
    update public.business_coupons c
       set redeemed_count = greatest(c.redeemed_count - t.n, 0)
      from tally t
     where c.id = t.coupon_id
    returning t.n
  )
  select coalesce(sum(n), 0)::int into v_count from freed;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. The public listing form left "years in business" optional and the
--    function turned a blank into NULL, which the column refused: every such
--    application was dropped with "try again" into the rate limit.
-- ---------------------------------------------------------------------------
alter table public.businesses alter column years_in_business drop not null;

-- ---------------------------------------------------------------------------
-- 8. company_insider_directory relied on the action layer to keep a suspended
--    account out; every other directory view gates itself.
-- ---------------------------------------------------------------------------
create or replace view public.company_insider_directory
with (security_barrier)
as
select
  ci.company_id,
  ci.member_id,
  n.first_name,
  n.last_name,
  ci.job_title,
  ci.verified_by_admin
from public.company_insiders ci
join public.member_names n on n.id = ci.member_id
where ci.can_refer
  and public.is_active_member();

-- ---------------------------------------------------------------------------
-- 9. One block. Three unrelated block tables meant a block from a chat thread
--    left the other person reading your posts and your private profile, and a
--    block from the feed could not be lifted from your profile. Both buttons
--    now write member_blocks; every reader asks is_blocked_between_members(),
--    which still honours the rows the community button wrote before.
-- ---------------------------------------------------------------------------
create or replace function public.is_blocked_between_members(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.member_blocks
     where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  ) or exists (
    select 1 from public.community_blocks
     where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.can_view_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_active_member()
     and not public.is_blocked_between_members(app.current_user_id(), target)
     and coalesce((
       select target = app.current_user_id()
           or public.is_admin()
           or not p.is_private
           or exists (
             select 1 from public.member_follows f
              where f.follower_id = app.current_user_id()
                and f.followee_id = target
                and f.status = 'accepted'
           )
         from public.profiles p
        where p.id = target and p.account_status = 'active'
     ), false);
$$;

-- A block severs the follow graph both ways, so "going public" cannot later
-- accept a blocked member's waiting request, and a follower who is blocked
-- stops being a follower.
create or replace function public.sever_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.member_follows
   where (follower_id = new.blocker_id and followee_id = new.blocked_id)
      or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return null;
end;
$$;
revoke all on function public.sever_follows_on_block() from public;

drop trigger if exists member_blocks_sever_follows on public.member_blocks;
create trigger member_blocks_sever_follows
  after insert on public.member_blocks
  for each row execute function public.sever_follows_on_block();
drop trigger if exists community_blocks_sever_follows on public.community_blocks;
create trigger community_blocks_sever_follows
  after insert on public.community_blocks
  for each row execute function public.sever_follows_on_block();

drop policy if exists member_follows_insert on public.member_follows;
create policy member_follows_insert on public.member_follows
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and follower_id = app.current_user_id()
    and not public.is_blocked_between_members(follower_id, followee_id)
  );

create or replace function public.approve_pending_follows_on_public()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.is_private and not new.is_private then
    update public.member_follows
       set status = 'accepted'
     where followee_id = new.id
       and status = 'pending'
       and not public.is_blocked_between_members(new.id, follower_id);
  end if;
  return new;
end;
$$;

-- The feed policies consulted community_blocks in one direction. Now: the
-- shared predicate, both directions, AND the private-profile gate the
-- repositories apply, so RLS backs that rule up as CLAUDE.md promises.
drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts
  for select to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or (business_id is not null and public.owns_business(business_id))
    or (group_id is not null and public.is_group_admin(group_id))
    or (
      public.is_active_member()
      and status = 'active'
      and not public.is_blocked_between_members(app.current_user_id(), author_id)
      and (author_id is null or group_id is not null or audience = 'club'
           or public.can_view_member(author_id))
    )
  );

drop policy if exists community_comments_select on public.community_comments;
create policy community_comments_select on public.community_comments
  for select to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or exists (
      select 1 from public.community_posts p
       where p.id = community_comments.post_id
         and p.group_id is not null
         and public.is_group_admin(p.group_id)
    )
    or (
      public.is_active_member()
      and status = 'active'
      and not public.is_blocked_between_members(app.current_user_id(), author_id)
      and exists (
        select 1 from public.community_posts p
         where p.id = community_comments.post_id
           and (p.author_id is null or p.group_id is not null or p.audience = 'club'
                or p.author_id = app.current_user_id() or public.can_view_member(p.author_id))
      )
    )
  );

drop policy if exists community_likes_select on public.community_likes;
create policy community_likes_select on public.community_likes
  for select to app_authenticated
  using (
    public.is_active_member()
    and exists (
      select 1 from public.community_posts p
       where p.id = community_likes.post_id
         and (p.author_id is null or p.group_id is not null or p.audience = 'club'
              or p.author_id = app.current_user_id() or public.can_view_member(p.author_id))
    )
  );

-- ---------------------------------------------------------------------------
-- 10. Hiding a matrimony listing, or the club rejecting it, did not hide it
--     from anyone who had shortlisted it or sent a declined interest: three of
--     the view's four branches ignored status and is_hidden. Now approved is
--     required everywhere, and the only reasons to see a hidden listing are an
--     accepted interest or an open conversation with it.
-- ---------------------------------------------------------------------------
create or replace view public.matrimony_visible_profiles with (security_barrier = true) as
 select p.id,
    p.user_id,
    p.status,
    p.created_by,
    case when p.user_id = app.current_user_id() or public.is_admin()
           or public.has_accepted_interest(p.id, public.my_matrimony_profile_id())
         then p.full_name else public.matrimony_display_name(p.id) end as full_name,
    case when p.user_id = app.current_user_id() or public.is_admin()
           or public.has_accepted_interest(p.id, public.my_matrimony_profile_id())
         then p.display_pref else 'full_name' end as display_pref,
    p.gender, p.dob, p.height_cm, p.weight_kg, p.body_type, p.marital_status, p.have_children,
    p.physical_status, p.religion, p.denomination, p.community, p.sub_caste, p.gothra,
    p.mother_tongue, p.languages, p.time_of_birth, p.place_of_birth, p.rashi, p.nakshatra,
    p.manglik, p.country, p.province, p.city, p.residency_status, p.open_to_relocate,
    p.qualification, p.field_of_study, p.institution, p.occupation, p.employer, p.industry,
    p.employment_type, p.work_location, p.income_range, p.family_type, p.family_status,
    p.family_values, p.father_occupation, p.mother_occupation, p.siblings_count,
    p.siblings_married, p.native_place, p.family_about, p.diet, p.smoking, p.drinking,
    p.hobbies, p.about_me, p.completeness_pct, p.is_hidden, p.is_verified_id,
    p.is_verified_photo, p.is_verified_profession, p.photo_visibility, p.last_active_at,
    p.created_at, p.updated_at
   from public.matrimony_profiles p
  where app.current_user_id() is not null
    and public.my_matrimony_profile_id() is not null
    and not public.is_blocked_between(p.id, public.my_matrimony_profile_id())
    and p.status = 'approved'
    and (
      p.is_hidden = false
      or public.has_accepted_interest(p.id, public.my_matrimony_profile_id())
      or exists (select 1 from public.matrimony_conversations c
                  where (public.my_matrimony_profile_id() = c.profile_a_id or public.my_matrimony_profile_id() = c.profile_b_id)
                    and (p.id = c.profile_a_id or p.id = c.profile_b_id))
    );

-- matrimony_owner() resolved ANY listing id, including a hidden or draft one,
-- to the owner's club account, and member_display_name() then gave the full
-- legal name: the display_pref reduction 0055 added was one query away from
-- meaningless. The lookup now answers only for the owner, an admin, or a
-- matched pair (its two callers), and the name helper is trigger-only.
create or replace function public.matrimony_owner(profile uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.user_id
    from public.matrimony_profiles p
   where p.id = profile
     and (p.user_id = app.current_user_id()
          or public.is_admin()
          or public.has_accepted_interest(p.id, public.my_matrimony_profile_id()));
$$;
revoke all on function public.member_display_name(uuid) from public, app_authenticated, app_anonymous;

-- A policy of `true` let a suspended account and a business login list every
-- matrimony profile id through the E2E key table.
drop policy if exists matrimony_e2e_keys_select on public.matrimony_e2e_keys;
create policy matrimony_e2e_keys_select on public.matrimony_e2e_keys
  for select to app_authenticated
  using (public.is_active_member());

-- ---------------------------------------------------------------------------
-- 11. Shared attendance is deliberate; a PRIVATE member's attendance is not.
--     The view ran as owner with no per-caller gate.
-- ---------------------------------------------------------------------------
create or replace view public.member_event_participation
with (security_barrier)
as
select
  r.member_id,
  e.id           as event_id,
  e.title,
  e.event_date,
  e.event_time,
  e.location,
  e.event_type,
  e.status,
  e.image
from public.event_rsvps r
join public.events e on e.id = r.event_id
where public.is_active_member()
  and e.is_published
  and e.moderation_status = 'approved'
  and public.can_view_member(r.member_id);

-- ---------------------------------------------------------------------------
-- 12. Reports. One member could file the same report without limit, and each
--     one pushed attacker-chosen text to every moderator.
-- ---------------------------------------------------------------------------
delete from public.community_reports r
 using public.community_reports keep
 where keep.reporter_id = r.reporter_id
   and keep.target_type = r.target_type
   and keep.target_id = r.target_id
   and keep.created_at < r.created_at;
create unique index if not exists uq_community_reports_once
  on public.community_reports (reporter_id, target_type, target_id);

create or replace function public.notify_group_moderators_on_report()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_group uuid;
begin
  if new.target_type = 'post' then
    select p.group_id into v_group from public.community_posts p where p.id = new.target_id;
  else
    select p.group_id into v_group from public.community_comments c join public.community_posts p on p.id = c.post_id where c.id = new.target_id;
  end if;
  if v_group is not null then
    -- The reporter's own words stay in the queue, not in a push.
    perform public.notify_group_moderators(v_group, 'A member reported something in your group', 'Open the moderation queue to review it.');
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. Coupons. A member who owns a business could claim and spend that
--     business's own coupons, running both ends of the handshake.
-- ---------------------------------------------------------------------------
create or replace function public.claim_coupon(p_coupon uuid)
returns table(code text, status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member uuid := app.current_user_id();
  v_coupon public.business_coupons%rowtype;
  v_mine   integer;
  v_last   timestamptz;
  v_freed  integer;
  v_code   text;
  v_status text;
  v_expires timestamptz;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if v_member is null then
    raise exception 'Sign in to use member offers' using errcode = '42501';
  end if;

  if not public.is_active_member() then
    raise exception 'Only active members can claim a coupon' using errcode = '42501';
  end if;

  select * into v_coupon from public.business_coupons
   where id = p_coupon
   for update;

  if not found then
    raise exception 'That offer is no longer available' using errcode = 'P0002';
  end if;

  -- 0057: the business cannot be its own customer.
  if public.owns_business(v_coupon.business_id) then
    raise exception 'This offer belongs to your own business' using errcode = 'P0002';
  end if;

  if not v_coupon.is_active then
    raise exception 'That offer has been paused by the business' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.businesses b
     where b.id = v_coupon.business_id and b.verification_status = 'verified'
  ) then
    raise exception 'That offer is no longer available' using errcode = 'P0002';
  end if;

  if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
    raise exception 'That offer has not started yet' using errcode = 'P0002';
  end if;

  if v_coupon.ends_at is not null and now() > v_coupon.ends_at then
    raise exception 'That offer has expired' using errcode = 'P0002';
  end if;

  update public.coupon_redemptions r
     set status = 'void'
   where r.coupon_id = p_coupon
     and r.member_id = v_member
     and r.status = 'reserved'
     and r.expires_at is not null
     and now() > r.expires_at;
  get diagnostics v_freed = row_count;

  if v_freed > 0 then
    update public.business_coupons
       set redeemed_count = greatest(redeemed_count - v_freed, 0)
     where id = p_coupon;
    select * into v_coupon from public.business_coupons where id = p_coupon for update;
  end if;

  if v_coupon.total_limit is not null and v_coupon.redeemed_count >= v_coupon.total_limit then
    raise exception 'This offer has been fully claimed' using errcode = 'P0002';
  end if;

  select count(*), max(created_at) into v_mine, v_last
    from public.coupon_redemptions r
   where r.coupon_id = p_coupon
     and r.member_id = v_member
     and r.status <> 'void';

  if v_mine >= v_coupon.per_member_limit then
    raise exception 'You have already claimed this offer' using errcode = 'P0002';
  end if;

  if v_coupon.cooldown_days > 0 and v_last is not null
     and now() < v_last + (v_coupon.cooldown_days || ' days')::interval then
    raise exception 'You can use this offer again on %',
      to_char(v_last + (v_coupon.cooldown_days || ' days')::interval, 'FMMon FMDD')
      using errcode = 'P0002';
  end if;

  if v_coupon.redeem_mode = 'online' then
    v_status  := 'redeemed';
    v_expires := v_coupon.ends_at;
  else
    v_status  := 'reserved';
    v_expires := least(coalesce(v_coupon.ends_at, now() + interval '30 minutes'),
                       now() + interval '30 minutes');
  end if;

  for attempt in 1..5 loop
    v_code := '';
    for i in 1..8 loop
      -- Two random bytes over a 31-letter alphabet: the one-byte version
      -- favoured the first eight letters by a twelfth.
      v_code := v_code || substr(v_alphabet, 1 + ((get_byte(gen_random_bytes(2), 0) * 256 + get_byte(gen_random_bytes(2), 1)) % 31), 1);
    end loop;
    begin
      insert into public.coupon_redemptions
        (coupon_id, business_id, member_id, code, status, expires_at, redeemed_at)
      values
        (p_coupon, v_coupon.business_id, v_member, v_code, v_status, v_expires,
         case when v_status = 'redeemed' then now() else null end);
      exit;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
      v_code := null;
    end;
  end loop;

  update public.business_coupons
     set redeemed_count = redeemed_count + 1
   where id = p_coupon;

  return query select v_code, v_status, v_expires;
end;
$$;

create or replace function public.mark_coupon_redeemed(p_code text)
returns table(outcome text, coupon_title text, redeemed_at timestamptz, discount_kind text, percent_off integer, amount_off_cents integer, currency text, min_spend_cents integer, terms text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.coupon_redemptions%rowtype;
  v_c   public.business_coupons%rowtype;
  v_today smallint := extract(dow from now())::smallint;
begin
  select * into v_row from public.coupon_redemptions
   where upper(code) = upper(trim(p_code))
   for update;

  if not found then
    return query select 'not_found'::text, null::text, null::timestamptz,
                        null::text, null::integer, null::integer, null::text,
                        null::integer, null::text;
    return;
  end if;

  -- Somebody else's code is, from this till's point of view, not a code. And
  -- (0057) so is a code the person at the till claimed themselves.
  if not (public.owns_business(v_row.business_id) or public.is_admin())
     or v_row.member_id = app.current_user_id() then
    return query select 'not_found'::text, null::text, null::timestamptz,
                        null::text, null::integer, null::integer, null::text,
                        null::integer, null::text;
    return;
  end if;

  select * into v_c from public.business_coupons where id = v_row.coupon_id;

  if v_row.status = 'redeemed' then
    return query select 'already_used'::text, v_c.title, v_row.redeemed_at,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  if v_row.status = 'void' then
    return query select 'void'::text, v_c.title, null::timestamptz,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  if v_row.expires_at is not null and now() > v_row.expires_at then
    update public.coupon_redemptions set status = 'void' where id = v_row.id;
    update public.business_coupons
       set redeemed_count = greatest(redeemed_count - 1, 0)
     where id = v_row.coupon_id;
    return query select 'expired'::text, v_c.title, null::timestamptz,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  if array_length(v_c.valid_days, 1) is not null and not (v_today = any(v_c.valid_days)) then
    return query select 'wrong_day'::text, v_c.title, null::timestamptz,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  if not v_c.is_active then
    return query select 'paused'::text, v_c.title, null::timestamptz,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  update public.coupon_redemptions
     set status = 'redeemed', redeemed_at = now(), redeemed_by = app.current_user_id()
   where id = v_row.id;

  return query select 'redeemed'::text, v_c.title, now(),
                      v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                      v_c.currency, v_c.min_spend_cents, v_c.terms;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. The club must keep one active admin. Reactivation is admin-only, so an
--     admin suspending themselves on a one-admin deployment locked everyone
--     out; the console refuses first (portal.ts), the database refuses last.
-- ---------------------------------------------------------------------------
create or replace function public.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role = 'admin' and old.account_status = 'active'
     and (new.role <> 'admin' or new.account_status <> 'active')
     and not exists (
       select 1 from public.profiles
        where role = 'admin' and account_status = 'active' and id <> old.id
     ) then
    raise exception 'The club must keep at least one active admin.' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_last_admin() from public;

drop trigger if exists profiles_guard_last_admin on public.profiles;
create trigger profiles_guard_last_admin
  before update of role, account_status on public.profiles
  for each row execute function public.guard_last_admin();

-- ---------------------------------------------------------------------------
-- 15. log_audit() accepted any member: fifty forged "Suspended by an admin"
--     lines in the record admins consult. Its four callers are all admin.
-- ---------------------------------------------------------------------------
create or replace function public.log_audit(p_action_type text, p_target_type text, p_target_id text, p_description text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = app.current_user_id();

  if v_profile.id is null then
    raise exception 'log_audit requires an authenticated user';
  end if;
  if not public.is_admin() then
    raise exception 'log_audit is for admins' using errcode = '42501';
  end if;

  insert into public.audit_log (
    actor_id, actor_name, actor_role,
    action_type, target_type, target_id, description, metadata
  )
  values (
    v_profile.id,
    trim(v_profile.first_name || ' ' || v_profile.last_name),
    v_profile.role,
    p_action_type, p_target_type, p_target_id, p_description, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 16. Grant hygiene the 0055 loop missed: create_profile() was executable by
--     PUBLIC (an anonymous session could call the one writer into profiles),
--     and four predicates kept their implicit PUBLIC grant.
-- ---------------------------------------------------------------------------
revoke all on function public.create_profile(uuid, text, jsonb) from public, app_authenticated, app_anonymous;
revoke all on function public.is_admin() from public;
revoke all on function public.is_active_member() from public;
revoke all on function public.is_blocked_between(uuid, uuid) from public;
revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_admin(), public.is_active_member(),
                          public.is_blocked_between(uuid, uuid),
                          public.is_conversation_participant(uuid)
   to app_authenticated, app_anonymous;
