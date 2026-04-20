'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { ExternalLink, Link as LinkIcon, Landmark, Briefcase, FileSignature, Users, HeartPulse } from 'lucide-react';

const linkCategories = [
  {
    title: 'Canada Revenue Agency (CRA) & Taxes',
    icon: <Landmark size={24} style={{ color: '#0ea5e9' }} />,
    color: '#0ea5e9',
    links: [
      { name: 'CRA Home Page', url: 'https://www.canada.ca/en/revenue-agency.html' },
      { name: 'Income Tax in Canada', url: 'https://www.canada.ca/en/services/taxes/income-tax.html' },
      { name: 'Canadian income tax rates for individuals', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html' },
      { name: 'GST/HST Rates & Calculator', url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html' },
      { name: 'CRA Linked-In', url: 'https://www.linkedin.com/company/cra-arc/' },
      { name: 'CRA Twitter', url: 'https://twitter.com/CanRevAgency' },
    ]
  },
  {
    title: 'Incorporation & Contracting',
    icon: <Briefcase size={24} style={{ color: '#8b5cf6' }} />,
    color: '#8b5cf6',
    links: [
      { name: 'What is Incorporation in Canada?', url: 'https://ised-isde.canada.ca/site/corporations-canada/en/business-corporations/what-are-business-corporations' },
      { name: 'How do I incorporate in Canada?', url: 'https://ised-isde.canada.ca/site/corporations-canada/en/business-corporations/how-incorporate-business' },
      { name: 'Difference between Federal & Provincial Incorporation', url: 'https://ised-isde.canada.ca/site/corporations-canada/en/business-corporations/incorporating-federally-or-provincially-territorially' },
      { name: 'Federal Incorporation Registry', url: 'https://ised-isde.canada.ca/site/corporations-canada/en' },
      { name: 'Provincial Incorporation (Ontario)', url: 'https://www.ontario.ca/page/incorporate-business' },
    ]
  },
  {
    title: 'Employment Insurance (EI)',
    icon: <FileSignature size={24} style={{ color: '#f59e0b' }} />,
    color: '#f59e0b',
    links: [
      { name: 'Employment Insurance benefits Overview', url: 'https://www.canada.ca/en/services/benefits/ei.html' },
      { name: 'EI benefits for self-employed persons', url: 'https://www.canada.ca/en/services/benefits/ei/ei-self-employed-workers.html' },
      { name: 'Apply for EI Regular Benefits', url: 'https://www.canada.ca/en/services/benefits/ei/ei-regular-benefit/apply.html' },
    ]
  },
  {
    title: 'Immigration & Citizenship (IRCC)',
    icon: <Users size={24} style={{ color: '#ef4444' }} />,
    color: '#ef4444',
    links: [
      { name: 'IRCC Official Home Page', url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html' },
      { name: 'Express Entry System', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html' },
      { name: 'Check Processing Times', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html' },
      { name: 'Permanent Resident (PR) Portal', url: 'https://prson-srpen.apps.cic.gc.ca/en/login' },
    ]
  },
  {
    title: 'Settlement & Daily Essentials',
    icon: <HeartPulse size={24} style={{ color: '#10b981' }} />,
    color: '#10b981',
    links: [
      { name: 'Apply for a Social Insurance Number (SIN)', url: 'https://www.canada.ca/en/employment-social-development/services/sin.html' },
      { name: 'Service Canada Portal', url: 'https://www.canada.ca/en/employment-social-development/corporate/portfolio/service-canada.html' },
      { name: 'Apply for Ontario Health Insurance Plan (OHIP)', url: 'https://www.ontario.ca/page/apply-ohip-and-get-health-card' },
      { name: 'Job Bank Canada', url: 'https://www.jobbank.gc.ca/home' },
    ]
  }
];

export default function ImpLinksPage() {
  return (
    <>
      <Navbar />

      <main style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(51,65,85,0.1)', color: '#334155', marginBottom: 20 }}>
              <LinkIcon size={32} />
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 16 }}>
              Important Links Directory
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 700, margin: '0 auto' }}>
              A curated collection of official Canadian government portals, essential tax calculators, and newcomer settlement resources.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {linkCategories.map((cat, idx) => (
              <div key={idx} style={{ background: 'white', borderRadius: 24, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid var(--border-color)' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16, background: '#f8fafc' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    {cat.icon}
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
                    {cat.title}
                  </h2>
                </div>
                
                <div style={{ padding: '24px 32px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {cat.links.map((link, jdx) => (
                      <li key={jdx}>
                        <a 
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '16px 20px',
                            background: '#f8fafc',
                            borderRadius: 12,
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s',
                            border: '1px solid transparent'
                          }}
                          className={`hover:border-${cat.color} hover:bg-white hover:shadow-md group`}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = cat.color;
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            const icon = e.currentTarget.querySelector('.link-icon') as HTMLElement;
                            if (icon) icon.style.color = cat.color;
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                            const icon = e.currentTarget.querySelector('.link-icon') as HTMLElement;
                            if (icon) icon.style.color = '#94a3b8';
                          }}
                        >
                          <ExternalLink className="link-icon" size={18} style={{ color: '#94a3b8', marginTop: 2, transition: 'color 0.2s', flexShrink: 0 }} />
                          <span style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 }}>{link.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
