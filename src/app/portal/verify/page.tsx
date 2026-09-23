import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth';
import ResendVerification from '@/components/portal/ResendVerification';
import { MailCheck, LogIn } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Where the emailed verification link lands.
 *
 * Neon Auth validates the token on its own server and then redirects here, so
 * this page never sees the token and has nothing to verify itself. Its only job
 * is to work out what happened and say so.
 *
 * Three outcomes:
 *   - a session exists  -> verification succeeded and auto-sign-in ran; go on in
 *   - `?error=` present  -> the link was expired or already used; offer a resend
 *   - no session         -> verified, but sign-in is still required
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const failed = typeof params.error === 'string' ? params.error : null;
  // Nothing here sees the token, so "no error" is not evidence of success. A
  // stranger opening this URL used to be told their address was confirmed.
  const confirmed = params.ok === '1' || params.verified === 'true' || params.success === 'true';
  const session = await getSession();

  // Verified and signed in — nothing to show.
  if (session && !failed) redirect('/portal/member/dashboard');

  const email = typeof params.email === 'string' ? params.email : '';

  return (
    <div className="section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card" style={{ padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: failed ? 'rgba(240,73,35,0.1)' : confirmed ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)',
            }}
          >
            <MailCheck size={30} style={{ color: failed ? 'var(--error-500)' : confirmed ? 'var(--success-600)' : 'var(--accent-700)' }} />
          </div>

          {failed || !confirmed ? (
            <>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>
                {failed ? 'That link didn’t work' : 'Open the link in your email'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 28 }}>
                {failed
                  ? 'Verification links expire, and each one can only be used once. Enter your email below and we’ll send a fresh link.'
                  : 'Finish by opening the confirmation link we emailed you. Nothing arrived, or the link expired? Enter your address below and we’ll send a fresh one.'}
              </p>
              <ResendVerification defaultEmail={email} />
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>
                Email confirmed
              </h1>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 28 }}>
                Your address is verified. Sign in to reach your dashboard.
              </p>
              <Link href="/portal/auth" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <LogIn size={16} /> Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
