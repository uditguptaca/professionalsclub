import 'server-only';
import { withUser, one, type Db } from '@/server/db';
import { insertRow, updateRow, type ColumnMap } from '@/server/query';
import type {
  MatrimonyProfile, MatrimonyPreferences, MatrimonyContact, MatrimonyMedia,
  MatrimonyInterest, MatrimonyShortlist, MatrimonyProfileCard,
  MatrimonyConversation, MatrimonyMessage, MatrimonyReport,
  MatrimonyVerification, MatrimonyProfileStatus, MatrimonyAdminStats,
  InAppNotification,
} from '@/types/matrimony';

/**
 * Matrimony data access.
 *
 * Unlike the help-desk types, the matrimony types are declared in snake_case and
 * already match their columns, so rows are returned as-is with no case mapping.
 *
 * Two rules hold throughout:
 *   - Another member's listing is only ever read from
 *     public.matrimony_visible_profiles. The base table exposes your own row and
 *     admins, because it carries the moderation columns.
 *   - Profile ids are never accepted from the caller as "who I am". The caller's
 *     own profile id is resolved from their user id on the server.
 */

const asDate = (v: unknown) => (v instanceof Date ? v.toISOString() : v);

/** Timestamps cross the Server Action boundary, so they leave as ISO strings. */
function normalise<T>(row: unknown): T {
  if (row === null || row === undefined) return row as T;
  if (Array.isArray(row)) return row.map((r) => normalise(r)) as T;
  if (typeof row !== 'object' || Object.getPrototypeOf(row) !== Object.prototype) return row as T;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    out[k] = v instanceof Date ? asDate(v) : Array.isArray(v) || (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) ? normalise(v) : v;
  }
  return out as T;
}

const norm = <T>(row: unknown): T => normalise<T>(row);
const normAll = <T>(rows: unknown[]): T[] => rows.map((r) => normalise<T>(r));

/** The caller's own matrimony profile id, or null. */
async function myProfileId(db: Db): Promise<string | null> {
  const row = await one<{ id: string }>(
    await db`select public.my_matrimony_profile_id() as id`
  );
  return row?.id ?? null;
}

// ========== MY PROFILE ==========

export interface MyMatrimonyData {
  profile: MatrimonyProfile | null;
  preferences: MatrimonyPreferences | null;
  contact: MatrimonyContact | null;
  media: MatrimonyMedia[];
}

export async function getMine(userId: string): Promise<MyMatrimonyData> {
  return withUser(userId, async (db) => {
    const profile = await one<MatrimonyProfile>(
      await db`select * from public.matrimony_profiles where user_id = ${userId}::uuid`
    );

    if (!profile) return { profile: null, preferences: null, contact: null, media: [] };

    const [prefs, contact, media] = await Promise.all([
      db`select * from public.matrimony_preferences where profile_id = ${profile.id}::uuid`,
      db`select * from public.matrimony_contacts where profile_id = ${profile.id}::uuid`,
      db`select * from public.matrimony_media where profile_id = ${profile.id}::uuid`,
    ]);

    return {
      profile: norm<MatrimonyProfile>(profile),
      preferences: prefs[0] ? norm<MatrimonyPreferences>(prefs[0]) : null,
      contact: contact[0] ? norm<MatrimonyContact>(contact[0]) : null,
      media: normAll<MatrimonyMedia>(media),
    };
  });
}

/** Columns a member may write on their own listing. Moderation fields are absent. */
const PROFILE_COLUMNS: ColumnMap = Object.fromEntries(
  [
    'full_name', 'display_pref', 'gender', 'dob', 'height_cm', 'weight_kg', 'body_type',
    'marital_status', 'have_children', 'physical_status', 'religion', 'denomination',
    'community', 'sub_caste', 'gothra', 'mother_tongue', 'languages', 'time_of_birth',
    'place_of_birth', 'rashi', 'nakshatra', 'manglik', 'country', 'province', 'city',
    'residency_status', 'open_to_relocate', 'qualification', 'field_of_study', 'institution',
    'occupation', 'employer', 'industry', 'employment_type', 'work_location', 'income_range',
    'family_type', 'family_status', 'family_values', 'father_occupation', 'mother_occupation',
    'siblings_count', 'siblings_married', 'native_place', 'family_about', 'diet', 'smoking',
    'drinking', 'hobbies', 'about_me', 'completeness_pct', 'is_hidden', 'photo_visibility',
    'created_by', 'status',
  ].map((c) => [c, c])
);

