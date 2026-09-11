import 'server-only';
import { withUser, withUserRead } from '@/server/db';

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
            'couponId', c.id, 'couponTitle', c.title, 'redeemMode', c.redeem_mode,
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
    for (const c of payload.coupons) c.endsAt = iso(c.endsAt);
    for (const m of payload.myCodes) {
      m.createdAt = iso(m.createdAt);
      m.expiresAt = iso(m.expiresAt);
      m.redeemedAt = iso(m.redeemedAt);
    }
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
