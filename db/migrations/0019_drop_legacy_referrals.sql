-- ============================================================================
-- 0019 - DESTRUCTIVE: drop the retired anonymous referral fan-out
--
-- Separated from 0018 so the destructive step is applied deliberately. The
-- app stops using these objects at the same commit; existing rows in the
-- dropped tables are demo data only.
-- ============================================================================

----------------------------------------------
-- The views and tables of the broadcast model. Notifications already sent stay
-- in email_outbox history; companies / jobs / insiders all live on.
drop view if exists public.referral_inbox;
drop view if exists public.referral_helpers;
drop function if exists public.create_referral_request(uuid, uuid[], text, text);
drop function if exists public.respond_to_referral(uuid, boolean);
drop function if exists public.withdraw_own_referral_request(uuid);
-- Order matters: referral_request_jobs carries a policy that references
-- referral_recipients, so it goes first.
drop table if exists public.referral_request_jobs;
drop table if exists public.referral_recipients;
drop table if exists public.referral_requests;
drop function if exists public.can_see_referral_request(uuid);
