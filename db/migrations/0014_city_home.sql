-- ============================================================================
-- 0014 — City-scoped home feed.
--
-- The member home screen becomes a city feed (events, groups, jobs, businesses
-- and new members in the member's own city). Almost everything it needs
-- already exists; the one schema change is widening member_names so the
-- "New in {city}" section can say what a new member does and when they joined.
--
-- PUBLISHING DECISION, stated plainly: member_names is readable by every
-- active member. Adding job_title and created_at means every member can see
-- every other member's title and join month. That matches what the club
-- already shows elsewhere — the community feed carries full names, and the
-- volunteer directory publishes name+title+company to the open internet — and
-- deliberately does NOT include email, phone, or anything from the contact
-- columns. The no-direct-contact rule is unchanged.
-- ============================================================================

-- Dropped first: create-or-replace cannot add columns to a view in place.
drop view if exists public.member_names;

create view public.member_names
with (security_barrier)
as
select
  p.id,
  p.first_name,
  p.last_name,
  p.city,
  p.job_title,
  p.created_at
from public.profiles p
where public.is_active_member()
  and p.account_status = 'active';

grant select on public.member_names to app_authenticated;

comment on view public.member_names is
  'Names, titles and join dates of active members, for members. No contact columns — the club is admin-mediated. Adding a column here shows it to every member.';
