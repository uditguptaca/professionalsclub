-- ============================================================================
-- 0030 — Referral notifications, restored
--
-- Found by audit: the ONLY two producers of email_outbox rows lived inside
-- create_referral_request() and respond_to_referral(), both dropped with the
-- anonymous fan-out in 0019. Since then a referral request has reached the
-- insider through exactly one channel: a chat they had to notice on their own.
-- No in-app notification, no email, while the drain kept running with nothing
-- to drain. For a feature whose whole purpose is putting a seeker in front of
-- the right person, that is the feature half-working.
--
-- Both functions are SECURITY DEFINER because they write another member's
-- notification row and queue mail, and both refuse anyone but the party
-- entitled to trigger them - so neither can be used to notify strangers.
-- ============================================================================

create or replace function public.notify_referral_request(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r            record;
  v_seeker     text;
  v_company    text;
  v_jobs       int;
begin
  select * into r from public.referral_direct_requests where id = p_request;
  if r.id is null then
    raise exception 'no such referral request';
  end if;
  if r.seeker_id is distinct from app.current_user_id() and not public.is_admin() then
    raise exception 'only the member who asked may send this notification';
  end if;

  select coalesce(first_name || ' ' || last_name, 'A member') into v_seeker
    from public.profiles where id = r.seeker_id;
  select name into v_company from public.companies where id = r.company_id;
  v_jobs := coalesce(array_length(r.job_ids, 1), 0);

  perform public.notify_user(
    r.insider_id,
    'referral_request',
    v_seeker || ' asked you for a referral at ' || coalesce(v_company, 'their company'),
    case when v_jobs = 1 then 'One role, with a note. Open the chat to answer.'
         else v_jobs || ' roles, with a note. Open the chat to answer.' end,
    '/portal/member/chats'
  );

  insert into public.email_outbox (recipient_id, template, payload)
  values (
    r.insider_id,
    'referral_request',
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
  -- A decline is answered in the chat, quietly. Only good news is pushed.
  if r.status <> 'accepted' then
    return;
  end if;

  select coalesce(first_name || ' ' || last_name, 'A member') into v_helper
    from public.profiles where id = r.insider_id;
  select name into v_company from public.companies where id = r.company_id;

  perform public.notify_user(
    r.seeker_id,
    'referral_accepted',
    v_helper || ' can help at ' || coalesce(v_company, 'their company'),
    'They agreed to help with your request. Carry on in your chat.',
    '/portal/member/chats'
  );

  insert into public.email_outbox (recipient_id, template, payload)
  values (
    r.seeker_id,
    'referral_accepted',
    jsonb_build_object('company', coalesce(v_company, ''), 'helper', v_helper)
  );
end;
$$;

revoke all on function public.notify_referral_response(uuid) from public;
grant execute on function public.notify_referral_response(uuid) to app_authenticated;
