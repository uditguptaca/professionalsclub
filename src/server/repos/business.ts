import 'server-only';
import { withUser, withUserRead } from '@/server/db';
import { insertRow, updateRow, type ColumnMap } from '@/server/query';
// One definition of what an event is, shared with the curator screens: the
// business console and the club's own event editor write the same columns.
import { EVENT_WRITABLE } from '@/server/repos/events';

/**
 * The business owner's module: register a business, manage its page, its
 * offers, and its events.
 *
 * Ownership is businesses.created_by - a member's profile id - and every rule
 * that matters is enforced twice: the allowlists here decide which columns an
 * owner's payload can ever reach, and the 0039 policies plus guard triggers
 * enforce the same thing inside the database (an owner cannot self-verify,
 * self-feature, fake attendance, or touch a business that is not theirs, even
 * if this file were wrong).
 *
 * Everything a session does here resolves the owner from the session. No
 * function takes "which member" as a parameter.
 */

// What an owner may write about their business. Deliberately absent:
// verification_status, is_featured, approved_by_admin, created_by, slug
// (identity, set once at registration), submission_details.
const BUSINESS_OWNER_WRITABLE: ColumnMap = {
  name: 'name',
  logo: 'logo',
  coverImage: 'cover_image',
  category: 'category',
  subcategory: 'subcategory',
  descriptionShort: 'description_short',
  descriptionFull: 'description_full',
  services: 'services',
  contactPerson: 'contact_person',
  phone: 'phone',
  email: 'email',
  website: 'website',
  address: 'address',
  city: 'city',
  province: 'province',
  postalCode: 'postal_code',
  serviceArea: 'service_area',
  yearsInBusiness: 'years_in_business',
  businessHours: 'business_hours',
  pricingSummary: 'pricing_summary',
  memberRateText: 'member_rate_text',
  offerBadge: 'offer_badge',
  hasMemberRate: 'has_member_rate',
};

const OFFER_WRITABLE: ColumnMap = {
  title: 'title',
  description: 'description',
  validUntil: 'valid_until',
  image: 'image',
  isActive: 'is_active',
};

// What an owner may write about their event. Deliberately absent: is_featured,
// attendees, platform (all pinned by the guard trigger anyway), business_id
// (set server-side at creation, immutable after).
const EVENT_OWNER_WRITABLE: ColumnMap = EVENT_WRITABLE;

export interface MyBusiness {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  coverImage: string | null;
  category: string;
  subcategory: string | null;
  descriptionShort: string | null;
  descriptionFull: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  serviceArea: string | null;
  businessHours: string | null;
  memberRateText: string | null;
  offerBadge: string | null;
  verificationStatus: string;
}

export interface BusinessOffer {
  id: string;
  title: string;
  description: string;
  validUntil: string | null;
  image: string | null;
  isActive: boolean;
}

export interface BusinessEvent {
  id: string;
  title: string;
  description: string;
  date: string | null;
  time: string | null;
  location: string | null;
  venueName: string | null;
  city: string | null;
  eventType: string;
  capacity: number;
  image: string | null;
  gallery: string[];
  organiser: string | null;
  onlineUrl: string | null;
  contactEmail: string | null;
  admission: string;
  priceCents: number;
  currency: string;
  rsvpUrl: string | null;
  isPublished: boolean;
  status: string;
  going: number;
  /** Whether the club has cleared it, and what they said if not. */
  moderationStatus: string;
  moderationNote: string | null;
}

/** A coupon as its own business sees it, counters and all. */
export interface BusinessCoupon {
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
  promoCode: string | null;
  startsAt: string | null;
  endsAt: string | null;
  totalLimit: number | null;
  perMemberLimit: number;
  redeemedCount: number;
  isActive: boolean;
  /** Claimed codes still waiting to be spent at the counter. */
  outstanding: number;
  spent: number;
}

export interface BusinessHome {
  business: MyBusiness | null;
  offers: BusinessOffer[];
  events: BusinessEvent[];
  coupons: BusinessCoupon[];
}

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : ((v as string | null) ?? null);

/**
 * Everything the business screen needs, one round trip: the caller's business
 * (RLS shows them their own row regardless of verification), its offers, and
 * its events with live RSVP counts.
 */
