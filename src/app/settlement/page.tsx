import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Home, Banknote, HeartPulse, Car, ShieldCheck, ArrowRight, CheckCircle, Download, MapPin, FileText } from 'lucide-react';

export default function SettlementPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/settlement-guide.png" alt="Newcomers arriving in Canada" fill style={{ objectFit: 'cover', opacity: 0.25 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(5,150,105,0.3))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(16,185,129,0.3)' }}>
            <MapPin size={14} style={{ color: '#6ee7b7' }} />
            <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.82rem' }}>Settlement Hub</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Welcome to <span style={{ background: 'linear-gradient(135deg, #34d399, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Canada</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Your comprehensive guide to settling smoothly. We have compiled the most essential information to help you navigate your first weeks and months in Canada.
          </p>
        </div>
      </section>

      {/* Settlement Categories — 2-Column Cards */}
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          {[
            {
              icon: <Home size={32} style={{ color: '#6366f1' }} />,
              title: 'Housing & Rentals',
              desc: 'Finding your first home in Canada. Understanding leases, credit scores for rentals, and popular neighborhoods for newcomers.',
              items: ['Rental Market Overview & Average Costs', 'Credit Score Requirements for Newcomers', 'Tenant Rights & Responsibilities in Ontario', 'Temporary vs Long-term Housing Options'],
              color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe',
              imgSide: 'right', image: '/housing_bg.png', emoji: '🏠'
            },
            {
              icon: <Banknote size={32} style={{ color: '#059669' }} />,
              title: 'Financial Literacy & Banking',
              desc: 'Setting up your Canadian financial life. Open accounts, build credit, and understand the tax system from day one.',
              items: ['Opening a Bank Account (RBC, TD, Scotiabank)', 'Building Credit History as a Newcomer', 'GST/HST & Income Tax 101', 'RRSP, TFSA & Registered Savings Accounts'],
              color: '#059669', bg: '#f0fdf4', border: '#bbf7d0',
              imgSide: 'left', image: '/finance_bg.png', emoji: '🏦'
            },
            {
              icon: <HeartPulse size={32} style={{ color: '#dc2626' }} />,
              title: 'Healthcare Access',
              desc: 'Navigating the universal healthcare system. Getting your provincial health card and finding doctors.',
              items: ['Applying for Health Cards (OHIP, MSP, etc.)', 'Finding a Family Doctor or Walk-in Clinic', 'Emergency Room vs Urgent Care', 'Dental & Vision Coverage Options'],
              color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
              imgSide: 'right', image: '/healthcare_bg.png', emoji: '🏥'
            },
            {
              icon: <Car size={32} style={{ color: '#d97706' }} />,
              title: 'Transportation & Driving',
              desc: 'Getting around your new city. Public transit, driver license exchange, and buying your first car.',
              items: ['Foreign Driver License Exchange Process', 'Public Transit (PRESTO, Compass Card)', 'Car Insurance Basics in Canada', 'Winter Driving Safety Tips'],
              color: '#d97706', bg: '#fffbeb', border: '#fde68a',
              imgSide: 'left', image: '/toronto-skyline.png', emoji: '🚗'
            },
            {
              icon: <ShieldCheck size={32} style={{ color: '#7c3aed' }} />,
              title: 'Legal Documentation & SIN',
              desc: 'Essential documentation and legal requirements for living and working in Canada.',
              items: ['Social Insurance Number (SIN) Application', 'Work Permits & Authorization', 'PR Card & Residency Obligations', 'Free Legal Aid Resources'],
              color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
              imgSide: 'right', image: '/hero-community.png', emoji: '📋'
            },
          ].map((cat, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center', marginBottom: idx < 4 ? 80 : 0, direction: cat.imgSide === 'left' ? 'rtl' : 'ltr' }}>
              <div style={{ direction: 'ltr' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: `1px solid ${cat.border}` }}>
                  {cat.icon}
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12, color: '#1e293b' }}>{cat.title}</h2>
                <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>{cat.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {cat.items.map((item, i) => (
                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                       <CheckCircle size={16} style={{ color: cat.color, flexShrink: 0 }} />
                       <span style={{ color: '#374151' }}>{item}</span>
                     </div>
                  ))}
                </div>
                <Link href="/portal/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem', color: cat.color, textDecoration: 'none' }}>
                  Get Help With This <ArrowRight size={16} />
                </Link>
              </div>
              <div style={{ direction: 'ltr', position: 'relative', borderRadius: 24, overflow: 'hidden', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                <Image src={cat.image} alt={cat.title} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(15,23,42,0.65))' }} />
                
                <div style={{ position: 'relative', zIndex: 10, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '4.5rem', marginBottom: 20, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
                    {cat.emoji}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.6rem', color: 'white', marginBottom: 16, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{cat.title}</div>
                  <p style={{ fontSize: '0.95rem', color: '#cbd5e1', maxWidth: 300, lineHeight: 1.6 }}>Submit a help request to get personalized guidance from our community network.</p>
                  <Link href="/portal/auth" className="btn btn-outline" style={{ marginTop: 32, borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>Contact a Volunteer</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newcomer Checklist — Side-by-Side */}
      <section style={{ position: 'relative', padding: '120px 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/study-bg.png" alt="Newcomer Studying Checklist" fill style={{ objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,27,75,0.85))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 1100 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#a5b4fc', marginBottom: 16 }}>Free Download</div>
              <h2 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 24, lineHeight: 1.15, color: 'white' }}>The Ultimate Newcomer Checklist</h2>
              <p style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: 1.8, marginBottom: 40 }}>
                Do not miss a single step. Download our comprehensive PDF checklist covering everything you need to do before landing and during your first 30 days in Canada.
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 32px', fontSize: '1rem', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
                  <Download size={20} /> Download PDF Guide
                </button>
                <Link href="/resources" className="btn" style={{ padding: '16px 32px', fontSize: '1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>View All Resources</Link>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 40, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', transform: 'rotate(2deg)', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
              <h4 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={24} style={{ color: '#818cf8' }} />
                First 7 Days Checklist
              </h4>
              {['Applied for SIN at Service Canada', 'Opened a Canadian Bank Account', 'Obtained a Canadian Phone Number', 'Applied for Provincial Health Card', 'Explored local transit routes', 'Registered with settlement agency'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid #818cf8', flexShrink: 0, background: 'rgba(129,140,248,0.2)' }} />
                  <span style={{ fontSize: '0.95rem', color: '#e2e8f0' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(135deg, #059669, #10b981)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Need Personalized Help?</h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', marginBottom: 32 }}>Submit a help request on our portal and a trained volunteer will guide you through your specific settlement needs.</p>
          <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'white', color: '#059669', fontWeight: 700, padding: '16px 36px', border: 'none' }}>
            Request Settlement Help <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
