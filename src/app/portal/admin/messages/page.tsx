'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { MessageSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminMessagesPage() {
  const { messages } = usePortal();

  // Group by case
  const caseGroups = messages.reduce<Record<string, typeof messages>>((acc, msg) => {
    if (!acc[msg.caseId]) acc[msg.caseId] = [];
    acc[msg.caseId].push(msg);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Message Center</h1>
        <p className="text-secondary">View and manage all admin-relayed communications organized by case.</p>
      </div>

      {Object.keys(caseGroups).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <MessageSquare size={40} style={{ color: '#d1d5db', marginBottom: 12 }} />
          <p className="text-secondary">No messages yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(caseGroups).map(([caseId, msgs]) => {
            const sorted = msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const latest = sorted[0];
            const unreadFromMembers = msgs.filter(m => !m.read && m.senderRole === 'member').length;
            const unreadFromVols = msgs.filter(m => !m.read && m.senderRole === 'volunteer').length;

            return (
              <Link key={caseId} href={`/portal/admin/requests/${caseId}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '20px 24px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <MessageSquare size={16} className="text-primary-600" />
                        <span style={{ fontWeight: 700 }}>{latest.caseTitle}</span>
                        {unreadFromMembers > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 99 }}>{unreadFromMembers} from member</span>}
                        {unreadFromVols > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#d1fae5', color: '#065f46', padding: '1px 8px', borderRadius: 99 }}>{unreadFromVols} from volunteer</span>}
                      </div>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{caseId}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(latest.createdAt).toLocaleDateString()}</span>
                      <ArrowRight size={14} style={{ color: '#9ca3af' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.5 }}>
                    <strong>{latest.senderName} ({latest.senderRole}):</strong> {latest.body.substring(0, 100)}...
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {msgs.length} total messages • {new Set(msgs.map(m => m.senderRole)).size} participants
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
