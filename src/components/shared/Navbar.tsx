'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, ChevronDown, ArrowRight, ArrowUpRight,
  Info, Workflow, Users, HandHeart, Gift, Phone,
  Briefcase, UserCheck, FileText, Building,
  Map, Newspaper, BookOpen, PlaySquare, PenSquare, Link2, Calculator,
  CalendarDays, MessageCircle, Store, Heart, LifeBuoy, Mail,
} from 'lucide-react';

/**
 * Site navigation: four top-level groups, each opening a glass megamenu of
 * icon + description rows, plus one emphasized CTA per menu. Everything the
 * old ten-link bar pointed at still exists — reorganized, not removed.
 *
 * Interaction model: hover or focus-within opens a menu (CSS-driven, so it
 * works without JS); the mobile panel lists every group flat. Escape closes
 * whichever is open — a megamenu by dropping focus out of it — and route
 * changes close the mobile panel; body scroll locks while it is open.
 */

type MegaItem = { href: string; label: string; desc: string; icon: React.ReactNode; external?: boolean };
type MegaGroup = {
  label: string;
  href: string;
  items: MegaItem[];
  cta: { href: string; label: string };
};

const GROUPS: MegaGroup[] = [
  {
    label: 'About',
    href: '/about',
    items: [
      { href: '/about', label: 'Who we are', desc: 'The club, its mission, its people', icon: <Info size={17} /> },
      { href: '/how-it-works', label: 'How it works', desc: 'From request to resolution', icon: <Workflow size={17} /> },
      { href: '/team', label: 'Team', desc: 'The volunteers behind the desk', icon: <Users size={17} /> },
      { href: '/support', label: 'Support us', desc: 'Ways to keep this running', icon: <HandHeart size={17} /> },
      { href: '/donate', label: 'Donate', desc: 'Every dollar goes to programs', icon: <Gift size={17} /> },
      { href: '/contact', label: 'Contact', desc: 'Reach the organizing team', icon: <Phone size={17} /> },
    ],
    cta: { href: '/portal/signup', label: 'Join the club free' },
  },
  {
    label: 'Careers',
    href: '/jobs',
    items: [
      { href: '/jobs', label: 'Jobs board', desc: 'Openings shared by members weekly', icon: <Briefcase size={17} /> },
      { href: '/companies', label: 'Referrals', desc: 'We check for a member inside', icon: <UserCheck size={17} /> },
      { href: '/build-resume', label: 'Build a resume', desc: 'Canadian-format resume, free', icon: <FileText size={17} /> },
      { href: '/recruit-firms', label: 'Recruitment firms', desc: 'Agencies that hire newcomers', icon: <Building size={17} /> },
    ],
    cta: { href: '/portal/auth', label: 'Request career help' },
  },
  {
    label: 'Resources',
    href: '/resources',
    items: [
      { href: '/settlement', label: 'Settlement guides', desc: 'Housing, banking, SIN, health card', icon: <Map size={17} /> },
      { href: '/news', label: 'News', desc: 'Immigration and career updates', icon: <Newspaper size={17} /> },
      { href: '/e-books', label: 'E-books', desc: 'Newcomer guides to keep', icon: <BookOpen size={17} /> },
      { href: '/youtube', label: 'Video library', desc: 'Talks, webinars and walkthroughs', icon: <PlaySquare size={17} /> },
      { href: '/blogs', label: 'Blog', desc: 'Stories and practical advice', icon: <PenSquare size={17} /> },
      { href: '/imp-links', label: 'Useful links', desc: 'Official portals in one place', icon: <Link2 size={17} /> },
      { href: 'https://www.forbes.com/advisor/ca/income-tax-calculator/', label: 'Tax calculator', desc: 'Estimate your first return', icon: <Calculator size={17} />, external: true },
    ],
    cta: { href: '/settlement', label: 'Start with the guides' },
  },
  {
    label: 'Community',
    href: '/community',
    items: [
      { href: '/events', label: 'Events & meetups', desc: 'Monthly, in person, ten provinces', icon: <CalendarDays size={17} /> },
      { href: '/groups', label: 'WhatsApp groups', desc: 'Six communities, 6,000+ members', icon: <MessageCircle size={17} /> },
      { href: '/businesses', label: 'Business directory', desc: 'Vetted by members who used them', icon: <Store size={17} /> },
      { href: '/volunteers', label: 'Volunteer', desc: 'Give an hour, change a landing', icon: <LifeBuoy size={17} /> },
    ],
    cta: { href: '/events', label: 'See what is on this month' },
  },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Which megamenu is showing. CSS :hover/:focus-within still does the opening;
  // this only mirrors it so the trigger can report aria-expanded truthfully.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const pathname = usePathname();

  const isActive = useCallback(
    (path: string) => (path === '/' ? pathname === '/' : pathname === path || pathname?.startsWith(path + '/')),
    [pathname]
  );

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const matrimonyEnabled = process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false';
  const groups: MegaGroup[] = matrimonyEnabled
    ? GROUPS.map((g) =>
        g.label === 'Community'
          ? { ...g, items: [...g.items, { href: '/matrimony', label: 'Matrimony', desc: 'Verified profiles, privacy first', icon: <Heart size={17} /> }] }
          : g
      )
    : GROUPS;

  const groupActive = (g: MegaGroup) =>
    isActive(g.href) || g.items.some((it) => !it.external && isActive(it.href));

  return (
    <header className={`nav-shell ${scrolled ? 'is-scrolled' : ''}`}>
      {/* Orange utility bar: the community line and the essentials. */}
      <div className="nav-topbar">
        <div className="container nav-topbar-inner">
          <p>For newcomers and professionals building their future in Canada</p>
          <div className="nav-topbar-links">
            <a href="mailto:support@professionalsclub.ca">
              <Mail size={13} aria-hidden="true" /> support@professionalsclub.ca
            </a>
            <Link href="/groups">
              <MessageCircle size={13} aria-hidden="true" /> Join 6,000+ on WhatsApp
            </Link>
          </div>
        </div>
      </div>

      <div className="container nav-inner">
        <Link href="/" className="wordmark" aria-label="Professionals Club, home">
          <svg className="wordmark-leaf" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
            <path
              d="M256 24l-30 56c-3 6-9 5-16 1l-38-20 21 100c4 20-9 20-17 11l-59-63-15 41c-2 4-6 4-13 3l-73-15 20 68c4 15 7 21-5 25l-31 15 137 111c6 5 8 13 5 21l-12 39 132-17c4 0 7 3 6 7l-6 100h34l-6-100c-1-4 2-7 6-7l132 17-12-39c-3-8-1-16 5-21l137-111-31-15c-12-4-9-10-5-25l20-68-73 15c-7 1-11 1-13-3l-15-41-59 63c-8 9-21 9-17-11l21-100-38 20c-7 4-13 5-16-1l-30-56z"
              fill="currentColor"
            />
          </svg>
          <span className="wordmark-text">
            <span className="wordmark-top">Professionals</span>
            <span className="wordmark-bottom">Club</span>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          <ul>
            {groups.map((g) => (
              <li
                key={g.label}
                className="has-mega"
                onMouseEnter={() => setOpenGroup(g.label)}
                onMouseLeave={() => setOpenGroup((v) => (v === g.label ? null : v))}
                onFocus={() => setOpenGroup(g.label)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setOpenGroup((v) => (v === g.label ? null : v));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') return;
                  setOpenGroup(null);
                  (document.activeElement as HTMLElement | null)?.blur();
                }}
              >
                <Link
                  href={g.href}
                  className={groupActive(g) ? 'active' : undefined}
                  aria-current={isActive(g.href) ? 'page' : undefined}
                  aria-haspopup="true"
                  aria-expanded={openGroup === g.label}
                >
                  {g.label}
                  <ChevronDown size={13} aria-hidden="true" className="mega-caret" />
                </Link>

                <div className="nav-mega" aria-label={g.label}>
                  <ul className="nav-mega-grid">
                    {g.items.map((it) =>
                      it.external ? (
                        <li key={it.href}>
                          <a href={it.href} target="_blank" rel="noopener noreferrer">
                            <span className="nav-mega-icon">{it.icon}</span>
                            <span className="nav-mega-body">
                              <strong>{it.label} <ArrowUpRight size={11} aria-hidden="true" /></strong>
                              <small>{it.desc}</small>
                            </span>
                          </a>
                        </li>
                      ) : (
                        <li key={it.href}>
                          <Link href={it.href} aria-current={isActive(it.href) ? 'page' : undefined}>
                            <span className="nav-mega-icon">{it.icon}</span>
                            <span className="nav-mega-body">
                              <strong>{it.label}</strong>
                              <small>{it.desc}</small>
                            </span>
                          </Link>
                        </li>
                      )
                    )}
                  </ul>
                  <Link href={g.cta.href} className="nav-mega-cta">
                    {g.cta.label} <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav-actions">
          <Link href="/portal/auth" className="btn btn-primary btn-sm nav-cta">Sign in</Link>
          <button
            type="button"
            className="nav-burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div id="mobile-nav" className={`nav-panel ${mobileOpen ? 'is-open' : ''}`} hidden={!mobileOpen}>
        <div className="container">
          <ul>
            {groups.map((g) => (
              <li key={g.label}>
                <Link href={g.href} className={groupActive(g) ? 'active' : undefined}>{g.label}</Link>
                <div className="nav-panel-sub">
                  {g.items.map((it) =>
                    it.external ? (
                      <a key={it.href} href={it.href} target="_blank" rel="noopener noreferrer">{it.label}</a>
                    ) : (
                      <Link key={it.href} href={it.href}>{it.label}</Link>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Link href="/portal/auth" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
