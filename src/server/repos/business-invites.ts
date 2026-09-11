import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { withUser, withUserRead, withElevated, one } from '@/server/db';

/**
 * Business owner invitations.
 *
 * A business does not sign up. It applies through the public form, an admin
 * verifies it, and then an admin sends an invitation to one email address. That
 * invitation is the only way a business_users row is ever created, which is
 * what "invite only" means here: not a hidden signup page, an absent one.
 *
 * THE TOKEN. 32 random bytes, base64url, shown once in the email. The database
 * stores only its SHA-256, so a dump of business_invites is a list of hashes
 * rather than a set of working credentials. It expires, it is single use, and
 * an admin can revoke it before it is used.
 *
 * WHY ONE FUNCTION HERE IS ELEVATED. Accepting an invitation is done by someone
 * with no session at all - that is the point of the flow - so there is no
 * identity for RLS to work from and no policy that could let them read their
 * own invite. acceptInvite() is therefore the third counted elevated caller in
 * the app, alongside profile creation at signup and account deletion. Its blast
 * radius is the token: it can only ever act on the one invite whose hash
 * matches, it refuses an expired, revoked or already-used one, and it writes
 * exactly one business_users row for the account it was handed.
 */

const TOKEN_TTL_DAYS = 14;

const hashToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : ((v as string | null) ?? null);

export interface BusinessInvite {
  id: string;
  businessId: string;
  businessName: string;
  email: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
  /** What the row means right now, so the UI does not re-derive it three ways. */
  state: 'pending' | 'accepted' | 'revoked' | 'expired';
}

function toInvite(r: Record<string, unknown>): BusinessInvite {
  const acceptedAt = iso(r.accepted_at);
  const revokedAt = iso(r.revoked_at);
  const expiresAt = iso(r.expires_at);
  const expired = Boolean(expiresAt && Date.parse(expiresAt) < Date.now());
  return {
    id: r.id as string,
    businessId: r.business_id as string,
    businessName: (r.business_name as string) ?? '',
    email: r.email as string,
    expiresAt,
    acceptedAt,
    revokedAt,
    createdAt: iso(r.created_at),
    state: acceptedAt ? 'accepted' : revokedAt ? 'revoked' : expired ? 'expired' : 'pending',
  };
}

