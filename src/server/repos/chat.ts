import 'server-only';
import { withUser, withUserRead } from '@/server/db';

/**
 * Follows + the member chat hub.
 *
 * The social contract (owner's spec, 2026-08-21): follows are REQUESTS — they
 * sit pending until accepted. A chat exists between two people when RLS's
 * is_chat_allowed() says so: mutual accepted follows, OR a matrimony match,
 * OR a direct referral request between them. Everything here is enforced
 * again by the 0016/0018 policies; checks in this file are conveniences.
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
  /** False once no unlock rule holds any more — the thread is frozen. */
  open: boolean;
  /** Why this chat exists; referral and matrimony outrank plain follows. */
  context: 'referral' | 'matrimony' | 'follow';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  kind: 'text' | 'image' | 'referral';
  body: string | null;
  cipher: string | null;
  iv: string | null;
  attachmentUrl: string | null;
  meta: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
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
  messages: ChatMessage[];
  open: boolean;
  peerTypingAt: string | null;
  referrals: ThreadReferral[];
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
  const fromDev = /^\/uploads\/[a-z0-9]+\.(jpg|jpeg|png|webp|gif)$/.test(url);
  if (!fromBlob && !fromDev) throw new Error('That upload was not recognised. Please try again.');
}

// ---- People & follow requests ------------------------------------------------

export async function listPeople(userId: string): Promise<{
  requests: ChatPerson[];
  suggestions: ChatPerson[];
  following: ChatPerson[];
  followers: ChatPerson[];
}> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `
      with me as (select city from public.profiles where id = $1),
      edges as (
        select n.id, n.first_name, n.last_name, n.job_title, n.city, n.created_at,
               (select f.status from public.member_follows f
                 where f.follower_id = $1 and f.followee_id = n.id) as outgoing,
               (select f.status from public.member_follows f
                 where f.follower_id = n.id and f.followee_id = $1) as incoming
          from public.member_names n
         where n.id <> $1
      )
      select
        (select coalesce(json_agg(t), '[]'::json) from (
          select * from edges where incoming = 'pending' order by created_at desc
        ) t) as requests,
        (select coalesce(json_agg(t), '[]'::json) from (
          select * from edges
           where outgoing is null and coalesce(incoming, '') <> 'pending'
           order by (lower(coalesce(city, '')) = lower(coalesce((select city from me), ''))) desc,
                    created_at desc
           limit 20
        ) t) as suggestions,
        (select coalesce(json_agg(t), '[]'::json) from (
          select * from edges where outgoing is not null order by created_at desc
        ) t) as following,
        (select coalesce(json_agg(t), '[]'::json) from (
          select * from edges where incoming = 'accepted' order by created_at desc
        ) t) as followers
      `,
      [userId]
    );
    const row = rows[0] ?? {};
    const arr = (v: unknown) => ((v ?? []) as Record<string, unknown>[]).map(toPerson);
    return {
      requests: arr(row.requests),
      suggestions: arr(row.suggestions),
      following: arr(row.following),
      followers: arr(row.followers),
    };
  });
}

/** Send a follow request (idempotent). It stays pending until accepted. */
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

export async function listChats(userId: string): Promise<ChatThread[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `
      select c.id,
             n.id as partner_id, n.first_name, n.last_name, n.job_title,
             c.last_message_at,
             public.is_chat_allowed(c.member_a_id, c.member_b_id) as open,
             lm.body as last_body, lm.kind as last_kind,
             (lm.cipher is not null) as last_cipher,
             (lm.sender_id = $1) as last_from_me,
             (select count(*) from public.member_messages u
               where u.conversation_id = c.id and u.sender_id <> $1 and u.read_at is null)::int as unread,
             exists (select 1 from public.referral_direct_requests r
                      where (r.seeker_id, r.insider_id) in ((c.member_a_id, c.member_b_id), (c.member_b_id, c.member_a_id))
                    ) as is_referral,
             exists (select 1 from public.matrimony_profiles pa
                       join public.matrimony_profiles pb on pb.user_id = c.member_b_id
                      where pa.user_id = c.member_a_id
                        and public.has_accepted_interest(pa.id, pb.id)
                    ) as is_matrimony
        from public.member_conversations c
        join public.member_names n
          on n.id = case when c.member_a_id = $1 then c.member_b_id else c.member_a_id end
        left join lateral (
          select body, cipher, kind, sender_id from public.member_messages m
           where m.conversation_id = c.id
           order by m.created_at desc limit 1
        ) lm on true
       where $1 in (c.member_a_id, c.member_b_id)
       order by c.last_message_at desc
      `,
      [userId]
    );
    return rows.map((r) => ({
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
      context: r.is_referral ? 'referral' : r.is_matrimony ? 'matrimony' : 'follow',
    }));
  });
}

