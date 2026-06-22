'use client';
import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { ArrowLeft, CheckCircle2, ShieldAlert, Mail, User, Building2, MapPin, Send } from 'lucide-react';

interface Volunteer {
  id: string;
  name: string;
  role: string;
  company: string;
  city: string;
  province: string;
  image: string;
}

const mockVolunteers: Volunteer[] = [
  {
    id: 'vol-001',
    name: 'Sunil Khatri',
    role: 'CEO & Founder',
    company: 'Meshroad Marketing',
    city: 'Toronto',
    province: 'Ontario',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-002',
    name: 'Balinder Singh',
    role: 'Stock Market Educator',
    company: 'Morning Bulls',
    city: 'Calgary',
    province: 'Alberta',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-003',
    name: 'Aanchal Ghai',
    role: 'Notary Public & Founder',
    company: 'Anchal Ghai Notary Corporation',
    city: 'Ottawa',
    province: 'Ontario',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-004',
    name: 'Dr. Savita Drall',
    role: 'Yogic Diet & Lifestyle Coach',
    company: 'Health Gaga',
    city: 'Vancouver',
    province: 'British Columbia',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-005',
    name: 'Tarundeep Singh',
    role: 'Independent Insurance Advisor',
    company: 'Central Agencies Ltd',
    city: 'Surrey',
    province: 'British Columbia',
    image: 'https://images.unsplash.com/photo-1620122303020-43ec4b6cf7f8?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-006',
    name: 'Mandeep "Meenie" Hundal',
    role: 'Registered Physiotherapist',
    company: 'Willow Wellness Physio',
    city: 'Brampton',
    province: 'Ontario',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-007',
    name: 'Sanj Garg',
    role: 'Licensed Financial Planner',
    company: 'Independent Financial Partners',
    city: 'Mississauga',
    province: 'Ontario',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-008',
    name: 'Akashdeep Kaur',
    role: 'Registered Physiotherapist',
    company: 'Langley Registered Physiotherapy',
    city: 'Surrey',
    province: 'British Columbia',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-009',
    name: 'Raj Kumar',
    role: 'Staff Software Engineer',
    company: 'Shopify',
    city: 'Ottawa',
    province: 'Ontario',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 'vol-010',
    name: 'Meera Joshi',
    role: 'CPA & Financial Advisor',
    company: 'Joshi Tax & Accounting',
    city: 'Waterloo',
    province: 'Ontario',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150',
  }
];

function AskHelpForm() {
  const searchParams = useSearchParams();
  const volunteerId = searchParams.get('volunteerId');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Career Support');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const selectedVolunteer = useMemo(() => {
    return mockVolunteers.find(v => v.id === volunteerId) || mockVolunteers[0];
  }, [volunteerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    
    console.log('Admin Relay Triggered:', {
      from: { name, email },
      to: selectedVolunteer.name,
      category,
      details: message
    });
    
    setIsSubmitted(true);
  };

  return (
    <section style={{ background: 'var(--bg-primary)', paddingTop: 140, paddingBottom: 100, minHeight: '85vh' }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        
        <Link href="/volunteers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: 32 }} className="hover:text-primary-600">
          <ArrowLeft size={16} /> Back to Directory
        </Link>

        {!isSubmitted ? (
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 48 }}>
            
            {/* Left Column - Volunteer Details & Guardrails */}
            <div>
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-sm)', textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 16px', boxShadow: '0 8px 16px rgba(0,0,0,0.06)' }}>
                  <img src={selectedVolunteer.image} alt={selectedVolunteer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{selectedVolunteer.name}</h3>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{selectedVolunteer.role}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
                  <Building2 size={13} /> {selectedVolunteer.company}
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <MapPin size={13} style={{ color: 'var(--primary-600)' }} /> {selectedVolunteer.city}, {selectedVolunteer.province}
                </div>
              </div>

              {/* Secure Relay Guardrails */}
              <div style={{ background: 'rgba(232, 93, 4, 0.05)', border: '1px solid rgba(232, 93, 4, 0.15)', borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', color: 'var(--primary-700)' }}>
                  <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.9rem' }}>Secure Admin Relay</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      To protect your privacy and ensure code of conduct compliance, your request is securely relayed via our administrators. Your email is not shared directly with the volunteer until they accept your request.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Message Drop Form */}
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 24, padding: 40, boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Ask for Help</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 32 }}>Describe your inquiry or request. An admin will notify {selectedVolunteer.name} on your behalf.</p>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      required
                      placeholder="Enter your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="email" 
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>What do you need help with?</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="Career Support">Career Support & Referrals</option>
                    <option value="Housing Support">Housing & Rentals</option>
                    <option value="Financial Literacy">Financial Literacy & Banking</option>
                    <option value="Healthcare Setup">Healthcare Access</option>
                    <option value="Transit Support">Transportation & Driving</option>
                    <option value="Legal & SIN">Legal Documentation & SIN</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message / Details</label>
                  <textarea 
                    required
                    rows={5}
                    placeholder={`Introduce yourself and explain what you'd like to ask ${selectedVolunteer.name}...`}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '16px 28px', fontSize: '0.95rem', fontWeight: 800, background: 'var(--primary-600)', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.2s', color: 'white' }}
                >
                  <Send size={16} /> Send Secure Request
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 24, padding: '64px 40px', boxShadow: 'var(--shadow-sm)', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
            <div style={{ color: 'var(--success-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <CheckCircle2 size={64} style={{ color: '#10b981' }} />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Relay Request Sent!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32 }}>
              Thank you, <strong>{name}</strong>. Your request has been securely relayed via our administrator network. 
              We have notified <strong>{selectedVolunteer.name}</strong> that you are trying to reach them for help with <strong>{category}</strong>. 
              Your email is kept confidential, and the volunteer will receive your message details directly. You will be contacted once they accept the relay.
            </p>
            <Link href="/volunteers" className="btn btn-primary" style={{ display: 'inline-flex', padding: '14px 28px', background: 'var(--primary-600)', color: 'white', textDecoration: 'none', fontWeight: 800, borderRadius: 10 }}>
              Return to Directory
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}

export default function AskHelpPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div style={{ padding: '120px 0', textAlign: 'center', background: 'var(--bg-primary)', minHeight: '80vh', color: 'var(--text-secondary)' }}>Loading request form...</div>}>
        <AskHelpForm />
      </Suspense>
      <Footer />
    </>
  );
}