const PREFERENCE_COLUMNS: ColumnMap = Object.fromEntries(
  [
    'age_min', 'age_max', 'height_min_cm', 'height_max_cm', 'marital_status', 'religion',
    'denomination', 'community', 'mother_tongue', 'country', 'province', 'city',
    'residency_status', 'education', 'profession', 'income_range', 'diet', 'smoking',
    'drinking', 'manglik_pref', 'other_notes',
  ].map((c) => [c, c])
);

const CONTACT_COLUMNS: ColumnMap = Object.fromEntries(
  ['phone', 'alt_phone', 'email', 'preferred_method', 'best_time'].map((c) => [c, c])
);

export async function saveProfile(
  userId: string,
  data: Record<string, unknown>,
  status?: MatrimonyProfileStatus
): Promise<MatrimonyProfile> {
  return withUser(userId, async (db) => {
    const existing = await myProfileId(db);
    const payload = { ...data, ...(status ? { status } : {}) };

    // `status` is allowlisted, but the guard_matrimony_profile_fields trigger
    // still refuses anything beyond draft/pending — a member cannot approve
    // their own listing.
    if (existing) {
      const row = await updateRow<MatrimonyProfile>(
        db, 'public.matrimony_profiles', PROFILE_COLUMNS, existing, payload, '*'
      );
      return norm<MatrimonyProfile>(row);
    }

    const columns = { ...PROFILE_COLUMNS, user_id: 'user_id' };
    const row = await insertRow<MatrimonyProfile>(
      db, 'public.matrimony_profiles', columns, { ...payload, user_id: userId }, '*'
    );
    return norm<MatrimonyProfile>(row);
  });
}

export async function savePreferences(
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  await withUser(userId, async (db) => {
    const profileId = await myProfileId(db);
    if (!profileId) throw new Error('Create your profile first.');

    const existing = await one<{ id: string }>(
      await db`select id from public.matrimony_preferences where profile_id = ${profileId}::uuid`
    );

    if (existing) {
      await updateRow(db, 'public.matrimony_preferences', PREFERENCE_COLUMNS, existing.id, data, 'id');
    } else {
      await insertRow(
        db, 'public.matrimony_preferences',
        { ...PREFERENCE_COLUMNS, profile_id: 'profile_id' },
        { ...data, profile_id: profileId }, 'id'
      );
    }
  });
}

export async function saveContact(userId: string, data: Record<string, unknown>): Promise<void> {
  await withUser(userId, async (db) => {
    const profileId = await myProfileId(db);
    if (!profileId) throw new Error('Create your profile first.');

    const existing = await one<{ id: string }>(
      await db`select id from public.matrimony_contacts where profile_id = ${profileId}::uuid`
    );

    if (existing) {
      await updateRow(db, 'public.matrimony_contacts', CONTACT_COLUMNS, existing.id, data, 'id');
    } else {
      await insertRow(
        db, 'public.matrimony_contacts',
        { ...CONTACT_COLUMNS, profile_id: 'profile_id' },
        { ...data, profile_id: profileId }, 'id'
      );
    }
  });
}

export async function deleteMine(userId: string): Promise<void> {
  await withUser(userId, async (db) => {
    // Scoped by user_id, not by a caller-supplied profile id, so this can only
    // ever remove your own listing. Foreign keys cascade to preferences,
    // contacts, media, interests, shortlists and conversations.
    await db`delete from public.matrimony_profiles where user_id = ${userId}::uuid`;
  });
}

// ========== BROWSE ==========

export interface BrowseFilters {
  gender?: string;
  age_min?: number;
  age_max?: number;
  height_min_cm?: number;
  height_max_cm?: number;
  religion?: string[];
  community?: string[];
  city?: string;
  province?: string;
  country?: string;
  residency_status?: string[];
  marital_status?: string[];
  mother_tongue?: string[];
  /** Matches v.qualification. The UI labels the field "Education". */
  education?: string[];
  diet?: string[];
  verified_only?: boolean;
  has_photo?: boolean;
  recently_active?: boolean;
  exclude_gender?: string;
  sort_by?: 'newest' | 'recently_active';
  limit?: number;
  offset?: number;
}

