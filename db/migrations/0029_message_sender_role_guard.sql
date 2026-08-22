-- ============================================================================
-- 0029 — The database also refuses a member who calls themselves staff
--
-- The repository now derives sender_role and sender_name from the caller's own
-- profile, so the app cannot send 'admin' on a member's behalf. This is the
-- same rule one layer down, the way every other guard trigger in this schema
-- backs up its repository: a future edit to that insert cannot reopen it.
-- A genuine volunteer label survives; only the staff claim is downgraded.
-- ============================================================================

create or replace function public.guard_message_routing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    if new.sender_user_id is distinct from app.current_user_id() then
      raise exception 'sender_user_id must be the authenticated user';
    end if;
    if new.recipient_role <> 'admin' then
      raise exception 'members and volunteers may only send messages to admins';
    end if;

    -- Nobody but an admin may post AS an admin.
    if new.sender_role = 'admin' then
      new.sender_role := 'member';
    end if;

    -- Staff mail is addressed to the team, never to a person.
    new.recipient_user_id := null;

    -- A case reference is only accepted for the caller's own request.
    if new.case_id is not null
       and not exists (
         select 1 from public.help_requests r
          where r.id = new.case_id and r.member_id = app.current_user_id()
       ) then
      raise exception 'a message may only reference your own request';
    end if;

    new.visibility_scope := 'all';
    new.moderated_flag   := false;
  end if;
  return new;
end;
$$;
