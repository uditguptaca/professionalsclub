import 'server-only';
import { withUser, withUserRead, type Db } from '@/server/db';

/**
 * Follows + the member chat hub.
 *
 * The social contract (owner's spec, 2026-08-26, Instagram-style — 0040):
 * follows are INSTANT, and anyone may message anyone. A thread someone opens
 * with you sits in your MESSAGE REQUESTS until you accept it, reply (which
 * accepts), or already follow them — then it is ordinary inbox. Declining
 * deletes the conversation. A block is the one thing that closes a chat.
 * Matrimony matches and referral requests still open their chats pre-accepted
 * (their consent happened elsewhere). All of it is enforced by the 0040
 * policies; checks in this file are conveniences.
 *
 * People lists come from member_names (names/titles/join dates only). The
 * insider directory (company_insider_directory) is the one place where
 * opting into referrals means being listed by name — a deliberate 0018
 * publishing decision.
 */

type FollowState = 'none' | 'pending' | 'accepted';

export interface ChatPerson {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  city: string | null;
  /** My edge toward them. 'pending' renders as "Requested". */
  outgoing: FollowState;
  /** Their edge toward me. */
  incoming: FollowState;
}

export interface ChatThread {
  id: string;
  partnerId: string;
  partnerFirstName: string;
  partnerLastName: string;
  partnerJobTitle: string | null;
  lastMessageAt: string;
  lastBody: string | null;
  lastKind: string | null;
  lastCipher: boolean;
  lastFromMe: boolean;
  unread: number;
  /** False only when a block stands between the two of you. */
  open: boolean;
  /**
   * True while this thread is a MESSAGE REQUEST for me: someone I don't
   * follow opened it and I have not accepted yet. Matrimony and referral
   * threads are never requests — their consent happened elsewhere.
   */
  request: boolean;
  muted: boolean;
  /** Why this chat exists; referral and matrimony outrank plain follows. */
  context: 'referral' | 'matrimony' | 'follow';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  kind: 'text' | 'image' | 'video' | 'file' | 'referral';
  body: string | null;
  cipher: string | null;
  iv: string | null;
  attachmentUrl: string | null;
  meta: Record<string, unknown> | null;
  replyTo: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface MessageReaction {
  messageId: string;
  memberId: string;
  emoji: string;
}

export interface ThreadReferral {
  id: string;
  seekerId: string;
  insiderId: string;
  companyName: string;
  jobTitles: string[];
  note: string | null;
  status: 'pending' | 'accepted' | 'declined';
}

export interface ThreadPoll {
  /** The whole thread when `since` was null, otherwise only what is newer. */
  messages: ChatMessage[];
  /**
   * Read receipts for the WHOLE thread, always. An id that is absent is
   * unread, so this stays authoritative even when the peer turns receipts off
   * — and it is two small columns per row rather than the message bodies.
   */
  receipts: { id: string; readAt: string }[];
  /**
   * Hand this straight back as the next poll's `since`. It trails the newest
   * message by a few seconds on purpose: a transaction can commit AFTER one
   * with a later timestamp, and a cursor sitting exactly on the newest row
   * would step over that message forever.
   */
  watermark: string | null;
  open: boolean;
  peerTypingAt: string | null;
  referrals: ThreadReferral[];
  reactions: MessageReaction[];
}

export interface CompanyInsiderEntry {
  memberId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  verifiedByAdmin: boolean;
  /** My existing request to this person at this company, if any. */
  requestStatus: 'pending' | 'accepted' | 'declined' | null;
}

export interface MyDirectReferral {
  id: string;
  insiderId: string;
  insiderFirstName: string;
  insiderLastName: string;
  companyName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  conversationId: string | null;
}

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : (v as string | null));

const toMessage = (r: Record<string, unknown>): ChatMessage => ({
  id: r.id as string,
  conversationId: r.conversation_id as string,
  senderId: r.sender_id as string,
  kind: (r.kind as ChatMessage['kind']) ?? 'text',
  body: (r.body as string | null) ?? null,
  cipher: (r.cipher as string | null) ?? null,
  iv: (r.iv as string | null) ?? null,
  attachmentUrl: (r.attachment_url as string | null) ?? null,
  meta: (r.meta as Record<string, unknown> | null) ?? null,
  replyTo: (r.reply_to as string | null) ?? null,
  readAt: iso(r.read_at),
  createdAt: iso(r.created_at) as string,
});

const toPerson = (r: Record<string, unknown>): ChatPerson => ({
  id: r.id as string,
  firstName: r.first_name as string,
  lastName: r.last_name as string,
  jobTitle: (r.job_title as string | null) ?? null,
  city: (r.city as string | null) ?? null,
  outgoing: ((r.outgoing as string | null) ?? 'none') as FollowState,
  incoming: ((r.incoming as string | null) ?? 'none') as FollowState,
});

// Attachments must come from our own storage; anything else is refused, the
// same rule matrimony media applies.
function assertOurUpload(url: string): void {
  const fromBlob = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[^\s]+$/i.test(url);
  const fromDev = /^\/uploads\/[a-z0-9]+\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|pdf|doc|docx)$/.test(url);
  if (!fromBlob && !fromDev) throw new Error('That upload was not recognised. Please try again.');
}

