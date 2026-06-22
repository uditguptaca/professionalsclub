'use client';
import React from 'react';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import { Calendar, MapPin, Clock, Users, Video, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface SupabaseEvent {
  id: string | number;
  title?: string;
  time?: string;
  date?: string;
  created_at?: string;
}

export default function EventsPage() {
  const { events } = usePortal();
  
  const [supabaseEvents, setSupabaseEvents] = React.useState<SupabaseEvent[]>([]);
  const [activeSection, setActiveSection] = React.useState<string | null>(null);

  const toggleSection = (section: string) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  React.useEffect(() => {
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
  const upcomingVirtual = events.filter(e => e.status === 'upcoming' && e.eventType === 'virtual');
  const pastEvents = events.filter(e => e.status === 'past');

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 160, paddingBottom: 100, background: '#0c0c0e', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/events-meetup.png" alt="Community meetup event" fill style={{ objectFit: 'cover', opacity: 0.25 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.95), rgba(232,93,4,0.25))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(232,93,4,0.3)' }}>
            <Calendar size={14} style={{ color: 'var(--primary-400)' }} />
            <span style={{ color: 'var(--primary-200)', fontWeight: 700, fontSize: '0.82rem' }}>Events & Meetups</span>
          </div>
          <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Connect, Learn & <span style={{ color: 'var(--primary-600)' }}>Grow Together</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--gray-400)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Meetups, workshops, and livestreams to help you thrive.
          </p>
        </div>
      </section>

      {/* Featured Event + Sidebar */}
      <section style={{ padding: '80px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40 }}>

            {/* Featured Event */}
            {featuredEvent && (
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', background: 'white' }}>
                <div style={{ position: 'relative', padding: '48px 40px', minHeight: 280, color: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Image src={featuredEvent.image} alt={featuredEvent.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.9), rgba(12,12,14,0.3))' }} />
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <span style={{ display: 'inline-block', background: 'var(--primary-600)', color: 'white', padding: '4px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, marginBottom: 16 }}>Featured Event</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8, color: 'white' }}>{featuredEvent.title}</h2>
                    <p style={{ color: 'var(--gray-300)', fontSize: '1rem' }}>{featuredEvent.description.length > 50 ? featuredEvent.description.substring(0, 47) + '...' : featuredEvent.description}</p>
                  </div>
                </div>
                <div style={{ padding: '36px 40px' }}>
                  <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                    {[
                      { icon: <Calendar size={20} style={{ color: 'var(--primary-600)' }} />, label: featuredEvent.date, sub: 'Recurring monthly' },
                      { icon: <Clock size={20} style={{ color: 'var(--primary-600)' }} />, label: featuredEvent.time, sub: 'Eastern Time' },
                      { icon: <MapPin size={20} style={{ color: 'var(--primary-600)' }} />, label: featuredEvent.location, sub: 'Venue sent on RSVP' },
                      { icon: <Users size={20} style={{ color: 'var(--primary-600)' }} />, label: `${featuredEvent.capacity} Capacity`, sub: 'Pre-registration required' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {item.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ padding: '14px 32px', background: 'var(--primary-600)' }}>RSVP for Next Meetup <ArrowRight size={16} /></button>
                </div>
              </div>
            )}

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Virtual Workshops Section */}
              <div 
                style={{ borderRadius: 16, border: '1px solid var(--border-color)', background: 'white', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                onClick={() => toggleSection('virtual')}
              >
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: activeSection === 'virtual' ? 'var(--bg-secondary)' : 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Video size={20} style={{ color: 'var(--primary-600)' }} />
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>Virtual Workshops</h3>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{activeSection === 'virtual' ? '−' : '+'}</div>
                </div>
                {activeSection === 'virtual' && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: 16, lineHeight: 1.6 }}>Weekly online sessions to level up your skills.</p>
                    <div style={{ marginTop: 16 }}>
                      {upcomingVirtual.length > 0 ? (
                        upcomingVirtual.map((evt, i) => (
                          <div key={i} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{evt.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{evt.date} at {evt.time}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No upcoming virtual workshops at the moment.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Host an Event Section */}
              <div 
                style={{ borderRadius: 16, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                onClick={() => toggleSection('host')}
              >
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Users size={20} style={{ color: 'var(--primary-600)' }} />
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>Host an Event</h3>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--primary-600)' }}>{activeSection === 'host' ? '−' : '+'}</div>
                </div>
                {activeSection === 'host' && (
                  <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>Lead sessions in your city and build your local community.</p>
                    <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem', background: 'var(--primary-600)' }}>Contact Organizers</button>
                  </div>
                )}
              </div>

              {/* Upcoming Events Section (Supabase) */}
              <div 
                style={{ borderRadius: 16, border: '1px solid var(--border-color)', background: 'white', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                onClick={() => toggleSection('upcoming')}
              >
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: activeSection === 'upcoming' ? 'var(--bg-secondary)' : 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={20} style={{ color: 'var(--primary-600)' }} />
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>Upcoming events</h3>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{activeSection === 'upcoming' ? '−' : '+'}</div>
                </div>
                {activeSection === 'upcoming' && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 16, marginBottom: 16, lineHeight: 1.6 }}>Upcoming live events pulled from our database.</p>
                    
                    {supabaseEvents.length === 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: 10, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        No events found in Supabase table.<br/>Add a row in the dashboard!
                      </div>
                    )}

                    {supabaseEvents.map((w: SupabaseEvent) => (
                      <div key={w.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'white', border: '1px solid var(--border-color)', marginBottom: 8, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 4 }}>{w.title || 'Untitled Event'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Live Data</span>
                          <span style={{ color: 'var(--text-muted)' }}>{w.time || w.date || w.created_at?.split('T')[0] || 'Today'}</span>
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
      <section style={{ padding: '80px 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Past Events</h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Recent community gatherings.</p>
          </div>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {pastEvents.map((evt, i) => (
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
      
      <Footer />
    </>
  );
}
