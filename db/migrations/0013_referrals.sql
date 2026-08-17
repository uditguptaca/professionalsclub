-- ============================================================================
-- 0013 — Company referrals: "we have someone inside who can help".
--
-- The club's role in this feature is introductions, nothing more. A member who
-- works somewhere opts in as an insider; a job seeker picks that company, picks
-- the open roles they want, and every willing insider is notified. Neither side
-- learns who the other is until an insider says yes.
--
-- Five tables and two views:
--   companies            canonical employer list (fixes the free-text
--                        profiles.company problem: "Shopify" / "Shopify Inc." /
--                        "Shopify Canada" were three different employers)
--   company_insiders     member <-> company opt-in. THE private table.
--   company_jobs         open roles, cached from the company's own feed
--   referral_requests    a seeker's ask
--   referral_recipients  one row per notified insider; carries the decision
--   email_outbox         queued mail (see the note on it below)
--
-- ---------------------------------------------------------------------------
-- WHERE THE ANONYMITY ACTUALLY LIVES
--
-- Not in the UI. company_insiders is readable only by the insider themself and
-- by admins — no other member can select it at all, so "which members work at
-- Shopify" is not a question the database will answer. The public gets one
-- aggregate (company_helper_counts) and never a name.
--
-- The mutual reveal is done by two security_barrier views. Views here execute
-- with the OWNER's rights (security_invoker is off), so the base table's RLS
-- does not apply inside them and the view's WHERE clause IS the access control
-- — the same mechanism as matrimony_visible_profiles, and the same warning
-- applies: adding a column to either view publishes it.
--
--   referral_inbox   what an insider sees. seeker_name and resume_url are
--                    CASE-gated on that insider's own row being 'accepted',
--                    so they are NULL — not hidden by CSS, NULL — until then.
--   referral_helpers what a seeker sees. Only accepted rows appear, so the
--                    seeker cannot enumerate who was asked.
--
-- Cross-user writes go through SECURITY DEFINER functions, because a member
-- holds no INSERT grant on another member's notification or recipient row.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- companies
-- ----------------------------------------------------------------------------

create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo        text,
  industry    text,
  size_range  text,
  city        text,
  province    text,
  country     text not null default 'Canada',
  website     text,
  careers_url text,
  description_short text,

  -- How this company's open roles get in. 'link' means we only deep-link to
  -- their careers page; 'manual' means an admin pastes roles. Everything else
  -- is a feed the company publishes for machines to read.
  source_kind text not null default 'link'
    check (source_kind in (
      'greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters',
      'recruitee', 'workday', 'jsonld', 'rss', 'jobbank', 'adzuna',
      'manual', 'link'
    )),
  -- Shape depends on source_kind: {"token":"shopify"} for the ATS kinds,
  -- {"url":"..."} for jsonld/rss, {"employer":"..."} for jobbank/adzuna.
  source_config   jsonb not null default '{}'::jsonb,
  jobs_synced_at  timestamptz,
  jobs_sync_error text,
  open_jobs_count integer not null default 0,

  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint companies_source_config_object
    check (jsonb_typeof(source_config) = 'object')
);

-- Case-insensitive uniqueness: the whole point of this table is that an
-- employer appears exactly once.
create unique index if not exists companies_name_lower_idx
  on public.companies (lower(name));
create index if not exists companies_active_idx
  on public.companies (is_active, name);

comment on table public.companies is
  'Canonical employer list. Replaces free-text profiles.company for referral purposes so members at the same employer actually group together.';

-- ----------------------------------------------------------------------------
-- company_insiders — the private one
-- ----------------------------------------------------------------------------

create table if not exists public.company_insiders (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  job_title  text,
  -- Working there and being willing to pass a name along are different things.
  can_refer     boolean not null default true,
  notify_email  boolean not null default true,
  verified_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, member_id)
);

create index if not exists company_insiders_company_idx
  on public.company_insiders (company_id) where can_refer;
create index if not exists company_insiders_member_idx
  on public.company_insiders (member_id);

