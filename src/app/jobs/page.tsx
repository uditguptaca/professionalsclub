'use client';
import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, Briefcase, ChevronRight, Code2, Calculator, Cpu, Stethoscope, Landmark, Tv2, UtensilsCrossed, GraduationCap, Heart, DollarSign, ArrowRight, Filter, Building2, Clock, ExternalLink } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { usePortal } from '@/context/portal-context';
import type { JobType } from '@/types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Developer': <Code2 size={28} />,
  'Accounting': <Calculator size={28} />,
  'Technology': <Cpu size={28} />,
  'Medical': <Stethoscope size={28} />,
  'Government': <Landmark size={28} />,
  'Media & News': <Tv2 size={28} />,
  'Restaurants': <UtensilsCrossed size={28} />,
  'Education': <GraduationCap size={28} />,
};

const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
};

const JOB_TYPE_COLORS: Record<JobType, { bg: string; color: string }> = {
  full_time: { bg: '#dbeafe', color: '#1e40af' },
  part_time: { bg: '#fce7f3', color: '#9d174d' },
  contract: { bg: '#fee2e2', color: '#dc2626' },
  freelance: { bg: '#fef3c7', color: '#92400e' },
  internship: { bg: '#fff1f2', color: '#be123c' },
};

function formatSalary(min: number, max: number, period: string) {
  const fmt = (n: number) => {
    if (period === 'yearly') return `$${(n / 1000).toFixed(0)}k`;
    return `$${n}`;
  };
  const suffix = period === 'yearly' ? '/yr' : period === 'monthly' ? '/mo' : '/hr';
  return `${fmt(min)} – ${fmt(max)}${suffix}`;
}

type TabFilter = 'featured' | 'recent' | 'full_time' | 'part_time';

