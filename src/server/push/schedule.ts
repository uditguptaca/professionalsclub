import 'server-only';

/**
 * When a push gets sent.
 *
 * The hard constraint: notifications are written by Postgres TRIGGERS, so the
 * application never knows one was created. There is no action to hang "and also
 * push" onto — sendMessage inserts a message, and a definer trigger decides
 * whether that becomes a notification for the other person.
 *
 * What the application does know is that a WRITE happened. Every write goes
 * through withUser or withAnon (the house rule that no connection opens outside
 * a repository is what makes that true), so those are the seam: after any
 * successful write transaction, check whether anything is owed a push.
 *
 * `after()` runs the check once the response has been sent, so nobody waits for
 * FCM to answer. On Vercel it keeps the invocation alive via waitUntil.
 *
 * Why not a cron: a chat notification that arrives at the next 6-hourly tick is
 * worse than no notification. The cron route exists as a backstop for writes
 * whose process died before the callback ran, not as the delivery mechanism.
 */

// One drain at a time per instance. The claim is atomic so overlapping drains
// are harmless to correctness, but each one holds a pooled connection for its
// claim, and the pool has 8. React's cache() cannot be used for this: outside a
// render pass it silently degrades to calling the function every time, which is
// exactly the situation in a Server Action.
let inFlight: Promise<void> | null = null;
// A write that lands while a drain is running may have created a row that drain
// already looked past. Remember to go round once more rather than wait for the
// next write.
let again = false;

async function drainNow(): Promise<void> {
  // Imported lazily to keep db.ts -> schedule.ts -> drain.ts -> repos/push.ts
  // -> db.ts from being a module-load cycle.
  const { drainPush } = await import('@/server/push/drain');
  try {
    const result = await drainPush();
    if (result.sent > 0 || result.dropped > 0 || result.failed > 0) {
      console.log(
        `[push] sent ${result.sent}, failed ${result.failed}, dropped ${result.dropped}`
      );
    }
  } catch (error) {
    // Never surface: this runs after the response, and the notification is
    // already in the member's inbox regardless of whether the phone buzzed.
    console.error('[push] drain failed:', error);
  }
}

function startDrain(): Promise<void> {
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = (async () => {
    await drainNow();
    while (again) {
      again = false;
      await drainNow();
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Ask for a drain after the current response is sent.
 *
 * Cheap and idempotent: when nothing is owed a push, this is one indexed query
 * that returns no rows. Called from db.ts on every successful write, so it must
 * stay cheap.
 */
export function schedulePush(): void {
  void (async () => {
    try {
      // Imported lazily so a non-request context (a script, a test) does not
      // pay for next/server at all.
      const { after } = await import('next/server');
      after(() => startDrain());
    } catch {
      // No request scope — a migration script, a seed, a unit test. Those
      // legitimately have nowhere to defer work to, and the cron backstop will
      // pick the rows up.
    }
  })();
}
