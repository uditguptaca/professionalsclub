import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@/lib/auth/server';
import { withUser, withElevated, one } from '@/server/db';
import { toDomain } from '@/server/case';
import type { Member } from '@/types';

/**
 * Who the caller is.
 *
 * Two separate questions, deliberately kept apart:
 *   - Neon Auth answers "is this a valid session, and for which user id".
 *   - public.profiles answers "what may that user do", i.e. role and status.
 *
 * The role is never taken from the session or a token. Better Auth exposes a
 * user object the client can influence in places; profiles.role is writable only
 * by an admin, enforced by the guard_profile_privileges trigger.
 */

export type Session = { userId: string; email: string; name: string | null };

/**
 * `cache` dedupes within a single render pass, so a layout and the page beneath
 * it share one session lookup and one profile query instead of four.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  try {
    const { data } = await auth.getSession();
    if (!data?.user?.id) return null;

    return {
      userId: data.user.id,
      email: data.user.email ?? '',
      name: data.user.name ?? null,
    };
  } catch {
    // Reachable, despite what this used to claim. The SDK relays a Set-Cookie
    // whenever the auth service re-issues the session token, and writing a
    // cookie during an RSC render is forbidden, so that relay throws here.
    // Degrade to signed-out rather than crashing the page: portal routes are
    // still protected by the proxy redirect, by requireProfile() in the server
    // layouts, and by RLS underneath. The session-data TTL in
    // src/lib/auth/server.ts is what keeps this rare.
    return null;
  }
});

/**
 * Creates the profile row for an account that has none.
 *
 * The signup action normally creates it. This covers every other route in:
 * a social login, an account made in the Neon Console, or a signup that failed
 * partway. Runs elevated because the user has no insert policy on profiles —
 * create_profile is SECURITY DEFINER and cannot set role or account_status, so
 * the worst it can do is add a plain member row for an already-authenticated
 * user.
 */
async function ensureProfile(session: Session): Promise<void> {
  // A business account (0046) is an authenticated user with deliberately NO
  // profile row - that absence is what keeps it out of the member directory,
  // the chat and the matrimony pool. Back-filling one here would hand every
  // invited business owner a member account on their first login. The database
  // refuses it too (profiles_reject_business_account); this just avoids
  // throwing on a perfectly normal sign-in.
  if (await getBusinessUser()) return;

  const [firstName = '', ...rest] = (session.name ?? '').trim().split(/\s+/);

  await withElevated(async (db) => {
    await db`
      select public.create_profile(
        ${session.userId}::uuid,
        ${session.email},
        ${JSON.stringify({ first_name: firstName, last_name: rest.join(' ') })}::jsonb
      )
    `;
  });
}

/** A signed-in business owner: which business, and are they still enabled. */
export interface BusinessUser {
  userId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  verificationStatus: string;
  email: string;
  fullName: string;
}

/**
 * The business account for this session, if that is what this session is.
 *
 * Elevated for one reason: it is called on sessions that have no profile, and
 * the point of the lookup is to find out whether that is because they are a
 * business. It reads one row, keyed by the caller's own session id, and can
 * return nothing else.
 */
export const getBusinessUser = cache(async (): Promise<BusinessUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const row = await withElevated(async (db) =>
    one<Record<string, unknown>>(await db`
      select u.user_id, u.business_id, u.email, u.full_name,
             b.name as business_name, b.slug as business_slug,
             b.verification_status
        from public.business_users u
        join public.businesses b on b.id = u.business_id
       where u.user_id = ${session.userId}::uuid and u.status = 'active'
    `)
  );
  if (!row) return null;

  return {
    userId: row.user_id as string,
    businessId: row.business_id as string,
    businessName: row.business_name as string,
    businessSlug: row.business_slug as string,
    verificationStatus: row.verification_status as string,
    email: row.email as string,
    fullName: (row.full_name as string) ?? '',
  };
});

/** Requires a business owner session. Members are sent back to their own side. */
export async function requireBusinessUser(): Promise<BusinessUser> {
  const business = await getBusinessUser();
  if (business) return business;

  const profile = await getCurrentProfile();
  if (profile) redirect('/portal/member/dashboard');
  redirect('/portal/auth');
}

/** The business-owner equivalent of requireUserId(), for Server Actions. */
export async function requireBusinessUserId(): Promise<string> {
  const business = await getBusinessUser();
  if (!business) throw new Error('This is a business owner action.');
  return business.userId;
}

