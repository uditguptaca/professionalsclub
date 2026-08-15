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

export async function archiveOwnAccount(): Promise<ActionResult<null>> {
  return run('Closing account', async () => {
    const uid = await requireUserId();
    await repo.archiveOwnAccount(uid);
    invalidateProfileCache(uid);
    return null;
  });
}
