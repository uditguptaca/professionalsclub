-- ============================================================================
-- 0053: Groups are the club's, moderators run them, and content is checked
--       before anyone else sees it
--
-- GOVERNANCE. Only a club admin creates a group. A club admin may then make
-- any member a moderator of a group ('admin' role on the membership row; the
-- creator keeps 'owner', which carries the same powers). Moderators and the
-- owner can edit the group, remove members, remove or restore posts and
-- comments in it, and handle reports about content in it. Nothing else about
-- a member's abilities changes.
--
-- AUTO-MODERATION. Posts and comments gain a third status, 'held': saved, seen
-- by the author with a "waiting for a moderator" chip, invisible to everyone
-- else, and listed in the moderators' queue. The application's classifier
-- (src/server/moderation.ts) decides allow / hold / reject at submit time and
-- stores its reasons in `moderation`. Outright rejections never reach the
-- table. The database is the backstop: the select policies below are what
-- keep a held post from every other member's query no matter what a client
-- asks for.
--
-- Everyone involved is told: the author when content is held, approved or
-- removed; moderators when something lands in their queue. All through
-- notify_member(), so push and preferences apply.
-- ============================================================================

-- 1. Roles ------------------------------------------------------------------------
alter table public.community_group_members
  drop constraint if exists community_group_members_role_check;
alter table public.community_group_members
  add constraint community_group_members_role_check check (role in ('owner', 'admin', 'member'));

create or replace function public.is_group_admin(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_active_member()
     and (
       public.is_admin()
       or exists (
         select 1 from public.community_group_members m
          where m.group_id = p_group
            and m.member_id = app.current_user_id()
            and m.role in ('owner', 'admin')
       )
     );
$$;

revoke all on function public.is_group_admin(uuid) from public;
grant execute on function public.is_group_admin(uuid) to app_authenticated;

comment on function public.is_group_admin(uuid) is
  'True when the caller moderates this group: a club admin, the group''s owner, or a member given the admin role (0053).';

-- 2. Groups: created by the club, edited by those who run them -------------------------
drop policy if exists community_groups_insert on public.community_groups;
create policy community_groups_insert on public.community_groups
  for insert to app_authenticated
  with check (public.is_admin() and created_by = app.current_user_id());

drop policy if exists community_groups_update on public.community_groups;
create policy community_groups_update on public.community_groups
  for update to app_authenticated
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

-- 3. Membership: join yourself; admins place people and set roles ---------------------
drop policy if exists community_group_members_insert on public.community_group_members;
create policy community_group_members_insert on public.community_group_members
  for insert to app_authenticated
  with check (
    public.is_active_member()
    and (
      (member_id = app.current_user_id() and role = 'member')
      or public.is_admin()
      or (
        role = 'owner'
        and exists (
          select 1 from public.community_groups g
           where g.id = group_id and g.created_by = app.current_user_id()
        )
      )
    )
  );

grant update (role) on public.community_group_members to app_authenticated;

drop policy if exists community_group_members_update on public.community_group_members;
create policy community_group_members_update on public.community_group_members
  for update to app_authenticated
  using (public.is_admin())
  with check (public.is_admin() and role in ('admin', 'member'));

drop policy if exists community_group_members_delete on public.community_group_members;
create policy community_group_members_delete on public.community_group_members
  for delete to app_authenticated
  using (
    member_id = app.current_user_id()
    or public.is_admin()
    or (public.is_group_admin(group_id) and role = 'member')
  );

-- 4. Held content --------------------------------------------------------------------
alter table public.community_posts drop constraint if exists community_posts_status_check;
alter table public.community_posts
  add constraint community_posts_status_check check (status in ('active', 'held', 'removed'));
alter table public.community_posts add column if not exists moderation jsonb;

alter table public.community_comments drop constraint if exists community_comments_status_check;
alter table public.community_comments
  add constraint community_comments_status_check check (status in ('active', 'held', 'removed'));
alter table public.community_comments add column if not exists moderation jsonb;

comment on column public.community_posts.moderation is
  'What the classifier decided at submit time (0053): {decision, reasons, engine, score}. For moderators; never shown to other members.';

-- Posts: author, club admin, group moderator, or anyone for ACTIVE unblocked content.
drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts
  for select to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or (business_id is not null and public.owns_business(business_id))
    or (group_id is not null and public.is_group_admin(group_id))
    or (
      public.is_active_member()
      and status = 'active'
      and not exists (
        select 1 from public.community_blocks b
         where b.blocker_id = app.current_user_id()
           and b.blocked_id = community_posts.author_id
      )
    )
  );