/**
 * SQL fragments shared between a page's single-statement read and the narrow
 * reads that still exist on their own.
 *
 * They are fragments rather than separate queries because the database is
 * remote: one round trip costs roughly half a second from a distant client,
 * and Next runs a client's Server Action calls one at a time. So what a page
 * waits for is (actions x queries per action) round trips - which is why every
 * "start" read below is ONE statement, not several sharing a transaction.
 */

/** Everyone visible to me, with my follow edges both ways. $1 = me. */
export const COMMUNITY_EDGES_CTE = `
  select n.id, n.first_name, n.last_name, n.job_title, n.city, n.created_at,
         (select f.status from public.member_follows f
           where f.follower_id = $1 and f.followee_id = n.id) as outgoing,
         (select f.status from public.member_follows f
           where f.follower_id = n.id and f.followee_id = $1) as incoming
    from public.member_names n
   where n.id <> $1
     and not public.is_blocked_between_members($1, n.id)
`;

/** The four people lanes, as one json object, over an `edges` CTE. */
export const COMMUNITY_PEOPLE_JSON = `
  json_build_object(
    'requests', (select coalesce(json_agg(t), '[]'::json) from (
      select * from edges where incoming = 'pending' order by created_at desc
    ) t),
    'suggestions', (select coalesce(json_agg(t), '[]'::json) from (
      select * from edges
       where outgoing is null and coalesce(incoming, '') <> 'pending'
       order by (lower(coalesce(city, '')) = lower(coalesce((select city from me), ''))) desc,
                created_at desc
       limit 20
    ) t),
    'following', (select coalesce(json_agg(t), '[]'::json) from (
      select * from edges where outgoing is not null order by created_at desc
    ) t),
    'followers', (select coalesce(json_agg(t), '[]'::json) from (
      select * from edges where incoming = 'accepted' order by created_at desc
    ) t)
  )
`;

/** One row per conversation I am in. $1 = me. */
const THREADS_SELECT = `
  select c.id,
         n.id as partner_id, n.first_name, n.last_name, n.job_title,
         c.last_message_at,
         public.is_chat_allowed(c.member_a_id, c.member_b_id) as open,
         -- A request FOR ME: they knocked, I haven't accepted, and I don't
         -- follow them. My own follow edge is visible under RLS, so no
         -- definer helper is needed here.
         (c.accepted_at is null
          and c.initiator_id is not null
          and c.initiator_id <> $1
          and not exists (select 1 from public.member_follows f
                           where f.follower_id = $1 and f.followee_id = c.initiator_id
                             and f.status = 'accepted')) as is_awaiting_me,
         coalesce(pf.muted, false) as muted,
         lm.body as last_body, lm.kind as last_kind,
         (lm.cipher is not null) as last_cipher,
         (lm.sender_id = $1) as last_from_me,
         (select count(*) from public.member_messages u
           where u.conversation_id = c.id and u.sender_id <> $1 and u.read_at is null
             and u.created_at > coalesce(pf.cleared_at, 'epoch'::timestamptz))::int as unread,
         exists (select 1 from public.referral_direct_requests r
                  where (r.seeker_id, r.insider_id) in ((c.member_a_id, c.member_b_id), (c.member_b_id, c.member_a_id))
                ) as is_referral,
         -- Definer helper, not an inline EXISTS: matrimony_profiles is
         -- self-only under RLS, so the peer's row is invisible here (0025).
         public.is_matrimony_match(c.member_a_id, c.member_b_id) as is_matrimony
    from public.member_conversations c
    join public.member_names n
      on n.id = case when c.member_a_id = $1 then c.member_b_id else c.member_a_id end
    left join public.member_chat_prefs pf
      on pf.conversation_id = c.id and pf.member_id = $1
    left join lateral (
      select body, cipher, kind, sender_id from public.member_messages m
       where m.conversation_id = c.id
         and m.created_at > coalesce(pf.cleared_at, 'epoch'::timestamptz)
       order by m.created_at desc limit 1
    ) lm on true
   where $1 in (c.member_a_id, c.member_b_id)
   order by c.last_message_at desc
`;

/** My blocked list. $1 = me. */
const BLOCKED_SELECT = `
  select n.id, n.first_name, n.last_name
    from public.member_blocks b
    join public.member_names n on n.id = b.blocked_id
   where b.blocker_id = $1
   order by b.created_at desc
`;

/** My chat settings as json, defaults applied. $1 = me. */
const SETTINGS_JSON = `
  json_build_object(
    'read_receipts', coalesce((select read_receipts from public.member_chat_settings where member_id = $1), true),
    'typing_indicator', coalesce((select typing_indicator from public.member_chat_settings where member_id = $1), true)
  )
`;

// ---- People & follow requests ------------------------------------------------

export interface ChatPeople {
  requests: ChatPerson[];
  suggestions: ChatPerson[];
  following: ChatPerson[];
  followers: ChatPerson[];
}

/**
 * The `…On(db, …)` helpers below are the query bodies without the transaction.
 * A page that needs several of them gets them inside ONE withUserRead - and so
 * inside one Server Action, which is the round trip that actually costs the
 * member time (Next runs a client's action calls one at a time).
 */
