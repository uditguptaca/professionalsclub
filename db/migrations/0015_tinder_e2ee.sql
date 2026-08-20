-- ============================================================================
-- 0015 — Swipe discovery + end-to-end encrypted chat
--
-- 1. matrimony_passes: "swipe left". A pass hides the profile from the deck;
--    deletable so the member can undo their last pass.
-- 2. matrimony_e2e_keys: each profile's PUBLIC encryption key (ECDH P-256,
--    JWK). Private keys never leave the member's device; the server only ever
--    stores ciphertext it cannot read. Public keys are public by design, so
--    any signed-in member may read them.
-- 3. matrimony_messages grows cipher/iv columns. A message is either
--    plaintext (legacy rows, or a peer who has no key yet) or ciphertext —
--    never both, never neither.
--
-- NOTE for moderation: end-to-end encrypted messages are unreadable by
-- admins. The block/report tools still work; reports rely on the reporter,
-- not on server-side message content.
-- ============================================================================

-- 1. Passes -------------------------------------------------------------------
create table if not exists public.matrimony_passes (
  owner_profile_id  uuid not null references public.matrimony_profiles(id) on delete cascade,
  target_profile_id uuid not null references public.matrimony_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_profile_id, target_profile_id),
  constraint matrimony_passes_not_self check (owner_profile_id <> target_profile_id)
);

alter table public.matrimony_passes enable row level security;
grant select, insert, delete on public.matrimony_passes to app_authenticated;

drop policy if exists matrimony_passes_select on public.matrimony_passes;
create policy matrimony_passes_select on public.matrimony_passes
  for select to app_authenticated
  using (owner_profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_passes_insert on public.matrimony_passes;
create policy matrimony_passes_insert on public.matrimony_passes
  for insert to app_authenticated
  with check (
    owner_profile_id = public.my_matrimony_profile_id()
    and public.can_view_matrimony_profile(target_profile_id)
  );

drop policy if exists matrimony_passes_delete on public.matrimony_passes;
create policy matrimony_passes_delete on public.matrimony_passes
  for delete to app_authenticated
  using (owner_profile_id = public.my_matrimony_profile_id() or public.is_admin());

-- 2. E2E public keys ----------------------------------------------------------
create table if not exists public.matrimony_e2e_keys (
  profile_id uuid primary key references public.matrimony_profiles(id) on delete cascade,
  public_key_jwk text not null check (length(public_key_jwk) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.matrimony_e2e_keys enable row level security;
grant select, insert, update on public.matrimony_e2e_keys to app_authenticated;

-- Public keys are not secrets; every signed-in member may read them.
drop policy if exists matrimony_e2e_keys_select on public.matrimony_e2e_keys;
create policy matrimony_e2e_keys_select on public.matrimony_e2e_keys
  for select to app_authenticated
  using (true);

drop policy if exists matrimony_e2e_keys_insert on public.matrimony_e2e_keys;
create policy matrimony_e2e_keys_insert on public.matrimony_e2e_keys
  for insert to app_authenticated
  with check (profile_id = public.my_matrimony_profile_id());

drop policy if exists matrimony_e2e_keys_update on public.matrimony_e2e_keys;
create policy matrimony_e2e_keys_update on public.matrimony_e2e_keys
  for update to app_authenticated
  using (profile_id = public.my_matrimony_profile_id())
  with check (profile_id = public.my_matrimony_profile_id());

-- 3. Ciphertext on messages ---------------------------------------------------
alter table public.matrimony_messages alter column body drop not null;
alter table public.matrimony_messages drop constraint if exists matrimony_messages_body_check;
alter table public.matrimony_messages add column if not exists cipher text;
alter table public.matrimony_messages add column if not exists iv text;

alter table public.matrimony_messages drop constraint if exists matrimony_messages_content_check;
alter table public.matrimony_messages add constraint matrimony_messages_content_check check (
  (body is not null and length(body) between 1 and 5000 and cipher is null and iv is null)
  or
  (body is null and cipher is not null and length(cipher) between 1 and 20000
   and iv is not null and length(iv) between 8 and 64)
);
