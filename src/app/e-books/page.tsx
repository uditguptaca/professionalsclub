'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Image from 'next/image';
import { BookOpen, Plane, MapPin, Download, ExternalLink } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'before-moving',
    title: 'Before Moving To',
    highlight: 'Canada',
    icon: <Plane size={24} />,
    color: '#2563eb',
    gradientFrom: '#2563eb',
    gradientTo: '#3b82f6',
    description: 'Essential guides to help you prepare for your move - visa checklists, document requirements, and pre-arrival planning.',
    files: [
      { 
        name: 'Before Moving to Canada Guide', 
        type: 'PDF Document', 
        url: 'Before-moving-to-Canada.pdf',
        cover: '/ebook-covers/before-moving.png'
      },
      { 
        name: 'Document List Guide', 
        type: 'PDF Document', 
        url: 'Document-List-you-should-bring-with-yourself-to-Canada-–-A-Newcomers-complete-guide-.pdf',
        cover: '/ebook-covers/document-list.png'
      }
    ],
  },
  {
    id: 'after-moving',
    title: 'After Moving To',
    highlight: 'Canada',
    icon: <MapPin size={24} />,
    color: '#059669',
    gradientFrom: '#059669',
    gradientTo: '#10b981',
    description: 'Settle into your new life with confidence - housing, banking, SIN, taxes, and healthcare resources.',
    files: [
      { name: 'After You Arrive in Canada', type: 'PDF Document', url: 'After you arrive in Canada as a newcomer.pdf', cover: '/ebook-covers/after-arrive.png' },
      { name: 'Applying for a Job in Canada', type: 'PDF Document', url: 'Applying-for-a-job-as-a-newcomer-in-Canada.pdf', cover: '/ebook-covers/applying-job.png' },
      { name: 'Bank Accounts for Newcomers', type: 'PDF Document', url: 'Bank-accounts-for-newcomers-in-Canada-1.pdf', cover: '/ebook-covers/bank-accounts.png' },
      { name: 'Broadcast TV for Newcomers', type: 'PDF Document', url: 'Broadcast-TV-for-newcomers-in-Canada.pdf', cover: '/ebook-covers/broadcast-tv.png' },
      { name: 'Enrolling Your Kids in School', type: 'PDF Document', url: 'Enrolling-your-kids-in-school-as-a-newcomer-in-Canada.pdf', cover: '/ebook-covers/enrolling-kids.png' },
      { name: 'Filing Taxes in Canada', type: 'PDF Document', url: 'File-Tax.pdf', cover: '/ebook-covers/file-tax.png' },
      { name: 'Getting a Driving License', type: 'PDF Document', url: 'Getting a driving license in Canada.pdf', cover: '/ebook-covers/driving-license.png' },
      { name: 'Getting a SIM Card', type: 'PDF Document', url: 'Getting a SIM card as a newcomer in Canada.pdf', cover: '/ebook-covers/sim-card.png' },
      { name: 'Getting Internet', type: 'PDF Document', url: 'Getting-internet-as-a-newcomer-in-Canada.pdf', cover: '/ebook-covers/internet.png' },
      { name: 'Getting your SIN Card', type: 'PDF Document', url: 'Getting-Social-Insurance-Number-SIN-as-a-newcomer-in-Canada-1.pdf', cover: '/ebook-covers/sin-card.png' },
      { name: 'Health Card for Newcomers', type: 'PDF Document', url: 'Health-card-for-newcomers-in-Canada-1.pdf', cover: '/ebook-covers/health-card.png' },
      { name: 'Keeping Important Documents', type: 'PDF Document', url: 'Keep-Important-Documents.pdf', cover: '/ebook-covers/important-docs.png' },
      { name: 'Newcomer Housing in Canada', type: 'PDF Document', url: 'Newcomer-housing-in-Canada.pdf', cover: '/ebook-covers/housing.png' },
      { name: 'Winter Clothing for Newcomers', type: 'PDF Document', url: 'Winter-clothing-for-newcomers-in-Canada-1.pdf', cover: '/ebook-covers/winter-clothing.png' }
    ],
  },
];

