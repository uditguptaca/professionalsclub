-- ============================================================================
-- 0008 — The real volunteer directory.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public_volunteers: the real volunteer directory.
--
-- The /volunteers page invented ten "verified professionals" with stock
-- headshots and 555 phone numbers. Approved volunteers already exist in
-- volunteer_applications; this view publishes only the professional facts a
-- visitor needs to choose someone to ask for help — and deliberately NOT the
-- email, phone, pc_number, motivation or admin notes, because help is
-- admin-mediated by design and members never get each other's contact
-- details.
--
-- security_barrier: the WHERE clause IS the access control, exactly as with
-- matrimony_visible_profiles. Adding a column here publishes it to the whole
-- internet, so add nothing without thinking about that.
-- ----------------------------------------------------------------------------

create or replace view public.public_volunteers
with (security_barrier)
as
select
  v.id,
  v.member_name        as name,
  v.current_profession as role,
  v.organization       as company,
  v.city,
  v.province,
  v.linkedin_url,
  v.years_experience,
  v.expertise_areas,
  v.languages,
  v.mentorship_interest,
  v.referral_support_interest,
  v.resume_review_interest,
  v.settlement_support_interest,
  v.tax_guidance_interest,
  v.immigration_guidance_interest
from public.volunteer_applications v
where v.status = 'approved';

grant select on public.public_volunteers to app_anonymous, app_authenticated;
