-- ============================================================================
-- 0049 — Who someone is at a glance, groups by kind, club broadcasts, and an
--        RSVP that follows you out of the app
--
-- Four owner requests, each small enough to have been argued into one file
-- and each with one decision worth writing down.
--
-- ONE. "Engineer | TCS | Toronto" under every name. member_names (0005/0014)
-- carries name, city and job title; the company was missing, so the line
-- could only ever say two of the three. Adding it to the view shows it to
-- every member, which is the point - it is the most ordinary professional
-- fact there is, it already appears on the full profile (0041), and it is
-- not a contact detail. Email, phone and date of birth stay out, as before.
--
-- TWO. Groups come in three kinds: where you live, what you do together, and
-- what you care about. A single column, backfilled from real data rather than
-- a guess: a group is 'location' if its name carries a city any member has
-- actually put on their profile. Nobody has to re-file anything.
--
-- THREE. The club's daily feed. An admin post marked audience = 'club' is
-- shown to every member and inside every group's feed, without the admin
-- having to join each group and post it eight times. Only an admin can mark
-- one, and that is a trigger, not a checkbox: a member sending
-- audience = 'club' in a payload gets a normal post.
--
-- FOUR. Say yes to an event and three things happen: a notification lands in
-- the app, an email arrives with the details and a calendar link, and - if
-- the member has a phone on file and a provider is configured - a text. All
-- three respect the member's `event` notification preference, because a
-- confirmation someone switched off is spam with better manners.
--
--   The SMS half needs somewhere to queue, so sms_outbox mirrors email_outbox:
--   rows are written by this trigger and nothing else (no INSERT grant for app
--   roles), drained server-side, and the number is resolved at send time so no
--   member session ever reads another member's phone.
-- ============================================================================

-- 1. The company, under the name --------------------------------------------------
-- Appended as the LAST column, and replaced in place rather than dropped:
-- other views depend on member_names, and Postgres lets CREATE OR REPLACE add
-- trailing columns to a view while refusing to reorder or retype existing ones.
create or replace view public.member_names
with (security_barrier)
as
select
  p.id,
  p.first_name,
  p.last_name,
  p.city,
  p.job_title,
  p.created_at,
  p.company
from public.profiles p
where public.is_active_member()
  and p.account_status = 'active';

grant select on public.member_names to app_authenticated;

comment on view public.member_names is
  'Names, titles, companies, cities and join dates of active members, for members (0005, 0014, 0049). No contact columns and no date of birth - the club is admin-mediated. Adding a column here shows it to every member.';

-- 2. Groups by kind -------------------------------------------------------------------
alter table public.community_groups
  add column if not exists kind text not null default 'interest'
    check (kind in ('location', 'activity', 'interest'));

comment on column public.community_groups.kind is
  'location = a place (a city group), activity = something members do together (a carpool, a cricket team, a walking group), interest = a topic (0049).';

-- Backfill from what members actually wrote as their city, not a hardcoded list.
update public.community_groups g
   set kind = 'location'
 where exists (
   select 1 from public.profiles p
    where p.city is not null and length(p.city) >= 3
      and g.name ilike '%' || p.city || '%'
 );

update public.community_groups g
   set kind = 'activity'
 where g.kind = 'interest'
   and g.name ~* '(carpool|cricket|badminton|soccer|football|hockey|volleyball|running|hiking|walk|yoga|gym|fitness|chess|photograph|cooking|book club|meetup|volunteer|garba|dandiya|bhangra|dance|music|choir|cycling)';

create index if not exists idx_community_groups_kind on public.community_groups (kind) where not is_archived;

-- 3. Club broadcasts ------------------------------------------------------------------
alter table public.community_posts
  add column if not exists audience text not null default 'normal'
    check (audience in ('normal', 'club')),
  add column if not exists topic text
    check (topic is null or topic in (
      'news', 'immigration', 'jobs', 'housing', 'money', 'health', 'events', 'other'
    ));

comment on column public.community_posts.audience is
  'club = posted by the club for every member, shown in the personal feed and inside every group (0049). Only an admin can set it; guard_post_audience pins it for everyone else.';
