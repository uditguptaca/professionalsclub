import 'server-only';
import { pushAuth, sendPush, pushConfigured, type PushOutcome } from '@/server/push/fcm';
import { claimPushBatch, deleteDeadTokens, type PushJob } from '@/server/repos/push';

/**
 * Turn claimed notification rows into delivered pushes.
 *
 * The shape of this function is the whole point:
 *
 *   claim (short transaction)  ->  HTTP fan-out (NO connection held)  ->  cleanup
 *
 * The obvious arrangement — one withElevated wrapping the claim and the sends —
 * holds a pooled connection open for the length of the fan-out. The pool has 8
 * connections and this runs after every authenticated write, so a fan-out to a
 * few hundred devices would sit idle-in-transaction for seconds while ordinary
 * member requests queue behind it for a connection. Sending a chat message
 * would block on somebody else's push storm. So the claim closes first, then
 * the network happens, then a second short transaction removes dead tokens.
 */

/** Per drain pass. FCM has no batch endpoint in HTTP v1, so this is HTTP calls. */
const BATCH = 200;
/** Parallel in-flight sends. Enough to be quick, not enough to look like abuse. */
const CONCURRENCY = 8;
/** Passes per invocation, so one big fan-out drains instead of stranding rows. */
const MAX_PASSES = 10;

export interface DrainResult {
  sent: number;
  failed: number;
  /** Tokens deleted because FCM said the device is gone. */
  dropped: number;
  /** Rows claimed while push is not configured. Distinguishes quiet from broken. */
  skipped: number;
  configured: boolean;
}

/**
 * Categories whose notification text must never reach a lock screen.
 *
 * Chat is already safe by construction: notify_member writes "New message" and
 * the message body never enters the row. The help desk is not. Its triggers put
 * the REQUEST TITLE into the notification — a case assignment sends another
 * member's request title to a volunteer, and the admin queue sends it to every
 * admin. In this product those titles are immigration status, legal trouble,
 * housing: the most sensitive strings we hold. A notification renders on a
 * locked phone that may be sitting on a desk, so for these categories the push
 * says only what kind of thing happened, and the actual title stays in the app
 * behind authentication.
 */
const REDACTED_CATEGORIES = new Set(['help', 'volunteer', 'admin']);

const GENERIC_TITLES: Record<string, string> = {
  help: 'Help desk update',
  volunteer: 'Volunteering update',
  admin: 'Admin queue',
};

const GENERIC_BODIES: Record<string, string> = {
  help: 'Open the app to see the update.',
  volunteer: 'Open the app to see the update.',
  admin: 'Something is waiting for review.',
};

/** What the phone is allowed to show. */
function payloadFor(job: PushJob): { title: string; body: string } {
  if (REDACTED_CATEGORIES.has(job.category)) {
    return {
      title: GENERIC_TITLES[job.category] ?? 'Professionals Club',
      body: GENERIC_BODIES[job.category] ?? 'Open the app to see the update.',
    };
  }
  // Everything else already carries display-safe text: an actor's name as the
  // title and a short verb phrase as the body ("Liked your post").
  const body =
    job.eventCount > 1 && job.category === 'chat'
      ? `${job.eventCount} new messages`
      : job.body || 'Open the app to see the update.';
  return { title: job.title, body };
}

async function sendJob(
  auth: { token: string; projectId: string },
  job: PushJob,
  dead: string[]
): Promise<{ sent: number; failed: number }> {
  const { title, body } = payloadFor(job);
  let sent = 0;
  let failed = 0;

  for (const token of job.tokens) {
    const outcome: PushOutcome = await sendPush(auth, {
      to: token,
      title,
      body,
      link: job.link,
      badge: job.unreadTotal,
      // Re-pushing the same conversation replaces the previous notification in
      // the tray instead of stacking twelve of them.
      collapseKey: job.groupKey ?? undefined,
    });

    if (outcome.status === 'sent') sent++;
    else if (outcome.status === 'gone') dead.push(token);
    else {
      failed++;
      console.error(`[push] send failed (${job.category}): ${outcome.reason}`);
    }
  }
  return { sent, failed };
}

/** Run `workers` jobs at a time until the list is done. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await fn(items[index]);
    }
  });
  await Promise.all(workers);
}

/**
 * Drain the queue. Safe to call concurrently: the claim is atomic, so two
 * drains take disjoint work rather than double-sending.
 */
export async function drainPush(): Promise<DrainResult> {
  const result: DrainResult = {
    sent: 0,
    failed: 0,
    dropped: 0,
    skipped: 0,
    configured: pushConfigured(),
  };

  // Not configured: claim nothing, so the rows stay owed and start flowing the
  // moment a key is set. Reported as skipped, never as success — a drain that
  // says {sent: 0, failed: 0} while silently doing nothing is how a broken
  // production deploy looks healthy.
  if (!result.configured) return result;

  // One access token for the whole invocation, minted before any fan-out.
  const auth = await pushAuth();
  if (!auth) {
    console.error('[push] could not authenticate with FCM; leaving the queue alone');
    result.configured = false;
    return result;
  }

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    // --- 1. Claim. Short transaction, closed before any network call. -------
    const jobs = await claimPushBatch(BATCH);
    if (jobs.length === 0) break;

    // --- 2. Send. No database connection is held here. ----------------------
    const dead: string[] = [];
    await pool(jobs, CONCURRENCY, async (job) => {
      const { sent, failed } = await sendJob(auth, job, dead);
      result.sent += sent;
      result.failed += failed;
    });

    // --- 3. Clean up. Short transaction again. -----------------------------
    if (dead.length > 0) result.dropped += await deleteDeadTokens(dead);

    // A short pass means the queue is drained.
    if (jobs.length < BATCH) break;
  }

  return result;
}