export default function JobsPage() {
  const { jobPostings } = usePortal();
  const activeJobs = jobPostings.filter(j => j.isActive);

  // Search state
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('featured');
  const [searchApplied, setSearchApplied] = useState(false);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeJobs.forEach(j => {
      counts[j.category] = (counts[j.category] || 0) + 1;
    });
    return counts;
  }, [activeJobs]);

  // Filtered jobs for main listing
  const filteredJobs = useMemo(() => {
    let jobs = [...activeJobs];

    // Search filters
    if (searchApplied) {
      if (keyword) {
        const kw = keyword.toLowerCase();
        jobs = jobs.filter(j => j.title.toLowerCase().includes(kw) || j.company.toLowerCase().includes(kw) || j.tags.some(t => t.toLowerCase().includes(kw)));
      }
      if (location) {
        const loc = location.toLowerCase();
        jobs = jobs.filter(j => j.location.toLowerCase().includes(loc) || j.province.toLowerCase().includes(loc));
      }
      if (typeFilter) {
        jobs = jobs.filter(j => j.jobType === typeFilter);
      }
      if (categoryFilter) {
        jobs = jobs.filter(j => j.category === categoryFilter);
      }
    }

    // Tab filter
    switch (activeTab) {
      case 'featured':
        jobs = jobs.filter(j => j.isFeatured);
        break;
      case 'recent':
        jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
        break;
      case 'full_time':
        jobs = jobs.filter(j => j.jobType === 'full_time');
        break;
      case 'part_time':
        jobs = jobs.filter(j => j.jobType === 'part_time');
        break;
    }

    return jobs;
  }, [activeJobs, keyword, location, typeFilter, categoryFilter, activeTab, searchApplied]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchApplied(true);
    setActiveTab('recent');
  };

  const clearSearch = () => {
    setKeyword('');
    setLocation('');
    setTypeFilter('');
    setCategoryFilter('');
    setSearchApplied(false);
    setActiveTab('featured');
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'featured', label: 'Featured' },
    { key: 'recent', label: 'Recent Jobs' },
    { key: 'full_time', label: 'Full Time' },
    { key: 'part_time', label: 'Part Time' },
  ];

  return (
    <>
      <Navbar />

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', minHeight: '520px', display: 'flex', alignItems: 'center', overflow: 'hidden', background: '#0f172a' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/career-mentorship.png" alt="Career growth" fill style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.25 }} priority />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.85) 50%, rgba(168,102,247,0.2) 100%)' }} />
        </div>

        <div className="container mobile-stack" style={{ position: 'relative', zIndex: 10, maxWidth: 1200, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, alignItems: 'center', padding: '60px 24px 40px' }}>
          {/* Left */}
          <div>
            <h1 style={{ fontSize: '3.2rem', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 20, fontFamily: 'var(--font-display)' }}>
              Best Place To <span style={{ background: 'linear-gradient(135deg, #fb7185, #e11d48)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Grow</span><br />Your Career
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#fb7185', fontWeight: 600, marginBottom: 16 }}>
              Find Jobs, Employment & Career Opportunities
            </p>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
              Browse {activeJobs.length}+ jobs.
            </p>
            <Link href="/portal/auth" className="btn btn-lg" style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', padding: '14px 28px', fontSize: '0.95rem', boxShadow: '0 8px 24px rgba(225,29,72,0.35)' }}>
              Get Started <ArrowRight size={18} />
            </Link>
          </div>

          {/* Right — Search Panel */}
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginBottom: 4, fontFamily: 'var(--font-display)' }}>FIND YOUR JOB!</h2>
            <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #e11d48, #fb7185)', borderRadius: 2, marginBottom: 24 }} />

            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="What are you looking for?"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: '#f8fafc' }}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: '#f8fafc' }}
                />
              </div>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: '#f8fafc', color: typeFilter ? '#0f172a' : '#94a3b8' }}
              >
                <option value="">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
                <option value="internship">Internship</option>
              </select>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: '#f8fafc', color: categoryFilter ? '#0f172a' : '#94a3b8' }}
              >
                <option value="">Choose a category...</option>
                {Object.keys(CATEGORY_ICONS).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Legal">Legal</option>
                <option value="HR & Recruitment">HR & Recruitment</option>
                <option value="Design">Design</option>
                <option value="Other">Other</option>
              </select>

              <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                <Search size={16} /> SEARCH
              </button>

              {searchApplied && (
                <button type="button" onClick={clearSearch} style={{ width: '100%', padding: '10px', background: 'none', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                  Clear Filters
                </button>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ─── POPULAR CATEGORIES ─── */}
      <section style={{ padding: '40px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 12 }}>Dive Into Your Ideal Category!</h2>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>Browse Top Fields</p>
          </div>

          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
              <button
                key={cat}
                onClick={() => { setCategoryFilter(cat); setSearchApplied(true); setActiveTab('recent'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: '#fff1f2',
                  border: 'none',
                  borderRadius: 16,
                  padding: '20px 24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s',
                  position: 'relative',
                }}
                className="category-card-hover"
                onMouseOver={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ 
                  width: 46, 
                  height: 46, 
                  borderRadius: '50%', 
                  background: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#e11d48',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(225,29,72,0.1)'
                }}>
                  {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: 4 }}>{cat}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{categoryCounts[cat] || 0} Jobs Available</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
             <button onClick={() => { setCategoryFilter(''); setSearchApplied(true); setActiveTab('recent'); }} style={{ background: 'none', border: 'none', color: '#e11d48', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s' }} onMouseOver={e=>e.currentTarget.style.opacity='0.8'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>
               View All Categories <ChevronRight size={16} />
             </button>
          </div>
        </div>
      </section>

      {/* ─── TOP JOB CITIES ─── */}
      <section style={{ padding: '40px 0', background: '#faf5ff' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 12 }}>Explore Top Job Cities!</h2>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>Unlock Opportunities</p>
          </div>

          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[
              { name: 'Toronto, ON', jobs: 120, img: '/toronto-skyline.png' },
              { name: 'Vancouver, BC', jobs: 85, img: '/vancouver-skyline.png' },
              { name: 'Calgary, AB', jobs: 45, img: '/calgary-skyline.png' },
              { name: 'Montreal, QC', jobs: 60, img: '/montreal-skyline.png' }
            ].map((city, i) => (
              <div key={i} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-4px)'} onMouseOut={e=>e.currentTarget.style.transform='none'}>
                <div style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', height: 260, marginBottom: 16 }}>
                  <Image src={city.img} alt={city.name} fill style={{ objectFit: 'cover' }} unoptimized={city.img.startsWith('http')} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 4 }}>{city.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{city.jobs} Jobs Available</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
             <button style={{ background: 'none', border: 'none', color: '#a855f7', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s' }} onMouseOver={e=>e.currentTarget.style.opacity='0.8'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>
               Explore More <ChevronRight size={16} />
             </button>
          </div>
        </div>
      </section>

      {/* ─── RECENT JOBS ─── */}
      <section style={{ padding: '40px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-flex-col mobile-gap-reduce" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 4 }}>RECENT JOBS</h2>
              <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #a855f7, #c084fc)', borderRadius: 2 }} />
            </div>

            {/* Tab Filters */}
            <div className="mobile-nav-scroll" style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: '100%' }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === tab.key ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'white',
                    color: activeTab === tab.key ? 'white' : '#374151',
                    transition: 'all 0.2s',
                    borderRight: '1px solid #e2e8f0',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Job Cards Grid */}
          {filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 16, border: '1px solid #e5e7eb' }}>
              <Briefcase size={48} style={{ color: '#cbd5e1', marginBottom: 16 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>No jobs found</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Adjust filters or check later.</p>
              {searchApplied && (
                <button onClick={clearSearch} className="btn btn-primary" style={{ marginTop: 16, padding: '10px 24px', fontSize: '0.85rem' }}>
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {filteredJobs.map(job => {
                const typeStyle = JOB_TYPE_COLORS[job.jobType];
                return (
                  <div key={job.id} style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: '24px',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.25s',
                    cursor: 'default',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                    onMouseOver={e => { e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      {/* Company Logo */}
                      <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid #f1f5f9' }}>
                        <Image src={job.companyLogo} alt={job.company} fill style={{ objectFit: 'cover' }} />
                      </div>

                      {/* Job Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mobile-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{job.title}</h3>
                          <span className="mobile-badge-wrap" style={{
                            padding: '3px 10px',
                            borderRadius: 4,
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            background: typeStyle.bg,
                            color: typeStyle.color,
                            flexShrink: 0,
                            marginLeft: 8,
                          }}>
                            {JOB_TYPE_LABELS[job.jobType]}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#e11d48', fontWeight: 600, marginBottom: 10 }}>{job.company}</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.8rem', color: '#64748b', marginBottom: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <DollarSign size={13} /> {formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod)}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={13} /> {job.location}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#94a3b8' }}>
                              <Clock size={11} /> {Math.ceil((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24))}d ago
                            </span>
                          </div>
                          <Link href={job.applyUrl || '#'} style={{
                            padding: '6px 18px',
                            background: 'linear-gradient(135deg, #e11d48, #be123c)',
                            color: 'white',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.2s',
                          }}>
                            APPLY <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {job.tags.length > 0 && (
                      <div style={{ marginTop: 14, padding: '10px 14px', background: 'linear-gradient(90deg, #fff1f2, #fff1f2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e11d48' }}>Tagged as:</span>
                        {job.tags.map((tag, i) => (
                          <span key={i} style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>
                            {tag}{i < job.tags.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── REFERRAL SECTION ─── */}
      <section style={{ padding: '40px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
            {/* Left Box (Image Component) */}
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', height: 480 }}>
              <Image src="/volunteer-help.png" alt="Referral" fill style={{ objectFit: 'cover' }} />
              {/* Floating Badge */}
              <div style={{ position: 'absolute', bottom: 24, left: 24, background: 'white', padding: '12px 24px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <div style={{ background: '#0f172a', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                   <Briefcase size={20} />
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Get Referred Now!</span>
              </div>
            </div>

            {/* Right Box (Text Content) */}
            <div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 20, lineHeight: 1.15 }}>
                Want a <span style={{ color: '#e11d48' }}>Referral?</span> 
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.7, marginBottom: 32 }}>
                Admin matches you with volunteers.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
                {[
                  'Connect with professionals', 'Get direct referrals', 'Expand network', 'Speed up job search'
                ].map((text, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ArrowRight size={16} />
                    </div>
                    <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>{text}</span>
                  </div>
                ))}
              </div>

              <Link href="/portal/auth" className="btn btn-lg" style={{
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                color: 'white',
                border: 'none',
                padding: '16px 36px',
                fontSize: '1rem',
                borderRadius: 14,
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: '0 8px 24px rgba(225,29,72,0.3)',
                textDecoration: 'none'
              }}>
                Request a Referral <ChevronRight size={18} style={{ marginLeft: 6 }} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EMPLOYER / CANDIDATE CTA ─── */}
      <section style={{ padding: 0 }}>
        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* Employer */}
          <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', marginBottom: 12 }}>
              <Building2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginBottom: 6, fontFamily: 'var(--font-display)' }}>I&apos;M AN EMPLOYER</h3>
            <div style={{ width: 30, height: 2, background: '#e11d48', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, maxWidth: 320, marginBottom: 16 }}>
              Post openings and connect.
            </p>
            <Link href="/portal/auth" className="btn" style={{
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: 'white',
              border: 'none',
              padding: '12px 28px',
              fontSize: '0.88rem',
              fontWeight: 700,
            }}>
              POST A JOB
            </Link>
          </div>

          {/* Candidate */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Image src="/hero-community.png" alt="Career" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.85))' }} />
            </div>
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(225,29,72,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185', margin: '0 auto 12px' }}>
                <Briefcase size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'white', marginBottom: 6, fontFamily: 'var(--font-display)' }}>I&apos;M A CANDIDATE</h3>
              <div style={{ width: 30, height: 2, background: '#fb7185', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: 320, marginBottom: 16 }}>
                Create a profile and apply.
              </p>
              <Link href="/portal/auth" className="btn" style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                border: 'none',
                padding: '12px 28px',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}>
                REGISTER CANDIDATE
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
