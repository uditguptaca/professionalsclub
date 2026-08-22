-- ============================================================================
-- 0028 — A member's message may not be aimed at another member, or filed
--        against someone else's case
--
-- guard_message_routing already pinned sender_user_id to the caller and forced
-- recipient_role = 'admin' for non-admins. Audit found the rest of the row was
-- still caller-chosen: recipient_user_id and case_id. A member could POST the
-- sendMessage action with another member's uuid and another member's
-- help_request id, and the row would land in that case's history AND be
-- delivered to the victim (messages_select admits recipient_user_id), which is
-- exactly the direct member-to-member contact this product forbids.
--
-- sender_role and sender_name are now derived server-side in the repository;
-- this closes the routing half in the database, where it cannot be forgotten.
-- ============================================================================

create or replace function public.guard_message_routing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    -- A non-admin may only ever write to staff, as themselves.
    if new.sender_user_id is distinct from app.current_user_id() then
      raise exception 'sender_user_id must be the authenticated user';
    end if;
    if new.recipient_role <> 'admin' then
      raise exception 'members and volunteers may only send messages to admins';
    end if;

    -- Staff mail is addressed to the team, never to a person: a member cannot
    -- use this table to reach another member.
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
