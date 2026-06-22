'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import { Calendar, MapPin, Clock, Users, Video, ArrowRight, X, CheckCircle2, Ticket, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import MeetupEventVideo from '@/components/events/MeetupEventVideo';

interface SupabaseEvent {
  id: string | number;
  title?: string;
  time?: string;
  date?: string;
  created_at?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  buttonText: string;
}

const mockUpcomingEvents: UpcomingEvent[] = [
  {
    id: 'up-001',
    title: "Saturday's Morning Mixer",
    date: 'Saturday, June 27',
    time: '9:00 AM',
    location: 'Downtown Cafe, Toronto',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=350&h=200',
    buttonText: 'Join This Saturday'
  },
  {
    id: 'up-002',
    title: 'Morning Business Mixer',
    date: 'TBA',
    time: 'Morning Session',
    location: 'Professionals Club Hall, Vancouver',
    image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=350&h=200',
    buttonText: 'RSVP Now'
  },
  {
    id: 'up-003',
    title: 'Ladies Business Mixer',
    date: 'Tuesday, July 7',
    time: '6:00 PM',
    location: 'Hotel Lounge, Calgary',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=350&h=200',
    buttonText: 'Meet Your Alliances'
  },
  {
    id: 'up-004',
    title: 'Singles Mixer 3.0 (Spring Edition)',
    date: 'TBA',
    time: 'Evening Session',
    location: 'Social Club, Toronto',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=350&h=200',
    buttonText: 'Find Your Match'
  },
  {
    id: 'up-005',
    title: 'Free Meditation Class',
    date: 'Weekly',
    time: 'Every Sunday 10:00 AM',
    location: 'Online Zoom Session',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=350&h=200',
    buttonText: 'View Schedule'
  }
];

