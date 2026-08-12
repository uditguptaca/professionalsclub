-- =============================================================================
-- 0001_core_schema.sql — Professionals Club core schema
--
-- Identity is owned by Neon Managed Better Auth, which keeps its tables in the
-- `neon_auth` schema of this same database. public.profiles is a 1:1 extension
-- of neon_auth."user" and is the ONLY source of truth for role.
--
-- Apply order: 0000 -> 0001 -> 0002 -> 0003 -> 0004.
-- Run 0000_neon_roles.sql first: it creates the `app` schema, the two
-- least-privilege roles and app.current_user_id(), all of which this file uses.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- HELPER FUNCTIONS (part 1)
--
-- set_updated_at() references no tables, so it can be declared up front.
-- is_admin() and is_active_member() read public.profiles and are therefore
-- declared immediately after that table: a LANGUAGE sql body is parsed and
-- resolved at CREATE time, so a forward reference fails outright.
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- PROFILES
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references neon_auth."user"(id) on delete cascade,

  -- Identity
  first_name              text not null default '',
  middle_name             text,
  last_name               text not null default '',
  email                   text not null,
  phone                   text,
  pc_number               text unique,
  date_of_birth           date,
  gender                  text,

  -- Location
  country                 text default 'Canada',
  province                text,
  city                    text,
  postal_code             text,
  current_status          text,

  -- Purpose / intent (signup wizard steps 3 and 6)
  purposes                text[] not null default '{}',
  joining_for             text check (joining_for in ('help', 'volunteer', 'both')),
  help_type               text,
  help_description        text,
  contribute_areas        text[] not null default '{}',
  availability            text,

  -- Professional (signup wizard step 4)
  employment_status       text,
  job_title               text,
  company                 text,
  industry                text,
  previous_job_title      text,
  previous_company        text,
  experience_range        text,
  education_level         text,
  field_of_study          text,
  professional_category   text,
  certifications          text,
  skills                  text,
  linkedin_url            text,
  professional_summary    text,

  -- Communication preferences (signup wizard step 5)
  preferred_contact_method text not null default 'Email',
  preferred_language       text not null default 'English',
  update_topics            text[] not null default '{}',

  -- Consent (signup wizard step 7) — retained as evidence of what was agreed
  consent_register            boolean not null default false,
  consent_admin_review        boolean not null default false,
  consent_no_direct_contact   boolean not null default false,
  consent_no_misuse           boolean not null default false,
  consent_updates             boolean not null default false,
  consent_terms               boolean not null default false,
  consented_at                timestamptz,

  -- Role flags used by the portal UI
  is_help_seeker  boolean not null default true,
  is_volunteer    boolean not null default false,

  -- Authorization + lifecycle. Only an admin may change these (enforced by
  -- the guard trigger below AND by the RLS policies in 0003).
  role                 text not null default 'member' check (role in ('member', 'admin')),
  verification_status  text not null default 'unverified'
                       check (verification_status in ('unverified', 'pending', 'verified')),
  account_status       text not null default 'active'
                       check (account_status in ('active', 'suspended', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx           on public.profiles (role);
create index if not exists profiles_account_status_idx on public.profiles (account_status);
create index if not exists profiles_email_idx          on public.profiles (lower(email));

-- =============================================================================
-- HELPER FUNCTIONS (part 2)
--
-- SECURITY DEFINER so RLS policies on profiles can call is_admin() without
-- recursing into the very policy being evaluated. search_path is pinned so a
-- caller cannot shadow `profiles` with a temp table and fake an admin answer.
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = app.current_user_id()
      and role = 'admin'
      and account_status = 'active'
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = app.current_user_id()
      and account_status = 'active'
  );
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Privilege-escalation guard.
--
-- RLS alone cannot express "you may update this row but not these three
-- columns", so the check lives here. A member updating their own profile
-- silently keeps the old privileged values instead of erroring, which means a
-- crafted request that includes role='admin' is neutralised rather than
-- rejected — the client cannot distinguish it from a normal save.
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

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Reads a JSON array out of the signup payload as text[], tolerating absence.
create or replace function public.jsonb_text_array(payload jsonb, key text)
returns text[]
language sql
immutable
as $$
  select coalesce(
    (select array_agg(value #>> '{}') from jsonb_array_elements(payload -> key)),
    '{}'::text[]
  );
$$;

-- Profile creation.
--
-- Supabase had a trigger on auth.users for this. Neon Auth's tables are managed
-- by Neon, so nothing is attached to them here — the server creates the profile
-- instead, in the signup action, and ensureProfile() in src/server/auth.ts
-- back-fills on first authenticated request for any account that arrives by
-- another route (OAuth, a user created in the Neon console).
--
-- SECURITY DEFINER because the caller is app_authenticated, which has no insert
-- policy on profiles. The privileged columns are deliberately absent from the
-- signature: role, account_status and verification_status cannot be set through
-- this path at all.
create or replace function public.create_profile(
  p_user_id uuid,
  p_email   text,
  p_data    jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    id, email,
    first_name, middle_name, last_name, phone, date_of_birth, gender,
    country, province, city, postal_code, current_status,
    purposes, joining_for, help_type, help_description, contribute_areas, availability,
    employment_status, job_title, company, industry,
    previous_job_title, previous_company, experience_range, education_level,
    field_of_study, professional_category, certifications, skills,
    linkedin_url, professional_summary,
    preferred_contact_method, preferred_language, update_topics,
    consent_register, consent_admin_review, consent_no_direct_contact,
    consent_no_misuse, consent_updates, consent_terms, consented_at,
    is_help_seeker, is_volunteer
  )
  values (
    p_user_id,
    p_email,
    coalesce(p_data ->> 'first_name', ''),
    nullif(p_data ->> 'middle_name', ''),
    coalesce(p_data ->> 'last_name', ''),
    nullif(p_data ->> 'phone', ''),
    (nullif(p_data ->> 'date_of_birth', ''))::date,
    nullif(p_data ->> 'gender', ''),
    coalesce(nullif(p_data ->> 'country', ''), 'Canada'),
    nullif(p_data ->> 'province', ''),
    nullif(p_data ->> 'city', ''),
    nullif(p_data ->> 'postal_code', ''),
    nullif(p_data ->> 'current_status', ''),
    public.jsonb_text_array(p_data, 'purposes'),
    nullif(p_data ->> 'joining_for', ''),
    nullif(p_data ->> 'help_type', ''),
    nullif(p_data ->> 'help_description', ''),
    public.jsonb_text_array(p_data, 'contribute_areas'),
    nullif(p_data ->> 'availability', ''),
    nullif(p_data ->> 'employment_status', ''),
    nullif(p_data ->> 'job_title', ''),
    nullif(p_data ->> 'company', ''),
    nullif(p_data ->> 'industry', ''),
    nullif(p_data ->> 'previous_job_title', ''),
    nullif(p_data ->> 'previous_company', ''),
    nullif(p_data ->> 'experience_range', ''),
    nullif(p_data ->> 'education_level', ''),
    nullif(p_data ->> 'field_of_study', ''),
    nullif(p_data ->> 'professional_category', ''),
    nullif(p_data ->> 'certifications', ''),
    nullif(p_data ->> 'skills', ''),
    nullif(p_data ->> 'linkedin_url', ''),
    nullif(p_data ->> 'professional_summary', ''),
    coalesce(nullif(p_data ->> 'preferred_contact_method', ''), 'Email'),
    coalesce(nullif(p_data ->> 'preferred_language', ''), 'English'),
    public.jsonb_text_array(p_data, 'update_topics'),
    coalesce((p_data ->> 'consent_register')::boolean, false),
    coalesce((p_data ->> 'consent_admin_review')::boolean, false),
    coalesce((p_data ->> 'consent_no_direct_contact')::boolean, false),
    coalesce((p_data ->> 'consent_no_misuse')::boolean, false),
    coalesce((p_data ->> 'consent_updates')::boolean, false),
    coalesce((p_data ->> 'consent_terms')::boolean, false),
    case when (p_data ->> 'consent_terms')::boolean then now() else null end,
    coalesce(p_data ->> 'joining_for', 'help') in ('help', 'both'),
    coalesce(p_data ->> 'joining_for', '') in ('volunteer', 'both')
  )
  on conflict (id) do nothing;
end;
$$;

-- =============================================================================
-- HELP REQUESTS
-- =============================================================================

create sequence if not exists public.help_request_ref_seq;

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique,

  member_id   uuid not null references public.profiles(id) on delete cascade,
  member_name text not null default '',

  category    text not null,
  subcategory text,
  title       text not null,
  description text not null default '',
  urgency     text not null default 'medium'
              check (urgency in ('low', 'medium', 'high', 'critical')),

  preferred_timeline   text,
  previously_requested boolean not null default false,
  documents_required   boolean not null default false,
  documents            text[] not null default '{}',
  consent_given        boolean not null default false,

  support_type            text not null default 'one_time'
                          check (support_type in ('one_time', 'ongoing_mentorship')),
  open_to_group_resources boolean not null default false,
  contact_by_admin_only   boolean not null default true,

  status text not null default 'submitted' check (status in (
    'submitted', 'under_review', 'need_more_info', 'waiting_for_member',
    'approved', 'assigned', 'volunteer_responded', 'admin_reviewing',
    'response_sent', 'in_progress', 'resolved', 'closed', 'rejected',
    'escalated', 'archived'
  )),

  assigned_admin_id       uuid references public.profiles(id) on delete set null,
  assigned_volunteer_id   uuid references public.profiles(id) on delete set null,
  assigned_volunteer_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at  timestamptz
);

create index if not exists help_requests_member_idx    on public.help_requests (member_id);
create index if not exists help_requests_status_idx    on public.help_requests (status);
create index if not exists help_requests_volunteer_idx on public.help_requests (assigned_volunteer_id);
create index if not exists help_requests_created_idx   on public.help_requests (created_at desc);

-- SECURITY DEFINER because it calls nextval(), and 0003 revokes sequence access
-- from the application roles. Granting usage on the sequence instead would let a
-- client burn reference numbers by calling nextval() directly; this way the
-- sequence stays unreachable and only the trigger can advance it.
create or replace function public.set_help_request_reference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.reference is null then
    new.reference := 'HR-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('public.help_request_ref_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists help_requests_set_reference on public.help_requests;
create trigger help_requests_set_reference
  before insert on public.help_requests
  for each row execute function public.set_help_request_reference();

drop trigger if exists help_requests_set_updated_at on public.help_requests;
create trigger help_requests_set_updated_at
  before update on public.help_requests
  for each row execute function public.set_updated_at();

-- Members may open a request and correct its content, but the lifecycle fields
-- are staff-controlled. Same silent-revert approach as the profile guard.
create or replace function public.guard_help_request_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.status                  := old.status;
  new.assigned_admin_id       := old.assigned_admin_id;
  new.assigned_volunteer_id   := old.assigned_volunteer_id;
  new.assigned_volunteer_name := old.assigned_volunteer_name;
  new.member_id               := old.member_id;
  new.reference               := old.reference;
  new.closed_at               := old.closed_at;
  return new;
end;
$$;

drop trigger if exists help_requests_guard_fields on public.help_requests;
create trigger help_requests_guard_fields
  before update on public.help_requests
  for each row execute function public.guard_help_request_fields();

-- Member-visible progress trail.
create table if not exists public.request_timeline (
  id uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.help_requests(id) on delete cascade,
  status      text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists request_timeline_request_idx on public.request_timeline (request_id, created_at);

-- Staff-only case notes.
--
-- These live in their own table rather than a jsonb column on help_requests
-- because RLS grants or denies whole rows. As a column, any member able to read
-- their own request would also read the internal notes attached to it.
create table if not exists public.request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.help_requests(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text not null default '',
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists request_notes_request_idx on public.request_notes (request_id, created_at);

-- Append a timeline row whenever the status actually moves.
create or replace function public.log_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.request_timeline (request_id, status, description)
    values (new.id, new.status, 'Request submitted by ' || coalesce(new.member_name, 'member'));
  elsif new.status is distinct from old.status then
    insert into public.request_timeline (request_id, status, description)
    values (new.id, new.status, 'Status changed to ' || replace(new.status, '_', ' '));

    if new.status in ('resolved', 'closed') and new.closed_at is null then
      update public.help_requests set closed_at = now() where id = new.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists help_requests_log_status on public.help_requests;
create trigger help_requests_log_status
  after insert or update on public.help_requests
  for each row execute function public.log_request_status_change();

-- =============================================================================
-- VOLUNTEER APPLICATIONS
-- =============================================================================

create table if not exists public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.profiles(id) on delete cascade,
  member_name text not null default '',

  email             text,
  phone             text,
  pc_number         text,
  city              text,
  province          text,
  linkedin_url      text,
  current_profession text,
  organization      text,
  years_experience  integer not null default 0 check (years_experience >= 0),

  expertise_areas     text[] not null default '{}',
  languages           text[] not null default '{}',
  availability        text,
  max_cases_per_month integer not null default 2 check (max_cases_per_month between 0 and 100),

  mentorship_interest          boolean not null default false,
  referral_support_interest    boolean not null default false,
  resume_review_interest       boolean not null default false,
  settlement_support_interest  boolean not null default false,
  tax_guidance_interest        boolean not null default false,
  immigration_guidance_interest boolean not null default false,

  motivation         text,
  experience_summary text,
  documents          text[] not null default '{}',

  agreed_to_rules           boolean not null default false,
  agreed_no_direct_contact  boolean not null default false,
  agreed_admin_mediated     boolean not null default false,
  consent_to_screening      boolean not null default false,

  status text not null default 'new_application' check (status in (
    'new_application', 'pending_verification', 'approved',
    'rejected', 'on_hold', 'inactive', 'suspended'
  )),
  reviewed_by_admin_id uuid references public.profiles(id) on delete set null,
  reviewed_at          timestamptz,
  admin_notes          text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists volunteer_apps_member_idx on public.volunteer_applications (member_id);
create index if not exists volunteer_apps_status_idx on public.volunteer_applications (status);

drop trigger if exists volunteer_apps_set_updated_at on public.volunteer_applications;
create trigger volunteer_apps_set_updated_at
  before update on public.volunteer_applications
  for each row execute function public.set_updated_at();

-- admin_notes is staff commentary about the applicant and must not leak back to
-- them, so applicants get no UPDATE policy at all in 0003 and this trigger
-- exists only to stop a stale client from moving its own status.
create or replace function public.guard_volunteer_application_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.status               := old.status;
  new.admin_notes          := old.admin_notes;
  new.reviewed_by_admin_id := old.reviewed_by_admin_id;
  new.reviewed_at          := old.reviewed_at;
  new.member_id            := old.member_id;
  return new;
end;
$$;

drop trigger if exists volunteer_apps_guard_fields on public.volunteer_applications;
create trigger volunteer_apps_guard_fields
  before update on public.volunteer_applications
  for each row execute function public.guard_volunteer_application_fields();

-- Keep the profile's volunteer flag in step with an approved application.
create or replace function public.sync_volunteer_flag()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
     set is_volunteer = (new.status = 'approved')
   where id = new.member_id;
  return new;
end;
$$;

drop trigger if exists volunteer_apps_sync_flag on public.volunteer_applications;
create trigger volunteer_apps_sync_flag
  after update of status on public.volunteer_applications
  for each row execute function public.sync_volunteer_flag();

-- =============================================================================
-- CASE ASSIGNMENTS
-- =============================================================================

create table if not exists public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.help_requests(id) on delete cascade,
  request_title text not null default '',

  volunteer_member_id uuid not null references public.profiles(id) on delete cascade,
  volunteer_name      text not null default '',
  assigned_by_admin_id uuid references public.profiles(id) on delete set null,

  scope        text,
  instructions text,
  due_date     timestamptz,

  status text not null default 'pending' check (status in (
    'pending', 'accepted', 'in_progress', 'completed', 'reassigned', 'cancelled'
  )),
  volunteer_response text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists case_assignments_request_idx   on public.case_assignments (request_id);
create index if not exists case_assignments_volunteer_idx on public.case_assignments (volunteer_member_id);

drop trigger if exists case_assignments_set_updated_at on public.case_assignments;
create trigger case_assignments_set_updated_at
  before update on public.case_assignments
  for each row execute function public.set_updated_at();

-- A volunteer may accept work and report back on it. The brief itself — who is
-- assigned, the scope, the instructions, the deadline — belongs to the admin
-- who set it, so those columns are held to their previous values.
create or replace function public.guard_assignment_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.request_id           := old.request_id;
  new.request_title        := old.request_title;
  new.volunteer_member_id  := old.volunteer_member_id;
  new.volunteer_name       := old.volunteer_name;
  new.assigned_by_admin_id := old.assigned_by_admin_id;
  new.scope                := old.scope;
  new.instructions         := old.instructions;
  new.due_date             := old.due_date;

  -- Leaves status and volunteer_response writable, which is the whole point of
  -- the volunteer's access to this row.
  if new.status not in ('accepted', 'in_progress', 'completed') then
    new.status := old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists case_assignments_guard_fields on public.case_assignments;
create trigger case_assignments_guard_fields
  before update on public.case_assignments
  for each row execute function public.guard_assignment_fields();

-- =============================================================================
-- MESSAGES (admin-mediated)
-- =============================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  case_id    uuid references public.help_requests(id) on delete cascade,
  case_title text not null default '',

  sender_role    text not null check (sender_role in ('admin', 'member', 'volunteer')),
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  sender_name    text not null default '',

  -- The specific person this is addressed to. NULL means "whoever the
  -- visibility_scope covers", which is how broadcast admin notices work.
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  recipient_role    text not null check (recipient_role in ('admin', 'member', 'volunteer')),

  moderated_flag   boolean not null default false,
  visibility_scope text not null default 'all'
                   check (visibility_scope in ('member_only', 'volunteer_only', 'admin_only', 'all')),

  body        text not null,
  attachments text[] not null default '{}',
  read        boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists messages_case_idx      on public.messages (case_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_user_id);
create index if not exists messages_sender_idx    on public.messages (sender_user_id);

-- The platform's core promise is that members and volunteers never reach each
-- other directly. Enforce it in the database, not just in the UI.
create or replace function public.guard_message_routing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    -- A non-admin may only ever write to staff, as themselves.
    if new.sender_user_id is distinct from app.current_user_id() then
      raise exception 'sender_user_id must be the authenticated user';
    end if;
    if new.recipient_role <> 'admin' then
      raise exception 'members and volunteers may only send messages to admins';
    end if;
    new.visibility_scope := 'all';
    new.moderated_flag   := false;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_routing on public.messages;
create trigger messages_guard_routing
  before insert on public.messages
  for each row execute function public.guard_message_routing();

-- The UPDATE policy has to let recipients through so they can mark a message
-- read, but RLS grants whole rows, not columns. Without this a recipient could
-- rewrite the body of a message they were sent and change the record of what
-- was said.
create or replace function public.guard_message_immutability()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.body             := old.body;
  new.attachments      := old.attachments;
  new.sender_user_id   := old.sender_user_id;
  new.sender_role      := old.sender_role;
  new.sender_name      := old.sender_name;
  new.recipient_user_id := old.recipient_user_id;
  new.recipient_role   := old.recipient_role;
  new.case_id          := old.case_id;
  new.visibility_scope := old.visibility_scope;
  new.created_at       := old.created_at;
  return new;
end;
$$;

drop trigger if exists messages_guard_immutability on public.messages;
create trigger messages_guard_immutability
  before update on public.messages
  for each row execute function public.guard_message_immutability();

-- =============================================================================
-- BUSINESS DIRECTORY
-- =============================================================================

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo        text,
  cover_image text,
  category    text not null,
  subcategory text,

  description_short text,
  description_full  text,
  services          text[] not null default '{}',

  contact_person text,
  phone          text,
  email          text,
  website        text,
  social_links   jsonb not null default '[]'::jsonb,

  address     text,
  city        text,
  province    text,
  postal_code text,
  service_area text,

  years_in_business integer not null default 0 check (years_in_business >= 0),
  business_hours    text,
  pricing_summary   text,

  member_rate_text text,
  offer_badge      text,
  member_benefits  text[] not null default '{}',

  verification_status text not null default 'pending_review'
    check (verification_status in ('draft', 'pending_review', 'verified', 'rejected', 'inactive')),
  is_featured     boolean not null default false,
  has_member_rate boolean not null default false,

  created_by        uuid references public.profiles(id) on delete set null,
  approved_by_admin uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_status_idx   on public.businesses (verification_status);
create index if not exists businesses_category_idx on public.businesses (category);

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

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

  new.verification_status := old.verification_status;
  new.is_featured         := old.is_featured;
  new.approved_by_admin   := old.approved_by_admin;
  new.created_by          := old.created_by;
  return new;
end;
$$;

drop trigger if exists businesses_guard_fields on public.businesses;
create trigger businesses_guard_fields
  before update on public.businesses
  for each row execute function public.guard_business_fields();

create table if not exists public.business_contact_requests (
  id uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  business_name text not null default '',
  member_id     uuid not null references public.profiles(id) on delete cascade,
  member_name   text not null default '',

  help_type text not null default 'introduction'
    check (help_type in ('introduction', 'quote_support', 'booking_help', 'clarification', 'other')),
  preferred_contact text not null default 'portal'
    check (preferred_contact in ('email', 'phone', 'portal')),
  notes text,

  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'closed')),
  admin_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bcr_member_idx   on public.business_contact_requests (member_id);
create index if not exists bcr_business_idx on public.business_contact_requests (business_id);

drop trigger if exists bcr_set_updated_at on public.business_contact_requests;
create trigger bcr_set_updated_at
  before update on public.business_contact_requests
  for each row execute function public.set_updated_at();

-- =============================================================================
-- PUBLIC CONTENT (admin-managed, world-readable when published)
-- =============================================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  event_date  date,
  event_time  text,
  location    text,
  event_type  text not null default 'in_person'
              check (event_type in ('in_person', 'virtual', 'hybrid')),
  capacity    integer not null default 0 check (capacity >= 0),
  attendees   integer not null default 0 check (attendees >= 0),
  image       text,
  is_featured boolean not null default false,
  platform    text,
  rsvp_url    text,
  status      text not null default 'upcoming' check (status in ('upcoming', 'past')),
  is_published boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title        text not null,
  company      text not null,
  company_logo text,
  location     text,
  province     text,
  salary_min   numeric not null default 0 check (salary_min >= 0),
  salary_max   numeric not null default 0 check (salary_max >= 0),
  salary_period text not null default 'yearly'
                check (salary_period in ('yearly', 'monthly', 'hourly')),
  job_type     text not null default 'full_time'
               check (job_type in ('full_time', 'part_time', 'contract', 'freelance', 'internship')),
  category     text not null default 'Other',
  description  text not null default '',
  requirements text,
  responsibilities text,
  contact_email text,
  apply_url    text,
  tags         text[] not null default '{}',
  is_featured  boolean not null default false,
  is_active    boolean not null default true,
  posted_at    timestamptz not null default now(),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint jobs_salary_range check (salary_max = 0 or salary_max >= salary_min)
);

create index if not exists jobs_active_idx   on public.jobs (is_active, posted_at desc);
create index if not exists jobs_category_idx on public.jobs (category);

create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  title        text not null,
  author       text not null default '',
  type         text not null default 'PDF',
  size         text,
  color        text,
  image        text,
  download_url text,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  title           text not null,
  duration        text,
  recorded_date   text,
  platform        text,
  thumbnail_image text,
  video_url       text,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.content_templates (
  id uuid primary key default gen_random_uuid(),
  title      text not null,
  file_type  text not null default 'PDF',
  category   text not null default 'Career',
  image      text,
  access_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name         text not null,
  role         text not null default '',
  bio          text not null default '',
  image        text,
  linkedin_url text,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text not null default '',
  content      text not null default '',
  image        text,
  author       text not null default '',
  category     text not null default 'Community',
  published_at timestamptz not null default now(),
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  title    text not null,
  category text not null default 'Other',
  video_url text not null,
  duration text,
  views    text,
  recorded_date text,
  is_published  boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null default '',
  goal_amount   numeric not null default 0 check (goal_amount >= 0),
  raised_amount numeric not null default 0 check (raised_amount >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'events', 'jobs', 'ebooks', 'workshops', 'content_templates',
    'team_members', 'news_articles', 'donation_campaigns', 'youtube_videos'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

-- =============================================================================
-- AUDIT LOG
--
-- Clients never INSERT here (0003 grants no insert policy). Writes go through
-- log_audit(), which stamps the actor from the session rather than trusting a
-- caller-supplied actor id — otherwise any writer could forge another user's
-- trail, which is exactly what an audit log must not allow.
-- =============================================================================

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text not null default '',
  actor_role  text not null default 'member',
  action_type text not null,
  target_type text not null check (target_type in (
    'request', 'volunteer_app', 'assignment', 'member', 'message', 'business', 'content', 'system'
  )),
  target_id   text not null default '',
  description text not null default '',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx   on public.audit_log (actor_id);

create or replace function public.log_audit(
  p_action_type text,
  p_target_type text,
  p_target_id   text,
  p_description text,
  p_metadata    jsonb default '{}'::jsonb
)
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

-- =============================================================================
-- ADMIN DASHBOARD STATS
--
-- A function rather than a view: it must aggregate across every member's rows,
-- which RLS would otherwise (correctly) filter down to the caller's own. The
-- admin check is therefore made explicit on the first line.
-- =============================================================================

create or replace function public.helpdesk_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'helpdesk_stats is restricted to admins';
  end if;

  select jsonb_build_object(
    'totalMembers',          (select count(*) from public.profiles where role = 'member'),
    'totalRequests',         (select count(*) from public.help_requests),
    'openRequests',          (select count(*) from public.help_requests
                               where status not in ('resolved', 'closed', 'rejected', 'archived')),
    'closedRequests',        (select count(*) from public.help_requests
                               where status in ('resolved', 'closed')),
    'pendingVolunteerApps',  (select count(*) from public.volunteer_applications
                               where status in ('new_application', 'pending_verification')),
    'approvedVolunteers',    (select count(*) from public.volunteer_applications where status = 'approved'),
    'activeAssignments',     (select count(*) from public.case_assignments
                               where status in ('pending', 'accepted', 'in_progress')),
    'escalations',           (select count(*) from public.help_requests where status = 'escalated'),
    'avgResolutionDays',     coalesce((
                               select round(avg(extract(epoch from (closed_at - created_at)) / 86400)::numeric, 1)
                               from public.help_requests where closed_at is not null), 0),
    'categoryCounts',        coalesce((
                               select jsonb_object_agg(category, c)
                               from (select category, count(*) as c
                                     from public.help_requests group by category) s), '{}'::jsonb)
  ) into result;

  return result;
end;
$$;
