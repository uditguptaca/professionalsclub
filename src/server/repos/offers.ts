import 'server-only';
import { withUser, withUserRead } from '@/server/db';
import { codeQr } from '@/server/qr';

/**
 * Member offers: the discounts a member can actually use.
 *
 * Two different things share the screen and should not be confused:
 *   - a COUPON is redeemable. The member claims a one-time code and shows it,
 *     or gets a promo code to type online. Claiming is public.claim_coupon(),
 *     never an insert, because the caps and the window have to be checked under
 *     a lock (0047).
 *   - an OFFER is an announcement ("15% off for members, mention the club").
 *     It has no code and nothing to spend.
 *
 * The member's own claimed codes come back with the coupon attached, because a
 * code with no context is useless at a till.
 */

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : ((v as string | null) ?? null);

export interface MemberCoupon {
  id: string;
  title: string;
  description: string;
  terms: string;
  image: string | null;
  discountKind: string;
  percentOff: number | null;
  amountOffCents: number | null;
  currency: string;
  minSpendCents: number;
  redeemMode: string;
  endsAt: string | null;
  perMemberLimit: number;
  /** Days this offer runs, 0 = Sunday. Empty means any day. */
  validDays: number[];
  cooldownDays: number;
  /** null when the coupon is uncapped. */
  seatsLeft: number | null;
  businessId: string;
  businessName: string;
  businessSlug: string;
  businessLogo: string | null;
  businessCity: string | null;
  /** How many times this member has already claimed it. */
  myClaims: number;
}

export interface MyCouponCode {
  id: string;
  code: string;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
  couponId: string;
  couponTitle: string;
  redeemMode: string;
  /** The QR the business scans, as a data URL. Null for online promo codes. */
  qr: string | null;
  /** The shared code to type at an online checkout, for online coupons only. */
  promoCode: string | null;
  businessName: string;
  businessSlug: string;
  businessLogo: string | null;
}

export interface MemberAnnouncement {
  id: string;
  title: string;
  description: string;
  validUntil: string | null;
  businessName: string;
  businessSlug: string;
  businessLogo: string | null;
}

export interface OffersHome {
  coupons: MemberCoupon[];
  myCodes: MyCouponCode[];
  announcements: MemberAnnouncement[];
}

/**
 * Everything the offers screen shows, in one call - Next runs a client's Server
 * Action calls one at a time, so three round trips here would be three waits.
 */
export async function offersHome(userId: string): Promise<OffersHome> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<{ payload: OffersHome }>(
      `
      select json_build_object(
        'coupons', coalesce((
          select json_agg(json_build_object(
            'id', c.id, 'title', c.title, 'description', c.description, 'terms', c.terms,
            'image', c.image, 'discountKind', c.discount_kind, 'percentOff', c.percent_off,
            'amountOffCents', c.amount_off_cents, 'currency', c.currency,
            'minSpendCents', c.min_spend_cents, 'redeemMode', c.redeem_mode,
            'endsAt', c.ends_at, 'perMemberLimit', c.per_member_limit,
            'validDays', c.valid_days, 'cooldownDays', c.cooldown_days,
            'seatsLeft', case when c.total_limit is null then null
                              else greatest(c.total_limit - c.redeemed_count, 0) end,
            'businessId', b.id, 'businessName', b.name, 'businessSlug', b.slug,
            'businessLogo', b.logo, 'businessCity', b.city,
            'myClaims', (select count(*) from public.coupon_redemptions r
                          where r.coupon_id = c.id and r.member_id = $1 and r.status <> 'void')
          ) order by c.created_at desc)
            from public.business_coupons c
            join public.businesses b on b.id = c.business_id
           where c.is_active
             and (c.starts_at is null or c.starts_at <= now())
             and (c.ends_at is null or c.ends_at > now())
        ), '[]'::json),
        'myCodes', coalesce((
          select json_agg(json_build_object(
            'id', r.id, 'code', r.code, 'status', r.status,
            'createdAt', r.created_at, 'expiresAt', r.expires_at, 'redeemedAt', r.redeemed_at,
            'couponId', c.id, 'couponTitle', c.title, 'redeemMode', c.redeem_mode, 'qr', null,
            'promoCode', case when c.redeem_mode = 'online' then c.promo_code else null end,
            'businessName', b.name, 'businessSlug', b.slug, 'businessLogo', b.logo
          ) order by r.created_at desc)
            from public.coupon_redemptions r
            join public.business_coupons c on c.id = r.coupon_id
            join public.businesses b on b.id = r.business_id
           where r.member_id = $1 and r.status <> 'void'
        ), '[]'::json),
        'announcements', coalesce((
          select json_agg(json_build_object(
            'id', o.id, 'title', o.title, 'description', o.description,
            'validUntil', o.valid_until,
            'businessName', b.name, 'businessSlug', b.slug, 'businessLogo', b.logo
          ) order by o.created_at desc)
            from public.business_offers o
            join public.businesses b on b.id = o.business_id
           where o.is_active
        ), '[]'::json)
      ) as payload
      `,
      [userId]
    );

    const payload = rows[0]?.payload ?? { coupons: [], myCodes: [], announcements: [] };
    for (const c of payload.coupons) {
      c.endsAt = iso(c.endsAt);
      c.validDays = Array.isArray(c.validDays) ? c.validDays.map(Number) : [];
    }
    for (const m of payload.myCodes) {
      m.createdAt = iso(m.createdAt);
      m.expiresAt = iso(m.expiresAt);
      m.redeemedAt = iso(m.redeemedAt);
    }
    await attachQr(payload.myCodes);
    for (const a of payload.announcements) a.validUntil = iso(a.validUntil);
    return payload;
  });
}

