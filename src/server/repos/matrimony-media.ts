import 'server-only';
import { withUser, one } from '@/server/db';
import type { MatrimonyMedia } from '@/types/matrimony';

/**
 * Photos on the caller's own matrimony listing.
 *
 * The only write path for public.matrimony_media. It follows the same two rules
 * as src/server/repos/matrimony.ts:
 *   - the profile id is resolved from the caller's user id, never accepted as a
 *     parameter, so a photo can only ever land on your own listing;
 *   - `is_approved` and `visibility` are left at their column defaults (false,
 *     'on_request'). Moderation is what releases a photo to other members
 *     (matrimony_media_select in 0003_rls_policies.sql), so a member must not be
 *     able to set either.
 */

/** Storage is not free and the wizard shows a fixed grid. */
export const MAX_PHOTOS = 6;

export async function addPhoto(userId: string, url: string): Promise<MatrimonyMedia> {
  return withUser(userId, async (db) => {
    const mine = await one<{ id: string }>(
      await db`select public.my_matrimony_profile_id() as id`
    );
    if (!mine?.id) throw new Error('Create your profile first.');

    // One statement carries two decisions so the insert costs a single round
    // trip: HAVING enforces the cap, and `count(*) = 0` makes the first photo the
    // primary one, which is the only one browse joins.
    const rows = await db<MatrimonyMedia>`
      insert into public.matrimony_media (profile_id, type, url, is_primary)
      select ${mine.id}::uuid, 'photo', ${url}, count(*) = 0
        from public.matrimony_media
       where profile_id = ${mine.id}::uuid and type = 'photo'
      having count(*) < ${MAX_PHOTOS}
      returning *
    `;

    // No row means HAVING rejected it: the member is already at the cap.
    if (!rows[0]) throw new Error(`You can add up to ${MAX_PHOTOS} photos.`);

    // Timestamps cross the Server Action boundary as ISO strings, same as the
    // matrimony repository's normalise().
    return { ...rows[0], created_at: new Date(rows[0].created_at).toISOString() };
  });
}

export async function removePhoto(userId: string, mediaId: string): Promise<void> {
  await withUser(userId, async (db) => {
    // my_matrimony_profile_id() in the predicate rather than a fetched id: it is
    // what the delete policy checks anyway, and it saves a round trip.
    await db`
      delete from public.matrimony_media
       where id = ${mediaId}::uuid
         and profile_id = public.my_matrimony_profile_id()
    `;

    // Browse joins the primary photo only, so a listing whose primary was just
    // removed would show no photo at all while still holding some. Promote the
    // oldest survivor.
    await db`
      update public.matrimony_media
         set is_primary = true
       where id = (
               select id from public.matrimony_media
                where profile_id = public.my_matrimony_profile_id()
                  and type = 'photo'
                order by created_at
                limit 1
             )
         and not exists (
               select 1 from public.matrimony_media
                where profile_id = public.my_matrimony_profile_id()
                  and type = 'photo' and is_primary
             )
    `;
  });
}
