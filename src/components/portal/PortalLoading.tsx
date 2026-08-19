import React from 'react';

/**
 * Full-page loading state for portal screens: skeleton cards, not a spinner.
 *
 * A centred spinner says "wait" without saying what for; a skeleton in the
 * page's own shape sets the layout early, so nothing jumps when data lands.
 * Nine matrimony pages carried the same inline spinner block — this is the
 * one copy that replaces them.
 *
 * The shimmer comes from the existing .community-shimmer keyframes; the global
 * reduced-motion clamp turns it into a static block, which is exactly the
 * right degraded state.
 */
export default function PortalLoading({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Visually hidden text so a screen reader hears what is happening. */}
      <span className="sr-only" role="status">{label}</span>

      <div className="community-shimmer" aria-hidden="true"
           style={{ height: 34, width: '38%', maxWidth: 280, borderRadius: 10 }} />
      <div className="community-shimmer" aria-hidden="true"
           style={{ height: 14, width: '58%', maxWidth: 460, borderRadius: 7 }} />

      <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="community-shimmer" style={{ height: 96, borderRadius: 14 }} />
        ))}
      </div>

      <div className="community-shimmer" aria-hidden="true"
           style={{ height: 220, borderRadius: 14 }} />
    </div>
  );
}