export default function EventsPage() {
  const { events } = usePortal();
  const [supabaseEvents, setSupabaseEvents] = useState<SupabaseEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<UpcomingEvent | null>(null);
  
  // RSVP Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tickets, setTickets] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Virtual Workshop Booking States
  const [bookName, setBookName] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookTopic, setBookTopic] = useState('Career Guidance');
  const [bookTime, setBookTime] = useState('June 25, 3:00 PM');
  const [isBooked, setIsBooked] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase.from('events').select('*');
        if (data) {
          setSupabaseEvents(data as SupabaseEvent[]);
        } else if (error) {
          console.error("Supabase error:", error);
        }
      } catch (err) {
        console.error("Error connecting to Supabase:", err);
      }
    }
    fetchEvents();
  }, []);

  const featuredEvent = events.find(e => e.isFeatured && e.status === 'upcoming');
  const pastEvents = events.filter(e => e.status === 'past');

  const handleRSVPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setIsSubmitted(true);
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName || !bookEmail) return;
    setIsBooked(false);
    setTimeout(() => {
      setIsBooked(true);
    }, 100);
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 160, paddingBottom: 100, background: '#0c0c0e', overflow: 'hidden' }}>
        <MeetupEventVideo />
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(232,93,4,0.3)' }}>
            <Calendar size={14} style={{ color: 'var(--primary-400)' }} />
            <span style={{ color: 'var(--primary-200)', fontWeight: 700, fontSize: '0.82rem' }}>Events & Meetups</span>
          </div>
          <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Connect, Learn & <span style={{ color: 'var(--primary-600)' }}>Grow Together</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--gray-400)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Meetups, workshops, and livestreams to help you thrive in Canada.
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
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>{mockUpcomingEvents.length} Active Events</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {mockUpcomingEvents.map(evt => (
              <div key={evt.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s, box-shadow 0.2s' }} className="hover:-translate-y-1 hover:shadow-md">
                <div style={{ position: 'relative', height: 180, width: '100%' }}>
                  <img src={evt.image} alt={evt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(232, 93, 4, 0.95)', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700 }}>
                    {evt.date.includes('Weekly') ? 'Weekly Class' : 'Special Event'}
                  </div>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, height: '3rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {evt.title}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} style={{ color: 'var(--primary-600)' }} />
                      <span>{evt.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={14} style={{ color: 'var(--primary-600)' }} />
                      <span>{evt.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={14} style={{ color: 'var(--primary-600)' }} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{evt.location}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedEvent(evt);
                      setIsSubmitted(false);
                    }}
                    className="btn btn-primary"
                    style={{ marginTop: 'auto', width: '100%', background: 'var(--primary-600)', border: 'none', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {evt.buttonText} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Virtual Bookings & Database Relays */}
      <section style={{ padding: '80px 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'center' }}>
            
            {/* Virtual Booking Info */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.06)', border: '1px solid rgba(232,93,4,0.12)', padding: '6px 12px', borderRadius: 8, marginBottom: 16, color: 'var(--primary-700)', fontSize: '0.8rem', fontWeight: 700 }}>
                <Sparkles size={14} /> Virtual Workshop Bookings
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20 }}>Book a Virtual Slot</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 24 }}>
                Can't make it to local mixers? Register a virtual booking for our weekly workshops. Select a topic and pick your preferred time slot to receive a secure link.
              </p>

              {/* Database Events Display */}
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border-color)', padding: 24 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ticket size={18} style={{ color: 'var(--primary-600)' }} /> Database Relayed Events
                </h4>
                {supabaseEvents.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    No events stored in Supabase currently. Create new events in the admin dashboard!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {supabaseEvents.map(w => (
                      <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{w.title || 'Untitled Event'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Relayed live from DB</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-600)', background: 'white', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>{w.time || w.date || 'Today'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Booking Form */}
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 24, padding: 36, boxShadow: 'var(--shadow-sm)' }}>
              {!isBooked ? (
                <form onSubmit={handleBookSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>Register Virtual Seat</h3>
                  
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
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preferred Session Slot</label>
                    <select
                      value={bookTime}
                      onChange={e => setBookTime(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="June 25, 3:00 PM">Thursday, June 25, 3:00 PM EST</option>
                      <option value="June 27, 11:00 AM">Saturday, June 27, 11:00 AM EST</option>
                      <option value="July 02, 3:00 PM">Thursday, July 02, 3:00 PM EST</option>
                      <option value="Weekly Sunday">Every Sunday, 10:00 AM (Recurring)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '14px 0', fontSize: '0.9rem', fontWeight: 800, background: 'var(--primary-600)', border: 'none', borderRadius: 10, cursor: 'pointer', color: 'white' }}
                  >
                    Confirm Booking
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={56} style={{ color: '#10b981', margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>Virtual Seat Reserved!</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 24 }}>
                    Hey <strong>{bookName}</strong>, your seat for <strong>{bookTopic}</strong> on <strong>{bookTime}</strong> is booked successfully. We sent a calendar invitation and link to <strong>{bookEmail}</strong>.
                  </p>
                  <button
                    onClick={() => {
                      setIsBooked(false);
                      setBookName('');
                      setBookEmail('');
                    }}
                    className="btn btn-outline"
                    style={{ padding: '10px 20px', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                  >
                    Book Another Slot
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Past Events Gallery */}
      <section style={{ padding: '80px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Past Events</h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Recent community gatherings.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {pastEvents.map((evt) => (
              <div key={evt.id} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-color)', background: 'white', transition: 'transform 0.2s ease', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }} className="hover:-translate-y-1">
                <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image src={evt.image} alt={evt.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(12,12,14,0.75)' }} />
                  <div style={{ position: 'relative', zIndex: 10, padding: '16px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Calendar size={28} style={{ color: 'white' }} />
                  </div>
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--text-primary)' }}>{evt.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{evt.attendees} attendees</span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 12px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--primary-600)' }}>{evt.eventType === 'in_person' ? 'In-Person' : evt.platform || 'Virtual'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RSVP Modal */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(12,12,14,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 480, padding: 32, border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', position: 'relative' }}>
            
            <button
              onClick={() => setSelectedEvent(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            {!isSubmitted ? (
              <form onSubmit={handleRSVPSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>RSVP for Event</h3>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: 16, borderRadius: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 8 }}>{selectedEvent.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedEvent.date} • {selectedEvent.time}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{selectedEvent.location}</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Number of Tickets</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={tickets}
                    onChange={e => setTickets(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '14px 0', fontSize: '0.9rem', fontWeight: 800, background: 'var(--primary-600)', border: 'none', borderRadius: 10, cursor: 'pointer', color: 'white' }}
                >
                  Confirm Registration
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={56} style={{ color: '#10b981', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Registration Confirmed!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 24 }}>
                  Thanks <strong>{name}</strong>! We have registered <strong>{tickets} ticket(s)</strong> for you for <strong>{selectedEvent.title}</strong>. 
                  Confirmation details and secure tickets have been emailed to <strong>{email}</strong>.
                </p>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', background: 'var(--primary-600)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700 }}
                >
                  Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
