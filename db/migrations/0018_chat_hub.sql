-- ============================================================================
-- 0018 — Chat becomes the hub: follow REQUESTS, direct referrals, rich messages
--
-- Product decisions (owner's call, 2026-08-21):
--  1. Follows are REQUESTS now, Instagram-style: a follow sits pending until
--     the other person accepts. Chat unlocks only between two people whose
--     follows are BOTH accepted.
--  2. Referrals reverse the old anonymous fan-out. A seeker now SEES, BY NAME,
--     the members who work at a company and have offered to refer
--     (company_insider_directory), picks specific people, and each request
--     opens a chat carrying a referral card. The old broadcast machinery
--     (referral_requests / recipients / inbox views) is dropped.
--  3. Matrimony matches chat in the SAME chat system (wired in code: a match
--     now opens a member conversation).
--  4. Messages grow kinds (text / image / referral), attachments, and a typing
--     signal. Admin-mediated help requests are unchanged — they are the one
--     flow that stays off chat.
--
-- PUBLISHING DECISION, stated plainly: company_insider_directory shows every
-- member the NAME + title of anyone who opted into referring at a company
-- (can_refer = true). That is the point of the new flow — opting in now means
-- being visible. Insiders who set can_refer = false appear nowhere.
-- ============================================================================

-- 1. Follow requests ----------------------------------------------------------
alter table public.member_follows
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'accepted'));

-- Everything that existed before this migration was an instant follow.
update public.member_follows set status = 'accepted' where status = 'pending';

-- Only the person being followed may accept, and only the status may change.
revoke update on public.member_follows from app_authenticated;
grant update (status) on public.member_follows to app_authenticated;

drop policy if exists member_follows_update on public.member_follows;
create policy member_follows_update on public.member_follows
  for update to app_authenticated
  using (followee_id = app.current_user_id())
  with check (followee_id = app.current_user_id() and status = 'accepted');

-- Decline / remove-a-follower: the followee may delete the edge too.
drop policy if exists member_follows_delete on public.member_follows;
create policy member_follows_delete on public.member_follows
  for delete to app_authenticated
  using (
    follower_id = app.current_user_id()
    or followee_id = app.current_user_id()
    or public.is_admin()
  );

create or replace function public.is_mutual_follow(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.member_follows
                  where follower_id = a and followee_id = b and status = 'accepted')
     and exists (select 1 from public.member_follows
                  where follower_id = b and followee_id = a and status = 'accepted');
$$;

