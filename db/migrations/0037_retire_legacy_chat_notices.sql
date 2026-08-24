-- ============================================================================
-- 0037 — Mark the pre-hub chat notices read
--
-- The four 'message_received' rows 0035 filed under 'chat' were written by the
-- retired matrimony-messaging trigger. They carry no group_key, because
-- collapse did not exist yet, and that makes them unclearable by the obvious
-- action: opening the chat clears rows keyed 'chat:<conversation>', and these
-- have no key to match. They would pin the Chats badge at 2 permanently.
--
-- They are five days old and point at a route that now redirects into the chat
-- hub, so the member has long since seen whatever they were about. Marked read,
-- not deleted: the row stays in history where it belongs.
-- ============================================================================

update public.in_app_notifications
   set is_read = true
 where category = 'chat' and type = 'message_received' and group_key is null;
