import 'server-only';
import { withUserRead, one } from '@/server/db';

/**
 * The member home feed: everything the dashboard shows, scoped to the
 * member's city, in ONE round trip.
 *
 * City scoping is deliberately fuzzy-tolerant. Events and jobs store location
 * as free text ("Toronto, ON", "Downtown Toronto"), so sections match with
 * ILIKE '%city%' and fall back to the unscoped list when the city has nothing
 * — an empty home screen teaches a member nothing, and InterNations shows
 * national content in small hubs for the same reason.
 *
 * Privacy notes:
 * - "New in {city}" reads member_names (0014): names, titles, join dates. No
 *   contact columns exist in that view.
 * - Jobs come from company_helper_counts + company_jobs: the insider count is
 *   an aggregate, never a person.
 */

export interface HomeFeed {
  city: string | null;
  completenessPct: number;
  newMembers: { id: string; firstName: string; lastName: string; jobTitle: string | null; city: string | null; createdAt: string }[];
  events: { id: string; title: string; date: string | null; time: string | null; location: string | null; eventType: string; attendees: number; image: string | null; rsvpUrl: string | null; inCity: boolean }[];
  groups: { id: string; slug: string; name: string; description: string; memberCount: number; isMember: boolean; inCity: boolean }[];
  jobs: { companyId: string; companyName: string; companyLogo: string | null; companySlug: string; helperCount: number; cityJobs: number; sample: string | null }[];
  businesses: { id: string; name: string; slug: string; logo: string | null; category: string; city: string | null; memberRateText: string | null; offerBadge: string | null }[];
  counters: { openRequests: number; pendingReferralAsks: number; myUpcomingEvents: number; savedBusinesses: number; unreadMessages: number };
}

/**
 * Fields that count toward profile completeness, chosen because each one
 * makes the member easier to help: what they do, where they are, and what
 * they came for. Mirrors the spirit of the signup wizard, not its whole
 * surface — optional flourishes should not drag the ring down forever.
 */
const COMPLETENESS_FIELDS = [
  'first_name', 'last_name', 'phone', 'city', 'province', 'current_status',
  'joining_for', 'job_title', 'industry', 'experience_range',
  'education_level', 'professional_summary', 'linkedin_url', 'skills',
] as const;

