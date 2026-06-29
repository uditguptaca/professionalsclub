'use client';
import React from 'react';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';

export default function DonatePage() {
  const { donationCampaigns } = usePortal();
  const activeCampaign = donationCampaigns.find(c => c.isActive) || donationCampaigns[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{ position: 'relative', padding: '120px 0 80px', color: 'white', overflow: 'hidden' }}>
        <Image src="/hero-community.png" alt="Community Support" fill style={{ objectFit: 'cover' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.9), rgba(12,12,14,0.6))' }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ maxWidth: 640 }}>
              <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 900, lineHeight: 1.15, fontFamily: 'var(--font-display)', marginBottom: 20, color: 'white' }}>
                Supporting professionals and newcomers in Canada.
              </h1>
              <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 32 }}>
                Helping people from every field find their footing and build a future here.
              </p>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '12px 28px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Read More
              </button>
            </div>

            <div className="mobile-wrap" style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, lineHeight: 1 }}>5,000+</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 8 }}>Members</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, lineHeight: 1 }}>18</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 8 }}>Active Volunteers</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, lineHeight: 1 }}>50+</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 8 }}>WhatsApp Groups</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main style={{ flex: 1, padding: '40px 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            
            {/* Left - Form */}
            <div style={{ background: 'var(--bg-primary)', padding: 24, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 16 }}>Matter of issues of sustainability</div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 24, lineHeight: 1.15 }}>
                You&apos;re in the right place to help.
              </h2>

              {activeCampaign && (
                <div style={{ marginBottom: 40 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 400, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>${activeCampaign.raisedAmount.toLocaleString()}</span> 
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>of ${activeCampaign.goalAmount.toLocaleString()} raised</span>
                  </div>
                  <div style={{ width: '100%', height: 10, background: 'var(--border-color)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (activeCampaign.raisedAmount / activeCampaign.goalAmount) * 100)}%`, height: '100%', background: 'var(--primary-600)', borderRadius: 5, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{activeCampaign?.title || 'Support Our Community'}</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {activeCampaign?.description || 'Your donation helps us create more inclusive and vibrant community gatherings.'}
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600, marginRight: 16 }}>$</span>
                  <input type="text" defaultValue="100.00" style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', width: '100%', outline: 'none' }} />
                </div>
                <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <button style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 600 }}>$10.00</button>
                  <button style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 600 }}>$25.00</button>
                  <button style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 600 }}>$50.00</button>
                  <button style={{ padding: '12px', border: 'none', borderRadius: 8, background: 'var(--primary-600)', color: 'white', fontWeight: 600 }}>$100.00</button>
                  <button style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 600 }}>$250.00</button>
                  <button style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 600, gridColumn: 'span 2' }}>Custom Amount</button>
                </div>
              </div>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Select Payment Method</h4>
              <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <input type="radio" name="payment" /> Offline Donation
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <input type="radio" name="payment" defaultChecked /> Stripe - Checkout
                </label>
              </div>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Personal Info</h4>
              <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <input type="text" placeholder="First Name *" style={{ padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 8, width: '100%', outline: 'none' }} />
                <input type="text" placeholder="Last Name" style={{ padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 8, width: '100%', outline: 'none' }} />
              </div>
              <input type="email" placeholder="Email Address *" style={{ padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 8, width: '100%', outline: 'none', marginBottom: 32 }} />

              <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 32 }}>
                 <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary-600)', marginBottom: 12 }}>stripe</div>
                 <h5 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Donate quickly and securely with Stripe</h5>
                 <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 24, padding: '0 20px', lineHeight: 1.6 }}>
                   Stripe securely processes your checkout, then returns you here.
                 </p>
                 <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, padding: '16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                   Donation Total: $100.00
                 </div>
                 <button style={{ padding: '16px 48px', background: 'var(--primary-600)', color: 'white', fontWeight: 700, borderRadius: 8, border: 'none', fontSize: '1rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                   Donate Now
                 </button>
              </div>
            </div>

            {/* Right - Text */}
            <div style={{ padding: '40px 0' }}>
             <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 32, lineHeight: 1.2 }}>
                Building Bridges, Enriching Lives: <span style={{ color: 'var(--text-secondary)' }}>Professionals Club.</span> <br />
                <span style={{ color: 'var(--text-muted)' }}>Facilitating smoother transitions for immigrants.</span> Connecting communities, creating opportunities.
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 32 }}>
                Founded in August 2022 by Udit Gupta to streamline the transition for newcomers arriving in Canada.
              </p>
              
              <div className="mobile-wrap" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', flexShrink: 0 }}>
                  <Image src="/founder.png" alt="Udit Gupta" fill style={{ objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '2.2rem', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>Udit Gupta</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Udit Gupta</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Founder, CEO & Director<br/>Professionals Club</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
