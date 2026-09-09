import 'server-only';
import { withUser, withUserRead, withAnon, one, type Db } from '@/server/db';
import { toDomainAll, toDomain } from '@/server/case';
import type { Company, CompanyJob, CompanyInsider } from '@/types';
// The requests a member SENT live with the chat module (each one opens a chat),
// but the referrals screen shows them next to the companies - so they are read
// on the same connection rather than in a second Server Action.
import { toMyDirectReferrals, type MyDirectReferral } from '@/server/repos/chat';
// The role taxonomy lives in one place and is shared with the browser, so the
// suggestion ranking and the filter pills can never disagree about what
// "Senior" or "Finance & banking" means.
import { scoreJob, isSuggestable, canMatch, type MatchProfile } from '@/lib/job-taxonomy';

/**
 * Company referrals.
 *
 * Two rules run through this file, both of them the point of the feature:
 *
 *   - The PUBLIC site still learns only a count: company_helper_counts carries
 *     a number and no identity.
 *   - Signed-in members see referrers BY NAME through
 *     company_insider_directory (0018). That is the deal the current flow
 *     offers - turning can_refer on means being listed - and it replaced the
 *     anonymous fan-out that 0019 dropped. Requests themselves live in
 *     referral_direct_requests and are served from src/server/repos/chat.ts,
 *     because each one opens a chat.
 *
 * Nothing here takes a member id as an argument for "who I am".
 */

// ============================================================ Companies

/** The public directory: every active company plus how many can help. */
export async function listCompaniesPublic(): Promise<Company[]> {
  return withAnon(async (db) => {
    const rows = await db`
      select * from public.company_helper_counts
       order by helper_count desc, open_jobs_count desc, name asc
    `;
    return toDomainAll<Company>(rows);
  });
}

/** Same list, for a signed-in member. */
export async function listCompanies(userId: string): Promise<Company[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db`
      select * from public.company_helper_counts
       order by helper_count desc, open_jobs_count desc, name asc
    `;
    return toDomainAll<Company>(rows);
  });
}

export async function getCompanyPublic(slug: string): Promise<Company | null> {
  return withAnon(async (db) => {
    const row = await one(await db`
      select * from public.company_helper_counts where slug = ${slug}
    `);
    return row ? toDomain<Company>(row) : null;
  });
}

/** Admin view: the real table, including the feed config and any sync error. */
export async function listCompaniesAdmin(adminId: string): Promise<Company[]> {
  return withUserRead(adminId, async (db) => {
    const rows = await db`
      select c.*,
             -- ::int, not bigint: see the note on company_helper_counts.
             (select count(*) from public.company_insiders i
               where i.company_id = c.id and i.can_refer)::int as helper_count
        from public.companies c
       order by c.name asc
    `;
    return toDomainAll<Company>(rows);
  });
}

const COMPANY_FIELDS = [
  'name', 'slug', 'logo', 'industry', 'size_range', 'city', 'province',
  'country', 'website', 'careers_url', 'description_short', 'source_kind',
  'is_active',
] as const;

const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export async function upsertCompany(
  adminId: string,
  input: Record<string, unknown>
): Promise<Company> {
  return withUser(adminId, async (db) => {
    const id = typeof input.id === 'string' && input.id ? input.id : null;
    const name = String(input.name ?? '').trim();
    if (name.length < 2) throw new Error('Enter the company name.');

    const values: Record<string, unknown> = {};
    for (const f of COMPANY_FIELDS) {
      const camel = f.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (input[camel] !== undefined) values[f] = input[camel];
      else if (input[f] !== undefined) values[f] = input[f];
    }
    values.name = name;
    values.slug = String(values.slug ?? '').trim() || slugify(name);

    // source_config is jsonb and must stay an object, which the check
    // constraint also enforces one layer down.
    const config = input.sourceConfig ?? input.source_config ?? {};
    const configJson = JSON.stringify(
      config && typeof config === 'object' && !Array.isArray(config) ? config : {}
    );

    const row = id
      ? await one(await db`
          update public.companies set
            name = ${values.name as string},
            slug = ${values.slug as string},
            logo = ${(values.logo as string) ?? null},
            industry = ${(values.industry as string) ?? null},
            size_range = ${(values.size_range as string) ?? null},
            city = ${(values.city as string) ?? null},
            province = ${(values.province as string) ?? null},
            country = ${(values.country as string) ?? 'Canada'},
            website = ${(values.website as string) ?? null},
            careers_url = ${(values.careers_url as string) ?? null},
            description_short = ${(values.description_short as string) ?? null},
            source_kind = ${(values.source_kind as string) ?? 'link'},
            source_config = ${configJson}::jsonb,
            is_active = ${values.is_active === undefined ? true : Boolean(values.is_active)},
            updated_at = now()
          where id = ${id}::uuid
          returning *
        `)
      : await one(await db`
          insert into public.companies (
            name, slug, logo, industry, size_range, city, province, country,
            website, careers_url, description_short, source_kind, source_config, is_active
          ) values (
            ${values.name as string}, ${values.slug as string}, ${(values.logo as string) ?? null},
            ${(values.industry as string) ?? null}, ${(values.size_range as string) ?? null},
            ${(values.city as string) ?? null}, ${(values.province as string) ?? null},
            ${(values.country as string) ?? 'Canada'}, ${(values.website as string) ?? null},
            ${(values.careers_url as string) ?? null}, ${(values.description_short as string) ?? null},
            ${(values.source_kind as string) ?? 'link'}, ${configJson}::jsonb,
            ${values.is_active === undefined ? true : Boolean(values.is_active)}
          )
          returning *
        `);

    if (!row) throw new Error('Could not save the company.');
    return toDomain<Company>(row);
  });
}

