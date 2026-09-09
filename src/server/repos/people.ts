import 'server-only';
import { withUserRead } from '@/server/db';

/**
 * One member's public profile, as another member sees it.
 *
 * Everything readable here is published by the 0041 views and nothing else:
 * `member_profiles` for the professional fields, `member_event_participation`
 * for club events they RSVPd to, and `member_social_counts()` for follower
 * totals without the edges behind them. Contact columns and the help-desk
 * fields are not in those views on purpose - see the migration header before
 * adding anything.
 *
 * ONE statement, not six. The database is remote (~280ms a round trip) and
 * Next runs a client's Server Action calls one at a time, so a profile built
 * from six queries would be most of two seconds of staring at a skeleton.
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

export interface MemberProfilePost {
  id: string;
  body: string;
  createdAt: string;
  groupId: string | null;
}

export interface MemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  company: string | null;
  industry: string | null;
  professionalCategory: string | null;
  experienceRange: string | null;
  educationLevel: string | null;
  fieldOfStudy: string | null;
  skills: string | null;
  certifications: string | null;
  professionalSummary: string | null;
  linkedinUrl: string | null;
  city: string | null;
  province: string | null;
  isVolunteer: boolean;
  verified: boolean;
  memberSince: string;
  /** My follow edge toward them, and theirs toward me. */
  outgoing: 'none' | 'pending' | 'accepted';
  incoming: 'none' | 'pending' | 'accepted';
  followers: number;
  following: number;
  /** Set when a conversation between us already exists. */
  conversationId: string | null;
  /** True when I have blocked them - the page offers unblock, not Message. */
  blocked: boolean;
  events: MemberProfileEvent[];
  business: MemberProfileBusiness | null;
  posts: MemberProfilePost[];
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
        m.id, m.first_name, m.last_name, m.job_title, m.company, m.industry,
        m.professional_category, m.experience_range, m.education_level,
        m.field_of_study, m.skills, m.certifications, m.professional_summary,
        m.linkedin_url, m.city, m.province, m.is_volunteer, m.created_at,
        (m.verification_status = 'verified') as verified,

        (select f.status from public.member_follows f
          where f.follower_id = $1 and f.followee_id = m.id) as outgoing,
        (select f.status from public.member_follows f
          where f.follower_id = m.id and f.followee_id = $1) as incoming,

        c.followers, c.following,

        -- Only MY block is visible under RLS (0021), which is the point: the
        -- blocked person must never be able to detect it.
        exists (select 1 from public.member_blocks b
                 where b.blocker_id = $1 and b.blocked_id = m.id) as blocked,

        (select conv.id from public.member_conversations conv
          where (conv.member_a_id, conv.member_b_id)
                = (least($1::uuid, m.id), greatest($1::uuid, m.id))) as conversation_id,

        (select coalesce(json_agg(t order by t.event_date desc nulls last), '[]'::json) from (
          select p.event_id, p.title, p.event_date, p.event_time, p.location,
                 p.event_type, p.status, p.image
            from public.member_event_participation p
           where p.member_id = m.id
           limit 30
        ) t) as events,

        -- A verified business they run. businesses_select_public already limits
        -- members to verified rows, so no extra guard is needed here.
        (select row_to_json(t) from (
          select b.id, b.name, b.slug, b.category, b.city, b.logo
            from public.businesses b
           where b.created_by = m.id and b.verification_status = 'verified'
           order by b.created_at
           limit 1
        ) t) as business,

        -- RLS decides which of their posts I may see (own, followed, group,
        -- minus blocked authors), so this needs no visibility clause of its own.
        (select coalesce(json_agg(t order by t.created_at desc), '[]'::json) from (
          select po.id, po.body, po.created_at, po.group_id
            from public.community_posts po
           where po.author_id = m.id and po.status = 'active'
           order by po.created_at desc
           limit 5
        ) t) as posts

        from public.member_profiles m
        cross join lateral public.member_social_counts(m.id) c
       where m.id = $2 and m.id <> $1
      `,
      [userId, memberId]
    );

    const r = rows[0];
    if (!r) return null;

    return {
      id: r.id as string,
      firstName: r.first_name as string,
      lastName: r.last_name as string,
      jobTitle: (r.job_title as string | null) || null,
      company: (r.company as string | null) || null,
      industry: (r.industry as string | null) || null,
      professionalCategory: (r.professional_category as string | null) || null,
      experienceRange: (r.experience_range as string | null) || null,
      educationLevel: (r.education_level as string | null) || null,
      fieldOfStudy: (r.field_of_study as string | null) || null,
      skills: (r.skills as string | null) || null,
      certifications: (r.certifications as string | null) || null,
      professionalSummary: (r.professional_summary as string | null) || null,
      linkedinUrl: (r.linkedin_url as string | null) || null,
      city: (r.city as string | null) || null,
      province: (r.province as string | null) || null,
      isVolunteer: Boolean(r.is_volunteer),
      verified: Boolean(r.verified),
      memberSince: iso(r.created_at) as string,
      outgoing: ((r.outgoing as string | null) ?? 'none') as MemberProfile['outgoing'],
      incoming: ((r.incoming as string | null) ?? 'none') as MemberProfile['incoming'],
      followers: Number(r.followers ?? 0),
      following: Number(r.following ?? 0),
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
      business: r.business
        ? {
          id: (r.business as Record<string, unknown>).id as string,
          name: (r.business as Record<string, unknown>).name as string,
          slug: (r.business as Record<string, unknown>).slug as string,
          category: ((r.business as Record<string, unknown>).category as string | null) ?? null,
          city: ((r.business as Record<string, unknown>).city as string | null) ?? null,
          logo: ((r.business as Record<string, unknown>).logo as string | null) ?? null,
        }
        : null,
      posts: ((r.posts ?? []) as Record<string, unknown>[]).map((p) => ({
        id: p.id as string,
        body: p.body as string,
        createdAt: iso(p.created_at) as string,
        groupId: (p.group_id as string | null) ?? null,
      })),
    };
  });
}
