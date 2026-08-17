import { NextResponse, type NextRequest } from 'next/server';
import { syncAllCompanies } from '@/server/jobs/sync';
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
  const companies = await syncAllCompanies();
  const email = await drainOutbox(200);

  const failures = companies.filter((c) => c.error);
  return NextResponse.json({
    ok: true,
    ms: Date.now() - started,
    companies: companies.length,
    added: companies.reduce((n, c) => n + c.added, 0),
    updated: companies.reduce((n, c) => n + c.updated, 0),
    closed: companies.reduce((n, c) => n + c.closed, 0),
    email,
    // Named rather than counted: a feed that has been broken for a week is
    // something an operator needs to see.
    failures: failures.map((c) => ({ company: c.company, kind: c.kind, error: c.error })),
  });
}