/** A role an admin typed in, for a company with no machine-readable feed. */
export async function addManualJob(
  adminId: string,
  input: { companyId: string; title: string; location?: string; applyUrl: string; department?: string }
): Promise<CompanyJob> {
  return withUser(adminId, async (db) => {
    const title = String(input.title ?? '').trim();
    const applyUrl = String(input.applyUrl ?? '').trim();
    if (title.length < 2) throw new Error('Enter the role title.');
    if (!/^https?:\/\//.test(applyUrl)) throw new Error('Enter the full apply URL, starting with https://');

    const row = await one(await db`
      insert into public.company_jobs (
        company_id, external_id, title, location, department, apply_url,
        source_kind, posted_at
      ) values (
        ${input.companyId}::uuid,
        ${'manual-' + Math.random().toString(36).slice(2, 10)},
        ${title}, ${input.location?.trim() || null}, ${input.department?.trim() || null},
        ${applyUrl}, 'manual', now()
      )
      returning *
    `);
    if (!row) throw new Error('Could not add the role.');
    return toDomain<CompanyJob>(row);
  });
}

export async function setJobOpen(adminId: string, jobId: string, isOpen: boolean): Promise<void> {
  await withUser(adminId, async (db) => {
    await db`
      update public.company_jobs set is_open = ${isOpen} where id = ${jobId}::uuid
    `;
  });
}

// ============================================================ Open roles

/** A role plus how well it fits the member who asked. */
export type ScoredJob = CompanyJob & { matchScore: number; matchReasons: string[] };

/**
 * Open roles at one company, each scored against the caller's profile.
 *
 * The scoring happens HERE rather than in the browser so the member's own
 * profile fields never have to be shipped to the client just to sort a list.
 * The browser still derives the FILTER facets from titles with the same shared
 * taxonomy - those need no profile at all.
 */
export async function listCompanyJobs(userId: string, companyId: string): Promise<ScoredJob[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db`
      with me as (
        select job_title, previous_job_title, professional_category, industry,
               field_of_study, skills, experience_range, city
          from public.profiles where id = ${userId}::uuid
      )
      select j.*,
             (select row_to_json(me) from me) as match_profile,
             (select count(*) from public.company_insiders i
               where i.company_id = j.company_id and i.can_refer)::int as helper_count
        from public.company_jobs j
       where j.company_id = ${companyId}::uuid and j.is_open
       order by j.posted_at desc nulls last, j.title asc
       limit 300
    `;
    if (rows.length === 0) return [];

    const raw = (rows[0].match_profile ?? null) as Record<string, unknown> | null;
    const profile: MatchProfile = {
      jobTitle: (raw?.job_title as string | null) ?? null,
      previousJobTitle: (raw?.previous_job_title as string | null) ?? null,
      professionalCategory: (raw?.professional_category as string | null) ?? null,
      industry: (raw?.industry as string | null) ?? null,
      fieldOfStudy: (raw?.field_of_study as string | null) ?? null,
      skills: (raw?.skills as string | null) ?? null,
      experienceRange: (raw?.experience_range as string | null) ?? null,
      city: (raw?.city as string | null) ?? null,
    };
    const matchable = canMatch(profile);

    // The profile blob and helper count are joined onto every row for the
    // scoring above; neither belongs in what the client receives.
    return rows.map((r) => {
      const { match_profile: _p, helper_count: helpers, ...job } = r as Record<string, unknown>;
      const scored = toDomain<CompanyJob>(job);
      if (!matchable) return { ...scored, matchScore: 0, matchReasons: [] };
      const m = scoreJob(
        {
          title: scored.title,
          location: scored.location ?? null,
          postedAt: scored.postedAt ?? null,
          helperCount: Number(helpers ?? 0),
        },
        profile
      );
      // Only a suggestion-grade match earns a badge: a shared city and a
      // plausible level are not a reason to tell someone a role suits them.
      const qualifies = isSuggestable(m);
      return {
        ...scored,
        matchScore: qualifies ? m.score : 0,
        matchReasons: qualifies ? m.reasons : [],
      };
    });
  });
}

