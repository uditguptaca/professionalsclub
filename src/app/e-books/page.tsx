'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { BookOpen, Plane, MapPin, Download, ExternalLink, GraduationCap, Building2, Car, CreditCard, ShieldCheck, Landmark, ThermometerSnowflake, Wifi, Smartphone, Briefcase, FileText } from 'lucide-react';

// Enhanced Book Cover Component - Mimics the real PDF covers using zero-load CSS
const DigitalCover = ({ title, chapter, color }: { title: string; chapter: string; color: string }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-card)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px',
      position: 'relative',
      border: '1px solid var(--border-color)',
      boxSizing: 'border-box',
    }}>
      {/* Header Mimic */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
        <span style={{ color: 'var(--primary-600)', fontWeight: 900, fontSize: '0.6rem', letterSpacing: '0.5px' }}>CANADA</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: '0.6rem', letterSpacing: '0.5px' }}>PROFESSIONALS</span>
      </div>

      {/* Main Body Area */}
      <div style={{ flex: 1, display: 'flex', gap: '10px', position: 'relative' }}>
        {/* Left Vertical Bar Mimic */}
        <div style={{ 
          width: '24px', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontSize: '0.55rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          borderLeft: `2px solid ${color}`,
          padding: '4px 0'
        }}>
          NEWCOMER&apos;S GUIDE <span style={{ color: 'var(--primary-600)', marginLeft: '4px' }}>CHAPTER {chapter}</span>
        </div>

        {/* Center Image Placeholder Mimic */}
        <div style={{ 
          flex: 1, 
          background: 'var(--bg-secondary)', 
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Abstract Pattern */}
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            opacity: 0.05,
            backgroundImage: `radial-gradient(${color} 1px, transparent 1px)`,
            backgroundSize: '10px 10px'
          }} />
          <div style={{ color: `${color}40` }}>
            <BookOpen size={48} strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* Footer Label Mimic */}
      <div style={{ 
        marginTop: '10px', 
        padding: '6px 8px', 
        background: 'var(--bg-secondary)', 
        borderRadius: '4px',
        fontSize: '0.5rem',
        fontWeight: 800,
        color: 'var(--primary-600)',
        textAlign: 'center',
        textTransform: 'uppercase'
      }}>
        {title}
      </div>
      
      {/* Decorative Branding */}
      <div style={{ position: 'absolute', bottom: '15px', right: '15px', opacity: 0.1 }}>
         <div style={{ width: 20, height: 20, borderRadius: '50%', background: color }} />
      </div>
    </div>
  );
};

const CATEGORIES = [
  {
    id: 'before-moving',
    title: 'Before Moving To',
    highlight: 'Canada',
    icon: <Plane size={24} />,
    color: '#e85d04',
    description: 'Essential guides to help you prepare for your move - visa checklists, document requirements, and pre-arrival planning.',
    files: [
      { name: 'Before Moving to Canada Guide', chapter: '1', url: 'Before-moving-to-Canada.pdf' },
      { name: 'Document List Guide', chapter: '2', url: 'Document-List-you-should-bring-with-yourself-to-Canada-–-A-Newcomers-complete-guide-.pdf' }
    ],
  },
  {
    id: 'after-moving',
    title: 'After Moving To',
    highlight: 'Canada',
    icon: <MapPin size={24} />,
    color: '#0c0c0e',
    description: 'Settle into your new life with confidence - housing, banking, SIN, taxes, and healthcare resources.',
    files: [
      { name: 'After You Arrive in Canada', chapter: '3', url: 'After you arrive in Canada as a newcomer.pdf' },
      { name: 'Applying for a Job in Canada', chapter: '4', url: 'Applying-for-a-job-as-a-newcomer-in-Canada.pdf' },
      { name: 'Bank Accounts for Newcomers', chapter: '5', url: 'Bank-accounts-for-newcomers-in-Canada-1.pdf' },
      { name: 'Broadcast TV for Newcomers', chapter: '6', url: 'Broadcast-TV-for-newcomers-in-Canada.pdf' },
      { name: 'Enrolling Your Kids in School', chapter: '7', url: 'Enrolling-your-kids-in-school-as-a-newcomer-in-Canada.pdf' },
      { name: 'Filing Taxes in Canada', chapter: '8', url: 'File-Tax.pdf' },
      { name: 'Getting a Driving License', chapter: '9', url: 'Getting a driving license in Canada.pdf' },
      { name: 'Getting a SIM Card', chapter: '10', url: 'Getting a SIM card as a newcomer in Canada.pdf' },
      { name: 'Getting Internet', chapter: '11', url: 'Getting-internet-as-a-newcomer-in-Canada.pdf' },
      { name: 'Getting your SIN Card', chapter: '12', url: 'Getting-Social-Insurance-Number-SIN-as-a-newcomer-in-Canada-1.pdf' },
      { name: 'Health Card for Newcomers', chapter: '13', url: 'Health-card-for-newcomers-in-Canada-1.pdf' },
      { name: 'Keeping Important Documents', chapter: '14', url: 'Keep-Important-Documents.pdf' },
      { name: 'Newcomer Housing in Canada', chapter: '15', url: 'Newcomer-housing-in-Canada.pdf' },
      { name: 'Winter Clothing for Newcomers', chapter: '16', url: 'Winter-clothing-for-newcomers-in-Canada-1.pdf' }
    ],
  },
];

