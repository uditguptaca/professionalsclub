-- ============================================================================
-- 0020 — Fix: seekers could never create a direct referral request
--
-- The 0018 insert policy checked company_insiders inline, but that table is
-- self-only under RLS, so the EXISTS was always false for a seeker. The
-- check moves into a SECURITY DEFINER helper — the same trick the insider
-- directory view relies on — asking exactly one question: has this person
-- opted into referring at this company?
-- ============================================================================

create or replace function public.accepts_referrals_at(insider uuid, company uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.company_insiders ci
     where ci.member_id = insider and ci.company_id = company and ci.can_refer
  );
$$;

drop policy if exists referral_direct_insert on public.referral_direct_requests;
create policy referral_direct_insert on public.referral_direct_requests
  for insert to app_authenticated
  with check (
    seeker_id = app.current_user_id()
    and public.accepts_referrals_at(insider_id, company_id)
  );
