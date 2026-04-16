'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { FolderKanban, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminAssignmentsPage() {
  const { assignments, helpRequests } = usePortal();

  const pendingAssignment = helpRequests.filter(r => r.status === 'approved' && !r.assignedVolunteerId);
  const active = assignments.filter(a => ['pending', 'in_progress', 'accepted'].includes(a.status));
  const completed = assignments.filter(a => a.status === 'completed');

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Assignments</h1>
        <p className="text-secondary">Manage case-to-volunteer assignments and track progress.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-stat" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Awaiting Assignment</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>{pendingAssignment.length}</div>
        </div>
        <div className="card-stat" style={{ borderLeft: '3px solid var(--primary-500)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Active Assignments</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-600)' }}>{active.length}</div>
        </div>
        <div className="card-stat" style={{ borderLeft: '3px solid #059669' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Completed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>{completed.length}</div>
        </div>
      </div>

      {/* Cases Awaiting Assignment */}
      {pendingAssignment.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="text-xl font-bold font-display mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} style={{ color: '#d97706' }} /> Awaiting Volunteer Assignment
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingAssignment.map(req => (
              <Link key={req.id} href={`/portal/admin/requests/${req.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '16px 20px', cursor: 'pointer', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{req.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{req.memberName} • {req.category} • {req.urgency}</div>
                    </div>
                    <ArrowRight size={16} style={{ color: '#9ca3af' }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Assignments */}
      <h2 className="text-xl font-bold font-display mb-3">All Assignments</h2>
      {assignments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, borderStyle: 'dashed' }}>
          <FolderKanban size={40} style={{ color: '#d1d5db', marginBottom: 12 }} />
          <p className="text-secondary">No assignments created yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assignments.map(asg => (
            <div key={asg.id} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{asg.id}</span>
                    <span className={`badge ${asg.status === 'completed' ? 'badge-success' : asg.status === 'cancelled' ? 'badge-error' : 'badge-primary'}`} style={{ textTransform: 'capitalize', fontSize: '0.68rem' }}>
                      {asg.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 700 }}>{asg.requestTitle}</h3>
                </div>
                <Link href={`/portal/admin/requests/${asg.requestId}`} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem' }}>View Case</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ padding: 10, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>Volunteer</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{asg.volunteerName}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>Due Date</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{new Date(asg.dueDate).toLocaleDateString()}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>Last Updated</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{new Date(asg.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
              {asg.volunteerResponse && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.85rem' }}>
                  <strong>Volunteer Response:</strong> {asg.volunteerResponse}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
