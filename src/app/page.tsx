import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Users, Briefcase, Calendar, Shield, HandHeart, MapPin, FileText, BookOpen, GraduationCap, CheckCircle, Phone, ChevronRight, Star, HelpCircle, ShieldCheck, Tag, Building2 } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      
      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', overflow: 'hidden', background: '#0f172a' }}>
        {/* Background Image */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/hero-community.png" alt="Professionals networking" fill style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.35 }} priority />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.75) 50%, rgba(99,102,241,0.3) 100%)' }} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 1200, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', paddingTop: 120 }}>
          {/* Left */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(99,102,241,0.3)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#c7d2fe', fontWeight: 700, fontSize: '0.82rem' }}>Admin-Mediated Community Support</span>
            </div>

            <h1 style={{ fontSize: '3.8rem', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 24, fontFamily: 'var(--font-display)' }}>
              Your Canadian Journey,<br />
              <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Fully Supported</span>
            </h1>

            <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: 36, maxWidth: 520 }}>
              The Professionals Club Help Desk connects Indian professionals in Canada with expert volunteers for career guidance, settlement support, tax help, mentorship — all mediated through our admin team for your safety.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
              <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ fontSize: '1rem', padding: '16px 32px', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}>
                Request Help <ArrowRight size={20} />
              </Link>
              <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', padding: '16px 32px' }}>
                Become a Volunteer
              </Link>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'flex', gap: 40 }}>
              {[
                { val: '5,000+', label: 'Members' },
                { val: '89+', label: 'Cases Resolved' },
                { val: '18', label: 'Active Volunteers' },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white' }}>{s.val}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Service Preview Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: <Briefcase size={20} />, title: 'Search for Latest Jobs', desc: 'Browse the latest job opportunities matching your skills', color: '#10b981', href: '/jobs' },
              { icon: <Users size={20} />, title: 'Join WhatsApp Communities', desc: 'Connect with thousands of professionals in active WhatsApp chapters', color: '#25d366', href: '/groups' },
              { icon: <Briefcase size={20} />, title: 'Job Referrals & Placement', desc: 'Get matched with volunteers at top Canadian companies for referrals', color: '#6366f1' },
              { icon: <GraduationCap size={20} />, title: 'Career Mentorship & Resume Review', desc: 'Long-term mentors review documents and guide your career', color: '#dc2626' },
              { icon: <MapPin size={20} />, title: 'Newcomer Settlement & Tax Support', desc: 'Housing, banking, transit, health cards, and tax filing — all guided', color: '#d97706' },
              { icon: <Calendar size={20} />, title: 'Join Our Next Meetup Event', desc: 'Connect at our monthly in-person community networking meetups', color: '#ea580c' },
              { icon: <Building2 size={20} />, title: 'Trusted Local Businesses', desc: 'Verified businesses — discover, connect, and grow in your community.', color: '#059669', href: '/businesses' },
            ].map((item, i) => {
              const Card = (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 22px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', transition: 'all 0.2s', cursor: item.href ? 'pointer' : 'default' }} className="hero-feature-card">
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <ChevronRight size={18} style={{ color: item.href ? '#white' : '#475569', marginLeft: 'auto', flexShrink: 0, opacity: item.href ? 1 : 0.5 }} />
                </div>
              );
              return item.href ? <Link href={item.href} key={i} style={{ textDecoration: 'none' }}>{Card}</Link> : Card;
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding: '100px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6366f1', marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 16 }}>Simple. Safe. Admin-Mediated.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
            {[
              { step: '01', title: 'Submit a Request', desc: 'Describe what help you need — job referral, tax guidance, resume review, settlement support.', icon: <HelpCircle size={28} /> },
              { step: '02', title: 'Admin Reviews', desc: 'Our admin team reads your request, verifies details, and finds the best matching volunteer.', icon: <Shield size={28} /> },
              { step: '03', title: 'Volunteer Assigned', desc: 'An approved volunteer is assigned to your case. All communication stays through admin relay.', icon: <HandHeart size={28} /> },
              { step: '04', title: 'Resolution & Follow-Up', desc: 'Volunteer provides guidance through admin. Your case is tracked until resolution.', icon: <CheckCircle size={28} /> },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 24px', position: 'relative' }}>
                {i < 3 && <div style={{ position: 'absolute', top: 36, right: 0, width: '50%', height: 2, background: 'linear-gradient(90deg, #e2e8f0, #6366f1, #e2e8f0)' }} />}
                {i > 0 && <div style={{ position: 'absolute', top: 36, left: 0, width: '50%', height: 2, background: 'linear-gradient(90deg, #e2e8f0, #6366f1, #e2e8f0)' }} />}
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative', zIndex: 2, boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366f1', letterSpacing: '0.1em', marginBottom: 8 }}>STEP {item.step}</div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8, fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── SERVICES (Side-by-Side #1: Career Support) ─── */}
      <section style={{ padding: '100px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', position: 'relative', aspectRatio: '4/3' }}>
              <Image src="/career-mentorship.png" alt="Career mentorship session" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 28px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>Career Support & Job Referrals</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6366f1', marginBottom: 12 }}>Career Support</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>Job Referrals, Resume Reviews & Interview Prep</h2>
              <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.8, marginBottom: 28 }}>
                Our approved volunteers work at top Canadian companies including Shopify, Amazon, RBC, Google, and more. Submit a help request and our admin team will match you with the right professional for referrals, resume guidance, or mock interviews.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {['Job referrals at 500+ partner companies', 'Resume & cover letter reviews by HR professionals', 'Mock interview sessions with industry experts', 'LinkedIn profile optimization'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.92rem' }}>
                    <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
                    <span style={{ color: '#374151' }}>{item}</span>
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

      {/* ─── SERVICES (Side-by-Side #2: Settlement — Reversed) ─── */}
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#059669', marginBottom: 12 }}>Settlement Support</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>Settle Smoothly Into Your New Canadian Life</h2>
              <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.8, marginBottom: 28 }}>
                From your first week to your first year, our settlement volunteers guide you through housing, banking, health cards, taxes, transit, and everything you need to feel at home.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
                {[
                  { label: 'Housing & Rentals', icon: '🏠' },
                  { label: 'Banking & Credit', icon: '🏦' },
                  { label: 'Health Cards', icon: '🏥' },
                  { label: 'Tax Filing (GST/HST)', icon: '💰' },
                  { label: 'Transit & Driving', icon: '🚌' },
                  { label: 'SIN & Legal Docs', icon: '📋' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.88rem', fontWeight: 600, color: '#065f46' }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
              <Link href="/settlement" className="btn" style={{ background: '#059669', color: 'white', padding: '14px 28px', border: 'none' }}>
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
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', position: 'relative', aspectRatio: '4/3' }}>
              <Image src="/events-meetup.png" alt="Community meetup event" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(217,119,6,0.9)', color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                Monthly Events
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#d97706', marginBottom: 12 }}>Events & Community</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>Monthly Meetups, Workshops & Webinars</h2>
              <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.8, marginBottom: 28 }}>
                Join our monthly in-person meetups in downtown Toronto, attend virtual workshops on taxes, career prep, and cultural adaptation, or participate in our YouTube livestream sessions.
              </p>

              {/* Upcoming Events Mini */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  { date: 'Apr 25', title: 'Toronto Monthly Community Meetup', loc: 'Downtown Toronto', type: 'In-Person' },
                  { date: 'Every Tue', title: 'Taxes for Newcomers Livestream', loc: 'YouTube Live', type: 'Online' },
                  { date: 'Every Thu', title: 'Resume Polish Workshop', loc: 'Zoom', type: 'Online' },
                ].map((evt, i) => (
                  <Link href="/events" key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a', textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1 hover:shadow-md">
                    <div style={{ width: 56, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>{evt.date.split(' ')[0]}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#78350f' }}>{evt.date.split(' ')[1] || ''}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{evt.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#92400e' }}>{evt.loc}</div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: evt.type === 'Online' ? '#dbeafe' : '#d1fae5', color: evt.type === 'Online' ? '#1e40af' : '#065f46' }}>{evt.type}</span>
                  </Link>
                ))}
              </div>

              <Link href="/events" className="btn" style={{ background: '#d97706', color: 'white', padding: '14px 28px', border: 'none' }}>
                View All Events <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VOLUNTEER CTA (Side-by-Side #4) ─── */}
      <section style={{ padding: '100px 0', background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#34d399', marginBottom: 12 }}>Give Back</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15, color: 'white' }}>Become a Volunteer or Mentor</h2>
              <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.8, marginBottom: 28 }}>
                Share your professional expertise to help fellow community members navigate their Canadian careers. As a volunteer, you will receive case assignments through our admin team — never any direct member contact.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {['Choose your expertise areas (10 categories)', 'Set your own monthly case limit', 'All communication is admin-relayed for privacy', 'Background screening and compliance process'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.9rem' }}>
                    <CheckCircle size={18} style={{ color: '#34d399', flexShrink: 0 }} />
                    <span style={{ color: '#cbd5e1' }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', padding: '16px 32px' }}>
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
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, alignItems: 'center' }}>
            <div style={{ width: 200, height: 200, borderRadius: '50%', overflow: 'hidden', position: 'relative', boxShadow: '0 20px 40px rgba(99,102,241,0.25)' }}>
              <Image src="/founder.png" alt="Udit Gupta" fill style={{ objectFit: 'cover' }} />
            </div>
            <div>
              <blockquote style={{ fontSize: '1.6rem', fontWeight: 600, fontFamily: 'var(--font-display)', color: '#1e293b', lineHeight: 1.5, marginBottom: 24, borderLeft: '4px solid #6366f1', paddingLeft: 24 }}>
                &ldquo;Building Bridges, Enriching Lives. Facilitating smoother transitions for immigrants. Connecting communities, creating opportunities.&rdquo;
              </blockquote>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>Udit Gupta</div>
              <div style={{ color: '#6366f1', fontWeight: 600 }}>Founder, CEO & Director — Professionals Club</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SAFETY BANNER ─── */}
      <section style={{ padding: '60px 0', background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              { icon: <Shield size={32} />, title: 'Admin-Mediated', desc: 'Every interaction goes through our trained admin team. No direct member contact allowed.' },
              { icon: <Users size={32} />, title: 'Verified Volunteers', desc: 'All volunteers go through application review, background screening, and compliance checks.' },
              { icon: <Star size={32} />, title: 'Case Tracking', desc: 'Full lifecycle tracking from submission to resolution. Nothing falls through the cracks.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '28px 24px', borderRadius: 16, background: 'white', border: '1px solid #e0e7ff', boxShadow: '0 4px 12px rgba(99,102,241,0.06)' }}>
                <div style={{ color: '#6366f1', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 6, color: '#1e293b' }}>{item.title}</div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── POPULAR JOB CATEGORIES ─── */}
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 12 }}>Explore Popular Categories!</h2>
            <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto' }}>Find jobs in top fields like Technology, Healthcare, and Finance across Canada.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
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
                  background: '#f3e8ff',
                  border: 'none',
                  borderRadius: 16,
                  padding: '20px 24px',
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
                  background: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#a855f7',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(168,85,247,0.1)'
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: 4 }}>{item.cat}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{item.jobs} Jobs Available</div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
             <Link href="/jobs" style={{ background: 'none', border: 'none', color: '#a855f7', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s', textDecoration: 'none' }}>
               View All Categories <ChevronRight size={16} />
             </Link>
          </div>
        </div>
      </section>

      {/* ─── WHATSAPP COMMUNITY HERO ─── */}
      <section style={{ padding: '80px 0', background: 'white', position: 'relative' }}>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 64, alignItems: 'center' }}>
            
            {/* Left Side: The list of cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {[
                { name: 'Newcomers & Settlement', members: '3,500+', icon: '🍁', desc: 'Housing, transit, and networking.' },
                { name: 'Tech & IT Professionals', members: '1,200+', icon: '💻', desc: 'Software, data, and Canadian tech jobs.' },
                { name: 'Finance & Accounting', members: '850+', icon: '📊', desc: 'CPA pathways, banking, and wealth.' },
                { name: 'Job Referrals & Hiring', members: '2,100+', icon: '💼', desc: 'Direct job postings and internal referrals.' },
                { name: 'Entrepreneurs & Startups', members: '600+', icon: '🚀', desc: 'Founders, investors, and small business.' },
                { name: 'General Community Chat', members: '5,000+', icon: '🌐', desc: 'The main hub for all members.' },
              ].map((group, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    {group.icon}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '1rem', marginBottom: 2 }}>{group.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{group.desc}</div>
                  </div>
                  <div style={{ background: 'rgba(37,211,102,0.1)', color: '#16a34a', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Users size={12} /> {group.members}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Side: Text and Button */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,211,102,0.1)', padding: '6px 16px', borderRadius: 99, marginBottom: 16, border: '1px solid rgba(37,211,102,0.2)' }}>
                <span style={{ fontSize: '15px' }}>💬</span>
                <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>WhatsApp Communities</span>
              </div>
              <h2 style={{ fontSize: '2.8rem', fontWeight: 900, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.1 }}>
                Join Canada&apos;s Most Active <br /> Professional Groups
              </h2>
              <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 32 }}>
                Connect instantly with professionals, job seekers, and industry experts. Find localized groups and curated channels tailored precisely to your needs.
              </p>
              
              <Link href="/portal/auth" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#0f172a',
                color: 'white',
                padding: '14px 32px',
                borderRadius: 14,
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(15,23,42,0.2)',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Register to Join Communities
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FEATURED BUSINESSES ─── */}
      <section style={{ padding: '100px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 12 }}>Featured Businesses</h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
              Trusted local businesses from the Professionals Club community — verified, with exclusive member benefits.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { name: 'Sharma & Associates CPA', cat: 'Tax & Accounting', desc: 'Trusted tax filing and accounting for newcomers and professionals.', badge: '15% Off', city: 'Toronto', years: 15, slug: 'sharma-associates-cpa', img: '/finance_bg.png' },
              { name: 'HomeTrust Realty', cat: 'Real Estate', desc: 'Helping newcomers find their first Canadian home with confidence.', badge: 'Cashback', city: 'Toronto', years: 12, slug: 'hometrust-realty', img: '/housing_bg.png' },
              { name: 'Elevate Financial', cat: 'Financial Planning', desc: 'Wealth management for professionals building their Canadian future.', badge: 'Free Plan', city: 'Toronto', years: 9, slug: 'elevate-financial-planning', img: '/finance_bg.png' },
            ].map((biz, i) => (
              <Link key={i} href={`/businesses/${biz.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', transition: 'all 0.3s', cursor: 'pointer' }} className="biz-card">
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
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
      <section style={{ position: 'relative', padding: '120px 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/toronto-skyline.png" alt="Toronto skyline" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 700 }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'white', marginBottom: 20, lineHeight: 1.15 }}>Ready to Get Started?</h2>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', marginBottom: 36, lineHeight: 1.7 }}>
            Join 5,000+ Indian professionals in Canada. Request help with your career, settlement, taxes, or anything else — or apply to volunteer and give back to the community.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ padding: '18px 36px', fontSize: '1.05rem', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}>
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
