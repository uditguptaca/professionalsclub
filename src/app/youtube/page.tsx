'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import Image from 'next/image';
import Link from 'next/link';
import { Video, PlayCircle, ExternalLink } from 'lucide-react';

export default function YouTubePage() {
  const { workshops } = usePortal();

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', color: '#dc2626', marginBottom: 20 }}>
              <Video size={32} />
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 16 }}>
              YouTube Archive
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              Watch recorded sessions, expert Q&As, and community workshops.
            </p>
          </div>

          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {workshops.map((video) => (
              <div key={video.id} style={{ position: 'relative', height: 320, borderRadius: 24, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} className="hover:-translate-y-1 hover:shadow-xl">
                <Image src={video.thumbnailImage} alt={video.title} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 60%, rgba(15,23,42,0.3) 100%)' }} />
                
                <div style={{ position: 'absolute', inset: 0, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Link href={video.videoUrl} style={{ textDecoration: 'none' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(220,38,38,0.9)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(220,38,38,0.4)', cursor: 'pointer' }} className="hover:scale-110 transition-transform">
                        <PlayCircle size={28} />
                      </div>
                    </Link>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>{video.platform}</span>
                  </div>
                  
                  <div>
                    <h3 style={{ fontWeight: 900, fontSize: '1.6rem', color: 'white', marginBottom: 12, fontFamily: 'var(--font-display)', maxWidth: '90%' }}>{video.title}</h3>
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
      </main>

      <Footer />
    </>
  );
}
