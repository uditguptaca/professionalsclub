'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { BoardRole } from '@/server/repos/job-board';
import JobFilters, {
  NO_FILTERS, matchesJobFilters, activeFilterCount, type JobFilterState,
} from '@/components/portal/JobFilters';
import { BadgeCheck, Briefcase, Check, ChevronRight } from 'lucide-react';

/**
 * Every open role, in one searchable list.
 *
 * Role-first for the obvious reason: a member looking for work thinks "show me
 * jobs", not "which of these twelve employers should I open first". Browsing by
 * employer stays behind a toggle for someone with a company in mind.
 *
 * WHAT IS DELIBERATELY NOT HERE, after the first version was rightly called
 * cluttered:
 *  - No stacked rows of filter pills. Everything lives behind one Filters
 *    button, so the screen is a search box and then jobs.
 *  - No separate "Suggested for you" list. The default sort already puts the
 *    member's matches on top and each one carries a green line saying why, so a
 *    second list of the same roles was duplication that cost a whole section.
 *
 * Everything filters in the browser: the board is handed the whole open list on
 * purpose, so search and filters are instant instead of a round trip per
 * keystroke against a remote database.
 */

const HAIRLINE_SOFT = '1px solid rgba(27, 67, 50, 0.06)';

const ELLIPSIS: React.CSSProperties = {
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

/** Roles render 20 at a time; the feed is hundreds of rows long. */
const PAGE = 20;

const SORTS = [
  ['match', 'Best match'],
  ['newest', 'Newest'],
  ['title', 'A to Z'],
] as const;

type Sort = typeof SORTS[number][0];

export default function JobBoard({ roles }: { roles: BoardRole[] }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<JobFilterState>({ ...NO_FILTERS });
  const [sort, setSort] = useState<Sort>('match');
  const [hideApplied, setHideApplied] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const matchedCount = useMemo(() => roles.filter((r) => r.matchScore > 0).length, [roles]);
  const appliedCount = useMemo(() => roles.filter((r) => r.applied).length, [roles]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = roles.filter((r) => {
      const matchQ = !q
        || r.title.toLowerCase().includes(q)
        || r.companyName.toLowerCase().includes(q)
        || (r.location ?? '').toLowerCase().includes(q);
      return matchQ
        && matchesJobFilters(r, filters)
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
  }, [roles, search, filters, hideApplied, sort]);

  const paged = visible.slice(0, shown);
  const moreLeft = visible.length - paged.length;
  const narrowed = Boolean(search.trim()) || activeFilterCount(filters) > 0 || hideApplied;

  const clearAll = () => {
    setSearch(''); setFilters({ ...NO_FILTERS }); setHideApplied(false); setShown(PAGE);
  };

  return (
    <>
      {/* One search box, one Filters button. That is the whole control surface. */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <input
          id="jb-board-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }}
          placeholder={`Search ${roles.length} open roles`}
          aria-label="Search open roles"
          style={{
            width: '100%', minHeight: 48, padding: '0 16px',
            border: '1px solid rgba(27, 67, 50, 0.08)', borderRadius: 999,
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            font: 'inherit', fontSize: '1rem', outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <JobFilters
          jobs={roles}
          value={filters}
          onChange={(next) => { setFilters(next); setShown(PAGE); }}
          resultCount={visible.length}
        />

        <label className="sr-only" htmlFor="jb-sort">Sort roles</label>
        <select
          id="jb-sort"
          value={sort}
          onChange={(e) => { setSort(e.target.value as Sort); setShown(PAGE); }}
          style={{
            minHeight: 44, padding: '0 0.7rem', borderRadius: 999,
            border: '1px solid rgba(27,67,50,0.14)', background: 'var(--bg-primary)',
            color: 'var(--text-secondary)', font: 'inherit', fontSize: '0.86rem',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          {SORTS.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {appliedCount > 0 && (
          <button
            type="button"
            onClick={() => { setHideApplied((v) => !v); setShown(PAGE); }}
            aria-pressed={hideApplied}
            style={{
              minHeight: 44, padding: '0 0.9rem', borderRadius: 999,
              border: hideApplied ? '1px solid transparent' : '1px solid rgba(27,67,50,0.14)',
              background: hideApplied ? 'var(--green-950)' : 'var(--bg-primary)',
              color: hideApplied ? '#fff' : 'var(--text-secondary)',
              font: 'inherit', fontSize: '0.86rem', fontWeight: 750, cursor: 'pointer',
            }}
          >
            Hide applied ({appliedCount})
          </button>
        )}
      </div>

      <p aria-live="polite" style={{
        margin: '10px 0 8px 2px', fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)',
      }}>
        {narrowed
          ? `${visible.length} of ${roles.length} roles`
          : sort === 'match' && matchedCount > 0
            ? `${roles.length} roles, your ${matchedCount} best matches first`
            : `${roles.length} roles`}
      </p>

      {visible.length === 0 ? (
        <div className="pp-group-card" style={{ textAlign: 'center', padding: '2.5rem 1.25rem' }}>
          <Briefcase size={26} aria-hidden="true" style={{ opacity: 0.35 }} />
          <p style={{
            margin: '0.8rem auto 0', maxWidth: '22rem', fontSize: '0.9rem',
            lineHeight: 1.6, color: 'var(--text-secondary)',
          }}>
            {narrowed
              ? 'No role matches that.'
              : 'No open roles right now. The employer feeds refresh every morning.'}
          </p>
          {narrowed && (
            <button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={clearAll}>
              Clear search and filters
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="pp-group-card" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {paged.map((r, i) => (
              <li key={r.id} style={{ borderBottom: i === paged.length - 1 ? 0 : HAIRLINE_SOFT }}>
                {/* The whole row opens the role. The external-link shortcut that
                    used to sit on the right is gone: two tap targets per row
                    made a dense list feel busy, and the role screen is one tap
                    away with a proper Apply button on it. */}
                <Link
                  href={`/portal/member/jobs/${r.id}`}
                  className="pp-row"
                  style={{ borderBottom: 0, textDecoration: 'none' }}
                >
                  <span className="pp-row-icon" aria-hidden="true"><Briefcase size={17} /></span>
                  <span className="pp-row-body">
                    <strong>{r.title}</strong>
                    <small style={ELLIPSIS}>
                      {[r.companyName, r.location].filter(Boolean).join(' · ')}
                    </small>
                    {(r.matchReasons.length > 0 || r.applied) && (
                      <small style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2,
                        color: r.applied ? 'var(--text-muted)' : 'var(--success-600)',
                        fontWeight: 750,
                      }}>
                        {r.applied
                          ? <><Check size={12} aria-hidden="true" /> Applied</>
                          : <><BadgeCheck size={12} aria-hidden="true" /> {r.matchReasons[0]}</>}
                      </small>
                    )}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                </Link>
              </li>
            ))}
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
