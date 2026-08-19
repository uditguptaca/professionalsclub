'use server';

import { requireUserId, requireAdminId, getCurrentProfile, invalidateProfileCache } from '@/server/auth';
import * as repo from '@/server/repos/portal';
import type { ContentEntity } from '@/server/repos/content';
import type {
  HelpRequest, VolunteerApplication, CaseAssignment, AdminMessage,
  Business, BusinessContactRequest, Member, RequestStatus, VolunteerStatus, BusinessStatus,
} from '@/types';
import type { PortalSnapshot } from '@/server/repos/portal';

/**
 * Server Actions for the portal.
 *
 * Every export here is a public HTTP endpoint. Being in a `'use server'` file is
 * not access control — the browser can invoke any of these directly with any
 * arguments. So each one starts by re-establishing who the caller is
 * (requireUserId / requireAdminId) and never accepts a user id as a parameter.
 *
 * Authorization is applied twice on purpose: here, and again by RLS inside the
 * repository's transaction.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Database errors can carry column names, constraint names and row values.
 * Those are logged server-side and replaced with something safe for the client.
 */
function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[action] ${context}:`, detail);

  const expected =
    detail.startsWith('Not signed in') ||
    detail.startsWith('Administrator access required') ||
    detail.startsWith('This account is not active');

  return { ok: false, error: expected ? detail : `${context} failed. Please try again.` };
}

async function run<T>(context: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return fail(context, error);
  }
}

// ========== READ ==========

export async function loadPortal(): Promise<ActionResult<PortalSnapshot>> {
  return run('Loading portal data', async () => {
    const profile = await getCurrentProfile();
    if (!profile) throw new Error('Not signed in.');
    return repo.loadSnapshot(profile.id, profile.role === 'admin');
  });
}

// ========== HELP REQUESTS ==========

export async function submitHelpRequest(
  input: Record<string, unknown>
): Promise<ActionResult<HelpRequest>> {
  return run('Submitting request', async () =>
    repo.createHelpRequest(await requireUserId(), input)
  );
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus
): Promise<ActionResult<HelpRequest>> {
  return run('Updating request status', async () =>
    repo.setRequestStatus(await requireAdminId(), id, status)
  );
}

export async function addInternalNote(
  requestId: string,
  body: string
): Promise<ActionResult<HelpRequest>> {
  return run('Adding note', async () => {
    const adminId = await requireAdminId();
    const profile = await getCurrentProfile();
    const authorName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email
      : 'Administrator';
    return repo.addInternalNote(adminId, requestId, { authorName, body });
  });
}

// ========== VOLUNTEERS ==========

export async function submitVolunteerApplication(
  input: Record<string, unknown>
): Promise<ActionResult<VolunteerApplication>> {
  return run('Submitting volunteer application', async () =>
    repo.createVolunteerApplication(await requireUserId(), input)
  );
}

export async function updateVolunteerStatus(
  id: string,
  status: VolunteerStatus,
  notes?: string
): Promise<ActionResult<VolunteerApplication>> {
  return run('Updating volunteer application', async () =>
    repo.setVolunteerStatus(await requireAdminId(), id, status, notes)
  );
}

// ========== ASSIGNMENTS ==========

export async function createAssignment(
  input: Record<string, unknown>
): Promise<ActionResult<{ assignment: CaseAssignment; request: HelpRequest }>> {
  return run('Creating assignment', async () =>
    repo.createAssignment(await requireAdminId(), input)
  );
}

// ========== MESSAGES ==========

export async function sendMessage(
  input: Record<string, unknown>
): Promise<ActionResult<AdminMessage>> {
  return run('Sending message', async () => repo.sendMessage(await requireUserId(), input));
}

export async function markMessageRead(id: string): Promise<ActionResult<null>> {
  return run('Marking message read', async () => {
    await repo.markMessageRead(await requireUserId(), id);
    return null;
  });
}

// ========== BUSINESSES ==========

export async function submitBusinessContactRequest(
  input: Record<string, unknown>
): Promise<ActionResult<BusinessContactRequest>> {
  return run('Sending contact request', async () =>
    repo.createBusinessContactRequest(await requireUserId(), input)
  );
}

export async function updateBusinessStatus(
  id: string,
  status: BusinessStatus
): Promise<ActionResult<Business>> {
  return run('Updating business status', async () =>
    repo.setBusinessStatus(await requireAdminId(), id, status)
  );
}

export async function toggleBusinessFeatured(id: string): Promise<ActionResult<Business>> {
  return run('Updating featured flag', async () =>
    repo.toggleBusinessFeatured(await requireAdminId(), id)
  );
}

// ========== CONTENT ==========

export async function createContent<T>(
  entity: ContentEntity,
  data: Record<string, unknown>
): Promise<ActionResult<T>> {
  return run('Saving content', async () =>
    repo.createContent<T>(await requireAdminId(), entity, data)
  );
}

export async function updateContent<T>(
  entity: ContentEntity,
  id: string,
  data: Record<string, unknown>
): Promise<ActionResult<T>> {
  return run('Saving content', async () =>
    repo.updateContent<T>(await requireAdminId(), entity, id, data)
  );
}

export async function deleteContent(
  entity: ContentEntity,
  id: string
): Promise<ActionResult<null>> {
  return run('Deleting content', async () => {
    await repo.deleteContent(await requireAdminId(), entity, id);
    return null;
  });
}

// ========== OWN PROFILE ==========

export async function updateOwnProfile(
  data: Record<string, unknown>
): Promise<ActionResult<Member>> {
  return run('Saving profile', async () => {
    const uid = await requireUserId();
    const result = await repo.updateOwnProfile(uid, data);
    invalidateProfileCache(uid);
    return result;
  });
}


// ========== PUBLIC INQUIRIES ==========

export async function fetchInquiries(
  status: 'new' | 'in_progress' | 'closed'
): Promise<ActionResult<repo.PublicInquiry[]>> {
  return run('Loading enquiries', async () => repo.listInquiries(await requireAdminId(), status));
}

export async function fetchNewInquiryCount(): Promise<ActionResult<number>> {
  return run('Counting enquiries', async () => repo.countNewInquiries(await requireAdminId()));
}

export async function updateInquiryStatus(input: {
  id: string;
  status: 'new' | 'in_progress' | 'closed';
  note?: string;
}): Promise<ActionResult<null>> {
  return run('Updating the enquiry', async () => {
    await repo.setInquiryStatus(await requireAdminId(), input);
    return null;
  });
}

// ========== ADMIN CONTROLS ==========

export async function updateMemberVerification(input: {
  memberId: string;
  // profiles.verification_status accepts exactly these three (0001). Offering
  // a fourth would have shipped a control that always fails the constraint.
  status: 'unverified' | 'pending' | 'verified';
}): Promise<ActionResult<Member>> {
  return run('Updating verification', async () =>
    repo.setMemberVerification(await requireAdminId(), input));
}

export async function updateMemberAccountStatus(input: {
  memberId: string;
  status: 'active' | 'suspended' | 'archived';
}): Promise<ActionResult<Member>> {
  return run('Updating account status', async () => {
    const adminId = await requireAdminId();
    const member = await repo.setMemberAccountStatus(adminId, input);
    // A suspended member must lose access on their next action, not in five
    // minutes when the cached profile expires.
    invalidateProfileCache(input.memberId);
    return member;
  });
}

export async function updateBusinessRequestStatus(input: {
  requestId: string;
  status: string;
  adminNotes?: string;
}): Promise<ActionResult<BusinessContactRequest>> {
  return run('Updating the request', async () =>
    repo.setBusinessRequestStatus(await requireAdminId(), input));
}

export async function fetchPendingMatrimonyPhotos(): Promise<ActionResult<repo.PendingPhoto[]>> {
  return run('Loading photos', async () =>
    repo.listPendingMatrimonyPhotos(await requireAdminId()));
}

export async function updateMatrimonyPhotoApproval(input: {
  mediaId: string;
  decision: 'approved' | 'rejected' | 'pending';
}): Promise<ActionResult<null>> {
  return run('Updating the photo', async () => {
    await repo.setMatrimonyPhotoApproval(await requireAdminId(), input);
    return null;
  });
}

export async function resolveMatrimonyReport(input: {
  reportId: string;
  status: 'reviewed' | 'actioned' | 'dismissed';
  adminNotes?: string;
}): Promise<ActionResult<null>> {
  return run('Resolving the report', async () => {
    await repo.resolveMatrimonyReport(await requireAdminId(), input);
    return null;
  });
}

export async function resolveMatrimonyVerification(input: {
  verificationId: string;
  status: 'approved' | 'rejected';
}): Promise<ActionResult<null>> {
  return run('Resolving the verification', async () => {
    await repo.resolveMatrimonyVerification(await requireAdminId(), input);
    return null;
  });
}

// ========== SAVED BUSINESSES ==========

export async function fetchSavedBusinessIds(): Promise<ActionResult<string[]>> {
  return run('Loading saved businesses', async () =>
    repo.listSavedBusinessIds(await requireUserId()));
}

export async function toggleSaveBusiness(
  businessId: string
): Promise<ActionResult<{ saved: boolean }>> {
  return run('Saving the business', async () =>
    repo.toggleSavedBusiness(await requireUserId(), businessId));
}

// ========== HOME FEED ==========

export async function fetchHomeFeed(): Promise<ActionResult<import('@/server/repos/home').HomeFeed>> {
  return run('Loading your home feed', async () => {
    const { fetchHomeFeed: load } = await import('@/server/repos/home');
    return load(await requireUserId());
  });
}

/**
 * Switch the member's community city. Reuses the existing own-profile update
 * path (column allowlist + RLS), then invalidates the cached profile so the
 * next feed load sees the new city.
 */
export async function updateMyCity(city: string): Promise<ActionResult<null>> {
  return run('Updating your city', async () => {
    const uid = await requireUserId();
    const trimmed = city.trim().slice(0, 80);
    if (trimmed.length < 2) throw new Error('Choose a city.');
    await repo.updateOwnProfile(uid, { city: trimmed });
    invalidateProfileCache(uid);
    return null;
  });
}
