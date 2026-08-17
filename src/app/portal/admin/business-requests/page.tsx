'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { updateBusinessRequestStatus } from '@/app/actions/portal';
import type { ActionResult } from '@/app/actions/portal';
import type { BusinessContactRequest, BusinessContactRequestStatus } from '@/types';
import { Inbox, Clock, CheckCircle, User, Building2, ArrowRight } from 'lucide-react';

/** The four values business_contact_requests.status accepts. */
const STATUSES: BusinessContactRequestStatus[] = ['pending', 'in_progress', 'completed', 'closed'];

export default function AdminBusinessRequests() {
  const { businessContactRequests } = usePortal();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // No per-request setter on the portal snapshot, so the returned row is held
  // here and merged over the context list.
  const [updated, setUpdated] = useState<Record<string, BusinessContactRequest>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const statusStyles: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'var(--accent-100)', color: 'var(--primary-800)' },
    in_progress: { bg: 'var(--primary-50)', color: 'var(--primary-700)' },
    completed: { bg: 'var(--success-50)', color: 'var(--success-600)' },
    closed: { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
  };

  const helpTypeLabels: Record<string, string> = {
    introduction: 'Introduction',
    quote_support: 'Quote Support',
    booking_help: 'Booking Help',
    clarification: 'Clarification',
    other: 'Other',
  };

  const requests = businessContactRequests.map(r => updated[r.id] ?? r);

  /**
   * The row locks until the write returns. On success the draft note is dropped
   * so the field falls back to the value the database actually stored.
   */
  const runRowAction = async (id: string, write: () => Promise<ActionResult<BusinessContactRequest>>) => {
    setActionError(null);
    setBusyId(id);
    const result = await write();
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setUpdated(prev => ({ ...prev, [id]: result.data }));
    setNoteDrafts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // The status change carries no adminNotes, so the repository's coalesce keeps
  // whatever note is already stored.
  const setStatus = (req: BusinessContactRequest, status: BusinessContactRequestStatus) =>
    runRowAction(req.id, () => updateBusinessRequestStatus({ requestId: req.id, status }));

  const saveNote = (req: BusinessContactRequest, adminNotes: string) =>
    runRowAction(req.id, () => updateBusinessRequestStatus({ requestId: req.id, status: req.status, adminNotes }));

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Business Contact Requests</h1>
        <p className="text-secondary">Members requesting admin-assisted connections with businesses.</p>
      </div>

      {/* Stats */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Pending', value: requests.filter(r => r.status === 'pending').length, icon: <Clock size={22} />, color: 'var(--accent-600)', bg: 'rgba(245,158,11,0.1)' },
          { label: 'In Progress', value: requests.filter(r => r.status === 'in_progress').length, icon: <ArrowRight size={22} />, color: 'var(--primary-700)', bg: 'rgba(232, 93, 4, 0.1)' },
          { label: 'Completed', value: requests.filter(r => r.status === 'completed').length, icon: <CheckCircle size={22} />, color: 'var(--success-600)', bg: 'rgba(5,150,105,0.1)' },
        ].map((s, i) => (
          <div key={i} className="card-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, background: s.bg, borderRadius: 10, color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {actionError && <p role="alert" className="community-error">{actionError}</p>}

      {/* Requests */}
      {requests.length === 0 ? (
        <div className="biz-empty">
          <Inbox size={40} style={{ margin: '0 auto 12px', color: 'var(--gray-300)' }} />
          <h3>No contact requests yet</h3>
          <p>When members request admin-assisted business connections, they will appear here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Member</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Business</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Help Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Notes</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const stored = req.adminNotes ?? '';
                const draft = noteDrafts[req.id] ?? stored;
                const busy = busyId === req.id;
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={14} style={{ color: 'var(--gray-400)' }} />
                        <span style={{ fontWeight: 600 }}>{req.memberName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={14} style={{ color: 'var(--primary-600)' }} />
                        <span style={{ fontWeight: 600 }}>{req.businessName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {helpTypeLabels[req.helpType] || req.helpType}
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: 280 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {req.notes}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
                        <input
                          className="input"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          placeholder="Internal note"
                          aria-label={`Internal note for the request from ${req.memberName}`}
                          value={draft}
                          disabled={busy}
                          onChange={e => setNoteDrafts(prev => ({ ...prev, [req.id]: e.target.value }))}
                        />
                        {draft !== stored && (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                            disabled={busy}
                            onClick={() => saveNote(req, draft)}
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <select
                        className="input"
                        style={{ padding: '4px 8px', fontSize: '0.72rem', minWidth: 124, fontWeight: 700, background: statusStyles[req.status]?.bg, color: statusStyles[req.status]?.color, textTransform: 'capitalize' }}
                        aria-label={`Status of the request from ${req.memberName}`}
                        value={req.status}
                        disabled={busy}
                        onChange={e => setStatus(req, e.target.value as BusinessContactRequestStatus)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
