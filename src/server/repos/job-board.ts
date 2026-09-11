import 'server-only';
import { withUser, withUserRead, one } from '@/server/db';
import { toDomain, toDomainAll } from '@/server/case';
import type { Company, CompanyJob } from '@/types';
import {
  scoreJob, isSuggestable, canMatch, type MatchProfile,
} from '@/lib/job-taxonomy';

/**
 * The job board: every open role, one role screen, and "I applied myself".
 *
 * Separate from repos/referrals.ts on purpose. That file is about COMPANIES and
 * the referral graph; this one is about ROLES, which is how a member actually
 * looks for work. Keeping them apart is what let the board become the entry
 * point without unpicking the referral flow underneath it.
 */

function readProfile(raw: Record<string, unknown> | null): MatchProfile {
  return {
    jobTitle: (raw?.job_title as string | null) ?? null,
    previousJobTitle: (raw?.previous_job_title as string | null) ?? null,
    professionalCategory: (raw?.professional_category as string | null) ?? null,
    industry: (raw?.industry as string | null) ?? null,
    fieldOfStudy: (raw?.field_of_study as string | null) ?? null,
    skills: (raw?.skills as string | null) ?? null,
    experienceRange: (raw?.experience_range as string | null) ?? null,
    city: (raw?.city as string | null) ?? null,
  };
}

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : ((v as string | null) ?? null);

/** One open role as the board lists it: enough to filter, rank and open it. */
export interface BoardRole {
  id: string;
  title: string;
  location: string | null;
  department: string | null;
  postedAt: string | null;
  applyUrl: string;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  /** Members at this employer who have offered to refer. */
  helperCount: number;
  /** Above zero only when the role genuinely suits this member. */
  matchScore: number;
  matchReasons: string[];
  /** This member marked that they applied on their own. */
  applied: boolean;
  /** Picked out by an admin or a volunteer (0044). */
  isFeatured: boolean;
}

/**
 * ponytail: the board sends the whole open list (215 roles today, capped here)
 * so search, the facet filters and the ranking all run in the browser with no
 * round trip per keystroke, which is the point of the screen. Rows are small
 * and carry no description. The ceiling is payload size: past a few thousand
 * open roles, move search and paging into SQL and keep this shape as the
 * page-one response.
 */
const BOARD_LIMIT = 600;

/** Score a row, but only let a suggestion-grade match show a score. */
function rank(role: BoardRole, profile: MatchProfile, matchable: boolean): BoardRole {
  if (!matchable) return role;
  const m = scoreJob(
    {
      title: role.title,
      location: role.location,
      postedAt: role.postedAt,
      helperCount: role.helperCount,
      isFeatured: role.isFeatured,
    },
    profile
  );
  return isSuggestable(m)
    ? { ...role, matchScore: m.score, matchReasons: m.reasons }
    : role;
}

export async function jobsBoard(userId: string): Promise<{
  roles: BoardRole[];
  companies: Company[];
}> {
  return withUserRead(userId, async (db) => {
    const rows = await db<Record<string, unknown>>`
      with me as (
        select job_title, previous_job_title, professional_category, industry,
               field_of_study, skills, experience_range, city
          from public.profiles where id = ${userId}::uuid
      )
      select
        (select row_to_json(me) from me) as match_profile,
        (select coalesce(json_agg(t), '[]'::json) from (
          select c.* from public.company_helper_counts c
           order by c.helper_count desc, c.open_jobs_count desc, c.name asc
        ) t) as companies,
        (select coalesce(json_agg(t), '[]'::json) from (
          select j.id, j.title, j.location, j.department, j.posted_at, j.apply_url,
                 j.is_featured,
                 co.id as company_id, co.name as company_name, co.logo as company_logo,
                 (select count(*) from public.company_insiders i
                   where i.company_id = co.id and i.can_refer)::int as helper_count,
                 exists (select 1 from public.job_applications a
                          where a.job_id = j.id and a.member_id = ${userId}::uuid) as applied
            from public.company_jobs j
            join public.companies co on co.id = j.company_id
           where j.is_open and co.is_active
           -- Featured first so a hand-picked role can never fall off the end of
           -- BOARD_LIMIT, which is what would happen on the date order alone.
           order by j.is_featured desc, j.posted_at desc nulls last, j.title asc
           limit ${BOARD_LIMIT}
        ) t) as roles
    `;

    const row = rows[0] ?? {};
    const profile = readProfile((row.match_profile ?? null) as Record<string, unknown> | null);
    const matchable = canMatch(profile);

    const roles = ((row.roles ?? []) as Record<string, unknown>[]).map((j) => rank({
      id: j.id as string,
      title: j.title as string,
      location: (j.location as string | null) ?? null,
      department: (j.department as string | null) ?? null,
      postedAt: iso(j.posted_at),
      applyUrl: j.apply_url as string,
      companyId: j.company_id as string,
      companyName: j.company_name as string,
      companyLogo: (j.company_logo as string | null) ?? null,
      helperCount: Number(j.helper_count ?? 0),
      matchScore: 0,
      matchReasons: [],
      applied: Boolean(j.applied),
      isFeatured: Boolean(j.is_featured),
    }, profile, matchable));

    return {
      roles,
      companies: toDomainAll<Company>((row.companies ?? []) as Record<string, unknown>[]),
    };
  });
}

