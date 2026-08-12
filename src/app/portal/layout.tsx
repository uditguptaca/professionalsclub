/**
 * Passthrough. /portal/auth and /portal/signup live under this path and must
 * stay reachable without a session, so the guard sits one level down in
 * portal/member/layout.tsx and portal/admin/layout.tsx instead.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