comment on table public.company_insiders is
  'Members who work somewhere and will help. Readable ONLY by the member themself and admins: no other member may learn who works where. The public sees company_helper_counts and nothing else.';

-- ----------------------------------------------------------------------------
-- company_jobs — cached open roles
-- ----------------------------------------------------------------------------

create table if not exists public.company_jobs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  -- Stable id from the source, so a refresh updates rather than duplicates.
  external_id text not null,
  title       text not null,
  location    text,
  province    text,
  employment_type text,
  department  text,
  apply_url   text not null,
  description_snippet text,
  posted_at   timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  -- A role that stops appearing in the feed is closed, not deleted: a referral
  -- request may still point at it.
  is_open     boolean not null default true,
  source_kind text,
  unique (company_id, external_id)
);

create index if not exists company_jobs_open_idx
  on public.company_jobs (company_id, is_open, posted_at desc nulls last);

-- ----------------------------------------------------------------------------
-- referral_requests + the selected roles
-- ----------------------------------------------------------------------------

create table if not exists public.referral_requests (
  id         uuid primary key default gen_random_uuid(),
  seeker_id  uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  -- The anonymous descriptor an insider sees, e.g. "A QA Analyst (4-6 years)".
  -- Built server-side from the seeker's profile by create_referral_request, so
  -- it cannot be spoofed into carrying a name or a contact detail.
  headline   text not null,
  note       text,
  resume_url text,
  status     text not null default 'open'
             check (status in ('open', 'matched', 'closed', 'withdrawn')),
  notified_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists referral_requests_seeker_idx
  on public.referral_requests (seeker_id, created_at desc);
create index if not exists referral_requests_company_idx
  on public.referral_requests (company_id, status);

create table if not exists public.referral_request_jobs (
  request_id uuid not null references public.referral_requests(id) on delete cascade,
  job_id     uuid not null references public.company_jobs(id) on delete cascade,
  primary key (request_id, job_id)
);

-- ----------------------------------------------------------------------------
-- referral_recipients — one row per insider asked. The privacy gate.
--
-- Deliberately NOT readable by the seeker: if it were, the seeker could list
-- every insider at the company, which is exactly what this feature promises
-- not to do.
-- ----------------------------------------------------------------------------

create table if not exists public.referral_recipients (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.referral_requests(id) on delete cascade,
  insider_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending'
             check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (request_id, insider_id)
);

create index if not exists referral_recipients_insider_idx
  on public.referral_recipients (insider_id, status, created_at desc);

-- ----------------------------------------------------------------------------
-- email_outbox
--
-- Mail is queued, not sent inline, for one security reason and two practical
-- ones. The security reason: the seeker's database session must never be able
-- to read another member's email address, so the address is resolved later by
-- a privileged drain rather than handed to the request that triggered it. The
-- practical ones: a Resend outage does not lose the notification, and with no
-- RESEND_API_KEY set the queue itself is the dev log.
-- ----------------------------------------------------------------------------

create table if not exists public.email_outbox (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  -- Only set for mail to a non-member (nobody does yet); member mail resolves
  -- the address at send time from recipient_id.
  to_address   text,
  template     text not null,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
               check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts     integer not null default 0,
  last_error   text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint email_outbox_has_target
    check (recipient_id is not null or to_address is not null)
);

create index if not exists email_outbox_pending_idx
  on public.email_outbox (status, created_at) where status = 'pending';

-- ============================================================================
-- Row level security
-- ============================================================================

alter table public.companies             enable row level security;
alter table public.company_insiders      enable row level security;
alter table public.company_jobs          enable row level security;
alter table public.referral_requests     enable row level security;
alter table public.referral_request_jobs enable row level security;
alter table public.referral_recipients   enable row level security;
alter table public.email_outbox          enable row level security;

-- companies: a public directory. Anyone may read an active one; only admins
-- write. The sync columns are admin-written too (see refresh_company_jobs).
grant select on public.companies to app_anonymous, app_authenticated;
grant insert, update, delete on public.companies to app_authenticated;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to app_anonymous, app_authenticated
  using (is_active or public.is_admin());

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert to app_authenticated with check (public.is_admin());

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update to app_authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists companies_delete on public.companies;
create policy companies_delete on public.companies
  for delete to app_authenticated using (public.is_admin());

-- company_insiders: your own row, or an admin's. No cross-member read, ever.
grant select, insert, update, delete on public.company_insiders to app_authenticated;

drop policy if exists company_insiders_select on public.company_insiders;
create policy company_insiders_select on public.company_insiders
  for select to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin());

