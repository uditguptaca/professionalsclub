-- =============================================================================
-- 0003_rls_policies.sql — Access control
--
-- Model: every table denies by default and each policy below is an explicit
-- exception. `app_anonymous` reaches only published marketing content.
-- `app_authenticated` reaches its own rows plus whatever the product
-- deliberately shares. Admin-ness is a row in public.profiles, via is_admin().
--
-- These roles are not connection identities. The server connects as the owner
-- and drops into one of them per transaction (see 0000_neon_roles.sql), which
-- is what makes these policies apply at all — an owner would bypass them.
--
-- The SECURITY DEFINER triggers and RPCs from 0001/0002 are owned by the table
-- owner and so are not subject to these policies. That is intentional: it is
-- how the audit log, the notification fan-out and the status timeline can write
-- rows that no client is permitted to write directly. Do not add
-- `force row level security` to these tables without rewriting those functions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reset inherited grants.
--
-- A previous migration ran `grant select on all tables in schema public to app_anonymous`,
-- which hands every future reader the whole database the moment any policy is
-- permissive. Start from nothing and grant back deliberately.
-- -----------------------------------------------------------------------------

revoke all on all tables    in schema public from app_anonymous, app_authenticated;
revoke all on all sequences in schema public from app_anonymous, app_authenticated;
revoke all on all functions in schema public from app_anonymous, app_authenticated;

grant usage on schema public to app_anonymous, app_authenticated;

alter default privileges in schema public revoke all on tables from app_anonymous, app_authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere.
-- -----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'help_requests', 'request_timeline', 'request_notes',
    'volunteer_applications', 'case_assignments', 'messages',
    'businesses', 'business_contact_requests',
    'events', 'jobs', 'ebooks', 'workshops', 'content_templates',
    'team_members', 'news_articles', 'donation_campaigns', 'youtube_videos',
    'audit_log',
    'matrimony_profiles', 'matrimony_preferences', 'matrimony_contacts',
    'matrimony_media', 'matrimony_interests', 'matrimony_shortlists',
    'matrimony_profile_notes', 'matrimony_blocks', 'matrimony_reports',
    'matrimony_photo_requests', 'matrimony_saved_searches',
    'matrimony_conversations', 'matrimony_messages', 'matrimony_profile_views',
    'matrimony_verifications', 'matrimony_success_stories',
    'matrimony_admin_audit', 'in_app_notifications'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- =============================================================================
-- PROFILES
-- =============================================================================

grant select, update on public.profiles to app_authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to app_authenticated
  using (id = app.current_user_id() or public.is_admin());

-- The privilege guard trigger in 0001 is what stops role/account_status from
-- being raised here; this policy only decides which rows are reachable.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to app_authenticated
  using (id = app.current_user_id() or public.is_admin())
  with check (id = app.current_user_id() or public.is_admin());

-- No insert policy: rows are created server-side by public.create_profile().
-- No delete policy: deleting the neon_auth."user" row cascades.

-- =============================================================================
-- HELP REQUESTS
-- =============================================================================

grant select, insert, update on public.help_requests to app_authenticated;

drop policy if exists help_requests_select on public.help_requests;
create policy help_requests_select on public.help_requests
  for select to app_authenticated
  using (
    member_id = app.current_user_id()
    or assigned_volunteer_id = app.current_user_id()
    or public.is_admin()
  );

drop policy if exists help_requests_insert on public.help_requests;
create policy help_requests_insert on public.help_requests
  for insert to app_authenticated
  with check (member_id = app.current_user_id() and public.is_active_member());

drop policy if exists help_requests_update on public.help_requests;
create policy help_requests_update on public.help_requests
  for update to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin())
  with check (member_id = app.current_user_id() or public.is_admin());

grant delete on public.help_requests to app_authenticated;
drop policy if exists help_requests_delete on public.help_requests;
create policy help_requests_delete on public.help_requests
  for delete to app_authenticated
  using (public.is_admin());

-- Timeline is readable by anyone who can read the parent request. Writes come
-- only from the status trigger.
grant select on public.request_timeline to app_authenticated;

