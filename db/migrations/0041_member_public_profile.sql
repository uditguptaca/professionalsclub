-- ============================================================================
-- 0041 — Member public profiles (owner's call, 2026-09-09)
--
-- Tapping a member's name now opens their profile: where they work, what they
-- do, the club events they have been part of, their business if they run one,
-- and a Message button.
--
-- PUBLISHING DECISION, stated plainly. Until now the only thing one member
-- could learn about another was member_names (name, title, city, join date) —
-- "no contact columns, the club is admin-mediated". That stays true: nothing
-- here lets one member contact another outside chat. What this migration DOES
-- publish to signed-in members is the PROFESSIONAL half of a profile, the
-- fields a member filled in precisely so the club could match them with work,
-- referrals and mentors. Exhaustively:
--
--   name, job title, company, industry, professional category,
--   experience range, education level, field of study, skills, certifications,
--   professional summary, LinkedIn URL, city, province, volunteer flag,
--   verification status, join date
--
-- Everything else on public.profiles is deliberately NOT here, and adding a
-- column to this view publishes it to every member — the same warning
-- member_names carries. Never add: email, phone, date_of_birth, gender,
-- postal_code, pc_number, current_status, purposes, joining_for, help_type,
-- help_description (that is why someone asked for help — immigration status,
-- legal trouble, housing), contribute_areas, availability, preferred_contact_*,
-- any consent_* column, role, or account_status.
--
-- Event participation is the second new disclosure: a member's RSVPs to
-- PUBLISHED events become visible to other members. That is the networking
-- value of the feature ("we were both at the Express Entry evening") and it is
-- limited to events the club published; an unpublished or draft event never
-- appears. Private RSVPs were never promised, but they were never shown
-- either, so this is a change in kind and belongs in the record.
-- ============================================================================

-- 1. The professional profile, for signed-in active members ------------------
drop view if exists public.member_profiles;

create view public.member_profiles
with (security_barrier)
as
select
  p.id,
  p.first_name,
  p.last_name,
  p.job_title,
  p.company,
  p.industry,
  p.professional_category,
  p.experience_range,
  p.education_level,
  p.field_of_study,
  p.skills,
  p.certifications,
  p.professional_summary,
  p.linkedin_url,
  p.city,
  p.province,
  p.is_volunteer,
  p.verification_status,
  p.created_at
from public.profiles p
where public.is_active_member()
  and p.account_status = 'active';

grant select on public.member_profiles to app_authenticated;

comment on view public.member_profiles is
  'The professional half of a member profile, for signed-in members: work, skills, education, city, join date. No contact columns and nothing about why a member sought help. Adding a column here shows it to every member (0041).';

-- 2. Event participation, published events only ------------------------------
drop view if exists public.member_event_participation;

create view public.member_event_participation
with (security_barrier)
as
select
  r.member_id,
  e.id           as event_id,
  e.title,
  e.event_date,
  e.event_time,
  e.location,
  e.event_type,
  e.status,
  e.image
from public.event_rsvps r
join public.events e on e.id = r.event_id
where public.is_active_member()
  and e.is_published;

grant select on public.member_event_participation to app_authenticated;

comment on view public.member_event_participation is
  'Which PUBLISHED club events a member RSVPd to, visible to signed-in members. Deliberate 0041 disclosure: shared attendance is the point of a professional club. Unpublished events never appear.';

-- 3. Follower / following counts ---------------------------------------------
-- member_follows is readable only for edges you are on (0016), which is the
-- right default and also means a member cannot count someone else's followers.
-- A definer function returns the two NUMBERS without opening the edges
-- themselves: who follows whom stays private, "312 followers" does not.
create or replace function public.member_social_counts(member uuid)
returns table (followers integer, following integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*)::int from public.member_follows f
      where f.followee_id = member and f.status = 'accepted'),
    (select count(*)::int from public.member_follows f
      where f.follower_id = member and f.status = 'accepted')
  where public.is_active_member();
$$;

revoke all on function public.member_social_counts(uuid) from public;
grant execute on function public.member_social_counts(uuid) to app_authenticated;

comment on function public.member_social_counts(uuid) is
  'Follower/following COUNTS for one member. Definer because member_follows only exposes edges the caller is on; this returns totals, never identities (0041).';