const BookCard = ({ file, categoryColor }: { file: any; categoryColor: string }) => {
  const nativeUrl = `https://raw.githack.com/uditguptaca/professionalsclub/main/${encodeURIComponent(file.url)}`;
  
  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: '20px',
      border: '1px solid var(--border-color)',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    }}
    className="hover:shadow-2xl hover:-translate-y-3 group"
    >
      {/* Book Cover Container */}
      <div style={{ 
        position: 'relative', 
        paddingTop: '135%', // Classic Book Aspect Ratio
        overflow: 'hidden',
        background: 'var(--bg-secondary)',
        padding: '15px',
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          position: 'absolute', 
          inset: '15px', 
          boxShadow: '5px 10px 20px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <DigitalCover title={file.name} chapter={file.chapter} color={categoryColor} />
        </div>
      </div>

      {/* Card Info */}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
          margin: 0,
          flex: 1,
          fontFamily: 'var(--font-display)'
        }}>
          {file.name}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <a
            href={nativeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 20px',
              background: 'var(--primary-600)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
            className="hover:bg-orange-600 active:scale-95"
          >
            Download E-Book <Download size={18} />
          </a>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> PDF
            </span>
            <span>Free Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EBooksPage() {
  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero Section - Clean & High Impact */}
      <section style={{ 
        paddingTop: '160px', 
        paddingBottom: '80px', 
        background: '#0c0c0e', 
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Grid */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          opacity: 0.1, 
          backgroundImage: 'radial-gradient(var(--primary-600) 1px, transparent 1px)', 
          backgroundSize: '30px 30px' 
        }} />
        
        <div className="container" style={{ position: 'relative', maxWidth: '800px' }}>
          <div style={{ 
            display: 'inline-block', 
            padding: '8px 20px', 
            background: 'rgba(232, 93, 4, 0.08)', 
            borderRadius: '99px', 
            color: 'var(--primary-600)', 
            fontSize: '0.9rem', 
            fontWeight: 700, 
            marginBottom: '24px',
            border: '1px solid rgba(232, 93, 4, 0.2)'
          }}>
            Newcomer Resources
          </div>
          <h1 style={{ 
            fontSize: '4rem', 
            fontWeight: 900, 
            color: 'white', 
            marginBottom: '20px', 
            lineHeight: 1,
            fontFamily: 'var(--font-display)'
          }}>
            E-Books <span style={{ color: 'var(--primary-600)' }}>Library</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            Step-by-step guides to make settling in Canada simpler — free to download.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <section style={{ padding: '80px 0' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          
          {CATEGORIES.map((category) => (
            <div key={category.id} style={{ marginBottom: '100px' }}>
              {/* Modern Category Title */}
              <div style={{ 
                marginBottom: '48px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px' 
                }}>
                   <div style={{ 
                     padding: '12px', 
                     background: 'var(--bg-primary)', 
                     borderRadius: '16px', 
                     color: category.color,
                     boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                   }}>
                     {category.icon}
                   </div>
                   <h2 style={{ 
                     fontSize: '2.25rem', 
                     fontWeight: 900, 
                     color: 'var(--text-primary)', 
                     margin: 0,
                     fontFamily: 'var(--font-display)' 
                   }}>
                    {category.title} <span style={{ color: category.color }}>{category.highlight}</span>
                  </h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: 0 }}>
                  {category.description}
                </p>
              </div>

              {/* Books Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '40px' 
              }}>
                {category.files.map((file, idx) => (
                  <BookCard key={idx} file={file} categoryColor={category.color} />
                ))}
              </div>
            </div>
          ))}

          {/* Contact CTA */}
          <div style={{ 
            marginTop: '40px', 
            textAlign: 'center', 
            padding: '80px 40px', 
            borderRadius: '32px', 
            background: '#0c0c0e', 
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '-100px', 
              right: '-100px', 
              width: '300px', 
              height: '300px', 
              background: 'radial-gradient(circle, rgba(232, 93, 4, 0.15) 0%, transparent 70%)' 
            }} />
            
            <h3 style={{ fontWeight: 900, fontSize: '2rem', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>
              Looking for something specific?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
              We add new guides every week. Tell us what would help and we'll create it.
            </p>
            <a
              href="mailto:info@professionalsclub.ca"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '18px 48px', 
                background: 'var(--bg-primary)', 
                color: 'var(--text-primary)', 
                borderRadius: '16px', 
                fontWeight: 800, 
                textDecoration: 'none',
                transition: 'all 0.3s ease'
              }}
              className="hover:scale-105 active:scale-95"
            >
              Get In Touch <ExternalLink size={20} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
