-- ============================================================================
-- 0051: Private profiles, and follows that are requests again
--
-- Every member profile is private unless its owner says otherwise. A private
-- profile shows its name, what the member does, where they are and their
-- counts to any signed-in member - the same line that already sits under every
-- post - and nothing more until that member accepts a follow request. Public
-- profiles behave as before.
--
-- The follow graph carries the request: an insert lands as 'pending' when the
-- target is private and 'accepted' when they are not. The DATABASE decides
-- which, in a trigger, so a client cannot mint an accepted edge into a private
-- profile. Only the followee may flip pending to accepted (0018 policy).
--
-- Notifications: a request tells the followee, an acceptance tells the
-- follower, a new follower of a public profile is told as before. All ride
-- notify_member(), so push, prefs and block silence come for free (0031-0038).
--
-- Going public approves whatever was waiting, the way every network does it.
-- ============================================================================

-- 1. The flag ------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_private boolean not null default true;

comment on column public.profiles.is_private is
  'Private by default (0051): work, skills, education, events, business and posts are shown only to accepted followers, admins and the member. Name, byline, city and counts stay visible to members.';

-- 2. Who may see the whole profile ------------------------------------------------
create or replace function public.can_view_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_active_member()
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

revoke all on function public.can_view_member(uuid) from public;
grant execute on function public.can_view_member(uuid) to app_authenticated;

comment on function public.can_view_member(uuid) is
  'True when the caller may read a member''s full profile and posts: themselves, an admin, a public profile, or a private one they follow with an accepted edge (0051).';

-- 3. The profile view says whether it is private -------------------------------------
drop view if exists public.member_profiles;

create view public.member_profiles
with (security_barrier)
as
select
  p.id,
  p.first_name,
  p.last_name,
  p.job_title,
  p.company,
  p.industry,
  p.professional_category,
  p.experience_range,
  p.education_level,
  p.field_of_study,
  p.skills,
  p.certifications,
  p.professional_summary,
  p.linkedin_url,
  p.city,
  p.province,
  p.is_volunteer,
  p.verification_status,
  p.created_at,
  p.is_private
from public.profiles p
where public.is_active_member()
  and p.account_status = 'active';

grant select on public.member_profiles to app_authenticated;

comment on view public.member_profiles is
  'The professional half of a member profile, for signed-in members (0041, 0051). The repository nulls the private half unless can_view_member() says otherwise; the flag itself is public so a page can say "this profile is private". No contact columns.';

-- 4. A follow is a request when the target is private ------------------------------
create or replace function public.guard_follow_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select case when p.is_private then 'pending' else 'accepted' end
    into new.status
    from public.profiles p
   where p.id = new.followee_id;
  if new.status is null then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists member_follows_guard_status on public.member_follows;
create trigger member_follows_guard_status
  before insert on public.member_follows
  for each row execute function public.guard_follow_status();

alter table public.member_follows alter column status set default 'pending';

-- 5. Going public lets the waiting requests in ---------------------------------------
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
     where followee_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_public_approves_follows on public.profiles;
create trigger profiles_public_approves_follows
  after update of is_private on public.profiles
  for each row execute function public.approve_pending_follows_on_public();

-- 6. Who gets told ---------------------------------------------------------------------
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify_member(
      new.followee_id, 'social', 'follow_request',
      coalesce(public.member_display_name(new.follower_id), 'A member'),
      'Wants to follow you',
      '/portal/member/people/requests',
      new.follower_id,
      'follow_req:' || new.follower_id::text,
      '{}'::jsonb
    );
  elsif tg_op = 'INSERT' and new.status = 'accepted' then
    perform public.notify_member(
      new.followee_id, 'social', 'follow_new',
      coalesce(public.member_display_name(new.follower_id), 'A member'),
      'Started following you',
      '/portal/member/people/' || new.follower_id::text,
      new.follower_id,
      'follow_new:' || new.follower_id::text,
      '{}'::jsonb
    );
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    perform public.notify_member(
      new.follower_id, 'social', 'follow_accepted',
      coalesce(public.member_display_name(new.followee_id), 'A member'),
      'Accepted your follow request',
      '/portal/member/people/' || new.followee_id::text,
      new.followee_id,
      'follow_ok:' || new.followee_id::text,
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists member_follows_notify on public.member_follows;
create trigger member_follows_notify
  after insert or update of status on public.member_follows
  for each row execute function public.notify_on_follow();

-- A declined or withdrawn request takes its notice with it; a stale "wants to
-- follow you" that no longer has a request behind it is a dead end.
create or replace function public.retract_follow_request_notice()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status = 'pending' then
    delete from public.in_app_notifications n
     where n.user_id = old.followee_id
       and n.type = 'follow_request'
       and n.group_key = 'follow_req:' || old.follower_id::text;
  end if;
  return old;
end;
$$;

drop trigger if exists member_follows_retract_notice on public.member_follows;
create trigger member_follows_retract_notice
  after delete on public.member_follows
  for each row execute function public.retract_follow_request_notice();
