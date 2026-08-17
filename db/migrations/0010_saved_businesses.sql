-- ============================================================================
-- 0010 — Saved businesses.
--
-- The member business directory has a bookmark control on every card that
-- wrote to React state only: nothing read it, nothing persisted it, so the
-- bookmark vanished on navigation. There was no "saved" concept anywhere in
-- the schema, which is why the button could not work.
--
-- One row per member per business. RLS keeps it strictly personal: a member
-- reads and writes only their own saves, and admins get no read at all
-- because what someone bookmarks is not moderation material.
-- ============================================================================

create table if not exists public.member_saved_businesses (
  member_id   uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (member_id, business_id)
);

create index if not exists member_saved_businesses_member_idx
  on public.member_saved_businesses (member_id, created_at desc);

alter table public.member_saved_businesses enable row level security;

grant select, insert, delete on public.member_saved_businesses to app_authenticated;

drop policy if exists member_saved_businesses_select on public.member_saved_businesses;
create policy member_saved_businesses_select on public.member_saved_businesses
  for select to app_authenticated
  using (member_id = app.current_user_id());

drop policy if exists member_saved_businesses_insert on public.member_saved_businesses;
create policy member_saved_businesses_insert on public.member_saved_businesses
  for insert to app_authenticated
  with check (member_id = app.current_user_id() and public.is_active_member());

drop policy if exists member_saved_businesses_delete on public.member_saved_businesses;
create policy member_saved_businesses_delete on public.member_saved_businesses
  for delete to app_authenticated
  using (member_id = app.current_user_id());
