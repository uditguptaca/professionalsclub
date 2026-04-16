'use client';
import React from 'react';
import Link from 'next/link';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { FileText, ArrowRight, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const statusColor = (status: string) => {
  if (['resolved', 'closed'].includes(status)) return 'badge-success';
  if (['submitted', 'under_review', 'need_more_info', 'waiting_for_member'].includes(status)) return 'badge-warning';
  if (['rejected'].includes(status)) return 'badge-error';
  return 'badge-primary';
};

const statusIcon = (status: string) => {
  if (['resolved', 'closed'].includes(status)) return <CheckCircle size={14} />;
  if (['rejected'].includes(status)) return <XCircle size={14} />;
  if (['escalated'].includes(status)) return <AlertTriangle size={14} />;
  return <Clock size={14} />;
};

export default function MyRequestsPage() {
  const { helpRequests } = usePortal();
  const { currentUserId } = useApp();
  const myRequests = helpRequests.filter(r => r.memberId === currentUserId);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">My Requests</h1>
          <p className="text-secondary">Track the status of all your help requests.</p>
        </div>
        <Link href="/portal/member/request-help" className="btn btn-primary">
          New Request
        </Link>
      </div>

      {myRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <FileText size={48} style={{ color: '#d1d5db', marginBottom: 16 }} />
          <h3 className="text-xl font-bold mb-2">No requests yet</h3>
          <p className="text-secondary mb-6">Submit your first help request to get started.</p>
          <Link href="/portal/member/request-help" className="btn btn-primary">Request Help</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myRequests.map(req => (
            <Link key={req.id} href={`/portal/member/my-requests/${req.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>{req.id}</span>
                    <span className={`badge ${statusColor(req.status)}`} style={{ textTransform: 'capitalize', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {statusIcon(req.status)} {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{req.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                    <span>{req.category}</span>
                    <span>•</span>
                    <span>Submitted {new Date(req.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>{req.urgency} priority</span>
                  </div>
                </div>
                <ArrowRight size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
