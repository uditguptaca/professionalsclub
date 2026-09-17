-- ============================================================================
-- 0054: A chat PIN, so messages follow a member to a new phone
--
-- WhatsApp and Messenger solve "new phone, old messages" the same way: the
-- device's keys are backed up under a secret only the member knows (a PIN, a
-- password, a 64-digit key), and a new device restores them by asking for
-- that secret once. The service holds ciphertext it cannot open.
--
-- This table is that backup. The row holds the member's device identity
-- (device id + ECDH keypair) encrypted in the browser with AES-GCM under a key
-- derived from the PIN by PBKDF2-SHA256 (600,000 iterations, random salt). The
-- server never sees the PIN or the private key. Restoring on a new device
-- makes it THAT device again, so every wrap ever addressed to it opens.
--
-- Honest limit: a PIN is low-entropy. The only party who can fetch this row is
-- the member's own session (RLS), so an attacker would need the account first
-- - at which point they can already read live messages. The backup guards
-- against device loss, not against a compromised account, and admins cannot
-- read it either way.
-- ============================================================================

create table if not exists public.member_key_backups (
  member_id   uuid primary key references public.profiles(id) on delete cascade,
  device_id   text not null check (length(device_id) between 8 and 64),
  kdf         text not null default 'PBKDF2-SHA256',
  iterations  integer not null check (iterations between 100000 and 5000000),
  salt        text not null check (length(salt) between 16 and 128),
  iv          text not null check (length(iv) between 8 and 64),
  cipher      text not null check (length(cipher) <= 8000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.member_key_backups enable row level security;
grant select, insert, update, delete on public.member_key_backups to app_authenticated;

drop policy if exists member_key_backups_select on public.member_key_backups;
create policy member_key_backups_select on public.member_key_backups
  for select to app_authenticated
  using (member_id = app.current_user_id());

drop policy if exists member_key_backups_insert on public.member_key_backups;
create policy member_key_backups_insert on public.member_key_backups
  for insert to app_authenticated
  with check (member_id = app.current_user_id() and public.is_active_member());

drop policy if exists member_key_backups_update on public.member_key_backups;
create policy member_key_backups_update on public.member_key_backups
  for update to app_authenticated
  using (member_id = app.current_user_id())
  with check (member_id = app.current_user_id());

drop policy if exists member_key_backups_delete on public.member_key_backups;
create policy member_key_backups_delete on public.member_key_backups
  for delete to app_authenticated
  using (member_id = app.current_user_id());

comment on table public.member_key_backups is
  'A member''s chat device identity, encrypted in the browser under a PIN-derived key (0054). Readable only by that member''s session; never by admins. Restoring it on a new device makes that device the backed-up one.';