export async function fetchHomeFeed(userId: string): Promise<HomeFeed> {
  return withUserRead(userId, async (db) => {
    const fieldChecks = COMPLETENESS_FIELDS
      .map((f) => `(case when nullif(btrim(coalesce(me.${f}, '')), '') is not null then 1 else 0 end)`)
      .join(' + ');

    const row = await one<Record<string, unknown>>(await db.run(
      `
      with me as (
        select * from public.profiles where id = $1
      )
      select
        (select city from me) as city,

        (select round(100.0 * (${fieldChecks}) / ${COMPLETENESS_FIELDS.length}) from me)::int
          as completeness_pct,

        -- New members in my city (me excluded), newest first. Falls back to
        -- newest anywhere so a small hub still sees a living club.
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, first_name, last_name, job_title, city, created_at
            from public.member_names n
           where n.id <> $1
           order by (lower(coalesce(n.city, '')) = lower(coalesce((select city from me), ''))) desc,
                    n.created_at desc
           limit 6
        ) t) as new_members,

        -- Upcoming events: city matches first, then the rest.
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, title, event_date as date, event_time as time, location,
                 event_type, attendees, image, rsvp_url,
                 (coalesce((select city from me), '') <> '' and
                  location ilike '%' || (select city from me) || '%') as in_city
            from public.events
           where status = 'upcoming' and is_published
           order by in_city desc, event_date asc nulls last
           limit 4
        ) t) as events,

        -- Groups with live member counts; my-city groups first (matched on the
        -- group's own name/description), then the biggest.
        (select coalesce(json_agg(t), '[]'::json) from (
          select g.id, g.slug, g.name, g.description,
                 (select count(*) from public.community_group_members m
                   where m.group_id = g.id)::int as member_count,
                 exists (select 1 from public.community_group_members m
                          where m.group_id = g.id and m.member_id = $1) as is_member,
                 (coalesce((select city from me), '') <> '' and
                  (g.name ilike '%' || (select city from me) || '%' or
                   g.description ilike '%' || (select city from me) || '%')) as in_city
            from public.community_groups g
           where not g.is_archived
           order by in_city desc, member_count desc
           limit 6
        ) t) as groups,

        -- Employers with open roles in my city; the helper count is the hook.
        (select coalesce(json_agg(t), '[]'::json) from (
          select c.id as company_id, c.name as company_name, c.logo as company_logo,
                 c.slug as company_slug, c.helper_count,
                 (select count(*) from public.company_jobs j
                   where j.company_id = c.id and j.is_open
                     and coalesce((select city from me), '') <> ''
                     and j.location ilike '%' || (select city from me) || '%')::int as city_jobs,
                 (select j.title from public.company_jobs j
                   where j.company_id = c.id and j.is_open
                     and (coalesce((select city from me), '') = '' or
                          j.location ilike '%' || (select city from me) || '%')
                   order by j.posted_at desc nulls last limit 1) as sample
            from public.company_helper_counts c
           where c.open_jobs_count > 0 or c.helper_count > 0
           order by city_jobs desc, c.helper_count desc, c.open_jobs_count desc
           limit 5
        ) t) as jobs,

        -- Verified businesses, my city first, member offers first within that.
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, name, slug, logo, category, city, member_rate_text, offer_badge,
                 (coalesce((select city from me), '') <> '' and
                  city ilike '%' || (select city from me) || '%') as in_city
            from public.businesses
           where verification_status = 'verified'
           order by in_city desc, has_member_rate desc, is_featured desc
           limit 6
        ) t) as businesses,

        -- The "don't forget" counters.
        (select count(*) from public.help_requests r
          where r.member_id = $1
            and r.status not in ('resolved', 'closed', 'rejected'))::int as open_requests,
        (select count(*) from public.referral_inbox i
          where i.my_status = 'pending' and i.request_status = 'open')::int as pending_referral_asks,
        (select count(*) from public.events e
          where e.status = 'upcoming' and e.is_published)::int as my_upcoming_events,
        (select count(*) from public.member_saved_businesses s
          where s.member_id = $1)::int as saved_businesses,
        (select count(*) from public.messages m
          where m.recipient_user_id = $1 and not m.read)::int as unread_messages
      `,
      [userId]
    ));

    const j = (v: unknown) => (v ?? []) as never[];
    const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | null));

    return {
      city: (row?.city as string | null) ?? null,
      completenessPct: Number(row?.completeness_pct ?? 0),
      newMembers: j(row?.new_members).map((m: Record<string, unknown>) => ({
        id: m.id as string, firstName: m.first_name as string, lastName: m.last_name as string,
        jobTitle: (m.job_title as string | null) ?? null, city: (m.city as string | null) ?? null,
        createdAt: iso(m.created_at) as string,
      })),
      events: j(row?.events).map((e: Record<string, unknown>) => ({
        id: e.id as string, title: e.title as string, date: iso(e.date), time: (e.time as string | null) ?? null,
        location: (e.location as string | null) ?? null, eventType: e.event_type as string,
        attendees: Number(e.attendees ?? 0), image: (e.image as string | null) ?? null,
        rsvpUrl: (e.rsvp_url as string | null) ?? null, inCity: Boolean(e.in_city),
      })),
      groups: j(row?.groups).map((g: Record<string, unknown>) => ({
        id: g.id as string, slug: g.slug as string, name: g.name as string,
        description: g.description as string, memberCount: Number(g.member_count ?? 0),
        isMember: Boolean(g.is_member), inCity: Boolean(g.in_city),
      })),
      jobs: j(row?.jobs).map((c: Record<string, unknown>) => ({
        companyId: c.company_id as string, companyName: c.company_name as string,
        companyLogo: (c.company_logo as string | null) ?? null, companySlug: c.company_slug as string,
        helperCount: Number(c.helper_count ?? 0), cityJobs: Number(c.city_jobs ?? 0),
        sample: (c.sample as string | null) ?? null,
      })),
      businesses: j(row?.businesses).map((b: Record<string, unknown>) => ({
        id: b.id as string, name: b.name as string, slug: b.slug as string,
        logo: (b.logo as string | null) ?? null, category: b.category as string,
        city: (b.city as string | null) ?? null,
        memberRateText: (b.member_rate_text as string | null) ?? null,
        offerBadge: (b.offer_badge as string | null) ?? null,
      })),
      counters: {
        openRequests: Number(row?.open_requests ?? 0),
        pendingReferralAsks: Number(row?.pending_referral_asks ?? 0),
        myUpcomingEvents: Number(row?.my_upcoming_events ?? 0),
        savedBusinesses: Number(row?.saved_businesses ?? 0),
        unreadMessages: Number(row?.unread_messages ?? 0),
      },
    };
  });
}
