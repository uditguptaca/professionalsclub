'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import {
  Home, HelpCircle, HandHeart, FileText, ClipboardList, MessageSquare,
  LogOut, BarChart3, Users, ListChecks, FolderKanban, Shield, ScrollText,
  Settings, UserCircle, Building2, Inbox, Layers, BookOpen, Calendar,
  UsersRound, Newspaper, Heart, Briefcase,
} from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, setIsAuthenticated, isAuthenticated } = useApp();

  // Redirect logic
  React.useEffect(() => {
    if (pathname.includes('/portal/auth') || pathname.includes('/portal/signup')) {
      if (isAuthenticated) {
        const path = currentRole === 'admin' ? '/portal/admin/dashboard' : '/portal/member/dashboard';
        router.replace(path);
      }
      return;
    }
    if (!isAuthenticated) {
      router.replace('/portal/auth');
    }
  }, [isAuthenticated, currentRole, pathname, router]);

  if (pathname.includes('/portal/auth') || pathname.includes('/portal/signup')) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pc_auth');
    localStorage.removeItem('pc_role');
    router.replace('/portal/auth');
  };

  const memberLinks = [
    { label: 'Dashboard', href: '/portal/member/dashboard', icon: Home },
    { label: 'My Profile', href: '/portal/member/profile', icon: UserCircle },
    { label: 'Request Help', href: '/portal/member/request-help', icon: HelpCircle },
    { label: 'Become a Volunteer', href: '/portal/member/volunteer', icon: HandHeart },
    { label: 'My Requests', href: '/portal/member/my-requests', icon: FileText },
    { label: 'My Volunteer Status', href: '/portal/member/my-volunteer', icon: ClipboardList },
    { label: 'Admin Messages', href: '/portal/member/messages', icon: MessageSquare },
    { label: 'Business Directory', href: '/portal/member/businesses', icon: Building2 },
  ];

  const adminLinks = [
    { label: 'Overview', href: '/portal/admin/dashboard', icon: BarChart3 },
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

  const navLinks = currentRole === 'admin' ? adminLinks : memberLinks;

  const roleName = currentRole === 'admin' ? 'Admin Portal' : 'Help Desk';

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="sidebar">
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
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="icon" size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {currentRole === 'admin' && (
            <>
              <div className="sidebar-section-title" style={{ marginTop: 16 }}>Content Manager</div>
              {adminContentLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="icon" size={18} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="sidebar-nav" style={{ flex: 'none', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button className="sidebar-link" onClick={handleLogout}>
            <LogOut className="icon" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ marginLeft: 'var(--sidebar-width)', width: 'calc(100% - var(--sidebar-width))', background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <header style={{ height: '72px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-6)', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-glass)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} className="text-primary-400" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Admin-Mediated • No Direct Contact
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="badge badge-accent bg-accent-50 text-accent-700 border border-accent-200" style={{ fontSize: '0.7rem' }}>MVP Beta</div>
            <div className="badge badge-neutral text-gray-600 border border-gray-200 capitalize" style={{ fontSize: '0.7rem' }}>
              <UserCircle size={12} style={{ marginRight: 4 }} />
              {currentRole}
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
