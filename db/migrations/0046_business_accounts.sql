-- ============================================================================
-- 0046 — Business accounts: invited, not registered
--
-- A business owner gets their own login. The question that decides this whole
-- migration is what that account IS.
--
-- THE REJECTED ANSWER: a member profile with role = 'business'. It is the
-- smaller diff and it is wrong. Every read policy in this database is written
-- against public.profiles - the member directory (member_profiles), the
-- matrimony pool, event attendance, the people search - and most of them open
-- with public.is_active_member(), which asks only whether the caller has an
-- active profile row. Give a restaurant owner a profile and they are inside
-- the newcomers' community: names, cities, job titles, who attended what. The
-- only thing standing between them and that data would be a role check I would
-- have to remember to add in 220 places.
--
-- THE ANSWER HERE: a business account is an authenticated user with NO profile
-- row. It is not a member, so it is invisible to and blind to every rule that
-- keys off profiles, by construction rather than by a check somebody has to
-- remember. is_active_member() is false for them. is_admin() is false for
-- them. profiles_select shows them nothing because they own no row. They then
-- get back, explicitly and one at a time, only what a business needs: their
-- own business, its offers, its coupons, its events.
--
-- The cost of that choice, paid here: the three 0039 owner policies that said
-- is_active_member() have to say "an active member OR an active business
-- account", ownership has to resolve through business_users as well as
-- businesses.created_by, and public.profiles needs a trigger that refuses to
-- give a business account a member profile (the app back-fills a profile on any
-- session that lacks one, which would otherwise quietly promote every business
-- owner on their first login).
--
-- INVITE ONLY. There is no sign-up. A business applies through the public
-- form, which lands in the admin queue exactly as it does today; an admin who
-- verifies them issues an invite to an email address; the invite is a
-- single-use, expiring, 256-bit token stored as a HASH, so a leaked database
-- backup is not a set of working invitations. Member self-registration of a
-- business goes away with it - it was the other door into the same room.
-- ============================================================================