/**
 * Short-lived in-process profile cache.
 *
 * React's cache() dedupes within one render pass, but every Server Action
 * invocation is its own request — so before this cache, EVERY action paid a
 * full profile round trip to the database before doing its real work. With a
 * remote database that check alone costs three network round trips.
 *
 * A 30-second TTL is safe because this profile object is advisory UX state:
 * the authoritative role and account-status checks happen inside Postgres on
 * every query (is_admin() / is_active_member() in the RLS policies). A
 * suspended member with a stale cache entry still gets nothing back from the
 * database. Mutations that change the profile call invalidateProfileCache().
 */
const PROFILE_TTL_MS = 300_000;
const profileCache = new Map<string, { profile: Member; expires: number }>();

export function invalidateProfileCache(userId: string): void {
  profileCache.delete(userId);
}

export const getCurrentProfile = cache(async (): Promise<Member | null> => {
  const session = await getSession();
  if (!session) return null;

  const cached = profileCache.get(session.userId);
  if (cached && cached.expires > Date.now()) return cached.profile;

  const load = () =>
    withUser(session.userId, async (db) =>
      one(await db`select * from public.profiles where id = ${session.userId}::uuid`)
    );

  let row = await load();

  if (!row) {
    await ensureProfile(session);
    row = await load();
  }

  if (!row) return null;
  const profile = toDomain<Member>(row);
  profileCache.set(session.userId, { profile, expires: Date.now() + PROFILE_TTL_MS });
  return profile;
});

/** Requires a signed-in, active account. Redirects to login otherwise. */
export async function requireProfile(): Promise<Member> {
  const profile = await getCurrentProfile();

  if (!profile) {
    // A business owner is signed in perfectly well, just not as a member.
    // Sending them to the login screen they just came through reads as a
    // broken loop; send them to their own console instead.
    if (await getBusinessUser()) redirect('/portal/business');
    redirect('/portal/auth');
  }
  if (profile.accountStatus !== 'active') redirect('/portal/auth?error=account_inactive');

  return profile;
}

/** Requires an admin. Members are sent to their own dashboard, not a 403. */
export async function requireAdmin(): Promise<Member> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect('/portal/member/dashboard');
  return profile;
}

/**
 * The user id for a Server Action, or throw.
 *
 * Actions are public HTTP endpoints — being exported from a `'use server'` file
 * is not protection. Every action starts here.
 */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('Not signed in.');

  // Account status is enforced authoritatively in Postgres: every write policy
  // carries public.is_active_member() (0003/0005 from the start, and 0027 for
  // the social and chat tables that had missed it). This layer only turns that
  // into a clean message instead of a policy violation.
  //
  // A cache HIT is used as-is; a MISS loads the profile rather than assuming
  // the best. That order matters: suspending a member DELETES their cache
  // entry, so "miss means allow" made this check unreachable for exactly the
  // account it existed to stop.
  const cached = profileCache.get(session.userId);
  if (cached && cached.expires > Date.now()) {
    if (cached.profile.accountStatus !== 'active') throw new Error('This account is not active.');
    return session.userId;
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.accountStatus !== 'active') {
    throw new Error('This account is not active.');
  }
  return session.userId;
}

export async function requireAdminId(): Promise<string> {
  // Admin actions keep the explicit database check (cached up to five
  // minutes): unlike member reads, several admin mutations rely on this
  // throw for their error message, and admin traffic is a rounding error.
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Not signed in.');
  if (profile.accountStatus !== 'active') throw new Error('This account is not active.');
  if (profile.role !== 'admin') throw new Error('Administrator access required.');
  return profile.id;
}

/**
 * An admin, or an approved volunteer: the people who may add employers and
 * roles to the job board (0044).
 *
 * This mirrors public.can_curate_jobs() rather than replacing it. The database
 * policy is what actually decides - a volunteer's insert is stamped and pinned
 * by a guard trigger on the same connection - and this exists so a member who
 * finds the URL gets a sentence instead of a policy violation.
 */
export async function requireCuratorId(): Promise<string> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Not signed in.');
  if (profile.accountStatus !== 'active') throw new Error('This account is not active.');
  if (profile.role !== 'admin' && !profile.isVolunteer) {
    throw new Error('Only admins and volunteers can add jobs.');
  }
  return profile.id;
}

export const displayName = (profile: Pick<Member, 'firstName' | 'lastName' | 'email'>) =>
  `${profile.firstName} ${profile.lastName}`.trim() || profile.email;
