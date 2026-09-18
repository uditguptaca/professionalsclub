-- ============================================================================
-- 0055: fixes from the September 2026 security audit
--
-- Nine reviewers read the app end to end. Everything that needs the database
-- to say no (rather than the application remembering to) lands here:
--
--   1. Signup no longer grants curator rights. create_profile() used to copy
--      "I want to volunteer" straight into profiles.is_volunteer, which 0044
--      turned into the privilege behind the job board and club events.
--   2. Matrimony: a listing cannot be born approved; photo visibility is a
--      row-level rule, not a CSS blur; the visible-profiles view reduces the
--      name the way the member asked; interest notices do the same; one
--      profile view per viewer per day; gender casing is one thing.
--   3. Chat: a device id is unique across members; a wrap's member is bound to
--      the device that owns it; a member's own device may replace a wrap a
--      peer made for it, so a poisoned wrap can be repaired; a device may
--      discard a wrap it cannot open.
--   4. Business: admins are told about new listings (the trigger tested a
--      status the column cannot hold); a member-owned business sees its own
--      redemptions; listing fields have a size.
--   5. Events, volunteers, moderation: pending business events no longer
--      buzz the whole city; an RSVP sends one email and one text, not one per
--      toggle; one volunteer application per member; a held business post
--      reaches its moderators.
-- ============================================================================

