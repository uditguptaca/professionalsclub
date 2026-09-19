-- ============================================================================
-- 0058: bounds on the free text that becomes a title, and no writes from a
-- suspended account
--
-- Round 3 stored a 200,032-character first name and a 500,000-character
-- summary through the profile form with every guard active. A member's name
-- is the in-app notification title, the FCM notification title and the mail
-- subject for everything that names them; FCM refuses a payload over 4 KB, so
-- one oversized name silently kills the push for everyone it reaches.
-- The constraints are NOT VALID so an existing long row (there is none today)
-- would not block the migration; every new write is checked.
-- ============================================================================

alter table public.profiles drop constraint if exists profiles_text_lengths;
alter table public.profiles add constraint profiles_text_lengths check (
  char_length(coalesce(first_name, '')) <= 80
  and char_length(coalesce(last_name, '')) <= 80
  and char_length(coalesce(job_title, '')) <= 120
  and char_length(coalesce(company, '')) <= 120
  and char_length(coalesce(professional_summary, '')) <= 5000
  and char_length(coalesce(linkedin_url, '')) <= 2000
) not valid;

alter table public.matrimony_profiles drop constraint if exists matrimony_profiles_text_lengths;
alter table public.matrimony_profiles add constraint matrimony_profiles_text_lengths check (
  char_length(coalesce(full_name, '')) <= 120
  and char_length(coalesce(about_me, '')) <= 5000
  and char_length(coalesce(family_about, '')) <= 5000
) not valid;

alter table public.events drop constraint if exists events_text_lengths;
alter table public.events add constraint events_text_lengths check (
  char_length(coalesce(title, '')) <= 200
  and char_length(coalesce(description, '')) <= 20000
  and char_length(coalesce(location, '')) <= 500
) not valid;

-- A suspended member could still UPDATE their own profiles row under RLS, and
-- for the seconds the app's profile cache lags a suspension that was a live
-- write path. The self-archive transition needs an active account anyway.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to app_authenticated
  using ((id = app.current_user_id() and public.is_active_member()) or public.is_admin())
  with check ((id = app.current_user_id() and public.is_active_member()) or public.is_admin());
