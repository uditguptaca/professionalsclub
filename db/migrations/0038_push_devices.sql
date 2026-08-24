-- ============================================================================
-- 0038 — Push notifications: device tokens, and the queue
--
-- THE DESIGN, IN ONE LINE: the notification row IS the push queue.
--
-- Every in-app notification is already written by a definer trigger calling
-- notify_member(), which decides — inside the writing transaction — whether
-- this person should hear about this at all. It skips the actor's own action,
-- goes silent between blocked members, honours notification_prefs, and
-- collapses repeats onto one live row.
--
-- Push must obey every one of those rules. The tempting way to arrange that is
-- a second queue table with its own trigger, and the certain outcome is two
-- copies of four rules drifting apart until push notifies somebody that the
-- bell deliberately did not. So instead: one nullable column, pushed_at. A row
-- with pushed_at IS NULL is owed a push. notify_member leaves it null when it
-- writes a row, and — this is the part that is easy to get wrong — sets it back
-- to null when it COLLAPSES onto an existing row, because the 2nd through 12th
-- message in a conversation each deserve a buzz even though the inbox shows one
-- line. A trigger watching only INSERTs would push the first message of a
-- conversation and then go quiet.
--
-- Consequences worth being explicit about:
--   * Push inherits future rules for free. Add a category, a mute, a block
--     rule to notify_member and push follows without being told.
--   * Delivery is at-most-once. The claim stamps pushed_at before the HTTP
--     call, so a crash mid-send loses that push rather than repeating it. For a
--     notification that is already sitting in the member's inbox, a duplicate
--     buzz is worse than a missed one.
--   * No new trigger, no new producer, and still no way for a member to cause a
--     notification to anyone. notify_member remains un-executable by
--     app_authenticated (0031, 0033).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Device tokens
--
-- Same secrecy rule as email addresses: a member's session must never be able
-- to read another member's device token. A token is a send-anything capability
-- aimed at a specific phone, so it is treated exactly like the email outbox
-- treats an address — resolved only inside a privileged drain, never by the
-- session that caused the notification. Hence: no member-visible path to
-- another row, and no admin read policy either.
-- ---------------------------------------------------------------------------
create table if not exists public.push_devices (
  token       text primary key,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  platform    text not null check (platform in ('android', 'ios', 'web')),
  created_at  timestamptz not null default now(),
  -- Refreshed every time the client re-registers, which the plugin does on
  -- every app start and whenever FCM rotates the token. A stale last_seen is
  -- how you spot a device that stopped checking in.
  last_seen   timestamptz not null default now()
);

create index if not exists idx_push_devices_member
  on public.push_devices (member_id);

alter table public.push_devices enable row level security;

-- SELECT is granted so a member can see their own devices (how many, which
-- platform) — support needs "is a device even registered?" to be answerable.
-- DELETE lets sign-out clean up. There is deliberately no INSERT or UPDATE
-- grant: registration goes through the definer function below, which is what
-- enforces the per-member cap and the token shape.
grant select, delete on public.push_devices to app_authenticated;

drop policy if exists push_devices_own on public.push_devices;
create policy push_devices_own on public.push_devices
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (public.is_active_member() and member_id = app.current_user_id());

