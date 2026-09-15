import React from 'react';
import Link from 'next/link';
import { requireBusinessUser } from '@/server/auth';
import BusinessTopbar from '@/components/portal/BusinessTopbar';
import BusinessTabbar from '@/components/portal/BusinessTabbar';
import { ConfirmProvider } from '@/components/portal/confirm';

export const dynamic = 'force-dynamic';

/**
 * The business owner's side of the portal.
 *
 * A deliberately bare shell: no member navigation, because a business account
 * is not a member and has nothing to reach through it. requireBusinessUser()
 * is the second of the three checks this app always does - the proxy turned
 * signed-out traffic away before the render, and RLS underneath decides what
 * any of these screens can actually load.
 */
export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const business = await requireBusinessUser();

  // .portal-layout carries the portal's zoom and typography; its flex display
  // is for the member sidebar, which this side does not have.
  return (
    <div className="portal-layout" style={{ display: 'block' }}>
      <BusinessTopbar
        businessName={business.businessName}
        email={business.email}
        publicHref={
          business.verificationStatus === 'verified' ? `/businesses/${business.businessSlug}` : null
        }
      />
      {/* Not .portal-main: that class reserves the member sidebar's width with a
          margin, and this side has no sidebar to fill it. */}
      <main className="bz-main">
        <div style={{ width: '100%', maxWidth: '52rem', margin: '0 auto' }}>
          {/* Without this, useConfirm() falls back to window.confirm, which the
              native shells caption "localhost says". The member side gets it
              from PortalShell; this side has no shell. */}
          <ConfirmProvider>{children}</ConfirmProvider>
        </div>
      </main>
      <footer className="bz-footer">
        Professionals Club for business ·{' '}
        <Link href="/contact" style={{ color: 'var(--text-accent)', fontWeight: 700 }}>
          Get help
        </Link>
      </footer>
      {/* Phones: the five destinations along the bottom. useSearchParams inside
          wants a Suspense boundary above it. */}
      <React.Suspense fallback={null}>
        <BusinessTabbar />
      </React.Suspense>
    </div>
  );
}
