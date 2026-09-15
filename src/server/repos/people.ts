import 'server-only';
import { withUserRead } from '@/server/db';

/**
 * One member's profile, as another member sees it.
 *
 * Two halves. The PUBLIC half is what already sits under every post the member
 * writes - name, role, employer, city - plus whether they volunteer, when they
 * joined, their counts, and whether the profile is private. The PRIVATE half -
 * work details, skills, education, certifications, summary, LinkedIn, events,
 * business, posts - is nulled out unless can_view_member() (0051) says the
 * caller may see it: themselves, an admin, a public profile, or an accepted
 * follow. The database decides that, in a definer function; this file only
 * shapes the answer.
 *
 * ONE statement. The database is remote and Next runs a client's Server Action
 * calls one at a time, so a profile built from six queries is two seconds of
 * skeleton. Posts are the exception: they load on their own, after the page has
 * painted, and only when the caller may see them.
 */

export interface MemberProfileEvent {
  eventId: string;
  title: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  eventType: string;
  status: string;
  image: string | null;
}

export interface MemberProfileBusiness {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  city: string | null;
  logo: string | null;
}

export interface MemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  company: string | null;
  city: string | null;
  province: string | null;
  isVolunteer: boolean;
  verified: boolean;
  memberSince: string;
  /** Private by default (0051). Public information in itself. */
  isPrivate: boolean;
  /** Whether the caller may read the private half and the posts. */
  canView: boolean;
  /** Everything below is null / empty when canView is false. */
  industry: string | null;
  professionalCategory: string | null;
  experienceRange: string | null;
  educationLevel: string | null;
  fieldOfStudy: string | null;
  skills: string | null;
  certifications: string | null;
  professionalSummary: string | null;
  linkedinUrl: string | null;
  events: MemberProfileEvent[];
  business: MemberProfileBusiness | null;
  /** My follow edge toward them, and theirs toward me. */
  outgoing: 'none' | 'pending' | 'accepted';
  incoming: 'none' | 'pending' | 'accepted';
  followers: number;
  following: number;
  postCount: number;
  /** Set when a conversation between us already exists. */
  conversationId: string | null;
  /** True when I have blocked them - the page offers unblock, not Message. */
  blocked: boolean;
}

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : (v as string | null);

/**
 * Null when the id is not an active member, or is the caller's own id (the
 * member's own profile has its own screen with editing on it).
 */
export async function memberProfile(
  userId: string,
  memberId: string
): Promise<MemberProfile | null> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `
      select
        m.id, m.first_name, m.last_name, m.job_title, m.company, m.city, m.province,
        m.is_volunteer, m.created_at, m.is_private,
        (m.verification_status = 'verified') as verified,
        v.ok as can_view,

        -- The private half, nulled unless the caller may see it.
        case when v.ok then m.industry end              as industry,
        case when v.ok then m.professional_category end as professional_category,
        case when v.ok then m.experience_range end      as experience_range,
        case when v.ok then m.education_level end       as education_level,
        case when v.ok then m.field_of_study end        as field_of_study,
        case when v.ok then m.skills end                as skills,
        case when v.ok then m.certifications end        as certifications,
        case when v.ok then m.professional_summary end  as professional_summary,
        case when v.ok then m.linkedin_url end          as linkedin_url,

        (select f.status from public.member_follows f
          where f.follower_id = $1 and f.followee_id = m.id) as outgoing,
        (select f.status from public.member_follows f
          where f.follower_id = m.id and f.followee_id = $1) as incoming,

        c.followers, c.following,

        -- Counts are public on every network; the posts themselves are not.
        (select count(*)::int from public.community_posts po
          where po.author_id = m.id and po.status = 'active') as post_count,

        -- Only MY block is visible under RLS (0021), which is the point: the
        -- blocked person must never be able to detect it.
        exists (select 1 from public.member_blocks b
                 where b.blocker_id = $1 and b.blocked_id = m.id) as blocked,

        (select conv.id from public.member_conversations conv
          where (conv.member_a_id, conv.member_b_id)
                = (least($1::uuid, m.id), greatest($1::uuid, m.id))) as conversation_id,

        case when v.ok then (
          select coalesce(json_agg(t order by t.event_date desc nulls last), '[]'::json) from (
            select p.event_id, p.title, p.event_date, p.event_time, p.location,
                   p.event_type, p.status, p.image
              from public.member_event_participation p
             where p.member_id = m.id
             limit 30
          ) t
        ) else '[]'::json end as events,

        -- A verified business they run. businesses_select_public already limits
        -- members to verified rows, so no extra guard is needed here.
        case when v.ok then (
          select row_to_json(t) from (
            select b.id, b.name, b.slug, b.category, b.city, b.logo
              from public.businesses b
             where b.created_by = m.id and b.verification_status = 'verified'
             order by b.created_at
             limit 1
          ) t
        ) end as business

        from public.member_profiles m
        cross join lateral public.member_social_counts(m.id) c
        cross join lateral (select public.can_view_member(m.id) as ok) v
       where m.id = $2 and m.id <> $1
      `,
      [userId, memberId]
    );

    const r = rows[0];
    if (!r) return null;

    const biz = r.business as Record<string, unknown> | null;
    return {
      id: r.id as string,
      firstName: r.first_name as string,
      lastName: r.last_name as string,
      jobTitle: (r.job_title as string | null) || null,
      company: (r.company as string | null) || null,
      city: (r.city as string | null) || null,
      province: (r.province as string | null) || null,
      isVolunteer: Boolean(r.is_volunteer),
      verified: Boolean(r.verified),
      memberSince: iso(r.created_at) as string,
      isPrivate: Boolean(r.is_private),
      canView: Boolean(r.can_view),
      industry: (r.industry as string | null) || null,
      professionalCategory: (r.professional_category as string | null) || null,
      experienceRange: (r.experience_range as string | null) || null,
      educationLevel: (r.education_level as string | null) || null,
      fieldOfStudy: (r.field_of_study as string | null) || null,
      skills: (r.skills as string | null) || null,
      certifications: (r.certifications as string | null) || null,
      professionalSummary: (r.professional_summary as string | null) || null,
      linkedinUrl: (r.linkedin_url as string | null) || null,
      outgoing: ((r.outgoing as string | null) ?? 'none') as MemberProfile['outgoing'],
      incoming: ((r.incoming as string | null) ?? 'none') as MemberProfile['incoming'],
      followers: Number(r.followers ?? 0),
      following: Number(r.following ?? 0),
      postCount: Number(r.post_count ?? 0),
      conversationId: (r.conversation_id as string | null) ?? null,
      blocked: Boolean(r.blocked),
      events: ((r.events ?? []) as Record<string, unknown>[]).map((e) => ({
        eventId: e.event_id as string,
        title: e.title as string,
        eventDate: iso(e.event_date),
        eventTime: (e.event_time as string | null) ?? null,
        location: (e.location as string | null) ?? null,
        eventType: (e.event_type as string) ?? 'in_person',
        status: (e.status as string) ?? 'upcoming',
        image: (e.image as string | null) ?? null,
      })),
      business: biz
        ? {
          id: biz.id as string,
          name: biz.name as string,
          slug: biz.slug as string,
          category: (biz.category as string | null) ?? null,
          city: (biz.city as string | null) ?? null,
          logo: (biz.logo as string | null) ?? null,
        }
        : null,
    };
  });
}