-- ---------------------------------------------------------------------------
-- Registration
--
-- Definer, and it resolves the member from app.current_user_id() rather than a
-- parameter, so the Server Action above it cannot be talked into registering a
-- device against somebody else's account.
--
-- The cap matters more than it looks. Without it, a member can register
-- thousands of junk tokens and turn every one of their own notifications into
-- thousands of outbound HTTP requests from our servers — a self-inflicted
-- amplifier. Ten devices is more than any real person has.
-- ---------------------------------------------------------------------------
create or replace function public.register_push_device(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member uuid := app.current_user_id();
begin
  if v_member is null then
    raise exception 'Not signed in';
  end if;
  if not public.is_active_member() then
    raise exception 'This account is not active';
  end if;
  if p_platform not in ('android', 'ios', 'web') then
    raise exception 'Unknown platform';
  end if;
  -- FCM tokens are long opaque strings. This rejects obvious junk without
  -- pretending to validate a format Google does not document as stable.
  if p_token is null or length(p_token) < 64 or length(p_token) > 4096
     or p_token !~ '^[A-Za-z0-9_:.~%-]+$' then
    raise exception 'That device token was not recognised';
  end if;

  -- The token is the primary key, not (member, token): a device that changes
  -- hands must move to the new member rather than notify both.
  insert into public.push_devices (token, member_id, platform, last_seen)
  values (p_token, v_member, p_platform, now())
  on conflict (token) do update
    set member_id = v_member,
        platform  = excluded.platform,
        last_seen = now();

  -- Keep the ten most recently seen. Anything older is a device this person
  -- has not opened in a long time, or junk.
  delete from public.push_devices
   where member_id = v_member
     and token not in (
       select token from public.push_devices
        where member_id = v_member
        order by last_seen desc
        limit 10
     );
end;
$$;

revoke all on function public.register_push_device(text, text) from public;
grant execute on function public.register_push_device(text, text) to app_authenticated;

-- ---------------------------------------------------------------------------
-- The queue column
-- ---------------------------------------------------------------------------
alter table public.in_app_notifications
  add column if not exists pushed_at timestamptz;

-- The claim query: "my oldest unpushed rows". Partial, because the rows that
-- have already been pushed are the overwhelming majority and are never read by
-- this path again.
create index if not exists idx_notifications_push_pending
  on public.in_app_notifications (updated_at)
  where pushed_at is null;

-- Everything that exists right now predates push. Stamping it means the first
-- deploy does not fire a month of history at whoever installs the app.
-- This is also the ONLY guard against pushing ancient rows: there is no
-- "younger than an hour" filter in the claim, because such a filter silently
-- strands any backlog bigger than one drain — a 3am fan-out to a whole city
-- would push the first slice and abandon the rest with nothing to show why.
update public.in_app_notifications
   set pushed_at = coalesce(pushed_at, now())
 where pushed_at is null;

-- ---------------------------------------------------------------------------
-- notify_member, with two lines added
--
-- Identical to 0031 apart from pushed_at. Repeated in full rather than patched,
-- because this function is the single chokepoint for every notification in the
-- product and it should be readable in one piece in the migration that changed
-- it.
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
           updated_at  = now(),
           -- Re-arm the push. The inbox shows one line for twelve messages,
           -- but each message is still worth a buzz on the phone.
           pushed_at   = null
     where user_id = p_user_id
       and group_key = p_group_key
       and not is_read;
    if found then
      return;
    end if;
  end if;

  -- pushed_at defaults to null, which is what marks the row as owed a push.
  insert into public.in_app_notifications
    (user_id, category, type, title, body, link, actor_id, group_key, metadata, updated_at)
  values
    (p_user_id, p_category, p_type, p_title, coalesce(p_body, ''), p_link,
     p_actor, p_group_key, coalesce(p_metadata, '{}'::jsonb), now());
end;
$$;

revoke all on function public.notify_member(uuid, text, text, text, text, text, uuid, text, jsonb) from public;
revoke all on function public.notify_member(uuid, text, text, text, text, text, uuid, text, jsonb) from app_authenticated;

-- ---------------------------------------------------------------------------
-- Claiming work
--
-- One statement, so two concurrent drains cannot take the same row: the UPDATE
-- locks the rows it selects and stamps them before returning. Whoever loses the
-- race sees them already stamped and moves on.
--
-- It returns the recipient's device tokens and their unread count in the same
-- round trip, because the alternative is a query per row while a connection is
-- held open.
-- ---------------------------------------------------------------------------
create or replace function public.claim_push_batch(p_limit integer default 200)
returns table (
  notification_id uuid,
  member_id       uuid,
  category        text,
  title           text,
  body            text,
  link            text,
  group_key       text,
  event_count     integer,
  unread_total    integer,
  tokens          text[],
  platforms       text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with claimed as (
    update public.in_app_notifications n
       set pushed_at = now()
     where n.id in (
       select id from public.in_app_notifications
        where pushed_at is null
        order by updated_at
        limit greatest(1, least(p_limit, 500))
        for update skip locked
     )
    returning n.id, n.user_id, n.category, n.title, n.body, n.link,
              n.group_key, n.event_count
  )
  select c.id, c.user_id, c.category, c.title, c.body, c.link,
         c.group_key, c.event_count,
         (select count(*)::int from public.in_app_notifications u
           where u.user_id = c.user_id and not u.is_read),
         array_agg(d.token order by d.last_seen desc),
         array_agg(d.platform order by d.last_seen desc)
    from claimed c
    join public.push_devices d on d.member_id = c.user_id
   group by c.id, c.user_id, c.category, c.title, c.body, c.link,
            c.group_key, c.event_count;
  -- INNER JOIN on purpose: a member with no registered device has nothing to
  -- send to. Their row is still stamped by the UPDATE above, so it is consumed
  -- rather than retried on every drain forever.
end;
$$;

revoke all on function public.claim_push_batch(integer) from public;
revoke all on function public.claim_push_batch(integer) from app_authenticated;

-- ---------------------------------------------------------------------------
-- Dead token cleanup. Called after the sends, never during.
-- ---------------------------------------------------------------------------
create or replace function public.delete_push_tokens(p_tokens text[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  delete from public.push_devices where token = any(p_tokens);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.delete_push_tokens(text[]) from public;
revoke all on function public.delete_push_tokens(text[]) from app_authenticated;

-- ---------------------------------------------------------------------------
-- How many pushes are owed. For the cron route's health output, so "push is
-- quiet" can be told apart from "push is broken".
-- ---------------------------------------------------------------------------
create or replace function public.push_pending_count()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int from public.in_app_notifications where pushed_at is null;
$$;

revoke all on function public.push_pending_count() from public;
revoke all on function public.push_pending_count() from app_authenticated;
