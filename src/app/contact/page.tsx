'use client';

import React, { useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Send, Mail, MapPin, Shield, CheckCircle } from 'lucide-react';
import { submitContactMessage } from '@/app/actions/public';

type FieldErrors = { name?: string; email?: string; message?: string };

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Support');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    // The form is noValidate, so these messages are the only validation surface
    // and do not race the browser's own bubbles.
    const next: FieldErrors = {};
    if (!trimmedName) next.name = 'Enter your name.';
    // Deliberately loose. This only catches obvious typos before the round trip;
    // the database function is what actually decides whether the row is valid.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) next.email = 'Enter a valid email address.';
    if (!trimmedMessage) next.message = 'Tell us what you need help with.';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setError('');
    setPending(true);
    const result = await submitContactMessage({
      name: trimmedName,
      email: trimmedEmail,
      subject,
      message: trimmedMessage,
    });
    setPending(false);

    if (result.ok) setSubmitted(true);
    else setError(result.error);
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main id="main" style={{ flex: 1, paddingTop: 120, paddingBottom: 80 }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 16 }}>
              Contact Us
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
              We&apos;re here to help newcomers and professionals build their future in Canada. Get in touch with our support desk.
            </p>
          </div>

          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 40, alignItems: 'start' }}>
            
            {/* Contact Form */}
            <div style={{ background: 'var(--bg-primary)', padding: 32, borderRadius: 24, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,168,107,0.1)', color: 'var(--success-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <CheckCircle size={36} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Message received</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 24px' }}>
                    Thanks for reaching out, {name}. Your message is with the support desk and a reply will come to {email}, usually within two business days.
                  </p>
                  <button
                    onClick={() => {
                      setName('');
                      setEmail('');
                      setMessage('');
                      setError('');
                      setFieldErrors({});
                      setSubmitted(false);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '12px 24px' }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label htmlFor="contact-name" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Your Name *</label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Enter your full name"
                      aria-invalid={fieldErrors.name ? true : undefined}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                    {fieldErrors.name && <p role="alert" className="community-error" style={{ marginTop: 8 }}>{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="contact-email" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Email Address *</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      aria-invalid={fieldErrors.email ? true : undefined}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                    {fieldErrors.email && <p role="alert" className="community-error" style={{ marginTop: 8 }}>{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="contact-subject" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Subject</label>
                    <select id="contact-subject" 
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="General Support">General Support</option>
                      <option value="Volunteer / Mentoring">Volunteer / Mentoring</option>
                      <option value="Settlement Assistance">Settlement Assistance</option>
                      <option value="Business Directory Enquiry">Business Directory Enquiry</option>
                      <option value="Partnerships">Partnerships</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contact-message" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Message *</label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="How can we help you?"
                      aria-invalid={fieldErrors.message ? true : undefined}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                    {fieldErrors.message && <p role="alert" className="community-error" style={{ marginTop: 8 }}>{fieldErrors.message}</p>}
                  </div>

                  {error && <p role="alert" className="community-error">{error}</p>}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pending}
                    style={{ padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, border: 'none', cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.65 : 1 }}
                  >
                    <Send size={16} /> {pending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Details & Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: 'var(--bg-primary)', padding: 28, borderRadius: 24, border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Support Channels</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <Mail size={18} style={{ color: 'var(--text-accent)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Email Support</div>
                      <a href="mailto:support@professionalsclub.ca" style={{ fontSize: '0.88rem', color: 'var(--text-accent)', textDecoration: 'none' }}>
                        support@professionalsclub.ca
                      </a>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <MapPin size={18} style={{ color: 'var(--text-accent)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Headquarters</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        Toronto, Ontario, Canada
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, rgba(232,93,4,0.08), rgba(232,93,4,0.02))', padding: 28, borderRadius: 24, border: '1px solid rgba(232,93,4,0.15)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={18} style={{ color: 'var(--text-accent)' }} /> Privacy First
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Your data is protected. All messages sent to our help desk are encrypted and only accessible by authorized community support administrators.
                </p>
              </div>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