/** Every invitation, for the admin screen. RLS makes this admin-only. */
export async function listInvites(adminId: string): Promise<BusinessInvite[]> {
  return withUserRead(adminId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select i.*, b.name as business_name
         from public.business_invites i
         join public.businesses b on b.id = i.business_id
        order by i.created_at desc
        limit 200`,
      []
    );
    return rows.map(toInvite);
  });
}

/**
 * Invite one address to run one business. Returns the raw token exactly once -
 * it is never readable again, here or anywhere else.
 */
export async function createInvite(
  adminId: string,
  businessId: string,
  email: string,
  link: (token: string) => string
): Promise<{ token: string; invite: BusinessInvite }> {
  const address = String(email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new Error('Enter a valid email address.');

  const token = randomBytes(32).toString('base64url');

  return withUser(adminId, async (db) => {
    // One live invitation per address per business: re-inviting should replace
    // the old link, not leave two working ones.
    await db.run(
      `update public.business_invites
          set revoked_at = now()
        where business_id = $1 and lower(email) = $2
          and accepted_at is null and revoked_at is null`,
      [businessId, address]
    );

    const row = await one<Record<string, unknown>>(await db.run(
      `insert into public.business_invites (business_id, email, token_hash, invited_by, expires_at)
       values ($1, $2, $3, $4, now() + ($5 || ' days')::interval)
       returning *, (select name from public.businesses b where b.id = business_id) as business_name`,
      [businessId, address, hashToken(token), adminId, String(TOKEN_TTL_DAYS)]
    ));
    if (!row) throw new Error('Could not create the invitation.');

    // Same transaction as the invite row: an invitation that exists but was
    // never sent is a support ticket, and one that was sent but does not exist
    // is a dead link.
    await db.run(`select public.queue_business_invite($1, $2, $3)`,
      [address, (row.business_name as string) ?? '', link(token)]);

    return { token, invite: toInvite(row) };
  });
}

export async function revokeInvite(adminId: string, inviteId: string): Promise<void> {
  await withUser(adminId, async (db) => {
    const rows = await db.run(
      `update public.business_invites set revoked_at = now()
        where id = $1 and accepted_at is null
       returning id`,
      [inviteId]
    );
    if (rows.length === 0) throw new Error('That invitation has already been used or revoked.');
  });
}

export interface InviteTarget {
  businessId: string;
  businessName: string;
  email: string;
}

/**
 * What the acceptance page shows before anyone types a password: which business
 * this link is for, and which address it was sent to.
 *
 * Elevated, and deliberately vague on failure - a wrong token gets "this
 * invitation is not valid any more" whether it never existed, expired or was
 * used, because distinguishing those is free information about other people's
 * invitations.
 */
export async function lookupInvite(token: string): Promise<InviteTarget | null> {
  const raw = String(token ?? '');
  if (raw.length < 20) return null;

  return withElevated(async (db) => {
    const row = await one<Record<string, unknown>>(await db`
      select i.business_id, i.email, b.name as business_name
        from public.business_invites i
        join public.businesses b on b.id = i.business_id
       where i.token_hash = ${hashToken(raw)}
         and i.accepted_at is null
         and i.revoked_at is null
         and i.expires_at > now()
    `);
    if (!row) return null;
    return {
      businessId: row.business_id as string,
      businessName: row.business_name as string,
      email: row.email as string,
    };
  });
}

/**
 * Turn an accepted invitation into a business account.
 *
 * Called with the id of an auth account that was just created for this
 * invitation's address. The UPDATE is the lock: it only matches an invitation
 * that is still unaccepted, unrevoked and unexpired, so two tabs racing the same
 * link produce one account and one failure rather than two accounts.
 */
export async function acceptInvite(
  token: string,
  userId: string,
  fullName: string
): Promise<{ businessId: string }> {
  const hash = hashToken(String(token ?? ''));

  return withElevated(async (db) => {
    const claimed = await one<Record<string, unknown>>(await db`
      update public.business_invites
         set accepted_at = now(), accepted_user_id = ${userId}::uuid
       where token_hash = ${hash}
         and accepted_at is null
         and revoked_at is null
         and expires_at > now()
      returning business_id, email, invited_by
    `);
    if (!claimed) throw new Error('This invitation is not valid any more. Ask the club for a new one.');

    await db`
      insert into public.business_users (user_id, business_id, email, full_name, invited_by)
      values (
        ${userId}::uuid,
        ${claimed.business_id as string}::uuid,
        ${claimed.email as string},
        ${fullName.trim()},
        ${(claimed.invited_by as string | null) ?? null}::uuid
      )
      on conflict (user_id) do update
        set business_id = excluded.business_id, status = 'active'
    `;

    // The address is already proven: the club sent a single-use token to it and
    // this request arrived holding that token. Asking the owner to go and click
    // a second link in a second email to prove the same thing is a step that
    // only loses people - and until it is done the account cannot sign in at
    // all, which turns "your login is ready" into a dead end.
    await db`
      update neon_auth."user" set "emailVerified" = true where id = ${userId}::uuid
    `;

    return { businessId: claimed.business_id as string };
  });
}

/** Turn a business login off (or back on). Admin only, enforced by policy. */
export async function setBusinessUserStatus(
  adminId: string,
  userId: string,
  status: 'active' | 'disabled'
): Promise<void> {
  await withUser(adminId, async (db) => {
    const rows = await db.run(
      `update public.business_users set status = $2 where user_id = $1 returning user_id`,
      [userId, status]
    );
    if (rows.length === 0) throw new Error('No such business login.');
  });
}

export interface BusinessLogin {
  userId: string;
  businessId: string;
  businessName: string;
  email: string;
  fullName: string;
  status: string;
  lastSeenAt: string | null;
  createdAt: string | null;
}

export async function listBusinessLogins(adminId: string): Promise<BusinessLogin[]> {
  return withUserRead(adminId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select u.*, b.name as business_name
         from public.business_users u
         join public.businesses b on b.id = u.business_id
        order by u.created_at desc`,
      []
    );
    return rows.map((r) => ({
      userId: r.user_id as string,
      businessId: r.business_id as string,
      businessName: (r.business_name as string) ?? '',
      email: r.email as string,
      fullName: (r.full_name as string) ?? '',
      status: r.status as string,
      lastSeenAt: iso(r.last_seen_at),
      createdAt: iso(r.created_at),
    }));
  });
}
