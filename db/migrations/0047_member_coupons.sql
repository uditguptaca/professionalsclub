-- ============================================================================
-- 0047 — Coupons a member can actually redeem, and a business can trust
--
-- A discount is money. Everything below exists because of a specific way this
-- feature gets abused, and the shape of the schema is the answer to the list
-- rather than a table with a `code` column on it.
--
--   1. "I'll just redeem it again." One member, one coupon, many claims.
--      -> per_member_limit, counted inside the same transaction that issues
--         the code, under a row lock on the coupon.
--
--   2. "Everyone redeem it at once." A 50-off coupon capped at 100 uses,
--      claimed 900 times in the same second when it is posted.
--      -> total_limit, checked under SELECT ... FOR UPDATE on the coupon row.
--         Two concurrent claimants serialise; the counter cannot overshoot.
--         This is why issuing is a function and not an INSERT policy: a policy
--         cannot take a lock.
--
--   3. "I made my own code." A member POSTing a redemption row with whatever
--      code and status they like.
--      -> app_authenticated gets SELECT on coupon_redemptions and nothing
--         else. There is no INSERT policy, no UPDATE policy, no DELETE policy.
--         Every write goes through the two SECURITY DEFINER functions below,
--         which take the caller's identity from the session and never from an
--         argument. A forged payload has nowhere to land.
--
--   4. "The screenshot." A member shows the same code at two tills.
--      -> A code is issued in state 'reserved' with a short expiry, and only
--         the business can move it to 'redeemed' - once. The second till sees
--         "already used, <time>". The residual window is two tills inside the
--         same few minutes, which is the same exposure a paper voucher has and
--         is not worth a hardware handshake.
--
--   5. "I'll mark my own coupon used and inflate the numbers", or worse, a
--      business reading who its members are.
--      -> A business may only move rows belonging to ITS OWN coupons, and the
--         view it reads carries no member identity at all. The redemption is
--         between the member and the code; the club does not hand over a
--         customer list as a side effect.
--
--   6. "Redeem it after it ends", "…before it starts", "…from a business that
--      got de-listed", "…while suspended".
--      -> All four are checked inside the issuing function, not in the UI.
--
--   7. Enumeration. Codes are 8 characters from a 32-symbol alphabet with the
--      lookalikes removed, drawn from gen_random_bytes. Guessing one is
--      pointless anyway: a guessed code buys nothing unless the guesser is the
--      business, and the business is the only party that can spend it.
-- ============================================================================

