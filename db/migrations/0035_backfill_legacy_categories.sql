-- ============================================================================
-- 0035 — File the last uncategorised notifications
--
-- 0031's backfill caught referral% and matrimony% types but not
-- 'message_received', the old matrimony-messaging notification. Those rows sat
-- in 'general', which no filter pill covers, so they showed under "All" as
-- "Updates" and could not be filtered to. Their link still resolves (the
-- matrimony messages route redirects into the chat hub since 0018), so they are
-- worth keeping — they just needed a shelf.
-- ============================================================================

update public.in_app_notifications
   set category = 'chat'
 where category = 'general' and type = 'message_received';

-- Anything still unfiled is genuinely miscellaneous; 'general' is not a
-- category the inbox filters by, so surface those as chat-adjacent news only
-- when we know what they were. Leave the rest alone rather than guess.
