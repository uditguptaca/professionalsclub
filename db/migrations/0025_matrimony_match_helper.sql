-- ============================================================================
-- 0025 — is_matrimony_match(): the label needs a definer, like the gate does
--
-- listChats labelled a thread "Matrimony match" with an inline EXISTS over
-- matrimony_profiles. That table is self-only under RLS (other members are
-- read through matrimony_visible_profiles), so inside a member's session the
-- peer's row was invisible and the EXISTS was always false: matches showed as
-- plain follows. Chat ACCESS was unaffected because is_chat_allowed is
-- SECURITY DEFINER — this is the same lesson as 0020, applied to the label.
-- ============================================================================

create or replace function public.is_matrimony_match(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.matrimony_profiles pa, public.matrimony_profiles pb
     where pa.user_id = a and pb.user_id = b
       and public.has_accepted_interest(pa.id, pb.id)
  );
$$;

-- The gate can now say what it means instead of repeating the subquery.
create or replace function public.is_chat_allowed(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not public.is_blocked_between_members(a, b)
     and (
       public.is_mutual_follow(a, b)
       or public.is_matrimony_match(a, b)
       or exists (
            select 1 from public.referral_direct_requests r
             where (r.seeker_id = a and r.insider_id = b)
                or (r.seeker_id = b and r.insider_id = a)
          )
     );
$$;
