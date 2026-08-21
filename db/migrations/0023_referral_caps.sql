-- ============================================================================
-- 0023 — Referral request caps (owner's spec)
--
--  - A seeker may create at most 2 referral requests per rolling 7 days.
--  - (The companion product rule — at most 2 people selectable per send —
--    is the same cap seen from the picker: 2 rows is 2 rows.)
--
-- Enforced by trigger, not just the app: every Server Action is a public
-- endpoint, so a limit that matters must live where it cannot be skipped.
-- ============================================================================

create or replace function public.enforce_referral_weekly_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.referral_direct_requests
       where seeker_id = new.seeker_id
         and created_at > now() - interval '7 days') >= 2 then
    raise exception 'weekly referral request limit reached';
  end if;
  return new;
end;
$$;

drop trigger if exists referral_weekly_cap on public.referral_direct_requests;
create trigger referral_weekly_cap
  before insert on public.referral_direct_requests
  for each row execute function public.enforce_referral_weekly_cap();
