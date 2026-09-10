import { NextResponse, type NextRequest } from 'next/server';
import { syncAllCompanies } from '@/server/jobs/sync';
import { checkJobLiveness } from '@/server/jobs/liveness';
import { drainOutbox } from '@/server/email';

/**
 * Scheduled refresh: pull every company's job feed, then send whatever mail is
 * queued.
 *
 * Authenticated by CRON_SECRET, not by a session — Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`. Without the variable set the route
 * refuses to run rather than defaulting to open, because it is the one endpoint
 * here that does privileged work with no user attached.
 *
 * Schedule lives in vercel.json.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const started = Date.now();

  // ?only=liveness runs just the link check. The daily cron passes nothing and
  // does everything; this exists so an operator (and a test) can exercise the
  // link check on its own without pulling every feed and draining the mail
  // queue as a side effect.
  const only = request.nextUrl.searchParams.get('only');
  if (only === 'liveness') {
    const liveness = await checkJobLiveness();
    return NextResponse.json({ ok: true, ms: Date.now() - started, liveness });
  }

  const companies = await syncAllCompanies();
  // After the feeds, not before: sync reopens anything an employer re-listed,
  // so checking links afterwards never fights a fresher signal.
  const liveness = await checkJobLiveness();
  const email = await drainOutbox(200);

  const failures = companies.filter((c) => c.error);
  return NextResponse.json({
    ok: true,
    ms: Date.now() - started,
    companies: companies.length,
    added: companies.reduce((n, c) => n + c.added, 0),
    updated: companies.reduce((n, c) => n + c.updated, 0),
    closed: companies.reduce((n, c) => n + c.closed, 0),
    liveness,
    email,
    // Named rather than counted: a feed that has been broken for a week is
    // something an operator needs to see.
    failures: failures.map((c) => ({ company: c.company, kind: c.kind, error: c.error })),
  });
}
