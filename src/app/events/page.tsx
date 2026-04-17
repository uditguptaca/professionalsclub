'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import { Calendar, MapPin, Clock, Users, Video, ArrowRight, ExternalLink } from 'lucide-react';

export default function EventsPage() {
  const { events } = usePortal();
  
  const featuredEvent = events.find(e => e.isFeatured && e.status === 'upcoming');
  const upcomingVirtual = events.filter(e => e.status === 'upcoming' && e.eventType === 'virtual');
  const pastEvents = events.filter(e => e.status === 'past');

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/events-meetup.png" alt="Community meetup event" fill style={{ objectFit: 'cover', opacity: 0.3 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(217,119,6,0.3))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(245,158,11,0.3)' }}>
            <Calendar size={14} style={{ color: '#fbbf24' }} />
            <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.82rem' }}>Events & Meetups</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Connect, Learn & <span style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Grow Together</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Monthly in-person meetups, weekly virtual workshops, and YouTube livestreams — all designed to help you network, learn, and thrive in Canada.
          </p>
        </div>
      </section>

      {/* Featured Event + Sidebar */}
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>

            {/* Featured Event */}
            {featuredEvent && (
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', padding: '48px 40px', minHeight: 280, color: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Image src={featuredEvent.image} alt={featuredEvent.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.3))' }} />
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <span style={{ display: 'inline-block', background: '#b45309', color: 'white', padding: '4px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, marginBottom: 16 }}>Featured Event</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{featuredEvent.title}</h2>
                    <p style={{ color: '#f1f5f9', fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{featuredEvent.description}</p>
                  </div>
                </div>
                <div style={{ padding: '36px 40px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                    {[
                      { icon: <Calendar size={20} style={{ color: '#6366f1' }} />, label: featuredEvent.date, sub: 'Recurring monthly' },
                      { icon: <Clock size={20} style={{ color: '#6366f1' }} />, label: featuredEvent.time, sub: 'Eastern Time' },
                      { icon: <MapPin size={20} style={{ color: '#6366f1' }} />, label: featuredEvent.location, sub: 'Venue sent on RSVP' },
                      { icon: <Users size={20} style={{ color: '#6366f1' }} />, label: `${featuredEvent.capacity} Capacity`, sub: 'Pre-registration required' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {item.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{item.label}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ padding: '14px 32px' }}>RSVP for Next Meetup <ArrowRight size={16} /></button>
                </div>
              </div>
            )}

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Virtual Workshops */}
              <div style={{ borderRadius: 16, padding: 28, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Video size={20} style={{ color: '#dc2626' }} />
                  <h3 style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>Virtual Workshops</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>Weekly financial literacy and cultural adaptation guidance sessions online.</p>
                {upcomingVirtual.map((w) => (
                  <div key={w.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: 4 }}>{w.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>{w.platform || 'Online'}</span>
                      <span style={{ color: '#94a3b8' }}>{w.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Host CTA */}
              <div style={{ borderRadius: 16, padding: 28, background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', border: '1px solid #e0e7ff', textAlign: 'center' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)', marginBottom: 8, color: '#1e293b' }}>Want to Host an Event?</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>If you are a mentor or community leader, we welcome you to lead sessions or local meetups in your city.</p>
                <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}>Contact Organizers</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Past Events Gallery */}
      <section style={{ padding: '80px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Past Events</h2>
            <p style={{ fontSize: '1rem', color: '#64748b' }}>Highlights from our recent community gatherings.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {pastEvents.map((evt, i) => (
              <div key={evt.id} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white', transition: 'transform 0.2s ease', cursor: 'pointer' }} className="hover:-translate-y-1 hover:shadow-lg">
                <div style={{ position: 'relative', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image src={evt.image} alt={evt.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(${20 + i * 15}, ${40 + i * 10}, ${70 + i * 20}, 0.85), rgba(15,23,42,0.7))` }} />
                  <div style={{ position: 'relative', zIndex: 10, padding: '16px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Calendar size={28} style={{ color: 'white' }} />
                  </div>
                </div>
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8, color: '#1e293b' }}>{evt.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{evt.attendees} attendees</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: evt.eventType === 'in_person' ? '#d1fae5' : '#dbeafe', color: evt.eventType === 'in_person' ? '#065f46' : '#1e40af' }}>{evt.eventType === 'in_person' ? 'In-Person' : evt.platform || 'Virtual'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
