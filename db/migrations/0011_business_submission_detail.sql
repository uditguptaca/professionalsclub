-- ============================================================================
-- 0011 — Stop discarding what business applicants type.
--
-- The eight-step listing wizard collects about fifty fields. 0007 wired the
-- sixteen that had columns; roughly thirty more were still collected and
-- thrown away, including things an admin plainly needs at review time
-- (certifications, credentials, team size, languages) and the applicant's
-- consent answers.
--
-- Eight of them do have homes already and are simply added to the submit
-- function below: subcategory, service_area, business_hours,
-- pricing_summary, offer_badge, logo, and the social links (five URLs plus a
-- Google reviews link) which fold into the existing social_links jsonb.
--
-- The remainder get one jsonb column rather than fifteen new ones. They are
-- applicant-supplied review context, not queryable business attributes, and
-- inventing a column each would be schema churn for data nothing filters on.
-- If any of them later earns real queries, promote it to a column then.
-- ============================================================================

alter table public.businesses
  add column if not exists submission_details jsonb not null default '{}'::jsonb;

comment on column public.businesses.submission_details is
  'Applicant-supplied detail from the public listing wizard that has no dedicated column (certifications, credentials, team size, languages, consent answers, and so on). Review context for admins; never rendered to the public directory.';

-- ----------------------------------------------------------------------------
-- Replace submit_business_application with a version that keeps everything.
-- Same security shape as 0007: SECURITY DEFINER, anonymous callers hold no
-- table grants, verification_status and is_featured stay server-decided, and
-- the slug is still derived rather than accepted.
-- ----------------------------------------------------------------------------

create or replace function public.submit_business_application(
  p_name              text,
  p_category          text,
  p_description_short text,
  p_description_full  text default null,
  p_contact_person    text default null,
  p_phone             text default null,
  p_email             text default null,
  p_website           text default null,
  p_address           text default null,
  p_city              text default null,
  p_province          text default null,
  p_postal_code       text default null,
  p_years             integer default null,
  p_services          text[] default null,
  p_member_benefits   text[] default null,
  p_member_rate_text  text default null,
  -- Added in 0011.
  p_subcategory       text default null,
  p_service_area      text default null,
  p_business_hours    text default null,
  p_pricing_summary   text default null,
  p_offer_badge       text default null,
  p_logo              text default null,
  p_social_links      jsonb default null,
  p_submission_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_cat  text := btrim(coalesce(p_category, ''));
  v_slug text;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 160 then
    raise exception 'Please enter the business name';
  end if;
  if char_length(v_cat) = 0 then
    raise exception 'Please choose a category';
  end if;

  -- Guard the two jsonb inputs: an object is the only shape the reviewer UI
  -- can render, and a caller could otherwise pass an array or a scalar.
  if p_social_links is not null and jsonb_typeof(p_social_links) <> 'object' then
    raise exception 'Please check the social links';
  end if;
  if p_submission_details is not null and jsonb_typeof(p_submission_details) <> 'object' then
    raise exception 'Please check the application details';
  end if;

  v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_slug := btrim(v_slug, '-') || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.businesses (
    name, slug, category, subcategory, description_short, description_full,
    contact_person, phone, email, website, social_links,
    address, city, province, postal_code, service_area,
    years_in_business, services, member_benefits, member_rate_text,
    business_hours, pricing_summary, offer_badge, logo,
    submission_details, verification_status, is_featured, has_member_rate
  ) values (
    v_name, v_slug, v_cat,
    nullif(btrim(coalesce(p_subcategory, '')), ''),
    nullif(btrim(coalesce(p_description_short, '')), ''),
    nullif(btrim(coalesce(p_description_full, '')), ''),
    nullif(btrim(coalesce(p_contact_person, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    nullif(btrim(coalesce(p_website, '')), ''),
    coalesce(p_social_links, '{}'::jsonb),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_province, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    nullif(btrim(coalesce(p_service_area, '')), ''),
    -- An unanswered years-in-business is unknown, not zero.
    nullif(greatest(coalesce(p_years, 0), 0), 0),
    coalesce(p_services, '{}'),
    coalesce(p_member_benefits, '{}'),
    nullif(btrim(coalesce(p_member_rate_text, '')), ''),
    nullif(btrim(coalesce(p_business_hours, '')), ''),
    nullif(btrim(coalesce(p_pricing_summary, '')), ''),
    nullif(btrim(coalesce(p_offer_badge, '')), ''),
    nullif(btrim(coalesce(p_logo, '')), ''),
    coalesce(p_submission_details, '{}'::jsonb),
    'pending_review', false,
    -- A mandatory-offer-only applicant still has a member rate, so this is
    -- true when either the benefit list or the offer text is present.
    (coalesce(array_length(p_member_benefits, 1), 0) > 0
      or char_length(btrim(coalesce(p_member_rate_text, ''))) > 0)
  );
end;
$$;

revoke all on function public.submit_business_application(
  text, text, text, text, text, text, text, text, text, text, text, text,
  integer, text[], text[], text, text, text, text, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.submit_business_application(
  text, text, text, text, text, text, text, text, text, text, text, text,
  integer, text[], text[], text, text, text, text, text, text, text, jsonb, jsonb
) to app_anonymous, app_authenticated;

-- The 16-argument version from 0007 is now shadowed by this 24-argument one.
-- Drop it so there is exactly one submit path and no stale overload that
-- quietly discards the new fields.
drop function if exists public.submit_business_application(
  text, text, text, text, text, text, text, text, text, text, text, text,
  integer, text[], text[], text
);