/** Everything the single-role screen shows. */
export interface JobDetail extends BoardRole {
  descriptionSnippet: string | null;
  employmentType: string | null;
  companySlug: string;
  companyIndustry: string | null;
  companyCity: string | null;
  careersUrl: string | null;
  isOpen: boolean;
  closedAt: string | null;
}

/**
 * One role, by id.
 *
 * Returns CLOSED roles too rather than 404ing. A member who followed a link
 * from a chat, a notification or their own history should be told the posting
 * closed; the screen renders that instead of the two actions. Pretending the
 * role never existed is the worse answer.
 */
export async function jobDetail(userId: string, jobId: string): Promise<JobDetail | null> {
  return withUserRead(userId, async (db) => {
    const rows = await db<Record<string, unknown>>`
      with me as (
        select job_title, previous_job_title, professional_category, industry,
               field_of_study, skills, experience_range, city
          from public.profiles where id = ${userId}::uuid
      )
      select j.id, j.title, j.location, j.department, j.posted_at, j.apply_url,
             j.description_snippet, j.employment_type, j.is_open, j.closed_at,
             j.is_featured,
             co.id as company_id, co.name as company_name, co.logo as company_logo,
             co.slug as company_slug, co.industry as company_industry,
             co.city as company_city, co.careers_url,
             (select count(*) from public.company_insiders i
               where i.company_id = co.id and i.can_refer)::int as helper_count,
             exists (select 1 from public.job_applications a
                      where a.job_id = j.id and a.member_id = ${userId}::uuid) as applied,
             (select row_to_json(me) from me) as match_profile
        from public.company_jobs j
        join public.companies co on co.id = j.company_id
       where j.id = ${jobId}::uuid
    `;
    const j = rows[0];
    if (!j) return null;

    const profile = readProfile((j.match_profile ?? null) as Record<string, unknown> | null);
    const base: BoardRole = {
      id: j.id as string,
      title: j.title as string,
      location: (j.location as string | null) ?? null,
      department: (j.department as string | null) ?? null,
      postedAt: iso(j.posted_at),
      applyUrl: j.apply_url as string,
      companyId: j.company_id as string,
      companyName: j.company_name as string,
      companyLogo: (j.company_logo as string | null) ?? null,
      helperCount: Number(j.helper_count ?? 0),
      matchScore: 0,
      matchReasons: [],
      applied: Boolean(j.applied),
      isFeatured: Boolean(j.is_featured),
    };
    const ranked = rank(base, profile, canMatch(profile));

    return {
      ...ranked,
      descriptionSnippet: (j.description_snippet as string | null) ?? null,
      employmentType: (j.employment_type as string | null) ?? null,
      companySlug: j.company_slug as string,
      companyIndustry: (j.company_industry as string | null) ?? null,
      companyCity: (j.company_city as string | null) ?? null,
      careersUrl: (j.careers_url as string | null) ?? null,
      isOpen: Boolean(j.is_open),
      closedAt: iso(j.closed_at),
    };
  });
}

/**
 * "I applied to this myself."
 *
 * A note to the member and nothing more: no resume, no status, and the 0043
 * policy keeps the row readable by that member alone, not by an admin.
 */
export async function setJobApplied(
  userId: string,
  jobId: string,
  applied: boolean
): Promise<void> {
  await withUser(userId, async (db) => {
    if (applied) {
      await db`
        insert into public.job_applications (job_id, member_id)
        values (${jobId}::uuid, ${userId}::uuid)
        on conflict (job_id, member_id) do nothing
      `;
    } else {
      await db`
        delete from public.job_applications
         where job_id = ${jobId}::uuid and member_id = ${userId}::uuid
      `;
    }
  });
}

