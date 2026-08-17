'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { readAuthError } from '@/lib/auth/errors';
import { KeyRound, MailCheck, AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * Request a password reset link.
 *
 * Before this page the only "Forgot password?" affordance pointed at /support,
 * a fundraising page, and no reset flow existed anywhere — so a member who
 * forgot their password was permanently locked out with no self-serve path.
 *
 * The response is deliberately identical whether or not the address is
 * registered. Confirming which emails have accounts would turn this into an
 * account-enumeration oracle, and it is reachable without a session.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const address = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
      setError('Enter the email address you signed up with.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // The SDK throws on API errors rather than returning { error }.
      await authClient.requestPasswordReset({
        email: address,
        redirectTo: `${window.location.origin}/portal/reset-password`,
      });
    } catch (thrown) {
      const failure = readAuthError(thrown);
      // Logged, not shown: the message can reveal whether the account exists.
      console.error('[auth] Password reset request failed:', failure.code, failure.message);
    }

    // Same outcome either way, on purpose.
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <main id="main" className="auth-shell">
        <div className="card auth-card">
          <span className="auth-icon"><MailCheck size={22} /></span>
          <h1>Check your email</h1>
          <p>
            If <strong>{email.trim()}</strong> has an account, a reset link is on
            its way. The link works once and expires after an hour.
          </p>
          <p className="auth-muted">
            Nothing arrived? Check the spam folder, or email{' '}
            <a href="mailto:support@professionalsclub.ca">support@professionalsclub.ca</a>{' '}
            and an admin will help.
          </p>
          <Link href="/portal/auth" className="btn btn-outline">
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <span className="auth-icon"><KeyRound size={22} /></span>
        <h1>Reset your password</h1>
        <p>Enter the address you signed up with and we will send a reset link.</p>

        <div className="input-group">
          <label htmlFor="reset-email">Email address</label>
          <input
            id="reset-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            disabled={loading}
          />
        </div>

        {error && (
          <p role="alert" className="auth-error">
            <AlertCircle size={15} /> {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>

        <Link href="/portal/auth" className="auth-back">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </form>
    </main>
  );
}
