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
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(232, 93, 4, 0.12)', border: '1.5px solid var(--primary-600)', boxShadow: '0 0 15px rgba(232, 93, 4, 0.25)', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l1.35 3.03 2.9-.62-.77 2.92 2.77-1.28-.9 2.76 2.92.51-2.25 1.94 1.13 2.59-2.92-.59.6 2.85-2.02-.9v3.63h-1.63v-3.63l-2.02.9.6-2.85-2.92.59 1.13-2.59-2.25-1.94 2.92-.51-.9-2.76 2.77 1.28-.77-2.92 2.9.62L12 2z" fill="#e85d04" stroke="#ffffff" strokeWidth="0.75" />
            </svg>
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: '#ffffff', whiteSpace: 'nowrap' }}>
            Professionals <span style={{ color: 'var(--primary-600)' }}>Club</span>
          </span>
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
          <Link href="/portal/auth" className="btn btn-primary mobile-hide">Login / Signup</Link>
          <button className="navbar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
