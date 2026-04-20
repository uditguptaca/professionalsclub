'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import Image from 'next/image';
import { Download } from 'lucide-react';

export default function EBooksPage() {
  const { ebooks } = usePortal();

  // Split ebooks to simulate "Before Moving" and "After Moving"
  const beforeMoving = ebooks.slice(0, Math.ceil(ebooks.length / 2));
  const afterMoving = ebooks.slice(Math.ceil(ebooks.length / 2));

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 16 }}>
              E-Books Library
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              Comprehensive guides to support your Canadian journey.
            </p>
          </div>

          {/* Before Moving Section */}
          <section style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, textAlign: 'center', marginBottom: 40, color: 'var(--text-primary)' }}>
              Before Moving To <span style={{ color: 'var(--primary-400)' }}>Canada</span>
            </h2>
            
            <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, maxWidth: 800, margin: '0 auto' }}>
              {beforeMoving.map((book) => (
                <div key={book.id} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', padding: 20, display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' }} className="hover:-translate-y-1">
                  <div style={{ position: 'relative', height: 400, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 20 }}>
                    <Image src={book.image} alt={book.title} fill style={{ objectFit: 'cover' }} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textAlign: 'center', marginBottom: 16, fontFamily: 'var(--font-display)' }}>
                    {book.title}
                  </h3>
                  <button className="btn btn-primary" style={{ width: '100%', background: '#334155' }}>
                    <Download size={16} /> DOWNLOAD E-BOOK
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* After Moving Section */}
          <section>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, textAlign: 'center', marginBottom: 40, color: 'var(--text-primary)' }}>
              After Moving To <span style={{ color: 'var(--primary-400)' }}>Canada</span>
            </h2>
            
            <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, maxWidth: 800, margin: '0 auto' }}>
              {afterMoving.map((book) => (
                <div key={book.id} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', padding: 20, display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' }} className="hover:-translate-y-1">
                  <div style={{ position: 'relative', height: 400, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 20 }}>
                    <Image src={book.image} alt={book.title} fill style={{ objectFit: 'cover' }} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textAlign: 'center', marginBottom: 16, fontFamily: 'var(--font-display)' }}>
                    {book.title}
                  </h3>
                  <button className="btn btn-primary" style={{ width: '100%', background: '#334155' }}>
                    <Download size={16} /> DOWNLOAD E-BOOK
                  </button>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}
