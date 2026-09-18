-- ============================================================================
-- 0056: take back the curator flag the signup form handed out
--
-- 0055 closed the door (create_profile no longer writes is_volunteer) and
-- tried to revoke the flag from the accounts that only had it because of the
-- form. That UPDATE ran as the table owner with no app.user_id, so
-- guard_profile_privileges - which pins is_volunteer for anyone who is not an
-- admin - quietly put the old value back. The guard is right to; a migration
-- is the one caller allowed past it, so it steps around the trigger for the
-- duration of this statement.
-- ============================================================================

alter table public.profiles disable trigger profiles_guard_privileges;

update public.profiles p
   set is_volunteer = false
 where p.is_volunteer
   and p.role <> 'admin'
   and not exists (
     select 1 from public.volunteer_applications v
      where v.member_id = p.id and v.status = 'approved'
   );

alter table public.profiles enable trigger profiles_guard_privileges;