drop policy if exists company_insiders_insert on public.company_insiders;
create policy company_insiders_insert on public.company_insiders
  for insert to app_authenticated
  with check (member_id = app.current_user_id() and public.is_active_member());

drop policy if exists company_insiders_update on public.company_insiders;
create policy company_insiders_update on public.company_insiders
  for update to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin())
  with check (member_id = app.current_user_id() or public.is_admin());

drop policy if exists company_insiders_delete on public.company_insiders;
create policy company_insiders_delete on public.company_insiders
  for delete to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin());

-- company_jobs: these are public postings. Read by all, written by the sync
-- (admin) only.
grant select on public.company_jobs to app_anonymous, app_authenticated;
grant insert, update, delete on public.company_jobs to app_authenticated;

drop policy if exists company_jobs_select on public.company_jobs;
create policy company_jobs_select on public.company_jobs
  for select to app_anonymous, app_authenticated using (true);

drop policy if exists company_jobs_write on public.company_jobs;
create policy company_jobs_write on public.company_jobs
  for all to app_authenticated using (public.is_admin()) with check (public.is_admin());

-- referral_requests: the seeker's own, or an admin's. Insiders read the
-- referral_inbox view instead, which is column-gated.
grant select, insert, update on public.referral_requests to app_authenticated;

drop policy if exists referral_requests_select on public.referral_requests;
create policy referral_requests_select on public.referral_requests
  for select to app_authenticated
  using (seeker_id = app.current_user_id() or public.is_admin());

-- Insert goes through create_referral_request (it has to fan out recipient
-- rows), so there is no INSERT policy for clients at all.

drop policy if exists referral_requests_update on public.referral_requests;
create policy referral_requests_update on public.referral_requests
  for update to app_authenticated
  using (seeker_id = app.current_user_id() or public.is_admin())
  with check (seeker_id = app.current_user_id() or public.is_admin());

-- referral_request_jobs: visible with the request it belongs to.
grant select on public.referral_request_jobs to app_authenticated;

drop policy if exists referral_request_jobs_select on public.referral_request_jobs;
create policy referral_request_jobs_select on public.referral_request_jobs
  for select to app_authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.referral_requests r
       where r.id = request_id and r.seeker_id = app.current_user_id()
    ) or exists (
      select 1 from public.referral_recipients p
       where p.request_id = referral_request_jobs.request_id
         and p.insider_id = app.current_user_id()
    )
  );

-- referral_recipients: the insider's own row, or an admin's. NOT the seeker's —
-- that would expose who was asked.
grant select on public.referral_recipients to app_authenticated;

drop policy if exists referral_recipients_select on public.referral_recipients;
create policy referral_recipients_select on public.referral_recipients
  for select to app_authenticated
  using (insider_id = app.current_user_id() or public.is_admin());

-- Responding goes through respond_to_referral, so no client UPDATE policy.

-- email_outbox: admins may audit it. Nobody else reads it, and no client
-- writes it — rows are queued by SECURITY DEFINER functions and drained by the
-- server with owner rights.
grant select on public.email_outbox to app_authenticated;

drop policy if exists email_outbox_select on public.email_outbox;
create policy email_outbox_select on public.email_outbox
  for select to app_authenticated using (public.is_admin());

-- ============================================================================
-- Views
-- ============================================================================

