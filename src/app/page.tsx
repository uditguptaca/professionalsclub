import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Users, Briefcase, Calendar, Shield, HandHeart, MapPin, FileText, BookOpen, GraduationCap, CheckCircle, Phone, ChevronRight, Star, HelpCircle, ShieldCheck, Tag, Building2, Home as HomeIcon, Landmark, Hospital, Bus, ClipboardList, DollarSign, Globe, Wallet } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      
      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', padding: '120px 0', display: 'flex', alignItems: 'center', overflow: 'hidden', background: '#0c0c0e' }}>
        {/* Background Image */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/hero-community.png" alt="Professionals networking" fill style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.25 }} priority />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8, 8, 12, 0.5) 0%, rgba(8, 8, 12, 0.98) 100%), linear-gradient(135deg, rgba(8, 8, 12, 0.9) 0%, rgba(232, 93, 4, 0.18) 100%)' }} />
        </div>

        <div className="container mobile-stack" style={{ position: 'relative', zIndex: 10, maxWidth: 1400, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 40, alignItems: 'center', paddingTop: 40 }}>
          {/* Left */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(232,93,4,0.3)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-400)', animation: 'pulse 2s infinite' }} />
              <span style={{ color: 'var(--primary-100)', fontWeight: 700, fontSize: '0.82rem' }}>Secure Community Support</span>
            </div>

            <h1 style={{ fontSize: '4.2rem', fontWeight: 900, color: 'white', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 24, fontFamily: 'var(--font-display)' }}>
              Your Canadian Journey,<br />
              <span style={{ color: 'var(--primary-600)' }}>Fully Supported.</span>
            </h1>

            <p style={{ fontSize: '1.25rem', color: 'var(--gray-400)', lineHeight: 1.7, marginBottom: 36, maxWidth: 520 }}>
              Expert volunteers. Secure support.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
              <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ fontSize: '1rem', padding: '18px 36px', background: 'var(--primary-600)', boxShadow: '0 8px 30px rgba(232,93,4,0.3)' }}>
                Request Help <ArrowRight size={20} />
              </Link>
              <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', padding: '18px 36px' }}>
                Become a Volunteer
              </Link>
            </div>

            {/* Stats Row */}
            <div className="mobile-wrap" style={{ display: 'flex', gap: 40, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32 }}>
              {[
                { val: '5,000+', label: 'Members' },
                { val: '89+', label: 'Cases Resolved' },
                { val: '18', label: 'Active Volunteers' },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)' }}>{s.val}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Service Preview Cards wrapped in a single South Core Roar glass box */}
          <div style={{
            background: 'rgba(15, 15, 22, 0.65)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(232, 93, 4, 0.25)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-400)', letterSpacing: '0.08em', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
              Our Direct Channels
            </div>
            {[
              { icon: <Briefcase size={20} />, title: 'Search for Latest Jobs', desc: 'Browse latest jobs', color: 'var(--primary-600)', href: '/jobs' },
              { icon: <Users size={20} />, title: 'Join WhatsApp Communities', desc: 'Connect with professionals', color: 'var(--primary-600)', href: '/groups' },
              { icon: <Briefcase size={20} />, title: 'Job Referrals & Placement', desc: 'Get matched for referrals', color: 'var(--primary-500)', href: '/portal/signup' },
              { icon: <GraduationCap size={20} />, title: 'Career Mentorship & Resume Review', desc: 'Long-term mentorship', color: 'var(--primary-600)', href: '/portal/signup' },
              { icon: <MapPin size={20} />, title: 'Newcomer Settlement & Tax Support', desc: 'Housing, banking, etc', color: 'var(--accent-600)', href: '/settlement' },
              { icon: <Calendar size={20} />, title: 'Join Our Next Meetup Event', desc: 'Monthly networking meetups', color: 'var(--primary-500)', href: '/events' },
              { icon: <Building2 size={20} />, title: 'Trusted Local Businesses', desc: 'Verified businesses', color: 'var(--primary-600)', href: '/businesses' },
            ].map((item, i) => (
                <Link href={item.href || '#'} key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s', cursor: 'pointer', textDecoration: 'none' }} className="hero-feature-card">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(232, 93, 4, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                  <ChevronRight size={16} color="var(--primary-400)" style={{ opacity: 0.8 }} />
                </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding: '100px 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-600)', marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.2, letterSpacing: '-0.01em' }}>Simple. Safe. Secure.</h2>
          </div>

          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            {[
              { step: '01', title: 'Submit a Request', desc: 'Describe your need.', icon: <HelpCircle size={28} /> },
              { step: '02', title: 'Request Reviewed', desc: 'Securely matched to volunteer.', icon: <Shield size={28} /> },
              { step: '03', title: 'Volunteer Assigned', desc: 'Volunteer assigned privately.', icon: <HandHeart size={28} /> },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative', padding: '0 16px' }}>
                {/* Connecting Lines */}
                {i < 2 && <div style={{ position: 'absolute', top: 36, right: 0, width: '50%', height: 2, background: 'linear-gradient(90deg, var(--bg-secondary), var(--primary-600), var(--bg-secondary))' }} />}
                {i > 0 && <div style={{ position: 'absolute', top: 36, left: 0, width: '50%', height: 2, background: 'linear-gradient(90deg, var(--bg-secondary), var(--primary-600), var(--bg-secondary))' }} />}
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative', zIndex: 2, boxShadow: '0 8px 24px rgba(232,93,4,0.25)' }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary-600)', letterSpacing: '0.1em', marginBottom: 8 }}>STEP {item.step}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── SERVICES (Side-by-Side #1: Career Support) ─── */}
      <section style={{ padding: '100px 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', position: 'relative', aspectRatio: '4/3' }}>
              <Image src="/career-mentorship.png" alt="Career mentorship session" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 28px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>Career Support & Job Referrals</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-600)', marginBottom: 12 }}>Career Support</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>Career Support</h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 28 }}>
                Match with professionals for referrals.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {['Job referrals', 'Resume reviews', 'Mock interviews', 'LinkedIn optimization'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.92rem' }}>
                    <CheckCircle size={18} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/portal/auth" className="btn btn-primary" style={{ padding: '14px 28px' }}>
                Request Career Help <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── POPULAR JOB CATEGORIES ─── */}
      <section style={{ padding: '100px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 12 }}>Explore Popular Categories!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto' }}>Find jobs in top fields.</p>
          </div>

          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { cat: 'Technology', icon: <Briefcase size={20} />, jobs: 142 },
              { cat: 'Accounting & Finance', icon: <Briefcase size={20} />, jobs: 89 },
              { cat: 'Healthcare', icon: <Users size={20} />, jobs: 64 },
              { cat: 'Government', icon: <Shield size={20} />, jobs: 30 },
              { cat: 'Marketing', icon: <Star size={20} />, jobs: 45 },
              { cat: 'Education', icon: <GraduationCap size={20} />, jobs: 52 },
              { cat: 'Retail & Food', icon: <Briefcase size={20} />, jobs: 110 },
              { cat: 'Engineering', icon: <Briefcase size={20} />, jobs: 75 }
            ].map((item, i) => (
              <Link
                key={i}
                href="/jobs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'rgba(232, 93, 4, 0.06)',
                  border: '1px solid rgba(232, 93, 4, 0.1)',
                  borderRadius: 16,
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 0.2s, background 0.2s',
                  position: 'relative',
                  textDecoration: 'none'
                }}
                className="category-card-hover"
              >
                <div style={{ 
                  width: 46, 
                  height: 46, 
                  borderRadius: '50%', 
                  background: 'var(--bg-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--primary-600)',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(232,93,4,0.1)'
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>{item.cat}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{item.jobs} Jobs Available</div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
             <Link href="/jobs" style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s', textDecoration: 'none' }}>
               View All Categories <ChevronRight size={16} />
             </Link>
          </div>
        </div>
      </section>

      {/* ─── SERVICES (Side-by-Side #2: Settlement — Reversed) ─── */}
      <section style={{ padding: '100px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-600)', marginBottom: 12 }}>Settlement Support</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>Settle Smoothly</h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 28 }}>
                Volunteers guide you to feel at home.
              </p>
              <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
                {[
                  { label: 'Housing & Rentals', icon: <HomeIcon size={18} /> },
                  { label: 'Banking & Credit', icon: <Landmark size={18} /> },
                  { label: 'Health Cards', icon: <Hospital size={18} /> },
                  { label: 'Tax Filing (GST/HST)', icon: <DollarSign size={18} /> },
                  { label: 'Transit & Driving', icon: <Bus size={18} /> },
                  { label: 'SIN & Legal Docs', icon: <ClipboardList size={18} /> },
                ].map((item, i) => (
                  <Link href="/settlement" key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(232, 93, 4, 0.08)', border: '1px solid rgba(232, 93, 4, 0.15)', fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-700)', textDecoration: 'none', transition: 'all 0.2s' }} className="hover:-translate-y-1 hover:shadow-md">
                    <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span> {item.label}
                  </Link>
                ))}
              </div>
              <Link href="/settlement" className="btn btn-primary" style={{ padding: '14px 28px' }}>
                Explore Settlement Guides <ArrowRight size={18} />
              </Link>
            </div>
            <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', position: 'relative', aspectRatio: '4/3' }}>
              <Image src="/settlement-guide.png" alt="Newcomer settlement" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 28px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>Newcomer Settlement Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ─── EVENTS & COMMUNITY (Side-by-Side #3) ─── */}
      <section style={{ padding: '100px 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', position: 'relative', aspectRatio: '4/3' }}>
              <Image src="/events-meetup.png" alt="Community meetup event" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(232,93,4,0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Monthly Events
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-600)', marginBottom: 12 }}>Events & Community</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>Monthly Meetups, Workshops & Webinars</h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 28 }}>
                Join meetups and workshops.
              </p>

              {/* Upcoming Events Mini */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  { date: 'Apr 25', title: 'Toronto Monthly Community Meetup', loc: 'Downtown Toronto', type: 'In-Person' },
                  { date: 'Every Tue', title: 'Taxes for Newcomers Livestream', loc: 'YouTube Live', type: 'Online' },
                  { date: 'Every Thu', title: 'Resume Polish Workshop', loc: 'Zoom', type: 'Online' },
                ].map((evt, i) => (
                  <Link href="/events" key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-color)', textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1 hover:shadow-md">
                    <div style={{ width: 56, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-600)', textTransform: 'uppercase' }}>{evt.date.split(' ')[0]}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-700)' }}>{evt.date.split(' ')[1] || ''}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{evt.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-600)' }}>{evt.loc}</div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: evt.type === 'Online' ? 'rgba(232,93,4,0.1)' : 'rgba(0,168,107,0.1)', color: evt.type === 'Online' ? 'var(--primary-600)' : 'var(--success-600)' }}>{evt.type}</span>
                  </Link>
                ))}
              </div>

              <Link href="/events" className="btn btn-primary" style={{ padding: '14px 28px' }}>
                View All Events <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VOLUNTEER CTA (Side-by-Side #4) ─── */}
      <section style={{ padding: '100px 0', background: 'linear-gradient(135deg, var(--gray-900), var(--gray-800))' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--success-400)', marginBottom: 12 }}>Give Back</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15, color: 'white' }}>Become a Volunteer or Mentor</h2>
              <p style={{ fontSize: '1rem', color: 'var(--gray-400)', lineHeight: 1.8, marginBottom: 28 }}>
                Share expertise. Receive case assignments.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {['Choose expertise', 'Set case limit', 'Strict privacy', 'Background screening'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.9rem' }}>
                    <CheckCircle size={18} style={{ color: 'var(--success-400)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/portal/auth" className="btn btn-lg btn-success" style={{ padding: '16px 32px' }}>
                Apply to Volunteer <ArrowRight size={18} />
              </Link>
            </div>
            <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', position: 'relative', aspectRatio: '4/3' }}>
              <Image src="/volunteer-help.png" alt="Volunteers helping newcomers" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 28px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>18 Active Volunteers • 89 Cases Resolved</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOUNDER ─── */}
      <section style={{ padding: '80px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ width: 200, height: 200, borderRadius: '50%', overflow: 'hidden', position: 'relative', boxShadow: '0 20px 40px rgba(232,93,4,0.25)' }}>
              <Image src="/founder.png" alt="Udit Gupta" fill style={{ objectFit: 'cover' }} />
            </div>
            <div>
              <blockquote style={{ fontSize: '1.6rem', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 24, borderLeft: '4px solid var(--primary-600)', paddingLeft: 24 }}>
                &ldquo;Connecting communities, creating opportunities.&rdquo;
              </blockquote>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Udit Gupta</div>
              <div style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Founder, CEO & Director — Professionals Club</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SAFETY BANNER ─── */}
      <section style={{ padding: '60px 0', background: 'linear-gradient(135deg, rgba(232,93,4,0.05), rgba(232,93,4,0.1))' }}>
        <div className="container" style={{ maxWidth: '100%' }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {[
              { icon: <Shield size={32} />, title: 'Private & Secure', desc: 'Your privacy is strictly protected.' },
              { icon: <Users size={32} />, title: 'Verified Volunteers', desc: 'Volunteers go through checks.' },
              { icon: <Star size={32} />, title: 'Case Tracking', desc: 'Full lifecycle tracking.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '28px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(26,26,46,0.04)' }}>
                <div style={{ color: 'var(--primary-600)', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 6, color: 'var(--text-primary)' }}>{item.title}</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHATSAPP COMMUNITY HERO ─── */}
      <section style={{ padding: '80px 0', background: 'var(--gray-950)', position: 'relative', overflow: 'hidden' }}>
        {/* Background Image & Overlay */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/whatsapp-community-bg.png" alt="Community networking" fill style={{ objectFit: 'cover', opacity: 0.15 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,15,28,0.95) 0%, rgba(15,15,28,0.8) 50%, rgba(232,93,4,0.15) 100%)' }} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: '100%' }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 24, alignItems: 'center' }}>
            
            {/* Left Side: The list of cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {[
                { name: 'Finance Professionals', members: '1,600+', icon: <Wallet size={20} />, desc: 'Finance networking.', link: 'https://chat.whatsapp.com/LZQxOHMI7tx3vrrXCGXit4' },
                { name: 'CA India in Canada Community', members: '1,200+', icon: <Globe size={20} />, desc: 'Indian CAs network.', link: 'https://chat.whatsapp.com/K9k0IBLoEOW3L16gx23b0n' },
                { name: 'Industry Experts & Jobs', members: '1,100+', icon: <Briefcase size={20} />, desc: 'Industry networking.', link: 'https://chat.whatsapp.com/KrfRAPFxuAjCLrZ97mlGBp' },
                { name: 'Study Buddy Community', members: '1,000+', icon: <BookOpen size={20} />, desc: 'Peer exam support.', link: 'https://chat.whatsapp.com/FgNygqhDLDqEWsQC1xZmHZ' },
                { name: 'Regional & Family Community', members: '900+', icon: <MapPin size={20} />, desc: 'Stay connected.', link: 'https://chat.whatsapp.com/KIjJ7ybzkhtHSVF6BGlXYK' },
                { name: 'Sports, Yoga & Meditation', members: '600+', icon: <Star size={20} />, desc: 'Wellness community.', link: 'https://chat.whatsapp.com/JhApEAWvGQoAimRT1nBHBl' },
              ].map((group, i) => (
                <a key={i} href={group.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 20, transition: 'all 0.3s' }} className="whatsapp-card-hover">
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(232,93,4,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(232,93,4,0.2)', color: 'var(--primary-200)' }}>
                    {group.icon}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', marginBottom: 2 }}>{group.name}</div>
                    <div style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>{group.desc}</div>
                  </div>
                  <div style={{ background: 'rgba(232,93,4,0.15)', color: 'var(--primary-200)', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, border: '1px solid rgba(232,93,4,0.2)' }}>
                    <Users size={12} /> {group.members}
                  </div>
                </a>
              ))}
            </div>

            {/* Right Side: Text and Button */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.1)', padding: '6px 16px', borderRadius: 99, marginBottom: 20, border: '1px solid rgba(232,93,4,0.2)' }}>
                <Star size={15} style={{ color: 'var(--primary-400)' }} />
                <span style={{ color: 'var(--primary-400)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>5000+ Participants</span>
              </div>
              <h2 style={{ fontSize: '3.2rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 24, lineHeight: 1.1 }}>
                Canada&apos;s Largest Indian <br /> 
                <span style={{ color: 'var(--primary-600)' }}>Professional Community</span>
              </h2>
              <p style={{ color: 'var(--gray-400)', fontSize: '1.15rem', lineHeight: 1.7, marginBottom: 36, maxWidth: 500 }}>
                Join a thriving network.
              </p>
              
              <Link href="/portal/auth" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--primary-600)',
                color: 'white',
                padding: '16px 36px',
                borderRadius: 14,
                fontSize: '1.05rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 30px rgba(232,93,4,0.3)',
                transition: 'all 0.3s'
              }} className="btn-whatsapp-join">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.359.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Join Our Growing Community
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FEATURED BUSINESSES ─── */}
      <section style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 12 }}>Featured Businesses</h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
              Trusted verified businesses.
            </p>
          </div>

          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
            {[
              { name: 'Sharma & Associates CPA', cat: 'Tax & Accounting', desc: 'Trusted tax filing.', badge: '15% Off', city: 'Toronto', years: 15, slug: 'sharma-associates-cpa', img: '/finance_bg.png' },
              { name: 'HomeTrust Realty', cat: 'Real Estate', desc: 'Find your home.', badge: 'Cashback', city: 'Toronto', years: 12, slug: 'hometrust-realty', img: '/housing_bg.png' },
              { name: 'Elevate Financial', cat: 'Financial Planning', desc: 'Wealth management.', badge: 'Free Plan', city: 'Toronto', years: 9, slug: 'elevate-financial-planning', img: '/finance_bg.png' },
            ].map((biz, i) => (
              <Link key={i} href={`/businesses/${biz.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-color)', transition: 'all 0.3s', cursor: 'pointer' }} className="biz-card">
                  <div style={{ height: 140, position: 'relative', overflow: 'hidden' }}>
                    <Image src={biz.img} alt={biz.name} fill style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                      <span className="biz-badge biz-badge-verified"><ShieldCheck size={10} /> Verified</span>
                      <span className="biz-badge biz-badge-featured"><Star size={10} /> Featured</span>
                      <span className="biz-badge biz-badge-deal"><Tag size={10} /> {biz.badge}</span>
                    </div>
                  </div>
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary-600)', marginBottom: 4 }}>{biz.cat}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>{biz.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>{biz.desc}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                      <span><MapPin size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {biz.city}</span>
                      <span>•</span>
                      <span>{biz.years} yrs</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link href="/businesses" className="btn btn-primary btn-lg" style={{ padding: '14px 32px', fontSize: '0.95rem' }}>
              Explore All Businesses <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ position: 'relative', padding: '100px 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/toronto-skyline.png" alt="Toronto skyline" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--gray-900) 0%, var(--gray-950) 100%)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 700 }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'white', marginBottom: 20, lineHeight: 1.15 }}>Ready to Get Started?</h2>
          <p style={{ fontSize: '1.15rem', color: 'var(--gray-400)', marginBottom: 36, lineHeight: 1.7 }}>
            Request help today.
          </p>
          <div className="mobile-wrap" style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ padding: '18px 36px', fontSize: '1.05rem', boxShadow: '0 8px 30px rgba(232,93,4,0.3)' }}>
              Request Help Now <ArrowRight size={20} />
            </Link>
            <Link href="/about" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '18px 36px' }}>
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