export async function fetchBusinessHome(userId: string): Promise<BusinessHome> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<{ payload: BusinessHome }>(
      `
      with mine as (
        -- Two ways to own a business: the member who registered one before
        -- invites existed (created_by), and the invited business account
        -- (0046), which has no profile row and so can never be created_by.
        select * from public.businesses
         where created_by = $1 or id = public.my_business_id()
         order by created_at desc limit 1
      )
      select json_build_object(
        'business', (select case when count(*) = 0 then null else json_build_object(
            'id', max(id::text), 'name', max(name), 'slug', max(slug),
            'logo', max(logo), 'coverImage', max(cover_image),
            'category', max(category), 'subcategory', max(subcategory),
            'descriptionShort', max(description_short), 'descriptionFull', max(description_full),
            'contactPerson', max(contact_person), 'phone', max(phone), 'email', max(email),
            'website', max(website), 'address', max(address), 'city', max(city),
            'province', max(province), 'serviceArea', max(service_area),
            'businessHours', max(business_hours), 'memberRateText', max(member_rate_text),
            'offerBadge', max(offer_badge), 'verificationStatus', max(verification_status)
          ) end from mine),
        'offers', coalesce((
          select json_agg(json_build_object(
            'id', o.id, 'title', o.title, 'description', o.description,
            'validUntil', o.valid_until, 'image', o.image, 'isActive', o.is_active
          ) order by o.created_at desc)
            from public.business_offers o
           where o.business_id = (select id from mine)
        ), '[]'::json),
        'events', coalesce((
          select json_agg(json_build_object(
            'id', e.id, 'title', e.title, 'description', e.description,
            'date', e.event_date, 'time', e.event_time, 'location', e.location,
            'venueName', e.venue_name, 'city', e.city,
            'eventType', e.event_type, 'capacity', e.capacity, 'image', e.image,
            'gallery', e.gallery, 'organiser', e.organiser, 'onlineUrl', e.online_url,
            'contactEmail', e.contact_email, 'admission', e.admission,
            'priceCents', e.price_cents, 'currency', e.currency, 'rsvpUrl', e.rsvp_url,
            'isPublished', e.is_published, 'status', e.status,
            'moderationStatus', e.moderation_status, 'moderationNote', e.moderation_note,
            'going', coalesce(a.going, 0)
          ) order by e.event_date desc nulls last)
            from public.events e
            left join public.event_attendance a on a.event_id = e.id
           where e.business_id = (select id from mine)
        ), '[]'::json),
        'coupons', coalesce((
          select json_agg(json_build_object(
            'id', c.id, 'title', c.title, 'description', c.description, 'terms', c.terms,
            'image', c.image, 'discountKind', c.discount_kind, 'percentOff', c.percent_off,
            'amountOffCents', c.amount_off_cents, 'currency', c.currency,
            'minSpendCents', c.min_spend_cents, 'redeemMode', c.redeem_mode,
            'promoCode', c.promo_code, 'startsAt', c.starts_at, 'endsAt', c.ends_at,
            'totalLimit', c.total_limit, 'perMemberLimit', c.per_member_limit,
            'redeemedCount', c.redeemed_count, 'isActive', c.is_active,
            -- Straight off the redemption rows rather than the counter: the
            -- counter is "seats taken", these two are what the owner asks about
            -- ("how many codes are still walking around, how many were spent").
            'outstanding', (select count(*) from public.coupon_redemptions r
                             where r.coupon_id = c.id and r.status = 'reserved'),
            'spent', (select count(*) from public.coupon_redemptions r
                       where r.coupon_id = c.id and r.status = 'redeemed')
          ) order by c.created_at desc)
            from public.business_coupons c
           where c.business_id = (select id from mine)
        ), '[]'::json)
      ) as payload
      `,
      [userId]
    );
    const payload = rows[0]?.payload ?? { business: null, offers: [], events: [], coupons: [] };
    for (const e of payload.events) e.date = iso(e.date);
    for (const o of payload.offers) o.validUntil = iso(o.validUntil);
    for (const c of payload.coupons) { c.startsAt = iso(c.startsAt); c.endsAt = iso(c.endsAt); }
    return payload;
  });
}

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'business';

/**
 * Register the caller's business. Lands pending review no matter what the
 * payload says (guard trigger), and the existing admin Biz Requests queue is
 * where it gets verified. One business per member: a second registration is
 * refused here, which keeps "my business" a single screen.
 */
