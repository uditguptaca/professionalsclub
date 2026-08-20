'use server';

import { requireUserId, requireAdminId } from '@/server/auth';
import * as repo from '@/server/repos/referrals';
import { drainOutbox } from '@/server/email';
import { syncCompany } from '@/server/jobs/sync';
import { detectSource, type SourceKind } from '@/server/jobs/sources';
import type { Company, CompanyJob, CompanyInsider } from '@/types';

/**
 * Referral actions.
 *
 * Every one of these is a public HTTP endpoint, so every one starts with
 * requireUserId() or requireAdminId(), and none accepts a member id: who is
 * asking is always resolved from the session. The privacy rules themselves live
 * in the database (0013) rather than here, so an action added later cannot
 * forget them.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  console.error(`[referrals] ${context}:`, error);
  return { ok: false, error: message };
}

async function run<T>(context: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return fail(context, error);
  }
}

// ========================================================== Read

export async function fetchCompanies(): Promise<ActionResult<Company[]>> {
  return run('Loading companies', async () => repo.listCompanies(await requireUserId()));
}

export async function fetchCompanyJobs(companyId: string): Promise<ActionResult<CompanyJob[]>> {
  return run('Loading roles', async () =>
    repo.listCompanyJobs(await requireUserId(), companyId));
}

/**
 * Everything the member-facing referrals screen needs, in one call — Next runs a
 * client's Server Action calls one at a time, so three calls here would be three
 * sequential round trips.
 */
export async function fetchReferralHome(): Promise<ActionResult<{
  companies: Company[];
  myRoles: CompanyInsider[];
}>> {
  return run('Loading referrals', async () => {
    const uid = await requireUserId();
    return {
      companies: await repo.listCompanies(uid),
      myRoles: await repo.listMyInsiderRoles(uid),
    };
  });
}

export async function fetchMyInsiderRoles(): Promise<ActionResult<CompanyInsider[]>> {
  return run('Loading your companies', async () =>
    repo.listMyInsiderRoles(await requireUserId()));
}

// ========================================================== Insider opt-in

export async function saveWhereIWork(input: {
  companyId: string;
  jobTitle?: string;
  canRefer: boolean;
  notifyEmail: boolean;
}): Promise<ActionResult<CompanyInsider[]>> {
  return run('Saving your company', async () => {
    const uid = await requireUserId();
    await repo.saveInsiderRole(uid, input);
    return repo.listMyInsiderRoles(uid);
  });
}

export async function removeWhereIWork(companyId: string): Promise<ActionResult<CompanyInsider[]>> {
  return run('Removing your company', async () => {
    const uid = await requireUserId();
    await repo.removeInsiderRole(uid, companyId);
    return repo.listMyInsiderRoles(uid);
  });
}

// ========================================================== Requests

// requestReferral / withdrawReferral / respondToReferralRequest retired in the
// 0018 overhaul - direct referrals live in src/app/actions/chat.ts.

// ========================================================== Admin

export async function adminFetchCompanies(): Promise<ActionResult<Company[]>> {
  return run('Loading companies', async () =>
    repo.listCompaniesAdmin(await requireAdminId()));
}

export async function adminSaveCompany(
  input: Record<string, unknown>
): Promise<ActionResult<Company[]>> {
  return run('Saving the company', async () => {
    const adminId = await requireAdminId();
    await repo.upsertCompany(adminId, input);
    return repo.listCompaniesAdmin(adminId);
  });
}

export async function adminAddManualJob(input: {
  companyId: string;
  title: string;
  location?: string;
  applyUrl: string;
  department?: string;
}): Promise<ActionResult<CompanyJob>> {
  return run('Adding the role', async () =>
    repo.addManualJob(await requireAdminId(), input));
}

export async function adminSetJobOpen(
  jobId: string,
  isOpen: boolean
): Promise<ActionResult<null>> {
  return run('Updating the role', async () => {
    await repo.setJobOpen(await requireAdminId(), jobId, isOpen);
    return null;
  });
}

/** Pull one company's feed now and report what changed. */
export async function adminSyncCompany(companyId: string): Promise<ActionResult<{
  added: number; updated: number; closed: number; error?: string; companies: Company[];
}>> {
  return run('Syncing roles', async () => {
    const adminId = await requireAdminId();
    const result = await syncCompany(companyId);
    return { ...result, companies: await repo.listCompaniesAdmin(adminId) };
  });
}

/**
 * Work out a company's feed from its careers URL by actually calling the
 * candidates. Returns null when nothing answered, which is a real answer: it
 * means this employer needs manual roles or a link-out.
 */
export async function adminDetectSource(careersUrl: string): Promise<ActionResult<{
  kind: SourceKind; config: Record<string, string>; jobCount: number;
} | null>> {
  return run('Detecting the job feed', async () => {
    await requireAdminId();
    if (!/^https?:\/\//.test(careersUrl)) throw new Error('Enter the full careers URL.');
    return detectSource(careersUrl);
  });
}

/** Drain queued mail by hand, so an admin can see whether sending works. */
export async function adminDrainEmail(): Promise<ActionResult<{
  sent: number; failed: number; skipped: number; configured: boolean;
}>> {
  return run('Sending queued email', async () => {
    await requireAdminId();
    const { emailConfigured } = await import('@/server/email');
    const result = await drainOutbox(100);
    return { ...result, configured: emailConfigured() };
  });
}
