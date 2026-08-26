-- ============================================================================
-- 0039 — Event RSVPs, and businesses that run themselves
--
-- Three things members asked for:
--
--   1. RSVP on events, in-app, instead of a bare attendee number.
--   2. Businesses registering per city and managing their OWN page and offers.
--   3. Businesses posting and managing their OWN events.
--
-- The ownership machinery already existed and had never been used: businesses
-- has created_by with owner RLS since 0001, and every row so far was created
-- by admins or the anonymous submission flow with created_by null. This
-- migration builds on that instead of inventing a second ownership concept:
-- a business owner IS a member whose profile id is businesses.created_by.
-- Verification stays admin-only (the existing Biz Requests queue approves).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Event RSVPs
--
-- One row per member per event. The display number is events.attendees (the
-- admin-maintained offline count, kept for externally-run meetups) PLUS the
-- live RSVP count from here.
-- ---------------------------------------------------------------------------
create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

create index if not exists idx_event_rsvps_member on public.event_rsvps (member_id);

alter table public.event_rsvps enable row level security;
grant select, insert, delete on public.event_rsvps to app_authenticated;

-- A member manages only their own RSVP, and only for events that are actually
-- published. No UPDATE grant: an RSVP is created or removed, never edited.
drop policy if exists event_rsvps_own on public.event_rsvps;
create policy event_rsvps_own on public.event_rsvps
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (
    public.is_active_member()
    and member_id = app.current_user_id()
    and exists (
      select 1 from public.events e
       where e.id = event_id and e.is_published and e.status = 'upcoming'
    )
  );

-- Counts are public; WHO is going is not. A member's own RLS shows only their
-- own row, so the aggregate comes from an owner-rights view that publishes
-- nothing but the number.
create or replace view public.event_attendance
with (security_barrier)
as
select event_id, count(*)::int as going
  from public.event_rsvps
 group by event_id;

grant select on public.event_attendance to app_authenticated, app_anonymous;

-- ---------------------------------------------------------------------------
-- 2. Businesses posting their own events
--
-- events grows a business_id. The existing admin policies stay untouched;
-- these are additive owner policies: the owner of a VERIFIED business may
-- create and manage events attached to that business. The ownership subquery
-- runs under the caller's own RLS, and businesses_select_own makes their row
-- visible to them, so no definer helper is needed (the 0020/0025/0026 trap
-- only bites when a policy must see SOMEONE ELSE'S rows).
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

create index if not exists idx_events_business on public.events (business_id)
  where business_id is not null;

drop policy if exists events_owner_insert on public.events;
create policy events_owner_insert on public.events
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and business_id is not null
    and exists (
      select 1 from public.businesses b
       where b.id = business_id
         and b.created_by = app.current_user_id()
         and b.verification_status = 'verified'
    )
  );

drop policy if exists events_owner_update on public.events;
create policy events_owner_update on public.events
  for update to app_authenticated
  using (
    business_id is not null
    and exists (
      select 1 from public.businesses b
       where b.id = business_id and b.created_by = app.current_user_id()
    )
  )
  with check (
    public.is_active_member()
    and business_id is not null
    and exists (
      select 1 from public.businesses b
       where b.id = business_id
         and b.created_by = app.current_user_id()
         and b.verification_status = 'verified'
    )
  );

drop policy if exists events_owner_delete on public.events;
create policy events_owner_delete on public.events
  for delete to app_authenticated
  using (
    business_id is not null
    and exists (
      select 1 from public.businesses b
       where b.id = business_id and b.created_by = app.current_user_id()
    )
  );

-- What an owner may NOT decide about their event, enforced below the app
-- layer. Featuring is editorial (admin's call), the attendee base number is
-- the admin's offline counter, and an event cannot be walked to a different
-- business after creation.
create or replace function public.guard_event_owner_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_featured := false;
    new.attendees   := 0;
  else
    new.is_featured := old.is_featured;
    new.attendees   := old.attendees;
    new.business_id := old.business_id;
  end if;
  return new;
end;
$$;

drop trigger if exists events_guard_owner_fields on public.events;
create trigger events_guard_owner_fields
  before insert or update on public.events
  for each row execute function public.guard_event_owner_fields();

-- ---------------------------------------------------------------------------
-- 3. Business offers
--
-- The dashboard's "member offers" rail currently reads two text fields off the
-- business row. Real offers are rows: a title, the deal, an optional expiry
-- and image, toggleable without deleting.
-- ---------------------------------------------------------------------------
create table if not exists public.business_offers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  valid_until date,
  image       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_business_offers_business on public.business_offers (business_id);

drop trigger if exists business_offers_set_updated_at on public.business_offers;
create trigger business_offers_set_updated_at
  before update on public.business_offers
  for each row execute function public.set_updated_at();

alter table public.business_offers enable row level security;
grant select, insert, update, delete on public.business_offers to app_authenticated;
grant select on public.business_offers to app_anonymous;

-- The owner manages their offers; everyone else sees active offers of
-- verified businesses. Both subqueries lean on businesses' own RLS: the owner
-- check resolves through businesses_select_own, the public check through
-- businesses_select_public.
drop policy if exists business_offers_owner on public.business_offers;
create policy business_offers_owner on public.business_offers
  for all to app_authenticated
  using (
    exists (
      select 1 from public.businesses b
       where b.id = business_id and b.created_by = app.current_user_id()
    )
  )
  with check (
    public.is_active_member()
    and exists (
      select 1 from public.businesses b
       where b.id = business_id and b.created_by = app.current_user_id()
    )
  );

drop policy if exists business_offers_public on public.business_offers;
create policy business_offers_public on public.business_offers
  for select to app_authenticated, app_anonymous
  using (
    is_active
    and exists (
      select 1 from public.businesses b
       where b.id = business_id and b.verification_status = 'verified'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Close the self-verification gap on registration
--
-- guard_business_fields pins verification_status / is_featured /
-- approved_by_admin / created_by on UPDATE, but the trigger never covered
-- INSERT: a member could have registered a business already marked
-- 'verified'. Now an insert by a non-admin always starts pending review, and
-- created_by always names the caller (a member cannot register a business
-- under someone else's account).
-- ---------------------------------------------------------------------------
create or replace function public.guard_business_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.verification_status := 'pending_review';
    new.is_featured         := false;
    new.approved_by_admin   := null;
    if new.created_by is not null then
      new.created_by := app.current_user_id();
    end if;
  else
    new.verification_status := old.verification_status;
    new.is_featured         := old.is_featured;
    new.approved_by_admin   := old.approved_by_admin;
    new.created_by          := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_guard_fields on public.businesses;
create trigger businesses_guard_fields
  before insert or update on public.businesses
  for each row execute function public.guard_business_fields();
