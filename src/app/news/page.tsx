'use client';
import React from 'react';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Newspaper, ArrowRight } from 'lucide-react';

const newsArticles = [
  { id: 'n1', title: 'Canada Tech Hiring Surge: 15,000+ Roles Open in Q2 2026', excerpt: 'Major Canadian tech companies announce aggressive hiring plans for the spring quarter.', category: 'Hiring News', publishedAt: '2026-04-07', readTime: '4 min', featured: true },
  { id: 'n2', title: 'Express Entry Draw: CRS Score Drops to 470', excerpt: 'The latest Express Entry draw saw the lowest CRS cut-off in 6 months.', category: 'Immigration', publishedAt: '2026-04-05', readTime: '5 min', featured: true },
  { id: 'n3', title: 'Salary Report 2026: How Much Do Tech Professionals Earn?', excerpt: 'Our comprehensive salary survey reveals compensation trends across Canada.', category: 'Salary Trends', publishedAt: '2026-04-02', readTime: '8 min', featured: true },
  { id: 'n4', title: 'Top 10 Companies Hiring International Talent in Canada', excerpt: 'These companies have the most active programs for international professionals.', category: 'Hiring News', publishedAt: '2026-03-30', readTime: '6 min', featured: false },
  { id: 'n5', title: 'Mastering the Canadian Interview: A Complete Guide', excerpt: 'Canadian interviews differ from those in other countries. Here is your prep guide.', category: 'Interview Prep', publishedAt: '2026-03-28', readTime: '10 min', featured: false },
  { id: 'n6', title: 'Banking Sector Layoffs: What You Need to Know', excerpt: 'Analysis of which divisions are affected and where new opportunities lie.', category: 'Industry News', publishedAt: '2026-03-25', readTime: '5 min', featured: false },
  { id: 'n7', title: 'How to File Your First Canadian Tax Return', excerpt: 'A step-by-step guide for newcomers filing taxes for the first time.', category: 'Salary Trends', publishedAt: '2026-03-20', readTime: '7 min', featured: false },
  { id: 'n8', title: 'Ontario PNP 2026: New Streams for Tech Workers', excerpt: 'Ontario opens new immigration streams specifically targeting tech professionals.', category: 'Immigration', publishedAt: '2026-03-15', readTime: '4 min', featured: false },
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  'Hiring News': { bg: '#eef2ff', text: '#4338ca' },
  'Immigration': { bg: '#ecfdf5', text: '#065f46' },
  'Salary Trends': { bg: '#fffbeb', text: '#92400e' },
  'Industry News': { bg: '#fef2f2', text: '#991b1b' },
  'Interview Prep': { bg: '#f5f3ff', text: '#5b21b6' },
};

const newsIcons: Record<string, string> = { 'Hiring News': '📢', 'Immigration': '✈️', 'Salary Trends': '💰', 'Industry News': '🏭', 'Interview Prep': '🎯' };

export default function NewsPage() {
  const featured = newsArticles.filter(n => n.featured);
  const rest = newsArticles.filter(n => !n.featured);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/toronto-skyline.png" alt="Toronto" fill style={{ objectFit: 'cover', opacity: 0.15 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(30,41,59,0.85))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(99,102,241,0.3)' }}>
            <Newspaper size={14} style={{ color: '#c7d2fe' }} />
            <span style={{ color: '#c7d2fe', fontWeight: 700, fontSize: '0.82rem' }}>Career News</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Stay <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Informed</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Job market news, salary trends, immigration updates, and career tips for Canadian professionals.
          </p>
        </div>
      </section>

      {/* Featured Articles */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 32 }}>Featured Stories</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {featured.map(article => {
              const cat = categoryColors[article.category] || { bg: '#f8fafc', text: '#374151' };
              return (
                <div key={article.id} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', background: 'white' }}>
                  <div style={{ height: 160, background: `linear-gradient(135deg, ${cat.text}15, ${cat.text}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <span style={{ fontSize: '3rem' }}>{newsIcons[article.category] || '📰'}</span>
                    <span style={{ position: 'absolute', top: 16, left: 16, fontSize: '0.68rem', fontWeight: 700, padding: '4px 12px', borderRadius: 6, background: cat.bg, color: cat.text }}>{article.category}</span>
                  </div>
                  <div style={{ padding: '24px 22px' }}>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>
                      <span>{article.publishedAt}</span>
                      <span>&#8226;</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b', marginBottom: 8, lineHeight: 1.4 }}>{article.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{article.excerpt}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Latest Articles */}
      <section style={{ padding: '80px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 32 }}>Latest Articles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {rest.map(article => {
              const cat = categoryColors[article.category] || { bg: '#f8fafc', text: '#374151' };
              return (
                <div key={article.id} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 22px', borderRadius: 14, background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                    {newsIcons[article.category] || '📰'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: 4 }}>{article.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{article.excerpt}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: cat.bg, color: cat.text }}>{article.category}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{article.readTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