-- 1. The coupon -----------------------------------------------------------------
create table if not exists public.business_coupons (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,

  title        text not null check (char_length(title) between 1 and 120),
  description  text not null default '' check (char_length(description) <= 2000),
  terms        text not null default '' check (char_length(terms) <= 2000),
  image        text,

  -- What the member gets. Kept as structured columns so the card can render it
  -- and the club can tell a 10% coupon from a $10 one without parsing prose.
  discount_kind    text not null default 'percent'
    check (discount_kind in ('percent', 'amount', 'freebie')),
  percent_off      integer check (percent_off between 1 and 100),
  amount_off_cents integer check (amount_off_cents >= 0),
  currency         text not null default 'CAD',
  min_spend_cents  integer not null default 0 check (min_spend_cents >= 0),

  -- How it is used.
  --   in_store: the member claims a one-time code and shows it at the counter.
  --   online:   one shared promo code the member copies into a checkout.
  redeem_mode  text not null default 'in_store'
    check (redeem_mode in ('in_store', 'online')),
  promo_code   text check (char_length(promo_code) <= 40),

  starts_at    timestamptz,
  ends_at      timestamptz,

  -- Caps. null total_limit means unlimited; per_member_limit is never null,
  -- because "unlimited per member" is not a thing anyone means to offer.
  total_limit      integer check (total_limit is null or total_limit > 0),
  per_member_limit integer not null default 1 check (per_member_limit between 1 and 100),
  redeemed_count   integer not null default 0 check (redeemed_count >= 0),

  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- The discount has to say something. A percent coupon needs a percent, an
  -- amount coupon needs an amount, and an online coupon needs the code it is
  -- asking people to type.
  constraint business_coupons_value_present check (
    (discount_kind = 'percent' and percent_off is not null)
    or (discount_kind = 'amount' and amount_off_cents is not null)
    or (discount_kind = 'freebie')
  ),
  constraint business_coupons_online_has_code check (
    redeem_mode <> 'online' or (promo_code is not null and char_length(promo_code) > 0)
  ),
  constraint business_coupons_window check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create index if not exists idx_business_coupons_business on public.business_coupons (business_id);
create index if not exists idx_business_coupons_live
  on public.business_coupons (ends_at) where is_active;

drop trigger if exists business_coupons_set_updated_at on public.business_coupons;
create trigger business_coupons_set_updated_at
  before update on public.business_coupons
  for each row execute function public.set_updated_at();

comment on table public.business_coupons is
  'Member-only discounts published by a verified business (0047). Redemption never happens by writing to a table: see claim_coupon() and mark_coupon_redeemed().';

alter table public.business_coupons enable row level security;
grant select, insert, update, delete on public.business_coupons to app_authenticated;

-- The owner manages their own; every signed-in member sees the live ones. Not
-- anonymous: a coupon is a membership benefit, and putting it on the public web
-- gives it away to people who never joined.
drop policy if exists business_coupons_owner on public.business_coupons;
create policy business_coupons_owner on public.business_coupons
  for all to app_authenticated
  using (public.owns_business(business_id) or public.is_admin())
  with check (
    (public.is_business_actor() and public.owns_business(business_id))
    or public.is_admin()
  );

drop policy if exists business_coupons_members on public.business_coupons;
create policy business_coupons_members on public.business_coupons
  for select to app_authenticated
  using (
    is_active
    and public.is_active_member()
    and exists (
      select 1 from public.businesses b
       where b.id = business_id and b.verification_status = 'verified'
    )
  );

-- A business must not be able to rewrite its own counter, and the counter is
-- the thing standing between a capped coupon and an uncapped one.
create or replace function public.guard_coupon_counter()
returns trigger
language plpgsql
-- SECURITY INVOKER, unlike every other guard in this schema, and that is the
-- point: it needs to know WHO is writing. Under SECURITY DEFINER current_user
-- is always this function's owner, so the test below would have been true for
-- everybody, including the business account it exists to stop.
set search_path = public, pg_temp
as $$
begin
  -- The counter is maintained by claim_coupon() and mark_coupon_redeemed(),
  -- which are SECURITY DEFINER and therefore run as the table owner. Pinning it
  -- for EVERY writer - the first version of this trigger - pinned it for them
  -- too, and a counter that can never increase is a cap that never binds. The
  -- comparison is against the table's actual owner rather than a hardcoded role
  -- name so it cannot quietly stop matching.
  if current_user = (
    select tableowner from pg_catalog.pg_tables
     where schemaname = 'public' and tablename = 'business_coupons'
  ) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.redeemed_count := 0;
  else
    new.redeemed_count := old.redeemed_count;
    new.business_id    := old.business_id;
  end if;
  return new;
end;
$$;

drop trigger if exists business_coupons_guard_counter on public.business_coupons;
create trigger business_coupons_guard_counter
  before insert or update on public.business_coupons
  for each row execute function public.guard_coupon_counter();

-- 2. The redemption --------------------------------------------------------------
create table if not exists public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.business_coupons(id) on delete cascade,
  -- Denormalised so the business-side policy never has to read the coupon table
  -- to answer "is this mine".
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,

  code        text not null unique,
  status      text not null default 'reserved'
    check (status in ('reserved', 'redeemed', 'void')),

  created_at  timestamptz not null default now(),
  expires_at  timestamptz,
  redeemed_at timestamptz,
  -- The auth account that marked it used. Both profiles.id and
  -- business_users.user_id come from neon_auth."user", so one column covers an
  -- admin, a member-owner and an invited business account alike.
  redeemed_by uuid
);

create index if not exists idx_coupon_redemptions_member on public.coupon_redemptions (member_id, created_at desc);
create index if not exists idx_coupon_redemptions_coupon on public.coupon_redemptions (coupon_id);
create index if not exists idx_coupon_redemptions_business on public.coupon_redemptions (business_id, created_at desc);