export interface BrowsePage {
  profiles: MatrimonyProfileCard[];
  /** Rows matching the filters, ignoring limit/offset, so a client can page. */
  total: number;
}

/** The list without the count, for callers that show everything they asked for. */
export async function browse(
  userId: string,
  filters: BrowseFilters = {}
): Promise<MatrimonyProfileCard[]> {
  return (await browsePaged(userId, filters)).profiles;
}

export async function browsePaged(
  userId: string,
  filters: BrowseFilters = {}
): Promise<BrowsePage> {
  return withUser(userId, async (db) => {
    const where: string[] = ["v.status = 'approved'", 'v.is_hidden = false'];
    const values: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      values.push(value);
      where.push(clause.replace('?', `$${values.length}`));
    };

    if (filters.gender) add('v.gender = ?', filters.gender);
    if (filters.exclude_gender) add('v.gender <> ?', filters.exclude_gender);
    if (filters.city) add('v.city ilike ?', `%${filters.city}%`);
    if (filters.province) add('v.province = ?', filters.province);
    if (filters.country) add('v.country = ?', filters.country);
    if (filters.religion?.length) add('v.religion = any(?)', filters.religion);
    if (filters.community?.length) add('v.community = any(?)', filters.community);
    if (filters.residency_status?.length) add('v.residency_status = any(?)', filters.residency_status);
    if (filters.marital_status?.length) add('v.marital_status = any(?)', filters.marital_status);
    if (filters.mother_tongue?.length) add('v.mother_tongue = any(?)', filters.mother_tongue);
    if (filters.education?.length) add('v.qualification = any(?)', filters.education);
    if (filters.diet?.length) add('v.diet = any(?)', filters.diet);
    if (filters.height_min_cm) add('v.height_cm >= ?', filters.height_min_cm);
    if (filters.height_max_cm) add('v.height_cm <= ?', filters.height_max_cm);
    if (filters.verified_only) where.push('v.is_verified_id = true');
    if (filters.recently_active) where.push("v.last_active_at >= now() - interval '3 days'");

    // Age is stored as a date of birth, so the bounds become a dob range rather
    // than a computed age: dob is comparable to an index, and the arithmetic is
    // exact for whole-year ages. age >= n means born on or before today minus n
    // years; age <= n means born after today minus (n + 1) years.
    if (filters.age_min) add('v.dob <= current_date - make_interval(years => ?::int)', filters.age_min);
    if (filters.age_max) add('v.dob > current_date - make_interval(years => ?::int + 1)', filters.age_max);

    // The view already excludes your own listing's counterparties by block, but
    // not you; filter self out here.
    values.push(userId);
    where.push(`v.user_id <> $${values.length}::uuid`);

    // "With photo" means the same photo the card renders, so it is a condition on
    // the lateral join below and not a separate exists() over all media.
    if (filters.has_photo) where.push('m.url is not null');

    const limit = Math.min(Math.max(Number(filters.limit ?? 50), 1), 100);
    const offset = Math.max(Math.trunc(Number(filters.offset) || 0), 0);
    // Fixed expressions chosen by an allowlist, never caller text in the SQL.
    const order = filters.sort_by === 'newest' ? 'v.created_at desc' : 'v.last_active_at desc';

    // The primary photo is joined here rather than fetched separately, and only
    // when moderation has approved it. count(*) over() is evaluated before the
    // limit, so the page and its total arrive in one round trip.
    const rows = await db.run(
      `select v.*, m.url as primary_photo_url, count(*) over() as total_count
         from public.matrimony_visible_profiles v
         left join lateral (
           select url from public.matrimony_media
            where profile_id = v.id and type = 'photo'
              and is_primary = true and is_approved = true
            limit 1
         ) m on true
        where ${where.join(' and ')}
        order by ${order}
        limit ${limit} offset ${offset}`,
      values.map((v) => v)
    );

    return {
      profiles: normAll<MatrimonyProfileCard>(rows.map(({ total_count: _t, ...card }) => card)),
      total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    };
  });
}