drop policy if exists community_posts_update on public.community_posts;
create policy community_posts_update on public.community_posts
  for update to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or (group_id is not null and public.is_group_admin(group_id))
  )
  with check (
    author_id = app.current_user_id()
    or public.is_admin()
    or (group_id is not null and public.is_group_admin(group_id))
  );

drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts
  for delete to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or (group_id is not null and public.is_group_admin(group_id))
  );

-- Comments: the same shape, reaching the group through the post.
drop policy if exists community_comments_select on public.community_comments;
create policy community_comments_select on public.community_comments
  for select to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or exists (
      select 1 from public.community_posts p
       where p.id = community_comments.post_id
         and p.group_id is not null
         and public.is_group_admin(p.group_id)
    )
    or (
      public.is_active_member()
      and status = 'active'
      and not exists (
        select 1 from public.community_blocks b
         where b.blocker_id = app.current_user_id()
           and b.blocked_id = community_comments.author_id
      )
    )
  );

drop policy if exists community_comments_update on public.community_comments;
create policy community_comments_update on public.community_comments
  for update to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or exists (
      select 1 from public.community_posts p
       where p.id = community_comments.post_id and p.group_id is not null and public.is_group_admin(p.group_id)
    )
  )
  with check (
    author_id = app.current_user_id()
    or public.is_admin()
    or exists (
      select 1 from public.community_posts p
       where p.id = community_comments.post_id and p.group_id is not null and public.is_group_admin(p.group_id)
    )
  );

drop policy if exists community_comments_delete on public.community_comments;
create policy community_comments_delete on public.community_comments
  for delete to app_authenticated
  using (
    author_id = app.current_user_id()
    or public.is_admin()
    or exists (
      select 1 from public.community_posts p
       where p.id = community_comments.post_id and p.group_id is not null and public.is_group_admin(p.group_id)
    )
  );

