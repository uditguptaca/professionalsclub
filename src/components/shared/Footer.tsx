import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-lg">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="navbar-logo" style={{ marginBottom: 'var(--space-2)' }}>
              <div className="logo-icon">IC</div>
              <span>IndoCanada Club</span>
            </div>
            <p>Canada&apos;s trusted professional network and referral marketplace. Connecting talented professionals with opportunities at top Canadian companies.</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <span style={{ fontSize: '1.2rem', cursor: 'pointer' }}>🔗</span>
              <span style={{ fontSize: '1.2rem', cursor: 'pointer' }}>🐦</span>
              <span style={{ fontSize: '1.2rem', cursor: 'pointer' }}>📸</span>
              <span style={{ fontSize: '1.2rem', cursor: 'pointer' }}>💼</span>
            </div>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><Link href="/how-it-works">How It Works</Link></li>
              <li><Link href="/companies">Companies</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/for-employees">For Employees</Link></li>
              <li><Link href="/success-stories">Success Stories</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Community</h4>
            <ul>
              <li><Link href="/community">Discussions</Link></li>
              <li><Link href="/events">Events & Meetups</Link></li>
              <li><Link href="/news">Career News</Link></li>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/faq">Help Center</Link></li>
              <li><Link href="/news">Blog</Link></li>
              <li><Link href="/faq">API Docs</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link href="/faq">Terms of Service</Link></li>
              <li><Link href="/faq">Privacy Policy</Link></li>
              <li><Link href="/faq">Cookie Policy</Link></li>
              <li><Link href="/faq">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} IndoCanada Club. All rights reserved. Built in Canada 🇨🇦</p>
          <p>Made with ❤️ for the Canadian professional community</p>
        </div>
      </div>
    </footer>
  );
}
