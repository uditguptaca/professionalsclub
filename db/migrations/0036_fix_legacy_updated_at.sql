-- ============================================================================
-- 0036 — Give the pre-existing notifications their real timestamps back
--
-- 0031 added updated_at with `default now()`, which stamped every row that
-- already existed with the migration's own clock. The inbox sorts and dates by
-- updated_at (so a collapsed row rises when it collects a new event), so a
-- notification from five days ago rendered as "24m". Every row in the inbox
-- claimed to be minutes old.
--
-- A row written since 0031 has updated_at set explicitly by notify_member, and
-- a row that has actually collapsed carries event_count > 1. So the rows to
-- repair are exactly: never collapsed, and updated_at drifted past created_at.
-- ============================================================================

update public.in_app_notifications
   set updated_at = created_at
 where event_count = 1
   and updated_at > created_at + interval '1 second';
