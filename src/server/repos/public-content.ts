import 'server-only';
import { withAnon, one } from '@/server/db';
import { toDomainAll, toDomain } from '@/server/case';
import type { Business } from '@/types';

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
