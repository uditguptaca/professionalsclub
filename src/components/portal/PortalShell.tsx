'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { readAuthError } from '@/lib/auth/errors';
import { ConfirmProvider } from '@/components/portal/confirm';
import { NotificationProvider, useNotifications } from '@/context/notification-context';
import NotificationBell from '@/components/portal/NotificationBell';
import { stopPush, registeredToken, isNativePush } from '@/lib/push';
import { unregisterPushDeviceAction } from '@/app/actions/push';
import { readCache, writeCache, onIdle, CACHE_KEYS } from '@/lib/swr-cache';
import { fetchHomeFeed } from '@/app/actions/portal';
import { fetchCommunityStart } from '@/app/actions/community';
import { fetchCompanies } from '@/app/actions/referrals';
import { chatStart } from '@/app/actions/chat';
import { notificationsStartAction } from '@/app/actions/notifications';
import type { UserRole } from '@/types';
import {
  Home, HelpCircle, HandHeart, FileText, ClipboardList, MessageSquare,
  LogOut, BarChart3, Users, FolderKanban, Shield, ScrollText,
  UserCircle, Building2, Inbox, BookOpen, Calendar,
  UsersRound, Newspaper, Heart, Briefcase, X, LayoutGrid, ChevronRight, Megaphone, Mail, Send, MessageCircle,
  Bell,
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

/**
 * Tabs worth warming in the background, and the ONE action each of them needs.
 *
 * Every member page now loads from a single combined action, which is what
 * makes this possible at all: warming a tab is one round trip, and the result
 * is stored under the exact key that page reads, so a tab switch paints from
 * memory with no network at all.
 *
 * Matrimony and Referrals are deliberately absent. They live behind the More
 * sheet, and a warm costs the member a request on a phone connection - only
 * the tab bar's own destinations earn that.
 */
const WARM: {
  href: string;
  key: string;
  load: () => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>;
}[] = [
  { href: '/portal/member/dashboard', key: CACHE_KEYS.dashboard, load: fetchHomeFeed },
  { href: '/portal/member/community', key: CACHE_KEYS.community, load: fetchCommunityStart },
  { href: '/portal/member/chats', key: CACHE_KEYS.chats, load: chatStart },
  { href: '/portal/member/jobs', key: CACHE_KEYS.jobs, load: fetchCompanies },
  { href: '/portal/member/notifications', key: CACHE_KEYS.notifications, load: () => notificationsStartAction({}) },
];

/** Events is a server component, so there is nothing to cache - only its RSC payload. */
const WARM_ROUTES = [...WARM.map((w) => w.href), '/portal/member/events'];

/** ms between warms. */
const WARM_GAP_MS = 300;
/** Longest we wait for the current page to stop loading before warming anyway. */
const WARM_SETTLE_MAX_MS = 8000;

/**
 * Resolves once the page the member is looking at has stopped waiting on data.
 *
 * `<PortalLoading />` marks its skeleton `aria-busy="true"`, so that attribute
 * is the portal's own answer to "is this screen still loading". Waiting for it
 * to clear is what keeps a background warm from queueing IN FRONT of the
 * current page's own fetch - Next runs a client's Server Action calls strictly
 * one at a time, so a 300ms stagger alone cannot prevent that. Caps out rather
 * than waiting forever, in case a screen leaves a skeleton up.
 */
function whenSettled(cancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const deadline = Date.now() + WARM_SETTLE_MAX_MS;
    const tick = () => {
      if (cancelled()) return resolve();
      const busy = document.querySelector('[aria-busy="true"]') !== null;
      if (!busy || Date.now() > deadline) return resolve();
      setTimeout(tick, 200);
    };
    // One beat first: a page that is about to show a skeleton has not
    // necessarily rendered it yet when the browser first goes idle.
    setTimeout(tick, 400);
  });
}

/**
 * Warm the other tabs once, after this page has settled.
 *
 * Two things keep this from making the app feel WORSE, and both matter:
 *
 *   - Next runs a client's Server Action calls strictly one at a time. So a
 *     warm in flight delays whatever the member does next by one round trip.
 *     The first touch, key press or navigation therefore cancels every warm
 *     that has not started - the member's own intent always outranks a guess.
 *   - Each warm re-checks the cache immediately before firing, so a tab the
 *     member opened in the meantime is skipped rather than fetched twice.
 */
