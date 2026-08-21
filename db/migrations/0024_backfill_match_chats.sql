-- ============================================================================
-- 0024 — Backfill chats for matches made before the chat merge
--
-- 0018 moved matrimony conversation to the member chat hub, but only NEW
-- matches created a member_conversations row: pairs who matched earlier had an
-- accepted interest and no thread, so "Message" led nowhere.
--
-- Legacy matrimony_messages are deliberately NOT copied across. They were
-- encrypted with keys salted by matrimony profile ids; re-homing them under
-- user-id salts would leave ciphertext nobody can read. The threads are
-- created so the pair can talk from now on, and the old rows stay where they
-- are rather than becoming unreadable noise in a fresh chat.
-- ============================================================================

insert into public.member_conversations (member_a_id, member_b_id)
select least(sp.user_id, rp.user_id), greatest(sp.user_id, rp.user_id)
  from public.matrimony_interests i
  join public.matrimony_profiles sp on sp.id = i.sender_profile_id
  join public.matrimony_profiles rp on rp.id = i.receiver_profile_id
 where i.status = 'accepted'
   and sp.user_id <> rp.user_id
group by 1, 2
on conflict (member_a_id, member_b_id) do nothing;
