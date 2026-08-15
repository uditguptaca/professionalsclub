'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CommunityGroup } from '@/types';
import { fetchGroups, startGroup, joinCommunityGroup, leaveCommunityGroup } from '@/app/actions/community';
import { ArrowLeft, Plus, Users, Loader2, Check } from 'lucide-react';

/** Browse, join, leave and create groups. */
export default function CommunityGroupsPage() {
  const [groups, setGroups] = useState<CommunityGroup[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchGroups().then((r) => (r.ok ? setGroups(r.data) : setError(r.error)));
  }, []);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setFormError('');
    const r = await startGroup(form);
    if (r.ok) {
      setGroups((g) => [r.data, ...(g ?? [])]);
      setForm({ name: '', description: '' });
      setCreating(false);
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
    }
  };

  return (
    <div className="community-page">
      <div className="community-page-head">
        <div>
          <Link href="/portal/member/community" className="community-back">
            <ArrowLeft size={15} /> Community feed
          </Link>
          <h1>Groups</h1>
          <p>Smaller rooms inside the club — join the ones that fit your life.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating((v) => !v)}>
          <Plus size={17} /> Start a group
        </button>
      </div>

      {creating && (
        <div className="card community-composer">
          <div className="input-group">
            <label htmlFor="group-name">Group name</label>
            <input
              id="group-name"
              className="input"
              maxLength={80}
              value={form.name}
              placeholder="e.g. Nurses in Ontario, Calgary carpool, French practice"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label htmlFor="group-desc">What is it for?</label>
            <textarea
              id="group-desc"
              className="input"
              rows={2}
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {formError && <p role="alert" className="community-error">{formError}</p>}
          <div className="community-composer-foot">
            <button className="btn btn-quiet" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={create} disabled={busy || form.name.trim().length < 3}>
              {busy ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Create group
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="community-error">{error}</p>}
      {groups === null && !error && <div className="card community-post community-skeleton" aria-hidden="true" />}
      {groups?.length === 0 && (
        <div className="card community-empty">
          <Users size={22} aria-hidden="true" />
          <p>No groups yet — start the first one.</p>
        </div>
      )}

      <div className="community-group-grid">
        {groups?.map((g) => (
          <div key={g.id} className="card community-group-card">
            <Link href={`/portal/member/community/groups/${g.id}`} className="community-group-main">
              <h2>{g.name}</h2>
              {g.description && <p>{g.description}</p>}
              <small><Users size={13} /> {g.memberCount} member{g.memberCount === 1 ? '' : 's'}</small>
            </Link>
            <button
              className={`btn btn-sm ${g.isMember ? 'btn-quiet' : 'btn-primary'}`}
              onClick={() => toggleMembership(g)}
              disabled={g.myRole === 'owner'}
              title={g.myRole === 'owner' ? 'You started this group' : undefined}
            >
              {g.myRole === 'owner' ? <><Check size={14} /> Owner</> : g.isMember ? 'Leave' : 'Join'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