-- ----------------------------------------------------------------------------
-- company_helper_counts — what the website and the app may say out loud.
--
-- A count and nothing else. No names, no titles, no ids of insiders. This is
-- the only thing an anonymous visitor learns about who works where.
-- ----------------------------------------------------------------------------
-- Dropped first rather than `create or replace`: replacing a view cannot change
-- a column's type, and helper_count is deliberately ::int (see below).
drop view if exists public.company_helper_counts;

create view public.company_helper_counts
with (security_barrier)
as
select
  c.id,
  c.name,
  c.slug,
  c.logo,
  c.industry,
  c.size_range,
  c.city,
  c.province,
  c.website,
  c.careers_url,
  c.description_short,
  c.source_kind,
  c.open_jobs_count,
  c.jobs_synced_at,
  -- ::int deliberately. count(*) is bigint, which the driver hands back as a
  -- STRING, and every `count === 1` comparison in the UI then quietly fails
  -- ("1 members here can help").
  (select count(*) from public.company_insiders i
    where i.company_id = c.id and i.can_refer)::int as helper_count
from public.companies c
where c.is_active;

grant select on public.company_helper_counts to app_anonymous, app_authenticated;

comment on view public.company_helper_counts is
  'Public company directory with an aggregate helper count. Adding a column here publishes it to the internet; never add anything that identifies an insider.';

-- ----------------------------------------------------------------------------
-- referral_inbox — what an insider sees.
--
-- The CASE expressions are the anonymity: until this insider's own recipient
-- row says 'accepted', seeker_name and resume_url are NULL. Not filtered in
-- the client, not hidden with CSS — absent from the result set.
-- ----------------------------------------------------------------------------
create or replace view public.referral_inbox
with (security_barrier)
as
select
  p.id            as recipient_id,
  p.status        as my_status,
  p.responded_at,
  r.id            as request_id,
  r.headline,
  r.note,
  r.status        as request_status,
  r.created_at,
  c.id            as company_id,
  c.name          as company_name,
  c.logo          as company_logo,
  -- Revealed on acceptance only.
  case when p.status = 'accepted'
       then nullif(btrim(concat_ws(' ', s.first_name, s.last_name)), '')
       end as seeker_name,
  case when p.status = 'accepted' then s.email end        as seeker_email,
  case when p.status = 'accepted' then s.phone end        as seeker_phone,
  case when p.status = 'accepted' then s.linkedin_url end as seeker_linkedin,
  case when p.status = 'accepted' then r.resume_url end   as resume_url,
  -- The roles are never secret: they are public postings.
  coalesce((
    select json_agg(json_build_object(
      'id', j.id, 'title', j.title, 'location', j.location,
      'applyUrl', j.apply_url, 'isOpen', j.is_open
    ) order by j.title)
      from public.referral_request_jobs rj
      join public.company_jobs j on j.id = rj.job_id
     where rj.request_id = r.id
  ), '[]'::json) as jobs
from public.referral_recipients p
join public.referral_requests r on r.id = p.request_id
join public.companies c on c.id = r.company_id
join public.profiles s on s.id = r.seeker_id
where p.insider_id = app.current_user_id();

grant select on public.referral_inbox to app_authenticated;

comment on view public.referral_inbox is
  'An insider''s referral inbox. seeker_name/email/phone/linkedin and resume_url are CASE-gated on this insider having accepted, which is what makes the request anonymous until then.';

-- ----------------------------------------------------------------------------
-- referral_helpers — what a seeker sees.
--
-- Only accepted rows. A seeker can never enumerate who was asked, only who
-- said yes, which is the other half of the mutual reveal.
-- ----------------------------------------------------------------------------
create or replace view public.referral_helpers
with (security_barrier)
as
select
  p.id          as recipient_id,
  p.request_id,
  p.responded_at,
  h.id          as helper_id,
  nullif(btrim(concat_ws(' ', h.first_name, h.last_name)), '') as helper_name,
  coalesce(i.job_title, h.job_title) as helper_title,
  h.email        as helper_email,
  h.linkedin_url as helper_linkedin
from public.referral_recipients p
join public.referral_requests r on r.id = p.request_id
join public.profiles h on h.id = p.insider_id
left join public.company_insiders i
       on i.member_id = p.insider_id and i.company_id = r.company_id