export async function getVisibleProfile(userId: string, profileId: string) {
  return withUser(userId, async (db) => {
    const profile = await one<MatrimonyProfileCard>(
      await db`select * from public.matrimony_visible_profiles where id = ${profileId}::uuid`
    );
    if (!profile) return null;

    const mine = await myProfileId(db);

    const [prefs, media, shortlisted, interest, contact] = await Promise.all([
      db`select * from public.matrimony_preferences where profile_id = ${profileId}::uuid`,
      db`select * from public.matrimony_media where profile_id = ${profileId}::uuid`,
      mine
        ? db`select 1 from public.matrimony_shortlists
              where owner_profile_id = ${mine}::uuid and target_profile_id = ${profileId}::uuid`
        : Promise.resolve([]),
      mine
        ? db`select * from public.matrimony_interests
              where (sender_profile_id = ${mine}::uuid and receiver_profile_id = ${profileId}::uuid)
                 or (sender_profile_id = ${profileId}::uuid and receiver_profile_id = ${mine}::uuid)`
        : Promise.resolve([]),
      // Returns nothing unless an interest between the two was accepted; the
      // policy on matrimony_contacts is what decides, not this query.
      db`select * from public.matrimony_contacts where profile_id = ${profileId}::uuid`,
    ]);

    // Recording the view is best-effort and must not fail the page.
    if (mine && mine !== profileId) {
      await db`
        insert into public.matrimony_profile_views (viewer_profile_id, viewed_profile_id)
        values (${mine}::uuid, ${profileId}::uuid)
      `;
    }

    return {
      profile: norm<MatrimonyProfileCard>(profile),
      preferences: prefs[0] ? norm<MatrimonyPreferences>(prefs[0]) : null,
      media: normAll<MatrimonyMedia>(media),
      isShortlisted: shortlisted.length > 0,
      interest: interest[0] ? norm<MatrimonyInterest>(interest[0]) : null,
      contact: contact[0] ? norm<MatrimonyContact>(contact[0]) : null,
      myProfileId: mine,
    };
  });
}

// ========== INTERESTS ==========

export interface PopulatedInterest {
  id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  status: string;
  created_at: string;
  profile: MatrimonyProfileCard;
}

export async function listInterests(userId: string) {
  return withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) return { received: [], sent: [] };

    const [received, sent] = await Promise.all([
      db`select id, status, created_at, sender_profile_id, receiver_profile_id
           from public.matrimony_interests
          where receiver_profile_id = ${mine}::uuid order by created_at desc`,
      db`select id, status, created_at, sender_profile_id, receiver_profile_id
           from public.matrimony_interests
          where sender_profile_id = ${mine}::uuid order by created_at desc`,
    ]);

    const ids = [
      ...received.map((r) => (r as { sender_profile_id: string }).sender_profile_id),
      ...sent.map((r) => (r as { receiver_profile_id: string }).receiver_profile_id),
    ];

    const cards = new Map<string, MatrimonyProfileCard>();
    if (ids.length > 0) {
      const rows = await db`
        select * from public.matrimony_visible_profiles where id = any(${[...new Set(ids)]}::uuid[])
      `;
      for (const row of normAll<MatrimonyProfileCard>(rows)) cards.set(row.id, row);
    }

    const populate = (rows: unknown[], key: 'sender_profile_id' | 'receiver_profile_id') =>
      normAll<Record<string, string>>(rows)
        .map((row) => ({ ...row, profile: cards.get(row[key]) }))
        .filter((row) => row.profile != null) as unknown as PopulatedInterest[];

    return {
      received: populate(received, 'sender_profile_id'),
      sent: populate(sent, 'receiver_profile_id'),
    };
  });
}

export async function sendInterest(userId: string, targetProfileId: string): Promise<boolean> {
  return withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) throw new Error('Create your profile first.');

    try {
      await db`
        insert into public.matrimony_interests (sender_profile_id, receiver_profile_id)
        values (${mine}::uuid, ${targetProfileId}::uuid)
      `;
      return true;
    } catch (err) {
      // 23505 = already sent. Not an error worth surfacing.
      if ((err as { code?: string }).code === '23505') return false;
      throw err;
    }
  });
}

