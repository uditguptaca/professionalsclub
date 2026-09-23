-- ============================================================================
-- 0059: a volunteer can pause, change their load, or stop; help-desk
-- notifications open the request
--
-- The September UX audit found /portal/member/my-volunteer showed status,
-- areas, a monthly cap and the case queue, and offered no control over any of
-- it. A volunteer who got a job, or hit a crisis of their own, could only go
-- silent or delete their account. Three things change here:
--
--   1. volunteer_applications.paused_until. Null means "taking cases". A date
--      in the future means "not until then", and the admin's picker and
--      createAssignment() both honour it.
--   2. Members may UPDATE their own application row. 0003 gave them no update
--      policy at all because admin_notes lives on the row; that stays safe
--      because guard_volunteer_application_fields() pins admin_notes,
--      reviewed_*, member_id and (almost) status for anyone who is not an
--      admin. The one status move a member may now make is to WITHDRAW
--      (-> 'inactive'), and to re-open a withdrawn application
--      ('inactive' -> 'new_application'), which goes back through review.
--   3. sync_volunteer_flag() has to actually take is_volunteer away when a
--      member withdraws. It is a SECURITY DEFINER trigger, but is_admin() reads
--      app.current_user_id(), so the nested profiles UPDATE still ran under
--      the member's identity and guard_profile_privileges() put the flag
--      straight back. 0044's comment believed otherwise; it was never tested
--      by a non-admin because no non-admin could change status. The guard
--      now lets is_volunteer through when the write comes from ANOTHER
--      TRIGGER (pg_trigger_depth() > 1) - a statement from a member is depth
--      0, so the guard sees it at depth 1 and still pins the flag.
--
-- Also here, because the same audit found it: the notification for a club
-- reply on a help request linked to the generic inbox instead of the request.
-- ============================================================================

-- 1. The pause -----------------------------------------------------------------
alter table public.volunteer_applications
  add column if not exists paused_until timestamptz;

comment on column public.volunteer_applications.paused_until is
  'Null: taking new cases. A future timestamp: not until then. Set by the volunteer (0059); honoured by the admin picker and createAssignment().';

-- 2. Own-row updates, with the guard deciding what may change -------------------
create or replace function public.guard_volunteer_application_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- A member may withdraw from any state, and may re-apply after withdrawing.
  -- Every other move (approving themselves, most of all) stays with admins.
  if new.status is distinct from old.status
     and not (new.status = 'inactive'
              or (old.status = 'inactive' and new.status = 'new_application')) then
    new.status := old.status;
  end if;

  -- Withdrawing clears the pause: 'inactive' already means "not taking cases".
  if new.status = 'inactive' then
    new.paused_until := null;
  end if;

  new.admin_notes          := old.admin_notes;
  new.reviewed_by_admin_id := old.reviewed_by_admin_id;
  new.reviewed_at          := old.reviewed_at;
  new.member_id            := old.member_id;
  return new;
end;
$$;

drop policy if exists volunteer_apps_update_own on public.volunteer_applications;
create policy volunteer_apps_update_own on public.volunteer_applications
  for update to app_authenticated
  using (member_id = app.current_user_id() and public.is_active_member())
  with check (member_id = app.current_user_id() and public.is_active_member());

-- 3. Let the sync trigger take the curator flag away ----------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.role                := old.role;
  new.verification_status := old.verification_status;
  new.pc_number           := old.pc_number;
  new.id                  := old.id;
  -- is_volunteer is curator authority (0044). A member's own statement can
  -- never change it (depth 1). sync_volunteer_flag() writing it from inside
  -- the volunteer_applications trigger (depth 2) is the one legitimate path,
  -- and since 0059 that path runs for a member's own withdrawal too.
  if pg_trigger_depth() <= 1 then
    new.is_volunteer := old.is_volunteer;
  end if;

  -- One exception to the status lock: a member may retire their own account.
  -- Every other transition (including reactivating a suspended one, which is
  -- the one that matters) stays with admins.
  if not (
    old.account_status = 'active'
    and new.account_status = 'archived'
    and old.id = app.current_user_id()
  ) then
    new.account_status := old.account_status;
  end if;

  return new;
end;
$$;

-- 4. The club hears when a volunteer stops ---------------------------------------
-- notify_admins() is trigger-only (0055); this is a trigger. Only a real
-- withdrawal is worth an admin's attention: an approved volunteer going
-- inactive, whose open cases now need a new pair of hands.
create or replace function public.notify_admins_on_volunteer_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'approved' and new.status = 'inactive' then
    perform public.notify_admins(
      'admin_volunteer_withdrew', 'A volunteer stopped',
      coalesce(nullif(new.member_name, ''), 'A volunteer') || ' stopped volunteering. Reassign any open cases.',
      '/portal/admin/assignments', 'admin_volunteers');
  end if;
  return new;
end;
$$;

drop trigger if exists volunteer_apps_notify_withdrawal on public.volunteer_applications;
create trigger volunteer_apps_notify_withdrawal
  after update of status on public.volunteer_applications
  for each row execute function public.notify_admins_on_volunteer_withdrawal();

-- 5. A club reply opens the request it is about ----------------------------------
create or replace function public.notify_on_admin_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Only mail addressed to a specific member; staff-bound mail is read in the
  -- admin inbox, which is a working surface rather than a notification.
  if new.recipient_user_id is null or new.recipient_role = 'admin' then
    return new;
  end if;
  perform public.notify_member(
    new.recipient_user_id, 'help', 'admin_message',
    case when new.sender_role = 'admin' then 'Professionals Club'
         else coalesce(public.member_display_name(new.sender_user_id), 'A member') end,
    coalesce(nullif(new.case_title, ''), 'You have a new message'),
    -- The request itself, where the thread and the reply box are. The generic
    -- inbox is the fallback only for a message with no case.
    case when new.case_id is null then '/portal/member/messages'
         else '/portal/member/my-requests/' || new.case_id::text end,
    new.sender_user_id,
    'msg:' || coalesce(new.case_id::text, 'general'),
    jsonb_build_object('caseId', new.case_id)
  );
  return new;
end;
$$;
