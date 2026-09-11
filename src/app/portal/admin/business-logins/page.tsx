'use client';
import React from 'react';
import Link from 'next/link';
import {
  KeyRound, Mail, Copy, AlertCircle, CheckCircle2, Ban, RotateCcw, Clock, Building2,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';
import { usePortal } from '@/context/portal-context';
import {
  adminListInvitesAction, adminInviteBusinessAction, adminRevokeInviteAction,
  adminSetBusinessLoginStatusAction,
} from '@/app/actions/business';
import type { BusinessInvite, BusinessLogin } from '@/server/repos/business-invites';

/**
 * Who can sign in as a business.
 *
 * A business never registers itself. It applies through the public form, an
 * admin verifies the listing on the Businesses screen, and then invites the
 * owner here - one address, one business, one single-use link. This page is
 * therefore the only door into the business side of the portal, which is why
 * it also shows the accounts that already exist and lets an admin turn one off.
 */

const when = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATE_STYLE: Record<BusinessInvite['state'], { label: string; cls: string }> = {
  pending: { label: 'Waiting to be used', cls: 'pending' },
  accepted: { label: 'Used', cls: 'verified' },
  revoked: { label: 'Revoked', cls: 'pending' },
  expired: { label: 'Expired', cls: 'pending' },
};

export default function BusinessLoginsPage() {
  const confirm = useConfirm();
  // The verified-business list the invite form picks from is already loaded by
  // the portal snapshot; no second round trip for it.
  const { businesses } = usePortal();

  const [invites, setInvites] = React.useState<BusinessInvite[] | null>(null);
  const [logins, setLogins] = React.useState<BusinessLogin[]>([]);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [businessId, setBusinessId] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [lastLink, setLastLink] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const r = await adminListInvitesAction();
      if (r.ok) { setInvites(r.data.invites); setLogins(r.data.logins); }
      else setError(r.error);
    })();
  }, []);

  const verified = React.useMemo(
    () => (businesses ?? []).filter((b) => b.verificationStatus === 'verified'),
    [businesses]
  );

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLastLink(''); setBusy(true);
    const r = await adminInviteBusinessAction(businessId, email);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setInvites(r.data.invites);
    setLastLink(r.data.link);
    setEmail('');
  };

  if (invites === null && !error) return <PortalLoading label="Loading business logins" />;

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Business logins</h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Businesses cannot sign themselves up. Verify the listing on{' '}
            <Link href="/portal/admin/businesses" style={{ color: 'var(--text-accent)', fontWeight: 700 }}>
              Businesses
            </Link>{' '}
            first, then invite the owner here. A business login can manage its own page,
            offers, coupons and events, and can see nothing about members.
          </p>

          {error && (
            <p className="community-error" role="alert" style={{ marginTop: 10 }}>
              <AlertCircle size={14} aria-hidden="true" /> {error}
            </p>
          )}
        </section>

        <section className="hf-section">
          <form className="bz-card" onSubmit={invite}>
            <div className="bz-field">
              <label htmlFor="bl-biz">Business</label>
              <select id="bl-biz" value={businessId} onChange={(e) => setBusinessId(e.target.value)} required>
                <option value="">{verified.length ? 'Choose a verified business' : 'No verified businesses yet'}</option>
                {verified.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="bz-field">
              <label htmlFor="bl-email">Owner&apos;s email</label>
              <input
                id="bl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="owner@business.ca"
              />
              <p className="bz-muted" style={{ margin: '0.3rem 0 0', fontSize: '0.78rem' }}>
                Must not already be a member account - a business login is a separate thing.
              </p>
            </div>
            <button
              type="submit" className="btn btn-primary" disabled={busy || !businessId}
              style={{ minHeight: 46, justifyContent: 'center', gap: 8 }}
            >
              <Mail size={15} aria-hidden="true" /> {busy ? 'Sending…' : 'Send invitation'}
            </button>
          </form>

          {lastLink && (
            <div className="bz-card" style={{ marginTop: 12, borderColor: 'var(--primary-600)' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-primary)' }}>
                <CheckCircle2 size={15} aria-hidden="true" style={{ color: 'var(--success-600)' }} />
                Invitation sent
              </strong>
              <p className="bz-muted" style={{ margin: '0.4rem 0 0.6rem', fontSize: '0.82rem' }}>
                The link is in their inbox. Here it is too, in case you would rather send it
                on WhatsApp. It works once and expires in fourteen days.
              </p>
              <code style={{
                display: 'block', padding: '0.5rem 0.7rem', borderRadius: 8,
                background: 'var(--bg-secondary)', fontSize: '0.78rem', wordBreak: 'break-all',
              }}>
                {lastLink}
              </code>
              <button
                type="button" className="bz-upload" style={{ marginTop: 8 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(lastLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  } catch {
                    // Clipboard blocked; the link is on screen to copy by hand.
                  }
                }}
              >
                <Copy size={13} aria-hidden="true" /> {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          )}
        </section>

        {logins.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head"><h2>Active logins</h2></div>
            {logins.map((l) => (
              <div key={l.userId} className="bz-card" style={{ marginTop: 10 }}>
                <div className="bz-card-head">
                  <strong>{l.businessName}</strong>
                  <span className={`bz-status ${l.status === 'active' ? 'verified' : 'pending'}`}>
                    {l.status === 'active' ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="bz-muted" style={{ margin: '0.35rem 0 0.6rem' }}>
                  {l.fullName ? `${l.fullName} · ` : ''}{l.email} · added {when(l.createdAt)}
                </p>
                <div className="bz-actions">
                  <button
                    type="button"
                    className="bz-upload"
                    onClick={async () => {
                      const disabling = l.status === 'active';
                      if (disabling && !(await confirm({
                        title: `Disable the login for ${l.businessName}?`,
                        message: 'They stop being able to sign in. Their page, offers and events stay exactly as they are.',
                        confirmLabel: 'Disable',
                        tone: 'danger',
                      }))) return;
                      const r = await adminSetBusinessLoginStatusAction(
                        l.userId, disabling ? 'disabled' : 'active'
                      );
                      if (r.ok) setLogins(r.data); else setError(r.error);
                    }}
                  >
                    {l.status === 'active'
                      ? <><Ban size={13} aria-hidden="true" /> Disable</>
                      : <><RotateCcw size={13} aria-hidden="true" /> Re-enable</>}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="hf-section">
          <div className="hf-section-head"><h2>Invitations</h2></div>
          {invites?.length === 0 && (
            <div className="card" style={{ padding: '1.6rem 1.25rem', textAlign: 'center' }}>
              <KeyRound size={24} aria-hidden="true" style={{ opacity: 0.35 }} />
              <p style={{ margin: '0.6rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No invitations yet.
              </p>
            </div>
          )}
          {invites?.map((i) => (
            <div key={i.id} className="bz-card" style={{ marginTop: 10 }}>
              <div className="bz-card-head">
                <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={14} aria-hidden="true" /> {i.businessName}
                </strong>
                <span className={`bz-status ${STATE_STYLE[i.state].cls}`}>{STATE_STYLE[i.state].label}</span>
              </div>
              <p className="bz-muted" style={{ margin: '0.35rem 0 0.6rem' }}>
                {i.email} · sent {when(i.createdAt)}
                {i.state === 'pending' && (
                  <>
                    {' · '}
                    <Clock size={11} aria-hidden="true" style={{ verticalAlign: '-1px' }} /> expires {when(i.expiresAt)}
                  </>
                )}
              </p>
              {i.state === 'pending' && (
                <div className="bz-actions">
                  <button
                    type="button"
                    className="bz-upload"
                    onClick={async () => {
                      if (!(await confirm({
                        title: 'Revoke this invitation?',
                        message: `The link sent to ${i.email} stops working immediately.`,
                        confirmLabel: 'Revoke',
                        tone: 'danger',
                      }))) return;
                      const r = await adminRevokeInviteAction(i.id);
                      if (r.ok) setInvites(r.data); else setError(r.error);
                    }}
                  >
                    <Ban size={13} aria-hidden="true" /> Revoke
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
