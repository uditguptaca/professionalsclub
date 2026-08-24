import 'server-only';
import { withUser, withUserRead, type Db } from '@/server/db';

/**
 * The notification inbox.
 *
 * Nothing here produces a notification. Every row is written by a SECURITY
 * DEFINER trigger (0032) calling notify_member(), which is deliberately not
 * callable by a member session — otherwise any member could post a row titled
 * "Your account needs verification" with a link of their choosing into anyone
 * else's inbox. This file only reads, marks read, and manages preferences, and
 * a member's RLS grant is SELECT plus UPDATE on is_read alone (0034).
 *
 * Collapse: a producer passes a group_key, and notify_member folds repeat
 * events into the one live row, counting them in event_count. Twelve messages
 * in one chat is one row that says 12, and marking it read starts a fresh row
 * for the next batch. That is what the partial unique index in 0031 enforces.
 */

/** Module buckets. Ordered as the inbox filter renders them. */
export const NOTIFICATION_CATEGORIES = [
  'chat',
  'social',
  'referral',
  'matrimony',
  'community',
  'help',
  'volunteer',
  'event',
  'admin',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface AppNotification {
  id: string;
  category: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  /** How many events this row stands for. 1 unless it collapsed. */
  eventCount: number;
  actorId: string | null;
  actorFirstName: string | null;
  actorLastName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  /** True when another page exists behind this one. */
  hasMore: boolean;
}

/** Unread counts, for the bell badge and the filter pills. */
export interface NotificationCounts {
  total: number;
  byCategory: Record<string, number>;
}

/** Per-module switches. A member with no saved row has everything on. */
export interface NotificationPrefs {
  chat: boolean;
  social: boolean;
  referral: boolean;
  matrimony: boolean;
  community: boolean;
  help: boolean;
  event: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  chat: true,
  social: true,
  referral: true,
  matrimony: true,
  community: true,
  help: true,
  event: true,
};

const PAGE_SIZE = 25;

/** The inbox row shape, shared by the paged read and the combined one. */
const ROW_SELECT = `
  n.id, n.category, n.type, n.title, n.body, n.link, n.is_read,
  n.event_count, n.actor_id,
  m.first_name as actor_first_name, m.last_name as actor_last_name,
  n.created_at, n.updated_at
`;

interface Row {
  id: string;
  category: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  event_count: number;
  actor_id: string | null;
  actor_first_name: string | null;
  actor_last_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

const mapRow = (r: Row): AppNotification => ({
  id: r.id,
  category: r.category,
  type: r.type,
  title: r.title,
  body: r.body ?? '',
  link: r.link,
  isRead: r.is_read,
  eventCount: r.event_count,
  actorId: r.actor_id,
  actorFirstName: r.actor_first_name,
  actorLastName: r.actor_last_name,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

/**
 * One page of the inbox, newest activity first. Ordered by updated_at, not
 * created_at, so a collapsed row moves back to the top when it collects a new
 * event instead of sitting wherever the first message of the batch landed.
 *
 * `category` narrows to one module; `before` is the previous page's last
 * updated_at, keyset-style, so paging does not drift as new rows arrive.
 */
export async function listNotifications(
  userId: string,
  opts: { category?: string; unreadOnly?: boolean; before?: string; limit?: number } = {}
): Promise<NotificationPage> {
  return withUserRead(userId, (db) => listNotificationsOn(db, userId, opts));
}

/**
 * The query bodies without their transaction, so notificationsStart below can
 * run all three on ONE connection - and inside one Server Action, which is the
 * round trip the member actually waits for.
 */
export async function listNotificationsOn(
  db: Db,
  userId: string,
  opts: { category?: string; unreadOnly?: boolean; before?: string; limit?: number } = {}
): Promise<NotificationPage> {
  const limit = Math.min(Math.max(opts.limit ?? PAGE_SIZE, 1), 100);
  const category =
    opts.category && (NOTIFICATION_CATEGORIES as readonly string[]).includes(opts.category)
      ? opts.category
      : null;

  const rows = await db.run<Row>(
      `select ${ROW_SELECT}
         from public.in_app_notifications n
         left join public.member_names m on m.id = n.actor_id
        where n.user_id = $1
          and ($2::text is null or n.category = $2)
          and ($3::boolean is not true or not n.is_read)
          and ($4::timestamptz is null or n.updated_at < $4)
        order by n.updated_at desc
        limit $5`,
      [userId, category, opts.unreadOnly ?? false, opts.before ?? null, limit + 1]
    );

  return {
    items: rows.slice(0, limit).map(mapRow),
    hasMore: rows.length > limit,
  };
}

/** Unread totals for the badges. One round trip. */
export async function notificationCountsOn(db: Db, userId: string): Promise<NotificationCounts> {
  const rows = await db.run<{ category: string; n: number }>(
    `select category, count(*)::int as n
       from public.in_app_notifications
      where user_id = $1 and not is_read
      group by category`,
    [userId]
  );
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byCategory[r.category] = r.n;
    total += r.n;
  }
  return { total, byCategory };
}

export async function notificationCounts(userId: string): Promise<NotificationCounts> {
  return withUserRead(userId, (db) => notificationCountsOn(db, userId));
}

/** Mark one row read. RLS scopes it to the caller's own inbox. */
export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `update public.in_app_notifications set is_read = true
        where id = $1 and user_id = $2 and not is_read`,
      [id, userId]
    );
  });
}

