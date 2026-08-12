-- =============================================================================
-- 0000_neon_roles.sql — Request identity and least-privilege roles
--
-- Run this FIRST, and after enabling Neon Auth on the project (so that the
-- neon_auth schema exists).
--
-- Why this file exists
-- --------------------
-- On Supabase, the browser talks to Postgres directly and the connection
-- carries the end user's JWT, so `auth.uid()` is meaningful and RLS is the only
-- thing standing between a user and the data.
--
-- Here, the browser never touches Postgres. Next.js holds the connection and
-- authorization lives in the server data-access layer. RLS is kept underneath
-- it as a second, independent layer — but for RLS to apply at all, two things
-- have to be true on every request-scoped query:
--
--   1. The connected role must not own the tables. A table owner bypasses RLS
--      unless the table is marked FORCE, and Neon's default role owns
--      everything created by these migrations. Hence app_authenticated.
--   2. The database must know which user the request is for. There is no JWT on
--      the connection, so the server sets it per transaction and
--      app.current_user_id() reads it back.
--
-- Both are done by withUser() in src/server/db/client.ts. If that helper is
-- bypassed, queries run as the owner with RLS off — which is exactly why the
-- repositories are the only place allowed to open a connection.
-- =============================================================================

create schema if not exists app;

-- -----------------------------------------------------------------------------
-- Request identity.
--
-- `app.user_id` is set with set_config(..., true) so it is scoped to the
-- transaction and cannot leak into the next request that reuses the pooled
-- connection. Missing or empty reads as NULL, so a policy comparing against it
-- matches nothing — the safe direction to fail.
-- -----------------------------------------------------------------------------

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

-- -----------------------------------------------------------------------------
-- Roles.
--
-- NOLOGIN on purpose: nothing connects as these directly. The server connects
-- as the owner and drops into one of them for the duration of a transaction, so
-- there is no second password to store or rotate.
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_authenticated') then
    create role app_authenticated nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'app_anonymous') then
    create role app_anonymous nologin;
  end if;
end;
$$;

-- The migration-running role must be a member of both to be able to SET ROLE
-- into them. `current_user` keeps this portable across Neon role names
-- (neondb_owner and friends).
do $$
begin
  execute format('grant app_authenticated to %I', current_user);
  execute format('grant app_anonymous to %I', current_user);
exception
  when duplicate_object then null;
end;
$$;

grant usage on schema app to app_authenticated, app_anonymous;
grant execute on function app.current_user_id() to app_authenticated, app_anonymous;

-- Read access to the identity table, so profile joins and the admin member list
-- can resolve names. Neon owns this schema; only ever read from it.
grant usage on schema neon_auth to app_authenticated;
