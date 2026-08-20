'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import PortalLoading from '@/components/portal/PortalLoading';
import { MessageSquare, MailOpen, Mail, ChevronRight, Check } from 'lucide-react';
import Link from 'next/link';

/**
 * Admin messages, one row per case thread. Unread threads sit in their own
 * group with an orange row icon and an unread chip; everything else reads as
 * quiet history. Tapping a row opens the case.
 */

/** Explicit locale + fields: a bare toLocaleDateString drifts between server
 *  and client and re-triggered the hydration mismatch. */
const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

const CHIP: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  color: 'var(--text-muted)',
  border: '1px solid rgba(27,67,50,0.08)',
};

export default function MemberMessagesPage() {
  const { messages, helpRequests, loading } = usePortal();
  const { currentUserId } = useApp();

  // Messages visible to the current member
  const myMessages = messages.filter(m =>
    m.visibilityScope === 'member_only' || m.senderUserId === currentUserId
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group by case
  const caseGroups = myMessages.reduce<Record<string, typeof myMessages>>((acc, msg) => {
    if (!acc[msg.caseId]) acc[msg.caseId] = [];
    acc[msg.caseId].push(msg);
    return acc;
  }, {});

  const threads = Object.entries(caseGroups).map(([caseId, msgs]) => ({
    caseId,
    msgs,
    latest: msgs[0],
    unread: msgs.filter(m => !m.read && m.senderRole === 'admin').length,
    reference: helpRequests.find(r => r.id === caseId)?.reference,
  }));

  const unreadThreads = threads.filter(t => t.unread > 0);
  const readThreads = threads.filter(t => t.unread === 0);

  const row = (t: (typeof threads)[number]) => (
    <Link key={t.caseId} href={`/portal/member/my-requests/${t.caseId}`} className="pp-row">
      <span
        className="pp-row-icon"
        style={t.unread > 0 ? { background: 'rgba(232,93,4,0.09)', color: 'var(--primary-700)' } : undefined}
      >
        {t.unread > 0 ? <MailOpen size={17} /> : <MessageSquare size={17} />}
      </span>
      <span className="pp-row-body">
        <small>{[t.reference, shortDate(t.latest.createdAt)].filter(Boolean).join(' · ')}</small>
        <strong>{t.latest.caseTitle}</strong>
        <span
          style={{
            display: 'block', marginTop: 2, fontSize: '0.82rem', color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {t.latest.senderName}: {t.latest.body}
        </span>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {t.unread > 0
            ? <span className="hf-deal" style={{ marginTop: 0 }}>{t.unread} unread</span>
            : <span className="pp-chip" style={CHIP}><Check size={11} aria-hidden="true" /> Read</span>}
          <span className="pp-chip" style={CHIP}>
            {t.msgs.length} message{t.msgs.length !== 1 ? 's' : ''}
          </span>
        </span>
      </span>
      <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
    </Link>
  );

  // No hooks in this component, so the guard can sit here. Without it the first
  // paint claims "no messages yet" before the snapshot has landed.
  if (loading && messages.length === 0) return <PortalLoading label="Loading your messages" />;

  return (
    <div className="pp2">
      <header style={{ marginBottom: '1.3rem' }}>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>Messages</h1>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          Everything the admin team has sent you, grouped by case.
        </p>
      </header>

      {threads.length === 0 ? (
        <div className="card" style={{ padding: '2.25rem 1.25rem', textAlign: 'center' }}>
          <Mail size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
          <p style={{ margin: '0.7rem 0 1rem', color: 'var(--text-secondary)' }}>
            No messages yet. Admin writes here as soon as one of your requests moves.
          </p>
          <Link href="/portal/member/my-requests" className="btn btn-outline">
            See your requests
          </Link>
        </div>
      ) : (
        <div className="pp-groups">
          {unreadThreads.length > 0 && (
            <section className="pp-group">
              <h2>Unread</h2>
              <div className="pp-group-card">{unreadThreads.map(row)}</div>
            </section>
          )}

          {readThreads.length > 0 && (
            <section className="pp-group">
              <h2>{unreadThreads.length > 0 ? 'Earlier' : 'All threads'}</h2>
              <div className="pp-group-card">{readThreads.map(row)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