const BookCard = ({ file, categoryColor }) => {
  const nativeUrl = 'https://raw.githack.com/uditguptaca/professionalsclub/main/' + encodeURIComponent(file.url);
  
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }}
    className='hover:shadow-2xl hover:-translate-y-2 group'
    >
      {/* Cover Image Container */}
      <div style={{ 
        position: 'relative', 
        paddingTop: '140%',
        overflow: 'hidden',
        background: '#f1f5f9'
      }}>
        <Image 
          src={file.cover} 
          alt={file.name} 
          fill 
          style={{ objectFit: 'cover', transition: 'transform 0.5s ease' }}
          className='group-hover:scale-110'
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)',
          opacity: 0,
          transition: 'opacity 0.3s ease',
        }} className='group-hover:opacity-100' />
      </div>

      {/* Content */}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#0f172a',
          lineHeight: 1.4,
          margin: 0,
          flex: 1,
          fontFamily: 'var(--font-display)'
        }}>
          {file.name}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
          <a
            href={nativeUrl}
            target='_blank'
            rel='noopener noreferrer'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              background: categoryColor,
              color: 'white',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
            className='hover:opacity-90 active:scale-95'
          >
            <BookOpen size={16} /> View E-Book
          </a>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#64748b',
            fontWeight: 500
          }}>
            <span>PDF Guide</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={12} /> Free
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EBooksPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 80, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src='/hero-community.png' alt='E-Books Library' fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(37,99,235,0.2))' }} />
        </div>
        <div className='container' style={{ position: 'relative', zIndex: 10, maxWidth: 1100, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(37,99,235,0.3)' }}>
            <BookOpen size={14} style={{ color: '#93c5fd' }} />
            <span style={{ color: '#93c5fd', fontWeight: 700, fontSize: '0.82rem' }}>Digital Library</span>
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.1 }}>
            Resource <span style={{ background: 'linear-gradient(135deg, #93c5fd, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>E-Books</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Comprehensive settlement guides to help you build your dream life in Canada.
          </p>
        </div>
      </section>

      {/* Main Library Grid */}
      <section style={{ padding: '80px 0', background: '#f8fafc' }}>
        <div className='container' style={{ maxWidth: 1200 }}>
          
          {CATEGORIES.map((category) => (
            <div key={category.id} style={{ marginBottom: 80 }}>
              {/* Category Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 20, 
                marginBottom: 40,
                borderLeft: '6px solid ' + category.color,
                paddingLeft: 24
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, ' + category.gradientFrom + ', ' + category.gradientTo + ')',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 8px 16px ' + category.color + '25',
                }}>
                  {category.icon}
                </div>
                <div>
                  <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    color: '#0f172a', 
                    margin: 0,
                    fontFamily: 'var(--font-display)' 
                  }}>
                    {category.title} <span style={{ color: category.color }}>{category.highlight}</span>
                  </h2>
                  <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '1rem', fontWeight: 500 }}>
                    {category.description}
                  </p>
                </div>
              </div>

              {/* Books Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                gap: 32 
              }}>
                {category.files.map((file, idx) => (
                  <BookCard key={idx} file={file} categoryColor={category.color} />
                ))}
              </div>
            </div>
          ))}

          {/* Contact Section */}
          <div style={{ 
            marginTop: 40, 
            textAlign: 'center', 
            padding: '60px 40px', 
            borderRadius: 24, 
            background: 'white', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              width: 72, 
              height: 72, 
              background: '#eff6ff', 
              borderRadius: 20, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: '#2563eb'
            }}>
              <BookOpen size={36} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1.6rem', color: '#0f172a', marginBottom: 12, fontFamily: 'var(--font-display)' }}>
              Can&apos;t find what you&apos;re looking for?
            </h3>
            <p style={{ color: '#64748b', fontSize: '1.05rem', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Our library is growing every week. If you have a specific guide in mind or want to contribute a resource, we&apos;d love to hear from you.
            </p>
            <a
              href='mailto:info@professionalsclub.ca'
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 10, 
                padding: '16px 40px', 
                background: '#0f172a', 
                color: 'white', 
                borderRadius: 14, 
                fontWeight: 700, 
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 10px 15px -3px rgba(15,23,42,0.3)'
              }}
              className='hover:scale-105 active:scale-95'
            >
              Contact Support <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