export async function peopleOn(db: Db, userId: string): Promise<ChatPeople> {
  const rows = await db.run<{ people: RawPeople }>(
    `with me as (select city from public.profiles where id = $1),
          edges as (${COMMUNITY_EDGES_CTE})
     select ${COMMUNITY_PEOPLE_JSON} as people`,
    [userId]
  );
  return toChatPeople(rows[0]?.people);
}

type RawPeople = Record<keyof ChatPeople, Record<string, unknown>[]> | null | undefined;

/** Exported so the community page can read the people rail in its own statement. */
export const toChatPeople = (raw: RawPeople): ChatPeople => ({
  requests: (raw?.requests ?? []).map(toPerson),
  suggestions: (raw?.suggestions ?? []).map(toPerson),
  following: (raw?.following ?? []).map(toPerson),
  followers: (raw?.followers ?? []).map(toPerson),
});

export async function listPeople(userId: string): Promise<ChatPeople> {
  return withUserRead(userId, (db) => peopleOn(db, userId));
}

/**
 * People search for the community People tab. Same directory view as the
 * lists (member_names: names, titles, join dates - no contact columns), with
 * my follow state on each row so the UI can render Follow / Requested /
 * Following without a second call.
 */
export async function searchPeople(userId: string, query: string): Promise<ChatPerson[]> {
  return withUserRead(userId, async (db) => {
    const q = query.trim().slice(0, 80);
    const rows = await db.run<Record<string, unknown>>(
      `
      with me as (select city from public.profiles where id = $1)
      select n.id, n.first_name, n.last_name, n.job_title, n.city,
             (select f.status from public.member_follows f
               where f.follower_id = $1 and f.followee_id = n.id) as outgoing,
             (select f.status from public.member_follows f
               where f.follower_id = n.id and f.followee_id = $1) as incoming
        from public.member_names n
       where n.id <> $1
         and not public.is_blocked_between_members($1, n.id)
         and ($2::text is null
              or n.first_name ilike $2 or n.last_name ilike $2
              or coalesce(n.job_title, '') ilike $2 or coalesce(n.city, '') ilike $2
              or (n.first_name || ' ' || n.last_name) ilike $2)
       order by (lower(coalesce(n.city, '')) = lower(coalesce((select city from me), ''))) desc,
                n.created_at desc
       limit 40
      `,
      [userId, q === '' ? null : `%${q}%`]
    );
    return rows.map(toPerson);
  });
}

/** Follow someone (idempotent). Instant — no request, no acceptance (0040). */
export async function follow(userId: string, targetId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `insert into public.member_follows (follower_id, followee_id)
       values ($1, $2) on conflict do nothing`,
      [userId, targetId]
    );
  });
}

export async function unfollow(userId: string, targetId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `delete from public.member_follows where follower_id = $1 and followee_id = $2`,
      [userId, targetId]
    );
  });
}

/** Accept someone's request to follow ME. RLS: only the followee can. */
export async function acceptFollow(userId: string, followerId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `update public.member_follows set status = 'accepted'
        where follower_id = $2 and followee_id = $1 and status = 'pending'`,
      [userId, followerId]
    );
  });
}

/** Decline a request — or remove an existing follower. Same delete. */
export async function declineFollow(userId: string, followerId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `delete from public.member_follows where follower_id = $2 and followee_id = $1`,
      [userId, followerId]
    );
  });
}

// ---- Chats -------------------------------------------------------------------

export async function chatsOn(db: Db, userId: string): Promise<ChatThread[]> {
  return (await db.run<Record<string, unknown>>(THREADS_SELECT, [userId])).map(toThread);
}

const toThread = (r: Record<string, unknown>): ChatThread => ({
  id: r.id as string,
  partnerId: r.partner_id as string,
  partnerFirstName: r.first_name as string,
  partnerLastName: r.last_name as string,
  partnerJobTitle: (r.job_title as string | null) ?? null,
  lastMessageAt: iso(r.last_message_at) as string,
  lastBody: (r.last_body as string | null) ?? null,
  lastKind: (r.last_kind as string | null) ?? null,
  lastCipher: Boolean(r.last_cipher),
  lastFromMe: Boolean(r.last_from_me),
  unread: Number(r.unread ?? 0),
  open: Boolean(r.open),
  // Preapproved contexts are never requests, whatever accepted_at says.
  request: Boolean(r.is_awaiting_me) && !r.is_referral && !r.is_matrimony,
  muted: Boolean(r.muted),
  context: r.is_referral ? 'referral' : r.is_matrimony ? 'matrimony' : 'follow',
});

export async function listChats(userId: string): Promise<ChatThread[]> {
  return withUserRead(userId, (db) => chatsOn(db, userId));
}

/**
 * Everything the chats page needs on first paint: the thread list, the people
 * sheet, the blocked list and the global chat settings.
 *
 * ONE statement. It was three actions in a Promise.all, and Next ran them one
 * after another - three round trips to a remote database before the list
 * appeared. Four statements sharing a transaction would have been no better:
 * a connection runs them in sequence too. Only collapsing the SQL removes the
 * waiting.
 */
