'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import PortalLoading from '@/components/portal/PortalLoading';
import { FIRST_REPLY_PROMISE, categoryLabel } from '@/lib/help-desk';
import {
  ArrowLeft, Clock, CheckCircle, Send, Tag, AlertCircle, CalendarClock,
  Paperclip, ChevronRight, FileText,
} from 'lucide-react';
import Link from 'next/link';
import * as portalActions from '@/app/actions/portal';
import { guardActions } from '@/lib/actions-client';
const { sendMessage } = guardActions(portalActions);

/**
 * One case, read top to bottom: what you asked, where it stands, then the
 * conversation. Same data and the same send guard as before — the timeline and
 * the thread are just presented in the portal's card language now.
 */

/** Chip and icon colours per status. Kept in step with the list page. */
const statusTone = (status: string): { bg: string; fg: string } => {
  if (['resolved', 'closed'].includes(status)) return { bg: 'rgba(22,163,74,0.10)', fg: 'var(--success-600)' };
  if (['rejected'].includes(status)) return { bg: 'var(--error-50)', fg: 'var(--error-600)' };
  if (['escalated'].includes(status)) return { bg: 'rgba(245,158,11,0.12)', fg: 'var(--accent-700)' };
  return { bg: 'rgba(232,93,4,0.09)', fg: 'var(--primary-800)' };
};

