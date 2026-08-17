'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePublicContent } from '@/context/public-content';
import { Search, MapPin, ArrowRight, Building2, ShieldCheck, Users, Briefcase } from 'lucide-react';

/**
 * Employer directory.
 *
 * Was a hardcoded array of twelve companies with no connection to anything. Now
 * it reads public.companies through company_helper_counts, so it shows the one
 * thing a newcomer actually wants to know: whether the club has anyone inside.
 *
 * That figure is a count and nothing else. The view it comes from exposes no
 * insider identity at all, so there is nothing on this page that could name
 * someone even by accident.
 */

export default function CompaniesPage() {
  const { companies, loading } = usePublicContent();
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('all');

  const industries = useMemo(
    () => ['all', ...[...new Set(companies.map(c => c.industry).filter(Boolean))].sort()] as string[],
    [companies]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter(c => {
      const matchSearch = !q
        || c.name.toLowerCase().includes(q)
        || (c.industry ?? '').toLowerCase().includes(q)
        || (c.city ?? '').toLowerCase().includes(q);
      const matchIndustry = industry === 'all' || c.industry === industry;
      return matchSearch && matchIndustry;
    });
  }, [companies, search, industry]);

  const withHelpers = useMemo(() => companies.filter(c => c.helperCount > 0).length, [companies]);

  return (
    <>
      <Navbar />

      <main id="main">

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: 'var(--text-primary)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/toronto-skyline.png" alt="Toronto skyline" fill sizes="100vw" style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.95), rgba(232,93,4,0.15))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.08)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(232,93,4,0.2)' }}>
            <Building2 size={14} style={{ color: 'var(--primary-600)' }} />
            <span style={{ color: 'var(--primary-600)', fontWeight: 700, fontSize: '0.82rem' }}>Employer Directory</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Major Canadian <span style={{ color: 'var(--primary-600)' }}>Employers</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            {withHelpers > 0
              ? `Members of the club work at ${withHelpers} of these employers and have offered to help with applications. We never say who — only that someone is there.`
              : 'Employers newcomers apply to. Members tell us where they work, and we pass referral requests along without sharing anyone\u2019s details.'}
          </p>
        </div>
      </section>

      {/* Search + Grid */}
      <section className="section" style={{ background: 'var(--bg-primary)' }}>
        <div className="container">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 48, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                placeholder="Search companies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: '0.92rem', outline: 'none', background: 'var(--bg-secondary)' }}
              />
            </div>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: '0.92rem', background: 'var(--bg-secondary)', minWidth: 200 }}
            >
              {industries.map(i => <option key={i} value={i}>{i === 'all' ? 'All Industries' : i}</option>)}
            </select>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: -32, marginBottom: 40, lineHeight: 1.6 }}>
            Public information about Canadian employers, kept here for reference. These companies are not
            partners of Professionals Club and have not endorsed us. Open roles are read from each
            employer&rsquo;s own public job feed.
          </p>

          {/* Companies Grid */}
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {filtered.map(company => (
              <div key={company.id} style={{ borderRadius: 16, border: '1px solid var(--border-color)', overflow: 'hidden', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
                {/* A company with someone inside is the reason to read this page,
                    so it gets the green edge; everything else stays neutral. */}
                <div style={{ height: 8, background: company.helperCount > 0 ? 'var(--green-700)' : 'var(--border-color)' }} />
                <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--green-950)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', fontWeight: 800, flexShrink: 0 }}>
                      {company.logo || company.name.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{company.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {[company.industry, company.sizeRange].filter(Boolean).join(' \u2022 ')}
                      </div>
                    </div>
                  </div>

                  {company.descriptionShort && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {company.descriptionShort}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto' }}>
                    {company.helperCount > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'rgba(27,67,50,0.09)', color: 'var(--green-800)', fontSize: '0.74rem', fontWeight: 700 }}>
                        <ShieldCheck size={13} />
                        {company.helperCount === 1
                          ? '1 member here can help'
                          : `${company.helperCount} members here can help`}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'rgba(0,0,0,0.045)', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>
                        <Users size={13} /> No members here yet
                      </span>
                    )}
                    {company.openJobsCount > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'rgba(232,93,4,0.1)', color: 'var(--primary-700)', fontSize: '0.74rem', fontWeight: 700 }}>
                        <Briefcase size={13} /> {company.openJobsCount} open
                      </span>
                    )}
                  </div>

                  {company.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <MapPin size={14} /> {[company.city, company.province].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {loading && companies.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>Loading employers&hellip;</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>
                {companies.length === 0
                  ? 'No employers are listed yet.'
                  : 'No companies found matching your search.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section-sm" style={{ position: 'relative', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/event_bg.png" alt="Company Referrals" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.92), rgba(12,12,14,0.85))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 600 }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Want a Referral?</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: 32 }}>Sign in, pick the employer and the roles you are going for, and every member there who has offered to help is asked. They see the role, not your name &mdash; and you see theirs only if they say yes.</p>
          <Link href="/portal/auth" className="btn btn-primary btn-lg" style={{ padding: '16px 36px', boxShadow: '0 8px 24px rgba(232,93,4,0.3)', background: 'var(--primary-600)', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Request a Referral <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      </main>

      <Footer />
    </>
  );
}