-- 1. The account ---------------------------------------------------------------
create table if not exists public.business_users (
  -- Same identity source as profiles.id: the auth account. A business account
  -- deliberately has no row in public.profiles.
  user_id     uuid primary key references neon_auth."user"(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  status      text not null default 'active' check (status in ('active', 'disabled')),
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists idx_business_users_business on public.business_users (business_id);

comment on table public.business_users is
  'A business owner login (0046). Intentionally NOT a member: no public.profiles row, so every member-facing policy is closed to it without needing a role check. Created only by accepting an admin invite.';

alter table public.business_users enable row level security;
grant select, update on public.business_users to app_authenticated;

-- Read your own row; admins read all. Creating one happens only by accepting an
-- invite, which is elevated server-side because the person doing it has no
-- session yet - so there is no INSERT policy here at all.
drop policy if exists business_users_select on public.business_users;
create policy business_users_select on public.business_users
  for select to app_authenticated
  using (user_id = app.current_user_id() or public.is_admin());

-- An admin can turn an account off. Nobody can turn one on for themselves.
drop policy if exists business_users_admin_update on public.business_users;
create policy business_users_admin_update on public.business_users
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. The invite ------------------------------------------------------------------
create table if not exists public.business_invites (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email       text not null,
  -- The token itself is shown once, in the email. Only its SHA-256 lives here.
  token_hash  text not null unique,
  invited_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_business_invites_business on public.business_invites (business_id);

comment on column public.business_invites.token_hash is
  'SHA-256 of the invite token. The token exists in the invitation email and nowhere else, so a copy of this table cannot be used to claim an account.';

alter table public.business_invites enable row level security;
grant select, insert, update on public.business_invites to app_authenticated;

-- Admins issue and revoke them. The invitee never reads this table: they have
-- no session at all until the invite has been accepted, so that path is
-- server-side and elevated, keyed by the token hash.
drop policy if exists business_invites_admin on public.business_invites;
create policy business_invites_admin on public.business_invites
  for all to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Who is a business account, and what do they own -----------------------------
/**
 * SECURITY DEFINER on purpose, twice over: it must answer for a caller who has
 * no profile (so nothing about it can lean on is_active_member), and it is used
 * inside policies ON the tables it reads, where a caller-rights function would
 * recurse.
 */
create or replace function public.is_business_user()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.business_users u
     where u.user_id = app.current_user_id() and u.status = 'active'
  );
$$;

create or replace function public.my_business_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.business_id from public.business_users u
   where u.user_id = app.current_user_id() and u.status = 'active'
   limit 1;
$$;

/**
 * The one definition of "this is my business", covering both owners:
 *   - the member who registered it before invites existed (businesses.created_by)
 *   - the invited business account (business_users)
 */
create or replace function public.owns_business(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_business is not null and (
    exists (
      select 1 from public.businesses b
       where b.id = p_business and b.created_by = app.current_user_id()
    )
    or exists (
      select 1 from public.business_users u
       where u.business_id = p_business
         and u.user_id = app.current_user_id()
         and u.status = 'active'
    )
  );
$$;

/**
 * "May write" for the business module: an active member who owns a business the
 * old way, or an active business account. This is what replaces the bare
 * is_active_member() in the 0039 owner policies - without it an invited
 * business owner can read their page and change nothing on it.
 */
create or replace function public.is_business_actor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_active_member() or public.is_business_user();
$$;

revoke all on function public.is_business_user() from public;
revoke all on function public.my_business_id() from public;
revoke all on function public.owns_business(uuid) from public;
revoke all on function public.is_business_actor() from public;
grant execute on function public.is_business_user()      to app_authenticated;
grant execute on function public.my_business_id()        to app_authenticated;
grant execute on function public.owns_business(uuid)     to app_authenticated;
grant execute on function public.is_business_actor()     to app_authenticated;

-- 4. The business page, its offers and its events, for both kinds of owner -------
drop policy if exists businesses_select_own on public.businesses;
create policy businesses_select_own on public.businesses
  for select to app_authenticated
  using (
    created_by = app.current_user_id()
    or public.is_admin()
    or id = public.my_business_id()
  );

drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses
  for update to app_authenticated
  using (public.owns_business(id) or public.is_admin())
  with check ((public.is_business_actor() and public.owns_business(id)) or public.is_admin());

-- Registration is now admin-only. The public application form still works: it
-- runs through submit_business_application(), a SECURITY DEFINER function that
-- holds no table grant of its own, and lands in the same review queue. What
-- goes away is a signed-in member creating a business row directly, which was
-- the second, unreviewed door into the directory.
drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses
  for insert to app_authenticated
  with check (public.is_admin());

drop policy if exists business_offers_owner on public.business_offers;
create policy business_offers_owner on public.business_offers
  for all to app_authenticated
  using (public.owns_business(business_id) or public.is_admin())
  with check (
    (public.is_business_actor() and public.owns_business(business_id))
    or public.is_admin()
  );

drop policy if exists events_owner_insert on public.events;
create policy events_owner_insert on public.events
  for insert to app_authenticated
  with check (
    public.is_business_actor()
    and business_id is not null
    and public.owns_business(business_id)
    and exists (
      select 1 from public.businesses b
       where b.id = business_id and b.verification_status = 'verified'
    )
  );

drop policy if exists events_owner_update on public.events;
create policy events_owner_update on public.events
  for update to app_authenticated
  using (business_id is not null and public.owns_business(business_id))
  with check (
    public.is_business_actor()
    and business_id is not null
    and public.owns_business(business_id)
    and exists (
      select 1 from public.businesses b
       where b.id = business_id and b.verification_status = 'verified'
    )
  );

drop policy if exists events_owner_delete on public.events;
create policy events_owner_delete on public.events
  for delete to app_authenticated
  using (business_id is not null and public.owns_business(business_id));

-- The owner's own drafts, now including the invited account's.
drop policy if exists events_mine_read on public.events;
create policy events_mine_read on public.events
  for select to app_authenticated
  using (
    (created_by is not null and created_by = app.current_user_id())
    or (business_id is not null and public.owns_business(business_id))
  );

-- 5. A business account must never become a member --------------------------------
/**
 * The app calls create_profile() on any authenticated session that has no
 * profile row, to back-fill social logins and half-finished signups. A business
 * account has no profile ON PURPOSE, so that back-fill would hand every
 * business owner a member account on their first login - and with it the member
 * directory this whole design exists to keep them out of.
 *
 * A trigger on profiles rather than a check inside create_profile(): this way
 * it covers every path into the table, including an admin creating a profile by
 * hand and any function written later, and it does not require re-stating a
 * forty-column insert that has nothing to do with the rule.
 */
create or replace function public.reject_business_account_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.business_users u where u.user_id = new.id) then
    raise exception 'This account is a business login and cannot hold a member profile'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_reject_business_account on public.profiles;
create trigger profiles_reject_business_account
  before insert on public.profiles
  for each row execute function public.reject_business_account_profile();

-- 6. Sending the invitation -------------------------------------------------------
/**
 * Queue the invitation email.
 *
 * email_outbox has no INSERT policy - every existing producer is a SECURITY
 * DEFINER trigger - so this is the same shape: definer, admin-checked inside,
 * fixed template, and it runs in the same transaction as the invite row so an
 * invitation cannot exist without its email or the other way round.
 *
 * Note what the payload holds: the accept link, and therefore the token. That
 * is the one copy of it outside the recipient's inbox. It is single use, it
 * expires in fourteen days, an admin can revoke it, and only admins can read
 * email_outbox - but it is worth knowing it is there.
 */
create or replace function public.queue_business_invite(
  p_email    text,
  p_business text,
  p_link     text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can invite a business' using errcode = '42501';
  end if;

  insert into public.email_outbox (to_address, template, payload)
  values (p_email, 'business_invite',
          jsonb_build_object('business', p_business, 'link', p_link));
end;
$$;

revoke all on function public.queue_business_invite(text, text, text) from public;
grant execute on function public.queue_business_invite(text, text, text) to app_authenticated;