const sentence = (text: string) => {
  const words = text.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const DONE = ['resolved', 'closed', 'completed'];

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { helpRequests, messages, markMessageRead, refresh, settled } = usePortal();
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
    // The page renders from the portal snapshot, which arrives after mount.
    if (!settled) return <PortalLoading label="Loading your request" />;
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
        <FileText size={28} style={{ opacity: 0.35 }} aria-hidden="true" />
        <p style={{ margin: '0.9rem 0 1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          We could not find that request.
        </p>
        <Link href="/portal/member/my-requests" className="btn btn-primary">Back to my requests</Link>
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

  const tone = statusTone(request.status);
  const closed = ['resolved', 'closed', 'rejected', 'archived'].includes(request.status);
  // The two statuses that literally ask the member for something.
  const yourTurn = ['need_more_info', 'waiting_for_member'].includes(request.status);
  const canSend = !sending && replyText.trim().length > 0;

  /** One read-only meta row. */
  const metaRow = (icon: React.ReactNode, label: string, value: string) => (
    <div className="pp-row pp-row-static" key={label}>
      <span className="pp-row-icon">{icon}</span>
      <span className="pp-row-body">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );

  return (
    <div className="pp2 animate-fade-in">
      <Link
        href="/portal/member/my-requests"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44,
          fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-accent)', textDecoration: 'none',
        }}
      >
        <ArrowLeft size={16} aria-hidden="true" /> My requests
      </Link>

      <div className="pp-groups" style={{ marginTop: 6 }}>

        {/* ---- What you asked ---- */}
        <section className="pp-group">
          <div className="pp-group-card">
            <div style={{ padding: '1.05rem 1.1rem', borderBottom: '1px solid rgba(27,67,50,0.06)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="pp-chip" style={{ background: tone.bg, color: tone.fg }}>
                  {sentence(request.status)}
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.02em',
                  color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)',
                }}>
                  {request.reference}
                </span>
              </div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800,
                letterSpacing: '-0.01em', lineHeight: 1.25, margin: '0 0 10px',
              }}>
                {request.title}
              </h1>
              <p style={{
                margin: 0, fontSize: '0.9rem', lineHeight: 1.7,
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
              }}>
                {request.description}
              </p>
            </div>

            {metaRow(<Tag size={17} />, 'Category', categoryLabel(request.category))}
            {metaRow(<AlertCircle size={17} />, 'Urgency', `${sentence(request.urgency)} priority`)}
            {metaRow(
              <CalendarClock size={17} />,
              'Submitted',
              new Date(request.createdAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }),
            )}
            {request.documents.map((doc, i) => (
              /* The value is a storage URL; the readable part is its filename. */
              <a key={i} href={doc} target="_blank" rel="noopener noreferrer" className="pp-row">
                <span className="pp-row-icon"><Paperclip size={17} /></span>
                <span className="pp-row-body">
                  <small>Attachment</small>
                  <strong>File {i + 1}</strong>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </a>
            ))}
          </div>
        </section>

        {/* ---- Timeline ---- */}
        <section className="pp-group">
          <h2>Progress</h2>
          <p className="pp-group-sub">Every step an admin has recorded on this case.</p>
          <div className="pp-group-card" style={{ padding: '1.1rem' }}>
            {request.timeline.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Nothing recorded yet. The first update will appear here.
              </p>
            ) : (
              request.timeline.map((event, i) => {
                const done = DONE.includes(event.status);
                const last = i === request.timeline.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: last ? 0 : 18, position: 'relative' }}>
                    {!last && (
                      <span aria-hidden="true" style={{
                        position: 'absolute', left: '0.72rem', top: '1.65rem', bottom: 0,
                        width: 2, borderRadius: 2, background: 'rgba(27,67,50,0.10)',
                      }} />
                    )}
                    <span style={{
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                      width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                      background: done ? 'var(--success-600)' : 'var(--primary-700)', color: '#fff',
                    }}>
                      {done ? <CheckCircle size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}
                    </span>
                    <div style={{ minWidth: 0, paddingTop: 1 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                        {new Date(event.date).toLocaleString('en-CA', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 650, lineHeight: 1.45, marginTop: 2 }}>
                        {event.description}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ---- Thread ---- */}
        <section className="pp-group">
          <h2>Club messages</h2>
          <p className="pp-group-sub">
            You and the club, inside the app. An admin answers here, and you can answer back below.
          </p>
          <div className="pp-group-card" style={{ padding: '1.1rem' }}>
            {caseMessages.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                No messages yet. {FIRST_REPLY_PROMISE}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {caseMessages
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map(msg => {
                    const mine = msg.senderRole !== 'admin';
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '88%', padding: '0.7rem 0.9rem',
                          borderRadius: mine ? '1rem 1rem 0.35rem 1rem' : '1rem 1rem 1rem 0.35rem',
                          background: mine ? 'var(--green-950)' : 'var(--bg-secondary)',
                          color: mine ? '#fff' : 'var(--text-primary)',
                          border: mine ? 'none' : '1px solid rgba(27,67,50,0.08)',
                        }}>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', gap: 12,
                            marginBottom: 4, fontSize: '0.72rem', fontWeight: 750,
                            color: mine ? 'rgba(255,255,255,0.8)' : 'var(--text-accent)',
                          }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {mine ? 'You' : msg.senderName}
                            </span>
                            <span style={{
                              flexShrink: 0, fontWeight: 600,
                              color: mine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                            }}>
                              {new Date(msg.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {msg.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* The member's side of the thread. A textarea, not a one-line
                input with Enter-to-send: "we need more from you" is answered
                in sentences, on a phone, and a stray Enter must not post half
                of one. Writes a messages row as sender_role 'member'; the
                routing guard pins the recipient to the club. */}
            {closed ? (
              <p style={{
                margin: '14px 0 0', paddingTop: 14, borderTop: '1px solid rgba(27,67,50,0.08)',
                fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--text-muted)',
              }}>
                This case is closed, so replies are off. If you need more,{' '}
                <Link href="/portal/member/request-help" style={{ color: 'var(--text-accent)', fontWeight: 700 }}>
                  start a new request
                </Link>.
              </p>
            ) : (
              <form
                onSubmit={e => { e.preventDefault(); void handleReply(); }}
                style={{
                  marginTop: caseMessages.length === 0 ? 14 : 16,
                  paddingTop: 14, borderTop: '1px solid rgba(27,67,50,0.08)',
                }}
              >
                <div className="pp-field">
                  <label htmlFor="rd-reply" style={{ fontWeight: 750 }}>
                    {yourTurn ? 'The club asked you for more. Reply here' : 'Reply to the club'}
                  </label>
                  <textarea
                    id="rd-reply"
                    rows={3}
                    placeholder={yourTurn ? 'Answer what the club asked, in as much detail as you can.' : 'Add anything the club should know about this request.'}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleReply(); }}
                    disabled={sending}
                    maxLength={5000}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!canSend}
                    style={{ minHeight: 44, gap: 7 }}
                  >
                    <Send size={15} aria-hidden="true" /> {sending ? 'Sending…' : 'Send to the club'}
                  </button>
                  <span style={{ fontSize: '0.76rem', lineHeight: 1.45, color: 'var(--text-muted)' }}>
                    An admin reads it. {FIRST_REPLY_PROMISE}
                  </span>
                </div>
                {replyError && (
                  <p role="alert" className="community-error" style={{ marginTop: 10 }}>{replyError}</p>
                )}
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
