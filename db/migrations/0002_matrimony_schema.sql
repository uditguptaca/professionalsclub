-- =============================================================================
-- 0002_matrimony_schema.sql — Matrimony module
--
-- Changes from the original 001_matrimony_tables.sql that this replaces:
--   * user_id / reviewed_by / admin_user_id were `text`, holding whatever the
--     client put there. They are now uuid FKs into profiles (and through it
--     neon_auth."user"), so
--     ownership is a database fact rather than a client claim. Every RLS policy
--     in 0003 depends on this.
--   * The permissive `for all using (true)` policies are gone; see 0003.
--   * Sensitive free-text (admin_notes, rejection_reason) stays on the base
--     table, which nobody but the owner and admins may read. Browsing goes
--     through the curated view in 0003 instead.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. PROFILES
-- =============================================================================

create table if not exists public.matrimony_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected', 'changes_requested', 'suspended')),
  created_by text not null default 'self',

  -- Personal
  full_name       text not null default '',
  display_pref    text not null default 'first_name',
  gender          text not null default 'male',
  dob             date,
  height_cm       integer check (height_cm is null or height_cm between 100 and 250),
  weight_kg       integer check (weight_kg is null or weight_kg between 25 and 300),
  body_type       text,
  marital_status  text not null default 'never_married',
  have_children   text not null default 'no',
  physical_status text,

  -- Religion and community
  religion      text default '',
  denomination  text,
  community     text,
  sub_caste     text,
  gothra        text,
  mother_tongue text default '',
  languages     text[] not null default '{}',

  -- Astrology
  time_of_birth  text,
  place_of_birth text,
  rashi          text,
  nakshatra      text,
  manglik        text,

  -- Location
  country          text default 'Canada',
  province         text default '',
  city             text default '',
  residency_status text default 'pr',
  open_to_relocate text default 'depends',

  -- Education
  qualification  text default '',
  field_of_study text,
  institution    text,

  -- Career
  occupation      text default '',
  employer        text,
  industry        text default '',
  employment_type text default 'full_time',
  work_location   text,
  income_range    text default 'Prefer not to say',

  -- Family
  family_type       text,
  family_status     text,
  family_values     text,
  father_occupation text,
  mother_occupation text,
  siblings_count    integer check (siblings_count is null or siblings_count >= 0),
  siblings_married  integer check (siblings_married is null or siblings_married >= 0),
  native_place      text,
  family_about      text,

  -- Lifestyle
  diet     text default 'veg',
  smoking  text default 'no',
  drinking text default 'no',
  hobbies  text[] not null default '{}',
  about_me text default '',

  -- Meta
  completeness_pct       integer not null default 0 check (completeness_pct between 0 and 100),
  is_hidden              boolean not null default false,
  is_verified_id         boolean not null default false,
  is_verified_photo      boolean not null default false,
  is_verified_profession boolean not null default false,
  photo_visibility       text not null default 'on_request'
    check (photo_visibility in ('public', 'members', 'on_request', 'private')),
  last_active_at   timestamptz not null default now(),

  -- Moderation. Owner-invisible in practice: the app never selects these for
  -- the owner, and only admins have a reason to read them.
  rejection_reason text,
  admin_notes      text,
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_matrimony_profiles_status        on public.matrimony_profiles (status);
create index if not exists idx_matrimony_profiles_gender        on public.matrimony_profiles (gender);
create index if not exists idx_matrimony_profiles_city          on public.matrimony_profiles (city);
create index if not exists idx_matrimony_profiles_province      on public.matrimony_profiles (province);
create index if not exists idx_matrimony_profiles_religion      on public.matrimony_profiles (religion);
create index if not exists idx_matrimony_profiles_community     on public.matrimony_profiles (community);
create index if not exists idx_matrimony_profiles_mother_tongue on public.matrimony_profiles (mother_tongue);
create index if not exists idx_matrimony_profiles_residency     on public.matrimony_profiles (residency_status);
create index if not exists idx_matrimony_profiles_user          on public.matrimony_profiles (user_id);
create index if not exists idx_matrimony_profiles_browse        on public.matrimony_profiles (status, is_hidden);

drop trigger if exists matrimony_profiles_set_updated_at on public.matrimony_profiles;
create trigger matrimony_profiles_set_updated_at
  before update on public.matrimony_profiles
  for each row execute function public.set_updated_at();

