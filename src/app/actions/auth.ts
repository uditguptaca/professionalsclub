'use server';

import { auth } from '@/lib/auth/server';
import { siteOrigin } from '@/server/origin';
import { allow, clientIp, TOO_MANY } from '@/server/rate-limit';
import { withElevated } from '@/server/db';
import { readAuthError, authErrorMessage } from '@/lib/auth/errors';

/**
 * Registration.
 *
 * Runs on the server so the account and its profile row are created in one
 * request. On Supabase this was a database trigger on auth.users; Neon Auth owns
 * its tables, so the equivalent step happens here instead.
 *
 * The profile payload is passed to public.create_profile(), which has no
 * parameter for role, account_status or verification_status. A crafted payload
 * therefore cannot register an admin — the columns are unreachable from this
 * path by construction, not by filtering.
 */

export type SignUpResult =
  | { ok: true; needsVerification: boolean }
  | { ok: false; error: string };

/**
 * Where the emailed verification link sends the user back to.
 *
 * Neon Auth verifies the token on its own server, then redirects here. Built
 * from the request's own origin so it works in dev, preview and production
 * without a per-environment setting.
 */
async function verifyCallbackUrl(): Promise<string> {
  // The configured site URL in production, never the request's Host header:
  // a forged header would put an attacker's domain in the victim's email.
  return `${await siteOrigin()}/portal/verify`;
}

/**
 * Re-sends the verification email.
 *
 * Deliberately reports success even for an address that is not registered.
 * Telling the caller "no such account" here would turn this into a way to test
 * which emails exist, and it is reachable without a session.
 */
export async function resendVerificationEmail(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const address = String(email ?? '').trim().toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  // Reachable without a session and it sends mail to any address: a few per
  // address per hour, a few dozen per caller.
  if (!allow('resend:addr', address, 3, 60 * 60_000) || !allow('resend:ip', await clientIp(), 30, 60 * 60_000)) {
    return { ok: false, error: TOO_MANY };
  }

  try {
    await auth.sendVerificationEmail({ email: address, callbackURL: await verifyCallbackUrl() });
  } catch (err) {
    console.error('[action] Resend verification failed:', err instanceof Error ? err.message : err);
  }

  return { ok: true };
}

/** Server-side validation. The client checks the same things for feedback only. */
function validate(email: string, password: string): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Enter a valid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 200) return 'Password is too long.';
  return null;
}

export async function signUpMember(input: {
  email: string;
  password: string;
  profile: Record<string, unknown>;
}): Promise<SignUpResult> {
  const email = String(input.email ?? '').trim().toLowerCase();
  if (!allow('signup:ip', await clientIp(), 10, 60 * 60_000)) return { ok: false, error: TOO_MANY };
  const password = String(input.password ?? '');

  const invalid = validate(email, password);
  if (invalid) return { ok: false, error: invalid };

  const firstName = String(input.profile?.first_name ?? '').trim();
  const lastName = String(input.profile?.last_name ?? '').trim();

  let data: unknown;

  try {
    const result = await auth.signUp.email({
      email,
      password,
      name: `${firstName} ${lastName}`.trim() || email,
      // Used only when the project requires email verification; harmless otherwise.
      callbackURL: await verifyCallbackUrl(),
    });

    // The client throws on API errors, but some paths resolve with { error }.
    if (result && typeof result === 'object' && 'error' in result && result.error) {
      throw result.error;
    }

    data = (result as { data?: unknown })?.data ?? result;
  } catch (thrown) {
    const failure = readAuthError(thrown);
    console.error('[action] Sign up failed:', failure.code, failure.message);
    // "already registered" is echoed back: the signup form is the one place a
    // user legitimately needs to know that, and it is discoverable anyway by
    // attempting to register.
    return { ok: false, error: authErrorMessage(failure, 'sign-up') };
  }

  try {

    const userId: string | null = (data as { user?: { id?: string } } | null)?.user?.id ?? null;

    if (userId) {
      // Elevated because the account has no session yet when email
      // verification is on, so there is no user context for RLS to work from.
      await withElevated(async (db) => {
        await db`
          select public.create_profile(
            ${userId}::uuid,
            ${email},
            ${JSON.stringify(input.profile ?? {})}::jsonb
          )
        `;
      });
    }

    // No session (or a null token) means the project requires email confirmation.
    const record = data as { session?: unknown; token?: unknown } | null;
    const hasSession = Boolean(record?.session) || Boolean(record?.token);

    return { ok: true, needsVerification: !hasSession };
  } catch (err) {
    // Two things land here. A genuine profile-write failure, which
    // ensureProfile() back-fills on first sign-in; and Neon Auth's answer to
    // an address that already has an account - a 200 with an invented user id
    // that the profiles FK then refuses. The caller gets the same answer either
    // way, so the form does not enumerate addresses; the confirmation screen's
    // wording is written for both cases.
    console.info('[action] Profile not created after signup (existing address or write failure):',
      err instanceof Error ? err.message : err);
    return { ok: true, needsVerification: true };
  }
}

