import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { BookOpen, Video, FileCheck, FileText, Download, ExternalLink, PlayCircle, GraduationCap, ArrowRight } from 'lucide-react';

export default function ResourcesPage() {
  const ebooks = [
    { title: "CPA's Guide to Canada", author: 'Professionals Club', type: 'PDF', size: '2.4 MB', color: '#6366f1' },
    { title: 'IT Careers in Ontario', author: 'Professionals Club', type: 'PDF', size: '1.8 MB', color: '#059669' },
    { title: 'Medical Licensing Roadmap', author: 'Professionals Club Health Team', type: 'PDF', size: '3.1 MB', color: '#dc2626' },
    { title: 'Engineering Success Path', author: 'Professionals Club Engineering', type: 'PDF', size: '2.0 MB', color: '#d97706' },
  ];

  const workshops = [
    { title: 'Taxes for Newcomers 2026', duration: '45 mins', date: 'Jan 12, 2026', platform: 'YouTube' },
    { title: 'Resume Polish Workshop', duration: '1h 15m', date: 'Feb 08, 2026', platform: 'Zoom Recording' },
    { title: 'Buying Your First Home', duration: '55 mins', date: 'Mar 15, 2026', platform: 'YouTube' },
    { title: 'Interview Prep for IT', duration: '1h 05m', date: 'Apr 02, 2026', platform: 'YouTube' },
  ];

  const templates = [
    { title: 'Standard Canadian Resume', type: 'Word Doc', category: 'Career' },
    { title: 'Professional Cover Letter', type: 'Word Doc', category: 'Career' },
    { title: 'Networking Message Templates', type: 'PDF', category: 'Communication' },
    { title: 'Rental Application Bundle', type: 'ZIP', category: 'Settlement' },
  ];

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/career-mentorship.png" alt="Learning resources" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(124,58,237,0.3))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(139,92,246,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(139,92,246,0.3)' }}>
            <BookOpen size={14} style={{ color: '#c4b5fd' }} />
            <span style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '0.82rem' }}>Resource Center</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Learn. Succeed. <span style={{ background: 'linear-gradient(135deg, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Thrive.</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Expert-led guides, professional templates, and video workshops designed specifically for Indian professionals in Canada.
          </p>
        </div>
      </section>

      {/* E-Books */}
      <section style={{ padding: '100px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            <BookOpen size={24} style={{ color: '#6366f1' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>E-Books & Detailed Guides</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {ebooks.map((book, idx) => (
              <div key={idx} style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'box-shadow 0.2s', background: 'white' }}>
                <div style={{ height: 120, background: `linear-gradient(135deg, ${book.color}15, ${book.color}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <FileText size={40} style={{ color: book.color, opacity: 0.5 }} />
                </div>
                <div style={{ padding: '22px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{book.type} &#8226; {book.size}</span>
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 6, color: '#1e293b' }}>{book.title}</h3>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 16 }}>By {book.author}</p>
                  <button className="btn btn-outline btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'white', fontSize: '0.82rem' }}>
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Workshops */}
      <section style={{ padding: '80px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            <Video size={24} style={{ color: '#dc2626' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>Video Workshop Archive</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {workshops.map((video, idx) => (
              <div key={idx} style={{ display: 'flex', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white' }}>
                <div style={{ width: 200, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, hsl(${220 + idx * 30}, 50%, 25%), hsl(${240 + idx * 30}, 40%, 35%))` }} />
                  <PlayCircle size={40} style={{ color: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 2 }} />
                </div>
                <div style={{ padding: '24px 22px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>{video.title}</h3>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', flexShrink: 0, marginLeft: 8 }}>{video.platform}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: '#94a3b8', marginBottom: 16 }}>
                    <span>{video.duration}</span>
                    <span>&#8226;</span>
                    <span>Recorded {video.date}</span>
                  </div>
                  <a href="#" style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    Watch Session <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section style={{ padding: '80px 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            <FileCheck size={24} style={{ color: '#059669' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>Templates & Worksheets</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {templates.map((temp, idx) => (
              <div key={idx} style={{ borderRadius: 16, padding: '28px 22px', border: '1px solid #e2e8f0', background: 'white' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#ecfdf5', color: '#059669', marginBottom: 14, display: 'inline-block' }}>{temp.category}</span>
                <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 12, color: '#1e293b' }}>{temp.title}</h3>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 20 }}>{temp.type} &#8226; Free Access</div>
                <a href="#" style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                  Access Template <ArrowRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contribute CTA */}
      <section style={{ padding: '100px 0', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <GraduationCap size={48} style={{ color: '#a78bfa', margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Want to Contribute?</h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: 36, lineHeight: 1.7 }}>
            If you are a subject matter expert or an established professional in Canada, we would love to host your guide or workshop recordings on our platform.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white', border: 'none', padding: '16px 32px' }}>Become a Contributor</Link>
            <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '16px 32px' }}>Join Community</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
