'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { ExternalLink } from 'lucide-react';

export default function BuildResumePage() {
  return (
    <>
      <Navbar />

      <main id="main" style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 20 }}>
              Build your resume
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
              We've teamed up with WriteCV.io to make building a Canadian-style resume simple — whether you're landing your first role here or leveling up an established career.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
              You get modern templates and clear, practical guidance to highlight your skills the way Canadian hiring managers expect.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, fontWeight: 500 }}>
              Ready to stand out? Build your resume and let it work for you.
            </p>
          </div>

          <div style={{ 
            width: '100%', 
            height: '80vh', 
            borderRadius: 16, 
            overflow: 'hidden', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-color)'
          }}>
            <iframe 
              src="https://writecv.io/" 
              width="100%" 
              height="100%" 
              style={{ border: 'none' }}
              title="WriteCV.io Resume Builder"
              allow="clipboard-write; clipboard-read"
            />
          </div>

          {/* The embed can be blocked by the browser or by WriteCV itself, so the
              builder always has a way out of the iframe. */}
          <p style={{ marginTop: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Builder not loading?{' '}
            <a href="https://writecv.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Open WriteCV.io in a new tab <ExternalLink size={14} />
            </a>
          </p>

        </div>
      </main>

      <Footer />
    </>
  );
}
