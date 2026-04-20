
-- 1. Grant usage on schema to anon and authenticated roles
grant usage on schema public to anon, authenticated;

-- 2. Grant select on all tables to anon and authenticated roles (for demo purposes)
grant select on all tables in schema public to anon, authenticated;

-- 3. Update RLS policies to be more permissive for the Verification Test
-- Members
alter table public.members disable row level security;
alter table public.members enable row level security;
create policy "Allow anyone to read members" on public.members for select using (true);
create policy "Allow anyone to insert members" on public.members for insert with check (true);

-- Help Requests
alter table public.help_requests disable row level security;
alter table public.help_requests enable row level security;
create policy "Allow anyone to read help_requests" on public.help_requests for select using (true);
create policy "Allow anyone to insert help_requests" on public.help_requests for insert with check (true);
create policy "Allow anyone to update help_requests" on public.help_requests for update using (true);

-- Volunteer Applications
alter table public.volunteer_applications disable row level security;
alter table public.volunteer_applications enable row level security;
create policy "Allow anyone to read volunteer_apps" on public.volunteer_applications for select using (true);
create policy "Allow anyone to insert volunteer_apps" on public.volunteer_applications for insert with check (true);
create policy "Allow anyone to update volunteer_apps" on public.volunteer_applications for update using (true);

-- Case Assignments
alter table public.case_assignments disable row level security;
alter table public.case_assignments enable row level security;
create policy "Allow anyone to read assignments" on public.case_assignments for select using (true);
create policy "Allow anyone to insert assignments" on public.case_assignments for insert with check (true);

-- Admin Messages
alter table public.admin_messages disable row level security;
alter table public.admin_messages enable row level security;
create policy "Allow anyone to read messages" on public.admin_messages for select using (true);
create policy "Allow anyone to insert messages" on public.admin_messages for insert with check (true);

-- 4. Force a schema cache reload
notify pgrst, 'reload schema';
