-- ============================================================================
-- 0026 — matrimony_owner(): map a matrimony profile to its member, safely
--
-- Found by audit. 0018 moved matrimony chat into the member hub by resolving
-- both matrimony profile ids to user ids with a plain query over
-- matrimony_profiles. That table is SELF-ONLY under RLS (other members are
-- read through matrimony_visible_profiles), so in a member session the pair
-- lookup returned ONE row — the caller's own:
--
--   * respondToInterest: pair.length === 2 was false, so accepting a match
--     silently created no chat at all.
--   * swipeRight: pair[1] was undefined, so the instant-match insert failed.
--
-- Third instance of this class (0020, 0025, now this), so the fix is the same
-- shape: a SECURITY DEFINER lookup that answers exactly one question.
-- ============================================================================

create or replace function public.matrimony_owner(profile uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select user_id from public.matrimony_profiles where id = profile;
$$;

-- Surface reduction: the retired matrimony chat tables (superseded by
-- member_conversations / member_messages in 0018) keep their rows for the
-- record but no longer need to be reachable by member sessions at all.
revoke select, insert, update on public.matrimony_conversations from app_authenticated;
revoke select, insert, update on public.matrimony_messages      from app_authenticated;
