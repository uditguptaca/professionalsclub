import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { HelpCircle, Shield, HandHeart, CheckCircle, ArrowRight, Users, MessageSquare, ClipboardList, Target } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0c0c0e', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/volunteer-help.png" alt="How it works" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.95), rgba(232,93,4,0.15))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            How the Help Desk <span style={{ color: 'var(--primary-600)' }}>Works</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            A secure, private process — built to protect you at every step.
          </p>
        </div>
      </section>

      {/* For Members — Step-by-Step */}
      <section style={{ padding: '40px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'var(--primary-600)' }}><Target size={28} /></div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8, marginTop: 12 }}>For Members Seeking Help</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Tell us what you need, and we'll match you with the right person.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { step: 1, icon: <HelpCircle size={28} />, title: 'Submit a Help Request', desc: 'Describe your need across 10 support categories.', details: ['Full request form with category selection', 'Priority level (low, medium, high)', 'Consent to our secure process', 'Anonymous to volunteers until matched'], color: '#e85d04' },
              { step: 2, icon: <Shield size={28} />, title: 'Platform Matches You', desc: 'The platform securely matches you with the right volunteer.', details: ['Request validated for completeness', 'Matched against volunteer expertise areas', 'We may ask clarifying questions', 'No direct contact — all verified through the platform'], color: '#0c0c0e' },
              { step: 3, icon: <HandHeart size={28} />, title: 'Volunteer Assigned', desc: 'An assigned volunteer receives anonymized details. All communication is routed through our secure relay.', details: ['Volunteer sees only relevant case details', 'Volunteer responds securely', 'Platform relays volunteer response to you', 'Your contact info is never shared'], color: '#e85d04' },
            ].map(item => (
              <div key={item.step} className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 24, alignItems: 'start' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${item.color}12`, border: `2px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, position: 'relative' }}>
                  {item.icon}
                  <span style={{ position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: '50%', background: item.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>{item.step}</span>
                </div>
                <div style={{ padding: '24px 28px', borderRadius: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 8, fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>{item.desc}</p>
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
      <section style={{ padding: '40px 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'var(--primary-600)' }}><HandHeart size={28} /></div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8, marginTop: 12 }}>For Volunteers & Mentors</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Share your expertise and help a fellow community member build their future.</p>
          </div>

          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { step: 1, icon: <ClipboardList size={32} />, title: 'Apply & Get Verified', desc: 'Submit your background and expertise for verification.', color: '#e85d04' },
              { step: 2, icon: <MessageSquare size={32} />, title: 'Receive Case Assignments', desc: 'Receive anonymized case details matched to your expertise.', color: '#0c0c0e' },
              { step: 3, icon: <CheckCircle size={32} />, title: 'Provide Guidance', desc: 'Respond securely through the platform. Your contact info is never shared.', color: '#e85d04' },
            ].map(item => (
              <div key={item.step} style={{ textAlign: 'center', padding: '40px 28px', borderRadius: 20, background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(232, 93, 4, 0.08)', border: '1px solid rgba(232, 93, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, margin: '0 auto 20px' }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: item.color, letterSpacing: '0.08em' }}>STEP {item.step}</span>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', margin: '8px 0 12px', fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '40px 0', background: '#0c0c0e', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Ready to get started?</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: 20 }}>Ask for help today — a real person will get back to you.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ padding: '16px 36px', background: 'var(--primary-600)', border: 'none', boxShadow: '0 8px 24px rgba(232,93,4,0.3)' }}>Request Help <ArrowRight size={18} /></Link>
            <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '16px 36px' }}>Volunteer</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