/** Mark everything read, or everything in one module. */
export async function markAllNotificationsRead(
  userId: string,
  category?: string
): Promise<void> {
  const cat =
    category && (NOTIFICATION_CATEGORIES as readonly string[]).includes(category)
      ? category
      : null;
  await withUser(userId, async (db) => {
    await db.run(
      `update public.in_app_notifications set is_read = true
        where user_id = $1 and not is_read
          and ($2::text is null or category = $2)`,
      [userId, cat]
    );
  });
}

export async function notificationPrefsOn(db: Db, userId: string): Promise<NotificationPrefs> {
  const rows = await db.run<NotificationPrefs>(
    `select chat, social, referral, matrimony, community, help, event
       from public.notification_prefs where member_id = $1`,
    [userId]
  );
  return rows[0] ?? DEFAULT_NOTIFICATION_PREFS;
}

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  return withUserRead(userId, (db) => notificationPrefsOn(db, userId));
}

/**
 * The whole inbox screen in ONE statement: the page, the unread counts the
 * filter pills need, and the preference switches behind the gear.
 *
 * One statement, not three sequential ones in a shared transaction — that
 * distinction is the whole point. The database is remote (~0.5s per round
 * trip from a distant client), and Next runs a client's Server Action calls
 * one at a time, so what a page pays is (actions x queries-per-action) round
 * trips. Collapsing to one statement makes this page cost exactly one.
 */
export async function notificationsStart(
  userId: string,
  opts: { category?: string } = {}
): Promise<{ page: NotificationPage; counts: NotificationCounts; prefs: NotificationPrefs }> {
  const category =
    opts.category && (NOTIFICATION_CATEGORIES as readonly string[]).includes(opts.category)
      ? opts.category
      : null;

  return withUserRead(userId, async (db) => {
    const rows = await db.run<{
      items: Row[] | null;
      counts: { category: string; n: number }[] | null;
      prefs: NotificationPrefs | null;
    }>(
      `select
         (select coalesce(json_agg(t order by t.updated_at desc), '[]'::json) from (
            select ${ROW_SELECT}
              from public.in_app_notifications n
              left join public.member_names m on m.id = n.actor_id
             where n.user_id = $1
               and ($2::text is null or n.category = $2)
             order by n.updated_at desc
             limit $3
         ) t) as items,
         (select coalesce(json_agg(t), '[]'::json) from (
            select category, count(*)::int as n
              from public.in_app_notifications
             where user_id = $1 and not is_read
             group by category
         ) t) as counts,
         (select to_json(p) from public.notification_prefs p where p.member_id = $1) as prefs`,
      [userId, category, PAGE_SIZE + 1]
    );

    const row = rows[0] ?? {};
    const items = row.items ?? [];
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const c of row.counts ?? []) {
      byCategory[c.category] = c.n;
      total += c.n;
    }
    return {
      page: {
        items: items.slice(0, PAGE_SIZE).map(mapRow),
        hasMore: items.length > PAGE_SIZE,
      },
      counts: { total, byCategory },
      prefs: row.prefs ?? DEFAULT_NOTIFICATION_PREFS,
    };
  });
}

/**
 * Save preferences. The patch is filtered against the known keys rather than
 * spread into SQL, so an extra field in the payload cannot reach a column.
 */
export async function updateNotificationPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>
): Promise<NotificationPrefs> {
  const keys = Object.keys(DEFAULT_NOTIFICATION_PREFS) as (keyof NotificationPrefs)[];
  const current = await getNotificationPrefs(userId);
  const next: NotificationPrefs = { ...current };
  for (const k of keys) {
    if (typeof patch[k] === 'boolean') next[k] = patch[k] as boolean;
  }

  return withUser(userId, async (db) => {
    await db.run(
      `insert into public.notification_prefs
         (member_id, chat, social, referral, matrimony, community, help, event, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())
       on conflict (member_id) do update set
         chat = excluded.chat, social = excluded.social,
         referral = excluded.referral, matrimony = excluded.matrimony,
         community = excluded.community, help = excluded.help,
         event = excluded.event, updated_at = now()`,
      [
        userId,
        next.chat,
        next.social,
        next.referral,
        next.matrimony,
        next.community,
        next.help,
        next.event,
      ]
    );
    return next;
  });
}
