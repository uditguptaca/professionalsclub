
-- 1. Rename the members table to something more unique
alter table if exists public.members rename to club_members;

-- 2. Ensure all foreign keys point to the new name (Postgres handles this automatically, but let's be safe)
-- help_requests
alter table help_requests drop constraint if exists help_requests_member_id_fkey;
alter table help_requests add constraint help_requests_member_id_fkey foreign key (member_id) references club_members(id);

-- volunteer_apps
alter table volunteer_applications drop constraint if exists volunteer_applications_member_id_fkey;
alter table volunteer_applications add constraint volunteer_applications_member_id_fkey foreign key (member_id) references club_members(id);

-- 3. Re-grant permissions to the new table name
grant all on table public.club_members to anon, authenticated, service_role;

-- 4. Enable RLS and add policies for the new name
alter table public.club_members enable row level security;
create policy "Allow all for club_members" on public.club_members for all using (true);

-- 5. Force schema reload
notify pgrst, 'reload schema';
