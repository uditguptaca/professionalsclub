import PortalShell from '@/components/portal/PortalShell';
import { requireProfile, displayName } from '@/server/auth';

// auth.getSession() reads request cookies, so this subtree cannot be prerendered.
export const dynamic = 'force-dynamic';

/**
 * Server-side gate for the member portal. Rendering never starts for a signed
 * -out or suspended account, so no member data reaches the browser before the
 * check runs.
 */
export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <PortalShell role={profile.role} userName={displayName(profile)}>
      {children}
    </PortalShell>
  );
}
