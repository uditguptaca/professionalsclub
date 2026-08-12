import 'server-only';
import type { ColumnMap } from '@/server/query';

/**
 * The admin-managed content tables.
 *
 * Each entry is the allowlist of writable columns for that table. Anything not
 * listed cannot be inserted or updated through the generic CRUD actions —
 * notably `id`, `created_at` and `updated_at`, which belong to the database.
 */

export type ContentEntity =
  | 'ebooks'
  | 'workshops'
  | 'templates'
  | 'events'
  | 'team'
  | 'news'
  | 'donations'
  | 'jobs';

export interface ContentTable {
  table: string;
  columns: ColumnMap;
  /** ORDER BY applied on read. */
  order: string;
}

export const CONTENT_TABLES: Record<ContentEntity, ContentTable> = {
  ebooks: {
    table: 'public.ebooks',
    order: 'created_at desc',
    columns: {
      title: 'title',
      author: 'author',
      type: 'type',
      size: 'size',
      color: 'color',
      image: 'image',
      downloadUrl: 'download_url',
      isPublished: 'is_published',
    },
  },

  workshops: {
    table: 'public.workshops',
    order: 'created_at desc',
    columns: {
      title: 'title',
      duration: 'duration',
      recordedDate: 'recorded_date',
      platform: 'platform',
      thumbnailImage: 'thumbnail_image',
      videoUrl: 'video_url',
      isPublished: 'is_published',
    },
  },

  templates: {
    table: 'public.content_templates',
    order: 'created_at desc',
    columns: {
      title: 'title',
      fileType: 'file_type',
      category: 'category',
      image: 'image',
      accessUrl: 'access_url',
      isPublished: 'is_published',
    },
  },

  events: {
    table: 'public.events',
    order: 'event_date desc nulls last',
    columns: {
      title: 'title',
      description: 'description',
      // The domain type calls these `date` and `time`; both are reserved-ish in
      // SQL, hence the differing column names.
      date: 'event_date',
      time: 'event_time',
      location: 'location',
      eventType: 'event_type',
      capacity: 'capacity',
      attendees: 'attendees',
      image: 'image',
      isFeatured: 'is_featured',
      platform: 'platform',
      rsvpUrl: 'rsvp_url',
      status: 'status',
      isPublished: 'is_published',
    },
  },

  team: {
    table: 'public.team_members',
    order: 'display_order asc',
    columns: {
      name: 'name',
      role: 'role',
      bio: 'bio',
      image: 'image',
      linkedinUrl: 'linkedin_url',
      order: 'display_order',
      isPublished: 'is_published',
    },
  },

  news: {
    table: 'public.news_articles',
    order: 'published_at desc',
    columns: {
      title: 'title',
      summary: 'summary',
      content: 'content',
      image: 'image',
      author: 'author',
      category: 'category',
      publishedAt: 'published_at',
      isPublished: 'is_published',
    },
  },

  donations: {
    table: 'public.donation_campaigns',
    order: 'created_at desc',
    columns: {
      title: 'title',
      description: 'description',
      goalAmount: 'goal_amount',
      raisedAmount: 'raised_amount',
      isActive: 'is_active',
    },
  },

  jobs: {
    table: 'public.jobs',
    order: 'posted_at desc',
    columns: {
      title: 'title',
      company: 'company',
      companyLogo: 'company_logo',
      location: 'location',
      province: 'province',
      salaryMin: 'salary_min',
      salaryMax: 'salary_max',
      salaryPeriod: 'salary_period',
      jobType: 'job_type',
      category: 'category',
      description: 'description',
      requirements: 'requirements',
      responsibilities: 'responsibilities',
      contactEmail: 'contact_email',
      applyUrl: 'apply_url',
      tags: 'tags',
      isFeatured: 'is_featured',
      isActive: 'is_active',
      postedAt: 'posted_at',
      expiresAt: 'expires_at',
    },
  },
};
