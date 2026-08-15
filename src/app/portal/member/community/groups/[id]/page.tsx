'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { CommunityGroup } from '@/types';
import { fetchGroup, joinCommunityGroup, leaveCommunityGroup } from '@/app/actions/community';
import { CommunityFeed } from '@/components/portal/community';
import { ArrowLeft, Users, Check } from 'lucide-react';

/** One group: header with join/leave, then the group's own feed. */
export default function CommunityGroupPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroup(groupId).then((r) => (r.ok ? setGroup(r.data) : setError(r.error)));
  }, [groupId]);

  const toggleMembership = async () => {
    if (!group) return;
    const action = group.isMember ? leaveCommunityGroup : joinCommunityGroup;
    const r = await action(group.id);
    if (r.ok) {
      setGroup((g) =>
        g
          ? {
              ...g,
              isMember: !g.isMember,
              memberCount: g.memberCount + (g.isMember ? -1 : 1),
              myRole: g.isMember ? null : 'member',
            }
          : g
      );
    }
  };

  return (
    <div className="community-page">
      <div className="community-page-head">
        <div>
          <Link href="/portal/member/community/groups" className="community-back">
            <ArrowLeft size={15} /> All groups
          </Link>
          <h1>{group?.name ?? 'Loading…'}</h1>
          {group?.description && <p>{group.description}</p>}
          {group && (
            <small className="community-muted">
              <Users size={13} /> {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
            </small>
          )}
        </div>
        {group && (
          <button
            className={`btn ${group.isMember ? 'btn-quiet' : 'btn-primary'}`}
            onClick={toggleMembership}
            disabled={group.myRole === 'owner'}
            title={group.myRole === 'owner' ? 'You started this group' : undefined}
          >
            {group.myRole === 'owner' ? <><Check size={15} /> Owner</> : group.isMember ? 'Leave group' : 'Join group'}
          </button>
        )}
      </div>

      {error && <p role="alert" className="community-error">{error}</p>}

      {group && (
        <>
          {!group.isMember && (
            <div className="card community-empty community-join-hint">
              <Users size={20} aria-hidden="true" />
              <p>You are reading as a visitor — join the group to post.</p>
            </div>
          )}
          <CommunityFeed
            groupId={group.id}
            readOnly={!group.isMember}
            composerPlaceholder={`Post in ${group.name}…`}
          />
        </>
      )}
    </div>
  );
}
