'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { getPublicVolunteers } from '@/app/actions/public';
import { Search, MapPin, Building2, Users, UserCheck, ShieldCheck, Clock, Languages } from 'lucide-react';

/** Derived from the action so the page never imports the server repository. */
type Volunteer = Awaited<ReturnType<typeof getPublicVolunteers>>[number];

/**
 * The six things the volunteer application actually asks about. Anything not
 * ticked is not claimed on the volunteer's behalf.
 */
type HelpFlag =
  | 'mentorshipInterest'
  | 'referralSupportInterest'
  | 'resumeReviewInterest'
  | 'settlementSupportInterest'
  | 'taxGuidanceInterest'
  | 'immigrationGuidanceInterest';

const HELP_AREAS: { key: HelpFlag; label: string }[] = [
  { key: 'mentorshipInterest', label: 'Mentorship' },
  { key: 'referralSupportInterest', label: 'Job referrals' },
  { key: 'resumeReviewInterest', label: 'Resume review' },
  { key: 'settlementSupportInterest', label: 'Settlement support' },
  { key: 'taxGuidanceInterest', label: 'Tax guidance' },
  { key: 'immigrationGuidanceInterest', label: 'Immigration guidance' },
];

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

/** Same deterministic tonal set the community avatars use - variety, not rainbow. */
const TONES = ['tone-moss', 'tone-clay', 'tone-pine', 'tone-fawn'];
const toneFor = (id: string) => TONES[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % TONES.length];

const CHIP: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: 8,
  background: 'rgba(232,93,4,0.06)',
  border: '1px solid rgba(232,93,4,0.12)',
  color: 'var(--primary-700)',
};

const SELECT: React.CSSProperties = {
  padding: '12px 20px',
  borderRadius: 99,
  border: '1.5px solid var(--border-color)',
  background: 'white',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  cursor: 'pointer',
  outline: 'none',
};

/** Stable identity while loading, so the facet memos do not rerun every render. */
const NO_ROWS: Volunteer[] = [];

/** Distinct, non-empty values for one facet, so a blank dropdown never renders. */
function facet(rows: Volunteer[], pick: (v: Volunteer) => string | null): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const value = pick(row)?.trim();
    if (value) values.add(value);
  }
  return [...values].sort();
}