export async function respondToInterest(
  userId: string,
  interestId: string,
  accept: boolean
): Promise<void> {
  await withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) throw new Error('Create your profile first.');

    // The guard_interest_response trigger rejects this unless the caller is the
    // recipient, so a sender cannot accept on the other party's behalf.
    const rows = await db<{ sender_profile_id: string }>`
      update public.matrimony_interests
         set status = ${accept ? 'accepted' : 'declined'}
       where id = ${interestId}::uuid
      returning sender_profile_id
    `;

    if (accept && rows[0]) {
      // Stored in a fixed order so the unique constraint actually prevents a
      // duplicate thread — otherwise A->B and B->A would be two rows.
      const [a, b] = [mine, rows[0].sender_profile_id].sort();
      await db`
        insert into public.matrimony_conversations (profile_a_id, profile_b_id)
        values (${a}::uuid, ${b}::uuid)
        on conflict (profile_a_id, profile_b_id) do nothing
      `;
    }
  });
}

// ========== SHORTLIST / BLOCK / REPORT ==========

export async function listShortlist(userId: string): Promise<MatrimonyProfileCard[]> {
  return withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) return [];

    const rows = await db`
      select v.* from public.matrimony_visible_profiles v
        join public.matrimony_shortlists s on s.target_profile_id = v.id
       where s.owner_profile_id = ${mine}::uuid
       order by s.created_at desc
    `;
    return normAll<MatrimonyProfileCard>(rows);
  });
}

export async function addToShortlist(userId: string, targetProfileId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) throw new Error('Create your profile first.');
    await db`
      insert into public.matrimony_shortlists (owner_profile_id, target_profile_id)
      values (${mine}::uuid, ${targetProfileId}::uuid)
      on conflict do nothing
    `;
  });
}

export async function removeFromShortlist(userId: string, targetProfileId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) return;
    await db`
      delete from public.matrimony_shortlists
       where owner_profile_id = ${mine}::uuid and target_profile_id = ${targetProfileId}::uuid
    `;
  });
}

export async function blockProfile(userId: string, targetProfileId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) throw new Error('Create your profile first.');
    await db`
      insert into public.matrimony_blocks (blocker_profile_id, blocked_profile_id)
      values (${mine}::uuid, ${targetProfileId}::uuid)
      on conflict do nothing
    `;
  });
}

export async function reportProfile(
  userId: string,
  targetProfileId: string,
  reason: string,
  details?: string
): Promise<void> {
  await withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) throw new Error('Create your profile first.');
    await db`
      insert into public.matrimony_reports
        (reporter_profile_id, reported_profile_id, target_type, reason, details)
      values (${mine}::uuid, ${targetProfileId}::uuid, 'profile', ${reason}, ${details ?? null})
    `;
  });
}

export async function requestPhotoAccess(userId: string, targetProfileId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) throw new Error('Create your profile first.');
    await db`
      insert into public.matrimony_photo_requests (requester_profile_id, target_profile_id)
      values (${mine}::uuid, ${targetProfileId}::uuid)
      on conflict do nothing
    `;
  });
}

export async function saveSearch(
  userId: string,
  name: string,
  filters: Record<string, unknown>,
  notify: boolean
): Promise<void> {
  await withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) throw new Error('Create your profile first.');
    await db`
      insert into public.matrimony_saved_searches (profile_id, name, filters, notify)
      values (${mine}::uuid, ${name}, ${JSON.stringify(filters)}::jsonb, ${notify})
    `;
  });
}

export async function listBlockedIds(userId: string): Promise<string[]> {
  return withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) return [];
    const rows = await db<{ blocked_profile_id: string }>`
      select blocked_profile_id from public.matrimony_blocks
       where blocker_profile_id = ${mine}::uuid
    `;
    return rows.map((r) => r.blocked_profile_id);
  });
}

// ========== CONVERSATIONS ==========

export interface PopulatedConversation extends MatrimonyConversation {
  otherProfile: MatrimonyProfileCard;
}

