'use server';

import { requireUserId, requireAdminId, getBusinessUser } from '@/server/auth';
import * as repo from '@/server/repos/business';
import * as invites from '@/server/repos/business-invites';
import { setEventRsvp } from '@/server/repos/home';

/**
 * Server Actions for the business owner module, plus the member RSVP toggle.
 *
 * Every export is a public HTTP endpoint: the caller is resolved from the
 * session, never a parameter, and everything is enforced again by the 0039,
 * 0046 and 0047 policies - an owner cannot verify, feature, or inflate anything
 * from here no matter what the payload says.
 *
 * TWO KINDS OF OWNER reach this file. A member who registered a business before
 * invites existed signs in as a member; an invited business account (0046) has
 * no member profile at all, so requireUserId() would throw for them. ownerId()
 * accepts either and resolves both from the session.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * What the caller is allowed to see about a failure.
 *
 * Anything our own code threw is written for the person reading it and goes
 * through. Anything Postgres threw is masked, because those messages name
 * tables, policies and constraints - with one exception: P0002 is the code the
 * coupon functions raise deliberately ("you have already claimed this offer"),
 * and swallowing it would replace a clear answer with a shrug.
 */
function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code;
  console.error(`[business] ${context}:`, code ?? '', detail);
  const speakable = !code || code === 'P0002';
  return { ok: false, error: speakable ? detail : `${context} failed. Please try again.` };
}

/** The signed-in owner: an invited business account, or a member who owns one. */
async function ownerId(): Promise<string> {
  const business = await getBusinessUser();
  if (business) return business.userId;
  return requireUserId();
}

async function run<T>(context: string, fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(await ownerId()) };
  } catch (error) {
    return fail(context, error);
  }
}

async function runMember<T>(context: string, fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(await requireUserId()) };
  } catch (error) {
    return fail(context, error);
  }
}

async function runAdmin<T>(context: string, fn: (adminId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(await requireAdminId()) };
  } catch (error) {
    return fail(context, error);
  }
}

// ---- The business screen ------------------------------------------------------

export async function fetchBusinessHomeAction(): Promise<ActionResult<repo.BusinessHome>> {
  return run('Loading your business', (uid) => repo.fetchBusinessHome(uid));
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

// ---- Coupons -------------------------------------------------------------------

export async function createCouponAction(
  businessId: string,
  data: Record<string, unknown>
): Promise<ActionResult<repo.BusinessHome>> {
  return run('Creating the coupon', async (uid) => {
    await repo.createCoupon(uid, businessId, data);
    return repo.fetchBusinessHome(uid);
  });
}

export async function updateCouponAction(
  couponId: string,
  data: Record<string, unknown>
): Promise<ActionResult<repo.BusinessHome>> {
  return run('Saving the coupon', async (uid) => {
    await repo.updateCoupon(uid, couponId, data);
    return repo.fetchBusinessHome(uid);
  });
}

export async function deleteCouponAction(couponId: string): Promise<ActionResult<repo.BusinessHome>> {
  return run('Removing the coupon', async (uid) => {
    await repo.deleteCoupon(uid, couponId);
    return repo.fetchBusinessHome(uid);
  });
}

export async function couponActivityAction(): Promise<ActionResult<repo.CouponActivity[]>> {
  return run('Loading coupon activity', (uid) => repo.couponActivity(uid));
}

/** The till: a member shows a code, the business types it in. */
export async function redeemCodeAction(code: string): Promise<ActionResult<repo.RedeemOutcome>> {
  return run('Checking the code', (uid) => repo.redeemCode(uid, code));
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
  return runMember('Updating your RSVP', async (uid) => {
    const result = await setEventRsvp(uid, eventId, going);
    if (going) {
      // The 0049 trigger has just queued the confirmation email and text.
      // Send them from this request rather than waiting for the daily cron:
      // a confirmation that arrives tomorrow is not one. Fire-and-forget,
      // like every other post-write drain here; the cron is the backstop.
      const [{ drainOutbox }, { drainSms }] = await Promise.all([
        import('@/server/email'), import('@/server/sms'),
      ]);
      void drainOutbox(10).catch(() => {});
      void drainSms(10).catch(() => {});
    }
    return result;
  });
}

// ---- Admin: who may log in as a business ----------------------------------------

export async function adminListInvitesAction(): Promise<ActionResult<{
  invites: invites.BusinessInvite[]; logins: invites.BusinessLogin[];
}>> {
  return runAdmin('Loading business logins', async (adminId) => ({
    invites: await invites.listInvites(adminId),
    logins: await invites.listBusinessLogins(adminId),
  }));
}

/**
 * Invite one address to run one business, and send them the link.
 *
 * The token comes back to the admin screen as well as going out by email: the
 * club runs on WhatsApp as much as on mail, and an admin who can see the link
 * can hand it over directly rather than debugging deliverability.
 */
export async function adminInviteBusinessAction(
  businessId: string,
  email: string
): Promise<ActionResult<{ link: string; invites: invites.BusinessInvite[] }>> {
  return runAdmin('Sending the invitation', async (adminId) => {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    const { token } = await invites.createInvite(
      adminId, businessId, email, (t) => `${origin}/business/invite/${t}`
    );

    // Sending is queued inside that transaction; the drain runs after this
    // request the same way every other outbound mail does.
    const { drainOutbox } = await import('@/server/email');
    void drainOutbox(10).catch(() => {});

    return { link: `${origin}/business/invite/${token}`, invites: await invites.listInvites(adminId) };
  });
}

export async function adminRevokeInviteAction(
  inviteId: string
): Promise<ActionResult<invites.BusinessInvite[]>> {
  return runAdmin('Revoking the invitation', async (adminId) => {
    await invites.revokeInvite(adminId, inviteId);
    return invites.listInvites(adminId);
  });
}

export async function adminSetBusinessLoginStatusAction(
  userId: string,
  status: 'active' | 'disabled'
): Promise<ActionResult<invites.BusinessLogin[]>> {
  return runAdmin('Updating the login', async (adminId) => {
    await invites.setBusinessUserStatus(adminId, userId, status);
    return invites.listBusinessLogins(adminId);
  });
}
