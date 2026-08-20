-- ============================================================================
-- 0022 — Reply-to and reactions on chat messages
--
-- Reply: a message may point at an earlier message in the SAME conversation.
-- Only the id is stored — the quoted preview is rendered client-side from the
-- thread itself, so an end-to-end encrypted original never gets a plaintext
-- copy smuggled into the reply row.
--
-- Reactions: one per person per message (WhatsApp's rule), stored as the
-- emoji itself. Participants only.
-- ============================================================================

alter table public.member_messages
  add column if not exists reply_to uuid references public.member_messages(id) on delete set null;

create table if not exists public.member_message_reactions (
  message_id uuid not null references public.member_messages(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, member_id)
);

create index if not exists idx_member_reactions_message on public.member_message_reactions (message_id);

alter table public.member_message_reactions enable row level security;
grant select, insert, update, delete on public.member_message_reactions to app_authenticated;

drop policy if exists member_reactions_select on public.member_message_reactions;
create policy member_reactions_select on public.member_message_reactions
  for select to app_authenticated
  using (public.is_member_convo_participant(
    (select conversation_id from public.member_messages m where m.id = message_id)
  ));

drop policy if exists member_reactions_write on public.member_message_reactions;
create policy member_reactions_write on public.member_message_reactions
  for all to app_authenticated
  using (member_id = app.current_user_id())
  with check (
    member_id = app.current_user_id()
    and public.is_member_convo_participant(
      (select conversation_id from public.member_messages m where m.id = message_id)
    )
  );