drop policy if exists request_timeline_select on public.request_timeline;
create policy request_timeline_select on public.request_timeline
  for select to app_authenticated
  using (
    exists (
      select 1 from public.help_requests r
      where r.id = request_timeline.request_id
        and (r.member_id = app.current_user_id() or r.assigned_volunteer_id = app.current_user_id() or public.is_admin())
    )
  );

-- Internal case notes: staff only, no exceptions.
grant select, insert, update, delete on public.request_notes to app_authenticated;

drop policy if exists request_notes_admin on public.request_notes;
create policy request_notes_admin on public.request_notes
  for all to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- VOLUNTEER APPLICATIONS
-- =============================================================================

grant select, insert, update, delete on public.volunteer_applications to app_authenticated;

drop policy if exists volunteer_apps_select on public.volunteer_applications;
create policy volunteer_apps_select on public.volunteer_applications
  for select to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin());

drop policy if exists volunteer_apps_insert on public.volunteer_applications;
create policy volunteer_apps_insert on public.volunteer_applications
  for insert to app_authenticated
  with check (member_id = app.current_user_id() and public.is_active_member());

-- Only admins may update. admin_notes is internal review commentary about the
-- applicant, so applicants get no write path that could echo it back.
drop policy if exists volunteer_apps_update on public.volunteer_applications;
create policy volunteer_apps_update on public.volunteer_applications
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists volunteer_apps_delete on public.volunteer_applications;
create policy volunteer_apps_delete on public.volunteer_applications
  for delete to app_authenticated
  using (public.is_admin());

-- =============================================================================
-- CASE ASSIGNMENTS
-- =============================================================================

grant select, insert, update, delete on public.case_assignments to app_authenticated;

drop policy if exists case_assignments_select on public.case_assignments;
create policy case_assignments_select on public.case_assignments
  for select to app_authenticated
  using (volunteer_member_id = app.current_user_id() or public.is_admin());

drop policy if exists case_assignments_insert on public.case_assignments;
create policy case_assignments_insert on public.case_assignments
  for insert to app_authenticated
  with check (public.is_admin());

-- A volunteer may accept work and report back; everything else is the admin's.
drop policy if exists case_assignments_update on public.case_assignments;
create policy case_assignments_update on public.case_assignments
  for update to app_authenticated
  using (volunteer_member_id = app.current_user_id() or public.is_admin())
  with check (volunteer_member_id = app.current_user_id() or public.is_admin());

drop policy if exists case_assignments_delete on public.case_assignments;
create policy case_assignments_delete on public.case_assignments
  for delete to app_authenticated
  using (public.is_admin());

-- =============================================================================
-- MESSAGES
--
-- admin_only notes stay with staff even when attached to a case the member can
-- otherwise read, so visibility_scope is part of the predicate rather than a
-- display-time filter.
-- =============================================================================

grant select, insert, update on public.messages to app_authenticated;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to app_authenticated
  using (
    public.is_admin()
    or (
      visibility_scope <> 'admin_only'
      and (sender_user_id = app.current_user_id() or recipient_user_id = app.current_user_id())
    )
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and (public.is_admin() or sender_user_id = app.current_user_id())
  );

-- Recipients flip `read`; nothing else about a sent message may change.
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to app_authenticated
  using (recipient_user_id = app.current_user_id() or public.is_admin())
  with check (recipient_user_id = app.current_user_id() or public.is_admin());

-- =============================================================================
-- BUSINESS DIRECTORY
-- =============================================================================

grant select on public.businesses to app_anonymous, app_authenticated;
grant insert, update, delete on public.businesses to app_authenticated;

-- Unverified listings are visible to their submitter and to staff only.
drop policy if exists businesses_select_public on public.businesses;
create policy businesses_select_public on public.businesses
  for select to app_anonymous, app_authenticated
  using (verification_status = 'verified');

drop policy if exists businesses_select_own on public.businesses;
create policy businesses_select_own on public.businesses
  for select to app_authenticated
  using (created_by = app.current_user_id() or public.is_admin());

drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses
  for insert to app_authenticated
  with check (public.is_active_member() and (created_by = app.current_user_id() or public.is_admin()));

drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses
  for update to app_authenticated
  using (created_by = app.current_user_id() or public.is_admin())
  with check (created_by = app.current_user_id() or public.is_admin());

drop policy if exists businesses_delete on public.businesses;
create policy businesses_delete on public.businesses
  for delete to app_authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.business_contact_requests to app_authenticated;

drop policy if exists bcr_select on public.business_contact_requests;
create policy bcr_select on public.business_contact_requests
  for select to app_authenticated
  using (member_id = app.current_user_id() or public.is_admin());

drop policy if exists bcr_insert on public.business_contact_requests;
create policy bcr_insert on public.business_contact_requests
  for insert to app_authenticated
  with check (member_id = app.current_user_id() and public.is_active_member());

drop policy if exists bcr_update on public.business_contact_requests;
create policy bcr_update on public.business_contact_requests
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists bcr_delete on public.business_contact_requests;
create policy bcr_delete on public.business_contact_requests
  for delete to app_authenticated
  using (public.is_admin());

-- =============================================================================
-- PUBLIC CONTENT
--
-- Same shape for every table: the world reads what is published, admins read
-- and write everything.
-- =============================================================================

do $$
declare
  t text;
  published_col text;