export interface ClaimResult {
  code: string;
  status: string;
  expiresAt: string | null;
}

/**
 * Claim a code.
 *
 * Everything that decides yes or no - the caps, the window, whether the
 * business is still verified, whether the caller is even a member - lives in
 * claim_coupon(), under a row lock. This function exists to pass the coupon id
 * in and the code back; it must never grow a check of its own, because a check
 * here would be one a second caller could skip.
 */
export async function claimCoupon(userId: string, couponId: string): Promise<ClaimResult> {
  return withUser(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select * from public.claim_coupon($1)`, [couponId]
    );
    const r = rows[0];
    if (!r) throw new Error('That offer could not be claimed.');
    return {
      code: r.code as string,
      status: r.status as string,
      expiresAt: iso(r.expires_at),
    };
  });
}

/**
 * Draw the QR for every code still waiting to be spent.
 *
 * Only the live in-store ones: an online coupon is a promo code typed into a
 * checkout, and a used code is history. Rendering a picture for either would be
 * work nobody looks at.
 */
async function attachQr(codes: MyCouponCode[]): Promise<void> {
  await Promise.all(codes.map(async (c) => {
    if (c.status === 'reserved' && c.redeemMode !== 'online') {
      c.qr = await codeQr(c.code);
    }
  }));
}

// ============================================================ One business

export interface MemberBusinessPage {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  coverImage: string | null;
  category: string;
  city: string | null;
  province: string | null;
  address: string | null;
  descriptionShort: string | null;
  descriptionFull: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  businessHours: string | null;
  serviceArea: string | null;
  memberRateText: string | null;
  isFeatured: boolean;
  coupons: MemberCoupon[];
  announcements: MemberAnnouncement[];
  events: {
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    location: string | null;
    image: string | null;
    admission: string;
    priceCents: number;
    currency: string;
  }[];
  myCodes: MyCouponCode[];
}

/**
 * A business, as a member sees it: who they are, what they are offering, and
 * what is coming up.
 *
 * This is the screen the QR is generated on. A member opens the business they
 * are standing in, taps the offer, and the code is on the phone - which is why
 * their own live codes for THIS business come back with it rather than living
 * only on the offers tab.
 *
 * Every row here is still gated by the same policies as everywhere else: an
 * unverified business is not visible, a paused coupon is not listed, and an
 * event the club has not approved does not appear.
 */
export async function memberBusinessPage(
  userId: string,
  slug: string
): Promise<MemberBusinessPage | null> {
  const page = await withUserRead(userId, async (db) => {
    const rows = await db.run<{ payload: MemberBusinessPage | null }>(
      `
      with biz as (
        select * from public.businesses
         where slug = $2 and verification_status = 'verified'
         limit 1
      )
      select case when not exists (select 1 from biz) then null else (
        select json_build_object(
          'id', b.id, 'name', b.name, 'slug', b.slug, 'logo', b.logo,
          'coverImage', b.cover_image, 'category', b.category, 'city', b.city,
          'province', b.province, 'address', b.address,
          'descriptionShort', b.description_short, 'descriptionFull', b.description_full,
          'phone', b.phone, 'email', b.email, 'website', b.website,
          'businessHours', b.business_hours, 'serviceArea', b.service_area,
          'memberRateText', b.member_rate_text, 'isFeatured', b.is_featured,
          'coupons', coalesce((
            select json_agg(json_build_object(
              'id', c.id, 'title', c.title, 'description', c.description, 'terms', c.terms,
              'image', c.image, 'discountKind', c.discount_kind, 'percentOff', c.percent_off,
              'amountOffCents', c.amount_off_cents, 'currency', c.currency,
              'minSpendCents', c.min_spend_cents, 'redeemMode', c.redeem_mode,
              'endsAt', c.ends_at, 'perMemberLimit', c.per_member_limit,
              'validDays', c.valid_days, 'cooldownDays', c.cooldown_days,
              'seatsLeft', case when c.total_limit is null then null
                                else greatest(c.total_limit - c.redeemed_count, 0) end,
              'businessId', b.id, 'businessName', b.name, 'businessSlug', b.slug,
              'businessLogo', b.logo, 'businessCity', b.city,
              'myClaims', (select count(*) from public.coupon_redemptions r
                            where r.coupon_id = c.id and r.member_id = $1 and r.status <> 'void')
            ) order by c.created_at desc)
              from public.business_coupons c
             where c.business_id = b.id and c.is_active
               and (c.starts_at is null or c.starts_at <= now())
               and (c.ends_at is null or c.ends_at > now())
          ), '[]'::json),
          'announcements', coalesce((
            select json_agg(json_build_object(
              'id', o.id, 'title', o.title, 'description', o.description,
              'validUntil', o.valid_until, 'businessName', b.name,
              'businessSlug', b.slug, 'businessLogo', b.logo
            ) order by o.created_at desc)
              from public.business_offers o
             where o.business_id = b.id and o.is_active
          ), '[]'::json),
          'events', coalesce((
            select json_agg(json_build_object(
              'id', e.id, 'title', e.title, 'date', to_char(e.event_date, 'YYYY-MM-DD'), 'time', e.event_time,
              'location', coalesce(e.venue_name, e.location), 'image', e.image,
              'admission', e.admission, 'priceCents', e.price_cents, 'currency', e.currency
            ) order by e.event_date asc nulls last)
              from public.events e
             where e.business_id = b.id and e.is_published
               and e.moderation_status = 'approved' and e.status = 'upcoming'
          ), '[]'::json),
          'myCodes', coalesce((
            select json_agg(json_build_object(
              'id', r.id, 'code', r.code, 'status', r.status,
              'createdAt', r.created_at, 'expiresAt', r.expires_at, 'redeemedAt', r.redeemed_at,
              'couponId', c.id, 'couponTitle', c.title, 'redeemMode', c.redeem_mode, 'qr', null,
              'promoCode', case when c.redeem_mode = 'online' then c.promo_code else null end,
              'businessName', b.name, 'businessSlug', b.slug, 'businessLogo', b.logo
            ) order by r.created_at desc)
              from public.coupon_redemptions r
              join public.business_coupons c on c.id = r.coupon_id
             where r.business_id = b.id and r.member_id = $1
               -- A held in-store code, OR an online claim: claiming an online
               -- coupon marks it redeemed on the spot (there is no till to
               -- confirm it), and the promo code it unlocked is the thing the
               -- member came here to see. Bounded by the coupon's own end date.
               and (
                 r.status = 'reserved'
                 or (r.status = 'redeemed' and c.redeem_mode = 'online'
                     and (c.ends_at is null or c.ends_at > now()))
               )
          ), '[]'::json)
        ) from biz b
      ) end as payload
      `,
      [userId, slug]
    );
    return rows[0]?.payload ?? null;
  });

  if (!page) return null;
  for (const c of page.coupons) {
    c.endsAt = iso(c.endsAt);
    c.validDays = Array.isArray(c.validDays) ? c.validDays.map(Number) : [];
  }
  for (const a of page.announcements) a.validUntil = iso(a.validUntil);
  for (const e of page.events) e.date = iso(e.date);
  for (const m of page.myCodes) {
    m.createdAt = iso(m.createdAt);
    m.expiresAt = iso(m.expiresAt);
    m.redeemedAt = iso(m.redeemedAt);
  }
  await attachQr(page.myCodes);
  return page;
}

/**
 * Return the seats held by codes nobody showed.
 *
 * Elevated is not needed and not used: expire_coupon_reservations() is a
 * SECURITY DEFINER function with no grant to app roles, so the only caller is
 * server-side code like this one, running on the cron's connection.
 */
export async function expireCouponHolds(): Promise<number> {
  const { withElevated } = await import('@/server/db');
  return withElevated(async (db) => {
    const rows = await db<{ expired: number }>`
      select public.expire_coupon_reservations() as expired
    `;
    return Number(rows[0]?.expired ?? 0);
  });
}
