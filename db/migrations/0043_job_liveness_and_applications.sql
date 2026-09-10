-- ============================================================================
-- 0043 — Closing dead roles, and remembering that you applied
--
-- TWO GAPS THIS FILLS.
--
-- 1. A role only closed when its FEED stopped listing it (see
--    src/server/jobs/sync.ts). That covers the ATS-backed employers and is the
--    authoritative signal for them, but it never fires for the two people-driven
--    kinds: a `manual` role an admin typed in, and any row whose employer feed
--    has since broken. Those stayed "open" forever, so a member could pick a
--    role, spend a weekly referral request on it, and land on a dead posting.
--    The columns below let a scheduled check confirm the posting still exists at
--    the employer's own URL and close it when it plainly does not.
--
--    Closing is a two-strike decision, hence check_failures rather than a
--    boolean: careers sites answer HEAD requests with 403s and 429s all the
--    time, and one bad answer must not retire a live role. Only an unambiguous
--    404/410, twice, closes anything.
--
-- 2. "Apply on your own" used to be a link out with no memory: a member who
--    applied to eleven roles had no way to tell which. job_applications records
--    only that fact, so the list can say "Applied" and stop wasting their time.
--    It is deliberately NOT an application tracker - the club never sees a
--    resume or a status, and there is nothing here an employer could read.
-- ============================================================================

-- 1. Liveness bookkeeping on the role -----------------------------------------
alter table public.company_jobs
  add column if not exists last_checked_at timestamptz,
  add column if not exists check_failures  integer not null default 0,
  add column if not exists closed_at       timestamptz,
  add column if not exists close_reason    text
    check (close_reason is null or close_reason in ('feed', 'dead_link', 'admin'));

-- Ordering the "what should I check next" query by a nullable column with a
-- filter on is_open is exactly what a partial index is for.
create index if not exists idx_company_jobs_liveness
  on public.company_jobs (last_checked_at nulls first)
  where is_open;

-- Members read open roles constantly; nothing reads the closed ones in bulk.
create index if not exists idx_company_jobs_open
  on public.company_jobs (company_id) where is_open;

/**
 * Stamp closed_at whenever a role stops being open, whoever closed it.
 *
 * A trigger rather than three call sites: the feed sync, the liveness check and
 * an admin's toggle all flip is_open, and "when did this close" is the kind of
 * fact that goes wrong the moment it depends on every writer remembering.
 */
create or replace function public.stamp_job_closed()
returns trigger
language plpgsql
as $$
begin
  if old.is_open and not new.is_open then
    new.closed_at := coalesce(new.closed_at, now());
  elsif not old.is_open and new.is_open then
    -- Reopened by a feed that started listing it again.
    new.closed_at := null;
    new.close_reason := null;
    new.check_failures := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists company_jobs_stamp_closed on public.company_jobs;
create trigger company_jobs_stamp_closed
  before update of is_open on public.company_jobs
  for each row execute function public.stamp_job_closed();

-- Backfill: everything already closed lost its date, and the feed is the only
-- thing that has ever closed a row up to now.
update public.company_jobs
   set closed_at = coalesce(closed_at, last_seen_at),
       close_reason = coalesce(close_reason, 'feed')
 where not is_open and closed_at is null;

-- 2. "I applied to this myself" ------------------------------------------------
create table if not exists public.job_applications (
  job_id     uuid not null references public.company_jobs(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, member_id)
);

create index if not exists idx_job_applications_member
  on public.job_applications (member_id, created_at desc);

alter table public.job_applications enable row level security;
grant select, insert, delete on public.job_applications to app_authenticated;

-- Your own rows and nobody else's. Not even an admin: which roles a member
-- applied for is not club business, and the club made no promise to keep it.
-- Aggregate interest is available from the row count without identities.
drop policy if exists job_applications_own on public.job_applications;
create policy job_applications_own on public.job_applications
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (public.is_active_member() and member_id = app.current_user_id());

comment on table public.job_applications is
  'A member marking that they applied to a role on their own (0043). Private to that member - no resume, no status, no admin read.';