-- Returns the caller's matrimony profile id. Used throughout the 0003 policies
-- so they can be written in terms of "my profile" without every policy having
-- to re-join matrimony_profiles (which would recurse through its own policy).
create or replace function public.my_matrimony_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.matrimony_profiles where user_id = app.current_user_id();
$$;

-- Moderation state and verification badges are admin-only, and a member must
-- not be able to self-approve their own listing.
create or replace function public.guard_matrimony_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.user_id                := old.user_id;
  new.rejection_reason       := old.rejection_reason;
  new.admin_notes            := old.admin_notes;
  new.reviewed_by            := old.reviewed_by;
  new.reviewed_at            := old.reviewed_at;
  new.is_verified_id         := old.is_verified_id;
  new.is_verified_photo      := old.is_verified_photo;
  new.is_verified_profession := old.is_verified_profession;

  -- A member may move their own listing between draft and pending, or
  -- retire it, but never into an approved/suspended state.
  if new.status not in ('draft', 'pending') and new.status is distinct from old.status then
    new.status := old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists matrimony_profiles_guard_fields on public.matrimony_profiles;
create trigger matrimony_profiles_guard_fields
  before update on public.matrimony_profiles
  for each row execute function public.guard_matrimony_profile_fields();

-- =============================================================================
-- 2. PARTNER PREFERENCES
-- =============================================================================

create table if not exists public.matrimony_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.matrimony_profiles(id) on delete cascade,
  age_min integer not null default 21 check (age_min >= 18),
  age_max integer not null default 40 check (age_max >= 18),
  height_min_cm integer,
  height_max_cm integer,
  marital_status   text[] not null default '{}',
  religion         text[] not null default '{}',
  denomination     text[] not null default '{}',
  community        text[] not null default '{}',
  mother_tongue    text[] not null default '{}',
  country          text,
  province         text,
  city             text,
  residency_status text[] not null default '{}',
  education        text[] not null default '{}',
  profession       text[] not null default '{}',
  income_range     text,
  diet             text[] not null default '{}',
  smoking          text,
  drinking         text,
  manglik_pref     text,
  other_notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matrimony_prefs_age_range check (age_max >= age_min)
);

drop trigger if exists matrimony_preferences_set_updated_at on public.matrimony_preferences;
create trigger matrimony_preferences_set_updated_at
  before update on public.matrimony_preferences
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3. PRIVATE CONTACTS
--
-- Phone numbers and email addresses, split into their own table precisely so
-- that RLS can withhold them. Under the old `using (true)` policy this table
-- was the single worst exposure in the application: any signed-in account could
-- read every member's phone number in one request.
-- =============================================================================

create table if not exists public.matrimony_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.matrimony_profiles(id) on delete cascade,
  phone            text,
  alt_phone        text,
  email            text,
  preferred_method text not null default 'email',
  best_time        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists matrimony_contacts_set_updated_at on public.matrimony_contacts;
create trigger matrimony_contacts_set_updated_at
  before update on public.matrimony_contacts
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. MEDIA
-- =============================================================================

create table if not exists public.matrimony_media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  type text not null default 'photo' check (type in ('photo', 'video', 'horoscope', 'id_doc')),
  url  text not null,
  is_primary  boolean not null default false,
  visibility  text not null default 'on_request'
    check (visibility in ('public', 'members', 'on_request', 'private')),
  is_approved boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_matrimony_media_profile on public.matrimony_media (profile_id);

-- =============================================================================
-- 5. INTERESTS
-- =============================================================================

create table if not exists public.matrimony_interests (
  id uuid primary key default gen_random_uuid(),
  sender_profile_id   uuid not null references public.matrimony_profiles(id) on delete cascade,
  receiver_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (sender_profile_id, receiver_profile_id),
  constraint matrimony_interests_not_self check (sender_profile_id <> receiver_profile_id)
);

create index if not exists idx_matrimony_interests_sender   on public.matrimony_interests (sender_profile_id);
create index if not exists idx_matrimony_interests_receiver on public.matrimony_interests (receiver_profile_id);

