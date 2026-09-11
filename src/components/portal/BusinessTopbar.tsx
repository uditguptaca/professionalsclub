'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ExternalLink, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth/client';

/**
 * The business console's only chrome: who you are signed in as, a link to the
 * page members see, and the way out.
 *
 * Deliberately not the member topbar. A business account has no notifications,
 * no chats and no profile in this club, and showing those would be an invitation
 * to wonder where they went.
 */
export default function BusinessTopbar({
  businessName,
  email,
  publicHref,
}: {
  businessName: string;
  email: string;
  publicHref: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } catch {
      // Navigate anyway: if the cookie survived, the proxy sends them back here,
      // which is a truthful outcome rather than a silent failure.
    }
    router.replace('/portal/auth');
    router.refresh();
    setSigningOut(false);
  };

  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: 'calc(0.75rem + var(--sat, 0px)) 1rem 0.75rem',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'grid', placeItems: 'center', width: 34, height: 34,
          borderRadius: 10, background: 'var(--green-950)', color: '#fff', flexShrink: 0,
        }}
      >
        <Building2 size={17} />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <strong style={{
          display: 'block', fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {businessName}
        </strong>
        <small style={{
          display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {email}
        </small>
      </span>

      {publicHref && (
        <a
          href={publicHref}
          target="_blank"
          rel="noopener noreferrer"
          className="bz-upload"
          style={{ minHeight: 40 }}
        >
          <ExternalLink size={14} aria-hidden="true" /> Public page
        </a>
      )}

      <button
        type="button"
        className="bz-upload"
        onClick={() => void signOut()}
        disabled={signingOut}
        style={{ minHeight: 40 }}
      >
        <LogOut size={14} aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Log out'}
      </button>
    </header>
  );
}
