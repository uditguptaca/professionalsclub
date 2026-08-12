import React from 'react';
import Link from 'next/link';

/**
 * Site footer.
 *
 * What changed and why:
 *
 *   - The wordmark was an <svg> with <text> nodes, same problem as the navbar:
 *     SVG text does not pick up a webfont and is invisible to search and to
 *     screen readers. It is real HTML now.
 *   - Four columns of links included duplicates (three separate links to
 *     /faq#general) and two that described things that do not exist — "API Docs"
 *     and a "Refund Policy" for a platform that never takes payment. Removed
 *     rather than relabelled; a link farm padded with fiction is worse than a
 *     short honest list.
 *   - The four social icons were <span>s with cursor:pointer and no href. They
 *     looked clickable and did nothing. Removed until there are real accounts to
 *     point at.
 *   - Legal moved into the bottom bar, which is where people look for it.
 */

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Get help',
    links: [
      { href: '/portal/auth', label: 'Request help' },
      { href: '/jobs', label: 'Jobs and referrals' },
      { href: '/settlement', label: 'Settlement guides' },
      { href: '/build-resume', label: 'Build a resume' },
      { href: '/faq', label: 'Questions and answers' },
    ],
  },
  {
    heading: 'Take part',
    links: [
      { href: '/volunteers', label: 'Volunteer with us' },
      { href: '/events', label: 'Events and meetups' },
      { href: '/groups', label: 'WhatsApp groups' },
      { href: '/businesses', label: 'Business directory' },
      { href: '/donate', label: 'Donate' },
    ],
  },
  {
    heading: 'About',
    links: [
      { href: '/about', label: 'Who we are' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/team', label: 'Team' },
      { href: '/news', label: 'News and blog' },
      { href: '/contact', label: 'Contact' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const matrimonyEnabled = process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false';

  return (
    <footer className="footer-editorial">
      <div className="container">
        <div className="footer-editorial-top">
          <div className="footer-editorial-brand">
            <Link href="/" className="wordmark wordmark-inverse" aria-label="Professionals Club, home">
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

            <p className="footer-editorial-blurb">
              Job referrals, settlement help, mentorship and community for
              newcomers to Canada. Free, run by volunteers who arrived the same
              way you did.
            </p>

            <Link href="/portal/auth" className="btn btn-primary footer-editorial-cta">
              Join the club
            </Link>
          </div>

          <nav className="footer-editorial-cols" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <h2>{col.heading}</h2>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                  {col.heading === 'Take part' && matrimonyEnabled && (
                    <li>
                      <Link href="/matrimony">Matrimony</Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="footer-editorial-bottom">
          <p>&copy; {year} Professionals Club. Built in Canada.</p>
          <ul>
            <li><Link href="/faq#terms">Terms</Link></li>
            <li><Link href="/faq#privacy">Privacy</Link></li>
            <li><Link href="/faq#cookie">Cookies</Link></li>
            <li><Link href="/support">Support us</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
