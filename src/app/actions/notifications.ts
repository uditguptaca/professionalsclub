'use server';

import { requireUserId } from '@/server/auth';
import * as repo from '@/server/repos/notifications';
import type {
  AppNotification,
  NotificationCounts,
  NotificationPage,
  NotificationPrefs,
} from '@/server/repos/notifications';

/**
 * Server Actions for the notification inbox. Read, mark read, preferences.
 *
 * There is deliberately no "send a notification" action. Rows are written only
 * by the definer triggers in 0032, which know who is entitled to cause each
 * event; an action that took a recipient and a title would be a phishing
 * endpoint dressed as a feature (0033 dropped the function that allowed it).
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[notifications] ${context}:`, detail);
  const safe =
    detail.startsWith('Not signed in') || detail.startsWith('This account is not active');
  return { ok: false, error: safe ? detail : `${context} failed. Please try again.` };
}

async function run<T>(
  context: string,
  fn: (userId: string) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(await requireUserId()) };
  } catch (error) {
    return fail(context, error);
  }
}

export async function listNotificationsAction(opts: {
  category?: string;
  unreadOnly?: boolean;
  before?: string;
  limit?: number;
}): Promise<ActionResult<NotificationPage>> {
  return run('Loading notifications', (uid) => repo.listNotifications(uid, opts));
}

/**
 * The inbox screen in one call: the page, the unread counts the pills need,
 * and the preference switches behind the gear. The page used to fire the list
 * and the counts as two actions, which Next ran back to back, and then fetched
 * prefs on gear-open for a third.
 */
export async function notificationsStartAction(opts: { category?: string } = {}): Promise<
  ActionResult<{ page: NotificationPage; counts: NotificationCounts; prefs: NotificationPrefs }>
> {
  return run('Loading notifications', (uid) => repo.notificationsStart(uid, opts));
}

export async function notificationCountsAction(): Promise<ActionResult<NotificationCounts>> {
  return run('Loading notification counts', (uid) => repo.notificationCounts(uid));
}

export async function markNotificationReadAction(
  id: string
): Promise<ActionResult<NotificationCounts>> {
  return run('Marking read', async (uid) => {
    await repo.markNotificationRead(uid, id);
    return repo.notificationCounts(uid);
  });
}

export async function markAllNotificationsReadAction(
  category?: string
): Promise<ActionResult<NotificationCounts>> {
  return run('Marking all read', async (uid) => {
    await repo.markAllNotificationsRead(uid, category);
    return repo.notificationCounts(uid);
  });
}

export async function updateNotificationPrefsAction(
  patch: Partial<NotificationPrefs>
): Promise<ActionResult<NotificationPrefs>> {
  return run('Saving notification settings', (uid) =>
    repo.updateNotificationPrefs(uid, patch)
  );
}
