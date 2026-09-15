'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { readAuthError, authErrorMessage } from '@/lib/auth/errors';

/**
 * The business owner's front door.
 *
 * Members sign in at /portal/auth under a "Help Desk" heading with a "Sign up
 * as Member" link - both wrong for someone who runs a catering company and was
 * invited by the club. This page says who it is for, asks for two things, and
 * lands them in their console. It is a single column that reads top-down on a
 * phone: no centred hero, no decoration competing with the form.
 *
 * Only a business destination is honoured from ?redirectTo=, so a crafted link
 * cannot bounce a fresh session anywhere else.
 */
export default function BusinessSignIn({ redirectTo }: { redirectTo: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const destination =
    redirectTo && redirectTo.startsWith('/portal/business') && !redirectTo.startsWith('//')
      ? redirectTo
      : '/portal/business';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password });
      if (result && typeof result === 'object' && 'error' in result && result.error) throw result.error;
    } catch (thrown) {
      const failure = readAuthError(thrown);
      setError(authErrorMessage(failure, 'sign-in'));
      console.error('[business-auth] Sign-in failed:', failure.code, failure.message);
      setLoading(false);
      return;
    }
    // A member who signs in here is sent on by the business layout, which
    // knows the difference; this page does not need to.
    router.replace(destination);
    router.refresh();
  };

  return (
    <main className="bz-login">
      <section className="bz-login-card" aria-labelledby="bz-login-title">
        <div className="bz-login-brand">
          <span className="bz-login-mark" aria-hidden="true"><Building2 size={20} /></span>
          <span>Professionals Club <strong>for business</strong></span>
        </div>

        <h1 id="bz-login-title">Sign in to your business console</h1>
        <p className="bz-login-lede">
          For businesses the club has verified and invited. Manage your page, offers,
          events and posts, and scan member codes at the counter.
        </p>

        <form onSubmit={submit} noValidate>
          <div className="bz-field">
            <label htmlFor="bz-email">Email</label>
            <input
              id="bz-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.ca"
              required
            />
          </div>

          <div className="bz-field">
            <div className="bz-field-row">
              <label htmlFor="bz-password">Password</label>
              <Link href="/portal/forgot-password" className="bz-field-link">Forgot password?</Link>
            </div>
            <div className="bz-pw">
              <input
                id="bz-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="bz-pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="community-error" style={{ marginBottom: 12 }}>
              <AlertCircle size={15} aria-hidden="true" /> {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', minHeight: 52, justifyContent: 'center', gap: 8, fontSize: '1rem' }}
          >
            {loading
              ? <><Loader2 size={17} className="spin" aria-hidden="true" /> Signing in…</>
              : <>Sign in <ArrowRight size={17} aria-hidden="true" /></>}
          </button>
        </form>
      </section>

      <ul className="bz-login-links">
        <li>
          Not a business? <Link href="/portal/auth">Sign in to the member portal</Link>
        </li>
        <li>
          Want your business in the directory? <Link href="/businesses/register">Apply to be listed</Link>
        </li>
        <li>
          Have an invitation email? Open its link to set your password first.
        </li>
      </ul>
    </main>
  );
}
