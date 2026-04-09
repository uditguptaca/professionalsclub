'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { Home, Search, MessageSquare, Briefcase, Settings, LogOut, CheckCircle, Users, BarChart3, ShieldCheck, ListTodo } from 'lucide-react';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, setIsAuthenticated, isAuthenticated } = useApp();

  // Redirect to auth if trying to access portal routes without authentication
  React.useEffect(() => {
    if (!isAuthenticated && !pathname.includes('/portal/auth')) {
      router.push('/portal/auth');
    }
  }, [isAuthenticated, pathname, router]);

  if (pathname.includes('/portal/auth')) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    setIsAuthenticated(false);
    router.push('/');
  };

  const seekerLinks = [
    { label: 'Dashboard', href: '/portal/seeker/dashboard', icon: Home },
    { label: 'Request Referral', href: '/portal/seeker/request', icon: Search },
    { label: 'My Matches', href: '/portal/seeker/matches', icon: CheckCircle },
  ];

  const employeeLinks = [
    { label: 'Queue & Dashboard', href: '/portal/employee/dashboard', icon: ListTodo },
    { label: 'Onboarding Area', href: '/portal/employee/onboarding', icon: ShieldCheck },
  ];

  const adminLinks = [
    { label: 'Dashboard', href: '/portal/admin/dashboard', icon: BarChart3 },
    { label: 'Pricing Controls', href: '/portal/admin/pricing', icon: Briefcase },
    { label: 'Approvals Queue', href: '/portal/admin/approvals', icon: Users },
  ];

  // Dynamic nav array based on context state
  const navLinks = 
    currentRole === 'seeker' ? seekerLinks :
    currentRole === 'employee' ? employeeLinks :
    adminLinks;

  const roleName = 
    currentRole === 'seeker' ? 'Candidate Portal' :
    currentRole === 'employee' ? 'Referrer Portal' :
    'Admin Portal';

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span className="brand">{roleName}</span>
          </Link>
        </div>
        
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Menu</div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="icon" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-nav" style={{ flex: 'none', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button className="sidebar-link" onClick={handleLogout}>
            <LogOut className="icon" />
            <span>Logout / Exit</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ marginLeft: 'var(--sidebar-width)', width: 'calc(100% - var(--sidebar-width))', background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <header style={{ height: '72px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 var(--space-6)', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-glass)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-4">
            <div className="badge badge-accent bg-accent-50 text-accent-700 border border-accent-200">Beta Mode</div>
            <div className="badge badge-neutral text-gray-600 border border-gray-200 capitalize">{currentRole} Context</div>
          </div>
        </header>

        <div className="container" style={{ padding: 'var(--space-8) var(--space-6)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
