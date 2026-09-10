'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { facetsOf, SENIORITY_LABELS, EMPLOYMENT_LABELS, ARRANGEMENT_LABELS, familyLabel, languageLabel } from '@/lib/job-taxonomy';
import { SlidersHorizontal, X } from 'lucide-react';

/**
 * All the job filters behind ONE button.
 *
 * The first version put every facet on screen at once: six rows of pills, each
 * scrolling sideways, stacked above the search box. That pushed the first
 * actual job below the fold and made a filter feel like a form to fill in
 * before you were allowed to look at anything. It reads as clutter because it
 * IS clutter - eight control rows to reach a list.
 *
 * So: one "Filters" button carrying a count, the choices in a sheet where they
 * can WRAP (you see every option at once instead of discovering it by
 * scrolling sideways), and the ones you picked as removable chips underneath.
 * A member who wants none of this now sees a search box and jobs.
 *
 * Shared by the board and by one employer's role list so the two cannot drift.
 */

export interface JobFilterState {
  seniority: string;
  family: string;
  employment: string;
  arrangement: string;
  language: string;
  city: string;
}

export const NO_FILTERS: JobFilterState = {
  seniority: 'all', family: 'all', employment: 'all',
  arrangement: 'all', language: 'all', city: 'all',
};

/** Minimum a role needs for the filters to read it. */
export interface FilterableJob {
  id: string;
  title: string;
  location: string | null;
}

/**
 * The city, not the raw location. A feed writes "Toronto, ON", "Toronto,
 * Ontario, Canada" and "2 Locations" for the same place, and a filter offering
 * all three is worse than no filter.
 */
export function cityOf(location: string | null): string | null {
  if (!location) return null;
  const first = location.split(',')[0].trim();
  if (!first || /^\d+\s+locations?$/i.test(first)) return null;
  return first;
}

export function activeFilterCount(state: JobFilterState): number {
  return Object.values(state).filter((v) => v !== 'all').length;
}

/** One predicate, so every screen filters identically. */
export function matchesJobFilters(job: FilterableJob, state: JobFilterState): boolean {
  const f = facetsOf(job.title, job.location);
  return (state.seniority === 'all' || f.seniority === state.seniority)
    && (state.family === 'all' || f.families.includes(state.family as never))
    && (state.employment === 'all' || f.employment === state.employment)
    && (state.arrangement === 'all' || f.arrangement === state.arrangement)
    && (state.language === 'all' || f.languages.includes(state.language))
    && (state.city === 'all' || cityOf(job.location) === state.city);
}

type GroupKey = keyof JobFilterState;

const GROUPS: { key: GroupKey; label: string; labelOf: (k: string) => string }[] = [
  { key: 'seniority', label: 'Level', labelOf: (k) => SENIORITY_LABELS[k as keyof typeof SENIORITY_LABELS] ?? k },
  { key: 'family', label: 'Function', labelOf: familyLabel },
  { key: 'city', label: 'City', labelOf: (k) => k },
  { key: 'employment', label: 'Type', labelOf: (k) => EMPLOYMENT_LABELS[k as keyof typeof EMPLOYMENT_LABELS] ?? k },
  { key: 'arrangement', label: 'Setting', labelOf: (k) => ARRANGEMENT_LABELS[k as keyof typeof ARRANGEMENT_LABELS] ?? k },
  { key: 'language', label: 'Language', labelOf: languageLabel },
];

/** Wrapping chip, used for every option in the sheet. */
const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 40, padding: '0 0.8rem', borderRadius: 999,
  border: on ? '1px solid transparent' : '1px solid rgba(27,67,50,0.14)',
  background: on ? 'var(--green-950)' : 'var(--bg-primary)',
  color: on ? '#fff' : 'var(--text-secondary)',
  font: 'inherit', fontSize: '0.82rem', fontWeight: on ? 750 : 600,
  cursor: 'pointer',
});