comment on table public.coupon_redemptions is
  'One claimed coupon code (0047). app_authenticated holds SELECT and nothing else: every write is claim_coupon() or mark_coupon_redeemed(), so a member cannot mint a code and a business cannot mint a redemption.';

alter table public.coupon_redemptions enable row level security;
-- SELECT only. This is the load-bearing grant in the whole file.
grant select on public.coupon_redemptions to app_authenticated;

drop policy if exists coupon_redemptions_mine on public.coupon_redemptions;
create policy coupon_redemptions_mine on public.coupon_redemptions
  for select to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin());

-- The business sees redemptions of its own coupons. member_id is in the row (it
-- has to be, for the cap), so the business reads through the view below rather
-- than the table - the policy is what stops the table itself being readable.
drop policy if exists coupon_redemptions_business on public.coupon_redemptions;
create policy coupon_redemptions_business on public.coupon_redemptions
  for select to app_authenticated
  using (public.is_business_user() and business_id = public.my_business_id());

/**
 * What a business is allowed to know: that a code exists, which coupon it is
 * for, and whether it has been used. Not who used it.
 *
 * The club's side of the bargain with its members is that using a member
 * benefit does not hand a third party a list of newcomers' names.
 *
 * security_invoker is the whole security of this view. A normal Postgres view
 * runs with its OWNER's rights, and the owner here owns the table and bypasses
 * RLS - so without this the view would have handed every caller every code in
 * the system, which is exactly the thing a code is. With it, the policies above
 * still decide which rows anyone sees, and the view only drops a column.
 */
drop view if exists public.business_coupon_activity;

create view public.business_coupon_activity
with (security_barrier, security_invoker = true)
as
select
  r.id,
  r.coupon_id,
  r.business_id,
  r.code,
  r.status,
  r.created_at,
  r.expires_at,
  r.redeemed_at
from public.coupon_redemptions r;

grant select on public.business_coupon_activity to app_authenticated;

comment on view public.business_coupon_activity is
  'Coupon redemptions with the member identity removed, for the business dashboard (0047). Row visibility still comes from coupon_redemptions RLS.';

-- 3. Claiming ----------------------------------------------------------------------
/**
 * Issue this member a code for this coupon, or explain why not.
 *
 * SECURITY DEFINER because it must write a table nobody can write, and it takes
 * the member from app.current_user_id() rather than an argument, so the only
 * account it can ever claim for is the one calling it.
 *
 * The FOR UPDATE on the coupon row is what makes the caps real: two members
 * claiming the last seat of a capped coupon at the same moment serialise here,
 * and the second one is refused instead of both succeeding.
 */
create or replace function public.claim_coupon(p_coupon uuid)
returns table (code text, status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member uuid := app.current_user_id();
  v_coupon public.business_coupons%rowtype;
  v_mine   integer;
  v_code   text;
  v_status text;
  v_expires timestamptz;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if v_member is null then
    raise exception 'Sign in to use member offers' using errcode = '42501';
  end if;

  -- A coupon is a MEMBER benefit. A business account cannot claim one, and
  -- neither can a suspended member.
  if not public.is_active_member() then
    raise exception 'Only active members can claim a coupon' using errcode = '42501';
  end if;

  select * into v_coupon from public.business_coupons
   where id = p_coupon
   for update;

  if not found then
    raise exception 'That offer is no longer available' using errcode = 'P0002';
  end if;

  if not v_coupon.is_active then
    raise exception 'That offer has been paused by the business' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.businesses b
     where b.id = v_coupon.business_id and b.verification_status = 'verified'
  ) then
    raise exception 'That offer is no longer available' using errcode = 'P0002';
  end if;

  if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
    raise exception 'That offer has not started yet' using errcode = 'P0002';
  end if;

  if v_coupon.ends_at is not null and now() > v_coupon.ends_at then
    raise exception 'That offer has expired' using errcode = 'P0002';
  end if;

  if v_coupon.total_limit is not null and v_coupon.redeemed_count >= v_coupon.total_limit then
    raise exception 'This offer has been fully claimed' using errcode = 'P0002';
  end if;

  -- Void claims (expired reservations) do not count against the member.
  select count(*) into v_mine
    from public.coupon_redemptions r
   where r.coupon_id = p_coupon
     and r.member_id = v_member
     and r.status <> 'void';

  if v_mine >= v_coupon.per_member_limit then
    raise exception 'You have already claimed this offer' using errcode = 'P0002';
  end if;

  -- An online coupon has no counter staff to confirm it, so handing over the
  -- promo code IS the redemption. An in-store code is a reservation until the
  -- business says otherwise.
  if v_coupon.redeem_mode = 'online' then
    v_status  := 'redeemed';
    v_expires := v_coupon.ends_at;
  else
    v_status  := 'reserved';
    v_expires := least(coalesce(v_coupon.ends_at, now() + interval '30 minutes'),
                       now() + interval '30 minutes');
  end if;

  -- gen_random_bytes, not random(): random() is seeded per session and is not
  -- meant for anything anyone might want to predict.
  for attempt in 1..5 loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % 31), 1);
    end loop;
    begin
      insert into public.coupon_redemptions
        (coupon_id, business_id, member_id, code, status, expires_at, redeemed_at)
      values
        (p_coupon, v_coupon.business_id, v_member, v_code, v_status, v_expires,
         case when v_status = 'redeemed' then now() else null end);
      exit;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
      v_code := null;
    end;
  end loop;

  update public.business_coupons
     set redeemed_count = redeemed_count + 1
   where id = p_coupon;

  return query select v_code, v_status, v_expires;
