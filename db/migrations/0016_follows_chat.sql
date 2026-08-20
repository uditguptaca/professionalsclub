-- ============================================================================
-- 0016 — Member follows + mutual-follow-gated member chat
--
-- The social contract, Instagram-style: anyone may follow anyone; a chat
-- exists only between two members who BOTH follow each other, and it freezes
-- (no new messages) the moment either side unfollows. Enforced here, not in
-- the client.
--
-- Privacy: follow edges are visible only to the two people on the edge (and
-- admins) — there are no public follower lists. Messages reuse the E2E
-- contract from 0015: the server stores ciphertext it cannot read; plaintext
-- is a fallback for keyless devices only.
-- ============================================================================

-- 1. The follow graph --------------------------------------------------------
create table if not exists public.member_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint member_follows_not_self check (follower_id <> followee_id)
);

create index if not exists idx_member_follows_followee on public.member_follows (followee_id);

alter table public.member_follows enable row level security;
grant select, insert, delete on public.member_follows to app_authenticated;

drop policy if exists member_follows_select on public.member_follows;
create policy member_follows_select on public.member_follows
  for select to app_authenticated
  using (
    follower_id = app.current_user_id()
    or followee_id = app.current_user_id()
    or public.is_admin()
  );

drop policy if exists member_follows_insert on public.member_follows;
create policy member_follows_insert on public.member_follows
  for insert to app_authenticated
  with check (follower_id = app.current_user_id());

drop policy if exists member_follows_delete on public.member_follows;
create policy member_follows_delete on public.member_follows
  for delete to app_authenticated
  using (follower_id = app.current_user_id() or public.is_admin());

-- Mutuality is THE gate for chat. SECURITY DEFINER because the two rows it
-- checks belong to different owners than the caller in half the cases.
create or replace function public.is_mutual_follow(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.member_follows where follower_id = a and followee_id = b)
     and exists (select 1 from public.member_follows where follower_id = b and followee_id = a);
$$;

-- 2. Member chat --------------------------------------------------------------
create table if not exists public.member_conversations (
  id uuid primary key default gen_random_uuid(),
  member_a_id uuid not null references public.profiles(id) on delete cascade,
  member_b_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (member_a_id, member_b_id),
  constraint member_conversations_not_self check (member_a_id <> member_b_id),
  -- Stored in sorted order so the unique constraint truly prevents A/B + B/A.
  constraint member_conversations_sorted check (member_a_id < member_b_id)
);

create index if not exists idx_member_convo_a on public.member_conversations (member_a_id);
create index if not exists idx_member_convo_b on public.member_conversations (member_b_id);

create or replace function public.is_member_convo_participant(convo uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.member_conversations c
    where c.id = convo
      and app.current_user_id() in (c.member_a_id, c.member_b_id)
  );
$$;

/** True while the two people in the conversation still follow each other. */
create or replace function public.member_convo_is_open(convo uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_mutual_follow(c.member_a_id, c.member_b_id)
    from public.member_conversations c where c.id = convo;
$$;

alter table public.member_conversations enable row level security;
grant select, insert, update on public.member_conversations to app_authenticated;

drop policy if exists member_conversations_select on public.member_conversations;
create policy member_conversations_select on public.member_conversations
  for select to app_authenticated
  using (
    app.current_user_id() in (member_a_id, member_b_id)
    or public.is_admin()
  );

drop policy if exists member_conversations_insert on public.member_conversations;
create policy member_conversations_insert on public.member_conversations
  for insert to app_authenticated
  with check (
    app.current_user_id() in (member_a_id, member_b_id)
    and public.is_mutual_follow(member_a_id, member_b_id)
  );

drop policy if exists member_conversations_update on public.member_conversations;
create policy member_conversations_update on public.member_conversations
  for update to app_authenticated
  using (app.current_user_id() in (member_a_id, member_b_id) or public.is_admin());

create table if not exists public.member_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.member_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body   text,
  cipher text,
  iv     text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint member_messages_content_check check (
    (body is not null and length(body) between 1 and 5000 and cipher is null and iv is null)
    or
    (body is null and cipher is not null and length(cipher) between 1 and 20000
     and iv is not null and length(iv) between 8 and 64)
  )
);

create index if not exists idx_member_messages_convo on public.member_messages (conversation_id, created_at);

create or replace function public.touch_member_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.member_conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists member_messages_touch_convo on public.member_messages;
create trigger member_messages_touch_convo
  after insert on public.member_messages
  for each row execute function public.touch_member_conversation();

alter table public.member_messages enable row level security;
grant select, insert, update on public.member_messages to app_authenticated;

drop policy if exists member_messages_select on public.member_messages;
create policy member_messages_select on public.member_messages
  for select to app_authenticated
  using (public.is_member_convo_participant(conversation_id) or public.is_admin());

-- New messages require the follow to STILL be mutual: unfollowing freezes the
-- thread for both sides.
drop policy if exists member_messages_insert on public.member_messages;
create policy member_messages_insert on public.member_messages
  for insert to app_authenticated
  with check (
    sender_id = app.current_user_id()
    and public.is_member_convo_participant(conversation_id)
    and public.member_convo_is_open(conversation_id)
  );

-- Only for stamping read_at on messages you received.
drop policy if exists member_messages_update on public.member_messages;
create policy member_messages_update on public.member_messages
  for update to app_authenticated
  using (
    public.is_member_convo_participant(conversation_id)
    and sender_id <> app.current_user_id()
  );

-- 3. E2E public keys, keyed by member (profiles.id) ---------------------------
create table if not exists public.member_e2e_keys (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  public_key_jwk text not null check (length(public_key_jwk) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.member_e2e_keys enable row level security;
grant select, insert, update on public.member_e2e_keys to app_authenticated;

drop policy if exists member_e2e_keys_select on public.member_e2e_keys;
create policy member_e2e_keys_select on public.member_e2e_keys
  for select to app_authenticated
  using (true);

drop policy if exists member_e2e_keys_insert on public.member_e2e_keys;
create policy member_e2e_keys_insert on public.member_e2e_keys
  for insert to app_authenticated
  with check (member_id = app.current_user_id());

drop policy if exists member_e2e_keys_update on public.member_e2e_keys;
create policy member_e2e_keys_update on public.member_e2e_keys
  for update to app_authenticated
  using (member_id = app.current_user_id())
  with check (member_id = app.current_user_id());
