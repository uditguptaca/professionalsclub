import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { CheckCircle, ArrowRight, Heart, Shield, Users } from 'lucide-react';

export default function PricingPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 80, background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', overflow: 'hidden' }}>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Completely <span style={{ background: 'linear-gradient(135deg, #34d399, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Free</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
            A community-driven platform with no fees or hidden costs.
          </p>
        </div>
      </section>

      {/* Free Plan Card */}
      <section style={{ padding: '40px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Members */}
            <div style={{ borderRadius: 20, border: '2px solid #6366f1', padding: 40, background: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>For Members</span>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#1e293b', margin: '8px 0' }}>$0</div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Forever free</div>
              </div>
              {[
                'Submit unlimited help requests',
                'Job referrals & placement support',
                'Resume & cover letter reviews',
                'Settlement guidance',
                'Tax consultation connections',
                'Career mentorship matching',
                'Secure messaging',
                'Full request lifecycle tracking',
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 7 ? '1px solid #f1f5f9' : 'none' }}>
                  <CheckCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.88rem', color: '#374151' }}>{f}</span>
                </div>
              ))}
              <Link href="/portal/auth" className="btn btn-primary" style={{ width: '100%', marginTop: 28, padding: '14px 0', textAlign: 'center', display: 'block' }}>
                Get Started Free
              </Link>
            </div>

            {/* Volunteers */}
            <div style={{ borderRadius: 20, border: '2px solid #059669', padding: 40, background: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #059669, #10b981)' }} />
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.1em' }}>For Volunteers</span>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#1e293b', margin: '8px 0' }}>$0</div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Always free</div>
              </div>
              {[
                'Receive curated cases',
                'Set your own monthly case limit',
                'Choose expertise areas (10 types)',
                'Secure platform messaging',
                'Background screening & compliance',
                'Community recognition badges',
                'Impact dashboard & metrics',
                'Flexible availability settings',
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 7 ? '1px solid #f1f5f9' : 'none' }}>
                  <CheckCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.88rem', color: '#374151' }}>{f}</span>
                </div>
              ))}
              <Link href="/portal/auth" className="btn" style={{ width: '100%', marginTop: 28, padding: '14px 0', textAlign: 'center', display: 'block', background: '#059669', color: 'white', border: 'none' }}>
                Apply to Volunteer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Free */}
      <section style={{ padding: '40px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Why Is It Free?</h2>
            <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: 560, margin: '0 auto' }}>Accessible community support.</p>
          </div>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: <Heart size={28} />, title: 'Community-Driven', desc: 'Our team and volunteers manage operations as a community service.', color: '#dc2626' },
              { icon: <Shield size={28} />, title: 'No Hidden Costs', desc: 'No premium tiers or hidden fees. All features are available.', color: '#6366f1' },
              { icon: <Users size={28} />, title: 'Pay It Forward', desc: 'Consider volunteering to help the next wave of newcomers.', color: '#059669' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '36px 28px', borderRadius: 20, background: 'white', border: '1px solid #e2e8f0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${item.color}12`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  {item.icon}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8, fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '40px 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: 20 }}>FAQ</h2>
          {[
            { q: 'Is there really no cost?', a: 'Yes, entirely free for members and volunteers.' },
            { q: 'How do volunteers get compensated?', a: 'Volunteers receive community recognition, badges, and the satisfaction of helping.' },
            { q: 'Will there ever be paid features?', a: 'Core help desk will always remain free.' },
            { q: 'Is my data secure?', a: 'Yes, our platform uses secure routing and all interactions are safely logged.' },
          ].map(item => (
            <div key={item.q} style={{ padding: '20px 24px', marginBottom: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontWeight: 800, marginBottom: 6, fontSize: '0.95rem', color: '#1e293b' }}>{item.q}</h4>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
