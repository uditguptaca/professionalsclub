'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { BoardRole } from '@/server/repos/job-board';
import JobFacetRow, { SEG_WRAP, seg } from '@/components/portal/JobFacetRow';
import {
  facetsOf, SENIORITY_LABELS, EMPLOYMENT_LABELS, ARRANGEMENT_LABELS,
  familyLabel, languageLabel, type JobFacets,
} from '@/lib/job-taxonomy';
import {
  BadgeCheck, Briefcase, Check, ExternalLink, Search, Sparkles,
} from 'lucide-react';

/**
 * Every open role, in one searchable list.
 *
 * This is the jobs entry point, and it is role-first for the obvious reason: a
 * member looking for work thinks "show me jobs", not "which of these forty
 * employers should I open first". Browsing by employer still exists behind a
 * toggle for the case where someone has a company in mind.
 *
 * Everything filters in the browser. The board is handed the whole open list
 * (see jobsBoard) precisely so search and the facets are instant - a round trip
 * per keystroke against a remote database is what made the old flow feel slow.
 *
 * Tapping a role opens ONE screen with the two actions on it. That is the whole
 * depth of this feature now: list, role, act.
 */

const HAIRLINE_SOFT = '1px solid rgba(27, 67, 50, 0.06)';

const ELLIPSIS: React.CSSProperties = {
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const SEARCH_WRAP: React.CSSProperties = { position: 'relative', marginBottom: 8 };
const SEARCH_ICON: React.CSSProperties = {
  position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text-muted)', pointerEvents: 'none',
};
const SEARCH_INPUT: React.CSSProperties = {
  width: '100%', minHeight: 48, padding: '0 16px 0 42px',
  border: '1px solid rgba(27, 67, 50, 0.08)', borderRadius: 999,
  background: 'var(--bg-primary)', color: 'var(--text-primary)',
  font: 'inherit', fontSize: '1rem', outline: 'none',
};

/** Roles render 20 at a time; the feed is hundreds of rows long. */
const PAGE = 20;

const relative = (iso: string | null): string | null => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

