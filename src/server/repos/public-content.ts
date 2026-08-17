import 'server-only';
import { withAnon, one } from '@/server/db';
import { toDomainAll, toDomain } from '@/server/case';
import type {
  Business, JobPosting, NewsArticle, TeamMember, DonationCampaign,
  EBook, VideoWorkshop, ContentTemplate, CommunityEvent, Company,
} from '@/types';

/**
 * Reads for the signed-out marketing pages.
 *
 * Runs as app_anonymous, so the "published only" filtering is the RLS policy's
 * decision rather than a WHERE clause that a later edit could drop. An
 * unverified business listing or an unpublished event is simply not visible to
 * this role.
 */

export async function listVerifiedBusinesses(): Promise<Business[]> {
  return withAnon(async (db) => {
    const rows = await db`select * from public.businesses order by is_featured desc, name asc`;
    return toDomainAll<Business>(rows);
  });
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  return withAnon(async (db) => {
    const row = await one(await db`select * from public.businesses where slug = ${slug}`);
    return row ? toDomain<Business>(row) : null;
  });
}

export interface PublicEvent {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
}

export async function listUpcomingEvents(): Promise<PublicEvent[]> {
  return withAnon(async (db) => {
    const rows = await db`
      select id, title, event_date as date, event_time as time
        from public.events
       where status = 'upcoming'
       order by event_date asc nulls last
    `;
    return toDomainAll<PublicEvent>(rows);
  });
}

export interface PublicVideo {
  id: string;
  title: string;
  category: string;
  video_url: string;
  duration: string | null;
  views: string | null;
  recorded_date: string | null;
}

export async function listVideos(): Promise<PublicVideo[]> {
  return withAnon(async (db) => {
    const rows = await db`
      select id, title, category, video_url, duration, views, recorded_date
        from public.youtube_videos
       order by display_order asc, created_at asc
    `;
    return rows as unknown as PublicVideo[];
  });
}

/**
 * Admin-managed marketing content, read for signed-out visitors.
 *
 * These entities all have an admin content manager in the portal, and the
 * public pages that render them were reading from the AUTHENTICATED portal
 * snapshot — which returns nothing to a visitor, so the pages shipped empty.
 * Reading them here as app_anonymous means the "published only" rule stays a
 * database policy (see 0003_rls_policies.sql: *_select_published) rather than
 * a WHERE clause a later edit could drop.
 *
 * Column aliases mirror src/server/repos/content.ts so the shapes match the
 * domain types in src/types, and the pages need no field renaming.
 */

export interface PublicContentBundle {
  jobPostings: JobPosting[];
  newsArticles: NewsArticle[];
  teamMembers: TeamMember[];
  donationCampaigns: DonationCampaign[];
  ebooks: EBook[];
  workshops: VideoWorkshop[];
  templates: ContentTemplate[];
  events: CommunityEvent[];
  companies: Company[];
}

export async function loadPublicContent(): Promise<PublicContentBundle> {
  return withAnon(async (db) => {
    // ONE statement, not eight. Promise.all over a tagged template looks
    // concurrent but a single connection serialises queries, so the old version
    // paid eight round trips (~2.7s from a dev machine) on every visit. Each
    // slice is a json_agg subquery, so this is one round trip and the shapes are
    // identical.
    const rows = await db`
      select
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, title, company, company_logo, location, province,
                 salary_min, salary_max, salary_period, job_type, category,
                 description, requirements, responsibilities, contact_email,
                 apply_url, tags, is_featured, is_active, posted_at, expires_at, created_at
            from public.jobs order by is_featured desc, posted_at desc nulls last
        ) t) as jobs,
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, title, summary, content, image, author, category,
                 published_at, is_published, created_at
            from public.news_articles order by published_at desc nulls last
        ) t) as news,
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, name, role, bio, image, linkedin_url,
                 display_order as "order", is_published, created_at
            from public.team_members order by display_order asc
        ) t) as team,
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, title, description, goal_amount, raised_amount, is_active, created_at
            from public.donation_campaigns order by created_at desc
        ) t) as donations,
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, title, author, type, size, color, image,
                 download_url, is_published, created_at
            from public.ebooks order by created_at desc
        ) t) as ebooks,
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, title, duration, recorded_date, platform,
                 thumbnail_image, video_url, is_published, created_at
            from public.workshops order by created_at desc
        ) t) as workshops,
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, title, file_type, category, image, access_url, is_published, created_at
            from public.content_templates order by created_at desc
        ) t) as templates,
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, title, description, event_date as date, event_time as time,
                 location, event_type, capacity, attendees, image, is_featured,
                 platform, rsvp_url, status, is_published, created_at
            from public.events order by event_date asc nulls last
        ) t) as events,
        -- The employer directory. Read from company_helper_counts, never the
        -- base tables: it carries a helper COUNT and no insider identity, which
        -- is what makes it safe to hand an anonymous visitor.
        (select coalesce(json_agg(t), '[]'::json) from (
          select id, name, slug, logo, industry, size_range, city, province,
                 website, careers_url, description_short, source_kind,
                 open_jobs_count, jobs_synced_at, helper_count
            from public.company_helper_counts
           order by helper_count desc, open_jobs_count desc, name asc
        ) t) as companies
    `;

    // RLS still decides what each subquery may see: app_anonymous only matches
    // the *_select_published policies, so nothing unpublished is in here.
    const b = rows[0] as Record<string, unknown[]>;

    return {
      jobPostings: toDomainAll<JobPosting>(b.jobs),
      newsArticles: toDomainAll<NewsArticle>(b.news),
      teamMembers: toDomainAll<TeamMember>(b.team),
      donationCampaigns: toDomainAll<DonationCampaign>(b.donations),
      ebooks: toDomainAll<EBook>(b.ebooks),
      workshops: toDomainAll<VideoWorkshop>(b.workshops),
      templates: toDomainAll<ContentTemplate>(b.templates),
      events: toDomainAll<CommunityEvent>(b.events),
      companies: toDomainAll<Company>(b.companies),
    };
  });
}

