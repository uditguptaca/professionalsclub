'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listFollowRequests, acceptFollowRequest, declineFollowRequest, unfollowMember,
} from '@/app/actions/chat';
import type { ChatPerson } from '@/server/repos/chat';
import PortalLoading from '@/components/portal/PortalLoading';
import { AlertCircle, Check, Clock, UserRoundCheck, X } from 'lucide-react';

/**
 * Follow requests: who wants in, and whose door you are waiting at.
 *
 * Accepting opens your profile and posts to that person; declining removes the
 * request and its notification without telling them. Your own pending requests
 * sit below, each with a way to withdraw.
 */

const initials = (a: string, b: string) => `${a?.[0] ?? ''}${b?.[0] ?? ''}`.toUpperCase() || '?';
const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();
const byline = (p: ChatPerson) => [p.jobTitle, p.company, p.city].filter(Boolean).join(' · ') || 'Member';

export default function FollowRequestsPage() {
  const [incoming, setIncoming] = useState<ChatPerson[] | null>(null);
  const [outgoing, setOutgoing] = useState<ChatPerson[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const r = await listFollowRequests();
    if (r.ok) { setIncoming(r.data.incoming); setOutgoing(r.data.outgoing); setError(''); }
    else { setIncoming([]); setError(r.error); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const act = async (id: string, fn: () => Promise<{ ok: boolean; error?: string }>, done: string, remove: 'in' | 'out') => {
    setBusyId(id);
    setError('');
    const r = await fn();
    if (r.ok) {
      if (remove === 'in') setIncoming((l) => (l ?? []).filter((p) => p.id !== id));
      else setOutgoing((l) => l.filter((p) => p.id !== id));
      setToast(done);
    } else setError(r.error ?? 'That did not go through.');
    setBusyId(null);
  };

  if (incoming === null) return <PortalLoading label="Loading requests" />;

  return (
    <div className="mp">
      <header className="cm-screen-head">
        <h1>Follow requests</h1>
        <p>People who asked to see your profile and posts. Accepting opens both to them.</p>
      </header>

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {incoming.length === 0 ? (
        <div className="cm-empty">
          <UserRoundCheck size={24} aria-hidden="true" />
          <p><strong>No requests waiting.</strong></p>
          <p>When someone asks to follow you, they appear here and in your notifications.</p>
        </div>
      ) : (
        <div className="cm-list">
          {incoming.map((p) => (
            <div key={p.id} className="cm-person">
              <Link href={`/portal/member/people/${p.id}`} className="cm-person-avatar" aria-label={`${fullName(p)}'s profile`}>
                {initials(p.firstName, p.lastName)}
              </Link>
              <Link href={`/portal/member/people/${p.id}`} className="cm-person-body" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{fullName(p)}</strong>
                <small>{byline(p)}</small>
              </Link>
              <div className="cm-person-actions">
                <button
                  type="button" className="cm-btn cm-btn--primary" disabled={busyId === p.id}
                  onClick={() => void act(p.id, () => acceptFollowRequest(p.id), `${p.firstName} can now see your profile`, 'in')}
                >
                  <Check size={15} aria-hidden="true" /> Accept
                </button>
                <button
                  type="button" className="cm-btn cm-btn--secondary cm-btn--icon" disabled={busyId === p.id}
                  aria-label={`Decline ${fullName(p)}`}
                  onClick={() => void act(p.id, () => declineFollowRequest(p.id), 'Request declined', 'in')}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <section className="mp-section" style={{ marginTop: '1.5rem' }}>
          <h2><Clock size={14} aria-hidden="true" /> Sent by you</h2>
          <div className="cm-list">
            {outgoing.map((p) => (
              <div key={p.id} className="cm-person">
                <Link href={`/portal/member/people/${p.id}`} className="cm-person-avatar" aria-label={`${fullName(p)}'s profile`}>
                  {initials(p.firstName, p.lastName)}
                </Link>
                <Link href={`/portal/member/people/${p.id}`} className="cm-person-body" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <strong>{fullName(p)}</strong>
                  <small>{byline(p)}</small>
                </Link>
                <button
                  type="button" className="cm-btn cm-btn--secondary" disabled={busyId === p.id}
                  onClick={() => void act(p.id, () => unfollowMember(p.id), 'Request withdrawn', 'out')}
                >
                  <Clock size={15} aria-hidden="true" /> Requested
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {toast && <div className="pp-toast" role="status"><Check size={15} aria-hidden="true" /> {toast}</div>}
    </div>
  );
}