-- 5. Reports reach the group's moderators too ----------------------------------------------
create or replace function public.report_is_moderated_by_me(p_type text, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin() or (
    case p_type
      when 'post' then exists (
        select 1 from public.community_posts p
         where p.id = p_target and p.group_id is not null and public.is_group_admin(p.group_id))
      when 'comment' then exists (
        select 1 from public.community_comments c
          join public.community_posts p on p.id = c.post_id
         where c.id = p_target and p.group_id is not null and public.is_group_admin(p.group_id))
      else false
    end
  );
$$;

revoke all on function public.report_is_moderated_by_me(text, uuid) from public;
grant execute on function public.report_is_moderated_by_me(text, uuid) to app_authenticated;

drop policy if exists community_reports_select on public.community_reports;
create policy community_reports_select on public.community_reports
  for select to app_authenticated
  using (reporter_id = app.current_user_id() or public.report_is_moderated_by_me(target_type, target_id));

drop policy if exists community_reports_update on public.community_reports;
create policy community_reports_update on public.community_reports
  for update to app_authenticated
  using (public.report_is_moderated_by_me(target_type, target_id))
  with check (public.report_is_moderated_by_me(target_type, target_id));

-- 6. Everyone involved is told ----------------------------------------------------------------
create or replace function public.notify_group_moderators(p_group uuid, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r record;
begin
  if p_group is null then
    for r in select id from public.profiles where role = 'admin' and account_status = 'active' loop
      perform public.notify_member(r.id, 'community', 'moderation_queue', p_title, p_body,
        '/portal/member/community/moderate', null, 'modq:club', '{}'::jsonb);
    end loop;
  else
    for r in
      select m.member_id as id from public.community_group_members m
       where m.group_id = p_group and m.role in ('owner', 'admin')
      union
      select id from public.profiles where role = 'admin' and account_status = 'active'
    loop
      perform public.notify_member(r.id, 'community', 'moderation_queue', p_title, p_body,
        '/portal/member/community/moderate', null, 'modq:' || p_group::text, '{}'::jsonb);
    end loop;
  end if;
end;
$$;

create or replace function public.notify_on_post_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_group text;
begin
  select g.name into v_group from public.community_groups g where g.id = new.group_id;
  if tg_op = 'INSERT' and new.status = 'held' and new.author_id is not null then
    perform public.notify_member(new.author_id, 'community', 'content_held',
      'Your post is waiting for a moderator', 'It will be visible to others once someone checks it.',
      '/portal/member/community/posts/' || new.id::text, null, 'held:' || new.id::text, '{}'::jsonb);
    perform public.notify_group_moderators(new.group_id, 'A post is waiting for review',
      coalesce('In ' || v_group, 'Club-wide post'));
  elsif tg_op = 'UPDATE' and new.author_id is not null and old.status <> new.status then
    if old.status = 'held' and new.status = 'active' then
      -- The "waiting" notice is answered: mark it read and say so in a row of
      -- its own (a shared group_key would fold this onto the old row and keep
      -- its type).
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

drop trigger if exists community_posts_moderation_notify on public.community_posts;
create trigger community_posts_moderation_notify
  after insert or update of status on public.community_posts
  for each row execute function public.notify_on_post_moderation();

create or replace function public.notify_on_comment_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_group uuid; v_name text;
begin
  select p.group_id, g.name into v_group, v_name
    from public.community_posts p left join public.community_groups g on g.id = p.group_id
   where p.id = new.post_id;
  if tg_op = 'INSERT' and new.status = 'held' then
    perform public.notify_member(new.author_id, 'community', 'content_held',
      'Your comment is waiting for a moderator', 'It will be visible to others once someone checks it.',
      '/portal/member/community/posts/' || new.post_id::text, null, 'heldc:' || new.id::text, '{}'::jsonb);
    perform public.notify_group_moderators(v_group, 'A comment is waiting for review',
      coalesce('In ' || v_name, 'Club-wide post'));
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if old.status = 'held' and new.status = 'active' then
      update public.in_app_notifications set is_read = true
       where user_id = new.author_id and group_key = 'heldc:' || new.id::text and is_read = false;
      perform public.notify_member(new.author_id, 'community', 'content_approved',
        'Your comment is live', 'A moderator approved it.',
        '/portal/member/community/posts/' || new.post_id::text, null, 'livec:' || new.id::text, '{}'::jsonb);
    elsif new.status = 'removed' and app.current_user_id() is distinct from new.author_id then
      perform public.notify_member(new.author_id, 'community', 'content_removed',
        'A moderator removed your comment', 'It did not fit the community guidelines.',
        '/portal/member/community/posts/' || new.post_id::text, null, 'removedc:' || new.id::text, '{}'::jsonb);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists community_comments_moderation_notify on public.community_comments;
create trigger community_comments_moderation_notify
  after insert or update of status on public.community_comments
  for each row execute function public.notify_on_comment_moderation();

-- A member's report also reaches the moderators of that group (club admins
-- were already told by notify_admin_queues, 0032).
create or replace function public.notify_group_moderators_on_report()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_group uuid;
begin
  if new.target_type = 'post' then
    select p.group_id into v_group from public.community_posts p where p.id = new.target_id;
  else
    select p.group_id into v_group from public.community_comments c join public.community_posts p on p.id = c.post_id where c.id = new.target_id;
  end if;
  if v_group is not null then
    perform public.notify_group_moderators(v_group, 'A member reported something in your group', left(new.reason, 120));
  end if;
  return new;
end;
$$;

drop trigger if exists community_reports_notify_group_admins on public.community_reports;
create trigger community_reports_notify_group_admins
  after insert on public.community_reports
  for each row execute function public.notify_group_moderators_on_report();
