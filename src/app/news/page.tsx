'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { mockNews } from '@/lib/mock-data';

export default function NewsPage() {
  const newsIcons: Record<string, string> = { 'Hiring News': '📢', 'Immigration': '✈️', 'Salary Trends': '💰', 'Industry News': '🏭', 'Interview Prep': '🎯' };
  const featured = mockNews.filter(n => n.featured);
  const rest = mockNews.filter(n => !n.featured);

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 100 }}>
        <section className="section-sm">
          <div className="container">
            <div className="section-header">
              <div className="overline">Career News</div>
              <h2>Stay <span className="text-gradient">Informed</span></h2>
              <p>Job market news, salary trends, immigration updates, and career tips for Canadian professionals.</p>
            </div>

            {/* Featured */}
            <div className="grid grid-3 gap-6" style={{ marginBottom: 'var(--space-10)' }}>
              {featured.map(article => (
                <div key={article.id} className="news-card">
                  <div className="news-image" style={{ background: 'linear-gradient(135deg, var(--primary-800), var(--accent-700))' }}>
                    <span>{newsIcons[article.category] || '📰'}</span>
                  </div>
                  <div className="news-body">
                    <div className="news-meta">
                      <span className="badge badge-primary">{article.category}</span>
                      <span>{article.publishedAt}</span>
                      <span>⏱️ {article.readTime}</span>
                    </div>
                    <h3>{article.title}</h3>
                    <p>{article.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Rest */}
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Latest Articles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {rest.map(article => (
                <div key={article.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', cursor: 'pointer' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                    {newsIcons[article.category] || '📰'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{article.title}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{article.excerpt}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)', flexShrink: 0 }}>
                    <span className="badge badge-neutral">{article.category}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{article.readTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
