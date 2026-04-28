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
      { name: 'Before Moving to Canada Guide', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Before-moving-to-Canada.pdf' },
      { name: 'Document List - A Newcomer\'s Complete Guide', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Document-List-you-should-bring-with-yourself-to-Canada-%E2%80%93-A-Newcomers-complete-guide-.pdf' }
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
      { name: 'After You Arrive in Canada', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/After%20you%20arrive%20in%20Canada%20as%20a%20newcomer.pdf' },
      { name: 'Applying for a Job in Canada', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Applying-for-a-job-as-a-newcomer-in-Canada.pdf' },
      { name: 'Bank Accounts for Newcomers', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Bank-accounts-for-newcomers-in-Canada-1.pdf' },
      { name: 'Broadcast TV for Newcomers', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Broadcast-TV-for-newcomers-in-Canada.pdf' },
      { name: 'Enrolling Your Kids in School', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Enrolling-your-kids-in-school-as-a-newcomer-in-Canada.pdf' },
      { name: 'Filing Taxes in Canada', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/File-Tax.pdf' },
      { name: 'Getting a Driving License in Canada', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Getting%20a%20driving%20license%20in%20Canada.pdf' },
      { name: 'Getting a SIM Card as a Newcomer', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Getting%20a%20SIM%20card%20as%20a%20newcomer%20in%20Canada.pdf' },
      { name: 'Getting Internet as a Newcomer', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Getting-internet-as-a-newcomer-in-Canada.pdf' },
      { name: 'Getting your SIN Card', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Getting-Social-Insurance-Number-SIN-as-a-newcomer-in-Canada-1.pdf' },
      { name: 'Health Card for Newcomers', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Health-card-for-newcomers-in-Canada-1.pdf' },
      { name: 'Keeping Important Documents', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Keep-Important-Documents.pdf' },
      { name: 'Newcomer Housing in Canada', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Newcomer-housing-in-Canada.pdf' },
      { name: 'Winter Clothing for Newcomers', type: 'PDF Document', size: 'Download', url: 'https://cdn.jsdelivr.net/gh/uditguptaca/professionalsclub@main/Winter-clothing-for-newcomers-in-Canada-1.pdf' }
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
                          {category.title} <span style={{ color: category.color }}>{category.highlight}</span>
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginTop: 2, display: 'block' }}>
                          {category.files.length > 0
                            ? `${category.files.length} guide${category.files.length !== 1 ? "s" : ""} available`
                            : 'Click to explore guides'}
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

