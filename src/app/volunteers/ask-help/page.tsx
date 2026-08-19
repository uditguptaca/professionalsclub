'use client';
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { getPublicVolunteers, submitVolunteerHelpRequest } from '@/app/actions/public';
import { ArrowLeft, CheckCircle2, ShieldAlert, Mail, User, Building2, MapPin, Send, Users } from 'lucide-react';

// The row type lives in a server-only module, so derive it from the action
// rather than importing it into the browser bundle.
type PublicVolunteer = Awaited<ReturnType<typeof getPublicVolunteers>>[number];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
}

function AskHelpForm() {
  const searchParams = useSearchParams();
  const volunteerId = searchParams.get('volunteerId');

  const [volunteers, setVolunteers] = useState<PublicVolunteer[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [linkExpired, setLinkExpired] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Career Support');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    getPublicVolunteers()
      .then(rows => {
        if (!active) return;
        setVolunteers(rows);
        const match = volunteerId ? rows.find(v => v.id === volunteerId) : undefined;
        setSelectedId(match?.id ?? '');
        // A link saved from an older directory can name someone who is no longer
        // an approved volunteer. Say so rather than addressing a stranger.
        setLinkExpired(Boolean(volunteerId) && !match);
      })
      .catch(() => {
        // Without the directory the request still reaches the admin team.
        if (active) setVolunteers([]);
      });
    return () => { active = false; };
  }, [volunteerId]);

  const selectedVolunteer = useMemo(
    () => volunteers?.find(v => v.id === selectedId) ?? null,
    [volunteers, selectedId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    const result = await submitVolunteerHelpRequest({
      name,
      email,
      message,
      category,
      requestedFor: selectedVolunteer?.name,
    });
    setPending(false);
    if (result.ok) setIsSubmitted(true);
    else setError(result.error);
  };

  return (
    <section style={{ background: 'var(--bg-primary)', paddingTop: 140, paddingBottom: 100, minHeight: '85vh' }}>
      <div className="container" style={{ maxWidth: 1000 }}>

        <Link href="/volunteers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: 32 }} className="hover:text-primary-600">
          <ArrowLeft size={16} /> Back to Directory
        </Link>

        {!isSubmitted ? (
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 48 }}>

            {/* Left Column - Who the request is for, and how routing works */}
            <div>
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-sm)', textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(232, 93, 4, 0.08)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900 }}>
                  {selectedVolunteer ? initials(selectedVolunteer.name) : <Users size={36} />}
                </div>

                {volunteers === null ? (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading volunteer details...</p>
                ) : selectedVolunteer ? (
                  <>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{selectedVolunteer.name}</h3>
                    {selectedVolunteer.role && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{selectedVolunteer.role}</div>
                    )}
                    {selectedVolunteer.company && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
                        <Building2 size={13} /> {selectedVolunteer.company}
                      </div>
                    )}
                    {(selectedVolunteer.city || selectedVolunteer.province) && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <MapPin size={13} style={{ color: 'var(--text-accent)' }} /> {[selectedVolunteer.city, selectedVolunteer.province].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Volunteer team</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      No specific volunteer selected. The admin team will match your request to a volunteer with the right background.
                    </p>
                  </>
                )}
              </div>

              {linkExpired && (
                <div role="status" style={{ background: 'rgba(232, 93, 4, 0.05)', border: '1px solid rgba(232, 93, 4, 0.15)', borderRadius: 20, padding: 20, marginBottom: 24, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The volunteer in this link is no longer available. Your request will go to the whole team, or you can pick another volunteer below.
                </div>
              )}

              <div style={{ background: 'rgba(232, 93, 4, 0.05)', border: '1px solid rgba(232, 93, 4, 0.15)', borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', color: 'var(--primary-700)' }}>
                  <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.9rem' }}>How this works</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Requests go to the Professionals Club admin team, not to volunteers directly. We do not publish volunteer contact details. An admin reads your request and connects you with a volunteer who can help.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Request form */}
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 24, padding: 40, boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Ask for Help</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 32 }}>
                Describe your inquiry or request. The admin team receives it and routes it to a volunteer.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label htmlFor="ah-your-full-name" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      id="ah-your-full-name"
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
                  <label htmlFor="ah-your-email-address" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      id="ah-your-email-address"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none' }}
                    />
                  </div>
                </div>

                {volunteers && volunteers.length > 0 && (
                  <div>
                    <label htmlFor="ah-volunteer-you-would-like-to-" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Volunteer you would like to reach</label>
                    <select
                      id="ah-volunteer-you-would-like-to-"
                      value={selectedId}
                      onChange={e => setSelectedId(e.target.value)}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="">No preference - route to any volunteer</option>
                      {volunteers.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}{v.role ? ` - ${v.role}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="ah-what-do-you-need-help-with" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>What do you need help with?</label>
                  <select
                      id="ah-what-do-you-need-help-with"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="Career Support">Career Support &amp; Referrals</option>
                    <option value="Housing Support">Housing &amp; Rentals</option>
                    <option value="Financial Literacy">Financial Literacy &amp; Banking</option>
                    <option value="Healthcare Setup">Healthcare Access</option>
                    <option value="Transit Support">Transportation &amp; Driving</option>
                    <option value="Legal & SIN">Legal Documentation &amp; SIN</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ah-message-details" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message / Details</label>
                  <textarea
                      id="ah-message-details"
                    required
                    rows={5}
                    placeholder={selectedVolunteer
                      ? `Introduce yourself and explain what you'd like to ask ${selectedVolunteer.name}...`
                      : 'Introduce yourself and explain what you need help with...'}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                </div>

                {error && <p role="alert" className="community-error">{error}</p>}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={pending}
                  style={{ padding: '16px 28px', fontSize: '0.95rem', fontWeight: 800, background: 'var(--primary-700)', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.6 : 1, transition: 'background 0.2s', color: 'white' }}
                >
                  <Send size={16} /> {pending ? 'Sending...' : 'Send Request'}
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 24, padding: '64px 40px', boxShadow: 'var(--shadow-sm)', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
            <div style={{ color: '#04724d', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <CheckCircle2 size={64} style={{ color: 'var(--success-400)' }} />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Request received</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32 }}>
              Thank you, <strong>{name}</strong>. The admin team has your request about <strong>{category}</strong> and will route it to a volunteer who can help.
              {selectedVolunteer ? <> We have noted that you asked for <strong>{selectedVolunteer.name}</strong>; the team may connect you with another volunteer with similar experience.</> : null}
              {' '}We reply to <strong>{email}</strong>, so watch for a message from us there.
            </p>
            <Link href="/volunteers" className="btn btn-primary" style={{ display: 'inline-flex', padding: '14px 28px', background: 'var(--primary-700)', color: 'white', textDecoration: 'none', fontWeight: 800, borderRadius: 10 }}>
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

      <main id="main">
      <Suspense fallback={<div style={{ padding: '120px 0', textAlign: 'center', background: 'var(--bg-primary)', minHeight: '80vh', color: 'var(--text-secondary)' }}>Loading request form...</div>}>
        <AskHelpForm />
      </Suspense>
      </main>

      <Footer />
    </>
  );
}