where p.status = 'accepted'
  and r.seeker_id = app.current_user_id();

grant select on public.referral_helpers to app_authenticated;

comment on view public.referral_helpers is
  'The insiders who agreed to help on the caller''s own requests. Pending and declined recipients never appear, so the seeker cannot list who was asked.';

-- ============================================================================
-- Cross-user writes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- create_referral_request
--
-- One call does the whole fan-out: the request, the selected roles, a recipient
-- row per willing insider, an in-app notification each, and a queued email for
-- those who want one. SECURITY DEFINER because a member holds no INSERT grant
-- on another member's recipient or notification row.
--
-- The headline is composed here from the caller's own profile rather than
-- accepted as a parameter, so a seeker cannot smuggle their name or number
-- into the "anonymous" descriptor.
-- ----------------------------------------------------------------------------
create or replace function public.create_referral_request(
  p_company_id uuid,
  p_job_ids    uuid[],
  p_note       text default null,
  p_resume_url text default null
)
returns table (request_id uuid, notified integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := app.current_user_id();
  v_request   uuid;
  v_headline  text;
  v_title     text;
  v_exp       text;
  v_note      text := nullif(btrim(coalesce(p_note, '')), '');
  v_resume    text := nullif(btrim(coalesce(p_resume_url, '')), '');
  v_notified  integer := 0;
  v_company   text;
  v_job_count integer;
  v_rec       record;
begin
  if v_uid is null then
    raise exception 'Not signed in.';
  end if;
  if not public.is_active_member() then
    raise exception 'Your account is not active.';
  end if;

  select name into v_company from public.companies
   where id = p_company_id and is_active;
  if v_company is null then
    raise exception 'That company is not listed.';
  end if;

  -- An open request per company at a time keeps the fan-out honest: nobody
  -- should be able to notify the same insiders repeatedly.
  if exists (
    select 1 from public.referral_requests
     where seeker_id = v_uid and company_id = p_company_id and status = 'open'
  ) then
    raise exception 'You already have an open request for this company.';
  end if;

  if v_resume is not null and v_resume !~ '^(https://[a-z0-9]+\.public\.blob\.vercel-storage\.com/|/uploads/)' then
    raise exception 'That resume link is not one of ours.';
  end if;

  -- Anonymous descriptor: role and experience band, no name, no location.
  select nullif(btrim(coalesce(job_title, previous_job_title, '')), ''),
         nullif(btrim(coalesce(experience_range, '')), '')
    into v_title, v_exp
    from public.profiles where id = v_uid;

  v_headline := case
    when v_title is not null and v_exp is not null then 'A ' || v_title || ' (' || v_exp || ')'
    when v_title is not null then 'A ' || v_title
    when v_exp is not null then 'A member (' || v_exp || ' experience)'
    else 'A club member'
  end;

  insert into public.referral_requests (seeker_id, company_id, headline, note, resume_url)
  values (v_uid, p_company_id, v_headline, v_note, v_resume)
  returning id into v_request;

  -- Only roles that belong to this company, and only ones still open.
  insert into public.referral_request_jobs (request_id, job_id)
  select v_request, j.id
    from public.company_jobs j
   where j.id = any(coalesce(p_job_ids, '{}'::uuid[]))
     and j.company_id = p_company_id
     and j.is_open
  on conflict do nothing;

  -- Aliased deliberately: this function has an OUT parameter called
  -- request_id, so an unqualified column of the same name is ambiguous.
  select count(*) into v_job_count
    from public.referral_request_jobs rj where rj.request_id = v_request;
  if v_job_count = 0 then
    raise exception 'Choose at least one open role.';
  end if;

  -- Fan out to every willing insider except the seeker.
  for v_rec in
    select i.member_id, i.notify_email
      from public.company_insiders i
      join public.profiles pr on pr.id = i.member_id
     where i.company_id = p_company_id
       and i.can_refer
       and i.member_id <> v_uid
       and pr.account_status = 'active'
  loop
    insert into public.referral_recipients (request_id, insider_id)
    values (v_request, v_rec.member_id)
    on conflict do nothing;

    perform public.notify_user(
      v_rec.member_id,
      'referral_request',
      'Someone needs a referral at ' || v_company,
      v_headline || ' asked about ' || v_job_count ||
        case when v_job_count = 1 then ' role.' else ' roles.' end,
      '/portal/member/referrals',
      jsonb_build_object('requestId', v_request, 'companyId', p_company_id)
    );

    if v_rec.notify_email then
      insert into public.email_outbox (recipient_id, template, payload)
      values (
        v_rec.member_id,
        'referral_request',
        jsonb_build_object(
          'requestId', v_request,
          'company', v_company,
          'headline', v_headline,
          'jobCount', v_job_count
        )
      );
    end if;

    v_notified := v_notified + 1;
  end loop;

  update public.referral_requests
     set notified_count = v_notified, updated_at = now()
   where id = v_request;

  return query select v_request, v_notified;
end;
$$;

revoke all on function public.create_referral_request(uuid, uuid[], text, text) from public;
grant execute on function public.create_referral_request(uuid, uuid[], text, text) to app_authenticated;

-- ----------------------------------------------------------------------------
-- respond_to_referral — the moment the reveal happens.
-- ----------------------------------------------------------------------------
create or replace function public.respond_to_referral(
  p_request_id uuid,
  p_accept     boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := app.current_user_id();
  v_seeker  uuid;
  v_company text;
  v_helper  text;
begin
  if v_uid is null then
    raise exception 'Not signed in.';
  end if;

  -- The recipient row is the authorisation: no row, no say.
  update public.referral_recipients
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now()
   where request_id = p_request_id
     and insider_id = v_uid
     and status = 'pending';

  if not found then
    raise exception 'That request is not waiting on you.';
  end if;

  select r.seeker_id, c.name into v_seeker, v_company
    from public.referral_requests r
    join public.companies c on c.id = r.company_id
   where r.id = p_request_id;

  if p_accept then
    -- First yes moves the request along; later ones just add a helper.
    update public.referral_requests
       set status = 'matched', updated_at = now()
     where id = p_request_id and status = 'open';

    select nullif(btrim(concat_ws(' ', first_name, last_name)), '')
      into v_helper from public.profiles where id = v_uid;

    perform public.notify_user(
      v_seeker,
      'referral_accepted',
      coalesce(v_helper, 'A member') || ' can help at ' || v_company,
      'They work there and agreed to help with your request. Their details are on your request now.',
      '/portal/member/referrals',
      jsonb_build_object('requestId', p_request_id)
    );

    insert into public.email_outbox (recipient_id, template, payload)
    values (
      v_seeker,
      'referral_accepted',
      jsonb_build_object(
        'requestId', p_request_id,
        'company', v_company,
        'helper', coalesce(v_helper, 'A member')
      )
    );
  end if;
end;
$$;

revoke all on function public.respond_to_referral(uuid, boolean) from public;
grant execute on function public.respond_to_referral(uuid, boolean) to app_authenticated;

-- ----------------------------------------------------------------------------
-- withdraw_own_referral_request — a seeker changing their mind.
-- ----------------------------------------------------------------------------
create or replace function public.withdraw_own_referral_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.referral_requests
     set status = 'withdrawn', updated_at = now()
   where id = p_request_id
     and seeker_id = app.current_user_id()
     and status in ('open', 'matched');

  if not found then
    raise exception 'That request cannot be withdrawn.';
  end if;

  -- Pending asks disappear from the insiders' inboxes; answered ones stay, so
  -- a helper who already said yes is not silently un-thanked.
  delete from public.referral_recipients
   where request_id = p_request_id and status = 'pending';
end;
$$;

revoke all on function public.withdraw_own_referral_request(uuid) from public;
grant execute on function public.withdraw_own_referral_request(uuid) to app_authenticated;

-- ----------------------------------------------------------------------------
-- Keep companies.open_jobs_count honest so the directory can show it without
-- a subquery per row.
-- ----------------------------------------------------------------------------
create or replace function public.sync_company_open_jobs_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid := coalesce(new.company_id, old.company_id);
begin
  update public.companies c
     set open_jobs_count = (
       select count(*) from public.company_jobs j
        where j.company_id = v_company and j.is_open
     )
   where c.id = v_company;
  return null;
end;
$$;

drop trigger if exists company_jobs_count_trg on public.company_jobs;
create trigger company_jobs_count_trg
  after insert or update of is_open or delete on public.company_jobs
  for each row execute function public.sync_company_open_jobs_count();

-- ----------------------------------------------------------------------------
-- Seed: the twelve employers /companies used to hardcode.
--
-- Every one starts as source_kind 'link' with a careers URL rather than a
-- guessed ATS token — a wrong token is a silent sync failure. An admin sets
-- the real feed with the Detect button, which probes the known patterns and
-- reports what answers.
-- ----------------------------------------------------------------------------
insert into public.companies (name, slug, logo, industry, size_range, city, province, website, careers_url, description_short)
values
  ('Shopify', 'shopify', 'S', 'Technology', '10,000+', 'Ottawa', 'Ontario', 'https://www.shopify.com', 'https://www.shopify.com/careers', 'Commerce platform helping merchants sell online'),
  ('Amazon Canada', 'amazon-canada', 'A', 'Technology', '50,000+', 'Vancouver', 'British Columbia', 'https://www.amazon.ca', 'https://www.amazon.jobs/en/locations/canada', 'Global technology and e-commerce company'),
  ('Royal Bank of Canada', 'rbc', 'RBC', 'Banking', '50,000+', 'Toronto', 'Ontario', 'https://www.rbc.com', 'https://jobs.rbc.com', 'Canada''s largest bank by market capitalization'),
  ('TD Bank', 'td-bank', 'TD', 'Banking', '50,000+', 'Toronto', 'Ontario', 'https://www.td.com', 'https://jobs.td.com', 'One of Canada''s Big Five banks'),
  ('Google Canada', 'google-canada', 'G', 'Technology', '10,000+', 'Waterloo', 'Ontario', 'https://www.google.ca', 'https://www.google.com/about/careers/applications/locations/canada', 'Technology company with offices across Canada'),
  ('Microsoft Canada', 'microsoft-canada', 'MS', 'Technology', '10,000+', 'Vancouver', 'British Columbia', 'https://www.microsoft.com/en-ca', 'https://jobs.careers.microsoft.com', 'Cloud and software company'),
  ('Deloitte Canada', 'deloitte-canada', 'D', 'Consulting', '10,000+', 'Toronto', 'Ontario', 'https://www2.deloitte.com/ca', 'https://careers.deloitte.ca', 'Professional services and consulting firm'),
  ('CIBC', 'cibc', 'CI', 'Banking', '40,000+', 'Toronto', 'Ontario', 'https://www.cibc.com', 'https://cibc.wd3.myworkdayjobs.com/search', 'Full-service financial institution'),
  ('Telus', 'telus', 'T', 'Telecommunications', '30,000+', 'Vancouver', 'British Columbia', 'https://www.telus.com', 'https://careers.telus.com', 'Canadian telecommunications company'),
  ('Scotiabank', 'scotiabank', 'SB', 'Banking', '50,000+', 'Toronto', 'Ontario', 'https://www.scotiabank.com', 'https://jobs.scotiabank.com', 'International banking and financial services'),
  ('Wealthsimple', 'wealthsimple', 'W', 'Fintech', '1,000+', 'Toronto', 'Ontario', 'https://www.wealthsimple.com', 'https://www.wealthsimple.com/en-ca/careers', 'Online investment management service'),
  ('Manulife', 'manulife', 'M', 'Insurance', '30,000+', 'Toronto', 'Ontario', 'https://www.manulife.ca', 'https://manulife.wd3.myworkdayjobs.com/External', 'International financial services company')
on conflict (slug) do nothing;