-- 1. Signup ----------------------------------------------------------------------
create or replace function public.create_profile(p_user_id uuid, p_email text, p_data jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- is_volunteer is NOT written here any more. It is a privilege (0044): the
  -- only way to it is an approved volunteer application (sync_volunteer_flag).
  insert into public.profiles (
    id, email,
    first_name, middle_name, last_name, phone, date_of_birth, gender,
    country, province, city, postal_code, current_status,
    purposes, joining_for, help_type, help_description, contribute_areas, availability,
    employment_status, job_title, company, industry,
    previous_job_title, previous_company, experience_range, education_level,
    field_of_study, professional_category, certifications, skills,
    linkedin_url, professional_summary,
    preferred_contact_method, preferred_language, update_topics,
    consent_register, consent_admin_review, consent_no_direct_contact,
    consent_no_misuse, consent_updates, consent_terms, consented_at,
    is_help_seeker
  )
  values (
    p_user_id,
    p_email,
    coalesce(p_data ->> 'first_name', ''),
    nullif(p_data ->> 'middle_name', ''),
    coalesce(p_data ->> 'last_name', ''),
    nullif(p_data ->> 'phone', ''),
    (nullif(p_data ->> 'date_of_birth', ''))::date,
    nullif(p_data ->> 'gender', ''),
    coalesce(nullif(p_data ->> 'country', ''), 'Canada'),
    nullif(p_data ->> 'province', ''),
    nullif(p_data ->> 'city', ''),
    nullif(p_data ->> 'postal_code', ''),
    nullif(p_data ->> 'current_status', ''),
    public.jsonb_text_array(p_data, 'purposes'),
    nullif(p_data ->> 'joining_for', ''),
    nullif(p_data ->> 'help_type', ''),
    nullif(p_data ->> 'help_description', ''),
    public.jsonb_text_array(p_data, 'contribute_areas'),
    nullif(p_data ->> 'availability', ''),
    nullif(p_data ->> 'employment_status', ''),
    nullif(p_data ->> 'job_title', ''),
    nullif(p_data ->> 'company', ''),
    nullif(p_data ->> 'industry', ''),
    nullif(p_data ->> 'previous_job_title', ''),
    nullif(p_data ->> 'previous_company', ''),
    nullif(p_data ->> 'experience_range', ''),
    nullif(p_data ->> 'education_level', ''),
    nullif(p_data ->> 'field_of_study', ''),
    nullif(p_data ->> 'professional_category', ''),
    nullif(p_data ->> 'certifications', ''),
    nullif(p_data ->> 'skills', ''),
    nullif(p_data ->> 'linkedin_url', ''),
    nullif(p_data ->> 'professional_summary', ''),
    coalesce(nullif(p_data ->> 'preferred_contact_method', ''), 'Email'),
    coalesce(nullif(p_data ->> 'preferred_language', ''), 'English'),
    public.jsonb_text_array(p_data, 'update_topics'),
    coalesce((p_data ->> 'consent_register')::boolean, false),
    coalesce((p_data ->> 'consent_admin_review')::boolean, false),
    coalesce((p_data ->> 'consent_no_direct_contact')::boolean, false),
    coalesce((p_data ->> 'consent_no_misuse')::boolean, false),
    coalesce((p_data ->> 'consent_updates')::boolean, false),
    coalesce((p_data ->> 'consent_terms')::boolean, false),
    case when (p_data ->> 'consent_terms')::boolean then now() else null end,
    coalesce(p_data ->> 'joining_for', 'help') in ('help', 'both')
  )
  on conflict (id) do nothing;
end;
$$;

-- Take the privilege back from anyone who only had it because of the signup
-- form. Admins keep theirs; an approved application keeps its holder's.
update public.profiles p
   set is_volunteer = false
 where p.is_volunteer
   and p.role <> 'admin'
   and not exists (
     select 1 from public.volunteer_applications v
      where v.member_id = p.id and v.status = 'approved'
   );

-- 2. Matrimony --------------------------------------------------------------------

-- 2a. A listing is born a draft (or pending), never approved, whatever the
--     client sent; verification flags start false; gender has one casing.
create or replace function public.guard_matrimony_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.gender is not null then
    new.gender := initcap(lower(new.gender));
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending') then new.status := 'draft'; end if;
    new.rejection_reason       := null;
    new.admin_notes            := null;
    new.reviewed_by            := null;
    new.reviewed_at            := null;
    new.is_verified_id         := false;
    new.is_verified_photo      := false;
    new.is_verified_profession := false;
    return new;
  end if;

  new.user_id                := old.user_id;
  new.rejection_reason       := old.rejection_reason;
  new.admin_notes            := old.admin_notes;
  new.reviewed_by            := old.reviewed_by;
  new.reviewed_at            := old.reviewed_at;
  new.is_verified_id         := old.is_verified_id;
  new.is_verified_photo      := old.is_verified_photo;
  new.is_verified_profession := old.is_verified_profession;

  -- A member may move their own listing between draft and pending, or
  -- retire it, but never into an approved/suspended state.
  if new.status not in ('draft', 'pending') and new.status is distinct from old.status then
    new.status := old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists matrimony_profiles_guard_fields on public.matrimony_profiles;
create trigger matrimony_profiles_guard_fields
  before insert or update on public.matrimony_profiles
  for each row execute function public.guard_matrimony_profile_fields();

update public.matrimony_profiles set gender = initcap(lower(gender))
 where gender is not null and gender <> initcap(lower(gender));
alter table public.matrimony_profiles drop constraint if exists matrimony_profiles_gender_check;
alter table public.matrimony_profiles
  add constraint matrimony_profiles_gender_check check (gender in ('Male', 'Female', 'Other'));

-- 2b. Photos: the owner's photo_visibility is a database rule. 'all' shows
--     them to anyone who may see the listing; anything else waits for an
--     accepted interest. The client blur is decoration, not the control.
create or replace function public.matrimony_photos_visible(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.matrimony_profiles p
     where p.id = p_profile
       and (p.photo_visibility = 'all'
            or public.has_accepted_interest(p.id, public.my_matrimony_profile_id()))
  );
$$;
revoke all on function public.matrimony_photos_visible(uuid) from public;
grant execute on function public.matrimony_photos_visible(uuid) to app_authenticated;

drop policy if exists matrimony_media_select on public.matrimony_media;
create policy matrimony_media_select on public.matrimony_media
  for select to app_authenticated
  using (
    profile_id = public.my_matrimony_profile_id()
    or public.is_admin()
    or (is_approved
        and public.can_view_matrimony_profile(profile_id)
        and public.matrimony_photos_visible(profile_id))
  );

-- 2c. The name a member asked to show is reduced in the database, not in the
--     browser (the full legal name was in every payload).
create or replace function public.matrimony_display_name(p_profile uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case lower(replace(coalesce(p.display_pref, ''), ' ', '_'))
           when 'first_name' then split_part(p.full_name, ' ', 1)
           when 'initials' then coalesce(
             (select string_agg(upper(left(w, 1)) || '.', '')
                from unnest(string_to_array(p.full_name, ' ')) as w where w <> ''),
             p.full_name)
           else p.full_name
         end
    from public.matrimony_profiles p
   where p.id = p_profile;
$$;
revoke all on function public.matrimony_display_name(uuid) from public;
grant execute on function public.matrimony_display_name(uuid) to app_authenticated;

create or replace view public.matrimony_visible_profiles with (security_barrier = true) as
 select p.id,
    p.user_id,
    p.status,
    p.created_by,
    case when p.user_id = app.current_user_id() or public.is_admin()
           or public.has_accepted_interest(p.id, public.my_matrimony_profile_id())
         then p.full_name else public.matrimony_display_name(p.id) end as full_name,
    case when p.user_id = app.current_user_id() or public.is_admin()
           or public.has_accepted_interest(p.id, public.my_matrimony_profile_id())
         then p.display_pref else 'full_name' end as display_pref,
    p.gender, p.dob, p.height_cm, p.weight_kg, p.body_type, p.marital_status, p.have_children,
    p.physical_status, p.religion, p.denomination, p.community, p.sub_caste, p.gothra,
    p.mother_tongue, p.languages, p.time_of_birth, p.place_of_birth, p.rashi, p.nakshatra,
    p.manglik, p.country, p.province, p.city, p.residency_status, p.open_to_relocate,
    p.qualification, p.field_of_study, p.institution, p.occupation, p.employer, p.industry,
    p.employment_type, p.work_location, p.income_range, p.family_type, p.family_status,
    p.family_values, p.father_occupation, p.mother_occupation, p.siblings_count,
    p.siblings_married, p.native_place, p.family_about, p.diet, p.smoking, p.drinking,
    p.hobbies, p.about_me, p.completeness_pct, p.is_hidden, p.is_verified_id,
    p.is_verified_photo, p.is_verified_profession, p.photo_visibility, p.last_active_at,
    p.created_at, p.updated_at
   from public.matrimony_profiles p
  where app.current_user_id() is not null
    and public.my_matrimony_profile_id() is not null
    and not public.is_blocked_between(p.id, public.my_matrimony_profile_id())
    and (
      (p.status = 'approved' and p.is_hidden = false)
      or exists (select 1 from public.matrimony_interests i
                  where (i.sender_profile_id = p.id and i.receiver_profile_id = public.my_matrimony_profile_id())
                     or (i.receiver_profile_id = p.id and i.sender_profile_id = public.my_matrimony_profile_id()))
      or exists (select 1 from public.matrimony_shortlists s
                  where s.owner_profile_id = public.my_matrimony_profile_id() and s.target_profile_id = p.id)
      or exists (select 1 from public.matrimony_conversations c
                  where (public.my_matrimony_profile_id() = c.profile_a_id or public.my_matrimony_profile_id() = c.profile_b_id)
                    and (p.id = c.profile_a_id or p.id = c.profile_b_id))
    );

-- 2d. Interest notices use the name the sender chose to show.
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
    select p.user_id, public.matrimony_display_name(p.id) into v_actor_user, v_actor_name
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
    -- A match releases the full name to both sides, so the full name is right here.
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

-- 2e. One profile view per viewer per day: the counter means something.
create unique index if not exists uq_matrimony_views_daily
  on public.matrimony_profile_views (viewer_profile_id, viewed_profile_id, ((created_at at time zone 'UTC')::date));

-- 3. Chat ----------------------------------------------------------------------------

-- 3a. A device id names one device, across every member.
create unique index if not exists uq_member_devices_device on public.member_devices (device_id);

-- 3b. A wrap's member is whoever owns the device, never what the client said.
create or replace function public.bind_message_key_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_owner uuid;
begin
  select d.member_id into v_owner from public.member_devices d where d.device_id = new.device_id;
  if v_owner is null then
    raise exception 'Unknown device' using errcode = '42501';
  end if;
  new.member_id := v_owner;
  return new;
end;
$$;
drop trigger if exists member_message_keys_bind_member on public.member_message_keys;
create trigger member_message_keys_bind_member
  before insert on public.member_message_keys
  for each row execute function public.bind_message_key_member();

-- 3c. Backfill: a member's own device may replace a wrap a peer made for it
--     (repairing a wrap nobody can open); a peer never replaces anything.
create or replace function public.add_message_wraps(p_conversation uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := app.current_user_id();
  v_n  integer;
begin
  if v_me is null or not public.is_active_member() then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.member_conversations c
     where c.id = p_conversation and v_me in (c.member_a_id, c.member_b_id)
  ) then
    raise exception 'Not your conversation' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_rows, '[]'::jsonb)) > 500 then
    raise exception 'Too many wraps at once';
  end if;

  insert into public.member_message_keys
    (message_id, device_id, member_id, wrapped_key, wrap_iv, wrapped_by_device_id)
  select r.message_id, r.device_id, d.member_id, r.wrapped_key, r.wrap_iv, r.wrapped_by_device_id
    from jsonb_to_recordset(p_rows)
         as r(message_id uuid, device_id text, wrapped_key text, wrap_iv text, wrapped_by_device_id text)
    join public.member_messages m
      on m.id = r.message_id and m.conversation_id = p_conversation and m.cipher is not null
    join public.member_conversations c on c.id = m.conversation_id
    join public.member_devices d
      on d.device_id = r.device_id and d.member_id in (c.member_a_id, c.member_b_id)
    join public.member_devices mine
      on mine.device_id = r.wrapped_by_device_id and mine.member_id = v_me
   where r.wrapped_key is not null and length(r.wrapped_key) <= 1000
     and r.wrap_iv is not null and length(r.wrap_iv) between 8 and 64
  on conflict (message_id, device_id) do update
    set wrapped_key = excluded.wrapped_key,
        wrap_iv = excluded.wrap_iv,
        wrapped_by_device_id = excluded.wrapped_by_device_id
  where public.member_message_keys.member_id = v_me
    and public.member_message_keys.member_id is distinct from (
      select d2.member_id from public.member_devices d2
       where d2.device_id = public.member_message_keys.wrapped_by_device_id);

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 3d. A device may discard a wrap addressed to it that it cannot open, so the
--     backfill sees the gap and a device that can read the message fills it.
grant delete on public.member_message_keys to app_authenticated;
drop policy if exists member_message_keys_delete on public.member_message_keys;
create policy member_message_keys_delete on public.member_message_keys
  for delete to app_authenticated
  using (
    member_id = app.current_user_id()
    and exists (select 1 from public.member_devices d
                 where d.device_id = member_message_keys.device_id
                   and d.member_id = app.current_user_id())
  );

