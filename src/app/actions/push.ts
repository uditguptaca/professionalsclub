'use server';

import { requireUserId } from '@/server/auth';
import * as repo from '@/server/repos/push';

/**
 * Server Actions for device registration.
 *
 * Two endpoints, both about the CALLER's own device. Neither takes a member id:
 * the definer function behind registerDevice resolves the member from the
 * session, so this cannot be talked into pointing somebody else's phone at your
 * account, or yours at theirs.
 *
 * There is deliberately no "send a push" action, for the same reason there is no
 * "send a notification" action. Pushes exist only as a consequence of a
 * notification row that a trigger decided to write.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[push] ${context}:`, detail);
  const safe =
    detail.startsWith('Not signed in') ||
    detail.startsWith('This account is not active') ||
    detail.startsWith('That device token was not recognised') ||
    detail.startsWith('Unknown platform');
  return { ok: false, error: safe ? detail : `${context} failed.` };
}

const PLATFORMS = ['android', 'ios', 'web'] as const;
type Platform = (typeof PLATFORMS)[number];

export async function registerPushDeviceAction(
  token: string,
  platform: string
): Promise<ActionResult<{ registered: true }>> {
  try {
    const userId = await requireUserId();
    if (!PLATFORMS.includes(platform as Platform)) throw new Error('Unknown platform');
    await repo.registerDevice(userId, token, platform as Platform);
    return { ok: true, data: { registered: true } };
  } catch (error) {
    return fail('Registering this device', error);
  }
}

/**
 * Called on sign-out. Without it, the next person to open the app on a shared
 * or handed-down phone keeps receiving the previous member's notifications.
 */
export async function unregisterPushDeviceAction(
  token: string
): Promise<ActionResult<{ removed: true }>> {
  try {
    await repo.unregisterDevice(await requireUserId(), token);
    return { ok: true, data: { removed: true } };
  } catch (error) {
    return fail('Removing this device', error);
  }
}
