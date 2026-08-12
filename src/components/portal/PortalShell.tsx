'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { readAuthError } from '@/lib/auth/errors';
import type { UserRole } from '@/types';
import {
  Home, HelpCircle, HandHeart, FileText, ClipboardList, MessageSquare,
  LogOut, BarChart3, Users, FolderKanban, Shield, ScrollText,
  UserCircle, Building2, Inbox, BookOpen, Calendar,
  UsersRound, Newspaper, Heart, Briefcase, Menu, X,
} from 'lucide-react';

/**
 * Sidebar chrome for the portal.
 *
 * Purely presentational as far as access control goes: whether this renders at
 * all is decided by the server layouts, which is why there is no redirect logic
 * left in here.
 */
export default function PortalShell({
  role,
  userName,
  children,
}: {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const handleLogout = async () => {
    setSigningOut(true);

    // signOut throws on failure like the rest of the client. Navigating anyway is
    // deliberate: if the cookie survived, the proxy sends the user straight back
    // to the dashboard, which is a truthful outcome. Silently swallowing the
    // throw and leaving them on the page would just look broken.
    try {
      await authClient.signOut();
    } catch (thrown) {
      console.error('[auth] Sign-out failed:', readAuthError(thrown).code);
    }

    // refresh() re-runs the server layouts so the cleared cookie takes effect.
    router.replace('/portal/auth');
    router.refresh();
    setSigningOut(false);
  };

  const isMatrimonyEnabled = process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false';

  const memberLinks = [
    { label: 'Dashboard', href: '/portal/member/dashboard', icon: Home },
    { label: 'My Profile', href: '/portal/member/profile', icon: UserCircle },
    ...(isMatrimonyEnabled ? [{ label: 'Matrimony', href: '/portal/member/matrimony', icon: Heart }] : []),
    { label: 'Request Help', href: '/portal/member/request-help', icon: HelpCircle },
    { label: 'Become a Volunteer', href: '/portal/member/volunteer', icon: HandHeart },
    { label: 'My Requests', href: '/portal/member/my-requests', icon: FileText },
    { label: 'My Volunteer Status', href: '/portal/member/my-volunteer', icon: ClipboardList },
    { label: 'Admin Messages', href: '/portal/member/messages', icon: MessageSquare },
    { label: 'Business Directory', href: '/portal/member/businesses', icon: Building2 },
  ];

  const adminLinks = [
    { label: 'Overview', href: '/portal/admin/dashboard', icon: BarChart3 },
    ...(isMatrimonyEnabled ? [{ label: 'Matrimony', href: '/portal/admin/matrimony', icon: Heart }] : []),
    { label: 'Help Requests', href: '/portal/admin/requests', icon: FileText },
    { label: 'Volunteer Applications', href: '/portal/admin/volunteers', icon: HandHeart },
    { label: 'Assignments', href: '/portal/admin/assignments', icon: FolderKanban },
    { label: 'Members', href: '/portal/admin/members', icon: Users },
    { label: 'Message Center', href: '/portal/admin/messages', icon: MessageSquare },
    { label: 'Audit Logs', href: '/portal/admin/audit', icon: ScrollText },
    { label: 'Businesses', href: '/portal/admin/businesses', icon: Building2 },
    { label: 'Biz Requests', href: '/portal/admin/business-requests', icon: Inbox },
  ];

  const adminContentLinks = [
    { label: 'Resources', href: '/portal/admin/content/resources', icon: BookOpen },
    { label: 'Events', href: '/portal/admin/content/events', icon: Calendar },
    { label: 'Jobs', href: '/portal/admin/content/jobs', icon: Briefcase },
    { label: 'Team', href: '/portal/admin/content/team', icon: UsersRound },
    { label: 'News', href: '/portal/admin/content/news', icon: Newspaper },
    { label: 'Donations', href: '/portal/admin/content/donations', icon: Heart },
  ];

  const navLinks = role === 'admin' ? adminLinks : memberLinks;
  const roleName = role === 'admin' ? 'Admin Portal' : 'Help Desk';

  const renderLink = (link: { label: string; href: string; icon: typeof Home }) => {
    const Icon = link.icon;
    const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`sidebar-link ${isActive ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      >
        <Icon className="icon" size={18} />
        <span>{link.label}</span>
      </Link>
    );
  };

  return (
    <div className="portal-layout">
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={{ zIndex: 50 }}>
        <div className="sidebar-header">
          <Link href="/" className="flex items-center gap-2">
            <div className="logo-icon" style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', color: 'white', fontWeight: 800, fontSize: '0.8rem', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PC</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand" style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.2 }}>Professionals Club</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{roleName}</span>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Menu</div>
          {navLinks.map(renderLink)}

          {role === 'admin' && (
            <>
              <div className="sidebar-section-title" style={{ marginTop: 16 }}>Content Manager</div>
              {adminContentLinks.map(renderLink)}
            </>
          )}
        </nav>

        <div className="sidebar-nav" style={{ flex: 'none', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button className="sidebar-link" onClick={handleLogout} disabled={signingOut}>
            <LogOut className="icon" size={18} />
            <span>{signingOut ? 'Signing out…' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      <main className="portal-main" style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
        <header className="portal-topbar" style={{ height: '72px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-6)', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-glass)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-only-btn" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', color: 'var(--text-primary)', cursor: 'pointer', padding: 4 }}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} className="text-primary-400" />
              <span className="portal-header-notice" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Admin-Mediated • No Direct Contact
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="badge badge-neutral text-gray-600 border border-gray-200" style={{ fontSize: '0.7rem' }}>
              <UserCircle size={12} style={{ marginRight: 4 }} />
              {userName}
            </div>
            <div className="badge badge-accent bg-accent-50 text-accent-700 border border-accent-200 capitalize" style={{ fontSize: '0.7rem' }}>
              {role}
            </div>
          </div>
        </header>

        <div className="container" style={{ padding: 'var(--space-8) var(--space-6)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
