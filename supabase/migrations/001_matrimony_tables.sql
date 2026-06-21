-- ========== MATRIMONY MODULE MIGRATION ==========
-- Run this in your Supabase SQL editor

-- Extension
create extension if not exists "uuid-ossp";

-- ========== 1. Matrimony Profiles ==========
create table if not exists matrimony_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null unique,
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected','changes_requested','suspended')),
  created_by text not null default 'self',

  -- Personal
  full_name text not null default '',
  display_pref text not null default 'first_name',
  gender text not null default 'male',
  dob date,
  height_cm integer,
  weight_kg integer,
  body_type text,
  marital_status text not null default 'never_married',
  have_children text not null default 'no',
  physical_status text,

  -- Religion & Community
  religion text default '',
  denomination text,
  community text,
  sub_caste text,
  gothra text,
  mother_tongue text default '',
  languages text[] default '{}',

  -- Astrology (optional)
  time_of_birth text,
  place_of_birth text,
  rashi text,
  nakshatra text,
  manglik text,

  -- Location
  country text default 'Canada',
  province text default '',
  city text default '',
  residency_status text default 'pr',
  open_to_relocate text default 'depends',

  -- Education
  qualification text default '',
  field_of_study text,
  institution text,

  -- Career
  occupation text default '',
  employer text,
  industry text default '',
  employment_type text default 'full_time',
  work_location text,
  income_range text default 'Prefer not to say',

  -- Family
  family_type text,
  family_status text,
  family_values text,
  father_occupation text,
  mother_occupation text,
  siblings_count integer,
  siblings_married integer,
  native_place text,
  family_about text,

  -- Lifestyle
  diet text default 'veg',
  smoking text default 'no',
  drinking text default 'no',
  hobbies text[] default '{}',
  about_me text default '',

  -- Meta
  completeness_pct integer default 0,
  is_hidden boolean default false,
  is_verified_id boolean default false,
  is_verified_photo boolean default false,
  is_verified_profession boolean default false,
  photo_visibility text default 'on_request',
  last_active_at timestamptz default now(),
  rejection_reason text,
  admin_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_matrimony_profiles_status on matrimony_profiles(status);
create index idx_matrimony_profiles_gender on matrimony_profiles(gender);
create index idx_matrimony_profiles_city on matrimony_profiles(city);
create index idx_matrimony_profiles_province on matrimony_profiles(province);
create index idx_matrimony_profiles_religion on matrimony_profiles(religion);
create index idx_matrimony_profiles_community on matrimony_profiles(community);
create index idx_matrimony_profiles_mother_tongue on matrimony_profiles(mother_tongue);
create index idx_matrimony_profiles_residency on matrimony_profiles(residency_status);
create index idx_matrimony_profiles_user on matrimony_profiles(user_id);

-- ========== 2. Partner Preferences ==========
create table if not exists matrimony_preferences (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references matrimony_profiles(id) on delete cascade unique,
  age_min integer default 21,
  age_max integer default 40,
  height_min_cm integer,
  height_max_cm integer,
  marital_status text[] default '{}',
  religion text[] default '{}',
  denomination text[] default '{}',
  community text[] default '{}',
  mother_tongue text[] default '{}',
  country text,
  province text,
  city text,
  residency_status text[] default '{}',
  education text[] default '{}',
  profession text[] default '{}',
  income_range text,
  diet text[] default '{}',
  smoking text,
  drinking text,
  manglik_pref text,
  other_notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ========== 3. Private Contacts ==========
create table if not exists matrimony_contacts (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references matrimony_profiles(id) on delete cascade unique,
  phone text,
  alt_phone text,
  email text,
  preferred_method text default 'email',
  best_time text
);

-- ========== 4. Media ==========
create table if not exists matrimony_media (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  type text not null default 'photo' check (type in ('photo','video','horoscope','id_doc')),
  url text not null,
  is_primary boolean default false,
  visibility text default 'on_request',
  is_approved boolean default true,
  created_at timestamptz default now() not null
);

create index idx_matrimony_media_profile on matrimony_media(profile_id);

-- ========== 5. Interests ==========
create table if not exists matrimony_interests (
  id uuid primary key default uuid_generate_v4(),
  sender_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  receiver_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now() not null,
  responded_at timestamptz,
  unique(sender_profile_id, receiver_profile_id)
);

create index idx_matrimony_interests_sender on matrimony_interests(sender_profile_id);
create index idx_matrimony_interests_receiver on matrimony_interests(receiver_profile_id);

-- ========== 6. Shortlists ==========
create table if not exists matrimony_shortlists (
  id uuid primary key default uuid_generate_v4(),
  owner_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  target_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(owner_profile_id, target_profile_id)
);

-- ========== 7. Profile Notes ==========
create table if not exists matrimony_profile_notes (
  id uuid primary key default uuid_generate_v4(),
  author_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  target_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz default now() not null
);

-- ========== 8. Blocks ==========
create table if not exists matrimony_blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  blocked_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(blocker_profile_id, blocked_profile_id)
);

