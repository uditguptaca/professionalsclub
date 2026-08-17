-- ============================================================================
-- 0007 — Somewhere for public form submissions to actually go.
--
-- The contact form, the "ask a volunteer for help" relay and the eight-step
-- business listing wizard all told the visitor their submission had been
-- received and then discarded it: each handler only flipped local React
-- state. This migration gives all three a real destination.
--
-- Anonymous visitors get NO table grants. Instead each form calls a
-- SECURITY DEFINER function that:
--   * accepts exactly the columns that form owns (no status, no role, no ids),
--   * validates and trims its inputs,
--   * writes one row with a server-decided status,
--   * returns nothing useful to an attacker.
-- That keeps app_anonymous unable to read or write these tables directly
-- while still letting the public submit. Admins read them through RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Inquiries: the contact form and the volunteer help relay
-- ----------------------------------------------------------------------------

create table if not exists public.public_inquiries (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('contact', 'volunteer_help')),
  name         text not null check (char_length(name) between 1 and 120),
  email        text not null check (char_length(email) between 3 and 200),
  phone        text,
  subject      text,
  message      text not null check (char_length(message) between 1 and 5000),
  -- For volunteer_help: which volunteer/expertise the visitor asked for.
  requested_for text,
  category     text,
  status       text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  handled_by   uuid references public.profiles(id) on delete set null,
  handled_at   timestamptz,
  admin_note   text,
  created_at   timestamptz not null default now()
);

create index if not exists public_inquiries_status_idx
  on public.public_inquiries (status, created_at desc);

alter table public.public_inquiries enable row level security;

-- Admins only. No anonymous grant at all — inserts happen through the
-- SECURITY DEFINER function below.
grant select, update on public.public_inquiries to app_authenticated;

drop policy if exists public_inquiries_select on public.public_inquiries;
create policy public_inquiries_select on public.public_inquiries
  for select to app_authenticated
  using (public.is_admin());

drop policy if exists public_inquiries_update on public.public_inquiries;
create policy public_inquiries_update on public.public_inquiries
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- submit_inquiry(): the only way a visitor writes an inquiry.
-- ----------------------------------------------------------------------------

create or replace function public.submit_inquiry(
  p_kind          text,
  p_name          text,
  p_email         text,
  p_message       text,
  p_phone         text default null,
  p_subject       text default null,
  p_requested_for text default null,
  p_category      text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name    text := btrim(coalesce(p_name, ''));
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_message text := btrim(coalesce(p_message, ''));
begin
  if p_kind not in ('contact', 'volunteer_help') then
    raise exception 'Unknown inquiry kind';
  end if;
  if char_length(v_name) = 0 or char_length(v_name) > 120 then
    raise exception 'Please enter your name';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please enter a valid email address';
  end if;
  if char_length(v_message) = 0 then
    raise exception 'Please enter a message';
  end if;
  if char_length(v_message) > 5000 then
    raise exception 'Please keep the message under 5000 characters';
  end if;

  insert into public.public_inquiries
    (kind, name, email, phone, subject, message, requested_for, category)
  values
    (p_kind, v_name, v_email, nullif(btrim(coalesce(p_phone, '')), ''),
     nullif(btrim(coalesce(p_subject, '')), ''), v_message,
     nullif(btrim(coalesce(p_requested_for, '')), ''),
     nullif(btrim(coalesce(p_category, '')), ''));
end;
$$;

revoke all on function public.submit_inquiry(text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_inquiry(text, text, text, text, text, text, text, text)
  to app_anonymous, app_authenticated;

-- ----------------------------------------------------------------------------
-- submit_business_application(): the public listing wizard.
--
-- Writes a businesses row as 'pending_review' so it appears in the admin
-- Business Requests queue and is invisible to the public directory (whose RLS
-- policy only exposes verified rows). verification_status and is_featured are
-- decided here, never by the caller.
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
  p_member_rate_text  text default null
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

  -- Slug is derived, never accepted: a caller cannot collide with or
  -- overwrite an existing verified listing.
  v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_slug := btrim(v_slug, '-') || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.businesses (
    name, slug, category, description_short, description_full,
    contact_person, phone, email, website,
    address, city, province, postal_code,
    years_in_business, services, member_benefits, member_rate_text,
    verification_status, is_featured, has_member_rate
  ) values (
    v_name, v_slug, v_cat,
    nullif(btrim(coalesce(p_description_short, '')), ''),
    nullif(btrim(coalesce(p_description_full, '')), ''),
    nullif(btrim(coalesce(p_contact_person, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    nullif(btrim(coalesce(p_website, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_province, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    greatest(coalesce(p_years, 0), 0),
    coalesce(p_services, '{}'),
    coalesce(p_member_benefits, '{}'),
    nullif(btrim(coalesce(p_member_rate_text, '')), ''),
    'pending_review', false,
    coalesce(array_length(p_member_benefits, 1), 0) > 0
  );
end;
$$;

revoke all on function public.submit_business_application(
  text, text, text, text, text, text, text, text, text, text, text, text,
  integer, text[], text[], text
) from public;
grant execute on function public.submit_business_application(
  text, text, text, text, text, text, text, text, text, text, text, text,
  integer, text[], text[], text
) to app_anonymous, app_authenticated;
