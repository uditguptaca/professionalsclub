-- ============================================================================
-- 0033 — Retire notify_user()
--
-- 0031 revoked this from app_authenticated and thought that closed it. It did
-- not: Postgres grants EXECUTE on a new function to PUBLIC, and
-- app_authenticated inherits that, so has_function_privilege still said yes.
-- A member could still write any notification, with any title and any link, to
-- any other member.
--
-- Rather than chase the grant, drop the function. 0032 re-pointed every
-- remaining caller at notify_member(), and nothing in src/ ever called it, so
-- it is dead weight that happens to be shaped like a phishing endpoint.
-- ============================================================================

drop function if exists public.notify_user(uuid, text, text, text, text, jsonb);

-- Same default-PUBLIC grant applies to the new notifier. 0031 revoked it from
-- public already; this is here so a fresh replay cannot end up otherwise.
revoke all on function public.notify_member(uuid, text, text, text, text, text, uuid, text, jsonb) from public;
