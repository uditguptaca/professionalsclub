'use client';
import React from 'react';
import ContentImage from '@/components/shared/ContentImage';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePublicContent } from '@/context/public-content';
import { Link2 } from 'lucide-react';

export default function TeamPage() {
  const { teamMembers, loading } = usePublicContent();
  
  const sorted = [...teamMembers].sort((a, b) => a.order - b.order);

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main id="main" style={{ flex: 1, padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Our team</div>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 20 }}>
              The people behind the help
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
              A small team building a place where newcomers and professionals support each other.
            </p>
          </div>

          {/* Dynamic Team Members Grid */}
          {sorted.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 40 }}>
              {loading ? 'Loading team members…' : 'Team profiles are coming soon.'}
            </p>
          ) : (
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: 40 }}>
            {sorted.map((member) => (
              <div key={member.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', marginBottom: 20, boxShadow: '0 8px 16px rgba(0,0,0,0.06)' }}>
                  <ContentImage src={member.image} alt={member.name} width={100} height={100} style={{ objectFit: 'cover' }} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{member.name}</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-accent)', fontWeight: 600, marginBottom: 12 }}>{member.role}</div>
                {/* Clamped visually, so the full bio stays in the DOM. */}
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {member.bio}
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  {member.linkedinUrl && (
                    <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on LinkedIn`} style={{ color: 'var(--text-muted)', display: 'inline-flex' }} onMouseOver={e=>e.currentTarget.style.color='var(--primary-600)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'}><Link2 size={18} /></a>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
