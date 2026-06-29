import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { 
  ArrowRight, 
  Download, 
  MapPin, 
  FileText, 
  CheckCircle, 
  Home as HomeIcon, 
  Landmark, 
  ShieldCheck, 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Send, 
  CreditCard, 
  Hospital, 
  User, 
  HeartPulse, 
  Shield, 
  ClipboardList, 
  Bus, 
  Car, 
  Users, 
  Briefcase, 
  FileCheck 
} from 'lucide-react';

export default function SettlementPage() {
  const categories = [
    {
      badge: 'Housing Support',
      title: 'Housing & Rentals',
      desc: 'Finding your first home in Canada. Understanding leases, credit scores for rentals, and popular neighborhoods for newcomers.',
      items: [
        { label: 'Rental Market Guide', icon: <MapPin size={18} /> },
        { label: 'Credit Score Rules', icon: <Landmark size={18} /> },
        { label: 'Tenant Rights', icon: <ShieldCheck size={18} /> },
        { label: 'Housing Options', icon: <HomeIcon size={18} /> },
        { label: 'Lease Guarantors', icon: <FileText size={18} /> },
        { label: 'Utility & WiFi Setup', icon: <Globe size={18} /> },
      ],
      buttonText: 'Request Housing Help',
      imgSide: 'right',
      image: '/housing_bg.png',
      imgOverlayText: 'Newcomer Housing Support'
    },
    {
      badge: 'Financial Literacy',
      title: 'Financial Literacy & Banking',
      desc: 'Setting up your Canadian financial life. Open accounts, build credit, and understand the tax system from day one.',
      items: [
        { label: 'Opening Bank Accounts', icon: <Landmark size={18} /> },
        { label: 'Building Credit Score', icon: <TrendingUp size={18} /> },
        { label: 'Income Tax & GST', icon: <DollarSign size={18} /> },
        { label: 'RRSP & TFSA Savings', icon: <Wallet size={18} /> },
        { label: 'Money Transfers', icon: <Send size={18} /> },
        { label: 'Credit Card Choice', icon: <CreditCard size={18} /> },
      ],
      buttonText: 'Request Financial Help',
      imgSide: 'left',
      image: '/finance_bg.png',
      imgOverlayText: 'Newcomer Financial Services'
    },
    {
      badge: 'Healthcare Setup',
      title: 'Healthcare Access',
      desc: 'Navigating the universal healthcare system. Getting your provincial health card and finding doctors.',
      items: [
        { label: 'Provincial Health Cards', icon: <Hospital size={18} /> },
        { label: 'Find Family Doctors', icon: <User size={18} /> },
        { label: 'Walk-in Clinics', icon: <MapPin size={18} /> },
        { label: 'Emergency vs Urgent', icon: <HeartPulse size={18} /> },
        { label: 'Dental & Vision Cover', icon: <Shield size={18} /> },
        { label: 'Prescription Services', icon: <ClipboardList size={18} /> },
      ],
      buttonText: 'Request Healthcare Help',
      imgSide: 'right',
      image: '/healthcare_bg.png',
      imgOverlayText: 'Newcomer Healthcare Assistance'
    },
    {
      badge: 'Transit & Driving',
      title: 'Transportation & Driving',
      desc: 'Getting around your new city. Public transit, driver license exchange, and buying your first car.',
      items: [
        { label: 'License Exchange', icon: <ClipboardList size={18} /> },
        { label: 'Public Transit Guide', icon: <Bus size={18} /> },
        { label: 'Car Insurance Setup', icon: <ShieldCheck size={18} /> },
        { label: 'Winter Driving Tips', icon: <Car size={18} /> },
        { label: 'Buying & Leasing Cars', icon: <Car size={18} /> },
        { label: 'Rideshare & Carpool', icon: <Users size={18} /> },
      ],
      buttonText: 'Request Transit Help',
      imgSide: 'left',
      image: '/toronto-skyline.png',
      imgOverlayText: 'Newcomer Transportation Support'
    },
    {
      badge: 'Legal & Documentation',
      title: 'Legal Documentation & SIN',
      desc: 'Essential documentation and legal requirements for living and working in Canada.',
      items: [
        { label: 'SIN Application', icon: <FileText size={18} /> },
        { label: 'Work Permit Guides', icon: <Briefcase size={18} /> },
        { label: 'PR Card Obligations', icon: <ShieldCheck size={18} /> },
        { label: 'Legal Aid Services', icon: <Shield size={18} /> },
        { label: 'Notary Public Setup', icon: <FileCheck size={18} /> },
        { label: 'Travel & Passports', icon: <Globe size={18} /> },
      ],
      buttonText: 'Request Legal Document Help',
      imgSide: 'right',
      image: '/hero-community.png',
      imgOverlayText: 'Newcomer Legal Support'
    }
  ];

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="settlement-hero-section" style={{ position: 'relative', padding: '140px 0 100px', display: 'flex', alignItems: 'center', background: '#0c0c0e' }}>
        {/* Background Animation (Toronto Skyline CN Tower) */}
        <div className="cinematic-bg-container">
          <img 
            src="/images/toronto_skyline_hero.png" 
            alt="Settlement background" 
            className="cinematic-bg"
            style={{ opacity: 0.45 }}
          />
          <div className="cinematic-overlay" />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.08)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(232,93,4,0.2)' }}>
            <MapPin size={14} style={{ color: 'var(--primary-600)' }} />
            <span style={{ color: 'var(--primary-600)', fontWeight: 700, fontSize: '0.82rem' }}>Settlement Hub</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Welcome to <span style={{ color: 'var(--primary-600)' }}>Canada</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Your step-by-step guide to settling in — and building a future here — from day one.
          </p>
        </div>
      </section>

      {/* Settlement Categories — 2-Column Cards */}
      <section className="section" style={{ background: 'var(--bg-primary)' }}>
        <div className="container">
          {categories.map((cat, idx) => (
            <div key={idx} className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 56, alignItems: 'center', marginBottom: idx < categories.length - 1 ? 96 : 0, direction: cat.imgSide === 'left' ? 'rtl' : 'ltr' }}>
              {/* Text Side */}
              <div style={{ direction: 'ltr' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-600)', marginBottom: 12 }}>{cat.badge}</div>
                <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15, color: 'var(--text-primary)' }}>{cat.title}</h2>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 28 }}>{cat.desc}</p>
                
                {/* 2x3 Grid of boxes */}
                <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
                  {cat.items.map((item, i) => (
                    <Link href="/portal/auth" key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(232, 93, 4, 0.08)', border: '1px solid rgba(232, 93, 4, 0.15)', fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-700)', textDecoration: 'none', transition: 'all 0.2s' }} className="hover:-translate-y-1 hover:shadow-md">
                      <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span> {item.label}
                    </Link>
                  ))}
                </div>

                <Link href="/portal/auth" className="btn btn-primary" style={{ padding: '14px 28px' }}>
                  {cat.buttonText} <ArrowRight size={18} />
                </Link>
              </div>

              {/* Image Side */}
              <div style={{ direction: 'ltr', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', position: 'relative', aspectRatio: '4/3', width: '100%' }}>
                <Image src={cat.image} alt={cat.title} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 28px', background: 'linear-gradient(transparent, rgba(12,12,14,0.7))' }}>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>{cat.imgOverlayText}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newcomer Checklist — Side-by-Side */}
      <section className="section" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/study-bg.png" alt="Newcomer Studying Checklist" fill style={{ objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.95), rgba(12,12,14,0.85))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--primary-600)', marginBottom: 16 }}>Free Download</div>
              <h2 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 24, lineHeight: 1.15, color: 'white' }}>The Ultimate Newcomer Checklist</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 40 }}>
                Download our free checklist for your first 30 days in Canada.
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 32px', fontSize: '1rem', background: 'var(--primary-600)', border: 'none', boxShadow: '0 8px 24px rgba(232,93,4,0.3)' }}>
                  <Download size={20} /> Download PDF Guide
                </button>
                <Link href="/resources" className="btn" style={{ padding: '16px 32px', fontSize: '1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>View All Resources</Link>
              </div>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 40, border: '1px solid var(--border-color)', transform: 'rotate(2deg)', boxShadow: '0 25px 50px rgba(0,0,0,0.4), 0 0 0 12px rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: 24, paddingBottom: 16, borderBottom: '2px dashed var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={24} style={{ color: 'var(--primary-600)' }} />
                First 7 Days Checklist
              </h4>
              {['Applied for SIN at Service Canada', 'Opened a Canadian Bank Account', 'Obtained a Canadian Phone Number', 'Applied for Provincial Health Card', 'Explored local transit routes', 'Registered with settlement agency'].map((item, i) => {
                const isChecked = i === 1 || i === 2;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < 5 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isChecked ? 'var(--primary-600)' : 'var(--border-color)'}`, flexShrink: 0, background: isChecked ? 'var(--primary-600)' : 'var(--bg-secondary)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isChecked && <CheckCircle size={14} style={{ color: 'white' }} />}
                    </div>
                    <span style={{ fontSize: '0.95rem', color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: 500, textDecoration: isChecked ? 'line-through' : 'none' }}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-sm" style={{ background: 'var(--primary-600)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Need Personalized Help?</h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', marginBottom: 32 }}>A trained volunteer will walk you through your specific settlement needs, one step at a time.</p>
          <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'var(--bg-primary)', color: 'var(--primary-600)', fontWeight: 700, padding: '16px 36px', border: 'none' }}>
            Request Settlement Help <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
