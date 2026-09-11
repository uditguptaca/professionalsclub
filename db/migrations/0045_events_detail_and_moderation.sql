-- ============================================================================
-- 0045 — Events grow up: a real inner page, ticket types, and moderation
--
-- Four things, all of them consequences of letting somebody other than an
-- admin post an event.
--
-- ONE. An event now carries enough to deserve its own page: a gallery, a
-- venue, a city, an organiser line, and a join link for the online ones.
-- Until now the entire event was a title, a date and one image.
--
-- TWO. Admission. A business asked for "free to attend" vs "paid", so the
-- price is a real column pair (amount + currency) rather than a sentence
-- buried in the description that nothing can filter or sort on.
--
-- THREE. Moderation, and this is the load-bearing part. 0039 let a verified
-- business publish an event straight to every member's Events tab with no
-- club in the loop. That is a publishing channel into a newcomers' community
-- owned by an outside party, which is exactly the thing that needs a gate.
-- Business events now land 'pending' and are invisible until an admin
-- approves them.
--
--   The hole that always follows moderation is the EDIT: approve a clean
--   event, then swap the description for something else. So a content edit by
--   a business sends the event back to pending. Housekeeping edits (the draft
--   switch, the offline attendee count) do not, or nobody would ever fix a
--   typo. The rule lives in a trigger, not in the app, because the app is not
--   the only way a row can change.
--
-- FOUR. Volunteers may post club events, the same way 0044 let them add
-- employers and roles. They are approved people doing the club's own work, so
-- their events are not moderated - but they ARE attributed (created_by), and
-- a volunteer may only touch what they posted themselves.
-- ============================================================================

-- 1. One definition of "a curator" --------------------------------------------
-- 0044 shipped can_curate_jobs(); events want exactly the same predicate, and
-- two copies of "admin or approved volunteer" would drift the first time the
-- rule changed. can_curate_jobs() keeps its name (policies reference it) and
-- becomes a thin call onto the shared one.
create or replace function public.is_curator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = app.current_user_id()
       and p.account_status = 'active'
       and (p.role = 'admin' or p.is_volunteer)
  );
$$;

revoke all on function public.is_curator() from public;
grant execute on function public.is_curator() to app_authenticated;

comment on function public.is_curator() is
  'An admin, or an approved volunteer, on an active account. The single definition behind can_curate_jobs() (0044) and the event curator policies (0045).';

create or replace function public.can_curate_jobs()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_curator();
$$;

-- 2. What an event is now ------------------------------------------------------
alter table public.events
  -- The inner page
  add column if not exists gallery      text[] not null default '{}',
  add column if not exists venue_name   text,
  add column if not exists city         text,
  add column if not exists organiser    text,
  add column if not exists online_url   text,
  add column if not exists contact_email text,
  -- Admission
  add column if not exists admission    text not null default 'free'
    check (admission in ('free', 'paid')),
  add column if not exists price_cents  integer not null default 0 check (price_cents >= 0),
  add column if not exists currency     text not null default 'CAD',
  -- Who posted it, and whether the club has looked at it
  add column if not exists created_by   uuid references public.profiles(id) on delete set null,
  add column if not exists moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  add column if not exists moderation_note text,
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null,
  add column if not exists moderated_at timestamptz;

comment on column public.events.gallery is
  'Extra images for the event page, in display order. events.image stays the single cover used by every card.';
comment on column public.events.city is
  'The city this event belongs to, for the member Events tab. Was inferred from a LIKE against the free-text location, which missed every event whose address did not spell the city out.';
comment on column public.events.online_url is
  'The join link for a virtual event. Deliberately not rendered to anonymous visitors - it is handed to signed-in members who said they are coming.';
comment on column public.events.moderation_status is
  'Business-posted events start pending and are invisible to members until an admin approves them (0045). Club events posted by an admin or volunteer start approved.';

create index if not exists idx_events_moderation
  on public.events (moderation_status) where moderation_status = 'pending';

create index if not exists idx_events_created_by
  on public.events (created_by) where created_by is not null;

-- Everything already in the table was posted by the club, so it stays visible.
update public.events set moderation_status = 'approved' where moderation_status is null;

-- 3. Members see approved events only -------------------------------------------
-- The one place this rule can be enforced for every reader at once.
drop policy if exists events_select_published on public.events;
create policy events_select_published on public.events
  for select to app_authenticated, app_anonymous
  using (is_published and moderation_status = 'approved');