-- 4. Business ----------------------------------------------------------------------------

-- 4a. New listings reach the admins (the branch tested a value the column cannot hold).
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
    if new.verification_status = 'pending_review' then
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

-- 4b. Either kind of owner sees their business's redemptions.
drop policy if exists coupon_redemptions_business on public.coupon_redemptions;
create policy coupon_redemptions_business on public.coupon_redemptions
  for select to app_authenticated
  using (public.owns_business(business_id));

-- 4c. Listing fields have a size (every sibling table already had one).
alter table public.businesses drop constraint if exists businesses_text_lengths;
alter table public.businesses add constraint businesses_text_lengths check (
  char_length(name) <= 160
  and char_length(coalesce(description_short, '')) <= 600
  and char_length(coalesce(description_full, '')) <= 8000
  and char_length(coalesce(logo, '')) <= 1000
  and char_length(coalesce(cover_image, '')) <= 1000
  and char_length(coalesce(website, '')) <= 500
  and char_length(coalesce(address, '')) <= 400
  and char_length(coalesce(service_area, '')) <= 400
  and char_length(coalesce(business_hours, '')) <= 1000
  and char_length(coalesce(pricing_summary, '')) <= 2000
  and char_length(coalesce(member_rate_text, '')) <= 400
  and char_length(coalesce(offer_badge, '')) <= 80
  and char_length(coalesce(contact_person, '')) <= 160
  and char_length(coalesce(phone, '')) <= 40
  and char_length(coalesce(email, '')) <= 254
  and coalesce(cardinality(services), 0) <= 40
  and coalesce(cardinality(member_benefits), 0) <= 40
);

