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
            {featured.map((article, idx) => {
              const cat = categoryColors[article.category] || { bg: '#f8fafc', text: '#374151' };
              return (
                <div key={article.id} style={{ position: 'relative', height: 380, borderRadius: 24, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }} className="hover:-translate-y-1 hover:shadow-xl">
                  <Image src={["/finance_bg.png", "/toronto-skyline.png", "/career-mentorship.png"][idx % 3]} alt={article.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.2) 100%)' }} />
                  
                  <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{newsIcons[article.category] || '📰'}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>{article.category}</span>
                  </div>

                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24 }}>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: '#cbd5e1', marginBottom: 12, fontWeight: 600 }}>
                      <span>{article.publishedAt}</span>
                      <span>&#8226;</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h3 style={{ fontWeight: 900, fontSize: '1.3rem', color: 'white', marginBottom: 12, lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>{article.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>{article.excerpt}</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {rest.map((article, idx) => {
              const cat = categoryColors[article.category] || { bg: '#f8fafc', text: '#374151' };
              return (
                <div key={article.id} style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '20px 24px', borderRadius: 20, background: 'linear-gradient(135deg, rgba(15,23,42,0.02), rgba(15,23,42,0.05))', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }} className="hover:-translate-y-1 hover:shadow-lg">
                  <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', position: 'relative', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <Image src={["/hero-community.png", "/healthcare_bg.png", "/housing_bg.png", "/events-meetup.png", "/meetup_bg.png"][idx % 5]} alt={article.category} fill style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{newsIcons[article.category] || '📰'}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: cat.bg, color: cat.text }}>{article.category}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{article.readTime}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b', marginBottom: 6, lineHeight: 1.3 }}>{article.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{article.excerpt}</div>
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
