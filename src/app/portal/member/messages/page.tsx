'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { MessageSquare, Mail } from 'lucide-react';
import Link from 'next/link';

export default function MemberMessagesPage() {
  const { messages } = usePortal();
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

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Messages from Admin</h1>
        <p className="text-secondary">All communications from the admin team, organized by case.</p>
      </div>

      {Object.keys(caseGroups).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Mail size={48} style={{ color: '#d1d5db', marginBottom: 16 }} />
          <h3 className="text-xl font-bold mb-2">No messages yet</h3>
          <p className="text-secondary">Admin will send you updates when your requests are being processed.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(caseGroups).map(([caseId, msgs]) => {
            const latestMsg = msgs[0];
            const unread = msgs.filter(m => !m.read && m.senderRole === 'admin').length;
            return (
              <Link key={caseId} href={`/portal/member/my-requests/${caseId}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '18px 22px', cursor: 'pointer', borderLeft: unread > 0 ? '3px solid var(--primary-500)' : '3px solid transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <MessageSquare size={16} className="text-primary-600" />
                        <span style={{ fontWeight: 700 }}>{latestMsg.caseTitle}</span>
                        {unread > 0 && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#ef4444', color: 'white', padding: '1px 8px', borderRadius: 99 }}>
                            {unread} new
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{caseId}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(latestMsg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#6b7280', lineHeight: 1.5 }}>
                    <strong>{latestMsg.senderName}:</strong> {latestMsg.body.substring(0, 120)}{latestMsg.body.length > 120 ? '...' : ''}
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {msgs.length} message{msgs.length !== 1 ? 's' : ''} in this thread
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