export async function chatStart(userId: string): Promise<{
  threads: ChatThread[];
  people: ChatPeople;
  blocked: BlockedMember[];
  settings: ChatSettings;
}> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<{
      threads: Record<string, unknown>[] | null;
      people: RawPeople;
      blocked: Record<string, unknown>[] | null;
      settings: { read_receipts: boolean; typing_indicator: boolean };
    }>(
      `with me as (select city from public.profiles where id = $1),
            edges as (${COMMUNITY_EDGES_CTE})
       select
         (select coalesce(json_agg(t order by t.last_message_at desc), '[]'::json)
            from (${THREADS_SELECT}) t) as threads,
         ${COMMUNITY_PEOPLE_JSON} as people,
         (select coalesce(json_agg(t), '[]'::json) from (${BLOCKED_SELECT}) t) as blocked,
         ${SETTINGS_JSON} as settings`,
      [userId]
    );
    const row = rows[0];
    return {
      threads: (row?.threads ?? []).map(toThread),
      people: toChatPeople(row?.people),
      blocked: (row?.blocked ?? []).map(toBlocked),
      settings: {
        readReceipts: row?.settings?.read_receipts ?? true,
        typingIndicator: row?.settings?.typing_indicator ?? true,
      },
    };
  });
}

/** Get or create the conversation with someone. Only a block refuses. */
export async function openChat(userId: string, partnerId: string): Promise<string> {
  return withUser(userId, async (db) => {
    const [a, b] = [userId, partnerId].sort();
    try {
      const inserted = await db.run<{ id: string }>(
        `insert into public.member_conversations (member_a_id, member_b_id, initiator_id)
         values ($1, $2, $3) on conflict (member_a_id, member_b_id) do nothing returning id`,
        [a, b, userId]
      );
      if (inserted[0]) return inserted[0].id;
    } catch (err) {
      // A block, never announced as one.
      if ((err as { code?: string }).code === '42501') {
        throw new Error('This chat is not available.');
      }
      throw err;
    }
    const existing = await db.run<{ id: string }>(
      `select id from public.member_conversations where member_a_id = $1 and member_b_id = $2`,
      [a, b]
    );
    if (!existing[0]) throw new Error('This chat is not available.');
    return existing[0].id;
  });
}

/** Accept a message request: the thread moves from Requests to the inbox. */
export async function acceptChatRequest(userId: string, conversationId: string): Promise<void> {
  await withUser(userId, async (db) => {
    // RLS: only the non-initiator participant may stamp accepted_at.
    await db.run(
      `update public.member_conversations set accepted_at = now()
        where id = $1 and accepted_at is null`,
      [conversationId]
    );
  });
}

/** Decline a message request: the conversation and its messages are deleted. */
export async function declineChatRequest(userId: string, conversationId: string): Promise<void> {
  await withUser(userId, async (db) => {
    // RLS: only the recipient of an unaccepted request may delete.
    await db.run(
      `delete from public.member_conversations where id = $1`,
      [conversationId]
    );
  });
}

/**
 * One poll, everything the open thread needs: messages, whether it is still
 * open, the peer's typing signal, and any referral requests between the two
 * of you (so referral cards always show live status).
 *
 * `since` makes it incremental. Without it this re-sent every message body,
 * cipher and attachment in the conversation every five seconds — the single
 * heaviest repeating request the app makes. With it, an idle thread costs a
 * few hundred bytes. The parts that CHANGE without a new row (read receipts,
 * reactions, referral status, typing) are still sent in full each time, which
 * is why they are all narrow.
 */
export async function pollThread(
  userId: string,
  conversationId: string,
  since?: string | null
): Promise<ThreadPoll> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `
      with convo as (
        select *, case when member_a_id = $2 then member_b_id else member_a_id end as peer_id
          from public.member_conversations where id = $1
      ),
      prefs as (
        select coalesce((select cleared_at from public.member_chat_prefs
                          where conversation_id = $1 and member_id = $2), 'epoch'::timestamptz) as cleared_at
      ),
      -- WhatsApp symmetry: read receipts render only when BOTH sides leave
      -- them on; typing shows only if I have not turned the indicator off
      -- (a peer who turned theirs off never writes a heartbeat at all).
      vis as (
        select (public.chat_read_receipts_enabled($2)
                and public.chat_read_receipts_enabled((select peer_id from convo))) as receipts,
               coalesce((select typing_indicator from public.member_chat_settings
                          where member_id = $2), true) as typing
      )
      select
        (select coalesce(json_agg(t order by t.created_at), '[]'::json) from (
          select m.id, m.conversation_id, m.sender_id, m.kind, m.body, m.cipher, m.iv,
                 m.attachment_url, m.meta, m.reply_to, m.created_at,
                 case when m.sender_id = $2 and not (select receipts from vis)
                      then null else m.read_at end as read_at
            from public.member_messages m
           where m.conversation_id = $1
             and m.created_at > (select cleared_at from prefs)
             and ($3::timestamptz is null or m.created_at > $3::timestamptz)
        ) t) as messages,
        (select coalesce(json_agg(t), '[]'::json) from (
          select m.id, m.read_at
            from public.member_messages m
           where m.conversation_id = $1
             and m.created_at > (select cleared_at from prefs)
             and m.read_at is not null
             -- Same symmetry as above: whether THEY read MY message is only
             -- visible when both sides leave receipts on.
             and not (m.sender_id = $2 and not (select receipts from vis))
        ) t) as receipts,
        (select max(m.created_at) - interval '5 seconds'
           from public.member_messages m
          where m.conversation_id = $1
            and m.created_at > (select cleared_at from prefs)) as watermark,
        (select public.member_convo_is_open($1)) as open,
        (select case when (select typing from vis) then ty.typing_at end
           from public.member_chat_typing ty
          where ty.conversation_id = $1 and ty.member_id <> $2
          limit 1) as peer_typing_at,
        (select coalesce(json_agg(t), '[]'::json) from (
          select x.message_id, x.member_id, x.emoji
            from public.member_message_reactions x
            join public.member_messages mm on mm.id = x.message_id
           where mm.conversation_id = $1
        ) t) as reactions,
        (select coalesce(json_agg(t), '[]'::json) from (
          select r.id, r.seeker_id, r.insider_id, r.note, r.status,
                 co.name as company_name,
                 coalesce((select json_agg(j.title order by j.title)
                             from public.company_jobs j where j.id = any(r.job_ids)), '[]'::json) as job_titles
            from public.referral_direct_requests r
            join public.companies co on co.id = r.company_id
            join convo c on (r.seeker_id, r.insider_id) in ((c.member_a_id, c.member_b_id), (c.member_b_id, c.member_a_id))
        ) t) as referrals
      `,
      [conversationId, userId, since ?? null]
    );
    const row = rows[0] ?? {};
    return {
      messages: ((row.messages ?? []) as Record<string, unknown>[]).map(toMessage),
      receipts: ((row.receipts ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        readAt: iso(r.read_at) as string,
      })),
      watermark: iso(row.watermark),
      open: Boolean(row.open),
      peerTypingAt: iso(row.peer_typing_at),
      reactions: ((row.reactions ?? []) as Record<string, unknown>[]).map((r) => ({
        messageId: r.message_id as string,
        memberId: r.member_id as string,
        emoji: r.emoji as string,
      })),
      referrals: ((row.referrals ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        seekerId: r.seeker_id as string,
        insiderId: r.insider_id as string,
        companyName: r.company_name as string,
        jobTitles: (r.job_titles as string[]) ?? [],
        note: (r.note as string | null) ?? null,
        status: r.status as ThreadReferral['status'],
      })),
    };
  });
}