// ============================================================ Curation (0044)

/**
 * Adding employers and roles, by an admin OR an approved volunteer.
 *
 * Nothing here decides who is allowed: 0044's policies and guard triggers do,
 * on the same connection as the write. A volunteer's INSERT is stamped with
 * their id and pinned to a link-only employer / a manual role no matter what
 * this code sends, and an UPDATE they are not entitled to simply matches no
 * row. So the checks in the Server Action above are for the error MESSAGE,
 * and the database is what actually holds the line.
 */

const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const UNIQUE_VIOLATION = '23505';

export interface NewEmployer {
  name: string;
  city?: string;
  industry?: string;
  website?: string;
  careersUrl?: string;
}

export async function addEmployer(userId: string, input: NewEmployer): Promise<Company> {
  const name = String(input.name ?? '').trim();
  if (name.length < 2) throw new Error('Enter the employer name.');

  const url = (v: string | undefined, label: string): string | null => {
    const s = String(v ?? '').trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) throw new Error(`Enter the full ${label}, starting with https://`);
    return s;
  };
  const website = url(input.website, 'website address');
  const careersUrl = url(input.careersUrl, 'careers page address');

  const insert = (slug: string) => withUser(userId, async (db) => {
    const row = await one(await db`
      insert into public.companies (name, slug, industry, city, website, careers_url)
      values (
        ${name}, ${slug}, ${input.industry?.trim() || null}, ${input.city?.trim() || null},
        ${website}, ${careersUrl}
      )
      returning *
    `);
    if (!row) throw new Error('Could not add the employer.');
    return toDomain<Company>(row);
  });

  const slug = slugify(name) || 'employer';
  try {
    return await insert(slug);
  } catch (e) {
    // Two employers really can share a name ("Metro"), and an inactive one the
    // caller cannot even read still holds its slug - so the retry is the only
    // way to tell "already listed" from "name collision".
    if ((e as { code?: string })?.code !== UNIQUE_VIOLATION) throw e;
    return insert(`${slug}-${Math.random().toString(36).slice(2, 6)}`);
  }
}

export interface NewRole {
  companyId: string;
  title: string;
  location?: string;
  applyUrl: string;
  isFeatured?: boolean;
}

export async function addRole(userId: string, input: NewRole): Promise<CompanyJob> {
  const title = String(input.title ?? '').trim();
  const applyUrl = String(input.applyUrl ?? '').trim();
  if (title.length < 2) throw new Error('Enter the role title.');
  if (!/^https?:\/\//i.test(applyUrl)) throw new Error('Enter the full apply link, starting with https://');
  if (typeof input.companyId !== 'string' || input.companyId.length !== 36) {
    throw new Error('Pick the employer this role is with.');
  }

  return withUser(userId, async (db) => {
    const row = await one(await db`
      insert into public.company_jobs (
        company_id, external_id, title, location, apply_url, source_kind,
        is_featured, posted_at
      ) values (
        ${input.companyId}::uuid,
        ${'manual-' + Math.random().toString(36).slice(2, 10)},
        ${title}, ${input.location?.trim() || null}, ${applyUrl}, 'manual',
        ${Boolean(input.isFeatured)}, now()
      )
      returning *
    `);
    if (!row) throw new Error('Could not add the role.');
    return toDomain<CompanyJob>(row);
  });
}

/**
 * Promote a role, or take it down.
 *
 * An admin may do either to any role; a volunteer only to one they added, which
 * the UPDATE policy enforces by matching no row - so an empty result is a
 * refusal, not a no-op, and says so. closed_at is left to the 0043 trigger.
 */
export async function updateRole(
  userId: string,
  jobId: string,
  patch: { isFeatured?: boolean; isOpen?: boolean }
): Promise<void> {
  const featured = patch.isFeatured ?? null;
  const open = patch.isOpen ?? null;
  if (featured === null && open === null) return;

  await withUser(userId, async (db) => {
    const rows = await db`
      update public.company_jobs
         set is_featured  = coalesce(${featured}::boolean, is_featured),
             is_open      = coalesce(${open}::boolean, is_open),
             close_reason = case when ${open}::boolean is false then 'admin'
                                 else close_reason end
       where id = ${jobId}::uuid
      returning id
    `;
    if (rows.length === 0) {
      throw new Error('You can only change roles you added yourself.');
    }
  });
}
