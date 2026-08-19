'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { sendMessage } from '@/app/actions/portal';
import { ArrowLeft, Clock, CheckCircle, FileText, Send, MessageSquare, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { helpRequests, messages, markMessageRead, refresh } = usePortal();
  const { currentUserId } = useApp();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState('');

  const request = helpRequests.find(r => r.id === requestId);
  const caseMessages = messages.filter(m => m.caseId === requestId && (m.visibilityScope === 'member_only' || m.senderUserId === currentUserId));

  // Opening the thread is what "reading" means here, so the unread badges on the
  // dashboard and message list clear as soon as the member gets here.
  useEffect(() => {
    for (const m of caseMessages) {
      if (!m.read && m.recipientUserId === currentUserId) void markMessageRead(m.id);
    }
    // Only re-run when the set of unread ids changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseMessages.filter((m) => !m.read).map((m) => m.id).join(',')]);

  if (!request) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 className="text-xl font-bold mb-2">Request not found</h2>
        <Link href="/portal/member/my-requests" className="btn btn-outline">Back to My Requests</Link>
      </div>
    );
  }

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;

    setSending(true);
    setReplyError('');

    // The action is called directly rather than through usePortal because the
    // context helper returns void, so a rejected send cleared the box exactly
    // like an accepted one. sender_user_id is stamped from the session, so it is
    // not in the payload.
    //
    // visibilityScope is 'all' rather than 'admin_only': the select policy hides
    // admin_only from non-admins, so marking your own reply that way would make
    // it vanish from your own thread. The routing guard forces this value for
    // non-admins anyway.
    const result = await sendMessage({
      caseId: requestId,
      caseTitle: request.title,
      senderRole: 'member',
      senderName: request.memberName,
      recipientRole: 'admin',
      moderatedFlag: false,
      visibilityScope: 'all',
      body: replyText,
      attachments: [],
    });

    setSending(false);

    if (!result.ok) {
      // The draft stays in the box: a failed send must not eat the reply.
      setReplyError(result.error);
      return;
    }

    setReplyText('');
    // The thread renders from the portal snapshot, so it has to be re-read for
    // the sent message to appear.
    await refresh();
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Link href="/portal/member/my-requests" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-accent)', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>
        <ArrowLeft size={16} /> Back to My Requests
      </Link>

      {/* Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>{request.reference}</span>
            <h1 className="text-2xl font-bold font-display" style={{ marginTop: 8 }}>{request.title}</h1>
          </div>
          <span className={`badge ${['resolved', 'closed'].includes(request.status) ? 'badge-success' : request.status === 'rejected' ? 'badge-error' : 'badge-primary'}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
            {request.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{request.category}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Urgency</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{request.urgency}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{new Date(request.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>{request.description}</div>
        {request.documents.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            {request.documents.map((doc, i) => (
              /* The value is a storage URL; the readable part is its filename. */
              <a
                key={i}
                href={doc}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: 'var(--bg-secondary)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-accent)', textDecoration: 'none' }}
              >
                <FileText size={14} /> Attachment {i + 1}
              </a>
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
                <div style={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 2, background: 'var(--border-color)' }} />
              )}
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: ['resolved', 'closed', 'completed'].includes(event.status) ? 'var(--success-600)' : 'var(--primary-500)',
              }}>
                {['resolved', 'closed', 'completed'].includes(event.status) ? <CheckCircle size={12} style={{ color: 'white' }} /> : <Clock size={12} style={{ color: 'white' }} />}
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(event.date).toLocaleString()}</div>
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
                background: msg.senderRole === 'admin' ? 'rgba(232, 93, 4, 0.06)' : 'var(--bg-secondary)',
                borderLeft: msg.senderRole === 'admin' ? '3px solid var(--primary-500)' : '3px solid var(--gray-300)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: msg.senderRole === 'admin' ? 'var(--primary-600)' : 'var(--gray-600)' }}>{msg.senderName}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Reply Box */}
        {!['resolved', 'closed', 'rejected', 'archived'].includes(request.status) && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Reply to admin..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleReply(); }}
                disabled={sending}
              />
              <button aria-label="Send reply" className="btn btn-primary" onClick={handleReply} disabled={sending || !replyText.trim()}>
                <Send size={16} />
              </button>
            </div>
            {replyError && (
              <p role="alert" className="community-error" style={{ marginTop: 12 }}>{replyError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
