'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CommunityGroup } from '@/types';
import { fetchGroups, startGroup, joinCommunityGroup, leaveCommunityGroup } from '@/app/actions/community';
import PortalLoading from '@/components/portal/PortalLoading';
import { ArrowLeft, Plus, Users, Check, ChevronRight, X, AlertCircle } from 'lucide-react';

/**
 * Browse, join, leave and create groups — the profile hub's grammar: grouped
 * summary rows on the page, creation in a focused bottom sheet, one toast for
 * feedback. Membership reads as a toggle because that is what it is.
 */
export default function CommunityGroupsPage() {
  const [groups, setGroups] = useState<CommunityGroup[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchGroups().then((r) => (r.ok ? setGroups(r.data) : setError(r.error)));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // The sheet locks background scroll and closes on Escape, same as elsewhere.
  useEffect(() => {
    if (!creating) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCreating(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [creating]);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setFormError('');
    const r = await startGroup(form);
    if (r.ok) {
      setGroups((g) => [r.data, ...(g ?? [])]);
      setForm({ name: '', description: '' });
      setCreating(false);
      setToast('Group created');
    } else {
      setFormError(r.error);
    }
    setBusy(false);
  };

  const toggleMembership = async (group: CommunityGroup) => {
    const action = group.isMember ? leaveCommunityGroup : joinCommunityGroup;
    const r = await action(group.id);
    if (r.ok) {
      setGroups((gs) =>
        (gs ?? []).map((g) =>
          g.id === group.id
            ? {
                ...g,
                isMember: !g.isMember,
                memberCount: g.memberCount + (g.isMember ? -1 : 1),
                myRole: g.isMember ? null : 'member',
              }
            : g
        )
      );
      setToast(group.isMember ? 'Left the group' : 'Joined the group');
    } else {
      setError(r.error);
    }
  };

  const mine = useMemo(() => (groups ?? []).filter((g) => g.isMember), [groups]);
  const discover = useMemo(() => (groups ?? []).filter((g) => !g.isMember), [groups]);

  /** One group row: badge, name, member count, and the membership toggle. */
  const groupRow = (g: CommunityGroup) => (
    <div key={g.id} className="pp-row" style={{ gap: 0 }}>
      <Link
        href={`/portal/member/community/groups/${g.id}`}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.8rem',
          flex: 1, minWidth: 0, padding: '0.3rem 0.8rem 0.3rem 0',
          textDecoration: 'none', color: 'inherit',
        }}
      >
        <span className="pp-row-icon" style={{ fontSize: '0.78rem', fontWeight: 800 }} aria-hidden="true">
          {g.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="pp-row-body">
          <strong>{g.name}</strong>
          <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
            {g.description ? ` · ${g.description}` : ''}
          </small>
        </span>
      </Link>
      {g.myRole === 'owner' ? (
        <span className="hf-joined" style={{ marginTop: 0, flexShrink: 0 }}>
          <Check size={13} aria-hidden="true" /> Owner
        </span>
      ) : (
        <button
          type="button"
          className={`pp-toggle ${g.isMember ? 'is-on' : ''}`}
          style={{ minHeight: 44 }}
          onClick={() => toggleMembership(g)}
          aria-pressed={g.isMember}
          aria-label={`${g.isMember ? 'Leave' : 'Join'} ${g.name}`}
        >
          <span className="pp-toggle-dot" aria-hidden="true" />
          {g.isMember ? 'Joined' : 'Join'}
        </button>
      )}
    </div>
  );

  const addRow = (
    <button type="button" className="pp-row pp-row-add" onClick={() => setCreating(true)}>
      <span className="pp-row-icon"><Plus size={17} aria-hidden="true" /></span>
      <span className="pp-row-body"><strong>Start a group</strong></span>
      <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
    </button>
  );

  const discoverHeading = discover.length === 0 ? 'Start something' : mine.length > 0 ? 'Discover' : 'All groups';

  return (
    <div className="pp2">
      <div style={{ marginBottom: '1.2rem' }}>
        <Link href="/portal/member/community" className="community-back">
          <ArrowLeft size={15} aria-hidden="true" /> Community feed
        </Link>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 0.25rem' }}>
          Groups
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Smaller rooms inside the club - join the ones that fit your life.
        </p>
      </div>

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {groups === null && !error && <PortalLoading label="Loading groups" />}

      {groups?.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Users size={28} style={{ opacity: 0.35 }} aria-hidden="true" />
          <p style={{ margin: '0.7rem 0 1.1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            No groups yet. Start the first one.
          </p>
          <button
            type="button"
            className="pp-sheet-save"
            style={{ padding: '0 1.5rem' }}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} aria-hidden="true" /> Start a group
          </button>
        </div>
      )}

      {groups && groups.length > 0 && (
        <div className="pp-groups">
          {mine.length > 0 && (
            <section className="pp-group">
              <h2>Your groups</h2>
              <div className="pp-group-card">{mine.map(groupRow)}</div>
            </section>
          )}

          <section className="pp-group">
            <h2>{discoverHeading}</h2>
            {discover.length > 0 && (
              <p className="pp-group-sub">
                Join a group and its posts start appearing in your community feed.
              </p>
            )}
            <div className="pp-group-card">
              {discover.map(groupRow)}
              {addRow}
            </div>
          </section>
        </div>
      )}

      {/* ---- Start a group ---- */}
      {creating && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setCreating(false); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Start a group">
            <div className="hf-sheet-head">
              <h2>Start a group</h2>
              <button type="button" className="portal-sheet-close" onClick={() => setCreating(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">
              Give it a name members will recognise, and a line on what it is for.
            </p>

            <div className="pp-sheet-fields">
              <div className="pp-field">
                <label htmlFor="group-name">Group name</label>
                <input
                  id="group-name"
                  maxLength={80}
                  value={form.name}
                  placeholder="e.g. Nurses in Ontario, Calgary carpool"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="pp-field">
                <label htmlFor="group-desc">What is it for?</label>
                <textarea
                  id="group-desc"
                  rows={3}
                  maxLength={500}
                  value={form.description}
                  placeholder="One or two lines so members know what to expect."
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {formError && (
              <div role="alert" className="community-error" style={{ marginTop: 4 }}>
                <AlertCircle size={15} aria-hidden="true" /> {formError}
              </div>
            )}

            <button
              type="button"
              className="pp-sheet-save"
              onClick={create}
              disabled={busy || form.name.trim().length < 3}
            >
              {busy ? 'Creating…' : <><Plus size={16} aria-hidden="true" /> Create group</>}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
