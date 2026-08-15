'use client';
import Link from 'next/link';
import { CommunityFeed, CommunityAside } from '@/components/portal/community';
import { UsersRound } from 'lucide-react';

/**
 * Community home: the feed column (club-wide posts plus the member's groups)
 * with a sticky sidebar of groups on wide screens.
 */
export default function CommunityPage() {
  return (
    <div>
      <div className="community-page-head" style={{ maxWidth: '40rem' }}>
        <div>
          <h1>Community</h1>
          <p>What members across the club are talking about.</p>
        </div>
        <Link href="/portal/member/community/groups" className="btn btn-outline btn-sm">
          <UsersRound size={16} /> Groups
        </Link>
      </div>

      <div className="community-layout">
        <CommunityFeed showRail composerPlaceholder="Share something with the club…" />
        <CommunityAside />
      </div>
    </div>
  );
}
