-- ============================================================================
-- 0032 — The notification system, part 2: one producer per module event
--
-- Every producer is a trigger, so an event notifies whether it came from the
-- app, a seed, an admin tool or a future feature nobody has written yet. All
-- of them route through notify_member (0031), which handles the three rules
-- that must never be forgotten: never notify someone about their own action,
-- stay silent between blocked members, and honour the recipient's per-module
-- preference.
--
-- Message CONTENT never travels into a notification. Chat text is end-to-end
-- encrypted, so the server could not read it anyway - but the same restraint
-- applies to the plaintext fallback and to community bodies. A notification
-- says who did what, and the app is where you read it.
--
-- SCALE NOTE: the two fan-out producers (a group post, a published event) write
-- one row per recipient inside the writing transaction. That is right for a
-- club of this size and wrong at, say, fifty thousand members - at which point
-- these two should become a queue the cron drains. Everything else is O(1).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: a member's display name, for titles.
-- ---------------------------------------------------------------------------
create or replace function public.member_display_name(p_member uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    from public.profiles where id = p_member;
$$;

-- ===========================================================================
-- CHAT — a new message, collapsed to one row per conversation
-- ===========================================================================
create or replace function public.notify_on_member_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipient uuid;
  v_muted     boolean;
  v_body      text;
begin
  -- A referral card announces itself through notify_referral_request (0030),
  -- which says something far more useful than "sent you a message".
  if new.kind = 'referral' then
    return new;
  end if;

  select case when c.member_a_id = new.sender_id then c.member_b_id else c.member_a_id end
    into v_recipient
    from public.member_conversations c where c.id = new.conversation_id;
  if v_recipient is null then
    return new;
  end if;

  select coalesce(muted, false) into v_muted
    from public.member_chat_prefs
   where conversation_id = new.conversation_id and member_id = v_recipient;
  if coalesce(v_muted, false) then
    return new;
  end if;

  v_body := case new.kind
    when 'image' then 'Sent a photo'
    when 'video' then 'Sent a video'
    when 'file'  then 'Sent a document'
    else 'New message'
  end;

  perform public.notify_member(
    v_recipient, 'chat', 'chat_message',
    coalesce(public.member_display_name(new.sender_id), 'A member'),
    v_body,
    '/portal/member/chats?c=' || new.conversation_id::text,
    new.sender_id,
    'chat:' || new.conversation_id::text,
    jsonb_build_object('conversationId', new.conversation_id)
  );
  return new;
end;
$$;

drop trigger if exists member_messages_notify on public.member_messages;
create trigger member_messages_notify
  after insert on public.member_messages
  for each row execute function public.notify_on_member_message();

-- ===========================================================================
-- SOCIAL — follow requested, follow accepted
-- ===========================================================================
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify_member(
      new.followee_id, 'social', 'follow_request',
      coalesce(public.member_display_name(new.follower_id), 'A member'),
      'Asked to follow you',
      '/portal/member/community?tab=people',
      new.follower_id,
      'follow_req:' || new.follower_id::text,
      '{}'::jsonb
    );
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    -- The person who asked hears that they were let in.
    perform public.notify_member(
      new.follower_id, 'social', 'follow_accepted',
      coalesce(public.member_display_name(new.followee_id), 'A member'),
      'Accepted your follow request',
      '/portal/member/community?tab=people',
      new.followee_id,
      'follow_ok:' || new.followee_id::text,
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists member_follows_notify on public.member_follows;
create trigger member_follows_notify
  after insert or update on public.member_follows
  for each row execute function public.notify_on_follow();

-- ===========================================================================
-- COMMUNITY — likes, comments, group posts, someone joining your group
-- ===========================================================================
create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_author uuid;
begin
  select author_id into v_author from public.community_posts where id = new.post_id;
  perform public.notify_member(
    v_author, 'community', 'post_like',
    coalesce(public.member_display_name(new.member_id), 'A member'),
    'Liked your post',
    '/portal/member/community',
    new.member_id,
    'like:' || new.post_id::text,
    jsonb_build_object('postId', new.post_id)
  );
  return new;
end;
$$;

drop trigger if exists community_likes_notify on public.community_likes;
create trigger community_likes_notify
  after insert on public.community_likes
  for each row execute function public.notify_on_post_like();

create or replace function public.notify_on_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_author uuid;
begin
  if new.status <> 'active' then
    return new;
  end if;
  select author_id into v_author from public.community_posts where id = new.post_id;
  perform public.notify_member(
    v_author, 'community', 'post_comment',
    coalesce(public.member_display_name(new.author_id), 'A member'),
    'Commented on your post',
    '/portal/member/community',
    new.author_id,
    'comment:' || new.post_id::text,
    jsonb_build_object('postId', new.post_id)
  );
  return new;
end;
$$;

drop trigger if exists community_comments_notify on public.community_comments;
create trigger community_comments_notify
  after insert on public.community_comments
  for each row execute function public.notify_on_post_comment();

create or replace function public.notify_on_group_post()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group_name text;
  v_member     record;
begin
  if new.group_id is null or new.status <> 'active' then
    return new;
  end if;
  select name into v_group_name from public.community_groups where id = new.group_id;

  -- Fan-out, bounded by the group's own membership (see the scale note above).
  for v_member in
    select member_id from public.community_group_members
     where group_id = new.group_id and member_id <> new.author_id
  loop
    perform public.notify_member(
      v_member.member_id, 'community', 'group_post',
      coalesce(v_group_name, 'Your group'),
      coalesce(public.member_display_name(new.author_id), 'A member') || ' posted',
      '/portal/member/community/groups/' || new.group_id::text,
      new.author_id,
      'group_post:' || new.group_id::text,
      jsonb_build_object('groupId', new.group_id)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists community_posts_notify on public.community_posts;
create trigger community_posts_notify
  after insert on public.community_posts
  for each row execute function public.notify_on_group_post();

create or replace function public.notify_on_group_join()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_name  text;
begin
  select created_by, name into v_owner, v_name
    from public.community_groups where id = new.group_id;
  perform public.notify_member(
    v_owner, 'community', 'group_join',
    coalesce(v_name, 'Your group'),
    coalesce(public.member_display_name(new.member_id), 'A member') || ' joined',
    '/portal/member/community/groups/' || new.group_id::text,
    new.member_id,
    'group_join:' || new.group_id::text,
    jsonb_build_object('groupId', new.group_id)
  );
  return new;
end;
$$;

drop trigger if exists community_group_members_notify on public.community_group_members;
create trigger community_group_members_notify
  after insert on public.community_group_members
  for each row execute function public.notify_on_group_join();

-- ===========================================================================
-- HELP DESK — status moves, staff replies, a case assigned to a volunteer
-- ===========================================================================
create or replace function public.notify_on_request_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.notify_member(
      new.member_id, 'help', 'request_status',
      coalesce(nullif(new.title, ''), 'Your request'),
      'Now ' || replace(new.status, '_', ' '),
      '/portal/member/my-requests/' || new.id::text,
      null,
      'request:' || new.id::text,
      jsonb_build_object('requestId', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists help_requests_notify_status on public.help_requests;
create trigger help_requests_notify_status
  after update on public.help_requests
  for each row execute function public.notify_on_request_status();

create or replace function public.notify_on_admin_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Only mail addressed to a specific member; staff-bound mail is read in the
  -- admin inbox, which is a working surface rather than a notification.
  if new.recipient_user_id is null or new.recipient_role = 'admin' then
    return new;
  end if;
  perform public.notify_member(
    new.recipient_user_id, 'help', 'admin_message',
    case when new.sender_role = 'admin' then 'Professionals Club'
         else coalesce(public.member_display_name(new.sender_user_id), 'A member') end,
    coalesce(nullif(new.case_title, ''), 'You have a new message'),
    '/portal/member/messages',
    new.sender_user_id,
    'msg:' || coalesce(new.case_id::text, 'general'),
    jsonb_build_object('caseId', new.case_id)
  );
  return new;
end;
$$;

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient
  after insert on public.messages
  for each row execute function public.notify_on_admin_message();

create or replace function public.notify_on_case_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.notify_member(
    new.volunteer_member_id, 'volunteer', 'case_assigned',
    coalesce(nullif(new.request_title, ''), 'A case'),
    'Assigned to you',
    '/portal/member/my-volunteer',
    null,
    'assignment:' || new.id::text,
    jsonb_build_object('requestId', new.request_id)
  );
  return new;
end;
$$;

drop trigger if exists case_assignments_notify on public.case_assignments;
create trigger case_assignments_notify
  after insert on public.case_assignments
  for each row execute function public.notify_on_case_assignment();

-- ===========================================================================
-- VOLUNTEERING — the application's outcome
-- ===========================================================================
create or replace function public.notify_on_volunteer_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.notify_member(
      new.member_id, 'volunteer', 'volunteer_status',
      'Your volunteer application',
      'Now ' || replace(new.status, '_', ' '),
      '/portal/member/my-volunteer',
      null,
      'vol_app:' || new.id::text,
      jsonb_build_object('applicationId', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists volunteer_apps_notify_status on public.volunteer_applications;
create trigger volunteer_apps_notify_status
  after update on public.volunteer_applications
  for each row execute function public.notify_on_volunteer_status();

-- ===========================================================================
-- EVENTS — something new in your city
-- ===========================================================================
create or replace function public.notify_on_event_published()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_member record;
begin
  if not new.is_published or new.status <> 'upcoming' then
    return new;
  end if;
  -- Only on publication, not on every later edit.
  if tg_op = 'UPDATE' and old.is_published and old.status = 'upcoming' then
    return new;
  end if;

  for v_member in
    select p.id from public.profiles p
     where p.account_status = 'active'
       and coalesce(p.city, '') <> ''
       and coalesce(new.location, '') ilike '%' || p.city || '%'
  loop
    perform public.notify_member(
      v_member.id, 'event', 'event_published',
      coalesce(nullif(new.title, ''), 'A new event'),
      case when new.location is null then 'New event' else 'New event in ' || new.location end,
      '/portal/member/events',
      null,
      'event:' || new.id::text,
      jsonb_build_object('eventId', new.id)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists events_notify_published on public.events;
create trigger events_notify_published
  after insert or update on public.events
  for each row execute function public.notify_on_event_published();

-- ===========================================================================
-- ADMIN — the work queue: new requests, applications, listings, reports
-- ===========================================================================
create or replace function public.notify_admins(
  p_type text, p_title text, p_body text, p_link text, p_group_key text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_admin record;
begin
  for v_admin in
    select id from public.profiles where role = 'admin' and account_status = 'active'
  loop
    perform public.notify_member(
      v_admin.id, 'admin', p_type, p_title, p_body, p_link, null, p_group_key, '{}'::jsonb
    );
  end loop;
end;
$$;

create or replace function public.notify_admin_queues()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'help_requests' then
    perform public.notify_admins(
      'admin_new_request', 'New help request',
      coalesce(nullif(new.title, ''), 'A member asked for help'),
      '/portal/admin/requests', 'admin_requests');

  elsif tg_table_name = 'volunteer_applications' then
    perform public.notify_admins(
      'admin_new_volunteer', 'New volunteer application',
      coalesce(nullif(new.member_name, ''), 'A member') || ' applied to help',
      '/portal/admin/volunteers', 'admin_volunteers');

  elsif tg_table_name = 'businesses' then
    if new.verification_status = 'pending' then
      perform public.notify_admins(
        'admin_new_business', 'New business listing',
        coalesce(nullif(new.name, ''), 'A business') || ' is waiting for review',
        '/portal/admin/business-requests', 'admin_businesses');
    end if;

  elsif tg_table_name = 'community_reports' then
    perform public.notify_admins(
      'admin_new_report', 'Content reported',
      'A ' || new.target_type || ' was reported',
      '/portal/admin/community', 'admin_reports');

  elsif tg_table_name = 'member_reports' then
    perform public.notify_admins(
      'admin_new_report', 'Member reported',
      'Reason: ' || new.reason,
      '/portal/admin/community', 'admin_reports');
  end if;
  return new;
end;
$$;

drop trigger if exists help_requests_notify_admins on public.help_requests;
create trigger help_requests_notify_admins
  after insert on public.help_requests
  for each row execute function public.notify_admin_queues();

drop trigger if exists volunteer_apps_notify_admins on public.volunteer_applications;
create trigger volunteer_apps_notify_admins
  after insert on public.volunteer_applications
  for each row execute function public.notify_admin_queues();

drop trigger if exists businesses_notify_admins on public.businesses;
create trigger businesses_notify_admins
  after insert on public.businesses
  for each row execute function public.notify_admin_queues();

drop trigger if exists community_reports_notify_admins on public.community_reports;
create trigger community_reports_notify_admins
  after insert on public.community_reports
  for each row execute function public.notify_admin_queues();

drop trigger if exists member_reports_notify_admins on public.member_reports;
create trigger member_reports_notify_admins
  after insert on public.member_reports
  for each row execute function public.notify_admin_queues();

-- ===========================================================================
-- Existing producers, re-pointed at notify_member so their rows carry a
-- category (they were writing 'general' through notify_user).
-- ===========================================================================
create or replace function public.notify_on_interest()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_user uuid;
  v_actor_user  uuid;
  v_actor_name  text;
begin
  if tg_op = 'INSERT' then
    select p.user_id into v_target_user
      from public.matrimony_profiles p where p.id = new.receiver_profile_id;
    select p.user_id, p.full_name into v_actor_user, v_actor_name
      from public.matrimony_profiles p where p.id = new.sender_profile_id;

    perform public.notify_member(
      v_target_user, 'matrimony', 'matrimony_interest',
      coalesce(v_actor_name, 'A member'),
      'Sent you an interest',
      '/portal/member/matrimony/interests',
      v_actor_user,
      'interest:' || new.sender_profile_id::text,
      '{}'::jsonb
    );

  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    select p.user_id into v_target_user
      from public.matrimony_profiles p where p.id = new.sender_profile_id;
    select p.user_id, p.full_name into v_actor_user, v_actor_name
      from public.matrimony_profiles p where p.id = new.receiver_profile_id;

    perform public.notify_member(
      v_target_user, 'matrimony', 'matrimony_match',
      coalesce(v_actor_name, 'A member'),
      'It is a match - your chat is open',
      '/portal/member/chats',
      v_actor_user,
      'match:' || new.receiver_profile_id::text,
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_referral_request(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r         record;
  v_seeker  text;
  v_company text;
  v_jobs    int;
begin
  select * into r from public.referral_direct_requests where id = p_request;
  if r.id is null then
    raise exception 'no such referral request';
  end if;
  if r.seeker_id is distinct from app.current_user_id() and not public.is_admin() then
    raise exception 'only the member who asked may send this notification';
  end if;

  v_seeker  := coalesce(public.member_display_name(r.seeker_id), 'A member');
  select name into v_company from public.companies where id = r.company_id;
  v_jobs := coalesce(array_length(r.job_ids, 1), 0);

  perform public.notify_member(
    r.insider_id, 'referral', 'referral_request',
    v_seeker || ' asked you for a referral at ' || coalesce(v_company, 'their company'),
    case when v_jobs = 1 then 'One role, with a note. Open the chat to answer.'
         else v_jobs || ' roles, with a note. Open the chat to answer.' end,
    '/portal/member/chats',
    r.seeker_id,
    'referral_req:' || r.id::text,
    jsonb_build_object('requestId', r.id)
  );

  insert into public.email_outbox (recipient_id, template, payload)
  values (
    r.insider_id, 'referral_request',
    jsonb_build_object('company', coalesce(v_company, ''), 'seeker', v_seeker, 'jobCount', v_jobs)
  );
end;
$$;

revoke all on function public.notify_referral_request(uuid) from public;
grant execute on function public.notify_referral_request(uuid) to app_authenticated;

create or replace function public.notify_referral_response(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r         record;
  v_helper  text;
  v_company text;
begin
  select * into r from public.referral_direct_requests where id = p_request;
  if r.id is null then
    raise exception 'no such referral request';
  end if;
  if r.insider_id is distinct from app.current_user_id() and not public.is_admin() then
    raise exception 'only the member who was asked may send this notification';
  end if;
  if r.status <> 'accepted' then
    return;
  end if;

  v_helper := coalesce(public.member_display_name(r.insider_id), 'A member');
  select name into v_company from public.companies where id = r.company_id;

  perform public.notify_member(
    r.seeker_id, 'referral', 'referral_accepted',
    v_helper || ' can help at ' || coalesce(v_company, 'their company'),
    'They agreed to help with your request. Carry on in your chat.',
    '/portal/member/chats',
    r.insider_id,
    'referral_ok:' || r.id::text,
    jsonb_build_object('requestId', r.id)
  );

  insert into public.email_outbox (recipient_id, template, payload)
  values (
    r.seeker_id, 'referral_accepted',
    jsonb_build_object('company', coalesce(v_company, ''), 'helper', v_helper)
  );
end;
$$;

revoke all on function public.notify_referral_response(uuid) from public;
grant execute on function public.notify_referral_response(uuid) to app_authenticated;