export default function JobBoard({ roles }: { roles: BoardRole[] }) {
  const [search, setSearch] = useState('');
  const [seniority, setSeniority] = useState('all');
  const [family, setFamily] = useState('all');
  const [employment, setEmployment] = useState('all');
  const [arrangement, setArrangement] = useState('all');
  const [language, setLanguage] = useState('all');
  const [city, setCity] = useState('all');
  const [sort, setSort] = useState<'match' | 'newest' | 'title'>('match');
  const [hideApplied, setHideApplied] = useState(false);
  const [shown, setShown] = useState(PAGE);

  /** Facets per role, computed once from the title rather than per filter. */
  const facets = useMemo(() => {
    const map = new Map<string, JobFacets>();
    for (const r of roles) map.set(r.id, facetsOf(r.title, r.location));
    return map;
  }, [roles]);

  /**
   * City rather than the raw location string: a feed writes "Toronto, ON",
   * "Toronto, Ontario, Canada" and "2 Locations" for the same place, and a
   * filter listing all three is useless. The leading segment is the city.
   */
  const cityOf = (location: string | null): string | null => {
    if (!location) return null;
    const first = location.split(',')[0].trim();
    if (!first || /^\d+\s+locations?$/i.test(first)) return null;
    return first;
  };

  const options = useMemo(() => {
    const tally = (pick: (r: BoardRole, f: JobFacets) => (string | null)[]) => {
      const counts = new Map<string, number>();
      for (const r of roles) {
        const f = facets.get(r.id);
        if (!f) continue;
        for (const v of pick(r, f)) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 14);
    };
    return {
      seniority: tally((_r, f) => [f.seniority]),
      family: tally((_r, f) => f.families),
      employment: tally((_r, f) => [f.employment]),
      arrangement: tally((_r, f) => [f.arrangement]),
      language: tally((_r, f) => f.languages),
      city: tally((r) => [cityOf(r.location)]),
    };
  }, [roles, facets]);

  const matchedCount = useMemo(() => roles.filter((r) => r.matchScore > 0).length, [roles]);
  const appliedCount = useMemo(() => roles.filter((r) => r.applied).length, [roles]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = roles.filter((r) => {
      const f = facets.get(r.id);
      const matchQ = !q
        || r.title.toLowerCase().includes(q)
        || r.companyName.toLowerCase().includes(q)
        || (r.location ?? '').toLowerCase().includes(q);
      return matchQ
        && (seniority === 'all' || f?.seniority === seniority)
        && (family === 'all' || Boolean(f?.families.includes(family as never)))
        && (employment === 'all' || f?.employment === employment)
        && (arrangement === 'all' || f?.arrangement === arrangement)
        && (language === 'all' || Boolean(f?.languages.includes(language)))
        && (city === 'all' || cityOf(r.location) === city)
        && (!hideApplied || !r.applied);
    });
    const byTitle = (a: BoardRole, b: BoardRole) =>
      a.title.localeCompare(b.title) || a.companyName.localeCompare(b.companyName);
    if (sort === 'title') return [...rows].sort(byTitle);
    if (sort === 'newest') {
      return [...rows].sort((a, b) =>
        (b.postedAt ? Date.parse(b.postedAt) : 0) - (a.postedAt ? Date.parse(a.postedAt) : 0)
        || byTitle(a, b));
    }
    // Best match first, then the feed's own order underneath, so the list never
    // LOSES roles just because nothing matched this member.
    return [...rows].sort((a, b) => b.matchScore - a.matchScore || byTitle(a, b));
  }, [roles, facets, search, seniority, family, employment, arrangement, language, city, hideApplied, sort]);

  const paged = visible.slice(0, shown);
  const moreLeft = visible.length - paged.length;

  const filtersOn = Boolean(search.trim()) || seniority !== 'all' || family !== 'all'
    || employment !== 'all' || arrangement !== 'all' || language !== 'all'
    || city !== 'all' || hideApplied;

  const clear = () => {
    setSearch(''); setSeniority('all'); setFamily('all'); setEmployment('all');
    setArrangement('all'); setLanguage('all'); setCity('all'); setHideApplied(false);
    setShown(PAGE);
  };

  const suggested = useMemo(
    () => roles.filter((r) => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4),
    [roles]
  );

  const change = (set: (v: string) => void) => (v: string) => { set(v); setShown(PAGE); };

  /** One role row. The whole row opens the role screen. */
  const row = (r: BoardRole, last: boolean, highlight = false) => (
    <li
      key={r.id}
      style={{
        display: 'flex', alignItems: 'stretch',
        borderBottom: last ? 0 : HAIRLINE_SOFT,
        background: highlight ? 'rgba(45, 122, 79, 0.035)' : undefined,
      }}
    >
      <Link
        href={`/portal/member/jobs/${r.id}`}
        className="pp-row"
        style={{ flex: 1, minWidth: 0, borderBottom: 0, textDecoration: 'none' }}
      >
        <span className="pp-row-icon" aria-hidden="true"><Briefcase size={17} /></span>
        <span className="pp-row-body">
          <strong>{r.title}</strong>
          <small style={ELLIPSIS}>
            {[r.companyName, r.location, relative(r.postedAt)].filter(Boolean).join(' · ')}
          </small>
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 3 }}>
            {r.matchReasons.length > 0 && (
              <small style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: 'var(--success-600)', fontWeight: 750,
              }}>
                <BadgeCheck size={12} aria-hidden="true" /> {r.matchReasons[0]}
              </small>
            )}
            {r.applied && (
              <small style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: 'var(--text-muted)', fontWeight: 750,
              }}>
                <Check size={12} aria-hidden="true" /> Applied
              </small>
            )}
          </span>
        </span>
      </Link>
      <a
        href={r.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open the ${r.title} posting at ${r.companyName}`}
        style={{
          display: 'grid', placeItems: 'center', flexShrink: 0,
          width: 48, color: 'var(--text-muted)', borderLeft: HAIRLINE_SOFT,
        }}
      >
        <ExternalLink size={15} aria-hidden="true" />
      </a>
    </li>
  );

  return (
    <>
      {/* Matched roles first, as a short strip. Not a separate screen: the
          member sees them and the full list in one scroll. */}
      {suggested.length > 0 && !filtersOn && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{
            display: 'flex', alignItems: 'center', gap: 6,
            margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 800,
            letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            <Sparkles size={13} aria-hidden="true" /> Suggested for you
          </h2>
          <ul className="pp-group-card" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {suggested.map((r, i) => row(r, i === suggested.length - 1, true))}
          </ul>
        </section>
      )}

      <div style={SEARCH_WRAP}>
        <Search size={16} aria-hidden="true" style={SEARCH_ICON} />
        <input
          id="jb-board-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }}
          placeholder={`Search ${roles.length} open roles`}
          aria-label="Search open roles"
          style={SEARCH_INPUT}
        />
      </div>

      <JobFacetRow
        label="Level" options={options.seniority} value={seniority}
        onChange={change(setSeniority)} allLabel="Any level"
        labelOf={(k) => SENIORITY_LABELS[k as keyof typeof SENIORITY_LABELS] ?? k}
      />
      <JobFacetRow
        label="Function" options={options.family} value={family}
        onChange={change(setFamily)} allLabel="All functions" labelOf={familyLabel}
      />
      <JobFacetRow
        label="City" options={options.city} value={city}
        onChange={change(setCity)} allLabel="Anywhere" labelOf={(k) => k}
      />
      <JobFacetRow
        label="Type" options={options.employment} value={employment}
        onChange={change(setEmployment)} allLabel="Any type"
        labelOf={(k) => EMPLOYMENT_LABELS[k as keyof typeof EMPLOYMENT_LABELS] ?? k}
      />
      <JobFacetRow
        label="Setting" options={options.arrangement} value={arrangement}
        onChange={change(setArrangement)} allLabel="Any setting"
        labelOf={(k) => ARRANGEMENT_LABELS[k as keyof typeof ARRANGEMENT_LABELS] ?? k}
      />
      <JobFacetRow
        label="Language" options={options.language} value={language}
        onChange={change(setLanguage)} allLabel="Any language" labelOf={languageLabel}
      />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '8px 0 0 2px',
      }}>
        <div style={SEG_WRAP} role="group" aria-label="Sort roles">
          {([
            ['match', matchedCount > 0 ? `Best match (${matchedCount})` : 'Best match'],
            ['newest', 'Newest'],
            ['title', 'A-Z'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              style={seg(sort === key)}
              aria-pressed={sort === key}
              onClick={() => { setSort(key); setShown(PAGE); }}
            >
              {label}
            </button>
          ))}
        </div>
        {appliedCount > 0 && (
          <button
            type="button"
            style={seg(hideApplied)}
            aria-pressed={hideApplied}
            onClick={() => { setHideApplied((v) => !v); setShown(PAGE); }}
          >
            Hide applied ({appliedCount})
          </button>
        )}
        {filtersOn && (
          <button
            type="button"
            onClick={clear}
            style={{
              minHeight: 44, padding: '0 12px', border: 0, background: 'none',
              color: 'var(--text-accent)', font: 'inherit', fontSize: '0.82rem',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <p aria-live="polite" style={{
        margin: '6px 0 8px 2px', fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-muted)',
      }}>
        Showing {paged.length} of {visible.length} roles
        {visible.length !== roles.length ? ` (filtered from ${roles.length})` : ''}
      </p>

      {visible.length === 0 ? (
        <div className="pp-group-card" style={{ textAlign: 'center', padding: '2.5rem 1.25rem' }}>
          <Briefcase size={26} aria-hidden="true" style={{ opacity: 0.35 }} />
          <p style={{ margin: '0.8rem auto 0', maxWidth: '22rem', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {filtersOn
              ? 'No role matches those filters.'
              : 'No open roles right now. The employer feeds refresh every morning.'}
          </p>
          {filtersOn && (
            <button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="pp-group-card" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {paged.map((r, i) => row(r, i === paged.length - 1))}
          </ul>
          {moreLeft > 0 && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={() => setShown((n) => n + PAGE)}
            >
              Show {Math.min(moreLeft, PAGE)} more
            </button>
          )}
        </>
      )}
    </>
  );
}
