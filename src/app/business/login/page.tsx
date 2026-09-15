import React from 'react';
import { redirect } from 'next/navigation';
import { getBusinessUser } from '@/server/auth';
import BusinessSignIn from '@/components/portal/BusinessSignIn';

export const dynamic = 'force-dynamic';

/**
 * /business/login - where an invited business owner signs in.
 *
 * Public by construction (it sits outside /portal, so the proxy leaves it
 * alone). A business account that is already signed in goes straight to its
 * console rather than seeing a form it does not need.
 */
export default async function BusinessLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const business = await getBusinessUser();
  if (business) redirect('/portal/business');

  const { redirectTo } = await searchParams;
  return <BusinessSignIn redirectTo={typeof redirectTo === 'string' ? redirectTo : null} />;
}