comment on column public.community_posts.topic is
  'The daily-feed category a club post belongs to, so members can tell an immigration update from a jobs one at a glance.';

create index if not exists idx_community_posts_club
  on public.community_posts (created_at desc) where audience = 'club' and status = 'active';

/**
 * A member cannot promote their own post to the whole club. Pinned here rather
 * than filtered in the app because the app is not the only way a row can be
 * written, and because "who may speak for the club" is exactly the kind of
 * rule that should not depend on a form remembering to hide a toggle.
 */
create or replace function public.guard_post_audience()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    -- A topic only means something on a club post.
    if new.audience <> 'club' then new.topic := null; end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.audience := 'normal';
    new.topic    := null;
  else
    new.audience := old.audience;
    new.topic    := old.topic;
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_guard_audience on public.community_posts;
create trigger community_posts_guard_audience
  before insert or update on public.community_posts
  for each row execute function public.guard_post_audience();

-- 4. RSVP: notice, email, text ------------------------------------------------------
create table if not exists public.sms_outbox (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 600),
  status       text not null default 'pending'
               check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts     integer not null default 0,
  last_error   text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists sms_outbox_pending_idx
  on public.sms_outbox (status, created_at) where status = 'pending';

comment on table public.sms_outbox is
  'Queued text messages (0049). Written only by SECURITY DEFINER triggers; the phone number is resolved from profiles at send time, server-side, so no member session ever holds another member''s number.';

alter table public.sms_outbox enable row level security;
-- Admins may audit it. Nobody else reads it, and no app role may write it.
grant select on public.sms_outbox to app_authenticated;

drop policy if exists sms_outbox_select on public.sms_outbox;
create policy sms_outbox_select on public.sms_outbox
  for select to app_authenticated
  using (public.is_admin());

/**
 * Saying yes to an event.
 *
 * notify_member() carries every rule an in-app notice needs (preferences,
 * collapse, no self-notification for an ACTOR). This is the member's own
 * action, so p_actor is left null on purpose - otherwise the one notice that
 * is meant for the actor would be the one notify_member suppresses.
 *
 * The email and the text check the same preference, so switching off event
 * notifications switches off all three at once.
 */
create or replace function public.notify_on_event_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  e       record;
  v_when  text;
  v_where text;
begin
  select id, title, event_date, event_time, venue_name, location, city, event_type
    into e
    from public.events where id = new.event_id;
  if e.id is null then
    return new;
  end if;

  v_when := coalesce(to_char(e.event_date, 'FMDay FMDD FMMonth'), 'date to be announced')
            || coalesce(', ' || e.event_time, '');
  v_where := case
    when e.event_type = 'virtual' then 'online'
    else coalesce(e.venue_name, e.location, e.city, 'venue to be announced')
  end;

  perform public.notify_member(
    new.member_id,
    'event',
    'event_rsvp',
    'You are going to ' || e.title,
    v_when || ' · ' || v_where,
    '/portal/member/events/' || e.id::text,
    null,
    'event_rsvp:' || e.id::text,
    jsonb_build_object('eventId', e.id)
  );

  if public.notifications_enabled(new.member_id, 'event') then
    insert into public.email_outbox (recipient_id, template, payload)
    values (
      new.member_id,
      'event_rsvp',
      jsonb_build_object(
        'eventId', e.id, 'title', e.title, 'when', v_when, 'where', v_where,
        'date', e.event_date, 'time', e.event_time, 'online', e.event_type <> 'in_person'
      )
    );

    -- Only when there is a number to send to. The drain normalises it.
    if exists (select 1 from public.profiles p
                where p.id = new.member_id and coalesce(trim(p.phone), '') <> '') then
      insert into public.sms_outbox (recipient_id, body)
      values (
        new.member_id,
        'Professionals Club: you are going to ' || e.title || ' - ' || v_when || ', ' || v_where
          || '. Details: ' || coalesce(current_setting('app.site_url', true), 'https://professionalsclub.vercel.app')
          || '/portal/member/events/' || e.id::text
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists event_rsvps_notify on public.event_rsvps;
create trigger event_rsvps_notify
  after insert on public.event_rsvps
  for each row execute function public.notify_on_event_rsvp();
