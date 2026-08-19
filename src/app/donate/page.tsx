'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePublicContent } from '@/context/public-content';
import { Mail, Send } from 'lucide-react';
import { SITE_STATS } from '@/lib/site-stats';

const DONATION_EMAIL = 'support@professionalsclub.ca';
const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

export default function DonatePage() {
  const { donationCampaigns } = usePublicContent();
  const activeCampaign = donationCampaigns.find(c => c.isActive) || donationCampaigns[0];

  // One piece of state: the presets write into the same field the visitor can type in.
  const [amount, setAmount] = useState('100');
  const amountValue = Number(amount);
  const validAmount = Number.isFinite(amountValue) && amountValue > 0;

  const goalProgress = activeCampaign && activeCampaign.goalAmount > 0
    ? Math.min(100, (activeCampaign.raisedAmount / activeCampaign.goalAmount) * 100)
    : 0;

  // No payment processor is configured, so the only honest handoff is an email
  // that tells the club what is coming by e-Transfer.
  const mailtoHref = `mailto:${DONATION_EMAIL}?subject=${encodeURIComponent(
    `Donation of $${amountValue} CAD`
  )}&body=${encodeURIComponent(
    [
      `I would like to donate $${amountValue} CAD to Professionals Club.`,
      activeCampaign ? `Campaign: ${activeCampaign.title}` : '',
      '',
      `I will send it by Interac e-Transfer to ${DONATION_EMAIL}.`,
      '',
      'My name:',
    ].filter(Boolean).join('\n')
  )}`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{ position: 'relative', padding: '120px 0 80px', color: 'white', overflow: 'hidden' }}>
        <Image src="/hero-community.png" alt="Community Support" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: 'cover' }} priority />
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
              <Link href="/about" className="btn" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '12px 28px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
                Read More
              </Link>
            </div>

            <div className="mobile-wrap" style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, lineHeight: 1 }}>{SITE_STATS.members}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 8 }}>Members</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, lineHeight: 1 }}>{SITE_STATS.volunteers}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 8 }}>Active Volunteers</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, lineHeight: 1 }}>{SITE_STATS.whatsappCommunities}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 8 }}>WhatsApp Communities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main id="main" style={{ flex: 1, padding: '40px 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Left - Giving panel */}
            <div style={{ background: 'var(--bg-primary)', padding: 24, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 16 }}>Ways to give</div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 24, lineHeight: 1.15 }}>
                You&apos;re in the right place to help.
              </h2>

              {activeCampaign && (
                <div style={{ marginBottom: 40 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 400, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>${activeCampaign.raisedAmount.toLocaleString()}</span>
                    {activeCampaign.goalAmount > 0 && (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>of ${activeCampaign.goalAmount.toLocaleString()} raised</span>
                    )}
                  </div>
                  <div style={{ width: '100%', height: 10, background: 'var(--border-color)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${goalProgress}%`, height: '100%', background: 'var(--primary-700)', borderRadius: 5, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{activeCampaign?.title || 'Support Our Community'}</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {activeCampaign?.description || 'Your donation helps us create more inclusive and vibrant community gatherings.'}
                </p>
              </div>

              <fieldset style={{ border: 'none', padding: 0, margin: '0 0 24px' }}>
                <legend style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, padding: 0 }}>Choose an amount (CAD)</legend>

                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <label htmlFor="donation-amount" style={{ color: 'var(--text-secondary)', fontWeight: 600, marginRight: 16 }}>$</label>
                  <input
                    id="donation-amount"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 12 }}>
                  {PRESET_AMOUNTS.map(preset => {
                    const selected = amountValue === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setAmount(String(preset))}
                        style={{
                          padding: '12px',
                          border: selected ? 'none' : '1px solid var(--border-color)',
                          borderRadius: 8,
                          background: selected ? 'var(--primary-700)' : 'var(--bg-primary)',
                          color: selected ? 'white' : 'var(--text-secondary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ${preset}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '12px 0 0' }}>
                  Pick a preset or type any amount in the box above.
                </p>
              </fieldset>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 32 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>How to send your donation</h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
                  Card payments are not live on this site yet. Interac e-Transfer reaches the club today, so that is the
                  route we can honour right now.
                </p>

                <ol style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 24 }}>
                  <li>
                    Send an Interac e-Transfer of{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{validAmount ? `$${amountValue} CAD` : 'your chosen amount'}</strong>{' '}
                    to <strong style={{ color: 'var(--text-primary)' }}>{DONATION_EMAIL}</strong>{' '}
                    from your bank&apos;s app.
                  </li>
                  <li>Put your name in the e-Transfer message so we can thank you and record it.</li>
                  <li>Email us below so we know it is coming and can send a receipt.</li>
                </ol>

                {validAmount ? (
                  <a
                    href={mailtoHref}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 32px', background: 'var(--primary-700)', color: 'white', fontWeight: 700, borderRadius: 8, border: 'none', fontSize: '0.95rem', textDecoration: 'none' }}
                  >
                    <Send size={16} /> Email us about my ${amountValue} donation
                  </a>
                ) : (
                  <p className="community-error">Enter an amount above to continue.</p>
                )}

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.7 }}>
                  <Mail size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Prefer a form? Use the <Link href="/contact" style={{ color: 'var(--text-accent)' }}>contact page</Link> and
                  mention the amount. Either way a person reads it - nothing is charged automatically.
                </p>
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
                  <Image src="/founder.png" alt="Udit Gupta" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '2.2rem', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>Udit Gupta</div>
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
