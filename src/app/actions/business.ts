'use server';

import { requireUserId } from '@/server/auth';
import * as repo from '@/server/repos/business';
import { setEventRsvp } from '@/server/repos/home';

/**
 * Server Actions for the business owner module, plus the member RSVP toggle.
 *
 * Every export is a public HTTP endpoint: the caller is resolved from the
 * session, never a parameter, and everything is enforced again by the 0039
 * policies and guard triggers - an owner cannot verify, feature, or inflate
 * anything from here no matter what the payload says.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[business] ${context}:`, detail);
  const safe =
    detail.startsWith('Not signed in') ||
    detail.startsWith('This account is not active') ||
    detail.startsWith('Business name is required') ||
    detail.startsWith('Pick a category') ||
    detail.startsWith('Pick a city') ||
    detail.startsWith('You already have a business') ||
    detail.startsWith('Offer title is required') ||
    detail.startsWith('Event title is required') ||
    detail.startsWith('Location is required');
  return { ok: false, error: safe ? detail : `${context} failed. Please try again.` };
}

async function run<T>(context: string, fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(await requireUserId()) };
  } catch (error) {
    return fail(context, error);
  }
}

// ---- The business screen ------------------------------------------------------

export async function fetchBusinessHomeAction(): Promise<ActionResult<repo.BusinessHome>> {
  return run('Loading your business', (uid) => repo.fetchBusinessHome(uid));
}

export async function registerBusinessAction(data: {
  name: string; category: string; city: string; province: string;
  descriptionShort?: string; phone?: string; email?: string; website?: string;
}): Promise<ActionResult<{ id: string; slug: string }>> {
  return run('Registering your business', (uid) => repo.registerBusiness(uid, data));
}

export async function updateMyBusinessAction(
  businessId: string,
  data: Record<string, unknown>
): Promise<ActionResult<repo.BusinessHome>> {
  return run('Saving your business page', async (uid) => {
    await repo.updateMyBusiness(uid, businessId, data);
    return repo.fetchBusinessHome(uid);
  });
}

// ---- Offers -------------------------------------------------------------------

export async function createOfferAction(
  businessId: string,
  data: Record<string, unknown>
): Promise<ActionResult<repo.BusinessHome>> {
  return run('Creating the offer', async (uid) => {
    await repo.createOffer(uid, businessId, data);
    return repo.fetchBusinessHome(uid);
  });
}

export async function updateOfferAction(
  offerId: string,
  data: Record<string, unknown>
): Promise<ActionResult<repo.BusinessHome>> {
  return run('Saving the offer', async (uid) => {
    await repo.updateOffer(uid, offerId, data);
    return repo.fetchBusinessHome(uid);
  });
}

export async function deleteOfferAction(offerId: string): Promise<ActionResult<repo.BusinessHome>> {
  return run('Removing the offer', async (uid) => {
    await repo.deleteOffer(uid, offerId);
    return repo.fetchBusinessHome(uid);
  });
}

// ---- Business events ------------------------------------------------------------

export async function createBusinessEventAction(
  businessId: string,
  data: Record<string, unknown>
): Promise<ActionResult<repo.BusinessHome>> {
  return run('Creating the event', async (uid) => {
    await repo.createBusinessEvent(uid, businessId, data);
    return repo.fetchBusinessHome(uid);
  });
}

export async function updateBusinessEventAction(
  eventId: string,
  data: Record<string, unknown>
): Promise<ActionResult<repo.BusinessHome>> {
  return run('Saving the event', async (uid) => {
    await repo.updateBusinessEvent(uid, eventId, data);
    return repo.fetchBusinessHome(uid);
  });
}

export async function deleteBusinessEventAction(eventId: string): Promise<ActionResult<repo.BusinessHome>> {
  return run('Removing the event', async (uid) => {
    await repo.deleteBusinessEvent(uid, eventId);
    return repo.fetchBusinessHome(uid);
  });
}

// ---- Member RSVP ---------------------------------------------------------------

export async function rsvpEventAction(
  eventId: string,
  going: boolean
): Promise<ActionResult<{ going: number; myRsvp: boolean }>> {
  return run('Updating your RSVP', (uid) => setEventRsvp(uid, eventId, going));
}
