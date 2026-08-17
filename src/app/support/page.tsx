'use client';
import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePublicContent } from '@/context/public-content';
import { HeartHandshake } from 'lucide-react';

export default function SupportPage() {
  // Campaigns are admin-managed in the portal; /donate reads the same rows, so
  // this page shows what is actually running rather than a fixed list.
  const { donationCampaigns, loading } = usePublicContent();
  const projects = donationCampaigns.filter(c => c.isActive);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '120px 0 100px 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Support our projects</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '16px auto 0' }}>
              Your contribution helps us deliver free workshops, guides, and settlement support for newcomers.
            </p>
          </div>

          {projects.length === 0 ? (
            !loading && (
              <div className="empty-state">
                <span className="empty-icon"><HeartHandshake size={22} /></span>
                <h3>No active campaigns right now</h3>
                <p>
                  We are not running a fundraising campaign at the moment. You can still contribute towards our
                  general programs on the donate page.
                </p>
                <Link href="/donate" className="btn btn-primary">Go to donate page</Link>
              </div>
            )
          ) : (
            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {projects.map((project) => {
                const progress = project.goalAmount > 0
                  ? Math.min(100, (project.raisedAmount / project.goalAmount) * 100)
                  : 0;
                return (
                  <div key={project.id} style={{ background: 'var(--bg-primary)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {/* Progress Stats */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 400, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>${project.raisedAmount.toLocaleString()}</span>
                          {project.goalAmount > 0 && (
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>of ${project.goalAmount.toLocaleString()} raised</span>
                          )}
                        </div>
                        {/* Progress Bar Container */}
                        <div style={{ width: '100%', height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary-600)', borderRadius: 4 }} />
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.3 }}>
                        {project.title}
                      </h3>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
                        {project.description}
                      </p>

                      <Link
                        href="/donate"
                        className="btn"
                        style={{ width: 'fit-content', background: 'var(--primary-600)', color: 'white', padding: '12px 24px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, border: 'none', borderRadius: 6, textDecoration: 'none' }}
                      >
                        Donate
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
