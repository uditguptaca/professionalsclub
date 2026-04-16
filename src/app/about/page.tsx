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
      <section style={{ padding: '160px 0 100px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
          <Image src="/hero-community.png" alt="Community Background" fill style={{ objectFit: 'cover' }} />
        </div>
        <div className="container" style={{ maxWidth: 850, position: 'relative', zIndex: 10 }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 24, lineHeight: 1.15 }}>
            Build Connections. <br/>
            <span className="text-gradient">Find Support. Grow Together.</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#cbd5e1', marginBottom: 48, lineHeight: 1.6, fontWeight: 400 }}>
            Professionals Club brings together members, mentors, volunteers, and trusted businesses in one community platform designed to help people connect, grow, and support one another.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/portal/signup" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: 12, boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)' }}>
              Join as a Member
            </Link>
            <Link href="/businesses" style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, transition: 'all 0.2s', backdropFilter: 'blur(8px)' }} className="hover:bg-white/20">
              Explore Businesses
            </Link>
          </div>
        </div>
      </section>

      {/* 2 & 3. WHO WE ARE & OUR MISSION */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Who We Are</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 24, lineHeight: 1.25 }}>
                More than a network. <br/>We are an ecosystem of mutual empowerment.
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.7, marginBottom: 24 }}>
                Professionals Club is a dynamic community platform meticulously designed to support individuals and local businesses alike. Born out of a deep-seated desire to help newcomers integrate seamlessly and professionals thrive, our platform connects people actively seeking guidance with those willing to lend a helping hand.
              </p>
              <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.7 }}>
                Whether you are here to feel connected, actively access structured support, discover vetted opportunities, or contribute back to the community, you are in exactly the right place.
              </p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', borderRadius: 32, padding: '48px 32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(79, 70, 229, 0.1)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#312e81', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 24 }}>Our Mission</h2>
              <p style={{ fontSize: '1.35rem', color: '#1e1b4b', lineHeight: 1.6, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                "To build a trusted, opportunity-rich community where meaningful connections drive personal and professional growth—ensuring everyone has the support they need to succeed in Canada."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHO WE SERVE */}
      <section style={{ padding: '80px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Who We Serve</h2>
            <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: 600, margin: '16px auto 0' }}>A platform built to deliver immense value to every participant in our ecosystem.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
            {/* Row 1: 2 Wide Blocks */}
            <div style={{ gridColumn: 'span 7', background: 'white', padding: '40px', borderRadius: 24, boxShadow: '0 15px 40px rgba(0,0,0,0.04)', display: 'flex', gap: 24, alignItems: 'center', border: '1px solid #f1f5f9' }}>
               <div style={{ width: 80, height: 80, borderRadius: 24, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                 <Users size={36} />
               </div>
               <div>
                 <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>Members</h3>
                 <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '1.05rem' }}>Seeking community, genuine connections, and access to an exclusive network of like-minded individuals across Canada.</p>
               </div>
            </div>

            <div style={{ gridColumn: 'span 5', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '40px', borderRadius: 24, boxShadow: '0 15px 40px rgba(15,23,42,0.15)', color: 'white' }}>
               <Globe size={36} color="#38bdf8" style={{ marginBottom: 20 }} />
               <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Newcomers</h3>
               <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Looking for structured settlement guidance, career navigation, and highly trusted local services to ease integration.</p>
            </div>

            {/* Row 2: 3 Smaller Blocks */}
            <div style={{ gridColumn: 'span 4', background: 'white', padding: '32px', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
               <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f0fdf4', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                 <Briefcase size={28} />
               </div>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>Professionals</h3>
               <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '0.9rem' }}>Searching for job referrals, skill advancement, networking events, and career progression opportunities.</p>
            </div>

            <div style={{ gridColumn: 'span 4', background: 'white', padding: '32px', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
               <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                 <HelpingHand size={28} />
               </div>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>Volunteers & Mentors</h3>
               <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '0.9rem' }}>Established leaders who want a safe, organized, and mediated environment to give back and guide others.</p>
            </div>

            <div style={{ gridColumn: 'span 4', background: 'white', padding: '32px', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
               <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                 <Building2 size={28} />
               </div>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>Local Businesses</h3>
               <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '0.9rem' }}>Quality providers aiming for community visibility, trusted reviews, and direct connection with a verified audience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHAT YOU CAN DO */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 64, alignItems: 'center', marginBottom: 48 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Platform Features</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 24, lineHeight: 1.2 }}>
                Everything you need to thrive, in one place.
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.6, marginBottom: 32 }}>
                The Professionals Club acts as your centralized hub for engagement, learning, and growth. We provide structured systems to ensure interactions remain valuable.
              </p>
              <Link href="/portal/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontWeight: 700, fontSize: '1.05rem' }}>
                Join the platform today <ChevronRight size={20} />
              </Link>
            </div>
            
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', aspectRatio: '16/9' }}>
              <Image src="/meetup_bg.png" alt="Platform Features" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(5, 150, 105, 0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Engagement Hub
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              'Join the Community',
              'Request Tailored Help',
              'Volunteer or Mentor',
              'Discover Verified Businesses',
              'Access Exclusive Events',
              'Find Fresh Opportunities'
            ].map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <CheckCircle2 color="#059669" size={20} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW THE PLATFORM WORKS */}
      <section style={{ padding: '80px 0', background: '#0f172a', color: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 64, alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: 120 }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 20 }}>How The Platform Works</h2>
              <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.6 }}>
                We prioritize privacy and safety. All direct member-to-member support flows are strictly admin-managed to guarantee trust and seamless coordination.
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
              {[
                { num: '01', title: 'Sign Up', desc: 'Join the community portal securely as a general member.' },
                { num: '02', title: 'Create Profile', desc: 'Tell us about your background and what you are seeking.' },
                { num: '03', title: 'Explore Resources', desc: 'Browse content, directory, and upcoming community events right away.' },
                { num: '04', title: 'Request/Give Help', desc: 'Submit a ticket to our admin team to get matched with a mentor.' }
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4f46e5', lineHeight: 1, fontFamily: 'var(--font-display)', opacity: 0.8 }}>{step.num}</div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>{step.title}</h3>
                    <p style={{ color: '#94a3b8', lineHeight: 1.5, fontSize: '0.9rem' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. WHY PEOPLE TRUST US & VALUES (Combined for compaction) */}
      <section style={{ padding: '80px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 64, alignItems: 'center' }}>
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', aspectRatio: '4/3' }}>
              <Image src="/volunteer-help.png" alt="Community Trust" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(79, 70, 229, 0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Safety & Trust
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Why People Trust Us</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 24, lineHeight: 1.2 }}>
                A structured, carefully managed ecosystem.
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { title: 'Community-First Approach', icon: <Heart size={20} /> },
                  { title: 'Verified Business Listings', icon: <Building2 size={20} /> },
                  { title: 'Structured Support Flows', icon: <BarChart3 size={20} /> },
                  { title: 'Safe & Organized Experience', icon: <Shield size={20} /> },
                  { title: 'Curated Opportunities', icon: <Briefcase size={20} /> },
                  { title: 'Growing Ecosystem', icon: <Users size={20} /> }
                ].map((trust, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: 'white', borderRadius: 16, boxShadow: '0 4px 10px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <div style={{ color: '#4f46e5', flexShrink: 0 }}>{trust.icon}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{trust.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BUSINESS & COMMUNITY SECTION */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80, alignItems: 'center' }}>
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '3/4', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <Image src="/event_bg.png" alt="Trusted local businesses" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(234, 88, 12, 0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Verified Directory
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Business Directory</div>
              <h2 style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 24, lineHeight: 1.15 }}>
                Trusted Businesses, <br/>Stronger Community
              </h2>
              <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.7, marginBottom: 32 }}>
                Professionals Club isn’t just for individuals seeking support—it is a launchpad and trust-builder for local businesses looking to genuinely serve their community.
              </p>
              
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 0, margin: 0, listStyle: 'none' }}>
                {[
                  'Local businesses can register their profiles and undergo a verification process.',
                  'Once verified, businesses are proudly featured in our curated Business Directory.',
                  'Businesses provide exclusive Member Benefits, varying from permanent discounts to limited-time consulting offers.',
                  'Members gain the advantage of discovering and supporting trusted providers safely in one place.'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea580c', marginTop: 8, flexShrink: 0 }} />
                    <span style={{ fontSize: '1.05rem', color: '#334155', lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
              
              <div style={{ marginTop: 40 }}>
                <Link href="/businesses" className="btn btn-outline" style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: 10, border: '2px solid #1e293b', color: '#1e293b', fontWeight: 700 }}>
                  Explore Directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. EVENTS / NETWORKING / GROWTH SECTION */}
      <section style={{ padding: '80px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Future Facing</div>
              <h2 style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 24, lineHeight: 1.15 }}>
                Meetups, Networking & Dynamic Growth
              </h2>
              <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.7, marginBottom: 32 }}>
                Learning happens continuously, but real growth happens collaboratively. Our robust integration of community events keeps the ecosystem active, alive, and profoundly helpful.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
                <div style={{ background: 'white', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                  <Calendar size={28} color="#4f46e5" style={{ marginBottom: 16 }} />
                  <h4 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>In-Person Meetups</h4>
                  <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Regular events focusing on interpersonal connections and face-to-face mentorship.</p>
                </div>
                <div style={{ background: 'white', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                  <GraduationCap size={28} color="#059669" style={{ marginBottom: 16 }} />
                  <h4 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Learning Webinars</h4>
                  <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Curated talks on immigration, job search strategies, and scaling your professional profile.</p>
                </div>
              </div>
            </div>
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '1/1', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <Image src="/events-meetup.png" alt="Community events and networking" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(79, 70, 229, 0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Networking & Growth
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. OUR VALUES */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Guiding Principles</div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 24, lineHeight: 1.2 }}>Our Core Values</h2>
              <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.6, marginBottom: 32 }}>
                We believe that robust professional ties and structured support accelerate settlement drastically for newcomers, all underpinned by high standards of integrity.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { title: 'Trust', desc: 'Secure boundaries.', icon: <ShieldCheck size={28} color="#4f46e5" /> },
                  { title: 'Community', desc: 'Unified strength.', icon: <Users size={28} color="#059669" /> },
                  { title: 'Support', desc: 'Structured guidance.', icon: <HelpingHand size={28} color="#ea580c" /> },
                  { title: 'Growth', desc: 'Accelerated careers.', icon: <BarChart3 size={28} color="#d97706" /> },
                  { title: 'Inclusion', desc: 'Diverse fields.', icon: <Globe size={28} color="#2563eb" /> },
                  { title: 'Integrity', desc: 'High standards.', icon: <Sparkles size={28} color="#7c3aed" /> },
                ].map((val, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <div style={{ flexShrink: 0 }}>{val.icon}</div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{val.title}</h3>
                      <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{val.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', aspectRatio: '4/3' }}>
              <Image src="/hero-community.png" alt="Community values" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Empowering Canadian Professionals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. CALL TO ACTION SECTION */}
      <section style={{ padding: '80px 0', background: '#0f172a' }}>
        <div className="container" style={{ maxWidth: 1000, textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 24 }}>
            Ready to become part of the community?
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
            Whether you need help settling in, want to network, or have a business that belongs in our directory—your place is here.
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/portal/signup" className="btn btn-primary" style={{ padding: '18px 40px', fontSize: '1.1rem', borderRadius: 12, background: '#4f46e5', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)' }}>
              Join the Membership
            </Link>
            <Link href="/businesses" className="btn btn-outline" style={{ padding: '18px 40px', fontSize: '1.1rem', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              Explore Businesses
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
