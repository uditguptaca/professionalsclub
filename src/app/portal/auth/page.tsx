'use client';
import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { Shield, LogIn, AlertCircle, MailWarning } from 'lucide-react';
import ResendVerification from '@/components/portal/ResendVerification';
import { readAuthError, authErrorMessage, isUnverifiedEmail } from '@/lib/auth/errors';

const ERROR_MESSAGES: Record<string, string> = {
  account_inactive: 'This account is suspended. Contact an administrator for help.',
};

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(ERROR_MESSAGES[searchParams.get('error') ?? ''] ?? '');
  // Tracked separately from `error`: this one is not a failure the user can fix
  // by retyping, so it gets its own message and a resend button.
  const [unverified, setUnverified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setUnverified(false);
    setLoading(true);

    // The client throws on API errors rather than returning { error }, so this
    // has to be wrapped. Without the try/catch a wrong password escaped as an
    // unhandled rejection and showed up in Next's dev overlay instead of here.
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password });

      // Belt and braces: some paths resolve with { error } instead of throwing.
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        throw result.error;
      }
    } catch (thrown) {
      const failure = readAuthError(thrown);

      if (isUnverifiedEmail(failure)) {
        // Credentials were correct — the address just is not confirmed yet.
        // Saying "wrong password" here would send the user off resetting a
        // password that works fine.
        setUnverified(true);
      } else {
        setError(authErrorMessage(failure, 'sign-in'));
        // The specific code never reaches the UI, so log it for diagnosis.
        console.error('[auth] Sign-in failed:', failure.code, failure.message);
      }

      setLoading(false);
      return;
    }

    // Only same-site portal paths are honoured, so a crafted ?redirectTo= cannot
    // bounce a freshly signed-in user to another origin.
    const requested = searchParams.get('redirectTo');
    const destination =
      requested && requested.startsWith('/portal/') && !requested.startsWith('//')
        ? requested
        : '/portal/member/dashboard';

    router.replace(destination);
    router.refresh();
  };

  return (
    <div className="section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(232, 93, 4, 0.08) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', left: '30%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container" style={{ maxWidth: '560px', position: 'relative', zIndex: 10 }}>
        <div className="text-center mb-6" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 10px 30px rgba(232, 93, 4, 0.3)' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>PC</span>
          </div>
          <h1 className="text-3xl font-bold font-display">Professionals Club Help Desk</h1>
        </div>

        <div className="card animate-fade-in" style={{ padding: '24px 32px', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            <LogIn size={24} className="text-primary-600" />
            Sign In
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/support" style={{ fontSize: '0.8rem', color: 'var(--primary-600)', fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div role="alert" style={{ color: 'var(--error-500)', fontSize: '0.85rem', fontWeight: 500, padding: '10px 12px', background: 'rgba(240, 73, 35, 0.1)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {unverified && (
              <div role="alert" style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: 'var(--primary-800)', lineHeight: 1.6 }}>
                  <MailWarning size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>Confirm your email first.</strong> We sent a link to{' '}
                    <strong>{email.trim()}</strong>. Open it to activate your account, then sign in.
                  </span>
                </div>
                <ResendVerification defaultEmail={email.trim()} compact />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/portal/signup" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Sign up as Member</Link>
            </div>
          </form>
        </div>

        <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 12, background: 'rgba(232, 93, 4, 0.05)', border: '1px solid rgba(232, 93, 4, 0.15)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <Shield size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
            <strong>No direct member contact.</strong> All interactions are securely routed for safety and privacy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  // useSearchParams needs a Suspense boundary to keep this route prerenderable.
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
