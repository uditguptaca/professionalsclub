-- =============================================================================
-- 0004_bootstrap_admin.sql — Promote the first admin
--
-- Run this LAST, and only after the account exists.
--
-- There is deliberately no "insert an admin user" statement here. Creating an
-- neon_auth user row by hand means hand-writing a password hash and the identity
-- rows that go with it, and a mistake there produces an account that cannot log
-- in or, worse, one with a weak known secret committed to the repository.
--
-- Instead:
--   1. Sign up normally at /portal/signup, or create the user from the Neon
--      Console under Auth -> Users.
--   2. Put that email below.
--   3. Run this file.
--
-- Re-running is safe.
-- =============================================================================

do $$
declare
  -- >>> CHANGE THIS to the email of the account that should own the portal.
  v_admin_email text := 'admin@professionalsclub.ca';
  v_user_id uuid;
begin
  select id into v_user_id from neon_auth."user" where lower(email) = lower(v_admin_email);

  if v_user_id is null then
    raise exception
      'No auth user with email %. Create the account first (see the header of this file), then re-run.',
      v_admin_email;
  end if;

  -- The profile row normally arrives from the signup action, or from
  -- ensureProfile() on first sign-in. If the account was created in the Neon
  -- Console and has never signed in, create it now.
  insert into public.profiles (id, email, first_name, last_name)
  values (v_user_id, v_admin_email, 'Portal', 'Admin')
  on conflict (id) do nothing;

  -- guard_profile_privileges reverts any role change made by someone who is not
  -- already an admin. During a migration there is no request context at all, so
  -- is_admin() is false and the promotion below would be silently undone —
  -- the statement succeeds, the row does not change, and nothing reports an
  -- error. That is exactly the bootstrap problem: the first admin cannot be
  -- created by an admin.
  --
  -- So the guard is suspended for this one statement and restored immediately,
  -- including on failure. It is not weakened: no standing exemption is added,
  -- because an exemption for "no request context" would also cover
  -- withElevated(), which must never be able to grant a role.
  execute 'alter table public.profiles disable trigger profiles_guard_privileges';

  begin
    update public.profiles
       set role                = 'admin',
           account_status      = 'active',
           verification_status = 'verified'
     where id = v_user_id;
  exception
    when others then
      execute 'alter table public.profiles enable trigger profiles_guard_privileges';
      raise;
  end;

  execute 'alter table public.profiles enable trigger profiles_guard_privileges';

  raise notice 'Granted admin to % (%)', v_admin_email, v_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Verification. Every row should read `true`; anything false is a hole.
-- -----------------------------------------------------------------------------

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relrowsecurity asc, c.relname;
