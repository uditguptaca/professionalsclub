'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <img src="/logo.png" alt="IndoCanada Club Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <span>IndoCanada <span className="text-gradient">Club</span></span>
        </Link>

        <ul className="navbar-links" style={mobileOpen ? { display: 'flex', position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', flexDirection: 'column', padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' } : {}}>
          <li><Link href="/about">About</Link></li>
          <li><Link href="/settlement">Settlement</Link></li>
          <li><Link href="/resources">Resources</Link></li>
          <li><Link href="/events">Events</Link></li>
          <li><Link href="/community">Community Hub</Link></li>
          <li><Link href="/companies">Companies</Link></li>
          <li><Link href="/news">News</Link></li>
          <li><Link href="/pricing">Pricing</Link></li>
        </ul>

        <div className="navbar-actions">
          <Link href="/portal/auth" className="btn btn-ghost">Log In</Link>
          <Link href="/portal/auth" className="btn btn-primary">Join Free</Link>
          <button className="navbar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  );
}
