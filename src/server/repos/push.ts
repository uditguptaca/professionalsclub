import 'server-only';
import { withUser, withUserRead, withElevated } from '@/server/db';

/**
 * Device tokens and the push queue.
 *
 * Two kinds of function live here, and the split is load-bearing.
 *
 * Registration runs as the member (withUser): they own their own devices.
 *
 * Claiming and cleanup run as the owner (withElevated), for the same reason the
 * email outbox drain does: resolving OTHER members' device tokens is exactly
 * what a member session must never be able to do. The claim is deliberately one
 * statement per call, so the transaction closes before any HTTP happens — see
 * the note in drain.ts about why holding a connection through a fan-out is a
 * self-inflicted outage.
 */

export interface PushJob {
  notificationId: string;
  memberId: string;
  category: string;
  title: string;
  body: string;
  link: string | null;
  groupKey: string | null;
  eventCount: number;
  /** Total unread for this member, for the iOS app badge. */
  unreadTotal: number;
  tokens: string[];
  platforms: string[];
}

interface ClaimRow {
  notification_id: string;
  member_id: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  group_key: string | null;
  event_count: number;
  unread_total: number;
  tokens: string[];
  platforms: string[];
}

/** Register (or refresh) this device against the signed-in member. */
export async function registerDevice(
  userId: string,
  token: string,
  platform: 'android' | 'ios' | 'web'
): Promise<void> {
  await withUser(userId, async (db) => {
    // The function resolves the member from the session, not from an argument.
    await db.run(`select public.register_push_device($1, $2)`, [token, platform]);
  });
}

/**
 * Forget this device. Called on sign-out: the next person to use a shared phone
 * must not receive the previous member's notifications.
 */
export async function unregisterDevice(userId: string, token: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(`delete from public.push_devices where token = $1 and member_id = $2`, [
      token,
      userId,
    ]);
  });
}

/** How many devices this member has registered. No tokens returned. */
export async function myDeviceCount(userId: string): Promise<number> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<{ n: number }>(
      `select count(*)::int as n from public.push_devices where member_id = $1`,
      [userId]
    );
    return rows[0]?.n ?? 0;
  });
}

/**
 * Take up to `limit` notifications owed a push, stamping them as claimed.
 *
 * At-most-once: the stamp happens here, before the send. A crash between this
 * and the HTTP call drops that push. For a notification already sitting in the
 * member's inbox, a missed buzz beats a duplicate one.
 */
export async function claimPushBatch(limit: number): Promise<PushJob[]> {
  return withElevated(async (db) => {
    const rows = await db.run<ClaimRow>(`select * from public.claim_push_batch($1)`, [limit]);
    return rows.map((r) => ({
      notificationId: r.notification_id,
      memberId: r.member_id,
      category: r.category,
      title: r.title,
      body: r.body ?? '',
      link: r.link,
      groupKey: r.group_key,
      eventCount: r.event_count,
      unreadTotal: r.unread_total,
      tokens: r.tokens ?? [],
      platforms: r.platforms ?? [],
    }));
  });
}

/** Drop tokens FCM told us are dead. One short transaction, after the sends. */
export async function deleteDeadTokens(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;
  return withElevated(async (db) => {
    const rows = await db.run<{ delete_push_tokens: number }>(
      `select public.delete_push_tokens($1::text[]) as delete_push_tokens`,
      [tokens]
    );
    return rows[0]?.delete_push_tokens ?? 0;
  });
}

/** Notifications still owed a push. For the cron route's health report. */
export async function pushPendingCount(): Promise<number> {
  return withElevated(async (db) => {
    const rows = await db.run<{ push_pending_count: number }>(
      `select public.push_pending_count() as push_pending_count`
    );
    return rows[0]?.push_pending_count ?? 0;
  });
}