function VolunteerCard({ vol }: { vol: Volunteer }) {
  const helps = HELP_AREAS.filter((area) => vol[area.key]);
  const expertise = vol.expertiseAreas?.filter(Boolean) ?? [];
  const languages = vol.languages?.filter(Boolean) ?? [];

  return (
    <article
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '24px 22px' }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span className={`community-avatar ${toneFor(vol.id)}`} aria-hidden="true" style={{ width: '3rem', height: '3rem', fontSize: '0.95rem' }}>
          {initials(vol.name)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{vol.name}</div>
          {vol.role && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {vol.role}
              {vol.company && (
                <>
                  {' at '}
                  <span style={{ fontWeight: 700 }}>{vol.company}</span>
                </>
              )}
            </div>
          )}
          {!vol.role && vol.company && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 size={12} /> {vol.company}
            </div>
          )}
        </div>
      </div>

      {/* Every row in this view is an approved application, so the claim holds. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary-700)' }}>
        <ShieldCheck size={13} /> Approved volunteer
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        {(vol.city || vol.province) && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} style={{ color: 'var(--primary-600)' }} />
            {[vol.city, vol.province].filter(Boolean).join(', ')}
          </span>
        )}
        {vol.yearsExperience !== null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} style={{ color: 'var(--primary-600)' }} />
            {vol.yearsExperience} {vol.yearsExperience === 1 ? 'year' : 'years'} experience
          </span>
        )}
        {languages.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Languages size={12} style={{ color: 'var(--primary-600)' }} />
            {languages.join(', ')}
          </span>
        )}
      </div>

      {helps.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Offers help with
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {helps.map((area) => (
              <span key={area.key} style={CHIP}>{area.label}</span>
            ))}
          </div>
        </div>
      )}

      {expertise.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Expertise
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {expertise.map((tag) => (
              <span
                key={tag}
                style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
        <Link
          href={`/volunteers/ask-help?volunteerId=${vol.id}`}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          <UserCheck size={14} /> Ask for help
        </Link>
        {vol.linkedinUrl && (
          <a
            href={vol.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', textDecoration: 'none' }}
            className="hover:text-primary-600"
          >
            View LinkedIn profile
          </a>
        )}
      </div>
    </article>
  );
}

export default function VolunteerDirectoryPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedHelp, setSelectedHelp] = useState('');

  useEffect(() => {
    let alive = true;
    getPublicVolunteers()
      .then((rows) => {
        if (alive) setVolunteers(rows);
      })
      .catch(() => {
        if (alive) {
          setVolunteers([]);
          setLoadError('The directory could not be loaded. Please refresh the page.');
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const rows = volunteers ?? NO_ROWS;
  const cities = useMemo(() => facet(rows, (v) => v.city), [rows]);
  const companies = useMemo(() => facet(rows, (v) => v.company), [rows]);
  const helpOptions = useMemo(
    () => HELP_AREAS.filter((area) => rows.some((v) => v[area.key])),
    [rows]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((v) => {
      const haystack = [v.name, v.role, v.company, v.city, v.province, ...(v.expertiseAreas ?? []), ...(v.languages ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (selectedCity && v.city !== selectedCity) return false;
      if (selectedCompany && v.company !== selectedCompany) return false;
      if (selectedHelp && !v[selectedHelp as HelpFlag]) return false;
      return true;
    });
  }, [rows, search, selectedCity, selectedCompany, selectedHelp]);

  const hasFilters = Boolean(search || selectedCity || selectedCompany || selectedHelp);
  const resetFilters = () => {
    setSearch('');
    setSelectedCity('');
    setSelectedCompany('');
    setSelectedHelp('');
  };

  return (
    <>
      <Navbar />

      <main id="main">

      {/* Hero Section */}
      <section className="volunteers-hero-section" style={{ position: 'relative', paddingTop: 160, paddingBottom: 80, background: 'var(--text-primary)', overflow: 'hidden' }}>
        <div className="cinematic-bg-container">
          <img
            src="/volunteer-help.png"
            alt="Volunteers background"
            className="cinematic-bg"
            style={{ opacity: 0.42 }}
          />
          <div className="cinematic-overlay" />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.12)', padding: '6px 16px', borderRadius: 99, marginBottom: 20, border: '1px solid rgba(232,93,4,0.2)' }}>
            <UserCheck size={14} style={{ color: 'var(--primary-600)' }} />
            <span style={{ color: 'var(--primary-400)', fontWeight: 700, fontSize: '0.82rem' }}>Community Mentors</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.15 }}>
            Volunteer &amp; Mentor <span style={{ color: 'var(--primary-600)' }}>Directory</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Members whose volunteer applications have been approved. Requests are relayed by our
            admin team, so no one&apos;s contact details are published here.
          </p>
        </div>
      </section>

      {/* Directory Content */}
      <section style={{ paddingBottom: 100, background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>

          {/* Filters Bar - only useful once there is something to filter */}
          {rows.length > 0 && (
            <div className="biz-filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '24px 0', borderBottom: '1px solid var(--border-color)', marginBottom: 40 }}>
              <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, role, organization, or skill"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 99, border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              {cities.length > 0 && (
                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} style={SELECT} aria-label="Filter by city">
                  <option value="">All cities</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}

              {companies.length > 0 && (
                <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} style={SELECT} aria-label="Filter by organization">
                  <option value="">All organizations</option>
                  {companies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}

              {helpOptions.length > 0 && (
                <select value={selectedHelp} onChange={(e) => setSelectedHelp(e.target.value)} style={SELECT} aria-label="Filter by type of help">
                  <option value="">Any kind of help</option>
                  {helpOptions.map((area) => <option key={area.key} value={area.key}>{area.label}</option>)}
                </select>
              )}

              {hasFilters && (
                <button
                  onClick={resetFilters}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 99, border: '1.5px solid var(--primary-600)', background: 'rgba(232, 93, 4, 0.05)', color: 'var(--primary-600)', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
                >
                  Reset
                </button>
              )}

              <div className="biz-results-count" style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 'auto' }}>
                {filtered.length} volunteer{filtered.length !== 1 ? 's' : ''} listed
              </div>
            </div>
          )}

          {loadError && (
            <p role="alert" className="community-error" style={{ marginTop: 40, marginBottom: 24 }}>{loadError}</p>
          )}

          {volunteers === null ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, marginTop: 40 }} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton skeleton-card" style={{ height: '17rem' }} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            !loadError && (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <div className="empty-icon"><Users size={24} /></div>
                <h3>No volunteers listed yet</h3>
                <p>
                  Profiles appear here once an admin approves a volunteer application. If you can
                  help newcomers with careers, settlement, taxes or paperwork, apply through the
                  member portal.
                </p>
                <Link href="/portal/auth" className="btn btn-primary">Apply as a volunteer</Link>
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <h3>No volunteers match these filters</h3>
              <p>
                The directory is still small, so a narrow filter can rule everyone out. Clear the
                filters to see all {rows.length} listed volunteer{rows.length !== 1 ? 's' : ''}.
              </p>
              <button onClick={resetFilters} className="btn btn-outline">Clear filters</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, alignItems: 'stretch' }}>
              {filtered.map((vol) => <VolunteerCard key={vol.id} vol={vol} />)}
            </div>
          )}

          {/* The roster is short; asking for more volunteers is the honest CTA. */}
          {rows.length > 0 && (
            <div className="card" style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px' }}>Can you help someone starting over?</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  This directory grows as members volunteer. Applications are reviewed by an admin before they are listed.
                </p>
              </div>
              <Link href="/portal/auth" className="btn btn-outline">Apply as a volunteer</Link>
            </div>
          )}

        </div>
      </section>

      </main>

      <Footer />
    </>
  );
}