export async function registerBusiness(
  userId: string,
  data: { name: string; category: string; city: string; province: string;
          descriptionShort?: string; phone?: string; email?: string; website?: string }
): Promise<{ id: string; slug: string }> {
  if (!data.name?.trim()) throw new Error('Business name is required');
  if (!data.category?.trim()) throw new Error('Pick a category');
  if (!data.city?.trim()) throw new Error('Pick a city');

  return withUser(userId, async (db) => {
    const existing = await db.run<{ id: string }>(
      `select id from public.businesses where created_by = $1 limit 1`,
      [userId]
    );
    if (existing.length > 0) throw new Error('You already have a business registered');

    // Unique slug: name, then name-2, name-3... The unique index has the final
    // say; this just avoids ugly collisions in the common case.
    const base = slugify(data.name);
    const taken = await db.run<{ slug: string }>(
      `select slug from public.businesses where slug like $1 || '%'`,
      [base]
    );
    const slugs = new Set(taken.map((t) => t.slug));
    let slug = base;
    for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`;

    const rows = await db.run<{ id: string; slug: string }>(
      `insert into public.businesses
         (name, slug, category, city, province, description_short, phone, email, website, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id, slug`,
      [
        data.name.trim(), slug, data.category.trim(), data.city.trim(), data.province.trim(),
        data.descriptionShort?.trim() || null, data.phone?.trim() || null,
        data.email?.trim() || null, data.website?.trim() || null, userId,
      ]
    );
    if (!rows[0]) throw new Error('Registration failed');
    return rows[0];
  });
}

/** Update the caller's business page. RLS scopes the row; the map the columns. */
export async function updateMyBusiness(
  userId: string,
  businessId: string,
  data: Record<string, unknown>
): Promise<void> {
  await withUser(userId, async (db) => {
    await updateRow(db, 'public.businesses', BUSINESS_OWNER_WRITABLE, businessId, data, 'id');
  });
}

// ---- Offers -----------------------------------------------------------------

export async function createOffer(
  userId: string,
  businessId: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!String(data.title ?? '').trim()) throw new Error('Offer title is required');
  await withUser(userId, async (db) => {
    await insertRow(
      db, 'public.business_offers',
      // businessId must be in the map or the allowlist drops it and the
      // NOT NULL constraint rejects the row - the bug the first live test hit.
      { ...OFFER_WRITABLE, businessId: 'business_id' },
      { ...data, businessId },
      'id'
    );
  });
}

export async function updateOffer(
  userId: string,
  offerId: string,
  data: Record<string, unknown>
): Promise<void> {
  await withUser(userId, async (db) => {
    await updateRow(db, 'public.business_offers', OFFER_WRITABLE, offerId, data, 'id');
  });
}

export async function deleteOffer(userId: string, offerId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(`delete from public.business_offers where id = $1`, [offerId]);
  });
}

// ---- Events -----------------------------------------------------------------

export async function createBusinessEvent(
  userId: string,
  businessId: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!String(data.title ?? '').trim()) throw new Error('Event title is required');
  // An online event has no street address, and demanding one taught owners to
  // type "Zoom" into the location field.
  if (data.eventType !== 'virtual' && !String(data.location ?? '').trim()) {
    throw new Error('Location is required');
  }
  await withUser(userId, async (db) => {
    await insertRow(
      db, 'public.events',
      { ...EVENT_OWNER_WRITABLE, businessId: 'business_id' },
      { status: 'upcoming', eventType: 'in_person', description: '', ...data, businessId },
      'id'
    );
  });
}

export async function updateBusinessEvent(
  userId: string,
  eventId: string,
  data: Record<string, unknown>
): Promise<void> {
  await withUser(userId, async (db) => {
    await updateRow(db, 'public.events', EVENT_OWNER_WRITABLE, eventId, data, 'id');
  });
}

export async function deleteBusinessEvent(userId: string, eventId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(`delete from public.events where id = $1`, [eventId]);
  });
}

// ---- Coupons ------------------------------------------------------------------

/**
 * What a business may write about a coupon.
 *
 * redeemedCount is absent, and that absence is the cap: the counter is what
 * total_limit is measured against, and 0047's trigger pins it for every writer
 * that is not one of the two redemption functions.
 */
const COUPON_WRITABLE: ColumnMap = {
  title: 'title',
  description: 'description',
  terms: 'terms',
  image: 'image',
  discountKind: 'discount_kind',
  percentOff: 'percent_off',
  amountOffCents: 'amount_off_cents',
  currency: 'currency',
  minSpendCents: 'min_spend_cents',
  redeemMode: 'redeem_mode',
  promoCode: 'promo_code',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
  totalLimit: 'total_limit',
  perMemberLimit: 'per_member_limit',
  isActive: 'is_active',
};

/**
 * The same rules the CHECK constraints enforce, said in English.
 *
 * The database is what actually holds the line; this exists so a business owner
 * gets "Enter the discount percentage" instead of a constraint name.
 */
function validateCoupon(data: Record<string, unknown>): void {
  const title = String(data.title ?? '').trim();
  if (title.length < 2) throw new Error('Give the coupon a title.');

  const kind = String(data.discountKind ?? 'percent');
  if (kind === 'percent') {
    const pct = Number(data.percentOff ?? 0);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      throw new Error('Enter the discount percentage, between 1 and 100.');
    }
  }
  if (kind === 'amount') {
    const cents = Number(data.amountOffCents ?? 0);
    if (!Number.isFinite(cents) || cents <= 0) throw new Error('Enter the amount off.');
  }
  if (String(data.redeemMode ?? 'in_store') === 'online' && !String(data.promoCode ?? '').trim()) {
    throw new Error('An online coupon needs the promo code members will type at checkout.');
  }

  const per = Number(data.perMemberLimit ?? 1);
  if (!Number.isFinite(per) || per < 1 || per > 100) {
    throw new Error('Each member can claim between 1 and 100 times.');
  }
  if (data.totalLimit !== null && data.totalLimit !== undefined && data.totalLimit !== '') {
    const total = Number(data.totalLimit);
    if (!Number.isFinite(total) || total < 1) throw new Error('The total limit must be at least 1.');
  }

  const starts = data.startsAt ? Date.parse(String(data.startsAt)) : null;
  const ends = data.endsAt ? Date.parse(String(data.endsAt)) : null;
  if (starts && ends && ends <= starts) throw new Error('The end date has to be after the start.');
}

export async function createCoupon(
  userId: string,
  businessId: string,
  data: Record<string, unknown>
): Promise<void> {
  validateCoupon(data);
  await withUser(userId, async (db) => {
    await insertRow(
      db, 'public.business_coupons',
      { ...COUPON_WRITABLE, businessId: 'business_id' },
      { ...data, businessId },
      'id'
    );
  });
}

export async function updateCoupon(
  userId: string,
  couponId: string,
  data: Record<string, unknown>
): Promise<void> {
  // A pause/resume carries only isActive, and running the full check on it
  // would demand a discount value the caller never sent.
  if (Object.keys(data).some((k) => k !== 'isActive')) validateCoupon(data);
  await withUser(userId, async (db) => {
    const row = await updateRow<{ id: string }>(
      db, 'public.business_coupons', COUPON_WRITABLE, couponId, data, 'id'
    );
    if (!row) throw new Error('That coupon is not yours to change.');
  });
}

export async function deleteCoupon(userId: string, couponId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const rows = await db.run(
      `delete from public.business_coupons where id = $1 returning id`, [couponId]
    );
    if (rows.length === 0) throw new Error('That coupon is not yours to remove.');
  });
}

export interface CouponActivity {
  id: string;
  couponId: string;
  code: string;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
}

/** Recent claims on this business's coupons. Carries no member identity (0047). */
export async function couponActivity(userId: string, limit = 50): Promise<CouponActivity[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select id, coupon_id, code, status, created_at, expires_at, redeemed_at
         from public.business_coupon_activity
        order by created_at desc
        limit $1`,
      [limit]
    );
    return rows.map((r) => ({
      id: r.id as string,
      couponId: r.coupon_id as string,
      code: r.code as string,
      status: r.status as string,
      createdAt: iso(r.created_at),
      expiresAt: iso(r.expires_at),
      redeemedAt: iso(r.redeemed_at),
    }));
  });
}

export interface RedeemOutcome {
  outcome: 'redeemed' | 'already_used' | 'expired' | 'void' | 'not_found';
  couponTitle: string | null;
  redeemedAt: string | null;
}

/**
 * The counter, at the counter: a member shows a code, the business types it in.
 *
 * All of the deciding happens inside mark_coupon_redeemed() - whether the code
 * exists, whether it belongs to this business, whether it has already been
 * spent. This just carries the answer back.
 */
export async function redeemCode(userId: string, code: string): Promise<RedeemOutcome> {
  const trimmed = String(code ?? '').trim().toUpperCase();
  if (trimmed.length < 4) throw new Error('Enter the code from the member’s screen.');

  return withUser(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select * from public.mark_coupon_redeemed($1)`, [trimmed]
    );
    const r = rows[0];
    return {
      outcome: ((r?.outcome as string) ?? 'not_found') as RedeemOutcome['outcome'],
      couponTitle: (r?.coupon_title as string | null) ?? null,
      redeemedAt: iso(r?.redeemed_at),
    };
  });
}
