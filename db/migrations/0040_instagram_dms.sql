-- ============================================================================
-- 0040 — Instagram-style DMs (owner's call, 2026-08-26)
--
-- The mutual-follow chat gate is gone. The new social contract:
--
--  1. Follows are INSTANT. No request, no acceptance — following someone just
--     works, like Instagram. The status column stays for compatibility but
--     every edge is 'accepted' from here on.
--  2. Anyone may open a chat with anyone (a block is the one gate left). The
--     conversation records who started it (initiator_id) and whether the
--     other side has let it in (accepted_at).
--  3. For the person who did NOT start it, an unaccepted thread is a MESSAGE
--     REQUEST — unless they already follow the initiator, in which case it
--     lands straight in their inbox. Accepting stamps accepted_at; replying
--     accepts implicitly (trigger below); declining deletes the conversation.
--  4. Matrimony matches and referral chats are never requests: their consent
--     already happened elsewhere (accepted interest / the referral card), so
--     those flows may create the conversation pre-accepted —
--     is_preapproved_chat() is what the insert policy checks.
--  5. Read receipts on a request thread would tell a stranger "seen", so the
--     repo's read-stamp skips request threads. Enforced there, not here: the
--     stamp is an UPDATE the recipient chooses to run.
--  6. Unfollowing no longer freezes a chat.
-- ============================================================================

-- 1. Instant follows ----------------------------------------------------------
alter table public.member_follows alter column status set default 'accepted';
update public.member_follows set status = 'accepted' where status <> 'accepted';

-- A new follower is worth telling; there is no request to answer any more.
-- The UPDATE branch stays: a stray pending row accepted by old code still
-- notifies sensibly instead of silently.
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.status = 'accepted' then
    perform public.notify_member(
      new.followee_id, 'social', 'follow_new',
      coalesce(public.member_display_name(new.follower_id), 'A member'),
      'Started following you',
      '/portal/member/community?tab=people',
      new.follower_id,
      'follow_new:' || new.follower_id::text,
      '{}'::jsonb
    );
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    perform public.notify_member(
      new.follower_id, 'social', 'follow_accepted',
      coalesce(public.member_display_name(new.followee_id), 'A member'),
      'Accepted your follow request',
      '/portal/member/community?tab=people',
      new.followee_id,
      'follow_ok:' || new.followee_id::text,
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

-- 2. Conversations know who knocked -------------------------------------------
alter table public.member_conversations
  add column if not exists initiator_id uuid references public.profiles(id) on delete set null,
  add column if not exists accepted_at timestamptz;

-- Every existing conversation was created under the old mutual gate (or a
-- matrimony/referral unlock): established chats, not requests.
update public.member_conversations set accepted_at = created_at where accepted_at is null;

-- 3. The only gate left is a block ---------------------------------------------
create or replace function public.is_chat_allowed(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not public.is_blocked_between_members(a, b);
$$;

-- The old unlock rules live on with one narrow job: flows whose consent
-- already happened elsewhere may create the conversation pre-accepted.
create or replace function public.is_preapproved_chat(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
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

-- 4. Creating a chat: any active member, recorded as the initiator. The
--    request state may not be skipped unless the pairing is preapproved —
--    otherwise inserting accepted_at directly would jump the queue.
drop policy if exists member_conversations_insert on public.member_conversations;
create policy member_conversations_insert on public.member_conversations
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and app.current_user_id() in (member_a_id, member_b_id)
    and initiator_id = app.current_user_id()
    and public.is_chat_allowed(member_a_id, member_b_id)
    and (accepted_at is null or public.is_preapproved_chat(member_a_id, member_b_id))
  );

-- 5. Accepting: only the non-initiator, and only the accepted_at column. The
--    old table-wide update grant let a participant rewrite ANY column (the
--    policy had no with-check); tightened to the one legitimate write.
revoke update on public.member_conversations from app_authenticated;
grant update (accepted_at) on public.member_conversations to app_authenticated;

drop policy if exists member_conversations_update on public.member_conversations;
create policy member_conversations_update on public.member_conversations
  for update to app_authenticated
  using (
    app.current_user_id() in (member_a_id, member_b_id)
    and initiator_id is not null
    and initiator_id <> app.current_user_id()
  )
  with check (accepted_at is not null);

-- 6. Declining: the recipient deletes the request — messages cascade with it.
grant delete on public.member_conversations to app_authenticated;
drop policy if exists member_conversations_delete on public.member_conversations;
create policy member_conversations_delete on public.member_conversations
  for delete to app_authenticated
  using (
    public.is_admin()
    or (
      app.current_user_id() in (member_a_id, member_b_id)
      and initiator_id is not null
      and initiator_id <> app.current_user_id()
      and accepted_at is null
    )
  );

-- 7. Replying accepts. Same definer trigger that bumps last_message_at, so
--    the two writes cannot drift apart.
create or replace function public.touch_member_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.member_conversations
     set last_message_at = new.created_at,
         accepted_at = case
           when accepted_at is null
                and initiator_id is not null
                and new.sender_id <> initiator_id
             then new.created_at
           else accepted_at
         end
   where id = new.conversation_id;
  return new;
end;
$$;