export async function sendChatMessage(
  userId: string,
  conversationId: string,
  content: {
    body?: string; cipher?: string; iv?: string;
    attachmentUrl?: string;
    attachmentKind?: 'image' | 'video' | 'file';
    /** For files: what to render before anyone downloads it. */
    fileMeta?: { name?: string; size?: number; mime?: string };
    /** Quote an earlier message from the SAME conversation. */
    replyTo?: string;
    /** Marks a message forwarded from another chat, WhatsApp-style. */
    forwarded?: boolean;
    /** File-preview thumbnail (first PDF page), uploaded like any image. */
    thumbUrl?: string;
  }
): Promise<ChatMessage> {
  return withUser(userId, async (db) => {
    const encrypted = Boolean(content.cipher && content.iv);
    const kind = content.attachmentUrl ? (content.attachmentKind ?? 'image') : 'text';
    if (!['text', 'image', 'video', 'file'].includes(kind)) throw new Error('Unknown message kind.');
    if (content.attachmentUrl) assertOurUpload(content.attachmentUrl);
    if (kind === 'text' && !encrypted && !content.body?.trim()) throw new Error('Message cannot be empty.');
    if (encrypted && content.body) throw new Error('A message is plaintext or ciphertext, never both.');
    if (encrypted && (content.cipher!.length > 20000 || content.iv!.length > 64)) {
      throw new Error('Message too long.');
    }

    if (content.thumbUrl) assertOurUpload(content.thumbUrl);
    const metaObj: Record<string, unknown> = {};
    if (kind === 'file' && content.fileMeta) {
      metaObj.name = String(content.fileMeta.name ?? 'Document').slice(0, 200);
      metaObj.size = Number(content.fileMeta.size ?? 0);
      metaObj.mime = String(content.fileMeta.mime ?? '').slice(0, 100);
    }
    if (content.forwarded) metaObj.forwarded = true;
    if (content.thumbUrl) metaObj.thumb = content.thumbUrl;
    const meta = Object.keys(metaObj).length ? JSON.stringify(metaObj) : null;

    // A reply may only point inside this same conversation - otherwise a
    // crafted id could quote-link across chats.
    let replyTo: string | null = null;
    if (content.replyTo) {
      const found = await db.run<{ id: string }>(
        `select id from public.member_messages where id = $1 and conversation_id = $2`,
        [content.replyTo, conversationId]
      );
      replyTo = found[0]?.id ?? null;
    }

    try {
      const rows = await db.run<Record<string, unknown>>(
        `insert into public.member_messages (conversation_id, sender_id, kind, body, cipher, iv, attachment_url, meta, reply_to)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9) returning *`,
        [
          conversationId, userId, kind,
          encrypted ? null : (content.body?.trim() || null),
          encrypted ? content.cipher! : null,
          encrypted ? content.iv! : null,
          content.attachmentUrl ?? null,
          meta,
          replyTo,
        ]
      );
      return toMessage(rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === '42501') {
        // A block, never announced as one.
        throw new Error('This chat is not available.');
      }
      throw err;
    }
  });
}

