'use server';

import { requireUserId, requireAdminId } from '@/server/auth';
import * as repo from '@/server/repos/matrimony';
import type { BrowseFilters, Moderation } from '@/server/repos/matrimony';
import type { MatrimonyProfileStatus } from '@/types/matrimony';

/**
 * Server Actions for the matrimony module.
 *
 * Same rule as the portal actions: each export is a public endpoint, so each one
 * re-establishes the caller. Note that none of these take a "my profile id"
 * parameter — the caller's own matrimony profile is resolved server-side from
 * their user id, so one member cannot act as another by passing a different id.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[matrimony] ${context}:`, detail);

  // Messages written by the repositories are safe to show; anything else could
  // be a database error carrying column or constraint names.
  const safe =
    detail.startsWith('Not signed in') ||
    detail.startsWith('Administrator access required') ||
    detail.startsWith('This account is not active') ||
    detail.startsWith('Create your profile first') ||
    detail.startsWith('only the recipient');

  return { ok: false, error: safe ? detail : `${context} failed. Please try again.` };
}

async function run<T>(context: string, fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
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

// ========== MY PROFILE ==========

export async function getMyMatrimony() {
  return run('Loading your profile', (uid) => repo.getMine(uid));
}

export async function saveMatrimonyProfile(
  data: Record<string, unknown>,
  status?: MatrimonyProfileStatus
) {
  return run('Saving your profile', (uid) => repo.saveProfile(uid, data, status));
}

export async function saveMatrimonyPreferences(data: Record<string, unknown>) {
  return run('Saving preferences', (uid) => repo.savePreferences(uid, data));
}

export async function saveMatrimonyContact(data: Record<string, unknown>) {
  return run('Saving contact details', (uid) => repo.saveContact(uid, data));
}

export async function deleteMyMatrimonyProfile() {
  return run('Deleting your profile', (uid) => repo.deleteMine(uid));
}

// ========== BROWSE ==========

export async function browseProfiles(filters: BrowseFilters = {}) {
  return run('Loading profiles', (uid) => repo.browse(uid, filters));
}

/** Same query, plus the unpaged total the browse page needs for its pager. */
export async function browseProfilesPaged(filters: BrowseFilters = {}) {
  return run('Loading profiles', (uid) => repo.browsePaged(uid, filters));
}

export async function getProfileDetail(profileId: string) {
  return run('Loading profile', (uid) => repo.getVisibleProfile(uid, profileId));
}

export async function getMatrimonyDashboard() {
  return run('Loading dashboard', (uid) => repo.dashboard(uid));
}

// ========== INTERESTS ==========

export async function listInterests() {
  return run('Loading interests', (uid) => repo.listInterests(uid));
}

export async function sendInterest(targetProfileId: string) {
  return run('Sending interest', (uid) => repo.sendInterest(uid, targetProfileId));
}

export async function respondToInterest(interestId: string, accept: boolean) {
  return run('Responding to interest', (uid) => repo.respondToInterest(uid, interestId, accept));
}

// ========== SHORTLIST / SAFETY ==========

export async function listShortlist() {
  return run('Loading shortlist', (uid) => repo.listShortlist(uid));
}

export async function addToShortlist(targetProfileId: string) {
  return run('Updating shortlist', (uid) => repo.addToShortlist(uid, targetProfileId));
}

export async function removeFromShortlist(targetProfileId: string) {
  return run('Updating shortlist', (uid) => repo.removeFromShortlist(uid, targetProfileId));
}

export async function blockProfile(targetProfileId: string) {
  return run('Blocking profile', (uid) => repo.blockProfile(uid, targetProfileId));
}

export async function reportProfile(targetProfileId: string, reason: string, details?: string) {
  return run('Reporting profile', (uid) => repo.reportProfile(uid, targetProfileId, reason, details));
}

export async function requestPhotoAccess(targetProfileId: string) {
  return run('Requesting photo access', (uid) => repo.requestPhotoAccess(uid, targetProfileId));
}

export async function saveSearch(name: string, filters: Record<string, unknown>, notify: boolean) {
  return run('Saving search', (uid) => repo.saveSearch(uid, name, filters, notify));
}

export async function listBlockedIds() {
  return run('Loading blocks', (uid) => repo.listBlockedIds(uid));
}

// ========== MESSAGES ==========

export async function listConversations() {
  return run('Loading conversations', (uid) => repo.listConversations(uid));
}

export async function listMessages(conversationId: string) {
  return run('Loading messages', (uid) => repo.listMessages(uid, conversationId));
}

export async function sendMatrimonyMessage(conversationId: string, body: string) {
  return run('Sending message', (uid) => {
    const trimmed = body.trim();
    if (!trimmed) throw new Error('Message cannot be empty.');
    return repo.sendMatrimonyMessage(uid, conversationId, trimmed);
  });
}

// ========== NOTIFICATIONS ==========

export async function listNotifications() {
  return run('Loading notifications', (uid) => repo.listNotifications(uid));
}

export async function markNotificationRead(id: string) {
  return run('Updating notification', (uid) => repo.markNotificationRead(uid, id));
}

// ========== ADMIN ==========

export async function adminMatrimonyOverview() {
  return runAdmin('Loading matrimony admin', (aid) => repo.adminOverview(aid));
}

export async function adminGetMatrimonyProfile(profileId: string) {
  return runAdmin('Loading profile', (aid) => repo.adminGetProfile(aid, profileId));
}

export async function adminModerateProfile(profileId: string, moderation: Moderation) {
  return runAdmin('Saving moderation', (aid) => repo.adminModerate(aid, profileId, moderation));
}

export async function adminSetMatrimonyStatus(
  profileId: string,
  status: MatrimonyProfileStatus,
  reason?: string
) {
  return runAdmin('Updating profile status', (aid) => repo.adminSetStatus(aid, profileId, status, reason));
}
