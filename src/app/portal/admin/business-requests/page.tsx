'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { Inbox, Clock, CheckCircle, User, Building2, ArrowRight } from 'lucide-react';

export default function AdminBusinessRequests() {
  const { businessContactRequests } = usePortal();

  const statusStyles: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    in_progress: { bg: '#dbeafe', color: '#1e40af' },
    completed: { bg: '#d1fae5', color: '#065f46' },
    closed: { bg: '#f3f4f6', color: '#6b7280' },
  };

  const helpTypeLabels: Record<string, string> = {
    introduction: '🤝 Introduction',
    quote_support: '💰 Quote Support',
    booking_help: '📅 Booking Help',
    clarification: '❓ Clarification',
    other: '📋 Other',
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Business Contact Requests</h1>
        <p className="text-secondary">Members requesting admin-assisted connections with businesses.</p>
      </div>

      {/* Stats */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Pending', value: businessContactRequests.filter(r => r.status === 'pending').length, icon: <Clock size={22} />, color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
          { label: 'In Progress', value: businessContactRequests.filter(r => r.status === 'in_progress').length, icon: <ArrowRight size={22} />, color: '#1e40af', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Completed', value: businessContactRequests.filter(r => r.status === 'completed').length, icon: <CheckCircle size={22} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
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

      {/* Requests */}
      {businessContactRequests.length === 0 ? (
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
              {businessContactRequests.map(req => (
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
                  <td style={{ padding: '14px 16px', maxWidth: 240 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.notes}
                    </div>
                    {req.adminNotes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--primary-600)', marginTop: 4, fontWeight: 500 }}>
                        Admin: {req.adminNotes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: statusStyles[req.status]?.bg || '#f3f4f6', color: statusStyles[req.status]?.color || '#6b7280', textTransform: 'capitalize' }}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