begin
  foreach t in array array[
    'events', 'jobs', 'ebooks', 'workshops', 'content_templates',
    'team_members', 'news_articles', 'donation_campaigns', 'youtube_videos'
  ] loop
    published_col := case t
      when 'jobs' then 'is_active'
      when 'donation_campaigns' then 'is_active'
      else 'is_published'
    end;

    execute format('grant select on public.%I to app_anonymous, app_authenticated', t);
    execute format('grant insert, update, delete on public.%I to app_authenticated', t);

    execute format('drop policy if exists %I_select_published on public.%I', t, t);
    execute format(
      'create policy %I_select_published on public.%I
         for select to app_anonymous, app_authenticated using (%I = true)',
      t, t, published_col);

    execute format('drop policy if exists %I_admin_read on public.%I', t, t);
    execute format(
      'create policy %I_admin_read on public.%I
         for select to app_authenticated using (public.is_admin())', t, t);

    execute format('drop policy if exists %I_admin_write on public.%I', t, t);
    execute format(
      'create policy %I_admin_write on public.%I
         for insert to app_authenticated with check (public.is_admin())', t, t);

    execute format('drop policy if exists %I_admin_update on public.%I', t, t);
    execute format(
      'create policy %I_admin_update on public.%I
         for update to app_authenticated using (public.is_admin()) with check (public.is_admin())', t, t);

    execute format('drop policy if exists %I_admin_delete on public.%I', t, t);
    execute format(
      'create policy %I_admin_delete on public.%I
         for delete to app_authenticated using (public.is_admin())', t, t);
  end loop;
end;
$$;

-- =============================================================================
-- AUDIT LOG
--
-- Read-only, admin-only, and unreachable for writes: log_audit() is the sole
-- way in. An audit trail a client can append to is not an audit trail.
-- =============================================================================

grant select on public.audit_log to app_authenticated;

drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to app_authenticated
  using (public.is_admin());

-- =============================================================================
-- MATRIMONY: visibility helper
-- =============================================================================

create or replace function public.can_view_matrimony_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when target is null then false
      when public.is_admin() then true
      when target = public.my_matrimony_profile_id() then true
      else exists (
        select 1 from public.matrimony_profiles p
        where p.id = target
          and p.status = 'approved'
          and p.is_hidden = false
      )
      and public.my_matrimony_profile_id() is not null
      and not public.is_blocked_between(target, public.my_matrimony_profile_id())
    end;
$$;

-- =============================================================================
-- MATRIMONY: base tables
--
-- The base profile table is deliberately NOT browsable. Supabase's
-- .select('col, col') list is chosen by the client and is not a security
-- boundary — any caller can ask for '*'. So other members' profiles are served
-- by the curated view at the bottom of this file, and the base table exposes
-- only your own row (plus admins), where the moderation columns live.
-- =============================================================================

grant select, insert, update, delete on public.matrimony_profiles to app_authenticated;

drop policy if exists matrimony_profiles_select on public.matrimony_profiles;
create policy matrimony_profiles_select on public.matrimony_profiles
  for select to app_authenticated
  using (user_id = app.current_user_id() or public.is_admin());

drop policy if exists matrimony_profiles_insert on public.matrimony_profiles;
create policy matrimony_profiles_insert on public.matrimony_profiles
  for insert to app_authenticated
  with check (user_id = app.current_user_id() and public.is_active_member());

drop policy if exists matrimony_profiles_update on public.matrimony_profiles;
create policy matrimony_profiles_update on public.matrimony_profiles
  for update to app_authenticated
  using (user_id = app.current_user_id() or public.is_admin())
  with check (user_id = app.current_user_id() or public.is_admin());

drop policy if exists matrimony_profiles_delete on public.matrimony_profiles;
create policy matrimony_profiles_delete on public.matrimony_profiles
  for delete to app_authenticated
  using (user_id = app.current_user_id() or public.is_admin());

-- Partner preferences are part of what a listing advertises, so they follow
-- profile visibility rather than being owner-only.
grant select, insert, update, delete on public.matrimony_preferences to app_authenticated;

drop policy if exists matrimony_preferences_select on public.matrimony_preferences;
create policy matrimony_preferences_select on public.matrimony_preferences
  for select to app_authenticated
  using (public.can_view_matrimony_profile(profile_id));

drop policy if exists matrimony_preferences_write on public.matrimony_preferences;
create policy matrimony_preferences_write on public.matrimony_preferences
  for insert to app_authenticated
  with check (profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_preferences_update on public.matrimony_preferences;
create policy matrimony_preferences_update on public.matrimony_preferences
  for update to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin())
  with check (profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_preferences_delete on public.matrimony_preferences;
create policy matrimony_preferences_delete on public.matrimony_preferences
  for delete to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin());

-- Contact details. Released only after the other party accepted an interest.
-- This is the single most sensitive table in the schema.
grant select, insert, update, delete on public.matrimony_contacts to app_authenticated;

drop policy if exists matrimony_contacts_select on public.matrimony_contacts;
create policy matrimony_contacts_select on public.matrimony_contacts
  for select to app_authenticated
  using (
    profile_id = public.my_matrimony_profile_id()
    or public.is_admin()
    or public.has_accepted_interest(profile_id, public.my_matrimony_profile_id())
  );

drop policy if exists matrimony_contacts_insert on public.matrimony_contacts;
create policy matrimony_contacts_insert on public.matrimony_contacts
  for insert to app_authenticated
  with check (profile_id = public.my_matrimony_profile_id());

drop policy if exists matrimony_contacts_update on public.matrimony_contacts;
create policy matrimony_contacts_update on public.matrimony_contacts
  for update to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin())
  with check (profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_contacts_delete on public.matrimony_contacts;
create policy matrimony_contacts_delete on public.matrimony_contacts
  for delete to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin());

-- Media: your own always; other people's only once approved by moderation.
grant select, insert, update, delete on public.matrimony_media to app_authenticated;

drop policy if exists matrimony_media_select on public.matrimony_media;
create policy matrimony_media_select on public.matrimony_media
  for select to app_authenticated
  using (
    profile_id = public.my_matrimony_profile_id()
    or public.is_admin()
    or (is_approved and public.can_view_matrimony_profile(profile_id))
  );

drop policy if exists matrimony_media_insert on public.matrimony_media;
create policy matrimony_media_insert on public.matrimony_media
  for insert to app_authenticated
  with check (profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_media_update on public.matrimony_media;
create policy matrimony_media_update on public.matrimony_media
  for update to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin())
  with check (profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_media_delete on public.matrimony_media;
create policy matrimony_media_delete on public.matrimony_media
  for delete to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin());

-- Interests.
grant select, insert, update, delete on public.matrimony_interests to app_authenticated;

drop policy if exists matrimony_interests_select on public.matrimony_interests;
create policy matrimony_interests_select on public.matrimony_interests
  for select to app_authenticated
  using (
    sender_profile_id = public.my_matrimony_profile_id()
    or receiver_profile_id = public.my_matrimony_profile_id()
    or public.is_admin()
  );

drop policy if exists matrimony_interests_insert on public.matrimony_interests;
create policy matrimony_interests_insert on public.matrimony_interests
  for insert to app_authenticated
  with check (
    sender_profile_id = public.my_matrimony_profile_id()
    and public.can_view_matrimony_profile(receiver_profile_id)
  );

-- The "only the recipient may respond" rule is enforced by the trigger in 0002;
-- this predicate keeps a non-participant from reaching the row at all.
drop policy if exists matrimony_interests_update on public.matrimony_interests;
create policy matrimony_interests_update on public.matrimony_interests
  for update to app_authenticated
  using (
    receiver_profile_id = public.my_matrimony_profile_id()
    or sender_profile_id = public.my_matrimony_profile_id()
    or public.is_admin()
  );

drop policy if exists matrimony_interests_delete on public.matrimony_interests;
create policy matrimony_interests_delete on public.matrimony_interests
  for delete to app_authenticated
  using (sender_profile_id = public.my_matrimony_profile_id() or public.is_admin());

-- Shortlists. You can see who you saved, and how many people saved you.
grant select, insert, delete on public.matrimony_shortlists to app_authenticated;

drop policy if exists matrimony_shortlists_select on public.matrimony_shortlists;
create policy matrimony_shortlists_select on public.matrimony_shortlists
  for select to app_authenticated
  using (
    owner_profile_id = public.my_matrimony_profile_id()
    or target_profile_id = public.my_matrimony_profile_id()
    or public.is_admin()
  );

drop policy if exists matrimony_shortlists_insert on public.matrimony_shortlists;
create policy matrimony_shortlists_insert on public.matrimony_shortlists
  for insert to app_authenticated
  with check (
    owner_profile_id = public.my_matrimony_profile_id()
    and public.can_view_matrimony_profile(target_profile_id)
  );

drop policy if exists matrimony_shortlists_delete on public.matrimony_shortlists;
create policy matrimony_shortlists_delete on public.matrimony_shortlists
  for delete to app_authenticated
  using (owner_profile_id = public.my_matrimony_profile_id() or public.is_admin());

-- Private notes you keep about candidates.
grant select, insert, update, delete on public.matrimony_profile_notes to app_authenticated;

drop policy if exists matrimony_notes_own on public.matrimony_profile_notes;
create policy matrimony_notes_own on public.matrimony_profile_notes
  for all to app_authenticated
  using (author_profile_id = public.my_matrimony_profile_id() or public.is_admin())
  with check (author_profile_id = public.my_matrimony_profile_id());

-- Blocks are visible only to the person who created them. The blocked party
-- must not be able to detect the block.
grant select, insert, delete on public.matrimony_blocks to app_authenticated;

drop policy if exists matrimony_blocks_select on public.matrimony_blocks;
create policy matrimony_blocks_select on public.matrimony_blocks
  for select to app_authenticated
  using (blocker_profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_blocks_insert on public.matrimony_blocks;
create policy matrimony_blocks_insert on public.matrimony_blocks
  for insert to app_authenticated
  with check (blocker_profile_id = public.my_matrimony_profile_id());

drop policy if exists matrimony_blocks_delete on public.matrimony_blocks;
create policy matrimony_blocks_delete on public.matrimony_blocks
  for delete to app_authenticated
  using (blocker_profile_id = public.my_matrimony_profile_id() or public.is_admin());

-- Reports: file your own, staff triage them. Reporters cannot read the
-- moderation outcome or another member's report.
grant select, insert, update on public.matrimony_reports to app_authenticated;

drop policy if exists matrimony_reports_select on public.matrimony_reports;
create policy matrimony_reports_select on public.matrimony_reports
  for select to app_authenticated
  using (reporter_profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_reports_insert on public.matrimony_reports;
create policy matrimony_reports_insert on public.matrimony_reports
  for insert to app_authenticated
  with check (reporter_profile_id = public.my_matrimony_profile_id());

drop policy if exists matrimony_reports_update on public.matrimony_reports;
create policy matrimony_reports_update on public.matrimony_reports
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Photo access requests.
grant select, insert, update on public.matrimony_photo_requests to app_authenticated;

drop policy if exists matrimony_photo_requests_select on public.matrimony_photo_requests;
create policy matrimony_photo_requests_select on public.matrimony_photo_requests
  for select to app_authenticated
  using (
    requester_profile_id = public.my_matrimony_profile_id()
    or target_profile_id = public.my_matrimony_profile_id()
    or public.is_admin()
  );

drop policy if exists matrimony_photo_requests_insert on public.matrimony_photo_requests;
create policy matrimony_photo_requests_insert on public.matrimony_photo_requests
  for insert to app_authenticated
  with check (
    requester_profile_id = public.my_matrimony_profile_id()
    and public.can_view_matrimony_profile(target_profile_id)
  );

drop policy if exists matrimony_photo_requests_update on public.matrimony_photo_requests;
create policy matrimony_photo_requests_update on public.matrimony_photo_requests
  for update to app_authenticated
  using (target_profile_id = public.my_matrimony_profile_id() or public.is_admin())
  with check (target_profile_id = public.my_matrimony_profile_id() or public.is_admin());

-- Saved searches are strictly personal.
grant select, insert, update, delete on public.matrimony_saved_searches to app_authenticated;

drop policy if exists matrimony_saved_searches_own on public.matrimony_saved_searches;
create policy matrimony_saved_searches_own on public.matrimony_saved_searches
  for all to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin())
  with check (profile_id = public.my_matrimony_profile_id());

-- Conversations and messages: participants only.
grant select, insert, update on public.matrimony_conversations to app_authenticated;

drop policy if exists matrimony_conversations_select on public.matrimony_conversations;
create policy matrimony_conversations_select on public.matrimony_conversations
  for select to app_authenticated
  using (
    public.my_matrimony_profile_id() in (profile_a_id, profile_b_id)
    or public.is_admin()
  );

-- A thread may only be opened between two people who accepted each other's
-- interest — the same consent gate that releases contact details.
drop policy if exists matrimony_conversations_insert on public.matrimony_conversations;
create policy matrimony_conversations_insert on public.matrimony_conversations
  for insert to app_authenticated
  with check (
    public.my_matrimony_profile_id() in (profile_a_id, profile_b_id)
    and public.has_accepted_interest(profile_a_id, profile_b_id)
    and not public.is_blocked_between(profile_a_id, profile_b_id)
  );

drop policy if exists matrimony_conversations_update on public.matrimony_conversations;
create policy matrimony_conversations_update on public.matrimony_conversations
  for update to app_authenticated
  using (public.my_matrimony_profile_id() in (profile_a_id, profile_b_id) or public.is_admin());

grant select, insert, update on public.matrimony_messages to app_authenticated;

drop policy if exists matrimony_messages_select on public.matrimony_messages;
create policy matrimony_messages_select on public.matrimony_messages
  for select to app_authenticated
  using (public.is_conversation_participant(conversation_id) or public.is_admin());

drop policy if exists matrimony_messages_insert on public.matrimony_messages;
create policy matrimony_messages_insert on public.matrimony_messages
  for insert to app_authenticated
  with check (
    sender_profile_id = public.my_matrimony_profile_id()
    and public.is_conversation_participant(conversation_id)
  );

-- Only for stamping read_at on messages you received.
drop policy if exists matrimony_messages_update on public.matrimony_messages;
create policy matrimony_messages_update on public.matrimony_messages
  for update to app_authenticated
  using (
    public.is_conversation_participant(conversation_id)
    and sender_profile_id <> public.my_matrimony_profile_id()
  );

-- Profile views.
grant select, insert on public.matrimony_profile_views to app_authenticated;

drop policy if exists matrimony_views_select on public.matrimony_profile_views;
create policy matrimony_views_select on public.matrimony_profile_views
  for select to app_authenticated
  using (
    viewer_profile_id = public.my_matrimony_profile_id()
    or viewed_profile_id = public.my_matrimony_profile_id()
    or public.is_admin()
  );

drop policy if exists matrimony_views_insert on public.matrimony_profile_views;
create policy matrimony_views_insert on public.matrimony_profile_views
  for insert to app_authenticated
  with check (viewer_profile_id = public.my_matrimony_profile_id());

-- Verification submissions.
grant select, insert, update on public.matrimony_verifications to app_authenticated;

drop policy if exists matrimony_verifications_select on public.matrimony_verifications;
create policy matrimony_verifications_select on public.matrimony_verifications
  for select to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_verifications_insert on public.matrimony_verifications;
create policy matrimony_verifications_insert on public.matrimony_verifications
  for insert to app_authenticated
  with check (profile_id = public.my_matrimony_profile_id());

drop policy if exists matrimony_verifications_update on public.matrimony_verifications;
create policy matrimony_verifications_update on public.matrimony_verifications
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Success stories: published ones are public marketing content.
grant select on public.matrimony_success_stories to app_anonymous, app_authenticated;
grant insert, update, delete on public.matrimony_success_stories to app_authenticated;

drop policy if exists matrimony_stories_public on public.matrimony_success_stories;
create policy matrimony_stories_public on public.matrimony_success_stories
  for select to app_anonymous, app_authenticated
  using (status = 'approved' and is_public = true);

drop policy if exists matrimony_stories_own on public.matrimony_success_stories;
create policy matrimony_stories_own on public.matrimony_success_stories
  for select to app_authenticated
  using (profile_id = public.my_matrimony_profile_id() or public.is_admin());

drop policy if exists matrimony_stories_insert on public.matrimony_success_stories;
create policy matrimony_stories_insert on public.matrimony_success_stories
  for insert to app_authenticated
  with check (profile_id = public.my_matrimony_profile_id());

drop policy if exists matrimony_stories_update on public.matrimony_success_stories;
create policy matrimony_stories_update on public.matrimony_success_stories
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists matrimony_stories_delete on public.matrimony_success_stories;
create policy matrimony_stories_delete on public.matrimony_success_stories
  for delete to app_authenticated
  using (public.is_admin());

-- Module audit trail.
grant select, insert on public.matrimony_admin_audit to app_authenticated;

drop policy if exists matrimony_audit_select on public.matrimony_admin_audit;
create policy matrimony_audit_select on public.matrimony_admin_audit
  for select to app_authenticated
  using (public.is_admin());

drop policy if exists matrimony_audit_insert on public.matrimony_admin_audit;
create policy matrimony_audit_insert on public.matrimony_admin_audit
  for insert to app_authenticated
  with check (public.is_admin() and admin_user_id = app.current_user_id());

-- =============================================================================
-- NOTIFICATIONS
--
-- No insert policy. Notifications are written for *another* user, so allowing
-- clients to insert would let anyone forge a notice from the platform. The
-- triggers in 0002 and notify_user() cover every case the app needs.
-- =============================================================================

grant select, update, delete on public.in_app_notifications to app_authenticated;

drop policy if exists notifications_select on public.in_app_notifications;
create policy notifications_select on public.in_app_notifications
  for select to app_authenticated
  using (user_id = app.current_user_id() or public.is_admin());

drop policy if exists notifications_update on public.in_app_notifications;
create policy notifications_update on public.in_app_notifications
  for update to app_authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

drop policy if exists notifications_delete on public.in_app_notifications;
create policy notifications_delete on public.in_app_notifications
  for delete to app_authenticated
  using (user_id = app.current_user_id());

-- =============================================================================
-- MATRIMONY VISIBLE-PROFILE VIEW
--
-- The only route to another member's listing. It runs with the view owner's
-- rights (Postgres default), so the WHERE clause below *is* the access control
-- for it — nothing else stands behind it. Two consequences worth remembering
-- before editing:
--   * every predicate must stay in this view; and
--   * the column list is the privacy boundary, so adding a column here
--     publishes it to every member.
-- security_barrier stops a cheap user-supplied function in an outer WHERE from
-- being pushed below these checks to sniff rows it should never see.
--
-- It covers two cases, because a listing you are already connected to must not
-- disappear from your interest list or message thread the moment its owner
-- hides it from open search:
--   1. approved and not hidden — open browsing;
--   2. an existing relationship — an interest either way, a shortlist entry,
--      or a conversation.
-- A block overrides both.
-- =============================================================================

drop view if exists public.matrimony_browse_profiles;
drop view if exists public.matrimony_visible_profiles;

create view public.matrimony_visible_profiles
with (security_barrier = true) as
select
  p.id, p.user_id, p.status, p.created_by,
  p.full_name, p.display_pref, p.gender, p.dob, p.height_cm, p.weight_kg,
  p.body_type, p.marital_status, p.have_children, p.physical_status,
  p.religion, p.denomination, p.community, p.sub_caste, p.gothra,
  p.mother_tongue, p.languages,
  p.time_of_birth, p.place_of_birth, p.rashi, p.nakshatra, p.manglik,
  p.country, p.province, p.city, p.residency_status, p.open_to_relocate,
  p.qualification, p.field_of_study, p.institution,
  p.occupation, p.employer, p.industry, p.employment_type, p.work_location,
  p.income_range,
  p.family_type, p.family_status, p.family_values, p.father_occupation,
  p.mother_occupation, p.siblings_count, p.siblings_married, p.native_place,
  p.family_about,
  p.diet, p.smoking, p.drinking, p.hobbies, p.about_me,
  p.completeness_pct, p.is_hidden,
  p.is_verified_id, p.is_verified_photo, p.is_verified_profession,
  p.photo_visibility, p.last_active_at, p.created_at, p.updated_at
  -- deliberately omitted: admin_notes, rejection_reason, reviewed_by, reviewed_at
from public.matrimony_profiles p
where app.current_user_id() is not null
  -- Requires a listing of your own: it keeps a bare account from enumerating
  -- the member base.
  and public.my_matrimony_profile_id() is not null
  and not public.is_blocked_between(p.id, public.my_matrimony_profile_id())
  and (
    (p.status = 'approved' and p.is_hidden = false)
    or exists (
      select 1 from public.matrimony_interests i
      where (i.sender_profile_id = p.id and i.receiver_profile_id = public.my_matrimony_profile_id())
         or (i.receiver_profile_id = p.id and i.sender_profile_id = public.my_matrimony_profile_id())
    )
    or exists (
      select 1 from public.matrimony_shortlists s
      where s.owner_profile_id = public.my_matrimony_profile_id()
        and s.target_profile_id = p.id
    )
    or exists (
      select 1 from public.matrimony_conversations c
      where public.my_matrimony_profile_id() in (c.profile_a_id, c.profile_b_id)
        and p.id in (c.profile_a_id, c.profile_b_id)
    )
  );

grant select on public.matrimony_visible_profiles to app_authenticated;

-- =============================================================================
-- FUNCTION EXECUTION
-- =============================================================================

-- create_profile is SECURITY DEFINER and takes no privileged columns, so it is
-- safe to expose: it can only ever insert a plain member row.
grant execute on function public.create_profile(uuid, text, jsonb)         to app_authenticated;
grant execute on function public.is_admin()                                to app_authenticated;
grant execute on function public.is_active_member()                        to app_authenticated;
grant execute on function public.my_matrimony_profile_id()                 to app_authenticated;
grant execute on function public.can_view_matrimony_profile(uuid)          to app_authenticated;
grant execute on function public.has_accepted_interest(uuid, uuid)         to app_authenticated;
grant execute on function public.is_blocked_between(uuid, uuid)            to app_authenticated;
grant execute on function public.is_conversation_participant(uuid)         to app_authenticated;
grant execute on function public.helpdesk_stats()                          to app_authenticated;
grant execute on function public.log_audit(text, text, text, text, jsonb)  to app_authenticated;
grant execute on function public.notify_user(uuid, text, text, text, text, jsonb) to app_authenticated;
