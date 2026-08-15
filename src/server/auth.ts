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
    // A stale session-data cache makes the SDK refresh it, which writes a
    // cookie — forbidden during RSC render, so it throws. The proxy keeps the
    // cache fresh on every page request, so this path should never run; if it
    // does, degrade to signed-out instead of crashing the whole page. Portal
    // routes are still protected by the proxy redirect and by RLS.
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

  if (!profile) redirect('/portal/auth');
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

  // No database round trip here on purpose. The session cookie (verified
  // locally) proves identity; account status and every permission are
  // enforced authoritatively inside Postgres by the RLS policies on the very
  // query this action is about to run — a suspended account gets nothing
  // back regardless of what this function believes. The cached profile is
  // only consulted to fail fast with a friendlier message when we already
  // know the account is inactive.
  const cached = profileCache.get(session.userId);
  if (cached && cached.expires > Date.now() && cached.profile.accountStatus !== 'active') {
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

export const displayName = (profile: Pick<Member, 'firstName' | 'lastName' | 'email'>) =>
  `${profile.firstName} ${profile.lastName}`.trim() || profile.email;
