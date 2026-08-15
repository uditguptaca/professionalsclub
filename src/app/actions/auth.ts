'use server';

import { auth } from '@/lib/auth/server';
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
  const { headers } = await import('next/headers');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}/portal/verify`;
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
    // The account exists at this point but the profile write failed.
    // ensureProfile() back-fills it on first sign-in, so this is recoverable.
    console.error('[action] Profile creation after signup failed:',
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
    await withElevated(async (db) => {
      await db`delete from neon_auth."user" where id = ${userId}::uuid`;
    });
    const { invalidateProfileCache } = await import('@/server/auth');
    invalidateProfileCache(userId);
    return { ok: true };
  } catch (err) {
    console.error('[action] Account deletion failed:',
      err instanceof Error ? err.message : err);
    return { ok: false, error: 'Deletion failed. Contact support@professionalsclub.ca and we will remove the account manually.' };
  }
}
