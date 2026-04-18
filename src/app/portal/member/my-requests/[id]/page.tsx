'use client';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { ArrowLeft, Clock, CheckCircle, FileText, Send, MessageSquare, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { helpRequests, messages, sendMessage } = usePortal();
  const { currentUserId } = useApp();
  const [replyText, setReplyText] = useState('');

  const request = helpRequests.find(r => r.id === requestId);
  const caseMessages = messages.filter(m => m.caseId === requestId && (m.visibilityScope === 'member_only' || m.senderUserId === currentUserId));

  if (!request) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 className="text-xl font-bold mb-2">Request not found</h2>
        <Link href="/portal/member/my-requests" className="btn btn-outline">Back to My Requests</Link>
      </div>
    );
  }

  const handleReply = () => {
    if (!replyText.trim()) return;
    sendMessage({
      caseId: requestId,
      caseTitle: request.title,
      senderRole: 'member',
      senderUserId: currentUserId,
      senderName: request.memberName,
      recipientRole: 'admin',
      moderatedFlag: false,
      visibilityScope: 'admin_only',
      body: replyText,
      attachments: [],
    });
    setReplyText('');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Link href="/portal/member/my-requests" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>
        <ArrowLeft size={16} /> Back to My Requests
      </Link>

      {/* Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>{request.id}</span>
            <h1 className="text-2xl font-bold font-display" style={{ marginTop: 8 }}>{request.title}</h1>
          </div>
          <span className={`badge ${['resolved', 'closed'].includes(request.status) ? 'badge-success' : request.status === 'rejected' ? 'badge-error' : 'badge-primary'}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
            {request.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 12, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{request.category}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Urgency</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{request.urgency}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{new Date(request.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#374151' }}>{request.description}</div>
        {request.documents.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            {request.documents.map((doc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: '#f3f4f6', fontSize: '0.78rem', fontWeight: 500 }}>
                <FileText size={14} /> {doc}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="font-bold font-display mb-4">Timeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {request.timeline.map((event, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: i < request.timeline.length - 1 ? 20 : 0, position: 'relative' }}>
              {i < request.timeline.length - 1 && (
                <div style={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 2, background: '#e5e7eb' }} />
              )}
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: ['resolved', 'closed', 'completed'].includes(event.status) ? '#059669' : 'var(--primary-500)',
              }}>
                {['resolved', 'closed', 'completed'].includes(event.status) ? <CheckCircle size={12} style={{ color: 'white' }} /> : <Clock size={12} style={{ color: 'white' }} />}
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(event.date).toLocaleString()}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{event.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="card">
        <h3 className="font-bold font-display mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={18} /> Messages from Admin
        </h3>
        {caseMessages.length === 0 ? (
          <p className="text-secondary text-sm">No messages yet. Admin will reach out when there are updates.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {caseMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(msg => (
              <div key={msg.id} style={{
                padding: '14px 18px', borderRadius: 12,
                background: msg.senderRole === 'admin' ? 'rgba(99,102,241,0.06)' : '#f9fafb',
                borderLeft: msg.senderRole === 'admin' ? '3px solid var(--primary-500)' : '3px solid #d1d5db',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: msg.senderRole === 'admin' ? 'var(--primary-600)' : '#374151' }}>{msg.senderName}</span>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Reply Box */}
        {!['resolved', 'closed', 'rejected', 'archived'].includes(request.status) && (
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Reply to admin..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReply()}
            />
            <button className="btn btn-primary" onClick={handleReply} disabled={!replyText.trim()}>
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
