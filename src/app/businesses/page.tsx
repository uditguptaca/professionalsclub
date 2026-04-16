'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import { Search, ShieldCheck, Star, Tag, MapPin, Clock, CheckCircle, ArrowRight, Building2 } from 'lucide-react';
import { mockBusinesses } from '@/lib/mock-data';
import { BUSINESS_CATEGORIES } from '@/types';

export default function BusinessDirectoryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('featured');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);

  // Only show verified + pending_review businesses publicly
  const publicBusinesses = mockBusinesses.filter(b => b.verificationStatus === 'verified' || b.verificationStatus === 'pending_review');

  const cities = useMemo(() => [...new Set(publicBusinesses.map(b => b.city))].sort(), [publicBusinesses]);

  const filtered = useMemo(() => {
    let result = [...publicBusinesses];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q) || b.descriptionShort.toLowerCase().includes(q) || b.category.toLowerCase().includes(q));
    }
    if (category) result = result.filter(b => b.category === category);
    if (city) result = result.filter(b => b.city === city);
    if (verifiedOnly) result = result.filter(b => b.verificationStatus === 'verified');
    if (dealsOnly) result = result.filter(b => b.hasMemberRate);

    // Sort
    if (sort === 'featured') result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    else if (sort === 'verified') result.sort((a, b) => (b.verificationStatus === 'verified' ? 1 : 0) - (a.verificationStatus === 'verified' ? 1 : 0));
    else if (sort === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === 'alpha') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [publicBusinesses, search, category, city, sort, verifiedOnly, dealsOnly]);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="biz-hero" style={{ padding: '64px 24px 40px' }}>
        <div className="biz-hero-content" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 40, textAlign: 'left' }}>
          {/* Left Side */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', padding: '5px 14px', borderRadius: 99, marginBottom: 16, border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Building2 size={12} /> Business Directory
            </div>
            <h1 style={{ fontSize: '2.4rem', marginBottom: 10 }}>Find Trusted Local<br />Businesses Near You</h1>
            <p style={{ marginBottom: 20, maxWidth: 480, fontSize: '0.95rem' }}>{publicBusinesses.length}+ verified businesses — discover, connect, and grow in your community.</p>

            {/* Search */}
            <div className="biz-hero-search" style={{ maxWidth: 480 }}>
              <input
                type="text"
                placeholder="Search businesses by name, category, or keyword..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="button"><Search size={18} /> Search</button>
            </div>
          </div>

          {/* Right Side — Register CTA */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <Link href="/businesses/register" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '18px 36px', borderRadius: 14, color: 'white', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(99,102,241,0.4)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', whiteSpace: 'nowrap' }}>
                List Your Business <ArrowRight size={18} />
              </div>
            </Link>
            <p style={{ fontSize: '0.75rem', opacity: 0.6, maxWidth: 200, lineHeight: 1.4 }}>
              Register your business as a member and get verified to appear in our directory.
            </p>
          </div>
        </div>

        {/* Trust Labels */}
        <div className="biz-trust-labels" style={{ maxWidth: 1100, margin: '28px auto 0' }}>
          <div className="biz-trust-label"><ShieldCheck size={14} /> All businesses verified</div>
          <div className="biz-trust-label"><MapPin size={14} /> Local businesses only</div>
          <div className="biz-trust-label"><Clock size={14} /> Updated weekly</div>
          <div className="biz-trust-label"><Star size={14} /> Community curated</div>
        </div>
      </section>

      {/* Directory */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* Filters */}
        <div className="biz-filter-bar">
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={city} onChange={e => setCity(e.target.value)}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="featured">Featured First</option>
            <option value="verified">Verified First</option>
            <option value="newest">Newest</option>
            <option value="alpha">A – Z</option>
          </select>
          <button
            type="button"
            className={`biz-filter-toggle ${verifiedOnly ? 'active' : ''}`}
            onClick={() => setVerifiedOnly(!verifiedOnly)}
          >
            <ShieldCheck size={13} /> Verified Only
          </button>
          <button
            type="button"
            className={`biz-filter-toggle ${dealsOnly ? 'active' : ''}`}
            onClick={() => setDealsOnly(!dealsOnly)}
          >
            <Tag size={13} /> Member Deals
          </button>
          <div className="biz-results-count">{filtered.length} business{filtered.length !== 1 ? 'es' : ''} found</div>
        </div>

        {/* Listing Grid */}
        {filtered.length === 0 ? (
          <div className="biz-empty">
            <h3>No businesses match your filters</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="biz-grid">
            {filtered.map(biz => (
              <Link key={biz.id} href={`/businesses/${biz.slug}`} style={{ textDecoration: 'none' }}>
                <div className="biz-card">
                  <div className="biz-card-image">
                    {biz.coverImage && <img src={biz.coverImage} alt={biz.name} />}
                    <div className="biz-card-badges">
                      {biz.verificationStatus === 'verified' && <span className="biz-badge biz-badge-verified"><ShieldCheck size={10} /> Verified</span>}
                      {biz.isFeatured && <span className="biz-badge biz-badge-featured"><Star size={10} /> Featured</span>}
                      {biz.hasMemberRate && <span className="biz-badge biz-badge-deal"><Tag size={10} /> Member Rate</span>}
                    </div>
                  </div>
                  <div className="biz-card-body">
                    <div className="biz-card-category">{biz.category}</div>
                    <div className="biz-card-name">{biz.name}</div>
                    <div className="biz-card-desc">{biz.descriptionShort}</div>
                    {biz.offerBadge && (
                      <div className="biz-card-offer"><Tag size={12} /> {biz.offerBadge} — {biz.memberRateText?.split('+')[0]}</div>
                    )}
                    <div className="biz-card-meta">
                      <span><MapPin size={12} /> {biz.city}</span>
                      <span>•</span>
                      <span>{biz.yearsInBusiness} yrs in business</span>
                    </div>
                  </div>
                  <div className="biz-card-actions">
                    <span className="btn btn-ghost" style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem' }}>View Business <ArrowRight size={13} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
