-- =============================================================================
-- 0009: matrimony_profiles.photo_visibility must accept the values the app writes
-- =============================================================================
--
-- 0002 created the column with check (photo_visibility in ('public', 'members',
-- 'on_request', 'private')), but the application settled on a different
-- vocabulary and uses it everywhere: MatrimonyPhotoVisibility in
-- src/types/matrimony.ts, aboutSchema in src/lib/matrimony/schemas.ts, the
-- profile wizard, the matrimony settings page, and the two reader pages that
-- branch on 'all' and 'blurred'.
--
-- The consequence was total: the wizard sends photo_visibility 'all' by default,
-- so every save (draft or submit) failed the check constraint and no member could
-- create a matrimony listing at all. Six call sites against one constraint, so
-- the column follows the application.
--
-- Apply in the Neon SQL editor, like the other migrations here.

alter table public.matrimony_profiles
  drop constraint if exists matrimony_profiles_photo_visibility_check;

-- Anything stored under the old vocabulary is folded onto the new one first, so
-- the constraint can go back on. 'members' and 'public' both mean "other members
-- see the photo", which is what the app calls 'all'; 'private' has no equivalent,
-- and 'on_request' is the closest setting that hides the photo by default.
update public.matrimony_profiles
   set photo_visibility = case photo_visibility
         when 'public'  then 'all'
         when 'members' then 'all'
         when 'private' then 'on_request'
         else photo_visibility
       end
 where photo_visibility in ('public', 'members', 'private');

alter table public.matrimony_profiles
  add constraint matrimony_profiles_photo_visibility_check
    check (photo_visibility in ('all', 'on_request', 'blurred'));

-- Note: public.matrimony_media.visibility carries the same 0002 vocabulary and
-- the same disagreement with MatrimonyPhotoVisibility. It is left alone because
-- nothing writes it — photos are inserted with the column default 'on_request',
-- which is valid in both sets — and profile-level photo_visibility is what the
-- reader pages consult. Align it too if per-photo visibility ever ships.
