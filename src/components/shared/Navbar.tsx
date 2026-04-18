'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/professionals-club-logo.png" alt="Professionals Club Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: '#0f172a' }}>
            Professionals <span style={{ color: '#e11d48', fontWeight: 500 }}>Club</span>
          </span>
        </Link>

        <ul className="navbar-links" style={mobileOpen ? { display: 'flex', position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', flexDirection: 'column', padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' } : {}}>
          <li><Link href="/">Home</Link></li>
          <li className="nav-dropdown-container">
            <Link href="/jobs" style={{ color: '#e11d48', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Jobs
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <ul className="nav-dropdown-menu">
              <li><Link href="/companies">Referrals</Link></li>
            </ul>
          </li>
          <li><Link href="/groups" style={{ color: '#e11d48', fontWeight: 700 }}>WhatsApp</Link></li>
          <li className="nav-dropdown-container">
            <Link href="/about" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              About Us
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <ul className="nav-dropdown-menu">
              <li><Link href="/how-it-works">How It Works</Link></li>
              <li><Link href="/team">Team</Link></li>
              <li><Link href="/support">Support Us</Link></li>
              <li><Link href="/donate">Donate Now</Link></li>
            </ul>
          </li>
          <li className="nav-dropdown-container">
            <Link href="/resources" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              Resources
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <ul className="nav-dropdown-menu">
              <li><Link href="/news">News</Link></li>
            </ul>
          </li>
          <li><Link href="/settlement">Newcomer</Link></li>

          <li><Link href="/events">Events</Link></li>
          <li><Link href="/businesses">Businesses</Link></li>
          
          {mobileOpen && (
            <li style={{ marginTop: 16 }}>
              <Link href="/portal/auth" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', width: '100%', padding: '12px 16px' }}>
                Member Login / Signup
              </Link>
            </li>
          )}
        </ul>

        <div className="navbar-actions">
          <Link href="/portal/auth" className="btn btn-primary mobile-hide">Member Login / Signup</Link>
          <button className="navbar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  );
}
