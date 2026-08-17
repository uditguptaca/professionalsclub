import 'server-only';
import { withUser, withUserRead, withAnon, one } from '@/server/db';
import { toDomainAll, toDomain } from '@/server/case';
import type {
  Company, CompanyJob, CompanyInsider, ReferralInboxItem,
  MyReferralRequest, ReferralHelper,
} from '@/types';

/**
 * Company referrals.
 *
 * Two rules run through this file, both of them the point of the feature:
 *
 *   - Which members work where is never read from company_insiders except for
 *     the caller's own rows. The public number comes from
 *     company_helper_counts, which carries a count and no identity.
 *   - An insider's view of a request comes from referral_inbox and a seeker's
 *     view of their helpers from referral_helpers. Both are security_barrier
 *     views that NULL out identity until the insider has accepted, so the
 *     anonymity is not something this layer has to remember to apply.
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

/** Open roles at one company. These are public postings, so anyone may read them. */
export async function listCompanyJobs(userId: string, companyId: string): Promise<CompanyJob[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db`
      select * from public.company_jobs
       where company_id = ${companyId}::uuid and is_open
       order by posted_at desc nulls last, title asc
       limit 300
    `;
    return toDomainAll<CompanyJob>(rows);
  });
}

// ============================================================ Insider opt-in

/** The caller's own "where I work" rows. Never anybody else's. */
export async function listMyInsiderRoles(userId: string): Promise<CompanyInsider[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db`
      select i.*, c.name as company_name, c.logo as company_logo, c.slug as company_slug
        from public.company_insiders i
        join public.companies c on c.id = i.company_id
       where i.member_id = ${userId}::uuid
       order by c.name asc
    `;
    return toDomainAll<CompanyInsider>(rows);
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

/**
 * Ask for a referral. The fan-out, the notifications and the queued mail all
 * happen inside create_referral_request, because a member holds no grant to
 * write another member's rows.
 */
export async function createReferralRequest(
  userId: string,
  input: { companyId: string; jobIds: string[]; note?: string; resumeUrl?: string }
): Promise<{ requestId: string; notified: number }> {
  return withUser(userId, async (db) => {
    const ids = (Array.isArray(input.jobIds) ? input.jobIds : [])
      .filter((v): v is string => typeof v === 'string')
      .slice(0, 20);
    if (ids.length === 0) throw new Error('Choose at least one open role.');

    const row = await one(await db`
      select * from public.create_referral_request(
        ${input.companyId}::uuid, ${ids}::uuid[],
        ${input.note?.trim().slice(0, 2000) || null},
        ${input.resumeUrl?.trim() || null}
      )
    `);
    const r = row as { request_id: string; notified: number } | null;
    if (!r) throw new Error('Could not send the request.');
    return { requestId: r.request_id, notified: Number(r.notified) };
  });
}

/** The caller's own requests, with the roles and whoever has agreed to help. */
export async function listMyReferralRequests(userId: string): Promise<MyReferralRequest[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db`
      select r.id, r.headline, r.note, r.status, r.notified_count, r.created_at,
             c.id as company_id, c.name as company_name, c.logo as company_logo,
             coalesce((
               select json_agg(json_build_object(
                 'id', j.id, 'title', j.title, 'location', j.location,
                 'applyUrl', j.apply_url, 'isOpen', j.is_open
               ) order by j.title)
                 from public.referral_request_jobs rj
                 join public.company_jobs j on j.id = rj.job_id
                where rj.request_id = r.id
             ), '[]'::json) as jobs,
             -- referral_helpers only ever contains accepted rows, so this can
             -- never leak who was asked and declined.
             coalesce((
               select json_agg(json_build_object(
                 'recipientId', h.recipient_id, 'name', h.helper_name,
                 'title', h.helper_title, 'email', h.helper_email,
                 'linkedin', h.helper_linkedin, 'respondedAt', h.responded_at
               ) order by h.responded_at)
                 from public.referral_helpers h
                where h.request_id = r.id
             ), '[]'::json) as helpers
        from public.referral_requests r
        join public.companies c on c.id = r.company_id
       where r.seeker_id = ${userId}::uuid
       order by r.created_at desc
    `;
    return toDomainAll<MyReferralRequest>(rows);
  });
}

export async function withdrawReferralRequest(userId: string, requestId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`select public.withdraw_own_referral_request(${requestId}::uuid)`;
  });
}

// ============================================================ Insider inbox

/**
 * What this member has been asked to help with.
 *
 * Straight off referral_inbox: the identity columns are already NULL for
 * anything this insider has not accepted, so there is no filtering to get
 * wrong here.
 */
export async function listReferralInbox(userId: string): Promise<ReferralInboxItem[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db`
      select * from public.referral_inbox
       where request_status in ('open', 'matched')
       order by (my_status = 'pending') desc, created_at desc
       limit 100
    `;
    return toDomainAll<ReferralInboxItem>(rows);
  });
}

export async function respondToReferral(
  userId: string,
  requestId: string,
  accept: boolean
): Promise<void> {
  await withUser(userId, async (db) => {
    await db`select public.respond_to_referral(${requestId}::uuid, ${accept})`;
  });
}

/** How many asks are waiting on this member, for the nav badge. */
export async function countPendingReferrals(userId: string): Promise<number> {
  return withUserRead(userId, async (db) => {
    const row = await one(await db`
      select count(*)::int as n from public.referral_inbox
       where my_status = 'pending' and request_status = 'open'
    `);
    return (row as { n: number } | null)?.n ?? 0;
  });
}

export type { ReferralHelper };
