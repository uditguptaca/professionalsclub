import 'server-only';
import { withElevated } from '@/server/db';
import { fetchJobs, FETCHABLE, type SourceKind } from '@/server/jobs/sources';

/**
 * Refreshing the cached job list.
 *
 * This is the one part of the feature with no user in the loop: it runs from the
 * cron route and from an admin's "Sync now" button, so it uses withElevated()
 * rather than a member session. That is the third legitimate caller of it (the
 * other two being profile creation at signup and account deletion) and it is
 * justified the same way: there is no caller identity to publish, the SQL takes
 * no user-supplied shape, and RLS on company_jobs would otherwise refuse a
 * write that no member is making.
 *
 * A feed that fails leaves the previous rows alone and records the error on the
 * company. Half a page of stale roles beats an empty one.
 */

export interface SyncResult {
  companyId: string;
  company: string;
  kind: SourceKind;
  added: number;
  updated: number;
  closed: number;
  error?: string;
}

interface CompanyRow {
  id: string;
  name: string;
  source_kind: SourceKind;
  source_config: Record<string, unknown>;
}

/** Sync one company. Never throws: the error belongs on the row, not the caller. */
export async function syncCompany(companyId: string): Promise<SyncResult> {
  const company = await withElevated(async (db) => {
    const rows = await db`
      select id, name, source_kind, source_config
        from public.companies where id = ${companyId}::uuid
    `;
    return (rows[0] as unknown as CompanyRow) ?? null;
  });

  if (!company) {
    return { companyId, company: '(unknown)', kind: 'link', added: 0, updated: 0, closed: 0, error: 'No such company' };
  }

  const base = { companyId, company: company.name, kind: company.source_kind, added: 0, updated: 0, closed: 0 };

  if (!FETCHABLE.includes(company.source_kind)) return base;

  let fetched;
  try {
    fetched = await fetchJobs(company.source_kind, company.source_config ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch failed';
    await withElevated(async (db) => {
      await db`
        update public.companies
           set jobs_sync_error = ${message.slice(0, 500)}, jobs_synced_at = now()
         where id = ${companyId}::uuid
      `;
    });
    return { ...base, error: message };
  }

  return withElevated(async (db) => {
    // ONE statement for the whole feed. A row-at-a-time loop meant one round
    // trip per role, and a 200-role employer like a bank took over a minute of
    // an admin staring at a spinner. unnest turns the batch into a single
    // insert ... select.
    //
    // Deduplicated first: a feed occasionally repeats an id across pages, and
    // "ON CONFLICT DO UPDATE command cannot affect row a second time" would
    // abort the whole sync.
    const byId = new Map(fetched.map((j) => [j.externalId, j]));
    const jobs = [...byId.values()];

    let added = 0;
    let updated = 0;

    if (jobs.length > 0) {
      const rows = await db`
        insert into public.company_jobs (
          company_id, external_id, title, location, employment_type, department,
          apply_url, description_snippet, posted_at, source_kind, is_open, last_seen_at
        )
        select ${companyId}::uuid, t.external_id, t.title, t.location,
               t.employment_type, t.department, t.apply_url,
               t.description_snippet, t.posted_at::timestamptz,
               ${company.source_kind}, true, now()
          from unnest(
            ${jobs.map((j) => j.externalId)}::text[],
            ${jobs.map((j) => j.title)}::text[],
            ${jobs.map((j) => j.location)}::text[],
            ${jobs.map((j) => j.employmentType)}::text[],
            ${jobs.map((j) => j.department)}::text[],
            ${jobs.map((j) => j.applyUrl)}::text[],
            ${jobs.map((j) => j.descriptionSnippet)}::text[],
            ${jobs.map((j) => j.postedAt)}::text[]
          ) as t(external_id, title, location, employment_type, department,
                 apply_url, description_snippet, posted_at)
        on conflict (company_id, external_id) do update set
          title = excluded.title,
          location = excluded.location,
          employment_type = excluded.employment_type,
          department = excluded.department,
          apply_url = excluded.apply_url,
          description_snippet = excluded.description_snippet,
          posted_at = coalesce(excluded.posted_at, public.company_jobs.posted_at),
          is_open = true,
          last_seen_at = now()
        returning (first_seen_at = last_seen_at) as is_new
      `;
      for (const r of rows as unknown as { is_new: boolean }[]) {
        if (r.is_new) added += 1; else updated += 1;
      }
    }

    // Anything the feed stopped mentioning is closed rather than deleted: a
    // referral request may still point at it, and a member should see that the
    // role went away rather than find a broken page.
    const closedRows = await db`
      update public.company_jobs
         set is_open = false
       where company_id = ${companyId}::uuid
         and is_open
         and last_seen_at < now() - interval '1 minute'
      returning id
    `;

    await db`
      update public.companies
         set jobs_synced_at = now(), jobs_sync_error = null
       where id = ${companyId}::uuid
    `;

    return { ...base, added, updated, closed: closedRows.length };
  });
}

/** Sync every active company that has a fetchable feed. */
export async function syncAllCompanies(): Promise<SyncResult[]> {
  const ids = await withElevated(async (db) => {
    const rows = await db`
      select id from public.companies
       where is_active and source_kind = any(${FETCHABLE})
       order by jobs_synced_at asc nulls first
    `;
    return rows.map((r) => (r as { id: string }).id);
  });

  const results: SyncResult[] = [];
  // Sequential on purpose: a dozen employers' careers sites do not need to be
  // hit in parallel, and a serverless function has one CPU anyway.
  for (const id of ids) results.push(await syncCompany(id));
  return results;
}