/**
 * Permanent account deletion, required verbatim by Apple App Store Review
 * Guideline 5.1.1(v) and Google Play User Data policy: an account created in
 * the app must be deletable from inside the app.
 *
 * This is the second legitimate caller of withElevated() (the first creates
 * the profile at signup). Elevation is unavoidable here: the row that has to
 * die lives in neon_auth."user", a schema the RLS roles have no rights on.
 * The blast radius is bounded the same way as at signup — the id passed to
 * the statement is the caller's own session identity, never a parameter, so
 * the only account this endpoint can ever delete is the one calling it.
 *
 * ON DELETE CASCADE does the rest: neon_auth."user" -> public.profiles ->
 * every owned row (requests, applications, matrimony data, messages).
 * Assignment references are ON DELETE SET NULL, so nothing an admin is
 * working on dangles.
 */
export async function deleteOwnAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { requireUserId } = await import('@/server/auth');

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'You are not signed in.' };
  }

  try {
    const files = await withElevated(async (db) => {
      // The cascade removes the rows; the files they pointed at are ours to
      // remove too, and only knowable before the rows go.
      const photos = await db<{ url: string }>`
        select m.url from public.matrimony_media m
          join public.matrimony_profiles p on p.id = m.profile_id
         where p.user_id = ${userId}::uuid
      `;
      const posts = await db<{ media: { url?: string }[] | null }>`
        select media from public.community_posts where author_id = ${userId}::uuid
      `;
      await db`delete from neon_auth."user" where id = ${userId}::uuid`;
      return [
        ...photos.map((r) => r.url),
        ...posts.flatMap((r) => (Array.isArray(r.media) ? r.media : []).map((m) => m.url)),
      ];
    });
    const { deleteUploads } = await import('@/server/media');
    deleteUploads(files);
    const { invalidateProfileCache } = await import('@/server/auth');
    invalidateProfileCache(userId);
    return { ok: true };
  } catch (err) {
    console.error('[action] Account deletion failed:',
      err instanceof Error ? err.message : err);
    return { ok: false, error: 'Deletion failed. Contact support@professionalsclub.ca and we will remove the account manually.' };
  }
}

/**
 * Called by the portal shell just before sign-out: drop this instance's cached
 * profile so the next request for this account reloads it. Nothing to
 * authorise beyond "you are you".
 */
export async function forgetMe(): Promise<void> {
  const { requireUserId, invalidateProfileCache } = await import('@/server/auth');
  try {
    invalidateProfileCache(await requireUserId());
  } catch {
    // Already signed out: nothing cached to forget.
  }
}

/**
 * A password reset ends every session the account had. Neon's reset endpoint
 * rotates the credential but leaves existing sessions alive for their full
 * seven days, so an attacker already inside stays inside; this closes that.
 * Authenticated by the reset token itself (the same proof the reset uses),
 * checked against Neon Auth's own verification table; the deletion is the one
 * elevated write into neon_auth, and it touches only rows of the account the
 * token was issued for. Rate limited: it is public.
 */
export async function revokeSessionsForReset(token: string): Promise<{ ok: boolean }> {
  const { allow, clientIp } = await import('@/server/rate-limit');
  if (!(await allow('reset-revoke', await clientIp(), 10, 60 * 60_000))) return { ok: false };
  const raw = String(token ?? '').trim();
  if (!raw || raw.length > 200) return { ok: false };
  try {
    const rows = await withElevated(async (db) => db<{ id: string }>`
      delete from neon_auth.session s
       using neon_auth.verification v
       where v.identifier = ${'reset-password:' + raw}
         and v."expiresAt" > now()
         and s."userId"::text = v.value
      returning s.id
    `);
    return { ok: rows.length >= 0 };
  } catch (error) {
    console.error('[auth] session revoke on reset failed:', error instanceof Error ? error.message : error);
    return { ok: false };
  }
}
