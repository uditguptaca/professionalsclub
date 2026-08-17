'use client';
import React, { useState } from 'react';
import ContentImage from '@/components/shared/ContentImage';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePublicContent } from '@/context/public-content';
import { Calendar, MapPin, Clock, ArrowRight, CheckCircle2, Sparkles, CalendarOff } from 'lucide-react';
import { submitContactMessage } from '@/app/actions/public';
import MeetupEventVideo from '@/components/events/MeetupEventVideo';
import type { CommunityEvent } from '@/types';

const CONTACT_EMAIL = 'support@professionalsclub.ca';

/**
 * event_date is a date column, but case.ts turns the driver's Date into a full
 * ISO string, so the value arrives as either YYYY-MM-DD or a timestamp. Keep
 * the calendar day as stored and pin it to local noon, so no timezone or DST
 * shift moves the event a day.
 */
function formatEventDate(date: string): string {
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}

function eventTypeLabel(evt: CommunityEvent): string {
  if (evt.eventType === 'in_person') return 'In-Person';
  if (evt.eventType === 'hybrid') return 'Hybrid';
  return evt.platform || 'Virtual';
}

export default function EventsPage() {
  const { events, loading } = usePublicContent();

  // Virtual Workshop Request States
  const [bookName, setBookName] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookTopic, setBookTopic] = useState('Career Guidance');
  const [bookTime, setBookTime] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookError, setBookError] = useState('');
  const [isBooked, setIsBooked] = useState(false);

  const upcomingEvents = events.filter(e => e.status === 'upcoming');
  const pastEvents = events.filter(e => e.status === 'past');

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName || !bookEmail) return;
    setBookSubmitting(true);
    setBookError('');
    // No workshop-booking table exists, so this lands in the help desk inbox an
    // admin already works through, and the copy below promises only that.
    const result = await submitContactMessage({
      name: bookName,
      email: bookEmail,
      subject: `Virtual workshop request: ${bookTopic}`,
      message: `Topic: ${bookTopic}\nPreferred time: ${bookTime.trim() || 'no preference given'}`,
    });
    setBookSubmitting(false);
    if (result.ok) setIsBooked(true);
    else setBookError(result.error);
  };

  return (
    <>
      <Navbar />

      <main id="main">

      {/* Hero */}
      <section className="events-hero-section">
        <MeetupEventVideo />
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(232,93,4,0.3)' }}>
            <Calendar size={14} style={{ color: 'var(--primary-400)' }} />
            <span style={{ color: 'var(--primary-200)', fontWeight: 700, fontSize: '0.82rem' }}>Events & Meetups</span>
          </div>
          <h1>
            Connect, Learn & <span style={{ color: 'var(--primary-600)' }}>Grow Together</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.95)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto', textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>
            Meetups, workshops, and livestreams to help you build your future in Canada.
          </p>
        </div>
      </section>

      {/* Upcoming Events Grid */}
      <section style={{ padding: '80px 0 60px', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-600)', marginBottom: 8 }}>Schedule</div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: 0 }}>Upcoming Community Events</h2>
            </div>
            {upcomingEvents.length > 0 && (
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {upcomingEvents.length} scheduled
              </span>
            )}
          </div>

          {upcomingEvents.length === 0 ? (
            !loading && (
              <div className="empty-state">
                <span className="empty-icon"><CalendarOff size={22} /></span>
                <h3>No events on the calendar yet</h3>
                <p>
                  Nothing is scheduled right now. Email us at{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--primary-600)' }}>{CONTACT_EMAIL}</a>{' '}
                  and we will tell you when the next meetup is set.
                </p>
              </div>
            )
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
              {upcomingEvents.map(evt => (
                <div key={evt.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s, box-shadow 0.2s' }} className="hover:-translate-y-1 hover:shadow-md">
                  <div style={{ position: 'relative', height: 180, width: '100%' }}>
                    <ContentImage src={evt.image} alt={evt.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(232, 93, 4, 0.95)', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700 }}>
                      {eventTypeLabel(evt)}
                    </div>
                  </div>

                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, height: '3rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {evt.title}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={14} style={{ color: 'var(--primary-600)' }} />
                        <span>{evt.date ? formatEventDate(evt.date) : 'Date to be announced'}</span>
                      </div>
                      {evt.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Clock size={14} style={{ color: 'var(--primary-600)' }} />
                          <span>{evt.time}</span>
                        </div>
                      )}
                      {evt.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <MapPin size={14} style={{ color: 'var(--primary-600)' }} />
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{evt.location}</span>
                        </div>
                      )}
                    </div>

                    {/* There is no RSVP table, so the only real actions are the organiser's
                        own registration link or an email to the club. */}
                    {evt.rsvpUrl ? (
                      <a
                        href={evt.rsvpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ marginTop: 'auto', width: '100%', background: 'var(--primary-600)', border: 'none', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                      >
                        Register <ArrowRight size={14} />
                      </a>
                    ) : (
                      <a
                        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Question about ${evt.title}`)}`}
                        className="btn btn-outline"
                        style={{ marginTop: 'auto', width: '100%', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      >
                        Ask about this event <ArrowRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Virtual Workshop Requests */}
      <section style={{ padding: '80px 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'center' }}>

            {/* Virtual Booking Info */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.06)', border: '1px solid rgba(232,93,4,0.12)', padding: '6px 12px', borderRadius: 8, marginBottom: 16, color: 'var(--primary-700)', fontSize: '0.8rem', fontWeight: 700 }}>
                <Sparkles size={14} /> Virtual Workshop Requests
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20 }}>Ask for a Virtual Seat</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 24 }}>
                Can't make it in person? Tell us which topic you need and when you are free. Our workshops are free, and an admin replies by email with a session time.
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                Requests go to the same help desk as{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--primary-600)' }}>{CONTACT_EMAIL}</a>, so nothing is booked until someone confirms it with you.
              </p>
            </div>

            {/* Request Form */}
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 24, padding: 36, boxShadow: 'var(--shadow-sm)' }}>
              {!isBooked ? (
                <form onSubmit={handleBookSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>Request a Virtual Seat</h3>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={bookName}
                      onChange={e => setBookName(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={bookEmail}
                      onChange={e => setBookEmail(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select Workshop Topic</label>
                    <select
                      value={bookTopic}
                      onChange={e => setBookTopic(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="Career Guidance">Career Guidance & Job Referrals</option>
                      <option value="Resume Review">Resume & Cover Letter Polish</option>
                      <option value="Interview Prep">Mock Technical Interviews</option>
                      <option value="Tax Filing Support">Newcomer Tax Filing 101</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="book-time" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>When Are You Free? (optional)</label>
                    <input
                      id="book-time"
                      type="text"
                      placeholder="e.g. weekday evenings, or Saturday mornings"
                      value={bookTime}
                      onChange={e => setBookTime(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>

                  {bookError && <div className="community-error">{bookError}</div>}

                  <button
                    type="submit"
                    disabled={bookSubmitting}
                    className="btn btn-primary"
                    style={{ padding: '14px 0', fontSize: '0.9rem', fontWeight: 800, background: 'var(--primary-600)', border: 'none', borderRadius: 10, cursor: bookSubmitting ? 'not-allowed' : 'pointer', color: 'white', opacity: bookSubmitting ? 0.6 : 1 }}
                  >
                    {bookSubmitting ? 'Sending...' : 'Send Request'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={56} style={{ color: 'var(--success-400)', margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>Request sent</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 24 }}>
                    Thanks {bookName}. Your request for <strong>{bookTopic}</strong> is with our help desk, and an admin will email <strong>{bookEmail}</strong> to agree a time. Nothing is booked yet.
                  </p>
                  <button
                    onClick={() => {
                      setIsBooked(false);
                      setBookName('');
                      setBookEmail('');
                      setBookTime('');
                    }}
                    className="btn btn-outline"
                    style={{ padding: '10px 20px', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                  >
                    Send Another Request
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Past Events Gallery */}
      {pastEvents.length > 0 && (
        <section style={{ padding: '80px 0', background: 'var(--bg-primary)' }}>
          <div className="container" style={{ maxWidth: 1200 }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Past Events</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Recent community gatherings.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {pastEvents.map((evt) => (
                <div key={evt.id} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-color)', background: 'white', transition: 'transform 0.2s ease', boxShadow: 'var(--shadow-sm)' }} className="hover:-translate-y-1">
                  <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ContentImage src={evt.image} alt={evt.title} fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(12,12,14,0.75)' }} />
                    <div style={{ position: 'relative', zIndex: 10, padding: '16px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Calendar size={28} style={{ color: 'white' }} />
                    </div>
                  </div>
                  <div style={{ padding: '24px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--text-primary)' }}>{evt.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{evt.attendees} attendees</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 12px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--primary-600)' }}>{eventTypeLabel(evt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      </main>

      <Footer />
    </>
  );
}
