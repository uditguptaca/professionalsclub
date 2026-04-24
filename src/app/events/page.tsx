'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import { Calendar, MapPin, Clock, Users, Video, ArrowRight, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function EventsPage() {
  const { events } = usePortal();
  
  const [supabaseEvents, setSupabaseEvents] = React.useState<any[]>([]);
  const [activeSection, setActiveSection] = React.useState<string | null>(null);

  const toggleSection = (section: string) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  React.useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase.from('events').select('*');
        if (data) {
          setSupabaseEvents(data);
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
            Meetups, workshops, and livestreams to help you thrive.
          </p>
        </div>
      </section>

      {/* Featured Event + Sidebar */}
      <section style={{ padding: '40px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>

            {/* Featured Event */}
            {featuredEvent && (
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', padding: '48px 40px', minHeight: 280, color: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Image src={featuredEvent.image} alt={featuredEvent.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.3))' }} />
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <span style={{ display: 'inline-block', background: '#b45309', color: 'white', padding: '4px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, marginBottom: 16 }}>Featured Event</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{featuredEvent.title}</h2>
                    <p style={{ color: '#f1f5f9', fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{featuredEvent.description.length > 50 ? featuredEvent.description.substring(0, 47) + '...' : featuredEvent.description}</p>
                  </div>
                </div>
                <div style={{ padding: '36px 40px' }}>
                  <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
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
              
              {/* Virtual Workshops Section */}
              <div 
                style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: 'white', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => toggleSection('virtual')}
              >
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: activeSection === 'virtual' ? '#f8fafc' : 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Video size={20} style={{ color: '#dc2626' }} />
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)', margin: 0 }}>Virtual Workshops</h3>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#64748b' }}>{activeSection === 'virtual' ? '−' : '+'}</div>
                </div>
                {activeSection === 'virtual' && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: 16, lineHeight: 1.6 }}>Weekly online sessions to level up your skills.</p>
                    <div style={{ marginTop: 16 }}>
                      {upcomingVirtual.length > 0 ? (
                        upcomingVirtual.map((evt, i) => (
                          <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{evt.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{evt.date} at {evt.time}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No upcoming virtual workshops at the moment.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Host an Event Section */}
              <div 
                style={{ borderRadius: 16, border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => toggleSection('host')}
              >
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Users size={20} style={{ color: '#4f46e5' }} />
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)', margin: 0, color: '#1e293b' }}>Host an Event</h3>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#4f46e5' }}>{activeSection === 'host' ? '−' : '+'}</div>
                </div>
                {activeSection === 'host' && (
                  <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>Lead sessions in your city and build your local community.</p>
                    <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}>Contact Organizers</button>
                  </div>
                )}
              </div>

              {/* Upcoming Events Section (Supabase) */}
              <div 
                style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: 'white', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => toggleSection('upcoming')}
              >
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: activeSection === 'upcoming' ? '#f8fafc' : 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={20} style={{ color: '#0ea5e9' }} />
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)', margin: 0 }}>Upcoming events</h3>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#64748b' }}>{activeSection === 'upcoming' ? '−' : '+'}</div>
                </div>
                {activeSection === 'upcoming' && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 16, marginBottom: 16, lineHeight: 1.6 }}>Upcoming live events pulled from our database.</p>
                    
                    {supabaseEvents.length === 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: 10, textAlign: 'center', background: '#f1f5f9', borderRadius: 8 }}>
                        No events found in Supabase table.<br/>Add a row in the dashboard!
                      </div>
                    )}

                    {supabaseEvents.map((w: any) => (
                      <div key={w.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', marginBottom: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: 4 }}>{w.title || 'Untitled Event'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>Live Data</span>
                          <span style={{ color: '#94a3b8' }}>{w.time || w.date || w.created_at?.split('T')[0] || 'Today'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Past Events Gallery */}
      <section style={{ padding: '40px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Past Events</h2>
            <p style={{ fontSize: '1rem', color: '#64748b' }}>Recent community gatherings.</p>
          </div>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
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
      <Footer />
    </>
  );
}