// ============================================================ Public writes

/**
 * Public form submissions.
 *
 * Every one of these calls a SECURITY DEFINER function (0007) rather than
 * inserting directly: app_anonymous has no write grant on any table, so the
 * function is the whole attack surface, and it decides status itself. A
 * validation failure surfaces as a Postgres exception whose message is
 * written for a visitor to read.
 */

export interface InquiryInput {
  kind: 'contact' | 'volunteer_help';
  name: string;
  email: string;
  message: string;
  phone?: string;
  subject?: string;
  requestedFor?: string;
  category?: string;
}

export async function submitInquiry(input: InquiryInput): Promise<void> {
  await withAnon(async (db) => {
    await db`
      select public.submit_inquiry(
        ${input.kind}, ${input.name}, ${input.email}, ${input.message},
        ${input.phone ?? null}, ${input.subject ?? null},
        ${input.requestedFor ?? null}, ${input.category ?? null}
      )
    `;
  });
}

export interface BusinessApplicationInput {
  name: string;
  category: string;
  descriptionShort?: string;
  descriptionFull?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  yearsInBusiness?: number;
  services?: string[];
  memberBenefits?: string[];
  memberRateText?: string;
  // Added with 0011 so the wizard stops discarding these.
  subcategory?: string;
  serviceArea?: string;
  businessHours?: string;
  pricingSummary?: string;
  offerBadge?: string;
  logo?: string;
  /** Social and review links, keyed by platform. */
  socialLinks?: Record<string, string>;
  /** Applicant detail with no dedicated column; review context for admins. */
  submissionDetails?: Record<string, unknown>;
}

export async function submitBusinessApplication(input: BusinessApplicationInput): Promise<void> {
  await withAnon(async (db) => {
    await db`
      select public.submit_business_application(
        ${input.name}, ${input.category}, ${input.descriptionShort ?? null},
        ${input.descriptionFull ?? null}, ${input.contactPerson ?? null},
        ${input.phone ?? null}, ${input.email ?? null}, ${input.website ?? null},
        ${input.address ?? null}, ${input.city ?? null}, ${input.province ?? null},
        ${input.postalCode ?? null}, ${input.yearsInBusiness ?? null},
        ${input.services ?? []}, ${input.memberBenefits ?? []},
        ${input.memberRateText ?? null},
        ${input.subcategory ?? null}, ${input.serviceArea ?? null},
        ${input.businessHours ?? null}, ${input.pricingSummary ?? null},
        ${input.offerBadge ?? null}, ${input.logo ?? null},
        ${JSON.stringify(input.socialLinks ?? {})}::jsonb,
        ${JSON.stringify(input.submissionDetails ?? {})}::jsonb
      )
    `;
  });
}

export interface PublicVolunteer {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  city: string | null;
  province: string | null;
  linkedinUrl: string | null;
  yearsExperience: number | null;
  expertiseAreas: string[] | null;
  languages: string[] | null;
  mentorshipInterest: boolean;
  referralSupportInterest: boolean;
  resumeReviewInterest: boolean;
  settlementSupportInterest: boolean;
  taxGuidanceInterest: boolean;
  immigrationGuidanceInterest: boolean;
}

/** Approved volunteers, professional facts only — no contact details. */
export async function listPublicVolunteers(): Promise<PublicVolunteer[]> {
  return withAnon(async (db) => {
    const rows = await db`
      select * from public.public_volunteers
      order by years_experience desc nulls last, name asc
    `;
    return toDomainAll<PublicVolunteer>(rows);
  });
}
