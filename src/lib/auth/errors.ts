/**
 * Reading failures out of the Neon Auth client.
 *
 * The client **throws** on API errors (an `AuthApiError`) rather than returning
 * `{ error }` the way plain Better Auth does. Assuming the return shape means a
 * wrong password escapes as an unhandled rejection and lands in Next's error
 * overlay instead of the form.
 *
 * Some paths do return `{ error }` though, so everything here accepts both and
 * never itself throws. Usable from client and server.
 */

export type AuthFailure = { code: string; message: string };

/** Normalises a thrown value, or a returned `{ error }`, into a code + message. */
export function readAuthError(thrown: unknown): AuthFailure {
  if (!thrown) return { code: 'UNKNOWN', message: '' };

  // Some calls resolve with { error } instead of throwing.
  const source =
    typeof thrown === 'object' && thrown !== null && 'error' in thrown && (thrown as { error?: unknown }).error
      ? (thrown as { error: unknown }).error
      : thrown;

  const raw = source as { code?: unknown; status?: unknown; message?: unknown; name?: unknown };

  const code = String(raw?.code ?? raw?.name ?? 'UNKNOWN')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

  return { code, message: typeof raw?.message === 'string' ? raw.message : '' };
}

/** True when the account exists and the password was right, but the email is unconfirmed. */
export const isUnverifiedEmail = (failure: AuthFailure) => failure.code === 'EMAIL_NOT_VERIFIED';

const NETWORK_CODES = new Set([
  'NETWORK_ERROR', 'NETWORK_DNS', 'NETWORK_REFUSED',
  'NETWORK_TIMEOUT', 'NETWORK_TLS', 'NETWORK_RESET', 'NETWORK_ABORT',
]);

/**
 * A message safe to show a user.
 *
 * Bad credentials and unknown accounts deliberately share one message, so the
 * form cannot be used to test which addresses are registered. Signup is the
 * exception — "already registered" has to be sayable there, and it is
 * discoverable by attempting to register anyway.
 */
export function authErrorMessage(failure: AuthFailure, context: 'sign-in' | 'sign-up' = 'sign-in'): string {
  const { code, message } = failure;

  if (NETWORK_CODES.has(code)) {
    return 'Could not reach the sign-in service. Check your connection and try again.';
  }

  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_CREDENTIALS':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'Incorrect email or password.';

    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'An account with this email already exists. Sign in instead.';

    case 'PASSWORD_TOO_SHORT':
      return 'Password must be at least 8 characters.';

    case 'TOO_MANY_REQUESTS':
    case 'OVER_REQUEST_RATE_LIMIT':
      return 'Too many attempts. Wait a minute and try again.';

    case 'USER_BANNED':
    case 'BANNED_USER':
      return 'This account has been suspended. Contact an administrator.';

    default:
      break;
  }

  if (context === 'sign-in') {
    // Anything unrecognised on sign-in collapses to the same vague message; the
    // real code is logged server-side or to the console for diagnosis.
    return 'Incorrect email or password.';
  }

  // On signup the upstream wording is usually actionable ("Password too weak"),
  // so it is passed through when present.
  return message || 'Something went wrong. Please try again.';
}