export async function markChatRead(userId: string, conversationId: string): Promise<void> {
  await withUser(userId, async (db) => {
    // Never stamp read_at on a request thread: a stranger must not see "seen"
    // before their request is accepted. The exists() mirrors is_awaiting_me in
    // THREADS_SELECT — accepted, mine, legacy, or from someone I follow.
    await db.run(
      `update public.member_messages set read_at = now()
        where conversation_id = $1 and sender_id <> $2 and read_at is null
          and exists (
            select 1 from public.member_conversations c
             where c.id = $1
               and (c.accepted_at is not null
                    or c.initiator_id is null
                    or c.initiator_id = $2
                    or exists (select 1 from public.member_follows f
                                where f.follower_id = $2 and f.followee_id = c.initiator_id
                                  and f.status = 'accepted'))
          )`,
      [conversationId, userId]
    );
    // The thread is open and read, so its inbox row has served its purpose.
    // Same group_key member_messages_notify collapses on (0032); clearing it
    // here is what stops the bell counting messages the member just read.
    await db.run(
      `update public.in_app_notifications set is_read = true
        where user_id = $1 and group_key = $2 and not is_read`,
      [userId, `chat:${conversationId}`]
    );
  });
}

/** Heartbeat while composing; the peer's poll turns it into "typing…". */
export async function setTyping(userId: string, conversationId: string): Promise<void> {
  await withUser(userId, async (db) => {
    const on = await db.run<{ on: boolean }>(
      `select coalesce((select typing_indicator from public.member_chat_settings
                         where member_id = $1), true) as on`,
      [userId]
    );
    if (!on[0]?.on) return;
    await db.run(
      `insert into public.member_chat_typing (conversation_id, member_id)
       values ($1, $2)
       on conflict (conversation_id, member_id) do update set typing_at = now()`,
      [conversationId, userId]
    );
  });
}

// ---- Direct referrals ----------------------------------------------------------

/** Who can refer at this company, by name, plus my standing request if any. */
/** The named insider directory for one company. $1 = me, $2 = the company. */
const INSIDERS_SELECT = `
  select d.member_id, d.first_name, d.last_name, d.job_title, d.verified_by_admin,
         (select r.status from public.referral_direct_requests r
           where r.seeker_id = $1 and r.insider_id = d.member_id and r.company_id = $2) as request_status
    from public.company_insider_directory d
   where d.company_id = $2 and d.member_id <> $1
   order by d.verified_by_admin desc, d.last_name
`;

const toInsider = (r: Record<string, unknown>): CompanyInsiderEntry => ({
  memberId: r.member_id as string,
  firstName: r.first_name as string,
  lastName: r.last_name as string,
  jobTitle: (r.job_title as string | null) ?? null,
  verifiedByAdmin: Boolean(r.verified_by_admin),
  requestStatus: (r.request_status as CompanyInsiderEntry['requestStatus']) ?? null,
});

export async function companyInsidersOn(
  db: Db,
  userId: string,
  companyId: string
): Promise<CompanyInsiderEntry[]> {
  return (await db.run<Record<string, unknown>>(INSIDERS_SELECT, [userId, companyId]))
    .map(toInsider);
}

/**
 * Ask a SPECIFIC person for a referral. Creates the request, opens (or finds)
 * the chat between the two of you, and drops the referral card into it.
 */
export async function requestReferral(
  userId: string,
  input: { insiderId: string; companyId: string; jobIds: string[]; note?: string }
): Promise<{ conversationId: string }> {
  return withUser(userId, async (db) => {
    const jobIds = (Array.isArray(input.jobIds) ? input.jobIds : [])
      .filter((v): v is string => typeof v === 'string')
      .slice(0, 20);
    const note = input.note?.trim().slice(0, 2000) || null;

    let requestId: string;
    try {
      const req = await db.run<{ id: string }>(
        `insert into public.referral_direct_requests (seeker_id, insider_id, company_id, job_ids, note)
         values ($1, $2, $3, $4::uuid[], $5) returning id`,
        [userId, input.insiderId, input.companyId, jobIds, note]
      );
      requestId = req[0].id;
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new Error('You already asked this person for a referral at this company.');
      }
      if ((err as { code?: string }).code === '42501') {
        throw new Error('That person is not taking referral requests right now.');
      }
      if (err instanceof Error && err.message.includes('weekly referral request limit')) {
        throw new Error('You have used both referral requests for this week.');
      }
      throw err;
    }

    const meta = await db.run<Record<string, unknown>>(
      `select co.name as company_name,
              coalesce((select json_agg(j.title order by j.title)
                          from public.company_jobs j where j.id = any($2::uuid[])), '[]'::json) as job_titles
         from public.companies co where co.id = $1`,
      [input.companyId, jobIds]
    );

    const [a, b] = [userId, input.insiderId].sort();
    // Pre-accepted: the referral card is the consent (is_preapproved_chat).
    // DO NOTHING + select, not DO UPDATE: since 0040 the caller's update
    // grant covers accepted_at only, so a conflicting DO UPDATE would 42501.
    const convo = await db.run<{ id: string }>(
      `insert into public.member_conversations (member_a_id, member_b_id, initiator_id, accepted_at)
       values ($1, $2, $3, now())
       on conflict (member_a_id, member_b_id) do nothing
       returning id`,
      [a, b, userId]
    );
    const conversationId = convo[0]?.id ?? (await db.run<{ id: string }>(
      `select id from public.member_conversations where member_a_id = $1 and member_b_id = $2`,
      [a, b]
    ))[0].id;

    await db.run(
      `insert into public.member_messages (conversation_id, sender_id, kind, meta)
       values ($1, $2, 'referral', $3::jsonb)`,
      [conversationId, userId, JSON.stringify({
        request_id: requestId,
        company_id: input.companyId,
        company_name: meta[0]?.company_name ?? '',
        job_titles: meta[0]?.job_titles ?? [],
        note,
      })]
    );

    // The insider hears about it: an in-app notification and a queued email.
    // Definer function, because it writes their notification row (0030).
    await db.run(`select public.notify_referral_request($1::uuid)`, [requestId]);

    return { conversationId };
  });
}

