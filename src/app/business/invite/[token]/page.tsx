'use client';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { inspectInviteAction, acceptInviteAction } from '@/app/actions/business-invite';

/**
 * Setting up a business login from an invitation.
 *
 * Public by design - the person opening it has no account yet, which is the
 * whole point. The token in the URL is the only credential, and the page shows
 * which business and which address it is for before anyone types anything, so a
 * link that ended up with the wrong person is obvious rather than confusing.
 *
 * The email address is not editable. It comes from the invitation the club
 * sent, so a forwarded link cannot be pointed at a different mailbox.
 */
export default function BusinessInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token ?? '';

  const [state, setState] = React.useState<
    { phase: 'loading' } | { phase: 'invalid'; error: string } | { phase: 'ready'; businessName: string; email: string }
  >({ phase: 'loading' });
  const [fullName, setFullName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    (async () => {
      const r = await inspectInviteAction(token);
      setState(r.ok
        ? { phase: 'ready', businessName: r.businessName, email: r.email }
        : { phase: 'invalid', error: r.error });
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Both passwords need to match.'); return; }
    setBusy(true);
    const r = await acceptInviteAction({ token, password, fullName });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    router.replace(r.signedIn ? '/portal/business' : '/portal/auth?business=1');
    router.refresh();
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '26rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span
            aria-hidden="true"
            style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40,
              borderRadius: 12, background: 'var(--green-950)', color: '#fff',
            }}
          >
            <Building2 size={20} />
          </span>
          <div>
            <strong style={{ display: 'block', fontSize: '1.05rem' }}>Professionals Club</strong>
            <small style={{ color: 'var(--text-muted)' }}>for business</small>
          </div>
        </div>

        {state.phase === 'loading' && (
          <p style={{ color: 'var(--text-secondary)' }}>
            <Loader2 size={15} className="spin" aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Checking your invitation…
          </p>
        )}

        {state.phase === 'invalid' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <p role="alert" className="community-error" style={{ marginTop: 0 }}>
              <AlertCircle size={15} aria-hidden="true" /> {state.error}
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Invitations are single use and expire after two weeks. If yours has run out,
              ask the club to send a new one.
            </p>
            <Link href="/contact" className="btn btn-outline" style={{ minHeight: 46 }}>
              Contact the club
            </Link>
          </div>
        )}

        {state.phase === 'ready' && (
          <form className="card" style={{ padding: '1.25rem' }} onSubmit={submit}>
            <h1 style={{ fontSize: '1.2rem', margin: '0 0 0.35rem' }}>
              Set up the login for {state.businessName}
            </h1>
            <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              This login manages your listing, your member offers and coupons, and your
              events. It is not a member account and has no access to member details.
            </p>

            <div className="bz-field">
              <label htmlFor="bi-email">Email</label>
              <input id="bi-email" value={state.email} readOnly disabled />
              <p className="bz-muted" style={{ margin: '0.3rem 0 0', fontSize: '0.78rem' }}>
                The address the club invited. Ask them if it needs to change.
              </p>
            </div>

            <div className="bz-field">
              <label htmlFor="bi-name">Your name</label>
              <input
                id="bi-name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                required maxLength={120} autoComplete="name" placeholder="Who runs this account"
              />
            </div>

            <div className="bz-field">
              <label htmlFor="bi-pass">Password</label>
              <input
                id="bi-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8} autoComplete="new-password" placeholder="At least 8 characters"
              />
            </div>

            <div className="bz-field">
              <label htmlFor="bi-pass2">Confirm password</label>
              <input
                id="bi-pass2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required minLength={8} autoComplete="new-password"
              />
            </div>

            {error && (
              <p role="alert" className="community-error">
                <AlertCircle size={14} aria-hidden="true" /> {error}
              </p>
            )}

            <button
              type="submit" className="btn btn-primary" disabled={busy}
              style={{ minHeight: 50, width: '100%', justifyContent: 'center', gap: 8 }}
            >
              {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              {busy ? 'Setting up…' : 'Create my login'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
