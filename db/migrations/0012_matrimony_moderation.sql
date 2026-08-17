-- ============================================================================
-- 0012 — Make matrimony moderation decisions stick.
--
-- Two gaps the admin UI could not work around:
--
-- 1. matrimony_media recorded approval as one boolean, so "reject" had nowhere
--    to go: the photo simply stayed unapproved and reappeared in the queue on
--    the next refresh, and the admin could not tell "not looked at yet" from
--    "looked at and refused". A three-state column fixes that; is_approved
--    stays as the flag the reader pages already consult, kept in step below.
--
-- 2. matrimony_reports and matrimony_verifications both already have a status
--    column with a proper check constraint, but nothing in the application
--    ever wrote either one, so a report could be filed and read and never
--    resolved. No schema change needed there, only the repository functions
--    and actions that 0012's companion code adds.
-- ============================================================================

alter table public.matrimony_media
  add column if not exists moderation_status text not null default 'pending';

alter table public.matrimony_media
  drop constraint if exists matrimony_media_moderation_status_check;

alter table public.matrimony_media
  add constraint matrimony_media_moderation_status_check
    check (moderation_status in ('pending', 'approved', 'rejected'));

-- Existing rows: anything already approved is approved, the rest are pending.
update public.matrimony_media
   set moderation_status = case when is_approved then 'approved' else 'pending' end
 where moderation_status = 'pending';

-- is_approved is what matrimony_visible_profiles and the reader pages check,
-- so keep the boolean in step with the status rather than teaching every
-- reader about the new column.
create or replace function public.sync_matrimony_media_approval()
returns trigger
language plpgsql
as $$
begin
  new.is_approved := (new.moderation_status = 'approved');
  return new;
end;
$$;

drop trigger if exists matrimony_media_sync_approval on public.matrimony_media;
create trigger matrimony_media_sync_approval
  before insert or update of moderation_status on public.matrimony_media
  for each row execute function public.sync_matrimony_media_approval();

comment on column public.matrimony_media.moderation_status is
  'pending | approved | rejected. is_approved mirrors this through a trigger and remains what the reader pages and the visible-profiles view consult.';