/** The insider's answer. Status lands on the card via pollThread. */
export async function respondReferral(userId: string, requestId: string, accept: boolean): Promise<void> {
  await withUser(userId, async (db) => {
    const rows = await db.run<{ id: string }>(
      `update public.referral_direct_requests
          set status = $3, responded_at = now()
        where id = $1 and insider_id = $2 and status = 'pending'
        returning id`,
      [requestId, userId, accept ? 'accepted' : 'declined']
    );
    if (!rows[0]) throw new Error('This request was already answered.');
    // Only an acceptance is pushed; a decline stays in the chat (0030).
    await db.run(`select public.notify_referral_response($1::uuid)`, [requestId]);
  });
}

export interface ReferralQuota {
  used: number;
  limit: number;
  /** When the oldest counted request ages out - i.e. when a slot frees up. */
  resetsAt: string | null;
}

/** The rolling 7-day allowance (2 requests, trigger-enforced in 0023). */
/** A slot frees up seven days after the oldest counted request. */
const quotaOf = (used: number, oldest: Date | string | null): ReferralQuota => ({
  used,
  limit: 2,
  resetsAt: used > 0 && oldest
    ? new Date(new Date(oldest).getTime() + 7 * 86400000).toISOString()
    : null,
});

export async function referralQuotaOn(db: Db, userId: string): Promise<ReferralQuota> {
  const rows = await db.run<{ used: string; oldest: Date | null }>(
    `select count(*) as used, min(created_at) as oldest
       from public.referral_direct_requests
      where seeker_id = $1 and created_at > now() - interval '7 days'`,
    [userId]
  );
  return quotaOf(Number(rows[0]?.used ?? 0), rows[0]?.oldest ?? null);
}

export async function referralQuota(userId: string): Promise<ReferralQuota> {
  return withUserRead(userId, (db) => referralQuotaOn(db, userId));
}

/**
 * The named insider directory for one company plus my remaining allowance -
 * step 3 of the jobs flow used to ask for them in two actions, which Next ran
 * back to back.
 */
export async function companyPeople(userId: string, companyId: string): Promise<{
  insiders: CompanyInsiderEntry[];
  quota: ReferralQuota;
}> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<{
      insiders: Record<string, unknown>[] | null;
      used: number;
      oldest: string | null;
    }>(
      `select
         (select coalesce(json_agg(t), '[]'::json) from (${INSIDERS_SELECT}) t) as insiders,
         (select count(*)::int from public.referral_direct_requests
           where seeker_id = $1 and created_at > now() - interval '7 days') as used,
         (select min(created_at) from public.referral_direct_requests
           where seeker_id = $1 and created_at > now() - interval '7 days') as oldest`,
      [userId, companyId]
    );
    const row = rows[0];
    return {
      insiders: (row?.insiders ?? []).map(toInsider),
      quota: quotaOf(Number(row?.used ?? 0), row?.oldest ?? null),
    };
  });
}

/** Requests I sent, for the referrals overview. */
export async function myDirectReferralsOn(db: Db, userId: string): Promise<MyDirectReferral[]> {
  const rows = await db.run<Record<string, unknown>>(
      `
      select r.id, r.insider_id, r.status, r.created_at,
             n.first_name, n.last_name, co.name as company_name,
             (select c.id from public.member_conversations c
               where (c.member_a_id, c.member_b_id) = (least(r.seeker_id, r.insider_id), greatest(r.seeker_id, r.insider_id))
             ) as conversation_id
        from public.referral_direct_requests r
        join public.companies co on co.id = r.company_id
        join public.member_names n on n.id = r.insider_id
       where r.seeker_id = $1
       order by r.created_at desc
      `,
      [userId]
    );
  return toMyDirectReferrals(rows);
}

/** Exported so the referrals screen can read these rows in its own statement. */
export const toMyDirectReferrals = (rows: Record<string, unknown>[]): MyDirectReferral[] =>
  rows.map((r) => ({
    id: r.id as string,
    insiderId: r.insider_id as string,
    insiderFirstName: r.first_name as string,
    insiderLastName: r.last_name as string,
    companyName: r.company_name as string,
    status: r.status as MyDirectReferral['status'],
    createdAt: iso(r.created_at) as string,
    conversationId: (r.conversation_id as string | null) ?? null,
  }));

export async function myDirectReferrals(userId: string): Promise<MyDirectReferral[]> {
  return withUserRead(userId, (db) => myDirectReferralsOn(db, userId));
}