-- ========== 9. Reports ==========
create table if not exists matrimony_reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  reported_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  target_type text not null default 'profile' check (target_type in ('profile','message')),
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  admin_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now() not null
);

-- ========== 10. Photo Requests ==========
create table if not exists matrimony_photo_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  target_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','granted','declined')),
  created_at timestamptz default now() not null,
  responded_at timestamptz,
  unique(requester_profile_id, target_profile_id)
);

-- ========== 11. Saved Searches ==========
create table if not exists matrimony_saved_searches (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  notify boolean default false,
  created_at timestamptz default now() not null
);

-- ========== 12. Conversations ==========
create table if not exists matrimony_conversations (
  id uuid primary key default uuid_generate_v4(),
  profile_a_id uuid not null references matrimony_profiles(id) on delete cascade,
  profile_b_id uuid not null references matrimony_profiles(id) on delete cascade,
  last_message_at timestamptz default now(),
  created_at timestamptz default now() not null,
  unique(profile_a_id, profile_b_id)
);

-- ========== 13. Messages ==========
create table if not exists matrimony_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references matrimony_conversations(id) on delete cascade,
  sender_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_matrimony_messages_convo on matrimony_messages(conversation_id);

-- ========== 14. Profile Views ==========
create table if not exists matrimony_profile_views (
  id uuid primary key default uuid_generate_v4(),
  viewer_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  viewed_profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  created_at timestamptz default now() not null
);

create index idx_matrimony_views_viewed on matrimony_profile_views(viewed_profile_id);

-- ========== 15. Verifications ==========
create table if not exists matrimony_verifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references matrimony_profiles(id) on delete cascade,
  type text not null check (type in ('id','profession','photo')),
  doc_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now() not null
);

-- ========== 16. Success Stories ==========
create table if not exists matrimony_success_stories (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references matrimony_profiles(id) on delete set null,
  partner_profile_id uuid references matrimony_profiles(id) on delete set null,
  couple_names text not null default '',
  story text not null,
  photo_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_public boolean default false,
  created_at timestamptz default now() not null
);

-- ========== 17. Admin Audit Log ==========
create table if not exists matrimony_admin_audit (
  id uuid primary key default uuid_generate_v4(),
  admin_user_id text not null,
  admin_name text,
  action text not null,
  target_id text not null,
  target_type text not null default 'profile',
  reason text,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index idx_matrimony_audit_target on matrimony_admin_audit(target_id);

-- ========== 18. In-App Notifications (shared/reusable) ==========
create table if not exists in_app_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  type text not null,
  title text not null,
  body text not null,
  link text,
  is_read boolean default false,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index idx_notifications_user on in_app_notifications(user_id);
create index idx_notifications_read on in_app_notifications(is_read);

-- ========== RLS POLICIES ==========
alter table matrimony_profiles enable row level security;
alter table matrimony_preferences enable row level security;
alter table matrimony_contacts enable row level security;
alter table matrimony_media enable row level security;
alter table matrimony_interests enable row level security;
alter table matrimony_shortlists enable row level security;
alter table matrimony_profile_notes enable row level security;
alter table matrimony_blocks enable row level security;
alter table matrimony_reports enable row level security;
alter table matrimony_photo_requests enable row level security;
alter table matrimony_saved_searches enable row level security;
alter table matrimony_conversations enable row level security;
alter table matrimony_messages enable row level security;
alter table matrimony_profile_views enable row level security;
alter table matrimony_verifications enable row level security;
alter table matrimony_success_stories enable row level security;
alter table matrimony_admin_audit enable row level security;
alter table in_app_notifications enable row level security;

-- Development policies (allow all for authenticated users)
-- In production, restrict these to proper RLS policies
create policy "matrimony_profiles_all" on matrimony_profiles for all using (true);
create policy "matrimony_preferences_all" on matrimony_preferences for all using (true);
create policy "matrimony_contacts_all" on matrimony_contacts for all using (true);
create policy "matrimony_media_all" on matrimony_media for all using (true);
create policy "matrimony_interests_all" on matrimony_interests for all using (true);
create policy "matrimony_shortlists_all" on matrimony_shortlists for all using (true);
create policy "matrimony_profile_notes_all" on matrimony_profile_notes for all using (true);
create policy "matrimony_blocks_all" on matrimony_blocks for all using (true);
create policy "matrimony_reports_all" on matrimony_reports for all using (true);
create policy "matrimony_photo_requests_all" on matrimony_photo_requests for all using (true);
create policy "matrimony_saved_searches_all" on matrimony_saved_searches for all using (true);
create policy "matrimony_conversations_all" on matrimony_conversations for all using (true);
create policy "matrimony_messages_all" on matrimony_messages for all using (true);
create policy "matrimony_profile_views_all" on matrimony_profile_views for all using (true);
create policy "matrimony_verifications_all" on matrimony_verifications for all using (true);
create policy "matrimony_success_stories_all" on matrimony_success_stories for all using (true);
create policy "matrimony_admin_audit_all" on matrimony_admin_audit for all using (true);
create policy "notifications_all" on in_app_notifications for all using (true);
