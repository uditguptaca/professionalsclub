import PortalShell from '@/components/portal/PortalShell';
import { requireAdmin, displayName } from '@/server/auth';

export const dynamic = 'force-dynamic';

/**
 * Server-side gate for the admin portal. requireAdmin() reads the role from
 * public.profiles, which only an admin can write, so a member cannot reach these
 * pages by tampering with a cookie or a token claim.
 */
export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <PortalShell role={profile.role} userName={displayName(profile)}>
      {children}
    </PortalShell>
  );
}
