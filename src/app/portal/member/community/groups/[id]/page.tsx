'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/app-context';
import type { CommunityGroup } from '@/types';
import { COMMUNITY_GROUP_KINDS } from '@/types';
import {
  fetchGroup, joinCommunityGroup, leaveCommunityGroup, fetchGroupMembers, setGroupRole,
} from '@/app/actions/community';
import { followMember, unfollowMember } from '@/app/actions/chat';
import type { GroupMember } from '@/server/repos/community';
import { CommunityFeed } from '@/components/portal/community';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';
import {
  ArrowLeft, Users, Check, Plus, AlertCircle, Newspaper, Info, Clock, UserPlus, UserRoundCheck,
  MapPin, Activity, Sparkles, CalendarDays, Crown, ShieldCheck, Shield,
} from 'lucide-react';

/**
 * One group, the way Facebook Groups, Discord and Meetup taught people to read
 * one: identity at the top with the member count and the join action, then
 * Posts, Members and About one tap apart. Members is the professional club's
 * reason to be here - the people in a group are who you came to meet - so each
 * row opens a profile and carries the follow button.
 */

const initials = (a: string, b: string) => `${a?.[0] ?? ''}${b?.[0] ?? ''}`.toUpperCase() || '?';
const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();
const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

const KIND_ICON = { location: MapPin, activity: Activity, interest: Sparkles } as const;

type Tab = 'posts' | 'members' | 'about';

