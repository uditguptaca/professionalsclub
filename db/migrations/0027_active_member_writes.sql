-- ============================================================================
-- 0027 — Suspended accounts must not be able to write, anywhere
--
-- Found by audit, and it is the most serious gap so far. src/server/auth.ts
-- states the invariant plainly: "account status and every permission are
-- enforced authoritatively inside Postgres by the RLS policies on the very
-- query this action is about to run". That was true of 0001-0014, whose write
-- policies all carry public.is_active_member(). Every table added from 0015
-- onwards (follows, chat, reactions, typing, blocks, reports, prefs, keys,
-- passes, direct referrals) omitted it.
--
-- Consequence: suspending a harassing member stopped their PAGE navigation
-- (requireProfile in the member layout) but not their Server Actions. Their
-- open tab kept polling, messaging, following, reporting and sending referral
-- requests. requireUserId() could not catch it either: it only consults the
-- profile cache, and suspension DELETES that entry, so the check was skipped.
--
-- Every policy below keeps its original logic; is_active_member() is ANDed on.
-- ============================================================================

-- 0015: swipe-left memory ----------------------------------------------------
drop policy if exists matrimony_passes_insert on public.matrimony_passes;
create policy matrimony_passes_insert on public.matrimony_passes
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and owner_profile_id = public.my_matrimony_profile_id()
    and public.can_view_matrimony_profile(target_profile_id)
  );

-- 0016: E2E public keys ------------------------------------------------------
drop policy if exists member_e2e_keys_insert on public.member_e2e_keys;
create policy member_e2e_keys_insert on public.member_e2e_keys
  for insert to app_authenticated
  with check (public.is_active_member() and member_id = app.current_user_id());

drop policy if exists member_e2e_keys_update on public.member_e2e_keys;
create policy member_e2e_keys_update on public.member_e2e_keys
  for update to app_authenticated
  using (member_id = app.current_user_id())
  with check (public.is_active_member() and member_id = app.current_user_id());

-- 0016 + 0018: the follow graph ----------------------------------------------
drop policy if exists member_follows_insert on public.member_follows;
create policy member_follows_insert on public.member_follows
  for insert to app_authenticated
  with check (public.is_active_member() and follower_id = app.current_user_id());

drop policy if exists member_follows_update on public.member_follows;
create policy member_follows_update on public.member_follows
  for update to app_authenticated
  using (followee_id = app.current_user_id())
  with check (
    public.is_active_member()
    and followee_id = app.current_user_id()
    and status = 'accepted'
  );

-- 0018 + 0021 + 0025: conversations and messages -----------------------------
drop policy if exists member_conversations_insert on public.member_conversations;
create policy member_conversations_insert on public.member_conversations
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and app.current_user_id() in (member_a_id, member_b_id)
    and public.is_chat_allowed(member_a_id, member_b_id)
  );

drop policy if exists member_messages_insert on public.member_messages;
create policy member_messages_insert on public.member_messages
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and sender_id = app.current_user_id()
    and public.is_member_convo_participant(conversation_id)
    and public.member_convo_is_open(conversation_id)
  );

-- 0018: typing heartbeat -----------------------------------------------------
drop policy if exists member_chat_typing_insert on public.member_chat_typing;
create policy member_chat_typing_insert on public.member_chat_typing
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and member_id = app.current_user_id()
    and public.is_member_convo_participant(conversation_id)
  );

drop policy if exists member_chat_typing_update on public.member_chat_typing;
create policy member_chat_typing_update on public.member_chat_typing
  for update to app_authenticated
  using (member_id = app.current_user_id())
  with check (public.is_active_member() and member_id = app.current_user_id());

-- 0020: direct referral requests ---------------------------------------------
drop policy if exists referral_direct_insert on public.referral_direct_requests;
create policy referral_direct_insert on public.referral_direct_requests
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and seeker_id = app.current_user_id()
    and public.accepts_referrals_at(insider_id, company_id)
  );

-- 0021: blocks, reports, per-chat prefs ---------------------------------------
drop policy if exists member_blocks_insert on public.member_blocks;
create policy member_blocks_insert on public.member_blocks
  for insert to app_authenticated
  with check (public.is_active_member() and blocker_id = app.current_user_id());

drop policy if exists member_reports_insert on public.member_reports;
create policy member_reports_insert on public.member_reports
  for insert to app_authenticated
  with check (public.is_active_member() and reporter_id = app.current_user_id());

drop policy if exists member_chat_prefs_own on public.member_chat_prefs;
create policy member_chat_prefs_own on public.member_chat_prefs
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (
    public.is_active_member()
    and member_id = app.current_user_id()
    and public.is_member_convo_participant(conversation_id)
  );

-- 0021: global chat settings --------------------------------------------------
drop policy if exists member_chat_settings_own on public.member_chat_settings;
create policy member_chat_settings_own on public.member_chat_settings
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (public.is_active_member() and member_id = app.current_user_id());

-- 0022: reactions -------------------------------------------------------------
drop policy if exists member_reactions_write on public.member_message_reactions;
create policy member_reactions_write on public.member_message_reactions
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (
    public.is_active_member()
    and member_id = app.current_user_id()
    and public.is_member_convo_participant(
      (select conversation_id from public.member_messages m where m.id = message_id)
    )
  );
