'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import Image from 'next/image';
import Link from 'next/link';

export default function BlogsPage() {
  const { newsArticles } = usePortal();

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 16 }}>
              Community Blogs
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
              Read the latest stories, guides, and insights from our members and experts.
            </p>
          </div>

          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {newsArticles.map((article) => (
              <div key={article.id} className="card card-clickable hover:-translate-y-1" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: 200 }}>
                  <Image src={article.image} alt={article.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 16, left: 16, background: 'var(--primary-600)', color: 'white', padding: '4px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700 }}>
                    {article.category}
                  </div>
                </div>
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12, fontFamily: 'var(--font-display)', lineHeight: 1.4 }}>
                    {article.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20, flex: 1 }}>
                    {article.summary}
                  </p>
                  <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>By {article.author}</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
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
