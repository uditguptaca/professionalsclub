-- ============================================================================
-- 0042 — Multi-device end-to-end encryption (owner's call, 2026-09-09)
--
-- THE BUG THIS FIXES. 0015/0016 gave each MEMBER one published public key, but
-- the private half lives in one browser's localStorage. So the key was really
-- per DEVICE while the table allowed only one per member: opening chat on a
-- second device overwrote the first device's public key, and from then on
--   - the new device could not read anything sent to the old key, and
--   - the old device could not read anything new either, because the peer was
--     now encrypting to a key it did not have.
-- Members saw "Encrypted message - sent before this device joined" on their own
-- conversations. Anyone using the phone app and a browser hit it immediately.
--
-- THE MODEL, as Signal and Matrix do it. Keys belong to DEVICES, and a message
-- is sealed once for every device that should be able to read it:
--
--   1. The sender generates a random content key (CK) per message and encrypts
--      the body once with it: member_messages.cipher / .iv, unchanged.
--   2. CK is then WRAPPED once per target device - every device of the
--      recipient AND every device of the sender, so the sender can read their
--      own history on their other devices - and each wrap is stored as a row in
--      member_message_keys.
--   3. Wrapping key = HKDF(ECDH(sender device private, target device public)).
--      A reader unwraps with HKDF(ECDH(its own private, sender device public)),
--      which is why member_messages carries sender_device_id.
--
-- The server still never sees a plaintext body or a content key: it holds
-- ciphertext and wrapped keys it has no private key for. Admins cannot read
-- chat, deliberately - member_message_keys has NO is_admin() branch, and adding
-- one would quietly end end-to-end encryption for the whole app.
--
-- WHAT THIS DOES NOT DO, stated plainly: a device cannot read messages sent
-- BEFORE it was registered, because no wrap exists for a device that did not
-- exist. That is inherent to the design (Signal behaves the same) and was
-- accepted when this was chosen. Going forward, every device a member has
-- registered can read every new message. Messages already scrambled by the old
-- single-key scheme stay unreadable and are labelled honestly.
-- ============================================================================

-- 1. Device keys --------------------------------------------------------------
create table if not exists public.member_devices (
  member_id      uuid not null references public.profiles(id) on delete cascade,
  device_id      text not null check (length(device_id) between 8 and 64),
  public_key_jwk text not null check (length(public_key_jwk) <= 2000),
  label          text check (label is null or length(label) <= 60),
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  primary key (member_id, device_id)
);

create index if not exists idx_member_devices_member on public.member_devices (member_id);

alter table public.member_devices enable row level security;
grant select, insert, delete on public.member_devices to app_authenticated;
grant update (public_key_jwk, label, last_seen_at) on public.member_devices to app_authenticated;

-- A device's PUBLIC key is public by design: every member must be able to seal
-- a message for the devices of the person they are writing to. There is
-- nothing else in the row - no name, no platform fingerprint, no address.
drop policy if exists member_devices_select on public.member_devices;
create policy member_devices_select on public.member_devices
  for select to app_authenticated
  using (public.is_active_member());

drop policy if exists member_devices_insert on public.member_devices;
create policy member_devices_insert on public.member_devices
  for insert to app_authenticated
  with check (public.is_active_member() and member_id = app.current_user_id());

drop policy if exists member_devices_update on public.member_devices;
create policy member_devices_update on public.member_devices
  for update to app_authenticated
  using (member_id = app.current_user_id())
  with check (public.is_active_member() and member_id = app.current_user_id());

-- Signing out on a shared computer should be able to drop that device.
drop policy if exists member_devices_delete on public.member_devices;
create policy member_devices_delete on public.member_devices
  for delete to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin());

-- Ten devices per member, oldest evicted first - the same shape and the same
-- reason as push_devices in 0038: without a cap, a member who clears their
-- browser storage weekly accumulates keys forever and every message they
-- receive grows another wrap row.
create or replace function public.cap_member_devices()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.member_devices d
   where d.member_id = new.member_id
     and d.device_id not in (
       select device_id from public.member_devices
        where member_id = new.member_id
        order by last_seen_at desc
        limit 10
     );
  return null;
end;
$$;

drop trigger if exists member_devices_cap on public.member_devices;
create trigger member_devices_cap
  after insert on public.member_devices
  for each row execute function public.cap_member_devices();

comment on table public.member_devices is
  'One ECDH public key per member DEVICE (0042). Public keys are readable by every active member because sealing a message requires the recipient devices'' keys. Private halves never leave the device.';

-- 2. The per-message content key, wrapped once per device ---------------------
create table if not exists public.member_message_keys (
  message_id  uuid not null references public.member_messages(id) on delete cascade,
  device_id   text not null,
  -- Whose device this wrap is for. Denormalised on purpose: the read policy is
  -- then a plain equality on the caller instead of a join through
  -- member_messages to member_conversations on every message in a thread.
  member_id   uuid not null references public.profiles(id) on delete cascade,
  wrapped_key text not null check (length(wrapped_key) <= 1000),
  wrap_iv     text not null check (length(wrap_iv) between 8 and 64),
  primary key (message_id, device_id)
);

create index if not exists idx_member_message_keys_mine
  on public.member_message_keys (member_id, message_id);

alter table public.member_message_keys enable row level security;
grant select, insert on public.member_message_keys to app_authenticated;

-- I may read ONLY the wraps addressed to my own devices. No admin branch: an
-- admin who could read these could decrypt every private conversation in the
-- club, which is exactly what end-to-end encryption is for.
drop policy if exists member_message_keys_select on public.member_message_keys;
create policy member_message_keys_select on public.member_message_keys
  for select to app_authenticated
  using (member_id = app.current_user_id());

-- Only the sender of that message may add wraps for it, and only while the
-- conversation is open to them. member_messages' own select policy limits the
-- exists() to conversations the caller participates in.
drop policy if exists member_message_keys_insert on public.member_message_keys;
create policy member_message_keys_insert on public.member_message_keys
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and exists (
      select 1 from public.member_messages m
       where m.id = message_id
         and m.sender_id = app.current_user_id()
    )
  );

comment on table public.member_message_keys is
  'One message content key, wrapped separately for each device that may read it (0042). Readable only by the member whose device it addresses - never by admins, by design.';

-- 3. Which device sealed the message -----------------------------------------
-- The reader needs the SENDER DEVICE's public key to reconstruct the wrapping
-- key, so it has to travel with the message.
alter table public.member_messages
  add column if not exists sender_device_id text;

-- 4. The single-key table is superseded ---------------------------------------
-- Nothing can be recovered from it: it only ever held public keys, and the
-- private halves are in browsers' localStorage. Dropping it removes the
-- temptation to write to it again and re-create the one-key-per-member bug.
drop table if exists public.member_e2e_keys;