function useWarmOtherTabs(role: UserRole, pathname: string, router: ReturnType<typeof useRouter>) {
  React.useEffect(() => {
    if (role !== 'member') return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stop = () => { cancelled = true; for (const t of timers) clearTimeout(t); };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    for (const e of events) window.addEventListener(e, stop, { once: true, passive: true });

    const cancelIdle = onIdle(async () => {
      if (cancelled) return;
      // The RSC payload first: it is cheap, it does not go through the action
      // queue, and it is what makes the tab bar itself feel instant.
      // staleTimes.dynamic in next.config.ts is what lets the router keep it.
      for (const href of WARM_ROUTES) if (href !== pathname) router.prefetch(href);

      await whenSettled(() => cancelled);
      if (cancelled) return;

      let slot = 0;
      for (const w of WARM) {
        if (w.href === pathname) continue;   // this page is fetching it already
        timers.push(setTimeout(async () => {
          if (cancelled || readCache(w.key) !== undefined) return;
          const res = await w.load();
          if (!cancelled && res.ok) writeCache(w.key, res.data);
        }, slot++ * WARM_GAP_MS));
      }
    });

    return () => {
      stop();
      cancelIdle();
      for (const e of events) window.removeEventListener(e, stop);
    };
    // Mount only. Each page writes its own key as it loads, so a second pass
    // after a navigation would find nothing left to warm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function PortalShell(props: {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}) {
  // The provider wraps the chrome, not just the page: the tab bar and the
  // More sheet carry unread badges, so they are consumers too.
  return (
    <NotificationProvider>
      <PortalChrome {...props} />
    </NotificationProvider>
  );
}

function PortalChrome({
  role,
  userName,
  children,
}: {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { counts } = useNotifications();
  const router = useRouter();
  useWarmOtherTabs(role, pathname, router);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const sheetCloseRef = React.useRef<HTMLButtonElement>(null);
  const moreRef = React.useRef<HTMLButtonElement>(null);

  const handleLogout = async () => {
    setSigningOut(true);
    // Drop this device's token BEFORE the session goes away, or the action has
    // no caller to authorise it. Otherwise the next person to open the app on a
    // shared or handed-down phone keeps receiving this member's notifications.
    if (isNativePush()) {
      const token = registeredToken();
      if (token) {
        const r = await unregisterPushDeviceAction(token);
        if (!r.ok) console.error('[push] could not remove this device:', r.error);
      }
      await stopPush();
    }
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
    { label: 'Events', href: '/portal/member/events', icon: Calendar },
    { label: 'Chats', href: '/portal/member/chats', icon: MessageCircle },
    { label: 'Referrals', href: '/portal/member/referrals', icon: Send },
    { label: 'Notifications', href: '/portal/member/notifications', icon: Bell },
    { label: 'My Profile', href: '/portal/member/profile', icon: UserCircle },
    ...(isMatrimonyEnabled ? [{ label: 'Matrimony', href: '/portal/member/matrimony', icon: Heart }] : []),
    { label: 'Request Help', href: '/portal/member/request-help', icon: HelpCircle },
    { label: 'Become a Volunteer', href: '/portal/member/volunteer', icon: HandHeart },
    { label: 'My Requests', href: '/portal/member/my-requests', icon: FileText },
    { label: 'My Volunteer Status', href: '/portal/member/my-volunteer', icon: ClipboardList },
    { label: 'Admin Messages', href: '/portal/member/messages', icon: MessageSquare },
    { label: 'Business Directory', href: '/portal/member/businesses', icon: Building2 },
    { label: 'My Business', href: '/portal/member/business', icon: Building2 },
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
    { label: 'Notifications', href: '/portal/member/notifications', icon: Bell },
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
      : [memberLinks[0], memberLinks.find((l) => l.href.endsWith('/community'))!, memberLinks.find((l) => l.href.endsWith('/events'))!, memberLinks.find((l) => l.href.endsWith('/jobs'))!, memberLinks.find((l) => l.href.endsWith('/chats'))!];

  // The More sheet: what the tab bar does NOT already show, in small groups.
  // Repeating the four tab destinations here was pure clutter - the bar is
  // visible right behind the sheet. My Profile lives on the user card.
  const pick = (links: NavLink[], suffixes: string[]) =>
    suffixes.flatMap((sfx) => links.find((l) => l.href.endsWith(sfx)) ?? []);
  const tabHrefs = new Set(tabs.map((t) => t.href));
  const sheetGroups: { title: string; links: NavLink[] }[] =
    role === 'admin'
      ? [
          { title: 'Manage', links: adminLinks.filter((l) => !tabHrefs.has(l.href)) },
          { title: 'Content manager', links: adminContentLinks },
        ]
      : [
          { title: 'Activity', links: pick(memberLinks, ['/notifications']) },
          { title: 'Career & connections', links: pick(memberLinks, ['/referrals', '/businesses', '/business', '/matrimony']) },
          { title: 'Help desk', links: pick(memberLinks, ['/request-help', '/my-requests', '/messages']) },
          { title: 'Volunteering', links: pick(memberLinks, ['/volunteer', '/my-volunteer']) },
        ];

  // Chats carries its own count, so More badges what is left. Otherwise the
  // same message would be counted twice on one bar.
  const moreBadge = Math.max(0, counts.total - (counts.byCategory.chat ?? 0));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // ---- Back navigation -----------------------------------------------------
  // iOS has no hardware back button and this is a WebView, so a page reached by
  // tapping something had no way out except the tab bar - which throws away
  // where you were. Handled once here rather than in fifty pages.
  //
  // The tab bar's own destinations are roots: they are always one tap away, so
  // a back control on them would only offer to leave the app.
  const atRoot = tabHrefs.has(pathname);

  // Whether anything has been navigated to inside this shell. A cold deep link
  // (a push notification, a shared URL, the app's start URL) has no in-app
  // history, and history.back() there would leave the app entirely - so those
  // walk up to the parent section instead.
  const navigated = React.useRef(false);
  const startPath = React.useRef(pathname);
  React.useEffect(() => {
    if (pathname !== startPath.current) navigated.current = true;
  }, [pathname]);

  /** The nearest ancestor route that actually exists, else the dashboard. */
  const parentOf = (path: string): string => {
    const known = new Set<string>([
      ...navLinks.map((l) => l.href),
      ...(role === 'admin' ? adminContentLinks.map((l) => l.href) : []),
    ]);
    const parts = path.split('/').filter(Boolean);
    while (parts.length > 2) {
      parts.pop();
      const candidate = '/' + parts.join('/');
      if (known.has(candidate)) return candidate;
    }
    return tabs[0].href;
  };

  const goBack = () => {
    // Only our own in-app navigation counts. window.history.length looks like
    // the better signal and is a trap: a tab that opened straight onto a deep
    // link already has length 2 (the blank page it started from), so trusting
    // it sent Back out of the app to a blank screen. A member who reloaded a
    // page therefore lands on the parent section rather than their previous
    // page - a smaller cost than Back appearing to break the app.
    if (navigated.current) router.back();
    else router.push(parentOf(pathname));
  };

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
            <NotificationBell />
            <span className="portal-user-chip">
              <UserCircle size={14} aria-hidden="true" /> {userName}
            </span>
            <span className={`portal-role-chip ${role === 'admin' ? 'is-admin' : ''}`}>{role}</span>
          </div>
        </header>

        {/* Phone back bar. A sibling ABOVE the content area, not inside it:
            pages with a full-bleed hero cancel the content padding with a
            negative margin, and a row inside would be covered by it. */}
        {!atRoot && (
          <div className="portal-back">
            <button type="button" onClick={goBack} aria-label="Go back">
              <ChevronRight size={18} aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
              <span>Back</span>
            </button>
          </div>
        )}

        <div className={`portal-content-area${!atRoot ? ' has-back' : ''}`}>
          {children}
        </div>
      </main>

      {/* Phone: bottom tab bar */}
      <nav className="tabbar" aria-label="Portal">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          // Chats badges its own unread; everything else that made noise is
          // counted on More, which is where the inbox lives on a phone.
          const badge = tab.href.endsWith('/chats') ? (counts.byCategory.chat ?? 0) : 0;
          return (
            <Link key={tab.href} href={tab.href} className={`tabbar-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon size={21} aria-hidden="true" />
              {badge > 0 && (
                <span className="tabbar-dot" aria-label={`${badge} unread`}>{badge > 9 ? '9+' : badge}</span>
              )}
              <span>{tab.label.replace('Dashboard', 'Home').replace('Overview', 'Home').replace('My Requests', 'Requests').replace('Request Help', 'Get Help').replace('Message Center', 'Messages').replace('Admin Messages', 'Messages')}</span>
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
          {moreBadge > 0 && (
            <span className="tabbar-dot" aria-label={`${moreBadge} unread`}>{moreBadge > 9 ? '9+' : moreBadge}</span>
          )}
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

        {role === 'admin' ? (
          <div className="portal-sheet-user">
            <UserCircle size={28} aria-hidden="true" />
            <div>
              <strong>{userName}</strong>
              <small>Administrator</small>
            </div>
          </div>
        ) : (
          <Link href="/portal/member/profile" className="portal-sheet-user">
            <UserCircle size={28} aria-hidden="true" />
            <div>
              <strong>{userName}</strong>
              <small>Member &middot; View profile</small>
            </div>
            <ChevronRight size={16} aria-hidden="true" className="sheet-arrow" />
          </Link>
        )}

        <nav className="portal-sheet-links" aria-label="All destinations">
          {sheetGroups.map((group) =>
            group.links.length === 0 ? null : (
              <React.Fragment key={group.title}>
                <div className="portal-sheet-section">{group.title}</div>
                <div className="portal-sheet-group">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : undefined}>
                        <Icon size={18} aria-hidden="true" />
                        <span>{link.label}</span>
                        {link.href.endsWith('/notifications') && counts.total > 0 && (
                          <span className="nt-row-count">{counts.total > 99 ? '99+' : counts.total}</span>
                        )}
                        <ChevronRight size={15} aria-hidden="true" className="sheet-arrow" />
                      </Link>
                    );
                  })}
                </div>
              </React.Fragment>
            )
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
