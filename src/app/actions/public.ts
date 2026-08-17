'use server';

import * as repo from '@/server/repos/public-content';

/**
 * Reads for the public marketing pages.
 *
 * No authentication, by design — these run as app_anonymous and can only reach
 * published rows. They are actions rather than direct repository imports so the
 * pages can stay client components without pulling the database driver into the
 * browser bundle.
 */

export async function getVerifiedBusinesses() {
  return repo.listVerifiedBusinesses();
}

export async function getBusinessBySlug(slug: string) {
  return repo.getBusinessBySlug(slug);
}

export async function getUpcomingEvents() {
  return repo.listUpcomingEvents();
}

export async function getPublicVideos() {
  return repo.listVideos();
}

/**
 * Everything the marketing pages render that an admin manages in the portal:
 * jobs, news, team, donation campaigns, e-books, workshops, templates, events.
 * One call so a page pays one round trip instead of eight.
 */
export async function getPublicContent() {
  return repo.loadPublicContent();
}

// ========== PUBLIC WRITES ==========

export type PublicResult = { ok: true } | { ok: false; error: string };

/**
 * The validation messages raised by the SECURITY DEFINER functions are written
 * for visitors, so they pass through. Anything else is logged and replaced.
 */
function toPublicError(context: string, error: unknown): PublicResult {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[action] ${context}:`, detail);
  const friendly = detail.startsWith('Please ') ? detail : `${context} failed. Please try again.`;
  return { ok: false, error: friendly };
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
}): Promise<PublicResult> {
  try {
    await repo.submitInquiry({ kind: 'contact', ...input });
    return { ok: true };
  } catch (error) {
    return toPublicError('Sending your message', error);
  }
}

export async function submitVolunteerHelpRequest(input: {
  name: string;
  email: string;
  message: string;
  phone?: string;
  requestedFor?: string;
  category?: string;
}): Promise<PublicResult> {
  try {
    await repo.submitInquiry({ kind: 'volunteer_help', ...input });
    return { ok: true };
  } catch (error) {
    return toPublicError('Sending your request', error);
  }
}

export async function submitBusinessListing(
  input: repo.BusinessApplicationInput
): Promise<PublicResult> {
  try {
    await repo.submitBusinessApplication(input);
    return { ok: true };
  } catch (error) {
    return toPublicError('Submitting your application', error);
  }
}

export async function getPublicVolunteers() {
  return repo.listPublicVolunteers();
}
