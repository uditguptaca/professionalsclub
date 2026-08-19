'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { readAuthError } from '@/lib/auth/errors';
import { ConfirmProvider } from '@/components/portal/confirm';
import type { UserRole } from '@/types';
import {
  Home, HelpCircle, HandHeart, FileText, ClipboardList, MessageSquare,
  LogOut, BarChart3, Users, FolderKanban, Shield, ScrollText,
  UserCircle, Building2, Inbox, BookOpen, Calendar,
  UsersRound, Newspaper, Heart, Briefcase, X, LayoutGrid, ChevronRight, Megaphone, Mail, Send,
} from 'lucide-react';

/**
 * Portal chrome. Two form factors from one component:
 *
 *   ≥1024px — fixed forest sidebar plus a slim topbar, the classic desk layout.
 *   <1024px — a native-app shell: safe-area-aware top bar, a bottom tab bar
 *             with the four highest-traffic destinations, and a "More" sheet
 *             for everything else. This is the layout the store-published
 *             WebView app presents, so it follows phone conventions (44pt
 *             targets, thumb-reach navigation, no hover-dependent UI).
 *
 * Purely presentational as far as access control goes: whether this renders at
 * all is decided by the server layouts.
 */

type NavLink = { label: string; href: string; icon: typeof Home };

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
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const sheetCloseRef = React.useRef<HTMLButtonElement>(null);
  const moreRef = React.useRef<HTMLButtonElement>(null);

  const handleLogout = async () => {
    setSigningOut(true);
    // signOut throws on failure like the rest of the client. Navigating anyway
    // is deliberate: if the cookie survived, the proxy sends the user straight
    // back to the dashboard, which is a truthful outcome.
    try {
      await authClient.signOut();
    } catch (thrown) {
      console.error('[auth] Sign-out failed:', readAuthError(thrown).code);
    }
    router.replace('/portal/auth');
    router.refresh();
    setSigningOut(false);
  };

  // The sheet closes on navigation and on Escape, locks scroll while open, and
  // moves focus in so a keyboard or screen-reader user lands inside the dialog.
  React.useEffect(() => setSheetOpen(false), [pathname]);
  React.useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const sheet = sheetRef.current;
    // Captured now, not in the cleanup: the ref can point somewhere else by
    // the time this effect tears down (the react-hooks warning is right).
    const moreButton = moreRef.current;
    sheetCloseRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      // Hand focus back to the More button, but only if it is still inside the
      // sheet we are closing — a route change must not steal it from the page.
      if (sheet?.contains(document.activeElement)) moreButton?.focus();
    };
  }, [sheetOpen]);

  const isMatrimonyEnabled = process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false';

  const memberLinks: NavLink[] = [
    { label: 'Dashboard', href: '/portal/member/dashboard', icon: Home },
    { label: 'Community', href: '/portal/member/community', icon: UsersRound },
    { label: 'Jobs', href: '/portal/member/jobs', icon: Briefcase },
    { label: 'Referrals', href: '/portal/member/referrals', icon: Send },
    { label: 'My Profile', href: '/portal/member/profile', icon: UserCircle },
    ...(isMatrimonyEnabled ? [{ label: 'Matrimony', href: '/portal/member/matrimony', icon: Heart }] : []),
    { label: 'Request Help', href: '/portal/member/request-help', icon: HelpCircle },
    { label: 'Become a Volunteer', href: '/portal/member/volunteer', icon: HandHeart },
    { label: 'My Requests', href: '/portal/member/my-requests', icon: FileText },
    { label: 'My Volunteer Status', href: '/portal/member/my-volunteer', icon: ClipboardList },
    { label: 'Admin Messages', href: '/portal/member/messages', icon: MessageSquare },
    { label: 'Business Directory', href: '/portal/member/businesses', icon: Building2 },
  ];

  const adminLinks: NavLink[] = [
    { label: 'Overview', href: '/portal/admin/dashboard', icon: BarChart3 },
    { label: 'Community', href: '/portal/member/community', icon: UsersRound },
    ...(isMatrimonyEnabled ? [{ label: 'Matrimony', href: '/portal/admin/matrimony', icon: Heart }] : []),
    { label: 'Help Requests', href: '/portal/admin/requests', icon: FileText },
    { label: 'Volunteer Applications', href: '/portal/admin/volunteers', icon: HandHeart },
    { label: 'Assignments', href: '/portal/admin/assignments', icon: FolderKanban },
    { label: 'Members', href: '/portal/admin/members', icon: Users },
    { label: 'Message Center', href: '/portal/admin/messages', icon: MessageSquare },
    { label: 'Community Reports', href: '/portal/admin/community', icon: Megaphone },
    { label: 'Enquiries', href: '/portal/admin/inquiries', icon: Mail },
    { label: 'Companies', href: '/portal/admin/companies', icon: Building2 },
    { label: 'Audit Logs', href: '/portal/admin/audit', icon: ScrollText },
    { label: 'Businesses', href: '/portal/admin/businesses', icon: Building2 },
    { label: 'Biz Requests', href: '/portal/admin/business-requests', icon: Inbox },
  ];

  const adminContentLinks: NavLink[] = [
    { label: 'Resources', href: '/portal/admin/content/resources', icon: BookOpen },
    { label: 'Events', href: '/portal/admin/content/events', icon: Calendar },
    { label: 'Jobs', href: '/portal/admin/content/jobs', icon: Briefcase },
    { label: 'Team', href: '/portal/admin/content/team', icon: UsersRound },
    { label: 'News', href: '/portal/admin/content/news', icon: Newspaper },
    { label: 'Donations', href: '/portal/admin/content/donations', icon: Heart },
  ];

  const navLinks = role === 'admin' ? adminLinks : memberLinks;
  const roleName = role === 'admin' ? 'Admin Portal' : 'Help Desk';

  // Bottom tab bar: the four highest-traffic destinations plus More.
  const tabs: NavLink[] =
    role === 'admin'
      ? [adminLinks[0], adminLinks.find((l) => l.href.endsWith('/community'))!, adminLinks.find((l) => l.href.endsWith('/requests'))!, adminLinks.find((l) => l.href.endsWith('/messages'))!]
      : [memberLinks[0], memberLinks.find((l) => l.href.endsWith('/community'))!, memberLinks.find((l) => l.href.endsWith('/jobs'))!, memberLinks.find((l) => l.href.endsWith('/referrals'))!];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const renderSidebarLink = (link: NavLink) => {
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`sidebar-link ${isActive(link.href) ? 'active' : ''}`}
      >
        <Icon className="icon" size={18} />
        <span>{link.label}</span>
      </Link>
    );
  };

  const brand = (
    <Link href="/" className="portal-brand" aria-label="Professionals Club, home">
      <svg className="portal-brand-leaf" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
        <path
          d="M256 24l-30 56c-3 6-9 5-16 1l-38-20 21 100c4 20-9 20-17 11l-59-63-15 41c-2 4-6 4-13 3l-73-15 20 68c4 15 7 21-5 25l-31 15 137 111c6 5 8 13 5 21l-12 39 132-17c4 0 7 3 6 7l-6 100h34l-6-100c-1-4 2-7 6-7l132 17-12-39c-3-8-1-16 5-21l137-111-31-15c-12-4-9-10-5-25l20-68-73 15c-7 1-11 1-13-3l-15-41-59 63c-8 9-21 9-17-11l21-100-38 20c-7 4-13 5-16-1l-30-56z"
          fill="currentColor"
        />
      </svg>
      <span className="portal-brand-text">
        <strong>Professionals Club</strong>
        <small>{roleName}</small>
      </span>
    </Link>
  );

  return (
    <ConfirmProvider>
    <div className="portal-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">{brand}</div>

        <nav className="sidebar-nav" aria-label="Portal">
          <div className="sidebar-section-title">Menu</div>
          {navLinks.map(renderSidebarLink)}

          {role === 'admin' && (
            <>
              <div className="sidebar-section-title" style={{ marginTop: 16 }}>Content Manager</div>
              {adminContentLinks.map(renderSidebarLink)}
            </>
          )}
        </nav>

        <div className="sidebar-footer-nav">
          <button className="sidebar-link" onClick={handleLogout} disabled={signingOut}>
            <LogOut className="icon" size={18} />
            <span>{signingOut ? 'Signing out…' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      <main id="main" className="portal-main">
        <header className="portal-topbar">
          <div className="portal-topbar-brand">{brand}</div>

          <div className="portal-topbar-notice">
            <Shield size={14} aria-hidden="true" />
            <span>Admin-mediated &middot; No direct contact</span>
          </div>

          <div className="portal-topbar-user">
            <span className="portal-user-chip">
              <UserCircle size={14} aria-hidden="true" /> {userName}
            </span>
            <span className={`portal-role-chip ${role === 'admin' ? 'is-admin' : ''}`}>{role}</span>
          </div>
        </header>

        <div className="portal-content-area">
          {children}
        </div>
      </main>

      {/* Phone: bottom tab bar */}
      <nav className="tabbar" aria-label="Portal">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className={`tabbar-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon size={21} aria-hidden="true" />
              <span>{tab.label.replace('My Requests', 'Requests').replace('Request Help', 'Get Help').replace('Message Center', 'Messages').replace('Admin Messages', 'Messages')}</span>
            </Link>
          );
        })}
        <button
          type="button"
          ref={moreRef}
          className={`tabbar-item ${sheetOpen ? 'active' : ''}`}
          onClick={() => setSheetOpen((v) => !v)}
          aria-expanded={sheetOpen}
          aria-controls="portal-more-sheet"
        >
          <LayoutGrid size={21} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {/* Phone: the More sheet, everything not on the tab bar */}
      {sheetOpen && (
        <div className="sheet-scrim" onClick={() => setSheetOpen(false)} aria-hidden="true" />
      )}
      <div id="portal-more-sheet" ref={sheetRef} className={`portal-sheet ${sheetOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="More" hidden={!sheetOpen}>
        <div className="portal-sheet-head">
          <span className="portal-sheet-title">{roleName}</span>
          <button type="button" ref={sheetCloseRef} className="portal-sheet-close" onClick={() => setSheetOpen(false)} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="portal-sheet-user">
          <UserCircle size={28} aria-hidden="true" />
          <div>
            <strong>{userName}</strong>
            <small>{role === 'admin' ? 'Administrator' : 'Member'}</small>
          </div>
        </div>

        <nav className="portal-sheet-links" aria-label="All destinations">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : undefined}>
                <Icon size={18} aria-hidden="true" />
                <span>{link.label}</span>
                <ChevronRight size={15} aria-hidden="true" className="sheet-arrow" />
              </Link>
            );
          })}
          {role === 'admin' && (
            <>
              <div className="portal-sheet-section">Content manager</div>
              {adminContentLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : undefined}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{link.label}</span>
                    <ChevronRight size={15} aria-hidden="true" className="sheet-arrow" />
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <button type="button" className="portal-sheet-logout" onClick={handleLogout} disabled={signingOut}>
          <LogOut size={17} aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </div>
    </ConfirmProvider>
  );
}
