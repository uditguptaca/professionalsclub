
-- ========== EXTENSIONS ==========
create extension if not exists "uuid-ossp";

-- ========== TABLES ==========

-- 1. Members
create table if not exists members (
  id text primary key, -- Using text to match 'm1', 'm2' etc from mock data
  first_name text not null,
  last_name text not null,
  email text unique not null,
  phone text,
  pc_number text,
  city text,
  province text,
  preferred_language text default 'English',
  preferred_contact_method text default 'portal',
  role_flags jsonb default '{"isHelpSeeker": true, "isVolunteer": false}'::jsonb,
  verification_status text default 'unverified',
  account_status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Help Requests
create table if not exists help_requests (
  id text primary key,
  member_id text references members(id),
  member_name text,
  category text not null,
  subcategory text,
  title text not null,
  description text,
  urgency text default 'medium',
  preferred_timeline text,
  previously_requested boolean default false,
  documents_required boolean default false,
  documents text[] default '{}',
  consent_given boolean default true,
  support_type text default 'one_time',
  open_to_group_resources boolean default true,
  contact_by_admin_only boolean default true,
  status text default 'submitted',
  assigned_admin_id text,
  assigned_volunteer_id text,
  assigned_volunteer_name text,
  internal_notes jsonb default '[]'::jsonb,
  timeline jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  closed_at timestamp with time zone
);

-- 3. Volunteer Applications
create table if not exists volunteer_applications (
  id text primary key,
  member_id text references members(id),
  member_name text,
  email text,
  phone text,
  pc_number text,
  city text,
  province text,
  linkedin_url text,
  current_profession text,
  organization text,
  years_experience integer,
  expertise_areas text[] default '{}',
  languages text[] default '{}',
  availability text,
  max_cases_per_month integer default 2,
  mentorship_interest boolean default false,
  referral_support_interest boolean default false,
  resume_review_interest boolean default false,
  settlement_support_interest boolean default false,
  tax_guidance_interest boolean default false,
  immigration_guidance_interest boolean default false,
  motivation text,
  experience_summary text,
  documents text[] default '{}',
  agreed_to_rules boolean default true,
  agreed_no_direct_contact boolean default true,
  agreed_admin_mediated boolean default true,
  consent_to_screening boolean default true,
  status text default 'new_application',
  reviewed_by_admin_id text,
  reviewed_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Case Assignments
create table if not exists case_assignments (
  id text primary key,
  request_id text references help_requests(id),
  request_title text,
  volunteer_member_id text references members(id),
  volunteer_name text,
  assigned_by_admin_id text,
  scope text,
  instructions text,
  due_date timestamp with time zone,
  status text default 'pending',
  volunteer_response text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Admin Messages
create table if not exists admin_messages (
  id text primary key,
  case_id text,
  case_title text,
  sender_role text,
  sender_user_id text,
  sender_name text,
  recipient_role text,
  moderated_flag boolean default false,
  visibility_scope text default 'all',
  body text,
  attachments text[] default '{}',
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Businesses
create table if not exists businesses (
  id text primary key,
  name text not null,
  slug text unique not null,
  logo text,
  cover_image text,
  category text not null,
  subcategory text,
  description_short text,
  description_full text,
  services text[] default '{}',
  contact_person text,
  phone text,
  email text,
  website text,
  social_links jsonb default '[]'::jsonb,
  address text,
  city text,
  province text,
  postal_code text,
  service_area text,
  years_in_business integer,
  business_hours text,
  pricing_summary text,
  member_rate_text text,
  offer_badge text,
  member_benefits text[] default '{}',
  verification_status text default 'pending_review',
  is_featured boolean default false,
  has_member_rate boolean default false,
  created_by text,
  approved_by_admin text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Events
create table if not exists events (
  id text primary key,
  title text not null,
  description text,
  date date,
  time text,
  location text,
  event_type text,
  capacity integer,
  attendees integer default 0,
  image text,
  is_featured boolean default false,
  platform text,
  rsvp_url text,
  status text default 'upcoming',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Jobs
create table if not exists jobs (
  id text primary key,
  title text not null,
  company text not null,
  company_logo text,
  location text,
  province text,
  salary_min numeric,
  salary_max numeric,
  salary_period text,
  job_type text,
  category text,
  description text,
  requirements text,
  responsibilities text,
  contact_email text,
  apply_url text,
  tags text[] default '{}',
  is_featured boolean default false,
  is_active boolean default true,
  posted_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ========== SEED DATA ==========

-- Seed Members
insert into members (id, first_name, last_name, email, city, province, verification_status, account_status)
values 
('m1', 'Priya', 'Sharma', 'priya.sharma@gmail.com', 'Toronto', 'Ontario', 'verified', 'active'),
('m2', 'Arjun', 'Patel', 'arjun.patel@gmail.com', 'Vancouver', 'British Columbia', 'verified', 'active'),
('m3', 'Neha', 'Gupta', 'neha.gupta@gmail.com', 'Toronto', 'Ontario', 'pending', 'active'),
('m4', 'Raj', 'Kumar', 'raj.kumar@outlook.com', 'Ottawa', 'Ontario', 'verified', 'active')
on conflict (id) do nothing;

-- Seed Help Requests
insert into help_requests (id, member_id, member_name, category, title, description, urgency, status, created_at)
values 
('HR-2026-001', 'm1', 'Priya Sharma', 'Job Referrals and Placement Assistance', 'Looking for Software Engineering referrals at Shopify', 'I have 7 years experience...', 'medium', 'assigned', '2026-03-15T10:00:00Z'),
('HR-2026-002', 'm3', 'Neha Gupta', 'Newcomer Settlement Support', 'Help with finding housing in Toronto', 'I recently arrived in Canada...', 'high', 'under_review', '2026-04-05T15:00:00Z')
on conflict (id) do nothing;

-- Seed Jobs
insert into jobs (id, title, company, location, category, job_type, is_featured, created_at)
values 
('job-001', 'Senior Full-Stack Developer', 'Shopify', 'Toronto, ON', 'Developer', 'full_time', true, '2026-04-10T10:00:00Z'),
('job-002', 'Staff Accountant', 'Sharma & Associates CPA', 'Toronto, ON', 'Accounting', 'full_time', false, '2026-04-08T10:00:00Z')
on conflict (id) do nothing;

-- Enable RLS (Row Level Security)
alter table members enable row level security;
alter table help_requests enable row level security;
alter table volunteer_applications enable row level security;
alter table businesses enable row level security;
alter table events enable row level security;
alter table jobs enable row level security;

-- Create basic policies (Allow all for development, you can restrict these later)
create policy "Allow all for authenticated users" on members for all using (true);
create policy "Allow all for authenticated users" on help_requests for all using (true);
create policy "Allow all for authenticated users" on volunteer_applications for all using (true);
create policy "Allow all for authenticated users" on businesses for all using (true);
create policy "Allow all for authenticated users" on events for all using (true);
create policy "Allow all for authenticated users" on jobs for all using (true);
