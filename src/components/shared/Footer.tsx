import React from 'react';
import Link from 'next/link';
import { Globe, AtSign, Camera, Briefcase, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-lg">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block', marginBottom: 'var(--space-4)' }}>
              <svg viewBox="0 0 210 44" width="180" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Maple Leaf Icon on the left */}
                <g transform="translate(0, 2)">
                  <path d="M18 2l2.02 4.55 4.35-.93-1.15 4.38 4.16-1.92-1.35 4.14 4.38.77-3.38 2.9 1.69 3.89-4.38-.88.9 4.27-3.03-1.35v5.44h-2.45v-5.44l-3.03 1.35.9-4.27-4.38.88 1.69-3.89-3.38-2.9 4.38-.77-1.35-4.14 4.16 1.92-1.15-4.38 4.35.93L18 2z" fill="#e85d04" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round" />
                </g>
                <text x="44" y="16" fill="#ffffff" fontSize="10" fontWeight="900" letterSpacing="1.8" fontFamily="var(--font-display), system-ui, sans-serif">
                  PROFESSIONALS
                </text>
                <text x="44" y="36" fill="#e85d04" fontSize="19.5" fontWeight="950" letterSpacing="0.8" fontFamily="var(--font-display), system-ui, sans-serif">
                  CLUB
                </text>
              </svg>
            </Link>
            <p>A managed community support desk for Indian professionals in Canada. Get help with job referrals, settlement, tax guidance, mentorship, and more — all admin-mediated.</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <span style={{ color: '#94a3b8', cursor: 'pointer' }}><Globe size={20} /></span>
              <span style={{ color: '#94a3b8', cursor: 'pointer' }}><AtSign size={20} /></span>
              <span style={{ color: '#94a3b8', cursor: 'pointer' }}><Camera size={20} /></span>
              <span style={{ color: '#94a3b8', cursor: 'pointer' }}><Briefcase size={20} /></span>
            </div>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><Link href="/portal/auth">Request Help</Link></li>
              <li><Link href="/portal/auth">Volunteer</Link></li>
              {process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false' && (
                <li><Link href="/matrimony">Matrimony</Link></li>
              )}
              <li><Link href="/about">How It Works</Link></li>
              <li><Link href="/portal/auth">Member Login</Link></li>
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
          <p>&copy; {new Date().getFullYear()} Professionals Club. All rights reserved. Built in Canada.</p>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Made with <Heart size={14} style={{ color: 'var(--primary-600)' }} /> for the Canadian professional community</p>
        </div>
      </div>
    </footer>
  );
}