export default function CommunityGroupPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const { profile } = useApp();
  const confirm = useConfirm();
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [tab, setTab] = useState<Tab>('posts');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchGroup(groupId).then((r) => (r.ok ? setGroup(r.data) : setError(r.error)));
  }, [groupId]);

  const loadMembers = useCallback(async () => {
    const r = await fetchGroupMembers(groupId);
    if (r.ok) setMembers(r.data);
    else setError(r.error);
  }, [groupId]);

  useEffect(() => {
    if (tab === 'members' && members === null) void loadMembers();
  }, [tab, members, loadMembers]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleMembership = async () => {
    if (!group || busy) return;
    if (group.isMember) {
      const ok = await confirm({
        title: `Leave ${group.name}?`,
        message: 'Their posts stop appearing in your feed. You can join again any time.',
        confirmLabel: 'Leave',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusy(true);
    setError('');
    const action = group.isMember ? leaveCommunityGroup : joinCommunityGroup;
    const r = await action(group.id);
    if (r.ok) {
      setGroup((g) => g && ({
        ...g,
        isMember: !g.isMember,
        memberCount: g.memberCount + (g.isMember ? -1 : 1),
        myRole: g.isMember ? null : 'member',
      }));
      setMembers(null); // refetched on the next look
      setToast(group.isMember ? 'Left the group' : `Joined ${group.name}`);
    } else {
      setError(r.error);
    }
    setBusy(false);
  };

  const setFollow = (id: string, outgoing: GroupMember['outgoing']) =>
    setMembers((ms) => (ms ?? []).map((m) => (m.id === id ? { ...m, outgoing } : m)));

  const follow = async (m: GroupMember) => {
    setBusyId(m.id);
    setFollow(m.id, 'pending');
    const r = await followMember(m.id);
    if (r.ok) {
      setFollow(m.id, r.data.status);
      setToast(r.data.status === 'accepted' ? `Following ${m.firstName}` : `Request sent to ${m.firstName}`);
    } else { setFollow(m.id, 'none'); setError(r.error); }
    setBusyId(null);
  };

  const unfollow = async (m: GroupMember) => {
    if (m.outgoing === 'accepted') {
      const ok = await confirm({
        title: `Unfollow ${fullName(m)}?`,
        message: 'Their posts leave your feed. Your chat with them is not affected.',
        confirmLabel: 'Unfollow',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusyId(m.id);
    const prev = m.outgoing;
    setFollow(m.id, 'none');
    const r = await unfollowMember(m.id);
    if (!r.ok) { setFollow(m.id, prev); setError(r.error); }
    setBusyId(null);
  };

  const isClubAdmin = profile?.role === 'admin';
  const moderates = Boolean(group && (isClubAdmin || group.myRole === 'owner' || group.myRole === 'admin'));

  /** A club admin makes someone a moderator, or takes it back. */
  const setRole = async (m: GroupMember, role: 'admin' | 'member') => {
    if (!group) return;
    setBusyId(m.id);
    setError('');
    const r = await setGroupRole({ groupId: group.id, memberId: m.id, role });
    if (r.ok) {
      setMembers((ms) => (ms ?? []).map((x) => (x.id === m.id ? { ...x, role } : x)));
      setToast(role === 'admin' ? `${m.firstName} is now a moderator` : `${m.firstName} is no longer a moderator`);
    } else setError(r.error);
    setBusyId(null);
  };

  const kindLabel = group ? (COMMUNITY_GROUP_KINDS.find((k) => k.key === group.kind)?.label ?? 'Interest') : '';
  const KindIcon = group ? KIND_ICON[group.kind] ?? Sparkles : Sparkles;
  const owner = members?.find((m) => m.role === 'owner') ?? null;

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
                href="/portal/member/community?tab=groups"
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
                <KindIcon size={12} aria-hidden="true" /> {kindLabel} group
              </span>
              <button
                type="button"
                className="pp-chip pp-chip-light"
                onClick={() => setTab('members')}
                style={{ cursor: 'pointer', font: 'inherit', fontSize: '0.72rem', fontWeight: 750 }}
              >
                <Users size={12} aria-hidden="true" /> {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
              </button>
              {group.myRole === 'owner' && (
                <span className="pp-chip pp-chip-light">
                  <Crown size={12} aria-hidden="true" /> You started this group
                </span>
              )}
              {group.myRole === 'admin' && (
                <span className="pp-chip pp-chip-light">
                  <ShieldCheck size={12} aria-hidden="true" /> You moderate this group
                </span>
              )}
              {moderates && (
                <Link href="/portal/member/community/moderate" className="pp-chip pp-chip-light" style={{ textDecoration: 'none' }}>
                  <Shield size={12} aria-hidden="true" /> Moderation queue
                </Link>
              )}
            </div>

            {group.myRole !== 'owner' && (
              <div style={{ marginTop: '0.9rem', display: 'flex', justifyContent: 'center' }}>
                {group.isMember ? (
                  <button type="button" className="cm-btn cm-btn--secondary cm-btn--lg" onClick={toggleMembership} disabled={busy} aria-pressed="true">
                    <Check size={16} aria-hidden="true" /> Joined
                  </button>
                ) : (
                  <button type="button" className="cm-btn cm-btn--lg" onClick={toggleMembership} disabled={busy}
                    style={{ background: 'var(--lime-300)', color: 'var(--green-950)' }}>
                    <Plus size={16} aria-hidden="true" /> {busy ? 'Joining…' : 'Join group'}
                  </button>
                )}
              </div>
            )}
          </header>

          <div className="cm-tabs" role="tablist" aria-label="Group sections">
            <button type="button" role="tab" aria-selected={tab === 'posts'} className={tab === 'posts' ? 'is-on' : ''} onClick={() => setTab('posts')}>
              <Newspaper size={15} aria-hidden="true" /> Posts
            </button>
            <button type="button" role="tab" aria-selected={tab === 'members'} className={tab === 'members' ? 'is-on' : ''} onClick={() => setTab('members')}>
              <Users size={15} aria-hidden="true" /> Members
            </button>
            <button type="button" role="tab" aria-selected={tab === 'about'} className={tab === 'about' ? 'is-on' : ''} onClick={() => setTab('about')}>
              <Info size={15} aria-hidden="true" /> About
            </button>
          </div>

          {tab === 'posts' && (
            <>
              {!group.isMember && (
                <div className="cm-requests" style={{ cursor: 'default' }} role="note">
                  <span className="cm-person-avatar" aria-hidden="true"><Users size={18} /></span>
                  <span className="cm-person-body">
                    <strong>Reading as a visitor</strong>
                    <small>Join the group to post and comment.</small>
                  </span>
                  {group.myRole !== 'owner' && (
                    <button type="button" className="cm-btn cm-btn--primary" onClick={toggleMembership} disabled={busy}>
                      <Plus size={15} aria-hidden="true" /> Join
                    </button>
                  )}
                </div>
              )}
              <CommunityFeed
                groupId={group.id}
                readOnly={!group.isMember}
                moderator={moderates}
                composerPlaceholder={`Post in ${group.name}…`}
              />
            </>
          )}

          {tab === 'members' && (
            members === null ? <PortalLoading label="Loading members" /> : (
              <div className="cm-list">
                {members.map((m) => {
                  const me = m.id === profile?.id;
                  const state = m.outgoing ?? 'none';
                  return (
                    <div key={m.id} className="cm-person">
                      <Link href={me ? '/portal/member/profile' : `/portal/member/people/${m.id}`} className="cm-person-avatar" aria-label={`${fullName(m)}'s profile`}>
                        {initials(m.firstName, m.lastName)}
                      </Link>
                      <Link href={me ? '/portal/member/profile' : `/portal/member/people/${m.id}`} className="cm-person-body" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <strong>
                          {fullName(m)}{me ? ' (you)' : ''}
                          {m.role === 'owner' && <span className="cm-inline-tag"><Crown size={10} aria-hidden="true" /> Started it</span>}
                          {m.role === 'admin' && <span className="cm-inline-tag"><ShieldCheck size={10} aria-hidden="true" /> Moderator</span>}
                        </strong>
                        <small>{[m.jobTitle, m.company, m.city].filter(Boolean).join(' · ') || 'Member'}</small>
                      </Link>
                      {!me && (
                        <div className="cm-person-actions">
                          {isClubAdmin && m.role !== 'owner' && (
                            <button
                              type="button"
                              className="cm-btn cm-btn--secondary cm-btn--icon"
                              aria-label={m.role === 'admin' ? `Remove ${fullName(m)} as moderator` : `Make ${fullName(m)} a moderator`}
                              aria-pressed={m.role === 'admin'}
                              title={m.role === 'admin' ? 'Remove as moderator' : 'Make moderator'}
                              disabled={busyId === m.id}
                              onClick={() => void setRole(m, m.role === 'admin' ? 'member' : 'admin')}
                              style={m.role === 'admin' ? { background: 'var(--green-950)', color: '#fff', borderColor: 'transparent' } : undefined}
                            >
                              <ShieldCheck size={16} aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            className={`cm-btn ${state === 'none' ? 'cm-btn--primary' : 'cm-btn--secondary'}`}
                            aria-pressed={state !== 'none'}
                            disabled={busyId === m.id}
                            onClick={() => (state === 'none' ? follow(m) : unfollow(m))}
                          >
                            {state === 'accepted' ? <UserRoundCheck size={15} aria-hidden="true" />
                              : state === 'pending' ? <Clock size={15} aria-hidden="true" />
                                : <UserPlus size={15} aria-hidden="true" />}
                            {state === 'accepted' ? 'Following' : state === 'pending' ? 'Requested' : 'Follow'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === 'about' && (
            <div className="mp-about">
              <section className="mp-section">
                <h2><Info size={14} aria-hidden="true" /> About this group</h2>
                <div className="cm-list" style={{ padding: '0.9rem 1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {group.description || 'No description yet.'}
                  </p>
                </div>
              </section>
              <section className="mp-section">
                <h2><Sparkles size={14} aria-hidden="true" /> Details</h2>
                <dl className="mp-rows">
                  <div><dt>Kind</dt><dd>{kindLabel} group · {COMMUNITY_GROUP_KINDS.find((k) => k.key === group.kind)?.blurb.toLowerCase()}</dd></div>
                  <div><dt>Members</dt><dd>{group.memberCount}</dd></div>
                  <div><dt>Started</dt><dd><CalendarDays size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{monthYear(group.createdAt)}</dd></div>
                  {owner && <div><dt>Started by</dt><dd><Link href={`/portal/member/people/${owner.id}`} style={{ color: 'var(--text-accent)', fontWeight: 700, textDecoration: 'none' }}>{fullName(owner)}</Link></dd></div>}
                </dl>
              </section>
              <section className="mp-section">
                <h2><Check size={14} aria-hidden="true" /> House rules</h2>
                <div className="cm-list" style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Be kind and specific. Posts are moderated; report anything that does not belong.
                  Members reach each other through chat, and nobody is asked for personal contact details here.
                </div>
              </section>
            </div>
          )}
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
