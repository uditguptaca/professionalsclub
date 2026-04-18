'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { ClipboardList, CheckCircle, Clock, XCircle, FileText, Shield, HandHeart } from 'lucide-react';
import Link from 'next/link';

export default function MyVolunteerPage() {
  const { volunteerApps, assignments, messages } = usePortal();
  const { currentUserId } = useApp();

  const myApp = volunteerApps.find(a => a.memberId === currentUserId);
  const myAssignments = assignments.filter(a => a.volunteerMemberId === currentUserId);
  const myVolunteerMessages = messages.filter(m => m.recipientRole === 'volunteer' && m.visibilityScope === 'volunteer_only');

  if (!myApp) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <HandHeart size={48} style={{ color: '#d1d5db', marginBottom: 16 }} />
        <h2 className="text-xl font-bold mb-2">No Volunteer Application</h2>
        <p className="text-secondary mb-6">You haven&apos;t applied to volunteer yet.</p>
        <Link href="/portal/member/volunteer" className="btn btn-primary">Apply Now</Link>
      </div>
    );
  }

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    approved: { color: '#059669', bg: 'rgba(5,150,105,0.08)', icon: <CheckCircle size={20} />, label: 'Approved' },
    pending_verification: { color: '#d97706', bg: 'rgba(245,158,11,0.08)', icon: <Clock size={20} />, label: 'Pending Verification' },
    new_application: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', icon: <ClipboardList size={20} />, label: 'Application Submitted' },
    rejected: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', icon: <XCircle size={20} />, label: 'Rejected' },
    on_hold: { color: '#9ca3af', bg: '#f3f4f6', icon: <Clock size={20} />, label: 'On Hold' },
  };

  const sc = statusConfig[myApp.status] || statusConfig.new_application;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Volunteer Status</h1>
        <p className="text-secondary">Track your volunteer application and manage assigned cases.</p>
      </div>

      {/* Status Card */}
      <div className="card" style={{ marginBottom: 24, borderLeft: `4px solid ${sc.color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sc.color }}>
            {sc.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Application Status: <span style={{ color: sc.color }}>{sc.label}</span></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Applied on {new Date(myApp.createdAt).toLocaleDateString()} • Areas: {myApp.expertiseAreas.length} categories
            </div>
          </div>
        </div>
        {myApp.adminNotes && myApp.status === 'approved' && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.82rem' }}>
            <strong>Admin Note:</strong> {myApp.adminNotes}
          </div>
        )}
      </div>

      {/* Assigned Cases (only for approved volunteers) */}
      {myApp.status === 'approved' && (
        <>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="card-stat">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Assigned Cases</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{myAssignments.length}</div>
            </div>
            <div className="card-stat">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Active</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-600)' }}>{myAssignments.filter(a => a.status === 'in_progress' || a.status === 'pending').length}</div>
            </div>
            <div className="card-stat">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Completed</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>{myAssignments.filter(a => a.status === 'completed').length}</div>
            </div>
          </div>

          <h2 className="text-xl font-bold font-display mb-4">Volunteer Work Queue</h2>
          {myAssignments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, borderStyle: 'dashed' }}>
              <p className="text-secondary">No cases assigned yet. Admin will assign cases based on your expertise.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myAssignments.map(asg => (
                <div key={asg.id} className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{asg.id}</span>
                      <div style={{ fontWeight: 700, marginTop: 6 }}>{asg.requestTitle}</div>
                    </div>
                    <span className={`badge ${asg.status === 'completed' ? 'badge-success' : 'badge-primary'}`} style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                      {asg.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div style={{ padding: 14, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Admin Instructions</div>
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{asg.instructions}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Due: {new Date(asg.dueDate).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Scope: {asg.scope.substring(0, 60)}...</span>
                  </div>

                  {/* Privacy Notice */}
                  <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={12} /> Requester details are redacted. Respond only through admin relay.
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
