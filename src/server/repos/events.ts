import 'server-only';
import { withUser, withUserRead } from '@/server/db';
import { insertRow, updateRow, type ColumnMap } from '@/server/query';

/**
 * Events: the member's event page, and the screens the people who post events
 * manage them from.
 *
 * Three kinds of poster, one table (0045):
 *   - an admin, who can do anything;
 *   - a volunteer, who posts CLUB events and may only touch their own;
 *   - a verified business, whose events wait for an admin before members see
 *     them, and go back to waiting if the content is rewritten afterwards.
 *
 * None of that is decided here. The policies and the guard trigger decide it on
 * the same connection as the write, so this file is column allowlists, one
 * query per screen, and the shapes the UI wants.
 */

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : ((v as string | null) ?? null);

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * What a poster may write. Absent on purpose: is_featured and attendees (the
 * admin's editorial and offline counters), business_id and created_by
 * (ownership, set once), and every moderation_* column - all of them pinned by
 * the 0045 trigger as well, so a payload carrying them changes nothing.
 */
export const EVENT_WRITABLE: ColumnMap = {
  title: 'title',
  description: 'description',
  date: 'event_date',
  time: 'event_time',
  location: 'location',
  venueName: 'venue_name',
  city: 'city',
  eventType: 'event_type',
  capacity: 'capacity',
  image: 'image',
  gallery: 'gallery',
  organiser: 'organiser',
  onlineUrl: 'online_url',
  contactEmail: 'contact_email',
  admission: 'admission',
  priceCents: 'price_cents',
  currency: 'currency',
  rsvpUrl: 'rsvp_url',
  isPublished: 'is_published',
  status: 'status',
};

export interface EventDetail {
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
  /** Only ever populated for a member who said they are coming. */
  onlineUrl: string | null;
  contactEmail: string | null;
  admission: string;
  priceCents: number;
  currency: string;
  rsvpUrl: string | null;
  status: string;
  isPublished: boolean;
  moderationStatus: string;
  moderationNote: string | null;
  /** The offline count plus live RSVPs. */
  attendees: number;
  going: number;
  myRsvp: boolean;
  seatsLeft: number | null;
  businessId: string | null;
  businessName: string | null;
  businessSlug: string | null;
  businessLogo: string | null;
  createdBy: string | null;
}

function toDetail(e: Record<string, unknown>): EventDetail {
  const capacity = Number(e.capacity ?? 0);
  const going = Number(e.going ?? 0);
  const attendees = Number(e.attendees ?? 0);
  return {
    id: e.id as string,
    title: e.title as string,
    description: (e.description as string) ?? '',
    date: iso(e.event_date),
    time: (e.event_time as string | null) ?? null,
    location: (e.location as string | null) ?? null,
    venueName: (e.venue_name as string | null) ?? null,
    city: (e.city as string | null) ?? null,
    eventType: (e.event_type as string) ?? 'in_person',
    capacity,
    image: (e.image as string | null) ?? null,
    gallery: strings(e.gallery),
    organiser: (e.organiser as string | null) ?? null,
    onlineUrl: (e.online_url as string | null) ?? null,
    contactEmail: (e.contact_email as string | null) ?? null,
    admission: (e.admission as string) ?? 'free',
    priceCents: Number(e.price_cents ?? 0),
    currency: (e.currency as string) ?? 'CAD',
    rsvpUrl: (e.rsvp_url as string | null) ?? null,
    status: (e.status as string) ?? 'upcoming',
    isPublished: Boolean(e.is_published),
    moderationStatus: (e.moderation_status as string) ?? 'approved',
    moderationNote: (e.moderation_note as string | null) ?? null,
    attendees,
    going,
    myRsvp: Boolean(e.my_rsvp),
    seatsLeft: capacity > 0 ? Math.max(capacity - (attendees + going), 0) : null,
    businessId: (e.business_id as string | null) ?? null,
    businessName: (e.business_name as string | null) ?? null,
    businessSlug: (e.business_slug as string | null) ?? null,
    businessLogo: (e.business_logo as string | null) ?? null,
    createdBy: (e.created_by as string | null) ?? null,
  };
}

const DETAIL_COLUMNS = `
  e.id, e.title, e.description, to_char(e.event_date, 'YYYY-MM-DD') as event_date, e.event_time, e.location,
  e.venue_name, e.city, e.event_type, e.capacity, e.attendees, e.image,
  e.gallery, e.organiser, e.online_url, e.contact_email, e.admission,
  e.price_cents, e.currency, e.rsvp_url, e.status, e.is_published,
  e.moderation_status, e.moderation_note, e.business_id, e.created_by,
  b.name as business_name, b.slug as business_slug, b.logo as business_logo
`;

/**
 * One event, for a member.
 *
 * RLS decides whether they may see it at all: an event waiting for the club is
 * visible to the poster and nobody else. The join link is a separate question
 * and is answered here - it goes only to a member who has said they are coming,
 * which is the cheapest thing that stops a public page handing out the meeting
 * URL for a virtual event.
 */
export async function eventDetail(userId: string, eventId: string): Promise<EventDetail | null> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select ${DETAIL_COLUMNS},
              coalesce(a.going, 0) as going,
              exists (select 1 from public.event_rsvps r
                       where r.event_id = e.id and r.member_id = $2) as my_rsvp
         from public.events e
         left join public.businesses b on b.id = e.business_id
         left join public.event_attendance a on a.event_id = e.id
        where e.id = $1`,
      [eventId, userId]
    );
    if (!rows[0]) return null;
    const detail = toDetail(rows[0]);
    if (!detail.myRsvp) detail.onlineUrl = null;
    return detail;
  });
}

/** The events this curator or business posted, drafts and pending included. */
export async function listMyEvents(userId: string): Promise<EventDetail[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select ${DETAIL_COLUMNS},
              coalesce(a.going, 0) as going,
              false as my_rsvp
         from public.events e
         left join public.businesses b on b.id = e.business_id
         left join public.event_attendance a on a.event_id = e.id
        where e.created_by = $1 or public.owns_business(e.business_id)
        order by e.event_date desc nulls last, e.title asc`,
      [userId]
    );
    return rows.map(toDetail);
  });
}