export async function listConversations(userId: string) {
  return withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) return { conversations: [] as PopulatedConversation[], myProfileId: null };

    const convos = await db`
      select id, profile_a_id, profile_b_id, last_message_at, created_at
        from public.matrimony_conversations
       where profile_a_id = ${mine}::uuid or profile_b_id = ${mine}::uuid
       order by last_message_at desc
    `;

    const otherIds = convos.map((c) => {
      const row = c as { profile_a_id: string; profile_b_id: string };
      return row.profile_a_id === mine ? row.profile_b_id : row.profile_a_id;
    });

    const cards = new Map<string, MatrimonyProfileCard>();
    if (otherIds.length > 0) {
      const rows = await db`
        select * from public.matrimony_visible_profiles where id = any(${[...new Set(otherIds)]}::uuid[])
      `;
      for (const row of normAll<MatrimonyProfileCard>(rows)) cards.set(row.id, row);
    }

    const conversations = normAll<MatrimonyConversation>(convos)
      .map((c) => ({
        ...c,
        otherProfile: cards.get(c.profile_a_id === mine ? c.profile_b_id : c.profile_a_id),
      }))
      .filter((c) => c.otherProfile != null) as PopulatedConversation[];

    return { conversations, myProfileId: mine };
  });
}

export async function listMessages(userId: string, conversationId: string): Promise<MatrimonyMessage[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.matrimony_messages
       where conversation_id = ${conversationId}::uuid
       order by created_at asc
    `;
    return normAll<MatrimonyMessage>(rows);
  });
}

export async function sendMatrimonyMessage(
  userId: string,
  conversationId: string,
  body: string
): Promise<MatrimonyMessage> {
  return withUser(userId, async (db) => {
    const mine = await myProfileId(db);
    if (!mine) throw new Error('Create your profile first.');

    const rows = await db`
      insert into public.matrimony_messages (conversation_id, sender_profile_id, body)
      values (${conversationId}::uuid, ${mine}::uuid, ${body})
      returning *
    `;
    return norm<MatrimonyMessage>(rows[0]);
  });
}

// ========== DASHBOARD ==========

export async function dashboard(userId: string) {
  return withUser(userId, async (db) => {
    const profile = await one<MatrimonyProfile>(
      await db`select * from public.matrimony_profiles where user_id = ${userId}::uuid`
    );
    if (!profile) return null;

    const [counts, recentInterests, recentViews] = await Promise.all([
      db`
        select
          (select count(*) from public.matrimony_interests where receiver_profile_id = ${profile.id}::uuid) as received,
          (select count(*) from public.matrimony_interests where sender_profile_id   = ${profile.id}::uuid) as sent,
          (select count(*) from public.matrimony_profile_views where viewed_profile_id = ${profile.id}::uuid) as views,
          (select count(*) from public.matrimony_shortlists where target_profile_id  = ${profile.id}::uuid) as shortlisted
      `,
      db`select id, status, created_at, sender_profile_id, receiver_profile_id
           from public.matrimony_interests
          where sender_profile_id = ${profile.id}::uuid or receiver_profile_id = ${profile.id}::uuid
          order by created_at desc limit 5`,
      db`select id, created_at from public.matrimony_profile_views
          where viewed_profile_id = ${profile.id}::uuid order by created_at desc limit 3`,
    ]);

    const recommendations = await db`
      select * from public.matrimony_visible_profiles
       where status = 'approved' and gender <> ${profile.gender} and user_id <> ${userId}::uuid
       limit 4
    `;

    const c = counts[0] as Record<string, string>;
    return {
      profile: norm<MatrimonyProfile>(profile),
      counts: {
        interestsReceived: Number(c.received),
        interestsSent: Number(c.sent),
        profileViews: Number(c.views),
        shortlistedBy: Number(c.shortlisted),
      },
      recentInterests: normAll<Record<string, unknown>>(recentInterests),
      recentViews: normAll<Record<string, unknown>>(recentViews),
      recommendations: normAll<MatrimonyProfileCard>(recommendations),
    };
  });
}

// ========== NOTIFICATIONS ==========

export async function listNotifications(userId: string): Promise<InAppNotification[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.in_app_notifications
       where user_id = ${userId}::uuid order by created_at desc limit 50
    `;
    return normAll<InAppNotification>(rows);
  });
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`update public.in_app_notifications set is_read = true where id = ${id}::uuid`;
  });
}

// ========== ADMIN ==========

