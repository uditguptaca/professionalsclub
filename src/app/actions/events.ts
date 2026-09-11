'use server';

import { requireUserId, requireAdminId, requireCuratorId } from '@/server/auth';
import * as repo from '@/server/repos/events';
import * as offers from '@/server/repos/offers';

/**
 * Events and member offers.
 *
 * Who may do what is decided in Postgres (0045 for events, 0047 for coupons):
 * a volunteer may post club events and touch only their own, a business waits
 * for an admin, and a member can claim a coupon exactly as often as its caps
 * allow. The requireX() calls here are for the error MESSAGE - they turn a
 * policy violation into a sentence - and never for the decision itself.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code;
  console.error(`[events] ${context}:`, code ?? '', detail);
  // P0002 is what the coupon functions raise on purpose ("you have already
  // claimed this offer"); every other database code names internals.
  const speakable = !code || code === 'P0002';
  return { ok: false, error: speakable ? detail : `${context} failed. Please try again.` };
}

async function run<T>(context: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return fail(context, error);
  }
}

// ---- Members --------------------------------------------------------------------

export async function fetchEventAction(eventId: string): Promise<ActionResult<repo.EventDetail | null>> {
  return run('Loading the event', async () => {
    const userId = await requireUserId();
    if (typeof eventId !== 'string' || eventId.length !== 36) return null;
    return repo.eventDetail(userId, eventId);
  });
}

export async function fetchOffersAction(): Promise<ActionResult<offers.OffersHome>> {
  return run('Loading member offers', async () => offers.offersHome(await requireUserId()));
}

/** One business, as a member sees it: their offers, their events, my codes. */
export async function fetchBusinessPageAction(
  slug: string
): Promise<ActionResult<offers.MemberBusinessPage | null>> {
  return run('Loading the business', async () => {
    const userId = await requireUserId();
    if (typeof slug !== 'string' || slug.length < 1 || slug.length > 120) return null;
    return offers.memberBusinessPage(userId, slug);
  });
}

/** Claim a coupon code. Every rule that says no lives in claim_coupon(). */
export async function claimCouponAction(couponId: string): Promise<ActionResult<offers.ClaimResult>> {
  return run('Claiming the offer', async () => {
    const userId = await requireUserId();
    if (typeof couponId !== 'string' || couponId.length !== 36) throw new Error('Unknown offer.');
    return offers.claimCoupon(userId, couponId);
  });
}

// ---- Curators (admins and volunteers) -------------------------------------------

export async function fetchMyEventsAction(): Promise<ActionResult<repo.EventDetail[]>> {
  return run('Loading your events', async () => repo.listMyEvents(await requireCuratorId()));
}

export async function createClubEventAction(
  data: Record<string, unknown>
): Promise<ActionResult<repo.EventDetail[]>> {
  return run('Creating the event', async () => {
    const userId = await requireCuratorId();
    await repo.createEvent(userId, data, null);
    return repo.listMyEvents(userId);
  });
}

export async function updateClubEventAction(
  eventId: string,
  data: Record<string, unknown>
): Promise<ActionResult<repo.EventDetail[]>> {
  return run('Saving the event', async () => {
    const userId = await requireCuratorId();
    await repo.updateEvent(userId, eventId, data);
    return repo.listMyEvents(userId);
  });
}

export async function deleteClubEventAction(eventId: string): Promise<ActionResult<repo.EventDetail[]>> {
  return run('Removing the event', async () => {
    const userId = await requireCuratorId();
    await repo.deleteEvent(userId, eventId);
    return repo.listMyEvents(userId);
  });
}

// ---- Admin moderation -------------------------------------------------------------

export async function fetchModerationQueueAction(): Promise<ActionResult<repo.PendingEvent[]>> {
  return run('Loading the queue', async () => repo.moderationQueue(await requireAdminId()));
}

export async function moderateEventAction(
  eventId: string,
  status: 'approved' | 'rejected',
  note: string
): Promise<ActionResult<repo.PendingEvent[]>> {
  return run('Saving your decision', async () => {
    const adminId = await requireAdminId();
    await repo.setEventModeration(adminId, eventId, status, String(note ?? ''));
    return repo.moderationQueue(adminId);
  });
}
