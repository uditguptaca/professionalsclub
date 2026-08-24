import { NextResponse, type NextRequest } from 'next/server';
import { drainPush } from '@/server/push/drain';
import { pushPendingCount } from '@/server/repos/push';

/**
 * Push backstop and health check.
 *
 * Pushes are normally sent by `after()` at the end of the request whose write
 * caused the notification, so this route is NOT the delivery mechanism — a chat
 * notification arriving at the next cron tick would be useless.
 *
 * What it is for:
 *
 *   1. Writes whose process died before the callback ran. Rare, and invisible
 *      without something that sweeps up afterwards.
 *   2. Answering "is push working?" out loud. `pending` is the queue depth and
 *      `configured` says whether a service-account key is even present, so a
 *      deploy that forgot the environment variable reports zeros AND
 *      configured:false rather than looking idle and healthy.
 *
 * Authenticated by CRON_SECRET like the refresh route: privileged work with no
 * user attached, and it refuses to run rather than default to open.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const started = Date.now();
  const pendingBefore = await pushPendingCount();
  const result = await drainPush();

  return NextResponse.json({
    ok: true,
    ms: Date.now() - started,
    // False means FCM_SERVICE_ACCOUNT_B64 is missing or unusable. Everything
    // else in this response would read as healthy in that case, so it is first.
    configured: result.configured,
    pendingBefore,
    pendingAfter: await pushPendingCount(),
    sent: result.sent,
    failed: result.failed,
    dropped: result.dropped,
    skipped: result.skipped,
  });
}
