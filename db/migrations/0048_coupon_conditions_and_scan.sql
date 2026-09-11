-- ============================================================================
-- 0048 — The conditions a business sets, and the two-party scan
--
-- 0047 built redemption as "the member claims a code, the business spends it".
-- This turns the spending half into a scan and makes the business's own
-- conditions do the limiting, which is what they are for.
--
-- WHAT MOVES INTO THE DATABASE. Two conditions a business kept writing into
-- the terms text, where nothing could enforce them:
--
--   valid_days    which days of the week the offer runs. "Weekdays only" was
--                 previously a sentence the counter staff had to remember; now
--                 a Saturday scan is refused by the function, and the member
--                 is told before they walk over.
--   cooldown_days how long before the same member may claim again. The
--                 per-member cap is a lifetime number, which cannot say "once
--                 a month" - the offer businesses actually want to run.
--
-- WHAT DELIBERATELY STAYS HUMAN. Minimum spend cannot be verified by software
-- that never sees the bill, so it is not pretended: it is shown large on the
-- scan result, next to the terms, at the exact moment the person at the till
-- is deciding. Enforcement there is a human reading a condition, which is
-- honest, rather than a checkbox that means nothing.
--
-- THE STUCK RESERVATION, which the QR flow makes common. A code is reserved
-- for thirty minutes. A member who claims one at home and arrives an hour
-- later had, until now, burned their only allowance on a code that no longer
-- works - the row still counted against per_member_limit. claim_coupon now
-- clears the caller's OWN expired reservations for that coupon first, hands
-- the seat back, and issues a fresh code. Showing the QR again is free; only
-- a scan spends anything.
-- ============================================================================

alter table public.business_coupons
  add column if not exists valid_days    smallint[] not null default '{}',
  add column if not exists cooldown_days integer not null default 0
    check (cooldown_days between 0 and 365);

comment on column public.business_coupons.valid_days is
  'Days of the week this offer can be redeemed, 0 = Sunday .. 6 = Saturday. Empty means any day. Enforced at scan time by mark_coupon_redeemed (0048).';
comment on column public.business_coupons.cooldown_days is
  'How long a member must wait before claiming this offer again. 0 means no wait. Works with per_member_limit, which is a lifetime count.';

-- Guard it the same way the counter is guarded: valid_days is a set of
-- weekdays and nothing else, whatever an API caller sends.
alter table public.business_coupons
  drop constraint if exists business_coupons_valid_days;
alter table public.business_coupons
  add constraint business_coupons_valid_days check (
    valid_days <@ array[0,1,2,3,4,5,6]::smallint[]
  );

-- ---------------------------------------------------------------------------
-- 1. Claiming, with the conditions and the self-healing reservation
-- ---------------------------------------------------------------------------
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
  v_last   timestamptz;
  v_freed  integer;
  v_code   text;
  v_status text;
  v_expires timestamptz;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if v_member is null then
    raise exception 'Sign in to use member offers' using errcode = '42501';
  end if;

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

  -- Hand back this member's own dead reservations before counting anything.
  -- Without this, one unused code locks them out of the offer for good.
  -- Aliased, and every column qualified: this function RETURNS columns called
  -- status and expires_at, so the unqualified names are ambiguous between the
  -- output parameters and the table.
  update public.coupon_redemptions r
     set status = 'void'
   where r.coupon_id = p_coupon
     and r.member_id = v_member
     and r.status = 'reserved'
     and r.expires_at is not null
     and now() > r.expires_at;
  get diagnostics v_freed = row_count;

  if v_freed > 0 then
    update public.business_coupons
       set redeemed_count = greatest(redeemed_count - v_freed, 0)
     where id = p_coupon;
    -- Re-read: the cap check below has to see the seats we just returned.
    select * into v_coupon from public.business_coupons where id = p_coupon for update;
  end if;

  if v_coupon.total_limit is not null and v_coupon.redeemed_count >= v_coupon.total_limit then
    raise exception 'This offer has been fully claimed' using errcode = 'P0002';
  end if;

  select count(*), max(created_at) into v_mine, v_last
    from public.coupon_redemptions r
   where r.coupon_id = p_coupon
     and r.member_id = v_member
     and r.status <> 'void';

  if v_mine >= v_coupon.per_member_limit then
    raise exception 'You have already claimed this offer' using errcode = 'P0002';
  end if;

  if v_coupon.cooldown_days > 0 and v_last is not null
     and now() < v_last + (v_coupon.cooldown_days || ' days')::interval then
    raise exception 'You can use this offer again on %',
      to_char(v_last + (v_coupon.cooldown_days || ' days')::interval, 'FMMon FMDD')
      using errcode = 'P0002';
  end if;

  if v_coupon.redeem_mode = 'online' then
    v_status  := 'redeemed';
    v_expires := v_coupon.ends_at;
  else
    v_status  := 'reserved';
    v_expires := least(coalesce(v_coupon.ends_at, now() + interval '30 minutes'),
                       now() + interval '30 minutes');
  end if;

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