-- 5. Events, volunteers, moderation ---------------------------------------------------------

-- 5a. Members hear about an event when the club approves it, not when a
--     business submits it.
create or replace function public.notify_on_event_published()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_member record;
begin
  if not new.is_published or new.status <> 'upcoming' or new.moderation_status <> 'approved' then
    return new;
  end if;
  -- Only when it becomes visible, not on every later edit.
  if tg_op = 'UPDATE' and old.is_published and old.status = 'upcoming' and old.moderation_status = 'approved' then
    return new;
  end if;

  for v_member in
    select p.id from public.profiles p
     where p.account_status = 'active'
       and coalesce(p.city, '') <> ''
       and coalesce(new.location, '') ilike '%' || p.city || '%'
     limit 2000
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

-- 5b. One email and one text per RSVP, however often it is toggled.
create or replace function public.notify_on_event_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  e       record;
  v_when  text;
  v_where text;
begin
  select id, title, event_date, event_time, venue_name, location, city, event_type
    into e
    from public.events where id = new.event_id;
  if e.id is null then
    return new;
  end if;

  v_when := coalesce(to_char(e.event_date, 'FMDay FMDD FMMonth'), 'date to be announced')
            || coalesce(', ' || e.event_time, '');
  v_where := case
    when e.event_type = 'virtual' then 'online'
    else coalesce(e.venue_name, e.location, e.city, 'venue to be announced')
  end;

  perform public.notify_member(
    new.member_id,
    'event',
    'event_rsvp',
    'You are going to ' || e.title,
    v_when || ' · ' || v_where,
    '/portal/member/events/' || e.id::text,
    null,
    'event_rsvp:' || e.id::text,
    jsonb_build_object('eventId', e.id)
  );

  if public.notifications_enabled(new.member_id, 'event') then
    if not exists (
      select 1 from public.email_outbox o
       where o.recipient_id = new.member_id and o.template = 'event_rsvp'
         and o.payload ->> 'eventId' = e.id::text
    ) then
      insert into public.email_outbox (recipient_id, template, payload)
      values (
        new.member_id,
        'event_rsvp',
        jsonb_build_object(
          'eventId', e.id, 'title', e.title, 'when', v_when, 'where', v_where,
          'date', e.event_date, 'time', e.event_time, 'online', e.event_type <> 'in_person'
        )
      );
    end if;

    if exists (select 1 from public.profiles p
                where p.id = new.member_id and coalesce(trim(p.phone), '') <> '')
       and not exists (
         select 1 from public.sms_outbox o
          where o.recipient_id = new.member_id
            and o.body like '%/portal/member/events/' || e.id::text
       ) then
      insert into public.sms_outbox (recipient_id, body)
      values (
        new.member_id,
        'Professionals Club: you are going to ' || e.title || ' - ' || v_when || ', ' || v_where
          || '. Details: ' || coalesce(current_setting('app.site_url', true), 'https://professionalsclub.vercel.app')
          || '/portal/member/events/' || e.id::text
      );
    end if;
  end if;

  return new;
