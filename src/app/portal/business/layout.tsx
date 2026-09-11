import React from 'react';
import Link from 'next/link';
import { requireBusinessUser } from '@/server/auth';
import BusinessTopbar from '@/components/portal/BusinessTopbar';

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
      <main
        style={{
          minHeight: '100dvh',
          background: 'var(--bg-secondary)',
          padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 2.5vw, 2rem) 3rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: '52rem', margin: '0 auto' }}>
          {children}
        </div>
      </main>
      <footer style={{
        padding: '1.25rem 1rem 2rem', textAlign: 'center',
        fontSize: '0.78rem', color: 'var(--text-muted)',
      }}>
        Professionals Club for business ·{' '}
        <Link href="/contact" style={{ color: 'var(--text-accent)', fontWeight: 700 }}>
          Get help
        </Link>
      </footer>
    </div>
  );
}