export async function adminOverview(adminId: string) {
  return withUser(adminId, async (db) => {
    const [profiles, reports, verifications, audit] = await Promise.all([
      db`select * from public.matrimony_profiles order by created_at desc`,
      db`select * from public.matrimony_reports order by created_at desc`,
      db`select * from public.matrimony_verifications order by created_at desc`,
      db`select * from public.matrimony_admin_audit order by created_at desc limit 100`,
    ]);

    const all = normAll<MatrimonyProfile>(profiles);
    const openReports = normAll<MatrimonyReport>(reports);
    const pendingVerifications = normAll<MatrimonyVerification>(verifications);

    const byStatus = (s: string) => all.filter((p) => p.status === s).length;

    const stats: MatrimonyAdminStats = {
      total_profiles: all.length,
      pending_profiles: byStatus('pending'),
      approved_profiles: byStatus('approved'),
      rejected_profiles: byStatus('rejected'),
      suspended_profiles: byStatus('suspended'),
      new_this_week: 0,
      new_this_month: 0,
      active_profiles: byStatus('approved'),
      interests_sent: 0,
      interests_accepted: 0,
      open_reports: openReports.filter((r) => r.status === 'open').length,
      pending_verifications: pendingVerifications.filter((v) => v.status === 'pending').length,
      success_stories: 0,
    };

    return {
      profiles: all,
      reports: openReports,
      verifications: pendingVerifications,
      audit: normAll<Record<string, unknown>>(audit),
      stats,
    };
  });
}

export async function adminGetProfile(adminId: string, profileId: string) {
  return withUser(adminId, async (db) => {
    const profile = await one<MatrimonyProfile>(
      await db`select * from public.matrimony_profiles where id = ${profileId}::uuid`
    );
    if (!profile) return null;

    const [prefs, contact, media] = await Promise.all([
      db`select * from public.matrimony_preferences where profile_id = ${profileId}::uuid`,
      db`select * from public.matrimony_contacts where profile_id = ${profileId}::uuid`,
      db`select * from public.matrimony_media where profile_id = ${profileId}::uuid`,
    ]);

    return {
      profile: norm<MatrimonyProfile>(profile),
      preferences: prefs[0] ? norm<MatrimonyPreferences>(prefs[0]) : null,
      contact: contact[0] ? norm<MatrimonyContact>(contact[0]) : null,
      media: normAll<MatrimonyMedia>(media),
    };
  });
}

export interface Moderation {
  status: MatrimonyProfileStatus;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  isVerifiedId?: boolean;
  isVerifiedPhoto?: boolean;
  isVerifiedProfession?: boolean;
}

/** Full moderation save: status, badges and internal notes in one transaction. */
export async function adminModerate(
  adminId: string,
  profileId: string,
  m: Moderation
): Promise<void> {
  await withUser(adminId, async (db) => {
    // The owner is notified by the notify_on_matrimony_review trigger, so no
    // notification is written here — clients cannot insert them anyway.
    await db`
      update public.matrimony_profiles
         set status                 = ${m.status},
             rejection_reason       = ${m.rejectionReason ?? null},
             admin_notes            = ${m.adminNotes ?? null},
             is_verified_id         = ${m.isVerifiedId ?? false},
             is_verified_photo      = ${m.isVerifiedPhoto ?? false},
             is_verified_profession = ${m.isVerifiedProfession ?? false},
             reviewed_by            = ${adminId}::uuid,
             reviewed_at            = now()
       where id = ${profileId}::uuid
    `;

    await db`
      insert into public.matrimony_admin_audit
        (admin_user_id, admin_name, action, target_id, target_type, reason)
      values (
        ${adminId}::uuid, 'Admin Moderation',
        ${'moderated_profile_' + m.status}, ${profileId}, 'profile',
        ${m.adminNotes ?? null}
      )
    `;
  });
}

export async function adminSetStatus(
  adminId: string,
  profileId: string,
  status: MatrimonyProfileStatus,
  reason?: string
): Promise<void> {
  await withUser(adminId, async (db) => {
    // The owner is notified by the notify_on_matrimony_review trigger.
    await db`
      update public.matrimony_profiles
         set status = ${status},
             rejection_reason = coalesce(${reason ?? null}, rejection_reason),
             reviewed_by = ${adminId}::uuid,
             reviewed_at = now()
       where id = ${profileId}::uuid
    `;

    await db`
      insert into public.matrimony_admin_audit (admin_user_id, action, target_id, target_type, reason)
      values (${adminId}::uuid, ${'profile_' + status}, ${profileId}, 'profile', ${reason ?? null})
    `;
  });
}