/** One reaction per person per message; null emoji removes it. */
export async function reactToMessage(userId: string, messageId: string, emoji: string | null): Promise<void> {
  await withUser(userId, async (db) => {
    if (emoji === null) {
      await db.run(
        `delete from public.member_message_reactions where message_id = $1 and member_id = $2`,
        [messageId, userId]
      );
      return;
    }
    const clean = emoji.trim().slice(0, 16);
    if (!clean) throw new Error('Pick a reaction.');
    await db.run(
      `insert into public.member_message_reactions (message_id, member_id, emoji)
       values ($1, $2, $3)
       on conflict (message_id, member_id) do update set emoji = excluded.emoji, created_at = now()`,
      [messageId, userId, clean]
    );
  });
}

// ---- Blocks, reports, mute, clear, settings --------------------------------

export interface BlockedMember { id: string; firstName: string; lastName: string }

export interface ChatSettings { readReceipts: boolean; typingIndicator: boolean }

/** Block: freezes every chat with them, hides them from people lists, and is
    never announced to them. */
export async function blockMember(userId: string, targetId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `insert into public.member_blocks (blocker_id, blocked_id)
       values ($1, $2) on conflict do nothing`,
      [userId, targetId]
    );
  });
}

export async function unblockMember(userId: string, targetId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `delete from public.member_blocks where blocker_id = $1 and blocked_id = $2`,
      [userId, targetId]
    );
  });
}

export async function blockedOn(db: Db, userId: string): Promise<BlockedMember[]> {
  return (await db.run<Record<string, unknown>>(BLOCKED_SELECT, [userId])).map(toBlocked);
}

const toBlocked = (r: Record<string, unknown>): BlockedMember => ({
  id: r.id as string,
  firstName: r.first_name as string,
  lastName: r.last_name as string,
});

export async function listBlockedMembers(userId: string): Promise<BlockedMember[]> {
  return withUserRead(userId, (db) => blockedOn(db, userId));
}

export async function reportMember(
  userId: string,
  input: { reportedId: string; conversationId?: string; reason: string; details?: string }
): Promise<void> {
  await withUser(userId, async (db) => {
    const reason = input.reason.trim().slice(0, 100);
    if (!reason) throw new Error('Pick a reason.');
    await db.run(
      `insert into public.member_reports (reporter_id, reported_id, conversation_id, reason, details)
       values ($1, $2, $3, $4, $5)`,
      [userId, input.reportedId, input.conversationId ?? null, reason,
       input.details?.trim().slice(0, 2000) || null]
    );
  });
}

export async function muteChat(userId: string, conversationId: string, muted: boolean): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `insert into public.member_chat_prefs (conversation_id, member_id, muted)
       values ($1, $2, $3)
       on conflict (conversation_id, member_id) do update set muted = excluded.muted`,
      [conversationId, userId, muted]
    );
  });
}

/** Clear-for-me: everything up to now disappears from MY view only. */
export async function clearChat(userId: string, conversationId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `insert into public.member_chat_prefs (conversation_id, member_id, cleared_at)
       values ($1, $2, now())
       on conflict (conversation_id, member_id) do update set cleared_at = now()`,
      [conversationId, userId]
    );
  });
}

export async function settingsOn(db: Db, userId: string): Promise<ChatSettings> {
  const rows = await db.run<{ read_receipts: boolean; typing_indicator: boolean }>(
    `select read_receipts, typing_indicator from public.member_chat_settings where member_id = $1`,
    [userId]
  );
  return {
    readReceipts: rows[0]?.read_receipts ?? true,
    typingIndicator: rows[0]?.typing_indicator ?? true,
  };
}

export async function getChatSettings(userId: string): Promise<ChatSettings> {
  return withUserRead(userId, (db) => settingsOn(db, userId));
}

export async function updateChatSettings(
  userId: string,
  input: { readReceipts?: boolean; typingIndicator?: boolean }
): Promise<ChatSettings> {
  return withUser(userId, async (db) => {
    const rows = await db.run<{ read_receipts: boolean; typing_indicator: boolean }>(
      `insert into public.member_chat_settings (member_id, read_receipts, typing_indicator)
       values ($1, coalesce($2, true), coalesce($3, true))
       on conflict (member_id) do update set
         read_receipts    = coalesce($2, public.member_chat_settings.read_receipts),
         typing_indicator = coalesce($3, public.member_chat_settings.typing_indicator),
         updated_at = now()
       returning read_receipts, typing_indicator`,
      [userId, input.readReceipts ?? null, input.typingIndicator ?? null]
    );
    return { readReceipts: rows[0].read_receipts, typingIndicator: rows[0].typing_indicator };
  });
}

// ---- E2E keys (member-scoped; same device-key model as matrimony) ----------

export async function publishMemberE2EKey(userId: string, publicKeyJwk: string): Promise<void> {
  await withUser(userId, async (db) => {
    if (publicKeyJwk.length > 2000) throw new Error('Invalid key.');
    await db.run(
      `insert into public.member_e2e_keys (member_id, public_key_jwk)
       values ($1, $2)
       on conflict (member_id)
         do update set public_key_jwk = excluded.public_key_jwk, updated_at = now()`,
      [userId, publicKeyJwk]
    );
  });
}

export async function getMemberE2EKey(userId: string, memberId: string): Promise<string | null> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<{ public_key_jwk: string }>(
      `select public_key_jwk from public.member_e2e_keys where member_id = $1`,
      [memberId]
    );
    return rows[0]?.public_key_jwk ?? null;
  });
}