-- Only the receiver may accept or decline. Without this a sender could update
-- their own outgoing interest to 'accepted' and unlock the recipient's contact
-- details and a message thread without consent.
create or replace function public.guard_interest_response()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
     and old.receiver_profile_id is distinct from public.my_matrimony_profile_id() then
    raise exception 'only the recipient may respond to an interest';
  end if;

  new.sender_profile_id   := old.sender_profile_id;
  new.receiver_profile_id := old.receiver_profile_id;

  if new.status is distinct from old.status and new.responded_at is null then
    new.responded_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists matrimony_interests_guard_response on public.matrimony_interests;
create trigger matrimony_interests_guard_response
  before update on public.matrimony_interests
  for each row execute function public.guard_interest_response();

-- True when the two profiles have an interest that was actually accepted.
-- This is the gate for seeing someone's contact details and for messaging them.
create or replace function public.has_accepted_interest(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.matrimony_interests i
    where i.status = 'accepted'
      and (
        (i.sender_profile_id = a and i.receiver_profile_id = b) or
        (i.sender_profile_id = b and i.receiver_profile_id = a)
      )
  );
$$;


-- =============================================================================
-- 6-11. SHORTLISTS, NOTES, BLOCKS, REPORTS, PHOTO REQUESTS, SAVED SEARCHES
-- =============================================================================

create table if not exists public.matrimony_shortlists (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id  uuid not null references public.matrimony_profiles(id) on delete cascade,
  target_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_profile_id, target_profile_id)
);

create table if not exists public.matrimony_profile_notes (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  target_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.matrimony_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_profile_id, blocked_profile_id)
);

create index if not exists idx_matrimony_blocks_blocker on public.matrimony_blocks (blocker_profile_id);
create index if not exists idx_matrimony_blocks_blocked on public.matrimony_blocks (blocked_profile_id);

-- True if either party has blocked the other. Used by the browse view and the
-- messaging policies so a block is enforced in both directions.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.matrimony_blocks
    where (blocker_profile_id = a and blocked_profile_id = b)
       or (blocker_profile_id = b and blocked_profile_id = a)
  );
$$;

create table if not exists public.matrimony_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  reported_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  target_type text not null default 'profile' check (target_type in ('profile', 'message')),
  reason  text not null,
  details text,
  status  text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.matrimony_photo_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  target_profile_id    uuid not null references public.matrimony_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'granted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_profile_id, target_profile_id)
);

create table if not exists public.matrimony_saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  name    text not null,
  filters jsonb not null default '{}'::jsonb,
  notify  boolean not null default false,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 12-13. CONVERSATIONS AND MESSAGES
-- =============================================================================

create table if not exists public.matrimony_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_a_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  profile_b_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (profile_a_id, profile_b_id),
  constraint matrimony_conversations_not_self check (profile_a_id <> profile_b_id)
);

create index if not exists idx_matrimony_convo_a on public.matrimony_conversations (profile_a_id);
create index if not exists idx_matrimony_convo_b on public.matrimony_conversations (profile_b_id);