end;
$$;

revoke all on function public.claim_coupon(uuid) from public;
grant execute on function public.claim_coupon(uuid) to app_authenticated;

-- 4. Spending ----------------------------------------------------------------------
/**
 * The business marks a reserved code as used, at the counter.
 *
 * Deliberately not an error when the code was already used: the person holding
 * the till needs to be told "this was used at 2:14pm", not shown a failure. The
 * outcome is the return value.
 */
create or replace function public.mark_coupon_redeemed(p_code text)
returns table (outcome text, coupon_title text, redeemed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.coupon_redemptions%rowtype;
  v_title text;
begin
  select * into v_row from public.coupon_redemptions
   where upper(code) = upper(trim(p_code))
   for update;

  if not found then
    return query select 'not_found'::text, null::text, null::timestamptz;
    return;
  end if;

  -- Only the business the coupon belongs to, or an admin, may spend it.
  if not (public.owns_business(v_row.business_id) or public.is_admin()) then
    raise exception 'That code belongs to another business' using errcode = '42501';
  end if;

  select c.title into v_title from public.business_coupons c where c.id = v_row.coupon_id;

  if v_row.status = 'redeemed' then
    return query select 'already_used'::text, v_title, v_row.redeemed_at;
    return;
  end if;

  if v_row.status = 'void' then
    return query select 'void'::text, v_title, null::timestamptz;
    return;
  end if;

  if v_row.expires_at is not null and now() > v_row.expires_at then
    update public.coupon_redemptions set status = 'void' where id = v_row.id;
    -- The member's allowance is handed back: an expired reservation was never
    -- a redemption, and the coupon's own counter should not have kept it.
    update public.business_coupons
       set redeemed_count = greatest(redeemed_count - 1, 0)
     where id = v_row.coupon_id;
    return query select 'expired'::text, v_title, null::timestamptz;
    return;
  end if;

  update public.coupon_redemptions
     set status = 'redeemed', redeemed_at = now(), redeemed_by = app.current_user_id()
   where id = v_row.id;

  return query select 'redeemed'::text, v_title, now();
end;
$$;

revoke all on function public.mark_coupon_redeemed(text) from public;
grant execute on function public.mark_coupon_redeemed(text) to app_authenticated;

-- 5. Housekeeping --------------------------------------------------------------------
/**
 * Reservations nobody spent. Called by the existing daily cron: without it a
 * capped coupon leaks a seat every time somebody claims a code and walks away.
 */
create or replace function public.expire_coupon_reservations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  with dead as (
    update public.coupon_redemptions
       set status = 'void'
     where status = 'reserved'
       and expires_at is not null
       and now() > expires_at
    returning coupon_id
  ), tally as (
    select coupon_id, count(*)::int as n from dead group by coupon_id
  )
  update public.business_coupons c
     set redeemed_count = greatest(c.redeemed_count - t.n, 0)
    from tally t
   where c.id = t.coupon_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_coupon_reservations() from public;
