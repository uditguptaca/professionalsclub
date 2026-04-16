'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Search, MapPin, ArrowRight, Building2 } from 'lucide-react';

const companies = [
  { id: 'c1', name: 'Shopify', logo: '🟢', industry: 'Technology', size: '10,000+', location: 'Ottawa, ON', description: 'Commerce platform helping merchants sell online', color: '#96bf48' },
  { id: 'c2', name: 'Amazon Canada', logo: '📦', industry: 'Technology', size: '50,000+', location: 'Vancouver, BC', description: 'Global technology and e-commerce company', color: '#ff9900' },
  { id: 'c3', name: 'Royal Bank of Canada', logo: '🏦', industry: 'Banking', size: '50,000+', location: 'Toronto, ON', description: 'Canada\'s largest bank by market capitalization', color: '#003168' },
  { id: 'c4', name: 'TD Bank', logo: '🟩', industry: 'Banking', size: '50,000+', location: 'Toronto, ON', description: 'One of Canada\'s Big Five banks', color: '#34a853' },
  { id: 'c5', name: 'Google Canada', logo: '🔍', industry: 'Technology', size: '10,000+', location: 'Waterloo, ON', description: 'Technology giant with offices across Canada', color: '#4285f4' },
  { id: 'c6', name: 'Microsoft Canada', logo: '🪟', industry: 'Technology', size: '10,000+', location: 'Vancouver, BC', description: 'Global technology leader in cloud and software', color: '#00a4ef' },
  { id: 'c7', name: 'Deloitte Canada', logo: '🔷', industry: 'Consulting', size: '10,000+', location: 'Toronto, ON', description: 'Global professional services and consulting firm', color: '#86bc25' },
  { id: 'c8', name: 'CIBC', logo: '🏛️', industry: 'Banking', size: '40,000+', location: 'Toronto, ON', description: 'Full-service financial institution', color: '#c41f3b' },
  { id: 'c9', name: 'Telus', logo: '📱', industry: 'Telecommunications', size: '30,000+', location: 'Vancouver, BC', description: 'Leading Canadian telecom company', color: '#4b286d' },
  { id: 'c10', name: 'Scotiabank', logo: '🏦', industry: 'Banking', size: '50,000+', location: 'Toronto, ON', description: 'International banking and financial services', color: '#ef3e42' },
  { id: 'c11', name: 'Wealthsimple', logo: '💰', industry: 'Fintech', size: '1,000+', location: 'Toronto, ON', description: 'Canadian online investment management service', color: '#ff5722' },
  { id: 'c12', name: 'Manulife', logo: '🛡️', industry: 'Insurance', size: '30,000+', location: 'Toronto, ON', description: 'Leading international financial services company', color: '#00843d' },
];

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('all');
  const industries = ['all', ...new Set(companies.map(c => c.industry))];
  const filtered = companies.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase());
    const matchIndustry = industry === 'all' || c.industry === industry;
    return matchSearch && matchIndustry;
  });

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/toronto-skyline.png" alt="Toronto skyline" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(99,102,241,0.25))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(99,102,241,0.3)' }}>
            <Building2 size={14} style={{ color: '#c7d2fe' }} />
            <span style={{ color: '#c7d2fe', fontWeight: 700, fontSize: '0.82rem' }}>Partner Network</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Companies in Our <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Network</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Organizations where our volunteers work. Request a referral through our admin-mediated help desk.
          </p>
        </div>
      </section>

      {/* Search + Grid */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 48, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                placeholder="Search companies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', background: '#f8fafc' }}
              />
            </div>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.92rem', background: '#f8fafc', minWidth: 200 }}
            >
              {industries.map(i => <option key={i} value={i}>{i === 'all' ? 'All Industries' : i}</option>)}
            </select>
          </div>

          {/* Companies Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {filtered.map(company => (
              <div key={company.id} style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default', background: 'white' }}>
                <div style={{ height: 8, background: company.color }} />
                <div style={{ padding: '24px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: company.color + '12', border: `1px solid ${company.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      {company.logo}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>{company.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{company.industry} &#8226; {company.size}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>{company.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#94a3b8' }}>
                    <MapPin size={14} /> {company.location}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>No companies found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 12 }}>Want a Referral?</h2>
          <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: 28 }}>Submit a help request on our portal specifying the company and role. Our admin team will match you with a volunteer who works there.</p>
          <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ padding: '16px 36px' }}>
            Request a Referral <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
