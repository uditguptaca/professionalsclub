import 'server-only';
import { withElevated } from '@/server/db';

/**
 * Confirming a role still exists where it was posted.
 *
 * WHY THIS EXISTS ALONGSIDE THE FEED SYNC. For an ATS-backed employer the feed
 * is authoritative: a role that stops appearing is closed, and sync.ts already
 * does that. But two kinds of row never get that signal - a `manual` role an
 * admin typed in, and any row whose employer feed has broken since - so they
 * stayed open indefinitely. A member could then spend one of two weekly
 * referral requests on a posting that had been filled for a month.
 *
 * WHAT THIS IS NOT. It does not scrape, parse or store anything from the
 * employer's page. It asks the ONE url the employer gave us whether that page
 * still exists, and reads only the status code. Low volume, sequential, spaced
 * out, honest User-Agent with a contact URL - the same courtesy a link checker
 * owes any site.
 *
 * THE TWO-STRIKE RULE is the whole design. Careers sites answer automated
 * requests with 403, 429 and 503 constantly, and Workday in particular returns
 * a 200 for URLs that no longer resolve to a job. So:
 *
 *   404 / 410            -> the page is gone. Counts as a strike.
 *   anything else        -> tells us nothing. Clears the strikes.
 *   two strikes in a row -> close the role, reason 'dead_link'.
 *
 * A role is never closed on one bad answer, and never on an ambiguous one. The
 * failure mode we refuse is closing a live role; leaving a dead one open for
 * another day is the acceptable one, and the feed usually catches it anyway.
 */

/** How many roles one run will check. Keeps the cron inside its budget. */
const BATCH = 120;

/** Per-request ceiling. A careers site that hangs must not stall the run. */
const TIMEOUT_MS = 8000;

/** Courtesy gap between requests to the same run. */
const GAP_MS = 250;

/** Strikes needed before a role is closed. */
const STRIKES_TO_CLOSE = 2;

/**
 * Only re-check a settled role this often. The feed sync is the primary
 * mechanism for most employers, so this is a backstop and need not be eager.
 */
const RECHECK_AFTER_HOURS = 72;

/**
 * A role already carrying a strike is re-checked on the NEXT daily run instead
 * of waiting out the full window. Otherwise the second strike lands three days
 * later and a filled role stays on the board for four - the two-strike rule is
 * there to avoid a false close, not to be slow about a true one.
 */
const RECHECK_SUSPECT_HOURS = 12;

/**
 * Reserved placeholder domains (RFC 2606 / RFC 6761). Demo and seed rows point
 * at these, and they answer 404 for every path - so without this guard the
 * check would confidently retire all 15 seeded demo roles inside two days and
 * look exactly like a bug. A 404 from example.com says nothing about whether a
 * real job exists, so these are skipped rather than judged.
 */
const PLACEHOLDER_HOSTS = /(^|\.)(example\.(com|org|net)|test|invalid|localhost)$/i;

function isPlaceholder(url: string): boolean {
  try {
    return PLACEHOLDER_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

const UA =
  'ProfessionalsClubLinkCheck/1.0 (+https://professionalsclub.vercel.app; community job board link check)';

export interface LivenessResult {
  checked: number;
  gone: number;
  closed: number;
  skipped: number;
  errors: number;
}

type Verdict = 'gone' | 'alive' | 'unknown';

interface JobRow {
  id: string;
  title: string;
  apply_url: string;
  check_failures: number;
}

/**
 * One request, status code only.
 *
 * HEAD first because it is the cheapest thing that answers the question, then
 * GET once if the server refuses HEAD - a 405 for HEAD says nothing about
 * whether the job exists, and several ATSes do exactly that.
 */
async function probe(url: string): Promise<Verdict> {
  const attempt = async (method: 'HEAD' | 'GET'): Promise<number | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': UA, accept: '*/*' },
        signal: controller.signal,
      });
      return res.status;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  let status = await attempt('HEAD');
  if (status === 405 || status === 501 || status === null) status = await attempt('GET');

  if (status === null) return 'unknown';
  if (status === 404 || status === 410) return 'gone';
  return status < 400 ? 'alive' : 'unknown';
}

/** Check a batch of the least-recently-checked open roles. */
export async function checkJobLiveness(limit = BATCH): Promise<LivenessResult> {
  const jobs = await withElevated(async (db) => {
    const rows = await db`
      select j.id, j.title, j.apply_url, j.check_failures
        from public.company_jobs j
        join public.companies c on c.id = j.company_id
       where j.is_open
         and c.is_active
         and j.apply_url like 'http%'
         and (j.last_checked_at is null
              or j.last_checked_at < now() - (
                   case when j.check_failures > 0
                        then ${RECHECK_SUSPECT_HOURS}
                        else ${RECHECK_AFTER_HOURS}
                   end || ' hours')::interval)
       order by (j.check_failures > 0) desc, j.last_checked_at asc nulls first
       limit ${limit}
    `;
    return rows as unknown as JobRow[];
  });

  const result: LivenessResult = {
    checked: 0, gone: 0, closed: 0, skipped: 0, errors: 0,
  };
  if (jobs.length === 0) return result;

  const gone: string[] = [];
  const alive: string[] = [];
  const unknown: string[] = [];
  const toClose: string[] = [];

  for (const job of jobs) {
    if (isPlaceholder(job.apply_url)) {
      result.skipped += 1;
      unknown.push(job.id);
      continue;
    }
    const verdict = await probe(job.apply_url);
    result.checked += 1;
    if (verdict === 'gone') {
      result.gone += 1;
      // The strike about to be written is this one, so compare against the
      // count already on the row.
      if (job.check_failures + 1 >= STRIKES_TO_CLOSE) toClose.push(job.id);
      else gone.push(job.id);
    } else if (verdict === 'alive') {
      alive.push(job.id);
    } else {
      result.errors += 1;
      unknown.push(job.id);
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }

  await withElevated(async (db) => {
    // Three fixed statements rather than one per row: the batch is 120 wide and
    // the pool is 8.
    if (toClose.length > 0) {
      const rows = await db`
        update public.company_jobs
           set is_open = false, close_reason = 'dead_link',
               check_failures = check_failures + 1, last_checked_at = now()
         where id = any(${toClose}::uuid[])
        returning id
      `;
      result.closed = rows.length;
    }
    if (gone.length > 0) {
      await db`
        update public.company_jobs
           set check_failures = check_failures + 1, last_checked_at = now()
         where id = any(${gone}::uuid[])
      `;
    }
    // A live answer clears the record: two strikes must be CONSECUTIVE.
    if (alive.length > 0) {
      await db`
        update public.company_jobs
           set check_failures = 0, last_checked_at = now()
         where id = any(${alive}::uuid[])
      `;
    }
    // An ambiguous answer is not evidence either way. Stamp the timestamp so
    // the row moves to the back of the queue, but leave the strikes alone.
    if (unknown.length > 0) {
      await db`
        update public.company_jobs
           set last_checked_at = now()
         where id = any(${unknown}::uuid[])
      `;
    }
  });

  return result;
}