-- 2. Direct referral requests -------------------------------------------------
create table if not exists public.referral_direct_requests (
  id uuid primary key default gen_random_uuid(),
  seeker_id  uuid not null references public.profiles(id) on delete cascade,
  insider_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  job_ids uuid[] not null default '{}',
  note text check (note is null or length(note) <= 2000),
  resume_url text check (resume_url is null or length(resume_url) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (seeker_id, insider_id, company_id),
  constraint referral_direct_not_self check (seeker_id <> insider_id)
);

create index if not exists idx_referral_direct_insider on public.referral_direct_requests (insider_id, status);
create index if not exists idx_referral_direct_seeker  on public.referral_direct_requests (seeker_id);

alter table public.referral_direct_requests enable row level security;
grant select, insert, delete on public.referral_direct_requests to app_authenticated;
grant update (status, responded_at) on public.referral_direct_requests to app_authenticated;

drop policy if exists referral_direct_select on public.referral_direct_requests;
create policy referral_direct_select on public.referral_direct_requests
  for select to app_authenticated
  using (
    seeker_id = app.current_user_id()
    or insider_id = app.current_user_id()
    or public.is_admin()
  );

-- A request may only target someone who has actually offered to refer there.
drop policy if exists referral_direct_insert on public.referral_direct_requests;
create policy referral_direct_insert on public.referral_direct_requests
  for insert to app_authenticated
  with check (
    seeker_id = app.current_user_id()
    and exists (select 1 from public.company_insiders ci
                 where ci.member_id = insider_id
                   and ci.company_id = referral_direct_requests.company_id
                   and ci.can_refer)
  );

-- Only the insider answers.
drop policy if exists referral_direct_update on public.referral_direct_requests;
create policy referral_direct_update on public.referral_direct_requests
  for update to app_authenticated
  using (insider_id = app.current_user_id())
  with check (insider_id = app.current_user_id());

-- Withdraw while unanswered.
drop policy if exists referral_direct_delete on public.referral_direct_requests;
create policy referral_direct_delete on public.referral_direct_requests
  for delete to app_authenticated
  using ((seeker_id = app.current_user_id() and status = 'pending') or public.is_admin());

-- 3. The named insider directory ----------------------------------------------
drop view if exists public.company_insider_directory;
create view public.company_insider_directory
with (security_barrier)
as
select
  ci.company_id,
  ci.member_id,
  n.first_name,
  n.last_name,
  ci.job_title,
  ci.verified_by_admin
from public.company_insiders ci
join public.member_names n on n.id = ci.member_id
where ci.can_refer;

grant select on public.company_insider_directory to app_authenticated;

comment on view public.company_insider_directory is
  'Members who opted into referring at a company, BY NAME, for signed-in members. Opting in (can_refer) means being visible here — that is the deal the referral flow now offers. No contact columns.';

-- 4. Chat unlock: mutual follow OR matrimony match OR a referral request ------
create or replace function public.is_chat_allowed(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_mutual_follow(a, b)
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
         );
$$;

drop policy if exists member_conversations_insert on public.member_conversations;
create policy member_conversations_insert on public.member_conversations
  for insert to app_authenticated
  with check (
    app.current_user_id() in (member_a_id, member_b_id)
    and public.is_chat_allowed(member_a_id, member_b_id)
  );

create or replace function public.member_convo_is_open(convo uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_chat_allowed(c.member_a_id, c.member_b_id)
    from public.member_conversations c where c.id = convo;
$$;

-- 5. Rich messages: kinds, attachments ----------------------------------------
alter table public.member_messages
  add column if not exists kind text not null default 'text'
    check (kind in ('text', 'image', 'referral')),
  add column if not exists meta jsonb,
  add column if not exists attachment_url text
    check (attachment_url is null or length(attachment_url) <= 1000);

alter table public.member_messages drop constraint if exists member_messages_content_check;
alter table public.member_messages add constraint member_messages_content_check check (
  (kind = 'text' and (
    (body is not null and length(body) between 1 and 5000 and cipher is null and iv is null)
    or
    (body is null and cipher is not null and length(cipher) between 1 and 20000
     and iv is not null and length(iv) between 8 and 64)
  ))
  or
  -- An image: the attachment is required; an optional caption follows the
  -- same plaintext-or-ciphertext rule.
  (kind = 'image' and attachment_url is not null and (
    (body is null and cipher is null and iv is null)
    or (body is not null and length(body) <= 5000 and cipher is null and iv is null)
    or (body is null and cipher is not null and length(cipher) <= 20000
        and iv is not null and length(iv) between 8 and 64)
  ))
  or
  -- A referral card: everything lives in meta (request id, company, roles).
  (kind = 'referral' and meta is not null and body is null and cipher is null)
);

-- 6. Typing signal --------------------------------------------------------------
create table if not exists public.member_chat_typing (
  conversation_id uuid not null references public.member_conversations(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  typing_at timestamptz not null default now(),
  primary key (conversation_id, member_id)
);

alter table public.member_chat_typing enable row level security;
grant select, insert, update on public.member_chat_typing to app_authenticated;

drop policy if exists member_chat_typing_select on public.member_chat_typing;
create policy member_chat_typing_select on public.member_chat_typing
  for select to app_authenticated
  using (public.is_member_convo_participant(conversation_id));

drop policy if exists member_chat_typing_insert on public.member_chat_typing;
create policy member_chat_typing_insert on public.member_chat_typing
  for insert to app_authenticated
  with check (
    member_id = app.current_user_id()
    and public.is_member_convo_participant(conversation_id)
  );

drop policy if exists member_chat_typing_update on public.member_chat_typing;
create policy member_chat_typing_update on public.member_chat_typing
  for update to app_authenticated
  using (member_id = app.current_user_id())
  with check (member_id = app.current_user_id());

