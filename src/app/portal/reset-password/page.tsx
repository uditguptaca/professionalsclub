'use client';
import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { readAuthError } from '@/lib/auth/errors';
import { KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

/**
 * Where the emailed reset link lands. The token arrives as ?token= and is
 * spent by authClient.resetPassword; it is never stored or logged.
 */
function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        throw result.error;
      }
    } catch (thrown) {
      const failure = readAuthError(thrown);
      console.error('[auth] Password reset failed:', failure.code, failure.message);
      setError(
        /expired|invalid|token/i.test(`${failure.code} ${failure.message}`)
          ? 'That link has expired or was already used. Request a new one.'
          : 'The password could not be changed. Request a new link and try again.'
      );
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    // Send them to sign in with the new password rather than guessing at a session.
    setTimeout(() => router.replace('/portal/auth'), 2200);
  };

  if (!token) {
    return (
      <div className="card auth-card">
        <span className="auth-icon"><AlertCircle size={22} /></span>
        <h1>This link is incomplete</h1>
        <p>Open the reset link from your email, or request a new one.</p>
        <Link href="/portal/forgot-password" className="btn btn-primary">Request a new link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card auth-card">
        <span className="auth-icon"><CheckCircle2 size={22} /></span>
        <h1>Password changed</h1>
        <p>Taking you to sign in.</p>
        <Link href="/portal/auth" className="btn btn-primary">Sign in now</Link>
      </div>
    );
  }

  return (
    <form className="card auth-card" onSubmit={handleSubmit} noValidate>
      <span className="auth-icon"><KeyRound size={22} /></span>
      <h1>Choose a new password</h1>
      <p>At least 8 characters. Pick something you have not used elsewhere.</p>

      <div className="input-group">
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          className="input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          disabled={loading}
        />
      </div>

      <div className="input-group">
        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(''); }}
          disabled={loading}
        />
      </div>

      {error && (
        <p role="alert" className="auth-error">
          <AlertCircle size={15} /> {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving…' : 'Change password'}
      </button>

      <Link href="/portal/auth" className="auth-back">
        <ArrowLeft size={14} /> Back to sign in
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main id="main" className="auth-shell">
      <Suspense fallback={<div className="card auth-card"><p>Loading…</p></div>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
