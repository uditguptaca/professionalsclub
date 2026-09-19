import { NextResponse, type NextRequest } from 'next/server';
import { cronAuthorised } from '@/server/cron-auth';
import { syncAllCompanies } from '@/server/jobs/sync';
import { checkJobLiveness } from '@/server/jobs/liveness';
import { drainOutbox } from '@/server/email';
import { expireCouponHolds } from '@/server/repos/offers';
import { drainSms } from '@/server/sms';
import { retirePastEvents } from '@/server/repos/events';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!cronAuthorised(request)) {
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

  // Every stage runs and reports on its own. One throwing stage used to 500
  // the whole route: the sync report an operator needed was thrown away, and
  // the stages after it never ran at all.
  const report: Record<string, unknown> = {};
  let ok = true;
  const stage = async <T,>(name: string, fn: () => Promise<T>): Promise<T | null> => {
    try {
      const value = await fn();
      report[name] = value;
      return value;
    } catch (error) {
      ok = false;
      report[name] = { error: error instanceof Error ? error.message.slice(0, 300) : 'failed' };
      console.error(`[cron:refresh] ${name} failed:`, error);
      return null;
    }
  };

  // Coupon seats held by codes nobody showed. A member's own stale hold is
  // returned the moment they ask for the code again (0048), but a capped offer
  // would otherwise stay short a seat for everybody else until they did.
  await stage('couponHolds', expireCouponHolds);
  // Yesterday's events stop being "upcoming"; nothing else ever wrote 'past'.
  await stage('pastEvents', retirePastEvents);
  const companies = await stage('companies', syncAllCompanies);
  // After the feeds, not before: sync reopens anything an employer re-listed,
  // so checking links afterwards never fights a fresher signal.
  await stage('liveness', checkJobLiveness);
  await stage('email', () => drainOutbox(200));
  // Texts queued by RSVPs (0049). Same contract as mail: sent from the request
  // that queued them when a provider is configured, swept here as the backstop.
  await stage('sms', () => drainSms(200));

  if (companies) {
    report.companies = {
      count: companies.length,
      added: companies.reduce((n, c) => n + c.added, 0),
      updated: companies.reduce((n, c) => n + c.updated, 0),
      closed: companies.reduce((n, c) => n + c.closed, 0),
      // Named rather than counted: a feed that has been broken for a week is
      // something an operator needs to see.
      failures: companies.filter((c) => c.error).map((c) => ({ company: c.company, kind: c.kind, error: c.error })),
    };
  }
  return NextResponse.json({ ok, ms: Date.now() - started, ...report });
}

