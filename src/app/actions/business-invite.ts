'use server';

import { auth } from '@/lib/auth/server';
import { readAuthError, authErrorMessage } from '@/lib/auth/errors';
import { lookupInvite, acceptInvite } from '@/server/repos/business-invites';

/**
 * Accepting a business invitation: the one way a business login is created.
 *
 * There is no sign-up form for businesses anywhere in this app. A business
 * applies through the public listing form, an admin verifies it and sends an
 * invitation, and this action turns that invitation into an account.
 *
 * THE ORDER MATTERS. The auth account is created first, then the business_users
 * row is written in the same request, before anything renders. That matters
 * because the app back-fills a member profile for any session that has none: if
 * a page rendered in between, the new owner would quietly become a member. The
 * database refuses that too (profiles_reject_business_account), so the worst a
 * race could do is fail loudly rather than leak the member directory.
 *
 * The email address is NOT taken from the form. It comes from the invitation,
 * so a stolen link cannot be redirected to a different address, and someone who
 * guesses a token still cannot choose who the account belongs to.
 */

export type InviteState =
  | { ok: true; businessName: string; email: string }
  | { ok: false; error: string };

export async function inspectInviteAction(token: string): Promise<InviteState> {
  const target = await lookupInvite(token);
  if (!target) {
    return { ok: false, error: 'This invitation is not valid any more. Ask the club for a new link.' };
  }
  return { ok: true, businessName: target.businessName, email: target.email };
}

export async function acceptInviteAction(input: {
  token: string;
  password: string;
  fullName: string;
}): Promise<{ ok: true; signedIn: boolean } | { ok: false; error: string }> {
  const token = String(input.token ?? '');
  const password = String(input.password ?? '');
  const fullName = String(input.fullName ?? '').trim();

  if (password.length < 8) return { ok: false, error: 'Use at least 8 characters for the password.' };
  if (password.length > 200) return { ok: false, error: 'That password is too long.' };
  if (fullName.length < 2) return { ok: false, error: 'Tell us who you are.' };

  const target = await lookupInvite(token);
  if (!target) {
    return { ok: false, error: 'This invitation is not valid any more. Ask the club for a new link.' };
  }

  let userId: string | null = null;
  try {
    const result = await auth.signUp.email({
      email: target.email,
      password,
      name: fullName,
    });
    if (result && typeof result === 'object' && 'error' in result && result.error) throw result.error;
    const data = (result as { data?: unknown })?.data ?? result;
    userId = (data as { user?: { id?: string } } | null)?.user?.id ?? null;
  } catch (thrown) {
    const failure = readAuthError(thrown);
    console.error('[business-invite] account creation failed:', failure.code, failure.message);
    // The common case is an address that already has a member account. Say so:
    // the admin has to invite a different address, and a vague error would send
    // them round the houses.
    return { ok: false, error: authErrorMessage(failure, 'sign-up') };
  }

  if (!userId) return { ok: false, error: 'Could not create the login. Please try again.' };

  try {
    await acceptInvite(token, userId, fullName);
  } catch (error) {
    console.error('[business-invite] linking failed:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not finish setting up the login.',
    };
  }

  // Sign them straight in. Sign-up alone does not leave a usable session here
  // (the account is only marked verified a moment ago, inside acceptInvite),
  // and finishing on a login form asking for the password just typed is a poor
  // way to meet somebody. If it fails, the account is still fine - the page
  // sends them to the sign-in screen instead of pretending otherwise.
  try {
    await auth.signIn.email({ email: target.email, password });
    return { ok: true, signedIn: true };
  } catch (thrown) {
    console.error('[business-invite] auto sign-in failed:', readAuthError(thrown).code);
    return { ok: true, signedIn: false };
  }
}
