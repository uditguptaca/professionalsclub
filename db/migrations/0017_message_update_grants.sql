-- ============================================================================
-- 0017 — Tighten message UPDATE to the read_at column only
--
-- Both message tables allow the RECIPIENT to update (for read receipts). The
-- table-wide UPDATE grant technically let a recipient rewrite the body of a
-- message someone sent them. Column-level grants close that: read_at is the
-- only writable column through this path.
-- ============================================================================

revoke update on public.matrimony_messages from app_authenticated;
grant update (read_at) on public.matrimony_messages to app_authenticated;

revoke update on public.member_messages from app_authenticated;
grant update (read_at) on public.member_messages to app_authenticated;
