import React from 'react';
import Link from 'next/link';
import { Linkedin, Twitter, Instagram, Briefcase, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-lg">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="navbar-logo" style={{ marginBottom: 'var(--space-2)' }}>
              <div className="logo-icon">PC</div>
              <span>Professionals Club</span>
            </div>
            <p>A managed community support desk for Indian professionals in Canada. Get help with job referrals, settlement, tax guidance, mentorship, and more — all admin-mediated.</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <span style={{ color: '#94a3b8', cursor: 'pointer' }}><Linkedin size={20} /></span>
              <span style={{ color: '#94a3b8', cursor: 'pointer' }}><Twitter size={20} /></span>
              <span style={{ color: '#94a3b8', cursor: 'pointer' }}><Instagram size={20} /></span>
              <span style={{ color: '#94a3b8', cursor: 'pointer' }}><Briefcase size={20} /></span>
            </div>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><Link href="/portal/auth">Request Help</Link></li>
              <li><Link href="/portal/auth">Volunteer</Link></li>
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
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Made with <Heart size={14} style={{ color: '#e11d48' }} /> for the Canadian professional community</p>
        </div>
      </div>
    </footer>
  );
}