/**
 * Post an event.
 *
 * `businessId` is the only thing that decides which door the write goes
 * through: with it, the business owner policy and the moderation queue; without
 * it, the curator policy. Both are the database's call, not this function's.
 */
export async function createEvent(
  userId: string,
  data: Record<string, unknown>,
  businessId?: string | null
): Promise<string> {
  const title = String(data.title ?? '').trim();
  if (title.length < 2) throw new Error('Give the event a title.');
  if (!data.date) throw new Error('Pick the date.');

  return withUser(userId, async (db) => {
    const row = await insertRow<{ id: string }>(
      db,
      'public.events',
      businessId ? { ...EVENT_WRITABLE, businessId: 'business_id' } : EVENT_WRITABLE,
      {
        status: 'upcoming',
        eventType: 'in_person',
        description: '',
        admission: 'free',
        ...data,
        title,
        ...(businessId ? { businessId } : {}),
      },
      'id'
    );
    if (!row) throw new Error('Could not save the event.');
    return row.id;
  });
}

export async function updateEvent(
  userId: string,
  eventId: string,
  data: Record<string, unknown>
): Promise<void> {
  await withUser(userId, async (db) => {
    const row = await updateRow<{ id: string }>(
      db, 'public.events', EVENT_WRITABLE, eventId, data, 'id'
    );
    if (!row) throw new Error('You can only change events you posted.');
  });
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const rows = await db.run(`delete from public.events where id = $1 returning id`, [eventId]);
    if (rows.length === 0) throw new Error('You can only remove events you posted.');
  });
}

// ============================================================ Moderation

export interface PendingEvent extends EventDetail {
  submittedAt: string | null;
}

/** Everything waiting on the club, newest first. Admin only by policy. */
export async function moderationQueue(adminId: string): Promise<PendingEvent[]> {
  return withUserRead(adminId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select ${DETAIL_COLUMNS}, e.created_at,
              coalesce(a.going, 0) as going, false as my_rsvp
         from public.events e
         left join public.businesses b on b.id = e.business_id
         left join public.event_attendance a on a.event_id = e.id
        where e.moderation_status = 'pending'
        order by e.created_at desc`,
      []
    );
    return rows.map((r) => ({ ...toDetail(r), submittedAt: iso(r.created_at) }));
  });
}

/**
 * Approve or reject. The note is what the business is told, so rejecting
 * without one is refused rather than leaving them guessing.
 */
export async function setEventModeration(
  adminId: string,
  eventId: string,
  status: 'approved' | 'rejected',
  note: string
): Promise<void> {
  if (status !== 'approved' && status !== 'rejected') throw new Error('Unknown decision.');
  const trimmed = note.trim();
  if (status === 'rejected' && trimmed.length < 3) {
    throw new Error('Say why, so the business can fix it.');
  }

  await withUser(adminId, async (db) => {
    const rows = await db.run(
      `update public.events
          set moderation_status = $2, moderation_note = $3
        where id = $1
      returning id`,
      [eventId, status, trimmed || null]
    );
    if (rows.length === 0) throw new Error('That event no longer exists.');
  });
}