// ============================================================ Suggested roles

/** One open role, scored against the member who asked for it. */
export interface SuggestedRole {
  jobId: string;
  title: string;
  location: string | null;
  applyUrl: string;
  postedAt: string | null;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  companySlug: string;
  helperCount: number;
  score: number;
  reasons: string[];
}

/**
 * How many open roles the matcher will look at. Scoring happens in JS so the
 * taxonomy has ONE definition shared with the browser (see
 * src/lib/job-taxonomy.ts) rather than a second copy in SQL that could drift
 * from the filter pills.
 *
 * ponytail: 215 roles are synced today, so this reads the lot. The ceiling is
 * the row count, not the scoring - if the feed ever reaches tens of thousands,
 * pre-filter in SQL (a trigram or full-text match on the member's title tokens)
 * before scoring, and keep this module as the ranker.
 */
const MATCH_SCAN_LIMIT = 4000;

/**
 * Open roles that suit this member, best first.
 *
 * Returns an empty list rather than filler: a Registered Nurse looking at a
 * feed of banking roles should be told nothing matches, not shown "Financial
 * Advisor" because they share a city. isSuggestable() enforces that.
 */
export async function suggestedRoles(userId: string, limit = 12): Promise<SuggestedRole[]> {
  return withUserRead(userId, (db) => suggestedRolesOn(db, userId, limit));
}

