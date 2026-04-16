import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { HelpCircle, Shield, HandHeart, CheckCircle, ArrowRight, Users, MessageSquare, ClipboardList } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/volunteer-help.png" alt="How it works" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(99,102,241,0.3))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            How the Help Desk <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Works</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            A simple, safe, admin-mediated process. No direct member-to-member contact. Every interaction is controlled for your privacy and safety.
          </p>
        </div>
      </section>

      {/* For Members — Step-by-Step */}
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ fontSize: '2rem' }}>🎯</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8, marginTop: 12 }}>For Members Seeking Help</h2>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>Submit a request and let our admin team handle the rest.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[
              { step: 1, icon: <HelpCircle size={28} />, title: 'Submit a Help Request', desc: 'Describe your need — job referrals, tax help, resume review, settlement support, mentorship. Select from 10 support categories.', details: ['Full request form with category selection', 'Priority level (low, medium, high)', 'Consent to admin-mediated process', 'Anonymous to volunteers until admin assigns'], color: '#6366f1' },
              { step: 2, icon: <Shield size={28} />, title: 'Admin Reviews Your Request', desc: 'Our trained admin team reviews your request, verifies the details, and searches for the best matching approved volunteer.', details: ['Request validated for completeness', 'Matched against volunteer expertise areas', 'Admin may ask clarifying questions', 'No direct contact — all via admin relay'], color: '#d97706' },
              { step: 3, icon: <HandHeart size={28} />, title: 'Volunteer Assigned', desc: 'An approved volunteer is assigned to your case. They receive anonymized details through admin. All communication goes through admin relay messaging.', details: ['Volunteer sees only relevant case details', 'Volunteer responds through admin portal', 'Admin relays volunteer response to you', 'Your contact info is never shared'], color: '#059669' },
              { step: 4, icon: <CheckCircle size={28} />, title: 'Resolution & Follow-Up', desc: 'The volunteer provides guidance through admin relay. Your case is tracked from submission to resolution. You can request follow-up at any time.', details: ['Full case lifecycle tracking', 'Status updates at every stage', 'Satisfaction feedback after resolution', 'Case archived in audit log'], color: '#dc2626' },
            ].map(item => (
              <div key={item.step} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 24, alignItems: 'start' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${item.color}12`, border: `2px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, position: 'relative' }}>
                  {item.icon}
                  <span style={{ position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: '50%', background: item.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>{item.step}</span>
                </div>
                <div style={{ padding: '24px 28px', borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 8, fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                  <p style={{ color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>{item.desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {item.details.map(d => (
                      <span key={d} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: 8, background: `${item.color}08`, color: item.color, border: `1px solid ${item.color}20` }}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Volunteers */}
      <section style={{ position: 'relative', padding: '100px 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/career-mentorship.png" alt="Volunteer Mentorship" fill style={{ objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.8))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>🤝</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8, marginTop: 12, color: 'white' }}>For Volunteers & Mentors</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem' }}>Share your expertise. Help fellow community members. All admin-mediated.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { step: 1, icon: <ClipboardList size={32} />, title: 'Apply & Get Verified', desc: 'Submit your professional background, expertise areas, and compliance agreements. Admin reviews and approves your application.', color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
              { step: 2, icon: <MessageSquare size={32} />, title: 'Receive Case Assignments', desc: 'Admin matches relevant help requests to your expertise. You receive anonymized case details through the portal.', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
              { step: 3, icon: <CheckCircle size={32} />, title: 'Provide Guidance', desc: 'Respond through admin relay messaging. Your contact info is never shared. Cases are tracked until resolution.', color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
            ].map(item => (
              <div key={item.step} style={{ textAlign: 'center', padding: '40px 28px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1 hover:shadow-lg">
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: item.bg, border: `2px solid ${item.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, margin: '0 auto 20px', boxShadow: `0 0 20px ${item.bg}` }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: item.color, letterSpacing: '0.08em' }}>STEP {item.step}</span>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', margin: '8px 0 12px', fontFamily: 'var(--font-display)', color: 'white' }}>{item.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 0', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Ready to Get Started?</h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: 36 }}>It is completely free. Request help or apply to volunteer — our admin team is here to support you.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ padding: '16px 32px', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>Request Help <ArrowRight size={18} /></Link>
            <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '16px 32px' }}>Volunteer</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
