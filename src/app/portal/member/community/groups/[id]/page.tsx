'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { CommunityGroup } from '@/types';
import { fetchGroup, joinCommunityGroup, leaveCommunityGroup } from '@/app/actions/community';
import { CommunityFeed } from '@/components/portal/community';
import PortalLoading from '@/components/portal/PortalLoading';
import { ArrowLeft, Users, Check, Plus, AlertCircle } from 'lucide-react';

/**
 * One group: a dark identity hero (badge, name, blurb, member count and the
 * join action) then the group's own feed. Visitors get one quiet line telling
 * them why they cannot post.
 */
export default function CommunityGroupPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchGroup(groupId).then((r) => (r.ok ? setGroup(r.data) : setError(r.error)));
  }, [groupId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

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
      setToast(group.isMember ? 'Left the group' : 'Joined the group');
    } else {
      setError(r.error);
    }
  };

  return (
    <div className="pp2">
      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {!group && !error && <PortalLoading label="Loading this group" />}

      {group && (
        <>
          <header className="pp-hero">
            <div style={{ textAlign: 'left' }}>
              <Link
                href="/portal/member/community/groups"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  minHeight: 44, fontSize: '0.82rem', fontWeight: 700,
                  color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
                }}
              >
                <ArrowLeft size={15} aria-hidden="true" /> All groups
              </Link>
            </div>

            <span className="hf-avatar" style={{ margin: '0 auto 0.5rem' }} aria-hidden="true">
              {group.name.slice(0, 2).toUpperCase()}
            </span>
            <h1>{group.name}</h1>
            {group.description && <p>{group.description}</p>}

            <div className="pp-hero-chips">
              <span className="pp-chip pp-chip-light">
                <Users size={12} aria-hidden="true" /> {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
              </span>
              {group.myRole === 'owner' && (
                <span className="pp-chip pp-chip-light">
                  <Check size={12} aria-hidden="true" /> You started this group
                </span>
              )}
              {group.myRole !== 'owner' && group.isMember && (
                <span className="pp-chip pp-chip-light">
                  <Check size={12} aria-hidden="true" /> Joined
                </span>
              )}
            </div>

            {group.myRole !== 'owner' && (
              group.isMember ? (
                <button type="button" className="hf-city-pill" style={{ minHeight: 44 }} onClick={toggleMembership}>
                  Leave group
                </button>
              ) : (
                <button
                  type="button"
                  className="pp-sheet-save"
                  style={{ marginTop: '0.9rem', padding: '0 1.5rem' }}
                  onClick={toggleMembership}
                >
                  <Plus size={16} aria-hidden="true" /> Join group
                </button>
              )
            )}
          </header>

          {!group.isMember && (
            <div className="pp-group-card" style={{ marginBottom: '1.1rem' }}>
              <div className="pp-row pp-row-static">
                <span className="pp-row-icon"><Users size={17} aria-hidden="true" /></span>
                <span className="pp-row-body">
                  <strong>Reading as a visitor</strong>
                  <small>Join the group to post and comment.</small>
                </span>
              </div>
            </div>
          )}

          <CommunityFeed
            groupId={group.id}
            readOnly={!group.isMember}
            composerPlaceholder={`Post in ${group.name}…`}
          />
        </>
      )}

      {toast && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