-- ---------------------------------------------------------------------------
-- 2. The scan
--
-- Same function the typed code always used - a camera is a faster keyboard,
-- not a different trust model. What changes is what comes back: the person at
-- the till needs to see WHAT they just accepted and WHICH conditions they are
-- responsible for, in the second between the beep and handing over a discount.
-- ---------------------------------------------------------------------------
-- The return type gains columns, which Postgres will not do in place.
drop function if exists public.mark_coupon_redeemed(text);

create function public.mark_coupon_redeemed(p_code text)
returns table (
  outcome          text,
  coupon_title     text,
  redeemed_at      timestamptz,
  discount_kind    text,
  percent_off      integer,
  amount_off_cents integer,
  currency         text,
  min_spend_cents  integer,
  terms            text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.coupon_redemptions%rowtype;
  v_c   public.business_coupons%rowtype;
  v_today smallint := extract(dow from now())::smallint;
begin
  select * into v_row from public.coupon_redemptions
   where upper(code) = upper(trim(p_code))
   for update;

  if not found then
    return query select 'not_found'::text, null::text, null::timestamptz,
                        null::text, null::integer, null::integer, null::text,
                        null::integer, null::text;
    return;
  end if;

  -- Somebody else's code is, from this till's point of view, not a code. The
  -- earlier version raised here, which turned an ordinary counter moment (a
  -- member shows the coupon from the shop next door) into an error the app had
  -- to translate, and told the scanner that the code exists somewhere. Same
  -- refusal, nothing leaked, no exception path.
  if not (public.owns_business(v_row.business_id) or public.is_admin()) then
    return query select 'not_found'::text, null::text, null::timestamptz,
                        null::text, null::integer, null::integer, null::text,
                        null::integer, null::text;
    return;
  end if;

  select * into v_c from public.business_coupons where id = v_row.coupon_id;

  if v_row.status = 'redeemed' then
    return query select 'already_used'::text, v_c.title, v_row.redeemed_at,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  if v_row.status = 'void' then
    return query select 'void'::text, v_c.title, null::timestamptz,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  if v_row.expires_at is not null and now() > v_row.expires_at then
    update public.coupon_redemptions set status = 'void' where id = v_row.id;
    update public.business_coupons
       set redeemed_count = greatest(redeemed_count - 1, 0)
     where id = v_row.coupon_id;
    return query select 'expired'::text, v_c.title, null::timestamptz,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  -- The business's own conditions, checked at the moment of use rather than
  -- at the moment of claiming: a coupon claimed on Friday for a weekdays-only
  -- offer must not go through on Saturday.
  if array_length(v_c.valid_days, 1) is not null and not (v_today = any(v_c.valid_days)) then
    return query select 'wrong_day'::text, v_c.title, null::timestamptz,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  if not v_c.is_active then
    return query select 'paused'::text, v_c.title, null::timestamptz,
                        v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                        v_c.currency, v_c.min_spend_cents, v_c.terms;
    return;
  end if;

  update public.coupon_redemptions
     set status = 'redeemed', redeemed_at = now(), redeemed_by = app.current_user_id()
   where id = v_row.id;

  return query select 'redeemed'::text, v_c.title, now(),
                      v_c.discount_kind, v_c.percent_off, v_c.amount_off_cents,
                      v_c.currency, v_c.min_spend_cents, v_c.terms;
end;
$$;

revoke all on function public.mark_coupon_redeemed(text) from public;
grant execute on function public.mark_coupon_redeemed(text) to app_authenticated;

comment on function public.mark_coupon_redeemed(text) is
  'Spend one claimed code, and tell the till what it just accepted (0047, extended 0048). Refuses a code belonging to another business, one already used, one expired, and one presented on a day the offer does not run.';
