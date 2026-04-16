import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Video, PlayCircle, BookOpen, MessageSquare, TrendingUp, HandHeart, ArrowRight, ExternalLink, Users } from 'lucide-react';

export default function CommunityPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/volunteer-help.png" alt="Community support" fill style={{ objectFit: 'cover', opacity: 0.25 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(220,38,38,0.25))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(239,68,68,0.3)' }}>
            <Video size={14} style={{ color: '#fca5a5' }} />
            <span style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.82rem' }}>Community & Media Hub</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Community & <span style={{ background: 'linear-gradient(135deg, #f87171, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Media</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            YouTube tutorials, guidance sessions, and community-driven content designed to help you settle smoothly into Canadian life.
          </p>
        </div>
      </section>

      {/* YouTube Section — Side-by-Side */}
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', padding: '6px 14px', borderRadius: 99, marginBottom: 20, border: '1px solid #fecaca' }}>
                <Video size={14} style={{ color: '#dc2626' }} />
                <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.78rem' }}>Official Channel</span>
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>Professionals Club on YouTube</h2>
              <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.8, marginBottom: 28 }}>
                We regularly post comprehensive video guides on everything from financial literacy to cultural adaptation. Watch our past workshops, tutorials, and settlement guidance sessions directly on our official YouTube channel.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn" style={{ background: '#dc2626', color: 'white', border: 'none', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PlayCircle size={18} /> Subscribe on YouTube
                </button>
                <button className="btn btn-outline" style={{ background: 'white', padding: '14px 24px' }}>Browse Videos</button>
              </div>
            </div>

            {/* Featured Video Embed */}
            <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', position: 'relative', aspectRatio: '16/9', background: '#0f172a', cursor: 'pointer' }}>
              <Image src="/events-meetup.png" alt="Video thumbnail" fill style={{ objectFit: 'cover', opacity: 0.5 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 72, height: 72, borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(220,38,38,0.4)' }}>
                <PlayCircle size={36} style={{ color: 'white', marginLeft: 3 }} />
              </div>
              <div style={{ position: 'absolute', bottom: 20, left: 24, right: 24, zIndex: 2 }}>
                <div style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>Financial Literacy for Newcomers: Taxes 101</div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 4 }}>Educational Workshop &#8226; 45 Mins</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section style={{ padding: '80px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>More Community Resources</h2>
            <p style={{ fontSize: '1rem', color: '#64748b' }}>Explore guides, forums, and professional content created by our community.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: <TrendingUp size={28} />, title: 'Finance & Tax Guides', desc: 'Written tutorials on building Canadian credit, filing your first tax return, and managing employment income.', color: '#6366f1', link: '/resources' },
              { icon: <HandHeart size={28} />, title: 'Cultural Adaptation Forums', desc: 'Engage with fellow newcomers. Ask questions about local customs, public transit, securing a lease, and daily life.', color: '#059669', link: '/portal/auth' },
              { icon: <BookOpen size={28} />, title: 'Professional E-Books', desc: 'Download comprehensive settlement checklists and e-books authored by industry leaders and community mentors.', color: '#d97706', link: '/resources' },
            ].map((item, i) => (
              <div key={i} style={{ borderRadius: 20, padding: '36px 28px', background: 'white', border: '1px solid #e2e8f0', transition: 'box-shadow 0.2s' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${item.color}10`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, marginBottom: 20 }}>
                  {item.icon}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 10, fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>{item.desc}</p>
                <Link href={item.link} style={{ fontWeight: 700, color: item.color, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                  Explore <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 0', background: 'linear-gradient(135deg, #0f172a, #1e293b)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <MessageSquare size={40} style={{ color: '#818cf8', margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Have Questions About Settling In?</h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: 36, lineHeight: 1.7 }}>
            Submit a help request on our portal and a trained volunteer will provide personalized guidance tailored to your professional background.
          </p>
          <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ padding: '16px 36px', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
            Request Guidance <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
