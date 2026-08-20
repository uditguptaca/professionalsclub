-- ============================================================================
-- 0021 — Chat grows up: all attachment kinds + the standard control set
--
-- Modeled on what every serious messenger treats as table stakes
-- (WhatsApp / Instagram / Signal): block, report, mute, clear-for-me, and
-- privacy toggles for read receipts and typing. Plus message kinds beyond
-- images: video and file, all through the existing upload pipeline.
--
-- Symmetry rules copied from WhatsApp deliberately:
--  - Turning read receipts off hides YOUR ✓✓ from others AND theirs from you.
--  - Turning typing off stops sending yours and showing theirs.
--  - A block freezes the chat both ways but is never announced to the
--    blocked person — the thread just reads as no longer open.
-- ============================================================================

-- 1. Message kinds: video and file join image --------------------------------
alter table public.member_messages drop constraint if exists member_messages_kind_check;
alter table public.member_messages
  add constraint member_messages_kind_check
  check (kind in ('text', 'image', 'video', 'file', 'referral'));

alter table public.member_messages drop constraint if exists member_messages_content_check;
alter table public.member_messages add constraint member_messages_content_check check (
  (kind = 'text' and (
    (body is not null and length(body) between 1 and 5000 and cipher is null and iv is null)
    or
    (body is null and cipher is not null and length(cipher) between 1 and 20000
     and iv is not null and length(iv) between 8 and 64)
  ))
  or
  (kind in ('image', 'video', 'file') and attachment_url is not null and (
    (body is null and cipher is null and iv is null)
    or (body is not null and length(body) <= 5000 and cipher is null and iv is null)
    or (body is null and cipher is not null and length(cipher) <= 20000
        and iv is not null and length(iv) between 8 and 64)
  ))
  or
  (kind = 'referral' and meta is not null and body is null and cipher is null)
);

-- 2. Blocks --------------------------------------------------------------------
create table if not exists public.member_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint member_blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.member_blocks enable row level security;
grant select, insert, delete on public.member_blocks to app_authenticated;

-- Only the blocker (and admins) can see a block exists. The blocked person
-- must not be able to detect it.
drop policy if exists member_blocks_select on public.member_blocks;
create policy member_blocks_select on public.member_blocks
  for select to app_authenticated
  using (blocker_id = app.current_user_id() or public.is_admin());

drop policy if exists member_blocks_insert on public.member_blocks;
create policy member_blocks_insert on public.member_blocks
  for insert to app_authenticated
  with check (blocker_id = app.current_user_id());

drop policy if exists member_blocks_delete on public.member_blocks;
create policy member_blocks_delete on public.member_blocks
  for delete to app_authenticated
  using (blocker_id = app.current_user_id() or public.is_admin());

create or replace function public.is_blocked_between_members(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.member_blocks
     where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- A block overrides every unlock rule, matrimony and referrals included.
create or replace function public.is_chat_allowed(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not public.is_blocked_between_members(a, b)
     and (
       public.is_mutual_follow(a, b)
       or exists (
            select 1
              from public.matrimony_profiles pa
              join public.matrimony_profiles pb on pb.user_id = b
             where pa.user_id = a
               and public.has_accepted_interest(pa.id, pb.id)
          )
       or exists (
            select 1 from public.referral_direct_requests r
             where (r.seeker_id = a and r.insider_id = b)
                or (r.seeker_id = b and r.insider_id = a)
          )
     );
$$;

-- 3. Reports ---------------------------------------------------------------------
create table if not exists public.member_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.member_conversations(id) on delete set null,
  reason text not null check (length(reason) between 1 and 100),
  details text check (details is null or length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at timestamptz not null default now(),
  constraint member_reports_not_self check (reporter_id <> reported_id)
);

alter table public.member_reports enable row level security;
grant select, insert on public.member_reports to app_authenticated;
grant update (status) on public.member_reports to app_authenticated;

drop policy if exists member_reports_select on public.member_reports;
create policy member_reports_select on public.member_reports
  for select to app_authenticated
  using (reporter_id = app.current_user_id() or public.is_admin());

drop policy if exists member_reports_insert on public.member_reports;
create policy member_reports_insert on public.member_reports
  for insert to app_authenticated
  with check (reporter_id = app.current_user_id());

drop policy if exists member_reports_update on public.member_reports;
create policy member_reports_update on public.member_reports
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Per-conversation prefs: mute + clear-for-me ----------------------------------
create table if not exists public.member_chat_prefs (
  conversation_id uuid not null references public.member_conversations(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  muted boolean not null default false,
  cleared_at timestamptz,
  primary key (conversation_id, member_id)
);

alter table public.member_chat_prefs enable row level security;
grant select, insert, update on public.member_chat_prefs to app_authenticated;

drop policy if exists member_chat_prefs_own on public.member_chat_prefs;
create policy member_chat_prefs_own on public.member_chat_prefs
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (
    member_id = app.current_user_id()
    and public.is_member_convo_participant(conversation_id)
  );

-- 5. Global chat settings ----------------------------------------------------------
create table if not exists public.member_chat_settings (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  read_receipts boolean not null default true,
  typing_indicator boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.member_chat_settings enable row level security;
grant select, insert, update on public.member_chat_settings to app_authenticated;

drop policy if exists member_chat_settings_own on public.member_chat_settings;
create policy member_chat_settings_own on public.member_chat_settings
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (member_id = app.current_user_id());

-- The one bit a PEER may learn (whether ✓✓ should render), through a definer
-- helper rather than opening the settings rows themselves. Missing row =
-- receipts on, the default.
create or replace function public.chat_read_receipts_enabled(member uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select read_receipts from public.member_chat_settings where member_id = member),
    true
  );
$$;