end;
$$;

-- 5c. One volunteer application per member.
create unique index if not exists uq_volunteer_app_member on public.volunteer_applications (member_id);

-- 5d. A held business post (no author) still reaches its moderators.
create or replace function public.notify_on_post_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_group text;
begin
  select g.name into v_group from public.community_groups g where g.id = new.group_id;
  if tg_op = 'INSERT' and new.status = 'held' then
    if new.author_id is not null then
      perform public.notify_member(new.author_id, 'community', 'content_held',
        'Your post is waiting for a moderator', 'It will be visible to others once someone checks it.',
        '/portal/member/community/posts/' || new.id::text, null, 'held:' || new.id::text, '{}'::jsonb);
    end if;
    perform public.notify_group_moderators(new.group_id, 'A post is waiting for review',
      coalesce('In ' || v_group, 'Club-wide post'));
  elsif tg_op = 'UPDATE' and new.author_id is not null and old.status <> new.status then
    if old.status = 'held' and new.status = 'active' then
      update public.in_app_notifications set is_read = true
       where user_id = new.author_id and group_key = 'held:' || new.id::text and is_read = false;
      perform public.notify_member(new.author_id, 'community', 'content_approved',
        'Your post is live', 'A moderator approved it.',
        '/portal/member/community/posts/' || new.id::text, null, 'live:' || new.id::text, '{}'::jsonb);
    elsif new.status = 'removed' and app.current_user_id() is distinct from new.author_id then
      perform public.notify_member(new.author_id, 'community', 'content_removed',
        'A moderator removed your post', 'It did not fit the community guidelines.',
        '/portal/member/community', null, 'removed:' || new.id::text, '{}'::jsonb);
    end if;
  end if;
  return new;
