-- ============================================================================
-- 0044 — Volunteers can add employers and roles, and mark roles featured
--
-- Until now only an admin could write companies or company_jobs. Volunteers do
-- the legwork of finding local employers, so they get the same two abilities,
-- with three limits that keep the blast radius small.
--
-- FIRST, AND THIS IS THE LOAD-BEARING PART: is_volunteer becomes a privilege,
-- so it has to be locked at the database level. Today it is set only by
-- sync_volunteer_flag() when an admin approves a volunteer application, and it
-- is absent from PROFILE_WRITABLE in the app - but guard_profile_privileges
-- did NOT lock it, so nothing at the database layer stopped a future code path
-- (or a direct write) from letting a member flip their own flag. The moment
-- that flag grants write access to the job board, that gap is a privilege
-- escalation. It is closed below, before the grant that would make it matter.
--
-- SECOND, a volunteer may not configure a FEED. companies.source_kind and
-- source_config tell the nightly sync which URL to fetch, so letting a
-- volunteer set them would let any approved volunteer point the server at a
-- URL of their choosing. Volunteers create link-only employers; wiring a
-- machine-readable feed stays with admins.
--
-- THIRD, a volunteer may edit or close only what they added themselves. An
-- admin can touch anything. So a volunteer can add a corner-shop employer and
-- three roles, and cannot rewrite the bank's listings.
-- ============================================================================

-- 1. Lock the volunteer flag ---------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.role                := old.role;
  new.verification_status := old.verification_status;
  new.pc_number           := old.pc_number;
  new.id                  := old.id;
  -- 0044: is_volunteer now grants the right to add employers and roles, so it
  -- is admin-controlled like every other privilege. sync_volunteer_flag() is a
  -- SECURITY DEFINER trigger and is unaffected by this.
  new.is_volunteer        := old.is_volunteer;

  -- One exception to the status lock: a member may retire their own account.
  -- Every other transition (including reactivating a suspended one, which is
  -- the one that matters) stays with admins.
  if not (
    old.account_status = 'active'
    and new.account_status = 'archived'
    and old.id = app.current_user_id()
  ) then
    new.account_status := old.account_status;
  end if;

  return new;
end;
$$;

-- 2. Who may curate the job board ---------------------------------------------
create or replace function public.can_curate_jobs()
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

revoke all on function public.can_curate_jobs() from public;
grant execute on function public.can_curate_jobs() to app_authenticated;

comment on function public.can_curate_jobs() is
  'An admin, or an approved volunteer, on an active account (0044). is_volunteer is set only by admin approval and is locked by guard_profile_privileges.';

-- 3. Who added the row ---------------------------------------------------------
alter table public.companies
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.company_jobs
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists is_featured boolean not null default false;

-- Featured roles are read on every board load; the rest of the table is not.
create index if not exists idx_company_jobs_featured
  on public.company_jobs (company_id) where is_featured and is_open;

-- 4. Employers: volunteers may add, and edit their own -------------------------
drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert to app_authenticated
  with check (public.can_curate_jobs());

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update to app_authenticated
  using (public.is_admin() or (public.can_curate_jobs() and created_by = app.current_user_id()))
  with check (public.is_admin() or (public.can_curate_jobs() and created_by = app.current_user_id()));

/**
 * A non-admin curator may not configure the sync, and may not pass the row off
 * as somebody else's.
 *
 * source_kind / source_config decide which URL the nightly job runs against, so
 * they are pinned to a plain link for anyone who is not an admin. is_active is
 * pinned too: a volunteer should not be able to hide an employer the club is
 * already using.
 */
create or replace function public.guard_company_curation()
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
    new.created_by   := app.current_user_id();
    new.source_kind  := 'link';
    new.source_config := '{}'::jsonb;
    new.is_active    := true;
  else
    new.created_by    := old.created_by;
    new.source_kind   := old.source_kind;
    new.source_config := old.source_config;
    new.is_active     := old.is_active;
    new.slug          := old.slug;
  end if;

  return new;
end;
$$;

drop trigger if exists companies_guard_curation on public.companies;
create trigger companies_guard_curation
  before insert or update on public.companies
  for each row execute function public.guard_company_curation();

-- 5. Roles: volunteers may add, and edit their own -----------------------------
drop policy if exists company_jobs_write on public.company_jobs;

drop policy if exists company_jobs_insert on public.company_jobs;
create policy company_jobs_insert on public.company_jobs
  for insert to app_authenticated
  with check (public.can_curate_jobs());

drop policy if exists company_jobs_update on public.company_jobs;
create policy company_jobs_update on public.company_jobs
  for update to app_authenticated
  using (public.is_admin() or (public.can_curate_jobs() and created_by = app.current_user_id()))
  with check (public.is_admin() or (public.can_curate_jobs() and created_by = app.current_user_id()));

drop policy if exists company_jobs_delete on public.company_jobs;
create policy company_jobs_delete on public.company_jobs
  for delete to app_authenticated
  using (public.is_admin());

/**
 * A non-admin curator adds roles BY HAND and owns only those.
 *
 * source_kind is pinned to 'manual' so a volunteer's row can never be mistaken
 * for feed output - the nightly sync closes anything a feed stops listing, and
 * a hand-added role must not be swept up by that. external_id is left alone on
 * update so a row cannot be re-pointed at a feed's identity.
 */
create or replace function public.guard_job_curation()
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
    new.created_by  := app.current_user_id();
    new.source_kind := 'manual';
  else
    new.created_by  := old.created_by;
    new.source_kind := old.source_kind;
    new.external_id := old.external_id;
    new.company_id  := old.company_id;
  end if;

  return new;
end;
$$;

drop trigger if exists company_jobs_guard_curation on public.company_jobs;
create trigger company_jobs_guard_curation
  before insert or update on public.company_jobs
  for each row execute function public.guard_job_curation();

comment on column public.company_jobs.is_featured is
  'Promoted by an admin or volunteer (0044). Featured roles are ranked ahead of others for members they actually suit - featured is a boost, never a way to show someone a role from a field they have nothing to do with.';
