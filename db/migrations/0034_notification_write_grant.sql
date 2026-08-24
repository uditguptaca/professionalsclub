-- ============================================================================
-- 0034 — Narrow the notification write grant to is_read
--
-- 0002 granted UPDATE on the whole table, so a member could rewrite the title,
-- body, link, category and group_key of their own notification rows. Only their
-- own, so this is not a route to anyone else's inbox, but it does let a member
-- edit group_key and break the collapse index, or rewrite a row's link.
--
-- The inbox only ever needs to flip one column. Same treatment 0017 gave
-- member_messages.read_at.
-- ============================================================================

revoke update on public.in_app_notifications from app_authenticated;
grant update (is_read) on public.in_app_notifications to app_authenticated;
