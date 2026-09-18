'use client';
import React from 'react';
import { dropCache } from '@/lib/swr-cache';
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
    // The in-memory cache outlives a client-side navigation: the next person
    // to sign in on this tablet must not see this business's console first.
    dropCache('');
    router.replace('/business/login');
    router.refresh();
    setSigningOut(false);
  };

  return (
    <header className="bz-topbar">
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
          className="bz-btn"
          aria-label="Open your public page"
        >
          <ExternalLink size={15} aria-hidden="true" /> <span className="bz-topbar-label">Public page</span>
        </a>
      )}

      <button
        type="button"
        className="bz-btn"
        onClick={() => void signOut()}
        disabled={signingOut}
        aria-label="Log out"
      >
        <LogOut size={15} aria-hidden="true" /> <span className="bz-topbar-label">{signingOut ? 'Signing out…' : 'Log out'}</span>
      </button>
    </header>
  );
}