-- An owner or curator must still see their own drafts and anything waiting on
-- the club, or the management screen would go blank the moment it was needed.
drop policy if exists events_mine_read on public.events;
create policy events_mine_read on public.events
  for select to app_authenticated
  using (
    (created_by is not null and created_by = app.current_user_id())
    or (business_id is not null and exists (
          select 1 from public.businesses b
           where b.id = business_id and b.created_by = app.current_user_id()))
  );

-- 4. Curators post club events --------------------------------------------------
drop policy if exists events_curator_insert on public.events;
create policy events_curator_insert on public.events
  for insert to app_authenticated
  with check (public.is_curator() and business_id is null);

drop policy if exists events_curator_update on public.events;
create policy events_curator_update on public.events
  for update to app_authenticated
  using (public.is_curator() and created_by = app.current_user_id())
  with check (public.is_curator() and created_by = app.current_user_id());

drop policy if exists events_curator_delete on public.events;
create policy events_curator_delete on public.events
  for delete to app_authenticated
  using (public.is_curator() and created_by = app.current_user_id());

-- 5. The guard: what a non-admin may not decide ---------------------------------
/**
 * Replaces the 0039 trigger, which covered only the business case.
 *
 * Everything an admin alone may decide is pinned here: featuring, the offline
 * attendee counter, who the event belongs to, and its moderation verdict. The
 * moderation reset is the interesting half - see the file header.
 */
create or replace function public.guard_event_owner_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  content_changed boolean;
begin
  if public.is_admin() then
    -- Only an admin can decide a verdict, so only an admin stamps it.
    if tg_op = 'UPDATE' and new.moderation_status is distinct from old.moderation_status then
      new.moderated_by := app.current_user_id();
      new.moderated_at := now();
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_featured  := false;
    new.attendees    := 0;
    -- Resolved through profiles rather than taken from the session directly:
    -- an invited business account (0046) is an authenticated user with no
    -- profile row, and created_by references profiles. For those the
    -- attribution is business_id, and this column stays null.
    new.created_by   := (select p.id from public.profiles p where p.id = app.current_user_id());
    new.moderated_by := null;
    new.moderated_at := null;
    new.moderation_note := null;
    -- A business is an outside party publishing into the club: the club looks
    -- first. A curator is the club.
    new.moderation_status := case
      when new.business_id is not null then 'pending'
      else 'approved'
    end;
  else
    new.is_featured  := old.is_featured;
    new.attendees    := old.attendees;
    new.business_id  := old.business_id;
    new.created_by   := old.created_by;
    new.moderated_by := old.moderated_by;
    new.moderated_at := old.moderated_at;
    new.moderation_note := old.moderation_note;
    new.moderation_status := old.moderation_status;

    -- An approved business event that changes what members would READ goes
    -- back in the queue. Without this, approval is a one-time formality: the
    -- content that got approved is not the content that stays published.
    if new.business_id is not null and old.moderation_status = 'approved' then
      content_changed :=
        new.title       is distinct from old.title
        or new.description is distinct from old.description
        or new.image    is distinct from old.image
        or new.gallery  is distinct from old.gallery
        or new.location is distinct from old.location
        or new.venue_name is distinct from old.venue_name
        or new.online_url is distinct from old.online_url
        or new.rsvp_url is distinct from old.rsvp_url
        or new.organiser is distinct from old.organiser
        or new.admission is distinct from old.admission
        or new.price_cents is distinct from old.price_cents;

      if content_changed then
        new.moderation_status := 'pending';
        new.moderated_by := null;
        new.moderated_at := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists events_guard_owner_fields on public.events;
create trigger events_guard_owner_fields
  before insert or update on public.events
  for each row execute function public.guard_event_owner_fields();

-- 6. RSVPs follow the same visibility ------------------------------------------
-- An event nobody can see is not an event anybody can RSVP to.
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
    )
  );

-- 7. The same for what other members can see about attendance -------------------
drop view if exists public.member_event_participation;

create view public.member_event_participation
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
  and e.moderation_status = 'approved';

grant select on public.member_event_participation to app_authenticated;

comment on view public.member_event_participation is
  'Which PUBLISHED, APPROVED club events a member RSVPd to, visible to signed-in members (0041, narrowed in 0045). Shared attendance is the point of a professional club; an event the club has not approved is not one of those.';
