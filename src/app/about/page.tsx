import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { 
  Users, Building2, HelpingHand, Target, Sparkles,
  ShieldCheck, Shield, MapPin, Briefcase, GraduationCap, Calendar,
  Globe, Heart, CheckCircle2, ChevronRight, BarChart3,
  MessageSquare
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="about-hero-section" style={{ position: 'relative', padding: '140px 0 100px', display: 'flex', alignItems: 'center', background: '#0c0c0e', color: 'white', textAlign: 'center' }}>
        {/* Background Animation (Toronto Skyline CN Tower) */}
        <div className="cinematic-bg-container">
          <img 
            src="/images/toronto_skyline_hero.png" 
            alt="About Us background" 
            className="cinematic-bg"
            style={{ opacity: 0.45 }}
          />
          <div className="cinematic-overlay" />
        </div>
        <div className="container" style={{ maxWidth: 850, position: 'relative', zIndex: 10 }}>
          <h1 style={{ fontSize: '3.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15, color: '#ffffff' }}>
            Build Connections. <br/>
            <span style={{ color: 'var(--primary-600)' }}>Find Support. Grow Together.</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--gray-400)', marginBottom: 36, lineHeight: 1.6, fontWeight: 400 }}>
            A platform to connect, grow, and support.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/portal/signup" className="btn btn-primary btn-lg" style={{ padding: '14px 28px', background: 'var(--primary-600)', boxShadow: '0 8px 24px rgba(232, 93, 4, 0.25)' }}>
              Join as a Member
            </Link>
            <Link href="/businesses" className="btn btn-lg" style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', backdropFilter: 'blur(8px)' }}>
              Explore Businesses
            </Link>
          </div>
        </div>
      </section>

      {/* 2 & 3. WHO WE ARE & OUR MISSION */}
      <section className="section" style={{ background: 'var(--bg-primary)' }}>
        <div className="container">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Who We Are</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.25 }}>
                An ecosystem of mutual empowerment.
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 0 }}>
                A platform to support individuals, newcomers, and businesses.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Mission */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '24px', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Our Mission</h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 700 }}>
                  "Drive personal and professional growth in Canada."
                </p>
              </div>
              {/* Vision */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '24px', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Our Vision</h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 700 }}>
                  "Seamless integration and thriving support platform."
                </p>
              </div>
              {/* Goals */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '24px', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Our Goals</h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 700 }}>
                  "Empower professionals and local businesses."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHO WE SERVE */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Who We Serve</h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '16px auto 0' }}>Delivering value to every participant.</p>
          </div>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {[
              { title: 'Members', desc: 'Seeking genuine connections.', icon: <Users size={20} />, href: '/portal/signup' },
              { title: 'Newcomers', desc: 'Looking for settlement guidance.', icon: <Globe size={20} />, href: '/settlement' },
              { title: 'Professionals', desc: 'Searching for job referrals.', icon: <Briefcase size={20} />, href: '/jobs' },
              { title: 'Volunteers & Mentors', desc: 'Leaders wanting to give back.', icon: <HelpingHand size={20} />, href: '/portal/signup' },
              { title: 'Local Businesses', desc: 'Providers aiming for visibility.', icon: <Building2 size={20} />, href: '/businesses' },
              { title: 'Students & Grads', desc: 'Building their early careers.', icon: <GraduationCap size={20} />, href: '/portal/signup' }
            ].map((item, i) => (
              <Link href={item.href} key={i} style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: 16, 
                boxShadow: 'var(--shadow-md)', 
                border: '1px solid var(--border-color)',
                color: 'inherit',
                textDecoration: 'none',
                display: 'block',
                transition: 'transform 0.2s'
              }} className="hover:-translate-y-1">
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-secondary)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.88rem' }}>{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHAT YOU CAN DO */}
      <section className="section" style={{ background: 'var(--bg-primary)' }}>
        <div className="container">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Platform Features</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.25 }}>
                Everything you need to thrive, in one place.
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
                Hub for engagement and learning.
              </p>
              <Link href="/portal/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--primary-600)', fontWeight: 700, fontSize: '0.95rem' }}>
                Join the platform today <ChevronRight size={20} />
              </Link>
            </div>
            
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', aspectRatio: '16/9' }}>
              <Image src="/meetup_bg.png" alt="Platform Features" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'var(--primary-600)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Engagement Hub
              </div>
            </div>
          </div>
          
          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {[
              'Join the Community',
              'Request Tailored Help',
              'Volunteer or Mentor',
              'Discover Verified Businesses',
              'Access Exclusive Events',
              'Find Fresh Opportunities'
            ].map((feat, i) => (
              <Link href="/portal/signup" key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-color)', textDecoration: 'none', transition: 'transform 0.2s' }}>
                <CheckCircle2 color="var(--primary-600)" size={20} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{feat}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW THE PLATFORM WORKS */}
      <section className="section" style={{ background: '#0c0c0e', color: 'white' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-display)' }}>How It Works</h2>
          </div>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
              {[
                { num: '01', title: 'Sign Up', desc: 'Join portal securely.' },
                { num: '02', title: 'Create Profile', desc: 'Tell us your background.' },
                { num: '03', title: 'Explore Resources', desc: 'Browse resources and events.' },
                { num: '04', title: 'Request/Give Help', desc: 'Submit ticket for help.' }
              ].map((step, i) => (
                <Link href="/portal/signup" key={i} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', transition: 'background 0.2s' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-600)', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{step.num}</div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8, color: '#ffffff' }}>{step.title}</h3>
                    <p style={{ color: 'var(--gray-400)', lineHeight: 1.5, fontSize: '0.88rem' }}>{step.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
        </div>
      </section>

      {/* 7. WHY PEOPLE TRUST US & VALUES (Combined for compaction) */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', aspectRatio: '16/9' }}>
              <Image src="/volunteer-help.png" alt="Community Trust" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, left: 20, background: 'var(--primary-600)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Safety & Trust
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Why People Trust Us</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.25 }}>
                A managed ecosystem.
              </h2>
              <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { title: 'Community-First Approach', icon: <Heart size={20} /> },
                  { title: 'Verified Business Listings', icon: <Building2 size={20} /> },
                  { title: 'Structured Support Flows', icon: <BarChart3 size={20} /> },
                  { title: 'Safe & Organized Experience', icon: <Shield size={20} /> },
                  { title: 'Curated Opportunities', icon: <Briefcase size={20} /> },
                  { title: 'Growing Ecosystem', icon: <Users size={20} /> }
                ].map((trust, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'var(--bg-primary)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--primary-600)', flexShrink: 0 }}>{trust.icon}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{trust.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BUSINESS & COMMUNITY SECTION */}
      <section className="section" style={{ background: 'var(--bg-primary)' }}>
        <div className="container">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Business Directory</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.25 }}>
                Trusted Businesses, <br/>Stronger Community
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
                Trusted business launchpad.
              </p>
              
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 0, margin: '0 0 32px 0', listStyle: 'none' }}>
                {[
                  'Register profiles', 'Featured directory', 'Exclusive benefits', 'Safe discovery'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-600)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              
              <div>
                <Link href="/businesses" className="btn btn-outline" style={{ padding: '14px 28px', fontSize: '0.95rem', borderRadius: 10, border: '2px solid var(--primary-600)', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Explore Directory
                </Link>
              </div>
            </div>

            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9', boxShadow: 'var(--shadow-lg)' }}>
              <Image src="/event_bg.png" alt="Trusted local businesses" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, left: 20, background: 'var(--primary-600)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Verified Directory
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. EVENTS / NETWORKING / GROWTH SECTION */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9', boxShadow: 'var(--shadow-lg)' }}>
              <Image src="/events-meetup.png" alt="Community events and networking" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'var(--primary-600)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Networking & Growth
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Future Facing</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.25 }}>
                Meetups, Networking & Dynamic Growth
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
                Growth happens via community events.
              </p>
              
              <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  <Calendar size={20} color="var(--primary-600)" style={{ marginBottom: 8 }} />
                  <h4 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>In-Person Meetups</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Face-to-face networking events.</p>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  <GraduationCap size={20} color="var(--primary-600)" style={{ marginBottom: 8 }} />
                  <h4 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Learning Webinars</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Talks on jobs and settling.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. OUR VALUES */}
      <section className="section" style={{ background: 'var(--bg-primary)' }}>
        <div className="container">
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Guiding Principles</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.25 }}>Our Core Values</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                Accelerated settlement.
              </p>
              <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { title: 'Trust', desc: 'Secure boundaries.', icon: <ShieldCheck size={20} color="var(--primary-600)" /> },
                  { title: 'Community', desc: 'Unified strength.', icon: <Users size={20} color="var(--primary-600)" /> },
                  { title: 'Support', desc: 'Structured guidance.', icon: <HelpingHand size={20} color="var(--primary-600)" /> },
                  { title: 'Growth', desc: 'Accelerated careers.', icon: <BarChart3 size={20} color="var(--primary-600)" /> },
                  { title: 'Inclusion', desc: 'Diverse fields.', icon: <Globe size={20} color="var(--primary-600)" /> },
                  { title: 'Integrity', desc: 'High standards.', icon: <Sparkles size={20} color="var(--primary-600)" /> },
                ].map((val, i) => (
                  <Link href="/portal/signup" key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, textDecoration: 'none' }} className="hover:-translate-y-1 hover:shadow-md transition-all">
                    <div style={{ flexShrink: 0 }}>{val.icon}</div>
                    <div>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{val.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{val.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', aspectRatio: '16/9' }}>
              <Image src="/hero-community.png" alt="Community values" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', background: 'linear-gradient(transparent, rgba(12,12,14,0.8))' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Empowering Canadian Professionals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. CALL TO ACTION SECTION */}
      <section className="section" style={{ background: '#0c0c0e' }}>
        <div className="container" style={{ maxWidth: 1000, textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>
            Ready to become part of the community?
          </h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--gray-400)', marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
            Find help or list business.
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/portal/signup" className="btn btn-primary btn-lg" style={{ padding: '16px 36px', fontSize: '0.95rem', borderRadius: 12, background: 'var(--primary-600)', boxShadow: '0 8px 24px rgba(232, 93, 4, 0.3)' }}>
              Join the Membership
            </Link>
            <Link href="/businesses" className="btn btn-lg" style={{ padding: '16px 36px', fontSize: '0.95rem', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
              Explore Businesses
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
