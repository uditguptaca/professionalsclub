'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname?.startsWith(path + '/');
  };

  return (
    <nav className="navbar">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 210 44" width="210" height="44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            {/* Maple Leaf Icon on the left */}
            <g transform="translate(0, 2)">
              {/* Back glow for maple leaf */}
              <path d="M18 2l2.02 4.55 4.35-.93-1.15 4.38 4.16-1.92-1.35 4.14 4.38.77-3.38 2.9 1.69 3.89-4.38-.88.9 4.27-3.03-1.35v5.44h-2.45v-5.44l-3.03 1.35.9-4.27-4.38.88 1.69-3.89-3.38-2.9 4.38-.77-1.35-4.14 4.16 1.92-1.15-4.38 4.35.93L18 2z" fill="rgba(232, 93, 4, 0.25)" />
              {/* Maple Leaf border and fill */}
              <path d="M18 2l2.02 4.55 4.35-.93-1.15 4.38 4.16-1.92-1.35 4.14 4.38.77-3.38 2.9 1.69 3.89-4.38-.88.9 4.27-3.03-1.35v5.44h-2.45v-5.44l-3.03 1.35.9-4.27-4.38.88 1.69-3.89-3.38-2.9 4.38-.77-1.35-4.14 4.16 1.92-1.15-4.38 4.35.93L18 2z" fill="#e85d04" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round" />
            </g>
            
            {/* Stacked Typography on the right */}
            {/* "PROFESSIONALS" in small spaced uppercase white text */}
            <text x="44" y="16" fill="#ffffff" fontSize="10" fontWeight="900" letterSpacing="1.8" fontFamily="var(--font-display), system-ui, sans-serif">
              PROFESSIONALS
            </text>
            
            {/* "CLUB" in bold uppercase orange text */}
            <text x="44" y="36" fill="#e85d04" fontSize="19.5" fontWeight="950" letterSpacing="0.8" fontFamily="var(--font-display), system-ui, sans-serif">
              CLUB
            </text>
          </svg>
        </Link>

        <ul className="navbar-links" style={mobileOpen ? { display: 'flex', position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(12, 12, 14, 0.98)', flexDirection: 'column', gap: '16px', padding: 'var(--space-6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', alignItems: 'stretch' } : {}}>
          <li className="nav-dropdown-container">
            <Link href="/about" className={isActive('/about') || isActive('/how-it-works') || isActive('/team') || isActive('/support') || isActive('/donate') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              About Us
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <ul className="nav-dropdown-menu">
              <li><Link href="/how-it-works" className={isActive('/how-it-works') ? 'active' : ''}>How It Works</Link></li>
              <li><Link href="/team" className={isActive('/team') ? 'active' : ''}>Team</Link></li>
              <li><Link href="/support" className={isActive('/support') ? 'active' : ''}>Support Us</Link></li>
              <li><Link href="/donate" className={isActive('/donate') ? 'active' : ''}>Donate Now</Link></li>
            </ul>
          </li>
          <li className="nav-dropdown-container">
            <Link href="/jobs" className={isActive('/jobs') || isActive('/companies') || isActive('/build-resume') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              Jobs
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <ul className="nav-dropdown-menu">
              <li><Link href="/companies" className={isActive('/companies') ? 'active' : ''}>Referrals</Link></li>
              <li><Link href="/build-resume" className={isActive('/build-resume') ? 'active' : ''}>Build Resume</Link></li>
            </ul>
          </li>
          <li>
            <Link href="/groups" className={isActive('/groups') ? 'active' : ''}>
              WhatsApp
            </Link>
          </li>
          <li className="nav-dropdown-container">
            <Link href="/resources" className={isActive('/resources') || isActive('/news') || isActive('/e-books') || isActive('/youtube') || isActive('/blogs') || isActive('/recruit-firms') || isActive('/imp-links') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              Resources
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <ul className="nav-dropdown-menu">
              <li><Link href="/news" className={isActive('/news') ? 'active' : ''}>News</Link></li>
              <li><Link href="/e-books" className={isActive('/e-books') ? 'active' : ''}>E-Books</Link></li>
              <li><Link href="/youtube" className={isActive('/youtube') ? 'active' : ''}>YouTube</Link></li>
              <li><Link href="/blogs" className={isActive('/blogs') ? 'active' : ''}>Blogs</Link></li>
              <li><a href="https://www.forbes.com/advisor/ca/income-tax-calculator/" target="_blank" rel="noopener noreferrer">Tax Calculator</a></li>
              <li><Link href="/recruit-firms" className={isActive('/recruit-firms') ? 'active' : ''}>Recruit Firms</Link></li>
              <li><Link href="/imp-links" className={isActive('/imp-links') ? 'active' : ''}>Imp Links</Link></li>
            </ul>
          </li>
          <li><Link href="/settlement" className={isActive('/settlement') ? 'active' : ''}>Newcomer</Link></li>

          <li><Link href="/events" className={isActive('/events') ? 'active' : ''}>Events</Link></li>
          <li><Link href="/businesses" className={isActive('/businesses') ? 'active' : ''}>Businesses</Link></li>
          {process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false' && (
            <li><Link href="/matrimony" className={isActive('/matrimony') ? 'active' : ''}>Matrimony</Link></li>
          )}
          <li><Link href="/volunteers" className={isActive('/volunteers') ? 'active' : ''}>Volunteer</Link></li>
          {mobileOpen && (
            <li style={{ marginTop: 16 }}>
              <Link href="/portal/auth" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', width: '100%', padding: '12px 16px' }}>
                Login / Signup
              </Link>
            </li>
          )}
        </ul>

        <div className="navbar-actions">
          <Link href="/portal/auth" className="btn btn-primary mobile-hide" style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px' }}>Login / Signup</Link>
          <button className="navbar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
