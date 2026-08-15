-- ============================================================================
-- 0006 — Media on community posts.
--
-- media is a jsonb array of { "url": string, "type": "image" | "video" },
-- max four images or one video, validated in the server action. Files live
-- in Vercel Blob (public, unguessable URLs); the database stores pointers
-- only. RLS from 0005 already covers the column: media is part of the post
-- row, so whoever can see the post can see its media pointers.
-- ============================================================================

alter table public.community_posts
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.community_posts
  drop constraint if exists community_posts_media_shape;

alter table public.community_posts
  add constraint community_posts_media_shape
  check (jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 4);
