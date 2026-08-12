'use client';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { ArrowLeft, Clock, CheckCircle, Send, MessageSquare, StickyNote, UserCheck, FileText } from 'lucide-react';
import Link from 'next/link';
import type { RequestStatus } from '@/types';

const STATUS_OPTIONS: RequestStatus[] = ['submitted', 'under_review', 'need_more_info', 'waiting_for_member', 'approved', 'assigned', 'volunteer_responded', 'admin_reviewing', 'response_sent', 'in_progress', 'resolved', 'closed', 'rejected', 'escalated', 'archived'];

export default function AdminRequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { helpRequests, messages, updateRequestStatus, addInternalNote, sendMessage, volunteerApps, createAssignment } = usePortal();
  const [noteText, setNoteText] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const { profile } = useApp();
  const adminName = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : 'Admin';
  const [msgToMember, setMsgToMember] = useState('');
  const [msgToVol, setMsgToVol] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const request = helpRequests.find(r => r.id === requestId);
  const caseMessages = messages.filter(m => m.caseId === requestId);
  const approvedVolunteers = volunteerApps.filter(a => a.status === 'approved');

  if (!request) {
    return <div style={{ textAlign: 'center', padding: 80 }}><h2>Request not found</h2><Link href="/portal/admin/requests" className="btn btn-outline">Back</Link></div>;
  }

  const handleStatusUpdate = () => {
    if (newStatus) updateRequestStatus(requestId, newStatus as RequestStatus);
    setNewStatus('');
  };

  // Was a dead button: it rendered, looked clickable, and did nothing.
  const handleAssign = async (volunteerMemberId: string, volunteerName: string) => {
    if (assigning) return;
    setAssigning(volunteerMemberId);
    await createAssignment({
      requestId,
      requestTitle: request.title,
      volunteerMemberId,
      volunteerName,
      assignedByAdminId: '',
      scope: request.category,
      instructions: `Please assist with: ${request.title}`,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setAssigning(null);
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addInternalNote(requestId, { authorId: '', authorName: '', body: noteText });
    setNoteText('');
  };

  // recipientUserId is what the RLS select policy matches on
  // (`sender_user_id = me or recipient_user_id = me`). Sending without it meant
  // admin messages were addressed to nobody and the member never saw them.
  const handleSendToMember = () => {
    if (!msgToMember.trim()) return;
    sendMessage({
      caseId: requestId, caseTitle: request.title,
      senderRole: 'admin', senderUserId: '', senderName: adminName,
      recipientUserId: request.memberId, recipientRole: 'member',
      moderatedFlag: false, visibilityScope: 'member_only',
      body: msgToMember, attachments: [],
    });
    setMsgToMember('');
  };

  const handleSendToVolunteer = () => {
    if (!msgToVol.trim() || !request.assignedVolunteerId) return;
    sendMessage({
      caseId: requestId, caseTitle: request.title,
      senderRole: 'admin', senderUserId: '', senderName: adminName,
      recipientUserId: request.assignedVolunteerId, recipientRole: 'volunteer',
      moderatedFlag: false, visibilityScope: 'volunteer_only',
      body: msgToVol, attachments: [],
    });
    setMsgToVol('');
  };

  return (
    <div className="animate-fade-in">
      <Link href="/portal/admin/requests" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>
        <ArrowLeft size={16} /> Back to Requests
      </Link>

      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>{request.reference}</span>
                <h1 className="text-xl font-bold font-display" style={{ marginTop: 8 }}>{request.title}</h1>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  by <strong>{request.memberName}</strong> • {request.category} • {request.urgency} priority
                </div>
              </div>
              <span className="badge badge-primary" style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}>{request.status.replace(/_/g, ' ')}</span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{request.description}</p>
            {request.documents.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                {request.documents.map((d, i) => <span key={i} style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} />{d}</span>)}
              </div>
            )}
          </div>

          {/* Status Control */}
          <div className="card">
            <h3 className="font-bold mb-3">Update Status</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="input" style={{ flex: 1 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="">Select new status...</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={!newStatus}>Update</button>
            </div>
          </div>

          {/* Message to Member */}
          <div className="card">
            <h3 className="font-bold mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquare size={16} /> Message to Member</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea className="input" style={{ flex: 1 }} rows={2} placeholder="Type a message to send to the requester..." value={msgToMember} onChange={e => setMsgToMember(e.target.value)} />
              <button className="btn btn-primary" onClick={handleSendToMember} disabled={!msgToMember.trim()} style={{ alignSelf: 'flex-end' }}><Send size={16} /></button>
            </div>
          </div>

          {/* Message to Volunteer */}
          {request.assignedVolunteerId && (
            <div className="card">
              <h3 className="font-bold mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserCheck size={16} /> Message to Volunteer ({request.assignedVolunteerName})</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  className="input" style={{ flex: 1 }} rows={2}
                  placeholder={request.assignedVolunteerId ? "Type instructions for the assigned volunteer..." : "Assign a volunteer first."}
                  value={msgToVol} onChange={e => setMsgToVol(e.target.value)}
                  disabled={!request.assignedVolunteerId}
                />
                <button
                  className="btn btn-primary" onClick={handleSendToVolunteer}
                  disabled={!msgToVol.trim() || !request.assignedVolunteerId}
                  style={{ alignSelf: 'flex-end' }}
                ><Send size={16} /></button>
              </div>
            </div>
          )}

          {/* All Messages */}
          <div className="card">
            <h3 className="font-bold mb-3">Message History</h3>
            {caseMessages.length === 0 ? <p className="text-secondary text-sm">No messages yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {caseMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(msg => (
                  <div key={msg.id} style={{ padding: '12px 16px', borderRadius: 10, background: msg.senderRole === 'admin' ? 'rgba(232, 93, 4, 0.05)' : msg.senderRole === 'member' ? 'var(--warning-50)' : 'var(--success-50)', borderLeft: `3px solid ${msg.senderRole === 'admin' ? 'var(--primary-600)' : msg.senderRole === 'member' ? 'var(--warning-500)' : 'var(--success-400)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{msg.senderName} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({msg.senderRole} → {msg.recipientRole})</span></span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Timeline */}
          <div className="card">
            <h3 className="font-bold mb-3">Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {request.timeline.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < request.timeline.length - 1 ? 16 : 0, position: 'relative' }}>
                  {i < request.timeline.length - 1 && <div style={{ position: 'absolute', left: 9, top: 20, bottom: 0, width: 2, background: 'var(--border-color)' }} />}
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: ['resolved', 'closed'].includes(ev.status) ? 'var(--success-600)' : 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {['resolved', 'closed'].includes(ev.status) ? <CheckCircle size={10} style={{ color: 'white' }} /> : <Clock size={10} style={{ color: 'white' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(ev.date).toLocaleString()}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{ev.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
            <h3 className="font-bold mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><StickyNote size={16} style={{ color: 'var(--accent-600)' }} /> Internal Notes</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 12 }}>Private to admin. Not visible to members.</p>
            {request.internalNotes.map(note => (
              <div key={note.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--warning-50)', border: '1px solid var(--accent-200)', marginBottom: 8, fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.72rem', color: 'var(--primary-800)', marginBottom: 4 }}>{note.authorName} • {new Date(note.createdAt).toLocaleString()}</div>
                {note.body}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" style={{ flex: 1, fontSize: '0.82rem' }} placeholder="Add internal note..." value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
              <button className="btn btn-outline btn-sm" onClick={handleAddNote} disabled={!noteText.trim()}>Add</button>
            </div>
          </div>

          {/* Assignment Info */}
          <div className="card">
            <h3 className="font-bold mb-3">Assignment</h3>
            {request.assignedVolunteerId ? (
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--success-50)', border: '1px solid var(--success-50)' }}>
                <div style={{ fontWeight: 700 }}>{request.assignedVolunteerName}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--success-600)' }}>Assigned Volunteer</div>
              </div>
            ) : (
              <div>
                <p className="text-secondary text-sm mb-3">No volunteer assigned yet. Approved volunteers:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {approvedVolunteers.slice(0, 3).map(v => (
                    <div key={v.id} style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><strong>{v.memberName}</strong><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{v.currentProfession}</div></div>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.68rem' }}
                        onClick={() => handleAssign(v.memberId, v.memberName)}
                        disabled={assigning !== null}
                      >
                        {assigning === v.memberId ? 'Assigning…' : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