export async function suggestedRolesOn(
  db: Db,
  userId: string,
  limit = 12
): Promise<SuggestedRole[]> {
  // One statement: the caller's own profile fields (own row, no extra grant
  // needed) alongside the open roles and each employer's referrer count.
  const rows = await db<Record<string, unknown>>`
    with me as (
      select job_title, previous_job_title, professional_category, industry,
             field_of_study, skills, experience_range, city
        from public.profiles where id = ${userId}::uuid
    )
    select
      (select row_to_json(me) from me) as profile,
      (select coalesce(json_agg(t), '[]'::json) from (
        select j.id as job_id, j.title, j.location, j.apply_url, j.posted_at,
               c.id as company_id, c.name as company_name, c.logo as company_logo,
               c.slug as company_slug,
               (select count(*) from public.company_insiders i
                 where i.company_id = c.id and i.can_refer)::int as helper_count
          from public.company_jobs j
          join public.companies c on c.id = j.company_id
         where j.is_open and c.is_active
         order by j.posted_at desc nulls last
         limit ${MATCH_SCAN_LIMIT}
      ) t) as jobs
  `;

  const row = rows[0];
  if (!row) return [];

  const raw = (row.profile ?? null) as Record<string, unknown> | null;
  if (!raw) return [];

  const profile: MatchProfile = {
    jobTitle: (raw.job_title as string | null) ?? null,
    previousJobTitle: (raw.previous_job_title as string | null) ?? null,
    professionalCategory: (raw.professional_category as string | null) ?? null,
    industry: (raw.industry as string | null) ?? null,
    fieldOfStudy: (raw.field_of_study as string | null) ?? null,
    skills: (raw.skills as string | null) ?? null,
    experienceRange: (raw.experience_range as string | null) ?? null,
    city: (raw.city as string | null) ?? null,
  };
  if (!canMatch(profile)) return [];

  const jobs = (row.jobs ?? []) as Record<string, unknown>[];
  const scored: SuggestedRole[] = [];
  for (const j of jobs) {
    const postedAt = j.posted_at instanceof Date
      ? j.posted_at.toISOString()
      : ((j.posted_at as string | null) ?? null);
    const match = scoreJob(
      {
        title: j.title as string,
        location: (j.location as string | null) ?? null,
        postedAt,
        helperCount: Number(j.helper_count ?? 0),
      },
      profile
    );
    if (!isSuggestable(match)) continue;
    scored.push({
      jobId: j.job_id as string,
      title: j.title as string,
      location: (j.location as string | null) ?? null,
      applyUrl: j.apply_url as string,
      postedAt,
      companyId: j.company_id as string,
      companyName: j.company_name as string,
      companyLogo: (j.company_logo as string | null) ?? null,
      companySlug: j.company_slug as string,
      helperCount: Number(j.helper_count ?? 0),
      score: match.score,
      reasons: match.reasons,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
}

/**
 * The jobs screen's whole first paint: the employer directory and the roles
 * suggested for this member, in ONE Server Action. Next runs a client's action
 * calls one at a time, so asking separately cost two sequential round trips to
 * a remote database before anything appeared.
 */
export async function jobsHome(userId: string): Promise<{
  companies: Company[];
  suggestions: SuggestedRole[];
}> {
  return withUserRead(userId, async (db) => {
    const companies = await db`
      select * from public.company_helper_counts
       order by helper_count desc, open_jobs_count desc, name asc
    `;
    const suggestions = await suggestedRolesOn(db, userId);
    return { companies: toDomainAll<Company>(companies), suggestions };
  });
}

// ============================================================ Insider opt-in

/** The caller's own "where I work" rows. Never anybody else's. */
export async function listMyInsiderRoles(userId: string): Promise<CompanyInsider[]> {
  return withUserRead(userId, (db) => myInsiderRolesOn(db, userId));
}

export async function myInsiderRolesOn(db: Db, userId: string): Promise<CompanyInsider[]> {
  const rows = await db`
    select i.*, c.name as company_name, c.logo as company_logo, c.slug as company_slug
      from public.company_insiders i
      join public.companies c on c.id = i.company_id
     where i.member_id = ${userId}::uuid
     order by c.name asc
  `;
  return toDomainAll<CompanyInsider>(rows);
}

/**
 * The whole member-facing referrals screen: the company directory, my own
 * "where I work" rows, and the requests I have sent.
 *
 * ONE statement. It was two Server Actions awaited in sequence, and Next runs
 * a client's action calls one at a time - two full round trips to a remote
 * database. Three statements in a shared transaction would have been just as
 * slow; a connection runs them in sequence too.
 */
export async function referralHome(userId: string): Promise<{
  companies: Company[];
  myRoles: CompanyInsider[];
  requests: MyDirectReferral[];
}> {
  return withUserRead(userId, async (db) => {
    const row = await one<{
      companies: Record<string, unknown>[] | null;
      my_roles: Record<string, unknown>[] | null;
      requests: Record<string, unknown>[] | null;
    }>(
      await db`
        select
          (select coalesce(json_agg(t), '[]'::json) from (
             select * from public.company_helper_counts
              order by helper_count desc, open_jobs_count desc, name asc
          ) t) as companies,
          (select coalesce(json_agg(t), '[]'::json) from (
             select i.*, c.name as company_name, c.logo as company_logo, c.slug as company_slug
               from public.company_insiders i
               join public.companies c on c.id = i.company_id
              where i.member_id = ${userId}::uuid
              order by c.name asc
          ) t) as my_roles,
          (select coalesce(json_agg(t), '[]'::json) from (
             select r.id, r.insider_id, r.status, r.created_at,
                    n.first_name, n.last_name, co.name as company_name,
                    (select c.id from public.member_conversations c
                      where (c.member_a_id, c.member_b_id)
                            = (least(r.seeker_id, r.insider_id), greatest(r.seeker_id, r.insider_id))
                    ) as conversation_id
               from public.referral_direct_requests r
               join public.companies co on co.id = r.company_id
               join public.member_names n on n.id = r.insider_id
              where r.seeker_id = ${userId}::uuid
              order by r.created_at desc
          ) t) as requests
      `
    );
    return {
      companies: toDomainAll<Company>(row?.companies ?? []),
      myRoles: toDomainAll<CompanyInsider>(row?.my_roles ?? []),
      requests: toMyDirectReferrals(row?.requests ?? []),
    };
  });
}

export async function saveInsiderRole(
  userId: string,
  input: { companyId: string; jobTitle?: string; canRefer: boolean; notifyEmail: boolean }
): Promise<void> {
  await withUser(userId, async (db) => {
    // member_id is the caller's, from the session — never a parameter.
    await db`
      insert into public.company_insiders (company_id, member_id, job_title, can_refer, notify_email)
      values (
        ${input.companyId}::uuid, ${userId}::uuid,
        ${input.jobTitle?.trim() || null}, ${input.canRefer}, ${input.notifyEmail}
      )
      on conflict (company_id, member_id) do update set
        job_title = excluded.job_title,
        can_refer = excluded.can_refer,
        notify_email = excluded.notify_email,
        updated_at = now()
    `;
  });
}

export async function removeInsiderRole(userId: string, companyId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      delete from public.company_insiders
       where company_id = ${companyId}::uuid and member_id = ${userId}::uuid
    `;
  });
}

// ============================================================ Requests

// The anonymous fan-out flow (create/inbox/respond/withdraw) was retired in
// 0018/0019: referrals are direct requests now (src/server/repos/chat.ts).
