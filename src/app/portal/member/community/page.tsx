'use client';
import Link from 'next/link';
import { CommunityFeed, CommunityAside } from '@/components/portal/community';
import { ChevronRight } from 'lucide-react';

/**
 * Community home: the feed column (club-wide posts plus the member's groups)
 * with a sticky sidebar of groups on wide screens. The head follows the home
 * feed's section grammar — title on the left, one quiet link on the right.
 */
export default function CommunityPage() {
  return (
    <div className="community-layout">
      <div className="hf-section">
        <div className="hf-section-head">
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>
            Community
          </h1>
          <Link
            href="/portal/member/community/groups"
            style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
          >
            All groups <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          What members across the club are talking about.
        </p>
        <CommunityFeed showRail composerPlaceholder="Share something with the club…" />
      </div>
      <CommunityAside />
    </div>
  );
}
