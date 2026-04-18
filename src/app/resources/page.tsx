'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import { BookOpen, Video, FileCheck, FileText, Download, ExternalLink, PlayCircle, GraduationCap, ArrowRight } from 'lucide-react';

export default function ResourcesPage() {
  const { ebooks, workshops, templates } = usePortal();

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
            Expert-led guides, templates, and video workshops to help you thrive in Canada.
          </p>
        </div>
      </section>

      {/* E-Books */}
      <section style={{ padding: '40px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            <BookOpen size={24} style={{ color: '#6366f1' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>E-Books & Detailed Guides</h2>
          </div>
          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {ebooks.map((book, idx) => (
              <div key={book.id} style={{ position: 'relative', height: 320, borderRadius: 24, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} className="hover:-translate-y-1 hover:shadow-xl">
                <Image src={book.image} alt={book.title} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.3) 100%)' }} />
                
                <div style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} style={{ color: 'white' }} />
                </div>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'white', padding: '4px 10px', background: book.color, borderRadius: 6, letterSpacing: '0.05em' }}>{book.type}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'white', padding: '4px 10px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: 6 }}>{book.size}</span>
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 8, color: 'white', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>{book.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 20 }}>By {book.author}</p>
                  <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', fontSize: '0.85rem', padding: '12px 0' }}>
                    <Download size={16} /> Download Guide
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Workshops */}
      <section style={{ padding: '40px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            <Video size={24} style={{ color: '#dc2626' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>Video Workshop Archive</h2>
          </div>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {workshops.map((video, idx) => (
              <div key={video.id} style={{ position: 'relative', height: 260, borderRadius: 24, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} className="hover:-translate-y-1 hover:shadow-xl">
                <Image src={video.thumbnailImage} alt={video.title} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 60%, rgba(15,23,42,0.3) 100%)' }} />
                
                <div style={{ position: 'absolute', inset: 0, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(220,38,38,0.9)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(220,38,38,0.4)', cursor: 'pointer' }} className="hover:scale-110 transition-transform">
                      <PlayCircle size={28} />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>{video.platform}</span>
                  </div>
                  
                  <div>
                    <h3 style={{ fontWeight: 900, fontSize: '1.4rem', color: 'white', marginBottom: 12, fontFamily: 'var(--font-display)', maxWidth: '80%' }}>{video.title}</h3>
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 16 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Video size={14} /> {video.duration}</span>
                      <span>&#8226;</span>
                      <span>Recorded {video.recordedDate}</span>
                    </div>
                    <Link href={video.videoUrl} style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                      Watch Session <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section style={{ padding: '40px 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            <FileCheck size={24} style={{ color: '#059669' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>Templates & Worksheets</h2>
          </div>
          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {templates.map((temp, idx) => (
              <div key={temp.id} style={{ position: 'relative', height: 280, borderRadius: 24, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} className="hover:-translate-y-1 hover:shadow-xl">
                <Image src={temp.image} alt={temp.title} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 40%, rgba(15,23,42,0.4) 100%)' }} />
                
                <div style={{ position: 'absolute', inset: 0, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: 'rgba(5,150,105,0.8)', color: 'white', marginBottom: 16, alignSelf: 'flex-start', backdropFilter: 'blur(4px)' }}>{temp.category}</span>
                  <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 12, color: 'white', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>{temp.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 20 }}>{temp.fileType} &#8226; Free Access</div>
                  <Link href={temp.accessUrl} style={{ fontWeight: 700, color: '#6ee7b7', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    Access Template <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contribute CTA */}
      <section style={{ padding: '40px 0', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <GraduationCap size={48} style={{ color: '#a78bfa', margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Want to Contribute?</h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: 20, lineHeight: 1.7 }}>
            Are you a subject matter expert? We'd love to host your guides or workshop recordings.
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