/** Get or create the conversation with someone chat is allowed with. */
export async function openChat(userId: string, partnerId: string): Promise<string> {
  return withUser(userId, async (db) => {
    const [a, b] = [userId, partnerId].sort();
    const inserted = await db.run<{ id: string }>(
      `insert into public.member_conversations (member_a_id, member_b_id)
       values ($1, $2) on conflict (member_a_id, member_b_id) do nothing returning id`,
      [a, b]
    );
    if (inserted[0]) return inserted[0].id;
    const existing = await db.run<{ id: string }>(
      `select id from public.member_conversations where member_a_id = $1 and member_b_id = $2`,
      [a, b]
    );
    if (!existing[0]) throw new Error('You can chat once you both follow each other.');
    return existing[0].id;
  });
}

/**
 * One poll, everything the open thread needs: messages, whether it is still
 * open, the peer's typing signal, and any referral requests between the two
 * of you (so referral cards always show live status).
 */
export async function pollThread(userId: string, conversationId: string): Promise<ThreadPoll> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `
      with convo as (
        select * from public.member_conversations where id = $1
      )
      select
        (select coalesce(json_agg(t order by t.created_at), '[]'::json) from (
          select * from public.member_messages where conversation_id = $1
        ) t) as messages,
        (select public.member_convo_is_open($1)) as open,
        (select ty.typing_at from public.member_chat_typing ty
          where ty.conversation_id = $1 and ty.member_id <> $2
          limit 1) as peer_typing_at,
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
      [conversationId, userId]
    );
    const row = rows[0] ?? {};
    return {
      messages: ((row.messages ?? []) as Record<string, unknown>[]).map(toMessage),
      open: Boolean(row.open),
      peerTypingAt: iso(row.peer_typing_at),
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
  content: { body?: string; cipher?: string; iv?: string; attachmentUrl?: string }
): Promise<ChatMessage> {
  return withUser(userId, async (db) => {
    const encrypted = Boolean(content.cipher && content.iv);
    const kind = content.attachmentUrl ? 'image' : 'text';
    if (content.attachmentUrl) assertOurUpload(content.attachmentUrl);
    if (kind === 'text' && !encrypted && !content.body?.trim()) throw new Error('Message cannot be empty.');
    if (encrypted && content.body) throw new Error('A message is plaintext or ciphertext, never both.');
    if (encrypted && (content.cipher!.length > 20000 || content.iv!.length > 64)) {
      throw new Error('Message too long.');
    }

    try {
      const rows = await db.run<Record<string, unknown>>(
        `insert into public.member_messages (conversation_id, sender_id, kind, body, cipher, iv, attachment_url)
         values ($1, $2, $3, $4, $5, $6, $7) returning *`,
        [
          conversationId, userId, kind,
          encrypted ? null : (content.body?.trim() || null),
          encrypted ? content.cipher! : null,
          encrypted ? content.iv! : null,
          content.attachmentUrl ?? null,
        ]
      );
      return toMessage(rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === '42501') {
        throw new Error('You can only chat while you follow each other.');
      }
      throw err;
    }
  });
}

export async function markChatRead(userId: string, conversationId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db.run(
      `update public.member_messages set read_at = now()
        where conversation_id = $1 and sender_id <> $2 and read_at is null`,
      [conversationId, userId]
    );
  });
}

/** Heartbeat while composing; the peer's poll turns it into "typing…". */
export async function setTyping(userId: string, conversationId: string): Promise<void> {
  await withUser(userId, async (db) => {
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
export async function listCompanyInsiders(userId: string, companyId: string): Promise<CompanyInsiderEntry[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `
      select d.member_id, d.first_name, d.last_name, d.job_title, d.verified_by_admin,
             (select r.status from public.referral_direct_requests r
               where r.seeker_id = $1 and r.insider_id = d.member_id and r.company_id = $2) as request_status
        from public.company_insider_directory d
       where d.company_id = $2 and d.member_id <> $1
       order by d.verified_by_admin desc, d.last_name
      `,
      [userId, companyId]
    );
    return rows.map((r) => ({
      memberId: r.member_id as string,
      firstName: r.first_name as string,
      lastName: r.last_name as string,
      jobTitle: (r.job_title as string | null) ?? null,
      verifiedByAdmin: Boolean(r.verified_by_admin),
      requestStatus: (r.request_status as CompanyInsiderEntry['requestStatus']) ?? null,
    }));
  });
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
    const convo = await db.run<{ id: string }>(
      `insert into public.member_conversations (member_a_id, member_b_id)
       values ($1, $2)
       on conflict (member_a_id, member_b_id)
         do update set last_message_at = public.member_conversations.last_message_at
       returning id`,
      [a, b]
    );
    const conversationId = convo[0].id;

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
  });
}

/** Requests I sent, for the referrals overview. */
export async function myDirectReferrals(userId: string): Promise<MyDirectReferral[]> {
  return withUserRead(userId, async (db) => {
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
    return rows.map((r) => ({
      id: r.id as string,
      insiderId: r.insider_id as string,
      insiderFirstName: r.first_name as string,
      insiderLastName: r.last_name as string,
      companyName: r.company_name as string,
      status: r.status as MyDirectReferral['status'],
      createdAt: iso(r.created_at) as string,
      conversationId: (r.conversation_id as string | null) ?? null,
    }));
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