create table if not exists public.matrimony_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.matrimony_conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  body    text not null check (length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_matrimony_messages_convo on public.matrimony_messages (conversation_id, created_at);

create or replace function public.is_conversation_participant(convo uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.matrimony_conversations c
    where c.id = convo
      and public.my_matrimony_profile_id() in (c.profile_a_id, c.profile_b_id)
  );
$$;

-- Bump the conversation's ordering timestamp on each new message.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.matrimony_conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists matrimony_messages_touch_convo on public.matrimony_messages;
create trigger matrimony_messages_touch_convo
  after insert on public.matrimony_messages
  for each row execute function public.touch_conversation();

-- =============================================================================
-- 14-17. VIEWS, VERIFICATIONS, SUCCESS STORIES, MODULE AUDIT
-- =============================================================================

create table if not exists public.matrimony_profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  viewed_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_matrimony_views_viewed on public.matrimony_profile_views (viewed_profile_id);

create table if not exists public.matrimony_verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  type    text not null check (type in ('id', 'profession', 'photo')),
  doc_url text,
  status  text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.matrimony_success_stories (
  id uuid primary key default gen_random_uuid(),
  profile_id         uuid references public.matrimony_profiles(id) on delete set null,
  partner_profile_id uuid references public.matrimony_profiles(id) on delete set null,
  couple_names text not null default '',
  story        text not null,
  photo_url    text,
  status    text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.matrimony_admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  admin_name  text,
  action      text not null,
  target_id   text not null,
  target_type text not null default 'profile',
  reason      text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_matrimony_audit_target on public.matrimony_admin_audit (target_id);

-- =============================================================================
-- 18. IN-APP NOTIFICATIONS
-- =============================================================================

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type    text not null,
  title   text not null,
  body    text not null default '',
  link    text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.in_app_notifications (user_id, is_read);

-- Notifications are written by server-side logic on behalf of another user, so
-- clients get no INSERT policy and must go through this function instead.
create or replace function public.notify_user(
  p_user_id uuid,
  p_type    text,
  p_title   text,
  p_body    text default '',
  p_link    text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if app.current_user_id() is null then
    raise exception 'notify_user requires an authenticated caller';
  end if;

  insert into public.in_app_notifications (user_id, type, title, body, link, metadata)
  values (p_user_id, p_type, p_title, coalesce(p_body, ''), p_link, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- Notify the recipient when an interest arrives or is answered.
create or replace function public.notify_on_interest()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_user uuid;
  v_sender_name text;
begin
  if tg_op = 'INSERT' then
    select p.user_id into v_target_user
      from public.matrimony_profiles p where p.id = new.receiver_profile_id;
    select p.full_name into v_sender_name
      from public.matrimony_profiles p where p.id = new.sender_profile_id;

    insert into public.in_app_notifications (user_id, type, title, body, link)
    values (v_target_user, 'interest_received', 'New interest received',
            coalesce(v_sender_name, 'Someone') || ' expressed interest in your profile.',
            '/portal/member/matrimony/interests');

  elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    select p.user_id into v_target_user
      from public.matrimony_profiles p where p.id = new.sender_profile_id;

    insert into public.in_app_notifications (user_id, type, title, body, link)
    values (v_target_user, 'interest_' || new.status, 'Interest ' || new.status,
            'Your interest was ' || new.status || '.',
            '/portal/member/matrimony/interests');
  end if;

  return new;
end;
$$;

drop trigger if exists matrimony_interests_notify on public.matrimony_interests;
create trigger matrimony_interests_notify
  after insert or update on public.matrimony_interests
  for each row execute function public.notify_on_interest();

-- Notify the other participant when a message arrives.
create or replace function public.notify_on_matrimony_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_other_profile uuid;
  v_target_user   uuid;
  v_sender_name   text;
begin
  select case when c.profile_a_id = new.sender_profile_id then c.profile_b_id else c.profile_a_id end
    into v_other_profile
    from public.matrimony_conversations c
   where c.id = new.conversation_id;

  select p.user_id into v_target_user
    from public.matrimony_profiles p where p.id = v_other_profile;
  select p.full_name into v_sender_name
    from public.matrimony_profiles p where p.id = new.sender_profile_id;

  insert into public.in_app_notifications (user_id, type, title, body, link)
  values (v_target_user, 'message_received', 'New message',
          'You have a new message from ' || coalesce(nullif(v_sender_name, ''), 'a member') || '.',
          '/portal/member/matrimony/messages');

  return new;
end;
$$;

drop trigger if exists matrimony_messages_notify on public.matrimony_messages;
create trigger matrimony_messages_notify
  after insert on public.matrimony_messages
  for each row execute function public.notify_on_matrimony_message();

-- Notify the owner when an admin moves their listing out of review.
create or replace function public.notify_on_matrimony_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('approved', 'rejected', 'changes_requested', 'suspended') then
    insert into public.in_app_notifications (user_id, type, title, body, link)
    values (
      new.user_id,
      'profile_' || new.status,
      case new.status
        when 'approved' then 'Your matrimony profile is live'
        when 'rejected' then 'Your matrimony profile was not approved'
        when 'changes_requested' then 'Changes requested on your profile'
        else 'Your matrimony profile was suspended'
      end,
      coalesce(new.rejection_reason, 'Open your profile for details.'),
      '/portal/member/matrimony/profile'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists matrimony_profiles_notify_review on public.matrimony_profiles;
create trigger matrimony_profiles_notify_review
  after update of status on public.matrimony_profiles
  for each row execute function public.notify_on_matrimony_review();