export default function JobFilters({
  jobs, value, onChange, resultCount,
}: {
  /** Everything filterable, for the option lists and their counts. */
  jobs: FilterableJob[];
  value: JobFilterState;
  onChange: (next: JobFilterState) => void;
  /** How many rows the current filters leave, shown on the confirm button. */
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);

  // A sheet locks the page behind it and closes on Escape, like every other
  // sheet in the portal.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /**
   * Options and counts per group. Only values PRESENT in the data appear, so a
   * filter never offers something that would return nothing.
   */
  const options = useMemo(() => {
    const out = {} as Record<GroupKey, [string, number][]>;
    const tally = (pick: (j: FilterableJob) => (string | null)[]) => {
      const counts = new Map<string, number>();
      for (const j of jobs) {
        for (const v of pick(j)) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 12);
    };
    out.seniority = tally((j) => [facetsOf(j.title, j.location).seniority]);
    out.family = tally((j) => facetsOf(j.title, j.location).families);
    out.city = tally((j) => [cityOf(j.location)]);
    out.employment = tally((j) => [facetsOf(j.title, j.location).employment]);
    out.arrangement = tally((j) => [facetsOf(j.title, j.location).arrangement]);
    out.language = tally((j) => facetsOf(j.title, j.location).languages);
    return out;
  }, [jobs]);

  const active = activeFilterCount(value);
  const set = (key: GroupKey, v: string) =>
    onChange({ ...value, [key]: value[key] === v ? 'all' : v });

  /** Groups worth showing: a single option cannot change anything. */
  const groups = GROUPS.filter((g) => (options[g.key] ?? []).length > 1);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          minHeight: 44, padding: '0 0.95rem', borderRadius: 999,
          border: active > 0 ? '1px solid transparent' : '1px solid rgba(27,67,50,0.14)',
          background: active > 0 ? 'var(--green-950)' : 'var(--bg-primary)',
          color: active > 0 ? '#fff' : 'var(--text-secondary)',
          font: 'inherit', fontSize: '0.86rem', fontWeight: 750, cursor: 'pointer',
        }}
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        Filters{active > 0 ? ` (${active})` : ''}
      </button>

      {/* What you picked, removable one at a time. Without this the only way to
          see an active filter was to reopen the sheet. */}
      {active > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {GROUPS.filter((g) => value[g.key] !== 'all').map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onChange({ ...value, [g.key]: 'all' })}
              aria-label={`Remove the ${g.label.toLowerCase()} filter`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                minHeight: 34, padding: '0 0.5rem 0 0.7rem', borderRadius: 999,
                border: '1px solid rgba(27,67,50,0.14)', background: 'var(--green-50)',
                color: 'var(--green-800)', font: 'inherit', fontSize: '0.78rem',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              {g.labelOf(value[g.key])}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...NO_FILTERS })}
            style={{
              minHeight: 34, padding: '0 0.6rem', border: 0, background: 'none',
              color: 'var(--text-accent)', font: 'inherit', fontSize: '0.78rem',
              fontWeight: 750, cursor: 'pointer',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {open && (
        <div
          className="hf-sheet-scrim"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="hf-sheet" role="dialog" aria-modal="true" aria-label="Filter roles">
            <div className="hf-sheet-head">
              <h2>Filters</h2>
              <button
                type="button"
                className="portal-sheet-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {groups.length === 0 ? (
              <p className="hf-sheet-sub">
                These roles are too similar to filter usefully. Search by title instead.
              </p>
            ) : (
              groups.map((g) => (
                <section key={g.key} style={{ marginTop: '0.9rem' }}>
                  <h3 style={{
                    margin: '0 0 0.45rem', fontSize: '0.72rem', fontWeight: 800,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}>
                    {g.label}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(options[g.key] ?? []).map(([key, count]) => (
                      <button
                        key={key}
                        type="button"
                        style={chip(value[g.key] === key)}
                        aria-pressed={value[g.key] === key}
                        onClick={() => set(g.key, key)}
                      >
                        {g.labelOf(key)} ({count})
                      </button>
                    ))}
                  </div>
                </section>
              ))
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: '1.2rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => onChange({ ...NO_FILTERS })}
                disabled={active === 0}
                style={{ minHeight: 48 }}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setOpen(false)}
                style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
              >
                Show {resultCount} {resultCount === 1 ? 'role' : 'roles'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
