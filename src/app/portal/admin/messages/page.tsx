'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { MessageSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminMessagesPage() {
  const { messages, helpRequests, markMessageRead } = usePortal();
  const [busyCase, setBusyCase] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Group by case
  const caseGroups = messages.reduce<Record<string, typeof messages>>((acc, msg) => {
    if (!acc[msg.caseId]) acc[msg.caseId] = [];
    acc[msg.caseId].push(msg);
    return acc;
  }, {});

  /**
   * Nothing in the admin portal marked a message read, so the unread badges only
   * ever grew. Marking is bound to a click and never to mount: a thread the
   * admin has not acted on has not been read, and claiming otherwise would hide
   * inbound messages nobody has looked at.
   *
   * Sequential rather than parallel so the first failure is the one reported and
   * the rest are left unread instead of half-applied under a generic error.
   */
  const handleMarkRead = async (caseId: string, unreadIds: string[]) => {
    if (busyCase) return;
    setBusyCase(caseId);
    setActionError(null);
    for (const id of unreadIds) {
      const result = await markMessageRead(id);
      if (!result.ok) {
        setActionError(result.error);
        break;
      }
    }
    setBusyCase(null);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Message Center</h1>
        <p className="text-secondary">View and manage all admin-relayed communications organized by case.</p>
      </div>

      {actionError && <p role="alert" className="community-error" style={{ marginBottom: 16 }}>{actionError}</p>}

      {Object.keys(caseGroups).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <MessageSquare size={40} style={{ color: 'var(--gray-300)', marginBottom: 12 }} />
          <p className="text-secondary">No messages yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(caseGroups).map(([caseId, msgs]) => {
            const sorted = msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const latest = sorted[0];
            const unreadFromMembers = msgs.filter(m => !m.read && m.senderRole === 'member').length;
            const unreadFromVols = msgs.filter(m => !m.read && m.senderRole === 'volunteer').length;
            // The same set the badges count: inbound only, since an admin
            // reading their own outbound message means nothing.
            const unreadInboundIds = msgs.filter(m => !m.read && m.senderRole !== 'admin').map(m => m.id);

            return (
              <div key={caseId} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <MessageSquare size={16} className="text-primary-600" />
                      <Link href={`/portal/admin/requests/${caseId}`} style={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>{latest.caseTitle}</Link>
                      {unreadFromMembers > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--accent-100)', color: 'var(--primary-800)', padding: '1px 8px', borderRadius: 99 }}>{unreadFromMembers} from member</span>}
                      {unreadFromVols > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--success-50)', color: 'var(--success-600)', padding: '1px 8px', borderRadius: 99 }}>{unreadFromVols} from volunteer</span>}
                    </div>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {helpRequests.find(r => r.id === caseId)?.reference ?? '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(latest.createdAt).toLocaleDateString()}</span>
                    {unreadInboundIds.length > 0 && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.68rem' }}
                        onClick={() => handleMarkRead(caseId, unreadInboundIds)}
                        disabled={busyCase !== null}
                      >
                        {busyCase === caseId ? 'Marking…' : `Mark ${unreadInboundIds.length} read`}
                      </button>
                    )}
                    <Link href={`/portal/admin/requests/${caseId}`} aria-label={`Open case ${latest.caseTitle}`} style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong>{latest.senderName} ({latest.senderRole}):</strong>{' '}
                  {latest.body.length > 100 ? `${latest.body.slice(0, 100)}…` : latest.body}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {msgs.length} total messages • {new Set(msgs.map(m => m.senderUserId)).size} participants
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
