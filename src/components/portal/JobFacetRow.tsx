'use client';
import React from 'react';

/**
 * One row of job filter pills, with counts.
 *
 * Shared by the role board and by an employer's own role list so the two can
 * never drift apart. The rule that matters is at the top of the component:
 * a row with fewer than two values renders NOTHING. Every role at a company
 * being "Permanent" makes a Type filter a control that cannot change anything,
 * and an option reading "Hybrid (0)" reads as a broken filter rather than an
 * honest absence.
 */

const HAIRLINE = '1px solid rgba(27, 67, 50, 0.08)';

/** Segmented pill group - the filter language across the portal. */
export const SEG_WRAP: React.CSSProperties = {
  display: 'flex', gap: 4, padding: 4,
  background: 'var(--bg-primary)', borderRadius: 999, border: HAIRLINE,
  width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
};

export const seg = (active: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '0 16px', border: 0, borderRadius: 999,
  font: 'inherit', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer',
  ...(active
    ? { background: 'var(--green-950)', color: '#fff', fontWeight: 700 }
    : { background: 'none', color: 'var(--text-secondary)', fontWeight: 600 }),
});

export default function JobFacetRow({
  label, options, value, onChange, labelOf, allLabel,
}: {
  label: string;
  /** [value, count], already ordered by the caller. */
  options: [string, number][];
  value: string;
  onChange: (v: string) => void;
  labelOf: (key: string) => string;
  allLabel: string;
}) {
  if (options.length < 2) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{
        flexShrink: 0, width: '4.4rem', fontSize: '0.72rem', fontWeight: 800,
        letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>
        {label}
      </span>
      <div
        style={{ ...SEG_WRAP, minWidth: 0 }}
        role="group"
        aria-label={`Filter roles by ${label.toLowerCase()}`}
      >
        <button
          type="button"
          style={seg(value === 'all')}
          aria-pressed={value === 'all'}
          onClick={() => onChange('all')}
        >
          {allLabel}
        </button>
        {options.map(([key, count]) => (
          <button
            key={key}
            type="button"
            style={seg(value === key)}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
          >
            {labelOf(key)} ({count})
          </button>
        ))}
      </div>
    </div>
  );
}
