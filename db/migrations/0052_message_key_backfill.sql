-- ============================================================================
-- 0052: Chat history follows you to a new device
--
-- THE GAP 0042 LEFT. A message's content key is wrapped once per device that
-- existed when it was sent. A device registered later - a new phone, a browser
-- whose storage was cleared, the app reinstalled - had no wrap for anything
-- before it, and the thread showed a wall of "encrypted before this device was
-- set up". Honest, and a terrible thing to open a chat to.
--
-- THE FIX, the way multi-device messengers do it: any device that can read a
-- message can re-wrap its content key for any other device in the
-- conversation. The old browser does it for the new phone; the other person's
-- device does it for yours. The server still never sees a content key or a
-- plaintext - it only learns that (message, device) pairs lack a wrap, and
-- stores the wraps a client hands it.
--
-- Two definer functions carry this. missing_message_wraps() tells a participant
-- which pairs in THEIR conversation lack a wrap (device ids are already public
-- through member_devices, so nothing new is disclosed). add_message_wraps()
-- accepts wraps from a participant, checks every row against the conversation
-- and the caller's own devices, and derives the target member from
-- member_devices rather than trusting the payload. The wrap records WHICH device
-- made it, because the reader must pair its private key with that device's
-- public key - not the original sender's - to open it.
--
-- The 0042 insert policy for senders is unchanged. Admins still cannot read
-- anything: member_message_keys keeps no is_admin() branch.
-- ============================================================================

-- 1. Which device made the wrap -------------------------------------------------
alter table public.member_message_keys
  add column if not exists wrapped_by_device_id text
    check (wrapped_by_device_id is null or length(wrapped_by_device_id) between 8 and 64);

comment on column public.member_message_keys.wrapped_by_device_id is
  'The device whose private key produced this wrap (0052). Null means the message''s own sender device (0042 rows). A reader pairs its private key with this device''s public key.';

-- 2. What a participant may fill in -----------------------------------------------
create or replace function public.missing_message_wraps(p_conversation uuid, p_limit integer default 300)
returns table (message_id uuid, device_id text, member_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id, d.device_id, d.member_id
    from public.member_conversations c
    join public.member_messages m on m.conversation_id = c.id
    join public.member_devices d on d.member_id in (c.member_a_id, c.member_b_id)
   where c.id = p_conversation
     and public.is_active_member()
     and app.current_user_id() in (c.member_a_id, c.member_b_id)
     and m.cipher is not null
     and not exists (
       select 1 from public.member_message_keys k
        where k.message_id = m.id and k.device_id = d.device_id
     )
   order by m.created_at desc
   limit greatest(1, least(coalesce(p_limit, 300), 1000));
$$;

revoke all on function public.missing_message_wraps(uuid, integer) from public;
grant execute on function public.missing_message_wraps(uuid, integer) to app_authenticated;

comment on function public.missing_message_wraps(uuid, integer) is
  'For a participant: (message, device) pairs in their conversation that have no wrap yet (0052). Device ids are public already; no key material is returned.';

-- 3. Handing wraps in -----------------------------------------------------------------
create or replace function public.add_message_wraps(p_conversation uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := app.current_user_id();
  v_n  integer;
begin
  if v_me is null or not public.is_active_member() then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.member_conversations c
     where c.id = p_conversation and v_me in (c.member_a_id, c.member_b_id)
  ) then
    raise exception 'Not your conversation' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_rows, '[]'::jsonb)) > 500 then
    raise exception 'Too many wraps at once';
  end if;

  -- Every row must name a message in THIS conversation, a device of one of its
  -- two participants, and a wrapping device the caller owns. The target member
  -- comes from member_devices, never from the payload.
  insert into public.member_message_keys
    (message_id, device_id, member_id, wrapped_key, wrap_iv, wrapped_by_device_id)
  select r.message_id, r.device_id, d.member_id, r.wrapped_key, r.wrap_iv, r.wrapped_by_device_id
    from jsonb_to_recordset(p_rows)
         as r(message_id uuid, device_id text, wrapped_key text, wrap_iv text, wrapped_by_device_id text)
    join public.member_messages m
      on m.id = r.message_id and m.conversation_id = p_conversation and m.cipher is not null
    join public.member_conversations c on c.id = m.conversation_id
    join public.member_devices d
      on d.device_id = r.device_id and d.member_id in (c.member_a_id, c.member_b_id)
    join public.member_devices mine
      on mine.device_id = r.wrapped_by_device_id and mine.member_id = v_me
   where r.wrapped_key is not null and length(r.wrapped_key) <= 1000
     and r.wrap_iv is not null and length(r.wrap_iv) between 8 and 64
  on conflict (message_id, device_id) do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.add_message_wraps(uuid, jsonb) from public;
grant execute on function public.add_message_wraps(uuid, jsonb) to app_authenticated;

comment on function public.add_message_wraps(uuid, jsonb) is
  'A participant hands in content-key wraps for devices in their conversation (0052). Each row is checked against the conversation, the participants'' devices and the caller''s own devices; duplicates are ignored. Returns how many were stored.';
