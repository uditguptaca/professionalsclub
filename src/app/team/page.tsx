'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import { Globe } from 'lucide-react';

export default function TeamPage() {
  const { teamMembers } = usePortal();
  
  const sorted = [...teamMembers].sort((a, b) => a.order - b.order);

  return (
    <div style={{ background: '#fcfcfc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: 12 }}>Our team</div>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 20 }}>
              Leadership team
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: 600, margin: '0 auto' }}>
              Building the future of community support.
            </p>
          </div>

          {/* Dynamic Team Members Grid */}
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: 40 }}>
            {sorted.map((member) => (
              <div key={member.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', marginBottom: 20, boxShadow: '0 8px 16px rgba(0,0,0,0.06)' }}>
                  <Image src={member.image} alt={member.name} width={100} height={100} style={{ objectFit: 'cover' }} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{member.name}</h3>
                <div style={{ fontSize: '0.9rem', color: '#4f46e5', fontWeight: 600, marginBottom: 12 }}>{member.role}</div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, marginBottom: 20, minHeight: 40 }}>
                  {member.bio.length > 50 ? member.bio.substring(0, 47) + '...' : member.bio}
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  {member.linkedinUrl && (
                    <Link href={member.linkedinUrl} style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 700 }} className="hover:text-blue-600 transition-colors">IN</Link>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
