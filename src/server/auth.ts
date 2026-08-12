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
  const { data } = await auth.getSession();
  if (!data?.user?.id) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? '',
    name: data.user.name ?? null,
  };
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

export const getCurrentProfile = cache(async (): Promise<Member | null> => {
  const session = await getSession();
  if (!session) return null;

  const load = () =>
    withUser(session.userId, async (db) =>
      one(await db`select * from public.profiles where id = ${session.userId}::uuid`)
    );

  let row = await load();

  if (!row) {
    await ensureProfile(session);
    row = await load();
  }

  return row ? toDomain<Member>(row) : null;
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
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Not signed in.');
  if (profile.accountStatus !== 'active') throw new Error('This account is not active.');
  return profile.id;
}

export async function requireAdminId(): Promise<string> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Not signed in.');
  if (profile.accountStatus !== 'active') throw new Error('This account is not active.');
  if (profile.role !== 'admin') throw new Error('Administrator access required.');
  return profile.id;
}

export const displayName = (profile: Pick<Member, 'firstName' | 'lastName' | 'email'>) =>
  `${profile.firstName} ${profile.lastName}`.trim() || profile.email;
