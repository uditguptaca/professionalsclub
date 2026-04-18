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
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* 1. HERO SECTION */}
      <section style={{ padding: '140px 0 60px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
          <Image src="/hero-community.png" alt="Community Background" fill style={{ objectFit: 'cover' }} />
        </div>
        <div className="container" style={{ maxWidth: 850, position: 'relative', zIndex: 10 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 6, lineHeight: 1.15 }}>
            Build Connections. <br/>
            <span className="text-gradient">Find Support. Grow Together.</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 6, lineHeight: 1.6, fontWeight: 400 }}>
            A platform to connect, grow, and support.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/portal/signup" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '0.8rem', borderRadius: 12, boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)' }}>
              Join as a Member
            </Link>
            <Link href="/businesses" style={{ padding: '10px 24px', fontSize: '0.8rem', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, transition: 'all 0.2s', backdropFilter: 'blur(8px)' }} className="hover:bg-white/20">
              Explore Businesses
            </Link>
          </div>
        </div>
      </section>

      {/* 2 & 3. WHO WE ARE & OUR MISSION */}
      <section style={{ padding: '20px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Who We Are</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 6, lineHeight: 1.25 }}>
                An ecosystem of mutual empowerment.
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7, marginBottom: 6 }}>
                A platform to support individuals, newcomers, and businesses.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Mission */}
              <div style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', borderRadius: 16, padding: '12px', textAlign: 'center', boxShadow: '0 10px 20px rgba(79, 70, 229, 0.05)' }}>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#312e81', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Our Mission</h2>
                <p style={{ fontSize: '0.85rem', color: '#1e1b4b', lineHeight: 1.5, fontWeight: 600 }}>
                  "Drive personal and professional growth in Canada."
                </p>
              </div>
              {/* Vision */}
              <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)', borderRadius: 16, padding: '12px', textAlign: 'center', boxShadow: '0 10px 20px rgba(5, 150, 105, 0.05)' }}>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#064e3b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Our Vision</h2>
                <p style={{ fontSize: '0.85rem', color: '#064e3b', lineHeight: 1.5, fontWeight: 600 }}>
                  "Seamless integration and thriving support platform."
                </p>
              </div>
              {/* Goals */}
              <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)', borderRadius: 16, padding: '12px', textAlign: 'center', boxShadow: '0 10px 20px rgba(217, 119, 6, 0.05)' }}>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Our Goals</h2>
                <p style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5, fontWeight: 600 }}>
                  "Empower professionals and local businesses."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHO WE SERVE */}
      <section style={{ padding: '20px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Who We Serve</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 600, margin: '16px auto 0' }}>Delivering value to every participant.</p>
          </div>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { title: 'Members', desc: 'Seeking genuine connections.', icon: <Users size={20} />, color: '#4f46e5', bg: '#eef2ff', href: '/portal/signup' },
              { title: 'Newcomers', desc: 'Looking for settlement guidance.', icon: <Globe size={20} />, color: '#38bdf8', bg: '#0f172a', isDark: true, href: '/settlement' },
              { title: 'Professionals', desc: 'Searching for job referrals.', icon: <Briefcase size={20} />, color: '#059669', bg: '#f0fdf4', href: '/jobs' },
              { title: 'Volunteers & Mentors', desc: 'Leaders wanting to give back.', icon: <HelpingHand size={20} />, color: '#d97706', bg: '#fffbeb', href: '/portal/signup' },
              { title: 'Local Businesses', desc: 'Providers aiming for visibility.', icon: <Building2 size={20} />, color: '#dc2626', bg: '#fef2f2', href: '/businesses' },
              { title: 'Students & Grads', desc: 'Building their early careers.', icon: <GraduationCap size={20} />, color: '#7c3aed', bg: '#f3e8ff', href: '/portal/signup' }
            ].map((item, i) => (
              <Link href={item.href} key={i} style={{ 
                background: item.isDark ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'white', 
                padding: '16px', 
                borderRadius: 16, 
                boxShadow: item.isDark ? '0 10px 30px rgba(15,23,42,0.15)' : '0 10px 30px rgba(0,0,0,0.03)', 
                border: item.isDark ? 'none' : '1px solid #f1f5f9',
                color: item.isDark ? 'white' : 'inherit',
                textDecoration: 'none',
                display: 'block',
                transition: 'transform 0.2s'
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: item.isDark ? 'rgba(56, 189, 248, 0.1)' : item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: item.isDark ? 'white' : '#1e293b', marginBottom: 6 }}>{item.title}</h3>
                <p style={{ color: item.isDark ? '#94a3b8' : '#64748b', lineHeight: 1.6, fontSize: '0.8rem' }}>{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHAT YOU CAN DO */}
      <section style={{ padding: '20px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Platform Features</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 6, lineHeight: 1.2 }}>
                Everything you need to thrive, in one place.
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6, marginBottom: 8 }}>
                Hub for engagement and learning.
              </p>
              <Link href="/portal/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontWeight: 700, fontSize: '0.8rem' }}>
                Join the platform today <ChevronRight size={20} />
              </Link>
            </div>
            
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', aspectRatio: '16/9' }}>
              <Image src="/meetup_bg.png" alt="Platform Features" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(5, 150, 105, 0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Engagement Hub
              </div>
            </div>
          </div>
          
          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              'Join the Community',
              'Request Tailored Help',
              'Volunteer or Mentor',
              'Discover Verified Businesses',
              'Access Exclusive Events',
              'Find Fresh Opportunities'
            ].map((feat, i) => (
              <Link href="/portal/signup" key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', textDecoration: 'none', transition: 'transform 0.2s' }}>
                <CheckCircle2 color="#059669" size={20} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.8rem' }}>{feat}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW THE PLATFORM WORKS */}
      <section style={{ padding: '20px 0', background: '#0f172a', color: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {[
                { num: '01', title: 'Sign Up', desc: 'Join portal securely.' },
                { num: '02', title: 'Create Profile', desc: 'Tell us your background.' },
                { num: '03', title: 'Explore Resources', desc: 'Browse resources and events.' },
                { num: '04', title: 'Request/Give Help', desc: 'Submit ticket for help.' }
              ].map((step, i) => (
                <Link href="/portal/signup" key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none', transition: 'background 0.2s' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4f46e5', lineHeight: 1, fontFamily: 'var(--font-display)', opacity: 0.8 }}>{step.num}</div>
                  <div>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>{step.title}</h3>
                    <p style={{ color: '#94a3b8', lineHeight: 1.5, fontSize: '0.8rem' }}>{step.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
        </div>
      </section>

      {/* 7. WHY PEOPLE TRUST US & VALUES (Combined for compaction) */}
      <section style={{ padding: '20px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', aspectRatio: '16/9' }}>
              <Image src="/volunteer-help.png" alt="Community Trust" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(79, 70, 229, 0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Safety & Trust
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Why People Trust Us</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 6, lineHeight: 1.2 }}>
                A managed ecosystem.
              </h2>
              <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { title: 'Community-First Approach', icon: <Heart size={20} /> },
                  { title: 'Verified Business Listings', icon: <Building2 size={20} /> },
                  { title: 'Structured Support Flows', icon: <BarChart3 size={20} /> },
                  { title: 'Safe & Organized Experience', icon: <Shield size={20} /> },
                  { title: 'Curated Opportunities', icon: <Briefcase size={20} /> },
                  { title: 'Growing Ecosystem', icon: <Users size={20} /> }
                ].map((trust, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'white', borderRadius: 12, boxShadow: '0 4px 10px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <div style={{ color: '#4f46e5', flexShrink: 0 }}>{trust.icon}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{trust.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BUSINESS & COMMUNITY SECTION */}
      <section style={{ padding: '20px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Business Directory</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 6, lineHeight: 1.15 }}>
                Trusted Businesses, <br/>Stronger Community
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7, marginBottom: 8 }}>
                Trusted business launchpad.
              </p>
              
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 0, margin: 0, listStyle: 'none' }}>
                {[
                  'Register profiles', 'Featured directory', 'Exclusive benefits', 'Safe discovery'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea580c', marginTop: 8, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
              
              <div style={{ marginTop: 40 }}>
                <Link href="/businesses" className="btn btn-outline" style={{ padding: '14px 28px', fontSize: '0.85rem', borderRadius: 10, border: '2px solid #1e293b', color: '#1e293b', fontWeight: 700 }}>
                  Explore Directory
                </Link>
              </div>
            </div>

            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <Image src="/event_bg.png" alt="Trusted local businesses" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(234, 88, 12, 0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Verified Directory
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. EVENTS / NETWORKING / GROWTH SECTION */}
      <section style={{ padding: '20px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <Image src="/events-meetup.png" alt="Community events and networking" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(79, 70, 229, 0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Networking & Growth
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Future Facing</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 6, lineHeight: 1.15 }}>
                Meetups, Networking & Dynamic Growth
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7, marginBottom: 8 }}>
                Growth happens via community events.
              </p>
              
              <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 40 }}>
                <div style={{ background: 'white', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <Calendar size={20} color="#4f46e5" style={{ marginBottom: 8 }} />
                  <h4 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>In-Person Meetups</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Face-to-face networking events.</p>
                </div>
                <div style={{ background: 'white', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <GraduationCap size={20} color="#059669" style={{ marginBottom: 8 }} />
                  <h4 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Learning Webinars</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Talks on jobs and settling.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. OUR VALUES */}
      <section style={{ padding: '20px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Guiding Principles</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 6, lineHeight: 1.2 }}>Our Core Values</h2>
              <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, marginBottom: 8 }}>
                Accelerated settlement.
              </p>
              <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { title: 'Trust', desc: 'Secure boundaries.', icon: <ShieldCheck size={20} color="#4f46e5" /> },
                  { title: 'Community', desc: 'Unified strength.', icon: <Users size={20} color="#059669" /> },
                  { title: 'Support', desc: 'Structured guidance.', icon: <HelpingHand size={20} color="#ea580c" /> },
                  { title: 'Growth', desc: 'Accelerated careers.', icon: <BarChart3 size={20} color="#d97706" /> },
                  { title: 'Inclusion', desc: 'Diverse fields.', icon: <Globe size={20} color="#2563eb" /> },
                  { title: 'Integrity', desc: 'High standards.', icon: <Sparkles size={20} color="#7c3aed" /> },
                ].map((val, i) => (
                  <Link href="/portal/signup" key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', textDecoration: 'none' }} className="hover:-translate-y-1 hover:shadow-md transition-all">
                    <div style={{ flexShrink: 0 }}>{val.icon}</div>
                    <div>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>{val.title}</h3>
                      <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>{val.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', aspectRatio: '16/9' }}>
              <Image src="/hero-community.png" alt="Community values" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>Empowering Canadian Professionals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. CALL TO ACTION SECTION */}
      <section style={{ padding: '20px 0', background: '#0f172a' }}>
        <div className="container" style={{ maxWidth: 1000, textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
            Ready to become part of the community?
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: 6, maxWidth: 600, margin: '0 auto 48px' }}>
            Find help or list business.
          </p>
          
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/portal/signup" className="btn btn-primary" style={{ padding: '18px 40px', fontSize: '0.8rem', borderRadius: 12, background: '#4f46e5', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)' }}>
              Join the Membership
            </Link>
            <Link href="/businesses" className="btn btn-outline" style={{ padding: '18px 40px', fontSize: '0.8rem', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              Explore Businesses
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
