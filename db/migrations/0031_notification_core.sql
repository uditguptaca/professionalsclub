-- ============================================================================
-- 0031 — The notification system, part 1: the core
--
-- What was here before: a table (0002), an RLS policy letting a member read
-- their own rows, and five producers (matrimony interests, matrimony review,
-- the dead matrimony-message trigger, and the two referral functions from
-- 0030). No UI ever read any of it, and most modules never wrote one.
--
-- This migration builds the spine every module then hangs an event on:
--
--   category    which module the row belongs to, so the app can badge and
--               filter per module rather than showing one undifferentiated pile
--   actor_id    who caused it, so a row can carry a face
--   group_key   the collapse key. Twelve messages in one chat must be ONE
--               row that counts to twelve, not twelve rows. The partial unique
--               index makes that a cheap upsert instead of a scan.
--   event_count how many events the row stands for
--
-- Also closes a real hole: notify_user() was EXECUTE-granted to
-- app_authenticated, so any member could write any notification, with any
-- title and any link, to any other member - a ready-made phishing surface. All
-- production now happens inside SECURITY DEFINER triggers and the purpose-built
-- functions from 0030, which verify who is entitled to fire them. Nothing
-- client-facing needs the generic notifier, so nothing keeps the grant.
-- ============================================================================

alter table public.in_app_notifications
  add column if not exists category    text not null default 'general',
  add column if not exists actor_id    uuid references public.profiles(id) on delete set null,
  add column if not exists group_key   text,
  add column if not exists event_count integer not null default 1,
  add column if not exists updated_at  timestamptz not null default now();

-- The inbox reads "my unread, newest first"; the badges read counts per
-- category. Both are covered here.
create index if not exists idx_notifications_inbox
  on public.in_app_notifications (user_id, is_read, updated_at desc);
create index if not exists idx_notifications_category
  on public.in_app_notifications (user_id, category, is_read);

-- One live (unread) row per collapse key per member. Read rows are history and
-- may repeat, which is why the index is partial.
create unique index if not exists uq_notifications_group_live
  on public.in_app_notifications (user_id, group_key)
  where group_key is not null and not is_read;

-- ---------------------------------------------------------------------------
-- Per-module preferences. A missing row means everything is on, so a member
-- who never opens the settings still gets the full experience.
-- ---------------------------------------------------------------------------
create table if not exists public.notification_prefs (
  member_id  uuid primary key references public.profiles(id) on delete cascade,
  chat       boolean not null default true,
  social     boolean not null default true,
  referral   boolean not null default true,
  matrimony  boolean not null default true,
  community  boolean not null default true,
  help       boolean not null default true,
  event      boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;
grant select, insert, update on public.notification_prefs to app_authenticated;

drop policy if exists notification_prefs_own on public.notification_prefs;
create policy notification_prefs_own on public.notification_prefs
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (public.is_active_member() and member_id = app.current_user_id());

-- Definer, because a producer running as the OTHER member has to be able to
-- ask "does this person want this kind of news?" without reading their row.
create or replace function public.notifications_enabled(p_member uuid, p_category text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.notification_prefs;
begin
  select * into v_row from public.notification_prefs where member_id = p_member;
  if not found then
    return true;                       -- no preferences saved yet: everything on
  end if;
  return case p_category
    when 'chat'      then v_row.chat
    when 'social'    then v_row.social
    when 'referral'  then v_row.referral
    when 'matrimony' then v_row.matrimony
    when 'community' then v_row.community
    when 'help'      then v_row.help
    when 'volunteer' then v_row.help          -- volunteering rides with help desk
    when 'event'     then v_row.event
    else true                                  -- 'admin' and anything new: on
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- The one notifier every producer calls.
-- ---------------------------------------------------------------------------
create or replace function public.notify_member(
  p_user_id   uuid,
  p_category  text,
  p_type      text,
  p_title     text,
  p_body      text default '',
  p_link      text default null,
  p_actor     uuid default null,
  p_group_key text default null,
  p_metadata  jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null then
    return;
  end if;

  -- Nobody is told about their own action.
  if p_actor is not null and p_actor = p_user_id then
    return;
  end if;

  -- A blocked pair goes silent in both directions.
  if p_actor is not null and public.is_blocked_between_members(p_user_id, p_actor) then
    return;
  end if;

  if not public.notifications_enabled(p_user_id, p_category) then
    return;
  end if;

  if p_group_key is not null then
    update public.in_app_notifications
       set title       = p_title,
           body        = p_body,
           link        = coalesce(p_link, link),
           actor_id    = coalesce(p_actor, actor_id),
           event_count = event_count + 1,
           metadata    = coalesce(p_metadata, metadata),
           updated_at  = now()
     where user_id = p_user_id
       and group_key = p_group_key
       and not is_read;
    if found then
      return;
    end if;
  end if;

  insert into public.in_app_notifications
    (user_id, category, type, title, body, link, actor_id, group_key, metadata, updated_at)
  values
    (p_user_id, p_category, p_type, p_title, coalesce(p_body, ''), p_link,
     p_actor, p_group_key, coalesce(p_metadata, '{}'::jsonb), now());
end;
$$;

revoke all on function public.notify_member(uuid, text, text, text, text, text, uuid, text, jsonb) from public;
revoke all on function public.notify_member(uuid, text, text, text, text, text, uuid, text, jsonb) from app_authenticated;

-- The generic notifier stops being a member-callable endpoint. Definer
-- producers keep working: inside them the call runs as the function owner.
revoke all on function public.notify_user(uuid, text, text, text, text, jsonb) from app_authenticated;

-- The matrimony-message notifier fires on a table nothing has written since
-- 0018 moved that conversation into the member chat hub.
drop trigger if exists matrimony_messages_notify on public.matrimony_messages;

-- Existing rows predate categories; file them by their type prefix so the
-- inbox does not open with everything labelled "general".
update public.in_app_notifications set category = 'referral'
 where category = 'general' and type like 'referral%';
update public.in_app_notifications set category = 'matrimony'
 where category = 'general' and (type like 'matrimony%' or type like 'interest%' or type like '%profile_review%');
