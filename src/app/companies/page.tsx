'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { companies } from '@/lib/mock-data';

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
      <div style={{ paddingTop: 100 }}>
        <section className="section-sm">
          <div className="container">
            <div className="section-header">
              <div className="overline">Company Directory</div>
              <h2>Browse <span className="text-gradient">500+ Companies</span></h2>
              <p>Find your target company and request a referral from verified employees.</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
              <input className="input input-search" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
              <select className="input" value={industry} onChange={e => setIndustry(e.target.value)} style={{ width: 200 }}>
                {industries.map(i => <option key={i} value={i}>{i === 'all' ? 'All Industries' : i}</option>)}
              </select>
            </div>
            <div className="grid grid-3 gap-6">
              {filtered.map(company => (
                <div key={company.id} className="company-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div className="company-logo" style={{ borderColor: company.color + '30', background: company.color + '10' }}>{company.logo}</div>
                    <div>
                      <h3 style={{ fontSize: 'var(--text-base)' }}>{company.name}</h3>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{company.industry} • {company.size}</span>
                    </div>
                    {company.pricingTier === 'premium' && <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>Premium</span>}
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{company.description}</p>
                  <div className="meta"><span>📍 {company.location}</span></div>
                  <div className="stats">
                    <div className="stat-item"><span className="stat-value">{company.openRoles}</span><span className="stat-label">Open Roles</span></div>
                    <div className="stat-item"><span className="stat-value">{company.activeReferrers}</span><span className="stat-label">Referrers</span></div>
                    <div className="stat-item"><span className="stat-value">${company.pricePerRequest}</span><span className="stat-label">Per Request</span></div>
                  </div>
                  <Link href="/signup" className="btn btn-primary btn-sm w-full" style={{ marginTop: 'var(--space-2)' }}>Request Referral →</Link>
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
