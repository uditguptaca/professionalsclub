'use client';
import React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import BusinessConsole from '@/components/portal/BusinessConsole';

/**
 * My Business, for a MEMBER who also runs one.
 *
 * The registration form that used to live here is gone. A business joins the
 * directory by applying through the public form and being verified by an admin,
 * who then invites the owner to their own login (0046) - so there is exactly one
 * way in, and it has a human in it. Members who registered a business before
 * that change keep this screen and every ability it had.
 */
export default function MyBusinessPage() {
  return (
    <BusinessConsole
      emptyState={
        <div className="bz-card">
          <strong style={{ color: 'var(--text-primary)' }}>
            <Building2 size={16} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />
            You do not have a listing yet
          </strong>
          <p className="bz-muted" style={{ margin: '0.4rem 0 0.9rem' }}>
            Businesses join the directory by applying. The club checks each one, and
            then sends the owner a login for managing their page, offers and events.
          </p>
          <Link href="/businesses/register" className="btn btn-primary" style={{ minHeight: 46 }}>
            Apply to list your business
          </Link>
        </div>
      }
    />
  );
}
