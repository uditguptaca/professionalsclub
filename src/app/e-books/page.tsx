'use client';
import React, { useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Image from 'next/image';
import { BookOpen, Plane, MapPin, ChevronDown, FileText, Download, FolderOpen } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'before-moving',
    title: 'Before Moving To',
    highlight: 'Canada',
    icon: <Plane size={24} />,
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    gradientFrom: '#2563eb',
    gradientTo: '#3b82f6',
    description: 'Essential guides to help you prepare for your move - visa checklists, document requirements, pre-arrival planning, and everything you need to know before landing in Canada.',
    files: [
      { name: 'Before Moving to Canada Guide', type: 'PDF Document', size: 'Download', url: 'Before-moving-to-Canada.pdf' },
      { name: 'Document List - A Newcomer\'s Complete Guide', type: 'PDF Document', size: 'Download', url: 'Document-List-you-should-bring-with-yourself-to-Canada-–-A-Newcomers-complete-guide-.pdf' }
    ] as { name: string; type: string; size: string; url: string }[],
  },
  {
    id: 'after-moving',
    title: 'After Moving To',
    highlight: 'Canada',
    icon: <MapPin size={24} />,
    color: '#059669',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    gradientFrom: '#059669',
    gradientTo: '#10b981',
    description: 'Settle into your new life with confidence - housing guides, banking setup, SIN application, tax filing basics, healthcare enrollment, and career kickstart resources.',
    files: [
      { name: 'After You Arrive in Canada', type: 'PDF Document', size: 'Download', url: 'After you arrive in Canada as a newcomer.pdf' },
      { name: 'Applying for a Job in Canada', type: 'PDF Document', size: 'Download', url: 'Applying-for-a-job-as-a-newcomer-in-Canada.pdf' },
      { name: 'Bank Accounts for Newcomers', type: 'PDF Document', size: 'Download', url: 'Bank-accounts-for-newcomers-in-Canada-1.pdf' },
      { name: 'Broadcast TV for Newcomers', type: 'PDF Document', size: 'Download', url: 'Broadcast-TV-for-newcomers-in-Canada.pdf' },
      { name: 'Enrolling Your Kids in School', type: 'PDF Document', size: 'Download', url: 'Enrolling-your-kids-in-school-as-a-newcomer-in-Canada.pdf' },
      { name: 'Filing Taxes in Canada', type: 'PDF Document', size: 'Download', url: 'File-Tax.pdf' },
      { name: 'Getting a Driving License in Canada', type: 'PDF Document', size: 'Download', url: 'Getting a driving license in Canada.pdf' },
      { name: 'Getting a SIM Card as a Newcomer', type: 'PDF Document', size: 'Download', url: 'Getting a SIM card as a newcomer in Canada.pdf' },
      { name: 'Getting Internet as a Newcomer', type: 'PDF Document', size: 'Download', url: 'Getting-internet-as-a-newcomer-in-Canada.pdf' },
      { name: 'Getting your SIN Card', type: 'PDF Document', size: 'Download', url: 'Getting-Social-Insurance-Number-SIN-as-a-newcomer-in-Canada-1.pdf' },
      { name: 'Health Card for Newcomers', type: 'PDF Document', size: 'Download', url: 'Health-card-for-newcomers-in-Canada-1.pdf' },
      { name: 'Keeping Important Documents', type: 'PDF Document', size: 'Download', url: 'Keep-Important-Documents.pdf' },
      { name: 'Newcomer Housing in Canada', type: 'PDF Document', size: 'Download', url: 'Newcomer-housing-in-Canada.pdf' },
      { name: 'Winter Clothing for Newcomers', type: 'PDF Document', size: 'Download', url: 'Winter-clothing-for-newcomers-in-Canada-1.pdf' }
    ] as { name: string; type: string; size: string; url: string }[],
  },
];

export default function EBooksPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSection(prev => (prev === id ? null : id));
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/hero-community.png" alt="E-Books Library" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(37,99,235,0.2))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(37,99,235,0.3)' }}>
            <BookOpen size={14} style={{ color: '#93c5fd' }} />
            <span style={{ color: '#93c5fd', fontWeight: 700, fontSize: '0.82rem' }}>Free Resources</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            E-Books <span style={{ background: 'linear-gradient(135deg, #93c5fd, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Library</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Comprehensive guides to support your Canadian journey - from pre-arrival planning to settling in and thriving.
          </p>
        </div>
      </section>

      {/* Category Sections */}
      <section style={{ padding: '48px 0 80px', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 900 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {CATEGORIES.map((category) => {
              const isExpanded = expandedSection === category.id;

              return (
                <div
                  key={category.id}
                  style={{
                    borderRadius: 16,
                    border: `1.5px solid ${isExpanded ? category.borderColor : "#e2e8f0"}`,
                    background: 'white',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Clickable Header */}
                  <div
                    onClick={() => toggleSection(category.id)}
                    style={{
                      padding: '28px 32px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: isExpanded ? category.bgColor : 'white',
                      transition: 'background 0.25s ease',
                      userSelect: 'none',
                    }}
                    className="ebook-category-header"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${category.gradientFrom}, ${category.gradientTo})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0,
                        boxShadow: `0 4px 14px ${category.color}30`,
                      }}>
                        {category.icon}
                      </div>
                      <div>
                        <h2 style={{
                          fontWeight: 800,
                          fontSize: '1.3rem',
                          fontFamily: 'var(--font-display)',
                          margin: 0,
                          color: '#0f172a',
                          lineHeight: 1.3,
                        }}>
                          {category.title} <span style={{ color: category.color }}>Canada</span>
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginTop: 2, display: 'block' }}>
                          {category.files.length} guides available
                        </span>
                      </div>
                    </div>
                    <div style={{
                      color: category.color,
                      transition: 'transform 0.3s ease',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isExpanded ? `${category.color}15` : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <ChevronDown size={20} />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ padding: '0 32px 32px', borderTop: `1px solid ${category.borderColor}` }}>
                      {/* Description */}
                      <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.75, marginTop: 24, marginBottom: 28 }}>
                        {category.description}
                      </p>
                      {/* Files List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {category.files.map((file, idx) => {
                          const rawUrl = `https://raw.githubusercontent.com/uditguptaca/professionalsclub/main/${file.url}`;
                          const finalUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}`;
                          return (
                            <a
                              key={idx}
                              href={finalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                padding: '14px 18px',
                                borderRadius: 12,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                              }}
                              className="hover:shadow-md hover:-translate-y-0.5"
                            >
                              <div style={{
                                width: 42,
                                height: 42,
                                borderRadius: 10,
                                background: `${category.color}12`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <FileText size={20} style={{ color: category.color }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: 2 }}>
                                  {file.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                                  {file.type} • {file.size}
                                </div>
                              </div>
                              <Download size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Bottom CTA */}
          <div style={{ marginTop: 48, textAlign: 'center', padding: '40px 32px', borderRadius: 16, background: 'white', border: '1px solid #e2e8f0' }}>
            <BookOpen size={36} style={{ color: '#2563eb', margin: '0 auto 16px' }} />
            <h3 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
              Have a guide to share?
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24, maxWidth: 420, margin: '0 auto 24px' }}>
              If you&apos;ve created a helpful resource for newcomers, we&apos;d love to feature it in our library. Reach out to us!
            </p>
            <a
              href="mailto:info@professionalsclub.ca"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: '#2563eb', color: 'white', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}
            >
              <BookOpen size={18} /> Contact Us
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}