end;
$$;

-- 6. Grants: no definer helper is executable by whoever happens to connect -------------
--
-- Postgres grants EXECUTE on a new function to PUBLIC. 0033 took that back for
-- notify_member and explained why; these two wrappers call notify_member with
-- caller-supplied title, body and link and were never revoked, so any member
-- could write (or rewrite, via the group_key collapse) an admin's notification.
-- Triggers are the only callers and trigger functions need no grant.
revoke all on function public.notify_admins(text, text, text, text, text) from public;
revoke all on function public.notify_group_moderators(uuid, text, text) from public;

-- The rest of the definer helpers: signed-in members only, never the anonymous role.
do $$
declare f text;
begin
  foreach f in array array[
    'public.accepts_referrals_at(uuid, uuid)',
    'public.chat_read_receipts_enabled(uuid)',
    'public.is_blocked_between_members(uuid, uuid)',
    'public.is_chat_allowed(uuid, uuid)',
    'public.is_matrimony_match(uuid, uuid)',
    'public.is_member_convo_participant(uuid)',
    'public.is_mutual_follow(uuid, uuid)',
    'public.is_preapproved_chat(uuid, uuid)',
    'public.matrimony_owner(uuid)',
    'public.member_convo_is_open(uuid)',
    'public.member_display_name(uuid)',
    'public.notifications_enabled(uuid, text)',
    'public.log_audit(text, text, text, text, jsonb)',
    'public.helpdesk_stats()',
    'public.has_accepted_interest(uuid, uuid)',
    'public.can_view_matrimony_profile(uuid)',
    'public.my_matrimony_profile_id()'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to app_authenticated', f);
  end loop;
end $$;

-- 7. Profiles: a new row is a plain member, whatever the payload said -----------------------
create or replace function public.guard_profile_insert_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then return new; end if;
  -- is_volunteer is curator authority (0044): only an approved application
  -- grants it. role is what the admin makes it later.
  new.is_volunteer := false;
  new.role := 'member';
  return new;
end;
$$;
drop trigger if exists profiles_guard_insert_privileges on public.profiles;
create trigger profiles_guard_insert_privileges
  before insert on public.profiles
  for each row execute function public.guard_profile_insert_privileges();

-- 8. Content status and verdict change only under a moderator's hand -------------------------
--
-- The update policies admit the author (to edit their own words), and RLS
-- grants whole rows. This pins status and moderation for anyone who is not an
-- admin or a moderator of the post's group, so the application check in
-- moderateItem() has a floor under it.
create or replace function public.guard_content_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then return new; end if;

  if tg_table_name = 'community_posts' then
    if new.group_id is not null and public.is_group_admin(new.group_id) then return new; end if;
    new.business_id := old.business_id;
  else
    if exists (select 1 from public.community_posts p
                where p.id = new.post_id and p.group_id is not null
                  and public.is_group_admin(p.group_id)) then return new; end if;
  end if;

  new.status     := old.status;
  new.moderation := old.moderation;
  return new;
end;
$$;
drop trigger if exists community_posts_guard_moderation on public.community_posts;
create trigger community_posts_guard_moderation
  before update on public.community_posts
  for each row execute function public.guard_content_moderation();
drop trigger if exists community_comments_guard_moderation on public.community_comments;
create trigger community_comments_guard_moderation
  before update on public.community_comments
  for each row execute function public.guard_content_moderation();

-- 9. A suspended member has no matrimony profile to act with -----------------------------------
--
-- Every matrimony write policy keys on this helper; 0027's is_active_member()
-- never reached them. Reads still key on user_id directly, so a suspended
-- member sees their own listing and an admin sees everything.
create or replace function public.my_matrimony_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
    from public.matrimony_profiles m
    join public.profiles p on p.id = m.user_id
   where m.user_id = app.current_user_id()
     and p.account_status = 'active';
$$;

-- 10. The member directory view withholds the private half itself ------------------------------
--
-- 0051 left that to the repository's CASE. The view is the boundary
-- everywhere else in this schema, so it is the boundary here too: name, byline
-- (job title, company), city and the flags are public; the rest opens with
-- can_view_member().
create or replace view public.member_profiles with (security_barrier = true) as
 select p.id,
    p.first_name,
    p.last_name,
    p.job_title,
    p.company,
    case when public.can_view_member(p.id) then p.industry end              as industry,
    case when public.can_view_member(p.id) then p.professional_category end as professional_category,
    case when public.can_view_member(p.id) then p.experience_range end      as experience_range,
    case when public.can_view_member(p.id) then p.education_level end       as education_level,
    case when public.can_view_member(p.id) then p.field_of_study end        as field_of_study,
    case when public.can_view_member(p.id) then p.skills end                as skills,
    case when public.can_view_member(p.id) then p.certifications end        as certifications,
    case when public.can_view_member(p.id) then p.professional_summary end  as professional_summary,
    case when public.can_view_member(p.id) then p.linkedin_url end          as linkedin_url,
    p.city,
    p.province,
    p.is_volunteer,
    p.verification_status,
    p.created_at,
    p.is_private
   from public.profiles p
  where public.is_active_member() and p.account_status = 'active';

-- 11. A group's record of who started it is the club's to change -------------------------------
create or replace function public.guard_group_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then return new; end if;
  new.created_by := old.created_by;
  new.kind       := old.kind;
  new.slug       := old.slug;
  return new;
end;
$$;
drop trigger if exists community_groups_guard_fields on public.community_groups;
create trigger community_groups_guard_fields
  before update on public.community_groups
  for each row execute function public.guard_group_fields();
