'use server';

import { requireUserId } from '@/server/auth';
import * as repo from '@/server/repos/chat';

/**
 * Server Actions for follows and member chat. Every export is a public
 * endpoint: the caller is always resolved from the session, never from a
 * parameter, and every rule (the 0040 message-request contract above all)
 * is enforced again by RLS.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(context: string, error: unknown): { ok: false; error: string } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[chat] ${context}:`, detail);
  const safe =
    detail.startsWith('Not signed in') ||
    detail.startsWith('This account is not active') ||
    detail.startsWith('This chat is not available') ||
    detail.startsWith('You already asked') ||
    detail.startsWith('That person is not taking') ||
    detail.startsWith('You have used both referral') ||
    detail.startsWith('This request was already') ||
    detail.startsWith('That upload was not recognised') ||
    detail.startsWith('Message cannot be empty') ||
    detail.startsWith('Message too long') ||
    detail.startsWith('Pick a reason') ||
    detail.startsWith('Unknown message kind') ||
    detail.startsWith('Pick a reaction');
  return { ok: false, error: safe ? detail : `${context} failed. Please try again.` };
}

async function run<T>(context: string, fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(await requireUserId()) };
  } catch (error) {
    return fail(context, error);
  }
}

// ---- People & follows -------------------------------------------------------

export async function listPeople() {
  return run('Loading people', (uid) => repo.listPeople(uid));
}

export async function searchPeople(query: string) {
  return run('Searching members', (uid) => repo.searchPeople(uid, query));
}

export async function followMember(targetId: string) {
  return run('Sending follow request', (uid) => repo.follow(uid, targetId));
}

export async function acceptFollowRequest(followerId: string) {
  return run('Accepting request', (uid) => repo.acceptFollow(uid, followerId));
}

export async function declineFollowRequest(followerId: string) {
  return run('Declining request', (uid) => repo.declineFollow(uid, followerId));
}

export async function unfollowMember(targetId: string) {
  return run('Unfollowing', (uid) => repo.unfollow(uid, targetId));
}

// ---- Chat -------------------------------------------------------------------

export async function listChats() {
  return run('Loading chats', (uid) => repo.listChats(uid));
}

/**
 * The chats page's whole first paint in one call: threads, the people sheet,
 * the blocked list and the chat settings. It was three actions in a
 * Promise.all, and Next runs a client's action calls one at a time - so it
 * cost three sequential round trips to a remote database.
 */
export async function chatStart() {
  return run('Loading chats', (uid) => repo.chatStart(uid));
}

export async function openChat(partnerId: string) {
  return run('Opening chat', (uid) => repo.openChat(uid, partnerId));
}

export async function acceptChatRequest(conversationId: string) {
  return run('Accepting request', (uid) => repo.acceptChatRequest(uid, conversationId));
}

export async function declineChatRequest(conversationId: string) {
  return run('Declining request', (uid) => repo.declineChatRequest(uid, conversationId));
}

/**
 * `since` is the previous poll's watermark. Passing it makes the poll
 * incremental: only messages newer than that come back, instead of the whole
 * conversation every five seconds.
 */
export async function pollThread(
  conversationId: string,
  since?: string | null,
  deviceId?: string | null
) {
  return run('Loading messages', (uid) => repo.pollThread(uid, conversationId, since, deviceId));
}

export async function sendChatMessage(
  conversationId: string,
  content: {
    body?: string; cipher?: string; iv?: string;
    attachmentUrl?: string;
    attachmentKind?: 'image' | 'video' | 'file';
    fileMeta?: { name?: string; size?: number; mime?: string };
    replyTo?: string;
    forwarded?: boolean;
    thumbUrl?: string;
    senderDeviceId?: string;
    keys?: { deviceId: string; memberId: string; wrappedKey: string; wrapIv: string }[];
  }
) {
  return run('Sending message', (uid) => repo.sendChatMessage(uid, conversationId, content));
}

// ---- Blocks, reports, mute, clear, settings ----------------------------------

export async function blockMember(targetId: string) {
  return run('Blocking', (uid) => repo.blockMember(uid, targetId));
}

export async function unblockMember(targetId: string) {
  return run('Unblocking', (uid) => repo.unblockMember(uid, targetId));
}

export async function listBlockedMembers() {
  return run('Loading blocked members', (uid) => repo.listBlockedMembers(uid));
}

export async function reportMember(input: { reportedId: string; conversationId?: string; reason: string; details?: string }) {
  return run('Sending report', (uid) => repo.reportMember(uid, input));
}

export async function muteChat(conversationId: string, muted: boolean) {
  return run('Updating mute', (uid) => repo.muteChat(uid, conversationId, muted));
}

export async function clearChat(conversationId: string) {
  return run('Clearing chat', (uid) => repo.clearChat(uid, conversationId));
}

export async function getChatSettings() {
  return run('Loading chat settings', (uid) => repo.getChatSettings(uid));
}

export async function updateChatSettings(input: { readReceipts?: boolean; typingIndicator?: boolean }) {
  return run('Saving chat settings', (uid) => repo.updateChatSettings(uid, input));
}

export async function reactToMessage(messageId: string, emoji: string | null) {
  return run('Reacting', (uid) => repo.reactToMessage(uid, messageId, emoji));
}

export async function setTyping(conversationId: string) {
  return run('Typing', (uid) => repo.setTyping(uid, conversationId));
}

// ---- Direct referrals ---------------------------------------------------------

/** The named directory for one company plus my remaining allowance, together. */
export async function companyPeople(companyId: string) {
  return run('Loading people at this company', (uid) => repo.companyPeople(uid, companyId));
}

export async function requestReferral(input: { insiderId: string; companyId: string; jobIds: string[]; note?: string }) {
  return run('Sending referral request', (uid) => repo.requestReferral(uid, input));
}

export async function respondReferral(requestId: string, accept: boolean) {
  return run('Answering referral request', (uid) => repo.respondReferral(uid, requestId, accept));
}

export async function referralQuota() {
  return run('Checking your referral allowance', (uid) => repo.referralQuota(uid));
}

export async function myDirectReferrals() {
  return run('Loading your referral requests', (uid) => repo.myDirectReferrals(uid));
}

export async function markChatRead(conversationId: string) {
  return run('Marking read', (uid) => repo.markChatRead(uid, conversationId));
}

// ---- E2E keys ---------------------------------------------------------------

/** Both sides' device keys for a conversation, for sealing a forward. */
export async function fetchConversationDevices(conversationId: string) {
  return run('Loading device keys', (uid) => repo.conversationDevices(uid, conversationId));
}

/** Publish THIS device's public key so peers can seal messages for it (0042). */
export async function registerChatDevice(
  deviceId: string,
  publicKeyJwk: string,
  label?: string | null
) {
  return run('Registering this device', (uid) =>
    repo.registerDevice(uid, deviceId, publicKeyJwk, label));
}
